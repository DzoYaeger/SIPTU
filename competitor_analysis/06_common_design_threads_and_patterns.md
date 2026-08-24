# Analisis Sintesis: Pola Desain, Prinsip & Element Umum Antar Kompetitor
*(Common Threads, Design Patterns & Universal UX Principles across Emilus, NextAdmin, & Berry)*

## 📌 Ringkasan Sintesis
Dokumen ini merupakan rangkuman sintesis komprehensif yang mengestraksi **benang merah (*common threads*)**, **pola desain UI/UX terulang (*recurring design patterns*)**, dan **prinsip visual umum** yang ditemukan pada seluruh 5 sampel dashboard kompetitor kelas dunia (*Emilus*, *NextAdmin*, dan *Berry*).

---

## 🏛️ 1. Tata Layar & Arsitektur Lapisan (Canvas & Layering System)

### A. Pengapungan Lapisan (*Surface Elevation*)
1. **Latar Belakang Netral (*Off-White Canvas*)**:
   - Seluruh kompetitor menggunakan warna canvas latar belakang ber-tone *slate gray* sangat muda (`#f8fafc` atau `#f1f5f9`).
2. **Kartu Putih Murni (*Pure White Cards*)**:
   - Seluruh kontainer data/grafik menggunakan warna permukaan putih murni (`#ffffff`).
3. **Pemisahan Lembut Tanpa Bayangan Pekat**:
   - Pemisahan antar kartu **tidak menggunakan bayangan gelap (*harsh drop shadow*)**.
   - Kompetitor mengandalkan bayangan ambient sangat halus (`0 1px 3px rgba(0,0,0,0.03)` hingga `0 8px 24px -12px rgba(15,23,42,0.05)`) atau *hairline stroke border* 1px (`#e2e8f0` / `#f1f5f9`).

---

## 📏 2. Sistem Spasi, Grid & Sudut Lengkung (Spacing & Radius Rhythm)

### A. Metrik Spasi Universal
* **Jarak Antar Kartu (*Grid Gap*)**: Konsisten pada kisaran **`16px` hingga `24px`**.
* **Padding Internal Kartu**: Konsisten pada kisaran **`18px` hingga `24px`**.
* **Tinggi Baris Tabel (*Table Row Height*)**: Legas antara **`52px` hingga `64px`** (mencegah rasa sesak saat membaca data padat).
* **Lebar Sidebar Navigasi**:
  * Lebar Terbuka (*Expanded*): **`220px` hingga `240px`**.
  * Lebar Terlipat (*Collapsed*): **`54px` hingga `64px`**.
* **Tinggi Header Topbar**: **`64px` hingga `70px`**.

### B. Sudut Lengkung (*Border Radius*)
* **Kartu Utama / Container**: Sangat membulat (*Highly Rounded*) pada kisaran **`16px` hingga `20px`**.
* **Input Pencarian & Button**: Menggunakan *Pill Shape* (**`100px`**) atau radius sedang **`8px` – `12px`**.
* **Avatar & Ikon Merek**: Lingkaran sempurna (**`50%`** / `border-radius: 50%`) atau *squircle* (**`10px` – `14px`**).

---

## 📊 3. Pola Kartu Ringkasan KPI (Top Metric Strip Patterns)

Seluruh kompetitor menempatkan **Baris Kartu KPI Utama (*Top Metric Strip*)** di posisi paling atas layar dengan pola desain berikut:

1. **Kotak Ikon Berwarna Aksen (*Icon Tile Container*)**:
   - Setiap kartu memiliki kontainer ikon di pojok kiri atas (berbentuk lingkaran atau kotak membulat).
   - Menggunakan warna pastel soft atau warna neon kontras (*Green, Orange, Purple, Cyan, Blue*).
2. **Badge Persentase Pertumbuhan (*Growth Rate Indicator*)**:
   - Posisi di samping/bawah nilai utama.
   - **Positif / Naik**: Teks hijau + Ikon Panah Atas (`+4.35% ↑`).
   - **Negatif / Turun**: Teks merah + Ikon Panah Bawah (`-0.95% ↓`).
