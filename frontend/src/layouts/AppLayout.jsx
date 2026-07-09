import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Routes,
  Route,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";
import { App as AntdApp, Dropdown, Layout, Form, Input, Card, Typography, Button } from "antd";
import {
  LogoutOutlined,
  SettingOutlined,
  SwitcherOutlined,
  UserOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  AppstoreOutlined,
  DesktopOutlined,
  CodeSandboxOutlined,
  ShoppingCartOutlined,
  KeyOutlined,
  CustomerServiceOutlined,
  AlertOutlined,
  TeamOutlined,
  BellOutlined,
  CameraOutlined,
  AuditOutlined,
  FormOutlined,
  DashboardOutlined,
  ExportOutlined,
  FileProtectOutlined,
  DollarOutlined,
  SafetyCertificateOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import { SafetyOutlined, ArrowRightOutlined } from "@ant-design/icons";
import NavbarMenu from "../components/NavbarMenu.jsx";
import DataPegawai from "../views/DataPegawai.jsx";
import BmnDataAsetTetap from "../views/BmnDataAsetTetap.jsx";
import BmnDataPersediaan from "../views/BmnDataPersediaan.jsx";
import BmnPermintaanPersediaan from "../views/BmnPermintaanPersediaan.jsx";
import BmnPeminjamanAset from "../views/BmnPeminjamanAset.jsx";
import BmnPeminjamanAsetForm from "../views/BmnPeminjamanAsetForm.jsx";
import BmnPermintaanPersediaanForm from "../views/BmnPermintaanPersediaanForm.jsx";
import BmnPermintaanPersediaanDetail from "../views/BmnPermintaanPersediaanDetail.jsx";
import BmnLaporan from "../views/BmnLaporan.jsx";
import BmnPemeliharaanKeluhan from "../views/BmnPemeliharaanKeluhan.jsx";
import ZoomGenerator from "../views/ZoomGenerator.jsx";
import PengadaanPdtt from "../views/PengadaanPdtt.jsx";
import AdminPengajuanPdtt from "../views/AdminPengajuanPdtt.jsx";
import PengelolaPegawaiPdtt from "../views/PengelolaPegawaiPdtt.jsx";
import LayananMandiri from "../views/LayananMandiri.jsx";
import Kgb from "../views/Kgb.jsx";
import KepegawaianKalender from "../views/KepegawaianKalender.jsx";
import KepegawaianSuratTugas from "../views/KepegawaianSuratTugas.jsx";
import KeuanganLpj from "../views/KeuanganLpj.jsx";
import KeuanganPejabat from "../views/KeuanganPejabat.jsx";
import Anggaran from "../views/Anggaran.jsx";
import PermintaanRevisi from "../views/PermintaanRevisi.jsx";
import InvoiceBelanja from "../views/InvoiceBelanja.jsx";
import RealisasiAnggaran from "../views/RealisasiAnggaran.jsx";
import AdminNotificationSettings from "../views/AdminNotificationSettings.jsx";
import AdminNewsPosts from "../views/AdminNewsPosts.jsx";
import AdminUserManagement from "../views/AdminUserManagement.jsx";
import KearsipanManajemenUpUk from "../views/KearsipanManajemenUpUk.jsx";
import KearsipanPencatatanSurat from "../views/KearsipanPencatatanSurat.jsx";
import ValidatorDashboard from "../views/ValidatorDashboard.jsx";
import ManajemenPeminjamanArsip from "../views/ManajemenPeminjamanArsip.jsx";
import LaporanPeminjaman from "../views/LaporanPeminjaman.jsx";
import ItHelpdeskDaftarLaporan from "../views/ItHelpdeskDaftarLaporan.jsx";
import AccountSettings from "../views/AccountSettings.jsx";
import Rispeg from "../views/Rispeg.jsx";
import RispegDashboard from "../views/RispegDashboard.jsx";
import RispegMonitoringIzinKeluar from "../views/RispegMonitoringIzinKeluar.jsx";
import RispegPengaturanIzinKeluar from "../views/RispegPengaturanIzinKeluar.jsx";
import RiwayatLayanan from "../views/RiwayatLayanan.jsx";
import NewsDetail from "../views/NewsDetail.jsx";
import AdminDashboard from "../views/AdminDashboard.jsx";
import OperatorDashboard from "../views/OperatorDashboard.jsx";
import NotFound from "../pages/NotFound.jsx";
import LayananMandiriSliderEditor from "../views/LayananMandiriSliderEditor.jsx";
import AdminQueueControl from "../views/AdminQueueControl.jsx";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import PengumumanRispeg from "../views/PengumumanRispeg.jsx";
import { useAuth } from "../hooks/useAuth.js";
import "./AppLayout.css";
import MobileAppShell from "./MobileAppShell.jsx";

const { Title, Paragraph } = Typography;

const MODULE_ORDER = [
  "dashboard",
  "layanan-mandiri",
  "kepegawaian",
  "rispeg",
  "kearsipan",
  "bmn",
  "pengadaan-pdtt",
  "keuangan",
  "it-helpdesk",
  "admin-user-management",
  "admin-notification-settings",
  "admin-news-posts",
];
const CHILD_ORDER = {
  kepegawaian: ["kepegawaian-data-pegawai", "kepegawaian-kgb", "kepegawaian-kalender", "kepegawaian-surat-tugas"],
  rispeg: ["rispeg-ruh", "rispeg-dashboard", "rispeg-izin-keluar"],
  kearsipan: [
    "kearsipan-peminjaman",
    "kearsipan-pencatatan-surat",
    "kearsipan-arsip-vital",
    "kearsipan-manajemen-up-uk",
    "kearsipan-laporan",
  ],
  bmn: [
    "bmn-data-aset-tetap",
    "bmn-data-persediaan",
    "bmn-permintaan-persediaan",
    "bmn-peminjaman-aset",
    "bmn-pemeliharaan-keluhan",
    "bmn-laporan",
  ],
  "pengadaan-pdtt": [
    "pengadaan-pbj",
    "pengadaan-pdtt-katalog",
    "pengadaan-pdtt-rekapan",
    "pengelola-pegawai-pdtt"
  ],
  "keuangan": ["keuangan-lpj", "keuangan-pejabat", "keuangan-revisi"],
  "it-helpdesk": ["it-helpdesk-pelaporan", "it-helpdesk-rekapan"],
};

function normalizeModules(nodes, parentSlug = null) {
  if (!Array.isArray(nodes)) return [];
  const orderReference =
    parentSlug && CHILD_ORDER[parentSlug]
      ? CHILD_ORDER[parentSlug]
      : MODULE_ORDER;
  const orderMap = new Map(orderReference.map((slug, index) => [slug, index]));
  const seen = new Set();
  const cleaned = nodes.reduce((acc, current) => {
    if (!current || !current.slug || seen.has(current.slug)) return acc;
    seen.add(current.slug);
    const children = normalizeModules(current.children ?? [], current.slug);
    acc.push({ ...current, children: children.length ? children : undefined });
    return acc;
  }, []);
  cleaned.sort((a, b) => {
    const indexA = orderMap.has(a.slug)
      ? orderMap.get(a.slug)
      : Number.MAX_SAFE_INTEGER;
    const indexB = orderMap.has(b.slug)
      ? orderMap.get(b.slug)
      : Number.MAX_SAFE_INTEGER;
    if (indexA !== indexB) return indexA - indexB;
    return (a.name ?? "").localeCompare(b.name ?? "");
  });
  return cleaned;
}

const { Content } = Layout;
const ROLE_ORDER = ["admin", "operator", "validator"];

function mapSlugToPath(slug) {
  const routes = {
    dashboard: "/app/dashboard",
    "layanan-mandiri": "/app/layanan-mandiri",
    "riwayat-layanan": "/app/riwayat-layanan",
    "kepegawaian-data-pegawai": "/app/kepegawaian-data-pegawai",
    "kepegawaian-kgb": "/app/kepegawaian-kgb",
    "kepegawaian-kalender": "/app/kepegawaian-kalender",
    "kepegawaian-surat-tugas": "/app/kepegawaian-surat-tugas",
    "rispeg-ruh": "/app/rispeg-ruh",
    "rispeg-dashboard": "/app/rispeg-dashboard",
    "rispeg-izin-keluar": "/app/rispeg-izin-keluar",
    "rispeg-pengaturan-izin-keluar": "/app/rispeg-pengaturan-izin-keluar",
    "kearsipan-peminjaman": "/app/kearsipan-peminjaman",
    "kearsipan-pencatatan-surat": "/kearsipan-pencatatan-surat",
    "kearsipan-arsip-vital": "/kearsipan-arsip-vital",
    "kearsipan-manajemen-up-uk": "/app/kearsipan-manajemen-up-uk",
    "kearsipan-laporan": "/app/kearsipan-laporan",
    "bmn-data-aset-tetap": "/app/bmn-data-aset-tetap",
    "bmn-data-persediaan": "/app/bmn-data-persediaan",
    "bmn-permintaan-persediaan": "/app/bmn-permintaan-persediaan",
    "bmn-peminjaman-aset": "/app/bmn-peminjaman-aset",
    "bmn-pemeliharaan-keluhan": "/app/bmn-pemeliharaan-keluhan",
    "bmn-laporan": "/app/bmn-laporan",
    "pengadaan-pbj": "/pengadaan-pbj",
    "pengadaan-pdtt-katalog": "/app/pengadaan-pdtt-katalog",
    "pengadaan-pdtt-rekapan": "/app/pengadaan-pdtt-rekapan",
    "pengelola-pegawai-pdtt": "/app/pengelola-pegawai-pdtt",
    "keuangan-lpj": "/app/keuangan-lpj",
    "keuangan-pejabat": "/app/keuangan-pejabat",
    "keuangan-revisi": "/app/keuangan-revisi",
    "keuangan-anggaran": "/app/keuangan-anggaran",
    "keuangan-invoice": "/app/keuangan-invoice",
    "keuangan-realisasi-anggaran": "/app/keuangan-realisasi-anggaran",
    "it-helpdesk-pelaporan": "/app/it-helpdesk-pelaporan",
    "it-helpdesk-rekapan": "/app/it-helpdesk-rekapan",
    "admin-user-management": "/app/admin-user-management",
    "admin-notification-settings": "/app/admin-notification-settings",
    "admin-news-posts": "/app/admin-news-posts",
    "validator-dashboard": "/app/validator-dashboard",
    "operator-dashboard": "/app/operator-dashboard",
    "pengaturan-slider": "/app/pengaturan-slider",
    "antrian-kontrol": "/app/antrian-kontrol",
  };
  return routes[slug] ?? null;
}

function resolveInitialAppPath(accessibleModules, isAdminUser, currentRole) {
  // Arahkan ke dashboard masing-masing sesuai role
  if (currentRole === "admin" || (!currentRole && isAdminUser)) {
    return "/app/dashboard";
  }
  if (currentRole === "operator") {
    return "/app/operator-dashboard";
  }
  if (currentRole === "validator") {
    return "/app/validator-dashboard";
  }

  const preferred = [
    "layanan-mandiri",
    "riwayat-layanan",
    "kepegawaian-data-pegawai",
    "it-helpdesk-pelaporan",
    "bmn-data-aset-tetap",
  ];
  const moduleSet = new Set(accessibleModules ?? []);

  for (const slug of preferred) {
    if (moduleSet.has(slug)) {
      return mapSlugToPath(slug) ?? "/app/account-settings";
    }
  }

  for (const slug of moduleSet) {
    if (slug === "dashboard") continue;
    const path = mapSlugToPath(slug);
    if (path) return path;
  }

  return "/app/account-settings";
}

function AppLayout() {
  const {
    user,
    currentRole,
    allowedRoles,
    switchRole,
    logout,
    accessibleModules,
    modulesTree,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = AntdApp.useApp();
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [pendingRole, setPendingRole] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isAdminUser = user?.base_role === "admin";
  const initialAppPath = useMemo(
    () => resolveInitialAppPath(accessibleModules, isAdminUser, currentRole),
    [accessibleModules, isAdminUser, currentRole],
  );

  const pathSlug = location.pathname.replace("/app/", "");

  const navActiveKey = useMemo(() => {
    const parts = pathSlug.split("/");
    if (parts.length > 1) {
      const lastPart = parts[parts.length - 1];
      if (lastPart === "new" || !isNaN(parseInt(lastPart, 10)))
        return parts.slice(0, -1).join("/");
    }
    return pathSlug;
  }, [pathSlug]);

  const extraMenuItems = useMemo(() => {
    const items = [];
    items.push({
      key: "admin-user-management",
      label: "Manajemen Pengguna",
      icon: <UserOutlined />,
    });
    items.push({
      key: "admin-notification-settings",
      label: "Pengaturan Notifikasi",
      icon: <SettingOutlined />,
    });
    items.push({
      key: "admin-news-posts",
      label: "Kelola Berita",
      icon: <FileTextOutlined />,
    });
    if ((allowedRoles ?? []).includes("validator") || currentRole === "admin") {
      items.push({
        key: "validator-dashboard",
        label: "Dashboard Validator",
        icon: <DashboardOutlined />,
      });
    }
    return items;
  }, [allowedRoles, currentRole]);

  const modifiedModulesTree = useMemo(() => {
    const baseModules = [];
    const createModule = (slug, name) => {
      const m = { slug, name, children: [] };
      baseModules.push(m);
      return m;
    };
    const addChild = (module, slug, name) => {
      module.children.push({ slug, name });
    };

    const kepegawaianModule = createModule("kepegawaian", "Kepegawaian");
    addChild(kepegawaianModule, "kepegawaian-data-pegawai", "Data Pegawai");
    addChild(kepegawaianModule, "kepegawaian-kgb", "Kenaikan Gaji Berkala");
    addChild(kepegawaianModule, "kepegawaian-kalender", "Kalender Kegiatan");
    addChild(kepegawaianModule, "kepegawaian-surat-tugas", "Surat Tugas");
    addChild(kepegawaianModule, "zoom-generator", "Zoom Generator");

    // New Rispeg Module
    const rispegModule = createModule("rispeg", "RISPEG");
    addChild(rispegModule, "rispeg-ruh", "Input Data RiSPEG");
    addChild(rispegModule, "rispeg-dashboard", "Monitoring RISPEG");
    addChild(rispegModule, "rispeg-izin-keluar", "Monitoring Izin Keluar");
    addChild(
      rispegModule,
      "rispeg-pengaturan-izin-keluar",
      "Pengaturan Izin Keluar",
    );

    const kearsipanModule = createModule("kearsipan", "Kearsipan");
    addChild(kearsipanModule, "kearsipan-peminjaman", "Peminjaman Arsip");
    addChild(kearsipanModule, "kearsipan-pencatatan-surat", "Pencatatan Surat");
    addChild(kearsipanModule, "kearsipan-arsip-vital", "Pencatatan Arsip Vital");
    addChild(kearsipanModule, "kearsipan-manajemen-up-uk", "Manajemen UK/UP");
    addChild(kearsipanModule, "kearsipan-laporan", "Laporan Peminjaman");

    const bmnModule = createModule("bmn", "Barang Milik Negara");
    // ... existing bmn modules ...
    addChild(bmnModule, "bmn-data-aset-tetap", "Data Aset Tetap");
    addChild(bmnModule, "bmn-data-persediaan", "Data Persediaan");
    addChild(bmnModule, "bmn-permintaan-persediaan", "Permintaan Persediaan");
    addChild(bmnModule, "bmn-peminjaman-aset", "Peminjaman Aset");
    addChild(bmnModule, "bmn-pemeliharaan-keluhan", "Pemeliharaan/Keluhan");
    addChild(bmnModule, "bmn-laporan", "Laporan BMN");

    const itHelpdeskModule = createModule("it-helpdesk", "IT Helpdesk");
    addChild(itHelpdeskModule, "it-helpdesk-pelaporan", "Pelaporan Keluhan");
    addChild(itHelpdeskModule, "it-helpdesk-rekapan", "Rekapan Laporan");

    const pdttModule = createModule("pengadaan-pdtt", "Pengadaan");
    addChild(pdttModule, "pengadaan-pbj", "Proses Pengadaan PBJ");
    addChild(pdttModule, "pengadaan-pdtt-katalog", "Katalog Barang");
    addChild(pdttModule, "pengadaan-pdtt-rekapan", "Rekapan Pengajuan");
    addChild(pdttModule, "pengelola-pegawai-pdtt", "Hak Akses Pegawai");

    const keuanganModule = createModule("keuangan", "Keuangan");
    addChild(keuanganModule, "keuangan-lpj", "Pembuatan LPJ");
    addChild(keuanganModule, "keuangan-pejabat", "Pejabat Perbendaharaan");
    addChild(keuanganModule, "keuangan-revisi", "Revisi Anggaran");

    createModule("layanan-mandiri", "Layanan Mandiri");
    createModule("riwayat-layanan", "Riwayat Layanan");

    createModule("antrian-kontrol", "Manajemen UPP");

    return normalizeModules(baseModules);
  }, [modulesTree]);

  const SLUG_ICONS = {
    "kearsipan-peminjaman": <FileTextOutlined />,
    "kearsipan-pencatatan-surat": <FormOutlined />,
    "kearsipan-arsip-vital": <SafetyCertificateOutlined />,
    "kearsipan-manajemen-up-uk": <FolderOpenOutlined />,
    "kearsipan-laporan": <FileTextOutlined />,
    bmn: <AppstoreOutlined />,
    "bmn-data-aset-tetap": <DesktopOutlined />,
    "bmn-data-persediaan": <CodeSandboxOutlined />,
    "bmn-permintaan-persediaan": <ShoppingCartOutlined />,
    "bmn-peminjaman-aset": <KeyOutlined />,
    "bmn-pemeliharaan-keluhan": <AlertOutlined />,
    "bmn-laporan": <FileTextOutlined />,
    "pengadaan-pdtt": <ShoppingCartOutlined />,
    "pengadaan-pbj": <AuditOutlined />,
    "pengadaan-pdtt-katalog": <AppstoreOutlined />,
    "pengadaan-pdtt-rekapan": <FileTextOutlined />,
    "pengelola-pegawai-pdtt": <TeamOutlined />,
    "it-helpdesk": <CustomerServiceOutlined />,
    "it-helpdesk-pelaporan": <AlertOutlined />,
    "it-helpdesk-rekapan": <FileTextOutlined />,
    "admin-user-management": <TeamOutlined />,
    "admin-notification-settings": <BellOutlined />,
    "admin-news-posts": <FileTextOutlined />,
    camera: <CameraOutlined />,
    rispeg: <AuditOutlined />,
    "rispeg-ruh": <FormOutlined />,
    "rispeg-dashboard": <DashboardOutlined />,
    "rispeg-izin-keluar": <ExportOutlined />,
    "rispeg-pengaturan-izin-keluar": <SettingOutlined />,
    "kepegawaian-surat-tugas": <FileProtectOutlined />,
    "zoom-generator": <VideoCameraOutlined />,
    keuangan: <DollarOutlined />,
    "keuangan-lpj": <FileProtectOutlined />,
    "keuangan-pejabat": <TeamOutlined />,
    "keuangan-revisi": <FormOutlined />,
    "antrian-ulpk": <DesktopOutlined />,
    "antrian-kontrol": <DesktopOutlined />,
  };

  /* ── Role switching ── */
  const roleItems = useMemo(() => {
    const roles = Array.from(new Set(allowedRoles ?? []))
      .filter(Boolean)
      .sort((a, b) => {
        const indexA = ROLE_ORDER.indexOf(a);
        const indexB = ROLE_ORDER.indexOf(b);
        if (indexA !== -1 || indexB !== -1) {
          return (
            (indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA) -
            (indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB)
          );
        }
        return a.localeCompare(b);
      });
    return roles.map((role) => ({
      key: `role-${role}`,
      label: roleLabelFn(role),
      disabled: currentRole === role || isSwitchingRole,
    }));
  }, [allowedRoles, currentRole, isSwitchingRole]);

  const handleProfileMenuClick = useCallback(
    ({ key }) => {
      if (key === "logout") return logout();
      if (key === "account-settings") return navigate("/app/account-settings");
      if (key?.startsWith("role-")) {
        if (!user || isSwitchingRole) return;
        const targetRole = key.replace("role-", "");
        if (!(allowedRoles ?? []).includes(targetRole))
          return message.warning(
            "Anda tidak memiliki akses ke peran tersebut.",
          );
        if (targetRole === currentRole)
          return message.info(
            `Anda sudah menggunakan peran ${roleLabelFn(currentRole)}.`,
          );
        setIsSwitchingRole(true);
        setPendingRole(targetRole);
        switchRole(targetRole);
      }
    },
    [
      logout,
      user,
      isSwitchingRole,
      message,
      currentRole,
      switchRole,
      allowedRoles,
    ],
  );

  const profileMenu = useMemo(
    () => ({
      items: [
        {
          key: "roles",
          label: "Beralih Level",
          icon: <SwitcherOutlined />,
          children: roleItems,
        },
        {
          key: "account-settings",
          label: "Pengaturan Akun",
          icon: <SettingOutlined />,
        },
        { type: "divider" },
        { key: "logout", label: "Keluar", icon: <LogoutOutlined /> },
      ],
      onClick: handleProfileMenuClick,
    }),
    [roleItems, handleProfileMenuClick],
  );

  useEffect(() => {
    if (pendingRole && currentRole === pendingRole) {
      const timer = setTimeout(() => {
        setPendingRole(null);
        setIsSwitchingRole(false);
        message.success(
          `Peran aktif berubah menjadi ${roleLabelFn(currentRole)}.`,
        );

        // Paksa refresh ke halaman utama aplikasi agar seluruh state & modul sinkron
        // Gunakan window.location.origin + initialAppPath 
        window.location.href = initialAppPath;
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentRole, pendingRole, message, initialAppPath]);

  useEffect(() => {
    if (!pendingRole) return;
    const timer = setTimeout(() => {
      setIsSwitchingRole(false);
      setPendingRole(null);
      message.error("Gagal mengganti peran. Silakan coba lagi.");
    }, 1500);
    return () => clearTimeout(timer);
  }, [pendingRole, message]);

  const handleMenuClick = useCallback(
    ({ key }) => {
      if (key === "dashboard" && !isAdminUser) {
        navigate(initialAppPath);
        return;
      }
      const mappedPath = mapSlugToPath(key);
      navigate(mappedPath ?? `/app/${key}`);
    },
    [navigate, isAdminUser, initialAppPath],
  );


  const routesNode = (
    <Routes>
            <Route
              path="/"
              element={<Navigate to={initialAppPath} replace />}
            />
            <Route
              path="dashboard"
              element={isAdminUser ? <AdminDashboard /> : <NotFound />}
            />
            <Route
              path="operator-dashboard"
              element={
                <ProtectedRoute
                  role="operator"
                  fallback={
                    <Card className="op-dashboard__guard" variant="borderless">
                      <div className="op-guard-content">
                        <div className="op-guard-icon">
                          <SafetyOutlined />
                        </div>
                        <Title level={4}>Akses Terbatas</Title>
                        <Paragraph>
                          Dashboard operator hanya tersedia untuk pengguna
                          dengan role operator.
                        </Paragraph>
                        <Button
                          type="primary"
                          size="large"
                          icon={<ArrowRightOutlined />}
                          onClick={() => navigate("/app/layanan-mandiri")}
                          className="op-guard-btn"
                        >
                          Buka Layanan Mandiri
                        </Button>
                      </div>
                    </Card>
                  }
                >
                  <OperatorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="kepegawaian-data-pegawai"
              element={
                <ProtectedRoute moduleSlug="kepegawaian-data-pegawai">
                  <DataPegawai />
                </ProtectedRoute>
              }
            />
            <Route
              path="kepegawaian-kgb"
              element={
                <ProtectedRoute moduleSlug="kepegawaian-kgb">
                  <Kgb />
                </ProtectedRoute>
              }
            />
            <Route
              path="kepegawaian-kalender"
              element={
                <ProtectedRoute moduleSlug="kepegawaian-kalender">
                  <KepegawaianKalender />
                </ProtectedRoute>
              }
            />
            <Route
              path="kepegawaian-surat-tugas"
              element={
                <ProtectedRoute moduleSlug="kepegawaian-surat-tugas">
                  <KepegawaianSuratTugas />
                </ProtectedRoute>
              }
            />
            <Route
              path="zoom-generator"
              element={
                <ProtectedRoute moduleSlug="zoom-generator">
                  <ZoomGenerator />
                </ProtectedRoute>
              }
            />

            {/* Split Rispeg routes */}
            <Route
              path="rispeg-ruh"
              element={
                <ProtectedRoute moduleSlug="rispeg-ruh">
                  <Rispeg />
                </ProtectedRoute>
              }
            />
            <Route
              path="rispeg-dashboard"
              element={
                <ProtectedRoute moduleSlug="rispeg-dashboard">
                  <RispegDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="rispeg-izin-keluar"
              element={
                <ProtectedRoute moduleSlug="rispeg-izin-keluar">
                  <RispegMonitoringIzinKeluar />
                </ProtectedRoute>
              }
            />
            <Route
              path="rispeg-pengaturan-izin-keluar"
              element={
                <ProtectedRoute moduleSlug="rispeg-pengaturan-izin-keluar">
                  <RispegPengaturanIzinKeluar />
                </ProtectedRoute>
              }
            />
            {/* Fallback for old route temporarily or redirect? */}
            <Route
              path="kepegawaian-rispeg"
              element={<Navigate to="/app/rispeg-ruh" replace />}
            />
            <Route
              path="rispeg-monitoring"
              element={<Navigate to="/app/rispeg-dashboard" replace />}
            />

            <Route
              path="keuangan-lpj"
              element={
                <ProtectedRoute moduleSlug="keuangan-lpj">
                  <KeuanganLpj />
                </ProtectedRoute>
              }
            />
            <Route
              path="keuangan-pejabat"
              element={
                <ProtectedRoute moduleSlug="keuangan-pejabat">
                  <KeuanganPejabat />
                </ProtectedRoute>
              }
            />
            <Route
              path="keuangan-anggaran"
              element={
                <ProtectedRoute moduleSlug="keuangan-anggaran">
                  <Anggaran />
                </ProtectedRoute>
              }
            />
            <Route
              path="keuangan-invoice"
              element={
                <ProtectedRoute moduleSlug="keuangan-invoice">
                  <InvoiceBelanja />
                </ProtectedRoute>
              }
            />
            <Route
              path="keuangan-revisi"
              element={
                <ProtectedRoute moduleSlug="keuangan-revisi">
                  <PermintaanRevisi />
                </ProtectedRoute>
              }
            />
            <Route
              path="keuangan-realisasi-anggaran"
              element={
                <ProtectedRoute moduleSlug="keuangan-realisasi-anggaran">
                  <RealisasiAnggaran />
                </ProtectedRoute>
              }
            />
            <Route
              path="kearsipan-peminjaman"
              element={
                <ProtectedRoute moduleSlug="kearsipan-peminjaman">
                  <ManajemenPeminjamanArsip />
                </ProtectedRoute>
              }
            />
            <Route
              path="kearsipan-laporan"
              element={
                <ProtectedRoute moduleSlug="kearsipan-laporan">
                  <LaporanPeminjaman />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin-notification-settings"
              element={
                isAdminUser ? <AdminNotificationSettings /> : <NotFound />
              }
            />
            <Route
              path="admin-news-posts"
              element={isAdminUser ? <AdminNewsPosts /> : <NotFound />}
            />
            <Route
              path="admin-user-management"
              element={isAdminUser ? <AdminUserManagement /> : <NotFound />}
            />
            <Route
              path="kearsipan-manajemen-up-uk"
              element={
                <ProtectedRoute moduleSlug="kearsipan-manajemen-up-uk">
                  <KearsipanManajemenUpUk />
                </ProtectedRoute>
              }
            />
            <Route
              path="kearsipan-manajemen-up-uk"
              element={
                <ProtectedRoute moduleSlug="kearsipan-manajemen-up-uk">
                  <KearsipanManajemenUpUk />
                </ProtectedRoute>
              }
            />
            <Route
              path="validator-dashboard"
              element={
                <ProtectedRoute role="validator">
                  <ValidatorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="bmn-data-aset-tetap"
              element={
                <ProtectedRoute moduleSlug="bmn-data-aset-tetap">
                  <BmnDataAsetTetap />
                </ProtectedRoute>
              }
            />
            <Route
              path="bmn-data-persediaan"
              element={
                <ProtectedRoute moduleSlug="bmn-data-persediaan">
                  <BmnDataPersediaan />
                </ProtectedRoute>
              }
            />
            <Route
              path="bmn-peminjaman-aset/new"
              element={
                <ProtectedRoute moduleSlug="bmn-peminjaman-aset">
                  <BmnPeminjamanAsetForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="bmn-peminjaman-aset"
              element={
                <ProtectedRoute moduleSlug="bmn-peminjaman-aset">
                  <BmnPeminjamanAset />
                </ProtectedRoute>
              }
            />
            <Route
              path="bmn-permintaan-persediaan/new"
              element={
                <ProtectedRoute moduleSlug="bmn-permintaan-persediaan">
                  <BmnPermintaanPersediaanForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="bmn-permintaan-persediaan/:id"
              element={
                <ProtectedRoute moduleSlug="bmn-permintaan-persediaan">
                  <BmnPermintaanPersediaanDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="bmn-permintaan-persediaan"
              element={
                <ProtectedRoute moduleSlug="bmn-permintaan-persediaan">
                  <BmnPermintaanPersediaan />
                </ProtectedRoute>
              }
            />
            <Route
              path="bmn-laporan"
              element={
                <ProtectedRoute moduleSlug="bmn-laporan">
                  <BmnLaporan />
                </ProtectedRoute>
              }
            />
            <Route
              path="bmn-pemeliharaan-keluhan"
              element={
                <ProtectedRoute moduleSlug="bmn-pemeliharaan-keluhan">
                  <BmnPemeliharaanKeluhan />
                </ProtectedRoute>
              }
            />
            <Route
              path="pengadaan-pdtt-katalog"
              element={
                <ProtectedRoute moduleSlug="pengadaan-pdtt">
                  <PengadaanPdtt />
                </ProtectedRoute>
              }
            />
            <Route
              path="pengadaan-pdtt-rekapan"
              element={
                <ProtectedRoute moduleSlug="pengadaan-pdtt">
                  <AdminPengajuanPdtt />
                </ProtectedRoute>
              }
            />
            <Route
              path="pengelola-pegawai-pdtt"
              element={
                <ProtectedRoute moduleSlug="pengadaan-pdtt">
                  <PengelolaPegawaiPdtt />
                </ProtectedRoute>
              }
            />
            <Route
              path="pengaturan-slider"
              element={
                <ProtectedRoute role="admin">
                  <LayananMandiriSliderEditor />
                </ProtectedRoute>
              }
            />
            <Route
              path="antrian-kontrol"
              element={<Navigate to="/app/antrian-kontrol" replace />}
            />
            <Route path="layanan-mandiri" element={<LayananMandiri />} />
            <Route path="berita/:slug" element={<NewsDetail />} />
            <Route path="riwayat-layanan" element={<RiwayatLayanan />} />
            <Route
              path="it-helpdesk-pelaporan"
              element={
                <ProtectedRoute moduleSlug="it-helpdesk-pelaporan">
                  <ItHelpdeskDaftarLaporan />
                </ProtectedRoute>
              }
            />
            <Route path="account-settings" element={<AccountSettings />} />
            <Route path="*" element={<NotFound />} />
    </Routes>
  );

  if (isMobile) {
    return (
      <MobileAppShell
        activeKey={navActiveKey}
        onMenuClick={handleMenuClick}
        modules={modifiedModulesTree}
        allowedSlugs={accessibleModules}
        isAdmin={isAdminUser}
        user={user}
        currentRole={currentRole}
        profileMenu={profileMenu}
        initialAppPath={initialAppPath}
        logout={logout}
      >
        {routesNode}
      </MobileAppShell>
    );
  }

  return (
    <Layout className="app-layout">
      <NavbarMenu
        activeKey={navActiveKey}
        onMenuClick={handleMenuClick}
        modules={modifiedModulesTree}
        allowedSlugs={accessibleModules}
        isAdmin={isAdminUser}
        extraItems={extraMenuItems}
        user={user}
        currentRole={currentRole}
        profileMenu={profileMenu}
        isSwitchingRole={isSwitchingRole}
        roleLabel={roleLabelFn(currentRole)}
      />
      <Content className="app-content">
        <div className="page-shell">
          {routesNode}
        </div>
      </Content>
    </Layout>
  );
}

function roleLabelFn(role) {
  const labels = {
    admin: "Admin",
    operator: "Operator",
    validator: "Validator",
  };
  return labels[role] ?? role ?? "Tidak dikenal";
}

export default AppLayout;
