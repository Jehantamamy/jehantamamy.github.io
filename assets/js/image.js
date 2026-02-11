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
	// --- STATE ---
    let originalFile = null;
    let baseImage = null; // Image dasar (setelah di-crop/reset)
    let compressedBlob = null;
    let cropper = null;
    
    // Editor State
    let editState = {
        rotation: 0, 
        flipH: 1,    
        grayscale: false
    };
    
    let isAutoMode = true;
    let debounceTimer;

    // --- DOM ELEMENTS ---
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const previewImg = document.getElementById('preview-img');
    const loading = document.getElementById('loading');

    // --- EVENTS ---
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-active'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-active'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-active');
        if(e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', (e) => { if(e.target.files.length) handleFile(e.target.files[0]); });

    document.getElementById('target-size').addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => { if(isAutoMode) processImage(); }, 500);
    });

    // --- CROPPER FUNCTIONS ---
    function startCrop() {
        if(cropper) return;
        
        // Disable other tools
        document.getElementById('editor-panel').classList.add('pointer-events-none', 'opacity-50');
        document.getElementById('crop-actions').classList.remove('hidden');

        // Init Cropper
        cropper = new Cropper(previewImg, {
            viewMode: 1,
            dragMode: 'move',
            autoCropArea: 0.8,
            background: false,
            ready() {
                // Apply current edits visual fix if needed (Advanced: Cropper works on DOM image)
            }
        });
    }

    function applyCrop() {
        if(!cropper) return;
        
        // Get cropped canvas
        const croppedCanvas = cropper.getCroppedCanvas();
        
        // Update Base Image
        baseImage = new Image();
        baseImage.onload = () => {
            endCrop();
            processImage(); // Re-process with new base
        };
        baseImage.src = croppedCanvas.toDataURL();
    }

    function cancelCrop() {
        endCrop();
        // Just re-process current state to restore view
        processImage(); 
    }

    function endCrop() {
        if(cropper) {
            cropper.destroy();
            cropper = null;
        }
        document.getElementById('editor-panel').classList.remove('pointer-events-none', 'opacity-50');
        document.getElementById('crop-actions').classList.add('hidden');
    }

    // --- EDITOR FUNCTIONS ---
    function resetImage() {
        if(!originalFile) return;
        handleFile(originalFile); // Reload original
    }

    function rotate(deg) {
        editState.rotation = (editState.rotation + deg) % 360;
        processImage();
    }

    function flip(axis) {
        if(axis === 'h') editState.flipH *= -1;
        processImage();
    }

    function toggleGrayscale() {
        editState.grayscale = !editState.grayscale;
        const btn = document.getElementById('btn-gray');
        if(editState.grayscale) btn.classList.add('btn-tool-active');
        else btn.classList.remove('btn-tool-active');
        processImage();
    }

    // --- CORE LOGIC ---
    function handleFile(file) {
        if(!file.type.match('image.*')) { alert("Hanya file gambar!"); return; }
        
        originalFile = file;
        document.getElementById('orig-size').innerText = formatBytes(file.size);
        
        const reader = new FileReader();
        reader.onload = (e) => {
            baseImage = new Image();
            baseImage.onload = () => {
                document.getElementById('empty-state').classList.add('hidden');
                document.getElementById('editor-panel').classList.remove('hidden');
                document.getElementById('download-btn').classList.remove('hidden');
                previewImg.classList.remove('hidden');
                
                // Reset Edit State
                editState = { rotation: 0, flipH: 1, grayscale: false };
                document.getElementById('btn-gray').classList.remove('btn-tool-active');
                
                processImage();
            };
            baseImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    async function processImage() {
        if(!baseImage) return;
        loading.classList.remove('hidden');

        await new Promise(r => setTimeout(r, 50));

        const format = document.getElementById('format').value;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Use baseImage as source (it might be cropped)
        // Dimensions Logic
        const angle = (editState.rotation * Math.PI) / 180;
        const sin = Math.abs(Math.sin(angle));
        const cos = Math.abs(Math.cos(angle));
        
        const manualScale = isAutoMode ? 1.0 : parseInt(document.getElementById('scale').value) / 100;
        const orgW = baseImage.width * manualScale;
        const orgH = baseImage.height * manualScale;

        canvas.width = orgW * cos + orgH * sin;
        canvas.height = orgW * sin + orgH * cos;

        // Draw Logic
        ctx.save();
        if(editState.grayscale) ctx.filter = 'grayscale(100%)';
        ctx.translate(canvas.width/2, canvas.height/2);
        ctx.rotate(angle);
        ctx.scale(editState.flipH, 1);
        ctx.drawImage(baseImage, -orgW/2, -orgH/2, orgW, orgH);
        ctx.restore();

        // Compression Logic
        let bestBlob = null;

        if (isAutoMode) {
            const targetKB = parseInt(document.getElementById('target-size').value) || 200;
            const targetBytes = targetKB * 1024;
            
            let minQ = 0.0, maxQ = 1.0, quality = 0.8;
            
            for(let i=0; i<5; i++) {
                quality = (minQ + maxQ) / 2;
                const blob = await new Promise(r => canvas.toBlob(r, format, quality));
                if(blob.size > targetBytes) maxQ = quality; 
                else { minQ = quality; bestBlob = blob; }
            }
            if(!bestBlob || bestBlob.size > targetBytes) {
                bestBlob = await new Promise(r => canvas.toBlob(r, format, 0.5));
            }
        } else {
            const quality = parseInt(document.getElementById('quality').value) / 100;
            bestBlob = await new Promise(r => canvas.toBlob(r, format, quality));
        }

        updateResult(bestBlob);
        loading.classList.add('hidden');
    }

    function updateResult(blob) {
        compressedBlob = blob;
        const sizeStr = formatBytes(blob.size);
        document.getElementById('new-size').innerText = sizeStr;
        document.getElementById('final-size-badge').innerText = sizeStr;
        
        const sizeEl = document.getElementById('new-size');
        if(blob.size < originalFile.size) sizeEl.className = "text-emerald-400 font-bold";
        else sizeEl.className = "text-rose-400 font-bold";

        // Update preview image source so users see the final result
        // Note: For Cropper to work again, we might need to reset src if they click crop again.
        // But startCrop() initializes on current src, which is fine.
        previewImg.src = URL.createObjectURL(blob);
    }

    function toggleAutoMode() {
        isAutoMode = document.getElementById('auto-mode').checked;
        const manual = document.getElementById('manual-controls');
        if(isAutoMode) {
            manual.classList.add('opacity-50', 'pointer-events-none');
            processImage();
        } else {
            manual.classList.remove('opacity-50', 'pointer-events-none');
        }
    }

    function updateVal(id, val) { document.getElementById(id).innerText = val; }

    function downloadImage() {
        if(!compressedBlob) return;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(compressedBlob);
        
        let ext = "jpg";
        if(document.getElementById('format').value === 'image/png') ext = 'png';
        if(document.getElementById('format').value === 'image/webp') ext = 'webp';

        const name = originalFile.name.split('.')[0];
        link.download = `${name}_edited.${ext}`;
        link.click();
    }

    function formatBytes(bytes) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }
	document.addEventListener('DOMContentLoaded', () => {

		// PANGGIL SESSION MANAGER (TANPA AUTO SAVE)
		// User akan dapat peringatan biasa.
		initSessionManager();

		// ... inisialisasi tool lainnya ...
	});