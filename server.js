const express = require('express');
const multer = require('multer');
const { Pool } = require('pg');
const tf = require('@tensorflow/tfjs-node');
const faceapi = require('face-api.js');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

const upload = multer({ dest: 'uploads/' });

// Database PostgreSQL
const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function setupDatabase() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                face_descriptor TEXT NOT NULL
            );
        `);
        await db.query(`
            CREATE TABLE IF NOT EXISTS attendance (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                timestamp TEXT NOT NULL
            );
        `);
        console.log("Database tables are ready.");
    } catch (err) {
        console.error("Error setting up database:", err);
    }
}
setupDatabase();

// Muat model AI
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromDisk('./models'),
    faceapi.nets.faceLandmark68TinyNet.loadFromDisk('./models'),
    faceapi.nets.faceRecognitionNet.loadFromDisk('./models')
]).then(() => console.log('Model AI berhasil dimuat'));

app.use(express.static('public'));
app.use(express.json());

async function getFaceDescriptor(imagePath) {
    const buffer = fs.readFileSync(imagePath);
    const image = tf.node.decodeImage(buffer, 3);
    const detection = await faceapi.detectSingleFace(image, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks(true).withFaceDescriptor();
    tf.dispose(image);
    fs.unlinkSync(imagePath);
    return detection ? detection.descriptor : null;
}

app.post('/register', upload.single('photo'), async (req, res) => {
    const { name } = req.body;
    const photoPath = req.file.path;
    if (!name || !photoPath) return res.status(400).json({ success: false, message: 'Nama dan foto diperlukan.' });

    try {
        const descriptor = await getFaceDescriptor(photoPath);
        if (!descriptor) return res.status(400).json({ success: false, message: 'Wajah tidak terdeteksi.' });

        const descriptorStr = JSON.stringify(Array.from(descriptor));
        await db.query('INSERT INTO users (name, face_descriptor) VALUES ($1, $2)', [name, descriptorStr]);
        res.json({ success: true, message: `Pengguna ${name} berhasil terdaftar!` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
});

app.post('/attend', upload.single('photo'), async (req, res) => {
    const photoPath = req.file.path;
    try {
        const descriptor = await getFaceDescriptor(photoPath);
        if (!descriptor) return res.json({ success: false, message: 'Wajah tidak terdeteksi.' });

        const { rows } = await db.query('SELECT * FROM users');
        if (rows.length === 0) return res.json({ success: false, message: 'Belum ada pengguna terdaftar.' });

        const labeledFaceDescriptors = rows.map(user => new faceapi.LabeledFaceDescriptors(
            user.name,
            [new Float32Array(JSON.parse(user.face_descriptor))]
        ));
        const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);
        const bestMatch = faceMatcher.findBestMatch(descriptor);

        if (bestMatch.label === 'unknown') {
            return res.json({ success: false, message: 'Wajah tidak dikenali.' });
        }
        
        const user = rows.find(u => u.name === bestMatch.label);
        const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
        
        await db.query('INSERT INTO attendance (user_id, timestamp) VALUES ($1, $2)', [user.id, timestamp]);
        res.json({ success: true, message: `Absensi berhasil! Selamat datang, ${user.name}. Waktu: ${timestamp}` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
    }
});

app.listen(port, () => console.log(`Server berjalan di port ${port}`));
