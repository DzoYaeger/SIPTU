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
    Drawer,
    Upload,
    Popconfirm,
    Segmented,
    Dropdown,
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
    DollarOutlined,
    ReloadOutlined,
    AppstoreOutlined,
    UnorderedListOutlined,
    EyeOutlined,
    ShopOutlined,
    FileTextOutlined,
    UploadOutlined,
    PaperClipOutlined,
    FileDoneOutlined,
    FileProtectOutlined,
    FilterOutlined,
    ClearOutlined,
    SyncOutlined,
    MoreOutlined,
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
    'Proses Negosiasi': { step: 1, percent: 20, color: '#d97706', bg: '#fffbeb', border: '#fef3c7', tagColor: 'warning', label: 'Negosiasi' },
    'Proses PPK': { step: 2, percent: 40, color: '#0284c7', bg: '#f0f9ff', border: '#e0f2fe', tagColor: 'processing', label: 'PPK' },
    'Proses pengiriman': { step: 3, percent: 60, color: '#4338ca', bg: '#eef2ff', border: '#e0e7ff', tagColor: 'geekblue', label: 'Pengiriman' },
    'Proses Pembayaran': { step: 4, percent: 80, color: '#6d28d9', bg: '#f5f3ff', border: '#ede9fe', tagColor: 'purple', label: 'Pembayaran' },
    'Selesai': { step: 5, percent: 100, color: '#047857', bg: '#ecfdf5', border: '#d1fae5', tagColor: 'success', label: 'Selesai' },
};

