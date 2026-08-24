import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    App as AntdApp,
    DatePicker,
    Input,
    Select,
    Space,
    Spin,
    Table,
    Tag,
    Tooltip,
    Typography,
    Upload,
} from 'antd';
import {
    BankOutlined,
    CalendarOutlined,
    CheckOutlined,
    CloseOutlined,
    DeleteOutlined,
    EditOutlined,
    FileDoneOutlined,
    FilePdfOutlined,
    InboxOutlined,
    MailOutlined,
    PlusOutlined,
    SearchOutlined,
    SendOutlined,
    ShopOutlined,
    UploadOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { buildMessageAdapter } from '../utils/notify.js';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import './KearsipanPencatatanSurat.css';

dayjs.locale('id');

// const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';
const DATE_API = 'YYYY-MM-DD';
const DATE_UI = 'DD/MM/YYYY';
const toDay = (s) => (s ? dayjs(s) : null);

/* ── static date badge ── */
function DateBadge({ value, variant }) {
    if (!value) return <span className="ps-bukti-none">—</span>;
    const cls = { blue: 'ps-date--blue', green: 'ps-date--green', amber: 'ps-date--amber' }[variant] ?? '';
    return (
        <span className={`ps-date ${cls}`}>
            <CalendarOutlined style={{ fontSize: 11 }} />
            {dayjs(value).format('DD MMM YYYY')}
        </span>
    );
}

function InlineDatePicker({ value, onChange }) {
    return (
        <DatePicker size="small" value={value ? dayjs(value) : null} format={DATE_UI}
            style={{ width: 130 }} onChange={(d) => onChange(d ? d.format(DATE_API) : null)} />
    );
}

function InlineInput({ value, onChange, placeholder, icon }) {
    return (
        <Input size="small" value={value ?? ''} onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            prefix={icon ? <span style={{ color: '#d1d5db' }}>{icon}</span> : null}
            style={{ minWidth: 90 }} />
    );
}

/* ══════════════════════════════════════════════════════ */
function PencatatanSuratInner() {
    const { apiFetch, token, user } = useAuth();
    const navigate = useNavigate();
    if (!token) return <Navigate to="/login" replace />;

    const { message, modal } = AntdApp.useApp();
    const notification = buildMessageAdapter(message);

    // ── Units (UP/UK) ──
    const [units, setUnits] = useState([]);
    const [unitsLoading, setUnitsLoading] = useState(true);
    const [selectedUnitId, setSelectedUnitId] = useState(null); // 'all', 'uk', or ID
    const [userRole, setUserRole] = useState('none'); // 'uk', 'up', 'none'
    const [userUnitId, setUserUnitId] = useState(null);

    // ── Letters ──
    const [activeTab, setActiveTab] = useState('masuk');
    const [dataMasuk, setDataMasuk] = useState([]);
    const [dataKeluar, setDataKeluar] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState({
        masuk: { current: 1, pageSize: 25 },
        keluar: { current: 1, pageSize: 25 },
    });

    // ── Inline editing ──
    const [editingKey, setEditingKey] = useState(null);
    const [draft, setDraft] = useState({});
    const [savingKey, setSavingKey] = useState(null);
    const [uploadingId, setUploadingId] = useState(null);
    const [exporting, setExporting] = useState(false);

    const isMasuk = activeTab === 'masuk';
    const isAllUnitsView = selectedUnitId === 'all';

    /* ── fetch units ── */
    const fetchUnits = useCallback(async () => {
        setUnitsLoading(true);
        try {
            const res = await apiFetch('/letters/units');
            const body = await res.json();
            const list = body.data ?? [];
            const role = body.user_role ?? 'none';
            const uId = body.user_unit_id;

            setUnits(list);
            setUserRole(role);
            setUserUnitId(uId);

            // Default selection based on role
            if (role === 'uk') {
                setSelectedUnitId('uk'); // Default to Unit Kearsipan bucket
            } else if (role === 'up' && uId) {
                setSelectedUnitId(uId);
            }
        } catch (e) {
            notification.error({ message: 'Gagal memuat daftar UP/UK', description: e.message });
        } finally { setUnitsLoading(false); }
    }, [apiFetch, notification]);

    useEffect(() => { fetchUnits(); }, [fetchUnits]);

    /* ── fetch letters ── */
    const fetchLetters = useCallback(async (type) => {
        if (userRole === 'none') return;
        setLoading(true);
        try {
            const params = new URLSearchParams({ type });
            if (selectedUnitId && selectedUnitId !== 'all') {
                params.set('archive_unit_id', selectedUnitId);
            }
            const res = await apiFetch(`/letters?${params}`);
            const body = await res.json();
            const rows = (body.data ?? []).map((r) => ({ ...r, key: String(r.id) }));
            type === 'masuk' ? setDataMasuk(rows) : setDataKeluar(rows);
        } catch (e) {
            notification.error({ message: 'Gagal memuat data', description: e.message });
        } finally { setLoading(false); }
    }, [apiFetch, notification, selectedUnitId, userRole]);

    useEffect(() => {
        fetchLetters('masuk');
        fetchLetters('keluar');
    }, [fetchLetters]);

    useEffect(() => {
        setPagination((prev) => ({
            ...prev,
            [activeTab]: { ...prev[activeTab], current: 1 },
        }));
    }, [activeTab, search, selectedUnitId]);

    /* ── unit change ── */
    const handleUnitChange = (id) => {
        cancelEdit();
        setSelectedUnitId(id);
    };

    /* ── inline editing ── */
    const startEdit = (record) => { setEditingKey(record.key); setDraft({ ...record }); };
    const startNew = () => {
        const unitToSave = selectedUnitId === 'all' ? null : selectedUnitId;
        setEditingKey('__new__');
        setDraft({
            type: activeTab,
            archive_unit_id: unitToSave,
            nomor_surat: '',
            hal: '',
            tanggal_surat: null,
            instansi_pengirim: '',
            penerima: '',
            tanggal_terima: null,
            tujuan: '',
            pengirim: '',
            tanggal_kirim: null
        });
    };
    const cancelEdit = () => { setEditingKey(null); setDraft({}); };
    const isEditing = (key) => key === editingKey;

    /* ── save ── */
    const saveRow = async () => {
        if (!draft.hal?.trim()) { notification.warning({ message: 'Perihal wajib diisi.' }); return; }
        setSavingKey(editingKey);
        try {
            const isNew = editingKey === '__new__';
            const url = isNew ? '/letters' : `/letters/${editingKey}`;
            const method = isNew ? 'POST' : 'PUT';
            const payload = {
                type: draft.type ?? activeTab,
                archive_unit_id: draft.archive_unit_id ?? selectedUnitId ?? null,
                nomor_surat: draft.nomor_surat || null,
                hal: draft.hal || null,
                tanggal_surat: draft.tanggal_surat || null,
                instansi_pengirim: draft.instansi_pengirim || null,
                penerima: draft.penerima || null,
                tanggal_terima: draft.tanggal_terima || null,
                tujuan: draft.tujuan || null,
                pengirim: draft.pengirim || null,
                tanggal_kirim: draft.tanggal_kirim || null,
            };
            const res = await apiFetch(url, { method, body: JSON.stringify(payload) });
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || 'Gagal.'); }
            notification.success({ message: isNew ? 'Surat ditambahkan' : 'Surat diperbarui' });
            cancelEdit();
            fetchLetters(activeTab);
        } catch (e) {
            notification.error({ message: 'Gagal menyimpan', description: e.message });
        } finally { setSavingKey(null); }
    };

    /* ── delete ── */
    const handleDelete = async (id) => {
        try {
            const res = await apiFetch(`/letters/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Gagal.');
            notification.success({ message: 'Surat dihapus' });
            fetchLetters(activeTab);
        } catch (e) { notification.error({ message: 'Gagal', description: e.message }); }
    };

    /* ── upload bukti kirim (keluar) ── */
    const handleUploadBukti = async (file, id) => {
        if (file.size > 1024 * 1024) {
            notification.error({ message: 'File terlalu besar', description: 'Maksimal ukuran file adalah 1 MB.' });
            return false;
        }
        setUploadingId(id);
        try {
            const fd = new FormData(); fd.append('file', file);
            const res = await apiFetch(`/letters/${id}/bukti`, {
                method: 'POST',
                body: fd,
            });
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || 'Gagal.'); }
            notification.success({ message: 'Bukti diunggah' });
            fetchLetters('keluar');
        } catch (e) { notification.error({ message: 'Upload gagal', description: e.message }); }
        finally { setUploadingId(null); }
        return false;
    };

    /* ── upload file surat masuk ── */
    const handleUploadFileSurat = async (file, id) => {
        if (file.size > 1024 * 1024) {
            notification.error({ message: 'File terlalu besar', description: 'Maksimal ukuran file adalah 1 MB.' });
            return false;
        }
        setUploadingId(`m${id}`);
        try {
            const fd = new FormData(); fd.append('file', file);
            const res = await apiFetch(`/letters/${id}/file-surat`, {
                method: 'POST',
                body: fd,
            });
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || 'Gagal.'); }
            notification.success({ message: 'File surat diunggah' });
            fetchLetters('masuk');
        } catch (e) { notification.error({ message: 'Upload gagal', description: e.message }); }
        finally { setUploadingId(null); }
        return false;
    };

    /* ── export pdf ── */
    const handleExportPdf = async () => {
        setExporting(true);
        try {
            const params = new URLSearchParams({ type: activeTab });
            if (selectedUnitId && selectedUnitId !== 'all') {
                params.set('archive_unit_id', selectedUnitId);
            }
            if (search) {
                params.set('search', search);
            }

            const res = await apiFetch(`/letters/export-pdf?${params}`);
            if (!res.ok) throw new Error('Gagal mengunduh PDF');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const filename = `Laporan_Surat_${activeTab}_${dayjs().format('YYYYMMDD_HHmmss')}.pdf`;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            notification.success({ message: 'Laporan PDF berhasil diunduh' });
        } catch (e) {
            notification.error({ message: 'Gagal ekspor PDF', description: e.message });
        } finally {
            setExporting(false);
        }
    };

    /* ── filter ── */
    const selectedUnit = useMemo(() => {
        if (selectedUnitId === 'uk') return { nama: 'Unit Kearsipan' };
        if (selectedUnitId === 'all') return { nama: 'Semua Unit' };
        return units.find(u => u.id === selectedUnitId);
    }, [selectedUnitId, units]);

    const raw = isMasuk ? dataMasuk : dataKeluar;
    const baseData = search
        ? raw.filter(r => ['nomor_surat', 'hal', 'instansi_pengirim', 'penerima', 'tujuan', 'pengirim']
            .some(k => (r[k] ?? '').toLowerCase().includes(search.toLowerCase())))
        : raw;

    const tableData = editingKey === '__new__'
        ? [...baseData, { key: '__new__', type: activeTab }]
        : baseData;

    const setField = (field) => (val) => setDraft(prev => ({ ...prev, [field]: val }));

    /* ── columns builder ── */
    const actCol = () => ({
        title: '', key: 'act', width: 80, fixed: 'right',
        render: (_, record) => isEditing(record.key) ? (
            <Space size={4}>
                <Tooltip title="Simpan">
                    <button className="ps-btn-save" onClick={saveRow} disabled={savingKey === record.key} type="button">
                        {savingKey === record.key ? '…' : <CheckOutlined />}
                    </button>
                </Tooltip>
                <Tooltip title="Batal">
                    <button className="ps-btn-cancel" onClick={cancelEdit} type="button"><CloseOutlined /></button>
                </Tooltip>
            </Space>
        ) : (
            <Space size={4}>
                <Tooltip title="Edit">
                    <button className="ps-btn-edit" onClick={() => startEdit(record)} type="button" disabled={!!editingKey}><EditOutlined /></button>
                </Tooltip>
                <button
                    className="ps-btn-del"
                    type="button"
                    disabled={!!editingKey}
                    onClick={() => {
                        modal.confirm({
                            title: 'Hapus Surat',
                            content: 'Hapus surat ini?',
                            okText: 'Hapus',
                            okButtonProps: { danger: true },
                            cancelText: 'Batal',
                            onOk: () => handleDelete(record.id),
                        });
                    }}
                >
                    <DeleteOutlined />
                </button>
            </Space>
        ),
    });

    const currentPage = pagination[activeTab]?.current ?? 1;
    const pageSize = pagination[activeTab]?.pageSize ?? 25;

    const noCol = {
        title: '#', key: 'no', width: 46, align: 'center',
        render: (_, record, i) => (
            <div className="ps-rno">
                {record?.key === '__new__' ? '+' : (currentPage - 1) * pageSize + i + 1}
            </div>
        ),
    };

    const colsMasuk = [
        noCol,
        {
            title: 'Nomor Surat', dataIndex: 'nomor_surat', key: 'ns', width: 165,
            render: (v, r) => isEditing(r.key)
                ? <InlineInput value={draft.nomor_surat} onChange={setField('nomor_surat')} placeholder="001/BPOM/II/2026" icon={<MailOutlined />} />
                : <span className="ps-code ps-code--blue">{v || '—'}</span>
        },
        {
            title: 'Hal / Perihal', dataIndex: 'hal', key: 'hal',
            render: (v, r) => isEditing(r.key)
                ? <InlineInput value={draft.hal} onChange={setField('hal')} placeholder="Perihal surat… (wajib)" />
                : <span style={{ fontSize: 13 }}>{v || '—'}</span>
        },
        {
            title: 'Tgl. Surat', dataIndex: 'tanggal_surat', key: 'ts', width: 145,
            render: (v, r) => isEditing(r.key)
                ? <InlineDatePicker value={draft.tanggal_surat} onChange={setField('tanggal_surat')} />
                : <DateBadge value={v} variant="blue" />
        },
        {
            title: 'Instansi Pengirim', dataIndex: 'instansi_pengirim', key: 'ip',
            render: (v, r) => isEditing(r.key)
                ? <InlineInput value={draft.instansi_pengirim} onChange={setField('instansi_pengirim')} placeholder="Nama instansi" icon={<BankOutlined />} />
                : v ? <span style={{ display: 'flex', gap: 6, fontSize: 13, alignItems: 'center' }}><BankOutlined style={{ color: '#9ca3af', fontSize: 11 }} />{v}</span> : '—'
        },
        {
            title: 'Penerima', dataIndex: 'penerima', key: 'pn', width: 140,
            render: (v, r) => isEditing(r.key)
                ? <InlineInput value={draft.penerima} onChange={setField('penerima')} placeholder="Nama penerima" icon={<UserOutlined />} />
                : v ? <span style={{ display: 'flex', gap: 6, fontSize: 13, alignItems: 'center' }}><UserOutlined style={{ color: '#9ca3af', fontSize: 11 }} />{v}</span> : '—'
        },
        {
            title: 'Tgl. Terima', dataIndex: 'tanggal_terima', key: 'tt', width: 145,
            render: (v, r) => isEditing(r.key)
                ? <InlineDatePicker value={draft.tanggal_terima} onChange={setField('tanggal_terima')} />
                : <DateBadge value={v} variant="green" />
        },
        {
            title: 'File Surat', dataIndex: 'file_surat_url', key: 'fs', width: 108,
            render: (url, record) => isEditing(record.key) ? (
                <span className="ps-bukti-none" style={{ fontSize: 11 }}>Upload setelah simpan</span>
            ) : (
                <Space size={4}>
                    {url && <a href={url} target="_blank" rel="noopener noreferrer" className="ps-bukti"><FilePdfOutlined />Lihat</a>}
                    {record.id && (
                        <Upload showUploadList={false} beforeUpload={(f) => handleUploadFileSurat(f, record.id)}
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx">
                            <Tooltip title={url ? 'Ganti file' : 'Upload file surat'}>
                                <button className="ps-btn-up" type="button"
                                    style={uploadingId === `m${record.id}` ? { opacity: .6, cursor: 'wait' } : {}}>
                                    <UploadOutlined />
                                </button>
                            </Tooltip>
                        </Upload>
                    )}
                </Space>
            ),
        },
        ...(isAllUnitsView ? [] : [actCol()]),
    ];

    const colsKeluar = [
        noCol,
        {
            title: 'Nomor Surat', dataIndex: 'nomor_surat', key: 'ns', width: 165,
            render: (v, r) => isEditing(r.key)
                ? <InlineInput value={draft.nomor_surat} onChange={setField('nomor_surat')} placeholder="001/BPOM/II/2026" icon={<MailOutlined />} />
                : <span className="ps-code ps-code--green">{v || '—'}</span>
        },
        {
            title: 'Hal / Perihal', dataIndex: 'hal', key: 'hal',
            render: (v, r) => isEditing(r.key)
                ? <InlineInput value={draft.hal} onChange={setField('hal')} placeholder="Perihal surat… (wajib)" />
                : <span style={{ fontSize: 13 }}>{v || '—'}</span>
        },
        {
            title: 'Tgl. Surat', dataIndex: 'tanggal_surat', key: 'ts', width: 145,
            render: (v, r) => isEditing(r.key)
                ? <InlineDatePicker value={draft.tanggal_surat} onChange={setField('tanggal_surat')} />
                : <DateBadge value={v} variant="blue" />
        },
        {
            title: 'Tujuan', dataIndex: 'tujuan', key: 'tj',
            render: (v, r) => isEditing(r.key)
                ? <InlineInput value={draft.tujuan} onChange={setField('tujuan')} placeholder="Instansi/nama tujuan" icon={<MailOutlined />} />
                : v ? <span style={{ display: 'flex', gap: 6, fontSize: 13, alignItems: 'center' }}><MailOutlined style={{ color: '#9ca3af', fontSize: 11 }} />{v}</span> : '—'
        },
        {
            title: 'Pengirim', dataIndex: 'pengirim', key: 'pg', width: 140,
            render: (v, r) => isEditing(r.key)
                ? <InlineInput value={draft.pengirim} onChange={setField('pengirim')} placeholder="Nama pengirim" icon={<UserOutlined />} />
                : v ? <span style={{ display: 'flex', gap: 6, fontSize: 13, alignItems: 'center' }}><UserOutlined style={{ color: '#9ca3af', fontSize: 11 }} />{v}</span> : '—'
        },
        {
            title: 'Tgl. Kirim', dataIndex: 'tanggal_kirim', key: 'tk', width: 145,
            render: (v, r) => isEditing(r.key)
                ? <InlineDatePicker value={draft.tanggal_kirim} onChange={setField('tanggal_kirim')} />
                : <DateBadge value={v} variant="amber" />
        },
        {
            title: 'Bukti', dataIndex: 'bukti_kirim_url', key: 'bukti', width: 108,
            render: (url, record) => isEditing(record.key) ? (
                <span className="ps-bukti-none" style={{ fontSize: 11 }}>Upload setelah simpan</span>
            ) : (
                <Space size={4}>
                    {url && <a href={url} target="_blank" rel="noopener noreferrer" className="ps-bukti"><FilePdfOutlined />Lihat</a>}
                    {record.id && (
                        <Upload showUploadList={false} beforeUpload={(f) => handleUploadBukti(f, record.id)} accept=".pdf,.jpg,.jpeg,.png">
                            <Tooltip title={url ? 'Ganti file' : 'Upload bukti'}>
                                <button className="ps-btn-up" type="button"
                                    style={uploadingId === record.id ? { opacity: .6, cursor: 'wait' } : {}}>
                                    <UploadOutlined />
                                </button>
                            </Tooltip>
                        </Upload>
                    )}
                </Space>
            )
        },
        ...(isAllUnitsView ? [] : [actCol()]),
    ];

    if (unitsLoading) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><Spin size="large" /></div>;
    }

    if (userRole === 'none') {
        return (
            <div className="ps-page" style={{ textAlign: 'center', paddingTop: 100 }}>
                <Typography.Title level={4}>Akses Tertutup</Typography.Title>
                <Typography.Text type="secondary">
                    Anda belum ditetapkan sebagai petugas Unit Pengolah (UP) atau Unit Kearsipan (UK).<br />
                    Silakan hubungi administrator Bagian Tata Usaha untuk pendaftaran akses.
                </Typography.Text>
            </div>
        );
    }

    return (
        <div className="ps-page">

            {/* TITLE */}
            <div style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1f36', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileDoneOutlined style={{ color: '#4f46e5' }} /> Pencatatan Surat
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

            {/* UNIT SELECTOR */}
            <div className="ps-unit-bar">
                <ShopOutlined style={{ color: '#6b7280', fontSize: 14 }} />
                <span className="ps-unit-bar__label">Unit Pengolah / Unit Kearsipan:</span>
                <Select
                    className="ps-unit-bar__select"
                    placeholder="Pilih Unit..."
                    disabled={userRole === 'up'}
                    optionFilterProp="label"
                    value={selectedUnitId}
                    onChange={handleUnitChange}
                    options={[
                        ...(userRole === 'uk' ? [{ value: 'all', label: '— Semua Unit (Hanya Lihat) —' }] : []),
                        ...(userRole === 'uk' ? [{ value: 'uk', label: 'Unit Kearsipan (UK)' }] : []),
                        ...units.map(u => ({ value: u.id, label: u.nama }))
                    ]}
                    style={{ minWidth: 260 }}
                />
                {selectedUnitId === 'all' && (
                    <Tag color="default" style={{ marginLeft: 8 }}>Semua Unit (Mode Lihat)</Tag>
                )}
                {selectedUnitId === 'uk' && (
                    <Tag color="purple" style={{ marginLeft: 8 }}>Unit Kearsipan</Tag>
                )}
                {typeof selectedUnitId === 'number' && (
                    <Tag color="blue" style={{ marginLeft: 8 }}>Unit Pengolah: <strong>{units.find(u => u.id === selectedUnitId)?.nama}</strong></Tag>
                )}
            </div>

            {/* TOOLBAR */}
            <div className="ps-page__toolbar">
                <div className="ps-page__sheet-tabs">
                    {[
                        { key: 'masuk', label: 'Surat Masuk', icon: <InboxOutlined />, count: dataMasuk.length },
                        { key: 'keluar', label: 'Surat Keluar', icon: <SendOutlined />, count: dataKeluar.length },
                    ].map(tab => (
                        <button key={tab.key} type="button"
                            className={`ps-page__sheet-tab${activeTab === tab.key ? ' ps-page__sheet-tab--active' : ''}`}
                            onClick={() => { cancelEdit(); setActiveTab(tab.key); }}>
                            {tab.icon} {tab.label}
                            <span className="ps-page__tab-badge">{tab.count}</span>
                        </button>
                    ))}
                </div>
                <div className="ps-page__controls">
                    <Input
                        className="ps-page__search"
                        placeholder={`Cari ${isMasuk ? 'nomor, perihal, instansi…' : 'nomor, perihal, tujuan…'}`}
                        prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                        allowClear value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <Tooltip title={
                        !selectedUnitId || selectedUnitId === 'all'
                            ? 'Pilih unit spesifik terlebih dahulu untuk menambah surat.'
                            : editingKey ? 'Selesaikan edit baris ini dulu.' : ''
                    }>
                        <button className="ps-page__add-btn" type="button" onClick={startNew}
                            disabled={!!editingKey || !selectedUnitId || selectedUnitId === 'all'}
                            style={(!!editingKey || !selectedUnitId || selectedUnitId === 'all') ? { opacity: .5, cursor: 'not-allowed' } : {}}>
                            <PlusOutlined />
                            Tambah {isMasuk ? 'Surat Masuk' : 'Surat Keluar'}
                        </button>
                    </Tooltip>
                    <button
                        className="ps-page__export-btn"
                        type="button"
                        onClick={handleExportPdf}
                        disabled={exporting || loading}
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                        {exporting ? <Spin size="small" /> : <FilePdfOutlined />}
                        Cetak Laporan PDF
                    </button>
                </div>
            </div>

            {/* TABLE */}
            <div className="ps-page__table-card">
                {editingKey === '__new__' && (
                    <div className="ps-inline-hint">
                        ✏️ Isi kolom pada baris baru di bawah, lalu klik <strong>✓</strong> untuk menyimpan.
                        {selectedUnit && <span style={{ marginLeft: 8, opacity: .7 }}>Unit: {selectedUnit.nama}</span>}
                    </div>
                )}
                <Table
                    dataSource={tableData}
                    columns={isMasuk ? colsMasuk : colsKeluar}
                    rowKey="key"
                    loading={loading}
                    size="small"
                    scroll={{ x: isMasuk ? 960 : 1140, y: 'calc(100vh - 300px)' }}
                    rowClassName={(record) => isEditing(record.key) ? 'ps-row-editing' : ''}
                    pagination={{
                        current: pagination[activeTab]?.current ?? 1,
                        pageSize: pagination[activeTab]?.pageSize ?? 25,
                        showTotal: (n) => `${n} surat`,
                        showSizeChanger: false,
                        position: ['bottomRight'],
                        onChange: (page, size) => {
                            setPagination((prev) => ({
                                ...prev,
                                [activeTab]: { current: page, pageSize: size },
                            }));
                        },
                    }}
                    locale={{
                        emptyText: (
                            <div className="ps-empty">
                                <div className="ps-empty-icon">{isMasuk ? '📥' : '📤'}</div>
                                <h3>Belum ada surat {isMasuk ? 'masuk' : 'keluar'}{selectedUnit ? ` untuk ${selectedUnit.nama}` : ''}</h3>
                                <p>Klik tombol <strong>Tambah</strong> untuk mulai mencatat.</p>
                                <button className="ps-page__add-btn" type="button" onClick={startNew}
                                    disabled={!!editingKey || !selectedUnitId || selectedUnitId === 'all'}
                                    style={(!!editingKey || !selectedUnitId || selectedUnitId === 'all') ? { opacity: .5, cursor: 'not-allowed' } : {}}>
                                    <PlusOutlined /> Tambah Sekarang
                                </button>
                            </div>
                        ),
                    }}
                />
            </div>
        </div>
    );
}

export default function KearsipanPencatatanSurat() {
    return (
        <AntdApp>
            <PencatatanSuratInner />
        </AntdApp>
    );
}
