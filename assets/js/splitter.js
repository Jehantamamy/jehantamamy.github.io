    // --- KONFIGURASI PDF.JS WORKER (WAJIB) ---
    // Tanpa ini, PDF tidak akan bisa dirender visualnya
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
	
	pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    // --- STATE VARIABLES ---
    let currentFile = null;      // Menyimpan file mentah
    let pdfDocInfo = null;       // Info dokumen dari PDF.js
    let selectedPages = new Set(); // Menyimpan index halaman yang dipilih (Set agar unik)
    let totalPages = 0;

    // --- DOM ELEMENTS ---
    const uploadSection = document.getElementById('upload-section');
    const editorSection = document.getElementById('editor-section');
    const pageGrid = document.getElementById('page-grid');
    const loadingOverlay = document.getElementById('loading');
    const loadingText = document.getElementById('loading-text');
    const selectedCountEl = document.getElementById('selected-count');
    const filenameDisplay = document.getElementById('filename-display');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');

    // --- EVENT LISTENERS ---
    
    // Drag & Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
    });
    
    dropZone.addEventListener('dragover', () => dropZone.classList.add('border-rose-500', 'bg-slate-800'));
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-rose-500', 'bg-slate-800'));
    
    dropZone.addEventListener('drop', (e) => {
        dropZone.classList.remove('border-rose-500', 'bg-slate-800');
        const files = e.dataTransfer.files;
        if(files.length) handleFile(files[0]);
    });

    fileInput.addEventListener('change', (e) => {
        if(e.target.files.length) handleFile(e.target.files[0]);
    });

    // --- CORE FUNCTIONS ---

    async function handleFile(file) {
        if(file.type !== 'application/pdf') {
            alert('Please upload a valid PDF file.');
            return;
        }

        currentFile = file;
        filenameDisplay.innerText = file.name;
        
        // Show Loading
        loadingOverlay.classList.remove('hidden');
        loadingText.innerText = "Reading Document...";

        try {
            // 1. Baca File ArrayBuffer
            const arrayBuffer = await file.arrayBuffer();
            
            // 2. Load PDF via PDF.js (Untuk Visual)
            const loadingTask = pdfjsLib.getDocument(arrayBuffer);
            pdfDocInfo = await loadingTask.promise;
            totalPages = pdfDocInfo.numPages;

            document.getElementById('page-count').innerText = totalPages;

            // 3. Render Visual Grid
            await renderGrid();

            // 4. Switch View
            uploadSection.classList.add('hidden');
            editorSection.classList.remove('hidden');
            editorSection.classList.add('flex');

        } catch (error) {
            console.error(error);
            alert("Error reading PDF. Password protected files are not supported yet.");
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    }

    async function renderGrid() {
        pageGrid.innerHTML = '';
        selectedPages.clear();
        updateCount();
        loadingText.innerText = `Rendering ${totalPages} Pages...`;

        // Loop setiap halaman
        for (let i = 1; i <= totalPages; i++) {
            // Container Halaman
            const card = document.createElement('div');
            card.className = "page-card relative bg-slate-800 rounded-lg p-2 border-2 border-transparent hover:border-slate-500 cursor-pointer transition-all group";
            card.setAttribute('data-page', i);
            card.onclick = () => togglePage(i, card);

            // Canvas untuk Render PDF
            const canvas = document.createElement('canvas');
            canvas.className = "w-full h-auto rounded shadow-sm opacity-80 group-hover:opacity-100 transition-opacity";
            const context = canvas.getContext('2d');

            // Render Halaman
            const page = await pdfDocInfo.getPage(i);
            const viewport = page.getViewport({ scale: 0.5 }); // Scale kecil biar ringan (Thumbnail)
            
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            
            // Async render (jangan tunggu satu-satu selesai biar UI responsif, tapi disini kita await agar urutan benar)
            await page.render(renderContext).promise;

            // Checkbox Indicator
            const check = document.createElement('div');
            check.className = "check-circle absolute top-3 right-3 w-6 h-6 rounded-full border-2 border-slate-400 bg-slate-900 flex items-center justify-center transition-all z-10";
            check.innerHTML = `<svg class="w-4 h-4 text-white opacity-0 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>`;

            // Page Number
            const pageNum = document.createElement('div');
            pageNum.className = "absolute bottom-1 left-0 right-0 text-center text-[10px] text-slate-400 font-mono";
            pageNum.innerText = `Page ${i}`;

            card.appendChild(canvas);
            card.appendChild(check);
            card.appendChild(pageNum);
            pageGrid.appendChild(card);
        }
    }

    // --- SELECTION LOGIC ---

    function togglePage(pageNum, cardElement) {
        // Toggle Set
        if (selectedPages.has(pageNum)) {
            selectedPages.delete(pageNum);
            cardElement.classList.remove('selected');
            cardElement.querySelector('.check-circle svg').classList.add('opacity-0');
        } else {
            selectedPages.add(pageNum);
            cardElement.classList.add('selected');
            cardElement.querySelector('.check-circle svg').classList.remove('opacity-0');
        }
        updateCount();
    }

    function updateCount() {
        selectedCountEl.innerText = selectedPages.size;
    }

    function selectAll() {
        const cards = document.querySelectorAll('.page-card');
        selectedPages.clear();
        cards.forEach(card => {
            const page = parseInt(card.getAttribute('data-page'));
            selectedPages.add(page);
            card.classList.add('selected');
            card.querySelector('.check-circle svg').classList.remove('opacity-0');
        });
        updateCount();
    }

    function deselectAll() {
        const cards = document.querySelectorAll('.page-card');
        selectedPages.clear();
        cards.forEach(card => {
            card.classList.remove('selected');
            card.querySelector('.check-circle svg').classList.add('opacity-0');
        });
        updateCount();
    }

    // --- PDF PROCESSING (EXTRACT / DELETE) ---

    async function processPDF(mode) {
        if (selectedPages.size === 0) {
            alert("Please select at least 1 page.");
            return;
        }

        loadingOverlay.classList.remove('hidden');
        loadingText.innerText = "Processing File...";

        try {
            const { PDFDocument } = PDFLib;
            
            // 1. Load Dokumen Asli (ArrayBuffer)
            const arrayBuffer = await currentFile.arrayBuffer();
            const originalPdf = await PDFDocument.load(arrayBuffer);
            
            // 2. Buat Dokumen Baru
            const newPdf = await PDFDocument.create();
            
            // 3. Tentukan Index Halaman yang mau diambil
            // PDF-Lib pakai index 0-based, sedangkan UI kita 1-based.
            const indicesToCopy = [];
            const total = originalPdf.getPageCount();

            for (let i = 0; i < total; i++) {
                const pageNum = i + 1; // 1-based
                const isSelected = selectedPages.has(pageNum);

                if (mode === 'extract') {
                    // Kalau Extract: Ambil HANYA yang dipilih
                    if (isSelected) indicesToCopy.push(i);
                } else if (mode === 'delete') {
                    // Kalau Delete: Ambil yang TIDAK dipilih
                    if (!isSelected) indicesToCopy.push(i);
                }
            }

            if(indicesToCopy.length === 0) {
                alert("Operation resulted in an empty PDF.");
                loadingOverlay.classList.add('hidden');
                return;
            }

            // 4. Salin Halaman
            const copiedPages = await newPdf.copyPages(originalPdf, indicesToCopy);
            copiedPages.forEach((page) => newPdf.addPage(page));

            // 5. Simpan & Download
            const pdfBytes = await newPdf.save();
            
            // Nama File Baru
            const originalName = currentFile.name.replace('.pdf', '');
            const suffix = mode === 'extract' ? 'Extracted' : 'Remaining';
            const newFilename = `${originalName}_${suffix}.pdf`;

            download(pdfBytes, newFilename, "application/pdf");

        } catch (error) {
            console.error(error);
            alert("An error occurred while processing the PDF.");
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    }

    function resetApp() {
        if(confirm("Close current file?")) {
            currentFile = null;
            selectedPages.clear();
            uploadSection.classList.remove('hidden');
            editorSection.classList.add('hidden');
            fileInput.value = ''; // Reset input
        }
    }
	document.addEventListener('DOMContentLoaded', () => {

		// PANGGIL SESSION MANAGER (TANPA AUTO SAVE)
		// User akan dapat peringatan biasa.
		initSessionManager();

		// ... inisialisasi tool lainnya ...
	});