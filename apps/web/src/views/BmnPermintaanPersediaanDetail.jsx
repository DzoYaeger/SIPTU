import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { App as AntdApp, Card, Spin, Typography } from 'antd';
import { buildMessageAdapter } from '../utils/notify.js';
import { useAuth } from '../hooks/useAuth';
import { bmnService } from '../services/bmnService';
import dayjs from 'dayjs';

const BmnPermintaanPersediaanDetail = () => {
  const { id } = useParams();
  const { apiFetch } = useAuth();
  const { message } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);
  const service = bmnService(apiFetch);

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequest = async () => {
      setLoading(true);
      try {
        // Assuming bmnService will have a getRequest function
        const data = await service.getRequestByNumber(id);
        setRequest(data);
      } catch (error) {
        notification.error({
          message: 'Gagal memuat detail permintaan',
          description: error.message,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();
  }, [id, service, notification]);

  if (loading) {
    return <Spin />;
  }

  if (!request) {
    return <Typography.Text>Data permintaan tidak ditemukan.</Typography.Text>;
  }

  return (
    <Card title={`Detail Permintaan #${request.spb_number}`}>
      <p><strong>Pemohon:</strong> {request.requester?.name}</p>
      <p><strong>Tanggal Permintaan:</strong> {dayjs(request.created_at).format('DD MMM YYYY')}</p>
      <p><strong>Status:</strong> {request.status}</p>
      <h4>Barang yang diminta:</h4>
      <ul>
        {request.items?.map(item => (
          <li key={item.id}>{item.inventory?.nama_barang} (Jumlah: {item.quantity})</li>
        ))}
      </ul>
    </Card>
  );
};

export default BmnPermintaanPersediaanDetail;


