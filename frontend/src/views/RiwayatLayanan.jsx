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
  Dropdown,
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
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import useDebounce from "../hooks/useDebounce.js";
import { buildMessageAdapter } from "../utils/notify.js";
import "./RiwayatLayanan.css";

const SERVICE_TYPES = [
  { value: "all", label: "Semua Layanan" },
  { value: "archive_loan", label: "Peminjaman Arsip", emoji: "📁" },
  { value: "bmn_loan", label: "Peminjaman BMN", emoji: "🏗️" },
  { value: "exit_permit", label: "Izin Keluar", emoji: "🚶" },
  { value: "it_helpdesk", label: "IT Helpdesk", emoji: "🔧" },
  { value: "surat_tugas", label: "Surat Tugas", emoji: "📝" },
  { value: "bmn_maintenance", label: "Pemeliharaan BMN", emoji: "🛠️" },
];

const STATUS_LABELS = {
  pending: "Menunggu", approved: "Disetujui", rejected: "Ditolak",
  completed: "Selesai", out: "Di Luar", returned: "Kembali",
  draft: "Draft", open: "Terbuka", in_progress: "Diproses", closed: "Ditutup",
};

const STATUS_OPTIONS = [
  { value: "all", label: "Semua Status" },
  { value: "pending", label: "Menunggu" },
  { value: "draft", label: "Draft" },
  { value: "approved", label: "Disetujui" },
  { value: "completed", label: "Selesai" },
  { value: "rejected", label: "Ditolak" },
  { value: "out", label: "Di Luar" },
  { value: "returned", label: "Kembali" },
  { value: "open", label: "Terbuka" },
  { value: "closed", label: "Ditutup" },
];

const PAGE_SIZE = 10;

