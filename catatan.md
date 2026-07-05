# Gambaran Umum Aplikasi SIPTUULTRA

Aplikasi SIPTUULTRA adalah sebuah sistem informasi komprehensif yang dirancang untuk mengelola berbagai aspek administrasi umum, termasuk keuangan, kepegawaian, aset, inventaris, dan layanan IT Helpdesk. Aplikasi ini dibangun dengan arsitektur modern menggunakan teknologi web terkemuka.

## Arsitektur Aplikasi

- **Backend:** Dibangun menggunakan **Laravel (PHP)**, menyediakan API RESTful untuk manajemen data dan logika bisnis.
- **Frontend:** Dibangun menggunakan **React.js** dengan framework **Vite** dan komponen UI dari **Ant Design**, menawarkan antarmuka pengguna yang interaktif dan responsif.
- **Database:** (Asumsi) Menggunakan database relasional seperti MySQL atau PostgreSQL, dengan migrasi Laravel untuk manajemen skema.

## Fungsionalitas Utama

### 1. Manajemen Pengguna (Admin)

- **Tujuan:** Mengelola akun pengguna, peran, dan hak akses modul.
- **Alur Kerja:**
  - Pengguna secara otomatis dibuat ketika data pegawai ditambahkan ke sistem (integrasi Backend).
  - Administrator dapat melihat daftar pengguna, mencari berdasarkan nama, email, atau NIP, dan memfilter berdasarkan peran dasar.
  - **Edit Pengguna:** Sebuah modal terpadu memungkinkan administrator untuk:
    - Mengubah detail profil pengguna (Nama, Email, Nomor WhatsApp).
    - Menentukan Peran Dasar (Admin, Operator, Validator).
    - Mengelola hak akses granular untuk setiap modul:
      - Menggunakan antarmuka berbasis tab ("Profil Pengguna" & "Hak Akses Modul").
      - Hak akses disajikan dalam tampilan akordeon hierarkis (Parent Module & Sub Module) dengan `Switch` toggle untuk peran Operator dan Validator.
      - Fitur "Cascading Permissions": Mengaktifkan peran (Operator/Validator) pada modul induk akan secara otomatis mengaktifkan peran yang sama pada semua sub-modul di bawahnya.
      - Data modul diambil secara statis dari backend dan difilter/ditampilkan berdasarkan `slug` sebagai ID fallback.
  - **Hapus Pengguna:** Administrator dapat menghapus akun pengguna.
- **Peningkatan UI/UX Terbaru:**
  - Tombol "Tambah Pengguna" dihilangkan karena pengguna dibuat otomatis dari data pegawai.
  - Tampilan tabel utama diperbarui dengan avatar, badge status, dan tampilan ringkas hak akses modul (dengan tooltip).
  - Filter pencarian terintegrasi dengan filter berdasarkan peran dasar.
  - Modal edit pengguna sekarang lebih terstruktur dengan tab, dan bagian hak akses modul menggunakan tampilan berjenjang (`Collapse`) dengan `Switch` untuk setiap peran.

### 2. Manajemen Data Pegawai

- **Tujuan:** Mengelola data dasar pegawai.
- **Integrasi:** Penambahan/perubahan data pegawai secara otomatis memengaruhi pembuatan/pembaruan akun pengguna.
- **Fitur:** Form data pegawai mendukung pemilihan fungsi/bidang tertentu, yang kemudian ditampilkan dan dapat difilter di tabel.

### 3. Modul Kearsipan (Peminjaman & Manajemen UP/UK)

- **Peminjaman Arsip:** Mengelola proses peminjaman arsip.
- **Manajemen UP/UK:** Mengelola Unit Pengolah (UP) dan Unit Kearsipan (UK) dengan penugasan penanggung jawab dari daftar pegawai.
- **Laporan Peminjaman Arsip:** Generasi laporan dalam format PDF dan Excel dengan berbagai filter.
- **Otomatisasi Akses:** Penugasan UP/UK secara otomatis memperbarui hak akses modul Kearsipan untuk pengguna terkait.

### 4. Manajemen BMN (Barang Milik Negara)

- **Data Aset Tetap & Persediaan:** Pencatatan dan pengelolaan aset milik negara.
- **Peminjaman Aset & Permintaan Persediaan:** Mengelola alur peminjaman dan permintaan barang.
- **Laporan BMN:** Fitur pelaporan yang komprehensif dengan tampilan berbasis tab untuk berbagai jenis laporan (per Barang, per Tanggal, per Pegawai), mendukung ekspor ke PDF dan Excel.

