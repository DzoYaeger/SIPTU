# Indeks Berkas Referensi Desain Kompetitor (UI/UX Benchmark Analysis)

## 🏆 Berkas Ringkasan Eksekutif Utama
* 📖 **[Executive Summary: Panduan Desain Terbaik (UI/UX Best Practices & Standards)](file:///f:/sites/SUPERAPP/SIPTUULTRA/competitor_analysis/SUMMARY_BEST_PRACTICES.md)** — *Rangkuman standar tipografi, skema warna, geometri, form, modal dialog, dan tabel terbaik dari seluruh analisis kompetitor.*

---

## 📁 Berkas Dokumentasi Referensi Terpisah

| No | Nama Tangkapan Layar / Topik | Tema Dashboard | Berkas Markdown |
|---|---|---|---|
| 1 | **Emilus Admin Template** | Light Sales & Revenue Dashboard | [01_emilus_dashboard.md](file:///f:/sites/SUPERAPP/SIPTUULTRA/competitor_analysis/01_emilus_dashboard.md) |
| 2 | **NextAdmin Dashboard** | Next.js Analytics & KPI Dashboard | [02_nextadmin_dashboard.md](file:///f:/sites/SUPERAPP/SIPTUULTRA/competitor_analysis/02_nextadmin_dashboard.md) |
| 3 | **NextAdmin Tables Page** | Top Channels & Data Table | [03_nextadmin_tables.md](file:///f:/sites/SUPERAPP/SIPTUULTRA/competitor_analysis/03_nextadmin_tables.md) |
| 4 | **Berry Dashboard (Default)** | Material-UI Rich Gradient Hero Overview | [04_berry_default_dashboard.md](file:///f:/sites/SUPERAPP/SIPTUULTRA/competitor_analysis/04_berry_default_dashboard.md) |
| 5 | **Berry Dashboard (CRM)** | Multi-tinted Metrics & Sales Performance | [05_berry_crm_dashboard.md](file:///f:/sites/SUPERAPP/SIPTUULTRA/competitor_analysis/05_berry_crm_dashboard.md) |
| 6 | **Sintesis Pola & Prinsip Umum** | **Benang Merah, Pattern & Tipografi Antar Kompetitor** | [06_common_design_threads_and_patterns.md](file:///f:/sites/SUPERAPP/SIPTUULTRA/competitor_analysis/06_common_design_threads_and_patterns.md) |
| 7 | **Berry Dashboard (Chart & Widget)** | Multi-Spline Sales & Mini Sparklines | [07_berry_chart_widget_dashboard.md](file:///f:/sites/SUPERAPP/SIPTUULTRA/competitor_analysis/07_berry_chart_widget_dashboard.md) |
| 8 | **SAKTI Kemenkeu (Perintah Bayar)** | Tabel & Filter Multi-Field Keuangan | [08_sakti_mencatat_perintah_bayar.md](file:///f:/sites/SUPERAPP/SIPTUULTRA/competitor_analysis/08_sakti_mencatat_perintah_bayar.md) |
| 9 | **SAKTI Kemenkeu (Catat/Ubah SPP)** | Form Multi-Section Kompleks 5+ Fieldsets | [09_sakti_catat_ubah_spp.md](file:///f:/sites/SUPERAPP/SIPTUULTRA/competitor_analysis/09_sakti_catat_ubah_spp.md) |
| 10 | **SAKTI Kemenkeu (Modal COA)** | Modal Dialog Dual-Layout (Table + Form Entry) | [10_sakti_pendetailan_coa_modal.md](file:///f:/sites/SUPERAPP/SIPTUULTRA/competitor_analysis/10_sakti_pendetailan_coa_modal.md) |

---

## 🎯 Rangkuman Ringkas Sintesis Pola Desain (Design Comparison Benchmark)

### 1. Spasi & Padding (Spacing Architecture)
- **Grid Gaps**: Berkisar antara `16px` hingga `24px` di seluruh kompetitor.
- **Inner Card Padding**: Konsisten pada `18px` – `24px`.
- **Row Density**: Tinggi baris tabel antara `52px` – `64px` (untuk dashboard publik) dan `38px` – `44px` (untuk tabel sistem keuangan padat seperti SAKTI).

### 2. Penggunaan Warna (Color Usage)
- Latar belakang aplikasi (*Canvas*) konsisten menggunakan warna off-white/gray lembut (`#f8fafc` / `#f1f5f9`).
- Permukaan kartu (*Card Surface*) menggunakan putih murni (`#ffffff`) untuk kontras layer tinggi.
- Warna semantik (Hijau untuk *Growth/Revenue*, Merah untuk *Drop/Keluar*, Ungu/Indigo/Royal Blue untuk *Primary Brand Accent*).

### 3. Tipografi (Typography)
- Menggunakan Font Family modern sans-serif: `Inter`, `Plus Jakarta Sans`, `Roboto`, `Segoe UI`.
- Judul Seksi / Card Header: `14px` – `16px` Bold.
- Angka KPI Utama: `22px` – `28px` ExtraBold.
- Header Tabel: `10px` – `11px` Uppercase dengan penjarangan huruf (*letter-spacing* `0.05em` – `0.08em`).

### 4. Sudut Lengkung (Border Radius) & Modal System
- Seluruh kompetitor menggunakan *Border Radius* modern: **`16px` hingga `20px`** pada kartu dan modal dialog.
- Input pencarian & Tombol Navigasi: **`8px` hingga Pill-shaped (`100px`)**.
- Modal dialog pada aplikasi keuangan kompleks menggabungkan pratinjau tabel mini (bagian atas) dan bidang entri form (bagian bawah) untuk mencegah perpindahan halaman yang tidak perlu (*Context Switch*).
