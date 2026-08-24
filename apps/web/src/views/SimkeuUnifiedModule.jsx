import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import {
  ArrowLeftOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BankOutlined,
  FileProtectOutlined,
  CalculatorOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { Tooltip } from 'antd';
import KeuanganLpj from './KeuanganLpj.jsx';
import InvoiceBelanja from './InvoiceBelanja.jsx';
import PermintaanPanjar from './PermintaanPanjar.jsx';
import simkeuIcon from '../assets/icons/simkeu-icon.png';

import './SimkeuUnifiedModule.css';

const SimkeuUnifiedModule = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('lpj');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const menuItems = [
    {
      group: 'KEUANGAN',
      items: [
        {
          key: 'lpj',
          label: 'Pembuatan / Kelola LPJ',
          icon: <FileProtectOutlined />,
        },
        {
          key: 'panjar',
          label: 'Permintaan Panjar',
          icon: <WalletOutlined />,
        },
        {
          key: 'invoice',
          label: 'Pembuatan / Kelola Invoice Belanja',
          icon: <CalculatorOutlined />,
        },
      ],
    },
  ];

  return (
    <div className="simkeu-module">
      {/* ── Sub-Sidebar Navigation SIMKEU ── */}
      <aside className={`simkeu-sidebar ${sidebarCollapsed ? 'simkeu-sidebar--collapsed' : 'simkeu-sidebar--expanded'}`}>
        {/* Module Title Header */}
        <div className={`simkeu-sidebar-header ${sidebarCollapsed ? 'simkeu-sidebar-header--collapsed' : ''}`}>
          <div className={`simkeu-sidebar-header__top ${sidebarCollapsed ? 'simkeu-sidebar-header__top--collapsed' : ''}`}>
            <div className="simkeu-sidebar-brand">
              <div className="simkeu-sidebar-brand__icon">
                <img src={simkeuIcon} alt="SIMKEU" style={{ width: 34, height: 34, objectFit: "contain" }} />
              </div>
              {!sidebarCollapsed && (
                <div>
                  <h2 className="simkeu-sidebar-brand__title">SIMKEU</h2>
                  <span className="simkeu-sidebar-brand__subtitle">
                    Sistem Informasi Keuangan
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? "Tampilkan Sidebar" : "Sembunyikan Sidebar"}
              className="simkeu-toggle-btn"
            >
              {sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
          </div>
        </div>

        {/* Sidebar Menu Items */}
        <div className={`simkeu-sidebar-menu ${sidebarCollapsed ? 'simkeu-sidebar-menu--collapsed' : ''}`}>
          {menuItems.map((group, idx) => (
            <div key={idx} className={`simkeu-menu-group ${sidebarCollapsed ? 'simkeu-menu-group--collapsed' : ''}`}>
              {!sidebarCollapsed && (
                <div className="simkeu-menu-group__label">
                  {group.group}
                </div>
              )}
              {group.items.map((item) => {
                const isActive = activeTab === item.key;
                const buttonContent = (
                  <button
                    key={item.key}
                    onClick={() => setActiveTab(item.key)}
                    className={`simkeu-menu-item ${isActive ? 'simkeu-menu-item--active' : ''} ${sidebarCollapsed ? 'simkeu-menu-item--collapsed' : ''}`}
                  >
                    <span className="simkeu-menu-item__icon">
                      {item.icon}
                    </span>
                    {!sidebarCollapsed && (
                      <span className="simkeu-menu-item__label">
                        {item.label}
                      </span>
                    )}
                  </button>
                );

                return sidebarCollapsed ? (
                  <Tooltip key={item.key} title={item.label} placement="right">
                    {buttonContent}
                  </Tooltip>
                ) : (
                  buttonContent
                );
              })}
            </div>
          ))}
        </div>

        {/* Sidebar Footer — Back Button */}
        <div className={`simkeu-sidebar-footer ${sidebarCollapsed ? 'simkeu-sidebar-footer--collapsed' : ''}`}>
          {sidebarCollapsed ? (
            <Tooltip title="Kembali ke Layanan Mandiri" placement="right">
              <a href="/app/layanan-mandiri" className="simkeu-back-btn simkeu-back-btn--collapsed">
                <ArrowLeftOutlined style={{ fontSize: 13 }} />
              </a>
            </Tooltip>
          ) : (
            <a href="/app/layanan-mandiri" className="simkeu-back-btn">
              <ArrowLeftOutlined style={{ fontSize: 11 }} /> Kembali ke Layanan Mandiri
            </a>
          )}
        </div>
      </aside>

      {/* ── Main Dynamic Workspace ── */}
      <main className="simkeu-main">
        {activeTab === 'lpj' && <KeuanganLpj />}
        {activeTab === 'panjar' && <PermintaanPanjar />}
        {activeTab === 'invoice' && <InvoiceBelanja />}
      </main>
    </div>
  );
};

export default SimkeuUnifiedModule;
