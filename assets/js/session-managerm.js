/**
 * ARIES TECH LABS - UNIVERSAL SESSION MANAGER
 * Fungsi: Memaksa refresh halaman setiap 24 jam untuk update traffic & ads.
 * * @param {Function} saveCallback - (Opsional) Fungsi khusus untuk simpan data sebelum reload.
 */

const SESSION_KEY = 'aries_global_session_ts'; // Kunci penyimpanan waktu
const SESSION_DURATION = 4 * 60 * 60 * 1000; // 24 Jam (dalam milidetik)

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
        let msg = "🔄 SYSTEM UPDATE REQUIRED\n\nSesi 4 jam Anda telah berakhir.\n";
        
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

// ==========================================
// 1. DATABASE PROGRAM (Dibutuhkan oleh Widget)
// ==========================================
const programs = [
    { name: "GraderA+", file: "GraderA/index.html", category: "Academic", icon: "📊", color: "sky", desc: "Student presentation assessment tool with custom instruments and Excel (.xlsx) export." },
    { name: "Transcript Analyzer", file: "transkrip.html", category: "Academic", icon: "📊", color: "sky", desc: "Extract data from PDF transcripts and simulate GPA for graduation projection." },
    { name: "PENTOL Smart Presensi", file: "pentol.html", category: "Academic", icon: "📝", color: "sky", desc: "Custom Form Builder, Digital Signature, and Auto PDF/Excel Corporate Report Generation.", isHot: true },
	{ name: "FinFlow Finance", file: "finance_app.html", category: "Utility", icon: "💰", color: "amber", desc: "Offline-first personal finance tracker with multi-book support, real-time analytics, and professional Excel/PDF export.", isHot: true },
    { name: "Insta-Connect QR", file: "qr_studio.html", category: "Utility", icon: "▣", color: "amber", desc: "Instant QR Code generator for WiFi Auto-Login, Digital Business Cards (vCard), and URL links." },
    { name: "Pixel-Diet Img", file: "image_tools.html", category: "Utility", icon: "📉", color: "amber", desc: "Securely compress and convert images (JPG/PNG/WEBP) locally in-browser." },
    { name: "PDF Forge", file: "pdf_forge.html", category: "Utility", icon: "📑", color: "amber", desc: "Securely merge multiple PDF files into one document. 100% Client-side processing." },
    { name: "PDF Splitter", file: "pdf_splitter.html", category: "Utility", icon: "📄", color: "amber", desc: "Split or remove PDF pages into different document. 100% Client-side processing." },
    { name: "PDF to Image", file: "pdf_converter.html", category: "Utility", icon: "🖼️", color: "amber", desc: "Convert PDF pages to high-quality JPG/PNG images. Download as ZIP." },
    { name: "Cine-Capture", file: "screen_recorder.html", category: "Utility", icon: "🎥", color: "amber", desc: "Free, watermark-free screen recorder. Supports microphone & system audio." },
	{ name: "Aries Audio Workstation", file: "audio_arranger.html", category: "Utility", icon: "🎛️", color: "amber", desc: "Web-based Professional DAW. Features Smart Volume Automation, Reverse Audio, .aries project save, and Offline WAV export.", isHot: true },
	{ name: "Electrostatics Lab", file: "elmag_sim.html", category: "Tutorial/Simulation", icon: "⚡", color: "emerald", desc: "Visualisasi Hukum Coulomb, Medan Vektor & Potensial." },
    { name: "Magnetostatics Lab", file: "magnet_sim.html", category: "Tutorial/Simulation", icon: "🧲", color: "emerald", desc: "Hukum Biot-Savart, Lorentz & Kaidah Tangan Kanan." },
    { name: "Lorentz Chamber", file: "lorentz_sim.html", category: "Tutorial/Simulation", icon: "⚛️", color: "emerald", desc: "Simulasi Gerak Partikel, Siklotron & Velocity Selector." },
    { name: "Solenoid & Toroid", file: "solenoid_sim.html", category: "Tutorial/Simulation", icon: "🌀", color: "emerald", desc: "Kalkulator Medan Magnet Kumparan & Efek Inti Besi." },
    { name: "Faraday's Lab", file: "induction_sim.html", category: "Tutorial/Simulation", icon: "💡", color: "emerald", desc: "Induksi Elektromagnetik, Hukum Lenz & Generator AC." },
    { name: "Transformer Lab", file: "transformer_sim.html", category: "Tutorial/Simulation", icon: "🔌", color: "emerald", desc: "Trafo Step-Up/Down, Efisiensi & Dual Oscilloscope." },
    { name: "RLC Resonance", file: "rlc_sim.html", category: "Tutorial/Simulation", icon: "〰️", color: "emerald", desc: "Rangkaian AC Seri/Paralel, Diagram Fasor & Resonansi." },
    { name: "Resistor Decoder", file: "resistor_calc.html", category: "Tutorial/Simulation", icon: "📟", color: "emerald", desc: "Interactive Resistor Color Code Calculator. Visual decoder for 4, 5, and 6-band resistors." },
    { name: "Sensor Noise Filter", file: "filter_sim.html", category: "Tutorial/Simulation", icon: "📡", color: "emerald", desc: "Interactive visualization comparing SMA & EMA filters for noise reduction." },
    { name: "Motor Torque Lab", file: "motor_sim.html", category: "Tutorial/Simulation", icon: "⚙️", color: "emerald", desc: "Simulation for calculating torque, pulley loads, and gearbox impact on drive systems." },
    { name: "PID Line Tuner", file: "pid_sim.html", category: "Tutorial/Simulation", icon: "🧠", color: "emerald", desc: "Visual tuning of Kp, Ki, and Kd parameters for Line Follower robot stability.", isHot: true },
];

