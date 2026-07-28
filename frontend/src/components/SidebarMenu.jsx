import { Layout, Menu, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppstoreOutlined,
  BarChartOutlined,
  CarOutlined,
  DashboardOutlined,
  DollarCircleOutlined,
  FileDoneOutlined,
  FileProtectOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  FileTextOutlined,
  FundProjectionScreenOutlined,
  HddOutlined,
  ToolOutlined,
  InboxOutlined,
  InteractionOutlined,
  FormOutlined,
  MonitorOutlined,
  ScheduleOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  SolutionOutlined,
  TeamOutlined,
  FundOutlined,
  DatabaseOutlined,
  CustomerServiceOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  CloudOutlined,
  HistoryOutlined,
  SafetyOutlined,
  CheckSquareOutlined,
  VideoCameraOutlined,
  AuditOutlined,
  CalendarOutlined,
  DesktopOutlined,
  CodeSandboxOutlined,
  KeyOutlined,
  AlertOutlined,
  LeftOutlined,
} from '@ant-design/icons';
import PropTypes from 'prop-types';

const { Sider } = Layout;

const iconMap = {
  dashboard: <DashboardOutlined style={{ color: '#2563eb' }} />,
  kepegawaian: <TeamOutlined style={{ color: '#2563eb' }} />,
  'kepegawaian-data-pegawai': <SolutionOutlined style={{ color: '#2563eb' }} />,
  'kepegawaian-kgb': <ScheduleOutlined style={{ color: '#2563eb' }} />,
  'kepegawaian-kalender': <CalendarOutlined style={{ color: '#2563eb' }} />,
  'kepegawaian-surat-tugas': <FileTextOutlined style={{ color: '#2563eb' }} />,
  'zoom-generator': <VideoCameraOutlined style={{ color: '#2563eb' }} />,

  rispeg: <CheckSquareOutlined style={{ color: '#2563eb' }} />,
  'rispeg-ruh': <FormOutlined style={{ color: '#2563eb' }} />,
  'rispeg-dashboard': <MonitorOutlined style={{ color: '#2563eb' }} />,
  'rispeg-izin-keluar': <ScheduleOutlined style={{ color: '#2563eb' }} />,
  'rispeg-pengaturan-izin-keluar': <SettingOutlined style={{ color: '#2563eb' }} />,

  kearsipan: <FileProtectOutlined style={{ color: '#2563eb' }} />,
  'kearsipan-peminjaman': <FolderOpenOutlined style={{ color: '#2563eb' }} />,
  'kearsipan-pencatatan-surat': <FormOutlined style={{ color: '#2563eb' }} />,
  'kearsipan-arsip-vital': <SafetyCertificateOutlined style={{ color: '#2563eb' }} />,
  'kearsipan-manajemen-up-uk': <FileProtectOutlined style={{ color: '#2563eb' }} />,
  'kearsipan-laporan': <FileTextOutlined style={{ color: '#2563eb' }} />,

  bmn: <AppstoreOutlined style={{ color: '#2563eb' }} />,
  'bmn-data-aset-tetap': <HddOutlined style={{ color: '#2563eb' }} />,
  'bmn-data-persediaan': <InboxOutlined style={{ color: '#2563eb' }} />,
  'bmn-permintaan-persediaan': <ShoppingCartOutlined style={{ color: '#2563eb' }} />,
  'bmn-peminjaman-aset': <InteractionOutlined style={{ color: '#2563eb' }} />,
  'bmn-pemeliharaan-keluhan': <ToolOutlined style={{ color: '#2563eb' }} />,
  'bmn-laporan': <BarChartOutlined style={{ color: '#2563eb' }} />,

  'it-helpdesk': <CustomerServiceOutlined style={{ color: '#2563eb' }} />,
  'it-helpdesk-pelaporan': <FormOutlined style={{ color: '#2563eb' }} />,
  'it-helpdesk-rekapan': <DatabaseOutlined style={{ color: '#2563eb' }} />,

  'pengadaan-pdtt': <ShoppingCartOutlined style={{ color: '#2563eb' }} />,
  'pengadaan-pbj': <AuditOutlined style={{ color: '#2563eb' }} />,
  'pengadaan-pdtt-katalog': <AppstoreOutlined style={{ color: '#2563eb' }} />,
  'pengadaan-pdtt-rekapan': <FileTextOutlined style={{ color: '#2563eb' }} />,
  'pengelola-pegawai-pdtt': <TeamOutlined style={{ color: '#2563eb' }} />,

  keuangan: <DollarCircleOutlined style={{ color: '#2563eb' }} />,
  'keuangan-invoice': <FileTextOutlined style={{ color: '#2563eb' }} />,
  'keuangan-lpj': <FileTextOutlined style={{ color: '#2563eb' }} />,
  'keuangan-pejabat': <UserOutlined style={{ color: '#2563eb' }} />,
  'keuangan-revisi': <FileTextOutlined style={{ color: '#2563eb' }} />,

  'layanan-mandiri': <UserOutlined style={{ color: '#2563eb' }} />,
  'riwayat-layanan': <HistoryOutlined style={{ color: '#2563eb' }} />,
  'penyimpanan-cloud': <CloudOutlined style={{ color: '#2563eb' }} />,
  'antrian-kontrol': <SafetyOutlined style={{ color: '#2563eb' }} />,
};

