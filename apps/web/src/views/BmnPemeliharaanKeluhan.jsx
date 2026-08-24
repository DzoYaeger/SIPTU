import { useCallback, useEffect, useMemo, useState } from "react";
import {
  App as AntdApp,
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Drawer,
  Dropdown,
  Empty,
  Form,
  Input,
  Modal,
  Popover,
  Radio,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FilterOutlined,
  LaptopOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SyncOutlined,
  ToolOutlined,
  UserOutlined,
  WhatsAppOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "../hooks/useAuth.js";
import useDebounce from "../hooks/useDebounce.js";
import "./BmnPemeliharaanKeluhan.css";

const { Title, Text, Paragraph } = Typography;

const STATUS_CONFIG = {
  new: {
    label: "Baru",
    dotClass: "new",
    hint: "Laporan baru diterima dan menunggu respon",
    icon: <FileTextOutlined style={{ color: "#f59e0b" }} />,
  },
  in_progress: {
    label: "Diproses",
    dotClass: "in_progress",
    hint: "Sedang ditangani oleh tim / teknisi",
    icon: <SyncOutlined style={{ color: "#0284c7" }} />,
  },
  completed: {
    label: "Selesai",
    dotClass: "completed",
    hint: "Laporan telah selesai ditindaklanjuti",
    icon: <CheckCircleOutlined style={{ color: "#10b981" }} />,
  },
  rejected: {
    label: "Ditolak",
    dotClass: "rejected",
    hint: "Laporan tidak dapat diproses / dibatalkan",
    icon: <CloseCircleOutlined style={{ color: "#ef4444" }} />,
  },
};

const STATUS_OPTIONS = [
  { value: "all", label: "Semua Status" },
  { value: "new", label: "Baru", dotClass: "new" },
  { value: "in_progress", label: "Diproses", dotClass: "in_progress" },
  { value: "completed", label: "Selesai", dotClass: "completed" },
  { value: "rejected", label: "Ditolak", dotClass: "rejected" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "Semua Jenis" },
  { value: "pemeliharaan", label: "Pemeliharaan" },
  { value: "keluhan", label: "Keluhan" },
];

export default function BmnPemeliharaanKeluhan() {
  const { apiFetch, currentRole, user } = useAuth();
  const { message, modal } = AntdApp.useApp();
  const [updateForm] = Form.useForm();
  const [createForm] = Form.useForm();

  // Data & List State
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Filters State (Surat Tugas Benchmark)
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [dateRange, setDateRange] = useState(null);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("all");

  // Drawers & Modals State
  const [selectedReport, setSelectedReport] = useState(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Assets list for Create Form
  const [assetsList, setAssetsList] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  const isAdminOrValidator = useMemo(() => {
    return (
      currentRole === "admin" ||
      currentRole === "validator" ||
      user?.base_role === "admin" ||
      user?.base_role === "validator"
    );
  }, [currentRole, user?.base_role]);

  // Fetch Reports
  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (!isAdminOrValidator || scopeFilter === "mine") {
        params.set("only_mine", "1");
      }
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("report_type", typeFilter);
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.set("start_date", dateRange[0].format("YYYY-MM-DD"));
        params.set("end_date", dateRange[1].format("YYYY-MM-DD"));
      }

      const res = await apiFetch(`/bmn-maintenance-reports?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "Gagal memuat laporan");
      setReports(Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []);
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, message, debouncedSearch, statusFilter, typeFilter, scopeFilter, dateRange, isAdminOrValidator]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Fetch Assets for create form when needed
  const fetchAssetsList = useCallback(async () => {
    if (assetsList.length > 0) return;
    setLoadingAssets(true);
    try {
      const res = await apiFetch("/public/bmn-assets");
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setAssetsList(data);
      }
    } catch (err) {
      console.error("Gagal memuat daftar aset:", err);
    } finally {
      setLoadingAssets(false);
    }
  }, [apiFetch, assetsList.length]);

  // Reset all filters
  const handleResetFilter = () => {
    setSearch("");
    setDateRange(null);
    setStatusFilter("all");
    setTypeFilter("all");
    setScopeFilter("all");
  };

  // Export PDF
  const exportToPdf = async () => {
    try {
      setPdfLoading(true);
      message.loading({ content: "Menyiapkan PDF...", key: "pdf_export" });

      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("report_type", typeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.set("start_date", dateRange[0].format("YYYY-MM-DD"));
        params.set("end_date", dateRange[1].format("YYYY-MM-DD"));
      }

      const res = await apiFetch(`/bmn-maintenance-reports/export-pdf?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal mengunduh laporan PDF");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Laporan_Pemeliharaan_BMN_${dayjs().format("YYYYMMDD_HHmmss")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      message.success({ content: "PDF berhasil diunduh.", key: "pdf_export" });
    } catch (error) {
      console.error("Export PDF error:", error);
      message.error({ content: "Gagal mengunduh file PDF.", key: "pdf_export" });
    } finally {
      setPdfLoading(false);
    }
  };

  // Open Detail Drawer
  const handleOpenDetail = (record) => {
    setSelectedReport(record);
    setDetailDrawerOpen(true);
  };

  // Open Update Modal
  const handleOpenUpdate = (record) => {
    setSelectedReport(record);
    updateForm.setFieldsValue({
      status: record.status,
      admin_notes: record.admin_notes ?? "",
    });
    setUpdateModalOpen(true);
  };

  // Submit Update Status
  const handleUpdateStatus = async (values) => {
    if (!selectedReport) return;
    setUpdating(true);
    try {
      const res = await apiFetch(`/bmn-maintenance-reports/${selectedReport.id}`, {
        method: "PUT",
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "Gagal memperbarui status");
      message.success("Status laporan berhasil diperbarui");
      setUpdateModalOpen(false);
      
      // Update selected report in drawer if open
      if (detailDrawerOpen && selectedReport.id === data.id) {
        setSelectedReport(data);
      } else {
        setSelectedReport(null);
      }
      fetchReports();
    } catch (error) {
      message.error(error.message);
    } finally {
      setUpdating(false);
    }
  };

  // Delete Report
  const handleDeleteReport = (record) => {
    modal.confirm({
      title: "Hapus Laporan BMN?",
      icon: <ExclamationCircleOutlined style={{ color: "#ef4444" }} />,
      content: (
        <div style={{ marginTop: 8, fontSize: 13, color: "#475569" }}>
          <p style={{ margin: "0 0 6px" }}>
            Apakah Anda yakin ingin menghapus laporan <strong>{record.report_number}</strong>?
          </p>
          {record.asset_name && (
            <p style={{ margin: "0 0 6px", fontSize: 12, color: "#64748b" }}>
              Aset: <strong>{record.asset_name}</strong>
            </p>
          )}
          <p style={{ margin: 0, fontSize: 11.5, color: "#94a3b8" }}>
            Tindakan ini bersifat permanen dan data laporan akan dihapus dari sistem.
          </p>
        </div>
      ),
      okText: "Hapus Laporan",
      okType: "danger",
      cancelText: "Batal",
      autoFocusButton: null,
      onOk: async () => {
        try {
          const res = await apiFetch(`/bmn-maintenance-reports/${record.id}`, {
            method: "DELETE",
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.message ?? "Gagal menghapus laporan");
          message.success("Laporan berhasil dihapus");

          if (detailDrawerOpen && selectedReport?.id === record.id) {
            setDetailDrawerOpen(false);
            setSelectedReport(null);
          }
          fetchReports();
        } catch (error) {
          message.error(error.message);
        }
      },
    });
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    createForm.resetFields();
    createForm.setFieldsValue({
      report_type: "pemeliharaan",
    });
    fetchAssetsList();
    setCreateModalOpen(true);
  };

  // Submit Create Report
  const handleCreateReport = async (values) => {
    setCreating(true);
    try {
      const payload = {
        report_type: values.report_type,
        asset_ids: values.report_type === "pemeliharaan" ? values.asset_ids : [],
        asset_id:
          values.report_type === "pemeliharaan" && values.asset_ids?.length
            ? values.asset_ids[0]
            : null,
        report_details: values.report_details,
      };

      const res = await apiFetch("/bmn-maintenance-reports", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "Gagal membuat laporan");

      message.success("Laporan BMN berhasil diajukan!");
      setCreateModalOpen(false);
      createForm.resetFields();
      fetchReports();
    } catch (error) {
      message.error(error.message);
    } finally {
      setCreating(false);
    }
  };

  // KPI Calculations
  const stats = useMemo(() => {
    return {
      total: reports.length,
      new: reports.filter((r) => r.status === "new").length,
      in_progress: reports.filter((r) => r.status === "in_progress").length,
      completed: reports.filter((r) => r.status === "completed").length,
      rejected: reports.filter((r) => r.status === "rejected").length,
    };
  }, [reports]);

  // Asset options for Select
  const assetOptions = useMemo(() => {
    return assetsList.map((a) => ({
      value: a.id,
      label: `${a.name || "-"} — Kode BMN: ${a.asset_code || "-"}`,
      searchLabel: `${a.name ?? ""} ${a.asset_code ?? ""} ${a.brand ?? ""} ${a.model ?? ""}`,
    }));
  }, [assetsList]);

  // Columns definition
  const columns = useMemo(
    () => [
      {
        title: "No. Laporan & Waktu",
        key: "report_identity",
        width: 190,
        render: (_, record) => (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: "#0f172a",
                cursor: "pointer",
              }}
              onClick={() => handleOpenDetail(record)}
            >
              {record.report_number || "-"}
            </span>
            <span style={{ fontSize: 11, color: "#64748b" }}>
              {record.created_at ? dayjs(record.created_at).format("DD/MM/YYYY HH:mm") : "-"}
            </span>
          </div>
        ),
      },
      {
        title: "Jenis",
        dataIndex: "report_type",
        key: "report_type",
        width: 140,
        render: (type) =>
          type === "pemeliharaan" ? (
            <span className="bmn-type-badge pemeliharaan">
              <ToolOutlined style={{ fontSize: 11 }} /> Pemeliharaan
            </span>
          ) : (
            <span className="bmn-type-badge keluhan">
              <ExclamationCircleOutlined style={{ fontSize: 11 }} /> Keluhan
            </span>
          ),
      },
      {
        title: "Aset BMN",
        key: "asset_info",
        width: 250,
        render: (_, record) => {
          const assets = Array.isArray(record.assets_data) && record.assets_data.length > 0
            ? record.assets_data
            : null;

          if (assets) {
            if (assets.length > 2) {
              const visibleAssets = assets.slice(0, 2);
              const remainingCount = assets.length - 2;

              const tooltipContent = (
                <div style={{ maxHeight: 220, overflowY: "auto", paddingRight: 4 }}>
                  <Text strong style={{ color: "#fff", fontSize: 11, display: "block", marginBottom: 4 }}>
                    Daftar Semua Aset ({assets.length} item):
                  </Text>
                  {assets.map((a, i) => (
                    <div key={i} style={{ fontSize: 11, marginBottom: 2, whiteSpace: "nowrap" }}>
                      • {a.name} {a.asset_code ? `(${a.asset_code})` : ""}
                    </div>
                  ))}
                </div>
              );

              return (
                <div className="bmn-asset-cell">
                  {visibleAssets.map((a, i) => (
                    <div key={i} className="bmn-asset-tag-item">
                      <span>{a.name}</span>
                      {a.asset_code && <span className="bmn-asset-code-sub">({a.asset_code})</span>}
                    </div>
                  ))}
                  <Tooltip title={tooltipContent} placement="topLeft">
                    <span className="bmn-asset-more-tag">
                      +{remainingCount} aset lainnya
                    </span>
                  </Tooltip>
                </div>
              );
            }

            return (
              <div className="bmn-asset-cell">
                {assets.map((a, i) => (
                  <div key={i} className="bmn-asset-tag-item">
                    <span>{a.name}</span>
                    {a.asset_code && <span className="bmn-asset-code-sub">({a.asset_code})</span>}
                  </div>
                ))}
              </div>
            );
          }

          return (
            <div className="bmn-asset-cell">
              <span className="bmn-asset-primary-name">{record.asset_name || "-"}</span>
              {record.asset?.asset_code && (
                <span className="bmn-asset-code-sub">Kode: {record.asset.asset_code}</span>
              )}
            </div>
          );
        },
      },
      {
        title: "Permasalahan / Keluhan",
        dataIndex: "report_details",
        key: "report_details",
        ellipsis: true,
        width: 240,
        render: (text, record) => (
          <Tooltip title={text} placement="topLeft">
            <div
              className="bmn-problem-cell"
              onClick={() => handleOpenDetail(record)}
            >
              {text || "-"}
            </div>
          </Tooltip>
        ),
      },
      {
        title: "Pelapor",
        key: "reporter_info",
        width: 190,
        render: (_, record) => (
          <div className="bmn-reporter-cell">
            <span className="bmn-reporter-name">{record.reporter_name || "-"}</span>
            <span className="bmn-reporter-nip">
              {record.reporter_nip ? `NIP. ${record.reporter_nip}` : (record.reporter_function || "-")}
            </span>
          </div>
        ),
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 130,
        render: (status) => {
          const cfg = STATUS_CONFIG[status] || {
            label: status || "Draft",
            dotClass: "neutral",
          };
          return (
            <div className="status-indicator">
              <span className={`status-dot ${cfg.dotClass}`} />
              <span className="status-text">{cfg.label}</span>
            </div>
          );
        },
      },
      {
        title: "Aksi",
        key: "action",
        width: 100,
        fixed: "right",
        align: "center",
        render: (_, record) => {
          const menuItems = [
            {
              key: "detail",
              label: "Lihat Detail",
              icon: <EyeOutlined style={{ color: "#0284c7" }} />,
              onClick: () => handleOpenDetail(record),
            },
            ...(isAdminOrValidator
              ? [
                  {
                    key: "update",
                    label: "Update Status",
                    icon: <EditOutlined style={{ color: "#0f172a" }} />,
                    onClick: () => handleOpenUpdate(record),
                  },
                ]
              : []),
            {
              type: "divider",
            },
            {
              key: "delete",
              label: "Hapus Laporan",
              danger: true,
              icon: <DeleteOutlined />,
              onClick: () => handleDeleteReport(record),
            },
          ];

          return (
            <Space size={4}>
              <Tooltip title="Lihat Detail">
                <button
                  type="button"
                  className="bmn-action-btn"
                  onClick={() => handleOpenDetail(record)}
                >
                  <EyeOutlined style={{ fontSize: 13 }} />
                </button>
              </Tooltip>
              <Dropdown menu={{ items: menuItems }} trigger={["click"]} placement="bottomRight">
                <button type="button" className="bmn-action-btn">
                  <MoreOutlined style={{ fontSize: 14 }} />
                </button>
              </Dropdown>
            </Space>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isAdminOrValidator],
  );

  return (
    <div className="bmn-maint-wrapper">
      {/* ── 1. Header Area ── */}
      <div className="bmn-maint-header">
        <div>
          <Title level={4} className="bmn-maint-title">
            Pemeliharaan & Keluhan BMN
          </Title>
          <span className="bmn-maint-subtitle">
            Kelola pengajuan perbaikan, tindak lanjut kerusakan, dan keluhan aset BMN.
          </span>
        </div>
      </div>

      {/* ── 2. KPI / Metrics Summary (Clickable to Filter) ── */}
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={8} md={4} lg={4} style={{ flex: "1 1 0" }}>
          <div
            className={`bmn-kpi-card ${statusFilter === "all" ? "active" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            <div className="bmn-kpi-header">
              <span className="bmn-kpi-label">
                <span className="status-dot neutral" /> Total
              </span>
            </div>
            <div className="bmn-kpi-value">{stats.total}</div>
          </div>
        </Col>

        <Col xs={12} sm={8} md={4} lg={4} style={{ flex: "1 1 0" }}>
          <div
            className={`bmn-kpi-card ${statusFilter === "new" ? "active" : ""}`}
            onClick={() => setStatusFilter(statusFilter === "new" ? "all" : "new")}
          >
            <div className="bmn-kpi-header">
              <span className="bmn-kpi-label">
                <span className="status-dot new" /> Baru
              </span>
            </div>
            <div className="bmn-kpi-value">{stats.new}</div>
          </div>
        </Col>

        <Col xs={12} sm={8} md={4} lg={4} style={{ flex: "1 1 0" }}>
          <div
            className={`bmn-kpi-card ${statusFilter === "in_progress" ? "active" : ""}`}
            onClick={() => setStatusFilter(statusFilter === "in_progress" ? "all" : "in_progress")}
          >
            <div className="bmn-kpi-header">
              <span className="bmn-kpi-label">
                <span className="status-dot in_progress" /> Diproses
              </span>
            </div>
            <div className="bmn-kpi-value">{stats.in_progress}</div>
          </div>
        </Col>

        <Col xs={12} sm={8} md={4} lg={4} style={{ flex: "1 1 0" }}>
          <div
            className={`bmn-kpi-card ${statusFilter === "completed" ? "active" : ""}`}
            onClick={() => setStatusFilter(statusFilter === "completed" ? "all" : "completed")}
          >
            <div className="bmn-kpi-header">
              <span className="bmn-kpi-label">
                <span className="status-dot completed" /> Selesai
              </span>
            </div>
            <div className="bmn-kpi-value">{stats.completed}</div>
          </div>
        </Col>

        <Col xs={12} sm={8} md={4} lg={4} style={{ flex: "1 1 0" }}>
          <div
            className={`bmn-kpi-card ${statusFilter === "rejected" ? "active" : ""}`}
            onClick={() => setStatusFilter(statusFilter === "rejected" ? "all" : "rejected")}
          >
            <div className="bmn-kpi-header">
              <span className="bmn-kpi-label">
                <span className="status-dot rejected" /> Ditolak
              </span>
            </div>
            <div className="bmn-kpi-value">{stats.rejected}</div>
          </div>
        </Col>
      </Row>

      {/* ── 3. Toolbar & Filters (Surat Tugas Benchmark) ── */}
      <div className="bmn-toolbar-card">
        <Row gutter={[10, 10]} align="middle">
          {/* Search Input */}
          <Col xs={24} sm={12} md={6} lg={6}>
            <Input
              placeholder="Cari nomor, pelapor, aset..."
              prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
              style={{ borderRadius: 6, height: 34 }}
            />
          </Col>

          {/* Date Range Popover */}
          <Col xs={12} sm={6} md={4} lg={4}>
            <Popover
              trigger="click"
              open={datePopoverOpen}
              onOpenChange={setDatePopoverOpen}
              placement="bottomLeft"
              content={
                <Space direction="vertical" size={10} style={{ padding: 4 }}>
                  <Text strong style={{ fontSize: 12 }}>
                    Pilih Range Tanggal
                  </Text>
                  <DatePicker.RangePicker
                    format="DD/MM/YYYY"
                    value={dateRange}
                    onChange={setDateRange}
                    allowClear
                  />
                  <Space style={{ justifyContent: "flex-end", width: "100%" }}>
                    <Button
                      size="small"
                      onClick={() => {
                        setDateRange(null);
                        setDatePopoverOpen(false);
                      }}
                    >
                      Clear
                    </Button>
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => setDatePopoverOpen(false)}
                    >
                      Terapkan
                    </Button>
                  </Space>
                </Space>
              }
            >
              <Button
                icon={<CalendarOutlined />}
                className="bmn-toolbar-btn"
                style={{ width: "100%" }}
              >
                {dateRange && dateRange[0] && dateRange[1]
                  ? `${dateRange[0].format("DD/MM/YY")} - ${dateRange[1].format("DD/MM/YY")}`
                  : "Range Tanggal"}
              </Button>
            </Popover>
          </Col>

          {/* Scope Filter (if Admin/Validator) */}
          {isAdminOrValidator && (
            <Col xs={12} sm={6} md={4} lg={3}>
              <Dropdown
                menu={{
                  items: [
                    {
                      key: "all",
                      label: "Semua Pelaporan",
                      onClick: () => setScopeFilter("all"),
                    },
                    {
                      key: "mine",
                      label: "Pelaporan Saya",
                      onClick: () => setScopeFilter("mine"),
                    },
                  ],
                  selectedKeys: [scopeFilter],
                }}
                trigger={["click"]}
              >
                <Button className="bmn-toolbar-btn" style={{ width: "100%" }}>
                  {scopeFilter === "all" ? "Semua Pelaporan" : "Laporan Saya"}
                  <DownOutlined style={{ fontSize: 10, marginLeft: 2 }} />
                </Button>
              </Dropdown>
            </Col>
          )}

          {/* Report Type Dropdown */}
          <Col xs={12} sm={6} md={3} lg={3}>
            <Dropdown
              menu={{
                items: TYPE_OPTIONS.map((t) => ({
                  key: t.value,
                  label: t.label,
                  onClick: () => setTypeFilter(t.value),
                })),
                selectedKeys: [typeFilter],
              }}
              trigger={["click"]}
            >
              <Button className="bmn-toolbar-btn" style={{ width: "100%" }}>
                {typeFilter === "all"
                  ? "Jenis: Semua"
                  : typeFilter === "pemeliharaan"
                  ? "Pemeliharaan"
                  : "Keluhan"}
                <DownOutlined style={{ fontSize: 10, marginLeft: 2 }} />
              </Button>
            </Dropdown>
          </Col>

          {/* Status Dropdown */}
          <Col xs={12} sm={6} md={3} lg={3}>
            <Dropdown
              menu={{
                items: STATUS_OPTIONS.map((s) => ({
                  key: s.value,
                  label: (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {s.dotClass && <span className={`status-dot ${s.dotClass}`} />}
                      <span>{s.label}</span>
                    </div>
                  ),
                  onClick: () => setStatusFilter(s.value),
                })),
                selectedKeys: [statusFilter],
              }}
              trigger={["click"]}
            >
              <Button className="bmn-toolbar-btn" style={{ width: "100%" }}>
                {statusFilter === "all"
                  ? "Status: Semua"
                  : `Status: ${STATUS_CONFIG[statusFilter]?.label || statusFilter}`}
                <DownOutlined style={{ fontSize: 10, marginLeft: 2 }} />
              </Button>
            </Dropdown>
          </Col>

          {/* Action Tools on the Right */}
          <Col
            xs={24}
            sm={24}
            md={isAdminOrValidator ? 4 : 8}
            lg={isAdminOrValidator ? 5 : 5}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              justifyContent: "flex-end",
              marginLeft: "auto",
            }}
          >
            <Tooltip title="Reset Semua Filter">
              <Button
                icon={<FilterOutlined />}
                onClick={handleResetFilter}
                className="bmn-toolbar-btn"
                style={{ width: 34, padding: 0 }}
              />
            </Tooltip>
            <Tooltip title="Segarkan Data">
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchReports}
                loading={loading}
                className="bmn-toolbar-btn"
                style={{ width: 34, padding: 0 }}
              />
            </Tooltip>
            {isAdminOrValidator && (
              <Tooltip title="Unduh Rekap PDF">
                <Button
                  icon={<FilePdfOutlined />}
                  onClick={exportToPdf}
                  loading={pdfLoading}
                  className="bmn-toolbar-btn"
                  style={{ width: 34, padding: 0 }}
                />
              </Tooltip>
            )}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenCreate}
              style={{
                borderRadius: 6,
                height: 34,
                fontWeight: 600,
                fontSize: 12.5,
              }}
            >
              + Laporan
            </Button>
          </Col>
        </Row>
      </div>

      {/* ── 4. Clean Data Table Workspace ── */}
      <div className="bmn-table-container">
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={reports}
          scroll={{ x: 1100 }}
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            pageSizeOptions: ["15", "30", "50", "100"],
            showTotal: (total) => (
              <Text type="secondary" style={{ fontSize: 12 }}>
                Total {total} laporan
              </Text>
            ),
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span style={{ fontSize: 12.5, color: "#64748b" }}>
                    Tidak ada laporan pemeliharaan / keluhan yang sesuai filter
                  </span>
                }
              />
            ),
          }}
        />
      </div>

      {/* ── 5. Detail Drawer ── */}
      <Drawer
        title={
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                Detail Laporan BMN
              </span>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                {selectedReport?.report_number || "-"}
              </div>
            </div>
            {selectedReport && (
              <div className="status-indicator" style={{ marginRight: 24 }}>
                <span
                  className={`status-dot ${STATUS_CONFIG[selectedReport.status]?.dotClass || "neutral"}`}
                />
                <span className="status-text">
                  {STATUS_CONFIG[selectedReport.status]?.label || selectedReport.status}
                </span>
              </div>
            )}
          </div>
        }
        open={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
        width={540}
        className="bmn-drawer"
        footer={
          selectedReport && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteReport(selectedReport)}
              >
                Hapus
              </Button>
              <Space>
                <Button onClick={() => setDetailDrawerOpen(false)}>Tutup</Button>
                {isAdminOrValidator && (
                  <Button
                    type="primary"
                    icon={<EditOutlined />}
                    onClick={() => {
                      handleOpenUpdate(selectedReport);
                    }}
                  >
                    Update Status
                  </Button>
                )}
              </Space>
            </div>
          )
        }
      >
        {selectedReport && (
          <div>
            {/* Section 1: Ringkasan Pengajuan */}
            <div className="bmn-detail-section">
              <div className="bmn-detail-section-title">
                <FileTextOutlined /> Informasi Pengajuan
              </div>
              <div className="bmn-detail-grid">
                <div className="bmn-detail-field">
                  <span className="bmn-detail-field-label">No. Laporan</span>
                  <span className="bmn-detail-field-value">{selectedReport.report_number}</span>
                </div>
                <div className="bmn-detail-field">
                  <span className="bmn-detail-field-label">Jenis</span>
                  <span className="bmn-detail-field-value" style={{ textTransform: "capitalize" }}>
                    {selectedReport.report_type === "pemeliharaan" ? "Pemeliharaan" : "Keluhan"}
                  </span>
                </div>
                <div className="bmn-detail-field">
                  <span className="bmn-detail-field-label">Waktu Pengajuan</span>
                  <span className="bmn-detail-field-value">
                    {selectedReport.created_at
                      ? dayjs(selectedReport.created_at).format("DD MMMM YYYY, HH:mm") + " WITA"
                      : "-"}
                  </span>
                </div>
                <div className="bmn-detail-field">
                  <span className="bmn-detail-field-label">Status</span>
                  <div className="status-indicator" style={{ marginTop: 2 }}>
                    <span
                      className={`status-dot ${STATUS_CONFIG[selectedReport.status]?.dotClass || "neutral"}`}
                    />
                    <span className="status-text">
                      {STATUS_CONFIG[selectedReport.status]?.label || selectedReport.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Data Pelapor */}
            <div className="bmn-detail-section">
              <div className="bmn-detail-section-title">
                <UserOutlined /> Identitas Pelapor
              </div>
              <div className="bmn-detail-grid">
                <div className="bmn-detail-field">
                  <span className="bmn-detail-field-label">Nama Pegawai</span>
                  <span className="bmn-detail-field-value">{selectedReport.reporter_name || "-"}</span>
                </div>
                <div className="bmn-detail-field">
                  <span className="bmn-detail-field-label">NIP</span>
                  <span className="bmn-detail-field-value">{selectedReport.reporter_nip || "-"}</span>
                </div>
                <div className="bmn-detail-field">
                  <span className="bmn-detail-field-label">Unit / Bidang</span>
                  <span className="bmn-detail-field-value">{selectedReport.reporter_function || "-"}</span>
                </div>
                <div className="bmn-detail-field">
                  <span className="bmn-detail-field-label">Kontak WhatsApp</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                    <span className="bmn-detail-field-value">{selectedReport.reporter_phone || "-"}</span>
                    {selectedReport.reporter_phone && (
                      <Tooltip title="Chat via WhatsApp">
                        <a
                          href={`https://wa.me/${selectedReport.reporter_phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: "#16a34a",
                            display: "inline-flex",
                            alignItems: "center",
                          }}
                        >
                          <WhatsAppOutlined style={{ fontSize: 16 }} />
                        </a>
                      </Tooltip>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Aset BMN Terkait */}
            <div className="bmn-detail-section">
              <div className="bmn-detail-section-title">
                <LaptopOutlined /> Aset BMN Terkait
              </div>
              {Array.isArray(selectedReport.assets_data) && selectedReport.assets_data.length > 0 ? (
                <div>
                  {selectedReport.assets_data.map((asset, idx) => (
                    <div key={idx} className="bmn-detail-asset-card">
                      <div style={{ fontWeight: 600, fontSize: 12.5, color: "#0f172a" }}>
                        {asset.name}
                      </div>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 4, fontSize: 11, color: "#64748b" }}>
                        {asset.asset_code && <span>Kode: <strong>{asset.asset_code}</strong></span>}
                        {asset.brand && <span>Merek: <strong>{asset.brand}</strong></span>}
                        {asset.model && <span>NUP/Model: <strong>{asset.model}</strong></span>}
                        {asset.location && <span>Lokasi: <strong>{asset.location}</strong></span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bmn-detail-grid">
                  <div className="bmn-detail-field">
                    <span className="bmn-detail-field-label">Nama Aset</span>
                    <span className="bmn-detail-field-value">{selectedReport.asset_name || "-"}</span>
                  </div>
                  {selectedReport.asset?.asset_code && (
                    <div className="bmn-detail-field">
                      <span className="bmn-detail-field-label">Kode BMN</span>
                      <span className="bmn-detail-field-value">{selectedReport.asset.asset_code}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section 4: Rincian Permasalahan */}
            <div className="bmn-detail-section">
              <div className="bmn-detail-section-title">
                <ToolOutlined /> Rincian Permasalahan / Keluhan
              </div>
              <Paragraph
                style={{
                  fontSize: 12.5,
                  color: "#334155",
                  lineHeight: 1.6,
                  margin: 0,
                  whiteSpace: "pre-wrap",
                }}
              >
                {selectedReport.report_details || "-"}
              </Paragraph>
            </div>

            {/* Section 5: Status Tindak Lanjut & Catatan Admin */}
            <div className="bmn-detail-section">
              <div className="bmn-detail-section-title">
                <ClockCircleOutlined /> Riwayat Tindak Lanjut
              </div>
              <div className="bmn-detail-grid full">
                <div className="bmn-detail-field">
                  <span className="bmn-detail-field-label">Petugas Penangan</span>
                  <span className="bmn-detail-field-value">
                    {selectedReport.handler?.name || (selectedReport.handled_by ? "Petugas BMN" : "Belum Ditangani")}
                  </span>
                </div>
                {selectedReport.handled_at && (
                  <div className="bmn-detail-field">
                    <span className="bmn-detail-field-label">Waktu Tindak Lanjut</span>
                    <span className="bmn-detail-field-value">
                      {dayjs(selectedReport.handled_at).format("DD MMMM YYYY, HH:mm")} WITA
                    </span>
                  </div>
                )}
                <div className="bmn-detail-field" style={{ marginTop: 4 }}>
                  <span className="bmn-detail-field-label">Catatan Admin / Hasil Pemeriksaan</span>
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 6,
                      padding: "8px 12px",
                      fontSize: 12.5,
                      color: selectedReport.admin_notes ? "#0f172a" : "#94a3b8",
                      fontStyle: selectedReport.admin_notes ? "normal" : "italic",
                      marginTop: 4,
                      minHeight: 38,
                    }}
                  >
                    {selectedReport.admin_notes || "Belum ada catatan admin tindak lanjut."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* ── 6. Update Status Modal ── */}
      <Modal
        open={updateModalOpen}
        onCancel={() => setUpdateModalOpen(false)}
        title="Update Status Laporan BMN"
        className="bmn-modal"
        width={560}
        footer={null}
        destroyOnClose
      >
        <Form
          layout="vertical"
          requiredMark={false}
          form={updateForm}
          onFinish={handleUpdateStatus}
        >
          {selectedReport && (
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#64748b" }}>No. Laporan:</span>
                <strong style={{ color: "#0f172a" }}>{selectedReport.report_number}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 4 }}>
                <span style={{ color: "#64748b" }}>Pelapor:</span>
                <strong style={{ color: "#0f172a" }}>{selectedReport.reporter_name}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 4 }}>
                <span style={{ color: "#64748b" }}>Aset BMN:</span>
                <span style={{ color: "#0f172a", fontWeight: 500, maxWidth: 300, textAlign: "right" }}>
                  {selectedReport.asset_name || "-"}
                </span>
              </div>
            </div>
          )}

          <Form.Item
            name="status"
            label={<span style={{ fontWeight: 600, fontSize: 12.5 }}>Pilih Status Baru</span>}
            rules={[{ required: true, message: "Pilih status laporan" }]}
          >
            <Radio.Group className="bmn-status-radio-grid">
              {Object.entries(STATUS_CONFIG).map(([key, item]) => (
                <Radio.Button key={key} value={key} className="bmn-status-radio-option">
                  <div className="bmn-status-radio-inner">
                    <span style={{ marginTop: 2 }}>{item.icon}</span>
                    <div>
                      <div className="bmn-status-radio-title">{item.label}</div>
                      <div className="bmn-status-radio-desc">{item.hint}</div>
                    </div>
                  </div>
                </Radio.Button>
              ))}
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="admin_notes"
            label={<span style={{ fontWeight: 600, fontSize: 12.5 }}>Catatan Tindak Lanjut / Alasan</span>}
          >
            <Input.TextArea
              rows={4}
              placeholder="Tuliskan catatan teknisi, progres penanganan, hasil pemeriksaan, atau alasan penolakan..."
              style={{ borderRadius: 6 }}
            />
          </Form.Item>

          <Divider style={{ margin: "16px 0 14px" }} />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Button onClick={() => setUpdateModalOpen(false)}>Batal</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={updating}
              icon={<ClockCircleOutlined />}
              style={{ borderRadius: 6, fontWeight: 600 }}
            >
              Simpan Update
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ── 7. Tambah Laporan Modal ── */}
      <Modal
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        title="Ajukan Pemeliharaan / Keluhan BMN"
        className="bmn-modal"
        width={600}
        footer={null}
        destroyOnClose
      >
        <Form
          layout="vertical"
          requiredMark={false}
          form={createForm}
          onFinish={handleCreateReport}
          initialValues={{ report_type: "pemeliharaan" }}
        >
          {/* Reporter Preview Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <UserOutlined style={{ color: "#0284c7" }} />
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "#0f172a" }}>
                  {user?.employee?.name || user?.name || "Pengguna"}
                </div>
                <div style={{ fontSize: 11, color: "#64748b" }}>
                  NIP: {user?.employee?.nip || user?.nip || "-"} • {user?.employee?.function_area || "SIPTU"}
                </div>
              </div>
            </div>
            <Tag color="blue" style={{ borderRadius: 4, margin: 0, fontSize: 11 }}>
              Pelapor
            </Tag>
          </div>

          <Form.Item
            name="report_type"
            label={<span style={{ fontWeight: 600, fontSize: 12.5 }}>Jenis Pengajuan</span>}
            rules={[{ required: true }]}
          >
            <Radio.Group style={{ width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Radio.Button
                value="pemeliharaan"
                style={{
                  height: "auto",
                  padding: "10px 12px",
                  borderRadius: 8,
                  textAlign: "center",
                }}
              >
                <ToolOutlined style={{ marginRight: 6, color: "#0f766e" }} />
                <span style={{ fontWeight: 600 }}>Pemeliharaan Aset</span>
              </Radio.Button>
              <Radio.Button
                value="keluhan"
                style={{
                  height: "auto",
                  padding: "10px 12px",
                  borderRadius: 8,
                  textAlign: "center",
                }}
              >
                <ExclamationCircleOutlined style={{ marginRight: 6, color: "#c2410c" }} />
                <span style={{ fontWeight: 600 }}>Keluhan / Kendala</span>
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.report_type !== curr.report_type}>
            {({ getFieldValue }) =>
              getFieldValue("report_type") === "pemeliharaan" ? (
                <Form.Item
                  name="asset_ids"
                  label={<span style={{ fontWeight: 600, fontSize: 12.5 }}>Pilih Aset BMN</span>}
                  rules={[{ required: true, message: "Pilih minimal 1 aset BMN yang bermasalah" }]}
                >
                  <Select
                    mode="multiple"
                    placeholder="Cari & pilih aset BMN..."
                    options={assetOptions}
                    loading={loadingAssets}
                    showSearch
                    filterOption={(input, option) =>
                      (option?.searchLabel ?? "").toLowerCase().includes(input.toLowerCase())
                    }
                    style={{ width: "100%", borderRadius: 6 }}
                  />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Form.Item
            name="report_details"
            label={<span style={{ fontWeight: 600, fontSize: 12.5 }}>Rincian Permasalahan / Keluhan</span>}
            rules={[{ required: true, message: "Deskripsikan permasalahan aset" }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="Deskripsikan kondisi kerusakan aset, kendala yang dialami, atau lokasi spesifik..."
              style={{ borderRadius: 6 }}
            />
          </Form.Item>

          <Divider style={{ margin: "16px 0 14px" }} />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Button onClick={() => setCreateModalOpen(false)}>Batal</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={creating}
              style={{ borderRadius: 6, fontWeight: 600 }}
            >
              Kirim Laporan
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
