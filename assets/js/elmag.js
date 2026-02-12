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
        const canvas = document.getElementById('simCanvas');
        const ctx = canvas.getContext('2d');
        const monitorEl = document.getElementById('data-monitor');
        
        // Physics Constants
        const PIXEL_SCALE = 100; // 100px = 0.1 meter (10cm)
        const K_CONST = 9e9; // Coulomb Constant
        const GRID_SIZE = 40;

        // State
        let charges = []; 
        let isDragging = false;
        let selectedIdx = -1; // Index muatan yang sedang diklik/drag
        let nextId = 1;

        // --- INIT & RESIZE ---
        function resize() {
            canvas.width = canvas.parentElement.offsetWidth;
            canvas.height = canvas.parentElement.offsetHeight;
            draw();
        }
        window.addEventListener('resize', resize);
        window.addEventListener('load', () => {
            resize();
            // Demo Scenario: Dipole
            charges.push({id: nextId++, x: canvas.width/2 - 150, y: canvas.height/2, q: 2.0});
            charges.push({id: nextId++, x: canvas.width/2 + 150, y: canvas.height/2, q: -2.0});
            draw();
        });

        // --- UI HANDLERS ---
        function updateSliderUI(val) {
            const num = parseFloat(val);
            const sign = num > 0 ? '+' : '';
            document.getElementById('charge-val-display').innerText = `${sign}${num.toFixed(1)} µC`;
            
            // Update spawn button color
            const btn = document.getElementById('btn-spawn');
            if(num > 0) btn.className = btn.className.replace(/bg-\w+-600/, 'bg-red-600').replace(/hover:bg-\w+-500/, 'hover:bg-red-500').replace(/shadow-\w+-500/, 'shadow-red-500');
            else if(num < 0) btn.className = btn.className.replace(/bg-\w+-600/, 'bg-blue-600').replace(/hover:bg-\w+-500/, 'hover:bg-blue-500').replace(/shadow-\w+-500/, 'shadow-blue-500');
            else btn.className = btn.className.replace(/bg-\w+-600/, 'bg-slate-600').replace(/hover:bg-\w+-500/, 'hover:bg-slate-500').replace(/shadow-\w+-500/, 'shadow-slate-500');
        }

        function spawnCharge() {
            const qVal = parseFloat(document.getElementById('charge-slider').value);
            if(qVal === 0) return;

            charges.push({
                id: nextId++,
                x: canvas.width / 2 + (Math.random() - 0.5) * 50,
                y: canvas.height / 2 + (Math.random() - 0.5) * 50,
                q: qVal
            });
            draw();
        }

        function resetSim() {
            charges = [];
            selectedIdx = -1;
            monitorEl.classList.add('opacity-0', 'translate-y-4');
            draw();
        }

        // --- MOUSE INTERACTION ---
        canvas.addEventListener('mousedown', e => {
            const { x, y } = getMousePos(e);
            
            // Hit Test
            let hit = -1;
            for(let i=0; i<charges.length; i++) {
                const dist = Math.hypot(charges[i].x - x, charges[i].y - y);
                if(dist < 20) { hit = i; break; }
            }

            if(hit !== -1) {
                isDragging = true;
                selectedIdx = hit;
                updateMonitor();
                draw(); // Redraw to show selection highlight
            } else {
                selectedIdx = -1;
                monitorEl.classList.add('opacity-0', 'translate-y-4'); // Hide monitor
                draw();
            }
        });

        canvas.addEventListener('mousemove', e => {
            if(!isDragging || selectedIdx === -1) return;
            const { x, y } = getMousePos(e);
            charges[selectedIdx].x = x;
            charges[selectedIdx].y = y;
            updateMonitor();
            draw();
        });

        canvas.addEventListener('mouseup', () => {
            isDragging = false;
        });

        function getMousePos(evt) {
            const rect = canvas.getBoundingClientRect();
            return {
                x: evt.clientX - rect.left,
                y: evt.clientY - rect.top
            };
        }

        // --- PHYSICS & RENDER CORE ---
        
        function draw() {
            // 1. Background
            ctx.fillStyle = '#020617';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const showVectors = document.getElementById('show-vectors').checked;
            const showRuler = document.getElementById('show-ruler').checked;
            const showForces = document.getElementById('show-forces').checked;

            // 2. Draw Vector Field (Optimized Grid)
            if (showVectors && charges.length > 0) {
                ctx.beginPath();
                for (let x = 0; x < canvas.width; x += GRID_SIZE) {
                    for (let y = 0; y < canvas.height; y += GRID_SIZE) {
                        let Ex = 0, Ey = 0;
                        
                        for (let c of charges) {
                            const dx = x - c.x;
                            const dy = y - c.y;
                            const r2 = dx*dx + dy*dy;
                            const r = Math.sqrt(r2);
                            if(r < 15) continue; // Skip if too close

                            // E = k * q / r^2
                            const E = (c.q * 500) / r2; // Visual scaling only
                            Ex += E * (dx / r);
                            Ey += E * (dy / r);
                        }

                        const E_mag = Math.hypot(Ex, Ey);
                        if (E_mag > 0.1) {
                            const angle = Math.atan2(Ey, Ex);
                            const alpha = Math.min(1, E_mag);
                            const len = Math.min(20, E_mag * 15);
                            
                            ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.4})`;
                            drawArrow(x, y, angle, len);
                        }
                    }
                }
                ctx.stroke();
            }

            // 3. Draw Measurements (Ruler) & Forces
            // Only draw lines connected to the SELECTED charge to reduce clutter
            if (selectedIdx !== -1 && charges[selectedIdx]) {
                const c1 = charges[selectedIdx];
                let Fnet_x = 0;
                let Fnet_y = 0;

                for (let i = 0; i < charges.length; i++) {
                    if (i === selectedIdx) continue;
                    const c2 = charges[i];

                    const dx = c2.x - c1.x;
                    const dy = c2.y - c1.y;
                    const pixelDist = Math.hypot(dx, dy);
                    const realDistM = pixelDist * (0.1 / 100); // 100px = 0.1m

                    // A. Draw Ruler
                    if (showRuler) {
                        ctx.save();
                        ctx.beginPath();
                        ctx.setLineDash([5, 5]);
                        ctx.strokeStyle = '#10b981'; // Emerald
                        ctx.lineWidth = 1;
                        ctx.moveTo(c1.x, c1.y);
                        ctx.lineTo(c2.x, c2.y);
                        ctx.stroke();

                        // Distance Label (Midpoint)
                        const midX = (c1.x + c2.x) / 2;
                        const midY = (c1.y + c2.y) / 2;
                        ctx.fillStyle = '#10b981';
                        ctx.font = '10px monospace';
                        ctx.globalAlpha = 1;
                        // Show cm if < 1m, m if > 1m
                        const label = realDistM < 1 
                            ? `${(realDistM * 100).toFixed(1)} cm` 
                            : `${realDistM.toFixed(2)} m`;
                        
                        // Background for text for readability
                        ctx.fillStyle = 'rgba(2, 6, 23, 0.8)';
                        const metrics = ctx.measureText(label);
                        ctx.fillRect(midX - metrics.width/2 - 2, midY - 6, metrics.width + 4, 12);
                        
                        ctx.fillStyle = '#10b981';
                        ctx.fillText(label, midX - metrics.width/2, midY + 3);
                        ctx.restore();
                    }

                    // B. Calculate Force (Coulomb)
                    // F = k * q1 * q2 / r^2
                    // q in microCoulomb -> convert to Coulomb (1e-6)
                    const q1_C = c1.q * 1e-6;
                    const q2_C = c2.q * 1e-6;
                    const F = (K_CONST * Math.abs(q1_C * q2_C)) / (realDistM * realDistM);
                    
                    // Direction: Repel if same sign, Attract if diff
                    const isRepel = (c1.q * c2.q) > 0;
                    const angle = Math.atan2(dy, dx);
                    
                    // F vector components on c1
                    // If repel: Force is away from c2 (opposite angle)
                    // If attract: Force is towards c2 (same angle)
                    const forceAngle = isRepel ? angle + Math.PI : angle;
                    
                    Fnet_x += F * Math.cos(forceAngle);
                    Fnet_y += F * Math.sin(forceAngle);
                }

                // C. Draw Net Force Arrow on Selected Charge
                if (showForces) {
                    const Fnet_mag = Math.hypot(Fnet_x, Fnet_y);
                    if (Fnet_mag > 0.01) {
                        const F_angle = Math.atan2(Fnet_y, Fnet_x);
                        // Logarithmic scaling for visualization (Force varies wildly)
                        const visualLen = Math.min(100, Math.log10(Fnet_mag + 1) * 150); 
                        
                        ctx.save();
                        ctx.translate(c1.x, c1.y);
                        ctx.rotate(F_angle);
                        
                        // Thick Arrow
                        ctx.beginPath();
                        ctx.strokeStyle = 'white'; // Rose
                        ctx.fillStyle = 'white';
                        ctx.lineWidth = 3;
                        ctx.moveTo(0, 0);
                        ctx.lineTo(visualLen, 0);
                        ctx.stroke();
                        
                        // Arrow Head
                        ctx.beginPath();
                        ctx.moveTo(visualLen, 0);
                        ctx.lineTo(visualLen - 8, -4);
                        ctx.lineTo(visualLen - 8, 4);
                        ctx.fill();
                        
                        // Label
                        ctx.rotate(-F_angle); // Reset rotation for text
                        ctx.fillStyle = '#f43f5e';
                        ctx.font = 'bold 12px sans-serif';
                        ctx.fillText(`${Fnet_mag.toFixed(2)} N`, 15, -15);
                        
                        ctx.restore();
                    }
                }
            }

            // 4. Draw Charges
            for (let i = 0; i < charges.length; i++) {
                const c = charges[i];
                const isSel = (i === selectedIdx);
                
                // Color based on polarity
                const baseColor = c.q > 0 ? '#ef4444' : '#3b82f6'; // Red vs Blue
                const glowColor = c.q > 0 ? 'rgba(239, 68, 68, 0.6)' : 'rgba(59, 130, 246, 0.6)';

                // Selection Ring
                if (isSel) {
                    ctx.beginPath();
                    ctx.arc(c.x, c.y, 22, 0, Math.PI * 2);
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([3, 3]);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }

                ctx.beginPath();
                // Size slightly depends on magnitude
                const r = 12 + Math.min(20, Math.abs(c.q)); 
                ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
                ctx.fillStyle = baseColor;
                ctx.shadowColor = glowColor;
                ctx.shadowBlur = 15;
                ctx.fill();
                ctx.shadowBlur = 0;

                // Label
                ctx.fillStyle = 'white';
                ctx.font = 'bold 10px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const sign = c.q > 0 ? '+' : '';
                ctx.fillText(`${sign}${c.q}`, c.x, c.y);
            }
        }

        function drawArrow(x, y, angle, len) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(-len/2, 0);
            ctx.lineTo(len/2, 0);
            ctx.stroke();
            ctx.restore();
        }

        // --- DATA MONITOR LOGIC ---
        function updateMonitor() {
            if (selectedIdx === -1) return;
            
            monitorEl.classList.remove('opacity-0', 'translate-y-4');
            const c1 = charges[selectedIdx];
            
            // Header
            document.getElementById('mon-q').innerText = `${c1.q > 0 ? '+' : ''}${c1.q} µC`;
            const list = document.getElementById('mon-list');
            list.innerHTML = '';

            let Fnet_x = 0;
            let Fnet_y = 0;

            // List interactions
            charges.forEach((c2, i) => {
                if(i === selectedIdx) return;
                
                const dx = c2.x - c1.x;
                const dy = c2.y - c1.y;
                const distM = Math.hypot(dx, dy) * (0.1 / 100);
                
                const q1 = c1.q * 1e-6;
                const q2 = c2.q * 1e-6;
                const F = (K_CONST * Math.abs(q1 * q2)) / (distM * distM);
                
                // Add to Net Force
                const angle = Math.atan2(dy, dx);
                const isRepel = (c1.q * c2.q) > 0;
                const forceAngle = isRepel ? angle + Math.PI : angle;
                Fnet_x += F * Math.cos(forceAngle);
                Fnet_y += F * Math.sin(forceAngle);

                // Add list item
                const li = document.createElement('li');
                li.className = "flex justify-between border-b border-slate-800 pb-1";
                li.innerHTML = `
                    <span>vs Charge ${i+1} (${c2.q}µC):</span>
                    <span class="text-emerald-400">${F.toFixed(2)} N</span>
                `;
                list.appendChild(li);
            });

            // Update Net Force
            const Fnet = Math.hypot(Fnet_x, Fnet_y);
            document.getElementById('mon-f').innerText = `${Fnet.toFixed(2)} N`;
        }