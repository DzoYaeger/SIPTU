# Analisis Kompetitor 01: Emilus Admin Template (Dashboard Sales)

## 📌 Ringkasan Eksekutif
Analisis komprehensif UI/UX dari templat admin **Emilus**. Tampilan ini mengusung pendekatan *Modern Minimalist Dashboard* dengan kombinasi kartu statistik yang bersih, hierarki visual berbasis ruang putih (*white space*), dan warna pastel yang lembut.

---

## 🎨 1. Prinsip Desain (Design Principles)
* **Visual Hierarchy (Hierarki Visual)**:
  * Kartu grafik utama **Weekly Revenue** menjadi pusat perhatian (*Focal Point*) dengan ukuran paling dominan.
  * Angka numerik kunci (`$27,188.00`, `$6,922`, `11,831`) menggunakan ukuran font besar dan tebal (`font-weight: 800`).
* **Contrast & Clarity (Kontras & Kejelasan)**:
  * Latar belakang aplikasi menggunakan warna abu-abu sangat muda (*clean slate gray* `#f8fafc`), sedangkan kartu menggunakan warna putih murni (`#ffffff`). Hal ini memberikan pemisahan layer (*elevation*) tanpa memerlukan bayangan (*shadow*) yang tebal.
* **Alignment (Kerapian & Penjajaran)**:
  * Menggunakan sistem kisi (*grid system*) 12 kolom yang presisi. Margin kiri-kanan kartu rata sempurna secara vertikal dan horizontal.

---

## 📏 2. Jarak Spasi (Spacing & Layout Architecture)
* **Grid Gaps**:
  * Jarak antar kartu (*Card Gap*): **`20px - 24px`**.
  * Padding internal kartu (*Card Inner Padding*): **`20px 24px`**.
* **Sidebar & Topbar Dimensions**:
  * Lebar Sidebar: **`240px`** (memberikan ruang bernapas yang cukup untuk teks dan ikon).
  * Tinggi Topbar: **`64px - 70px`** dengan *sticky positioning*.
* **Border Radius**:
  * Sudut kartu melengkung (*Border Radius*): **`16px`** (menghasilkan kesan modern dan ramah pengguna).
  * Input pencarian dan tombol: **`8px - 20px`** (pill-shaped).

---

## 🧩 3. Pola Desain (Design Patterns)
* **Sidebar Navigation**:
  * Menu utama dikelompokkan berdasarkan kategori dengan huruf kapital kecil (*Category Headers*: `DASHBOARD`, `APPS`, `COMPONENTS`).
  * Status menu aktif (`Sales`): Menggunakan *soft blue background pill* (`#eef2ff`) dengan garis indikator aksen biru tebal di sisi kanan/kiri.
* **Topbar**:
  * *Global Search Bar* di bagian tengah atas berbentuk *pill input* dengan ikon kaca pembesar.
  * *Profile Area* di pojok kanan atas menampilkan foto profil melingkar, nama pengguna (`Charlie Howard`), peran (`Frontend Developer`), serta ikon notifikasi dengan *badge count red dot* `5`.
* **Metric Cards (Kartu Statistik Ringkas)**:
  * Setiap kartu KPI mini memiliki **Container Ikon Berwarna Soft Pastel** di pojok kiri atas (contoh: hijau mint untuk *Total Order*, biru muda untuk *Conversion Rate*, oranye untuk *Total Profit*, merah muda untuk *Daily Visitors*).

---

## 🎨 4. Penggunaan Warna (Color Usage & Palette)
* **Primary Background**: `#f8fafc` (Clean Slate / Off-White).
* **Card Surface**: `#ffffff` (Pure White).
* **Text Main**: `#1e293b` (Dark Slate / Near Black).
* **Text Muted / Subtitle**: `#64748b` (Slate Gray).
* **Accent Brand Color**: `#2563eb` / `#0078d4` (Royal Blue).
* **Semantic Colors**:
  * Success / Growth: `#10b981` (Emerald Green - `↑ 17% growth from last week`).
  * Metric Icon Bgs: `#e6f4ea` (Green), `#e8f0fe` (Blue), `#fef3c7` (Orange), `#fce8e6` (Pink).

---

## 🔤 5. Tipografi (Typography)
* **Font Family**: Sans-serif modern (Inter / Segoe UI / Roboto).
* **Skala Font**:
  * H1 / Big Metric: **`24px - 28px`** (Weight: 800 ExtraBold).
  * Card Titles: **`15px - 16px`** (Weight: 700 Bold).
  * Body / Stat Value: **`14px`** (Weight: 600 SemiBold).
  * Labels & Captions: **`12px - 13px`** (Weight: 400 Regular / 500 Medium, Color: `#64748b`).
  * Section Headers (Sidebar): **`11px`** (Weight: 700 Bold, Uppercase, Tracking: `0.08em`).

---

## 💡 6. Catatan Khusus & UX Nuances Worth Mentioning
1. **Button Download Report**: Menggunakan tombol out-line tipis di dalam kartu header grafik utama, meminimalkan distraksi visual tetapi tetap mudah dijangkau.
2. **Minimalist Divider**: Tidak ada garis tepi (*border stroke*) yang tajam/hitam. Pemisahan antar elemen murni menggunakan warna latar belakang dan ruang putih (*White Space*).
