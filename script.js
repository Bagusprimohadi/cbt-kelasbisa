// Variable Global
let WEBHOOK_URL = ""; // Akan diisi URL Google Apps Script pada Phase 2
let questionsData = [];
let validToken = "";
let timerDurationMinutes = 60;
let currentIndex = 0;
let userAnswers = {};
let userIdentitas = {};
let timerInterval = null;

// Variable Anti-Kecurangan & Submit Lock
let isExamStarted = false;
let isExamSubmitted = false;
let warningCount = 0;
const MAX_WARNINGS = 3;

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

    // Set informasi logo & lembaga pada halaman login
    if (data.logo) {
      document.getElementById("logo-lembaga").src = data.logo;
      if (document.getElementById("logo-lembaga-cbt")) {
        document.getElementById("logo-lembaga-cbt").src = data.logo;
      }
    }
    if (data.lembaga) {
      document.getElementById("disp-lembaga").textContent = data.lembaga;
      if (document.getElementById("disp-lembaga-cbt")) {
        document.getElementById("disp-lembaga-cbt").textContent = data.lembaga;
      }
    }
    if (data.sub_lembaga) {
      document.getElementById("disp-sub-lembaga").textContent = data.sub_lembaga;
      if (document.getElementById("disp-sub-lembaga-cbt")) {
        document.getElementById("disp-sub-lembaga-cbt").textContent = data.sub_lembaga;
      }
    }

    // Tampilkan durasi di tabel informasi
    if (document.getElementById("disp-durasi")) {
      document.getElementById("disp-durasi").textContent = timerDurationMinutes;
    }
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

  // Simpan Identitas Peserta Lengkap
  userIdentitas = {
    nama: document.getElementById("nama").value,
    sekolah: document.getElementById("sekolah").value,
    kelas: document.getElementById("kelas").value,
    nisn: document.getElementById("nisn").value,
    daerah: document.getElementById("daerah").value
  };

  // Switch Tampilan ke Arena CBT
  document.getElementById("login-card").classList.add("hidden");
  document.getElementById("cbt-container").classList.remove("hidden");

  // Render Identitas Siswa di Header CBT
  document.getElementById("disp-nama").textContent = userIdentitas.nama.toUpperCase();
  document.getElementById("disp-nisn").textContent = `${userIdentitas.nisn} (${userIdentitas.kelas})`;

  // Jalankan CBT & Timer
  initCBT();
});

// 3. Inisialisasi CBT, Anti-Cheat, & Timer
function initCBT() {
  isExamStarted = true;
  renderNumberGrid();
  loadQuestion(currentIndex);
  startTimer(timerDurationMinutes * 60);

  // === TAMBAHKAN 2 BARIS INI AGAR NOTIFIKASI PINDAH TAB AKTIF ===
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("blur", handleWindowBlur);
}

// 4. Hitung Mundur Timer (Auto-Submit Ketika Waktu Habis)
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
      alert("⏱️ Waktu Ujian Telah Habis!\nJawaban Anda secara otomatis disimpan dan dikirim ke sistem.");
      submitJawaban();
    }
  }, 1000);
}

// 5. Fitur Anti-Kecurangan: Pindah Tab & Blur Window (Toleransi Max 3 Kali)
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
    alert(`⚠️ PERINGATAN KE-${warningCount} (BATAS MAKSIMAL)!\nAnda kedapatan meninggalkan halaman ujian. Ujian Anda otomatis diakhiri dan jawaban langsung dikirim.`);
    submitJawaban();
  } else {
    alert(`⚠️ PERINGATAN KECURANGAN (${warningCount}/${MAX_WARNINGS})!\nDilarang membuka tab, jendela, atau aplikasi lain selama ujian berlangsung! Jika mencapai ${MAX_WARNINGS} kali, ujian akan terhenti otomatis.`);
  }
}

