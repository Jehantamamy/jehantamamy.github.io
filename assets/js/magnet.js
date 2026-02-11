        const canvas = document.getElementById('simCanvas');
        const container = document.getElementById('sim-container'); // Referensi Container
        const ctx = canvas.getContext('2d');
        
        const CONFIG = {
            gridSize: 30,
            scale: 500,
            wireRadius: 18,
            forceScale: 200
        };

        let wires = [];
        let mouse = { x: -100, y: -100 };
        let isDragging = false;
        let selectedIdx = -1;
        let nextId = 1;

        // --- INIT & RESIZE ---
        function resize() {
            // PENTING: Resize mengikuti ukuran Container, bukan Window
            canvas.width = container.offsetWidth;
            canvas.height = container.offsetHeight;
            draw();
        }
        window.addEventListener('resize', resize);
        window.addEventListener('load', () => {
            resize();
            wires.push({id: nextId++, x: canvas.width/2 - 120, y: canvas.height/2, i: 5});
            wires.push({id: nextId++, x: canvas.width/2 + 120, y: canvas.height/2, i: 5});
            updateUI();
            draw();
        });

        // --- MOUSE LOGIC (Updated for Container) ---
        // Kita harus menghitung offset mouse relatif terhadap Canvas, bukan Window
        function getMousePos(evt) {
            const rect = canvas.getBoundingClientRect();
            return {
                x: evt.clientX - rect.left,
                y: evt.clientY - rect.top
            };
        }

        canvas.addEventListener('mousemove', e => {
            const pos = getMousePos(e);
            mouse.x = pos.x;
            mouse.y = pos.y;

            if (isDragging && selectedIdx !== -1) {
                wires[selectedIdx].x = mouse.x;
                wires[selectedIdx].y = mouse.y;
            }
            draw();
        });

        canvas.addEventListener('mousedown', e => {
            const pos = getMousePos(e);
            let hit = -1;
            for (let i = wires.length - 1; i >= 0; i--) {
                const dist = Math.hypot(wires[i].x - pos.x, wires[i].y - pos.y);
                if (dist < CONFIG.wireRadius * 1.5) {
                    hit = i;
                    break;
                }
            }

            if (hit !== -1) {
                isDragging = true;
                selectedIdx = hit;
                document.getElementById('current-slider').value = wires[hit].i;
                updateUI();
            } else {
                selectedIdx = -1;
            }
            draw();
        });

        canvas.addEventListener('mouseup', () => { isDragging = false; });
        
        canvas.addEventListener('dblclick', e => {
            const pos = getMousePos(e);
            for (let i = wires.length - 1; i >= 0; i--) {
                const dist = Math.hypot(wires[i].x - pos.x, wires[i].y - pos.y);
                if (dist < CONFIG.wireRadius * 1.5) {
                    wires.splice(i, 1);
                    selectedIdx = -1;
                    draw();
                    break;
                }
            }
        });

        // --- UI UPDATES ---
        function updateUI() {
            const val = parseInt(document.getElementById('current-slider').value);
            const labelEl = document.getElementById('current-display');
            
            if(val > 0) {
                labelEl.innerHTML = `+${val}.0 A <span class="text-amber-500">(OUT ⊙)</span>`;
                labelEl.className = "font-mono text-xs font-bold text-amber-400";
            } else if (val < 0) {
                labelEl.innerHTML = `${val}.0 A <span class="text-sky-400">(IN ⊗)</span>`;
                labelEl.className = "font-mono text-xs font-bold text-sky-400";
            } else {
                labelEl.innerHTML = `0.0 A <span class="text-slate-500">(OFF)</span>`;
                labelEl.className = "font-mono text-xs font-bold text-slate-500";
            }

            if (selectedIdx !== -1) {
                wires[selectedIdx].i = val;
                draw();
            }
        }

        function spawnWire() {
            const val = parseInt(document.getElementById('current-slider').value);
            wires.push({
                id: nextId++,
                x: canvas.width/2 + (Math.random()-0.5)*100,
                y: canvas.height/2 + (Math.random()-0.5)*100,
                i: val === 0 ? 5 : val
            });
            draw();
        }

        function resetSim() {
            wires = [];
            selectedIdx = -1;
            draw();
        }

        // --- PHYSICS & DRAWING ---
        function calculateB(x, y) {
            let Bx = 0, By = 0;
            for (let w of wires) {
                const dx = x - w.x;
                const dy = y - w.y;
                const r2 = dx*dx + dy*dy;
                const r = Math.sqrt(r2);
                if (r < CONFIG.wireRadius) continue;

                const mag = (w.i * CONFIG.scale) / r2;
                Bx += -dy * mag;
                By += dx * mag;
            }
            return { x: Bx, y: By };
        }

        function draw() {
            ctx.fillStyle = '#020617';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const viewMode = document.querySelector('input[name="viewMode"]:checked').value;
            const showForces = document.getElementById('show-forces').checked;
            const showCompass = document.getElementById('show-compass').checked;

            if (wires.length > 0) {
                if (viewMode === 'vectors') drawVectorGrid();
                else if (viewMode === 'iron') drawIronFilings();
                else if (viewMode === 'lines') drawStreamlines();
            }

            if (showForces) drawLorentzForces();
            
            for (let i = 0; i < wires.length; i++) {
                drawCopperWire(wires[i], i === selectedIdx);
            }

            if (showCompass) drawMouseCompass();
        }

        // --- DRAWING HELPERS (Sama seperti sebelumnya) ---
        function drawCopperWire(w, isSelected) {
            ctx.save();
            ctx.translate(w.x, w.y);
            
            // Glow
            if (isSelected) {
                ctx.beginPath();
                ctx.arc(0, 0, CONFIG.wireRadius + 6, 0, Math.PI * 2);
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.stroke();
            }

            // Copper Gradient
            const grad = ctx.createRadialGradient(-5, -5, 2, 0, 0, CONFIG.wireRadius);
            grad.addColorStop(0, '#fdba74');
            grad.addColorStop(0.5, '#b45309');
            grad.addColorStop(1, '#451a03');
            
            ctx.beginPath();
            ctx.arc(0, 0, CONFIG.wireRadius, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
            
            // Ring Color
            ctx.beginPath();
            ctx.arc(0, 0, CONFIG.wireRadius, 0, Math.PI * 2);
            ctx.strokeStyle = w.i > 0 ? '#fbbf24' : (w.i < 0 ? '#38bdf8' : '#64748b');
            ctx.lineWidth = 3;
            ctx.stroke();

            // Symbol
            ctx.fillStyle = 'white';
            if (w.i > 0) {
                ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
            } else if (w.i < 0) {
                ctx.lineWidth = 3; ctx.strokeStyle = 'white';
                ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(6, 6); ctx.moveTo(6, -6); ctx.lineTo(-6, 6); ctx.stroke();
            }
            ctx.restore();
        }

        function drawVectorGrid() {
            ctx.beginPath();
            for (let x = 0; x < canvas.width; x += CONFIG.gridSize) {
                for (let y = 0; y < canvas.height; y += CONFIG.gridSize) {
                    const B = calculateB(x, y);
                    const mag = Math.hypot(B.x, B.y);
                    if (mag > 0.05) {
                        const angle = Math.atan2(B.y, B.x);
                        const len = Math.min(CONFIG.gridSize * 0.8, mag * 15);
                        const alpha = Math.min(1, mag * 0.8);
                        ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
                        drawArrow(x, y, angle, len);
                    }
                }
            }
            ctx.stroke();
        }

        function drawIronFilings() {
            const count = 1500;
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let i = 0; i < count; i++) {
                const rx = Math.random() * canvas.width;
                const ry = Math.random() * canvas.height;
                const B = calculateB(rx, ry);
                const mag = Math.hypot(B.x, B.y);
                if (mag > 0.02) {
                    const angle = Math.atan2(B.y, B.x);
                    const len = 6;
                    const dx = Math.cos(angle) * len/2;
                    const dy = Math.sin(angle) * len/2;
                    ctx.moveTo(rx - dx, ry - dy);
                    ctx.lineTo(rx + dx, ry + dy);
                }
            }
            ctx.stroke();
        }

        function drawStreamlines() {
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
            ctx.lineWidth = 1;
            const step = 60;
            for (let x = 0; x < canvas.width; x += step) {
                for (let y = 0; y < canvas.height; y += step) {
                    const B = calculateB(x, y);
                    if (Math.hypot(B.x, B.y) < 0.05) continue;
                    ctx.beginPath();
                    let cx = x, cy = y;
                    ctx.moveTo(cx, cy);
                    for(let i=0; i<25; i++){
                        const bLocal = calculateB(cx, cy);
                        const mag = Math.hypot(bLocal.x, bLocal.y);
                        if(mag < 0.01) break;
                        cx += (bLocal.x / mag) * 10;
                        cy += (bLocal.y / mag) * 10;
                        ctx.lineTo(cx, cy);
                    }
                    ctx.stroke();
                }
            }
        }

        function drawLorentzForces() {
            wires.forEach((w1, i) => {
                let Fx = 0, Fy = 0;
                wires.forEach((w2, j) => {
                    if (i === j) return;
                    const dx = w2.x - w1.x;
                    const dy = w2.y - w1.y;
                    const r = Math.hypot(dx, dy);
                    const forceMag = (CONFIG.forceScale * Math.abs(w1.i * w2.i)) / r;
                    const isAttract = (w1.i * w2.i) > 0;
                    const angle = Math.atan2(dy, dx);
                    const forceAngle = isAttract ? angle : angle + Math.PI;
                    Fx += Math.cos(forceAngle) * forceMag;
                    Fy += Math.sin(forceAngle) * forceMag;
                });

                const F_total = Math.hypot(Fx, Fy);
                if (F_total > 1) {
                    const F_angle = Math.atan2(Fy, Fx);
                    const len = Math.min(100, F_total);
                    ctx.save();
                    ctx.translate(w1.x, w1.y);
                    ctx.rotate(F_angle);
                    ctx.beginPath();
                    ctx.strokeStyle = '#f43f5e';
                    ctx.lineWidth = 4;
                    ctx.moveTo(CONFIG.wireRadius + 5, 0);
                    ctx.lineTo(CONFIG.wireRadius + 5 + len, 0);
                    ctx.stroke();
                    ctx.fillStyle = '#f43f5e';
                    ctx.beginPath();
                    const tip = CONFIG.wireRadius + 5 + len;
                    ctx.moveTo(tip, 0);
                    ctx.lineTo(tip - 10, -5);
                    ctx.lineTo(tip - 10, 5);
                    ctx.fill();
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 12px sans-serif';
                    ctx.rotate(-F_angle);
                    ctx.fillText("F", 15, -25);
                    ctx.restore();
                }
            });
        }

        function drawMouseCompass() {
            const B = calculateB(mouse.x, mouse.y);
            const mag = Math.hypot(B.x, B.y);
            let angle = mag > 0.001 ? Math.atan2(B.y, B.x) : -Math.PI / 2;

            ctx.save();
            ctx.translate(mouse.x, mouse.y);
            ctx.beginPath();
            ctx.arc(0, 0, 20, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.fill();
            ctx.stroke();
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.fillStyle = '#ef4444';
            ctx.moveTo(0, -4); ctx.lineTo(14, 0); ctx.lineTo(0, 4); ctx.fill();
            ctx.beginPath();
            ctx.fillStyle = '#fff';
            ctx.moveTo(0, -4); ctx.lineTo(-14, 0); ctx.lineTo(0, 4); ctx.fill();
            ctx.beginPath(); ctx.arc(0,0, 2, 0, Math.PI*2); ctx.fillStyle = '#0f172a'; ctx.fill();
            ctx.restore();
        }

        function drawArrow(x, y, angle, len) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            ctx.moveTo(-len/2, 0);
            ctx.lineTo(len/2, 0);
            ctx.lineTo(len/2 - 3, -2);
            ctx.moveTo(len/2, 0);
            ctx.lineTo(len/2 - 3, 2);
            ctx.restore();
        }