### 5. IT Helpdesk

- **Pelaporan Keluhan:** Sistem untuk pegawai melaporkan keluhan IT.
- **Tindak Lanjut & Rekapan:** IT Staff dapat melakukan tindak lanjut dan melihat rekapan laporan.
- **Tanda Tangan Digital:** Dukungan untuk tanda tangan digital pelapor dan staf IT pada proses tindak lanjut.

### 6. Pengaturan Notifikasi WhatsApp

- **Tujuan:** Mengonfigurasi integrasi notifikasi melalui WhatsApp (Fonnte).
- **Fitur:** Administrator dapat mengatur token, endpoint, dan daftar nomor default untuk pengiriman notifikasi.

### 7. Permintaan Revisi Anggaran

- **Tujuan:** Mengelola proses revisi anggaran.
- **Fitur:** Frontend dengan tabel interaktif dan modal untuk membuat/mengedit tiket revisi, termasuk perhitungan real-time. Backend dengan validasi penyesuaian anggaran.

### 8. Realisasi Anggaran

- **Tujuan:** Memantau realisasi anggaran.
- **Fitur:** Dua mode tampilan ("Berdasarkan MAK" dan "Berdasarkan Tanggal"), modal detail transaksi, dan fitur pencarian/filter.

## Cara Kerja (Overview)

Frontend (React) berkomunikasi dengan Backend (Laravel) melalui API RESTful. Data JSON diambil dan dikirim untuk menampilkan informasi dan memproses aksi pengguna. Pengelolaan sesi dan autentikasi ditangani melalui token (Sanctum).

## Menjalankan Aplikasi (Lokal)

