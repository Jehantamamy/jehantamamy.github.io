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
        const canvas = document.getElementById('sim-canvas');
        const ctx = canvas.getContext('2d');
        const container = document.getElementById('canvas-container');

        // UI Elements
        const elFluxVal = document.getElementById('val-flux');
        const elFluxBar = document.getElementById('bar-flux');
        const elSpeedVal = document.getElementById('val-speed');
        const elSpeedBar = document.getElementById('bar-speed');
        const elEmfVal = document.getElementById('val-emf');
        const elEmfBar = document.getElementById('bar-emf');
        const bulbIcon = document.getElementById('bulb-icon');
        const currentDirText = document.getElementById('current-direction');
        const flowBar = document.getElementById('flow-bar');

        // Physics Config
        const CONFIG = {
            coilRadius: 70,
            magnetW: 160,
            magnetH: 50,
            baseB: 200 // Base field strength
        };

        // State
        let magnet = { x: 0, y: 0 };
        let velocity = 0;
        let lastPos = 0;
        let isDragging = false;
        let loops = 3;
        let polarity = 1; // 1: N-S, -1: S-N
        let strengthPct = 100;
        let flux = 0;
        let prevFlux = 0;
        let emf = 0;
        let lastTime = 0;

        // --- INIT & RESIZE ---
        function resize() {
            canvas.width = container.offsetWidth;
            canvas.height = container.offsetHeight;
            if(!isDragging) {
                magnet.x = canvas.width / 2 - 250;
                magnet.y = canvas.height / 2;
                lastPos = magnet.x;
            }
        }
        window.addEventListener('resize', resize);
        window.addEventListener('load', () => {
            resize();
            loop();
        });

        // --- MAIN LOOP ---
        function loop(timestamp) {
            const dt = (timestamp - lastTime) / 1000 || 0.016;
            lastTime = timestamp;

            // 1. Calculate Velocity (Smoothed)
            const currentVel = (magnet.x - lastPos) / dt; // Pixels per sec
            velocity = velocity * 0.8 + currentVel * 0.2; // Smooth filter
            lastPos = magnet.x;

            // 2. Calculate Flux
            // Model: Gaussian drop-off based on distance from coil center
            const coilX = canvas.width / 2;
            const dist = (magnet.x - coilX);
            const sigma = 180; // Width of field influence
            
            // Flux Formula: Phi = B * A * Factor
            // Polarity affects sign of Flux
            const B_actual = CONFIG.baseB * (strengthPct/100);
            const rawFlux = polarity * B_actual * Math.exp(-(dist*dist)/(2*sigma*sigma));
            
            flux = rawFlux;

            // 3. Calculate EMF (Faraday)
            // e = -N * dPhi/dt
            const dPhi = (flux - prevFlux);
            // Scaling for readable numbers
            let rawEmf = -loops * dPhi * 2.5; 
            
            // Smooth EMF for visual stability
            emf = emf * 0.9 + rawEmf * 0.1;
            prevFlux = flux;

            // 4. Update UI
            updateDashboard(dt);

            // 5. Draw
            draw();
            requestAnimationFrame(loop);
        }

        function updateDashboard(dt) {
            // Flux Display
            const displayFlux = Math.abs(flux).toFixed(1);
            elFluxVal.innerText = `${(flux).toFixed(1)} mWb`;
            elFluxBar.style.width = `${Math.min(100, (Math.abs(flux)/250)*100)}%`;

            // Speed Display
            const speedMps = Math.abs(velocity / 100).toFixed(2); // Convert px/s to fake m/s
            elSpeedVal.innerText = `${speedMps} m/s`;
            elSpeedBar.style.width = `${Math.min(100, Math.abs(velocity)/20)}%`;

            // EMF Display
            elEmfVal.innerText = `${emf.toFixed(2)} V`;
            
            // EMF Bar (Center Zero)
            // Max range +/- 10V
            const maxV = 150; 
            const pct = (emf / maxV) * 50; // 50% is max swing
            elEmfBar.style.left = emf > 0 ? `50%` : `${50 + pct}%`;
            elEmfBar.style.width = `${Math.abs(pct)}%`;
            elEmfBar.className = `absolute top-0 h-full transition-all duration-75 ${emf > 0 ? 'bg-emerald-400' : 'bg-rose-400'}`;

            // Bulb & Flow Bar
            const brightness = Math.min(1, Math.abs(emf) / 50);
            
            // Flow Bar
            const flowPct = (emf / 100) * 50;
            flowBar.style.left = emf > 0 ? `50%` : `${50 + flowPct}%`;
            flowBar.style.width = `${Math.abs(flowPct)}%`;
            flowBar.className = `absolute top-0 h-full transition-all duration-75 ${emf > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`;

            if(Math.abs(emf) > 1) {
                currentDirText.innerText = emf > 0 ? "CURRENT >>>" : "<<< CURRENT";
                currentDirText.className = `text-xs font-bold ${emf > 0 ? 'text-emerald-400' : 'text-rose-400'}`;
                
                bulbIcon.style.backgroundColor = '#fef08a';
                bulbIcon.style.borderColor = '#facc15';
                bulbIcon.style.boxShadow = `0 0 ${brightness * 40}px ${brightness * 20}px rgba(253, 224, 71, 0.5)`;
            } else {
                currentDirText.innerText = "NO CURRENT";
                currentDirText.className = "text-xs font-bold text-slate-500";
                bulbIcon.style.backgroundColor = '#334155';
                bulbIcon.style.borderColor = '#475569';
                bulbIcon.style.boxShadow = 'none';
            }
        }

        // --- CONTROLS ---
        document.getElementById('slider-loops').addEventListener('input', (e) => {
            loops = parseInt(e.target.value);
            document.getElementById('display-loops').innerText = loops;
        });

        document.getElementById('slider-strength').addEventListener('input', (e) => {
            strengthPct = parseInt(e.target.value);
            document.getElementById('display-strength').innerText = `${strengthPct}%`;
        });

        function flipPolarity() {
            polarity *= -1;
        }

        // --- MOUSE INPUT ---
        canvas.addEventListener('mousedown', e => {
            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            
            // Hitbox Magnet
            if (mx > magnet.x - CONFIG.magnetW/2 && mx < magnet.x + CONFIG.magnetW/2 &&
                my > magnet.y - CONFIG.magnetH/2 && my < magnet.y + CONFIG.magnetH/2) {
                isDragging = true;
                canvas.style.cursor = 'grabbing';
            }
        });

        window.addEventListener('mousemove', e => {
            if (isDragging) {
                const rect = canvas.getBoundingClientRect();
                let mx = e.clientX - rect.left;
                // Clamp horizontal
                mx = Math.max(100, Math.min(canvas.width - 100, mx));
                magnet.x = mx;
            }
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
            canvas.style.cursor = 'grab';
        });


        // --- DRAWING ---
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;

            if(document.getElementById('show-field').checked) drawFieldLines();
            
            drawCoil(cx, cy, false); // Back
            drawMagnet();
            drawCoil(cx, cy, true); // Front
        }

        function drawMagnet() {
            ctx.save();
            ctx.translate(magnet.x, magnet.y);
            const w = CONFIG.magnetW;
            const h = CONFIG.magnetH;

            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(-w/2 + 10, -h/2 + 10, w, h);

            // N/S Poles
            // Polarity 1: S | N
            // Polarity -1: N | S
            const leftColor = polarity === 1 ? '#3b82f6' : '#ef4444';
            const rightColor = polarity === 1 ? '#ef4444' : '#3b82f6';
            const leftText = polarity === 1 ? 'S' : 'N';
            const rightText = polarity === 1 ? 'N' : 'S';

            // Left
            ctx.fillStyle = leftColor;
            ctx.fillRect(-w/2, -h/2, w/2, h);
            ctx.fillStyle = 'white';
            ctx.font = 'bold 24px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(leftText, -w/4, 0);

            // Right
            ctx.fillStyle = rightColor;
            ctx.fillRect(0, -h/2, w/2, h);
            ctx.fillStyle = 'white';
            ctx.fillText(rightText, w/4, 0);

            // Border
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.strokeRect(-w/2, -h/2, w, h);

            ctx.restore();
        }

        function drawCoil(cx, cy, isFront) {
            const r = CONFIG.coilRadius;
            const spacing = 25;
            const totalW = (loops - 1) * spacing;
            const startX = cx - totalW / 2;

            ctx.lineWidth = 8;
            ctx.lineCap = 'round';

            for (let i = 0; i < loops; i++) {
                const x = startX + i * spacing;
                
                // Copper Gradient
                const grad = ctx.createLinearGradient(x-r, cy-r, x+r, cy+r);
                grad.addColorStop(0, '#78350f');
                grad.addColorStop(0.4, '#fbbf24');
                grad.addColorStop(1, '#b45309');
                ctx.strokeStyle = grad;

                ctx.beginPath();
                if(isFront) {
                    // Front Arc
                    ctx.ellipse(x, cy, 20, r, 0, 0, Math.PI);
                } else {
                    // Back Arc (Darker)
                    ctx.strokeStyle = '#7c2d12'; // Darker for back
                    ctx.ellipse(x, cy, 20, r, 0, Math.PI, 2 * Math.PI);
                }
                ctx.stroke();
            }
        }

        function drawFieldLines() {
            ctx.save();
            ctx.translate(magnet.x, magnet.y);
            ctx.globalAlpha = 0.15;
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            const w = CONFIG.magnetW;

            // Simple Bezier curves simulating B-Field
            // Flip direction based on polarity
            const dir = polarity; 

            for(let i=1; i<=3; i++) {
                const scale = i * 80;
                ctx.beginPath();
                ctx.moveTo(dir * w/2, -10);
                ctx.bezierCurveTo(dir*(w/2+scale), -scale, -dir*(w/2+scale), -scale, -dir*w/2, -10);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(dir * w/2, 10);
                ctx.bezierCurveTo(dir*(w/2+scale), scale, -dir*(w/2+scale), scale, -dir*w/2, 10);
                ctx.stroke();
            }
            ctx.restore();
        }
