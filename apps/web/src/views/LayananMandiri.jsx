import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
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
  VideoCameraOutlined,
  BookOutlined,
  PictureOutlined,
  EditOutlined,
  MedicineBoxOutlined,
} from "@ant-design/icons";
import { Modal, Steps, Tag, Spin, Button } from "antd";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/id";
import "./LayananMandiri.css";
import AIAssistantWidget from "../components/AIAssistantWidget";
import { useInfoPopup } from "../hooks/useInfoPopup.js";
import InfoPopupModal from "../components/InfoPopupModal.jsx";

dayjs.extend(relativeTime);
dayjs.locale("id");

const DEFAULT_SLIDES = [
  { id: "slide-1", title: "Pelayanan Lebih Cepat", description: "Pantau status layanan dan akses dokumen kapan saja dengan sistem terintegrasi.", image: "/hero/slide-1.svg", tone: "blue" },
  { id: "slide-2", title: "Kolaborasi Lebih Rapi", description: "Data pegawai dan tugas tersusun jelas dalam satu layar untuk efisiensi tinggi.", image: "/hero/slide-2.svg", tone: "teal" },
  { id: "slide-3", title: "Dokumen Selalu Terbaru", description: "Unduh ulang protokol kerja dengan data yang sudah diperbarui secara otomatis.", image: "/hero/slide-3.svg", tone: "orange" },
];

