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
	function updateSim() {
		// 1. Ambil Custom Specs (Input User)
		const baseRPM = parseFloat(document.getElementById('base-rpm').value) || 0;
		const stallTorque = parseFloat(document.getElementById('stall-torque').value) || 0;

		// Update Display Spec
		document.getElementById('disp-base').innerText = baseRPM;
		document.getElementById('disp-stall').innerText = stallTorque;

		// 2. Ambil Variable Input
		const load = parseFloat(document.getElementById('load-kg').value);
		const radius = parseFloat(document.getElementById('radius-cm').value);
		const ratio = parseInt(document.getElementById('gear-ratio').value);
		const efficiency = parseInt(document.getElementById('efficiency').value) / 100;

		// Update Labels
		document.getElementById('load-val').innerText = load + " Kg";
		document.getElementById('radius-val').innerText = radius + " cm";
		document.getElementById('gear-val').innerText = "1:" + ratio;
		document.getElementById('eff-val').innerText = (efficiency * 100) + "%";
		document.getElementById('box-label').innerText = load + "kg";

		// 3. Kalkulasi Fisika
		const loadTorque = load * radius; // Torsi yang diminta beban
		
		// Torsi Maksimal Sistem (Jika Motor dipaksa sampai berhenti)
		const systemMaxTorque = stallTorque * ratio * efficiency;

		// 4. Hitung RPM
		// LoadAtMotor adalah beban torsi yang dirasakan poros motor sebelum gear
		const loadAtMotorShaft = loadTorque / (ratio * efficiency);
		
		// Faktor Beban (0.0 = Tanpa Beban, 1.0 = Macet)
		let loadFactor = loadAtMotorShaft / stallTorque;
		
		let motorRPM = 0;
		if (loadFactor >= 1) {
			motorRPM = 0; // Stall
		} else {
			motorRPM = baseRPM * (1 - loadFactor); // Penurunan RPM Linear
		}

		const outputRPM = motorRPM / ratio;

		// 5. Update Output UI
		document.getElementById('req-torque').innerText = loadTorque.toFixed(1);
		document.getElementById('sys-torque').innerText = systemMaxTorque.toFixed(1);
		document.getElementById('rpm-out').innerText = Math.floor(outputRPM);

		// 6. Visual Animation & Status
		const pulley = document.getElementById('pulley-disc');
		const rope = document.getElementById('rope');
		const status = document.getElementById('status-badge');
		const catLabel = document.getElementById('speed-cat');

		if (outputRPM > 0) {
			// NORMAL OPERATION
			let animDuration = 60 / outputRPM;
			if(animDuration < 0.05) animDuration = 0.05; // Cap speed visual
			
			pulley.style.animation = `spin ${animDuration}s linear infinite`;
			pulley.style.borderColor = "#334155";
			
			rope.className = "rope-tension";
			
			status.innerText = "System: Running";
			status.className = "text-[10px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded text-emerald-500 font-mono uppercase";

			if (outputRPM > 500) {
				catLabel.innerHTML = "<span class='text-sky-400'>⚡ SUPER FAST</span>";
			} else if (outputRPM > 100) {
				catLabel.innerHTML = "<span class='text-emerald-400'>🚀 FAST</span>";
			} else {
				catLabel.innerHTML = "<span class='text-amber-400'>🐢 SLOW (TORQUE)</span>";
			}

		} else {
			// STALLED / OVERLOAD
			pulley.style.animation = "none";
			pulley.style.borderColor = "#ef4444";
			
			rope.className = "rope-slack"; // Tali visual putus/kendor
			
			status.innerText = "MOTOR STALLED";
			status.className = "text-[10px] bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded text-rose-500 font-mono uppercase blink";
			
			catLabel.innerHTML = "<span class='text-rose-500 blink'>⛔ OVERLOAD</span>";
		}
	}

	// Listeners
	document.querySelectorAll('input').forEach(i => i.addEventListener('input', updateSim));
	updateSim();