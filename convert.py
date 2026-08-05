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
    # ==========================================
    # KONFIGURASI TERBARU (EDIT DI SINI)
    # ==========================================
    excel_file = r"D:\03-CBT\Soal.xlsx"
    output_json = r"D:\03-CBT\Soal.json"
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

        cbt_data = {
            "token": token_exam,
            "timer_menit": timer_menit,
            "lembaga": nama_lembaga,
            "sub_lembaga": sub_lembaga,
            "logo": logo_url,
            "questions": questions,
        }

        # Tulis ulang file Soal.json dengan encoding UTF-8
        with open(output_json, "w", encoding="utf-8") as f:
            json.dump(cbt_data, f, ensure_ascii=False, indent=2)

        print(
            f"✅ Sukses overwrite {len(questions)} soal & header terbaru ke '{output_json}'"
        )

        # ==========================================
        # AUTO GIT PUSH TO GITHUB PAGES (DIPERBAIKI)
        # ==========================================
        print("\nMemulai upload otomatis ke GitHub Pages...")

        project_dir = os.path.dirname(output_json)
        if project_dir:
            os.chdir(project_dir)

        # 1. Stage semua file
        subprocess.run("git add -A", shell=True)

        # 2. Commit (tanpa check=True agar jika tidak ada perubahan baru, script TETAP LANJUT ke push)
        subprocess.run(
            'git commit -m "Auto-update CBT: header & soal terbaru"',
            shell=True,
        )

        # 3. PAKSA PUSH KE GITHUB (Pasti dieksekusi)
        print("Mendorong file & perubahan terbaru ke GitHub...")
        push_res = subprocess.run("git push origin main", shell=True)

        if push_res.returncode == 0:
            print("\n🚀 BERHASIL! Data terbaru otomatis ter-push ke GitHub Pages.")
            print(
                "Cek direct JSON server: https://bagusprimohadi.github.io/cbt-kelasbisa/Soal.json"
            )
        else:
            print("\n⚠️ Push gagal. Pastikan koneksi internet aktif.")

    except Exception as e:
        print(f"❌ Terjadi kesalahan: {e}")


if __name__ == "__main__":
    convert_excel_to_cbt_json()