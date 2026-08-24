import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  Card,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Tag,
  Progress,
  Space,
  Statistic,
  Popconfirm,
  DatePicker,
  message,
  Tooltip,
  Badge,
  Row,
  Col,
  Divider,
  Typography,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  FileTextOutlined,
  DownloadOutlined,
  LinkOutlined,
  MinusCircleOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "../hooks/useAuth.js";
import "./RhpkManagement.css";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const TEAM_UNITS = [
  "Pokja Infokom",
  "Pokja Pemeriksaan",
  "Pokja Penindakan",
  "Pokja Pengujian",
  "Subbag Tata Usaha",
  "Layanan Informasi & Pengaduan",
];

const PERIOD_OPTIONS = [
  "Triwulan I",
  "Triwulan II",
  "Triwulan III",
  "Triwulan IV",
  "Semester I",
  "Semester II",
  "Tahunan",
];

export default function RhpkManagement() {
  const { apiFetch, user, currentRole } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    total_reports: 0,
    approved_reports: 0,
    submitted_reports: 0,
    avg_progress: 0,
    total_delayed_items: 0,
  });

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  // Modal Form States
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form] = Form.useForm();
  const [reviewForm] = Form.useForm();

  const canReview = user?.base_role === "admin" || ["admin", "validator"].includes(currentRole);

  // Fetch Summary Metrics
  const fetchSummary = useCallback(async () => {
    try {
      const res = await apiFetch(`/rhpk/summary?year=${selectedYear}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (e) {
      console.error("Gagal mengambil summary RHPK", e);
    }
  }, [apiFetch, selectedYear]);

  // Fetch Reports List
  const fetchReports = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        let url = `/rhpk?page=${page}&per_page=${pagination.pageSize}&year=${selectedYear}`;
        if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
        if (selectedPeriod) url += `&period=${encodeURIComponent(selectedPeriod)}`;
        if (selectedTeam) url += `&team_unit=${encodeURIComponent(selectedTeam)}`;
        if (selectedStatus) url += `&status=${encodeURIComponent(selectedStatus)}`;

        const res = await apiFetch(url);
        if (res.ok) {
          const data = await res.json();
          setReports(data.data || []);
          setPagination({
            current: data.current_page || 1,
            pageSize: data.per_page || 10,
            total: data.total || 0,
          });
        }
      } catch (e) {
        message.error("Gagal memuat daftar RHPK");
      } finally {
        setLoading(false);
      }
    },
    [apiFetch, pagination.pageSize, selectedYear, searchTerm, selectedPeriod, selectedTeam, selectedStatus]
  );

  useEffect(() => {
    fetchSummary();
    fetchReports(1);
  }, [fetchSummary, fetchReports]);

  // Open Form Modal (Add or Edit)
  const handleOpenForm = (report = null) => {
    setEditingReport(report);
    if (report) {
      form.setFieldsValue({
        title: report.title,
        year: report.year,
        period: report.period,
        team_unit: report.team_unit,
        items: report.items ? report.items.map((item) => ({
          ...item,
          execution_date: item.execution_date ? dayjs(item.execution_date) : null,
        })) : [],
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        year: dayjs().year(),
        period: "Triwulan I",
        team_unit: TEAM_UNITS[0],
        items: [
          { rhk_name: "", indicator: "", target_volume: 1, unit: "Laporan", realization_volume: 0, status: "pending" },
        ],
      });
    }
    setFormModalVisible(true);
  };

  // Submit Form Modal
  const handleFormFinish = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        items: values.items.map((item) => ({
          ...item,
          execution_date: item.execution_date ? dayjs(item.execution_date).format("YYYY-MM-DD") : null,
        })),
      };

      const url = editingReport ? `/rhpk/${editingReport.id}` : "/rhpk";
      const method = editingReport ? "PUT" : "POST";

      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        message.success(editingReport ? "RHPK berhasil diperbarui!" : "RHPK berhasil diajukan!");
        setFormModalVisible(false);
        fetchReports(pagination.current);
        fetchSummary();
      } else {
        const err = await res.json();
        message.error(err.message || "Terjadi kesalahan saat menyimpan RHPK");
      }
    } catch (e) {
      message.error("Gagal terhubung ke server");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Report
  const handleDelete = async (id) => {
    try {
      const res = await apiFetch(`/rhpk/${id}`, { method: "DELETE" });
      if (res.ok) {
        message.success("RHPK berhasil dihapus");
        fetchReports(pagination.current);
        fetchSummary();
      }
    } catch (e) {
      message.error("Gagal menghapus RHPK");
    }
  };

  // Open Review Status Modal
  const handleOpenReview = (report) => {
    setSelectedReport(report);
    reviewForm.setFieldsValue({
      status: report.status === "draft" ? "submitted" : report.status,
      reviewer_notes: report.reviewer_notes || "",
    });
    setReviewModalVisible(true);
  };

  // Submit Review Status Update
  const handleReviewFinish = async (values) => {
    setSubmitting(true);
    try {
      const res = await apiFetch(`/rhpk/${selectedReport.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (res.ok) {
        message.success("Status RHPK berhasil diperbarui");
        setReviewModalVisible(false);
        fetchReports(pagination.current);
        fetchSummary();
      }
    } catch (e) {
      message.error("Gagal memperbarui status RHPK");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Detail View Modal
  const handleOpenDetail = (report) => {
    setSelectedReport(report);
    setDetailModalVisible(true);
  };

  // Status Badge Mapper
  const renderStatusTag = (status) => {
    const map = {
      draft: { color: "default", text: "DRAFT" },
      submitted: { color: "processing", text: "DIAJUKAN" },
      approved: { color: "success", text: "DISETUJUI" },
      revision: { color: "warning", text: "REVISI" },
      rejected: { color: "error", text: "DITOLAK" },
    };
    const conf = map[status] || { color: "default", text: status };
    return <Tag color={conf.color} style={{ fontWeight: 700, borderRadius: 6 }}>{conf.text}</Tag>;
  };

  // Item Status Mapper
  const renderItemStatusTag = (status) => {
    const map = {
      pending: { color: "default", text: "Belum Mulai" },
      in_progress: { color: "processing", text: "Proses" },
      completed: { color: "success", text: "Selesai" },
      delayed: { color: "error", text: "Terkendala" },
    };
    const conf = map[status] || { color: "default", text: status };
    return <Tag color={conf.color}>{conf.text}</Tag>;
  };

  // Columns for Table
  const columns = [
    {
      title: "Kegiatan / RHPK",
      dataIndex: "title",
      key: "title",
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "14px" }}>{text}</div>
          <div style={{ fontSize: "11px", color: "#64748b" }}>
            Tim: <strong>{record.team_unit || "Umum"}</strong> | Pembuat: {record.creator?.name || "-"}
          </div>
        </div>
      ),
    },
    {
      title: "Periode & Tahun",
      key: "period",
      width: 160,
      render: (_, record) => (
        <span style={{ fontWeight: 600, color: "#334155" }}>
          {record.period} ({record.year})
        </span>
      ),
    },
    {
      title: "Capaian Kinerja",
      dataIndex: "total_target_percentage",
      key: "total_target_percentage",
      width: 180,
      render: (val) => (
        <div>
          <Progress percent={Number(val || 0)} size="small" strokeColor={val >= 100 ? "#10b981" : val >= 50 ? "#0f5b99" : "#f59e0b"} />
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (status) => renderStatusTag(status),
    },
    {
      title: "Tanggal Buat",
      dataIndex: "created_at",
      key: "created_at",
      width: 140,
      render: (date) => (date ? dayjs(date).format("DD MMM YYYY") : "-"),
    },
    {
      title: "Aksi",
      key: "action",
      width: 160,
      align: "center",
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Lihat Detail">
            <Button icon={<EyeOutlined />} size="small" onClick={() => handleOpenDetail(record)} />
          </Tooltip>
          <Tooltip title="Edit RHPK">
            <Button icon={<EditOutlined />} size="small" onClick={() => handleOpenForm(record)} />
          </Tooltip>
          {canReview && (
            <Tooltip title="Verifikasi / Status">
              <Button icon={<CheckCircleOutlined />} size="small" type="primary" ghost onClick={() => handleOpenReview(record)} />
            </Tooltip>
          )}
          <Popconfirm title="Hapus RHPK ini?" onConfirm={() => handleDelete(record.id)} okText="Ya" cancelText="Batal">
            <Button icon={<DeleteOutlined />} danger size="small" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="rhpk-container">
      {/* Header Bar */}
      <div className="rhpk-header-bar">
        <div className="rhpk-title-box">
          <h2>Pengelolaan RHPK</h2>
          <p>Rekapitulasi Hasil Pelaksanaan Kegiatan & Capaian Indikator Kinerja Balai POM di Palopo</p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => { fetchSummary(); fetchReports(1); }}>
            Refresh
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenForm()} style={{ background: "#0f5b99", borderColor: "#0f5b99", fontWeight: 700 }}>
            Buat RHPK Baru
          </Button>
        </Space>
      </div>

      {/* Modern Statistics Cards */}
      <div className="rhpk-stats-row">
        <div className="rhpk-stat-card">
          <div className="rhpk-stat-header">
            <span>Total Pengajuan</span>
            <FileTextOutlined className="rhpk-stat-icon" />
          </div>
          <div className="rhpk-stat-value">{summary.total_reports}</div>
        </div>

        <div className="rhpk-stat-card">
          <div className="rhpk-stat-header">
            <span>RHPK Disetujui</span>
            <CheckCircleOutlined className="rhpk-stat-icon" style={{ color: "#10b981", background: "#ecfdf5" }} />
          </div>
          <div className="rhpk-stat-value" style={{ color: "#10b981" }}>{summary.approved_reports}</div>
        </div>

        <div className="rhpk-stat-card">
          <div className="rhpk-stat-header">
            <span>Rata-Rata Capaian (%)</span>
            <ClockCircleOutlined className="rhpk-stat-icon" style={{ color: "#2563eb", background: "#eff6ff" }} />
          </div>
          <div className="rhpk-stat-value" style={{ color: "#2563eb" }}>{summary.avg_progress}%</div>
        </div>

        <div className="rhpk-stat-card">
          <div className="rhpk-stat-header">
            <span>Kegiatan Terkendala</span>
            <WarningOutlined className="rhpk-stat-icon" style={{ color: "#ef4444", background: "#fef2f2" }} />
          </div>
          <div className="rhpk-stat-value" style={{ color: "#ef4444" }}>{summary.total_delayed_items}</div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="rhpk-main-card">
        {/* Filter Bar */}
        <div className="rhpk-filter-bar">
          <Input
            placeholder="Cari judul RHPK / tim..."
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: 240 }}
          />

          <Select value={selectedYear} onChange={(val) => setSelectedYear(val)} style={{ width: 120 }}>
            {[2024, 2025, 2026, 2027].map((y) => (
              <Option key={y} value={y}>{y}</Option>
            ))}
          </Select>

          <Select value={selectedPeriod} onChange={(val) => setSelectedPeriod(val)} placeholder="Semua Periode" allowClear style={{ width: 150 }}>
            {PERIOD_OPTIONS.map((p) => (
              <Option key={p} value={p}>{p}</Option>
            ))}
          </Select>

          <Select value={selectedTeam} onChange={(val) => setSelectedTeam(val)} placeholder="Semua Tim Kerja" allowClear style={{ width: 180 }}>
            {TEAM_UNITS.map((t) => (
              <Option key={t} value={t}>{t}</Option>
            ))}
          </Select>

          <Select value={selectedStatus} onChange={(val) => setSelectedStatus(val)} placeholder="Semua Status" allowClear style={{ width: 140 }}>
            <Option value="draft">Draft</Option>
            <Option value="submitted">Diajukan</Option>
            <Option value="approved">Disetujui</Option>
            <Option value="revision">Revisi</Option>
            <Option value="rejected">Ditolak</Option>
          </Select>
        </div>

        {/* Ant Design Data Table */}
        <Table
          rowKey="id"
          className="rhpk-table"
          columns={columns}
          dataSource={reports}
          loading={loading}
          pagination={{
            ...pagination,
            onChange: (page) => fetchReports(page),
          }}
        />
      </div>

      {/* ==================== MODAL FORM CREATE / EDIT ==================== */}
      <Modal
        title={<span style={{ fontWeight: 800, color: "#0f5b99" }}>{editingReport ? "Edit RHPK" : "Buat Pengajuan RHPK Baru"}</span>}
        open={formModalVisible}
        onCancel={() => setFormModalVisible(false)}
        footer={null}
        width={900}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleFormFinish}>
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item name="title" label="Judul Program / Kegiatan RHPK" rules={[{ required: true, message: "Judul RHPK wajib diisi" }]}>
                <Input placeholder="Contoh: Rekapitulasi Hasil Pengawasan Pasar Obat dan Makanan TW I" />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item name="year" label="Tahun" rules={[{ required: true }]}>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item name="period" label="Periode" rules={[{ required: true }]}>
                <Select>
                  {PERIOD_OPTIONS.map((p) => (
                    <Option key={p} value={p}>{p}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="team_unit" label="Tim Kerja / Pokja / Unit">
            <Select placeholder="Pilih Tim Kerja">
              {TEAM_UNITS.map((t) => (
                <Option key={t} value={t}>{t}</Option>
              ))}
            </Select>
          </Form.Item>

          <Divider orientation="left" style={{ borderColor: "#e2e8f0", color: "#0f5b99", fontWeight: 700, fontSize: "14px" }}>
            Detail Rencana Hasil Kerja (RHK) & Indikator Kinerja
          </Divider>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }, idx) => (
                  <div key={key} className="rhpk-item-box">
                    <div className="rhpk-item-box-title">
                      <span>RHK #{idx + 1}</span>
                      {fields.length > 1 && (
                        <MinusCircleOutlined onClick={() => remove(name)} style={{ color: "#ef4444", cursor: "pointer" }} />
                      )}
                    </div>

                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item
                          {...restField}
                          name={[name, "rhk_name"]}
                          label="Nama RHK / Sub-Kegiatan"
                          rules={[{ required: true, message: "Nama RHK wajib diisi" }]}
                        >
                          <Input placeholder="Contoh: Inspeksi Sarana Distribusi Obat" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          {...restField}
                          name={[name, "indicator"]}
                          label="Indikator Kinerja Output"
                          rules={[{ required: true, message: "Indikator wajib diisi" }]}
                        >
                          <Input placeholder="Contoh: Jumlah Laporan Hasil Inspeksi Terverifikasi" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={12}>
                      <Col span={6}>
                        <Form.Item {...restField} name={[name, "target_volume"]} label="Target Volume" rules={[{ required: true }]}>
                          <InputNumber min={1} style={{ width: "100%" }} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item {...restField} name={[name, "realization_volume"]} label="Realisasi Volume">
                          <InputNumber min={0} style={{ width: "100%" }} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item {...restField} name={[name, "unit"]} label="Satuan">
                          <Input placeholder="Laporan / Dokumen" />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item {...restField} name={[name, "status"]} label="Status Capaian">
                          <Select>
                            <Option value="pending">Belum Mulai</Option>
                            <Option value="in_progress">Proses</Option>
                            <Option value="completed">Selesai</Option>
                            <Option value="delayed">Terkendala</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item {...restField} name={[name, "evidence_url"]} label="Link Eviden / Bukti Dukung (Drive / PDF)">
                          <Input prefix={<LinkOutlined />} placeholder="https://drive.google.com/..." />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item {...restField} name={[name, "obstacle_notes"]} label="Kendala / Catatan Realisasi">
                          <Input placeholder="Catatan jika terjadi hambatan..." />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                ))}

                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    Tambah Items RHK
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <div style={{ textAlign: "right", marginTop: 20 }}>
            <Space>
              <Button onClick={() => setFormModalVisible(false)}>Batal</Button>
              <Button type="primary" htmlType="submit" loading={submitting} style={{ background: "#0f5b99", borderColor: "#0f5b99", fontWeight: 700 }}>
                Simpan RHPK
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* ==================== MODAL DETAIL RHPK ==================== */}
      {selectedReport && (
        <Modal
          title={<span style={{ fontWeight: 800, color: "#0f5b99" }}>Detail RHPK: {selectedReport.title}</span>}
          open={detailModalVisible}
          onCancel={() => setDetailModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setDetailModalVisible(false)}>
              Tutup
            </Button>,
          ]}
          width={850}
        >
          <div className="rhpk-detail-header">
            <div className="rhpk-detail-grid">
              <div>
                <div className="rhpk-detail-label">Periode & Tahun</div>
                <div className="rhpk-detail-val">{selectedReport.period} ({selectedReport.year})</div>
              </div>
              <div>
                <div className="rhpk-detail-label">Tim Kerja</div>
                <div className="rhpk-detail-val">{selectedReport.team_unit || "Umum"}</div>
              </div>
              <div>
                <div className="rhpk-detail-label">Penanggung Jawab</div>
                <div className="rhpk-detail-val">{selectedReport.creator?.name || "-"}</div>
              </div>
              <div>
                <div className="rhpk-detail-label">Status Verifikasi</div>
                <div className="rhpk-detail-val">{renderStatusTag(selectedReport.status)}</div>
              </div>
            </div>
          </div>

          <Title level={5} style={{ color: "#0f5b99", marginBottom: 12 }}>
            Daftar Rencana Hasil Kerja (RHK) & Progress Capaian
          </Title>

          <Table
            rowKey="id"
            pagination={false}
            dataSource={selectedReport.items || []}
            columns={[
              {
                title: "Nama RHK / Sub-Kegiatan",
                dataIndex: "rhk_name",
                key: "rhk_name",
                render: (text, record) => (
                  <div>
                    <strong>{text}</strong>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Indikator: {record.indicator}</div>
                  </div>
                ),
              },
              {
                title: "Target vs Realisasi",
                key: "vol",
                width: 160,
                render: (_, r) => (
                  <span>
                    <strong>{r.realization_volume}</strong> / {r.target_volume} {r.unit}
                  </span>
                ),
              },
              {
                title: "Progress (%)",
                dataIndex: "progress_percentage",
                key: "progress_percentage",
                width: 140,
                render: (p) => <Progress percent={Number(p || 0)} size="small" />,
              },
              {
                title: "Status",
                dataIndex: "status",
                key: "status",
                width: 120,
                render: (s) => renderItemStatusTag(s),
              },
              {
                title: "Eviden",
                dataIndex: "evidence_url",
                key: "evidence_url",
                width: 100,
                align: "center",
                render: (url) =>
                  url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <Button icon={<LinkOutlined />} size="small" type="primary" ghost />
                    </a>
                  ) : (
                    "-"
                  ),
              },
            ]}
          />

          {selectedReport.reviewer_notes && (
            <div style={{ marginTop: 20, padding: 12, background: "#fffbe6", border: "1px solid #ffe58f", borderRadius: 8 }}>
              <strong style={{ color: "#d48806" }}>Catatan Verifikator:</strong>
              <Paragraph style={{ margin: "4px 0 0 0", color: "#855800" }}>{selectedReport.reviewer_notes}</Paragraph>
            </div>
          )}
        </Modal>
      )}

      {/* ==================== MODAL VERIFIKASI / STATUS REVIEW ==================== */}
      {selectedReport && (
        <Modal
          title={<span style={{ fontWeight: 800, color: "#0f5b99" }}>Verifikasi / Review Status RHPK</span>}
          open={reviewModalVisible}
          onCancel={() => setReviewModalVisible(false)}
          footer={null}
          width={550}
        >
          <Form form={reviewForm} layout="vertical" onFinish={handleReviewFinish}>
            <Form.Item name="status" label="Status Persetujuan RHPK" rules={[{ required: true }]}>
              <Select size="large">
                <Option value="submitted">Diajukan (Menunggu Review)</Option>
                <Option value="approved">Disetujui (Approved)</Option>
                <Option value="revision">Perlu Revisi (Revision)</Option>
                <Option value="rejected">Ditolak (Rejected)</Option>
              </Select>
            </Form.Item>

            <Form.Item name="reviewer_notes" label="Catatan / Masukan Verifikator">
              <TextArea rows={4} placeholder="Tuliskan masukan atau catatan revisi untuk pembuat RHPK..." />
            </Form.Item>

            <div style={{ textAlign: "right", marginTop: 20 }}>
              <Space>
                <Button onClick={() => setReviewModalVisible(false)}>Batal</Button>
                <Button type="primary" htmlType="submit" loading={submitting} style={{ background: "#0f5b99", borderColor: "#0f5b99", fontWeight: 700 }}>
                  Simpan Verifikasi
                </Button>
              </Space>
            </div>
          </Form>
        </Modal>
      )}
    </div>
  );
}
