import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Steps, Spin, App, Button, Tag } from 'antd';
import {
    CheckCircleFilled,
    ClockCircleFilled,
    CloseCircleFilled,
    SyncOutlined,
    HomeOutlined,
    CalendarOutlined,
    UserOutlined,
    BarcodeOutlined,
    InfoCircleOutlined,
    RollbackOutlined,
    FilePdfOutlined,
    EnvironmentOutlined,
    PhoneOutlined,
    FileTextOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import PublicFormLayout from '../layouts/PublicFormLayout.jsx';
import './PublicAssetLoanTrackingPage.css';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

const PublicAssetLoanTrackingPage = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const { message, modal } = App.useApp();
    const [loan, setLoan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchLoan = async () => {
        try {
            const res = await fetch(`${API}/public/bmn-loans/${token}`);
            if (!res.ok) throw new Error('Data peminjaman tidak ditemukan.');
            const data = await res.json();
            setLoan(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchLoan();
    }, [token]);

    const handleReturnRequest = () => {
        modal.confirm({
            title: 'Ajukan Pengembalian Aset?',
            content: 'Apakah Anda yakin ingin mengajukan pengembalian aset ini? Status akan berubah menjadi "Pengajuan Pengembalian".',
            okText: 'Ya, Ajukan',
            cancelText: 'Batal',
            onOk: async () => {
                setActionLoading(true);
                try {
                    const res = await fetch(`${API}/public/bmn-loans/${token}/return`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.message || 'Gagal mengajukan pengembalian.');
                    message.success('Pengajuan pengembalian berhasil dikirim.');
                    fetchLoan(); // Refresh data
                } catch (err) {
                    message.error(err.message);
                } finally {
                    setActionLoading(false);
                }
            }
        });
    };

    if (loading) return (
        <div className="palt-loading">
            <Spin size="large" tip="Memuat data peminjaman..." />
        </div>
    );

    if (error || !loan) return (
        <PublicFormLayout>
            <div className="palt-page">
                <div className="palt-container">
                    <div className="palt-card palt-error-card">
                        <CloseCircleFilled style={{ fontSize: 44, color: '#ef4444' }} />
                        <h2>Data Tidak Ditemukan</h2>
                        <p>{error || 'Token peminjaman tidak valid atau telah kadaluarsa.'}</p>
                        <Button 
                            type="primary" 
                            onClick={() => navigate('/peminjaman-aset/new')}
                            style={{ borderRadius: 8 }}
                        >
                            Buat Pengajuan Baru
                        </Button>
                    </div>
                </div>
            </div>
        </PublicFormLayout>
    );

    const getStepStatus = (currentStatus) => {
        const map = {
            'pengajuan': 0,
            'disetujui': 1,
            'dipinjam': 2,
            'pengajuan-pengembalian': 2,
            'dikembalikan': 3,
            'ditolak': -1
        };
        return map[currentStatus] ?? 0;
    };

    const currentStep = getStepStatus(loan.status);
    const isRejected = loan.status === 'ditolak';
    const isReturnRequested = loan.status === 'pengajuan-pengembalian';

    const steps = [
        { title: 'Diajukan', description: dayjs(loan.created_at).format('DD MMM HH:mm') },
        { title: 'Disetujui', description: loan.approved_at ? dayjs(loan.approved_at).format('DD MMM') : '-' },
        { title: 'Dipinjam', description: loan.status === 'dipinjam' ? 'Sedang dipinjam' : (isReturnRequested ? 'Proses Pengembalian' : '-') },
        { title: 'Dikembalikan', description: loan.status === 'dikembalikan' ? (loan.return_date ? dayjs(loan.return_date).format('DD MMM YYYY') : 'Selesai') : '-' },
    ];

    const statusBadgeMap = {
        'pengajuan': { color: 'processing', text: 'Menunggu Persetujuan' },
        'disetujui': { color: 'cyan', text: 'Disetujui' },
        'dipinjam': { color: 'warning', text: 'Sedang Dipinjam' },
        'pengajuan-pengembalian': { color: 'purple', text: 'Pengajuan Pengembalian' },
        'dikembalikan': { color: 'success', text: 'Dikembalikan' },
        'ditolak': { color: 'error', text: 'Ditolak' },
    };

    const statusConfig = statusBadgeMap[loan.status] || { color: 'default', text: loan.status };

    return (
        <PublicFormLayout>
            <div className="palt-page">
                <div className="palt-container">
                    {/* Header */}
                    <div className="palt-header">
                        <div className="palt-header__left">
                            <span className="palt-header__tag">SIMBA BMN</span>
                            <h1 className="palt-header__title">Pelacakan Status Peminjaman</h1>
                            <p className="palt-header__sub">Balai Besar / Balai POM di Palopo</p>
                        </div>
                        <div className="palt-header__right">
                            <Button
                                type="primary"
                                icon={<FilePdfOutlined style={{ color: '#ffffff' }} />}
                                onClick={() => window.open(`${API}/public/bmn-loans/${token}/pdf`, '_blank')}
                                style={{ borderRadius: 8, backgroundColor: 'var(--color-primary, #0F5B99)', borderColor: 'var(--color-primary, #0F5B99)', color: '#ffffff' }}
                            >
                                Cetak SPA (PDF)
                            </Button>
                        </div>
                    </div>

                    {/* Status Overview Card */}
                    <div className="palt-card palt-status-card">
                        <div className="palt-status-card__header">
                            <div className="palt-status-card__info">
                                <div className="palt-spa-badge">
                                    No. SPA: <strong>{loan.spa_number || loan.token?.substring(0, 8)}</strong>
                                </div>
                                <div className="palt-status-title-row">
                                    <Tag color={statusConfig.color} style={{ borderRadius: 6, fontWeight: 600, fontSize: 13, padding: '4px 12px' }}>
                                        {statusConfig.text}
                                    </Tag>
                                </div>
                            </div>

                            <div className="palt-status-card__actions">
                                {loan.status === 'dipinjam' && (
                                    <Button
                                        type="primary"
                                        icon={<RollbackOutlined />}
                                        loading={actionLoading}
                                        onClick={handleReturnRequest}
                                        style={{ borderRadius: 8 }}
                                    >
                                        Ajukan Pengembalian
                                    </Button>
                                )}
                                {isReturnRequested && (
                                    <Tag color="purple" style={{ padding: '6px 14px', borderRadius: 8, fontWeight: 600 }}>
                                        <SyncOutlined spin /> Menunggu Konfirmasi Pengembalian
                                    </Tag>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Timeline Steps Card */}
                    <div className="palt-card">
                        <div className="palt-card-header">
                            <ClockCircleFilled className="palt-card-icon" />
                            <h3 className="palt-card-title">Progres Status Peminjaman</h3>
                        </div>
                        <div className="palt-steps-wrapper">
                            <Steps
                                current={currentStep}
                                direction="horizontal"
                                size="small"
                                items={steps}
                                status={isRejected ? 'error' : (isReturnRequested ? 'process' : undefined)}
                            />
                        </div>
                    </div>

                    {/* Content Grid */}
                    <div className="palt-grid">
                        {/* Column 1: Borrower & Period Info */}
                        <div className="palt-card">
                            <div className="palt-card-header">
                                <UserOutlined className="palt-card-icon" />
                                <h3 className="palt-card-title">Informasi Peminjam</h3>
                            </div>
                            <div className="palt-info-grid">
                                <div className="palt-info-item">
                                    <span className="palt-info-label">Nama Peminjam</span>
                                    <span className="palt-info-value">{loan.borrower_name}</span>
                                </div>
                                <div className="palt-info-item">
                                    <span className="palt-info-label">NIP</span>
                                    <span className="palt-info-value">{loan.borrower_nip || '-'}</span>
                                </div>
                                <div className="palt-info-item">
                                    <span className="palt-info-label">Fungsi / Bidang</span>
                                    <span className="palt-info-value">{loan.borrower_function || '-'}</span>
                                </div>
                                <div className="palt-info-item">
                                    <span className="palt-info-label">No. Telepon / WA</span>
                                    <span className="palt-info-value">{loan.borrower_phone || '-'}</span>
                                </div>
                                <div className="palt-info-item" style={{ gridColumn: 'span 2' }}>
                                    <span className="palt-info-label">Periode Pinjam</span>
                                    <span className="palt-info-value">
                                        <CalendarOutlined style={{ marginRight: 6, color: '#f59e0b' }} />
                                        {dayjs(loan.loan_date).format('DD MMMM YYYY')} s/d {dayjs(loan.return_date).format('DD MMMM YYYY')}
                                    </span>
                                </div>
                                {loan.location && (
                                    <div className="palt-info-item" style={{ gridColumn: 'span 2' }}>
                                        <span className="palt-info-label">Lokasi Penempatan</span>
                                        <span className="palt-info-value">{loan.location}</span>
                                    </div>
                                )}
                                {loan.notes && (
                                    <div className="palt-info-item" style={{ gridColumn: 'span 2' }}>
                                        <span className="palt-info-label">Keperluan / Catatan</span>
                                        <span className="palt-info-value">{loan.notes}</span>
                                    </div>
                                )}
                                {loan.rejection_reason && (
                                    <div className="palt-info-item" style={{ gridColumn: 'span 2' }}>
                                        <span className="palt-info-label" style={{ color: '#ef4444' }}>Alasan Penolakan</span>
                                        <span className="palt-info-value" style={{ color: '#dc2626' }}>{loan.rejection_reason}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Column 2: Assets List */}
                        <div className="palt-card">
                            <div className="palt-card-header">
                                <BarcodeOutlined className="palt-card-icon" />
                                <h3 className="palt-card-title">Daftar Barang BMN ({loan.assets?.length || 0})</h3>
                            </div>
                            <div className="palt-assets-list">
                                {(loan.assets || []).map((asset, idx) => (
                                    <div key={idx} className="palt-asset-row">
                                        <div className="palt-asset-row__num">{idx + 1}</div>
                                        <div className="palt-asset-row__details">
                                            <span className="palt-asset-row__title">{asset.nama_barang || asset.name}</span>
                                            <div className="palt-asset-row__meta">
                                                <span>Merek: <strong>{asset.merek_barang || asset.brand || '-'}</strong></span>
                                                <span>Kode / NUP: <code>{asset.kode_bmn || asset.nup || asset.asset_code || '-'}</code></span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer Action */}
                    <div className="palt-footer-actions">
                        <Button
                            icon={<HomeOutlined />}
                            onClick={() => navigate('/app/simba')}
                            style={{ borderRadius: 8 }}
                        >
                            Kembali ke SIMBA
                        </Button>
                    </div>
                </div>
            </div>
        </PublicFormLayout>
    );
};

export default PublicAssetLoanTrackingPage;
