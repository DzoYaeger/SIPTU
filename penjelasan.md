# 📘 KNOWLEDGE BASE & DOKUMENTASI SISTEM: SIPTU ULTRA
> **Dokumen Panduan Operasional & Training Hermes AI**  
> *Sistem Informasi Pelayanan Terpadu Ultra — Balai Besar Pengawas Obat dan Makanan (BPOM) di Palopo*

---

## 🏛️ BAGIAN 1: ARSITEKTUR & HIERARKI PERAN PENGGUNA

SIPTU ULTRA adalah platform enterprise super-app terpadu yang memadukan portal layanan mandiri pegawai (*self-service portal*), otomatisasi administrasi perkantoran, tata kelola BMN & logistik, pertanggungjawaban keuangan (LPJ), monitoring kinerja, serta pusat komando operasional pimpinan (*Admin Command Center*).

```
                          ┌─────────────────────────────┐
                          │   PORTAL LAYANAN MANDIRI    │
                          └──────────────┬──────────────┘
         ┌──────────────────┬────────────┴────────────┬──────────────────┐
         ▼                  ▼                         ▼                  ▼
┌─────────────────┐┌─────────────────┐       ┌─────────────────┐┌─────────────────┐
│  KEPEGAWAIAN &  ││      BMN &      │       │   KEUANGAN &    ││  IT & DIGITAL   │
│      IZIN       ││     SARPRAS     │       │       LPJ       ││     SUPPORT     │
└─────────────────┘└─────────────────┘       └─────────────────┘└─────────────────┘
```

### 👥 Hierarki Peran Pengguna (*Role Matrix*):
1. **Pegawai (User Biasa)**:
   * Mengakses seluruh modul di **Layanan Mandiri** (pengajuan izin, surat tugas, permohonan aset, pengajuan MCU, LPJ keuangan, tiket IT, dll.).
   * Memantau sisa saldo plafon MCU mandiri, melacak tiket di *Riwayat Layanan Saya*, dan melihat kalender agenda kantor.
2. **Operator (Petugas Pelaksana Teknis)**:
   * Bertanggung jawab atas pengelolaan teknis harian: input master data barang BMN, penyiapan logistik gudang, penanganan tiket teknis IT Helpdesk, penyiapan draf berkas surat.
3. **Validator / Verifikator (Pejabat / Penelaah)**:
   * Melakukan verifikasi atas kelengkapan dokumen pengajuan, memeriksa ketersediaan anggaran DIPA/stok fisik, serta mengambil keputusan persetujuan (*Approve*) atau penolakan (*Reject*).
4. **Admin / Super Admin**:
   * Memegang kendali penuh atas **Admin Command Center Dashboard**, manajemen akun & hak akses (*User Management*), pemicu Audit AI (*AI Audit & Early Warning System*), manajemen slider banner & kategori layanan, inisialisasi saldo massal, dan penarikan laporan operasional instansi (PDF/Excel).

---

## 🚀 BAGIAN 2: DIREKTORI LENGKAP FITUR LAYANAN MANDIRI

---

### 1️⃣ KELOMPOK LAYANAN: KEPEGAWAIAN & IZIN

#### A. Pengajuan Surat Tugas Multi-Pegawai & SIAMPARAN (`/app/surat-tugas`)
* **Deskripsi**: Modul pembuatan, usulan, dan penerbitan Surat Tugas kedinasan (perjalanan dinas dalam kota, luar kota, pengawalan, sampling, maupun operasi intelijen).
* **Sub-Menu & Fitur**:
  1. *Formulir Usulan*: Pemilihan personil multi-pegawai (*multi-select*), penetapan ketua tim/penanggung jawab, tujuan lokasi, tanggal mulai & selesai.
  2. *Pembebanan Anggaran*: Pemilihan sumber dana DIPA (Mata Anggaran Keluaran / MAK) atau Non-DIPA.
  3. *Dasar Penugasan*: Unggah surat masuk, nota dinas, atau disposisi pimpinan.
  4. *TTE Elektronik & Cetak*: Penomoran otomatis sistem dan tanda tangan elektronik tersertifikasi.