Untuk menjalankan aplikasi secara lokal, pastikan Anda berada di direktori root proyek (`F:\sites\SIPTUULTRA\`) dan lakukan langkah-langkah berikut:

1.  **Untuk Backend (Laravel):**
    - Buka terminal baru.
    - Navigasi ke direktori `backend`: `cd backend`
    - Jalankan server PHP Laravel di background: `php artisan serve`
    - Pastikan dependensi Composer sudah terinstal (`composer install`) dan database sudah dikonfigurasi dan dimigrasi (`php artisan migrate --seed` jika diperlukan).

2.  **Untuk Frontend (React):**
    - Buka terminal baru.
    - Navigasi ke direktori `frontend`: `cd frontend`
    - Instal dependensi Node.js (`npm install` atau `yarn install`).
    - Jalankan server pengembangan React di background: `npm run dev` (atau `npm start` tergantung konfigurasi `package.json`).

Aplikasi frontend kemudian dapat diakses melalui browser Anda (biasanya di `http://localhost:3000`, sesuai konfigurasi Vite).

## Catatan untuk Masa Depan

Ketika menjalankan saya untuk tugas terkait aplikasi ini di kemudian hari, Anda hanya perlu merujuk pada `catatan.md` ini untuk mendapatkan konteks umum tentang cara kerja aplikasi. Saya akan mengacu pada dokumen ini untuk memahami arsitektur dan fungsionalitas, yang memungkinkan saya untuk lebih cepat dan akurat dalam membantu Anda.

## Tindak Lanjut (Peminjaman Arsip)

- Pada halaman `http://localhost:3000/app/kearsipan-peminjaman`, data **Nama Unit Kerja Peminjam** belum muncul. Seharusnya menampilkan **Fungsi/Bidang** pegawai. Kolom dan mapping perlu disesuaikan.
- Pada halaman pengajuan peminjaman arsip, **Nama Unit Kerja** seharusnya menampilkan **Fungsi/Bidang** pegawai. Sesuaikan label kolom dan data yang ditampilkan.
- Saat pengajuan peminjaman, peminjam sudah melakukan TTE, tetapi status/riwayat tanda tangan peminjam **belum tercatat otomatis**. Perlu memastikan data tanda tangan peminjam tersimpan dan muncul di daftar peminjaman.

## Update Terbaru (Peminjaman Aset BMN)

- Halaman publik `http://localhost:3000/peminjaman-aset/new` telah **ditulis ulang total** dengan desain premium dan elegant:
  - **Arsitektur CSS:** Menggunakan prefix class `pal-*` (Public Asset Loan) untuk menghindari konflik CSS.
  - **File utama:** `PublicAssetLoanPage.jsx` dan `PublicAssetLoanPage.css` (di `frontend/src/pages/`).
- **Alur Wizard 4 Langkah:**
  - **Langkah 1 (Data Diri):** Tampilan profil "ID Card" dengan avatar, nama, NIP, dan fungsi/bidang.
  - **Langkah 2 (Jadwal & Lokasi):** Layout 2 kolom — DateRangePicker + grid lokasi interaktif (klik kartu untuk memilih).
  - **Langkah 3 (Pilih Aset):** Grid 3 kolom, kartu aset dengan icon `GoldOutlined`, tag status (Tersedia/Tidak Tersedia), dan search bar.
  - **Langkah 4 (Konfirmasi):** Ringkasan receipt-style dengan data peminjam, periode, lokasi, dan daftar aset terpilih.
- **Form Data Persistence:** Hidden `Form.Item` selalu di-mount di luar blok step conditional agar `Form.useWatch` dan `form.getFieldValue()` tetap bekerja saat berpindah langkah.
- **Action Bar:** Sticky floating bar dengan navigasi Kembali/Lanjut dan label langkah.
- **Signature Modal:** Popup tanda tangan muncul saat klik "Tanda Tangani & Kirim".
- Notifikasi WhatsApp (Fonnte) untuk BMN diperbarui:
  - Template notifikasi kini memuat detail aset lengkap (jika lebih dari 1 aset, semuanya dituliskan).
  - Ditambahkan informasi **Tempat Tujuan Peminjaman**.
- Perbaikan notifikasi saat approval admin:
  - Nomor peminjam kini di-resolve lebih andal melalui beberapa sumber (`borrower_phone`, `borrower_id`, `borrower_nip`) dan dinormalisasi ke format internasional agar notifikasi persetujuan lebih konsisten terkirim.

## Update Terbaru (Overhaul UI/UX & Login)

- **Transisi Layout & Tema Global:**
  - **Navbar Menu:** Menggantikan sidebar vertikal dengan navigasi horizontal modern di bagian atas, memberikan ruang kerja yang lebih luas.
  - **Tema Putih Bersih:** Mengadopsi palet warna putih/abu-abu dingin (`#f8f9fb`) dengan aksen Indigo (`#4F46E5`) untuk tampilan yang lebih profesional dan bersih.
  - **Komponen UI Premium:** Implementasi kartu dengan efek hover halus, glassmorphism pada tabel, dan animasi mikro.
  - **Teknikal:** Penggunaan CSS Custom Properties (Variables) di `index.css` untuk konsistensi desain global.

- **Standardisasi Modul:**
  - Seluruh 13 halaman modul telah distandardisasi menggunakan pola `module-section` dan `module-toolbar`.
  - Judul dan subtitle dibuat lebih ringkas dan to-the-point.
  - Halaman `KearsipanManajemenUpUk.jsx` direstrukturisasi total dengan kartu terpisah untuk setiap unit.

- **Halaman Error 404 (Baru):**
  - Desain tema luar angkasa dengan animasi astronot melayang, partikel bergerak, dan efek teks glitch.

- **Upgrade Halaman Login:**
  - **Desain:** Dirombak total dengan tema "Clean White" yang selaras dengan Admin Panel.
  - **Keamanan:** Menambahkan **Captcha Matematika** (Client-side) dengan soal acak (tambah/kurang/kali) untuk mencegah bot.
  - **Notifikasi Error:** Backend (`UserController.php`) kini membedakan error "NIP tidak terdaftar" dan "Password salah". Frontend menampilkan pesan ini menggunakan komponen Alert animasi yang sangat terlihat.
  - **Perbaikan Bug:** Memperbaiki logika `useAuth.js` dan memastikan token reset password berfungsi dengan baik.

---

## Update Terbaru (Perbaikan & Fitur Publik)

- **Perbaikan Runtime & Deprecation:**
  - Memperbaiki error 500 saat Logout (menambahkan middleware `auth:sanctum`).
  - Memperbaiki sintaks error pada `useAuth.js`.
  - Mengupdate komponen Ant Design yang deprecated (`Card` bordered/bodyStyle) di modul Pegawai dan KGB.
- **Debugging Aset Publik:**
  - Mengatasi masalah data aset tidak tampil dengan melakukan _seeding_ data dummy ke database.
- **Tracking Peminjaman Aset (Publik):**
  - Menambahkan halaman baru `PublicAssetLoanTrackingPage` untuk monitoring status peminjaman secara publik.
  - Fitur timeline visual (Pengajuan -> Disetujui -> Dipinjam -> Dikembalikan).
  - Integrasi link tracking unik pada notifikasi WhatsApp "Disetujui".
  - API endpoint publik `/api/public/bmn-loans/{token}` yang aman untuk mengambil data peminjaman spesifik.

## Update Terbaru (Renaming SIPTU & Pengaturan Akun)

- **Perubahan Identitas Aplikasi:**
  - Renaming aplikasi dari **SIPAUS** menjadi **SIPTU (Sistem Informasi Pelayanan Tata Usaha)**.
  - Update branding pada `index.html` (Title), `NavbarMenu.jsx`, `Login.jsx` (Title, Subtitle, Footer), dan `LandingPage.jsx`.
  - Tujuan: Merefleksikan cakupan sistem yang lebih luas untuk pelayanan Tata Usaha.
- **Fitur Pengaturan Akun:**
  - Halaman baru `AccountSettings.jsx` yang dapat diakses melalui menu profil.
  - **Tab Profil Saya:** Memungkinkan pengguna memperbarui Nama Lengkap, Email, dan Nomor Telepon. (NIP & Role Read-only).
  - **Tab Ganti Kata Sandi:** Form aman untuk mengubah kata sandi dengan validasi password saat ini dan konfirmasi password baru.
  - **Backend Support:** Penambahan endpoint `PUT /user/profile` dan `PUT /user/password` pada `UserController` serta integrasi fungsi `updateProfile` & `changePassword` pada `AuthContext`.

## Update Terbaru (Modul RISPEG & Laporan Enterprise)

- **Penyempurnaan Navigasi:**
  - Renaming sub-modul: **RUH Rispeg** menjadi **Input Data** dan **Dashboard Rispeg** menjadi **Monitoring**.
  - Update label di `AppLayout.jsx` untuk navigasi yang lebih intuitif.
- **Laporan PDF Rispeg (Enterprise Grade):**
  - Implementasi fitur **Download Laporan** di halaman Monitoring.
  - **Desain Premium:** PDF dikembangkan dengan standar laporan korporat menggunakan `dompdf`:
    - Header formal SIPTU.
    - Ringkasan kinerja dalam bentuk kartu visual (Top Poin, Terlambat, Pulang Cepat).
    - Tabel rekapitulasi detail dengan skema warna profesional dan badge status.
    - Halaman penandatanganan (Signature Section) untuk pengesahan laporan.
- **UI/UX Monitoring:**
  - **Loading State:** Penambahan animasi loading menggunakan `Spin` (Ant Design) dengan efek **backdrop blur** pada konten saat data sedang diambil.
  - **Gaya Visual:** Dashboard menggunakan diagram gauge melingkar untuk menampilkan pemegang rekor tertinggi secara elegan.
- **Perbaikan Bug:**
  - Memperbaiki Error 500 pada ekspor PDF dengan memperbaiki import facade `Pdf` di Laravel.
  - Memperbaiki `ReferenceError: Spin is not defined` pada frontend.
  - Mengupdate komponen `Card` yang deprecated (`bordered` -> `variant="borderless"`) di seluruh dashboard Rispeg.

## Update Terbaru (Modul Monitoring Izin Keluar — RISPEG)

- **Sub-Modul Baru di RISPEG:**
  - Menambahkan **Monitoring Izin Keluar** sebagai sub-modul ketiga RISPEG (setelah Input Data dan Monitoring).
- **Halaman Standalone** (`/izin-keluar`):
  - **Keamanan:** Sekarang mengharuskan login (Proteksi Sanctum).
  - **Alur:** Otomatis mengambil data pegawai dari user yang login (tidak perlu input NIP manual).
  - **Fitur:** Tombol **"Izin Keluar"**, live timer di fase "Out", dan tombol **"Kembali"** untuk mencatat waktu pulang + hitung durasi otomatis.
  - Desain premium dengan receipt ringkasan setelah selesai.
- **Halaman Admin Monitoring** (`/app/rispeg-izin-keluar`):
  - Summary cards: total izin hari ini, pegawai masih di luar, rata-rata durasi, total bulan ini.
  - Filter per tanggal/bulan, search by NIP/nama.
  - Tabel detail dengan badge status (Di Luar/Kembali) dan aksi hapus.
  - Badge pegawai dengan izin terbanyak bulan ini.
- **Backend:**
  - Tabel `exit_permits` (Migration + Eloquent Model).
  - `ExitPermitController`: Endpoint terproteksi untuk `myActive`, `recordExit`, `recordReturn`, `index`, `stats`, dan `destroy`.
  - Waktu menggunakan timezone **Asia/Makassar (GMT+8)** secara konsisten.

## Update Terbaru (Redesign Halaman Login & Security)

- **Visual Elegan:** Menggunakan tema putih bersih (_Simple & Elegant_) dengan shadow halus.
- **Sistem CAPTCHA Alfanumerik:**
  - **Canvas-Based:** Kode digambar pada canvas, bukan teks biasa, untuk mencegah bot OCR.
  - **Random Alphanumeric:** Menggunakan 6 karakter acak (huruf besar & angka).
  - **Security Distortions:** Efek rotasi karakter, variasi font, noise titik, dan garis interferensi.
- **UX Improvements:**
  - Layout kolom input berada di bawah gambar CAPTCHA.
  - Font input besar (**22px Monospace**) dengan jarak lebar (**6px letter-spacing**) untuk kemudahan mengetik.
  - Placeholder yang lebih kecil dan rapi.

## Update Terbaru (Layanan Mandiri & Riwayat)

- **Layanan Mandiri Universal:** Menu Layanan Mandiri dan Riwayat Layanan kini tersedia untuk semua level user tanpa perlu konfigurasi hak akses.
- **Modul Riwayat Layanan (Baru):**
  - Halaman `/app/riwayat-layanan` untuk melihat semua riwayat layanan yang pernah diajukan.
  - Mendukung filter: Jenis Layanan, Status, Tanggal, Pencarian.
  - Tombol Detail untuk mengakses halaman tiket masing-masing layanan.
  - Backend endpoint `GET /api/my-service-history` sudah ditambahkan.
  - Endpoint menggabungkan riwayat dari: Peminjaman Arsip, Peminjaman BMN, Izin Keluar, dan IT Helpdesk.
  - Frontend `RiwayatLayanan.jsx` sudah diperbaiki agar URL query tidak menghasilkan `?` kosong saat filter tidak dipakai.

## Update Terbaru (Izin Keluar RISPEG)

- **Konfirmasi Dialog:** Penambahan modal konfirmasi saat mencatat Izin Keluar dan Kembali.
- **Monitoring Redesign:** Halaman monitoring izin keluar (`/app/rispeg-izin-keluar`) sekarang menggunakan grouping data berdasarkan pegawai dengan fitur expandable row untuk melihat riwayat detail.
- **Parameter Disederhanakan:** Hanya 3 parameter yang tersisa di RISPEG: Terlambat Masuk, Tidak Berseragam, Tidak Apel. (Keluar Cepat/Mangkir dihapus).

---

## Update Terbaru (Modul BMN Persediaan - Kartu Stok & PDF)

- **Redesign Halaman Data Persediaan** (`/app/bmn-data-persediaan`):
  - UI disesuaikan agar sejalan dengan pola halaman BMN Peminjaman Aset.
  - Fokus UX dibuat lebih ringkas dan user-friendly (filter, search, empty state, aksi cepat per barang).
  - Aksi berbasis ikon (`Tooltip`) untuk menjaga tampilan tetap bersih.

- **Fitur Update Stok Terintegrasi:**
  - Tombol aksi per barang untuk **Update Stok**.
  - Modal update stok otomatis mengambil item yang dipilih (tanpa pilih ulang data barang).
  - Validasi stok keluar agar tidak melebihi stok tersedia.
  - Prediksi stok akhir ditampilkan sebelum transaksi disimpan.

- **Kartu Stok Per Barang & Global:**
  - Tab **Kartu Stok** untuk melihat seluruh mutasi masuk/keluar.
  - Tombol **Lihat Kartu Stok** pada tiap barang untuk melihat histori spesifik item.
  - Ringkasan mutasi: stok masuk, stok keluar, dan saldo mutasi.

- **Cetak Kartu Stok Menggunakan Addon PDF (Frontend):**
  - Fitur cetak tidak lagi mengandalkan `window.print`, sekarang generate file PDF langsung di browser.
  - Addon yang digunakan:
    - `jspdf`
    - `jspdf-autotable`
  - Template laporan tetap dipertahankan (header, metadata, ringkasan, tabel detail, footer), namun output menjadi file `.pdf` yang lebih profesional.
  - Mendukung cetak:
    - per barang,
    - dari modal preview kartu stok,
    - laporan kartu stok keseluruhan.

## Update Terbaru (Otorisasi Kearsipan & Bug Fix Management)

- **Otorisasi Pencatatan Surat (UP/UK):**
  - **Backend:** `LetterController` kini secara dinamis mendeteksi peran pengguna (Unit Pengolah/UP, Unit Kearsipan/UK, atau None). 
  - **Filtering:** Pengguna UP hanya dapat melihat dan mengelola surat milik unitnya sendiri. Pengguna UK memiliki akses penuh untuk melihat semua unit.
  - **Frontend:** `KearsipanPencatatanSurat.jsx` secara otomatis mengunci pilihan unit bagi pengguna UP dan memberikan pilihan default bagi pengguna UK. Tombol "Tambah Surat" diproteksi agar data selalu masuk ke unit yang tepat.
  - **Akses Tertutup:** Pengguna yang tidak terdaftar di unit mana pun akan diblokir dengan pesan "Akses Tertutup".

- **Fix Management UP/UK (Persistence & Integrity):**
  - **Daftar Pegawai:** Memperbaiki bug di `AdminArchiveUnitController` di mana menghapus pegawai dari sistem meninggalkan ID sampah yang menyebabkan error validasi. Sekarang sistem secara otomatis menyaring hanya ID pegawai yang masih aktif.
  - **Data Persistence (Nuclear Fix):** Mengimplementasikan pola **Singleton** untuk `archive_unit_settings` (ID: 1) menggunakan `updateOrCreate`. Hal ini memastikan pengaturan Unit Kearsipan tetap tersimpan secara permanen di server/database (solusi untuk masalah data hilang setelah refresh di lingkungan Hostinger).

## Update Terbaru (Stabilisasi Helpdesk, BMN, dan Kearsipan)

- **IT Helpdesk (422/Flow Konfirmasi User):**
  - Memperbaiki error `422` saat submit tiket dari web karena mismatch nilai `report_type` opsi "Lainnya".
  - Frontend `ItHelpdeskForm.jsx` kini mengirim value standar `other`.
  - Backend `ItHelpdeskTicketController` dibuat kompatibel menerima beberapa variasi value report type (`Lainnya`, `hardware`, `software`, `network`, `other`) lalu dinormalisasi.
  - Saat admin menyelesaikan tiket dan status menjadi `waiting_user_approval`, sistem kini mengirim **notifikasi WhatsApp ke user** berisi link konfirmasi (`/it-helpdesk/tickets/{id}/sign`).

- **Admin Panel BMN (Sinkron dengan Web):**
  - Menyesuaikan logika status BMN/Arsip di admin mobile agar tetap bisa diproses untuk variasi status lama/baru.
  - Alur persetujuan BMN di mobile disamakan dengan web: pilih tipe aset (kendaraan/bukan kendaraan), isi kondisi barang, dan tanda tangan validator.
  - Untuk aset kendaraan, field kondisi kendaraan diperbarui:
    - `BBM` tetap input teks.
    - Field lain (`Oli`, `Minyak Rem`, `Ban`, `Air Radiator`, `Air Aki`) menjadi checklist "Baik".
  - Payload kendaraan tetap kompatibel backend (`Baik` / `Tidak Baik`).

- **Kearsipan Pencatatan Surat (422/404 + UX):**
  - Memperbaiki error `422` saat pilih unit **Unit Kearsipan (UK)** karena `archive_unit_id='uk'` sekarang dinormalisasi ke `null` sebelum validasi.
  - Memperbaiki error `404` saat membuka file surat/bukti:
    - Menambahkan endpoint proxy file publik `GET /api/public/letters/files/{id}/{kind}` (`kind: surat|bukti`) yang tidak bergantung symlink `/public/storage`.
    - URL `file_surat_url` dan `bukti_kirim_url` kini mengarah ke endpoint proxy tersebut.
  - Pada mode **Semua Unit (Hanya Lihat)**:
    - Fitur **Edit** dan **Hapus** disembunyikan (read-only mode).
    - Tombol tambah dikunci agar konsisten.
  - Menambahkan tombol **Kembali ke Dashboard** di header halaman pencatatan surat.

## **Terakhir diperbarui:** 26 Februari 2026

## Upcoming Pekerjaan

- [ ] Frontend: Update icon Monitoring Izin Keluar di navbar
- [ ] Frontend: Update Dashboard Rispeg (chart/statistik)
