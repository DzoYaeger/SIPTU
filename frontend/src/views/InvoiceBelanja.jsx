import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  App as AntdApp,
  Button,
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
  Card,
  Row,
  Col,
  Divider,
  Popconfirm,
  Statistic,
  Badge,
  Descriptions,
  Tabs,
  Empty,
  Dropdown,
} from 'antd';
import { buildMessageAdapter } from '../utils/notify.js';
import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  PrinterOutlined,
  FileTextOutlined,
  DollarOutlined,
  CalculatorOutlined,
  EyeOutlined,
  FilterOutlined,
  ReloadOutlined,
  SearchOutlined,
  BankOutlined,
  UserOutlined,
  FileProtectOutlined,
  SafetyCertificateOutlined,
  MoreOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth.js';
import useDebounce from '../hooks/useDebounce.js';
import './InvoiceBelanja.css';

const { Title, Text } = Typography;

const formatCurrency = (value) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
}).format(value ?? 0);

const penyebut = (nilai) => {
  nilai = Math.abs(Number(nilai) || 0);
  const huruf = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  let temp = "";
  if (nilai < 12) {
    temp = " " + huruf[Math.floor(nilai)];
  } else if (nilai < 20) {
    temp = penyebut(nilai - 10) + " Belas";
  } else if (nilai < 100) {
    temp = penyebut(Math.floor(nilai / 10)) + " Puluh" + penyebut(nilai % 10);
  } else if (nilai < 200) {
    temp = " Seratus" + penyebut(nilai - 100);
  } else if (nilai < 1000) {
    temp = penyebut(Math.floor(nilai / 100)) + " Ratus" + penyebut(nilai % 100);
  } else if (nilai < 2000) {
    temp = " Seribu" + penyebut(nilai - 1000);
  } else if (nilai < 1000000) {
    temp = penyebut(Math.floor(nilai / 1000)) + " Ribu" + penyebut(nilai % 1000);
  } else if (nilai < 1000000000) {
    temp = penyebut(Math.floor(nilai / 1000000)) + " Juta" + penyebut(nilai % 1000000);
  } else if (nilai < 1000000000000) {
    temp = penyebut(Math.floor(nilai / 1000000000)) + " Milyar" + penyebut(nilai % 1000000000);
  }
  return temp;
};

const numberToTerbilang = (nilai) => {
  const result = penyebut(nilai).replace(/\s+/g, ' ').trim();
  return result ? result + " Rupiah" : "Nol Rupiah";
};

const COMMON_TAX_TYPES = [
  { label: 'PPN 11%', value: 'PPN 11%', rate: 11 },
  { label: 'PPh Pasal 21 (5%)', value: 'PPh Pasal 21', rate: 5 },
  { label: 'PPh Pasal 22 (1.5%)', value: 'PPh Pasal 22', rate: 1.5 },
  { label: 'PPh Pasal 23 (2%)', value: 'PPh Pasal 23', rate: 2 },
  { label: 'PPh Final (0.5%)', value: 'PPh Final 0.5%', rate: 0.5 },
  { label: 'Pajak Daerah (10%)', value: 'Pajak Daerah 10%', rate: 10 },
  { label: 'Lainnya (Custom)', value: 'Pajak Lainnya', rate: 0 },
];