* **Cara Pengajuan**:
  1. Buka menu `Pengajuan Surat Tugas` ➔ Klik `+ Buat Surat Tugas Baru`.
  2. Isi perihal tugas, tanggal pelaksanaan, dan lokasi tujuan.
  3. Pilih personil pelaksana dari daftar pegawai.
  4. Lampirkan berkas surat dasar/disposisi ➔ Pilih MAK DIPA yang sesuai ➔ Klik `Kirim Pengajuan`.
* **Hal Penting yang Perlu Diperhatikan**:
  * **Pencegahan Jadwal Bentrok**: Sistem otomatis memeriksa apakah personil yang dipilih sudah memiliki surat tugas lain pada tanggal yang sama.
  * **Pagu MAK**: Pastikan mata anggaran yang dipilih memiliki sisa pagu aktif yang memadai.

---

#### B. Izin Keluar Kantor RISPEG (`/izin-keluar` & `/app/pengumuman-rispeg`)
* **Deskripsi**: Modul presensi dinas dan permohonan izin meninggalkan kantor pada jam operasional kerja dengan pencatatan waktu presisi.
* **Sub-Menu & Fitur**:
  1. *Form Pengajuan Izin*: Pilihan keperluan (**Dinas Luar** atau **Urusan Pribadi**), estimasi jam keluar & rencana kembali, alasan izin.
  2. *Konfirmasi Kepulangan*: Tombol aksi untuk mencatat waktu riil kembali ke kantor.
  3. *RISPEG Rekap & Leaderboard*: Papan pemantauan total menit izin, rekapitulasi poin disiplin, dan leaderboard kedisiplinan pegawai.
* **Cara Pengajuan**:
  1. Masuk menu `Izin Keluar (RISPEG)` ➔ Klik `Ajukan Izin Keluar`.
  2. Pilih jenis keperluan, tentukan jam rencana kembali, dan ketik alasan izin.
  3. Kirim pengajuan ➔ Begitu kembali ke kantor, pegawai **wajib** menekan tombol `Konfirmasi Kembali`.
* **Hal Penting yang Perlu Diperhatikan**:
  * Izin urusan pribadi memiliki kuota akumulasi menit per bulan. Keterlambatan atau kelebihan jam akan berdampak pada pengurangan poin disiplin RISPEG.

---

#### C. Pemeriksaan Kesehatan / MCU (`/app/pemeriksaan-kesehatan`)
* **Deskripsi**: Fasilitas pengajuan pemeriksaan kesehatan rutin pegawai yang disubsidi melalui plafon anggaran instansi per Tahun Anggaran.
* **Sub-Menu & Fitur**:
  1. *Form Pengajuan & Kalkulator Saldo Real-Time*: Checklist paket tes medis (Darah Lengkap/CBC, Profil Lipid, Fungsi Ginjal, SGOT/SGPT, Gula Darah/HbA1c, Urine, EKG, Rontgen Thorax, USG Abdomen, Fisik Dokter, HBsAg).
  2. *Mode Edit Pengajuan Status Pending*: Jika pengajuan masih berstatus menunggu verifikasi, checklist paket yang dipilih sebelumnya **langsung tercentang otomatis** (*pre-checked*) dan form dapat diperbarui kembali tanpa saldo terpotong ganda (*auto-reconciliation*).
  3. *Riwayat Pengajuan MCU*: Unduh bukti riwayat (PDF) dan opsi pembatalan pengajuan (saldo otomatis kembali 100%).
  4. *Panel Admin MCU*: Master tarif paket, pengaturan saldo perorangan, inisialisasi saldo massal per TA, ekspor laporan Excel/PDF.
