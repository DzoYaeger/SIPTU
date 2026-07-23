# 🚀 SIPTU ULTRA (Sistem Informasi Pelayanan Tata Usaha Ultra)

SIPTU ULTRA adalah ekosistem manajemen administrasi terpadu yang dirancang untuk mendigitalisasi layanan tata usaha di lingkungan **Balai Besar POM di Palopo**. Proyek ini terdiri dari tiga pilar utama: **Backend API (Laravel)**, **Web Dashboard (React)**, dan **Aplikasi Mobile (React Native)**.

---

## 🌟 Fitur Utama (Core Modules)

Sistem ini melingkupi berbagai layanan mandiri bagi pegawai:
- **📦 Manajemen BMN**: Peminjaman aset dan pemeliharaan Barang Milik Negara.
- **🛠️ IT Helpdesk**: Pelaporan dan penanganan kendala teknologi informasi.
- **📑 Administrasi Umum**: Izin keluar kantor, permintaan ATK (Persediaan), dan Peminjaman Arsip.
- **✈️ Perjalanan Dinas**: Pengajuan Surat Tugas dan monitoring kegiatan.
- **📅 Kalender Aktivitas**: Visualisasi jadwal kegiatan kantor secara terpadu.
- **🔔 Sistem Notifikasi**: Pemberitahuan real-time (polling) untuk persetujuan pengajuan.

---

## 🏗️ Arsitektur Sistem

### 1. Backend (Core API)
- **Teknologi**: Laravel 11.x, PHP 8.2+.
- **Fungsi**: Pusat data, autentikasi (Sanctum), dan logika bisnis (Service Layer).
- **Endpoint**: `https://siptu.bpompalopo.com/core_api/api`.

### 2. Frontend (Web Dashboard)
- **Teknologi**: React 18, Vite, Ant Design, Tailwind CSS.
- **Fungsi**: Dashboard administratif utama untuk pengelolaan data dan validasi oleh pimpinan.
- **Akses**: `https://siptu.bpompalopo.com`.

### 3. Mobile App (Modern Mobile Experience)
- **Teknologi**: Expo SDK 51+, React Native 0.74+, NativeWind (Tailwind), Reanimated 3.
- **Fitur Khusus**: 
  - **Premium UI**: Desain modern dengan skema warna *electric blue*, *glassmorphism*, dan animasi Modal Feedback yang elegan.
  - **In-App Notification**: Sistem popup dinamis untuk notifikasi persetujuan (polling foreground) dan Toast Sukses Login.
  - **Interactive Calendar**: Manajemen jadwal tugas dengan antarmuka yang responsif.
  - **In-App Updater (OTA Bypass)**: Pengecekan versi aplikasi otomatis terhadap `version.json` di server untuk memaksa pengguna men-download APK versi terbaru secara langsung.

---

## 📂 Struktur Folder Proyek

```text
SIPTU-ULTRA/
├── backend/                # Source Code Laravel (API Only)
├── frontend/               # Source Code React (Web Dashboard)
├── mobile-rn/              # Source Code React Native (Mobile App)
├── database_siptuultra.sql # Snapshot Database
└── README.md               # Dokumentasi Utama
```

---

## 📂 Struktur di Hosting (Production)
Aplikasi dideploy di **Hostinger** dengan konfigurasi ruting khusus via `.htaccess`:

```text
public_html/                # Root direktori (Akses Frontend)
├── assets/                 # Build assets frontend (React dist)
├── index.html              # Entry point utama web
├── version.json            # File konfigurasi pemicu Push Update aplikasi mobile Android
├── core_api/               # Sub-folder Backend (Laravel)
    ├── app/                # Logic Backend
    ├── public/             # Entry point API (index.php)
    └── .env.production     # Config Database server
```

---

## 📜 Panduan Pengembangan (Developer Guidelines)

> [!IMPORTANT]
> **Standarisasi Penggunaan Fitur Khusus:**
> - **Web**: Gunakan utilitas `apiFetch` untuk menangani timeout dan autentikasi otomatis.
> - **Mobile (Distribution)**: Update APK dikelola mandiri via *direct-download* DropBox/G-Drive. Hindari pengiriman `.apk` manual ke chat; perbarui `version.json` setiap rilis versi baru untuk men-trigger update layar penuh di HP seluruh pegawai.
> - **Notifikasi**: Sistem mobile menggunakan polling via `useNotificationPolling` setiap 60 detik untuk mendeteksi pengajuan yang disetujui.

---

## 💻 Cara Menjalankan Lokal

### 1. Backend
```bash
cd backend
composer install
php artisan serve
```

### 2. Frontend (Web)
```bash
cd frontend
npm install
npm run dev
```

### 3. Mobile (Android/iOS)
```bash
cd mobile-rn
npm install
npx expo start
# Gunakan aplikasi 'Expo Go' di smartphone atau jalankan di Emulator.
```

---

## 🔒 Audit Keamanan Kode (Semgrep SAST)

Proyek ini dilengkapi dengan alat pemindai keamanan otomatis **Semgrep** untuk mendeteksi celah keamanan (OWASP Top 10, SQL Injection, XSS, Hardcoded Secrets, dll.) di seluruh codebase (Laravel, React, dan React Native).

### Jalankan Scan Keamanan Lokal:
- **Windows**: `run-semgrep.bat` atau `pip install semgrep && semgrep scan --config=.semgrep.yml`
- **Linux/macOS**: `./run-semgrep.sh`
- **Docker**: `docker run --rm -v "%cd%:/src" returntocorp/semgrep semgrep scan --config=.semgrep.yml`

*Hasil pemindaian otomatis akan disimpan dalam file `semgrep-report.txt` atau dijalankan secara otomatis di CI/CD via GitHub Actions (`.github/workflows/semgrep.yml`).*

---

*Terakhir diperbarui: 23 Juli 2026. Dokumentasi ini disusun untuk membantu pengembang memahami ekosistem SIPTU ULTRA secara utuh.*