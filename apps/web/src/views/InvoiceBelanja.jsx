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
  Empty,
  Dropdown,
} from 'antd';
import { buildMessageAdapter } from '../utils/notify.js';
import {
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
  UserOutlined,
  FileProtectOutlined,
  SafetyCertificateOutlined,
  MoreOutlined,
  SaveOutlined,
  TagOutlined,
  CalendarOutlined,
  CopyOutlined,
  CheckOutlined,
  ThunderboltOutlined,
  PercentageOutlined,
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
  const { apiFetch, user, currentRole } = useAuth();
  const isAdmin = user?.base_role === 'admin' || currentRole === 'admin';
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
  const [copiedId, setCopiedId] = useState(null);
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

  const handleCopyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    message.success('Nomor invoice disalin ke clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

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
    message.success(`Preset ${taxOption.label} diterapkan`);
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
        notification.success(mode === 'create' ? 'Invoice berhasil direkam' : 'Invoice berhasil diperbarui');
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
      title: 'No. Invoice',
      dataIndex: 'invoice_no',
      key: 'invoice_no',
      width: 190,
      render: (text, record) => {
        const displayNo = text || record.ticket_no;
        return (
          <div className="inv-no-cell">
            <div className="inv-no-text-row">
              <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '12px' }}>{displayNo}</span>
              <Tooltip title="Salin No. Invoice">
                <Button
                  type="text"
                  size="small"
                  icon={copiedId === record.id ? <CheckOutlined style={{ color: '#10b981' }} /> : <CopyOutlined style={{ color: '#94a3b8' }} />}
                  onClick={() => handleCopyText(displayNo, record.id)}
                  style={{ width: 18, height: 18, padding: 0 }}
                />
              </Tooltip>
            </div>
            <div className="inv-no-meta">
              <CalendarOutlined style={{ fontSize: 10, marginRight: 4 }} />
              <span>TA {record.tahun_anggaran}</span>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Uraian',
      dataIndex: 'deskripsi',
      key: 'deskripsi',
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <span style={{ fontSize: '12px', color: '#0f172a' }}>{text || '-'}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Net Dibayarkan',
      dataIndex: 'nilai_bersih',
      key: 'nilai_bersih',
      align: 'right',
      width: 160,
      render: (val) => (
        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '12px' }}>
          {formatCurrency(val)}
        </span>
      ),
    },
    {
      title: 'Aksi',
      key: 'actions',
      width: 60,
      align: 'center',
      render: (_, record) => {
        const actionMenuItems = [
          {
            key: 'view',
            icon: <EyeOutlined style={{ color: '#0f172a' }} />,
            label: 'Pratinjau Detail Invoice',
            onClick: () => handleOpenViewModal(record),
          },
          {
            key: 'print',
            icon: <PrinterOutlined style={{ color: '#0f172a' }} />,
            label: 'Cetak Bukti Pembelian F4 (PDF)',
            onClick: () => handlePrintPdfF4(record),
          },
          {
            key: 'edit',
            icon: <EditOutlined style={{ color: '#0f172a' }} />,
            label: 'Edit Data Invoice',
            onClick: () => handleOpenModal(record),
          },
          {
            type: 'divider',
          },
          {
            key: 'delete',
            icon: <DeleteOutlined style={{ color: '#ef4444' }} />,
            label: <span style={{ color: '#ef4444' }}>Hapus Invoice</span>,
            onClick: () => {
              Modal.confirm({
                title: 'Hapus Invoice Belanja?',
                content: `Apakah Anda yakin ingin menghapus invoice "${record.invoice_no || record.ticket_no}"?`,
                okText: 'Hapus',
                okButtonProps: { danger: true },
                cancelText: 'Batal',
                onOk: () => handleDelete(record.id),
              });
            },
          },
        ];

        return (
          <Dropdown menu={{ items: actionMenuItems }} trigger={['click']} placement="bottomRight">
            <Button type="text" shape="circle" icon={<MoreOutlined style={{ color: '#475569', fontSize: 16 }} />} />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <div style={{ padding: 4 }}>
      {/* Standar Ant Design Header Card */}
      <Card size="small" style={{ marginBottom: 16, borderRadius: 8 }}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} md={16}>
            <Space align="center" size="middle">
              <FileTextOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              <div>
                <Title level={4} style={{ margin: 0, fontWeight: 600 }}>
                  Invoice & Bukti Pembelian Belanja
                </Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Kelola bukti pembelian belanja, perincian pemotongan pajak dinamis, dan cetak dokumen resmi F4/Folio.
                </Text>
              </div>
            </Space>
          </Col>
          <Col xs={24} md={8} style={{ textAlign: 'right' }}>
            <Space align="center">
              {isAdmin ? (
                <Tag color="blue" icon={<SafetyCertificateOutlined />}>Mode Admin</Tag>
              ) : (
                <Tag color="green" icon={<UserOutlined />}>Mode Pegawai</Tag>
              )}
              <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
                + Buat Invoice Baru
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Ringkasan Statistik Quick Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Row justify="space-between" align="middle">
              <Col>
                <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 600 }}>Total Invoice</Text>
                <Title level={4} style={{ margin: 0, marginTop: 4, fontWeight: 700 }}>{metrics.totalCount}</Title>
              </Col>
              <Col>
                <FileTextOutlined style={{ fontSize: 26, color: '#1890ff' }} />
              </Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Row justify="space-between" align="middle">
              <Col>
                <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 600 }}>Total Nominal Gross</Text>
                <Title level={4} style={{ margin: 0, marginTop: 4, fontWeight: 700 }}>{formatCurrency(metrics.totalGross)}</Title>
              </Col>
              <Col>
                <DollarOutlined style={{ fontSize: 26, color: '#fa8c16' }} />
              </Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Row justify="space-between" align="middle">
              <Col>
                <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 600 }}>Total Potongan Pajak</Text>
                <Title level={4} style={{ margin: 0, marginTop: 4, fontWeight: 700 }}>{formatCurrency(metrics.totalPajak)}</Title>
              </Col>
              <Col>
                <PercentageOutlined style={{ fontSize: 26, color: '#f5222d' }} />
              </Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Row justify="space-between" align="middle">
              <Col>
                <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 600 }}>Total Net Dibayarkan</Text>
                <Title level={4} style={{ margin: 0, marginTop: 4, fontWeight: 700, color: '#389e0d' }}>{formatCurrency(metrics.totalNet)}</Title>
              </Col>
              <Col>
                <SafetyCertificateOutlined style={{ fontSize: 26, color: '#52c41a' }} />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Main Table & Filter Container */}
      <Card size="small" style={{ borderRadius: 8 }}>
        <Row justify="space-between" align="middle" gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={10}>
            <Input
              placeholder="Cari nomor invoice, kode akun, atau uraian belanja..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={14} style={{ textAlign: 'right' }}>
            <Space wrap align="center">
              <Text style={{ fontSize: 13, color: '#595959' }}>
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
                />
              </Tooltip>
            </Space>
          </Col>
        </Row>

        <Table
          className="inv-data-table"
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={loading}
          expandable={{
            expandedRowRender: (record) => (
              <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <Row gutter={[16, 12]}>
                  <Col xs={24} sm={12} md={6}>
                    <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: 2 }}>
                      Kode Akun
                    </Text>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>
                      {record.mak || '-'}
                    </span>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: 2 }}>
                      Nominal Gross
                    </Text>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>
                      {formatCurrency(record.nilai_kotor)}
                    </span>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: 2 }}>
                      Potongan Pajak
                    </Text>
                    <div style={{ fontSize: '12px', color: '#0f172a' }}>
                      {record.taxes && record.taxes.length > 0 ? (
                        record.taxes.map((t, idx) => (
                          <div key={idx}>
                            {t.jenis_pajak}: <strong>{formatCurrency(t.nilai_pajak)}</strong>
                          </div>
                        ))
                      ) : (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Tanpa Pajak</span>
                      )}
                    </div>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: 2 }}>
                      Dibuat Oleh
                    </Text>
                    <div style={{ fontSize: '12px', color: '#0f172a' }}>
                      <span style={{ fontWeight: 600 }}>{record.creator?.name || record.penerima_name || 'Pegawai'}</span>
                      {record.creator?.nip && <div style={{ fontSize: '11px', color: '#64748b' }}>NIP. {record.creator.nip}</div>}
                    </div>
                  </Col>
                </Row>
              </div>
            ),
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total) => `Menampilkan total ${total} invoice`,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Belum ada data invoice belanja ditemukan"
              >
                <Button type="primary" size="small" className="inv-create-empty-btn" onClick={() => handleOpenModal()}>
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
          <div className="inv-modal-title-box">
            <FileProtectOutlined className="inv-modal-title-icon" />
            <div>
              <div className="inv-modal-title-main">Rincian Invoice & Bukti Pembelian</div>
              <div className="inv-modal-title-sub">{viewInvoice?.invoice_no || viewInvoice?.ticket_no}</div>
            </div>
          </div>
        }
        open={openViewModal}
        onCancel={() => setOpenViewModal(false)}
        footer={[
          <Button key="close" className="inv-modal-close-btn" onClick={() => setOpenViewModal(false)}>
            Tutup
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            className="inv-modal-print-btn"
            onClick={() => {
              if (viewInvoice) handlePrintPdfF4(viewInvoice);
            }}
          >
            Cetak PDF F4
          </Button>,
        ]}
        width={720}
        centered
        destroyOnClose
      >
        {viewInvoice && (
          <div className="inv-view-container">
            {/* Top Invoice Header */}
            <div className="inv-view-header-bar">
              <div>
                <span className="inv-view-meta-label">Nomor Invoice</span>
                <div className="inv-view-code">{viewInvoice.invoice_no || viewInvoice.ticket_no}</div>
              </div>
              <Space wrap>
                <Tag color="blue" className="inv-view-tag">
                  TA {viewInvoice.tahun_anggaran}
                </Tag>
                <Tag color="geekblue" className="inv-view-tag">
                  Akun: {viewInvoice.mak}
                </Tag>
              </Space>
            </div>

            {/* Uraian Belanja */}
            <div className="inv-view-desc-card">
              <span className="inv-view-meta-label">Uraian Pembayaran Belanja</span>
              <div className="inv-view-desc-body">
                {viewInvoice.deskripsi}
              </div>
            </div>

            {/* Clean Financial Summary Box */}
            <div className="inv-view-fin-card">
              <Row gutter={16} align="middle">
                <Col span={8}>
                  <span className="inv-view-meta-label">Jumlah Gross</span>
                  <div className="inv-view-fin-val">
                    {formatCurrency(viewInvoice.nilai_kotor)}
                  </div>
                </Col>
                <Col span={8}>
                  <span className="inv-view-meta-label">Potongan Pajak</span>
                  <div className="inv-view-fin-val text-rose">
                    - {formatCurrency((viewInvoice.taxes || []).reduce((acc, t) => acc + (Number(t.nilai_pajak) || 0), 0))}
                  </div>
                </Col>
                <Col span={8} style={{ textAlign: 'right' }}>
                  <span className="inv-view-meta-label">Jumlah Net Dibayarkan</span>
                  <div className="inv-view-fin-val text-emerald-large">
                    {formatCurrency(viewInvoice.nilai_bersih)}
                  </div>
                </Col>
              </Row>

              <div className="inv-view-terbilang">
                <strong>Terbilang:</strong> "{numberToTerbilang(viewInvoice.nilai_bersih)}"
              </div>
            </div>

            {/* Tax Details List */}
            {viewInvoice.taxes && viewInvoice.taxes.length > 0 && (
              <div className="inv-view-tax-section">
                <span className="inv-view-meta-label display-block margin-b-6">
                  Rincian Pemotongan Pajak:
                </span>
                <Space wrap size={[8, 8]}>
                  {viewInvoice.taxes.map((t, idx) => (
                    <Tag key={idx} color="orange" className="inv-view-tax-tag">
                      <strong>{t.jenis_pajak}:</strong> {formatCurrency(t.nilai_pajak)}
                    </Tag>
                  ))}
                </Space>
              </div>
            )}

            {/* Pejabat Signatories */}
            <div className="inv-view-sign-card">
              <span className="inv-view-meta-label display-block margin-b-10">
                Pejabat & Penerima Dana
              </span>
              <Row gutter={16}>
                <Col span={8}>
                  <div className="inv-sign-role">PPK:</div>
                  <div className="inv-sign-name">{viewInvoice.ppk_name || '-'}</div>
                  <div className="inv-sign-sub">{viewInvoice.ppk_nip || '-'}</div>
                </Col>
                <Col span={8}>
                  <div className="inv-sign-role">Bendahara:</div>
                  <div className="inv-sign-name">{viewInvoice.bendahara_name || '-'}</div>
                  <div className="inv-sign-sub">{viewInvoice.bendahara_nip || '-'}</div>
                </Col>
                <Col span={8}>
                  <div className="inv-sign-role">Penerima / Penyedia:</div>
                  <div className="inv-sign-name">{viewInvoice.penerima_name || '-'}</div>
                </Col>
              </Row>
            </div>
          </div>
        )}
      </Modal>

      {/* 📝 FORM MODAL PEMBUATAN / EDIT INVOICE */}
      <Modal
        title={
          <div className="inv-modal-title-box">
            <CalculatorOutlined className="inv-modal-title-icon" />
            <div>
              <div className="inv-modal-title-main">
                {mode === 'create' ? 'Buat Invoice & Bukti Pembelian Baru' : 'Edit Data Invoice Belanja'}
              </div>
              <div className="inv-modal-title-sub">Form Perekaman Transaksi Belanja & Pajak Dinamis</div>
            </div>
          </div>
        }
        open={openModal}
        onCancel={() => setOpenModal(false)}
        footer={null}
        width={860}
        centered
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="inv-modal-form"
        >
          {/* 📌 SECTION 1: DATA UTAMA NOTA */}
          <div className="inv-form-section">
            <div className="inv-form-section-title">
              <FileTextOutlined className="inv-section-icon" />
              <span>Data Utama Nota Belanja</span>
            </div>

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
                  label="Kode Akun (Mata Anggaran)"
                  rules={[{ required: true, message: 'Wajib diisi' }]}
                >
                  <Input placeholder="521111 - Keperluan Kantor" />
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
                className="inv-gross-input"
                formatter={(val) => `Rp ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                parser={(val) => val.replace(/Rp\s?|(\.*)/g, '')}
                placeholder="0"
                onChange={(val) => recalculateAllTaxesWithGross(val)}
              />
            </Form.Item>
          </div>

          {/* 📌 SECTION 2: PEMOTONGAN PAJAK */}
          <div className="inv-form-section">
            <div className="inv-form-section-title">
              <DollarOutlined className="inv-section-icon text-rose" />
              <span>Rincian Pemotongan Pajak (Multi-Pajak Dinamis)</span>
            </div>

            <div className="inv-presets-wrapper">
              <span className="inv-preset-label"><ThunderboltOutlined /> Preset Pajak Cepat:</span>
              <div className="inv-preset-chips">
                {COMMON_TAX_TYPES.map((taxOpt, i) => (
                  <button
                    key={i}
                    type="button"
                    className="inv-preset-chip"
                    onClick={() => applyQuickTaxPreset(taxOpt)}
                  >
                    + {taxOpt.label}
                  </button>
                ))}
              </div>
            </div>

            <Form.List name="taxes">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }, index) => (
                    <div key={key} className="inv-tax-row-card">
                      <Row gutter={12} align="middle">
                        <Col span={11}>
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

                        <Col span={10}>
                          <Form.Item
                            {...restField}
                            name={[name, 'nilai_pajak']}
                            label="Nilai Potongan (Rp)"
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
                              icon={<DeleteOutlined />}
                              onClick={() => remove(name)}
                              className="inv-tax-remove-btn"
                            />
                          )}
                        </Col>
                      </Row>
                    </div>
                  ))}

                  <Form.Item style={{ marginBottom: 0 }}>
                    <Button
                      type="dashed"
                      onClick={() => add({ jenis_pajak: 'PPh Pasal 23', nilai_pajak: 0 })}
                      block
                      icon={<PlusOutlined />}
                      className="inv-add-tax-btn"
                    >
                      + Tambah Baris Pajak Baru
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
          </div>

          {/* 📌 SECTION 3: PEJABAT & PENERIMA */}
          <div className="inv-form-section">
            <div className="inv-form-section-title">
              <UserOutlined className="inv-section-icon" />
              <span>Pejabat Perbendaharaan & Penerima Dana</span>
            </div>

            <Row gutter={16}>
              <Col span={8}>
                <div className="inv-sign-box">
                  <div className="inv-sign-box-title">Pejabat Pembuat Komitmen (PPK)</div>
                  <Form.Item name="ppk_name" label="Nama PPK">
                    <Input placeholder="DODDY PRAYUDI, A.Md" />
                  </Form.Item>
                  <Form.Item name="ppk_nip" label="NIP PPK" style={{ marginBottom: 0 }}>
                    <Input placeholder="NIP. ..." />
                  </Form.Item>
                </div>
              </Col>

              <Col span={8}>
                <div className="inv-sign-box">
                  <div className="inv-sign-box-title">Bendahara Pengeluaran</div>
                  <Form.Item name="bendahara_name" label="Nama Bendahara">
                    <Input placeholder="NUR INDAH, S.Sos" />
                  </Form.Item>
                  <Form.Item name="bendahara_nip" label="NIP Bendahara" style={{ marginBottom: 0 }}>
                    <Input placeholder="NIP. ..." />
                  </Form.Item>
                </div>
              </Col>

              <Col span={8}>
                <div className="inv-sign-box">
                  <div className="inv-sign-box-title">Penyedia / Penerima Dana</div>
                  <Form.Item name="penerima_name" label="Nama Penerima / Penyedia" style={{ marginBottom: 0 }}>
                    <Input placeholder="CV. Mandiri Jaya / Toko Utama" />
                  </Form.Item>
                </div>
              </Col>
            </Row>
          </div>

          {/* Live Calculation Summary Box */}
          <div className="inv-calc-box">
            <div className="inv-calc-row">
              <span>Total Nota Kotor (Gross):</span>
              <strong>{formatCurrency(nilaiKotorValue)}</strong>
            </div>
            <div className="inv-calc-row text-rose">
              <span>Total Potongan Pajak ({taxesValue.length} rincian):</span>
              <strong>- {formatCurrency(totalPajakCalc)}</strong>
            </div>
            <Divider style={{ margin: '12px 0' }} />
            <div className="inv-calc-row-net">
              <span className="inv-net-title">Jumlah Diterima (Bersih / Net):</span>
              <span className="inv-net-amount">{formatCurrency(nilaiBersihCalc)}</span>
            </div>

            <div className="inv-terbilang-box">
              <strong>Terbilang:</strong> "{terbilangCalc}"
            </div>
          </div>

          <div className="inv-modal-footer">
            <Button onClick={() => setOpenModal(false)} className="inv-btn-cancel">
              Batal
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              icon={<SaveOutlined />}
              className="inv-btn-submit"
            >
              Simpan & Rekam Invoice
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
