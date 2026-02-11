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
	// --- KONFIGURASI WORKER PDF.JS (WAJIB) ---
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    // --- STATE VARIABLES ---
    let currentFile = null;
    let pdfDoc = null;
    let selectedFormat = 'jpg'; // 'jpg' or 'png'
    let selectedScale = 2; // 1 = 72DPI, 2 = 144DPI, 3 = 216DPI

    // --- DOM ELEMENTS ---
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const fileInput = document.getElementById('file-input');
    const dropZone = document.getElementById('drop-zone');
    
    const filenameEl = document.getElementById('filename');
    const pageCountEl = document.getElementById('page-count');
    
    const convertBtn = document.getElementById('convert-btn');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const progressPercent = document.getElementById('progress-percent');

    // --- EVENT LISTENERS ---
    
    // Drag & Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
    });

    dropZone.addEventListener('dragover', () => dropZone.classList.add('border-amber-500', 'bg-slate-800'));
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-amber-500', 'bg-slate-800'));
    
    dropZone.addEventListener('drop', (e) => {
        dropZone.classList.remove('border-amber-500', 'bg-slate-800');
        if(e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });

    fileInput.addEventListener('change', (e) => {
        if(e.target.files.length) handleFile(e.target.files[0]);
    });

    // --- CORE LOGIC ---

    async function handleFile(file) {
        if (file.type !== 'application/pdf') {
            alert('Please upload a valid PDF file.');
            return;
        }

        currentFile = file;
        
        // Load PDF info
        try {
            const arrayBuffer = await file.arrayBuffer();
            pdfDoc = await pdfjsLib.getDocument(arrayBuffer).promise;
            
            // Update UI
            filenameEl.innerText = file.name;
            pageCountEl.innerText = pdfDoc.numPages;
            
            // Switch View
            step1.classList.add('hidden');
            step2.classList.remove('hidden');
            step2.classList.add('flex');
            
        } catch (error) {
            console.error(error);
            alert("Error reading PDF. Password protected files are not supported.");
        }
    }

    // --- SETTINGS LOGIC ---

    function selectFormat(fmt) {
        selectedFormat = fmt;
        // Visual update
        document.querySelectorAll('.option-card').forEach(el => {
            if(el.id.includes('opt-')) el.classList.remove('selected');
        });
        document.getElementById(`opt-${fmt}`).classList.add('selected');
    }

    function selectDPI(scale) {
        selectedScale = scale;
        // Visual update
        document.querySelectorAll('.option-card').forEach(el => {
            if(el.id.includes('dpi-')) el.classList.remove('selected');
        });
        document.getElementById(`dpi-${scale}`).classList.add('selected');
    }

    // --- CONVERSION ENGINE (The Magic) ---

    async function startConversion() {
        if (!pdfDoc) return;

        // UI Reset
        convertBtn.disabled = true;
        convertBtn.classList.add('opacity-50', 'cursor-not-allowed');
        convertBtn.innerHTML = `<span>⏳</span> CONVERTING...`;
        progressContainer.classList.remove('hidden');
        
        const zip = new JSZip();
        const imgFolder = zip.folder("converted_images");
        const totalPages = pdfDoc.numPages;

        try {
            // Loop through pages
            for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                
                // Update Progress UI
                const percent = Math.round(((pageNum - 1) / totalPages) * 100);
                updateProgress(percent, `Rendering Page ${pageNum} of ${totalPages}...`);

                // 1. Get Page
                const page = await pdfDoc.getPage(pageNum);
                
                // 2. Set Scale (Resolution)
                const viewport = page.getViewport({ scale: selectedScale });
                
                // 3. Prepare Canvas
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                // 4. Render to Canvas
                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;

                // 5. Canvas to Blob (Image Data)
                const blob = await new Promise(resolve => {
                    const mimeType = selectedFormat === 'jpg' ? 'image/jpeg' : 'image/png';
                    // JPG quality 0.85 (Good balance), PNG is lossless
                    canvas.toBlob(resolve, mimeType, 0.85);
                });

                // 6. Add to ZIP
                const ext = selectedFormat === 'jpg' ? 'jpg' : 'png';
                // Zero padding: page_01.jpg, page_02.jpg ...
                const fileName = `page_${String(pageNum).padStart(2, '0')}.${ext}`;
                imgFolder.file(fileName, blob);
            }

            // Finalizing
            updateProgress(100, "Zipping files...");
            
            // Generate ZIP
            const content = await zip.generateAsync({ type: "blob" });
            
            // Trigger Download
            const zipName = currentFile.name.replace('.pdf', '') + '_Images.zip';
            saveAs(content, zipName);

            // Finish UI
            setTimeout(() => {
                alert("Conversion Complete! Your download should start automatically.");
                convertBtn.disabled = false;
                convertBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                convertBtn.innerHTML = `<span>⚡</span> CONVERT AGAIN`;
                progressContainer.classList.add('hidden');
            }, 1000);

        } catch (error) {
            console.error(error);
            alert("An error occurred during conversion.");
            convertBtn.disabled = false;
            convertBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            convertBtn.innerHTML = `<span>⚡</span> TRY AGAIN`;
        }
    }

    function updateProgress(percent, text) {
        progressBar.style.width = `${percent}%`;
        progressPercent.innerText = `${percent}%`;
        progressText.innerText = text;
    }

    function resetApp() {
        currentFile = null;
        pdfDoc = null;
        step2.classList.add('hidden');
        step2.classList.remove('flex');
        step1.classList.remove('hidden');
        fileInput.value = '';
        progressContainer.classList.add('hidden');
        progressBar.style.width = '0%';
    }
	document.addEventListener('DOMContentLoaded', () => {

		// PANGGIL SESSION MANAGER (TANPA AUTO SAVE)
		// User akan dapat peringatan biasa.
		initSessionManager();

		// ... inisialisasi tool lainnya ...
	});
