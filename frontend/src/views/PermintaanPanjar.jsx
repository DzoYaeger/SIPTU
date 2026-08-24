import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  App as AntdApp,
  Button,
  DatePicker,
  Dropdown,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Col,
  Select,
  Space,
  Table,
  Typography,
  Card,
  Popover,
  Tooltip,
} from 'antd';
import {
  CalendarOutlined,
  CheckOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  MoreOutlined,
  PlusOutlined,
  PrinterOutlined,
  ReloadOutlined,
  SaveOutlined,
  SearchOutlined,
  CloseOutlined,
  ClockCircleOutlined,
  FilterOutlined,
  DownOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { useAuth } from '../hooks/useAuth.js';
import useDebounce from '../hooks/useDebounce.js';
import { buildMessageAdapter } from '../utils/notify.js';
import './PermintaanPanjar.css';

const { Text } = Typography;
dayjs.locale('id');

const STATUS_OPTIONS = [
  { label: 'Draft', value: 'draft', dot: 'draft' },
  { label: 'Diajukan', value: 'submitted', dot: 'submitted' },
  { label: 'Disetujui', value: 'approved', dot: 'approved' },
  { label: 'Ditolak', value: 'rejected', dot: 'rejected' },
  { label: 'Dibayar', value: 'paid', dot: 'paid' },
];

const STATUS_MAP = STATUS_OPTIONS.reduce((acc, item) => ({ ...acc, [item.value]: item }), {});

const formatCurrency = (value) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
}).format(value ?? 0);

const blankItem = { uraian: '', nominal: 0 };

