# Summary Best Practices Desain Mobile Frontend SIPTU ULTRA

Dokumen ini merupakan rangkuman dari hasil analisis 3 referensi competitor desain mobile (Neumorphic Soft UI, Clean Teal Wave SIASN Style, dan Futuristic Violet Gamified System).

---

## 💎 1. Pilar Estetika Desain Mobile (Core Design Principles)

| Pilar | Deskripsi | Penerapan di SIPTU Mobile |
|---|---|---|
| **Soft Elevation & Depth** | Menggunakan ambient shadow ganda dan Neumorphism lembut untuk memberikan kesan taktil (*tactile feel*) | Widget statistik, kartu layanan, dan tombol aksi utama |
| **Clean Waves & Curves** | Header bergelombang (*curved wave header*) dan sudut kartu yang sangat melengkung (`16px - 24px`) | Banner profil, header login, dan kartu ringkasan status |
| **High Contrast Hierarchy** | Judul `Bold 700-800` warna `#172033` dipadu dengan subtitle muted `#64748B` | Header modul, nama pegawai, dan nilai statistik |
| **Floating Navigation Bar** | Bottom bar yang melayang (*floating bottom bar*) dengan tombol utama melingkar di tengah | Navigasi utama aplikasi Flutter |

---

## 🎨 2. Sistem Warna Harmonis Mobile

```css
/* Color Tokens for SIPTU Mobile Flutter */
Primary Brand Teal   : #0F5B99 (SIPTU Primary Blue) / #0D9488 (Teal Accent)
Secondary Accent Violet: #6366F1 / #8B5CF6 (Highlight & Badges)
Success Green        : #059669 (Status Disetujui / Selesai)
Warning Amber        : #D97706 (Status Menunggu / Dipinjam)
Danger Red           : #DC2626 (Status Ditolak / Alert)
Canvas Background    : #F8FAFC (Slate Off-White)
Card Surface         : #FFFFFF (Pure White Card)
Text Primary         : #172033 (Dark Slate)
Text Muted           : #64748B (Medium Slate)
```

---

## 📐 3. Pola Layout & Komponen Standar Mobile

1. **Header Profil Pegawai**: Wave banner dengan avatar lingkaran bergradien + NIP badge + Jabatan.
2. **Horizontal Date/Calendar Stepper**: Selector tanggal mingguan yang dapat di-swipe horizontal.
3. **Card Stepper Tracking Status**: Indikator alur pengajuan 4-step (*Draft -> Diajukan -> Disetujui -> Selesai*).
4. **Digital Employee ID Card**: Kartu ID Pegawai bergaya kartu kredit digital lengkap dengan QR Code TTE.
5. **Quick Action Grid**: 4-8 ikon grid berbundar dengan background pastel untuk akses cepat layanan mandiri.
6. **Bottom Sheet Dialogs**: Modal yang muncul dari bawah (*bottom sheet*) untuk konfirmasi & detail pengajuan.
