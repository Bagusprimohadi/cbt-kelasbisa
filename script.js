// ==========================================================
// CBT-KIBI Versi 1.1 - Core Engine (Mobile Touch & MathJax Fixed)
// ==========================================================

// Variable Global
let WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbwl_bLhSAUz30B-10g3xvP9cXPAuooTGa9cMtQPJAGyKYY9UMyux_OtvO9EH40PRds/exec"; 
let questionsData = [];
let validToken = "";
let timerDurationMinutes = 60;
let currentIndex = 0;
let userAnswers = {};
let userIdentitas = {};
let timerInterval = null;
let currentKodeUjian = "";

// Variable Anti-Kecurangan & Submit Lock
let isExamStarted = false;
let isExamSubmitted = false;
let warningCount = 0;
const MAX_WARNINGS = 3;

// ==========================================================
// 1. PAGE 1: VERIFIKASI IDENTITAS, KODE UJIAN & TOKEN
// ==========================================================
document.getElementById("form-identitas").addEventListener("submit", function(e) {
  e.preventDefault();
  
  const kodeInput = document.getElementById("kode-ujian-input").value.trim().toUpperCase();
  const inputToken = document.getElementById("token-input").value.trim();
  const errorElement = document.getElementById("pesan-error-login");
  const btnSubmit = document.getElementById("btn-lanjut-info");

  if (!kodeInput) {
    errorElement.textContent = "Silakan masukkan Kode Ujian!";
    return;
  }
  if (!inputToken) {
    errorElement.textContent = "Silakan masukkan Token Ujian!";
    return;
  }

  errorElement.textContent = "";
  btnSubmit.disabled = true;
  btnSubmit.textContent = "Memeriksa Kode Ujian...";

  // Panggil File JSON Sesuai Kode Ujian (contoh: FISIKA01-Soal.json)
  const targetJsonFile = `${kodeInput}-Soal.json`;

  fetch(targetJsonFile)
    .then(res => {
      if (!res.ok) {
        throw new Error(`Kode Ujian '${kodeInput}' tidak ditemukan atau belum dipublikasikan!`);
      }
      return res.json();
    })
    .then(data => {
      // Verifikasi Token
      if (inputToken !== data.token) {
        throw new Error("Token Ujian salah atau tidak berlaku untuk paket ini!");
      }

      // Simpan data konfigurasi soal
      currentKodeUjian = kodeInput;
      validToken = data.token || "";
      timerDurationMinutes = data.timer_menit || 60;
      questionsData = data.questions || [];

      // Simpan Identitas Peserta
      userIdentitas = {
        nama: document.getElementById("nama").value.trim(),
        sekolah: document.getElementById("sekolah").value.trim(),
        kelas: document.getElementById("kelas").value.trim(),
        nisn: document.getElementById("nisn").value.trim(),
        daerah: document.getElementById("daerah").value.trim(),
        kode_ujian: currentKodeUjian
      };

      // Set Informasi Branding & Ujian di Page 2 (Information Page)
      if (data.logo) {
        document.getElementById("logo-lembaga-info").src = data.logo;
        document.getElementById("logo-lembaga-cbt").src = data.logo;
      }
      if (data.lembaga) {
        document.getElementById("disp-lembaga-info").textContent = data.lembaga;
        document.getElementById("disp-lembaga-cbt").textContent = data.lembaga;
      }
      if (data.sub_lembaga) {
        document.getElementById("disp-sub-lembaga").textContent = data.sub_lembaga;
        document.getElementById("disp-sub-lembaga-info").textContent = data.sub_lembaga;
        document.getElementById("disp-sub-lembaga-cbt").textContent = data.sub_lembaga;
      }

      document.getElementById("disp-kode-ujian").textContent = currentKodeUjian;
      document.getElementById("disp-durasi").textContent = timerDurationMinutes;
      document.getElementById("disp-jumlah-soal").textContent = questionsData.length;

      // Pindah Tampilan ke Page 2
      document.getElementById("page-login").classList.add("hidden");
      document.getElementById("page-info").classList.remove("hidden");
      window.scrollTo(0, 0);
    })
    .catch(err => {
      console.error(err);
      errorElement.textContent = err.message;
    })
    .finally(() => {
      btnSubmit.disabled = false;
      btnSubmit.textContent = "Verifikasi & Lanjut ke Petunjuk >>";
    });
});

// ==========================================================
// 2. PAGE 2: CONTROLLER KETENTUAN & TOMBOL MULAI
// ==========================================================
function toggleMulaiButton() {
  const isChecked = document.getElementById("check-setuju").checked;
  const btnMulai = document.getElementById("btn-mulai-ujian");
  
  if (isChecked) {
    btnMulai.disabled = false;
    btnMulai.classList.remove("btn-start-disabled");
  } else {
    btnMulai.disabled = true;
    btnMulai.classList.add("btn-start-disabled");
  }
}

