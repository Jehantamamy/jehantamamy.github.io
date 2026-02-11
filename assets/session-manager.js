/**
 * ARIES TECH LABS - UNIVERSAL SESSION MANAGER
 * Fungsi: Memaksa refresh halaman setiap 24 jam untuk update traffic & ads.
 * * @param {Function} saveCallback - (Opsional) Fungsi khusus untuk simpan data sebelum reload.
 */

const SESSION_KEY = 'aries_global_session_ts'; // Kunci penyimpanan waktu
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 Jam (dalam milidetik)

function initSessionManager(saveCallback = null) {
    // 1. Cek kapan terakhir buka
    let lastSession = localStorage.getItem(SESSION_KEY);
    const now = new Date().getTime();

    // Jika baru pertama kali buka (atau cache bersih)
    if (!lastSession) {
        localStorage.setItem(SESSION_KEY, now);
        console.log("Session started: " + new Date(now).toLocaleString());
        return; // Aman, lanjut
    }

    // 2. Hitung durasi
    const timeDiff = now - parseInt(lastSession);

    // 3. Jika sudah kadaluarsa (> 24 Jam)
    if (timeDiff > SESSION_DURATION) {
        console.warn("Session expired. Initiating reload sequence...");

        // --- STEP PENTING: JALANKAN FUNGSI PENYELAMAT DATA ---
        if (typeof saveCallback === 'function') {
            try {
                console.log("Saving application data...");
                saveCallback(); // Jalankan fungsi simpan milik aplikasi
            } catch (e) {
                console.error("Gagal menyimpan data otomatis:", e);
            }
        }

        // --- TAMPILKAN PESAN ---
        // Pesan beda tergantung apakah ada saveCallback atau tidak
        let msg = "🔄 SYSTEM UPDATE REQUIRED\n\nSesi 24 jam Anda telah berakhir.\n";
        
        if (saveCallback) {
            msg += "Data Anda SUDAH DISIMPAN secara otomatis.\n";
        } else {
            msg += "Halaman akan dimuat ulang untuk pembaruan sistem.\n";
        }
        
        msg += "\nKlik OK untuk Refresh halaman.";

        alert(msg);

        // --- RESET & RELOAD ---
        localStorage.setItem(SESSION_KEY, now);
        location.reload();
    } else {
        // Jika belum kadaluarsa, opsional: perpanjang sesi atau biarkan tetap hitung mundur
        // Di sini kita biarkan hitung mundur dari login awal (Strict Mode)
        console.log(`Session valid. Time remaining: ${((SESSION_DURATION - timeDiff) / 3600000).toFixed(2)} hours.`);
    }
}