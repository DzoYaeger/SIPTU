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
  Typography,
  message,
  Dropdown,
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
  EditOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "../hooks/useAuth.js";
import SuratTugasForm from "../pages/SuratTugasForm.jsx";
import KepegawaianSuratTugas from "./KepegawaianSuratTugas.jsx";
import suratTugasIcon from "../assets/icons/surat-tugas-icon.png";
import "./SuratTugasUnifiedModule.css";

const SuratTugasUnifiedModule = () => {
  const { user, apiFetch, markMfaSessionActive } = useAuth();
  const [activeTab, setActiveTab] = useState("form"); // 'form' | 'my-assignments' | 'validator'
  const [collapsed, setCollapsed] = useState(false);
  const [customModuleIcon, setCustomModuleIcon] = useState(null);

  // Synchronize custom Layanan Mandiri / sidebar icons dynamically
  useEffect(() => {
    const loadIcon = () => {
      try {
        const storedLayanan = localStorage.getItem("siptu_custom_layanan_icons");
        const storedSidebar = localStorage.getItem("siptu_custom_sidebar_icons");
        const mapL = storedLayanan ? JSON.parse(storedLayanan) : {};
        const mapS = storedSidebar ? JSON.parse(storedSidebar) : {};
        const customUrl = mapL["surat-tugas"] || mapL["surat_tugas"] || mapS["surat-tugas"] || mapS["surat_tugas"] || null;
        setCustomModuleIcon(customUrl);
      } catch (e) {
        console.error("Gagal memuat ikon kustom:", e);
      }
    };
    loadIcon();
    window.addEventListener("siptu_layanan_icons_updated", loadIcon);
    window.addEventListener("siptu_sidebar_icons_updated", loadIcon);
    return () => {
      window.removeEventListener("siptu_layanan_icons_updated", loadIcon);
      window.removeEventListener("siptu_sidebar_icons_updated", loadIcon);
    };
  }, []);

  // My Assignments State
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  // Detail Modal State
  const [selectedST, setSelectedST] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Edit Modal State
  const [editingST, setEditingST] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Re-sign Modal State
  const [reSignST, setReSignST] = useState(null);
  const [reSignModalOpen, setReSignModalOpen] = useState(false);
  const [reSignPassword, setReSignPassword] = useState("");
  const [reSignTotpCode, setReSignTotpCode] = useState("");
  const [reSigning, setReSigning] = useState(false);

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
        <span className="st-history-role-text">
          Pengaju ST <span className="st-history-role-separator">·</span> {isKetua ? "Ketua Tim" : "Petugas"}
        </span>
      );
    }

    if (isCreator) {
      return <span className="st-history-role-text">Pengaju ST</span>;
    }

    if (isKetua) {
      return <span className="st-history-role-text">Ketua Tim</span>;
    }

    return <span className="st-history-role-text">Petugas Ditagging</span>;
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

  // Re-sign TTE Execution
  const executeReSign = async () => {
    if (!reSignST || !reSignPassword) {
      message.warning("Password SIPTU wajib diisi.");
      return;
    }
    try {
      setReSigning(true);
      const res = await apiFetch(`/surat-tugas/${reSignST.id}/re-sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: reSignPassword, totp_code: reSignTotpCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Gagal melakukan tanda tangan ulang.");
      }
      if (reSignTotpCode) {
        markMfaSessionActive?.();
      }
      message.success("Tanda tangan TTE berhasil diperbarui secara sah!");
      setReSignModalOpen(false);
      setReSignST(null);
      setReSignPassword("");
      setReSignTotpCode("");
      fetchMyAssignments();
    } catch (err) {
      message.error(err.message);
    } finally {
      setReSigning(false);
    }
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
          <div className="st-history-metadata">
            {r.lokasi_tugas || r.sarana_nama || "-"}
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
        if (emps.length === 0) return <span className="st-history-metadata">-</span>;
        return (
          <Tooltip
            title={emps.map((e) => e.name || e.nama).join(", ")}
            placement="top"
          >
            <span className="st-history-team-count">{emps.length} pegawai</span>
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
          draft: "Draft",
          pending: "Proses TTE",
          lengkap: "Disetujui / Lengkap",
          selesai: "Selesai",
          rejected: "Ditolak",
        };
        const label = statusMap[val] || val || "Draft";
        return <span className={`st-history-status st-history-status--${val || "default"}`}>{label}</span>;
      },
    },
    {
      title: "Aksi",
      key: "action",
      align: "center",
      render: (_, r) => {
        const canEdit = r.status !== "selesai";
        const items = [
          {
            key: "detail",
            label: "Lihat Detail Surat Tugas",
            icon: <EyeOutlined style={{ color: "#1e293b" }} />,
            onClick: () => handleOpenDetail(r),
          },
        ];

        if (canEdit) {
          items.push({
            key: "edit",
            label: "Edit Data Surat Tugas",
            icon: <EditOutlined style={{ color: "#1e293b" }} />,
            onClick: () => {
              setEditingST(r);
              setEditModalOpen(true);
            },
          });
          items.push({
            key: "resign",
            label: "Tanda Tangan (TTD) Ulang",
            icon: <SafetyCertificateOutlined style={{ color: "#1e293b" }} />,
            onClick: () => {
              setReSignST(r);
              setReSignPassword("");
              setReSignModalOpen(true);
            },
          });
        }

        items.push({
          key: "protokol",
          label: "Buka Protokol Kerja (PDF)",
          icon: <FileProtectOutlined style={{ color: "#1e293b" }} />,
          onClick: () => {
            const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
            const tokenStr = r.signature_token || r.token || "";
            const protokolUrl = `${baseUrl.replace(/\/+$/, "")}/public/surat-tugas/${r.id}/protokol-kerja?with_qr=1&token=${tokenStr}`;
            window.open(protokolUrl, "_blank");
          },
        });

        return (
          <Dropdown menu={{ items }} trigger={["click"]} placement="bottomRight">
            <Button type="text" shape="circle" icon={<MoreOutlined style={{ color: "#475569", fontSize: 16 }} />} />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <div className="st-module">
      <aside className={`st-sidebar ${collapsed ? "st-sidebar--collapsed" : "st-sidebar--expanded"}`} aria-label="Navigasi Surat Tugas">
        <div className={`st-sidebar-header ${collapsed ? "st-sidebar-header--collapsed" : ""}`}>
          <div className={`st-sidebar-header__top ${collapsed ? "st-sidebar-header__top--collapsed" : ""}`}>
            <div className="st-sidebar-brand">
              <div className="st-sidebar-brand__icon" aria-hidden="true">
                <img
                  src={customModuleIcon || suratTugasIcon}
                  alt="Surat Tugas"
                  style={{ width: 34, height: 34, objectFit: "contain" }}
                />
              </div>
              {!collapsed && (
                <div>
                  <h1 className="st-sidebar-brand__title">SURAT TUGAS</h1>
                  <span className="st-sidebar-brand__subtitle">Administrasi perjalanan dinas</span>
                </div>
              )}
            </div>
            <button
              type="button"
              className="st-toggle-btn"
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
              aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
          </div>
          {!collapsed && <p className="st-sidebar-intro">Buat, pantau, dan kelola surat tugas Anda.</p>}
        </div>

        <nav className={`st-sidebar-menu ${collapsed ? "st-sidebar-menu--collapsed" : ""}`}>
          {!collapsed && <div className="st-menu-section-label">Menu utama</div>}
          <div className={`st-menu-group ${collapsed ? "st-menu-group--collapsed" : ""}`}>
            <button
              type="button"
              className={`st-menu-item ${activeTab === "form" ? "st-menu-item--active" : ""} ${collapsed ? "st-menu-item--collapsed" : ""}`}
              onClick={() => setActiveTab("form")}
              title="Pengajuan Surat Tugas Baru"
              aria-current={activeTab === "form" ? "page" : undefined}
            >
              <span className="st-menu-item__icon" aria-hidden="true"><FormOutlined /></span>
              {!collapsed && <span className="st-menu-item__copy"><span className="st-menu-item__text">Pengajuan Baru</span><span className="st-menu-item__hint">Buat surat tugas baru</span></span>}
            </button>
            <button
              type="button"
              className={`st-menu-item ${activeTab === "my-assignments" ? "st-menu-item--active" : ""} ${collapsed ? "st-menu-item--collapsed" : ""}`}
              onClick={() => setActiveTab("my-assignments")}
              title="Riwayat Penugasan Saya"
              aria-current={activeTab === "my-assignments" ? "page" : undefined}
            >
              <span className="st-menu-item__icon" aria-hidden="true"><HistoryOutlined /></span>
              {!collapsed && <span className="st-menu-item__copy"><span className="st-menu-item__text">Riwayat Saya</span><span className="st-menu-item__hint">Lihat semua penugasan</span></span>}
            </button>
          </div>

          {isValidatorOrAdmin && (
            <div className={`st-menu-group ${collapsed ? "st-menu-group--collapsed" : ""}`}>
              {!collapsed && <div className="st-menu-section-label st-menu-section-label--secondary">Administrasi</div>}
              <button
                type="button"
                className={`st-menu-item ${activeTab === "validator" ? "st-menu-item--active" : ""} ${collapsed ? "st-menu-item--collapsed" : ""}`}
                onClick={() => setActiveTab("validator")}
                title="Monitoring & Validasi Surat Tugas"
                aria-current={activeTab === "validator" ? "page" : undefined}
              >
                <span className="st-menu-item__icon" aria-hidden="true"><SafetyCertificateOutlined /></span>
                {!collapsed && <span className="st-menu-item__copy"><span className="st-menu-item__text">Monitoring ST</span><span className="st-menu-item__hint">Validasi dan tindak lanjut</span></span>}
              </button>
            </div>
          )}
        </nav>

        <div className={`st-sidebar-footer ${collapsed ? "st-sidebar-footer--collapsed" : ""}`}>
          <a href="/app/layanan-mandiri" className={`st-back-btn ${collapsed ? "st-back-btn--collapsed" : ""}`} title="Kembali ke Layanan Mandiri">
            <ArrowLeftOutlined aria-hidden="true" />
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
              <div>
                <div className="st-eyebrow">Surat Tugas</div>
                <h2 className="st-history-title">Riwayat Penugasan Saya</h2>
                <p className="st-history-subtitle">Kelola pengajuan surat tugas dan penugasan yang melibatkan Anda.</p>
              </div>
            </div>

            <div className="st-history-card">
              <div className="st-history-toolbar">
                <div className="st-history-search">
                  <Input
                    placeholder="Cari nomor ST, maksud, atau lokasi"
                    prefix={<SearchOutlined aria-hidden="true" />}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    allowClear
                  />
                </div>
                <div className="st-history-filters">
                  <Select
                    value={roleFilter}
                    onChange={(v) => setRoleFilter(v)}
                    aria-label="Filter peran"
                    options={[
                      { label: "Semua Peran", value: "all" },
                      { label: "Pengaju ST", value: "creator" },
                      { label: "Petugas Ditagging", value: "tagged" },
                    ]}
                  />
                  <Select
                    value={statusFilter}
                    onChange={(v) => setStatusFilter(v)}
                    aria-label="Filter status"
                    options={[
                      { label: "Semua Status", value: "all" },
                      { label: "Draft", value: "draft" },
                      { label: "Proses TTE", value: "pending" },
                      { label: "Disetujui", value: "lengkap" },
                      { label: "Selesai", value: "selesai" },
                    ]}
                  />
                </div>
              </div>

              <Table
                dataSource={filteredAssignments}
                columns={columns}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10, showSizeChanger: false }}
                size="middle"
                className="st-history-table"
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

      {/* ── Detail Modal (Clean Microsoft Corporate Style) ── */}
      <Modal
        title={null}
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={null}
        width={640}
        centered
        className="st-custom-modal"
      >
        {selectedST && (
          <div>
            <div className="st-modal-header">
              <div className="st-modal-brand-icon">
                <FileProtectOutlined />
              </div>
              <div>
                <h3 className="st-modal-title">
                  Detail Surat Tugas: {selectedST.nomor_st || `ST-${String(selectedST.id).padStart(6, "0")}`}
                </h3>
                <div className="st-modal-subtitle">
                  Rincian agenda, lokasi, pegawai bertugas, dan status dokumen TTE.
                </div>
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
                  <span className="simba-detail-value">{selectedST.lokasi_tugas || "-"}</span>
                </div>
                {selectedST.sarana_nama && (
                  <div className="simba-detail-item">
                    <span className="simba-detail-label">Sarana / Sasaran</span>
                    <span className="simba-detail-value">{selectedST.sarana_nama}</span>
                  </div>
                )}
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
            <div className="st-modal-footer">
              <Button onClick={() => setDetailModalOpen(false)} style={{ borderRadius: 8 }}>
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
                style={{ borderRadius: 8, fontWeight: 600, backgroundColor: "#4f46e5", borderColor: "#4f46e5" }}
              >
                Cetak / Lihat Protokol Kerja
              </Button>
            </div>
          </div>
        )}
      </Modal>
      {/* Modal Edit Surat Tugas */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: "#fffbe6", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
              <EditOutlined />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Edit Data Surat Tugas</div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 400 }}>{editingST?.nomor_st || `ST #${editingST?.id}`}</div>
            </div>
          </div>
        }
        open={editModalOpen}
        onCancel={() => {
          setEditModalOpen(false);
          setEditingST(null);
        }}
        footer={null}
        width={850}
        destroyOnClose
        centered
      >
        {editingST && (
          <div style={{ padding: "12px 0" }}>
            <SuratTugasForm
              isEmbedded={true}
              editData={editingST}
              onEditSuccess={() => {
                setEditModalOpen(false);
                setEditingST(null);
                fetchMyAssignments();
              }}
              onCancel={() => {
                setEditModalOpen(false);
                setEditingST(null);
              }}
            />
          </div>
        )}
      </Modal>

      {/* Modal TTD Ulang TTE */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
              <SafetyCertificateOutlined />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Tanda Tangan Ulang TTE</div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 400 }}>{reSignST?.nomor_st || `ST #${reSignST?.id}`}</div>
            </div>
          </div>
        }
        open={reSignModalOpen}
        onOk={executeReSign}
        onCancel={() => {
          setReSignModalOpen(false);
          setReSignST(null);
          setReSignPassword("");
          setReSignTotpCode("");
        }}
        confirmLoading={reSigning}
        okText="Tanda Tangan Sekarang"
        cancelText="Batal"
        destroyOnClose
        centered
      >
        <div style={{ padding: "12px 0" }}>
          <p style={{ marginBottom: 14, fontSize: 13, color: "#475569" }}>
            Masukkan <strong>Password SIPTU</strong> dan <strong>Kode MFA</strong> (jika akun mengaktifkan MFA) Anda untuk membubuhkan TTE ulang secara sah pada Surat Tugas ini.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 10 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ minHeight: 32, display: "flex", alignItems: "flex-end", marginBottom: 6 }}>
                <Typography.Text strong style={{ fontSize: 12, color: "#334155" }}>Password SIPTU:</Typography.Text>
              </div>
              <Input.Password
                placeholder="Masukkan Password"
                value={reSignPassword}
                onChange={(e) => setReSignPassword(e.target.value)}
                size="large"
                style={{ borderRadius: 8 }}
                autoFocus
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ minHeight: 32, display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 6 }}>
                <Typography.Text strong style={{ fontSize: 12, color: "#334155" }}>Kode MFA / Recovery:</Typography.Text>
                {user?.mfa_session_active && (
                  <Tag color="success" style={{ margin: 0, fontSize: 10, borderRadius: 12 }}>
                    ✓ Sesi 20m Aktif
                  </Tag>
                )}
              </div>
              <Input
                placeholder={user?.mfa_session_active ? "Opsional (Sesi MFA Aktif)" : "Contoh: 123456"}
                value={reSignTotpCode}
                onChange={(e) => setReSignTotpCode(e.target.value)}
                onPressEnter={executeReSign}
                size="large"
                style={{ borderRadius: 8, fontWeight: 700, letterSpacing: "1px" }}
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SuratTugasUnifiedModule;
