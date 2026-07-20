import { useMemo, useState, useEffect } from "react";
import { Dropdown, Space, Typography, Button, Drawer, Divider, Modal } from "antd";
import {
  AppstoreOutlined,
  BarChartOutlined,
  CustomerServiceOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  FormOutlined,
  HddOutlined,
  InboxOutlined,
  InteractionOutlined,
  KeyOutlined,
  LogoutOutlined,
  MenuOutlined,
  ScheduleOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  SolutionOutlined,
  SwitcherOutlined,
  TeamOutlined,
  ToolOutlined,
  UserOutlined,
  DownOutlined,
  AuditOutlined,
  ClockCircleOutlined,
  ExportOutlined,
  CalendarOutlined,
  BellOutlined,
  HistoryOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  CarOutlined,
  DollarCircleOutlined,
  FileDoneOutlined,
  FundOutlined,
  FundProjectionScreenOutlined,
  MonitorOutlined,
} from "@ant-design/icons";
import PropTypes from "prop-types";
import MobileBottomNav from "./MobileBottomNav.jsx";
import MobileHeader from "./MobileHeader.jsx";
import MobileServicesPopup from "./MobileServicesPopup.jsx";
import { usePWAInstall } from "../hooks/usePWAInstall.js";
import "./NavbarMenu.css";

const iconMap = {
  dashboard: <DashboardOutlined />,
  kepegawaian: <TeamOutlined />,
  "kepegawaian-bangkom": <FileProtectOutlined />,
  kearsipan: <FileProtectOutlined />,
  "kearsipan-peminjaman": <FolderOpenOutlined />,
  "kearsipan-pencatatan-surat": <FormOutlined />,
  "kearsipan-arsip-vital": <SafetyCertificateOutlined />,
  "kearsipan-manajemen-up-uk": <FileProtectOutlined />,
  "kearsipan-laporan": <FileTextOutlined />,
  "kepegawaian-data-pegawai": <SolutionOutlined />,
  "kepegawaian-kgb": <ScheduleOutlined />,
  "kepegawaian-kalender": <CalendarOutlined />,
  "kepegawaian-surat-tugas": <FileProtectOutlined />,
  keuangan: <DollarCircleOutlined />,
  "keuangan-anggaran": <FundProjectionScreenOutlined />,
  "keuangan-realisasi": <FileDoneOutlined />,
  "keuangan-revisi": <FileTextOutlined />,
  "keuangan-invoice": <FileTextOutlined />,
  "keuangan-realisasi-anggaran": <FundOutlined />,
  "keuangan-lpj": <FileTextOutlined />,
  "keuangan-pejabat": <UserOutlined />,
  perjadin: <CarOutlined />,
  "perjadin-st": <FileTextOutlined />,
  "perjadin-lpj": <FileDoneOutlined />,
  "perjadin-monitoring": <MonitorOutlined />,
  bmn: <AppstoreOutlined />,
  "bmn-data-aset-tetap": <HddOutlined />,
  "bmn-data-persediaan": <InboxOutlined />,
  "bmn-permintaan-persediaan": <ShoppingCartOutlined />,
  "bmn-peminjaman-aset": <InteractionOutlined />,
  "bmn-pemeliharaan-keluhan": <ToolOutlined />,
  "bmn-laporan": <BarChartOutlined />,
  "layanan-mandiri": <CustomerServiceOutlined />,
  "riwayat-layanan": <ClockCircleOutlined />,
  "it-helpdesk": <ToolOutlined />,
  "it-helpdesk-pelaporan": <FormOutlined />,
  "it-helpdesk-rekapan": <DatabaseOutlined />,
  "pengadaan-pdtt": <ShoppingCartOutlined />,
  "pengadaan-pbj": <AuditOutlined />,
  "pengadaan-pdtt-katalog": <AppstoreOutlined />,
  "pengadaan-pdtt-rekapan": <FileTextOutlined />,
  "pengadaan-pdtt-pengajuan-pdtt": <ShoppingCartOutlined />,
  "pengelola-pegawai-pdtt": <TeamOutlined />,
  "admin-user-management": <TeamOutlined />,
  "admin-notification-settings": <BellOutlined />,
  "operator-dashboard": <DashboardOutlined />,
  "validator-dashboard": <DashboardOutlined />,
  rispeg: <AuditOutlined />,
  "rispeg-ruh": <FormOutlined />,
  "rispeg-dashboard": <DashboardOutlined />,
  "rispeg-izin-keluar": <ExportOutlined />,
  "rispeg-pengaturan-izin-keluar": <SettingOutlined />,
};

