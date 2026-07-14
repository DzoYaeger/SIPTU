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
  "Terlambat Masuk":  { color: "#ea580c", bg: "#fff7ed" },
  "Pulang Cepat":     { color: "#0d9488", bg: "#f0fdfa" },
  "Tidak Berseragam": { color: "#2563eb", bg: "#eff6ff" },
  "terlambat Absen Apel pagi":       { color: "#7c3aed", bg: "#f5f3ff" },
  "Lupa Absen Masuk": { color: "#0891b2", bg: "#ecfeff" },
  "Lupa Absen Pulang":{ color: "#db2777", bg: "#fdf2f8" },
};

const getViolationTag = (text) => {
  for (const [key, style] of Object.entries(VIOLATION_COLORS)) {
    if (text.startsWith(key)) {
      return (
        <Tag style={{ color: style.color, background: style.bg, border: `1px solid ${style.color}30`, borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>
          {text}
        </Tag>
      );
    }
  }
  return <Tag color="error" style={{ borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>{text}</Tag>;
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
      background: `hsl(${hue}, 60%, 48%)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#fff",
      fontWeight: 800,
      fontSize,
      lineHeight: 1,
      flexShrink: 0,
      textAlign: "center",
      boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
      userSelect: "none",
    }}>
      <span style={{ display: "block", lineHeight: 1 }}>{initials}</span>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════ */
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
      1: { 
        glow: "rgba(239, 68, 68, 0.12)", 
        bg: "#ffffff", 
        border: "#fecaca", 
        crown: "👑 Peringkat 1", 
        headerColor: "#ef4444",
        avatarSize: 80, 
        avatarFont: 26, 
        zIdx: 10, 
        scale: 1.05, 
        pts: { bg: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", color: "#fff", shadow: "0 4px 12px rgba(239, 68, 68, 0.3)" } 
      },
      2: { 
        glow: "rgba(100, 116, 139, 0.06)", 
        bg: "#ffffff",  
        border: "#e2e8f0", 
        crown: "🥈 Peringkat 2", 
        headerColor: "#64748b",
        avatarSize: 68, 
        avatarFont: 22, 
        zIdx: 5,  
        scale: 1.0,  
        pts: { bg: "linear-gradient(135deg, #64748b 0%, #475569 100%)", color: "#fff", shadow: "none" } 
      },
      3: { 
        glow: "rgba(245, 158, 11, 0.06)", 
        bg: "#ffffff",  
        border: "#fef3c7", 
        crown: "🥉 Peringkat 3", 
        headerColor: "#d97706",
        avatarSize: 68, 
        avatarFont: 22, 
        zIdx: 5,  
        scale: 1.0,  
        pts: { bg: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", color: "#fff", shadow: "none" } 
      },
    }[rank];

    if (!emp) return <div style={{ flex: 1, minWidth: 200 }} />;

    return (
      <div
        onClick={() => showDetail(emp)}
        style={{
          flex: 1,
          minWidth: rank === 1 ? 260 : 220,
          maxWidth: rank === 1 ? 320 : 260,
          background: cfg.bg,
          border: `1px solid ${cfg.border}`,
          borderRadius: 24,
          padding: "24px 20px 20px",
          textAlign: "center",
          cursor: "pointer",
          transform: entered ? `scale(${cfg.scale})` : "scale(0.9) translateY(30px)",
          opacity: entered ? 1 : 0,
          transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${rank * 0.1}s`,
          boxShadow: `0 20px 40px -15px ${cfg.glow}, 0 1px 3px rgba(0,0,0,0.02)`,
          zIndex: cfg.zIdx,
          position: "relative",
          alignSelf: "flex-end",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 800, color: cfg.headerColor, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12 }}>
          {cfg.crown}
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <UserAvatar name={emp.name} size={cfg.avatarSize} fontSize={cfg.avatarFont} />
        </div>
        <div style={{ fontWeight: 800, fontSize: rank === 1 ? 16 : 14, color: "#0f172a", lineHeight: 1.3 }}>
          {emp.name}
        </div>
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 4, fontFamily: "monospace" }}>NIP. {emp.nip}</div>
        <div style={{
          marginTop: 16, 
          display: "inline-block",
          background: cfg.pts.bg,
          color: cfg.pts.color,
          fontWeight: 800, 
          borderRadius: 100,
          padding: rank === 1 ? "6px 20px" : "4px 14px",
          fontSize: rank === 1 ? 16 : 14,
          boxShadow: cfg.pts.shadow,
        }}>
          {emp.total_points} Poin
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
          <EyeOutlined /> Lihat Detail
        </div>
      </div>
    );
  };

  /* ── Table columns ───────────────────────────────────── */
  const columns = [
    {
      title: "Peringkat", key: "rank", align: "center", width: 90,
      render: (_, __, i) => <span style={{ fontWeight: 800, fontSize: 13, color: "#64748b" }}>#{i + 4}</span>,
    },
    {
      title: "Pegawai", key: "emp",
      render: (_, r) => (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <UserAvatar name={r.name} size={36} fontSize={14} />
          <div>
            <div style={{ fontWeight: 750, color: "#0f172a", fontSize: 13.5 }}>{r.name}</div>
            <div style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>NIP. {r.nip}</div>
          </div>
        </div>
      ),
    },
    {
      title: "Total Akumulasi Poin", dataIndex: "total_points", align: "center", width: 200,
      render: pts => (
        <Tag style={{ fontWeight: 800, fontSize: 13, padding: "4px 14px", borderRadius: 20, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca" }}>
          {pts} Poin
        </Tag>
      ),
    },
    {
      title: "Opsi", align: "center", width: 110,
      render: (_, r) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={(e) => { e.stopPropagation(); showDetail(r); }}
          style={{ borderRadius: 8, background: "#f8fafc", border: "1px solid #cbd5e1", color: "#475569", fontWeight: 700, fontSize: 12 }}
        >
          Rincian
        </Button>
      ),
    },
  ];

  return (
    <>
      <style>{`
        .pr-row:hover { background: #fff5f5 !important; cursor: pointer; }
        .pr-table .ant-table { background: transparent !important; }
        .pr-table .ant-table-thead > tr > th { background: #f8fafc !important; color: #475569 !important; font-weight: 700; border-bottom: 1px solid #e2e8f0; }
        .pr-table .ant-table-tbody > tr > td { border-bottom: 1px solid #f1f5f9; }
      `}</style>

      {/* ── Ambient Background FX ─────────────────────────── */}
      <div 
        style={{
          position: "fixed",
          inset: 0,
          background: "linear-gradient(135deg, #f8fafc 0%, #eff6ff 50%, #f1f5f9 100%)",
          zIndex: 0,
          pointerEvents: "none"
        }}
      />
      <div 
        style={{
          position: "fixed",
          top: "-10%",
          left: "-10%",
          width: "50%",
          height: "50%",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99, 102, 241, 0.04), transparent 70%)",
          zIndex: 1,
          pointerEvents: "none",
          filter: "blur(40px)"
        }}
      />
      <div 
        style={{
          position: "fixed",
          bottom: "-10%",
          right: "-10%",
          width: "50%",
          height: "50%",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(14, 165, 233, 0.04), transparent 70%)",
          zIndex: 1,
          pointerEvents: "none",
          filter: "blur(40px)"
        }}
      />

      {/* ── Main Dashboard Panel ── */}
      <div style={{ position: "relative", zIndex: 2, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        
        {/* Sticky Header Bar */}
        <div style={{
          padding: "16px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #e2e8f0",
          backdropFilter: "blur(12px)",
          background: "rgba(255, 255, 255, 0.85)",
          position: "sticky", 
          top: 0, 
          zIndex: 100,
          boxShadow: "0 4px 20px -12px rgba(15, 23, 42, 0.08)",
        }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/app/layanan-mandiri")}
            style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#475569", borderRadius: 10, height: 38, padding: "0 16px", fontWeight: 700 }}
          >
            Kembali
          </Button>

          <div style={{ textAlign: "center" }}>
            <h2 style={{ color: "#0f172a", fontWeight: 900, fontSize: 18, letterSpacing: "-0.5px", margin: 0 }}>
              Papan Pelanggaran Disiplin
            </h2>
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 2 }}>
              Monitoring RISPEG – Sistem Rekapitulasi Pembinaan Disiplin Pegawai
            </Text>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <DatePicker
              picker="month"
              value={selectedMonth}
              onChange={d => d && setSelectedMonth(d)}
              allowClear={false}
              format="MMMM YYYY"
              style={{ borderRadius: 10, width: 150, height: 38 }}
            />
            {isAdmin && (
              <Button
                icon={<PushpinOutlined />}
                loading={savingDefault}
                onClick={handleSetDefaultMonth}
                style={{ borderRadius: 10, height: 38, fontWeight: 700, background: "#f0fdf4", border: "1px solid #86efac", color: "#16a34a" }}
              >
                Set Default
              </Button>
            )}
          </div>
        </div>

        {/* ── Content Grid ── */}
        <div style={{ padding: "40px 24px 80px", maxWidth: 1100, margin: "0 auto", width: "100%", flex: 1 }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", gap: 16 }}>
              <Spin size="large" />
              <div style={{ color: "#64748b", fontSize: 14, fontWeight: 500 }}>Memproses data kepatuhan...</div>
            </div>
          ) : activeOffenders.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", gap: 20, textAlign: "center" }}>
              <div style={{ fontSize: 72 }}>🎉</div>
              <div style={{ color: "#0f172a", fontWeight: 800, fontSize: 24 }}>Seluruh Pegawai Disiplin!</div>
              <div style={{ color: "#64748b", fontSize: 14, maxWidth: 400, lineHeight: 1.6 }}>
                Tidak terdeteksi adanya pelanggaran absensi atau apel pada periode bulan {selectedMonth.format("MMMM YYYY")}.
              </div>
            </div>
          ) : (
            <>
              {/* Podium Section */}
              <div style={{ marginBottom: 48 }}>
                <div style={{ textAlign: "center", color: "#64748b", fontSize: 11, fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 28 }}>
                  Tiga Pegawai Dengan Akumulasi Poin Tertinggi
                </div>
                <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 20, flexWrap: "wrap" }}>
                  <PodiumCard emp={p2} rank={2} />
                  <PodiumCard emp={p1} rank={1} />
                  <PodiumCard emp={p3} rank={3} />
                </div>
              </div>

              {/* Leaderboard Table Section */}
              {rest.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "1px", paddingLeft: 4 }}>
                    Daftar Urutan Pegawai Lainnya
                  </div>
                  <div style={{
                    background: "#ffffff",
                    borderRadius: 20,
                    border: "1px solid #cbd5e1",
                    overflow: "hidden",
                    boxShadow: "0 10px 30px -15px rgba(15, 23, 42, 0.05)",
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
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Detail Modal ── */}
      <Modal
        title={null}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={580}
        styles={{ content: { borderRadius: 24, overflow: "hidden", padding: 0 }, body: { padding: 0 } }}
        centered
      >
        {selectedEmployee && (
          <div>
            {/* Modal header */}
            <div style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", padding: "28px", display: "flex", alignItems: "center", gap: 16 }}>
              <UserAvatar name={selectedEmployee.name} size={60} fontSize={22} />
              <div>
                <div style={{ color: "#ffffff", fontWeight: 800, fontSize: 18 }}>{selectedEmployee.name}</div>
                <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2, fontFamily: "monospace" }}>NIP. {selectedEmployee.nip}</div>
                <div style={{ marginTop: 8 }}>
                  <Tag color="red" style={{ borderRadius: 6, fontWeight: 700, padding: "2px 10px" }}>
                    Total {selectedEmployee.total_points} Poin Pelanggaran
                  </Tag>
                </div>
              </div>
            </div>

            {/* Violation list */}
            <div style={{ padding: "24px 28px 28px", background: "#ffffff" }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: "#1e293b" }}>Rincian Kejadian Pelanggaran:</div>
              {employeeViolations.length === 0 ? (
                <Empty description="Tidak ada rincian kejadian." />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 300, overflowY: "auto", paddingRight: 4 }}>
                  {employeeViolations.map((v, i) => (
                    <div key={i} style={{ background: "#f8fafc", borderRadius: 12, padding: "12px 16px", border: "1px solid #cbd5e1", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#475569", fontWeight: 700, fontSize: 13 }}>
                        <CalendarOutlined style={{ color: "#ea580c" }} />
                        {dayjs(v.date).format("DD MMM YYYY")}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "flex-end" }}>
                        {v.violation_details.split(", ").map((d, idx) => (
                          <span key={idx}>{getViolationTag(d)}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Button block type="primary" size="large" onClick={() => setIsModalVisible(false)} style={{ marginTop: 20, borderRadius: 10, fontWeight: 700, height: 42 }}>
                Selesai
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Floating Info Button ── */}
      <div
        onClick={() => setShowInfoModal(true)}
        title="Cara Penilaian"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 1000,
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(15, 23, 42, 0.25)",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1) translateY(-2px)"}
        onMouseLeave={e => e.currentTarget.style.transform = "scale(1) translateY(0)"}
      >
        <InfoCircleOutlined style={{ color: "#ffffff", fontSize: 20 }} />
      </div>

      {/* ── Info / Scoring Modal ── */}
      <Modal
        title={null}
        open={showInfoModal}
        onCancel={() => setShowInfoModal(false)}
        footer={null}
        width={540}
        styles={{ content: { borderRadius: 24, overflow: "hidden", padding: 0 }, body: { padding: 0 } }}
        centered
      >
        {/* Modal Header */}
        <div style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", padding: "24px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", alignSelf: "center" }}>
              <TrophyOutlined style={{ color: "#ffffff", fontSize: 22 }} />
            </div>
            <div>
              <div style={{ color: "#ffffff", fontWeight: 800, fontSize: 16 }}>Metode Penilaian RISPEG</div>
              <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>Panduan Akumulasi Poin Disiplin Pegawai</div>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "24px 28px 28px", background: "#ffffff" }}>
          <div style={{ background: "#f8fafc", borderRadius: 12, padding: "14px 16px", marginBottom: 18, borderLeft: "4px solid #475569" }}>
            <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 13, marginBottom: 4 }}>📋 Mekanisme Penilaian</div>
            <div style={{ color: "#475569", fontSize: 12.5, lineHeight: 1.6 }}>
              Sistem akan menghitung pelanggaran kehadiran harian secara otomatis. Poin pelanggaran bersifat kumulatif dalam bulan yang aktif. Semakin banyak temuan ketidakdisiplinan, total poin akan bertambah.
            </div>
          </div>

          <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 13, marginBottom: 8 }}>
            Daftar Pembobotan Poin Pelanggaran:
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {[
              { label: "Terlambat Masuk",     color: "#ea580c", bg: "#fff7ed", poin: 1, desc: "Datang melewati batas toleransi jam kerja" },
              { label: "Pulang Cepat",        color: "#0d9488", bg: "#f0fdfa", poin: 1, desc: "Meninggalkan kantor sebelum jam operasional selesai" },
              { label: "Tidak Berseragam",    color: "#2563eb", bg: "#eff6ff", poin: 1, desc: "Tidak mengenakan pakaian dinas sesuai ketentuan hari" },
              { label: "terlambat Absen Apel pagi", color: "#7c3aed", bg: "#f5f3ff", poin: 1, desc: "Terlambat melakukan absensi pada sesi apel pagi" },
              { label: "Lupa Absen Masuk",    color: "#0891b2", bg: "#ecfeff", poin: 1, desc: "Tidak merekam kehadiran saat masuk kerja" },
              { label: "Lupa Absen Pulang",   color: "#db2777", bg: "#fdf2f8", poin: 1, desc: "Tidak merekam kehadiran saat pulang kerja" },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 12, background: item.bg, borderRadius: 12, padding: "10px 14px", border: `1px solid ${item.color}20` }}>
                <div>
                  <Tag style={{ color: item.color, background: "transparent", border: `1px solid ${item.color}`, borderRadius: 6, fontWeight: 700, fontSize: 11, margin: 0 }}>
                    +{item.poin} Poin
                  </Tag>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: item.color, fontSize: 12.5 }}>{item.label}</div>
                  <div style={{ color: "#64748b", fontSize: 11, marginTop: 1 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <Button
            block
            type="primary"
            size="large"
            onClick={() => setShowInfoModal(false)}
            style={{ borderRadius: 10, height: 42, fontWeight: 700, background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", border: "none" }}
          >
            Mengerti
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default PengumumanRispeg;
