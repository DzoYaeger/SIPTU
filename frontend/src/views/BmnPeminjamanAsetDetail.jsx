import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { App as AntdApp, Card, Spin, Typography, Descriptions, Tag, Divider, Button } from 'antd';
import { buildMessageAdapter } from '../utils/notify.js';
import { useAuth } from '../hooks/useAuth.js';
import dayjs from 'dayjs';

const BmnPeminjamanAsetDetail = () => {
  const { id } = useParams();
  const { apiFetch } = useAuth();
  const { message } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);
  // const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchLoan = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch(`/bmn-loans?search=${encodeURIComponent(id)}`);
      if (!response.ok) {
        throw new Error('Gagal memuat detail peminjaman.');
      }
      const data = await response.json();
      const loan = (data ?? [])[0] ?? null;
      if (!loan) {
        setLoan(null);
      } else {
        setLoan(loan);
      }
    } catch (error) {
      notification.error({ message: 'Gagal memuat detail peminjaman', description: error.message });
    } finally {
      setLoading(false);
    }
  }, [id, apiFetch, notification]);

  useEffect(() => {
    fetchLoan();
  }, [fetchLoan]);

  if (loading) {
    return <div style={{textAlign: 'center', padding: '50px'}}><Spin size="large" /></div>;
  }

  if (!loan) {
    return <Typography.Text>Data peminjaman tidak ditemukan.</Typography.Text>;
  }

  return (
    <>
    <Card title={`Detail Peminjaman Aset`}>
        <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Nomor SPA">{loan.spa_number}</Descriptions.Item>
            <Descriptions.Item label="Status"><Tag color={loan.status === 'dikembalikan' ? 'green' : 'orange'}>{loan.status?.toUpperCase()}</Tag></Descriptions.Item>
            <Descriptions.Item label="Peminjam">{loan.borrower_name}</Descriptions.Item>
            <Descriptions.Item label="Tanggal Pinjam">{dayjs(loan.loan_date).format('DD MMMM YYYY')}</Descriptions.Item>
            <Descriptions.Item label="Tanggal Kembali">{dayjs(loan.return_date).format('DD MMMM YYYY')}</Descriptions.Item>
            <Descriptions.Item label="Alasan">{loan.notes}</Descriptions.Item>
            <Descriptions.Item label="Tanda Tangan Peminjam">
                {loan.requester_signature_token ? (
                    <Tag color="green">Terverifikasi TTE (Token: {loan.requester_signature_token})</Tag>
                ) : (
                    <img src={loan.requester_signature} alt="TTD" style={{maxHeight: 60}} />
                )}
            </Descriptions.Item>
            {loan.validator_signature_token && (
                <Descriptions.Item label="Disetujui Oleh">
                    <Tag color="green">Terverifikasi TTE (Token: {loan.validator_signature_token})</Tag>
                </Descriptions.Item>
            )}
        </Descriptions>
        <Divider>Aset yang Dipinjam</Divider>
        {loan.assets?.map((asset, index) => (
            <Card key={asset.id} size="small" style={{marginBottom: 8}}>
                <Typography.Text strong>{index + 1}. {asset.nama_barang}</Typography.Text><br />
                <Typography.Text type="secondary">Merek: {asset.merek_barang}</Typography.Text><br />
                <Typography.Text type="secondary">NUP: {asset.nup}</Typography.Text>
            </Card>
        ))}
    </Card>
    <div style={{marginTop: 20, textAlign: 'right'}}>
        <Button 
            type="primary" 
            onClick={() => window.open(`${import.meta.env.VITE_API_URL}/public/bmn-loans/${loan.token}/pdf`, '_blank')}
        >
            Unduh SPA (PDF)
        </Button>
    </div>
    </>
  );
};

export default BmnPeminjamanAsetDetail;

