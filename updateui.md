# 🎨 SIPTUULTRA — Update UI Besar-Besaran
> Terakhir diperbarui: 20 Mei 2026  
> Status: **✅ FASE 1 SELESAI — CSS Global & Core Components**

---

## Keputusan Final Design System

| Aspek | Keputusan |
|-------|-----------|
| Font Heading (H1–H5) | **Plus Jakarta Sans** (600, 700) |
| Font Body | **Inter** (400, 500, 600) |
| Landing Page | **Dihapus** — `/` langsung redirect ke `/login` |
| Navbar Gradient | **Dihapus total** |
| Dark Mode | Light only untuk sekarang |
| Scope | Seluruh halaman |

---

## 🔴 Masalah yang Ditemukan (18 isu)

### A. Tipografi
| # | Masalah | File | Detail |
|---|---------|------|--------|
| 1 | Font tidak konsisten | Semua file | `Login.css` pakai `Plus Jakarta Sans`, `index.css` pakai `Inter`, tidak ada standar global |
| 2 | Font size terlalu besar | `LandingPage.css` | `clamp(34px, 5vw, 48px)` untuk title hero |
| 3 | Font weight berlebihan | `App.css`, `NavbarMenu.css` | Banyak `font-weight: 800` |
| 4 | Tidak ada skala H1–H5 | Semua file | Tidak ada CSS variable tipografi |
| 5 | Title module terlalu dominan | `App.css` | `.module-title` 24px + weight 800 |
| 6 | Modal title terlalu besar | `App.css` | `.ant-modal-title` 18px weight 800 |

### B. Warna & Visual
| # | Masalah | File | Detail |
|---|---------|------|--------|
| 7 | Animated gradient navbar | `NavbarMenu.css` | Gradient 8s loop |
| 8 | Warna tidak kohesif | Semua | Landing `#1890ff`, Login `#4338ca`, Navbar `#4F46E5` |
| 9 | Warna terlalu mencolok | `LandingPage.css` | Gradients hijau-biru terlalu ramai |
| 10 | CTA section terlalu gelap | `LandingPage.css` | Gradient biru gelap berlebihan |
| 11 | Icon warna hardcode | `AppLayout.jsx` | Semua icon `color: "#2F6DA0"` |

### C. Animasi Berlebihan
| # | Masalah | File | Status |
|---|---------|------|--------|
| 12 | `navGradientShift` | `NavbarMenu.css` | ✅ Dihapus |
| 13 | `waveHand` | `MobileHeader.css` | ✅ Dihapus |
| 14 | `pwaFloatPulse` | `NavbarMenu.css` | ✅ Dihapus |
| 15 | `settingsRotate` | `NavbarMenu.css` | ✅ Dihapus |

### D. Layout & Struktur
| # | Masalah | File | Detail |
|---|---------|------|--------|
| 16 | Hero section tidak perlu | `LandingPage.css` | Tidak dipakai — routing langsung ke login |
| 17 | Spacing inkonsisten | `App.css` | Campuran `var()` dan hardcode pixel |
| 18 | `!important` berlebihan | `App.css` | 30+ instances |

---

## ✅ Status Perbaikan Per File

### 1. `src/index.css` ✅ SELESAI
- [x] Import **Plus Jakarta Sans** + **Inter** via Google Fonts
- [x] `--ff-heading` + `--ff-body` font family variables
- [x] Skala font `--fs-h1` (26px) s.d. `--fs-overline` (11px)
- [x] Palet warna Slate + Indigo (`--color-text: #1a1f2e`, dll)
- [x] Utility classes `.text-h1` s.d. `.text-muted`
- [x] Responsive override mobile

### 2. `src/App.css` ✅ SELESAI
- [x] Hapus semua `font-weight: 800` → ganti `700`/`600`
- [x] `.module-title` → `var(--fs-h1)` + `var(--ff-heading)` + weight 700
- [x] `.module-subtitle` → `var(--fs-sm)` + weight 400
- [x] `.card-title` → `var(--fs-h3)` + weight 600
- [x] `.stat-card` content → `var(--fs-h2)` (20px)
- [x] `.ant-modal-title` → `var(--fs-h3)` + weight 600
- [x] `.ant-drawer-title` → `var(--ff-heading)` + weight 600
- [x] Normalisasi Ant Design Typography h1–h5
- [x] Standarisasi spacing ke `var(--space-*)`
- [x] Kurangi `!important` secukupnya

