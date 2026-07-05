import { useCallback, useEffect, useState } from 'react';
import {
    App as AntdApp,
    DatePicker,
    Input,
    InputNumber,
    Select,
    Space,
    Spin,
    Table,
    Tooltip,
    Typography,
    Tag,
    Dropdown,
    Button,
} from 'antd';
import {
    CalendarOutlined,
    CheckOutlined,
    CloseOutlined,
    DeleteOutlined,
    EditOutlined,
    PlusOutlined,
    SearchOutlined,
    CodeSandboxOutlined,
    FilePdfOutlined,
    MoreOutlined,
} from '@ant-design/icons';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { buildMessageAdapter } from '../utils/notify.js';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
// We reuse KearsipanPencatatanSurat CSS for generic table styling
import './KearsipanPencatatanSurat.css'; 

dayjs.locale('id');

const DATE_API = 'YYYY-MM-DD';
const DATE_UI = 'DD/MM/YYYY';

function DateBadge({ value }) {
    if (!value) return <span className="ps-bukti-none">—</span>;
    return (
        <span className="ps-date ps-date--blue">
            <CalendarOutlined style={{ fontSize: 11 }} />
            {dayjs(value).format('DD MMM YYYY')}
        </span>
    );
}

function InlineDatePicker({ value, onChange }) {
    return (
        <DatePicker size="small" value={value ? dayjs(value) : null} format={DATE_UI}
            style={{ width: 120 }} onChange={(d) => onChange(d ? d.format(DATE_API) : null)} />
    );
}

function InlineInput({ value, onChange, placeholder }) {
    return (
        <Input size="small" value={value ?? ''} onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            style={{ minWidth: 100 }} />
    );
}

const statusColors = {
    'Proses Negosiasi': 'default',
    'Proses PPK': 'blue',
    'Proses pengiriman': 'orange',
    'Proses Pembayaran': 'purple',
    'Selesai': 'success',
};

