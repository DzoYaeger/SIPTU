# Analisis Kompetitor 05: Berry Dashboard (CRM & Sales Performance View)

## 📌 Ringkasan Eksekutif
Analisis komprehensif UI/UX dari templat **Berry Dashboard** pada modul **CRM**. Tampilan ini menonjolkan kombinasi antara *Donut Chart (Pie Chart)*, *Stacked Bar Chart*, serta *Summary Metrics Card Strip* di bagian atas.

---

## 🎨 1. Prinsip Desain (Design Principles)
* **Top Metric Strip (Baris Kartu Ringkas)**:
  * Menggunakan 4 kartu horizontal berlatar warna beda (*Multi-tinted metric cards*):
    1. Kartu 1: Biru gradien (`$203k Total Income`)
    2. Kartu 2: Merah muda pastel (`$120k Meeting attends` + ikon kamera video)
    3. Kartu 3: Kuning pastel (`$234k Sales improve` + ikon toko)
    4. Kartu 4: Kuning/Kream pastel (`$234k New users` + ikon tambah pengguna)
* **Balanced Dual-Chart Layout**:
  * Layout bagian bawah membagi layar menjadi 2 area:
    - **Sisi Kiri (1/3 Lebar)**: Kartu `Lead Source` berisi grafik Donut multi-warna + Legenda dengan jumlah badge kuantitas (`9`, `100+`, `100+`).
    - **Sisi Kanan (2/3 Lebar)**: Kartu `Sales Performance` berisi 3 kotak angka KPI di dalam header (`200 Conversion Rate`, `120 Average Deal`, `234 Sales Target`) + Stacked Bar Chart ungu-biru.

---

## 📏 2. Jarak Spasi (Spacing & Layout Architecture)
* **Grid Spacing**:
  * Top Strip Gap: **`16px`**.
  * Main Section Gap: **`16px - 20px`**.
* **Card Inner Structure**:
  * Jarak antar item legenda pada Donut Chart: **`12px`**.
  * Padding internal kartu: **`20px`**.
* **Border Radius**:
  * Sudut kartu: **`16px`**.
  * Sudut kotak KPI mini: **`10px`**.

---

## 🧩 3. Pola Desain (Design Patterns)
* **Donut Chart + Badge Legend**:
  * Legenda di bawah grafik donut tidak hanya menampilkan warna dan nama channel (`Social Media`, `Website`, `Phone Call`), tetapi juga menyertakan **Badge Jumlah di Sisi Kanan** (`9`, `100+`, `100+`).
* **KPI Header Inside Chart Card**:
  * Menyisipkan 3 kartu mini di dalam header grafik utama `Sales Performance` untuk memberikan ringkasan angka instan sebelum pengguna membaca detail grafik batang.
* **Dropdown Filter inside Card Header**:
  * Tombol filter `Today ∨` diletakkan di dalam header kartu `Lead Source`.

---

## 🎨 4. Penggunaan Warna (Color Usage & Palette)
* **Pastel Tint Backgrounds for Metrics**:
  * Soft Red: `#fef2f2` / `#ffe4e6`
  * Soft Yellow: `#fffbeb` / `#fef08a`
  * Soft Orange: `#fff7ed`
* **Chart Color Palette**:
  * Purple: `#5e35b1` (Vibrant Indigo Purple).
  * Dark Purple: `#4527a0`.
  * Blue: `#1e88e5` (Vibrant Royal Blue).
  * Light Purple/Lavender: `#ede7f6` (untuk stacked bar background).

---

## 🔤 5. Tipografi (Typography)
* **Metric Numbers (Top Strip & Inside Card)**: **`20px`** ExtraBold (`$203k`, `$120k`, `$234k`, `200`, `120`, `234`).
* **Card Titles**: **`16px`** Bold (`Lead Source`, `Sales Performance`).
* **Metric Labels**: **`12px`** Medium Gray (`Meeting attends`, `Sales improve`, `New users`, `Conversion Rate`).
* **Legend Badge Text**: **`11px`** Bold (`9`, `100+`).

---

## 💡 6. Catatan Khusus & UX Nuances Worth Mentioning
1. **Pengelompokan Informasi Bertingkat**: Pengguna dapat membaca ringkasan angka di tingkat teratas (*Top Metric Strip*), kemudian membaca statistik intermediate (*Mini KPI Boxes*), dan akhirnya menganalisis detail tren melalui grafik (*Stacked Bar Chart*).
2. **Keterbacaan Legenda**: Penggunaan lingkaran warna di samping teks legenda sangat membantu diferensiasi segmen grafik pie/donut secara cepat.
