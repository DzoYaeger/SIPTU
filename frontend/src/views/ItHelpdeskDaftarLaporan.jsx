import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  App as AntdApp,
  Table,
  Typography,
  Modal,
  Form,
  Input,
  DatePicker,
  Button,
  Space,
  Tag,
  Timeline,
  Divider,
  Descriptions,
  Select,
  Card,
  Row,
  Col,
  Statistic,
  Dropdown,
  Tooltip,
  Badge,
} from "antd";
import { buildMessageAdapter } from "../utils/notify.js";
import {
  FileExcelOutlined,
  FilePdfOutlined,
  MoreOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ToolOutlined,
  DeleteOutlined,
  FileTextOutlined,
  UndoOutlined,
  SearchOutlined,
  SyncOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "../hooks/useAuth.js";
import SignatureCanvas from "../components/SignatureCanvas.jsx";

// const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";
const { RangePicker } = DatePicker;

const STATUS_OPTIONS = [
  { value: "all", label: "Semua Status" },
  { value: "new", label: "Menunggu Tindak Lanjut IT" },
  { value: "in_progress", label: "Sedang Diproses" },
  { value: "waiting_user_approval", label: "Menunggu Konfirmasi Pelapor" },
  { value: "completed", label: "Selesai" },
];

const formatDate = (value, fallback = "-") =>
  value ? dayjs(value).format("DD MMM YYYY") : fallback;

const getStatusMeta = (status) => {
  switch (status) {
    case "new":
    case "open":
      return { color: "orange", label: "Menunggu Tindak Lanjut IT" };
    case "in_progress":
      return { color: "blue", label: "Sedang Diproses" };
    case "waiting_user_approval":
      return { color: "purple", label: "Menunggu Konfirmasi Pelapor" };
    case "completed":
      return { color: "green", label: "Selesai" };
    default:
      return { color: "default", label: status ?? "Tidak diketahui" };
  }
};

const buildTimelineItems = (ticket) => {
  if (!ticket) return [];

  const items = [
    {
      color: "blue",
      children: (
        <Space direction="vertical" size={2}>
          <Typography.Text strong>Pelaporan dibuat</Typography.Text>
          <Typography.Text type="secondary">
            {formatDate(ticket.report_date)}
          </Typography.Text>
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            {ticket.reporter_signature_token || ticket.reporter_signature 
              ? "Tanda tangan pelapor terekam saat pengajuan awal." 
              : "Laporan telah masuk ke sistem."}
          </Typography.Paragraph>
        </Space>
      ),
    },
  ];

  if (ticket.status === "rejected") {
    items.push({
      color: "red",
      children: (
        <Space direction="vertical" size={2}>
          <Typography.Text strong>Laporan ditolak</Typography.Text>
          <Typography.Text type="secondary">
            {formatDate(ticket.updated_at)}
          </Typography.Text>
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            Alasan: {ticket.followup_details}
          </Typography.Paragraph>
        </Space>
      ),
    });
  }

  if (
    ticket.followup_details ||
    ticket.completion_date ||
    ticket.it_staff_signature ||
    ticket.it_staff_signature_token
  ) {
    items.push({
      color: "cyan",
      children: (
        <Space direction="vertical" size={2}>
          <Typography.Text strong>Tindak lanjut IT Staff</Typography.Text>
          <Typography.Text type="secondary">
            {formatDate(ticket.it_staff_signed_at || ticket.completion_date)}
          </Typography.Text>
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            {ticket.followup_details ?? "Detail tindak lanjut belum diisi."}
          </Typography.Paragraph>
        </Space>
      ),
    });
  }

  if (ticket.reporter_signature || ticket.reporter_signature_token) {
    // Only show confirmation if it happened AFTER the completion (or if it's the final completed state)
    if (ticket.status === "completed") {
      items.push({
        color: "green",
        children: (
          <Space direction="vertical" size={2}>
            <Typography.Text strong>Konfirmasi pelapor</Typography.Text>
            <Typography.Text type="secondary">
              {formatDate(ticket.reporter_signed_at || ticket.updated_at || ticket.completion_date)}
            </Typography.Text>
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              Pelapor telah mengonfirmasi tindak lanjut dan tiket dinyatakan selesai.
            </Typography.Paragraph>
          </Space>
        ),
      });
    }
  }

  return items;
};

const ItHelpdeskDaftarLaporan = () => {
  const { user, apiFetch, token } = useAuth();
  const { modal, message } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);
  const isAdmin = user?.base_role === "admin";
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [followupModalOpen, setFollowupModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [submittingFollowup, setSubmittingFollowup] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyTicket, setHistoryTicket] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState(null);
  const [downloadLoading, setDownloadLoading] = useState({
    pdf: false,
    excel: false,
  });
  const followupSignatureRef = useRef();
  const [followupForm] = Form.useForm();
  const navigate = useNavigate();

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch("/it-helpdesk-tickets?pageSize=1000");
      if (!response.ok) {
        throw new Error("Gagal memuat data laporan.");
      }
      const data = await response.json();
      const items = Array.isArray(data) ? data : data.data || [];
      setTickets(items);
    } catch (error) {
      notification.error({
        message: "Gagal memuat data laporan",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [apiFetch, notification]);

  const handleDelete = useCallback(
    async (ticketId) => {
      modal.confirm({
        title: "Anda yakin ingin menghapus tiket ini?",
        content: "Tindakan ini tidak dapat dibatalkan.",
        okText: "Hapus",
        okType: "danger",
        cancelText: "Batal",
        onOk: async () => {
          try {
            const response = await apiFetch(
              `/it-helpdesk-tickets/${ticketId}`,
              { method: "DELETE" },
            );
            if (!response.ok) {
              const data = await response.json();
              throw new Error(data.message || "Gagal menghapus tiket.");
            }
            notification.success({ message: "Tiket berhasil dihapus." });
            fetchTickets();
          } catch (error) {
            notification.error({
              message: "Gagal menghapus tiket",
              description: error.message,
            });
          }
        },
      });
    },
    [apiFetch, modal, notification, fetchTickets],
  );

  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    const trimmedSearch = searchTerm.trim();

    if (statusFilter !== "all") {
      params.append("status", statusFilter);
    }

    if (trimmedSearch) {
      params.append("search", trimmedSearch);
    }

    if (dateRangeFilter && dateRangeFilter.length === 2) {
      if (dateRangeFilter[0]) {
        params.append("from", dateRangeFilter[0].format("YYYY-MM-DD"));
      }
      if (dateRangeFilter[1]) {
        params.append("to", dateRangeFilter[1].format("YYYY-MM-DD"));
      }
    }

    return params;
  }, [statusFilter, dateRangeFilter, searchTerm]);

  const handleDownload = useCallback(
    async (format) => {
      const key = format === "pdf" ? "pdf" : "excel";
      setDownloadLoading((prev) => ({ ...prev, [key]: true }));

      try {
        const params = buildQueryParams();
        const query = params.toString();
        const endpoint = `/it-helpdesk-tickets/export/${format}${query ? `?${query}` : ""}`;
        
        const response = await apiFetch(endpoint, {
          headers: {
            Accept:
              format === "pdf"
                ? "application/pdf"
                : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }
        });

        if (!response.ok) {
          let message = "Gagal mengunduh laporan.";
          try {
            const data = await response.json();
            if (data?.message) {
              message = data.message;
            }
          } catch (_) { }
          throw new Error(message);
        }

        const blob = await response.blob();
        const disposition = response.headers.get("Content-Disposition");

        const extractFilename = (header) => {
          if (!header) return null;
          const utfMatch = /filename\*=UTF-8''([^;]+)/i.exec(header);
          if (utfMatch?.[1]) {
            return decodeURIComponent(utfMatch[1]);
          }
          const match = /filename="?([^";]+)"?/i.exec(header);
          return match?.[1] ?? null;
        };

        let filename = extractFilename(disposition);
        if (!filename) {
          filename = `laporan-it-helpdesk-${dayjs().format("YYYYMMDD-HHmmss")}.${format === "pdf" ? "pdf" : "xlsx"}`;
        }

        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);

        notification.success({
          message: `Laporan ${format.toUpperCase()} berhasil diunduh.`,
        });
      } catch (error) {
        notification.error({
          message: "Gagal mengunduh laporan",
          description: error.message,
        });
      } finally {
        setDownloadLoading((prev) => ({ ...prev, [key]: false }));
      }
    },
    [buildQueryParams, token, notification],
  );

  const handleReporterSignature = (record) => {
    navigate(`/it-helpdesk/tickets/${record.id}/sign`);
  };

  const handleViewHistory = (record) => {
    setHistoryTicket(record);
    setHistoryModalOpen(true);
  };

  const handleCloseHistory = () => {
    setHistoryModalOpen(false);
    setHistoryTicket(null);
  };

  const handleFollowup = (record) => {
    setSelectedTicket(record);
    setFollowupModalOpen(true);
    followupForm.setFieldsValue({
      problem_details: record.problem_details,
      completion_date: record.completion_date
        ? dayjs(record.completion_date)
        : dayjs(),
    });
  };

  const handleProcess = async (record) => {
    try {
      const response = await apiFetch(
        `/it-helpdesk-tickets/${record.id}`,
        {
          method: "PUT", // Assuming PUT update handles status change
          body: JSON.stringify({ status: "in_progress" }),
        },
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Gagal memproses tiket.");
      }
      notification.success({ message: "Tiket sedang diproses." });
      fetchTickets();
    } catch (error) {
      notification.error({
        message: "Gagal memproses tiket",
        description: error.message,
      });
    }
  };

  const handleSubmitFollowup = async (values) => {
    setSubmittingFollowup(true);
    try {
      const payload = {
        followup_details: values.followup_details,
        completion_date: values.completion_date.format("YYYY-MM-DD"),
        password: values.password,
      };
      const response = await apiFetch(
        `/it-helpdesk-tickets/${selectedTicket.id}/complete`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Gagal menyimpan tindak lanjut.");
      }
      notification.success({ message: "Tindak lanjut berhasil disimpan." });
      setFollowupModalOpen(false);
      fetchTickets();
    } catch (error) {
      notification.error({
        message: "Gagal menyimpan tindak lanjut",
        description: error.message,
      });
    } finally {
      setSubmittingFollowup(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const stats = useMemo(() => {
    return {
      total: tickets.length,
      new: tickets.filter((t) => ["new", "open"].includes(t.status)).length,
      in_progress: tickets.filter((t) => t.status === "in_progress").length,
      completed: tickets.filter((t) => t.status === "completed").length,
    };
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return tickets.filter((ticket) => {
      const matchesStatus =
        statusFilter === "all" ||
        ticket.status === statusFilter ||
        (statusFilter === "new" && ticket.status === "open") ||
        (statusFilter === "open" && ticket.status === "new");

      const matchesKeyword =
        !keyword ||
        ticket.employee_name?.toLowerCase().includes(keyword) ||
        ticket.function_area?.toLowerCase().includes(keyword) ||
        ticket.employee_work_unit?.toLowerCase().includes(keyword) ||
        ticket.report_type?.toLowerCase().includes(keyword) ||
        ticket.problem_details?.toLowerCase().includes(keyword);

      let matchesDate = true;
      if (dateRangeFilter && dateRangeFilter.length === 2) {
        const reportDate = dayjs(ticket.report_date);
        const start = dateRangeFilter[0]?.startOf("day").valueOf();
        const end = dateRangeFilter[1]?.endOf("day").valueOf();
        const reportTs = reportDate.valueOf();
        if ((start && reportTs < start) || (end && reportTs > end)) {
          matchesDate = false;
        }
      }

      return matchesStatus && matchesKeyword && matchesDate;
    });
  }, [tickets, searchTerm, statusFilter, dateRangeFilter]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setDateRangeFilter(null);
  };
  const columns = [
    { title: "Nama Pegawai", dataIndex: "employee_name" },
    { 
      title: "Fungsi/Bidang", 
      dataIndex: "function_area",
      render: (text, record) => text || record.employee?.fungsi_bidang || record.employee_work_unit || "-"
    },
    { title: "Jenis Pelaporan", dataIndex: "report_type" },
    {
      title: "Status",
      dataIndex: "status",
      render: (status, record) => {
        const meta = getStatusMeta(status);
        return (
          <Space direction="vertical" size={2}>
            <Tag color={meta.color} style={{ margin: 0 }}>{meta.label}</Tag>
            {record.is_auto_resolved && (
              <Tag color="volcano" style={{ fontSize: 10, margin: 0 }}>Auto-Resolved</Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: "TTE",
      key: "tte_status",
      width: 100,
      align: "center",
      render: (_, record) => {
        const hasReporter = !!(record.reporter_signature_token || record.reporter_signature);
        const hasStaff = !!(record.it_staff_signature_token || record.it_staff_signature);
        
        return (
          <Space size="small">
            <Tooltip title={hasReporter ? "Pelapor sudah TTD" : "Pelapor belum TTD"}>
              <Badge status={hasReporter ? "success" : "default"} text="P" />
            </Tooltip>
            <Tooltip title={hasStaff ? "Petugas IT sudah TTD" : "Petugas IT belum TTD"}>
              <Badge status={hasStaff ? "success" : "default"} text="IT" />
            </Tooltip>
          </Space>
        );
      },
    },
    {
      title: "Aksi",
      key: "action",
      width: 80,
      fixed: "right",
      align: "center",
      render: (_, record) => {
        const items = [];
        if (["new", "open"].includes(record.status)) {
          items.push({
            key: "process",
            label: "Proses",
            icon: <SyncOutlined style={{ color: "#1890ff" }} />,
            onClick: () => handleProcess(record),
          });
        }
        if (["new", "open", "in_progress"].includes(record.status)) {
          items.push({
            key: "finish",
            label: "Selesai Tindak Lanjut",
            icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
            onClick: () => handleFollowup(record),
          });
        }
        items.push({
          key: "download",
          label: "Cetak PDF",
          icon: <DownloadOutlined />,
          onClick: () => {
            const baseUrlRaw = import.meta.env.VITE_API_URL || "https://siptu.bpompalopo.com/core_api/api";
            const baseUrl = baseUrlRaw.replace(/\/+$/, "");
            const url = `${baseUrl}/public/it-helpdesk-tickets/${record.id}/pdf`;
            window.open(url, "_blank");
          },
        });
        items.push({
          key: "history",
          label: "Lihat Riwayat",
          icon: <FileTextOutlined />,
          onClick: () => handleViewHistory(record),
        });
        if (isAdmin) {
          items.push({ type: "divider" });
          items.push({
            key: "delete",
            label: <span style={{ color: "#ff4d4f" }}>Hapus</span>,
            icon: <DeleteOutlined style={{ color: "#ff4d4f" }} />,
            onClick: () => handleDelete(record.id),
          });
        }

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
  ];

  const historyEmployee = historyTicket?.employee ?? {};
  const historyItStaff = historyTicket?.it_staff ?? {};
  const historyStatusMeta = getStatusMeta(historyTicket?.status);
  const historyTimelineItems = buildTimelineItems(historyTicket);

  return (
    <div className="module-section" style={{ minHeight: "100vh", paddingBottom: 24 }}>
      <div className="module-toolbar">
        <div>
          <Typography.Title level={3} className="module-title" style={{ margin: 0 }}>
            IT Helpdesk - Laporan Keluhan
          </Typography.Title>
          <Typography.Text className="module-subtitle" style={{ fontSize: 13 }}>
            Lacak, tindak lanjuti, dan kelola laporan keluhan IT secara terpusat.
          </Typography.Text>
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} md={6}>
          <Card bordered={false} hoverable styles={{ body: { padding: "16px 24px" } }} style={{ borderRadius: 10, height: "100%" }}>
            <Statistic
              title={<span style={{ color: "#8c8c8c", fontWeight: 500 }}>Total Keluhan</span>}
              value={stats.total}
              prefix={<ToolOutlined style={{ color: "#1890ff", opacity: 0.8 }} />}
              valueStyle={{ color: "#262626", fontWeight: "bold" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card bordered={false} hoverable styles={{ body: { padding: "16px 24px" } }} style={{ borderRadius: 10, height: "100%" }}>
            <Statistic
              title={<span style={{ color: "#8c8c8c", fontWeight: 500 }}>Perlu Tindak Lanjut</span>}
              value={stats.new}
              prefix={<ClockCircleOutlined style={{ color: "#faad14", opacity: 0.8 }} />}
              valueStyle={{ color: "#262626", fontWeight: "bold" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card bordered={false} hoverable styles={{ body: { padding: "16px 24px" } }} style={{ borderRadius: 10, height: "100%" }}>
            <Statistic
              title={<span style={{ color: "#8c8c8c", fontWeight: 500 }}>Sedang Diproses</span>}
              value={stats.in_progress}
              prefix={<SyncOutlined spin style={{ color: "#1890ff", opacity: 0.8 }} />}
              valueStyle={{ color: "#262626", fontWeight: "bold" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card bordered={false} hoverable styles={{ body: { padding: "16px 24px" } }} style={{ borderRadius: 10, height: "100%" }}>
            <Statistic
              title={<span style={{ color: "#8c8c8c", fontWeight: 500 }}>Selesai</span>}
              value={stats.completed}
              prefix={<CheckCircleOutlined style={{ color: "#52c41a", opacity: 0.8 }} />}
              valueStyle={{ color: "#262626", fontWeight: "bold" }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        bordered={false}
        style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
        styles={{ body: { padding: "20px 24px" } }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
          <Space wrap size="middle">
            <Input
              allowClear
              placeholder="Cari keluhan..."
              prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: 240, borderRadius: 6 }}
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_OPTIONS}
              style={{ width: 180 }}
            />
            <RangePicker
              value={dateRangeFilter ?? null}
              onChange={(dates) => setDateRangeFilter(dates && dates.length ? dates : null)}
              allowClear
              format="DD MMM YYYY"
              style={{ borderRadius: 6 }}
            />
            <Tooltip title="Reset Filter">
              <Button icon={<UndoOutlined />} onClick={handleResetFilters} />
            </Tooltip>
          </Space>
          <Space wrap>
            <Button
              icon={<FilePdfOutlined />}
              onClick={() => handleDownload("pdf")}
              loading={downloadLoading.pdf}
            >
              PDF
            </Button>
            <Button
              icon={<FileExcelOutlined />}
              onClick={() => handleDownload("excel")}
              loading={downloadLoading.excel}
            >
              Excel
            </Button>
          </Space>
        </div>

        <Table
          dataSource={filteredTickets}
          columns={columns}
          loading={loading}
          rowKey="id"
          pagination={{ 
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} dari ${total} laporan`,
          }}
          scroll={{ x: 'max-content' }}
          expandable={{
            expandedRowRender: (record) => (
              <div style={{ padding: "8px 16px", background: "#fafafa", borderRadius: 8 }}>
                <p style={{ margin: 0 }}><strong>Tanggal Pelaporan:</strong> {formatDate(record.report_date)}</p>
                <p style={{ margin: "8px 0 0 0" }}><strong>Rincian Permasalahan:</strong> {record.problem_details || "-"}</p>
              </div>
            ),
          }}
        />
      </Card>

      {selectedTicket && (
        <Modal
          title="Tindak Lanjut Keluhan IT"
          open={followupModalOpen}
          onCancel={() => setFollowupModalOpen(false)}
          onOk={followupForm.submit}
          confirmLoading={submittingFollowup}
          okText="Simpan Tindak Lanjut"
          cancelText="Batal"
          destroyOnHidden
        >
          <Form
            form={followupForm}
            layout="vertical"
            requiredMark={false}
            onFinish={handleSubmitFollowup}
          >
            <Form.Item label="Permasalahan">
              <Input.TextArea
                value={selectedTicket.problem_details}
                readOnly
                rows={4}
              />
            </Form.Item>
            <Form.Item
              name="followup_details"
              label="Tindak Lanjut/Rencana Tindak Lanjut"
              rules={[
                {
                  required: true,
                  message: "Rincian tindak lanjut wajib diisi.",
                },
              ]}
            >
              <Input.TextArea
                rows={4}
                placeholder="Jelaskan tindak lanjut atau rencana tindak lanjut."
              />
            </Form.Item>
            <Form.Item
              name="completion_date"
              label="Tanggal Penyelesaian"
              rules={[
                {
                  required: true,
                  message: "Tanggal penyelesaian wajib diisi.",
                },
              ]}
            >
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name="password"
              label="Password SIPTU (TTE)"
              rules={[
                {
                  required: true,
                  message: "Password SIPTU wajib diisi sebagai TTE.",
                },
              ]}
            >
              <Input.Password placeholder="Masukkan password login SIPTU Anda" />
            </Form.Item>
          </Form>
        </Modal>
      )}

      {historyTicket && (
        <Modal
          title={`Riwayat Tiket #${historyTicket.id?.toString().padStart(4, "0")}`}
          open={historyModalOpen}
          onCancel={handleCloseHistory}
          footer={[
            <Button key="close" onClick={handleCloseHistory}>
              Tutup
            </Button>,
          ]}
          width={820}
          destroyOnHidden
        >
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Space align="center" size="middle" wrap>
              <Typography.Title level={5} style={{ margin: 0 }}>
                Status Saat Ini
              </Typography.Title>
              <Tag color={historyStatusMeta.color}>
                {historyStatusMeta.label}
              </Tag>
            </Space>

            <Descriptions
              title="Informasi Pelapor"
              bordered
              size="small"
              column={2}
            >
              <Descriptions.Item label="Nama Pegawai">
                {historyTicket.employee_name}
              </Descriptions.Item>
              <Descriptions.Item label="NIP">
                {historyEmployee.nip ?? "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Jabatan">
                {historyEmployee.jabatan ?? "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Fungsi/Bidang">
                {historyTicket.function_area ??
                  historyTicket.employee_work_unit ??
                  historyEmployee.fungsi_bidang ??
                  "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Tanggal Pelaporan">
                {formatDate(historyTicket.report_date)}
              </Descriptions.Item>
              <Descriptions.Item label="ID Tiket">
                #{historyTicket.id?.toString().padStart(4, "0")}
              </Descriptions.Item>
            </Descriptions>

            <Descriptions
              title="Detail Keluhan"
              bordered
              size="small"
              column={1}
            >
              <Descriptions.Item label="Jenis Pelaporan">
                {historyTicket.report_type}
              </Descriptions.Item>
              <Descriptions.Item label="Rincian Permasalahan">
                {historyTicket.problem_details}
              </Descriptions.Item>
              {historyTicket.signature && (
                <Descriptions.Item label="Tanda Tangan Pelapor (Awal)">
                  <img
                    src={historyTicket.signature}
                    alt="Tanda tangan pelapor"
                    style={{ height: 100, background: "#fff" }}
                  />
                </Descriptions.Item>
              )}
            </Descriptions>

            <Descriptions
              title="Tindak Lanjut IT"
              bordered
              size="small"
              column={2}
            >
              <Descriptions.Item label="Nama IT Staff">
                {historyItStaff.name ?? "Menunggu penugasan"}
              </Descriptions.Item>
              <Descriptions.Item label="Tanggal Penyelesaian">
                {historyTicket.completion_date
                  ? formatDate(historyTicket.completion_date)
                  : "Belum diisi"}
              </Descriptions.Item>
              <Descriptions.Item label="Rincian Tindak Lanjut" span={2}>
                {historyTicket.followup_details ??
                  "Belum ada tindak lanjut yang tercatat."}
              </Descriptions.Item>
              {historyTicket.it_staff_signature && (
                <Descriptions.Item label="Tanda Tangan IT Staff" span={2}>
                  <img
                    src={historyTicket.it_staff_signature}
                    alt="Tanda tangan IT Staff"
                    style={{ height: 100, background: "#fff" }}
                  />
                </Descriptions.Item>
              )}
            </Descriptions>

            {historyTicket.reporter_signature && (
              <Descriptions
                title="Konfirmasi Pelapor"
                bordered
                size="small"
                column={2}
              >
                <Descriptions.Item label="Tanggal Konfirmasi">
                  {formatDate(
                    historyTicket.updated_at ?? historyTicket.completion_date,
                  )}
                </Descriptions.Item>
                <Descriptions.Item
                  label="Tanda Tangan Pelapor (Konfirmasi)"
                  span={2}
                >
                  <img
                    src={historyTicket.reporter_signature}
                    alt="Tanda tangan pelapor konfirmasi"
                    style={{ height: 100, background: "#fff" }}
                  />
                </Descriptions.Item>
              </Descriptions>
            )}

            <Divider style={{ margin: "12px 0" }}>Jejak Waktu</Divider>
            <Timeline items={historyTimelineItems} />
          </Space>
        </Modal>
      )}
    </div>
  );
};

export default ItHelpdeskDaftarLaporan;