export default function InvoiceBelanja() {
  const { apiFetch } = useAuth();
  const { message } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);
  const [form] = Form.useForm();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [openViewModal, setOpenViewModal] = useState(false);
  const [mode, setMode] = useState('create');
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTa, setSelectedTa] = useState('ALL');
  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  // Form values watching for live calculations
  const nilaiKotorValue = Form.useWatch('nilai_kotor', form) || 0;
  const taxesValue = Form.useWatch('taxes', form) || [];

  const totalPajakCalc = useMemo(() => {
    return (taxesValue || []).reduce((sum, item) => sum + (Number(item?.nilai_pajak) || 0), 0);
  }, [taxesValue]);

  const nilaiBersihCalc = useMemo(() => {
    return Math.max(0, (Number(nilaiKotorValue) || 0) - totalPajakCalc);
  }, [nilaiKotorValue, totalPajakCalc]);

  const terbilangCalc = useMemo(() => {
    return numberToTerbilang(nilaiBersihCalc);
  }, [nilaiBersihCalc]);

  const [pejabatSetting, setPejabatSetting] = useState(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearchTerm) {
        params.append('search', debouncedSearchTerm);
      }
      const response = await apiFetch(`/invoices?${params.toString()}`);
      if (response.ok) {
        const resData = await response.json();
        setData(resData.data?.data || []);
      }
    } catch (error) {
      notification.error('Gagal mengambil data invoice');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, debouncedSearchTerm, notification]);

  const fetchPejabatSetting = useCallback(async () => {
    try {
      const response = await apiFetch('/pejabat-perbendaharaan');
      if (response.ok) {
        const resData = await response.json();
        setPejabatSetting(resData.setting || null);
      }
    } catch (e) {
      console.warn('Gagal memuat pejabat perbendaharaan', e);
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchInvoices();
    fetchPejabatSetting();
  }, [fetchInvoices, fetchPejabatSetting]);

  // Filtered dataset based on selected fiscal year TA
  const filteredData = useMemo(() => {
    if (selectedTa === 'ALL') return data;
    return data.filter(item => String(item.tahun_anggaran) === String(selectedTa));
  }, [data, selectedTa]);

  // Calculate Metrics
  const metrics = useMemo(() => {
    const totalCount = filteredData.length;
    let totalGross = 0;
    let totalPajak = 0;
    let totalNet = 0;

    filteredData.forEach(item => {
      const gross = Number(item.nilai_kotor) || 0;
      const net = Number(item.nilai_bersih) || 0;
      const itemTaxTotal = (item.taxes || []).reduce((acc, t) => acc + (Number(t.nilai_pajak) || 0), 0);

      totalGross += gross;
      totalPajak += itemTaxTotal;
      totalNet += net;
    });

    return { totalCount, totalGross, totalPajak, totalNet };
  }, [filteredData]);

  const handleOpenModal = (record = null) => {
    const ppkDefaultName = pejabatSetting?.ppk?.name || 'DODDY PRAYUDI, A.Md';
    const ppkDefaultNip = pejabatSetting?.ppk?.nip ? `NIP. ${pejabatSetting.ppk.nip}` : '-';
    const bendaharaDefaultName = pejabatSetting?.bendahara?.name || 'NUR INDAH, S.Sos';
    const bendaharaDefaultNip = pejabatSetting?.bendahara?.nip ? `NIP. ${pejabatSetting.bendahara.nip}` : '-';

    if (record) {
      setMode('edit');
      setActiveInvoice(record);
      form.setFieldsValue({
        tahun_anggaran: record.tahun_anggaran,
        invoice_no: record.invoice_no,
        mak: record.mak,
        deskripsi: record.deskripsi,
        nilai_kotor: record.nilai_kotor,
        ppk_name: record.ppk_name || ppkDefaultName,
        ppk_nip: record.ppk_nip || ppkDefaultNip,
        bendahara_name: record.bendahara_name || bendaharaDefaultName,
        bendahara_nip: record.bendahara_nip || bendaharaDefaultNip,
        penerima_name: record.penerima_name || '',
        taxes: (record.taxes && record.taxes.length > 0)
          ? record.taxes.map(t => ({
              jenis_pajak: t.jenis_pajak,
              nilai_pajak: t.nilai_pajak,
              tax_rate: t.tax_rate,
            }))
          : [{ jenis_pajak: 'PPN 11%', nilai_pajak: 0, tax_rate: 11 }],
      });
    } else {
      setMode('create');
      setActiveInvoice(null);
      form.resetFields();
      form.setFieldsValue({
        tahun_anggaran: new Date().getFullYear(),
        invoice_no: `INV/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${Math.floor(1000 + Math.random() * 9000)}`,
        ppk_name: ppkDefaultName,
        ppk_nip: ppkDefaultNip,
        bendahara_name: bendaharaDefaultName,
        bendahara_nip: bendaharaDefaultNip,
        taxes: [{ jenis_pajak: 'PPN 11%', nilai_pajak: 0, tax_rate: 11 }],
      });
    }
    setOpenModal(true);
  };

  const handleOpenViewModal = (record) => {
    setViewInvoice(record);
    setOpenViewModal(true);
  };

  const handleTaxTypeChange = (value, index) => {
    const matched = COMMON_TAX_TYPES.find(t => t.value === value);
    if (matched && matched.rate > 0) {
      const currentGross = form.getFieldValue('nilai_kotor') || 0;
      const calculatedTax = Math.round((currentGross * matched.rate) / 100);
      const currentTaxes = form.getFieldValue('taxes') || [];
      currentTaxes[index] = {
        ...currentTaxes[index],
        jenis_pajak: value,
        tax_rate: matched.rate,
        nilai_pajak: calculatedTax,
      };
      form.setFieldsValue({ taxes: currentTaxes });
    }
  };

  const applyQuickTaxPreset = (taxOption) => {
    const currentGross = form.getFieldValue('nilai_kotor') || 0;
    const calculatedTax = taxOption.rate > 0 ? Math.round((currentGross * taxOption.rate) / 100) : 0;

    const currentTaxes = form.getFieldValue('taxes') || [];
    // Check if already exists
    const existingIndex = currentTaxes.findIndex(t => t?.jenis_pajak === taxOption.value);
    if (existingIndex >= 0) {
      currentTaxes[existingIndex] = {
        jenis_pajak: taxOption.value,
        tax_rate: taxOption.rate,
        nilai_pajak: calculatedTax,
      };
    } else {
      currentTaxes.push({
        jenis_pajak: taxOption.value,
        tax_rate: taxOption.rate,
        nilai_pajak: calculatedTax,
      });
    }
    form.setFieldsValue({ taxes: [...currentTaxes] });
    message.success(`Berhasil menambahkan preset ${taxOption.label}`);
  };

  const recalculateAllTaxesWithGross = (newGross) => {
    const currentTaxes = form.getFieldValue('taxes') || [];
    if (!currentTaxes.length) return;

    const updated = currentTaxes.map(t => {
      const matched = COMMON_TAX_TYPES.find(opt => opt.value === t.jenis_pajak);
      if (matched && matched.rate > 0) {
        return {
          ...t,
          tax_rate: matched.rate,
          nilai_pajak: Math.round(((Number(newGross) || 0) * matched.rate) / 100),
        };
      }
      return t;
    });
    form.setFieldsValue({ taxes: updated });
  };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      const url = mode === 'create' ? '/invoices' : `/invoices/${activeInvoice.id}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      const response = await apiFetch(url, {
        method,
        body: JSON.stringify(values),
      });

      if (response.ok) {
        notification.success(mode === 'create' ? 'Invoice berhasil dibuat' : 'Invoice berhasil diperbarui');
        setOpenModal(false);
        fetchInvoices();
      } else {
        const err = await response.json();
        notification.error(err.message || 'Gagal menyimpan invoice');
      }
    } catch (error) {
      notification.error('Terjadi kesalahan jaringan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await apiFetch(`/invoices/${id}`, { method: 'DELETE' });
      if (response.ok) {
        notification.success('Invoice berhasil dihapus');
        fetchInvoices();
      }
    } catch (error) {
      notification.error('Gagal menghapus invoice');
    }
  };

  const handlePrintPdfF4 = async (record) => {
    try {
      message.loading({ content: 'Menyiapkan dokumen F4 PDF...', key: 'invoice_pdf' });
      const response = await apiFetch(`/invoices/${record.id}/export-pdf`, {
        method: 'GET',
        headers: { Accept: 'application/pdf' },
      });

      if (!response.ok) {
        throw new Error('Gagal mengunduh PDF invoice');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BUKTI_PEMBELIAN_${(record.invoice_no || record.ticket_no || 'INV').replace(/[\/\\]/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      message.success({ content: 'Dokumen PDF F4 berhasil diunduh.', key: 'invoice_pdf' });
    } catch (err) {
      console.error(err);
      message.error({ content: 'Gagal mencetak dokumen PDF F4.', key: 'invoice_pdf' });
    }
  };

  const columns = [
    {
      title: 'Nomor Bukti / Invoice',
      dataIndex: 'invoice_no',
      key: 'invoice_no',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: '#1e40af', fontSize: 13 }}>{text || record.ticket_no}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>TA: {record.tahun_anggaran}</Text>
        </Space>
      ),
    },
    {
      title: 'MAK',
      dataIndex: 'mak',
      key: 'mak',
      render: (text) => (
        <Tag color="cyan" style={{ borderRadius: 6, fontWeight: 500 }}>
          {text || '-'}
        </Tag>
      ),
    },
    {
      title: 'Uraian Belanja',
      dataIndex: 'deskripsi',
      key: 'deskripsi',
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <Text style={{ fontSize: 13, color: '#334155' }}>{text}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'Jumlah Nota (Gross)',
      dataIndex: 'nilai_kotor',
      key: 'nilai_kotor',
      align: 'right',
      render: (val) => <Text strong style={{ color: '#1e293b' }}>{formatCurrency(val)}</Text>,
    },
    {
      title: 'Rincian Pajak',
      dataIndex: 'taxes',
      key: 'taxes',
      render: (taxes) => (
        <Space direction="vertical" size={2}>
          {taxes && taxes.length > 0 ? (
            taxes.map((t, idx) => (
              <Tag key={idx} color="orange" className="tax-tag">
                {t.jenis_pajak}: {formatCurrency(t.nilai_pajak)}
              </Tag>
            ))
          ) : (
            <Tag color="default" className="tax-tag">Tanpa Pajak</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Jumlah Dibayarkan (Net)',
      dataIndex: 'nilai_bersih',
      key: 'nilai_bersih',
      align: 'right',
      render: (val) => (
        <Text strong style={{ color: '#059669', fontSize: 14 }}>
          {formatCurrency(val)}
        </Text>
      ),
    },
    {
      title: 'Aksi & Cetak',
      key: 'actions',
      align: 'center',
      render: (_, record) => {
        const actionMenuItems = [
          {
            key: 'view',
            icon: <EyeOutlined style={{ color: '#2563eb' }} />,
            label: <span style={{ color: '#2563eb', fontWeight: 500 }}>Pratinjau Detail</span>,
            onClick: () => handleOpenViewModal(record),
          },
          {
            key: 'edit',
            icon: <EditOutlined style={{ color: '#d97706' }} />,
            label: <span style={{ color: '#d97706', fontWeight: 500 }}>Edit Invoice</span>,
            onClick: () => handleOpenModal(record),
          },
          {
            type: 'divider',
          },
          {
            key: 'delete',
            icon: <DeleteOutlined style={{ color: '#dc2626' }} />,
            label: <span style={{ color: '#dc2626', fontWeight: 500 }}>Hapus Invoice</span>,
            danger: true,
            onClick: () => {
              Modal.confirm({
                title: 'Hapus Invoice?',
                content: `Apakah Anda yakin ingin menghapus invoice ${record.invoice_no || record.ticket_no}?`,
                okText: 'Ya, Hapus',
                okType: 'danger',
                cancelText: 'Batal',
                onOk: () => handleDelete(record.id),
              });
            },
          },
        ];

        return (
          <Space size={6}>
            <Tooltip title="Cetak Bukti Pembelian (Kertas F4 PDF)">
              <Button
                className="action-btn-print"
                icon={<PrinterOutlined />}
                size="small"
                onClick={() => handlePrintPdfF4(record)}
              />
            </Tooltip>

            <Dropdown menu={{ items: actionMenuItems }} trigger={['click']} placement="bottomRight">
              <Tooltip title="Aksi Menu">
                <Button
                  size="small"
                  icon={<MoreOutlined />}
                  style={{ borderRadius: 8 }}
                />
              </Tooltip>
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  return (
    <div className="invoice-container">
      {/* Header Banner */}
      <Card className="invoice-header-card">
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} md={16}>
            <Space align="center" size="middle">
              <div className="icon-avatar">
                <FileTextOutlined style={{ fontSize: 26, color: '#2563eb' }} />
              </div>
              <div>
                <Title level={4} style={{ margin: 0, color: '#0f172a' }}>
                  Pembuatan & Kelola Invoice Belanja
                </Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Manajemen Bukti Pembelian dengan Dukungan Multi-Pajak Dinamis & Cetak Format F4/Folio
                </Text>
              </div>
            </Space>
          </Col>
          <Col xs={24} md={8} style={{ textAlign: 'right' }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              onClick={() => handleOpenModal()}
              style={{
                borderRadius: 12,
                backgroundColor: '#2563eb',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                fontWeight: 600,
              }}
            >
              + Buat Invoice Baru
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Metric Cards Grid */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="metric-card" bodyStyle={{ padding: 16 }}>
            <Row align="middle" justify="space-between">
              <Col>
                <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Total Invoice
                </Text>
                <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
                  {metrics.totalCount} <span style={{ fontSize: 13, fontWeight: 400 }}>Nota</span>
                </Title>
              </Col>
              <Col className="metric-icon-wrapper metric-blue">
                <FileProtectOutlined />
              </Col>
            </Row>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="metric-card" bodyStyle={{ padding: 16 }}>
            <Row align="middle" justify="space-between">
              <Col>
                <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Total Nominal Gross
                </Text>
                <Title level={4} style={{ margin: 0, color: '#1e293b' }}>
                  {formatCurrency(metrics.totalGross)}
                </Title>
              </Col>
              <Col className="metric-icon-wrapper metric-indigo">
                <CalculatorOutlined />
              </Col>
            </Row>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="metric-card" bodyStyle={{ padding: 16 }}>
            <Row align="middle" justify="space-between">
              <Col>
                <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Total Potongan Pajak
                </Text>
                <Title level={4} style={{ margin: 0, color: '#e11d48' }}>
                  {formatCurrency(metrics.totalPajak)}
                </Title>
              </Col>
              <Col className="metric-icon-wrapper metric-rose">
                <DollarOutlined />
              </Col>
            </Row>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="metric-card" bodyStyle={{ padding: 16 }}>
            <Row align="middle" justify="space-between">
              <Col>
                <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Total Dibayarkan (Net)
                </Text>
                <Title level={4} style={{ margin: 0, color: '#059669' }}>
                  {formatCurrency(metrics.totalNet)}
                </Title>
              </Col>
              <Col className="metric-icon-wrapper metric-emerald">
                <SafetyCertificateOutlined />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Main Table & Filter Container */}
      <Card className="invoice-table-card">
        <Row justify="space-between" align="middle" gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={12}>
            <Input
              placeholder="Cari nomor invoice, MAK, atau uraian belanja..."
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              allowClear
              size="middle"
              style={{ borderRadius: 10 }}
            />
          </Col>
          <Col xs={24} md={12} style={{ textAlign: 'right' }}>
            <Space wrap align="center">
              <Text style={{ fontSize: 13, color: '#64748b' }}>
                <FilterOutlined /> Filter TA:
              </Text>
              <Select
                value={selectedTa}
                onChange={(val) => setSelectedTa(val)}
                style={{ width: 130 }}
                options={[
                  { label: 'Semua TA', value: 'ALL' },
                  { label: 'TA 2026', value: '2026' },
                  { label: 'TA 2025', value: '2025' },
                  { label: 'TA 2024', value: '2024' },
                ]}
              />
              <Tooltip title="Muat Ulang Data">
                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchInvoices}
                  loading={loading}
                  style={{ borderRadius: 8 }}
                />
              </Tooltip>
            </Space>
          </Col>
        </Row>

        <Table
          className="invoice-table"
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total) => `Total ${total} data invoice`,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Belum ada data invoice belanja ditemukan"
              >
                <Button type="primary" size="small" onClick={() => handleOpenModal()}>
                  + Buat Invoice Pertama
                </Button>
              </Empty>
            ),
          }}
        />
      </Card>

      {/* 👁️ QUICK VIEW DETAIL MODAL */}
      <Modal
        title={
          <Space>
            <FileProtectOutlined style={{ color: '#2563eb' }} />
            <span>Rincian Invoice & Bukti Pembelian</span>
          </Space>
        }
        open={openViewModal}
        onCancel={() => setOpenViewModal(false)}
        footer={[
          <Button key="close" onClick={() => setOpenViewModal(false)}>
            Tutup
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            style={{ backgroundColor: '#059669', borderColor: '#059669' }}
            onClick={() => {
              if (viewInvoice) handlePrintPdfF4(viewInvoice);
            }}
          >
            Cetak PDF F4
          </Button>,
        ]}
        width={720}
        destroyOnClose
      >
        {viewInvoice && (
          <div style={{ padding: '4px 0' }}>
            {/* Top Invoice Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Nomor Invoice</Text>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#1e40af' }}>{viewInvoice.invoice_no}</div>
              </div>
              <Space wrap>
                <Tag color="blue" style={{ borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 500 }}>
                  TA {viewInvoice.tahun_anggaran}
                </Tag>
                <Tag color="cyan" style={{ borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 500 }}>
                  MAK: {viewInvoice.mak}
                </Tag>
              </Space>
            </div>

            {/* Uraian Belanja */}
            <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 10, marginBottom: 16, border: '1px solid #e2e8f0' }}>
              <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Uraian Pembayaran Belanja</Text>
              <div style={{ fontSize: 14, color: '#1e293b', marginTop: 4, fontWeight: 500, lineHeight: 1.5 }}>
                {viewInvoice.deskripsi}
              </div>
            </div>

            {/* Clean Financial Summary Bar */}
            <div style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              padding: '16px 20px',
              borderRadius: 12,
              border: '1px solid #86efac',
              marginBottom: 16,
            }}>
              <Row gutter={16} align="middle">
                <Col span={8}>
                  <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Jumlah Kotor</Text>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#334155' }}>
                    {formatCurrency(viewInvoice.nilai_kotor)}
                  </div>
                </Col>
                <Col span={8}>
                  <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Potongan Pajak</Text>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#dc2626' }}>
                    - {formatCurrency((viewInvoice.taxes || []).reduce((acc, t) => acc + (Number(t.nilai_pajak) || 0), 0))}
                  </div>
                </Col>
                <Col span={8} style={{ textAlign: 'right' }}>
                  <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Jumlah Net Dibayarkan</Text>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#059669' }}>
                    {formatCurrency(viewInvoice.nilai_bersih)}
                  </div>
                </Col>
              </Row>

              <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px dashed #a7f3d0', fontSize: 12, color: '#047857', fontStyle: 'italic' }}>
                <strong>Terbilang:</strong> "{numberToTerbilang(viewInvoice.nilai_bersih)}"
              </div>
            </div>

            {/* Tax Details List */}
            {viewInvoice.taxes && viewInvoice.taxes.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
                  Rincian Pemotongan Pajak:
                </Text>
                <Space wrap size={[8, 8]}>
                  {viewInvoice.taxes.map((t, idx) => (
                    <Tag key={idx} color="orange" style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12 }}>
                      <span style={{ fontWeight: 500 }}>{t.jenis_pajak}:</span> {formatCurrency(t.nilai_pajak)}
                    </Tag>
                  ))}
                </Space>
              </div>
            )}

            {/* Pejabat Signatories */}
            <div style={{ background: '#ffffff', padding: '14px 16px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 10 }}>
                Pejabat & Penerima Dana
              </Text>
              <Row gutter={16}>
                <Col span={8}>
                  <Text type="secondary" style={{ fontSize: 11 }}>PPK:</Text>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{viewInvoice.ppk_name || '-'}</div>
                  <Text type="secondary" style={{ fontSize: 11 }}>{viewInvoice.ppk_nip || '-'}</Text>
                </Col>
                <Col span={8}>
                  <Text type="secondary" style={{ fontSize: 11 }}>Bendahara:</Text>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{viewInvoice.bendahara_name || '-'}</div>
                  <Text type="secondary" style={{ fontSize: 11 }}>{viewInvoice.bendahara_nip || '-'}</Text>
                </Col>
                <Col span={8}>
                  <Text type="secondary" style={{ fontSize: 11 }}>Penerima / Penyedia:</Text>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{viewInvoice.penerima_name || '-'}</div>
                </Col>
              </Row>
            </div>
          </div>
        )}
      </Modal>

      {/* 📝 FORM MODAL PEMBUATAN / EDIT INVOICE */}
      <Modal
        title={
          <div className="modal-form-header">
            <CalculatorOutlined style={{ color: '#2563eb', fontSize: 20 }} />
            <span style={{ fontWeight: 600, fontSize: 16 }}>
              {mode === 'create' ? 'Buat Invoice & Bukti Pembelian Baru' : 'Edit Data Invoice Belanja'}
            </span>
          </div>
        }
        open={openModal}
        onCancel={() => setOpenModal(false)}
        footer={null}
        width={850}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: 12 }}
        >
          {/* 📌 SECTION 1: DATA UTAMA NOTA */}
          <Divider orientation="left" style={{ borderColor: '#cbd5e1', marginTop: 0, marginBottom: 16 }}>
            <Space>
              <FileTextOutlined style={{ color: '#2563eb' }} />
              <Text strong style={{ color: '#0f172a' }}>Data Utama Nota Belanja</Text>
            </Space>
          </Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="tahun_anggaran"
                label="Tahun Anggaran (TA)"
                rules={[{ required: true, message: 'Wajib diisi' }]}
              >
                <InputNumber style={{ width: '100%' }} placeholder="2026" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="invoice_no"
                label="Nomor Bukti / Invoice"
                rules={[{ required: true, message: 'Wajib diisi' }]}
              >
                <Input placeholder="INV/2026/07/001" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="mak"
                label="Mata Anggaran (MAK)"
                rules={[{ required: true, message: 'Wajib diisi' }]}
              >
                <Input placeholder="521111 - Belanja Keperluan Kantor" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="deskripsi"
            label="Uraian Pembayaran Belanja (Sesuai Kwitansi)"
            rules={[{ required: true, message: 'Uraian belanja wajib diisi' }]}
            extra="Uraian detail barang / jasa sebagaimana nota terlampir"
          >
            <Input.TextArea
              rows={2}
              placeholder="Contoh: Pembayaran Belanja Kertas HVS A4 80gr dan Alat Tulis Kantor..."
            />
          </Form.Item>

          <Form.Item
            name="nilai_kotor"
            label="Jumlah Nota / Kwitansi (Gross Total sebelum Pajak)"
            rules={[{ required: true, message: 'Nilai kotor nota wajib diisi' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              size="large"
              formatter={(val) => `Rp ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
              parser={(val) => val.replace(/Rp\s?|(\.*)/g, '')}
              placeholder="0"
              onChange={(val) => recalculateAllTaxesWithGross(val)}
            />
          </Form.Item>

          {/* 📌 SECTION 2: PEMOTONGAN PAJAK */}
          <Divider orientation="left" style={{ borderColor: '#cbd5e1', marginTop: 24, marginBottom: 16 }}>
            <Space>
              <DollarOutlined style={{ color: '#dc2626' }} />
              <Text strong style={{ color: '#0f172a' }}>Rincian Pemotongan Pajak (Multi-Pajak Dinamis)</Text>
            </Space>
          </Divider>

          <div style={{ marginBottom: 12 }}>
            <Text type="secondary" style={{ fontSize: 12, marginRight: 8 }}>Preset Pajak Cepat:</Text>
            <Space wrap align="center">
              {COMMON_TAX_TYPES.map((taxOpt, i) => (
                <div
                  key={i}
                  className="tax-preset-badge"
                  onClick={() => applyQuickTaxPreset(taxOpt)}
                >
                  + {taxOpt.label}
                </div>
              ))}
            </Space>
          </div>

          <Form.List name="taxes">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }, index) => (
                  <Card
                    key={key}
                    size="small"
                    style={{
                      marginBottom: 12,
                      backgroundColor: '#f8fafc',
                      borderRadius: 12,
                      borderColor: '#cbd5e1',
                    }}
                  >
                    <Row gutter={12} align="middle">
                      <Col span={10}>
                        <Form.Item
                          {...restField}
                          name={[name, 'jenis_pajak']}
                          label={`Jenis Pajak Baris #${index + 1}`}
                          rules={[{ required: true, message: 'Pilih jenis pajak' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <Select
                            placeholder="Pilih atau Ketik Jenis Pajak..."
                            showSearch
                            allowClear
                            options={COMMON_TAX_TYPES}
                            onChange={(val) => handleTaxTypeChange(val, name)}
                          />
                        </Form.Item>
                      </Col>

                      <Col span={11}>
                        <Form.Item
                          {...restField}
                          name={[name, 'nilai_pajak']}
                          label="Nilai Potongan Pajak (Rp)"
                          rules={[{ required: true, message: 'Isi nilai pajak' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <InputNumber
                            style={{ width: '100%' }}
                            formatter={(val) => `Rp ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                            parser={(val) => val.replace(/Rp\s?|(\.*)/g, '')}
                            placeholder="0"
                          />
                        </Form.Item>
                      </Col>

                      <Col span={3} style={{ textAlign: 'center', paddingTop: 22 }}>
                        {fields.length > 1 && (
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined style={{ color: '#dc2626' }} />}
                            onClick={() => remove(name)}
                          />
                        )}
                      </Col>
                    </Row>
                  </Card>
                ))}

                <Form.Item style={{ marginBottom: 0 }}>
                  <Button
                    type="dashed"
                    onClick={() => add({ jenis_pajak: 'PPh Pasal 23', nilai_pajak: 0 })}
                    block
                    icon={<PlusOutlined />}
                    style={{ borderRadius: 10, borderColor: '#2563eb', color: '#2563eb' }}
                  >
                    + Tambah Baris Pajak Baru
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          {/* 📌 SECTION 3: PEJABAT & PENERIMA */}
          <Divider orientation="left" style={{ borderColor: '#cbd5e1', marginTop: 24, marginBottom: 16 }}>
            <Space>
              <UserOutlined style={{ color: '#2563eb' }} />
              <Text strong style={{ color: '#0f172a' }}>Pejabat Perbendaharaan & Penerima Dana</Text>
            </Space>
          </Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Card size="small" title="Pejabat Pembuat Komitmen (PPK)" style={{ borderRadius: 10 }}>
                <Form.Item name="ppk_name" label="Nama PPK">
                  <Input placeholder="DODDY PRAYUDI, A.Md" />
                </Form.Item>
                <Form.Item name="ppk_nip" label="NIP PPK" style={{ marginBottom: 0 }}>
                  <Input placeholder="NIP. ..." />
                </Form.Item>
              </Card>
            </Col>

            <Col span={8}>
              <Card size="small" title="Bendahara Pengeluaran" style={{ borderRadius: 10 }}>
                <Form.Item name="bendahara_name" label="Nama Bendahara">
                  <Input placeholder="NUR INDAH, S.Sos" />
                </Form.Item>
                <Form.Item name="bendahara_nip" label="NIP Bendahara" style={{ marginBottom: 0 }}>
                  <Input placeholder="NIP. ..." />
                </Form.Item>
              </Card>
            </Col>

            <Col span={8}>
              <Card size="small" title="Penyedia / Penerima Dana" style={{ borderRadius: 10 }}>
                <Form.Item name="penerima_name" label="Nama Penerima / Penyedia" style={{ marginBottom: 0 }}>
                  <Input placeholder="CV. Mandiri Jaya / Toko Utama" />
                </Form.Item>
              </Card>
            </Col>
          </Row>

          {/* Live Summary Box */}
          <div className="calculation-summary-box">
            <Row justify="space-between" style={{ marginBottom: 6 }}>
              <Text style={{ color: '#334155' }}>Total Nota Kotor (Gross):</Text>
              <Text strong style={{ fontSize: 15 }}>{formatCurrency(nilaiKotorValue)}</Text>
            </Row>
            <Row justify="space-between" style={{ marginBottom: 6 }}>
              <Text style={{ color: '#dc2626' }}>
                Total Potongan Pajak ({taxesValue.length} rincian):
              </Text>
              <Text strong style={{ color: '#dc2626', fontSize: 15 }}>
                - {formatCurrency(totalPajakCalc)}
              </Text>
            </Row>
            <Divider style={{ margin: '10px 0' }} />
            <Row justify="space-between" align="middle">
              <Text strong style={{ fontSize: 15, color: '#065f46' }}>
                Jumlah Yang Dibayarkan (Bersih / Net):
              </Text>
              <Text strong style={{ fontSize: 20, color: '#059669' }}>
                {formatCurrency(nilaiBersihCalc)}
              </Text>
            </Row>

            <div className="terbilang-box">
              <strong>Terbilang:</strong> "{terbilangCalc}"
            </div>
          </div>

          <Form.Item style={{ marginTop: 20, textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setOpenModal(false)} style={{ borderRadius: 8 }}>
                Batal
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={saving}
                icon={<SaveOutlined />}
                style={{ borderRadius: 10, backgroundColor: '#059669', borderColor: '#059669', paddingLeft: 24, paddingRight: 24 }}
              >
                Simpan & Rekam Invoice
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
