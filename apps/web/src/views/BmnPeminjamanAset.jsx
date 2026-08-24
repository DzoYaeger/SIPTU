import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  App as AntdApp,
  Button,
  Input,
  Space,
  Table,
  Tag,
  Tooltip,
  Modal,
  Descriptions,
  Divider,
  Card,
  Typography,
  Tabs,
  Row,
  Col,
  Checkbox,
  Statistic,
  Avatar,
  Empty,
  Badge,
  Spin,
  Dropdown,
} from 'antd';
import { buildMessageAdapter } from '../utils/notify.js';
import {
  EyeOutlined,
  PlusOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  RollbackOutlined,
  SearchOutlined,
  CalendarOutlined,
  UserOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  DropboxOutlined,
  DownloadOutlined,
  MoreOutlined
} from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth.js';
import StatisticCard from '../components/StatisticCard.jsx';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import './BmnPeminjamanAset.css';

dayjs.locale('id');

const normalizeLoan = (item) => ({
  id: item.id,
  key: item.id,
  token: item.token,
  spaNumber: item.spa_number,
  borrowerName: item.borrower_name,
  borrowerNip: item.borrower_nip,
  borrowerFunction: item.borrower_function,
  borrowerPhone: item.borrower_phone,
  loan_date: item.loan_date,
  return_date: item.return_date,
  status: item.status,
  assets: item.assets || [],
  notes: item.notes,
  requesterSignature: item.requester_signature,
  validatorSignature: item.validator_signature,
  requester_signature_token: item.requester_signature_token,
  validator_signature_token: item.validator_signature_token,
  location: item.location,
  validatorName: item.validator?.name,
  created_at: item.created_at,
  isVehicle: item.is_vehicle,
  kondisiBarangPinjam: item.kondisi_barang_pinjam,
  kondisiKendaraanPinjam: item.kondisi_kendaraan_pinjam,
  kondisiBarangKembali: item.kondisi_barang_kembali,
  kondisiKendaraanKembali: item.kondisi_kendaraan_kembali,
});

const statusMap = {
  pengajuan: { color: 'blue', text: 'Menunggu Persetujuan', icon: <ClockCircleOutlined /> },
  dipinjam: { color: 'orange', text: 'Sedang Dipinjam', icon: <DropboxOutlined /> },
  'pengajuan-pengembalian': { color: 'purple', text: 'Pengajuan Kembali', icon: <RollbackOutlined /> },
  dikembalikan: { color: 'green', text: 'Selesai / Dikembalikan', icon: <CheckCircleOutlined /> },
  ditolak: { color: 'red', text: 'Ditolak', icon: <CheckCircleOutlined /> },
};

const vehicleChecklistDefaults = {
  bbm: '',
  oli: true,
  minyak_rem: true,
  ban: true,
  air_radiator: true,
  air_aki: true,
};

const buildVehiclePayload = (state) => ({
  bbm: state.bbm ?? '',
  oli: state.oli ? 'Baik' : 'Tidak Baik',
  minyak_rem: state.minyak_rem ? 'Baik' : 'Tidak Baik',
  ban: state.ban ? 'Baik' : 'Tidak Baik',
  air_radiator: state.air_radiator ? 'Baik' : 'Tidak Baik',
  air_aki: state.air_aki ? 'Baik' : 'Tidak Baik',
});

