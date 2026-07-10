import { useEffect, useState, useMemo } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { Spin } from "antd";
import { useAuth } from "./hooks/useAuth.js";
import ForcePasswordReset from "./components/ForcePasswordReset.jsx";
import Login from "./pages/Login.jsx";
import AppLayout from "./layouts/AppLayout.jsx";
import PublicLoanPage from "./pages/PublicLoanPage.jsx";

import PublicInventoryRequestPage from "./pages/PublicInventoryRequestPage.jsx";
import PublicAssetLoanPage from "./pages/PublicAssetLoanPage.jsx";
import PublicAssetLoanTrackingPage from "./pages/PublicAssetLoanTrackingPage.jsx";
import PublicArchiveLoanRequestPage from "./pages/PublicArchiveLoanRequestPage.jsx";
import PublicArchiveLoanInfoPage from "./pages/PublicArchiveLoanInfoPage.jsx";
import PublicExitPermitPage from "./pages/PublicExitPermitPage.jsx";
import PublicResolveUnfinishedExitPermitPage from "./pages/PublicResolveUnfinishedExitPermitPage.jsx";
import ItHelpdeskForm from "./pages/ItHelpdeskForm.jsx";
import ItHelpdeskReporterSignature from "./pages/ItHelpdeskReporterSignature.jsx";
import InventoryRequestApprovalPage from "./pages/InventoryRequestApprovalPage.jsx";
import BmnMaintenanceReportForm from "./pages/BmnMaintenanceReportForm.jsx";
import ProcurementProposalPage from "./pages/ProcurementProposalPage.jsx";
import PengajuanPdttForm from "./pages/PengajuanPdttForm.jsx";
import LayananMandiri from "./views/LayananMandiri.jsx";
import PengumumanRispeg from "./views/PengumumanRispeg.jsx";
import QueueTvDisplay from "./pages/QueueTvDisplay.jsx";
import PublicQueueRegistration from "./pages/PublicQueueRegistration.jsx";
import AdminQueueStandalone from "./views/AdminQueueStandalone.jsx";
import PenyimpananCloud from "./views/PenyimpananCloud.jsx";
import PublicSharePage from "./views/PublicSharePage.jsx";
import DriveEditor from "./views/DriveEditor.jsx";
import NotFound from "./pages/NotFound.jsx";
import KearsipanPencatatanSurat from "./views/KearsipanPencatatanSurat.jsx";
import KearsipanArsipVital from "./views/KearsipanArsipVital.jsx";
import PengadaanPbj from "./views/PengadaanPbj.jsx";
import PublicKepegawaianKalender from "./pages/PublicKepegawaianKalender.jsx";
import SuratTugasForm from "./pages/SuratTugasForm.jsx";
import SignProtokolPage from "./pages/SignProtokolPage.jsx";
import VerifyDocumentPage from "./pages/VerifyDocumentPage.jsx";
import PublicRoomSchedulePage from "./pages/PublicRoomSchedulePage.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import "./App.css";
import "./MobileNativeForms.css";

// Pages that never require a password reset check (truly public / unauthenticated)
const PUBLIC_PATHS = [
  "/login",
  "/",
  "/izin-keluar",
  "/peminjaman-ruangan",
  "/antrian-display",
  "/daftar-antrian",
];

const SSOSelarasRedirect = () => {
  const { token, user } = useAuth();

  useEffect(() => {
    if (token && user?.nip) {
      window.location.href = `https://selaras.bpompalopo.com/auth/sso?token=${token}&user=${user.nip}`;
    }
  }, [token, user]);

  if (!token) {
    return <Navigate to="/login?redirect=/sso/selaras" replace />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px', background: '#0f172a', color: '#fff', fontFamily: 'sans-serif' }}>
      <Spin size="large" />
      <div style={{ fontSize: '16px', fontWeight: 'bold' }}>Mengalihkan ke Selaras...</div>
    </div>
  );
};

