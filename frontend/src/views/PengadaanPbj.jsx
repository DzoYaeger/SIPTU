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
    Dropdown,
    Button,
    Modal,
    Form,
    Drawer,
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
    MoreOutlined,
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
} from '@ant-design/icons';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { buildMessageAdapter } from '../utils/notify.js';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import './PengadaanPbj.css';

dayjs.locale('id');

const DATE_API = 'YYYY-MM-DD';
const DATE_UI = 'DD/MM/YYYY';

// Corporate BPOM Palette Configuration:
const STATUS_CONFIG = {
    'Proses Negosiasi': { step: 1, percent: 20, color: '#d97706', bg: '#fffbebfb', tagColor: 'warning' },
    'Proses PPK': { step: 2, percent: 40, color: '#0F5B99', bg: '#eff6ff', tagColor: 'processing' },
    'Proses pengiriman': { step: 3, percent: 60, color: '#4f46e5', bg: '#eef2ff', tagColor: 'geekblue' },
    'Proses Pembayaran': { step: 4, percent: 80, color: '#7c3aed', bg: '#f5f3ff', tagColor: 'purple' },
    'Selesai': { step: 5, percent: 100, color: '#059669', bg: '#ecfdf5', tagColor: 'success' },
};

function StatusProgress({ status }) {
    const config = STATUS_CONFIG[status] || { step: 1, percent: 20, color: '#64748b', tagColor: 'default' };
    return (
        <div className="pbj-progress-mini">
            <div className="pbj-progress-mini__label">
                <span>{status || '—'}</span>
                <span>{config.percent}%</span>
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
    const currentStep = STATUS_CONFIG[currentStatus]?.step || 1;
    const steps = ['Negosiasi', 'PPK', 'Kirim', 'Bayar', 'Selesai'];

    return (
        <div className="pbj-stepper">
            {steps.map((label, idx) => {
                const stepNum = idx + 1;
                const isCompleted = stepNum < currentStep;
                const isActive = stepNum === currentStep;
                let stepClass = 'pbj-stepper-step';
                if (isCompleted) stepClass += ' pbj-stepper-step--completed';
                if (isActive) stepClass += ' pbj-stepper-step--active';

                return (
                    <Tooltip key={label} title={`Tahap ${stepNum}: ${label}`}>
                        <div className={stepClass}>
                            {isCompleted ? <CheckOutlined style={{ fontSize: 9 }} /> : stepNum}
                        </div>
                    </Tooltip>
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

function PengadaanPbjInner() {
    const { apiFetch, token, user } = useAuth();
    const navigate = useNavigate();

    const { modal, message } = AntdApp.useApp();
    const notification = buildMessageAdapter(message);

    const isAdmin = user?.base_role === 'admin';

    // State
    const [dataRows, setDataRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [jenisFilter, setJenisFilter] = useState('ALL');
    const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

    // Modal & Drawer State
    const [form] = Form.useForm();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
    const [editingRecord, setEditingRecord] = useState(null);
    const [submitting, setSubmitting] = useState(false);

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
            const payload = {
                ...values,
                tanggal_pengadaan: values.tanggal_pengadaan ? values.tanggal_pengadaan.format(DATE_API) : null,
                tanggal_kirim: values.tanggal_kirim ? values.tanggal_kirim.format(DATE_API) : null,
                tanggal_sampai: values.tanggal_sampai ? values.tanggal_sampai.format(DATE_API) : null,
                tanggal_bast: values.tanggal_bast ? values.tanggal_bast.format(DATE_API) : null,
            };

            const isNew = modalMode === 'create';
            const url = isNew ? '/procurement-pbjs' : `/procurement-pbjs/${editingRecord.id}`;
            const method = isNew ? 'POST' : 'PUT';

            const res = await apiFetch(url, { method, body: JSON.stringify(payload) });
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
            const matchesStatus = statusFilter === 'ALL' || r.status_barang === statusFilter;
            const matchesJenis = jenisFilter === 'ALL' || r.jenis_pengadaan === jenisFilter;
            return matchesSearch && matchesStatus && matchesJenis;
        });
    }, [dataRows, search, statusFilter, jenisFilter]);

    // KPI Aggregation
    const kpiStats = useMemo(() => {
        const total = dataRows.length;
        const inProgress = dataRows.filter((r) => r.status_barang !== 'Selesai').length;
        const finished = dataRows.filter((r) => r.status_barang === 'Selesai').length;
        const totalAmount = dataRows.reduce((acc, r) => acc + (Number(r.nominal) || 0), 0);
        return { total, inProgress, finished, totalAmount };
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
                    fillColor: [53, 98, 122], // #35627A Sapphire Blue
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

    // Actions Column Header content with tooltip and icon-only buttons
    const actionHeader = () => (
        <div className="pbj-column-action-header">
            <Tooltip title="Tarik Laporan PDF">
                <Button
                    type="text"
                    shape="circle"
                    size="small"
                    className="pbj-action-header-btn pbj-action-header-btn--pdf"
                    icon={<FilePdfOutlined />}
                    onClick={exportToPdf}
                />
            </Tooltip>
            {isAdmin && (
                <Tooltip title="Tambah Data Baru">
                    <Button
                        type="text"
                        shape="circle"
                        size="small"
                        className="pbj-action-header-btn pbj-action-header-btn--add"
                        icon={<PlusOutlined />}
                        onClick={handleOpenCreate}
                    />
                </Tooltip>
            )}
        </div>
    );

    // Table Columns Definition
    const columns = [
        {
            title: 'No',
            key: 'no',
            width: 55,
            align: 'center',
            render: (_, __, i) => (
                <span style={{ fontWeight: 600, color: '#8E9A98' }}>
                    {(pagination.current - 1) * pagination.pageSize + i + 1}
                </span>
            ),
        },
        {
            title: 'Nama Pengadaan',
            dataIndex: 'nama_pengadaan',
            key: 'nama_pengadaan',
            width: 240,
            render: (v, r) => (
                <div className="pbj-title-cell">
                    <span className="pbj-title-cell__main">{v || '—'}</span>
                    <div className="pbj-title-cell__sub">
                        <Tag color={r.jenis_pengadaan === 'E-Purchasing' ? 'cyan' : 'volcano'} style={{ margin: 0, fontSize: 10 }}>
                            {r.jenis_pengadaan || 'Langsung'}
                        </Tag>
                        {r.no_kontrak && <span>• No: {r.no_kontrak}</span>}
                    </div>
                </div>
            ),
        },
        {
            title: 'Status & Kemajuan',
            dataIndex: 'status_barang',
            key: 'status_barang',
            width: 170,
            render: (v) => <StatusProgress status={v} />,
        },
        {
            title: 'Penyedia',
            dataIndex: 'nama_penyedia',
            key: 'nama_penyedia',
            width: 180,
            render: (v) => (
                <div className="pbj-badge-vendor">
                    <ShopOutlined style={{ color: '#35627A' }} />
                    <span>{v || '—'}</span>
                </div>
            ),
        },
        {
            title: 'Nominal',
            dataIndex: 'nominal',
            key: 'nominal',
            width: 160,
            align: 'right',
            render: (v) => (
                <span className="pbj-price-tag">
                    {v ? `Rp ${Number(v).toLocaleString('id-ID')}` : '—'}
                </span>
            ),
        },
        {
            title: 'Tgl Pengadaan',
            dataIndex: 'tanggal_pengadaan',
            key: 'tanggal_pengadaan',
            width: 135,
            render: (v) => <DateBadge value={v} />,
        },
        {
            title: 'No BAST',
            dataIndex: 'no_bast',
            key: 'no_bast',
            width: 140,
            render: (v) => <span className="pbj-code-badge">{v || '—'}</span>,
        },
        {
            title: actionHeader(),
            key: 'act',
            width: 100,
            align: 'center',
            fixed: 'right',
            render: (_, record) => {
                const menuItems = [
                    {
                        key: 'detail',
                        label: 'Lihat Rincian',
                        icon: <EyeOutlined style={{ color: '#35627A' }} />,
                        onClick: () => handleOpenDetail(record),
                    },
                    ...(isAdmin
                        ? [
                              {
                                  key: 'edit',
                                  label: 'Edit Data',
                                  icon: <EditOutlined style={{ color: '#B46258' }} />,
                                  onClick: () => handleOpenEdit(record),
                              },
                              {
                                  key: 'delete',
                                  label: 'Hapus Data',
                                  danger: true,
                                  icon: <DeleteOutlined />,
                                  onClick: () => {
                                      modal.confirm({
                                          title: 'Hapus Pengadaan?',
                                          content: `Apakah Anda yakin ingin menghapus "${record.nama_pengadaan}"?`,
                                          okText: 'Ya, Hapus',
                                          okButtonProps: { danger: true },
                                          onOk: () => handleDelete(record.id),
                                      });
                                  },
                              },
                          ]
                        : []),
                ];

                return (
                    <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
                        <Button type="text" shape="circle" icon={<MoreOutlined style={{ fontSize: 18, color: '#35627A' }} />} />
                    </Dropdown>
                );
            },
        },
    ];

    return (
        <div className="pbj-page">
            {/* Sapphire Ash Morning Header */}
            <div className="pbj-header-panel">
                <div className="pbj-header-panel__left">
                    <div className="pbj-header-panel__badge">
                        <CodeSandboxOutlined />
                    </div>
                    <div className="pbj-header-panel__content">
                        <h1 className="pbj-header-panel__title">Pengadaan Barang & Jasa (PBJ)</h1>
                        <p className="pbj-header-panel__subtitle">
                            Sistem pemantauan terpadu alur pengadaan, status pengiriman, BAST, dan anggaran BPOM Palopo.
                        </p>
                    </div>
                </div>
                <div className="pbj-header-panel__actions">
                    <button type="button" className="pbj-pastel-btn" onClick={() => navigate('/app/dashboard')}>
                        <ArrowLeftOutlined /> Dashboard
                    </button>
                    <button type="button" className="pbj-pastel-btn" onClick={fetchData} title="Refresh Data">
                        <ReloadOutlined spin={loading} /> Refresh
                    </button>
                    {viewMode === 'grid' && (
                        <>
                            <Tooltip title="Tarik Laporan PDF">
                                <button type="button" className="pbj-pastel-btn pbj-pastel-btn--pdf" onClick={exportToPdf}>
                                    <FilePdfOutlined />
                                </button>
                            </Tooltip>
                            {isAdmin && (
                                <Tooltip title="Tambah Pengadaan Baru">
                                    <button type="button" className="pbj-pastel-btn pbj-pastel-btn--add" onClick={handleOpenCreate}>
                                        <PlusOutlined />
                                    </button>
                                </Tooltip>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Sapphire Ash Morning KPI Grid */}
            <div className="pbj-kpi-grid">
                <div className="pbj-kpi-card pbj-kpi-card--sapphire">
                    <div className="pbj-kpi-card__main">
                        <span className="pbj-kpi-card__label">Total Pengadaan</span>
                        <span className="pbj-kpi-card__value">{kpiStats.total}</span>
                        <span className="pbj-kpi-card__subtext">Item pengadaan terdaftar</span>
                    </div>
                    <div className="pbj-kpi-card__icon-wrapper">
                        <CodeSandboxOutlined />
                    </div>
                </div>

                <div className="pbj-kpi-card pbj-kpi-card--rose">
                    <div className="pbj-kpi-card__main">
                        <span className="pbj-kpi-card__label">Dalam Proses</span>
                        <span className="pbj-kpi-card__value">{kpiStats.inProgress}</span>
                        <span className="pbj-kpi-card__subtext">Sedang berjalan / belum BAST</span>
                    </div>
                    <div className="pbj-kpi-card__icon-wrapper">
                        <ClockCircleOutlined />
                    </div>
                </div>

                <div className="pbj-kpi-card pbj-kpi-card--sage">
                    <div className="pbj-kpi-card__main">
                        <span className="pbj-kpi-card__label">Selesai (BAST)</span>
                        <span className="pbj-kpi-card__value">{kpiStats.finished}</span>
                        <span className="pbj-kpi-card__subtext">
                            {kpiStats.total > 0 ? Math.round((kpiStats.finished / kpiStats.total) * 100) : 0}% Tingkat Selesai
                        </span>
                    </div>
                    <div className="pbj-kpi-card__icon-wrapper">
                        <CheckCircleOutlined />
                    </div>
                </div>

                <div className="pbj-kpi-card pbj-kpi-card--terracotta">
                    <div className="pbj-kpi-card__main">
                        <span className="pbj-kpi-card__label">Total Anggaran</span>
                        <span className="pbj-kpi-card__value">
                            Rp {kpiStats.totalAmount >= 1000000000 
                                ? (kpiStats.totalAmount / 1000000000).toFixed(2) + ' M' 
                                : kpiStats.totalAmount.toLocaleString('id-ID')}
                        </span>
                        <span className="pbj-kpi-card__subtext">Akumulasi anggaran pengadaan</span>
                    </div>
                    <div className="pbj-kpi-card__icon-wrapper">
                        <DollarOutlined />
                    </div>
                </div>
            </div>

            {/* Main Content Workspace Card */}
            <div className="pbj-card">
                {/* Control Toolbar */}
                <div className="pbj-toolbar">
                    <div className="pbj-toolbar__left">
                        <Input
                            className="pbj-search-input"
                            placeholder="Cari nama pengadaan, penyedia, no kontrak..."
                            prefix={<SearchOutlined style={{ color: '#8E9A98' }} />}
                            allowClear
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <Select
                            className="pbj-select-filter"
                            value={statusFilter}
                            onChange={setStatusFilter}
                            style={{ width: 175 }}
                        >
                            <Select.Option value="ALL">Semua Status</Select.Option>
                            <Select.Option value="Proses Negosiasi">Proses Negosiasi</Select.Option>
                            <Select.Option value="Proses PPK">Proses PPK</Select.Option>
                            <Select.Option value="Proses pengiriman">Proses Pengiriman</Select.Option>
                            <Select.Option value="Proses Pembayaran">Proses Pembayaran</Select.Option>
                            <Select.Option value="Selesai">Selesai</Select.Option>
                        </Select>
                        <Select
                            className="pbj-select-filter"
                            value={jenisFilter}
                            onChange={setJenisFilter}
                            style={{ width: 150 }}
                        >
                            <Select.Option value="ALL">Semua Jenis</Select.Option>
                            <Select.Option value="Langsung">Langsung</Select.Option>
                            <Select.Option value="E-Purchasing">E-Purchasing</Select.Option>
                        </Select>
                    </div>

                    <div className="pbj-toolbar__right">
                        <div className="pbj-view-switcher">
                            <button
                                type="button"
                                className={`pbj-view-btn ${viewMode === 'table' ? 'pbj-view-btn--active' : ''}`}
                                onClick={() => setViewMode('table')}
                            >
                                <UnorderedListOutlined /> Tabel
                            </button>
                            <button
                                type="button"
                                className={`pbj-view-btn ${viewMode === 'grid' ? 'pbj-view-btn--active' : ''}`}
                                onClick={() => setViewMode('grid')}
                            >
                                <AppstoreOutlined /> Kartu Grid
                            </button>
                        </div>
                    </div>
                </div>

                {/* Status Quick Filter Pills */}
                <div className="pbj-status-pills">
                    {[
                        { key: 'ALL', label: 'Semua Status' },
                        { key: 'Proses Negosiasi', label: 'Proses Negosiasi' },
                        { key: 'Proses PPK', label: 'Proses PPK' },
                        { key: 'Proses pengiriman', label: 'Proses Pengiriman' },
                        { key: 'Proses Pembayaran', label: 'Proses Pembayaran' },
                        { key: 'Selesai', label: 'Selesai (BAST)' },
                    ].map((pill) => {
                        const count =
                            pill.key === 'ALL'
                                ? dataRows.length
                                : dataRows.filter((r) => r.status_barang === pill.key).length;
                        return (
                            <button
                                key={pill.key}
                                type="button"
                                className={`pbj-pill ${statusFilter === pill.key ? 'pbj-pill--active' : ''}`}
                                onClick={() => setStatusFilter(pill.key)}
                            >
                                {pill.label} <span className="pbj-pill__count">{count}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Content Render: Table vs Grid Card View */}
                {viewMode === 'table' ? (
                    <div className="pbj-table-container">
                        <Table
                            dataSource={filteredRows}
                            columns={columns}
                            rowKey="id"
                            loading={loading}
                            size="middle"
                            scroll={{ x: 'max-content' }}
                            pagination={{
                                current: pagination.current,
                                pageSize: pagination.pageSize,
                                showTotal: (n) => `Total ${n} data pengadaan`,
                                showSizeChanger: true,
                                pageSizeOptions: ['10', '25', '50', '100'],
                                onChange: (page, size) => setPagination({ current: page, pageSize: size }),
                            }}
                            locale={{
                                emptyText: (
                                    <div className="pbj-empty">
                                        <div className="pbj-empty-icon">📦</div>
                                        <h3>Tidak Ada Data Pengadaan</h3>
                                        <p>Belum ada rincian pengadaan yang cocok dengan kriteria pencarian.</p>
                                    </div>
                                ),
                            }}
                        />
                    </div>
                ) : (
                    /* Grid Card View */
                    <div className="pbj-grid-cards">
                        {filteredRows.length === 0 ? (
                            <div className="pbj-empty" style={{ gridColumn: '1 / -1' }}>
                                <div className="pbj-empty-icon">📦</div>
                                <h3>Tidak Ada Data Pengadaan</h3>
                                <p>Belum ada rincian pengadaan yang cocok dengan kriteria pencarian.</p>
                            </div>
                        ) : (
                            filteredRows.map((record) => {
                                const statusCfg = STATUS_CONFIG[record.status_barang] || {
                                    color: '#8E9A98',
                                    tagColor: 'default',
                                };
                                return (
                                    <div key={record.id} className="pbj-card-item">
                                        <div>
                                            <div className="pbj-card-item__top">
                                                <span className="pbj-card-item__type">
                                                    {record.jenis_pengadaan || 'Langsung'}
                                                </span>
                                                <Tag color={statusCfg.tagColor} style={{ margin: 0, fontWeight: 600 }}>
                                                    {record.status_barang || '—'}
                                                </Tag>
                                            </div>

                                            <h3 className="pbj-card-item__title">{record.nama_pengadaan}</h3>

                                            <div className="pbj-card-item__details">
                                                <div className="pbj-card-detail-row">
                                                    <span className="pbj-card-detail-row__label">Penyedia</span>
                                                    <span className="pbj-card-detail-row__val">{record.nama_penyedia || '—'}</span>
                                                </div>
                                                <div className="pbj-card-detail-row">
                                                    <span className="pbj-card-detail-row__label">No Kontrak</span>
                                                    <span className="pbj-code-badge">{record.no_kontrak || '—'}</span>
                                                </div>
                                                <div className="pbj-card-detail-row">
                                                    <span className="pbj-card-detail-row__label">Tgl Pengadaan</span>
                                                    <span className="pbj-card-detail-row__val">
                                                        {record.tanggal_pengadaan
                                                            ? dayjs(record.tanggal_pengadaan).format('DD MMM YYYY')
                                                            : '—'}
                                                    </span>
                                                </div>
                                                <div className="pbj-card-detail-row">
                                                    <span className="pbj-card-detail-row__label">No BAST</span>
                                                    <span className="pbj-code-badge">{record.no_bast || '—'}</span>
                                                </div>
                                            </div>

                                            {/* Lifecycle Stepper */}
                                            <StatusStepper currentStatus={record.status_barang} />
                                        </div>

                                        <div className="pbj-card-item__footer">
                                            <span className="pbj-price-tag">
                                                {record.nominal ? `Rp ${Number(record.nominal).toLocaleString('id-ID')}` : '—'}
                                            </span>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <Button
                                                    size="small"
                                                    icon={<EyeOutlined />}
                                                    onClick={() => handleOpenDetail(record)}
                                                >
                                                    Rincian
                                                </Button>
                                                {isAdmin && (
                                                    <Button
                                                        size="small"
                                                        icon={<EditOutlined />}
                                                        onClick={() => handleOpenEdit(record)}
                                                    />
                                                )}
                                            </div>
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
                width={680}
                destroyOnClose
                title={
                    <div className="pbj-modal-title">
                        <div className="pbj-modal-title__icon">
                            {modalMode === 'create' ? <PlusOutlined /> : <EditOutlined />}
                        </div>
                        <span>
                            {modalMode === 'create' ? 'Tambah Data Pengadaan PBJ' : 'Edit Data Pengadaan PBJ'}
                        </span>
                    </div>
                }
            >
                <Form form={form} layout="vertical" onFinish={handleSaveForm} style={{ marginTop: 16 }}>
                    {/* Section 1: Info Utama */}
                    <div className="pbj-form-section">
                        <div className="pbj-form-section__title">
                            <FileTextOutlined /> 1. Informasi Utama Pengadaan
                        </div>
                        <Form.Item
                            name="nama_pengadaan"
                            label="Nama Pengadaan"
                            rules={[{ required: true, message: 'Nama Pengadaan wajib diisi' }]}
                        >
                            <Input placeholder="Contoh: Pengadaan Alat Tulis Kantor (ATK) Triwulan III" />
                        </Form.Item>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <Form.Item name="jenis_pengadaan" label="Jenis Pengadaan" rules={[{ required: true }]}>
                                <Select>
                                    <Select.Option value="Langsung">Langsung</Select.Option>
                                    <Select.Option value="E-Purchasing">E-Purchasing</Select.Option>
                                </Select>
                            </Form.Item>
                            <Form.Item name="tanggal_pengadaan" label="Tanggal Pengadaan">
                                <DatePicker format={DATE_UI} style={{ width: '100%' }} />
                            </Form.Item>
                        </div>
                    </div>

                    {/* Section 2: Penyedia & Kontrak */}
                    <div className="pbj-form-section">
                        <div className="pbj-form-section__title">
                            <ShopOutlined /> 2. Penyedia & Kontrak
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <Form.Item name="nama_penyedia" label="Nama Penyedia / Vendor">
                                <Input placeholder="Nama PT / CV Penyedia" />
                            </Form.Item>
                            <Form.Item name="no_kontrak" label="Nomor Kontrak / SPK">
                                <Input placeholder="Nomor SPK / Surat Pesanan" />
                            </Form.Item>
                        </div>

                        <Form.Item name="nominal" label="Nominal Anggaran (Rp)">
                            <InputNumber
                                style={{ width: '100%' }}
                                placeholder="Masukkan jumlah nominal"
                                formatter={(value) => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                                parser={(value) => value.replace(/\Rp\s?|(\.*)/g, '')}
                            />
                        </Form.Item>
                    </div>

                    {/* Section 3: Logistik & BAST */}
                    <div className="pbj-form-section">
                        <div className="pbj-form-section__title">
                            <CalendarOutlined /> 3. Timeline Logistik & BAST
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <Form.Item name="tanggal_kirim" label="Tanggal Kirim">
                                <DatePicker format={DATE_UI} style={{ width: '100%' }} />
                            </Form.Item>
                            <Form.Item name="tanggal_sampai" label="Tanggal Sampai">
                                <DatePicker format={DATE_UI} style={{ width: '100%' }} />
                            </Form.Item>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <Form.Item name="no_bast" label="Nomor BAST">
                                <Input placeholder="Nomor Berita Acara Serah Terima" />
                            </Form.Item>
                            <Form.Item name="tanggal_bast" label="Tanggal BAST">
                                <DatePicker format={DATE_UI} style={{ width: '100%' }} />
                            </Form.Item>
                        </div>
                    </div>

                    {/* Section 4: Status Status */}
                    <div className="pbj-form-section">
                        <div className="pbj-form-section__title">
                            <ClockCircleOutlined /> 4. Status Siklus Pengadaan
                        </div>
                        <Form.Item name="status_barang" label="Status Terkini" rules={[{ required: true }]}>
                            <Select>
                                <Select.Option value="Proses Negosiasi">Proses Negosiasi (20%)</Select.Option>
                                <Select.Option value="Proses PPK">Proses PPK (40%)</Select.Option>
                                <Select.Option value="Proses pengiriman">Proses Pengiriman (60%)</Select.Option>
                                <Select.Option value="Proses Pembayaran">Proses Pembayaran (80%)</Select.Option>
                                <Select.Option value="Selesai">Selesai / BAST (100%)</Select.Option>
                            </Select>
                        </Form.Item>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                        <Button onClick={() => setIsModalOpen(false)}>Batal</Button>
                        <Button type="primary" htmlType="submit" loading={submitting} style={{ background: '#35627A', borderColor: '#35627A' }}>
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
                width={520}
                title={
                    <div className="pbj-detail-header">
                        <span style={{ fontSize: 11, textTransform: 'uppercase', color: '#35627A', fontWeight: 700 }}>
                            Rincian Pengadaan PBJ
                        </span>
                        <span className="pbj-detail-title">{detailRecord?.nama_pengadaan || 'Detail Data'}</span>
                    </div>
                }
            >
                {detailRecord && (
                    <div>
                        {/* Status Overview Card */}
                        <div className="pbj-detail-card">
                            <div className="pbj-detail-card__heading">
                                <ClockCircleOutlined /> Alur & Status Tahapan
                            </div>
                            <StatusProgress status={detailRecord.status_barang} />
                            <div style={{ marginTop: 16 }}>
                                <StatusStepper currentStatus={detailRecord.status_barang} />
                            </div>
                        </div>

                        {/* General Info Card */}
                        <div className="pbj-detail-card">
                            <div className="pbj-detail-card__heading">
                                <FileTextOutlined /> Informasi Pengadaan
                            </div>
                            <div className="pbj-detail-grid">
                                <div className="pbj-detail-item">
                                    <span className="pbj-detail-item__label">Jenis Pengadaan</span>
                                    <span className="pbj-detail-item__val">{detailRecord.jenis_pengadaan || '—'}</span>
                                </div>
                                <div className="pbj-detail-item">
                                    <span className="pbj-detail-item__label">Tanggal Pengadaan</span>
                                    <span className="pbj-detail-item__val">
                                        {detailRecord.tanggal_pengadaan
                                            ? dayjs(detailRecord.tanggal_pengadaan).format('DD MMMM YYYY')
                                            : '—'}
                                    </span>
                                </div>
                                <div className="pbj-detail-item" style={{ gridColumn: '1 / -1' }}>
                                    <span className="pbj-detail-item__label">Nominal Anggaran</span>
                                    <span className="pbj-price-tag" style={{ fontSize: 16, marginTop: 4 }}>
                                        {detailRecord.nominal
                                            ? `Rp ${Number(detailRecord.nominal).toLocaleString('id-ID')}`
                                            : '—'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Vendor & Contract Card */}
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
                                    <span className="pbj-detail-item__label">Nomor Kontrak</span>
                                    <span className="pbj-code-badge" style={{ fontSize: 13, display: 'inline-block', marginTop: 4 }}>
                                        {detailRecord.no_kontrak || '—'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Delivery & BAST Card */}
                        <div className="pbj-detail-card">
                            <div className="pbj-detail-card__heading">
                                <CalendarOutlined /> Pengiriman & BAST
                            </div>
                            <div className="pbj-detail-grid">
                                <div className="pbj-detail-item">
                                    <span className="pbj-detail-item__label">Tanggal Kirim</span>
                                    <span className="pbj-detail-item__val">
                                        {detailRecord.tanggal_kirim
                                            ? dayjs(detailRecord.tanggal_kirim).format('DD MMM YYYY')
                                            : '—'}
                                    </span>
                                </div>
                                <div className="pbj-detail-item">
                                    <span className="pbj-detail-item__label">Tanggal Sampai</span>
                                    <span className="pbj-detail-item__val">
                                        {detailRecord.tanggal_sampai
                                            ? dayjs(detailRecord.tanggal_sampai).format('DD MMM YYYY')
                                            : '—'}
                                    </span>
                                </div>
                                <div className="pbj-detail-item">
                                    <span className="pbj-detail-item__label">Nomor BAST</span>
                                    <span className="pbj-code-badge" style={{ marginTop: 4 }}>
                                        {detailRecord.no_bast || '—'}
                                    </span>
                                </div>
                                <div className="pbj-detail-item">
                                    <span className="pbj-detail-item__label">Tanggal BAST</span>
                                    <span className="pbj-detail-item__val">
                                        {detailRecord.tanggal_bast
                                            ? dayjs(detailRecord.tanggal_bast).format('DD MMM YYYY')
                                            : '—'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {isAdmin && (
                            <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                                <Button
                                    type="primary"
                                    block
                                    icon={<EditOutlined />}
                                    style={{ background: '#35627A', borderColor: '#35627A' }}
                                    onClick={() => {
                                        setIsDrawerOpen(false);
                                        handleOpenEdit(detailRecord);
                                    }}
                                >
                                    Edit Data Ini
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
    return (
        <AntdApp>
            <PengadaanPbjInner />
        </AntdApp>
    );
}
