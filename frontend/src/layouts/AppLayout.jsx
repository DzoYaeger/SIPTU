import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Routes,
  Route,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";
import { App as AntdApp, Dropdown, Layout, Form, Input, Card, Typography, Button } from "antd";
const { Header } = Layout;
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
  SafetyOutlined,
  ArrowRightOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LeftOutlined,
  RightOutlined,
  DownOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  PictureOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import NavbarMenu from "../components/NavbarMenu.jsx";
import SidebarMenu from "../components/SidebarMenu.jsx";
import { Avatar, Space, Tag } from "antd";
import InfoPopupModal from "../components/InfoPopupModal.jsx";
import { useInfoPopup } from "../hooks/useInfoPopup.js";
import DataPegawai from "../views/DataPegawai.jsx";
import BmnDataAsetTetap from "../views/BmnDataAsetTetap.jsx";
import BmnDataPersediaan from "../views/BmnDataPersediaan.jsx";
import BmnPermintaanPersediaan from "../views/BmnPermintaanPersediaan.jsx";
import BmnPeminjamanAset from "../views/BmnPeminjamanAset.jsx";
import BmnPeminjamanAsetForm from "../views/BmnPeminjamanAsetForm.jsx";
import BmnUnifiedModule from "../views/BmnUnifiedModule.jsx";
import SimkeuUnifiedModule from "../views/SimkeuUnifiedModule.jsx";
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
import AdminLayananMandiriIconManagement from "../views/AdminLayananMandiriIconManagement.jsx";
import KearsipanManajemenUpUk from "../views/KearsipanManajemenUpUk.jsx";
import KearsipanPencatatanSurat from "../views/KearsipanPencatatanSurat.jsx";
import ValidatorDashboard from "../views/ValidatorDashboard.jsx";
import ManajemenPeminjamanArsip from "../views/ManajemenPeminjamanArsip.jsx";
import LaporanPeminjaman from "../views/LaporanPeminjaman.jsx";
import ItHelpdeskDaftarLaporan from "../views/ItHelpdeskDaftarLaporan.jsx";
import AccountSettings from "../views/AccountSettings.jsx";
import PenyimpananCloud from "../views/PenyimpananCloud.jsx";
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
import PengadaanPbj from "../views/PengadaanPbj.jsx";
import KearsipanArsipVital from "../views/KearsipanArsipVital.jsx";
import PelatihanPegawai from "../views/PelatihanPegawai.jsx";
import EInvitationModule from "../views/EInvitationModule.jsx";
import { useAuth } from "../hooks/useAuth.js";
import "./AppLayout.css";
import MobileAppShell from "./MobileAppShell.jsx";

const { Title, Paragraph } = Typography;

