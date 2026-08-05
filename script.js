// Variable Global
let WEBHOOK_URL = ""; // Akan diisi URL Google Apps Script pada Phase 2
let questionsData = [];
let validToken = "";
let timerDurationMinutes = 60;
let currentIndex = 0;
let userAnswers = {};
let userIdentitas = {};
let timerInterval = null;

// 1. Memuat File Soal.json saat Aplikasi Dibuka
fetch("Soal.json")
  .then(res => {
    if (!res.ok) throw new Error("Gagal mengambil file Soal.json");
    return res.json();
  })
  .then(data => {
    validToken = data.token || "";
    timerDurationMinutes = data.timer_menit || 60;
    questionsData = data.questions || [];

    // Set informasi logo & lembaga jika ada
    if (data.logo) document.getElementById("logo-lembaga").src = data.logo;
    if (data.lembaga) document.getElementById("disp-lembaga").textContent = data.lembaga;
    if (data.sub_lembaga) document.getElementById("disp-sub-lembaga").textContent = data.sub_lembaga;
  })
  .catch(err => {
    console.error(err);
    alert("Gagal memuat file Soal.json! Pastikan file berada di folder yang sama.");
  });

// 2. Verifikasi Form Login & Token
document.getElementById("form-identitas").addEventListener("submit", function(e) {
  e.preventDefault();
  
  const inputToken = document.getElementById("token-input").value.trim();
  const errorElement = document.getElementById("pesan-error");

  if (inputToken !== validToken) {
    errorElement.textContent = "Token salah atau belum diisi!";
    return;
  }

  // Simpan Identitas Peserta
  userIdentitas = {
    nama: document.getElementById("nama").value,
    sekolah: document.getElementById("sekolah").value,
    nisn: document.getElementById("nisn").value
  };

  // Switch Tampilan ke Arena CBT
  document.getElementById("login-card").classList.add("hidden");
  document.getElementById("cbt-container").classList.remove("hidden");

  // Render Identitas Siswa di Header
  document.getElementById("disp-nama").textContent = userIdentitas.nama.toUpperCase();
  document.getElementById("disp-nisn").textContent = userIdentitas.nisn;

  // Jalankan CBT & Timer
  initCBT();
});

// 3. Inisialisasi CBT & Timer
function initCBT() {
  renderNumberGrid();
  loadQuestion(currentIndex);
  startTimer(timerDurationMinutes * 60);
}

// 4. Hitung Mundur Timer
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
      alert("Waktu Ujian Telah Habis! Jawaban Anda akan otomatis dikirim.");
      submitJawaban();
    }
  }, 1000);
}

// 5. Render Soal & Opsi Jawaban
function loadQuestion(index) {
  const q = questionsData[index];
  if (!q) return;

  document.getElementById("q-num").textContent = index + 1;
  document.getElementById("q-text").textContent = q.Soal;

  // Render Gambar Soal jika ada
  const imgContainer = document.getElementById("q-image-container");
  if (q.Gambar && q.Gambar.trim() !== "") {
    imgContainer.innerHTML = `<img src="${q.Gambar}" class="img-soal" alt="Gambar Soal">`;
  } else {
    imgContainer.innerHTML = "";
  }

  // Render Opsi Jawaban A, B, C, D, E
  const optionsBox = document.getElementById("options-box");
  optionsBox.innerHTML = "";

  const optionsKeys = ["A", "B", "C", "D", "E"];
  optionsKeys.forEach(key => {
    if (q[key] && q[key].trim() !== "") {
      const isSelected = userAnswers[q.No] === key;
      
      const optionRow = document.createElement("label");
      optionRow.className = `option-row ${isSelected ? 'selected' : ''}`;
      
      optionRow.innerHTML = `
        <input type="radio" name="option" value="${key}" ${isSelected ? 'checked' : ''}>
        <span class="opt-key">${key}.</span>
        <span class="opt-val">${q[key]}</span>
      `;

      optionRow.addEventListener("click", () => {
        pilihJawaban(q.No, key);
      });

      optionsBox.appendChild(optionRow);
    }
  });

  // Re-render MathJax untuk rumus matematika
  if (window.MathJax) {
    MathJax.typesetPromise();
  }

  // Update Status Navigasi Soal
  document.getElementById("btn-prev").disabled = (index === 0);
  document.getElementById("btn-next").disabled = (index === questionsData.length - 1);

  updateGridStatus();
}

// 6. Simpan Jawaban yang Dipilih
function pilihJawaban(qNo, key) {
  userAnswers[qNo] = key;
  loadQuestion(currentIndex);
}

// 7. Navigasi Soal (Sebelum/Berikutnya)
function navigasi(direction) {
  const newIndex = currentIndex + direction;
  if (newIndex >= 0 && newIndex < questionsData.length) {
    currentIndex = newIndex;
    loadQuestion(currentIndex);
  }
}

// 8. Render Panel Bulatan Angka Navigasi (Merah = Belum, Biru = Sudah)
function renderNumberGrid() {
  const grid = document.getElementById("number-grid");
  grid.innerHTML = "";

  questionsData.forEach((q, idx) => {
    const circle = document.createElement("div");
    circle.id = `circle-num-${idx}`;
    circle.className = "circle-btn unanswered"; // Default Merah (Belum Dijawab)
    circle.textContent = idx + 1;

    circle.onclick = () => {
      currentIndex = idx;
      loadQuestion(currentIndex);
    };

    grid.appendChild(circle);
  });
}

// 9. Update Warna Bulatan Navigasi
function updateGridStatus() {
  questionsData.forEach((q, idx) => {
    const circle = document.getElementById(`circle-num-${idx}`);
    if (!circle) return;

    // Reset kelas
    circle.className = "circle-btn";

    // Cek apakah sudah dijawab (Biru = Dijawab, Merah = Belum)
    if (userAnswers[q.No]) {
      circle.classList.add("answered");
    } else {
      circle.classList.add("unanswered");
    }

    // Tandai soal aktif saat ini
    if (idx === currentIndex) {
      circle.classList.add("active");
    }
  });
}

// 10. Konfirmasi & Submit Jawaban
function konfirmasiSubmit() {
  const total = questionsData.length;
  const dijawab = Object.keys(userAnswers).length;

  if (confirm(`Anda telah menjawab ${dijawab} dari ${total} soal.\nYakin ingin mengakhiri ujian?`)) {
    clearInterval(timerInterval);
    submitJawaban();
  }
}

function submitJawaban() {
  document.getElementById("cbt-container").innerHTML = `
    <div style="text-align:center; padding: 50px; font-family: sans-serif;">
      <h2>Jawaban Anda Berhasil Diterima!</h2>
      <p>Terima kasih telah mengikuti ujian.</p>
    </div>
  `;
  
  // Catatan: Fungsi pengiriman webhook POST akan disambungkan penuh di Phase 2.
}

function toggleNavigator() {
  const sidebar = document.querySelector(".sidebar-nav");
  sidebar.classList.toggle("hidden");
}
