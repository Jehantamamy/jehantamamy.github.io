// --- SETUP ---
        const canvas = document.getElementById('sim-canvas');
        const ctx = canvas.getContext('2d');
        
        // UI Elements
        const deviceSelector = document.getElementById('device-selector');
        const coreSelector = document.getElementById('core-selector');
        const sliderI = document.getElementById('slider-i');
        const sliderN = document.getElementById('slider-n');
        const sliderGeom = document.getElementById('slider-geom');
        
        const dispI = document.getElementById('disp-i');
        const dispN = document.getElementById('disp-n');
        const dispGeom = document.getElementById('disp-geom');
        const labelGeom = document.getElementById('label-geom');
        const valB = document.getElementById('val-b');
        const barB = document.getElementById('bar-b');
        const densityVal = document.getElementById('density-val');
        const densityBar = document.getElementById('density-bar');
        const coreWarning = document.getElementById('core-warning');
        
        const modeDisplay = document.getElementById('mode-display');
        const theorySolenoid = document.getElementById('theory-solenoid');
        const theoryToroid = document.getElementById('theory-toroid');
        const formulaN = document.getElementById('formula-n');

        // Physics Constants
        const MU_0 = 4 * Math.PI * 1e-7;

        // State
        let mode = 'solenoid';
        let params = {
            I: 2.0,
            N: 50,
            dim: 0.2, // L or R
            mu_r: 1
        };
        let B_field = 0; // Tesla
        let time = 0;

        // --- INIT ---
        function resize() {
            canvas.width = canvas.parentElement.offsetWidth;
            canvas.height = canvas.parentElement.offsetHeight;
        }
        window.addEventListener('resize', resize);
        window.addEventListener('load', () => { resize(); updateUI(); loop(); });

        // --- EVENT LISTENERS ---
        deviceSelector.addEventListener('change', (e) => {
            mode = e.target.value;
            // Update Labels
            if(mode === 'solenoid') {
                labelGeom.innerText = "Length (L)";
                modeDisplay.innerText = "Solenoid";
                theorySolenoid.style.display = 'block';
                theoryToroid.style.display = 'none';
                formulaN.innerText = "n = N / L";
            } else {
                labelGeom.innerText = "Mean Radius (R)";
                modeDisplay.innerText = "Toroid";
                theorySolenoid.style.display = 'none';
                theoryToroid.style.display = 'block';
                formulaN.innerText = "n = N / (2πR)";
            }
            updateUI();
        });

        coreSelector.addEventListener('change', updateUI);
        sliderI.addEventListener('input', updateUI);
        sliderN.addEventListener('input', updateUI);
        sliderGeom.addEventListener('input', updateUI);

        function updateUI() {
            // Get Values
            params.I = parseFloat(sliderI.value);
            params.N = parseInt(sliderN.value);
            params.dim = parseFloat(sliderGeom.value);
            params.mu_r = parseInt(coreSelector.value);

            // Update Displays
            dispI.innerText = `${params.I.toFixed(1)} A`;
            dispN.innerText = params.N;
            dispGeom.innerText = `${params.dim.toFixed(2)} m`;
            
            // Core Warning
            coreWarning.style.display = params.mu_r > 10 ? 'block' : 'none';
            modeDisplay.innerText = `${mode.charAt(0).toUpperCase() + mode.slice(1)} (${coreSelector.options[coreSelector.selectedIndex].text.split('(')[0].trim()})`;

            // Calculate Physics
            if (mode === 'solenoid') {
                // B = mu * (N/L) * I
                B_field = (MU_0 * params.mu_r * params.N * params.I) / params.dim;
            } else {
                // B = mu * (N / 2*pi*R) * I
                B_field = (MU_0 * params.mu_r * params.N * params.I) / (2 * Math.PI * params.dim);
            }

            // Update Meter
            // Display in mT (milli Tesla)
            const B_mT = B_field * 1000;
            valB.innerText = B_mT.toFixed(2);
            
            // Bar visualization (Logarithmic scale because Iron core is huge)
            // Max typical for this sim ~ 2 Tesla (2000 mT)
            // Let's use a log scale so air core is visible too
            const logScale = Math.log10(B_mT + 1); // +1 to avoid log(0)
            const maxLog = Math.log10(2000); // approx max value
            const pct = (logScale / maxLog) * 100;
            
            barB.style.width = `${Math.min(100, Math.max(1, pct))}%`;
            
            // Density Bar
            densityBar.style.width = `${Math.min(100, pct)}%`;
            if(pct < 30) densityVal.innerText = "Weak";
            else if(pct < 70) densityVal.innerText = "Moderate";
            else densityVal.innerText = "Strong (Saturated)";
        }

        // --- ANIMATION LOOP ---
        function loop() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            if (mode === 'solenoid') drawSolenoid();
            else drawToroid();

            time += 0.05 * (params.I / 5); // Speed of flow depends on Current
            requestAnimationFrame(loop);
        }

        // --- DRAW SOLENOID ---
        function drawSolenoid() {
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            // Visual scaling: L relates to width on screen
            // dim 0.05m -> 100px, 0.5m -> 300px
            const visualL = 100 + (params.dim / 0.5) * 200;
            const radius = 60; // Fixed visual radius

            // 1. Draw Core
            ctx.fillStyle = params.mu_r > 10 ? '#94a3b8' : '#1e293b'; // Gray for Iron, Dark for Air
            ctx.fillRect(cx - visualL/2, cy - radius + 5, visualL, radius * 2 - 10);
            
            // Core Label
            if(params.mu_r > 10) {
                ctx.fillStyle = '#1e293b';
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText("IRON CORE", cx, cy);
            }

            // 2. Draw B-Field Lines (Inside)
            // Opacity depends on B strength
            const opacity = Math.min(1, B_field * 100); // 10mT is fully visible
            ctx.strokeStyle = `rgba(251, 191, 36, ${opacity})`; // Amber
            ctx.lineWidth = 2;
            
            // Draw flowing arrows inside
            const lines = 5;
            for(let i=0; i<lines; i++) {
                const yOff = (i - (lines-1)/2) * (radius * 0.5);
                ctx.beginPath();
                ctx.moveTo(cx - visualL/2 - 50, cy + yOff);
                ctx.lineTo(cx + visualL/2 + 50, cy + yOff);
                ctx.stroke();

                // Moving flow dots
                const offset = (time * 5 + i * 20) % (visualL + 100);
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath();
                ctx.arc(cx - visualL/2 - 50 + offset, cy + yOff, 2, 0, Math.PI*2);
                ctx.fill();
            }

            // 3. Draw Windings (Front and Back)
            // We only draw N visual loops, capped at 20 for performance/clarity
            const visualN = Math.min(30, Math.max(5, Math.floor(params.N / 5)));
            const spacing = visualL / visualN;
            const startX = cx - visualL / 2;

            ctx.lineWidth = 4;
            
            for (let i = 0; i < visualN; i++) {
                const x = startX + i * spacing + spacing/2;
                
                // Back part of loop (Darker)
                ctx.beginPath();
                ctx.strokeStyle = '#78350f'; // Dark copper
                ctx.arc(x, cy, radius, Math.PI, 0); // Bottom half arc? No, simpler: line behind
                // Actually 3D coil illusion:
                // Draw vertical line back?
                // Let's do: Ellipse back half
                ctx.ellipse(x, cy, 10, radius, 0, Math.PI/2, 3*Math.PI/2);
                ctx.stroke();
            }

            // Redraw Core (Front Mask) - optional if we want coils *around* core
            // But simple: Back coil -> Core -> Front coil

            for (let i = 0; i < visualN; i++) {
                const x = startX + i * spacing + spacing/2;
                // Front part of loop (Bright)
                ctx.beginPath();
                ctx.strokeStyle = '#f59e0b'; // Bright copper
                ctx.ellipse(x, cy, 10, radius, 0, -Math.PI/2, Math.PI/2);
                ctx.stroke();
            }
        }

        // --- DRAW TOROID ---
        function drawToroid() {
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            
            // Visual R
            const R_visual = 80 + (params.dim / 0.5) * 50; 
            const tubeRadius = 30;

            // 1. Core Ring
            ctx.beginPath();
            ctx.arc(cx, cy, R_visual, 0, Math.PI*2);
            ctx.lineWidth = tubeRadius * 2;
            ctx.strokeStyle = params.mu_r > 10 ? '#64748b' : '#1e293b'; // Iron vs Air
            ctx.stroke();

            // 2. B-Field (Concentric circles inside)
            const opacity = Math.min(1, B_field * 100);
            ctx.strokeStyle = `rgba(251, 191, 36, ${opacity})`;
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            ctx.arc(cx, cy, R_visual, 0, Math.PI*2);
            ctx.stroke();

            // Moving dots along the circle
            const numDots = 8;
            for(let i=0; i<numDots; i++) {
                const angle = (time * 0.05 + (i * (Math.PI*2)/numDots)) % (Math.PI*2);
                const dx = cx + Math.cos(angle) * R_visual;
                const dy = cy + Math.sin(angle) * R_visual;
                
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath();
                ctx.arc(dx, dy, 3, 0, Math.PI*2);
                ctx.fill();
            }

            // 3. Windings
            const visualN = Math.min(40, params.N);
            const angleStep = (Math.PI * 2) / visualN;

            for(let i=0; i<visualN; i++) {
                const angle = i * angleStep;
                const x = cx + Math.cos(angle) * R_visual;
                const y = cy + Math.sin(angle) * R_visual;

                // Rotate coil ellipse to match tangent
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(angle);
                
                // Draw Coil Loop
                ctx.beginPath();
                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = 3;
                // Ellipse perpendicular to radius
                ctx.ellipse(0, 0, tubeRadius + 2, 8, 0, 0, Math.PI*2);
                ctx.stroke();
                
                ctx.restore();
            }
        }
