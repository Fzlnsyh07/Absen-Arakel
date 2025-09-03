// Inisialisasi Supabase Client (Bagian ini sudah benar)
const SUPABASE_URL = 'https://hmpoxlwchwkjcxjehqyx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtcG94bHdjaHdramN4amVocXl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MzM2MTIsImV4cCI6MjA3MjQwOTYxMn0.Hf-b4KiMgx5jVyGzcMzRMUw-el5wUOvfQdprSLPzy3s';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Ambil elemen dari HTML
const registerButton = document.getElementById('registerButton');
const captureButton = document.getElementById('captureButton');
const registerNameInput = document.getElementById('registerName'); // Pastikan ID di HTML sesuai
const attendNameInput = document.getElementById('attendName');     // Pastikan ID di HTML sesuai
const responseEl = document.getElementById('response');

// --- BAGIAN PENDAFTARAN ---
registerButton.addEventListener('click', async () => {
    const name = registerNameInput.value;
    if (!name) {
        responseEl.textContent = 'Status: Nama untuk pendaftaran harus diisi!';
        return;
    }

    responseEl.textContent = 'Status: Mendaftarkan...';
    
    // INI BAGIAN YANG DIUBAH: Gunakan client Supabase, bukan fetch
    const { error } = await supabase.from('users').insert({ name: name });

    if (error) {
        responseEl.textContent = `Status: Gagal - ${error.message}`;
    } else {
        responseEl.textContent = `Status: Pengguna ${name} berhasil terdaftar!`;
        registerNameInput.value = ''; // Kosongkan input
    }
});

// --- BAGIAN ABSENSI ---
captureButton.addEventListener('click', async () => {
    const name = attendNameInput.value;
    if (!name) {
        responseEl.textContent = 'Status: Nama untuk absensi harus diisi!';
        return;
    }

    responseEl.textContent = 'Status: Memproses absensi...';
    
    try {
        // INI BAGIAN YANG DIUBAH: Panggil Edge Function 'attend' di Supabase
        const { data, error } = await supabase.functions.invoke('attend', {
            body: { name: name }
        });

        if (error) throw error;
        
        responseEl.textContent = `Status: ${data.message}`;
        attendNameInput.value = ''; // Kosongkan input

    } catch (error) {
        const errorMessage = error.context?.body?.message || error.message;
        responseEl.textContent = `Status: Gagal - ${errorMessage}`;
    }
});
