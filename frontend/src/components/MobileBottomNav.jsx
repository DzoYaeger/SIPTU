import React from 'react';
import { HomeOutlined, PlusOutlined, ClockCircleOutlined, UserOutlined, MenuOutlined } from '@ant-design/icons';
import './MobileBottomNav.css';

const MobileBottomNav = ({
  activeKey,
  onMenuClick,
  onOpenLayanan,
  onOpenDrawer,
  dashboardKey,
}) => {
  return (
    <div className="mobile-bottom-nav">
      <div className="mobile-bottom-nav-inner">
        
        {/* Tab 1: Home */}
        <button 
          className={`mobile-bottom-nav-item ${activeKey === dashboardKey ? 'is-active' : ''}`}
          onClick={() => onMenuClick({ key: dashboardKey })}
        >
          <div className="mobile-bottom-nav-icon"><HomeOutlined /></div>
          <span className="mobile-bottom-nav-label">Home</span>
        </button>

        {/* Tab 2: Riwayat */}
        <button 
          className={`mobile-bottom-nav-item ${activeKey === 'riwayat-layanan' ? 'is-active' : ''}`}
          onClick={() => onMenuClick({ key: 'riwayat-layanan' })}
        >
          <div className="mobile-bottom-nav-icon"><ClockCircleOutlined /></div>
          <span className="mobile-bottom-nav-label">Riwayat</span>
        </button>

        {/* Tab 3: Layanan (FAB) */}
        <div className="mobile-bottom-nav-fab-container">
          <button 
            className="mobile-bottom-nav-fab"
            onClick={onOpenLayanan}
            title="Layanan"
          >
            <PlusOutlined className="mobile-bottom-nav-fab-icon" />
          </button>
          <span className="mobile-bottom-nav-fab-label">Layanan</span>
        </div>

        {/* Tab 4: Profil */}
        <button 
          className={`mobile-bottom-nav-item ${activeKey === 'account-settings' ? 'is-active' : ''}`}
          onClick={() => onMenuClick({ key: 'account-settings' })}
        >
          <div className="mobile-bottom-nav-icon"><UserOutlined /></div>
          <span className="mobile-bottom-nav-label">Profil</span>
        </button>

        {/* Tab 5: Menu */}
        <button 
          className="mobile-bottom-nav-item"
          onClick={onOpenDrawer}
        >
          <div className="mobile-bottom-nav-icon"><MenuOutlined /></div>
          <span className="mobile-bottom-nav-label">Menu</span>
        </button>

      </div>
    </div>
  );
};

export default MobileBottomNav;
