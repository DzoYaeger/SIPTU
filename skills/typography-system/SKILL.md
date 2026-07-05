---
name: typography-system
description: >
  Skill untuk menjaga konsistensi sistem tipografi, skala font, warna, dan desain
  pada proyek SIPTUULTRA (React + Ant Design + Vite). Gunakan skill ini setiap kali
  membuat komponen baru, mengubah halaman, atau menambahkan CSS baru agar selalu
  selaras dengan design system yang telah ditetapkan.
---

# Typography System — SIPTUULTRA Design System v2

## Stack
- **Framework**: React 18 + Vite
- **UI Library**: Ant Design 5.x
- **CSS**: Vanilla CSS (Custom Properties) + Tailwind (prefix `tw-`)
- **Font Heading**: `Plus Jakarta Sans` (weight 600, 700) — untuk semua H1–H5
- **Font Body**: `Inter` (weight 400, 500, 600) — untuk semua body text, label, UI
- **Ikon**: `@ant-design/icons`

---

## 1. Font Import (HANYA di `index.css` — JANGAN di file lain)

```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700&family=Inter:wght@400;500;600&display=swap');
```

**ATURAN KETAT:**
- ❌ Jangan `@import` font apapun di luar `index.css`
- ❌ Jangan deklarasi `:root` lokal di file CSS halaman
- ✅ Selalu gunakan `font-family: var(--ff-heading)` atau `var(--ff-body)`

---

## 2. Font Family Variables

```css
--ff-heading: "Plus Jakarta Sans", "Segoe UI", sans-serif;
--ff-body:    "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
```

### Kapan Gunakan Masing-masing:

| `var(--ff-heading)` — Plus Jakarta Sans | `var(--ff-body)` — Inter |
|----------------------------------------|--------------------------|
| H1 — Judul halaman utama               | Body text / paragraf     |
| H2 — Section title                     | Label form               |
| H3 — Card title, modal title           | Tabel (header & cell)    |
| H4 — Sub-section, drawer title         | Button text              |
| H5 — Badge, label kecil                | Helper text, metadata    |
| `.module-title`                        | `.module-subtitle`       |
| `.card-title`                          | `.card-description`      |
| Nama user di navbar                    | Role badge text          |

---

## 3. Skala Tipografi (H1 – Overline)

| CSS Variable     | Ukuran | Weight | Font Family     | Digunakan untuk                        |
|------------------|--------|--------|-----------------|----------------------------------------|
| `--fs-h1`        | 26px   | 700    | ff-heading      | Judul halaman utama (satu per halaman) |
| `--fs-h2`        | 20px   | 700    | ff-heading      | Section title, statistic numbers       |
| `--fs-h3`        | 17px   | 600    | ff-heading      | Card title, modal title, drawer title  |
| `--fs-h4`        | 15px   | 600    | ff-heading      | Sub-section, nama user mobile header   |
| `--fs-h5`        | 13px   | 600    | ff-heading      | Label form, badge text, nav link       |
| `--fs-body`      | 14px   | 400    | ff-body         | Konten paragraf, tabel cell, input     |
| `--fs-sm`        | 13px   | 400    | ff-body         | Helper text, secondary description     |
| `--fs-xs`        | 12px   | 400    | ff-body         | Metadata, timestamp, caption           |
| `--fs-overline`  | 11px   | 600    | ff-body (UPPER) | Tabel header, role badge, label kecil  |

### Responsive Override (otomatis dari `:root`)
```
Mobile (≤768px): H1→22px, H2→18px, H3→16px
Small (≤480px):  H1→20px, H2→16px, H3→15px
```

---

## 4. Palet Warna Design System

```css
/* Text */
--color-text:           #1a1f2e;   /* Slate dark — teks utama */
--color-text-secondary: #64748b;   /* Slate 500 — teks sekunder */
--color-text-muted:     #94a3b8;   /* Slate 400 — placeholder, metadata */

/* Background */
--color-bg:             #ffffff;   /* Putih */
--color-bg-subtle:      #f8fafc;   /* Slate 50 — background halaman */
--color-bg-muted:       #f1f5f9;   /* Slate 100 — input, action area */
--color-bg-accent:      #eef2ff;   /* Indigo 50 — active/selected state */

/* Primary */
--color-primary:        #4F46E5;   /* Indigo 600 */
--color-primary-hover:  #4338CA;   /* Indigo 700 */
--color-primary-light:  #EEF2FF;   /* Indigo 50 */
--color-primary-ring:   rgba(79, 70, 229, 0.15);

/* Border */
--color-border:         #e2e8f0;   /* Slate 200 — border utama */
--color-border-light:   #f1f5f9;   /* Slate 100 — border sangat subtle */

/* Status */
--color-success:  #10B981;
--color-warning:  #F59E0B;
--color-danger:   #EF4444;
--color-info:     #3B82F6;
```

