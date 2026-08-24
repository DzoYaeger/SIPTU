/**
 * Pusat pendefinisian endpoint API SIPTU ULTRA.
 * Semua path relatif terhadap baseUrl (https://siptu.bpompalopo.com/core_api/api).
 */
export const ENDPOINTS = {
  // ── Auth ──────────────────────────────────────────────────
  login: "/login",
  logout: "/logout",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  mfaVerify: "/mfa/verify",
  me: "/user",
  profile: "/user/profile",
  password: "/user/password",

  // ── Dashboard ─────────────────────────────────────────────
  validatorDashboard: "/validator/dashboard",

  // ── Kepegawaian ───────────────────────────────────────────
  employees: "/employees",
  suratTugas: "/surat-tugas",
  suratTugasTemplates: "/surat-tugas/templates",
  suratTugasMakSuggestions: "/surat-tugas/mak-suggestions",
  cuti: "/cuti",
  kgb: "/kgb",
  izinKeluar: "/exit-permits",
  pelatihan: "/trainings",

  // ── Keuangan ──────────────────────────────────────────────
  budgets: "/budgets",
  realisasi: "/realizations",
  lpj: "/lpj",
  panjar: "/panjar",
  invoice: "/invoices",
  pengadaanPbj: "/procurement-pbj",
  pengadaanPdtt: "/procurement-pdtt",

  // ── BMN ───────────────────────────────────────────────────
  inventories: "/inventories",
  asetTetap: "/fixed-assets",
  peminjamanAset: "/asset-loans",
  peminjamanRuangan: "/room-loans",
  pemeliharaanKeluhan: "/maintenance-reports",
  permintaanPersediaan: "/inventory-requests",

  // ── Kearsipan ─────────────────────────────────────────────
  arsipVital: "/vital-archives",
  pencatatanSurat: "/mail-registry",
  peminjamanArsip: "/archive-loans",

  // ── Layanan Mandiri & Dukungan ────────────────────────────
  layananMandiri: "/self-services",
  itHelpdesk: "/helpdesk",
  antrian: "/visitor-queues",

  // ── Admin ─────────────────────────────────────────────────
  users: "/admin/users",
  notificationSettings: "/admin/notification-settings",
  layananIcons: "/admin/layanan-icons",
};

export default ENDPOINTS;
