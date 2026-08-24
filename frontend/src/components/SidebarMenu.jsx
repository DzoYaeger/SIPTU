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
  HomeFilled,
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
  ProjectOutlined,
} from '@ant-design/icons';
import PropTypes from 'prop-types';
import kepegawaianIcon from '../assets/icons/kepegawaian-icon.png';
import homeIcon from '../assets/icons/home-icon.png';
import cartIcon from '../assets/icons/cart-icon.png';
import headsetIcon from '../assets/icons/headset-icon.png';
import cloudIcon from '../assets/icons/cloud-icon.png';
import folderIcon from '../assets/icons/folder-icon.png';
import historyIcon from '../assets/icons/history-icon.png';
import idcardIcon from '../assets/icons/idcard-icon.png';
import archiveIcon from '../assets/icons/archive-icon.png';
import walletIcon from '../assets/icons/wallet-icon.png';
import buildingIcon from '../assets/icons/building-icon.png';
import simbaIcon from '../assets/icons/simba-icon.png';
import simkeuIcon from '../assets/icons/simkeu-icon.png';
import siptuDriveIcon from '../assets/icons/siptu-drive-icon.png';
import rispegPengumumanIcon from '../assets/icons/rispeg-pengumuman-icon.png';
import suratTugasIcon from '../assets/icons/surat-tugas-icon.png';
import sakipIcon from '../assets/icons/sakip-icon.png';
import ruanganIcon from '../assets/icons/ruangan-icon.png';
import itHelpdeskIcon from '../assets/icons/it-helpdesk-icon.png';
import kearsipanIcon from '../assets/icons/kearsipan-icon.png';
import izinKeluarIcon from '../assets/icons/izin-keluar-icon.png';
import pdttIcon from '../assets/icons/pdtt-icon.png';
import zoomIcon from '../assets/icons/zoom-icon.png';

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
  'kanban-work': <ProjectOutlined style={{ color: '#2563eb' }} />,

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
  const [customIcons, setCustomIcons] = useState({});

  // Synchronize custom sidebar icons dynamically
  useEffect(() => {
    const loadCustomIcons = () => {
      try {
        const stored = localStorage.getItem("siptu_custom_sidebar_icons");
        if (stored) {
          setCustomIcons(JSON.parse(stored));
        } else {
          setCustomIcons({});
        }
      } catch (e) {
        console.error("Gagal memuat ikon kustom:", e);
      }
    };
    loadCustomIcons();

    window.addEventListener("siptu_sidebar_icons_updated", loadCustomIcons);
    return () => window.removeEventListener("siptu_sidebar_icons_updated", loadCustomIcons);
  }, []);

  const renderFolderIcon = useCallback((slug) => {
    // 0. Dynamic Custom Icon Override (if set by Admin for this exact slug)
    if (customIcons[slug]) {
      return (
        <img
          src={customIcons[slug]}
          alt={slug}
          style={{ width: 18, height: 18, objectFit: "contain", borderRadius: 4 }}
        />
      );
    }

    if (slug === "layanan-mandiri") {
      return <HomeFilled style={{ fontSize: 18, color: activeKey === slug ? '#0F5B99' : '#0284c7' }} />;
    }
    if (slug === "riwayat-layanan") {
      return <HistoryOutlined style={{ fontSize: 18, color: activeKey === slug ? '#0F5B99' : '#0284c7' }} />;
    }

    const isOpen = openKeys.includes(slug) || activeKey === slug || (activeKey && activeKey.startsWith(slug));
    return isOpen ? (
      <FolderOpenOutlined style={{ fontSize: 18, color: '#0F5B99' }} />
    ) : (
      <FolderOutlined style={{ fontSize: 18, color: '#0284c7' }} />
    );
  }, [openKeys, activeKey, customIcons]);

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

    if (filtered.length === 0 && (!allowedSlugs || allowedSlugs.length === 0) && Array.isArray(modules) && modules.length > 0) {
      const buildFallbackItems = (nodes) => nodes.map((node) => {
        const childItems = Array.isArray(node.children) && node.children.length > 0
          ? buildFallbackItems(node.children)
          : undefined;
        const selfCount = Number(badgeCounts[node.slug]) || 0;
        const childrenCount = (childItems ?? []).reduce(
          (acc, child) => acc + (child._totalBadgeCount || 0),
          0,
        );
        const totalBadgeCount = selfCount + childrenCount;
        const hasChildren = Boolean(childItems && childItems.length > 0);

        return {
          key: node.slug,
          label: (
            <span className={`sidebar-menu-label-wrapper ${hasChildren ? 'has-submenu' : 'leaf-menu'}`}>
              <span className="sidebar-menu-text-title">{node.name}</span>
              {totalBadgeCount > 0 && !collapsed && (
                <span className={`sidebar-badge-count ${hasChildren ? 'parent-badge' : 'child-badge'}`}>
                  {totalBadgeCount > 99 ? '99+' : totalBadgeCount}
                </span>
              )}
            </span>
          ),
          icon: renderFolderIcon(node.slug),
          children: childItems,
          _totalBadgeCount: totalBadgeCount,
        };
      });

      filtered = buildFallbackItems(modules);
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
      collapsedWidth={0}
      className="app-sider"
      style={{ position: 'sticky', top: 48, height: 'calc(100vh - 48px)', zIndex: 100 }}
    >
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
