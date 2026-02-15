    // --- SETUP ---
    // =============================================
	// SECURITY: DOMAIN LOCK SYSTEM
	// Mencegah program dijalankan di luar domain resmi
	// =============================================
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
	
	// --- SETUP & CONFIGURATION ---
	// --- SETUP & CONFIGURATION ---
	const pdfjsLib = window['pdfjs-dist/build/pdf'];
	pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

	// Bobot Nilai (Menggunakan Standar Lama Kamu + AB/BC)
	const gradeWeights = { 
		'A': 4.00, 'A-': 3.75, 
		'AB': 3.50, 'B+': 3.25, 'B': 3.00, 'B-': 2.75, 
		'BC': 2.50, 'C+': 2.25, 'C': 2.00, 
		'D': 1.00, 'E': 0.00, 'T': 0.00 
	};

	// State Data
	let transcriptData = []; 

	// DOM Elements
	const dropZone = document.getElementById('drop-zone');
	const fileInput = document.getElementById('pdf-upload');
	const mainContent = document.getElementById('main-content');
	const emptyState = document.getElementById('empty-state');
	const tbody = document.getElementById('table-body');
	const sortSelector = document.getElementById('sort-selector'); 

	// --- EVENT LISTENERS ---
	dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-active'); });
	dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-active'));
	dropZone.addEventListener('drop', (e) => {
		e.preventDefault(); dropZone.classList.remove('drag-active');
		if(e.dataTransfer.files.length) processFile(e.dataTransfer.files[0]);
	});
	fileInput.addEventListener('change', (e) => { if(e.target.files.length) processFile(e.target.files[0]); });

	// Init
	document.addEventListener('DOMContentLoaded', () => {
		renderTable(); 
	});


	// --- CORE FUNCTIONS: PDF PROCESSING ---

	function processFile(file) {
		if (!file || file.type !== 'application/pdf') { alert("Mohon unggah file PDF."); return; }
		
		dropZone.innerHTML = '<p class="text-indigo-400 font-bold animate-pulse">Sedang Membaca PDF...</p>';

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
				
				// Reset UI Dropzone
				dropZone.innerHTML = `
					<input type="file" id="pdf-upload" class="absolute inset-0 opacity-0 cursor-pointer" accept="application/pdf">
					<div class="flex items-center justify-center gap-3">
						<div class="text-xl">📄</div>
						<div class="text-left">
							<p class="text-xs font-bold text-slate-300">Upload Transkrip PDF</p>
						</div>
					</div>`;
					
			} catch (error) { 
				console.error(error);
				alert("Gagal membaca PDF.");
				dropZone.innerHTML = 'Gagal. Coba lagi.';
			}
		};
		reader.readAsArrayBuffer(file);
	}

	function parseData(text) {
		// --- KEMBALI KE REGEX LAMA KAMU (YANG TERBUKTI WORK) ---
		// Pola: (Nama MK) (SKS 1-6) (Nilai A-E diikuti optional A-E/+/-)
		const regex = /(?!\bHalaman\b|\bPage\b)([A-Z][A-Z0-9\s\/\-\(\)\&]{5,})\s+([1-6])\s+([A-E][ABCDE+\-]?)/g;
		
		const cleanedText = text.replace(/\n/g, " "); 
		let match;
		let newItems = [];
		
		while ((match = regex.exec(cleanedText)) !== null) {
			const namaBersih = match[1].trim().replace(/\s+/g, ' ');
			newItems.push({
				id: Date.now() + Math.random(), 
				name: namaBersih,
				sks: parseInt(match[2]),
				grade: match[3] // Ini sekarang bisa nangkep 'AB', 'BC', 'A-', dll
			});
		}

		if (newItems.length > 0) {
			transcriptData = [...transcriptData, ...newItems];
			renderTable();
			alert(`Berhasil mengekstrak ${newItems.length} mata kuliah!`);
		} else {
			alert("Pola teks PDF tidak dikenali. Silakan input manual.");
			showDashboard(); 
		}
	}


	// --- CORE FUNCTIONS: DATA & SORTING ---

	function addManualRow() {
		transcriptData.push({
			id: Date.now(),
			name: "Mata Kuliah Baru",
			sks: 3,
			grade: "A"
		});
		if(sortSelector) sortSelector.value = 'default';
		renderTable();
		setTimeout(() => {
			const container = document.querySelector('.custom-scroll');
			if(container) container.scrollTop = container.scrollHeight;
		}, 100);
	}

	function updateData(id, field, value) {
		const item = transcriptData.find(x => x.id === id);
		if (item) {
			if (field === 'sks') {
				value = parseInt(value);
				if(isNaN(value) || value < 1) value = 0; 
			}
			item[field] = value;
			renderTable(); 
		}
	}

	function deleteRow(id) {
		transcriptData = transcriptData.filter(x => x.id !== id);
		renderTable();
	}

	function resetData() {
		if(confirm("Hapus semua data?")) {
			transcriptData = [];
			renderTable();
		}
	}

	function sortCourses(criteria) {
		switch (criteria) {
			case 'name_asc':
				transcriptData.sort((a, b) => a.name.localeCompare(b.name));
				break;
			case 'grade_desc': 
				transcriptData.sort((a, b) => (gradeWeights[b.grade] || 0) - (gradeWeights[a.grade] || 0));
				break;
			case 'grade_asc': 
				transcriptData.sort((a, b) => (gradeWeights[a.grade] || 0) - (gradeWeights[b.grade] || 0));
				break;
			case 'sks_desc': 
				transcriptData.sort((a, b) => b.sks - a.sks);
				break;
			default:
				transcriptData.sort((a, b) => a.id - b.id);
				break;
		}
		renderTable();
	}


	// --- UI RENDERING ---

	function renderTable() {
		if (transcriptData.length === 0) {
			mainContent.classList.add('hidden');
			emptyState.classList.remove('hidden');
			return;
		} else {
			mainContent.classList.remove('hidden');
			emptyState.classList.add('hidden');
		}

		tbody.innerHTML = '';
		
		let totalSKS = 0;
		let totalPoints = 0;

		transcriptData.forEach((item, index) => {
			const bobot = gradeWeights[item.grade] || 0;
			const mutu = (item.sks * bobot).toFixed(2);
			
			// Warna text grade
			let gradeColorClass = "text-white";
			// Cek Nilai Jelek (D, E, atau nilai C kebawah jika mau)
			if(['D','E'].includes(item.grade)) gradeColorClass = "text-rose-400 font-bold";
			else if(['A','A-'].includes(item.grade)) gradeColorClass = "text-emerald-400 font-bold";

			const row = document.createElement('tr');
			row.className = "hover:bg-slate-800/50 transition-colors border-b border-slate-700/50";
			row.innerHTML = `
				<td class="p-3 text-center text-slate-500 font-mono text-xs">${index + 1}</td>
				<td class="p-3">
					<input type="text" value="${item.name}" 
						onchange="updateData(${item.id}, 'name', this.value)"
						class="w-full bg-transparent border-none text-white text-sm focus:ring-0 placeholder-slate-600 font-medium" 
						placeholder="Nama Matkul...">
				</td>
				<td class="p-3 text-center">
					<input type="number" value="${item.sks}" min="1" max="6"
						onchange="updateData(${item.id}, 'sks', this.value)"
						class="w-10 bg-slate-900 border border-slate-700 rounded text-center text-white text-xs py-1 focus:border-indigo-500 focus:outline-none">
				</td>
				<td class="p-3">
					<select onchange="updateData(${item.id}, 'grade', this.value)"
						class="w-full bg-slate-900 border border-slate-600 ${gradeColorClass} text-xs rounded px-2 py-1.5 focus:border-indigo-500 focus:outline-none cursor-pointer appearance-none font-bold text-center">
						${generateGradeOptions(item.grade)}
					</select>
				</td>
				<td class="p-3 text-center font-mono font-bold text-indigo-400 text-sm">
					${mutu}
				</td>
				<td class="p-3 text-center">
					<button onclick="deleteRow(${item.id})" class="text-slate-600 hover:text-rose-500 transition-colors p-1">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
					</button>
				</td>
			`;
			tbody.appendChild(row);

			totalSKS += parseInt(item.sks);
			totalPoints += parseFloat(mutu);
		});

		updateStatsUI(totalSKS, totalPoints);
	}

	function generateGradeOptions(selected) {
		return Object.keys(gradeWeights).map(grade => 
			`<option value="${grade}" ${grade === selected ? 'selected' : ''} class="bg-slate-900 text-white font-mono">
				${grade}
			</option>`
		).join('');
	}

	function updateStatsUI(totalSKS, totalPoints) {
		const ipk = totalSKS === 0 ? 0 : (totalPoints / totalSKS);
		
		const ipkEl = document.getElementById('stat-ipk');
		ipkEl.innerText = ipk.toFixed(2);
		
		if(ipk >= 3.5) ipkEl.className = "text-4xl font-extrabold text-emerald-400 drop-shadow-lg";
		else if(ipk >= 3.0) ipkEl.className = "text-4xl font-extrabold text-indigo-400";
		else if(ipk >= 2.0) ipkEl.className = "text-4xl font-extrabold text-yellow-400";
		else ipkEl.className = "text-4xl font-extrabold text-rose-400";

		document.getElementById('stat-sks').innerText = totalSKS;
		document.getElementById('stat-poin').innerText = totalPoints.toFixed(2);

		const percentage = Math.min((totalSKS / 144) * 100, 100);
		const progressEl = document.getElementById('sks-progress');
		progressEl.style.width = `${percentage}%`;
		
		if(percentage >= 100) progressEl.className = "bg-emerald-500 h-2 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]";
		else progressEl.className = "bg-indigo-500 h-2 rounded-full transition-all duration-500";
	}

	function showDashboard() {
		emptyState.classList.add('hidden');
		mainContent.classList.remove('hidden');
	}

	// --- FITUR ANALISIS CERDAS ---

	// --- FITUR ANALISIS CERDAS V2 (REALISTIC ENGINE) ---

	function analyzeTranscript() {
		if (transcriptData.length === 0) {
			alert("Data kosong! Masukkan data transkrip dulu.");
			return;
		}

		const analysisSection = document.getElementById('analysis-section');
		analysisSection.classList.remove('hidden');
		analysisSection.scrollIntoView({ behavior: 'smooth' });

		// 1. DATA EKSISTING
		let totalSKS = 0;
		let totalPoin = 0;
		let coursesToFix = []; // Matkul yang nilainya bukan A (Potensi perbaikan)

		transcriptData.forEach(item => {
			const bobot = gradeWeights[item.grade] || 0;
			totalSKS += parseInt(item.sks);
			totalPoin += (item.sks * bobot);

			// Identifikasi Matkul yang bisa diperbaiki (Nilai < 4.0)
			// Kita hitung "Potensi Gain" jika matkul ini diulang jadi A
			if (bobot < 4.0) {
				coursesToFix.push({
					...item,
					currentPoint: bobot,
					gain: (4.0 - bobot) * item.sks, // Berapa poin nambah kalau jadi A
					type: (['D', 'E', 'T'].includes(item.grade)) ? 'WAJIB' : 'OPSIONAL'
				});
			}
		});

		const currentIPK = totalSKS > 0 ? (totalPoin / totalSKS) : 0;

		// 2. RENDER PROGRESS KELULUSAN (Sama seperti sebelumnya)
		document.getElementById('analysis-sks').innerText = totalSKS;
		const progress = Math.min((totalSKS / 144) * 100, 100);
		document.getElementById('analysis-progress').style.width = `${progress}%`;
		
		// Predikat
		let predikat = "";
		let color = "";
		if(currentIPK >= 3.51) { predikat = "CUMLAUDE"; color = "text-emerald-400"; }
		else if(currentIPK >= 3.00) { predikat = "SANGAT MEMUASKAN"; color = "text-indigo-400"; }
		else if(currentIPK >= 2.76) { predikat = "MEMUASKAN"; color = "text-blue-400"; }
		else if(currentIPK >= 2.00) { predikat = "CUKUP"; color = "text-yellow-400"; }
		else { predikat = "BAHAYA (DO)"; color = "text-rose-500"; }
		
		document.getElementById('analysis-predikat').innerHTML = `<span class="${color}">${predikat}</span>`;
		document.getElementById('analysis-graduate-msg').innerText = totalSKS >= 144 ? 
			"SKS Lulus terpenuhi." : `Kurang ${144 - totalSKS} SKS lagi menuju 144.`;


		// 3. RENDER SARAN PERBAIKAN (Urutkan dari Gain terbesar)
		// Prioritas: Matkul E/D (Wajib), lalu matkul SKS besar nilai C (High Gain)
		coursesToFix.sort((a, b) => b.gain - a.gain);

		const retakeListEl = document.getElementById('analysis-retake-list');
		retakeListEl.innerHTML = "";
		
		// Filter hanya matkul D/E untuk list "Wajib Ulang"
		const dangerCourses = coursesToFix.filter(c => c.type === 'WAJIB');
		
		if (dangerCourses.length > 0) {
			dangerCourses.forEach(mk => {
				retakeListEl.innerHTML += `
					<div class="flex justify-between items-center bg-rose-900/20 p-2 rounded border border-rose-500/30 mb-1">
						<span class="text-rose-200 font-bold text-xs">${mk.name} (${mk.sks} SKS)</span>
						<span class="text-xs bg-rose-500 text-white px-2 py-1 rounded font-mono">${mk.grade} ➝ A?</span>
					</div>`;
			});
		} else {
			retakeListEl.innerHTML = `<div class="text-emerald-400 text-xs flex items-center gap-2"><span class="text-lg">✅</span> Aman! Tidak ada nilai D/E.</div>`;
		}


		// 4. KALKULATOR STRATEGI (THE REAL LOGIC)
		const strategyEl = document.getElementById('analysis-strategy');
		
		// Skenario Realistis: Sisa jatah SKS untuk mencapai 144
		const sisaSlotSKS = Math.max(0, 144 - totalSKS);
		
		// Simulasi: Berapa Max IPK yang mungkin dicapai user?
		// Jika dia ambil sisa SKS (dapat A) + Mengulang SEMUA matkul jelek jadi A
		const potentialNewPoints = sisaSlotSKS * 4.0;
		const potentialFixPoints = coursesToFix.reduce((sum, item) => sum + item.gain, 0);
		const maxPossibleIPK = (totalPoin + potentialNewPoints + potentialFixPoints) / 144;

		let strategyHTML = "";

		// LOGIKA PERHITUNGAN TARGET
		if (currentIPK >= 3.51) {
			strategyHTML = `<p class="text-emerald-400 font-bold">Posisi Aman!</p><p>Pertahankan saja nilai Anda. Anda sudah di level Cum Laude.</p>`;
		} else {
			// Tentukan Target Realistis berikutnya (3.0 atau 3.25 atau 3.5)
			let target = currentIPK < 3.0 ? 3.0 : (currentIPK < 3.25 ? 3.25 : 3.5);
			if (maxPossibleIPK < target) target = maxPossibleIPK; // Jangan kasih harapan palsu

			// --- ALGORITMA PENCARI SOLUSI TERCEPAT ---
			// Langkah 1: Isi slot kosong (Matkul Baru) dulu karena menambah penyebut & pembilang (biasanya boost bagus)
			let simSKS = totalSKS;
			let simPoin = totalPoin;
			let actionSteps = [];

			// Phase 1: Ambil Matkul Baru (jika ada slot)
			if (sisaSlotSKS > 0) {
				simSKS += sisaSlotSKS;
				simPoin += (sisaSlotSKS * 4.0); // Asumsi dapat A
				actionSteps.push(`Ambil <b>${sisaSlotSKS} SKS Baru</b> (Wajib A).`);
			}

			let currentSimIPK = simPoin / simSKS;

			// Phase 2: Jika IPK masih kurang, mulai MENGULANG (Retake)
			// Kita ambil dari list 'coursesToFix' yang sudah disortir berdasarkan GAIN terbesar
			let retakeCount = 0;
			let retakeCredits = 0;

			for (let course of coursesToFix) {
				if (currentSimIPK >= target) break; // Target tercapai

				// Simulasi Retake: Poin lama hilang, Poin baru (A) masuk. SKS TETAP.
				// Rumus: PoinBaru = PoinLama + Gain
				simPoin += course.gain; 
				currentSimIPK = simPoin / simSKS; // Pembagi SKS tidak bertambah karena ini retake
				
				retakeCount++;
				retakeCredits += parseInt(course.sks);
			}

			// --- MENYUSUN KALIMAT SARAN ---
			strategyHTML = `
				<div class="mb-3 border-b border-slate-700 pb-2">
					<span class="text-xs text-slate-400">Target Realistis:</span>
					<span class="text-xl font-bold text-white">${target.toFixed(2)}</span>
					<span class="text-[10px] text-slate-500 block">(Max matematis: ${maxPossibleIPK.toFixed(2)})</span>
				</div>
				<ul class="space-y-2 text-sm text-slate-300 list-disc pl-4">
			`;

			if (sisaSlotSKS > 0) {
				strategyHTML += `<li>Ambil <b>${sisaSlotSKS} SKS Matkul Baru</b> (Wajib A) untuk memenuhi kuota 144 SKS.</li>`;
			} else {
				strategyHTML += `<li class="text-yellow-400">Kuota SKS Lulus (144) sudah penuh/hampir penuh. Fokus Anda sekarang adalah <b>MENGULANG (RETAKE)</b>.</li>`;
			}

			if (retakeCount > 0) {
				strategyHTML += `
					<li>
						Anda perlu mengulang/memperbaiki sekitar <b>${retakeCount} mata kuliah</b> 
						(Total ${retakeCredits} SKS) yang nilainya C/D menjadi A.
					</li>
					<li class="italic text-xs text-indigo-300">
						Saran: Prioritaskan mengulang matkul SKS besar yang nilainya paling jelek dulu (Lihat tabel di atas).
					</li>
				`;
			} else if (currentSimIPK >= target) {
				strategyHTML += `<li class="text-emerald-400">Target tercapai hanya dengan mengambil matkul baru!</li>`;
			} else {
				strategyHTML += `<li class="text-rose-400">Target ${target} sangat sulit dicapai. Coba set target lebih rendah.</li>`;
			}
			strategyHTML += `</ul>`;
		}

		strategyEl.innerHTML = strategyHTML;
	}