* **Cara Pengajuan**:
  1. Buka menu `Pemeriksaan Kesehatan`.
  2. Cek ketersediaan sisa saldo pada kartu informasi (*Hero Card*).
  3. Centang paket pemeriksaan yang diinginkan pada grid pilihan.
  4. Perhatikan kalkulator estimasi saldo (tidak boleh minus/melebihi plafon).
  5. Isi rencana tanggal pemeriksaan dan faskes/lab rujukan (misal: Prodia Palopo / RSUD Sawerigading) ➔ Klik `Kirim Pengajuan MCU` (atau `Simpan Perubahan Pengajuan`).
* **Hal Penting yang Perlu Diperhatikan**:
  * Plafon standar per pegawai adalah **Rp 2.000.000 / Tahun Anggaran**.
  * Pengajuan berstatus `pending` dapat diedit kapan saja. Jika dibatalkan pegawai atau ditolak validator, saldo aktif langsung dikembalikan utuh.

---

#### D. Peminjaman Arsip Fisik & Digital (`/kearsipan-peminjaman/new`)
* **Deskripsi**: Tata kelola peminjaman dokumen/warkat arsip dinas BPOM Palopo.
* **Sub-Menu & Fitur**: Pencarian nomor berkas/klasifikasi, form tujuan dan durasi peminjaman, tracking jatuh tempo pengembalian berkas fisik.
* **Cara Pengajuan**: Cari nomor arsip ➔ Tentukan tanggal & durasi pinjam ➔ Kirim usulan ke Unit Kearsipan (UK).
* **Hal Penting**: Pengembalian arsip fisik wajib diverifikasi oleh petugas kearsipan.

---

#### E. Sesi Kompak / Pelatihan Pegawai (`/app/pelatihan-pegawai`)
* **Deskripsi**: Pencatatan riwayat pengembangan kompetensi (Bangkom), bimtek, workshop, dan diseminasi internal (*Knowledge Sharing*).
* **Sub-Menu & Fitur**: Form pendaftaran pelatihan baru, input Jam Pelajaran (JP), unggah sertifikat kelulusan (PDF) & ringkasan materi.
* **Cara Pengajuan**: Input nama kegiatan & tanggal ➔ Masukkan jumlah JP ➔ Unggah sertifikat ➔ Kirim untuk validasi kepegawaian.

---

#### F. Ruang Rapat Virtual Zoom Generator (`/app/zoom-generator`)
* **Deskripsi**: Pembuatan ruang meeting virtual instan menggunakan lisensi API resmi BPOM Palopo.
* **Sub-Menu & Fitur**: Form agenda rapat, durasi, passcode, otomatisasi pembuatan link room zoom, dan template broadcast undangan WhatsApp.

---

#### G. SIPTU Drive (`/app/penyimpanan-cloud`) & Kanban Work (`/app/kanban-work`)
* **SIPTU Drive**: Penyimpanan cloud terenkripsi terintegrasi dengan Nextcloud untuk dokumen kerja tim dan arsip digital.
* **Kanban Work**: Papan tugas tim kolaboratif (*Backlog ➔ To-Do ➔ In Progress ➔ Done*), subtask dengan due date, penugasan personil, dan unggah bukti pekerjaan.

---

### 2️⃣ KELOMPOK LAYANAN: LOGISTIK, BMN & SARPRAS

#### A. SIMBA — Sistem Informasi Manajemen Barang & Aset (`/app/simba`)
* **Deskripsi**: Pengelolaan aset tetap, permintaan barang persediaan habis pakai, dan pelaporan kerusakan fasilitas kantor.
* **Sub-Menu & Fitur**:
  1. *Peminjaman Aset Tetap* (`/app/bmn-peminjaman-aset`): Laptop dinas, proyektor, kamera, kendaraan dinas roda 4 / roda 2.
  2. *Permintaan Barang Persediaan* (`/app/bmn-permintaan-persediaan`): ATK, reagen laboratorium, bahan kimia pengujian, perlengkapan kebersihan.
  3. *Pemeliharaan & Keluhan Aset* (`/app/bmn-pemeliharaan-keluhan`): Laporan kerusakan sarpras/alat uji untuk perbaikan berkala.