const MODULE_ORDER = [
  "dashboard",
  "operator-dashboard",
  "validator-dashboard",
  "layanan-mandiri",
  "riwayat-layanan",
  "kepegawaian",
  "rispeg",
  "kearsipan",
  "bmn",
  "keuangan",
  "perjadin",
  "pengadaan-pdtt",
  "it-helpdesk",
  "penyimpanan-cloud",
  "e-invitation",
  "siamparan",
  "antrian-kontrol",
  "admin-user-management",
  "admin-notification-settings",
  "admin-news-posts",
  "admin-layanan-mandiri-icons",
];
const CHILD_ORDER = {
  kepegawaian: [
    "kepegawaian-data-pegawai",
    "kepegawaian-kgb",
    "kepegawaian-kalender",
    "kepegawaian-surat-tugas",
    "kepegawaian-bangkom",
    "zoom-generator",
  ],
  rispeg: [
    "rispeg-ruh",
    "rispeg-dashboard",
    "rispeg-izin-keluar",
    "rispeg-pengaturan-izin-keluar",
    "rispeg-pengumuman",
  ],
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
  keuangan: [
    "keuangan-anggaran",
    "keuangan-realisasi-anggaran",
    "keuangan-revisi",
    "keuangan-invoice",
    "keuangan-lpj",
    "keuangan-pejabat",
  ],
  perjadin: [
    "perjadin-st",
    "perjadin-lpj",
    "perjadin-monitoring",
  ],
  "pengadaan-pdtt": [
    "pengadaan-pdtt-katalog",
    "pengadaan-pdtt-rekapan",
    "pengadaan-pdtt-pengajuan-pdtt",
    "pengadaan-pbj",
    "pengelola-pegawai-pdtt",
  ],
  "it-helpdesk": ["it-helpdesk-pelaporan", "it-helpdesk-rekapan"],
  "penyimpanan-cloud": ["penyimpanan-cloud"],
  "layanan-mandiri": ["layanan-mandiri", "riwayat-layanan", "pengaturan-slider"],
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
    "kepegawaian-bangkom": "/app/kepegawaian-bangkom",
    "zoom-generator": "/app/zoom-generator",
    "rispeg-ruh": "/app/rispeg-ruh",
    "rispeg-dashboard": "/app/rispeg-dashboard",
    "rispeg-izin-keluar": "/app/rispeg-izin-keluar",
    "rispeg-pengaturan-izin-keluar": "/app/rispeg-pengaturan-izin-keluar",
    "rispeg-pengumuman": "/app/rispeg-pengumuman",
    "kearsipan-peminjaman": "/app/kearsipan-peminjaman",
    "kearsipan-pencatatan-surat": "/app/kearsipan-pencatatan-surat",
    "kearsipan-arsip-vital": "/app/kearsipan-arsip-vital",
    "kearsipan-manajemen-up-uk": "/app/kearsipan-manajemen-up-uk",
    "kearsipan-laporan": "/app/kearsipan-laporan",
    "bmn-data-aset-tetap": "/app/bmn-data-aset-tetap",
    "bmn-data-persediaan": "/app/bmn-data-persediaan",
    "bmn-permintaan-persediaan": "/app/bmn-permintaan-persediaan",
    "bmn-peminjaman-aset": "/app/bmn-peminjaman-aset",
    "bmn-pemeliharaan-keluhan": "/app/bmn-pemeliharaan-keluhan",
    "bmn-laporan": "/app/bmn-laporan",
    "pengadaan-pbj": "/app/pengadaan-pbj",
    "pengadaan-pdtt-katalog": "/app/pengadaan-pdtt-katalog",
    "pengadaan-pdtt-rekapan": "/app/pengadaan-pdtt-rekapan",
    "pengadaan-pdtt-pengajuan-pdtt": "/app/pengadaan-pdtt-rekapan",
    "pengelola-pegawai-pdtt": "/app/pengelola-pegawai-pdtt",
    "keuangan-lpj": "/app/keuangan-lpj",
    "keuangan-pejabat": "/app/keuangan-pejabat",
    "keuangan-revisi": "/app/keuangan-revisi",
    "keuangan-anggaran": "/app/keuangan-anggaran",
    "keuangan-invoice": "/app/keuangan-invoice",
    "keuangan-realisasi-anggaran": "/app/keuangan-realisasi-anggaran",
    "perjadin-st": "/app/kepegawaian-surat-tugas",
    "perjadin-lpj": "/app/keuangan-lpj",
    "perjadin-monitoring": "/app/kepegawaian-surat-tugas",
    "it-helpdesk-pelaporan": "/app/it-helpdesk-pelaporan",
    "it-helpdesk-rekapan": "/app/it-helpdesk-rekapan",
    "admin-user-management": "/app/admin-user-management",
    "admin-notification-settings": "/app/admin-notification-settings",
    "admin-news-posts": "/app/admin-news-posts",
    "admin-layanan-mandiri-icons": "/app/admin-layanan-mandiri-icons",
    "validator-dashboard": "/app/validator-dashboard",
    "operator-dashboard": "/app/operator-dashboard",
    "pengaturan-slider": "/app/pengaturan-slider",
    "antrian-kontrol": "/app/antrian-kontrol",
    "penyimpanan-cloud": "/app/penyimpanan-cloud",
    "pelatihan-pegawai": "/app/kepegawaian-bangkom",
    "kepegawaian-pelatihan": "/app/kepegawaian-bangkom",
    "e-invitation": "/app/e-invitation",
    "simkeu": "/app/simkeu",
  };
  return routes[slug] ?? null;
}

