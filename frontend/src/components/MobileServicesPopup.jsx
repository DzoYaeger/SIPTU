import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileProtectOutlined,
  FundOutlined,
  ShoppingOutlined,
  ClockCircleOutlined,
  ToolOutlined,
  CloseOutlined,
  BankOutlined
} from '@ant-design/icons';
import './MobileServicesPopup.css';

const SERVICES = [
  { id: 'bmn', title: 'Aset BMN', link: '/peminjaman-aset/new', color: '#0ea5e9', emoji: '🏗️' },
  { id: 'ruangan', title: 'Ruangan', link: '/peminjaman-ruangan', color: '#6366f1', emoji: '🏢' },
  { id: 'it-helpdesk', title: 'IT Helpdesk', link: '/it-helpdesk/new', color: '#f43f5e', emoji: '🔧' },
  { id: 'persediaan', title: 'Persediaan', link: '/permintaan-persediaan/new', color: '#10b981', emoji: '📋' },
  { id: 'rispeg', title: 'Izin Keluar', link: '/izin-keluar', color: '#8b5cf6', emoji: '🚶' },
  { id: 'pengumuman-rispeg', title: 'Papan Disiplin', link: '/app/pengumuman-rispeg', color: '#ef4444', emoji: '📢' },
  { id: 'surat-tugas', title: 'Surat Tugas', link: '/surat-tugas/new', color: '#6366f1', emoji: '📝' },
  { id: 'bmn-pemeliharaan-keluhan', title: 'Pemeliharaan', link: '/bmn-pemeliharaan-keluhan/new', color: '#0d9488', emoji: '🛠️' },
  { id: 'kearsipan', title: 'Arsip', link: '/kearsipan-peminjaman/new', color: '#3b82f6', emoji: '📁' },
];

const MobileServicesPopup = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    } else {
      const timer = setTimeout(() => setIsRendered(false), 300); // Wait for animation
      document.body.style.overflow = '';
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen && !isRendered) return null;

  const handleNavigate = (link) => {
    onClose();
    setTimeout(() => {
      navigate(link);
    }, 200);
  };

  return (
    <div className={`msp-overlay ${isOpen ? 'is-open' : ''}`} onClick={onClose}>
      <div className={`msp-balloon ${isOpen ? 'is-open' : ''}`} onClick={(e) => e.stopPropagation()}>
        
        {/* Handle Bar for aesthetics */}
        <div className="msp-handle"></div>

        <div className="msp-header">
          <div className="msp-title-group">
            <h3 className="msp-title">Layanan Mandiri</h3>
            <p className="msp-subtitle">Pilih layanan yang Anda butuhkan</p>
          </div>
          <button className="msp-close-btn" onClick={onClose}>
            <CloseOutlined />
          </button>
        </div>

        <div className="msp-grid">
          {SERVICES.map((service) => (
            <button 
              key={service.id} 
              className="msp-item"
              onClick={() => handleNavigate(service.link)}
            >
              <div className="msp-item-icon-box" style={{ background: `${service.color}15`, color: service.color }}>
                <span className="msp-item-emoji">{service.emoji}</span>
              </div>
              <span className="msp-item-title">{service.title}</span>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
};

export default MobileServicesPopup;
