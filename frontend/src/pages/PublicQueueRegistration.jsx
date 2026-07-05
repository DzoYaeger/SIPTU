import { useState, useEffect, useCallback, useRef } from "react";
import "./PublicQueueRegistration.css";

const API_URL = import.meta.env.VITE_API_URL || "https://siptu.bpompalopo.com/core_api/api";
const AUTO_RESET_SECONDS = 30;

function PublicQueueRegistration() {
  const [formData, setFormData] = useState({
    visitor_name: "",
    institution_name: "",
    phone: "",
    purpose_of_visit: "",
    counter_code: "A"
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [queueCounts, setQueueCounts] = useState({ A: 0, B: 0 });
  const [countdown, setCountdown] = useState(AUTO_RESET_SECONDS);
  const countdownRef = useRef(null);

  // Fetch current queue counts
  const fetchQueueCounts = useCallback(async () => {
    try {
      const [resA, resB] = await Promise.all([
        fetch(`${API_URL}/public/queue-display`).then(r => r.json()).catch(() => null)
      ]);
      if (resA?.counters) {
        const counts = {};
        resA.counters.forEach(c => {
          counts[c.counter_code] = c.current_number || 0;
        });
        setQueueCounts(prev => ({ ...prev, ...counts }));
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchQueueCounts();
    const interval = setInterval(fetchQueueCounts, 10000);
    return () => clearInterval(interval);
  }, [fetchQueueCounts]);

  // Auto-reset after success
  useEffect(() => {
    if (!result) {
      setCountdown(AUTO_RESET_SECONDS);
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }

    setCountdown(AUTO_RESET_SECONDS);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          handleReset();
          return AUTO_RESET_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [result]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/public/visitor-queues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Gagal mengambil antrian");
      }

      setResult(data.queue);
      fetchQueueCounts();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setFormData(f => ({ ...f, visitor_name: '', institution_name: '', phone: '', purpose_of_visit: '' }));
  };

  const handlePrint = () => {
    window.print();
  };

  const purposeOptions = [
    "Permintaan Informasi Obat",
    "Permintaan Informasi Pangan",
    "Permintaan Informasi",
    "Permintaan Informasi Kosmetik",
    "Permintaan Informasi Suplemen Kesehatan",
    "Permintaan Informasi Obat bahan alam",
    "Permintaan Informasi Obat Kuasi",
    "Sertifikasi CDOB",
    "Sertifikasi CPPOB",
    "Sertifikasi CPKB",
    "Sertifikat CPOBAB",
    "Penotifikasi Kosmetik"
  ];

  // ─── SUCCESS VIEW ───
  if (result) {
    return (
      <div className="pqr-page">
        <Background />
        <div className="pqr-card pqr-result-card">
          {/* Animated Success Check */}
          <div className="pqr-success-ring">
            <svg viewBox="0 0 96 96">
              <circle className="ring" cx="48" cy="48" r="45" />
              <polyline className="check" points="30 50 43 63 66 37" />
            </svg>
          </div>

          <h2 className="pqr-result-title">Pendaftaran Berhasil!</h2>
          <p className="pqr-result-subtitle">Silahkan tunggu nomor antrian Anda dipanggil.</p>

          {/* Ticket */}
          <div className="pqr-ticket">
            <div className="pqr-ticket-label">Nomor Antrian Anda</div>
            <div className="pqr-ticket-number">
              {result.counter_code}-{String(result.queue_number).padStart(3, '0')}
            </div>

            <div className="pqr-ticket-divider" />

            <div className="pqr-ticket-details">
              <div className="pqr-ticket-detail-row">
                <span className="pqr-ticket-detail-label">Nama</span>
                <span className="pqr-ticket-detail-value">{result.visitor_name}</span>
              </div>
              {result.institution_name && (
                <div className="pqr-ticket-detail-row">
                  <span className="pqr-ticket-detail-label">Instansi</span>
                  <span className="pqr-ticket-detail-value">{result.institution_name}</span>
                </div>
              )}
              <div className="pqr-ticket-detail-row">
                <span className="pqr-ticket-detail-label">Loket</span>
                <span className="pqr-ticket-detail-value">
                  Loket {result.counter_code}
                  <br />
                  <small style={{ fontWeight: 'normal', color: '#64748b' }}>
                    {result.counter_code === 'A' ? 'Layanan Pengaduan dan Informasi' : 'Layanan Sertifikasi/Pendampingan'}
                  </small>
                </span>
              </div>
              <div className="pqr-ticket-detail-row">
                <span className="pqr-ticket-detail-label">Keperluan</span>
                <span className="pqr-ticket-detail-value">{result.purpose_of_visit}</span>
              </div>
              <div className="pqr-ticket-detail-row">
                <span className="pqr-ticket-detail-label">Waktu</span>
                <span className="pqr-ticket-detail-value">
                  {new Date(result.created_at).toLocaleString('id-ID', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pqr-result-actions">
            <button className="pqr-btn-print" onClick={handlePrint}>
              🖨️ Cetak Tiket Antrian
            </button>
            <button className="pqr-btn-new" onClick={handleReset}>
              🔄 Ambil Antrian Baru
            </button>
          </div>

          {/* Auto-reset countdown */}
          <div className="pqr-auto-reset">
            Halaman otomatis kembali dalam <strong>{countdown} detik</strong>
          </div>

          <div className="pqr-footer">
            Balai POM di Palopo — Layanan Unit Pelayanan Publik
          </div>
        </div>
      </div>
    );
  }

  // ─── FORM VIEW ───
  return (
    <div className="pqr-page">
      <Background />
      <div className="pqr-card">
        {/* Header */}
        <div className="pqr-header">
          <div className="pqr-logo-wrap">
            <img src="/logo/logo.png" alt="Logo BPOM" className="pqr-logo" />
          </div>
          <h2>Pengambilan Nomor Antrian</h2>
          <p className="pqr-header-sub">Layanan Unit Pelayanan Publik — Balai POM di Palopo</p>
          <div className="pqr-header-divider" />
        </div>

        {error && <div className="pqr-error">{error}</div>}

        <form onSubmit={handleSubmit} className="pqr-form">
          {/* Counter Selection */}
          <div className="pqr-form-group">
            <label>
              <span className="pqr-label-icon">🏢</span>
              Pilih Loket Tujuan
            </label>
            <div className="pqr-counter-grid" style={{ gridTemplateColumns: '1fr', gap: '16px' }}>
              <label
                className={`pqr-counter-option ${formData.counter_code === 'A' ? 'active-a' : ''}`}
                style={{ flexDirection: 'row', justifyContent: 'flex-start', padding: '20px', gap: '20px', alignItems: 'center' }}
              >
                <input
                  type="radio"
                  name="counter_code"
                  value="A"
                  checked={formData.counter_code === 'A'}
                  onChange={handleChange}
                />
                <div className="pqr-counter-glow" />
                <div className="pqr-counter-check">✓</div>
                <span className="pqr-counter-letter" style={{ fontSize: '40px' }}>A</span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', zIndex: 1 }}>
                  <span className="pqr-counter-name" style={{ fontSize: '16px' }}>Loket A</span>
                  <div style={{ fontSize: '12px', marginTop: '4px', fontWeight: 'normal', opacity: 0.8, color: '#64748b' }}>
                    Layanan Pengaduan dan Informasi
                  </div>
                </div>
              </label>
              <label
                className={`pqr-counter-option ${formData.counter_code === 'B' ? 'active-b' : ''}`}
                style={{ flexDirection: 'row', justifyContent: 'flex-start', padding: '20px', gap: '20px', alignItems: 'center' }}
              >
                <input
                  type="radio"
                  name="counter_code"
                  value="B"
                  checked={formData.counter_code === 'B'}
                  onChange={handleChange}
                />
                <div className="pqr-counter-glow" />
                <div className="pqr-counter-check">✓</div>
                <span className="pqr-counter-letter" style={{ fontSize: '40px' }}>B</span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', zIndex: 1 }}>
                  <span className="pqr-counter-name" style={{ fontSize: '16px' }}>Loket B</span>
                  <div style={{ fontSize: '12px', marginTop: '4px', fontWeight: 'normal', opacity: 0.8, color: '#64748b' }}>
                    Layanan Sertifikasi/Pendampingan
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Name */}
          <div className="pqr-form-group">
            <label>
              <span className="pqr-label-icon">👤</span>
              Nama Lengkap
            </label>
            <div className="pqr-input-wrap">
              <input
                type="text"
                name="visitor_name"
                value={formData.visitor_name}
                onChange={handleChange}
                required
                placeholder="Masukkan nama lengkap Anda"
                autoComplete="off"
              />
              <span className="pqr-input-icon">👤</span>
            </div>
          </div>

          {/* Institution */}
          <div className="pqr-form-group">
            <label>
              <span className="pqr-label-icon">🏛️</span>
              Instansi / Usaha
            </label>
            <div className="pqr-input-wrap">
              <input
                type="text"
                name="institution_name"
                value={formData.institution_name}
                onChange={handleChange}
                placeholder="Opsional — Kosongkan jika personal"
                autoComplete="off"
              />
              <span className="pqr-input-icon">🏛️</span>
            </div>
          </div>

          {/* Phone */}
          <div className="pqr-form-group">
            <label>
              <span className="pqr-label-icon">📱</span>
              Nomor WhatsApp
            </label>
            <div className="pqr-input-wrap">
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Opsional — Contoh: 081234567890"
                autoComplete="off"
              />
              <span className="pqr-input-icon">📱</span>
            </div>
          </div>

          {/* Purpose of Visit */}
          <div className="pqr-form-group">
            <label>
              <span className="pqr-label-icon">📝</span>
              Maksud Kunjungan
            </label>
            <div className="pqr-input-wrap">
              <select
                name="purpose_of_visit"
                value={formData.purpose_of_visit}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '15px 18px 15px 48px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '14px',
                  fontSize: '15px',
                  fontFamily: "'Inter', sans-serif",
                  color: formData.purpose_of_visit ? '#0f172a' : '#94a3b8',
                  background: '#ffffff',
                  transition: 'all 0.25s',
                  boxSizing: 'border-box',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.01)',
                  appearance: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="" disabled>Pilih Maksud Kunjungan</option>
                {purposeOptions.map(opt => (
                  <option key={opt} value={opt} style={{ color: '#0f172a' }}>{opt}</option>
                ))}
              </select>
              <span className="pqr-input-icon">📝</span>
              <span style={{ position: 'absolute', right: '18px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.5 }}>
                ▼
              </span>
            </div>
          </div>

          {/* Submit */}
          <button type="submit" className="pqr-btn" disabled={loading}>
            {loading ? (
              <>
                <div className="pqr-spinner" />
                Memproses...
              </>
            ) : (
              <>
                <span className="pqr-btn-icon">🎫</span>
                Ambil Nomor Antrian
              </>
            )}
          </button>
        </form>

        {/* Queue Info */}
        <div className="pqr-queue-info">
          <span className="pqr-queue-info-icon">📊</span>
          <span className="pqr-queue-info-text">
            Antrian saat ini — Loket A: <span className="pqr-queue-info-count">{queueCounts.A || 0}</span>
            {' '} | {' '}
            Loket B: <span className="pqr-queue-info-count">{queueCounts.B || 0}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Animated Background Component ── */
function Background() {
  return (
    <div className="pqr-bg">
      <div className="pqr-bg-grid" />
      <div className="pqr-bg-orb pqr-bg-orb-1" />
      <div className="pqr-bg-orb pqr-bg-orb-2" />
      <div className="pqr-bg-orb pqr-bg-orb-3" />
    </div>
  );
}

export default PublicQueueRegistration;
