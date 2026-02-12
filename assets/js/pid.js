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
		// --- CONFIG ---
        const CANVAS_W = 1000;
        const CANVAS_H = 400;
        
        // --- STATE ---
        let robotX = CANVAS_W / 2;
        let robotAngle = 0;
        let lineX = CANVAS_W / 2;
        let trackOffset = 0;
        let lastTime = performance.now();
        
        let lastError = 0;
        let integral = 0;
        let currentAngularVel = 0;
		
		// [BARU] Simpan kecepatan aktual untuk mode Akselerasi
		let actualLeftSpeed = 0;
		let actualRightSpeed = 0;
        // --- DOM ---
        const canvas = document.getElementById('simCanvas');
        const ctx = canvas.getContext('2d');
        canvas.width = CANVAS_W;
        canvas.height = CANVAS_H;

        // --- CHART ---
        const ctxChart = document.getElementById('chartCanvas').getContext('2d');
        const perfChart = new Chart(ctxChart, {
            type: 'line',
            data: {
                labels: Array(150).fill(''),
                datasets: [
                    { label: 'Robot', data: Array(150).fill(50), borderColor: '#f43f5e', borderWidth: 2, pointRadius: 0, tension: 0.1 },
                    { label: 'Target', data: Array(150).fill(50), borderColor: '#fbbf24', borderWidth: 2, borderDash: [5, 5], pointRadius: 0, fill: true, backgroundColor: 'rgba(251, 191, 36, 0.05)' }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false, animation: false, interaction: { mode: 'none' },
                scales: { 
                    y: { min: 0, max: 100, grid: { color: '#1e293b' } }, 
                    x: { display: false } 
                },
                plugins: { legend: { display: true }, tooltip: { enabled: false } }
            }
        });

        // --- LOOP ---
        function loop() {
            const now = performance.now();
            let dt = (now - lastTime) / 1000;
            lastTime = now;
            if(dt > 0.1) dt = 0.1;

            // 1. INPUTS
            const baseSpeed = parseInt(document.getElementById('base-speed').value);
            const Kp = parseFloat(document.getElementById('kp').value);
            const Ki = parseFloat(document.getElementById('ki').value);
            const Kd = parseFloat(document.getElementById('kd').value);
            const inertiaVal = parseInt(document.getElementById('inertia').value);
            const frictionVal = parseInt(document.getElementById('friction').value);
            const linePosVal = parseFloat(document.getElementById('line-pos').value);
            const sensorLimit = parseInt(document.getElementById('sensor-limit').value);
            const mode = document.getElementById('control-mode').value;
            
            // [BARU] Input Tipe Sensor
            const sensorType = document.getElementById('sensor-type').value;

            // Update Labels
            document.getElementById('val-base').innerText = baseSpeed;
            document.getElementById('val-kp').innerText = Kp.toFixed(1);
            document.getElementById('val-ki').innerText = Ki.toFixed(3);
            document.getElementById('val-kd').innerText = Kd.toFixed(1);
            document.getElementById('val-inertia').innerText = inertiaVal + "%";
            document.getElementById('val-friction').innerText = frictionVal + "%";
            document.getElementById('val-sensor').innerText = sensorLimit + "px";

            // 2. LINE LOGIC
            const lineX = (linePosVal / 100) * CANVAS_W;

            // 3. PID CALCULATION & SENSOR LOGIC
            
            // Hitung Posisi Sensor di Depan Robot (Look-Ahead)
            const sensorOffset = 45; 
            const sensorX = robotX + (Math.sin(robotAngle) * sensorOffset);

            // Hitung Raw Error
            let rawError = lineX - sensorX;

            // --- [FITUR BARU] SENSOR QUANTIZATION (DISKRITISASI) ---
            // Mensimulasikan sensor yang tidak presisi (Digital step)
            if (sensorType !== 'analog') {
                // Tentukan resolusi langkah (step)
                // Digital-8: Lebar sensor dibagi 8 zona
                // Digital-16: Lebar sensor dibagi 16 zona
                let steps = (sensorType === 'digital-8') ? 8 : 16;
                let stepSize = sensorLimit / steps;

                // Matematika pembulatan ke step terdekat
                // Contoh: Error 12.5 -> 0. Error 28 -> 25.
                rawError = Math.round(rawError / stepSize) * stepSize;
            }

            let error = rawError;

            // --- SATURATION LOGIC ---
            const halfSensor = sensorLimit / 2;
            let isSaturated = false;

            if (error > halfSensor) { error = halfSensor; isSaturated = true; } 
            else if (error < -halfSensor) { error = -halfSensor; isSaturated = true; }

            integral += error * dt;
            const derivative = (error - lastError) / dt;
            
            if(integral > 100) integral = 100; if(integral < -100) integral = -100;
            
            const pidOutput = ((Kp * error) + (Ki * integral) + (Kd * derivative)) * 0.5;
            lastError = error;

            // 4. MOTOR MIXING
            let targetLeft = baseSpeed + pidOutput;
            let targetRight = baseSpeed - pidOutput;

            // Clamp Target
            targetLeft = Math.max(-255, Math.min(255, targetLeft));
            targetRight = Math.max(-255, Math.min(255, targetRight));

            // Acceleration Logic
            let left, right;
            if (mode === 'direct') {
                actualLeftSpeed = targetLeft;
                actualRightSpeed = targetRight;
            } else {
                const accelerationRate = 0.2; 
                actualLeftSpeed += (targetLeft - actualLeftSpeed) * accelerationRate;
                actualRightSpeed += (targetRight - actualRightSpeed) * accelerationRate;
            }
            left = actualLeftSpeed;
            right = actualRightSpeed;

            // 5. PHYSICS ENGINE
            const targetAngularVel = (left - right) * 0.04;
            
            // Inertia Map
            if (inertiaVal === 0) {
                currentAngularVel = targetAngularVel;
            } else {
                let inertiaFactor = 0.8 - (inertiaVal / 120); 
                if (inertiaFactor < 0.01) inertiaFactor = 0.01;
                currentAngularVel += (targetAngularVel - currentAngularVel) * inertiaFactor;
            }

            // Friction Map
            const frictionCoeff = 0.995 - (frictionVal / 500);
            currentAngularVel *= frictionCoeff; 

            // Update Angle
            robotAngle += currentAngularVel * dt;
            if(robotAngle > 1.5) robotAngle = 1.5; 
            if(robotAngle < -1.5) robotAngle = -1.5;

            // Lateral Movement
            const forwardSpeed = (left + right) * 0.5;
            trackOffset += forwardSpeed * dt * 2;
            if(trackOffset > 80) trackOffset = 0;

            robotX += Math.sin(robotAngle) * (Math.abs(forwardSpeed) + 50) * dt * 3.0;

            // Bounds
            if(robotX < 20) { robotX=20; robotAngle=0.1; currentAngularVel=0; }
            if(robotX > CANVAS_W-20) { robotX=CANVAS_W-20; robotAngle=-0.1; currentAngularVel=0; }

            // 6. DRAW & UPDATE
            drawScene(lineX, robotX, robotAngle, sensorLimit);
            updateBars(left, right);
            
            document.getElementById('disp-error').innerText = error.toFixed(1);
            document.getElementById('disp-angle').innerText = (robotAngle * 57.29).toFixed(1);
            const satBadge = document.getElementById('sat-indicator');
            isSaturated ? satBadge.classList.remove('hidden') : satBadge.classList.add('hidden');

            // Chart menampilkan posisi SENSOR (hidung) vs Garis
            // Ini agar visual chart sesuai dengan apa yang dibaca PID
            updateChartData(lineX, sensorX); 
            
            requestAnimationFrame(loop);
        }

        function drawScene(lx, rx, ang, sLimit) {
            ctx.fillStyle = "#0f172a"; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
            
            // 1. Grid & Floor
            ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 1;
            for(let i=0; i<=CANVAS_W; i+=100) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_H); ctx.stroke(); }
            for(let y = trackOffset; y < CANVAS_H; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke(); }

            // 2. Target Line (Garis Kuning)
            ctx.shadowColor = "#fbbf24"; ctx.shadowBlur = 10;
            ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, CANVAS_H); ctx.stroke();
            ctx.shadowBlur = 0;

            // 3. Robot & Sensor (Satu Kesatuan)
            ctx.save(); 
            ctx.translate(rx, CANVAS_H - 80); 
            ctx.rotate(ang); // Rotasi diterapkan ke BODY dan SENSOR

            // --- A. Sensor Zone Visualization (Sekarang ikut miring!) ---
            // Kita gambar di Y = -40 (posisi hidung robot)
            ctx.fillStyle = "rgba(16, 185, 129, 0.15)"; // Emerald transparan
            ctx.fillRect(-sLimit/2, -45, sLimit, 15); // Area sensor
            
            // Batas Sensor (Garis Putus-putus)
            ctx.strokeStyle = "#34d399"; ctx.lineWidth = 1; ctx.setLineDash([2,2]); 
            ctx.strokeRect(-sLimit/2, -45, sLimit, 15);
            ctx.setLineDash([]); // Reset dash

            // --- B. Robot Body ---
            ctx.fillStyle = "#334155"; ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.roundRect(-30, -40, 60, 80, 10); ctx.fill(); ctx.stroke();
            
            // Wheels
            ctx.fillStyle = "#38bdf8"; ctx.fillRect(-38, -20, 8, 40); // L
            ctx.fillStyle = "#f43f5e"; ctx.fillRect(30, -20, 8, 40);  // R

            // Sensor Array Fisik (Strip Hijau di Hidung)
            ctx.fillStyle = "#10b981"; ctx.fillRect(-20, -38, 40, 4);

            // Direction Arrow
            ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(-8, -10); ctx.lineTo(8, -10);
            ctx.fillStyle = "#fbbf24"; ctx.fill();
            
            ctx.restore();
        }

        function updateBars(l, r) {
            const hl = ((l + 255) / 510) * 100;
            const hr = ((r + 255) / 510) * 100;
            document.getElementById('bar-left').style.height = `${hl}%`;
            document.getElementById('bar-right').style.height = `${hr}%`;
        }

        let frameCount = 0;
        function updateChartData(linePx, robotPx) {
            frameCount++; if(frameCount % 3 !== 0) return;
            const targetVal = (linePx / CANVAS_W) * 100;
            const robotVal = (robotPx / CANVAS_W) * 100;
            const robotData = perfChart.data.datasets[0].data;
            const lineData = perfChart.data.datasets[1].data;
            robotData.push(robotVal); robotData.shift();
            lineData.push(targetVal); lineData.shift();
            perfChart.update('none');
        }

        function setLine(val) { document.getElementById('line-pos').value = val; }
        loop();