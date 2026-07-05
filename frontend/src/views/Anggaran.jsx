import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import useDebounce from '../hooks/useDebounce.js';
import dayjs from 'dayjs';
import {
  App as AntdApp,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  Dropdown,
} from 'antd';
import { buildMessageAdapter } from '../utils/notify.js';
import {
  DeleteOutlined,
  EditOutlined,
  FileAddOutlined,
  HistoryOutlined,
  ReloadOutlined,
  MoreOutlined,
} from '@ant-design/icons';

const formatCurrency = (value) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
}).format(value ?? 0);

// const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

const Anggaran = () => {
  const { apiFetch, hasRole, currentRole } = useAuth();
  const { modal, message } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [openHistory, setOpenHistory] = useState(false);
  const [mode, setMode] = useState('create');
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [form] = Form.useForm();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Cek apakah user memiliki role validator untuk modul keuangan
  const isValidator = useMemo(() => hasRole('validator', 'keuangan'), [hasRole]);
  const isOperator = useMemo(() => hasRole('operator', 'keuangan'), [hasRole]);

  const mapResponse = useCallback((items) => (
    (items ?? []).map((item) => ({
      ...item,
      key: item.id ?? item.mak,
      history: (item.history ?? []).map((historyItem) => ({
        ...historyItem,
        key: historyItem.id ?? `${item.id}-${historyItem.tanggal}`,
      })),
    }))
  ), []);

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearchTerm) {
        params.append('search', debouncedSearchTerm);
      }
      const response = await apiFetch(`/budgets?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Gagal memuat data anggaran.');
      }
      const data = await response.json();
      setBudgets(mapResponse(data));
    } catch (err) {
      console.error(err);
      message.error(err.message ?? 'Terjadi kesalahan saat mengambil data anggaran.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, mapResponse, message, debouncedSearchTerm]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const columns = useMemo(() => {
    const baseColumns = [
      {
        title: 'MAK',
        dataIndex: 'mak',
        key: 'mak',
        sorter: (a, b) => a.mak.localeCompare(b.mak),
        render: (value) => <Typography.Text code>{value}</Typography.Text>,
      },
      {
        title: 'Deskripsi',
        dataIndex: 'deskripsi',
        key: 'deskripsi',
        sorter: (a, b) => a.deskripsi.localeCompare(b.deskripsi),
      },
      {
        title: 'Anggaran',
        dataIndex: 'anggaran',
        key: 'anggaran',
        align: 'right',
        sorter: (a, b) => a.anggaran - b.anggaran,
        render: (value) => <Typography.Text strong>{formatCurrency(value)}</Typography.Text>,
      },
    ];

    // Hanya tampilkan kolom aksi jika user adalah validator atau admin
    if (isValidator || currentRole === 'admin') {
      baseColumns.push({
        title: 'Aksi',
        key: 'aksi',
        width: 80,
        align: 'center',
        render: (_, record) => {
          const items = [
            {
              key: 'edit',
              label: 'Edit Data',
              icon: <EditOutlined style={{ color: '#faad14' }} />,
              onClick: () => handleEdit(record)
            },
            {
              key: 'delete',
              label: 'Hapus',
              danger: true,
              icon: <DeleteOutlined />,
              onClick: () => handleDelete(record)
            },
            {
              key: 'history',
              label: 'Riwayat Revisi',
              icon: <HistoryOutlined style={{ color: '#1890ff' }} />,
              onClick: () => handleHistory(record)
            }
          ];
          return (
            <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
              <Button type="text" icon={<MoreOutlined />} />
            </Dropdown>
          );
        }
      });
    } else if (isOperator) {
      // Untuk operator, hanya tampilkan tombol riwayat revisi
      baseColumns.push({
        title: 'Aksi',
        key: 'aksi',
        width: 80,
        align: 'center',
        render: (_, record) => {
          const items = [
            {
              key: 'history',
              label: 'Riwayat Revisi',
              icon: <HistoryOutlined style={{ color: '#1890ff' }} />,
              onClick: () => handleHistory(record)
            }
          ];
          return (
            <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
              <Button type="text" icon={<MoreOutlined />} />
            </Dropdown>
          );
        }
      });
    }

    return baseColumns;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgets, isValidator, isOperator, currentRole]);

  const handleAdd = () => {
    // Hanya validator atau admin yang bisa menambah data
    if (!isValidator && currentRole !== 'admin') {
      message.warning('Hanya validator yang dapat menambah data anggaran.');
      return;
    }

    setMode('create');
    setSelectedBudget(null);
    form.resetFields();
    setOpenForm(true);
  };

  const handleEdit = (budget) => {
    // Hanya validator atau admin yang bisa mengedit data
    if (!isValidator && currentRole !== 'admin') {
      message.warning('Hanya validator yang dapat mengedit data anggaran.');
      return;
    }

    setMode('edit');
    setSelectedBudget(budget);
    form.setFieldsValue({
      mak: budget.mak,
      deskripsi: budget.deskripsi,
      anggaran: budget.anggaran,
      catatan: '',
    });
    setOpenForm(true);
  };

  const handleDelete = (budget) => {
    // Hanya validator atau admin yang bisa menghapus data
    if (!isValidator && currentRole !== 'admin') {
      message.warning('Hanya validator yang dapat menghapus data anggaran.');
      return;
    }

    modal.confirm({
      title: `Hapus MAK ${budget.mak}?`,
      centered: true,
      okText: 'Hapus',
      okButtonProps: { danger: true },
      cancelText: 'Batal',
      onOk: async () => {
        try {
          const response = await apiFetch(`/budgets/${budget.id}`, {
            method: 'DELETE',
          });
          if (!response.ok) {
            throw new Error('Tidak dapat menghapus data anggaran.');
          }
          notification.success({
            message: 'Data dihapus',
            description: `MAK ${budget.mak} berhasil dihapus dari daftar anggaran.`,
            placement: 'bottomRight',
            });
          await fetchBudgets();
        } catch (err) {
          console.error(err);
          message.error(err.message ?? 'Terjadi kesalahan saat menghapus data.');
        }
      },
    });
  };

  const handleHistory = (budget) => {
    const latestBudget = budgets.find((item) => item.id === budget.id) ?? budget;
    setSelectedBudget(latestBudget);
    setOpenHistory(true);
  };

  const handleSubmit = async () => {
    // Hanya validator atau admin yang bisa submit data
    if (!isValidator && currentRole !== 'admin') {
      message.warning('Hanya validator yang dapat menyimpan data anggaran.');
      return;
    }

    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = {
        mak: values.mak,
        deskripsi: values.deskripsi,
        anggaran: Number(values.anggaran ?? 0),
        catatan: values.catatan ?? undefined,
      };

      const endpoint = mode === 'edit'
        ? `/budgets/${selectedBudget?.id}`
        : `/budgets`;
      const method = mode === 'edit' ? 'PUT' : 'POST';

      const response = await apiFetch(endpoint, {
        method,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message ?? 'Tidak dapat menyimpan data anggaran.');
      }

      notification.success({
        message: 'Data tersimpan',
        description: 'Informasi anggaran berhasil diperbarui.',
        placement: 'bottomRight',
      });
      setOpenForm(false);
      await fetchBudgets();
    } catch (err) {
      if (err.errorFields) {
        modal.warning({
          title: 'Data belum lengkap',
          content: 'Pastikan seluruh field telah diisi dengan benar.',
        });
      } else {
        console.error(err);
        message.error(err.message ?? 'Terjadi kesalahan saat menyimpan data anggaran.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const historyContent = useMemo(() => {
    if (!selectedBudget?.history?.length) {
      return <Tag color="default">Belum ada riwayat revisi</Tag>;
    }

    return (
      <div className="history-list">
        {selectedBudget.history.map((item) => (
          <div key={item.key} className="history-card">
            <Typography.Text strong>
              {dayjs(item.tanggal).format('DD MMM YYYY')}
            </Typography.Text>
            <Typography.Paragraph className="history-card__value">
              Nilai anggaran: {formatCurrency(item.anggaran)}
            </Typography.Paragraph>
            <Typography.Paragraph className="history-card__note">
              {item.catatan}
            </Typography.Paragraph>
          </div>
        ))}
      </div>
    );
  }, [selectedBudget]);

  return (
    <div className="module-section">
      <div className="module-toolbar">
        <div>
          <Typography.Title level={4} className="module-title">
            Anggaran MAK
          </Typography.Title>
          <Typography.Paragraph className="module-subtitle">
            Kelola alokasi dan riwayat revisi anggaran.
          </Typography.Paragraph>
        </div>
        <Space size="small">
          <Input
            allowClear
            placeholder="Cari MAK atau deskripsi..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            style={{ width: 240 }}
          />
          {/* Hanya tampilkan tombol tambah untuk validator atau admin */}
          {(isValidator || currentRole === 'admin') && (
            <Button type="primary" icon={<FileAddOutlined />} onClick={handleAdd}>
              Tambah Data
            </Button>
          )}
        </Space>
      </div>
      <div className="table-card">
        <Table
          rowKey={(row) => row.key}
          columns={columns}
          dataSource={budgets}
          pagination={{ pageSize: 8, size: 'small' }}
          scroll={{ x: true }}
          size="small"
          loading={loading}
        />
        <div className="table-helper">
          <Tag color="geekblue">Tip</Tag>
          Catat perubahan besar melalui tombol riwayat revisi untuk audit cepat.
        </div>
      </div>

      <Modal
        open={openForm}
        title={mode === 'create' ? 'Tambah Data Anggaran' : `Edit Anggaran ${selectedBudget?.mak ?? ''}`}
        onCancel={() => setOpenForm(false)}
        onOk={handleSubmit}
        okText="Simpan"
        cancelText="Batal"
        centered
        destroyOnHidden
        width={520}
        confirmLoading={submitting}
      >
        <Form
          layout="vertical"
          form={form}
          requiredMark={false}
          className="module-form"
        >
          <Form.Item
            label="Kode MAK"
            name="mak"
            rules={[{ required: true, message: 'Kode MAK wajib diisi.' }]}
          >
            <Input placeholder="Contoh: 524119" maxLength={30} />
          </Form.Item>
          <Form.Item
            label="Deskripsi"
            name="deskripsi"
            rules={[{ required: true, message: 'Deskripsi anggaran wajib diisi.' }]}
          >
            <Input.TextArea
              placeholder="Tuliskan deskripsi singkat anggaran"
              autoSize={{ minRows: 2, maxRows: 4 }}
            />
          </Form.Item>
          <Form.Item
            label="Nilai Anggaran"
            name="anggaran"
            rules={[{ required: true, message: 'Nilai anggaran wajib diisi.' }]}
          >
            <InputNumber
              min={0}
              step={1_000_000}
              style={{ width: '100%' }}
              formatter={(value) => (value ? formatCurrency(Number(value.toString().replace(/[^0-9-]/g, ''))) : '')}
              parser={(value) => (value ? Number(value.replace(/[^0-9-]/g, '')) : 0)}
              placeholder="Masukkan nilai anggaran"
            />
          </Form.Item>
          <Form.Item label="Catatan" name="catatan">
            <Input.TextArea
              placeholder="Opsional: catatan singkat perubahan"
              autoSize={{ minRows: 2, maxRows: 3 }}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={openHistory}
        title={selectedBudget ? `Riwayat Revisi - ${selectedBudget.mak}` : 'Riwayat Revisi'}
        footer={null}
        onCancel={() => setOpenHistory(false)}
        centered
        width={520}
        destroyOnHidden
      >
        {historyContent}
      </Modal>
    </div>
  );
};

export default Anggaran;



