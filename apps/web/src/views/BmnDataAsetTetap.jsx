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
  QRCode, // Ant Design has a QRCode component now in newer versions, falling back to icon if issue
  Dropdown,
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
  GoldOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth.js';
import StatisticCard from '../components/StatisticCard.jsx';
import './BmnDataAsetTetap.css';

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
      width: 260,
      render: (_, r) => (
        <div className="bmn-identity-cell">
          <div className="bmn-identity-icon">
            <GoldOutlined />
          </div>
          <div>
            <span className="bmn-identity-name">{r.namaBarang}</span>
            {r.merekBarang && (
              <div className="bmn-identity-brand">{r.merekBarang}</div>
            )}
          </div>
        </div>
      )
    },
    {
      title: 'Kode BMN & NUP',
      key: 'kodeBmn',
      width: 200,
      render: (_, r) => (
        <div>
          {r.category === 'Ruangan' ? (
             <Tag color="purple" style={{ borderRadius: 100, fontWeight: 600 }}>Ruangan</Tag>
          ) : (
            <>
               <Typography.Text copyable className="bmn-code-copy">{r.kodeBmn}</Typography.Text>
               <div className="bmn-nup-sub">NUP: {r.nup}</div>
            </>
          )}
        </div>
      )
    },
    {
      title: 'Status',
      key: 'status',
      width: 140,
      render: (_, r) => {
        const s = statusOptions.find(o => o.value === r.status) || statusOptions[0];
        return (
          <Tag color={s.color} icon={s.icon} style={{ borderRadius: 100, fontWeight: 600, padding: '2px 10px' }}>
            {s.label}
          </Tag>
        )
      }
    },
    {
      title: 'Aksi',
      key: 'action',
      width: 70,
      align: 'center',
      render: (_, r) => {
        const items = [
          {
            key: 'qr',
            label: 'Lihat QR Code',
            icon: <QrcodeOutlined style={{ color: '#1e293b' }} />,
            onClick: () => { setActiveAsset(r); setQrModalOpen(true); },
          },
          {
            key: 'edit',
            label: 'Edit Data Aset',
            icon: <EditOutlined style={{ color: '#1e293b' }} />,
            onClick: () => handleEdit(r),
          },
          {
            type: 'divider',
          },
          {
            key: 'delete',
            label: <span style={{ color: '#ef4444' }}>Hapus Data</span>,
            icon: <DeleteOutlined style={{ color: '#ef4444' }} />,
            onClick: () => handleDelete(r),
          },
        ];

        return (
          <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
            <Button type="text" shape="circle" icon={<MoreOutlined style={{ color: '#1e293b', fontSize: 16 }} />} />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <div className="module-section">
        <div className="bmn-header-card">
            <div className="bmn-header-top-row">
                <div className="bmn-header-left">
                    <div className="bmn-header-icon">
                        <GoldOutlined />
                    </div>
                    <div>
                        <div className="bmn-title-row">
                            <h1 className="bmn-title">Data Aset Tetap</h1>
                            <span className="bmn-badge">BMN</span>
                        </div>
                        <p className="bmn-subtitle">
                            Kelola inventaris Barang Milik Negara (BMN) — pantau kondisi, kode & NUP, serta status ketersediaan aset di lingkungan kantor.
                        </p>
                    </div>
                </div>

                <div className="bmn-header-right">
                    <Button
                        icon={<DownloadOutlined />}
                        className="bmn-btn-header bmn-btn-header--template"
                        onClick={() => window.open(`${baseUrl}/bmn/assets/template`, '_blank')}
                    >
                        Template
                    </Button>
                    <Button
                        icon={<UploadOutlined />}
                        className="bmn-btn-header bmn-btn-header--import"
                        onClick={() => setImportModalOpen(true)}
                    >
                        Impor
                    </Button>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleCreate}
                        className="bmn-btn-create"
                    >
                        Tambah Aset
                    </Button>
                </div>
            </div>

            <div className="bmn-header-metrics-bar">
                <div className="bmn-metric-chip bmn-metric-chip--blue">
                    <AppstoreOutlined className="bmn-metric-chip__icon" />
                    <div className="bmn-metric-chip__info">
                        <span className="bmn-metric-chip__label">TOTAL ASET BMN</span>
                        <span className="bmn-metric-chip__val">{stats.total} Unit</span>
                    </div>
                </div>

                <div className="bmn-metric-chip bmn-metric-chip--green">
                    <SafetyCertificateOutlined className="bmn-metric-chip__icon" />
                    <div className="bmn-metric-chip__info">
                        <span className="bmn-metric-chip__label">KONDISI BAIK</span>
                        <span className="bmn-metric-chip__val">{stats.available} Unit</span>
                    </div>
                </div>

                <div className="bmn-metric-chip bmn-metric-chip--amber">
                    <InboxOutlined className="bmn-metric-chip__icon" />
                    <div className="bmn-metric-chip__info">
                        <span className="bmn-metric-chip__label">SEDANG DIPINJAM</span>
                        <span className="bmn-metric-chip__val">{stats.borrowed} Unit</span>
                    </div>
                </div>

                <div className="bmn-metric-chip bmn-metric-chip--red">
                    <WarningOutlined className="bmn-metric-chip__icon" />
                    <div className="bmn-metric-chip__info">
                        <span className="bmn-metric-chip__label">RUSAK / HILANG</span>
                        <span className="bmn-metric-chip__val">{stats.damaged} Unit</span>
                    </div>
                </div>
            </div>
        </div>

        <div className="bmn-main-card">
            <div className="bmn-status-tabs">
                <div className="bmn-status-tabs__label">
                    <FilterOutlined /> Status Aset:
                </div>
                <div className="bmn-status-tabs__scroll">
                    <button
                        className={`bmn-status-btn ${statusFilter === 'all' ? 'bmn-status-btn--active' : ''}`}
                        onClick={() => setStatusFilter('all')}
                    >
                        Semua ({stats.total})
                    </button>
                    <button
                        className={`bmn-status-btn ${statusFilter === 'tersedia' ? 'bmn-status-btn--active' : ''}`}
                        onClick={() => setStatusFilter('tersedia')}
                    >
                        <span className="bmn-status-dot" style={{ background: '#059669' }} />
                        Tersedia ({stats.available})
                    </button>
                    <button
                        className={`bmn-status-btn ${statusFilter === 'dipinjam' ? 'bmn-status-btn--active' : ''}`}
                        onClick={() => setStatusFilter('dipinjam')}
                    >
                        <span className="bmn-status-dot" style={{ background: '#d97706' }} />
                        Dipinjam ({stats.borrowed})
                    </button>
                    <button
                        className={`bmn-status-btn ${statusFilter === 'rusak' ? 'bmn-status-btn--active' : ''}`}
                        onClick={() => setStatusFilter('rusak')}
                    >
                        <span className="bmn-status-dot" style={{ background: '#dc2626' }} />
                        Rusak ({assets.filter(a => a.status === 'rusak').length})
                    </button>
                    <button
                        className={`bmn-status-btn ${statusFilter === 'hilang' ? 'bmn-status-btn--active' : ''}`}
                        onClick={() => setStatusFilter('hilang')}
                    >
                        <span className="bmn-status-dot" style={{ background: '#7c3aed' }} />
                        Hilang ({assets.filter(a => a.status === 'hilang').length})
                    </button>
                </div>
            </div>

            <div className="bmn-toolbar">
                <div className="bmn-toolbar__left">
                    <Input.Search
                        className="bmn-search-input"
                        placeholder="Cari nama aset, kode BMN, NUP..."
                        style={{ maxWidth: 340, width: '100%' }}
                        allowClear
                        onSearch={setSearchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="bmn-toolbar__right">
                    <Select
                        className="bmn-status-select"
                        value={statusFilter}
                        style={{ minWidth: 170 }}
                        onChange={setStatusFilter}
                        options={[{ value: 'all', label: 'Semua Status' }, ...statusOptions]}
                    />
                </div>
            </div>

            <div className="bmn-table-container">
                <Table
                    columns={columns}
                    dataSource={filteredData}
                    rowKey="id"
                    loading={loading}
                    className="bmn-table"
                    pagination={{
                        pageSize: 12,
                        showSizeChanger: true,
                        showTotal: (t, range) => `Menampilkan ${range[0]}-${range[1]} dari ${t} item`,
                    }}
                    scroll={{ x: 800 }}
                />
            </div>
        </div>

            {/* ── Add/Edit Drawer (Unified Design System) ── */}
            <Drawer
                className="bmn-drawer"
                width={520}
                onClose={() => setDrawerOpen(false)}
                open={drawerOpen}
                destroyOnClose
                title={
                    <div className="bmn-drawer-header">
                        <div className="bmn-drawer-header__icon">
                            {mode === 'create' ? <PlusOutlined /> : <EditOutlined />}
                        </div>
                        <div>
                            <div className="bmn-drawer-title">
                                {mode === 'create' ? 'Tambah Aset Baru' : 'Edit Data Aset'}
                            </div>
                            <div className="bmn-drawer-subtitle">
                                {mode === 'create' ? 'Lengkapi identitas dan detail fisik aset BMN.' : 'Perbarui data identitas dan kondisi aset BMN.'}
                            </div>
                        </div>
                    </div>
                }
                footer={
                    <div className="bmn-drawer-footer">
                        <div className="bmn-drawer-footer__left">
                            <Button className="bmn-btn-action bmn-btn-cancel" onClick={() => setDrawerOpen(false)}>
                                Batal
                            </Button>
                        </div>
                        <div className="bmn-drawer-footer__right">
                            <Button
                                className="bmn-btn-action bmn-btn-primary"
                                onClick={() => form.submit()}
                                loading={saving}
                            >
                                {mode === 'create' ? 'Simpan Aset' : 'Simpan Perubahan'}
                            </Button>
                        </div>
                    </div>
                }
            >
                <div className="bmn-drawer-body">
                    <Form form={form} layout="vertical" onFinish={handleSave} requiredMark={false}>
                        {/* Fieldset 1: Identitas Aset */}
                        <div className="bmn-fieldset">
                            <div className="bmn-fieldset__title">
                                <BarcodeOutlined className="bmn-fieldset__title-icon" />
                                Identitas Aset
                            </div>
                            <Form.Item name="namaBarang" label="Nama Barang / Deskripsi" rules={[{ required: true, message: 'Nama barang wajib diisi' }]}>
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
                                                label="NUP (Nomor Urut)"
                                                rules={[{ required: getFieldValue('category') !== 'Ruangan', message: 'NUP wajib diisi' }]}
                                            >
                                                <Input placeholder={getFieldValue('category') === 'Ruangan' ? '-' : '001'} disabled={getFieldValue('category') === 'Ruangan'} />
                                            </Form.Item>
                                        )}
                                    </Form.Item>
                                </Col>
                            </Row>
                        </div>

                        {/* Fieldset 2: Detail Fisik */}
                        <div className="bmn-fieldset">
                            <div className="bmn-fieldset__title">
                                <GoldOutlined className="bmn-fieldset__title-icon" />
                                Detail Fisik Aset
                            </div>
                            <Form.Item name="merekBarang" label="Merek / Brand" rules={[{ required: true, message: 'Merek wajib diisi' }]}>
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
                        </div>

                        {/* Fieldset 3: Status */}
                        <div className="bmn-fieldset">
                            <div className="bmn-fieldset__title">
                                <SafetyCertificateOutlined className="bmn-fieldset__title-icon" />
                                Status Kondisi
                            </div>
                            <Form.Item name="status" label="Kondisi Saat Ini" rules={[{ required: true, message: 'Status wajib diisi' }]}>
                                <Select options={statusOptions} />
                            </Form.Item>
                        </div>
                    </Form>
                </div>
            </Drawer>

            {/* ── QR Code Modal (Unified Design System) ── */}
            <Modal
                className="bmn-modal"
                title={
                    <div className="bmn-modal-header">
                        <div className="bmn-modal-header__icon bmn-modal-header__icon--blue">
                            <QrcodeOutlined />
                        </div>
                        <div>
                            <div className="bmn-modal-header__title">QR Code Aset</div>
                            <div className="bmn-modal-header__sub">Label QR untuk identifikasi fisik aset di lapangan.</div>
                        </div>
                    </div>
                }
                open={qrModalOpen}
                footer={null}
                onCancel={() => setQrModalOpen(false)}
                centered
                width={340}
            >
                {activeAsset && (
                    <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
                        <div className="bmn-qr-box">
                            <QRCode value={JSON.stringify({ id: activeAsset.id, code: activeAsset.kodeBmn })} size={180} />
                        </div>
                        <p className="bmn-qr-name" style={{ marginTop: 14 }}>{activeAsset.namaBarang}</p>
                        <div style={{ marginTop: 6 }}>
                            <span className="bmn-qr-code">{activeAsset.kodeBmn}</span>
                        </div>
                        <div style={{ marginTop: 18 }}>
                            <Button icon={<DownloadOutlined />} className="bmn-btn-download">
                                Unduh Label
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ── Import Modal (Unified Design System) ── */}
            <Modal
                className="bmn-modal"
                title={
                    <div className="bmn-modal-header">
                        <div className="bmn-modal-header__icon bmn-modal-header__icon--purple">
                            <UploadOutlined />
                        </div>
                        <div>
                            <div className="bmn-modal-header__title">Import Data Aset</div>
                            <div className="bmn-modal-header__sub">Unggah data aset secara massal dari file Excel.</div>
                        </div>
                    </div>
                }
                open={importModalOpen}
                onCancel={() => setImportModalOpen(false)}
                footer={null}
                centered
                width={460}
            >
                <div style={{ marginTop: 8 }}>
                    <div className="bmn-import-guide">
                        <p className="bmn-import-guide__text">
                            1. <strong>Unduh template</strong> Excel terlebih dahulu.<br />
                            2. Isi data aset sesuai kolom template.<br />
                            3. <strong>Unggah file</strong> untuk mengimpor data massal.
                        </p>
                    </div>
                    <div className="bmn-import-actions">
                        <Button
                            icon={<DownloadOutlined />}
                            className="bmn-btn-header bmn-btn-header--template"
                            onClick={() => window.open(`${baseUrl}/bmn/assets/template`, '_blank')}
                        >
                            Unduh Template
                        </Button>
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
                            <Button icon={<UploadOutlined />} className="bmn-btn-create">
                                Unggah File
                            </Button>
                        </Upload>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default BmnDataAsetTetap;
