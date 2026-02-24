// --- STATE CONFIG ---
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
        const DAW = {
            audioCtx: null, masterGain: null, destStream: null, reverbIR: null,
            pixelsPerSecond: 50, isPlaying: false, playheadSec: 0, durationSec: 60,
            tracks: [], colors: ['#0ea5e9', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
        };

        class Track {
            constructor(id, name, color) {
                this.id = id; this.name = name; this.color = color;
                this.regions = []; this.volume = 1; this.muted = false;
                // Default FX Values
                this.pan = 0;      // -1 (Kiri) sampai 1 (Kanan)
                this.filter = 50;  // 0-49 = Lowpass, 50 = Off, 51-100 = Highpass
                this.delay = 0;    // 0 sampai 1
                this.reverb = 0;   // 0 sampai 1
            }
        }

        let activeSources = [];
        let playStartTime = 0;
        let animationFrame = null;
		// Memori untuk fitur Copy-Paste
        let selectedRegionInfo = null; // Menyimpan info region mana yang sedang diklik
        let clipboardRegionData = null; // Menyimpan data copy-an

        // ==========================================
        // 2. AUDIO ENGINE & EFFECTS
        // ==========================================
        // TIMPA FUNGSI INI KEMBALI (FIX ERROR EXPORT)
        // TIMPA FUNGSI INI KEMBALI
        // TIMPA FUNGSI INI KEMBALI (ANTI-BROWSER LIMIT)
        // 1. INIT AUDIO (TANPA LIMITER)
        function initAudio() {
            if (!DAW.audioCtx) {
                DAW.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                
                DAW.masterGain = DAW.audioCtx.createGain();
                
                // Sensor VU Meter (LED)
                DAW.masterAnalyser = DAW.audioCtx.createAnalyser();
                DAW.masterAnalyser.fftSize = 256; 
                DAW.masterDataArray = new Uint8Array(DAW.masterAnalyser.frequencyBinCount);

                // Urutan Kabel Baru: Suara -> Gain -> Analyser -> Speaker Laptop
                DAW.masterGain.connect(DAW.masterAnalyser);
                DAW.masterAnalyser.connect(DAW.audioCtx.destination);
                
                DAW.destStream = DAW.audioCtx.createMediaStreamDestination();
                DAW.masterAnalyser.connect(DAW.destStream); 
                
                if (typeof createReverbIR === 'function') createReverbIR();
                if (typeof drawVUMeter === 'function') drawVUMeter();
            }
        }
		
        function createReverbIR() {
            const duration = 2.5; // Panjang pantulan ruangan (detik)
            const sampleRate = DAW.audioCtx.sampleRate;
            const length = sampleRate * duration;
            const impulse = DAW.audioCtx.createBuffer(2, length, sampleRate);
            for (let i = 0; i < length; i++) {
                const decay = Math.exp(-i / (sampleRate * 0.3)); // Rumus penyusutan suara
                impulse.getChannelData(0)[i] = (Math.random() * 2 - 1) * decay; // Channel Kiri
                impulse.getChannelData(1)[i] = (Math.random() * 2 - 1) * decay; // Channel Kanan
            }
            DAW.reverbIR = impulse;
        }

        // 2. FUNGSI LOAD FILE AUDIO (FIXED & STABIL)
        function handleFileUpload(trackId, input) {
            const file = input.files[0];
            if (!file) return;

            initAudio(); 
            if (DAW.audioCtx.state === 'suspended') DAW.audioCtx.resume();

            // Gunakan FileReader bawaan yang lebih tahan banting terhadap bug browser
            const reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    const arrayBuffer = e.target.result;
                    const audioBuffer = await DAW.audioCtx.decodeAudioData(arrayBuffer);
                    const track = DAW.tracks.find(t => t.id === trackId);

                    if (track) {
                        const insertTime = DAW.playheadSec || 0;
                        track.regions.push({
                            id: Date.now(),
                            buffer: audioBuffer,
                            startOffset: 0,
                            startTime: insertTime, // Dijatuhkan tepat di Garis Merah
                            duration: audioBuffer.duration,
                            fadeIn: 0,
                            fadeOut: 0
                        });

                        // Perpanjang penggaris jika lagunya kepanjangan
                        if (insertTime + audioBuffer.duration > DAW.durationSec) {
                            DAW.durationSec = Math.ceil(insertTime + audioBuffer.duration) + 10;
                        }

                        renderTrackLanes();
                        renderRegions();
                        if (typeof saveState === 'function') saveState(); 

                        // Geser layar otomatis ke kotak audio yang baru masuk
                        setTimeout(() => {
                            const scrollContainer = document.getElementById('arranger-scroll');
                            const targetX = insertTime * DAW.pixelsPerSecond;
                            if (scrollContainer) scrollContainer.scrollLeft = Math.max(0, targetX - 50);
                        }, 50);
                    }
                } catch (err) {
                    console.error("Audio Decode Error:", err);
                    alert("Gagal memproses audio! Format file mungkin rusak atau tidak didukung.");
                }
            };
            
            reader.onerror = function() {
                alert("Browser gagal membaca file dari komputermu!");
            };

            reader.readAsArrayBuffer(file);
        }

        // ==========================================
        // 3. UI RENDERERS
        // ==========================================
        // ==========================================
        // 3. UI RENDERERS
        // ==========================================
        let trackCounter = 0; // KUNCI FIX: Penghitung anti-tabrakan

        function addTrack() {
            trackCounter++;
            const trackId = Date.now() + trackCounter; // Dijamin 100% Unik!
            const color = DAW.colors[DAW.tracks.length % DAW.colors.length];
            DAW.tracks.push(new Track(trackId, `Track ${DAW.tracks.length + 1}`, color));
            
            renderTrackHeaders(); 
            renderTrackLanes(); 
            renderRegions(); 
        }

        // 3. FUNGSI RENDER HEADER TRACK (FIXED HTML TAGS & FILE INPUT BUG)
        function renderTrackHeaders() {
            const container = document.getElementById('track-headers-container');
            container.innerHTML = '<div style="height: 30px; min-height: 30px; background: #1e293b; border-bottom: 1px solid #334155; display: flex; align-items: center; padding: 0 0.5rem; font-size: 10px; color: #94a3b8; font-weight: bold; letter-spacing: 1px;">TRACK LIST</div>';

            DAW.tracks.forEach(track => {
                const header = document.createElement('div');
                header.id = `track-header-${track.id}`;
                header.className = 'track-header';
                
                if (activeTrackId === track.id) {
                    header.style.borderLeft = '4px solid #38bdf8';
                    header.style.background = '#1e293b';
                } else {
                    header.style.borderLeft = '4px solid transparent';
                    header.style.background = 'transparent';
                }

                header.onclick = (e) => {
                    if (e.target.closest('input') || e.target.closest('button')) return;
                    selectTrack(track.id);
                };

                header.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div class="font-bold text-xs truncate w-32" style="color: ${track.color}" title="${track.name}">${track.name}</div>
                        <div class="flex gap-1">
                            <button onclick="toggleRecord(${track.id})" id="btn-rec-${track.id}" class="w-6 h-6 rounded bg-slate-800 hover:bg-rose-500 text-[10px] text-white transition shadow"><i class="fa-solid fa-microphone"></i></button>
                            <button onclick="playIndividual(${track.id})" class="w-6 h-6 rounded bg-slate-800 hover:bg-sky-600 text-[10px] text-white transition"><i class="fa-solid fa-play"></i></button>
                            <button onclick="toggleMute(${track.id})" class="w-6 h-6 rounded ${track.muted ? 'bg-rose-600' : 'bg-slate-800'} text-[10px] text-white transition">M</button>
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-2 mt-1" title="Volume">
                        <i class="fa-solid fa-volume-low text-[10px] text-slate-500"></i>
                        <input type="range" min="0" max="2" step="0.05" value="${track.volume}" oninput="updateFX(${track.id}, 'volume', this)" class="w-full h-1 bg-slate-700 appearance-none rounded cursor-pointer accent-sky-500">
                        <span id="val-volume-${track.id}" class="text-[8px] text-sky-400 font-bold w-8 text-right">${Math.round(track.volume * 100)}%</span>
                    </div>
                    
                    <div class="grid grid-cols-3 gap-x-2 gap-y-1 mt-1 p-1.5 bg-slate-900 rounded border border-slate-700 shadow-inner">
                        <div class="flex flex-col">
                            <div class="flex justify-between items-center"><span class="text-[8px] text-slate-400 font-bold tracking-widest">PAN</span><span id="val-pan-${track.id}" class="text-[8px] text-emerald-400 font-bold">${track.pan > 0 ? '+'+track.pan : track.pan}</span></div>
                            <input type="range" min="-1" max="1" step="0.05" value="${track.pan}" oninput="updateFX(${track.id}, 'pan', this)" class="w-full accent-emerald-500 h-1 appearance-none bg-slate-800 rounded">
                        </div>
                        <div class="flex flex-col">
                            <div class="flex justify-between items-center"><span class="text-[8px] text-slate-400 font-bold tracking-widest">FILTER</span><span id="val-filter-${track.id}" class="text-[8px] text-sky-400 font-bold">${track.filter}</span></div>
                            <input type="range" min="0" max="100" step="1" value="${track.filter}" oninput="updateFX(${track.id}, 'filter', this)" class="w-full accent-sky-500 h-1 appearance-none bg-slate-800 rounded">
                        </div>
                        <div class="flex flex-col">
                            <div class="flex justify-between items-center"><span class="text-[8px] text-slate-400 font-bold tracking-widest">DELAY</span><span id="val-delay-${track.id}" class="text-[8px] text-amber-400 font-bold">${track.delay}</span></div>
                            <input type="range" min="0" max="1" step="0.05" value="${track.delay}" oninput="updateFX(${track.id}, 'delay', this)" class="w-full accent-amber-500 h-1 appearance-none bg-slate-800 rounded">
                        </div>
                        <div class="flex flex-col">
                            <div class="flex justify-between items-center"><span class="text-[8px] text-slate-400 font-bold tracking-widest">REVERB</span><span id="val-reverb-${track.id}" class="text-[8px] text-rose-400 font-bold">${track.reverb}</span></div>
                            <input type="range" min="0" max="1" step="0.05" value="${track.reverb}" oninput="updateFX(${track.id}, 'reverb', this)" class="w-full accent-rose-500 h-1 appearance-none bg-slate-800 rounded">
                        </div>
                        <div class="flex flex-col">
                            <div class="flex justify-between items-center"><span class="text-[8px] text-slate-400 font-bold tracking-widest text-sky-300">SPEED</span><span id="val-speed-${track.id}" class="text-[8px] text-indigo-400 font-bold">${track.speed || 1}x</span></div>
                            <input type="range" min="0.5" max="2" step="0.05" value="${track.speed || 1}" oninput="updateFX(${track.id}, 'speed', this)" class="w-full accent-indigo-400 h-1 appearance-none bg-slate-800 rounded">
                        </div>
                        <div class="flex flex-col justify-end">
                            <button onclick="togglePitch(${track.id})" class="text-[8px] w-full mt-0.5 py-0.5 rounded font-bold transition ${track.chipmunk ? 'bg-rose-600 text-white shadow-[0_0_5px_rgba(225,29,72,0.8)]' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}">${track.chipmunk ? 'ON (FALS)' : 'OFF (FIX)'}</button>
                        </div>
                    </div>
                    
                    <div class="mt-1"><input type="file" accept="audio/*" onclick="this.value=null" onchange="handleFileUpload(${track.id}, this)" class="text-[9px] w-full text-slate-500 file:bg-slate-800 file:border-0 file:text-slate-400 file:rounded file:px-1 file:cursor-pointer hover:file:bg-slate-700"></div>
                `;
                container.appendChild(header);
            });
        }

        function renderTrackLanes() {
            const container = document.getElementById('track-lanes-container'); container.innerHTML = '';
            document.getElementById('arranger-content').style.width = `${DAW.durationSec * DAW.pixelsPerSecond}px`;
            document.getElementById('bg-grid').style.backgroundSize = `${DAW.pixelsPerSecond}px 100%`;
            DAW.tracks.forEach(track => {
                const lane = document.createElement('div');
                lane.className = `track-lane ${activeTrackId === track.id ? 'active' : ''}`;
                lane.id = `lane-${track.id}`;
                
                // Sensor Klik untuk menjadikan Track ini Aktif
                lane.onclick = () => selectTrack(track.id);
                
                container.appendChild(lane);
            });
			renderRuler();
        }

        function renderRuler() {
            const ruler = document.getElementById('ruler'); Array.from(ruler.children).forEach(c => { if(!c.id.includes('playhead')) c.remove(); });
            ruler.style.width = `${DAW.durationSec * DAW.pixelsPerSecond}px`;
            for (let i = 0; i <= DAW.durationSec; i++) {
                const tick = document.createElement('div'); tick.className = 'tick-mark'; tick.style.left = `${i * DAW.pixelsPerSecond}px`; tick.style.height = i % 5 === 0 ? '15px' : '8px';
                if (i % 5 === 0) { const text = document.createElement('div'); text.className = 'tick-text'; text.style.left = `${i * DAW.pixelsPerSecond}px`; text.innerText = `${i}s`; ruler.appendChild(text); }
                ruler.appendChild(tick);
            }
        }

        function syncScroll() { document.getElementById('ruler').style.transform = `translateX(-${document.getElementById('arranger-scroll').scrollLeft}px)`; }

        function renderRegions() {
            DAW.tracks.forEach(track => {
                const lane = document.getElementById(`lane-${track.id}`); if (!lane) return; lane.innerHTML = ''; 
                track.regions.forEach(region => {
                    const regionEl = document.createElement('div'); 
					const isSelected = selectedRegionInfo && selectedRegionInfo.regionId === region.id;
                    regionEl.className = `audio-region group ${isSelected ? 'selected' : ''}`;
                    
                    const targetWidth = Math.max(1, Math.floor(region.duration * DAW.pixelsPerSecond));
                    regionEl.style.left = `${Math.floor(region.startTime * DAW.pixelsPerSecond)}px`; 
                    regionEl.style.width = `${targetWidth}px`; 
                    regionEl.style.borderColor = track.color;
					
                    const label = document.createElement('div'); label.className = 'absolute top-0 left-0 w-full bg-black/60 text-[10px] px-1 text-white font-bold z-20 pointer-events-none truncate'; label.innerText = track.name;
                    const canvas = document.createElement('canvas'); canvas.className = 'wave-canvas'; canvas.width = Math.min(targetWidth, 8000); canvas.height = 90; 
                    const cutLine = document.createElement('div'); cutLine.className = 'cut-line';
                    const btnDel = document.createElement('div'); btnDel.className = 'btn-delete-region'; btnDel.innerHTML = '<i class="fa-solid fa-times"></i>'; btnDel.onmousedown = (e) => { e.stopPropagation(); deleteRegion(track.id, region.id); };
                    const btnRev = document.createElement('div'); 
                    btnRev.className = 'btn-reverse-region'; 
                    btnRev.innerHTML = '<i class="fa-solid fa-backward-step"></i>'; 
                    btnRev.title = "Reverse Audio";
                    btnRev.onmousedown = (e) => { e.stopPropagation(); reverseRegion(track.id, region.id); };
                    // -------------------------------------
					
					const tLeft = document.createElement('div'); tLeft.className = 'trim-handle left'; tLeft.onmousedown = (e) => { e.stopPropagation(); startTrimRegion(e, track.id, region.id, 'left'); };
                    const tRight = document.createElement('div'); tRight.className = 'trim-handle right'; tRight.onmousedown = (e) => { e.stopPropagation(); startTrimRegion(e, track.id, region.id, 'right'); };

					regionEl.append(label, canvas, cutLine, btnRev, btnDel, tLeft, tRight);			
                    // 4. Handle Fade In (Kiri)
                    const fadeLeft = document.createElement('div');
                    fadeLeft.className = 'fade-handle left';
                    fadeLeft.style.left = `${(region.fadeIn || 0) * DAW.pixelsPerSecond}px`;
                    fadeLeft.onmousedown = (e) => { e.stopPropagation(); startFadeRegion(e, track.id, region.id, 'in'); };
                    regionEl.appendChild(fadeLeft);

                    // 5. Handle Fade Out (Kanan)
                    const fadeRight = document.createElement('div');
                    fadeRight.className = 'fade-handle right';
                    fadeRight.style.right = `${(region.fadeOut || 0) * DAW.pixelsPerSecond}px`;
                    fadeRight.onmousedown = (e) => { e.stopPropagation(); startFadeRegion(e, track.id, region.id, 'out'); };
                    regionEl.appendChild(fadeRight);
					
					// Cetak UI Titik-Titik Automation
                    if (region.automation) {
                        region.automation.forEach(node => {
                            const nEl = document.createElement('div'); nEl.className = 'auto-node';
                            nEl.style.left = `${(node.t / region.duration) * targetWidth}px`;
                            nEl.style.top = `${(1 - node.v) * 90}px`;
                            
                            nEl.onmousedown = (e) => {
                                e.stopPropagation();
                                if (e.detail === 2) { // Double click untuk hapus
                                    region.automation = region.automation.filter(n => n.id !== node.id);
                                    renderRegions(); if(typeof saveState==='function') saveState(); return;
                                }
                                startDragNode(e, track.id, region.id, node.id);
                            };
                            regionEl.appendChild(nEl);
                        });
                    }
					
					lane.appendChild(regionEl);
                    setTimeout(() => drawWaveform(region, canvas, track.color), 10);

                    // --- PASANG SENSOR MOUSE PADA REGION ---
                    regionEl.addEventListener('mousemove', (e) => { 
                        const rect = regionEl.getBoundingClientRect();
                        cutLine.style.left = `${e.clientX - rect.left}px`; 
                    });
                    
                    regionEl.addEventListener('dblclick', (e) => { 
                        e.stopPropagation(); 
                        const rect = regionEl.getBoundingClientRect();
                        splitRegion(track.id, region.id, (e.clientX - rect.left) / DAW.pixelsPerSecond); 
                    });

                    // --- UPDATE MOUSE DOWN DI RENDER REGIONS ---
                    regionEl.addEventListener('mousedown', (e) => { 
                        e.stopPropagation(); 
                        
                        // KUNCI FIX: SHIFT + CLICK untuk membuat titik Volume
                        if (e.shiftKey) {
                            const rect = regionEl.getBoundingClientRect();
                            const clickX = e.clientX - rect.left;
                            const clickY = e.clientY - rect.top;
                            
                            const t = (clickX / rect.width) * region.duration;
                            const v = 1 - (clickY / rect.height);
                            
                            if (!region.automation) region.automation = [];
                            region.automation.push({ id: Date.now(), t: t, v: v });
                            
                            renderRegions();
                            if(typeof saveState === 'function') saveState();
                            return;
                        }

                        document.querySelectorAll('.audio-region').forEach(el => el.classList.remove('selected'));
                        regionEl.classList.add('selected');
                        selectedRegionInfo = { trackId: track.id, regionId: region.id };
                        if (typeof startDragRegion === 'function') startDragRegion(e, track.id, region.id, regionEl); 
                    });
                });
            });
        }

        function drawWaveform(region, canvas, color) {
            // PENGAMAN UTAMA: Kalau canvas ga ada di layar, jangan buang memori untuk menggambar!
            if (!canvas.isConnected || canvas.width === 0) return; 

            try {
                const ctx = canvas.getContext('2d'); 
                const data = region.buffer.getChannelData(0); 
                const startIndex = Math.floor(region.startOffset * region.buffer.sampleRate); 
                const step = (region.duration * region.buffer.sampleRate) / canvas.width; 
                const amp = canvas.height / 2;

                ctx.fillStyle = color;
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                for (let i = 0; i < canvas.width; i++) {
                    let min = 0, max = 0; 
                    let startSample = Math.floor(startIndex + i * step); 
                    let endSample = Math.floor(startIndex + (i + 1) * step); 
                    if(startSample === endSample) endSample++;

                    for (let j = startSample; j < endSample; j++) { 
                        if (j < data.length) { 
                            if (data[j] < min) min = data[j]; 
                            if (data[j] > max) max = data[j]; 
                        } 
                    }
                    ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
                }
				
				// --- VISUAL FADE IN / OUT (Tambahkan setelah looping penggambar gelombang selesai) ---
                const fIn = region.fadeIn || 0;
                const fOut = region.fadeOut || 0;
                
                ctx.fillStyle = 'rgba(0,0,0,0.6)'; // Warna bayangan gelap
                if (fIn > 0) {
                    const w = fIn * DAW.pixelsPerSecond;
                    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.lineTo(0, canvas.height); ctx.fill(); 
                    ctx.beginPath(); ctx.moveTo(0, canvas.height); ctx.lineTo(w, canvas.height); ctx.lineTo(0, 0); ctx.fill(); 
                }
                if (fOut > 0) {
                    const w = fOut * DAW.pixelsPerSecond;
                    const startX = canvas.width - w;
                    ctx.beginPath(); ctx.moveTo(canvas.width, 0); ctx.lineTo(startX, 0); ctx.lineTo(canvas.width, canvas.height); ctx.fill();
                    ctx.beginPath(); ctx.moveTo(canvas.width, canvas.height); ctx.lineTo(startX, canvas.height); ctx.lineTo(canvas.width, 0); ctx.fill();
                }
				
				// --- VISUAL GARIS AUTOMATION (Tambahkan di drawWaveform) ---
                if (region.automation && region.automation.length > 0) {
                    const sorted = [...region.automation].sort((a,b)=>a.t - b.t);
                    ctx.strokeStyle = 'white'; // Warna biru cerah
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(0, canvas.height - (sorted[0].v * canvas.height));
                    sorted.forEach(node => {
                        const x = (node.t / region.duration) * canvas.width;
                        const y = canvas.height - (node.v * canvas.height);
                        ctx.lineTo(x, y);
                    });
                    ctx.lineTo(canvas.width, canvas.height - (sorted[sorted.length-1].v * canvas.height));
                    ctx.stroke();
                }
				
            } catch(e) {
                console.error("Canvas Render Error:", e);
            }
        }

        // ==========================================
        // 4. INTERACTION LOGIC
        // ==========================================
        // 1. FUNGSI TRACK AKTIF (FIXED)
        let activeTrackId = null;

        function selectTrack(trackId) {
            activeTrackId = trackId;
            
            // Matikan semua lampu
            document.querySelectorAll('.track-header').forEach(el => {
                el.style.borderLeft = '4px solid transparent';
                el.style.background = 'transparent';
            });
            document.querySelectorAll('.track-lane').forEach(el => {
                el.style.background = 'transparent';
            });
            
            // Nyalakan hanya yang diklik
            const headerEl = document.getElementById(`track-header-${trackId}`);
            const laneEl = document.getElementById(`lane-${trackId}`);
            
            if (headerEl) {
                headerEl.style.borderLeft = '4px solid #38bdf8';
                headerEl.style.background = '#1e293b';
            }
            if (laneEl) {
                laneEl.style.background = 'rgba(56, 189, 248, 0.05)';
            }
        }
		function startDragPlayhead(e) { if (!DAW.isPlaying) { updatePlayheadFromMouse(e); document.addEventListener('mousemove', dragPlayhead); document.addEventListener('mouseup', stopDragPlayhead); } }
        function dragPlayhead(e) { updatePlayheadFromMouse(e); }
        function stopDragPlayhead() { document.removeEventListener('mousemove', dragPlayhead); document.removeEventListener('mouseup', stopDragPlayhead); }
        function updatePlayheadFromMouse(e) { DAW.playheadSec = Math.max(0, (e.clientX - document.getElementById('ruler').getBoundingClientRect().left) / DAW.pixelsPerSecond); updatePlayheadUI(); }

        // ==========================================
        // FITUR DRAG & DROP (FIX: SENSOR TOLERANSI)
        // ==========================================
        let dragInfo = null;

        function startDragRegion(e, tId, rId, el) { 
            dragInfo = { 
                tId, rId, el, 
                startX: e.clientX, 
                startY: e.clientY,
                initTime: DAW.tracks.find(t=>t.id===tId).regions.find(r=>r.id===rId).startTime,
                isDragging: false // KUNCI FIX: Deteksi apakah mouse benar-benar diseret
            }; 
            
            document.addEventListener('mousemove', moveRegion); 
            document.addEventListener('mouseup', dropRegion); 
        }
        
        function moveRegion(e) { 
            if(!dragInfo) return; 

            // PENGAMAN: Cek apakah mouse cuma getar (klik biasa) atau benar diseret (> 3 pixel)
            if (!dragInfo.isDragging) {
                if (Math.abs(e.clientX - dragInfo.startX) > 3 || Math.abs(e.clientY - dragInfo.startY) > 3) {
                    dragInfo.isDragging = true; 
                    dragInfo.el.style.pointerEvents = 'none'; 
                    dragInfo.el.style.zIndex = '100';
                } else {
                    return; 
                }
            }

            const r = DAW.tracks.find(t=>t.id===dragInfo.tId).regions.find(r=>r.id===dragInfo.rId);
            let newStartTime = dragInfo.initTime + ((e.clientX - dragInfo.startX) / DAW.pixelsPerSecond); 
            
            // ==========================================
            // FITUR BARU: SMART MAGNET (REGION & PLAYHEAD)
            // ==========================================
            const snapThreshold = 10 / DAW.pixelsPerSecond; // Radius daya tarik magnet: 10 pixel
            let closestSnap = null;
            let minDiff = snapThreshold;

            // 1. Kumpulkan semua titik magnet (Garis merah Playhead & Pita Loop jika ada)
            let magneticEdges = [DAW.playheadSec]; 
            if (DAW.loopEnabled) { magneticEdges.push(DAW.loopStart, DAW.loopEnd); }

            // 2. Kumpulkan tepi Kiri & Kanan dari SEMUA kotak audio lain di semua track
            DAW.tracks.forEach(track => {
                track.regions.forEach(otherR => {
                    if (otherR.id !== dragInfo.rId) { // Jangan jadikan dirinya sendiri magnet
                        magneticEdges.push(otherR.startTime); // Tepi Kiri kotak lain
                        magneticEdges.push(otherR.startTime + otherR.duration); // Tepi Kanan kotak lain
                    }
                });
            });

            // 3. Kalkulasi jarak daya tarik
            magneticEdges.forEach(edge => {
                // Apakah Tepi KIRI kotak yang diseret mendekati magnet?
                let diffStart = Math.abs(newStartTime - edge);
                if (diffStart < minDiff) {
                    minDiff = diffStart;
                    closestSnap = edge;
                }
                // Apakah Tepi KANAN kotak yang diseret mendekati magnet?
                let diffEnd = Math.abs((newStartTime + r.duration) - edge);
                if (diffEnd < minDiff) {
                    minDiff = diffEnd;
                    closestSnap = edge - r.duration; // Tarik mundur kotaknya agar ujung kanannya yang nempel!
                }
            });

            // 4. Eksekusi Magnet! (Prioritaskan nempel ke kotak lain, kalau ga ada baru ke Grid BPM)
            if (closestSnap !== null) {
                newStartTime = closestSnap; // Tersedot!
            } else if (DAW.snap) {
                // Logika Grid BPM (Magnet lama)
                const beatDuration = 60 / DAW.bpm;
                const snapInterval = beatDuration / 4; 
                newStartTime = Math.round(newStartTime / snapInterval) * snapInterval;
            }
            // ==========================================
            
            r.startTime = Math.max(0, newStartTime); 
            dragInfo.el.style.left = `${r.startTime * DAW.pixelsPerSecond}px`;

            // Gerakan Vertikal (Pindah Track)
            let dy = e.clientY - dragInfo.startY;
            dragInfo.el.style.transform = `translateY(${dy}px)`;
        }
        
        function dropRegion(e) { 
            document.removeEventListener('mousemove', moveRegion); 
            document.removeEventListener('mouseup', dropRegion); 
            
            if (dragInfo) {
                // PENGAMAN 2: JANGAN RENDER ULANG kalau cuma diklik! 
                // Render ulang membatalkan hitungan Double Click dari browser.
                if (dragInfo.isDragging) {
                    dragInfo.el.style.pointerEvents = 'auto'; 
                    dragInfo.el.style.transform = 'none';
                    dragInfo.el.style.zIndex = '';
                    
                    let elemBelow = document.elementFromPoint(e.clientX, e.clientY);
                    let targetLane = elemBelow ? elemBelow.closest('.track-lane') : null;
                    
                    if (targetLane) {
                        let targetTrackId = parseInt(targetLane.id.replace('lane-', ''));
                        if (targetTrackId && targetTrackId !== dragInfo.tId) {
                            let sourceTrack = DAW.tracks.find(t=>t.id===dragInfo.tId);
                            let targetTrack = DAW.tracks.find(t=>t.id===targetTrackId);
                            let regionIndex = sourceTrack.regions.findIndex(r=>r.id===dragInfo.rId);
                            if (regionIndex > -1) {
                                let regionToMove = sourceTrack.regions.splice(regionIndex, 1)[0];
                                targetTrack.regions.push(regionToMove);
                            }
                        }
                    }
                    
                    renderRegions(); // Render HANYA ketika selesai diseret
                    if (typeof saveState === 'function') saveState(); // Rekam ke Undo
                }
                
                dragInfo = null; 
            }
        }

        function splitRegion(tId, rId, cutSec) {
            const t = DAW.tracks.find(t=>t.id===tId); const idx = t.regions.findIndex(r=>r.id===rId); const og = t.regions[idx];
            if (cutSec < 0.1 || cutSec > og.duration - 0.1) return;
            t.regions.splice(idx, 1, 
                { id: Date.now()+1, buffer: og.buffer, startOffset: og.startOffset, startTime: og.startTime, duration: cutSec }, 
                { id: Date.now()+2, buffer: og.buffer, startOffset: og.startOffset+cutSec, startTime: og.startTime+cutSec, duration: og.duration-cutSec }
            );
            renderRegions();
            saveState(); // <-- KAMERA MEREKAM POTONGAN
        }
		
        function deleteRegion(tId, rId) { 
            DAW.tracks.find(t=>t.id===tId).regions = DAW.tracks.find(t=>t.id===tId).regions.filter(r=>r.id!==rId); 
            renderRegions(); 
            saveState(); // <-- KAMERA MEREKAM PENGHAPUSAN
        }
        let trimInfo = null;
        function startTrimRegion(e, tId, rId, side) {
            const r = DAW.tracks.find(t=>t.id===tId).regions.find(r=>r.id===rId);
            trimInfo = { tId, rId, side, startX: e.clientX, initSt: r.startTime, initDur: r.duration, initOff: r.startOffset, maxD: r.buffer.duration };
            document.addEventListener('mousemove', trimRegion); document.addEventListener('mouseup', stopTrimRegion);
        }
        function trimRegion(e) {
            if(!trimInfo) return; const dxSec = (e.clientX - trimInfo.startX) / DAW.pixelsPerSecond; const r = DAW.tracks.find(t=>t.id===trimInfo.tId).regions.find(r=>r.id===trimInfo.rId);
            if (trimInfo.side === 'right') { r.duration = Math.min(trimInfo.maxD - r.startOffset, Math.max(0.1, trimInfo.initDur + dxSec)); } 
            else { let nDur = trimInfo.initDur - dxSec, nSt = trimInfo.initSt + dxSec, nOff = trimInfo.initOff + dxSec; if(nDur<0.1){ nSt+=nDur-0.1; nOff+=nDur-0.1; nDur=0.1; } if(nOff<0){ nSt-=nOff; nDur+=nOff; nOff=0; } if(nSt<0){ nOff-=nSt; nDur+=nSt; nSt=0; } r.duration = nDur; r.startTime = nSt; r.startOffset = nOff; }
            renderRegions();
        }
        function stopTrimRegion() { 
            document.removeEventListener('mousemove', trimRegion); 
            document.removeEventListener('mouseup', stopTrimRegion); 
            if (trimInfo) {
                saveState(); // <-- KAMERA MEREKAM PERUBAHAN PANJANG
                trimInfo = null; 
            }
        }
        // ==========================================
        // 5. PLAYBACK & EFFECTS ROUTING
        // ==========================================
        function toggleMute(tId) { DAW.tracks.find(t=>t.id===tId).muted = !DAW.tracks.find(t=>t.id===tId).muted; renderTrackHeaders(); }
        function playIndividual(tId) { initAudio(); DAW.tracks.forEach(t=>t.muted=(t.id!==tId)); renderTrackHeaders(); const t=DAW.tracks.find(t=>t.id===tId); if(t.regions.length>0){ DAW.playheadSec=t.regions.reduce((p,c)=>p.startTime<c.startTime?p:c).startTime; updatePlayheadUI(); } if(!DAW.isPlaying) playGlobal(); }

        // FUNGSI UPDATE EFEK & MAGNET SLIDER (FIXED)
        function updateFX(trackId, fxType, el) {
            const track = DAW.tracks.find(t => t.id === trackId);
            let val = parseFloat(el.value);
            
            // --- LOGIKA MAGNET (SNAP TO DEFAULT) ---
            if (fxType === 'pan' && Math.abs(val) <= 0.06) val = 0;
            if (fxType === 'filter' && Math.abs(val - 50) <= 3) val = 50;
            if (fxType === 'speed' && Math.abs(val - 1) <= 0.06) val = 1;
            if (fxType === 'volume' && Math.abs(val - 1) <= 0.06) val = 1;
            if (fxType === 'delay' && val <= 0.03) val = 0;
            if (fxType === 'reverb' && val <= 0.03) val = 0;
            
            // Paksa pegangan slider untuk melompat ke angka magnet
            el.value = val;
            track[fxType] = val;
            
            // --- UPDATE TEKS ANGKA UI SECARA REAL-TIME ---
            const valDisplay = document.getElementById(`val-${fxType}-${trackId}`);
            if (valDisplay) {
                if (fxType === 'pan') valDisplay.innerText = val > 0 ? `+${val.toFixed(2)}` : (val === 0 ? '0' : val.toFixed(2));
                else if (fxType === 'speed') valDisplay.innerText = `${val.toFixed(2)}x`;
                else if (fxType === 'volume') valDisplay.innerText = `${Math.round(val * 100)}%`;
                else if (fxType === 'filter') valDisplay.innerText = val;
                else valDisplay.innerText = val === 0 ? '0' : val.toFixed(2);
            }
            
            // --- TERAPKAN KE MESIN AUDIO ---
            activeSources.forEach(item => {
                if (item.trackId === trackId) {
                    if (fxType === 'volume' && item.gainNode) item.gainNode.gain.value = track.volume;
                    if (fxType === 'pan' && item.pannerNode) {
                        item.pannerNode.pan.value = (track.pan === 0) ? 0.001 : track.pan; 
                    }
                    if (fxType === 'delay' && item.delayGainNode) item.delayGainNode.gain.value = track.delay;
                    if (fxType === 'reverb' && item.reverbGainNode) item.reverbGainNode.gain.value = track.reverb;
                    if (fxType === 'speed' && item.source) item.source.playbackRate.value = track.speed;
                    
                    if (fxType === 'filter' && item.filterNode) {
                        if (track.filter < 50) {
                            item.filterNode.type = 'lowpass'; 
                            item.filterNode.frequency.value = 200 + (track.filter / 50) * 20000;
                        } else if (track.filter > 50) {
                            item.filterNode.type = 'highpass'; 
                            item.filterNode.frequency.value = ((track.filter - 50) / 50) * 5000;
                        } else {
                            item.filterNode.type = 'lowpass'; 
                            item.filterNode.frequency.value = 24000; // Bypass
                        }
                    }
                }
            });
        }
		
		// Fungsi untuk menyalakan/mematikan penahan Nada (Pitch Fix)
        function togglePitch(trackId) {
            const track = DAW.tracks.find(t => t.id === trackId);
            track.chipmunk = !track.chipmunk;
            renderTrackHeaders(); // Render ulang warna tombolnya
            
            // Terapkan langsung ke audio yang sedang berputar
            activeSources.forEach(item => {
                if (item.trackId === trackId && item.source) {
                    item.source.preservesPitch = !track.chipmunk;
                }
            });
            if (typeof saveState === 'function') saveState(); // Rekam ke memori Undo
        }
		
        function playGlobal() {
            initAudio(); if (DAW.isPlaying) { stopGlobal(); return; }
            DAW.isPlaying = true; document.getElementById('btn-master-play').innerHTML = '<i class="fa-solid fa-pause"></i>'; document.getElementById('btn-master-play').classList.replace('bg-emerald-600', 'bg-amber-500');
            playStartTime = DAW.audioCtx.currentTime - DAW.playheadSec;

            DAW.tracks.forEach(t => {
                if (t.muted) return;
                t.regions.forEach(r => {
                    if (r.startTime + r.duration > DAW.playheadSec) {
                        const source = DAW.audioCtx.createBufferSource(); source.buffer = r.buffer;
                        source.playbackRate.value = t.speed || 1;
                        source.preservesPitch = !t.chipmunk;
						let st = r.startTime, off = r.startOffset, dur = r.duration;
                        if (DAW.playheadSec > r.startTime) { const diff = DAW.playheadSec - r.startTime; off+=diff; dur-=diff; st=DAW.playheadSec; }
                        if (dur <= 0) return;

                        // --- SISTEM AUTOMASI FADE IN / FADE OUT ---
                        const regionGain = DAW.audioCtx.createGain();
                        const fIn = r.fadeIn || 0;
                        const fOut = r.fadeOut || 0;
                        const localStart = Math.max(0, DAW.playheadSec - r.startTime); 
                        const exactPlayTime = DAW.audioCtx.currentTime + (st - DAW.playheadSec);

                        let initVol = 1;
                        if (localStart < fIn) initVol = localStart / fIn;
                        else if (localStart > r.duration - fOut) initVol = (r.duration - localStart) / fOut;
                        
                        regionGain.gain.setValueAtTime(initVol, DAW.audioCtx.currentTime);

                        if (fIn > 0 && localStart < fIn) {
                            regionGain.gain.setValueAtTime(initVol, exactPlayTime);
                            regionGain.gain.linearRampToValueAtTime(1, exactPlayTime + (fIn - localStart));
                        }
                        
                        if (fOut > 0) {
                            if (localStart < r.duration - fOut) {
                                regionGain.gain.setValueAtTime(1, exactPlayTime + (r.duration - fOut - localStart));
                                regionGain.gain.linearRampToValueAtTime(0, exactPlayTime + (r.duration - localStart));
                            } else {
                                regionGain.gain.setValueAtTime(initVol, exactPlayTime);
                                regionGain.gain.linearRampToValueAtTime(0, exactPlayTime + (r.duration - localStart));
                            }
                        }
						
						// --- TAMBAHAN BARU: MESIN VOLUME AUTOMATION ---
                        const autoGainNode = DAW.audioCtx.createGain();
                        autoGainNode.gain.setValueAtTime(1, DAW.audioCtx.currentTime); // Default 100%
                        
                        if (r.automation && r.automation.length > 0) {
                            autoGainNode.gain.cancelScheduledValues(DAW.audioCtx.currentTime); // Hapus default
                            const nodes = [...r.automation].sort((a,b) => a.t - b.t);
                            const regionStartCtxTime = DAW.audioCtx.currentTime + (r.startTime - DAW.playheadSec);
                            
                            // Pasang Jangkar Awal (Agar tanjakannya tidak mulai dari angka 0)
                            autoGainNode.gain.setValueAtTime(nodes[0].v, DAW.audioCtx.currentTime);
                            
                            nodes.forEach(n => {
                                const nodeCtxTime = regionStartCtxTime + n.t;
                                if (nodeCtxTime >= DAW.audioCtx.currentTime) {
                                    // Kalau titiknya ada di masa depan (sebelah kanan Playhead), buat tanjakan ke arahnya
                                    autoGainNode.gain.linearRampToValueAtTime(n.v, nodeCtxTime);
                                } else {
                                    // Kalau titiknya sudah terlewat, set volume saat ini sesuai titik itu
                                    autoGainNode.gain.setValueAtTime(n.v, DAW.audioCtx.currentTime);
                                }
                            });
                        }
						
						const filterNode = DAW.audioCtx.createBiquadFilter();
                        if (t.filter < 50) { filterNode.type = 'lowpass'; filterNode.frequency.value = 200 + (t.filter / 50) * 20000; } 
                        else if (t.filter > 50) { filterNode.type = 'highpass'; filterNode.frequency.value = ((t.filter - 50) / 50) * 5000; } 
                        else { filterNode.type = 'lowpass'; filterNode.frequency.value = 24000; } // Bypass murni saat di tengah

                        // 2. Panner
                        const pannerNode = DAW.audioCtx.createStereoPanner(); 
                        pannerNode.pan.value = (t.pan === 0) ? 0.001 : t.pan; // Menghindari bug angka 0

                        // 3. Volume Master
                        const gainNode = DAW.audioCtx.createGain(); gainNode.gain.value = t.volume;

                        // 4. Delay (Echo) Loop
                        const delayNode = DAW.audioCtx.createDelay(); delayNode.delayTime.value = 0.35; 
                        const delayFeedback = DAW.audioCtx.createGain(); delayFeedback.gain.value = 0.4;
                        const delayGainNode = DAW.audioCtx.createGain(); delayGainNode.gain.value = t.delay;
                        delayNode.connect(delayFeedback).connect(delayNode); 

                        // 5. Reverb (Ruang)
                        const convolverNode = DAW.audioCtx.createConvolver(); convolverNode.buffer = DAW.reverbIR;
                        const reverbGainNode = DAW.audioCtx.createGain(); reverbGainNode.gain.value = t.reverb;

                        // --- SAMBUNGAN KABEL AUDIO ---
						source.connect(regionGain).connect(autoGainNode).connect(filterNode).connect(pannerNode).connect(gainNode);                        
                        gainNode.connect(DAW.masterGain);
                        gainNode.connect(delayNode).connect(delayGainNode).connect(DAW.masterGain);
                        gainNode.connect(convolverNode).connect(reverbGainNode).connect(DAW.masterGain);
                        
                        source.start(DAW.audioCtx.currentTime + (st - DAW.playheadSec), off, dur);
                        activeSources.push({ source, gainNode, pannerNode, filterNode, delayGainNode, reverbGainNode, trackId: t.id });
                    }
                });
            });
			// --- GENERATOR SUARA METRONOME ---
            if (DAW.metronome) {
                const beatDuration = 60 / DAW.bpm;
                // Looping dari awal lagu sampai akhir durasi
                for (let b = 0; b * beatDuration < DAW.durationSec; b++) {
                    let beatTime = b * beatDuration;
                    
                    // Hanya bunyikan ketukan yang berada di sebelah kanan garis Playhead
                    if (beatTime >= DAW.playheadSec) {
                        const osc = DAW.audioCtx.createOscillator();
                        const gain = DAW.audioCtx.createGain();
                        
                        // Nada tinggi untuk ketukan pertama (Awal Bar), nada rendah untuk ketukan 2,3,4
                        osc.frequency.value = (b % 4 === 0) ? 1200 : 800; 
                        osc.type = 'sine'; // Suara bulat
                        
                        osc.connect(gain).connect(DAW.masterGain);
                        
                        const playTime = DAW.audioCtx.currentTime + (beatTime - DAW.playheadSec);
                        osc.start(playTime);
                        
                        // Bentuk suara agar bunyinya pendek seperti klik kayu (Envelope)
                        gain.gain.setValueAtTime(0, playTime);
                        gain.gain.linearRampToValueAtTime(0.8, playTime + 0.005);
                        gain.gain.exponentialRampToValueAtTime(0.001, playTime + 0.05);
                        osc.stop(playTime + 0.06);
                        
                        // Masukkan ke memori agar berhenti berbunyi saat tombol Pause ditekan
                        activeSources.push({ source: osc }); 
                    }
                }
            }
            // ------------------------------------
            animatePlayhead();
        }

        function stopGlobal() {
            DAW.isPlaying = false; 
            document.getElementById('btn-master-play').innerHTML = '<i class="fa-solid fa-play ml-1"></i>'; 
            document.getElementById('btn-master-play').classList.replace('bg-amber-500', 'bg-emerald-600');
            
            activeSources.forEach(i => { try { i.source.stop(); } catch(e){} }); 
            activeSources = []; 
            cancelAnimationFrame(animationFrame);

            // TAHAP 5: Matikan Perekaman Mic Jika Sedang Berjalan
            if (isRecording && micRecorder && micRecorder.state !== 'inactive') {
                micRecorder.stop();
            }
        }

        function animatePlayhead() {
            if (!DAW.isPlaying) return;
            DAW.playheadSec = DAW.audioCtx.currentTime - playStartTime;
            
            // --- LOGIKA MESIN LOOP (TELEPORTASI WAKTU) ---
            if (DAW.loopEnabled && DAW.loopEnd > DAW.loopStart) {
                if (DAW.playheadSec >= DAW.loopEnd) {
                    // 1. Hentikan semua suara yang sedang jalan
                    activeSources.forEach(i => { try { i.source.stop(); } catch(e){} });
                    activeSources = [];
                    
                    // 2. Pindahkan garis merah ke pangkal Pita Ungu
                    DAW.playheadSec = DAW.loopStart;
                    
                    // 3. Tipu sistem sebentar agar memutar ulang dari pangkal
                    DAW.isPlaying = false; 
                    playGlobal();
                    return; // Hentikan frame ini, biarkan playGlobal membuat frame baru
                }
            }
            // ---------------------------------------------
            
            updatePlayheadUI();
            animationFrame = requestAnimationFrame(animatePlayhead);
        }

        function updatePlayheadUI() {
            const px = DAW.playheadSec * DAW.pixelsPerSecond;
            document.getElementById('playhead-top').style.left = `${px}px`; document.getElementById('playhead-main').style.left = `${px}px`;
            document.getElementById('time-display').innerText = `${Math.floor(DAW.playheadSec/60).toString().padStart(2,'0')}:${(DAW.playheadSec%60).toFixed(1).padStart(4,'0')}`;
        }

        let mediaRecorder = null, recordedChunks = [];
        
        function exportMix() {
            initAudio(); 
            if (DAW.isPlaying) stopGlobal();
            
            // =========================================================
            // KUNCI FIX: HITUNG ULANG DURASI PROJECT SEBELUM EXPORT
            // =========================================================
            let maxEndTime = 0;
            
            // Telusuri semua track dan potongan, cari titik paling kanan
            DAW.tracks.forEach(track => {
                track.regions.forEach(region => {
                    const regionEnd = region.startTime + region.duration;
                    if (regionEnd > maxEndTime) {
                        maxEndTime = regionEnd;
                    }
                });
            });

            // Cegah error kalau project kosong
            if (maxEndTime === 0) {
                return alert("Project kosong, Bro! Tidak ada audio yang bisa di-save.");
            }

            // Update durasi project (+ 2 detik untuk buntut efek Reverb/Delay)
            DAW.durationSec = Math.ceil(maxEndTime) + 2;
            
            // Refresh tampilan penggaris agar pas dengan durasi baru
            renderTrackLanes();
            renderRegions();
            // =========================================================

            alert(`Merekam Audio selama ${DAW.durationSec} detik! Biarkan lagu berputar sampai berhenti otomatis.`);
            
            DAW.playheadSec = 0; 
            updatePlayheadUI(); 
            recordedChunks = [];
            
            try {
                mediaRecorder = new MediaRecorder(DAW.destStream.stream);
                mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
                mediaRecorder.onstop = () => {
                    const a = document.createElement('a'); 
                    a.href = URL.createObjectURL(new Blob(recordedChunks, { type: 'audio/webm' })); 
                    a.download = `Aries_Mix_${Date.now()}.webm`;
                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                    
                    const btn = document.getElementById('btn-export'); 
                    btn.innerHTML = '<i class="fa-solid fa-download"></i> SAVE'; 
                    btn.classList.replace('bg-rose-600', 'bg-indigo-600');
                };
                
                document.getElementById('btn-export').innerHTML = '<i class="fa-solid fa-circle text-rose-300"></i> REC'; 
                document.getElementById('btn-export').classList.replace('bg-indigo-600', 'bg-rose-600');
                
                mediaRecorder.start(); 
                playGlobal();
                
                // Pengecek otomatis
                const checkEnd = setInterval(() => { 
                    if (!DAW.isPlaying) { 
                        mediaRecorder.stop(); 
                        clearInterval(checkEnd); 
                    } 
                }, 1000);
            } catch (err) { 
                alert("Browser tidak mendukung perekaman internal."); 
            }
        }
		// Logika Buka-Tutup Jendela Bantuan
        function openHelp() { document.getElementById('help-modal').classList.remove('hidden'); }
        function closeHelp() { document.getElementById('help-modal').classList.add('hidden'); }
		
        // ==========================================
        // FITUR BARU: KEYBOARD SHORTCUTS (TAHAP 1 & 2 FIXED)
        // ==========================================
		window.addEventListener('keydown', (e) => {
            // PENGAMAN: Kalau user lagi ngetik angka di kolom BPM, matikan semua shortcut!
            if (e.target.tagName.toLowerCase() === 'input') return;

            // --- 1. SPASI (PLAY / STOP) ---
            if (e.code === 'Space') {
                e.preventDefault(); // Cegah halaman web loncat/scroll ke bawah
                if (DAW.isPlaying) stopGlobal();
                else playGlobal();
                return;
            }
			
			// --- 1. UNDO & REDO ---
            if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) { if (typeof undo === 'function') undo(); return; }
            if (e.ctrlKey && (e.key === 'y' || e.key === 'Y' || (e.shiftKey && (e.key === 'z' || e.key === 'Z')))) { if (typeof redo === 'function') redo(); return; }

            // --- 2. PASTE (Bisa dieksekusi walau tidak ada kotak yang diklik) ---
            if (e.ctrlKey && (e.key === 'v' || e.key === 'V')) {
                if (!clipboardRegionData) return; // Batal kalau belum ada yang di-copy
                
                // Cari target track (Prioritaskan yang menyala biru, kalau ga ada, balik ke asal)
                const targetTrackId = activeTrackId || clipboardRegionData.originalTrackId;
                const track = DAW.tracks.find(t => t.id === targetTrackId);
                
                if (track) {
                    const newRegion = Object.assign({}, clipboardRegionData);
                    newRegion.id = Date.now();
                    newRegion.startTime = DAW.playheadSec; 
                    
                    track.regions.push(newRegion);
                    renderRegions();
                    if (typeof saveState === 'function') saveState(); 
                }
                return; // Stop eksekusi di sini agar tidak error ke bawah
            }

            // --- 3. DELETE & COPY (WAJIB ada kotak audio yang diklik/menyala) ---
            if (!selectedRegionInfo) return;

            // Tombol DELETE
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if(typeof deleteRegion === 'function') deleteRegion(selectedRegionInfo.trackId, selectedRegionInfo.regionId);
                selectedRegionInfo = null;
                document.querySelectorAll('.audio-region').forEach(el => el.classList.remove('selected'));
            }

            // Tombol CTRL + C (COPY)
            if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
                const track = DAW.tracks.find(t => t.id === selectedRegionInfo.trackId);
                const region = track.regions.find(r => r.id === selectedRegionInfo.regionId);
                if (region) {
                    clipboardRegionData = Object.assign({}, region);
                    clipboardRegionData.originalTrackId = track.id; // Ingat asalnya dari track mana
                    
                    // Efek kedip visual saat berhasil copy
                    const el = document.getElementById(`region-ui-${region.id}`);
                    if (el) { el.style.opacity = '0.3'; setTimeout(() => el.style.opacity = '1', 150); }
                }
            }
        });
		
		// ==========================================
        // FITUR BARU: MESIN WAKTU (UNDO & REDO)
        // ==========================================
        let stateHistory = [];
        let historyIndex = -1;
        const MAX_HISTORY = 30; // Batas maksimal 30 langkah memori agar RAM aman

        function saveState() {
            // Jika kita undo lalu melakukan aksi baru, hapus masa depan (redo) yang sudah usang
            if (historyIndex < stateHistory.length - 1) {
                stateHistory = stateHistory.slice(0, historyIndex + 1);
            }

            // KLONING DATA: Hanya copy angka strukturnya, BUKAN file audio aslinya
            const snapshot = DAW.tracks.map(track => ({
                id: track.id, name: track.name, color: track.color,
                volume: track.volume, muted: track.muted,
                pan: track.pan, filter: track.filter, delay: track.delay, reverb: track.reverb,
                
                // TAMBAHAN BARU:
                speed: track.speed || 1,
                chipmunk: track.chipmunk || false,
                
                regions: track.regions.map(r => ({
                    id: r.id, 
                    buffer: r.buffer, 
                    startOffset: r.startOffset, startTime: r.startTime, duration: r.duration,
                    fadeIn: r.fadeIn || 0,
					fadeOut: r.fadeOut || 0, automation: r.automation ? r.automation.map(a => ({...a})) : []
                }))
            }));

            stateHistory.push(snapshot);
            if (stateHistory.length > MAX_HISTORY) stateHistory.shift();
            else historyIndex++;
        }

        function restoreState(index) {
            if (index < 0 || index >= stateHistory.length) return;
            const snapshot = stateHistory[index];
            
            // Kembalikan status DAW dari memori snapshot
            DAW.tracks = snapshot.map(track => ({
                ...track,
                regions: track.regions.map(r => ({ ...r }))
            }));

            // Bersihkan seleksi yang nyala agar tidak error / nyangkut
            selectedRegionInfo = null;
            document.querySelectorAll('.audio-region').forEach(el => el.classList.remove('selected'));
            
            renderTrackHeaders(); // Update UI Volume/Efek jika berubah
            renderRegions();      // Gambar ulang posisi kotak audio
        }
		
		// ==========================================
        // FITUR BARU: FADE IN & FADE OUT (TAHAP 3)
        // ==========================================
        let fadeInfo = null;

        function startFadeRegion(e, tId, rId, type) {
            const track = DAW.tracks.find(t=>t.id===tId);
            const region = track.regions.find(r=>r.id===rId);
            fadeInfo = { 
                tId, rId, type, startX: e.clientX, 
                initFade: type === 'in' ? (region.fadeIn || 0) : (region.fadeOut || 0)
            };
            document.addEventListener('mousemove', dragFadeRegion);
            document.addEventListener('mouseup', stopFadeRegion);
        }

        function dragFadeRegion(e) {
            if(!fadeInfo) return;
            const dxSec = (e.clientX - fadeInfo.startX) / DAW.pixelsPerSecond;
            const region = DAW.tracks.find(t=>t.id===fadeInfo.tId).regions.find(r=>r.id===fadeInfo.rId);

            if (fadeInfo.type === 'in') {
                let newFade = fadeInfo.initFade + dxSec;
                if (newFade < 0) newFade = 0;
                if (newFade > region.duration - (region.fadeOut || 0)) newFade = region.duration - (region.fadeOut || 0); // Cegah tabrakan
                region.fadeIn = newFade;
            } else {
                let newFade = fadeInfo.initFade - dxSec; // Ke kiri nilainya positif untuk fadeOut
                if (newFade < 0) newFade = 0;
                if (newFade > region.duration - (region.fadeIn || 0)) newFade = region.duration - (region.fadeIn || 0);
                region.fadeOut = newFade;
            }
            renderRegions(); 
        }

        function stopFadeRegion() {
            document.removeEventListener('mousemove', dragFadeRegion);
            document.removeEventListener('mouseup', stopFadeRegion);
            if(fadeInfo) { saveState(); fadeInfo = null; }
        }
		
        function undo() {
            if (historyIndex > 0) {
                historyIndex--;
                restoreState(historyIndex);
            }
        }

        function redo() {
            if (historyIndex < stateHistory.length - 1) {
                historyIndex++;
                restoreState(historyIndex);
            }
        }
		
		// ==========================================
        // FITUR BARU: METRONOME & SNAP TO GRID (TAHAP 4)
        // ==========================================
        DAW.bpm = 120;
        DAW.snap = false;
        DAW.metronome = false;

        // Fungsi memperbarui gambar garis ketukan di latar belakang
        function updateGrid() {
            const beatDuration = 60 / DAW.bpm; // Rumus: 1 ketuk = 60 detik / BPM
            const beatWidth = beatDuration * DAW.pixelsPerSecond;
            // Gambar garis putus-putus transparan mengikuti ketukan
            document.getElementById('bg-grid').style.backgroundSize = `${beatWidth}px 100%`;
        }

        // Sensor Input BPM
        document.getElementById('bpm-input').addEventListener('change', (e) => {
            DAW.bpm = parseInt(e.target.value) || 120;
            updateGrid();
        });

        // Sensor Tombol Magnet (Snap)
        document.getElementById('btn-snap').addEventListener('click', (e) => {
            DAW.snap = !DAW.snap;
            e.currentTarget.classList.toggle('bg-sky-600');
            e.currentTarget.classList.toggle('text-white');
            e.currentTarget.classList.toggle('bg-slate-700');
            e.currentTarget.classList.toggle('text-slate-300');
        });

        // Sensor Tombol Metronome
        document.getElementById('btn-metronome').addEventListener('click', (e) => {
            DAW.metronome = !DAW.metronome;
            e.currentTarget.classList.toggle('bg-amber-500');
            e.currentTarget.classList.toggle('text-white');
            e.currentTarget.classList.toggle('bg-slate-700');
            e.currentTarget.classList.toggle('text-slate-300');
        });
        
		// ==========================================
        // FITUR BARU: DIRECT MIC RECORDING (TAHAP 5)
        // ==========================================
        let isRecording = false;
        let recordingTrackId = null;
        let micRecorder = null;
        let micChunks = [];
        let recordStartTime = 0;

        async function toggleRecord(trackId) {
            initAudio(); // Bangunkan Web Audio API
            
            // Kalau diklik lagi saat sedang rekam, matikan rekaman
            if (isRecording) {
                stopGlobal(); 
                return;
            }

            try {
                // Minta Izin Microphone ke Browser
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                
                micRecorder = new MediaRecorder(stream);
                micChunks = [];
                recordingTrackId = trackId;
                recordStartTime = DAW.playheadSec; // Catat di detik ke berapa kita mulai rekam

                micRecorder.ondataavailable = e => { if (e.data.size > 0) micChunks.push(e.data); };

                micRecorder.onstop = async () => {
                    // Konversi data mentah jadi File Audio
                    const blob = new Blob(micChunks, { type: 'audio/webm' }); 
                    const arrayBuffer = await blob.arrayBuffer();
                    
                    try {
                        // Decode jadi gelombang suara DAW
                        const audioBuffer = await DAW.audioCtx.decodeAudioData(arrayBuffer);
                        const track = DAW.tracks.find(t => t.id === recordingTrackId);
                        
                        if (track) {
                            // Suntikkan hasil rekaman ke dalam Track!
                            track.regions.push({
                                id: Date.now(),
                                buffer: audioBuffer,
                                startOffset: 0,
                                startTime: recordStartTime,
                                duration: audioBuffer.duration
                            });
                            
                            // Perpanjang penggaris kalau rekamannya kebablasan dari batas
                            if (recordStartTime + audioBuffer.duration > DAW.durationSec) {
                                DAW.durationSec = Math.ceil(recordStartTime + audioBuffer.duration) + 10;
                                renderTrackLanes();
                            }
                            
                            renderRegions();
                            if (typeof saveState === 'function') saveState(); // Rekam ke memori Undo
                        }
                    } catch(err) {
                        console.error(err);
                        alert("Gagal memproses hasil rekaman suara.");
                    }
                    
                    // Kembalikan Tombol Mic ke warna asal
                    const btn = document.getElementById(`btn-rec-${recordingTrackId}`);
                    if(btn) { btn.classList.remove('bg-rose-600', 'animate-pulse'); btn.classList.add('bg-slate-800'); }
                    
                    isRecording = false;
                    recordingTrackId = null;
                    stream.getTracks().forEach(t => t.stop()); // Matikan lampu Mic di laptop
                };

                // MULAI REKAM!
                micRecorder.start();
                isRecording = true;
                
                // Ubah Tombol Mic jadi Merah Berkedip
                const btn = document.getElementById(`btn-rec-${trackId}`);
                if(btn) { btn.classList.remove('bg-slate-800'); btn.classList.add('bg-rose-600', 'animate-pulse'); }
                
                // Otomatis putar Backing Track supaya penyanyi bisa dengar nadanya
                if (!DAW.isPlaying) playGlobal(); 

            } catch (err) {
                alert("Gagal merekam! Pastikan kamu memberi izin Microphone pada Browser.");
            }
        }
		
		// ==========================================
        // FITUR PAMUNGKAS: EXPORT WAV & SAVE/LOAD PROJECT
        // ==========================================

        // 1. MESIN ENCODER WAV (Standar Industri 16-bit PCM)
        function bufferToWav(abuffer) {
            let numOfChan = abuffer.numberOfChannels,
                length = abuffer.length * numOfChan * 2 + 44,
                buffer = new ArrayBuffer(length), view = new DataView(buffer),
                channels = [], i, sample, offset = 0, pos = 0;

            function setUint16(data) { view.setUint16(offset, data, true); offset += 2; }
            function setUint32(data) { view.setUint32(offset, data, true); offset += 4; }

            setUint32(0x46464952); setUint32(length - 8); setUint32(0x45564157); // RIFF, length, WAVE
            setUint32(0x20746d66); setUint32(16); setUint16(1); setUint16(numOfChan); // fmt chunk
            setUint32(abuffer.sampleRate); setUint32(abuffer.sampleRate * 2 * numOfChan); // sample rate
            setUint16(numOfChan * 2); setUint16(16); // block-align, 16-bit
            setUint32(0x61746164); setUint32(length - pos - 4); // data chunk

            for(i = 0; i < abuffer.numberOfChannels; i++) channels.push(abuffer.getChannelData(i));

            while(pos < abuffer.length) {
                for(i = 0; i < numOfChan; i++) {
                    sample = Math.max(-1, Math.min(1, channels[i][pos])); 
                    sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0;
                    view.setInt16(offset, sample, true); offset += 2;
                }
                pos++;
            }
            return new Blob([buffer], {type: "audio/wav"});
        }

        // 2. EXPORT AUDIO (SMART ROUTING: OFFLINE / REALTIME)
        async function exportAudio() {
            const format = document.getElementById('export-format').value;
            
            initAudio(); if (DAW.isPlaying) stopGlobal();
            
            // Hitung durasi total project
            let maxEndTime = 0;
            DAW.tracks.forEach(t => t.regions.forEach(r => { if (r.startTime + r.duration > maxEndTime) maxEndTime = r.startTime + r.duration; }));
            if (maxEndTime === 0) return alert("Project kosong! Tidak ada yang bisa di-export.");

            DAW.durationSec = Math.ceil(maxEndTime + 2); // Buntut efek 2 detik
            renderTrackLanes();
			renderRegions();
			
            // ==========================================
            // OPSI 1: WAV (CEPAT / OFFLINE RENDER)
            // ==========================================
            if (format === 'wav') {
                alert("Memulai Render WAV (Kualitas Studio)... Proses ini instan dan tidak memutar lagu.");
                
                const sampleRate = DAW.audioCtx.sampleRate;
                const offlineCtx = new OfflineAudioContext(2, sampleRate * DAW.durationSec, sampleRate);

                DAW.tracks.forEach(t => {
                    if (t.muted) return;
                    t.regions.forEach(r => {
                        const source = offlineCtx.createBufferSource(); source.buffer = r.buffer;
                        source.playbackRate.value = t.speed || 1;
                        source.preservesPitch = !t.chipmunk;
                        // FX Chain
                        const filterNode = offlineCtx.createBiquadFilter();
                        if (t.filter < 50) { filterNode.type = 'lowpass'; filterNode.frequency.value = 200 + (t.filter / 50) * 20000; } 
                        else if (t.filter > 50) { filterNode.type = 'highpass'; filterNode.frequency.value = ((t.filter - 50) / 50) * 5000; } 
                        else { filterNode.type = 'lowpass'; filterNode.frequency.value = 24000; }

                        const pannerNode = offlineCtx.createStereoPanner(); pannerNode.pan.value = (t.pan === 0) ? 0.001 : t.pan;
                        const gainNode = offlineCtx.createGain(); gainNode.gain.value = t.volume;

                        const delayNode = offlineCtx.createDelay(); delayNode.delayTime.value = 0.35; 
                        const delayFeedback = offlineCtx.createGain(); delayFeedback.gain.value = 0.4;
                        const delayGainNode = offlineCtx.createGain(); delayGainNode.gain.value = t.delay;
                        delayNode.connect(delayFeedback).connect(delayNode); 

                        const convolverNode = offlineCtx.createConvolver(); convolverNode.buffer = DAW.reverbIR; 
                        const reverbGainNode = offlineCtx.createGain(); reverbGainNode.gain.value = t.reverb;

                        // Fade Automasi
                        const regionGain = offlineCtx.createGain(); regionGain.gain.setValueAtTime(0, 0); 
                        const fIn = r.fadeIn || 0, fOut = r.fadeOut || 0;
                        if (fIn > 0) { regionGain.gain.setValueAtTime(0, r.startTime); regionGain.gain.linearRampToValueAtTime(1, r.startTime + fIn); } else regionGain.gain.setValueAtTime(1, r.startTime);
                        if (fOut > 0) { regionGain.gain.setValueAtTime(1, r.startTime + r.duration - fOut); regionGain.gain.linearRampToValueAtTime(0, r.startTime + r.duration); } else { regionGain.gain.setValueAtTime(1, r.startTime + r.duration - 0.01); regionGain.gain.linearRampToValueAtTime(0, r.startTime + r.duration); }
						
						// --- TAMBAHAN BARU: MESIN AUTOMATION OFFLINE ---
                        const autoGainNode = offlineCtx.createGain();
                        autoGainNode.gain.setValueAtTime(1, 0);
                        
                        if (r.automation && r.automation.length > 0) {
                            autoGainNode.gain.cancelScheduledValues(0);
                            const nodes = [...r.automation].sort((a,b) => a.t - b.t);
                            
                            autoGainNode.gain.setValueAtTime(nodes[0].v, r.startTime);
                            nodes.forEach(n => {
                                autoGainNode.gain.linearRampToValueAtTime(n.v, r.startTime + n.t);
                            });
                        }
						
                        source.connect(regionGain).connect(autoGainNode).connect(filterNode).connect(pannerNode).connect(gainNode);
                        gainNode.connect(offlineCtx.destination);
                        gainNode.connect(delayNode).connect(delayGainNode).connect(offlineCtx.destination);
                        gainNode.connect(convolverNode).connect(reverbGainNode).connect(offlineCtx.destination);

                        source.start(r.startTime, r.startOffset, r.duration);
                    });
                });

                const renderedBuffer = await offlineCtx.startRendering();
                const wavBlob = bufferToWav(renderedBuffer);
                
                const a = document.createElement('a'); a.href = URL.createObjectURL(wavBlob); a.download = `Aries_Mix_${Date.now()}.wav`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
            } 
            
            // ==========================================
            // OPSI 2: WEBM (KOMPRESI / REALTIME RENDER)
            // ==========================================
            else if (format === 'webm') {
                alert(`Merekam audio terkompresi selama ${DAW.durationSec} detik! Biarkan lagu berputar sampai berhenti otomatis.`);
                
                DAW.playheadSec = 0; updatePlayheadUI(); 
                let recordedChunks = [];
                
                try {
                    let mediaRecorder = new MediaRecorder(DAW.destStream.stream);
                    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
                    mediaRecorder.onstop = () => {
                        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(recordedChunks, { type: 'audio/webm' })); a.download = `Aries_Mix_${Date.now()}.webm`;
                        document.body.appendChild(a); a.click(); document.body.removeChild(a);
                        
                        const btn = document.getElementById('btn-export'); 
                        btn.innerHTML = '<i class="fa-solid fa-file-audio"></i> EXPORT'; 
                        btn.classList.replace('bg-indigo-600', 'bg-rose-600');
                    };
                    
                    document.getElementById('btn-export').innerHTML = '<i class="fa-solid fa-circle text-rose-300"></i> REC'; 
                    document.getElementById('btn-export').classList.replace('bg-rose-600', 'bg-indigo-600');
                    
                    mediaRecorder.start(); playGlobal();
                    
                    const checkEnd = setInterval(() => { if (!DAW.isPlaying) { mediaRecorder.stop(); clearInterval(checkEnd); } }, 1000);
                } catch (err) { 
                    alert("Browser tidak mendukung perekaman internal."); 
                }
            }
        }

        // 3. MESIN PENYIMPAN PROJECT (.aries) (FIXED - MISSING REGION LOOP)
        async function saveProject() {
            alert("Mengepak file Project... Mohon tunggu karena data audio sedang disalin.");
            
            let audioPool = []; // Mencegah buffer ganda jika lagu dipotong-potong
            let projectData = { bpm: DAW.bpm, durationSec: DAW.durationSec, tracks: [] };

            const getBufferIndex = async (buffer) => {
                let idx = audioPool.findIndex(p => p.buffer === buffer);
                if (idx === -1) {
                    const wavBlob = bufferToWav(buffer);
                    const base64 = await new Promise(resolve => {
                        const reader = new FileReader(); reader.onloadend = () => resolve(reader.result); reader.readAsDataURL(wavBlob);
                    });
                    audioPool.push({ buffer: buffer, base64: base64 });
                    idx = audioPool.length - 1;
                }
                return idx;
            };

            for (let track of DAW.tracks) {
                let trackData = { 
                    id: track.id, name: track.name, color: track.color, 
                    volume: track.volume, muted: track.muted, 
                    pan: track.pan, filter: track.filter, delay: track.delay, reverb: track.reverb,
                    speed: track.speed || 1, chipmunk: track.chipmunk || false,
                    regions: [] 
                };
                
                // ---> KUNCI FIX: INI BAGIAN YANG SEMPAT TERHAPUS! <---
                // Kita harus membaca setiap potongan kotak audio di dalam track ini
                for (let r of track.regions) {
                    let bIdx = await getBufferIndex(r.buffer);
                    trackData.regions.push({ 
                        id: r.id, 
                        startOffset: r.startOffset, 
                        startTime: r.startTime, 
                        duration: r.duration, 
                        fadeIn: r.fadeIn || 0, 
                        fadeOut: r.fadeOut || 0, 
                        bufferIndex: bIdx,
						automation: r.automation ? r.automation.map(a => ({...a})) : []
                    });
                }
                // -----------------------------------------------------

                projectData.tracks.push(trackData);
            }

            projectData.audioData = audioPool.map(p => p.base64); // Simpan hanya teks base64-nya

            const blob = new Blob([JSON.stringify(projectData)], { type: 'application/json' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `My_Project_${Date.now()}.aries`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
        }

        // 4. MESIN PEMBACA PROJECT
        function loadProject(input) {
            const file = input.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    alert("Memuat Project... Sedang membangun ulang struktur audio.");
                    initAudio();
                    const projectData = JSON.parse(e.target.result);
                    
                    // Decode Base64 teks kembali menjadi Gelombang Suara (AudioBuffer)
                    const decodedBuffers = [];
                    for (let b64 of projectData.audioData) {
                        const res = await fetch(b64); const arrayBuffer = await res.arrayBuffer();
                        const audioBuffer = await DAW.audioCtx.decodeAudioData(arrayBuffer);
                        decodedBuffers.push(audioBuffer);
                    }

                    DAW.bpm = projectData.bpm || 120; DAW.durationSec = projectData.durationSec || 60;
                    document.getElementById('bpm-input').value = DAW.bpm;
                    if(typeof updateGrid === 'function') updateGrid();

                    DAW.tracks = projectData.tracks.map(tData => {
                        const track = new Track(tData.id, tData.name, tData.color);
                        track.volume = tData.volume; track.muted = tData.muted; track.pan = tData.pan || 0; track.filter = tData.filter || 50; track.delay = tData.delay || 0; track.reverb = tData.reverb || 0;
						track.speed = tData.speed || 1; track.chipmunk = tData.chipmunk || false;
                        track.regions = tData.regions.map(rData => ({
                            id: rData.id, buffer: decodedBuffers[rData.bufferIndex], startOffset: rData.startOffset, startTime: rData.startTime, duration: rData.duration, fadeIn: rData.fadeIn || 0, fadeOut: rData.fadeOut || 0, 
							automation: rData.automation ? rData.automation.map(a => ({...a})) : []
                        }));
                        return track;
                    });

                    renderTrackHeaders(); renderTrackLanes(); renderRegions();
                    if(typeof saveState === 'function') { stateHistory = []; historyIndex = -1; saveState(); } // Reset Undo
                    
                    alert("Project berhasil dimuat sepenuhnya!");
                } catch (err) {
                    console.error(err); alert("Gagal memuat project. File mungkin rusak atau tidak valid.");
                }
                input.value = ''; // Reset input agar bisa meload file yang sama lagi nanti
            };
            reader.readAsText(file);
        }
		
		// ==========================================
        // FITUR BARU: LOOP / CYCLE MODE
        // ==========================================
        DAW.loopEnabled = false;
        DAW.loopStart = 0;
        DAW.loopEnd = 4; // Default panjang loop 4 detik

        function toggleLoop() {
            DAW.loopEnabled = !DAW.loopEnabled;
            const btn = document.getElementById('btn-loop');
            let loopEl = document.getElementById('loop-region');
            
            if (DAW.loopEnabled) {
                btn.classList.replace('bg-slate-700', 'bg-purple-600');
                btn.classList.replace('text-slate-300', 'text-white');
                
                if(!loopEl) {
                    createLoopUI();
                    loopEl = document.getElementById('loop-region');
                }
                loopEl.style.display = 'block';
                renderLoopUI();
            } else {
                btn.classList.replace('bg-purple-600', 'bg-slate-700');
                btn.classList.replace('text-white', 'text-slate-300');
                if(loopEl) loopEl.style.display = 'none';
            }
        }

        function createLoopUI() {
            const container = document.getElementById('arranger-content');
            const loopEl = document.createElement('div');
            loopEl.id = 'loop-region';
            
            // Sabuk atas untuk menggeser pita keseluruhan
            const bar = document.createElement('div');
            bar.className = 'loop-bar';
            bar.onmousedown = (e) => startDragLoop(e, 'bar');
            
            // Pegangan kiri & kanan
            const hLeft = document.createElement('div');
            hLeft.className = 'loop-handle left';
            hLeft.onmousedown = (e) => startDragLoop(e, 'left');
            
            const hRight = document.createElement('div');
            hRight.className = 'loop-handle right';
            hRight.onmousedown = (e) => startDragLoop(e, 'right');

            loopEl.appendChild(bar); loopEl.appendChild(hLeft); loopEl.appendChild(hRight);
            container.appendChild(loopEl);
        }

        function renderLoopUI() {
            const loopEl = document.getElementById('loop-region');
            if (!loopEl || !DAW.loopEnabled) return;
            
            const leftPx = DAW.loopStart * DAW.pixelsPerSecond;
            const widthPx = (DAW.loopEnd - DAW.loopStart) * DAW.pixelsPerSecond;
            
            loopEl.style.left = `${leftPx}px`;
            loopEl.style.width = `${Math.max(10, widthPx)}px`; // Minimal lebar 10px
        }

        // --- SISTEM SERET PITA UNGU ---
        let loopDragInfo = null;
        function startDragLoop(e, type) {
            e.stopPropagation();
            loopDragInfo = { type: type, startX: e.clientX, initStart: DAW.loopStart, initEnd: DAW.loopEnd };
            document.addEventListener('mousemove', dragLoopLogic);
            document.addEventListener('mouseup', stopDragLoop);
        }

        function dragLoopLogic(e) {
            if (!loopDragInfo) return;
            const dxSec = (e.clientX - loopDragInfo.startX) / DAW.pixelsPerSecond;
            
            if (loopDragInfo.type === 'left') {
                let newStart = loopDragInfo.initStart + dxSec;
                if (DAW.snap) { const snapInt = (60/DAW.bpm)/4; newStart = Math.round(newStart/snapInt)*snapInt; }
                if (newStart < 0) newStart = 0;
                if (newStart >= DAW.loopEnd - 0.5) newStart = DAW.loopEnd - 0.5; // Batas mentok
                DAW.loopStart = newStart;
            } 
            else if (loopDragInfo.type === 'right') {
                let newEnd = loopDragInfo.initEnd + dxSec;
                if (DAW.snap) { const snapInt = (60/DAW.bpm)/4; newEnd = Math.round(newEnd/snapInt)*snapInt; }
                if (newEnd <= DAW.loopStart + 0.5) newEnd = DAW.loopStart + 0.5;
                DAW.loopEnd = newEnd;
            }
            else if (loopDragInfo.type === 'bar') {
                let newStart = loopDragInfo.initStart + dxSec;
                let loopLen = loopDragInfo.initEnd - loopDragInfo.initStart;
                if (DAW.snap) { const snapInt = (60/DAW.bpm)/4; newStart = Math.round(newStart/snapInt)*snapInt; }
                if (newStart < 0) newStart = 0;
                DAW.loopStart = newStart;
                DAW.loopEnd = newStart + loopLen;
            }
            renderLoopUI();
        }

        function stopDragLoop() {
            document.removeEventListener('mousemove', dragLoopLogic);
            document.removeEventListener('mouseup', stopDragLoop);
            loopDragInfo = null;
        }
		
		// ==========================================
        // FITUR BARU: VISUAL VU METER (LED MASTER)
        // ==========================================
        function drawVUMeter() {
            requestAnimationFrame(drawVUMeter); // Lakukan terus menerus 60 FPS
            if (!DAW.audioCtx || !DAW.isPlaying) return; // Hemat baterai/CPU kalau lagi di-pause

            const canvasL = document.getElementById('vu-meter-l');
            const canvasR = document.getElementById('vu-meter-r');
            if(!canvasL || !canvasR) return;

            const ctxL = canvasL.getContext('2d');
            const ctxR = canvasR.getContext('2d');

            // Ambil data frekuensi dari Analyser
            DAW.masterAnalyser.getByteTimeDomainData(DAW.masterDataArray);
            
            // Rumus RMS (Root Mean Square) untuk menghitung "Loudness" asli ala telinga manusia
            let sumSquare = 0;
            for(let i = 0; i < DAW.masterDataArray.length; i++) {
                let norm = (DAW.masterDataArray[i] / 128.0) - 1.0; 
                sumSquare += norm * norm;
            }
            let rms = Math.sqrt(sumSquare / DAW.masterDataArray.length); 
            
            // Konversi rumus matematika ke persentase Volume visual (0.0 sampai 1.0)
            let volL = Math.min(1, rms * 4.0); 
            let volR = Math.min(1, rms * 3.8); // Sengaja dibedakan sedikit agar terlihat stereo alami

            // Fungsi Pencetak Lampu Kotak-Kotak
            function drawLedBar(ctx, width, height, vol) {
                ctx.clearRect(0, 0, width, height);
                let leds = 20; // Jumlah lampu LED dalam satu baris
                let ledWidth = width / leds;
                let activeLeds = Math.floor(vol * leds); // Berapa lampu yang harus nyala?

                for(let i = 0; i < leds; i++) {
                    // Penentuan Warna: 0-13 = Hijau, 14-17 = Kuning/Orange, 18-19 = Merah (Bahaya)
                    if (i < activeLeds) {
                        ctx.fillStyle = (i >= 18) ? '#e11d48' : (i >= 14) ? '#f59e0b' : '#10b981';
                    } else {
                        ctx.fillStyle = '#1e293b'; // Warna lampu redup/mati
                    }
                    // Gambar kotak lampu dengan jeda 1px agar tidak menyatu
                    ctx.fillRect(i * ledWidth, 0, ledWidth - 1, height);
                }
            }

            drawLedBar(ctxL, canvasL.width, canvasL.height, volL);
            drawLedBar(ctxR, canvasR.width, canvasR.height, volR);
        }
		
		// ==========================================
        // FITUR BARU: REVERSE AUDIO (SUARA MUNDUR)
        // ==========================================
        function reverseRegion(tId, rId) {
            if (!DAW.audioCtx) return;
            const track = DAW.tracks.find(t=>t.id===tId);
            const region = track.regions.find(r=>r.id===rId);
            if (!region) return;

            // 1. Kloning dan Balikkan Data Suara (Array Reverse)
            const oldBuf = region.buffer;
            const newBuf = DAW.audioCtx.createBuffer(oldBuf.numberOfChannels, oldBuf.length, oldBuf.sampleRate);
            
            for(let i = 0; i < oldBuf.numberOfChannels; i++) {
                const chanData = new Float32Array(oldBuf.getChannelData(i));
                chanData.reverse(); // Kunci pembalik suara!
                newBuf.copyToChannel(chanData, i);
            }
            region.buffer = newBuf;

            // 2. Koreksi Posisi Potongan (Trimming Math)
            // Agar kalau audionya sudah dipotong (Trim), yang dibalik tetap di area potongan yang pas!
            region.startOffset = oldBuf.duration - (region.startOffset + region.duration);

            // 3. Render Ulang Gelombang Visual & Simpan ke Mesin Undo
            renderRegions();
            if(typeof saveState === 'function') saveState();
        }
		
		// ==========================================
        // FITUR PUNCAK: VOLUME AUTOMATION
        // ==========================================
        let nodeDragInfo = null;
        function startDragNode(e, tId, rId, nId) {
            nodeDragInfo = { tId, rId, nId, startX: e.clientX, startY: e.clientY };
            const region = DAW.tracks.find(t=>t.id===tId).regions.find(r=>r.id===rId);
            const node = region.automation.find(n=>n.id===nId);
            nodeDragInfo.initT = node.t; nodeDragInfo.initV = node.v;
            document.addEventListener('mousemove', moveNode);
            document.addEventListener('mouseup', dropNode);
        }
        function moveNode(e) {
            if (!nodeDragInfo) return;
            const dxSec = (e.clientX - nodeDragInfo.startX) / DAW.pixelsPerSecond;
            const dyPx = e.clientY - nodeDragInfo.startY;
            
            const region = DAW.tracks.find(t=>t.id===nodeDragInfo.tId).regions.find(r=>r.id===nodeDragInfo.rId);
            const node = region.automation.find(n=>n.id===nodeDragInfo.nId);
            
            let newT = nodeDragInfo.initT + dxSec;
            if (newT < 0) newT = 0; if (newT > region.duration) newT = region.duration;
            
            let newV = nodeDragInfo.initV - (dyPx / 90); // 90px = tinggi kotak audio
            if (newV < 0) newV = 0; if (newV > 1) newV = 1; 
            
            node.t = newT; node.v = newV;
            renderRegions();
        }
        function dropNode() {
            document.removeEventListener('mousemove', moveNode); document.removeEventListener('mouseup', dropNode);
            nodeDragInfo = null; if(typeof saveState === 'function') saveState();
        }
		
        // TAMBAHAN: Pastikan pita ungu ikut menyesuaikan kalau di-Zoom!
        // Cari event zoom-slider kamu dan sisipkan `if(typeof renderLoopUI === 'function') renderLoopUI();` di dalamnya.
        document.getElementById('zoom-slider').addEventListener('input', (e) => {
            DAW.pixelsPerSecond = parseInt(e.target.value);
            renderTrackLanes();
            renderRegions();
            if(typeof renderLoopUI === 'function') renderLoopUI(); // <-- Sisipkan ini
        });
		
        // Panggil updateGrid() sekali saat aplikasi pertama dibuka
        updateGrid();
		
		// ==========================================
        // INIT
        // ==========================================
        let zoomTimeout; // Variabel penahan memori
        document.getElementById('zoom-slider').addEventListener('input', (e) => { 
            DAW.pixelsPerSecond = parseInt(e.target.value); 
            renderTrackLanes(); 
            
            // Jeda otomatis agar browser tidak ngos-ngosan merender ratusan canvas
            clearTimeout(zoomTimeout);
            zoomTimeout = setTimeout(() => {
                renderRegions(); 
                updatePlayheadUI(); 
            }, 150); // Tunggu 150ms setelah mouse berhenti digeser
        });
		
        // Agar kalau kita klik sembarang tempat (kosong), seleksinya hilang tanpa mereset layar
        document.getElementById('arranger-content').addEventListener('mousedown', () => {
            selectedRegionInfo = null;
            document.querySelectorAll('.audio-region').forEach(el => el.classList.remove('selected'));
        });

        // 1. Sapu bersih mesin audio saat halaman di-refresh / ditutup
        window.addEventListener('beforeunload', () => {
            if (DAW.audioCtx && DAW.audioCtx.state !== 'closed') {
                DAW.audioCtx.close();
            }
        });

        // 2. Pembersih sisa klik (Fokus) yang bikin browser bingung
        document.body.addEventListener('click', async () => {
            if (DAW.audioCtx && DAW.audioCtx.state === 'suspended') {
                await DAW.audioCtx.resume();
            }
        });
		addTrack(); addTrack(); 
		if (DAW.tracks.length > 0) {
            selectTrack(DAW.tracks[0].id);
        }
        
        saveState();