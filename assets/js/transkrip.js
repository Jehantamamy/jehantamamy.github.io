    // --- SETUP ---
    // =============================================
	// SECURITY: DOMAIN LOCK SYSTEM
	// Mencegah program dijalankan di luar domain resmi
	// =============================================
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
	
	const pdfjsLib = window['pdfjs-dist/build/pdf'];
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    
    const bobotNilai = { 'A': 4, 'A-': 3.75, 'AB': 3.5, 'B+': 3.25, 'B': 3, 'B-': 2.75, 'BC': 2.5, 'C+': 2.25, 'C': 2, 'D': 1, 'E': 0 };
    
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('pdf-upload');
    const mainContent = document.getElementById('main-content');
    const emptyState = document.getElementById('empty-state');
    const tbody = document.getElementById('table-body');
    
    let rowCount = 0;

    // --- EVENTS ---
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-active'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-active'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault(); dropZone.classList.remove('drag-active');
        if(e.dataTransfer.files.length) processFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', (e) => { if(e.target.files.length) processFile(e.target.files[0]); });

    // --- LOGIC ---
    function processFile(file) {
        if (!file || file.type !== 'application/pdf') { alert("Mohon unggah file PDF."); return; }
        
        const reader = new FileReader();
        reader.onload = async function() {
            try {
                const pdf = await pdfjsLib.getDocument(new Uint8Array(this.result)).promise;
                let fullText = "";
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    fullText += content.items.map(item => item.str).join("  ") + " \n";
                }
                parseData(fullText);
            } catch (error) { alert("Gagal membaca PDF."); }
        };
        reader.readAsArrayBuffer(file);
    }

    function parseData(text) {
        const regex = /(?!\bHalaman\b|\bPage\b)([A-Z][A-Z0-9\s\/\-\(\)]{7,})\s+([1-6])\s+([A-E][ABCDE+\-]?)/g;
        const cleanedText = text.replace(/\n/g, " "); 
        let match;
        
        // Reset jika upload baru
        // tbody.innerHTML = ""; // Optional: mau replace atau append? Replace lebih bersih.
        // rowCount = 0;
        
        while ((match = regex.exec(cleanedText)) !== null) {
            addTableRow(match[1].trim(), match[2], match[3], false);
        }
        
        showDashboard();
    }

    function addManualRow() {
        showDashboard();
        addTableRow("Mata Kuliah Baru", 3, "A", true);
        
        // Scroll to bottom
        const tableContainer = document.querySelector('.custom-scroll');
        tableContainer.scrollTop = tableContainer.scrollHeight;
    }

    function addTableRow(nama, sks, nilai, isManual) {
        rowCount++;
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-700/50 transition-colors group";
        
        // Generate Options
        const options = Object.keys(bobotNilai).map(n => 
            `<option value="${n}" ${n === nilai ? 'selected' : ''}>${n}</option>`
        ).join('');

        // SKS Input (Editable if manual, fixed if PDF)
        // Kita buat semuanya editable saja biar fleksibel, tapi styling beda dikit
        const sksInput = isManual 
            ? `<input type="number" min="1" max="6" value="${sks}" class="sks-input w-12 bg-slate-900 border border-indigo-500/50 rounded p-1 text-center text-xs text-white focus:outline-none" onchange="hitungUlang()">`
            : `<span class="sks-static inline-block px-2 py-1 rounded bg-slate-700 text-xs font-mono">${sks}</span><input type="hidden" value="${sks}" class="sks-input">`;

        const namaInput = isManual
            ? `<input type="text" value="${nama}" class="w-full bg-transparent border-b border-dashed border-slate-600 focus:border-indigo-500 outline-none text-white font-bold" placeholder="Nama Matkul">`
            : `<span class="font-bold text-white max-w-xs truncate block" title="${nama}">${nama}</span>`;

        tr.innerHTML = `
            <td class="p-4 border-b border-slate-700 font-mono text-slate-500">${rowCount}</td>
            <td class="p-4 border-b border-slate-700">${namaInput}</td>
            <td class="p-4 border-b border-slate-700 text-center">${sksInput}</td>
            <td class="p-4 border-b border-slate-700">
                <select class="select-nilai w-full bg-slate-900 border border-slate-600 text-white text-xs rounded p-2 focus:border-indigo-500 outline-none cursor-pointer" onchange="hitungUlang()">
                    ${options}
                </select>
            </td>
            <td class="p-4 border-b border-slate-700 text-center font-mono font-bold text-slate-400 poin-row">0</td>
            <td class="p-4 border-b border-slate-700 text-center">
                <button onclick="deleteRow(this)" class="text-slate-600 hover:text-rose-500 transition-colors" title="Hapus Baris">✕</button>
            </td>
        `;
        tbody.appendChild(tr);
        hitungUlang();
    }

    function deleteRow(btn) {
        btn.closest('tr').remove();
        hitungUlang();
    }

    function resetData() {
        if(confirm("Hapus semua data?")) {
            tbody.innerHTML = "";
            rowCount = 0;
            hitungUlang();
            mainContent.classList.add('hidden');
            emptyState.classList.remove('hidden');
        }
    }

    function showDashboard() {
        emptyState.classList.add('hidden');
        mainContent.classList.remove('hidden');
    }

    function hitungUlang() {
        let totalSks = 0;
        let totalPoin = 0;
        
        const rows = document.querySelectorAll('#table-body tr');
        
        rows.forEach((row, index) => {
            // Update Nomor Urut
            row.querySelector('td:first-child').innerText = index + 1;
            
            // Ambil SKS (bisa dari input manual atau hidden input statis)
            let sksVal = row.querySelector('.sks-input').value;
            // Fallback jika input hidden (utk data pdf statis yg span-nya diubah jadi input hidden)
            // Logic di addTableRow: kalau statis, ada <span class="sks-static">..</span> dan <input type="hidden" class="sks-input">
            // Kalau manual, ada <input type="number" class="sks-input">
            
            const sks = parseInt(sksVal) || 0;
            const selectEl = row.querySelector('.select-nilai');
            const nilai = selectEl.value;
            
            const poinMK = bobotNilai[nilai] || 0;
            const subTotal = sks * poinMK;
            
            row.querySelector('.poin-row').textContent = subTotal.toFixed(1);
            
            // Visual Styles
            if(['C','D','E','BC','C+'].includes(nilai)) {
                selectEl.className = 'select-nilai w-full bg-rose-900/30 border border-rose-500/50 text-rose-300 text-xs rounded p-2 focus:border-rose-500 outline-none cursor-pointer';
            } else {
                selectEl.className = 'select-nilai w-full bg-emerald-900/30 border border-emerald-500/50 text-emerald-300 text-xs rounded p-2 focus:border-emerald-500 outline-none cursor-pointer';
            }

            totalSks += sks;
            totalPoin += subTotal;
        });

        const ipk = totalSks > 0 ? (totalPoin / totalSks).toFixed(2) : "0.00";
        document.getElementById('stat-ipk').innerText = ipk;
        document.getElementById('stat-sks').innerText = totalSks;
        document.getElementById('stat-poin').innerText = totalPoin.toFixed(1);
        
        const percentage = Math.min((totalSks / 144) * 100, 100);
        document.getElementById('sks-progress').style.width = percentage + "%";
        
        // Warna IPK
        const ipkEl = document.getElementById('stat-ipk');
        if(parseFloat(ipk) >= 3.5) ipkEl.className = "text-4xl font-extrabold text-emerald-400";
        else if(parseFloat(ipk) >= 3.0) ipkEl.className = "text-4xl font-extrabold text-indigo-400";
        else ipkEl.className = "text-4xl font-extrabold text-amber-400";
    }