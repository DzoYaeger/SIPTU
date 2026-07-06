import React, { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  App as AntdApp,
  Drawer,
  Avatar,
  Badge,
  Button,
  Divider,
} from "antd";
import {
  HomeOutlined,
  HistoryOutlined,
  PlusOutlined,
  UserOutlined,
  MenuOutlined,
  LeftOutlined,
  BellOutlined,
  LogoutOutlined,
  SettingOutlined,
  SwitcherOutlined,
  RightOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import "./MobileAppShell.css";
import "./MobileNativeApp.css";

const MobileAppShell = ({
  activeKey,
  onMenuClick,
  modules,
  allowedSlugs,
  isAdmin,
  user,
  currentRole,
  profileMenu,
  initialAppPath,
  logout,
  children,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);

  // Dynamic header title and back button logic
  const isRootPage = ["layanan-mandiri", "dashboard", "validator-dashboard", "operator-dashboard"].includes(activeKey);

  const pageTitle = useMemo(() => {
    switch (activeKey) {
      case "layanan-mandiri":
        return "SIPTU Mobile";
      case "dashboard":
      case "validator-dashboard":
      case "operator-dashboard":
        return "Dashboard";
      case "riwayat-layanan":
        return "Riwayat Layanan";
      case "account-settings":
        return "Pengaturan Akun";
      case "rispeg-dashboard":
        return "RISPEG - Dashboard";
      case "rispeg-ruh":
        return "RISPEG - Input Data";
      case "rispeg-izin-keluar":
        return "Monitoring Izin";
      case "kepegawaian-data-pegawai":
        return "Data Pegawai";
      case "kepegawaian-kgb":
        return "KGB";
      case "kepegawaian-kalender":
        return "Kalender Kegiatan";
      case "kepegawaian-surat-tugas":
        return "Surat Tugas";
      case "bmn-data-aset-tetap":
        return "Aset Tetap";
      case "bmn-data-persediaan":
        return "Data Persediaan";
      case "bmn-permintaan-persediaan":
        return "Permintaan Persediaan";
      case "bmn-peminjaman-aset":
        return "Peminjaman Aset";
      case "bmn-pemeliharaan-keluhan":
        return "Keluhan BMN";
      case "it-helpdesk-pelaporan":
        return "Lapor Keluhan IT";
      case "it-helpdesk-rekapan":
        return "Tiket IT Helpdesk";
      default:
        return "SIPTU";
    }
  }, [activeKey]);

  // Mobile drawer services mapping (Layanan Mandiri items only)
  const mobileDrawerServices = [
    { name: "Peminjaman Arsip", icon: "📁", slug: "kearsipan-peminjaman", isExternal: false, link: "/kearsipan-peminjaman/new" },
    { name: "Peminjaman BMN", icon: "🏗️", slug: "peminjaman-aset", isExternal: false, link: "/peminjaman-aset/new" },
    { name: "Peminjaman Ruangan", icon: "🏢", slug: "peminjaman-ruangan", isExternal: false, link: "/peminjaman-ruangan" },
    { name: "Permintaan Persediaan", icon: "📋", slug: "permintaan-persediaan", isExternal: false, link: "/permintaan-persediaan/new" },
    { name: "Izin Keluar (RISPEG)", icon: "🚶", slug: "rispeg-ruh", isExternal: false, link: "/izin-keluar" },
    { name: "Pengumuman RISPEG", icon: "📢", slug: "pengumuman-rispeg", isExternal: false, link: "/app/pengumuman-rispeg" },
    { name: "Laporan IT Helpdesk", icon: "🔧", slug: "it-helpdesk", isExternal: false, link: "/it-helpdesk/new" },
    { name: "Pemeliharaan BMN", icon: "🛠️", slug: "bmn-pemeliharaan-keluhan", isExternal: false, link: "/bmn-pemeliharaan-keluhan/new" },
    { name: "Input Surat Tugas", icon: "📝", slug: "surat-tugas", isExternal: false, link: "/surat-tugas/new" },
    { name: "DATA SAKIP 2026", icon: "📊", slug: "sakip-2026", isExternal: true, link: "https://s.id/sakippalopo26" },
  ];

  // Direct Quick Actions list for floating FAB
  const quickActions = [
    { key: "rispeg-ruh", label: "Izin Keluar Kantor", icon: "🚗", color: "#8b5cf6" },
    { key: "bmn-permintaan-persediaan/new", label: "Minta Persediaan BMN", icon: "📦", color: "#f59e0b" },
    { key: "it-helpdesk-pelaporan", label: "Lapor Gangguan IT", icon: "💻", color: "#06b6d4" },
  ];

  const handleQuickAction = (key) => {
    setIsServicesOpen(false);
    if (key.includes("/")) {
      navigate(`/app/${key}`);
    } else {
      onMenuClick({ key });
    }
  };

  const dashboardKey = isAdmin ? "dashboard" : "layanan-mandiri";

  return (
    <div className="mobile-app-shell">
      {/* ── Fixed Top Header Bar ──────────────────────────────────────── */}
      <header className="mobile-app-header">
        <div className="mobile-app-header-left">
          {!isRootPage ? (
            <button className="header-icon-btn back-btn" onClick={() => navigate(-1)}>
              <ArrowLeftOutlined />
            </button>
          ) : (
            <Avatar
              src={user?.avatar_url || "/logo/favicon.png"}
              size={34}
              style={{ border: "2px solid rgba(255,255,255,0.8)" }}
            />
          )}
        </div>

        <div className="mobile-app-header-title">
          <span className="title-text">{pageTitle}</span>
        </div>

        <div className="mobile-app-header-right">
          <button className="header-icon-btn" onClick={() => navigate("/app/account-settings")}>
            <BellOutlined />
          </button>
        </div>
      </header>

      {/* ── Main Content Area ────────────────────────────────────────── */}
      <main className="mobile-app-content">
        <div className="mobile-app-content-inner">
          {children}
        </div>
      </main>

      {/* ── iOS Style Floating Bottom sheets ──────────────────────────── */}
      {isServicesOpen && (
        <div className="mobile-bottom-sheet-overlay" onClick={() => setIsServicesOpen(false)}>
          <div className="mobile-bottom-sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-header">
              <div className="bottom-sheet-drag-handle"></div>
              <span className="bottom-sheet-title">Layanan Cepat</span>
            </div>
            <div className="bottom-sheet-grid">
              {quickActions.map((action) => (
                <button
                  key={action.key}
                  className="bottom-sheet-grid-item"
                  onClick={() => handleQuickAction(action.key)}
                >
                  <div className="bottom-sheet-item-icon" style={{ backgroundColor: `${action.color}15`, color: action.color }}>
                    <span style={{ fontSize: 24 }}>{action.icon}</span>
                  </div>
                  <span className="bottom-sheet-item-label">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom Navigation Bar ────────────────────────────────────── */}
      <nav className="mobile-bottom-nav">
        <div className="mobile-bottom-nav-inner">
          <button
            className={`mobile-bottom-nav-item ${activeKey === dashboardKey ? "is-active" : ""}`}
            onClick={() => onMenuClick({ key: dashboardKey })}
          >
            <HomeOutlined className="nav-icon" />
            <span className="nav-label">Home</span>
          </button>

          <button
            className={`mobile-bottom-nav-item ${activeKey === "riwayat-layanan" ? "is-active" : ""}`}
            onClick={() => onMenuClick({ key: "riwayat-layanan" })}
          >
            <HistoryOutlined className="nav-icon" />
            <span className="nav-label">Riwayat</span>
          </button>

          {/* Central floating FAB */}
          <div className="mobile-bottom-nav-fab-container">
            <button
              className={`mobile-bottom-nav-fab ${isServicesOpen ? "is-open" : ""}`}
              onClick={() => setIsServicesOpen(!isServicesOpen)}
            >
              <PlusOutlined />
            </button>
            <span className="nav-label fab-label">Layanan</span>
          </div>

          <button
            className={`mobile-bottom-nav-item ${activeKey === "account-settings" ? "is-active" : ""}`}
            onClick={() => onMenuClick({ key: "account-settings" })}
          >
            <UserOutlined className="nav-icon" />
            <span className="nav-label">Profil</span>
          </button>

          <button
            className="mobile-bottom-nav-item"
            onClick={() => setIsDrawerOpen(true)}
          >
            <MenuOutlined className="nav-icon" />
            <span className="nav-label">Menu</span>
          </button>
        </div>
      </nav>

      {/* ── Sliding Navigation Drawer (Menu) ────────────────────────── */}
      <Drawer
        title="Semua Modul Layanan"
        placement="right"
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
        width="85%"
        styles={{ body: { padding: "16px 0" } }}
      >
        <div className="mobile-drawer-menu">
          <div className="drawer-user-info">
            <Avatar src={user?.avatar_url || "/logo/favicon.png"} size={52} />
            <div className="drawer-user-text">
              <span className="user-name">{user?.name}</span>
              <span className="user-role">{currentRole?.toUpperCase()}</span>
            </div>
          </div>
          <Divider style={{ margin: "12px 0" }} />

          <div className="drawer-menu-list">
            {mobileDrawerServices.map((item) => (
              <button
                key={item.slug}
                className="drawer-menu-item"
                onClick={() => {
                  setIsDrawerOpen(false);
                  if (item.isExternal) {
                    window.open(item.link, "_blank");
                  } else if (item.link.startsWith("/app/")) {
                    onMenuClick({ key: item.slug });
                  } else {
                    navigate(item.link);
                  }
                }}
              >
                <div className="drawer-item-left">
                  <span className="drawer-item-icon" style={{ fontSize: 18 }}>{item.icon}</span>
                  <div className="drawer-item-text">
                    <span className="item-name">{item.name}</span>
                  </div>
                </div>
                <RightOutlined style={{ fontSize: 12, color: "#cbd5e1" }} />
              </button>
            ))}
          </div>

          <Divider style={{ margin: "12px 0" }} />

          {/* Switch Active Role if multiple roles allowed */}
          {profileMenu?.items?.[0]?.children?.length > 1 && (
            <div className="drawer-roles-section">
              <span className="section-title">Beralih Level Akses</span>
              <div className="roles-list">
                {profileMenu.items[0].children.map((roleOpt) => (
                  <button
                    key={roleOpt.key}
                    className={`role-option-btn ${currentRole === roleOpt.key ? "active" : ""}`}
                    onClick={() => {
                      setIsDrawerOpen(false);
                      roleOpt.onClick();
                    }}
                  >
                    <SwitcherOutlined />
                    <span>{roleOpt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="drawer-footer">
            <Button
              type="primary"
              danger
              block
              icon={<LogoutOutlined />}
              onClick={() => {
                setIsDrawerOpen(false);
                logout();
              }}
              style={{ borderRadius: 10, height: 40 }}
            >
              Keluar Aplikasi
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
};

export default MobileAppShell;
