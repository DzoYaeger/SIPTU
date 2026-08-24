# Executive Summary: Panduan Desain Terbaik (UI/UX Best Practices & Standards)
*(Hasil Rangkuman & Sintesis dari Seluruh Analisis Kompetitor: Emilus, NextAdmin, Berry, & SAKTI Kemenkeu)*

---

## 📌 Ringkasan Eksekutif
Dokumen ini merangkum **standar dan panduan desain UI/UX terbaik** yang disintesis dari 10 berkas analisis komparatif antarmuka aplikasi (*Emilus*, *NextAdmin*, *Berry Dashboard*, dan *SAKTI Kemenkeu*). Panduan ini disusun khusus sebagai **acuan baku pengembang** dalam membangun antarmuka web modern yang estetis, ergonomis, dan fungsional di aplikasi **SIPTU ULTRA**.

---

## 🔤 1. Tipografi (Typography System)

### A. Keluarga Font (Font Family)
* **Pilihan Font Utama**: Gunakan Font Family modern sans-serif seperti `"Segoe UI"`, `Inter`, `Plus Jakarta Sans`, atau `Roboto`.
* **Ketentuan Penggunaan**:
  - `Plus Jakarta Sans` / `Segoe UI`: Ideal untuk **Judul H1-H3, Modal Title, & Header Kartu** (kesan profesional & elegan).
  - `Inter` / `Roboto`: Ideal untuk **Teks Body, Input Field, & Angka Tabel** (keterbacaan tinggi pada ukuran kecil).

### B. Skala & Ketebalan Tipografi (Hierarchy & Weights)
| Elemen UI | Ukuran Font | Ketebalan (*Weight*) | Gaya / Transformasi | Contoh Penggunaan |
|---|---|---|---|---|
| **Judul Halaman (H1)** | `22px` - `26px` | `700` (Bold) | Normal / `-0.02em` spacing | Title Modul Utama |
| **Judul Seksi / Modal (H2-H3)** | `15px` - `18px` | `600` - `700` | Normal | Header Kartu, Modal Title |
| **Angka Utama KPI** | `22px` - `28px` | `800` (ExtraBold) | Tight line-height | Total Anggaran, Jumlah Pegawai |
| **Header Tabel (Overline)** | `10px` - `11px` | `700` (Bold) | **ALL UPPERCASE**, `letter-spacing: 0.06em` | Header Kolom Data |
| **Teks Body Utama** | `13px` - `14px` | `400` / `500` | Normal | Deskripsi, Isi Tabel |
| **Label Form / Input** | `12px` - `13px` | `600` (SemiBold) | Normal | Label Input Form |
| **Metadata / Sub-label** | `11px` - `12px` | `400` (Muted) | Normal | NIP, Tgl Update, Helper text |

---

## 🎨 2. Sistem Warna & Tint (Color System & Harmoni Visual)

### A. Hirarki Layer Warna (Canvas vs Surface)
1. **Latar Belakang Utama (*Canvas Background*)**:
   - Selalu gunakan warna off-white / slate gray hangat: `var(--color-bg-subtle, #f8fafc)` atau `#f1f5f9`.
   - Hindari warna kanvas putih murni agar tidak menyilaukan mata pengguna saat beraktivitas lama.
2. **Permukaan Kartu (*Card Surface*)**:
   - Selalu gunakan warna **Putih Murni (`#ffffff`)** untuk memunculkan kontras ketinggian layer yang tegas.

### B. Warna Semantik (Semantic Colors)
* **Primary Brand Accent**: Royal Blue (`#0F5B99`) atau Indigo (`#4F46E5`).
* **Sukses / Pertumbuhan Positif**: Emerald Green (`#10B981` / `#059669`).
* **Bahaya / Terlewat / Drop**: Rose/Red (`#EF4444` / `#DC2626`).
* **Peringatan / H-60 Process**: Amber/Yellow (`#F59E0B` / `#D97706`).
* **Info / Netral**: Sky Blue (`#3B82F6`) atau Slate Muted (`#64748b`).

### C. Kontainer Warna Pastel (*Pastel Icon Tiles & Status Pills*)
* Gunakan pasangan latar pastel transparan + teks pekat untuk indikator status/ikon:
  - **Status Perlu Diproses**: Latar `#fef2f2`, border `#fecaca`, teks `#dc2626`.
  - **Status Siap**: Latar `#fffbeb`, border `#fde68a`, teks `#d97706`.
  - **Status Aktif/Akan Datang**: Latar `#eff6ff`, border `#bfdbfe`, teks `#2563eb`.

