import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Progress,
  Row,
  Skeleton,
  Space,
  Statistic,
  Tag,
  Typography,
  Badge,
  Avatar,
  List,
  Timeline,
  Table,
  DatePicker,
  Select,
  Tabs,
  Tooltip,
  Modal,
  Descriptions,
  Divider,
} from "antd";
import {
  BellOutlined,
  LineChartOutlined,
  ReloadOutlined,
  RocketOutlined,
  SafetyOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  UserOutlined,
  ShoppingOutlined,
  FileTextOutlined,
  KeyOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ArrowRightOutlined,
  DashboardOutlined,
  ToolOutlined,
  FundOutlined,
  ExportOutlined,
  EyeOutlined,
  FilterOutlined,
  BarChartOutlined,
  PieChartOutlined,
  CalendarOutlined,
  CheckOutlined,
  HistoryOutlined,
  SafetyCertificateOutlined,
  AppstoreOutlined,
  CodeSandboxOutlined,
  AlertOutlined,
  CustomerServiceOutlined,
  FolderOutlined,
} from "@ant-design/icons";
import { useAuth } from "../hooks/useAuth.js";

import { MODULE_COLORS, getModuleColor } from "../constants/moduleStyles.js";
import dayjs from "dayjs";
import "dayjs/locale/id";
import "./OperatorDashboard.css";

dayjs.locale("id");

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;
const { Option } = Select;

const MODULE_META = {
  archive: {
    title: "Kearsipan",
    tone: "blue",
    icon: <FolderOutlined style={{ fontSize: 18, color: MODULE_COLORS.kearsipan }} />,
    route: "/app/kearsipan-peminjaman",
    color: MODULE_COLORS.kearsipan,
  },
  bmn: {
    title: "BMN",
    tone: "green",
    icon: <FolderOutlined style={{ fontSize: 18, color: MODULE_COLORS.bmn }} />,
    route: "/app/bmn-peminjaman-aset",
    color: MODULE_COLORS.bmn,
  },
  inventory: {
    title: "Persediaan",
    tone: "orange",
    icon: <FolderOutlined style={{ fontSize: 18, color: MODULE_COLORS.persediaan }} />,
    route: "/app/bmn-permintaan-persediaan",
    color: MODULE_COLORS.persediaan,
  },
  it_helpdesk: {
    title: "IT Helpdesk",
    tone: "pink",
    icon: <FolderOutlined style={{ fontSize: 18, color: MODULE_COLORS.itHelpdesk }} />,
    route: "/app/it-helpdesk-pelaporan",
    color: MODULE_COLORS.itHelpdesk,
  },
  exit_permit: {
    title: "Izin Keluar",
    tone: "purple",
    icon: <FolderOutlined style={{ fontSize: 18, color: MODULE_COLORS.rispeg }} />,
    route: "/app/rispeg-izin-keluar",
    color: MODULE_COLORS.rispeg,
  },
};

const STATUS_MAP = {
  pengajuan: { color: "blue", text: "Menunggu", icon: <ClockCircleOutlined /> },
  disetujui: {
    color: "green",
    text: "Disetujui",
    icon: <CheckCircleOutlined />,
  },
  ditolak: { color: "red", text: "Ditolak", icon: <CloseCircleOutlined /> },
  diproses: {
    color: "orange",
    text: "Diproses",
    icon: <ThunderboltOutlined />,
  },
  selesai: { color: "cyan", text: "Selesai", icon: <CheckCircleOutlined /> },
  diajukan: { color: "blue", text: "Diajukan", icon: <ClockCircleOutlined /> },
  open: { color: "blue", text: "Open", icon: <ClockCircleOutlined /> },
  in_progress: {
    color: "orange",
    text: "Diproses",
    icon: <ThunderboltOutlined />,
  },
  completed: { color: "green", text: "Selesai", icon: <CheckCircleOutlined /> },
  closed: { color: "default", text: "Ditutup", icon: <CheckCircleOutlined /> },
  out: { color: "orange", text: "Keluar", icon: <ExportOutlined /> },
  returned: { color: "green", text: "Kembali", icon: <CheckCircleOutlined /> },
};

