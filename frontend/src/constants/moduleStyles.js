/**
 * Module Styles Constants
 * Standardized icons and colors across all modules in SIPTU
 * Based on Layanan Mandiri design
 */

// Module color schemes - consistent across the app
export const MODULE_COLORS = {
  // Kearsipan - Blue
  kearsipan: {
    primary: "#3b82f6",
    gradient: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
    shadow: "rgba(59, 130, 246, 0.4)",
    bg: "rgba(59, 130, 246, 0.1)",
  },
  // BMN - Green
  bmn: {
    primary: "#10b981",
    gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    shadow: "rgba(16, 185, 129, 0.4)",
    bg: "rgba(16, 185, 129, 0.1)",
  },
  // Persediaan - Orange
  persediaan: {
    primary: "#f59e0b",
    gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    shadow: "rgba(245, 158, 11, 0.4)",
    bg: "rgba(245, 158, 11, 0.1)",
  },
  // RISPEG - Purple
  rispeg: {
    primary: "#8b5cf6",
    gradient: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
    shadow: "rgba(139, 92, 246, 0.4)",
    bg: "rgba(139, 92, 246, 0.1)",
  },
  // IT Helpdesk - Pink
  itHelpdesk: {
    primary: "#ec4899",
    gradient: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
    shadow: "rgba(236, 72, 153, 0.4)",
    bg: "rgba(236, 72, 153, 0.1)",
  },
  // Layanan - Cyan
  layanan: {
    primary: "#06b6d4",
    gradient: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
    shadow: "rgba(6, 182, 212, 0.4)",
    bg: "rgba(6, 182, 212, 0.1)",
  },
};

// Module icon names - consistent across the app
export const MODULE_ICON_NAMES = {
  // Kearsipan
  "kearsipan-peminjaman": "SafetyCertificateOutlined",
  "kearsipan-pencatatan-surat": "FileTextOutlined",
  "kearsipan-manajemen-up-uk": "FileTextOutlined",
  "kearsipan-laporan": "BarChartOutlined",
  kearsipan: "SafetyCertificateOutlined",

  // BMN
  "bmn-data-aset-tetap": "AppstoreOutlined",
  "bmn-data-persediaan": "CodeSandboxOutlined",
  "bmn-permintaan-persediaan": "ShoppingOutlined",
  "bmn-peminjaman-aset": "KeyOutlined",
  "bmn-pemeliharaan-keluhan": "ToolOutlined",
  "bmn-laporan": "BarChartOutlined",
  bmn: "FundOutlined",

  // Persediaan
  persediaan: "ShoppingOutlined",

  // RISPEG
  "rispeg-ruh": "FormOutlined",
  "rispeg-dashboard": "DashboardOutlined",
  "rispeg-izin-keluar": "ExportOutlined",
  rispeg: "ClockCircleOutlined",

  // IT Helpdesk
  "it-helpdesk-pelaporan": "AlertOutlined",
  "it-helpdesk-rekapan": "BarChartOutlined",
  "it-helpdesk": "ToolOutlined",
  "pengadaan-pdtt": "ShoppingOutlined",

  // Layanan
  "layanan-mandiri": "CustomerServiceOutlined",
  "riwayat-layanan": "HistoryOutlined",
  layanan: "CustomerServiceOutlined",
};

// Get module color by slug
export const getModuleColor = (slug) => {
  if (slug?.startsWith("kearsipan")) return MODULE_COLORS.kearsipan;
  if (slug?.startsWith("bmn")) return MODULE_COLORS.bmn;
  if (slug?.startsWith("persediaan")) return MODULE_COLORS.persediaan;
  if (slug?.startsWith("rispeg")) return MODULE_COLORS.rispeg;
  if (slug?.startsWith("it-helpdesk")) return MODULE_COLORS.itHelpdesk;
  if (slug?.startsWith("layanan") || slug?.startsWith("riwayat"))
    return MODULE_COLORS.layanan;
  return MODULE_COLORS.kearsipan; // default
};

// Get module icon name by slug
export const getModuleIconName = (slug) => {
  return MODULE_ICON_NAMES[slug] || MODULE_ICON_NAMES["layanan-mandiri"];
};

// Service type mapping for Layanan Mandiri
export const SERVICE_TYPES = {
  kearsipan: {
    id: "kearsipan",
    title: "Peminjaman Arsip",
    iconName: "SafetyCertificateOutlined",
    color: MODULE_COLORS.kearsipan,
  },
  bmn: {
    id: "bmn",
    title: "Peminjaman BMN",
    iconName: "FundOutlined",
    color: MODULE_COLORS.bmn,
  },
  persediaan: {
    id: "persediaan",
    title: "Permintaan Persediaan",
    iconName: "ShoppingOutlined",
    color: MODULE_COLORS.persediaan,
  },
  rispeg: {
    id: "rispeg",
    title: "Izin Keluar (RISPEG)",
    iconName: "ClockCircleOutlined",
    color: MODULE_COLORS.rispeg,
  },
  itHelpdesk: {
    id: "it-helpdesk",
    title: "Laporan IT Helpdesk",
    iconName: "ToolOutlined",
    color: MODULE_COLORS.itHelpdesk,
  },
};

export default {
  MODULE_COLORS,
  MODULE_ICON_NAMES,
  SERVICE_TYPES,
  getModuleColor,
  getModuleIconName,
};
