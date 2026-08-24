---
name: ui-ux-design-system
description: Standards, tokens, and blueprints for Modern Minimalist Enterprise UI/UX for SIPTU ULTRA (inspired by Microsoft Azure Portal, Linear Clean Density, and GitHub Minimalist Status Indicators).
---

# SIPTU ULTRA — Modern Minimalist Enterprise UI/UX Design System

This skill documents the exact design system patterns, CSS tokens, layout blueprints, navigation conventions, typography standards, and toolbar filter architectures for all frontend development across **SIPTU ULTRA**.

---

## 🏛️ 1. Core Design Philosophy: Quiet, Modern Minimalist Enterprise

The UI/UX across SIPTU ULTRA is built upon the principles of **clarity, restraint, high productivity, and quiet elegance** (benchmarked against **Microsoft Azure Portal**, **Linear**, and **GitHub Enterprise**):

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [TOP NAVBAR & HORIZONTAL TABS]  (Sticky Frosted Glass, Backdrop-filter: blur(12px))    │
│ [<- Kembali] SIMKEU ULTRA  |  [LPJ]  [Permintaan Panjar]  [Invoice]  [Pejabat]         │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│ [FULL-WIDTH 100% PRODUCTIVITY CANVAS]  (No cramped secondary sidebars)                 │
│                                                                                        │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Toolbar & Filters (Surat Tugas Standard):                                          │ │
│ │ [Cari data...]  [Range Tanggal 📅]  [Status ∨]  [Reset ⟲]  [Segarkan 🔄]  (X data)  │ │
│ ├────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ Clean Data Table Workspace:                                                        │ │
│ │ • Status: Dot Indicator + Sentence Case text (e.g., "● LPJ Selesai", "● Belum dibuat")│
│ │ • NO bulky colorful pill badges (no background color fills, no border-radius: 100px) │ │
│ │ • Monochromatic hairline borders (#e2e8f0 / #f1f5f9)                               │ │
│ │ • Disciplined typography (12.5px - 13px body text)                                 │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔍 2. Toolbar & Filter Architecture (Surat Tugas Benchmark)

Every operational module (Surat Tugas, LPJ, Permintaan Panjar, Invoice, Aset, etc.) MUST adopt the **Surat Tugas Filter Layout**:

### Component Structure:
1. **Search Input**:
   - `Input` with `<SearchOutlined style={{ color: "#94a3b8" }} />` and `allowClear`.
   - Debounced search (300ms - 400ms).
2. **Date Range Filter (Popover)**:
   - `<Popover trigger="click">` wrapping a button labeled `${start} - ${end}` or `"Range Tanggal"`.
   - Popover content contains `<DatePicker.RangePicker format="DD/MM/YYYY" />` with `Clear` and `Terapkan` buttons.
3. **Dropdown Filters (Status / TA / Kategori)**:
   - `<Dropdown menu={{ items, selectedKeys }}>` wrapping a button with `<DownOutlined style={{ fontSize: 10, marginLeft: 4 }} />`.
   - Text shows current selection: `"Status: Semua"`, `"Status: Selesai"`, `"TA: 2026"`.
4. **Action Tools on the Right**:
   - `<Button icon={<FilterOutlined />} onClick={handleResetFilter}>Reset</Button>`
   - `<Tooltip title="Segarkan Data"><Button icon={<ReloadOutlined />} onClick={fetchData} /></Tooltip>`
   - `<Text type="secondary" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{count} data</Text>`
   - Optional Primary CTA (e.g. `+ Tambah Data`).

### JSX Blueprint:
```jsx
<Card
  variant="borderless"
  style={{ borderRadius: 8 }}
  styles={{ body: { padding: "12px 16px" } }}
  className="module-toolbar-card"
>
  <Row gutter={[10, 10]} align="middle">
    {/* Search */}
    <Col xs={24} sm={12} md={7} lg={6}>
      <Input
        placeholder="Cari nomor, pegawai, MAK..."
        prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        allowClear
      />
    </Col>

    {/* Date Range Popover */}
    <Col xs={24} sm={12} md={6} lg={5}>
      <Popover
        trigger="click"
        open={datePopoverOpen}
        onOpenChange={setDatePopoverOpen}
        placement="bottomLeft"
        content={
          <Space direction="vertical" size={10} style={{ padding: 4 }}>
            <Text strong style={{ fontSize: 12 }}>Pilih Range Tanggal</Text>
            <DatePicker.RangePicker format="DD/MM/YYYY" value={dateRange} onChange={setDateRange} allowClear />
            <Space style={{ justifyContent: "flex-end", width: "100%" }}>
              <Button size="small" onClick={() => { setDateRange(null); setDatePopoverOpen(false); }}>Clear</Button>
              <Button size="small" type="primary" onClick={() => setDatePopoverOpen(false)}>Terapkan</Button>
            </Space>
          </Space>
        }
      >
        <Button icon={<CalendarOutlined />} style={{ width: "100%" }}>
          {dateRange && dateRange[0] && dateRange[1]
            ? `${dateRange[0].format("DD/MM/YY")} - ${dateRange[1].format("DD/MM/YY")}`
            : "Range Tanggal"}
        </Button>
      </Popover>
    </Col>

    {/* Status Dropdown */}
    <Col xs={24} sm={12} md={5} lg={4}>
      <Dropdown
        menu={{
          items: [
            { key: "ALL", label: "Semua Status", onClick: () => setStatusFilter("ALL") },
            { key: "DRAFT", label: "Draft", onClick: () => setStatusFilter("DRAFT") },
            { key: "FINAL", label: "Selesai", onClick: () => setStatusFilter("FINAL") },
          ],
          selectedKeys: [statusFilter],
        }}
        trigger={["click"]}
      >
        <Button style={{ width: "100%" }}>
          {statusFilter === "ALL" ? "Status: Semua" : `Status: ${statusFilter}`}
          <DownOutlined style={{ fontSize: 10, marginLeft: 4 }} />
        </Button>
      </Dropdown>
    </Col>

    {/* Right Action Tools */}
    <Col xs={24} sm={12} md={6} lg={9} style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
      <Button icon={<FilterOutlined />} onClick={handleResetFilter}>Reset</Button>
      <Tooltip title="Segarkan Data"><Button icon={<ReloadOutlined />} onClick={fetchData} /></Tooltip>
      <Text type="secondary" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{data.length} data</Text>
      {/* Optional CTA */}
      <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>+ Tambah Data</Button>
    </Col>
  </Row>
</Card>
```

---

## 🎨 3. Status Indicator Component Blueprint

- **WAJIB**: Setiap tulisan/status yang sebelumnya menggunakan background berwarna (warna-warni) kini **DITULIS TANPA BACKGROUND FILL**.
- Gunakan indikator titik halus 6px (*dot indicator*) dengan teks *Title Case* yang tenang:
  - `● LPJ Selesai` / `● Disetujui` (Titik hijau `#10b981` + teks slate netral `#334155`)
  - `● Belum Dibuat` / `● Menunggu` (Titik abu-abu `#94a3b8` + teks slate netral `#475569`)
  - `● Draft` (Titik amber `#f59e0b` + teks slate netral `#334155`)
  - `● LPJ Manual` / `● Diajukan` (Titik biru `#0284c7` + teks slate netral `#334155`)
  - `● Ditolak` / `● Batal` (Titik merah `#ef4444` + teks slate netral `#334155`)

```jsx
{/* Standard Status Indicator Component */}
<div className="status-indicator">
  <span className={`status-dot ${statusKey}`} />
  <span className="status-text">{statusLabel}</span>
</div>
```

```css
/* Minimalist Status Indicator CSS (No Background Fills) */
.status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #334155;
  white-space: nowrap;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.final,
.status-dot.approved,
.status-dot.paid,
.status-dot.success {
  background-color: #10b981;
}

.status-dot.draft,
.status-dot.warning {
  background-color: #f59e0b;
}

.status-dot.belum,
.status-dot.neutral {
  background-color: #94a3b8;
}

.status-dot.manual,
.status-dot.submitted,
.status-dot.info {
  background-color: #0284c7;
}

.status-dot.rejected,
.status-dot.danger {
  background-color: #ef4444;
}

.status-text {
  font-size: 12px;
  font-weight: 500;
  color: #334155;
}
```

---

## 🎭 4. Modal Dialog Architecture
- **Surface & Radius**: Pure white `#ffffff`, `border-radius: 12px - 14px`, ambient shadow `0 20px 40px -10px rgba(15, 23, 42, 0.15)`.
- **Dimmed Frosted Backdrop**: `background: rgba(15, 23, 42, 0.45); backdrop-filter: blur(6px)`.
- **Close Button**: Simple square/rounded button (`28px`, `border-radius: 6px`) on top-right.
- **Footer**: Cancel on left, Primary action (`Simpan`) on right in solid primary blue.
