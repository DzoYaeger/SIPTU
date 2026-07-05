import { useState, useEffect, useRef } from "react";
import { Modal, Table, Tag, Spin, Button, Empty, DatePicker, message } from "antd";
import {
  CalendarOutlined,
  ArrowLeftOutlined,
  EyeOutlined,
  PushpinOutlined,
  InfoCircleOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import "dayjs/locale/id";
import { useAuth } from "../hooks/useAuth.js";
import { useNavigate } from "react-router-dom";

dayjs.locale("id");

/* ── Violation tag colours ───────────────────────────────── */
const VIOLATION_COLORS = {
  "Terlambat Masuk":  { color: "#ff6b35", bg: "#fff4e6" },
  "Pulang Cepat":     { color: "#20c997", bg: "#e6fcf5" },
  "Tidak Berseragam": { color: "#4dabf7", bg: "#e7f5ff" },
  "Terlambat Apel Pagi":       { color: "#cc5de8", bg: "#f3f0ff" },
  "Lupa Absen Masuk": { color: "#22b8cf", bg: "#e3fafc" },
  "Lupa Absen Pulang":{ color: "#f06595", bg: "#fff0f6" },
};

const getViolationTag = (text) => {
  for (const [key, style] of Object.entries(VIOLATION_COLORS)) {
    if (text.startsWith(key)) {
      return (
        <Tag style={{ color: style.color, background: style.bg, border: `1px solid ${style.color}50`, borderRadius: 8, padding: "3px 10px", fontSize: 12 }}>
          {text}
        </Tag>
      );
    }
  }
  return <Tag color="error">{text}</Tag>;
};

/* ── Rain drop animation component ─────────────────────── */
const RainEffect = () => {
  const drops = Array.from({ length: 60 });
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      {drops.map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: "-20px",
            left: `${(i * 1.7) % 100}%`,
            width: "1.5px",
            height: `${(i % 3) * 15 + 20}px`,
            background: `linear-gradient(to bottom, transparent, rgba(99,150,220,${0.1 + (i % 4) * 0.06}))`,
            borderRadius: "2px",
            animation: `rain ${1.5 + (i % 5) * 0.4}s linear infinite`,
            animationDelay: `${(i % 7) * 0.4}s`,
          }}
        />
      ))}
    </div>
  );
};

/* ── Sad Emoji Float component ─────────────────────────── */
const SadEmojis = ({ show }) => {
  const emojis = ["😢", "😭", "😔", "💧", "😿", "🥺", "😞", "😓"];
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!show) return;
    const newItems = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      emoji: emojis[i % emojis.length],
      x: (i * 8.5) % 92 + 2,
      delay: i * 0.25,
      duration: 4 + (i % 4),
      size: 20 + (i % 3) * 10,
    }));
    setItems(newItems);
  }, [show]);

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1, overflow: "hidden" }}>
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            position: "absolute",
            bottom: "-60px",
            left: `${item.x}%`,
            fontSize: `${item.size}px`,
            animation: `floatUp ${item.duration}s ease-in forwards`,
            animationDelay: `${item.delay}s`,
            opacity: 0,
          }}
        >
          {item.emoji}
        </div>
      ))}
    </div>
  );
};

