import { useEffect, useState, useMemo, useCallback } from "react";
import {
  App as AntdApp,
  Button,
  Card,
  Empty,
  Space,
  Typography,
  Spin,
  Row,
  Col,
  Statistic,
  Badge,
  Result,
  Tag,
  Avatar,
  Tooltip,
  Progress,
  Divider,
} from "antd";
import {
  DashboardOutlined,
  PictureOutlined,
  FileProtectOutlined,
  ExportOutlined,
  ShoppingCartOutlined,
  KeyOutlined,
  AlertOutlined,
  AuditOutlined,
  FileTextOutlined,
  CustomerServiceOutlined,
  ArrowRightOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  UserOutlined,
  TeamOutlined,
  CalendarOutlined,
  ThunderboltOutlined,
  FireOutlined,
  RiseOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { useInfoPopup } from "../hooks/useInfoPopup.js";
import InfoPopupModal from "../components/InfoPopupModal.jsx";
import { buildMessageAdapter } from "../utils/notify.js";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import dayjs from "dayjs";
import "dayjs/locale/id";
import "./ValidatorDashboard.css";

dayjs.locale("id");

const { Title, Text, Paragraph } = Typography;

const MODULE_ICONS = {
  surat_tugas: <FileProtectOutlined />,
  izin_keluar: <ExportOutlined />,
  permintaan_persediaan: <ShoppingCartOutlined />,
  peminjaman_aset: <KeyOutlined />,
  pemeliharaan_aset: <AlertOutlined />,
  pengadaan_pdtt: <AuditOutlined />,
  kearsipan_peminjaman: <FileTextOutlined />,
  it_helpdesk: <CustomerServiceOutlined />,
};

const MODULE_PATHS = {
  "kepegawaian-surat-tugas": "/app/kepegawaian-surat-tugas",
  "rispeg-izin-keluar": "/app/rispeg-izin-keluar",
  "bmn-permintaan-persediaan": "/app/bmn-permintaan-persediaan",
  "bmn-peminjaman-aset": "/app/bmn-peminjaman-aset",
  "bmn-pemeliharaan-keluhan": "/app/bmn-pemeliharaan-keluhan",
  "pengadaan-pdtt": "/app/pengadaan-pdtt-rekapan",
  "kearsipan-peminjaman": "/app/kearsipan-peminjaman",
  "it-helpdesk": "/app/it-helpdesk-rekapan",
};

const MODULE_COLORS_MAP = {
  surat_tugas: "#f43f5e",
  izin_keluar: "#8b5cf6",
  permintaan_persediaan: "#f59e0b",
  peminjaman_aset: "#3b82f6",
  pemeliharaan_aset: "#0d9488",
  pengadaan_pdtt: "#6366f1",
  kearsipan_peminjaman: "#06b6d4",
  it_helpdesk: "#10b981",
};

// ── Quick Action Config ────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: "Surat Tugas", path: "/app/kepegawaian-surat-tugas", icon: <FileProtectOutlined />, color: "#f43f5e", bg: "#fff1f2" },
  { label: "Izin Keluar", path: "/app/rispeg-izin-keluar", icon: <ExportOutlined />, color: "#8b5cf6", bg: "#faf5ff" },
  { label: "Arsip", path: "/app/kearsipan-peminjaman", icon: <FileTextOutlined />, color: "#06b6d4", bg: "#ecfeff" },
  { label: "BMN", path: "/app/bmn-peminjaman-aset", icon: <KeyOutlined />, color: "#3b82f6", bg: "#eff6ff" },
  { label: "Persediaan", path: "/app/bmn-permintaan-persediaan", icon: <ShoppingCartOutlined />, color: "#f59e0b", bg: "#fffbeb" },
  { label: "IT Helpdesk", path: "/app/it-helpdesk-rekapan", icon: <CustomerServiceOutlined />, color: "#10b981", bg: "#f0fdf4" },
];

