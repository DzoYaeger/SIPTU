import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  App as AntdApp,
  Button,
  Card,
  Col,
  Drawer,
  Empty,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
  Badge,
  Descriptions,
  Divider,
  QRCode // Ant Design has a QRCode component now in newer versions, falling back to icon if issue
} from 'antd';
import { buildMessageAdapter } from '../utils/notify.js';
import {
  AppstoreOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  UploadOutlined,
  SearchOutlined,
  FilterOutlined,
  BarcodeOutlined,
  LaptopOutlined,
  InboxOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
  QrcodeOutlined,
  DownloadOutlined,
  GoldOutlined
} from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth.js';
import StatisticCard from '../components/StatisticCard.jsx';

// const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

const statusOptions = [
  { value: 'tersedia', label: 'Tersedia', color: 'green', icon: <SafetyCertificateOutlined /> },
  { value: 'dipinjam', label: 'Dipinjam', color: 'orange', icon: <InboxOutlined /> },
  { value: 'rusak', label: 'Rusak', color: 'red', icon: <WarningOutlined /> },
  { value: 'hilang', label: 'Hilang', color: 'purple', icon: <WarningOutlined /> },
];

const normalizeAsset = (item) => ({
  id: item.id,
  key: item.id,
  kodeBmn: item.kode_bmn ?? item.asset_code,
  nup: item.nup ?? item.model,
  namaBarang: item.nama_barang ?? item.name,
  merekBarang: item.merek_barang ?? item.brand,
  status: item.status,
  description: item.description,
  category: item.category,
  location: item.location,
  updatedAt: item.updated_at
});

