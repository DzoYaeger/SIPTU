# Analisis Competitor Mobile 03: Futuristic Gamified UI & Dashboard System

Dokumen ini berisi analisis visual dan UX mendalam dari referensi **Gambar 3** (Desain Futuristic Gamified UI dengan Tema Light Lavender / Purple).

---

## 🎨 1. Skema Warna & Estetika (Futuristic Light Violet)

- **Primary Accent**: Soft Violet & Electric Indigo (`#6366F1` / `#8B5CF6` / `#A855F7`).
- **Pastel Container Background**: Soft Lavender (`#F3E8FF` / `#EEF2FF`).
- **Canvas Background**: Clean Ice Slate (`#F8FAFC` / `#FFFFFF`).
- **High-Contrast Text**: Dark Navy (`#172033` / `#0F172A`).

---

## 📐 2. Analisis Layout & Komponen Utama

### A. Layar 1 (Profile & Leveling System)
- **Top App Bar**: Icon Hamburger Menu (kiri), Judul `"MY PROFILE"`, Icon Notification Bell dengan badge dot merah (kanan).
- **Hero Avatar Circle**: Foto karakter anime/cyberpunk dalam lingkaran bergaris gradien ungu halus dengan efek glow ambient.
- **Title & Badge**: Nama karakter `"ZENITH"`, subtitle `"FOCUS • DISCIPLINE • FREEDOM"`, dan pill badge level `"LEVEL 56"`.
- **Metric Cards Row**: 3 angka stat ringkas (*Days 684*, *Habits 32*, *Focus Hrs 3,246*).
- **Active Navigation Menu**: List menu vertikal dengan item aktif `"Dashboard"` menggunakan background pastel ungu dengan indicator pill kanan.
- **Bottom Navigation Bar**: Baris navigasi bawah dengan **Floating Center Action Button** berlogo kristal ungu.

### B. Layar 2 (Hero Motivational Focus Screen)
- **Full Banner Artwork**: Ilustrasi full-height karya seni karakter bersalju dengan quote typography tebal `"THE GRIND LOOKS LONELY BEFORE IT LOOKS LEGENDARY"`.
- **Primary CTA Button**: Tombol pill bergaris ungu dengan ikon panah melingkar `"ENTER FOCUS MODE →"`.
- **Weekly Progress Spline**: Grafik garis tren mingguan dengan titik indikator aktif hari Jumat (`87%`).

### C. Layar 3 (Dashboard Progress & Checklist Schedule)
- **Donut Chart Progress**: Donut chart persentase besar **`78% COMPLETE`** dengan indikator breakdown di samping (*Discipline 78%*, *Habits 65%*, *Mindset 80%*, *Health 72%*).
- **Today's Schedule Checklist**: List tugas harian dengan checkbox interaktif, waktu (mis. *06:00 AM*), dan filter `"View All"`.
- **3D Trophy/Crystal Widget**: Widget pencapaian (*Focus Streak 24 DAYS*) dengan 3D crystal trophy di atas platform.

### D. Layar 4 (Motivation Full Artwork)
- Artwork vertikal dengan stat indikator vertikal di kiri (*Discipline 92*, *Focus 88*, *Consistency 94*) dan quote motivasi di bawah.

### E. Layar 5 (Quotes Feed)
- Category filter pills (*ALL*, *DISCIPLINE*, *SUCCESS*, *MINDSET*, *LIFE*).
- Card quote berlatar belakang ilustrasi pemandangan transparan dengan tombol bookmark.

### F. Layar 6 (Journal & Financial Quick Actions)
- Top Horizontal Date Selector (*MON 13*, *TUE 14*, *WED 15 (Active)*, *THU 16*, *FRI 17*).
- **Credit Card Balance Widget**: Kartu kredit digital modern dengan chip EMV, nomor masked `4582 2456 7896 5412`, nama `ZENITH PRIME`, dan ikon contactless pay.
- **Quick Action Grid**: 5 tombol lingkaran (*Habit*, *Focus*, *Journal*, *Stats*, *Goals*).

### G. Bottom Mission Card
- Stepper Horizontal 4-langkah (*Discipline Foundation* -> *Consistency Builder* -> *Mindset Upgrade* -> *Legacy Creator*) dengan progress bar `68%`.

---

## 💡 3. Penerapan untuk Mobile Flutter SIPTU

- **Bottom Navigation Bar dengan Floating Center Button**: Sangat cocok sebagai navigasi utama aplikasi SIPTU Mobile.
- **Credit Card Balance Widget**: Dipakai untuk **Kartu Digital Karyawan (E-KTP / Kartu Pegawai SIPTU)** dengan QR Code TTE terintegrasi.
- **Checklist Schedule Widget**: Dipakai untuk **Agenda Harian & Tugas Surat Tugas Pegawai**.
- **Stepper Horizontal**: Dipakai untuk **Tracking Status Pengajuan** (Draft -> Diajukan -> Disetujui -> Selesai).
