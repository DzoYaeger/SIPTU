---
name: siptu-typography
description: Standar tipografi SIPTU ULTRA untuk pembuatan dan pengubahan modul frontend. Menjamin konsistensi font, ukuran font, dan kelas elemen di seluruh aplikasi.
---

# Standar Tipografi SIPTU ULTRA

Gunakan panduan ini ketika membuat modul baru atau mengubah tampilan halaman pada frontend SIPTU ULTRA.

## 1. Desain Tokens & Variabel CSS

Seluruh komponen harus mengacu pada token desain di `index.css` dan `App.css`:

```css
--ff-heading: "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", Arial, sans-serif;
--ff-body:    "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", Arial, sans-serif;

--fs-h1:       22px; /* Title H1 */
--fs-h2:       18px; /* Title H2 */
--fs-h3:       15px; /* Modal Title, Card Head */
--fs-h4:       13px; /* Module Title (h4.module-title) */
--fs-h5:       12px; /* Label / Badge */
--fs-body:     13px; /* Body Text */
--fs-sm:       12px; /* Helper text, Table cells */
--fs-xs:       11px; /* Subtext, NIP, Metadata */
--fs-overline: 11px; /* Table headers (uppercase, tracking 0.05em) */
```

## 2. Struktur Header Modul (Toolbar)

Setiap halaman modul wajib menggunakan struktur `module-section` dan `module-toolbar` dengan `Title level={4}`:

```jsx
<div className="module-section">
  <div className="module-toolbar">
    <div>
      <Typography.Title level={4} className="module-title">
        Nama Modul
      </Typography.Title>
      <Typography.Text className="module-subtitle">
        Deskripsi singkat fungsi dan tujuan modul.
      </Typography.Text>
    </div>
    <Space>
      {/* Action buttons (Tambah, Filter, Segarkan) */}
    </Space>
  </div>

  {/* Konten Utama (Tabel / Card / Stats) */}
</div>
```

## 3. Tabel & Column Typography

1. **Header Tabel**: Otomatis uppercase 11px, font-weight 600, warna `var(--color-text-secondary)` dari CSS global (`.ant-table-thead`).
2. **Cell Text Umum**: 12px `var(--color-text)`.
3. **NIP / Kode Identifikasi**: Gunakan `<Typography.Text className="text-xs">{record.nip}</Typography.Text>` (11px).
4. **Kode MAK / Struktur APBN**: Gunakan `<Text code style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}>`.
5. **Nominal Mata Uang / Currency**: Gunakan `<Text strong style={{ color: '#0F5B99', fontSize: '12px', whiteSpace: 'nowrap' }}>`.

## 4. Stat Cards & Badge Status

- **Stat Card**: Gunakan `<StatisticCard>` atau `<Card size="small">` dengan `.ant-statistic-title` 12px dan `.ant-statistic-content` 15-18px bold.
- **Status Tag / Badge**:
  - Gunakan `Tag` tanpa icon atau dengan icon minimal.
  - Font size: 10px - 11px, font-weight: 600, border-radius: 4px / full.

## 5. Larangan & Aturan Penting

1. **DILARANG** meng-override `fontFamily` secara inline kecuali untuk tampilan monospace (contoh: NIP/ID rapat/log) atau dokumen cetak khusus (Times New Roman pada surat resmi).
2. **DILARANG** menggunakan `Typography.Title level={3}` atau `level={1}` untuk `module-title`. Gunakan `level={4}`.
3. Selalu manfaatkan CSS utility class (`.text-h1`, `.text-h2`, `.text-body`, `.text-sm`, `.text-xs`) daripada menulis inline `fontSize`.
