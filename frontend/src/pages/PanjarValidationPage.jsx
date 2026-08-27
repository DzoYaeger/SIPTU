import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  App as AntdApp,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Form,
  Input,
  Modal,
  Radio,
  Result,
  Row,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  CheckCircleFilled,
  CloseCircleFilled,
  ClockCircleOutlined,
  DollarOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
  UserOutlined,
  WarningOutlined,
  ArrowLeftOutlined,
  CalendarOutlined,
  CheckOutlined,
  CloseOutlined,
  AuditOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { buildMessageAdapter } from '../utils/notify.js';
import simkeuIcon from '../assets/icons/simkeu-icon.png';
import './PanjarValidationPage.css';

const { Title, Text, Paragraph } = Typography;
dayjs.locale('id');

const API_BASE = (import.meta.env.VITE_API_URL || 'https://siptu.bpompalopo.com/core_api/api').replace(/\/+$/, '');

const formatCurrency = (value) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value ?? 0);

export default function PanjarValidationPage() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const roleParam = (searchParams.get('role') || '').toLowerCase(); // 'ppk' | 'bendahara'
  const { message } = AntdApp.useApp();
  const notification = useMemo(() => buildMessageAdapter(message), [message]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState(null);
  const [pejabatConfig, setPejabatConfig] = useState({});
  const [error, setError] = useState(null);

  // Form State
  const [action, setAction] = useState('approve'); // 'approve' | 'reject'
  const [verifierName, setVerifierName] = useState('');
  const [notes, setNotes] = useState('');
  const [activeRole, setActiveRole] = useState(roleParam === 'bendahara' ? 'bendahara' : 'ppk');

  const fetchDetail = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/public/panjar/${token}`);
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.message || 'Gagal memuat rincian permintaan panjar');
      }
      setData(json.data);
      setPejabatConfig(json.pejabat_config || {});

      // Pre-fill verifier name based on role
      const isBendahara = roleParam === 'bendahara' || json.data.ppk_status === 'approved';
      if (isBendahara) {
        setActiveRole('bendahara');
        setVerifierName(json.data.bendahara_name || json.pejabat_config?.bendahara_name || '');
      } else {
        setActiveRole('ppk');
        setVerifierName(json.data.ppk_name || json.pejabat_config?.ppk_name || '');
      }
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  }, [token, roleParam]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // Determine current validation readiness
  const isPpkActionReady = useMemo(() => {
    if (!data) return false;
    return activeRole === 'ppk' && data.ppk_status === 'pending' && data.status !== 'rejected';
  }, [data, activeRole]);

  const isBendaharaActionReady = useMemo(() => {
    if (!data) return false;
    return activeRole === 'bendahara' && data.ppk_status === 'approved' && data.bendahara_status === 'pending' && data.status !== 'rejected';
  }, [data, activeRole]);

  const canValidate = isPpkActionReady || isBendaharaActionReady;

  const handleSubmit = async () => {
    if (!verifierName.trim()) {
      notification.error('Nama pejabat verifikator wajib diisi.');
      return;
    }

    if (action === 'reject' && !notes.trim()) {
      notification.error('Mohon isi kolom keterangan / alasan penolakan.');
      return;
    }

    const endpoint =
      activeRole === 'bendahara'
        ? `${API_BASE}/public/panjar/${token}/validate-bendahara`
        : `${API_BASE}/public/panjar/${token}/validate-ppk`;

    const confirmTitle =
      action === 'approve'
        ? `Setujui Permintaan Panjar sebagai ${activeRole.toUpperCase()}?`
        : `Tolak Permintaan Panjar sebagai ${activeRole.toUpperCase()}?`;

    Modal.confirm({
      title: confirmTitle,
      content: (
        <div style={{ fontSize: 13, color: '#475569', marginTop: 8 }}>
          {action === 'approve' ? (
            <p>
              Pengajuan akan disetujui. Notifikasi WhatsApp akan otomatis dikirimkan ke{' '}
              <strong>{activeRole === 'ppk' ? 'Bendahara Pengeluaran' : 'Pemohon / Penerima'}</strong>.
            </p>
          ) : (
            <p>
              Pengajuan akan ditolak. Notifikasi WhatsApp beserta alasan penolakan akan dikirimkan langsung ke{' '}
              <strong>Pemohon / Penerima</strong>.
            </p>
          )}
          {notes && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>Catatan / Alasan:</span>
              <div style={{ color: '#0f172a', fontStyle: 'italic', marginTop: 2 }}>{notes}</div>
            </div>
          )}
        </div>
      ),
      okText: action === 'approve' ? 'Ya, Setujui' : 'Ya, Tolak',
      okButtonProps: {
        danger: action === 'reject',
        style: action === 'approve' ? { background: '#0F5B99', borderColor: '#0F5B99' } : undefined,
      },
      cancelText: 'Batal',
      onOk: async () => {
        setSubmitting(true);
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action,
              notes: notes || null,
              verifier_name: verifierName,
            }),
          });
          const json = await response.json();
          if (!response.ok) {
            throw new Error(json.message || 'Gagal memproses validasi panjar');
          }

          notification.success(json.message || 'Validasi berhasil disimpan.');
          setData(json.data);
        } catch (err) {
          notification.error(err.message || 'Gagal memproses validasi panjar');
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  // Status mapping
  const getStatusBadge = (status) => {
    switch (status) {
      case 'submitted':
      case 'menunggu_ppk':
        return (
          <div className="status-indicator">
            <span className="status-dot submitted" />
            <span className="status-text">Menunggu Persetujuan PPK</span>
          </div>
        );
      case 'approved_ppk':
      case 'menunggu_bendahara':
        return (
          <div className="status-indicator">
            <span className="status-dot submitted" />
            <span className="status-text">Disetujui PPK (Menunggu Bendahara)</span>
          </div>
        );
      case 'approved':
        return (
          <div className="status-indicator">
            <span className="status-dot success" />
            <span className="status-text">Disetujui (Siap Dicairkan)</span>
          </div>
        );
      case 'rejected':
        return (
          <div className="status-indicator">
            <span className="status-dot rejected" />
            <span className="status-text">
              Ditolak {data?.rejection_stage === 'ppk' ? 'oleh PPK' : 'oleh Bendahara'}
            </span>
          </div>
        );
      case 'paid':
        return (
          <div className="status-indicator">
            <span className="status-dot success" />
            <span className="status-text">Telah Dibayarkan</span>
          </div>
        );
      default:
        return (
          <div className="status-indicator">
            <span className="status-dot draft" />
            <span className="status-text">Draft Pengajuan</span>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="panjar-val-loading-wrap">
        <Card className="panjar-val-container-card">
          <Skeleton active avatar paragraph={{ rows: 8 }} />
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="panjar-val-loading-wrap">
        <Card className="panjar-val-container-card">
          <Result
            status="warning"
            title="Tautan Validasi Tidak Valid"
            subTitle={error || 'Permintaan panjar tidak ditemukan atau token tidak sesuai.'}
            extra={
              <Button type="primary" onClick={() => window.location.reload()}>
                Muat Ulang
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  const items = data.items || [];
  const totalNominal = data.nominal_panjar || 0;

  return (
    <div className="panjar-val-page">
      {/* ── Top Header Bar ── */}
      <header className="panjar-val-topbar">
        <div className="panjar-val-topbar-inner">
          <div className="panjar-val-brand">
            <div className="panjar-val-logo-mark">
              <img src={simkeuIcon} alt="SIMKEU" />
            </div>
            <div>
              <div className="panjar-val-brand-title">SIMKEU <span>ULTRA</span></div>
              <div className="panjar-val-brand-sub">Sistem Informasi Permintaan Panjar</div>
            </div>
          </div>
          <div className="panjar-val-header-right">
            {getStatusBadge(data.status)}
          </div>
        </div>
      </header>

      {/* ── Main Container ── */}
      <main className="panjar-val-main">
        {/* ── Step Progress Tracker ── */}
        <div className="panjar-val-tracker-card">
          <div className="panjar-val-tracker-step active">
            <div className="panjar-val-step-num">1</div>
            <div className="panjar-val-step-info">
              <span className="panjar-val-step-title">Pengajuan Masuk</span>
              <span className="panjar-val-step-sub">{data.tanggal_pengajuan ? dayjs(data.tanggal_pengajuan).format('DD MMM YYYY') : '-'}</span>
            </div>
          </div>

          <div className="panjar-val-tracker-line" />

          <div className={`panjar-val-tracker-step ${data.ppk_status === 'approved' ? 'active' : data.ppk_status === 'rejected' ? 'rejected' : data.status === 'submitted' ? 'current' : ''}`}>
            <div className="panjar-val-step-num">{data.ppk_status === 'approved' ? '✓' : data.ppk_status === 'rejected' ? '✗' : '2'}</div>
            <div className="panjar-val-step-info">
              <span className="panjar-val-step-title">Validasi PPK</span>
              <span className="panjar-val-step-sub">
                {data.ppk_status === 'approved' ? 'Disetujui' : data.ppk_status === 'rejected' ? 'Ditolak' : 'Menunggu'}
              </span>
            </div>
          </div>

          <div className="panjar-val-tracker-line" />

          <div className={`panjar-val-tracker-step ${data.bendahara_status === 'approved' ? 'active' : data.bendahara_status === 'rejected' ? 'rejected' : data.status === 'approved_ppk' ? 'current' : ''}`}>
            <div className="panjar-val-step-num">{data.bendahara_status === 'approved' ? '✓' : data.bendahara_status === 'rejected' ? '✗' : '3'}</div>
            <div className="panjar-val-step-info">
              <span className="panjar-val-step-title">Validasi Bendahara</span>
              <span className="panjar-val-step-sub">
                {data.bendahara_status === 'approved' ? 'Disetujui' : data.bendahara_status === 'rejected' ? 'Ditolak' : 'Menunggu'}
              </span>
            </div>
          </div>

          <div className="panjar-val-tracker-line" />

          <div className={`panjar-val-tracker-step ${data.status === 'approved' || data.status === 'paid' ? 'active' : ''}`}>
            <div className="panjar-val-step-num">{data.status === 'paid' ? '✓' : '4'}</div>
            <div className="panjar-val-step-info">
              <span className="panjar-val-step-title">Pencairan Dana</span>
              <span className="panjar-val-step-sub">{data.status === 'paid' ? 'Telah Dicairkan' : data.status === 'approved' ? 'Siap Dicairkan' : 'Belum'}</span>
            </div>
          </div>
        </div>

        {/* ── Document Details Card ── */}
        <Card className="panjar-val-card" variant="borderless">
          <div className="panjar-val-card-header">
            <div>
              <span className="panjar-val-card-kicker">INFORMASI PENGAJUAN</span>
              <h2 className="panjar-val-doc-title">{data.panjar_no || data.ticket_no}</h2>
            </div>
            <div className="panjar-val-total-highlight">
              <span className="panjar-val-total-lbl">Total Nominal Panjar:</span>
              <strong className="panjar-val-total-val">{formatCurrency(totalNominal)}</strong>
            </div>
          </div>

          <Divider style={{ margin: '14px 0' }} />

          <Row gutter={[16, 12]}>
            <Col xs={24} sm={12} md={8}>
              <div className="panjar-meta-item">
                <span className="panjar-meta-lbl">Penerima Dana / Pemohon:</span>
                <strong className="panjar-meta-val">{data.penerima_name || '-'}</strong>
                {data.requester_phone && (
                  <span className="panjar-meta-sub">WA: {data.requester_phone}</span>
                )}
              </div>
            </Col>

            <Col xs={24} sm={12} md={8}>
              <div className="panjar-meta-item">
                <span className="panjar-meta-lbl">Kode Akun & Tahun Anggaran:</span>
                <strong className="panjar-meta-val">{data.mak || '-'}</strong>
                <span className="panjar-meta-sub">Tahun Anggaran {data.tahun_anggaran}</span>
              </div>
            </Col>

            <Col xs={24} sm={12} md={8}>
              <div className="panjar-meta-item">
                <span className="panjar-meta-lbl">Nomor Surat Tugas:</span>
                <strong className="panjar-meta-val">{data.surat_tugas_no || '-'}</strong>
                <span className="panjar-meta-sub">Pengajuan: {data.tanggal_pengajuan ? dayjs(data.tanggal_pengajuan).format('DD/MM/YYYY') : '-'}</span>
              </div>
            </Col>

            <Col xs={24} md={16}>
              <div className="panjar-meta-item">
                <span className="panjar-meta-lbl">Nama Kegiatan:</span>
                <strong className="panjar-meta-val kegiatan-text">{data.kegiatan}</strong>
                {data.uraian && <span className="panjar-meta-sub">{data.uraian}</span>}
              </div>
            </Col>

            <Col xs={24} md={8}>
              <div className="panjar-meta-item">
                <span className="panjar-meta-lbl">Periode Kegiatan & Batas LPJ:</span>
                <strong className="panjar-meta-val">
                  {data.tanggal_mulai_kegiatan ? dayjs(data.tanggal_mulai_kegiatan).format('DD/MM/YY') : '-'} s.d.{' '}
                  {data.tanggal_akhir_kegiatan ? dayjs(data.tanggal_akhir_kegiatan).format('DD/MM/YY') : '-'}
                </strong>
                {data.tanggal_paling_lambat && (
                  <span className="panjar-meta-sub text-amber font-semibold">
                    Batas LPJ: {dayjs(data.tanggal_paling_lambat).format('DD MMMM YYYY')}
                  </span>
                )}
              </div>
            </Col>
          </Row>

          {data.terbilang_panjar && (
            <div className="panjar-terbilang-box">
              <span className="panjar-terbilang-lbl">Terbilang:</span>
              <span className="panjar-terbilang-val">"{data.terbilang_panjar}"</span>
            </div>
          )}

          {/* ── Table Rincian ── */}
          <div className="panjar-items-section">
            <h3 className="panjar-section-subtitle">Rincian Pos Kebutuhan Dana Panjar</h3>
            <Table
              rowKey="id"
              dataSource={items}
              pagination={false}
              size="middle"
              className="panjar-items-table"
              columns={[
                {
                  title: 'NO',
                  width: 50,
                  align: 'center',
                  render: (_, __, idx) => idx + 1,
                },
                {
                  title: 'POS RINCIAN KEBUTUHAN',
                  dataIndex: 'uraian',
                  render: (val, r) => (
                    <div>
                      <strong style={{ color: '#0f172a' }}>{val}</strong>
                      {r.keterangan && <div style={{ fontSize: 11, color: '#64748b' }}>{r.keterangan}</div>}
                    </div>
                  ),
                },
                {
                  title: 'VOLUME',
                  dataIndex: 'volume',
                  width: 110,
                  align: 'right',
                  render: (val, r) => `${val || 1} ${r.satuan || 'Paket'}`,
                },
                {
                  title: 'HARGA SATUAN',
                  dataIndex: 'harga_satuan',
                  width: 150,
                  align: 'right',
                  render: formatCurrency,
                },
                {
                  title: 'SUBTOTAL',
                  dataIndex: 'jumlah',
                  width: 160,
                  align: 'right',
                  render: (val) => <strong style={{ color: '#0F5B99' }}>{formatCurrency(val)}</strong>,
                },
              ]}
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row className="panjar-sum-row">
                    <Table.Summary.Cell index={0} colSpan={4} align="right">
                      <strong style={{ fontSize: 13, color: '#0f172a' }}>TOTAL NILAI PANJAR:</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <strong style={{ fontSize: 15, color: '#0F5B99' }}>{formatCurrency(totalNominal)}</strong>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </div>
        </Card>

        {/* ── Approval History Log (If already actioned) ── */}
        {(data.ppk_notes || data.bendahara_notes || data.ppk_action_at || data.bendahara_action_at) && (
          <Card className="panjar-val-card" variant="borderless" style={{ marginTop: 16 }}>
            <h3 className="panjar-section-subtitle">Riwayat Catatan Validasi Pejabat</h3>
            <Row gutter={[16, 12]}>
              {data.ppk_action_at && (
                <Col xs={24} md={12}>
                  <div className={`panjar-history-box ${data.ppk_status === 'approved' ? 'box-success' : 'box-rejected'}`}>
                    <div className="panjar-history-header">
                      <div>
                        <strong>Pejabat Pembuat Komitmen (PPK)</strong>
                        <div className="panjar-history-name">{data.ppk_name || '-'}</div>
                      </div>
                      <Tag color={data.ppk_status === 'approved' ? 'success' : 'error'}>
                        {data.ppk_status === 'approved' ? 'Disetujui' : 'Ditolak'}
                      </Tag>
                    </div>
                    {data.ppk_notes && (
                      <p className="panjar-history-note">"{data.ppk_notes}"</p>
                    )}
                    <span className="panjar-history-time">
                      Waktu: {dayjs(data.ppk_action_at).format('DD MMMM YYYY, HH:mm')} WITA
                    </span>
                  </div>
                </Col>
              )}

              {data.bendahara_action_at && (
                <Col xs={24} md={12}>
                  <div className={`panjar-history-box ${data.bendahara_status === 'approved' ? 'box-success' : 'box-rejected'}`}>
                    <div className="panjar-history-header">
                      <div>
                        <strong>Bendahara Pengeluaran</strong>
                        <div className="panjar-history-name">{data.bendahara_name || '-'}</div>
                      </div>
                      <Tag color={data.bendahara_status === 'approved' ? 'success' : 'error'}>
                        {data.bendahara_status === 'approved' ? 'Disetujui' : 'Ditolak'}
                      </Tag>
                    </div>
                    {data.bendahara_notes && (
                      <p className="panjar-history-note">"{data.bendahara_notes}"</p>
                    )}
                    <span className="panjar-history-time">
                      Waktu: {dayjs(data.bendahara_action_at).format('DD MMMM YYYY, HH:mm')} WITA
                    </span>
                  </div>
                </Col>
              )}
            </Row>
          </Card>
        )}

        {/* ── Active Validation Form Card ── */}
        {canValidate ? (
          <Card className="panjar-val-card panjar-action-card" variant="borderless" style={{ marginTop: 16 }}>
            <div className="panjar-action-header">
              <SafetyCertificateOutlined className="panjar-action-icon" />
              <div>
                <h3 className="panjar-action-title">
                  Form Validasi Permintaan Panjar ({activeRole === 'bendahara' ? 'Bendahara Pengeluaran' : 'PPK'})
                </h3>
                <p className="panjar-action-desc">
                  Tentukan persetujuan pengajuan uang muka kegiatan dan berikan keterangan/alasan jika diperlukan.
                </p>
              </div>
            </div>

            <Divider style={{ margin: '14px 0' }} />

            <Form layout="vertical">
              <Row gutter={[16, 12]}>
                <Col xs={24} md={12}>
                  <Form.Item label="Keputusan Validasi" required>
                    <Radio.Group
                      value={action}
                      onChange={(e) => setAction(e.target.value)}
                      className="panjar-decision-group"
                      buttonStyle="solid"
                    >
                      <Radio.Button value="approve" className="panjar-decision-btn btn-approve">
                        <CheckOutlined style={{ marginRight: 6 }} />
                        Setujui Permintaan
                      </Radio.Button>
                      <Radio.Button value="reject" className="panjar-decision-btn btn-reject">
                        <CloseOutlined style={{ marginRight: 6 }} />
                        Tolak Permintaan
                      </Radio.Button>
                    </Radio.Group>
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item label="Nama Pejabat / Verifikator" required>
                    <Input
                      prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
                      value={verifierName}
                      onChange={(e) => setVerifierName(e.target.value)}
                      placeholder="Nama lengkap pejabat..."
                    />
                  </Form.Item>
                </Col>

                <Col xs={24}>
                  <Form.Item
                    label={
                      action === 'reject' ? (
                        <span>
                          <strong style={{ color: '#ef4444' }}>Alasan Penolakan</strong> (Wajib diisi, akan dikirim ke WhatsApp pemohon)
                        </span>
                      ) : (
                        <span>
                          <strong>Catatan / Keterangan Tambahan</strong> (Opsional)
                        </span>
                      )
                    }
                    required={action === 'reject'}
                  >
                    <Input.TextArea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={
                        action === 'reject'
                          ? 'Tuliskan alasan penolakan, contoh: Tidak tersedia uang di bendahara / pagu akun belum mencukupi...'
                          : 'Tuliskan catatan persetujuan jika ada...'
                      }
                    />
                  </Form.Item>
                </Col>
              </Row>

              <div className="panjar-action-footer">
                <Button
                  type="primary"
                  size="large"
                  icon={action === 'approve' ? <CheckOutlined /> : <CloseOutlined />}
                  danger={action === 'reject'}
                  loading={submitting}
                  onClick={handleSubmit}
                  className="panjar-submit-action-btn"
                >
                  {action === 'approve'
                    ? `Setujui Permintaan (${activeRole.toUpperCase()})`
                    : `Tolak Permintaan (${activeRole.toUpperCase()})`}
                </Button>
              </div>
            </Form>
          </Card>
        ) : (
          <Card className="panjar-val-card" variant="borderless" style={{ marginTop: 16, background: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 4px' }}>
              <InfoCircleOutlined style={{ fontSize: 24, color: '#0F5B99' }} />
              <div>
                <strong style={{ fontSize: 13.5, color: '#0f172a' }}>Status Pengajuan Ini: {data.status}</strong>
                <p style={{ margin: 0, fontSize: 12.5, color: '#64748b' }}>
                  {data.status === 'approved' || data.status === 'paid'
                    ? 'Pengajuan panjar ini telah disetujui penuh dan tidak memerlukan tindakan validasi lanjutan.'
                    : data.status === 'rejected'
                    ? 'Pengajuan panjar ini telah ditolak. Pemohon dapat melakukan penyesuaian atau mengajukan kembali pada sistem SIPTU.'
                    : data.status === 'submitted' && activeRole === 'bendahara'
                    ? 'Pengajuan ini masih menunggu persetujuan dari PPK sebelum dapat diproses oleh Bendahara Pengeluaran.'
                    : 'Tidak ada tindakan validasi yang tertunda untuk peran Anda saat ini.'}
                </p>
              </div>
            </div>
          </Card>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="panjar-val-footer">
        <span>SIPTU ULTRA © 2026 Balai POM di Palopo. Layanan Tata Usaha Terpadu & Terintegrasi.</span>
      </footer>
    </div>
  );
}
