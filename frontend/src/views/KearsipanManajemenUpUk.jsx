import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  App as AntdApp,
  Button,
  Card,
  Select,
  Space,
  Spin,
  Table,
  Typography,
} from 'antd';
import { buildMessageAdapter } from '../utils/notify.js';
import { ReloadOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth.js';

// const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';
const FUNGSI_OPTIONS = [
  'Tata Usaha',
  'Pemeriksaan dan Sertifikasi',
  'Infokom',
  'Penindakan',
  'Pengujian',
];

const KearsipanManajemenUpUk = () => {
  const { apiFetch } = useAuth();
  const { message } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);

  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [unitKeasipanId, setUnitKeasipanId] = useState(null);
  const [unitKeasipanIds, setUnitKeasipanIds] = useState([]);
  const [savingKey, setSavingKey] = useState(null);

  const employeeOptions = useMemo(() => {
    return employees.map((employee) => ({
      value: employee.id,
      label: employee.fungsi_bidang ? `${employee.nama} (${employee.fungsi_bidang})` : employee.nama,
      fungsiBidang: employee.fungsi_bidang ?? '',
    }));
  }, [employees]);

  const groupedOptions = useCallback((fungsiBidang) => {
    const matched = employeeOptions.filter((option) => option.fungsiBidang === fungsiBidang);
    const others = employeeOptions.filter((option) => option.fungsiBidang !== fungsiBidang);

    const groups = [];
    if (matched.length) {
      groups.push({ label: 'Pegawai Fungsi Ini', options: matched });
    }
    if (others.length) {
      groups.push({ label: 'Pegawai Lainnya', options: others });
    }

    return groups.length ? groups : [{ label: 'Seluruh Pegawai', options: employeeOptions }];
  }, [employeeOptions]);

  const fetchUnits = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/admin/archive-units');
      if (!response.ok) {
        throw new Error('Tidak dapat memuat data manajemen UP/UK.');
      }
      const payload = await response.json();
      setUnitKeasipanId(payload.unit_keasipan_employee_id ?? null);
      setUnitKeasipanIds(payload.unit_keasipan_employee_ids ?? []);
      setUnits((payload.units ?? []).map((unit) => ({
        id: unit.id,
        fungsiBidang: unit.fungsi_bidang,
        unitPengolahEmployeeId: unit.unit_pengolah_employee_id,
        unitPengolahEmployeeIds: unit.unit_pengolah_employee_ids ?? [],
      })));
      setEmployees(payload.employees ?? []);
    } catch (error) {
      console.error(error);
      notification.error({
        message: 'Gagal memuat data UP/UK',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [apiFetch, notification]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);


  const handleUpdate = useCallback(async (unitId, body) => {
    setSavingKey(`${unitId}-${Object.keys(body)[0]}`);
    try {
      const response = await apiFetch(`/admin/archive-units/${unitId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message ?? 'Gagal menyimpan pengaturan UP/UK.');
      }
      const updated = await response.json();
      setUnits((prev) => prev.map((item) => (
        item.id === updated.id
          ? {
            ...item,
            fungsiBidang: updated.fungsi_bidang,
            unitPengolahEmployeeId: updated.unit_pengolah_employee_id,
            unitPengolahEmployeeIds: updated.unit_pengolah_employee_ids ?? [],
          }
          : item
      )));
      notification.success({
        message: 'Pengaturan tersimpan',
        description: `Fungsi ${updated.fungsi_bidang} berhasil diperbarui.`,
        placement: 'bottomRight',
      });
    } catch (error) {
      console.error(error);
      notification.error({
        message: 'Gagal menyimpan',
        description: error.message,
      });
    } finally {
      setSavingKey(null);
    }
  }, [apiFetch, notification]);

  const handleUpdateKearsipan = useCallback(async (employeeIds) => {
    setSavingKey('unit_keasipan');
    try {
      const response = await apiFetch('/admin/archive-units/keasipan', {
        method: 'PUT',
        body: JSON.stringify({
          unit_keasipan_employee_ids: employeeIds ?? [],
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message ?? 'Gagal menyimpan Unit Kearsipan.');
      }
      const result = await response.json();
      setUnitKeasipanId(result.unit_keasipan_employee_id ?? null);
      setUnitKeasipanIds(result.unit_keasipan_employee_ids ?? []);
      notification.success({
        message: 'Unit Kearsipan tersimpan',
        placement: 'bottomRight',
      });
    } catch (error) {
      console.error(error);
      notification.error({
        message: 'Gagal menyimpan',
        description: error.message,
      });
    } finally {
      setSavingKey(null);
    }
  }, [apiFetch, notification]);

  const columns = useMemo(() => [
    {
      title: 'Fungsi/Bidang',
      dataIndex: 'fungsiBidang',
      key: 'fungsiBidang',
      render: (value) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: 'Unit Pengolah',
      dataIndex: 'unitPengolahEmployeeId',
      key: 'unitPengolahEmployeeId',
      render: (value, record) => (
        <Select
          allowClear
          showSearch
          mode="multiple"
          placeholder="Pilih pegawai"
          value={(record.unitPengolahEmployeeIds ?? []).length ? record.unitPengolahEmployeeIds : undefined}
          options={groupedOptions(record.fungsiBidang)}
          optionFilterProp="label"
          style={{ minWidth: 240 }}
          loading={savingKey === `${record.id}-unit_pengolah_employee_ids`}
          onChange={(employeeId) => handleUpdate(record.id, {
            unit_pengolah_employee_ids: employeeId ?? [],
          })}
        />
      ),
    },
  ], [groupedOptions, handleUpdate, savingKey]);

  if (loading) {
    return (
      <div className="module-section">
        <Spin />
      </div>
    );
  }

  return (
    <div className="module-section">
      {/* Header */}
      <div className="module-toolbar">
        <div>
          <Typography.Title level={3} className="module-title">Manajemen UP/UK</Typography.Title>
          <Typography.Text className="module-subtitle">Tetapkan penanggung jawab Unit Pengolah &amp; Unit Kearsipan.</Typography.Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchUnits}>Muat Ulang</Button>
      </div>

      {/* Unit Kearsipan Card */}
      <Card variant="borderless" style={{ borderRadius: 10 }}>
        <div style={{ marginBottom: 4 }}>
          <Typography.Text strong style={{ fontSize: 15 }}>Unit Kearsipan Kantor</Typography.Text>
        </div>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          Pilih pegawai yang bertanggung jawab sebagai Unit Kearsipan utama kantor.
        </Typography.Text>
        <div style={{ marginTop: 12 }}>
          <Select
            allowClear
            showSearch
            mode="multiple"
            placeholder="Pilih pegawai..."
            value={unitKeasipanIds.length ? unitKeasipanIds : undefined}
            options={employeeOptions}
            optionFilterProp="label"
            style={{ width: '100%', maxWidth: 560 }}
            loading={savingKey === 'unit_keasipan'}
            onChange={(employeeIds) => handleUpdateKearsipan(employeeIds)}
          />
        </div>
      </Card>

      {/* Unit Pengolah Table */}
      <Card variant="borderless" style={{ borderRadius: 10 }}>
        <div style={{ marginBottom: 16 }}>
          <Typography.Text strong style={{ fontSize: 15 }}>Unit Pengolah per Fungsi/Bidang</Typography.Text>
          <div><Typography.Text type="secondary" style={{ fontSize: 13 }}>Tentukan pegawai pengelola arsip di setiap fungsi.</Typography.Text></div>
        </div>
        <Table
          rowKey="id"
          dataSource={FUNGSI_OPTIONS.map((fungsi) => (
            units.find((item) => item.fungsiBidang === fungsi) ?? {
              id: fungsi,
              fungsiBidang: fungsi,
              unitPengolahEmployeeId: null,
            }
          ))}
          columns={columns}
          pagination={false}
          size="middle"
        />
      </Card>
    </div>
  );
};

export default KearsipanManajemenUpUk;


