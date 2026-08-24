import { useEffect, useState, useCallback, useMemo } from "react";
import {
  App as AntdApp,
  DatePicker,
  Input,
  Form,
  Select,
  Button,
  Modal,
  Spin,
  Space,
  Tag,
  Dropdown,
  AutoComplete,
  Tooltip,
} from "antd";
import {
  SafetyCertificateOutlined,
  FundOutlined,
  ClockCircleOutlined,
  ToolOutlined,
  BuildOutlined,
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  FileTextOutlined,
  HistoryOutlined,
  FileProtectOutlined,
  EditOutlined,
  DownloadOutlined,
  PlusOutlined,
  DeleteOutlined,
  MoreOutlined,
  SendOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  CloseOutlined,
  CheckCircleFilled,
  ExclamationCircleOutlined,
  UserOutlined,
  BankOutlined,
  CloseCircleFilled,
  ArrowRightOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import useDebounce from "../hooks/useDebounce.js";
import { buildMessageAdapter } from "../utils/notify.js";
import "./RiwayatLayanan.css";

const SERVICE_CATEGORIES = [
  { key: "all", label: "Semua Layanan", icon: <AppstoreOutlined /> },
  { key: "bmn_loan", label: "Peminjaman BMN", icon: <BankOutlined />, color: "#16a34a" },
  { key: "exit_permit", label: "Izin Keluar RISPEG", icon: <UserOutlined />, color: "#7c3aed" },
  { key: "it_helpdesk", label: "IT Helpdesk", icon: <ToolOutlined />, color: "#ea580c" },
  { key: "archive_loan", label: "Peminjaman Arsip", icon: <FileTextOutlined />, color: "#0078d4" },
  { key: "surat_tugas", label: "Surat Tugas", icon: <FileProtectOutlined />, color: "#0891b2" },
  { key: "bmn_maintenance", label: "Pemeliharaan BMN", icon: <BuildOutlined />, color: "#4338ca" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "Semua Status" },
  { value: "pending", label: "Menunggu / Draft" },
  { value: "approved", label: "Disetujui / Aktif" },
  { value: "completed", label: "Selesai" },
  { value: "rejected", label: "Ditolak" },
];

const STATUS_LABELS = {
  pending: "Menunggu", approved: "Disetujui", rejected: "Ditolak",
  completed: "Selesai", out: "Di Luar Kantor", returned: "Kembali",
  draft: "Draft", open: "Terbuka", in_progress: "Diproses", closed: "Ditutup",
};

const PAGE_SIZE = 8;

const RiwayatLayananContent = ({ isModal = false, onClose }) => {
  const { token, user, apiFetch, markMfaSessionActive } = useAuth();
  const { message } = AntdApp.useApp();
  const msg = buildMessageAdapter(message);
  const navigate = useNavigate();
  const [editForm] = Form.useForm();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [currentPage, setCurrentPage] = useState(1);

  // Edit modal & TTE state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalLoading, setEditModalLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  const [signModalOpen, setSignModalOpen] = useState(false);
  const [signRecord, setSignRecord] = useState(null);
  const [signPassword, setSignPassword] = useState("");
  const [signTotpCode, setSignTotpCode] = useState("");
  const [signLoading, setSignLoading] = useState(false);
  const [signWaitWa, setSignWaitWa] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCategory !== "all") params.set("type", filterCategory);
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      const query = params.toString();
      const response = await apiFetch(`/my-service-history${query ? `?${query}` : ""}`);
      if (!response.ok) throw new Error("Gagal memuat data riwayat.");
      const result = await response.json();
      setData(result.data || []);
      setCurrentPage(1);
    } catch (e) {
      msg.error({ message: e.message });
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterStatus, debouncedSearch, apiFetch, msg]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load Employees for Surat Tugas edit
  const loadEmployees = useCallback(async () => {
    setEmployeesLoading(true);
    try {
      const res = await apiFetch("/public/bmn-employees");
      const json = await res.json();
      const list = Array.isArray(json) ? json : json?.data ?? [];
      setEmployeeOptions(list.map((emp) => ({ value: emp.id, label: `${emp.name}${emp.nip ? ` (${emp.nip})` : ""}` })));
    } catch (e) { msg.error({ message: "Gagal memuat daftar pegawai." }); }
    finally { setEmployeesLoading(false); }
  }, [msg]);

  const openProtokolPreview = (record) => {
    if (!record?.id) return;
    const baseUrlRaw = import.meta.env.VITE_API_URL || "https://siptu.bpompalopo.com/core_api/api";
    const baseUrl = baseUrlRaw.replace(/\/+$/, "");
    setPreviewUrl(`${baseUrl}/public/surat-tugas/${record.id}/protokol-kerja?with_qr=1&token=${record.token || record.signature_token || ""}&t=${Date.now()}`);
    setPreviewModalOpen(true);
  };

  const handleDownloadProtokol = async (record) => {
    if (!record?.id) return;
    try {
      const res = await apiFetch(`/my-service-history/surat_tugas/${record.id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setSignRecord(json); setSignPassword(""); setSignTotpCode(""); setSignModalOpen(true);
    } catch (e) { msg.error({ message: "Gagal memuat data surat tugas." }); }
  };

  const handleSignProtokol = async () => {
    if (!signPassword) { msg.warning({ message: "Masukkan password Anda terlebih dahulu." }); return; }
    setSignLoading(true);
    try {
      const res = await apiFetch(`/surat-tugas/${signRecord.id}/sign-protokol`, { method: "POST", body: JSON.stringify({ password: signPassword, totp_code: signTotpCode }) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || "Gagal menandatangani dokumen."); }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `Protokol_Kerja_${signRecord.nomor_st || signRecord.id}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      if (signTotpCode) markMfaSessionActive?.();
      msg.success({ message: "Dokumen berhasil ditandatangani dan diunduh." }); setSignModalOpen(false);
    } catch (e) { msg.error({ message: e.message }); }
    finally { setSignLoading(false); }
  };

  const handleViewDetail = (record) => {
    switch (record.service_type) {
      case "archive_loan": navigate(record.token ? `/kearsipan-peminjaman/${record.token}` : "/app/kearsipan-peminjaman"); break;
      case "bmn_loan": navigate(record.token ? `/peminjaman-aset/track/${record.token}` : "/app/bmn-peminjaman-aset"); break;
      case "exit_permit": navigate(record.id ? `/izin-keluar?ticket=${record.id}&source=history` : "/izin-keluar"); break;
      case "it_helpdesk": navigate(record.id ? `/it-helpdesk/tickets/${record.id}/details` : "/app/it-helpdesk-pelaporan"); break;
      case "surat_tugas": navigate("/app/kepegawaian-surat-tugas"); break;
      case "bmn_maintenance": navigate("/app/bmn-pemeliharaan-keluhan"); break;
      default: break;
    }
  };

  const buildActionMenu = (record) => {
    const items = [];
    if (record.service_type === "surat_tugas") {
      items.push({
        key: "preview",
        label: "Pratinjau Protokol PDF",
        icon: <FileTextOutlined />,
        onClick: () => openProtokolPreview(record),
      });
      items.push({
        key: "tte",
        label: "TTE Digital / Unduh",
        icon: <DownloadOutlined />,
        onClick: () => handleDownloadProtokol(record),
      });
    } else {
      items.push({
        key: "detail",
        label: "Lihat Detail Pengajuan",
        icon: <EyeOutlined />,
        onClick: () => handleViewDetail(record),
      });
    }
    return { items };
  };

  // KPI Metrics Calculation (AGENTS.md Rule 3 KPI Standard)
  const kpiStats = useMemo(() => {
    let total = data.length;
    let activeCount = 0;
    let completedCount = 0;
    let tteCount = 0;

    data.forEach((item) => {
      const s = (item.status || "").toLowerCase();
      if (s === "pending" || s === "draft" || s === "approved" || s === "in_progress" || s === "out" || s === "open") {
        activeCount++;
      }
      if (s === "completed" || s === "returned" || s === "closed") {
        completedCount++;
      }
      if (item.service_type === "surat_tugas" && !item.is_signed) {
        tteCount++;
      }
    });

    return { total, activeCount, completedCount, tteCount };
  }, [data]);

  // Pagination calculation
  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const pagedData = useMemo(() => {
    return data.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  }, [data, currentPage]);

  return (
    <div className="rl-fluent-wrapper">
      {/* ── Top Header Bar (Microsoft Ribbon Style) ── */}
      <div className="rl-fluent-header">
        <div className="rl-header-title-box">
          <div className="rl-header-icon-badge">
            <HistoryOutlined />
          </div>
          <div className="rl-header-text">
            <h2>Riwayat Pengajuan & Layanan Saya</h2>
            <p>Monitor status real-time, cetak dokumen ber-TTE, dan lacak seluruh berkas pengajuan mandiri Anda.</p>
          </div>
        </div>

        <div className="rl-header-right-actions">
          <div className="rl-count-badge">
            {data.length} Total Pengajuan
          </div>
          {isModal && (
            <button className="rl-modal-close-btn" onClick={onClose} title="Tutup Modal (ESC)">
              <CloseOutlined />
            </button>
          )}
        </div>
      </div>

      {/* ── Top KPI Metric Cards (AGENTS.md Rule 3 KPI Standard) ── */}
      <div className="rl-kpi-grid">
        <div className="rl-kpi-card">
          <div className="rl-kpi-info">
            <span className="rl-kpi-label">TOTAL LAYANAN</span>
            <span className="rl-kpi-value">{kpiStats.total}</span>
            <span className="rl-kpi-sub">Seluruh modul SIPTU</span>
          </div>
          <div className="rl-kpi-icon-tile blue">
            <HistoryOutlined />
          </div>
        </div>

        <div className="rl-kpi-card">
          <div className="rl-kpi-info">
            <span className="rl-kpi-label">SEDANG AKTIF / PROSES</span>
            <span className="rl-kpi-value">{kpiStats.activeCount}</span>
            <span className="rl-kpi-sub">Menunggu kelanjutan</span>
          </div>
          <div className="rl-kpi-icon-tile amber">
            <ClockCircleOutlined />
          </div>
        </div>

        <div className="rl-kpi-card">
          <div className="rl-kpi-info">
            <span className="rl-kpi-label">DISETUJUI / SELESAI</span>
            <span className="rl-kpi-value">{kpiStats.completedCount}</span>
            <span className="rl-kpi-sub">Proses tuntas</span>
          </div>
          <div className="rl-kpi-icon-tile green">
            <CheckCircleOutlined />
          </div>
        </div>

        <div className="rl-kpi-card">
          <div className="rl-kpi-info">
            <span className="rl-kpi-label">PERLU TTE DIGITAL</span>
            <span className="rl-kpi-value">{kpiStats.tteCount}</span>
            <span className="rl-kpi-sub">Surat tugas & protokol</span>
          </div>
          <div className="rl-kpi-icon-tile purple">
            <FileProtectOutlined />
          </div>
        </div>
      </div>

      {/* ── Controls & Filter Bar (AGENTS.md Rule 5 In-Card Filters) ── */}
      <div className="rl-control-card">
        {/* Horizontal Category Tab Pills */}
        <div className="rl-category-pills">
          {SERVICE_CATEGORIES.map((cat) => {
            const count = cat.key === "all" ? data.length : data.filter(d => d.service_type === cat.key).length;
            return (
              <button
                key={cat.key}
                className={`rl-cat-pill ${filterCategory === cat.key ? "active" : ""}`}
                onClick={() => setFilterCategory(cat.key)}
              >
                {cat.icon}
                <span>{cat.label}</span>
                <span className="pill-count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Toolbar Row */}
        <div className="rl-toolbar-row">
          <div className="rl-search-input-wrap">
            <SearchOutlined className="s-icon" />
            <input
              type="text"
              placeholder="Cari nomor tiket, alasan, atau kata kunci..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="clear-btn" onClick={() => setSearch("")}><CloseOutlined /></button>
            )}
          </div>

          <div className="rl-filter-actions">
            <select
              className="rl-select-control"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <button
              className="rl-refresh-btn"
              onClick={fetchData}
              disabled={loading}
              title="Segarkan Data"
            >
              <ReloadOutlined spin={loading} />
              <span>Segarkan</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Enterprise Data Table Architecture (AGENTS.md Rule 4) ── */}
      <div className="rl-table-card">
        {loading ? (
          <div className="rl-empty-state-box">
            <Spin size="large" />
            <p style={{ marginTop: 12 }}>Memuat riwayat pengajuan Anda...</p>
          </div>
        ) : pagedData.length === 0 ? (
          <div className="rl-empty-state-box">
            <HistoryOutlined className="empty-icon" />
            <h3>Tidak ada riwayat pengajuan</h3>
            <p>Pengajuan layanan mandiri yang Anda buat akan tercatat secara otomatis di sini.</p>
          </div>
        ) : (
          <>
            <table className="rl-fluent-table">
              <thead>
                <tr>
                  <th style={{ width: 48 }}>NO</th>
                  <th>JENIS LAYANAN</th>
                  <th>NOMOR TIKET</th>
                  <th>TANGGAL PENGAJUAN</th>
                  <th>DESKRIPSI / KETERANGAN</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: "center", width: 70 }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {pagedData.map((record, idx) => {
                  const itemIndex = (currentPage - 1) * PAGE_SIZE + idx + 1;
                  const catObj = SERVICE_CATEGORIES.find(c => c.key === record.service_type);
                  return (
                    <tr key={record.id || idx}>
                      <td><strong>{itemIndex}</strong></td>
                      <td>
                        <div className="rl-type-badge-wrap">
                          <div className={`rl-type-icon-circle ${record.service_type}`}>
                            {catObj?.icon || <AppstoreOutlined />}
                          </div>
                          <span className="rl-type-label-text">{catObj?.label || record.service_type}</span>
                        </div>
                      </td>
                      <td>
                        <span className="rl-ticket-tag">
                          {record.ticket_number || record.spa_number || String(record.id).padStart(6, "0")}
                        </span>
                      </td>
                      <td>{record.created_at ? dayjs(record.created_at).format("DD MMM YYYY, HH:mm") : "-"}</td>
                      <td>
                        <div className="rl-desc-cell" title={record.description || record.reason || "-"}>
                          {record.description || record.reason || "-"}
                        </div>
                      </td>
                      <td>
                        <span className={`rl-status-pill ${record.status}`}>
                          {STATUS_LABELS[record.status] || record.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <Dropdown menu={buildActionMenu(record)} trigger={["click"]} placement="bottomRight">
                          <button className="rl-action-btn-trigger" title="Opsi Aksi">
                            <MoreOutlined />
                          </button>
                        </Dropdown>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="rl-table-pagination">
                <span className="rl-page-info">Menampilkan {pagedData.length} dari {data.length} riwayat</span>
                <div className="rl-page-btns">
                  <button
                    className="rl-page-num-btn"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                  >
                    ‹ Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      className={`rl-page-num-btn ${p === currentPage ? "active" : ""}`}
                      onClick={() => setCurrentPage(p)}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    className="rl-page-num-btn"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                  >
                    Next ›
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Sub-Modals (TTE Signature & Protokol PDF Preview) ── */}
      <Modal
        title="Pratinjau Protokol Kerja PDF"
        open={previewModalOpen}
        onCancel={() => setPreviewModalOpen(false)}
        footer={null}
        width={900}
        centered
      >
        {previewUrl ? (
          <iframe src={previewUrl} title="Protokol PDF" style={{ width: "100%", height: 600, border: "none", borderRadius: 12 }} />
        ) : (
          <p>Gagal memuat pratinjau PDF.</p>
        )}
      </Modal>

      <Modal
        title="Tanda Tangan Elektronik (TTE) Protokol"
        open={signModalOpen}
        onCancel={() => setSignModalOpen(false)}
        footer={null}
        width={500}
        centered
      >
        <div style={{ padding: "10px 0" }}>
          <p style={{ fontSize: 13, color: "#64748b" }}>Masukkan password akun Anda untuk membubuhkan TTE digital pada dokumen Protokol Kerja ini.</p>
          <Form layout="vertical">
            <Form.Item label="Password Akun" required>
              <Input.Password placeholder="Password SIPTU Anda..." value={signPassword} onChange={(e) => setSignPassword(e.target.value)} />
            </Form.Item>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
              <Button onClick={() => setSignModalOpen(false)}>Batal</Button>
              <Button type="primary" loading={signLoading} onClick={handleSignProtokol} icon={<FileProtectOutlined />}>Tanda Tangani PDF</Button>
            </div>
          </Form>
        </div>
      </Modal>
    </div>
  );
};

// Main Export Component supporting both Standalone Page and Modal Dialog
const RiwayatLayanan = ({ isModal = false, open = false, onClose }) => {
  if (isModal) {
    return (
      <Modal
        title={null}
        open={open}
        onCancel={onClose}
        footer={null}
        width={1180}
        centered
        className="riwayat-fluent-modal"
      >
        <RiwayatLayananContent isModal={true} onClose={onClose} />
      </Modal>
    );
  }

  return <RiwayatLayananContent isModal={false} />;
};

export default RiwayatLayanan;
