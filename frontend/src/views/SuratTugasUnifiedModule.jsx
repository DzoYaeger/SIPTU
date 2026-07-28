import { useEffect, useState, useMemo } from "react";
import {
  Table,
  Tag,
  Button,
  Input,
  Select,
  Modal,
  Badge,
  Spin,
  Empty,
  Tooltip,
  Space,
} from "antd";
import {
  FileProtectOutlined,
  FormOutlined,
  HistoryOutlined,
  SafetyCertificateOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ArrowLeftOutlined,
  SearchOutlined,
  EyeOutlined,
  FilePdfOutlined,
  UserOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "../hooks/useAuth.js";
import SuratTugasForm from "../pages/SuratTugasForm.jsx";
import KepegawaianSuratTugas from "./KepegawaianSuratTugas.jsx";
import "./SuratTugasUnifiedModule.css";

const SuratTugasUnifiedModule = () => {
  const { user, apiFetch } = useAuth();
  const [activeTab, setActiveTab] = useState("form"); // 'form' | 'my-assignments' | 'validator'
  const [collapsed, setCollapsed] = useState(false);

  // My Assignments State
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  // Detail Modal State
  const [selectedST, setSelectedST] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Check if user has validator/admin access
  const isValidatorOrAdmin = useMemo(() => {
    if (!user) return false;
    const role = (user.role || "").toLowerCase();
    const permissions = user.permissions || [];
    return (
      role.includes("admin") ||
      role.includes("validator") ||
      permissions.includes("kepegawaian-surat-tugas") ||
      permissions.includes("surat-tugas-manage")
    );
  }, [user]);

  // Fetch My Assignments
  const fetchMyAssignments = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/surat-tugas/my-assignments?per_page=200");
      if (res && res.ok) {
        const data = await res.json();
        setAssignments(data.data || (Array.isArray(data) ? data : []));
      }
    } catch (err) {
      console.error("Gagal memuat riwayat penugasan:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "my-assignments") {
      fetchMyAssignments();
    }
  }, [activeTab]);

  // Helper: Determine user's role in a Surat Tugas
  const getUserRoleTag = (record) => {
    if (!user) return null;
    const myId = user.id;
    const myNip = user.nip || user.username;
    const myEmpId = user.employee_id || user?.employee?.id;

    const isCreator =
      record.user_id === myId ||
      record.created_by === myId ||
      (myNip && record.nip_pemohon === myNip);

    const isOfficer = (record.employees || []).some(
      (emp) =>
        emp.id === myEmpId ||
        emp.employee_id === myEmpId ||
        (myNip && emp.nip === myNip) ||
        (emp.pivot && emp.pivot.employee_id === myEmpId),
    );

    const isKetua =
      record.ketua_tim_id === myEmpId ||
      (record.ketua_tim && (record.ketua_tim.id === myEmpId || record.ketua_tim.nip === myNip));

    if (isCreator && (isOfficer || isKetua)) {
      return (
        <Space size={4}>
          <Tag color="indigo" style={{ borderRadius: 4, fontWeight: 600, fontSize: 10.5 }}>
            🏷️ Pengaju ST
          </Tag>
          <Tag color="blue" style={{ borderRadius: 4, fontWeight: 600, fontSize: 10.5 }}>
            {isKetua ? "👑 Ketua Tim" : "👥 Petugas"}
          </Tag>
        </Space>
      );
    }

    if (isCreator) {
      return (
        <Tag color="indigo" style={{ borderRadius: 4, fontWeight: 600, fontSize: 10.5 }}>
          🏷️ Pengaju ST
        </Tag>
      );
    }

    if (isKetua) {
      return (
        <Tag color="purple" style={{ borderRadius: 4, fontWeight: 600, fontSize: 10.5 }}>
          👑 Ketua Tim
        </Tag>
      );
    }

    return (
      <Tag color="blue" style={{ borderRadius: 4, fontWeight: 600, fontSize: 10.5 }}>
        👥 Petugas (Ditagging)
      </Tag>
    );
  };

  // Filter My Assignments
  const filteredAssignments = useMemo(() => {
    const s = search.toLowerCase();
    const myId = user?.id;
    const myNip = user?.nip || user?.username;

    return assignments.filter((item) => {
      // Search
      const matchSearch =
        !s ||
        (item.nomor_st || "").toLowerCase().includes(s) ||
        (item.lokasi_tugas || "").toLowerCase().includes(s) ||
        (item.deskripsi_tugas || "").toLowerCase().includes(s) ||
        (item.mak || "").toLowerCase().includes(s);

      // Status
      const matchStatus =
        statusFilter === "all" || item.status === statusFilter;

      // Role Filter
      const isCreator =
        item.user_id === myId ||
        item.created_by === myId ||
        item.nip_pemohon === myNip;

      const matchRole =
        roleFilter === "all" ||
        (roleFilter === "creator" && isCreator) ||
        (roleFilter === "tagged" && !isCreator);

      return matchSearch && matchStatus && matchRole;
    });
  }, [assignments, search, statusFilter, roleFilter, user]);

  // Open Detail Modal
  const handleOpenDetail = (record) => {
    setSelectedST(record);
    setDetailModalOpen(true);
  };

  // Columns for My Assignments Table
  const columns = [
    {
      title: "Nomor & Tanggal ST",
      dataIndex: "nomor_st",
      key: "nomor_st",
      render: (val, r) => (
        <div>
          <div style={{ fontWeight: 600, color: "#1a1f2e", fontSize: 13 }}>
            {val || `ST-${String(r.id).padStart(6, "0")}`}
          </div>
          <div style={{ fontSize: 11, color: "#64748b" }}>
            <CalendarOutlined />{" "}
            {r.tanggal_st
              ? dayjs(r.tanggal_st).format("DD MMM YYYY")
              : dayjs(r.created_at).format("DD MMM YYYY")}
          </div>
        </div>
      ),
    },
    {
      title: "Maksud & Lokasi Tugas",
      dataIndex: "deskripsi_tugas",
      key: "deskripsi_tugas",
      render: (val, r) => (
        <div style={{ maxWidth: 280 }}>
          <div
            style={{
              fontWeight: 500,
              color: "#1a1f2e",
              fontSize: 12.5,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {val || r.maksud_tugas || "-"}
          </div>
          <div style={{ fontSize: 11, color: "#64748b" }}>
            <EnvironmentOutlined /> {r.lokasi_tugas || r.sarana_nama || "-"}
          </div>
        </div>
      ),
    },
    {
      title: "Peran Saya",
      key: "user_role",
      render: (_, r) => getUserRoleTag(r),
    },
    {
      title: "Tim Bertugas",
      key: "employees",
      render: (_, r) => {
        const emps = r.employees || [];
        if (emps.length === 0) return <span style={{ color: "#94a3b8", fontSize: 11 }}>-</span>;
        return (
          <Tooltip
            title={emps.map((e) => e.name || e.nama).join(", ")}
            placement="top"
          >
            <Tag color="cyan" style={{ borderRadius: 4, fontSize: 11 }}>
              <TeamOutlined /> {emps.length} Pegawai
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (val) => {
        const statusMap = {
          draft: { color: "default", label: "Draft" },
          pending: { color: "warning", label: "Proses TTE" },
          lengkap: { color: "success", label: "Disetujui / Lengkap" },
          selesai: { color: "blue", label: "Selesai" },
          rejected: { color: "error", label: "Ditolak" },
        };
        const conf = statusMap[val] || { color: "default", label: val || "Draft" };
        return (
          <Tag color={conf.color} style={{ borderRadius: 4, fontWeight: 600, fontSize: 11 }}>
            {conf.label}
          </Tag>
        );
      },
    },
    {
      title: "Aksi",
      key: "action",
      align: "center",
      render: (_, r) => (
        <Space size={6}>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleOpenDetail(r)}
            style={{ borderRadius: 6, fontSize: 11 }}
          >
            Detail
          </Button>

          <Button
            size="small"
            type="primary"
            icon={<FileProtectOutlined style={{ color: "#ffffff" }} />}
            onClick={() => {
              const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
              const tokenStr = r.signature_token || r.token || "";
              const protokolUrl = `${baseUrl.replace(/\/+$/, "")}/public/surat-tugas/${r.id}/protokol-kerja?with_qr=1&token=${tokenStr}`;
              window.open(protokolUrl, "_blank");
            }}
            style={{
              borderRadius: 6,
              fontSize: 11,
              backgroundColor: "#0F5B99",
              borderColor: "#0F5B99",
            }}
          >
            Protokol Kerja
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="st-module">
      {/* ── Sub-Sidebar Navigation ── */}
      <aside className={`st-sidebar ${collapsed ? "st-sidebar--collapsed" : "st-sidebar--expanded"}`}>
        {/* Header Brand */}
        <div className={`st-sidebar-header ${collapsed ? "st-sidebar-header--collapsed" : ""}`}>
          <div className={`st-sidebar-header__top ${collapsed ? "st-sidebar-header__top--collapsed" : ""}`}>
            <div className="st-sidebar-brand">
              <div className="st-sidebar-brand__icon">
                <FileProtectOutlined />
              </div>
              {!collapsed && (
                <div>
                  <h1 className="st-sidebar-brand__title">SURAT TUGAS</h1>
                </div>
              )}
            </div>

            <button
              className="st-toggle-btn"
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? "Perluas Sidebar" : "Ciutkan Sidebar"}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
          </div>
        </div>

        {/* Menu List */}
        <nav className={`st-sidebar-menu ${collapsed ? "st-sidebar-menu--collapsed" : ""}`}>
          <div className={`st-menu-group ${collapsed ? "st-menu-group--collapsed" : ""}`}>

            <button
              className={`st-menu-item ${activeTab === "form" ? "st-menu-item--active" : ""} ${collapsed ? "st-menu-item--collapsed" : ""}`}
              onClick={() => setActiveTab("form")}
              title="Pengajuan Surat Tugas Baru"
            >
              <span className="st-menu-item__icon"><FormOutlined /></span>
              {!collapsed && <span className="st-menu-item__text">Pengajuan Baru</span>}
            </button>

            <button
              className={`st-menu-item ${activeTab === "my-assignments" ? "st-menu-item--active" : ""} ${collapsed ? "st-menu-item--collapsed" : ""}`}
              onClick={() => setActiveTab("my-assignments")}
              title="Riwayat Penugasan Saya"
            >
              <span className="st-menu-item__icon"><HistoryOutlined /></span>
              {!collapsed && <span className="st-menu-item__text">Riwayat Saya</span>}
            </button>
          </div>

          {/* Admin / Validator Group */}
          {isValidatorOrAdmin && (
            <div className={`st-menu-group ${collapsed ? "st-menu-group--collapsed" : ""}`}>
              {!collapsed && <div className="st-menu-group__label">Administrasi</div>}

              <button
                className={`st-menu-item ${activeTab === "validator" ? "st-menu-item--active" : ""} ${collapsed ? "st-menu-item--collapsed" : ""}`}
                onClick={() => setActiveTab("validator")}
                title="Monitoring & Validasi Surat Tugas"
              >
                <span className="st-menu-item__icon"><SafetyCertificateOutlined /></span>
                {!collapsed && <span className="st-menu-item__text">Monitoring ST</span>}
              </button>
            </div>
          )}
        </nav>

        {/* Footer Back Button */}
        <div className={`st-sidebar-footer ${collapsed ? "st-sidebar-footer--collapsed" : ""}`}>
          <a
            href="/app/layanan-mandiri"
            className={`st-back-btn ${collapsed ? "st-back-btn--collapsed" : ""}`}
            title="Kembali ke Layanan Mandiri"
          >
            <ArrowLeftOutlined />
            {!collapsed && <span>Kembali ke Layanan Mandiri</span>}
          </a>
        </div>
      </aside>

      {/* ── Main Workspace Area ── */}
      <main className="st-workspace">
        {activeTab === "form" && (
          <div style={{ height: "100%", width: "100%" }}>
            <SuratTugasForm isEmbedded={true} />
          </div>
        )}

        {activeTab === "my-assignments" && (
          <div className="st-history-container">
            <div className="st-history-header">
              <h2 className="st-history-title">Riwayat Penugasan Saya</h2>
              <p className="st-history-subtitle">
                Daftar pengajuan surat tugas yang Anda buat maupun penugasan di mana Anda di-tagging sebagai pegawai bertugas.
              </p>
            </div>

            <div className="st-history-card">
              {/* Filter Toolbar */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16, justifyContent: "space-between" }}>
                <Input
                  placeholder="Cari nomor ST, maksud, atau lokasi..."
                  prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: 280, borderRadius: 6 }}
                  size="middle"
                  allowClear
                />

                <Space size={8}>
                  <Select
                    value={roleFilter}
                    onChange={(v) => setRoleFilter(v)}
                    style={{ width: 160, borderRadius: 6 }}
                    options={[
                      { label: "Semua Peran Saya", value: "all" },
                      { label: "Pengaju ST", value: "creator" },
                      { label: "Petugas Ditagging", value: "tagged" },
                    ]}
                  />

                  <Select
                    value={statusFilter}
                    onChange={(v) => setStatusFilter(v)}
                    style={{ width: 160, borderRadius: 6 }}
                    options={[
                      { label: "Semua Status", value: "all" },
                      { label: "Draft", value: "draft" },
                      { label: "Proses TTE", value: "pending" },
                      { label: "Disetujui", value: "lengkap" },
                      { label: "Selesai", value: "selesai" },
                    ]}
                  />
                </Space>
              </div>

              {/* Table */}
              <Table
                dataSource={filteredAssignments}
                columns={columns}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10, showSizeChanger: false }}
                size="middle"
              />
            </div>
          </div>
        )}

        {activeTab === "validator" && isValidatorOrAdmin && (
          <div style={{ height: "100%", width: "100%" }}>
            <KepegawaianSuratTugas isEmbedded={true} />
          </div>
        )}
      </main>

      {/* ── Detail Modal (Simpel & Corporate) ── */}
      <Modal
        title={null}
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={null}
        width={620}
        centered
        className="simba-detail-modal"
      >
        {selectedST && (
          <div>
            <div className="simba-detail-header">
              <h3 className="simba-detail-title">
                <FileProtectOutlined style={{ color: "#4f46e5" }} />
                Detail Surat Tugas: {selectedST.nomor_st || `ST-${String(selectedST.id).padStart(6, "0")}`}
              </h3>
              <div className="simba-detail-subtitle">
                Rincian agenda, tim pegawai bertugas, dan status penandatanganan TTE.
              </div>
            </div>

            {/* General Info Grid */}
            <div className="simba-detail-section">
              <div className="simba-detail-section-title">Informasi Umum</div>
              <div className="simba-detail-grid">
                <div className="simba-detail-item">
                  <span className="simba-detail-label">Maksud Tugas</span>
                  <span className="simba-detail-value">{selectedST.deskripsi_tugas || selectedST.maksud_tugas || "-"}</span>
                </div>
                <div className="simba-detail-item">
                  <span className="simba-detail-label">Lokasi / Tujuan</span>
                  <span className="simba-detail-value">{selectedST.lokasi_tugas || selectedST.sarana_nama || "-"}</span>
                </div>
                <div className="simba-detail-item">
                  <span className="simba-detail-label">Tanggal Pelaksanaan</span>
                  <span className="simba-detail-value">
                    {selectedST.tanggal_st
                      ? dayjs(selectedST.tanggal_st).format("DD MMM YYYY")
                      : "-"}
                  </span>
                </div>
                <div className="simba-detail-item">
                  <span className="simba-detail-label">DIPA / MAK</span>
                  <span className="simba-detail-value">{selectedST.mak || "-"}</span>
                </div>
              </div>
            </div>

            {/* Tagged Officers List */}
            <div className="simba-detail-section">
              <div className="simba-detail-section-title">
                Tim Pegawai Ditugaskan ({(selectedST.employees || []).length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(selectedST.employees || []).map((emp, idx) => {
                  const isMe =
                    emp.id === user?.employee_id ||
                    emp.employee_id === user?.employee_id ||
                    emp.nip === user?.nip;

                  return (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        borderRadius: 6,
                        background: isMe ? "#eef2ff" : "#f8fafc",
                        border: "1px solid",
                        borderColor: isMe ? "#c7d2fe" : "#e2e8f0",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <UserOutlined style={{ color: isMe ? "#4f46e5" : "#64748b" }} />
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: isMe ? 700 : 500, color: "#1a1f2e" }}>
                            {emp.name || emp.nama} {isMe ? "(Anda)" : ""}
                          </div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>
                            NIP. {emp.nip || "-"}
                          </div>
                        </div>
                      </div>

                      {isMe && (
                        <Tag color="indigo" style={{ borderRadius: 4, fontSize: 10.5, fontWeight: 600 }}>
                          Ditagging
                        </Tag>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20, paddingTop: 14, borderTop: "1px solid #e2e8f0" }}>
              <Button onClick={() => setDetailModalOpen(false)} style={{ borderRadius: 6 }}>
                Tutup
              </Button>

              <Button
                type="primary"
                icon={<FileProtectOutlined style={{ color: "#ffffff" }} />}
                onClick={() => {
                  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
                  const tokenStr = selectedST.signature_token || selectedST.token || "";
                  const protokolUrl = `${baseUrl.replace(/\/+$/, "")}/public/surat-tugas/${selectedST.id}/protokol-kerja?with_qr=1&token=${tokenStr}`;
                  window.open(protokolUrl, "_blank");
                }}
                style={{ borderRadius: 6, fontWeight: 600, backgroundColor: "#0F5B99", borderColor: "#0F5B99" }}
              >
                Cetak / Lihat Protokol Kerja
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SuratTugasUnifiedModule;
