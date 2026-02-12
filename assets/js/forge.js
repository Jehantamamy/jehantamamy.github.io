// --- STATE MANAGEMENT ---
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
	let filesArray = [];
    let currentMode = 'merge'; // merge | img2pdf | optimize

    // DOM Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const fileListEl = document.getElementById('file-list');
    const fileListContainer = document.getElementById('file-list-container');
    const emptyState = document.getElementById('empty-state');
    const loading = document.getElementById('loading');
    const fileCount = document.getElementById('file-count');
    const uploadText = document.getElementById('upload-text');
    const uploadIcon = document.getElementById('upload-icon');
    const actionBtn = document.getElementById('action-btn');

    // --- TAB SWITCHING LOGIC ---
    function setMode(mode) {
        currentMode = mode;
        filesArray = []; // Reset queue saat ganti mode
        renderList();
        
        // Update Tabs UI
        ['merge', 'img2pdf', 'optimize'].forEach(m => {
            const btn = document.getElementById(`tab-${m}`);
            if(m === mode) {
                btn.className = "tab-btn tab-active flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 rounded-t-lg transition-all";
            } else {
                btn.className = "tab-btn tab-inactive flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 rounded-t-lg transition-all hover:bg-slate-800/50";
            }
        });

        // Update Info & Input Accept Type
        const bannerText = document.getElementById('mode-desc');
        if(mode === 'merge') {
            bannerText.innerText = "Combine multiple PDF files into one single document.";
            fileInput.setAttribute('accept', 'application/pdf');
            uploadText.innerText = "Click to Add PDFs";
            uploadIcon.innerText = "📑";
            actionBtn.innerHTML = "<span>⚡</span> MERGE PDFs NOW";
        } else if(mode === 'img2pdf') {
            bannerText.innerText = "Convert JPG/PNG images into a single PDF file.";
            fileInput.setAttribute('accept', 'image/jpeg, image/png');
            uploadText.innerText = "Click to Add Images";
            uploadIcon.innerText = "🖼️";
            actionBtn.innerHTML = "<span>⚡</span> CONVERT TO PDF";
        } else if(mode === 'optimize') {
            bannerText.innerText = "Clean & Re-save PDF to reduce size (Metadata cleanup).";
            fileInput.setAttribute('accept', 'application/pdf');
            uploadText.innerText = "Add PDF to Optimize";
            uploadIcon.innerText = "🚀";
            actionBtn.innerHTML = "<span>⚡</span> OPTIMIZE PDF";
        }
    }

    // --- DRAG & DROP EVENTS ---
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
    });

    dropZone.addEventListener('dragover', () => dropZone.classList.add('drag-active'));
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-active'));
    
    dropZone.addEventListener('drop', (e) => {
        dropZone.classList.remove('drag-active');
        handleFiles(e.dataTransfer.files);
    });
    
    fileInput.addEventListener('change', function() { handleFiles(this.files); });

    // --- FILE HANDLING ---
    function handleFiles(files) {
        // Validasi Tipe File sesuai Mode
        const validTypes = currentMode === 'img2pdf' ? ['image/jpeg', 'image/png'] : ['application/pdf'];
        const newFiles = Array.from(files).filter(f => validTypes.includes(f.type));
        
        if(newFiles.length === 0 && files.length > 0) {
            alert(`Invalid file type! Please upload ${currentMode === 'img2pdf' ? 'Images (JPG/PNG)' : 'PDF'} only.`);
            return;
        }

        // Mode Optimize hanya boleh 1 file
        if(currentMode === 'optimize') {
            filesArray = []; // Reset jika ada file lama
            if(newFiles.length > 1) alert("Optimization mode only accepts 1 file at a time. Using the first one.");
            newFiles.splice(1); 
        }

        newFiles.forEach(f => {
            filesArray.push({
                id: Date.now() + Math.random().toString(36).substr(2, 9),
                file: f
            });
        });

        renderList();
    }

    function renderList() {
        fileListEl.innerHTML = '';
        
        if(filesArray.length > 0) {
            emptyState.classList.add('hidden');
            fileListContainer.classList.remove('hidden');
        } else {
            emptyState.classList.remove('hidden');
            fileListContainer.classList.add('hidden');
        }

        fileCount.innerText = filesArray.length;

        filesArray.forEach((item, index) => {
            const icon = currentMode === 'img2pdf' ? '🖼️' : '📄';
            
            const li = document.createElement('li');
            li.className = "bg-slate-800/80 p-2.5 rounded-lg flex items-center justify-between group cursor-move border border-transparent hover:border-rose-500/30 transition-all select-none";
            li.setAttribute('data-id', item.id);
            
            li.innerHTML = `
                <div class="flex items-center gap-3 overflow-hidden">
                    <div class="text-slate-600 cursor-move px-1 hover:text-white">⋮⋮</div>
                    <div class="w-8 h-8 rounded bg-slate-700 flex items-center justify-center text-xs">${icon}</div>
                    <div class="flex-col overflow-hidden">
                        <p class="text-xs text-white truncate font-medium w-32 md:w-64">${item.file.name}</p>
                        <p class="text-[9px] text-slate-500 font-mono">${formatBytes(item.file.size)}</p>
                    </div>
                </div>
                <div class="flex items-center gap-1">
                    <button onclick="previewFile('${item.id}')" class="text-sky-500 hover:text-white p-1.5 rounded hover:bg-sky-600 transition" title="Preview">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                    </button>
                    <button onclick="removeFile('${item.id}')" class="text-slate-500 hover:text-white p-1.5 rounded hover:bg-rose-600 transition" title="Remove">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
            `;
            fileListEl.appendChild(li);
        });
    }

    // --- ACTIONS ---
    function removeFile(id) {
        filesArray = filesArray.filter(f => f.id !== id);
        renderList();
        fileInput.value = ''; 
    }

    function clearAll() {
        if(confirm('Clear all files?')) {
            filesArray = [];
            renderList();
            fileInput.value = '';
        }
    }

    function previewFile(id) {
        const item = filesArray.find(f => f.id === id);
        if(item) {
            const url = URL.createObjectURL(item.file);
            window.open(url, '_blank');
        }
    }

    function processAction() {
        if(currentMode === 'merge') mergePDFs();
        else if(currentMode === 'img2pdf') imagesToPDF();
        else if(currentMode === 'optimize') optimizePDF();
    }

    // --- ENGINE 1: MERGE PDF ---
    async function mergePDFs() {
        if(filesArray.length < 2) { alert("Please upload at least 2 PDF files."); return; }
        loading.classList.remove('hidden');

        try {
            const { PDFDocument } = PDFLib;
            const mergedPdf = await PDFDocument.create();

            for (const item of filesArray) {
                const arrayBuffer = await item.file.arrayBuffer();
                const pdf = await PDFDocument.load(arrayBuffer);
                const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            }

            const pdfBytes = await mergedPdf.save();
            download(pdfBytes, `Merged_Forge_${Date.now()}.pdf`, "application/pdf");
        } catch (error) {
            console.error(error);
            alert("Error: One of the files might be corrupted.");
        } finally { loading.classList.add('hidden'); }
    }

    // --- ENGINE 2: IMAGES TO PDF ---
    async function imagesToPDF() {
        if(filesArray.length < 1) return;
        loading.classList.remove('hidden');

        try {
            const { PDFDocument } = PDFLib;
            const pdfDoc = await PDFDocument.create();

            for (const item of filesArray) {
                const imageBytes = await item.file.arrayBuffer();
                let image;
                
                // Embed Image based on type
                if (item.file.type === 'image/jpeg') image = await pdfDoc.embedJpg(imageBytes);
                else image = await pdfDoc.embedPng(imageBytes);

                // Add Page matching image size
                const page = pdfDoc.addPage([image.width, image.height]);
                page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
            }

            const pdfBytes = await pdfDoc.save();
            download(pdfBytes, `Images_Converted_${Date.now()}.pdf`, "application/pdf");
        } catch (error) {
            console.error(error);
            alert("Error converting images. Ensure they are valid JPG/PNG.");
        } finally { loading.classList.add('hidden'); }
    }

    // --- ENGINE 3: OPTIMIZE PDF (Cleaner) ---
    async function optimizePDF() {
        if(filesArray.length < 1) return;
        loading.classList.remove('hidden');

        try {
            const { PDFDocument } = PDFLib;
            const arrayBuffer = await filesArray[0].file.arrayBuffer();
            
            // Load and Save to clean object streams
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            
            // Re-saving in PDF-Lib often removes unused objects/metadata
            const pdfBytes = await pdfDoc.save(); 
            
            download(pdfBytes, `Optimized_${filesArray[0].file.name}`, "application/pdf");
        } catch (error) {
            console.error(error);
            alert("Optimization failed. File might be encrypted.");
        } finally { loading.classList.add('hidden'); }
    }

    // --- UTILS ---
    new Sortable(fileListEl, {
        animation: 150,
        ghostClass: 'bg-slate-700',
        onEnd: function (evt) {
            // Reorder State
            const newOrder = [];
            fileListEl.querySelectorAll('li').forEach(li => {
                const id = li.getAttribute('data-id');
                const found = filesArray.find(f => f.id === id);
                if(found) newOrder.push(found);
            });
            filesArray = newOrder;
        },
    });

    function formatBytes(bytes) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    }
	document.addEventListener('DOMContentLoaded', () => {

		// PANGGIL SESSION MANAGER (TANPA AUTO SAVE)
		// User akan dapat peringatan biasa.
		initSessionManager();

		// ... inisialisasi tool lainnya ...
	});