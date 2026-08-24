import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../hooks/useAuth.js";
import {
  DesktopOutlined,
  PlusOutlined,
  DeleteOutlined,
  UploadOutlined,
  UserOutlined,
  SoundOutlined,
  ReloadOutlined,
  PoweroffOutlined,
  CaretRightOutlined,
  ExportOutlined,
} from "@ant-design/icons";
import "./AdminQueueControl.css";

const COUNTER_CODES = ["A", "B"];

function AdminQueueControl() {
  const { apiFetch } = useAuth();

  const [counters, setCounters] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tickers, setTickers] = useState([""]);
  const [toast, setToast] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [onlineVisitors, setOnlineVisitors] = useState([]);

  // Per-counter state
  const [manualNumbers, setManualNumbers] = useState({ A: "", B: "" });
  const [selectedEmployees, setSelectedEmployees] = useState({ A: "", B: "" });

  // Slideshow state
  const [slides, setSlides] = useState([]);
  const [slideSaving, setSlideSaving] = useState(false);
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

      // Set ticker from counter A
      const ctrA = ctrs.find((c) => c.counter_code === "A");
      setTickers(Array.isArray(ctrA?.ticker_text) ? ctrA.ticker_text : (ctrA?.ticker_text ? [ctrA.ticker_text] : [""]));
      setSlides(ctrA?.slideshow || []);

      // Set selected employees
      const empMap = {};
      ctrs.forEach((c) => { empMap[c.counter_code] = c.employee_id || ""; });
      setSelectedEmployees(empMap);

      // Fetch online visitors
      try {
        const vRes = await apiFetch("/visitor-queues");
        if (vRes.ok) {
          const vData = await vRes.json();
          setOnlineVisitors(vData.visitors || []);
        }
      } catch (err) {
        console.error("Gagal memuat antrian online:", err);
      }
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => { fetchData(); }, [fetchData]);

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
    if (isNaN(num) || num < 0) { showToast("Masukkan angka yang valid.", "error"); return; }
    doAction("/queue-display/set-number", "PUT", { counter_code: code, number: num });
    setManualNumbers((prev) => ({ ...prev, [code]: "" }));
  };
  const handleToggleStatus = (code) => doAction("/queue-display/toggle-status", "PUT", { counter_code: code });
  const handleResetQueue = (code) => {
    if (!window.confirm(`Reset antrian ${code} ke 0?`)) return;
    doAction("/queue-display/reset", "PUT", { counter_code: code });
  };
  const handleSetOfficer = (code) => {
    if (!selectedEmployees[code]) { showToast("Pilih pegawai terlebih dahulu.", "error"); return; }
    doAction("/queue-display/set-officer", "PUT", { counter_code: code, employee_id: parseInt(selectedEmployees[code], 10) });
  };
  const handleUpdateTicker = () => {
    doAction("/queue-display/update-ticker", "PUT", { ticker_text: tickers.filter(t => t.trim() !== "") });
  };
  const handleAddTicker = () => setTickers(prev => [...prev, ""]);
  const handleRemoveTicker = (idx) => setTickers(prev => prev.filter((_, i) => i !== idx));
  const handleTickerChange = (idx, val) => setTickers(prev => prev.map((t, i) => i === idx ? val : t));

  const handleCallOnlineVisitor = (id) => {
    doAction(`/visitor-queues/${id}/call`, "PUT");
  };

  // Photo upload per counter
  const handlePhotoUpload = async (code, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!selectedEmployees[code]) { showToast("Pilih pegawai terlebih dahulu.", "error"); return; }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("employee_id", selectedEmployees[code]);

    setActionLoading(true);
    try {
      const res = await apiFetch("/queue-display/upload-photo", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Upload gagal.");
      showToast("Foto berhasil diupload!");
      await fetchData();
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setActionLoading(false);
      if (photoUploadRefs[code]?.current) photoUploadRefs[code].current.value = "";
    }
  };

  // Slideshow upload
  const handleSlideUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setActionLoading(true);
    try {
      const res = await apiFetch("/queue-display/upload-slide", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Upload gagal.");
      setSlides((prev) => [...prev, { image: data.path || data.url, title: "", duration: 8 }]);
      showToast("Slide berhasil ditambahkan!");
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setActionLoading(false);
      if (slideUploadRef.current) slideUploadRef.current.value = "";
    }
  };

  const handleRemoveSlide = (idx) => setSlides((prev) => prev.filter((_, i) => i !== idx));
  const handleSlideTitle = (idx, title) => setSlides((prev) => prev.map((s, i) => i === idx ? { ...s, title } : s));
  const handleSaveSlideshow = async () => {
    setSlideSaving(true);
    try {
      const res = await apiFetch("/queue-display/update-slideshow", { method: "PUT", body: JSON.stringify({ slideshow: slides }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Gagal menyimpan.");
      showToast("Slideshow disimpan!");
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setSlideSaving(false);
    }
  };

  const getCounter = (code) => counters.find((c) => c.counter_code === code) || {};
  const getEmployee = (code) => employees.find((e) => String(e.id) === String(getCounter(code).employee_id));
  const tvUrl = `${window.location.origin}/antrian-display`;

  if (loading) {
    return (
      <div className="aqc-page module-section">
        <div className="aqc-header">
          <h2><span className="aqc-header-icon"><DesktopOutlined /></span> Kontrol Antrian ULPK</h2>
        </div>
        <div style={{ textAlign: "center", padding: "60px", color: "#94a3b8" }}>Memuat data...</div>
      </div>
    );
  }

  return (
    <div className="aqc-page module-section">
      <div className="aqc-header">
        <div style={{ flex: 1 }}>
          <h2><span className="aqc-header-icon"><DesktopOutlined /></span> Kontrol Antrian ULPK</h2>
          <p>Kelola 2 loket antrian (A &amp; B), petugas, slideshow, dan running text untuk TV lobby.</p>
        </div>
        <button className="aqc-btn aqc-btn-primary" onClick={handleRecallAll} disabled={actionLoading} style={{ flex: "initial", padding: "10px 20px" }}>
          <SoundOutlined /> Panggil Semua Ulang
        </button>
      </div>

      <div className="aqc-grid">
        {/* ── Counter Cards (A & B) ── */}
        {COUNTER_CODES.map((code) => {
          const ctr = getCounter(code);
          const emp = getEmployee(code);
          const isActive = ctr.status === "active";
          const accentColor = code === "A" ? "#2563eb" : "#059669";
          const accentGrad = code === "A" ? "linear-gradient(135deg, #3b82f6, #2563eb)" : "linear-gradient(135deg, #10b981, #059669)";

          return (
            <div key={code} className="aqc-card">
              <div className="aqc-card-title">
                <span className="icon" style={{ background: accentGrad }}>{code}</span>
                Loket {code}
              </div>

              {/* Number */}
              <div className="aqc-number-display">
                <div className="aqc-current-number" style={{ color: accentColor }}>
                  {code}-{String(ctr.current_number || 0).padStart(3, "0")}
                </div>
                <div className="aqc-number-label">Nomor Saat Ini</div>
              </div>

              <div className="aqc-number-actions">
                <button className="aqc-btn aqc-btn-primary" style={{ background: accentGrad }} onClick={() => handleCallNext(code)} disabled={actionLoading}>
                  <CaretRightOutlined /> Berikutnya
                </button>
                <button className="aqc-btn aqc-btn-ghost" onClick={() => handleRecall(code)} disabled={actionLoading} style={{ flex: "initial", padding: "10px 14px" }} title="Panggil Ulang">
                  <SoundOutlined />
                </button>
                <button className="aqc-btn aqc-btn-danger" onClick={() => handleResetQueue(code)} disabled={actionLoading}>
                  <ReloadOutlined /> Reset
                </button>
              </div>

              <div className="aqc-manual-input">
                <input type="number" min="0" placeholder="No. manual..." value={manualNumbers[code]} onChange={(e) => setManualNumbers((prev) => ({ ...prev, [code]: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && handleSetNumber(code)} />
                <button className="aqc-btn aqc-btn-ghost" onClick={() => handleSetNumber(code)} disabled={actionLoading} style={{ flex: "initial", padding: "10px 16px" }}>Set</button>
              </div>

              {/* Status */}
              <div className="aqc-status-row">
                <div className="aqc-status-info">
                  <span className={`aqc-status-dot ${isActive ? "active" : "closed"}`} />
                  <span className="aqc-status-text">{isActive ? "Buka" : "Tutup"}</span>
                </div>
                <button className={`aqc-btn ${isActive ? "aqc-btn-danger" : "aqc-btn-success"}`} onClick={() => handleToggleStatus(code)} disabled={actionLoading} style={{ flex: "initial", padding: "8px 16px", fontSize: "13px" }}>
                  <PoweroffOutlined /> {isActive ? "Tutup" : "Buka"}
                </button>
              </div>

              {/* Officer */}
              <div style={{ marginTop: "16px" }}>
                <div style={{ fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  <UserOutlined style={{ marginRight: "6px" }} />Petugas Loket {code}
                </div>

                {emp ? (
                  <div className="aqc-officer-current">
                    {emp.photo ? (
                      <img src={`/${emp.photo}`} alt={emp.name} className="aqc-officer-thumb" />
                    ) : (
                      <div className="aqc-officer-thumb-placeholder" style={{ background: code === "A" ? "linear-gradient(135deg, #dbeafe, #e0e7ff)" : "linear-gradient(135deg, #d1fae5, #a7f3d0)", color: accentColor }}>
                        {(emp.name?.[0] || "?").toUpperCase()}
                      </div>
                    )}
                    <div className="aqc-officer-detail">
                      <h4>{emp.name}</h4>
                      <span>{emp.position || "Petugas ULPK"}</span>
                    </div>
                  </div>
                ) : (
                  <div className="aqc-officer-current">
                    <div className="aqc-officer-thumb-placeholder">?</div>
                    <div className="aqc-officer-detail">
                      <h4 style={{ color: "#94a3b8" }}>Belum dipilih</h4>
                    </div>
                  </div>
                )}

                <select className="aqc-select" value={selectedEmployees[code] || ""} onChange={(e) => setSelectedEmployees((prev) => ({ ...prev, [code]: e.target.value }))}>
                  <option value="">— Pilih Pegawai —</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name}{emp.position ? ` — ${emp.position}` : ""}</option>
                  ))}
                </select>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button className="aqc-btn aqc-btn-success" onClick={() => handleSetOfficer(code)} disabled={actionLoading || !selectedEmployees[code]} style={{ flex: 1 }}>
                    Tetapkan
                  </button>
                  <div style={{ flex: "initial" }}>
                    <input type="file" accept="image/*" ref={photoUploadRefs[code]} onChange={(e) => handlePhotoUpload(code, e)} style={{ display: "none" }} />
                    <button className="aqc-btn aqc-btn-ghost" onClick={() => photoUploadRefs[code]?.current?.click()} disabled={actionLoading} style={{ padding: "10px 14px" }}>
                      <UploadOutlined /> Foto
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* ── Running Text ── */}
        <div className="aqc-card">
          <div className="aqc-card-title">
            <span className="icon" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>📢</span>
            Running Text (Ticker)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
            {tickers.map((t, idx) => (
              <div key={idx} style={{ display: "flex", gap: "8px" }}>
                <input 
                  className="aqc-ticker-input" 
                  placeholder="Masukkan informasi ticker..." 
                  value={t} 
                  onChange={(e) => handleTickerChange(idx, e.target.value)} 
                  style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}
                />
                <button className="aqc-btn aqc-btn-danger" onClick={() => handleRemoveTicker(idx)} disabled={actionLoading} style={{ flex: "initial", padding: "10px" }}><DeleteOutlined /></button>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="aqc-btn aqc-btn-ghost" onClick={handleAddTicker} disabled={actionLoading} style={{ flex: 1 }}><PlusOutlined /> Tambah Baris</button>
            <button className="aqc-btn aqc-btn-primary" onClick={handleUpdateTicker} disabled={actionLoading} style={{ flex: 1 }}>Simpan Ticker</button>
          </div>
        </div>

        {/* ── Slideshow ── */}
        <div className="aqc-card">
          <div className="aqc-card-title">
            <span className="icon" style={{ background: "linear-gradient(135deg, #8b5cf6, #7c3aed)" }}>🖼️</span>
            Slideshow TV
          </div>
          <div className="aqc-slides-list">
            {slides.map((slide, idx) => (
              <div key={idx} className="aqc-slide-item">
                <img src={slide.image?.startsWith("http") ? slide.image : `/${slide.image}`} alt="" className="aqc-slide-thumb" onError={(e) => { e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='50'%3E%3Crect width='80' height='50' fill='%23e2e8f0'/%3E%3C/svg%3E"; }} />
                <div className="aqc-slide-info">
                  <input placeholder="Judul slide (opsional)" value={slide.title || ""} onChange={(e) => handleSlideTitle(idx, e.target.value)} />
                  <div className="aqc-slide-meta">Slide {idx + 1} • {slide.duration || 8}s</div>
                </div>
                <button className="aqc-slide-remove" onClick={() => handleRemoveSlide(idx)}><DeleteOutlined /></button>
              </div>
            ))}
            {slides.length === 0 && <div style={{ textAlign: "center", padding: "20px", color: "#94a3b8", fontSize: "13px" }}>Belum ada slide.</div>}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <input type="file" accept="image/*,video/mp4" ref={slideUploadRef} onChange={handleSlideUpload} style={{ display: "none" }} />
            <button className="aqc-btn aqc-btn-ghost" onClick={() => slideUploadRef.current?.click()} disabled={actionLoading} style={{ flex: 1 }}><PlusOutlined /> Tambah Slide</button>
            <button className="aqc-btn aqc-btn-primary" onClick={handleSaveSlideshow} disabled={slideSaving} style={{ flex: 1 }}>{slideSaving ? "Menyimpan..." : "Simpan Slideshow"}</button>
          </div>
        </div>

        {/* ── Link TV ── */}
        <div className="aqc-card aqc-preview-card">
          <div className="aqc-card-title">
            <span className="icon" style={{ background: "linear-gradient(135deg, #0ea5e9, #0284c7)" }}><DesktopOutlined /></span>
            Display TV Lobby
          </div>
          <div className="aqc-preview-info">
            <div className="aqc-preview-info-icon">📺</div>
            <p>Buka link di bawah di browser TV untuk menampilkan antrian A &amp; B, petugas, dan slideshow.</p>
          </div>
          <div className="aqc-preview-link">
            <code>{tvUrl}</code>
            <button className="aqc-btn aqc-btn-primary" onClick={() => window.open(tvUrl, "_blank")}><ExportOutlined /> Buka Display TV</button>
          </div>
          <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "8px" }}>💡 Tip: Tekan F11 di browser TV untuk fullscreen. Audio TTS akan membacakan nomor antrian otomatis.</div>
        </div>
      </div>

      {/* ── Online Visitors ── */}
      <div className="aqc-card" style={{ marginTop: "24px", maxWidth: "100%" }}>
        <div className="aqc-card-title">
          <span className="icon" style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}><UserOutlined /></span>
          Pendaftaran Online (Hari Ini)
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="aqc-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
                <th style={{ padding: "12px 8px" }}>No. Antrian</th>
                <th style={{ padding: "12px 8px" }}>Nama Lengkap</th>
                <th style={{ padding: "12px 8px" }}>Instansi/Usaha</th>
                <th style={{ padding: "12px 8px" }}>No. HP</th>
                <th style={{ padding: "12px 8px" }}>Waktu</th>
                <th style={{ padding: "12px 8px" }}>Status</th>
                <th style={{ padding: "12px 8px" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {onlineVisitors.length > 0 ? (
                onlineVisitors.map(v => (
                  <tr key={v.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "12px 8px", fontWeight: "bold", color: v.counter_code === "A" ? "#2563eb" : "#059669" }}>
                      {v.counter_code}-{String(v.queue_number).padStart(3, '0')}
                    </td>
                    <td style={{ padding: "12px 8px" }}>{v.visitor_name}</td>
                    <td style={{ padding: "12px 8px" }}>{v.institution_name || "-"}</td>
                    <td style={{ padding: "12px 8px" }}>{v.phone || "-"}</td>
                    <td style={{ padding: "12px 8px" }}>{new Date(v.created_at).toLocaleTimeString('id-ID')}</td>
                    <td style={{ padding: "12px 8px" }}>
                      <span style={{ 
                        padding: "4px 8px", 
                        borderRadius: "12px", 
                        fontSize: "12px", 
                        background: v.status === 'called' ? '#d1fae5' : '#fef3c7',
                        color: v.status === 'called' ? '#059669' : '#d97706'
                      }}>
                        {v.status === 'called' ? 'Dipanggil' : 'Menunggu'}
                      </span>
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      <button 
                        className="aqc-btn aqc-btn-primary" 
                        onClick={() => handleCallOnlineVisitor(v.id)}
                        disabled={actionLoading}
                        style={{ padding: "6px 12px", fontSize: "12px", background: v.counter_code === "A" ? "linear-gradient(135deg, #3b82f6, #2563eb)" : "linear-gradient(135deg, #10b981, #059669)" }}
                      >
                        <SoundOutlined /> Panggil
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "24px", color: "#94a3b8" }}>Belum ada pendaftaran online hari ini.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {toast && <div className={`aqc-toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}

export default AdminQueueControl;
