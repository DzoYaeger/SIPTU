import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  App as AntdApp,
  Button,
  Card,
  Checkbox,
  Divider,
  Empty,
  Radio,
  Select,
  Space,
  Spin,
  Typography,
} from 'antd';
import { buildMessageAdapter } from '../utils/notify.js';
import { useAuth } from '../hooks/useAuth.js';

// const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

const roleOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'operator', label: 'Operator' },
  { value: 'validator', label: 'Validator' },
];

const AdminAccess = () => {
  const { apiFetch, user } = useAuth();
  const { message } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);
  const [modules, setModules] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [baseRole, setBaseRole] = useState('operator');
  const [permissionState, setPermissionState] = useState({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [modulesResponse, usersResponse] = await Promise.all([
        apiFetch("/admin/modules"),
        apiFetch("/admin/users"),
      ]);

      if (!modulesResponse.ok) {
        throw new Error('Tidak dapat memuat daftar modul.');
      }
      if (!usersResponse.ok) {
        throw new Error('Tidak dapat memuat daftar pengguna.');
      }

      const [modulesData, usersData] = await Promise.all([
        modulesResponse.json(),
        usersResponse.json(),
      ]);

      setModules(modulesData ?? []);
      setUsers(usersData ?? []);

      if (usersData?.length) {
        setSelectedUserId(usersData[0].id);
      }
    } catch (error) {
      console.error(error);
      notification.error({
        message: 'Gagal memuat data',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [apiFetch, notification]);

  useEffect(() => {
    if (user?.base_role === 'admin') {
      fetchData();
    }
  }, [fetchData, user]);

  useEffect(() => {
    if (!selectedUserId) return;
    const targetUser = users.find((item) => item.id === selectedUserId);
    if (!targetUser) return;

    setBaseRole(targetUser.base_role ?? 'operator');

    // Inisialisasi permission state dengan struktur baru
    const map = {};
    targetUser.module_permissions?.forEach((permission) => {
      const key = permission.module_id ?? permission.module_slug ?? permission.slug;
      if (!key) return;
      if (!map[key]) {
        map[key] = { is_operator: false, is_validator: false };
      }
      map[key].is_operator = permission.is_operator;
      map[key].is_validator = permission.is_validator;
    });
    setPermissionState(map);
  }, [selectedUserId, users]);

  const moduleEntries = useMemo(() => {
    const entries = [];
    const traverse = (node, parent = null) => {
      entries.push({ ...node, parent });
      (node.children ?? []).forEach((child) => traverse(child, node));
    };
    modules.forEach((module) => traverse(module));
    return entries;
  }, [modules]);

  const setPermission = (moduleId, role, value) => {
    setPermissionState((prev) => ({
      ...prev,
      [moduleId]: {
        is_operator: prev[moduleId]?.is_operator ?? false,
        is_validator: prev[moduleId]?.is_validator ?? false,
        [role]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!selectedUserId) return;
    setSaving(true);
    try {
      // Format payload sesuai dengan struktur baru
      const payload = {
        base_role: baseRole,
        permissions: Object.entries(permissionState)
          .map(([moduleId, roles]) => ({
            module_id: moduleId,
            module_slug: moduleId,
            is_operator: roles.is_operator ?? false,
            is_validator: roles.is_validator ?? false,
          }))
          .filter((entry) => entry.is_operator || entry.is_validator), // Hanya kirim permission yang aktif
      };

      const response = await apiFetch(`/admin/users/${selectedUserId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message ?? 'Gagal menyimpan pengaturan akses.');
      }

      notification.success({
        message: 'Akses tersimpan',
        description: 'Hak akses pengguna berhasil diperbarui.',
      });

      await fetchData();
    } catch (error) {
      console.error(error);
      notification.error({
        message: 'Gagal menyimpan',
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="module-section">
        <Spin />
      </div>
    );
  }

  if (!users.length) {
    return (
      <Card className="content-card" variant="borderless">
        <Empty description="Belum ada pengguna yang dapat diatur." />
      </Card>
    );
  }

  return (
    <div className="module-section">
      <Card className="content-card" variant="borderless">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Typography.Title level={4} className="module-title">
              Hak Akses Modul
            </Typography.Title>
            <Typography.Paragraph className="module-subtitle">
              Atur peran operator & validator per modul.
            </Typography.Paragraph>
          </div>

          <Space size={16} wrap className="admin-access-control">
            <div>
              <Typography.Text>Pilih Pengguna</Typography.Text>
              <Select
                showSearch
                optionFilterProp="label"
                style={{ minWidth: 240 }}
                value={selectedUserId}
                onChange={setSelectedUserId}
                options={users.map((item) => ({
                  value: item.id,
                  label: `${item.name} (${item.email})`,
                }))}
              />
            </div>
            <div>
              <Typography.Text>Peran Dasar</Typography.Text>
              <Radio.Group
                options={roleOptions}
                value={baseRole}
                onChange={(event) => setBaseRole(event.target.value)}
                optionType="button"
              />
            </div>
          </Space>

          <Divider style={{ margin: '8px 0 16px' }} />

          <div className="admin-module-grid">
            {moduleEntries.map((entry) => (
              <div key={entry.id} className={`admin-module-row ${entry.parent ? 'is-child' : 'is-parent'}`}>
                <div className="admin-module-info">
                  <Typography.Text strong={Boolean(entry.parent)}>{entry.name}</Typography.Text>
                  {!entry.parent && (
                    <Typography.Paragraph type="secondary" className="admin-module-desc">
                      Modul utama
                    </Typography.Paragraph>
                  )}
                </div>
                <div className="admin-module-actions">
                  <Checkbox
                    checked={permissionState[entry.id]?.is_operator ?? false}
                    onChange={(event) => setPermission(entry.id, 'is_operator', event.target.checked)}
                  >
                    Operator
                  </Checkbox>
                  <Checkbox
                    checked={permissionState[entry.id]?.is_validator ?? false}
                    onChange={(event) => setPermission(entry.id, 'is_validator', event.target.checked)}
                  >
                    Validator
                  </Checkbox>
                </div>
              </div>
            ))}
          </div>

          <div>
            <Button type="primary" onClick={handleSave} loading={saving}>
              Simpan Hak Akses
            </Button>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default AdminAccess;


