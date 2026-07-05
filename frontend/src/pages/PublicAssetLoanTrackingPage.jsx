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
    RollbackOutlined
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

    if (loading) return <div className="palt-loading"><Spin size="large" /></div>;

    if (error || !loan) return (
        <PublicFormLayout>
            <div className="palt-error">
                <div style={{ textAlign: 'center' }}>
                    <CloseCircleFilled style={{ fontSize: 48, color: '#ff4d4f' }} />
                    <h2 style={{ marginTop: 16 }}>Data Tidak Ditemukan</h2>
                    <p>{error || 'Token tidak valid atau kadaluarsa.'}</p>
                    <Button onClick={() => navigate('/peminjaman-aset/new')}>Buat Pengajuan Baru</Button>
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
            'ditolak': -1 // Special case
        };
        return map[currentStatus] ?? 0;
    };

    const currentStep = getStepStatus(loan.status);
    const isRejected = loan.status === 'ditolak';
    const isReturnRequested = loan.status === 'pengajuan-pengembalian';

    const steps = [
        { title: 'Diajukan', description: dayjs(loan.created_at).format('DD MMM HH:mm') },
        { title: 'Disetujui', description: loan.approved_at ? dayjs(loan.approved_at).format('DD MMM') : '-' },
        { title: 'Dipinjam', description: loan.status === 'dipinjam' ? 'Sedang berlangsung' : (isReturnRequested ? 'Pengajuan Pengembalian' : '-') },
        { title: 'Dikembalikan', description: loan.return_date ? dayjs(loan.return_date).format('DD MMM') : '-' },
    ];

    return (
        <PublicFormLayout>
            <div className="palt-page">
                <div className="palt-container">
                    {/* Header */}
                    <div className="palt-header-wrap">
                        <h1 className="palt-header__title">Track & Trace</h1>
                        <p className="palt-header__sub">Manajemen Aset Balai POM di Palopo</p>
                    </div>

                    {/* Status Board */}
                    <div className="palt-status-board">
                        <div className="palt-status-main">
                            <div className="palt-status-icon-wrap">
                                {isRejected ? <CloseCircleFilled style={{ color: '#fca5a5' }} /> :
                                    currentStep >= 1 ? <CheckCircleFilled style={{ color: '#86efac' }} /> :
                                        <ClockCircleFilled style={{ color: '#fde047' }} />}
                            </div>
                            <div className="palt-status-info">
                                <h2>Status Peminjaman</h2>
                                <p className="status-text">{loan.status.toUpperCase().replace('-', ' ')}</p>
                                <div className="spa-badge">ID: {loan.spa_number}</div>
                            </div>
                        </div>

                        {/* Action Area */}
                        <div className="palt-status-actions">
                             {loan.status === 'dipinjam' && (
                                <button className="palt-btn-glass palt-btn-primary" onClick={handleReturnRequest}>
                                    <RollbackOutlined /> Ajukan Pengembalian
                                </button>
                            )}
                            {isReturnRequested && (
                                <Tag color="gold" style={{ padding: '8px 20px', borderRadius: '12px', fontWeight: 800, border: 'none' }}>
                                    <SyncOutlined spin /> MENUNGGU KONFIRMASI
                                </Tag>
                            )}
                        </div>
                    </div>

                    {/* Horizontal Status Timeline */}
                    <div className="palt-glass-card" style={{ padding: '30px 40px' }}>
                        <div className="palt-card-title" style={{ marginBottom: 32 }}>
                            <ClockCircleFilled /> Riwayat Status Peminjaman
                        </div>
                        <Steps
                            current={currentStep}
                            direction="horizontal"
                            size="default"
                            items={steps}
                            status={isReturnRequested ? 'process' : undefined}
                        />
                    </div>

                    <div className="palt-content-grid">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div className="palt-glass-card">
                                <div className="palt-card-title">
                                    <UserOutlined /> Informasi Peminjam
                                </div>
                                <div className="palt-borrower-box">
                                    <div className="palt-label-group">
                                        <label>Nama Lengkap</label>
                                        <span>{loan.borrower_name}</span>
                                        <p>NIP: {loan.borrower_nip}</p>
                                    </div>
                                    <div className="palt-label-group">
                                        <label>Rentang Waktu</label>
                                        <span>{dayjs(loan.loan_date).format('D MMM')} — {dayjs(loan.return_date).format('D MMM YYYY')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Column 2: Assets & Notes */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div className="palt-glass-card">
                                <div className="palt-card-title">
                                    <BarcodeOutlined /> Daftar Aset Terdaftar
                                </div>
                                <div className="palt-assets-visual">
                                    {(loan.assets || []).map((asset, idx) => (
                                        <div key={idx} className="palt-asset-item-v2">
                                            <div className="palt-asset-v-icon">
                                                <BarcodeOutlined />
                                            </div>
                                            <div className="palt-asset-v-body">
                                                <h4>{asset.nama_barang}</h4>
                                                <code>{asset.kode_bmn}</code>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {loan.notes && (
                                <div className="palt-glass-card">
                                    <div className="palt-card-title">
                                        <InfoCircleOutlined /> Keperluan Peminjaman
                                    </div>
                                    <p style={{ margin: 0, color: '#475569', lineHeight: 1.6, fontSize: '15px' }}>
                                        {loan.notes}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Final Footer */}
                    <div className="palt-action-footer">
                        <button className="palt-btn-glass" onClick={() => navigate('/peminjaman-aset/new')}>
                            <HomeOutlined /> Kembali ke Beranda
                        </button>
                    </div>
                </div>
            </div>
        </PublicFormLayout>
    );
};

export default PublicAssetLoanTrackingPage;
