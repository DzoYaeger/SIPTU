import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  App as AntdApp,
  Button,
  Card,
  Descriptions,
  Divider,
  Result,
  Space,
  Spin,
  Steps,
  Tag,
  Typography,
  Input,
  Modal,
  Alert,
  QRCode,
  Timeline
} from 'antd';
import dayjs from 'dayjs';
import { SafetyCertificateOutlined, CheckCircleOutlined, InfoCircleOutlined, LockOutlined, PrinterOutlined } from '@ant-design/icons';
// import SignatureModal from '../components/SignatureModal.jsx';
import PublicFormLayout from '../layouts/PublicFormLayout.jsx';
import './PublicArchiveLoanInfoPage.css';
import { useAuth } from '../hooks/useAuth.js';

const statusMap = {
  menunggu_paraf: { color: 'orange', text: 'Menunggu Persetujuan' },
  dipinjam: { color: 'blue', text: 'Dipinjam' },
  menunggu_paraf_kembali: { color: 'gold', text: 'Menunggu Pengembalian' },
  dikembalikan: { color: 'green', text: 'Dikembalikan' },
};

const formatDate = (value) => (value ? dayjs(value).format('DD MMM YYYY') : '-');

const PublicArchiveLoanInfoPage = () => {
  const { token } = useParams();
  const { message } = AntdApp.useApp();
  const { apiFetch } = useAuth();

  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [passwordModal, setPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchLoan = useCallback(async () => {
    if (!token) {
      setError('Tautan tidak valid.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await apiFetch(`/public/archive-loans/${token}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message ?? 'Data peminjaman tidak ditemukan.');
      }
      const data = await response.json();
      setPayload(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, token]);

  useEffect(() => {
    fetchLoan();
  }, [fetchLoan]);

  const loan = payload?.loan;
  const actions = payload?.actions ?? {};
  const statusDescriptor = useMemo(() => {
    if (!loan) return null;
    return statusMap[loan.status] ?? { color: 'default', text: loan.status };
  }, [loan]);

  const steps = useMemo(() => ([
    {
      title: 'Pengajuan',
      description: formatDate(loan?.borrow_date),
    },
    {
      title: 'Disetujui',
      description: loan?.approved_at ? dayjs(loan.approved_at).format('DD MMM YYYY HH:mm') : 'Menunggu',
    },
    {
      title: 'Pengembalian',
      description: loan?.return_requested_at ? dayjs(loan.return_requested_at).format('DD MMM YYYY HH:mm') : 'Belum diajukan',
    },
    {
      title: 'Selesai',
      description: loan?.return_date ? formatDate(loan.return_date) : 'Belum selesai',
    },
  ]), [loan]);

  const currentStep = useMemo(() => {
    if (!loan) return 0;
    if (loan.status === 'dikembalikan') return 3;
    if (loan.status === 'menunggu_paraf_kembali') return 2;
    if (loan.status === 'dipinjam') return 1;
    return 0;
  }, [loan]);

  const openSignature = () => setPasswordModal(true);
  const closeSignature = () => {
    if (submitting) return;
    setPasswordModal(false);
    setPassword('');
  };

  const handleSubmitReturn = async () => {
    if (!password) {
      message.warning('Masukkan password SIPTU Anda.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await apiFetch(`/public/archive-loans/${token}/return-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message ?? 'Gagal mengajukan pengembalian.');
      }
      setPayload(data);
      message.success('Pengajuan pengembalian berhasil diverifikasi dengan TTE.');
      setPasswordModal(false);
      setPassword('');
    } catch (err) {
      console.error(err);
      message.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="public-archive-info__centered">
        <Spin tip="Memuat informasi peminjaman..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="public-archive-info__centered">
        <Result
          status="error"
          title="Terjadi kesalahan"
          subTitle={error}
          extra={[
            <Button key="retry" type="primary" onClick={fetchLoan}>
              Coba Lagi
            </Button>,
          ]}
        />
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="public-archive-info__centered">
        <Result
          status="404"
          title="Data tidak ditemukan"
          subTitle="Informasi peminjaman tidak tersedia."
        />
      </div>
    );
  }

  return (
    <PublicFormLayout
      title="Informasi Peminjaman Arsip"
      subtitle="Pantau status pengajuan, persetujuan, dan pengembalian arsip Anda."
    >
      <div className="public-archive-info">
        <Card className="public-archive-info__card" variant="filled">
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div className="public-archive-info__header">
              <div>
                <Typography.Text type="secondary">Nomor Pengajuan</Typography.Text>
                <Typography.Title level={4} className="public-archive-info__title">
                  {loan.request_number}
                </Typography.Title>
              </div>
              <Tag color={statusDescriptor?.color ?? 'default'} className="public-archive-info__tag">
                {statusDescriptor?.text ?? loan.status}
              </Tag>
            </div>

            <Steps size="small" current={currentStep}>
              {(steps || []).map((step) => (
                <Steps.Step key={step.title} title={step.title} description={step.description} />
              ))}
            </Steps>

            <Divider style={{ margin: '8px 0' }} />

            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Tanggal Pinjam">{formatDate(loan.borrow_date)}</Descriptions.Item>
              <Descriptions.Item label="Nama Peminjam">{loan.borrower_name}</Descriptions.Item>
              <Descriptions.Item label="NIP">{loan.borrower_nip ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="Fungsi/Bidang">{loan.borrower_work_unit ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="No Arsip">{loan.archive_number}</Descriptions.Item>
              <Descriptions.Item label="Unit Pengolah">{loan.unit_pengolah?.fungsi_bidang ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="Status Pengembalian">{loan.return_date ? formatDate(loan.return_date) : 'Belum selesai'}</Descriptions.Item>
            </Descriptions>

            <div className="public-archive-info__actions">
              {actions.can_request_return && !actions.has_return_signature && (
                <Button type="primary" icon={<SafetyCertificateOutlined />} onClick={openSignature}>
                  Ajukan Pengembalian & Tanda Tangan TTE
                </Button>
              )}
              {actions.has_return_signature && loan.status !== 'dikembalikan' && (
                <Alert
                  message="Pengembalian Diajukan (TTE)"
                  description="Pengajuan pengembalian Anda telah ditandatangani secara digital. Menunggu verifikasi admin."
                  type="success"
                  showIcon
                  icon={<CheckCircleOutlined />}
                />
              )}
              {loan.status === 'dikembalikan' && (
                <Alert
                  message="Arsip Selesai Dikembalikan"
                  description="Proses pengembalian telah selesai dan divalidasi oleh petugas."
                  type="success"
                  showIcon
                  icon={<CheckCircleOutlined />}
                />
              )}
              <Button 
                type="primary"
                icon={<PrinterOutlined />} 
                onClick={() => window.open(`${import.meta.env.VITE_API_URL}/public/archive-loans/${loan.public_token}/pdf`, '_blank')} 
                className="print-button"
              >
                Cetak Bukti Peminjaman (PDF)
              </Button>
            </div>

            <Divider orientation="left" style={{ margin: '16px 0 8px' }}>Validasi Tanda Tangan Elektronik</Divider>
            <Timeline
              items={(loan.signatures || []).map(sig => ({
                color: sig.type === 'borrowing' ? 'blue' : 'green',
                children: (
                  <div>
                    <Typography.Text strong style={{ display: 'block' }}>
                      {sig.signer_name}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                      {sig.signer_title}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                      {sig.role === 'borrower' ? 'Peminjam' : 'Validator'} • {dayjs(sig.created_at).format('DD/MM/YYYY HH:mm')}
                    </Typography.Text>
                  </div>
                )
              }))}
            />

            {loan.signature_token && (
              <div style={{ 
                marginTop: 24, 
                padding: 16, 
                background: '#f8fafc', 
                borderRadius: 12, 
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: 20
              }}>
                <QRCode value={`${window.location.origin}/verify/${loan.signature_token}`} size={100} bordered={false} color="#1e293b" />
                <div>
                  <Typography.Text strong style={{ display: 'block', fontSize: 14 }}>Dokumen Terverifikasi TTE</Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Pindai QR Code untuk memverifikasi keaslian pengajuan peminjaman arsip ini melalui sistem SIPTU Digital Signature.
                  </Typography.Text>
                </div>
              </div>
            )}
          </Space>
        </Card>
      </div>

      <Modal
        title={<><SafetyCertificateOutlined /> Verifikasi Tanda Tangan Elektronik</>}
        open={passwordModal}
        onCancel={closeSignature}
        onOk={handleSubmitReturn}
        okText="Verifikasi & Tanda Tangani"
        confirmLoading={submitting}
        centered
        destroyOnClose
      >
        <div style={{ marginBottom: 16 }}>
          <Typography.Paragraph>
            Untuk mengajukan pengembalian, silakan masukkan password akun SIPTU Anda sebagai bentuk Tanda Tangan Elektronik (TTE).
          </Typography.Paragraph>
          <Input.Password
            prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
            placeholder="Masukkan password SIPTU Anda"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            size="large"
            autoFocus
            onPressEnter={handleSubmitReturn}
          />
        </div>
        <Alert
          message="Pernyataan"
          description="Dengan ini saya menyatakan secara sadar mengajukan pengembalian arsip dan menyetujui penggunaan password sebagai identitas digital saya."
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
        />
      </Modal>
    </PublicFormLayout>
  );
};

export default PublicArchiveLoanInfoPage;
