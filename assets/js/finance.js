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
		// =========================================
        // 1. INISIALISASI STATE & KONSTANTA
        // =========================================
        const STORAGE_KEY = 'ariesFinFlowData_v1';
        let appData = {
            books: [
                { id: 'book_default', name: 'Dompet Utama' }
            ],
            activeBookId: 'book_default',
            transactions: []
        };

        const CATEGORIES = {
            'in': ['Gaji', 'Bonus/Tunjangan', 'Penjualan', 'Investasi', 'Lainnya Masuk'],
            'out': ['Makan & Minum', 'Transportasi', 'Tempat Tinggal', 'Tagihan & Utilitas', 'Belanja Kebutuhan', 'Hiburan', 'Kesehatan', 'Pendidikan', 'Amal/Donasi', 'Lainnya Keluar']
        };

        let expenseChartInstance = null;

        // =========================================
        // 2. FUNGSI UTILITAS (Helper)
        // =========================================
        const formatIDR = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
        const getTodayDateString = () => new Date().toISOString().split('T')[0];
        const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

        // =========================================
        // 3. CORE DATA FUNCTIONS (LocalStorage)
        // =========================================
        function loadData() {
            const storedJson = localStorage.getItem(STORAGE_KEY);
            if (storedJson) {
                try {
                    appData = JSON.parse(storedJson);
                    // Validasi struktur dasar
                    if(!appData.books || !appData.transactions) throw new Error("Struktur data tidak valid");
                    
                    // --- PERBAIKAN UTAMA DI SINI ---
                    // Setelah data berhasil dimuat, langsung update tampilan!
                    updateUI(); 
                    // -------------------------------

                } catch (e) {
                    console.error("Data korup, reset ke default:", e);
                    saveData(); // Reset jika error (saveData sudah memanggil updateUI)
                }
            } else {
                saveData(); // Simpan default pertama kali (saveData sudah memanggil updateUI)
            }
        }

        // =========================================
        // LOGIKA TRAFFIC: SESI 24 JAM
        // =========================================
        const SESSION_DURATION = 4 * 60 * 60 * 1000; // 24 Jam dalam milidetik

        function checkSessionValidity() {
            // 1. Cek kapan terakhir kali user buka/refresh halaman ini
            let lastSession = localStorage.getItem('aries_session_timestamp');
            const now = new Date().getTime();

            // Jika belum ada timestamp (baru pertama buka), set sekarang
            if (!lastSession) {
                lastSession = now;
                localStorage.setItem('aries_session_timestamp', now);
            }

            // 2. Hitung selisih waktu
            const timeDiff = now - parseInt(lastSession);

            // 3. Jika sudah lewat 24 jam (Session Expired)
            if (timeDiff > SESSION_DURATION) {
                // Tampilkan pesan paksaan halus
                if(confirm("⚠️ SESI BERAKHIR\n\nDemi keamanan data dan pembaruan sistem, aplikasi perlu dimuat ulang setiap 24 jam.\n\nKlik OK untuk Refresh halaman sekarang.")) {
                    // Reset waktu dan reload halaman (Nambah Traffic!)
                    localStorage.setItem('aries_session_timestamp', now);
                    location.reload(); 
                }
                return false; // Blokir aksi simpan
            }

            // Jika masih dalam periode 24 jam, update timestamp agar sesi diperpanjang
            // ATAU: Jangan update timestamp jika ingin strict 24 jam hard limit.
            // Di sini kita pilih opsi Strict: User WAJIB refresh besoknya.
            
            return true; // Lanjut boleh simpan
        }

        // =========================================
        // MODIFIKASI FUNGSI SAVE DATA
        // =========================================
        function saveData() {
            // Cek Sesi Dulu!
            if (!checkSessionValidity()) {
                return; // Berhenti di sini kalau sesi habis
            }

            // Jika sesi aman, lanjut simpan
            localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
            
            // Update UI seperti biasa
            updateUI(); 
            
            // Opsional: Feedback visual kecil
            // alert("Data tersimpan!"); 
        }

        
        function getActiveTransactions() {
            return appData.transactions
                .filter(tx => tx.bookId === appData.activeBookId)
                .sort((a, b) => new Date(b.date) - new Date(a.date));
        }

        // =========================================
        // 4. UI UPDATES & RENDERING
        // =========================================
        function updateUI() {
            // 1. Update Book Selector
            const bookSelector = document.getElementById('bookSelector');
            bookSelector.innerHTML = appData.books.map(book => 
                `<option value="${book.id}" ${book.id === appData.activeBookId ? 'selected' : ''}>📘 ${book.name}</option>`
            ).join('');

            // 2. Hitung Saldo
            const currentTx = getActiveTransactions();
            let totalIn = 0, totalOut = 0;
            currentTx.forEach(tx => {
                tx.type === 'in' ? totalIn += Number(tx.amount) : totalOut += Number(tx.amount);
            });

            document.getElementById('totalIncomeDisplay').innerText = formatIDR(totalIn);
            document.getElementById('totalExpenseDisplay').innerText = formatIDR(totalOut);
            document.getElementById('balanceDisplay').innerText = formatIDR(totalIn - totalOut);

            // 3. Render Tabel & Chart
            renderTable(currentTx);
            renderExpenseChart(currentTx);
        }

        function renderTable(transactions) {
            const tableBody = document.getElementById('transactionTableBody');
            const emptyState = document.getElementById('emptyRowState');

            if (transactions.length === 0) {
                tableBody.innerHTML = '';
                tableBody.appendChild(emptyState);
                emptyState.classList.remove('hidden');
                return;
            }

            emptyState.classList.add('hidden');
            tableBody.innerHTML = transactions.map(tx => {
                const isIncome = tx.type === 'in';
                const amountClass = isIncome ? 'text-emerald-400' : 'text-rose-400';
                const iconClass = isIncome ? 'fa-arrow-down-long text-emerald-500' : 'fa-arrow-up-long text-rose-500';
                const formattedDate = new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' });

                return `
                    <tr class="hover:bg-slate-800/30 transition-colors group">
                        <td class="px-5 py-3 font-mono text-xs whitespace-nowrap">${formattedDate}</td>
                        <td class="px-5 py-3">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                                    <i class="fa-solid ${iconClass} text-xs"></i>
                                </div>
                                <div>
                                    <div class="font-bold text-slate-200">${tx.category}</div>
                                    ${tx.note ? `<div class="text-xs text-slate-500 italic truncate max-w-[200px]">${tx.note}</div>` : ''}
                                </div>
                            </div>
                        </td>
                        <td class="px-5 py-3 text-right font-mono font-bold ${amountClass}">
                            ${isIncome ? '+' : '-'} ${formatIDR(tx.amount).replace('Rp', '')}
                        </td>
                         <td class="px-5 py-3 text-center">
                            <button onclick="deleteTransaction('${tx.id}')" class="text-slate-600 hover:text-rose-500 transition-colors p-2 rounded hover:bg-rose-500/10 opacity-0 group-hover:opacity-100" title="Hapus Transaksi">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        function renderExpenseChart(transactions) {
            const chartCanvas = document.getElementById('expenseChart');
            const emptyState = document.getElementById('chartEmptyState');

            const now = new Date();
            const expenseTx = transactions.filter(tx => {
                const txDate = new Date(tx.date);
                return tx.type === 'out' && txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
            });

            if (expenseTx.length === 0) {
                chartCanvas.classList.add('hidden');
                emptyState.classList.remove('hidden');
                if(expenseChartInstance) expenseChartInstance.destroy();
                return;
            }

            chartCanvas.classList.remove('hidden');
            emptyState.classList.add('hidden');

            const categoryTotals = {};
            expenseTx.forEach(tx => categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + Number(tx.amount));

            if (expenseChartInstance) expenseChartInstance.destroy();

            expenseChartInstance = new Chart(chartCanvas, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(categoryTotals),
                    datasets: [{
                        data: Object.values(categoryTotals),
                        backgroundColor: ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6'],
                        borderWidth: 0, hoverOffset: 10
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 12 } },
                        tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatIDR(ctx.raw)}` } }
                    },
                    cutout: '70%'
                }
            });
        }

        function updateCategoryOptions() {
            const type = document.querySelector('input[name="type"]:checked').value;
            document.getElementById('inputCategory').innerHTML = CATEGORIES[type].map(cat => `<option value="${cat}">${cat}</option>`).join('');
        }

        // =========================================
        // 5. EVENT HANDLERS & ACTIONS
        // =========================================
        document.getElementById('bookSelector').addEventListener('change', (e) => {
            appData.activeBookId = e.target.value;
            saveData(); // Simpan preference buku terakhir dan update UI
        });

        document.querySelectorAll('input[name="type"]').forEach(radio => {
            radio.addEventListener('change', updateCategoryOptions);
        });

        document.getElementById('transactionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const amountElem = document.getElementById('inputAmount');
            const dateElem = document.getElementById('inputDate');
            if (!amountElem.value || !dateElem.value) return alert("Jumlah dan Tanggal wajib diisi!");

            appData.transactions.unshift({
                id: generateId(),
                bookId: appData.activeBookId,
                type: document.querySelector('input[name="type"]:checked').value,
                amount: Number(amountElem.value),
                date: dateElem.value,
                category: document.getElementById('inputCategory').value,
                note: document.getElementById('inputNote').value.trim()
            });

            saveData();
            e.target.reset();
            dateElem.value = getTodayDateString();
            updateCategoryOptions();
        });

        function createNewBook() {
            const bookName = prompt("Nama buku baru:");
            if (bookName && bookName.trim() !== "") {
                const newId = generateId();
                appData.books.push({ id: newId, name: bookName.trim() });
                appData.activeBookId = newId;
                saveData();
            }
        }

        function deleteTransaction(id) {
            if(confirm("Hapus transaksi ini?")) {
                appData.transactions = appData.transactions.filter(tx => tx.id !== id);
                saveData();
            }
        }

        function clearCurrentBookData() {
            if(confirm("Hapus SEMUA data di buku ini?")) {
                appData.transactions = appData.transactions.filter(tx => tx.bookId !== appData.activeBookId);
                saveData();
            }
        }

        // =========================================
        // 6. EXPORT FUNCTIONS (Updated)
        // =========================================
        
        // Helper: Filter data berdasarkan Picker Bulan
        function getFilteredExportData() {
            let transactions = getActiveTransactions(); // Ambil semua data buku aktif
            const monthPicker = document.getElementById('exportMonthPicker').value; // Format: "YYYY-MM"

            if (transactions.length === 0) {
                alert("Tidak ada data transaksi di buku ini.");
                return null;
            }

            // Jika user memilih bulan, filter datanya
            let periodeLabel = "Semua Periode";
            if (monthPicker) {
                const [year, month] = monthPicker.split('-');
                transactions = transactions.filter(tx => {
                    const d = new Date(tx.date);
                    return d.getFullYear() === parseInt(year) && (d.getMonth() + 1) === parseInt(month);
                });
                
                // Format label bulan (misal: "Februari 2026")
                const dateObj = new Date(year, month - 1);
                periodeLabel = dateObj.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

                if (transactions.length === 0) {
                    alert(`Tidak ada data transaksi pada periode ${periodeLabel}.`);
                    return null;
                }
            }

            // Hitung Ringkasan (Total)
            let totalIn = 0, totalOut = 0;
            transactions.forEach(tx => {
                if (tx.type === 'in') totalIn += Number(tx.amount);
                else totalOut += Number(tx.amount);
            });

            return { transactions, periodeLabel, totalIn, totalOut, balance: totalIn - totalOut };
        }

        // Export Excel (Lengkap dengan Total)
        function exportToExcel() {
            const data = getFilteredExportData();
            if (!data) return;

            const { transactions, periodeLabel, totalIn, totalOut, balance } = data;

            // 1. Format Data Utama
            const excelRows = transactions.map(tx => ({
                Tanggal: tx.date,
                Tipe: tx.type === 'in' ? 'Pemasukan' : 'Pengeluaran',
                Kategori: tx.category,
                Catatan: tx.note || '-',
                Jumlah: tx.amount
            }));

            // 2. Tambahkan Baris Kosong & Ringkasan di Bawah
            excelRows.push(
                { Tanggal: '', Tipe: '', Kategori: '', Catatan: '', Jumlah: '' }, // Spasi
                { Tanggal: 'RINGKASAN', Tipe: '', Kategori: '', Catatan: 'Total Pemasukan', Jumlah: totalIn },
                { Tanggal: '', Tipe: '', Kategori: '', Catatan: 'Total Pengeluaran', Jumlah: totalOut },
                { Tanggal: '', Tipe: '', Kategori: '', Catatan: 'SISA SALDO', Jumlah: balance }
            );

            const worksheet = XLSX.utils.json_to_sheet(excelRows);
            const workbook = XLSX.utils.book_new();
            
            // Auto-width kolom sederhana
            const wscols = [{wch:12}, {wch:12}, {wch:20}, {wch:30}, {wch:15}];
            worksheet['!cols'] = wscols;

            XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan");

            // Nama file dinamis
            const safeName = appData.books.find(b => b.id === appData.activeBookId).name.replace(/\s+/g, '_');
            const safePeriode = periodeLabel.replace(/\s+/g, '_');
            XLSX.writeFile(workbook, `FinFlow_${safeName}_${safePeriode}.xlsx`);
        }

        // Export PDF (Desain Laporan Resmi)
        function exportToPDF() {
            const data = getFilteredExportData();
            if (!data) return;

            const { transactions, periodeLabel, totalIn, totalOut, balance } = data;
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const bookName = appData.books.find(b => b.id === appData.activeBookId).name;

            // --- HEADER LAPORAN ---
            doc.setFillColor(15, 23, 42); // Warna Slate-900 header block
            doc.rect(0, 0, 210, 40, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(18);
            doc.text(`Laporan Keuangan: ${bookName}`, 14, 18);
            
            doc.setFontSize(10);
            doc.setTextColor(148, 163, 184); // Slate-400
            doc.text(`Periode Laporan: ${periodeLabel}`, 14, 26);
            doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 32);

            // --- KOTAK RINGKASAN (SUMMARY BOX) ---
            let startY = 50;
            
            // Pemasukan
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            doc.text("Total Pemasukan", 14, startY);
            doc.setTextColor(16, 185, 129); // Emerald
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text(formatIDR(totalIn), 14, startY + 6);

            // Pengeluaran
            doc.setFont(undefined, 'normal');
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            doc.text("Total Pengeluaran", 80, startY);
            doc.setTextColor(244, 63, 94); // Rose
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text(formatIDR(totalOut), 80, startY + 6);

            // Saldo
            doc.setFont(undefined, 'normal');
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            doc.text("Saldo Akhir", 150, startY);
            doc.setTextColor(67, 56, 202); // Indigo
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text(formatIDR(balance), 150, startY + 6);

            // --- TABEL TRANSAKSI ---
            doc.autoTable({
                head: [["Tanggal", "Tipe", "Kategori", "Catatan", "Jumlah"]],
                body: transactions.map(tx => [
                    tx.date, 
                    tx.type === 'in' ? 'Masuk' : 'Keluar', 
                    tx.category, 
                    tx.note || '', 
                    formatIDR(tx.amount).replace('Rp', '').trim()
                ]),
                startY: startY + 15,
                theme: 'grid',
                styles: { fontSize: 9, cellPadding: 3 },
                headStyles: { fillColor: [30, 41, 59], textColor: 255 }, // Slate-800
                columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } },
                didParseCell: function (data) {
                    // Mewarnai teks tipe transaksi
                    if (data.section === 'body' && data.column.index === 1) {
                        data.cell.styles.textColor = data.cell.raw === 'Masuk' ? [16, 185, 129] : [244, 63, 94];
                    }
                }
            });

            // Footer
            const pageCount = doc.internal.getNumberOfPages();
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Halaman 1 dari ${pageCount} | Dibuat dengan Aries FinFlow`, 14, doc.internal.pageSize.height - 10);

            doc.save(`Laporan_${bookName}_${periodeLabel.replace(/\s+/g, '_')}.pdf`);
        }

        // =========================================
        // 7. MAIN ENTRY POINT
        // =========================================
        document.addEventListener('DOMContentLoaded', () => {
            document.getElementById('inputDate').value = getTodayDateString();
            updateCategoryOptions();
            loadData(); // <-- FUNGSI INI SEKARANG SUDAH MEMANGGIL updateUI() DI DALAMNYA
			localStorage.setItem('aries_session_timestamp', new Date().getTime());
        });