function resolveInitialAppPath(accessibleModules, isAdminUser, currentRole) {
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

function AestheticHeaderWidget() {
  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = dayjs();
      setTimeStr(now.format("HH:mm:ss [WITA]"));
      setDateStr(now.format("dddd, D MMMM YYYY"));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const [weather, setWeather] = useState({
    temp: 29,
    text: "Cerah Berawan",
    icon: "⛅",
  });

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=-2.9972&longitude=120.1985&current_weather=true"
        );
        if (res.ok) {
          const data = await res.json();
          if (data?.current_weather) {
            const temp = Math.round(data.current_weather.temperature);
            const code = data.current_weather.weathercode;
            let text = "Cerah";
            let icon = "☀️";
            if (code >= 1 && code <= 3) {
              text = "Berawan";
              icon = "⛅";
            } else if (code >= 45 && code <= 48) {
              text = "Berkabut";
              icon = "🌫️";
            } else if (code >= 51 && code <= 67) {
              text = "Hujan Ringan";
              icon = "🌧️";
            } else if (code >= 80 && code <= 99) {
              text = "Hujan Petir";
              icon = "⛈️";
            }
            setWeather({ temp, text, icon });
          }
        }
      } catch (e) {
        console.warn("Gagal mengambil data cuaca:", e);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 600000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="aesthetic-header-widget">
      <div className="widget-item weather-box">
        <span className="location-name">Palopo</span>
        <span className="weather-temp">{weather.temp}°C</span>
        <span className="weather-badge">{weather.icon} {weather.text}</span>
      </div>

      <div className="widget-divider" />

      <div className="widget-item time-box">
        <ClockCircleOutlined className="clock-icon" />
        <span className="clock-time">{timeStr}</span>
        <span className="clock-date">{dateStr}</span>
      </div>
    </div>
  );
}