### Aturan Penggunaan Warna
- **Primary**: hanya untuk tombol utama, active nav, focus ring, link
- **Background halaman**: selalu `var(--color-bg-subtle)`, bukan putih (#ffffff)
- **Border**: gunakan `var(--color-border)`, jangan hardcode hex
- **Gradient**: HANYA boleh di avatar dan tombol CTA — bukan dekorasi

---

## 5. Utility Classes (Tersedia Global)

```html
<!-- Typography -->
<h1 class="text-h1">Judul Halaman</h1>
<h2 class="text-h2">Section Title</h2>
<span class="text-overline">LABEL UPPERCASE</span>
<p class="text-sm text-secondary">Deskripsi tambahan</p>

<!-- Color helpers -->
<span class="text-primary">Indigo text</span>
<span class="text-muted">Gray text ringan</span>
<span class="text-danger">Error text</span>
```

---

## 6. Aturan Animasi

| Jenis           | Status  | Durasi Max | Contoh                     |
|-----------------|---------|------------|----------------------------|
| Fade-in load    | ✅ Boleh | 200ms      | `.module-section` enter    |
| Hover shadow    | ✅ Boleh | 150ms      | Card, button hover         |
| Slide-up modal  | ✅ Boleh | 250ms      | Modal/drawer masuk         |
| Hover scale     | ✅ Boleh | 150ms      | max `scale(1.02)`          |
| Gradient loop   | ❌ Hapus | —          | `navGradientShift` (sudah dihapus) |
| Pulse loop      | ❌ Hapus | —          | `pwaFloatPulse` (sudah dihapus)    |
| Rotate loop     | ❌ Hapus | —          | `settingsRotate` (sudah dihapus)   |
| Wave loop       | ❌ Hapus | —          | `waveHand` (sudah dihapus)         |

---

## 7. Anti-Pattern yang WAJIB Dihindari

```css
/* ❌ JANGAN */
@import url('...Plus Jakarta Sans...');  /* di file selain index.css */
:root { --primary: #xxx; }               /* :root lokal di file halaman */
font-size: clamp(34px, 5vw, 48px);      /* terlalu besar untuk internal app */
font-weight: 800;                         /* terlalu berat — max 700 */
animation: sesuatu infinite;             /* loop animasi dekoratif */
color: #1890ff;                           /* warna AntD hardcode */
color: #2F6DA0;                           /* warna icon hardcode lama */
font-family: 'Plus Jakarta Sans', ...;  /* tanpa var() */

/* ✅ GUNAKAN */
font-family: var(--ff-heading);
font-family: var(--ff-body);
font-size: var(--fs-h1);
font-weight: 700;  /* atau 600 untuk H3+ */
color: var(--color-primary);
background: var(--color-bg-subtle);
transition: box-shadow 150ms var(--ease-out);
```

---

## 8. Checklist Sebelum Menulis CSS Baru

- [ ] Tidak ada `@import` font di luar `index.css`?
- [ ] Tidak ada `:root` lokal di file CSS ini?
- [ ] Ukuran font menggunakan `var(--fs-*)`, bukan hardcode px?
- [ ] Heading menggunakan `font-family: var(--ff-heading)`?
- [ ] Font weight tidak lebih dari `700`?
- [ ] Warna menggunakan `var(--color-*)`, bukan hex langsung?
- [ ] Tidak ada animasi loop (infinite) untuk dekorasi?
- [ ] Sudah dicek responsif di 768px dan 480px?

---

## 9. File Utama Design System

| File | Peran |
|------|-------|
| `src/index.css` | `:root` variables, font import, global helpers, utility classes |
| `src/App.css` | Component patterns: card, table, form, Ant Design overrides |
| `src/components/NavbarMenu.css` | Desktop navbar + mobile drawer |
| `src/components/MobileHeader.css` | Mobile top header bar |
| `src/pages/Login.css` | Halaman login standalone (tanpa app layout) |
