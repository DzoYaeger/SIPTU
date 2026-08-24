# AGENTS.md - System Design Rules & Guidelines for SIPTU ULTRA

These rules take precedence for all UI/UX frontend development, layout creation, component styling, form design, modal dialogs, and design enhancements across SIPTU ULTRA (specifically **Layanan Mandiri** and modular service pages like SIMKEU, BMN, Rispeg, Kearsipan).

---

## 🏛️ SIPTU ULTRA Modern Minimalist Enterprise Core
Every web application and screen in SIPTU ULTRA must embody:

1. **Status & Tag Indicators: Clean Dot + Sentence Case Text (No Background Color Fills)**:
   - **WAJIB**: Setiap tulisan/status yang sebelumnya menggunakan background berwarna (warna-warni) kini **DITULIS TANPA BACKGROUND FILL**.
   - Gunakan indikator titik halus 6px (*dot indicator*) dengan teks *Title Case* yang tenang:
     - `● LPJ Selesai` / `● Disetujui` (Titik hijau `#10b981` + teks slate netral `#334155`)
     - `● Belum Dibuat` / `● Menunggu` (Titik abu-abu `#94a3b8` + teks slate netral `#475569`)
     - `● Draft` (Titik amber `#f59e0b` + teks slate netral `#334155`)
     - `● LPJ Manual` / `● Diajukan` (Titik biru `#0284c7` + teks slate netral `#334155`)
     - `● Ditolak` / `● Batal` (Titik merah `#ef4444` + teks slate netral `#334155`)
   - **TIDAK BOLEH**: Menggunakan badge pil tebal (`border-radius: 100px`), huruf kapital semua (`LPJ FINAL`, `BELUM DIBUAT`), atau background warna tebal yang membuat tampilan ramai.
   - Jika memerlukan border untuk pengelompokan (seperti MAK / Tahun Anggaran / Kategori), gunakan border netral tipis 1px (`border: 1px solid #e2e8f0; border-radius: 4px; background: transparent;`).

2. **Toolbar & Filter Standards (Surat Tugas Benchmark)**:
   - Semua modul operasional WAJIB menggunakan format Toolbar & Filter standar **Surat Tugas**:
     - `Input` Pencarian dengan `SearchOutlined` & `allowClear`.
     - Popover Range Tanggal dengan tombol preview `${start} - ${end}` dan aksi `Clear` / `Terapkan`.
     - Dropdown Status / TA dengan `DownOutlined`.
     - Tombol aksi `Reset` (`FilterOutlined`), `Segarkan` (`ReloadOutlined`), dan Counter ringkas `{count} data`.

3. **Restraint & Color Discipline (No "Warna-Warni Heboh")**:
   - Clean neutral canvas (`#f8fafc` atau `#f9fafb`) dengan pure white surfaces (`#ffffff`) dan crisp hairline borders (`#e2e8f0` / `#f1f5f9`).
   - Single disciplined brand accent (`#0F5B99` / `#0078d4`).
   - Semantic colors are restricted strictly to small 6px status dots and net financial numbers.

4. **Top Navbar Header Navigation (No Cramped Secondary Sidebars)**:
   - Module navigation lives directly in the **Top Command Bar / Navbar** via horizontal tabs.
   - The workspace gets **100% full-width canvas breathing room** for tables, calculation sheets, and forms.

5. **No Decorative Info Cards in Operational Modules**:
   - In operational modules (LPJ, Panjar, Invoice, Aset), avoid decorative loud KPI cards or large colorful banner blocks. Direct the user straight to the data workspace.

6. **Standard, Non-Exaggerated Typography (Microsoft Azure & Linear Benchmark)**:
   - Page/Module Titles: `15px - 16px` (`font-weight: 700`), calm slate `#0f172a`.
   - Section Titles: `13px - 14px` (`font-weight: 600`), `#0f172a`.
   - Table & Body Text: `12.5px - 13px` (`font-weight: 400` / `500`), clean line-height `1.4 - 1.5`.
   - Muted Captions: `11px - 11.5px` (`font-weight: 500`), `#64748b`.
   - Table Headers (Overline): `10.5px - 11px` ALL UPPERCASE (`font-weight: 700`, `letter-spacing: 0.5px`, `#64748b`).

---

## 📐 Layout & Spacing Standards
- **Canvas Background**: Always use neutral off-white / slate tint (`#f8fafc` or `#f9fafb`).
- **Surface Cards**: Container cards MUST use pure white (`#ffffff`) with subtle 1px border (`#e2e8f0`) and soft ambient shadow (`0 1px 3px rgba(15, 23, 42, 0.03)`).
- **Border Radius Standard**:
  - Main Cards / Modal Dialogs: `12px - 14px`.
  - Buttons / Filter Inputs / Tags: `6px - 8px` (NEVER 100px pill).
- **Table Density**:
  - Comfortable table row height: `42px - 48px`.
  - No vertical table borders; rely on horizontal row dividers (`1px solid #f1f5f9`).

---

## 🎭 Modal Dialog Architecture
- **Modal Surface & Radius**: Pure white `#ffffff`, `border-radius: 12px - 14px`, ambient shadow `0 20px 40px -10px rgba(15, 23, 42, 0.15)`.
- **Dimmed Frosted Backdrop**: `background: rgba(15, 23, 42, 0.45); backdrop-filter: blur(6px)`.
- **Entrance Animation**: `animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)`.
- **Close Button**: Unobtrusive square/rounded close button (`28px`, `border-radius: 6px`) on top-right.
- **Footer Hierarchy**: Cancel on left, Primary action (`Simpan`) on right in solid primary blue.

---

## ⚡ Transitions & Motion Standards
- **Spring Curve Standard**: Always use `cubic-bezier(0.16, 1, 0.3, 1)` with snappy duration `0.15s - 0.2s`.
- **Button Feedback**: Subtle elevation `translateY(-1px)` on hover, `scale(0.98)` on click.
- **Focus Rings**: Subtle glowing ring on focus (`box-shadow: 0 0 0 3px rgba(0, 120, 212, 0.12)`).

---

## 🔒 Security-by-Design Standards
- **Biometric Authentication**: Require biometric lock (Fingerprint / FaceID) on mobile application resume when idle > 30 seconds.
- **Encrypted Storage**: NEVER store JWT Tokens or sensitive credentials in unencrypted storage; use secure vault/keychain.
- **Anti-Screenshot Flag**: Enforce `FLAG_SECURE` on sensitive document screens.
- **Auto-Lock Timeout**: Automatically lock after inactivity.
- **Sensitive Data Masking**: Mask employee NIP, phone numbers, and TTE tokens with toggle visibility.
