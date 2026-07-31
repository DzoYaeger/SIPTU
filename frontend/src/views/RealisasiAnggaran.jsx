import React from 'react';
import { Tabs, Typography } from 'antd';
import { CalendarOutlined, AuditOutlined } from '@ant-design/icons';
import RealisasiByDate from './RealisasiByDate';
import RealisasiByMak from './RealisasiByMak';

const { Title, Paragraph } = Typography;

const RealisasiAnggaran = () => {
  const items = [
    {
      key: '1',
      label: (
        <span>
          <CalendarOutlined /> Transaksi Realisasi (Tgl / ST / INV)
        </span>
      ),
      children: <RealisasiByDate />,
    },
    {
      key: '2',
      label: (
        <span>
          <AuditOutlined /> Ringkasan Pagu & Realisasi per MAK
        </span>
      ),
      children: <RealisasiByMak />,
    },
  ];

  return (
    <div className="module-section">
      <div className="module-toolbar">
        <div>
          <Title level={4} className="module-title">
            Realisasi Anggaran
          </Title>
          <Paragraph className="module-subtitle">
            Sinkronisasi data realisasi anggaran dari Invoice Belanja (Pembelian) dan LPJ Perjalanan Dinas (Perjadin).
          </Paragraph>
        </div>
      </div>

      <div className="table-card" style={{ padding: 16 }}>
        <Tabs defaultActiveKey="1" items={items} style={{ width: '100%' }} />
      </div>
    </div>
  );
};

export default RealisasiAnggaran;