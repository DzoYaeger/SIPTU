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
  Radio,
  Tag,
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
  SendOutlined,
  CopyOutlined,
  SafetyCertificateOutlined,
  FileTextOutlined,
  PhoneOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
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
  { label: 'Menunggu PPK', value: 'submitted', dot: 'submitted' },
  { label: 'Menunggu Bendahara', value: 'approved_ppk', dot: 'submitted' },
  { label: 'Disetujui', value: 'approved', dot: 'approved' },
  { label: 'Ditolak', value: 'rejected', dot: 'rejected' },
  { label: 'Dibayar', value: 'paid', dot: 'paid' },
];

const formatCurrency = (value) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value ?? 0);

const blankItem = { uraian: '', nominal: 0 };

export default function PermintaanPanjar() {
  const { apiFetch, user, currentRole } = useAuth();
  const isAdmin = user?.base_role === 'admin' || currentRole === 'admin';
  const isValidator = isAdmin || user?.base_role === 'validator' || currentRole === 'validator';
  const { message } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);
  const [form] = Form.useForm();
  const [valForm] = Form.useForm();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [valModalOpen, setValModalOpen] = useState(false);
  const [valTargetRole, setValTargetRole] = useState('ppk'); // 'ppk' | 'bendahara'
  const [valRecord, setValRecord] = useState(null);
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
  const valActionValue = Form.useWatch('action', valForm) || 'approve';

  const itemsTotal = useMemo(
    () =>
      (itemsValue || []).reduce((sum, item) => {
        return sum + (Number(item?.nominal) || 0);
      }, 0),
    [itemsValue]
  );

  const tanggalPalingLambatLabel = useMemo(() => {
    if (!tanggalAkhirKegiatanValue) return '-';
    return dayjs(tanggalAkhirKegiatanValue).add(7, 'day').format('DD MMMM YYYY');
  }, [tanggalAkhirKegiatanValue]);

  const dashboardMetrics = useMemo(
    () => ({
      total: data.length,
      nilai: data.reduce((sum, item) => sum + (Number(item.nominal_panjar) || 0), 0),
      draft: data.filter((item) => item.status === 'draft').length,
      menungguPpk: data.filter((item) => item.status === 'submitted').length,
      menungguBendahara: data.filter((item) => item.status === 'approved_ppk').length,
      selesai: data.filter((item) => item.status === 'approved' || item.status === 'paid').length,
      ditolak: data.filter((item) => item.status === 'rejected').length,
    }),
    [data]
  );

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
          ? record.items.map((it) => ({
              uraian: it.uraian,
              nominal: Number(it.jumlah || it.harga_satuan || it.nominal) || 0,
            }))
          : [blankItem],
      });
    } else {
      setMode('create');
      setActiveRecord(null);
      form.resetFields();
      const defaultPhone = user?.phone_number || user?.employee?.phone_number || '';
      form.setFieldsValue({
        tanggal_pengajuan: dayjs(),
        tahun_anggaran: dayjs().year().toString(),
        status: 'submitted',
        requester_phone: defaultPhone,
        items: [blankItem],
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
        tanggal_mulai_kegiatan: values.tanggal_mulai_kegiatan
          ? values.tanggal_mulai_kegiatan.format('YYYY-MM-DD')
          : null,
        tanggal_akhir_kegiatan: values.tanggal_akhir_kegiatan
          ? values.tanggal_akhir_kegiatan.format('YYYY-MM-DD')
          : null,
        nominal_panjar: itemsTotal,
        items: (values.items || []).map((item) => {
          const nominal = Number(item?.nominal) || 0;
          return {
            uraian: item.uraian,
            volume: 1,
            satuan: null,
            harga_satuan: nominal,
            jumlah: nominal,
            keterangan: null,
          };
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

  /* ── Submit to PPK ── */
  const handleSubmitToPpk = async (record) => {
    Modal.confirm({
      title: 'Ajukan ke PPK?',
      content: `Kirim pengajuan panjar "${record.panjar_no || record.ticket_no}" ke PPK? Notifikasi WhatsApp akan otomatis dikirim ke PPK bersangkutan.`,
      okText: 'Ajukan Sekarang',
      cancelText: 'Batal',
      onOk: async () => {
        try {
          const response = await apiFetch(`/panjar-requests/${record.id}/submit`, { method: 'POST' });
          const json = await response.json();
          if (!response.ok) throw new Error(json.message || 'Gagal mengajukan panjar');
          notification.success('Pengajuan berhasil diteruskan ke PPK via WhatsApp');
          fetchPanjar();
        } catch (err) {
          notification.error(err.message || 'Gagal mengajukan panjar ke PPK');
        }
      },
    });
  };

  /* ── Inline Validation Modal Handler ── */
  const handleOpenValidation = (record, targetRole = 'ppk') => {
    setValRecord(record);
    setValTargetRole(targetRole);
    valForm.resetFields();
    valForm.setFieldsValue({
      action: 'approve',
      verifier_name: targetRole === 'bendahara' ? (record.bendahara_name || user?.name) : (record.ppk_name || user?.name),
      notes: '',
    });
    setValModalOpen(true);
  };

  const handleSaveValidation = async () => {
    try {
      const values = await valForm.validateFields();
      setSaving(true);
      const endpoint =
        valTargetRole === 'bendahara'
          ? `/panjar-requests/${valRecord.id}/validate-bendahara`
          : `/panjar-requests/${valRecord.id}/validate-ppk`;

      const response = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || 'Gagal memproses validasi');
      notification.success(json.message || 'Validasi panjar berhasil disimpan.');
      setValModalOpen(false);
      fetchPanjar();
    } catch (err) {
      if (err?.errorFields) return;
      notification.error(err.message || 'Gagal memproses validasi');
    } finally {
      setSaving(false);
    }
  };

  /* ── Copy Direct Validation Link ── */
  const handleCopyValidationLink = (record, role = 'ppk') => {
    const origin = window.location.origin;
    const link = `${origin}/panjar/validasi/${record.token}?role=${role}`;
    navigator.clipboard.writeText(link);
    notification.success(`Tautan validasi ${role.toUpperCase()} berhasil disalin ke clipboard!`);
  };

  const handleDelete = async (record) => {
    Modal.confirm({
      title: 'Hapus Permintaan Panjar?',
      content: `Apakah Anda yakin ingin menghapus pengajuan "${record.panjar_no || record.ticket_no}"?`,
      okText: 'Hapus',
      okButtonProps: { danger: true },
      cancelText: 'Batal',
      onOk: async () => {
        try {
          const response = await apiFetch(`/panjar-requests/${record.id}`, { method: 'DELETE' });
          const json = await response.json();
          if (!response.ok) throw new Error(json.message || 'Gagal menghapus panjar');
          notification.success('Permintaan panjar berhasil dihapus');
          fetchPanjar();
        } catch (err) {
          notification.error(err.message || 'Gagal menghapus panjar');
        }
      },
    });
  };

  const handlePrintPdf = async (record) => {
    try {
      notification.info('Menyiapkan dokumen PDF Persetujuan Panjar...');
      const response = await apiFetch(`/panjar-requests/${record.id}/export-pdf`, {
        method: 'GET',
        headers: { Accept: 'application/pdf' },
      });

      if (!response.ok) {
        throw new Error('Gagal mengunduh dokumen PDF');
      }

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

  /* ── Status Indicator Render Standard ── */
  const renderStatus = (record) => {
    const status = record.status;
    if (status === 'rejected') {
      const label =
        record.rejection_stage === 'ppk'
          ? 'Ditolak PPK'
          : record.rejection_stage === 'bendahara'
          ? 'Ditolak Bendahara'
          : 'Ditolak';
      return (
        <div className="status-indicator">
          <span className="status-dot rejected" />
          <span className="status-text">{label}</span>
        </div>
      );
    }
    if (status === 'submitted') {
      return (
        <div className="status-indicator">
          <span className="status-dot submitted" />
          <span className="status-text">Menunggu PPK</span>
        </div>
      );
    }
    if (status === 'approved_ppk') {
      return (
        <div className="status-indicator">
          <span className="status-dot submitted" />
          <span className="status-text">Menunggu Bendahara</span>
        </div>
      );
    }
    if (status === 'approved') {
      return (
        <div className="status-indicator">
          <span className="status-dot success" />
          <span className="status-text">Disetujui</span>
        </div>
      );
    }
    if (status === 'paid') {
      return (
        <div className="status-indicator">
          <span className="status-dot success" />
          <span className="status-text">Dibayar</span>
        </div>
      );
    }
    return (
      <div className="status-indicator">
        <span className="status-dot draft" />
        <span className="status-text">Draft</span>
      </div>
    );
  };

  const columns = [
    {
      title: 'NOMOR PENGAJUAN',
      dataIndex: 'ticket_no',
      width: 200,
      fixed: 'left',
      render: (_, record) => (
        <div className="simkeu-record-identity">
          <span className="simkeu-record-icon">
            <FileTextOutlined />
          </span>
          <div className="panjar-ticket-cell">
            <span className="panjar-main-no">{record.panjar_no || record.ticket_no}</span>
            <span className="panjar-sub-no">{record.ticket_no}</span>
          </div>
        </div>
      ),
    },
    {
      title: 'KEGIATAN & KODE AKUN',
      dataIndex: 'kegiatan',
      minWidth: 240,
      render: (_, record) => (
        <div className="panjar-activity-cell">
          <span className="panjar-kegiatan-text">{record.kegiatan}</span>
          <span className="panjar-mak-badge">Akun: {record.mak || '-'}</span>
        </div>
      ),
    },
    {
      title: 'PENERIMA DANA',
      dataIndex: 'penerima_name',
      width: 190,
      render: (value, record) => (
        <div className="panjar-receiver-cell">
          <span className="panjar-receiver-name">{value || '-'}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="panjar-ta-badge">TA {record.tahun_anggaran}</span>
            {record.requester_phone && (
              <span style={{ fontSize: 11, color: '#64748b' }}>• WA: {record.requester_phone}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'TANGGAL PENGAJUAN',
      dataIndex: 'tanggal_pengajuan',
      width: 160,
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
      width: 160,
      render: (value) => (
        <span className="panjar-nominal-value">{formatCurrency(value)}</span>
      ),
    },
    {
      title: 'STATUS ALUR',
      dataIndex: 'status',
      width: 165,
      render: (_, record) => renderStatus(record),
    },
    {
      title: 'AKSI',
      key: 'action',
      align: 'center',
      width: 90,
      fixed: 'right',
      render: (_, record) => {
        const canSubmitPpk = record.status === 'draft' || record.status === 'rejected';
        const canValidatePpk = (isValidator || isAdmin) && record.status === 'submitted';
        const canValidateBendahara = (isValidator || isAdmin) && record.status === 'approved_ppk';

        const items = [
          { key: 'view', label: 'Lihat Rincian & Riwayat', icon: <EyeOutlined /> },
          { key: 'print', label: 'Cetak PDF Persetujuan', icon: <PrinterOutlined /> },
          ...(canSubmitPpk ? [{ key: 'submit_ppk', label: 'Ajukan ke PPK', icon: <SendOutlined /> }] : []),
          ...(canValidatePpk ? [{ key: 'val_ppk', label: 'Validasi PPK (Setujui/Tolak)', icon: <SafetyCertificateOutlined /> }] : []),
          ...(canValidateBendahara ? [{ key: 'val_bendahara', label: 'Validasi Bendahara', icon: <CheckCircleOutlined /> }] : []),
          {
            type: 'divider',
          },
          { key: 'copy_link_ppk', label: 'Salin Link Validasi PPK', icon: <CopyOutlined /> },
          { key: 'copy_link_bendahara', label: 'Salin Link Validasi Bendahara', icon: <CopyOutlined /> },
          { key: 'edit', label: 'Edit Data Panjar', icon: <EditOutlined /> },
          { type: 'divider' },
          { key: 'delete', label: 'Hapus Panjar', icon: <DeleteOutlined />, danger: true },
        ];
        return (
          <Dropdown
            menu={{
              items,
              onClick: ({ key }) => {
                if (key === 'view') {
                  setViewRecord(record);
                  setViewOpen(true);
                }
                if (key === 'print') handlePrintPdf(record);
                if (key === 'edit') handleOpenModal(record);
                if (key === 'submit_ppk') handleSubmitToPpk(record);
                if (key === 'val_ppk') handleOpenValidation(record, 'ppk');
                if (key === 'val_bendahara') handleOpenValidation(record, 'bendahara');
                if (key === 'copy_link_ppk') handleCopyValidationLink(record, 'ppk');
                if (key === 'copy_link_bendahara') handleCopyValidationLink(record, 'bendahara');
                if (key === 'delete') handleDelete(record);
              },
            }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button className="simkeu-row-action" icon={<MoreOutlined />}>
              Kelola
            </Button>
          </Dropdown>
        );
      },
    },
  ];

  return (
    <div className="panjar-module-container">
      {/* ── Status Quick Filter Ribbon ── */}
      <div className="klpj-status-ribbon">
        <button
          type="button"
          className={`klpj-ribbon-item ${selectedStatus === 'ALL' ? 'active' : ''}`}
          onClick={() => setSelectedStatus('ALL')}
        >
          <span>Semua Pengajuan</span>
          <strong>{dashboardMetrics.total}</strong>
        </button>
        <div className="klpj-ribbon-divider" />
        <button
          type="button"
          className={`klpj-ribbon-item ${selectedStatus === 'submitted' ? 'active' : ''}`}
          onClick={() => setSelectedStatus(selectedStatus === 'submitted' ? 'ALL' : 'submitted')}
        >
          <span className="status-indicator">
            <span className="status-dot submitted" />
            Menunggu PPK
          </span>
          <strong>{dashboardMetrics.menungguPpk}</strong>
        </button>
        <button
          type="button"
          className={`klpj-ribbon-item ${selectedStatus === 'approved_ppk' ? 'active' : ''}`}
          onClick={() => setSelectedStatus(selectedStatus === 'approved_ppk' ? 'ALL' : 'approved_ppk')}
        >
          <span className="status-indicator">
            <span className="status-dot submitted" />
            Menunggu Bendahara
          </span>
          <strong>{dashboardMetrics.menungguBendahara}</strong>
        </button>
        <button
          type="button"
          className={`klpj-ribbon-item ${selectedStatus === 'approved' || selectedStatus === 'paid' ? 'active' : ''}`}
          onClick={() => setSelectedStatus(selectedStatus === 'approved' ? 'ALL' : 'approved')}
        >
          <span className="status-indicator">
            <span className="status-dot success" />
            Disetujui / Dibayar
          </span>
          <strong>{dashboardMetrics.selesai}</strong>
        </button>
        <button
          type="button"
          className={`klpj-ribbon-item ${selectedStatus === 'rejected' ? 'active' : ''}`}
          onClick={() => setSelectedStatus(selectedStatus === 'rejected' ? 'ALL' : 'rejected')}
        >
          <span className="status-indicator">
            <span className="status-dot rejected" />
            Ditolak
          </span>
          <strong>{dashboardMetrics.ditolak}</strong>
        </button>
        <button
          type="button"
          className={`klpj-ribbon-item ${selectedStatus === 'draft' ? 'active' : ''}`}
          onClick={() => setSelectedStatus(selectedStatus === 'draft' ? 'ALL' : 'draft')}
        >
          <span className="status-indicator">
            <span className="status-dot draft" />
            Draft
          </span>
          <strong>{dashboardMetrics.draft}</strong>
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', paddingRight: 8 }}>
          <span>Total Nilai Panjar:</span>
          <strong style={{ color: '#0F5B99', fontWeight: 700, fontFamily: 'ui-monospace, monospace' }}>
            {formatCurrency(dashboardMetrics.nilai)}
          </strong>
        </div>
      </div>

      {/* ── Toolbar & Filter Box (Surat Tugas Standard) ── */}
      <Card variant="borderless" style={{ borderRadius: 8 }} styles={{ body: { padding: '12px 16px' } }} className="panjar-toolbar-card">
        <Row gutter={[10, 10]} align="middle">
          {/* Search */}
          <Col xs={24} sm={12} md={6} lg={6}>
            <Input
              allowClear
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              placeholder="Cari nomor panjar, kode akun, kegiatan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Col>

          {/* Date Range Popover */}
          <Col xs={24} sm={12} md={5} lg={5}>
            <Popover
              trigger="click"
              open={datePopoverOpen}
              onOpenChange={setDatePopoverOpen}
              placement="bottomLeft"
              content={
                <Space direction="vertical" size={10} style={{ padding: 4 }}>
                  <Text strong style={{ fontSize: 12 }}>
                    Pilih Range Tanggal Pengajuan
                  </Text>
                  <DatePicker.RangePicker format="DD/MM/YYYY" value={dateRange} onChange={(val) => setDateRange(val)} allowClear />
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
                    <Button size="small" type="primary" onClick={() => setDatePopoverOpen(false)}>
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

          {/* Actions & Add Button */}
          <Col xs={24} sm={24} md={5} lg={7} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Button icon={<FilterOutlined />} onClick={handleResetFilter}>
              Reset
            </Button>
            <Tooltip title="Segarkan Data">
              <Button icon={<ReloadOutlined />} onClick={fetchPanjar} />
            </Tooltip>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
              + Tambah Panjar
            </Button>
          </Col>
        </Row>
      </Card>

      {/* ── Table Card ── */}
      <Card variant="borderless" style={{ borderRadius: 8 }} styles={{ body: { padding: 0 } }} className="panjar-main-card">
        <Table
          rowKey="id"
          className="panjar-table"
          loading={loading}
          columns={columns}
          dataSource={data}
          size="middle"
          scroll={{ x: 1180 }}
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            showLessItems: true,
            responsive: true,
            pageSizeOptions: ['10', '25', '50', '100'],
            showTotal: (total, range) => `${range[0]}-${range[1]} dari ${total} data`,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span className="simkeu-empty-copy">
                    <strong>Belum ada permintaan panjar</strong>
                    <small>Buat permintaan baru atau sesuaikan filter pencarian.</small>
                  </span>
                }
              />
            ),
          }}
        />
      </Card>

      {/* ── Create/Edit Modal ── */}
      <Modal
        title={null}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        width={1040}
        destroyOnClose
        centered
        footer={null}
        className="panjar-modal"
      >
        <button className="panjar-modal-close" onClick={() => setModalOpen(false)} title="Tutup">
          <CloseOutlined />
        </button>

        <div className="panjar-modal-wrap">
          <div className="panjar-modal-header">
            <div>
              <h3 className="panjar-modal-title">
                {mode === 'edit' ? 'Edit Permintaan Panjar' : 'Buat Permintaan Panjar Baru'}
              </h3>
              <span className="panjar-modal-sub">
                Isi rincian kebutuhan uang muka kegiatan operasional & nomor WhatsApp untuk notifikasi otomatis
              </span>
            </div>
          </div>

          <div className="panjar-modal-body">
            <Form layout="vertical" form={form}>
              {/* Section 1: Meta */}
              <div className="panjar-section-box">
                <span className="panjar-section-lbl">1. Detail Agenda & Anggaran</span>
                <Row gutter={12}>
                  <Col xs={24} md={6}>
                    <Form.Item label="Tahun Anggaran" name="tahun_anggaran">
                      <InputNumber style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={6}>
                    <Form.Item label="Tanggal Pengajuan" name="tanggal_pengajuan">
                      <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={6}>
                    <Form.Item label="Nomor Panjar" name="panjar_no">
                      <Input placeholder="Auto jika kosong" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={6}>
                    <Form.Item label="Status Awal" name="status">
                      <Select
                        options={[
                          { label: 'Langsung Ajukan ke PPK', value: 'submitted' },
                          { label: 'Simpan sebagai Draft', value: 'draft' },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={12}>
                  <Col xs={24} md={8}>
                    <Form.Item label="Kode Akun" name="mak">
                      <Input placeholder="Contoh: 3165.BKB.053.001" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item label="Pegawai Penerima / Pemohon" name="penerima_name" rules={[{ required: true, message: 'Pilih penerima' }]}>
                      <Select
                        showSearch
                        optionFilterProp="label"
                        placeholder="Pilih pegawai..."
                        options={employees.map((e) => ({
                          label: `${e.name}${e.nip ? ` (${e.nip})` : ''}`,
                          value: e.name,
                        }))}
                        onChange={(name) => {
                          const emp = employees.find((e) => e.name === name);
                          if (emp?.phone_number && !form.getFieldValue('requester_phone')) {
                            form.setFieldValue('requester_phone', emp.phone_number);
                          }
                        }}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item
                      label="No. WhatsApp Pemohon (Notifikasi)"
                      name="requester_phone"
                      extra="Untuk notifikasi persetujuan/penolakan"
                    >
                      <Input prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />} placeholder="Contoh: 08123456789" />
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
                            <Input placeholder="Pos rincian (contoh: BBM / Uang Harian)" />
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
                <div />
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
        width={880}
        centered
        destroyOnClose
        className="panjar-modal"
      >
        <button className="panjar-modal-close" onClick={() => setViewOpen(false)} title="Tutup">
          <CloseOutlined />
        </button>

        {viewRecord && (
          <div className="panjar-modal-wrap">
            <div className="panjar-modal-header">
              <div>
                <h3 className="panjar-modal-title">{viewRecord.panjar_no || viewRecord.ticket_no}</h3>
                <span className="panjar-modal-sub">Detail Permintaan Panjar & Catatan Validasi Alur</span>
              </div>
              {renderStatus(viewRecord)}
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
                    <Text className="panjar-meta-k">Kode Akun & TA</Text>
                    <p className="panjar-meta-v">{viewRecord.mak || '-'} (TA {viewRecord.tahun_anggaran})</p>
                  </Col>
                  <Col xs={24} md={12}>
                    <Text className="panjar-meta-k">Pegawai Penerima (Pemohon)</Text>
                    <p className="panjar-meta-v">
                      {viewRecord.penerima_name || '-'}
                      {viewRecord.requester_phone && ` (WA: ${viewRecord.requester_phone})`}
                    </p>
                  </Col>
                  <Col xs={24} md={12}>
                    <Text className="panjar-meta-k">Nomor Surat Tugas</Text>
                    <p className="panjar-meta-v">{viewRecord.surat_tugas_no || '-'}</p>
                  </Col>
                  <Col xs={24} md={12}>
                    <Text className="panjar-meta-k">Periode Kegiatan</Text>
                    <p className="panjar-meta-v">
                      {viewRecord.tanggal_mulai_kegiatan
                        ? dayjs(viewRecord.tanggal_mulai_kegiatan).format('DD/MM/YYYY')
                        : '-'}{' '}
                      s.d.{' '}
                      {viewRecord.tanggal_akhir_kegiatan
                        ? dayjs(viewRecord.tanggal_akhir_kegiatan).format('DD/MM/YYYY')
                        : '-'}
                    </p>
                  </Col>
                </Row>
              </div>

              {/* Riwayat Validasi */}
              {(viewRecord.ppk_action_at || viewRecord.bendahara_action_at || viewRecord.ppk_notes || viewRecord.bendahara_notes) && (
                <div className="panjar-section-box">
                  <span className="panjar-section-lbl">Riwayat Persetujuan / Catatan Pejabat</span>
                  <Row gutter={[12, 12]}>
                    {viewRecord.ppk_action_at && (
                      <Col xs={24} md={12}>
                        <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <strong style={{ fontSize: 12 }}>PPK: {viewRecord.ppk_name || '-'}</strong>
                            <Tag color={viewRecord.ppk_status === 'approved' ? 'success' : 'error'}>
                              {viewRecord.ppk_status === 'approved' ? 'Disetujui' : 'Ditolak'}
                            </Tag>
                          </div>
                          {viewRecord.ppk_notes && (
                            <p style={{ margin: '4px 0', fontSize: 12, fontStyle: 'italic', color: '#334155' }}>
                              "{viewRecord.ppk_notes}"
                            </p>
                          )}
                          <span style={{ fontSize: 11, color: '#64748b' }}>
                            {dayjs(viewRecord.ppk_action_at).format('DD/MM/YYYY HH:mm')} WITA
                          </span>
                        </div>
                      </Col>
                    )}

                    {viewRecord.bendahara_action_at && (
                      <Col xs={24} md={12}>
                        <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <strong style={{ fontSize: 12 }}>Bendahara: {viewRecord.bendahara_name || '-'}</strong>
                            <Tag color={viewRecord.bendahara_status === 'approved' ? 'success' : 'error'}>
                              {viewRecord.bendahara_status === 'approved' ? 'Disetujui' : 'Ditolak'}
                            </Tag>
                          </div>
                          {viewRecord.bendahara_notes && (
                            <p style={{ margin: '4px 0', fontSize: 12, fontStyle: 'italic', color: '#334155' }}>
                              "{viewRecord.bendahara_notes}"
                            </p>
                          )}
                          <span style={{ fontSize: 11, color: '#64748b' }}>
                            {dayjs(viewRecord.bendahara_action_at).format('DD/MM/YYYY HH:mm')} WITA
                          </span>
                        </div>
                      </Col>
                    )}
                  </Row>
                </div>
              )}

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
                <Space>
                  <Button icon={<CopyOutlined />} onClick={() => handleCopyValidationLink(viewRecord, 'ppk')}>
                    Salin Link PPK
                  </Button>
                  <Button icon={<CopyOutlined />} onClick={() => handleCopyValidationLink(viewRecord, 'bendahara')}>
                    Salin Link Bendahara
                  </Button>
                </Space>
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

      {/* ── Inline Dashboard Validation Modal ── */}
      <Modal
        title={null}
        open={valModalOpen}
        onCancel={() => setValModalOpen(false)}
        footer={null}
        width={560}
        centered
        destroyOnClose
        className="panjar-modal"
      >
        <button className="panjar-modal-close" onClick={() => setValModalOpen(false)} title="Tutup">
          <CloseOutlined />
        </button>

        {valRecord && (
          <div className="panjar-modal-wrap">
            <div className="panjar-modal-header">
              <div>
                <h3 className="panjar-modal-title">
                  Validasi Panjar ({valTargetRole === 'bendahara' ? 'Bendahara Pengeluaran' : 'PPK'})
                </h3>
                <span className="panjar-modal-sub">
                  No. Panjar: {valRecord.panjar_no || valRecord.ticket_no} • Total: {formatCurrency(valRecord.nominal_panjar)}
                </span>
              </div>
            </div>

            <div className="panjar-modal-body" style={{ padding: '16px 20px' }}>
              <Form layout="vertical" form={valForm}>
                <Form.Item label="Keputusan Validasi" name="action" required>
                  <Radio.Group style={{ width: '100%', display: 'flex' }} buttonStyle="solid">
                    <Radio.Button value="approve" style={{ flex: 1, textAlign: 'center' }}>
                      <CheckOutlined style={{ marginRight: 6 }} />
                      Setujui
                    </Radio.Button>
                    <Radio.Button value="reject" style={{ flex: 1, textAlign: 'center' }}>
                      <CloseOutlined style={{ marginRight: 6 }} />
                      Tolak
                    </Radio.Button>
                  </Radio.Group>
                </Form.Item>

                <Form.Item label="Nama Pejabat / Verifikator" name="verifier_name" rules={[{ required: true, message: 'Wajib diisi' }]}>
                  <Input placeholder="Nama verifikator..." />
                </Form.Item>

                <Form.Item
                  label={
                    valActionValue === 'reject' ? (
                      <span style={{ color: '#ef4444', fontWeight: 600 }}>Alasan Penolakan (Wajib diisi)</span>
                    ) : (
                      'Catatan / Keterangan (Opsional)'
                    )
                  }
                  name="notes"
                  rules={[{ required: valActionValue === 'reject', message: 'Alasan penolakan wajib diisi' }]}
                >
                  <Input.TextArea
                    rows={3}
                    placeholder={
                      valActionValue === 'reject'
                        ? 'Contoh: Tidak tersedia uang di bendahara / pagu akun tidak mencukupi...'
                        : 'Catatan persetujuan jika ada...'
                    }
                  />
                </Form.Item>

                <div className="panjar-modal-footer" style={{ marginTop: 20 }}>
                  <Button onClick={() => setValModalOpen(false)}>Batal</Button>
                  <Button
                    type="primary"
                    danger={valActionValue === 'reject'}
                    loading={saving}
                    icon={valActionValue === 'approve' ? <CheckOutlined /> : <CloseOutlined />}
                    onClick={handleSaveValidation}
                  >
                    {valActionValue === 'approve' ? 'Simpan Persetujuan' : 'Simpan Penolakan'}
                  </Button>
                </div>
              </Form>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