// ==========================================
// 2. MESIN WIDGET REKOMENDASI
// ==========================================
function renderWidgetRecommendations() {
    const widgetContainer = document.getElementById('recommendation-widget');
    if (!widgetContainer) return;

    // Ambil nama file yang sedang terbuka (misal: "pdf_forge.html")
    const currentPageFile = window.location.pathname.split('/').pop();

    // Singkirkan program yang sedang dibuka agar tidak merekomendasikan dirinya sendiri
    let availablePrograms = programs.filter(p => !p.file.includes(currentPageFile));

    // Acak urutan program
    availablePrograms = availablePrograms.sort(() => 0.5 - Math.random());

    // Tarik program yang berlabel "HOT" ke paling depan
    availablePrograms = availablePrograms.sort((a, b) => (b.isHot === true) - (a.isHot === true));

    // Ambil 4 teratas saja
    const selectedPrograms = availablePrograms.slice(0, 4);

    let htmlContent = '';
    
    selectedPrograms.forEach(p => {
        let badgeColor = p.category === 'Utility' ? 'amber' : (p.category === 'Academic' ? 'sky' : 'emerald');
        const hotBadge = p.isHot ? `<span class="ml-2 inline-flex items-center px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[8px] uppercase tracking-widest align-middle animate-pulse">🔥 HOT</span>` : '';

        // Gunakan nama file langsung sebagai link karena ini dipanggil di dalam folder "programs"
        const targetLink = p.file;

        htmlContent += `
            <a href="${targetLink}" class="group flex flex-col p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:border-${p.color}-500/50 hover:bg-slate-800 transition-all cursor-pointer shadow-sm flex-none w-[75vw] sm:w-[260px] snap-start h-[130px]">
                <div class="flex justify-between items-start mb-2">
                    <div class="w-8 h-8 rounded-lg bg-${p.color}-500/10 border border-${p.color}-500/20 flex items-center justify-center text-lg group-hover:scale-110 transition-transform shrink-0">${p.icon}</div>
                    <span class="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-${badgeColor}-500/10 text-${badgeColor}-400 border border-${badgeColor}-500/20 uppercase tracking-widest">${p.category}</span>
                </div>
                <h4 class="text-sm font-bold text-white mb-1 group-hover:text-${p.color}-400 transition-colors truncate">${p.name} ${hotBadge}</h4>
                <p class="text-[10px] text-slate-400 line-clamp-2 leading-snug">${p.desc}</p>
            </a>`;
    });

    widgetContainer.innerHTML = htmlContent;
}

// Eksekusi fungsi saat DOM sudah siap
document.addEventListener('DOMContentLoaded', renderWidgetRecommendations);