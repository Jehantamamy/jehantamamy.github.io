    // --- STATE ---
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
	
	let mediaRecorder;
    let recordedChunks = [];
    let timerInterval;
    let seconds = 0;
    let currentFps = 30;

    // --- DOM ---
    const preview = document.getElementById('preview-video');
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const downloadBtn = document.getElementById('download-btn');
    const emptyState = document.getElementById('empty-state');
    const timerDisplay = document.getElementById('timer');
    const timeVal = document.getElementById('time-val');
    const statusBadge = document.getElementById('status-badge');
    
    // --- INIT ---
    document.addEventListener('DOMContentLoaded', () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
            document.getElementById('mobile-warning').classList.remove('hidden');
            document.getElementById('control-panel').classList.add('opacity-50', 'pointer-events-none');
            statusBadge.innerText = "DEVICE NOT SUPPORTED";
        }
    });

    // --- SETTINGS LOGIC ---
    function setFps(fps) {
        currentFps = fps;
        document.getElementById('fps-30').className = fps === 30 ? "flex-1 py-1.5 rounded text-xs font-bold bg-slate-700 text-white transition-all" : "flex-1 py-1.5 rounded text-xs font-bold text-slate-500 hover:text-white transition-all";
        document.getElementById('fps-60').className = fps === 60 ? "flex-1 py-1.5 rounded text-xs font-bold bg-slate-700 text-white transition-all" : "flex-1 py-1.5 rounded text-xs font-bold text-slate-500 hover:text-white transition-all";
    }

    // --- CORE LOGIC ---
    async function startRecording() {
        try {
            const qualityMode = document.getElementById('quality-select').value;
            const useMic = document.getElementById('mic-toggle').checked;
            
            let widthIdeal, heightIdeal, bitrate;

            // Konfigurasi Kualitas
            if(qualityMode === 'lowest') {
                widthIdeal = 854; heightIdeal = 480; bitrate = 500000; 
            } else if(qualityMode === 'low') {
                widthIdeal = 1280; heightIdeal = 720; bitrate = 1000000; 
            } else if (qualityMode === 'high') {
                widthIdeal = 1920; heightIdeal = 1080; bitrate = 2500000; 
            } else { 
                widthIdeal = 3840; heightIdeal = 2160; bitrate = 5000000; 
            }

            const constraints = {
                video: { 
                    cursor: "always",
                    width: { ideal: widthIdeal },
                    height: { ideal: heightIdeal },
                    frameRate: { ideal: currentFps }
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                }
            };

            const screenStream = await navigator.mediaDevices.getDisplayMedia(constraints);
            
            let finalStream = screenStream;
            if (useMic) {
                const micStream = await navigator.mediaDevices.getUserMedia({ 
                    audio: { echoCancellation: true, noiseSuppression: true } 
                });
                
                const audioContext = new AudioContext();
                const dest = audioContext.createMediaStreamDestination();
                
                if(screenStream.getAudioTracks().length > 0) {
                    const sysSrc = audioContext.createMediaStreamSource(screenStream);
                    sysSrc.connect(dest);
                }
                const micSrc = audioContext.createMediaStreamSource(micStream);
                micSrc.connect(dest);

                finalStream = new MediaStream([
                    ...screenStream.getVideoTracks(),
                    ...dest.stream.getAudioTracks()
                ]);
            }

            const options = { mimeType: 'video/webm; codecs=vp9', bitsPerSecond: bitrate };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                delete options.mimeType; 
            }

            mediaRecorder = new MediaRecorder(finalStream, options);

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) recordedChunks.push(event.data);
            };

            mediaRecorder.onstop = exportVideo;
            screenStream.getVideoTracks()[0].onended = () => stopRecording();

            mediaRecorder.start();
            
            // Setup UI
            preview.srcObject = finalStream;
            emptyState.classList.add('hidden');
            startBtn.classList.add('hidden');
            stopBtn.classList.remove('hidden');
            downloadBtn.classList.add('hidden');
            timerDisplay.classList.remove('hidden');
            
            statusBadge.innerText = `REC: ${qualityMode.toUpperCase()} @ ${currentFps}FPS`;
            statusBadge.classList.replace('bg-slate-800', 'bg-rose-900');
            statusBadge.classList.add('text-white', 'animate-pulse');
            preview.parentElement.classList.add('recording-active');

            startTimer();

        } catch (err) {
            console.error(err);
            if(err.name !== 'NotAllowedError') alert("Gagal merekam: " + err.message);
        }
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            preview.srcObject.getTracks().forEach(track => track.stop());
        }
        stopTimer();
        
        startBtn.classList.remove('hidden');
        startBtn.innerHTML = `<div class="w-3 h-3 bg-white rounded-full"></div> REKAM LAGI`;
        stopBtn.classList.add('hidden');
        timerDisplay.classList.add('hidden');
        
        statusBadge.innerText = "RECORDING SAVED";
        statusBadge.classList.replace('bg-rose-900', 'bg-emerald-900');
        statusBadge.classList.remove('animate-pulse');
        preview.parentElement.classList.remove('recording-active');
    }

    function exportVideo() {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        preview.srcObject = null;
        preview.src = url;
        preview.controls = true;
        preview.play();

        const size = formatBytes(blob.size);
        downloadBtn.innerText = `DOWNLOAD VIDEO (${size})`;
        downloadBtn.href = url;
        downloadBtn.download = `Capture_${Date.now()}.webm`;
        downloadBtn.classList.remove('hidden');
        
        recordedChunks = [];
    }

    function startTimer() {
        seconds = 0;
        timerInterval = setInterval(() => {
            seconds++;
            const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
            const secs = (seconds % 60).toString().padStart(2, '0');
            timeVal.innerText = `${mins}:${secs}`;
        }, 1000);
    }

    function stopTimer() { clearInterval(timerInterval); }

    function formatBytes(bytes) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    }
	document.addEventListener('DOMContentLoaded', () => {

		// PANGGIL SESSION MANAGER (TANPA AUTO SAVE)
		// User akan dapat peringatan biasa.
		initSessionManager();

		// ... inisialisasi tool lainnya ...
	});