function kembaliKePage1() {
  document.getElementById("page-info").classList.add("hidden");
  document.getElementById("page-login").classList.remove("hidden");
  window.scrollTo(0, 0);
}

function mulaiUjianPenuh() {
  // Pindah Tampilan dari Page 2 ke Page 3 (Arena CBT)
  document.getElementById("page-info").classList.add("hidden");
  document.getElementById("page-cbt").classList.remove("hidden");

  // Render Identitas Peserta di Header CBT
  document.getElementById("disp-nama").textContent = userIdentitas.nama.toUpperCase();
  document.getElementById("disp-nisn").textContent = `${userIdentitas.nisn} (${userIdentitas.kelas})`;

  // Inisialisasi Arena Ujian & Timer
  initCBT();
}

// ==========================================================
// 3. PAGE 3: INISIALISASI CBT, ANTI-CHEAT & TIMER
// ==========================================================
function initCBT() {
  isExamStarted = true;
  renderNumberGrid();
  loadQuestion(currentIndex);
  startTimer(timerDurationMinutes * 60);

  // Pasang Listener Anti-Kecurangan
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("blur", handleWindowBlur);
}

// Hitung Mundur Timer (Auto-Submit Saat Habis)
function startTimer(totalSeconds) {
  let timerSeconds = totalSeconds;
  const timerDisplay = document.getElementById("timer");

  timerInterval = setInterval(() => {
    const hours = Math.floor(timerSeconds / 3600);
    const minutes = Math.floor((timerSeconds % 3600) / 60);
    const seconds = timerSeconds % 60;

    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');

    timerDisplay.textContent = `${hh}:${mm}:${ss}`;

    if (--timerSeconds < 0) {
      clearInterval(timerInterval);
      playVoiceWarning("Waktu ujian telah habis. Jawaban Anda otomatis dikirim.");
      alert("⏱️ Waktu Ujian Telah Habis!\nJawaban Anda secara otomatis disimpan dan dikirim ke sistem.");
      submitJawaban();
    }
  }, 1000);
}

// Suara Peringatan (Text-to-Speech)
function playVoiceWarning(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}

// Anti-Kecurangan: Pindah Tab / Blur Window (Max 3 Warning)
function handleVisibilityChange() {
  if (isExamStarted && !isExamSubmitted && document.hidden) {
    prosesPeringatanKecurangan();
  }
}

function handleWindowBlur() {
  if (isExamStarted && !isExamSubmitted) {
    prosesPeringatanKecurangan();
  }
}

function prosesPeringatanKecurangan() {
  warningCount++;
  
  if (warningCount >= MAX_WARNINGS) {
    const pesanTerakhir = "Batas toleransi habis! Ujian Anda otomatis diakhiri.";
    playVoiceWarning(pesanTerakhir);
    
    alert(`⚠️ PERINGATAN KE-${warningCount} (BATAS MAKSIMAL)!\nAnda kedapatan meninggalkan halaman ujian. Ujian Anda otomatis diakhiri dan jawaban langsung dikirim.`);
    submitJawaban();
  } else {
    const pesanTeguran = `Peringatan ke ${warningCount}. Dilarang membuka tab atau aplikasi lain saat ujian!`;
    playVoiceWarning(pesanTeguran);

    alert(`⚠️ PERINGATAN KECURANGAN (${warningCount}/${MAX_WARNINGS})!\nDilarang membuka tab, jendela, atau aplikasi lain selama ujian berlangsung! Jika mencapai ${MAX_WARNINGS} kali, ujian akan terhenti otomatis.`);
  }
}

// ==========================================================
// 4. RENDER SOAL & NAVIGASI (FIXED UNTUK MOBILE & MATHJAX)
// ==========================================================
function loadQuestion(index) {
  const q = questionsData[index];
  if (!q) return;

  document.getElementById("q-num").textContent = index + 1;
  document.getElementById("q-text").innerHTML = q.Soal;

  // Render Gambar Soal
  const imgContainer = document.getElementById("q-image-container");
  if (q.Gambar && String(q.Gambar).trim() !== "") {
    imgContainer.innerHTML = `<img src="${q.Gambar}" class="img-soal" alt="Gambar Soal">`;
  } else {
    imgContainer.innerHTML = "";
  }

  // Render Opsi A - E
  const optionsBox = document.getElementById("options-box");
  optionsBox.innerHTML = "";

  const optionsKeys = ["A", "B", "C", "D", "E"];
  optionsKeys.forEach(key => {
    if (q[key] && String(q[key]).trim() !== "") {
      const isSelected = userAnswers[q.No] === key;
      
      // Menggunakan tag <div> agar aman di browser HP
      const optionRow = document.createElement("div"); 
      optionRow.className = `option-row ${isSelected ? 'selected' : ''}`;
      
      optionRow.innerHTML = `
        <input type="radio" name="option_${q.No}" value="${key}" ${isSelected ? 'checked' : ''} style="pointer-events: none;">
        <span class="opt-key">${key}.</span>
        <span class="opt-val">${q[key]}</span>
      `;

      optionRow.onclick = function() {
        pilihJawaban(q.No, key);
      };

      optionsBox.appendChild(optionRow);
    }
  });

  // Re-render MathJax Khusus Elemen Soal dan Opsi Jawaban
  if (window.MathJax && window.MathJax.typesetPromise) {
    MathJax.typesetPromise([
      document.getElementById("q-text"),
      document.getElementById("options-box")
    ]).catch(err => console.error("MathJax error:", err));
  }

  // Update Status Navigasi
  document.getElementById("btn-prev").disabled = (index === 0);
  document.getElementById("btn-next").disabled = (index === questionsData.length - 1);

  updateGridStatus();
}

