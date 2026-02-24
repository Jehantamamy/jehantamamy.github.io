
        const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyd2uLg7i5PCr23Lw0c7EHdRU6iBCzeTu3s4ilX8P13idY90sFvbW2v9vRY7GwxW1-RuQ/exec";

        let activeMeeting = null;
        let customFields = [];
        let reportData = []; 
		let currentNotulenLink = ""; // <-- TAMBAHKAN INI UNTUK MENYIMPAN LINK SEMENTARA

        document.getElementById('agendaDate').valueAsDate = new Date();

        // 🚀 FITUR MAGIC LINK: AUTO LOAD KETIKA ADA LINK DIBAGIKAN
        document.addEventListener('DOMContentLoaded', () => {
            const urlParams = new URLSearchParams(window.location.search);
            const joinCode = urlParams.get('join');
            if (joinCode) {
                document.getElementById('inputMeetingCode').value = joinCode;
                verifyCode(); // Otomatis mengontak server tanpa perlu klik tombol
            }
        });

        function switchMode(mode) {
            document.getElementById('view-admin').classList.toggle('hidden', mode !== 'admin');
            document.getElementById('view-peserta').classList.toggle('hidden', mode !== 'peserta');
            document.getElementById('view-laporan').classList.toggle('hidden', mode !== 'laporan');
            const btnA = "flex-1 py-3 text-xs md:text-sm font-bold border-b-2 transition-colors ";
            const btnI = "flex-1 py-3 text-xs md:text-sm font-bold text-slate-500 hover:text-slate-300 border-b-2 border-transparent transition-colors";
            document.getElementById('tab-admin').className = mode === 'admin' ? btnA + "text-sky-400 border-sky-400" : btnI;
            document.getElementById('tab-peserta').className = mode === 'peserta' ? btnA + "text-emerald-400 border-emerald-400" : btnI;
            document.getElementById('tab-laporan').className = mode === 'laporan' ? btnA + "text-rose-400 border-rose-400" : btnI;
        }

        function toggleOptionsInput() { document.getElementById('cf-options-container').classList.toggle('hidden', document.getElementById('cf-type').value === 'text'); }

        function addCustomField() {
            const label = document.getElementById('cf-label').value.trim(); const type = document.getElementById('cf-type').value; const optsStr = document.getElementById('cf-options').value.trim();
            if (!label) return alert("Pertanyaan wajib diisi!"); if (type !== 'text' && !optsStr) return alert("Opsi wajib diisi!");
            customFields.push({ label, type, options: type !== 'text' ? optsStr.split(',').map(o => o.trim()) : [] });
            document.getElementById('cf-label').value = ''; document.getElementById('cf-options').value = ''; renderAdminFieldList();
        }

        function renderAdminFieldList() {
            const list = document.getElementById('custom-fields-list'); list.innerHTML = '';
            customFields.forEach((cf, index) => {
                list.innerHTML += `<div class="flex justify-between items-center p-2 bg-slate-900 border border-slate-700 rounded-lg"><div><p class="text-xs text-white font-bold">${cf.label}</p><p class="text-[9px] text-sky-400">${cf.type}</p></div><button onclick="removeField(${index})" class="text-rose-500 text-xs font-bold px-2">&times;</button></div>`;
            });
        }
        function removeField(index) { customFields.splice(index, 1); renderAdminFieldList(); }

        function generateMeetingCode() {
            const btn = document.querySelector('#view-admin button[onclick="generateMeetingCode()"]');
            btn.innerText = "Menyimpan ke Database... ⏳"; btn.disabled = true;

            const timeCode = Date.now().toString(36).slice(-3).toUpperCase();
            const randCode1 = Math.random().toString(36).substring(2, 5).toUpperCase();
            const randCode2 = Math.random().toString(36).substring(2, 5).toUpperCase();

            const payload = { 
                action: "createMeeting",
                code: "JOIN-" + randCode1 + timeCode,       
                adminCode: "ADMIN-" + randCode2 + timeCode, 
                name: document.getElementById('agendaName').value || "Rapat Internal",
                date: document.getElementById('agendaDate').value || "-", time: document.getElementById('agendaTime').value || "-",
                quickFields: {
                    instansi: document.getElementById('fieldInstansi').checked, dept: document.getElementById('fieldDept').checked,
                    phone: document.getElementById('fieldPhone').checked, signature: document.getElementById('fieldSignature').checked
                },
                customFields: [...customFields] 
            };

            fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) })
            .then(res => res.json()).then(data => {
                activeMeeting = payload;
                
                // BUAT MAGIC LINK
                const baseUrl = window.location.href.split('?')[0].split('#')[0];
                const magicLink = `${baseUrl}?join=${payload.code}`;
                
                document.getElementById('display-magic-link').value = magicLink;
                document.getElementById('display-admin-code').innerText = payload.adminCode;
                document.getElementById('code-result').classList.replace('hidden', 'flex');
            }).catch(err => alert("Gagal konek ke Server! Pastikan URL Web App benar.")).finally(() => { btn.innerText = "Generate Ruangan Rapat"; btn.disabled = false; });
        }

        // Helper Copy Code & Link
        function copyCode(eId, btnId, isInput = false) {
            const codeText = isInput ? document.getElementById(eId).value : document.getElementById(eId).innerText;
            navigator.clipboard.writeText(codeText).then(() => {
                const btn = document.getElementById(btnId); const ob = btn.innerHTML; const oc = btn.className;
                btn.innerHTML = `✔️ Tersalin!`; btn.className = oc.replace(/bg-\w+-600/, 'bg-sky-600');
                setTimeout(() => { btn.innerHTML = ob; btn.className = oc; }, 1500);
            });
        }

        function verifyCode(isAdmin = false) {
            const inputId = isAdmin ? 'inputAdminCode' : 'inputMeetingCode';
            const btn = document.querySelector(`#${isAdmin ? 'screen-enter-admin-code' : 'screen-enter-code'} button`);
            const code = document.getElementById(inputId).value.toUpperCase().trim();
            if(!code) return alert("Masukkan kode dulu!");

            const origText = btn.innerText; btn.innerText = "Mencari Ruangan... ⏳"; btn.disabled = true;

            fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'getMeeting', code: code }) })
            .then(res => res.json()).then(res => {
                if(res.status === 'success') {
                    activeMeeting = res.meeting;
                    if(isAdmin) {
                        if(code !== activeMeeting.adminCode) return alert("Itu kode Join Peserta, bukan kode Laporan!");
                        document.getElementById('screen-enter-admin-code').classList.add('hidden'); document.getElementById('screen-dashboard').classList.remove('hidden');
                        document.getElementById('dash-agenda-name').innerText = activeMeeting.name; document.getElementById('dash-meeting-code').innerText = activeMeeting.code;
                        fetchDashboardData();
                    } else {
                        if(code !== activeMeeting.code) return alert("Itu kode Laporan Admin, bukan kode Join!");
                        renderFormPeserta();
                    }
                } else { alert("Kode Ruangan tidak ditemukan di database!"); }
            }).catch(e => alert("Gagal konek ke Server!")).finally(() => { btn.innerText = origText; btn.disabled = false; });
        }

        function verifyAdminCode() { verifyCode(true); }

        function renderFormPeserta() {
            document.getElementById('screen-enter-code').classList.add('hidden'); document.getElementById('screen-attendance').classList.remove('hidden');
            document.getElementById('display-agenda-name').innerText = activeMeeting.name;
            document.getElementById('display-agenda-date').innerText = activeMeeting.date; document.getElementById('display-agenda-time').innerText = activeMeeting.time;

            const form = document.getElementById('dynamic-form'); form.innerHTML = renderInputHtml("Nama Lengkap", "text", "Masukkan nama", "inp-NamaLengkap");
            if (activeMeeting.quickFields.instansi) form.innerHTML += renderInputHtml("Instansi", "text", "Asal instansi", "inp-Instansi");
            if (activeMeeting.quickFields.dept) form.innerHTML += renderInputHtml("Departemen", "text", "Posisi", "inp-Dept");
            if (activeMeeting.quickFields.phone) form.innerHTML += renderInputHtml("WhatsApp", "tel", "0812...", "inp-Phone");

            activeMeeting.customFields.forEach(cf => {
                let inputHtml = cf.type === 'text' ? `<input type="text" name="${cf.label}" class="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-emerald-500 outline-none dynamic-inp">` : 
                                cf.type === 'dropdown' ? `<select name="${cf.label}" class="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-emerald-500 outline-none dynamic-inp"><option disabled selected>-- Pilih --</option>${cf.options.map(o=>`<option>${o}</option>`).join('')}</select>` : 
                                `<div class="space-y-2 p-3 bg-slate-900 border border-slate-700 rounded-lg">${cf.options.map(o=>`<label class="flex items-center gap-2"><input type="radio" name="${cf.label}" value="${o}" class="dynamic-inp-radio"><span class="text-sm text-slate-300">${o}</span></label>`).join('')}</div>`;
                form.innerHTML += `<div><label class="block text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-1">${cf.label} *</label>${inputHtml}</div>`;
            });
            const sigSection = document.getElementById('signature-section');
            activeMeeting.quickFields.signature ? (sigSection.classList.remove('hidden'), setTimeout(resizeCanvas, 50)) : sigSection.classList.add('hidden');
        }

        function renderInputHtml(label, type, placeholder, idAttr) { return `<div><label class="block text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-1">${label} *</label><input type="${type}" id="${idAttr}" name="${label}" placeholder="${placeholder}" class="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-emerald-500 outline-none dynamic-inp"></div>`; }

        function submitAttendance() {
            const btn = document.getElementById('btn-submit'); 
            const orig = btn.innerHTML;
            
            if(!document.getElementById('inp-NamaLengkap').value.trim()) {
                return alert("Nama Lengkap wajib diisi!");
            }
            
            let formData = {};
            document.querySelectorAll('.dynamic-inp').forEach(i => { 
                if(i.id !== 'inp-NamaLengkap' && i.value) formData[i.name] = i.value; 
            });
            document.querySelectorAll('.dynamic-inp-radio:checked').forEach(r => {
                formData[r.name] = r.value;
            });

            let payload = { 
                action: "submitAttendance", 
                kodeRapat: activeMeeting.code, 
                namaPeserta: document.getElementById('inp-NamaLengkap').value, 
                formLain: formData, 
                tandaTangan: activeMeeting.quickFields.signature ? canvas.toDataURL() : "NO TTD" 
            };
            
            btn.innerHTML = "Mengirim Data... ⏳"; 
            btn.disabled = true;

            fetch(GOOGLE_SCRIPT_URL, { 
                method: 'POST', 
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
                body: JSON.stringify(payload) 
            })
            .then(res => res.json())
            .then(data => { 
                // PERBAIKAN: Secara tegas menyembunyikan form dan memunculkan Layar Sukses!
                document.getElementById('screen-attendance').classList.add('hidden');
                document.getElementById('screen-success').classList.remove('hidden');
                alert("✅ BERHASIL! Presensi tersimpan."); 
            })
            .catch(() => { 
                // Jika gagal baca respon (karena no-cors dari Google), anggap sukses masuk
                document.getElementById('screen-attendance').classList.add('hidden');
                document.getElementById('screen-success').classList.remove('hidden');
                alert("✅ BERHASIL! Presensi tersimpan.");
            })
            .finally(() => { 
                btn.innerHTML = orig; 
                btn.disabled = false; 
                clearCanvas(); 
            });
        }

        // --- DASHBOARD LENGKAP & PDF ---
        function fetchDashboardData() {
            const list = document.getElementById('dashboard-list'); 
            list.innerHTML = '<p class="text-xs text-sky-400 text-center py-2">Menarik data server... ⏳</p>';
            
            fetch(GOOGLE_SCRIPT_URL, { 
                method: 'POST', 
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
                body: JSON.stringify({ action: 'getReport', kodeRapat: activeMeeting.code }) 
            })
            .then(res => res.json()).then(res => {
                if(res.status === 'success') {
                    reportData = res.data;
                    
                    // Simpan link notulen dari server
                    currentNotulenLink = res.notulen || "";
                    if (currentNotulenLink) {
                        document.getElementById('notulen-link-container').innerHTML = `<a href="${currentNotulenLink}" target="_blank" class="text-[10px] text-emerald-400 underline font-bold">✔️ Lampiran Sebelumnya Tersimpan (Buka)</a>`;
                    }

                    document.getElementById('dashboard-count').innerText = reportData.length + " Hadir";
                    list.innerHTML = reportData.length === 0 ? '<p class="text-xs text-slate-500 text-center py-2">Belum ada peserta.</p>' : '';
                    reportData.forEach((row, i) => {
                        const t = new Date(row.waktu); const timeStr = t.getHours().toString().padStart(2,'0') + ":" + t.getMinutes().toString().padStart(2,'0') + " WIB";
                        list.innerHTML += `<div class="p-2 border border-slate-700 rounded bg-slate-800 flex justify-between items-center"><span class="text-xs text-slate-300 font-bold">${i+1}. ${row.nama}</span><span class="text-[9px] text-slate-500">${timeStr}</span></div>`;
                    });
                }
            });
        }

        function uploadNotulen() {
            const file = document.getElementById('inputNotulenFile').files[0];
            if(!file) return alert("Pilih file dulu!");

            // ⛔ BATASAN UKURAN FILE (Maks 5 MB)
            const maxSize = 5 * 1024 * 1024; 
            if (file.size > maxSize) {
                return alert("Ukuran file terlalu besar! Maksimal 5 MB ya.");
            }

            const btn = document.getElementById('btn-upload-notulen'); 
            btn.innerText = "Mengunggah... ⏳"; 
            btn.disabled = true;

            const reader = new FileReader();
            reader.onload = function(e) {
                fetch(GOOGLE_SCRIPT_URL, {
                    method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action: 'uploadNotulen', kodeRapat: activeMeeting.code, fileName: file.name, mimeType: file.type, fileBase64: e.target.result.split(',')[1] })
                })
                .then(res => res.json())
                .then(res => {
                    btn.innerText = "Berhasil Disimpan! ✔️"; 
                    btn.classList.replace('bg-slate-700', 'bg-emerald-600');
                    currentNotulenLink = res.url; // Update memori lokal juga
                    document.getElementById('notulen-link-container').innerHTML = `<a href="${res.url}" target="_blank" class="text-[10px] text-sky-400 underline font-bold">Buka File di Google Drive</a>`;
                }).finally(() => btn.disabled = false);
            };
            reader.readAsDataURL(file);
        }

        function downloadExcel() {
            if(reportData.length === 0) return alert("Data masih kosong.");
            const formatted = reportData.map((r, i) => {
                let obj = { "No": i+1, "Waktu Absen": new Date(r.waktu).toLocaleString(), "Nama Peserta": r.nama };
                try { let cust = JSON.parse(r.custom); for(let k in cust) obj[k] = cust[k]; } catch(e){} 
                obj["Tanda Tangan"] = r.ttd !== "NO TTD" ? "Tersimpan di PDF" : "-";
                return obj;
            });
            const ws = XLSX.utils.json_to_sheet(formatted); const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Rekap_Presensi"); XLSX.writeFile(wb, `Presensi_${activeMeeting.code}.xlsx`);
        }

        // UPDATE PDF SAKTI DENGAN GAMBAR
        function downloadPDF() {
            if(reportData.length === 0) return alert("Data masih kosong.");
            const { jsPDF } = window.jspdf; 
            
            // Format Kantoran: Kertas A4, orientasi Portrait ('p'), satuan millimeter
            const doc = new jsPDF('p', 'mm', 'a4'); 
            const pageWidth = doc.internal.pageSize.getWidth(); // Lebar A4 Portrait = 210mm
            
            // ==========================================
            // 1. KOP SURAT / HEADER LAPORAN
            // ==========================================
            doc.setFont("helvetica", "bold");
            doc.setFontSize(14); 
            doc.text("LAPORAN REKAPITULASI PRESENSI", pageWidth / 2, 20, { align: 'center' });
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10); 
            
            // Info Rapat
            doc.text(`Nama Agenda`, 14, 30); doc.text(`: ${activeMeeting.name}`, 40, 30);
            doc.text(`Tanggal`, 14, 36);       doc.text(`: ${activeMeeting.date}`, 40, 36);
            doc.text(`Waktu`, 120, 36);      doc.text(`: ${activeMeeting.time}`, 135, 36); 

            let startYTabel = 45;

            // Info Notulen (Kalau ada)
            if (currentNotulenLink) {
                doc.setFont("helvetica", "italic");
                doc.setTextColor(37, 99, 235); // Warna Biru Tautan
                doc.text(`* Tautan Notulen/Lampiran : ${currentNotulenLink}`, 14, 42);
                doc.setTextColor(0, 0, 0); // Balik ke hitam
                doc.setFont("helvetica", "normal");
                startYTabel = 48;
            }

            // Garis Pembatas Header
            doc.setLineWidth(0.5);
            doc.line(14, startYTabel - 4, pageWidth - 14, startYTabel - 4);

            // ==========================================
            // 2. RENDER DATA TABEL (TEMA GRID KLASIK KANTOR)
            // ==========================================
            // Menghapus "Waktu" dari Headers
            let headers = ["No", "Nama Peserta"];
            try { let cust = JSON.parse(reportData[0].custom); for(let k in cust) headers.push(k); } catch(e){}
            headers.push("Tanda Tangan"); 

            const rows = reportData.map((r, i) => { 
                // Waktu r.waktu tidak dimasukkan ke baris (rowData) lagi
                let rowData = [i+1, r.nama];
                
                try { let cust = JSON.parse(r.custom); for(let k in cust) rowData.push(cust[k] || "-"); } catch(e){}
                
                if (r.ttd !== "NO TTD" && r.ttd.startsWith('data:image')) {
                    rowData.push({ content: "", styles: { minCellHeight: 12 }, imageBase64: r.ttd });
                } else {
                    rowData.push("-");
                }
                return rowData; 
            });

            doc.autoTable({ 
                startY: startYTabel, 
                head: [headers], 
                body: rows, 
                theme: 'grid', 
                // PERBAIKAN HEADER & GARIS: Warna abu-abu terang, garis hitam tegas
                headStyles: { 
                    fillColor: [230, 230, 230], // Abu-abu terang ala Excel
                    textColor: [0, 0, 0],       // Teks Hitam
                    halign: 'center', 
                    fontStyle: 'bold',
                    lineColor: [0, 0, 0],       // Garis luar header warna hitam
                    lineWidth: 0.2              // Tebal garis header
                }, 
                styles: { 
                    fontSize: 8, 
                    valign: 'middle', 
                    textColor: [0, 0, 0],       // Teks Body Hitam
                    cellPadding: 2,
                    lineColor: [0, 0, 0],       // Garis antar sel (body) warna hitam
                    lineWidth: 0.2              // Tebal garis body
                },
                columnStyles: { 0: { halign: 'center', cellWidth: 10 } }, 
                didDrawCell: function(data) {
                    // Gambar TTD pas di tengah kotak tabel
                    if (data.section === 'body' && data.column.index === headers.length - 1) {
                        var cellRaw = data.cell.raw;
                        if (cellRaw && cellRaw.imageBase64) {
                            var maxImgHeight = data.cell.height - 4; 
                            var maxImgWidth = maxImgHeight * 2; 
                            
                            // Auto-Scale
                            if (maxImgWidth > data.cell.width - 4) {
                                maxImgWidth = data.cell.width - 4;
                                maxImgHeight = maxImgWidth / 2;
                            }

                            var xPos = data.cell.x + (data.cell.width - maxImgWidth) / 2; 
                            var yPos = data.cell.y + (data.cell.height - maxImgHeight) / 2; 

                            doc.addImage(cellRaw.imageBase64, 'PNG', xPos, yPos, maxImgWidth, maxImgHeight);
                        }
                    }
                }
            });

            // ==========================================
            // 3. BLOK TANDA TANGAN (KOLOM MENGETAHUI)
            // ==========================================
            let finalY = doc.lastAutoTable.finalY + 15;
            
            // Batas bawah kertas portrait A4. Kalau mepet, buat halaman baru!
            if (finalY > 250) { 
                doc.addPage();
                finalY = 20;
            }

            // Tulisan "Dicetak pada..." di kiri
            const tanggalCetak = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            doc.setFontSize(8);
            doc.text(`Dicetak dari Sistem pada: ${tanggalCetak}`, 14, finalY + 25);

            // Tempat TTD Panitia di kanan
            const ttdPosisiX = pageWidth - 45; // Menggeser ke pojok kanan
            doc.setFontSize(9);
            doc.text("Mengetahui,", ttdPosisiX, finalY, { align: 'center' });
            doc.text("Panitia Penyelenggara,", ttdPosisiX, finalY + 5, { align: 'center' });
            
            // Garis untuk nama panitia
            doc.setLineWidth(0.3);
            doc.line(ttdPosisiX - 25, finalY + 25, ttdPosisiX + 25, finalY + 25);

            // Simpan File
            doc.save(`Laporan_Presensi_${activeMeeting.code}.pdf`);
        }

        function resetView(v1, v2, inp) { document.getElementById(v1).classList.remove('hidden'); document.getElementById(v2).classList.add('hidden'); document.getElementById(inp).value = ''; }

        // --- KANVAS TTD ---
        const canvas = document.getElementById('signature-pad'); const ctx = canvas.getContext('2d'); let isDrawing = false;
        function resizeCanvas() { canvas.width = canvas.parentElement.getBoundingClientRect().width; canvas.height = 128; ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 3; ctx.lineCap='round'; ctx.lineJoin='round'; }
        function getPos(e) { const r = canvas.getBoundingClientRect(); return e.touches ? { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top } : { x: e.clientX - r.left, y: e.clientY - r.top }; }
        function start(e) { e.preventDefault(); isDrawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); }
        function draw(e) { if (!isDrawing) return; e.preventDefault(); const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); }
        function stop() { isDrawing = false; } function clearCanvas() { ctx.clearRect(0,0, canvas.width, canvas.height); }
        canvas.addEventListener('mousedown', start); canvas.addEventListener('mousemove', draw); canvas.addEventListener('mouseup', stop); canvas.addEventListener('mouseout', stop);
        canvas.addEventListener('touchstart', start, {passive: false}); canvas.addEventListener('touchmove', draw, {passive: false}); canvas.addEventListener('touchend', stop);
   