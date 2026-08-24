# Analisis Kompetitor 10: SAKTI Kemenkeu — Modal Dialog Pendetailan COA

## 📌 Ringkasan Eksekutif
Analisis mendalam mengenai arsitektur, style, tipografi, dan alur interaksi **Modal Dialog ("Pendetailan COA")** pada aplikasi SAKTI Kemenkeu. Modal ini digunakan untuk memunculkan antarmuka alokasi anggaran Chart of Accounts (COA) bertingkat di atas halaman transaksi utama.

---

## 🎭 1. Arsitektur Modal & Overlay (Backdrop & Framing)
* **Modal Overlay / Dimmer Backdrop**:
  * Latar belakang utama aplikasi diredupkan (*dimmed*) menggunakan lapisan semi-transparan abu-abu kehitaman (`rgba(0, 0, 0, 0.45)` s.d. `0.6`).
  * Tidak menggunakan efek *Acrylic Glassmorphism / Backdrop Blur*, hanya redup warna hitam murni murni untuk memfokuskan mata pengguna pada dialog.
* **Modal Container Dimensions & Placement**:
  * Position: Centered secara vertikal dan horizontal (*Center Viewport Alignment*).
  * Width: ~`900px` (Lebar medium-large untuk menampung tabel rincian anggaran 6 kolom).
  * Border Radius: **`8px` hingga `12px`** pada sudut dialog modal.
  * Modal Box Shadow: Soft deep elevation shadow (`box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25)`).

---

## 🧩 2. Anatomi Internal Modal Dialog SAKTI
Modal dialog Pendetailan COA SAKTI dibagi menjadi **3 Area Utama**:

### A. Header Modal (Modal Header)
* **Title**: Text Bold `Pendetailan COA` (`16px`, warna `#172033`).
* **Close / Dismiss Button**: Tombol silang `×` di pojok kanan atas modal (atau tombol `Keluar` merah di footer).

### B. Body Modal (Modal Body - Dual Layout)
Modal body SAKTI dibagi lagi menjadi 2 kontainer kartu internal:

1. **Upper Card: Sub-Tabel Rincian COA Exiting**
   - Header Baris: Teks Informasi Kode COA Lengkap (`Kode COA : 672845.058.521211.06301DR...`).
   - Tabel 5 Kolom: `Rincian Output`, `Komponen`, `Sub Komponen`, `Item`, `Nilai`.
   - Menampilkan data baris aktif: `001 - Sekolah yang melaksanakan pembudayaan kear... | 052 - Intervensi keamanan PJAS | 0A - SOSIALISASI KEAMANAN PANGAN... | 20.000`.
   - Inline Controls: Tombol `Refresh` (Biru), Teks `Jumlah : 20.000`, serta Pagination Control mini (`◄ 1 ►`, `10 ∨`).

2. **Lower Card: Form Detail COA & Input Anggaran**
   - Sub-header Tag: `Detail COA`.
   - Grid Form Field:
     - `Kode COA` + Tombol Pencarian Magnifier (`🔍 ..`).
     - `Kode Rincian Output`
     - `Kode Komponen`
     - `Kode Sub Komponen`
     - `Kode Item`
     - `Nilai` (Input angka nominal) vs `Sisa Pagu`.
     - `Nilai KURS` vs `IDR`.

### C. Footer Modal (Modal Footer / Action Bars)
SAKTI menggunakan **Dua Kelompok Tombol Aksi di Modal Footer**:
* **Kelompok Kiri (Manipulasi Item Baris)**:
  - `● Tambah` (Biru Tua)
  - `● Ubah` (Biru Muda)
  - `● Hapus` (Biru Muda)
* **Kelompok Kanan (Eksekusi Modal)**:
  - `Simpan` (Biru Utama)
  - `Batal` (Biru Muda)
  - `Keluar` (Merah/Danger `#dc3545`)

---

## 🔤 3. Tipografi & Gaya Tombol di Modal Dialog
* **Judul Section Modal**: `13px - 14px` Bold dengan pembatas garis tipis di bawah judul.
* **Teks Nilai Finansial**: Angka nominal ditekankan dengan ketebalan **Bold / ExtraBold** (`20.000`, `Sisa Pagu: 0`).
* **Penyelarasan Warna Tombol**:
  * Tombol Aksi Utama (`Simpan`): Solid Royal Blue.
  * Tombol Batal/Ubah: Solid Soft Cyan/Sky Blue.
  * Tombol Penutup/Keluar (`Keluar`): Solid Red untuk memberikan kejelasan langsung jika pengguna ingin membatalkan modal tanpa menyimpan.

---

## 💡 4. Evaluasi & Panduan Implementasi Modal untuk SIPTU ULTRA
1. **Pelajaran dari Modal SAKTI**:
   - Menyatukan **Data Table View (Upper)** dan **Data Entry Form (Lower)** di dalam satu Modal Dialog terbukti efisien untuk transaksi bertingkat tanpa perlu berpindah-pindah halaman (*No Context Switch*).
2. **Kelemahan Modal SAKTI**:
   - Penggunaan background form yang terlalu abu-abu gelap membuat input tampak kurang bersih.
   - Tombol aksi terlalu ramai (ada 6 tombol sekaligus di bagian bawah modal).
3. **Standar Modal SIPTU ULTRA (Sesuai `AGENTS.md`)**:
   - Surface Modal: Pure White `#ffffff` dengan border radius **`16px`** dan subtle shadow `0 10px 30px -5px rgba(15, 23, 42, 0.1)`.
   - Header Modal: `16px` Bold `#172033`.
   - Footer Modal: Batasi tombol utama menjadi 2-3 tombol kunci (`Batal` / `Simpan`), tombol tambahan berupa icon/dropdown.