3. **Format Angka Ringkas (Abbreviated Metrics)**:
   - Angka ribuan/jutaan disingkat secara profesional (`3.5K`, `$4.2K`, `$203k`) untuk menjaga keterbacaan instan.

---

## 🔤 4. Hirarki Tipografi Standar (Typography Hierarchy)

Seluruh kompetitor mengadopsi keluarga font *Sans-Serif Modern* (`Inter`, `Plus Jakarta Sans`, `Roboto`, `Segoe UI`) dengan hirarki berikut:

| Elemen UI | Ukuran Font | Ketebalan (*Weight*) | Warna Standard | Keterangan Gaya |
|---|---|---|---|---|
| **Nilai Utama KPI** | `22px` – `28px` | `800` (ExtraBold) | `#0f172a` / `#1e293b` | Sangat menonjol, pemisah desimal rapi |
| **Judul Kartu / Modul** | `14px` – `16px` | `700` (Bold) | `#0f172a` / `#172033` | Clear section head |
| **Header Tabel** | `10px` – `11px` | `700` (Bold) | `#64748b` / `#94a3b8` | **ALL UPPERCASE**, `letter-spacing: 0.05em - 0.08em` |
| **Teks Body & Cell** | `12px` – `13.5px` | `400` / `500` | `#1e293b` / `#334155` | Legel & kontras cukup |
| **Sub-label & Caption** | `11px` – `12px` | `400` / `500` | `#64748b` / `#94a3b8` | Warna diredam (*muted*) |

---

## 🎨 5. Skema Warna & Harmoni Visual (Color Systems)

1. **Netral Struktural**:
   - `#ffffff` (Card Fill), `#f8fafc` / `#f1f5f9` (Canvas), `#e2e8f0` (Border Hairline).
2. **Warna Merek Utama (*Brand Accent*)**:
   - Didominasi oleh warna **Royal Blue** (`#0078d4` / `#2563eb`) atau **Indigo/Purple** (`#4f46e5` / `#5e35b1`).
3. **Pemberian Warna Semantik**:
   - **Hijau (`#10b981` / `#059669`)**: Pendapatan (*Revenue*), Keuntungan (*Profit*), Pertumbuhan Positif.
   - **Merah (`#ef4444` / `#f43f5e`)**: Penurunan (*Drop*), Pelanggaran, Notifikasi Bahaya.
   - **Oranye/Kuning (`#f59e0b` / `#f97316`)**: Peringatan (*Warning*), Target Pending, Stok Popular.

---

## 📈 6. Pola Visualisasi Data & Interaksi Grafik (Chart Conventions)

1. **Grafik Gelombang Area Gradien (*Gradient Wave Area Chart*)**:
   - Area di bawah garis grafik menggunakan warna gradien transparan (*Dual-tone fade to transparent*), membuat grafik terlihat modern dan tidak kaku.
2. **In-Card Period Controls**:
   - Setiap kartu grafik menyertakan kontrol periode langsung di pojok kanan atas header kartu (dropdown `Monthly ∨`, `This Week ∨`, `Today ∨` atau toggle pill `Month` | `Year`).
3. **Tabel Data Tanpa Border Vertikal**:
   - Tabel mengabaikan garis pembatas vertikal antar kolom. Kejelasan antar kolom sepenuhnya mengandalkan perataan teks (*Text Alignment*) dan *Whitespace*. Kolom nominal keuangan selalu disorot dengan warna hijau semantik.

---

## 🧭 7. Pola Navigasi & Komponen Samping (Navigation Patterns)

1. **Highlight Menu Aktif Berbentuk Pill (*Soft Pill Active Container*)**:
   - Menu yang sedang dipilih menggunakan *background pill* berwarna soft pastel (`#eef2ff` atau `#f3e8ff`) dipadukan dengan garis atau warna teks aksen pekat.
2. **Label Seksi Navigasi (*Category Header Labels*)**:
   - Menu dikelompokkan dengan header kecil berhuruf kapital (`DASHBOARD`, `MAIN MENU`, `APPS`, `SUPPORT`).
3. **Pencarian Utama Berbentuk Pill (*Pill Search Input*)**:
   - Form pencarian global selalu ditempatkan di topbar dengan sudut sangat melingkar (*pill-shaped*) dan ikon kaca pembesar di sisi kiri.
