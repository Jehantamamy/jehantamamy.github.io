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
// --- CANVAS SETUP ---
        const simCanvas = document.getElementById('sim-canvas');
        const scopeCanvas = document.getElementById('scope-canvas');
        const simCtx = simCanvas.getContext('2d');
        const scopeCtx = scopeCanvas.getContext('2d');

        // --- DOM ---
        const sliderNp = document.getElementById('slider-np');
        const sliderNs = document.getElementById('slider-ns');
        const sliderVp = document.getElementById('slider-vp');
        
        const dispNp = document.getElementById('disp-np');
        const dispNs = document.getElementById('disp-ns');
        const dispVp = document.getElementById('disp-vp');
        
        const valVpDisp = document.getElementById('val-vp-disp');
        const valVsDisp = document.getElementById('val-vs-disp');
        const ratioDisp = document.getElementById('ratio-disp');
        const typeDisp = document.getElementById('type-disp');
        
        const bulbIcon = document.getElementById('bulb-icon');
        const bulbText = document.getElementById('bulb-text');

        // --- STATE ---
        let params = { np: 200, ns: 100, vp: 220, vs: 110 };
        let time = 0;
        let traceP = [];
        let traceS = [];
        const MAX_TRACE = 400;

        // --- INIT ---
        function resize() {
            simCanvas.width = simCanvas.parentElement.offsetWidth;
            simCanvas.height = simCanvas.parentElement.offsetHeight;
            scopeCanvas.width = scopeCanvas.parentElement.offsetWidth;
            scopeCanvas.height = scopeCanvas.parentElement.offsetHeight;
        }
        window.addEventListener('resize', resize);
        window.addEventListener('load', () => { resize(); loop(); });

        // --- MAIN LOOP ---
        function loop() {
            updatePhysics();
            drawTransformer();
            drawScope();
            time += 0.1;
            requestAnimationFrame(loop);
        }

        // --- PHYSICS ---
        function updatePhysics() {
            params.np = parseInt(sliderNp.value);
            params.ns = parseInt(sliderNs.value);
            params.vp = parseInt(sliderVp.value);
            
            // Formula: Vs = Vp * (Ns / Np)
            params.vs = params.vp * (params.ns / params.np);

            // UI Updates
            dispNp.innerText = params.np;
            dispNs.innerText = params.ns;
            dispVp.innerText = `${params.vp} V`;
            
            valVpDisp.innerText = `${params.vp}V`;
            valVsDisp.innerText = `${params.vs.toFixed(0)}V`;
            
            const ratio = (params.np / params.ns).toFixed(1);
            ratioDisp.innerText = `${ratio} : 1`;

            if(params.ns > params.np) {
                typeDisp.innerText = "STEP-UP";
                typeDisp.className = "text-xs font-bold bg-emerald-900 text-emerald-300 px-2 py-1 rounded";
            } else if (params.ns < params.np) {
                typeDisp.innerText = "STEP-DOWN";
                typeDisp.className = "text-xs font-bold bg-rose-900 text-rose-300 px-2 py-1 rounded";
            } else {
                typeDisp.innerText = "ISOLATION";
                typeDisp.className = "text-xs font-bold bg-slate-800 text-slate-300 px-2 py-1 rounded";
            }

            // Bulb Logic (Nominal 220V)
            // Brightness max at 220V, dim below, warning above
            let brightness = Math.min(1.5, params.vs / 220); 
            let bulbColor = `rgba(253, 224, 71, ${Math.min(1, brightness)})`;
            
            if(params.vs > 250) {
                bulbText.innerText = "OVERLOAD!";
                bulbText.className = "text-xs font-bold text-red-500 animate-pulse";
            } else if (params.vs > 50) {
                bulbText.innerText = "Normal";
                bulbText.className = "text-xs text-white";
            } else {
                bulbText.innerText = "Dim";
                bulbText.className = "text-xs text-slate-500";
            }
            
            bulbIcon.style.backgroundColor = brightness > 0.1 ? '#fef08a' : '#334155';
            bulbIcon.style.boxShadow = `0 0 ${brightness * 30}px ${brightness * 10}px ${bulbColor}`;
        }

        // --- DRAW TRANSFORMER ---
        function drawTransformer() {
            const ctx = simCtx;
            const w = simCanvas.width;
            const h = simCanvas.height;
            const cx = w/2;
            const cy = h/2;

            ctx.clearRect(0, 0, w, h);

            // 1. Draw Core (Iron)
            const coreW = 180;
            const coreH = 140;
            const thickness = 40;
            
            ctx.fillStyle = '#475569'; // Slate-600
            ctx.fillRect(cx - coreW/2, cy - coreH/2, coreW, coreH);
            ctx.fillStyle = '#0f172a'; // Hollow center
            ctx.fillRect(cx - coreW/2 + thickness, cy - coreH/2 + thickness, coreW - 2*thickness, coreH - 2*thickness);

            // 2. Flux Animation (Inside Core)
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)'; // Amber
            ctx.setLineDash([5, 5]);
            ctx.lineWidth = 2;
            ctx.lineDashOffset = -time * 2; // Animate flow
            
            // Draw flux path loop
            ctx.beginPath();
            const fluxInset = thickness / 2;
            ctx.rect(cx - coreW/2 + fluxInset, cy - coreH/2 + fluxInset, coreW - 2*fluxInset, coreH - 2*fluxInset);
            ctx.stroke();
            ctx.setLineDash([]);

            // 3. Coils
            // Primary (Left)
            drawCoil(ctx, cx - coreW/2, cy, params.np, '#3b82f6', true);
            // Secondary (Right)
            drawCoil(ctx, cx + coreW/2 - thickness, cy, params.ns, '#ef4444', false);
        }

        function drawCoil(ctx, x, cy, turns, color, isLeft) {
            const coilH = 100;
            const coilW = 50; // Visual width wrapping around core leg
            
            // Visual number of turns (scaled down)
            const visualTurns = Math.min(20, Math.max(5, Math.floor(turns / 20)));
            const spacing = coilH / visualTurns;
            const startY = cy - coilH / 2;

            ctx.lineWidth = 4;
            ctx.strokeStyle = color;

            for(let i=0; i<visualTurns; i++) {
                const y = startY + i * spacing;
                
                // Front part of winding
                ctx.beginPath();
                // Simple ellipse loop illusion
                ctx.moveTo(x, y);
                if(isLeft) {
                    // Wrap around left leg
                    ctx.bezierCurveTo(x-30, y, x-30, y+10, x, y+10);
                    // Back part (darker) - drawn first? for simple 2D we just draw distinct arcs
                } else {
                    // Wrap around right leg
                    ctx.bezierCurveTo(x+70, y, x+70, y+10, x+40, y+10); 
                }
                ctx.stroke();
            }
            
            // Terminals
            ctx.lineWidth = 2;
            ctx.beginPath();
            if(isLeft) {
                ctx.moveTo(x-15, startY); ctx.lineTo(x-60, startY); // Top wire
                ctx.moveTo(x-15, startY + coilH); ctx.lineTo(x-60, startY + coilH); // Bottom wire
            } else {
                ctx.moveTo(x+55, startY); ctx.lineTo(x+100, startY);
                ctx.moveTo(x+55, startY + coilH); ctx.lineTo(x+100, startY + coilH);
            }
            ctx.stroke();
        }

        // --- DRAW SCOPE ---
        function drawScope() {
            const ctx = scopeCtx;
            const w = scopeCanvas.width;
            const h = scopeCanvas.height;
            const cy = h/2;

            // Generate Waveforms
            // Primary (Blue) - Amplitude fixed based on slider VP
            // Secondary (Red) - Amplitude based on calculated VS
            
            const scale = 0.3; // Scaling factor for canvas height
            const vpY = Math.sin(time) * params.vp * scale;
            const vsY = Math.sin(time) * params.vs * scale; // In-phase for ideal

            traceP.push(vpY);
            traceS.push(vsY);
            if(traceP.length > w) { traceP.shift(); traceS.shift(); }

            ctx.clearRect(0, 0, w, h);

            // Draw Primary
            ctx.beginPath();
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            for(let i=0; i<traceP.length; i++) ctx.lineTo(i, cy - traceP[i]);
            ctx.stroke();

            // Draw Secondary
            ctx.beginPath();
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            for(let i=0; i<traceS.length; i++) ctx.lineTo(i, cy - traceS[i]);
            ctx.stroke();
        }
