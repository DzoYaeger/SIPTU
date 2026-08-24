---
name: mobile-ui-ux-design-system
description: Standards and guidelines for designing elegant, modern, high-contrast, responsive Flutter Mobile UI/UX integrated with Security-by-Design principles for SIPTU ULTRA Mobile.
---

# Mobile UI/UX Design System & Security-by-Design Standards for SIPTU ULTRA (Flutter)

Dokumen ini berisi spesifikasi teknis mendalam (presisi ukuran, padding, tipografi, warna, komponen, dan micro-interactions) serta arsitektur **Security-by-Design** untuk pengembangan aplikasi mobile SIPTU ULTRA menggunakan **Flutter**. Semua agen dan developer WAJIB mematuhi spesifikasi ini agar UI/UX mobile konsisten, presisi, dan tampak sangat profesional (*state-of-the-art*).

---

## 📐 1. System Dimensions & Geometry Matrix

Semua komponen UI mobile menggunakan sistem grid berkelipatan **`4px / 8px`** untuk menjaga konsistensi irama visual.

| Parameter UI | Nilai Standar | Keterangan & Penggunaan |
|---|---|---|
| **Screen Margin Horizontal** | `16.0` (Mobile), `20.0` (Tablet) | Jarak tepi kiri/kanan seluruh layar dari edge HP |
| **Card Internal Padding** | `16.0` (Standard), `20.0` (Featured) | Padding dalam kartu informasi / widget |
| **Grid Gap (Antar Kartu)** | `12.0` (Dense), `16.0` (Standard) | Jarak spasi antar kartu dalam list / grid |
| **Section Spacing** | `20.0` hingga `24.0` | Jarak vertikal antar seksi halaman |
| **Element Vertical Spacing** | `8.0` (Tight), `12.0` (Normal) | Jarak antara judul dan deskripsi / antar field |
| **Main Card Radius** | `12.0` hingga `14.0` | Radius sudut kartu utama & widget dashboard |
| **Modal Bottom Sheet Radius** | `16.0` (Top-Left & Top-Right) | Radius sudut atas dialog bottom sheet |
| **Button & Input Radius** | `8.0` hingga `10.0` | Radius input form, dropdown, dan tombol |
| **Tag / Chip Radius** | `4.0` hingga `6.0` | Radius tag kategori & chip (TIDAK MENGGUNAKAN PILL 100px) |
| **Primary Button Height** | `48.0` hingga `52.0` | Tinggi standar tombol eksekusi utama (CTA) |
| **Filter / Secondary Button** | `36.0` hingga `40.0` | Tinggi tombol filter dan aksi sekunder |
| **Form Input Height** | `48.0` hingga `52.0` | Tinggi input teks, password, & select dropdown |
| **Input Content Padding** | `EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0)` | Spasi dalam field form |
| **Minimum Touch Target** | `48.0 x 48.0` | Ukuran minimal area sentuh tombol/ikon (Accessibility) |

---

## 🔤 2. Typography Hierarchy & Matrix

Tipografi menggunakan kombinasi **Plus Jakarta Sans** (Heading & Title) dan **Inter** (Body & Data) untuk keterbacaan optimal pada layar HP.