const NavbarMenu = ({
  activeKey,
  onMenuClick,
  modules,
  allowedSlugs,
  isAdmin,
  extraItems = [],
  user,
  currentRole,
  profileMenu,
  isSwitchingRole,
  roleLabel,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isServicesPopupOpen, setIsServicesPopupOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [showFloatingInstall, setShowFloatingInstall] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  const { installPrompt, triggerInstall } = usePWAInstall();

  useEffect(() => {
    const isDismissed = localStorage.getItem("pwa-install-dismissed") === "true";
    if (isDismissed) {
      setShowFloatingInstall(false);
      return;
    }

    // Detect iOS (iPhone, iPad, iPod)
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    // Detect if already installed as standalone (PWA)
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    setIsIOSDevice(isIOS);

    if (isIOS && !isStandalone) {
      // iOS Safari: show button even without installPrompt
      setShowFloatingInstall(true);
    } else if (installPrompt) {
      // Chromium / Android browsers
      setShowFloatingInstall(true);
    } else {
      setShowFloatingInstall(false);
    }
  }, [installPrompt]);

  const handleCloseFloating = (e) => {
    e.stopPropagation();
    localStorage.setItem("pwa-install-dismissed", "true");
    setShowFloatingInstall(false);
  };

  const [expandedModules, setExpandedModules] = useState({});

  const toggleModuleExpand = (slug) => {
    setExpandedModules((prev) => ({
      ...prev,
      [slug]: !prev[slug],
    }));
  };

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const controlNavbar = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down
        setIsVisible(false);
      } else {
        // Scrolling up
        setIsVisible(true);
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", controlNavbar);
    return () => {
      window.removeEventListener("scroll", controlNavbar);
    };
  }, []);

  const allowedSet = useMemo(() => new Set(allowedSlugs ?? []), [allowedSlugs]);

  const isAllowed = (slug) => {
    if (slug === "layanan-mandiri" || slug === "riwayat-layanan") return true;
    return isAdmin || allowedSet.has(slug);
  };

  const buildDropdownItems = (mod) => {
    if (!mod.children || mod.children.length === 0) return null;
    return mod.children
      .filter((child) => isAllowed(child.slug))
      .map((child) => ({
        key: child.slug,
        label: child.name,
        icon: iconMap[child.slug],
      }));
  };

  const visibleModules = useMemo(() => {
    return (modules ?? []).filter((mod) => {
      if (mod.children && mod.children.length > 0) {
        return mod.children.some((c) => isAllowed(c.slug));
      }
      return isAllowed(mod.slug);
    });
  }, [modules, isAdmin, allowedSet]);

  useEffect(() => {
    if (activeKey && visibleModules) {
      const parentModule = visibleModules.find(
        (mod) => mod.children && mod.children.some((c) => c.slug === activeKey)
      );
      if (parentModule) {
        setExpandedModules((prev) => ({
          ...prev,
          [parentModule.slug]: true,
        }));
      }
    }
  }, [activeKey, visibleModules]);

  const adminMenuItems = useMemo(() => {
    if (!isAdmin) return [];
    return extraItems.map((item) => ({
      key: item.key,
      label: item.label,
      icon: item.icon,
    }));
  }, [isAdmin, extraItems]);

  const dashboardKey =
    currentRole === "operator"
      ? "operator-dashboard"
      : currentRole === "validator"
      ? "validator-dashboard"
      : "dashboard";

  const handleMobileMenuClick = (key) => {
    onMenuClick({ key });
    setIsDrawerOpen(false);
  };

  return (
    <>
    <MobileHeader 
      user={user} 
      roleLabel={roleLabel} 
      isSwitchingRole={isSwitchingRole}
      profileMenu={profileMenu}
      onMenuClick={onMenuClick} 
    />
    <nav className={`app-navbar ${!isVisible ? "is-hidden" : ""}`}>
      <div className="app-navbar__inner">
        {/* Brand */}
        <div
          className="app-navbar__brand"
          onClick={() => onMenuClick({ key: dashboardKey })}
        >
          <img
            src="/logo/logo-samping.png"
            alt="Logo SIPTU"
            className="app-navbar__logo-image"
          />
        </div>

        {/* Desktop navigation links */}
        <div className="app-navbar__links">
          {visibleModules.map((mod) => {
            const children = buildDropdownItems(mod);
            const isActive =
              activeKey === mod.slug ||
              (mod.children ?? []).some((c) => activeKey === c.slug);

            if (children && children.length > 0) {
              return (
                <Dropdown
                  key={mod.slug}
                  menu={{
                    items: children,
                    onClick: onMenuClick,
                    selectedKeys: [activeKey],
                  }}
                  placement="bottomLeft"
                  trigger={["click"]}
                >
                  <button
                    className={`app-navbar__link ${isActive ? "is-active" : ""}`}
                  >
                    {iconMap[mod.slug]} <span>{mod.name}</span>{" "}
                    <DownOutlined className="app-navbar__caret" />
                  </button>
                </Dropdown>
              );
            }

            return (
              <button
                key={mod.slug}
                className={`app-navbar__link ${activeKey === mod.slug ? "is-active" : ""}`}
                onClick={() => onMenuClick({ key: mod.slug })}
              >
                {iconMap[mod.slug]} <span>{mod.name}</span>
              </button>
            );
          })}
        </div>

        {/* Right side: admin gear + profile */}
        <div className="app-navbar__right">
          {adminMenuItems.length > 0 && (
            <Dropdown
              menu={{ items: adminMenuItems, onClick: onMenuClick }}
              placement="bottomRight"
              trigger={["click"]}
            >
              <button className="app-navbar__icon-btn" title="Pengaturan Admin">
                <SettingOutlined />
              </button>
            </Dropdown>
          )}

          <Dropdown
            menu={profileMenu}
            placement="bottomRight"
            trigger={["click"]}
            overlayStyle={{ minWidth: 200 }}
          >
            <button className="app-navbar__profile" disabled={isSwitchingRole}>
              <div className="app-navbar__avatar" style={{ overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {user?.employee?.avatar_url ? (
                  <img 
                    src={user.employee.avatar_url} 
                    alt={user.name} 
                    style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                  />
                ) : (
                  <UserOutlined />
                )}
              </div>
              <div className="app-navbar__user-info">
                <span className="app-navbar__user-name">{user?.name}</span>
                <span className="app-navbar__user-role">{roleLabel}</span>
              </div>
              <DownOutlined className="app-navbar__caret" />
            </button>
          </Dropdown>

          {/* Mobile Hamburger Trigger */}
          <button
            className="app-navbar__mobile-trigger-btn"
            onClick={() => setIsDrawerOpen(true)}
          >
            <MenuOutlined />
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        <Drawer
          title={
            <div className="mobile-drawer-header">
              <img src="/logo/logo-samping.png" alt="SIPTU" className="mobile-drawer-logo" />
            </div>
          }
          placement="right"
          onClose={() => setIsDrawerOpen(false)}
          open={isDrawerOpen}
          width={280}
          className="app-mobile-drawer"
          extra={
            <Space>
               <Button type="text" icon={<SettingOutlined />} onClick={() => handleMobileMenuClick("account-settings")} />
            </Space>
          }
        >
          <div className="mobile-drawer-content">
             {visibleModules.map((mod) => {
              const children = buildDropdownItems(mod);
              const hasChildren = children && children.length > 0;
              const isExpanded = !!expandedModules[mod.slug];
              const isActive =
                activeKey === mod.slug ||
                (mod.children ?? []).some((c) => activeKey === c.slug);

              if (hasChildren) {
                return (
                  <div key={mod.slug} className={`mobile-drawer-group ${isExpanded ? 'is-expanded' : ''}`}>
                    <button 
                      className={`mobile-drawer-group-header ${isActive ? 'is-active' : ''}`}
                      onClick={() => toggleModuleExpand(mod.slug)}
                    >
                      <span className="mobile-drawer-group-icon">{iconMap[mod.slug]}</span>
                      <span className="mobile-drawer-group-text">{mod.name}</span>
                      <DownOutlined className="mobile-drawer-group-arrow" />
                    </button>
                    <div className="mobile-drawer-group-children">
                      {children.map((child) => (
                        <button
                          key={child.key}
                          className={`mobile-drawer-item ${activeKey === child.key ? "is-active" : ""}`}
                          onClick={() => handleMobileMenuClick(child.key)}
                        >
                          <span className="mobile-drawer-item-icon">{child.icon}</span>
                          <span className="mobile-drawer-item-text">{child.label}</span>
                          <RightOutlined className="mobile-drawer-item-arrow" />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <button
                  key={mod.slug}
                  className={`mobile-drawer-item standalone ${activeKey === mod.slug ? "is-active" : ""}`}
                  onClick={() => handleMobileMenuClick(mod.slug)}
                >
                  <span className="mobile-drawer-item-icon">{iconMap[mod.slug]}</span>
                  <span className="mobile-drawer-item-text">{mod.name}</span>
                  <RightOutlined className="mobile-drawer-item-arrow" />
                </button>
              );
            })}

            {adminMenuItems.length > 0 && (
              <>
                <Divider />
                <div className="mobile-drawer-group-title">Administrasi</div>
                {adminMenuItems.map((item) => (
                  <button
                    key={item.key}
                    className={`mobile-drawer-item standalone ${activeKey === item.key ? "is-active" : ""}`}
                    onClick={() => handleMobileMenuClick(item.key)}
                  >
                    <span className="mobile-drawer-item-icon">{item.icon}</span>
                    <span className="mobile-drawer-item-text">{item.label}</span>
                    <RightOutlined className="mobile-drawer-item-arrow" />
                  </button>
                ))}
              </>
            )}

            {installPrompt && (
              <>
                <Divider />
                <button
                  className="mobile-drawer-item"
                  style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', borderRadius: 12, margin: '0 12px', width: 'calc(100% - 24px)', color: 'white', padding: '12px 20px', display: 'flex', justifyContent: 'center' }}
                  onClick={async () => {
                    await triggerInstall();
                    setIsDrawerOpen(false);
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 14 }}>🚀 Install Aplikasi SIPTU</span>
                </button>
              </>
            )}
            
            <Divider />
            <button
               className="mobile-drawer-item logout-btn"
               onClick={() => { setIsDrawerOpen(false); profileMenu.onClick({ key: "logout" }); }}
            >
               <span className="mobile-drawer-item-icon"><LogoutOutlined /></span>
               <span className="mobile-drawer-item-text">Keluar</span>
            </button>
          </div>
        </Drawer>
      </div>
    </nav>
    <MobileBottomNav 
        activeKey={activeKey}
        onMenuClick={onMenuClick}
        onOpenLayanan={() => setIsServicesPopupOpen(true)}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        dashboardKey={dashboardKey}
    />
    <MobileServicesPopup 
      isOpen={isServicesPopupOpen}
      onClose={() => setIsServicesPopupOpen(false)}
    />
    {showFloatingInstall && (
      <div 
        className="pwa-floating-install"
        onClick={() => {
          if (isIOSDevice) {
            setShowIOSInstructions(true);
          } else {
            triggerInstall();
          }
        }}
        title="Install SIPTU"
      >
        <img 
          src="/logo/favicon.png" 
          alt="SIPTU Icon" 
          className="pwa-floating-install__icon"
        />
        <button 
          className="pwa-floating-install__close"
          onClick={handleCloseFloating}
          title="Tutup"
        >
          ×
        </button>
      </div>
    )}

    {/* iOS Safari PWA Installation Instructions Modal */}
    <Modal
      open={showIOSInstructions}
      onCancel={() => setShowIOSInstructions(false)}
      footer={null}
      centered
      width={340}
      className="pwa-ios-modal"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo/favicon.png" alt="SIPTU" style={{ width: 28, height: 28, borderRadius: 6 }} />
          <span style={{ fontSize: 15, fontWeight: 700 }}>Instal SIPTU</span>
        </div>
      }
    >
      <div style={{ padding: '8px 0' }}>
        <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>
          Tambahkan SIPTU ke layar utama iPhone/iPad Anda untuk akses lebih cepat tanpa perlu membuka browser.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #3b82f6, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 18 }}>📤</span>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', marginBottom: 2 }}>Langkah 1</div>
              <div style={{ fontSize: 13, color: '#475569' }}>Ketuk ikon <strong>Bagikan</strong> (Share) di bagian bawah browser Safari.</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 18 }}>➕</span>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', marginBottom: 2 }}>Langkah 2</div>
              <div style={{ fontSize: 13, color: '#475569' }}>Gulir ke bawah dan pilih <strong>"Tambahkan ke Layar Utama"</strong> (Add to Home Screen).</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 18 }}>✅</span>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', marginBottom: 2 }}>Langkah 3</div>
              <div style={{ fontSize: 13, color: '#475569' }}>Ketuk <strong>"Tambahkan"</strong> di pojok kanan atas. Selesai!</div>
            </div>
          </div>
        </div>
        <button
          style={{ marginTop: 24, width: '100%', padding: '12px', borderRadius: 12, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: 'white', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
          onClick={() => setShowIOSInstructions(false)}
        >
          Mengerti
        </button>
      </div>
    </Modal>
    </>
  );
};

NavbarMenu.propTypes = {
  activeKey: PropTypes.string,
  onMenuClick: PropTypes.func,
  modules: PropTypes.array,
  allowedSlugs: PropTypes.array,
  isAdmin: PropTypes.bool,
  extraItems: PropTypes.array,
  user: PropTypes.object,
  currentRole: PropTypes.string,
  profileMenu: PropTypes.object,
  isSwitchingRole: PropTypes.bool,
  roleLabel: PropTypes.string,
};

export default NavbarMenu;
