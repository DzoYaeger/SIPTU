import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  App as AntdApp,
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Dropdown,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  BankOutlined,
  CalendarOutlined,
  CheckOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FileDoneOutlined,
  FilterOutlined,
  MoreOutlined,
  PlusOutlined,
  PrinterOutlined,
  ReloadOutlined,
  SaveOutlined,
  SearchOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { useAuth } from '../hooks/useAuth.js';
import useDebounce from '../hooks/useDebounce.js';
import { buildMessageAdapter } from '../utils/notify.js';
import './PermintaanPanjar.css';

const { Title, Text } = Typography;
dayjs.locale('id');

const STATUS_OPTIONS = [
  { label: 'Draft', value: 'draft', color: 'default' },
  { label: 'Diajukan', value: 'submitted', color: 'processing' },
  { label: 'Disetujui', value: 'approved', color: 'success' },
  { label: 'Ditolak', value: 'rejected', color: 'error' },
  { label: 'Dibayar', value: 'paid', color: 'green' },
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
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);
      if (selectedTa !== 'ALL') params.append('tahun_anggaran', selectedTa);
      const response = await apiFetch(`/panjar-requests?${params.toString()}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || 'Gagal memuat data panjar');
      setData(json.data?.data || []);
    } catch (error) {
      notification.error(error.message || 'Gagal mengambil data permintaan panjar');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, debouncedSearchTerm, selectedStatus, selectedTa, notification]);

  useEffect(() => {
    fetchPanjar();
  }, [fetchPanjar]);

  const metrics = useMemo(() => data.reduce((acc, item) => {
    const nominal = Number(item.nominal_panjar) || 0;
    acc.totalCount += 1;
    acc.totalNominal += nominal;
    if (item.status === 'approved') acc.approvedNominal += nominal;
    if (item.status === 'submitted') acc.submittedCount += 1;
    return acc;
  }, { totalCount: 0, totalNominal: 0, approvedNominal: 0, submittedCount: 0 }), [data]);

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
      notification.info('Menyiapkan dokumen Form Persetujuan Permintaan Panjar...');
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
      title: 'Nomor',
      dataIndex: 'ticket_no',
      width: 165,
      render: (_, record) => (
        <div className="panjar-ticket-cell">
          <Text strong className="text-sm">{record.panjar_no || record.ticket_no}</Text>
          <Text className="text-xs">{record.ticket_no}</Text>
        </div>
      ),
    },
    {
      title: 'Kegiatan',
      dataIndex: 'kegiatan',
      render: (_, record) => (
        <div className="panjar-activity-cell">
          <Text strong className="text-sm">{record.kegiatan}</Text>
          <Text className="text-xs">Akun: {record.mak || '-'}</Text>
        </div>
      ),
    },
    {
      title: 'Penerima',
      dataIndex: 'penerima_name',
      width: 170,
      render: (value, record) => (
        <div className="panjar-activity-cell">
          <Text className="text-sm">{value || '-'}</Text>
          <Text className="text-xs">TA {record.tahun_anggaran}</Text>
        </div>
      ),
    },
    {
      title: 'Tanggal',
      dataIndex: 'tanggal_pengajuan',
      width: 120,
      render: (value) => <Text className="text-sm">{value ? dayjs(value).format('DD/MM/YYYY') : '-'}</Text>,
    },
    {
      title: 'Nominal',
      dataIndex: 'nominal_panjar',
      align: 'right',
      width: 150,
      render: (value) => <Text strong style={{ color: '#0F5B99', fontSize: '12px', whiteSpace: 'nowrap' }}>{formatCurrency(value)}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 115,
      render: (value) => <Tag color={STATUS_MAP[value]?.color || 'default'}>{STATUS_MAP[value]?.label || value}</Tag>,
    },
    {
      title: 'Aksi',
      key: 'action',
      align: 'right',
      width: 90,
      render: (_, record) => {
        const items = [
          { key: 'view', label: 'Lihat Detail', icon: <EyeOutlined /> },
          { key: 'print', label: 'Cetak PDF', icon: <PrinterOutlined /> },
          { key: 'edit', label: 'Edit', icon: <EditOutlined /> },
          ...(isAdmin ? [{ key: 'approve', label: 'Setujui', icon: <CheckOutlined /> }] : []),
          { key: 'delete', label: 'Hapus', icon: <DeleteOutlined />, danger: true },
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
          >
            <Button size="small" icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <div className="module-section panjar-page">
      <div className="module-toolbar">
        <div>
          <Title level={4} className="module-title">Permintaan Panjar</Title>
          <Text className="module-subtitle">Pengajuan uang muka kegiatan dengan rincian kebutuhan dan kontrol status SIMKEU.</Text>
        </div>
        <Space wrap>
          <Button id="panjar-refresh-button" icon={<ReloadOutlined />} onClick={fetchPanjar}>Segarkan</Button>
          <Button id="panjar-create-button" type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>Tambah Panjar</Button>
        </Space>
      </div>

      <Row gutter={[12, 12]} className="panjar-metric-row">
        <Col xs={24} md={6}><Card className="panjar-metric-card"><WalletOutlined /><div><Text>Total Pengajuan</Text><strong>{metrics.totalCount}</strong></div></Card></Col>
        <Col xs={24} md={6}><Card className="panjar-metric-card"><BankOutlined /><div><Text>Nilai Panjar</Text><strong>{formatCurrency(metrics.totalNominal)}</strong></div></Card></Col>
        <Col xs={24} md={6}><Card className="panjar-metric-card"><FileDoneOutlined /><div><Text>Disetujui</Text><strong>{formatCurrency(metrics.approvedNominal)}</strong></div></Card></Col>
        <Col xs={24} md={6}><Card className="panjar-metric-card"><CalendarOutlined /><div><Text>Menunggu</Text><strong>{metrics.submittedCount}</strong></div></Card></Col>
      </Row>

      <Card className="panjar-table-card">
        <div className="panjar-filterbar">
          <Input id="panjar-search-input" allowClear prefix={<SearchOutlined />} placeholder="Cari nomor, kode akun, kegiatan, penerima..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <Select value={selectedTa} onChange={setSelectedTa} style={{ minWidth: 130 }} options={[{ label: 'Semua TA', value: 'ALL' }, 2026, 2025, 2024].map((v) => typeof v === 'object' ? v : { label: `TA ${v}`, value: String(v) })} />
          <Select value={selectedStatus} onChange={setSelectedStatus} style={{ minWidth: 145 }} options={[{ label: 'Semua Status', value: 'ALL' }, ...STATUS_OPTIONS]} suffixIcon={<FilterOutlined />} />
        </div>
        <Table
          rowKey="id"
          className="panjar-data-table"
          loading={loading}
          columns={columns}
          dataSource={data}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: <Empty description="Belum ada permintaan panjar" /> }}
          scroll={{ x: 980 }}
        />
      </Card>

      <Modal
        title={mode === 'edit' ? 'Edit Permintaan Panjar' : 'Tambah Permintaan Panjar'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        width={920}
        destroyOnHidden
        footer={[
          <Button key="cancel" onClick={() => setModalOpen(false)}>Batal</Button>,
          <Button key="save" type="primary" loading={saving} icon={<SaveOutlined />} onClick={handleSubmit}>Simpan</Button>,
        ]}
      >
        <Form layout="vertical" form={form} className="panjar-form">
          <Row gutter={12}>
            <Col xs={24} md={8}><Form.Item label="Tahun Anggaran" name="tahun_anggaran"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item label="Tanggal Pengajuan" name="tanggal_pengajuan"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item label="Nomor Panjar" name="panjar_no"><Input placeholder="Auto jika kosong" /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col xs={24} md={10}><Form.Item label="Kode Akun" name="mak"><Input placeholder="3165.BKB.053.001.524111" /></Form.Item></Col>
            <Col xs={24} md={14}><Form.Item label="Penerima" name="penerima_name" rules={[{ required: true, message: 'Pilih penerima dari kepegawaian' }]}>
              <Select showSearch optionFilterProp="label" placeholder="Pilih pegawai" options={employees.map((e) => ({ label: `${e.name}${e.nip ? ` (${e.nip})` : ''}`, value: e.name }))} />
            </Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col xs={24} md={8}><Form.Item label="Nomor Surat Tugas" name="surat_tugas_no"><Input placeholder="Nomor surat tugas" /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item label="Tanggal Mulai Kegiatan" name="tanggal_mulai_kegiatan"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item label="Tanggal Akhir Kegiatan" name="tanggal_akhir_kegiatan"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
          </Row>
          <Form.Item label="Kegiatan" name="kegiatan" rules={[{ required: true, message: 'Kegiatan wajib diisi' }]}><Input placeholder="Nama kegiatan yang membutuhkan panjar" /></Form.Item>
          <Form.Item label="Uraian / Keperluan" name="uraian"><Input.TextArea rows={3} placeholder="Jelaskan kebutuhan panjar" /></Form.Item>

          <Divider orientation="left">Rincian Kebutuhan</Divider>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <div className="panjar-items-list">
                {fields.map(({ key, name, ...restField }) => (
                  <div className="panjar-item-row panjar-item-row--simple" key={key}>
                    <Form.Item {...restField} name={[name, 'uraian']} rules={[{ required: true, message: 'Nama rincian wajib' }]}><Input placeholder="Nama rincian" /></Form.Item>
                    <Form.Item {...restField} name={[name, 'nominal']} rules={[{ required: true, message: 'Nominal wajib' }]}><InputNumber min={0} style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} parser={(v) => v?.replace(/\./g, '')} placeholder="Nominal" /></Form.Item>
                    <Button danger icon={<DeleteOutlined />} onClick={() => remove(name)} />
                  </div>
                ))}
                <Button type="dashed" icon={<PlusOutlined />} onClick={() => add(blankItem)}>Tambah Rincian</Button>
              </div>
            )}
          </Form.List>

          <Row gutter={12} className="panjar-summary-row">
            <Col xs={24} md={12}><Form.Item label="Nominal Panjar (Otomatis dari Rincian)" name="nominal_panjar"><InputNumber disabled min={0} style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} parser={(v) => v?.replace(/\./g, '')} /></Form.Item></Col>
          </Row>
          <div className="panjar-calc-box">
            <span>Total rincian: {formatCurrency(itemsTotal)}</span>
            <strong>Paling lambat rampung: {tanggalPalingLambatLabel}</strong>
          </div>
        </Form>
      </Modal>

      <Modal
        title="Detail Permintaan Panjar"
        open={viewOpen}
        onCancel={() => setViewOpen(false)}
        footer={[
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => handlePrintPdf(viewRecord)}>Cetak Form Panjar (PDF)</Button>,
          <Button key="close" onClick={() => setViewOpen(false)}>Tutup</Button>,
        ]}
        width={760}
      >
        {viewRecord && (
          <div className="panjar-detail">
            <div className="panjar-detail-hero">
              <div><Text className="text-xs">Nomor</Text><h3>{viewRecord.panjar_no || viewRecord.ticket_no}</h3></div>
              <Tag color={STATUS_MAP[viewRecord.status]?.color}>{STATUS_MAP[viewRecord.status]?.label || viewRecord.status}</Tag>
            </div>
            <Row gutter={[12, 12]}>
              <Col xs={24} md={12}><Text className="text-xs">Kegiatan</Text><p>{viewRecord.kegiatan}</p></Col>
              <Col xs={24} md={12}><Text className="text-xs">Nominal</Text><p className="panjar-detail-money">{formatCurrency(viewRecord.nominal_panjar)}</p></Col>
              <Col xs={24} md={12}><Text className="text-xs">Kode Akun</Text><p>{viewRecord.mak || '-'}</p></Col>
              <Col xs={24} md={12}><Text className="text-xs">Penerima</Text><p>{viewRecord.penerima_name || '-'}</p></Col>
              <Col xs={24} md={12}><Text className="text-xs">Nomor Surat Tugas</Text><p>{viewRecord.surat_tugas_no || '-'}</p></Col>
              <Col xs={24} md={12}><Text className="text-xs">Periode Kegiatan</Text><p>{viewRecord.tanggal_mulai_kegiatan ? dayjs(viewRecord.tanggal_mulai_kegiatan).format('DD MMMM YYYY') : '-'} s.d. {viewRecord.tanggal_akhir_kegiatan ? dayjs(viewRecord.tanggal_akhir_kegiatan).format('DD MMMM YYYY') : '-'}</p></Col>
            </Row>
            <Divider />
            <Table rowKey="id" size="small" pagination={false} dataSource={viewRecord.items || []} columns={[
              { title: 'Nama Rincian', dataIndex: 'uraian' },
              { title: 'Nominal', dataIndex: 'jumlah', align: 'right', render: formatCurrency },
            ]} />
          </div>
        )}
      </Modal>
    </div>
  );
}