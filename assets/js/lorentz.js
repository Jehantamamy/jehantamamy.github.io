        const canvas = document.getElementById('simCanvas');
        const ctx = canvas.getContext('2d');
        
        // Configuration
        const DT = 0.1; // Time step
        const TRAIL_LENGTH = 500;
        
        // Physics State
        let particles = [];
        let animationId;
        
        // Slider Elements
        const sliderE = document.getElementById('slider-e');
        const sliderB = document.getElementById('slider-b');
        const sliderV = document.getElementById('slider-v');
        
        // Labels
        const labelE = document.getElementById('val-e');
        const labelB = document.getElementById('val-b');

        function resize() {
            canvas.width = canvas.parentElement.offsetWidth;
            canvas.height = canvas.parentElement.offsetHeight;
        }
        window.addEventListener('resize', resize);
        window.addEventListener('load', () => {
            resize();
            loop();
        });

        // --- PARTICLE CLASS ---
        class Particle {
            constructor(x, y, vx, vy) {
                this.x = x;
                this.y = y;
                this.vx = vx;
                this.vy = vy;
                this.trail = [];
                this.color = `hsl(${Math.random()*60 + 200}, 100%, 70%)`; // Blue-ish
                this.life = 1.0;
            }

            update(E, B) {
                // Physics: F = qE + q(v x B)
                // Assume q = 1, m = 1 for simplicity visual
                
                // 1. Electric Force (Fe)
                // E is vertical (Up/Down) in this sim
                // E > 0 pushes Down (Canvas Y is down), E < 0 pushes Up
                const Fe_y = E * 0.5; 
                
                // 2. Magnetic Force (Fm) = v x B
                // v = (vx, vy, 0), B = (0, 0, Bz)
                // Cross product:
                // Fx = vy * Bz
                // Fy = -vx * Bz
                const Fm_x = this.vy * B * 0.2;
                const Fm_y = -this.vx * B * 0.2;

                // Total Acceleration (a = F/m, m=1)
                const ax = Fm_x;
                const ay = Fe_y + Fm_y;

                // Euler Integration
                this.vx += ax * DT;
                this.vy += ay * DT;
                this.x += this.vx * DT;
                this.y += this.vy * DT;

                // Trail Management
                this.trail.push({x: this.x, y: this.y});
                if (this.trail.length > TRAIL_LENGTH) this.trail.shift();

                // Boundary Check (Kill if far off screen)
                if (this.x > canvas.width + 100 || this.x < -100 || 
                    this.y > canvas.height + 100 || this.y < -100) {
                    this.life = 0;
                }
            }

            draw() {
                // Draw Trail
                if (this.trail.length > 1) {
                    ctx.beginPath();
                    ctx.moveTo(this.trail[0].x, this.trail[0].y);
                    for (let i = 1; i < this.trail.length; i++) {
                        ctx.lineTo(this.trail[i].x, this.trail[i].y);
                    }
                    ctx.strokeStyle = this.color;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }

                // Draw Head
                ctx.beginPath();
                ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#fff';
                ctx.fill();
                
                // Glow
                ctx.shadowColor = this.color;
                ctx.shadowBlur = 10;
            }
        }

        // --- CONTROLLER ---
        function fireParticle() {
            const v0 = parseFloat(sliderV.value) * 5; // Scale up
            // Start from left middle
            particles.push(new Particle(50, canvas.height/2, v0, 0));
        }

        function clearCanvas() {
            particles = [];
        }

        function setPreset(type) {
            clearCanvas();
            if (type === 'cyclotron') {
                sliderE.value = 0;
                sliderB.value = 5; // Strong B field
                sliderV.value = 4;
            } else if (type === 'selector') {
                sliderE.value = 5; // Downward E
                sliderB.value = -3; // Inward B creates Upward Force
                sliderV.value = 5;
            }
            // Trigger UI update logic
            // (Simulated manual update)
        }

        // --- MAIN LOOP ---
        function loop() {
            // 1. Read Inputs
            const E = parseFloat(sliderE.value);
            const B = parseFloat(sliderB.value);
            
            // Update UI Labels
            labelE.innerText = E.toFixed(1);
            labelB.innerText = B.toFixed(1);

            // 2. Clear Screen (with Fade Effect for Trails)
            ctx.fillStyle = 'rgba(15, 23, 42, 0.3)'; // Semi-transparent clear
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 3. Draw Field Visuals (Background)
            drawFieldBackground(E, B);

            // 4. Update Particles
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.update(E, B);
                p.draw();
                if (p.life <= 0) particles.splice(i, 1);
            }

            // 5. Draw Emitter Gun
            ctx.fillStyle = '#475569';
            ctx.fillRect(0, canvas.height/2 - 10, 50, 20);
            ctx.fillStyle = '#10b981'; // Green Tip
            ctx.fillRect(45, canvas.height/2 - 5, 5, 10);

            requestAnimationFrame(loop);
        }

        // --- HELPER VISUALS ---
        function drawFieldBackground(E, B) {
            ctx.save();
            const spacing = 60;
            
            // Draw B-Field (Circles/Crosses)
            if (Math.abs(B) > 0.5) {
                ctx.fillStyle = B > 0 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.2)';
                ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
                ctx.font = '14px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                for (let x = spacing/2; x < canvas.width; x += spacing) {
                    for (let y = spacing/2; y < canvas.height; y += spacing) {
                        if (B > 0) {
                            // OUT (Dot)
                            ctx.beginPath();
                            ctx.arc(x, y, 2, 0, Math.PI*2);
                            ctx.fill();
                            ctx.beginPath();
                            ctx.arc(x, y, 6, 0, Math.PI*2);
                            ctx.stroke();
                        } else {
                            // IN (Cross)
                            ctx.beginPath();
                            ctx.moveTo(x-4, y-4); ctx.lineTo(x+4, y+4);
                            ctx.moveTo(x+4, y-4); ctx.lineTo(x-4, y+4);
                            ctx.stroke();
                        }
                    }
                }
            }

            // Draw E-Field (Arrows Up/Down)
            if (Math.abs(E) > 0.5) {
                ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
                ctx.lineWidth = 1;
                const arrowLen = 20;
                
                for (let x = spacing; x < canvas.width; x += spacing) {
                    for (let y = spacing; y < canvas.height; y += spacing) {
                        ctx.beginPath();
                        ctx.moveTo(x, y - arrowLen/2);
                        ctx.lineTo(x, y + arrowLen/2);
                        // Arrowhead
                        if (E > 0) { // Down
                            ctx.lineTo(x - 3, y + arrowLen/2 - 5);
                            ctx.moveTo(x, y + arrowLen/2);
                            ctx.lineTo(x + 3, y + arrowLen/2 - 5);
                        } else { // Up
                            ctx.moveTo(x, y - arrowLen/2);
                            ctx.lineTo(x - 3, y - arrowLen/2 + 5);
                            ctx.moveTo(x, y - arrowLen/2);
                            ctx.lineTo(x + 3, y - arrowLen/2 + 5);
                        }
                        ctx.stroke();
                    }
                }
            }
            ctx.restore();
        }