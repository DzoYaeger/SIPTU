import { useCallback, useEffect, useMemo, useState } from "react";
import {
  App as AntdApp,
  Button,
  Card,
  Divider,
  Dropdown,
  Form,
  Input,
  Modal,
  Row,
  Col,
  Radio,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  MoreOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "../hooks/useAuth.js";
import useDebounce from "../hooks/useDebounce.js";
import StatisticCard from "../components/StatisticCard.jsx";
import "./BmnPemeliharaanKeluhan.css";

const { Title, Text } = Typography;
// const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

const STATUS_OPTIONS = [
  {
    label: "Baru",
    value: "new",
    icon: <FileTextOutlined />,
    hint: "Laporan baru diterima",
  },
  {
    label: "Diproses",
    value: "in_progress",
    icon: <SyncOutlined />,
    hint: "Sedang ditangani petugas",
  },
  {
    label: "Selesai",
    value: "completed",
    icon: <CheckCircleOutlined />,
    hint: "Sudah selesai ditindaklanjuti",
  },
  {
    label: "Ditolak",
    value: "rejected",
    icon: <CloseCircleOutlined />,
    hint: "Laporan tidak dapat diproses",
  },
];

const TYPE_OPTIONS = [
  { label: "Semua Jenis", value: "all" },
  { label: "Pemeliharaan", value: "pemeliharaan" },
  { label: "Keluhan", value: "keluhan" },
];

const statusColor = {
  new: "gold",
  in_progress: "blue",
  completed: "green",
  rejected: "red",
};

const statusLabel = {
  new: "Baru",
  in_progress: "Diproses",
  completed: "Selesai",
  rejected: "Ditolak",
};

export default function BmnPemeliharaanKeluhan() {
  const { apiFetch, currentRole } = useAuth();
  const { message } = AntdApp.useApp();
  const [updateForm] = Form.useForm();

  const [reports, setReports] = useState([]);
  const [pdfLoading, setPdfLoading] = useState(false);

  const exportToPdf = async () => {
    try {
      setPdfLoading(true);
      message.loading({ content: "Menyiapkan PDF...", key: "pdf_export" });
      
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("report_type", typeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());
      
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
  const [loading, setLoading] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  const isAdminOrValidator =
    currentRole === "admin" || currentRole === "validator";

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("only_mine", "1");
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("report_type", typeFilter);
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

      const res = await apiFetch(
        `/bmn-maintenance-reports?${params.toString()}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "Gagal memuat laporan");
      setReports(data?.data ?? []);
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, message, debouncedSearch, statusFilter, typeFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const openUpdateModal = useCallback(
    (record) => {
      setSelectedReport(record);
      updateForm.setFieldsValue({
        status: record.status,
        admin_notes: record.admin_notes ?? "",
      });
      setUpdateOpen(true);
    },
    [updateForm],
  );

  const handleUpdate = async (values) => {
    if (!selectedReport) return;
    setUpdating(true);
    try {
      const res = await apiFetch(
        `/bmn-maintenance-reports/${selectedReport.id}`,
        {
          method: "PUT",
          body: JSON.stringify(values),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "Gagal memperbarui status");
      message.success("Status laporan diperbarui");
      setUpdateOpen(false);
      setSelectedReport(null);
      fetchReports();
    } catch (error) {
      message.error(error.message);
    } finally {
      setUpdating(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        title: "No. Laporan",
        dataIndex: "report_number",
        key: "report_number",
        width: 170,
      },
      {
        title: "Jenis",
        dataIndex: "report_type",
        key: "report_type",
        width: 140,
        render: (v) =>
          v === "pemeliharaan" ? (
            <Tag color="green">Pemeliharaan</Tag>
          ) : (
            <Tag color="magenta">Keluhan</Tag>
          ),
      },
      {
        title: "Aset BMN",
        dataIndex: "asset_name",
        key: "asset_name",
        render: (v) => v || "-",
      },
      {
        title: "Permasalahan",
        dataIndex: "report_details",
        key: "report_details",
        ellipsis: true,
      },
      {
        title: "Pelapor",
        dataIndex: "reporter_name",
        key: "reporter_name",
        width: 180,
        render: (_, r) => (
          <div>
            <div>{r.reporter_name || "-"}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {r.reporter_nip || "-"}
            </Text>
          </div>
        ),
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 130,
        render: (v) => (
          <Tag color={statusColor[v] || "default"}>{statusLabel[v] || v}</Tag>
        ),
      },
      {
        title: "Tanggal",
        dataIndex: "created_at",
        key: "created_at",
        width: 170,
        render: (v) => (v ? dayjs(v).format("DD/MM/YYYY HH:mm") : "-"),
      },
      {
        title: "Aksi",
        key: "action",
        width: 80,
        fixed: "right",
        align: "center",
        render: (_, record) => {
          const items = [
            {
              key: "update",
              label: "Update Status",
              icon: <EditOutlined />,
              onClick: () => openUpdateModal(record),
            },
          ];

          return (
            <Dropdown
              menu={{ items }}
              trigger={["click"]}
              placement="bottomRight"
            >
              <Button type="text" icon={<MoreOutlined />} />
            </Dropdown>
          );
        },
      },
    ],
    [openUpdateModal],
  );

  if (!isAdminOrValidator) {
    return (
      <Card>
        <Title level={4}>Akses Terbatas</Title>
        <Text type="secondary">
          Halaman ini khusus untuk admin/validator untuk mengelola laporan
          Pemeliharaan/Keluhan BMN.
        </Text>
      </Card>
    );
  }

  return (
    <div className="module-section">
      <div className="module-toolbar">
        <div>
          <Title level={3} className="module-title">
            Pemeliharaan / Keluhan BMN
          </Title>
          <Text className="module-subtitle">
            Kelola laporan pengguna, update status, dan catatan tindak lanjut.
          </Text>
        </div>
      </div>

      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} lg={6}>
          <StatisticCard
            title="Total Laporan"
            value={reports.length}
            color="#10b981"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatisticCard
            title="Baru"
            value={reports.filter((r) => r.status === "new").length}
            color="#f59e0b"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatisticCard
            title="Diproses"
            value={reports.filter((r) => r.status === "in_progress").length}
            color="#3b82f6"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatisticCard
            title="Selesai"
            value={reports.filter((r) => r.status === "completed").length}
            color="#22c55e"
          />
        </Col>
      </Row>

      <Card className="content-card">
        <Space wrap style={{ width: "100%" }}>
          <Select
            value={typeFilter}
            style={{ width: 180 }}
            options={TYPE_OPTIONS}
            onChange={setTypeFilter}
          />
          <Select
            value={statusFilter}
            style={{ width: 180 }}
            options={[{ label: "Semua Status", value: "all" }, ...STATUS_OPTIONS]}
            onChange={setStatusFilter}
          />
          <Input.Search
            allowClear
            placeholder="Cari no laporan/pelapor/aset"
            style={{ width: 280 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={fetchReports}
          />
          <Button onClick={fetchReports}>Refresh</Button>
          <Button
            type="primary"
            danger
            icon={<FilePdfOutlined />}
            onClick={exportToPdf}
            loading={pdfLoading}
          >
            Tarik PDF
          </Button>
        </Space>
      </Card>

      <div className="table-card">
        <div className="table-helper">Daftar laporan masuk dari pengguna</div>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={reports}
          scroll={{ x: 1250 }}
          pagination={{ pageSize: 10 }}
        />
      </div>

      <Modal
        open={updateOpen}
        onCancel={() => setUpdateOpen(false)}
        title="Update Status Laporan"
        className="bmn-maint-modal"
        width={720}
        footer={null}
        destroyOnClose
      >
        <Form layout="vertical" requiredMark={false} form={updateForm} onFinish={handleUpdate}>
          {selectedReport ? (
            <div className="bmn-maint-modal-summary">
              <div className="bmn-maint-summary-item">
                <span>No. Laporan</span>
                <strong>{selectedReport.report_number || "-"}</strong>
              </div>
              <div className="bmn-maint-summary-item">
                <span>Pelapor</span>
                <strong>{selectedReport.reporter_name || "-"}</strong>
              </div>
              <div className="bmn-maint-summary-item">
                <span>Jenis</span>
                <strong>
                  {selectedReport.report_type === "pemeliharaan"
                    ? "Pemeliharaan"
                    : "Keluhan"}
                </strong>
              </div>
              <div className="bmn-maint-summary-item">
                <span>Aset BMN</span>
                <strong>{selectedReport.asset_name || "-"}</strong>
              </div>
            </div>
          ) : null}

          <Divider style={{ margin: "8px 0 16px" }} />

          <Form.Item
            name="status"
            label="Status"
            rules={[{ required: true, message: "Pilih status" }]}
          >
            <Radio.Group className="bmn-maint-status-group">
              {STATUS_OPTIONS.map((item) => (
                <Radio.Button key={item.value} value={item.value}>
                  <div className="bmn-maint-status-item">
                    <span className="bmn-maint-status-icon">{item.icon}</span>
                    <div>
                      <div className="bmn-maint-status-title">{item.label}</div>
                      <div className="bmn-maint-status-hint">{item.hint}</div>
                    </div>
                  </div>
                </Radio.Button>
              ))}
            </Radio.Group>
          </Form.Item>
          <Form.Item name="admin_notes" label="Catatan Admin">
            <Input.TextArea
              rows={4}
              placeholder="Tuliskan catatan tindak lanjut, hasil pemeriksaan, atau alasan penolakan..."
            />
          </Form.Item>
          <div className="bmn-maint-modal-footer">
            <Button onClick={() => setUpdateOpen(false)}>Batal</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={updating}
              icon={<ClockCircleOutlined />}
            >
              Simpan Update
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
