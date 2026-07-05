import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  App as AntdApp,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
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
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  FileTextOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth.js';
import useDebounce from '../hooks/useDebounce.js';

// const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

const formatCurrency = (value) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
}).format(value ?? 0);

const formatDateTime = (value) => {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    return value;
  }
};

const normalizeInvoice = (invoice) => ({
  id: invoice.id,
  key: invoice.id,
  ticketNo: invoice.ticket_no,
  invoiceNo: invoice.invoice_no,
  mak: invoice.mak,
  deskripsi: invoice.deskripsi,
  nilai: invoice.nilai,
  pajakPph: invoice.pajak_pph,
  status: invoice.status ?? 'pending',
  approvedAt: invoice.approved_at,
  approvedBy: invoice.approver?.name ?? null,
  approvedById: invoice.approved_by ?? null,
  createdAt: invoice.created_at,
});

const InvoiceBelanja = () => {
  const { apiFetch, hasRole, currentRole } = useAuth();
  const { modal, message } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);
  const [form] = Form.useForm();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('create');
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [budgetOptions, setBudgetOptions] = useState([]);
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState(null);
  const [dateRange, setDateRange] = useState(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange) {
        params.append('date_from', dateRange[0].format('YYYY-MM-DD'));
        params.append('date_to', dateRange[1].format('YYYY-MM-DD'));
      }
      if (debouncedSearchTerm) {
        params.append('search', debouncedSearchTerm);
      }
      if (statusFilter) {
        params.append('status', statusFilter);
      }
      const response = await apiFetch(`/purchase-invoices?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Gagal memuat data invoice belanja.');
      }
      const payload = await response.json();
      setData((payload ?? []).map(normalizeInvoice));
    } catch (error) {
      console.error(error);
      notification.error({
        message: 'Tidak dapat memuat data invoice',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [apiFetch, notification, dateRange, debouncedSearchTerm, statusFilter]);

  const fetchBudgets = useCallback(async () => {
    setBudgetLoading(true);
    try {
      const response = await apiFetch('/budgets');
      if (!response.ok) {
        throw new Error('Gagal memuat daftar anggaran.');
      }
      const payload = await response.json();
      const options = (payload ?? [])
        .filter((item) => item?.mak)
        .map((item) => {
          const mak = String(item.mak ?? '');
          return {
            value: mak,
            label: [mak, item.deskripsi].filter(Boolean).join(' - '),
          };
        });
      setBudgetOptions(options);
    } catch (error) {
      console.error(error);
      notification.error({
        message: 'Tidak dapat memuat data anggaran',
        description: error.message,
      });
    } finally {
      setBudgetLoading(false);
    }
  }, [apiFetch, notification]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const canApprove = useMemo(() => currentRole === 'admin' || hasRole('validator', 'keuangan'), [currentRole, hasRole]);

  const handleCreate = useCallback(() => {
    form.resetFields();
    setMode('create');
    setActiveInvoice(null);
    setOpen(true);
  }, [form]);

  const handleEdit = useCallback((record) => {
    if (record?.status !== 'pending') {
      notification.info({
        message: 'Invoice sudah dikunci',
        description: 'Invoice yang telah disetujui tidak dapat diedit.',
      });
      return;
    }

    setMode('edit');
    setActiveInvoice(record);
    form.setFieldsValue({
      invoiceNo: record.invoiceNo,
      mak: record.mak ? String(record.mak) : undefined,
      deskripsi: record.deskripsi,
      nilai: record.nilai,
      pajakPph: record.pajakPph,
    });
    setOpen(true);
  }, [form, notification]);

  const handleClose = useCallback(() => {
    if (saving) return;
    setOpen(false);
    setMode('create');
    setActiveInvoice(null);
    form.resetFields();
  }, [form, saving]);

  const persistInvoice = useCallback(async (values) => {
    setSaving(true);
    try {
      const payload = {
        invoice_no: values.invoiceNo?.trim() || null,
        mak: values.mak,
        deskripsi: values.deskripsi,
        nilai: Number(values.nilai ?? 0),
        pajak_pph: values.pajakPph === undefined || values.pajakPph === null || values.pajakPph === ''
          ? null
          : Number(values.pajakPph),
      };

      const endpoint = mode === 'create'
        ? '/purchase-invoices'
        : `/purchase-invoices/${activeInvoice?.id}`;

      const response = await apiFetch(endpoint, {
        method: mode === 'create' ? 'POST' : 'PUT',
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.message ?? 'Gagal menyimpan data invoice.');
      }

      const normalized = normalizeInvoice(body);
      setData((prev) => (
        mode === 'create'
          ? [normalized, ...prev]
          : prev.map((row) => (row.id === normalized.id ? normalized : row))
      ));

      notification.success({
        message: 'Data tersimpan',
        description: `Invoice ${normalized.invoiceNo ?? normalized.ticketNo} berhasil disimpan.`,
        placement: 'bottomRight',
      });
      handleClose();
    } catch (error) {
      console.error(error);
      notification.error({
        message: 'Gagal menyimpan invoice',
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  }, [activeInvoice?.id, apiFetch, handleClose, mode, notification]);

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      modal.confirm({
        title: mode === 'create' ? 'Simpan invoice belanja baru?' : 'Simpan perubahan invoice?',
        centered: true,
        okText: 'Simpan',
        cancelText: 'Batal',
        onOk: () => persistInvoice(values),
      });
    } catch (error) {
      if (error?.errorFields) {
        modal.warning({
          title: 'Data belum lengkap',
          content: 'Periksa kembali form isian sebelum menyimpan.',
        });
      }
    }
  }, [form, modal, mode, persistInvoice]);

  const handleDelete = useCallback((record) => {
    if (record?.status !== 'pending') {
      notification.info({
        message: 'Invoice sudah dikunci',
        description: 'Invoice yang telah disetujui tidak dapat dihapus.',
      });
      return;
    }

    modal.confirm({
      title: `Hapus invoice ${record.invoiceNo ?? record.ticketNo}?`,
      centered: true,
      okText: 'Hapus',
      okButtonProps: { danger: true },
      cancelText: 'Batal',
      onOk: async () => {
        try {
          const response = await apiFetch(`/purchase-invoices/${record.id}`, {
            method: 'DELETE',
          });
          const body = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(body?.message ?? 'Gagal menghapus invoice.');
          }
          setData((prev) => prev.filter((row) => row.id !== record.id));
          notification.success({
            message: 'Invoice dihapus',
            description: `${record.invoiceNo ?? record.ticketNo} berhasil dihapus.`,
            placement: 'bottomRight',
          });
        } catch (error) {
          console.error(error);
          notification.error({
            message: 'Gagal menghapus invoice',
            description: error.message,
          });
          throw error;
        }
      },
    });
  }, [apiFetch, modal, notification]);

  const handleApprove = useCallback((record) => {
    if (record?.status !== 'pending') {
      notification.info({
        message: 'Invoice sudah diverifikasi',
        description: 'Hanya invoice berstatus pending yang dapat disetujui.',
      });
      return;
    }

    modal.confirm({
      title: `Setujui invoice ${record.invoiceNo ?? record.ticketNo}?`,
      centered: true,
      okText: 'Setujui',
      cancelText: 'Batal',
      onOk: async () => {
        setApprovingId(record.id);
        try {
          const response = await apiFetch(`/purchase-invoices/${record.id}/approve`, {
            method: 'POST',
          });
          const body = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(body?.message ?? 'Gagal menyetujui invoice.');
          }

          notification.success({
            message: 'Invoice disetujui',
            description: `${record.invoiceNo ?? record.ticketNo} telah disetujui.`,
            placement: 'bottomRight',
          });
          await fetchInvoices();
        } catch (error) {
          console.error(error);
          notification.error({
            message: 'Gagal menyetujui invoice',
            description: error.message,
          });
          throw error;
        } finally {
          setApprovingId(null);
        }
      },
    });
  }, [apiFetch, fetchInvoices, modal, notification]);

  const columns = useMemo(() => [
    {
      title: 'No Ticket',
      dataIndex: 'ticketNo',
      key: 'ticketNo',
      sorter: (a, b) => a.ticketNo.localeCompare(b.ticketNo),
      render: (value) => <Typography.Text code>{value}</Typography.Text>,
    },
    {
      title: 'No Invoice',
      dataIndex: 'invoiceNo',
      key: 'invoiceNo',
      sorter: (a, b) => (a.invoiceNo ?? '').localeCompare(b.invoiceNo ?? ''),
      render: (value) => (
        value ? <Typography.Text strong>{value}</Typography.Text> : <Tag color="orange">Belum tersedia</Tag>
      ),
    },
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
      title: 'Nilai Belanja',
      dataIndex: 'nilai',
      key: 'nilai',
      align: 'right',
      sorter: (a, b) => a.nilai - b.nilai,
      render: (value) => formatCurrency(value),
    },
    {
      title: 'Pajak PPh 22/23',
      dataIndex: 'pajakPph',
      key: 'pajakPph',
      align: 'right',
      sorter: (a, b) => (a.pajakPph ?? 0) - (b.pajakPph ?? 0),
      render: (value) => value ? formatCurrency(value) : <Tag color="blue">Tidak ada</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      sorter: (a, b) => a.status.localeCompare(b.status),
      render: (_, record) => {
        if (record.status === 'approved') {
          const details = [];
          if (record.approvedBy) {
            details.push(`Oleh ${record.approvedBy}`);
          }
          if (record.approvedAt) {
            details.push(formatDateTime(record.approvedAt));
          }

          return (
            <Space direction="vertical" size={2}>
              <Tag color="green">Disetujui</Tag>
              {details.length > 0 && (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {details.join(' - ')}
                </Typography.Text>
              )}
            </Space>
          );
        }

        return (
          <Space direction="vertical" size={2}>
            <Tag color="gold">Menunggu Verifikasi</Tag>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Menunggu persetujuan validator.
            </Typography.Text>
          </Space>
        );
      },
    },
    {
      title: 'Aksi',
      key: 'aksi',
      width: 80,
      align: 'center',
      render: (_, record) => {
        const items = [];
        if (canApprove && record.status === 'pending') {
          items.push({
            key: 'approve',
            label: 'Setujui',
            icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
            onClick: () => handleApprove(record)
          });
        }
        items.push({
          key: 'edit',
          label: 'Edit',
          disabled: record.status !== 'pending',
          icon: <EditOutlined style={record.status === 'pending' ? { color: '#faad14' } : {}} />,
          onClick: () => handleEdit(record)
        });
        items.push({
          key: 'delete',
          label: 'Hapus',
          danger: true,
          disabled: record.status !== 'pending',
          icon: <DeleteOutlined />,
          onClick: () => handleDelete(record)
        });

        return (
          <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
            <Button type="text" icon={<MoreOutlined />} loading={approvingId === record.id} />
          </Dropdown>
        );
      },
    },
  ], [approvingId, canApprove, handleApprove, handleDelete, handleEdit]);

  return (
    <div className="module-section">
      <div className="module-toolbar">
        <div>
          <Typography.Title level={4} className="module-title">
            Invoice Belanja
          </Typography.Title>
          <Typography.Paragraph className="module-subtitle">
            Catat dan verifikasi invoice belanja dengan penomoran otomatis.
          </Typography.Paragraph>
        </div>
        <Space size="small">
          <Input
            allowClear
            placeholder="Cari invoice..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            style={{ width: 220 }}
          />
          <Select
            allowClear
            value={statusFilter}
            style={{ width: 160 }}
            onChange={setStatusFilter}
            options={[
              { value: 'pending', label: 'Menunggu Verifikasi' },
              { value: 'approved', label: 'Disetujui' },
            ]}
          />
          <DatePicker.RangePicker value={dateRange} onChange={setDateRange} />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Tambah Invoice
          </Button>
        </Space>
      </div>
      <div className="table-card">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          pagination={{ pageSize: 10, size: 'small' }}
          scroll={{ x: true }}
          size="small"
        />
        <div className="table-helper">
          <Tag icon={<FileTextOutlined />} color="blue">
            Tips
          </Tag>
          Kosongkan No Invoice bila ingin menggunakan penomoran otomatis sistem.
        </div>
      </div>
      <Modal
        open={open}
        title={mode === 'create' ? 'Tambah Invoice Belanja' : 'Edit Invoice Belanja'}
        onCancel={handleClose}
        onOk={handleSubmit}
        okText="Simpan"
        cancelText="Batal"
        centered
        destroyOnHidden
        confirmLoading={saving}
        width={560}
        className="invoice-modal"
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          className="module-form"
        >
          <Form.Item
            label="No Invoice"
            name="invoiceNo"
            tooltip="Kosongkan bila ingin menggunakan penomoran otomatis"
          >
            <Input placeholder="Contoh: 672845/INV/9/2500003" allowClear />
          </Form.Item>
          <Form.Item
            label="MAK"
            name="mak"
            rules={[{ required: true, message: 'MAK wajib diisi.' }]}
          >
            <Select
              showSearch
              allowClear
              placeholder="Pilih kode MAK"
              options={budgetOptions}
              loading={budgetLoading}
              optionFilterProp="label"
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
          <Form.Item
            label="Deskripsi Belanja"
            name="deskripsi"
            rules={[{ required: true, message: 'Deskripsi wajib diisi.' }]}
          >
            <Input.TextArea rows={3} placeholder="Ringkasan belanja" />
          </Form.Item>
          <Form.Item
            label="Total Belanja"
            name="nilai"
            rules={[{ required: true, message: 'Nilai belanja wajib diisi.' }]}
          >
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              formatter={(value) => (value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '')}
              parser={(value) => value ? value.replace(/\./g, '') : ''}
              placeholder="Contoh: 15000000"
            />
          </Form.Item>
          <Form.Item
            label="Pajak PPh 22/23"
            name="pajakPph"
          >
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              formatter={(value) => (value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '')}
              parser={(value) => value ? value.replace(/\./g, '') : ''}
              placeholder="Isi jika ada potongan pajak"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default InvoiceBelanja;



