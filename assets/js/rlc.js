        // --- CANVAS SETUP ---
        const scopeCanvas = document.getElementById('scopeCanvas');
        const phasorCanvas = document.getElementById('phasorCanvas');
        const scopeCtx = scopeCanvas.getContext('2d');
        const phasorCtx = phasorCanvas.getContext('2d');

        // --- DOM ELEMENTS ---
        const circuitSelector = document.getElementById('circuit-selector');
        const circuitSvgPlaceholder = document.getElementById('circuit-svg-placeholder');
        const parallelNote = document.getElementById('parallel-note');
        const btnResonance = document.getElementById('btn-resonance');

        const sliderF = document.getElementById('slider-f');
        const sliderL = document.getElementById('slider-l');
        const sliderC = document.getElementById('slider-c');
        const sliderR = document.getElementById('slider-r');
        
        const containerL = document.getElementById('container-l');
        const containerC = document.getElementById('container-c');

        const dispF = document.getElementById('disp-f');
        const dispL = document.getElementById('disp-l');
        const dispC = document.getElementById('disp-c');
        const dispR = document.getElementById('disp-r');
        
        const valXL = document.getElementById('val-xl');
        const valXC = document.getElementById('val-xc');
        const valZ = document.getElementById('val-z');
        const valPhase = document.getElementById('val-phase');
        const valI = document.getElementById('val-i');
        const barI = document.getElementById('bar-i');
        const resBulb = document.getElementById('res-bulb');
        const resText = document.getElementById('res-text');

        // --- STATE ---
        let activeCircuit = 'series-rlc';
        let params = { f: 50, L: 0.1, C: 0.00005, R: 50 };
        let t = 0;
        let traceV = [];
        let traceI = [];
        const MAX_TRACE = 300;

        // --- SVG DIAGRAMS (Inline for simplicity) ---
        const SVGs = {
            'series-rlc': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" class="w-full h-auto" stroke="currentColor" fill="none" stroke-width="2"><text x="10" y="20" fill="#94a3b8" font-size="10">SERIES RLC</text><path d="M20,50 H40" stroke="#34d399"/><circle cx="30" cy="50" r="8" stroke="#34d399"/><text x="24" y="53" fill="#34d399" font-size="10" font-weight="bold">~</text><path d="M40,50 l5,-5 l10,10 l10,-10 l10,10 l10,-10 l5,5 H100" stroke="#cbd5e1"/><text x="65" y="35" fill="#cbd5e1" font-size="10">R</text><path d="M100,50 q5,-10 10,0 t10,0 t10,0 t10,0 H150" stroke="#3b82f6"/><text x="120" y="35" fill="#3b82f6" font-size="10">L</text><path d="M150,50 H160 M160,40 V60 M170,40 V60 M170,50 H180" stroke="#ef4444"/><text x="162" y="35" fill="#ef4444" font-size="10">C</text><path d="M180,50 H190 V80 H10 V50 H20" stroke="#64748b"/></svg>`,
            'parallel-rlc': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" class="w-full h-auto" stroke="currentColor" fill="none" stroke-width="2"><text x="10" y="20" fill="#94a3b8" font-size="10">PARALLEL RLC</text><path d="M20,50 H40" stroke="#34d399"/><circle cx="30" cy="50" r="8" stroke="#34d399"/><text x="24" y="53" fill="#34d399" font-size="10" font-weight="bold">~</text><path d="M40,50 H60 V30 H160 V50 H180" stroke="#64748b"/><path d="M60,50 V70 H160 V50" stroke="#64748b"/><path d="M180,50 H190 V90 H10 V50 H20" stroke="#64748b"/><path d="M80,30 V35 l-5,5 l10,10 l-10,10 l10,10 l-5,5 V70" stroke="#cbd5e1"/><text x="75" y="25" fill="#cbd5e1" font-size="10">R</text><path d="M110,30 V35 q-10,5 0,10 t0,10 t0,10 t0,5 V70" stroke="#3b82f6"/><text x="105" y="25" fill="#3b82f6" font-size="10">L</text><path d="M140,30 V45 M130,45 H150 M130,55 H150 M140,55 V70" stroke="#ef4444"/><text x="135" y="25" fill="#ef4444" font-size="10">C</text></svg>`,
            'series-rc': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" class="w-full h-auto" stroke="currentColor" fill="none" stroke-width="2"><text x="10" y="20" fill="#94a3b8" font-size="10">SERIES RC</text><path d="M20,50 H40" stroke="#34d399"/><circle cx="30" cy="50" r="8" stroke="#34d399"/><text x="24" y="53" fill="#34d399" font-size="10" font-weight="bold">~</text><path d="M40,50 l5,-5 l10,10 l10,-10 l10,10 l10,-10 l5,5 H100" stroke="#cbd5e1"/><text x="65" y="35" fill="#cbd5e1" font-size="10">R</text><path d="M100,50 H120 M120,40 V60 M130,40 V60 M130,50 H150" stroke="#ef4444"/><text x="122" y="35" fill="#ef4444" font-size="10">C</text><path d="M150,50 H170 V80 H10 V50 H20" stroke="#64748b"/></svg>`,
            'series-rl': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" class="w-full h-auto" stroke="currentColor" fill="none" stroke-width="2"><text x="10" y="20" fill="#94a3b8" font-size="10">SERIES RL</text><path d="M20,50 H40" stroke="#34d399"/><circle cx="30" cy="50" r="8" stroke="#34d399"/><text x="24" y="53" fill="#34d399" font-size="10" font-weight="bold">~</text><path d="M40,50 l5,-5 l10,10 l10,-10 l10,10 l10,-10 l5,5 H100" stroke="#cbd5e1"/><text x="65" y="35" fill="#cbd5e1" font-size="10">R</text><path d="M100,50 q5,-10 10,0 t10,0 t10,0 t10,0 H150" stroke="#3b82f6"/><text x="120" y="35" fill="#3b82f6" font-size="10">L</text><path d="M150,50 H170 V80 H10 V50 H20" stroke="#64748b"/></svg>`
        };

        // --- INIT & HANDLERS ---
        function resize() {
            scopeCanvas.width = scopeCanvas.parentElement.offsetWidth;
            scopeCanvas.height = scopeCanvas.parentElement.offsetHeight;
            phasorCanvas.width = phasorCanvas.parentElement.offsetWidth;
            phasorCanvas.height = phasorCanvas.parentElement.offsetHeight;
        }
        window.addEventListener('resize', resize);
        window.addEventListener('load', () => { resize(); updateCircuitUI(); loop(); });

        circuitSelector.addEventListener('change', (e) => {
            activeCircuit = e.target.value;
            updateCircuitUI();
            traceV = []; traceI = []; // Clear scope trace on change
        });

        function updateCircuitUI() {
            // 1. Update SVG
            circuitSvgPlaceholder.innerHTML = SVGs[activeCircuit];

            // 2. Enable/Disable Sliders based on circuit
            sliderL.disabled = activeCircuit === 'series-rc';
            sliderC.disabled = activeCircuit === 'series-rl';
            
            containerL.style.opacity = sliderL.disabled ? 0.4 : 1;
            containerC.style.opacity = sliderC.disabled ? 0.4 : 1;

            // 3. Resonance Button & Note visibility
            const hasResonance = activeCircuit.includes('rlc');
            btnResonance.style.display = hasResonance ? 'block' : 'none';
            parallelNote.style.display = activeCircuit === 'parallel-rlc' ? 'block' : 'none';
        }


        // --- MAIN LOOP ---
        function loop() {
            updateParams();
            const calc = calculateCircuitEngine();
            updateUI(calc);
            drawScope(calc);
            drawPhasor(calc);
            t += 0.06;
            requestAnimationFrame(loop);
        }

        // --- PHYSICS ENGINE (MULTI-CIRCUIT) ---
        function updateParams() {
            params.f = parseFloat(sliderF.value);
            params.L = parseFloat(sliderL.value) / 1000;
            params.C = parseFloat(sliderC.value) / 1000000;
            params.R = parseFloat(sliderR.value);
            dispF.innerText = `${params.f} Hz`;
            dispL.innerText = `${(params.L*1000).toFixed(0)} mH`;
            dispC.innerText = `${(params.C*1000000).toFixed(0)} µF`;
            dispR.innerText = `${params.R} Ω`;
        }

        function calculateCircuitEngine() {
            const omega = 2 * Math.PI * params.f;
            const XL = activeCircuit === 'series-rc' ? 0 : omega * params.L;
            const XC = activeCircuit === 'series-rl' ? 0 : 1 / (omega * params.C);
            let Z, phase, I_rms;
            const V_rms = 100; // Fixed source voltage

            switch(activeCircuit) {
                case 'series-rlc':
                    Z = Math.sqrt(Math.pow(params.R, 2) + Math.pow(XL - XC, 2));
                    phase = Math.atan2((XL - XC), params.R); // V leads I if XL>XC
                    break;
                case 'series-rc':
                    Z = Math.sqrt(Math.pow(params.R, 2) + Math.pow(XC, 2));
                    phase = Math.atan2(-XC, params.R); // I leads V (negative phase for V ref)
                    break;
                case 'series-rl':
                    Z = Math.sqrt(Math.pow(params.R, 2) + Math.pow(XL, 2));
                    phase = Math.atan2(XL, params.R); // V leads I
                    break;
                case 'parallel-rlc':
                    // Admittance Y = sqrt(G^2 + (Bc - Bl)^2)
                    // Bc = 1/Xc, Bl = 1/Xl, G = 1/R
                    // Current reference: Ic leads V, Il lags V.
                    // Tan(phi) for current = (Ic - Il) / Ir
                    const Ir = V_rms / params.R;
                    const Il = V_rms / XL;
                    const Ic = V_rms / XC;
                    // Total current I_tot = sqrt(Ir^2 + (Ic-Il)^2)
                    I_rms = Math.sqrt(Math.pow(Ir, 2) + Math.pow(Ic - Il, 2));
                    Z = V_rms / I_rms; // Equivalent Z
                    // Phase of total current relative to Voltage
                    // If Ic > Il (Capacitive), Current leads Voltage -> negative phase relative to V ref.
                     phase = Math.atan2(-(Ic - Il), Ir); 
                    break;
            }

            if (activeCircuit !== 'parallel-rlc') {
                I_rms = V_rms / Z;
            }

            // Scale for visualization
            const I_peak_visual = I_rms * (activeCircuit === 'parallel-rlc' ? 20 : 100); 

            return { XL, XC, Z, phase, I_peak_visual, I_rms };
        }

        // --- DRAWING ---
        function drawScope(calc) {
            const w = scopeCanvas.width;
            const h = scopeCanvas.height;
            const centerY = h / 2;
            const vVal = Math.sin(t) * (h * 0.3); 
            const iVal = Math.sin(t - calc.phase) * (calc.I_peak_visual * 0.8);

            traceV.push(vVal);
            traceI.push(iVal);
            if(traceV.length > w) { traceV.shift(); traceI.shift(); }

            scopeCtx.clearRect(0, 0, w, h);
            drawTrace(scopeCtx, traceV, '#34d399', centerY);
            drawTrace(scopeCtx, traceI, '#facc15', centerY);
        }
        
        function drawTrace(ctx, data, color, cy) {
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            for(let i=0; i<data.length; i++) ctx.lineTo(i, cy - data[i]);
            ctx.stroke();
        }

        function drawPhasor(calc) {
            const ctx = phasorCtx;
            const w = phasorCanvas.width, h = phasorCanvas.height;
            const cx = w/2, cy = h/2;
            const radius = 35;
            ctx.clearRect(0, 0, w, h);
            ctx.strokeStyle = '#475569'; ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();

            const angleT = -t;
            drawVector(ctx, cx, cy, radius, angleT, '#34d399'); // V (Ref)
            // Scale I vector length visually based on I_rms, clamp it
            const iLen = Math.min(radius * 1.5, calc.I_rms * (activeCircuit === 'parallel-rlc' ? 5 : 25));
            drawVector(ctx, cx, cy, iLen, angleT - calc.phase, '#facc15'); // I
        }

        function drawVector(ctx, x, y, len, angle, color) {
            ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
            ctx.beginPath(); ctx.moveTo(len, 0); ctx.lineTo(len-4, -3); ctx.lineTo(len-4, 3); ctx.fillStyle = color; ctx.fill();
            ctx.restore();
        }

        function updateUI(calc) {
            valXL.innerText = activeCircuit.includes('rc') ? '-' : `${calc.XL.toFixed(0)}Ω`;
            valXC.innerText = activeCircuit.includes('rl') && !activeCircuit.includes('rlc') ? '-' : `${calc.XC.toFixed(0)}Ω`;
            valZ.innerText = isFinite(calc.Z) ? `${calc.Z.toFixed(0)}Ω` : '∞';
            
            const deg = (calc.phase * 180 / Math.PI).toFixed(1);
            valPhase.innerText = `${deg}°`;

            valI.innerText = `${calc.I_rms.toFixed(2)} A`;
            // Scale bar differently for parallel vs series
            const maxIScale = activeCircuit === 'parallel-rlc' ? 10 : 3;
            const pct = (calc.I_rms / maxIScale) * 100;
            barI.style.width = `${Math.min(100, pct)}%`;

            // Resonance Check
            let isResonant = false;
            if(activeCircuit.includes('rlc')) {
                const ratio = calc.XL / calc.XC;
                isResonant = ratio > 0.95 && ratio < 1.05;
            }
            
            if(isResonant) {
                resBulb.className = "w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] transition-all duration-300";
                resText.innerText = activeCircuit === 'parallel-rlc' ? "RESONANCE (MIN I)" : "RESONANCE (MAX I)";
                resText.className = "text-xs font-bold text-emerald-400 animate-pulse";
            } else {
                resBulb.className = "w-4 h-4 rounded-full bg-slate-600 transition-all duration-300";
                resText.innerText = "OFF";
                resText.className = "text-xs font-bold text-slate-500";
            }
        }

        function setResonance() {
            if(!activeCircuit.includes('rlc')) return;
            const f_res = 1 / (2 * Math.PI * Math.sqrt(params.L * params.C));
            sliderF.value = Math.min(200, Math.max(10, f_res));
        }
