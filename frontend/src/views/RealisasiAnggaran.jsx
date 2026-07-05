import React from 'react';
import { Link } from 'react-router-dom';
import { Tabs, Space, Typography } from 'antd';
import RealisasiByDate from './RealisasiByDate';
import RealisasiByMak from './RealisasiByMak';

const RealisasiAnggaran = () => {

  return (
    <div className="module-section">
      <div className="module-toolbar">
        <div>
          <Typography.Title level={4} className="module-title">
            Realisasi Anggaran
          </Typography.Title>
          <Typography.Paragraph className="module-subtitle">
            Rincian realisasi per tanggal atau kode MAK.
          </Typography.Paragraph>
        </div>
        <Space size="small">
          {/* The search input will now be within each table column */}
        </Space>
      </div>
      <div className="table-card">
        <Tabs defaultActiveKey="1" style={{ width: '100%' }}>
          <Tabs.TabPane tab="Berdasarkan Tanggal" key="1">
            <RealisasiByDate />
          </Tabs.TabPane>
          <Tabs.TabPane tab="Berdasarkan MAK" key="2">
            <RealisasiByMak />
          </Tabs.TabPane>
        </Tabs>
      </div>
    </div>
  );
};

export default RealisasiAnggaran;