function pilihJawaban(qNo, key) {
  userAnswers[qNo] = key;
  loadQuestion(currentIndex);
}

function navigasi(direction) {
  const newIndex = currentIndex + direction;
  if (newIndex >= 0 && newIndex < questionsData.length) {
    currentIndex = newIndex;
    loadQuestion(currentIndex);
  }
}

function renderNumberGrid() {
  const grid = document.getElementById("number-grid");
  grid.innerHTML = "";

  questionsData.forEach((q, idx) => {
    const circle = document.createElement("div");
    circle.id = `circle-num-${idx}`;
    circle.className = "circle-btn unanswered";
    circle.textContent = idx + 1;

    circle.onclick = () => {
      currentIndex = idx;
      loadQuestion(currentIndex);
    };

    grid.appendChild(circle);
  });
}

function updateGridStatus() {
  questionsData.forEach((q, idx) => {
    const circle = document.getElementById(`circle-num-${idx}`);
    if (!circle) return;

    circle.className = "circle-btn";

    if (userAnswers[q.No]) {
      circle.classList.add("answered");
    } else {
      circle.classList.add("unanswered");
    }

    if (idx === currentIndex) {
      circle.classList.add("active");
    }
  });
}

// ==========================================================
// 5. SUBMIT JAWABAN & WEBHOOK INTEGRATION
// ==========================================================
function konfirmasiSubmit() {
  const total = questionsData.length;
  const dijawab = Object.keys(userAnswers).length;

  if (confirm(`Anda telah menjawab ${dijawab} dari ${total} soal.\nYakin ingin mengakhiri ujian?`)) {
    submitJawaban();
  }
}

function konfirmasiKeluar() {
  if (confirm("Apakah Anda yakin ingin keluar dari halaman ujian? Seluruh progres ujian Anda akan terhenti.")) {
    location.reload();
  }
}

function submitJawaban() {
  if (isExamSubmitted) return;
  isExamSubmitted = true;

  clearInterval(timerInterval);
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  window.removeEventListener("blur", handleWindowBlur);

  // Tampilan Loading
  document.getElementById("page-cbt").innerHTML = `
    <div style="text-align:center; padding: 60px 20px; font-family: sans-serif;">
      <h2 style="color: #4a3e56; margin-bottom: 10px;">Mengirimkan Jawaban...</h2>
      <p style="color: #7d756d;">Mohon tunggu sebentar, jawaban Anda sedang disimpan ke sistem.</p>
    </div>
  `;

  // Susun Payload dengan kode_ujian
  const payload = {
    kode_soal: currentKodeUjian,
    identitas: userIdentitas,
    jawaban: userAnswers,
    total_dijawab: Object.keys(userAnswers).length,
    total_soal: questionsData.length
  };

  if (WEBHOOK_URL && WEBHOOK_URL.trim() !== "") {
    fetch(WEBHOOK_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
    .then(() => {
      tampilkanLayarSelesai();
    })
    .catch(err => {
      console.error("Error Webhook:", err);
      tampilkanLayarSelesai();
    });
  } else {
    tampilkanLayarSelesai();
  }
}

function tampilkanLayarSelesai() {
  document.getElementById("page-cbt").innerHTML = `
    <div style="text-align:center; padding: 60px 20px; font-family: sans-serif;">
      <h2 style="color: #2e7d32; margin-bottom: 10px;">✅ Jawaban Anda Berhasil Diterima!</h2>
      <p style="color: #555;">Terima kasih telah mengikuti ujian [Kode: <strong>${currentKodeUjian}</strong>] dengan jujur dan tertib.</p>
    </div>
  `;
}

function toggleNavigator() {
  const sidebar = document.querySelector(".sidebar-nav");
  sidebar.classList.toggle("hidden");
}
