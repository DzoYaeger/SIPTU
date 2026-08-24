# Analisis Kompetitor 08: SAKTI Kemenkeu — Mencatat Perintah Bayar (Tabel & Filter Data)

## 📌 Ringkasan Eksekutif
Analisis antarmuka **SAKTI (Sistem Aplikasi Keuangan Tingkat Instansi)** Kemenkeu pada modul **Pembayaran > RUH Pembayaran > Mencatat Perintah Bayar**. Halaman ini berfokus pada pemrosesan tabel data perintah bayar transaksi keuangan negara dengan filter multi-parameter dan action bar horizontal di bagian bawah.

---

## 🎨 1. Prinsip Desain & Layout (Design & Style)
* **Header & Top Navbar**:
  * **Brand Header Left**: Solid Blue `#0056b3` / `#004085` dengan teks logo *sakti* putih sans-serif.
  * **System Banner Blue Bar**: Menampilkan running info (Hari, Tanggal, Waktu Server, Nama Satker: `BALAI POM DI PALOPO`).
  * **User Profile Pill (Right Header)**: Menampilkan Nama Operator (`DODDY PRAYUDI`), NIP tersamar, serta Peran Satker (`OPERATOR SATKER 672845 2026`).
* **Sidebar Layout (Tree Navigation)**:
  * Menggunakan *Vertical Accordion Tree* berlatar abu-abu terang (`#f8f9fa`).
  * Navigasi aktif di-highlight dengan latar biru muda dan indikator baris biru di sisi kiri.
* **Canvas Layering**:
  * Latar belakang kanvas berwarna abu-abu sangat muda (`#eef2f5`).
  * Area konten dibungkus dalam kartu permukaan putih murni (`#ffffff`) dengan garis tepi (*hairline border*) abu-abu `#dce1e7` tanpa bayangan gelap.

---

## 📐 2. Jarak Spasi & Arsitektur Grid (Spacing & Density)
* **Filter Section ("Cari Perintah Bayar")**:
  * Menggunakan kotak pembatas berlatar abu-abu netral tipis dengan tombol toggle collapsible (*collapse header bar*).
  * Filter multi-kolom terdiri dari 3 pasang label dan input field (`No. Perintah bayar`, `Kode Akun Belanja`, `Uraian`, `Tanggal Perintah Bayar`, `Kode Akun Potongan`, `Nilai`).
* **Table Grid & Row Density**:
  * Kepadatan baris (*Row Density*): Berada pada rentang **`38px - 44px`** (cenderung *compact/dense* untuk efisiensi ruang data keuangan).
  * Padding sel tabel: `8px 12px`.
  * Tidak menggunakan garis batas vertikal (*No Vertical Gridlines*), hanya garis pembatas horizontal tipis (`1px solid #e9ecef`).

---

## 🔤 3. Tipografi (Typography)
* **Font Family**: Standard System Sans-serif (`Arial`, `Helvetica`, `Segoe UI`, `sans-serif`).
* **Judul Section**: `13px - 14px` Bold (`- Cari Perintah Bayar`).
* **Header Tabel (Overline)**: `11px - 12px` SemiBold (`No Perintah Bayar`, `Tgl Perintah Bayar`, `Npwp`, `Nama Penerima Uang`, `Jumlah Akun Belanja`, `Status Validasi`).
* **Isi Baris Tabel**: `11px - 12px` Regular/Medium. Nilai mata uang disajikan rata kanan (*right-aligned*) dengan format pemisah ribuan titik (`19.098.216`).
* **Status Badges**: Teks status validasi (`Belum Disetujui` vs `Disetujui`) ditampilkan secara langsung tanpa tag background berwarna pelangi untuk menjaga kerapian.

---

## 🧩 4. Komponen & Input Control
* **Selection Checkbox**:
  * Checkbox persegi biru di kolom paling kiri untuk memilih banyak transaksi sekaligus (*Multi-row selection*).
* **Pagination Bar**:
  * Terletak di bawah tabel dengan tombol navigasi numerik bertipe pill (`1`, `2`, `3`, `4`, `5`, `»`) dan dropdown *Page Size* (`10 ∨`).
* **Bottom Action Toolbar**:
  * Menggunakan baris tombol aksi ganda di bagian bawah:
    - **Sisi Kiri (Aksi Data)**: `+ Rekam` (Biru), `Simpan`, `Ubah`, `Batal`, `Hapus` (Biru Muda/Cyan).
    - **Sisi Kanan (Aksi Output)**: `Cetak` (Biru Utama), `Keluar` (Biru Tua/Indigo).

---

## 💡 5. Kelebihan & Catatan Rekomendasi UX untuk SIPTU ULTRA
1. **Pemisahan Jelas Aksi Operasional vs Aksi Output**: Penempatan tombol `+ Rekam` / `Simpan` di sebelah kiri dan `Cetak` / `Keluar` di sebelah kanan memberikan kepastian fokus alur kerja bagi operator.
2. **Kerapian Tabel Keuangan**: Penggunaan alignment kanan untuk nilai finansial dan format angka titik sangat mempermudah pemindaian (*scanning*) nominal anggaran.
3. **Poin Peningkatan untuk SIPTU ULTRA**:
   - Skema warna tombol aksi pada SAKTI terlihat seragam (terlalu banyak tombol biru/cyan bersisian). SIPTU ULTRA harus mempertahankan warna semantik yang konsisten (`Primary Blue`, `Success Green`, `Danger Red`, `Warning Amber`).
