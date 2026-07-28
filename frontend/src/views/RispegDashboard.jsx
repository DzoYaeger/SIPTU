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

// ── Corporate Palette & Violation Metadata ──────────────────────────────
const CORPORATE_BLUE = "#0F5B99";

const VIOLATION_TYPES = [
  {
    key: "late",
    label: "Terlambat Masuk",
    icon: <ClockCircleOutlined />,
    color: "#d97706", // Amber 600
    bg: "#fffbeb",
    hasMins: true,
    countKey: "total_late_entries",
    minKey: "total_late_minutes",
  },
  {
    key: "earlyExit",
    label: "Pulang Cepat",
    icon: <FallOutlined />,
    color: "#059669", // Emerald 600
    bg: "#ecfdf5",
    hasMins: true,
    countKey: "total_early_exits",
    minKey: "total_early_minutes",
  },
  {
    key: "uniform",
    label: "Tidak Berseragam",
    icon: <SafetyCertificateOutlined />,
    color: "#2563eb", // Royal 600
    bg: "#eff6ff",
    hasMins: false,
    countKey: "total_uniform_violations",
    minKey: null,
  },
  {
    key: "assembly",
    label: "Terlambat Apel Pagi",
    icon: <ApartmentOutlined />,
    color: "#7c3aed", // Violet 600
    bg: "#f5f3ff",
    hasMins: false,
    countKey: "total_assembly_violations",
    minKey: null,
  },
  {
    key: "missedIn",
    label: "Lupa Absen Masuk",
    icon: <ExclamationCircleOutlined />,
    color: "#0891b2", // Cyan 600
    bg: "#ecfeff",
    hasMins: false,
    countKey: "total_missed_checkins",
    minKey: null,
  },
  {
    key: "missedOut",
    label: "Lupa Absen Pulang",
    icon: <WarningOutlined />,
    color: "#e11d48", // Rose 600
    bg: "#fff1f2",
    hasMins: false,
    countKey: "total_missed_checkouts",
    minKey: null,
  },
];

const VIOLATION_CONFIG = {
  "Terlambat Masuk": { color: "#d97706", bg: "#fffbeb", icon: <ClockCircleOutlined /> },
  "Pulang Cepat": { color: "#059669", bg: "#ecfdf5", icon: <FallOutlined /> },
  "Tidak Berseragam": { color: "#2563eb", bg: "#eff6ff", icon: <SafetyCertificateOutlined /> },
  "terlambat Absen Apel": { color: "#7c3aed", bg: "#f5f3ff", icon: <ApartmentOutlined /> },
  "Lupa Absen Masuk": { color: "#0891b2", bg: "#ecfeff", icon: <ExclamationCircleOutlined /> },
  "Lupa Absen Pulang": { color: "#e11d48", bg: "#fff1f2", icon: <WarningOutlined /> },
};

const getViolationStyle = (text) => {
  for (const [key, style] of Object.entries(VIOLATION_CONFIG)) {
    if (text.startsWith(key)) return style;
  }
  return { color: "#dc2626", bg: "#fef2f2", icon: <ExclamationCircleOutlined /> };
};

// ── Violation Summary Card ───────────────────────────────────────────
const ViolationCard = ({ type, totalCount, totalMins }) => {
  const accentColor = type.color;
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 10,
        padding: "14px 16px",
        height: "100%",
        border: "1px solid #e2e8f0",
        borderLeft: `4px solid ${accentColor}`,
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: type.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
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
              color: "#475569",
              textTransform: "uppercase",
              letterSpacing: "0.4px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {type.label}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#1a1f2e", lineHeight: 1 }}>
            {totalCount}
          </span>
          <span style={{ fontSize: 11.5, color: "#64748b", fontWeight: 500 }}>
            kali
          </span>
        </div>
      </div>

      {type.hasMins && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            background: type.bg,
            borderRadius: 4,
            padding: "2px 6px",
            alignSelf: "flex-start",
            marginTop: 8,
          }}
        >
          <ClockCircleOutlined style={{ fontSize: 10, color: accentColor }} />
          <span style={{ fontSize: 10.5, color: accentColor, fontWeight: 600 }}>
            {Number(totalMins).toFixed(1)} mnt
          </span>
        </div>
      )}
    </div>
  );
};

