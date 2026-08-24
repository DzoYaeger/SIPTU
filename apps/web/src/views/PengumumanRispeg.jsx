import { useState, useEffect, useRef, useMemo } from "react";
import { Modal, Table, Tag, Spin, Button, Empty, DatePicker, message, Input, Tooltip } from "antd";
import {
  CalendarOutlined,
  ArrowLeftOutlined,
  EyeOutlined,
  PushpinOutlined,
  InfoCircleOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  SearchOutlined,
  LeftOutlined,
  RightOutlined,
  TeamOutlined,
  FireOutlined,
  SafetyCertificateOutlined,
  CloseOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import "dayjs/locale/id";
import { useAuth } from "../hooks/useAuth.js";
import { useNavigate } from "react-router-dom";
import "./PengumumanRispeg.css";

dayjs.locale("id");

/* ── Violation tag colors ───────────────────────────────── */
const VIOLATION_COLORS = {
  "Terlambat Masuk":          { color: "#ea580c", bg: "#fff7ed", border: "#ffedd5" },
  "Pulang Cepat":             { color: "#0d9488", bg: "#f0fdfa", border: "#ccfbf1" },
  "Tidak Berseragam":         { color: "#2563eb", bg: "#eff6ff", border: "#dbeafe" },
  "terlambat Absen Apel pagi":{ color: "#7c3aed", bg: "#f5f3ff", border: "#ede9fe" },
  "Lupa Absen Masuk":         { color: "#0891b2", bg: "#ecfeff", border: "#cffafe" },
  "Lupa Absen Pulang":        { color: "#db2777", bg: "#fdf2f8", border: "#fce7f3" },
};

const getViolationTag = (text) => {
  for (const [key, style] of Object.entries(VIOLATION_COLORS)) {
    if (text.startsWith(key)) {
      return (
        <Tag
          style={{
            color: style.color,
            background: style.bg,
            border: `1px solid ${style.border}`,
            borderRadius: 8,
            padding: "3px 10px",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {text}
        </Tag>
      );
    }
  }
  return (
    <Tag color="error" style={{ borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>
      {text}
    </Tag>
  );
};

/* ── Avatar Component with Smooth Radial HSL ───────────── */
const UserAvatar = ({ name, size = 52, fontSize = 18 }) => {
  const initials = name
    ? name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : "?";
  const hue = name ? [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360 : 210;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `linear-gradient(135deg, hsl(${hue}, 65%, 52%) 0%, hsl(${hue}, 70%, 40%) 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#ffffff",
        fontWeight: 800,
        fontSize,
        lineHeight: 1,
        flexShrink: 0,
        textAlign: "center",
        boxShadow: `0 6px 16px -4px hsl(${hue}, 60%, 40%, 0.4)`,
        userSelect: "none",
        border: "2px solid #ffffff",
      }}
    >
      <span style={{ display: "block", lineHeight: 1 }}>{initials}</span>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT: PENGUMUMAN RISPEG
   ══════════════════════════════════════════════════════════ */
const PengumumanRispeg = () => {
  const { apiFetch, user, currentRole } = useAuth();
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const [savingDefault, setSavingDefault] = useState(false);
  const [defaultMonthLabel, setDefaultMonthLabel] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const initialFetched = useRef(false);

  const isAdmin = user?.base_role === "admin" || currentRole === "admin";

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 80);
    return () => clearTimeout(t);
  }, []);

  /* Fetch admin-configured default month on first load */
  useEffect(() => {
    if (initialFetched.current) return;
    initialFetched.current = true;
    (async () => {
      try {
        const res = await apiFetch("/rispeg/default-month");
        if (res.ok) {
          const cfg = await res.json();
          if (cfg.month && cfg.year) {
            const m = dayjs(`${cfg.year}-${String(cfg.month).padStart(2, "0")}-01`);
            if (m.isValid()) {
              setSelectedMonth(m);
              setDefaultMonthLabel(m.format("MMMM YYYY"));
            }
          }
        }
      } catch (_) {
        /* fallback to current month */
      }
    })();
  }, [apiFetch]);

  const fetchStats = async (monthVal, yearVal) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/rispeg/dashboard-stats?month=${monthVal}&year=${yearVal}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(selectedMonth.format("MM"), selectedMonth.format("YYYY"));
  }, [selectedMonth]);

  const handleSetDefaultMonth = async () => {
    setSavingDefault(true);
    try {
      const res = await apiFetch("/rispeg/default-month", {
        method: "POST",
        body: JSON.stringify({
          month: parseInt(selectedMonth.format("MM")),
          year: parseInt(selectedMonth.format("YYYY")),
        }),
      });
      if (res.ok) {
        message.success(`Bulan default diatur ke ${selectedMonth.format("MMMM YYYY")}`);
        setDefaultMonthLabel(selectedMonth.format("MMMM YYYY"));
      } else {
        message.error("Gagal menyimpan bulan default.");
      }
    } catch (_) {
      message.error("Gagal menyimpan bulan default.");
    } finally {
      setSavingDefault(false);
    }
  };

  const handlePrevMonth = () => {
    setSelectedMonth((prev) => prev.subtract(1, "month"));
  };

  const handleNextMonth = () => {
    setSelectedMonth((prev) => prev.add(1, "month"));
  };

  /* Data Processing & Filtering */
  const allStats = data?.all_stats || [];
  const activeOffenders = useMemo(() => {
    return allStats.filter((item) => item.total_points > 0);
  }, [allStats]);

  const filteredOffenders = useMemo(() => {
    if (!searchQuery.trim()) return activeOffenders;
    const q = searchQuery.toLowerCase().trim();
    return activeOffenders.filter(
      (emp) =>
        (emp.name && emp.name.toLowerCase().includes(q)) ||
        (emp.nip && emp.nip.toLowerCase().includes(q))
    );
  }, [activeOffenders, searchQuery]);

  const [p1, p2, p3] = activeOffenders;
  const restOffenders = filteredOffenders.filter(
    (emp) => !p1 || !p2 || !p3 || (emp.employee_id !== p1.employee_id && emp.employee_id !== p2.employee_id && emp.employee_id !== p3.employee_id)
  );

  /* Statistics Summaries */
  const totalPointsCount = useMemo(() => {
    return activeOffenders.reduce((acc, curr) => acc + (curr.total_points || 0), 0);
  }, [activeOffenders]);

  const mostFrequentViolation = useMemo(() => {
    const daily = data?.daily_violations || [];
    if (daily.length === 0) return "-";
    const counts = {};
    daily.forEach((v) => {
      if (v.violation_details) {
        v.violation_details.split(", ").forEach((det) => {
          counts[det] = (counts[det] || 0) + 1;
        });
      }
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : "-";
  }, [data]);

  const highestPointsValue = p1?.total_points || 1;

  const employeeViolations = selectedEmployee
    ? (data?.daily_violations || []).filter((v) => v.employee_id === selectedEmployee.employee_id)
    : [];

  const employeeViolationBreakdown = useMemo(() => {
    if (!employeeViolations.length) return [];
    const map = {};
    employeeViolations.forEach((v) => {
      if (v.violation_details) {
        v.violation_details.split(", ").forEach((det) => {
          map[det] = (map[det] || 0) + 1;
        });
      }
    });
    return Object.entries(map).map(([type, count]) => ({ type, count }));
  }, [employeeViolations]);

  const showDetail = (emp) => {
    setSelectedEmployee(emp);
    setIsModalVisible(true);
  };

  /* ── Podium Card Sub-Component ────────────────────────────── */
  const PodiumCard = ({ emp, rank }) => {
    const cfg = {
      1: {
        glow: "rgba(239, 68, 68, 0.16)",
        bg: "#ffffff",
        border: "rgba(239, 68, 68, 0.25)",
        crown: "🔥 PERINGKAT 1",
        crownBg: "#fef2f2",
        headerColor: "#dc2626",
        avatarSize: 84,
        avatarFont: 26,
        zIdx: 10,
        scale: 1.05,
        ptsBg: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
        ptsColor: "#ffffff",
        shadow: "0 8px 20px rgba(239, 68, 68, 0.35)",
      },
      2: {
        glow: "rgba(100, 116, 139, 0.12)",
        bg: "#ffffff",
        border: "#e2e8f0",
        crown: "🥈 PERINGKAT 2",
        crownBg: "#f1f5f9",
        headerColor: "#475569",
        avatarSize: 72,
        avatarFont: 22,
        zIdx: 5,
        scale: 1.0,
        ptsBg: "linear-gradient(135deg, #64748b 0%, #475569 100%)",
        ptsColor: "#ffffff",
        shadow: "0 4px 12px rgba(100, 116, 139, 0.2)",
      },
      3: {
        glow: "rgba(245, 158, 11, 0.14)",
        bg: "#ffffff",
        border: "#fef3c7",
        crown: "🥉 PERINGKAT 3",
        crownBg: "#fffbeb",
        headerColor: "#d97706",
        avatarSize: 72,
        avatarFont: 22,
        zIdx: 5,
        scale: 1.0,
        ptsBg: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
        ptsColor: "#ffffff",
        shadow: "0 4px 12px rgba(245, 158, 11, 0.2)",
      },
    }[rank];

    if (!emp) return <div style={{ flex: 1, minWidth: 240 }} />;

    return (
      <div
        className="pr-podium-card"
        onClick={() => showDetail(emp)}
        style={{
          flex: 1,
          minWidth: rank === 1 ? 270 : 230,
          maxWidth: rank === 1 ? 330 : 270,
          background: cfg.bg,
          border: `1px solid ${cfg.border}`,
          transform: entered ? `scale(${cfg.scale})` : "scale(0.9) translateY(30px)",
          opacity: entered ? 1 : 0,
          transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${rank * 0.1}s`,
          boxShadow: `0 20px 40px -15px ${cfg.glow}, 0 1px 3px rgba(0,0,0,0.02)`,
          zIndex: cfg.zIdx,
          alignSelf: "flex-end",
        }}
      >
        <div
          className="pr-podium-rank-badge"
          style={{ background: cfg.crownBg, color: cfg.headerColor, border: `1px solid ${cfg.border}` }}
        >
          {cfg.crown}
        </div>

        <div className="pr-podium-avatar-wrapper">
          <UserAvatar name={emp.name} size={cfg.avatarSize} fontSize={cfg.avatarFont} />
        </div>

        <div className="pr-podium-name" style={{ fontSize: rank === 1 ? 16 : 14.5 }}>
          {emp.name}
        </div>
        <div className="pr-podium-nip">NIP. {emp.nip}</div>

        <div
          className="pr-podium-pts-pill"
          style={{
            background: cfg.ptsBg,
            color: cfg.ptsColor,
            boxShadow: cfg.shadow,
            fontSize: rank === 1 ? 16 : 14,
          }}
        >
          {emp.total_points} Poin
        </div>

        <div className="pr-podium-action-hint">
          <EyeOutlined /> Lihat Rincian Kejadian
        </div>
      </div>
    );
  };

  /* ── Table Columns Configuration ────────────────────────── */
  const columns = [
    {
      title: "Posisi",
      key: "rank",
      align: "center",
      width: 80,
      render: (_, __, i) => (
        <span style={{ fontWeight: 800, fontSize: 13, color: "#64748b" }}>
          #{i + 4}
        </span>
      ),
    },
    {
      title: "Nama Pegawai & NIP",
      key: "emp",
      render: (_, r) => (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <UserAvatar name={r.name} size={40} fontSize={15} />
          <div>
            <div style={{ fontWeight: 750, color: "#0f172a", fontSize: 13.5 }}>{r.name}</div>
            <div style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace", marginTop: 1 }}>
              NIP. {r.nip}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Intensitas Pelanggaran",
      key: "progress",
      align: "center",
      width: 220,
      render: (_, r) => {
        const percent = Math.min(100, Math.round((r.total_points / highestPointsValue) * 100));
        return (
          <div className="pr-pts-bar-container">
            <div className="pr-pts-bar-track">
              <div className="pr-pts-bar-fill" style={{ width: `${percent}%` }} />
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "#64748b", minWidth: 36 }}>
              {percent}%
            </span>
          </div>
        );
      },
    },
    {
      title: "Akumulasi Poin",
      dataIndex: "total_points",
      align: "center",
      width: 160,
      render: (pts) => (
        <Tag
          style={{
            fontWeight: 800,
            fontSize: 13,
            padding: "4px 14px",
            borderRadius: 20,
            color: "#dc2626",
            background: "#fef2f2",
            border: "1px solid #fecaca",
          }}
        >
          {pts} Poin
        </Tag>
      ),
    },
    {
      title: "Aksi",
      align: "center",
      width: 100,
      render: (_, r) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            showDetail(r);
          }}
          style={{
            borderRadius: 8,
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            color: "#334155",
            fontWeight: 700,
            fontSize: 12,
          }}
        >
          Rincian
        </Button>
      ),
    },
  ];

  return (
    <div className="pr-wrapper">
      {/* Background Ambient Gradient Glows */}
      <div className="pr-ambient-bg" />

      {/* ── Navbar ── */}
      <header className="pr-navbar">
        <div className="pr-nav-left">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/app/layanan-mandiri")}
            className="pr-back-btn"
          >
            Kembali
          </Button>

          <div className="pr-title-group">
            <h1 className="pr-title-main">
              <span>Papan Pembinaan Disiplin Pegawai</span>
              <Tag color="blue" style={{ borderRadius: 12, fontWeight: 700, fontSize: 10, margin: 0, padding: "1px 8px" }}>
                RISPEG
              </Tag>
            </h1>
            <span className="pr-title-sub">
              Sistem Rekapitulasi Pembinaan Disiplin & Kepatuhan Kehadiran Pegawai
            </span>
          </div>
        </div>

        <div className="pr-nav-right">
          {/* Quick Month Nav Control */}
          <div className="pr-month-navigator">
            <button className="pr-month-nav-btn" onClick={handlePrevMonth} title="Bulan Sebelumnya">
              <LeftOutlined style={{ fontSize: 12 }} />
            </button>

            <DatePicker
              picker="month"
              value={selectedMonth}
              onChange={(d) => d && setSelectedMonth(d)}
              allowClear={false}
              format="MMMM YYYY"
              bordered={false}
              style={{ width: 140, fontWeight: 700, textAlign: "center" }}
            />

            <button className="pr-month-nav-btn" onClick={handleNextMonth} title="Bulan Selanjutnya">
              <RightOutlined style={{ fontSize: 12 }} />
            </button>
          </div>

          {isAdmin && (
            <Button
              icon={<PushpinOutlined />}
              loading={savingDefault}
              onClick={handleSetDefaultMonth}
              className="pr-pin-btn"
            >
              Pin Default
            </Button>
          )}
        </div>
      </header>

      {/* ── Main Content Container ── */}
      <main className="pr-content-container">
        {loading ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "55vh",
              gap: 16,
            }}
          >
            <Spin size="large" />
            <div style={{ color: "#64748b", fontSize: 13.5, fontWeight: 600 }}>
              Memproses data kepatuhan pegawai...
            </div>
          </div>
        ) : activeOffenders.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "55vh",
              gap: 20,
              textAlign: "center",
              padding: "40px 20px",
            }}
          >
            <div style={{ fontSize: 72, lineHeight: 1 }}>🎉</div>
            <div>
              <h2 style={{ color: "#0f172a", fontWeight: 900, fontSize: 24, margin: 0 }}>
                Seluruh Pegawai Disiplin!
              </h2>
              <p style={{ color: "#64748b", fontSize: 14, maxWidth: 450, margin: "8px 0 0", lineHeight: 1.6 }}>
                Tidak terdeteksi adanya akumulasi poin pelanggaran pada periode bulan{" "}
                <strong>{selectedMonth.format("MMMM YYYY")}</strong>. Pertahankan kedisiplinan!
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* 📊 KPI Summary Bar */}
            <div className="pr-kpi-grid">
              <div className="pr-kpi-card">
                <div className="pr-kpi-icon" style={{ background: "#fef2f2", color: "#ef4444" }}>
                  <FireOutlined />
                </div>
                <div className="pr-kpi-body">
                  <span className="pr-kpi-label">Total Poin Pelanggaran</span>
                  <span className="pr-kpi-value" style={{ color: "#dc2626" }}>
                    {totalPointsCount} Poin
                  </span>
                </div>
              </div>

              <div className="pr-kpi-card">
                <div className="pr-kpi-icon" style={{ background: "#fff7ed", color: "#f59e0b" }}>
                  <TeamOutlined />
                </div>
                <div className="pr-kpi-body">
                  <span className="pr-kpi-label">Pegawai Terdampak</span>
                  <span className="pr-kpi-value">{activeOffenders.length} Orang</span>
                </div>
              </div>

              <div className="pr-kpi-card">
                <div className="pr-kpi-icon" style={{ background: "#eff6ff", color: "#0078d4" }}>
                  <WarningOutlined />
                </div>
                <div className="pr-kpi-body">
                  <span className="pr-kpi-label">Pelanggaran Tersering</span>
                  <span className="pr-kpi-value" style={{ fontSize: 14, marginTop: 4, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                    {mostFrequentViolation}
                  </span>
                </div>
              </div>

              <div className="pr-kpi-card">
                <div className="pr-kpi-icon" style={{ background: "#f0fdf4", color: "#10b981" }}>
                  <SafetyCertificateOutlined />
                </div>
                <div className="pr-kpi-body">
                  <span className="pr-kpi-label">Periode Evaluasi</span>
                  <span className="pr-kpi-value" style={{ fontSize: 15, color: "#16a34a", marginTop: 4 }}>
                    {selectedMonth.format("MMMM YYYY")}
                  </span>
                </div>
              </div>
            </div>

            {/* 👑 3D Podium Showcase (Top 3) */}
            <div className="pr-podium-header">
              <span className="pr-podium-section-title">
                <TrophyOutlined style={{ color: "#d97706" }} /> Tiga Pegawai Dengan Poin Pelanggaran Tertinggi
              </span>
            </div>

            <div className="pr-podium-grid">
              <PodiumCard emp={p2} rank={2} />
              <PodiumCard emp={p1} rank={1} />
              <PodiumCard emp={p3} rank={3} />
            </div>

            {/* 📋 Leaderboard Table Section (Rank 4+) */}
            <div className="pr-leaderboard-card">
              <div className="pr-table-toolbar">
                <h3 className="pr-table-title">
                  <TeamOutlined /> Daftar Pegawai Lainnya ({restOffenders.length})
                </h3>

                <Input
                  prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                  placeholder="Cari nama pegawai / NIP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  allowClear
                  className="pr-search-input"
                />
              </div>

              {restOffenders.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center" }}>
                  <Empty description="Tidak ada data pegawai yang sesuai dengan kata kunci pencarian." />
                </div>
              ) : (
                <Table
                  dataSource={restOffenders}
                  columns={columns}
                  rowKey="employee_id"
                  pagination={{ pageSize: 10, showSizeChanger: false }}
                  rowClassName="pr-table-row"
                  onRow={(r) => ({ onClick: () => showDetail(r) })}
                  className="pr-table"
                />
              )}
            </div>
          </>
        )}
      </main>

      {/* ── Microsoft Fluent Employee Detail Modal ── */}
      <Modal
        title={null}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={620}
        className="fluent-modal"
        centered
        destroyOnClose
      >
        {selectedEmployee && (
          <div>
            {/* Fluent Hero Banner Header */}
            <div className="fluent-modal-hero">
              <div className="fluent-modal-hero-left">
                <UserAvatar name={selectedEmployee.name} size={64} fontSize={24} />
                <div className="fluent-modal-title-box">
                  <h2 className="fluent-modal-name">{selectedEmployee.name}</h2>
                  <div className="fluent-modal-nip">NIP. {selectedEmployee.nip}</div>
                  <div style={{ marginTop: 8 }}>
                    <Tag
                      color="error"
                      style={{
                        borderRadius: 12,
                        fontWeight: 700,
                        padding: "2px 10px",
                        fontSize: 11.5,
                        margin: 0,
                      }}
                    >
                      Total {selectedEmployee.total_points} Poin Pelanggaran
                    </Tag>
                  </div>
                </div>
              </div>

              <button
                className="fluent-modal-close-btn"
                onClick={() => setIsModalVisible(false)}
                title="Tutup Modal"
              >
                <CloseOutlined style={{ fontSize: 14 }} />
              </button>
            </div>

            {/* Fluent Modal Body */}
            <div className="fluent-modal-body">
              {/* Violation Frequency Summary Chips */}
              {employeeViolationBreakdown.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div className="fluent-section-title">
                    <WarningOutlined style={{ color: "#0078d4" }} /> Ringkasan Kategori Pelanggaran
                  </div>
                  <div className="fluent-summary-grid">
                    {employeeViolationBreakdown.map((item, idx) => (
                      <div key={idx} className="fluent-summary-chip">
                        <span>{item.type}</span>
                        <span className="fluent-chip-count">{item.count}x</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="fluent-section-title">
                <CalendarOutlined style={{ color: "#0078d4" }} /> Rincian Kejadian Pelanggaran (Bulan Ini)
              </div>

              {employeeViolations.length === 0 ? (
                <Empty description="Tidak ada rincian kejadian." />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 300, overflowY: "auto", paddingRight: 4 }}>
                  {employeeViolations.map((v, i) => (
                    <div key={i} className="fluent-violation-card">
                      <div className="fluent-violation-date">
                        <CalendarOutlined style={{ color: "#ea580c" }} />
                        {dayjs(v.date).format("DD MMMM YYYY")}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end" }}>
                        {v.violation_details.split(", ").map((d, idx) => (
                          <span key={idx}>{getViolationTag(d)}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button
                type="primary"
                size="large"
                onClick={() => setIsModalVisible(false)}
                className="fluent-btn-primary"
                style={{ marginTop: 24 }}
              >
                Selesai & Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Floating Info Button ── */}
      <div
        className="pr-floating-info"
        onClick={() => setShowInfoModal(true)}
        title="Buka Panduan Penilaian Disiplin"
      >
        <InfoCircleOutlined />
      </div>

      {/* ── Microsoft Fluent Scoring Rules Info Modal ── */}
      <Modal
        title={null}
        open={showInfoModal}
        onCancel={() => setShowInfoModal(false)}
        footer={null}
        width={600}
        className="fluent-modal"
        centered
        destroyOnClose
      >
        {/* Fluent Modal Hero Header */}
        <div className="fluent-modal-hero" style={{ background: "linear-gradient(135deg, #005a9e 0%, #0078d4 100%)" }}>
          <div className="fluent-modal-hero-left">
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "rgba(255, 255, 255, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <TrophyOutlined style={{ color: "#ffffff", fontSize: 24 }} />
            </div>
            <div className="fluent-modal-title-box">
              <h2 className="fluent-modal-name">Metode Pembinaan & Penilaian RISPEG</h2>
              <div className="fluent-modal-nip" style={{ color: "#e0f2fe" }}>
                Panduan Akumulasi Poin Pelanggaran Kedisiplinan Pegawai
              </div>
            </div>
          </div>

          <button
            className="fluent-modal-close-btn"
            onClick={() => setShowInfoModal(false)}
            title="Tutup Modal"
          >
            <CloseOutlined style={{ fontSize: 14 }} />
          </button>
        </div>

        {/* Fluent Modal Body */}
        <div className="fluent-modal-body">
          <div className="fluent-info-box">
            <div className="fluent-info-box-title">
              <CheckOutlined style={{ color: "#0078d4" }} /> Mekanisme Penilaian Kumulatif
            </div>
            <p className="fluent-info-box-desc">
              Sistem akan mengomputasi data absensi dan keterlambatan pegawai secara otomatis. Poin pelanggaran bersifat kumulatif tiap bulan aktif untuk mendukung transparansi dan pembinaan disiplin instansi.
            </p>
          </div>

          <div className="fluent-section-title" style={{ marginBottom: 12 }}>
            <WarningOutlined style={{ color: "#0078d4" }} /> Pembobotan Poin Jenis Pelanggaran:
          </div>

          <div className="fluent-scoring-grid">
            {[
              { label: "Terlambat Masuk", color: "#ea580c", bg: "#fff7ed", border: "#ffedd5", desc: "Datang melewati toleransi jam kerja" },
              { label: "Pulang Cepat", color: "#0d9488", bg: "#f0fdfa", border: "#ccfbf1", desc: "Meninggalkan kantor lebih awal" },
              { label: "Tidak Berseragam", color: "#2563eb", bg: "#eff6ff", border: "#dbeafe", desc: "Pakaian tidak sesuai ketentuan hari" },
              { label: "Terlambat Apel Pagi", color: "#7c3aed", bg: "#f5f3ff", border: "#ede9fe", desc: "Terlambat merekam absensi apel pagi" },
              { label: "Lupa Absen Masuk", color: "#0891b2", bg: "#ecfeff", border: "#cffafe", desc: "Tidak merekam kehadiran saat masuk" },
              { label: "Lupa Absen Pulang", color: "#db2777", bg: "#fdf2f8", border: "#fce7f3", desc: "Tidak merekam kehadiran saat pulang" },
            ].map((item) => (
              <div
                key={item.label}
                className="fluent-scoring-item"
                style={{
                  background: item.bg,
                  border: `1px solid ${item.border}`,
                }}
              >
                <Tag
                  style={{
                    color: item.color,
                    background: "#ffffff",
                    border: `1px solid ${item.color}50`,
                    borderRadius: 6,
                    fontWeight: 800,
                    fontSize: 11,
                    margin: 0,
                  }}
                >
                  +1 Poin
                </Tag>
                <div className="fluent-scoring-body">
                  <div className="fluent-scoring-label" style={{ color: item.color }}>
                    {item.label}
                  </div>
                  <div className="fluent-scoring-desc">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <Button
            type="primary"
            size="large"
            onClick={() => setShowInfoModal(false)}
            className="fluent-btn-primary"
          >
            Mengerti & Tutup
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default PengumumanRispeg;