const BmnPeminjamanAset = () => {
  const { apiFetch, user, currentRole, markMfaSessionActive } = useAuth();
  const { modal, message } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');

  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [returning, setReturning] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);

  const [approvalStep, setApprovalStep] = useState(1);
  const [isVehicle, setIsVehicle] = useState(null);
  const [kondisiPinjam, setKondisiPinjam] = useState('Baik');
  const [kendaraanPinjam, setKendaraanPinjam] = useState(vehicleChecklistDefaults);

  const [kondisiKembali, setKondisiKembali] = useState('Baik');
  const [kendaraanKembali, setKendaraanKembali] = useState(vehicleChecklistDefaults);

  const requestJson = useCallback(async (url, options = {}) => {
    const response = await apiFetch(url, {
      headers: { Accept: 'application/json', ...(options.headers ?? {}) },
      ...options,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 404) return [];
      throw new Error(data?.message ?? 'Terjadi kesalahan pada server.');
    }
    return data;
  }, [apiFetch]);

  const fetchLoans = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await requestJson('/bmn-loans');
      const sorted = (payload ?? []).map(normalizeLoan).sort((a, b) => new Date(b.created_at || b.loan_date) - new Date(a.created_at || a.loan_date));
      setLoans(sorted);
    } catch (error) {
      notification.error({ message: 'Gagal memuat data', description: error.message });
    } finally {
      setLoading(false);
    }
  }, [requestJson, notification]);

  useEffect(() => { fetchLoans(); }, [fetchLoans]);

  const stats = useMemo(() => {
    return {
      total: loans.length,
      pending: loans.filter(l => l.status === 'pengajuan').length,
      active: loans.filter(l => l.status === 'dipinjam').length,
      completed: loans.filter(l => l.status === 'dikembalikan').length,
    };
  }, [loans]);

  const handleViewDetail = (record) => { setSelectedLoan(record); setDetailDrawerOpen(true); };
  const handleCloseDetail = () => { setDetailDrawerOpen(false); setSelectedLoan(null); };

  const handleOpenApproval = () => {
    setDetailDrawerOpen(false);
    setApprovalStep(1);
    setIsVehicle(null);
    setKondisiPinjam('Baik');
    setKendaraanPinjam(vehicleChecklistDefaults);
    setPassword('');
    setApprovalModalOpen(true);
  };

  const handleCloseApproval = () => {
    setApprovalModalOpen(false);
    setPassword('');
    setTotpCode('');
    if (!detailDrawerOpen) setSelectedLoan(null);
  };

  const handleApprove = async () => {
    if (approvalStep === 1) {
      if (isVehicle === null) { notification.warning({ message: 'Pilih tipe aset terlebih dahulu.' }); return; }
      setApprovalStep(2);
      return;
    }
    try {
      if (!password) {
        notification.error({ message: 'Password SIPTU wajib diisi untuk verifikasi TTE.' });
        return;
      }
      setApproving(true);
      await requestJson(`/bmn-loans/${selectedLoan.id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: password,
          totp_code: totpCode,
          is_vehicle: isVehicle,
          kondisi_barang_pinjam: kondisiPinjam,
          kondisi_kendaraan_pinjam: isVehicle ? buildVehiclePayload(kendaraanPinjam) : null,
        }),
      });
      if (totpCode) {
        markMfaSessionActive?.();
      }
      notification.success({ message: 'Peminjaman disetujui', description: `SPA ${selectedLoan.spaNumber} telah disetujui.` });
      handleCloseApproval();
      fetchLoans();
    } catch (error) {
      notification.error({ message: 'Gagal menyetujui', description: error.message });
    } finally {
      setApproving(false);
    }
  };

  const handleOpenReturn = () => {
    setDetailDrawerOpen(false);
    setKondisiKembali('Baik');
    setKendaraanKembali(vehicleChecklistDefaults);
    setReturnModalOpen(true);
  };

  const handleReturn = async () => {
    try {
      setReturning(true);
      await requestJson(`/bmn-loans/${selectedLoan.id}/return`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kondisi_barang_kembali: kondisiKembali,
          kondisi_kendaraan_kembali: selectedLoan.isVehicle ? buildVehiclePayload(kendaraanKembali) : null,
        }),
      });
      notification.success({ message: 'Peminjaman selesai.' });
      setReturnModalOpen(false);
      setSelectedLoan(null);
      fetchLoans();
    } catch (error) {
      notification.error({ message: 'Gagal memproses', description: error.message });
    } finally {
      setReturning(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      notification.warning({ message: 'Alasan penolakan harus diisi.'});
      return;
    }
    try {
      setRejecting(true);
      await requestJson(`/bmn-loans/${selectedLoan.id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      notification.success({ message: 'Permohonan ditolak.' });
      setRejectModalOpen(false);
      setDetailDrawerOpen(false);
      fetchLoans();
    } catch (error) {
      notification.error({ message: 'Gagal menolak', description: error.message });
    } finally {
      setRejecting(false);
    }
  };

  const handleDelete = (record) => {
    modal.confirm({
      title: 'Hapus Data Peminjaman?',
      content: `Yakin ingin menghapus peminjaman ${record.spaNumber}? Semua aset terkait akan kembali berstatus tersedia.`,
      okText: 'Ya, Hapus',
      cancelText: 'Batal',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await requestJson(`/bmn-loans/${record.id}`, { method: 'DELETE' });
          notification.success({ message: 'Data dihapus' });
          fetchLoans();
        } catch (error) {
          notification.error({ message: 'Gagal menghapus', description: error.message });
        }
      }
    });
  };

  const filteredData = useMemo(() => {
    let data = loans;
    if (statusFilter !== 'all') {
      data = data.filter(l => l.status === statusFilter);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(l =>
        l.spaNumber?.toLowerCase().includes(term) ||
        l.borrowerName?.toLowerCase().includes(term) ||
        l.borrowerNip?.includes(term)
      );
    }
    return data;
  }, [loans, searchTerm, statusFilter]);

  const initialsAvatar = (name = '') => {
    const clean = name.trim();
    const initials = clean.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
    let hash = 0;
    for (let i = 0; i < clean.length; i++) hash = clean.charCodeAt(i) + ((hash << 5) - hash);
    const hue = Math.abs(hash) % 360;
    return { initials, background: `hsl(${hue}, 55%, 52%)` };
  };

  const columns = [
    {
      title: 'No. SPA & Tanggal',
      key: 'info',
      width: 210,
      render: (_, record) => (
        <div className="bmnl-spa-cell">
          <span className="bmnl-spa-no" style={{ cursor: 'pointer' }} onClick={() => handleViewDetail(record)}>
            {record.spaNumber}
          </span>
          <span className="bmnl-spa-date">
            <CalendarOutlined />
            {dayjs(record.loan_date).format('D MMM YYYY')}
          </span>
        </div>
      )
    },
    {
      title: 'Peminjam',
      key: 'borrower',
      width: 230,
      render: (_, record) => {
        const av = initialsAvatar(record.borrowerName);
        return (
          <div className="bmnl-borrower-cell">
            <div className="bmnl-avatar" style={{ background: av.background }}>
              {av.initials}
            </div>
            <div>
              <span className="bmnl-borrower-name">{record.borrowerName}</span>
              <div className="bmnl-borrower-nip">{record.borrowerNip || '-'}</div>
            </div>
          </div>
        );
      }
    },
    {
      title: 'Aset Dipinjam',
      key: 'assets',
      width: 240,
      render: (_, record) => {
        const count = record.assets?.length || 0;
        const firstAsset = record.assets?.[0]?.nama_barang || 'Tidak ada item';
        return (
          <Tooltip title={record.assets?.map(a => a.nama_barang).join(', ')}>
            <div className="bmnl-asset-cell">
              <div className="bmnl-asset-icon"><DropboxOutlined /></div>
              <span className="bmnl-asset-text">{firstAsset}</span>
              {count > 1 && <span className="bmnl-asset-count-badge">+{count - 1}</span>}
            </div>
          </Tooltip>
        );
      }
    },
    {
      title: 'Status',
      key: 'status',
      width: 180,
      render: (_, record) => {
        const s = statusMap[record.status] || { color: 'default', text: record.status };
        const colorMap = {
          blue: { bg: '#eff6ff', fg: '#2563eb', border: '#bfdbfe' },
          orange: { bg: '#fffbeb', fg: '#d97706', border: '#fde68a' },
          purple: { bg: '#f5f3ff', fg: '#7c3aed', border: '#ddd6fe' },
          green: { bg: '#ecfdf5', fg: '#059669', border: '#a7f3d0' },
          red: { bg: '#fef2f2', fg: '#dc2626', border: '#fecaca' },
          default: { bg: '#f8fafc', fg: '#64748b', border: '#e2e8f0' },
        };
        const tone = colorMap[s.color] || colorMap.default;
        return (
          <span className="bmnl-status-pill" style={{ background: tone.bg, color: tone.fg, borderColor: tone.border }}>
            {s.icon} {s.text}
          </span>
        );
      }
    },
    {
      title: 'Aksi',
      key: 'actions',
      width: 70,
      align: 'center',
      render: (_, record) => {
        const items = [
          {
            key: 'detail',
            label: 'Lihat Detail Peminjaman',
            icon: <EyeOutlined style={{ color: '#1e293b' }} />,
            onClick: () => handleViewDetail(record)
          }
        ];
        if (currentRole === 'admin' || currentRole === 'validator') {
          items.push({
            type: 'divider',
          });
          items.push({
            key: 'delete',
            label: <span style={{ color: '#ef4444' }}>Hapus Data</span>,
            icon: <DeleteOutlined style={{ color: '#ef4444' }} />,
            onClick: () => handleDelete(record)
          });
        }
        return (
          <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
            <Button type="text" shape="circle" icon={<MoreOutlined style={{ color: '#1e293b', fontSize: 16 }} />} />
          </Dropdown>
        );
      }
    },
  ];

  const currentStatus = selectedLoan?.status?.toLowerCase()?.trim() || '';
  const canApprove = (currentRole === 'admin' || currentRole === 'validator') && 
    ['pengajuan', 'menunggu_persetujuan', 'diajukan'].includes(currentStatus);
  const canReturn = (currentRole === 'admin' || currentRole === 'validator') && 
    (currentStatus === 'dipinjam' || currentStatus === 'pengajuan-pengembalian');

  return (
    <div className="module-section">
      {/* ── Single Unified Sleek Header Card ── */}
      <div className="bmnl-header-card">
        <div className="bmnl-header-top-row">
          <div className="bmnl-header-left">
            <div className="bmnl-header-icon">
              <DropboxOutlined />
            </div>
            <div>
              <div className="bmnl-title-row">
                <h1 className="bmnl-title">Peminjaman Aset</h1>
                <span className="bmnl-badge">BMN</span>
              </div>
              <p className="bmnl-subtitle">
                Kelola peminjaman, persetujuan, dan pengembalian Barang Milik Negara (BMN) — dari pengajuan hingga selesai.
              </p>
            </div>
          </div>

          <div className="bmnl-header-right">
            <Link to="/app/bmn-peminjaman-aset/new">
              <Button type="primary" icon={<PlusOutlined />} className="bmnl-btn-create">
                Tambah Peminjaman
              </Button>
            </Link>
          </div>
        </div>

        {/* Compact Inline Metrics Bar */}
        <div className="bmnl-header-metrics-bar">
          <div className="bmnl-metric-chip bmnl-metric-chip--blue">
            <FileTextOutlined className="bmnl-metric-chip__icon" />
            <div className="bmnl-metric-chip__info">
              <span className="bmnl-metric-chip__label">TOTAL PERMOHONAN</span>
              <span className="bmnl-metric-chip__val">{stats.total} Data</span>
            </div>
          </div>

          <div className="bmnl-metric-chip bmnl-metric-chip--amber">
            <ClockCircleOutlined className="bmnl-metric-chip__icon" />
            <div className="bmnl-metric-chip__info">
              <span className="bmnl-metric-chip__label">MENUNGGU PERSETUJUAN</span>
              <span className="bmnl-metric-chip__val">{stats.pending} Data</span>
            </div>
          </div>

          <div className="bmnl-metric-chip bmnl-metric-chip--purple">
            <DropboxOutlined className="bmnl-metric-chip__icon" />
            <div className="bmnl-metric-chip__info">
              <span className="bmnl-metric-chip__label">SEDANG DIPINJAM</span>
              <span className="bmnl-metric-chip__val">{stats.active} Data</span>
            </div>
          </div>

          <div className="bmnl-metric-chip bmnl-metric-chip--green">
            <CheckCircleOutlined className="bmnl-metric-chip__icon" />
            <div className="bmnl-metric-chip__info">
              <span className="bmnl-metric-chip__label">SELESAI DIKEMBALIKAN</span>
              <span className="bmnl-metric-chip__val">{stats.completed} Data</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content Card with Integrated Toolbar ── */}
      <div className="bmnl-main-card">
        {/* Status Tabs */}
        <div className="bmnl-status-tabs">
          <div className="bmnl-status-tabs__label">
            <SearchOutlined /> Status:
          </div>
          <div className="bmnl-status-tabs__scroll">
            <button
              className={`bmnl-status-btn ${statusFilter === 'all' ? 'bmnl-status-btn--active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              Semua Data ({stats.total})
            </button>
            <button
              className={`bmnl-status-btn ${statusFilter === 'pengajuan' ? 'bmnl-status-btn--active' : ''}`}
              onClick={() => setStatusFilter('pengajuan')}
            >
              <span className="bmnl-status-dot" style={{ background: '#2563eb' }} />
              Menunggu ({stats.pending})
            </button>
            <button
              className={`bmnl-status-btn ${statusFilter === 'dipinjam' ? 'bmnl-status-btn--active' : ''}`}
              onClick={() => setStatusFilter('dipinjam')}
            >
              <span className="bmnl-status-dot" style={{ background: '#d97706' }} />
              Dipinjam ({stats.active})
            </button>
            <button
              className={`bmnl-status-btn ${statusFilter === 'pengajuan-pengembalian' ? 'bmnl-status-btn--active' : ''}`}
              onClick={() => setStatusFilter('pengajuan-pengembalian')}
            >
              <span className="bmnl-status-dot" style={{ background: '#7c3aed' }} />
              Pengajuan Kembali
            </button>
            <button
              className={`bmnl-status-btn ${statusFilter === 'dikembalikan' ? 'bmnl-status-btn--active' : ''}`}
              onClick={() => setStatusFilter('dikembalikan')}
            >
              <span className="bmnl-status-dot" style={{ background: '#059669' }} />
              Riwayat Selesai ({stats.completed})
            </button>
          </div>
        </div>

        {/* Search Toolbar */}
        <div className="bmnl-toolbar">
          <div className="bmnl-toolbar__left">
            <Input.Search
              className="bmnl-search-input"
              placeholder="Cari No. SPA, Nama Peminjam, NIP..."
              allowClear
              onSearch={setSearchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ maxWidth: 400, width: '100%' }}
            />
          </div>
        </div>

        {/* Table Container */}
        <div className="bmnl-table-container">
          <Table
            columns={columns}
            dataSource={filteredData}
            rowKey="id"
            loading={loading}
            className="bmnl-table"
            scroll={{ x: 900 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (t, range) => `Menampilkan ${range[0]}-${range[1]} dari ${t} data`,
            }}
            locale={{ emptyText: <Empty description="Tidak ada data peminjaman ditemukan" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          />
        </div>
      </div>

      {/* ── Modal Detail Peminjaman (Unified Design System) ── */}
      <Modal
        className="bmnl-modal"
        title={
          <div className="bmnl-modal-header">
            <div className="bmnl-modal-header__icon bmnl-modal-header__icon--blue">
              <FileTextOutlined />
            </div>
            <div>
              <div className="bmnl-modal-header__title">Detail Peminjaman</div>
              <div className="bmnl-modal-header__sub">Informasi lengkap peminjaman, aset, dan otorisasi tanda tangan.</div>
            </div>
          </div>
        }
        width={760}
        onCancel={handleCloseDetail}
        open={detailDrawerOpen}
        footer={
          <div className="pdtt-modal-footer" style={{ marginTop: 0 }}>
            <div className="pdtt-modal-footer__left">
              <Button className="pdtt-btn-modal-action pdtt-btn-cancel-gray" onClick={handleCloseDetail}>
                Tutup
              </Button>
            </div>
            <div className="pdtt-modal-footer__right">
              {selectedLoan && (selectedLoan.status === 'dipinjam' || selectedLoan.status === 'dikembalikan') && (
                <Button
                  icon={<DownloadOutlined />}
                  className="bmnl-btn-action"
                  onClick={() => window.open(`${import.meta.env.VITE_API_URL}/public/bmn-loans/${selectedLoan.token || selectedLoan.id}/pdf`, '_blank')}
                >
                  Unduh SPA (PDF)
                </Button>
              )}
              {canApprove && (
                <>
                  <Button className="bmnl-btn-action bmnl-btn-red" onClick={() => setRejectModalOpen(true)}>
                    Tolak Permohonan
                  </Button>
                  <Button className="bmnl-btn-action bmnl-btn-green" onClick={handleOpenApproval}>
                    Setujui Permohonan
                  </Button>
                </>
              )}
              {canReturn && (
                <Button className="bmnl-btn-action bmnl-btn-primary" onClick={handleOpenReturn}>
                  {selectedLoan?.status === 'pengajuan-pengembalian' ? 'Setujui Pengembalian' : 'Proses Pengembalian'}
                </Button>
              )}
            </div>
          </div>
        }
        centered
        destroyOnClose
      >
        {selectedLoan && (
          <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 8, marginTop: 14 }}>
            {/* Summary Fieldset Card */}
            <div className="bmnl-fieldset">
              <div className="bmnl-summary-grid">
                <div className="bmnl-summary-item">
                  <span className="bmnl-summary-item__label">Nomor SPA</span>
                  <span className="bmnl-summary-item__val" style={{ color: '#0F5B99', fontFamily: 'Consolas, monospace' }}>{selectedLoan.spaNumber}</span>
                </div>
                <div className="bmnl-summary-item">
                  <span className="bmnl-summary-item__label">Nama Peminjam</span>
                  <span className="bmnl-summary-item__val">{selectedLoan.borrowerName}</span>
                </div>
                <div className="bmnl-summary-item">
                  <span className="bmnl-summary-item__label">Unit / Fungsi</span>
                  <span className="bmnl-summary-item__val">{selectedLoan.borrowerFunction || '-'}</span>
                </div>
                <div className="bmnl-summary-item">
                  <span className="bmnl-summary-item__label">Status</span>
                  <div>
                    <span className="bmnl-status-pill" style={{ background: '#eef2ff', color: '#0F5B99', borderColor: '#c7d2fe' }}>
                      {statusMap[selectedLoan.status]?.icon} {statusMap[selectedLoan.status]?.text || selectedLoan.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tanggal & Lokasi Fieldset */}
            <div className="bmnl-fieldset">
              <div className="bmnl-fieldset__title">
                <CalendarOutlined /> Jadwal & Lokasi
              </div>
              <div className="bmnl-summary-grid">
                <div className="bmnl-summary-item">
                  <span className="bmnl-summary-item__label">Tanggal Pinjam</span>
                  <span className="bmnl-summary-item__val">{dayjs(selectedLoan.loan_date).format('DD MMM YYYY')}</span>
                </div>
                <div className="bmnl-summary-item">
                  <span className="bmnl-summary-item__label">Rencana Kembali</span>
                  <span className="bmnl-summary-item__val">{dayjs(selectedLoan.return_date).format('DD MMM YYYY')}</span>
                </div>
                <div className="bmnl-summary-item">
                  <span className="bmnl-summary-item__label">Lokasi</span>
                  <span className="bmnl-summary-item__val">{selectedLoan.location || '-'}</span>
                </div>
                <div className="bmnl-summary-item">
                  <span className="bmnl-summary-item__label">Kontak</span>
                  <span className="bmnl-summary-item__val">{selectedLoan.borrowerPhone || '-'}</span>
                </div>
              </div>
              {selectedLoan.notes && (
                <div style={{ marginTop: 10, fontSize: 12, color: '#475569', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px' }}>
                  <strong>Keperluan:</strong> {selectedLoan.notes}
                </div>
              )}
            </div>

            {/* Aset yang Dipinjam Fieldset */}
            <div className="bmnl-fieldset">
              <div className="bmnl-fieldset__title">
                <DropboxOutlined /> Aset yang Dipinjam ({selectedLoan.assets?.length || 0})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selectedLoan.assets?.map((asset, idx) => (
                  <div key={idx} className="bmnl-detail-asset-item">
                    <div className="bmnl-detail-asset-icon"><DropboxOutlined /></div>
                    <div>
                      <span className="bmnl-detail-asset-name">{asset.nama_barang}</span>
                      <div className="bmnl-detail-asset-meta">NUP: {asset.nup} • Merk/Tipe: {asset.merek_barang}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Otorisasi Fieldset */}
            <div className="bmnl-fieldset">
              <div className="bmnl-fieldset__title">
                <CheckCircleOutlined /> Otorisasi Tanda Tangan
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="bmnl-signature-box">
                  {selectedLoan.requester_signature_token ? (
                    <>
                      <Tag color="green" style={{ borderRadius: 100, fontWeight: 600 }}>✓ Terverifikasi TTE</Tag>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>Token: {selectedLoan.requester_signature_token}</div>
                    </>
                  ) : (
                    <img src={selectedLoan.requesterSignature} alt="TTD Peminjam" style={{ maxHeight: 70, maxWidth: '100%' }} />
                  )}
                  <div className="bmnl-signature-box__name">Tanda Tangan: {selectedLoan.borrowerName}</div>
                </div>
                <div className="bmnl-signature-box">
                  {selectedLoan.validator_signature_token || selectedLoan.validatorSignature ? (
                    <>
                      {selectedLoan.validator_signature_token ? (
                        <Tag color="green" style={{ borderRadius: 100, fontWeight: 600 }}>✓ Terverifikasi TTE</Tag>
                      ) : (
                        <img src={selectedLoan.validatorSignature} alt="TTD Validator" style={{ maxHeight: 70, maxWidth: '100%' }} />
                      )}
                      <div className="bmnl-signature-box__name">Disetujui: {selectedLoan.validatorName || 'Validator'} • {dayjs(selectedLoan.updated_at).format('DD MMM YYYY HH:mm')}</div>
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: '#94a3b8', padding: '16px 0' }}>Belum ada tanda tangan validator.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal Approval / Persetujuan (Unified Design System) ── */}
      <Modal
        className="bmnl-modal"
        title={
          <div className="bmnl-modal-header">
            <div className={`bmnl-modal-header__icon ${approvalStep === 1 ? 'bmnl-modal-header__icon--amber' : 'bmnl-modal-header__icon--green'}`}>
              {approvalStep === 1 ? <DropboxOutlined /> : <CheckCircleOutlined />}
            </div>
            <div>
              <div className="bmnl-modal-header__title">
                {approvalStep === 1 ? 'Tipe Aset yang Dipinjam' : 'Kondisi & Persetujuan'}
              </div>
              <div className="bmnl-modal-header__sub">
                {approvalStep === 1
                  ? 'Pilih apakah aset yang dipinjam adalah kendaraan atau bukan.'
                  : 'Isi kondisi aset saat dipinjam lalu bubuhkan otorisasi tanda tangan.'}
              </div>
            </div>
          </div>
        }
        open={approvalModalOpen}
        onOk={handleApprove}
        onCancel={approvalStep === 2 ? () => setApprovalStep(1) : handleCloseApproval}
        okText={approvalStep === 1 ? 'Lanjut →' : 'Tanda Tangan & Setujui'}
        cancelText={approvalStep === 1 ? 'Batal' : '← Kembali'}
        width={540}
        confirmLoading={approving}
        cancelButtonProps={{ disabled: approving }}
        closable={!approving}
        maskClosable={!approving}
        destroyOnHidden
      >
        {approvalStep === 1 && (
          <div style={{ padding: '8px 0' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 12 }}>
              Apakah aset yang dipinjam merupakan kendaraan?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                className={`bmnl-type-card ${isVehicle === true ? 'bmnl-type-card--selected' : ''}`}
                onClick={() => setIsVehicle(true)}
                style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}
              >
                <span className="bmnl-type-card__emoji">🚗</span>
                <div>
                  <span className="bmnl-type-card__title">Aset Kendaraan</span>
                  <span className="bmnl-type-card__sub" style={{ display: 'block' }}>Mobil, motor, dan kendaraan bermotor lainnya</span>
                </div>
              </div>
              <div
                className={`bmnl-type-card ${isVehicle === false ? 'bmnl-type-card--selected' : ''}`}
                onClick={() => setIsVehicle(false)}
                style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}
              >
                <span className="bmnl-type-card__emoji">📦</span>
                <div>
                  <span className="bmnl-type-card__title">Bukan Kendaraan</span>
                  <span className="bmnl-type-card__sub" style={{ display: 'block' }}>Elektronik, furniture, peralatan kantor, dll.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {approvalStep === 2 && (
          <div>
            <p style={{ fontSize: 12.5, color: '#475569', marginBottom: 14 }}>
              Sebagai <b>{currentRole}</b>, isi kondisi aset saat dipinjam lalu bubuhkan otorisasi.
            </p>

            <div className="bmnl-fieldset">
              <div className="bmnl-fieldset__title">
                <DropboxOutlined /> Kondisi Barang Saat Dipinjam
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['Baik', 'Baik Dengan Keterangan'].map(opt => (
                  <Tag.CheckableTag key={opt} checked={kondisiPinjam === opt} onChange={() => setKondisiPinjam(opt)}
                    style={{ fontSize: 12.5, padding: '5px 14px', borderRadius: 100, border: kondisiPinjam === opt ? '1px solid #0F5B99' : '1px solid #e2e8f0', background: kondisiPinjam === opt ? '#eef2ff' : '#ffffff', color: kondisiPinjam === opt ? '#0F5B99' : '#334155', fontWeight: kondisiPinjam === opt ? 700 : 500 }}>
                    {opt}
                  </Tag.CheckableTag>
                ))}
              </div>
            </div>

            {isVehicle && (
              <div className="bmnl-fieldset">
                <div className="bmnl-fieldset__title">
                  <DropboxOutlined /> Kondisi Kendaraan
                </div>
                <Row gutter={[12, 12]}>
                  {[['bbm', 'BBM'], ['oli', 'Oli'], ['minyak_rem', 'Minyak Rem'], ['ban', 'Ban'], ['air_radiator', 'Air Radiator'], ['air_aki', 'Air Aki']].map(([key, label]) => (
                    <Col span={12} key={key}>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: '#334155' }}>{label}:</span>
                      {key === 'bbm' ? (
                        <Input
                          size="small"
                          value={kendaraanPinjam[key]}
                          onChange={e => setKendaraanPinjam(p => ({ ...p, [key]: e.target.value }))}
                          placeholder="Contoh: Full / 1/2"
                          style={{ marginTop: 4, borderRadius: 8 }}
                        />
                      ) : (
                        <Checkbox
                          checked={!!kendaraanPinjam[key]}
                          onChange={e => setKendaraanPinjam(p => ({ ...p, [key]: e.target.checked }))}
                          style={{ marginTop: 6, fontSize: 12 }}
                        >
                          Baik
                        </Checkbox>
                      )}
                    </Col>
                  ))}
                </Row>
              </div>
            )}

            <div className="bmnl-fieldset">
              <div className="bmnl-fieldset__title">
                <CheckCircleOutlined /> Otorisasi Tanda Tangan Elektronik (TTE)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Password Otorisasi SIPTU:
                  </span>
                  <Input.Password
                    className="bmnl-auth-input"
                    placeholder="Masukkan password SIPTU"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: '#334155' }}>
                      Kode MFA / Recovery:
                    </span>
                    {user?.mfa_session_active && (
                      <Tag color="success" style={{ margin: 0, fontSize: 10, borderRadius: 100 }}>
                        ✓ Sesi 20m Aktif
                      </Tag>
                    )}
                  </div>
                  <Input
                    className="bmnl-auth-input"
                    placeholder={user?.mfa_session_active ? 'Opsional (Sesi MFA Aktif)' : 'Contoh: 123456'}
                    value={totpCode}
                    onChange={e => setTotpCode(e.target.value)}
                    onPressEnter={handleApprove}
                    style={{ fontWeight: 700, letterSpacing: '1px' }}
                  />
                </div>
              </div>
              <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 10 }}>
                * Masukkan password SIPTU dan 6 digit kode MFA dari Authenticator (jika aktif) untuk menyetujui peminjaman ini secara elektronik via TTE QR Code.
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal Konfirmasi Pengembalian (Unified Design System) ── */}
      <Modal
        className="bmnl-modal"
        title={
          <div className="bmnl-modal-header">
            <div className="bmnl-modal-header__icon bmnl-modal-header__icon--green">
              <RollbackOutlined />
            </div>
            <div>
              <div className="bmnl-modal-header__title">Konfirmasi Pengembalian Aset</div>
              <div className="bmnl-modal-header__sub">Catat kondisi aset saat dikembalikan.</div>
            </div>
          </div>
        }
        open={returnModalOpen}
        onOk={handleReturn}
        onCancel={() => { setReturnModalOpen(false); setSelectedLoan(null); }}
        okText="Konfirmasi Selesai"
        cancelText="Batal"
        width={500}
        confirmLoading={returning}
        destroyOnHidden
      >
        <p style={{ fontSize: 12.5, color: '#475569', marginBottom: 14, marginTop: 8 }}>
          Isi kondisi aset <b>{selectedLoan?.spaNumber}</b> saat dikembalikan.
        </p>

        <div className="bmnl-fieldset">
          <div className="bmnl-fieldset__title">
            <DropboxOutlined /> Kondisi Barang Saat Kembali
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['Baik', 'Baik Dengan Keterangan'].map(opt => (
              <Tag.CheckableTag key={opt} checked={kondisiKembali === opt} onChange={() => setKondisiKembali(opt)}
                style={{ fontSize: 12.5, padding: '5px 14px', borderRadius: 100, border: kondisiKembali === opt ? '1px solid #059669' : '1px solid #e2e8f0', background: kondisiKembali === opt ? '#ecfdf5' : '#ffffff', color: kondisiKembali === opt ? '#059669' : '#334155', fontWeight: kondisiKembali === opt ? 700 : 500 }}>
                {opt}
              </Tag.CheckableTag>
            ))}
          </div>
        </div>

        {selectedLoan?.isVehicle && (
          <div className="bmnl-fieldset">
            <div className="bmnl-fieldset__title">
              <DropboxOutlined /> Kondisi Kendaraan saat Kembali
            </div>
            <Row gutter={[12, 12]}>
              {[['bbm', 'BBM'], ['oli', 'Oli'], ['minyak_rem', 'Minyak Rem'], ['ban', 'Ban'], ['air_radiator', 'Air Radiator'], ['air_aki', 'Air Aki']].map(([key, label]) => (
                <Col span={12} key={key}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: '#334155' }}>{label}:</span>
                  {key === 'bbm' ? (
                    <Input
                      size="small"
                      value={kendaraanKembali[key]}
                      onChange={e => setKendaraanKembali(p => ({ ...p, [key]: e.target.value }))}
                      placeholder="Contoh: Full / 1/2"
                      style={{ marginTop: 4, borderRadius: 8 }}
                    />
                  ) : (
                    <Checkbox
                      checked={!!kendaraanKembali[key]}
                      onChange={e => setKendaraanKembali(p => ({ ...p, [key]: e.target.checked }))}
                      style={{ marginTop: 6, fontSize: 12 }}
                    >
                      Baik
                    </Checkbox>
                  )}
                </Col>
              ))}
            </Row>
          </div>
        )}
      </Modal>

      {/* ── Modal Tolak Permohonan (Unified Design System) ── */}
      <Modal
        className="bmnl-modal"
        title={
          <div className="bmnl-modal-header">
            <div className="bmnl-modal-header__icon bmnl-modal-header__icon--red">
              <DeleteOutlined />
            </div>
            <div>
              <div className="bmnl-modal-header__title">Tolak Permohonan</div>
              <div className="bmnl-modal-header__sub">Masukkan alasan penolakan peminjaman.</div>
            </div>
          </div>
        }
        open={rejectModalOpen}
        onCancel={() => { setRejectModalOpen(false); setRejectReason(''); }}
        onOk={handleReject}
        okText="Tolak Permohonan"
        cancelText="Batal"
        okButtonProps={{ danger: true }}
        confirmLoading={rejecting}
        centered
        width={460}
      >
        <p style={{ fontSize: 12.5, color: '#475569', marginBottom: 12, marginTop: 8 }}>
          Yakin ingin menolak permohonan peminjaman ini? Silakan masukkan alasan penolakan:
        </p>
        <div className="bmnl-fieldset" style={{ marginBottom: 0 }}>
          <div className="bmnl-fieldset__title">
            <DeleteOutlined /> Alasan Penolakan
          </div>
          <Input.TextArea
            rows={4}
            placeholder="Alasan penolakan..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            style={{ borderRadius: 10 }}
          />
        </div>
      </Modal>
    </div>
  );
};

export default BmnPeminjamanAset;
