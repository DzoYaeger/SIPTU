import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  App as AntdApp,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Modal,
  Progress,
  Row,
  Select,
  Skeleton,
  Space,
  Statistic,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  AlertOutlined,
  AppstoreOutlined,
  BellOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  FieldTimeOutlined,
  FilePdfOutlined,
  LineChartOutlined,
  ReloadOutlined,
  RocketOutlined,
  SafetyOutlined,
  ShoppingOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  UserOutlined,
  WarningOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import { useAuth } from "../hooks/useAuth.js";
import { useInfoPopup } from "../hooks/useInfoPopup.js";
import InfoPopupModal from "../components/InfoPopupModal.jsx";
import "./AdminDashboard.css";

const { Title, Text } = Typography;

// ── Module Configuration ─────────────────────────────────────────
const MODULE_META = {
  archive: {
    title: "Kearsipan",
    tone: "cyan",
    route: "/app/kearsipan-peminjaman",
    icon: <DatabaseOutlined />,
    gradient: "linear-gradient(135deg, #06b6d4, #0891b2)",
  },
  bmn: {
    title: "BMN",
    tone: "blue",
    route: "/app/bmn-peminjaman-aset",
    icon: <CloudServerOutlined />,
    gradient: "linear-gradient(135deg, #3b82f6, #2563eb)",
  },
  it_helpdesk: {
    title: "IT Helpdesk",
    tone: "green",
    route: "/app/it-helpdesk-pelaporan",
    icon: <AppstoreOutlined />,
    gradient: "linear-gradient(135deg, #22c55e, #16a34a)",
  },
  exit_permit: {
    title: "Izin Keluar",
    tone: "amber",
    route: "/app/rispeg-izin-keluar",
    icon: <FieldTimeOutlined />,
    gradient: "linear-gradient(135deg, #f59e0b, #d97706)",
  },
  surat_tugas: {
    title: "Surat Tugas",
    tone: "rose",
    route: "/app/kepegawaian-surat-tugas",
    icon: <FilePdfOutlined />,
    gradient: "linear-gradient(135deg, #f43f5e, #e11d48)",
  },
};

// ── KPI Config ───────────────────────────────────────────────────
const KPI_CONFIG = [
  { key: "services_total", label: "Total Layanan", suffix: "tiket", icon: <ThunderboltOutlined />, color: "#6366f1" },
  { key: "services_today", label: "Layanan Hari Ini", suffix: "aktivitas", icon: <ClockCircleOutlined />, color: "#0ea5e9" },
  { key: "users_total", label: "Pengguna", suffix: "akun", icon: <UserOutlined />, color: "#8b5cf6" },
  { key: "employees_total", label: "Pegawai", suffix: "orang", icon: <TeamOutlined />, color: "#ec4899" },
  { key: "assets_total", label: "Aset BMN", suffix: "item", icon: <CloudServerOutlined />, color: "#f59e0b" },
  { key: "inventories_total", label: "Persediaan", suffix: "item", icon: <ShoppingOutlined />, color: "#10b981" },
];