// ── Overview Stat Card ───────────────────────────────────────────────
const StatCard = ({ icon, title, value, suffix, name, color }) => {
  const accentColor = color || CORPORATE_BLUE;
  return (
    <Card
      size="small"
      style={{
        borderRadius: 10,
        height: "100%",
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderTop: `3px solid ${accentColor}`,
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
      }}
      bodyStyle={{ padding: "14px 14px" }}
    >
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", minHeight: 76 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Typography.Text
              style={{
                fontSize: 10.5,
                color: "#64748b",
                fontWeight: 700,
                display: "block",
                marginBottom: 4,
                textTransform: "uppercase",
                letterSpacing: "0.4px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {title}
            </Typography.Text>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: "#1a1f2e", lineHeight: 1.1 }}>
                {value}
              </span>
              <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>{suffix}</span>
            </div>
          </div>

          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 6,
              background: `${accentColor}12`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
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
                gap: 4,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 4,
                padding: "3px 6px",
                marginTop: 8,
                maxWidth: "100%",
              }}
            >
              <TrophyOutlined style={{ color: accentColor, fontSize: 10, flexShrink: 0 }} />
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
      <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", height: 18, marginBottom: 16, background: "#f1f5f9" }}>
        {data.filter((d) => d.value > 0).map((item) => (
          <Tooltip key={item.name} title={`${item.name}: ${item.value} (${((item.value / total) * 100).toFixed(1)}%)`}>
            <div
              style={{
                width: `${(item.value / total) * 100}%`,
                background: item.color,
                transition: "width 0.5s ease",
                minWidth: item.value > 0 ? 4 : 0,
              }}
            />
          </Tooltip>
        ))}
      </div>

      <Row gutter={[8, 8]}>
        {data.map((item) => (
          <Col xs={12} sm={8} key={item.name}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                background: "#f8fafc",
                borderRadius: 6,
                border: "1px solid #e2e8f0",
                borderLeft: `3px solid ${item.color}`,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <Typography.Text style={{ fontSize: 10.5, color: "#64748b", display: "block", fontWeight: 500 }} ellipsis>
                  {item.name}
                </Typography.Text>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "#1a1f2e" }}>{item.value}</span>
                  <span style={{ fontSize: 10.5, color: "#94a3b8" }}>
                    ({total > 0 ? ((item.value / total) * 100).toFixed(0) : 0}%)
                  </span>
                </div>
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

  const rankBadges = ["#1", "#2", "#3", "#4", "#5"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {data.map((item, idx) => (
        <div
          key={item.employee_id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            background: "#ffffff",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              background: idx === 0 ? "#fee2e2" : "#f1f5f9",
              color: idx === 0 ? "#dc2626" : "#475569",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {rankBadges[idx]}
          </div>

          <Avatar size={28} icon={<UserOutlined />} style={{ backgroundColor: CORPORATE_BLUE, flexShrink: 0 }} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <Typography.Text strong style={{ fontSize: 12.5, color: "#1a1f2e", display: "block" }} ellipsis>
              {item.name}
            </Typography.Text>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
              {item.total_late_entries > 0 && (
                <span style={{ fontSize: 9.5, background: "#fffbeb", color: "#d97706", padding: "0 5px", borderRadius: 3, border: "1px solid #fef3c7" }}>
                  Terlambat: {item.total_late_entries}×
                </span>
              )}
              {item.total_uniform_violations > 0 && (
                <span style={{ fontSize: 9.5, background: "#eff6ff", color: "#2563eb", padding: "0 5px", borderRadius: 3, border: "1px solid #dbeafe" }}>
                  Seragam: {item.total_uniform_violations}×
                </span>
              )}
              {item.total_assembly_violations > 0 && (
                <span style={{ fontSize: 9.5, background: "#f5f3ff", color: "#7c3aed", padding: "0 5px", borderRadius: 3, border: "1px solid #ede9fe" }}>
                  Apel: {item.total_assembly_violations}×
                </span>
              )}
            </div>
            <div style={{ marginTop: 4 }}>
              <Progress
                percent={maxPoints > 0 ? (item.total_points / maxPoints) * 100 : 0}
                showInfo={false}
                strokeColor="#dc2626"
                size="small"
                style={{ margin: 0 }}
              />
            </div>
          </div>

          <Tag
            color="red"
            style={{ borderRadius: 4, fontWeight: 700, fontSize: 12, padding: "1px 8px", margin: 0 }}
          >
            {item.total_points} Poin
          </Tag>
        </div>
      ))}
    </div>
  );
};

// ── Employee Summary Table ───────────────────────────────────────────
const EmployeeSummaryTable = ({ data }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [data]);

  if (!data || data.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Tidak ada pelanggaran pada periode ini" />;
  }

  const dataSourceWithKey = data.map((item, idx) => ({
    ...item,
    key: item.employee_id || `emp-${idx}`,
  }));

  const columns = [
    {
      title: "Nama Pegawai",
      dataIndex: "name",
      key: "name",
      render: (text) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Avatar size={26} icon={<UserOutlined />} style={{ backgroundColor: CORPORATE_BLUE, flexShrink: 0 }} />
          <Typography.Text strong style={{ fontSize: 12.5, color: "#1a1f2e" }}>{text}</Typography.Text>
        </div>
      ),
      fixed: "left",
      width: 200,
    },
    {
      title: "Terlambat",
      key: "late",
      align: "center",
      width: 120,
      render: (_, r) =>
        r.total_late_entries > 0 ? (
          <div style={{ textAlign: "center" }}>
            <span style={{ fontWeight: 700, color: "#d97706", fontSize: 13 }}>{r.total_late_entries}×</span>
            <div style={{ fontSize: 10.5, color: "#64748b" }}>{Number(r.total_late_minutes).toFixed(1)} mnt</div>
          </div>
        ) : (
          <span style={{ color: "#cbd5e1" }}>—</span>
        ),
      sorter: (a, b) => a.total_late_entries - b.total_late_entries,
    },
    {
      title: "Pulang Cepat",
      key: "earlyExit",
      align: "center",
      width: 120,
      render: (_, r) =>
        r.total_early_exits > 0 ? (
          <div style={{ textAlign: "center" }}>
            <span style={{ fontWeight: 700, color: "#059669", fontSize: 13 }}>{r.total_early_exits}×</span>
            <div style={{ fontSize: 10.5, color: "#64748b" }}>{Number(r.total_early_minutes).toFixed(1)} mnt</div>
          </div>
        ) : (
          <span style={{ color: "#cbd5e1" }}>—</span>
        ),
      sorter: (a, b) => a.total_early_exits - b.total_early_exits,
    },
    {
      title: "Seragam",
      dataIndex: "total_uniform_violations",
      key: "uniform",
      align: "center",
      width: 90,
      render: (v) => (v > 0 ? <span style={{ fontWeight: 700, color: "#2563eb", fontSize: 13 }}>{v}×</span> : <span style={{ color: "#cbd5e1" }}>—</span>),
      sorter: (a, b) => a.total_uniform_violations - b.total_uniform_violations,
    },
    {
      title: "Apel Pagi",
      dataIndex: "total_assembly_violations",
      key: "assembly",
      align: "center",
      width: 90,
      render: (v) => (v > 0 ? <span style={{ fontWeight: 700, color: "#7c3aed", fontSize: 13 }}>{v}×</span> : <span style={{ color: "#cbd5e1" }}>—</span>),
      sorter: (a, b) => a.total_assembly_violations - b.total_assembly_violations,
    },
    {
      title: "Lupa Masuk",
      dataIndex: "total_missed_checkins",
      key: "missedIn",
      align: "center",
      width: 100,
      render: (v) => (v > 0 ? <span style={{ fontWeight: 700, color: "#0891b2", fontSize: 13 }}>{v}×</span> : <span style={{ color: "#cbd5e1" }}>—</span>),
      sorter: (a, b) => a.total_missed_checkins - b.total_missed_checkins,
    },
    {
      title: "Lupa Pulang",
      dataIndex: "total_missed_checkouts",
      key: "missedOut",
      align: "center",
      width: 100,
      render: (v) => (v > 0 ? <span style={{ fontWeight: 700, color: "#e11d48", fontSize: 13 }}>{v}×</span> : <span style={{ color: "#cbd5e1" }}>—</span>),
      sorter: (a, b) => a.total_missed_checkouts - b.total_missed_checkouts,
    },
    {
      title: "Total Poin",
      dataIndex: "total_points",
      key: "points",
      align: "center",
      width: 100,
      render: (v) => (
        <Tag
          color={v >= 4 ? "red" : v >= 2 ? "orange" : "default"}
          style={{ fontWeight: 700, fontSize: 12, borderRadius: 4, margin: 0 }}
        >
          {v} Poin
        </Tag>
      ),
      defaultSortOrder: "descend",
      sorter: (a, b) => a.total_points - b.total_points,
    },
  ];

  return (
    <Table
      dataSource={dataSourceWithKey}
      columns={columns}
      rowKey="key"
      size="small"
      pagination={{
        current: currentPage,
        pageSize: pageSize,
        onChange: (page, newPageSize) => {
          setCurrentPage(page);
          setPageSize(newPageSize);
        },
        showSizeChanger: true,
        pageSizeOptions: ["10", "20", "50", "100"],
        showTotal: (total) => `Total ${total} pegawai`,
      }}
      scroll={{ x: 900 }}
    />
  );
};

