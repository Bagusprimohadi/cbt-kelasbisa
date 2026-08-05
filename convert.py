# -*- coding: utf-8 -*-
import json
import os
import re
import subprocess
import pandas as pd


def clean_latex(text):
    """Merapikan sintaks LaTeX agar aman dirender MathJax tanpa error delimiter."""
    if not isinstance(text, str):
        return text

    # 1. Hapus non-breaking space (\xa0)
    text = text.replace("\xa0", " ")

    # 2. Ganti \left( dan \right) menjadi kurung biasa agar tidak mismatch
    text = re.sub(r"\\left\s*\(", "(", text)
    text = re.sub(r"\\right\s*\)", ")", text)

    # 3. Ganti \left[ dan \right] jika ada
    text = re.sub(r"\\left\s*\[", "[", text)
    text = re.sub(r"\\right\s*\]", "]", text)

    # 4. Hapus perintah \left atau \right yang berdiri sendiri
    text = text.replace(r"\left", "").replace(r"\right", "")

    return text.strip()


def convert_excel_to_cbt_json():
    # ==========================================================
    # KONFIGURASI KIBI v1.1 (EDIT DI SINI)
    # ==========================================================
    # KODE UJIAN: Kunci pengarah dinamis (Bisa Huruf, Angka, Kombinasi)
    # Contoh: "FISIKA01", "KIMIA-UKK", "OSN2026", "A1", "01"
    kode_ujian = "FISIKA01"

    # File Excel Input
    excel_file = r"D:\03-CBT\Soal.xlsx"

    # Path Folder Output
    base_dir = r"D:\03-CBT"

    # Penamaan File JSON Otomatis Berdasarkan Kode Ujian
    # Hasil: D:\03-CBT\FISIKA01-Soal.json
    output_json = os.path.join(base_dir, f"{kode_ujian.upper()}-Soal.json")

    # Metadata Ujian
    token_exam = "UTSMAT2026"
    timer_menit = 60
    nama_lembaga = "KELAS BISA by BRISKA CORP"
    sub_lembaga = "Try Out OSN Tingkat Semifinal 2026"
    logo_url = "https://lh3.googleusercontent.com/d/1TYEl9QOZV3EU5p3peLGaaUZcjrOISSSz"

    try:
        df = pd.read_excel(excel_file, na_filter=False)
        questions = []

        for idx, row in df.iterrows():
            no_soal = int(row["No"]) if row["No"] != "" else idx + 1

            item = {
                "No": no_soal,
                "Soal": clean_latex(str(row["Soal"])),
                "A": clean_latex(str(row["A"])),
                "B": clean_latex(str(row["B"])),
                "C": clean_latex(str(row["C"])),
                "D": clean_latex(str(row["D"])),
                "E": clean_latex(str(row["E"])),
                "Gambar": str(row["Gambar"]).strip(),
            }
            questions.append(item)

        # Structure CBT-KIBI v1.1
        cbt_data = {
            "kode_ujian": kode_ujian.upper(),  # Kunci pengarah sistem
            "token": token_exam,
            "timer_menit": timer_menit,
            "lembaga": nama_lembaga,
            "sub_lembaga": sub_lembaga,
            "logo": logo_url,
            "questions": questions,
        }

        # Tulis/overwrite file JSON khusus per kode
        with open(output_json, "w", encoding="utf-8") as f:
            json.dump(cbt_data, f, ensure_ascii=False, indent=2)

        print(
            f"✅ [CBT-KIBI v1.1] Sukses konversi {len(questions)} soal."
        )
        print(f"📦 Kode Ujian : {kode_ujian.upper()}")
        print(f"📄 File Output: {output_json}")

        # ==========================================
        # AUTO GIT PUSH TO GITHUB PAGES
        # ==========================================
        print("\nMemulai upload otomatis ke GitHub Pages...")

        if base_dir:
            os.chdir(base_dir)

        # 1. Stage semua file (termasuk file JSON berkode baru)
        subprocess.run("git add -A", shell=True)

        # 2. Commit dengan pesan mencantumkan Kode Ujian
        commit_msg = f'Auto-update CBT v1.1: Paket Paket Soal [{kode_ujian.upper()}]'
        subprocess.run(f'git commit -m "{commit_msg}"', shell=True)

        # 3. Push ke GitHub
        print("Mendorong file & perubahan terbaru ke GitHub...")
        push_res = subprocess.run("git push origin main", shell=True)

        json_file_name = os.path.basename(output_json)
        if push_res.returncode == 0:
            print("\n🚀 BERHASIL! Data paket soal otomatis ter-upload ke GitHub Pages.")
            print(
                f"🔗 Direct JSON URL: https://bagusprimohadi.github.io/cbt-kelasbisa/{json_file_name}"
            )
        else:
            print("\n⚠️ Push gagal. Pastikan koneksi internet aktif.")

    except Exception as e:
        print(f"❌ Terjadi kesalahan: {e}")


if __name__ == "__main__":
    convert_excel_to_cbt_json()