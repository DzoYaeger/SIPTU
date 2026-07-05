import { Layout, Menu, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import {
  AppstoreOutlined,
  BarChartOutlined,
  CarOutlined,
  DashboardOutlined,
  DollarCircleOutlined,
  FileDoneOutlined,
  FileProtectOutlined,
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
} from '@ant-design/icons';
import PropTypes from 'prop-types';

const { Sider } = Layout;

const iconMap = {
  dashboard: <DashboardOutlined style={{ color: '#26415C' }} />,
  kepegawaian: <TeamOutlined style={{ color: '#3D6B99' }} />,
  kearsipan: <FileProtectOutlined style={{ color: '#3D6B99' }} />,
  'kearsipan-peminjaman': <FolderOpenOutlined style={{ color: '#26415C' }} />,
  'kearsipan-pencatatan-surat': <FormOutlined style={{ color: '#26415C' }} />,
  'kepegawaian-data-pegawai': <SolutionOutlined style={{ color: '#2F6DA0' }} />,
  'kepegawaian-kgb': <ScheduleOutlined style={{ color: '#2F6DA0' }} />,
  'kepegawaian-bangkom': <FileProtectOutlined style={{ color: '#2F6DA0' }} />,
  keuangan: <DollarCircleOutlined style={{ color: '#26415C' }} />,
  'keuangan-anggaran': <FundProjectionScreenOutlined style={{ color: '#2F6DA0' }} />,
  'keuangan-realisasi': <FileDoneOutlined style={{ color: '#2F6DA0' }} />,
  'keuangan-revisi': <FileTextOutlined style={{ color: '#2F6DA0' }} />,
  'keuangan-invoice': <FileTextOutlined style={{ color: '#2F6DA0' }} />,
  'keuangan-realisasi-anggaran': <FundOutlined style={{ color: '#2F6DA0' }} />,
  perjadin: <CarOutlined style={{ color: '#3A79A0' }} />,
  'perjadin-st': <FileTextOutlined style={{ color: '#2F6DA0' }} />,
  'perjadin-lpj': <FileDoneOutlined style={{ color: '#2F6DA0' }} />,
  'perjadin-monitoring': <MonitorOutlined style={{ color: '#2F6DA0' }} />,
  'admin-user-management': <TeamOutlined style={{ color: '#26415C' }} />,
  'kearsipan-manajemen-up-uk': <FileProtectOutlined style={{ color: '#26415C' }} />,
  'kearsipan-laporan': <FileTextOutlined style={{ color: '#26415C' }} />,
  bmn: <AppstoreOutlined style={{ color: '#26415C' }} />,
  'bmn-data-aset-tetap': <HddOutlined style={{ color: '#2F6DA0' }} />,
  'bmn-data-persediaan': <InboxOutlined style={{ color: '#2F6DA0' }} />,
  'bmn-permintaan-persediaan': <ShoppingCartOutlined style={{ color: '#2F6DA0' }} />,
  'bmn-peminjaman-aset': <InteractionOutlined style={{ color: '#2F6DA0' }} />,
  'bmn-pemeliharaan-keluhan': <ToolOutlined style={{ color: '#2F6DA0' }} />,
  'bmn-laporan': <BarChartOutlined style={{ color: '#26415C' }} />,
  'layanan-mandiri': <CustomerServiceOutlined style={{ color: '#26415C' }} />,
  'validator-dashboard': <SettingOutlined style={{ color: '#26415C' }} />,
  'it-helpdesk': <ToolOutlined style={{ color: '#26415C' }} />,
  'it-helpdesk-pelaporan': <FormOutlined style={{ color: '#2F6DA0' }} />,
  'it-helpdesk-rekapan': <DatabaseOutlined style={{ color: '#2F6DA0' }} />,
  'pengadaan-pdtt': <ShoppingCartOutlined style={{ color: '#2F6DA0' }} />
};

const SidebarMenu = ({
  collapsed,
  activeKey,
  onMenuClick,
  modules,
  allowedSlugs,
  isAdmin,
  extraItems = [],
}) => {
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

          return {
            key: node.slug,
            label: node.name,
            icon: iconMap[node.slug],
            children: childItems,
          };
        })
        .filter(Boolean);
    };

    return [...filterTree(modules), ...extraItems];
  }, [modules, extraItems, allowedSlugs, isAdmin]);

  const submenuKeys = useMemo(
    () => menuItems.filter((item) => Array.isArray(item.children) && item.children.length > 0).map((item) => item.key),
    [menuItems],
  );

  const [openKeys, setOpenKeys] = useState([]);

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
      if (validPrev.length === 0) {
        return [];
      }
      return validPrev;
    });
  }, [collapsed, submenuKeys]);

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      width={200}
      collapsedWidth={60}
      className="app-sider"
    >
      <div className="brand">
        <Typography.Title level={5} className="brand-title">
          {collapsed ? 'SP' : 'SIPAUS'}
        </Typography.Title>
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




