const SidebarMenu = ({
  collapsed,
  onToggleCollapse,
  activeKey,
  onMenuClick,
  modules,
  allowedSlugs,
  isAdmin,
  extraItems = [],
  badgeCounts = {},
}) => {
  const [openKeys, setOpenKeys] = useState([]);

  const renderFolderIcon = useCallback((slug) => {
    const isOpen = openKeys.includes(slug) || activeKey === slug || (activeKey && activeKey.startsWith(slug));
    return isOpen ? (
      <FolderOpenOutlined style={{ fontSize: 18, color: '#0F5B99' }} />
    ) : (
      <FolderOutlined style={{ fontSize: 18, color: '#64748b' }} />
    );
  }, [openKeys, activeKey]);

  const menuItems = useMemo(() => {
    const allowedSet = new Set(allowedSlugs ?? []);

    const filterTree = (nodes) => {
      if (!Array.isArray(nodes)) return [];

      return nodes
        .map((node) => {
          const children = filterTree(node.children ?? []);
          const includeNode = isAdmin || allowedSet.has(node.slug) || children.length > 0;

          if (!includeNode) {
            return null;
          }

          const childItems = children.length > 0 ? children : undefined;

          // Calculate badge count for child or sum of children for parent
          let selfCount = Number(badgeCounts[node.slug]) || 0;
          let totalBadgeCount = selfCount;

          if (childItems && childItems.length > 0) {
            const childrenSum = childItems.reduce((acc, child) => acc + (child._totalBadgeCount || 0), 0);
            totalBadgeCount += childrenSum;
          }

          const hasChildren = Boolean(childItems && childItems.length > 0);

          const renderLabel = (
            <span className={`sidebar-menu-label-wrapper ${hasChildren ? 'has-submenu' : 'leaf-menu'}`}>
              <span className="sidebar-menu-text-title">{node.name}</span>
              {totalBadgeCount > 0 && !collapsed && (
                <span className={`sidebar-badge-count ${hasChildren ? 'parent-badge' : 'child-badge'}`}>
                  {totalBadgeCount > 99 ? '99+' : totalBadgeCount}
                </span>
              )}
            </span>
          );

          return {
            key: node.slug,
            label: renderLabel,
            icon: renderFolderIcon(node.slug),
            children: childItems,
            _totalBadgeCount: totalBadgeCount,
          };
        })
        .filter(Boolean);
    };

    let filtered = filterTree(modules);

    // Fallback ONLY if user has no allowedSlugs configured at all
    if (filtered.length === 0 && (!allowedSlugs || allowedSlugs.length === 0) && Array.isArray(modules) && modules.length > 0) {
      filtered = modules.map((node) => {
        const childItems = Array.isArray(node.children) && node.children.length > 0
          ? node.children.map(c => ({
              key: c.slug,
              label: (
                <span className="sidebar-menu-label-wrapper leaf-menu">
                  <span className="sidebar-menu-text-title">{c.name}</span>
                </span>
              ),
              icon: renderFolderIcon(c.slug),
            }))
          : undefined;
        const hasChildren = Boolean(childItems && childItems.length > 0);
        return {
          key: node.slug,
          label: (
            <span className={`sidebar-menu-label-wrapper ${hasChildren ? 'has-submenu' : 'leaf-menu'}`}>
              <span className="sidebar-menu-text-title">{node.name}</span>
            </span>
          ),
          icon: renderFolderIcon(node.slug),
          children: childItems,
        };
      });
    }

    return [...filtered, ...extraItems];
  }, [modules, extraItems, allowedSlugs, isAdmin, badgeCounts, collapsed, renderFolderIcon]);

  const submenuKeys = useMemo(
    () => menuItems.filter((item) => Array.isArray(item.children) && item.children.length > 0).map((item) => item.key),
    [menuItems],
  );

  useEffect(() => {
    if (collapsed) {
      setOpenKeys([]);
      return;
    }

    setOpenKeys((prev) => {
      const validPrev = prev.filter((key) => submenuKeys.includes(key));
      if (validPrev.length === prev.length) {
        return prev;
      }
      return validPrev;
    });
  }, [collapsed, submenuKeys]);

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      width={210}
      collapsedWidth={60}
      className="app-sider"
      style={{ position: 'sticky', top: 0, height: '100vh', zIndex: 100 }}
    >
      {/* Floating Toggle Button on Sidebar-Navbar Border */}
      {onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="sidebar-border-toggle-btn"
          title={collapsed ? "Perluas Sidebar" : "Ciutkan Sidebar"}
          aria-label={collapsed ? "Perluas Sidebar" : "Ciutkan Sidebar"}
          style={{
            position: 'absolute',
            right: -13,
            top: 13,
            width: 26,
            height: 26,
            borderRadius: '50%',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 101,
            outline: 'none',
            padding: 0,
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <LeftOutlined
            style={{
              fontSize: 11,
              color: '#334155',
              transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        </button>
      )}

      <div className="brand" style={{ padding: '0 12px', display: 'flex', alignItems: 'center', height: 52, borderBottom: '1px solid #f1f5f9' }}>
        {collapsed ? (
          <img
            src="/logo/favicon.png"
            alt="SIPTU Logo"
            style={{ width: 28, height: 28, objectFit: 'contain', margin: '0 auto' }}
          />
        ) : (
          <img
            src="/logo/logo-samping.png"
            alt="SIPTU Logo"
            style={{ height: 32, maxWidth: 165, objectFit: 'contain' }}
          />
        )}
      </div>

      <Menu
        mode="inline"
        selectedKeys={[activeKey]}
        openKeys={collapsed ? undefined : openKeys}
        inlineCollapsed={collapsed}
        items={menuItems}
        className="sidebar-menu"
        triggerSubMenuAction="hover"
        onClick={onMenuClick}
        onOpenChange={(keys) => {
          if (!collapsed) {
            setOpenKeys(keys);
          }
        }}
      />
    </Sider>
  );
};

SidebarMenu.propTypes = {
  collapsed: PropTypes.bool,
  activeKey: PropTypes.string,
  onMenuClick: PropTypes.func,
  modules: PropTypes.array,
  allowedSlugs: PropTypes.array,
  isAdmin: PropTypes.bool,
  extraItems: PropTypes.array,
};

export default SidebarMenu;
