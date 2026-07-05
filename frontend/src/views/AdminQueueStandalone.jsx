import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../hooks/useAuth.js";
import {
  DesktopOutlined, PlusOutlined, DeleteOutlined, UploadOutlined,
  UserOutlined, SoundOutlined, ReloadOutlined, PoweroffOutlined,
  CaretRightOutlined, ExportOutlined, DashboardOutlined,
  UnorderedListOutlined, SettingOutlined, ArrowLeftOutlined,
  TeamOutlined, ClockCircleOutlined, CheckCircleOutlined,
  HistoryOutlined, MenuOutlined, PhoneOutlined
} from "@ant-design/icons";
import "./AdminQueueStandalone.css";

const COUNTER_CODES = ["A", "B"];

function AdminQueueStandalone() {
  const { apiFetch } = useAuth();
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [counters, setCounters] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tickers, setTickers] = useState([""]);
  const [toast, setToast] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [onlineVisitors, setOnlineVisitors] = useState([]);
  const [manualNumbers, setManualNumbers] = useState({ A: "", B: "" });
  const [selectedEmployees, setSelectedEmployees] = useState({ A: "", B: "" });
  const [slides, setSlides] = useState([]);
  const [slideSaving, setSlideSaving] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const slideUploadRef = useRef(null);
  const photoUploadRefs = { A: useRef(null), B: useRef(null) };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/queue-display/admin");
      if (!res.ok) throw new Error("Gagal memuat data.");
      const data = await res.json();
      const ctrs = data.counters || [];
      setCounters(ctrs);
      setEmployees(data.employees || []);
      const ctrA = ctrs.find((c) => c.counter_code === "A");
      setTickers(Array.isArray(ctrA?.ticker_text) ? ctrA.ticker_text : (ctrA?.ticker_text ? [ctrA.ticker_text] : [""]));
      setSlides(ctrA?.slideshow || []);
      const empMap = {};
      ctrs.forEach((c) => { empMap[c.counter_code] = c.employee_id || ""; });
      setSelectedEmployees(empMap);
      try {
        const vRes = await apiFetch("/visitor-queues");
        if (vRes.ok) {
          const vData = await vRes.json();
          setOnlineVisitors(vData.visitors || []);
        }
      } catch (err) { console.error(err); }
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  // Silent background poll — updates visitors & counters without loading state
  const silentPoll = useCallback(async () => {
    try {
      const [adminRes, visitorRes] = await Promise.all([
        apiFetch("/queue-display/admin"),
        apiFetch("/visitor-queues"),
      ]);
      if (adminRes.ok) {
        const data = await adminRes.json();
        setCounters(data.counters || []);
        setEmployees(data.employees || []);
      }
      if (visitorRes.ok) {
        const vData = await visitorRes.json();
        setOnlineVisitors(vData.visitors || []);
      }
    } catch (_) { /* silent fail */ }
  }, [apiFetch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 5 seconds (silent, no loading indicator)
  useEffect(() => {
    const interval = setInterval(silentPoll, 5000);
    return () => clearInterval(interval);
  }, [silentPoll]);

  const doAction = async (endpoint, method = "PUT", body = null) => {
    setActionLoading(true);
    try {
      const opts = { method };
      if (body) opts.body = JSON.stringify(body);
      const res = await apiFetch(endpoint, opts);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Gagal.");
      showToast(data.message || "Berhasil!");
      await fetchData();
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCallNext = (code) => doAction("/queue-display/call-next", "PUT", { counter_code: code });
  const handleRecall = (code) => doAction("/queue-display/recall", "PUT", { counter_code: code });
  const handleRecallAll = () => doAction("/queue-display/recall-all", "PUT");
  const handleSetNumber = (code) => {
    const num = parseInt(manualNumbers[code], 10);
    if (isNaN(num) || num < 0) { showToast("Masukkan angka valid.", "error"); return; }
    doAction("/queue-display/set-number", "PUT", { counter_code: code, number: num });
    setManualNumbers((prev) => ({ ...prev, [code]: "" }));
  };
  const handleToggleStatus = (code) => doAction("/queue-display/toggle-status", "PUT", { counter_code: code });
  const handleResetQueue = (code) => {
    if (!window.confirm(`Reset antrian ${code} ke 0?`)) return;
    doAction("/queue-display/reset", "PUT", { counter_code: code });
  };
  const handleSetOfficer = (code) => {
    if (!selectedEmployees[code]) { showToast("Pilih pegawai.", "error"); return; }
    doAction("/queue-display/set-officer", "PUT", { counter_code: code, employee_id: parseInt(selectedEmployees[code], 10) });
  };
  const handleUpdateTicker = () => doAction("/queue-display/update-ticker", "PUT", { ticker_text: tickers.filter(t => t.trim() !== "") });
  const handleAddTicker = () => setTickers(prev => [...prev, ""]);
  const handleRemoveTicker = (idx) => setTickers(prev => prev.filter((_, i) => i !== idx));
  const handleTickerChange = (idx, val) => setTickers(prev => prev.map((t, i) => i === idx ? val : t));
  const handleCallOnlineVisitor = (id) => doAction(`/visitor-queues/${id}/call`, "PUT");

  const handlePhotoUpload = async (code, e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedEmployees[code]) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("employee_id", selectedEmployees[code]);
    setActionLoading(true);
    try {
      const res = await apiFetch("/queue-display/upload-photo", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload gagal.");
      showToast("Foto berhasil diupload!");
      await fetchData();
    } catch (e) { showToast(e.message, "error"); }
    finally { setActionLoading(false); if (photoUploadRefs[code]?.current) photoUploadRefs[code].current.value = ""; }
  };

  const handleSlideUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setActionLoading(true);
    try {
      const res = await apiFetch("/queue-display/upload-slide", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error("Upload gagal.");
      setSlides((prev) => [...prev, { image: data.path || data.url, title: "", duration: 8 }]);
      showToast("Slide ditambahkan!");
    } catch (e) { showToast(e.message, "error"); }
    finally { setActionLoading(false); if (slideUploadRef.current) slideUploadRef.current.value = ""; }
  };

  const handleRemoveSlide = (idx) => setSlides(prev => prev.filter((_, i) => i !== idx));
  const handleSlideTitle = (idx, title) => setSlides(prev => prev.map((s, i) => i === idx ? { ...s, title } : s));
  const handleSaveSlideshow = async () => {
    setSlideSaving(true);
    try {
      const res = await apiFetch("/queue-display/update-slideshow", { method: "PUT", body: JSON.stringify({ slideshow: slides }) });
      if (!res.ok) throw new Error("Gagal menyimpan.");
      showToast("Slideshow disimpan!");
    } catch (e) { showToast(e.message, "error"); }
    finally { setSlideSaving(false); }
  };

  const getCounter = (code) => counters.find((c) => c.counter_code === code) || {};
  const getEmployee = (code) => employees.find((e) => String(e.id) === String(getCounter(code).employee_id));
  const tvUrl = `${window.location.origin}/antrian-display`;
  const regUrl = `${window.location.origin}/daftar-antrian`;

  const waitingCount = onlineVisitors.filter(v => v.status === "waiting").length;
  const calledCount = onlineVisitors.filter(v => v.status === "called").length;

  const MENU = [
    { key: "dashboard", label: "Dashboard", icon: <DashboardOutlined />, group: "Utama" },
    { key: "queue-list", label: "Daftar Antrian Tamu", icon: <UnorderedListOutlined />, group: "Manajemen Antrian" },
    { key: "queue-numbers", label: "Manajemen UPP", icon: <DesktopOutlined />, group: "Manajemen Antrian" },
    { key: "service-history", label: "Riwayat Layanan", icon: <HistoryOutlined />, group: "Informasi" },
    { key: "ticker", label: "Running Text", icon: <SoundOutlined />, group: "Manajemen Display" },
    { key: "slideshow", label: "Slideshow TV", icon: <DesktopOutlined />, group: "Manajemen Display" },
  ];

  const PAGE_TITLES = {
    dashboard: { title: "Dashboard", desc: "Ringkasan antrian dan riwayat pelayanan" },
    "queue-list": { title: "Daftar Antrian Tamu", desc: "Kelola antrian pengunjung yang mendaftar online" },
    "queue-numbers": { title: "Manajemen UPP", desc: "Kontrol nomor antrian dan petugas per loket" },
    "service-history": { title: "Riwayat Layanan", desc: "Riwayat pelayanan pengunjung di setiap loket" },
    ticker: { title: "Running Text", desc: "Kelola teks berjalan di TV display lobby" },
    slideshow: { title: "Slideshow TV", desc: "Kelola gambar slideshow untuk TV display lobby" },
  };

  const currentPage = PAGE_TITLES[activeMenu] || PAGE_TITLES.dashboard;

  const handleServeOnlineVisitor = async (id) => {
    setActionLoading(true);
    try {
      const res = await apiFetch(`/visitor-queues/${id}/serve`, { method: "PUT" });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message || "Antrian diselesaikan.", "success");
        await fetchData();
      } else {
        showToast("Gagal menyelesaikan antrian.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Terjadi kesalahan jaringan.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Group menu items
  const menuGroups = {};
  MENU.forEach(m => {
    if (!menuGroups[m.group]) menuGroups[m.group] = [];
    menuGroups[m.group].push(m);
  });

  return (
    <div className="sqm-layout">
      {/* Sidebar */}
      <aside className={`sqm-sidebar ${!sidebarVisible ? "hidden" : ""}`}>
        <div className="sqm-sidebar-logo">
          <img src="/logo/logo.png" alt="Logo" />
          <h3>Manajemen UPP<span>Balai POM di Palopo</span></h3>
        </div>
        <nav className="sqm-sidebar-nav">
          {Object.entries(menuGroups).map(([group, items]) => (
            <div key={group}>
              <div className="sqm-nav-group-title">{group}</div>
              {items.map(item => (
                <button key={item.key} className={`sqm-nav-item ${activeMenu === item.key ? "active" : ""}`} onClick={() => setActiveMenu(item.key)}>
                  <span className="sqm-nav-icon">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sqm-sidebar-footer">
          <button className="sqm-back-btn" onClick={() => window.location.href = "/app/dashboard"}>
            <ArrowLeftOutlined /> Kembali ke SIPTU
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className={`sqm-main ${!sidebarVisible ? "expanded" : ""}`}>
        <div className="sqm-header">
          <div className="sqm-header-title" style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button className="sqm-btn" style={{ padding: "0 8px" }} onClick={() => setSidebarVisible(!sidebarVisible)}>
              <MenuOutlined />
            </button>
            <div>
              <h2>{currentPage.title}</h2>
              <p>{currentPage.desc}</p>
            </div>
          </div>
          <div className="sqm-header-actions">
            <button className="sqm-btn primary" onClick={handleRecallAll} disabled={actionLoading}><SoundOutlined /> Panggil Semua Ulang</button>
            <button className="sqm-btn" onClick={() => window.open(tvUrl, "_blank")}><ExportOutlined /> Buka TV Display</button>
          </div>
        </div>

        <div className="sqm-content">
          {loading ? (
            <div className="sqm-empty">Memuat data...</div>
          ) : (
            <>
              {activeMenu === "dashboard" && <DashboardSection visitors={onlineVisitors} counters={counters} waitingCount={waitingCount} calledCount={calledCount} tvUrl={tvUrl} regUrl={regUrl} />}
              {activeMenu === "queue-list" && <QueueListSection visitors={onlineVisitors} actionLoading={actionLoading} onCall={handleCallOnlineVisitor} onServe={handleServeOnlineVisitor} />}
              {activeMenu === "queue-numbers" && <QueueNumbersSection counters={counters} employees={employees} getCounter={getCounter} getEmployee={getEmployee} manualNumbers={manualNumbers} setManualNumbers={setManualNumbers} selectedEmployees={selectedEmployees} setSelectedEmployees={setSelectedEmployees} actionLoading={actionLoading} onCallNext={handleCallNext} onRecall={handleRecall} onReset={handleResetQueue} onSetNumber={handleSetNumber} onToggle={handleToggleStatus} onSetOfficer={handleSetOfficer} onPhotoUpload={handlePhotoUpload} photoUploadRefs={photoUploadRefs} />}
              {activeMenu === "service-history" && <ServiceHistorySection apiFetch={apiFetch} employees={employees} getEmployee={getEmployee} />}
              {activeMenu === "ticker" && <TickerSection tickers={tickers} onAdd={handleAddTicker} onRemove={handleRemoveTicker} onChange={handleTickerChange} onSave={handleUpdateTicker} actionLoading={actionLoading} />}
              {activeMenu === "slideshow" && <SlideshowSection slides={slides} onRemove={handleRemoveSlide} onTitle={handleSlideTitle} onUpload={handleSlideUpload} onSave={handleSaveSlideshow} uploadRef={slideUploadRef} actionLoading={actionLoading} slideSaving={slideSaving} />}
            </>
          )}
        </div>
      </main>

      {toast && <div className={`sqm-toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}

/* ═══ Dashboard Section ═══ */
function DashboardSection({ visitors, counters, waitingCount, calledCount, tvUrl, regUrl }) {
  return (
    <>
      <div className="sqm-stats-grid">
        <div className="sqm-stat-card">
          <div className="sqm-stat-card-label">Total Pendaftar Hari Ini</div>
          <div className="sqm-stat-card-value">{visitors.length}</div>
        </div>
        <div className="sqm-stat-card">
          <div className="sqm-stat-card-label">Menunggu</div>
          <div className="sqm-stat-card-value" style={{ color: "#d46b08" }}>{waitingCount}</div>
        </div>
        <div className="sqm-stat-card">
          <div className="sqm-stat-card-label">Sudah Dipanggil</div>
          <div className="sqm-stat-card-value" style={{ color: "#389e0d" }}>{calledCount}</div>
        </div>
        <div className="sqm-stat-card">
          <div className="sqm-stat-card-label">Loket Aktif</div>
          <div className="sqm-stat-card-value" style={{ color: "#1677ff" }}>{counters.filter(c => c.status === "active").length} / {counters.length}</div>
        </div>
      </div>

      <div className="sqm-panel">
        <div className="sqm-panel-header"><h3>Riwayat Kunjungan Hari Ini</h3></div>
        <div className="sqm-panel-body" style={{ padding: 0 }}>
          <table className="sqm-table">
            <thead>
              <tr>
                <th>Antrian</th>
                <th>Pengunjung</th>
                <th>Maksud Kunjungan</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visitors.length > 0 ? visitors.map(v => (
                <tr key={v.id}>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ 
                        fontWeight: 700, 
                        color: v.counter_code === "A" ? "#1677ff" : "#52c41a",
                        background: v.counter_code === "A" ? "#e6f4ff" : "#f6ffed",
                        padding: "4px 8px",
                        borderRadius: "6px",
                        display: "inline-block",
                        width: "max-content"
                      }}>
                        {v.counter_code}-{String(v.queue_number).padStart(3, "0")}
                      </span>
                      <span style={{ fontSize: 12, color: "rgba(0,0,0,0.45)" }}>
                        {new Date(v.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: "rgba(0,0,0,0.88)", marginBottom: 4 }}>{v.visitor_name}</div>
                    <div style={{ display: "flex", gap: 12, fontSize: 12, color: "rgba(0,0,0,0.45)" }}>
                      {v.institution_name && <span><UserOutlined /> {v.institution_name}</span>}
                      {v.phone && <span><PhoneOutlined /> {v.phone}</span>}
                    </div>
                  </td>
                  <td>
                    {v.purpose_of_visit ? (
                      <span style={{ fontSize: 13, color: "#1677ff", background: "#f0f5ff", padding: "2px 8px", borderRadius: "12px" }}>
                        {v.purpose_of_visit}
                      </span>
                    ) : "-"}
                  </td>
                  <td><span className={`sqm-tag ${v.status}`}>{v.status === "called" ? "Dipanggil" : v.status === "served" ? "Selesai Dilayani" : v.status === "skipped" ? "Dilewati" : "Menunggu"}</span></td>
                </tr>
              )) : (
                <tr><td colSpan="4" className="sqm-empty">Belum ada pendaftaran hari ini.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="sqm-links-grid">
        <div className="sqm-link-card">
          <div className="sqm-link-card-icon" style={{ background: "#e6f4ff", color: "#1677ff" }}>📺</div>
          <div className="sqm-link-card-info">
            <h4>TV Display Lobby</h4>
            <code>{tvUrl}</code>
            <button className="sqm-btn sm primary" onClick={() => window.open(tvUrl, "_blank")}><ExportOutlined /> Buka</button>
          </div>
        </div>
        <div className="sqm-link-card">
          <div className="sqm-link-card-icon" style={{ background: "#f6ffed", color: "#52c41a" }}>📋</div>
          <div className="sqm-link-card-info">
            <h4>Form Pendaftaran Online</h4>
            <code>{regUrl}</code>
            <button className="sqm-btn sm" onClick={() => { navigator.clipboard.writeText(regUrl); }}><ExportOutlined /> Salin Link</button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══ Queue List Section ═══ */
function QueueListSection({ visitors, actionLoading, onCall, onServe }) {
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCounter, setFilterCounter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  let filtered = visitors;
  if (filterStatus !== "all") filtered = filtered.filter(v => v.status === filterStatus);
  if (filterCounter !== "all") filtered = filtered.filter(v => v.counter_code === filterCounter);

  if (sortBy === "newest") filtered = [...filtered].sort((a, b) => b.id - a.id);
  else if (sortBy === "oldest") filtered = [...filtered].sort((a, b) => a.id - b.id);
  else if (sortBy === "number") filtered = [...filtered].sort((a, b) => a.queue_number - b.queue_number);

  const statusLabel = (s) => s === "called" ? "Dipanggil" : s === "served" ? "Selesai Dilayani" : s === "skipped" ? "Dilewati" : "Menunggu";

  return (
    <div className="sqm-panel">
      <div className="sqm-panel-header">
        <h3>Daftar Antrian Online — Hari Ini</h3>
        <span style={{ color: "rgba(0,0,0,0.45)", fontSize: 13 }}>{visitors.length} pendaftar</span>
      </div>
      <div className="sqm-panel-body">
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <select className="sqm-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: "auto" }}>
            <option value="all">Semua Status</option>
            <option value="waiting">Menunggu</option>
            <option value="called">Dipanggil</option>
            <option value="served">Selesai Dilayani</option>
          </select>
          <select className="sqm-select" value={filterCounter} onChange={e => setFilterCounter(e.target.value)} style={{ width: "auto" }}>
            <option value="all">Semua Loket</option>
            <option value="A">Loket A</option>
            <option value="B">Loket B</option>
          </select>
            <select className="sqm-select" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: "auto" }}>
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
              <option value="number">No. Antrian</option>
            </select>
          </div>
        </div>
        <div style={{ padding: 0 }}>
          <table className="sqm-table">
            <thead>
              <tr>
                <th>Antrian</th>
                <th>Pengunjung</th>
                <th>Maksud Kunjungan</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map(v => (
                <tr key={v.id}>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ 
                        fontWeight: 700, 
                        color: v.counter_code === "A" ? "#1677ff" : "#52c41a",
                        background: v.counter_code === "A" ? "#e6f4ff" : "#f6ffed",
                        padding: "4px 8px",
                        borderRadius: "6px",
                        display: "inline-block",
                        width: "max-content"
                      }}>
                        {v.counter_code}-{String(v.queue_number).padStart(3, "0")}
                      </span>
                      <span style={{ fontSize: 12, color: "rgba(0,0,0,0.45)" }}>
                        {new Date(v.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: "rgba(0,0,0,0.88)", marginBottom: 4 }}>{v.visitor_name}</div>
                    <div style={{ display: "flex", gap: 12, fontSize: 12, color: "rgba(0,0,0,0.45)" }}>
                      {v.institution_name && <span><UserOutlined /> {v.institution_name}</span>}
                      {v.phone && <span><PhoneOutlined /> {v.phone}</span>}
                    </div>
                  </td>
                  <td>
                    {v.purpose_of_visit ? (
                      <span style={{ fontSize: 13, color: "#1677ff", background: "#f0f5ff", padding: "2px 8px", borderRadius: "12px" }}>
                        {v.purpose_of_visit}
                      </span>
                    ) : "-"}
                  </td>
                  <td>
                    <span className={`sqm-tag ${v.status}`}>{statusLabel(v.status)}</span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                      {v.status === "waiting" && (
                        <button className="sqm-btn sm primary" onClick={() => onCall(v.id)} disabled={actionLoading}>
                          <SoundOutlined /> Panggil
                        </button>
                      )}
                      {(v.status === "waiting" || v.status === "called") && (
                        <button className="sqm-btn sm success" onClick={() => onServe(v.id)} disabled={actionLoading}>
                          <CheckCircleOutlined /> Selesai
                        </button>
                      )}
                      {(v.status === "served" || v.status === "skipped") && (
                        <span style={{ fontSize: 13, color: "rgba(0,0,0,0.25)" }}>{statusLabel(v.status)}</span>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="5" className="sqm-empty">Belum ada antrian yang sesuai filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
    </div>
  );
}

/* ═══ Searchable Employee Select ═══ */
function SearchableEmployeeSelect({ employees, value, onChange }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.position || "").toLowerCase().includes(search.toLowerCase())
  );

  const selected = employees.find(e => String(e.id) === String(value));

  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={wrapRef} style={{ position: "relative", flex: 1 }}>
      <input
        className="sqm-input"
        style={{ width: "100%" }}
        placeholder={selected ? selected.name : "Cari nama pegawai..."}
        value={open ? search : (selected ? selected.name : "")}
        onFocus={() => { setOpen(true); setSearch(""); }}
        onChange={(e) => setSearch(e.target.value)}
      />
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
          background: "#fff", border: "1px solid #d9d9d9", borderRadius: 6,
          maxHeight: 200, overflowY: "auto", marginTop: 4,
          boxShadow: "0 6px 16px rgba(0,0,0,0.08)"
        }}>
          {filtered.length > 0 ? filtered.map(emp => (
            <div key={emp.id}
              onClick={() => { onChange(String(emp.id)); setOpen(false); setSearch(""); }}
              style={{
                padding: "8px 12px", cursor: "pointer", fontSize: 13,
                background: String(emp.id) === String(value) ? "#e6f4ff" : "transparent",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#f5f5f5"}
              onMouseLeave={(e) => e.currentTarget.style.background = String(emp.id) === String(value) ? "#e6f4ff" : "transparent"}
            >
              <div style={{ fontWeight: 500 }}>{emp.name}</div>
              {emp.position && <div style={{ fontSize: 11, color: "rgba(0,0,0,0.45)" }}>{emp.position}</div>}
            </div>
          )) : (
            <div style={{ padding: "12px", textAlign: "center", color: "rgba(0,0,0,0.25)", fontSize: 13 }}>Tidak ditemukan</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══ Queue Numbers Section ═══ */
function QueueNumbersSection({ counters, employees, getCounter, getEmployee, manualNumbers, setManualNumbers, selectedEmployees, setSelectedEmployees, actionLoading, onCallNext, onRecall, onReset, onSetNumber, onToggle, onSetOfficer, onPhotoUpload, photoUploadRefs }) {
  return (
    <>
      <div className="sqm-counters-row">
        {COUNTER_CODES.map(code => {
          const ctr = getCounter(code);
          const emp = getEmployee(code);
          const isActive = ctr.status === "active";
          const color = code === "A" ? "#1677ff" : "#52c41a";
          return (
            <div key={code} className="sqm-counter-card">
              <div className="sqm-counter-badge" style={{ background: color }}>{code}</div>
              <div className="sqm-counter-label">Loket {code}</div>
              <div className="sqm-counter-number" style={{ color }}>{code}-{String(ctr.current_number || 0).padStart(3, "0")}</div>
              <div className="sqm-counter-label">Nomor Saat Ini</div>

              <div className="sqm-counter-actions">
                <button className="sqm-btn primary" onClick={() => onCallNext(code)} disabled={actionLoading}><CaretRightOutlined /> Berikutnya</button>
                <button className="sqm-btn" onClick={() => onRecall(code)} disabled={actionLoading}><SoundOutlined /></button>
                <button className="sqm-btn danger" onClick={() => onReset(code)} disabled={actionLoading}><ReloadOutlined /> Reset</button>
              </div>

              <div className="sqm-counter-manual">
                <input className="sqm-input" type="number" min="0" placeholder="No. manual" value={manualNumbers[code]} onChange={(e) => setManualNumbers(prev => ({ ...prev, [code]: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && onSetNumber(code)} />
                <button className="sqm-btn" onClick={() => onSetNumber(code)} disabled={actionLoading}>Set</button>
              </div>

              <div className="sqm-counter-status">
                <span className={`sqm-dot ${isActive ? "green" : "red"}`} />
                <span style={{ fontSize: 14 }}>{isActive ? "Buka" : "Tutup"}</span>
                <button className={`sqm-btn ${isActive ? "danger" : "success"} sm`} onClick={() => onToggle(code)} disabled={actionLoading}>
                  <PoweroffOutlined /> {isActive ? "Tutup" : "Buka"}
                </button>
              </div>

              <div className="sqm-counter-officer">
                {emp?.photo ? <img src={`/${emp.photo}`} alt="" /> : <div className="sqm-counter-officer-placeholder">{(emp?.name?.[0] || "?").toUpperCase()}</div>}
                <div className="sqm-counter-officer-info">
                  <h4>{emp?.name || "Belum dipilih"}</h4>
                  <span>{emp?.position || "Petugas UPP"}</span>
                </div>
              </div>
              <div className="sqm-officer-select-row">
                <SearchableEmployeeSelect
                  employees={employees}
                  value={selectedEmployees[code] || ""}
                  onChange={(val) => setSelectedEmployees(prev => ({ ...prev, [code]: val }))}
                />
                <button className="sqm-btn primary sm" onClick={() => onSetOfficer(code)} disabled={actionLoading || !selectedEmployees[code]}>Tetapkan</button>
                <input type="file" accept="image/*" ref={photoUploadRefs[code]} onChange={(e) => onPhotoUpload(code, e)} style={{ display: "none" }} />
                <button className="sqm-btn sm" onClick={() => photoUploadRefs[code]?.current?.click()} disabled={actionLoading}><UploadOutlined /></button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ═══ Service History Section ═══ */
function ServiceHistorySection({ apiFetch, employees, getEmployee }) {
  const [filterCounter, setFilterCounter] = useState("all");
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("history", "1");
      qs.set("page", page.toString());
      qs.set("per_page", pageSize.toString());
      if (filterCounter !== "all") qs.set("counter_code", filterCounter);

      const res = await apiFetch(`/visitor-queues?${qs.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryData(data.visitors || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, page, pageSize, filterCounter]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const getOfficerName = (code) => {
    const emp = getEmployee(code);
    return emp?.name || "—";
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="sqm-panel">
      <div className="sqm-panel-header">
        <h3>Riwayat Layanan</h3>
        <span style={{ color: "rgba(0,0,0,0.45)", fontSize: 13 }}>Total {total} dilayani</span>
      </div>
      <div className="sqm-panel-body">
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <select className="sqm-select" value={filterCounter} onChange={e => { setFilterCounter(e.target.value); setPage(1); }} style={{ width: "auto" }}>
            <option value="all">Semua Loket</option>
            <option value="A">Loket A</option>
            <option value="B">Loket B</option>
          </select>
          <select className="sqm-select" value={pageSize} onChange={e => { setPageSize(parseInt(e.target.value, 10)); setPage(1); }} style={{ width: "auto" }}>
            <option value={10}>10 Baris</option>
            <option value={25}>25 Baris</option>
            <option value={100}>100 Baris</option>
          </select>
          <button className="sqm-btn" onClick={() => fetchHistory()} disabled={loading}><ReloadOutlined /></button>
        </div>
      </div>
      <div style={{ padding: 0 }}>
        {loading ? (
          <div className="sqm-empty">Memuat data riwayat...</div>
        ) : (
          <>
            <table className="sqm-table">
              <thead>
                <tr>
                  <th>Loket</th>
                  <th>No. Antrian</th>
                  <th>Pengunjung</th>
                  <th>Instansi/Usaha</th>
                  <th>No. HP</th>
                  <th>Maksud Kunjungan</th>
                  <th>Petugas yang Melayani</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {historyData.length > 0 ? historyData.map(v => (
                  <tr key={v.id}>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ 
                          fontWeight: 700, 
                          color: v.counter_code === "A" ? "#1677ff" : "#52c41a",
                          background: v.counter_code === "A" ? "#e6f4ff" : "#f6ffed",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          display: "inline-block",
                          width: "max-content"
                        }}>
                          {v.counter_code}-{String(v.queue_number).padStart(3, "0")}
                        </span>
                        <span style={{ fontSize: 12, color: "rgba(0,0,0,0.45)" }}>
                          {new Date(v.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} • {new Date(v.updated_at || v.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "rgba(0,0,0,0.88)", marginBottom: 4 }}>{v.visitor_name}</div>
                      <div style={{ display: "flex", gap: 12, fontSize: 12, color: "rgba(0,0,0,0.45)" }}>
                        {v.institution_name && <span><UserOutlined /> {v.institution_name}</span>}
                        {v.phone && <span><PhoneOutlined /> {v.phone}</span>}
                      </div>
                    </td>
                    <td>
                      {v.purpose_of_visit ? (
                        <span style={{ fontSize: 13, color: "#1677ff", background: "#f0f5ff", padding: "2px 8px", borderRadius: "12px" }}>
                          {v.purpose_of_visit}
                        </span>
                      ) : "—"}
                    </td>
                    <td>{getOfficerName(v.counter_code)}</td>
                    <td><span className={`sqm-tag ${v.status}`}>{v.status === "served" ? "Selesai Dilayani" : v.status === "skipped" ? "Dilewati" : v.status === "called" ? "Dipanggil" : "Menunggu"}</span></td>
                  </tr>
                )) : (
                  <tr><td colSpan="5" className="sqm-empty">Belum ada riwayat layanan.</td></tr>
                )}
              </tbody>
            </table>
            
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderTop: "1px solid #f0f0f0" }}>
                <div style={{ fontSize: 13, color: "rgba(0,0,0,0.45)" }}>
                  Halaman {page} dari {totalPages}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="sqm-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Sebelumnya</button>
                  <button className="sqm-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Selanjutnya</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ═══ Ticker Section ═══ */
function TickerSection({ tickers, onAdd, onRemove, onChange, onSave, actionLoading }) {
  return (
    <div className="sqm-panel">
      <div className="sqm-panel-header"><h3>Running Text (Ticker)</h3></div>
      <div className="sqm-panel-body">
        {tickers.map((t, idx) => (
          <div key={idx} className="sqm-ticker-row">
            <input className="sqm-input" placeholder="Masukkan informasi ticker..." value={t} onChange={(e) => onChange(idx, e.target.value)} />
            <button className="sqm-btn danger sm" onClick={() => onRemove(idx)}><DeleteOutlined /></button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="sqm-btn" onClick={onAdd}><PlusOutlined /> Tambah Baris</button>
          <button className="sqm-btn primary" onClick={onSave} disabled={actionLoading}>Simpan Ticker</button>
        </div>
      </div>
    </div>
  );
}

/* ═══ Slideshow Section ═══ */
function SlideshowSection({ slides, onRemove, onTitle, onUpload, onSave, uploadRef, actionLoading, slideSaving }) {
  return (
    <div className="sqm-panel">
      <div className="sqm-panel-header"><h3>Slideshow TV Display</h3></div>
      <div className="sqm-panel-body">
        <div className="sqm-slide-list">
          {slides.map((slide, idx) => (
            <div key={idx} className="sqm-slide-row">
              <img src={slide.image?.startsWith("http") ? slide.image : `/${slide.image}`} alt="" className="sqm-slide-thumb" onError={(e) => { e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='50'%3E%3Crect width='80' height='50' fill='%23f0f0f0'/%3E%3C/svg%3E"; }} />
              <div className="sqm-slide-info">
                <input className="sqm-input" placeholder="Judul slide (opsional)" value={slide.title || ""} onChange={(e) => onTitle(idx, e.target.value)} />
                <div className="sqm-slide-meta">Slide {idx + 1} • {slide.duration || 8}s</div>
              </div>
              <button className="sqm-btn danger sm" onClick={() => onRemove(idx)}><DeleteOutlined /></button>
            </div>
          ))}
          {slides.length === 0 && <div className="sqm-empty">Belum ada slide.</div>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="file" accept="image/*,video/mp4" ref={uploadRef} onChange={onUpload} style={{ display: "none" }} />
          <button className="sqm-btn" onClick={() => uploadRef.current?.click()} disabled={actionLoading}><PlusOutlined /> Tambah Slide</button>
          <button className="sqm-btn primary" onClick={onSave} disabled={slideSaving}>{slideSaving ? "Menyimpan..." : "Simpan Slideshow"}</button>
        </div>
      </div>
    </div>
  );
}

export default AdminQueueStandalone;
