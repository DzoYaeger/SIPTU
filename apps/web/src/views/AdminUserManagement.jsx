import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  App as AntdApp,
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Collapse,
  Divider,
  Dropdown,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { buildMessageAdapter } from "../utils/notify.js";
import {
  DeleteOutlined,
  EditOutlined,
  InfoCircleOutlined,
  KeyOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useAuth } from "../hooks/useAuth.js";

// const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

const roleOptions = [
  { value: "admin", label: "Admin" },
  { value: "operator", label: "Operator" },
  { value: "validator", label: "Validator" },
];

const MODULE_GROUPS = [
  {
    key: "kepegawaian",
    title: "Kepegawaian",
    description: "Manajemen data pegawai, KGB, kalender, surat tugas, bangkom, dan Zoom.",
    accent: "kepegawaian",
    slugs: [
      "kepegawaian",
      "kepegawaian-data-pegawai",
      "kepegawaian-kgb",
      "kepegawaian-kalender",
      "kepegawaian-surat-tugas",
      "kepegawaian-bangkom",
      "zoom-generator",
    ],
  },
  {
    key: "rispeg",
    title: "RISPEG",
    description: "Sistem informasi pegawai untuk monitoring, RUH, izin keluar, dan pengumuman.",
    accent: "rispeg",
    slugs: [
      "rispeg",
      "rispeg-ruh",
      "rispeg-dashboard",
      "rispeg-izin-keluar",
      "rispeg-pengaturan-izin-keluar",
      "rispeg-pengumuman",
    ],
  },
  {
    key: "kearsipan",
    title: "Kearsipan",
    description: "Pengelolaan peminjaman arsip, pencatatan surat, unit pengolah, dan arsip vital.",
    accent: "kearsipan",
    slugs: [
      "kearsipan",
      "kearsipan-peminjaman",
      "kearsipan-pencatatan-surat",
      "kearsipan-manajemen-up-uk",
      "kearsipan-arsip-vital",
      "kearsipan-laporan",
    ],
  },
  {
    key: "bmn",
    title: "Manajemen Milik Negara (BMN)",
    description:
      "Pengelolaan data aset tetap, persediaan, pemeliharaan, dan peminjaman BMN.",
    accent: "bmn",
    slugs: [
      "bmn",
      "bmn-data-aset-tetap",
      "bmn-data-persediaan",
      "bmn-peminjaman-aset",
      "bmn-permintaan-persediaan",
      "bmn-pemeliharaan-keluhan",
      "bmn-laporan",
    ],
  },
  {
    key: "keuangan",
    title: "Sistem Keuangan (SIMKEU)",
    description:
      "Manajemen anggaran, realisasi, revisi, invoice belanja, LPJ, dan pejabat perbendaharaan.",
    accent: "keuangan",
    slugs: [
      "keuangan",
      "keuangan-anggaran",
      "keuangan-realisasi-anggaran",
      "keuangan-revisi",
      "keuangan-invoice",
      "keuangan-lpj",
      "keuangan-pejabat",
    ],
  },
  {
    key: "perjadin",
    title: "Perjalanan Dinas (Perjadin)",
    description: "Pengelolaan surat tugas, LPJ, dan monitoring perjalanan dinas.",
    accent: "perjadin",
    slugs: [
      "perjadin",
      "perjadin-st",
      "perjadin-lpj",
      "perjadin-monitoring",
    ],
  },
  {
    key: "pengadaan-pdtt",
    title: "Pengadaan PDTT & PBJ",
    description: "Katalog & usulan PDTT, rekapan pengajuan, PBJ, serta pengelola pegawai PDTT.",
    accent: "pengadaan",
    slugs: [
      "pengadaan-pdtt",
      "pengadaan-pdtt-katalog",
      "pengadaan-pdtt-rekapan",
      "pengadaan-pdtt-pengajuan-pdtt",
      "pengadaan-pbj",
      "pengelola-pegawai-pdtt",
    ],
  },
  {
    key: "it-helpdesk",
    title: "Help Desk Teknologi Informasi",
    description:
      "Pengelolaan pelaporan keluhan, tindak lanjut, dan rekapan layanan IT.",
    accent: "helpdesk",
    slugs: ["it-helpdesk", "it-helpdesk-pelaporan", "it-helpdesk-rekapan"],
  },
  {
    key: "penyimpanan-cloud",
    title: "Penyimpanan Cloud",
    description: "Manajemen file cloud storage dan media penyimpanan bersama.",
    accent: "cloud",
    slugs: ["penyimpanan-cloud"],
  },
  {
    key: "layanan",
    title: "Layanan Mandiri",
    description: "Layanan mandiri pegawai, riwayat pengajuan, dan pengaturan slider banner.",
    accent: "layanan",
    slugs: ["layanan-mandiri", "riwayat-layanan", "pengaturan-slider"],
  },
  {
    key: "siamparan",
    title: "SIAMPARAN V2",
    description: "Akses ke Sistem Informasi Aplikasi Manajemen Pengawasan Sarana.",
    accent: "siamparan",
    slugs: ["siamparan"],
  },
  {
    key: "antrian",
    title: "Manajemen UPP",
    description: "Kontrol antrian TV dan manajemen loket pelayanan publik.",
    accent: "layanan",
    slugs: ["antrian-kontrol"],
  },
  {
    key: "dashboards",
    title: "Dashboard Roles",
    description: "Akses ke Dashboard Khusus Operator dan Validator.",
    accent: "operator",
    slugs: ["operator-dashboard", "validator-dashboard"],
    autoAssign: ["operator"],
  },
  {
    key: "admin-settings",
    title: "Administrasi Sistem",
    description: "Manajemen pengguna, pengaturan notifikasi, dan berita.",
    accent: "admin",
    slugs: [
      "admin-user-management",
      "admin-notification-settings",
      "admin-news-posts",
    ],
  },
];