export default function PermintaanPanjar() {
  const { apiFetch, user, currentRole } = useAuth();
  const isAdmin = user?.base_role === 'admin' || currentRole === 'admin';
  const { message } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);
  const [form] = Form.useForm();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [mode, setMode] = useState('create');
  const [activeRecord, setActiveRecord] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedTa, setSelectedTa] = useState('ALL');
  const [dateRange, setDateRange] = useState(null);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  const itemsValue = Form.useWatch('items', form) || [];
  const tanggalAkhirKegiatanValue = Form.useWatch('tanggal_akhir_kegiatan', form);

  const itemsTotal = useMemo(() => (itemsValue || []).reduce((sum, item) => {
    return sum + (Number(item?.nominal) || 0);
  }, 0), [itemsValue]);

  const tanggalPalingLambatLabel = useMemo(() => {
    if (!tanggalAkhirKegiatanValue) return '-';
    return dayjs(tanggalAkhirKegiatanValue).add(7, 'day').format('DD MMMM YYYY');
  }, [tanggalAkhirKegiatanValue]);

  useEffect(() => {
    form.setFieldValue('nominal_panjar', itemsTotal);
  }, [form, itemsTotal]);

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await apiFetch('/employees?pageSize=1000');
      const json = await response.json();
      setEmployees(json.data ?? []);
    } catch {
      setEmployees([]);
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const fetchPanjar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('per_page', '1000');
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);
      if (selectedTa !== 'ALL') params.append('tahun_anggaran', selectedTa);
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.append('start_date', dateRange[0].format('YYYY-MM-DD'));
        params.append('end_date', dateRange[1].format('YYYY-MM-DD'));
      }
      const response = await apiFetch(`/panjar-requests?${params.toString()}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || 'Gagal memuat data panjar');
      setData(json.data?.data || []);
    } catch (error) {
      notification.error(error.message || 'Gagal mengambil data permintaan panjar');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, debouncedSearchTerm, selectedStatus, selectedTa, dateRange, notification]);

  useEffect(() => {
    fetchPanjar();
  }, [fetchPanjar]);

  const handleResetFilter = () => {
    setSearchTerm('');
    setSelectedStatus('ALL');
    setSelectedTa('ALL');
    setDateRange(null);
  };

  const handleOpenModal = (record = null) => {
    if (record) {
      setMode('edit');
      setActiveRecord(record);
      form.setFieldsValue({
        ...record,
        tanggal_pengajuan: record.tanggal_pengajuan ? dayjs(record.tanggal_pengajuan) : dayjs(),
        tanggal_mulai_kegiatan: record.tanggal_mulai_kegiatan ? dayjs(record.tanggal_mulai_kegiatan) : null,
        tanggal_akhir_kegiatan: record.tanggal_akhir_kegiatan ? dayjs(record.tanggal_akhir_kegiatan) : null,
        items: record.items?.length
          ? record.items.map((it) => ({ uraian: it.uraian, nominal: Number(it.jumlah || it.harga_satuan || it.nominal) || 0 }))
          : [blankItem],
      });
    } else {
      setMode('create');
      setActiveRecord(null);
      form.setFieldsValue({
        tahun_anggaran: new Date().getFullYear(),
        tanggal_pengajuan: dayjs(),
        tanggal_mulai_kegiatan: null,
        tanggal_akhir_kegiatan: null,
        status: 'draft',
        items: [blankItem],
        nominal_panjar: 0,
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload = {
        ...values,
        tanggal_pengajuan: values.tanggal_pengajuan ? values.tanggal_pengajuan.format('YYYY-MM-DD') : null,
        tanggal_mulai_kegiatan: values.tanggal_mulai_kegiatan ? values.tanggal_mulai_kegiatan.format('YYYY-MM-DD') : null,
        tanggal_akhir_kegiatan: values.tanggal_akhir_kegiatan ? values.tanggal_akhir_kegiatan.format('YYYY-MM-DD') : null,
        nominal_panjar: itemsTotal,
        items: (values.items || []).map((item) => {
          const nominal = Number(item?.nominal) || 0;
          return { uraian: item.uraian, volume: 1, satuan: null, harga_satuan: nominal, jumlah: nominal, keterangan: null };
        }),
      };
      const endpoint = mode === 'edit' ? `/panjar-requests/${activeRecord.id}` : '/panjar-requests';
      const response = await apiFetch(endpoint, {
        method: mode === 'edit' ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || 'Gagal menyimpan permintaan panjar');
      notification.success(json.message || 'Permintaan panjar berhasil disimpan');
      setModalOpen(false);
      fetchPanjar();
    } catch (error) {
      if (error?.errorFields) return;
      notification.error(error.message || 'Gagal menyimpan permintaan panjar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record) => {
    Modal.confirm({
      title: 'Hapus permintaan panjar?',
      content: `Data ${record.ticket_no || record.panjar_no} akan dihapus permanen.`,
      okText: 'Hapus',
      okButtonProps: { danger: true },
      cancelText: 'Batal',
      onOk: async () => {
        const response = await apiFetch(`/panjar-requests/${record.id}`, { method: 'DELETE' });
        const json = await response.json();
        if (!response.ok) throw new Error(json.message || 'Gagal menghapus panjar');
        notification.success(json.message || 'Permintaan panjar dihapus');
        fetchPanjar();
      },
    });
  };

  const handleApprove = async (record) => {
    const response = await apiFetch(`/panjar-requests/${record.id}/approve`, { method: 'PUT' });
    const json = await response.json();
    if (!response.ok) {
      notification.error(json.message || 'Gagal menyetujui panjar');
      return;
    }
    notification.success(json.message || 'Permintaan panjar disetujui');
    fetchPanjar();
  };

  const handlePrintPdf = async (record) => {
    try {
      notification.info('Menyiapkan Form Persetujuan Panjar...');
      const response = await apiFetch(`/panjar-requests/${record.id}/export-pdf`, {
        method: 'GET',
        headers: { Accept: 'application/pdf' },
      });

      if (!response.ok) throw new Error('Gagal mencetak Form Permintaan Panjar');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FORM_PERSETUJUAN_PANJAR_${(record.panjar_no || record.ticket_no || 'PNJ').replace(/[\/\\]/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      notification.success('Dokumen PDF berhasil diunduh');
    } catch (err) {
      notification.error(err.message || 'Gagal mencetak dokumen PDF');
    }
  };

  const columns = [
    {
      title: 'NOMOR PENGAJUAN',
      dataIndex: 'ticket_no',
      width: 170,
      render: (_, record) => (
        <div className="panjar-ticket-cell">
          <span className="panjar-main-no">{record.panjar_no || record.ticket_no}</span>
          <span className="panjar-sub-no">{record.ticket_no}</span>
        </div>
      ),
    },
    {
      title: 'KEGIATAN & MAK',
      dataIndex: 'kegiatan',
      render: (_, record) => (
        <div className="panjar-activity-cell">
          <span className="panjar-kegiatan-text">{record.kegiatan}</span>
          <span className="panjar-mak-badge">MAK: {record.mak || '-'}</span>
        </div>
      ),
    },
    {
      title: 'PENERIMA DANA',
      dataIndex: 'penerima_name',
      width: 180,
      render: (value, record) => (
        <div className="panjar-receiver-cell">
          <span className="panjar-receiver-name">{value || '-'}</span>
          <span className="panjar-ta-badge">TA {record.tahun_anggaran}</span>
        </div>
      ),
    },
    {
      title: 'TANGGAL PENGAJUAN',
      dataIndex: 'tanggal_pengajuan',
      width: 130,
      render: (value) => (
        <span className="panjar-date-text">
          {value ? dayjs(value).format('DD/MM/YYYY') : '-'}
        </span>
      ),
    },
    {
      title: 'NOMINAL PANJAR',
      dataIndex: 'nominal_panjar',
      align: 'right',
      width: 150,
      render: (value) => (
        <span className="panjar-nominal-value">
          {formatCurrency(value)}
        </span>
      ),
    },
    {
      title: 'STATUS',
      dataIndex: 'status',
      width: 120,
      render: (value) => {
        const s = STATUS_MAP[value] || STATUS_OPTIONS[0];
        return (
          <div className="status-indicator">
            <span className={`status-dot ${s.dot}`} />
            <span className="status-text">{s.label}</span>
          </div>
        );
      },
    },
    {
      title: 'AKSI',
      key: 'action',
      align: 'center',
      width: 50,
      render: (_, record) => {
        const items = [
          { key: 'view', label: 'Lihat Detail Rincian', icon: <EyeOutlined /> },
          { key: 'print', label: 'Cetak PDF Persetujuan', icon: <PrinterOutlined /> },
          { key: 'edit', label: 'Edit Data Panjar', icon: <EditOutlined /> },
          ...(isAdmin ? [{ key: 'approve', label: 'Setujui Panjar', icon: <CheckOutlined /> }] : []),
          { type: 'divider' },
          { key: 'delete', label: 'Hapus Panjar', icon: <DeleteOutlined />, danger: true },
        ];
        return (
          <Dropdown
            menu={{
              items,
              onClick: ({ key }) => {
                if (key === 'view') { setViewRecord(record); setViewOpen(true); }
                if (key === 'print') handlePrintPdf(record);
                if (key === 'edit') handleOpenModal(record);
                if (key === 'approve') handleApprove(record);
                if (key === 'delete') handleDelete(record);
              },
            }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button type="text" shape="circle" icon={<MoreOutlined style={{ color: '#64748b', fontSize: 16 }} />} />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <div className="panjar-module-container">
      {/* ── Toolbar & Filter Box (Surat Tugas Standard) ── */}
      <Card
        variant="borderless"
        style={{ borderRadius: 8 }}
        styles={{ body: { padding: '12px 16px' } }}
        className="panjar-toolbar-card"
      >
        <Row gutter={[10, 10]} align="middle">
          {/* Search */}
          <Col xs={24} sm={12} md={6} lg={5}>
            <Input
              allowClear
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              placeholder="Cari nomor panjar, MAK, kegiatan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Col>

          {/* Date Range Popover */}
          <Col xs={24} sm={12} md={5} lg={4}>
            <Popover
              trigger="click"
              open={datePopoverOpen}
              onOpenChange={setDatePopoverOpen}
              placement="bottomLeft"
              content={
                <Space direction="vertical" size={10} style={{ padding: 4 }}>
                  <Text strong style={{ fontSize: 12 }}>Pilih Range Tanggal Pengajuan</Text>
                  <DatePicker.RangePicker
                    format="DD/MM/YYYY"
                    value={dateRange}
                    onChange={(val) => setDateRange(val)}
                    allowClear
                  />
                  <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
                    <Button
                      size="small"
                      onClick={() => {
                        setDateRange(null);
                        setDatePopoverOpen(false);
                      }}
                    >
                      Clear
                    </Button>
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => setDatePopoverOpen(false)}
                    >
                      Terapkan
                    </Button>
                  </Space>
                </Space>
              }
            >
              <Button icon={<CalendarOutlined />} style={{ width: '100%' }}>
                {dateRange && dateRange[0] && dateRange[1]
                  ? `${dateRange[0].format('DD/MM/YY')} - ${dateRange[1].format('DD/MM/YY')}`
                  : 'Range Tanggal'}
              </Button>
            </Popover>
          </Col>

          {/* Tahun Anggaran Dropdown */}
          <Col xs={24} sm={12} md={4} lg={3}>
            <Dropdown
              menu={{
                items: [
                  { key: 'ALL', label: 'Semua TA', onClick: () => setSelectedTa('ALL') },
                  { key: '2026', label: 'TA 2026', onClick: () => setSelectedTa('2026') },
                  { key: '2025', label: 'TA 2025', onClick: () => setSelectedTa('2025') },
                  { key: '2024', label: 'TA 2024', onClick: () => setSelectedTa('2024') },
                ],
                selectedKeys: [selectedTa],
              }}
              trigger={['click']}
            >
              <Button style={{ width: '100%' }}>
                {selectedTa === 'ALL' ? 'TA: Semua' : `TA: ${selectedTa}`}
                <DownOutlined style={{ fontSize: 10, marginLeft: 4 }} />
              </Button>
            </Dropdown>
          </Col>

          {/* Status Dropdown */}
          <Col xs={24} sm={12} md={4} lg={3}>
            <Dropdown
              menu={{
                items: [
                  { key: 'ALL', label: 'Semua Status', onClick: () => setSelectedStatus('ALL') },
                  ...STATUS_OPTIONS.map((opt) => ({
                    key: opt.value,
                    label: opt.label,
                    onClick: () => setSelectedStatus(opt.value),
                  })),
                ],
                selectedKeys: [selectedStatus],
              }}
              trigger={['click']}
            >
              <Button style={{ width: '100%' }}>
                {selectedStatus === 'ALL'
                  ? 'Status: Semua'
                  : `Status: ${STATUS_MAP[selectedStatus]?.label || selectedStatus}`}
                <DownOutlined style={{ fontSize: 10, marginLeft: 4 }} />
              </Button>
            </Dropdown>
          </Col>

          {/* Actions & Add Button */}
          <Col xs={24} sm={24} md={5} lg={9} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Button
              icon={<FilterOutlined />}
              onClick={handleResetFilter}
            >
              Reset
            </Button>
            <Tooltip title="Segarkan Data">
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchPanjar}
              />
            </Tooltip>
            <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
              {data.length} data
            </Text>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleOpenModal()}
            >
              + Tambah Panjar
            </Button>
          </Col>
        </Row>
      </Card>

      {/* ── Table Card ── */}
      <Card
        variant="borderless"
        style={{ borderRadius: 8 }}
        styles={{ body: { padding: '8px 8px 0 8px' } }}
        className="panjar-main-card"
      >
        <Table
          rowKey="id"
          className="panjar-table"
          loading={loading}
          columns={columns}
          dataSource={data}
          size="middle"
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '25', '50', '100'],
            showTotal: (total, range) => `${range[0]}-${range[1]} dari ${total} data`,
          }}
          locale={{ emptyText: <Empty description="Belum ada permintaan panjar" /> }}
        />
      </Card>

      {/* ── Create/Edit Modal ── */}
      <Modal
        title={null}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        width={880}
        destroyOnClose
        centered
        footer={null}
        className="panjar-modal"
      >
        <button
          className="panjar-modal-close"
          onClick={() => setModalOpen(false)}
          title="Tutup"
        >
          <CloseOutlined />
        </button>

        <div className="panjar-modal-wrap">
          <div className="panjar-modal-header">
            <div>
              <h3 className="panjar-modal-title">
                {mode === 'edit' ? 'Edit Permintaan Panjar' : 'Buat Permintaan Panjar Baru'}
              </h3>
              <span className="panjar-modal-sub">
                Isi rincian kebutuhan uang muka kegiatan operasional
              </span>
            </div>
          </div>

          <div className="panjar-modal-body">
            <Form layout="vertical" form={form}>
              {/* Section 1: Meta */}
              <div className="panjar-section-box">
                <span className="panjar-section-lbl">1. Detail Agenda & Anggaran</span>
                <Row gutter={12}>
                  <Col xs={24} md={8}>
                    <Form.Item label="Tahun Anggaran" name="tahun_anggaran">
                      <InputNumber style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item label="Tanggal Pengajuan" name="tanggal_pengajuan">
                      <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item label="Nomor Panjar" name="panjar_no">
                      <Input placeholder="Auto jika kosong" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={12}>
                  <Col xs={24} md={10}>
                    <Form.Item label="Kode MAK" name="mak">
                      <Input placeholder="Contoh: 3165.BKB.053.001" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={14}>
                    <Form.Item label="Pegawai Penerima" name="penerima_name" rules={[{ required: true, message: 'Pilih penerima' }]}>
                      <Select
                        showSearch
                        optionFilterProp="label"
                        placeholder="Pilih pegawai..."
                        options={employees.map((e) => ({ label: `${e.name}${e.nip ? ` (${e.nip})` : ''}`, value: e.name }))}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={12}>
                  <Col xs={24} md={8}>
                    <Form.Item label="Nomor Surat Tugas" name="surat_tugas_no">
                      <Input placeholder="Contoh: ST-2026/08/01" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item label="Mulai Kegiatan" name="tanggal_mulai_kegiatan">
                      <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item label="Akhir Kegiatan" name="tanggal_akhir_kegiatan">
                      <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item label="Nama Kegiatan" name="kegiatan" rules={[{ required: true, message: 'Kegiatan wajib diisi' }]}>
                  <Input placeholder="Nama kegiatan..." />
                </Form.Item>
                <Form.Item label="Uraian / Keperluan" name="uraian">
                  <Input.TextArea rows={2} placeholder="Keterangan kebutuhan panjar..." />
                </Form.Item>
              </div>

              {/* Section 2: Items List */}
              <div className="panjar-section-box">
                <span className="panjar-section-lbl">2. Rincian Kebutuhan Anggaran</span>

                <Form.List name="items">
                  {(fields, { add, remove }) => (
                    <div className="panjar-items-list">
                      {fields.map(({ key, name, ...restField }) => (
                        <div className="panjar-item-row" key={key}>
                          <Form.Item
                            {...restField}
                            name={[name, 'uraian']}
                            rules={[{ required: true, message: 'Wajib' }]}
                            style={{ flex: 2, margin: 0 }}
                          >
                            <Input placeholder="Pos rincian (contoh: BBM / Tiket)" />
                          </Form.Item>
                          <Form.Item
                            {...restField}
                            name={[name, 'nominal']}
                            rules={[{ required: true, message: 'Wajib' }]}
                            style={{ flex: 1, margin: 0 }}
                          >
                            <InputNumber
                              min={0}
                              style={{ width: '100%' }}
                              formatter={(v) => `Rp ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                              parser={(v) => v?.replace(/Rp\s?|[.]/g, '')}
                              placeholder="Nominal"
                            />
                          </Form.Item>
                          <Button danger type="text" icon={<DeleteOutlined />} onClick={() => remove(name)} />
                        </div>
                      ))}
                      <Button type="dashed" icon={<PlusOutlined />} onClick={() => add(blankItem)}>
                        + Tambah Rincian
                      </Button>
                    </div>
                  )}
                </Form.List>

                {/* Summary */}
                <div className="panjar-sum-box">
                  <div>
                    <span className="panjar-sum-lbl">Total Nilai Panjar:</span>
                    <strong className="panjar-sum-val">{formatCurrency(itemsTotal)}</strong>
                  </div>
                  <div className="panjar-sum-due">
                    <ClockCircleOutlined style={{ marginRight: 4 }} />
                    Batas LPJ: <strong>{tanggalPalingLambatLabel}</strong>
                  </div>
                </div>
              </div>

              <div className="panjar-modal-footer">
                <div></div>
                <Space>
                  <Button onClick={() => setModalOpen(false)}>Batal</Button>
                  <Button type="primary" loading={saving} icon={<SaveOutlined />} onClick={handleSubmit}>
                    Simpan Panjar
                  </Button>
                </Space>
              </div>
            </Form>
          </div>
        </div>
      </Modal>

      {/* ── Detail View Modal ── */}
      <Modal
        title={null}
        open={viewOpen}
        onCancel={() => setViewOpen(false)}
        footer={null}
        width={720}
        centered
        destroyOnClose
        className="panjar-modal"
      >
        <button
          className="panjar-modal-close"
          onClick={() => setViewOpen(false)}
          title="Tutup"
        >
          <CloseOutlined />
        </button>

        {viewRecord && (
          <div className="panjar-modal-wrap">
            <div className="panjar-modal-header">
              <div>
                <h3 className="panjar-modal-title">{viewRecord.panjar_no || viewRecord.ticket_no}</h3>
                <span className="panjar-modal-sub">Detail Permintaan Panjar Kegiatan</span>
              </div>
              <div className="status-indicator">
                <span className={`status-dot ${STATUS_MAP[viewRecord.status]?.dot || 'draft'}`} />
                <span className="status-text">{STATUS_MAP[viewRecord.status]?.label || viewRecord.status}</span>
              </div>
            </div>

            <div className="panjar-modal-body">
              <div className="panjar-section-box">
                <Row gutter={[12, 10]}>
                  <Col xs={24} md={12}>
                    <Text className="panjar-meta-k">Nama Kegiatan</Text>
                    <p className="panjar-meta-v">{viewRecord.kegiatan}</p>
                  </Col>
                  <Col xs={24} md={12}>
                    <Text className="panjar-meta-k">Total Nilai Panjar</Text>
                    <p className="panjar-meta-v text-green font-bold">{formatCurrency(viewRecord.nominal_panjar)}</p>
                  </Col>
                  <Col xs={24} md={12}>
                    <Text className="panjar-meta-k">Kode MAK</Text>
                    <p className="panjar-meta-v">{viewRecord.mak || '-'}</p>
                  </Col>
                  <Col xs={24} md={12}>
                    <Text className="panjar-meta-k">Pegawai Penerima</Text>
                    <p className="panjar-meta-v">{viewRecord.penerima_name || '-'}</p>
                  </Col>
                  <Col xs={24} md={12}>
                    <Text className="panjar-meta-k">Nomor Surat Tugas</Text>
                    <p className="panjar-meta-v">{viewRecord.surat_tugas_no || '-'}</p>
                  </Col>
                  <Col xs={24} md={12}>
                    <Text className="panjar-meta-k">Periode Kegiatan</Text>
                    <p className="panjar-meta-v">
                      {viewRecord.tanggal_mulai_kegiatan ? dayjs(viewRecord.tanggal_mulai_kegiatan).format('DD/MM/YYYY') : '-'} s.d. {viewRecord.tanggal_akhir_kegiatan ? dayjs(viewRecord.tanggal_akhir_kegiatan).format('DD/MM/YYYY') : '-'}
                    </p>
                  </Col>
                </Row>
              </div>

              {/* Rincian Table */}
              <div className="panjar-section-box">
                <span className="panjar-section-lbl">Rincian Pos Kebutuhan Dana</span>
                <Table
                  rowKey="id"
                  size="small"
                  pagination={false}
                  dataSource={viewRecord.items || []}
                  columns={[
                    { title: 'Pos Rincian', dataIndex: 'uraian' },
                    { title: 'Nominal', dataIndex: 'jumlah', align: 'right', render: formatCurrency },
                  ]}
                />
              </div>

              <div className="panjar-modal-footer">
                <div></div>
                <Space>
                  <Button type="primary" icon={<PrinterOutlined />} onClick={() => handlePrintPdf(viewRecord)}>
                    Cetak Form Panjar PDF
                  </Button>
                  <Button onClick={() => setViewOpen(false)}>Tutup</Button>
                </Space>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}