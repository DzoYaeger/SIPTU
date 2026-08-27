import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import RiwayatLayanan from "./RiwayatLayanan.jsx";

// Import all official application icons
import simbaIcon from "../assets/icons/simba-icon.png";
import simkeuIcon from "../assets/icons/simkeu-icon.png";
import siptuDriveIcon from "../assets/icons/siptu-drive-icon.png";
import rispegPengumumanIcon from "../assets/icons/rispeg-pengumuman-icon.png";
import sesiKompakIcon from "../assets/icons/sesi-kompak-icon.png";
import zoomIcon from "../assets/icons/zoom-icon.png";
import suratTugasIcon from "../assets/icons/surat-tugas-icon.png";
import sakipIcon from "../assets/icons/sakip-icon.png";
import ruanganIcon from "../assets/icons/ruangan-icon.png";
import itHelpdeskIcon from "../assets/icons/it-helpdesk-icon.png";
import kearsipanIcon from "../assets/icons/kearsipan-icon.png";
import izinKeluarIcon from "../assets/icons/izin-keluar-icon.png";
import kepegawaianIcon from "../assets/icons/kepegawaian-icon.png";
import pdttIcon from "../assets/icons/pdtt-icon.png";
import buildingIcon from "../assets/icons/building-icon.png";

import {
  SafetyCertificateOutlined,
  FundOutlined,
  ClockCircleOutlined,
  ToolOutlined,
  ShoppingOutlined,
  DashboardOutlined,
  ArrowRightOutlined,
  SearchOutlined,
  FileProtectOutlined,
  UserOutlined,
  HistoryOutlined,
  LogoutOutlined,
  SettingOutlined,
  AndroidOutlined,
  LeftOutlined,
  RightOutlined,
  MessageOutlined,
  GlobalOutlined,
  CloseOutlined,
  MenuOutlined,
  AppstoreOutlined,
  CloudUploadOutlined,
  CloudServerOutlined,
  NotificationOutlined,
  BarcodeOutlined,
  InfoCircleOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  ClockCircleFilled,
  CloseCircleFilled,
  CheckCircleOutlined,
  BankOutlined,
  SyncOutlined,
  MailOutlined,
  PhoneOutlined,
  StarOutlined,
  StarFilled,
  CompassOutlined,
  FireOutlined,
  BulbOutlined,
  ThunderboltOutlined,
  DesktopOutlined,
  PictureOutlined,
  EditOutlined,
  MedicineBoxOutlined,
  ProjectOutlined,
  ControlOutlined,
  FilterOutlined,
  PlusOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SaveOutlined,
  FileTextOutlined,
  TeamOutlined,
  UploadOutlined,
} from "@ant-design/icons";

import { Modal, Steps, Tag, Spin, Button, Tooltip, Input, Badge, Tabs, Select, Popconfirm, notification, Radio, Upload, message } from "antd";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/id";
import "./LayananMandiri.css";
import AIAssistantWidget from "../components/AIAssistantWidget";
import { useInfoPopup } from "../hooks/useInfoPopup.js";
import InfoPopupModal from "../components/InfoPopupModal.jsx";

dayjs.extend(relativeTime);
dayjs.locale("id");

const DEFAULT_CATEGORIES = [
  { key: "all", label: "Semua Layanan", icon: "AppstoreOutlined", color: "#0F5B99" },
  { key: "kepegawaian", label: "Kepegawaian & Izin", icon: "UserOutlined", color: "#0F5B99" },
  { key: "logistik", label: "BMN & Sarpras", icon: "BankOutlined", color: "#2563eb" },
  { key: "it", label: "IT & Digital", icon: "DesktopOutlined", color: "#ef4444" },
  { key: "keuangan", label: "Keuangan & LPJ", icon: "FundOutlined", color: "#10b981" },
];

const DEFAULT_MAPPING = {
  "simkeu": "keuangan",
  "siptu-drive": "kepegawaian",
  "pelatihan-pegawai": "kepegawaian",
  "kearsipan": "kepegawaian",
  "simba": "logistik",
  "ruangan": "logistik",
  "rispeg": "kepegawaian",
  "pengumuman-rispeg": "kepegawaian",
  "it-helpdesk": "it",
  "surat-tugas": "kepegawaian",
  "zoom-generator": "kepegawaian",
  "pengadaan-pbj": "logistik",
  "rhpk": "kepegawaian",
  "pemeriksaan-kesehatan": "kepegawaian",
  "kanban-work": "kepegawaian",
  "sakip-2026": "kepegawaian",
  "pengusulan-pengadaan": "logistik",
  "pengajuan-pdtt": "logistik",
};

const AVAILABLE_CATEGORY_ICONS = [
  { key: "AppstoreOutlined", label: "Appstore (Kotak Menu)" },
  { key: "UserOutlined", label: "User (Pegawai / SDM)" },
  { key: "BankOutlined", label: "Bank (BMN / Sarpras)" },
  { key: "DesktopOutlined", label: "Desktop (IT / Komputer)" },
  { key: "FundOutlined", label: "Fund (Keuangan / Anggaran)" },
  { key: "ShoppingOutlined", label: "Shopping (PBJ / Logistik)" },
  { key: "SafetyCertificateOutlined", label: "Safety (Hukum / Tata Usaha)" },
  { key: "MedicineBoxOutlined", label: "Medicine (Kesehatan / MCU)" },
  { key: "ProjectOutlined", label: "Project (Kanban / Tugas)" },
  { key: "FileTextOutlined", label: "File (Arsip / Dokumen)" },
  { key: "GlobalOutlined", label: "Global (Publik / Web)" },
  { key: "ThunderboltOutlined", label: "Thunderbolt (Layanan Kilat)" },
  { key: "TeamOutlined", label: "Team (Kelompok Kerja)" },
  { key: "ClockCircleOutlined", label: "Clock (Jadwal & Waktu)" },
  { key: "CompassOutlined", label: "Compass (Panduan / SAKIP)" },
  { key: "StarOutlined", label: "Star (Unggulan)" },
  { key: "NotificationOutlined", label: "Bell (Pengumuman)" },
];

const resolveCategoryIcon = (iconKey) => {
  switch (iconKey) {
    case "AppstoreOutlined": return <AppstoreOutlined />;
    case "UserOutlined": return <UserOutlined />;
    case "BankOutlined": return <BankOutlined />;
    case "DesktopOutlined": return <DesktopOutlined />;
    case "FundOutlined": return <FundOutlined />;
    case "ShoppingOutlined": return <ShoppingOutlined />;
    case "SafetyCertificateOutlined": return <SafetyCertificateOutlined />;
    case "MedicineBoxOutlined": return <MedicineBoxOutlined />;
    case "ProjectOutlined": return <ProjectOutlined />;
    case "FileTextOutlined": return <FileTextOutlined />;
    case "GlobalOutlined": return <GlobalOutlined />;
    case "ThunderboltOutlined": return <ThunderboltOutlined />;
    case "TeamOutlined": return <TeamOutlined />;
    case "ClockCircleOutlined": return <ClockCircleOutlined />;
    case "CompassOutlined": return <CompassOutlined />;
    case "StarOutlined": return <StarOutlined />;
    case "NotificationOutlined": return <NotificationOutlined />;
    default: return <AppstoreOutlined />;
  }
};

