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
  Row,
  Col,
  Divider,
  Empty,
  Dropdown,
  Card,
  Typography,
} from 'antd';
import { buildMessageAdapter } from '../utils/notify.js';
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  PrinterOutlined,
  EyeOutlined,
  ReloadOutlined,
  SearchOutlined,
  MoreOutlined,
  SaveOutlined,
  CopyOutlined,
  CheckOutlined,
  CloseOutlined,
  FilterOutlined,
  DownOutlined,
  FileDoneOutlined,
  WalletOutlined,
  PercentageOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth.js';
import useDebounce from '../hooks/useDebounce.js';
import './InvoiceBelanja.css';

const { Text } = Typography;

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
  const [copiedId, setCopiedId] = useState(null);
  const debouncedSearchTerm = useDebounce(searchTerm, 400);

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
      params.append('per_page', '1000');
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

  const filteredData = useMemo(() => {
    if (selectedTa === 'ALL') return data;
    return data.filter(item => String(item.tahun_anggaran) === String(selectedTa));
  }, [data, selectedTa]);

  const dashboardMetrics = useMemo(() => filteredData.reduce((metrics, item) => ({
    count: metrics.count + 1,
    gross: metrics.gross + (Number(item.nilai_kotor) || 0),
    tax: metrics.tax + (Number(item.total_pajak) || 0),
    net: metrics.net + (Number(item.nilai_bersih) || 0),
  }), { count: 0, gross: 0, tax: 0, net: 0 }), [filteredData]);

  const handleResetFilter = () => {
    setSearchTerm('');
    setSelectedTa('ALL');
  };

  const handleCopyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    message.success('Nomor invoice disalin');
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
          ? record.taxes.map(t => {
              const isPredefined = COMMON_TAX_TYPES.some(ct => ct.value === t.jenis_pajak && ct.value !== 'Pajak Lainnya');
              return {
                jenis_pajak: isPredefined ? t.jenis_pajak : 'Pajak Lainnya',
                custom_label: isPredefined ? '' : t.jenis_pajak,
                nilai_pajak: t.nilai_pajak,
                tax_rate: t.tax_rate,
              };
            })
          : [{ jenis_pajak: 'PPN 11%', nilai_pajak: 0, tax_rate: 11, custom_label: '' }],
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
        taxes: [{ jenis_pajak: 'PPN 11%', nilai_pajak: 0, tax_rate: 11, custom_label: '' }],
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
    const currentGross = form.getFieldValue('nilai_kotor') || 0;
    const currentTaxes = form.getFieldValue('taxes') || [];

    if (value === 'Pajak Lainnya') {
      currentTaxes[index] = {
        ...currentTaxes[index],
        jenis_pajak: 'Pajak Lainnya',
        custom_label: currentTaxes[index]?.custom_label || '',
        tax_rate: currentTaxes[index]?.tax_rate || 0,
        nilai_pajak: currentTaxes[index]?.nilai_pajak || 0,
      };
    } else if (matched && matched.rate > 0) {
      const calculatedTax = Math.round((currentGross * matched.rate) / 100);
      currentTaxes[index] = {
        ...currentTaxes[index],
        jenis_pajak: value,
        custom_label: '',
        tax_rate: matched.rate,
        nilai_pajak: calculatedTax,
      };
    }
    form.setFieldsValue({ taxes: currentTaxes });
  };

  const applyQuickTaxPreset = (taxOption) => {
    const currentGross = form.getFieldValue('nilai_kotor') || 0;
    const calculatedTax = taxOption.rate > 0 ? Math.round((currentGross * taxOption.rate) / 100) : 0;

    const currentTaxes = form.getFieldValue('taxes') || [];
    const existingIndex = currentTaxes.findIndex(t => t?.jenis_pajak === taxOption.value);
    if (existingIndex >= 0) {
      currentTaxes[existingIndex] = {
        jenis_pajak: taxOption.value,
        custom_label: '',
        tax_rate: taxOption.rate,
        nilai_pajak: calculatedTax,
      };
    } else {
      currentTaxes.push({
        jenis_pajak: taxOption.value,
        custom_label: '',
        tax_rate: taxOption.rate,
        nilai_pajak: calculatedTax,
      });
    }
    form.setFieldsValue({ taxes: [...currentTaxes] });
  };

  const handleGrossChange = (val) => {
    const gross = Number(val) || 0;
    const currentTaxes = form.getFieldValue('taxes') || [];
    const updated = currentTaxes.map(t => {
      if (t?.tax_rate && Number(t.tax_rate) > 0) {
        return {
          ...t,
          nilai_pajak: Math.round((gross * Number(t.tax_rate)) / 100),
        };
      }
      return t;
    });
    form.setFieldsValue({ taxes: updated });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const computedTotalTax = (values.taxes || []).reduce((sum, t) => sum + (Number(t?.nilai_pajak) || 0), 0);
      const computedNet = Math.max(0, (Number(values.nilai_kotor) || 0) - computedTotalTax);

      const payload = {
        ...values,
        nilai_kotor: Number(values.nilai_kotor),
        nilai_bersih: computedNet,
        total_pajak: computedTotalTax,
        terbilang: numberToTerbilang(computedNet),
        taxes: (values.taxes || []).map(t => {
          let finalJenisPajak = t.jenis_pajak;
          if (t.jenis_pajak === 'Pajak Lainnya') {
            finalJenisPajak = t.custom_label?.trim() ? t.custom_label.trim() : 'Pajak Lainnya';
          }
          return {
            jenis_pajak: finalJenisPajak,
            tax_rate: Number(t.tax_rate) || 0,
            nilai_pajak: Number(t.nilai_pajak) || 0,
          };
        }),
      };

      const url = mode === 'edit' ? `/invoices/${activeInvoice.id}` : '/invoices';
      const method = mode === 'edit' ? 'PUT' : 'POST';

      const response = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.message || 'Gagal menyimpan invoice');
      }

      notification.success(mode === 'edit' ? 'Invoice berhasil diperbarui' : 'Invoice baru berhasil dibuat');
      setOpenModal(false);
      fetchInvoices();
    } catch (error) {
      if (error?.errorFields) return;
      notification.error(error.message || 'Terjadi kesalahan sistem');
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
      } else {
        throw new Error('Gagal menghapus invoice');
      }
    } catch (e) {
      notification.error(e.message || 'Gagal menghapus invoice');
    }
  };

  const handlePrintPdfF4 = async (record) => {
    try {
      notification.info('Menyiapkan format cetak Bukti Pembelian F4...');
      const response = await apiFetch(`/invoices/${record.id}/export-pdf-f4`, {
        method: 'GET',
        headers: { Accept: 'application/pdf' },
      });

      if (!response.ok) {
        throw new Error('Gagal mengunduh dokumen PDF F4');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BUKTI_PEMBELIAN_F4_${(record.invoice_no || 'INV').replace(/[\/\\]/g, '_')}.pdf`;
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
      title: 'NOMOR INVOICE',
      dataIndex: 'invoice_no',
      key: 'invoice_no',
      width: 220,
      fixed: 'left',
      render: (text, record) => (
        <div className="simkeu-record-identity">
          <span className="simkeu-record-icon"><FileDoneOutlined /></span>
          <div className="inv-no-cell">
            <div className="inv-no-text-row">
              <span className="inv-no-main">{text || record.ticket_no}</span>
              <Tooltip title="Salin nomor invoice">
                <Button
                  type="text"
                  size="small"
                  icon={copiedId === record.id ? <CheckOutlined style={{ color: '#10b981' }} /> : <CopyOutlined />}
                  onClick={() => handleCopyText(text || record.ticket_no, record.id)}
                />
              </Tooltip>
            </div>
            <span className="inv-no-meta">TA {record.tahun_anggaran} • {record.penerima_name || 'Tanpa Penerima'}</span>
          </div>
        </div>
      ),
    },
    {
      title: 'URAIAN BELANJA',
      dataIndex: 'deskripsi',
      key: 'deskripsi',
      render: (text) => (
        <span className="inv-desc-text">{text || '-'}</span>
      ),
    },
    {
      title: 'KODE AKUN',
      dataIndex: 'mak',
      key: 'mak',
      width: 200,
      render: (text) => (
        <span className="inv-mak-tag" title={text || '-'}>{text || '-'}</span>
      ),
    },
    {
      title: 'TOTAL GROSS',
      dataIndex: 'nilai_kotor',
      key: 'nilai_kotor',
      align: 'right',
      width: 160,
      render: (val) => (
        <span className="inv-val-gross">{formatCurrency(val)}</span>
      ),
    },
    {
      title: 'NET DIBAYARKAN',
      dataIndex: 'nilai_bersih',
      key: 'nilai_bersih',
      align: 'right',
      width: 160,
      render: (val) => (
        <span className="inv-val-net">
          {formatCurrency(val)}
        </span>
      ),
    },
    {
      title: 'AKSI',
      key: 'actions',
      width: 90,
      align: 'center',
      fixed: 'right',
      render: (_, record) => {
        const actionMenuItems = [
          {
            key: 'view',
            icon: <EyeOutlined />,
            label: 'Pratinjau Detail Invoice',
            onClick: () => handleOpenViewModal(record),
          },
          {
            key: 'print',
            icon: <PrinterOutlined />,
            label: 'Cetak Bukti Pembelian F4 (PDF)',
            onClick: () => handlePrintPdfF4(record),
          },
          {
            key: 'edit',
            icon: <EditOutlined />,
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
                content: `Hapus invoice "${record.invoice_no || record.ticket_no}"?`,
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
            <Button className="simkeu-row-action" icon={<MoreOutlined />}>Kelola</Button>
          </Dropdown>
        );
      },
    },
  ];

  return (
    <div className="inv-module-container">
      {/* ── Quick Summary Ribbon ── */}
      <div className="klpj-status-ribbon">
        <div className="klpj-ribbon-item active" style={{ cursor: 'default' }}>
          <span>Total Dokumen Invoice</span>
          <strong>{dashboardMetrics.count}</strong>
        </div>
        <div className="klpj-ribbon-divider" />
        <div className="klpj-ribbon-item" style={{ cursor: 'default' }}>
          <span>Nilai Bruto:</span>
          <strong style={{ background: '#f0f7ff', color: '#0F5B99', fontFamily: 'ui-monospace, monospace' }}>{formatCurrency(dashboardMetrics.gross)}</strong>
        </div>
        <div className="klpj-ribbon-divider" />
        <div className="klpj-ribbon-item" style={{ cursor: 'default' }}>
          <span>Total Potongan Pajak:</span>
          <strong style={{ background: '#fff1f2', color: '#e11d48', fontFamily: 'ui-monospace, monospace' }}>{formatCurrency(dashboardMetrics.tax)}</strong>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', paddingRight: 8 }}>
          <span>Net Dibayarkan:</span>
          <strong style={{ color: '#10b981', fontWeight: 700, fontSize: 13.5, fontFamily: 'ui-monospace, monospace' }}>{formatCurrency(dashboardMetrics.net)}</strong>
        </div>
      </div>

      {/* ── Toolbar & Filter Box (Surat Tugas Standard) ── */}
      <Card
        variant="borderless"
        style={{ borderRadius: 8 }}
        styles={{ body: { padding: '12px 16px' } }}
        className="inv-toolbar-card"
      >
        <Row gutter={[10, 10]} align="middle">
          {/* Search */}
          <Col xs={24} sm={12} md={8} lg={7}>
            <Input
              placeholder="Cari nomor invoice, kode akun, uraian..."
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              allowClear
            />
          </Col>

          {/* Tahun Anggaran Dropdown */}
          <Col xs={24} sm={12} md={5} lg={4}>
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
          <Col xs={24} sm={24} md={11} lg={13} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Button
              icon={<FilterOutlined />}
              onClick={handleResetFilter}
            >
              Reset
            </Button>
            <Tooltip title="Segarkan Data">
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchInvoices}
              />
            </Tooltip>
            <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
              {filteredData.length} data
            </Text>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleOpenModal()}
            >
              + Buat Invoice Baru
            </Button>
          </Col>
        </Row>
      </Card>

      {/* ── Table Card ── */}
      <Card
        variant="borderless"
        style={{ borderRadius: 8 }}
        styles={{ body: { padding: 0 } }}
        className="inv-main-card"
      >
        <Table
          className="inv-table"
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          size="middle"
          loading={loading}
          scroll={{ x: 1300 }}
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
                    <strong>Belum ada invoice belanja</strong>
                    <small>Buat invoice baru atau sesuaikan filter pencarian.</small>
                  </span>
                }
              />
            ),
          }}
        />
      </Card>

      {/* ── Detail View Modal ── */}
      <Modal
        title={null}
        open={openViewModal}
        onCancel={() => setOpenViewModal(false)}
        footer={null}
        width={860}
        centered
        destroyOnClose
        className="inv-modal"
      >
        <button
          className="inv-modal-close"
          onClick={() => setOpenViewModal(false)}
          title="Tutup"
        >
          <CloseOutlined />
        </button>

        {viewInvoice && (
          <div className="inv-modal-wrap">
            <div className="inv-modal-header">
              <div>
                <h3 className="inv-modal-title">{viewInvoice.invoice_no || viewInvoice.ticket_no}</h3>
                <span className="inv-modal-sub">Rincian Dokumen Invoice & Pajak Belanja</span>
              </div>
            </div>

            <div className="inv-modal-body">
              {/* Uraian Box */}
              <div className="inv-section-box">
                <span className="inv-section-lbl">URAIAN BELANJA</span>
                <p className="inv-desc-body">{viewInvoice.deskripsi}</p>
                <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                  <span className="inv-mak-tag">Akun: {viewInvoice.mak || '-'}</span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Penerima: <strong>{viewInvoice.penerima_name || '-'}</strong></span>
                </div>
              </div>

              {/* Financial Box */}
              <div className="inv-section-box">
                <span className="inv-section-lbl">RINCIAN NILAI & PAJAK</span>
                <Row gutter={[12, 10]}>
                  <Col xs={24} md={8}>
                    <Text className="inv-meta-lbl">Total Nilai Kotor (Gross)</Text>
                    <div className="inv-fin-val">{formatCurrency(viewInvoice.nilai_kotor)}</div>
                  </Col>
                  <Col xs={24} md={8}>
                    <Text className="inv-meta-lbl">Total Potongan Pajak</Text>
                    <div className="inv-fin-val" style={{ color: '#ef4444' }}>- {formatCurrency(viewInvoice.total_pajak)}</div>
                  </Col>
                  <Col xs={24} md={8}>
                    <Text className="inv-meta-lbl">Nilai Bersih (Netto)</Text>
                    <div className="inv-fin-val text-green font-bold">{formatCurrency(viewInvoice.nilai_bersih)}</div>
                  </Col>
                </Row>

                <div className="inv-terbilang-text">
                  Terbilang: <em>"{viewInvoice.terbilang || numberToTerbilang(viewInvoice.nilai_bersih)}"</em>
                </div>

                {viewInvoice.taxes && viewInvoice.taxes.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <Text className="inv-meta-lbl" style={{ display: 'block', marginBottom: 4 }}>Daftar Potongan Pajak:</Text>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {viewInvoice.taxes.map((t, idx) => (
                        <Tag key={idx} color="default" className="inv-tax-tag">
                          {t.jenis_pajak}: <strong>{formatCurrency(t.nilai_pajak)}</strong>
                        </Tag>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Signatures */}
              <div className="inv-section-box">
                <span className="inv-section-lbl">PENANDATANGAN KEUANGAN</span>
                <Row gutter={12}>
                  <Col xs={24} md={12}>
                    <span className="inv-sign-lbl">Pejabat Pembuat Komitmen (PPK)</span>
                    <div className="inv-sign-n">{viewInvoice.ppk_name || '-'}</div>
                    <div className="inv-sign-nip">{viewInvoice.ppk_nip || '-'}</div>
                  </Col>
                  <Col xs={24} md={12}>
                    <span className="inv-sign-lbl">Bendahara Pengeluaran</span>
                    <div className="inv-sign-n">{viewInvoice.bendahara_name || '-'}</div>
                    <div className="inv-sign-nip">{viewInvoice.bendahara_nip || '-'}</div>
                  </Col>
                </Row>
              </div>

              {/* Modal Footer */}
              <div className="inv-modal-footer">
                <div></div>
                <Space>
                  <Button
                    type="primary"
                    icon={<PrinterOutlined />}
                    onClick={() => handlePrintPdfF4(viewInvoice)}
                  >
                    Cetak Bukti Pembelian F4 (PDF)
                  </Button>
                  <Button onClick={() => setOpenViewModal(false)}>Tutup</Button>
                </Space>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Create/Edit Modal ── */}
      <Modal
        title={null}
        open={openModal}
        onCancel={() => setOpenModal(false)}
        width={1040}
        destroyOnClose
        centered
        footer={null}
        className="inv-modal"
      >
        <button
          className="inv-modal-close"
          onClick={() => setOpenModal(false)}
          title="Tutup"
        >
          <CloseOutlined />
        </button>

        <div className="inv-modal-wrap">
          <div className="inv-modal-header">
            <div>
              <h3 className="inv-modal-title">{mode === 'edit' ? 'Edit Invoice Belanja' : 'Buat Invoice Belanja Baru'}</h3>
              <span className="inv-modal-sub">Rincian belanja barang, jasa, kode akun, dan potongan pajak</span>
            </div>
          </div>

          <div className="inv-modal-body">
            <Form form={form} layout="vertical">
              {/* Section 1 */}
              <div className="inv-section-box">
                <span className="inv-section-lbl">1. Informasi & Identitas Belanja</span>
                <Row gutter={12}>
                  <Col xs={24} md={8}>
                    <Form.Item label="Tahun Anggaran" name="tahun_anggaran" rules={[{ required: true }]}>
                      <InputNumber style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={16}>
                    <Form.Item label="Nomor Invoice / Kuitansi" name="invoice_no" rules={[{ required: true, message: 'Nomor invoice wajib diisi' }]}>
                      <Input placeholder="Nomor Invoice" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={12}>
                  <Col xs={24} md={10}>
                    <Form.Item label="Kode Akun" name="mak" rules={[{ required: true, message: 'Kode Akun wajib diisi' }]}>
                      <Input placeholder="Contoh: 3165.BKB.053.001" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={14}>
                    <Form.Item label="Pihak Penerima / Rekanan" name="penerima_name">
                      <Input placeholder="Nama Toko / Rekanan / Penyedia" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item label="Uraian Pembelian / Keperluan Belanja" name="deskripsi" rules={[{ required: true, message: 'Uraian wajib diisi' }]}>
                  <Input.TextArea rows={2} placeholder="Deskripsikan barang atau jasa yang dibelanjakan..." />
                </Form.Item>
              </div>

              {/* Section 2 */}
              <div className="inv-section-box">
                <span className="inv-section-lbl">2. Kalkulasi Nilai & Pajak</span>

                <Row gutter={12}>
                  <Col xs={24} md={12}>
                    <Form.Item label="Nilai Kotor (Gross)" name="nilai_kotor" rules={[{ required: true, message: 'Nilai gross wajib' }]}>
                      <InputNumber
                        min={0}
                        style={{ width: '100%' }}
                        formatter={(v) => `Rp ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                        parser={(v) => v?.replace(/Rp\s?|[.]/g, '')}
                        onChange={handleGrossChange}
                        placeholder="0"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                {/* Quick Presets */}
                <div className="inv-presets-line">
                  <span className="inv-preset-head">Preset Cepat Pajak:</span>
                  {COMMON_TAX_TYPES.filter(t => t.rate > 0).map(t => (
                    <button
                      type="button"
                      key={t.value}
                      className="inv-preset-btn"
                      onClick={() => applyQuickTaxPreset(t)}
                    >
                      + {t.label}
                    </button>
                  ))}
                </div>

                {/* Taxes Form List */}
                <Form.List name="taxes">
                  {(fields, { add, remove }) => (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {fields.map(({ key, name, ...restField }) => {
                        const currentItem = taxesValue?.[name] || {};
                        const isCustomTax = currentItem?.jenis_pajak === 'Pajak Lainnya';

                        return (
                          <div key={key} className="inv-tax-card">
                            <Row gutter={8} align={isCustomTax ? "top" : "middle"}>
                              <Col xs={24} md={10}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  <Form.Item
                                    {...restField}
                                    name={[name, 'jenis_pajak']}
                                    rules={[{ required: true, message: 'Jenis pajak wajib' }]}
                                    style={{ margin: 0 }}
                                  >
                                    <Select
                                      placeholder="Pilih jenis pajak..."
                                      options={COMMON_TAX_TYPES}
                                      onChange={(val) => handleTaxTypeChange(val, name)}
                                    />
                                  </Form.Item>
                                  {isCustomTax && (
                                    <Form.Item
                                      {...restField}
                                      name={[name, 'custom_label']}
                                      rules={[{ required: true, message: 'Ketik nama pajak custom' }]}
                                      style={{ margin: 0 }}
                                    >
                                      <Input
                                        placeholder="Ketik nama pajak (misal: Pajak Restoran, PBB)..."
                                        style={{ borderRadius: 6, fontSize: 12 }}
                                      />
                                    </Form.Item>
                                  )}
                                </div>
                              </Col>
                              <Col xs={10} md={5}>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'tax_rate']}
                                  style={{ margin: 0 }}
                                >
                                  <InputNumber
                                    min={0}
                                    max={100}
                                    addonAfter="%"
                                    style={{ width: '100%' }}
                                    placeholder="Tarif"
                                    onChange={(rate) => {
                                      const currentGross = form.getFieldValue('nilai_kotor') || 0;
                                      const calc = Math.round((currentGross * (rate || 0)) / 100);
                                      const currentTaxes = form.getFieldValue('taxes') || [];
                                      currentTaxes[name] = { ...currentTaxes[name], nilai_pajak: calc };
                                      form.setFieldsValue({ taxes: currentTaxes });
                                    }}
                                  />
                                </Form.Item>
                              </Col>
                              <Col xs={10} md={7}>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'nilai_pajak']}
                                  rules={[{ required: true, message: 'Nilai pajak wajib' }]}
                                  style={{ margin: 0 }}
                                >
                                  <InputNumber
                                    min={0}
                                    style={{ width: '100%' }}
                                    formatter={(v) => `Rp ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                                    parser={(v) => v?.replace(/Rp\s?|[.]/g, '')}
                                    placeholder="Nominal"
                                  />
                                </Form.Item>
                              </Col>
                              <Col xs={4} md={2} style={{ textAlign: 'right', paddingTop: isCustomTax ? 4 : 0 }}>
                                <Button danger type="text" icon={<DeleteOutlined />} onClick={() => remove(name)} />
                              </Col>
                            </Row>
                          </div>
                        );
                      })}
                      <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ jenis_pajak: 'PPN 11%', nilai_pajak: 0, tax_rate: 11, custom_label: '' })}>
                        + Tambah Potongan Pajak
                      </Button>
                    </div>
                  )}
                </Form.List>

                {/* Calculation Summary Bar */}
                <div className="inv-calc-container">
                  <div className="inv-calc-line">
                    <span>Total Nilai Kotor:</span>
                    <strong>{formatCurrency(nilaiKotorValue)}</strong>
                  </div>
                  <div className="inv-calc-line" style={{ color: '#ef4444' }}>
                    <span>Total Potongan Pajak:</span>
                    <strong>- {formatCurrency(totalPajakCalc)}</strong>
                  </div>
                  <Divider style={{ margin: '4px 0' }} />
                  <div className="inv-calc-net">
                    <span>NILAI BERSIH DIBAYARKAN:</span>
                    <strong>{formatCurrency(nilaiBersihCalc)}</strong>
                  </div>
                  <div className="inv-terbilang-bar">
                    Terbilang: <em>"{terbilangCalc}"</em>
                  </div>
                </div>
              </div>

              {/* Section 3: Pejabat */}
              <div className="inv-section-box">
                <span className="inv-section-lbl">3. Pejabat Penandatangan Form F4</span>
                <Row gutter={12}>
                  <Col xs={24} md={12}>
                    <Form.Item label="Nama PPK" name="ppk_name" rules={[{ required: true }]}>
                      <Input />
                    </Form.Item>
                    <Form.Item label="NIP PPK" name="ppk_nip">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label="Nama Bendahara" name="bendahara_name" rules={[{ required: true }]}>
                      <Input />
                    </Form.Item>
                    <Form.Item label="NIP Bendahara" name="bendahara_nip">
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>
              </div>

              {/* Footer */}
              <div className="inv-modal-footer">
                <div></div>
                <Space>
                  <Button onClick={() => setOpenModal(false)}>Batal</Button>
                  <Button type="primary" loading={saving} icon={<SaveOutlined />} onClick={handleSubmit}>
                    Simpan Invoice
                  </Button>
                </Space>
              </div>
            </Form>
          </div>
        </div>
      </Modal>
    </div>
  );
}