export default function ValidatorDashboard() {
  const { apiFetch, user, currentRole, modules } = useAuth();
  const { message } = AntdApp.useApp();
  const notify = buildMessageAdapter(message);
  const navigate = useNavigate();
  const popup = useInfoPopup();

  const [loading, setLoading] = useState(true);
  const [extraLoading, setExtraLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState([]);

  // Extra data states
  const [activeExits, setActiveExits] = useState([]);
  const [activeSuratTugas, setActiveSuratTugas] = useState([]);
  const [recentItems, setRecentItems] = useState([]);
  const [trendData, setTrendData] = useState([]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiFetch("/validator/dashboard");
      if (!response.ok) throw new Error("Gagal memuat data dashboard.");
      const result = await response.json();
      setDashboardData(result.data || []);
    } catch (err) {
      notify.error({ message: err.message });
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  const fetchExtraData = useCallback(async () => {
    setExtraLoading(true);
    try {
      const today = dayjs().format("YYYY-MM-DD");
      const sevenDaysAgo = dayjs().subtract(7, "day").format("YYYY-MM-DD");

      const [exitsRes, stRes] = await Promise.all([
        apiFetch(`/exit-permits?status=out&limit=20`),
        apiFetch(`/surat-tugas?start_date=${today}&end_date=${today}&limit=20`),
      ]);

      if (exitsRes.ok) {
        const d = await exitsRes.json();
        setActiveExits(Array.isArray(d) ? d : (d.data || []));
      }
      if (stRes.ok) {
        const d = await stRes.json();
        setActiveSuratTugas(Array.isArray(d) ? d : (d.data || []));
      }

      // Build trend data (7 days) from dashboard data as approximation
      const days = [];
      for (let i = 6; i >= 0; i--) {
        days.push({
          label: dayjs().subtract(i, "day").format("ddd DD/MM"),
          pending: Math.floor(Math.random() * 0), // placeholder, will be 0 until we get real API
        });
      }
      setTrendData(days);
    } catch (e) {
      console.error("Extra data fetch failed", e);
    } finally {
      setExtraLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchDashboardData();
    fetchExtraData();
  }, [fetchDashboardData, fetchExtraData]);

  const canManageSlider = useMemo(() => {
    return currentRole === "admin" || (Array.isArray(modules) && modules.some(m => m.slug === "admin-user-management"));
  }, [currentRole, modules]);

  if (currentRole !== "validator" && currentRole !== "admin") {
    return <Result status="403" title="403" subTitle="Maaf, Anda tidak memiliki akses ke halaman Dashboard Validator." />;
  }

  const totalPending = useMemo(() => dashboardData.reduce((acc, curr) => acc + curr.pending, 0), [dashboardData]);

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Selamat Pagi" : hour < 15 ? "Selamat Siang" : hour < 18 ? "Selamat Sore" : "Selamat Malam";

  return (
    <div className="validator-dashboard-page">
      <InfoPopupModal {...popup} />

      {/* ─── Header Section ─────────────────────────────────────── */}
      <div className="module-toolbar" style={{ marginBottom: 16 }}>
        <div>
          <Title level={3} className="module-title">Validator Dashboard</Title>
          <Text className="module-subtitle">
            {greeting}, <strong>{user?.name || "Validator"}</strong>. {totalPending > 0 ? `Ada ${totalPending} berkas menunggu validasi Anda.` : "Semua berkas sudah tervalidasi. Luar biasa! ✅"}
          </Text>
        </div>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => { fetchDashboardData(); fetchExtraData(); }}
            loading={loading}
          >
            Refresh
          </Button>
          {canManageSlider && (
            <Button
              icon={<PictureOutlined />}
              onClick={() => navigate("/app/pengaturan-slider")}
            >
              Studio Slider
            </Button>
          )}
        </Space>
      </div>

      {/* ─── Stat Pills ─────────────────────────────────────────── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {[
          { label: "Total Pending", value: totalPending, color: "#ef4444" },
          { label: "Modul Aktif", value: dashboardData.length, color: "#10b981" },
          { label: "Izin Keluar Aktif", value: activeExits.length, color: "#f59e0b" },
          { label: "Surat Tugas Hari Ini", value: activeSuratTugas.length, color: "#6366f1" },
        ].map(pill => (
          <Col xs={12} sm={6} key={pill.label}>
            <Card variant="borderless" style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8 }} bodyStyle={{ padding: "8px 12px" }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>{pill.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: pill.color, marginTop: 4 }}>{pill.value}</div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* ─── Quick Actions ──────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <Text strong style={{ fontSize: 13, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 10 }}>
          ⚡ Akses Cepat
        </Text>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {QUICK_ACTIONS.map(action => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 16px",
                borderRadius: 10,
                border: `1px solid ${action.color}30`,
                background: action.bg,
                color: action.color,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 4px 12px ${action.color}30`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Modul Validasi + Aktivitas Terbaru ─────────────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {/* Modul Cards */}
        <Col xs={24} lg={14}>
          <Card
            variant="borderless"
            style={{ borderRadius: 14, boxShadow: "0 1px 8px rgba(0,0,0,0.06)", height: "100%" }}
            title={
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 4, height: 18, borderRadius: 2, background: "#4263eb" }} />
                <span style={{ fontWeight: 700 }}>Modul Validasi Aktif</span>
                <Badge count={totalPending} style={{ backgroundColor: "#e03131" }} />
              </div>
            }
          >
            {loading ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <Spin size="large" />
              </div>
            ) : dashboardData.length === 0 ? (
              <Empty description="Antrean verifikasi kosong ✅" />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {dashboardData.map((module, idx) => {
                  const icon = MODULE_ICONS[module.slug?.replace(/-/g, "_")] || <InfoCircleOutlined />;
                  const color = MODULE_COLORS_MAP[module.slug?.replace(/-/g, "_")] || "#4263eb";
                  const path = MODULE_PATHS[module.slug] || "/app/dashboard";
                  return (
                    <div
                      key={idx}
                      onClick={() => navigate(path)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "12px 16px",
                        borderRadius: 12,
                        border: `1px solid ${color}20`,
                        background: `${color}08`,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = "translateX(4px)"; e.currentTarget.style.background = `${color}14`; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = "translateX(0)"; e.currentTarget.style.background = `${color}08`; }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          background: `${color}20`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 18,
                          color: color,
                          flexShrink: 0,
                        }}
                      >
                        {icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text strong style={{ fontSize: 14, display: "block" }}>{module.title}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{module.description || "Klik untuk buka modul"}</Text>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {module.pending > 0 && (
                          <Tag color="red" style={{ borderRadius: 20, fontWeight: 700, fontSize: 14, padding: "2px 10px" }}>
                            {module.pending} tugas
                          </Tag>
                        )}
                        <ArrowRightOutlined style={{ color: "#aaa", fontSize: 13 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </Col>

        {/* Aktivitas Terbaru */}
        <Col xs={24} lg={10}>
          <Card
            variant="borderless"
            style={{ borderRadius: 14, boxShadow: "0 1px 8px rgba(0,0,0,0.06)", height: "100%" }}
            title={
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 4, height: 18, borderRadius: 2, background: "#f59e0b" }} />
                <span style={{ fontWeight: 700 }}>Info Aktif Hari Ini</span>
              </div>
            }
          >
            {/* Pegawai Izin Keluar */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", animation: "ping 1.5s infinite" }} />
                <Text strong style={{ fontSize: 12, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Pegawai Sedang Keluar ({activeExits.length})
                </Text>
              </div>
              {extraLoading ? (
                <Spin size="small" />
              ) : activeExits.length === 0 ? (
                <Text type="secondary" style={{ fontSize: 13 }}>✅ Tidak ada yang sedang keluar</Text>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 160, overflowY: "auto" }}>
                  {activeExits.slice(0, 5).map((exit, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "#fff5f5", borderRadius: 8, border: "1px solid #fecaca" }}>
                      <Avatar size={24} icon={<UserOutlined />} style={{ backgroundColor: "#ef4444", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontSize: 12, fontWeight: 600, display: "block" }} ellipsis>
                          {exit.employee_name || exit.name || "—"}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {exit.exit_time ? dayjs(exit.exit_time).format("HH:mm") : "—"} WITA
                        </Text>
                      </div>
                      <Tag color="red" style={{ fontSize: 10, borderRadius: 4 }}>Keluar</Tag>
                    </div>
                  ))}
                  {activeExits.length > 5 && (
                    <Text type="secondary" style={{ fontSize: 12, textAlign: "center" }}>+{activeExits.length - 5} lainnya</Text>
                  )}
                </div>
              )}
            </div>

            <Divider style={{ margin: "12px 0" }} />

            {/* Surat Tugas Aktif */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <CalendarOutlined style={{ color: "#8b5cf6", fontSize: 13 }} />
                <Text strong style={{ fontSize: 12, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Surat Tugas Hari Ini ({activeSuratTugas.length})
                </Text>
              </div>
              {extraLoading ? (
                <Spin size="small" />
              ) : activeSuratTugas.length === 0 ? (
                <Text type="secondary" style={{ fontSize: 13 }}>Tidak ada surat tugas hari ini</Text>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 160, overflowY: "auto" }}>
                  {activeSuratTugas.slice(0, 4).map((st, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "#faf5ff", borderRadius: 8, border: "1px solid #e9d5ff" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#8b5cf6", flexShrink: 0 }} />
                      <Text style={{ fontSize: 12, flex: 1 }} ellipsis>
                        {st.reference_number || st.nomor_st || st.title || "Surat Tugas"}
                      </Text>
                      <Tag style={{ fontSize: 10, borderRadius: 4, background: "#f3e8ff", color: "#7c3aed", border: "none" }}>
                        {st.employee_count || st.employees?.length || 1} org
                      </Tag>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {/* ─── Tren Validasi 7 Hari ──────────────────────────────── */}
      <Card
        variant="borderless"
        style={{ borderRadius: 14, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 4, height: 18, borderRadius: 2, background: "#10b981" }} />
            <span style={{ fontWeight: 700 }}>Beban Validasi per Modul</span>
          </div>
        }
      >
        {loading ? (
          <Spin size="large" />
        ) : dashboardData.length === 0 ? (
          <Empty description="Belum ada data" />
        ) : (
          <div>
            {/* Bar chart: pending per modul */}
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <BarChart
                  data={dashboardData.map(m => ({
                    name: m.title?.replace("Peminjaman ", "").replace("Permintaan ", ""),
                    Pending: m.pending || 0,
                  }))}
                  margin={{ top: 10, right: 20, left: 0, bottom: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#888" }}
                    angle={-20}
                    textAnchor="end"
                    interval={0}
                    height={50}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#888" }} allowDecimals={false} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                  />
                  <Bar dataKey="Pending" fill="#4263eb" radius={[6, 6, 0, 0]} maxBarSize={48}
                    label={{ position: "top", fontSize: 12, fontWeight: 700, fill: "#4263eb" }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Progress bar per modul */}
            <div style={{ marginTop: 8 }}>
              {dashboardData.map((module, idx) => {
                const color = MODULE_COLORS_MAP[module.slug?.replace(/-/g, "_")] || "#4263eb";
                const pct = totalPending > 0 ? Math.round((module.pending / totalPending) * 100) : 0;
                return (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <Text style={{ fontSize: 12, width: 130, flexShrink: 0, color: "#555" }} ellipsis>{module.title}</Text>
                    <Progress
                      percent={pct}
                      strokeColor={color}
                      trailColor="#f0f0f0"
                      showInfo={false}
                      style={{ flex: 1, margin: 0 }}
                      size="small"
                    />
                    <Text style={{ fontSize: 12, fontWeight: 700, color: color, width: 40, textAlign: "right", flexShrink: 0 }}>
                      {module.pending}
                    </Text>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
