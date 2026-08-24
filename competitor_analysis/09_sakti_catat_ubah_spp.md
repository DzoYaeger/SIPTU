# Analisis Kompetitor 09: SAKTI Kemenkeu — Catat/Ubah SPP (Form Multi-Section Kompleks)

## 📌 Ringkasan Eksekutif
Analisis antarmuka **SAKTI** pada modul **Catat/Ubah SPP (Surat Perintah Pembayaran)**. Halaman ini merepresentasikan kompleksitas form entri data transaksi keuangan negara yang memiliki 5+ *fieldset section* bertingkat dalam satu layar tunggal.

---

## 🎨 1. Prinsip Desain & Struktur Form (Multi-Section Layout)
* **Form Grid Multi-Kolom**:
  * Menggunakan pembagian grid 2 hingga 3 kolom untuk menghemat ruang vertikal (*Vertical Space Efficiency*).
  * Komponen form dikelompokkan ke dalam kotak *Fieldset / Section Container* bergaris batas halus `#dcdcdc` dengan header label bertipe tab/pill kustom.
* **Struktur Section yang Terlihat pada Gambar**:
  1. **Header Form Utama**: `Jenis SPP`, `No. Resume Tagihan`, `Tanggal Proses`, `No. Tagihan`, `SATKER`, `KPPN`, `Tahun Anggaran`.
  2. **Section "Dasar Pembayaran"** (Kiri Atas): Memuat sub-tabel data aturan/dasar hukum pembayaran.
  3. **Section "Informasi DIPA"** (Kanan Atas): `No. DIPA`, `Tgl DIPA`, `Mata Uang`, `Tipe Kurs`, `Kurs`.
  4. **Section "Informasi SPP"** (Kiri Tengah): `Tanggal Buku`, `Cara Bayar`, `Uraian Pembayaran`.
  5. **Section "Informasi Suplier"** (Kiri Bawah): `Nomor Supplier`, `Nama`.
  6. **Section "Informasi Kontrak"** (Kanan Bawah): `Nomor Kontrak`, `Tgl. Kontrak`, `CAN`.

---

## 🔤 2. Tipografi & Kontras Field Input
* **Label Input**:
  * Font-size: `11.5px - 12px` Bold.
  * Warna teks label: `#212529` / `#333333` (Gelap dan kontras tinggi).
  * Posisi label: Rata kiri bersisian dengan input (*Inline Label Alignment*) atau di atas input untuk menghemat tinggi baris.
* **Field Input & Text Area**:
  * Background input read-only / terisi otomatis: Abu-abu muda `#e9ecef`.
  * Background input aktif: Putih `#ffffff` dengan border `#ced4da`.
  * Border-radius input: `4px` hingga `6px` (semi-rounded compact).
* **Dropdown & Picker Buttons**:
  * Menggunakan ikon kalender biru mini untuk pemicu *Date Picker*.
  * Selector dropdown standar browser/custom UI.

---

## 📐 3. Kepadatan Informasi (Density & Form Usability)
* **High Information Density**:
  * Halaman dirancang untuk operator berkecepatan tinggi (*power users*). Jarak antar baris form sangat rapat (`gap: 8px - 12px`).
  * Field teks seperti `Uraian Pembayaran` menggunakan komponen multi-line `textarea` yang ditempatkan di sisi kanan section *Informasi SPP*.
* **Action Buttons di dalam Sub-Section**:
  * Di dalam section *Dasar Pembayaran*, terdapat tombol aksi khusus sub-section: `● Hapus`, `● Tambah`, `● UU APBN` dengan warna biru cerah.

---

## 💡 4. Kelebihan & Evaluasi UX untuk SIPTU ULTRA
1. **Kejelasan Pembagian Kelompok Data**: Dengan banyaknya bidang data yang harus diisi dalam SPP, pengelompokan visual menggunakan *Section Card / Fieldset Container* mencegah kesalahan pengisian oleh operator.
2. **Kelemahan SAKTI yang Perlu Diperbaiki di SIPTU ULTRA**:
   - Visual SAKTI terasa sangat padat dan kaku (*cluttered*) karena terlalu banyak garis kotak tipis yang saling bertumpuk.
   - **Solusi SIPTU ULTRA**: Gunakan *Canvas Layering* modern (Rule 1) — kartu latar putih murni di atas canvas slate, padding `18px-24px` (Rule 2), serta spasi antar komponen `16px-24px` yang lebih lega tanpa mengurangi fungsionalitas.
