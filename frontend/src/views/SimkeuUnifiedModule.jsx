import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import {
  ArrowLeftOutlined,
  DollarOutlined,
  FileProtectOutlined,
  CalculatorOutlined,
  BankOutlined,
  CheckCircleFilled,
  InfoCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { Typography, Tabs, Card } from 'antd';
import KeuanganLpj from './KeuanganLpj.jsx';
import InvoiceBelanja from './InvoiceBelanja.jsx';

import './SimkeuUnifiedModule.css';

const { Title, Text } = Typography;

const SimkeuUnifiedModule = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('lpj');

  return (
    <div className="simkeu-unified-container">
      {/* ── Top Corporate Header ── */}
      <header className="simkeu-header">
        <div className="simkeu-header-content">
          <div className="simkeu-header-left">
            <button
              className="simkeu-back-btn"
              onClick={() => navigate('/app/layanan-mandiri')}
              title="Kembali ke Layanan Mandiri"
            >
              <ArrowLeftOutlined />
            </button>

            <div className="simkeu-brand-wrap">
              <div className="simkeu-brand-icon">
                <BankOutlined />
              </div>
              <div>
                <div className="simkeu-brand-title">
                  SIMKEU <span className="simkeu-badge">Sistem Informasi Keuangan</span>
                </div>
                <div className="simkeu-brand-subtitle">
                  Layanan Mandiri Keuangan BPOM di Palopo — Pembuatan LPJ & Invoice Belanja
                </div>
              </div>
            </div>
          </div>

          <div className="simkeu-header-user">
            <Text style={{ fontSize: 12, color: '#64748b' }}>Pengguna Aktif:</Text>
            <Text strong style={{ fontSize: 13, color: '#0f172a' }}>
              {user?.name || 'Pegawai'}
            </Text>
          </div>
        </div>
      </header>

      {/* ── Sub Navigation Tabs ── */}
      <div className="simkeu-body">
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key)}
          type="line"
          className="simkeu-tabs"
          items={[
            {
              key: 'lpj',
              label: (
                <span className="simkeu-tab-label">
                  <FileProtectOutlined /> Pembuatan & Kelola LPJ
                </span>
              ),
              children: (
                <div className="simkeu-tab-content">
                  <KeuanganLpj />
                </div>
              ),
            },
            {
              key: 'invoice',
              label: (
                <span className="simkeu-tab-label">
                  <CalculatorOutlined /> Pembuatan & Kelola Invoice Belanja
                </span>
              ),
              children: (
                <div className="simkeu-tab-content">
                  <InvoiceBelanja />
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
};

export default SimkeuUnifiedModule;