---

## 📐 3. Tata Letak, Spasi & Geometri (Layout & Geometry)

### A. Ritme Spasi (Spacing Rhythm)
* **Jarak Antar Kartu (*Grid Gap*)**: Konsisten antara **`16px` hingga `24px`**.
* **Padding Dalam Kartu (*Internal Card Padding*)**: Konsisten antara **`18px` hingga `24px`**.
* **Tinggi Baris Tabel (*Row Density*)**:
  - Tabel Umum / Dashboard: **`52px` - `64px`** (memberikan ruang bernapas yang nyaman).
  - Tabel Keuangan Padat / Power-User (seperti SAKTI): **`38px` - `44px`**.

### B. Elevasi & Bayangan (Elevation & Shadows)
* **Hindari Bayangan Gelap Kasar**: Jangan gunakan `box-shadow` hitam pekat.
* **Gunakan Subtle Ambient Shadow**:
  - Standard Shadow: `0 2px 10px -2px rgba(15, 23, 42, 0.04)`.
  - Hover Shadow: `0 8px 20px -4px rgba(15, 23, 42, 0.08)` dipadukan dengan *hairline border* (`1px solid #e2e8f0`).

### C. Standard Sudut Lengkung (Border Radius)
* **Main Dashboard Cards / Modals**: **`16px` hingga `20px`**.
* **Form Inputs & Filter Controls**: **`8px` hingga `12px`**.
* **Status Badges & Pill Buttons**: **`100px` (Full Pill)**.
* **Avatar & Stat Icon Tiles**: **`10px` hingga `14px`** atau `50%` Circle.

---

## 📄 4. Tabel Data & Form Kompleks (Tables & Forms)

### A. Aturan Desain Tabel Terbaik
1. **Tanpa Border Vertikal (*No Vertical Gridlines*)**:
   - Jangan gunakan garis batas vertikal antar kolom.
   - Kejelasan antar kolom sepenuhnya mengandalkan perataan teks (*Text Alignment*) dan spasi horizontal netral.
2. **Alignment Angka & Teks**:
   - Kolom teks/nama: Rata Kiri (*Left-Aligned*).
   - Kolom nominal keuangan & angka statistik: Rata Kanan (*Right-Aligned*) disorot dengan warna hijau semantik (`#059669`).
   - Kolom Status & Aksi: Rata Tengah (*Center-Aligned*).

### B. Form Multi-Section & Input Design
* **Pengelompokan Fieldset**: Form yang memiliki lebih dari 6 input harus dikelompokkan ke dalam kartu section bertingkat (*Fieldset Cards*) agar pengguna tidak kewalahan (*Cognitive Overload*).
* **Placeholder vs Label**: Label form wajib selalu terlihat (jangan mengandalkan placeholder sebagai label). Placeholder hanya diisi dengan contoh format input.

---

## 🎭 5. Arsitektur Modal Dialog Terbaik (Modal Design)

1. **Backdrop Layering**:
   - Dimmer overlay semi-transparan (`rgba(15, 23, 42, 0.5)`).
2. **Dual-Layout Modal (Pelajaran dari SAKTI)**:
   - Untuk entri data transaksi bertingkat, Modal Dialog dapat membagi area body menjadi 2 kontainer internal:
     - **Bagian Atas**: Ringkasan/Tabel data aktif (*Preview/Summary View*).
     - **Bagian Bawah**: Form pengisian/edit data (*Data Entry Form*).
3. **Pengelompokan Tombol Aksi Modal (Action Button Hierarchy)**:
   - Pisahkan tombol aksi menjadi dua posisi di footer:
     - **Kiri**: Aksi Sekunder / Manipulasi item baris (`+ Tambah Baris`, `Ubah`).
     - **Kanan**: Aksi Eksekusi Utama (`Simpan` - Primary Blue, `Batal` - Outline Gray, `Keluar` - Red).

---

## 💡 6. Elemen Tambahan yang Memikat (*Visual WOW Factors*)

* **Avatar Pegawai HSL Deterministik**: Menggunakan avatar inisial 2 huruf dengan latar belakang warna HSL otomatis yang unik berdasarkan nama pegawai.
* **Stat Icon Tile Pastel**: Kotak ikon berwarna di samping angka KPI yang memberikan identitas visual instan.
* **Indikator Pertumbuhan (Trend Badge)**: Pencantuman badge persentase naik `+X% ↑` (hijau) atau turun `-X% ↓` (merah) di dekat nilai KPI.
