# Analisis Kompetitor 07: Berry Dashboard (Widget & Chart Analysis View)

## 📌 Ringkasan Eksekutif
Analisis komprehensif UI/UX dari templat **Berry Dashboard** pada modul **Widget / Chart** (`https://berrydashboard.com/widget/chart`). Tampilan ini mendemonstrasikan visualisasi data grafik multi-saluran (*multi-channel sales report*), penggunaan *Mini Sparkline Stat Cards*, serta kartu performa berwarna solid di bagian bawah.

---

## 🎨 1. Prinsip Desain (Design Principles)
* **Multi-Line Spline Chart**:
  * Grafik laporan penjualan bulanan (*Department wise monthly sales report*) menggunakan 3 garis gelombang berlekuk lembut (*Smooth Multi-Spline Lines*) dengan gradien warna transparan: Merah, Biru, dan Ungu.
* **Donut Chart Breakdown**:
  * Grafik donat di sebelah kanan membagi proporsi trafik media sosial (Youtube - Merah, Facebook - Biru, Twitter - Ungu) dengan ringkasan persentase pertumbuhan di bawahnya (`Youtube +16.85%`, `Facebook +45.36%`, `Twitter -50.69%`).
* **Micro Sparkline Widgets**:
  * Baris tengah menyajikan 6 kartu statistik mikro dengan grafik garis mini (*Sparklines*) di bawah nilai angka.

---

## 📏 2. Jarak Spasi (Spacing & Layout Architecture)
* **Grid Architecture**:
  * Baris Atas: **2/3 Lebar (Multi-Line Chart)** + **1/3 Lebar (Social Donut Chart)**.
  * Baris Tengah: **6 Kartu Mini Sejajar (Equal 1/6 Width Grid)**.
  * Baris Bawah: **3 Kartu Banner Performa** (Red Solid, Blue Solid, White Card).
* **Border Radius**:
  * Sudut kartu: **`16px`**.
  * Inner Card Padding: **`20px`**.

---

## 🧩 3. Pola Desain (Design Patterns)
* **Channel Performance Legend**:
  * Di atas grafik multi-line terdapat 3 chip saluran sosial dengan persentase pertumbuhan:
    - Facebook: `+45.36%` (Aksen Ungu)
    - X (Twitter): `-50.69%` (Aksen Cyan Blue)
    - Youtube: `+16.85%` (Aksen Merah)
* **Mini Sparkline Cards (6 Metrics Grid)**:
  1. `Users`: **798** (Sparkline Oranye)
  2. `Timeout`: **486** (Sparkline Ungu)
  3. `Views`: **9,454** (Sparkline Merah)
  4. `Session`: **7.15** (Sparkline Violet)
  5. `Avg. Session`: **04:30** (Sparkline Biru)
  6. `Bounce Rate`: **1.55%** (Sparkline Hijau)

---

## 🎨 4. Penggunaan Warna (Color Usage & Palette)
* **Solid Banner Fill (Baris Bawah)**:
  * Sales Per Day: Solid Red `#d32f2f` (`↘ 3%`).
  * Order Per Month: Solid Blue `#1976d2` (`↗ 28%`).
* **Sparkline Line Colors**: `#f57c00` (Orange), `#7b1fa2` (Purple), `#d32f2f` (Red), `#0288d1` (Blue), `#388e3c` (Green).

---

## 🔤 5. Tipografi (Typography)
* **Stat Values**: `18px - 20px` Bold ExtraBold (`798`, `486`, `9,454`, `7.15`, `04:30`, `1.55%`).
* **Stat Labels**: `12px` Medium Muted (`Users`, `Timeout`, `Views`, `Session`, `Avg. Session`, `Bounce Rate`).
* **Card Titles**: `14px - 15px` SemiBold (`Department wise monthly sales report`, `Page view by device`).
