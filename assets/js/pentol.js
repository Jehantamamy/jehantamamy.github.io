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
        const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyd2uLg7i5PCr23Lw0c7EHdRU6iBCzeTu3s4ilX8P13idY90sFvbW2v9vRY7GwxW1-RuQ/exec";

        let activeMeeting = null;
        let customFields = [];
        let reportData = []; 
        let savedLogoBase64 = "";

        // ==========================================
        // FITUR AUTO-LOAD & MAGIC LINK
        // ==========================================
        document.addEventListener('DOMContentLoaded', () => {
            loadAdminState();
            
            const adminInputs = document.querySelectorAll('#view-admin input, #view-admin select');
            adminInputs.forEach(input => {
                input.addEventListener('input', saveAdminState);
                input.addEventListener('change', saveAdminState);
            });

            const urlParams = new URLSearchParams(window.location.search);
            const joinCode = urlParams.get('join');
            if (joinCode) {
                document.getElementById('inputMeetingCode').value = joinCode;
                verifyCode(); 
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

        // ==========================================
        // FITUR DRAFT (LOCAL STORAGE)
        // ==========================================
        function saveAdminState() {
            const draft = {
                name: document.getElementById('agendaName').value,
                location: document.getElementById('agendaLocation').value,
                date: document.getElementById('agendaDate').value,
                time: document.getElementById('agendaTime').value,
                instansi: document.getElementById('fieldInstansi').checked,
                dept: document.getElementById('fieldDept').checked,
                phone: document.getElementById('fieldPhone').checked,
                signature: document.getElementById('fieldSignature').checked,
                customFields: customFields,
                logo: savedLogoBase64
            };
            localStorage.setItem('pentol_draft', JSON.stringify(draft));
        }

        function loadAdminState() {
            const draftStr = localStorage.getItem('pentol_draft');
            if (draftStr) {
                try {
                    const draft = JSON.parse(draftStr);
                    if(draft.name) document.getElementById('agendaName').value = draft.name;
                    if(draft.location) document.getElementById('agendaLocation').value = draft.location;
                    if(draft.date) document.getElementById('agendaDate').value = draft.date;
                    else document.getElementById('agendaDate').valueAsDate = new Date();
                    if(draft.time) document.getElementById('agendaTime').value = draft.time;
                    
                    if(draft.instansi !== undefined) document.getElementById('fieldInstansi').checked = draft.instansi;
                    if(draft.dept !== undefined) document.getElementById('fieldDept').checked = draft.dept;
                    if(draft.phone !== undefined) document.getElementById('fieldPhone').checked = draft.phone;
                    if(draft.signature !== undefined) document.getElementById('fieldSignature').checked = draft.signature;
                    
                    if (draft.customFields) { customFields = draft.customFields; renderAdminFieldList(); }
                    if (draft.logo) {
                        savedLogoBase64 = draft.logo;
                        document.getElementById('logoPreview').src = draft.logo;
                        document.getElementById('logoPreviewContainer').classList.remove('hidden');
                    }
                } catch(e) {}
            } else {
                document.getElementById('agendaDate').valueAsDate = new Date();
            }
        }

        // ==========================================
        // LOGO UPLOAD & BUILDER
        // ==========================================
        function handleLogoUpload(input) {
            const file = input.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) return alert("Ukuran logo terlalu besar! Maksimal 2MB.");
            const reader = new FileReader();
            reader.onload = function(e) {
                savedLogoBase64 = e.target.result;
                document.getElementById('logoPreview').src = savedLogoBase64;
                document.getElementById('logoPreviewContainer').classList.remove('hidden');
                saveAdminState();
            };
            reader.readAsDataURL(file);
        }

        function removeLogo() {
            savedLogoBase64 = "";
            document.getElementById('logoUpload').value = "";
            document.getElementById('logoPreviewContainer').classList.add('hidden');
            saveAdminState();
        }

        function toggleOptionsInput() { document.getElementById('cf-options-container').classList.toggle('hidden', document.getElementById('cf-type').value === 'text'); }

        function addCustomField() {
            const label = document.getElementById('cf-label').value.trim(); const type = document.getElementById('cf-type').value; const optsStr = document.getElementById('cf-options').value.trim();
            if (!label) return alert("Pertanyaan wajib diisi!"); if (type !== 'text' && !optsStr) return alert("Opsi wajib diisi!");
            customFields.push({ label, type, options: type !== 'text' ? optsStr.split(',').map(o => o.trim()) : [] });
            document.getElementById('cf-label').value = ''; document.getElementById('cf-options').value = ''; 
            renderAdminFieldList(); saveAdminState();
        }

        function renderAdminFieldList() {
            const list = document.getElementById('custom-fields-list'); list.innerHTML = '';
            customFields.forEach((cf, index) => {
                list.innerHTML += `<div class="flex justify-between items-center p-2 bg-slate-900 border border-slate-700 rounded-lg"><div><p class="text-xs text-white font-bold">${cf.label}</p><p class="text-[9px] text-sky-400">${cf.type}</p></div><button onclick="removeField(${index})" class="text-rose-500 text-xs font-bold px-2">&times;</button></div>`;
            });
        }
        function removeField(index) { customFields.splice(index, 1); renderAdminFieldList(); saveAdminState(); }

        // ==========================================
        // SISTEM KOMUNIKASI DB
        // ==========================================
        function generateMeetingCode() {
            const btn = document.querySelector('#view-admin button[onclick="generateMeetingCode()"]');
            btn.innerText = "Membuat Link Pendek... ⏳"; 
            btn.disabled = true;

            const timeCode = Date.now().toString(36).slice(-3).toUpperCase();
            const randCode1 = Math.random().toString(36).substring(2, 5).toUpperCase();
            const randCode2 = Math.random().toString(36).substring(2, 5).toUpperCase();

            // Rangkai magic link panjang dari URL website kamu saat ini
            const baseUrl = window.location.href.split('?')[0].split('#')[0];
            const longMagicLink = `${baseUrl}?join=JOIN-${randCode1}${timeCode}`;

            const payload = { 
                action: "createMeeting",
                code: "JOIN-" + randCode1 + timeCode,       
                adminCode: "ADMIN-" + randCode2 + timeCode, 
                longLink: longMagicLink, // <--- KIRIM LINK PANJANG KE SERVER
                name: document.getElementById('agendaName').value || "Rapat Internal",
                location: document.getElementById('agendaLocation').value || "-", 
                date: document.getElementById('agendaDate').value || "-", 
                time: document.getElementById('agendaTime').value || "-",
                quickFields: {
                    instansi: document.getElementById('fieldInstansi').checked, 
                    dept: document.getElementById('fieldDept').checked,
                    phone: document.getElementById('fieldPhone').checked, 
                    signature: document.getElementById('fieldSignature').checked
                },
                customFields: [...customFields] 
            };

            fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) })
            .then(res => res.json())
            .then(data => {
                activeMeeting = payload;
                
                // Gunakan link pendek dari server, kalau gagal/kosong, pakai link panjang
                const finalLinkToDisplay = data.shortLink || longMagicLink;
                
                document.getElementById('display-magic-link').value = finalLinkToDisplay;
                document.getElementById('display-admin-code').innerText = payload.adminCode;
                document.getElementById('code-result').classList.replace('hidden', 'flex');
            })
            .catch(err => alert("Gagal konek ke Server! Pastikan URL Web App benar."))
            .finally(() => { 
                btn.innerText = "Generate Ruangan Rapat"; 
                btn.disabled = false; 
            });
        }

        function copyCode(eId, btnId, isInput = false) {
            const codeText = isInput ? document.getElementById(eId).value : document.getElementById(eId).innerText;
            navigator.clipboard.writeText(codeText).then(() => {
                const btn = document.getElementById(btnId); const ob = btn.innerHTML; const oc = btn.className;
                btn.innerHTML = `✔️ Tersalin!`; btn.className = oc.replace(/bg-\w+-600/, 'bg-sky-600');
                setTimeout(() => { btn.innerHTML = ob; btn.className = oc; }, 1500);
            });
        }

        function shareViaEmail() {
            if (!activeMeeting) return;
            
            const magicLink = document.getElementById('display-magic-link').value;
            
            // Subjek Email
            const subject = encodeURIComponent(`Undangan & Backup Presensi: ${activeMeeting.name}`);
            
            // Isi Body Email
            const body = encodeURIComponent(
                `Halo,\n\n` +
                `Silakan mengisi presensi kehadiran untuk agenda rapat berikut:\n\n` +
                `📌 Agenda  : ${activeMeeting.name}\n` +
                `📍 Tempat  : ${activeMeeting.location || "-"}\n` +
                `📅 Tanggal : ${activeMeeting.date}\n` +
                `⏰ Waktu   : ${activeMeeting.time}\n\n` +
                `Klik link otomatis di bawah ini untuk langsung mengisi form absen:\n` +
                `${magicLink}\n\n` +
                `Atau masuk manual menggunakan kode peserta: ${activeMeeting.code}\n\n` +
                `Terima kasih.\n\n` +
                `========================================\n` +
                `🔒 KHUSUS PANITIA (HAPUS JIKA DIKIRIM KE PESERTA)\n` +
                `Simpan email ini sebagai backup akses Anda.\n` +
                `Kode Laporan (Admin): ${activeMeeting.adminCode}\n` +
                `========================================`
            );

            // Menggunakan URL API Tulis Pesan Gmail untuk membuka Tab Baru
            const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=&su=${subject}&body=${body}`;
            
            // Buka di tab baru
            window.open(gmailLink, '_blank');
        }

        function verifyCode(isAdmin = false) {
            const inputId = isAdmin ? 'inputAdminCode' : 'inputMeetingCode';
            const btn = document.querySelector(`#${isAdmin ? 'screen-enter-admin-code' : 'screen-enter-code'} button`);
            const code = document.getElementById(inputId).value.toUpperCase().trim();
            if(!code) return alert("Masukkan kode dulu!");

            const origText = btn.innerText; btn.innerText = "Mencari Presensi... ⏳"; btn.disabled = true;

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
                } else { alert("Kode Presensi tidak ditemukan di database!"); }
            }).catch(e => alert("Gagal konek ke Server!")).finally(() => { btn.innerText = origText; btn.disabled = false; });
        }

        function verifyAdminCode() { verifyCode(true); }

        function renderFormPeserta() {
            document.getElementById('screen-enter-code').classList.add('hidden'); document.getElementById('screen-attendance').classList.remove('hidden');
            
            // Render Header Peserta
            document.getElementById('display-agenda-name').innerText = activeMeeting.name;
            document.getElementById('display-agenda-location').innerText = activeMeeting.location || "-"; // Tampil Tempat
            document.getElementById('display-agenda-date').innerText = activeMeeting.date;
            document.getElementById('display-agenda-time').innerText = activeMeeting.time;

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
            const btn = document.getElementById('btn-submit'); const orig = btn.innerHTML;
            if(!document.getElementById('inp-NamaLengkap').value.trim()) return alert("Nama wajib diisi!");
            
            let formData = {};
            document.querySelectorAll('.dynamic-inp').forEach(i => { if(i.id !== 'inp-NamaLengkap' && i.value) formData[i.name] = i.value; });
            document.querySelectorAll('.dynamic-inp-radio:checked').forEach(r => formData[r.name] = r.value);

            let payload = { action: "submitAttendance", kodeRapat: activeMeeting.code, namaPeserta: document.getElementById('inp-NamaLengkap').value, formLain: formData, tandaTangan: activeMeeting.quickFields.signature ? canvas.toDataURL() : "NO TTD" };
            btn.innerHTML = "Mengirim Data... ⏳"; btn.disabled = true;

            fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) })
            .then(res => res.json()).then(data => { 
                document.getElementById('screen-attendance').classList.add('hidden');
                document.getElementById('screen-success').classList.remove('hidden');
                alert("✅ BERHASIL! Presensi tersimpan."); 
            })
            .catch(() => { 
                document.getElementById('screen-attendance').classList.add('hidden');
                document.getElementById('screen-success').classList.remove('hidden');
                alert("✅ BERHASIL! Presensi tersimpan.");
            })
            .finally(() => { btn.innerHTML = orig; btn.disabled = false; clearCanvas(); });
        }

        // ==========================================
        // FITUR DASHBOARD & REPORT EXCEL/PDF
        // ==========================================
        function fetchDashboardData() {
            const list = document.getElementById('dashboard-list'); 
            list.innerHTML = '<p class="text-xs text-sky-400 text-center py-2">Menarik data server... ⏳</p>';
            
            fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'getReport', kodeRapat: activeMeeting.code }) })
            .then(res => res.json()).then(res => {
                if(res.status === 'success') {
                    reportData = res.data;
                    document.getElementById('dashboard-count').innerText = reportData.length + " Hadir";
                    list.innerHTML = reportData.length === 0 ? '<p class="text-xs text-slate-500 text-center py-2">Belum ada peserta.</p>' : '';
                    reportData.forEach((row, i) => {
                        const t = new Date(row.waktu); const timeStr = t.getHours().toString().padStart(2,'0') + ":" + t.getMinutes().toString().padStart(2,'0') + " WIB";
                        list.innerHTML += `<div class="p-2 border border-slate-700 rounded bg-slate-800 flex justify-between items-center"><span class="text-xs text-slate-300 font-bold">${i+1}. ${row.nama}</span><span class="text-[9px] text-slate-500">${timeStr}</span></div>`;
                    });
                }
            });
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

        function downloadPDF() {
            if(reportData.length === 0) return alert("Data masih kosong.");
            const { jsPDF } = window.jspdf; 
            const doc = new jsPDF('p', 'mm', 'a4'); 
            const pageWidth = doc.internal.pageSize.getWidth(); 
            
            let headerY = 20;

            // Cetak Logo jika ada
            if (savedLogoBase64) {
                const imgEl = document.getElementById('logoPreview');
                const ratio = imgEl.naturalWidth / imgEl.naturalHeight;
                let imgH = 18; 
                let imgW = imgH * ratio;
                if(imgW > 40) { imgW = 40; imgH = imgW / ratio; } 
                doc.addImage(imgEl, 'PNG', 14, 12, imgW, imgH);
                headerY = 22; 
            }

            doc.setFont("helvetica", "bold");
            doc.setFontSize(14); 
            doc.text("DAFTAR HADIR PESERTA", pageWidth / 2, headerY, { align: 'center' });
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10); 
            
            // Menambahkan TEMPAT RAPAT di Kop Surat
            doc.text(`Nama Agenda`, 14, 38); doc.text(`: ${activeMeeting.name}`, 40, 38);
            doc.text(`Tempat`, 14, 44);      doc.text(`: ${activeMeeting.location || "-"}`, 40, 44);
            doc.text(`Tanggal`, 120, 38);     doc.text(`: ${activeMeeting.date}`, 135, 38);
            doc.text(`Waktu`, 120, 44);      doc.text(`: ${activeMeeting.time}`, 135, 44); 

            let startYTabel = 56;
            doc.setLineWidth(0.5);
            doc.line(14, startYTabel - 4, pageWidth - 14, startYTabel - 4);

            let headers = ["No", "Nama Peserta"];
            try { let cust = JSON.parse(reportData[0].custom); for(let k in cust) headers.push(k); } catch(e){}
            headers.push("Tanda Tangan"); 

            const rows = reportData.map((r, i) => { 
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
                startY: startYTabel, head: [headers], body: rows, theme: 'grid', 
                headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], halign: 'center', fontStyle: 'bold', lineColor: [0, 0, 0], lineWidth: 0.2 }, 
                styles: { fontSize: 8, valign: 'middle', textColor: [0, 0, 0], cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.2 },
                columnStyles: { 0: { halign: 'center', cellWidth: 10 } }, 
                didDrawCell: function(data) {
                    if (data.section === 'body' && data.column.index === headers.length - 1) {
                        var cellRaw = data.cell.raw;
                        if (cellRaw && cellRaw.imageBase64) {
                            var maxImgHeight = data.cell.height - 4; var maxImgWidth = maxImgHeight * 2; 
                            if (maxImgWidth > data.cell.width - 4) { maxImgWidth = data.cell.width - 4; maxImgHeight = maxImgWidth / 2; }
                            var xPos = data.cell.x + (data.cell.width - maxImgWidth) / 2; var yPos = data.cell.y + (data.cell.height - maxImgHeight) / 2; 
                            doc.addImage(cellRaw.imageBase64, 'PNG', xPos, yPos, maxImgWidth, maxImgHeight);
                        }
                    }
                }
            });

            let finalY = doc.lastAutoTable.finalY + 15;
            if (finalY > 250) { doc.addPage(); finalY = 20; }

            const tanggalCetak = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            doc.setFontSize(8); doc.text(`Dicetak dari Sistem pada: ${tanggalCetak}`, 14, finalY + 25);

            const ttdPosisiX = pageWidth - 45; 
            //doc.setFontSize(9); doc.text("Mengetahui,", ttdPosisiX, finalY, { align: 'center' });
            //doc.text("Panitia Penyelenggara,", ttdPosisiX, finalY + 5, { align: 'center' });
            //doc.setLineWidth(0.3); doc.line(ttdPosisiX - 25, finalY + 25, ttdPosisiX + 25, finalY + 25);

            doc.save(`Laporan_Presensi_${activeMeeting.code}.pdf`);
        }

        function resetView(v1, v2, inp) { document.getElementById(v1).classList.remove('hidden'); document.getElementById(v2).classList.add('hidden'); document.getElementById(inp).value = ''; }
        const canvas = document.getElementById('signature-pad'); const ctx = canvas.getContext('2d'); let isDrawing = false;
        function resizeCanvas() { canvas.width = canvas.parentElement.getBoundingClientRect().width; canvas.height = 128; ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 3; ctx.lineCap='round'; ctx.lineJoin='round'; }
        function getPos(e) { const r = canvas.getBoundingClientRect(); return e.touches ? { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top } : { x: e.clientX - r.left, y: e.clientY - r.top }; }
        function start(e) { e.preventDefault(); isDrawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); }
        function draw(e) { if (!isDrawing) return; e.preventDefault(); const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); }
        function stop() { isDrawing = false; } function clearCanvas() { ctx.clearRect(0,0, canvas.width, canvas.height); }
        canvas.addEventListener('mousedown', start); canvas.addEventListener('mousemove', draw); canvas.addEventListener('mouseup', stop); canvas.addEventListener('mouseout', stop);
        canvas.addEventListener('touchstart', start, {passive: false}); canvas.addEventListener('touchmove', draw, {passive: false}); canvas.addEventListener('touchend', stop);
    