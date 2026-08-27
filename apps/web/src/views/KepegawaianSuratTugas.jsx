import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
    Table,
    Card,
    Button,
    Tag,
    Space,
    Input,
    Modal,
    Dropdown,
    Form,
    Select,
    DatePicker,
    Radio,
    message,
    Typography,
    Tooltip,
    Row,
    Col,
    Segmented,
    Empty,
    Drawer,
    List,
    AutoComplete,
    Checkbox,
    Popover,
} from "antd";
import {
    SearchOutlined,
    EditOutlined,
    DeleteOutlined,
    CheckCircleOutlined,
    FileProtectOutlined,
    ReloadOutlined,
    TeamOutlined,
    FileDoneOutlined,
    DownloadOutlined,
    SendOutlined,
    CalendarOutlined,
    FilterOutlined,
    MoreOutlined,
    HistoryOutlined,
    ClockCircleOutlined,
    FileTextOutlined,
    InboxOutlined,
    BellOutlined,
    UndoOutlined,
    CloseCircleFilled,
    DownOutlined,
    EnvironmentOutlined,
} from "@ant-design/icons";
import { useAuth } from "../hooks/useAuth.js";
import dayjs from "dayjs";

const { Text, Title } = Typography;

const CITY_OPTIONS = [
    { label: "Palopo", value: "Palopo" },
    { label: "Kab. Luwu", value: "Kab. Luwu" },
    { label: "Kab. Luwu Utara", value: "Kab. Luwu Utara" },
    { label: "Kab. Luwu Timur", value: "Kab. Luwu Timur" },
    { label: "Kab. Toraja Utara", value: "Kab. Toraja Utara" },
    { label: "Kab. Tana Toraja", value: "Kab. Tana Toraja" },
    { label: "Kab. Enrekang", value: "Kab. Enrekang" },
    { label: "Kota Lain", value: "Kota Lain" },
];
const ALL_CITIES = CITY_OPTIONS.map((c) => c.value);
// const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

const STATUS_META = {
    draft: { label: "Draft", color: "orange" },
    invalid_tte: { label: "Invalid TTE", color: "red" },
    lengkap: { label: "Lengkap", color: "green" },
};

const dateLabel = (value) => {
    if (!value) return "-";
    const d = dayjs(value);
    return d.isValid() ? d.format("DD/MM/YYYY") : "-";
};

const inclusiveDays = (start, end) => {
    if (!start || !end) return 0;
    const startDate = dayjs(start);
    const endDate = dayjs(end);
    if (!startDate.isValid() || !endDate.isValid()) return 0;
    return Math.max(endDate.diff(startDate, "day") + 1, 0);
};

const templateName = (pathValue) => {
    if (!pathValue) return "-";
    const parts = String(pathValue).split("/");
    return parts[parts.length - 1] || pathValue;
};

