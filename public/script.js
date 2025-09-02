document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const captureButton = document.getElementById('captureButton');
    const registerButton = document.getElementById('registerButton');
    const nameInput = document.getElementById('name');
    const photoInput = document.getElementById('photo');
    const responseEl = document.getElementById('response');

    async function startVideo() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
            video.srcObject = stream;
        } catch (err) {
            console.error("Error mengakses kamera: ", err);
            responseEl.textContent = "Error: Gagal mengakses kamera.";
        }
    }
    startVideo();

    registerButton.addEventListener('click', async () => {
        const name = nameInput.value;
        const photo = photoInput.files[0];
        if (!name || !photo) {
            responseEl.textContent = 'Status: Nama dan foto harus diisi!';
            return;
        }

        const formData = new FormData();
        formData.append('name', name);
        formData.append('photo', photo);
        responseEl.textContent = 'Status: Mendaftarkan... Mohon tunggu.';

        try {
            const res = await fetch('/register', { method: 'POST', body: formData });
            const data = await res.json();
            responseEl.textContent = `Status: ${data.message}`;
        } catch (error) {
            responseEl.textContent = 'Status: Terjadi kesalahan saat pendaftaran.';
        }
    });

    captureButton.addEventListener('click', async () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        responseEl.textContent = 'Status: Memproses absensi... Mohon tunggu.';

        canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append('photo', blob, 'absen.jpg');

            try {
                const res = await fetch('/attend', { method: 'POST', body: formData });
                const data = await res.json();
                responseEl.textContent = `Status: ${data.message}`;
            } catch (error) {
                responseEl.textContent = 'Status: Terjadi kesalahan saat absensi.';
            }
        }, 'image/jpeg');
    });
});