function PengadaanPbjInner() {
    const { apiFetch, token, user } = useAuth();
    const navigate = useNavigate();
    if (!token) return <Navigate to="/login" replace />;

    const { modal, message } = AntdApp.useApp();
    const notification = buildMessageAdapter(message);

    const isAdmin = user?.base_role === 'admin';

    const [dataRows, setDataRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState({ current: 1, pageSize: 25 });

    // Inline editing
    const [editingKey, setEditingKey] = useState(null);
    const [draft, setDraft] = useState({});
    const [savingKey, setSavingKey] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/procurement-pbjs');
            const body = await res.json();
            const rows = (body.data ?? []).map((r) => ({ ...r, key: String(r.id) }));
            setDataRows(rows);
        } catch (e) {
            notification.error({ message: 'Gagal memuat data', description: e.message });
        } finally { setLoading(false); }
    }, [apiFetch, notification]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const startEdit = (record) => { setEditingKey(record.key); setDraft({ ...record }); };
    const startNew = () => {
        setEditingKey('__new__');
        setDraft({
            nama_pengadaan: '',
            jenis_pengadaan: 'Langsung',
            nama_penyedia: '',
            tanggal_pengadaan: null,
            no_kontrak: '',
            nominal: null,
            tanggal_kirim: null,
            tanggal_sampai: null,
            no_bast: '',
            tanggal_bast: null,
            status_barang: 'Proses Negosiasi',
        });
    };
    const cancelEdit = () => { setEditingKey(null); setDraft({}); };
    const isEditing = (key) => key === editingKey;

    const saveRow = async () => {
        if (!draft.nama_pengadaan?.trim()) { notification.warning({ message: 'Nama Pengadaan wajib diisi.' }); return; }
        setSavingKey(editingKey);
        try {
            const isNew = editingKey === '__new__';
            const url = isNew ? '/procurement-pbjs' : `/procurement-pbjs/${editingKey}`;
            const method = isNew ? 'POST' : 'PUT';
            
            const res = await apiFetch(url, { method, body: JSON.stringify(draft) });
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || 'Gagal menyimpan.'); }
            notification.success({ message: isNew ? 'Data ditambahkan' : 'Data diperbarui' });
            cancelEdit();
            fetchData();
        } catch (e) {
            notification.error({ message: 'Gagal menyimpan', description: e.message });
        } finally { setSavingKey(null); }
    };

    const handleDelete = async (id) => {
        try {
            const res = await apiFetch(`/procurement-pbjs/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Gagal menghapus.');
            notification.success({ message: 'Data dihapus' });
            fetchData();
        } catch (e) { notification.error({ message: 'Gagal', description: e.message }); }
    };

    const baseData = search
        ? dataRows.filter(r => ['nama_pengadaan', 'nama_penyedia', 'no_kontrak', 'no_bast']
            .some(k => (r[k] ?? '').toLowerCase().includes(search.toLowerCase())))
        : dataRows;

    const tableData = editingKey === '__new__'
        ? [{ key: '__new__' }, ...baseData]
        : baseData;

    const setField = (field) => (val) => setDraft(prev => ({ ...prev, [field]: val }));

    const exportToPdf = async () => {
        try {
            message.loading({ content: 'Menyiapkan PDF...', key: 'pdf_export' });
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
            doc.text('JL. Dr. Ratulangi (Depan Taman Makam Pahlawan), Salobulo, Wara Utara, Kota Palopo, Sulawesi Selatan', pageWidth / 2, 29, { align: 'center' });

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

            // Convert baseData to table rows
            const body = baseData.filter(r => r.key !== '__new__').map((r, index) => [
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
                head: [[
                    'No', 'Nama Pengadaan', 'Status', 'Jenis', 'Tgl\nPengadaan', 
                    'Penyedia', 'No Kontrak', 'Nominal', 'Tgl\nKirim', 'Tgl\nSampai', 
                    'No BAST', 'Tgl BAST'
                ]],
                body: body,
                theme: 'grid',
                headStyles: { 
                    fillColor: [30, 64, 175], // royal blue / government tone #1e40af
                    textColor: 255, 
                    halign: 'center',
                    valign: 'middle',
                    fontSize: 8,
                }, 
                styles: { 
                    font: 'helvetica', 
                    fontSize: 8, 
                    cellPadding: 2, 
                    lineColor: [200, 200, 200],
                    lineWidth: 0.1,
                },
                alternateRowStyles: {
                    fillColor: [248, 250, 252] // slate-50
                },
                columnStyles: {
                    0: { halign: 'center', cellWidth: 8 },
                    2: { halign: 'center', cellWidth: 20 },
                    3: { halign: 'center', cellWidth: 20 },
                    4: { halign: 'center', cellWidth: 20 },
                    7: { halign: 'right', cellWidth: 25 },
                    8: { halign: 'center', cellWidth: 20 },
                    9: { halign: 'center', cellWidth: 20 },
                    11: { halign: 'center', cellWidth: 20 }
                },
                didDrawPage: (data) => {
                    // Footer page info
                    doc.setFontSize(8);
                    doc.setTextColor(150);
                    doc.text(`Sistem Informasi Pelayanan Tata Usaha (SIPTU) - Halaman ${data.pageNumber}`, margin, doc.internal.pageSize.getHeight() - 10);
                }
            });

            // --- SIGNATURE AREA ---
            const finalY = doc.lastAutoTable.finalY + 15;
            
            // Check if there's enough space for signature, if not add new page
            if (finalY + 40 > doc.internal.pageSize.getHeight()) {
                doc.addPage();
                doc.setPage(doc.internal.getNumberOfPages());
            }

            const activeY = finalY > doc.internal.pageSize.getHeight() - 40 ? 20 : finalY;
            const sigX = pageWidth - margin - 60; // right aligned
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(0);
            doc.text(`Palopo, ${dayjs().format('DD MMMM YYYY')}`, sigX, activeY);
            doc.text('Mengetahui,', sigX, activeY + 5);
            doc.text('Pejabat Pengadaan (PP)', sigX, activeY + 10);
            
            // lines for signature
            doc.setFont('helvetica', 'bold');
            doc.text('Doddy Prayudi, A.Md', sigX, activeY + 35);
            doc.setFont('helvetica', 'normal');
            doc.text('NIP. 199608052019031002', sigX, activeY + 40);

            doc.save(`Laporan_Pengadaan_PBJ_${dayjs().format('YYYYMMDD')}.pdf`);
            message.success({ content: 'PDF berhasil diunduh.', key: 'pdf_export' });
        } catch (error) {
            console.error('Export PDF error:', error);
            message.error({ content: 'Gagal membuat file PDF.', key: 'pdf_export' });
        }
    };

    const actCol = () => ({
        title: 'Aksi', key: 'act', width: 80, fixed: 'right', align: 'center',
        render: (_, record) => {
            if (isEditing(record.key)) {
                const editItems = [
                    {
                        key: 'save',
                        label: 'Simpan',
                        icon: <CheckOutlined style={{ color: '#52c41a' }} />,
                        onClick: saveRow,
                        disabled: savingKey === record.key
                    },
                    {
                        key: 'cancel',
                        label: 'Batal',
                        icon: <CloseOutlined style={{ color: '#ff4d4f' }} />,
                        onClick: cancelEdit
                    }
                ];
                return (
                    <Dropdown menu={{ items: editItems }} trigger={['click']} placement="bottomRight">
                        <Button type="text" icon={<MoreOutlined />} loading={savingKey === record.key} />
                    </Dropdown>
                );
            }

            const items = [
                {
                    key: 'edit',
                    label: 'Edit',
                    icon: <EditOutlined style={{ color: '#faad14' }} />,
                    onClick: () => startEdit(record),
                    disabled: !!editingKey
                },
                {
                    key: 'delete',
                    label: 'Hapus',
                    danger: true,
                    icon: <DeleteOutlined />,
                    onClick: () => {
                        modal.confirm({
                            title: 'Hapus data ini?',
                            content: 'Apakah anda yakin ingin menghapus data pengadaan ini?',
                            okText: 'Hapus',
                            okButtonProps: { danger: true },
                            onOk: () => handleDelete(record.id)
                        });
                    },
                    disabled: !!editingKey
                }
            ];
            return (
                <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
                    <Button type="text" icon={<MoreOutlined />} />
                </Dropdown>
            );
        }
    });

    const currentPage = pagination?.current ?? 1;
    const pageSize = pagination?.pageSize ?? 25;

    const noCol = {
        title: '#', key: 'no', width: 50, fixed: 'left', align: 'center',
        render: (_, record, i) => (
            <div className="ps-rno">
                {record?.key === '__new__' ? '+' : (currentPage - 1) * pageSize + i + 1}
            </div>
        ),
    };

    const columns = [
        noCol,
        {
            title: 'Nama Pengadaan', dataIndex: 'nama_pengadaan', key: 'nama_pengadaan', fixed: 'left', width: 200,
            render: (v, r) => isEditing(r.key)
                ? <InlineInput value={draft.nama_pengadaan} onChange={setField('nama_pengadaan')} placeholder="Nama Pengadaan" />
                : <span style={{ fontWeight: 600 }}>{v || '—'}</span>
        },
        {
            title: 'Status', dataIndex: 'status_barang', key: 'status_barang', width: 160,
            render: (v, r) => isEditing(r.key)
                ? (
                    <Select size="small" style={{ width: 140 }} value={draft.status_barang} onChange={setField('status_barang')}>
                        {['Proses Negosiasi', 'Proses PPK', 'Proses pengiriman', 'Proses Pembayaran', 'Selesai'].map(s => <Select.Option key={s} value={s}>{s}</Select.Option>)}
                    </Select>
                )
                : <Tag color={statusColors[v] ?? 'default'} style={{ margin: 0 }}>{v || '—'}</Tag>
        },
        {
            title: 'Jenis Pengadaan', dataIndex: 'jenis_pengadaan', key: 'jenis_pengadaan', width: 140,
            render: (v, r) => isEditing(r.key)
                ? (
                    <Select size="small" style={{ width: 120 }} value={draft.jenis_pengadaan} onChange={setField('jenis_pengadaan')}>
                        <Select.Option value="Langsung">Langsung</Select.Option>
                        <Select.Option value="E-Purchasing">E-Purchasing</Select.Option>
                    </Select>
                )
                : <span>{v || '—'}</span>
        },
        {
            title: 'Tgl Pengadaan', dataIndex: 'tanggal_pengadaan', key: 'tanggal_pengadaan', width: 140,
            render: (v, r) => isEditing(r.key)
                ? <InlineDatePicker value={draft.tanggal_pengadaan} onChange={setField('tanggal_pengadaan')} />
                : <DateBadge value={v} />
        },
        {
            title: 'Nama Penyedia', dataIndex: 'nama_penyedia', key: 'nama_penyedia', width: 160,
            render: (v, r) => isEditing(r.key)
                ? <InlineInput value={draft.nama_penyedia} onChange={setField('nama_penyedia')} placeholder="Nama Penyedia" />
                : <span>{v || '—'}</span>
        },
        {
            title: 'No Kontrak', dataIndex: 'no_kontrak', key: 'no_kontrak', width: 150,
            render: (v, r) => isEditing(r.key)
                ? <InlineInput value={draft.no_kontrak} onChange={setField('no_kontrak')} placeholder="No Kontrak" />
                : <span className="ps-code">{v || '—'}</span>
        },
        {
            title: 'Nominal', dataIndex: 'nominal', key: 'nominal', width: 150,
            render: (v, r) => isEditing(r.key)
                ? <InputNumber size="small" style={{ width: 130 }} value={draft.nominal} onChange={setField('nominal')}
                    formatter={value => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                    parser={value => value.replace(/\Rp\s?|(\.*)/g, '')} />
                : <span>{v ? `Rp ${Number(v).toLocaleString('id-ID')}` : '—'}</span>
        },
        {
            title: 'Tgl Kirim', dataIndex: 'tanggal_kirim', key: 'tanggal_kirim', width: 140,
            render: (v, r) => isEditing(r.key)
                ? <InlineDatePicker value={draft.tanggal_kirim} onChange={setField('tanggal_kirim')} />
                : <DateBadge value={v} />
        },
        {
            title: 'Tgl Sampai', dataIndex: 'tanggal_sampai', key: 'tanggal_sampai', width: 140,
            render: (v, r) => isEditing(r.key)
                ? <InlineDatePicker value={draft.tanggal_sampai} onChange={setField('tanggal_sampai')} />
                : <DateBadge value={v} />
        },
        {
            title: 'No BAST', dataIndex: 'no_bast', key: 'no_bast', width: 150,
            render: (v, r) => isEditing(r.key)
                ? <InlineInput value={draft.no_bast} onChange={setField('no_bast')} placeholder="No BAST" />
                : <span className="ps-code">{v || '—'}</span>
        },
        {
            title: 'Tgl BAST', dataIndex: 'tanggal_bast', key: 'tanggal_bast', width: 140,
            render: (v, r) => isEditing(r.key)
                ? <InlineDatePicker value={draft.tanggal_bast} onChange={setField('tanggal_bast')} />
                : <DateBadge value={v} />
        },
        ...(isAdmin ? [actCol()] : []),
    ];

    return (
        <div className="ps-page">
            <div style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1f36', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CodeSandboxOutlined style={{ color: '#4f46e5' }} /> Proses Pengadaan PBJ
                </h2>
                <button
                    type="button"
                    className="ps-page__add-btn"
                    onClick={() => navigate('/app/dashboard')}
                    style={{ paddingInline: 14 }}
                >
                    Kembali ke Dashboard
                </button>
            </div>

            <div className="ps-page__toolbar" style={{ marginTop: 12 }}>
                <div className="ps-page__controls" style={{ marginLeft: 'auto', width: '100%', justifyContent: 'space-between' }}>
                    <Input
                        className="ps-page__search"
                        placeholder="Cari pengadaan, penyedia, no kontrak..."
                        prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                        allowClear value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ maxWidth: 300 }}
                    />
                    <Space>
                        <Tooltip title="Ekspor data ke PDF">
                            <button
                                className="ps-page__add-btn"
                                type="button"
                                onClick={exportToPdf}
                                style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
                            >
                                <FilePdfOutlined /> Tarik PDF
                            </button>
                        </Tooltip>
                        {isAdmin && (
                            <Tooltip title={editingKey ? 'Selesaikan edit baris ini dulu.' : ''}>
                                <button className="ps-page__add-btn" type="button" onClick={startNew}
                                    disabled={!!editingKey}
                                    style={editingKey ? { opacity: .5, cursor: 'not-allowed' } : {}}>
                                    <PlusOutlined /> Tambah Data
                                </button>
                            </Tooltip>
                        )}
                    </Space>
                </div>
            </div>

            <div className="ps-page__table-card">
                {editingKey === '__new__' && (
                    <div className="ps-inline-hint">
                        ✏️ Isi kolom pada baris baru di bawah, lalu klik <strong>✓</strong> (kanan tabel) untuk menyimpan.
                    </div>
                )}
                <Table
                    dataSource={tableData}
                    columns={columns}
                    rowKey="key"
                    loading={loading}
                    size="small"
                    scroll={{ x: 'max-content', y: 'calc(100vh - 280px)' }}
                    rowClassName={(record) => isEditing(record.key) ? 'ps-row-editing' : ''}
                    pagination={{
                        current: pagination?.current ?? 1,
                        pageSize: pagination?.pageSize ?? 25,
                        showTotal: (n) => `${n} data`,
                        showSizeChanger: false,
                        position: ['bottomRight'],
                        onChange: (page, size) => setPagination({ current: page, pageSize: size }),
                    }}
                    locale={{
                        emptyText: (
                            <div className="ps-empty">
                                <div className="ps-empty-icon">📦</div>
                                <h3>Belum ada data Pengadaan PBJ</h3>
                                {isAdmin && (
                                    <>
                                        <p>Klik tombol <strong>Tambah Data</strong> untuk mulai mencatat.</p>
                                        <button className="ps-page__add-btn" type="button" onClick={startNew} disabled={!!editingKey}>
                                            <PlusOutlined /> Tambah Sekarang
                                        </button>
                                    </>
                                )}
                            </div>
                        ),
                    }}
                />
            </div>
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
