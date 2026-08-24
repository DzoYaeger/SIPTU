# Analisis Competitor Mobile 01: Neumorphic Soft UI & Widget System

Dokumen ini berisi analisis visual dan UX mendalam dari referensi **Gambar 1** (Neumorphic & Soft UI Component Kit).

---

## 🎨 1. Skema Warna & Latar Belakang (Color Palette)

- **Background Canvas**: Monokromatik Slate Gray / Ice Blue lembut (`#F1F5F9` / `#E2E8F0`). Tidak menggunakan putih mutlak untuk mengurangi ketegangan mata (*eye strain*).
- **Primary Surface**: Pure White (`#FFFFFF`) dengan efek pencahayaan ganda (highlight atas-kiri `#FFFFFF`, shadow bawah-kanan `#CBD5E1`).
- **Primary Accent**: Slate Navy Gelap (`#1E293B` / `#0F172A`) untuk kartu pahlawan (*hero card*), tombol aksi utama, dan kartu aktif.
- **Secondary Muted Text**: Cool Slate Tint (`#64748b` / `#94a3b8`).

---

## 🔤 2. Tipografi & Hirarki Visual

- **Font Family**: Geometris Sans-Serif modern (*Inter* / *Plus Jakarta Sans* / *Outfit*).
- **Heading**: ExtraBold (`font-weight: 800`), kontras tinggi dengan warna `#0F172A`.
- **Numerik & Stat Counter**: Ukuran besar **`24px` hingga `36px`** tebal murni untuk keterbacaan data instan (*scannability*).
- **Sub-label & Unit**: Ukuran `11px - 12px` All Upper/Capitalize dengan warna muted `#64748b`.

---

## 🧩 3. Komponen UI & Micro-Interactions

### A. Surface Card & Radius
- **Border Radius Standard**: **`16px` hingga `24px`** pada seluruh kartu komponen.
- **Dual Ambient Shadow (Soft Neumorphism)**:
  - Shadow atas-kiri: `inset -2px -2px 6px rgba(255, 255, 255, 0.9)` (Highlight cahaya matahari).
  - Shadow bawah-kanan: `inset 2px 2px 8px rgba(15, 23, 42, 0.08)` (Bayangan lembut).

### B. Widget Visual Terbuka
1. **Hero Mountain Photo Card**: Kartu lanskap dengan gambar alam beresolusi tinggi, dilapisi *dark translucent overlay* (`rgba(15, 23, 42, 0.7)`) dan teks kontras putih.
2. **Circular Progress & Counter Tiles**: Lingkaran persentase (`4`, `7`, `74`) dengan batas stroke tipis dan label stat di bawahnya.
3. **Product & Asset Grid Card**: Tampilan foto produk 3-baris dengan latar belakang lingkaran cembung dan shadow lembut.
4. **Interactive Sliders & Toggles**: Slider pengatur nilai (*range slider*) dan tombol toggle bulat Neumorphic yang memberikan ilusi fisik bisa ditekan.

---

## 💡 4. Penerapan untuk Mobile Flutter SIPTU

- Digunakan untuk **Widget Card Informasi Ringkas** di Dashboard Mobile (misal: Counter Izin Keluar, Counter Peminjaman BMN, dan Jam Digital Kantor).
- Memberikan rasa fisik (*tactile feel*) yang sangat mewah dan berkelas pada perangkat Android/iOS.
