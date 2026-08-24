import { useCallback, useEffect, useMemo, useState } from "react";
import {
  App as AntdApp,
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Divider,
  Drawer,
  Dropdown,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popover,
  Progress,
  Radio,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  AlertOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  FilterOutlined,
  HeartOutlined,
  HistoryOutlined,
  MedicineBoxOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
  SyncOutlined,
  UserOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "../hooks/useAuth.js";
import useDebounce from "../hooks/useDebounce.js";
import "./PemeriksaanKesehatan.css";

const { Title, Text, Paragraph } = Typography;

const STATUS_CONFIG = {
  pending: {
    label: "Menunggu Verifikasi",
    dotClass: "pending",
    hint: "Pengajuan sedang menunggu verifikasi admin",
  },
  approved: {
    label: "Disetujui",
    dotClass: "approved",
    hint: "Pengajuan disetujui, silakan lakukan pemeriksaan",
  },
  completed: {
    label: "Selesai",
    dotClass: "completed",
    hint: "Pemeriksaan telah selesai dilaksanakan",
  },
  rejected: {
    label: "Ditolak",
    dotClass: "rejected",
    hint: "Pengajuan ditolak oleh admin (saldo dikembalikan)",
  },
  cancelled: {
    label: "Dibatalkan",
    dotClass: "cancelled",
    hint: "Pengajuan dibatalkan oleh pegawai (saldo dikembalikan)",
  },
};

const formatRupiah = (num) => {
  if (num === null || num === undefined || isNaN(num)) return "Rp 0";
  return "Rp " + Math.round(num).toLocaleString("id-ID");
};

export default function PemeriksaanKesehatan() {
  const { apiFetch, currentRole, user } = useAuth();
  const { message, modal } = AntdApp.useApp();

  // Active Main Tab: 'form' | 'history' | 'admin'
  const [activeTab, setActiveTab] = useState("form");

  // Admin Sub-Tab: 'requests' | 'balances' | 'packages'
  const [adminSubTab, setAdminSubTab] = useState("requests");

  // Balance & Profile State
  const [balanceData, setBalanceData] = useState(null);
  const [employeeInfo, setEmployeeInfo] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  // Packages Master List & Selection State
  const [packages, setPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [selectedPackageIds, setSelectedPackageIds] = useState([]);
  const [packageSearch, setPackageSearch] = useState("");

  // Request Form State
  const [requestForm] = Form.useForm();
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // History State
  const [myRequests, setMyRequests] = useState([]);
  const [loadingMyRequests, setLoadingMyRequests] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const debouncedHistorySearch = useDebounce(historySearch, 400);
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all");

  // Detail Drawer State
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);

  // Admin Data State
  const [adminRequests, setAdminRequests] = useState([]);
  const [loadingAdminRequests, setLoadingAdminRequests] = useState(false);
  const [adminSearch, setAdminSearch] = useState("");
  const debouncedAdminSearch = useDebounce(adminSearch, 400);
  const [adminStatusFilter, setAdminStatusFilter] = useState("all");
  const [adminYearFilter, setAdminYearFilter] = useState("all");

  const [adminBalances, setAdminBalances] = useState([]);
  const [balanceStats, setBalanceStats] = useState(null);
  const [loadingAdminBalances, setLoadingAdminBalances] = useState(false);
  const [balanceSearch, setBalanceSearch] = useState("");
  const debouncedBalanceSearch = useDebounce(balanceSearch, 400);

  // Employee Master Options for Selection
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Admin Modals State
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusForm] = Form.useForm();
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [balanceModalOpen, setBalanceModalOpen] = useState(false);
  const [balanceForm] = Form.useForm();
  const [savingBalance, setSavingBalance] = useState(false);

  const [bulkBalanceModalOpen, setBulkBalanceModalOpen] = useState(false);
  const [bulkBalanceForm] = Form.useForm();
  const [savingBulkBalance, setSavingBulkBalance] = useState(false);

  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [packageForm] = Form.useForm();
  const [savingPackage, setSavingPackage] = useState(false);

  const isAdminOrValidator = useMemo(() => {
    return (
      currentRole === "admin" ||
      currentRole === "validator" ||
      user?.base_role === "admin" ||
      user?.base_role === "validator" ||
      user?.role === "admin" ||
      user?.role === "validator" ||
      (Array.isArray(user?.available_roles) &&
        (user.available_roles.includes("admin") || user.available_roles.includes("validator")))
    );
  }, [currentRole, user?.base_role, user?.role, user?.available_roles]);

  // ─── Fetch My Balance ───────────────────────────────────────────
  const fetchMyBalance = useCallback(async () => {
    setLoadingBalance(true);
    try {
      const res = await apiFetch("/medical-checkup/my-balance");
      const data = await res.json();
      if (res.ok) {
        setBalanceData(data.balance);
        setEmployeeInfo(data.employee);
      }
    } catch (err) {
      console.error("Gagal memuat saldo MCU:", err);
    } finally {
      setLoadingBalance(false);
    }
  }, [apiFetch]);

  // ─── Fetch Packages Master ──────────────────────────────────────
  const fetchPackages = useCallback(async () => {
    setLoadingPackages(true);
    try {
      const res = await apiFetch("/medical-checkup/packages");
      const data = await res.json();
      if (res.ok) {
        setPackages(data.data || []);
      }
    } catch (err) {
      console.error("Gagal memuat daftar pemeriksaan:", err);
    } finally {
      setLoadingPackages(false);
    }
  }, [apiFetch]);

  // ─── Fetch My Requests ──────────────────────────────────────────
  const fetchMyRequests = useCallback(async () => {
    setLoadingMyRequests(true);
    try {
      const params = new URLSearchParams();
      if (historyStatusFilter !== "all") params.set("status", historyStatusFilter);

      const res = await apiFetch(`/medical-checkup/my-requests?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setMyRequests(data.data || []);
      }
    } catch (err) {
      console.error("Gagal memuat riwayat MCU:", err);
    } finally {
      setLoadingMyRequests(false);
    }
  }, [apiFetch, historyStatusFilter]);

  // ─── Fetch Admin Requests ───────────────────────────────────────
  const fetchAdminRequests = useCallback(async () => {
    if (!isAdminOrValidator) return;
    setLoadingAdminRequests(true);
    try {
      const params = new URLSearchParams();
      if (adminStatusFilter !== "all") params.set("status", adminStatusFilter);
      if (adminYearFilter && adminYearFilter !== "all") params.set("tahun_anggaran", adminYearFilter);
      if (debouncedAdminSearch.trim()) params.set("search", debouncedAdminSearch.trim());

      const res = await apiFetch(`/medical-checkup/admin/requests?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setAdminRequests(data.data || []);
      }
    } catch (err) {
      console.error("Gagal memuat rekap pengajuan admin:", err);
    } finally {
      setLoadingAdminRequests(false);
    }
  }, [apiFetch, adminStatusFilter, adminYearFilter, debouncedAdminSearch, isAdminOrValidator]);

  // ─── Fetch Admin Balances ───────────────────────────────────────
  const fetchAdminBalances = useCallback(async () => {
    if (!isAdminOrValidator) return;
    setLoadingAdminBalances(true);
    try {
      const params = new URLSearchParams();
      if (adminYearFilter && adminYearFilter !== "all") params.set("tahun_anggaran", adminYearFilter);
      if (debouncedBalanceSearch.trim()) params.set("search", debouncedBalanceSearch.trim());

      const res = await apiFetch(`/medical-checkup/admin/balances?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setAdminBalances(data.data || []);
        setBalanceStats(data.stats || null);
      }
    } catch (err) {
      console.error("Gagal memuat saldo pegawai:", err);
    } finally {
      setLoadingAdminBalances(false);
    }
  }, [apiFetch, adminYearFilter, debouncedBalanceSearch, isAdminOrValidator]);

  // ─── Fetch Employee Options for Selection ─────────────────────────
  const fetchEmployeeOptions = useCallback(async () => {
    if (!isAdminOrValidator) return;
    setLoadingEmployees(true);
    try {
      const res = await apiFetch("/medical-checkup/admin/employees-options");
      const data = await res.json();
      if (res.ok && Array.isArray(data.data)) {
        setEmployeeOptions(data.data);
      } else {
        // Fallback
        const resFallback = await apiFetch("/employees?pageSize=1000");
        const dataFallback = await resFallback.json();
        if (resFallback.ok && Array.isArray(dataFallback.data)) {
          setEmployeeOptions(dataFallback.data);
        }
      }
    } catch (err) {
      console.error("Gagal memuat daftar pegawai:", err);
    } finally {
      setLoadingEmployees(false);
    }
  }, [apiFetch, isAdminOrValidator]);

  // Initial Data Load
  useEffect(() => {
    fetchMyBalance();
    fetchPackages();
    fetchMyRequests();
    if (isAdminOrValidator) {
      fetchAdminRequests();
      fetchAdminBalances();
      fetchEmployeeOptions();
    }
  }, [fetchMyBalance, fetchPackages, fetchMyRequests, isAdminOrValidator, fetchAdminRequests, fetchAdminBalances, fetchEmployeeOptions]);

  // Admin Data Load on Tab Switch
  useEffect(() => {
    if (activeTab === "admin" && isAdminOrValidator) {
      if (adminSubTab === "requests") fetchAdminRequests();
      if (adminSubTab === "balances") {
        fetchAdminBalances();
        fetchEmployeeOptions();
      }
      if (adminSubTab === "packages") fetchPackages();
    }
  }, [activeTab, adminSubTab, isAdminOrValidator, fetchAdminRequests, fetchAdminBalances, fetchEmployeeOptions, fetchPackages]);

  // ─── Balance & Selection Calculations ───────────────────────────
  const currentAvailableBalance = useMemo(() => {
    return Number(balanceData?.current_balance ?? 0);
  }, [balanceData]);

  const totalSelectedPrice = useMemo(() => {
    return selectedPackageIds.reduce((sum, id) => {
      const pkg = packages.find((p) => p.id === id);
      return sum + (pkg ? Number(pkg.price) : 0);
    }, 0);
  }, [selectedPackageIds, packages]);

  const simulatedRemainingBalance = useMemo(() => {
    return currentAvailableBalance - totalSelectedPrice;
  }, [currentAvailableBalance, totalSelectedPrice]);

  const isBalanceSufficient = useMemo(() => {
    return simulatedRemainingBalance >= 0;
  }, [simulatedRemainingBalance]);

  // Toggle package selection
  const togglePackage = (pkgId) => {
    setSelectedPackageIds((prev) =>
      prev.includes(pkgId) ? prev.filter((id) => id !== pkgId) : [...prev, pkgId]
    );
  };

  // Filtered packages for display
  const filteredPackages = useMemo(() => {
    return packages.filter((p) => {
      const term = packageSearch.toLowerCase();
      return (
        !term ||
        p.name.toLowerCase().includes(term) ||
        (p.description && p.description.toLowerCase().includes(term)) ||
        (p.code && p.code.toLowerCase().includes(term))
      );
    });
  }, [packages, packageSearch]);

  // ─── Submit MCU Request ─────────────────────────────────────────
  const handleSubmitRequest = async (values) => {
    if (selectedPackageIds.length === 0) {
      message.warning("Pilih minimal 1 jenis pemeriksaan kesehatan.");
      return;
    }
    if (!isBalanceSufficient) {
      message.error("Total biaya pemeriksaan melebihi sisa saldo Anda!");
      return;
    }

    setSubmittingRequest(true);
    try {
      const payload = {
        package_ids: selectedPackageIds,
        planned_date: values.planned_date.format("YYYY-MM-DD"),
        faskes_name: values.faskes_name,
        notes: values.notes,
        tahun_anggaran: new Date().getFullYear(),
      };

      const res = await apiFetch("/medical-checkup/requests", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "Gagal mengirim pengajuan.");

      message.success("Pengajuan pemeriksaan kesehatan berhasil dikirim!");
      requestForm.resetFields();
      setSelectedPackageIds([]);
      fetchMyBalance();
      fetchMyRequests();
      if (isAdminOrValidator) {
        fetchAdminRequests();
        fetchAdminBalances();
      }
      setActiveTab("history"); // Switch to history tab to view
    } catch (err) {
      message.error(err.message);
    } finally {
      setSubmittingRequest(false);
    }
  };

  // ─── Cancel My Request (Refunds balance) ────────────────────────
  const handleCancelRequest = (record) => {
    modal.confirm({
      title: "Batalkan Pengajuan MCU?",
      icon: <ExclamationCircleOutlined style={{ color: "#ef4444" }} />,
      content: (
        <div style={{ marginTop: 8, fontSize: 13, color: "#475569" }}>
          <p style={{ margin: "0 0 6px" }}>
            Apakah Anda yakin ingin membatalkan pengajuan <strong>{record.request_number}</strong>?
          </p>
          <p style={{ margin: "0 0 6px", fontSize: 12, color: "#059669" }}>
            Saldo sebesar <strong>{formatRupiah(record.total_amount)}</strong> akan otomatis dikembalikan ke saldo aktif Anda.
          </p>
        </div>
      ),
      okText: "Batalkan Pengajuan",
      okType: "danger",
      cancelText: "Kembali",
      onOk: async () => {
        try {
          const res = await apiFetch(`/medical-checkup/requests/${record.id}/cancel`, {
            method: "DELETE",
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.message ?? "Gagal membatalkan pengajuan");

          message.success("Pengajuan berhasil dibatalkan dan saldo telah dikembalikan.");
          if (detailDrawerOpen && selectedRequest?.id === record.id) {
            setDetailDrawerOpen(false);
          }
          fetchMyBalance();
          fetchMyRequests();
          if (isAdminOrValidator) {
            fetchAdminRequests();
            fetchAdminBalances();
          }
        } catch (err) {
          message.error(err.message);
        }
      },
    });
  };

  // ─── Open Detail Drawer ─────────────────────────────────────────
  const handleOpenDetail = (record) => {
    setSelectedRequest(record);
    setDetailDrawerOpen(true);
  };

  // ─── Admin Status Update ────────────────────────────────────────
  const handleOpenStatusModal = (record) => {
    setSelectedRequest(record);
    statusForm.setFieldsValue({
      status: record.status,
      admin_notes: record.admin_notes ?? "",
    });
    setStatusModalOpen(true);
  };

  const handleUpdateStatus = async (values) => {
    if (!selectedRequest) return;
    setUpdatingStatus(true);
    try {
      const res = await apiFetch(`/medical-checkup/admin/requests/${selectedRequest.id}/status`, {
        method: "PUT",
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "Gagal memperbarui status");

      message.success("Status pengajuan MCU berhasil diperbarui.");
      setStatusModalOpen(false);
      fetchAdminRequests();
      if (detailDrawerOpen && selectedRequest?.id === data.data?.id) {
        setSelectedRequest(data.data);
      }
    } catch (err) {
      message.error(err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // ─── Admin Delete Request ───────────────────────────────────────
  const handleDeleteAdminRequest = (record) => {
    modal.confirm({
      title: "Hapus Pengajuan MCU?",
      icon: <DeleteOutlined style={{ color: "#ef4444" }} />,
      content: (
        <div style={{ marginTop: 8, fontSize: 13, color: "#475569" }}>
          <p>Yakin ingin menghapus pengajuan <strong>{record.request_number}</strong> ({record.employee_name})?</p>
          <p style={{ fontSize: 11.5, color: "#94a3b8" }}>Jika status masih aktif, saldo akan dikembalikan ke pegawai.</p>
        </div>
      ),
      okText: "Hapus",
      okType: "danger",
      cancelText: "Batal",
      onOk: async () => {
        try {
          const res = await apiFetch(`/medical-checkup/admin/requests/${record.id}`, {
            method: "DELETE",
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.message ?? "Gagal menghapus pengajuan");
          message.success("Pengajuan berhasil dihapus.");
          fetchAdminRequests();
          if (detailDrawerOpen) setDetailDrawerOpen(false);
        } catch (err) {
          message.error(err.message);
        }
      },
    });
  };

  // ─── Admin Set Individual Balance ───────────────────────────────
  const handleOpenSetBalance = (record = null) => {
    balanceForm.resetFields();
    if (record) {
      balanceForm.setFieldsValue({
        nip: record.nip,
        employee_name: record.employee_name,
        tahun_anggaran: record.tahun_anggaran,
        initial_balance: Number(record.initial_balance),
        notes: record.notes,
      });
    } else {
      balanceForm.setFieldsValue({
        tahun_anggaran: adminYearFilter,
        initial_balance: 2000000,
      });
    }
    setBalanceModalOpen(true);
    if (employeeOptions.length === 0) {
      fetchEmployeeOptions();
    }
  };

  const handleSaveBalance = async (values) => {
    setSavingBalance(true);
    try {
      const emp = employeeOptions.find((e) => e.nip === values.nip);
      const payload = {
        ...values,
        employee_name: emp ? emp.name : (values.employee_name || undefined),
      };

      const res = await apiFetch("/medical-checkup/admin/balances", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "Gagal memperbarui saldo pegawai");

      message.success("Plafon saldo pegawai berhasil diperbarui.");
      setBalanceModalOpen(false);
      fetchAdminBalances();
    } catch (err) {
      message.error(err.message);
    } finally {
      setSavingBalance(false);
    }
  };

  // ─── Admin Bulk Init Balances ───────────────────────────────────
  const handleSaveBulkBalance = async (values) => {
    setSavingBulkBalance(true);
    try {
      const res = await apiFetch("/medical-checkup/admin/balances/bulk-init", {
        method: "POST",
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "Gagal inisialisasi saldo massal");

      message.success(data.message || "Saldo massal berhasil diinisialisasi.");
      setBulkBalanceModalOpen(false);
      fetchAdminBalances();
    } catch (err) {
      message.error(err.message);
    } finally {
      setSavingBulkBalance(false);
    }
  };

  // ─── Admin Package CRUD ─────────────────────────────────────────
  const handleOpenPackageModal = (record = null) => {
    setEditingPackage(record);
    packageForm.resetFields();
    if (record) {
      packageForm.setFieldsValue({
        name: record.name,
        code: record.code,
        price: Number(record.price),
        description: record.description,
        is_active: record.is_active,
        sort_order: record.sort_order,
      });
    } else {
      packageForm.setFieldsValue({
        price: 100000,
        is_active: true,
        sort_order: packages.length + 1,
      });
    }
    setPackageModalOpen(true);
  };

  const handleSavePackage = async (values) => {
    setSavingPackage(true);
    try {
      const url = editingPackage
        ? `/medical-checkup/admin/packages/${editingPackage.id}`
        : "/medical-checkup/admin/packages";
      const method = editingPackage ? "PUT" : "POST";

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "Gagal menyimpan jenis pemeriksaan");

      message.success(editingPackage ? "Jenis pemeriksaan diperbarui." : "Jenis pemeriksaan ditambahkan.");
      setPackageModalOpen(false);
      fetchPackages();
    } catch (err) {
      message.error(err.message);
    } finally {
      setSavingPackage(false);
    }
  };

  const handleDeletePackage = (record) => {
    modal.confirm({
      title: "Hapus Jenis Pemeriksaan?",
      icon: <DeleteOutlined style={{ color: "#ef4444" }} />,
      content: `Yakin ingin menghapus ${record.name}?`,
      okText: "Hapus",
      okType: "danger",
      onOk: async () => {
        try {
          const res = await apiFetch(`/medical-checkup/admin/packages/${record.id}`, {
            method: "DELETE",
          });
          if (!res.ok) throw new Error("Gagal menghapus jenis pemeriksaan");
          message.success("Jenis pemeriksaan berhasil dihapus.");
          fetchPackages();
        } catch (err) {
          message.error(err.message);
        }
      },
    });
  };

  const handleClearAllPackages = () => {
    modal.confirm({
      title: "Kosongkan Semua Jenis Pemeriksaan?",
      icon: <DeleteOutlined style={{ color: "#ef4444" }} />,
      content: "Semua data master pemeriksaan akan dihapus permanen dan tidak akan dimuat ulang secara otomatis.",
      okText: "Kosongkan Semua",
      okType: "danger",
      cancelText: "Batal",
      onOk: async () => {
        try {
          const res = await apiFetch("/medical-checkup/admin/packages/clear-all", {
            method: "DELETE",
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.message ?? "Gagal mengosongkan paket");
          message.success("Semua jenis pemeriksaan berhasil dikosongkan.");
          fetchPackages();
        } catch (err) {
          message.error(err.message);
        }
      },
    });
  };

  const handleSeedDefaultPackages = () => {
    modal.confirm({
      title: "Muat Paket Standar Template?",
      icon: <ExclamationCircleOutlined style={{ color: "#0284c7" }} />,
      content: "Sistem akan menambahkan 12 jenis pemeriksaan kesehatan standar ke dalam daftar master.",
      okText: "Muat Template",
      cancelText: "Batal",
      onOk: async () => {
        try {
          const res = await apiFetch("/medical-checkup/admin/packages/seed-defaults", {
            method: "POST",
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.message ?? "Gagal memuat template");
          message.success(data.message || "Paket standar berhasil dimuat.");
          fetchPackages();
        } catch (err) {
          message.error(err.message);
        }
      },
    });
  };

  // ─── Filtered My Requests Table Data ────────────────────────────
  const filteredMyRequests = useMemo(() => {
    let list = myRequests;
    if (debouncedHistorySearch.trim()) {
      const term = debouncedHistorySearch.toLowerCase();
      list = list.filter(
        (r) =>
          r.request_number.toLowerCase().includes(term) ||
          (r.faskes_name && r.faskes_name.toLowerCase().includes(term)) ||
          (r.notes && r.notes.toLowerCase().includes(term))
      );
    }
    return list;
  }, [myRequests, debouncedHistorySearch]);

  // ─── Table Columns: My Requests ─────────────────────────────────
  const myRequestsColumns = [
    {
      title: "No. Pengajuan & Waktu",
      key: "req_number",
      width: 190,
      render: (_, r) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span
            style={{ fontWeight: 600, color: "#0f172a", fontSize: 12.5, cursor: "pointer" }}
            onClick={() => handleOpenDetail(r)}
          >
            {r.request_number}
          </span>
          <span style={{ fontSize: 11, color: "#64748b" }}>
            {r.created_at ? dayjs(r.created_at).format("DD/MM/YYYY HH:mm") : "-"}
          </span>
        </div>
      ),
    },
    {
      title: "Item Pemeriksaan",
      key: "items",
      width: 250,
      render: (_, r) => {
        const items = r.items || [];
        if (items.length === 0) return "-";
        const first = items[0];
        const remaining = items.length - 1;

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: "#0f172a" }}>
              {first.package_name}
            </span>
            {remaining > 0 && (
              <span
                style={{
                  fontSize: 10.5,
                  color: "#0284c7",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                onClick={() => handleOpenDetail(r)}
              >
                +{remaining} pemeriksaan lainnya
              </span>
            )}
          </div>
        );
      },
    },
    {
      title: "Fasilitas / Lab",
      dataIndex: "faskes_name",
      key: "faskes_name",
      width: 170,
      render: (v) => <span style={{ fontSize: 12 }}>{v || "-"}</span>,
    },
    {
      title: "Rencana Tanggal",
      dataIndex: "planned_date",
      key: "planned_date",
      width: 130,
      render: (v) => (v ? dayjs(v).format("DD/MM/YYYY") : "-"),
    },
    {
      title: "Total Biaya",
      dataIndex: "total_amount",
      key: "total_amount",
      width: 140,
      render: (v) => (
        <span style={{ fontWeight: 600, color: "#0f172a", fontSize: 12.5 }}>
          {formatRupiah(v)}
        </span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 160,
      render: (status) => {
        const cfg = STATUS_CONFIG[status] || { label: status, dotClass: "neutral" };
        return (
          <div className="status-indicator">
            <span className={`status-dot ${cfg.dotClass}`} />
            <span className="status-text">{cfg.label}</span>
          </div>
        );
      },
    },
    {
      title: "Aksi",
      key: "action",
      width: 90,
      fixed: "right",
      align: "center",
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="Lihat Detail">
            <button
              type="button"
              className="mcu-action-btn"
              onClick={() => handleOpenDetail(r)}
            >
              <EyeOutlined style={{ fontSize: 13 }} />
            </button>
          </Tooltip>
          {r.status === "pending" && (
            <Tooltip title="Batalkan Pengajuan">
              <button
                type="button"
                className="mcu-action-btn danger"
                onClick={() => handleCancelRequest(r)}
              >
                <CloseCircleOutlined style={{ fontSize: 13 }} />
              </button>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="mcu-wrapper">
      {/* ── 1. Top Navigation Bar ── */}
      <div className="mcu-nav-tabs">
        <button
          type="button"
          className={`mcu-nav-btn ${activeTab === "form" ? "active" : ""}`}
          onClick={() => setActiveTab("form")}
        >
          <MedicineBoxOutlined /> Form Pengajuan & Kalkulator Saldo
        </button>

        <button
          type="button"
          className={`mcu-nav-btn ${activeTab === "history" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("history");
            fetchMyRequests();
          }}
        >
          <HistoryOutlined /> Riwayat Pengajuan ({myRequests.length})
        </button>

        {isAdminOrValidator && (
          <button
            type="button"
            className={`mcu-nav-btn ${activeTab === "admin" ? "active" : ""}`}
            onClick={() => setActiveTab("admin")}
          >
            <SettingOutlined /> Kelola Paket & Saldo (Admin)
          </button>
        )}
      </div>

      {/* ── 2. TAB 1: FORM PENGAJUAN & REAL-TIME CALCULATOR ── */}
      {activeTab === "form" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Balance Hero Card */}
          <div className="mcu-balance-card">
            <div className="mcu-balance-grid">
              <div className="mcu-user-profile">
                <div className="mcu-user-avatar">
                  <UserOutlined />
                </div>
                <div>
                  <div className="mcu-user-name">
                    {employeeInfo?.name || user?.employee?.name || user?.name || "Pegawai"}
                  </div>
                  <div className="mcu-user-sub">
                    NIP: {employeeInfo?.nip || user?.nip || "-"} • {employeeInfo?.department || "SIPTU"}
                  </div>
                </div>
              </div>

              <div className="mcu-metric-box">
                <span className="mcu-metric-label">Plafon Awal TA {balanceData?.tahun_anggaran || new Date().getFullYear()}</span>
                <span className="mcu-metric-val">
                  {formatRupiah(balanceData?.initial_balance)}
                </span>
              </div>

              <div className="mcu-metric-box">
                <span className="mcu-metric-label">Saldo Terpakai</span>
                <span className="mcu-metric-val used">
                  {formatRupiah(balanceData?.used_balance)}
                </span>
              </div>

              <div className="mcu-metric-box">
                <span className="mcu-metric-label">Sisa Saldo Tersedia</span>
                <span className="mcu-metric-val available">
                  {formatRupiah(balanceData?.current_balance)}
                </span>
              </div>
            </div>
          </div>

          {/* Real-Time Interactive Simulator Banner */}
          <div className="mcu-simulator-banner">
            <div className="mcu-simulator-info">
              <div className="mcu-sim-item">
                <span className="mcu-sim-label">Pilihan Pemeriksaan</span>
                <span className="mcu-sim-value highlight">
                  {selectedPackageIds.length} item dipilih
                </span>
              </div>

              <div className="mcu-sim-item">
                <span className="mcu-sim-label">Total Biaya Terpilih</span>
                <span className="mcu-sim-value">
                  {formatRupiah(totalSelectedPrice)}
                </span>
              </div>

              <div className="mcu-sim-item">
                <span className="mcu-sim-label">Estimasi Sisa Saldo</span>
                <span
                  className={`mcu-sim-value ${
                    simulatedRemainingBalance < 0
                      ? "danger"
                      : totalSelectedPrice > 0
                      ? "safe"
                      : ""
                  }`}
                >
                  {formatRupiah(simulatedRemainingBalance)}
                </span>
              </div>
            </div>

            <div>
              {selectedPackageIds.length > 0 && (
                <Button
                  size="small"
                  onClick={() => setSelectedPackageIds([])}
                  style={{ marginRight: 8 }}
                >
                  Reset Pilihan
                </Button>
              )}
              <span style={{ fontSize: 12, color: "#64748b" }}>
                Plafon Terpakai:{" "}
                <strong>
                  {balanceData?.initial_balance
                    ? Math.min(
                        100,
                        Math.round(
                          ((Number(balanceData.used_balance) + totalSelectedPrice) /
                            Number(balanceData.initial_balance)) *
                            100
                        )
                      )
                    : 0}
                  %
                </strong>
              </span>
            </div>
          </div>

          {!isBalanceSufficient && selectedPackageIds.length > 0 && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "#b91c1c",
                fontSize: 12.5,
              }}
            >
              <AlertOutlined />
              <span>
                <strong>Saldo Tidak Mencukupi:</strong> Total biaya pemeriksaan melebihi sisa saldo Anda sebesar{" "}
                {formatRupiah(Math.abs(simulatedRemainingBalance))}. Silakan kurangi beberapa jenis tes yang dipilih.
              </span>
            </div>
          )}

          {/* Grid Layout: Package Selector (Left 7.5 cols) & Form Submission (Right 4.5 cols) */}
          <Row gutter={[16, 16]}>
            {/* Left: Package List Selector */}
            <Col xs={24} lg={15}>
              <div className="mcu-section-card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 10,
                    marginBottom: 14,
                  }}
                >
                  <div className="mcu-section-title" style={{ margin: 0 }}>
                    <HeartOutlined style={{ color: "#0284c7" }} /> Pilih Jenis Pemeriksaan Kesehatan
                  </div>

                  <Input
                    placeholder="Cari tes (darah, kolesterol, ekg...)"
                    prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                    value={packageSearch}
                    onChange={(e) => setPackageSearch(e.target.value)}
                    allowClear
                    style={{ width: 240, borderRadius: 6 }}
                  />
                </div>

                {/* Package Cards Grid */}
                <div className="mcu-package-grid">
                  {filteredPackages.map((pkg) => {
                    const isSelected = selectedPackageIds.includes(pkg.id);
                    return (
                      <div
                        key={pkg.id}
                        className={`mcu-package-card ${isSelected ? "selected" : ""}`}
                        onClick={() => togglePackage(pkg.id)}
                      >
                        <div>
                          <div className="mcu-pkg-top">
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                              <Checkbox
                                checked={isSelected}
                                onChange={() => {}} // handled by card onClick
                                style={{ marginTop: 2 }}
                              />
                              <span className="mcu-pkg-name">{pkg.name}</span>
                            </div>
                            <span className="mcu-pkg-price">{formatRupiah(pkg.price)}</span>
                          </div>

                          {pkg.code && (
                            <span style={{ fontSize: 11, color: "#64748b", display: "inline-block", marginBottom: 4 }}>
                              Kode: {pkg.code}
                            </span>
                          )}
                          {pkg.description && (
                            <div className="mcu-pkg-desc">{pkg.description}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {filteredPackages.length === 0 && (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Tidak ada pemeriksaan yang sesuai kata kunci pencarian"
                  />
                )}
              </div>
            </Col>

            {/* Right: Submission Form */}
            <Col xs={24} lg={9}>
              <div className="mcu-section-card" style={{ position: "sticky", top: 16 }}>
                <div className="mcu-section-title">
                  <CalendarOutlined style={{ color: "#059669" }} /> Formulir Pengajuan
                </div>

                <Form
                  form={requestForm}
                  layout="vertical"
                  requiredMark={false}
                  onFinish={handleSubmitRequest}
                  initialValues={{
                    planned_date: dayjs().add(1, "day"),
                    faskes_name: "Klinik / Lab Rekanan BPOM Palopo",
                  }}
                >
                  <Form.Item
                    name="planned_date"
                    label={<span style={{ fontWeight: 600, fontSize: 12 }}>Rencana Tanggal Pemeriksaan</span>}
                    rules={[{ required: true, message: "Pilih tanggal rencana pemeriksaan" }]}
                  >
                    <DatePicker
                      format="DD/MM/YYYY"
                      style={{ width: "100%", borderRadius: 6 }}
                      disabledDate={(curr) => curr && curr < dayjs().startOf("day")}
                    />
                  </Form.Item>

                  <Form.Item
                    name="faskes_name"
                    label={<span style={{ fontWeight: 600, fontSize: 12 }}>Fasilitas Kesehatan / Laboratorium Rujukan</span>}
                    rules={[{ required: true, message: "Isi nama faskes / lab rujukan" }]}
                  >
                    <Input
                      placeholder="Contoh: Lab Prodia Palopo / RSUD Sawerigading / Labkesda"
                      style={{ borderRadius: 6 }}
                    />
                  </Form.Item>

                  <Form.Item
                    name="notes"
                    label={<span style={{ fontWeight: 600, fontSize: 12 }}>Catatan / Keluhan (Opsional)</span>}
                  >
                    <Input.TextArea
                      rows={3}
                      placeholder="Tuliskan keluhan kesehatan atau catatan tambahan..."
                      style={{ borderRadius: 6 }}
                    />
                  </Form.Item>

                  {/* Summary Box */}
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      padding: "12px",
                      marginBottom: 16,
                      fontSize: 12,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: "#64748b" }}>Item Terpilih:</span>
                      <strong style={{ color: "#0f172a" }}>{selectedPackageIds.length} item</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: "#64748b" }}>Total Biaya:</span>
                      <strong style={{ color: "#0284c7" }}>{formatRupiah(totalSelectedPrice)}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed #cbd5e1", paddingTop: 6, marginTop: 6 }}>
                      <span style={{ color: "#64748b" }}>Estimasi Sisa Saldo:</span>
                      <strong style={{ color: simulatedRemainingBalance < 0 ? "#dc2626" : "#059669" }}>
                        {formatRupiah(simulatedRemainingBalance)}
                      </strong>
                    </div>
                  </div>

                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={submittingRequest}
                    disabled={selectedPackageIds.length === 0 || !isBalanceSufficient}
                    block
                    style={{
                      borderRadius: 6,
                      height: 38,
                      fontWeight: 600,
                    }}
                  >
                    Kirim Pengajuan MCU
                  </Button>
                </Form>
              </div>
            </Col>
          </Row>
        </div>
      )}

      {/* ── 3. TAB 2: RIWAYAT PENGAJUAN SAYA ── */}
      {activeTab === "history" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Toolbar */}
          <div className="bmn-toolbar-card" style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px" }}>
            <Row gutter={[10, 10]} align="middle">
              <Col xs={24} sm={12} md={8}>
                <Input
                  placeholder="Cari nomor pengajuan, lab..."
                  prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  allowClear
                  style={{ borderRadius: 6, height: 34 }}
                />
              </Col>

              <Col xs={12} sm={6} md={6}>
                <Dropdown
                  menu={{
                    items: [
                      { key: "all", label: "Semua Status", onClick: () => setHistoryStatusFilter("all") },
                      ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({
                        key: k,
                        label: (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span className={`status-dot ${v.dotClass}`} />
                            <span>{v.label}</span>
                          </div>
                        ),
                        onClick: () => setHistoryStatusFilter(k),
                      })),
                    ],
                    selectedKeys: [historyStatusFilter],
                  }}
                  trigger={["click"]}
                >
                  <Button style={{ width: "100%", height: 34, borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>
                      {historyStatusFilter === "all"
                        ? "Status: Semua"
                        : `Status: ${STATUS_CONFIG[historyStatusFilter]?.label || historyStatusFilter}`}
                    </span>
                    <DownOutlined style={{ fontSize: 10 }} />
                  </Button>
                </Dropdown>
              </Col>

              <Col xs={12} sm={6} md={10} style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <Tooltip title="Segarkan">
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={fetchMyRequests}
                    loading={loadingMyRequests}
                    style={{ height: 34, borderRadius: 6 }}
                  />
                </Tooltip>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setActiveTab("form")}
                  style={{ height: 34, borderRadius: 6, fontWeight: 600 }}
                >
                  + Pengajuan Baru
                </Button>
              </Col>
            </Row>
          </div>

          {/* Table */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
            <Table
              rowKey="id"
              loading={loadingMyRequests}
              columns={myRequestsColumns}
              dataSource={filteredMyRequests}
              scroll={{ x: 1050 }}
              pagination={{ pageSize: 10 }}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Belum ada riwayat pengajuan pemeriksaan kesehatan"
                  />
                ),
              }}
            />
          </div>
        </div>
      )}

      {/* ── 4. TAB 3: ADMIN & PENGELOLA (ADMIN / VALIDATOR) ── */}
      {activeTab === "admin" && isAdminOrValidator && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Sub Navigation */}
          <div style={{ display: "flex", gap: 8, borderBottom: "1px solid #e2e8f0", paddingBottom: 10 }}>
            <Button
              type={adminSubTab === "requests" ? "primary" : "default"}
              onClick={() => setAdminSubTab("requests")}
              style={{ borderRadius: 6, fontWeight: 500 }}
            >
              Rekap Pengajuan Pegawai ({adminRequests.length})
            </Button>
            <Button
              type={adminSubTab === "balances" ? "primary" : "default"}
              onClick={() => setAdminSubTab("balances")}
              style={{ borderRadius: 6, fontWeight: 500 }}
            >
              Plafon & Saldo Pegawai
            </Button>
            <Button
              type={adminSubTab === "packages" ? "primary" : "default"}
              onClick={() => setAdminSubTab("packages")}
              style={{ borderRadius: 6, fontWeight: 500 }}
            >
              Master Jenis Pemeriksaan & Tarif ({packages.length})
            </Button>
          </div>

          {/* 4A. Admin Sub-Tab: Requests */}
          {adminSubTab === "requests" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="bmn-toolbar-card" style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px" }}>
                <Row gutter={[10, 10]} align="middle">
                  <Col xs={24} sm={12} md={6}>
                    <Input
                      placeholder="Cari no pengajuan, nama, NIP..."
                      prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                      allowClear
                      style={{ borderRadius: 6, height: 34 }}
                    />
                  </Col>
                  <Col xs={12} sm={6} md={4}>
                    <Select
                      value={adminYearFilter}
                      onChange={setAdminYearFilter}
                      options={[
                        { label: "Semua TA", value: "all" },
                        { label: "TA 2026", value: 2026 },
                        { label: "TA 2025", value: 2025 },
                        { label: "TA 2024", value: 2024 },
                      ]}
                      style={{ width: "100%", height: 34 }}
                    />
                  </Col>
                  <Col xs={12} sm={6} md={4}>
                    <Select
                      value={adminStatusFilter}
                      onChange={setAdminStatusFilter}
                      options={[
                        { label: "Semua Status", value: "all" },
                        ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({
                          label: v.label,
                          value: k,
                        })),
                      ]}
                      style={{ width: "100%", height: 34 }}
                    />
                  </Col>
                  <Col xs={24} sm={24} md={10} style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <Button icon={<ReloadOutlined />} onClick={fetchAdminRequests} loading={loadingAdminRequests}>
                      Segarkan
                    </Button>
                  </Col>
                </Row>
              </div>

              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
                <Table
                  rowKey="id"
                  loading={loadingAdminRequests}
                  dataSource={adminRequests}
                  scroll={{ x: 1100 }}
                  pagination={{ pageSize: 15 }}
                  columns={[
                    {
                      title: "No. Pengajuan & Waktu",
                      key: "number",
                      width: 180,
                      render: (_, r) => (
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ fontWeight: 600, color: "#0f172a", cursor: "pointer" }} onClick={() => handleOpenDetail(r)}>
                            {r.request_number}
                          </span>
                          <span style={{ fontSize: 11, color: "#64748b" }}>
                            {r.created_at ? dayjs(r.created_at).format("DD/MM/YYYY HH:mm") : "-"}
                          </span>
                        </div>
                      ),
                    },
                    {
                      title: "Pegawai",
                      key: "employee",
                      width: 190,
                      render: (_, r) => (
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ fontWeight: 600, color: "#0f172a", fontSize: 12.5 }}>{r.employee_name}</span>
                          <span style={{ fontSize: 11, color: "#64748b" }}>NIP: {r.nip}</span>
                        </div>
                      ),
                    },
                    {
                      title: "Item Pemeriksaan",
                      key: "items",
                      width: 240,
                      render: (_, r) => {
                        const items = r.items || [];
                        return (
                          <div style={{ fontSize: 12 }}>
                            {items.length > 0 ? items.map((i) => i.package_name).join(", ") : "-"}
                          </div>
                        );
                      },
                    },
                    {
                      title: "Fasilitas / Lab",
                      dataIndex: "faskes_name",
                      key: "faskes_name",
                      width: 160,
                    },
                    {
                      title: "Total Biaya",
                      dataIndex: "total_amount",
                      key: "total_amount",
                      width: 130,
                      render: (v) => <span style={{ fontWeight: 600, color: "#0f172a" }}>{formatRupiah(v)}</span>,
                    },
                    {
                      title: "Status",
                      dataIndex: "status",
                      key: "status",
                      width: 150,
                      render: (st) => {
                        const cfg = STATUS_CONFIG[st] || { label: st, dotClass: "neutral" };
                        return (
                          <div className="status-indicator">
                            <span className={`status-dot ${cfg.dotClass}`} />
                            <span className="status-text">{cfg.label}</span>
                          </div>
                        );
                      },
                    },
                    {
                      title: "Aksi",
                      key: "action",
                      width: 100,
                      fixed: "right",
                      align: "center",
                      render: (_, r) => {
                        const items = [
                          {
                            key: "detail",
                            label: "Lihat Detail",
                            icon: <EyeOutlined style={{ color: "#0284c7" }} />,
                            onClick: () => handleOpenDetail(r),
                          },
                          {
                            key: "update_status",
                            label: "Verifikasi / Update Status",
                            icon: <EditOutlined style={{ color: "#0f172a" }} />,
                            onClick: () => handleOpenStatusModal(r),
                          },
                          { type: "divider" },
                          {
                            key: "delete",
                            label: "Hapus Pengajuan",
                            danger: true,
                            icon: <DeleteOutlined />,
                            onClick: () => handleDeleteAdminRequest(r),
                          },
                        ];
                        return (
                          <Dropdown menu={{ items }} trigger={["click"]} placement="bottomRight">
                            <button type="button" className="mcu-action-btn">
                              <MoreOutlined style={{ fontSize: 14 }} />
                            </button>
                          </Dropdown>
                        );
                      },
                    },
                  ]}
                />
              </div>
            </div>
          )}

          {/* 4B. Admin Sub-Tab: Balances */}
          {adminSubTab === "balances" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Metric Summary Cards */}
              {balanceStats && (
                <Row gutter={[12, 12]}>
                  <Col xs={12} sm={6}>
                    <div className="mcu-section-card" style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: 11.5, color: "#64748b" }}>Total Pegawai Terdaftar</span>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>{balanceStats.total_employees}</div>
                    </div>
                  </Col>
                  <Col xs={12} sm={6}>
                    <div className="mcu-section-card" style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: 11.5, color: "#64748b" }}>Total Anggaran Plafon</span>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#0284c7" }}>{formatRupiah(balanceStats.total_initial_budget)}</div>
                    </div>
                  </Col>
                  <Col xs={12} sm={6}>
                    <div className="mcu-section-card" style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: 11.5, color: "#64748b" }}>Total Terpakai</span>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#d97706" }}>{formatRupiah(balanceStats.total_used_budget)}</div>
                    </div>
                  </Col>
                  <Col xs={12} sm={6}>
                    <div className="mcu-section-card" style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: 11.5, color: "#64748b" }}>Sisa Anggaran Aktif</span>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#059669" }}>{formatRupiah(balanceStats.total_remaining_budget)}</div>
                    </div>
                  </Col>
                </Row>
              )}

              {/* Toolbar */}
              <div className="bmn-toolbar-card" style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px" }}>
                <Row gutter={[10, 10]} align="middle">
                  <Col xs={24} sm={12} md={8}>
                    <Input
                      placeholder="Cari nama pegawai, NIP..."
                      prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                      value={balanceSearch}
                      onChange={(e) => setBalanceSearch(e.target.value)}
                      allowClear
                      style={{ borderRadius: 6, height: 34 }}
                    />
                  </Col>
                  <Col xs={12} sm={6} md={4}>
                    <Select
                      value={adminYearFilter}
                      onChange={setAdminYearFilter}
                      options={[
                        { label: "Semua TA", value: "all" },
                        { label: "TA 2026", value: 2026 },
                        { label: "TA 2025", value: 2025 },
                        { label: "TA 2024", value: 2024 },
                      ]}
                      style={{ width: "100%", height: 34 }}
                    />
                  </Col>
                  <Col xs={24} sm={24} md={12} style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <Button onClick={() => setBulkBalanceModalOpen(true)}>
                      Inisialisasi Saldo Massal
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenSetBalance()}>
                      Atur Saldo Pegawai
                    </Button>
                  </Col>
                </Row>
              </div>

              {/* Table */}
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
                <Table
                  rowKey="id"
                  loading={loadingAdminBalances}
                  dataSource={adminBalances}
                  scroll={{ x: 950 }}
                  pagination={{ pageSize: 15 }}
                  columns={[
                    {
                      title: "Nama Pegawai & NIP",
                      key: "emp",
                      render: (_, r) => (
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ fontWeight: 600, color: "#0f172a" }}>{r.employee_name}</span>
                          <span style={{ fontSize: 11, color: "#64748b" }}>NIP: {r.nip}</span>
                        </div>
                      ),
                    },
                    {
                      title: "Tahun Anggaran",
                      dataIndex: "tahun_anggaran",
                      key: "tahun_anggaran",
                      width: 140,
                    },
                    {
                      title: "Plafon Awal",
                      dataIndex: "initial_balance",
                      key: "initial_balance",
                      width: 160,
                      render: (v) => <span style={{ fontWeight: 600 }}>{formatRupiah(v)}</span>,
                    },
                    {
                      title: "Terpakai",
                      dataIndex: "used_balance",
                      key: "used_balance",
                      width: 150,
                      render: (v) => <span style={{ color: "#d97706", fontWeight: 600 }}>{formatRupiah(v)}</span>,
                    },
                    {
                      title: "Sisa Saldo",
                      dataIndex: "current_balance",
                      key: "current_balance",
                      width: 160,
                      render: (v) => <span style={{ color: "#059669", fontWeight: 700 }}>{formatRupiah(v)}</span>,
                    },
                    {
                      title: "Aksi",
                      key: "act",
                      width: 90,
                      align: "center",
                      render: (_, r) => (
                        <Tooltip title="Edit Saldo Pegawai">
                          <button type="button" className="mcu-action-btn" onClick={() => handleOpenSetBalance(r)}>
                            <EditOutlined style={{ fontSize: 13 }} />
                          </button>
                        </Tooltip>
                      ),
                    },
                  ]}
                />
              </div>
            </div>
          )}

          {/* 4C. Admin Sub-Tab: Packages Master */}
          {adminSubTab === "packages" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="bmn-toolbar-card" style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px" }}>
                <Row gutter={[10, 10]} align="middle" justify="space-between">
                  <Col xs={24} sm={10}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                      Daftar Master Jenis Pemeriksaan & Tarif MCU
                    </span>
                  </Col>
                  <Col xs={24} sm={14} style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
                    {packages.length > 0 && (
                      <Button danger onClick={handleClearAllPackages}>
                        Kosongkan Semua
                      </Button>
                    )}
                    <Button onClick={handleSeedDefaultPackages}>
                      Muat Paket Standar
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenPackageModal()}>
                      + Tambah Jenis Pemeriksaan
                    </Button>
                  </Col>
                </Row>
              </div>

              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
                <Table
                  rowKey="id"
                  loading={loadingPackages}
                  dataSource={packages}
                  pagination={{ pageSize: 15 }}
                  columns={[
                    {
                      title: "Nama Pemeriksaan",
                      dataIndex: "name",
                      key: "name",
                      render: (v, r) => (
                        <div>
                          <span style={{ fontWeight: 600, color: "#0f172a" }}>{v}</span>
                          {r.code && <span style={{ fontSize: 11, color: "#64748b", marginLeft: 6 }}>({r.code})</span>}
                        </div>
                      ),
                    },
                    {
                      title: "Tarif / Harga",
                      dataIndex: "price",
                      key: "price",
                      width: 180,
                      render: (v) => <span style={{ fontWeight: 700, color: "#0284c7" }}>{formatRupiah(v)}</span>,
                    },
                    {
                      title: "Deskripsi",
                      dataIndex: "description",
                      key: "description",
                      ellipsis: true,
                    },
                    {
                      title: "Status",
                      dataIndex: "is_active",
                      key: "is_active",
                      width: 120,
                      render: (active) => (
                        <div className="status-indicator">
                          <span className={`status-dot ${active ? "completed" : "cancelled"}`} />
                          <span className="status-text">{active ? "Aktif" : "Non-Aktif"}</span>
                        </div>
                      ),
                    },
                    {
                      title: "Aksi",
                      key: "action",
                      width: 100,
                      align: "center",
                      render: (_, r) => (
                        <Space size={4}>
                          <Tooltip title="Edit">
                            <button type="button" className="mcu-action-btn" onClick={() => handleOpenPackageModal(r)}>
                              <EditOutlined style={{ fontSize: 13 }} />
                            </button>
                          </Tooltip>
                          <Tooltip title="Hapus">
                            <button type="button" className="mcu-action-btn danger" onClick={() => handleDeletePackage(r)}>
                              <DeleteOutlined style={{ fontSize: 13 }} />
                            </button>
                          </Tooltip>
                        </Space>
                      ),
                    },
                  ]}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 5. DETAIL DRAWER ── */}
      <Drawer
        title={
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Detail Pengajuan MCU</span>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{selectedRequest?.request_number || "-"}</div>
            </div>
            {selectedRequest && (
              <div className="status-indicator" style={{ marginRight: 24 }}>
                <span className={`status-dot ${STATUS_CONFIG[selectedRequest.status]?.dotClass || "neutral"}`} />
                <span className="status-text">{STATUS_CONFIG[selectedRequest.status]?.label || selectedRequest.status}</span>
              </div>
            )}
          </div>
        }
        open={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
        width={540}
        className="mcu-drawer"
        footer={
          selectedRequest && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {selectedRequest.status === "pending" && (
                <Button danger icon={<CloseCircleOutlined />} onClick={() => handleCancelRequest(selectedRequest)}>
                  Batalkan Pengajuan
                </Button>
              )}
              <Space style={{ marginLeft: "auto" }}>
                <Button onClick={() => setDetailDrawerOpen(false)}>Tutup</Button>
                {isAdminOrValidator && (
                  <Button type="primary" icon={<EditOutlined />} onClick={() => handleOpenStatusModal(selectedRequest)}>
                    Verifikasi Status
                  </Button>
                )}
              </Space>
            </div>
          )
        }
      >
        {selectedRequest && (
          <div>
            {/* Box 1: Info Pegawai */}
            <div className="mcu-detail-box">
              <div className="mcu-detail-box-title">
                <UserOutlined /> Identitas Pegawai
              </div>
              <div className="mcu-detail-grid">
                <div className="mcu-detail-field">
                  <span className="mcu-detail-field-label">Nama Pegawai</span>
                  <span className="mcu-detail-field-value">{selectedRequest.employee_name}</span>
                </div>
                <div className="mcu-detail-field">
                  <span className="mcu-detail-field-label">NIP</span>
                  <span className="mcu-detail-field-value">{selectedRequest.nip}</span>
                </div>
                <div className="mcu-detail-field">
                  <span className="mcu-detail-field-label">Unit / Bidang</span>
                  <span className="mcu-detail-field-value">{selectedRequest.department || "-"}</span>
                </div>
                <div className="mcu-detail-field">
                  <span className="mcu-detail-field-label">Kontak HP</span>
                  <span className="mcu-detail-field-value">{selectedRequest.phone_number || "-"}</span>
                </div>
              </div>
            </div>

            {/* Box 2: Rincian Pemeriksaan */}
            <div className="mcu-detail-box">
              <div className="mcu-detail-box-title">
                <MedicineBoxOutlined /> Daftar Pemeriksaan yang Dipilih
              </div>

              {selectedRequest.items && selectedRequest.items.length > 0 ? (
                <div>
                  {selectedRequest.items.map((item, idx) => (
                    <div key={idx} className="mcu-item-row">
                      <div>
                        <div style={{ fontWeight: 600, color: "#0f172a" }}>{item.package_name}</div>
                      </div>
                      <span style={{ fontWeight: 600, color: "#0284c7" }}>{formatRupiah(item.price)}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, paddingTop: 8, borderTop: "1px solid #e2e8f0", fontSize: 13, fontWeight: 700 }}>
                    <span>Total Biaya:</span>
                    <span style={{ color: "#0284c7" }}>{formatRupiah(selectedRequest.total_amount)}</span>
                  </div>
                </div>
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Tidak ada rincian item" />
              )}
            </div>

            {/* Box 3: Faskes & Rencana */}
            <div className="mcu-detail-box">
              <div className="mcu-detail-box-title">
                <CalendarOutlined /> Rencana & Lokasi Pemeriksaan
              </div>
              <div className="mcu-detail-grid">
                <div className="mcu-detail-field">
                  <span className="mcu-detail-field-label">Fasilitas Kesehatan / Lab</span>
                  <span className="mcu-detail-field-value">{selectedRequest.faskes_name || "-"}</span>
                </div>
                <div className="mcu-detail-field">
                  <span className="mcu-detail-field-label">Rencana Tanggal</span>
                  <span className="mcu-detail-field-value">
                    {selectedRequest.planned_date ? dayjs(selectedRequest.planned_date).format("DD MMMM YYYY") : "-"}
                  </span>
                </div>
              </div>
              {selectedRequest.notes && (
                <div style={{ marginTop: 10 }}>
                  <span className="mcu-detail-field-label">Catatan Pegawai:</span>
                  <div style={{ background: "#f8fafc", padding: "6px 10px", borderRadius: 6, fontSize: 12, marginTop: 4 }}>
                    {selectedRequest.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Box 4: Verifikasi Admin */}
            <div className="mcu-detail-box">
              <div className="mcu-detail-box-title">
                <ClockCircleOutlined /> Status Verifikasi Admin
              </div>
              <div className="mcu-detail-grid">
                <div className="mcu-detail-field">
                  <span className="mcu-detail-field-label">Petugas Verifikator</span>
                  <span className="mcu-detail-field-value">{selectedRequest.approver?.name || (selectedRequest.approved_by ? "Admin SIPTU" : "Belum Diverifikasi")}</span>
                </div>
                <div className="mcu-detail-field">
                  <span className="mcu-detail-field-label">Waktu Verifikasi</span>
                  <span className="mcu-detail-field-value">
                    {selectedRequest.approved_at ? dayjs(selectedRequest.approved_at).format("DD/MM/YYYY HH:mm") : "-"}
                  </span>
                </div>
              </div>
              {selectedRequest.admin_notes && (
                <div style={{ marginTop: 10 }}>
                  <span className="mcu-detail-field-label">Catatan Admin:</span>
                  <div style={{ background: "#f8fafc", padding: "6px 10px", borderRadius: 6, fontSize: 12, marginTop: 4, color: "#0f172a" }}>
                    {selectedRequest.admin_notes}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* ── 6. ADMIN MODAL: UPDATE STATUS ── */}
      <Modal
        open={statusModalOpen}
        onCancel={() => setStatusModalOpen(false)}
        title="Verifikasi Status Pengajuan MCU"
        className="mcu-modal"
        width={500}
        footer={null}
        destroyOnClose
      >
        <Form form={statusForm} layout="vertical" onFinish={handleUpdateStatus}>
          <Form.Item name="status" label={<span style={{ fontWeight: 600 }}>Pilih Status Pengajuan</span>} rules={[{ required: true }]}>
            <Radio.Group style={{ width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <Radio.Button key={k} value={k} style={{ height: "auto", padding: "8px 10px", borderRadius: 6 }}>
                  <div className="status-indicator">
                    <span className={`status-dot ${v.dotClass}`} />
                    <span className="status-text">{v.label}</span>
                  </div>
                </Radio.Button>
              ))}
            </Radio.Group>
          </Form.Item>

          <Form.Item name="admin_notes" label={<span style={{ fontWeight: 600 }}>Catatan Verifikasi / Alasan Penolakan</span>}>
            <Input.TextArea rows={3} placeholder="Tuliskan catatan verifikasi untuk pegawai..." style={{ borderRadius: 6 }} />
          </Form.Item>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <Button onClick={() => setStatusModalOpen(false)}>Batal</Button>
            <Button type="primary" htmlType="submit" loading={updatingStatus} style={{ fontWeight: 600 }}>
              Simpan Status
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ── 7. ADMIN MODAL: SET INDIVIDUAL BALANCE ── */}
      <Modal
        open={balanceModalOpen}
        onCancel={() => setBalanceModalOpen(false)}
        title="Atur Plafon Saldo MCU Pegawai"
        className="mcu-modal"
        width={520}
        footer={null}
        destroyOnClose
      >
        <Form form={balanceForm} layout="vertical" onFinish={handleSaveBalance}>
          <Form.Item
            name="nip"
            label={<span style={{ fontWeight: 600 }}>Pilih Pegawai (Cari Nama / NIP)</span>}
            rules={[{ required: true, message: "Pilih pegawai terlebih dahulu" }]}
          >
            <Select
              showSearch
              placeholder="Ketik nama atau NIP pegawai..."
              loading={loadingEmployees}
              allowClear
              filterOption={(input, option) => {
                const searchStr = String(option?.data_search || "").toLowerCase();
                return searchStr.includes(input.toLowerCase());
              }}
              onChange={(selectedNip) => {
                const emp = employeeOptions.find((e) => e.nip === selectedNip);
                if (emp) {
                  balanceForm.setFieldsValue({ employee_name: emp.name });
                }
              }}
              style={{ width: "100%" }}
              dropdownStyle={{ maxHeight: 320 }}
            >
              {employeeOptions.map((emp) => (
                <Select.Option
                  key={emp.id || emp.nip}
                  value={emp.nip}
                  data_search={`${emp.name} ${emp.nip} ${emp.department || ""} ${emp.position || ""}`}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" }}>
                    <div>
                      <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 12.5 }}>{emp.name}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>NIP: {emp.nip}</div>
                    </div>
                    {emp.department && (
                      <span style={{ fontSize: 10.5, color: "#0284c7", background: "#f0f9ff", border: "1px solid #e0f2fe", padding: "2px 6px", borderRadius: 4 }}>
                        {emp.department}
                      </span>
                    )}
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="employee_name" hidden>
            <Input />
          </Form.Item>

          <Row gutter={10}>
            <Col span={12}>
              <Form.Item name="tahun_anggaran" label={<span style={{ fontWeight: 600 }}>Tahun Anggaran</span>} rules={[{ required: true, message: "Isi tahun anggaran" }]}>
                <InputNumber style={{ width: "100%", borderRadius: 6 }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="initial_balance" label={<span style={{ fontWeight: 600 }}>Nominal Plafon Saldo (Rp)</span>} rules={[{ required: true, message: "Isi nominal plafon" }]}>
                <InputNumber
                  style={{ width: "100%", borderRadius: 6 }}
                  formatter={(value) => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                  parser={(value) => value.replace(/Rp\s?|(\.*)/g, "")}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="notes" label={<span style={{ fontWeight: 600 }}>Catatan (Opsional)</span>}>
            <Input placeholder="Contoh: Alokasi plafon MCU reguler..." style={{ borderRadius: 6 }} />
          </Form.Item>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <Button onClick={() => setBalanceModalOpen(false)}>Batal</Button>
            <Button type="primary" htmlType="submit" loading={savingBalance} style={{ fontWeight: 600 }}>
              Simpan Saldo
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ── 8. ADMIN MODAL: BULK INIT BALANCES ── */}
      <Modal
        open={bulkBalanceModalOpen}
        onCancel={() => setBulkBalanceModalOpen(false)}
        title="Inisialisasi Saldo Massal Seluruh Pegawai"
        className="mcu-modal"
        width={480}
        footer={null}
        destroyOnClose
      >
        <Form
          form={bulkBalanceForm}
          layout="vertical"
          onFinish={handleSaveBulkBalance}
          initialValues={{
            tahun_anggaran: adminYearFilter,
            default_balance: 2000000,
            overwrite_existing: false,
          }}
        >
          <Paragraph style={{ fontSize: 12.5, color: "#475569" }}>
            Fitur ini akan mengalokasikan plafon saldo pemeriksaan kesehatan secara massal kepada seluruh pegawai aktif di BPOM Palopo.
          </Paragraph>

          <Form.Item name="tahun_anggaran" label={<span style={{ fontWeight: 600 }}>Tahun Anggaran</span>} rules={[{ required: true }]}>
            <InputNumber style={{ width: "100%", borderRadius: 6 }} />
          </Form.Item>

          <Form.Item name="default_balance" label={<span style={{ fontWeight: 600 }}>Nominal Plafon per Pegawai (Rp)</span>} rules={[{ required: true }]}>
            <InputNumber
              style={{ width: "100%", borderRadius: 6 }}
              formatter={(value) => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
              parser={(value) => value.replace(/Rp\s?|(\.*)/g, "")}
            />
          </Form.Item>

          <Form.Item name="overwrite_existing" valuePropName="checked">
            <Checkbox>Perbarui juga pegawai yang sudah memiliki saldo di TA ini</Checkbox>
          </Form.Item>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <Button onClick={() => setBulkBalanceModalOpen(false)}>Batal</Button>
            <Button type="primary" htmlType="submit" loading={savingBulkBalance} style={{ fontWeight: 600 }}>
              Proses Inisialisasi Massal
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ── 9. ADMIN MODAL: PACKAGE CRUD ── */}
      <Modal
        open={packageModalOpen}
        onCancel={() => setPackageModalOpen(false)}
        title={editingPackage ? "Edit Jenis Pemeriksaan" : "Tambah Jenis Pemeriksaan MCU"}
        className="mcu-modal"
        width={520}
        footer={null}
        destroyOnClose
      >
        <Form form={packageForm} layout="vertical" onFinish={handleSavePackage}>
          <Form.Item name="name" label={<span style={{ fontWeight: 600 }}>Nama Pemeriksaan</span>} rules={[{ required: true, message: "Isi nama pemeriksaan" }]}>
            <Input placeholder="Contoh: Pemeriksaan Darah Lengkap" style={{ borderRadius: 6 }} />
          </Form.Item>

          <Row gutter={10}>
            <Col span={12}>
              <Form.Item name="code" label={<span style={{ fontWeight: 600 }}>Kode (Opsional)</span>}>
                <Input placeholder="LAB-CBC" style={{ borderRadius: 6 }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="price" label={<span style={{ fontWeight: 600 }}>Tarif / Harga (Rp)</span>} rules={[{ required: true, message: "Isi tarif / harga" }]}>
                <InputNumber
                  style={{ width: "100%", borderRadius: 6 }}
                  formatter={(value) => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                  parser={(value) => value.replace(/Rp\s?|(\.*)/g, "")}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label={<span style={{ fontWeight: 600 }}>Deskripsi / Manfaat Pemeriksaan</span>}>
            <Input.TextArea rows={3} placeholder="Penjelasan parameter yang diperiksa..." style={{ borderRadius: 6 }} />
          </Form.Item>

          <Row gutter={10}>
            <Col span={12}>
              <Form.Item name="sort_order" label={<span style={{ fontWeight: 600 }}>Urutan Tampil</span>}>
                <InputNumber style={{ width: "100%", borderRadius: 6 }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="is_active" label={<span style={{ fontWeight: 600 }}>Status Aktif</span>} valuePropName="checked">
                <Switch checkedChildren="Aktif" unCheckedChildren="Non-Aktif" />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <Button onClick={() => setPackageModalOpen(false)}>Batal</Button>
            <Button type="primary" htmlType="submit" loading={savingPackage} style={{ fontWeight: 600 }}>
              Simpan
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
