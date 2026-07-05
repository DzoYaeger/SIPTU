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
  Radio,
  Dropdown,
} from 'antd';
import { buildMessageAdapter } from '../utils/notify.js';
import {
  PlusOutlined,
  FileTextOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth.js';
import dayjs from 'dayjs';

// const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

const formatCurrency = (value) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
}).format(value ?? 0);

const formatDateTime = (value) => {
  if (!value) return null;
  try {
    return dayjs(value).format('DD MMM YYYY HH:mm');
  } catch (error) {
    return value;
  }
};

const normalizeRevisionTicket = (ticket) => ({
  id: ticket.id,
  key: ticket.id,
  ticketNo: ticket.ticket_no,
  tanggalTicket: ticket.tanggal_ticket,
  status: ticket.status,
  catatan: ticket.catatan,
  adjustments: ticket.adjustments || [],
  tanggalDiproses: ticket.tanggal_diproses,
  tanggalSelesai: ticket.tanggal_selesai,
});

const PermintaanRevisi = () => {
  const { apiFetch, hasRole, currentRole } = useAuth();
  const { modal, message } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);
  const [form] = Form.useForm();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('create');
  const [activeTicket, setActiveTicket] = useState(null);
  const [budgetOptions, setBudgetOptions] = useState([]);
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [adjustments, setAdjustments] = useState([]);

  // State for the detail modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTicket, setDetailTicket] = useState(null);

  const { totalInitialBudgetForTicket, totalRevisedBudgetForTicket } = useMemo(() => {
    let initialTotal = 0;
    let revisedTotal = 0;
    const budgetMap = new Map(); // To store current budget for each MAK

    // Initialize budgetMap with current anggaran for each MAK in adjustments
    adjustments.forEach(adj => {
      if (!budgetMap.has(adj.mak)) {
        const budget = budgetOptions.find(opt => opt.value === adj.mak);
        if (budget) {
          budgetMap.set(adj.mak, budget.anggaran);
        }
      }
    });

    // Calculate initial total
    budgetMap.forEach(anggaran => {
      initialTotal += anggaran;
    });

    // Calculate revised total by applying adjustments
    let tempRevisedMap = new Map(budgetMap); // Copy to apply adjustments
    adjustments.forEach(adj => {
      let currentMakBudget = tempRevisedMap.get(adj.mak) || 0;
      if (adj.tipe === 'Tambah Anggaran') {
        currentMakBudget += adj.nilai;
      } else if (adj.tipe === 'Kurang Anggaran') {
        currentMakBudget -= adj.nilai;
      }
      tempRevisedMap.set(adj.mak, currentMakBudget);
    });

    tempRevisedMap.forEach(anggaran => {
      revisedTotal += anggaran;
    });

    return { totalInitialBudgetForTicket: initialTotal, totalRevisedBudgetForTicket: revisedTotal };
  }, [adjustments, budgetOptions]);

  const fetchRevisionTickets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/revision-tickets');
      if (!response.ok) {
        throw new Error('Gagal memuat data permintaan revisi.');
      }
      const payload = await response.json();
      setData((payload ?? []).map(normalizeRevisionTicket));
    } catch (error) {
      console.error(error);
      notification.error({
        message: 'Tidak dapat memuat data permintaan revisi',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [apiFetch, notification]);

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
          const deskripsi = item.deskripsi ?? '';
          const truncatedDeskripsi = deskripsi.length > 30 ? `${deskripsi.substring(0, 27)}...` : deskripsi;
          return {
            value: mak,
            label: [mak, truncatedDeskripsi].filter(Boolean).join(' - '),
            originalDeskripsi: deskripsi, // Store original deskripsi
            anggaran: item.anggaran, // Store current budget for calculation
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
    fetchRevisionTickets();
    fetchBudgets();
  }, [fetchRevisionTickets, fetchBudgets]);

  const handleCreateTicket = useCallback(() => {
    form.resetFields();
    setAdjustments([]);
    setMode('create');
    setActiveTicket(null);
    setOpen(true);
  }, [form]);

  const handleEditTicket = useCallback((record) => {
    if (record?.status !== 'Menunggu') {
      notification.info({
        message: 'Tiket sudah dikunci',
        description: 'Tiket yang telah diproses tidak dapat diedit.',
      });
      return;
    }

    setMode('edit');
    setActiveTicket(record);
    form.setFieldsValue({
      catatan: record.catatan,
    });
    setAdjustments(record.adjustments.map(adj => ({ ...adj, key: adj.id || Math.random() })));
    setOpen(true);
  }, [form, notification]);

  const handleCloseTicketModal = useCallback(() => {
    if (saving) return;
    setOpen(false);
    setMode('create');
    setActiveTicket(null);
    form.resetFields();
    setAdjustments([]);
  }, [form, saving]);

  const handleDetailTicket = useCallback((record) => {
    setDetailTicket(record);
    setDetailOpen(true);
  }, []);

  const handleCloseDetailModal = useCallback(() => {
    setDetailOpen(false);
    setDetailTicket(null);
  }, []);

  const persistRevisionTicket = useCallback(async (values) => {
    setSaving(true);
    try {
      if (adjustments.length < 2) {
        throw new Error('Permintaan revisi harus memiliki minimal satu penambahan dan satu pengurangan.');
      }

      const totalAdd = adjustments.filter(adj => adj.tipe === 'Tambah Anggaran').reduce((sum, adj) => sum + adj.nilai, 0);
      const totalReduce = adjustments.filter(adj => adj.tipe === 'Kurang Anggaran').reduce((sum, adj) => sum + adj.nilai, 0);

      if (totalAdd !== totalReduce) {
        throw new Error('Total penambahan harus sama dengan total pengurangan.');
      }

      const payload = {
        catatan: values.catatan,
        adjustments: adjustments.map(({ key, ...rest }) => rest), // Remove key before sending
      };

      const endpoint = mode === 'create'
        ? '/revision-tickets'
        : `/revision-tickets/${activeTicket?.id}`;

      const response = await apiFetch(endpoint, {
        method: mode === 'create' ? 'POST' : 'PUT',
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.message ?? 'Gagal menyimpan data permintaan revisi.');
      }

      notification.success({
        message: 'Data tersimpan',
        description: `Permintaan revisi ${body.ticket_no} berhasil disimpan.`,
        placement: 'bottomRight',
      });
      handleCloseTicketModal();
      fetchRevisionTickets();
    } catch (error) {
      console.error(error);
      notification.error({
        message: 'Gagal menyimpan permintaan revisi',
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  }, [activeTicket?.id, apiFetch, handleCloseTicketModal, mode, notification, adjustments, fetchRevisionTickets]);

  const handleSubmitTicket = useCallback(async () => {
    try {
      const values = await form.validateFields();
      modal.confirm({
        title: mode === 'create' ? 'Simpan permintaan revisi baru?' : 'Simpan perubahan permintaan revisi?',
        centered: true,
        okText: 'Simpan',
        cancelText: 'Batal',
        onOk: () => persistRevisionTicket(values),
      });
    } catch (error) {
      if (error?.errorFields) {
        modal.warning({
          title: 'Data belum lengkap',
          content: 'Periksa kembali form isian sebelum menyimpan.',
        });
      }
    }
  }, [form, modal, mode, persistRevisionTicket]);

  const [approvingId, setApprovingId] = useState(null); // State to show loading on the button

  const handleApproveTicket = useCallback((record) => {
    if (record?.status !== 'Menunggu') {
      notification.info({
        message: 'Tiket sudah diproses',
        description: 'Hanya tiket berstatus Menunggu yang dapat disetujui.',
      });
      return;
    }

    modal.confirm({
      title: `Setujui permintaan revisi ${record.ticketNo}?`,
      centered: true,
      okText: 'Setujui',
      cancelText: 'Batal',
      onOk: async () => {
        setApprovingId(record.id);
        try {
          const response = await apiFetch(`/revision-tickets/${record.id}/approve`, {
            method: 'POST',
          });
          const body = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(body?.message ?? 'Gagal menyetujui permintaan revisi.');
          }

          notification.success({
            message: 'Permintaan revisi disetujui',
            description: `${record.ticketNo} telah disetujui.`,
            placement: 'bottomRight',
          });
          await fetchRevisionTickets(); // Refresh data
        } catch (error) {
          console.error(error);
          notification.error({
            message: 'Gagal menyetujui permintaan revisi',
            description: error.message,
          });
          throw error;
        } finally {
          setApprovingId(null);
        }
      },
    });
  }, [apiFetch, fetchRevisionTickets, modal, notification]);

  const handleDeleteTicket = useCallback((record) => {
    if (record?.status !== 'Menunggu') {
      notification.info({
        message: 'Tiket sudah dikunci',
        description: 'Tiket yang telah diproses tidak dapat dihapus.',
      });
      return;
    }

    modal.confirm({
      title: `Hapus permintaan revisi ${record.ticketNo}?`,
      centered: true,
      okText: 'Hapus',
      okButtonProps: { danger: true },
      cancelText: 'Batal',
      onOk: async () => {
        try {
          const response = await apiFetch(`/revision-tickets/${record.id}`, {
            method: 'DELETE',
          });
          const body = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(body?.message ?? 'Gagal menghapus permintaan revisi.');
          }
          notification.success({
            message: 'Permintaan revisi dihapus',
            description: `${record.ticketNo} berhasil dihapus.`,
            placement: 'bottomRight',
          });
          fetchRevisionTickets();
        } catch (error) {
          console.error(error);
          notification.error({
            message: 'Gagal menghapus permintaan revisi',
            description: error.message,
          });
          throw error;
        }
      },
    });
  }, [apiFetch, modal, notification, fetchRevisionTickets]);

  const handleDeleteAdjustment = useCallback((key) => {
    setAdjustments(prev => prev.filter(adj => adj.key !== key));
  }, []);

  const handleAddAdjustment = useCallback(() => {
    setAdjustments(prev => [
      ...prev,
      {
        key: Math.random(), // Unique key for the new row
        mak: undefined,
        tipe: undefined,
        nilai: undefined,
      },
    ]);
  }, []);

  const handleAdjustmentChange = useCallback((key, field, value) => {
    setAdjustments(prev =>
      prev.map(adj => (adj.key === key ? { ...adj, [field]: value } : adj))
    );
  }, []);

  const adjustmentColumns = useMemo(() => [
    {
      title: 'MAK',
      dataIndex: 'mak',
      key: 'mak',
      width: 150,
      render: (text, record) => {
        const selectedBudgetOption = budgetOptions.find(opt => opt.value === text);
        const fullMakLabel = selectedBudgetOption ? [selectedBudgetOption.value, selectedBudgetOption.originalDeskripsi].filter(Boolean).join(' - ') : text;
        return (
          <Tooltip title={fullMakLabel}>
            <Select
              showSearch
              allowClear
              placeholder="Pilih kode MAK"
              options={budgetOptions}
              loading={budgetLoading}
              optionFilterProp="label"
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              value={text}
              onChange={(value) => handleAdjustmentChange(record.key, 'mak', value)}
              style={{ width: '100%' }}
            />
          </Tooltip>
        );
      },
    },
    {
      title: 'Anggaran Awal',
      key: 'anggaranAwal',
      align: 'right',
      width: 120,
      render: (_, record) => {
        const budget = budgetOptions.find(opt => opt.value === record.mak);
        return formatCurrency(budget?.anggaran || 0);
      },
    },
    {
      title: 'Tipe',
      dataIndex: 'tipe',
      key: 'tipe',
      width: 100,
      render: (text, record) => (
        <Radio.Group
          value={text}
          onChange={(e) => handleAdjustmentChange(record.key, 'tipe', e.target.value)}
        >
          <Radio value="Tambah Anggaran">Tambah</Radio>
          <Radio value="Kurang Anggaran">Kurang</Radio>
        </Radio.Group>
      ),
    },
    {
      title: 'Nominal',
      dataIndex: 'nilai',
      key: 'nilai',
      align: 'right',
      width: 120,
      render: (text, record) => (
        <InputNumber
          min={1}
          style={{ width: '100%' }}
          formatter={(value) => (value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '')}
          parser={(value) => value ? value.replace(/\./g, '') : ''}
          value={text}
          onChange={(value) => handleAdjustmentChange(record.key, 'nilai', value)}
          placeholder="Nominal"
        />
      ),
    },
    {
      title: 'Anggaran Setelah Revisi',
      key: 'anggaranSetelahRevisi',
      align: 'right',
      width: 120,
      render: (_, record) => {
        const budget = budgetOptions.find(opt => opt.value === record.mak);
        const initialBudget = budget?.anggaran || 0;
        let revisedBudget = initialBudget;
        if (record.tipe === 'Tambah Anggaran') {
          revisedBudget += record.nilai || 0;
        } else if (record.tipe === 'Kurang Anggaran') {
          revisedBudget -= record.nilai || 0;
        }
        return formatCurrency(revisedBudget);
      },
    },
    {
      title: 'Aksi',
      key: 'aksi',
      width: 80,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Hapus Penyesuaian">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteAdjustment(record.key)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ], [budgetOptions, budgetLoading, handleAdjustmentChange, handleDeleteAdjustment]);

  const columns = useMemo(() => [
    {
      title: 'No Ticket',
      dataIndex: 'ticketNo',
      key: 'ticketNo',
      width: 120,
      sorter: (a, b) => a.ticketNo.localeCompare(b.ticketNo),
      render: (value) => <Typography.Text code>{value}</Typography.Text>,
    },
    {
      title: 'Tanggal Pengajuan',
      dataIndex: 'tanggalTicket',
      key: 'tanggalTicket',
      width: 180,
      sorter: (a, b) => dayjs(a.tanggalTicket).unix() - dayjs(b.tanggalTicket).unix(),
      render: (value) => formatDateTime(value),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      sorter: (a, b) => a.status.localeCompare(b.status),
      render: (_, record) => {
        let color = 'default';
        let text = record.status;
        if (record.status === 'Menunggu') {
          color = 'gold';
          text = 'Menunggu Verifikasi';
        } else if (record.status === 'Selesai') {
          color = 'green';
          text = 'Disetujui';
        } else if (record.status === 'Ditolak') {
          color = 'red';
          text = 'Ditolak';
        }
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: 'Aksi',
      key: 'aksi',
      width: 80,
      align: 'center',
      render: (_, record) => {
        const items = [
          {
            key: 'detail',
            label: 'Detail',
            icon: <EyeOutlined style={{ color: '#1890ff' }} />,
            onClick: () => handleDetailTicket(record)
          }
        ];
        if (record.status === 'Menunggu' && (currentRole === 'admin' || hasRole('validator', 'keuangan'))) {
          items.push({
            key: 'approve',
            label: 'Setujui',
            icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
            onClick: () => handleApproveTicket(record)
          });
        }
        if (record.status === 'Menunggu') {
          items.push({
            key: 'edit',
            label: 'Edit',
            icon: <EditOutlined style={{ color: '#faad14' }} />,
            onClick: () => handleEditTicket(record)
          });
          items.push({
            key: 'delete',
            label: 'Hapus',
            danger: true,
            icon: <DeleteOutlined />,
            onClick: () => handleDeleteTicket(record)
          });
        }

        return (
          <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
            <Button type="text" icon={<MoreOutlined />} loading={approvingId === record.id} />
          </Dropdown>
        );
      },
    },
  ], [handleDetailTicket, handleEditTicket, handleDeleteTicket, handleApproveTicket, approvingId, currentRole, hasRole]);

  return (
    <div className="module-section">
      <div className="module-toolbar">
        <div>
          <Typography.Title level={4} className="module-title">
            Revisi Anggaran
          </Typography.Title>
          <Typography.Paragraph className="module-subtitle">
            Ajukan dan lacak perubahan alokasi anggaran.
          </Typography.Paragraph>
        </div>
        <Space size="small">
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateTicket}>
            Tambah Permintaan Revisi
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
      </div>

      {/* Main Revision Ticket Modal */}
      <Modal
        open={open}
        title={mode === 'create' ? 'Tambah Permintaan Revisi' : 'Edit Permintaan Revisi'}
        onCancel={handleCloseTicketModal}
        onOk={handleSubmitTicket}
        okText="Ajukan Revisi"
        cancelText="Batal"
        centered
        destroyOnHidden
        confirmLoading={saving}
        width="90%" // Adjust width as needed
        style={{ top: 0, paddingBottom: 0 }}
        className="revision-ticket-modal"
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          className="module-form"
        >
          <Form.Item
            label="Catatan Revisi"
            name="catatan"
            rules={[{ required: true, message: 'Catatan revisi wajib diisi.' }]}
          >
            <Input.TextArea rows={3} placeholder="Jelaskan alasan revisi anggaran" />
          </Form.Item>

          <Typography.Title level={5}>Daftar Penyesuaian Anggaran</Typography.Title>
          <Button
            type="primary"
            size="large"
            onClick={handleAddAdjustment}
            block
            icon={<PlusOutlined />}
            style={{ marginBottom: 16 }}
          >
            Tambah Penyesuaian
          </Button>
          <Table
            dataSource={adjustments}
            columns={adjustmentColumns}
            pagination={false}
            size="small"
            rowKey="key"
            scroll={{ x: true }}
          />

          <Typography.Title level={5} style={{ marginTop: 16 }}>Ringkasan Anggaran</Typography.Title>
          <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
            <Typography.Text><b>Total Anggaran Awal:</b> {formatCurrency(totalInitialBudgetForTicket)}</Typography.Text>
            <Typography.Text><b>Total Anggaran Setelah Revisi:</b> {formatCurrency(totalRevisedBudgetForTicket)}</Typography.Text>
          </Space>
        </Form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        open={detailOpen}
        title="Detail Permintaan Revisi Anggaran"
        onCancel={handleCloseDetailModal}
        footer={null}
        centered
        destroyOnHidden
        width="90%"
        style={{ top: 0, paddingBottom: 0 }}
      >
        {detailTicket && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Typography.Text><b>No Ticket:</b> {detailTicket.ticketNo}</Typography.Text>
            <Typography.Text><b>Tanggal Pengajuan:</b> {formatDateTime(detailTicket.tanggalTicket)}</Typography.Text>
            <Typography.Text><b>Status:</b> <Tag color={detailTicket.status === 'Menunggu' ? 'gold' : detailTicket.status === 'Selesai' ? 'green' : 'red'}>{detailTicket.status}</Tag></Typography.Text>
            <Typography.Text><b>Catatan:</b> {detailTicket.catatan}</Typography.Text>
            {detailTicket.tanggalDiproses && <Typography.Text><b>Tanggal Diproses:</b> {formatDateTime(detailTicket.tanggalDiproses)}</Typography.Text>}
            {detailTicket.tanggalSelesai && <Typography.Text><b>Tanggal Selesai:</b> {formatDateTime(detailTicket.tanggalSelesai)}</Typography.Text>}

            <Typography.Title level={5} style={{ marginTop: 16 }}>Penyesuaian Anggaran</Typography.Title>
            <Table
              dataSource={detailTicket.adjustments}
              columns={adjustmentColumns.filter(col => col.key !== 'aksi')} // Exclude action column for detail view
              pagination={false}
              size="small"
              rowKey="id"
              scroll={{ x: true }}
            />
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default PermintaanRevisi;