function RiwayatLayanan() {
  const { token, user, apiFetch } = useAuth();
  const { message } = AntdApp.useApp();
  const msg = buildMessageAdapter(message);
  const navigate = useNavigate();
  const [editForm] = Form.useForm();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterDate, setFilterDate] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [currentPage, setCurrentPage] = useState(1);

  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalLoading, setEditModalLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  // TTE modal
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [signRecord, setSignRecord] = useState(null);
  const [signPassword, setSignPassword] = useState("");
  const [signLoading, setSignLoading] = useState(false);
  const [signWaitWa, setSignWaitWa] = useState(false);
  // Preview modal
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

  const { RangePicker } = DatePicker;
  const { TextArea } = Input;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterDate) params.set("date", filterDate.format("YYYY-MM-DD"));
      if (filterType !== "all") params.set("type", filterType);
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
  }, [filterDate, filterType, filterStatus, debouncedSearch, apiFetch, msg]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const loadEmployees = useCallback(async () => {
    setEmployeesLoading(true);
    try {
      const res = await apiFetch("/public/bmn-employees");
      const json = await res.json();
      const list = Array.isArray(json) ? json : json?.data ?? [];
      setEmployeeOptions(list.map((emp) => ({ value: emp.id, label: `${emp.name}${emp.nip ? ` (${emp.nip})` : ""}${emp.position ? ` - ${emp.position}` : ""}` })));
    } catch (e) { msg.error({ message: "Gagal memuat daftar pegawai." }); }
    finally { setEmployeesLoading(false); }
  }, [msg]);

  const openProtokolPreview = (record) => {
    if (!record?.id) return;
    const baseUrlRaw = import.meta.env.VITE_API_URL || "https://siptu.bpompalopo.com/core_api/api";
    const baseUrl = baseUrlRaw.replace(/\/+$/, "");
    // Use public endpoint with with_qr=1 to see current signature status
    setPreviewUrl(`${baseUrl}/public/surat-tugas/${record.id}/protokol-kerja?with_qr=1&token=${record.token || record.signature_token || ""}&t=${Date.now()}`);
    setPreviewModalOpen(true);
  };

  const handleDownloadProtokol = async (record) => {
    if (!record?.id) return;
    try {
      const res = await apiFetch(`/my-service-history/surat_tugas/${record.id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setSignRecord(json); setSignPassword(""); setSignModalOpen(true);
    } catch (e) { msg.error({ message: "Gagal memuat data surat tugas." }); }
  };

  const handleDownloadWithoutQR = () => {
    if (!signRecord?.id) return;
    const baseUrl = import.meta.env.VITE_API_URL || "https://siptu.bpompalopo.com/core_api/api";
    window.open(`${baseUrl.replace(/\/+$/, "")}/public/surat-tugas/${signRecord.id}/protokol-kerja`, "_blank");
    setSignModalOpen(false);
  };

  const handleSignProtokol = async () => {
    if (!signPassword) { msg.warning({ message: "Masukkan password Anda terlebih dahulu." }); return; }
    setSignLoading(true);
    try {
      const res = await apiFetch(`/surat-tugas/${signRecord.id}/sign-protokol`, { method: "POST", body: JSON.stringify({ password: signPassword }) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || "Gagal menandatangani dokumen."); }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `Protokol_Kerja_${signRecord.nomor_st || signRecord.id}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      msg.success({ message: "Dokumen berhasil ditandatangani dan diunduh." }); setSignModalOpen(false);
    } catch (e) { msg.error({ message: e.message }); }
    finally { setSignLoading(false); }
  };

  const handleRequestSignature = async () => {
    setSignWaitWa(true);
    try {
      const res = await apiFetch(`/surat-tugas/${signRecord.id}/request-signature`, { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.message || "Gagal mengirim permintaan tanda tangan.");
      msg.success({ message: d.message || "Link berhasil dikirim via WhatsApp." }); setSignModalOpen(false);
    } catch (e) { msg.error({ message: e.message }); }
    finally { setSignWaitWa(false); }
  };

  const openEditSuratTugas = async (record) => {
    if (!record?.id) return;
    if (record.status && record.status !== "draft") { msg.warning({ message: "Surat tugas sudah diproses dan tidak dapat diedit." }); return; }
    setEditModalLoading(true);
    if (employeeOptions.length === 0) await loadEmployees();
    try {
      const res = await apiFetch(`/my-service-history/surat_tugas/${record.id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Gagal memuat detail surat tugas.");
      const start = json?.tanggal_mulai ? dayjs(json.tanggal_mulai) : null;
      const end = json?.tanggal_selesai ? dayjs(json.tanggal_selesai) : null;
      editForm.setFieldsValue({
        employee_ids: (json.employees ?? []).map((emp) => emp.id),
        ketua_tim_id: json.ketua_tim_id ?? undefined,
        tanggal_tugas: start && end ? [start, end] : [],
        mak: json.mak ?? "", lokasi_tugas: json.lokasi_tugas ?? "",
        deskripsi_tugas: json.deskripsi_tugas ?? "",
        sarana: Array.isArray(json.sarana) ? json.sarana : [],
      });
      setEditRecord(json); setEditModalOpen(true);
    } catch (e) { msg.error({ message: e.message }); }
    finally { setEditModalLoading(false); }
  };

  const closeEditModal = () => { setEditModalOpen(false); setEditRecord(null); editForm.resetFields(); };

  const handleSaveSuratTugas = async () => {
    try {
      const values = await editForm.validateFields();
      const employeeIds = values.employee_ids ?? [];
      if (!employeeIds.length) { msg.warning({ message: "Pilih minimal 1 pegawai." }); return; }
      if (!values.ketua_tim_id) { msg.warning({ message: "Pilih Ketua Tim terlebih dahulu." }); return; }
      const [mulai, selesai] = values.tanggal_tugas ?? [];
      if (!mulai || !selesai) { msg.warning({ message: "Pilih rentang tanggal tugas." }); return; }
      const saranaPayload = Array.isArray(values.sarana) ? values.sarana.filter((s) => s?.nama && String(s.nama).trim()).map((s) => ({ id: s?.id ?? null, nama: String(s.nama).trim(), lokasi: s?.lokasi ? String(s.lokasi).trim() : null })) : null;
      const payload = { employee_ids: employeeIds, ketua_tim_id: values.ketua_tim_id, tanggal_mulai: mulai.format("YYYY-MM-DD"), tanggal_selesai: selesai.format("YYYY-MM-DD"), mak: values.mak || null, lokasi_tugas: values.lokasi_tugas || null, deskripsi_tugas: values.deskripsi_tugas || null, sarana: saranaPayload && saranaPayload.length ? saranaPayload : null };
      setEditSaving(true);
      const res = await apiFetch(`/surat-tugas/${editRecord.id}/user-update`, { method: "PUT", body: JSON.stringify(payload) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { const errMsg = body?.errors ? Object.values(body.errors).flat().join(", ") : body?.message || "Gagal menyimpan."; throw new Error(errMsg); }
      msg.success({ message: body?.message || "Data surat tugas berhasil disimpan." });
      closeEditModal(); fetchData();
    } catch (e) { msg.error({ message: e.message }); }
    finally { setEditSaving(false); }
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
        key: "edit",
        label: "Edit Data",
        icon: <EditOutlined />,
        disabled: record.status !== "draft",
        onClick: () => openEditSuratTugas(record),
      });
      items.push({
        key: "preview",
        label: "Pratinjau Protokol",
        icon: <FileTextOutlined />,
        onClick: () => openProtokolPreview(record),
      });
      items.push({
        key: "tte",
        label: "Opsi TTE / Unduh",
        icon: <DownloadOutlined />,
        onClick: () => handleDownloadProtokol(record),
      });
    } else {
      items.push({
        key: "detail",
        label: "Lihat Detail",
        icon: <EyeOutlined />,
        onClick: () => handleViewDetail(record),
      });
    }

    return { items };
  };

  const getServiceLabel = (type) => SERVICE_TYPES.find((s) => s.value === type)?.label || type;

  const stats = useMemo(() => {
    const byType = {};
    data.forEach((item) => { byType[item.service_type] = (byType[item.service_type] || 0) + 1; });
    return { total: data.length, byType };
  }, [data]);

  const STAT_COLORS = { archive_loan: "#2563eb", bmn_loan: "#16a34a", exit_permit: "#7c3aed", it_helpdesk: "#ea580c", surat_tugas: "#0891b2", bmn_maintenance: "#4338ca" };

  // Pagination
  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const pagedData = data.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="rl-page module-section">
      {/* Header */}
      <div className="rl-header">
        <h2><span className="rl-header-icon"><HistoryOutlined /></span> Riwayat Layanan Mandiri</h2>
        <p>Lihat semua riwayat layanan yang pernah Anda ajukan.</p>
      </div>

      {/* Stats */}
      <div className="rl-stats">
        <div className="rl-stat-card" style={{ "--stat-color": "#6366f1" }}>
          <div className="rl-stat-value">{stats.total}</div>
          <div className="rl-stat-label">Total Layanan</div>
        </div>
        {SERVICE_TYPES.filter(s => s.value !== "all").map(s => (
          <div className="rl-stat-card" key={s.value} style={{ "--stat-color": STAT_COLORS[s.value] }}>
            <div className="rl-stat-value">{stats.byType[s.value] || 0}</div>
            <div className="rl-stat-label">{s.emoji} {s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="rl-toolbar">
        <div className="rl-toolbar-group">
          <div className="rl-select">
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              {SERVICE_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="rl-select">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="rl-search">
            <SearchOutlined className="rl-search-icon" />
            <input placeholder="Cari nomor tiket..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <button className={`rl-btn rl-btn--ghost ${loading ? "is-loading" : ""}`} onClick={fetchData}>
          <ReloadOutlined /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="rl-table-wrap">
        {loading ? (
          <div className="rl-loading"><div className="rl-spinner" /></div>
        ) : pagedData.length === 0 ? (
          <div className="rl-empty">
            <div className="rl-empty-icon">📭</div>
            <h3>Belum ada riwayat layanan</h3>
            <p>Riwayat layanan yang Anda ajukan akan muncul di sini.</p>
          </div>
        ) : (
          <>
            <table className="rl-table">
              <thead>
                <tr>
                  <th style={{ width: 44 }}>No</th>
                  <th>Jenis Layanan</th>
                  <th>Nomor Tiket</th>
                  <th>Tanggal</th>
                  <th>Keterangan</th>
                  <th className="center">Status</th>
                  <th className="center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pagedData.map((record, idx) => (
                  <tr key={record.id}>
                    <td>{(currentPage - 1) * PAGE_SIZE + idx + 1}</td>
                    <td>
                      <span className={`rl-service-badge rl-service-badge--${record.service_type}`}>
                        {getServiceLabel(record.service_type)}
                      </span>
                    </td>
                    <td><span className="rl-ticket-code">{record.ticket_number || String(record.id).padStart(6, "0")}</span></td>
                    <td>{record.created_at ? dayjs(record.created_at).format("DD MMM YYYY") : "-"}</td>
                    <td>
                      <div className="rl-desc" title={record.description || record.reason || "-"}>
                        {(() => {
                          const text = record.description || record.reason || "-";
                          return text.length > 700 ? text.substring(0, 700) + "..." : text;
                        })()}
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`rl-status rl-status--${record.status}`}>
                        {STATUS_LABELS[record.status] || record.status}
                      </span>
                    </td>
                    <td>
                      <div className="rl-actions">
                        <Dropdown menu={buildActionMenu(record)} trigger={["click"]} placement="bottomRight">
                          <Button size="small" icon={<MoreOutlined />} />
                        </Dropdown>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="rl-pagination">
                <span className="rl-pagination-info">{data.length} riwayat • Halaman {currentPage} dari {totalPages}</span>
                <div className="rl-pagination-controls">
                  <button className="rl-page-btn" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>‹</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1).map((p, i, arr) => (
                    <span key={p}>
                      {i > 0 && arr[i - 1] < p - 1 && <span style={{ padding: "0 4px", color: "#94a3b8" }}>…</span>}
                      <button className={`rl-page-btn ${p === currentPage ? "active" : ""}`} onClick={() => setCurrentPage(p)}>{p}</button>
                    </span>
                  ))}
                  <button className="rl-page-btn" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>›</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modals (keep Ant Design for complex forms) ── */}
      <Modal title="Edit Data Surat Tugas" open={editModalOpen} onCancel={closeEditModal} onOk={handleSaveSuratTugas} confirmLoading={editSaving} okText="Simpan" cancelText="Batal" width={720} destroyOnClose>
        <Spin spinning={editModalLoading}>
          <Form form={editForm} layout="vertical">
            <Form.Item name="employee_ids" label="Pegawai Ditugaskan" rules={[{ required: true, message: "Pilih minimal 1 pegawai." }]}>
              <Select mode="multiple" placeholder="Pilih pegawai" options={employeeOptions} loading={employeesLoading} showSearch optionFilterProp="label" />
            </Form.Item>
            <Form.Item name="ketua_tim_id" label="Ketua Tim" rules={[{ required: true, message: "Pilih Ketua Tim." }]}>
              <Select placeholder="Pilih Ketua Tim" options={employeeOptions} loading={employeesLoading} showSearch optionFilterProp="label" />
            </Form.Item>
            <Form.Item name="tanggal_tugas" label="Tanggal Tugas (Mulai – Selesai)" rules={[{ required: true, message: "Pilih rentang tanggal." }]}>
              <RangePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="mak" label="MAK (Mata Anggaran Keluaran)"><Input placeholder="Contoh: 524111" /></Form.Item>
            <Form.Item name="lokasi_tugas" label="Lokasi Tugas"><Input placeholder="Lokasi tujuan tugas" /></Form.Item>
            <Form.Item name="deskripsi_tugas" label="Agenda / Deskripsi Tugas"><TextArea rows={3} placeholder="Deskripsikan agenda tugas" /></Form.Item>
            <Form.Item label="Data Sarana (Opsional)">
              <Form.List name="sarana">
                {(fields, { add, remove }) => (
                  <Space direction="vertical" size={10} style={{ width: "100%" }}>
                    {fields.map((field) => (
                      <Space key={field.key} align="start" style={{ width: "100%" }}>
                        <Form.Item {...field} name={[field.name, "nama"]} style={{ flex: 1, marginBottom: 0 }} rules={[{ required: true, message: "Nama sarana wajib diisi." }]}>
                          <Input placeholder="Nama sarana" />
                        </Form.Item>
                        <Form.Item {...field} name={[field.name, "lokasi"]} style={{ flex: 1, marginBottom: 0 }}>
                          <Input placeholder="Lokasi sarana" />
                        </Form.Item>
                        <Button danger type="text" icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                      </Space>
                    ))}
                    <Button type="dashed" icon={<PlusOutlined />} onClick={() => add()} block>Tambah Sarana</Button>
                  </Space>
                )}
              </Form.List>
            </Form.Item>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>Setelah menyimpan, Anda dapat mengunduh ulang protokol kerja dengan data terbaru.</span>
          </Form>
        </Spin>
      </Modal>

      <Modal title="Tanda Tangan Elektronik Protokol Kerja" open={signModalOpen} onCancel={() => setSignModalOpen(false)} footer={null} destroyOnClose>
        {signRecord && (user?.employee?.id === signRecord.ketua_tim_id || user?.nip === signRecord.ketua_tim?.nip) ? (
          <div>
            <p>Anda ditetapkan sebagai <strong>Ketua Tim</strong>. Masukkan password login untuk membubuhkan QR Code TTE pada PDF.</p>
            <Input.Password placeholder="Masukkan password login SIPTU" value={signPassword} onChange={(e) => setSignPassword(e.target.value)} style={{ marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button onClick={handleDownloadWithoutQR}>Unduh Tanpa TTE</Button>
              <Button type="primary" onClick={handleSignProtokol} loading={signLoading}>Tandatangani & Unduh</Button>
            </div>
          </div>
        ) : (
          <div>
            <p>Hanya Ketua Tim (<strong>{signRecord?.ketua_tim?.name || "-"}</strong>) yang dapat membubuhkan TTE.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24 }}>
              <Button type="primary" onClick={handleRequestSignature} loading={signWaitWa} block>Kirim Link via WhatsApp ke Ketua Tim</Button>
              <Button onClick={handleDownloadWithoutQR} block>Unduh Tanpa QR Code (Draft)</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title={
          <Space>
            <FileTextOutlined style={{ color: "#1d4ed8" }} />
            <span>Pratinjau Protokol Kerja</span>
          </Space>
        }
        open={previewModalOpen}
        onCancel={() => {
          setPreviewModalOpen(false);
          setPreviewUrl("");
        }}
        footer={[
          <Button key="close" onClick={() => setPreviewModalOpen(false)}>
            Tutup
          </Button>,
          <Button
            key="download"
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => window.open(previewUrl + "&download=1", "_blank")}
          >
            Unduh PDF
          </Button>,
        ]}
        width={1000}
        styles={{ body: { padding: 0 } }}
        destroyOnClose
      >
        <div style={{ height: "75vh", width: "100%", background: "#f8fafc" }}>
          <iframe
            src={previewUrl}
            style={{ width: "100%", height: "100%", border: "none" }}
            title="Protokol Kerja Preview"
          />
        </div>
      </Modal>
    </div>
  );
}

export default RiwayatLayanan;