/* ── Avatar — perfectly centered initials ────────────────── */
const UserAvatar = ({ name, size = 56, fontSize = 20 }) => {
  const initials = name
    ? name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase()
    : "?";
  const hue = name ? [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360 : 200;
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: `hsl(${hue}, 60%, 52%)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#fff",
      fontWeight: 800,
      fontSize,
      lineHeight: 1,
      flexShrink: 0,
      textAlign: "center",
      boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
      userSelect: "none",
    }}>
      <span style={{ display: "block", lineHeight: 1 }}>{initials}</span>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════ */
const PengumumanRispeg = () => {
  const { apiFetch, user, currentRole } = useAuth();
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const [savingDefault, setSavingDefault] = useState(false);
  const [defaultMonthLabel, setDefaultMonthLabel] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const initialFetched = useRef(false);

  const isAdmin = user?.base_role === "admin" || currentRole === "admin";

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 100);
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
      } catch (_) { /* ignore, fallback to current month */ }
    })();
  }, []);

  const fetchStats = async (monthVal, yearVal) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/rispeg/dashboard-stats?month=${monthVal}&year=${yearVal}`);
      if (res.ok) setData(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

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
    } catch (_) { message.error("Gagal menyimpan bulan default."); }
    finally { setSavingDefault(false); }
  };

  useEffect(() => {
    fetchStats(selectedMonth.format("MM"), selectedMonth.format("YYYY"));
  }, [selectedMonth]);

  const allStats = data?.all_stats || [];
  const activeOffenders = allStats.filter(item => item.total_points > 0);
  const [p1, p2, p3] = activeOffenders;
  const rest = activeOffenders.slice(3);

  const employeeViolations = selectedEmployee
    ? (data?.daily_violations || []).filter(v => v.employee_id === selectedEmployee.employee_id)
    : [];

  const showDetail = (emp) => { setSelectedEmployee(emp); setIsModalVisible(true); };

  /* ── Podium Card ─────────────────────────────────────── */
  const PodiumCard = ({ emp, rank }) => {
    const cfg = {
      1: { glow: "#f59e0b55", bg: "#fffbeb", border: "#f59e0b", crown: "🚨", avatarSize: 80, avatarFont: 28, zIdx: 10, scale: 1.06, pts: { bg: "#ef4444", color: "#fff", shadow: "#ef444440" } },
      2: { glow: "#94a3b820", bg: "#f8fafc",  border: "#cbd5e1", crown: "⚠️", avatarSize: 64, avatarFont: 22, zIdx: 5,  scale: 1.0,  pts: { bg: "#64748b", color: "#fff", shadow: "none" } },
      3: { glow: "#d9770620", bg: "#fff7ed",  border: "#d97706", crown: "😤", avatarSize: 64, avatarFont: 22, zIdx: 5,  scale: 1.0,  pts: { bg: "#d97706", color: "#fff", shadow: "none" } },
    }[rank];

    if (!emp) return <div style={{ flex: 1 }} />;

    return (
      <div
        onClick={() => showDetail(emp)}
        style={{
          flex: 1,
          maxWidth: rank === 1 ? 300 : 240,
          background: cfg.bg,
          border: `2px solid ${cfg.border}`,
          borderRadius: 28,
          padding: "28px 20px 24px",
          textAlign: "center",
          cursor: "pointer",
          transform: entered ? `scale(${cfg.scale})` : "scale(0.75) translateY(50px)",
          opacity: entered ? 1 : 0,
          transition: `all 0.8s cubic-bezier(0.34,1.56,0.64,1) ${rank * 0.18}s`,
          boxShadow: `0 16px 48px ${cfg.glow}`,
          zIndex: cfg.zIdx,
          position: "relative",
          alignSelf: "flex-end",
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 10, lineHeight: 1 }}>{cfg.crown}</div>
        {/* Avatar centered */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <UserAvatar name={emp.name} size={cfg.avatarSize} fontSize={cfg.avatarFont} />
        </div>
        <div style={{ fontWeight: 800, fontSize: rank === 1 ? 16 : 14, color: "#1e293b", lineHeight: 1.4 }}>
          {emp.name}
        </div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>NIP. {emp.nip}</div>
        <div style={{
          marginTop: 14, display: "inline-block",
          background: cfg.pts.bg,
          color: cfg.pts.color,
          fontWeight: 800, borderRadius: 20,
          padding: rank === 1 ? "7px 22px" : "5px 16px",
          fontSize: rank === 1 ? 18 : 15,
          boxShadow: cfg.pts.shadow,
        }}>
          {emp.total_points} Poin
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: "#94a3b8" }}>
          <EyeOutlined style={{ marginRight: 4 }} />Klik untuk detail
        </div>
      </div>
    );
  };

  /* ── Table columns ───────────────────────────────────── */
  const columns = [
    {
      title: "#", key: "rank", align: "center", width: 56,
      render: (_, __, i) => <span style={{ fontWeight: 800, fontSize: 15, color: "#94a3b8" }}>#{i + 4}</span>,
    },
    {
      title: "Pegawai", key: "emp",
      render: (_, r) => (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <UserAvatar name={r.name} size={40} fontSize={15} />
          <div>
            <div style={{ fontWeight: 700, color: "#1e293b" }}>{r.name}</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>NIP. {r.nip}</div>
          </div>
        </div>
      ),
    },
    {
      title: "Total Poin", dataIndex: "total_points", align: "center",
      render: pts => (
        <Tag style={{ fontWeight: 800, fontSize: 14, padding: "4px 14px", borderRadius: 20, color: "#dc2626", background: "#fff1f2", border: "1.5px solid #fecaca" }}>
          {pts} Poin
        </Tag>
      ),
    },
    {
      title: "", align: "center",
      render: (_, r) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={(e) => { e.stopPropagation(); showDetail(r); }}
          style={{ borderRadius: 8, background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#475569", fontWeight: 600 }}
        >
          Detail
        </Button>
      ),
    },
  ];

  return (
    <>
      {/* ── Global Keyframe Styles ─────────────────────── */}
      <style>{`
        @keyframes rain {
          0%   { transform: translateY(-20px); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 0.5; }
          100% { transform: translateY(110vh); opacity: 0; }
        }
        @keyframes floatUp {
          0%   { transform: translateY(0) rotate(0deg); opacity: 0; }
          10%  { opacity: 1; }
          80%  { opacity: 0.7; }
          100% { transform: translateY(-110vh) rotate(15deg); opacity: 0; }
        }
        @keyframes sadPulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.08); }
        }
        @keyframes titleSlide {
          from { opacity: 0; transform: translateY(-24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes wobble {
          0%, 100% { transform: rotate(0deg); }
          20%  { transform: rotate(-5deg); }
          40%  { transform: rotate(5deg); }
          60%  { transform: rotate(-3deg); }
          80%  { transform: rotate(3deg); }
        }
        .pr-row:hover { background: #fff5f5 !important; cursor: pointer; }
        .pr-table .ant-table { background: transparent !important; }
        .pr-table .ant-table-thead > tr > th { background: #f8fafc !important; color: #64748b !important; font-weight: 700; border-bottom: 1px solid #e2e8f0; }
        .pr-table .ant-table-tbody > tr > td { border-bottom: 1px solid #f1f5f9; }
      `}</style>

      {/* ── Rain + Emoji FX ──────────────────────────────── */}
      <RainEffect />
      <SadEmojis show={entered} />

      {/* ── Main Full-Screen Container — LIGHT THEME ─────── */}
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #f0f4ff 0%, #fafbff 50%, #f5f0ff 100%)",
        position: "relative",
        zIndex: 2,
        overflowX: "hidden",
      }}>

        {/* ── Sticky Header ─────────────────────────────── */}
        <div style={{
          padding: "20px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          backdropFilter: "blur(16px)",
          background: "rgba(255,255,255,0.80)",
          position: "sticky", top: 0, zIndex: 100,
          boxShadow: "0 2px 20px rgba(0,0,0,0.04)",
        }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/app/layanan-mandiri")}
            style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#475569", borderRadius: 12, height: 40, padding: "0 16px", fontWeight: 600 }}
          >
            Kembali
          </Button>

          <div style={{ textAlign: "center", animation: entered ? "titleSlide 0.8s cubic-bezier(0.34,1.56,0.64,1) both" : "none" }}>
            <div style={{ fontSize: 26, lineHeight: 1, animation: "wobble 3s ease-in-out 1s infinite" }}>😢</div>
            <div style={{ color: "#1e293b", fontWeight: 900, fontSize: 20, letterSpacing: "-0.02em", marginTop: 4 }}>
              Papan Pelanggaran Disiplin
            </div>
            <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 2 }}>Rekapitulasi RISPEG – Siapa Paling Tidak Disiplin?</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600 }}>Bulan:</span>
              <DatePicker
                picker="month"
                value={selectedMonth}
                onChange={d => d && setSelectedMonth(d)}
                allowClear={false}
                format="MMM YYYY"
                style={{ borderRadius: 12, width: 140 }}
              />
              {isAdmin && (
                <Button
                  icon={<PushpinOutlined />}
                  loading={savingDefault}
                  onClick={handleSetDefaultMonth}
                  style={{ borderRadius: 12, height: 32, fontSize: 12, fontWeight: 600, background: "#f0fdf4", border: "1px solid #86efac", color: "#16a34a" }}
                >
                  Set Default
                </Button>
              )}
            </div>
            {defaultMonthLabel && (
              <div style={{ fontSize: 11, color: "#94a3b8" }}>
                <PushpinOutlined style={{ marginRight: 4 }} />Default: {defaultMonthLabel}
              </div>
            )}
          </div>
        </div>

        {/* ── Body ──────────────────────────────────────── */}
        <div style={{ padding: "44px 32px 80px", maxWidth: 1100, margin: "0 auto" }}>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 20 }}>
              <div style={{ fontSize: 60, animation: "sadPulse 1.5s ease-in-out infinite" }}>😭</div>
              <Spin size="large" />
              <div style={{ color: "#94a3b8", fontSize: 15 }}>Memuat data pelanggaran...</div>
            </div>
          ) : activeOffenders.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 20, textAlign: "center" }}>
              <div style={{ fontSize: 80 }}>🎉</div>
              <div style={{ color: "#1e293b", fontWeight: 800, fontSize: 28 }}>Tidak Ada Pelanggaran!</div>
              <div style={{ color: "#64748b", fontSize: 16 }}>Seluruh pegawai tertib pada bulan {selectedMonth.format("MMMM YYYY")}.</div>
            </div>
          ) : (
            <>
              {/* ── Podium Section ───────────────────────── */}
              <div style={{ marginBottom: 56 }}>
                <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 32 }}>
                  🚨 &nbsp; Pelanggaran Terbanyak Bulan {selectedMonth.format("MMMM YYYY")} &nbsp; 🚨
                </div>
                <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
                  <PodiumCard emp={p2} rank={2} />
                  <PodiumCard emp={p1} rank={1} />
                  <PodiumCard emp={p3} rank={3} />
                </div>
              </div>

              {/* ── Tear divider ─────────────────────────── */}
              {rest.length > 0 && (
                <div style={{ textAlign: "center", marginBottom: 24, color: "#94a3b8", fontSize: 13 }}>
                  <span style={{ fontSize: 16 }}>💧</span>&nbsp; Peringkat berikutnya &nbsp;<span style={{ fontSize: 16 }}>💧</span>
                </div>
              )}

              {/* ── Leaderboard Table ─────────────────────── */}
              {rest.length > 0 && (
                <div style={{
                  background: "#fff",
                  borderRadius: 24,
                  border: "1px solid #e2e8f0",
                  overflow: "hidden",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.04)",
                  opacity: entered ? 1 : 0,
                  transform: entered ? "none" : "translateY(30px)",
                  transition: "all 0.8s ease 0.6s",
                }}>
                  <Table
                    dataSource={rest}
                    columns={columns}
                    rowKey="employee_id"
                    pagination={false}
                    rowClassName="pr-row"
                    onRow={(r) => ({ onClick: () => showDetail(r) })}
                    className="pr-table"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Detail Modal ─────────────────────────────────── */}
      <Modal
        title={null}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={620}
        styles={{ content: { borderRadius: 28, overflow: "hidden", padding: 0 }, body: { padding: 0 } }}
        centered
      >
        {selectedEmployee && (
          <div>
            {/* Modal header — kept dark for contrast */}
            <div style={{ background: "linear-gradient(135deg,#1e293b,#0f172a)", padding: "28px 28px 24px", display: "flex", alignItems: "center", gap: 18 }}>
              <UserAvatar name={selectedEmployee.name} size={64} fontSize={24} />
              <div>
                <div style={{ color: "#f8fafc", fontWeight: 800, fontSize: 20 }}>{selectedEmployee.name}</div>
                <div style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>NIP. {selectedEmployee.nip}</div>
                <div style={{ marginTop: 10 }}>
                  <span style={{ background: "#ef4444", color: "#fff", fontWeight: 800, borderRadius: 20, padding: "5px 16px", fontSize: 15 }}>
                    Total {selectedEmployee.total_points} Poin Pelanggaran
                  </span>
                </div>
              </div>
              <div style={{ marginLeft: "auto", fontSize: 40 }}>😢</div>
            </div>

            {/* Violation list */}
            <div style={{ padding: "24px 28px 28px", background: "#fff" }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: "#1e293b" }}>Rincian Tanggal Pelanggaran:</div>
              {employeeViolations.length === 0 ? (
                <Empty description="Tidak ada data rincian harian." />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 340, overflowY: "auto", paddingRight: 6 }}>
                  {employeeViolations.map((v, i) => (
                    <div key={i} style={{ background: "#f8fafc", borderRadius: 14, padding: "12px 16px", border: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#475569", fontWeight: 600 }}>
                        <CalendarOutlined />
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
              <Button block type="primary" onClick={() => setIsModalVisible(false)} style={{ marginTop: 20, borderRadius: 12, height: 44, fontWeight: 700 }}>
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>
      {/* ── Floating Info Button ──────────────────────────── */}
      <div
        onClick={() => setShowInfoModal(true)}
        title="Cara Penilaian"
        style={{
          position: "fixed",
          bottom: 28,
          right: 24,
          zIndex: 1000,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 4px 20px rgba(99,102,241,0.5)",
          animation: "floatBtn 3s ease-in-out infinite",
          transition: "transform 0.2s",
        }}
        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.12)"}
        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
      >
        <InfoCircleOutlined style={{ color: "#fff", fontSize: 22 }} />
      </div>

      {/* ── Info / Scoring Modal ──────────────────────────── */}
      <Modal
        title={null}
        open={showInfoModal}
        onCancel={() => setShowInfoModal(false)}
        footer={null}
        width={560}
        styles={{ content: { borderRadius: 28, overflow: "hidden", padding: 0 }, body: { padding: 0 } }}
        centered
      >
        {/* Modal Header */}
        <div style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", padding: "28px 28px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TrophyOutlined style={{ color: "#fff", fontSize: 26 }} />
            </div>
            <div>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: 18, lineHeight: 1.2 }}>Cara Penilaian RISPEG</div>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 4 }}>Sistem Rekap Pelanggaran Disiplin Pegawai</div>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "24px 28px 28px", background: "#fff" }}>

          {/* Penjelasan Umum */}
          <div style={{ background: "#f8fafc", borderRadius: 16, padding: "16px 18px", marginBottom: 20, borderLeft: "4px solid #6366f1" }}>
            <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 14, marginBottom: 6 }}>
              📋 Dasar Penilaian
            </div>
            <div style={{ color: "#475569", fontSize: 13, lineHeight: 1.7 }}>
              Penilaian dilakukan berdasarkan <strong>intensitas pelanggaran</strong> Bapak/Ibu selama bulan yang dipilih.
              Setiap jenis pelanggaran memiliki bobot poin tersendiri — semakin banyak dan berat pelanggarannya,
              semakin tinggi total poin yang terakumulasi.
            </div>
          </div>

          {/* Metode Perhitungan */}
          <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 14, marginBottom: 12 }}>
            <ClockCircleOutlined style={{ marginRight: 8, color: "#6366f1" }} />
            Metode Perhitungan
          </div>
          <div style={{ background: "#f8fafc", borderRadius: 16, padding: "16px 18px", marginBottom: 20 }}>
            <div style={{ color: "#475569", fontSize: 13, lineHeight: 1.8 }}>
              <div style={{ marginBottom: 6 }}>• Setiap hari dihitung secara kumulatif dalam satu bulan.</div>
              <div style={{ marginBottom: 6 }}>• Satu hari dapat memiliki <strong>lebih dari satu pelanggaran</strong> sekaligus.</div>
              <div style={{ marginBottom: 6 }}>• Total poin = <strong>jumlah seluruh kejadian pelanggaran × bobot masing-masing</strong>.</div>
              <div>• Peringkat ditentukan dari total poin tertinggi (pelanggaran terbanyak/terberat).</div>
            </div>
          </div>

          {/* Jenis Pelanggaran */}
          <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 14, marginBottom: 12 }}>
            <WarningOutlined style={{ marginRight: 8, color: "#f59e0b" }} />
            Jenis Pelanggaran &amp; Bobot Poin
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {[
              { label: "Terlambat Masuk",     color: "#ff6b35", bg: "#fff4e6", poin: 1, desc: "Hadir melewati jam masuk yang ditentukan" },
              { label: "Pulang Cepat",        color: "#20c997", bg: "#e6fcf5", poin: 1, desc: "Pulang sebelum jam kerja selesai" },
              { label: "Tidak Berseragam",    color: "#4dabf7", bg: "#e7f5ff", poin: 1, desc: "Tidak mengenakan seragam dinas yang ditentukan" },
              { label: "Terlambat Apel Pagi", color: "#cc5de8", bg: "#f3f0ff", poin: 1, desc: "Tidak hadir tepat waktu di apel pagi" },
              { label: "Lupa Absen Masuk",    color: "#22b8cf", bg: "#e3fafc", poin: 1, desc: "Tidak melakukan absensi saat datang" },
              { label: "Lupa Absen Pulang",   color: "#f06595", bg: "#fff0f6", poin: 1, desc: "Tidak melakukan absensi saat pulang" },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 12, background: item.bg, borderRadius: 12, padding: "10px 14px", border: `1px solid ${item.color}30` }}>
                <div style={{ flexShrink: 0 }}>
                  <Tag style={{ color: item.color, background: "transparent", border: `1px solid ${item.color}`, borderRadius: 8, fontWeight: 700, fontSize: 11, margin: 0 }}>
                    +{item.poin} poin
                  </Tag>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: item.color, fontSize: 13 }}>{item.label}</div>
                  <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <Button
            block
            type="primary"
            onClick={() => setShowInfoModal(false)}
            style={{ borderRadius: 12, height: 44, fontWeight: 700, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none" }}
          >
            Mengerti
          </Button>
        </div>
      </Modal>

      <style>{`
        @keyframes floatBtn {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
      `}</style>
    </>
  );
};

export default PengumumanRispeg;
