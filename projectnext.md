# Project Roadmap: SIAMPARAN (Web & Mobile)

Dokumen ini mencatat progres pengerjaan dan langkah-langkah selanjutnya untuk pengembangan aplikasi SIAMPARAN.

## Current Progress

### Mobile App (SIAMPARAN Mobile)
- **Login Flow**: Berhasil mengimplementasikan login menggunakan NIP & Password via API.
- **Dashboard**: Statistik dashboard (Layanan Mandiri, Pengawasan, dll) sudah terhubung ke backend.
- **Asset Loan (Peminjaman BMN)**:
  - Alur form disesuaikan dengan web (Identitas -> Jadwal -> Aset -> Lokasi -> TTE).
  - Pre-populasi data peminjam otomatis (NIP, Nama, Bidang).
  - Cek ketersediaan aset secara real-time berdasarkan tanggal.
  - Pilihan lokasi menggunakan sistem Chip (Kota Palopo, Luwu, dsb) + Input "Lainnya".
  - Integrasi Signature Pad (TTE) dengan fitur Pratinjau.
  - Format list aset: Nama Barang, Kode Barang, dan NUP.
  - Perbaikan API Route (Conflict 405) dan format JSON Payload (422).

### Web App (SIAMPARAN Web)
- **BMN Module**: Sinkronisasi alur dengan mobile.
- **WhatsApp Notification**: Integrasi Fonnte untuk notifikasi pengajuan dan persetujuan peminjaman.

## Technical Debt & Known Issues
- **Pagination**: Backend API `/assets` memiliki limit default. Saat ini diatasi dengan `pageSize: 1000` di mobile. Perlu optimasi jika data mencapai ribuan.
- **Signature Rendering**: Pada browser mobile tertentu, canvas signature memerlukan tinggi eksplisit (minimal 300px).

## Next Steps

### 1. Mobile Development (Lanjutan)
- [ ] **Modul Pengawasan**: Sinkronisasi UI dan alur input untuk pemeriksaan sarana.
- [ ] **Modul Layanan Mandiri**: Implementasi fitur Surat Tugas dan Izin Keluar (Exit Permit) di mobile.
- [ ] **Push Notifications**: Integrasi Firebase Cloud Messaging (FCM) untuk notifikasi real-time selain WhatsApp.
- [ ] **Offline Mode**: Cache data aset dan riwayat untuk akses tanpa internet (menggunakan SQLite atau AsyncStorage).

### 2. Web Development (Lanjutan)
- [ ] **Dashboard Analytics**: Penambahan grafik tren peminjaman aset dan utilitas barang.
- [ ] **Admin Verification**: Perbaikan UI untuk verifikator saat menyetujui peminjaman dari mobile.

### 3. Maintenance
- [ ] **Unit Testing**: Menambahkan automation test untuk alur peminjaman aset.
- [ ] **Documentation**: Update API Documentation (Swagger/Postman) untuk endpoint baru.

### 4. UI/UX & Animations
- [x] **Premium Feedback**: Implementasi `ConfirmModal` dan `SuccessModal` dengan animasi premium (Reanimated v3) untuk menggantikan Alert standar.
- [x] **Standardization**: Menetapkan standar UI/UX baru di `SKILL.md` untuk interaksi user yang konsisten.

---
*Last Updated: 17 March 2026*
