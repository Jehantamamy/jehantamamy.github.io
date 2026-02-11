!function(){let e=window.location.hostname;if("localhost"===e||"127.0.0.1"===e||""===e){"file:"===window.location.protocol&&t();return}function t(){throw document.body.innerHTML=`
				<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#0f172a; color:white; font-family:sans-serif; text-align:center;">
					<h1 style="font-size:3rem; color:#ef4444;">⛔ AKSES DITOLAK</h1>
					<p style="font-size:1.2rem; margin-top:1rem;">Aplikasi ini dilindungi Hak Cipta dan hanya dapat digunakan melalui website resmi.</p>
					<a href="https://ariestechlab.com" style="margin-top:2rem; padding:10px 20px; background:#10b981; color:white; text-decoration:none; border-radius:8px; font-weight:bold;">Buka Aries Tech Labs</a>
				</div>
			`,Error("Illegal execution environment detected.")}["ariestechlab.com","www.ariestechlab.com"].includes(e)||t()}();let currentMode="link",qrColor="#000000",qrObj=null;const Forms={link:`
            <div class="animate-fade-in">
                <label class="block text-xs font-semibold text-slate-400 mb-1">URL Website atau Teks</label>
                <input type="text" id="inp-text" class="cyber-input" placeholder="https://aries-tech.github.io" oninput="generate()">
                <p class="text-[10px] text-slate-600 mt-2">Masukkan link lengkap dengan https:// atau teks biasa.</p>
            </div>
        `,wifi:`
            <div class="space-y-3 animate-fade-in">
                <div>
                    <label class="block text-xs font-semibold text-slate-400 mb-1">Nama WiFi (SSID)</label>
                    <input type="text" id="inp-ssid" class="cyber-input" placeholder="Nama WiFi Kamu" oninput="generate()">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-400 mb-1">Password</label>
                    <input type="text" id="inp-pass" class="cyber-input" placeholder="Rahasia123" oninput="generate()">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-400 mb-1">Keamanan</label>
                    <select id="inp-enc" class="cyber-input" onchange="generate()">
                        <option value="WPA">WPA/WPA2 (Standar)</option>
                        <option value="WEP">WEP (Lama)</option>
                        <option value="nopass">Tanpa Password</option>
                    </select>
                </div>
            </div>
        `,vcard:`
            <div class="space-y-3 animate-fade-in">
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-semibold text-slate-400 mb-1">Nama Depan</label>
                        <input type="text" id="inp-fn" class="cyber-input" placeholder="Nama depan" oninput="generate()">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-400 mb-1">Nama Belakang</label>
                        <input type="text" id="inp-ln" class="cyber-input" placeholder="Nama belakang" oninput="generate()">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-400 mb-1">Nomor HP</label>
                    <input type="text" id="inp-tel" class="cyber-input" placeholder="0812..." oninput="generate()">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-400 mb-1">Email (Opsional)</label>
                    <input type="text" id="inp-email" class="cyber-input" placeholder="email@contoh.com" oninput="generate()">
                </div>
            </div>
        `,barcode:`
            <div class="space-y-3 animate-fade-in">
                <div class="p-3 bg-emerald-900/20 border border-emerald-900/50 rounded-lg">
                    <p class="text-[10px] text-emerald-400 font-mono">Mode Barcode Aktif. Output dioptimalkan untuk scanner laser.</p>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-400 mb-1">Data (ID/SKU)</label>
                    <input type="text" id="inp-bc-val" class="cyber-input font-mono" placeholder="ARIES-001" value="ARIES-TECH-01" oninput="generate()">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-400 mb-1">Format Standar</label>
                    <select id="inp-bc-fmt" class="cyber-input" onchange="generate()">
                        <option value="CODE128">CODE 128 (Universal)</option>
                        <option value="CODE39">CODE 39 (Industri)</option>
                        <option value="EAN13">EAN-13 (Ritel - Wajib Angka)</option>
                    </select>
                </div>
            </div>
        `};function init(){setMode("link")}function setMode(e){currentMode=e,["link","wifi","vcard","barcode"].forEach(t=>{let a=document.getElementById(`tab-${t}`);t===e?(a.classList.remove("tab-inactive"),a.classList.add("tab-active")):(a.classList.remove("tab-active"),a.classList.add("tab-inactive"))}),document.getElementById("form-container").innerHTML=Forms[e];let t=document.getElementById("qrcode"),a=document.getElementById("barcode-canvas"),i=document.getElementById("color-picker-section");"barcode"===e?(t.classList.add("hidden"),i.classList.add("hidden"),a.classList.remove("hidden")):(t.classList.remove("hidden"),i.classList.remove("hidden"),a.classList.add("hidden")),generate()}function setColor(e){qrColor=e,"barcode"!==currentMode&&generate()}function generate(){if("barcode"===currentMode){let e=document.getElementById("inp-bc-val")?.value||"ARIES-TECH-01",t=document.getElementById("inp-bc-fmt")?.value||"CODE128";try{JsBarcode("#barcode-canvas",e,{format:t,lineColor:"#000",width:3,height:100,displayValue:!0,fontSize:20,background:"#ffffff",margin:0})}catch(a){console.log("Barcode Error")}return}let i="";if("link"===currentMode)i=document.getElementById("inp-text")?.value||"https://aries-tech.github.io";else if("wifi"===currentMode){let n=document.getElementById("inp-ssid")?.value||"",l=document.getElementById("inp-pass")?.value||"",o=document.getElementById("inp-enc")?.value||"WPA";i=n?`WIFI:S:${n};T:${o};P:${l};;`:"WIFI:S:MyWiFi;T:WPA;P:Secret;;"}else if("vcard"===currentMode){let s=document.getElementById("inp-fn")?.value||"",d=document.getElementById("inp-ln")?.value||"",c=document.getElementById("inp-tel")?.value||"";i=`BEGIN:VCARD
VERSION:3.0
N:${d};${s}
FN:${s} ${d}
TEL:${c}
EMAIL:${document.getElementById("inp-email")?.value||""}
END:VCARD`,s||d||c||(i="BEGIN:VCARD\nVERSION:3.0\nFN:Aries Tech\nEND:VCARD")}let r=document.getElementById("qrcode");r.innerHTML="",qrObj=new QRCode(r,{text:i,width:1e3,height:1e3,colorDark:qrColor,colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.H})}function downloadImage(){let e;if(!(e="barcode"===currentMode?document.getElementById("barcode-canvas"):document.querySelector("#qrcode canvas")))return;let t=e.width,a=e.height,i=document.createElement("canvas");i.width=t+100,i.height=a+100;let n=i.getContext("2d");n.fillStyle="#ffffff",n.fillRect(0,0,i.width,i.height),n.drawImage(e,50,50);let l=i.toDataURL("image/png").replace("image/png","image/octet-stream"),o=document.createElement("a");o.download=`StudioGen-${currentMode}-${Date.now()}.png`,o.href=l,o.click()}document.addEventListener("DOMContentLoaded",()=>{initSessionManager()}),init();