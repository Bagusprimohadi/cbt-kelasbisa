# -*- coding: utf-8 -*-
"""
Created on Wed Aug  5 12:29:02 2026

@author: USER
"""

import pandas as pd
from docxtpl import DocxTemplate
import os

# ==========================================
# 1. KONFIGURASI URL & DIREKTORI
# ==========================================
# Ambil ID dari URL Google Sheets kamu
SHEET_ID = "1nW3XmhVnEgKiYItPx-4tcTeVaHTpa1NI7H1k5NVBOS0"
# Konversi otomatis URL menjadi link download CSV
CSV_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv"

# Direktori Template dan Output
TEMPLATE_PATH = r"D:\03-CBT\FORMAT LJO50.docx"
OUTPUT_DIR = r"D:\03-CBT\00-TryOut Pra OSN Semifinal Kebumian"

# Buat folder output jika belum ada
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ==========================================
# 2. MENGAMBIL DATA DARI GOOGLE SHEETS
# ==========================================
print("Mengunduh data jawaban dari Google Sheets...")
try:
    # Baca data langsung dari internet
    df = pd.read_csv(CSV_URL)
    
    # Ubah nama kolom agar string/bersih dari spasi tak terlihat
    df.columns = [str(col).strip() for col in df.columns]
    
    # Ubah nilai NaN (kosong) menjadi string kosong ("") agar tidak muncul tulisan "nan" di Word
    df.fillna("", inplace=True)
    print(f"Berhasil mengunduh data! Total peserta: {len(df)}")
except Exception as e:
    print(f"Gagal mengambil data dari Google Sheets. Pastikan spreadsheet di-set 'Anyone with the link' / 'Siapa saja yang memiliki link'.\nError: {e}")
    exit()

# ==========================================
# 3. PROSES RENDER TEMPLATE WORD
# ==========================================
print("\nMemulai proses generate Lembar Jawaban individu...\n")

for index, row in df.iterrows():
    # Load template baru untuk tiap peserta
    doc = DocxTemplate(TEMPLATE_PATH)
    
    # Ambil identitas (Disesuaikan dengan Header Otomatis dari Apps Script)
    nama_peserta = str(row.get("Nama", f"Peserta_{index+1}")).strip()
    asal_sekolah = str(row.get("Asal Instansi", row.get("Sekolah", ""))).strip()
    kelas_peserta = str(row.get("Kelas", "")).strip()
    no_id = str(row.get("No.ID", row.get("NISN", ""))).strip()
    asal_daerah = str(row.get("Asal Daerah", row.get("Daerah", ""))).strip()
    
    # Susun dictionary untuk mapping ke tag {{ }} di Word
    context = {
        "Nama": nama_peserta,
        "Sekolah": asal_sekolah,
        "Kelas": kelas_peserta,
        "NISN": no_id,
        "Daerah": asal_daerah
    }
    
    # Ambil jawaban untuk soal 1 sampai 50
    # Data dari Sheets kolomnya bernama "1", "2", "3", dst.
    # Di tag template Word pakai {{ a1 }}, {{ a2 }}, {{ a3 }}, dst.
    for i in range(1, 51):
        col_name = str(i) # Nama kolom di pandas (dari Google Sheets)
        jawaban = str(row.get(col_name, "")).strip()
        
        # Jika nilai berupa float 'nan' / kosong, jadikan string kosong
        if jawaban.lower() == "nan":
            jawaban = ""
            
        context[f"a{i}"] = jawaban # Set nilai ke tag {{ a1 }}, {{ a2 }}, dst.
        
    # Render template Word dengan data context
    doc.render(context)
    
    # Bersihkan nama file dari karakter yang dilarang Windows (\ / : * ? " < > |)
    safe_name = nama_peserta.replace("/", "_").replace("\\", "_").replace(":", "").replace("*", "").replace("?", "").replace('"', "").replace("<", "").replace(">", "").replace("|", "")
    safe_sekolah = asal_sekolah.replace("/", "_").replace("\\", "_").replace(":", "").replace("*", "").replace("?", "").replace('"', "").replace("<", "").replace(">", "").replace("|", "")
    
    # Format Penamaan File (Contoh: "Bagus_SMA 1 Makassar.docx")
    filename = f"{safe_name}_{safe_sekolah}.docx"
    output_path = os.path.join(OUTPUT_DIR, filename)
    
    # Simpan file individu
    doc.save(output_path)
    print(f"[SUCCESS] Tersimpan: {filename}")

print("\n🎉 Proses Selesai! Seluruh LJO berhasil di-generate di folder output.")