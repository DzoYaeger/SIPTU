import {
  App as AntdApp,
  Card,
  Typography,
  Row,
  Col,
  Avatar,
  DatePicker,
  Tag,
  Progress,
  Button,
  Spin,
  Collapse,
  Badge,
  Timeline,
  Tooltip,
  Empty,
  Table,
  Divider,
} from "antd";
import {
  UserOutlined,
  DownloadOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
  AlertOutlined,
  TeamOutlined,
  RiseOutlined,
  FallOutlined,
  FireOutlined,
  TrophyOutlined,
  DashboardOutlined,
  ApartmentOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { useEffect, useState, useCallback, useMemo } from "react";
import dayjs from "dayjs";
import { useAuth } from "../hooks/useAuth.js";
import { buildMessageAdapter } from "../utils/notify.js";

// ── Color & Style Constants ──────────────────────────────────────────
const VIOLATION_TYPES = [
  {
    key: "late",
    label: "Terlambat Masuk",
    icon: <ClockCircleOutlined />,
    color: "#f97316", // Amber/Orange
    bg: "#fff7ed",
    hasMins: true,
    countKey: "total_late_entries",
    minKey: "total_late_minutes",
  },
  {
    key: "earlyExit",
    label: "Pulang Cepat",
    icon: <FallOutlined />,
    color: "#10b981", // Emerald
    bg: "#f0fdfa",
    hasMins: true,
    countKey: "total_early_exits",
    minKey: "total_early_minutes",
  },
  {
    key: "uniform",
    label: "Tidak Berseragam",
    icon: <SafetyCertificateOutlined />,
    color: "#3b82f6", // Blue
    bg: "#eff6ff",
    hasMins: false,
    countKey: "total_uniform_violations",
    minKey: null,
  },
  {
    key: "assembly",
    label: "terlambat Absen Apel pagi",
    icon: <ApartmentOutlined />,
    color: "#8b5cf6", // Purple
    bg: "#f5f3ff",
    hasMins: false,
    countKey: "total_assembly_violations",
    minKey: null,
  },
  {
    key: "missedIn",
    label: "Lupa Absen Masuk",
    icon: <ExclamationCircleOutlined />,
    color: "#06b6d4", // Cyan
    bg: "#ecfeff",
    hasMins: false,
    countKey: "total_missed_checkins",
    minKey: null,
  },
  {
    key: "missedOut",
    label: "Lupa Absen Pulang",
    icon: <WarningOutlined />,
    color: "#f43f5e", // Rose
    bg: "#fff1f2",
    hasMins: false,
    countKey: "total_missed_checkouts",
    minKey: null,
  },
];

const VIOLATION_CONFIG = {
  "Terlambat Masuk": { color: "#f97316", bg: "#fff7ed", icon: <ClockCircleOutlined /> },
  "Pulang Cepat":    { color: "#10b981", bg: "#f0fdfa", icon: <FallOutlined /> },
  "Tidak Berseragam":{ color: "#3b82f6", bg: "#eff6ff", icon: <SafetyCertificateOutlined /> },
  "terlambat Absen Apel":{ color: "#8b5cf6", bg: "#f5f3ff", icon: <ApartmentOutlined /> },
  "Lupa Absen Masuk":{ color: "#06b6d4", bg: "#ecfeff", icon: <ExclamationCircleOutlined /> },
  "Lupa Absen Pulang":{ color: "#f43f5e", bg: "#fff1f2", icon: <WarningOutlined /> },
};

const getViolationStyle = (text) => {
  for (const [key, style] of Object.entries(VIOLATION_CONFIG)) {
    if (text.startsWith(key)) return style;
  }
  return { color: "#ef4444", bg: "#fef2f2", icon: <ExclamationCircleOutlined /> };
};

// ── Violation Summary Card ───────────────────────────────────────────
const ViolationCard = ({ type, totalCount, totalMins }) => {
  const accentColor = type.color;
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 12,
        padding: "16px 18px",
        position: "relative",
        height: "100%",
        border: "1px solid #e2e8f0",
        borderLeft: `4px solid ${accentColor}`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        cursor: "default",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(0,0,0,0.05)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
      }}
    >
      <div>
        {/* Icon & Label row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: `${accentColor}15`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              color: accentColor,
              flexShrink: 0,
            }}
          >
            {type.icon}
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#475569", // slate-600
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {type.label}
          </div>
        </div>

        {/* Count */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: type.hasMins ? 8 : 0 }}>
          <span style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>
            {totalCount}
          </span>
          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
            kali
          </span>
        </div>
      </div>

      {/* Duration (only for terlambat & pulang cepat) */}
      {type.hasMins && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            background: `${accentColor}10`,
            borderRadius: 6,
            padding: "4px 8px",
            alignSelf: "flex-start",
            marginTop: 8,
            maxWidth: "100%",
          }}
        >
          <ClockCircleOutlined style={{ fontSize: 10, color: accentColor }} />
          <span style={{ fontSize: 11, color: accentColor, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {Number(totalMins).toFixed(2)} mnt
          </span>
        </div>
      )}
    </div>
  );
};

