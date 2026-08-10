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
import itHelpdeskIcon from "../assets/icons/it-helpdesk-icon.png";
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
  PlusOutlined,
  ReloadOutlined,
  UserOutlined,
  InfoCircleOutlined,
  CheckCircleFilled,
  ClockCircleFilled,
  CloseCircleFilled,
  CalendarOutlined,
  PrinterOutlined,
  SafetyCertificateOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "../hooks/useAuth.js";
import "./ItHelpdeskDaftarLaporan.css";

const { RangePicker } = DatePicker;
const { Title, Text, Paragraph } = Typography;

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
      return { color: "orange", label: "Menunggu Tindak Lanjut IT", className: "it-status-tag--new" };
    case "in_progress":
      return { color: "blue", label: "Sedang Diproses", className: "it-status-tag--in_progress" };
    case "waiting_user_approval":
      return { color: "purple", label: "Menunggu Konfirmasi Pelapor", className: "it-status-tag--waiting" };
    case "completed":
      return { color: "green", label: "Selesai", className: "it-status-tag--completed" };
    default:
      return { color: "default", label: status ?? "Tidak diketahui", className: "" };
  }
};

const buildTimelineItems = (ticket) => {
  if (!ticket) return [];

  const items = [
    {
      color: "#2563eb",
      children: (
        <Space direction="vertical" size={2}>
          <Text strong style={{ color: "#0f172a" }}>Pelaporan Dibuat</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {formatDate(ticket.report_date)}
          </Text>
          <Paragraph style={{ marginBottom: 0, fontSize: 12.5, color: "#475569" }}>
            {ticket.reporter_signature_token || ticket.reporter_signature 
              ? "Tanda tangan digital pelapor terekam saat pengajuan awal." 
              : "Laporan keluhan IT telah masuk ke sistem SIPTU."}
          </Paragraph>
        </Space>
      ),
    },
  ];

  if (ticket.status === "rejected") {
    items.push({
      color: "#ef4444",
      children: (
        <Space direction="vertical" size={2}>
          <Text strong style={{ color: "#ef4444" }}>Laporan Ditolak</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {formatDate(ticket.updated_at)}
          </Text>
          <Paragraph style={{ marginBottom: 0, fontSize: 12.5, color: "#475569" }}>
            Alasan: {ticket.followup_details || "Laporan tidak memenuhi kriteria."}
          </Paragraph>
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
      color: "#0284c7",
      children: (
        <Space direction="vertical" size={2}>
          <Text strong style={{ color: "#0f172a" }}>Tindak Lanjut IT Staff (TTE)</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {formatDate(ticket.it_staff_signed_at || ticket.completion_date)}
          </Text>
          <Paragraph style={{ marginBottom: 0, fontSize: 12.5, color: "#475569" }}>
            {ticket.followup_details ?? "Detail tindak lanjut belum diisi."}
          </Paragraph>
        </Space>
      ),
    });
  }

  if (ticket.reporter_signature || ticket.reporter_signature_token) {
    if (ticket.status === "completed") {
      items.push({
        color: "#16a34a",
        children: (
          <Space direction="vertical" size={2}>
            <Text strong style={{ color: "#16a34a" }}>Konfirmasi Pelapor & Tiket Selesai</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {formatDate(ticket.reporter_signed_at || ticket.updated_at || ticket.completion_date)}
            </Text>
            <Paragraph style={{ marginBottom: 0, fontSize: 12.5, color: "#475569" }}>
              Pelapor telah mengonfirmasi hasil tindak lanjut dan tiket dinyatakan **Selesai 100%**.
            </Paragraph>
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
  const [followupForm] = Form.useForm();
  const navigate = useNavigate();

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch("/it-helpdesk-tickets?pageSize=1000");
      if (!response.ok) {
        throw new Error("Gagal memuat data laporan IT.");
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
        title: "Konfirmasi Hapus Tiket",
        content: "Apakah Anda yakin ingin menghapus tiket laporan ini? Tindakan ini tidak dapat dibatalkan.",
        okText: "Ya, Hapus",
        okType: "danger",
        cancelText: "Batal",
        centered: true,
        onOk: async () => {
          try {
            const response = await apiFetch(
              `/it-helpdesk-tickets/${ticketId}`,
              { method: "DELETE" }
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
    [apiFetch, modal, notification, fetchTickets]
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
    [buildQueryParams, apiFetch, notification]
  );

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
          method: "PUT",
          body: JSON.stringify({ status: "in_progress" }),
        }
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Gagal memproses tiket.");
      }
      notification.success({ message: "Tiket sedang diproses oleh Tim IT." });
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
        totp_code: values.totp_code?.trim() || "",
      };
      const response = await apiFetch(
        `/it-helpdesk-tickets/${selectedTicket.id}/complete`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Gagal menyimpan tindak lanjut.");
      }
      notification.success({ message: "Tindak lanjut berhasil disimpan & TTE terverifikasi." });
      window.dispatchEvent(new Event("siptu:refresh-badge-counts"));
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
    {
      title: "No. Tiket / Pelapor",
      key: "ticket_reporter",
      render: (_, record) => (
        <div>
          <Text strong style={{ display: "block", color: "#0f172a", fontSize: 13.5 }}>
            {record.employee_name}
          </Text>
          <Text type="secondary" style={{ fontSize: 11.5 }}>
            ID Tiket: <code style={{ color: "#2563eb", background: "#eff6ff", padding: "1px 5px", borderRadius: 4 }}>
              #{record.id?.toString().padStart(4, "0")}
            </code>
          </Text>
        </div>
      ),
    },
    { 
      title: "Fungsi / Bidang", 
      dataIndex: "function_area",
      render: (text, record) => (
        <Text style={{ fontSize: 13, color: "#334155" }}>
          {text || record.employee?.fungsi_bidang || record.employee_work_unit || "-"}
        </Text>
      ),
    },
    {
      title: "Jenis Pelaporan",
      dataIndex: "report_type",
      render: (type) => (
        <Tag color="geekblue" style={{ borderRadius: 6, fontWeight: 600, fontSize: 11 }}>
          {type || "Umum"}
        </Tag>
      ),
    },
    {
      title: "Status Tiket",
      dataIndex: "status",
      render: (status, record) => {
        const meta = getStatusMeta(status);
        return (
          <Space direction="vertical" size={2}>
            <Tag className={`it-status-tag ${meta.className}`}>
              {status === "completed" ? <CheckCircleFilled /> : <ClockCircleFilled />}
              {meta.label}
            </Tag>
            {record.is_auto_resolved && (
              <Tag color="volcano" style={{ fontSize: 10, borderRadius: 10, margin: 0 }}>Auto-Resolved</Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: "Verifikasi TTE",
      key: "tte_status",
      width: 130,
      align: "center",
      render: (_, record) => {
        const hasReporter = !!(record.reporter_signature_token || record.reporter_signature);
        const hasStaff = !!(record.it_staff_signature_token || record.it_staff_signature);
        
        return (
          <Space size="small">
            <Tooltip title={hasReporter ? "Pelapor sudah TTD digital" : "Pelapor belum TTD"}>
              <Tag color={hasReporter ? "success" : "default"} style={{ borderRadius: 10, fontSize: 11, fontWeight: 700, margin: 0 }}>
                Pelapor: {hasReporter ? "✓" : "-"}
              </Tag>
            </Tooltip>
            <Tooltip title={hasStaff ? "Petugas IT sudah TTD digital" : "Petugas IT belum TTD"}>
              <Tag color={hasStaff ? "processing" : "default"} style={{ borderRadius: 10, fontSize: 11, fontWeight: 700, margin: 0 }}>
                IT: {hasStaff ? "✓" : "-"}
              </Tag>
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
            label: "Proses Tiket",
            icon: <SyncOutlined style={{ color: "#2563eb" }} />,
            onClick: () => handleProcess(record),
          });
        }
        if (["new", "open", "in_progress"].includes(record.status)) {
          items.push({
            key: "finish",
            label: "Selesai & Input Tindak Lanjut",
            icon: <CheckCircleOutlined style={{ color: "#16a34a" }} />,
            onClick: () => handleFollowup(record),
          });
        }
        items.push({
          key: "download",
          label: "Cetak Dokumen PDF",
          icon: <PrinterOutlined style={{ color: "#0284c7" }} />,
          onClick: () => {
            const baseUrlRaw = import.meta.env.VITE_API_URL || "https://siptu.bpompalopo.com/core_api/api";
            const baseUrl = baseUrlRaw.replace(/\/+$/, "");
            const url = `${baseUrl}/public/it-helpdesk-tickets/${record.id}/pdf`;
            window.open(url, "_blank");
          },
        });
        items.push({
          key: "history",
          label: "Lihat Detail & Riwayat",
          icon: <FileTextOutlined style={{ color: "#475569" }} />,
          onClick: () => handleViewHistory(record),
        });
        if (isAdmin) {
          items.push({ type: "divider" });
          items.push({
            key: "delete",
            label: <span style={{ color: "#ef4444" }}>Hapus Tiket</span>,
            icon: <DeleteOutlined style={{ color: "#ef4444" }} />,
            onClick: () => handleDelete(record.id),
          });
        }

        return (
          <Dropdown
            menu={{ items }}
            trigger={["click"]}
            placement="bottomRight"
          >
            <Button type="text" shape="circle" icon={<MoreOutlined style={{ fontSize: 18 }} />} />
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
    <div className="it-helpdesk-page">
      {/* Clean Professional Module Banner (No Gradients) */}
      <div className="it-helpdesk-banner">
        <div>
          <h1 className="it-helpdesk-banner-title">
            <img src={itHelpdeskIcon} alt="IT Helpdesk" style={{ width: 34, height: 34, objectFit: "contain", verticalAlign: "middle", marginRight: 10 }} />
            IT Helpdesk - Pelaporan Keluhan
          </h1>
          <p className="it-helpdesk-banner-subtitle">
            Pusat penanganan kendala sistem IT, perbaikan jaringan, dan tindak lanjut TTE terintegrasi.
          </p>
        </div>
        <Space wrap size="middle">
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchTickets}
            loading={loading}
            style={{ borderRadius: 8, height: 38 }}
          >
            Segarkan
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate("/app/layanan-mandiri")}
            style={{ background: "#2563eb", borderRadius: 8, height: 38, fontWeight: 600 }}
          >
            Buat Laporan Baru
          </Button>
        </Space>
      </div>

      {/* KPI Cards Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} md={6}>
          <div className="it-kpi-card">
            <div className="it-kpi-header">
              <div className="it-kpi-icon-wrapper it-kpi-icon--total">
                <ToolOutlined />
              </div>
            </div>
            <div className="it-kpi-value">{stats.total}</div>
            <div className="it-kpi-label">Total Laporan</div>
          </div>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <div className="it-kpi-card">
            <div className="it-kpi-header">
              <div className="it-kpi-icon-wrapper it-kpi-icon--warning">
                <ClockCircleOutlined />
              </div>
            </div>
            <div className="it-kpi-value">{stats.new}</div>
            <div className="it-kpi-label">Menunggu Tindak Lanjut</div>
          </div>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <div className="it-kpi-card">
            <div className="it-kpi-header">
              <div className="it-kpi-icon-wrapper it-kpi-icon--progress">
                <SyncOutlined spin />
              </div>
            </div>
            <div className="it-kpi-value">{stats.in_progress}</div>
            <div className="it-kpi-label">Sedang Diproses</div>
          </div>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <div className="it-kpi-card">
            <div className="it-kpi-header">
              <div className="it-kpi-icon-wrapper it-kpi-icon--success">
                <CheckCircleOutlined />
              </div>
            </div>
            <div className="it-kpi-value">{stats.completed}</div>
            <div className="it-kpi-label">Selesai 100%</div>
          </div>
        </Col>
      </Row>

      {/* Control Filter Bar & Table Workspace */}
      <div className="it-filter-card">
        <div className="it-filter-row">
          <Space wrap size="middle">
            <Input
              allowClear
              placeholder="Cari pelapor, fungsi, atau kendala..."
              prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: 260, borderRadius: 8, height: 38 }}
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_OPTIONS}
              style={{ width: 200, height: 38 }}
            />
            <RangePicker
              value={dateRangeFilter ?? null}
              onChange={(dates) => setDateRangeFilter(dates && dates.length ? dates : null)}
              allowClear
              format="DD MMM YYYY"
              style={{ borderRadius: 8, height: 38 }}
            />
            <Tooltip title="Reset Filter">
              <Button 
                icon={<UndoOutlined />} 
                onClick={handleResetFilters} 
                style={{ borderRadius: 8, height: 38 }}
              />
            </Tooltip>
          </Space>
          <Space wrap>
            <Button
              icon={<FilePdfOutlined style={{ color: "#ef4444" }} />}
              onClick={() => handleDownload("pdf")}
              loading={downloadLoading.pdf}
              style={{ borderRadius: 8, height: 38, fontWeight: 600 }}
            >
              Export PDF
            </Button>
            <Button
              icon={<FileExcelOutlined style={{ color: "#16a34a" }} />}
              onClick={() => handleDownload("excel")}
              loading={downloadLoading.excel}
              style={{ borderRadius: 8, height: 38, fontWeight: 600 }}
            >
              Export Excel
            </Button>
          </Space>
        </div>

        <div className="it-table-container">
          <Table
            dataSource={filteredTickets}
            columns={columns}
            loading={loading}
            rowKey="id"
            pagination={{ 
              showSizeChanger: true,
              pageSize: 15,
              showTotal: (total, range) => `${range[0]}-${range[1]} dari ${total} laporan IT`,
            }}
            scroll={{ x: 'max-content' }}
            expandable={{
              expandedRowRender: (record) => (
                <div style={{ padding: "14px 20px", background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 8 }}>
                    <div>
                      <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                        Tanggal Pelaporan
                      </Text>
                      <Text strong style={{ fontSize: 13, color: "#0f172a" }}>
                        {formatDate(record.report_date)}
                      </Text>
                    </div>
                    <div>
                      <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                        Lokasi / Unit Kerja
                      </Text>
                      <Text strong style={{ fontSize: 13, color: "#0f172a" }}>
                        {record.function_area || record.employee_work_unit || "-"}
                      </Text>
                    </div>
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: 4 }}>
                      Rincian Permasalahan
                    </Text>
                    <Paragraph style={{ margin: 0, fontSize: 13, color: "#334155", background: "#ffffff", padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                      {record.problem_details || "Tidak ada detail."}
                    </Paragraph>
                  </div>
                </div>
              ),
            }}
          />
        </div>
      </div>

      {/* Modal: Form Tindak Lanjut IT Staff */}
      {selectedTicket && (
        <Modal
          title={
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                <ToolOutlined />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Input Tindak Lanjut IT Staff</div>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 400 }}>
                  Tiket #{selectedTicket.id?.toString().padStart(4, "0")} — {selectedTicket.employee_name}
                </div>
              </div>
            </div>
          }
          open={followupModalOpen}
          onCancel={() => setFollowupModalOpen(false)}
          onOk={followupForm.submit}
          confirmLoading={submittingFollowup}
          okText="Simpan & Verifikasi TTE"
          cancelText="Batal"
          centered
          width={540}
          className="it-modal"
          destroyOnHidden
        >
          <div style={{ padding: "16px 0 0 0" }}>
            <Form
              form={followupForm}
              layout="vertical"
              requiredMark={false}
              onFinish={handleSubmitFollowup}
            >
              <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 16 }}>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 4 }}>
                  Permasalahan Pelapor:
                </Text>
                <Text strong style={{ fontSize: 13, color: "#0f172a" }}>
                  {selectedTicket.problem_details}
                </Text>
              </div>

              <Form.Item
                name="followup_details"
                label={<Text strong style={{ fontSize: 13 }}>Rincian Tindak Lanjut / Perbaikan IT</Text>}
                rules={[
                  {
                    required: true,
                    message: "Rincian tindak lanjut wajib diisi.",
                  },
                ]}
              >
                <Input.TextArea
                  rows={4}
                  placeholder="Jelaskan tindakan perbaikan atau pemecahan masalah yang telah dilakukan..."
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>

              <Form.Item
                name="completion_date"
                label={<Text strong style={{ fontSize: 13 }}>Tanggal Penyelesaian</Text>}
                rules={[
                  {
                    required: true,
                    message: "Tanggal penyelesaian wajib diisi.",
                  },
                ]}
              >
                <DatePicker style={{ width: "100%", borderRadius: 8, height: 38 }} format="DD MMMM YYYY" />
              </Form.Item>

              <Form.Item
                name="password"
                label={<Text strong style={{ fontSize: 13 }}>Password SIPTU (Verifikasi TTE Digital)</Text>}
                rules={[
                  {
                    required: true,
                    message: "Masukkan password SIPTU Anda untuk menandatangani TTE secara digital.",
                  },
                ]}
                style={{ marginBottom: 12 }}
              >
                <Input.Password placeholder="Masukkan password login SIPTU Anda" style={{ borderRadius: 8, height: 38 }} />
              </Form.Item>

              <Form.Item
                name="totp_code"
                label={<Text strong style={{ fontSize: 13 }}>Kode Autentikasi MFA (6 Digit / Recovery Code)</Text>}
              >
                <Input placeholder="Contoh: 123456 atau XXXX-XXXX (jika akun mengaktifkan MFA)" style={{ borderRadius: 8, height: 38, fontWeight: 700, letterSpacing: '1px' }} />
              </Form.Item>
            </Form>
          </div>
        </Modal>
      )}

      {/* Modal: Detail & Riwayat Laporan IT */}
      {historyTicket && (
        <Modal
          title={null}
          open={historyModalOpen}
          onCancel={handleCloseHistory}
          footer={null}
          width={760}
          centered
          className="it-modal"
          destroyOnHidden
        >
          <div className="feed-modal__wrap">
            {/* Clean Professional Modal Header */}
            <div className="it-modal-header">
              <div className="it-modal-header-icon">
                <ToolOutlined />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "1.2px", color: "#2563eb", textTransform: "uppercase" }}>
                  LAPORAN KELUHAN IT HELPDESK
                </div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
                  Tiket #{historyTicket.id?.toString().padStart(4, "0")}
                </h2>
              </div>
              <Tag className={`it-status-tag ${historyStatusMeta.className}`}>
                {historyTicket.status === "completed" ? <CheckCircleFilled /> : <ClockCircleFilled />}
                {historyStatusMeta.label}
              </Tag>
            </div>

            {/* Body */}
            <div className="it-modal-body">
              {/* Reporter Info */}
              <div>
                <div className="feed-modal__section-label">
                  <UserOutlined /> Informasi Pelapor & Unit Kerja
                </div>
                <div className="it-data-card">
                  <div className="it-data-row">
                    <span className="it-data-key">Nama Pelapor</span>
                    <span className="it-data-val">{historyTicket.employee_name}</span>
                  </div>
                  <div className="it-data-row">
                    <span className="it-data-key">NIP</span>
                    <span className="it-data-val" style={{ fontFamily: "monospace" }}>
                      {historyEmployee.nip ?? "-"}
                    </span>
                  </div>
                  <div className="it-data-row">
                    <span className="it-data-key">Fungsi / Bidang</span>
                    <span className="it-data-val">
                      {historyTicket.function_area ?? historyTicket.employee_work_unit ?? historyEmployee.fungsi_bidang ?? "-"}
                    </span>
                  </div>
                  <div className="it-data-row">
                    <span className="it-data-key">Tanggal Laporan</span>
                    <span className="it-data-val">{formatDate(historyTicket.report_date)}</span>
                  </div>
                </div>
              </div>

              {/* Problem Details */}
              <div>
                <div className="feed-modal__section-label">
                  <InfoCircleOutlined /> Detail Kendala / Permasalahan
                </div>
                <div className="feed-modal__issue-box feed-modal__issue-box--danger">
                  <div className="feed-modal__issue-type">{historyTicket.report_type?.toUpperCase() || "LAPORAN KELUHAN"}</div>
                  <p className="feed-modal__issue-desc">{historyTicket.problem_details}</p>
                </div>
              </div>

              {/* IT Follow-up */}
              <div>
                <div className="feed-modal__section-label" style={{ color: "#16a34a" }}>
                  <CheckCircleOutlined /> Tindak Lanjut Tim IT Staff
                </div>
                <div className="feed-modal__issue-box feed-modal__issue-box--success">
                  <p className="feed-modal__issue-desc">
                    {historyTicket.followup_details || "Belum ada catatan tindak lanjut dari IT Staff."}
                  </p>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <div className="feed-modal__section-label">
                  <ClockCircleOutlined /> Jejak Waktu & Log Proses
                </div>
                <div style={{ background: "#f8fafc", padding: "16px 20px", borderRadius: 14, border: "1px solid #e2e8f0" }}>
                  <Timeline items={historyTimelineItems} />
                </div>
              </div>
            </div>

            {/* Corporate Footer */}
            <div className="it-modal-footer">
              <Button
                icon={<PrinterOutlined />}
                onClick={() => {
                  const baseUrlRaw = import.meta.env.VITE_API_URL || "https://siptu.bpompalopo.com/core_api/api";
                  const baseUrl = baseUrlRaw.replace(/\/+$/, "");
                  const url = `${baseUrl}/public/it-helpdesk-tickets/${historyTicket.id}/pdf`;
                  window.open(url, "_blank");
                }}
                style={{ borderRadius: 10, height: 42, fontWeight: 600 }}
              >
                Cetak Dokumen PDF
              </Button>
              <Button
                type="primary"
                onClick={handleCloseHistory}
                style={{ background: "#0f172a", borderRadius: 10, height: 42, padding: "0 24px", fontWeight: 600 }}
              >
                Tutup Detail
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ItHelpdeskDaftarLaporan;