function AppLayout() {
  const infoPopup = useInfoPopup();
  const {
    user,
    currentRole,
    allowedRoles,
    switchRole,
    logout,
    accessibleModules,
    modulesTree,
    apiFetch,
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

  const isAdminUser = currentRole === "admin";
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
    items.push({
      key: "admin-layanan-mandiri-icons",
      label: "Manajemen Ikon Layanan Mandiri",
      icon: <PictureOutlined />,
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
    addChild(kepegawaianModule, "kepegawaian-bangkom", "Pengembangan Kompetensi");
    addChild(kepegawaianModule, "zoom-generator", "Zoom Generator");

    const rispegModule = createModule("rispeg", "RISPEG");
    addChild(rispegModule, "rispeg-ruh", "Input Data RiSPEG");
    addChild(rispegModule, "rispeg-dashboard", "Monitoring RISPEG");
    addChild(rispegModule, "rispeg-izin-keluar", "Monitoring Izin Keluar");
    addChild(rispegModule, "rispeg-pengaturan-izin-keluar", "Pengaturan Izin Keluar");
    addChild(rispegModule, "rispeg-pengumuman", "Pengumuman RISPEG");

    const kearsipanModule = createModule("kearsipan", "Kearsipan");
    addChild(kearsipanModule, "kearsipan-peminjaman", "Peminjaman Arsip");
    addChild(kearsipanModule, "kearsipan-pencatatan-surat", "Pencatatan Surat");
    addChild(kearsipanModule, "kearsipan-arsip-vital", "Pencatatan Arsip Vital");
    addChild(kearsipanModule, "kearsipan-manajemen-up-uk", "Manajemen UK/UP");
    addChild(kearsipanModule, "kearsipan-laporan", "Laporan Peminjaman");

    const bmnModule = createModule("bmn", "Barang Milik Negara");
    addChild(bmnModule, "bmn-data-aset-tetap", "Data Aset Tetap");
    addChild(bmnModule, "bmn-data-persediaan", "Data Persediaan");
    addChild(bmnModule, "bmn-permintaan-persediaan", "Permintaan Persediaan");
    addChild(bmnModule, "bmn-peminjaman-aset", "Peminjaman Aset");
    addChild(bmnModule, "bmn-pemeliharaan-keluhan", "Pemeliharaan/Keluhan");
    addChild(bmnModule, "bmn-laporan", "Laporan BMN");

    const keuanganModule = createModule("keuangan", "Keuangan");
    addChild(keuanganModule, "keuangan-anggaran", "Perencanaan Anggaran");
    addChild(keuanganModule, "keuangan-realisasi-anggaran", "Realisasi Anggaran");
    addChild(keuanganModule, "keuangan-revisi", "Revisi Anggaran");
    addChild(keuanganModule, "keuangan-invoice", "Pembuatan Invoice");
    addChild(keuanganModule, "keuangan-lpj", "Pembuatan LPJ");
    addChild(keuanganModule, "keuangan-pejabat", "Pejabat Perbendaharaan");

    const pdttModule = createModule("pengadaan-pdtt", "Pengadaan & PDTT");
    addChild(pdttModule, "pengadaan-pbj", "Pengadaan Barang & Jasa (PBJ)");
    addChild(pdttModule, "pengadaan-pdtt-katalog", "Katalog Barang");
    addChild(pdttModule, "pengadaan-pdtt-rekapan", "Rekapan Pengajuan");
    addChild(pdttModule, "pengelola-pegawai-pdtt", "Jumlah Hari Pegawai");

    const itHelpdeskModule = createModule("it-helpdesk", "IT Helpdesk");
    addChild(itHelpdeskModule, "it-helpdesk-pelaporan", "Pelaporan Keluhan");
    addChild(itHelpdeskModule, "it-helpdesk-rekapan", "Rekapan Laporan");

    const cloudModule = createModule("penyimpanan-cloud", "Penyimpanan Cloud");
    addChild(cloudModule, "penyimpanan-cloud", "Storage Cloud Drive");

    createModule("layanan-mandiri", "Layanan Mandiri");
    createModule("riwayat-layanan", "Riwayat Layanan");

    createModule("antrian-kontrol", "Manajemen UPP");

    return normalizeModules(baseModules);
  }, [modulesTree]);

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
              element={isAdminUser ? <AdminDashboard /> : <Navigate to={initialAppPath} replace />}
            />
            <Route
              path="operator-dashboard"
              element={
                <ProtectedRoute role="operator">
                  <OperatorDashboard />
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
              path="kepegawaian-bangkom"
              element={
                <ProtectedRoute moduleSlug="kepegawaian-bangkom">
                  <PelatihanPegawai />
                </ProtectedRoute>
              }
            />

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
            <Route
              path="rispeg-pengumuman"
              element={
                <ProtectedRoute moduleSlug="rispeg-pengumuman">
                  <PengumumanRispeg />
                </ProtectedRoute>
              }
            />
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
              path="kearsipan-pencatatan-surat"
              element={
                <ProtectedRoute moduleSlug="kearsipan-pencatatan-surat">
                  <KearsipanPencatatanSurat />
                </ProtectedRoute>
              }
            />
            <Route
              path="kearsipan-arsip-vital"
              element={
                <ProtectedRoute moduleSlug="kearsipan-arsip-vital">
                  <KearsipanArsipVital />
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
              path="kearsipan-laporan"
              element={
                <ProtectedRoute moduleSlug="kearsipan-laporan">
                  <LaporanPeminjaman />
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
              path="bmn-peminjaman-aset"
              element={
                <ProtectedRoute moduleSlug="bmn-peminjaman-aset">
                  <BmnPeminjamanAset />
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
              path="pengadaan-pbj"
              element={
                <ProtectedRoute moduleSlug="pengadaan-pbj">
                  <PengadaanPbj />
                </ProtectedRoute>
              }
            />
            <Route
              path="pengadaan-pdtt-katalog"
              element={
                <ProtectedRoute moduleSlug="pengadaan-pdtt-katalog">
                  <PengadaanPdtt />
                </ProtectedRoute>
              }
            />
            <Route
              path="pengadaan-pdtt-rekapan"
              element={
                <ProtectedRoute moduleSlug="pengadaan-pdtt-rekapan">
                  <AdminPengajuanPdtt />
                </ProtectedRoute>
              }
            />
            <Route
              path="pengelola-pegawai-pdtt"
              element={
                <ProtectedRoute moduleSlug="pengelola-pegawai-pdtt">
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
              element={<AdminQueueControl />}
            />
            <Route path="layanan-mandiri" element={<LayananMandiri />} />
            <Route path="berita/:slug" element={<NewsDetail />} />
            <Route path="riwayat-layanan" element={<RiwayatLayanan />} />
            <Route
              path="penyimpanan-cloud"
              element={
                <ProtectedRoute moduleSlug="penyimpanan-cloud">
                  <PenyimpananCloud />
                </ProtectedRoute>
              }
            />
            <Route
              path="it-helpdesk-pelaporan"
              element={
                <ProtectedRoute moduleSlug="it-helpdesk-pelaporan">
                  <ItHelpdeskDaftarLaporan />
                </ProtectedRoute>
              }
            />
            <Route
              path="it-helpdesk-rekapan"
              element={
                <ProtectedRoute moduleSlug="it-helpdesk-rekapan">
                  <ItHelpdeskDaftarLaporan />
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
              path="admin-layanan-mandiri-icons"
              element={isAdminUser ? <AdminLayananMandiriIconManagement /> : <NotFound />}
            />
            <Route
              path="admin-user-management"
              element={isAdminUser ? <AdminUserManagement /> : <NotFound />}
            />
            <Route path="account-settings" element={<AccountSettings />} />
            <Route path="e-invitation" element={<EInvitationModule />} />
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

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [badgeCounts, setBadgeCounts] = useState({});
  const [serverTime, setServerTime] = useState(() => dayjs().format("HH:mm:ss [WITA]"));

  useEffect(() => {
    const timer = setInterval(() => {
      setServerTime(dayjs().format("HH:mm:ss [WITA]"));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchBadgeCounts = useCallback(async () => {
    try {
      const response = await apiFetch("/sidebar/badge-counts");
      if (response.ok) {
        const resData = await response.json();
        setBadgeCounts(resData.counts || {});
      }
    } catch (e) {
      console.warn("Gagal memuat sidebar badge counts", e);
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchBadgeCounts();
    const interval = setInterval(fetchBadgeCounts, 15000);

    const handleRefresh = () => fetchBadgeCounts();
    window.addEventListener("siptu:refresh-badge-counts", handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener("siptu:refresh-badge-counts", handleRefresh);
    };
  }, [fetchBadgeCounts]);

  return (
    <Layout className="app-layout-sidebar-root" style={{ minHeight: "100vh" }}>
      {/* Top Navbar Header - Clean White Header */}
      <Header
        className="app-top-header"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1000,
          width: "100%",
          padding: "0 16px",
          height: 48,
          lineHeight: "normal",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0"
        }}
      >
        <div className="header-left" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Logo SIPTU (/logo/logo-samping.png) */}
          <div className="header-logo" style={{ display: "flex", alignItems: "center", width: 175, flexShrink: 0 }}>
            <img
              src="/logo/logo-samping.png"
              alt="SIPTU Logo"
              style={{ height: 32, maxWidth: 160, objectFit: "contain" }}
            />
          </div>

          {/* Toggle Sidebar Arrow Button - Smooth & Fixed in Navbar Header */}
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? "Buka Sidebar Menu" : "Tutup Sidebar Menu"}
            aria-label={sidebarCollapsed ? "Buka Sidebar Menu" : "Tutup Sidebar Menu"}
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              boxShadow: "0 2px 6px rgba(15, 23, 42, 0.12)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              outline: "none",
              padding: 0,
              flexShrink: 0,
              transition: "all 0.2s ease"
            }}
          >
            {sidebarCollapsed ? (
              <RightOutlined style={{ fontSize: 11, color: "#0F5B99" }} />
            ) : (
              <LeftOutlined style={{ fontSize: 11, color: "#0F5B99" }} />
            )}
          </button>

          <AestheticHeaderWidget />
        </div>

        {/* Main Header Content Bar (Profile & Settings) */}
        <div
          className="header-main-bar"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            flex: 1,
            padding: "0 16px"
          }}
        >
          <div className="header-right" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {extraMenuItems.length > 0 && (
              <Dropdown
                menu={{ items: extraMenuItems, onClick: handleMenuClick }}
                placement="bottomRight"
                trigger={["click"]}
              >
                <Button type="text" className="header-icon-btn" icon={<SettingOutlined />} title="Pengaturan Admin" />
              </Dropdown>
            )}

            <Dropdown menu={profileMenu} placement="bottomRight" trigger={["click"]}>
              <div className="user-profile-trigger" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "4px 10px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#ffffff" }}>
                <Typography.Text strong className="user-name-text" style={{ fontSize: 12.5, color: "#1a1f2e" }}>
                  {user?.name || 'Pengguna'}
                </Typography.Text>
                <Tag color="indigo" style={{ margin: 0, borderRadius: 4, fontWeight: 600, fontSize: 10.5 }}>
                  {roleLabelFn(currentRole)}
                </Tag>
                <DownOutlined style={{ fontSize: 10, color: '#94a3b8', marginLeft: 2 }} />
              </div>
            </Dropdown>
          </div>
        </div>
      </Header>

      {/* Main Container below Header: Sidebar + Content */}
      <Layout className="app-main-layout" style={{ display: "flex", flexDirection: "row", minHeight: "calc(100vh - 48px)" }}>
        <SidebarMenu
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          activeKey={navActiveKey}
          onMenuClick={handleMenuClick}
          modules={modifiedModulesTree}
          allowedSlugs={accessibleModules}
          isAdmin={isAdminUser && currentRole === "admin"}
          extraItems={[]}
          badgeCounts={badgeCounts}
        />

        <Content className="app-content">
          <div className="page-shell">
            {routesNode}
          </div>
        </Content>
      </Layout>
      <InfoPopupModal {...infoPopup} />
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
