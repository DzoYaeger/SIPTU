import { useCallback, useEffect, useState, useMemo } from 'react';
import {
    App as AntdApp,
    DatePicker,
    Input,
    InputNumber,
    Select,
    Table,
    Tooltip,
    Tag,
    Button,
    Modal,
    Form,
    Upload,
    Dropdown,
    Tabs,
    Radio,
} from 'antd';
import {
    CalendarOutlined,
    CheckOutlined,
    DeleteOutlined,
    EditOutlined,
    PlusOutlined,
    SearchOutlined,
    CodeSandboxOutlined,
    FilePdfOutlined,
    ArrowLeftOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
    ReloadOutlined,
    AppstoreOutlined,
    UnorderedListOutlined,
    EyeOutlined,
    ShopOutlined,
    FileTextOutlined,
    UploadOutlined,
    FileDoneOutlined,
    FileProtectOutlined,
    ClearOutlined,
    SyncOutlined,
    MoreOutlined,
    BoxPlotOutlined,
    RightOutlined,
    LeftOutlined,
    CloseOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { buildMessageAdapter } from '../utils/notify.js';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import './PengadaanPbj.css';

dayjs.locale('id');

const DATE_API = 'YYYY-MM-DD';
const DATE_UI = 'DD/MM/YYYY';

// Corporate BPOM Harmonized Palette Configuration
const STATUS_CONFIG = {
    'Proses Negosiasi': { step: 1, percent: 20, color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Negosiasi' },
    'Proses PPK': { step: 2, percent: 40, color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd', label: 'Proses PPK' },
    'Proses pengiriman': { step: 3, percent: 60, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', label: 'Pengiriman' },
    'Proses Pembayaran': { step: 4, percent: 80, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', label: 'Pembayaran' },
    'Selesai': { step: 5, percent: 100, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', label: 'Selesai' },
};

const STAGES = [
    { title: 'Negosiasi', pct: '20%' },
    { title: 'PPK', pct: '40%' },
    { title: 'Pengiriman', pct: '60%' },
    { title: 'Pembayaran', pct: '80%' },
    { title: 'Selesai', pct: '100%' },
];

/* ── Initials & Avatar Tone Helper (Facebook-style) ──────────────── */
function getInitials(name) {
    if (!name) return 'PD';
    const parts = String(name)
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    if (parts.length === 0) return 'PD';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function vendorTone(jenis) {
    if (jenis === 'E-Purchasing') return 'blue';
    if (jenis === 'Langsung') return 'green';
    return 'slate';
}

/* ── Vendor Avatar Circle (Facebook Style) ───────────────────────── */
function VendorAvatar({ name, jenis }) {
    return (
        <span className={`pbj-vendor-avatar pbj-vendor-avatar--${vendorTone(jenis)}`} title={name || 'Penyedia'}>
            {getInitials(name)}
        </span>
    );
}

/* ── Clean Dot Status Indicator (AGENTS.md Rule 1) ──────────────── */
function DotStatusIndicator({ status }) {
    const config = STATUS_CONFIG[status] || { step: 1, color: '#64748b', label: status || '—' };
    return (
        <span className="pbj-status-dot-indicator">
            <span className="pbj-status-dot" style={{ backgroundColor: config.color }} />
            <span className="pbj-status-text">{status || '—'}</span>
        </span>
    );
}

/* ── Date Badge ─────────────────────────────────────────────────── */
function DateBadge({ value }) {
    if (!value) return <span style={{ color: '#94a3b8' }}>—</span>;
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#475569', fontSize: 12 }}>
            <CalendarOutlined style={{ fontSize: 11, color: '#0F5B99' }} />{' '}
            {dayjs(value).format('DD MMM YYYY')}
        </span>
    );
}

/* ── Format Rupiah (Semantic Green #059669) ─────────────────────── */
function FormatRupiah({ amount }) {
    if (amount === undefined || amount === null || isNaN(amount)) {
        return <span style={{ color: '#94a3b8' }}>—</span>;
    }
    const val = Number(amount);
    return (
        <span className="pbj-price-val">
            <span className="pbj-price-currency">Rp</span>
            <span className="pbj-price-num">{val.toLocaleString('id-ID')}</span>
        </span>
    );
}

/* ── Expanded Row Component: Detail Rincian Barang ── */
function ExpandedItemsDetail({ record }) {
    const rawItems = Array.isArray(record.items) ? record.items : [];
    const totalItemValue = rawItems.reduce((acc, it) => acc + (Number(it.total_harga) || (Number(it.jumlah) * Number(it.harga_satuan)) || 0), 0);

    return (
        <div className="pbj-expanded-detail">
            <div className="pbj-expanded-header">
                <div className="pbj-expanded-title">
                    <ShopOutlined style={{ color: '#0F5B99', fontSize: 14 }} />
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>Rincian Barang / Jasa</span>
                    <span className="pbj-expanded-count-tag">{rawItems.length} Item</span>
                </div>

                <div className="pbj-expanded-meta-right">
                    {totalItemValue > 0 && (
                        <div className="pbj-expanded-total-box">
                            <span className="lbl">Total Nilai Barang:</span>
                            <span className="val">Rp {totalItemValue.toLocaleString('id-ID')}</span>
                        </div>
                    )}
                    {record.nominal && (
                        <div className="pbj-expanded-total-box" style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
                            <span className="lbl">Nilai Kontrak:</span>
                            <span className="val" style={{ color: '#0F5B99' }}>Rp {Number(record.nominal).toLocaleString('id-ID')}</span>
                        </div>
                    )}
                </div>
            </div>

            {rawItems.length > 0 ? (
                <div className="pbj-expanded-table-wrap">
                    <table className="pbj-expanded-table">
                        <thead>
                            <tr>
                                <th style={{ width: 40, textAlign: 'center' }}>NO</th>
                                <th style={{ width: 140 }}>KODE BARANG</th>
                                <th>NAMA BARANG / DESKRIPSI</th>
                                <th style={{ width: 90, textAlign: 'center' }}>JUMLAH</th>
                                <th style={{ width: 140, textAlign: 'right' }}>HARGA SATUAN</th>
                                <th style={{ width: 150, textAlign: 'right' }}>TOTAL HARGA</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rawItems.map((it, idx) => {
                                const qty = Number(it.jumlah) || 0;
                                const unitPrice = Number(it.harga_satuan) || 0;
                                const totalPrice = Number(it.total_harga) || (qty * unitPrice);
                                return (
                                    <tr key={it.key || idx}>
                                        <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                                        <td>
                                            {it.kode_barang ? (
                                                <code className="pbj-item-code-badge">{it.kode_barang}</code>
                                            ) : (
                                                <span style={{ color: '#94a3b8', fontSize: 11 }}>—</span>
                                            )}
                                        </td>
                                        <td style={{ fontWeight: 600, color: '#1e293b' }}>
                                            {it.nama_barang || <span style={{ color: '#94a3b8' }}>Item tanpa nama</span>}
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: 600, color: '#0F5B99' }}>
                                            {qty.toLocaleString('id-ID')}
                                        </td>
                                        <td style={{ textAlign: 'right', color: '#475569' }}>
                                            Rp {unitPrice.toLocaleString('id-ID')}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                                            Rp {totalPrice.toLocaleString('id-ID')}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="pbj-expanded-empty">
                    <CodeSandboxOutlined style={{ fontSize: 20, color: '#94a3b8' }} />
                    <span>Belum ada daftar rincian item barang spesifik pada data pengadaan ini.</span>
                </div>
            )}

            {/* Lampiran Dokumen Cepat */}
            {(record.file_surat_pesanan_url || record.file_bast_url || record.file_invoice_url) && (
                <div className="pbj-expanded-docs">
                    <span className="docs-label">Lampiran Berkas:</span>
                    {record.file_surat_pesanan_url && (
                        <a href={record.file_surat_pesanan_url} target="_blank" rel="noopener noreferrer" className="pbj-doc-pill">
                            <FileTextOutlined style={{ color: '#0284c7' }} />
                            <span>Surat Pesanan (SP/SPK)</span>
                        </a>
                    )}
                    {record.file_bast_url && (
                        <a href={record.file_bast_url} target="_blank" rel="noopener noreferrer" className="pbj-doc-pill">
                            <FileDoneOutlined style={{ color: '#10b981' }} />
                            <span>Berita Acara (BAST)</span>
                        </a>
                    )}
                    {record.file_invoice_url && (
                        <a href={record.file_invoice_url} target="_blank" rel="noopener noreferrer" className="pbj-doc-pill">
                            <FileProtectOutlined style={{ color: '#8b5cf6' }} />
                            <span>Invoice / Bukti Bayar</span>
                        </a>
                    )}
                </div>
            )}
        </div>
    );
}

function PengadaanPbjInner() {
    const { apiFetch, user } = useAuth();
    const navigate = useNavigate();

    const { message } = AntdApp.useApp();
    const notification = buildMessageAdapter(message);

    const isAdmin = user?.base_role === 'admin';

    // State
    const [dataRows, setDataRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [jenisFilter, setJenisFilter] = useState('ALL');
    const [viewMode, setViewMode] = useState('table');
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
    const [expandedRowKeys, setExpandedRowKeys] = useState([]);

    // Modal & Tab State
    const [form] = Form.useForm();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [modalActiveTab, setModalActiveTab] = useState('1');
    const [editingRecord, setEditingRecord] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [itemList, setItemList] = useState([]);

    const [fileSuratPesanan, setFileSuratPesanan] = useState(null);
    const [fileBast, setFileBast] = useState(null);
    const [fileInvoice, setFileInvoice] = useState(null);
    const [removeSuratPesanan, setRemoveSuratPesanan] = useState(false);
    const [removeBast, setRemoveBast] = useState(false);
    const [removeInvoice, setRemoveInvoice] = useState(false);

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [detailRecord, setDetailRecord] = useState(null);

    const handleAddItem = () => {
        setItemList((prev) => [
            ...prev,
            {
                key: String(Date.now() + Math.random()),
                kode_barang: '',
                nama_barang: '',
                jumlah: 1,
                harga_satuan: 0,
                total_harga: 0,
            },
        ]);
    };

    const handleRemoveItem = (index) => {
        setItemList((prev) => prev.filter((_, i) => i !== index));
    };

    const handleItemChange = (index, field, value) => {
        setItemList((prev) =>
            prev.map((item, i) => {
                if (i !== index) return item;
                const updated = { ...item, [field]: value };
                const qty = Number(field === 'jumlah' ? value : updated.jumlah) || 0;
                const price = Number(field === 'harga_satuan' ? value : updated.harga_satuan) || 0;
                updated.total_harga = qty * price;
                return updated;
            })
        );
    };

    const grandTotalItems = useMemo(() => {
        return itemList.reduce((acc, curr) => acc + (Number(curr.total_harga) || 0), 0);
    }, [itemList]);

    const handleSyncNominalFromItems = () => {
        if (grandTotalItems > 0) {
            form.setFieldsValue({ nominal: grandTotalItems });
            notification.success({ message: 'Nominal anggaran berhasil disinkronkan dengan total harga barang.' });
        } else {
            notification.warning({ message: 'Tidak ada item barang dengan total harga untuk disinkronkan.' });
        }
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/procurement-pbjs');
            const body = await res.json();
            const rows = (body.data ?? []).map((r) => ({ ...r, key: String(r.id) }));
            setDataRows(rows);
        } catch (e) {
            notification.error({ message: 'Gagal memuat data', description: e.message });
        } finally {
            setLoading(false);
        }
    }, [apiFetch, notification]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Modal Handlers
    const handleOpenCreate = () => {
        setModalMode('create');
        setModalActiveTab('1');
        setEditingRecord(null);
        setItemList([]);
        setFileSuratPesanan(null);
        setFileBast(null);
        setFileInvoice(null);
        setRemoveSuratPesanan(false);
        setRemoveBast(false);
        setRemoveInvoice(false);
        form.resetFields();
        form.setFieldsValue({
            jenis_pengadaan: 'Langsung',
            status_barang: 'Proses Negosiasi',
            tanggal_pengadaan: dayjs(),
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (record) => {
        setModalMode('edit');
        setModalActiveTab('1');
        setEditingRecord(record);
        const mappedItems = (Array.isArray(record.items) ? record.items : []).map((item, idx) => {
            const qty = Number(item.jumlah) || 1;
            const price =
                item.harga_satuan !== undefined && item.harga_satuan !== null
                    ? Number(item.harga_satuan)
                    : item.total_harga
                    ? Number(item.total_harga) / qty
                    : 0;
            const total = qty * price;
            return {
                key: String(idx) + '-' + Date.now(),
                kode_barang: item.kode_barang || '',
                nama_barang: item.nama_barang || '',
                jumlah: qty,
                harga_satuan: price,
                total_harga: total,
            };
        });
        setItemList(mappedItems);
        setFileSuratPesanan(null);
        setFileBast(null);
        setFileInvoice(null);
        setRemoveSuratPesanan(false);
        setRemoveBast(false);
        setRemoveInvoice(false);
        form.setFieldsValue({
            nama_pengadaan: record.nama_pengadaan,
            jenis_pengadaan: record.jenis_pengadaan || 'Langsung',
            nama_penyedia: record.nama_penyedia,
            tanggal_pengadaan: record.tanggal_pengadaan ? dayjs(record.tanggal_pengadaan) : null,
            no_kontrak: record.no_kontrak,
            nominal: record.nominal ? Number(record.nominal) : null,
            tanggal_kirim: record.tanggal_kirim ? dayjs(record.tanggal_kirim) : null,
            tanggal_sampai: record.tanggal_sampai ? dayjs(record.tanggal_sampai) : null,
            no_bast: record.no_bast,
            tanggal_bast: record.tanggal_bast ? dayjs(record.tanggal_bast) : null,
            status_barang: record.status_barang || 'Proses Negosiasi',
        });
        setIsModalOpen(true);
    };

    const handleOpenDetail = (record) => {
        setDetailRecord(record);
        setIsDrawerOpen(true);
    };

    const handleSaveForm = async (values) => {
        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('nama_pengadaan', values.nama_pengadaan || '');
            formData.append('jenis_pengadaan', values.jenis_pengadaan || 'Langsung');
            if (values.nama_penyedia) formData.append('nama_penyedia', values.nama_penyedia);
            if (values.tanggal_pengadaan) formData.append('tanggal_pengadaan', values.tanggal_pengadaan.format(DATE_API));
            if (values.no_kontrak) formData.append('no_kontrak', values.no_kontrak);
            if (values.nominal !== undefined && values.nominal !== null) formData.append('nominal', values.nominal);
            if (values.tanggal_kirim) formData.append('tanggal_kirim', values.tanggal_kirim.format(DATE_API));
            if (values.tanggal_sampai) formData.append('tanggal_sampai', values.tanggal_sampai.format(DATE_API));
            if (values.no_bast) formData.append('no_bast', values.no_bast);
            if (values.tanggal_bast) formData.append('tanggal_bast', values.tanggal_bast.format(DATE_API));
            formData.append('status_barang', values.status_barang || 'Proses Negosiasi');
            formData.append('items', JSON.stringify(itemList));

            if (fileSuratPesanan) formData.append('file_surat_pesanan', fileSuratPesanan);
            if (fileBast) formData.append('file_bast', fileBast);
            if (fileInvoice) formData.append('file_invoice', fileInvoice);

            if (removeSuratPesanan) formData.append('remove_file_surat_pesanan', '1');
            if (removeBast) formData.append('remove_file_bast', '1');
            if (removeInvoice) formData.append('remove_file_invoice', '1');

            const isNew = modalMode === 'create';
            const url = isNew ? '/procurement-pbjs' : `/procurement-pbjs/${editingRecord.id}`;
            const method = 'POST';

            const res = await apiFetch(url, { method, body: formData });
            if (!res.ok) {
                const e = await res.json().catch(() => ({}));
                throw new Error(e.message || 'Gagal menyimpan data pengadaan.');
            }

            notification.success({ message: isNew ? 'Pengadaan berhasil ditambahkan' : 'Pengadaan berhasil diperbarui' });
            setIsModalOpen(false);
            fetchData();
        } catch (e) {
            notification.error({ message: 'Gagal menyimpan', description: e.message });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            const res = await apiFetch(`/procurement-pbjs/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Gagal menghapus data.');
            notification.success({ message: 'Data berhasil dihapus' });
            fetchData();
        } catch (e) {
            notification.error({ message: 'Gagal', description: e.message });
        }
    };

    // Filter Logic
    const filteredRows = useMemo(() => {
        return dataRows.filter((r) => {
            const matchesSearch =
                !search ||
                ['nama_pengadaan', 'nama_penyedia', 'no_kontrak', 'no_bast'].some((k) =>
                    (r[k] ?? '').toLowerCase().includes(search.toLowerCase())
                );

            let matchesStatus = true;
            if (statusFilter === 'IN_PROGRESS') {
                matchesStatus = r.status_barang !== 'Selesai';
            } else if (statusFilter !== 'ALL') {
                matchesStatus = r.status_barang === statusFilter;
            }

            const matchesJenis = jenisFilter === 'ALL' || r.jenis_pengadaan === jenisFilter;
            return matchesSearch && matchesStatus && matchesJenis;
        });
    }, [dataRows, search, statusFilter, jenisFilter]);

    // Total stage counts & summary nominal (Facebook-style live metrics)
    const summaryStats = useMemo(() => {
        const totalNominal = dataRows.reduce((acc, curr) => acc + (Number(curr.nominal) || 0), 0);
        const counts = {
            ALL: dataRows.length,
            'Proses Negosiasi': 0,
            'Proses PPK': 0,
            'Proses pengiriman': 0,
            'Proses Pembayaran': 0,
            'Selesai': 0,
        };
        dataRows.forEach((r) => {
            if (counts[r.status_barang] !== undefined) {
                counts[r.status_barang]++;
            }
        });
        return { totalNominal, counts };
    }, [dataRows]);

    // PDF Export
    const exportToPdf = async () => {
        try {
            message.loading({ content: 'Menyiapkan dokumen PDF...', key: 'pdf_export' });
            const [{ jsPDF }, { default: autoTable }] = await Promise.all([
                import('jspdf'),
                import('jspdf-autotable'),
            ]);

            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4',
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 14;

            // Kop Surat
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text('BADAN PENGAWAS OBAT DAN MAKANAN', pageWidth / 2, 16, { align: 'center' });
            doc.setFontSize(16);
            doc.text('Balai POM di Palopo', pageWidth / 2, 23, { align: 'center' });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text(
                'JL. Dr. Ratulangi (Depan Taman Makam Pahlawan), Salobulo, Wara Utara, Kota Palopo, Sulawesi Selatan',
                pageWidth / 2,
                29,
                { align: 'center' }
            );

            doc.setLineWidth(0.8);
            doc.line(margin, 34, pageWidth - margin, 34);
            doc.setLineWidth(0.3);
            doc.line(margin, 35.5, pageWidth - margin, 35.5);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text('LAPORAN PROSES PENGADAAN BARANG/JASA (PBJ)', pageWidth / 2, 45, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(`Dicetak pada: ${dayjs().format('DD MMMM YYYY HH:mm')}`, margin, 52);

            const body = filteredRows.map((r, index) => [
                index + 1,
                r.nama_pengadaan || '-',
                r.status_barang || '-',
                r.jenis_pengadaan || '-',
                r.tanggal_pengadaan ? dayjs(r.tanggal_pengadaan).format('DD/MM/YYYY') : '-',
                r.nama_penyedia || '-',
                r.no_kontrak || '-',
                r.nominal ? `Rp ${Number(r.nominal).toLocaleString('id-ID')}` : '-',
                r.tanggal_kirim ? dayjs(r.tanggal_kirim).format('DD/MM/YYYY') : '-',
                r.tanggal_sampai ? dayjs(r.tanggal_sampai).format('DD/MM/YYYY') : '-',
                r.no_bast || '-',
                r.tanggal_bast ? dayjs(r.tanggal_bast).format('DD/MM/YYYY') : '-',
            ]);

            autoTable(doc, {
                startY: 55,
                head: [
                    [
                        'No',
                        'Nama Pengadaan',
                        'Status',
                        'Jenis',
                        'Tgl\nPengadaan',
                        'Penyedia',
                        'No Kontrak',
                        'Nominal',
                        'Tgl\nKirim',
                        'Tgl\nSampai',
                        'No BAST',
                        'Tgl BAST',
                    ],
                ],
                body: body,
                theme: 'grid',
                headStyles: {
                    fillColor: [15, 91, 153],
                    textColor: 255,
                    halign: 'center',
                    valign: 'middle',
                    fontSize: 8,
                },
                styles: {
                    font: 'helvetica',
                    fontSize: 7.5,
                    cellPadding: 2,
                    lineColor: [220, 220, 220],
                    lineWidth: 0.1,
                    overflow: 'linebreak',
                },
                alternateRowStyles: {
                    fillColor: [245, 245, 245],
                },
                columnStyles: {
                    0: { halign: 'center', cellWidth: 8 },
                    1: { halign: 'left', cellWidth: 48 },
                    2: { halign: 'center', cellWidth: 18 },
                    3: { halign: 'center', cellWidth: 18 },
                    4: { halign: 'center', cellWidth: 18 },
                    5: { halign: 'left', cellWidth: 35 },
                    6: { halign: 'left', cellWidth: 25 },
                    7: { halign: 'right', cellWidth: 25 },
                    8: { halign: 'center', cellWidth: 18 },
                    9: { halign: 'center', cellWidth: 18 },
                    10: { halign: 'left', cellWidth: 20 },
                    11: { halign: 'center', cellWidth: 18 },
                },
                didDrawPage: (data) => {
                    doc.setFontSize(8);
                    doc.setTextColor(150);
                    doc.text(
                        `Sistem Informasi Pelayanan Tata Usaha (SIPTU) - Halaman ${data.pageNumber}`,
                        margin,
                        doc.internal.pageSize.getHeight() - 10
                    );
                },
            });

            const finalY = doc.lastAutoTable.finalY + 15;
            if (finalY + 40 > doc.internal.pageSize.getHeight()) {
                doc.addPage();
                doc.setPage(doc.internal.getNumberOfPages());
            }

            const activeY = finalY > doc.internal.pageSize.getHeight() - 40 ? 20 : finalY;
            const sigX = pageWidth - margin - 60;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(0);
            doc.text(`Palopo, ${dayjs().format('DD MMMM YYYY')}`, sigX, activeY);
            doc.text('Mengetahui,', sigX, activeY + 5);
            doc.text('Pejabat Pengadaan (PP)', sigX, activeY + 10);

            doc.setFont('helvetica', 'bold');
            doc.text('Doddy Prayudi, A.Md', sigX, activeY + 35);
            doc.setFont('helvetica', 'normal');
            doc.text('NIP. 199608052019031002', sigX, activeY + 40);

            doc.save(`Laporan_Pengadaan_PBJ_${dayjs().format('YYYYMMDD')}.pdf`);
            message.success({ content: 'PDF laporan berhasil diunduh.', key: 'pdf_export' });
        } catch (error) {
            console.error('Export PDF error:', error);
            message.error({ content: 'Gagal membuat file PDF.', key: 'pdf_export' });
        }
    };

    // Table Columns Definition
    const columns = [
        {
            title: 'NO',
            key: 'no',
            width: 44,
            align: 'center',
            render: (_, __, i) => (
                <span className="pbj-row-index">
                    {(pagination.current - 1) * pagination.pageSize + i + 1}
                </span>
            ),
        },
        {
            title: 'PAKET PENGADAAN & PENYEDIA',
            dataIndex: 'nama_pengadaan',
            key: 'nama_pengadaan',
            render: (v, r) => {
                return (
                    <div className="pbj-table-item-cell">
                        <VendorAvatar name={r.nama_penyedia} jenis={r.jenis_pengadaan} />
                        <div className="pbj-table-item-info">
                            <div className="pbj-table-title" onClick={() => handleOpenDetail(r)} title="Klik untuk lihat rincian">
                                {v || '—'}
                            </div>
                            <div className="pbj-table-meta-sub">
                                <span style={{ fontWeight: 600, color: '#050505' }}>{r.nama_penyedia || 'Penyedia belum diisi'}</span>
                                <span>•</span>
                                <span style={{ color: '#0F5B99', fontWeight: 600 }}>{r.jenis_pengadaan || 'Pengadaan Langsung'}</span>
                                {r.no_kontrak && (
                                    <>
                                        <span>•</span>
                                        <span style={{ fontFamily: 'monospace', fontSize: 11 }}>SP: {r.no_kontrak}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                );
            },
        },
        {
            title: 'NOMINAL ANGGARAN',
            dataIndex: 'nominal',
            key: 'nominal',
            width: 160,
            align: 'right',
            render: (v) => <FormatRupiah amount={v} />,
        },
        {
            title: 'TAHAPAN ALUR & STATUS',
            dataIndex: 'status_barang',
            key: 'status_barang',
            width: 200,
            render: (v) => {
                const conf = STATUS_CONFIG[v] || { step: 1, percent: 20, color: '#64748b' };
                return (
                    <div className="pbj-table-stage-cell">
                        <DotStatusIndicator status={v} />
                        <div className="pbj-table-mini-bar">
                            <div
                                className="pbj-table-mini-fill"
                                style={{ width: `${conf.percent}%`, backgroundColor: conf.color }}
                            />
                        </div>
                    </div>
                );
            },
        },
        {
            title: 'DOKUMEN',
            key: 'dokumen',
            width: 170,
            render: (_, r) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                    {r.file_surat_pesanan_url ? (
                        <a href={r.file_surat_pesanan_url} target="_blank" rel="noreferrer" className="pbj-fb-doc-pill is-available" title="Surat Pesanan">
                            SP
                        </a>
                    ) : (
                        <span className="pbj-fb-doc-pill is-empty">SP</span>
                    )}

                    {r.file_bast_url ? (
                        <a href={r.file_bast_url} target="_blank" rel="noreferrer" className="pbj-fb-doc-pill is-available" title="Berita Acara Serah Terima">
                            BAST
                        </a>
                    ) : (
                        <span className="pbj-fb-doc-pill is-empty">BAST</span>
                    )}

                    {r.file_invoice_url ? (
                        <a href={r.file_invoice_url} target="_blank" rel="noreferrer" className="pbj-fb-doc-pill is-available" title="Invoice / Kuitansi">
                            Invoice
                        </a>
                    ) : (
                        <span className="pbj-fb-doc-pill is-empty">Invoice</span>
                    )}
                </div>
            ),
        },
        {
            title: 'AKSI',
            key: 'aksi',
            width: 60,
            align: 'center',
            render: (_, r) => {
                const items = [
                    {
                        key: 'detail',
                        label: 'Lihat Rincian Lengkap',
                        icon: <EyeOutlined />,
                        onClick: () => handleOpenDetail(r),
                    },
                ];

                if (isAdmin) {
                    items.push({
                        key: 'edit',
                        label: 'Edit Data Pengadaan',
                        icon: <EditOutlined />,
                        onClick: () => handleOpenEdit(r),
                    });
                    items.push({
                        type: 'divider',
                    });
                    items.push({
                        key: 'delete',
                        label: <span style={{ color: '#ef4444' }}>Hapus Data</span>,
                        icon: <DeleteOutlined style={{ color: '#ef4444' }} />,
                        onClick: () => {
                            Modal.confirm({
                                title: 'Hapus Data Pengadaan',
                                content: `Hapus data pengadaan "${r.nama_pengadaan}"? Berkas Nextcloud terkait juga akan dihapus.`,
                                okText: 'Hapus',
                                cancelText: 'Batal',
                                okButtonProps: { danger: true },
                                onOk: () => handleDelete(r.id),
                            });
                        },
                    });
                }

                return (
                    <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
                        <Button type="text" shape="circle" size="small" icon={<MoreOutlined style={{ color: '#65676b', fontSize: 16 }} />} />
                    </Dropdown>
                );
            },
        },
    ];

    return (
        <div className="pbj-module-root">
            {/* ── 1. FACEBOOK ENTERPRISE TOP NAVBAR ── */}
            <header className="pbj-fb-header">
                <div className="pbj-fb-header__inner">
                    {/* Left: Navigation & Brand */}
                    <div className="pbj-fb-header__left">
                        <button
                            type="button"
                            className="pbj-fb-back-btn"
                            onClick={() => navigate('/app/layanan-mandiri')}
                            title="Kembali ke Layanan Mandiri"
                        >
                            <ArrowLeftOutlined />
                            <span className="pbj-fb-back-text">Layanan Mandiri</span>
                        </button>

                        <div className="pbj-fb-divider" />

                        <div className="pbj-fb-brand" onClick={() => navigate('/app/pengadaan-pbj')}>
                            <div className="pbj-fb-brand-icon">
                                <ShopOutlined />
                            </div>
                            <div className="pbj-fb-brand-text">
                                <span className="pbj-fb-brand-title">Pengadaan Barang & Jasa (PBJ)</span>
                                <span className="pbj-fb-brand-subtitle">Balai POM di Palopo</span>
                            </div>
                        </div>
                    </div>

                    {/* Center: Facebook-style Pill Search Box */}
                    <div className="pbj-fb-header__center">
                        <div className="pbj-fb-search-wrap">
                            <SearchOutlined className="pbj-fb-search-icon" />
                            <input
                                type="text"
                                className="pbj-fb-search-input"
                                placeholder="Cari nama pengadaan, penyedia, SPK, no BAST..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            {search && (
                                <button
                                    type="button"
                                    className="pbj-fb-search-clear"
                                    onClick={() => setSearch('')}
                                    title="Hapus pencarian"
                                >
                                    <CloseOutlined style={{ fontSize: 11 }} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right: Action Buttons, Live Counter, & Profile */}
                    <div className="pbj-fb-header__right">
                        {/* Live Data Counter */}
                        <div className="pbj-fb-chip pbj-fb-chip--data" title="Jumlah data pengadaan sesuai filter">
                            <span className="pbj-fb-chip-dot" />
                            <span>{filteredRows.length} Data</span>
                        </div>

                        {/* Total Nominal Realisasi */}
                        {summaryStats.totalNominal > 0 && (
                            <div className="pbj-fb-chip pbj-fb-chip--nominal" title="Total akumulasi nominal paket PBJ">
                                <span className="pbj-fb-chip-curr">Rp</span>
                                <span className="pbj-fb-chip-val">{summaryStats.totalNominal.toLocaleString('id-ID')}</span>
                            </div>
                        )}

                        {/* Export PDF Button */}
                        <Tooltip title="Cetak Laporan Rekapitulasi PBJ ke Dokumen PDF Resmi">
                            <button
                                type="button"
                                className="pbj-fb-action-btn"
                                onClick={exportToPdf}
                            >
                                <FilePdfOutlined />
                                <span className="btn-label">Cetak PDF</span>
                            </button>
                        </Tooltip>

                        {/* Reload Button */}
                        <Tooltip title="Segarkan Data Real-Time">
                            <button
                                type="button"
                                className="pbj-fb-action-btn pbj-fb-action-btn--icon"
                                onClick={fetchData}
                                disabled={loading}
                            >
                                <ReloadOutlined spin={loading} />
                            </button>
                        </Tooltip>

                        {/* View Mode Toggle (Table / Card Feed) */}
                        <div className="pbj-fb-view-toggle">
                            <button
                                type="button"
                                className={`pbj-fb-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                                onClick={() => setViewMode('table')}
                                title="Tampilan Tabel Detail"
                            >
                                <UnorderedListOutlined />
                            </button>
                            <button
                                type="button"
                                className={`pbj-fb-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                                onClick={() => setViewMode('grid')}
                                title="Tampilan Kartu Facebook Feed"
                            >
                                <AppstoreOutlined />
                            </button>
                        </div>

                        {/* Add Procurement Button (Admin only) */}
                        {isAdmin && (
                            <button
                                type="button"
                                className="pbj-fb-primary-btn"
                                onClick={handleOpenCreate}
                                title="Tambah Pengadaan Barang/Jasa Baru"
                            >
                                <PlusOutlined />
                                <span>Tambah Pengadaan</span>
                            </button>
                        )}

                        {/* Profile Avatar */}
                        <div className="pbj-fb-profile-pill" title={`${user?.name || 'User'} (${user?.base_role || 'Pegawai'})`}>
                            <div className="pbj-fb-avatar">
                                {getInitials(user?.name || 'User')}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* ── 2. SUB-TOOLBAR: STAGE FILTER PILLS & CRITERIA ── */}
            <div className="pbj-fb-toolbar">
                <div className="pbj-fb-toolbar__inner">
                    {/* Left: Facebook-style Stage Filter Tabs */}
                    <div className="pbj-fb-stage-tabs">
                        <button
                            type="button"
                            className={`pbj-fb-stage-pill ${statusFilter === 'ALL' ? 'active' : ''}`}
                            onClick={() => setStatusFilter('ALL')}
                        >
                            <span>Semua Tahap</span>
                            <span className="pbj-fb-pill-badge">{summaryStats.counts.ALL}</span>
                        </button>

                        <button
                            type="button"
                            className={`pbj-fb-stage-pill ${statusFilter === 'Proses Negosiasi' ? 'active' : ''}`}
                            onClick={() => setStatusFilter('Proses Negosiasi')}
                        >
                            <span className="stage-dot" style={{ background: STATUS_CONFIG['Proses Negosiasi'].color }} />
                            <span>Negosiasi</span>
                            {summaryStats.counts['Proses Negosiasi'] > 0 && (
                                <span className="pbj-fb-pill-badge">{summaryStats.counts['Proses Negosiasi']}</span>
                            )}
                        </button>

                        <button
                            type="button"
                            className={`pbj-fb-stage-pill ${statusFilter === 'Proses PPK' ? 'active' : ''}`}
                            onClick={() => setStatusFilter('Proses PPK')}
                        >
                            <span className="stage-dot" style={{ background: STATUS_CONFIG['Proses PPK'].color }} />
                            <span>Proses PPK</span>
                            {summaryStats.counts['Proses PPK'] > 0 && (
                                <span className="pbj-fb-pill-badge">{summaryStats.counts['Proses PPK']}</span>
                            )}
                        </button>

                        <button
                            type="button"
                            className={`pbj-fb-stage-pill ${statusFilter === 'Proses pengiriman' ? 'active' : ''}`}
                            onClick={() => setStatusFilter('Proses pengiriman')}
                        >
                            <span className="stage-dot" style={{ background: STATUS_CONFIG['Proses pengiriman'].color }} />
                            <span>Pengiriman</span>
                            {summaryStats.counts['Proses pengiriman'] > 0 && (
                                <span className="pbj-fb-pill-badge">{summaryStats.counts['Proses pengiriman']}</span>
                            )}
                        </button>

                        <button
                            type="button"
                            className={`pbj-fb-stage-pill ${statusFilter === 'Proses Pembayaran' ? 'active' : ''}`}
                            onClick={() => setStatusFilter('Proses Pembayaran')}
                        >
                            <span className="stage-dot" style={{ background: STATUS_CONFIG['Proses Pembayaran'].color }} />
                            <span>Pembayaran</span>
                            {summaryStats.counts['Proses Pembayaran'] > 0 && (
                                <span className="pbj-fb-pill-badge">{summaryStats.counts['Proses Pembayaran']}</span>
                            )}
                        </button>

                        <button
                            type="button"
                            className={`pbj-fb-stage-pill ${statusFilter === 'Selesai' ? 'active' : ''}`}
                            onClick={() => setStatusFilter('Selesai')}
                        >
                            <span className="stage-dot" style={{ background: STATUS_CONFIG['Selesai'].color }} />
                            <span>Selesai</span>
                            {summaryStats.counts['Selesai'] > 0 && (
                                <span className="pbj-fb-pill-badge">{summaryStats.counts['Selesai']}</span>
                            )}
                        </button>
                    </div>

                    {/* Right: Jenis PBJ Selector & Reset Filter */}
                    <div className="pbj-fb-toolbar__right">
                        <Select
                            value={jenisFilter}
                            onChange={setJenisFilter}
                            className="pbj-fb-select"
                            style={{ width: 175 }}
                            placeholder="Jenis PBJ"
                        >
                            <Select.Option value="ALL">Semua Jenis PBJ</Select.Option>
                            <Select.Option value="E-Purchasing">● E-Purchasing</Select.Option>
                            <Select.Option value="Langsung">● Pengadaan Langsung</Select.Option>
                        </Select>

                        {(search || statusFilter !== 'ALL' || jenisFilter !== 'ALL') && (
                            <button
                                type="button"
                                className="pbj-fb-reset-btn"
                                onClick={() => {
                                    setSearch('');
                                    setStatusFilter('ALL');
                                    setJenisFilter('ALL');
                                }}
                                title="Reset semua filter ke kondisi awal"
                            >
                                <ClearOutlined />
                                <span>Reset Filter</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── CONTENT AREA: Table or Facebook-Style Card Feed ── */}
            <div className="pbj-content-area">
                {viewMode === 'table' ? (
                    <div className="pbj-table-container">
                        <Table
                            dataSource={filteredRows}
                            columns={columns}
                            loading={loading}
                            rowKey="id"
                            expandedRowKeys={expandedRowKeys}
                            onExpandedRowsChange={setExpandedRowKeys}
                            onRow={(record) => ({
                                onClick: (e) => {
                                    if (e?.target?.closest?.('.ant-dropdown-trigger, .ant-btn, button, a, input, select, svg, path')) {
                                        return;
                                    }
                                    const key = record.id;
                                    setExpandedRowKeys((prev) =>
                                        prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
                                    );
                                },
                                className: expandedRowKeys.includes(record.id) ? 'pbj-row-expanded-active' : 'pbj-row-clickable',
                                title: 'Klik baris untuk membuka / menutup detail rincian barang',
                            })}
                            expandable={{
                                expandedRowRender: (record) => <ExpandedItemsDetail record={record} />,
                                rowExpandable: () => true,
                                expandRowByClick: false,
                            }}
                            pagination={{
                                ...pagination,
                                total: filteredRows.length,
                                showSizeChanger: true,
                                pageSizeOptions: ['10', '20', '50'],
                                showTotal: (t, range) => `Menampilkan ${range[0]}-${range[1]} dari ${t} pengadaan`,
                                onChange: (page, pSize) => setPagination({ current: page, pageSize: pSize }),
                            }}
                            className="pbj-table pbj-table-expandable"
                            scroll={{ x: 920 }}
                        />
                    </div>
                ) : (
                    /* Facebook-Style Card Grid Feed */
                    <div className="pbj-fb-grid">
                        {loading ? (
                            <div style={{ gridColumn: '1 / -1', padding: '40px 0', textAlign: 'center', background: '#fff', borderRadius: 8, border: '1px solid #e4e6eb' }}>
                                <SyncOutlined spin style={{ fontSize: 24, color: '#0F5B99' }} />
                                <div style={{ marginTop: 8, fontSize: 13, color: '#65676b' }}>Memuat data pengadaan...</div>
                            </div>
                        ) : filteredRows.length === 0 ? (
                            <div style={{ gridColumn: '1 / -1', padding: '40px 0', textAlign: 'center', background: '#fff', borderRadius: 8, border: '1px solid #e4e6eb' }}>
                                <CodeSandboxOutlined style={{ fontSize: 36, color: '#cbd5e1' }} />
                                <p style={{ marginTop: 8, color: '#65676b', fontSize: 13 }}>Tidak ada data pengadaan yang sesuai filter.</p>
                            </div>
                        ) : (
                            filteredRows.map((record) => {
                                const currentStep = (STATUS_CONFIG[record.status_barang] || { step: 1 }).step;
                                return (
                                    <div key={record.id} className="pbj-fb-card">
                                        {/* Card Header (FB Author Style) */}
                                        <div className="pbj-fb-card__header">
                                            <div className="pbj-fb-card__author">
                                                <VendorAvatar name={record.nama_penyedia} jenis={record.jenis_pengadaan} />
                                                <div className="pbj-fb-card__meta">
                                                    <div className="pbj-fb-card__vendor-name">{record.nama_penyedia || 'Penyedia Belum Diisi'}</div>
                                                    <div className="pbj-fb-card__submeta">
                                                        <span className="pbj-fb-badge-jenis">{record.jenis_pengadaan || 'Pengadaan Langsung'}</span>
                                                        {record.tanggal_pengadaan && (
                                                            <>
                                                                <span className="pbj-fb-bullet">•</span>
                                                                <span>{dayjs(record.tanggal_pengadaan).format('DD MMM YYYY')}</span>
                                                            </>
                                                        )}
                                                        {record.no_kontrak && (
                                                            <>
                                                                <span className="pbj-fb-bullet">•</span>
                                                                <span className="pbj-fb-contract">SP: {record.no_kontrak}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <Dropdown
                                                menu={{
                                                    items: [
                                                        {
                                                            key: 'detail',
                                                            label: 'Lihat Rincian Lengkap',
                                                            icon: <EyeOutlined />,
                                                            onClick: () => handleOpenDetail(record),
                                                        },
                                                        ...(isAdmin
                                                            ? [
                                                                  {
                                                                      key: 'edit',
                                                                      label: 'Edit Data Pengadaan',
                                                                      icon: <EditOutlined />,
                                                                      onClick: () => handleOpenEdit(record),
                                                                  },
                                                                  { type: 'divider' },
                                                                  {
                                                                      key: 'delete',
                                                                      label: <span style={{ color: '#ef4444' }}>Hapus Data</span>,
                                                                      icon: <DeleteOutlined style={{ color: '#ef4444' }} />,
                                                                      onClick: () => {
                                                                          Modal.confirm({
                                                                              title: 'Hapus Data Pengadaan',
                                                                              content: `Hapus data pengadaan "${record.nama_pengadaan}"? Berkas Nextcloud terkait juga akan dihapus.`,
                                                                              okText: 'Hapus',
                                                                              cancelText: 'Batal',
                                                                              okButtonProps: { danger: true },
                                                                              onOk: () => handleDelete(record.id),
                                                                          });
                                                                      },
                                                                  },
                                                              ]
                                                            : []),
                                                    ],
                                                }}
                                                trigger={['click']}
                                                placement="bottomRight"
                                            >
                                                <Button type="text" shape="circle" className="pbj-fb-more-btn" icon={<MoreOutlined style={{ fontSize: 16 }} />} />
                                            </Dropdown>
                                        </div>

                                        {/* Card Body */}
                                        <div className="pbj-fb-card__body">
                                            <h3 className="pbj-fb-card__title" onClick={() => handleOpenDetail(record)}>
                                                {record.nama_pengadaan}
                                            </h3>

                                            {/* Budget Row */}
                                            <div className="pbj-fb-budget-row">
                                                <span className="pbj-fb-budget-label">Nominal Anggaran:</span>
                                                <FormatRupiah amount={record.nominal} />
                                            </div>

                                            {/* Visual Alur Proses (5-Segment Stage Pipeline) */}
                                            <div className="pbj-fb-pipeline">
                                                <div className="pbj-fb-pipeline__header">
                                                    <span className="pbj-fb-pipeline__label">Tahapan Alur:</span>
                                                    <DotStatusIndicator status={record.status_barang} />
                                                </div>
                                                <div className="pbj-fb-pipeline__bar">
                                                    {STAGES.map((st, sIdx) => {
                                                        const stepNum = sIdx + 1;
                                                        const isCompleted = stepNum <= currentStep;
                                                        const isCurrent = stepNum === currentStep;
                                                        return (
                                                            <div
                                                                key={st.title}
                                                                className={`pbj-fb-pipeline__segment ${isCompleted ? 'is-active' : ''} ${isCurrent ? 'is-current' : ''}`}
                                                                title={`Tahap ${stepNum}: ${st.title} (${st.pct})`}
                                                            >
                                                                <div className="pbj-fb-pipeline__segment-fill" />
                                                                <span className="pbj-fb-pipeline__segment-text">{st.title}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Attached Documents Row */}
                                            <div className="pbj-fb-docs-row">
                                                <span className="pbj-fb-docs-label">Lampiran:</span>
                                                <div className="pbj-fb-docs-list">
                                                    {record.file_surat_pesanan_url ? (
                                                        <a href={record.file_surat_pesanan_url} target="_blank" rel="noreferrer" className="pbj-fb-doc-pill is-available">
                                                            <FileTextOutlined /> SP
                                                        </a>
                                                    ) : (
                                                        <span className="pbj-fb-doc-pill is-empty">SP</span>
                                                    )}
                                                    {record.file_bast_url ? (
                                                        <a href={record.file_bast_url} target="_blank" rel="noreferrer" className="pbj-fb-doc-pill is-available">
                                                            <FileDoneOutlined /> BAST
                                                        </a>
                                                    ) : (
                                                        <span className="pbj-fb-doc-pill is-empty">BAST</span>
                                                    )}
                                                    {record.file_invoice_url ? (
                                                        <a href={record.file_invoice_url} target="_blank" rel="noreferrer" className="pbj-fb-doc-pill is-available">
                                                            <FileProtectOutlined /> Invoice
                                                        </a>
                                                    ) : (
                                                        <span className="pbj-fb-doc-pill is-empty">Invoice</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card Footer (Action Bar) */}
                                        <div className="pbj-fb-card__footer">
                                            <Button
                                                type="text"
                                                className="pbj-fb-action-btn"
                                                icon={<EyeOutlined />}
                                                onClick={() => handleOpenDetail(record)}
                                            >
                                                Lihat Rincian
                                            </Button>

                                            {isAdmin && (
                                                <Button
                                                    type="text"
                                                    className="pbj-fb-action-btn"
                                                    icon={<EditOutlined />}
                                                    onClick={() => handleOpenEdit(record)}
                                                >
                                                    Edit
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>

            {/* ── MODAL CREATE / EDIT (Compact & Non-Bloated) ── */}
            <Modal
                className="pbj-modal"
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                width={720}
                destroyOnClose
                title={null}
            >
                <div className="pbj-modal-header">
                    <div style={{ width: 32, height: 32, borderRadius: 6, background: '#eff6ff', color: '#0F5B99', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                        {modalMode === 'create' ? <PlusOutlined /> : <EditOutlined />}
                    </div>
                    <div>
                        <h3 className="pbj-modal-header__title">
                            {modalMode === 'create' ? 'Tambah Data Pengadaan PBJ' : 'Edit Data Pengadaan PBJ'}
                        </h3>
                        <div className="pbj-modal-header__sub">Isi informasi pengadaan barang dan jasa dengan benar.</div>
                    </div>
                </div>

                <Form form={form} layout="vertical" onFinish={handleSaveForm}>
                    <div className="pbj-modal-body">
                        <Tabs
                            activeKey={modalActiveTab}
                            onChange={setModalActiveTab}
                            size="small"
                            items={[
                                {
                                    key: '1',
                                    label: <span><CodeSandboxOutlined /> 1. Paket & Penyedia</span>,
                                    children: (
                                        <>
                                            <div className="pbj-form-section">
                                                <div className="pbj-form-section__title">
                                                    <CodeSandboxOutlined /> Informasi Paket
                                                </div>
                                                <Form.Item
                                                    name="nama_pengadaan"
                                                    label="Nama Paket Pengadaan / Pekerjaan"
                                                    rules={[{ required: true, message: 'Nama pengadaan wajib diisi!' }]}
                                                    style={{ marginBottom: 10 }}
                                                >
                                                    <Input placeholder="Contoh: Pengadaan Alat Ultrasonik Laboratory" />
                                                </Form.Item>

                                                <div className="pbj-form-grid-2">
                                                    <Form.Item name="jenis_pengadaan" label="Jenis Metode Pengadaan" style={{ marginBottom: 10 }}>
                                                        <Select>
                                                            <Select.Option value="Langsung">Pengadaan Langsung</Select.Option>
                                                            <Select.Option value="E-Purchasing">E-Purchasing (E-Katalog)</Select.Option>
                                                        </Select>
                                                    </Form.Item>

                                                    <Form.Item name="tanggal_pengadaan" label="Tanggal Pengadaan / SPK" style={{ marginBottom: 10 }}>
                                                        <DatePicker format={DATE_UI} style={{ width: '100%' }} />
                                                    </Form.Item>
                                                </div>
                                            </div>

                                            <div className="pbj-form-section">
                                                <div className="pbj-form-section__title">
                                                    <ShopOutlined /> Penyedia & Nilai Anggaran
                                                </div>
                                                <div className="pbj-form-grid-2">
                                                    <Form.Item name="nama_penyedia" label="Nama Penyedia / Vendor" style={{ marginBottom: 10 }}>
                                                        <Input placeholder="Contoh: PT. Scientia Medika" />
                                                    </Form.Item>

                                                    <Form.Item name="no_kontrak" label="Nomor Kontrak / SPK" style={{ marginBottom: 10 }}>
                                                        <Input placeholder="Contoh: 027/SP/BPOM-PLP/2026" />
                                                    </Form.Item>
                                                </div>

                                                <Form.Item name="nominal" label="Nominal Anggaran (Rp)" style={{ marginBottom: 0 }}>
                                                    <InputNumber
                                                        style={{ width: '100%' }}
                                                        formatter={(value) => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                                                        parser={(value) => value.replace(/Rp\s?|(\.*)/g, '')}
                                                        placeholder="Contoh: 150.000.000"
                                                    />
                                                </Form.Item>
                                            </div>
                                        </>
                                    ),
                                },
                                {
                                    key: '2',
                                    label: <span><ClockCircleOutlined /> 2. Logistik & Tahapan</span>,
                                    children: (
                                        <>
                                            <div className="pbj-form-section">
                                                <div className="pbj-form-section__title">
                                                    <CalendarOutlined /> Timeline Pengiriman & BAST
                                                </div>
                                                <div className="pbj-form-grid-2">
                                                    <Form.Item name="tanggal_kirim" label="Tanggal Kirim Penyedia" style={{ marginBottom: 10 }}>
                                                        <DatePicker format={DATE_UI} style={{ width: '100%' }} />
                                                    </Form.Item>

                                                    <Form.Item name="tanggal_sampai" label="Tanggal Sampai di Kantor" style={{ marginBottom: 10 }}>
                                                        <DatePicker format={DATE_UI} style={{ width: '100%' }} />
                                                    </Form.Item>
                                                </div>

                                                <div className="pbj-form-grid-2">
                                                    <Form.Item name="no_bast" label="Nomor BAST" style={{ marginBottom: 10 }}>
                                                        <Input placeholder="Contoh: BAST/BPOM-PLP/05/2026" />
                                                    </Form.Item>

                                                    <Form.Item name="tanggal_bast" label="Tanggal BAST" style={{ marginBottom: 10 }}>
                                                        <DatePicker format={DATE_UI} style={{ width: '100%' }} />
                                                    </Form.Item>
                                                </div>
                                            </div>

                                            <div className="pbj-form-section">
                                                <div className="pbj-form-section__title">
                                                    <ClockCircleOutlined /> Tahap Siklus Pengadaan
                                                </div>
                                                <Form.Item
                                                    name="status_barang"
                                                    label="Status Tahap Terkini"
                                                    rules={[{ required: true, message: 'Status wajib dipilih!' }]}
                                                    style={{ marginBottom: 0 }}
                                                >
                                                    <Select>
                                                        <Select.Option value="Proses Negosiasi">Proses Negosiasi (20%)</Select.Option>
                                                        <Select.Option value="Proses PPK">Proses PPK (40%)</Select.Option>
                                                        <Select.Option value="Proses pengiriman">Proses Pengiriman (60%)</Select.Option>
                                                        <Select.Option value="Proses Pembayaran">Proses Pembayaran (80%)</Select.Option>
                                                        <Select.Option value="Selesai">Selesai (100%)</Select.Option>
                                                    </Select>
                                                </Form.Item>
                                            </div>
                                        </>
                                    ),
                                },
                                {
                                    key: '3',
                                    label: <span><FileTextOutlined /> 3. Berkas & Rincian Barang</span>,
                                    children: (
                                        <>
                                            <div className="pbj-form-section">
                                                <div className="pbj-form-section__title">
                                                    <FileTextOutlined /> Dokumen Pendukung Nextcloud
                                                </div>

                                                {/* Surat Pesanan */}
                                                <div className="pbj-upload-row">
                                                    <div className="pbj-upload-row__info">
                                                        <FileTextOutlined style={{ color: '#2563eb', fontSize: 16 }} />
                                                        <div>
                                                            <div className="pbj-upload-row__title">Surat Pesanan (SP)</div>
                                                            <div className="pbj-upload-row__sub">Dokumen SPK / Surat Pesanan</div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        {fileSuratPesanan ? (
                                                            <Tag closable onClose={() => setFileSuratPesanan(null)} color="blue">
                                                                {fileSuratPesanan.name}
                                                            </Tag>
                                                        ) : editingRecord?.file_surat_pesanan_url && !removeSuratPesanan ? (
                                                            <Tag closable onClose={() => setRemoveSuratPesanan(true)} color="green">
                                                                SP Terunggah
                                                            </Tag>
                                                        ) : (
                                                            <Upload
                                                                beforeUpload={(file) => {
                                                                    setFileSuratPesanan(file);
                                                                    setRemoveSuratPesanan(false);
                                                                    return false;
                                                                }}
                                                                showUploadList={false}
                                                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                                            >
                                                                <Button icon={<UploadOutlined />} size="small">
                                                                    Upload SP
                                                                </Button>
                                                            </Upload>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* BAST */}
                                                <div className="pbj-upload-row">
                                                    <div className="pbj-upload-row__info">
                                                        <FileDoneOutlined style={{ color: '#059669', fontSize: 16 }} />
                                                        <div>
                                                            <div className="pbj-upload-row__title">Berita Acara (BAST)</div>
                                                            <div className="pbj-upload-row__sub">Dokumen Serah Terima BAST</div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        {fileBast ? (
                                                            <Tag closable onClose={() => setFileBast(null)} color="blue">
                                                                {fileBast.name}
                                                            </Tag>
                                                        ) : editingRecord?.file_bast_url && !removeBast ? (
                                                            <Tag closable onClose={() => setRemoveBast(true)} color="green">
                                                                BAST Terunggah
                                                            </Tag>
                                                        ) : (
                                                            <Upload
                                                                beforeUpload={(file) => {
                                                                    setFileBast(file);
                                                                    setRemoveBast(false);
                                                                    return false;
                                                                }}
                                                                showUploadList={false}
                                                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                                            >
                                                                <Button icon={<UploadOutlined />} size="small">
                                                                    Upload BAST
                                                                </Button>
                                                            </Upload>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Invoice */}
                                                <div className="pbj-upload-row">
                                                    <div className="pbj-upload-row__info">
                                                        <FileProtectOutlined style={{ color: '#7c3aed', fontSize: 16 }} />
                                                        <div>
                                                            <div className="pbj-upload-row__title">Invoice / Faktur</div>
                                                            <div className="pbj-upload-row__sub">Tagihan / Kuitansi</div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        {fileInvoice ? (
                                                            <Tag closable onClose={() => setFileInvoice(null)} color="blue">
                                                                {fileInvoice.name}
                                                            </Tag>
                                                        ) : editingRecord?.file_invoice_url && !removeInvoice ? (
                                                            <Tag closable onClose={() => setRemoveInvoice(true)} color="green">
                                                                Invoice Terunggah
                                                            </Tag>
                                                        ) : (
                                                            <Upload
                                                                beforeUpload={(file) => {
                                                                    setFileInvoice(file);
                                                                    setRemoveInvoice(false);
                                                                    return false;
                                                                }}
                                                                showUploadList={false}
                                                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                                            >
                                                                <Button icon={<UploadOutlined />} size="small">
                                                                    Upload Invoice
                                                                </Button>
                                                            </Upload>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Rincian Barang */}
                                            <div className="pbj-form-section">
                                                <div className="pbj-form-section__title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span><BoxPlotOutlined /> Rincian Item Barang (Opsional)</span>
                                                    <Button
                                                        type="dashed"
                                                        icon={<PlusOutlined />}
                                                        onClick={handleAddItem}
                                                        size="small"
                                                        style={{ borderColor: '#0F5B99', color: '#0F5B99', fontWeight: 600 }}
                                                    >
                                                        Tambah Item
                                                    </Button>
                                                </div>

                                                {itemList.length === 0 ? (
                                                    <div style={{ textAlign: 'center', padding: '16px', color: '#8c939d', fontSize: 12, background: '#fff', border: '1px dashed #e4e6eb', borderRadius: 6 }}>
                                                        Belum ada rincian item barang.
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e4e6eb', borderRadius: 6 }}>
                                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                                                <thead>
                                                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e4e6eb', textAlign: 'left', color: '#65676b' }}>
                                                                        <th style={{ padding: '6px 8px' }}>KODE</th>
                                                                        <th style={{ padding: '6px 8px' }}>NAMA BARANG</th>
                                                                        <th style={{ padding: '6px 8px', width: 70 }}>JML</th>
                                                                        <th style={{ padding: '6px 8px', width: 120 }}>HARGA</th>
                                                                        <th style={{ padding: '6px 8px', textAlign: 'right' }}>TOTAL</th>
                                                                        <th style={{ padding: '6px 8px', width: 30 }} />
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {itemList.map((item, idx) => (
                                                                        <tr key={item.key || idx} style={{ borderBottom: '1px solid #f0f2f5' }}>
                                                                            <td style={{ padding: '4px 6px' }}>
                                                                                <Input
                                                                                    size="small"
                                                                                    placeholder="Kode"
                                                                                    value={item.kode_barang}
                                                                                    onChange={(e) => handleItemChange(idx, 'kode_barang', e.target.value)}
                                                                                />
                                                                            </td>
                                                                            <td style={{ padding: '4px 6px' }}>
                                                                                <Input
                                                                                    size="small"
                                                                                    placeholder="Nama barang"
                                                                                    value={item.nama_barang}
                                                                                    onChange={(e) => handleItemChange(idx, 'nama_barang', e.target.value)}
                                                                                />
                                                                            </td>
                                                                            <td style={{ padding: '4px 6px' }}>
                                                                                <InputNumber
                                                                                    size="small"
                                                                                    min={1}
                                                                                    style={{ width: '100%' }}
                                                                                    value={item.jumlah}
                                                                                    onChange={(val) => handleItemChange(idx, 'jumlah', val)}
                                                                                />
                                                                            </td>
                                                                            <td style={{ padding: '4px 6px' }}>
                                                                                <InputNumber
                                                                                    size="small"
                                                                                    min={0}
                                                                                    style={{ width: '100%' }}
                                                                                    formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                                                                                    parser={(val) => val.replace(/\./g, '')}
                                                                                    value={item.harga_satuan}
                                                                                    onChange={(val) => handleItemChange(idx, 'harga_satuan', val)}
                                                                                />
                                                                            </td>
                                                                            <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                                                                                Rp {(item.total_harga || 0).toLocaleString('id-ID')}
                                                                            </td>
                                                                            <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                                                                                <Button
                                                                                    type="text"
                                                                                    danger
                                                                                    size="small"
                                                                                    icon={<DeleteOutlined />}
                                                                                    onClick={() => handleRemoveItem(idx)}
                                                                                />
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>

                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                                                            <span style={{ fontSize: 12, fontWeight: 700, color: '#050505' }}>
                                                                Total: Rp {grandTotalItems.toLocaleString('id-ID')}
                                                            </span>
                                                            <Button
                                                                type="dashed"
                                                                size="small"
                                                                onClick={handleSyncNominalFromItems}
                                                                style={{ fontSize: 11, borderColor: '#059669', color: '#059669', fontWeight: 600 }}
                                                            >
                                                                Sync ke Nominal
                                                            </Button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </>
                                    ),
                                },
                            ]}
                        />
                    </div>

                    <div className="pbj-modal-footer">
                        <div>
                            {modalActiveTab !== '1' && (
                                <Button
                                    icon={<LeftOutlined />}
                                    onClick={() => setModalActiveTab(String(Number(modalActiveTab) - 1))}
                                    size="small"
                                >
                                    Sebelumnya
                                </Button>
                            )}
                            {modalActiveTab !== '3' && (
                                <Button
                                    icon={<RightOutlined />}
                                    onClick={() => setModalActiveTab(String(Number(modalActiveTab) + 1))}
                                    size="small"
                                    style={{ marginLeft: 6, color: '#0F5B99', fontWeight: 600 }}
                                >
                                    Berikutnya
                                </Button>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: 8 }}>
                            <Button onClick={() => setIsModalOpen(false)}>
                                Batal
                            </Button>
                            <Button type="primary" htmlType="submit" loading={submitting} icon={<CheckCircleOutlined />} style={{ backgroundColor: '#0F5B99' }}>
                                {modalMode === 'create' ? 'Simpan Pengadaan' : 'Perbarui Data'}
                            </Button>
                        </div>
                    </div>
                </Form>
            </Modal>

            {/* ── DETAIL MODAL (Clean, Focused, Non-Bloated) ── */}
            <Modal
                className="pbj-detail-modal"
                open={isDrawerOpen}
                onCancel={() => setIsDrawerOpen(false)}
                centered
                width={780}
                destroyOnClose
                title={null}
                footer={null}
            >
                {detailRecord && (
                    <>
                        <div className="pbj-modal-header" style={{ justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <VendorAvatar name={detailRecord.nama_penyedia} jenis={detailRecord.jenis_pengadaan} />
                                <div>
                                    <h3 className="pbj-modal-header__title">{detailRecord.nama_pengadaan}</h3>
                                    <div className="pbj-modal-header__sub">
                                        {detailRecord.nama_penyedia || 'Penyedia Belum Diisi'} • <span style={{ color: '#0F5B99', fontWeight: 600 }}>{detailRecord.jenis_pengadaan || 'Langsung'}</span>
                                    </div>
                                </div>
                            </div>
                            <DotStatusIndicator status={detailRecord.status_barang} />
                        </div>

                        <div className="pbj-modal-body">
                            {/* Budget & Stage Visual Tracker */}
                            <div style={{ background: '#f8fafc', border: '1px solid #e4e6eb', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                                    <div>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: '#65676b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>TOTAL NOMINAL ANGGARAN</div>
                                        <div style={{ fontSize: 20, fontWeight: 800, color: '#059669', marginTop: 2 }}>
                                            <FormatRupiah amount={detailRecord.nominal} />
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right', fontSize: 12, color: '#65676b' }}>
                                        {detailRecord.no_kontrak && <div>SP: <b style={{ fontFamily: 'monospace' }}>{detailRecord.no_kontrak}</b></div>}
                                        {detailRecord.tanggal_pengadaan && <div>SPK: <b>{dayjs(detailRecord.tanggal_pengadaan).format('DD MMM YYYY')}</b></div>}
                                    </div>
                                </div>

                                {/* 5-Stage Stepper Progress */}
                                <div className="pbj-fb-pipeline" style={{ background: '#fff', border: '1px solid #ced0d4', padding: '8px 12px' }}>
                                    <div className="pbj-fb-pipeline__header">
                                        <span className="pbj-fb-pipeline__label">Tahapan Pengadaan:</span>
                                        <span style={{ fontWeight: 700, color: STATUS_CONFIG[detailRecord.status_barang]?.color || '#0F5B99', fontSize: 12 }}>
                                            {STATUS_CONFIG[detailRecord.status_barang]?.percent || 20}%
                                        </span>
                                    </div>
                                    <div className="pbj-fb-pipeline__bar">
                                        {STAGES.map((st, sIdx) => {
                                            const stepNum = sIdx + 1;
                                            const currentStep = (STATUS_CONFIG[detailRecord.status_barang] || { step: 1 }).step;
                                            const isCompleted = stepNum <= currentStep;
                                            const isCurrent = stepNum === currentStep;
                                            return (
                                                <div
                                                    key={st.title}
                                                    className={`pbj-fb-pipeline__segment ${isCompleted ? 'is-active' : ''} ${isCurrent ? 'is-current' : ''}`}
                                                    title={`Tahap ${stepNum}: ${st.title} (${st.pct})`}
                                                >
                                                    <div className="pbj-fb-pipeline__segment-fill" />
                                                    <span className="pbj-fb-pipeline__segment-text">{st.title}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Key Value Details Grid */}
                            <div className="pbj-form-section">
                                <div className="pbj-form-section__title">
                                    <CalendarOutlined /> Rincian Logistik & Dokumen BAST
                                </div>
                                <div className="pbj-form-grid-2">
                                    <div>
                                        <span style={{ fontSize: 11, color: '#65676b', fontWeight: 600 }}>TANGGAL KIRIM:</span>
                                        <div style={{ marginTop: 2 }}><DateBadge value={detailRecord.tanggal_kirim} /></div>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: 11, color: '#65676b', fontWeight: 600 }}>TANGGAL SAMPAI:</span>
                                        <div style={{ marginTop: 2 }}><DateBadge value={detailRecord.tanggal_sampai} /></div>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: 11, color: '#65676b', fontWeight: 600 }}>NOMOR BAST:</span>
                                        <div style={{ fontWeight: 600, color: '#050505', fontSize: 12.5, marginTop: 2 }}>{detailRecord.no_bast || '—'}</div>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: 11, color: '#65676b', fontWeight: 600 }}>TANGGAL BAST:</span>
                                        <div style={{ marginTop: 2 }}><DateBadge value={detailRecord.tanggal_bast} /></div>
                                    </div>
                                </div>
                            </div>

                            {/* Documents Nextcloud */}
                            <div className="pbj-form-section">
                                <div className="pbj-form-section__title">
                                    <FileTextOutlined /> Dokumen Lampiran Berkas
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <div className="pbj-upload-row">
                                        <div className="pbj-upload-row__info">
                                            <FileTextOutlined style={{ color: '#2563eb', fontSize: 15 }} />
                                            <span style={{ fontSize: 12.5, fontWeight: 600 }}>Surat Pesanan (SP / SPK)</span>
                                        </div>
                                        {detailRecord.file_surat_pesanan_url ? (
                                            <a href={detailRecord.file_surat_pesanan_url} target="_blank" rel="noreferrer" className="pbj-fb-doc-pill is-available">
                                                Buka Berkas SP
                                            </a>
                                        ) : (
                                            <span className="pbj-fb-doc-pill is-empty">Belum Diunggah</span>
                                        )}
                                    </div>

                                    <div className="pbj-upload-row">
                                        <div className="pbj-upload-row__info">
                                            <FileDoneOutlined style={{ color: '#059669', fontSize: 15 }} />
                                            <span style={{ fontSize: 12.5, fontWeight: 600 }}>Berita Acara Serah Terima (BAST)</span>
                                        </div>
                                        {detailRecord.file_bast_url ? (
                                            <a href={detailRecord.file_bast_url} target="_blank" rel="noreferrer" className="pbj-fb-doc-pill is-available">
                                                Buka Berkas BAST
                                            </a>
                                        ) : (
                                            <span className="pbj-fb-doc-pill is-empty">Belum Diunggah</span>
                                        )}
                                    </div>

                                    <div className="pbj-upload-row">
                                        <div className="pbj-upload-row__info">
                                            <FileProtectOutlined style={{ color: '#7c3aed', fontSize: 15 }} />
                                            <span style={{ fontSize: 12.5, fontWeight: 600 }}>Invoice / Kuitansi Tagihan</span>
                                        </div>
                                        {detailRecord.file_invoice_url ? (
                                            <a href={detailRecord.file_invoice_url} target="_blank" rel="noreferrer" className="pbj-fb-doc-pill is-available">
                                                Buka Berkas Invoice
                                            </a>
                                        ) : (
                                            <span className="pbj-fb-doc-pill is-empty">Belum Diunggah</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Detail Items if any */}
                            {Array.isArray(detailRecord.items) && detailRecord.items.length > 0 && (
                                <div className="pbj-form-section" style={{ marginBottom: 0 }}>
                                    <div className="pbj-form-section__title">
                                        <BoxPlotOutlined /> Rincian Item Barang ({detailRecord.items.length} item)
                                    </div>
                                    <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e4e6eb', borderRadius: 6 }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                            <thead>
                                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e4e6eb', textAlign: 'left', color: '#65676b' }}>
                                                    <th style={{ padding: '6px 8px' }}>KODE</th>
                                                    <th style={{ padding: '6px 8px' }}>NAMA BARANG</th>
                                                    <th style={{ padding: '6px 8px', textAlign: 'center' }}>JML</th>
                                                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>HARGA</th>
                                                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>TOTAL</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {detailRecord.items.map((it, idx) => (
                                                    <tr key={idx} style={{ borderBottom: '1px solid #f0f2f5' }}>
                                                        <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{it.kode_barang || '—'}</td>
                                                        <td style={{ padding: '6px 8px', fontWeight: 600 }}>{it.nama_barang || '—'}</td>
                                                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>{it.jumlah || 1}</td>
                                                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>Rp {Number(it.harga_satuan || 0).toLocaleString('id-ID')}</td>
                                                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                                                            Rp {Number(it.total_harga || 0).toLocaleString('id-ID')}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="pbj-modal-footer">
                            <div>
                                {isAdmin && (
                                    <Button
                                        icon={<EditOutlined />}
                                        onClick={() => {
                                            setIsDrawerOpen(false);
                                            handleOpenEdit(detailRecord);
                                        }}
                                    >
                                        Edit Data
                                    </Button>
                                )}
                            </div>
                            <Button type="primary" onClick={() => setIsDrawerOpen(false)} style={{ backgroundColor: '#0F5B99' }}>
                                Tutup
                            </Button>
                        </div>
                    </>
                )}
            </Modal>
        </div>
    );
}

export default function PengadaanPbj() {
    return (
        <AntdApp>
            <PengadaanPbjInner />
        </AntdApp>
    );
}
