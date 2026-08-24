import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  App as AntdApp,
  Button,
  Card,
  Result,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import SignatureModal from '../components/SignatureModal.jsx';
import './PublicLoanPage.css';
import { archiveLoanStore } from '../utils/archiveLoanStore.js';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

const statusMap = {
  menunggu_paraf: { color: 'orange', text: 'Menunggu Tanda Tangan' },
  dipinjam: { color: 'blue', text: 'Dipinjam' },
  menunggu_paraf_kembali: { color: 'gold', text: 'Proses Pengembalian' },
  dikembalikan: { color: 'green', text: 'Dikembalikan' },
};

const formatDate = (value) => {
  if (!value) {
    return '-';
  }
  return dayjs(value).format('DD MMMM YYYY');
};

function PublicLoanPage() {
  const { token } = useParams();
  const { message } = AntdApp.useApp();

  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalState, setModalState] = useState({ open: false, type: null });
  const [submitting, setSubmitting] = useState(false);
  const [tokenContext, setTokenContext] = useState(null);

  const fetchLoan = useCallback(async () => {
    if (!token) {
      setError('Tautan tidak valid.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/public/archive-loans/${token}`, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message ?? 'Tautan peminjaman tidak ditemukan.');
      }

      const data = await response.json();
      setPayload(data);
      setTokenContext(null);
    } catch (err) {
      const localResult = archiveLoanStore.findByToken(token);
      if (localResult?.loan) {
        const { loan, tokenType } = localResult;
        const canSignBorrowing = tokenType === 'public'
          && loan.status === 'menunggu_paraf'
          && !loan.signatures.some((sig) => sig.type === 'borrowing' && sig.role === 'borrower');
        const canSignReturning = tokenType === 'return'
          && loan.status === 'menunggu_paraf_kembali'
          && !loan.signatures.some((sig) => sig.type === 'returning' && sig.role === 'borrower');
        setPayload({ loan, actions: { can_sign_borrowing: canSignBorrowing, can_sign_returning: canSignReturning } });
        setTokenContext(tokenType);
        setError(null);
      } else {
        console.error(err);
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLoan();
  }, [fetchLoan]);

  const loan = payload?.loan;
  const actions = payload?.actions ?? { can_sign_borrowing: false, can_sign_returning: false };

  const statusDescriptor = useMemo(() => {
    if (!loan) {
      return null;
    }
    return statusMap[loan.status] ?? { color: 'default', text: loan.status };
  }, [loan]);

  const handleOpenModal = useCallback((type) => {
    setModalState({ open: true, type });
  }, []);

  const handleCloseModal = useCallback(() => {
    if (submitting) return;
    setModalState({ open: false, type: null });
  }, [submitting]);

  const handleSubmitSignature = useCallback(async (signature) => {
    if (!modalState.type) {
      return;
    }

    setSubmitting(true);
    try {
      if (tokenContext) {
        const localResult = archiveLoanStore.findByToken(token);
        if (!localResult?.loan) {
          throw new Error('Tautan peminjaman tidak ditemukan.');
        }
        const desiredType = tokenContext === 'return' ? 'returning' : 'borrowing';
        const updated = archiveLoanStore.saveSignature(localResult.loan.id, {
          signature,
          type: desiredType,
          role: 'borrower',
        });
        if (!updated) {
          throw new Error('Gagal menyimpan tanda tangan.');
        }
        const canSignBorrowing = tokenContext === 'public'
          && updated.status === 'menunggu_paraf'
          && !updated.signatures.some((sig) => sig.type === 'borrowing' && sig.role === 'borrower');
        const canSignReturning = tokenContext === 'return'
          && updated.status === 'menunggu_paraf_kembali'
          && !updated.signatures.some((sig) => sig.type === 'returning' && sig.role === 'borrower');
        setPayload({ loan: updated, actions: { can_sign_borrowing: canSignBorrowing, can_sign_returning: canSignReturning } });
        setModalState({ open: false, type: null });
        message.success('Tanda tangan berhasil disimpan.');
        return;
      }

      const response = await fetch(`${API_URL}/public/archive-loans/${token}/signatures`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          signature,
          type: modalState.type,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message ?? 'Gagal menyimpan tanda tangan.');
      }

      setPayload(data);
      setModalState({ open: false, type: null });
      message.success('Tanda tangan berhasil disimpan.');
    } catch (err) {
      console.error(err);
      message.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }, [modalState.type, token, message, tokenContext]);

  if (loading) {
    return (
      <div className="public-loan__centered">
        <Spin tip="Memuat informasi peminjaman..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="public-loan__centered">
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
      <div className="public-loan__centered">
        <Result
          status="404"
          title="Data tidak ditemukan"
          subTitle="Informasi peminjaman tidak tersedia. Pastikan Anda menggunakan tautan yang benar."
        />
      </div>
    );
  }

  const unitPengolah = loan.unit_pengolah;

  return (
    <div className="public-loan">
      <Card className="public-loan__card" title="Informasi Peminjaman Arsip">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div className="public-loan__info">
            <Typography.Text type="secondary">Tanggal Pinjam</Typography.Text>
            <Typography.Title level={4} className="public-loan__value">
              {formatDate(loan.borrow_date)}
            </Typography.Title>
          </div>

          <div className="public-loan__info">
            <Typography.Text type="secondary">Nomor Arsip</Typography.Text>
            <Typography.Title level={4} className="public-loan__value">
              {loan.archive_number}
            </Typography.Title>
          </div>

          <div className="public-loan__info">
            <Typography.Text type="secondary">Status</Typography.Text>
            <Tag color={statusDescriptor?.color ?? 'default'} className="public-loan__status-tag">
              {statusDescriptor?.text ?? loan.status}
            </Tag>
          </div>

          <div className="public-loan__info">
            <Typography.Text type="secondary">Unit Pengolah</Typography.Text>
            {unitPengolah ? (
              <div>
                <Typography.Title level={5} className="public-loan__value">
                  {unitPengolah.nama}
                </Typography.Title>
                {unitPengolah.fungsi_bidang && (
                  <Typography.Text type="secondary">{unitPengolah.fungsi_bidang}</Typography.Text>
                )}
              </div>
            ) : (
              <Typography.Text className="public-loan__value">Belum ditentukan</Typography.Text>
            )}
          </div>

          <div className="public-loan__actions">
            {actions.can_sign_borrowing && (
              <Button type="primary" size="large" onClick={() => handleOpenModal('borrowing')}>
                Tanda Tangan Peminjaman
              </Button>
            )}
            {actions.can_sign_returning && (
              <Button
                type="primary"
                danger
                size="large"
                onClick={() => handleOpenModal('returning')}
              >
                Tanda Tangan Pengembalian
              </Button>
            )}
            {!actions.can_sign_borrowing && !actions.can_sign_returning && (
              <Typography.Text type="secondary">
                Tidak ada tindakan yang perlu Anda lakukan saat ini.
              </Typography.Text>
            )}
          </div>
        </Space>
      </Card>

      <SignatureModal
        open={modalState.open}
        onCancel={handleCloseModal}
        onOk={handleSubmitSignature}
        confirmLoading={submitting}
      />
    </div>
  );
}

export default PublicLoanPage;