* **Cara Pengajuan**:
  1. Buka `SIMBA` ➔ Pilih sub-layanan yang diinginkan.
  2. Pilih barang dari katalog master ➔ Masukkan jumlah kuantitas dan peruntukan kegiatan ➔ Kirim ke Pengelola BMN.
* **Hal Penting yang Perlu Diperhatikan**:
  * Sistem memvalidasi stok riil gudang. Permintaan persediaan tidak dapat diproses jika melebihi stok yang ada.
  * Peminjaman kendaraan dinas wajib melampirkan dasar Surat Tugas.

---

#### B. Peminjaman Ruangan & Aula (`/peminjaman-ruangan`)
* **Deskripsi**: Penjadwalan penggunaan Ruang Rapat Utama, Ruang Rapat Pimpinan, dan Aula Balai POM.
* **Sub-Menu & Fitur**: Kalender visual ketersediaan ruangan, form booking sesi jam rapat, permintaan sarana pendukung (Sound System, Mic, Proyektor, Konsumsi).
* **Hal Penting**: Sistem memiliki fitur *collision prevention* (menolak otomatis booking pada ruangan dan waktu yang bertabrakan).

---

#### C. Pengadaan PBJ & PDTT (`/app/pengadaan-pbj`, `/pengajuan-pdtt/new`)
* **Pengusulan PBJ**: Usulan pengadaan barang/jasa baru di luar katalog reguler.
* **Pengadaan PDTT**: Usulan pengadaan daftar barang sesuai jendela periode aktif anggaran pengadaan.

---

### 3️⃣ KELOMPOK LAYANAN: KEUANGAN & LPJ

#### SIMKEU — Sistem Informasi Manajemen Keuangan (`/app/simkeu`, `/app/keuangan-lpj`)
* **Deskripsi**: Pertanggungjawaban belanja perjalanan dinas, nota belanja operasional, dan realisasi anggaran DIPA.
* **Sub-Menu & Fitur**:
  1. *LPJ Perjadin & Operasional*: Pembuatan lembar pertanggungjawaban berdasarkan Surat Tugas.
  2. *Invoice Belanja & Nota Kuitansi*: Unggah kuitansi riil, tiket pesawat/transportasi, bill hotel, boarding pass.
  3. *Monitoring Pagu & MAK*: Penyerapan anggaran per mata anggaran (524111, 521211, dll.).
  4. *Pejabat Perbendaharaan*: Penetapan verifikasi berjenjang ke PPK dan Bendahara Pengeluaran.
* **Cara Pengajuan**:
  1. Pilih nomor Surat Tugas yang telah selesai.
  2. Masukkan rincian belanja riil per komponen pengeluaran.
  3. Unggah berkas kuitansi/bukti sah ➔ Review total nilai ➔ Kirim LPJ untuk diverifikasi PPK & Tim Keuangan.
* **Hal Penting yang Perlu Diperhatikan**:
  * Nominal pengeluaran wajib mengacu pada Standar Biaya Masukan (SBM) yang sah.

---

### 4️⃣ KELOMPOK LAYANAN: IT & DIGITAL SUPPORT

#### IT Helpdesk (`/it-helpdesk/new`, `/app/it-helpdesk-pelaporan`)
* **Deskripsi**: Layanan pelaporan gangguan teknis komputer, jaringan internet, printer, software, dan akun dinas.
* **Sub-Menu & Fitur**:
  1. *Kategori Gangguan*: Hardware, Jaringan/Wi-Fi, Aplikasi/Sistem, Akun & Email.
  2. *Tingkat Urgensi*: Rendah, Sedang, Tinggi, Darurat (*Critical*).
  3. *Tracking Tiket*: Pelacakan progres teknisi (*Open ➔ In Progress ➔ Solved ➔ Closed*).