const LayananMandiri = () => {
  const navigate = useNavigate();
  const { user, currentRole, logout, apiFetch } = useAuth();
  const infoPopup = useInfoPopup();

  // State Declarations
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [customLayananIcons, setCustomLayananIcons] = useState({});
  const [editingCustomIcons, setEditingCustomIcons] = useState({});
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [showWaffleMenu, setShowWaffleMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [riwayatModalOpen, setRiwayatModalOpen] = useState(false);
  const [heroSlides, setHeroSlides] = useState([]);

  // Pinned / Favorite Services State
  const [pinnedServices, setPinnedServices] = useState(() => {
    try {
      const stored = localStorage.getItem("siptu_pinned_services");
      return stored ? JSON.parse(stored) : ["surat-tugas", "simba", "simkeu"];
    } catch (e) {
      return ["surat-tugas", "simba", "simkeu"];
    }
  });

  const togglePinService = (e, serviceId) => {
    e.stopPropagation();
    setPinnedServices((prev) => {
      const next = prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId];
      localStorage.setItem("siptu_pinned_services", JSON.stringify(next));
      return next;
    });
  };

  // Data Fetching State
  const [myActiveRequests, setMyActiveRequests] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [showPdtt, setShowPdtt] = useState(false);
  const [showProcurementProposalService, setShowProcurementProposalService] = useState(true);

  // Dynamic Category & Service Mapping State
  const [categories, setCategories] = useState(() => {
    try {
      const stored = localStorage.getItem("siptu_layanan_categories");
      return stored ? JSON.parse(stored) : DEFAULT_CATEGORIES;
    } catch (e) {
      return DEFAULT_CATEGORIES;
    }
  });

  const [serviceCategoryMapping, setServiceCategoryMapping] = useState(() => {
    try {
      const stored = localStorage.getItem("siptu_layanan_mapping");
      return stored ? JSON.parse(stored) : DEFAULT_MAPPING;
    } catch (e) {
      return DEFAULT_MAPPING;
    }
  });

  // Filter Manager Modal State (Admin)
  const [isFilterManagerOpen, setIsFilterManagerOpen] = useState(false);
  const [filterManagerTab, setFilterManagerTab] = useState("mapping"); // 'mapping' | 'categories'
  const [editingCategories, setEditingCategories] = useState([]);
  const [editingMapping, setEditingMapping] = useState({});
  const [savingFilterConfig, setSavingFilterConfig] = useState(false);
  const [mappingSearchTerm, setMappingSearchTerm] = useState("");
  const [newCatLabel, setNewCatLabel] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("AppstoreOutlined");

  // Horizontal Scroll & Drag Support for Category Filter Bar
  const categoryBarRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const isDraggingCatRef = useRef(false);
  const startXCatRef = useRef(0);
  const scrollLeftCatRef = useRef(0);
  const hasMovedCatRef = useRef(false);

  const checkCatScrollability = useCallback(() => {
    const el = categoryBarRef.current;
    if (el) {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setCanScrollLeft(scrollLeft > 6);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
    }
  }, []);

  useEffect(() => {
    checkCatScrollability();
    const el = categoryBarRef.current;
    if (el) {
      el.addEventListener("scroll", checkCatScrollability, { passive: true });
      window.addEventListener("resize", checkCatScrollability);
    }
    return () => {
      if (el) el.removeEventListener("scroll", checkCatScrollability);
      window.removeEventListener("resize", checkCatScrollability);
    };
  }, [checkCatScrollability, categories]);

  const scrollCategoryBar = (direction) => {
    if (!categoryBarRef.current) return;
    const distance = 220;
    categoryBarRef.current.scrollBy({
      left: direction === "left" ? -distance : distance,
      behavior: "smooth",
    });
  };

  const handleCatMouseDown = (e) => {
    if (!categoryBarRef.current) return;
    isDraggingCatRef.current = true;
    hasMovedCatRef.current = false;
    startXCatRef.current = e.pageX - categoryBarRef.current.offsetLeft;
    scrollLeftCatRef.current = categoryBarRef.current.scrollLeft;
  };

  const handleCatMouseMove = (e) => {
    if (!isDraggingCatRef.current || !categoryBarRef.current) return;
    const x = e.pageX - categoryBarRef.current.offsetLeft;
    const walk = (x - startXCatRef.current);
    if (Math.abs(walk) > 4) {
      hasMovedCatRef.current = true;
      categoryBarRef.current.scrollLeft = scrollLeftCatRef.current - walk;
    }
  };

  const handleCatMouseUpOrLeave = () => {
    isDraggingCatRef.current = false;
  };

  const handleCatWheel = (e) => {
    if (!categoryBarRef.current) return;
    if (e.deltaY !== 0 && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      categoryBarRef.current.scrollLeft += e.deltaY;
    }
  };

  // Modals State
  const [bmnModalVisible, setBmnModalVisible] = useState(false);
  const [selectedBmn, setSelectedBmn] = useState(null);
  const [loadingBmn, setLoadingBmn] = useState(false);

  const [itModalVisible, setItModalVisible] = useState(false);
  const [selectedIt, setSelectedIt] = useState(null);
  const [loadingIt, setLoadingIt] = useState(false);

  const [exitModalVisible, setExitModalVisible] = useState(false);
  const [selectedExit, setSelectedExit] = useState(null);
  const [loadingExit, setLoadingExit] = useState(false);

  // Synchronize Custom Icons
  useEffect(() => {
    const loadCustomIcons = () => {
      try {
        const stored = localStorage.getItem("siptu_custom_layanan_icons");
        if (stored) setCustomLayananIcons(JSON.parse(stored));
        else setCustomLayananIcons({});
      } catch (e) {
        console.error("Gagal memuat ikon Layanan Mandiri:", e);
      }
    };
    loadCustomIcons();
    window.addEventListener("siptu_layanan_icons_updated", loadCustomIcons);
    return () => window.removeEventListener("siptu_layanan_icons_updated", loadCustomIcons);
  }, []);

  // Timer & Keyboard Command Palette Listener (Ctrl + K)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearInterval(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Fetching Data (including Hero Slider config for custom banner)
  useEffect(() => {
    const checkPdtt = async () => {
      try {
        const res = await apiFetch("/pdtt-items/requestable");
        if (res.ok) setShowPdtt(true);
      } catch (e) { console.error(e); }
    };

    const checkPdttServiceConfig = async () => {
      try {
        const res = await apiFetch("/pdtt-service-config");
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data?.pdtt_service_enabled === "boolean") setShowProcurementProposalService(data.pdtt_service_enabled);
      } catch (e) { console.error(e); }
    };

    const fetchHeroSlider = async () => {
      try {
        const res = await apiFetch("/hero-slider");
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        if (Array.isArray(data.slides)) setHeroSlides(data.slides);
        else if (Array.isArray(data)) setHeroSlides(data);
      } catch (e) { console.error("Failed to fetch hero slider", e); }
    };

    const fetchMyActiveRequests = async () => {
      try {
        const res = await apiFetch("/dashboard/my-active-requests");
        if (res.ok) {
          const data = await res.json();
          setMyActiveRequests(Array.isArray(data) ? data : []);
        }
      } catch (e) { console.error("Failed to fetch my active requests", e); }
    };

    const fetchActivities = async () => {
      try {
        const res = await apiFetch("/dashboard/activities");
        if (res.ok) {
          const data = await res.json();
          setRecentActivities(data);
        }
      } catch (e) { console.error("Failed to fetch activities", e); }
    };

    const fetchLayananFilterConfig = async () => {
      try {
        const res = await apiFetch("/layanan-filter-config");
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            if (Array.isArray(json.data.categories) && json.data.categories.length > 0) {
              setCategories(json.data.categories);
              localStorage.setItem("siptu_layanan_categories", JSON.stringify(json.data.categories));
            }
            if (json.data.mapping && typeof json.data.mapping === "object") {
              setServiceCategoryMapping(json.data.mapping);
              localStorage.setItem("siptu_layanan_mapping", JSON.stringify(json.data.mapping));
            }
          }
        }
      } catch (e) {
        console.error("Gagal memuat konfigurasi filter layanan:", e);
      }
    };

    if (user) {
      checkPdtt();
      checkPdttServiceConfig();
      fetchHeroSlider();
      fetchMyActiveRequests();
      fetchActivities();
      fetchLayananFilterConfig();
    }
  }, [apiFetch, user]);

  // Active custom banner background image if uploaded
  const customBannerImage = useMemo(() => {
    if (heroSlides && heroSlides.length > 0 && heroSlides[0]?.image) {
      return heroSlides[0].image;
    }
    return null;
  }, [heroSlides]);

  // Base Services Array
  const rawServices = [
    { id: "simkeu", title: "SIMKEU", description: "Pertanggungjawaban Keuangan, Kelola LPJ & Invoice Belanja.", icon: <img src={simkeuIcon} alt="SIMKEU" className="lm-custom-img-icon" />, link: "/app/simkeu", accent: "#10b981", category: "keuangan" },
    { id: "siptu-drive", title: "SIPTU Drive", description: "Penyimpanan cloud terintegrasi untuk berkas kerja & kolaborasi.", icon: <img src={siptuDriveIcon} alt="SIPTU Drive" className="lm-custom-img-icon" />, link: "/app/penyimpanan-cloud", accent: "#1a73e8", category: "kepegawaian" },
    { id: "pelatihan-pegawai", title: "Sesi Kompak", description: "Data pelatihan teknis, workshop & diseminasi pegawai.", icon: <img src={sesiKompakIcon} alt="Sesi Kompak" className="lm-custom-img-icon" />, link: "/app/pelatihan-pegawai", accent: "#0f5b99", category: "kepegawaian" },
    { id: "kearsipan", title: "Peminjaman Arsip", description: "Pengajuan peminjaman arsip fisik & digital ber-TTE.", icon: <img src={kearsipanIcon} alt="Peminjaman Arsip" className="lm-custom-img-icon" />, link: "/kearsipan-peminjaman/new", accent: "#3b82f6", category: "kepegawaian" },
    { id: "simba", title: "SIMBA", description: "Manajemen Barang & Aset BMN: Peminjaman & Pemeliharaan.", icon: <img src={simbaIcon} alt="SIMBA" className="lm-custom-img-icon" />, link: "/app/simba", accent: "#2563eb", category: "logistik" },
    { id: "ruangan", title: "Peminjaman Ruangan", description: "Jadwal & pengajuan peminjaman ruang rapat / aula.", icon: <img src={ruanganIcon} alt="Peminjaman Ruangan" className="lm-custom-img-icon" />, link: "/peminjaman-ruangan", accent: "#6366f1", category: "logistik" },
    { id: "rispeg", title: "Izin Keluar (RISPEG)", description: "Pengajuan izin keluar kantor dengan pencatatan waktu otomatis.", icon: <img src={izinKeluarIcon} alt="Izin Keluar (RISPEG)" className="lm-custom-img-icon" />, link: "/izin-keluar", accent: "#8b5cf6", category: "kepegawaian" },
    { id: "pengumuman-rispeg", title: "RISPEG Rekap", description: "Hasil rekapitulasi pelanggaran & leaderboard poin disiplin.", icon: <img src={rispegPengumumanIcon} alt="RISPEG" className="lm-custom-img-icon" />, link: "/app/pengumuman-rispeg", accent: "#ef4444", category: "kepegawaian" },
    { id: "it-helpdesk", title: "IT Helpdesk", description: "Pelaporan kendala perangkat IT, jaringan, & aplikasi.", icon: <img src={itHelpdeskIcon} alt="IT Helpdesk" className="lm-custom-img-icon" />, link: "/it-helpdesk/new", accent: "#ef4444", category: "it" },
    { id: "surat-tugas", title: "Pengajuan Surat Tugas", description: "Pembuatan surat tugas multi-pegawai & SIAMPARAN.", icon: <img src={suratTugasIcon} alt="Pengajuan Surat Tugas" className="lm-custom-img-icon" />, link: "/app/surat-tugas", accent: "#6366f1", category: "kepegawaian" },
    { id: "zoom-generator", title: "Pengajuan Zoom", description: "Pembuatan room Zoom instan akun resmi BPOM Palopo.", icon: <img src={zoomIcon} alt="Pengajuan Zoom" className="lm-custom-img-icon" />, link: "/app/zoom-generator", accent: "#0b56a4", category: "kepegawaian" },
    { id: "pengadaan-pbj", title: "Pengadaan PBJ", description: "Lacak status & data pengadaan barang/jasa instansi.", icon: <ShoppingOutlined />, link: "/app/pengadaan-pbj", accent: "#0284c7", category: "logistik" },
    { id: "rhpk", title: "Layanan RHPK", description: "Capaian & evaluasi kinerja bulanan, target output & penjelasan indikator.", icon: <img src={buildingIcon} alt="Layanan RHPK" className="lm-custom-img-icon" />, link: "/app/rhpk", accent: "#0F5B99", category: "kepegawaian" },
    { id: "pemeriksaan-kesehatan", title: "Pemeriksaan Kesehatan", description: "Pilih paket MCU, cek sisa saldo plafon, dan riwayat pemeriksaan kesehatan.", icon: <MedicineBoxOutlined style={{ fontSize: 24, color: "#0284c7" }} />, link: "/app/pemeriksaan-kesehatan", accent: "#0284c7", category: "kepegawaian" },
    { id: "kanban-work", title: "Kanban Work", description: "Papan tugas tim interaktif, rincian tahapan & upload bukti ke Nextcloud.", icon: <ProjectOutlined style={{ fontSize: 24, color: "#0F5B99" }} />, link: "/app/kanban-work", accent: "#0F5B99", category: "kepegawaian" },
    { id: "sakip-2026", title: "DATA SAKIP 2026", description: "Sistem Akuntabilitas Kinerja Instansi Pemerintah.", icon: <img src={sakipIcon} alt="DATA SAKIP 2026" className="lm-custom-img-icon" />, link: "https://s.id/sakippalopo26", accent: "#10b981", category: "kepegawaian", isExternal: true },
  ];

  const services = useMemo(() => {
    const list = [...rawServices];
    if (showProcurementProposalService) list.push({ id: "pengusulan-pengadaan", title: "Pengusulan PBJ", description: "Usulan layanan pengadaan barang diluar master data.", icon: <ShoppingOutlined />, link: "/pengusulan-pengadaan/new", accent: "#0284c7", category: "logistik" });
    if (showPdtt) list.push({ id: "pengajuan-pdtt", title: "Pengadaan PDTT", description: "Pengadaan daftar barang sesuai periode aktif.", icon: <img src={pdttIcon} alt="Pengadaan PDTT" className="lm-custom-img-icon" />, link: "/pengajuan-pdtt/new", accent: "#f59e0b", category: "logistik" });

    return list.map((item) => {
      const mappedCategory = serviceCategoryMapping[item.id] || item.category || "kepegawaian";
      const iconToUse = customLayananIcons[item.id]
        ? <img src={customLayananIcons[item.id]} alt={item.title} className="lm-custom-img-icon" />
        : item.icon;

      return {
        ...item,
        category: mappedCategory,
        icon: iconToUse,
      };
    }).sort((a, b) => a.title.localeCompare(b.title));
  }, [showProcurementProposalService, showPdtt, customLayananIcons, serviceCategoryMapping]);

  // Filtered Services according to Category & Search
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchCat = selectedCategory === "all" || s.category === selectedCategory;
      const matchSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase()) || s.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [services, selectedCategory, searchTerm]);

  // Pinned Services Objects
  const pinnedServiceObjects = useMemo(() => {
    return services.filter((s) => pinnedServices.includes(s.id));
  }, [services, pinnedServices]);

  const dashboardPath = useMemo(() => {
    if (!user) return "/app";
    const role = currentRole || user.base_role;
    if (role === "admin") return "/app/dashboard";
    if (role === "validator") return "/app/validator-dashboard";
    if (role === "operator") return "/app/operator-dashboard";
    return "/app/layanan-mandiri";
  }, [user, currentRole]);

  const canAccessDashboard = user?.base_role === "admin" || ["admin", "operator", "validator"].includes(currentRole);
  const isAdmin = user?.base_role === "admin" || currentRole === "admin";
  const userName = useMemo(() => user?.name ? user.name.trim() : "Doddy Prayudi, A.Md", [user]);

  const greeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 18) return "Selamat Sore";
    return "Selamat Malam";
  };

  // Filter Manager Handlers
  const handleOpenFilterManager = () => {
    setEditingCategories(JSON.parse(JSON.stringify(categories)));
    setEditingMapping({ ...serviceCategoryMapping });
    setEditingCustomIcons({ ...customLayananIcons });
    setFilterManagerTab("mapping");
    setMappingSearchTerm("");
    setNewCatLabel("");
    setNewCatIcon("AppstoreOutlined");
    setIsFilterManagerOpen(true);
  };

  const handleUploadServiceIcon = (serviceId, file) => {
    if (!file) return false;
    const isImage = file.type.startsWith("image/");
    if (!isImage) {
      notification.error({
        message: "Format File Tidak Sesuai",
        description: "Hanya file gambar (PNG, JPG, SVG, WEBP, GIF) yang dapat diunggah.",
      });
      return false;
    }
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      notification.error({
        message: "Ukuran Gambar Terlalu Besar",
        description: "Ukuran file gambar maksimal 5MB.",
      });
      return false;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      setEditingCustomIcons((prev) => ({
        ...prev,
        [serviceId]: base64,
      }));
      notification.success({
        message: "Ikon Berhasil Diunggah",
        description: "Preview ikon berhasil diperbarui. Klik 'Simpan Pengelompokan' untuk menerapkan ke seluruh card layanan.",
      });
    };
    reader.readAsDataURL(file);
    return false; // prevent standard HTTP POST upload
  };

  const handleResetServiceIcon = (serviceId) => {
    setEditingCustomIcons((prev) => {
      const next = { ...prev };
      delete next[serviceId];
      return next;
    });
    notification.info({
      message: "Ikon Direset",
      description: "Ikon dikembalikan ke default bawaan. Klik 'Simpan Pengelompokan' untuk menerapkan.",
    });
  };

  const handleSaveFilterConfig = async () => {
    setSavingFilterConfig(true);
    try {
      const payload = {
        categories: editingCategories,
        mapping: editingMapping,
      };
      const res = await apiFetch("/layanan-filter-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Gagal menyimpan konfigurasi filter layanan.");
      }

      setCategories(editingCategories);
      setServiceCategoryMapping(editingMapping);
      setCustomLayananIcons(editingCustomIcons);
      localStorage.setItem("siptu_layanan_categories", JSON.stringify(editingCategories));
      localStorage.setItem("siptu_layanan_mapping", JSON.stringify(editingMapping));
      localStorage.setItem("siptu_custom_layanan_icons", JSON.stringify(editingCustomIcons));
      window.dispatchEvent(new Event("siptu_layanan_icons_updated"));

      notification.success({
        message: "Berhasil Disimpan",
        description: "Pengaturan pengelompokan, kategori filter, dan ikon card layanan berhasil disimpan.",
      });
      setIsFilterManagerOpen(false);
    } catch (e) {
      notification.error({ message: "Gagal Menyimpan", description: e.message });
    } finally {
      setSavingFilterConfig(false);
    }
  };

  const handleResetToDefault = () => {
    setEditingCategories(DEFAULT_CATEGORIES);
    setEditingMapping(DEFAULT_MAPPING);
    notification.info({
      message: "Reset Pengaturan",
      description: "Pengaturan filter dikembalikan ke nilai default. Klik Simpan Pengelompokan untuk menerapkan.",
    });
  };

  const handleAddCategory = () => {
    if (!newCatLabel.trim()) {
      notification.warning({ message: "Peringatan", description: "Nama kategori tidak boleh kosong." });
      return;
    }
    const slug = newCatLabel.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (!slug) {
      notification.warning({ message: "Peringatan", description: "Format nama kategori tidak valid." });
      return;
    }
    if (editingCategories.some((c) => c.key === slug)) {
      notification.warning({ message: "Peringatan", description: "Kategori dengan nama/kode tersebut sudah ada." });
      return;
    }
    const newCategory = {
      key: slug,
      label: newCatLabel.trim(),
      icon: newCatIcon,
      color: "#0F5B99",
    };
    setEditingCategories([...editingCategories, newCategory]);
    setNewCatLabel("");
    setNewCatIcon("AppstoreOutlined");
    notification.success({ message: "Kategori Ditambahkan", description: `Kategori "${newCategory.label}" berhasil ditambahkan.` });
  };

  const handleDeleteCategory = (catKey) => {
    if (catKey === "all") {
      notification.warning({ message: "Peringatan", description: "Kategori Semua Layanan tidak dapat dihapus." });
      return;
    }
    const updatedCategories = editingCategories.filter((c) => c.key !== catKey);
    const fallbackCategory = updatedCategories.find((c) => c.key !== "all")?.key || "kepegawaian";

    const updatedMapping = { ...editingMapping };
    Object.keys(updatedMapping).forEach((srvId) => {
      if (updatedMapping[srvId] === catKey) {
        updatedMapping[srvId] = fallbackCategory;
      }
    });

    setEditingCategories(updatedCategories);
    setEditingMapping(updatedMapping);
    notification.info({ message: "Kategori Dihapus", description: `Layanan pada kategori ini dialihkan ke kategori default.` });
  };

  // Activity Item Click Handler for Details Modals
  const handleActivityClick = async (activity) => {
    if (activity.type === "bmn") {
      const token = activity.url?.split("/").pop();
      if (!token) return;
      setLoadingBmn(true); setBmnModalVisible(true); setSelectedBmn(null);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || "https://siptu.bpompalopo.com/api"}/public/bmn-loans/${token}`);
        if (res.ok) setSelectedBmn(await res.json());
      } catch (e) { console.error("Failed BMN fetch", e); }
      finally { setLoadingBmn(false); }
    } else if (activity.type === "it_helpdesk") {
      const id = activity.id?.split("_").pop();
      if (!id) return;
      setLoadingIt(true); setItModalVisible(true); setSelectedIt(null);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || "https://siptu.bpompalopo.com/api"}/public/it-helpdesk-tickets/${id}/details`);
        if (res.ok) setSelectedIt(await res.json());
      } catch (e) { console.error("Failed IT fetch", e); }
      finally { setLoadingIt(false); }
    } else if (activity.type === "izin_keluar") {
      const id = activity.id?.split("_").pop();
      if (!id) return;
      setLoadingExit(true); setExitModalVisible(true); setSelectedExit(null);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || "https://siptu.bpompalopo.com/api"}/public/exit-permits/${id}/details`);
        if (res.ok) setSelectedExit(await res.json());
      } catch (e) { console.error("Failed Exit fetch", e); }
      finally { setLoadingExit(false); }
    } else if (activity.url) {
      window.open(activity.url, "_blank");
    }
  };

  // ENTERPRISE HUB MODERN VIEW
  return (
    <div className="fluent-hub-page">
      {/* ─── Top Command Bar (Microsoft 365 / Fluent Style) ─── */}
      <header className="fluent-command-bar">
        <div className="fluent-command-inner">
          <div className="fluent-command-left">
            <button
              className="fluent-waffle-btn"
              onClick={() => setShowWaffleMenu(!showWaffleMenu)}
              title="SIPTU App Launcher"
            >
              <AppstoreOutlined />
            </button>
            <div className="fluent-brand-box" onClick={() => navigate("/app/layanan-mandiri")}>
              <img src="/logo/logo.png" alt="SIPTU Logo" className="fluent-logo-img" />
              <div className="fluent-brand-titles">
                <span className="fluent-brand-name">SIPTU ULTRA</span>
                <span className="fluent-brand-sub">BALAI POM DI PALOPO</span>
              </div>
            </div>
          </div>

          {/* Search Bar / Command Palette Trigger */}
          <div className="fluent-command-center">
            <div className="fluent-search-trigger" onClick={() => setCommandPaletteOpen(true)}>
              <SearchOutlined className="search-icon" />
              <span className="search-placeholder">Cari layanan, pengumuman, atau surat...</span>
              <kbd className="search-shortcut">Ctrl K</kbd>
            </div>
          </div>

          <div className="fluent-command-right">
            <div className="fluent-time-display">
              <span className="time-clock">{currentTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
              <span className="time-date">{currentTime.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })}</span>
            </div>

            <button className="fluent-action-icon" onClick={() => window.open('https://www.dropbox.com/scl/fi/jwli2flrz0lv59f3qsddp/update.apk?rlkey=qd9pbowzjr67cp1wdoc9wlqb5&st=kq1wwagm&dl=1', '_blank')} title="Download Android App">
              <AndroidOutlined />
            </button>

            {canAccessDashboard && (
              <button className="fluent-action-icon" onClick={() => navigate(dashboardPath)} title="Ke Dashboard Manager">
                <DashboardOutlined />
              </button>
            )}

            {isAdmin && (
              <button
                className="fluent-action-icon"
                onClick={handleOpenFilterManager}
                title="Kelola Pengelompokan & Filter Layanan (Admin)"
                style={{
                  background: isFilterManagerOpen ? "#eff6ff" : undefined,
                  color: isFilterManagerOpen ? "#0078d4" : undefined,
                  borderColor: isFilterManagerOpen ? "#bfdbfe" : undefined,
                }}
              >
                <ControlOutlined />
              </button>
            )}

            {/* Profile Avatar Pill */}
            <div className="fluent-profile-pill" onClick={() => setShowUserMenu(!showUserMenu)}>
              <div className="fluent-avatar-wrap">
                {user?.employee?.avatar_url ? (
                  <img src={user.employee.avatar_url} alt={user.name} />
                ) : (
                  (user?.name?.[0] || "D").toUpperCase()
                )}
              </div>
              <div className="fluent-profile-details">
                <span className="profile-name">{userName.split(" ")[0]}</span>
                <span className="profile-role">{currentRole || "ADMIN"}</span>
              </div>
            </div>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <>
                <div className="fluent-backdrop" onClick={() => setShowUserMenu(false)} />
                <div className="fluent-user-dropdown">
                  <div className="user-dropdown-header">
                    <span className="d-name">{userName}</span>
                    <span className="d-nip">NIP. {user?.nip || "199608052019031002"}</span>
                  </div>
                  <div className="user-dropdown-divider" />
                  <button onClick={() => { setShowUserMenu(false); navigate("/app/account-settings"); }}><SettingOutlined /> Pengaturan Akun</button>
                  <button onClick={() => { setShowUserMenu(false); setRiwayatModalOpen(true); }}><HistoryOutlined /> Riwayat Layanan Saya</button>
                  {isAdmin && (
                    <>
                      <button onClick={() => { setShowUserMenu(false); handleOpenFilterManager(); }}><ControlOutlined /> Kelola Filter Layanan</button>
                      <button onClick={() => { setShowUserMenu(false); navigate("/app/pengaturan-slider"); }}><PictureOutlined /> Kelola Gambar Banner</button>
                    </>
                  )}
                  <div className="user-dropdown-divider" />
                  <button className="danger-btn" onClick={() => { setShowUserMenu(false); logout(); }}><LogoutOutlined /> Keluar Sistem</button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* App Waffle Menu Dropdown (Microsoft 365 App Launcher Style) */}
        {showWaffleMenu && (
          <>
            <div className="fluent-backdrop" onClick={() => setShowWaffleMenu(false)} />
            <div className="fluent-waffle-dropdown">
              {/* External Ecosystem Portals (SELARAS & SIAMPARAN) */}
              <div className="waffle-section">
                <div className="waffle-section-title">Ekosistem & Portal Terpadu</div>
                <div className="waffle-ecosystem-grid">
                  <div
                    className="waffle-eco-card"
                    onClick={() => {
                      setShowWaffleMenu(false);
                      const token = localStorage.getItem("token") || localStorage.getItem("access_token") || localStorage.getItem("authToken");
                      const url = user?.nip
                        ? `https://selaras.bpompalopo.com/auth/sso?token=${token}&user=${user.nip}`
                        : "https://selaras.bpompalopo.com";
                      window.open(url, "_blank");
                    }}
                    title="Buka Portal SELARAS"
                  >
                    <img src="/logo/selaras.png" alt="SELARAS" className="waffle-eco-img" />
                    <span className="waffle-eco-title">SELARAS</span>
                  </div>

                  <div
                    className="waffle-eco-card"
                    onClick={() => {
                      setShowWaffleMenu(false);
                      const token = localStorage.getItem("token") || localStorage.getItem("access_token") || localStorage.getItem("authToken");
                      const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                        ? "http://localhost:8000"
                        : "https://siamparan.bpompalopo.com";
                      const url = user?.nip
                        ? `${baseUrl}/auth/sso?token=${token}&user=${user.nip}`
                        : baseUrl;
                      window.open(url, "_blank");
                    }}
                    title="Buka SIAMPARAN V2"
                  >
                    <img src="/logo/siamparan.png" alt="SIAMPARAN" className="waffle-eco-img" />
                    <span className="waffle-eco-title">SIAMPARAN V2</span>
                  </div>
                </div>
              </div>

              <div className="waffle-divider" />

              {/* Layanan Badan POM Lainnya */}
              <div className="waffle-section">
                <div className="waffle-section-title">Layanan Badan POM Lainnya</div>
                <div className="waffle-bpom-grid">
                  {[
                    { id: "simakin", title: "SIMAKIN", link: "https://skp.pom.go.id/" },
                    { id: "siasn", title: "SIASN", link: "https://siasn.pom.go.id/" },
                    { id: "sipt", title: "SIPT", link: "https://sipt.pom.go.id/login" },
                    { id: "sang-integritas", title: "Sang Integritas", link: "https://sangintegritas.pom.go.id/panel/login" },
                    { id: "website-bpom", title: "Website", link: "https://palopo.pom.go.id" },
                  ].map((bpom) => (
                    <a
                      key={bpom.id}
                      href={bpom.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="waffle-bpom-pill"
                      onClick={() => setShowWaffleMenu(false)}
                      title={`Buka ${bpom.title}`}
                    >
                      <span className="waffle-bpom-name">{bpom.title}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </header>

      {/* ─── Hero Welcome Banner (With Admin Edit Button & Custom Image Support) ─── */}
      <section className="fluent-hero-banner">
        {customBannerImage ? (
          <div className="fluent-hero-custom-container">
            <img
              src={customBannerImage}
              alt="SIPTU Enterprise Banner"
              className="fluent-hero-custom-img"
            />
            {isAdmin && (
              <button
                className="hero-admin-edit-btn floating-admin-btn"
                onClick={() => navigate("/app/pengaturan-slider")}
                title="Upload / Edit Gambar Banner di Canva"
              >
                <PictureOutlined /> Edit Gambar Banner (Admin)
              </button>
            )}
          </div>
        ) : (
          <div className="fluent-hero-inner">
            <div className="hero-welcome-content">
              <div className="hero-greeting-tag">
                <span className="wave-icon">👋</span>
                <span>{greeting()}, <strong>{userName}</strong></span>
                <span className="nip-tag">NIP. {user?.nip || "199608052019031002"}</span>
              </div>
              <h1 className="hero-title">SIPTU Enterprise Hub</h1>
              <p className="hero-subtitle">Portal Terpadu Pelayanan Tata Usaha, Aset BMN, Kepegawaian, & Layanan Digital Balai POM di Palopo.</p>
            </div>

            {/* Admin Edit Banner Quick Button */}
            {isAdmin && (
              <button
                className="hero-admin-edit-btn"
                onClick={() => navigate("/app/pengaturan-slider")}
                title="Upload / Edit Gambar Banner di Canva"
              >
                <PictureOutlined /> Edit Gambar Banner (Admin)
              </button>
            )}
          </div>
        )}
      </section>

      {/* ─── Main 3-Column Layout ─── */}
      <div className="fluent-main-grid">

        {/* 👈 Left Rail: Quick Shortcuts & Pinned Favorites */}
        <aside className="fluent-left-rail">
          <div className="rail-section-card">
            <h4 className="rail-heading">NAVIGASI UTAMA</h4>
            <nav className="rail-nav-list">
              <a className="rail-nav-link active" onClick={() => navigate("/app/layanan-mandiri")}>
                <AppstoreOutlined className="nav-icon" />
                <span>Beranda Hub</span>
              </a>
              <a className="rail-nav-link" onClick={() => setRiwayatModalOpen(true)}>
                <HistoryOutlined className="nav-icon" />
                <span>Riwayat Pengajuan</span>
              </a>
              <a className="rail-nav-link" onClick={() => navigate("/app/penyimpanan-cloud")}>
                <CloudServerOutlined className="nav-icon" />
                <span>SIPTU Cloud Drive</span>
              </a>
              <a className="rail-nav-link" onClick={() => navigate("/app/account-settings")}>
                <UserOutlined className="nav-icon" />
                <span>Pengaturan Profil</span>
              </a>
            </nav>

            <div className="rail-divider" />

            <div className="rail-favorites-header">
              <h4 className="rail-heading">📌 FAVORIT SAYA ({pinnedServiceObjects.length})</h4>
            </div>
            <div className="rail-favorites-list">
              {pinnedServiceObjects.length > 0 ? (
                pinnedServiceObjects.map((srv) => (
                  <div
                    key={srv.id}
                    className="rail-fav-item"
                    onClick={() => {
                      if (srv.link.startsWith("http")) window.open(srv.link, "_blank");
                      else navigate(srv.link);
                    }}
                  >
                    <div className="fav-icon-box">{srv.icon}</div>
                    <span className="fav-title">{srv.title}</span>
                    <button className="unpin-btn" onClick={(e) => togglePinService(e, srv.id)} title="Lepas dari favorit">
                      <StarFilled style={{ color: "#f59e0b" }} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="rail-empty-fav">
                  <StarOutlined />
                  <span>Klik ikon bintang di kartu layanan untuk menyematkan favorit.</span>
                </div>
              )}
            </div>

            <div className="rail-divider" />

            {/* Profile Info Mini Card */}
            <div className="rail-profile-mini">
              <div className="mini-info-row">
                <span className="m-label">JABATAN</span>
                <span className="m-val">{user?.employee?.position || user?.position || "Pranata Komputer Terampil"}</span>
              </div>
              <div className="mini-info-row">
                <span className="m-label">KGB TERAKHIR</span>
                <span className="m-val">{user?.kgb_terakhir || user?.kgb_last || "01 Jan 2025"}</span>
              </div>
              <div className="mini-info-row">
                <span className="m-label">KGB MENDATANG</span>
                <span className="m-val highlight">{user?.kgb_akan_datang || user?.kgb_next || "01 Jan 2027"}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* 🏛️ Middle Hub: App Launcher Grid (Exact 3 Columns) */}
        <main className="fluent-middle-hub">

          {/* Category Tabs Bar (Horizontal Scrollable with Fixed Container & Drag/Arrow Support) */}
          <div className="fluent-category-bar-container">
            {canScrollLeft && (
              <button
                className="fluent-cat-scroll-btn left"
                onClick={() => scrollCategoryBar("left")}
                title="Gulir filter ke kiri"
              >
                <LeftOutlined />
              </button>
            )}

            <div
              ref={categoryBarRef}
              className="fluent-category-bar"
              onMouseDown={handleCatMouseDown}
              onMouseMove={handleCatMouseMove}
              onMouseUp={handleCatMouseUpOrLeave}
              onMouseLeave={handleCatMouseUpOrLeave}
              onWheel={handleCatWheel}
            >
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  className={`category-tab-btn ${selectedCategory === cat.key ? "active" : ""}`}
                  onClick={() => {
                    if (!hasMovedCatRef.current) {
                      setSelectedCategory(cat.key);
                    }
                  }}
                >
                  {resolveCategoryIcon(cat.icon)}
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {canScrollRight && (
              <button
                className="fluent-cat-scroll-btn right"
                onClick={() => scrollCategoryBar("right")}
                title="Gulir filter ke kanan"
              >
                <RightOutlined />
              </button>
            )}
          </div>

          {/* Search Result Bar */}
          <div className="fluent-grid-header">
            <h2 className="grid-section-title">Aplikasi & Layanan ({filteredServices.length})</h2>
            <div className="grid-search-box">
              <SearchOutlined className="s-icon" />
              <input
                type="text"
                placeholder="Filter nama layanan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className="clear-btn" onClick={() => setSearchTerm("")}><CloseOutlined /></button>
              )}
            </div>
          </div>

          {/* App Tiles Grid */}
          <div className="fluent-app-grid">
            {filteredServices.map((service) => {
              const isPinned = pinnedServices.includes(service.id);
              return (
                <div
                  key={service.id}
                  className="fluent-app-card"
                  onClick={() => {
                    if (service.link.startsWith("http")) window.open(service.link, "_blank");
                    else navigate(service.link);
                  }}
                  style={{ "--accent-color": service.accent }}
                >
                  <div className="card-top-bar">
                    <div className="app-icon-container">
                      {service.icon}
                    </div>
                    <button
                      className={`star-pin-btn ${isPinned ? "is-pinned" : ""}`}
                      onClick={(e) => togglePinService(e, service.id)}
                      title={isPinned ? "Lepas dari favorit" : "Sematkan ke favorit"}
                    >
                      {isPinned ? <StarFilled /> : <StarOutlined />}
                    </button>
                  </div>
                  <h3 className="app-card-title">{service.title}</h3>
                  <p className="app-card-desc">{service.description}</p>
                  <div className="app-card-footer">
                    <span className="launch-text">Buka Layanan</span>
                    <ArrowRightOutlined className="arrow-icon" />
                  </div>
                </div>
              );
            })}
          </div>

          {filteredServices.length === 0 && (
            <div className="fluent-empty-grid">
              <SearchOutlined className="empty-icon" />
              <h3>Layanan tidak ditemukan</h3>
              <p>Coba kata kunci pencarian lain atau pilih kategori "Semua Layanan".</p>
            </div>
          )}
        </main>

        {/* 👉 Right Rail: Live Tracker & Real-Time Activity Widgets */}
        <aside className="fluent-right-rail">

          {/* Live Personal Tracker Widget */}
          <div className="rail-widget-card">
            <div className="widget-header">
              <span className="live-dot" />
              <h3 className="widget-title">STATUS PENGAJUAN SAYA</h3>
            </div>
            <div className="widget-body">
              {myActiveRequests.length > 0 ? (
                myActiveRequests.map((req) => (
                  <div
                    key={req.id}
                    className="tracker-status-item clickable"
                    onClick={() => {
                      if (req.url) {
                        if (req.url.startsWith("http")) window.open(req.url, "_blank");
                        else navigate(req.url);
                      }
                    }}
                  >
                    <div className="tracker-row">
                      <span className="t-label">
                        {req.type === 'bmn' ? <FundOutlined /> :
                         req.type === 'ruangan' ? <BankOutlined /> :
                         req.type === 'izin_keluar' ? <LogoutOutlined /> :
                         req.type === 'it_helpdesk' ? <ToolOutlined /> :
                         <AppstoreOutlined />}
                        {req.title}
                      </span>
                      <Tag color="processing" className="t-pill">{req.status_label || "Aktif"}</Tag>
                    </div>
                    {req.item_name && <div className="tracker-item-sub">{req.item_name}</div>}
                    <div className="t-stepper">
                      <div className="step done" title="Draft">1</div>
                      <div className={`step-line ${req.step >= 2 ? "active" : ""}`} />
                      <div className={`step ${req.step >= 2 ? (req.step > 2 ? "done" : "active") : ""}`} title="Diajukan">2</div>
                      <div className={`step-line ${req.step >= 3 ? "active" : ""}`} />
                      <div className={`step ${req.step >= 3 ? (req.step > 3 ? "done" : "active") : ""}`} title="Disetujui / Dalam Proses">3</div>
                      <div className={`step-line ${req.step >= 4 ? "active" : ""}`} />
                      <div className={`step ${req.step >= 4 ? "done" : ""}`} title="Selesai">4</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="tracker-empty-state">
                  <CheckCircleOutlined className="empty-check-icon" style={{ fontSize: 22, color: "#10b981", marginBottom: 6 }} />
                  <span>Tidak ada pengajuan aktif saat ini.</span>
                </div>
              )}
            </div>
          </div>

          {/* Running Live Activities Feed */}
          <div className="rail-widget-card">
            <div className="widget-header">
              <span className="live-dot danger" />
              <h3 className="widget-title">LIVE AKTIVITAS BALAI</h3>
            </div>
            <div className="widget-activities-scroll">
              {recentActivities.length > 0 ? (
                recentActivities.slice(0, 8).map((act, index) => (
                  <div
                    key={act.id || index}
                    className="act-feed-item"
                    onClick={() => handleActivityClick(act)}
                  >
                    <div className={`act-icon-badge ${act.type}`}>
                      {act.type === 'bmn' ? <FundOutlined /> :
                       act.type === 'ruangan' ? <BankOutlined /> :
                       act.type === 'izin_keluar' ? <LogoutOutlined /> :
                       act.type === 'it_helpdesk' ? <ToolOutlined /> :
                       act.type === 'surat_tugas' ? <FileProtectOutlined /> :
                       <AppstoreOutlined />}
                    </div>
                    <div className="act-details">
                      <div className="act-meta">
                        <span className="act-type">{act.type?.replace('_', ' ').toUpperCase()}</span>
                        <span className="act-time">{dayjs(act.date).fromNow()}</span>
                      </div>
                      <h4 className="act-title">{act.title}</h4>
                      <p className="act-desc">{act.description}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="act-empty-state">
                  <HistoryOutlined />
                  <span>Menunggu aktivitas terbaru...</span>
                </div>
              )}
            </div>
          </div>

        </aside>
      </div>

      {/* ─── Command Palette Modal Overlay (Ctrl + K) ─── */}
      <Modal
        title={null}
        open={commandPaletteOpen}
        onCancel={() => setCommandPaletteOpen(false)}
        footer={null}
        width={680}
        centered
        className="command-palette-modal"
      >
        <div className="command-palette-container">
          <div className="command-input-wrap">
            <SearchOutlined className="cmd-icon" />
            <input
              type="text"
              placeholder="Ketik untuk mencari aplikasi, layanan, atau dokumen..."
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="cmd-esc-btn" onClick={() => setCommandPaletteOpen(false)}>ESC</button>
          </div>

          <div className="command-results-list">
            <div className="cmd-group-title">Aplikasi & Layanan</div>
            {filteredServices.map((srv) => (
              <div
                key={srv.id}
                className="cmd-item"
                onClick={() => {
                  setCommandPaletteOpen(false);
                  if (srv.link.startsWith("http")) window.open(srv.link, "_blank");
                  else navigate(srv.link);
                }}
              >
                <div className="cmd-item-icon">{srv.icon}</div>
                <div className="cmd-item-text">
                  <span className="t">{srv.title}</span>
                  <span className="d">{srv.description}</span>
                </div>
                <ArrowRightOutlined className="a" />
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* ─── Modals Detail (BMN, IT, Exit Permit) ─── */}
      {/* BMN Modal */}
      <Modal
        title={null}
        open={bmnModalVisible}
        onCancel={() => setBmnModalVisible(false)}
        footer={null}
        width={640}
        centered
        className="feed-detail-modal feed-modal--bmn"
      >
        {loadingBmn ? (
          <div className="feed-modal__loader"><Spin size="large" /><span>Memuat detail BMN...</span></div>
        ) : selectedBmn ? (
          <div className="feed-modal__wrap">
            <div className="feed-modal__header feed-modal__header--bmn">
              <div className="feed-modal__header-icon"><FundOutlined /></div>
              <div className="feed-modal__header-info">
                <div className="feed-modal__badge">PEMINJAMAN BMN</div>
                <h2 className="feed-modal__title">{selectedBmn.spa_number}</h2>
              </div>
              <Tag color="processing">{selectedBmn.status}</Tag>
            </div>
            <div className="feed-modal__body">
              <div className="feed-modal__data-card">
                <div className="feed-modal__data-row"><span className="feed-modal__data-key">Peminjam</span><span className="feed-modal__data-val">{selectedBmn.borrower_name}</span></div>
                <div className="feed-modal__data-row"><span className="feed-modal__data-key">Periode</span><span className="feed-modal__data-val">{dayjs(selectedBmn.loan_date).format('DD MMM')} - {dayjs(selectedBmn.return_date).format('DD MMM YYYY')}</span></div>
              </div>
            </div>
            <div className="feed-modal__footer"><Button block onClick={() => setBmnModalVisible(false)}>Tutup</Button></div>
          </div>
        ) : <div className="feed-modal__error">Gagal memuat data BMN.</div>}
      </Modal>

      {/* IT Helpdesk Modal */}
      <Modal
        title={null}
        open={itModalVisible}
        onCancel={() => setItModalVisible(false)}
        footer={null}
        width={640}
        centered
        className="feed-detail-modal feed-modal--it"
      >
        {loadingIt ? (
          <div className="feed-modal__loader"><Spin size="large" /><span>Memuat detail IT Helpdesk...</span></div>
        ) : selectedIt ? (
          <div className="feed-modal__wrap">
            <div className="feed-modal__header feed-modal__header--it">
              <div className="feed-modal__header-icon"><ToolOutlined /></div>
              <div className="feed-modal__header-info">
                <div className="feed-modal__badge">IT HELPDESK</div>
                <h2 className="feed-modal__title">{selectedIt.ticket_number || "TI-REPORT"}</h2>
              </div>
              <Tag color="warning">{selectedIt.status}</Tag>
            </div>
            <div className="feed-modal__body">
              <div className="feed-modal__data-card">
                <div className="feed-modal__data-row"><span className="feed-modal__data-key">Pelapor</span><span className="feed-modal__data-val">{selectedIt.employee_name}</span></div>
                <div className="feed-modal__data-row"><span className="feed-modal__data-key">Kendala</span><span className="feed-modal__data-val">{selectedIt.problem_details}</span></div>
              </div>
            </div>
            <div className="feed-modal__footer"><Button block onClick={() => setItModalVisible(false)}>Tutup</Button></div>
          </div>
        ) : <div className="feed-modal__error">Gagal memuat data IT Helpdesk.</div>}
      </Modal>

      {/* Exit Permit Modal */}
      <Modal
        title={null}
        open={exitModalVisible}
        onCancel={() => setExitModalVisible(false)}
        footer={null}
        width={580}
        centered
        className="feed-detail-modal feed-modal--exit"
      >
        {loadingExit ? (
          <div className="feed-modal__loader"><Spin size="large" /><span>Memuat detail izin keluar...</span></div>
        ) : selectedExit ? (
          <div className="feed-modal__wrap">
            <div className="feed-modal__header feed-modal__header--exit">
              <div className="feed-modal__header-icon"><LogoutOutlined /></div>
              <div className="feed-modal__header-info">
                <div className="feed-modal__badge">IZIN KELUAR KANTOR (RISPEG)</div>
                <h2 className="feed-modal__title">{selectedExit.employee_name}</h2>
              </div>
              <Tag color="purple">{selectedExit.permit_type}</Tag>
            </div>
            <div className="feed-modal__body">
              <div className="feed-modal__data-card">
                <div className="feed-modal__data-row"><span className="feed-modal__data-key">Alasan</span><span className="feed-modal__data-val">{selectedExit.reason}</span></div>
                <div className="feed-modal__data-row"><span className="feed-modal__data-key">Jam Keluar - Kembali</span><span className="feed-modal__data-val">{selectedExit.exit_time || '--:--'} s/d {selectedExit.return_time || '--:--'}</span></div>
              </div>
            </div>
            <div className="feed-modal__footer"><Button block onClick={() => setExitModalVisible(false)}>Tutup Detail</Button></div>
          </div>
        ) : <div className="feed-modal__error">Gagal memuat data izin keluar.</div>}
      </Modal>

      {/* Floating AI Assistant Widget */}
      <AIAssistantWidget />

      {/* Info Popup Modal */}
      <InfoPopupModal {...infoPopup} />

      {/* Riwayat Layanan Enterprise Modal Dialog */}
      <RiwayatLayanan isModal={true} open={riwayatModalOpen} onClose={() => setRiwayatModalOpen(false)} />

      {/* ── MODAL: MANAJEMEN PENGELOMPOKAN & FILTER CARD LAYANAN (ADMIN) ── */}
      <Modal
        title={
          <div className="lm-filter-manager-header">
            <div className="lm-filter-manager-icon">
              <ControlOutlined />
            </div>
            <div>
              <h3 className="lm-filter-manager-title">Manajemen Filter & Pengelompokan Layanan</h3>
              <p className="lm-filter-manager-sub">Atur tab kategori filter dan petakan card layanan ke kategori yang sesuai</p>
            </div>
          </div>
        }
        open={isFilterManagerOpen}
        onCancel={() => setIsFilterManagerOpen(false)}
        width={780}
        centered
        className="lm-filter-manager-modal"
        footer={
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", paddingTop: 8 }}>
            <Popconfirm
              title="Reset ke Pengaturan Awal?"
              description="Seluruh kategori dan pemetaan card akan dikembalikan ke konfigurasi default instansi."
              onConfirm={handleResetToDefault}
              okText="Ya, Reset"
              cancelText="Batal"
            >
              <Button icon={<ReloadOutlined />} style={{ fontSize: 12 }}>
                Reset ke Default
              </Button>
            </Popconfirm>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Button onClick={() => setIsFilterManagerOpen(false)} style={{ fontSize: 12 }}>
                Batal
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={savingFilterConfig}
                onClick={handleSaveFilterConfig}
                style={{ background: "#0F5B99", borderColor: "#0F5B99", fontSize: 12 }}
              >
                Simpan Pengelompokan
              </Button>
            </div>
          </div>
        }
      >
        <Tabs
          activeKey={filterManagerTab}
          onChange={setFilterManagerTab}
          items={[
            {
              key: "mapping",
              label: <span><AppstoreOutlined /> Pemetaan Card Layanan ({services.length})</span>,
              children: (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <Input
                      placeholder="Cari nama layanan..."
                      prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                      value={mappingSearchTerm}
                      onChange={(e) => setMappingSearchTerm(e.target.value)}
                      allowClear
                      style={{ maxWidth: 300 }}
                      size="small"
                    />
                    <span style={{ fontSize: 11.5, color: "#64748b" }}>
                      Pilih grup kategori untuk masing-masing card layanan di bawah:
                    </span>
                  </div>

                  <div style={{ maxHeight: 420, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                          <th style={{ padding: "10px 14px", color: "#64748b", fontWeight: 700, fontSize: 11 }}>NAMA & IKON LAYANAN</th>
                          <th style={{ padding: "10px 14px", color: "#64748b", fontWeight: 700, fontSize: 11 }}>DESKRIPSI</th>
                          <th style={{ padding: "10px 14px", color: "#64748b", fontWeight: 700, fontSize: 11, width: 200 }}>KATEGORI FILTER</th>
                          <th style={{ padding: "10px 14px", color: "#64748b", fontWeight: 700, fontSize: 11, width: 140, textAlign: "center" }}>GANTI IKON</th>
                        </tr>
                      </thead>
                      <tbody>
                        {services
                          .filter((srv) => {
                            if (!mappingSearchTerm) return true;
                            return srv.title.toLowerCase().includes(mappingSearchTerm.toLowerCase()) ||
                              srv.description.toLowerCase().includes(mappingSearchTerm.toLowerCase());
                          })
                          .map((srv) => {
                            const currentCatKey = editingMapping[srv.id] || srv.category || "kepegawaian";
                            const hasCustomIcon = Boolean(editingCustomIcons[srv.id]);
                            return (
                              <tr key={srv.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}>
                                <td style={{ padding: "10px 14px", fontWeight: 600, color: "#0f172a" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <div style={{
                                      width: 32,
                                      height: 32,
                                      borderRadius: 8,
                                      background: "#f8fafc",
                                      border: "1px solid #e2e8f0",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      overflow: "hidden",
                                      flexShrink: 0,
                                      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
                                    }}>
                                      {hasCustomIcon ? (
                                        <img
                                          src={editingCustomIcons[srv.id]}
                                          alt={srv.title}
                                          style={{ width: "100%", height: "100%", objectFit: "contain" }}
                                        />
                                      ) : (
                                        srv.icon
                                      )}
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                      <span style={{ fontSize: 12.5, fontWeight: 600, color: "#0f172a" }}>{srv.title}</span>
                                      {hasCustomIcon && (
                                        <span style={{ fontSize: 10, color: "#10b981", fontWeight: 600 }}>● Ikon Kustom Aktif</span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td style={{ padding: "10px 14px", color: "#64748b", fontSize: 11.5 }}>
                                  {srv.description}
                                </td>
                                <td style={{ padding: "10px 14px" }}>
                                  <Select
                                    size="small"
                                    style={{ width: "100%" }}
                                    value={currentCatKey}
                                    onChange={(newVal) => {
                                      setEditingMapping({
                                        ...editingMapping,
                                        [srv.id]: newVal,
                                      });
                                    }}
                                  >
                                    {editingCategories
                                      .filter((c) => c.key !== "all")
                                      .map((cat) => (
                                        <Select.Option key={cat.key} value={cat.key}>
                                          <span style={{ marginRight: 6 }}>{resolveCategoryIcon(cat.icon)}</span>
                                          {cat.label}
                                        </Select.Option>
                                      ))}
                                  </Select>
                                </td>
                                <td style={{ padding: "10px 14px", textAlign: "center" }}>
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                                    <Upload
                                      accept="image/*"
                                      showUploadList={false}
                                      beforeUpload={(file) => handleUploadServiceIcon(srv.id, file)}
                                    >
                                      <Button
                                        size="small"
                                        icon={<UploadOutlined />}
                                        style={{ fontSize: 11, borderColor: "#bae0ff", color: "#0F5B99" }}
                                      >
                                        {hasCustomIcon ? "Ganti" : "Upload"}
                                      </Button>
                                    </Upload>
                                    {hasCustomIcon && (
                                      <Tooltip title="Reset ke ikon bawaan">
                                        <Button
                                          size="small"
                                          danger
                                          type="text"
                                          icon={<DeleteOutlined />}
                                          onClick={() => handleResetServiceIcon(srv.id)}
                                          style={{ height: 24, width: 24, padding: 0 }}
                                        />
                                      </Tooltip>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ),
            },
            {
              key: "categories",
              label: <span><FilterOutlined /> Kelola Kategori Filter ({editingCategories.length})</span>,
              children: (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                    {editingCategories.map((cat, idx) => {
                      const isAll = cat.key === "all";
                      const countServices = Object.values(editingMapping).filter((v) => v === cat.key).length;
                      return (
                        <div key={cat.key} className="lm-filter-category-card">
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 6, background: "#eff6ff", color: "#0078d4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                              {resolveCategoryIcon(cat.icon)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>
                                {cat.label} {isAll && <Tag color="blue" style={{ fontSize: 10 }}>Wajib (Semua)</Tag>}
                              </div>
                              <div style={{ fontSize: 11, color: "#94a3b8" }}>
                                Slug: <code>{cat.key}</code> • {isAll ? "Menampilkan seluruh layanan" : `${countServices} layanan dialokasikan`}
                              </div>
                            </div>
                          </div>

                          {!isAll && (
                            <Popconfirm
                              title="Hapus Kategori Filter?"
                              description="Layanan pada kategori ini akan dialihkan ke kategori default."
                              onConfirm={() => handleDeleteCategory(cat.key)}
                              okText="Hapus"
                              cancelText="Batal"
                            >
                              <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                            </Popconfirm>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Category Box */}
                  <div className="lm-filter-add-box">
                    <div style={{ fontWeight: 600, fontSize: 12.5, color: "#0f172a", marginBottom: 8 }}>
                      + Tambah Kategori Filter Baru
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 180px auto", gap: 8, alignItems: "center" }}>
                      <Input
                        placeholder="Nama Kategori (contoh: Kearsipan & Surat)"
                        value={newCatLabel}
                        onChange={(e) => setNewCatLabel(e.target.value)}
                        onPressEnter={handleAddCategory}
                        size="small"
                      />
                      <Select
                        value={newCatIcon}
                        onChange={setNewCatIcon}
                        size="small"
                        style={{ width: "100%" }}
                      >
                        {AVAILABLE_CATEGORY_ICONS.map((ic) => (
                          <Select.Option key={ic.key} value={ic.key}>
                            <span style={{ marginRight: 6 }}>{resolveCategoryIcon(ic.key)}</span>
                            {ic.label.split(" ")[0]}
                          </Select.Option>
                        ))}
                      </Select>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleAddCategory}
                        size="small"
                        style={{ background: "#0F5B99", borderColor: "#0F5B99" }}
                      >
                        Tambah
                      </Button>
                    </div>
                  </div>
                </div>
              ),
            },
          ]}
        />
      </Modal>
    </div>
  );
};

export default LayananMandiri;
