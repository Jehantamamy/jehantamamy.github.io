!function(){let e=window.location.hostname;if("localhost"===e||"127.0.0.1"===e||""===e){"file:"===window.location.protocol&&t();return}function t(){throw document.body.innerHTML=`
				<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#0f172a; color:white; font-family:sans-serif; text-align:center;">
					<h1 style="font-size:3rem; color:#ef4444;">⛔ AKSES DITOLAK</h1>
					<p style="font-size:1.2rem; margin-top:1rem;">Aplikasi ini dilindungi Hak Cipta dan hanya dapat digunakan melalui website resmi.</p>
					<a href="https://ariestechlab.com" style="margin-top:2rem; padding:10px 20px; background:#10b981; color:white; text-decoration:none; border-radius:8px; font-weight:bold;">Buka Aries Tech Labs</a>
				</div>
			`,Error("Illegal execution environment detected.")}["ariestechlab.com","www.ariestechlab.com"].includes(e)||t()}();const pdfjsLib=window["pdfjs-dist/build/pdf"];pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";const gradeWeights={A:4,"A-":3.75,AB:3.5,"B+":3.25,B:3,"B-":2.75,BC:2.5,"C+":2.25,C:2,D:1,E:0,T:0};let transcriptData=[];const dropZone=document.getElementById("drop-zone"),fileInput=document.getElementById("pdf-upload"),mainContent=document.getElementById("main-content"),emptyState=document.getElementById("empty-state"),tbody=document.getElementById("table-body"),sortSelector=document.getElementById("sort-selector");function processFile(e){if(!e||"application/pdf"!==e.type){alert("Mohon unggah file PDF.");return}dropZone.innerHTML='<p class="text-indigo-400 font-bold animate-pulse">Sedang Membaca PDF...</p>';let t=new FileReader;t.onload=async function(){try{let e=await pdfjsLib.getDocument(new Uint8Array(this.result)).promise,t="";for(let a=1;a<=e.numPages;a++){let s=await e.getPage(a),n=await s.getTextContent();t+=n.items.map(e=>e.str).join("  ")+" \n"}parseData(t),dropZone.innerHTML=`
					<input type="file" id="pdf-upload" class="absolute inset-0 opacity-0 cursor-pointer" accept="application/pdf">
					<div class="flex items-center justify-center gap-3">
						<div class="text-xl">📄</div>
						<div class="text-left">
							<p class="text-xs font-bold text-slate-300">Upload Transkrip PDF</p>
						</div>
					</div>`}catch(r){console.error(r),alert("Gagal membaca PDF."),dropZone.innerHTML="Gagal. Coba lagi."}},t.readAsArrayBuffer(e)}function parseData(e){let t=/(?!\bHalaman\b|\bPage\b)([A-Z][A-Z0-9\s\/\-\(\)\&]{5,})\s+([1-6])\s+([A-E][ABCDE+\-]?)/g,a=e.replace(/\n/g," "),s,n=[];for(;null!==(s=t.exec(a));){let r=s[1].trim().replace(/\s+/g," ");n.push({id:Date.now()+Math.random(),name:r,sks:parseInt(s[2]),grade:s[3]})}n.length>0?(transcriptData=[...transcriptData,...n],renderTable(),alert(`Berhasil mengekstrak ${n.length} mata kuliah!`)):(alert("Pola teks PDF tidak dikenali. Silakan input manual."),showDashboard())}function addManualRow(){transcriptData.push({id:Date.now(),name:"Mata Kuliah Baru",sks:3,grade:"A"}),sortSelector&&(sortSelector.value="default"),renderTable(),setTimeout(()=>{let e=document.querySelector(".custom-scroll");e&&(e.scrollTop=e.scrollHeight)},100)}function updateData(e,t,a){let s=transcriptData.find(t=>t.id===e);s&&("sks"===t&&(isNaN(a=parseInt(a))||a<1)&&(a=0),s[t]=a,renderTable())}function deleteRow(e){transcriptData=transcriptData.filter(t=>t.id!==e),renderTable()}function resetData(){confirm("Hapus semua data?")&&(transcriptData=[],renderTable())}function sortCourses(e){switch(e){case"name_asc":transcriptData.sort((e,t)=>e.name.localeCompare(t.name));break;case"grade_desc":transcriptData.sort((e,t)=>(gradeWeights[t.grade]||0)-(gradeWeights[e.grade]||0));break;case"grade_asc":transcriptData.sort((e,t)=>(gradeWeights[e.grade]||0)-(gradeWeights[t.grade]||0));break;case"sks_desc":transcriptData.sort((e,t)=>t.sks-e.sks);break;default:transcriptData.sort((e,t)=>e.id-t.id)}renderTable()}function renderTable(){if(0===transcriptData.length){mainContent.classList.add("hidden"),emptyState.classList.remove("hidden");return}mainContent.classList.remove("hidden"),emptyState.classList.add("hidden"),tbody.innerHTML="";let e=0,t=0;transcriptData.forEach((a,s)=>{let n=gradeWeights[a.grade]||0,r=(a.sks*n).toFixed(2),l="text-white";["D","E"].includes(a.grade)?l="text-rose-400 font-bold":["A","A-"].includes(a.grade)&&(l="text-emerald-400 font-bold");let i=document.createElement("tr");i.className="hover:bg-slate-800/50 transition-colors border-b border-slate-700/50",i.innerHTML=`
				<td class="p-3 text-center text-slate-500 font-mono text-xs">${s+1}</td>
				<td class="p-3">
					<input type="text" value="${a.name}" 
						onchange="updateData(${a.id}, 'name', this.value)"
						class="w-full bg-transparent border-none text-white text-sm focus:ring-0 placeholder-slate-600 font-medium" 
						placeholder="Nama Matkul...">
				</td>
				<td class="p-3 text-center">
					<input type="number" value="${a.sks}" min="1" max="6"
						onchange="updateData(${a.id}, 'sks', this.value)"
						class="w-10 bg-slate-900 border border-slate-700 rounded text-center text-white text-xs py-1 focus:border-indigo-500 focus:outline-none">
				</td>
				<td class="p-3">
					<select onchange="updateData(${a.id}, 'grade', this.value)"
						class="w-full bg-slate-900 border border-slate-600 ${l} text-xs rounded px-2 py-1.5 focus:border-indigo-500 focus:outline-none cursor-pointer appearance-none font-bold text-center">
						${generateGradeOptions(a.grade)}
					</select>
				</td>
				<td class="p-3 text-center font-mono font-bold text-indigo-400 text-sm">
					${r}
				</td>
				<td class="p-3 text-center">
					<button onclick="deleteRow(${a.id})" class="text-slate-600 hover:text-rose-500 transition-colors p-1">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
					</button>
				</td>
			`,tbody.appendChild(i),e+=parseInt(a.sks),t+=parseFloat(r)}),updateStatsUI(e,t)}function generateGradeOptions(e){return Object.keys(gradeWeights).map(t=>`<option value="${t}" ${t===e?"selected":""} class="bg-slate-900 text-white font-mono">
				${t}
			</option>`).join("")}function updateStatsUI(e,t){let a=0===e?0:t/e,s=document.getElementById("stat-ipk");s.innerText=a.toFixed(2),a>=3.5?s.className="text-4xl font-extrabold text-emerald-400 drop-shadow-lg":a>=3?s.className="text-4xl font-extrabold text-indigo-400":a>=2?s.className="text-4xl font-extrabold text-yellow-400":s.className="text-4xl font-extrabold text-rose-400",document.getElementById("stat-sks").innerText=e,document.getElementById("stat-poin").innerText=t.toFixed(2);let n=Math.min(e/144*100,100),r=document.getElementById("sks-progress");r.style.width=`${n}%`,n>=100?r.className="bg-emerald-500 h-2 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]":r.className="bg-indigo-500 h-2 rounded-full transition-all duration-500"}function showDashboard(){emptyState.classList.add("hidden"),mainContent.classList.remove("hidden")}function analyzeTranscript(){if(0===transcriptData.length){alert("Data kosong! Masukkan data transkrip dulu.");return}let e=document.getElementById("analysis-section");e.classList.remove("hidden"),e.scrollIntoView({behavior:"smooth"});let t=0,a=0,s=[];transcriptData.forEach(e=>{let n=gradeWeights[e.grade]||0;t+=parseInt(e.sks),a+=e.sks*n,n<4&&s.push({...e,currentPoint:n,gain:(4-n)*e.sks,type:["D","E","T"].includes(e.grade)?"WAJIB":"OPSIONAL"})});let n=t>0?a/t:0;document.getElementById("analysis-sks").innerText=t;let r=Math.min(t/144*100,100);document.getElementById("analysis-progress").style.width=`${r}%`;let l="",i="";n>=3.51?(l="CUMLAUDE",i="text-emerald-400"):n>=3?(l="SANGAT MEMUASKAN",i="text-indigo-400"):n>=2.76?(l="MEMUASKAN",i="text-blue-400"):n>=2?(l="CUKUP",i="text-yellow-400"):(l="BAHAYA (DO)",i="text-rose-500"),document.getElementById("analysis-predikat").innerHTML=`<span class="${i}">${l}</span>`,document.getElementById("analysis-graduate-msg").innerText=t>=144?"SKS Lulus terpenuhi.":`Kurang ${144-t} SKS lagi menuju 144.`,s.sort((e,t)=>t.gain-e.gain);let o=document.getElementById("analysis-retake-list");o.innerHTML="";let d=s.filter(e=>"WAJIB"===e.type);d.length>0?d.forEach(e=>{o.innerHTML+=`
					<div class="flex justify-between items-center bg-rose-900/20 p-2 rounded border border-rose-500/30 mb-1">
						<span class="text-rose-200 font-bold text-xs">${e.name} (${e.sks} SKS)</span>
						<span class="text-xs bg-rose-500 text-white px-2 py-1 rounded font-mono">${e.grade} ➝ A?</span>
					</div>`}):o.innerHTML=`<div class="text-emerald-400 text-xs flex items-center gap-2"><span class="text-lg">✅</span> Aman! Tidak ada nilai D/E.</div>`;let c=document.getElementById("analysis-strategy"),$=Math.max(0,144-t),p=s.reduce((e,t)=>e+t.gain,0),u=(a+4*$+p)/144,g="";if(n>=3.51)g='<p class="text-emerald-400 font-bold">Posisi Aman!</p><p>Pertahankan saja nilai Anda. Anda sudah di level Cum Laude.</p>';else{let m=n<3?3:n<3.25?3.25:3.5;u<m&&(m=u);let b=t,x=a;$>0&&(b+=$,x+=4*$,[].push(`Ambil <b>${$} SKS Baru</b> (Wajib A).`));let h=x/b,f=0,y=0;for(let k of s){if(h>=m)break;x+=k.gain,h=x/b,f++,y+=parseInt(k.sks)}g=`
				<div class="mb-3 border-b border-slate-700 pb-2">
					<span class="text-xs text-slate-400">Target Realistis:</span>
					<span class="text-xl font-bold text-white">${m.toFixed(2)}</span>
					<span class="text-[10px] text-slate-500 block">(Max matematis: ${u.toFixed(2)})</span>
				</div>
				<ul class="space-y-2 text-sm text-slate-300 list-disc pl-4">
			`,$>0?g+=`<li>Ambil <b>${$} SKS Matkul Baru</b> (Wajib A) untuk memenuhi kuota 144 SKS.</li>`:g+='<li class="text-yellow-400">Kuota SKS Lulus (144) sudah penuh/hampir penuh. Fokus Anda sekarang adalah <b>MENGULANG (RETAKE)</b>.</li>',f>0?g+=`
					<li>
						Anda perlu mengulang/memperbaiki sekitar <b>${f} mata kuliah</b> 
						(Total ${y} SKS) yang nilainya C/D menjadi A.
					</li>
					<li class="italic text-xs text-indigo-300">
						Saran: Prioritaskan mengulang matkul SKS besar yang nilainya paling jelek dulu (Lihat tabel di atas).
					</li>
				`:h>=m?g+='<li class="text-emerald-400">Target tercapai hanya dengan mengambil matkul baru!</li>':g+=`<li class="text-rose-400">Target ${m} sangat sulit dicapai. Coba set target lebih rendah.</li>`,g+="</ul>"}c.innerHTML=g}dropZone.addEventListener("dragover",e=>{e.preventDefault(),dropZone.classList.add("drag-active")}),dropZone.addEventListener("dragleave",()=>dropZone.classList.remove("drag-active")),dropZone.addEventListener("drop",e=>{e.preventDefault(),dropZone.classList.remove("drag-active"),e.dataTransfer.files.length&&processFile(e.dataTransfer.files[0])}),fileInput.addEventListener("change",e=>{e.target.files.length&&processFile(e.target.files[0])}),document.addEventListener("DOMContentLoaded",()=>{renderTable()});