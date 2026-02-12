        ///*
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
		let currentBands = 4;
        
        // Color Mapping for CSS Classes
        const colorMap = {
            '0': 'bg-black-band', '1': 'bg-brown-band', '2': 'bg-red-band', 
            '3': 'bg-orange-band', '4': 'bg-yellow-band', '5': 'bg-green-band', 
            '6': 'bg-blue-band', '7': 'bg-violet-band', '8': 'bg-grey-band', 
            '9': 'bg-white-band', 
            '0.1': 'bg-gold-band', '0.01': 'bg-silver-band',
            '10': 'bg-brown-band', '100': 'bg-red-band', '1000': 'bg-orange-band',
            '10000': 'bg-yellow-band', '100000': 'bg-green-band', '1000000': 'bg-blue-band',
            '10000000': 'bg-purple-band', 
            '0.5': 'bg-green-band', '0.25': 'bg-blue-band', '0.05': 'bg-grey-band'
        };

        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            calculate();
        });

        function setBands(num) {
            currentBands = num;
            
            // Update Buttons
            [4,5,6].forEach(n => {
                const btn = document.getElementById(`btn-${n}`);
                if(n === num) btn.className = "px-4 py-2 text-xs font-bold rounded-md bg-sky-600 text-white shadow-lg transition-all";
                else btn.className = "px-4 py-2 text-xs font-bold rounded-md text-slate-400 hover:text-white transition-all";
            });

            // Toggle Inputs Visibility
            const band3Ctrl = document.getElementById('control-band-3');
            const bandPpmCtrl = document.getElementById('control-band-ppm');
            
            // Toggle Visual Bands
            const vBand3 = document.getElementById('visual-band-3');
            const vBandPpm = document.getElementById('visual-band-ppm');

            if(num === 4) {
                band3Ctrl.classList.add('hidden');
                bandPpmCtrl.classList.add('hidden');
                vBand3.classList.add('hidden');
                vBandPpm.classList.add('hidden');
            } else if (num === 5) {
                band3Ctrl.classList.remove('hidden');
                bandPpmCtrl.classList.add('hidden');
                vBand3.classList.remove('hidden');
                vBandPpm.classList.add('hidden');
            } else if (num === 6) {
                band3Ctrl.classList.remove('hidden');
                bandPpmCtrl.classList.remove('hidden');
                vBand3.classList.remove('hidden');
                vBandPpm.classList.remove('hidden');
            }

            calculate();
        }

        function calculate() {
            // Get Values
            const b1 = parseInt(document.getElementById('select-band-1').value);
            const b2 = parseInt(document.getElementById('select-band-2').value);
            const b3 = parseInt(document.getElementById('select-band-3').value);
            const mul = parseFloat(document.getElementById('select-band-mul').value);
            const tol = parseFloat(document.getElementById('select-band-tol').value);
            const ppm = document.getElementById('select-band-ppm').value; // For visuals only

            // Update Visual Colors
            updateVisualBand('visual-band-1', b1);
            updateVisualBand('visual-band-2', b2);
            updateVisualBand('visual-band-3', b3);
            updateVisualBand('visual-band-mul', mul);
            updateVisualBand('visual-band-tol', tol);
            updateVisualBand('visual-band-ppm', ppm);

            // Calculation Logic
            let resistance = 0;
            if (currentBands === 4) {
                resistance = (b1 * 10 + b2) * mul;
            } else {
                resistance = (b1 * 100 + b2 * 10 + b3) * mul;
            }

            // Formatting Output
            displayResult(resistance, tol);
        }

        function updateVisualBand(elementId, value) {
            const el = document.getElementById(elementId);
            // Remove old colors
            el.className = el.className.replace(/bg-[\w-]+-band/g, '');
            // Add new color
            let colorClass = colorMap[value.toString()] || 'bg-black-band';
            el.classList.add(colorClass);
            el.classList.add('band'); // Ensure basic class remains
        }

        function displayResult(ohms, tolerance) {
            let formatted = '';
            
            if (ohms >= 1000000) {
                formatted = (ohms / 1000000).toFixed(2).replace(/\.00$/, '') + ' MΩ';
            } else if (ohms >= 1000) {
                formatted = (ohms / 1000).toFixed(2).replace(/\.00$/, '') + ' kΩ';
            } else {
                formatted = ohms.toFixed(2).replace(/\.00$/, '') + ' Ω';
            }

            document.getElementById('result-value').innerText = formatted;
            document.getElementById('result-tolerance').innerText = `± ${tolerance}%`;

            // Min Max Calculation
            const range = ohms * (tolerance / 100);
            const min = ohms - range;
            const max = ohms + range;
            
            document.getElementById('val-min').innerText = formatSimple(min);
            document.getElementById('val-max').innerText = formatSimple(max);
        }

        function formatSimple(val) {
            if (val >= 1000000) return (val / 1000000).toFixed(2) + ' MΩ';
            if (val >= 1000) return (val / 1000).toFixed(2) + ' kΩ';
            return val.toFixed(1) + ' Ω';
        }