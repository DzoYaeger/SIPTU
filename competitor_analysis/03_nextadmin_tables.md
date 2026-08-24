# Analisis Kompetitor 03: NextAdmin Tables Page (Top Channels Data Table)

## 📌 Ringkasan Eksekutif
Analisis komprehensif UI/UX dari tampilan **NextAdmin Tables Page**. Tampilan ini mendemonstrasikan penyajian data tabel korporat yang sangat bersih (*ultra-clean data table*), menggunakan logotype merek lingkaran (*brand avatars*), serta penataan kolom dengan keterbacaan tingkat tinggi.

---

## 🎨 1. Prinsip Desain (Design Principles)
* **Clean Data Density (Kepadatan Data Bersih)**:
  * Baris tabel tidak terlalu padat (*spacious row height* ~`56px - 64px`), memberikan kenyamanan mata saat membaca data angka dalam jumlah banyak.
* **Brand Recognition (Pengenalan Merek Visual)**:
  * Menggunakan logo brand melingkar berukuran presisi di sebelah nama channel (`Google`, `X.com`, `Github`, `Vimeo`, `Facebook`), sehingga pengguna dapat mengidentifikasi baris tanpa harus membaca teks penuh.
* **Semantic Accent (Penaikan Warna Semantik)**:
  * Kolom `REVENUES` ditonjolkan dengan warna hijau zamrud (`#059669` / `$4,220.00`), sedangkan kolom numerik biasa menggunakan warna netral abu-abu tua (`#1e293b`).

---

## 📏 2. Jarak Spasi (Spacing & Layout Architecture)
* **Table Padding**:
  * Inner Cell Padding: **`16px 24px`**.
  * Horizontal Row Spacing: Dividers hairline tipis (`#f1f5f9`).
* **Sidebar Active Sub-item**:
  * Menu `Tables` terbuka (*Expanded*), dengan item aktif `Tables` disorot menggunakan *light purple container* (`#f0f4ff`), sedangkan item `Pro Tables` dan `Data Tables` ditandai dengan badge `Pro`.
* **Action Trigger**:
  * Titik tiga opsi (`•••`) di pojok kanan atas kartu tabel untuk menu ekspor atau filter tambahan.

---

## 🧩 3. Pola Desain (Design Patterns)
* **Table Header Formatting**:
  * Seluruh nama kolom header (`SOURCE`, `VISITORS`, `REVENUES`, `SALES`, `CONVERSION`) ditulis dengan **Huruf Kapital (Uppercase)**, ukuran font kecil `11px`, warna abu-abu sedang `#64748b`, dan penjarangan huruf (*letter spacing* `0.06em`).
* **Sidebar Support Section**:
  * Di bagian bawah sidebar terdapat grup `SUPPORT` yang berisi menu `Messages` (dengan badge notifikasi `9` dan `Pro`) serta `Inbox`.

---

## 🎨 4. Penggunaan Warna (Color Usage & Palette)
* **Table Header Fill**: Transparan atau `#ffffff` dengan pembatas bawah tipis.
* **Row Hover Background**: Transisi halus ke `#f8fafc` saat kursor diarahkan ke atas baris.
* **Brand Circle Backgrounds**:
  * Google: Putih dengan logo resmi G.
  * X.com: Hitam pekat `#000000`.
  * Github: Hitam pekat `#0f172a`.
  * Vimeo: Biru terang `#0284c7`.
  * Facebook: Biru royal `#1d4ed8`.
* **Revenues Highlight**: Hijau teal/emerald `#059669` untuk nilai nominal keuangan.

---

## 🔤 5. Tipografi (Typography)
* **Header Columns**: `11px` Bold Uppercase (`#64748b`).
* **Brand Names**: `13.5px` Medium SemiBold (`#0f172a`).
* **Visitor & Sales Values**: `13px` Regular/Medium (`#334155`).
* **Revenues Nominal**: `13.5px` SemiBold (`#059669`).
* **Conversion Rates**: `13px` Regular (`#334155`).

---

## 💡 6. Catatan Khusus & UX Nuances Worth Mentioning
1. **Rapi Tanpa Border Vertikal**: Tidak ada garis pembatas vertikal antar kolom. Pemisahan kolom sepenuhnya mengandalkan perataan teks (*Text Alignment*) dan jarak horizontal (*Column Spacing*).
2. **Kesesuaian Tampilan Browser**: Terlihat navigasi tab browser Edge/Chrome di bagian atas, menunjukkan responsivitas sistem pada resolusi desktop standar `1366x768` atau `1920x1080`.