function StatusProgress({ status }) {
    const config = STATUS_CONFIG[status] || { step: 1, percent: 20, color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' };
    return (
        <div className="pbj-progress-mini">
            <div className="pbj-progress-mini__label">
                <span style={{ fontWeight: 600, color: config.color, fontSize: 12 }}>{status || '—'}</span>
                <span className="pbj-progress-mini__pct" style={{ backgroundColor: config.bg, color: config.color, borderColor: config.border }}>
                    {config.percent}%
                </span>
            </div>
            <div className="pbj-progress-mini__bar">
                <div
                    className="pbj-progress-mini__fill"
                    style={{ width: `${config.percent}%`, backgroundColor: config.color }}
                />
            </div>
        </div>
    );
}

function StatusStepper({ currentStatus }) {
    const config = STATUS_CONFIG[currentStatus] || { step: 1, color: '#0F5B99' };
    const currentStep = config.step;
    const steps = ['Negosiasi', 'PPK', 'Pengiriman', 'Pembayaran', 'Selesai'];

    return (
        <div className="pbj-stepper">
            {steps.map((label, idx) => {
                const stepNum = idx + 1;
                const isCompleted = stepNum < currentStep;
                const isActive = stepNum === currentStep;

                let style = {
                    background: '#f8fafc',
                    color: '#94a3b8',
                    border: '1px solid #cbd5e1',
                };

                if (isCompleted) {
                    style = {
                        background: config.color,
                        color: '#ffffff',
                        border: `1px solid ${config.color}`,
                    };
                } else if (isActive) {
                    style = {
                        background: config.color,
                        color: '#ffffff',
                        border: `1px solid ${config.color}`,
                        boxShadow: `0 0 0 3px ${config.color}33`,
                        transform: 'scale(1.12)',
                    };
                }

                return (
                    <Tooltip key={label} title={`Tahap ${stepNum}: ${label} (${stepNum * 20}%)`}>
                        <div className="pbj-stepper-step" style={style}>
                            {isCompleted ? <CheckOutlined style={{ fontSize: 9 }} /> : stepNum}
                        </div>
                    </Tooltip>
                );
            })}
        </div>
    );
}

function BigStatusStepper({ currentStatus }) {
    const config = STATUS_CONFIG[currentStatus] || { step: 1, color: '#0F5B99' };
    const currentStep = config.step;
    const stages = [
        { title: 'Negosiasi', pct: '20%', desc: 'Harga & Negosiasi' },
        { title: 'Proses PPK', pct: '40%', desc: 'SK & Surat Pesanan' },
        { title: 'Pengiriman', pct: '60%', desc: 'Pengiriman Barang' },
        { title: 'Pembayaran', pct: '80%', desc: 'Verifikasi SPM/SP2D' },
        { title: 'Selesai', pct: '100%', desc: 'BAST & Serah Terima' },
    ];

    return (
        <div className="pbj-big-stepper">
            {stages.map((st, idx) => {
                const stepNum = idx + 1;
                const isCompleted = stepNum < currentStep;
                const isActive = stepNum === currentStep;

                let stateClass = 'pbj-big-stepper__item';
                if (isCompleted) stateClass += ' pbj-big-stepper__item--completed';
                if (isActive) stateClass += ' pbj-big-stepper__item--active';

                return (
                    <div key={st.title} className={stateClass}>
                        <div className="pbj-big-stepper__circle">
                            {isCompleted ? <CheckOutlined /> : stepNum}
                        </div>
                        <div className="pbj-big-stepper__content">
                            <div className="pbj-big-stepper__title">{st.title}</div>
                            <div className="pbj-big-stepper__pct">{st.pct}</div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function DateBadge({ value }) {
    if (!value) return <span style={{ color: '#94a3b8' }}>—</span>;
    return (
        <span className="pbj-code-badge" style={{ background: '#FFFFFF', borderColor: '#e2e8f0' }}>
            <CalendarOutlined style={{ fontSize: 11, color: '#0F5B99' }} />{' '}
            {dayjs(value).format('DD MMM YYYY')}
        </span>
    );
}

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

    // Modal & Drawer State
    const [form] = Form.useForm();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [editingRecord, setEditingRecord] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [fileSuratPesanan, setFileSuratPesanan] = useState(null);
    const [fileBast, setFileBast] = useState(null);
    const [fileInvoice, setFileInvoice] = useState(null);
    const [removeSuratPesanan, setRemoveSuratPesanan] = useState(false);
    const [removeBast, setRemoveBast] = useState(false);
    const [removeInvoice, setRemoveInvoice] = useState(false);

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [detailRecord, setDetailRecord] = useState(null);

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
        setEditingRecord(null);
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
        setEditingRecord(record);
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

    // KPI Aggregation
    const kpiStats = useMemo(() => {
        const total = dataRows.length;
        const negosiasi = dataRows.filter((r) => r.status_barang === 'Proses Negosiasi').length;
        const ppk = dataRows.filter((r) => r.status_barang === 'Proses PPK').length;
        const kirim = dataRows.filter((r) => r.status_barang === 'Proses pengiriman').length;
        const bayar = dataRows.filter((r) => r.status_barang === 'Proses Pembayaran').length;
        const inProgress = dataRows.filter((r) => r.status_barang !== 'Selesai').length;
        const finished = dataRows.filter((r) => r.status_barang === 'Selesai').length;
        const totalAmount = dataRows.reduce((acc, r) => acc + (Number(r.nominal) || 0), 0);

        return { total, negosiasi, ppk, kirim, bayar, inProgress, finished, totalAmount };
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

            // --- KOP SURAT ---
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

            // Garis pembatas kop
            doc.setLineWidth(0.8);
            doc.line(margin, 34, pageWidth - margin, 34);
            doc.setLineWidth(0.3);
            doc.line(margin, 35.5, pageWidth - margin, 35.5);

            // --- JUDUL DOKUMEN ---
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

            // Signature block
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
            width: 50,
            align: 'center',
            render: (_, __, i) => (
                <span style={{ fontWeight: 600, color: '#94a3b8', fontSize: 12 }}>
                    {(pagination.current - 1) * pagination.pageSize + i + 1}
                </span>
            ),
        },
        {
            title: 'PENGADAAN & PENYEDIA',
            dataIndex: 'nama_pengadaan',
            key: 'nama_pengadaan',
            width: 340,
            render: (v, r) => {
                const isEPurchasing = r.jenis_pengadaan === 'E-Purchasing';
                return (
                    <div className="pbj-item-meta">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span className={`pbj-jenis-pill ${isEPurchasing ? 'pbj-jenis-pill--ep' : 'pbj-jenis-pill--direct'}`}>
                                {r.jenis_pengadaan || 'Langsung'}
                            </span>
                            {r.tanggal_pengadaan && (
                                <span className="pbj-sub-date">
                                    <CalendarOutlined style={{ fontSize: 10 }} /> {dayjs(r.tanggal_pengadaan).format('DD MMM YYYY')}
                                </span>
                            )}
                        </div>
                        <div className="pbj-title-text" onClick={() => handleOpenDetail(r)} title="Klik untuk lihat rincian">
                            {v || '—'}
                        </div>
                        <div className="pbj-vendor-sub">
                            <ShopOutlined style={{ color: '#64748b', fontSize: 11 }} /> {r.nama_penyedia || 'Penyedia belum diisi'}
                            {r.no_kontrak && <span className="pbj-contract-pill">SP: {r.no_kontrak}</span>}
                        </div>
                    </div>
                );
            },
        },
        {
            title: 'NOMINAL ANGGARAN',
            dataIndex: 'nominal',
            key: 'nominal',
            width: 170,
            render: (v) => <FormatRupiah amount={v} />,
        },
        {
            title: 'TAHAP & STATUS SIKLUS',
            dataIndex: 'status_barang',
            key: 'status_barang',
            width: 230,
            render: (v) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <StatusProgress status={v} />
                    <StatusStepper currentStatus={v} />
                </div>
            ),
        },
        {
            title: 'DOKUMEN LAMPIRAN',
            key: 'dokumen',
            width: 210,
            render: (_, r) => (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {r.file_surat_pesanan_url ? (
                        <a href={r.file_surat_pesanan_url} target="_blank" rel="noreferrer">
                            <span className="pbj-doc-pill pbj-doc-pill--active-sp">
                                <FileTextOutlined style={{ fontSize: 11 }} /> SP
                            </span>
                        </a>
                    ) : (
                        <span className="pbj-doc-pill pbj-doc-pill--empty">SP</span>
                    )}

                    {r.file_bast_url ? (
                        <a href={r.file_bast_url} target="_blank" rel="noreferrer">
                            <span className="pbj-doc-pill pbj-doc-pill--active-bast">
                                <FileDoneOutlined style={{ fontSize: 11 }} /> BAST
                            </span>
                        </a>
                    ) : (
                        <span className="pbj-doc-pill pbj-doc-pill--empty">BAST</span>
                    )}

                    {r.file_invoice_url ? (
                        <a href={r.file_invoice_url} target="_blank" rel="noreferrer">
                            <span className="pbj-doc-pill pbj-doc-pill--active-inv">
                                <FileProtectOutlined style={{ fontSize: 11 }} /> Invoice
                            </span>
                        </a>
                    ) : (
                        <span className="pbj-doc-pill pbj-doc-pill--empty">Invoice</span>
                    )}
                </div>
            ),
        },
        {
            title: 'AKSI',
            key: 'aksi',
            width: 70,
            align: 'center',
            render: (_, r) => {
                const items = [
                    {
                        key: 'detail',
                        label: 'Lihat Rincian',
                        icon: <EyeOutlined style={{ color: '#1e293b' }} />,
                        onClick: () => handleOpenDetail(r),
                    },
                ];

                if (isAdmin) {
                    items.push({
                        key: 'edit',
                        label: 'Edit Data Pengadaan',
                        icon: <EditOutlined style={{ color: '#1e293b' }} />,
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
                                content: `Apakah Anda yakin ingin menghapus data "${r.nama_pengadaan}"? Seluruh dokumen lampiran Nextcloud juga akan dihapus.`,
                                okText: 'Ya, Hapus',
                                cancelText: 'Batal',
                                okButtonProps: { danger: true },
                                onOk: () => handleDelete(r.id),
                            });
                        },
                    });
                }

                return (
                    <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
                        <Button type="text" shape="circle" icon={<MoreOutlined style={{ color: '#1e293b', fontSize: 16 }} />} />
                    </Dropdown>
                );
            },
        },
    ];

    return (
        <div className="pbj-page-wrapper">
            {/* Header Title & Subtitle */}
            <div className="pbj-header">
                <div className="pbj-header__left">
                    <Button
                        type="text"
                        icon={<ArrowLeftOutlined />}
                        className="pbj-back-btn"
                        onClick={() => navigate(-1)}
                    />
                    <div>
                        <div className="pbj-header__title-row">
                            <h1 className="pbj-header__title">Proses Pengadaan Barang & Jasa (PBJ)</h1>
                            <span className="pbj-header__badge">SIPTU ULTRA</span>
                        </div>
                        <p className="pbj-header__subtitle">
                            Kelola siklus pengadaan (Negosiasi ➔ PPK ➔ Logistik ➔ Pembayaran ➔ Selesai) dan lampiran dokumen Nextcloud.
                        </p>
                    </div>
                </div>
                <div className="pbj-header__actions">
                    <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
                        Refresh
                    </Button>
                    <Button icon={<FilePdfOutlined />} onClick={exportToPdf} style={{ borderColor: '#ef4444', color: '#ef4444' }}>
                        Cetak PDF
                    </Button>
                    {isAdmin && (
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={handleOpenCreate}
                            style={{ background: '#0F5B99', borderColor: '#0F5B99', fontWeight: 600 }}
                        >
                            Tambah Data PBJ
                        </Button>
                    )}
                </div>
            </div>

            {/* Metric KPI Summary Cards (Interactive) */}
            <div className="pbj-kpi-grid">
                {/* 1. Total Pengadaan */}
                <div
                    className={`pbj-kpi-card ${statusFilter === 'ALL' ? 'pbj-kpi-card--active' : ''}`}
                    onClick={() => setStatusFilter('ALL')}
                    title="Klik untuk memfilter semua pengadaan"
                >
                    <div className="pbj-kpi-card__icon pbj-kpi-card__icon--blue">
                        <CodeSandboxOutlined />
                    </div>
                    <div className="pbj-kpi-card__body">
                        <span className="pbj-kpi-card__label">Total Pengadaan</span>
                        <span className="pbj-kpi-card__val">{kpiStats.total}</span>
                        <span className="pbj-kpi-card__sub">Seluruh item pengadaan</span>
                    </div>
                </div>

                {/* 2. Dalam Proses */}
                <div
                    className={`pbj-kpi-card ${statusFilter === 'IN_PROGRESS' ? 'pbj-kpi-card--active' : ''}`}
                    onClick={() => setStatusFilter('IN_PROGRESS')}
                    title="Klik untuk memfilter pengadaan yang sedang berjalan"
                >
                    <div className="pbj-kpi-card__icon pbj-kpi-card__icon--amber">
                        <ClockCircleOutlined />
                    </div>
                    <div className="pbj-kpi-card__body">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span className="pbj-kpi-card__label">Dalam Proses</span>
                            <span className="pbj-live-dot" />
                        </div>
                        <span className="pbj-kpi-card__val" style={{ color: '#d97706' }}>{kpiStats.inProgress}</span>
                        <span className="pbj-kpi-card__sub">Sedang berjalan (Tahap 1-4)</span>
                    </div>
                </div>

                {/* 3. Pengadaan Selesai */}
                <div
                    className={`pbj-kpi-card ${statusFilter === 'Selesai' ? 'pbj-kpi-card--active' : ''}`}
                    onClick={() => setStatusFilter('Selesai')}
                    title="Klik untuk memfilter pengadaan yang telah selesai"
                >
                    <div className="pbj-kpi-card__icon pbj-kpi-card__icon--emerald">
                        <CheckCircleOutlined />
                    </div>
                    <div className="pbj-kpi-card__body">
                        <span className="pbj-kpi-card__label">Pengadaan Selesai</span>
                        <span className="pbj-kpi-card__val" style={{ color: '#047857' }}>{kpiStats.finished}</span>
                        <span className="pbj-kpi-card__sub">Tuntas & Serah Terima BAST</span>
                    </div>
                </div>

                {/* 4. Total Nilai Pengadaan */}
                <div className="pbj-kpi-card pbj-kpi-card--static">
                    <div className="pbj-kpi-card__icon pbj-kpi-card__icon--purple">
                        <DollarOutlined />
                    </div>
                    <div className="pbj-kpi-card__body">
                        <span className="pbj-kpi-card__label">Total Nilai Anggaran</span>
                        <span className="pbj-kpi-card__val pbj-kpi-card__val--price">
                            Rp {(kpiStats.totalAmount / 1000000).toFixed(1)} Jt
                        </span>
                        <span className="pbj-kpi-card__sub">Akumulasi nominal PBJ</span>
                    </div>
                </div>
            </div>

            {/* Quick Status Stage Tabs & Search Filter Bar */}
            <div className="pbj-filter-card">
                <div className="pbj-stage-tabs">
                    <div className="pbj-stage-tabs__label">
                        <FilterOutlined /> Tahap Siklus:
                    </div>
                    <div className="pbj-stage-tabs__scroll">
                        <button
                            className={`pbj-stage-btn ${statusFilter === 'ALL' ? 'pbj-stage-btn--active' : ''}`}
                            onClick={() => setStatusFilter('ALL')}
                        >
                            Semua ({kpiStats.total})
                        </button>
                        <button
                            className={`pbj-stage-btn ${statusFilter === 'Proses Negosiasi' ? 'pbj-stage-btn--active' : ''}`}
                            onClick={() => setStatusFilter('Proses Negosiasi')}
                        >
                            <span className="pbj-stage-dot" style={{ background: '#d97706' }} />
                            Negosiasi ({kpiStats.negosiasi})
                        </button>
                        <button
                            className={`pbj-stage-btn ${statusFilter === 'Proses PPK' ? 'pbj-stage-btn--active' : ''}`}
                            onClick={() => setStatusFilter('Proses PPK')}
                        >
                            <span className="pbj-stage-dot" style={{ background: '#0284c7' }} />
                            PPK ({kpiStats.ppk})
                        </button>
                        <button
                            className={`pbj-stage-btn ${statusFilter === 'Proses pengiriman' ? 'pbj-stage-btn--active' : ''}`}
                            onClick={() => setStatusFilter('Proses pengiriman')}
                        >
                            <span className="pbj-stage-dot" style={{ background: '#4338ca' }} />
                            Pengiriman ({kpiStats.kirim})
                        </button>
                        <button
                            className={`pbj-stage-btn ${statusFilter === 'Proses Pembayaran' ? 'pbj-stage-btn--active' : ''}`}
                            onClick={() => setStatusFilter('Proses Pembayaran')}
                        >
                            <span className="pbj-stage-dot" style={{ background: '#6d28d9' }} />
                            Pembayaran ({kpiStats.bayar})
                        </button>
                        <button
                            className={`pbj-stage-btn ${statusFilter === 'Selesai' ? 'pbj-stage-btn--active' : ''}`}
                            onClick={() => setStatusFilter('Selesai')}
                        >
                            <span className="pbj-stage-dot" style={{ background: '#047857' }} />
                            Selesai ({kpiStats.finished})
                        </button>
                    </div>
                </div>

                <div className="pbj-toolbar">
                    <Input
                        placeholder="Cari pengadaan, penyedia, no. kontrak, BAST..."
                        prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        allowClear
                        className="pbj-search-input"
                    />

                    <Select
                        value={jenisFilter}
                        onChange={setJenisFilter}
                        className="pbj-jenis-select"
                        style={{ width: 170 }}
                    >
                        <Select.Option value="ALL">Semua Jenis PBJ</Select.Option>
                        <Select.Option value="E-Purchasing">E-Purchasing</Select.Option>
                        <Select.Option value="Langsung">Pengadaan Langsung</Select.Option>
                    </Select>

                    {(search || statusFilter !== 'ALL' || jenisFilter !== 'ALL') && (
                        <Button
                            icon={<ClearOutlined />}
                            onClick={() => {
                                setSearch('');
                                setStatusFilter('ALL');
                                setJenisFilter('ALL');
                            }}
                            type="text"
                            danger
                        >
                            Reset Filter
                        </Button>
                    )}

                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                        <Segmented
                            value={viewMode}
                            onChange={setViewMode}
                            options={[
                                { value: 'table', icon: <UnorderedListOutlined />, label: 'Tabel' },
                                { value: 'grid', icon: <AppstoreOutlined />, label: 'Kartu' },
                            ]}
                        />
                    </div>
                </div>
            </div>

            {/* Content Display: Table or Grid */}
            <div className="pbj-content-area">
                {viewMode === 'table' ? (
                    <div className="pbj-table-container">
                        <Table
                            dataSource={filteredRows}
                            columns={columns}
                            loading={loading}
                            pagination={{
                                ...pagination,
                                total: filteredRows.length,
                                showSizeChanger: true,
                                pageSizeOptions: ['10', '20', '50'],
                                showTotal: (t, range) => `${range[0]}-${range[1]} dari ${t} pengadaan`,
                                onChange: (page, pSize) => setPagination({ current: page, pageSize: pSize }),
                            }}
                            size="middle"
                            rowKey="id"
                        />
                    </div>
                ) : (
                    /* Grid Cards View */
                    <div className="pbj-grid-cards">
                        {loading ? (
                            <div className="pbj-loading-box">
                                <SyncOutlined spin style={{ fontSize: 24, color: '#0F5B99' }} />
                                <span>Memuat data pengadaan...</span>
                            </div>
                        ) : filteredRows.length === 0 ? (
                            <div className="pbj-empty-box">
                                <CodeSandboxOutlined style={{ fontSize: 40, color: '#cbd5e1' }} />
                                <p>Tidak ada data pengadaan yang sesuai filter.</p>
                            </div>
                        ) : (
                            filteredRows.map((record) => {
                                const statusCfg = STATUS_CONFIG[record.status_barang] || { color: '#64748b', label: record.status_barang };
                                const isEPurchasing = record.jenis_pengadaan === 'E-Purchasing';

                                return (
                                    <div key={record.id} className="pbj-card-item">
                                        <div className="pbj-card-item__top-bar" style={{ backgroundColor: statusCfg.color }} />
                                        <div className="pbj-card-item__header">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                                <span className={`pbj-jenis-pill ${isEPurchasing ? 'pbj-jenis-pill--ep' : 'pbj-jenis-pill--direct'}`}>
                                                    {record.jenis_pengadaan || 'Langsung'}
                                                </span>
                                                <Tag color={statusCfg.tagColor} style={{ borderRadius: 12, fontWeight: 600, margin: 0 }}>
                                                    {record.status_barang}
                                                </Tag>
                                            </div>
                                            <h3 className="pbj-card-item__title" onClick={() => handleOpenDetail(record)}>
                                                {record.nama_pengadaan}
                                            </h3>
                                        </div>

                                        <div className="pbj-card-item__body">
                                            <div className="pbj-card-vendor">
                                                <ShopOutlined style={{ color: '#0F5B99' }} />
                                                <span>{record.nama_penyedia || 'Penyedia belum diisi'}</span>
                                            </div>

                                            <div className="pbj-card-price">
                                                <span className="pbj-card-price__label">Nominal Anggaran</span>
                                                <FormatRupiah amount={record.nominal} />
                                            </div>

                                            <div style={{ margin: '8px 0' }}>
                                                <StatusProgress status={record.status_barang} />
                                            </div>

                                            {/* Attached Documents Tags */}
                                            <div className="pbj-card-docs">
                                                <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>Dokumen:</span>
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    {record.file_surat_pesanan_url ? (
                                                        <a href={record.file_surat_pesanan_url} target="_blank" rel="noreferrer">
                                                            <span className="pbj-doc-pill pbj-doc-pill--active-sp">SP</span>
                                                        </a>
                                                    ) : (
                                                        <span className="pbj-doc-pill pbj-doc-pill--empty">SP</span>
                                                    )}
                                                    {record.file_bast_url ? (
                                                        <a href={record.file_bast_url} target="_blank" rel="noreferrer">
                                                            <span className="pbj-doc-pill pbj-doc-pill--active-bast">BAST</span>
                                                        </a>
                                                    ) : (
                                                        <span className="pbj-doc-pill pbj-doc-pill--empty">BAST</span>
                                                    )}
                                                    {record.file_invoice_url ? (
                                                        <a href={record.file_invoice_url} target="_blank" rel="noreferrer">
                                                            <span className="pbj-doc-pill pbj-doc-pill--active-inv">Invoice</span>
                                                        </a>
                                                    ) : (
                                                        <span className="pbj-doc-pill pbj-doc-pill--empty">Invoice</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pbj-card-item__footer">
                                            <Button
                                                size="small"
                                                icon={<EyeOutlined style={{ color: '#1e293b' }} />}
                                                onClick={() => handleOpenDetail(record)}
                                            >
                                                Lihat Rincian
                                            </Button>

                                            <Dropdown
                                                menu={{
                                                    items: [
                                                        {
                                                            key: 'detail',
                                                            label: 'Lihat Rincian',
                                                            icon: <EyeOutlined style={{ color: '#1e293b' }} />,
                                                            onClick: () => handleOpenDetail(record),
                                                        },
                                                        ...(isAdmin
                                                            ? [
                                                                  {
                                                                      key: 'edit',
                                                                      label: 'Edit Data Pengadaan',
                                                                      icon: <EditOutlined style={{ color: '#1e293b' }} />,
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
                                                                              content: `Apakah Anda yakin ingin menghapus data "${record.nama_pengadaan}"?`,
                                                                              okText: 'Ya, Hapus',
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
                                                <Button type="text" shape="circle" icon={<MoreOutlined style={{ color: '#1e293b', fontSize: 16 }} />} />
                                            </Dropdown>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>

            {/* Modal Add & Edit Form */}
            <Modal
                className="pbj-modal"
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                width={760}
                destroyOnClose
                title={
                    <div className="pbj-modal-title">
                        <div className="pbj-modal-title__icon">
                            {modalMode === 'create' ? <PlusOutlined /> : <EditOutlined />}
                        </div>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#0F5B99' }}>
                                {modalMode === 'create' ? 'Tambah Data Pengadaan PBJ' : 'Edit Data Pengadaan PBJ'}
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 400, color: '#64748b' }}>
                                Isi rincian data pengadaan, nominal anggaran, dan berkas lampiran Nextcloud.
                            </div>
                        </div>
                    </div>
                }
            >
                <Form form={form} layout="vertical" onFinish={handleSaveForm} style={{ marginTop: 16 }}>
                    {/* Section 1: Informasi Utama */}
                    <div className="pbj-form-section">
                        <div className="pbj-form-section__title">
                            <CodeSandboxOutlined /> 1. Informasi Utama Pengadaan
                        </div>
                        <Form.Item
                            name="nama_pengadaan"
                            label="Nama Paket Pengadaan / Pekerjaan"
                            rules={[{ required: true, message: 'Nama pengadaan wajib diisi!' }]}
                        >
                            <Input placeholder="Contoh: Pengadaan Alat Ultrasonik dan Mikroskop Laboratory" size="large" />
                        </Form.Item>

                        <div className="pbj-form-grid-2">
                            <Form.Item name="jenis_pengadaan" label="Jenis Metode Pengadaan">
                                <Select size="large">
                                    <Select.Option value="Langsung">Pengadaan Langsung</Select.Option>
                                    <Select.Option value="E-Purchasing">E-Purchasing (E-Katalog)</Select.Option>
                                </Select>
                            </Form.Item>

                            <Form.Item name="tanggal_pengadaan" label="Tanggal Pengadaan / SPK">
                                <DatePicker format={DATE_UI} style={{ width: '100%' }} size="large" />
                            </Form.Item>
                        </div>
                    </div>

                    {/* Section 2: Penyedia & Kontrak */}
                    <div className="pbj-form-section">
                        <div className="pbj-form-section__title">
                            <ShopOutlined /> 2. Penyedia & Dokumen Kontrak
                        </div>
                        <div className="pbj-form-grid-2">
                            <Form.Item name="nama_penyedia" label="Nama Penyedia / Vendor">
                                <Input placeholder="Contoh: PT. Scientia Medika Utama" size="large" />
                            </Form.Item>

                            <Form.Item name="no_kontrak" label="Nomor Kontrak / SPK">
                                <Input placeholder="Contoh: 027/SP/BPOM-PLP/2026" size="large" />
                            </Form.Item>
                        </div>

                        <Form.Item name="nominal" label="Nominal Anggaran (Rp)">
                            <InputNumber
                                style={{ width: '100%' }}
                                formatter={(value) => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                                parser={(value) => value.replace(/Rp\s?|(\.*)/g, '')}
                                placeholder="Contoh: 150.000.000"
                                size="large"
                            />
                        </Form.Item>
                    </div>

                    {/* Section 3: Logistik & BAST */}
                    <div className="pbj-form-section">
                        <div className="pbj-form-section__title">
                            <CalendarOutlined /> 3. Timeline Logistik & BAST
                        </div>
                        <div className="pbj-form-grid-2">
                            <Form.Item name="tanggal_kirim" label="Tanggal Kirim Penyedia">
                                <DatePicker format={DATE_UI} style={{ width: '100%' }} size="large" />
                            </Form.Item>

                            <Form.Item name="tanggal_sampai" label="Tanggal Sampai di Kantor">
                                <DatePicker format={DATE_UI} style={{ width: '100%' }} size="large" />
                            </Form.Item>
                        </div>

                        <div className="pbj-form-grid-2">
                            <Form.Item name="no_bast" label="Nomor BAST">
                                <Input placeholder="Contoh: BAST/BPOM-PLP/05/2026" size="large" />
                            </Form.Item>

                            <Form.Item name="tanggal_bast" label="Tanggal BAST">
                                <DatePicker format={DATE_UI} style={{ width: '100%' }} size="large" />
                            </Form.Item>
                        </div>
                    </div>

                    {/* Section 4: Status Siklus */}
                    <div className="pbj-form-section">
                        <div className="pbj-form-section__title">
                            <ClockCircleOutlined /> 4. Status Siklus Pengadaan
                        </div>
                        <Form.Item
                            name="status_barang"
                            label="Tahap Status Terkini"
                            rules={[{ required: true, message: 'Status wajib dipilih!' }]}
                        >
                            <Select size="large">
                                <Select.Option value="Proses Negosiasi">Proses Negosiasi (20%)</Select.Option>
                                <Select.Option value="Proses PPK">Proses PPK (40%)</Select.Option>
                                <Select.Option value="Proses pengiriman">Proses Pengiriman (60%)</Select.Option>
                                <Select.Option value="Proses Pembayaran">Proses Pembayaran (80%)</Select.Option>
                                <Select.Option value="Selesai">Selesai (100%)</Select.Option>
                            </Select>
                        </Form.Item>
                    </div>

                    {/* Section 5: Upload Dokumen Pendukung (Nextcloud) */}
                    <div className="pbj-form-section">
                        <div className="pbj-form-section__title">
                            <PaperClipOutlined /> 5. Upload Dokumen Pendukung Nextcloud (SP, BAST, Invoice)
                        </div>
                        <div className="pbj-upload-grid">
                            {/* 1. Surat Pesanan (SP) */}
                            <div className="pbj-upload-row">
                                <div className="pbj-upload-row__info">
                                    <FileTextOutlined className="pbj-upload-row__icon pbj-upload-row__icon--sp" />
                                    <div>
                                        <div className="pbj-upload-row__title">Surat Pesanan (SP)</div>
                                        <div className="pbj-upload-row__sub">Dokumen SPK / Surat Pesanan dari PPK</div>
                                    </div>
                                </div>
                                <div className="pbj-upload-row__action">
                                    {fileSuratPesanan ? (
                                        <div className="pbj-file-tag">
                                            <Tooltip title={fileSuratPesanan.name}>
                                                <span className="pbj-file-tag__name">📄 {fileSuratPesanan.name}</span>
                                            </Tooltip>
                                            <Button
                                                type="text"
                                                danger
                                                size="small"
                                                icon={<DeleteOutlined />}
                                                onClick={() => setFileSuratPesanan(null)}
                                            />
                                        </div>
                                    ) : editingRecord?.file_surat_pesanan_url && !removeSuratPesanan ? (
                                        <div className="pbj-file-tag pbj-file-tag--existing">
                                            <a href={editingRecord.file_surat_pesanan_url} target="_blank" rel="noreferrer" className="pbj-file-tag__link">
                                                📄 Lihat SP Terunggah
                                            </a>
                                            <Button
                                                type="text"
                                                danger
                                                size="small"
                                                icon={<DeleteOutlined />}
                                                onClick={() => setRemoveSuratPesanan(true)}
                                                title="Hapus / Ganti File"
                                            />
                                        </div>
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
                                            <Button icon={<UploadOutlined />} size="small" type="dashed">
                                                Pilih File SP
                                            </Button>
                                        </Upload>
                                    )}
                                </div>
                            </div>

                            {/* 2. Berita Acara Serah Terima (BAST) */}
                            <div className="pbj-upload-row">
                                <div className="pbj-upload-row__info">
                                    <FileDoneOutlined className="pbj-upload-row__icon pbj-upload-row__icon--bast" />
                                    <div>
                                        <div className="pbj-upload-row__title">Berita Acara (BAST)</div>
                                        <div className="pbj-upload-row__sub">Dokumen BAST penyelesaian barang/jasa</div>
                                    </div>
                                </div>
                                <div className="pbj-upload-row__action">
                                    {fileBast ? (
                                        <div className="pbj-file-tag">
                                            <Tooltip title={fileBast.name}>
                                                <span className="pbj-file-tag__name">📑 {fileBast.name}</span>
                                            </Tooltip>
                                            <Button
                                                type="text"
                                                danger
                                                size="small"
                                                icon={<DeleteOutlined />}
                                                onClick={() => setFileBast(null)}
                                            />
                                        </div>
                                    ) : editingRecord?.file_bast_url && !removeBast ? (
                                        <div className="pbj-file-tag pbj-file-tag--existing">
                                            <a href={editingRecord.file_bast_url} target="_blank" rel="noreferrer" className="pbj-file-tag__link">
                                                📑 Lihat BAST Terunggah
                                            </a>
                                            <Button
                                                type="text"
                                                danger
                                                size="small"
                                                icon={<DeleteOutlined />}
                                                onClick={() => setRemoveBast(true)}
                                                title="Hapus / Ganti File"
                                            />
                                        </div>
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
                                            <Button icon={<UploadOutlined />} size="small" type="dashed">
                                                Pilih File BAST
                                            </Button>
                                        </Upload>
                                    )}
                                </div>
                            </div>

                            {/* 3. Invoice / Faktur */}
                            <div className="pbj-upload-row">
                                <div className="pbj-upload-row__info">
                                    <FileProtectOutlined className="pbj-upload-row__icon pbj-upload-row__icon--inv" />
                                    <div>
                                        <div className="pbj-upload-row__title">Invoice / Faktur</div>
                                        <div className="pbj-upload-row__sub">Kuitansi / Tagihan pembayaran penyedia</div>
                                    </div>
                                </div>
                                <div className="pbj-upload-row__action">
                                    {fileInvoice ? (
                                        <div className="pbj-file-tag">
                                            <Tooltip title={fileInvoice.name}>
                                                <span className="pbj-file-tag__name">🧾 {fileInvoice.name}</span>
                                            </Tooltip>
                                            <Button
                                                type="text"
                                                danger
                                                size="small"
                                                icon={<DeleteOutlined />}
                                                onClick={() => setFileInvoice(null)}
                                            />
                                        </div>
                                    ) : editingRecord?.file_invoice_url && !removeInvoice ? (
                                        <div className="pbj-file-tag pbj-file-tag--existing">
                                            <a href={editingRecord.file_invoice_url} target="_blank" rel="noreferrer" className="pbj-file-tag__link">
                                                🧾 Lihat Invoice Terunggah
                                            </a>
                                            <Button
                                                type="text"
                                                danger
                                                size="small"
                                                icon={<DeleteOutlined />}
                                                onClick={() => setRemoveInvoice(true)}
                                                title="Hapus / Ganti File"
                                            />
                                        </div>
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
                                            <Button icon={<UploadOutlined />} size="small" type="dashed">
                                                Pilih Invoice
                                            </Button>
                                        </Upload>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                        <Button onClick={() => setIsModalOpen(false)}>Batal</Button>
                        <Button type="primary" htmlType="submit" loading={submitting} style={{ background: '#0F5B99', borderColor: '#0F5B99' }}>
                            {modalMode === 'create' ? 'Simpan Pengadaan' : 'Perbarui Data'}
                        </Button>
                    </div>
                </Form>
            </Modal>

            {/* Slide-over Detail Drawer */}
            <Drawer
                className="pbj-drawer"
                open={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                width={640}
                title={
                    detailRecord && (
                        <div className="pbj-drawer-header">
                            <div>
                                <div className="pbj-drawer-title">{detailRecord.nama_pengadaan}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                    <span className={`pbj-jenis-pill ${detailRecord.jenis_pengadaan === 'E-Purchasing' ? 'pbj-jenis-pill--ep' : 'pbj-jenis-pill--direct'}`}>
                                        {detailRecord.jenis_pengadaan || 'Langsung'}
                                    </span>
                                    <Tag color={STATUS_CONFIG[detailRecord.status_barang]?.tagColor}>
                                        {detailRecord.status_barang}
                                    </Tag>
                                </div>
                            </div>
                        </div>
                    )
                }
            >
                {detailRecord && (
                    <div className="pbj-drawer-body">
                        {/* Big Lifecycle Stepper */}
                        <div className="pbj-drawer-section">
                            <div className="pbj-drawer-section__title">
                                <ClockCircleOutlined /> Visualisasi Progress Siklus Pengadaan
                            </div>
                            <BigStatusStepper currentStatus={detailRecord.status_barang} />
                        </div>

                        {/* Card 1: Main Info */}
                        <div className="pbj-detail-card">
                            <div className="pbj-detail-card__heading">
                                <CodeSandboxOutlined /> Informasi Utama
                            </div>
                            <div className="pbj-detail-grid">
                                <div className="pbj-detail-item">
                                    <span className="pbj-detail-item__label">Nama Paket Pengadaan</span>
                                    <span className="pbj-detail-item__val">{detailRecord.nama_pengadaan}</span>
                                </div>
                                <div className="pbj-detail-item">
                                    <span className="pbj-detail-item__label">Nominal Anggaran</span>
                                    <span className="pbj-detail-item__val" style={{ color: '#0F5B99', fontWeight: 700 }}>
                                        <FormatRupiah amount={detailRecord.nominal} />
                                    </span>
                                </div>
                                <div className="pbj-detail-item">
                                    <span className="pbj-detail-item__label">Jenis Pengadaan</span>
                                    <span className="pbj-detail-item__val">{detailRecord.jenis_pengadaan || 'Langsung'}</span>
                                </div>
                                <div className="pbj-detail-item">
                                    <span className="pbj-detail-item__label">Tanggal Pengadaan</span>
                                    <DateBadge value={detailRecord.tanggal_pengadaan} />
                                </div>
                            </div>
                        </div>

                        {/* Card 2: Vendor & Contract */}
                        <div className="pbj-detail-card">
                            <div className="pbj-detail-card__heading">
                                <ShopOutlined /> Penyedia & Dokumen Kontrak
                            </div>
                            <div className="pbj-detail-grid">
                                <div className="pbj-detail-item" style={{ gridColumn: '1 / -1' }}>
                                    <span className="pbj-detail-item__label">Nama Penyedia / Vendor</span>
                                    <span className="pbj-detail-item__val">{detailRecord.nama_penyedia || '—'}</span>
                                </div>
                                <div className="pbj-detail-item" style={{ gridColumn: '1 / -1' }}>
                                    <span className="pbj-detail-item__label">Nomor Kontrak / SPK</span>
                                    <span className="pbj-code-badge" style={{ fontSize: 13, display: 'inline-block', marginTop: 4 }}>
                                        {detailRecord.no_kontrak || '—'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Card 3: Delivery & BAST */}
                        <div className="pbj-detail-card">
                            <div className="pbj-detail-card__heading">
                                <CalendarOutlined /> Timeline Logistik & BAST
                            </div>
                            <div className="pbj-detail-grid">
                                <div className="pbj-detail-item">
                                    <span className="pbj-detail-item__label">Tanggal Kirim</span>
                                    <DateBadge value={detailRecord.tanggal_kirim} />
                                </div>
                                <div className="pbj-detail-item">
                                    <span className="pbj-detail-item__label">Tanggal Sampai</span>
                                    <DateBadge value={detailRecord.tanggal_sampai} />
                                </div>
                                <div className="pbj-detail-item">
                                    <span className="pbj-detail-item__label">Nomor BAST</span>
                                    <span className="pbj-code-badge" style={{ marginTop: 4 }}>
                                        {detailRecord.no_bast || '—'}
                                    </span>
                                </div>
                                <div className="pbj-detail-item">
                                    <span className="pbj-detail-item__label">Tanggal BAST</span>
                                    <DateBadge value={detailRecord.tanggal_bast} />
                                </div>
                            </div>
                        </div>

                        {/* Attached Files Card */}
                        <div className="pbj-detail-card">
                            <div className="pbj-detail-card__heading">
                                <PaperClipOutlined /> Dokumen Lampiran (Nextcloud)
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                                <div className="pbj-doc-attachment-item">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <FileTextOutlined style={{ color: '#0F5B99', fontSize: 16 }} />
                                        <span style={{ fontWeight: 600, fontSize: 13 }}>Surat Pesanan (SP)</span>
                                    </div>
                                    {detailRecord.file_surat_pesanan_url ? (
                                        <a href={detailRecord.file_surat_pesanan_url} target="_blank" rel="noreferrer">
                                            <Button type="primary" size="small" ghost icon={<EyeOutlined />}>
                                                Buka SP
                                            </Button>
                                        </a>
                                    ) : (
                                        <Tag color="default">Belum diunggah</Tag>
                                    )}
                                </div>

                                <div className="pbj-doc-attachment-item">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <FileDoneOutlined style={{ color: '#047857', fontSize: 16 }} />
                                        <span style={{ fontWeight: 600, fontSize: 13 }}>Berita Acara (BAST)</span>
                                    </div>
                                    {detailRecord.file_bast_url ? (
                                        <a href={detailRecord.file_bast_url} target="_blank" rel="noreferrer">
                                            <Button type="primary" size="small" ghost icon={<EyeOutlined />}>
                                                Buka BAST
                                            </Button>
                                        </a>
                                    ) : (
                                        <Tag color="default">Belum diunggah</Tag>
                                    )}
                                </div>

                                <div className="pbj-doc-attachment-item">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <FileProtectOutlined style={{ color: '#6d28d9', fontSize: 16 }} />
                                        <span style={{ fontWeight: 600, fontSize: 13 }}>Invoice / Faktur</span>
                                    </div>
                                    {detailRecord.file_invoice_url ? (
                                        <a href={detailRecord.file_invoice_url} target="_blank" rel="noreferrer">
                                            <Button type="primary" size="small" ghost icon={<EyeOutlined />}>
                                                Buka Invoice
                                            </Button>
                                        </a>
                                    ) : (
                                        <Tag color="default">Belum diunggah</Tag>
                                    )}
                                </div>
                            </div>
                        </div>

                        {isAdmin && (
                            <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                                <Button
                                    type="primary"
                                    block
                                    icon={<EditOutlined />}
                                    style={{ background: '#0F5B99', borderColor: '#0F5B99' }}
                                    onClick={() => {
                                        setIsDrawerOpen(false);
                                        handleOpenEdit(detailRecord);
                                    }}
                                >
                                    Edit Data Pengadaan Ini
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </Drawer>
        </div>
    );
}

export default function PengadaanPbj() {
    return <PengadaanPbjInner />;
}
