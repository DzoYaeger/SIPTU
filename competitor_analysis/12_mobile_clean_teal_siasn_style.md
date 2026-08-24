# Analisis Competitor Mobile 02: Clean Teal & Wave Layouts (SIASN Style)

Dokumen ini berisi analisis visual dan UX mendalam dari referensi **Gambar 2** (Koleksi 15 Layar UI Mobile Bertema Clean Mint/Teal).

---

## 🎨 1. Skema Warna & Aksesibilitas (Teal / Emerald Palette)

- **Primary Brand Color**: Emerald Teal (`#0D9488` / `#14B8A6`). Memberikan kesan segar, profesional, dan ramah pengguna (*user-friendly*).
- **Light Pastel Tint**: Soft Mint (`#CCFBF1` / `#E6FFFA`) untuk area aktif, badge, dan wave header.
- **Accent Highlight**: Warm Amber / Coral Orange (`#F59E0B` / `#F97316`) khusus untuk tombol aksi utama (*Floating Action Button / Primary CTA*).
- **Background Canvas**: Pure Clean Gray (`#FAFAFA` / `#F8FAFC`).

---

## 📐 2. Analisis 15 Tampilan Layar (5x3 Grid)

1. **Layar 1 (Login & Welcome)**: Header bergelombang (*Curved Wave Header*) dengan foto profil lingkaran, input email/password dengan border halus, dan tombol pill Teal penuh.
2. **Layar 2 (Profile Completion Progress)**: Donut ring persentase **`82% Complete Profile`**, paragraf instruksi ringkas, dan tombol eksekusi.
3. **Layar 3 (Full Teal Line Chart Screen)**: Layar penuh Teal kontras tinggi dengan kurva tren grafik putih (*smooth splined line chart*).
4. **Layar 4 (My Playlist / Daftar Item)**: Hero header banner foto, daftar item berbaris dengan ikon play & judul, tombol pill aksi di bawah.
5. **Layar 5 (Photo Gallery Grid)**: Grid foto 3-kolom dengan tombol aksen oranye **`+`** melayang di tengah.
6. **Layar 6 (Filter & Tag Selection)**: Kumpulan pill tags `#tags`, `#games`, `#music` yang dapat dipilih, dropdown selector, dan input form.
7. **Layar 7 (My Messages / Chat List)**: App Bar Teal dengan 4 tab ikon, tombol Floating Action Button Oranye (`+ New Chat`), list kontak dengan foto profil, pesan terakhir, dan timestamp.
8. **Layar 8 (Chat Conversation)**: Form kirim pesan "To: Anne Bynes", textarea input, tombol `SEND` pill Teal, dan tombol `Cancel`.
9. **Layar 9 (Calendar & Date Picker)**: Header tanggal besar `01 April 2017`, grid kalender bulanan dengan tanggal aktif berlingkaran Teal, dan daftar acara mendatang (`04 April - Marketing Team Meeting`).
10. **Layar 10 (Transactions & Financial Analytics)**: Dual Bar Chart (Pendapatan vs Pengeluaran dalam Teal dan Amber), angka nilai besar `$178k`, dan tombol `Reload Report`.
11. **Layar 11 (Stat & Report Download)**: Line chart halus dengan saldo `$298.98`, 3 stat counter (288, 120, 270), dan tombol `Download Report` dengan ikon oranye.
12. **Layar 12 (Progress Donut & Horizontal Bars)**: Ring donat persentase `28%`, 3 baris progress bar horizontal Teal, dan link `View more`.
13. **Layar 13 (Credit Card / Form Pembayaran)**: Form input Nomor Kartu, Nama Pemegang, Tanggal Kedaluwarsa, CVV, toggle switch `Save Card`, dan tombol `CONFIRM`.
14. **Layar 14 (Left Navigation Drawer / Sidebar)**: Panel samping Teal dengan foto profil, nama `Amanda Burger`, email, serta menu navigasi: *Profile, Settings, Privacy, Messages, Discover, Logout*.
15. **Layar 15 (Pie Chart Analytics)**: Pie chart 3-warna (Teal, Amber, Navy) dengan indikator statistik persentase (`56%`, `12%`, `32%`).

---

## 💡 3. Penerapan untuk Mobile Flutter SIPTU

- **Curved Wave Header**: Dipakai pada layar Login dan Layanan Mandiri Mobile.
- **List Chat & Pesan**: Dipakai untuk fitur **Riwayat Pengajuan** & **Live Status Tracker**.
- **Form Input & Pill Button**: Dipakai untuk form pengajuan IT Helpdesk, Izin Keluar, dan Peminjaman BMN.
- **Left Navigation Drawer**: Dipakai untuk menu profil & pengaturan akun mobile.