const BmnDataAsetTetap = () => {
  const { apiFetch, token } = useAuth();
  const baseUrl = (import.meta.env.VITE_API_URL || "https://siptu.bpompalopo.com/core_api/api").replace(/\/+$/, "");
  const { modal, message } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);
  const [form] = Form.useForm();

  // Data State
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Drawer/Modal State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [mode, setMode] = useState('create');
  const [activeAsset, setActiveAsset] = useState(null);
  const [saving, setSaving] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // --- API ---

  const requestJson = useCallback(async (url, options = {}) => {
    const response = await apiFetch(url, {
      headers: { Accept: 'application/json', ...(options.headers ?? {}) },
      ...options,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.message ?? 'Gagal memproses data.');
    return data;
  }, [apiFetch]);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await requestJson('/assets?pageSize=1000');
      const items = Array.isArray(payload) ? payload : payload?.data ?? [];
      setAssets(items.map(normalizeAsset));
    } catch (error) {
      notification.error({ message: 'Gagal memuat aset', description: error.message });
    } finally {
      setLoading(false);
    }
  }, [requestJson, notification]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  // --- Actions ---

  const handleCreate = () => {
    setMode('create');
    setActiveAsset(null);
    form.resetFields();
    setDrawerOpen(true);
  };

  const handleEdit = (record) => {
    setMode('edit');
    setActiveAsset(record);
    form.setFieldsValue({
      kodeBmn: record.kodeBmn,
      nup: record.nup,
      namaBarang: record.namaBarang,
      merekBarang: record.merekBarang,
      status: record.status,
      description: record.description,
      category: record.category, // Assuming it might not be in normalizeAsset yet, but we will add it
      location: record.location,
    });
    setDrawerOpen(true);
  };

  const handleSave = async (values) => {
    setSaving(true);
    try {
      const isRoom = values.category === 'Ruangan';
      const payload = {
        name: values.namaBarang,
        category: values.category || 'BMN', // Use category from form or default to BMN
        quantity: 1,
        location: values.location || 'BMN',
        status: values.status,
        asset_code: isRoom ? '-' : (values.kodeBmn || '-'),
        brand: values.merekBarang,
        model: isRoom ? '-' : (values.nup || '-'),
        description: values.description,
      };

      if (mode === 'create') {
        await requestJson('/assets', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
        notification.success({ message: 'Aset ditambahkan' });
      } else {
        await requestJson(`/assets/${activeAsset.id}`, { method: 'PUT', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
        notification.success({ message: 'Aset diperbarui' });
      }
      setDrawerOpen(false);
      fetchAssets();
    } catch (error) {
      notification.error({ message: 'Gagal menyimpan', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (record) => {
    modal.confirm({
      title: 'Hapus Aset?',
      content: `Yakin ingin menghapus ${record.namaBarang}?`,
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await requestJson(`/assets/${record.id}`, { method: 'DELETE' });
          notification.success({ message: 'Aset dihapus' });
          fetchAssets();
        } catch (error) {
          notification.error({ message: 'Gagal menghapus', description: error.message });
        }
      }
    });
  };

  // --- Stats & Filtering ---

  const stats = useMemo(() => {
    return {
      total: assets.length,
      available: assets.filter(a => a.status === 'tersedia').length,
      borrowed: assets.filter(a => a.status === 'dipinjam').length,
      damaged: assets.filter(a => a.status === 'rusak' || a.status === 'hilang').length,
    };
  }, [assets]);

  const filteredData = useMemo(() => {
    let data = assets;
    if (statusFilter !== 'all') {
      data = data.filter(a => a.status === statusFilter);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(a =>
        a.namaBarang?.toLowerCase().includes(term) ||
        a.kodeBmn?.includes(term) ||
        a.nup?.includes(term) ||
        a.merekBarang?.toLowerCase().includes(term)
      );
    }
    return data;
  }, [assets, searchTerm, statusFilter]);

  // --- Components ---

  const columns = [
    {
      title: 'Identitas Aset',
      key: 'identity',
      width: 250,
      render: (_, r) => (
        <Space align="start">
          <div style={{ width: 40, height: 40, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}>
            <GoldOutlined style={{ fontSize: 20, color: '#faad14' }} />
          </div>
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{r.namaBarang}</Typography.Text>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>
              {r.merekBarang}
            </div>
          </Space>
        </Space>
      )
    },
    {
      title: 'Kode BMN & NUP',
      key: 'kodeBmn',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          {r.category === 'Ruangan' ? (
             <Tag color="purple">Ruangan</Tag>
          ) : (
            <>
               <Typography.Text copyable code>{r.kodeBmn}</Typography.Text>
               <Typography.Text type="secondary" style={{ fontSize: 12 }}>NUP: {r.nup}</Typography.Text>
            </>
          )}
        </Space>
      )
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, r) => {
        const s = statusOptions.find(o => o.value === r.status) || statusOptions[0];
        return <Tag color={s.color} icon={s.icon}>{s.label}</Tag>
      }
    },
    {
      title: 'QR Code',
      key: 'qr',
      align: 'center',
      width: 80,
      render: (_, r) => (
        <Tooltip title="Lihat QR">
          <Button type="text" icon={<QrcodeOutlined style={{ color: '#1890ff' }} />} onClick={() => { setActiveAsset(r); setQrModalOpen(true); }} />
        </Tooltip>
      )
    },
    {
      title: 'Aksi',
      key: 'action',
      align: 'right',
      render: (_, r) => (
        <Space>
          <Tooltip title="Edit"><Button type="text" icon={<EditOutlined style={{ color: '#faad14' }} />} onClick={() => handleEdit(r)} /></Tooltip>
          <Tooltip title="Hapus"><Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r)} /></Tooltip>
        </Space>
      )
    }
  ];

  return (
    <div className="module-section">
      {/* Header */}
      <div className="module-toolbar">
        <div>
          <Typography.Title level={3} className="module-title">Data Aset Tetap</Typography.Title>
          <Typography.Text className="module-subtitle">Kelola inventaris BMN dengan mudah dan efisien.</Typography.Text>
        </div>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={() => window.open(`${baseUrl}/bmn/assets/template`, '_blank')}>Template</Button>
          <Button icon={<UploadOutlined />} onClick={() => setImportModalOpen(true)}>Impor</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>Tambah Aset</Button>
        </Space>
      </div>

      {/* Stats */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={6}>
          <StatisticCard title="Total Aset BMN" value={stats.total} icon={<AppstoreOutlined />} color="#1890ff" />
        </Col>
        <Col xs={24} sm={6}>
          <StatisticCard title="Kondisi Baik" value={stats.available} icon={<SafetyCertificateOutlined />} color="#52c41a" />
        </Col>
        <Col xs={24} sm={6}>
          <StatisticCard title="Sedang Dipinjam" value={stats.borrowed} icon={<InboxOutlined />} color="#faad14" />
        </Col>
        <Col xs={24} sm={6}>
          <StatisticCard title="Rusak / Hilang" value={stats.damaged} icon={<WarningOutlined />} color="#f5222d" />
        </Col>
      </Row>

      {/* Main Table Card */}
      <Card variant="borderless" style={{ borderRadius: 8 }} styles={{ body: { padding: '24px' } }}>
        <div className="data-filter-row">
          <Space wrap>
            <Input.Search
              placeholder="Cari Aset..."
              style={{ maxWidth: 300, width: '100%' }}
              allowClear
              size="large"
              onSearch={setSearchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <Select
              defaultValue="all"
              style={{ minWidth: 180 }}
              size="large"
              onChange={setStatusFilter}
              options={[{ value: 'all', label: 'Semua Status' }, ...statusOptions]}
            />
          </Space>
        </div>


        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 12, showTotal: (total) => `Total ${total} item` }}
          scroll={{ x: 800 }}
        />
      </Card>

      {/* Add/Edit Drawer */}
      <Drawer
        title={mode === 'create' ? "Tambah Aset Baru" : "Edit Aset"}
        width={480}
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        extra={
          <Button type="primary" onClick={() => form.submit()} loading={saving}>Simpan</Button>
        }
        footer={
          <div style={{ textAlign: 'right' }}>
            <Button onClick={() => setDrawerOpen(false)} style={{ marginRight: 8 }}>Batal</Button>
            <Button type="primary" onClick={() => form.submit()} loading={saving}>Simpan</Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSave} requiredMark={false}>
          <Divider orientation="left" style={{ margin: '0 0 16px' }}>Identitas Aset</Divider>
          <Form.Item name="namaBarang" label="Nama Barang / Deskripsi" rules={[{ required: true }]}>
            <Input placeholder="Contoh: Laptop Dell Latitude 5420" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) => prevValues.category !== currentValues.category}
              >
                {({ getFieldValue }) => (
                  <Form.Item
                    name="kodeBmn"
                    label="Kode BMN"
                    rules={[{ required: getFieldValue('category') !== 'Ruangan', message: 'Kode BMN wajib diisi' }]}
                  >
                    <Input placeholder={getFieldValue('category') === 'Ruangan' ? '-' : 'X.XX.XX...'} disabled={getFieldValue('category') === 'Ruangan'} />
                  </Form.Item>
                )}
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) => prevValues.category !== currentValues.category}
              >
                {({ getFieldValue }) => (
                  <Form.Item
                    name="nup"
                    label="NUP (Nomor Urut Pendaftaran)"
                    rules={[{ required: getFieldValue('category') !== 'Ruangan', message: 'NUP wajib diisi' }]}
                  >
                    <Input placeholder={getFieldValue('category') === 'Ruangan' ? '-' : '001'} disabled={getFieldValue('category') === 'Ruangan'} />
                  </Form.Item>
                )}
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" style={{ margin: '16px 0' }}>Detail Fisik</Divider>
          <Form.Item name="merekBarang" label="Merek / Brand" rules={[{ required: true }]}>
            <Input placeholder="Contoh: Dell, Epson, Toyota" />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
               <Form.Item name="category" label="Kategori" rules={[{ required: true }]} initialValue="BMN">
                 <Select
                   options={[
                     { value: 'BMN', label: 'Aset BMN' },
                     { value: 'Ruangan', label: 'Ruangan / Fasilitas' }
                   ]}
                 />
               </Form.Item>
            </Col>
            <Col span={12}>
               <Form.Item name="location" label="Lokasi">
                 <Input placeholder="Contoh: Ruang Server, Lantai 2..." />
               </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Keterangan Tambahan">
            <Input.TextArea rows={3} placeholder="Warna, Tahun Perolehan, Lokasi Fisik..." />
          </Form.Item>

          <Divider orientation="left" style={{ margin: '16px 0' }}>Status</Divider>
          <Form.Item name="status" label="Kondisi Saat Ini" rules={[{ required: true }]}>
            <Select options={statusOptions} />
          </Form.Item>
        </Form>
      </Drawer>

      {/* QR Code Modal */}
      <Modal
        title="QR Code Aset"
        open={qrModalOpen}
        footer={null}
        onCancel={() => setQrModalOpen(false)}
        centered
        width={300}
      >
        {activeAsset && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ marginBottom: 16, background: 'white', padding: 16, display: 'inline-block', border: '1px solid #f0f0f0', borderRadius: 8 }}>
              {/* Using Ant Design's QRCode if available, or fallback to visual placeholder */}
              <QRCode value={JSON.stringify({ id: activeAsset.id, code: activeAsset.kodeBmn })} size={180} />
            </div>
            <Typography.Title level={5} style={{ margin: 0 }}>{activeAsset.namaBarang}</Typography.Title>
            <Typography.Text type="secondary">{activeAsset.kodeBmn}</Typography.Text>
            <div style={{ marginTop: 16 }}>
              <Button icon={<DownloadOutlined />}>Unduh Label</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Import Modal */}
      <Modal title="Import Data Aset" open={importModalOpen} onCancel={() => setImportModalOpen(false)} footer={null}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Typography.Text>Unduh template, isi data, lalu unggah.</Typography.Text>
          <Space>
            <Button onClick={() => window.open(`${baseUrl}/bmn/assets/template`, '_blank')}>Unduh Template</Button>
            <Upload
              name="file"
              action={`${baseUrl}/bmn/assets/import`}
              headers={{ Authorization: `Bearer ${token}` }}
              onChange={(info) => {
                const { status, response } = info.file;
                if (status === 'done') {
                  notification.success({ message: 'Impor Berhasil' });
                  setImportModalOpen(false);
                  fetchAssets();
                } else if (status === 'error') {
                  let errorMsg = 'Terjadi kesalahan saat impor.';

                  if (response) {
                    if (response.errors && response.errors.file) {
                      errorMsg = response.errors.file[0];
                    } else if (response.message) {
                      errorMsg = response.message;
                      if (response.missing) {
                        errorMsg += ' Kurang kolom: ' + response.missing.join(', ');
                      }
                    }
                  }

                  notification.error({
                    message: 'Impor Gagal',
                    description: errorMsg
                  });
                }
              }}
            >
              <Button icon={<UploadOutlined />}>Unggah File</Button>
            </Upload>
          </Space>
        </Space>
      </Modal>
    </div>
  );
};

export default BmnDataAsetTetap;