const AdminUserManagement = () => {
  const { apiFetch } = useAuth();
  const { message } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [modules, setModules] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [permissionDraft, setPermissionDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [initialFormValues, setInitialFormValues] = useState({});
  const [form] = Form.useForm();

  const fetchResources = useCallback(async () => {
    setLoading(true);
    try {
      const [usersResponse, modulesResponse, employeesResponse] =
        await Promise.all([
          apiFetch("/admin/users"),
          apiFetch("/admin/modules"),
          apiFetch("/employees"),
        ]);

      if (!usersResponse.ok) {
        throw new Error("Tidak dapat memuat daftar pengguna.");
      }
      if (!modulesResponse.ok) {
        throw new Error("Tidak dapat memuat daftar modul.");
      }
      if (!employeesResponse.ok) {
        throw new Error("Tidak dapat memuat daftar pegawai.");
      }

      const [usersResult, modulesResult, employeesResult] = await Promise.all([
        usersResponse.json(),
        modulesResponse.json(),
        employeesResponse.json(),
      ]);

      setUsers(usersResult.data ?? []);
      setModules(modulesResult.data ?? []);
      setEmployees(employeesResult.data ?? []);
    } catch (error) {
      console.error(error);
      notification.error({
        message: "Gagal memuat data",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [apiFetch, notification]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const moduleIndex = useMemo(() => {
    const map = new Map();
    const traverse = (node, parents = []) => {
      const path = [...parents, node.name].join(" / ");
      const id = node.id ?? node.slug;
      if (id) map.set(id, { name: node.name, path });
      (Array.isArray(node.children) ? node.children : []).forEach((child) =>
        traverse(child, [...parents, node.name]),
      );
    };
    (Array.isArray(modules) ? modules : []).forEach((module) =>
      traverse(module),
    );
    return map;
  }, [modules]);

  const employeeOptions = useMemo(
    () =>
      (employees ?? []).map((employee) => ({
        value: employee.id,
        label: `${employee.nip} - ${employee.name}`,
      })),
    [employees],
  );

  const moduleEntries = useMemo(() => {
    const entries = [];
    const traverse = (node, parent = null) => {
      const id = node.id ?? node.slug;
      entries.push({ ...node, id, parent });
      (Array.isArray(node.children) ? node.children : []).forEach((child) =>
        traverse(child, node),
      );
    };
    (Array.isArray(modules) ? modules : []).forEach((module) =>
      traverse(module),
    );
    return entries;
  }, [modules]);

  const moduleSlugIndex = useMemo(() => {
    const map = new Map();
    (moduleEntries ?? []).forEach((entry) => {
      if (entry.slug) {
        map.set(entry.slug, entry.id);
      }
    });
    return map;
  }, [moduleEntries]);

  const moduleGroupState = useMemo(() => {
    return MODULE_GROUPS.map((group) => {
      const entries = (group.slugs ?? [])
        .map((slug) => ({ slug, id: moduleSlugIndex.get(slug) }))
        .filter((item) => item.id != null);

      const compute = (roleKey) => {
        if (!entries.length) {
          return { checked: false, indeterminate: false };
        }
        const values = entries.map(
          (item) => permissionDraft[item.id]?.[roleKey] ?? false,
        );
        const checked = values.every(Boolean);
        const indeterminate = !checked && values.some(Boolean);
        return { checked, indeterminate };
      };

      return {
        ...group,
        entries,
        state: {
          operator: compute("is_operator"),
          validator: compute("is_validator"),
        },
      };
    });
  }, [moduleSlugIndex, permissionDraft]);

  const applyGroupRole = useCallback(
    (groupKey, roleKey, value) => {
      const group = moduleGroupState.find((item) => item.key === groupKey);
      if (!group || !group.entries.length) return;

      setPermissionDraft((prev) => {
        const next = { ...prev };
        group.entries.forEach(({ id }) => {
          const current = next[id] ?? {
            is_operator: false,
            is_validator: false,
          };
          current[roleKey] = value;
          if (!current.is_operator && !current.is_validator) {
            delete next[id];
          } else {
            next[id] = current;
          }
        });
        return { ...next };
      });
    },
    [moduleGroupState],
  );

  const filteredUsers = useMemo(() => {
    let currentUsers = users;

    if (search) {
      const term = search.toLowerCase();
      currentUsers = currentUsers.filter(
        (user) =>
          (user.name ?? "").toLowerCase().includes(term) ||
          (user.email ?? "").toLowerCase().includes(term) ||
          (user.employee?.nip ?? "").toLowerCase().includes(term),
      );
    }

    if (selectedRole) {
      currentUsers = currentUsers.filter(
        (user) => user.base_role === selectedRole,
      );
    }

    return currentUsers;
  }, [users, search, selectedRole]);

  const selectedEmployeeId = Form.useWatch("employee_id", form);
  const selectedEmployee = useMemo(
    () => employees.find((item) => item.id === selectedEmployeeId),
    [employees, selectedEmployeeId],
  );

  // Auto-fill fields when employee is selected (only for new users or if not already set)
  useEffect(() => {
    if (selectedEmployee && !editingUser) {
      form.setFieldsValue({
        name: selectedEmployee.name,
        nip: selectedEmployee.nip,
        email: selectedEmployee.email,
        phone_number:
          selectedEmployee.nomor_wa || selectedEmployee.nomor_hp || "",
      });
    }
  }, [selectedEmployee, editingUser, form]);

  const openDeleteModal = useCallback((user) => {
    setDeletingUser(user);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setDeletingUser(null);
  }, []);

  const openEditModal = useCallback(
    (user) => {
      setEditingUser(user);
      const draft = {};
      (Array.isArray(user.module_permissions)
        ? user.module_permissions
        : []
      ).forEach((permission) => {
        const key =
          permission.module_id ?? permission.module_slug ?? permission.slug;
        if (!key) return;
        draft[key] = {
          is_operator: permission.is_operator,
          is_validator: permission.is_validator,
        };
      });

      // Auto-assign operator-dashboard jika user adalah operator dan belum memiliki permission
      if (user.base_role === "operator") {
        const operatorDashboardModule = modules.find(
          (m) => m.slug === "operator-dashboard",
        );
        if (operatorDashboardModule) {
          const hasOperatorDashboard = Object.keys(draft).some(
            (key) =>
              key === operatorDashboardModule.id ||
              key === "operator-dashboard",
          );
          if (!hasOperatorDashboard) {
            draft[operatorDashboardModule.id] = {
              is_operator: true,
              is_validator: false,
            };
          }
        }
      }

      setPermissionDraft(draft);

      const formValues = {
        name: user.name ?? user.employee?.name ?? "",
        nip: user.employee?.nip ?? user.nip ?? "",
        email: user.email ?? user.employee?.email ?? "",
        base_role: user.base_role,
        phone_number: user.phone_number ?? user.employee?.phone_number ?? "",
        employee_id: user.employee?.id ?? user.employee_id ?? undefined,
        password: "",
      };

      setInitialFormValues(formValues);
      form.setFieldsValue(formValues);

      setModalVisible(true);
    },
    [modules, form],
  );

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setEditingUser(null);
    setPermissionDraft({});
    form.resetFields();
  }, [form]);

  const handlePermissionChange = useCallback(
    (moduleId, role, value) => {
      setPermissionDraft((prev) => {
        const next = { ...prev };

        const updateRecursive = (id, r, v) => {
          const current = next[id] ?? {
            is_operator: false,
            is_validator: false,
          };
          next[id] = { ...current, [r]: v };

          // Find children of this module to cascade the change
          const node = moduleEntries.find((e) => e.id === id);
          if (node) {
            // Find entries that have this node as parent
            const children = moduleEntries.filter(
              (e) =>
                e.parent && (e.parent.id === id || e.parent.slug === node.slug),
            );
            children.forEach((child) => {
              updateRecursive(child.id, r, v);
            });
          }

          if (!next[id].is_operator && !next[id].is_validator) {
            delete next[id];
          }
        };

        updateRecursive(moduleId, role, value);
        return { ...next };
      });
    },
    [moduleEntries],
  );

  const buildPermissionsPayload = useCallback(
    () =>
      Object.entries(permissionDraft).map(([moduleId, roles]) => ({
        module_id: moduleId,
        module_slug: moduleId,
        is_operator: Boolean(roles.is_operator),
        is_validator: Boolean(roles.is_validator),
      })),
    [permissionDraft],
  );

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      let permissions = buildPermissionsPayload() ?? [];

      // Auto-assign operator-dashboard untuk user dengan role operator
      if (values.base_role === "operator") {
        const operatorDashboardModule = modules.find(
          (m) => m.slug === "operator-dashboard",
        );
        if (operatorDashboardModule) {
          const existingPermission = permissions.find(
            (p) =>
              p.module_id === operatorDashboardModule.id ||
              p.module_slug === "operator-dashboard",
          );
          if (!existingPermission) {
            permissions.push({
              module_id: operatorDashboardModule.id,
              module_slug: "operator-dashboard",
              is_operator: true,
              is_validator: false,
            });
          }
        }
      }

      const payload = {
        name: values.name,
        email: values.email,
        base_role: values.base_role,
        phone_number: values.phone_number ? values.phone_number : null,
        employee_id: editingUser
          ? (editingUser.employee?.id ?? null)
          : (values.employee_id ?? null),
        module_permissions: permissions,
      };

      if (!editingUser) {
        payload.nip = values.nip;
      }

      if (!editingUser || (editingUser && values.email !== editingUser.email)) {
        payload.email = values.email;
      }

      if (!editingUser || values.password) {
        payload.password = values.password;
      }

      const endpoint = editingUser
        ? `/admin/users/${editingUser.id}`
        : "/admin/users";

      const response = editingUser
        ? await apiFetch(endpoint, {
          method: "PUT",
          body: JSON.stringify(payload),
        })
        : await apiFetch(endpoint, {
          method: "POST",
          body: JSON.stringify(payload),
        });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message ?? "Gagal menyimpan data pengguna.");
      }

      await response.json().catch(() => ({}));

      notification.success({
        message: editingUser ? "Pengguna diperbarui" : "Pengguna dibuat",
        description: editingUser
          ? "Data pengguna berhasil diperbarui."
          : selectedEmployee
            ? `Akun untuk ${selectedEmployee.name} siap digunakan. Login awal memakai NIP ${selectedEmployee.nip} sebagai username dan password`
            : "Data pengguna berhasil disimpan.",
      });

      closeModal();
      await fetchResources();
    } catch (error) {
      if (error?.errorFields) {
        return;
      }
      console.error(error);
      notification.error({
        message: "Gagal menyimpan",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  }, [
    apiFetch,
    buildPermissionsPayload,
    closeModal,
    editingUser,
    fetchResources,
    form,
    notification,
    selectedEmployee,
  ]);

  const handleDelete = useCallback(async () => {
    if (!deletingUser) return;

    setSaving(true);
    const endpoint = `/admin/users/${deletingUser.id}`;
    try {
      let response = null;

      try {
        response = await apiFetch(endpoint, { method: "DELETE" });
      } catch (networkError) {
        console.warn(
          "Gagal menjalankan request DELETE secara langsung, mencoba fallback POST.",
          networkError,
        );
      }

      if (!response?.ok) {
        response = await apiFetch(`${endpoint}/delete`, {
          method: "POST",
          body: JSON.stringify({}),
        });
      }

      if (!response?.ok) {
        const body = await response?.json().catch(() => ({}));
        throw new Error(body?.message ?? "Gagal menghapus pengguna.");
      }

      notification.success({
        message: "Pengguna Dihapus",
        description: `Pengguna ${deletingUser.name} telah berhasil dihapus.`,
      });

      closeDeleteModal();
      await fetchResources();
    } catch (error) {
      console.error(error);
      notification.error({
        message: "Gagal Menghapus",
        description:
          error.message ?? "Terjadi kesalahan saat menghapus pengguna.",
      });
    } finally {
      setSaving(false);
    }
  }, [
    apiFetch,
    closeDeleteModal,
    deletingUser,
    fetchResources,
    notification,
  ]);

  const handleResetMfa = useCallback(async (userRecord) => {
    if (!window.confirm(`Reset MFA untuk ${userRecord.name} (${userRecord.nip})? User akan diminta setup ulang MFA saat login.`)) {
      return;
    }
    try {
      const res = await apiFetch(`/mfa/disable/${userRecord.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal reset MFA.");
      notification.success({ message: "Reset MFA Berhasil", description: data.message });
      fetchResources();
    } catch (err) {
      notification.error({ message: "Gagal Reset MFA", description: err.message });
    }
  }, [apiFetch, notification, fetchResources]);

  const columns = useMemo(
    () => [
      {
        title: "Pegawai",
        key: "pegawai",
        render: (_, record) => (
          <Space>
            <Avatar
              icon={<UserOutlined />}
              src={record.employee?.foto}
              style={{ backgroundColor: "#1890ff" }}
            >
              {record.name?.charAt(0)?.toUpperCase()}
            </Avatar>
            <Space direction="vertical" size={0}>
              <Typography.Text strong>
                {record.employee?.name ?? record.name}
              </Typography.Text>
              {record.employee?.fungsi_bidang && (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {record.employee.fungsi_bidang}
                </Typography.Text>
              )}
            </Space>
          </Space>
        ),
        sorter: (a, b) =>
          (a.employee?.name ?? a.name ?? "").localeCompare(
            b.employee?.name ?? b.name ?? "",
          ),
      },
      {
        title: "Akun Login",
        key: "login",
        render: (_, record) => (
          <Space direction="vertical" size={0}>
            <Space>
              <Badge status={record.email ? "success" : "warning"} />
              <Typography.Text code>
                {record.employee?.nip ?? record.nip ?? "�"}
              </Typography.Text>
            </Space>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {record.email ?? "Email belum diisi"}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: "Peran Dasar",
        dataIndex: "base_role",
        key: "base_role",
        width: 120,
        render: (value) => {
          const colorMap = {
            admin: "red",
            operator: "blue",
            validator: "green",
          };
          const role = roleOptions.find((option) => option.value === value);
          return (
            <Tag
              color={colorMap[value]}
              style={{ textTransform: "uppercase", marginRight: 0 }}
            >
              {role?.label ?? value}
            </Tag>
          );
        },
      },
      {
        title: "Hak Akses Modul",
        dataIndex: "module_permissions",
        key: "modules",
        width: 250,
        render: (permissions) => {
          const safePermissions = Array.isArray(permissions) ? permissions : [];
          if (!safePermissions.length) {
            return (
              <Typography.Text type="secondary" italic>
                Tidak ada hak akses khusus.
              </Typography.Text>
            );
          }

          const displayed = safePermissions.slice(0, 3);
          const remainder = safePermissions.length - 3;

          return (
            <Space wrap size={[4, 4]}>
              {displayed.map((permission, index) => {
                const moduleKey =
                  permission.module_id ??
                  permission.module_slug ??
                  permission.slug;
                const info = moduleIndex.get(moduleKey);
                const isOp = permission.is_operator;
                const isVal = permission.is_validator;
                const roles = [isOp ? "Op" : null, isVal ? "Val" : null]
                  .filter(Boolean)
                  .join("/");

                return (
                  <Tooltip
                    key={`${moduleKey ?? index}`}
                    title={`${info?.name ?? moduleKey}: ${[isOp ? "Operator" : null, isVal ? "Validator" : null].filter(Boolean).join(", ")}`}
                  >
                    <Tag>
                      {info?.name ?? moduleKey}{" "}
                      <span style={{ fontSize: 10, color: "#888" }}>
                        ({roles})
                      </span>
                    </Tag>
                  </Tooltip>
                );
              })}
              {remainder > 0 && <Tag>+{remainder} lainnya</Tag>}
            </Space>
          );
        },
      },
      {
        title: "Aksi",
        key: "actions",
        width: 80,
        align: "center",
        render: (_, record) => {
          const items = [
            {
              key: "edit",
              label: "Ubah Pengguna",
              icon: <EditOutlined />,
              onClick: () => openEditModal(record),
            },
            {
              key: "reset_mfa",
              label: "Reset MFA User",
              icon: <SafetyCertificateOutlined />,
              onClick: () => handleResetMfa(record),
            },
            {
              key: "delete",
              label: <span style={{ color: "#ff4d4f" }}>Hapus Pengguna</span>,
              icon: <DeleteOutlined style={{ color: "#ff4d4f" }} />,
              onClick: () => openDeleteModal(record),
            },
          ];

          return (
            <Dropdown
              menu={{ items }}
              trigger={["click"]}
              placement="bottomRight"
            >
              <Button type="text" icon={<MoreOutlined />} />
            </Dropdown>
          );
        },
      },
    ],
    [moduleIndex, openEditModal, openDeleteModal, handleResetMfa],
  );

  if (loading) {
    return (
      <div className="module-section">
        <Spin />
      </div>
    );
  }

  return (
    <div className="module-section">
      <Card className="content-card" variant="borderless">
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div className="module-header">
            <div>
              <Typography.Title level={4} className="module-title">
                Manajemen Pengguna
              </Typography.Title>
              <Typography.Paragraph className="module-subtitle">
                Atur akun, peran, dan hak akses modul pegawai.
              </Typography.Paragraph>
            </div>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={fetchResources}>
                Muat Ulang
              </Button>
            </Space>
          </div>

          <Space direction="horizontal" size="middle" wrap>
            <Input.Search
              placeholder="Cari nama, email, atau NIP"
              allowClear
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ width: 280 }}
            />
            <Select
              allowClear
              placeholder="Filter berdasarkan Peran"
              options={roleOptions}
              onChange={setSelectedRole}
              style={{ width: 200 }}
            />
          </Space>

          <Table
            dataSource={filteredUsers.map((user) => ({
              ...user,
              key: user.id,
            }))}
            columns={columns}
            pagination={{ pageSize: 8 }}
            rowKey="id"
            scroll={{ x: true }}
          />
        </Space>
      </Card>

      <Modal
        title="Konfirmasi Hapus Pengguna"
        open={Boolean(deletingUser)}
        onCancel={closeDeleteModal}
        onOk={handleDelete}
        okText="Hapus"
        okButtonProps={{ danger: true }}
        confirmLoading={saving}
      >
        <Space direction="vertical" size="small" style={{ width: "100%" }}>
          <Typography.Text strong>
            Anda yakin ingin menghapus pengguna ini?
          </Typography.Text>
          <Typography.Paragraph type="secondary">
            Pengguna{" "}
            {deletingUser?.name ?? deletingUser?.employee?.name ?? "tanpa nama"}{" "}
            akan dihapus permanen dari sistem.
          </Typography.Paragraph>
        </Space>
      </Modal>

      <Modal
        title={
          <Space>
            {editingUser ? <EditOutlined /> : <PlusOutlined />}
            {editingUser ? "Ubah Pengguna" : "Tambah Pengguna"}
          </Space>
        }
        open={modalVisible}
        onCancel={closeModal}
        onOk={handleSubmit}
        okText={editingUser ? "Simpan Perubahan" : "Buat Pengguna"}
        confirmLoading={saving}
        width={800}
        destroyOnHidden
        maskClosable={false}
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          preserve={false}
          initialValues={initialFormValues}
          key={editingUser?.id || "new"}
        >
          <Tabs
            defaultActiveKey="profile"
            items={[
              {
                key: "profile",
                label: (
                  <span>
                    <UserOutlined /> Profil Pengguna
                  </span>
                ),
                children: (
                  <Space
                    direction="vertical"
                    size="middle"
                    style={{ width: "100%", paddingTop: 16 }}
                  >
                    {!editingUser && (
                      <Alert
                        type="info"
                        showIcon
                        message="Login Awal"
                        description="Pengguna baru akan menggunakan NIP sebagai username dan password awal."
                        style={{ marginBottom: 8 }}
                      />
                    )}

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 16,
                      }}
                    >
                      <Form.Item
                        label="Pegawai"
                        name="employee_id"
                        tooltip="Tautkan akun ini dengan data pegawai yang ada."
                      >
                        <Select
                          allowClear
                          showSearch
                          placeholder="Pilih pegawai"
                          options={employeeOptions}
                          optionFilterProp="label"
                          disabled={!!editingUser}
                        />
                      </Form.Item>

                      <Form.Item
                        label="Peran Dasar"
                        name="base_role"
                        rules={[
                          {
                            required: true,
                            message: "Peran dasar wajib dipilih.",
                          },
                        ]}
                        tooltip="Role utama yang menentukan akses global aplikasi."
                      >
                        <Select
                          options={roleOptions}
                          placeholder="Pilih peran"
                        />
                      </Form.Item>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 16,
                      }}
                    >
                      <Form.Item
                        label="Nama Lengkap"
                        name="name"
                        rules={[{ required: true, message: "Nama wajib diisi." }]}
                      >
                        <Input
                          prefix={<UserOutlined />}
                          placeholder="Nama lengkap pengguna"
                        />
                      </Form.Item>

                      <Form.Item
                        label="NIP (Username Login)"
                        name="nip"
                        rules={[{ required: true, message: "NIP wajib diisi." }]}
                      >
                        <Input 
                          placeholder="NIP / Akun Login" 
                          disabled={!!editingUser || !!selectedEmployeeId} 
                        />
                      </Form.Item>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 16,
                      }}
                    >
                      <Form.Item label="Email" name="email">
                        <Input type="email" placeholder="nama@instansi.go.id" />
                      </Form.Item>
                      <Form.Item label="Nomor WhatsApp" name="phone_number">
                        <Input placeholder="Contoh: +62812xxxx" />
                      </Form.Item>
                    </div>

                    <Divider dashed orientation="left">
                      <Typography.Text
                        type="secondary"
                        style={{ fontSize: 13 }}
                      >
                        <KeyOutlined /> Keamanan
                      </Typography.Text>
                    </Divider>

                    <Form.Item
                      label="Kata Sandi Baru"
                      name="password"
                      rules={[
                        { min: 8, message: "Kata sandi minimal 8 karakter." },
                      ]}
                      extra={
                        editingUser
                          ? "Kosongkan jika tidak ingin mengubah kata sandi."
                          : "Jika kosong, password default akan digunakan."
                      }
                    >
                      <Input.Password placeholder="Minimal 8 karakter" />
                    </Form.Item>

                    {selectedEmployee && (
                      <Alert
                        message={`Info Pegawai: ${selectedEmployee.name}`}
                        description={
                          <Space direction="vertical" size={0}>
                            <Typography.Text type="secondary">
                              NIP: {selectedEmployee.nip}
                            </Typography.Text>
                            <Typography.Text type="secondary">
                              {selectedEmployee.fungsi_bidang}
                            </Typography.Text>
                          </Space>
                        }
                        type="success"
                        showIcon
                        style={{ marginTop: 8 }}
                      />
                    )}
                  </Space>
                ),
              },
              {
                key: "permissions",
                label: (
                  <span>
                    <SafetyCertificateOutlined /> Hak Akses Modul
                  </span>
                ),
                children: (
                  <div style={{ paddingTop: 16 }}>
                    <Alert
                      type="info"
                      showIcon
                      icon={<InfoCircleOutlined />}
                      message="Pengaturan Akses Granular"
                      description="Tentukan hak akses spesifik untuk setiap modul. Peran 'Operator' dapat mengelola data, sedangkan 'Validator' dapat menyetujui/memvalidasi."
                      style={{ marginBottom: 24 }}
                    />

                    <Collapse
                      defaultActiveKey={moduleGroupState.map((g) => g.key)}
                      ghost
                      expandIconPosition="end"
                      items={moduleGroupState.map((group) => ({
                        key: group.key,
                        label: (
                          <Space>
                            <Typography.Text strong>
                              {group.title}
                            </Typography.Text>
                            <Badge
                              count={
                                group.entries.filter(
                                  (e) =>
                                    permissionDraft[e.id]?.is_operator ||
                                    permissionDraft[e.id]?.is_validator,
                                ).length
                              }
                              style={{ backgroundColor: "#52c41a" }}
                            />
                          </Space>
                        ),
                        children: (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 12,
                            }}
                          >
                            {/* Header Row for Select All - Optional, keeping it simple for now with individual toggles */}
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "2fr 1fr 1fr",
                                gap: 16,
                                padding: "8px 0",
                                borderBottom: "1px solid #f0f0f0",
                              }}
                            >
                              <Typography.Text
                                type="secondary"
                                style={{ fontSize: 12 }}
                              >
                                MODUL
                              </Typography.Text>
                              <Typography.Text
                                type="secondary"
                                style={{ fontSize: 12, textAlign: "center" }}
                              >
                                OPERATOR
                              </Typography.Text>
                              <Typography.Text
                                type="secondary"
                                style={{ fontSize: 12, textAlign: "center" }}
                              >
                                VALIDATOR
                              </Typography.Text>
                            </div>

                            {group.entries.map((entry) => {
                              const node = moduleEntries.find(
                                (e) => e.id === entry.id,
                              );
                              const level = node?.parent ? 1 : 0;
                              const isParent = !node?.parent;

                              return (
                                <div
                                  key={entry.id}
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "2fr 1fr 1fr",
                                    gap: 16,
                                    alignItems: "center",
                                    paddingLeft: level * 24,
                                    paddingTop: isParent ? 8 : 0,
                                    borderTop:
                                      isParent &&
                                        group.entries.indexOf(entry) !== 0
                                        ? "1px dashed #f0f0f0"
                                        : "none",
                                    marginTop:
                                      isParent &&
                                        group.entries.indexOf(entry) !== 0
                                        ? 8
                                        : 0,
                                  }}
                                >
                                  <div>
                                    <Typography.Text
                                      strong={isParent}
                                      style={{
                                        color: isParent ? "#262626" : "#595959",
                                      }}
                                    >
                                      {entry.slug
                                        ? moduleIndex.get(entry.slug)?.name
                                        : (moduleIndex.get(entry.id)?.name ??
                                          entry.slug)}
                                    </Typography.Text>
                                    {isParent && (
                                      <div
                                        style={{
                                          fontSize: 11,
                                          color: "#bfbfbf",
                                          marginTop: -4,
                                        }}
                                      >
                                        Modul Utama
                                      </div>
                                    )}
                                  </div>
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "center",
                                    }}
                                  >
                                    <Switch
                                      size="small"
                                      checked={
                                        permissionDraft[entry.id]
                                          ?.is_operator ?? false
                                      }
                                      onChange={(checked) =>
                                        handlePermissionChange(
                                          entry.id,
                                          "is_operator",
                                          checked,
                                        )
                                      }
                                    />
                                  </div>
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "center",
                                    }}
                                  >
                                    <Switch
                                      size="small"
                                      checked={
                                        permissionDraft[entry.id]
                                          ?.is_validator ?? false
                                      }
                                      onChange={(checked) =>
                                        handlePermissionChange(
                                          entry.id,
                                          "is_validator",
                                          checked,
                                        )
                                      }
                                    />
                                  </div>
                                </div>
                              );
                            })}
                            {group.entries.length === 0 && (
                              <Typography.Text type="secondary" italic>
                                Tidak ada modul dalam grup ini.
                              </Typography.Text>
                            )}
                          </div>
                        ),
                      }))}
                    />
                  </div>
                ),
              },
            ]}
          />
        </Form>
      </Modal>
    </div>
  );
};

export default AdminUserManagement;