* **Cara Pengajuan**: Pilih jenis kendala ➔ Tentukan urgensi ➔ Tuliskan kronologi dan lampirkan screenshot/foto error ➔ Submit tiket.

---

## 👑 BAGIAN 3: FITUR KHUSUS DASHBOARD & PANEL KONTROL LEVEL ADMIN

Fitur-fitur berikut berada di `/app/dashboard` dan menu-menu pengelola yang **hanya dapat diakses oleh akun dengan peran Admin / Super Admin**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                     ADMIN COMMAND CENTER DASHBOARD                     │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Real-Time Command Center (KPI Metrik: Tiket, User, Pegawai, Aset)   │
│ 2. Grafik Tren Aktivitas Multi-Modul (Area & Bar Chart Analytics)     │
│ 3. AI Audit System (Pendeteksi Bottleneck & Anomali Data Tiket)       │
│ 4. Generator Laporan Operasional Resmi (PDF / Excel Ber-KOP Balai)    │
│ 5. Manajemen Pengguna & Pemetaan Role/Modul (User Access Control)      │
│ 6. Filter Manager & Custom Branding (Atur Kategori & Icon Layanan)     │
│ 7. Kontrol Slider Banner & Pengumuman Broadcast Portal                 │
│ 8. Master Data Management (MCU Balances, BMN Aset, MAK DIPA, RISPEG)   │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Command Center & Real-Time Monitoring**:
   * Menampilkan metrik utama instansi: Total Layanan, Layanan Hari Ini, Total Akun Pengguna, Pegawai Terdaftar, Aset BMN, dan Persediaan Barang.
   * Grafik tren aktivitas layanan multi-modul harian/bulanan (Recharts Area, Bar, & Radial Chart).
   * Status global tiket (*Menunggu, Aktif/Dalam Proses, Selesai, Ditolak*).
2. **AI Audit & Early Warning System (`/admin/ai-audit`)**:
   * Pemicu audit otomatis berbasis AI untuk mendeteksi tiket yang mengalami keterlambatan (*bottleneck* > 48 jam).
   * Peringatan anomali data pengajuan dan rekomendasi efisiensi alur kerja kepada admin.
3. **Ekspor Laporan Operasional Instansi (`/admin/export-report`)**:
   * Generator laporan resmi ber-KOP Balai POM Palopo dalam format PDF/Excel dengan pilihan periode:
     * **Bulanan**: Laporan kinerja per bulan.
     * **Triwulanan (Q1 - Q4)**: Evaluasi berkala triwulan.
     * **Tahunan**: Rekapitulasi tahun anggaran.
     * **Custom Date Range**: Fleksibel sesuai tanggal yang dipilih.
4. **Manajemen Pengguna & Hak Akses (`/app/admin-user-management`)**:
   * Pembuatan akun pegawai, pengaitan NIP, reset kata sandi.
   * Pengaturan peran utama (*Base Role*): Admin, Validator, Operator, Pegawai.
   * **Role Modules Matrix (`role_modules`)**: Membatasi akses modul spesifik per unit kerja.
5. **Filter Manager & Layanan Mandiri Customizer**:
   * Mengatur kategori filter layanan (tambah kategori baru, ubah warna aksen, pilih ikon).
   * Memetakan layanan ke kategori yang sesuai.
   * Mengunggah ikon custom (*PNG/SVG*) per modul aplikasi.
6. **Manajemen Slider Banner & Pengumuman (`/app/pengaturan-slider`)**:
   * Mengunggah banner promosi/informasi yang tampil di header Layanan Mandiri.
7. **Tata Kelola Master Data Modul**:
   * *Master MCU*: Pengaturan tarif & jenis tes, atur saldo perorangan, dan tombol inisialisasi saldo massal per Tahun Anggaran.
   * *Master BMN*: Input kartu stok persediaan, kode aset tetap, dan histori pemeliharaan.
   * *Master Keuangan*: Struktur pagu DIPA, MAK, dan penugasan Pejabat Perbendaharaan (PPK/Bendahara).