function App() {
  const { token, user, refreshProfile, currentRole } = useAuth();
  const location = useLocation();
  const [hasSyncedProfile, setHasSyncedProfile] = useState(false);
  const redirectParam = new URLSearchParams(location.search).get("redirect");

  // Global password reset enforcement — applies to every authenticated page
  const mustResetPassword = useMemo(() => {
    if (!token || !user) return false;
    // Skip on public / unauthenticated routes
    const path = location.pathname;
    const isPublic =
      PUBLIC_PATHS.some((p) => path === p) ||
      path.startsWith("/loan/") ||
      path.startsWith("/peminjaman-aset/track/") ||
      path.startsWith("/permintaan-persediaan/approve/") ||
      path.startsWith("/public/exit-permit/resolve-unfinished") ||
      path.startsWith("/sign-protokol") ||
      path.startsWith("/verifikasi/") ||
      path.startsWith("/it-helpdesk/") ||
      path.startsWith("/kearsipan-peminjaman/") ||
      path.endsWith("/new");
    if (isPublic) return false;
    if (user.must_reset_password) return true;
    if (!user.password_changed_at) return true;
    const changedDate = new Date(user.password_changed_at);
    const diffDays = Math.ceil(
      Math.abs(new Date() - changedDate) / (1000 * 60 * 60 * 24)
    );
    return diffDays >= 90;
  }, [token, user, location.pathname]);

  // Global dynamic browser tab titles
  useEffect(() => {
    const path = location.pathname;
    
    // Check for specific static paths first
    const titleMap = {
      "/": "SIPTU | SISTEM INFORMASI PELAYANAN TATA USAHA",
      "/login": "SIPTU | Masuk",
      "/izin-keluar": "SIPTU | Izin Keluar Kantor",
      "/peminjaman-ruangan": "SIPTU | Jadwal Peminjaman Ruangan",
      "/surat-tugas/new": "SIPTU | Form Surat Tugas Baru",
      "/antrian-display": "SIPTU | Display Antrian",
      "/daftar-antrian": "SIPTU | Pendaftaran Antrian",
      "/it-helpdesk/new": "SIPTU | Laporan IT Helpdesk Baru",
      "/kearsipan-pencatatan-surat": "SIPTU | Pencatatan Surat",
      "/kearsipan-arsip-vital": "SIPTU | Pencatatan Arsip Vital",
      "/pengadaan-pbj": "SIPTU | Proses Pengadaan PBJ",
      "/permintaan-persediaan/new": "SIPTU | Permintaan Persediaan Baru",
      "/peminjaman-aset/new": "SIPTU | Peminjaman Aset Baru",
      "/kearsipan-peminjaman/new": "SIPTU | Peminjaman Arsip Baru",
      
      // Routes under /app/
      "/app": "SIPTU | Layanan Mandiri",
      "/app/dashboard": "SIPTU | Dashboard Admin",
      "/app/validator-dashboard": "SIPTU | Dashboard Validator",
      "/app/operator-dashboard": "SIPTU | Dashboard Operator",
      "/app/layanan-mandiri": "SIPTU | Layanan Mandiri",
      "/app/riwayat-layanan": "SIPTU | Riwayat Layanan",
      "/app/penyimpanan-cloud": "SIPTU | Penyimpanan Cloud",
      "/app/kepegawaian-data-pegawai": "SIPTU | Kepegawaian - Data Pegawai",
      "/app/kepegawaian-kgb": "SIPTU | Kepegawaian - Kenaikan Gaji Berkala",
      "/app/kepegawaian-kalender": "SIPTU | Kepegawaian - Kalender Kegiatan",
      "/app/kepegawaian-surat-tugas": "SIPTU | Kepegawaian - Surat Tugas",
      "/app/rispeg-ruh": "SIPTU | RISPEG - Input Data RiSPEG",
      "/app/rispeg-dashboard": "SIPTU | RISPEG - Monitoring RISPEG",
      "/app/rispeg-izin-keluar": "SIPTU | RISPEG - Monitoring Izin Keluar",
      "/app/rispeg-pengaturan-izin-keluar": "SIPTU | RISPEG - Pengaturan Izin Keluar",
      "/app/kearsipan-peminjaman": "SIPTU | Kearsipan - Peminjaman Arsip",
      "/app/kearsipan-manajemen-up-uk": "SIPTU | Kearsipan - Manajemen UK/UP",
      "/app/kearsipan-laporan": "SIPTU | Kearsipan - Laporan Peminjaman",
      "/app/bmn-data-aset-tetap": "SIPTU | BMN - Data Aset Tetap",
      "/app/bmn-data-persediaan": "SIPTU | BMN - Data Persediaan",
      "/app/bmn-permintaan-persediaan": "SIPTU | BMN - Permintaan Persediaan",
      "/app/bmn-permintaan-persediaan/new": "SIPTU | BMN - Form Permintaan Persediaan",
      "/app/bmn-peminjaman-aset": "SIPTU | BMN - Peminjaman Aset",
      "/app/bmn-peminjaman-aset/new": "SIPTU | BMN - Form Peminjaman Aset",
      "/app/bmn-pemeliharaan-keluhan": "SIPTU | BMN - Pemeliharaan & Keluhan",
      "/app/bmn-laporan": "SIPTU | BMN - Laporan",
      "/app/pengadaan-pdtt-katalog": "SIPTU | Pengadaan - Katalog Barang",
      "/app/pengadaan-pdtt-rekapan": "SIPTU | Pengadaan - Rekapan Pengajuan",
      "/app/pengelola-pegawai-pdtt": "SIPTU | Pengadaan - Hak Akses Pegawai",
      "/app/keuangan-lpj": "SIPTU | Keuangan - Pembuatan LPJ",
      "/app/keuangan-pejabat": "SIPTU | Keuangan - Pejabat Perbendaharaan",
      "/app/keuangan-revisi": "SIPTU | Keuangan - Revisi Anggaran",
      "/app/keuangan-anggaran": "SIPTU | Keuangan - Anggaran",
      "/app/keuangan-invoice": "SIPTU | Keuangan - Invoice Belanja",
      "/app/keuangan-realisasi-anggaran": "SIPTU | Keuangan - Realisasi Anggaran",
      "/app/it-helpdesk-pelaporan": "SIPTU | IT Helpdesk - Pelaporan Keluhan",
      "/app/it-helpdesk-rekapan": "SIPTU | IT Helpdesk - Rekapan Laporan",
      "/app/admin-user-management": "SIPTU | Admin - Manajemen Pengguna",
      "/app/admin-notification-settings": "SIPTU | Admin - Pengaturan Notifikasi",
      "/app/admin-news-posts": "SIPTU | Admin - Kelola Berita",
      "/app/pengaturan-slider": "SIPTU | Admin - Pengaturan Slider",
      "/app/antrian-kontrol": "SIPTU | Manajemen UPP",
      "/app/account-settings": "SIPTU | Pengaturan Akun",
      "/app/pengumuman-rispeg": "SIPTU | Pengumuman RISPEG",
    };

    // Exact match
    if (titleMap[path]) {
      document.title = titleMap[path];
      return;
    }

    // Dynamic match checks (for paths with tokens or parameters)
    if (path.startsWith("/loan/")) {
      document.title = "SIPTU | Detail Peminjaman BMN";
    } else if (path.startsWith("/permintaan-persediaan/approve/")) {
      document.title = "SIPTU | Persetujuan Permintaan Persediaan";
    } else if (path.startsWith("/peminjaman-aset/track/")) {
      document.title = "SIPTU | Lacak Peminjaman Aset";
    } else if (path.startsWith("/kearsipan-peminjaman/")) {
      document.title = "SIPTU | Informasi Peminjaman Arsip";
    } else if (path.startsWith("/sign-protokol-kepala/")) {
      document.title = "SIPTU | Tanda Tangan Protokol Kepala";
    } else if (path.startsWith("/sign-protokol/")) {
      document.title = "SIPTU | Tanda Tangan Protokol";
    } else if (path.startsWith("/verifikasi/")) {
      document.title = "SIPTU | Verifikasi Dokumen";
    } else if (path.startsWith("/app/bmn-permintaan-persediaan/")) {
      document.title = "SIPTU | BMN - Detail Permintaan Persediaan";
    } else if (path.startsWith("/app/berita/")) {
      document.title = "SIPTU | Informasi Terkini";
    } else if (path.startsWith("/it-helpdesk/tickets/")) {
      document.title = "SIPTU | Tanda Tangan IT Helpdesk";
    } else {
      // Default fallback as requested by the user
      document.title = "SIPTU | SISTEM INFORMASI PELAYANAN TATA USAHA";
    }
  }, [location.pathname]);
  
  const defaultDashboardPath = useMemo(() => {
    if (!user) return "/app";
    
    // Gunakan currentRole (aktif) jika ada, fallback ke base_role.
    // Ini penting agar saat user Switch Role, redireksi default ikut berpindah.
    const role = currentRole || user.base_role;
    
    if (role === "admin") return "/app/dashboard";
    if (role === "validator") return "/app/validator-dashboard";
    if (role === "operator") return "/app/operator-dashboard";
    
    return "/app/layanan-mandiri";
  }, [user, currentRole]);

  const loginRedirectTarget =
    redirectParam &&
    redirectParam.startsWith("/") &&
    !redirectParam.startsWith("//")
      ? redirectParam
      : defaultDashboardPath;

  const isPublicRoute =
    location.pathname.startsWith("/loan/") ||
    location.pathname.startsWith("/peminjaman-aset/track/") ||
    location.pathname.startsWith("/permintaan-persediaan/approve/") ||
    location.pathname.startsWith("/public/exit-permit/resolve-unfinished") ||
    location.pathname.startsWith("/sign-protokol/") ||
    location.pathname.startsWith("/verifikasi/") ||
    location.pathname === "/izin-keluar" ||
    location.pathname === "/peminjaman-ruangan" ||
    location.pathname === "/" ||
    location.pathname === "/login" ||
    location.pathname === "/app/kepegawaian-kalender" ||
    location.pathname === "/antrian-display" ||
    location.pathname === "/sso/selaras" ||
    location.pathname.endsWith("/new");

  useEffect(() => {
    if (!token || isPublicRoute) {
      setHasSyncedProfile(false);
      return;
    }
    if (hasSyncedProfile) return;
    let cancelled = false;
    const syncProfile = async () => {
      try {
        await refreshProfile();
      } finally {
        if (!cancelled) setHasSyncedProfile(true);
      }
    };
    syncProfile();
    return () => {
      cancelled = true;
    };
  }, [token, refreshProfile, hasSyncedProfile, isPublicRoute]);

  const protectedElement = token ? (
    user ? (
      <AppLayout />
    ) : (
      <div className="app-loading">
        <Spin />
      </div>
    )
  ) : (
    location.pathname === "/app/kepegawaian-kalender" ? <PublicKepegawaianKalender /> : <Navigate to="/login" replace />
  );

  return (
    <>
      {mustResetPassword && (
        <ForcePasswordReset
          returnUrl={location.pathname + location.search}
        />
      )}
      <Routes>
      <Route
        path="/"
        element={
          token ? (
            <Navigate to={defaultDashboardPath} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/login"
        element={token ? <Navigate to={loginRedirectTarget} replace /> : <Login />}
      />
      <Route path="/loan/:token" element={<PublicLoanPage />} />
      <Route
        path="/permintaan-persediaan/new"
        element={<PublicInventoryRequestPage />}
      />
      <Route
        path="/permintaan-persediaan/approve/:token"
        element={<InventoryRequestApprovalPage />}
      />
      <Route path="/peminjaman-aset/new" element={<PublicAssetLoanPage />} />
      <Route
        path="/peminjaman-aset/track/:token"
        element={<PublicAssetLoanTrackingPage />}
      />
      <Route
        path="/kearsipan-peminjaman/new"
        element={<PublicArchiveLoanRequestPage />}
      />
      <Route
        path="/kearsipan-peminjaman/:token"
        element={<PublicArchiveLoanInfoPage />}
      />
      <Route path="/izin-keluar" element={<PublicExitPermitPage />} />
      <Route
        path="/public/exit-permit/resolve-unfinished"
        element={<PublicResolveUnfinishedExitPermitPage />}
      />
      <Route path="/sign-protokol/:id/:token" element={<SignProtokolPage type="ketua" />} />
      <Route path="/sign-protokol-kepala/:id/:token" element={<SignProtokolPage type="kepala" />} />
      <Route path="/verifikasi/:token" element={<VerifyDocumentPage />} />
      <Route path="/share/:token" element={<PublicSharePage />} />
      <Route path="/peminjaman-ruangan" element={<PublicRoomSchedulePage />} />
      <Route path="/surat-tugas/new" element={<SuratTugasForm />} />
      <Route path="/antrian-display" element={<QueueTvDisplay />} />
      <Route path="/daftar-antrian" element={<PublicQueueRegistration />} />
      <Route
        path="/app/antrian-kontrol"
        element={token ? <AdminQueueStandalone /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/app/penyimpanan-cloud"
        element={token ? <PenyimpananCloud /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/app/drive/editor"
        element={token ? <DriveEditor /> : <Navigate to="/login" replace />}
      />
      <Route path="/it-helpdesk/new" element={<ItHelpdeskForm />} />
      <Route
        path="/pengusulan-pengadaan/new"
        element={
          token ? <ProcurementProposalPage /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/pengajuan-pdtt/new"
        element={
          token ? <PengajuanPdttForm /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/bmn-pemeliharaan-keluhan/new"
        element={
          token ? <BmnMaintenanceReportForm /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/it-helpdesk/tickets/:ticketId/sign"
        element={<ItHelpdeskReporterSignature />}
      />
      <Route
        path="/kearsipan-pencatatan-surat"
        element={<KearsipanPencatatanSurat />}
      />
      <Route
        path="/kearsipan-arsip-vital"
        element={
          <ProtectedRoute moduleSlug="kearsipan-arsip-vital">
            <KearsipanArsipVital />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pengadaan-pbj"
        element={<PengadaanPbj />}
      />
      <Route
        path="/app/layanan-mandiri"
        element={token ? <LayananMandiri /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/app/pengumuman-rispeg"
        element={token ? <PengumumanRispeg /> : <Navigate to="/login?redirect=/app/pengumuman-rispeg" replace />}
      />
      <Route path="/sso/selaras" element={<SSOSelarasRedirect />} />
      <Route path="/app/*" element={protectedElement} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </>
  );
}

export default App;