// ── Overview Stat Card ───────────────────────────────────────────────
const StatCard = ({ icon, title, value, suffix, name, color, small }) => {
  const accentColor = color || "#4263eb";
  return (
    <Card
      variant="borderless"
      style={{
        borderRadius: 12,
        height: "100%",
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderTop: `3px solid ${accentColor}`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        overflow: "hidden",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
      styles={{ body: { padding: small ? "14px 12px" : "16px 14px", position: "relative" } }}
    >
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", minHeight: 88 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Typography.Text 
              style={{ 
                fontSize: 10, 
                color: "#64748b", 
                fontWeight: 700, 
                display: "block", 
                marginBottom: 6, 
                textTransform: "uppercase", 
                letterSpacing: "0.5px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}
            >
              {title}
            </Typography.Text>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, flexWrap: "wrap" }}>
              <span style={{ fontSize: small ? 20 : 24, fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
                {value}
              </span>
              <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>{suffix}</span>
            </div>
          </div>
          
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: `${accentColor}15`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 15,
              color: accentColor,
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
        </div>

        {name && (
          <Tooltip title={name} placement="top">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                padding: "4px 8px",
                marginTop: 10,
                maxWidth: "100%",
                cursor: "pointer",
              }}
            >
              <TrophyOutlined style={{ color: accentColor, fontSize: 11, flexShrink: 0 }} />
              <span
                style={{
                  fontSize: 10.5,
                  color: "#475569",
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                }}
              >
                {name}
              </span>
            </div>
          </Tooltip>
        )}
      </div>
    </Card>
  );
};

// ── Distribution Bar ─────────────────────────────────────────────────
const DistributionBar = ({ data, total }) => {
  if (total === 0) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Belum ada data pelanggaran bulan ini" />;
  return (
    <div>
      {/* Stacked bar */}
      <div style={{ display: "flex", borderRadius: 10, overflow: "hidden", height: 24, marginBottom: 20, background: "#f0f0f0" }}>
        {data.filter(d => d.value > 0).map((item) => (
          <Tooltip key={item.name} title={`${item.name}: ${item.value} (${((item.value / total) * 100).toFixed(1)}%)`}>
            <div
              style={{
                width: `${(item.value / total) * 100}%`,
                background: item.color,
                transition: "width 0.6s ease",
                minWidth: item.value > 0 ? 4 : 0,
                cursor: "pointer",
              }}
            />
          </Tooltip>
        ))}
      </div>
      {/* Legend grid */}
      <Row gutter={[10, 10]}>
        {data.map((item) => (
          <Col xs={12} sm={8} key={item.name}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                background: "#fafafa",
                borderRadius: 10,
                borderLeft: `3px solid ${item.color}`,
                border: `1px solid ${item.color}20`,
                borderLeftWidth: 3,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <Typography.Text style={{ fontSize: 10, color: "#888", display: "block", marginBottom: 2, fontWeight: 500 }}>
                  {item.name}
                </Typography.Text>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: item.color }}>{item.value}</span>
                  <span style={{ fontSize: 11, color: "#bbb" }}>
                    ({total > 0 ? ((item.value / total) * 100).toFixed(0) : 0}%)
                  </span>
                </div>
                {item.mins != null && item.mins > 0 && (
                  <span style={{ fontSize: 10, color: "#999" }}>{item.mins} menit</span>
                )}
              </div>
            </div>
          </Col>
        ))}
      </Row>
    </div>
  );
};

