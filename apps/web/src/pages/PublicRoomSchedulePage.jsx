import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import {
  ArrowLeftOutlined,
  SearchOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  PlusOutlined,
  CheckCircleFilled,
  HistoryOutlined,
  QrcodeOutlined,
  CloseOutlined,
  BankOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import './PublicRoomSchedulePage.css';

dayjs.locale('id');

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

const svc = {
  get: async (url) => {
    const r = await fetch(`${API}${url}`);
    if (!r.ok) throw new Error('Gagal memuat data.');
    return r.json();
  },
  post: async (url, body, token = null) => {
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const r = await fetch(`${API}${url}`, { method: 'POST', headers, body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.message || 'Gagal mengirim.');
    return d;
  },
};

const statusLabels = {
  pengajuan: 'Menunggu',
  dipinjam: 'Digunakan',
  dikembalikan: 'Selesai',
  ditolak: 'Ditolak',
};

const PublicRoomSchedulePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, token: authToken, markMfaSessionActive } = useAuth();
  const isQrAccess = searchParams.get('qr') === '1';

  const [rooms, setRooms] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('all');

  const [showBooking, setShowBooking] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    room_id: '', loan_date: '', return_date: '',
    start_time: '', end_time: '', activity_name: '', password: '', totp_code: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [bookingError, setBookingError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [roomsData, activeData, historyData] = await Promise.all([
        svc.get('/public/room-loans/rooms'),
        svc.get('/public/room-loans/schedule?filter=active'),
        svc.get('/public/room-loans/schedule?filter=history'),
      ]);
      setRooms(roomsData);
      setSchedules([...activeData, ...historyData]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = useMemo(() => {
    const active = schedules.filter(s => ['pengajuan', 'dipinjam'].includes(s.status));
    return {
      totalRooms: rooms.length,
      activeBookings: active.length,
      todayBookings: active.filter(s => dayjs(s.loan_date).isSame(dayjs(), 'day')).length,
    };
  }, [rooms, schedules]);

  const filteredSchedules = useMemo(() => {
    let data = schedules;
    if (activeTab === 'active') data = data.filter(s => ['pengajuan', 'dipinjam'].includes(s.status));
    else if (activeTab === 'history') data = data.filter(s => ['dikembalikan', 'ditolak'].includes(s.status));

    if (selectedRoom !== 'all') {
      const rid = parseInt(selectedRoom, 10);
      data = data.filter(s => (s.assets || []).some(a => a.asset_id === rid));
    }

    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      data = data.filter(s =>
        s.activity_name?.toLowerCase().includes(t) ||
        s.borrower_name?.toLowerCase().includes(t) ||
        s.notes?.toLowerCase().includes(t)
      );
    }

    return data.sort((a, b) => {
      if (activeTab === 'active') return dayjs(a.loan_date).diff(dayjs(b.loan_date));
      return dayjs(b.loan_date).diff(dayjs(a.loan_date));
    });
  }, [schedules, activeTab, selectedRoom, searchTerm]);

  const activeCount = schedules.filter(s => ['pengajuan', 'dipinjam'].includes(s.status)).length;
  const historyCount = schedules.filter(s => ['dikembalikan', 'ditolak'].includes(s.status)).length;

  const getRoomName = (loan) => {
    if (loan.assets?.length > 0) return loan.assets[0].nama_barang || loan.location || 'Ruangan';
    return loan.location || 'Ruangan';
  };

  const handleFormChange = (f, v) => {
    setBookingForm(p => ({ ...p, [f]: v }));
    setBookingError('');
  };

  const handleSubmitBooking = async () => {
    const { room_id, loan_date, return_date, start_time, end_time, activity_name, password, totp_code } = bookingForm;
    if (!room_id || !loan_date || !return_date || !start_time || !end_time || !activity_name || !password) {
      setBookingError('Semua field wajib diisi.');
      return;
    }
    setSubmitting(true);
    setBookingError('');
    try {
      const payload = {
        nip: user.nip || user.username, nama: user.name,
        fungsi_bidang: user?.employee?.work_unit || '',
        room_id: parseInt(room_id, 10),
        loan_date, return_date, start_time, end_time, activity_name, password, totp_code,
      };
      const result = await svc.post('/public/room-loans', payload, authToken);
      if (totp_code) {
        markMfaSessionActive?.();
      }
      const roomName = rooms.find(r => r.id === parseInt(room_id, 10))?.name || 'Ruangan';
      setBookingSuccess({ ...payload, spa_number: result.spa_number, room_name: roomName });
      setShowBooking(false);
      fetchData();
    } catch (err) {
      setBookingError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetBooking = () => {
    setBookingSuccess(null);
    setBookingForm({ room_id: '', loan_date: '', return_date: '', start_time: '', end_time: '', activity_name: '', password: '', totp_code: '' });
  };

  /* ════ SUCCESS ════ */
  if (bookingSuccess) {
    return (
      <div className="rs-success-page">
        <div className="rs-success-card">
          <div className="rs-success-body">
            <div className="rs-success-ico"><CheckCircleFilled /></div>
            <h2>Peminjaman Diajukan!</h2>
            <p>
              Pengajuan Anda dengan nomor <strong>{bookingSuccess.spa_number}</strong> telah berhasil dikirim dan menunggu persetujuan admin.
            </p>
            <div className="rs-success-details">
              <dl>
                <div className="rs-success-row"><dt>Ruangan</dt><dd>{bookingSuccess.room_name}</dd></div>
                <div className="rs-success-row"><dt>Kegiatan</dt><dd>{bookingSuccess.activity_name}</dd></div>
                <div className="rs-success-row"><dt>Tanggal</dt><dd>{dayjs(bookingSuccess.loan_date).format('D MMM YYYY')} s/d {dayjs(bookingSuccess.return_date).format('D MMM YYYY')}</dd></div>
                <div className="rs-success-row"><dt>Jam</dt><dd>{bookingSuccess.start_time} — {bookingSuccess.end_time}</dd></div>
              </dl>
            </div>
            <div className="rs-success-actions">
              <button className="rs-btn rs-btn-ghost" onClick={resetBooking}>Ajukan Lagi</button>
              <button className="rs-btn rs-btn-solid" onClick={() => { resetBooking(); }}>Lihat Jadwal</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ════ MAIN ════ */
  return (
    <div className="rs-page">

      {/* Sticky Header */}
      <header className="rs-header">
        <div className="rs-header-inner">
          <button className="rs-back-btn" onClick={() => user ? navigate('/app/layanan-mandiri') : navigate('/login')}>
            <ArrowLeftOutlined />
            {user ? 'Kembali' : 'Login'}
          </button>
          <div className="rs-header-right">
            {isQrAccess && (
              <span className="rs-qr-badge"><QrcodeOutlined /> QR Access</span>
            )}
            <span className="rs-brand rs-header-brand">SIPTU</span>
          </div>
        </div>
      </header>

      {/* Title + Stats */}
      <section className="rs-title-section">
        <div className="rs-title-text">
          <h2>Jadwal Peminjaman Ruangan</h2>
          <p>Balai POM di Palopo — Informasi pemakaian ruangan secara real-time.</p>
        </div>
        <div className="rs-stats">
          <div className="rs-stat-box">
            <div className="rs-stat-num">{stats.totalRooms}</div>
            <div className="rs-stat-lbl">Ruangan</div>
          </div>
          <div className="rs-stat-box highlight">
            <div className="rs-stat-num">{stats.activeBookings}</div>
            <div className="rs-stat-lbl">Aktif</div>
          </div>
          <div className="rs-stat-box">
            <div className="rs-stat-num">{stats.todayBookings}</div>
            <div className="rs-stat-lbl">Hari Ini</div>
          </div>
        </div>
      </section>

      {/* Toolbar */}
      <div className="rs-toolbar">
        <div className="rs-toolbar-inner">
          <div className="rs-search-wrap">
            <SearchOutlined className="rs-search-ico" />
            <input
              type="text"
              placeholder="Cari kegiatan atau peminjam..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="rs-filter-sel">
            <select value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)}>
              <option value="all">Semua Ruangan</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          {user && (
            <button className="rs-cta-btn" onClick={() => setShowBooking(true)}>
              <PlusOutlined /> Ajukan Peminjaman
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="rs-tabs-wrap">
        <div className="rs-tabs">
          <button className={`rs-tab ${activeTab === 'active' ? 'active' : ''}`} onClick={() => setActiveTab('active')}>
            <CalendarOutlined /> Jadwal Aktif <span className="rs-tab-count">{activeCount}</span>
          </button>
          <button className={`rs-tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
            <HistoryOutlined /> Riwayat <span className="rs-tab-count">{historyCount}</span>
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="rs-grid-wrap">
        <div className="rs-grid">
          {loading ? (
            <div className="rs-loading">
              <div className="rs-spinner" />
              <span>Memuat data ruangan...</span>
            </div>
          ) : error ? (
            <div className="rs-empty">
              <div className="rs-empty-ico">⚠️</div>
              <h3>Gagal Memuat Data</h3>
              <p>{error}</p>
              <button className="rs-btn rs-btn-solid" style={{ marginTop: 20 }} onClick={fetchData}>Coba Lagi</button>
            </div>
          ) : filteredSchedules.length === 0 ? (
            <div className="rs-empty">
              <div className="rs-empty-ico">{activeTab === 'active' ? '📅' : '📋'}</div>
              <h3>{activeTab === 'active' ? 'Tidak Ada Jadwal Aktif' : 'Belum Ada Riwayat'}</h3>
              <p>
                {activeTab === 'active'
                  ? 'Saat ini tidak ada ruangan yang sedang dipinjam atau menunggu persetujuan.'
                  : 'Belum ada riwayat peminjaman ruangan yang tercatat.'}
              </p>
            </div>
          ) : (
            filteredSchedules.map((s, idx) => (
              <div key={s.id} className="rs-card" style={{ animationDelay: `${idx * 50}ms` }}>
                <div className="rs-card-top">
                  <div className="rs-card-room">
                    <div className="rs-card-room-ico"><BankOutlined /></div>
                    <div>
                      <div className="rs-card-room-name">{getRoomName(s)}</div>
                      <div className="rs-card-spa">{s.spa_number}</div>
                    </div>
                  </div>
                  <span className={`rs-badge rs-badge-${s.status}`}>
                    {statusLabels[s.status] || s.status}
                  </span>
                </div>

                <div className="rs-card-body">
                  <h3 className="rs-card-activity">{s.activity_name || s.notes || 'Kegiatan'}</h3>

                  <div className="rs-card-meta">
                    <div className="rs-meta-row">
                      <div className="rs-meta-ico"><CalendarOutlined /></div>
                      <span>
                        <strong>{dayjs(s.loan_date).format('D MMM YYYY')}</strong>
                        {s.return_date && s.return_date !== s.loan_date && (
                          <> s/d <strong>{dayjs(s.return_date).format('D MMM YYYY')}</strong></>
                        )}
                      </span>
                    </div>

                    {(s.start_time || s.end_time) && (
                      <div className="rs-meta-row">
                        <div className="rs-meta-ico"><ClockCircleOutlined /></div>
                        <span><strong>{s.start_time || '—'}</strong> — <strong>{s.end_time || '—'}</strong> WITA</span>
                      </div>
                    )}

                    <div className="rs-meta-divider" />

                    <div className="rs-meta-row">
                      <div className="rs-meta-ico"><UserOutlined /></div>
                      <span>
                        <strong>{s.borrower_name}</strong>
                        {s.borrower_function && <> · {s.borrower_function}</>}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ════ BOOKING MODAL ════ */}
      {showBooking && (
        <div className="rs-overlay" onClick={() => setShowBooking(false)}>
          <div className="rs-modal" onClick={e => e.stopPropagation()}>
            <div className="rs-modal-head">
              <h3><BankOutlined style={{ color: '#6366f1' }} /> Ajukan Peminjaman</h3>
              <button className="rs-modal-close" onClick={() => setShowBooking(false)}><CloseOutlined /></button>
            </div>

            <div className="rs-modal-body">
              {user && (
                <div className="rs-user-card">
                  <div className="rs-user-avatar">{(user.name?.[0] || 'U').toUpperCase()}</div>
                  <div>
                    <div className="rs-user-name">{user.name}</div>
                    <div className="rs-user-nip">NIP: {user.nip || user.username || '-'}</div>
                  </div>
                </div>
              )}

              <div className="rs-field">
                <label>Ruangan <span className="req">*</span></label>
                <select className="rs-select" value={bookingForm.room_id} onChange={e => handleFormChange('room_id', e.target.value)}>
                  <option value="">— Pilih Ruangan —</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>

              <div className="rs-field">
                <label>Tanggal Kegiatan <span className="req">*</span></label>
                <div className="rs-row">
                  <input type="date" className="rs-input" value={bookingForm.loan_date}
                    onChange={e => {
                      handleFormChange('loan_date', e.target.value);
                      if (!bookingForm.return_date) handleFormChange('return_date', e.target.value);
                    }}
                  />
                  <input type="date" className="rs-input" value={bookingForm.return_date} min={bookingForm.loan_date}
                    onChange={e => handleFormChange('return_date', e.target.value)}
                  />
                </div>
                <div className="rs-hint">Tanggal mulai — Tanggal selesai</div>
              </div>

              <div className="rs-field">
                <label>Jam Kegiatan <span className="req">*</span></label>
                <div className="rs-row">
                  <input type="time" className="rs-input" value={bookingForm.start_time} onChange={e => handleFormChange('start_time', e.target.value)} />
                  <input type="time" className="rs-input" value={bookingForm.end_time} onChange={e => handleFormChange('end_time', e.target.value)} />
                </div>
                <div className="rs-hint">Jam mulai — Jam selesai</div>
              </div>

              <div className="rs-field">
                <label>Nama Kegiatan <span className="req">*</span></label>
                <input type="text" className="rs-input" placeholder="Contoh: Rapat Koordinasi Bulanan" value={bookingForm.activity_name}
                  onChange={e => handleFormChange('activity_name', e.target.value)} />
              </div>

              <div className="rs-field">
                <label>Password SIPTU <span className="req">*</span></label>
                <input type="password" className="rs-input" placeholder="Masukkan password akun SIPTU" value={bookingForm.password}
                  onChange={e => handleFormChange('password', e.target.value)}
                />
              </div>

              <div className="rs-field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ margin: 0 }}>Kode Autentikasi MFA (6 Digit / Recovery Code) {!user?.mfa_session_active && <span className="req">*</span>}</label>
                  {user?.mfa_session_active && (
                    <span style={{ fontSize: 11, background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                      ✓ Sesi 20m Aktif
                    </span>
                  )}
                </div>
                <input type="text" className="rs-input" placeholder={user?.mfa_session_active ? "Opsional (Sesi MFA Aktif)" : "Contoh: 123456 atau XXXX-XXXX"} value={bookingForm.totp_code}
                  onChange={e => handleFormChange('totp_code', e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSubmitBooking(); }}
                  style={{ fontWeight: 700, letterSpacing: '1px' }}
                />
                <div className="rs-hint">Dengan memasukkan password & kode MFA, Anda menyetujui pengajuan ini secara elektronik (TTE).</div>
              </div>

              {bookingError && <div className="rs-error-box">⚠️ {bookingError}</div>}
            </div>

            <div className="rs-modal-foot">
              <button className="rs-btn rs-btn-ghost" onClick={() => setShowBooking(false)}>Batal</button>
              <button className="rs-btn rs-btn-solid" onClick={handleSubmitBooking} disabled={submitting}>
                {submitting ? 'Mengirim...' : 'Ajukan Peminjaman'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicRoomSchedulePage;