function AdminDashboard() {
  const navigate = useNavigate();
  const { user, currentRole, apiFetch } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // Monthly report export states
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportType, setReportType] = useState("monthly"); // monthly, quarterly, yearly, custom
  const [reportMonth, setReportMonth] = useState(dayjs());
  const [reportQuarter, setReportQuarter] = useState(Math.ceil(dayjs().month() / 3));
  const [reportYear, setReportYear] = useState(dayjs());
  const [reportDateRange, setReportDateRange] = useState([dayjs().startOf("month"), dayjs().endOf("month")]);
  const [reportLoading, setReportLoading] = useState(false);
  const { message } = AntdApp.useApp();
  const popup = useInfoPopup();

  // AI Audit states
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditData, setAuditData] = useState(null);

  const fetchAiAudit = async () => {
    setAuditLoading(true);
    try {
      const response = await apiFetch("/admin/ai-audit");
      if (!response.ok) {
        throw new Error("Gagal melakukan audit AI");
      }
      const result = await response.json();
      setAuditData(result);
      message.success("Audit data selesai!");
    } catch (err) {
      message.error(err.message || "Gagal melakukan audit");
    } finally {
      setAuditLoading(false);
    }
  };

  const handleExportReport = async () => {
    setReportLoading(true);
    try {
      let queryStr = `type=${reportType}`;
      let filename = "Laporan_Operasional_SIPTU";

      if (reportType === "quarterly") {
        queryStr += `&quarter=${reportQuarter}&year=${reportYear.format("YYYY")}`;
        filename += `_Triwulan_Q${reportQuarter}_${reportYear.format("YYYY")}`;
      } else if (reportType === "yearly") {
        queryStr += `&year=${reportYear.format("YYYY")}`;
        filename += `_Tahun_${reportYear.format("YYYY")}`;
      } else if (reportType === "custom") {
        const start = reportDateRange[0].format("YYYY-MM-DD");
        const end = reportDateRange[1].format("YYYY-MM-DD");
        queryStr += `&start_date=${start}&end_date=${end}`;
        filename += `_Periode_${reportDateRange[0].format("YYYYMMDD")}_${reportDateRange[1].format("YYYYMMDD")}`;
      } else {
        // monthly
        queryStr += `&month=${reportMonth.format("M")}&year=${reportMonth.format("YYYY")}`;
        filename += `_${reportMonth.format("MMMM_YYYY")}`;
      }

      const response = await apiFetch(
        `/admin/export-report?${queryStr}`,
        { method: "GET", headers: { Accept: "application/pdf" } },
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Gagal membuat laporan");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      message.success("Laporan berhasil diunduh!");
      setReportModalOpen(false);
    } catch (err) {
      message.error(err.message || "Gagal membuat laporan");
    } finally {
      setReportLoading(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiFetch("/admin/command-center");
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "Gagal memuat data command center.");
      }
      const payload = await response.json();
      setData(payload);
    } catch (err) {
      setError(err.message || "Gagal memuat dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const timer = setInterval(fetchDashboard, 60000);
    return () => clearInterval(timer);
  }, []);

  const trendMax = useMemo(() => {
    if (!data?.trends?.series) return 1;
    const values = Object.values(data.trends.series).flat();
    return Math.max(1, ...values);
  }, [data]);

  const trendChartData = useMemo(() => {
    if (!data?.trends?.labels) return [];
    return data.trends.labels.map((label, idx) => ({
      date: dayjs(label).format("DD MMM"),
      Kearsipan: data.trends.series.archive?.[idx] ?? 0,
      BMN: data.trends.series.bmn?.[idx] ?? 0,
      ITHelpdesk: data.trends.series.it_helpdesk?.[idx] ?? 0,
      IzinKeluar: data.trends.series.exit_permit?.[idx] ?? 0,
      SuratTugas: data.trends.series.surat_tugas?.[idx] ?? 0,
    }));
  }, [data]);

  const kpiDetails = useMemo(() => {
    const details = {
      services_total: { target: 1000, rate: "+12.4%", label: "vs bln lalu", positive: true },
      services_today: { target: 20, rate: "+8.2%", label: "vs kemarin", positive: true },
      users_total: { target: 50, rate: "+4.1%", label: "vs bln lalu", positive: true },
      employees_total: { target: 100, rate: "+2.3%", label: "vs bln lalu", positive: true },
      assets_total: { target: 500, rate: "+5.8%", label: "vs bln lalu", positive: true },
      inventories_total: { target: 200, rate: "-1.4%", label: "vs bln lalu", positive: false },
    };
    return details;
  }, []);

  if (currentRole !== "admin") {
    return (
      <Card className="admin-dashboard__guard" variant="borderless">
        <Title level={4}>Akses Terbatas</Title>
        <Text>Dashboard command center hanya tersedia untuk admin.</Text>
        <Button type="primary" style={{ marginTop: 12 }} onClick={() => navigate("/app/layanan-mandiri")}>Buka Layanan Mandiri</Button>
      </Card>
    );
  }

  const alertIcon = (level) => {
    if (level === "warning") return <WarningOutlined style={{ color: "#d97706", marginTop: 2 }} />;
    if (level === "success") return <CheckCircleOutlined style={{ color: "#16a34a", marginTop: 2 }} />;
    return <AlertOutlined style={{ color: "#2563eb", marginTop: 2 }} />;
  };

  return (
    <div className="admin-dashboard">
      <InfoPopupModal {...popup} />
      {/* ─── Header Section ─────────────────────────────────────── */}
      <div className="module-toolbar" style={{ marginBottom: 16 }}>
        <div>
          <Title level={3} className="module-title">Dashboard Administrasi</Title>
          <Text className="module-subtitle">
            Panel analitik lintas modul. Pengguna: <strong>{user?.name ?? "-"}</strong> | Update terakhir: <strong>{data?.generated_at ? new Date(data.generated_at).toLocaleString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Memuat..."}</strong>
          </Text>
        </div>
        <Space wrap>
          <Button
            icon={<FilePdfOutlined />}
            onClick={() => setReportModalOpen(true)}
            danger
            type="primary"
          >
            Cetak Laporan Operasional
          </Button>
          <Button
            icon={<SafetyOutlined />}
            onClick={fetchAiAudit}
            loading={auditLoading}
            type="primary"
            style={{ background: "#4f46e5", borderColor: "#4f46e5" }}
          >
            AI Audit Data
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchDashboard}
            loading={loading}
          >
            Refresh
          </Button>
        </Space>
      </div>

          {/* ─── Report Export Modal ──────────────────────────── */}
          <Modal
            open={reportModalOpen}
            onCancel={() => setReportModalOpen(false)}
            title={
              <Space>
                <FilePdfOutlined style={{ color: "#ef4444" }} />
                <span>Cetak Laporan Operasional SIPTU</span>
              </Space>
            }
            okText={reportLoading ? "Memproses AI..." : "Generate & Download PDF"}
            okButtonProps={{
              loading: reportLoading,
              icon: <FilePdfOutlined />,
              style: { borderRadius: 8, fontWeight: 600 },
            }}
            cancelButtonProps={{ style: { borderRadius: 8 } }}
            onOk={handleExportReport}
            centered
            styles={{ body: { paddingTop: 8 } }}
          >
            <div style={{ padding: "4px 0" }}>
              <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
                Pilih periode laporan. Sistem akan mengumpulkan data dari seluruh modul dan menggunakan <strong>Gemini AI</strong> untuk membuat analisis secara otomatis.
              </Text>
              
              <Tabs
                activeKey={reportType}
                onChange={setReportType}
                type="card"
                items={[
                  {
                    key: "monthly",
                    label: "Bulanan",
                    children: (
                      <div style={{ textAlign: "center", padding: "16px 0" }}>
                        <DatePicker
                          picker="month"
                          value={reportMonth}
                          onChange={(val) => val && setReportMonth(val)}
                          allowClear={false}
                          format="MMMM YYYY"
                          style={{ width: "100%", borderRadius: 8 }}
                          size="large"
                        />
                      </div>
                    ),
                  },
                  {
                    key: "custom",
                    label: "Rentang Tanggal",
                    children: (
                      <div style={{ textAlign: "center", padding: "16px 0" }}>
                        <DatePicker.RangePicker
                          value={reportDateRange}
                          onChange={(val) => val && setReportDateRange(val)}
                          allowClear={false}
                          format="DD MMM YYYY"
                          style={{ width: "100%", borderRadius: 8 }}
                          size="large"
                        />
                      </div>
                    ),
                  },
                  {
                    key: "quarterly",
                    label: "Triwulan",
                    children: (
                      <div style={{ display: "flex", gap: 12, padding: "16px 0" }}>
                        <Select
                          value={reportQuarter}
                          onChange={setReportQuarter}
                          size="large"
                          style={{ flex: 1 }}
                          options={[
                            { value: 1, label: "TW I (Jan - Mar)" },
                            { value: 2, label: "TW II (Apr - Jun)" },
                            { value: 3, label: "TW III (Jul - Sep)" },
                            { value: 4, label: "TW IV (Okt - Des)" },
                          ]}
                        />
                        <DatePicker
                          picker="year"
                          value={reportYear}
                          onChange={(val) => val && setReportYear(val)}
                          allowClear={false}
                          style={{ width: 120, borderRadius: 8 }}
                          size="large"
                        />
                      </div>
                    ),
                  },
                  {
                    key: "yearly",
                    label: "Tahunan",
                    children: (
                      <div style={{ textAlign: "center", padding: "16px 0" }}>
                        <DatePicker
                          picker="year"
                          value={reportYear}
                          onChange={(val) => val && setReportYear(val)}
                          allowClear={false}
                          style={{ width: "100%", borderRadius: 8 }}
                          size="large"
                        />
                      </div>
                    ),
                  },
                ]}
              />

              {reportLoading && (
                <div style={{ marginTop: 12, textAlign: "center" }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    ⏳ Sedang memproses data dan membuat analisis AI...
                    <br />
                    Proses ini memerlukan waktu 10-20 detik.
                  </Text>
                </div>
              )}
            </div>
          </Modal>

      {error && (
        <Alert
          type="error"
          showIcon
          message="Gagal Memuat Data"
          description={error}
          action={<Button size="small" onClick={fetchDashboard}>Coba Lagi</Button>}
          style={{ borderRadius: 12 }}
        />
      )}

      {/* ─── KPI Overview ───────────────────────────────────────── */}
      <Row gutter={[16, 16]}>
        {KPI_CONFIG.map((kpi) => {
          const detail = kpiDetails[kpi.key] || { target: 100, rate: "+0%", label: "vs bln lalu", positive: true };
          const value = data?.overview?.[kpi.key] ?? 0;
          const progressPercent = Math.min(100, Math.round((value / detail.target) * 100));

          return (
            <Col xs={12} md={8} lg={4} key={kpi.key}>
              <Card className="admin-dashboard__kpi" variant="borderless">
                {loading ? (
                  <Skeleton active paragraph={{ rows: 2 }} title={false} />
                ) : (
                  <div className="kpi-card-content">
                    <div className="kpi-card-main">
                      <div className="kpi-card-info">
                        <span className="kpi-card-label">{kpi.label}</span>
                        <div className="kpi-card-value-wrap">
                          <span className="kpi-card-value">{value}</span>
                          <span className="kpi-card-suffix">{kpi.suffix}</span>
                        </div>
                      </div>
                      <div
                        className="kpi-card-icon"
                        style={{
                          background: `${kpi.color}12`,
                          color: kpi.color,
                        }}
                      >
                        {kpi.icon}
                      </div>
                    </div>
                    
                    <div className="kpi-card-meta">
                      <span className={`kpi-card-growth ${detail.positive ? 'positive' : 'negative'}`}>
                        {detail.positive ? <ArrowUpOutlined style={{ marginRight: 2 }} /> : <ArrowDownOutlined style={{ marginRight: 2 }} />} {detail.rate}
                      </span>
                      <span className="kpi-card-growth-label">{detail.label}</span>
                    </div>

                    <div className="kpi-card-progress">
                      <Progress 
                        percent={progressPercent} 
                        showInfo={false} 
                        strokeColor={kpi.color} 
                        size="small"
                        trailColor="rgba(226, 232, 240, 0.4)"
                      />
                    </div>
                  </div>
                )}
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* ─── AI Audit Results ───────────────────────────────────── */}
      {(auditLoading || auditData) && (
        <Card 
          className="admin-dashboard__panel admin-dashboard__panel--ai" 
          variant="borderless"
          style={{ marginTop: 14, background: "linear-gradient(to right, #1e1b4b, #0f172a)", border: "1px solid rgba(99, 102, 241, 0.2)" }}
        >
          {auditLoading ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <ThunderboltOutlined spin style={{ fontSize: 32, color: "#6366f1", marginBottom: 16 }} />
              <Title level={4} style={{ color: "#e2e8f0" }}>Gemini sedang melakukan audit data...</Title>
              <Text type="secondary" style={{ color: "#94a3b8" }}>Menganalisis anomali, beban kerja, dan integritas data seluruh modul.</Text>
            </div>
          ) : (
            <div className="admin-dashboard__ai-content">
              <Row gutter={[24, 24]}>
                <Col xs={24} md={8}>
                  <div style={{ textAlign: "center", padding: "20px", background: "rgba(255,255,255,0.03)", borderRadius: 16 }}>
                    <Progress 
                      type="dashboard" 
                      percent={auditData.status_kesehatan} 
                      strokeColor={{ '0%': '#ef4444', '50%': '#f59e0b', '100%': '#10b981' }} 
                      trailColor="rgba(255,255,255,0.05)"
                      format={(percent) => (
                        <div style={{ color: "#fff" }}>
                          <div style={{ fontSize: 24, fontWeight: 800 }}>{percent}</div>
                          <div style={{ fontSize: 10, opacity: 0.7 }}>HEALTH SCORE</div>
                        </div>
                      )}
                    />
                    <Title level={5} style={{ color: "#fff", marginTop: 12 }}>Status Operasional</Title>
                    <Text style={{ color: "#94a3b8", fontSize: 13 }}>{auditData.ringkasan_eksekutif}</Text>
                  </div>
                </Col>
                <Col xs={24} md={16}>
                  <Title level={4} style={{ color: "#818cf8", marginBottom: 16 }}><SafetyOutlined /> Temuan Audit & Rekomendasi AI</Title>
                  <Row gutter={[12, 12]}>
                    <Col xs={24} sm={12}>
                      <Text strong style={{ color: "#e2e8f0", display: "block", marginBottom: 8 }}>Temuan Utama:</Text>
                      {auditData.temuan_utama?.map((t, i) => (
                        <div key={i} style={{ marginBottom: 10, padding: "8px 12px", background: "rgba(255,255,255,0.05)", borderRadius: 8, borderLeft: `4px solid ${t.level === 'critical' ? '#ef4444' : t.level === 'warning' ? '#f59e0b' : '#3b82f6'}` }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>[{t.modul?.toUpperCase()}] {t.temuan}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>{t.insight}</div>
                        </div>
                      ))}
                    </Col>
                    <Col xs={24} sm={12}>
                      <Text strong style={{ color: "#e2e8f0", display: "block", marginBottom: 8 }}>Rekomendasi Prioritas:</Text>
                      {auditData.rekomendasi_prioritas?.map((r, i) => (
                        <div key={i} style={{ marginBottom: 10, display: "flex", gap: 10 }}>
                          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#4f46e5", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, flexShrink: 0 }}>{i+1}</div>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{r.tindakan}</div>
                            <div style={{ fontSize: 11, color: "#94a3b8" }}>{r.alasan}</div>
                          </div>
                        </div>
                      ))}
                    </Col>
                  </Row>
                  <div style={{ marginTop: 16, padding: "10px", background: "rgba(99, 102, 241, 0.1)", borderRadius: 8 }}>
                    <Text italic style={{ color: "#a5b4fc", fontSize: 12 }}>
                      <ThunderboltOutlined style={{ marginRight: 6 }} />
                      <strong>Beban Kerja:</strong> {auditData.analisis_beban_kerja}
                    </Text>
                  </div>
                </Col>
              </Row>
            </div>
          )}
        </Card>
      )}

      {/* ─── Quick Summary ─────────────────────────────────────── */}
      {!loading && data && (
        <div className="admin-dashboard__summary-grid">
          <div className="admin-dashboard__summary-card">
            <span className="admin-dashboard__summary-value" style={{ color: "#dc2626" }}>
              {Object.values(data?.services ?? {}).reduce((sum, s) => sum + (s.pending ?? 0), 0)}
            </span>
            <span className="admin-dashboard__summary-label">Total Menunggu</span>
          </div>
          <div className="admin-dashboard__summary-card">
            <span className="admin-dashboard__summary-value" style={{ color: "#2563eb" }}>
              {Object.values(data?.services ?? {}).reduce((sum, s) => sum + (s.active ?? 0), 0)}
            </span>
            <span className="admin-dashboard__summary-label">Sedang Aktif</span>
          </div>
          <div className="admin-dashboard__summary-card">
            <span className="admin-dashboard__summary-value" style={{ color: "#16a34a" }}>
              {(() => {
                const vals = Object.values(data?.completion ?? {});
                return vals.length ? `${(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(0)}%` : "0%";
              })()}
            </span>
            <span className="admin-dashboard__summary-label">Rata-rata Selesai</span>
          </div>
        </div>
      )}

      {/* ─── Service Modules + Roles/Alerts ─────────────────────── */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card className="admin-dashboard__panel" variant="borderless">
            <div className="admin-dashboard__panel-head">
              <Title level={4}><AppstoreOutlined style={{ marginRight: 8 }} />Analisis Modul Layanan</Title>
              <Text type="secondary">Status pending, aktif, dan selesai untuk tiap layanan inti.</Text>
            </div>
            {data && (
              <div style={{ width: "100%", height: 350, marginTop: 16 }}>
                <ResponsiveContainer>
                  <BarChart 
                    data={Object.entries(MODULE_META).map(([key, meta]) => {
                      const item = data?.services?.[key] ?? { total: 0, pending: 0, active: 0, completed: 0 };
                      return {
                        name: meta.title,
                        Pending: item.pending,
                        Aktif: item.active,
                        Selesai: item.completed,
                      };
                    })} 
                    margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8, color: '#f8fafc' }}
                      itemStyle={{ color: '#f8fafc' }}
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: 10 }} />
                    <Bar dataKey="Pending" stackId="a" fill="#dc2626" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Aktif" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Selesai" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card className="admin-dashboard__panel" variant="borderless" style={{ height: "100%" }}>
            <div className="admin-dashboard__panel-head">
              <Title level={4}><TeamOutlined style={{ marginRight: 8 }} />Distribusi Role</Title>
              <Text type="secondary">Komposisi pengguna berdasarkan peran akun.</Text>
            </div>
            <div className="admin-dashboard__roles">
              {[
                { label: "Admin", value: data?.roles?.admin ?? 0, icon: <SafetyOutlined />, bg: "#6366f1" },
                { label: "Operator", value: data?.roles?.operator ?? 0, icon: <UserOutlined />, bg: "#0ea5e9" },
                { label: "Validator", value: data?.roles?.validator ?? 0, icon: <CheckCircleOutlined />, bg: "#10b981" },
              ].map((role) => (
                <div className="admin-dashboard__roles-item" key={role.label}>
                  <div className="role-icon" style={{ background: role.bg }}>
                    {role.icon}
                  </div>
                  <div className="role-info">
                    <span className="role-label">{role.label}</span>
                    <span className="role-count">{loading ? "-" : role.value}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="admin-dashboard__alerts-head">
              <BellOutlined /> Alert Operasional
            </div>
            <div className="admin-dashboard__alerts">
              {(data?.alerts ?? []).map((alert, idx) => (
                <div
                  key={`${alert.message}-${idx}`}
                  className={`admin-dashboard__alert-item admin-dashboard__alert-item--${alert.level}`}
                >
                  {alertIcon(alert.level)}
                  <span>{alert.message}</span>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* ─── Trends + Recent Activity ───────────────────────────── */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card className="admin-dashboard__panel" variant="borderless">
            <div className="admin-dashboard__panel-head">
              <Title level={4}><LineChartOutlined style={{ marginRight: 8 }} />Tren Aktivitas 7 Hari</Title>
              <Text type="secondary">Volume aktivitas harian per modul layanan.</Text>
            </div>
            {data?.trends?.labels?.length ? (
              <div style={{ width: "100%", height: 350, marginTop: 16 }}>
                <ResponsiveContainer>
                  <AreaChart data={trendChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorArchive" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorBmn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorItHelpdesk" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExitPermit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorSuratTugas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(226, 232, 240, 0.3)" vertical={false} />
                    <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8, color: '#f8fafc', fontSize: 12 }}
                      itemStyle={{ color: '#f8fafc' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                    <Area type="monotone" dataKey="Kearsipan" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorArchive)" />
                    <Area type="monotone" dataKey="BMN" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorBmn)" />
                    <Area type="monotone" dataKey="ITHelpdesk" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorItHelpdesk)" name="IT Helpdesk" />
                    <Area type="monotone" dataKey="IzinKeluar" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorExitPermit)" name="Izin Keluar" />
                    <Area type="monotone" dataKey="SuratTugas" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorSuratTugas)" name="Surat Tugas" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <Empty description="Belum ada data tren" />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card className="admin-dashboard__panel" variant="borderless" style={{ height: "100%" }}>
            <div className="admin-dashboard__panel-head">
              <Title level={4}><RocketOutlined style={{ marginRight: 8 }} />Aktivitas Terbaru</Title>
              <Text type="secondary">12 aktivitas terbaru lintas modul layanan.</Text>
            </div>
            <div className="admin-dashboard__activity-list">
              {(data?.recent_activities ?? []).length ? (
                data.recent_activities.map((item, idx) => {
                  const moduleMeta = MODULE_META[item.module];
                  return (
                    <div className="admin-dashboard__activity-item" key={`${item.module}-${item.ticket}-${idx}`}>
                      <div className={`admin-dashboard__activity-dot admin-dashboard__activity-dot--${item.module}`} />
                      <div className="admin-dashboard__activity-body">
                        <div className="admin-dashboard__activity-ticket">{item.ticket}</div>
                        <div className="admin-dashboard__activity-desc">{item.description}</div>
                      </div>
                      <div className="admin-dashboard__activity-meta">
                        <Tag
                          style={{
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            margin: 0,
                          }}
                          color={
                            item.module === "archive" ? "cyan"
                            : item.module === "bmn" ? "blue"
                            : item.module === "it_helpdesk" ? "green"
                            : item.module === "surat_tugas" ? "magenta"
                            : "gold"
                          }
                        >
                          {moduleMeta?.title || item.module}
                        </Tag>
                        <span>
                          {item.created_at
                            ? new Date(item.created_at).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "-"}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <Empty description="Belum ada aktivitas" />
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default AdminDashboard;
