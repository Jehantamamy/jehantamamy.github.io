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
    // --- STATE VARIABLES ---
    let chart;
    let time = 0;
    
    // Filter Memory
    let smaBuffer = [];
    let lastEma = 0;
    
    // Statistics
    let smaErrorSum = 0;
    let emaErrorSum = 0;
    let sampleCount = 0;

    // --- INITIALIZATION ---
    function initChart() {
        const ctx = document.getElementById('filterChart').getContext('2d');
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    { 
                        label: 'Raw Sensor (Noisy)', 
                        data: [], 
                        borderColor: '#f43f5e', // Rose
                        borderWidth: 1, 
                        pointRadius: 0, 
                        tension: 0.1 
                    },
                    { 
                        label: 'SMA Filtered', 
                        data: [], 
                        borderColor: '#0ea5e9', // Sky Blue
                        borderWidth: 2, 
                        pointRadius: 0, 
                        tension: 0.3 
                    },
                    { 
                        label: 'EMA Filtered', 
                        data: [], 
                        borderColor: '#a855f7', // Purple
                        borderWidth: 2, 
                        pointRadius: 0, 
                        tension: 0.3 
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false, // Matikan animasi agar performa tinggi
                interaction: { intersect: false },
                scales: {
                    y: { 
                        min: 0, 
                        max: 100, 
                        grid: { color: '#f1f5f9' } 
                    },
                    x: { 
                        display: false // Sembunyikan label X agar bersih
                    }
                },
                plugins: { 
                    legend: { 
                        labels: { 
                            font: { size: 10, family: 'Inter' },
                            usePointStyle: true
                        } 
                    } 
                }
            }
        });
    }

    // --- SIMULATION LOOP (10Hz) ---
    function simulate() {
        // 1. Get User Input
        const noiseIntensity = parseFloat(document.getElementById('noise-lvl').value);
        const smaWindow = parseInt(document.getElementById('sma-window').value);
        const emaAlpha = parseFloat(document.getElementById('ema-alpha').value);

        // Update UI Labels
        document.getElementById('noise-val').innerText = noiseIntensity;
        document.getElementById('sma-val').innerText = smaWindow;
        document.getElementById('ema-val').innerText = emaAlpha.toFixed(2);

        // 2. Generate Data (Sine Wave Base + Random Noise)
        // Base signal: Sine wave berpusat di 50, amplitudo 30
        const baseSignal = 50 + Math.sin(time * 0.1) * 30;
        const noise = (Math.random() - 0.5) * noiseIntensity * 2;
        const rawData = baseSignal + noise;

        // 3. Apply SMA Filter (Moving Average)
        smaBuffer.push(rawData);
        if (smaBuffer.length > smaWindow) smaBuffer.shift();
        const smaData = smaBuffer.reduce((a, b) => a + b, 0) / smaBuffer.length;

        // 4. Apply EMA Filter (Exponential Moving Average)
        // Rumus: y[n] = α * x[n] + (1 - α) * y[n-1]
        // Inisialisasi awal (jika time 0) pakai rawData agar tidak mulai dari 0
        if(time === 0) lastEma = rawData;
        const emaData = (emaAlpha * rawData) + ((1 - emaAlpha) * lastEma);
        lastEma = emaData;
        
        // 5. Calculate Error (RMSE)
        // Selisih antara hasil filter dengan Base Signal (Ideal tanpa noise)
        const smaErr = Math.pow(smaData - baseSignal, 2);
        const emaErr = Math.pow(emaData - baseSignal, 2);

        smaErrorSum += smaErr;
        emaErrorSum += emaErr;
        sampleCount++;
        
        // Update UI RMSE (Setiap 5 frame agar tidak flicker)
        if (sampleCount % 5 === 0) {
            document.getElementById('sma-rmse').innerText = Math.sqrt(smaErrorSum / sampleCount).toFixed(2);
            document.getElementById('ema-rmse').innerText = Math.sqrt(emaErrorSum / sampleCount).toFixed(2);
        }

        // 6. Update Chart
        chart.data.labels.push(time.toFixed(1));
        chart.data.datasets[0].data.push(rawData);
        chart.data.datasets[1].data.push(smaData);
        chart.data.datasets[2].data.push(emaData);

        // Batasi hanya 100 titik data di layar agar memori aman
        if (chart.data.labels.length > 100) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
            chart.data.datasets[1].data.shift();
            chart.data.datasets[2].data.shift();
        }

        chart.update('none'); // Update mode 'none' agar tidak ada animasi berat
        time += 1;
    }

    // --- UTILITIES ---

    function resetData() {
        // Reset Logic
        time = 0;
        smaBuffer = [];
        lastEma = 0;
        smaErrorSum = 0;
        emaErrorSum = 0;
        sampleCount = 0;
        
        // Reset UI
        document.getElementById('sma-rmse').innerText = "0.00";
        document.getElementById('ema-rmse').innerText = "0.00";
        
        // Reset Chart
        chart.data.labels = [];
        chart.data.datasets.forEach(d => d.data = []);
        chart.update();
    }
    
    function updateGeneratedCode() {
        const smaWindow = document.getElementById('sma-window').value;
        const emaAlpha = document.getElementById('ema-alpha').value;
        
        // Template Code C++ / Arduino
        const code = `
/* * Generated by Aries Tech - Filter Lab
 * Parameters: SMA Window=${smaWindow}, EMA Alpha=${emaAlpha}
 */

// === OPSI 1: EMA Filter (Direkomendasikan: Irit Memori) ===
float emaAlpha = ${emaAlpha};
float lastEMA = 0;

float applyEMA(float rawData) {
    float filtered = (emaAlpha * rawData) + ((1.0 - emaAlpha) * lastEMA);
    lastEMA = filtered;
    return filtered;
}

// === OPSI 2: SMA Filter (Butuh Array Memori) ===
const int WINDOW_SIZE = ${smaWindow};
float readings[WINDOW_SIZE];
int readIndex = 0;
float total = 0;
float average = 0;

float applySMA(float rawData) {
    total = total - readings[readIndex]; // Kurangi data lama
    readings[readIndex] = rawData;       // Simpan data baru
    total = total + readings[readIndex]; // Tambah data baru
    readIndex = (readIndex + 1) % WINDOW_SIZE; // Geser index
    
    average = total / WINDOW_SIZE;
    return average;
}

void setup() {
    Serial.begin(9600);
    // Inisialisasi array SMA dengan 0
    for (int i = 0; i < WINDOW_SIZE; i++) readings[i] = 0;
}

void loop() {
    // Contoh pembacaan sensor
    float sensorValue = analogRead(A0); 
    
    // Pilih salah satu filter:
    float hasilFilter = applyEMA(sensorValue); 
    
    Serial.print("Raw:");
    Serial.print(sensorValue);
    Serial.print(",Filtered:");
    Serial.println(hasilFilter);
    
    delay(10); // Sampling rate
}
        `.trim();

        document.getElementById('code-output').innerText = code;
    }

    function copyCode() {
        const codeText = document.getElementById('code-output').innerText;
        navigator.clipboard.writeText(codeText).then(() => {
            alert("Kode C++ berhasil disalin ke clipboard!");
        });
    }

    // --- EVENT LISTENERS ---
    
    // Update Code Generator saat slider berubah
    document.querySelectorAll('input[type=range]').forEach(el => {
        el.addEventListener('input', updateGeneratedCode);
    });

    // Reset data jika parameter berubah (agar grafik tidak loncat aneh)
    document.querySelectorAll('input[type=range]').forEach(el => {
        el.addEventListener('change', () => {
            // Optional: resetData(); // Uncomment jika ingin auto-reset saat slider dilepas
        });
    });

    // --- STARTUP ---
    window.onload = function() {
        initChart();
        updateGeneratedCode();
        // Jalankan simulasi setiap 50ms (20 FPS)
        setInterval(simulate, 50);
    };