// 6. Render Soal & Opsi Jawaban
function loadQuestion(index) {
  const q = questionsData[index];
  if (!q) return;

  document.getElementById("q-num").textContent = index + 1;
  
  // Menggunakan innerHTML agar MathJax/LaTeX ter-render dengan benar
  document.getElementById("q-text").innerHTML = q.Soal;

  // Render Gambar Soal jika ada
  const imgContainer = document.getElementById("q-image-container");
  if (q.Gambar && String(q.Gambar).trim() !== "") {
    imgContainer.innerHTML = `<img src="${q.Gambar}" class="img-soal" alt="Gambar Soal">`;
  } else {
    imgContainer.innerHTML = "";
  }

  // Render Opsi Jawaban A, B, C, D, E
  const optionsBox = document.getElementById("options-box");
  optionsBox.innerHTML = "";

  const optionsKeys = ["A", "B", "C", "D", "E"];
  optionsKeys.forEach(key => {
    if (q[key] && String(q[key]).trim() !== "") {
      const isSelected = userAnswers[q.No] === key;
      
      const optionRow = document.createElement("label");
      optionRow.className = `option-row ${isSelected ? 'selected' : ''}`;
      
      optionRow.innerHTML = `
        <input type="radio" name="option_${q.No}" value="${key}" ${isSelected ? 'checked' : ''}>
        <span class="opt-key">${key}.</span>
        <span class="opt-val">${q[key]}</span>
      `;

      // Event listener saat opsi diklik
      optionRow.addEventListener("click", (e) => {
        if (e.target.tagName !== "INPUT") {
          pilihJawaban(q.No, key);
        }
      });

      optionsBox.appendChild(optionRow);
    }
  });

  // Re-render MathJax untuk rumus
  if (window.MathJax) {
    MathJax.typesetPromise();
  }

  // Update Status Navigasi Tombol
  document.getElementById("btn-prev").disabled = (index === 0);
  document.getElementById("btn-next").disabled = (index === questionsData.length - 1);

  updateGridStatus();
}

// 7. Simpan Jawaban yang Dipilih
function pilihJawaban(qNo, key) {
  userAnswers[qNo] = key;
  loadQuestion(currentIndex);
}

// 8. Navigasi Soal (Sebelum/Berikutnya)
function navigasi(direction) {
  const newIndex = currentIndex + direction;
  if (newIndex >= 0 && newIndex < questionsData.length) {
    currentIndex = newIndex;
    loadQuestion(currentIndex);
  }
}

// 9. Render Panel Bulatan Angka Navigasi
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

// 10. Update Warna Bulatan Navigasi (Merah = Belum, Biru = Sudah)
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

// 11. Konfirmasi & Submit Jawaban (Dengan Proteksi Anti Double Submit)
function konfirmasiSubmit() {
  const total = questionsData.length;
  const dijawab = Object.keys(userAnswers).length;

  if (confirm(`Anda telah menjawab ${dijawab} dari ${total} soal.\nYakin ingin mengakhiri ujian?`)) {
    submitJawaban();
  }
}

function submitJawaban() {
  // Cegah pemanggilan fungsi submit berulang kali
  if (isExamSubmitted) return;
  isExamSubmitted = true;

  // Hentikan Timer & Lepas Listener Anti-Cheat
  clearInterval(timerInterval);
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  window.removeEventListener("blur", handleWindowBlur);

  // Tampilan Akhir Setelah Submit
  document.getElementById("cbt-container").innerHTML = `
    <div style="text-align:center; padding: 60px 20px; font-family: sans-serif;">
      <h2 style="color: #4a3e56; margin-bottom: 10px;">Jawaban Anda Berhasil Diterima!</h2>
      <p style="color: #7d756d;">Terima kasih telah mengikuti ujian dengan jujur dan tertib.</p>
    </div>
  `;
}

function toggleNavigator() {
  const sidebar = document.querySelector(".sidebar-nav");
  sidebar.classList.toggle("hidden");
}
