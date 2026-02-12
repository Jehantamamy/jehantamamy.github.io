/**
 * ARIES SMART BANNER
 * Menampilkan 4 produk random dari kolam affiliate
 */

document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. KOLAM DATA PRODUK (Isi sebanyak-banyaknya di sini) ---
    const adPool = [
        // Produk 1
        { 
            name: "Bawang putih tunggal/Bawang Lanang Tunggal/Bawang Tunggal Pi", 
            link: "https://s.shopee.co.id/8fMqNhHChh", 
            img: "https://down-id.img.susercontent.com/file/id-11134207-7rbk2-m8vd41v3zeald1" 
        },
        // Produk 2
        { 
            name: "Tumbler Minum Stainless Jumbo Hook 890ml - Custom Grafir Ter", 
            link: "https://s.shopee.co.id/8zzgmfcSse", 
            img: "https://down-id.img.susercontent.com/file/id-11134207-81ztm-mfakxmwrw5qn32" 
        },
        // Produk 3
        { 
            name: "NODEMCU AMICA LUA CP2102 ESP8266 WIFI DEVELOPMENT BOARD inte", 
            link: "https://s.shopee.co.id/9pYnffye0y", 
            img: "https://down-id.img.susercontent.com/file/ed8fc57bee6c65bfc07d79ac85833152" 
        },
        // Produk 4
        { 
            name: "OLED 0,96 0.96 inch inchi 0.96", 
            link: "https://s.shopee.co.id/5L6OJSpY2x", 
            img: "https://down-id.img.susercontent.com/file/d12af78ea9329d153109cee675bc43a2" 
        },
        // Produk 5
        { 
            name: "UNO R3-ARDUINO UNO ATMEGA328P DIP 16U2 VERSION", 
            link: "https://s.shopee.co.id/gKYtWsZBH", 
            img: "https://down-id.img.susercontent.com/file/id-11134207-7rbk1-m9b5zyj8xm3h59" 
        },
        // Produk 6 (Tambahkan terus...)
        { 
            name: "Arduino UNO R3 ATMEGA328P ATMEGA 16U2 Compatible Board + Kab", 
            link: "https://shopee.co.id/LINK_PRODUK_6", 
            img: "https://down-id.img.susercontent.com/file/id-11134207-8224s-mipohfirk35w25" 
        },
		{ 
            name: "Sensor Jarak Ultrasonik HC-SR04 – Arduino, ESP32,", 
            link: "https://s.shopee.co.id/2g5dIs0kSl", 
            img: "https://down-id.img.susercontent.com/file/572ce44e6d4fecf2f30b33b1a5a9ebc8" 
        },
		{ 
            name: "NodeMCU V3 ESP8266 CH340 – Board WiFi IoT 4MB Flas", 
            link: "https://s.shopee.co.id/7KrSrYB9Pi", 
            img: "https://down-id.img.susercontent.com/file/sg-11134201-7rdyc-mcahrc10dvc09f" 
        },
		{ 
            name: "UNO R3 ATMEGA328P CH340 SMD", 
            link: "https://s.shopee.co.id/9pYnqEDE2Y", 
            img: "https://down-id.img.susercontent.com/file/id-11134207-81zti-mdvp07pj7v2d01" 
        }
    ];

    // --- 2. LOGIKA PENGACAK (Fisher-Yates Shuffle) ---
    function getRandomItems(arr, count) {
        // Copy array biar data asli gak rusak
        const shuffled = [...arr];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled.slice(0, count);
    }

    // Ambil 4 Item Random
    const selectedAds = getRandomItems(adPool, 4);

    // --- 3. RENDER KE HTML (Template Compact Strip) ---
    const container = document.getElementById("shopee-dynamic-banner");
    
    if (container) {
        let html = `
        <div class="flex items-center justify-between mb-2 px-1">
            <span class="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                <i class="fa-solid fa-bolt text-yellow-500 mr-1"></i> Gear Recommendations
            </span>
            <span class="text-[9px] text-slate-600">Sponsored Links</span>
        </div>

        <div class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 shadow-lg shadow-black/20">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
        `;

        selectedAds.forEach(product => {
            html += `
                <a href="${product.link}" target="_blank" rel="nofollow noopener" class="group flex items-center gap-3 p-2 rounded-lg hover:bg-slate-900 border border-transparent hover:border-[#EE4D2D]/50 transition-all">
                    <div class="w-10 h-10 md:w-12 md:h-12 bg-slate-800 rounded-md overflow-hidden flex-shrink-0 border border-slate-700 group-hover:border-[#EE4D2D] transition-colors">
                        <img src="${product.img}" alt="${product.name}" class="w-full h-full object-cover">
                    </div>
                    <div class="flex-1 min-w-0">
                        <h4 class="text-slate-300 text-[10px] md:text-xs font-bold truncate group-hover:text-white transition-colors">
                            ${product.name}
                        </h4>
                        <div class="text-[#EE4D2D] text-[10px] font-bold mt-0.5 flex items-center gap-1">
                            Cek Harga <i class="fa-solid fa-chevron-right text-[8px]"></i>
                        </div>
                    </div>
                </a>
            `;
        });

        html += `   </div>
                </div>`;
        
        container.innerHTML = html;
    }
});