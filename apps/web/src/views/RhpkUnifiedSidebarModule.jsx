import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Tag,
  Progress,
  Space,
  Popconfirm,
  message,
  Tooltip,
  Row,
  Col,
  Divider,
  Typography,
  Spin,
} from "antd";
import {
  FileTextOutlined,
  FileDoneOutlined,
  PieChartOutlined,
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  LinkOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  FileProtectOutlined,
  ArrowLeftOutlined,
  DownOutlined,
  UpOutlined,
  RightOutlined,
  InboxOutlined,
  FundOutlined,
  DollarOutlined,
  AimOutlined,
  BarChartOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import rispegPengumumanIcon from "../assets/icons/rispeg-pengumuman-icon.png";
import "./RhpkUnifiedSidebarModule.css";

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const MONTH_NAMES = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];
const MONTH_SHORT = ["JAN","FEB","MAR","APR","MEI","JUN","JUL","AGU","SEP","OKT","NOV","DES"];
const MONTH_FIELDS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];

export default function RhpkUnifiedSidebarModule() {
  const { apiFetch, user, currentRole } = useAuth();
  const navigate = useNavigate();

  // Sidebar State
  const [collapsed, setCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState("capaian-output");

  const isAdmin = user?.base_role === "admin" || currentRole === "admin";
  const canReview = isAdmin || currentRole === "validator";

  // Shared Filters
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  const [selectedMonth, setSelectedMonth] = useState(dayjs().month() + 1);
  const [searchTerm, setSearchTerm] = useState("");

  // ==================== TAB 1: CAPAIAN OUTPUT ====================
  const [outputTargets, setOutputTargets] = useState([]);
  const [outputLoading, setOutputLoading] = useState(false);
  const [targetModalVisible, setTargetModalVisible] = useState(false);
  const [realizationModalVisible, setRealizationModalVisible] = useState(false);
  const [editingTarget, setEditingTarget] = useState(null);
  const [selectedTargetForRealization, setSelectedTargetForRealization] = useState(null);
  const [expandedCardIds, setExpandedCardIds] = useState({});

  const toggleCardExpand = (id) => {
    setExpandedCardIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const isAllExpanded = useMemo(() => {
    if (outputTargets.length === 0) return false;
    return outputTargets.every((t) => expandedCardIds[t.id]);
  }, [outputTargets, expandedCardIds]);

  const handleToggleAllCards = () => {
    if (isAllExpanded) {
      setExpandedCardIds({});
    } else {
      const allExpanded = {};
      outputTargets.forEach((t) => {
        allExpanded[t.id] = true;
      });
      setExpandedCardIds(allExpanded);
    }
  };

  const [targetForm] = Form.useForm();
  const [realizationForm] = Form.useForm();

  // ==================== TAB 2: PENJELASAN CAPAIAN ====================
  const [indicators, setIndicators] = useState([]);
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [indicatorModalVisible, setIndicatorModalVisible] = useState(false);
  const [explanationModalVisible, setExplanationModalVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [editingIndicator, setEditingIndicator] = useState(null);
  const [selectedIndicatorForExp, setSelectedIndicatorForExp] = useState(null);
  const [selectedExplanationForReview, setSelectedExplanationForReview] = useState(null);
  const [expandedIndicators, setExpandedIndicators] = useState({});

  const toggleIndicatorExpand = (id) => {
    setExpandedIndicators((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const isAllIndicatorsExpanded = useMemo(() => {
    if (indicators.length === 0) return false;
    return indicators.every((ind) => expandedIndicators[ind.id]);
  }, [indicators, expandedIndicators]);

  const handleToggleAllIndicators = () => {
    if (isAllIndicatorsExpanded) {
      setExpandedIndicators({});
    } else {
      const allExpanded = {};
      indicators.forEach((ind) => {
        allExpanded[ind.id] = true;
      });
      setExpandedIndicators(allExpanded);
    }
  };

  const [indicatorForm] = Form.useForm();
  const [explanationForm] = Form.useForm();
  const [reviewForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // ── Data Fetching ──
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
    fetchOutputTargets();
    fetchExplanationIndicators();
  }, [fetchOutputTargets, fetchExplanationIndicators]);

  // ── Handlers: Capaian Output ──
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

  // ── Handlers: Penjelasan Capaian ──
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
    const existingExp = indicator.explanations?.[0];
    explanationForm.resetFields();
    explanationForm.setFieldsValue({
      rhpk_explanation_indicator_id: indicator.id,
      year: selectedYear,
      month: selectedMonth,
      target_volume: existingExp?.target_volume || "",
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

  // ── Modal Helpers ──
  const handleOpenTargetModal = (target = null) => {
    setEditingTarget(target);
    targetForm.resetFields();
    if (target) {
      const monthlyValues = {};
      MONTH_FIELDS.forEach((m, idx) => {
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
      MONTH_FIELDS.forEach((m) => {
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

  // ── Utility ──
  const formatDecimal = (val, maxDecimals = 4) => {
    if (val === null || val === undefined) return "0";
    const strVal = String(val).replace(",", ".");
    const num = Number(strVal);
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

  const formatRupiah = (val) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0);

  const renderStatusTag = (status) => {
    const map = {
      draft: { color: "default", text: "DRAFT" },
      submitted: { color: "processing", text: "DIAJUKAN" },
      approved: { color: "success", text: "DISETUJUI" },
      revision: { color: "warning", text: "REVISI" },
      rejected: { color: "error", text: "DITOLAK" },
    };
    const conf = map[status] || { color: "default", text: status || "BELUM ISI" };
  };

  // ── Metrics ──
  const totalRO = outputTargets.length;
  const totalPagu = outputTargets.reduce((acc, t) => acc + Number(t.budget_pagu || 0), 0);
  const avgAchievement = outputTargets.length
    ? Math.round((outputTargets.reduce((acc, t) => acc + calculateAchievementPercent(t.revised_target || t.initial_target, t.sum_realization), 0) / outputTargets.length) * 100) / 100
    : 0;

  // ── Toolbar Title & Description ──
  const toolbarTitle = {
    "capaian-output": "Capaian Output",
    "penjelasan-capaian": "Penjelasan Capaian Output",
    "dashboard": "Ringkasan Kinerja",
  }[activeNav];

  const toolbarDesc = {
    "capaian-output": "Rincian Output, Pagu, Target & Realisasi Bulanan",
    "penjelasan-capaian": "Faktor Pendukung, Kendala, Tindak Lanjut & Eviden",
    "dashboard": "Visualisasi progress capaian per Rincian Output",
  }[activeNav];

  // ══════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <div
      className="rhpk-module"
      style={{
        display: "flex",
        flexDirection: "row",
        width: "100vw",
        height: "100vh",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        background: "#f8fafc",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* ── SIDEBAR ── */}
      <aside
        className={`rhpk-sidebar ${collapsed ? "rhpk-sidebar--collapsed" : "rhpk-sidebar--expanded"}`}
      >
        <div className={`rhpk-sidebar-header ${collapsed ? "rhpk-sidebar-header--collapsed" : ""}`}>
          <div className={`rhpk-sidebar-header__top ${collapsed ? "rhpk-sidebar-header__top--collapsed" : ""}`}>
            {!collapsed && (
              <div className="rhpk-sidebar-brand">
                <div className="rhpk-sidebar-brand__icon">
                  <FileProtectOutlined style={{ fontSize: 18 }} />
                </div>
                <div>
                  <h1 className="rhpk-sidebar-brand__title">RHPK</h1>
                  <span className="rhpk-sidebar-brand__subtitle">Capaian & Evaluasi Kinerja</span>
                </div>
              </div>
            )}
            <button
              className="rhpk-toggle-btn"
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? "Buka Sidebar" : "Tutup Sidebar"}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
          </div>
        </div>

        <nav className={`rhpk-sidebar-nav ${collapsed ? "rhpk-sidebar-nav--collapsed" : ""}`}>
          {!collapsed && <div className="rhpk-menu-section-label">NAVIGASI UTAMA</div>}

          <div
            className={`rhpk-nav-item ${activeNav === "capaian-output" ? "rhpk-nav-item--active" : ""}`}
            onClick={() => setActiveNav("capaian-output")}
          >
            <FileTextOutlined className="rhpk-nav-item__icon" />
            {!collapsed && <span className="rhpk-nav-item__text">Capaian Output</span>}
          </div>

          <div
            className={`rhpk-nav-item ${activeNav === "penjelasan-capaian" ? "rhpk-nav-item--active" : ""}`}
            onClick={() => setActiveNav("penjelasan-capaian")}
          >
            <FileDoneOutlined className="rhpk-nav-item__icon" />
            {!collapsed && <span className="rhpk-nav-item__text">Penjelasan Capaian</span>}
          </div>

          <div
            className={`rhpk-nav-item ${activeNav === "dashboard" ? "rhpk-nav-item--active" : ""}`}
            onClick={() => setActiveNav("dashboard")}
          >
            <PieChartOutlined className="rhpk-nav-item__icon" />
            {!collapsed && <span className="rhpk-nav-item__text">Ringkasan Kinerja</span>}
          </div>
        </nav>

        {/* Back to Layanan Mandiri */}
        <div className="rhpk-sidebar-back">
          <button className="rhpk-sidebar-back__btn" onClick={() => navigate("/app/layanan-mandiri")}>
            <ArrowLeftOutlined />
            {!collapsed && <span>Kembali</span>}
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="rhpk-main">
        {/* Toolbar */}
        <div className="rhpk-toolbar">
          <div className="rhpk-toolbar__left">
            <div>
              <Title level={4} className="rhpk-toolbar__title">
                {toolbarTitle}
              </Title>
              <Text className="rhpk-toolbar__desc">{toolbarDesc}</Text>
            </div>

            <Input
              placeholder="Cari indikator / RO..."
              prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: 210, borderRadius: 8 }}
              size="small"
              allowClear
            />
            <Select value={selectedYear} onChange={setSelectedYear} style={{ width: 115 }} size="small">
              {[2024, 2025, 2026, 2027].map((y) => (
                <Option key={y} value={y}>
                  Tahun {y}
                </Option>
              ))}
            </Select>
            {activeNav === "penjelasan-capaian" && (
              <Select value={selectedMonth} onChange={setSelectedMonth} style={{ width: 125 }} size="small">
                {MONTH_NAMES.map((m, i) => (
                  <Option key={i + 1} value={i + 1}>
                    {m}
                  </Option>
                ))}
              </Select>
            )}
          </div>

          <Space>
            <Button
              icon={<ReloadOutlined />}
              size="small"
              onClick={() => (activeNav === "capaian-output" ? fetchOutputTargets() : fetchExplanationIndicators())}
              style={{ borderRadius: 8 }}
            >
              Segarkan
            </Button>

            {isAdmin && activeNav === "capaian-output" && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                size="small"
                onClick={() => handleOpenTargetModal()}
                style={{ background: "#4f46e5", borderColor: "#4f46e5", fontWeight: 600, borderRadius: 8 }}
              >
                Tambah RO
              </Button>
            )}
            {isAdmin && activeNav === "penjelasan-capaian" && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                size="small"
                onClick={() => handleOpenIndicatorModal()}
                style={{ background: "#4f46e5", borderColor: "#4f46e5", fontWeight: 600, borderRadius: 8 }}
              >
                Tambah Indikator
              </Button>
            )}
          </Space>
        </div>

        {/* Content Area */}
        <div className="rhpk-content">
          {/* ── Stat Widgets (always visible) ── */}
          <div className="rhpk-stats">
            <div className="rhpk-stat">
              <div className="rhpk-stat__label">Total Rincian Output</div>
              <div className="rhpk-stat__value">{totalRO}</div>
            </div>
            <div className="rhpk-stat">
              <div className="rhpk-stat__label">Total Pagu Anggaran</div>
              <div className="rhpk-stat__value" style={{ color: "#059669", fontSize: "16px" }}>{formatRupiah(totalPagu)}</div>
            </div>
            <div className="rhpk-stat">
              <div className="rhpk-stat__label">Rata-Rata Capaian</div>
              <div className="rhpk-stat__value" style={{ color: "#0f5b99" }}>{avgAchievement}%</div>
            </div>
            <div className="rhpk-stat">
              <div className="rhpk-stat__label">Master Indikator</div>
              <div className="rhpk-stat__value" style={{ color: "#7c3aed" }}>{indicators.length}</div>
            </div>
          </div>

          {/* ══════════ VIEW 1: CAPAIAN OUTPUT — Card List ══════════ */}
          {activeNav === "capaian-output" && (
            <Spin spinning={outputLoading}>
              {outputTargets.length === 0 && !outputLoading ? (
                <div className="rhpk-empty">
                  <InboxOutlined className="rhpk-empty__icon" />
                  <div className="rhpk-empty__text">Belum ada data Rincian Output untuk tahun {selectedYear}</div>
                  {isAdmin && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenTargetModal()}
                      style={{ marginTop: 12, background: "#0f5b99", borderColor: "#0f5b99" }}>
                      Tambah Rincian Output Pertama
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* Top Bar for Batch Card Actions */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justify: "space-between",
                      margin: "16px 0 14px",
                      background: "#ffffff",
                      padding: "12px 18px",
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <AppstoreOutlined style={{ color: "#0f5b99", fontSize: 20 }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "14px", color: "#0f172a" }}>
                          Daftar Rincian Output ({outputTargets.length} Card)
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>
                          Setiap data kartu ter-minimize secara mandiri. Klik 'Lihat Realisasi Bulanan' pada kartu untuk melihat rincian bulan.
                        </div>
                      </div>
                    </div>
                    <Button
                      size="small"
                      type={isAllExpanded ? "default" : "primary"}
                      icon={isAllExpanded ? <UpOutlined /> : <DownOutlined />}
                      onClick={handleToggleAllCards}
                      style={
                        !isAllExpanded
                          ? { background: "#0f5b99", borderColor: "#0f5b99", fontWeight: 600, fontSize: "11.5px" }
                          : { fontWeight: 600, fontSize: "11.5px" }
                      }
                    >
                      {isAllExpanded ? "Tutup Semua Bulanan" : "Buka Semua Bulanan"}
                    </Button>
                  </div>

                  {/* Card List with Per-Item Minimize */}
                  <div className="rhpk-card-list">
                    {outputTargets.map((t) => {
                      const isExpanded = Boolean(expandedCardIds[t.id]);
                      return (
                        <div key={t.id} className="rhpk-output-card" style={{ transition: "all 0.2s" }}>
                          {/* Card Header & Controls */}
                          <div className="rhpk-output-card__header" style={{ alignItems: "flex-start" }}>
                            <div className="rhpk-output-card__info" style={{ cursor: "pointer" }} onClick={() => toggleCardExpand(t.id)}>
                              <h3 className="rhpk-output-card__name" style={{ fontSize: "14px", color: "#0f5b99" }}>
                                {t.code_output ? `${t.code_output} - ${t.output_name}` : t.output_name}
                              </h3>
                            </div>
                            <Space size="small">
                              {isAdmin && (
                                <div className="rhpk-output-card__actions">
                                  <Tooltip title="Edit RO">
                                    <Button icon={<EditOutlined />} size="small" onClick={() => handleOpenTargetModal(t)} />
                                  </Tooltip>
                                  <Popconfirm title="Hapus Rincian Output ini?" onConfirm={() => handleDeleteTarget(t.id)}>
                                    <Button icon={<DeleteOutlined />} danger size="small" />
                                  </Popconfirm>
                                </div>
                              )}
                              <Button
                                size="small"
                                type={isExpanded ? "default" : "primary"}
                                icon={isExpanded ? <UpOutlined /> : <DownOutlined />}
                                onClick={() => toggleCardExpand(t.id)}
                                style={
                                  !isExpanded
                                    ? { background: "#0f5b99", borderColor: "#0f5b99", fontWeight: 600, fontSize: "11.5px" }
                                    : { fontWeight: 600, fontSize: "11.5px" }
                                }
                              >
                                {isExpanded ? "Sembunyikan" : "Lihat Realisasi Bulanan"}
                              </Button>
                            </Space>
                          </div>

                          {/* Summary Chips */}
                          <div className="rhpk-output-card__summary">
                            <div className="rhpk-summary-chip">
                              <DollarOutlined style={{ color: "#059669" }} />
                              <span>Pagu:</span>
                              <span className="rhpk-summary-chip__value rhpk-summary-chip__value--green">{formatRupiah(t.budget_pagu)}</span>
                            </div>
                            <div className="rhpk-summary-chip">
                              <AimOutlined style={{ color: "#64748b" }} />
                              <span>Target Total:</span>
                              <span className="rhpk-summary-chip__value">{formatDecimal(t.initial_target)} → {formatDecimal(t.revised_target)} {t.unit}</span>
                            </div>
                            <div className="rhpk-summary-chip">
                              <BarChartOutlined style={{ color: "#0f5b99" }} />
                              <span>Total Realisasi:</span>
                              <span className="rhpk-summary-chip__value rhpk-summary-chip__value--blue">{formatDecimal(t.sum_realization)} {t.unit}</span>
                            </div>
                          </div>

                          {/* Progress Bar Footer (Always visible) */}
                          {(() => {
                            const achievementPercent = calculateAchievementPercent(t.revised_target || t.initial_target, t.sum_realization);
                            return (
                              <div className="rhpk-output-card__progress">
                                <span className="rhpk-output-card__progress-label">Capaian:</span>
                                <Progress
                                  className="rhpk-output-card__progress-bar"
                                  percent={Math.min(100, achievementPercent)}
                                  showInfo={false}
                                  size="small"
                                  strokeColor={achievementPercent >= 100 ? "#10b981" : "#0f5b99"}
                                />
                                <span className="rhpk-output-card__progress-pct" style={{ color: achievementPercent >= 100 ? "#059669" : "#0f5b99" }}>
                                  {formatDecimal(achievementPercent, 2)}%
                                </span>
                              </div>
                            );
                          })()}

                          {/* Monthly Grid (6 col x 2 row) — Rendered ONLY when expanded */}
                          {isExpanded && (
                            <div className="rhpk-month-grid" style={{ marginTop: 12 }}>
                              {MONTH_NAMES.map((mName, idx) => {
                                const mNum = idx + 1;
                                const targetVol = t.monthly_targets?.[mNum] || 0;
                                const realVol = t.monthly_realizations?.[mNum] || 0;
                                const isFilled = realVol > 0;
                                const isAchieved = isFilled && realVol >= targetVol && targetVol > 0;
                                return (
                                  <Tooltip key={mNum} title={`Klik untuk input realisasi ${mName}`}>
                                    <div
                                      className={`rhpk-month-cell ${isFilled ? "rhpk-month-cell--filled" : ""} ${isAchieved ? "rhpk-month-cell--achieved" : ""}`}
                                      onClick={() => handleOpenRealizationModal(t, mNum)}
                                    >
                                      <div className="rhpk-month-cell__label">{MONTH_SHORT[idx]}</div>
                                      <div className="rhpk-month-cell__real">Realisasi: {formatDecimal(realVol)}</div>
                                      <div className="rhpk-month-cell__target">Target: {formatDecimal(targetVol)}</div>
                                      <EditOutlined className="rhpk-month-cell__edit-hint" />
                                    </div>
                                  </Tooltip>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </Spin>
          )}

          {/* ══════════ VIEW 2: PENJELASAN CAPAIAN (IKU) ══════════ */}
          {activeNav === "penjelasan-capaian" && (
            <Spin spinning={explanationLoading}>
              {indicators.length === 0 && !explanationLoading ? (
                <div className="rhpk-empty">
                  <InboxOutlined className="rhpk-empty__icon" />
                  <div className="rhpk-empty__text">Belum ada Indikator Penjelasan Capaian untuk tahun {selectedYear}</div>
                  {isAdmin && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenIndicatorModal()}
                      style={{ marginTop: 12, background: "#0f5b99", borderColor: "#0f5b99" }}>
                      Tambah Indikator Pertama
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* Top Bar for Tab 2 with Single Dynamic Toggle Button */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
                      Menampilkan {indicators.length} Indikator Penjelasan Capaian
                    </span>
                    <Button
                      size="small"
                      type={isAllIndicatorsExpanded ? "default" : "primary"}
                      icon={isAllIndicatorsExpanded ? <UpOutlined /> : <DownOutlined />}
                      onClick={handleToggleAllIndicators}
                      style={
                        !isAllIndicatorsExpanded
                          ? { background: "#0f5b99", borderColor: "#0f5b99", fontWeight: 600, fontSize: "11.5px" }
                          : { fontWeight: 600, fontSize: "11.5px" }
                      }
                    >
                      {isAllIndicatorsExpanded ? "Tutup Semua Narasi" : "Buka Semua Narasi"}
                    </Button>
                  </div>

                  <div className="rhpk-exp-list">
                    {indicators.map((ind) => {
                      const exp = ind.explanations?.[0];
                      const isExpanded = expandedIndicators[ind.id];
                      return (
                        <div key={ind.id} className="rhpk-exp-card">
                          {/* Header Box (Click to toggle expand) */}
                          <div
                            className="rhpk-exp-card__header"
                            onClick={() => toggleIndicatorExpand(ind.id)}
                            style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px" }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                              <span style={{ fontWeight: 700, fontSize: "13px", color: "#0f5b99" }}>
                                {ind.code_indicator || "INDIKATOR"}
                              </span>
                              <span style={{ fontWeight: 700, fontSize: "14px", color: "#0f172a" }}>
                                {ind.indicator_name}
                              </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                              <span style={{ fontWeight: 600, fontSize: "12.5px", color: "#475569" }}>
                                Target: {ind.target_indicator || "-"}
                              </span>
                              <Button
                                size="small"
                                type="primary"
                                icon={<EditOutlined />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenExplanationModal(ind);
                                }}
                                style={{ background: "#0f5b99", borderColor: "#0f5b99", fontWeight: 600, fontSize: "11.5px" }}
                              >
                                {exp ? "Edit Narasi" : "Isi Narasi"}
                              </Button>
                              <Button
                                size="small"
                                type={isExpanded ? "default" : "default"}
                                icon={isExpanded ? <UpOutlined /> : <DownOutlined />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleIndicatorExpand(ind.id);
                                }}
                                style={{ fontWeight: 600, fontSize: "11.5px" }}
                              >
                                {isExpanded ? "Sembunyikan" : "Lihat Detail"}
                              </Button>
                            </div>
                          </div>

                          {/* Status Bar / Summary (Always Visible) */}
                          <div
                            className="rhpk-exp-card__status-bar"
                            style={{
                              padding: "8px 14px",
                              borderBottom: isExpanded ? "1px solid #f1f5f9" : "none",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              background: "#fafbfc",
                            }}
                          >
                            <Space size="middle">
                              {exp ? (
                                <span style={{ fontWeight: 600, fontSize: "12px", color: exp.status === "approved" ? "#059669" : exp.status === "submitted" ? "#0284c7" : "#64748b" }}>
                                  {exp.status === "approved" ? "DISETUJUI" : exp.status === "submitted" ? "DIAJUKAN" : exp.status === "revision" ? "REVISI" : exp.status === "rejected" ? "DITOLAK" : "DRAFT"}
                                </span>
                              ) : (
                                <span style={{ fontWeight: 600, fontSize: "12px", color: "#94a3b8" }}>
                                  BELUM DIISI
                                </span>
                              )}
                              {exp?.target_volume && (
                                <span style={{ fontSize: "12px", color: "#475569", fontWeight: 700 }}>
                                  Target: {exp.target_volume}
                                </span>
                              )}
                              {exp?.realization_volume && (
                                <span style={{ fontSize: "12px", color: "#0f5b99", fontWeight: 700 }}>
                                  Realisasi: {formatDecimal(exp.realization_volume)}
                                </span>
                              )}
                              {exp?.achievement_percent && (
                                <span style={{ fontSize: "12px", color: "#059669", fontWeight: 700 }}>
                                  Capaian: {formatDecimal(exp.achievement_percent, 2)}%
                                </span>
                              )}
                            </Space>

                            {exp?.user && (
                              <span className="rhpk-exp-card__author" style={{ fontSize: "11.5px", color: "#64748b" }}>
                                Pengisi: <strong>{exp.user.name}</strong>
                              </span>
                            )}
                          </div>

                          {/* Detail Narasi Body (Rendered ONLY when expanded) */}
                          {isExpanded && (
                            <div className="rhpk-inline-form" style={{ padding: "14px 16px" }}>
                              {/* Banner Ringkasan Stat Capaian Utama */}
                              <div className="rhpk-exp-stat-banner">
                                <div className="rhpk-exp-stat-box rhpk-exp-stat-box--slate">
                                  <div className="rhpk-exp-stat-label">Target</div>
                                  <div className="rhpk-exp-stat-value" style={{ color: "#475569" }}>
                                    {exp?.target_volume || <span className="rhpk-exp-item-val--empty">—</span>}
                                  </div>
                                </div>

                                <div className="rhpk-exp-stat-box rhpk-exp-stat-box--blue">
                                  <div className="rhpk-exp-stat-label">Realisasi Volume</div>
                                  <div className="rhpk-exp-stat-value" style={{ color: "#0f5b99" }}>
                                    {exp?.realization_volume ? formatDecimal(exp.realization_volume) : <span className="rhpk-exp-item-val--empty">—</span>}
                                  </div>
                                </div>

                                <div className="rhpk-exp-stat-box rhpk-exp-stat-box--green">
                                  <div className="rhpk-exp-stat-label">Capaian (%)</div>
                                  <div className="rhpk-exp-stat-value" style={{ color: "#059669" }}>
                                    {exp?.achievement_percent ? `${formatDecimal(exp.achievement_percent, 2)}%` : <span className="rhpk-exp-item-val--empty">—</span>}
                                  </div>
                                </div>

                                <div className="rhpk-exp-stat-box rhpk-exp-stat-box--slate">
                                  <div className="rhpk-exp-stat-label">Berkas Eviden (Google Drive)</div>
                                  <div style={{ marginTop: 2 }}>
                                    {exp?.evidence_url ? (
                                      <a href={exp.evidence_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", fontWeight: 700, color: "#0f5b99" }}>
                                        Buka Dokumen Bukti
                                      </a>
                                    ) : (
                                      <span className="rhpk-exp-item-val--empty">— Belum ada link —</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Induk Judul 1: ANALISA CAPAIAN */}
                              <div className="rhpk-exp-section rhpk-exp-section--analisa">
                                <div className="rhpk-exp-section-title rhpk-exp-section-title--blue">
                                  ANALISA CAPAIAN
                                </div>
                                <Row gutter={[12, 10]}>
                                  <Col span={12}>
                                    <div className="rhpk-exp-item-label">1. Kendala / Permasalahan</div>
                                    <div className={`rhpk-exp-item-val ${!exp?.inhibiting_factors ? "rhpk-exp-item-val--empty" : ""}`}>
                                      {exp?.inhibiting_factors || "—"}
                                    </div>
                                  </Col>
                                  <Col span={12}>
                                    <div className="rhpk-exp-item-label">2. Analisa Keberhasilan (Jika IKU Tercapai)</div>
                                    <div className={`rhpk-exp-item-val ${!exp?.success_analysis ? "rhpk-exp-item-val--empty" : ""}`}>
                                      {exp?.success_analysis || "—"}
                                    </div>
                                  </Col>
                                  <Col span={12}>
                                    <div className="rhpk-exp-item-label">3. Rekomendasi</div>
                                    <div className={`rhpk-exp-item-val ${!exp?.recommendations ? "rhpk-exp-item-val--empty" : ""}`}>
                                      {exp?.recommendations || "—"}
                                    </div>
                                  </Col>
                                  <Col span={12}>
                                    <div className="rhpk-exp-item-label">4. Rencana Tindak Lanjut</div>
                                    <div className={`rhpk-exp-item-val ${!exp?.follow_up_action ? "rhpk-exp-item-val--empty" : ""}`}>
                                      {exp?.follow_up_action || "—"}
                                    </div>
                                  </Col>
                                  <Col span={6}>
                                    <div className="rhpk-exp-item-label">5. Timeline</div>
                                    <div className="rhpk-exp-item-val">
                                      {exp?.analysis_timeline || <span className="rhpk-exp-item-val--empty">—</span>}
                                    </div>
                                  </Col>
                                  <Col span={6}>
                                    <div className="rhpk-exp-item-label">6. Identifikasi Risiko</div>
                                    <div className="rhpk-exp-item-val">
                                      {exp?.is_risk_identified === "Y" ? "Ya (Y)" : "Tidak (T)"}
                                    </div>
                                  </Col>
                                  <Col span={6}>
                                    <div className="rhpk-exp-item-label">7. Kode Risiko</div>
                                    <div className="rhpk-exp-item-val">
                                      {exp?.risk_code || <span className="rhpk-exp-item-val--empty">—</span>}
                                    </div>
                                  </Col>
                                  <Col span={6}>
                                    <div className="rhpk-exp-item-label">8. Peristiwa Risiko</div>
                                    <div className={`rhpk-exp-item-val ${!exp?.risk_event ? "rhpk-exp-item-val--empty" : ""}`}>
                                      {exp?.risk_event || "—"}
                                    </div>
                                  </Col>
                                </Row>
                              </div>

                              {/* Induk Judul 2: TINDAK LANJUT REKOMENDASI HASIL EVALUASI SEBELUMNYA */}
                              <div className="rhpk-exp-section rhpk-exp-section--prev">
                                <div className="rhpk-exp-section-title rhpk-exp-section-title--slate">
                                  TINDAK LANJUT REKOMENDASI HASIL EVALUASI SEBELUMNYA
                                </div>
                                <Row gutter={[12, 10]}>
                                  <Col span={12}>
                                    <div className="rhpk-exp-item-label">1. Kendala / Permasalahan TW/Bulan Sebelumnya</div>
                                    <div className={`rhpk-exp-item-val ${!exp?.prev_inhibiting_factors ? "rhpk-exp-item-val--empty" : ""}`}>
                                      {exp?.prev_inhibiting_factors || "—"}
                                    </div>
                                  </Col>
                                  <Col span={12}>
                                    <div className="rhpk-exp-item-label">2. Rekomendasi TW/Bulan Sebelumnya</div>
                                    <div className={`rhpk-exp-item-val ${!exp?.prev_recommendations ? "rhpk-exp-item-val--empty" : ""}`}>
                                      {exp?.prev_recommendations || "—"}
                                    </div>
                                  </Col>
                                  <Col span={12}>
                                    <div className="rhpk-exp-item-label">3. RTL TW/Bulan Sebelumnya</div>
                                    <div className={`rhpk-exp-item-val ${!exp?.prev_follow_up_action ? "rhpk-exp-item-val--empty" : ""}`}>
                                      {exp?.prev_follow_up_action || "—"}
                                    </div>
                                  </Col>
                                  <Col span={12}>
                                    <div className="rhpk-exp-item-label">5. Progres TL Rekomendasi</div>
                                    <div className={`rhpk-exp-item-val ${!exp?.prev_progress_tl ? "rhpk-exp-item-val--empty" : ""}`}>
                                      {exp?.prev_progress_tl || "—"}
                                    </div>
                                  </Col>
                                  <Col span={6}>
                                    <div className="rhpk-exp-item-label">4. Status</div>
                                    <div className="rhpk-exp-item-val">
                                      {exp?.prev_status || <span className="rhpk-exp-item-val--empty">—</span>}
                                    </div>
                                  </Col>
                                  <Col span={6}>
                                    <div className="rhpk-exp-item-label">6. Timeline</div>
                                    <div className="rhpk-exp-item-val">
                                      {exp?.prev_timeline || <span className="rhpk-exp-item-val--empty">—</span>}
                                    </div>
                                  </Col>
                                </Row>
                              </div>

                              {/* Reviewer Notes */}
                              {exp?.reviewer_notes && (
                                <div className="rhpk-reviewer-notes">
                                  <div className="rhpk-reviewer-notes__title">Catatan Verifikator</div>
                                  <div className="rhpk-reviewer-notes__text">{exp.reviewer_notes}</div>
                                </div>
                              )}

                              {/* Action Footer */}
                              {(canReview || isAdmin) && (
                                <div className="rhpk-exp-card__footer">
                                  <Space size="small">
                                    {canReview && exp && (
                                      <Tooltip title="Verifikasi Narasi">
                                        <Button icon={<CheckCircleOutlined />} size="small" type="primary" ghost onClick={() => handleOpenReviewModal(exp)}>Verifikasi</Button>
                                      </Tooltip>
                                    )}
                                  </Space>
                                  {isAdmin && (
                                    <Popconfirm title="Hapus Master Indikator ini?" onConfirm={() => handleDeleteIndicator(ind.id)}>
                                      <Button icon={<DeleteOutlined />} danger size="small" />
                                    </Popconfirm>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </Spin>
          )}

          {/* ══════════ VIEW 3: DASHBOARD ══════════ */}
          {activeNav === "dashboard" && (
            <Spin spinning={outputLoading}>
              {outputTargets.length === 0 ? (
                <div className="rhpk-empty">
                  <FundOutlined className="rhpk-empty__icon" />
                  <div className="rhpk-empty__text">Belum ada data untuk ditampilkan</div>
                </div>
              ) : (
                <div>
                  {outputTargets.map((t) => {
                    const achievementPercent = calculateAchievementPercent(t.revised_target || t.initial_target, t.sum_realization);
                    return (
                      <div key={t.id} className="rhpk-dashboard-card">
                        <div className="rhpk-dashboard-card__top">
                          <span className="rhpk-dashboard-card__name">{t.output_name}</span>
                          <span className="rhpk-dashboard-card__pct" style={{ color: achievementPercent >= 100 ? "#059669" : "#0f5b99" }}>
                            {formatDecimal(achievementPercent, 2)}% ({formatDecimal(t.sum_realization)} / {formatDecimal(t.revised_target)} {t.unit})
                          </span>
                        </div>
                        <Progress
                          percent={Math.min(100, achievementPercent)}
                          showInfo={false}
                          strokeColor={achievementPercent >= 100 ? "#10b981" : "#0f5b99"}
                          size="small"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </Spin>
          )}
        </div>
      </main>

      {/* ══════════ MODAL: TAMBAH/EDIT TARGET RINCIAN OUTPUT (Admin) ══════════ */}
      <Modal
        title={<span style={{ fontWeight: 700, color: "#0f5b99" }}>{editingTarget ? "Edit Rincian Output" : "Tambah Rincian Output"}</span>}
        open={targetModalVisible}
        onCancel={() => {
          setTargetModalVisible(false);
          targetForm.resetFields();
        }}
        footer={null}
        width={700}
        destroyOnClose
        preserve={false}
      >
        <Form form={targetForm} layout="vertical" onFinish={handleSaveTarget} preserve={false} style={{ marginTop: 12 }}>
          <Row gutter={12}>
            <Col span={6}>
              <Form.Item name="year" label="Tahun" rules={[{ required: true }]}>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="code_output" label="Kode Output">
                <Input placeholder="1064.BMA" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="output_name" label="Nama Rincian Output" rules={[{ required: true }]}>
                <Input placeholder="Nama Rincian Output..." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="budget_pagu" label="Pagu Anggaran (Rp)">
                <InputNumber
                  style={{ width: "100%" }}
                  formatter={(v) => `Rp ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                  parser={(v) => v.replace(/\Rp\s?|(\.)/g, "")}
                />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="unit" label="Satuan">
                <Input placeholder="Laporan" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="initial_target" label="Target Semula" rules={[{ required: true }]}>
                <InputNumber min={0} step={0.001} decimalSeparator="," formatter={numFormatter} parser={numParser} style={{ width: "100%" }} placeholder="Contoh: 0,083" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="revised_target" label="Target Menjadi" rules={[{ required: true }]}>
                <InputNumber min={0} step={0.001} decimalSeparator="," formatter={numFormatter} parser={numParser} style={{ width: "100%" }} placeholder="Contoh: 0,083" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" style={{ borderColor: "#e2e8f0", color: "#0f5b99", fontWeight: 600, fontSize: "12px" }}>
            Target per Bulan
          </Divider>

          <Row gutter={[8, 8]}>
            {MONTH_NAMES.map((mName, idx) => (
              <Col span={4} key={MONTH_FIELDS[idx]}>
                <Form.Item name={`target_${MONTH_FIELDS[idx]}`} label={<span style={{ fontSize: "11px" }}>{mName.slice(0,3)}</span>}>
                  <InputNumber min={0} step={0.001} decimalSeparator="," formatter={numFormatter} parser={numParser} style={{ width: "100%" }} size="small" placeholder="0,083" />
                </Form.Item>
              </Col>
            ))}
          </Row>

          <div style={{ textAlign: "right", marginTop: 16 }}>
            <Space>
              <Button onClick={() => setTargetModalVisible(false)}>Batal</Button>
              <Button type="primary" htmlType="submit" loading={submitting}
                style={{ background: "#0f5b99", borderColor: "#0f5b99", fontWeight: 600 }}>
                Simpan
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* ══════════ MODAL: INPUT REALISASI BULANAN ══════════ */}
      {selectedTargetForRealization && (
        <Modal
          title={<span style={{ fontWeight: 700, color: "#0f5b99" }}>Input Realisasi — {MONTH_NAMES[(realizationForm.getFieldValue("month") || 1) - 1]}</span>}
          open={realizationModalVisible}
          onCancel={() => setRealizationModalVisible(false)}
          footer={null}
          width={450}
          destroyOnClose
        >
          <div style={{ background: "#f8fafc", padding: 10, borderRadius: 8, marginBottom: 14, border: "1px solid #e2e8f0" }}>
            <Text strong style={{ fontSize: "13px" }}>{selectedTargetForRealization.output_name}</Text>
            <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: 3 }}>
              Target bulan ini: <strong>{formatDecimal(selectedTargetForRealization.monthly_targets?.[realizationForm.getFieldValue("month")])} {selectedTargetForRealization.unit}</strong>
            </div>
          </div>

          <Form form={realizationForm} layout="vertical" onFinish={handleSaveRealization}>
            <Form.Item name="rhpk_output_target_id" hidden><Input /></Form.Item>
            <Form.Item name="month" hidden><Input /></Form.Item>

            <Form.Item name="realization_value" label="Jumlah Realisasi" rules={[{ required: true, message: "Wajib diisi" }]}>
              <InputNumber min={0} step={0.001} decimalSeparator="," formatter={numFormatter} parser={numParser} style={{ width: "100%" }} size="large" placeholder="Contoh: 0,083" />
            </Form.Item>

            <Form.Item name="notes" label="Catatan (Opsional)">
              <TextArea rows={2} placeholder="Catatan tambahan..." />
            </Form.Item>

            <div style={{ textAlign: "right", marginTop: 12 }}>
              <Space>
                <Button onClick={() => setRealizationModalVisible(false)}>Batal</Button>
                <Button type="primary" htmlType="submit" loading={submitting}
                  style={{ background: "#0f5b99", borderColor: "#0f5b99", fontWeight: 600 }}>
                  Simpan Realisasi
                </Button>
              </Space>
            </div>
          </Form>
        </Modal>
      )}

      {/* ══════════ MODAL: TAMBAH/EDIT MASTER INDIKATOR (Admin) ══════════ */}
      <Modal
        title={<span style={{ fontWeight: 700, color: "#0f5b99" }}>{editingIndicator ? "Edit Indikator" : "Tambah Indikator"}</span>}
        open={indicatorModalVisible}
        onCancel={() => setIndicatorModalVisible(false)}
        footer={null}
        width={560}
        destroyOnClose
      >
        <Form form={indicatorForm} layout="vertical" onFinish={handleSaveIndicator} style={{ marginTop: 12 }}>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="year" label="Tahun" rules={[{ required: true }]}>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="code_indicator" label="Kode Indikator">
                <Input placeholder="IKU-01" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="indicator_name" label="Nama Indikator (IKU)" rules={[{ required: true }]}>
            <TextArea rows={2} placeholder="Masukkan nama indikator kinerja..." />
          </Form.Item>

          <Form.Item name="target_indicator" label="Target Indikator">
            <Input placeholder="100% / 12 Laporan" />
          </Form.Item>

          <div style={{ textAlign: "right", marginTop: 12 }}>
            <Space>
              <Button onClick={() => setIndicatorModalVisible(false)}>Batal</Button>
              <Button type="primary" htmlType="submit" loading={submitting}
                style={{ background: "#0f5b99", borderColor: "#0f5b99", fontWeight: 600 }}>
                Simpan
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* ══════════ MODAL: INPUT PENJELASAN CAPAIAN (User) ══════════ */}
      {selectedIndicatorForExp && (
        <Modal
          title={<span style={{ fontWeight: 700, color: "#0f5b99" }}>Penjelasan Capaian — {MONTH_NAMES[selectedMonth - 1]}</span>}
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
          <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, marginBottom: 14, border: "1px solid #e2e8f0" }}>
            <div style={{ fontWeight: 700, fontSize: "13.5px", color: "#0f172a" }}>{selectedIndicatorForExp.indicator_name}</div>
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
              <Col span={8}>
                <Form.Item name="target_volume" label="1. Target">
                  <Input placeholder="Contoh: 12 Laporan" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="realization_volume" label="2. Realisasi Volume">
                  <Input placeholder="Contoh: 1 Laporan" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="achievement_percent" label="3. Capaian (%)">
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

            <Form.Item name="evidence_url" label="Link Berkas Bukti (Google Drive)">
              <Input prefix={<LinkOutlined />} placeholder="https://drive.google.com/..." />
            </Form.Item>

            <div style={{ textAlign: "right", marginTop: 16 }}>
              <Space>
                <Button onClick={() => setExplanationModalVisible(false)}>Batal</Button>
                <Button type="primary" htmlType="submit" loading={submitting}
                  style={{ background: "#0f5b99", borderColor: "#0f5b99", fontWeight: 600 }}>
                  Simpan Narasi
                </Button>
              </Space>
            </div>
          </Form>
        </Modal>
      )}

      {/* ══════════ MODAL: VERIFIKASI (Reviewer) ══════════ */}
      {selectedExplanationForReview && (
        <Modal
          title={<span style={{ fontWeight: 700, color: "#0f5b99" }}>Verifikasi Penjelasan Capaian</span>}
          open={reviewModalVisible}
          onCancel={() => setReviewModalVisible(false)}
          footer={null}
          width={450}
          destroyOnClose
        >
          <Form form={reviewForm} layout="vertical" onFinish={handleSaveReview} style={{ marginTop: 12 }}>
            <Form.Item name="status" label="Status Persetujuan" rules={[{ required: true }]}>
              <Select size="large">
                <Option value="submitted">Diajukan (Menunggu)</Option>
                <Option value="approved">Disetujui</Option>
                <Option value="revision">Perlu Revisi</Option>
                <Option value="rejected">Ditolak</Option>
              </Select>
            </Form.Item>

            <Form.Item name="reviewer_notes" label="Catatan Verifikator">
              <TextArea rows={3} placeholder="Masukan atau arahan revisi..." />
            </Form.Item>

            <div style={{ textAlign: "right", marginTop: 12 }}>
              <Space>
                <Button onClick={() => setReviewModalVisible(false)}>Batal</Button>
                <Button type="primary" htmlType="submit" loading={submitting}
                  style={{ background: "#0f5b99", borderColor: "#0f5b99", fontWeight: 600 }}>
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