---

## 📝 BAGIAN 4: STANDAR & ALUR PENGAJUAN OLEH PEGAWAI

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ 1. Pilih     │ ──> │ 2. Isi Form  │ ──> │ 3. Validasi  │ ──> │ 4. Terbit    │
│    Layanan   │     │    & Upload  │     │    Sistem    │     │    No. Tiket │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

1. **Akses Portal**: Pegawai membuka [Layanan Mandiri](https://siptu.bpompalopo.com/app/layanan-mandiri) ➔ Pilih modul melalui kartu layanan atau pencarian instan.
2. **Pengisian Data**: Mengisi form rencana pelaksanaan, tujuan, personil, atau rincian barang serta melampirkan berkas pendukung.
3. **Validasi Otomatis Sistem**:
   * MCU: Memastikan biaya tes tidak melebihi sisa plafon.
   * SIMBA: Memastikan stok persediaan di gudang mencukupi.
   * Surat Tugas & Ruangan: Memastikan tidak ada jadwal yang bentrok.
4. **Penerbitan Nomor Tiket**: Sistem menghasilkan nomor registrasi resmi (misal: `MCU-20260827-0001`, `ST-2026-0142`).
5. **Fitur Edit saat Pending**: Selama status tiket masih `Menunggu Verifikasi`, pegawai dapat mengklik tombol **Ubah Pengajuan** untuk memperbarui checklist atau data form tanpa membuat tiket baru.

---

## ⚖️ BAGIAN 5: ALUR & STANDAR PERSETUJUAN (APPROVAL WORKFLOW)

```
                       ┌────────────────────────────┐
                       │  PENGAJUAN MASUK (PENDING) │
                       └─────────────┬──────────────┘
                                     │
                        [Evaluasi & Verifikasi]
                                     │
             ┌───────────────────────┼───────────────────────┐
             ▼                       ▼                       ▼
   ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
   │    DISETUJUI     │    │     DITOLAK      │    │  MINTA REVISI    │
   │   (APPROVED)     │    │   (REJECTED)     │    │  (NEED REVISION) │
   └─────────┬────────┘    └─────────┬────────┘    └─────────┬────────┘
             │                       │                       │
     [Terbit Surat/          [Saldo Kembali /        [Pegawai Update
      Eksekusi Tugas]         Stok Batal]             Data Form]
```

### Prosedur Kerja Validator / Admin:
1. **Menerima Antrean**: Validator membuka menu daftar pengajuan dengan filter status `Menunggu Verifikasi (Pending)`.
2. **Pemeriksaan Kelayakan**:
   * *Kesesuaian Anggaran*: Memeriksa pagu MAK (SIMKEU) atau sisa saldo plafon (MCU).
   * *Ketersediaan Fisik*: Memeriksa kondisi aset atau stok riil gudang (SIMBA).
   * *Urgensi & Disposisi*: Memeriksa surat dasar penugasan (Surat Tugas) atau alasan izin (RISPEG).
3. **Tindakan Verifikasi**:
   * **Disetujui (`Approved`)**: Tiket disetujui, surat tugas/dokumen diterbitkan dan ditandatangani secara digital (TTE).
   * **Selesai (`Completed`)**: Ditetapkan jika barang persediaan telah diserahkan, tindakan IT Helpdesk telah tuntas, atau LPJ keuangan telah dicairkan/disahkan.
   * **Ditolak (`Rejected`)**: Validator **wajib mengisi catatan alasan penolakan**. Saldo atau alokasi barang otomatis dikembalikan seketika ke akun pegawai.
   * **Minta Revisi**: Validator memberikan catatan perbaikan, pegawai mengedit formulir pengajuannya kembali.

---

## 📊 BAGIAN 6: TABEL MATRIKS MODUL & ATRIBUT UNTUK HERMES AI

| ID Layanan | Nama Layanan | Kategori | Parameter Kunci Pengajuan | Output / Hasil Akhir |
| :--- | :--- | :--- | :--- | :--- |
| `surat-tugas` | Pengajuan Surat Tugas | Kepegawaian | Multi-Pegawai, Tanggal, Lokasi, MAK DIPA, Surat Masuk | PDF Surat Tugas resmi ber-TTE & SIAMPARAN |
| `rispeg` | Izin Keluar RISPEG | Kepegawaian | Keperluan (Dinas/Pribadi), Jam Keluar, Jam Kembali | Log Presensi, Rekap Menit Izin, Skor Disiplin |
| `pemeriksaan-kesehatan` | Pemeriksaan Kesehatan (MCU) | Kepegawaian | Checklist Paket Tes Lab, Rencana Tanggal, Faskes Rujukan | Lembar Pengantar MCU, Rekonsiliasi Plafon Saldo |
| `kearsipan` | Peminjaman Arsip | Kepegawaian | Nomor Berkas, Durasi Pinjam, Tujuan Pinjam | Formulir Peminjaman Arsip Sah, Notifikasi Due Date |
| `pelatihan-pegawai` | Sesi Kompak | Kepegawaian | Judul Workshop, Jam Pelajaran (JP), Sertifikat PDF | Log Pengembangan Kompetensi Pegawai (Bangkom) |
| `zoom-generator` | Pengajuan Zoom | Kepegawaian | Nama Rapat, Waktu, Durasi, Passcode | Room Zoom API Instan & Template Undangan WA |
| `kanban-work` | Kanban Work | Kepegawaian | Judul Task, Subtask + Due Date, Member Tim, Bukti File | Papan Kolaborasi Tim & Sinkronisasi Cloud |
| `simba` | BMN & Inventaris | Logistik | Peminjaman Aset / Permintaan Habis Pakai / Kerusakan | Berita Acara Pinjam, Pengurangan Kartu Stok Gudang |
| `ruangan` | Peminjaman Ruangan | Logistik | Ruang Rapat / Aula, Tanggal, Jam, Fasilitas Tambahan | Reservasi Jadwal Rapat (Bebas Konflik Waktu) |
| `pengadaan-pbj` | Pengadaan PBJ / PDTT | Logistik | Usulan Barang Baru, Periode PDTT Aktif, Kuantitas | Rekap Usulan RUP & Dokumen Pengadaan |
| `simkeu` | SIMKEU (LPJ & Keuangan) | Keuangan | Surat Tugas Acuan, Rincian MAK, Upload Kuitansi / Bill | Berkas LPJ Sah, Lembar Verifikasi PPK & Bendahara |
| `it-helpdesk` | IT Helpdesk | IT & Digital | Kategori Masalah, Tingkat Urgensi, Bukti Screenshot | Tiket Penanganan IT, Log Solusi Teknisi |

---

## 🤖 BAGIAN 7: PANDUAN PERILAKU & RESPON HERMES AI
Saat menjawab pertanyaan pengguna, Hermes AI harus mematuhi aturan berikut:
1. **Gaya Komunikasi**: Profesional, lugas, solutif, berbasis data enterprise (*Enterprise Clean Tone*), dan terstruktur dengan rapi.
2. **Saat Pegawai Mengalami Saldo MCU Berubah**: Jelaskan bahwa saldo MCU terpotong otomatis saat mengajukan, tetapi dapat diedit kembali selama statusnya `pending`, atau kembali otomatis jika dibatalkan/ditolak.
3. **Saat Pegawai Menanyakan Izin Keluar**: Ingatkan untuk selalu menekan tombol `Konfirmasi Kembali` begitu tiba di kantor agar durasi izin tidak membengkak pada sistem RISPEG.
4. **Saat Admin Bertanya Menu Dashboard**: Arahkan ke rute `/app/dashboard` untuk Command Center, `/admin/ai-audit` untuk deteksi bottleneck, dan `/app/admin-user-management` untuk pengelolaan hak akses.
