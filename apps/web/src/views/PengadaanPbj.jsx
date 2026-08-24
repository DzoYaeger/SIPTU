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
    Segmented,
    Dropdown,
    Row,
    Col,
    Tabs,
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
    FileDoneOutlined,
    FileProtectOutlined,
    FilterOutlined,
    ClearOutlined,
    SyncOutlined,
    MoreOutlined,
    BoxPlotOutlined,
    RightOutlined,
    LeftOutlined,
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
    'Proses Negosiasi': { step: 1, percent: 20, color: '#d97706', bg: '#fffbeb', border: '#fde68a', tagColor: 'warning', label: 'Negosiasi' },
    'Proses PPK': { step: 2, percent: 40, color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd', tagColor: 'processing', label: 'PPK' },
    'Proses pengiriman': { step: 3, percent: 60, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', tagColor: 'geekblue', label: 'Pengiriman' },
    'Proses Pembayaran': { step: 4, percent: 80, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', tagColor: 'purple', label: 'Pembayaran' },
    'Selesai': { step: 5, percent: 100, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', tagColor: 'success', label: 'Selesai' },
};

/* ── Status Progress Bar ─────────────────────────────────────────── */
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

/* ── Stepper Indicator ───────────────────────────────────────────── */
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

/* ── Big Status Stepper (Drawer) - Horizontal Timeline ───────────── */
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
        <div className="pbj-hstepper">
            {stages.map((st, idx) => {
                const stepNum = idx + 1;
                const isCompleted = stepNum < currentStep;
                const isActive = stepNum === currentStep;
                const isPending = stepNum > currentStep;

                let nodeClass = 'pbj-hstepper__node';
                if (isCompleted) nodeClass += ' pbj-hstepper__node--done';
                if (isActive) nodeClass += ' pbj-hstepper__node--active';
                if (isPending) nodeClass += ' pbj-hstepper__node--pending';

                return (
                    <div key={st.title} className="pbj-hstepper__step">
                        {idx > 0 && (
                            <div
                                className={`pbj-hstepper__line ${isCompleted ? 'pbj-hstepper__line--done' : ''}`}
                                style={{
                                    background: isCompleted
                                        ? config.color
                                        : `linear-gradient(90deg, ${config.color} 0%, #e2e8f0 0%)`,
                                }}
                            />
                        )}
                        <div className={nodeClass} style={{
                            background: isCompleted || isActive ? config.color : '#f1f5f9',
                            borderColor: isCompleted || isActive ? config.color : '#cbd5e1',
                            color: isCompleted || isActive ? '#ffffff' : '#94a3b8',
                            boxShadow: isActive ? `0 0 0 4px ${config.color}22` : 'none',
                        }}>
                            {isCompleted ? <CheckOutlined style={{ fontSize: 11 }} /> : stepNum}
                        </div>
                        <div className="pbj-hstepper__label">
                            <div className="pbj-hstepper__title" style={{ color: isActive ? config.color : '#334155' }}>
                                {st.title}
                            </div>
                            <div className="pbj-hstepper__pct">{st.pct}</div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ── Date Badge ─────────────────────────────────────────────────── */
function DateBadge({ value }) {
    if (!value) return <span style={{ color: '#94a3b8' }}>—</span>;
    return (
        <span className="pbj-code-badge">
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

/* ── Top KPI Card Component (Rule 3) ────────────────────────────── */
const KpiCard = ({ title, value, icon, tone, hint }) => (
    <div className={`pbj-kpi-card pbj-kpi-card--${tone}`}>
        <div className="pbj-kpi-icon">{icon}</div>
        <div className="pbj-kpi-body">
            <div className="pbj-kpi-title">{title}</div>
            <div className="pbj-kpi-value">{value}</div>
            {hint && <div className="pbj-kpi-hint">{hint}</div>}
        </div>
    </div>
);

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
            width: 48,
            align: 'center',
            render: (_, __, i) => (
                <span className="pbj-row-index">
                    {(pagination.current - 1) * pagination.pageSize + i + 1}
                </span>
            ),
        },
        {
            title: 'PENGADAAN & PENYEDIA',
            dataIndex: 'nama_pengadaan',
            key: 'nama_pengadaan',
            width: 320,
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
                            {Array.isArray(r.items) && r.items.length > 0 && (
                                <span className="pbj-items-count-badge">
                                    <BoxPlotOutlined style={{ fontSize: 10 }} /> {r.items.length} Item
                                </span>
                            )}
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
            title: 'TAHAP & STATUS SIKLUS',
            dataIndex: 'status_barang',
            key: 'status_barang',
            width: 220,
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
            width: 200,
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
            width: 60,
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
                        <Button type="text" shape="circle" className="pbj-more-btn" icon={<MoreOutlined style={{ color: '#64748b', fontSize: 16 }} />} />
                    </Dropdown>
                );
            },
        },
    ];

    return (
        <div className="module-section">
            {/* ── Single Unified Sleek Header Card ── */}
            <div className="pbj-header-card">
                <div className="pbj-header-top-row">
                    <div className="pbj-header-left">
                        <Button
                            type="text"
                            icon={<ArrowLeftOutlined />}
                            className="pbj-back-btn"
                            onClick={() => navigate(-1)}
                        />
                        <div>
                            <div className="pbj-title-row">
                                <h1 className="pbj-title">Proses Pengadaan Barang & Jasa (PBJ)</h1>
                                <span className="pbj-badge">SIPTU ULTRA</span>
                            </div>
                            <p className="pbj-subtitle">
                                Monitor dan kelola siklus pengadaan (Negosiasi ➔ PPK ➔ Logistik ➔ Pembayaran ➔ Selesai) serta dokumen Nextcloud.
                            </p>
                        </div>
                    </div>

                    <div className="pbj-header-right">
                        <span className="pbj-date-badge">
                            <CalendarOutlined />
                            {dayjs().format('dddd, DD MMM YYYY')}
                        </span>
                        <Button
                            className="pbj-btn-action-pdf"
                            icon={<FilePdfOutlined />}
                            onClick={exportToPdf}
                        >
                            Cetak PDF
                        </Button>
                        <Button
                            className="pbj-btn-refresh"
                            icon={<ReloadOutlined spin={loading} />}
                            onClick={fetchData}
                            disabled={loading}
                        >
                            Refresh
                        </Button>
                        {isAdmin && (
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={handleOpenCreate}
                                className="pbj-btn-create"
                            >
                                Tambah Data PBJ
                            </Button>
                        )}
                    </div>
                </div>

                {/* Compact Inline Metrics Bar (Seamlessly inside Header) */}
                <div className="pbj-header-metrics-bar">
                    <div className="pbj-metric-chip pbj-metric-chip--blue">
                        <CodeSandboxOutlined className="pbj-metric-chip__icon" />
                        <div className="pbj-metric-chip__info">
                            <span className="pbj-metric-chip__label">TOTAL PENGADAAN</span>
                            <span className="pbj-metric-chip__val">{kpiStats.total} Paket</span>
                        </div>
                    </div>

                    <div className="pbj-metric-chip pbj-metric-chip--amber">
                        <ClockCircleOutlined className="pbj-metric-chip__icon" />
                        <div className="pbj-metric-chip__info">
                            <span className="pbj-metric-chip__label">SEDANG BERJALAN</span>
                            <span className="pbj-metric-chip__val">{kpiStats.inProgress} Paket</span>
                        </div>
                    </div>

                    <div className="pbj-metric-chip pbj-metric-chip--green">
                        <DollarOutlined className="pbj-metric-chip__icon" />
                        <div className="pbj-metric-chip__info">
                            <span className="pbj-metric-chip__label">TOTAL ANGGARAN</span>
                            <span className="pbj-metric-chip__val">Rp {kpiStats.totalAmount.toLocaleString('id-ID')}</span>
                        </div>
                    </div>

                    <div className="pbj-metric-chip pbj-metric-chip--emerald">
                        <CheckCircleOutlined className="pbj-metric-chip__icon" />
                        <div className="pbj-metric-chip__info">
                            <span className="pbj-metric-chip__label">TELAH SELESAI</span>
                            <span className="pbj-metric-chip__val">{kpiStats.finished} Paket</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Main Content Container with Integrated Filter Toolbar ── */}
            <div className="pbj-main-card">
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
                            <span className="pbj-stage-dot" style={{ background: '#2563eb' }} />
                            Pengiriman ({kpiStats.kirim})
                        </button>
                        <button
                            className={`pbj-stage-btn ${statusFilter === 'Proses Pembayaran' ? 'pbj-stage-btn--active' : ''}`}
                            onClick={() => setStatusFilter('Proses Pembayaran')}
                        >
                            <span className="pbj-stage-dot" style={{ background: '#7c3aed' }} />
                            Pembayaran ({kpiStats.bayar})
                        </button>
                        <button
                            className={`pbj-stage-btn ${statusFilter === 'Selesai' ? 'pbj-stage-btn--active' : ''}`}
                            onClick={() => setStatusFilter('Selesai')}
                        >
                            <span className="pbj-stage-dot" style={{ background: '#059669' }} />
                            Selesai ({kpiStats.finished})
                        </button>
                    </div>
                </div>

                <div className="pbj-toolbar">
                    <div className="pbj-toolbar__left">
                        <Input
                            placeholder="Cari nama pengadaan, penyedia, no. kontrak, BAST..."
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
                            style={{ width: 175 }}
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
                                className="pbj-reset-btn"
                            >
                                Reset Filter
                            </Button>
                        )}
                    </div>

                    <div className="pbj-toolbar__right">
                        <Segmented
                            value={viewMode}
                            onChange={setViewMode}
                            className="pbj-segmented-toggle"
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
                                showTotal: (t, range) => `Menampilkan ${range[0]}-${range[1]} dari ${t} pengadaan`,
                                onChange: (page, pSize) => setPagination({ current: page, pageSize: pSize }),
                            }}
                            className="pbj-table"
                            rowKey="id"
                            scroll={{ x: 980 }}
                        />
                    </div>
                ) : (
                    /* Grid Cards View */
                    <div className="pbj-grid-cards">
                        {loading ? (
                            <div className="pbj-loading-box">
                                <SyncOutlined spin style={{ fontSize: 28, color: '#0F5B99' }} />
                                <span>Memuat data pengadaan...</span>
                            </div>
                        ) : filteredRows.length === 0 ? (
                            <div className="pbj-empty-box">
                                <CodeSandboxOutlined style={{ fontSize: 48, color: '#cbd5e1' }} />
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
                                                <Tag color={statusCfg.tagColor} style={{ borderRadius: 100, fontWeight: 600, margin: 0 }}>
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
                                                <Button type="text" shape="circle" icon={<MoreOutlined style={{ color: '#64748b', fontSize: 16 }} />} />
                                            </Dropdown>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>

            {/* Modal Add & Edit Form (Revamped Step-by-Step Tabs Layout) */}
            <Modal
                className="pbj-modal"
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                width={780}
                destroyOnClose
                title={
                    <div className="pbj-modal-title">
                        <div className="pbj-modal-title__icon">
                            {modalMode === 'create' ? <PlusOutlined /> : <EditOutlined />}
                        </div>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#172033' }}>
                                {modalMode === 'create' ? 'Tambah Data Pengadaan PBJ' : 'Edit Data Pengadaan PBJ'}
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 400, color: '#64748b' }}>
                                Formulir ber-tab yang rapi dan mudah diisi per kategori data.
                            </div>
                        </div>
                    </div>
                }
            >
                <Form form={form} layout="vertical" onFinish={handleSaveForm} style={{ marginTop: 12 }}>
                    <Tabs
                        activeKey={modalActiveTab}
                        onChange={setModalActiveTab}
                        className="pbj-modal-tabs"
                        items={[
                            {
                                key: '1',
                                label: <span><CodeSandboxOutlined /> 1. Pengadaan & Penyedia</span>,
                                children: (
                                    <div className="pbj-tab-content">
                                        <div className="pbj-form-section">
                                            <div className="pbj-form-section__title">
                                                <CodeSandboxOutlined /> Paket & Metode Pengadaan
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

                                        <div className="pbj-form-section">
                                            <div className="pbj-form-section__title">
                                                <ShopOutlined /> Penyedia & Dokumen Kontrak
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
                                    </div>
                                ),
                            },
                            {
                                key: '2',
                                label: <span><ClockCircleOutlined /> 2. Logistik & Status</span>,
                                children: (
                                    <div className="pbj-tab-content">
                                        <div className="pbj-form-section">
                                            <div className="pbj-form-section__title">
                                                <CalendarOutlined /> Timeline Pengiriman & BAST
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

                                        <div className="pbj-form-section">
                                            <div className="pbj-form-section__title">
                                                <ClockCircleOutlined /> Tahap Status Terkini
                                            </div>
                                            <Form.Item
                                                name="status_barang"
                                                label="Tahap Siklus Pengadaan Terkini"
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
                                    </div>
                                ),
                            },
                            {
                                key: '3',
                                label: <span><FileTextOutlined /> 3. Dokumen & Rincian Barang</span>,
                                children: (
                                    <div className="pbj-tab-content">
                                        <div className="pbj-form-section">
                                            <div className="pbj-form-section__title">
                                                <FileTextOutlined /> Dokumen Pendukung Nextcloud
                                            </div>
                                            <div className="pbj-upload-grid">
                                                {/* Surat Pesanan */}
                                                <div className="pbj-upload-row">
                                                    <div className="pbj-upload-row__info">
                                                        <FileTextOutlined className="pbj-upload-row__icon pbj-upload-row__icon--sp" />
                                                        <div>
                                                            <div className="pbj-upload-row__title">Surat Pesanan (SP)</div>
                                                            <div className="pbj-upload-row__sub">Dokumen SPK / Surat Pesanan</div>
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

                                                {/* BAST */}
                                                <div className="pbj-upload-row">
                                                    <div className="pbj-upload-row__info">
                                                        <FileDoneOutlined className="pbj-upload-row__icon pbj-upload-row__icon--bast" />
                                                        <div>
                                                            <div className="pbj-upload-row__title">Berita Acara (BAST)</div>
                                                            <div className="pbj-upload-row__sub">Dokumen BAST Serah Terima</div>
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

                                                {/* Invoice */}
                                                <div className="pbj-upload-row">
                                                    <div className="pbj-upload-row__info">
                                                        <FileProtectOutlined className="pbj-upload-row__icon pbj-upload-row__icon--inv" />
                                                        <div>
                                                            <div className="pbj-upload-row__title">Invoice / Faktur</div>
                                                            <div className="pbj-upload-row__sub">Kuitansi / Tagihan Pembayaran</div>
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

                                        {/* Detail Items Barang */}
                                        <div className="pbj-form-section">
                                            <div className="pbj-form-section__title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span>
                                                    <BoxPlotOutlined /> Rincian Item Barang (Opsional)
                                                </span>
                                                <Button
                                                    type="dashed"
                                                    icon={<PlusOutlined />}
                                                    onClick={handleAddItem}
                                                    size="small"
                                                    style={{ borderColor: '#0F5B99', color: '#0F5B99', fontWeight: 600, borderRadius: 8 }}
                                                >
                                                    Tambah Item Barang
                                                </Button>
                                            </div>

                                            {itemList.length === 0 ? (
                                                <div className="pbj-empty-items-box">
                                                    <span>Belum ada detail barang. Klik <b>+ Tambah Item Barang</b> untuk perincian.</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="pbj-items-table-wrapper">
                                                        <table className="pbj-items-editor-table">
                                                            <thead>
                                                                <tr>
                                                                    <th style={{ width: '18%' }}>KODE BARANG</th>
                                                                    <th style={{ width: '30%' }}>NAMA BARANG</th>
                                                                    <th style={{ width: '12%' }}>JUMLAH</th>
                                                                    <th style={{ width: '18%' }}>HARGA SATUAN</th>
                                                                    <th style={{ width: '17%', textAlign: 'right' }}>TOTAL HARGA</th>
                                                                    <th style={{ width: '5%', textAlign: 'center' }}>HAPUS</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {itemList.map((item, idx) => (
                                                                    <tr key={item.key || idx}>
                                                                        <td>
                                                                            <Input
                                                                                placeholder="Kode"
                                                                                value={item.kode_barang}
                                                                                onChange={(e) => handleItemChange(idx, 'kode_barang', e.target.value)}
                                                                            />
                                                                        </td>
                                                                        <td>
                                                                            <Input
                                                                                placeholder="Nama barang / spesifikasi"
                                                                                value={item.nama_barang}
                                                                                onChange={(e) => handleItemChange(idx, 'nama_barang', e.target.value)}
                                                                            />
                                                                        </td>
                                                                        <td>
                                                                            <InputNumber
                                                                                min={1}
                                                                                style={{ width: '100%' }}
                                                                                placeholder="Jml"
                                                                                value={item.jumlah}
                                                                                onChange={(val) => handleItemChange(idx, 'jumlah', val)}
                                                                            />
                                                                        </td>
                                                                        <td>
                                                                            <InputNumber
                                                                                min={0}
                                                                                style={{ width: '100%' }}
                                                                                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                                                                                parser={(value) => value.replace(/\./g, '')}
                                                                                placeholder="Harga"
                                                                                value={item.harga_satuan}
                                                                                onChange={(val) => handleItemChange(idx, 'harga_satuan', val)}
                                                                            />
                                                                        </td>
                                                                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#059669', paddingRight: 10 }}>
                                                                            Rp {(item.total_harga || 0).toLocaleString('id-ID')}
                                                                        </td>
                                                                        <td style={{ textAlign: 'center' }}>
                                                                            <Button
                                                                                type="text"
                                                                                danger
                                                                                icon={<DeleteOutlined />}
                                                                                onClick={() => handleRemoveItem(idx)}
                                                                            />
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>

                                                    <div className="pbj-items-summary-bar">
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Total Akumulasi:</span>
                                                            <span style={{ fontSize: 14, color: '#0F5B99', fontWeight: 800 }}>
                                                                Rp {grandTotalItems.toLocaleString('id-ID')}
                                                            </span>
                                                        </div>
                                                        <Button
                                                            type="dashed"
                                                            size="small"
                                                            onClick={handleSyncNominalFromItems}
                                                            style={{ borderColor: '#059669', color: '#059669', fontWeight: 600, fontSize: 11.5, borderRadius: 8 }}
                                                        >
                                                            Sync Ke Nominal Anggaran
                                                        </Button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ),
                            },
                        ]}
                    />

                    {/* Modal Footer Bar */}
                    <div className="pbj-modal-footer">
                        <div className="pbj-modal-footer__left">
                            {modalActiveTab !== '1' && (
                                <Button
                                    icon={<LeftOutlined />}
                                    onClick={() => setModalActiveTab(String(Number(modalActiveTab) - 1))}
                                    className="pbj-nav-step-btn"
                                >
                                    Sebelumnya
                                </Button>
                            )}
                            {modalActiveTab !== '3' && (
                                <Button
                                    icon={<RightOutlined />}
                                    onClick={() => setModalActiveTab(String(Number(modalActiveTab) + 1))}
                                    className="pbj-nav-step-btn pbj-nav-step-btn--next"
                                >
                                    Lanjut ke Tab Berikutnya
                                </Button>
                            )}
                        </div>

                        <div className="pbj-modal-footer__right">
                            <Button className="pbj-modal-cancel" onClick={() => setIsModalOpen(false)}>
                                Batal
                            </Button>
                            <Button type="primary" htmlType="submit" loading={submitting} className="pbj-modal-submit" icon={<CheckCircleOutlined />}>
                                {modalMode === 'create' ? 'Simpan Pengadaan' : 'Perbarui Data'}
                            </Button>
                        </div>
                    </div>
                </Form>
            </Modal>

            {/* Slide-over Detail Drawer - Dual Layout: Hero Summary + Section Cards */}
            <Drawer
                className="pbj-drawer"
                open={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                width={680}
                title={
                    detailRecord && (
                        <div className="pbj-drawer-header">
                            <div className="pbj-drawer-header__icon">
                                <CodeSandboxOutlined />
                            </div>
                            <div>
                                <div className="pbj-drawer-title">{detailRecord.nama_pengadaan}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                    <span className={`pbj-jenis-pill ${detailRecord.jenis_pengadaan === 'E-Purchasing' ? 'pbj-jenis-pill--ep' : 'pbj-jenis-pill--direct'}`}>
                                        {detailRecord.jenis_pengadaan || 'Langsung'}
                                    </span>
                                    <span className="pbj-status-pill" style={{ color: STATUS_CONFIG[detailRecord.status_barang]?.color, background: STATUS_CONFIG[detailRecord.status_barang]?.bg, borderColor: STATUS_CONFIG[detailRecord.status_barang]?.border }}>
                                        <ClockCircleOutlined style={{ fontSize: 11 }} /> {detailRecord.status_barang}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )
                }
            >
                {detailRecord && (
                    <div className="pbj-drawer-body">
                        {/* HERO SUMMARY CARD (Upper Container) */}
                        <div
                            className="pbj-hero-summary"
                            style={{
                                borderTop: `4px solid ${STATUS_CONFIG[detailRecord.status_barang]?.color || '#0F5B99'}`,
                            }}
                        >
                            <div className="pbj-hero-summary__top">
                                <div className="pbj-hero-summary__label">TOTAL NOMINAL ANGGARAN</div>
                                <div className="pbj-hero-summary__amount">
                                    <FormatRupiah amount={detailRecord.nominal} />
                                </div>
                                <div className="pbj-hero-summary__sub">
                                    {Array.isArray(detailRecord.items) && detailRecord.items.length > 0
                                        ? `${detailRecord.items.length} rincian item barang terdaftar`
                                        : 'Belum ada rincian item barang'}
                                </div>
                            </div>

                            <div className="pbj-hero-summary__divider" />

                            <div className="pbj-hero-summary__stats">
                                <div className="pbj-hero-stat">
                                    <span className="pbj-hero-stat__label">Nomor Kontrak</span>
                                    <span className="pbj-hero-stat__value">{detailRecord.no_kontrak || '—'}</span>
                                </div>
                                <div className="pbj-hero-stat">
                                    <span className="pbj-hero-stat__label">Tanggal SPK</span>
                                    <span className="pbj-hero-stat__value">
                                        {detailRecord.tanggal_pengadaan
                                            ? dayjs(detailRecord.tanggal_pengadaan).format('DD MMM YYYY')
                                            : '—'}
                                    </span>
                                </div>
                                <div className="pbj-hero-stat">
                                    <span className="pbj-hero-stat__label">Jenis PBJ</span>
                                    <span className="pbj-hero-stat__value">{detailRecord.jenis_pengadaan || 'Langsung'}</span>
                                </div>
                                <div className="pbj-hero-stat">
                                    <span className="pbj-hero-stat__label">Progress</span>
                                    <span className="pbj-hero-stat__value" style={{ color: STATUS_CONFIG[detailRecord.status_barang]?.color || '#0F5B99' }}>
                                        {STATUS_CONFIG[detailRecord.status_barang]?.percent || 0}%
                                    </span>
                                </div>
                            </div>

                            <div className="pbj-hero-progress-wrap">
                                <div className="pbj-hero-progress">
                                    <div
                                        className="pbj-hero-progress__fill"
                                        style={{
                                            width: `${STATUS_CONFIG[detailRecord.status_barang]?.percent || 0}%`,
                                            background: STATUS_CONFIG[detailRecord.status_barang]?.color || '#0F5B99',
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Horizontal Big Status Stepper */}
                            <div style={{ marginTop: 18 }}>
                                <BigStatusStepper currentStatus={detailRecord.status_barang} />
                            </div>
                        </div>

                        {/* SECTION CARDS (Lower Container) */}

                        {/* Card A: Informasi Utama */}
                        <div className="pbj-detail-card">
                            <div className="pbj-detail-card__heading">
                                <span className="pbj-detail-card__icon pbj-detail-card__icon--blue">
                                    <CodeSandboxOutlined />
                                </span>
                                Informasi Utama
                            </div>
                            <div className="pbj-detail-grid pbj-detail-grid--3col">
                                <div className="pbj-detail-item">
                                    <span className="pbj-detail-item__label">Nama Paket Pengadaan</span>
                                    <span className="pbj-detail-item__val">{detailRecord.nama_pengadaan}</span>
                                </div>
                                <div className="pbj-detail-item">
                                    <span className="pbj-detail-item__label">Nominal Anggaran</span>
                                    <span className="pbj-detail-item__val">
                                        <FormatRupiah amount={detailRecord.nominal} />
                                    </span>
                                </div>
                                <div className="pbj-detail-item">
                                    <span className="pbj-detail-item__label">Jenis Pengadaan</span>
                                    <span className="pbj-detail-item__val">{detailRecord.jenis_pengadaan || 'Langsung'}</span>
                                </div>
                                <div className="pbj-detail-item">
                                    <span className="pbj-detail-item__label">Tanggal SPK / Pengadaan</span>
                                    <DateBadge value={detailRecord.tanggal_pengadaan} />
                                </div>
                            </div>
                        </div>

                        {/* Card B: Penyedia & Kontrak */}
                        <div className="pbj-detail-card">
                            <div className="pbj-detail-card__heading">
                                <span className="pbj-detail-card__icon pbj-detail-card__icon--green">
                                    <ShopOutlined />
                                </span>
                                Penyedia & Dokumen Kontrak
                            </div>
                            <div className="pbj-detail-grid pbj-detail-grid--2col">
                                <div className="pbj-detail-item">
                                    <span className="pbj-detail-item__label">Nama Penyedia / Vendor</span>
                                    <span className="pbj-detail-item__val">{detailRecord.nama_penyedia || '—'}</span>
                                </div>
                                <div className="pbj-detail-item">
                                    <span className="pbj-detail-item__label">Nomor Kontrak / SPK</span>
                                    <span className="pbj-code-badge" style={{ fontSize: 13, display: 'inline-block', marginTop: 4 }}>
                                        {detailRecord.no_kontrak || '—'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Card C: Timeline Logistik & BAST */}
                        <div className="pbj-detail-card">
                            <div className="pbj-detail-card__heading">
                                <span className="pbj-detail-card__icon pbj-detail-card__icon--amber">
                                    <CalendarOutlined />
                                </span>
                                Timeline Logistik & BAST
                            </div>
                            <div className="pbj-detail-grid pbj-detail-grid--2col">
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

                        {/* Card D: Detail Items Barang - Table with Accent */}
                        <div className="pbj-detail-card">
                            <div className="pbj-detail-card__heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span className="pbj-detail-card__icon pbj-detail-card__icon--purple">
                                        <BoxPlotOutlined />
                                    </span>
                                    Detail Rincian Barang Pengadaan
                                </span>
                                <span className="pbj-badge">
                                    {Array.isArray(detailRecord.items) ? detailRecord.items.length : 0} Item
                                </span>
                            </div>

                            {Array.isArray(detailRecord.items) && detailRecord.items.length > 0 ? (
                                <div className="pbj-items-table-wrapper" style={{ marginTop: 10 }}>
                                    <table className="pbj-items-display-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: 35, textAlign: 'center' }}>NO</th>
                                                <th>KODE BARANG</th>
                                                <th>NAMA BARANG</th>
                                                <th style={{ textAlign: 'center' }}>JUMLAH</th>
                                                <th style={{ textAlign: 'right' }}>HARGA SATUAN</th>
                                                <th style={{ textAlign: 'right' }}>TOTAL HARGA</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {detailRecord.items.map((item, index) => {
                                                const qty = Number(item.jumlah) || 1;
                                                const price = item.harga_satuan !== undefined && item.harga_satuan !== null
                                                    ? Number(item.harga_satuan)
                                                    : (item.total_harga ? Number(item.total_harga) / qty : 0);
                                                const total = item.total_harga !== undefined && item.total_harga !== null
                                                    ? Number(item.total_harga)
                                                    : qty * price;
                                                return (
                                                    <tr key={index}>
                                                        <td style={{ textAlign: 'center', color: '#64748b' }}>{index + 1}</td>
                                                        <td>
                                                            <span className="pbj-code-badge">{item.kode_barang || '—'}</span>
                                                        </td>
                                                        <td style={{ fontWeight: 600, color: '#0f172a' }}>{item.nama_barang || '—'}</td>
                                                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{qty}</td>
                                                        <td style={{ textAlign: 'right', color: '#475569' }}>
                                                            Rp {price.toLocaleString('id-ID')}
                                                        </td>
                                                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                                                            Rp {total.toLocaleString('id-ID')}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td colSpan={3} style={{ fontWeight: 700, textAlign: 'right' }}>Akumulasi Total:</td>
                                                <td style={{ textAlign: 'center', fontWeight: 700 }}>
                                                    {detailRecord.items.reduce((acc, curr) => acc + (Number(curr.jumlah) || 0), 0)}
                                                </td>
                                                <td></td>
                                                <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                                                    Rp {detailRecord.items.reduce((acc, curr) => {
                                                        const q = Number(curr.jumlah) || 1;
                                                        const p = curr.harga_satuan !== undefined && curr.harga_satuan !== null
                                                            ? Number(curr.harga_satuan)
                                                            : (curr.total_harga ? Number(curr.total_harga) / q : 0);
                                                        return acc + (curr.total_harga ? Number(curr.total_harga) : q * p);
                                                    }, 0).toLocaleString('id-ID')}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            ) : (
                                <div className="pbj-empty-inline">
                                    <BoxPlotOutlined style={{ fontSize: 24, color: '#cbd5e1' }} />
                                    <p>Belum ada rincian item barang yang diinput untuk pengadaan ini.</p>
                                </div>
                            )}
                        </div>

                        {/* Card E: Attached Files with High-Contrast Action Buttons */}
                        <div className="pbj-detail-card">
                            <div className="pbj-detail-card__heading">
                                <span className="pbj-detail-card__icon pbj-detail-card__icon--blue">
                                    <FileTextOutlined />
                                </span>
                                Dokumen Lampiran (Nextcloud)
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                                <div className="pbj-doc-attachment-item">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <span className="pbj-doc-file-icon pbj-doc-file-icon--sp">
                                            <FileTextOutlined />
                                        </span>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: 700, fontSize: 13, color: '#172033' }}>Surat Pesanan (SP)</span>
                                            <span style={{ fontSize: 11, color: '#94a3b8' }}>SPK / Surat Pesanan dari PPK</span>
                                        </div>
                                    </div>
                                    {detailRecord.file_surat_pesanan_url ? (
                                        <a href={detailRecord.file_surat_pesanan_url} target="_blank" rel="noreferrer">
                                            <button type="button" className="pbj-doc-btn pbj-doc-btn--sp">
                                                <EyeOutlined /> Buka SP
                                            </button>
                                        </a>
                                    ) : (
                                        <span className="pbj-doc-tag-none">Belum diunggah</span>
                                    )}
                                </div>

                                <div className="pbj-doc-attachment-item">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <span className="pbj-doc-file-icon pbj-doc-file-icon--bast">
                                            <FileDoneOutlined />
                                        </span>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: 700, fontSize: 13, color: '#172033' }}>Berita Acara (BAST)</span>
                                            <span style={{ fontSize: 11, color: '#94a3b8' }}>Penyelesaian barang/jasa</span>
                                        </div>
                                    </div>
                                    {detailRecord.file_bast_url ? (
                                        <a href={detailRecord.file_bast_url} target="_blank" rel="noreferrer">
                                            <button type="button" className="pbj-doc-btn pbj-doc-btn--bast">
                                                <EyeOutlined /> Buka BAST
                                            </button>
                                        </a>
                                    ) : (
                                        <span className="pbj-doc-tag-none">Belum diunggah</span>
                                    )}
                                </div>

                                <div className="pbj-doc-attachment-item">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <span className="pbj-doc-file-icon pbj-doc-file-icon--inv">
                                            <FileProtectOutlined />
                                        </span>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: 700, fontSize: 13, color: '#172033' }}>Invoice / Faktur</span>
                                            <span style={{ fontSize: 11, color: '#94a3b8' }}>Kuitansi / tagihan pembayaran</span>
                                        </div>
                                    </div>
                                    {detailRecord.file_invoice_url ? (
                                        <a href={detailRecord.file_invoice_url} target="_blank" rel="noreferrer">
                                            <button type="button" className="pbj-doc-btn pbj-doc-btn--inv">
                                                <EyeOutlined /> Buka Invoice
                                            </button>
                                        </a>
                                    ) : (
                                        <span className="pbj-doc-tag-none">Belum diunggah</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {isAdmin && (
                            <div style={{ marginTop: 24 }}>
                                <button
                                    type="button"
                                    className="pbj-btn-edit-drawer"
                                    onClick={() => {
                                        setIsDrawerOpen(false);
                                        handleOpenEdit(detailRecord);
                                    }}
                                >
                                    <EditOutlined /> Edit Data Pengadaan Ini
                                </button>
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