// ════════════════════════════════════════════════════════════════════
// ██  MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════
export default function RispegDashboard() {
  const { apiFetch } = useAuth();
  const { message } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);

  const [dateRange, setDateRange] = useState([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");

  const fetchStats = useCallback(
    async (range) => {
      if (!range || !range[0] || !range[1]) return;
      setLoading(true);
      try {
        const startDate = range[0].format("YYYY-MM-DD");
        const endDate = range[1].format("YYYY-MM-DD");
        const response = await apiFetch(
          `/rispeg/dashboard-stats?start_date=${startDate}&end_date=${endDate}`,
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
    fetchStats(dateRange);
  }, [dateRange, fetchStats]);

  const handleDownloadPdf = async () => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) return;
    setDownloading(true);
    try {
      const startDate = dateRange[0].format("YYYY-MM-DD");
      const endDate = dateRange[1].format("YYYY-MM-DD");
      const response = await apiFetch(
        `/rispeg/export-pdf?start_date=${startDate}&end_date=${endDate}`,
        { method: "GET", headers: { Accept: "application/pdf" } },
      );
      if (!response.ok) throw new Error("Gagal mengunduh laporan PDF");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Laporan_Monitoring_Rispeg_${startDate}_sd_${endDate}.pdf`;
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

  const allStats = useMemo(() => stats?.all_stats || [], [stats]);

  const monthlyTotals = useMemo(() => {
    const totals = {};
    VIOLATION_TYPES.forEach((vt) => {
      totals[vt.countKey] = allStats.reduce((a, c) => a + (c[vt.countKey] || 0), 0);
      if (vt.minKey) {
        totals[vt.minKey] = allStats.reduce((a, c) => a + (c[vt.minKey] || 0), 0);
      }
    });
    return totals;
  }, [allStats]);

  const violationDistribution = useMemo(() => {
    return VIOLATION_TYPES.map((vt) => ({
      name: vt.label,
      value: monthlyTotals[vt.countKey] || 0,
      mins: vt.minKey ? monthlyTotals[vt.minKey] || 0 : null,
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

  const employeesWithViolations = useMemo(
    () => allStats.filter((e) => e.total_points > 0),
    [allStats],
  );

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

  return (
    <div style={{ padding: "20px 24px 60px", maxWidth: "100%", margin: "0 auto" }}>
      <Spin spinning={loading} tip="Memuat Data RISPEG..." size="large">
        <div style={{ filter: loading ? "blur(3px)" : "none", transition: "filter 0.3s ease" }}>
          {/* ── Top Header Toolbar ── */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
              flexWrap: "wrap",
              gap: 12,
              paddingBottom: 14,
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 6,
                  background: CORPORATE_BLUE,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                }}
              >
                <DashboardOutlined />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1f2e" }}>
                  Monitoring & Analytics Kedisiplinan Pegawai (RISPEG)
                </div>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  Periode:{" "}
                  <strong>
                    {dateRange && dateRange[0] && dateRange[1]
                      ? `${dateRange[0].format("DD MMM YYYY")} s/d ${dateRange[1].format("DD MMM YYYY")}`
                      : "-"}
                  </strong>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <DatePicker.RangePicker
                value={dateRange}
                onChange={(val) => {
                  if (val && val[0] && val[1]) setDateRange(val);
                }}
                allowClear={false}
                format="DD/MM/YYYY"
                style={{ width: 250, borderRadius: 6 }}
              />
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleDownloadPdf}
                loading={downloading}
                style={{
                  borderRadius: 6,
                  fontWeight: 600,
                  backgroundColor: CORPORATE_BLUE,
                  borderColor: CORPORATE_BLUE,
                }}
              >
                Ekspor PDF
              </Button>
            </div>
          </div>

          {/* ── Overview Quick Stats ── */}
          <Row gutter={[10, 10]} style={{ marginBottom: 16 }}>
            <Col xs={12} sm={8} md={4}>
              <StatCard icon={<FireOutlined />} title="Total Pelanggaran" value={totalViolations} suffix="kejadian" color="#dc2626" />
            </Col>
            <Col xs={12} sm={8} md={4}>
              <StatCard icon={<TeamOutlined />} title="Pegawai Terkait" value={totalEmployeesWithViolations} suffix="orang" color="#ea580c" />
            </Col>
            <Col xs={12} sm={8} md={4}>
              <StatCard icon={<AlertOutlined />} title="Poin Tertinggi" value={stats?.summary?.top_points?.total_points || 0} suffix="poin" name={stats?.summary?.top_points?.name} color="#c026d3" />
            </Col>
            <Col xs={12} sm={8} md={4}>
              <StatCard icon={<ClockCircleOutlined />} title="Total Menit Terlambat" value={monthlyTotals.total_late_minutes || 0} suffix="mnt" color="#d97706" />
            </Col>
            <Col xs={12} sm={8} md={4}>
              <StatCard icon={<RiseOutlined />} title="Terlambat Terbanyak" value={stats?.summary?.most_late_entries?.total_late_entries || 0} suffix="kali" name={stats?.summary?.most_late_entries?.name} color="#e11d48" />
            </Col>
            <Col xs={12} sm={8} md={4}>
              <StatCard icon={<FallOutlined />} title="Pulang Cepat Terbanyak" value={stats?.summary?.most_early_exits?.total_early_exits || 0} suffix="kali" name={stats?.summary?.most_early_exits?.name} color="#059669" />
            </Col>
          </Row>

          {/* ── Violation Type Cards ── */}
          <div style={{ fontSize: 13, fontWeight: 700, color: CORPORATE_BLUE, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            Rangkuman Per Jenis Pelanggaran Disiplin
          </div>
          <Row gutter={[10, 10]} style={{ marginBottom: 20 }}>
            {VIOLATION_TYPES.map((vt) => (
              <Col xs={12} sm={8} md={4} key={vt.key}>
                <ViolationCard
                  type={vt}
                  totalCount={monthlyTotals[vt.countKey] || 0}
                  totalMins={vt.minKey ? monthlyTotals[vt.minKey] || 0 : null}
                />
              </Col>
            ))}
          </Row>

          {/* ── Distribution + Top Violators ── */}
          <Row gutter={[14, 14]} style={{ marginBottom: 20 }}>
            <Col xs={24} lg={14}>
              <Card
                size="small"
                title={<span style={{ fontSize: 13, fontWeight: 700, color: CORPORATE_BLUE }}>Distribusi Jenis Pelanggaran</span>}
                style={{ borderRadius: 10, height: "100%", border: "1px solid #e2e8f0" }}
              >
                <DistributionBar data={violationDistribution} total={totalViolations} />
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card
                size="small"
                title={<span style={{ fontSize: 13, fontWeight: 700, color: CORPORATE_BLUE }}>Top 5 Pelanggar Disiplin</span>}
                style={{ borderRadius: 10, height: "100%", border: "1px solid #e2e8f0" }}
              >
                <TopViolatorsList data={topViolators} maxPoints={maxPoints} />
              </Card>
            </Col>
          </Row>

          {/* ── Tab Toggle: Tabel Rekapitulasi & Detail Harian ── */}
          <Card
            size="small"
            style={{ borderRadius: 10, border: "1px solid #e2e8f0" }}
            title={
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: CORPORATE_BLUE }}>
                    {activeTab === "summary" ? "Tabel Rekapitulasi Pegawai" : "Detail Pelanggaran Harian"}
                  </span>
                  <Badge
                    count={activeTab === "summary" ? totalEmployeesWithViolations : groupedViolations.length}
                    style={{ backgroundColor: "#dc2626" }}
                  />
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Button
                    size="small"
                    type={activeTab === "summary" ? "primary" : "default"}
                    onClick={() => setActiveTab("summary")}
                    icon={<EyeOutlined />}
                    style={{ borderRadius: 6, backgroundColor: activeTab === "summary" ? CORPORATE_BLUE : undefined }}
                  >
                    Tabel Rekap
                  </Button>
                  <Button
                    size="small"
                    type={activeTab === "daily" ? "primary" : "default"}
                    onClick={() => setActiveTab("daily")}
                    icon={<CalendarOutlined />}
                    style={{ borderRadius: 6, backgroundColor: activeTab === "daily" ? CORPORATE_BLUE : undefined }}
                  >
                    Detail Harian
                  </Button>
                </div>
              </div>
            }
          >
            {activeTab === "summary" && <EmployeeSummaryTable data={employeesWithViolations} />}

            {activeTab === "daily" && (
              groupedViolations.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Tidak ada pelanggaran pada periode ini" />
              ) : (
                <Collapse
                  accordion
                  bordered={false}
                  style={{ background: "transparent" }}
                  items={groupedViolations.map((emp) => {
                    const violCount = emp.violations.length;
                    return {
                      key: emp.employee_id,
                      label: (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <Avatar icon={<UserOutlined />} style={{ backgroundColor: CORPORATE_BLUE, flexShrink: 0 }} />
                            <div>
                              <Typography.Text strong style={{ fontSize: 13, display: "block", color: "#1a1f2e" }}>
                                {emp.employee_name}
                              </Typography.Text>
                              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                                {violCount} hari dengan kendala
                              </Typography.Text>
                            </div>
                          </div>
                          <Tag color="red" style={{ borderRadius: 4, fontWeight: 600, fontSize: 11 }}>
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
                                  dot: <CalendarOutlined style={{ fontSize: 13, color: CORPORATE_BLUE }} />,
                                  children: (
                                    <div>
                                      <Typography.Text strong style={{ fontSize: 12.5, color: "#1a1f2e", display: "block", marginBottom: 6 }}>
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
                                                borderRadius: 4,
                                                fontSize: 11.5,
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
                        marginBottom: 6,
                        background: "#f8fafc",
                        borderRadius: 6,
                        border: "1px solid #e2e8f0",
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
}