### 3. `src/components/NavbarMenu.css` ✅ SELESAI
- [x] Hapus `navGradientShift` animation
- [x] Hapus `settingsRotate` animation
- [x] Hapus `pwaFloatPulse` animation
- [x] Navbar background → solid `var(--color-bg)` (white)
- [x] User role → `color: var(--color-primary)` (hapus gradient text)
- [x] Nav link → `var(--ff-body)` + `var(--fs-h5)` + weight 500
- [x] Mobile drawer → `var(--ff-body)` + `var(--fs-body)`
- [x] PWA button → static shadow, no pulse

### 4. `src/components/MobileHeader.css` ✅ SELESAI
- [x] Hapus `waveHand` animation
- [x] Hapus gradient accent line bawah header
- [x] `.mobile-header-name` → `var(--ff-heading)` + `var(--fs-h4)` + weight 600
- [x] `.mobile-header-position` → `var(--fs-overline)` + uppercase
- [x] Background → solid `var(--color-bg)`

### 5. `src/pages/Login.css` ✅ SELESAI
- [x] Hapus `@import Plus Jakarta Sans`
- [x] Hapus `:root` lokal
- [x] `.login-form-header h2` → `var(--ff-heading)` + `var(--fs-h2)` + weight 700
- [x] Semua font-size → `var(--fs-*)`
- [x] Semua warna → `var(--color-*)`
- [x] Background → `var(--color-bg-subtle)`

### 6. `src/pages/LandingPage.css` — Tidak Perlu
- Landing page tidak dipakai di routing (`/` → langsung `/login`)
- File dibiarkan (tidak dihapus untuk jaga-jaga)

---

## 🎨 Design System Baru (Ringkasan)

### Font
```
Heading (H1–H5):   Plus Jakarta Sans — 600, 700
Body & UI:         Inter — 400, 500, 600
```

### Skala Font
```
H1 (Page Title)   → 26px / 700 / Plus Jakarta Sans
H2 (Section)      → 20px / 700 / Plus Jakarta Sans
H3 (Card/Modal)   → 17px / 600 / Plus Jakarta Sans
H4 (Sub-section)  → 15px / 600 / Plus Jakarta Sans
H5 (Label/Badge)  → 13px / 600 / Plus Jakarta Sans
Body              → 14px / 400 / Inter
Body Small        → 13px / 400 / Inter
Caption           → 12px / 400 / Inter
Overline          → 11px / 600 / Inter — UPPERCASE
```

### Palet Warna
```
Text Primary      → #1a1f2e   (Slate dark)
Text Secondary    → #64748b   (Slate 500)
Text Muted        → #94a3b8   (Slate 400)
Background        → #ffffff
BG Subtle         → #f8fafc   (Slate 50)
BG Muted          → #f1f5f9   (Slate 100)
Border            → #e2e8f0   (Slate 200)
Primary           → #4F46E5   (Indigo 600)
Primary Hover     → #4338CA   (Indigo 700)
```

---

## 📤 File yang Perlu Diupload ke Server

```
frontend/src/index.css
frontend/src/App.css
frontend/src/components/NavbarMenu.css
frontend/src/components/MobileHeader.css
frontend/src/pages/Login.css
```

---

## 📋 Sisa Pekerjaan (Next Steps)

- [ ] Update CSS halaman-halaman publik:
  - `PublicInventoryRequestPage.css`
  - `PublicQueueRegistration.css`
  - `PublicRoomSchedulePage.css`
  - `PublicExitPermitPage.css`
  - `PublicAssetLoanTrackingPage.css`
  - `PublicArchiveLoanInfoPage.css`
- [ ] Update `NotFound.css`
- [ ] Hapus/ganti hardcode icon color `#2F6DA0` di `AppLayout.jsx`
- [ ] Review individual view CSS files (`views/*.css`) jika ada