const LayananMandiri = () => {
  const navigate = useNavigate();
  const { user, currentRole, logout, apiFetch } = useAuth();
  const infoPopup = useInfoPopup();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [visibleCards, setVisibleCards] = useState(new Set());
  const [customLayananIcons, setCustomLayananIcons] = useState({});

  // Synchronize custom Layanan Mandiri icons
  useEffect(() => {
    const loadCustomIcons = () => {
      try {
        const stored = localStorage.getItem("siptu_custom_layanan_icons");
        if (stored) {
          setCustomLayananIcons(JSON.parse(stored));
        } else {
          setCustomLayananIcons({});
        }
      } catch (e) {
        console.error("Gagal memuat ikon Layanan Mandiri:", e);
      }
    };
    loadCustomIcons();
    window.addEventListener("siptu_layanan_icons_updated", loadCustomIcons);
    return () => window.removeEventListener("siptu_layanan_icons_updated", loadCustomIcons);
  }, []);
  const [isScrolled, setIsScrolled] = useState(false);
  const cardRefs = useRef([]);
  const [slideIndex, setSlideIndex] = useState(0);
  const [heroSlides, setHeroSlides] = useState(DEFAULT_SLIDES);
  const [sliderDuration, setSliderDuration] = useState(6);
  const [recentActivities, setRecentActivities] = useState([]);
  const [newsPosts, setNewsPosts] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [showPdtt, setShowPdtt] = useState(false);
  const [showProcurementProposalService, setShowProcurementProposalService] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [currentFeedIndex, setCurrentFeedIndex] = useState(0);
  const [isFeedHovered, setIsFeedHovered] = useState(false);
  
  // Activity Hub Slideshow State
  const [currentHubSlide, setCurrentHubSlide] = useState(0);
  const itemsPerSlide = 12;
  const slideInterval = 8000; // 8 seconds per slide
  
  // BMN Modal State
  const [bmnModalVisible, setBmnModalVisible] = useState(false);
  const [selectedBmn, setSelectedBmn] = useState(null);
  const [loadingBmn, setLoadingBmn] = useState(false);

  // IT Modal State
  const [itModalVisible, setItModalVisible] = useState(false);
  const [selectedIt, setSelectedIt] = useState(null);
  const [loadingIt, setLoadingIt] = useState(false);

  // Exit Modal State
  const [exitModalVisible, setExitModalVisible] = useState(false);
  const [selectedExit, setSelectedExit] = useState(null);
  const [loadingExit, setLoadingExit] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => { clearInterval(timer); window.removeEventListener("scroll", handleScroll); };
  }, []);

  // Dynamic Browser Tab Titles based on open modals/services
  useEffect(() => {
    if (bmnModalVisible) {
      document.title = "SIPTU | Detail Peminjaman BMN";
    } else if (itModalVisible) {
      document.title = "SIPTU | Detail Laporan IT Helpdesk";
    } else if (exitModalVisible) {
      document.title = "SIPTU | Detail Izin Keluar Kantor";
    } else {
      document.title = "SIPTU | Layanan Mandiri";
    }
    return () => {
      document.title = "SIPTU | SISTEM INFORMASI PELAYANAN TATA USAHA";
    };
  }, [bmnModalVisible, itModalVisible, exitModalVisible]);

  useEffect(() => {
    const checkPdtt = async () => {
      try { const res = await apiFetch("/pdtt-items/requestable"); if (res.ok) setShowPdtt(true); } catch (e) { console.error(e); }
    };
    const checkPdttServiceConfig = async () => {
      try {
        const res = await apiFetch("/pdtt-service-config");
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data?.pdtt_service_enabled === "boolean") setShowProcurementProposalService(data.pdtt_service_enabled);
      } catch (e) { console.error(e); }
    };
    if (user) { checkPdtt(); checkPdttServiceConfig(); }
  }, [apiFetch, user]);

  useEffect(() => {
    const fetchHeroSlider = async () => {
      try {
        const res = await apiFetch("/hero-slider");
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        if (data?.use_default) return;
        if (data && Array.isArray(data.slides)) { setHeroSlides(data.slides); setSlideIndex(0); }
        else if (Array.isArray(data)) { setHeroSlides(data); setSlideIndex(0); }
        if (data?.slider_duration) setSliderDuration(Number(data.slider_duration) || 6);
      } catch (e) { console.error(e); }
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
    const fetchNews = async () => {
      setNewsLoading(true);
      try {
        const res = await apiFetch("/news?limit=4");
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        setNewsPosts(Array.isArray(data?.data) ? data.data : []);
      } catch (e) {
        console.error("Failed to fetch news", e);
      } finally {
        setNewsLoading(false);
      }
    };
    if (user) {
      fetchHeroSlider();
      fetchActivities();
      fetchNews();
    }
  }, [apiFetch, user]);

  useEffect(() => {
    if (recentActivities.length <= itemsPerSlide) return;
    
    const timer = setInterval(() => {
      setCurrentHubSlide((prev) => (prev + 1) % Math.ceil(recentActivities.length / itemsPerSlide));
    }, slideInterval);
    
    return () => clearInterval(timer);
  }, [recentActivities]);

  // Live Feed Automatic Slideshow with Pause on Hover
  useEffect(() => {
    if (recentActivities.length <= 1 || isFeedHovered) return;
    const interval = setInterval(() => {
      setCurrentFeedIndex((prev) => (prev + 1) % recentActivities.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [recentActivities.length, isFeedHovered]);

  const hubActivities = useMemo(() => {
    const start = currentHubSlide * itemsPerSlide;
    return recentActivities.slice(start, start + itemsPerSlide);
  }, [recentActivities, currentHubSlide]);

  const displayedActivities = useMemo(() => {
    if (recentActivities.length <= 5) return recentActivities;
    const items = [];
    for (let i = 0; i < 5; i++) {
      const idx = (currentFeedIndex + i) % recentActivities.length;
      items.push(recentActivities[idx]);
    }
    return items;
  }, [recentActivities, currentFeedIndex]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = parseInt(entry.target.dataset.index);
          setTimeout(() => setVisibleCards((prev) => new Set([...prev, index])), index * 60);
        }
      }),
      { threshold: 0.1, rootMargin: "50px" }
    );
    cardRefs.current.forEach((ref) => { if (ref) observer.observe(ref); });
    return () => observer.disconnect();
  }, [searchTerm, showPdtt]);

  // Categories filter removed

  const rawServices = [
    { id: "simkeu", title: "SIMKEU", description: "Sistem Informasi Keuangan: Pembuatan & Kelola LPJ Pertanggungjawaban Keuangan serta Invoice Belanja.", icon: <img src={simkeuIcon} alt="SIMKEU" className="lm-custom-img-icon" />, link: "/app/simkeu", accent: "#10b981", emoji: "💰", category: "keuangan" },
    { id: "siptu-drive", title: "SIPTU Drive", description: "Penyimpanan cloud terintegrasi untuk berkas kerja dan kolaborasi dokumen Anda.", icon: <img src={siptuDriveIcon} alt="SIPTU Drive" className="lm-custom-img-icon" />, link: "/app/penyimpanan-cloud", accent: "#1a73e8", emoji: "☁️", category: "kepegawaian" },
    { id: "pelatihan-pegawai", title: "Sesi Kompak", description: "Sinkronkan & lihat data pelatihan teknis, workshop, serta diseminasi pegawai dari Google Sheets.", icon: <img src={sesiKompakIcon} alt="Sesi Kompak" className="lm-custom-img-icon" />, link: "/app/pelatihan-pegawai", accent: "#0f5b99", emoji: "📚", category: "kepegawaian" },
    { id: "kearsipan", title: "Peminjaman Arsip", description: "Ajukan peminjaman arsip fisik atau digital dengan validasi TTE.", icon: <img src={kearsipanIcon} alt="Peminjaman Arsip" className="lm-custom-img-icon" />, link: "/kearsipan-peminjaman/new", accent: "#3b82f6", emoji: "📁", category: "kepegawaian" },
    { id: "simba", title: "SIMBA", description: "Sistem Informasi Manajemen Barang & Aset BMN: Peminjaman Aset, Permintaan Persediaan, dan Keluhan Pemeliharaan.", icon: <img src={simbaIcon} alt="SIMBA" className="lm-custom-img-icon" />, link: "/app/simba", accent: "#2563eb", emoji: "📦", category: "logistik" },
    { id: "ruangan", title: "Peminjaman Ruangan", description: "Lihat jadwal dan ajukan peminjaman ruangan rapat atau aula.", icon: <img src={ruanganIcon} alt="Peminjaman Ruangan" className="lm-custom-img-icon" />, link: "/peminjaman-ruangan", accent: "#6366f1", emoji: "🏢", category: "logistik" },
    { id: "rispeg", title: "Izin Keluar (RISPEG)", description: "Ajukan izin keluar kantor dengan pencatatan waktu otomatis.", icon: <img src={izinKeluarIcon} alt="Izin Keluar (RISPEG)" className="lm-custom-img-icon" />, link: "/izin-keluar", accent: "#8b5cf6", emoji: "🚶", category: "kepegawaian" },
    { id: "pengumuman-rispeg", title: "RISPEG", description: "Lihat hasil rekapitulasi pelanggaran dan leaderboard poin disiplin RISPEG.", icon: <img src={rispegPengumumanIcon} alt="RISPEG" className="lm-custom-img-icon" />, link: "/app/pengumuman-rispeg", accent: "#ef4444", emoji: "📢", category: "kepegawaian" },
    { id: "it-helpdesk", title: "IT Helpdesk", description: "Laporkan kendala IT: printer, komputer, jaringan, aplikasi.", icon: <img src={itHelpdeskIcon} alt="IT Helpdesk" className="lm-custom-img-icon" />, link: "/it-helpdesk/new", accent: "#f43f5e", emoji: "🔧", category: "it" },
    { id: "surat-tugas", title: "Pengajuan Surat Tugas", description: "Buat surat tugas multi-pegawai dengan sinkronisasi SIAMPARAN.", icon: <img src={suratTugasIcon} alt="Pengajuan Surat Tugas" className="lm-custom-img-icon" />, link: "/app/surat-tugas", accent: "#6366f1", emoji: "📝", category: "kepegawaian" },
    { id: "zoom-generator", title: "Pengajuan Zoom", description: "Buat room rapat Zoom instan menggunakan akun host resmi BPOM Palopo.", icon: <img src={zoomIcon} alt="Pengajuan Zoom" className="lm-custom-img-icon" />, link: "/app/zoom-generator", accent: "#0b56a4", emoji: "📹", category: "kepegawaian" },
    { id: "rhpk", title: "Pengelolaan RHPK", description: "Rekapitulasi Hasil Pelaksanaan Kegiatan: Pencatatan target, realisasi, & eviden kinerja pegawai.", icon: <FileProtectOutlined />, link: "/app/rhpk", accent: "#0f5b99", emoji: "📋", category: "kepegawaian" },
    { id: "pemeriksaan-kesehatan", title: "Pemeriksaan Kesehatan", description: "Pilih paket MCU, cek sisa saldo plafon, dan riwayat pemeriksaan kesehatan.", icon: <MedicineBoxOutlined style={{ fontSize: 24, color: "#0284c7" }} />, link: "/app/pemeriksaan-kesehatan", accent: "#0284c7", emoji: "🩺", category: "kepegawaian" },
    { id: "sakip-2026", title: "DATA SAKIP 2026", description: "Sistem Akuntabilitas Kinerja Instansi Pemerintah Balai POM di Palopo.", icon: <img src={sakipIcon} alt="DATA SAKIP 2026" className="lm-custom-img-icon" />, link: "https://s.id/sakippalopo26", accent: "#10b981", emoji: "📊", category: "kepegawaian", isExternal: true },
  ];

  const services = useMemo(() => {
    const list = [...rawServices];
    if (showProcurementProposalService) list.push({ id: "pengusulan-pengadaan", title: "Pengusulan PBJ", description: "Usulkan layanan pengadaan barang baru diluar master data.", icon: <ShoppingOutlined />, link: "/pengusulan-pengadaan/new", accent: "#0284c7", emoji: "🛒", category: "logistik" });
    if (showPdtt) list.push({ id: "pengajuan-pdtt", title: "Pengadaan PDTT", description: "Ajukan pengadaan untuk daftar barang sesuai periode aktif.", icon: <img src={pdttIcon} alt="Pengadaan PDTT" className="lm-custom-img-icon" />, link: "/pengajuan-pdtt/new", accent: "#f59e0b", emoji: "📦", category: "logistik" });

    return list.map((item) => {
      if (customLayananIcons[item.id]) {
        return {
          ...item,
          icon: <img src={customLayananIcons[item.id]} alt={item.title} className="lm-custom-img-icon" />,
        };
      }
      return item;
    }).sort((a, b) => a.title.localeCompare(b.title));
  }, [showProcurementProposalService, showPdtt, customLayananIcons]);

  const filteredServices = services.filter((s) => {
    const matchSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase()) || s.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  const latestInfoItems = useMemo(() => {
    return newsPosts.map((post) => ({
      id: post.id,
      title: post.title,
      description: post.excerpt || "Klik untuk membaca informasi lengkap.",
      meta: post.published_at ? dayjs(post.published_at).fromNow() : "Baru",
      type: post.pinned ? "pinned" : "news",
      onClick: () => navigate(`/app/berita/${post.slug}`),
    }));
  }, [newsPosts, navigate]);

  useEffect(() => {
    // Preload hero images to prevent lag
    if (heroSlides && Array.isArray(heroSlides)) {
      heroSlides.forEach((slide) => {
        if (slide.image) {
          const img = new Image();
          img.src = slide.image;
        }
      });
    }
  }, [heroSlides]);

  const dashboardPath = useMemo(() => {
    if (!user) return "/app";
    const role = currentRole || user.base_role;
    if (role === "admin") return "/app/dashboard";
    if (role === "validator") return "/app/validator-dashboard";
    if (role === "operator") return "/app/operator-dashboard";
    return "/app/layanan-mandiri";
  }, [user, currentRole]);

  const canAccessDashboard = user?.base_role === "admin" || ["admin", "operator", "validator"].includes(currentRole);

  const userName = useMemo(() => {
    if (!user?.name) return "Pegawai";
    return user.name.trim().split(" ")[0];
  }, [user]);

  const kgbTerakhir = useMemo(() => {
    return user?.kgb_terakhir || user?.kgb_last || "01 Januari 2025";
  }, [user]);

  const kgbAkanDatang = useMemo(() => {
    return user?.kgb_akan_datang || user?.kgb_next || "01 Januari 2027";
  }, [user]);

  const greeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 18) return "Selamat Sore";
    return "Selamat Malam";
  };

  const ensureAbsoluteUrl = (url) => {
    if (!url) return "";
    const trimmed = url.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("mailto:")) return trimmed;
    return `https://${trimmed}`;
  };

  const handleActivityClick = async (activity) => {
    if (activity.type === 'bmn') {
      const token = activity.url?.split('/').pop();
      if (!token) return;
      
      setLoadingBmn(true);
      setBmnModalVisible(true);
      setSelectedBmn(null);
      
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://siptu.bpompalopo.com/api'}/public/bmn-loans/${token}`);
        if (res.ok) {
          const data = await res.json();
          setSelectedBmn(data);
        }
      } catch (e) {
        console.error("Failed to fetch BMN details", e);
      } finally {
        setLoadingBmn(false);
      }
    } else if (activity.type === 'it_helpdesk') {
      const id = activity.id?.split('_').pop();
      if (!id) return;

      setLoadingIt(true);
      setItModalVisible(true);
      setSelectedIt(null);

      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://siptu.bpompalopo.com/api'}/public/it-helpdesk-tickets/${id}/details`);
        if (res.ok) {
          const data = await res.json();
          setSelectedIt(data);
        }
      } catch (e) {
        console.error("Failed to fetch IT details", e);
      } finally {
        setLoadingIt(false);
      }
    } else if (activity.type === 'izin_keluar') {
      const id = activity.id?.split('_').pop();
      if (!id) return;

      setLoadingExit(true);
      setExitModalVisible(true);
      setSelectedExit(null);

      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://siptu.bpompalopo.com/api'}/public/exit-permits/${id}/details`);
        if (res.ok) {
          const data = await res.json();
          setSelectedExit(data);
        }
      } catch (e) {
        console.error("Failed to fetch Exit details", e);
      } finally {
        setLoadingExit(false);
      }
    } else if (activity.url) {
      window.open(activity.url, "_blank");
    }
  };

  const getBmnStepStatus = (status) => {
    const map = { 'pengajuan': 0, 'disetujui': 1, 'dipinjam': 2, 'pengajuan-pengembalian': 2, 'dikembalikan': 3, 'ditolak': -1 };
    return map[status] ?? 0;
  };

  // ── Profile completeness check ──
  const hasEmail = !!(user?.email && user.email.trim());
  const hasPhone = !!(user?.phone_number || user?.employee?.phone_number || user?.phone || user?.no_hp);
  const hasPhoto = !!(user?.employee?.avatar_url);
  const profileComplete = hasEmail && hasPhone && hasPhoto;

  // ── Banner slideshow state (reuse heroSlides) ──
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerTimerRef = useRef(null);

  useEffect(() => {
    if (heroSlides.length <= 1) return;
    bannerTimerRef.current = setInterval(() => {
      setBannerIndex(prev => (prev + 1) % heroSlides.length);
    }, sliderDuration * 1000);
    return () => clearInterval(bannerTimerRef.current);
  }, [heroSlides, sliderDuration]);

  return (
    <div className="lm-page">

      {/* Ambient Orbs */}
      <div className="lm-ambient">
        <div className="lm-ambient-orb lm-orb-1" />
        <div className="lm-ambient-orb lm-orb-2" />
      </div>

      {/* ─── Top Navigation ─── */}
      <nav className={`lm-nav lm-nav-light ${isScrolled ? "is-scrolled" : ""}`}>
        <div className="lm-nav-inner">
          <div className="lm-brand-container">
            <div className="lm-logo-box">
              <img src="/logo/logo.png" alt="SIPTU" />
            </div>
            <div className="lm-brand-text">
              <h1 className="nav-title-light">SIPTU</h1>
              <span className="nav-sub-light">Balai POM Palopo</span>
            </div>
          </div>

          <div className="lm-nav-center">
            <a className="lm-nav-link active" onClick={() => navigate("/app/layanan-mandiri")}>Beranda</a>
            <a className="lm-nav-link" onClick={() => navigate("/app/riwayat-layanan")}>Riwayat</a>
            <a className="lm-nav-link" onClick={() => window.open('https://palopo.pom.go.id', '_blank')}>Website Balai</a>
          </div>

          <div className="lm-nav-right">
            <div className="lm-nav-time-box">
              <span className="lm-time-text">{currentTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
              <span className="lm-date-text">{currentTime.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })}</span>
            </div>

            <button className="lm-icon-btn" onClick={() => window.open('https://www.dropbox.com/scl/fi/jwli2flrz0lv59f3qsddp/update.apk?rlkey=qd9pbowzjr67cp1wdoc9wlqb5&st=kq1wwagm&dl=1', '_blank')} title="Download App">
              <AndroidOutlined />
            </button>

            {canAccessDashboard && (
              <button className="lm-icon-btn" onClick={() => navigate(dashboardPath)} title="Dashboard">
                <DashboardOutlined />
              </button>
            )}

            <div className="lm-profile-pill" onClick={() => setShowUserMenu(!showUserMenu)}>
              <div className="lm-avatar" style={{ overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {user?.employee?.avatar_url ? (
                  <img 
                    src={user.employee.avatar_url} 
                    alt={user.name} 
                    style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                  />
                ) : (
                  (user?.name?.[0] || "U").toUpperCase()
                )}
              </div>
              <div className="lm-profile-info">
                <span className="lm-profile-name">{userName}</span>
                <span className="lm-profile-role">{currentRole || "Pegawai"}</span>
              </div>
            </div>

            {showUserMenu && (
              <>
                <div className="lm-user-menu-backdrop" onClick={() => setShowUserMenu(false)} />
                <div className="lm-user-menu">
                  <button onClick={() => { setShowUserMenu(false); navigate("/app/account-settings"); }}><SettingOutlined /> Pengaturan Akun</button>
                  <button onClick={() => { setShowUserMenu(false); navigate("/app/riwayat-layanan"); }}><HistoryOutlined /> Riwayat Layanan</button>
                  <div className="lm-user-menu-divider" />
                  <button className="lm-user-menu-danger" onClick={() => { setShowUserMenu(false); logout(); }}><LogoutOutlined /> Keluar</button>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Banner Slideshow ─── */}
      <div className="lm-banner-section">
        <div className="lm-banner-slider">
          {heroSlides.map((slide, idx) => {
            const isImageOnly = !slide.title?.trim() && !slide.description?.trim() && slide.image;
            return (
              <div
                key={slide.id || idx}
                className={`lm-banner-slide ${idx === bannerIndex ? 'is-active' : ''} ${isImageOnly ? 'is-image-only' : ''} lm-banner-tone-${slide.tone || 'blue'}`}
                aria-hidden={idx !== bannerIndex}
              >
                {isImageOnly ? (
                  <img src={slide.image} alt="Banner" className="lm-banner-full-img" />
                ) : (
                  <div className="lm-banner-content">
                    <div className="lm-banner-text">
                      <div className="lm-banner-greeting">
                        <span className="lm-banner-wave">👋</span>
                        <span>{greeting()}, {userName}!</span>
                      </div>
                      <h2 className="lm-banner-title">{slide.title}</h2>
                      <p className="lm-banner-desc">{slide.description}</p>
                    </div>
                    {slide.image && (
                      <div className="lm-banner-image-wrap">
                        <img src={slide.image} alt={slide.title} className="lm-banner-img" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Dots */}
          {heroSlides.length > 1 && (
            <div className="lm-banner-dots">
              {heroSlides.map((_, idx) => (
                <button
                  key={idx}
                  className={`lm-banner-dot ${idx === bannerIndex ? 'active' : ''}`}
                  onClick={() => { setBannerIndex(idx); clearInterval(bannerTimerRef.current); }}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── 3-Column Layout ─── */}
      <div className="lm-main-container">

        {/* 👈 Left Column: Profile Card */}
        <aside className="lm-left-col">
          <div className="lm-profile-card-siasn">
            <div className="profile-card-header">
              <div className="profile-avatar-circle-glow" style={{ overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {user?.employee?.avatar_url ? (
                  <img 
                    src={user.employee.avatar_url} 
                    alt={user.name} 
                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} 
                  />
                ) : (
                  <span className="avatar-letter">{(user?.name?.[0] || "U").toUpperCase()}</span>
                )}
              </div>
              <h2 className="profile-employee-name">{user?.name || "Pegawai"}</h2>
              <span className="profile-nip-badge">NIP. {user?.nip || "19940212XXXXXXXXXX"}</span>
              <p className="profile-employee-jabatan">{user?.employee?.position || user?.position || user?.function_area || "Pegawai Balai POM"}</p>
            </div>

            <div className="profile-card-divider" />

            <div className="profile-metadata-list">
              <div className="metadata-item">
                <span className="metadata-icon"><CalendarOutlined /></span>
                <div className="metadata-details">
                  <span className="metadata-label">KGB Terakhir</span>
                  <span className="metadata-value">{kgbTerakhir}</span>
                </div>
              </div>

              <div className="metadata-item">
                <span className="metadata-icon"><ClockCircleOutlined /></span>
                <div className="metadata-details">
                  <span className="metadata-label">KGB Mendatang</span>
                  <span className="metadata-value">{kgbAkanDatang}</span>
                </div>
              </div>

              <div className="metadata-item">
                <span className="metadata-icon"><MailOutlined /></span>
                <div className="metadata-details">
                  <span className="metadata-label">Email</span>
                  <span className="metadata-value truncate-text" title={user?.email}>{user?.email || "-"}</span>
                </div>
              </div>

              <div className="metadata-item">
                <span className="metadata-icon"><PhoneOutlined /></span>
                <div className="metadata-details">
                  <span className="metadata-label">No. HP / Telepon</span>
                  <span className="metadata-value">{user?.phone_number || user?.employee?.phone_number || user?.phone || user?.no_hp || "-"}</span>
                </div>
              </div>
            </div>

            <div className="profile-card-divider" />

            <button className="profile-my-profile-btn" onClick={() => navigate("/app/account-settings")}>
              <UserOutlined /> My Profile
            </button>
          </div>
          
        </aside>

        {/* 🏛️ Center Column: Services */}
        <main className="lm-center-col">
          {/* ─── Profile Completeness Cards ─── */}
          {!profileComplete && (
            <div className="lm-profile-completeness">
              <div className="lm-completeness-header">
                <span className="lm-completeness-icon">⚠️</span>
                <div>
                  <h3 className="lm-completeness-title">Lengkapi Data Profil Anda</h3>
                  <p className="lm-completeness-subtitle">Data yang lengkap memastikan layanan kepegawaian berjalan lancar.</p>
                </div>
                <button
                  className="lm-completeness-update-btn"
                  onClick={() => navigate('/app/account-settings')}
                >
                  <SettingOutlined /> Update Profil
                </button>
              </div>

              <div className="lm-completeness-cards">
                {/* Foto */}
                <div className={`lm-complete-card ${hasPhoto ? 'complete' : 'incomplete'}`}>
                  <div className="lm-complete-card-icon">
                    {hasPhoto ? <CheckCircleFilled style={{ color: '#10b981' }} /> : <UserOutlined style={{ color: '#f59e0b' }} />}
                  </div>
                  <div className="lm-complete-card-body">
                    <span className="lm-complete-card-label">Foto Profil</span>
                    <span className="lm-complete-card-value">
                      {hasPhoto ? 'Sudah diunggah' : 'Belum ada foto'}
                    </span>
                  </div>
                  <div className={`lm-complete-card-badge ${hasPhoto ? 'ok' : 'warn'}`}>
                    {hasPhoto ? '✓ Lengkap' : '! Belum'}
                  </div>
                </div>

                {/* Email */}
                <div className={`lm-complete-card ${hasEmail ? 'complete' : 'incomplete'}`}>
                  <div className="lm-complete-card-icon">
                    {hasEmail ? <CheckCircleFilled style={{ color: '#10b981' }} /> : <MailOutlined style={{ color: '#f59e0b' }} />}
                  </div>
                  <div className="lm-complete-card-body">
                    <span className="lm-complete-card-label">Alamat Email</span>
                    <span className="lm-complete-card-value">
                      {hasEmail ? user.email : 'Belum diisi'}
                    </span>
                  </div>
                  <div className={`lm-complete-card-badge ${hasEmail ? 'ok' : 'warn'}`}>
                    {hasEmail ? '✓ Lengkap' : '! Belum'}
                  </div>
                </div>

                {/* No HP */}
                <div className={`lm-complete-card ${hasPhone ? 'complete' : 'incomplete'}`}>
                  <div className="lm-complete-card-icon">
                    {hasPhone ? <CheckCircleFilled style={{ color: '#10b981' }} /> : <PhoneOutlined style={{ color: '#f59e0b' }} />}
                  </div>
                  <div className="lm-complete-card-body">
                    <span className="lm-complete-card-label">No. HP / Telepon</span>
                    <span className="lm-complete-card-value">
                      {hasPhone
                        ? (user?.phone_number || user?.employee?.phone_number || user?.phone || user?.no_hp)
                        : 'Belum diisi'
                      }
                    </span>
                  </div>
                  <div className={`lm-complete-card-badge ${hasPhone ? 'ok' : 'warn'}`}>
                    {hasPhone ? '✓ Lengkap' : '! Belum'}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="lm-services-header-box">
            <h2 className="lm-services-section-title">Daftar Layanan</h2>
            <div className="lm-search-container-center">
              <SearchOutlined className="search-icon-inside" />
              <input
                type="text"
                placeholder="Cari layanan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input-premium"
              />
              {searchTerm && (
                <button className="search-clear-btn" onClick={() => setSearchTerm("")}>
                  <CloseOutlined />
                </button>
              )}
            </div>
          </div>

          {/* Grid Menu Layanan */}
          <div className="lm-services-grid-premium">
            {filteredServices.map((service, index) => (
              <div
                key={service.id}
                className="lm-card-premium"
                onClick={() => {
                  if (service.link.startsWith("http")) {
                    window.open(service.link, "_blank");
                  } else {
                    navigate(service.link);
                  }
                }}
                style={{ "--card-accent": service.accent }}
              >
                <div className="lm-card-icon-container" aria-hidden="true">
                  {service.id === "bmn"
                    ? <BankOutlined />
                    : service.id === "ruangan"
                      ? <CalendarOutlined />
                      : service.id === "bmn-pemeliharaan-keluhan"
                        ? <SettingOutlined />
                        : service.icon}
                </div>
                <h3 className="lm-card-title-premium">{service.title}</h3>
              </div>
            ))}
          </div>

          {filteredServices.length === 0 && (
            <div className="lm-empty-premium">
              <div className="lm-empty-icon-premium">🔍</div>
              <h3>Layanan Tidak Ditemukan</h3>
              <p>Silakan coba cari dengan kata kunci yang berbeda.</p>
            </div>
          )}
          <section className="lm-latest-info" aria-label="Informasi terkini">
            <div className="lm-latest-info__head">
              <div>
                <h3>Informasi Terkini</h3>
                <p>Berita dan pengumuman terbaru untuk layanan mandiri.</p>
              </div>
              {user?.base_role === "admin" && (
                <button type="button" onClick={() => navigate("/app/admin-news-posts")}>
                  Kelola Berita <RightOutlined />
                </button>
              )}
            </div>

            <div className="lm-latest-info__list">
              {newsLoading ? (
                <div className="lm-latest-info__empty">Memuat berita terbaru...</div>
              ) : latestInfoItems.length > 0 ? latestInfoItems.map((item) => (
                <button
                  type="button"
                  className={`lm-latest-info__item lm-latest-info__item--${item.type || "info"}`}
                  key={item.id}
                  onClick={item.onClick}
                >
                  <span className="lm-latest-info__marker" />
                  <span className="lm-latest-info__body">
                    <strong>{item.title}</strong>
                    <small>{item.description}</small>
                  </span>
                  <span className="lm-latest-info__meta">{item.meta}</span>
                </button>
              )) : (
                <div className="lm-latest-info__empty">Belum ada berita terbaru.</div>
              )}
            </div>
          </section>
        </main>

        {/* 👉 Right Column: Autoscrolling Live Feed */}
        <aside className="lm-right-col">
          <div 
            className="lm-live-feed-card"
            onMouseEnter={() => setIsFeedHovered(true)}
            onMouseLeave={() => setIsFeedHovered(false)}
          >
            <div className="feed-header-navy">
              <span className="feed-dot-blink-navy" />
              <h3 className="feed-title-navy">LIVE FEED AKTIVITAS</h3>
            </div>

            <div className="feed-scroll-container">
              {displayedActivities.length > 0 ? (
                displayedActivities.map((activity, index) => (
                  <div 
                    key={activity.id || index} 
                    className="feed-item-card-premium clickable feed-item-fade"
                    onClick={() => handleActivityClick(activity)}
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <div className={`feed-item-icon-circle ${activity.type}`}>
                      {activity.type === 'selaras' ? <CloudUploadOutlined /> :
                        activity.type === 'bmn' ? <FundOutlined /> :
                        activity.type === 'ruangan' ? <BankOutlined /> :
                        activity.type === 'izin_keluar' ? <LogoutOutlined /> :
                        activity.type === 'it_helpdesk' ? <ToolOutlined /> :
                        activity.type === 'surat_tugas' ? <FileProtectOutlined /> :
                        <AppstoreOutlined />}
                    </div>
                    <div className="feed-item-body-premium">
                      <div className="feed-item-meta-premium">
                        <span className={`feed-item-badge ${activity.type}`}>
                          {activity.type === 'izin_keluar' ? 'Izin Keluar' : activity.type.toUpperCase().replace('_', ' ')}
                        </span>
                        <span className="feed-item-time">{dayjs(activity.date).fromNow()}</span>
                      </div>
                      <h4 className="feed-item-title-premium">{activity.title}</h4>
                      <p className="feed-item-desc-premium">{activity.description}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="feed-empty-state-navy">
                  <HistoryOutlined className="empty-icon-spin" />
                  <p>Menunggu aktivitas terbaru...</p>
                </div>
              )}
            </div>

            {/* Pagination Dots */}
            {recentActivities.length > 1 && (
              <div className="feed-pagination-dots">
                {recentActivities.slice(0, 8).map((_, idx) => (
                  <button
                    key={idx}
                    className={`feed-dot ${idx === currentFeedIndex ? 'active' : ''}`}
                    onClick={() => setCurrentFeedIndex(idx)}
                    aria-label={`Aktivitas ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </aside>

      </div>

      {/* ─── Footer ─── */}
      <footer className="lm-footer">
        <div className="lm-footer-inner">
          <div className="lm-footer-brand">
            <h2>SIPTU</h2>
            <p>Sistem Informasi Pelayanan Tata Usaha<br />Balai Besar Pengawas Obat dan Makanan di Palopo.</p>
          </div>
          <div className="lm-footer-col">
            <h4>Layanan</h4>
            <a onClick={() => navigate("/kearsipan-peminjaman/new")}>Kearsipan</a>
            <a onClick={() => navigate("/peminjaman-aset/new")}>Barang Milik Negara</a>
            <a onClick={() => navigate("/izin-keluar")}>Kepegawaian</a>
            <a onClick={() => navigate("/it-helpdesk/new")}>IT Helpdesk</a>
          </div>
          <div className="lm-footer-col">
            <h4>Tautan Cepat</h4>
            <a onClick={() => navigate(dashboardPath)}>Dashboard</a>
            <a onClick={() => navigate("/app/riwayat-layanan")}>Riwayat Layanan</a>
            <a onClick={() => navigate("/app/account-settings")}>Profil Pengguna</a>
          </div>
          <div className="lm-footer-col">
            <h4>Kontak</h4>
            <p>JL. Dr. Ratulangi, Salobulo, Wara Utara, Kota Palopo, Sulawesi Selatan</p>
            <p style={{ marginTop: 8 }}>bpom_palopo@pom.go.id</p>
          </div>
        </div>
        <div className="lm-footer-bottom">
          <span>© 2026 Balai POM di Palopo. Crafted for Excellence.</span>
        </div>
      </footer>
      {/* ─── BMN Detail Modal ─── */}
      <Modal
        title={null}
        open={bmnModalVisible}
        onCancel={() => setBmnModalVisible(false)}
        footer={null}
        width={640}
        centered
        className="feed-detail-modal feed-modal--bmn"
        styles={{ body: { padding: 0 }, mask: { backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" } }}
      >
        {loadingBmn ? (
          <div className="feed-modal__loader"><Spin size="large" /><span>Memuat data peminjaman...</span></div>
        ) : selectedBmn ? (
          <div className="feed-modal__wrap">
            {/* Header */}
            <div className="feed-modal__header feed-modal__header--bmn">
              <div className="feed-modal__header-icon"><FundOutlined /></div>
              <div className="feed-modal__header-info">
                <div className="feed-modal__badge">PEMINJAMAN BMN</div>
                <h2 className="feed-modal__title">{selectedBmn.spa_number}</h2>
              </div>
              <Tag
                className="feed-modal__status"
                color={selectedBmn.status === 'dikembalikan' ? 'success' : selectedBmn.status === 'ditolak' ? 'error' : 'processing'}
              >
                {selectedBmn.status === 'dikembalikan' ? <><CheckCircleFilled /> Dikembalikan</> :
                 selectedBmn.status === 'ditolak' ? <><CloseCircleFilled /> Ditolak</> :
                 selectedBmn.status === 'dipinjam' ? <><SyncOutlined spin /> Dipinjam</> :
                 <><ClockCircleFilled /> {selectedBmn.status?.replace('-',' ')}</>}
              </Tag>
            </div>

            {/* Body */}
            <div className="feed-modal__body">
              {/* Borrower Info */}
              <div className="feed-modal__section">
                <div className="feed-modal__section-label"><UserOutlined /> Informasi Peminjam</div>
                <div className="feed-modal__data-card">
                  <div className="feed-modal__data-row">
                    <span className="feed-modal__data-key">Nama</span>
                    <span className="feed-modal__data-val">{selectedBmn.borrower_name}</span>
                  </div>
                  <div className="feed-modal__data-row">
                    <span className="feed-modal__data-key">Periode</span>
                    <span className="feed-modal__data-val">{dayjs(selectedBmn.loan_date).format('DD MMM')} – {dayjs(selectedBmn.return_date).format('DD MMM YYYY')}</span>
                  </div>
                  {selectedBmn.activity_name && (
                    <div className="feed-modal__data-row">
                      <span className="feed-modal__data-key">Kegiatan</span>
                      <span className="feed-modal__data-val">{selectedBmn.activity_name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Timeline */}
              <div className="feed-modal__section">
                <div className="feed-modal__section-label"><ClockCircleOutlined /> Riwayat Status</div>
                <div className="feed-modal__timeline">
                  <Steps
                    direction="vertical"
                    size="small"
                    current={getBmnStepStatus(selectedBmn.status)}
                    className="feed-modal__steps"
                    items={[
                      { title: 'Diajukan', description: dayjs(selectedBmn.created_at).format('DD MMM YYYY, HH:mm') },
                      { title: 'Disetujui', description: selectedBmn.approved_at ? dayjs(selectedBmn.approved_at).format('DD MMM YYYY') : 'Menunggu...' },
                      { title: 'Dipinjam', description: selectedBmn.status === 'dipinjam' ? 'Sedang berlangsung' : '-' },
                      { title: 'Dikembalikan', description: selectedBmn.return_date && selectedBmn.status === 'dikembalikan' ? dayjs(selectedBmn.return_date).format('DD MMM YYYY') : '-' },
                    ]}
                  />
                </div>
              </div>

              {/* Assets */}
              {(selectedBmn.assets || []).length > 0 && (
                <div className="feed-modal__section">
                  <div className="feed-modal__section-label"><BarcodeOutlined /> Daftar Aset ({selectedBmn.assets.length})</div>
                  <div className="feed-modal__asset-list">
                    {selectedBmn.assets.map((asset, i) => (
                      <div key={i} className="feed-modal__asset-chip">
                        <span className="feed-modal__asset-name">{asset.nama_barang}</span>
                        <code className="feed-modal__asset-code">{asset.kode_bmn}</code>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="feed-modal__footer">
              <Button size="large" block className="feed-modal__close-btn" onClick={() => setBmnModalVisible(false)}>Tutup</Button>
            </div>
          </div>
        ) : (
          <div className="feed-modal__error"><CloseCircleFilled /> Gagal memuat data peminjaman.</div>
        )}
      </Modal>

      {/* ─── IT Helpdesk Detail Modal ─── */}
      <Modal
        title={null}
        open={itModalVisible}
        onCancel={() => setItModalVisible(false)}
        footer={null}
        width={640}
        centered
        className="feed-detail-modal feed-modal--it"
        styles={{ body: { padding: 0 }, mask: { backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" } }}
      >
        {loadingIt ? (
          <div className="feed-modal__loader"><Spin size="large" /><span>Memuat data laporan...</span></div>
        ) : selectedIt ? (
          <div className="feed-modal__wrap">
            {/* Header */}
            <div className="feed-modal__header feed-modal__header--it">
              <div className="feed-modal__header-icon"><ToolOutlined /></div>
              <div className="feed-modal__header-info">
                <div className="feed-modal__badge">LAPORAN IT HELPDESK</div>
                <h2 className="feed-modal__title">{selectedIt.ticket_number || 'TI-REPORT'}</h2>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Tag
                  className="feed-modal__status"
                  color={selectedIt.status === 'completed' ? 'success' : selectedIt.status === 'in_progress' ? 'processing' : 'warning'}
                >
                  {selectedIt.status === 'completed' ? <><CheckCircleFilled /> Selesai</> :
                   selectedIt.status === 'in_progress' ? <><SyncOutlined spin /> Proses</> :
                   <><ClockCircleFilled /> Open</>}
                </Tag>
                {selectedIt.is_auto_resolved && (
                  <Tag color="error" className="feed-modal__status"><ClockCircleFilled /> Auto-Resolved</Tag>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="feed-modal__body">
              {/* Reporter Info */}
              <div className="feed-modal__section">
                <div className="feed-modal__section-label"><UserOutlined /> Pelapor</div>
                <div className="feed-modal__data-card">
                  <div className="feed-modal__data-row">
                    <span className="feed-modal__data-key">Nama</span>
                    <span className="feed-modal__data-val">{selectedIt.employee_name}</span>
                  </div>
                  <div className="feed-modal__data-row">
                    <span className="feed-modal__data-key">Unit Kerja</span>
                    <span className="feed-modal__data-val">{selectedIt.function_area || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Time info */}
              <div className="feed-modal__meta-strip">
                <div className="feed-modal__meta-chip">
                  <CalendarOutlined />
                  <span>{dayjs(selectedIt.created_at).format('DD MMMM YYYY')}</span>
                </div>
                <div className="feed-modal__meta-chip">
                  <ClockCircleOutlined />
                  <span>{dayjs(selectedIt.created_at).format('HH:mm')} WITA</span>
                </div>
              </div>

              {/* Problem */}
              <div className="feed-modal__section">
                <div className="feed-modal__section-label"><InfoCircleOutlined /> Kendala / Masalah</div>
                <div className="feed-modal__issue-box feed-modal__issue-box--danger">
                  <div className="feed-modal__issue-type">{selectedIt.report_type?.toUpperCase()}</div>
                  <p className="feed-modal__issue-desc">{selectedIt.problem_details}</p>
                </div>
              </div>

              {/* Follow-up */}
              {selectedIt.followup_details && (
                <div className="feed-modal__section">
                  <div className="feed-modal__section-label" style={{ color: '#059669' }}><CheckCircleOutlined /> Tindak Lanjut</div>
                  <div className="feed-modal__issue-box feed-modal__issue-box--success">
                    <p className="feed-modal__issue-desc">{selectedIt.followup_details}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="feed-modal__footer">
              <Button size="large" block className="feed-modal__close-btn" onClick={() => setItModalVisible(false)}>Tutup</Button>
            </div>
          </div>
        ) : (
          <div className="feed-modal__error"><CloseCircleFilled /> Gagal memuat data laporan IT.</div>
        )}
      </Modal>

      {/* ─── Exit Permit Detail Modal ─── */}
      <Modal
        title={null}
        open={exitModalVisible}
        onCancel={() => setExitModalVisible(false)}
        footer={null}
        width={580}
        centered
        className="feed-detail-modal feed-modal--exit"
        styles={{ body: { padding: 0 }, mask: { backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" } }}
      >
        {loadingExit ? (
          <div className="feed-modal__loader">
            <Spin size="large" />
            <span>Memuat data izin keluar...</span>
          </div>
        ) : selectedExit ? (
          <div className="feed-modal__wrap">
            {/* Header */}
            <div className="feed-modal__header feed-modal__header--exit">
              <div className="feed-modal__header-icon"><LogoutOutlined /></div>
              <div className="feed-modal__header-info">
                <div className="feed-modal__badge">IZIN KELUAR KANTOR (RISPEG)</div>
                <h2 className="feed-modal__title">{selectedExit.employee_name}</h2>
              </div>
              <Tag
                className="feed-modal__status"
                color={selectedExit.status === 'returned' ? 'success' : 'warning'}
                style={{
                  background: selectedExit.status === 'returned' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(245, 158, 11, 0.18)',
                  color: selectedExit.status === 'returned' ? '#34d399' : '#fbbf24',
                  border: selectedExit.status === 'returned' ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(251, 191, 36, 0.3)',
                }}
              >
                {selectedExit.status === 'returned' ? <><CheckCircleFilled /> Kembali</> : <><ClockCircleFilled /> Di Luar</>}
              </Tag>
            </div>

            {/* Body */}
            <div className="feed-modal__body">
              {/* Employee info */}
              <div className="feed-modal__section">
                <div className="feed-modal__section-label"><UserOutlined /> Data Pegawai & Permohonan</div>
                <div className="feed-modal__data-card">
                  <div className="feed-modal__data-row">
                    <span className="feed-modal__data-key">NIP Pegawai</span>
                    <span className="feed-modal__data-val" style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}>{selectedExit.nip}</span>
                  </div>
                  <div className="feed-modal__data-row">
                    <span className="feed-modal__data-key">Jenis Izin</span>
                    <span className="feed-modal__data-val">
                      <Tag color="purple" style={{ borderRadius: 6, fontWeight: 700, margin: 0, padding: '2px 8px' }}>
                        {selectedExit.permit_type}
                      </Tag>
                    </span>
                  </div>
                  <div className="feed-modal__data-row">
                    <span className="feed-modal__data-key">Tanggal Izin</span>
                    <span className="feed-modal__data-val">{dayjs(selectedExit.date).format('DD MMMM YYYY')}</span>
                  </div>
                </div>
              </div>

              {/* Time boxes */}
              <div className="feed-modal__time-pair">
                <div className="feed-modal__time-box feed-modal__time-box--out">
                  <div className="feed-modal__time-label">🛫 JAM KELUAR</div>
                  <div className="feed-modal__time-value">{selectedExit.exit_time || '--:--'}</div>
                </div>
                <div className="feed-modal__time-arrow">
                  <RightOutlined />
                </div>
                <div className={`feed-modal__time-box ${selectedExit.return_time ? 'feed-modal__time-box--in' : 'feed-modal__time-box--pending'}`}>
                  <div className="feed-modal__time-label">🛬 JAM KEMBALI</div>
                  <div className="feed-modal__time-value">{selectedExit.return_time || '--:--'}</div>
                </div>
              </div>

              {/* Reason */}
              <div className="feed-modal__section">
                <div className="feed-modal__section-label"><InfoCircleOutlined /> Maksud & Keperluan Izin</div>
                <div className="feed-modal__issue-box feed-modal__issue-box--exit">
                  <p className="feed-modal__issue-desc">{selectedExit.reason || 'Tidak ada keterangan alasan.'}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="feed-modal__footer">
              <Button size="large" className="feed-modal__close-btn" onClick={() => setExitModalVisible(false)}>Tutup Detail</Button>
            </div>
          </div>
        ) : (
          <div className="feed-modal__error"><CloseCircleFilled /> Gagal memuat data izin keluar.</div>
        )}
      </Modal>
      {/* ─── AI Assistant Floating Widget ─── */}
      <AIAssistantWidget />
      {/* ─── Info Popup Modal ─── */}
      <InfoPopupModal {...infoPopup} />
    </div>
  );
};

export default LayananMandiri;