// ── Top Violators List ───────────────────────────────────────────────
const TopViolatorsList = ({ data, maxPoints }) => {
  if (!data || data.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Belum ada data pelanggaran" />;
  }

  const medalColors = ["#f59f00", "#adb5bd", "#e67700", "#868e96", "#868e96"];
  const medalLabels = ["🥇", "🥈", "🥉", "4", "5"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {data.map((item, idx) => (
        <div
          key={item.employee_id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 14px",
            background: idx === 0 ? "linear-gradient(135deg, #fff5f5 0%, #ffe3e3 100%)" : "#fafafa",
            borderRadius: 12,
            border: idx === 0 ? "1px solid #ffc9c9" : "1px solid #f0f0f0",
            transition: "all 0.2s ease",
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: idx < 3 ? 16 : 12,
              fontWeight: 700,
              color: medalColors[idx],
              flexShrink: 0,
            }}
          >
            {medalLabels[idx]}
          </div>
          <Avatar size={34} icon={<UserOutlined />} style={{ backgroundColor: "#4263eb", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Typography.Text strong style={{ fontSize: 13, display: "block", marginBottom: 4 }} ellipsis>
              {item.name}
            </Typography.Text>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {item.total_late_entries > 0 && (
                <span style={{ fontSize: 10, background: "#fff4e6", color: "#ff6b35", padding: "1px 6px", borderRadius: 4, border: "1px solid #ffd8b7" }}>
                  ⏰ {item.total_late_entries}× terlambat
                </span>
              )}
              {item.total_uniform_violations > 0 && (
                <span style={{ fontSize: 10, background: "#e7f5ff", color: "#228be6", padding: "1px 6px", borderRadius: 4, border: "1px solid #bde0ff" }}>
                  👕 {item.total_uniform_violations}× seragam
                </span>
              )}
              {item.total_assembly_violations > 0 && (
                <span style={{ fontSize: 10, background: "#f3f0ff", color: "#ae3ec9", padding: "1px 6px", borderRadius: 4, border: "1px solid #e3d0ff" }}>
                  📋 {item.total_assembly_violations}× apel
                </span>
              )}
              {(item.total_missed_checkins > 0 || item.total_missed_checkouts > 0) && (
                <span style={{ fontSize: 10, background: "#e3fafc", color: "#0c8599", padding: "1px 6px", borderRadius: 4, border: "1px solid #b3e5ec" }}>
                  📵 {item.total_missed_checkins + item.total_missed_checkouts}× lupa absen
                </span>
              )}
            </div>
            <div style={{ marginTop: 6 }}>
              <Progress
                percent={maxPoints > 0 ? (item.total_points / maxPoints) * 100 : 0}
                showInfo={false}
                strokeColor={{ "0%": "#ffa8a8", "100%": "#e03131" }}
                style={{ margin: 0 }}
                size="small"
              />
            </div>
          </div>
          <Tag
            color="red"
            style={{ borderRadius: 20, fontWeight: 800, fontSize: 14, padding: "2px 10px", margin: 0, minWidth: 40, textAlign: "center" }}
          >
            {item.total_points}
          </Tag>
        </div>
      ))}
    </div>
  );
};

// ── Employee Summary Table ───────────────────────────────────────────
const EmployeeSummaryTable = ({ data }) => {
  if (!data || data.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Tidak ada pelanggaran pada periode ini" />;
  }

  const columns = [
    {
      title: "Nama Pegawai",
      dataIndex: "name",
      key: "name",
      render: (text) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Avatar size={28} icon={<UserOutlined />} style={{ backgroundColor: "#4263eb", flexShrink: 0 }} />
          <Typography.Text strong style={{ fontSize: 13 }}>{text}</Typography.Text>
        </div>
      ),
      fixed: "left",
      width: 200,
    },
    {
      title: () => (
        <div style={{ textAlign: "center", color: "#ff6b35" }}>
          <div>⏰ Terlambat</div>
          <div style={{ fontSize: 10, fontWeight: 400, color: "#999" }}>kali / menit</div>
        </div>
      ),
      key: "late",
      align: "center",
      width: 120,
      render: (_, r) => r.total_late_entries > 0 ? (
        <div style={{ textAlign: "center" }}>
          <span style={{ fontWeight: 700, color: "#ff6b35", fontSize: 15 }}>{r.total_late_entries}×</span>
          <div style={{ fontSize: 11, color: "#999" }}>{Number(r.total_late_minutes).toFixed(2)} mnt</div>
        </div>
      ) : <span style={{ color: "#ccc" }}>—</span>,
      sorter: (a, b) => a.total_late_entries - b.total_late_entries,
    },
    {
      title: () => (
        <div style={{ textAlign: "center", color: "#20c997" }}>
          <div>🚪 Pulang Cepat</div>
          <div style={{ fontSize: 10, fontWeight: 400, color: "#999" }}>kali / menit</div>
        </div>
      ),
      key: "earlyExit",
      align: "center",
      width: 130,
      render: (_, r) => r.total_early_exits > 0 ? (
        <div style={{ textAlign: "center" }}>
          <span style={{ fontWeight: 700, color: "#20c997", fontSize: 15 }}>{r.total_early_exits}×</span>
          <div style={{ fontSize: 11, color: "#999" }}>{Number(r.total_early_minutes).toFixed(2)} mnt</div>
        </div>
      ) : <span style={{ color: "#ccc" }}>—</span>,
      sorter: (a, b) => a.total_early_exits - b.total_early_exits,
    },
    {
      title: () => <div style={{ textAlign: "center", color: "#4dabf7" }}>👕 Seragam</div>,
      dataIndex: "total_uniform_violations",
      key: "uniform",
      align: "center",
      width: 100,
      render: (v) => v > 0 ? <span style={{ fontWeight: 700, color: "#4dabf7", fontSize: 15 }}>{v}×</span> : <span style={{ color: "#ccc" }}>—</span>,
      sorter: (a, b) => a.total_uniform_violations - b.total_uniform_violations,
    },
    {
      title: () => <div style={{ textAlign: "center", color: "#cc5de8" }}>📋 Apel</div>,
      dataIndex: "total_assembly_violations",
      key: "assembly",
      align: "center",
      width: 90,
      render: (v) => v > 0 ? <span style={{ fontWeight: 700, color: "#cc5de8", fontSize: 15 }}>{v}×</span> : <span style={{ color: "#ccc" }}>—</span>,
      sorter: (a, b) => a.total_assembly_violations - b.total_assembly_violations,
    },
    {
      title: () => <div style={{ textAlign: "center", color: "#22b8cf" }}>🔓 Lupa Absen Masuk</div>,
      dataIndex: "total_missed_checkins",
      key: "missedIn",
      align: "center",
      width: 140,
      render: (v) => v > 0 ? <span style={{ fontWeight: 700, color: "#22b8cf", fontSize: 15 }}>{v}×</span> : <span style={{ color: "#ccc" }}>—</span>,
      sorter: (a, b) => a.total_missed_checkins - b.total_missed_checkins,
    },
    {
      title: () => <div style={{ textAlign: "center", color: "#f06595" }}>🔐 Lupa Absen Pulang</div>,
      dataIndex: "total_missed_checkouts",
      key: "missedOut",
      align: "center",
      width: 145,
      render: (v) => v > 0 ? <span style={{ fontWeight: 700, color: "#f06595", fontSize: 15 }}>{v}×</span> : <span style={{ color: "#ccc" }}>—</span>,
      sorter: (a, b) => a.total_missed_checkouts - b.total_missed_checkouts,
    },
    {
      title: () => <div style={{ textAlign: "center" }}>🎯 Total Poin</div>,
      dataIndex: "total_points",
      key: "points",
      align: "center",
      width: 100,
      render: (v) => (
        <Tag
          color={v >= 4 ? "red" : v >= 2 ? "orange" : "default"}
          style={{ fontWeight: 800, fontSize: 14, padding: "2px 10px", borderRadius: 20 }}
        >
          {v}
        </Tag>
      ),
      defaultSortOrder: "descend",
      sorter: (a, b) => a.total_points - b.total_points,
    },
  ];

  return (
    <Table
      dataSource={data}
      columns={columns}
      rowKey="employee_id"
      size="middle"
      pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `${t} pegawai` }}
      scroll={{ x: 900 }}
      rowClassName={(record) =>
        record.total_points >= 4 ? "table-row-high" : record.total_points >= 2 ? "table-row-medium" : ""
      }
    />
  );
};