function OperatorDashboard() {
  const navigate = useNavigate();
  const { user, currentRole, apiFetch, headers } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(7, "day"),
    dayjs(),
  ]);
  const [selectedModule, setSelectedModule] = useState("all");
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");


  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const startDate =
        dateRange?.[0]?.format("YYYY-MM-DD") ||
        dayjs().subtract(7, "day").format("YYYY-MM-DD");
      const endDate =
        dateRange?.[1]?.format("YYYY-MM-DD") || dayjs().format("YYYY-MM-DD");

      // Get current user identifier for filtering
      const userNip = user?.nip || user?.employee?.nip;
      const userId = user?.id;
      const userName = user?.name || user?.employee?.name;

      // Fetch data from multiple endpoints for operator view
      const [inventoryRes, bmnRes, archiveRes, itHelpdeskRes, exitPermitRes] =
        await Promise.all([
          apiFetch(
            `/inventory-requests?start_date=${startDate}&end_date=${endDate}&limit=100`,
          ),
          apiFetch(
            `/bmn-loans?start_date=${startDate}&end_date=${endDate}&limit=100`,
          ),
          apiFetch(
            `/archive-loans?start_date=${startDate}&end_date=${endDate}&limit=100`,
          ),
          apiFetch(
            `/it-helpdesk-tickets?start_date=${startDate}&end_date=${endDate}&limit=100`,
          ),
          apiFetch(
            `/exit-permits?start_date=${startDate}&end_date=${endDate}&limit=100`,
          ),
        ]);

      const inventoryData = inventoryRes.ok ? await inventoryRes.json() : [];
      const bmnData = bmnRes.ok ? await bmnRes.json() : [];
      const archiveData = archiveRes.ok ? await archiveRes.json() : [];
      const itHelpdeskData = itHelpdeskRes.ok ? await itHelpdeskRes.json() : [];
      const exitPermitData = exitPermitRes.ok ? await exitPermitRes.json() : [];

      // Get raw data
      let inventoryRequests = Array.isArray(inventoryData)
        ? inventoryData
        : inventoryData.data || [];
      let bmnLoans = Array.isArray(bmnData) ? bmnData : bmnData.data || [];
      let archiveLoans = Array.isArray(archiveData)
        ? archiveData
        : archiveData.data || [];
      let itTickets = Array.isArray(itHelpdeskData)
        ? itHelpdeskData
        : itHelpdeskData.data || [];
      let exitPermits = Array.isArray(exitPermitData)
        ? exitPermitData
        : exitPermitData.data || [];

      // Filter data by current user (frontend filtering)
      inventoryRequests = inventoryRequests.filter(
        (item) =>
          item.user_id === userId ||
          item.requester_id === userId ||
          item.requester_name === userName ||
          item.nip === userNip,
      );
      bmnLoans = bmnLoans.filter(
        (item) =>
          item.user_id === userId ||
          item.borrower_id === userId ||
          item.borrower_name === userName ||
          item.nip === userNip,
      );
      archiveLoans = archiveLoans.filter(
        (item) =>
          item.user_id === userId ||
          item.requester_id === userId ||
          item.requester?.name === userName ||
          item.requester?.nip === userNip,
      );
      itTickets = itTickets.filter(
        (item) =>
          item.user_id === userId ||
          item.reporter_id === userId ||
          item.reporter_name === userName ||
          item.nip === userNip,
      );
      exitPermits = exitPermits.filter(
        (item) =>
          item.user_id === userId ||
          item.employee_id === userId ||
          item.employee_name === userName ||
          item.nip === userNip,
      );

      // Calculate status breakdown
      const inventoryByStatus = inventoryRequests.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {});

      const bmnByStatus = bmnLoans.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {});

      const archiveByStatus = archiveLoans.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {});

      const itByStatus = itTickets.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {});

      const exitByStatus = exitPermits.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {});

      setData({
        inventory: inventoryRequests,
        bmn: bmnLoans,
        archive: archiveLoans,
        itHelpdesk: itTickets,
        exitPermits: exitPermits,
        stats: {
          totalRequests:
            inventoryRequests.length +
            bmnLoans.length +
            archiveLoans.length +
            itTickets.length +
            exitPermits.length,
          inventory: {
            total: inventoryRequests.length,
            pending: inventoryRequests.filter((r) => r.status === "pengajuan")
              .length,
            approved: inventoryRequests.filter((r) => r.status === "disetujui")
              .length,
            rejected: inventoryRequests.filter((r) => r.status === "ditolak")
              .length,
            byStatus: inventoryByStatus,
          },
          bmn: {
            total: bmnLoans.length,
            pending: bmnLoans.filter(
              (l) => l.status === "diajukan" || l.status === "pengajuan",
            ).length,
            approved: bmnLoans.filter((l) => l.status === "disetujui").length,
            active: bmnLoans.filter((l) => l.status === "dipinjam").length,
            returned: bmnLoans.filter((l) => l.status === "dikembalikan")
              .length,
            byStatus: bmnByStatus,
          },
          archive: {
            total: archiveLoans.length,
            pending: archiveLoans.filter(
              (l) => l.status === "pending" || l.status === "menunggu_paraf",
            ).length,
            active: archiveLoans.filter((l) => l.status === "dipinjam").length,
            returned: archiveLoans.filter((l) => l.status === "dikembalikan")
              .length,
            byStatus: archiveByStatus,
          },
          itHelpdesk: {
            total: itTickets.length,
            open: itTickets.filter((t) => t.status === "open").length,
            inProgress: itTickets.filter((t) => t.status === "in_progress")
              .length,
            completed: itTickets.filter(
              (t) => t.status === "completed" || t.status === "closed",
            ).length,
            byStatus: itByStatus,
          },
          exitPermits: {
            total: exitPermits.length,
            out: exitPermits.filter((e) => e.status === "out").length,
            returned: exitPermits.filter((e) => e.status === "returned").length,
            byStatus: exitByStatus,
          },
        },
      });
    } catch (err) {
      setError(err.message || "Gagal memuat data dashboard.");
    } finally {
      setLoading(false);
    }
  }, [apiFetch, dateRange]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const formatTime = (date) => {
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const allRequests = useMemo(() => {
    if (!data) return [];
    const requests = [
      ...data.inventory.map((item) => ({
        ...item,
        type: "inventory",
        module: "Persediaan",
      })),
      ...data.bmn.map((item) => ({ ...item, type: "bmn", module: "BMN" })),
      ...data.archive.map((item) => ({
        ...item,
        type: "archive",
        module: "Kearsipan",
      })),
      ...data.itHelpdesk.map((item) => ({
        ...item,
        type: "it_helpdesk",
        module: "IT Helpdesk",
      })),
      ...data.exitPermits.map((item) => ({
        ...item,
        type: "exit_permit",
        module: "Izin Keluar",
      })),
    ];
    return requests.sort((a, b) =>
      dayjs(b.created_at || b.date).diff(dayjs(a.created_at || a.date)),
    );
  }, [data]);

  const filteredRequests = useMemo(() => {
    if (selectedModule === "all") return allRequests;
    return allRequests.filter((r) => r.type === selectedModule);
  }, [allRequests, selectedModule]);

  const handleViewDetail = (item) => {
    setSelectedItem(item);
    setDetailModalVisible(true);
  };

  const getStatusTag = (status) => {
    const statusInfo = STATUS_MAP[status] || {
      color: "default",
      text: status,
      icon: null,
    };
    return (
      <Tag color={statusInfo.color} icon={statusInfo.icon}>
        {statusInfo.text}
      </Tag>
    );
  };

  const columns = [
    {
      title: "Waktu",
      dataIndex: "created_at",
      key: "created_at",
      render: (date) => dayjs(date).format("DD MMM YYYY, HH:mm"),
      sorter: (a, b) => dayjs(a.created_at).diff(dayjs(b.created_at)),
    },
    {
      title: "Modul",
      dataIndex: "module",
      key: "module",
      render: (module, record) => (
        <Space>
          {MODULE_META[record.type]?.icon}
          <span>{module}</span>
        </Space>
      ),
    },
    {
      title: "Pengaju",
      dataIndex: "requester_name",
      key: "requester_name",
      render: (name, record) =>
        name ||
        record.borrower_name ||
        record.reporter_name ||
        record.requester?.name ||
        "-",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => getStatusTag(status),
    },
    {
      title: "Aksi",
      key: "action",
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          Detail
        </Button>
      ),
    },
  ];

  if (currentRole !== "operator" && user?.base_role !== "operator") {
    return (
      <div className="operator-dashboard">
        <Card className="op-dashboard__guard" variant="borderless">
          <div className="op-guard-content">
            <div className="op-guard-icon">
              <SafetyOutlined />
            </div>
            <Title level={4}>Akses Terbatas</Title>
            <Paragraph>
              Dashboard operator hanya tersedia untuk pengguna dengan role
              operator.
            </Paragraph>
            <Button
              type="primary"
              size="large"
              icon={<ArrowRightOutlined />}
              onClick={() => navigate("/app/layanan-mandiri")}
              className="op-guard-btn"
            >
              Buka Layanan Mandiri
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="operator-dashboard-page" style={{ padding: "0 24px 24px" }}>

      {/* ─── Header Section ─────────────────────────────────────── */}
      <div className="module-toolbar" style={{ marginBottom: 16 }}>
        <div>
          <Title level={4} className="module-title">Operator Dashboard</Title>
          <Text className="module-subtitle">
            Halo, <strong>{user?.name || "Operator"}</strong>. Pantau dan kelola pengajuan layanan Anda dari satu tempat terpadu.
          </Text>
        </div>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchDashboard}
            loading={loading}
          >
            Segarkan Data
          </Button>
        </Space>
      </div>

      {/* ─── Filter Bar ─────────────────────────────────────────────── */}
      <Card 
        style={{ marginBottom: 24, borderRadius: 16, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}
        bodyStyle={{ padding: "16px 24px" }}
      >
        <Space wrap size="middle">
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            format="DD MMM YYYY"
            allowClear={false}
            style={{ borderRadius: 8 }}
          />
          <Select
            value={selectedModule}
            onChange={setSelectedModule}
            style={{ width: 200, borderRadius: 8 }}
          >
            <Option value="all">Semua Modul</Option>
            <Option value="inventory">Persediaan</Option>
            <Option value="bmn">BMN</Option>
            <Option value="archive">Kearsipan</Option>
            <Option value="it_helpdesk">IT Helpdesk</Option>
            <Option value="exit_permit">Izin Keluar</Option>
          </Select>
        </Space>
      </Card>

      {error && (
        <Alert
          type="error"
          showIcon
          message="Gagal Memuat Data"
          description={error}
          action={<Button size="small" onClick={fetchDashboard}>Coba Lagi</Button>}
          style={{ marginBottom: 24, borderRadius: 12 }}
        />
      )}

      {/* ─── Overview Stats ─────────────────────────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={4}>
          <Card className="op-stat-card op-stat-card--primary" style={{ borderRadius: 16, border: "none", background: "#f8fafc" }}>
            {loading ? <Skeleton active paragraph={{ rows: 1 }} title={false} /> : (
              <>
                <div style={{ background: "#e0e7ff", width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <BarChartOutlined style={{ fontSize: 20, color: "#4f46e5" }} />
                </div>
                <Statistic title={<span style={{ color: "#64748b", fontWeight: 600 }}>Total Pengajuan</span>} value={data?.stats?.totalRequests || 0} valueStyle={{ color: "#1e293b", fontWeight: 800 }} />
              </>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card className="op-stat-card op-stat-card--warning" style={{ borderRadius: 16, border: "none", background: "#f8fafc" }}>
            {loading ? <Skeleton active paragraph={{ rows: 1 }} title={false} /> : (
              <>
                <div style={{ background: "#fef3c7", width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <ShoppingOutlined style={{ fontSize: 20, color: "#d97706" }} />
                </div>
                <Statistic title={<span style={{ color: "#64748b", fontWeight: 600 }}>Persediaan</span>} value={data?.stats?.inventory?.total || 0} valueStyle={{ color: "#1e293b", fontWeight: 800 }} />
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, fontWeight: 500 }}>{data?.stats?.inventory?.pending || 0} menunggu</div>
              </>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card className="op-stat-card op-stat-card--info" style={{ borderRadius: 16, border: "none", background: "#f8fafc" }}>
            {loading ? <Skeleton active paragraph={{ rows: 1 }} title={false} /> : (
              <>
                <div style={{ background: "#dbeafe", width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <FundOutlined style={{ fontSize: 20, color: "#2563eb" }} />
                </div>
                <Statistic title={<span style={{ color: "#64748b", fontWeight: 600 }}>Peminjaman BMN</span>} value={data?.stats?.bmn?.total || 0} valueStyle={{ color: "#1e293b", fontWeight: 800 }} />
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, fontWeight: 500 }}>{data?.stats?.bmn?.active || 0} aktif dipinjam</div>
              </>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card className="op-stat-card op-stat-card--cyan" style={{ borderRadius: 16, border: "none", background: "#f8fafc" }}>
            {loading ? <Skeleton active paragraph={{ rows: 1 }} title={false} /> : (
              <>
                <div style={{ background: "#cffafe", width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <FileTextOutlined style={{ fontSize: 20, color: "#0891b2" }} />
                </div>
                <Statistic title={<span style={{ color: "#64748b", fontWeight: 600 }}>Peminjaman Arsip</span>} value={data?.stats?.archive?.total || 0} valueStyle={{ color: "#1e293b", fontWeight: 800 }} />
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, fontWeight: 500 }}>{data?.stats?.archive?.active || 0} aktif</div>
              </>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card className="op-stat-card op-stat-card--success" style={{ borderRadius: 16, border: "none", background: "#f8fafc" }}>
            {loading ? <Skeleton active paragraph={{ rows: 1 }} title={false} /> : (
              <>
                <div style={{ background: "#d1fae5", width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <ToolOutlined style={{ fontSize: 20, color: "#059669" }} />
                </div>
                <Statistic title={<span style={{ color: "#64748b", fontWeight: 600 }}>IT Helpdesk</span>} value={data?.stats?.itHelpdesk?.total || 0} valueStyle={{ color: "#1e293b", fontWeight: 800 }} />
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, fontWeight: 500 }}>{data?.stats?.itHelpdesk?.open || 0} open</div>
              </>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card className="op-stat-card op-stat-card--purple" style={{ borderRadius: 16, border: "none", background: "#f8fafc" }}>
            {loading ? <Skeleton active paragraph={{ rows: 1 }} title={false} /> : (
              <>
                <div style={{ background: "#f3e8ff", width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <ExportOutlined style={{ fontSize: 20, color: "#9333ea" }} />
                </div>
                <Statistic title={<span style={{ color: "#64748b", fontWeight: 600 }}>Izin Keluar</span>} value={data?.stats?.exitPermits?.total || 0} valueStyle={{ color: "#1e293b", fontWeight: 800 }} />
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, fontWeight: 500 }}>{data?.stats?.exitPermits?.out || 0} sedang keluar</div>
              </>
            )}
          </Card>
        </Col>
      </Row>

      {/* ─── Main Content Tabs ─────────────────────────────────────────────── */}
      <Card style={{ borderRadius: 16, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }} bodyStyle={{ padding: 0 }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} style={{ padding: "0 24px" }} tabBarGutter={24}>
          <TabPane tab={<span style={{ fontWeight: 600, fontSize: 15 }}><HistoryOutlined /> Histori Pengajuan Terbaru</span>} key="overview">
            <div style={{ padding: "12px 0 24px" }}>
              {loading ? (
                <Skeleton active paragraph={{ rows: 6 }} />
              ) : (
                <Table
                  dataSource={filteredRequests.slice(0, 15)}
                  columns={columns}
                  rowKey={(record) => `${record.type}-${record.id}`}
                  pagination={false}
                  size="middle"
                  scroll={{ x: true }}
                />
              )}
            </div>
          </TabPane>

          <TabPane tab={<span style={{ fontWeight: 600, fontSize: 15 }}><EyeOutlined /> Semua Pengajuan Saya</span>} key="monitoring">
            <div style={{ padding: "12px 0 24px" }}>
              {loading ? (
                <Skeleton active paragraph={{ rows: 10 }} />
              ) : (
                <Table
                  dataSource={filteredRequests}
                  columns={columns}
                  rowKey={(record) => `${record.type}-${record.id}`}
                  pagination={{ pageSize: 20 }}
                  size="middle"
                  scroll={{ x: true }}
                />
              )}
            </div>
          </TabPane>
        </Tabs>
      </Card>

      {/* Detail Modal */}
      <Modal
        title={<span style={{ fontWeight: 700, color: "#1e293b" }}>Detail Pengajuan</span>}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)} style={{ borderRadius: 8, fontWeight: 600 }}>
            Tutup
          </Button>,
        ]}
        width={700}
        styles={{ content: { borderRadius: 16, overflow: "hidden" } }}
      >
        {selectedItem && (
          <Descriptions bordered column={1} size="small" labelStyle={{ width: "30%", fontWeight: 600, background: "#f8fafc" }}>
            <Descriptions.Item label="Modul">
              <span style={{ fontWeight: 600, color: "#475569" }}>{selectedItem.module}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              {getStatusTag(selectedItem.status)}
            </Descriptions.Item>
            <Descriptions.Item label="Pengaju">
              {selectedItem.requester_name || selectedItem.borrower_name || selectedItem.reporter_name || selectedItem.requester?.name || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Waktu Pengajuan">
              {dayjs(selectedItem.created_at || selectedItem.date).format("DD MMMM YYYY, HH:mm")}
            </Descriptions.Item>
            {selectedItem.spb_number && <Descriptions.Item label="Nomor SPB">{selectedItem.spb_number}</Descriptions.Item>}
            {selectedItem.asset_name && <Descriptions.Item label="Nama Aset">{selectedItem.asset_name}</Descriptions.Item>}
            {selectedItem.title && <Descriptions.Item label="Judul">{selectedItem.title}</Descriptions.Item>}
            {selectedItem.description && <Descriptions.Item label="Deskripsi">{selectedItem.description}</Descriptions.Item>}
            {selectedItem.approver_name && <Descriptions.Item label="Disetujui Oleh">{selectedItem.approver_name}</Descriptions.Item>}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}

export default OperatorDashboard;
