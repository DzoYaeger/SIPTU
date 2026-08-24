import React, { useState, useEffect, useCallback } from "react";
import {
  Tabs,
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
  message,
  Tooltip,
  Row,
  Col,
  Divider,
  Typography,
  Badge,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  FileTextOutlined,
  LinkOutlined,
  LockOutlined,
  FileDoneOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "../hooks/useAuth.js";
import "./RhpkManagement.css";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export default function RhpkModuleUnified() {
  const { apiFetch, user, currentRole } = useAuth();
  const [activeTab, setActiveTab] = useState("outputs");

  const isAdmin = user?.base_role === "admin" || currentRole === "admin";
  const canReview = isAdmin || currentRole === "validator";

  // Shared Filters
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  const [selectedMonth, setSelectedMonth] = useState(dayjs().month() + 1); // 1-12
  const [searchTerm, setSearchTerm] = useState("");

  // ==================== TAB 1: CAPAIAN OUTPUT STATES ====================
  const [outputTargets, setOutputTargets] = useState([]);
  const [outputLoading, setOutputLoading] = useState(false);
  const [targetModalVisible, setTargetModalVisible] = useState(false);
  const [realizationModalVisible, setRealizationModalVisible] = useState(false);
  const [editingTarget, setEditingTarget] = useState(null);
  const [selectedTargetForRealization, setSelectedTargetForRealization] = useState(null);

  const [targetForm] = Form.useForm();
  const [realizationForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // ==================== TAB 2: PENJELASAN CAPAIAN STATES ====================
  const [indicators, setIndicators] = useState([]);
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [indicatorModalVisible, setIndicatorModalVisible] = useState(false);
  const [explanationModalVisible, setExplanationModalVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [editingIndicator, setEditingIndicator] = useState(null);
  const [selectedIndicatorForExp, setSelectedIndicatorForExp] = useState(null);
  const [selectedExplanationForReview, setSelectedExplanationForReview] = useState(null);

  const [indicatorForm] = Form.useForm();
  const [explanationForm] = Form.useForm();
  const [reviewForm] = Form.useForm();

  // ----------------------------------------------------------------------
  // TAB 1: CAPAIAN OUTPUT FETCH & HANDLERS
  // ----------------------------------------------------------------------
  const fetchOutputTargets = useCallback(async () => {
    setOutputLoading(true);
    try {
      let url = `/rhpk-outputs?year=${selectedYear}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      const res = await apiFetch(url);
      if (res.ok) {
        const result = await res.json();
        setOutputTargets(result.data || []);
      }
    } catch (e) {
      message.error("Gagal memuat data Capaian Output");
    } finally {
      setOutputLoading(false);
    }
  }, [apiFetch, selectedYear, searchTerm]);

  const handleSaveTarget = async (values) => {
    setSubmitting(true);
    try {
      const url = editingTarget ? `/rhpk-outputs/target/${editingTarget.id}` : "/rhpk-outputs/target";
      const method = editingTarget ? "PUT" : "POST";

      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (res.ok) {
        message.success(editingTarget ? "Master Rincian Output diperbarui" : "Master Rincian Output ditambahkan");
        setTargetModalVisible(false);
        fetchOutputTargets();
      }
    } catch (e) {
      message.error("Gagal menyimpan Rincian Output");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTarget = async (id) => {
    try {
      const res = await apiFetch(`/rhpk-outputs/target/${id}`, { method: "DELETE" });
      if (res.ok) {
        message.success("Master Rincian Output dihapus");
        fetchOutputTargets();
      }
    } catch (e) {
      message.error("Gagal menghapus Rincian Output");
    }
  };

  const handleOpenRealizationModal = (target, month) => {
    setSelectedTargetForRealization(target);
    const existingVal = target.monthly_realizations?.[month] || 0;
    realizationForm.setFieldsValue({
      rhpk_output_target_id: target.id,
      month: month,
      realization_value: existingVal,
    });
    setRealizationModalVisible(true);
  };

  const handleSaveRealization = async (values) => {
    setSubmitting(true);
    try {
      const res = await apiFetch("/rhpk-outputs/realization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (res.ok) {
        message.success("Realisasi bulanan berhasil disimpan");
        setRealizationModalVisible(false);
        fetchOutputTargets();
      }
    } catch (e) {
      message.error("Gagal menyimpan realisasi");
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------------------------------
  // TAB 2: PENJELASAN CAPAIAN FETCH & HANDLERS
  // ----------------------------------------------------------------------
  const fetchExplanationIndicators = useCallback(async () => {
    setExplanationLoading(true);
    try {
      let url = `/rhpk-explanations?year=${selectedYear}&month=${selectedMonth}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      const res = await apiFetch(url);
      if (res.ok) {
        const result = await res.json();
        setIndicators(result.data || []);
      }
    } catch (e) {
      message.error("Gagal memuat data Penjelasan Capaian");
    } finally {
      setExplanationLoading(false);
    }
  }, [apiFetch, selectedYear, selectedMonth, searchTerm]);

  useEffect(() => {
    if (activeTab === "outputs") {
      fetchOutputTargets();
    } else {
      fetchExplanationIndicators();
    }
  }, [activeTab, fetchOutputTargets, fetchExplanationIndicators]);

  const handleSaveIndicator = async (values) => {
    setSubmitting(true);
    try {
      const url = editingIndicator ? `/rhpk-explanations/indicator/${editingIndicator.id}` : "/rhpk-explanations/indicator";
      const method = editingIndicator ? "PUT" : "POST";

      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (res.ok) {
        message.success(editingIndicator ? "Master Indikator diperbarui" : "Master Indikator ditambahkan");
        setIndicatorModalVisible(false);
        fetchExplanationIndicators();
      }
    } catch (e) {
      message.error("Gagal menyimpan Indikator");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteIndicator = async (id) => {
    try {
      const res = await apiFetch(`/rhpk-explanations/indicator/${id}`, { method: "DELETE" });
      if (res.ok) {
        message.success("Master Indikator dihapus");
        fetchExplanationIndicators();
      }
    } catch (e) {
      message.error("Gagal menghapus Indikator");
    }
  };

  const handleOpenExplanationModal = (indicator) => {
    setSelectedIndicatorForExp(indicator);
    const existingExp = indicator.explanations?.[0]; // Filtered by month
    explanationForm.resetFields();
    explanationForm.setFieldsValue({
      rhpk_explanation_indicator_id: indicator.id,
      year: selectedYear,
      month: selectedMonth,
      realization_volume: existingExp?.realization_volume || "",
      achievement_percent: existingExp?.achievement_percent || "",
      inhibiting_factors: existingExp?.inhibiting_factors || "",
      success_analysis: existingExp?.success_analysis || "",
      recommendations: existingExp?.recommendations || "",
      follow_up_action: existingExp?.follow_up_action || "",
      analysis_timeline: existingExp?.analysis_timeline || "",
      is_risk_identified: existingExp?.is_risk_identified || "T",
      risk_code: existingExp?.risk_code || "",
      risk_event: existingExp?.risk_event || "",
      prev_inhibiting_factors: existingExp?.prev_inhibiting_factors || "",
      prev_recommendations: existingExp?.prev_recommendations || "",
      prev_follow_up_action: existingExp?.prev_follow_up_action || "",
      prev_status: existingExp?.prev_status || "",
      prev_progress_tl: existingExp?.prev_progress_tl || "",
      prev_timeline: existingExp?.prev_timeline || "",
      evidence_url: existingExp?.evidence_url || "",
    });
    setExplanationModalVisible(true);
  };

  const handleSaveExplanation = async (values) => {
    setSubmitting(true);
    try {
      const res = await apiFetch("/rhpk-explanations/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (res.ok) {
        message.success("Penjelasan capaian berhasil disimpan");
        setExplanationModalVisible(false);
        fetchExplanationIndicators();
      }
    } catch (e) {
      message.error("Gagal menyimpan penjelasan capaian");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReviewModal = (exp) => {
    setSelectedExplanationForReview(exp);
    reviewForm.setFieldsValue({
      status: exp.status || "submitted",
      reviewer_notes: exp.reviewer_notes || "",
    });
    setReviewModalVisible(true);
  };

  const handleSaveReview = async (values) => {
    setSubmitting(true);
    try {
      const res = await apiFetch(`/rhpk-explanations/${selectedExplanationForReview.id}/review`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (res.ok) {
        message.success("Status verifikasi berhasil diperbarui");
        setReviewModalVisible(false);
        fetchExplanationIndicators();
      }
    } catch (e) {
      message.error("Gagal memperbarui verifikasi");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Target Modal
  const handleOpenTargetModal = (target = null) => {
    setEditingTarget(target);
    targetForm.resetFields();
    if (target) {
      const monthlyValues = {};
      ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].forEach((m, idx) => {
        const mNum = idx + 1;
        monthlyValues[`target_${m}`] = target[`target_${m}`] ?? target.monthly_targets?.[mNum] ?? 0;
      });
      targetForm.setFieldsValue({
        year: target.year || selectedYear,
        code_output: target.code_output || "",
        output_name: target.output_name || "",
        budget_pagu: target.budget_pagu || 0,
        initial_target: target.initial_target ?? 1,
        revised_target: target.revised_target ?? 1,
        unit: target.unit || "Laporan",
        ...monthlyValues,
      });
    } else {
      const emptyMonthly = {};
      ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].forEach((m) => {
        emptyMonthly[`target_${m}`] = 0;
      });
      targetForm.setFieldsValue({
        year: selectedYear,
        code_output: "",
        output_name: "",
        budget_pagu: 0,
        initial_target: 1,
        revised_target: 1,
        unit: "Laporan",
        ...emptyMonthly,
      });
    }
    setTargetModalVisible(true);
  };

  const handleOpenIndicatorModal = (ind = null) => {
    setEditingIndicator(ind);
    if (ind) {
      indicatorForm.setFieldsValue(ind);
    } else {
      indicatorForm.resetFields();
      indicatorForm.setFieldsValue({ year: selectedYear });
    }
    setIndicatorModalVisible(true);
  };

  const formatDecimal = (val, maxDecimals = 4) => {
    if (val === null || val === undefined) return "0";
    const num = Number(String(val).replace(",", "."));
    if (isNaN(num)) return "0";
    const rounded = Number(Math.round(Number(num + "e" + maxDecimals)) + "e-" + maxDecimals);
    return String(rounded).replace(".", ",");
  };

  const calculateAchievementPercent = (target, realization) => {
    const targetValue = Number(target) || 0;
    const realizationValue = Number(realization) || 0;
    return targetValue > 0 ? (realizationValue / targetValue) * 100 : 0;
  };

  const numFormatter = (val) => {
    if (val === null || val === undefined || val === "") return "";
    return String(val).replace(".", ",");
  };

  const numParser = (val) => {
    if (!val) return "";
    return val.replace(",", ".");
  };

  // Format IDR Currency
  const formatRupiah = (val) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0);
  };

  // Tag Status Explanation Mapper
  const renderStatusTag = (status) => {
    const map = {
      draft: { color: "default", text: "DRAFT" },
      submitted: { color: "processing", text: "DIAJUKAN" },
      approved: { color: "success", text: "DISETUJUI" },
      revision: { color: "warning", text: "REVISI" },
      rejected: { color: "error", text: "DITOLAK" },
    };
    const conf = map[status] || { color: "default", text: status || "BELUM ISI" };
    return <Tag color={conf.color} style={{ fontWeight: 700, borderRadius: 6 }}>{conf.text}</Tag>;
  };

  // Columns Tab 1: Capaian Output
  const outputColumns = [
    {
      title: "Rincian Output (RO)",
      dataIndex: "output_name",
      key: "output_name",
      width: 250,
      fixed: "left",
      render: (text, r) => (
        <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "13px" }}>
          {r.code_output ? `${r.code_output} - ${text}` : text}
        </div>
      ),
    },
    {
      title: "Pagu Anggaran",
      dataIndex: "budget_pagu",
      key: "budget_pagu",
      width: 140,
      render: (pagu) => <span style={{ fontWeight: 600, color: "#10b981" }}>{formatRupiah(pagu)}</span>,
    },
    {
      title: "Target (Awal / Revisi)",
      key: "targets",
      width: 140,
      render: (_, r) => (
        <span style={{ fontWeight: 600 }}>
          {r.initial_target} / <strong>{r.revised_target}</strong> {r.unit}
        </span>
      ),
    },
    {
      title: "Total Realisasi",
      key: "sum_realization",
      width: 130,
      render: (_, r) => {
        const achievementPercent = calculateAchievementPercent(r.revised_target || r.initial_target, r.sum_realization);
        return (
          <div>
            <span style={{ fontWeight: 800, color: "#0f5b99", marginRight: 6 }}>{formatDecimal(achievementPercent, 2)}%</span>
            <span style={{ fontSize: "11px", color: "#64748b" }}>({r.sum_realization} {r.unit})</span>
            <Progress percent={Math.min(100, achievementPercent)} showInfo={false} size="small" strokeColor={achievementPercent >= 100 ? "#10b981" : "#0f5b99"} />
          </div>
        );
      },
    },
    // Monthly Input Grid
    ...MONTH_NAMES.map((mName, idx) => {
      const mNum = idx + 1;
      return {
        title: mName.slice(0, 3),
        key: `month_${mNum}`,
        width: 95,
        align: "center",
        render: (_, r) => {
          const targetVol = formatDecimal(r.monthly_targets?.[mNum]);
          const realVol = formatDecimal(r.monthly_realizations?.[mNum]);
          return (
            <Tooltip title={`Target ${mName}: ${targetVol} | Realisasi: ${realVol}`}>
              <div
                onClick={() => handleOpenRealizationModal(r, mNum)}
                style={{
                  cursor: "pointer",
                  padding: "4px 4px",
                  borderRadius: "6px",
                  background: realVol > 0 ? "#ecfdf5" : "#f8fafc",
                  border: realVol > 0 ? "1px solid #a7f3d0" : "1px dashed #cbd5e1",
                  fontSize: "10.5px",
                }}
              >
                <div style={{ fontWeight: 700, color: realVol >= targetVol && targetVol > 0 ? "#059669" : "#0f172a" }}>
                  Realisasi: {realVol}
                </div>
                <div style={{ fontSize: "10px", color: "#64748b", marginTop: 1 }}>Target: {targetVol}</div>
              </div>
            </Tooltip>
          );
        },
      };
    }),
    ...(isAdmin
      ? [
          {
            title: "Aksi Admin",
            key: "admin_action",
            width: 90,
            fixed: "right",
            align: "center",
            render: (_, r) => (
              <Space size="small">
                <Button icon={<EditOutlined />} size="small" onClick={() => handleOpenTargetModal(r)} />
                <Popconfirm title="Hapus Master Rincian Output ini?" onConfirm={() => handleDeleteTarget(r.id)}>
                  <Button icon={<DeleteOutlined />} danger size="small" />
                </Popconfirm>
              </Space>
            ),
          },
        ]
      : []),
  ];

  // Columns Tab 2: Penjelasan Capaian Output
  const explanationColumns = [
    {
      title: "Indikator Kinerja Output (IKU)",
      dataIndex: "indicator_name",
      key: "indicator_name",
      width: 260,
      render: (text, r) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0f172a" }}>{text}</div>
          {r.target_indicator && <div style={{ fontSize: "11px", color: "#64748b" }}>Target: {r.target_indicator}</div>}
        </div>
      ),
    },
    {
      title: "Faktor Pendukung",
      key: "supporting_factors",
      render: (_, r) => {
        const exp = r.explanations?.[0];
        return exp?.supporting_factors ? <Paragraph style={{ margin: 0, fontSize: "12.5px" }}>{exp.supporting_factors}</Paragraph> : <Text type="secondary" italic>Belum diisi</Text>;
      },
    },
    {
      title: "Faktor Penghambat / Kendala",
      key: "inhibiting_factors",
      render: (_, r) => {
        const exp = r.explanations?.[0];
        return exp?.inhibiting_factors ? <Paragraph style={{ margin: 0, fontSize: "12.5px", color: "#b91c1c" }}>{exp.inhibiting_factors}</Paragraph> : <Text type="secondary" italic>-</Text>;
      },
    },
    {
      title: "Tindak Lanjut / Solusi",
      key: "follow_up_action",
      render: (_, r) => {
        const exp = r.explanations?.[0];
        return exp?.follow_up_action ? <Paragraph style={{ margin: 0, fontSize: "12.5px", color: "#047857" }}>{exp.follow_up_action}</Paragraph> : <Text type="secondary" italic>-</Text>;
      },
    },
    {
      title: "Eviden / Status",
      key: "evidence_status",
      width: 140,
      align: "center",
      render: (_, r) => {
        const exp = r.explanations?.[0];
        return (
          <Space direction="vertical" size={4}>
            {renderStatusTag(exp?.status)}
            {exp?.evidence_url ? (
              <a href={exp.evidence_url} target="_blank" rel="noopener noreferrer">
                <Tag icon={<LinkOutlined />} color="blue">Eviden</Tag>
              </a>
            ) : null}
          </Space>
        );
      },
    },
    {
      title: "Aksi User / Reviewer",
      key: "actions",
      width: 150,
      align: "center",
      render: (_, r) => {
        const exp = r.explanations?.[0];
        return (
          <Space size="small">
            <Button
              type="primary"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenExplanationModal(r)}
              style={{ background: "#0f5b99", borderColor: "#0f5b99" }}
            >
              Isi Narasi
            </Button>
            {canReview && exp && (
              <Tooltip title="Verifikasi Narasi">
                <Button icon={<CheckCircleOutlined />} size="small" type="primary" ghost onClick={() => handleOpenReviewModal(exp)} />
              </Tooltip>
            )}
            {isAdmin && (
              <Popconfirm title="Hapus Master Indikator ini?" onConfirm={() => handleDeleteIndicator(r.id)}>
                <Button icon={<DeleteOutlined />} danger size="small" />
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div className="rhpk-container">
      {/* Header Bar */}
      <div className="rhpk-header-bar">
        <div className="rhpk-title-box">
          <h2>Pengelolaan RHPK (Rencana Hasil Pelaksanaan Kegiatan)</h2>
          <p>Sistem Pengelolaan Capaian Output & Penjelasan Narasi Indikator Kinerja Balai Besar POM di Palopo</p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => (activeTab === "outputs" ? fetchOutputTargets() : fetchExplanationIndicators())}>
            Refresh
          </Button>
          {isAdmin && activeTab === "outputs" && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenTargetModal()} style={{ background: "#0f5b99", borderColor: "#0f5b99", fontWeight: 700 }}>
              Tambah Master Rincian Output
            </Button>
          )}
          {isAdmin && activeTab === "explanations" && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenIndicatorModal()} style={{ background: "#0f5b99", borderColor: "#0f5b99", fontWeight: 700 }}>
              Tambah Master Indikator
            </Button>
          )}
        </Space>
      </div>

      {/* Shared Filter Bar */}
      <div className="rhpk-main-card" style={{ marginBottom: 20 }}>
        <div className="rhpk-filter-bar" style={{ marginBottom: 0 }}>
          <Input
            placeholder="Cari Rincian Output / Indikator..."
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: 260 }}
          />

          <Select value={selectedYear} onChange={(val) => setSelectedYear(val)} style={{ width: 120 }}>
            {[2024, 2025, 2026, 2027].map((y) => (
              <Option key={y} value={y}>Tahun {y}</Option>
            ))}
          </Select>

          {activeTab === "explanations" && (
            <Select value={selectedMonth} onChange={(val) => setSelectedMonth(val)} style={{ width: 150 }}>
              {MONTH_NAMES.map((mName, idx) => (
                <Option key={idx + 1} value={idx + 1}>{mName}</Option>
              ))}
            </Select>
          )}
        </div>
      </div>

      {/* Main Tabs Container */}
      <div className="rhpk-main-card">
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key)}
          items={[
            {
              key: "outputs",
              label: <span style={{ fontWeight: 700, fontSize: "14px" }}><FileTextOutlined /> 1. Capaian Output</span>,
              children: (
                <Table
                  rowKey="id"
                  className="rhpk-table"
                  columns={outputColumns}
                  dataSource={outputTargets}
                  loading={outputLoading}
                  scroll={{ x: 1400 }}
                  pagination={false}
                />
              ),
            },
            {
              key: "explanations",
              label: <span style={{ fontWeight: 700, fontSize: "14px" }}><FileDoneOutlined /> 2. Penjelasan Capaian Output</span>,
              children: (
                <Table
                  rowKey="id"
                  className="rhpk-table"
                  columns={explanationColumns}
                  dataSource={indicators}
                  loading={explanationLoading}
                  pagination={false}
                />
              ),
            },
          ]}
        />
      </div>

      {/* ==================== MODAL ADMIN: TAMBAH/EDIT TARGET RINCIAN OUTPUT ==================== */}
      <Modal
        title={<span style={{ fontWeight: 800, color: "#0f5b99" }}>{editingTarget ? "Edit Master Rincian Output" : "Tambah Master Rincian Output (Admin)"}</span>}
        open={targetModalVisible}
        onCancel={() => setTargetModalVisible(false)}
        footer={null}
        width={750}
      >
        <Form form={targetForm} layout="vertical" onFinish={handleSaveTarget}>
          <Row gutter={12}>
            <Col span={6}>
              <Form.Item name="year" label="Tahun" rules={[{ required: true }]}>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="code_output" label="Kode Output">
                <Input placeholder="Contoh: 1064.BMA" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="output_name" label="Rincian Output (Nama Kegiatan)" rules={[{ required: true }]}>
                <Input placeholder="Nama Rincian Output..." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="budget_pagu" label="Pagu Anggaran (Rp)">
                <InputNumber style={{ width: "100%" }} formatter={(v) => `Rp ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")} parser={(v) => v.replace(/\Rp\s?|(\.*)/g, "")} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="initial_target" label="Target Semula" rules={[{ required: true }]}>
                <InputNumber min={0} step={0.001} decimalSeparator="," formatter={numFormatter} parser={numParser} style={{ width: "100%" }} placeholder="Contoh: 0,083" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="revised_target" label="Target Menjadi" rules={[{ required: true }]}>
                <InputNumber min={0} step={0.001} decimalSeparator="," formatter={numFormatter} parser={numParser} style={{ width: "100%" }} placeholder="Contoh: 0,083" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" style={{ borderColor: "#e2e8f0", color: "#0f5b99", fontWeight: 700, fontSize: "13px" }}>
            Target per Bulan (Januari s/d Desember)
          </Divider>

          <Row gutter={[12, 12]}>
            {MONTH_NAMES.map((mName, idx) => {
              const fieldName = `target_${["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"][idx]}`;
              return (
                <Col span={4} key={fieldName}>
                  <Form.Item name={fieldName} label={mName}>
                    <InputNumber min={0} step={0.001} decimalSeparator="," formatter={numFormatter} parser={numParser} style={{ width: "100%" }} placeholder="0,083" />
                  </Form.Item>
                </Col>
              );
            })}
          </Row>

          <div style={{ textAlign: "right", marginTop: 20 }}>
            <Space>
              <Button onClick={() => setTargetModalVisible(false)}>Batal</Button>
              <Button type="primary" htmlType="submit" loading={submitting} style={{ background: "#0f5b99", borderColor: "#0f5b99", fontWeight: 700 }}>
                Simpan Target
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* ==================== MODAL USER: INPUT REALISASI BULANAN ==================== */}
      {selectedTargetForRealization && (
        <Modal
          title={<span style={{ fontWeight: 800, color: "#0f5b99" }}>Input Realisasi Bulanan ({MONTH_NAMES[(realizationForm.getFieldValue("month") || 1) - 1]})</span>}
          open={realizationModalVisible}
          onCancel={() => setRealizationModalVisible(false)}
          footer={null}
          width={500}
        >
          <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, marginBottom: 16, border: "1px solid #e2e8f0" }}>
            <strong>{selectedTargetForRealization.output_name}</strong>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: 4 }}>
              Target Bulan ini: <strong>{formatDecimal(selectedTargetForRealization.monthly_targets?.[realizationForm.getFieldValue("month")])} {selectedTargetForRealization.unit}</strong>
            </div>
          </div>

          <Form form={realizationForm} layout="vertical" onFinish={handleSaveRealization}>
            <Form.Item name="rhpk_output_target_id" hidden><Input /></Form.Item>
            <Form.Item name="month" hidden><Input /></Form.Item>

            <Form.Item name="realization_value" label="Jumlah Realisasi Bulan Ini" rules={[{ required: true, message: "Realisasi wajib diisi" }]}>
              <InputNumber min={0} step={0.001} decimalSeparator="," formatter={numFormatter} parser={numParser} style={{ width: "100%" }} size="large" placeholder="Contoh: 0,083" />
            </Form.Item>

            <Form.Item name="notes" label="Catatan Tambahan (Opsional)">
              <TextArea rows={3} placeholder="Catatan atau keterangan pelaksanaan..." />
            </Form.Item>

            <div style={{ textAlign: "right", marginTop: 20 }}>
              <Space>
                <Button onClick={() => setRealizationModalVisible(false)}>Batal</Button>
                <Button type="primary" htmlType="submit" loading={submitting} style={{ background: "#0f5b99", borderColor: "#0f5b99", fontWeight: 700 }}>
                  Simpan Realisasi
                </Button>
              </Space>
            </div>
          </Form>
        </Modal>
      )}

      {/* ==================== MODAL ADMIN: TAMBAH/EDIT MASTER INDIKATOR ==================== */}
      <Modal
        title={<span style={{ fontWeight: 800, color: "#0f5b99" }}>{editingIndicator ? "Edit Master Indikator" : "Tambah Master Indikator (Admin)"}</span>}
        open={indicatorModalVisible}
        onCancel={() => setIndicatorModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={indicatorForm} layout="vertical" onFinish={handleSaveIndicator}>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="year" label="Tahun" rules={[{ required: true }]}>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="code_indicator" label="Kode Indikator">
                <Input placeholder="Contoh: IKU-01" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="indicator_name" label="Nama Indikator Kinerja Output (IKU)" rules={[{ required: true }]}>
            <TextArea rows={2} placeholder="Masukkan nama indikator kinerja..." />
          </Form.Item>

          <Form.Item name="target_indicator" label="Target Indikator (Misal: 100% / 12 Laporan)">
            <Input placeholder="Contoh: 100%" />
          </Form.Item>

          <div style={{ textAlign: "right", marginTop: 20 }}>
            <Space>
              <Button onClick={() => setIndicatorModalVisible(false)}>Batal</Button>
              <Button type="primary" htmlType="submit" loading={submitting} style={{ background: "#0f5b99", borderColor: "#0f5b99", fontWeight: 700 }}>
                Simpan Indikator
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* ==================== MODAL USER: INPUT PENJELASAN CAPAIAN NARASI ==================== */}
      {selectedIndicatorForExp && (
        <Modal
          title={<span style={{ fontWeight: 800, color: "#0f5b99" }}>Input Penjelasan Capaian ({MONTH_NAMES[selectedMonth - 1]})</span>}
          open={explanationModalVisible}
          onCancel={() => {
            setExplanationModalVisible(false);
            explanationForm.resetFields();
          }}
          footer={null}
          width={760}
          destroyOnClose
          preserve={false}
        >
          <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, marginBottom: 16, border: "1px solid #e2e8f0" }}>
            <strong style={{ fontSize: "14px" }}>{selectedIndicatorForExp.indicator_name}</strong>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: 4 }}>
              Target: <strong>{selectedIndicatorForExp.target_indicator || "-"}</strong>
            </div>
          </div>

          <Form form={explanationForm} layout="vertical" onFinish={handleSaveExplanation} preserve={false}>
            <Form.Item name="rhpk_explanation_indicator_id" hidden><Input /></Form.Item>
            <Form.Item name="year" hidden><Input /></Form.Item>
            <Form.Item name="month" hidden><Input /></Form.Item>

            {/* Capaian Utama */}
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="realization_volume" label="1. Realisasi Volume">
                  <Input placeholder="Contoh: 1 Laporan / 12 Sampel" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="achievement_percent" label="2. Capaian (%)">
                  <Input placeholder="Contoh: 100%" />
                </Form.Item>
              </Col>
            </Row>

            {/* Induk Judul 1: ANALISA CAPAIAN */}
            <Divider orientation="left" style={{ borderColor: "#0f5b99", color: "#0f5b99", fontWeight: 700, fontSize: "13px" }}>
              ANALISA CAPAIAN
            </Divider>

            <Form.Item name="inhibiting_factors" label="1. Kendala / Permasalahan">
              <TextArea rows={2} placeholder="Kendala atau hambatan pelaksanaan..." />
            </Form.Item>

            <Form.Item name="success_analysis" label="2. Analisa Keberhasilan (Jika IKU Tercapai)">
              <TextArea rows={2} placeholder="Analisa pendorong keberhasilan pencapaian IKU..." />
            </Form.Item>

            <Form.Item name="recommendations" label="3. Rekomendasi">
              <TextArea rows={2} placeholder="Rekomendasi perbaikan..." />
            </Form.Item>

            <Form.Item name="follow_up_action" label="4. Rencana Tindak Lanjut">
              <TextArea rows={2} placeholder="Langkah strategis tindak lanjut..." />
            </Form.Item>

            <Form.Item name="analysis_timeline" label="5. Timeline">
              <Input placeholder="Contoh: TW I / Maret 2026" />
            </Form.Item>

            <Row gutter={12}>
              <Col span={8}>
                <Form.Item name="is_risk_identified" label="6. Diidentifikasi Risiko?">
                  <Select options={[{ label: "Ya (Y)", value: "Y" }, { label: "Tidak (T)", value: "T" }]} />
                </Form.Item>
              </Col>
              <Col span={16}>
                <Form.Item name="risk_code" label="7. Kode Risiko">
                  <Input placeholder="Contoh: R-01" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="risk_event" label="8. Peristiwa Risiko">
              <TextArea rows={2} placeholder="Peristiwa risiko yang mungkin terjadi..." />
            </Form.Item>

            {/* Induk Judul 2: TINDAK LANJUT REKOMENDASI HASIL EVALUASI SEBELUMNYA */}
            <Divider orientation="left" style={{ borderColor: "#0f5b99", color: "#0f5b99", fontWeight: 700, fontSize: "13px" }}>
              TINDAK LANJUT REKOMENDASI HASIL EVALUASI SEBELUMNYA
            </Divider>

            <Form.Item name="prev_inhibiting_factors" label="1. Kendala / Permasalahan TW / Bulan Sebelumnya">
              <TextArea rows={2} placeholder="Kendala TW/Bulan sebelumnya..." />
            </Form.Item>

            <Form.Item name="prev_recommendations" label="2. Rekomendasi TW / Bulan Sebelumnya">
              <TextArea rows={2} placeholder="Rekomendasi TW/Bulan sebelumnya..." />
            </Form.Item>

            <Form.Item name="prev_follow_up_action" label="3. RTL TW / Bulan Sebelumnya">
              <TextArea rows={2} placeholder="Rencana Tindak Lanjut TW/Bulan sebelumnya..." />
            </Form.Item>

            <Row gutter={12}>
              <Col span={8}>
                <Form.Item name="prev_status" label="4. Status">
                  <Input placeholder="Contoh: Selesai / Dalam Proses" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="prev_timeline" label="6. Timeline">
                  <Input placeholder="Contoh: TW IV 2025" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="prev_progress_tl" label="5. Progres TL Rekomendasi">
              <TextArea rows={2} placeholder="Perkembangan/Progres pelaksanaan tindak lanjut rekomendasi..." />
            </Form.Item>

            {/* Berkas Eviden */}
            <Divider orientation="left" style={{ borderColor: "#e2e8f0", color: "#475569", fontWeight: 600, fontSize: "12px" }}>
              BERKAS BUKTI DUKUNG
            </Divider>

            <Form.Item name="evidence_url" label="Link Bukti Dukung (Google Drive / PDF Eviden)">
              <Input prefix={<LinkOutlined />} placeholder="https://drive.google.com/..." />
            </Form.Item>

            <div style={{ textAlign: "right", marginTop: 20 }}>
              <Space>
                <Button onClick={() => setExplanationModalVisible(false)}>Batal</Button>
                <Button type="primary" htmlType="submit" loading={submitting} style={{ background: "#0f5b99", borderColor: "#0f5b99", fontWeight: 700 }}>
                  Simpan Narasi
                </Button>
              </Space>
            </div>
          </Form>
        </Modal>
      )}

      {/* ==================== MODAL VERIFIKATOR / REVIEWER ==================== */}
      {selectedExplanationForReview && (
        <Modal
          title={<span style={{ fontWeight: 800, color: "#0f5b99" }}>Verifikasi Penjelasan Capaian</span>}
          open={reviewModalVisible}
          onCancel={() => setReviewModalVisible(false)}
          footer={null}
          width={500}
        >
          <Form form={reviewForm} layout="vertical" onFinish={handleSaveReview}>
            <Form.Item name="status" label="Status Persetujuan Narasi" rules={[{ required: true }]}>
              <Select size="large">
                <Option value="submitted">Diajukan (Menunggu Review)</Option>
                <Option value="approved">Disetujui (Approved)</Option>
                <Option value="revision">Perlu Revisi (Revision)</Option>
                <Option value="rejected">Ditolak (Rejected)</Option>
              </Select>
            </Form.Item>

            <Form.Item name="reviewer_notes" label="Catatan Verifikator">
              <TextArea rows={4} placeholder="Tuliskan masukan atau arahan revisi..." />
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