// ════════════════════════════════════════════════════════════════════
// ██  MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════
const RispegDashboard = () => {
  const { apiFetch } = useAuth();
  const { message } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);

  const [date, setDate] = useState(dayjs());
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");

  const fetchStats = useCallback(
    async (selectedDate) => {
      setLoading(true);
      try {
        const month = selectedDate.format("M");
        const year = selectedDate.format("YYYY");
        const response = await apiFetch(
          `/rispeg/dashboard-stats?month=${month}&year=${year}`,
        );
        if (!response.ok) throw new Error("Gagal mengambil data statistik");
        const result = await response.json();
        setStats(result);
      } catch (error) {
        notification.error({ message: "Error", description: error.message });
      } finally {
        setLoading(false);
      }
    },
    [apiFetch],
  );

  useEffect(() => {
    fetchStats(date);
  }, [date, fetchStats]);

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const month = date.format("M");
      const year = date.format("YYYY");
      const response = await apiFetch(
        `/rispeg/export-pdf?month=${month}&year=${year}`,
        { method: "GET", headers: { Accept: "application/pdf" } },
      );
      if (!response.ok) throw new Error("Gagal mengunduh laporan PDF");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Laporan_Monitoring_Rispeg_${date.format("MMMM_YYYY")}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      message.success("Laporan berhasil diunduh");
    } catch (error) {
      notification.error({ message: "Gagal Download", description: error.message });
    } finally {
      setDownloading(false);
    }
  };

  // ── Computed Aggregates ─────────────────────────────────────────
  const allStats = useMemo(() => stats?.all_stats || [], [stats]);

  // Monthly total per violation type
  const monthlyTotals = useMemo(() => {
    const totals = {};
    VIOLATION_TYPES.forEach(vt => {
      totals[vt.countKey] = allStats.reduce((a, c) => a + (c[vt.countKey] || 0), 0);
      if (vt.minKey) {
        totals[vt.minKey] = allStats.reduce((a, c) => a + (c[vt.minKey] || 0), 0);
      }
    });
    return totals;
  }, [allStats]);

  const violationDistribution = useMemo(() => {
    return VIOLATION_TYPES.map(vt => ({
      name: vt.label,
      value: monthlyTotals[vt.countKey] || 0,
      mins: vt.minKey ? (monthlyTotals[vt.minKey] || 0) : null,
      color: vt.color,
    })).sort((a, b) => b.value - a.value);
  }, [monthlyTotals]);

  const totalViolations = useMemo(
    () => violationDistribution.reduce((a, c) => a + c.value, 0),
    [violationDistribution],
  );

  const topViolators = useMemo(() => allStats.slice(0, 5), [allStats]);
  const maxPoints = topViolators[0]?.total_points || 1;

  const totalEmployeesWithViolations = useMemo(
    () => allStats.filter((e) => e.total_points > 0).length,
    [allStats],
  );

  // Employees with violations for table
  const employeesWithViolations = useMemo(
    () => allStats.filter((e) => e.total_points > 0),
    [allStats],
  );

  // Grouped daily violations for the Collapse section
  const groupedViolations = useMemo(() => {
    const grouped = (stats?.daily_violations || []).reduce((acc, item) => {
      const key = item.employee_id;
      if (!acc[key]) {
        acc[key] = {
          employee_id: item.employee_id,
          employee_name: item.employee_name,
          violations: [],
        };
      }
      acc[key].violations.push({ date: item.date, details: item.violation_details });
      return acc;
    }, {});
    return Object.values(grouped).sort((a, b) => b.violations.length - a.violations.length);
  }, [stats]);

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="module-section">
      <style>{`
        .table-row-high { background: #fff5f5 !important; }
        .table-row-medium { background: #fffbf0 !important; }
        .rispeg-tab-btn {
          padding: 8px 18px;
          border-radius: 8px;
          border: 1px solid #e8e8e8;
          background: #fff;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          color: #555;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .rispeg-tab-btn:hover {
          border-color: #4263eb;
          color: #4263eb;
        }
        .rispeg-tab-btn.active {
          background: #4263eb;
          border-color: #4263eb;
          color: #fff;
          box-shadow: 0 4px 12px #4263eb44;
        }
      `}</style>

      <Spin spinning={loading} tip="Memuat Data Monitoring..." size="large">
        <div style={{ filter: loading ? "blur(4px)" : "none", transition: "filter 0.3s ease" }}>

          {/* ─── Header ─────────────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 24,
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: "linear-gradient(135deg, #4263eb, #364fc7)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    color: "#fff",
                  }}
                >
                  <DashboardOutlined />
                </div>
                <Typography.Title level={3} style={{ margin: 0, fontWeight: 800 }}>
                  Monitoring Rispeg
                </Typography.Title>
              </div>
              <Typography.Text type="secondary" style={{ fontSize: 13, marginLeft: 48 }}>
                Rekap pelanggaran disiplin pegawai periode{" "}
                <strong style={{ color: "#4263eb" }}>{date.format("MMMM YYYY")}</strong>
              </Typography.Text>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <DatePicker
                picker="month"
                value={date}
                onChange={setDate}
                allowClear={false}
                format="MMMM YYYY"
                style={{ width: 180, borderRadius: 8 }}
              />
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleDownloadPdf}
                loading={downloading}
                style={{ borderRadius: 8, fontWeight: 600, background: "#4263eb", borderColor: "#4263eb" }}
              >
                Export PDF
              </Button>
            </div>
          </div>

          {/* ─── Overview Quick Stats ────────────────────────────── */}
          <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
            <Col xs={12} sm={8} md={6} lg={4}>
              <StatCard
                icon={<FireOutlined />}
                title="Total Pelanggaran"
                value={totalViolations}
                suffix="kejadian"
                color="#ef4444"
              />
            </Col>
            <Col xs={12} sm={8} md={6} lg={4}>
              <StatCard
                icon={<TeamOutlined />}
                title="Pegawai Bermasalah"
                value={totalEmployeesWithViolations}
                suffix="orang"
                color="#f97316"
              />
            </Col>
            <Col xs={12} sm={8} md={6} lg={4}>
              <StatCard
                icon={<AlertOutlined />}
                title="Ticket Tertinggi"
                value={stats?.summary?.top_points?.total_points || 0}
                suffix="poin"
                name={stats?.summary?.top_points?.name}
                color="#d946ef"
              />
            </Col>
            <Col xs={12} sm={8} md={6} lg={4}>
              <StatCard
                icon={<ClockCircleOutlined />}
                title="Total Menit Terlambat"
                value={monthlyTotals.total_late_minutes || 0}
                suffix="menit"
                color="#eab308"
              />
            </Col>
            <Col xs={12} sm={8} md={6} lg={4}>
              <StatCard
                icon={<RiseOutlined />}
                title="Terlambat Terbanyak"
                value={stats?.summary?.most_late_entries?.total_late_entries || 0}
                suffix="kali"
                name={stats?.summary?.most_late_entries?.name}
                color="#f43f5e"
              />
            </Col>
            <Col xs={12} sm={8} md={6} lg={4}>
              <StatCard
                icon={<FallOutlined />}
                title="Pulang Cepat Terbanyak"
                value={stats?.summary?.most_early_exits?.total_early_exits || 0}
                suffix="kali"
                name={stats?.summary?.most_early_exits?.name}
                color="#10b981"
              />
            </Col>
          </Row>

          {/* ─── SECTION TITLE: Rangkuman per Jenis Pelanggaran ─── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 14,
              marginTop: 8,
            }}
          >
            <div style={{ width: 4, height: 20, borderRadius: 2, background: "linear-gradient(#4263eb, #7048e8)" }} />
            <Typography.Title level={5} style={{ margin: 0, fontWeight: 700 }}>
              Rangkuman Pelanggaran Bulan {date.format("MMMM YYYY")}
            </Typography.Title>
            <Tag color="blue" style={{ borderRadius: 20, fontWeight: 600 }}>
              Total: {totalViolations} kejadian
            </Tag>
          </div>

          {/* ─── Violation Type Cards ────────────────────────────── */}
          <Row gutter={[14, 14]} style={{ marginBottom: 24 }}>
            {VIOLATION_TYPES.map((vt) => (
              <Col xs={12} sm={8} md={8} lg={4} key={vt.key}>
                <ViolationCard
                  type={vt}
                  totalCount={monthlyTotals[vt.countKey] || 0}
                  totalMins={vt.minKey ? (monthlyTotals[vt.minKey] || 0) : null}
                />
              </Col>
            ))}
          </Row>

          {/* ─── Distribution + Top Violators ───────────────────── */}
          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col xs={24} lg={14}>
              <Card
                title={
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 4, height: 18, borderRadius: 2, background: "#4263eb" }} />
                    <span style={{ fontWeight: 600 }}>Distribusi Jenis Pelanggaran</span>
                  </div>
                }
                variant="borderless"
                style={{ borderRadius: 14, height: "100%", boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
              >
                <DistributionBar data={violationDistribution} total={totalViolations} />
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card
                title={
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 4, height: 18, borderRadius: 2, background: "#e03131" }} />
                    <span style={{ fontWeight: 600 }}>Top 5 Pelanggar</span>
                  </div>
                }
                variant="borderless"
                style={{ borderRadius: 14, height: "100%", boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
              >
                <TopViolatorsList data={topViolators} maxPoints={maxPoints} />
              </Card>
            </Col>
          </Row>

          {/* ─── Tab Toggle: Tabel Rekapitulasi & Detail Harian ── */}
          <Card
            variant="borderless"
            style={{ borderRadius: 14, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
            title={
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 4, height: 18, borderRadius: 2, background: "#e8590c" }} />
                  <span style={{ fontWeight: 600 }}>
                    {activeTab === "summary" ? "Rekapitulasi Per Pegawai" : "Detail Pelanggaran Harian"}
                  </span>
                  <Badge
                    count={activeTab === "summary" ? totalEmployeesWithViolations : groupedViolations.length}
                    style={{ backgroundColor: "#e03131", boxShadow: "none" }}
                  />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className={`rispeg-tab-btn ${activeTab === "summary" ? "active" : ""}`}
                    onClick={() => setActiveTab("summary")}
                  >
                    <EyeOutlined /> Tabel Rekap
                  </button>
                  <button
                    className={`rispeg-tab-btn ${activeTab === "daily" ? "active" : ""}`}
                    onClick={() => setActiveTab("daily")}
                  >
                    <CalendarOutlined /> Detail Harian
                  </button>
                </div>
              </div>
            }
          >
            {/* ── TABEL REKAPITULASI ── */}
            {activeTab === "summary" && (
              <EmployeeSummaryTable data={employeesWithViolations} />
            )}

            {/* ── DETAIL HARIAN ── */}
            {activeTab === "daily" && (
              groupedViolations.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Tidak ada pelanggaran pada periode ini"
                />
              ) : (
                <Collapse
                  accordion
                  bordered={false}
                  style={{ background: "transparent" }}
                  items={groupedViolations.map((emp) => {
                    // Count violations summary for this employee
                    const violCount = emp.violations.length;
                    return {
                      key: emp.employee_id,
                      label: (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            width: "100%",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <Avatar
                              icon={<UserOutlined />}
                              style={{ backgroundColor: "#4263eb", flexShrink: 0 }}
                            />
                            <div>
                              <Typography.Text strong style={{ fontSize: 14, display: "block" }}>
                                {emp.employee_name}
                              </Typography.Text>
                              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                {violCount} hari dengan pelanggaran
                              </Typography.Text>
                            </div>
                          </div>
                          <Tag
                            color="red"
                            style={{
                              marginRight: 24,
                              borderRadius: 20,
                              fontWeight: 600,
                              padding: "2px 12px",
                            }}
                          >
                            {violCount} Hari
                          </Tag>
                        </div>
                      ),
                      children: (
                        <div style={{ paddingLeft: 8 }}>
                          <Timeline
                            items={emp.violations
                              .sort((a, b) => new Date(a.date) - new Date(b.date))
                              .map((v) => {
                                const violationItems = v.details ? v.details.split(", ") : [];
                                return {
                                  dot: (
                                    <CalendarOutlined style={{ fontSize: 14, color: "#4263eb" }} />
                                  ),
                                  children: (
                                    <div>
                                      <Typography.Text
                                        strong
                                        style={{ fontSize: 13, color: "#333", display: "block", marginBottom: 8 }}
                                      >
                                        {dayjs(v.date).format("dddd, DD MMMM YYYY")}
                                      </Typography.Text>
                                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                        {violationItems.map((vi, idx) => {
                                          const style = getViolationStyle(vi);
                                          return (
                                            <Tag
                                              key={idx}
                                              icon={style.icon}
                                              style={{
                                                borderColor: style.color,
                                                color: style.color,
                                                backgroundColor: style.bg,
                                                borderRadius: 6,
                                                fontSize: 12,
                                                fontWeight: 500,
                                              }}
                                            >
                                              {vi}
                                            </Tag>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ),
                                };
                              })}
                          />
                        </div>
                      ),
                      style: {
                        marginBottom: 8,
                        background: "#fafafa",
                        borderRadius: 10,
                        border: "1px solid #f0f0f0",
                      },
                    };
                  })}
                />
              )
            )}
          </Card>
        </div>
      </Spin>
    </div>
  );
};

export default RispegDashboard;
