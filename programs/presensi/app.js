// Import Capacitor Plugins
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Device } from '@capacitor/device';

// State Management Sederhana
const State = {
    currentUser: null,
    currentRole: null,
    navigationHistory: ['page-login']
};

// Konfigurasi Firebase (Dapatkan dari Console Firebase Anda)
const firebaseConfig = {
    apiKey: "AIzaSy...",
    authDomain: "pentol-app.firebaseapp.com",
    databaseURL: "https://pentol-app.firebaseio.com",
    projectId: "pentol-app",
    storageBucket: "pentol-app.appspot.com",
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Inisialisasi Aplikasi
window.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    const btnBack = document.getElementById('btn-back');
    
    // Event Listener Tombol Kembali
    btnBack.addEventListener('click', () => {
        goBack();
    });

    // Validasi Hardware Lock (Aturan Mandatori Anda)
    checkHardwareLock();
}

async function checkHardwareLock() {
    const info = await Device.getId();
    console.log("HWID terdeteksi:", info.identifier);
    // Di sini Anda bisa menambahkan validasi HWID ke database cloud
}

// --- SISTEM NAVIGASI (SPA) ---

window.goToPage = function(pageId, role = null) {
    // Sembunyikan semua halaman
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    // Tampilkan halaman tujuan
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        State.navigationHistory.push(pageId);
        updateNavigationUI(pageId);
    }
};

function goBack() {
    if (State.navigationHistory.length > 1) {
        State.navigationHistory.pop(); // Hapus halaman saat ini
        const prevPage = State.navigationHistory[State.navigationHistory.length - 1];
        
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(prevPage).classList.add('active');
        
        updateNavigationUI(prevPage);
    }
}

function updateNavigationUI(pageId) {
    const btnBack = document.getElementById('btn-back');
    // Sembunyikan tombol kembali jika di halaman login atau dashboard utama role
    const isDashboard = ['page-login', 'page-guru', 'page-waka', 'page-kepsek'].includes(pageId);
    btnBack.style.display = isDashboard ? 'none' : 'block';
}

// --- LOGIKA ROLE-BASED LOGIN ---

window.handleLogin = function() {
    const role = document.getElementById('role-select').value;
    const user = document.getElementById('username').value;

    if (!user) return alert("Masukkan Username!");

    State.currentUser = user;
    State.currentRole = role;
    document.getElementById('user-display').innerText = `${user} (${role})`;

    // Navigasi berdasarkan Role
    if (role === 'guru') goToPage('page-guru');
    else if (role === 'waka') goToPage('page-waka');
    else if (role === 'kepsek') goToPage('page-kepsek');
};

// --- FITUR GURU: SCAN & PRESENSI ---

window.startScan = async function() {
    try {
        await BarcodeScanner.requestPermissions();
        const { barcodes } = await BarcodeScanner.scan();
        const studentName = barcodes[0].rawValue;
        
        // Auto-fill ke list kehadiran
        addAttendanceRecord(studentName);
        alert(`Presensi Berhasil: ${studentName}`);
    } catch (err) {
        console.error("Scan cancelled/error", err);
    }
};

// --- FITUR WAKA: IMPORT EXCEL ---
window.handleExcelImport = function(event) {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        // Upload List Siswa ke Cloud
        const kelasId = prompt("Masukkan Nama Kelas (contoh: XI-Robotika):");
        if(kelasId) {
            db.ref('kelas/' + kelasId).set({
                identitas: kelasId,
                siswa: jsonData
            });
            alert("Data Kelas Berhasil Diimport ke Cloud!");
        }
    };
    reader.readAsArrayBuffer(file);
};

// --- FITUR GURU: SIMPAN PRESENSI & NILAI KE CLOUD ---
window.saveDailyGrade = async function() {
    const name = document.getElementById('target-student').innerText.replace('Siswa: ', '');
    const grade = document.getElementById('daily-grade').value;
    const note = document.getElementById('daily-note').value;
    const teacher = State.currentUser;

    if(!grade) return alert("Isi nilai terlebih dahulu!");

    const attendanceData = {
        nama: name,
        nilai: grade,
        catatan: note,
        guru: teacher,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    // Push data ke cloud
    await db.ref('presensi_harian').push(attendanceData);
    
    alert("Data Tersimpan ke Database Cloud!");
    goBack();
};

// --- FITUR KEPSEK: MONITORING REAL-TIME ---
window.loadRealTimeReport = function() {
    const reportList = document.getElementById('report-viewer');
    
    // Listen data dari cloud secara real-time
    db.ref('presensi_harian').on('value', (snapshot) => {
        const data = snapshot.val();
        // Logika pengolahan data kualitatif & kuantitatif untuk Kepsek
        console.log("Data terbaru dari Cloud:", data);
        renderKepsekReport(data);
    });
};

function addAttendanceRecord(name) {
    const list = document.getElementById('attendance-list');
    const li = document.createElement('li');
    li.innerHTML = `<span>${name}</span> <button onclick="selectStudent('${name}')" class="btn-small">Nilai</button>`;
    list.prepend(li);
}

window.selectStudent = function(name) {
    document.getElementById('target-student').innerText = `Siswa: ${name}`;
    goToPage('page-penilaian');
};