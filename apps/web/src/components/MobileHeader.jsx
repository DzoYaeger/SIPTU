import React, { useState } from 'react';
import { Modal } from 'antd';
import { SwapOutlined, CheckOutlined } from '@ant-design/icons';
import './MobileHeader.css';

const MobileHeader = ({ user, roleLabel, isSwitchingRole, profileMenu, onMenuClick }) => {

  const [showRoleModal, setShowRoleModal] = useState(false);

  // Get position from user object
  const getPosition = () => {
    if (!user) return 'Staff';
    return user.employee?.position || user.jabatan || user.employee?.department || user.employee?.function_area || user.unit || user.function_area || 'Staff';
  };

  // Extract role items from profileMenu (the 'roles' children group)
  const getRoleItems = () => {
    if (!profileMenu?.items) return [];
    const rolesGroup = profileMenu.items.find(item => item.key === 'roles');
    return rolesGroup?.children ?? [];
  };

  const handleSwitchRole = () => {
    const roles = getRoleItems();
    if (roles.length <= 1) return; // Nothing to switch to
    setShowRoleModal(true);
  };

  const handleSelectRole = (roleKey) => {
    setShowRoleModal(false);
    if (profileMenu?.onClick) {
      profileMenu.onClick({ key: roleKey });
    }
  };

  return (
    <>
    <div className="mobile-header">
      <div className="mobile-header-inner">

        {/* Left: Wave + Name + Position */}
        <div className="mobile-header-left">
          <span className="mobile-header-wave">👋</span>
          <div className="mobile-header-info">
            <span className="mobile-header-name">{user?.name || 'Pengguna'}</span>
            <span className="mobile-header-position">{getPosition()}</span>
          </div>
        </div>

        {/* Right: Active Level + Switch Button */}
        <div className="mobile-header-right">
          <div className="mobile-header-role-badge">
            <span className="mobile-header-role-label">{roleLabel || 'Pegawai'}</span>
            <button
              className="mobile-header-switch-btn"
              onClick={handleSwitchRole}
              disabled={isSwitchingRole || getRoleItems().length <= 1}
              title="Ganti Level"
            >
              <SwapOutlined className="mobile-header-switch-icon" />
            </button>
          </div>
        </div>

      </div>
    </div>

    {/* Role Switcher Modal */}
    <Modal
      open={showRoleModal}
      onCancel={() => setShowRoleModal(false)}
      footer={null}
      centered
      width={320}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SwapOutlined style={{ color: '#4F46E5', fontSize: 18 }} />
          <span style={{ fontSize: 15, fontWeight: 700 }}>Ganti Level Akses</span>
        </div>
      }
    >
      <div style={{ padding: '4px 0 8px' }}>
        <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 16 }}>Pilih level yang ingin Anda aktifkan:</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {getRoleItems().map((roleItem) => {
            const isActive = roleItem.disabled;
            return (
              <button
                key={roleItem.key}
                onClick={() => !isActive && handleSelectRole(roleItem.key)}
                disabled={isActive || isSwitchingRole}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  borderRadius: 14,
                  border: isActive ? '2px solid #4F46E5' : '1.5px solid rgba(229,231,235,0.8)',
                  background: isActive ? 'rgba(79,70,229,0.06)' : 'white',
                  cursor: isActive ? 'default' : 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: 'inherit',
                }}
              >
                <span style={{ fontWeight: isActive ? 700 : 600, fontSize: 14, color: isActive ? '#4F46E5' : '#1e293b' }}>
                  {roleItem.label}
                </span>
                {isActive && <CheckOutlined style={{ color: '#4F46E5', fontSize: 16 }} />}
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
    </>
  );
};

export default MobileHeader;
