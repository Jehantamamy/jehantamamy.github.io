    // --- STATE CONFIG ---
    /*
	(function() {
		// 1. Tentukan Domain Resmi Kamu
		const allowedDomains = ["ariestechlab.com", "www.ariestechlab.com"];
		
		// 2. Cek Hostname saat ini
		const currentDomain = window.location.hostname;

		// PENGECUALIAN: Izinkan 'localhost' atau '127.0.0.1' biar kamu tetap bisa ngoding/testing
		if (currentDomain === "localhost" || currentDomain === "127.0.0.1" || currentDomain === "") {
			// Jika kosong (biasanya file://), kita anggap ilegal
			if(window.location.protocol === "file:") {
				 bloackAccess();
			}
			return; // Lanjut, ini mode developer
		}

		// 3. Jika domain tidak terdaftar
		if (!allowedDomains.includes(currentDomain)) {
			bloackAccess();
		}

		function bloackAccess() {
			// Hapus seluruh tampilan HTML (Program Jadi Putih Polos)
			document.body.innerHTML = `
				<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#0f172a; color:white; font-family:sans-serif; text-align:center;">
					<h1 style="font-size:3rem; color:#ef4444;">⛔ AKSES DITOLAK</h1>
					<p style="font-size:1.2rem; margin-top:1rem;">Aplikasi ini dilindungi Hak Cipta dan hanya dapat digunakan melalui website resmi.</p>
					<a href="https://ariestechlab.com" style="margin-top:2rem; padding:10px 20px; background:#10b981; color:white; text-decoration:none; border-radius:8px; font-weight:bold;">Buka Aries Tech Labs</a>
				</div>
			`;
			
			// Hentikan eksekusi script selanjutnya
			throw new Error("Illegal execution environment detected.");
		}
	})();/**/
	let currentMode = 'link';
    let qrColor = '#000000'; 
    let qrObj = null;

    // --- FORM TEMPLATES ---
    const Forms = {
        link: `
            <div class="animate-fade-in">
                <label class="block text-xs font-semibold text-slate-400 mb-1">URL Website atau Teks</label>
                <input type="text" id="inp-text" class="cyber-input" placeholder="https://aries-tech.github.io" oninput="generate()">
                <p class="text-[10px] text-slate-600 mt-2">Masukkan link lengkap dengan https:// atau teks biasa.</p>
            </div>
        `,
        wifi: `
            <div class="space-y-3 animate-fade-in">
                <div>
                    <label class="block text-xs font-semibold text-slate-400 mb-1">Nama WiFi (SSID)</label>
                    <input type="text" id="inp-ssid" class="cyber-input" placeholder="Nama WiFi Kamu" oninput="generate()">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-400 mb-1">Password</label>
                    <input type="text" id="inp-pass" class="cyber-input" placeholder="Rahasia123" oninput="generate()">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-400 mb-1">Keamanan</label>
                    <select id="inp-enc" class="cyber-input" onchange="generate()">
                        <option value="WPA">WPA/WPA2 (Standar)</option>
                        <option value="WEP">WEP (Lama)</option>
                        <option value="nopass">Tanpa Password</option>
                    </select>
                </div>
            </div>
        `,
        vcard: `
            <div class="space-y-3 animate-fade-in">
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-semibold text-slate-400 mb-1">Nama Depan</label>
                        <input type="text" id="inp-fn" class="cyber-input" placeholder="Nama depan" oninput="generate()">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-400 mb-1">Nama Belakang</label>
                        <input type="text" id="inp-ln" class="cyber-input" placeholder="Nama belakang" oninput="generate()">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-400 mb-1">Nomor HP</label>
                    <input type="text" id="inp-tel" class="cyber-input" placeholder="0812..." oninput="generate()">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-400 mb-1">Email (Opsional)</label>
                    <input type="text" id="inp-email" class="cyber-input" placeholder="email@contoh.com" oninput="generate()">
                </div>
            </div>
        `,
        barcode: `
            <div class="space-y-3 animate-fade-in">
                <div class="p-3 bg-emerald-900/20 border border-emerald-900/50 rounded-lg">
                    <p class="text-[10px] text-emerald-400 font-mono">Mode Barcode Aktif. Output dioptimalkan untuk scanner laser.</p>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-400 mb-1">Data (ID/SKU)</label>
                    <input type="text" id="inp-bc-val" class="cyber-input font-mono" placeholder="ARIES-001" value="ARIES-TECH-01" oninput="generate()">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-400 mb-1">Format Standar</label>
                    <select id="inp-bc-fmt" class="cyber-input" onchange="generate()">
                        <option value="CODE128">CODE 128 (Universal)</option>
                        <option value="CODE39">CODE 39 (Industri)</option>
                        <option value="EAN13">EAN-13 (Ritel - Wajib Angka)</option>
                    </select>
                </div>
            </div>
        `
    };

    function init() { setMode('link'); }

    // --- MODE SWITCHING ---
    function setMode(mode) {
        currentMode = mode;
        ['link', 'wifi', 'vcard', 'barcode'].forEach(m => {
            const btn = document.getElementById(`tab-${m}`);
            if(m === mode) {
                btn.classList.remove('tab-inactive');
                btn.classList.add('tab-active');
            } else {
                btn.classList.remove('tab-active');
                btn.classList.add('tab-inactive');
            }
        });

        document.getElementById('form-container').innerHTML = Forms[mode];
        
        const qrContainer = document.getElementById('qrcode');
        const bcCanvas = document.getElementById('barcode-canvas');
        const colorSection = document.getElementById('color-picker-section');

        if(mode === 'barcode') {
            qrContainer.classList.add('hidden');
            colorSection.classList.add('hidden'); 
            bcCanvas.classList.remove('hidden');
        } else {
            qrContainer.classList.remove('hidden');
            colorSection.classList.remove('hidden');
            bcCanvas.classList.add('hidden');
        }

        generate();
    }

    function setColor(color) {
        qrColor = color;
        if(currentMode !== 'barcode') generate();
    }

    // --- GENERATOR LOGIC ---
    function generate() {
        if(currentMode === 'barcode') {
            const val = document.getElementById('inp-bc-val')?.value || "ARIES-TECH-01";
            const fmt = document.getElementById('inp-bc-fmt')?.value || "CODE128";
            try {
                JsBarcode("#barcode-canvas", val, {
                    format: fmt,
                    lineColor: "#000",
                    width: 3,
                    height: 100,
                    displayValue: true,
                    fontSize: 20,
                    background: "#ffffff",
                    margin: 0 
                });
            } catch(e) { console.log("Barcode Error"); }
            return;
        }

        // QR GENERATION
        let rawText = "";
        if(currentMode === 'link') {
            rawText = document.getElementById('inp-text')?.value || "https://aries-tech.github.io";
        } 
        else if(currentMode === 'wifi') {
            const ssid = document.getElementById('inp-ssid')?.value || "";
            const pass = document.getElementById('inp-pass')?.value || "";
            const enc = document.getElementById('inp-enc')?.value || "WPA";
            if(ssid) rawText = `WIFI:S:${ssid};T:${enc};P:${pass};;`;
            else rawText = "WIFI:S:MyWiFi;T:WPA;P:Secret;;";
        }
        else if(currentMode === 'vcard') {
            const fn = document.getElementById('inp-fn')?.value || "";
            const ln = document.getElementById('inp-ln')?.value || "";
            const tel = document.getElementById('inp-tel')?.value || "";
            const email = document.getElementById('inp-email')?.value || "";
            rawText = `BEGIN:VCARD\nVERSION:3.0\nN:${ln};${fn}\nFN:${fn} ${ln}\nTEL:${tel}\nEMAIL:${email}\nEND:VCARD`;
            if(!fn && !ln && !tel) rawText = "BEGIN:VCARD\nVERSION:3.0\nFN:Aries Tech\nEND:VCARD";
        }

        const container = document.getElementById("qrcode");
        container.innerHTML = "";
        qrObj = new QRCode(container, {
            text: rawText,
            width: 1000, 
            height: 1000,
            colorDark : qrColor,
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });
    }

    // --- DOWNLOAD LOGIC ---
    function downloadImage() {
        let sourceCanvas;
        
        if(currentMode === 'barcode') {
            sourceCanvas = document.getElementById('barcode-canvas');
        } else {
            sourceCanvas = document.querySelector('#qrcode canvas');
        }

        if (!sourceCanvas) return;

        const padding = 50; 
        const w = sourceCanvas.width;
        const h = sourceCanvas.height;

        const newCanvas = document.createElement('canvas');
        newCanvas.width = w + (padding * 2);
        newCanvas.height = h + (padding * 2);
        const ctx = newCanvas.getContext('2d');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, newCanvas.width, newCanvas.height);
        ctx.drawImage(sourceCanvas, padding, padding);

        const image = newCanvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
        const link = document.createElement('a');
        link.download = `StudioGen-${currentMode}-${Date.now()}.png`;
        link.href = image;
        link.click();
    }
	document.addEventListener('DOMContentLoaded', () => {

		// PANGGIL SESSION MANAGER (TANPA AUTO SAVE)
		// User akan dapat peringatan biasa.
		initSessionManager();

		// ... inisialisasi tool lainnya ...
	});

    init();