const KepegawaianSuratTugas = () => {
    const { token, apiFetch } = useAuth();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 20,
        total: 0,
    });
    const [searchInput, setSearchInput] = useState("");
    const [appliedSearch, setAppliedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [cityFilter, setCityFilter] = useState(ALL_CITIES);
    const [cityPopoverOpen, setCityPopoverOpen] = useState(false);
    const [dateRange, setDateRange] = useState(null);
    const [datePopoverOpen, setDatePopoverOpen] = useState(false);

    const [modalOpen, setModalOpen] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [form] = Form.useForm();

    const [employees, setEmployees] = useState([]);
    const [templateOptions, setTemplateOptions] = useState([]);
    const [resendLoadingId, setResendLoadingId] = useState(null);
    const [resendLengkapLoadingId, setResendLengkapLoadingId] = useState(null);
    const [resetLoadingId, setResetLoadingId] = useState(null);

    // Document cache drawer state
    const [docsDrawerOpen, setDocsDrawerOpen] = useState(false);
    const [docsDrawerRecord, setDocsDrawerRecord] = useState(null);
    const [cachedDocs, setCachedDocs] = useState([]);
    const [docsLoading, setDocsLoading] = useState(false);
    const [docDownloadingId, setDocDownloadingId] = useState(null);
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState("");

    // MAK Suggestions
    const [makSuggestions, setMakSuggestions] = useState([]);
    const [makLoading, setMakLoading] = useState(false);
    const makDebounceRef = useRef(null);

    const fetchMakSuggestions = async (search = "") => {
        setMakLoading(true);
        try {
            const res = await apiFetch(`/surat-tugas/mak-suggestions?q=${encodeURIComponent(search)}`);
            if (!res.ok) return;
            const data = await res.json();
            setMakSuggestions((data || []).map(item => ({ value: item.mak, label: item.mak })));
        } catch (e) {
            console.error("Failed to fetch MAK suggestions", e);
        } finally {
            setMakLoading(false);
        }
    };

    const handleMakSearch = (value) => {
        if (makDebounceRef.current) clearTimeout(makDebounceRef.current);
        makDebounceRef.current = setTimeout(() => {
            fetchMakSuggestions(value);
        }, 300);
    };

    const headers = { Authorization: `Bearer ${token}` };

    const fetchData = useCallback(
        async (page = 1) => {
            setLoading(true);
            try {
                const params = new URLSearchParams({ page: String(page) });
                if (appliedSearch) params.set("search", appliedSearch);
                if (statusFilter) params.set("status", statusFilter);
                if (cityFilter.length > 0 && cityFilter.length < ALL_CITIES.length) {
                    params.set("kota", cityFilter.join(","));
                } else if (cityFilter.length === 0) {
                    params.set("kota", "__NONE__");
                }
                if (dateRange && dateRange[0] && dateRange[1]) {
                    params.set("start_date", dateRange[0].format("YYYY-MM-DD"));
                    params.set("end_date", dateRange[1].format("YYYY-MM-DD"));
                }

                const res = await apiFetch(`/surat-tugas?${params}`);
                const json = await res.json();

                setData(json.data ?? []);
                setPagination({
                    current: json.current_page ?? page,
                    pageSize: json.per_page ?? 20,
                    total: json.total ?? 0,
                });
            } catch {
                message.error("Gagal memuat data surat tugas.");
            } finally {
                setLoading(false);
            }
        },
        [appliedSearch, statusFilter, cityFilter, dateRange, token],
    );

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setAppliedSearch(searchInput.trim());
        }, 350);
        return () => window.clearTimeout(timer);
    }, [searchInput]);

    useEffect(() => {
        fetchData(1);
    }, [fetchData]);

    useEffect(() => {
        const loadPenandatanganOptions = async () => {
            try {
                let page = 1;
                let lastPage = 1;
                const allEmployees = [];

                do {
                    const res = await apiFetch(`/employees?page=${page}&pageSize=200`);
                    const json = await res.json();
                    const rows = Array.isArray(json?.data) ? json.data : [];
                    allEmployees.push(...rows);
                    lastPage = Number(json?.meta?.last_page || 1);
                    page += 1;
                } while (page <= lastPage);

                const options = allEmployees
                    .sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")))
                    .map((item) => ({
                        value: item.id,
                        label: `${item.name}${item.nip ? ` (${item.nip})` : ""}${item.position ? ` - ${item.position}` : ""}`,
                    }));

                setEmployees(options);
            } catch {
                message.error("Gagal memuat daftar penandatangan.");
            }
        };

        const loadTemplates = async () => {
            try {
                const res = await apiFetch("/surat-tugas/templates");
                const json = await res.json();
                if (!Array.isArray(json)) return;
                const options = [...json].sort((a, b) =>
                    String(a?.label || "").localeCompare(String(b?.label || "")),
                );
                setTemplateOptions(options);
            } catch {
                message.error("Gagal memuat daftar template.");
            }
        };

        loadPenandatanganOptions();
        loadTemplates();
    }, [token]);

    const triggerBlobDownload = (blob, filename) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    const handleDownload = (record) => {
        if (!record.template_file) {
            message.warning("Pilih template surat tugas terlebih dahulu.");
            return;
        }

        const hide = message.loading("Menyiapkan dokumen...", 0);
        apiFetch(`/surat-tugas/${record.id}/download`)
            .then(async (res) => {
                hide();
                if (!res.ok) {
                    let errorMessage = "Gagal mengunduh dokumen.";
                    try {
                        const body = await res.json();
                        errorMessage =
                            body?.error || body?.message || errorMessage;
                    } catch {
                        // no-op
                    }
                    throw new Error(errorMessage);
                }

                const disposition = res.headers.get("Content-Disposition");
                let filename = `Surat_Tugas_${record.nomor_st ? record.nomor_st.replace(/[^a-z0-9]/gi, "_") : "Draft"}.docx`;
                if (disposition && disposition.indexOf("attachment") !== -1) {
                    const filenameRegex =
                        /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                    const matches = filenameRegex.exec(disposition);
                    if (matches && matches[1]) {
                        filename = matches[1].replace(/['"]/g, "");
                    }
                }

                return res.blob().then((blob) => ({ blob, filename }));
            })
            .then(({ blob, filename }) => {
                triggerBlobDownload(blob, filename);
                // Refresh cached documents list if drawer is open for this record
                if (docsDrawerRecord?.id === record.id) {
                    fetchDocuments(record.id);
                }
            })
            .catch((err) => {
                hide();
                message.error(err.message);
            });
    };

    // ── Cached Documents Drawer handlers ──
    const fetchDocuments = async (stId) => {
        setDocsLoading(true);
        try {
            const res = await apiFetch(`/surat-tugas/${stId}/documents`);
            if (!res.ok) throw new Error();
            const json = await res.json();
            setCachedDocs(Array.isArray(json) ? json : []);
        } catch {
            setCachedDocs([]);
        } finally {
            setDocsLoading(false);
        }
    };

    const openDocumentsDrawer = (record) => {
        setDocsDrawerRecord(record);
        setDocsDrawerOpen(true);
        fetchDocuments(record.id);
    };

    const handleDownloadCached = async (stId, docId, filename) => {
        setDocDownloadingId(docId);
        try {
            const res = await apiFetch(`/surat-tugas/${stId}/documents/${docId}/download`);
            if (!res.ok) {
                let errorMessage = "Gagal mengunduh dokumen.";
                try {
                    const body = await res.json();
                    errorMessage = body?.error || body?.message || errorMessage;
                } catch { /* no-op */ }
                throw new Error(errorMessage);
            }
            const blob = await res.blob();
            triggerBlobDownload(blob, filename);
        } catch (err) {
            message.error(err.message);
        } finally {
            setDocDownloadingId(null);
        }
    };

    const handleDeleteDocument = async (stId, docId) => {
        try {
            const res = await apiFetch(`/surat-tugas/${stId}/documents/${docId}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Gagal menghapus dokumen.");
            message.success("Dokumen berhasil dihapus.");
            fetchDocuments(stId);
        } catch (err) {
            message.error(err.message);
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes || bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    };

    const handleResendToSiamparan = async (record) => {
        setResendLoadingId(record.id);
        try {
            const res = await apiFetch(`/surat-tugas/${record.id}/send-siamparan`, { method: "POST" });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(body?.detail || body?.message || "Gagal mengirim ke SIAMPARAN.");
            }
            if (body?.already_exists) {
                message.info(body?.message || "Data sudah ada di SIAMPARAN.");
            } else {
                message.success(body?.message || "Data berhasil dikirim ke SIAMPARAN.");
            }
        } catch (err) {
            message.error(err.message);
        } finally {
            setResendLoadingId(null);
        }
    };

    const handleResendLengkapNotification = async (record) => {
        setResendLengkapLoadingId(record.id);
        try {
            const res = await apiFetch(`/surat-tugas/${record.id}/resend-lengkap`, { method: "POST" });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(body?.message || "Gagal mengirim notifikasi.");
            }
            message.success(body?.message || "Notifikasi berhasil dikirim ulang.");
        } catch (err) {
            message.error(err.message);
        } finally {
            setResendLengkapLoadingId(null);
        }
    };

    const handleResetToDraft = async (record) => {
        setResetLoadingId(record.id);
        try {
            const res = await apiFetch(`/surat-tugas/${record.id}/reset-to-draft`, { method: "POST" });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(body?.message || "Gagal merubah status.");
            }
            message.success(body?.message || "Status berhasil dikembalikan ke Draft.");
            fetchData(pagination.current);
        } catch (err) {
            message.error(err.message);
        } finally {
            setResetLoadingId(null);
        }
    };

    const confirmDelete = (record) => {
        Modal.confirm({
            title: "Hapus surat tugas ini?",
            content: record?.nomor_st
                ? `Nomor: ${record.nomor_st}`
                : "Data yang dihapus tidak dapat dikembalikan.",
            okText: "Hapus",
            cancelText: "Batal",
            okButtonProps: { danger: true },
            onOk: () => handleDelete(record.id),
        });
    };

    const buildActionItems = (record) => {
        const items = [
            {
                key: "edit",
                label: record.status === "draft" ? "Lengkapi Data ST" : "Edit Data ST",
                icon: <EditOutlined style={{ color: "#1e293b" }} />,
                onClick: () => openCompleteModal(record),
            },
        ];

        items.push({
            key: "preview_protokol",
            label: "Pratinjau Protokol Kerja",
            icon: <FileTextOutlined style={{ color: "#1e293b" }} />,
            onClick: () => openProtokolPreview(record),
        });

        if (record.status === "invalid_tte") {
            items.push({
                key: "reset_draft",
                label: "Kembalikan ke Draft",
                icon: <UndoOutlined style={{ color: "#1e293b" }} />,
                disabled: resetLoadingId === record.id,
                onClick: () => handleResetToDraft(record),
            });
        }

        if (record.status === "lengkap") {
            items.push({
                key: "resend_lengkap",
                label: "Kirim Notifikasi Lengkap",
                icon: <BellOutlined style={{ color: "#1e293b" }} />,
                disabled: resendLengkapLoadingId === record.id,
                onClick: () => handleResendLengkapNotification(record),
            });
            items.push({
                key: "download",
                label: "Generate & Download Dokumen",
                icon: <DownloadOutlined style={{ color: "#1e293b" }} />,
                onClick: () => handleDownload(record),
            });
            items.push({
                key: "documents",
                label: "Riwayat Dokumen",
                icon: <HistoryOutlined style={{ color: "#1e293b" }} />,
                onClick: () => openDocumentsDrawer(record),
            });
            items.push({
                key: "send",
                label: "Kirim ke SIAMPARAN",
                icon: <SendOutlined style={{ color: "#1e293b" }} />,
                disabled: resendLoadingId === record.id,
                onClick: () => handleResendToSiamparan(record),
            });
        }

        items.push({ type: "divider" });
        items.push({
            key: "delete",
            label: <span style={{ color: "#ef4444" }}>Hapus Surat Tugas</span>,
            icon: <DeleteOutlined style={{ color: "#ef4444" }} />,
            onClick: () => confirmDelete(record),
        });

        return items;
    };

    const openProtokolPreview = (record) => {
        setSelectedRecord(record);
        const baseUrlRaw = import.meta.env.VITE_API_URL || "https://siptu.bpompalopo.com/core_api/api";
        const baseUrl = baseUrlRaw.replace(/\/+$/, "");
        // URL is intentionally using /public/ endpoint as it handles the PDF generation and with_qr parameter
        setPreviewUrl(`${baseUrl}/public/surat-tugas/${record.id}/protokol-kerja?with_qr=1&token=${record.signature_token || ""}&t=${Date.now()}`);
        setPreviewModalOpen(true);
    };

    const openCompleteModal = (record) => {
        setSelectedRecord(record);
        form.setFieldsValue({
            nomor_st: record.nomor_st || "",
            tanggal_st: record.tanggal_st ? dayjs(record.tanggal_st) : null,
            penandatangan_id: record.penandatangan_id || undefined,
            status_jabatan: record.status_jabatan || "tetap",
            template_file: record.template_file || undefined,
            mak: record.mak || "",
        });
        setModalOpen(true);
    };

    const handleComplete = async () => {
        try {
            const values = await form.validateFields();
            setModalLoading(true);

            const payload = {
                ...values,
                tanggal_st: values.tanggal_st?.format("YYYY-MM-DD"),
            };

            const res = await apiFetch(`/surat-tugas/${selectedRecord.id}/complete`, {
                method: "PUT",
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(
                    err.errors
                        ? Object.values(err.errors).flat().join(", ")
                        : "Gagal menyimpan data surat tugas.",
                );
            }

            message.success("Data surat tugas berhasil disimpan.");
            setModalOpen(false);
            fetchData(pagination.current);
        } catch (err) {
            message.error(err.message);
        } finally {
            setModalLoading(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await apiFetch(`/surat-tugas/${id}`, { method: "DELETE" });
            message.success("Surat tugas berhasil dihapus.");
            fetchData(pagination.current);
        } catch {
            message.error("Gagal menghapus surat tugas.");
        }
    };

    const handleResetFilter = () => {
        setSearchInput("");
        setStatusFilter("");
        setCityFilter(ALL_CITIES);
        setDateRange(null);
    };

    const pageSummary = useMemo(() => {
        return {
            total: pagination.total,
            showing: data.length,
        };
    }, [data, pagination.total]);

    const renderEmployeeTooltipContent = (employeesList, externalList = []) => (
        <Space direction="vertical" size={2}>
            {employeesList.map((employee) => (
                <div key={employee.id}>
                    <Text style={{ color: "#fff", fontSize: 12, display: "block" }}>
                        {employee.name || "-"}
                    </Text>
                    {employee.nip ? (
                        <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 11 }}>
                            {employee.nip}
                        </Text>
                    ) : null}
                </div>
            ))}
            {externalList.map((ext, idx) => (
                <div key={`ext-${idx}`}>
                    <Text style={{ color: "#fff", fontSize: 12, display: "block" }}>
                        {ext.name || "-"} <Tag color="gold" style={{ fontSize: 9, marginLeft: 4 }}>LUAR</Tag>
                    </Text>
                    {ext.nip ? (
                        <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 11 }}>
                            {ext.nip}
                        </Text>
                    ) : null}
                </div>
            ))}
        </Space>
    );

    const columns = [
        {
            title: "No",
            key: "no",
            width: 60,
            align: "center",
            render: (_, __, idx) =>
                (pagination.current - 1) * pagination.pageSize + idx + 1,
        },
        {
            title: "Pegawai",
            key: "employees",
            width: 240,
            render: (_, record) => {
                const employeesList = Array.isArray(record?.employees) ? record.employees : [];
                const externalList = Array.isArray(record?.external_participants) ? record.external_participants : [];
                const totalCount = employeesList.length + externalList.length;
                
                if (totalCount === 0) return "-";

                const firstPerson = employeesList.length ? employeesList[0] : externalList[0];
                const isFirstExternal = !employeesList.length;

                return (
                    <Space direction="vertical" size={1} style={{ width: "100%", maxWidth: 220 }}>
                        <Tooltip title={renderEmployeeTooltipContent(employeesList, externalList)} placement="topLeft">
                            <Text strong ellipsis style={{ maxWidth: 220, display: "block" }}>
                                {firstPerson?.name || "-"} 
                                {isFirstExternal && <Tag color="gold" style={{ fontSize: 9, marginLeft: 4 }}>LUAR</Tag>}
                            </Text>
                        </Tooltip>
                        <Text
                            type="secondary"
                            ellipsis
                            style={{ maxWidth: 220, display: "block", fontSize: 12 }}
                        >
                            {firstPerson?.nip || "-"}
                        </Text>
                        {totalCount > 1 ? (
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                +{totalCount - 1} orang lainnya
                            </Text>
                        ) : null}
                    </Space>
                );
            },
        },
        {
            title: "Periode Tugas",
            key: "periode",
            width: 220,
            render: (_, record) => {
                const dayCount = inclusiveDays(
                    record.tanggal_mulai,
                    record.tanggal_selesai,
                );
                return (
                    <Space direction="vertical" size={0}>
                        <Text>
                            {dateLabel(record.tanggal_mulai)} -{" "}
                            {dateLabel(record.tanggal_selesai)}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {dayCount > 0 ? `${dayCount} hari` : "-"}
                        </Text>
                    </Space>
                );
            },
        },
        {
            title: "Nomor ST",
            dataIndex: "nomor_st",
            width: 180,
            render: (value) =>
                value ? <Text strong>{value}</Text> : <Text type="secondary">Belum diisi</Text>,
        },
        {
            title: "KODE AKUN",
            dataIndex: "mak",
            width: 140,
            render: (value) => value || "-",
        },
        {
            title: "Status",
            dataIndex: "status",
            width: 120,
            align: "center",
            render: (value) => {
                const meta = STATUS_META[value] || {
                    label: value || "-",
                    color: "default",
                };
                return (
                    <Tag color={meta.color} icon={value === "lengkap" ? <CheckCircleOutlined /> : null}>
                        {meta.label}
                    </Tag>
                );
            },
        },
        {
            title: "Aksi",
            key: "action",
            width: 70,
            fixed: "right",
            align: "center",
            render: (_, record) => (
                <Dropdown
                    placement="bottomRight"
                    trigger={["click"]}
                    menu={{ items: buildActionItems(record) }}
                >
                    <Button type="text" shape="circle" icon={<MoreOutlined style={{ color: "#1e293b", fontSize: 16 }} />} />
                </Dropdown>
            ),
        },
    ];

    return (
        <div className="module-section">
            <div className="module-toolbar" style={{ marginBottom: 16 }}>
                <div>
                    <Title level={4} className="module-title">Kepegawaian — Surat Tugas</Title>
                    <span className="module-subtitle">Kelola draft, lengkapi data penandatangan, dan generate dokumen final.</span>
                </div>
            </div>

            <Space direction="vertical" size={14} style={{ width: "100%" }}>
                <Card
                    variant="borderless"
                    style={{ borderRadius: 8 }}
                    styles={{ body: { padding: "14px 16px" } }}
                >
                    <Row gutter={[10, 10]} align="middle">
                        <Col xs={24} sm={12} md={6} lg={5}>
                            <Input
                                placeholder="Cari pegawai, nomor ST, kode akun..."
                                prefix={<SearchOutlined />}
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                allowClear
                            />
                        </Col>
                        <Col xs={24} sm={12} md={5} lg={4}>
                            <Popover
                                trigger="click"
                                open={datePopoverOpen}
                                onOpenChange={setDatePopoverOpen}
                                placement="bottomLeft"
                                content={
                                    <Space direction="vertical" size={10} style={{ padding: 4 }}>
                                        <Text strong style={{ fontSize: 12 }}>Pilih Range Tanggal Penugasan</Text>
                                        <DatePicker.RangePicker
                                            format="DD/MM/YYYY"
                                            value={dateRange}
                                            onChange={(val) => setDateRange(val)}
                                            allowClear
                                        />
                                        <Space style={{ justifyContent: "flex-end", width: "100%" }}>
                                            <Button
                                                size="small"
                                                onClick={() => {
                                                    setDateRange(null);
                                                    setDatePopoverOpen(false);
                                                }}
                                            >
                                                Clear
                                            </Button>
                                            <Button
                                                size="small"
                                                type="primary"
                                                onClick={() => setDatePopoverOpen(false)}
                                            >
                                                Terapkan
                                            </Button>
                                        </Space>
                                    </Space>
                                }
                            >
                                <Button icon={<CalendarOutlined />} style={{ width: "100%" }}>
                                    {dateRange && dateRange[0] && dateRange[1]
                                        ? `${dateRange[0].format("DD/MM/YY")} - ${dateRange[1].format("DD/MM/YY")}`
                                        : "Range Tanggal"}
                                </Button>
                            </Popover>
                        </Col>
                        <Col xs={24} sm={12} md={4} lg={3}>
                            <Dropdown
                                menu={{
                                    items: [
                                        { key: "", label: "Semua Status", onClick: () => setStatusFilter("") },
                                        { key: "draft", label: "Draft", onClick: () => setStatusFilter("draft") },
                                        { key: "lengkap", label: "Lengkap", onClick: () => setStatusFilter("lengkap") },
                                    ],
                                    selectedKeys: [statusFilter],
                                }}
                                trigger={["click"]}
                            >
                                <Button style={{ width: "100%" }}>
                                    {statusFilter === "draft"
                                        ? "Status: Draft"
                                        : statusFilter === "lengkap"
                                        ? "Status: Lengkap"
                                        : "Status: Semua"}
                                    <DownOutlined style={{ fontSize: 10, marginLeft: 4 }} />
                                </Button>
                            </Dropdown>
                        </Col>
                        <Col xs={24} sm={12} md={5} lg={4}>
                            <Popover
                                trigger="click"
                                open={cityPopoverOpen}
                                onOpenChange={setCityPopoverOpen}
                                placement="bottomLeft"
                                content={
                                    <div style={{ width: 220, padding: 4 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, paddingBottom: 6, borderBottom: "1px solid #f1f5f9" }}>
                                            <Text strong style={{ fontSize: 12 }}>Filter Kota Penugasan</Text>
                                            <Space size={4}>
                                                <Button
                                                    type="link"
                                                    size="small"
                                                    style={{ padding: 0, fontSize: 11 }}
                                                    onClick={() => setCityFilter(ALL_CITIES)}
                                                >
                                                    Pilih Semua
                                                </Button>
                                                <Text type="secondary" style={{ fontSize: 11 }}>|</Text>
                                                <Button
                                                    type="link"
                                                    size="small"
                                                    style={{ padding: 0, fontSize: 11 }}
                                                    onClick={() => setCityFilter([])}
                                                >
                                                    Reset
                                                </Button>
                                            </Space>
                                        </div>
                                        <Space direction="vertical" size={6} style={{ width: "100%" }}>
                                            {CITY_OPTIONS.map((opt) => {
                                                const isChecked = cityFilter.includes(opt.value);
                                                return (
                                                    <Checkbox
                                                        key={opt.value}
                                                        checked={isChecked}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setCityFilter((prev) => [...prev, opt.value]);
                                                            } else {
                                                                setCityFilter((prev) => prev.filter((v) => v !== opt.value));
                                                            }
                                                        }}
                                                    >
                                                        <span style={{ fontSize: 12 }}>{opt.label}</span>
                                                    </Checkbox>
                                                );
                                            })}
                                        </Space>
                                    </div>
                                }
                            >
                                <Button icon={<EnvironmentOutlined />} style={{ width: "100%" }}>
                                    {cityFilter.length === ALL_CITIES.length
                                        ? "Kota: Semua"
                                        : cityFilter.length === 0
                                        ? "Kota: (0)"
                                        : `Kota (${cityFilter.length})`}
                                    <DownOutlined style={{ fontSize: 10, marginLeft: 4 }} />
                                </Button>
                            </Popover>
                        </Col>
                        <Col xs={24} sm={24} md={4} lg={6} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                            <Button
                                icon={<FilterOutlined />}
                                onClick={handleResetFilter}
                            >
                                Reset
                            </Button>
                            <Tooltip title="Segarkan">
                                <Button
                                    icon={<ReloadOutlined />}
                                    onClick={() => fetchData(1)}
                                />
                            </Tooltip>
                            <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                                {pageSummary.showing} data
                            </Text>
                        </Col>
                    </Row>
                </Card>

                <Card
                    variant="borderless"
                    style={{ borderRadius: 8 }}
                    styles={{ body: { padding: "8px 8px 0 8px" } }}
                >
                    <Table
                        dataSource={data}
                        columns={columns}
                        rowKey="id"
                        size="middle"
                        loading={loading}
                        sticky
                        scroll={{ x: 1200 }}
                        expandable={{
                            expandedRowRender: (record) => (
                                <Row gutter={[12, 8]}>
                                    <Col xs={24} md={12}>
                                        <Text type="secondary">Daftar Pegawai</Text>
                                        <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid #f1f5f9", padding: 8, borderRadius: 8 }}>
                                            {(record?.employees || []).map((employee) => (
                                                <div key={employee.id} style={{ marginBottom: 4 }}>
                                                    <Text strong>{employee.name || "-"}</Text>
                                                    {employee.nip && <Text type="secondary" style={{ marginLeft: 6, fontSize: 11 }}>{employee.nip}</Text>}
                                                </div>
                                            ))}
                                            {(record?.external_participants || []).map((ext, idx) => (
                                                <div key={`ext-detail-${idx}`} style={{ marginBottom: 4 }}>
                                                    <Text strong>{ext.name || "-"}</Text>
                                                    <Tag color="gold" style={{ fontSize: 9, marginLeft: 4 }}>LUAR DATABASE</Tag>
                                                    {ext.nip && <Text type="secondary" style={{ marginLeft: 6, fontSize: 11 }}>{ext.nip}</Text>}
                                                    {ext.jabatan && <div style={{ fontSize: 11, color: "#94a3b8" }}>{ext.jabatan}</div>}
                                                </div>
                                            ))}
                                            {!(record?.employees?.length) && !(record?.external_participants?.length) && "-"}
                                        </div>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Text type="secondary">Penginput Data</Text>
                                        <div>
                                            {record?.creator?.name ? (
                                                <Text strong>{record.creator.name}</Text>
                                            ) : (
                                                <Text type="secondary" italic>Sistem / Publik</Text>
                                            )}
                                        </div>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Text type="secondary">Deskripsi Tugas</Text>
                                        <div>{record.deskripsi_tugas || "-"}</div>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Text type="secondary">Lokasi Tugas</Text>
                                        <div>{record.lokasi_tugas || "-"}</div>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Text type="secondary">Sarana</Text>
                                        <div>{record.sarana_nama || "-"}</div>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Text type="secondary">Template</Text>
                                        <div>{templateName(record.template_file)}</div>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Text type="secondary">Tanggal Surat Tugas</Text>
                                        <div>{dateLabel(record.tanggal_st)}</div>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Text type="secondary">Penandatangan</Text>
                                        <div>{record?.penandatangan?.name || "-"}</div>
                                    </Col>
                                </Row>
                            ),
                        }}
                        tableLayout="fixed"
                        locale={{
                            emptyText: (
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description="Belum ada data surat tugas."
                                />
                            ),
                        }}
                        pagination={{
                            ...pagination,
                            showSizeChanger: false,
                            showQuickJumper: true,
                            showTotal: (total) => `Total ${total} data`,
                            onChange: (page) => fetchData(page),
                        }}
                    />
                </Card>
            </Space>

            <Modal
                title={
                    <Space>
                        <FileProtectOutlined style={{ color: "#1d4ed8" }} />
                        <span>
                            {selectedRecord?.status === "draft"
                                ? "Lengkapi Data Surat Tugas"
                                : "Edit Data Surat Tugas"}
                        </span>
                    </Space>
                }
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={handleComplete}
                confirmLoading={modalLoading}
                okText="Simpan"
                cancelText="Batal"
                width={640}
                destroyOnClose
            >
                <Form form={form} layout="vertical" requiredMark={false} style={{ marginTop: 16 }}>
                    <Row gutter={12}>
                        <Col xs={24} md={14}>
                            <Form.Item
                                name="nomor_st"
                                label="Nomor Surat Tugas"
                                rules={[{ required: true, message: "Nomor ST wajib diisi." }]}
                            >
                                <Input placeholder="Contoh: ST-001/TU/2026" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={10}>
                            <Form.Item
                                name="tanggal_st"
                                label="Tanggal Surat Tugas"
                                rules={[{ required: true, message: "Pilih tanggal surat tugas." }]}
                            >
                                <DatePicker
                                    format="DD/MM/YYYY"
                                    style={{ width: "100%" }}
                                    placeholder="Pilih tanggal"
                                    suffixIcon={<CalendarOutlined />}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        name="penandatangan_id"
                        label="Penandatangan"
                        rules={[{ required: true, message: "Pilih penandatangan." }]}
                    >
                        <Select
                            placeholder="Cari nama / NIP pegawai"
                            options={employees}
                            showSearch
                            optionFilterProp="label"
                            filterOption={(input, option) =>
                                String(option?.label || "")
                                    .toLowerCase()
                                    .includes(input.toLowerCase())
                            }
                        />
                    </Form.Item>

                    <Form.Item
                        name="status_jabatan"
                        label="Status Jabatan Penandatangan"
                        rules={[{ required: true, message: "Pilih status jabatan." }]}
                    >
                        <Radio.Group>
                            <Radio value="tetap">Tetap</Radio>
                            <Radio value="plh">PLH</Radio>
                        </Radio.Group>
                    </Form.Item>

                    <Form.Item name="mak" label="Kode Akun (Mata Anggaran)">
                        <AutoComplete
                            options={makSuggestions}
                            onSearch={handleMakSearch}
                            onFocus={() => { if (makSuggestions.length === 0) fetchMakSuggestions(); }}
                            placeholder="Contoh: 524111"
                        />
                    </Form.Item>

                    <Form.Item
                        name="template_file"
                        label="Template Surat Tugas"
                        tooltip="Template disimpan pada folder backend/storage/app/templates"
                    >
                        <Select
                            placeholder="Pilih template surat tugas"
                            allowClear
                            options={templateOptions}
                            showSearch
                            optionFilterProp="label"
                            filterOption={(input, option) =>
                                String(option?.label || "")
                                    .toLowerCase()
                                    .includes(input.toLowerCase())
                            }
                            notFoundContent="Belum ada template."
                        />
                    </Form.Item>

                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Setelah data lengkap dan template dipilih, Anda bisa langsung generate dokumen dari tombol Download.
                    </Text>
                </Form>
            </Modal>

            {/* ── Cached Documents Drawer ── */}
            <Drawer
                title={
                    <Space>
                        <HistoryOutlined style={{ color: "#1d4ed8" }} />
                        <span>Riwayat Dokumen</span>
                    </Space>
                }
                placement="right"
                width={480}
                open={docsDrawerOpen}
                onClose={() => { setDocsDrawerOpen(false); setDocsDrawerRecord(null); setCachedDocs([]); }}
                extra={
                    <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        size="small"
                        onClick={() => docsDrawerRecord && handleDownload(docsDrawerRecord)}
                        disabled={!docsDrawerRecord?.template_file}
                    >
                        Generate Baru
                    </Button>
                }
            >
                {docsDrawerRecord && (
                    <Space direction="vertical" size={4} style={{ width: "100%", marginBottom: 16 }}>
                        <Text strong>{docsDrawerRecord.nomor_st || "Draft"}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Dokumen yang di-generate akan tersimpan selama 3 hari.
                        </Text>
                    </Space>
                )}

                <List
                    loading={docsLoading}
                    dataSource={cachedDocs}
                    locale={{
                        emptyText: (
                            <Empty
                                image={<InboxOutlined style={{ fontSize: 48, color: "#d9d9d9" }} />}
                                description={
                                    <Space direction="vertical" size={2}>
                                        <Text type="secondary">Belum ada dokumen yang di-generate.</Text>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            Klik "Generate Baru" untuk membuat dokumen.
                                        </Text>
                                    </Space>
                                }
                            />
                        ),
                    }}
                    renderItem={(doc) => {
                        const generatedAt = doc.generated_at ? dayjs(doc.generated_at) : null;
                        const expiresAt = doc.expires_at ? dayjs(doc.expires_at) : null;
                        const now = dayjs();
                        const hoursLeft = expiresAt ? expiresAt.diff(now, "hour") : 0;

                        return (
                            <List.Item
                                style={{
                                    padding: "12px 0",
                                    borderBottom: "1px solid #f0f0f0",
                                }}
                                actions={[
                                    <Tooltip title="Download" key="dl">
                                        <Button
                                            type="primary"
                                            size="small"
                                            icon={<DownloadOutlined />}
                                            loading={docDownloadingId === doc.id}
                                            onClick={() => handleDownloadCached(docsDrawerRecord.id, doc.id, doc.filename)}
                                        />
                                    </Tooltip>,
                                    <Tooltip title="Hapus" key="del">
                                        <Button
                                            size="small"
                                            danger
                                            icon={<DeleteOutlined />}
                                            onClick={() => {
                                                Modal.confirm({
                                                    title: "Hapus dokumen ini?",
                                                    content: "Apakah Anda yakin ingin menghapus dokumen ini?",
                                                    okText: "Hapus",
                                                    cancelText: "Batal",
                                                    okButtonProps: { danger: true },
                                                    onOk: () => handleDeleteDocument(docsDrawerRecord.id, doc.id),
                                                });
                                            }}
                                        />
                                    </Tooltip>,
                                ]}
                            >
                                <List.Item.Meta
                                    avatar={
                                        <FileTextOutlined
                                            style={{
                                                fontSize: 24,
                                                color: "#1d4ed8",
                                                marginTop: 4,
                                            }}
                                        />
                                    }
                                    title={
                                        <Text
                                            ellipsis={{ tooltip: doc.filename }}
                                            style={{ maxWidth: 260, display: "block", fontSize: 13 }}
                                        >
                                            {doc.filename}
                                        </Text>
                                    }
                                    description={
                                        <Space direction="vertical" size={0}>
                                            {doc.template_used && (
                                                <Text type="secondary" style={{ fontSize: 11 }}>
                                                    Template: {doc.template_used}
                                                </Text>
                                            )}
                                            <Space size={12}>
                                                <Text type="secondary" style={{ fontSize: 11 }}>
                                                    {formatFileSize(doc.file_size)}
                                                </Text>
                                                {generatedAt && (
                                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                                        {generatedAt.format("DD/MM/YYYY HH:mm")}
                                                    </Text>
                                                )}
                                            </Space>
                                            <Text
                                                type={hoursLeft <= 24 ? "warning" : "secondary"}
                                                style={{ fontSize: 11 }}
                                            >
                                                <ClockCircleOutlined style={{ marginRight: 4 }} />
                                                {hoursLeft > 24
                                                    ? `Tersedia ${Math.ceil(hoursLeft / 24)} hari lagi`
                                                    : hoursLeft > 0
                                                        ? `Tersedia ${hoursLeft} jam lagi`
                                                        : "Segera kedaluwarsa"}
                                            </Text>
                                        </Space>
                                    }
                                />
                            </List.Item>
                        );
                    }}
                />
            </Drawer>

            <Modal
                title="Pratinjau Protokol Kerja"
                open={previewModalOpen}
                onCancel={() => setPreviewModalOpen(false)}
                footer={[
                    <Button key="close" onClick={() => setPreviewModalOpen(false)}>
                        Tutup
                    </Button>,
                    <Button 
                        key="download" 
                        type="primary" 
                        icon={<DownloadOutlined />} 
                        onClick={() => {
                            if (previewUrl) {
                                // Add download=1 parameter to force attachment
                                const downloadUrl = previewUrl.includes("?") 
                                    ? `${previewUrl}&download=1` 
                                    : `${previewUrl}?download=1`;
                                window.open(downloadUrl, "_blank");
                            }
                        }}
                        disabled={!previewUrl}
                    >
                        Unduh PDF
                    </Button>
                ]}
                width={1000}
                centered
                styles={{ body: { padding: 0, height: "80vh", overflow: "hidden" } }}
            >
                {previewUrl ? (
                    <iframe
                        src={previewUrl}
                        width="100%"
                        height="100%"
                        style={{ border: "none" }}
                        title="Protokol Kerja Preview"
                    />
                ) : (
                    <div style={{ padding: 40, textAlign: "center" }}>
                        <Empty description="Gagal memuat pratinjau." />
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default KepegawaianSuratTugas;