```dart
class AppTypography {
  // Page / App Bar Title
  static const TextStyle appBarTitle = TextStyle(
    fontFamily: 'PlusJakartaSans',
    fontSize: 16.0,
    fontWeight: FontWeight.w700,
    height: 1.2,
    letterSpacing: -0.2,
    color: Color(0xFF172033),
  );

  // Section Heading (H2)
  static const TextStyle sectionHeader = TextStyle(
    fontFamily: 'PlusJakartaSans',
    fontSize: 14.5,
    fontWeight: FontWeight.w700,
    height: 1.3,
    letterSpacing: -0.2,
    color: Color(0xFF172033),
  );

  // Card Title / Item Name (H3)
  static const TextStyle cardTitle = TextStyle(
    fontFamily: 'PlusJakartaSans',
    fontSize: 13.5,
    fontWeight: FontWeight.w600,
    height: 1.35,
    color: Color(0xFF172033),
  );

  // Body Text Standard
  static const TextStyle bodyText = TextStyle(
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: FontWeight.w400,
    height: 1.45,
    color: Color(0xFF334155),
  );

  // Body Text Bold / Form Label
  static const TextStyle formLabel = TextStyle(
    fontFamily: 'Inter',
    fontSize: 12.0,
    fontWeight: FontWeight.w600,
    height: 1.35,
    color: Color(0xFF334155),
  );

  // Caption / Subtitle Muted
  static const TextStyle caption = TextStyle(
    fontFamily: 'Inter',
    fontSize: 11.0,
    fontWeight: FontWeight.w400,
    height: 1.4,
    color: Color(0xFF64748B),
  );

  // Status Indicator Text (Clean Dot + Text)
  static const TextStyle statusText = TextStyle(
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: FontWeight.w500,
    color: Color(0xFF334155),
  );

  // Code / NIP / Token Monospace
  static const TextStyle codeText = TextStyle(
    fontFamily: 'Consolas',
    fontSize: 11.5,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.2,
    color: Color(0xFF0F5B99),
  );
}
```

---

## 🎨 3. Status Indicator (No Bulky Background Fills)

Status di mobile menggunakan format **Minimalist Dot Indicator**:
```dart
Widget buildStatusIndicator(String label, Color dotColor) {
  return Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Container(
        width: 6.0,
        height: 6.0,
        decoration: BoxDecoration(
          color: dotColor,
          shape: BoxShape.circle,
        ),
      ),
      const SizedBox(width: 6.0),
      Text(label, style: AppTypography.statusText),
    ],
  );
}
```

---

## 📱 4. Mobile Component Blueprints & Specs

### A. Curved Wave Header Component
- **Height**: `170.0` hingga `190.0`
- **Avatar Container**: Circle `46.0 x 46.0`, Border White `1.5`
- **Greeting**: 1 Kata Nama Depan (`"Selamat Pagi, Budi"`), `18.0 Bold White`
- **NIP Tag**: Background `Color(0x20FFFFFF)`, Border `1.0 White24`, Padding `horizontal: 8.0, vertical: 2.0`, Radius `4.0`, Text `10.5 SemiBold White`

### B. Floating Bottom Navigation Bar
- **Position**: Floating di atas bottom inset (`bottom: 12.0, left: 16.0, right: 16.0`)
- **Height**: `58.0`, Radius `16.0`
- **Background**: Pure White (`#FFFFFF`) dengan Border `1.0 #E2E8F0`
- **Tabs (4 Main Items)**: Icon `20.0`, Active Color `#0F5B99`, Inactive Color `#94A3B8`. Tab aktif memiliki dot indicator `4.0 x 4.0` di bawah ikon.

### C. Bottom Sheet Modal Architecture
- **Top Border Radius**: `16.0` (hanya sudut atas)
- **Top Handle Bar**: Container `width: 32.0, height: 4.0, radius: 4.0, color: Color(0xFFCBD5E1)`, Margin Top `8.0, Bottom: 14.0`
- **Header**: Title `15.0 Bold`, Subtitle `11.5 Muted`
- **Footer Sticky Action Bar**: Align Left (Batal/Tutup - Outline Gray), Align Right (Simpan/Proses - Solid Primary Blue)

---

## 🔒 5. Security-by-Design Technical Blueprint (Flutter)

Seluruh aplikasi Flutter SIPTU ULTRA WAJIB menerapkan 8 protokol keamanan:
1. **Biometric Authentication (`local_auth`)**
2. **Encrypted Secure Storage (`flutter_secure_storage`)**
3. **Anti-Screenshot Flag (`FLAG_SECURE`)**
4. **SSL Pinning & TLS Verification**
5. **Root / Jailbreak Detection (`flutter_jailbreak_detection`)**
6. **Auto-Lock Timeout (3 Menit Inaktivitas)**
7. **Sensitive Data Masking**
8. **Secure TTE QR Verification**
