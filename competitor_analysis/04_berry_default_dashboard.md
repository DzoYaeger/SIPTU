# Analisis Kompetitor 04: Berry Dashboard (Default Overview)

## 📌 Ringkasan Eksekutif
Analisis komprehensif UI/UX dari templat **Berry Dashboard** (Material-UI / React Admin Template). Tampilan ini sangat menonjol dengan penggunaan **Kartu Gradien Warna-Warni Berukuran Besar (*Rich Color Gradient Hero Cards*)**, *wave pattern graphics*, serta gaya visual yang ramah (*friendly & vibrant*).

---

## 🎨 1. Prinsip Desain (Design Principles)
* **Vibrant Hero Cards (Kartu Pahlawan Berwarna)**:
  * Menggunakan kartu berlatar belakang gradien ungu pekat (`#5e35b1` -> `#4527a0`) dan biru cerah (`#1e88e5` -> `#1565c0`) di posisi paling atas sebagai penarik perhatian utama (*Primary Anchor*).
* **Pattern Overlay Subtlety**:
  * Di dalam kartu gradien terdapat ilustrasi lingkaran/gelombang transparan (*vector wave pattern overlay*) yang menambah kedalaman visual tanpa mengganggu keterbacaan teks.
* **Asymmetric Grid Balance**:
  * Baris kedua menggunakan pembagian 2 kolom asimetris: **2/3 Lebar (Total Growth Bar Chart)** + **1/3 Lebar (Popular Stocks Sparkline Widget)**.

---

## 📏 2. Jarak Spasi (Spacing & Layout Architecture)
* **Top Metric Row**:
  * 3 Kartu Utama:
    1. Kartu Ungu: `$500.00 Total Earning` (Terdapat ikon panah melingkar `↗` & tombol 3-titik `•••`).
    2. Kartu Biru: `$961 Total Order` (Terdapat toggle filter `Month` vs `Year` di dalam kartu).
    3. Kartu Kanan (Dua Kartu Bertumpuk): `$203k Total Income` (Biru) dan `$203k Total Income` (Kuning muda).
* **Border Radius**:
  * Sudut kartu melengkung halus: **`16px - 20px`**.
* **Padding**:
  * Inner Card Padding: **`24px`**.

---

## 🧩 3. Pola Desain (Design Patterns)
* **In-Card Controls**:
  * Tombol sakelar filter waktu (`Month` | `Year`) diletakkan langsung di dalam kartu `Total Order` bagian kanan atas dengan kontainer transparan.
* **Sparkline List Widgets**:
  * Kartu `Popular Stocks` di sebelah kanan memiliki kartu kecil bagian atas (latar belakang ungu muda `#f3e8ff`) yang berisi grafik garis mini (*Sparkline Spline Area Chart*) untuk `Bajaj Finery $1839.00 (10% Profit)`.
* **Sidebar Branding**:
  * Logo **BERRY** dengan ikon buah berry biru di pojok kiri atas, serta tombol hamburger menu `≡` di samping input pencarian.

---

## 🎨 4. Penggunaan Warna (Color Usage & Palette)
* **Vibrant Gradients**:
  * Deep Purple Gradient: `linear-gradient(135deg, #5e35b1 0%, #4527a0 100%)`.
  * Bright Blue Gradient: `linear-gradient(135deg, #1e88e5 0%, #1565c0 100%)`.
  * Cyan Gradient: `linear-gradient(135deg, #0288d1 0%, #01579b 100%)`.
* **Muted Card Surfaces**: `#ffffff` untuk kartu standar, `#f8fafc` untuk latar belakang utama.
* **Soft Pill Active Menu**: `#f3e8ff` (Soft Purple) untuk menu `Default` yang sedang aktif.

---

## 🔤 5. Tipografi (Typography)
* **Font Family**: Inter / Roboto.
* **Large Metric Text**: **`26px - 30px`** Bold ExtraBold (`$500.00`, `$961`, `$2,324.00`).
* **Sub-labels**: **`13px`** Light/Medium (`Total Earning`, `Total Order`, `Total Growth`).
* **In-Card Button Text**: **`12px`** Bold (`Month`, `Year`).

---

## 💡 6. Catatan Khusus & UX Nuances Worth Mentioning
1. **Dua Kartu Kecil Bertumpuk di Sisi Kanan**: Memanfaatkan ruang vertikal sebelah kanan dengan menumpuk 2 widget statistik mini secara simetris, mencegah kekosongan ruang di layar beresolusi tinggi.
2. **Visual Feedback Warna Penuh**: Penggunaan warna latar belakang kartu yang kontras sangat efektif untuk dashboard eksekutif yang membutuhkan impresi visual kuat sejak detik pertama.
