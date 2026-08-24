import { useState, useEffect, useCallback, useMemo } from "react";
import {
    Table, Button, Space, Input, Modal,
    message, Row, Col, InputNumber,
    Spin, Dropdown, Switch, DatePicker, Tooltip,
    Popover, Typography, Card, Select,
} from "antd";
import {
    SearchOutlined, ReloadOutlined, SaveOutlined,
    CalendarOutlined, DollarOutlined,
    EditOutlined, DeleteOutlined, CloseOutlined,
    MoreOutlined, CheckCircleFilled, StopOutlined,
    CompassOutlined, CarOutlined, SendOutlined,
    HomeOutlined, InfoCircleOutlined, PlusOutlined,
    PrinterOutlined, FilterOutlined, DownOutlined, UserAddOutlined,
} from "@ant-design/icons";
import { useAuth } from "../hooks/useAuth.js";
import dayjs from "dayjs";
import "./KeuanganLpj.css";

const { Text } = Typography;

const LOCKED_RATE_REGIONS = [
    "luwu",
    "luwu utara",
    "toraja utara",
    "tanah toraja",
    "enrekang",
];

const getLockedRate = (lokasi) => {
    if (!lokasi) return 0;
    const lower = lokasi.toLowerCase();
    if (lower.includes("palopo")) {
        return 150000;
    }
    if (LOCKED_RATE_REGIONS.some(r => lower.includes(r))) {
        return 430000;
    }
    return 0;
};

const isLockedRegion = (lokasi) => getLockedRate(lokasi) > 0;

const isPalopo = (lokasi) => {
    if (!lokasi) return false;
    return lokasi.toLowerCase().includes("palopo");
};

/* ── Components definition ── */
const COMPONENTS = [
    { key: "uang_transport_taxi",      label: "Transport Taxi",       type: "transport_multi" },
    { key: "uang_transport_bus",       label: "Transport Bus",        type: "transport_multi" },
    { key: "uang_transport_pesawat",   label: "Transport Pesawat",    type: "transport_multi" },
    { key: "uang_transport_umum",      label: "Transport (Umum)",     type: "transport_multi" },
    { key: "uang_transport_bbm",       label: "Transport BBM",        type: "transport_multi" },
    { key: "uang_transport_lokal",     label: "Transport Lokal",      type: "transport_multi" },
    { key: "uang_transport_sewa_mobil",label: "Transport Sewa Mobil", type: "rate_days" },
    { key: "uang_harian",              label: "Uang Harian",          type: "daily" },
    { key: "uang_penginapan",          label: "Penginapan",           type: "rate_days" },
    { key: "uang_fullboard",           label: "Paket Fullboard",      type: "simple" },
    { key: "uang_harian_fullboard",    label: "Uang Harian Fullboard", type: "daily" },
];

const LPJ_STATUS = {
    null:    { label: "Belum Dibuat", dot: "belum" },
    draft:   { label: "Draft",        dot: "draft" },
    final:   { label: "LPJ Selesai",  dot: "final" },
    manual:  { label: "LPJ Manual",   dot: "manual" },
};

const fmt = (v) => (v == null ? 0 : Number(v));
const fmtRupiah = (v) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v || 0);
const dateLabel = (v) => (v ? dayjs(v).format("DD/MM/YYYY") : "-");
const inclusiveDays = (start, end) => {
    if (!start || !end) return 0;
    return Math.max(dayjs(end).diff(dayjs(start), "day") + 1, 0);
};

const getIconForComponent = (key) => {
    switch (key) {
        case "uang_transport_bus":        return <CompassOutlined />;
        case "uang_transport_taxi":       return <CarOutlined />;
        case "uang_transport_pesawat":    return <SendOutlined />;
        case "uang_transport_umum":       return <CarOutlined />;
        case "uang_transport_bbm":        return <CarOutlined />;
        case "uang_transport_sewa_mobil": return <CarOutlined />;
        case "uang_transport_lokal":      return <CarOutlined />;
        case "uang_harian":               return <DollarOutlined />;
        case "uang_penginapan":           return <HomeOutlined />;
        case "uang_fullboard":            return <HomeOutlined />;
        case "uang_harian_fullboard":     return <DollarOutlined />;
        default:                          return <DollarOutlined />;
    }
};

const getComponentTotal = (item, key) => {
    const comp = COMPONENTS.find(c => c.key === key);
    const data = item[key];
    if (!data?.checked) return 0;

    if (comp?.type === "transport_multi") {
        const items = Array.isArray(data.items) ? data.items : [];
        return items.reduce((acc, curr) => acc + fmt(curr.nominal), 0);
    }
    if (comp?.type === "departure_return") {
        return fmt(data.berangkat) + fmt(data.pulang);
    }
    if (comp?.type === "rate_days" || comp?.type === "daily") {
        return fmt(data.per_hari) * fmt(data.hari);
    }
    return fmt(data.value);
};

const calcTotal = (item) => COMPONENTS.reduce((sum, c) => sum + getComponentTotal(item, c.key), 0);

const emptyComp = (type, autoRate) => {
    if (type === "transport_multi") return { checked: false, items: [{ id: Date.now(), nominal: 0, rincian: "", keterangan: "" }] };
    if (type === "departure_return") return { checked: false, berangkat: 0, pulang: 0, keterangan: "" };
    if (type === "rate_days")        return { checked: false, per_hari: 0, hari: 0, keterangan: "" };
    if (type === "daily")            return { checked: false, per_hari: autoRate || 0, hari: 0, keterangan: "" };
    return { checked: false, value: 0, keterangan: "" };
};

export default function KeuanganLpj() {
    const { apiFetch } = useAuth();

    const [stList, setStList] = useState([]);
    const [stLoading, setStLoading] = useState(false);
    const [stPagination, setStPagination] = useState({ current: 1, pageSize: 20, total: 0 });
    const [searchInput, setSearchInput] = useState("");
    const [appliedSearch, setAppliedSearch] = useState("");
    const [filterLpjStatus, setFilterLpjStatus] = useState("ALL");
    const [dateRange, setDateRange] = useState(null);
    const [datePopoverOpen, setDatePopoverOpen] = useState(false);

    const displayedStList = useMemo(() => {
        let list = stList;
        if (filterLpjStatus !== "ALL") {
            list = list.filter((st) => {
                const status = st.lpj_status;
                if (filterLpjStatus === "SUDAN") return status === "draft" || status === "final" || status === "manual";
                if (filterLpjStatus === "BELUM") return !status;
                if (filterLpjStatus === "DRAFT") return status === "draft";
                if (filterLpjStatus === "FINAL") return status === "final";
                return true;
            });
        }
        if (dateRange && dateRange[0] && dateRange[1]) {
            const start = dateRange[0].startOf('day');
            const end = dateRange[1].endOf('day');
            list = list.filter((st) => {
                if (!st.tanggal_mulai) return false;
                const d = dayjs(st.tanggal_mulai);
                return (d.isAfter(start) || d.isSame(start)) && (d.isBefore(end) || d.isSame(end));
            });
        }
        return list;
    }, [stList, filterLpjStatus, dateRange]);

    const [selectedSt, setSelectedSt] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [isEditingMode, setIsEditingMode] = useState(false);
    const [lpjData, setLpjData] = useState(null);
    const [lpjLoading, setLpjLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [items, setItems] = useState({});
    const [lpjStatus, setLpjStatus] = useState("draft");
    const [keterangan, setKeterangan] = useState("");
    const [mak, setMak] = useState("");
    const [tanggalMulai, setTanggalMulai] = useState("");
    const [tanggalSelesai, setTanggalSelesai] = useState("");
    const [lokasiTugas, setLokasiTugas] = useState("");
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
    const [activeEmployeeKey, setActiveEmployeeKey] = useState(null);
    const [sidebarSearch, setSidebarSearch] = useState("");
    const [employees, setEmployees] = useState([]);
    const [bendaharaId, setBendaharaId] = useState(null);
    const [filterKey, setFilterKey] = useState("all");

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const res = await apiFetch("/employees?pageSize=1000");
                const json = await res.json();
                setEmployees(json.data ?? []);
            } catch (err) {
                console.error("Gagal memuat data pegawai:", err);
            }
        };
        fetchEmployees();
    }, [apiFetch]);

    useEffect(() => {
        const t = setTimeout(() => setAppliedSearch(searchInput.trim()), 350);
        return () => clearTimeout(t);
    }, [searchInput]);

    const fetchSt = useCallback(async () => {
        setStLoading(true);
        try {
            const params = new URLSearchParams({ per_page: "1000" });
            const res = await apiFetch(`/lpj?${params}`);
            const json = await res.json();
            setStList(json.data ?? []);
        } catch {
            message.error("Gagal memuat daftar surat tugas.");
        } finally {
            setStLoading(false);
        }
    }, [apiFetch]);

    useEffect(() => { fetchSt(); }, [fetchSt]);

    const handleResetFilter = () => {
        setSearchInput("");
        setAppliedSearch("");
        setFilterLpjStatus("ALL");
        setDateRange(null);
    };

    const handleAddEmployee = (empId) => {
        if (!empId) return;
        if (selectedEmployeeIds.includes(empId)) {
            message.warning("Pegawai sudah ada dalam daftar.");
            return;
        }
        const nextIds = [...selectedEmployeeIds, empId];
        setSelectedEmployeeIds(nextIds);
        const empObj = employees.find(e => e.id === empId);
        if (empObj) {
            const empKey = `emp_${empId}`;
            const autoRate = getLockedRate(lokasiTugas);
            const letter = String.fromCharCode(65 + Object.keys(items).length);
            const entry = {
                employee_id: empObj.id,
                employee_name: empObj.name,
                employee_nip: empObj.nip,
                is_external: false,
                nomor_spd: selectedSt?.nomor_st ? `${selectedSt.nomor_st}${letter}` : "",
            };
            COMPONENTS.forEach(c => { entry[c.key] = emptyComp(c.type, c.key === "uang_harian" ? autoRate : 0); });
            setItems(prev => ({ ...prev, [empKey]: entry }));
            setActiveEmployeeKey(empKey);
            message.success(`${empObj.name} ditambahkan ke LPJ.`);
        }
    };

    const handleRemoveEmployee = (empKey) => {
        const itemToRemove = items[empKey];
        if (!itemToRemove) return;

        Modal.confirm({
            title: "Hapus pegawai dari LPJ?",
            content: `Apakah Anda yakin ingin menghapus ${itemToRemove.employee_name} beserta seluruh rincian biayanya?`,
            okText: "Hapus",
            okButtonProps: { danger: true },
            cancelText: "Batal",
            onOk: () => {
                setItems(prev => {
                    const next = { ...prev };
                    delete next[empKey];
                    const remainingKeys = Object.keys(next);
                    if (activeEmployeeKey === empKey) {
                        setActiveEmployeeKey(remainingKeys.length ? remainingKeys[0] : null);
                    }
                    return next;
                });
                if (itemToRemove.employee_id) {
                    setSelectedEmployeeIds(prev => prev.filter(id => id !== itemToRemove.employee_id));
                }
                message.success(`${itemToRemove.employee_name} dihapus dari LPJ.`);
            },
        });
    };

    const parseTransportMulti = (valTotal, valBerangkat, valPulang, valKeterangan) => {
        let list = [];
        if (valKeterangan && typeof valKeterangan === 'string' && valKeterangan.trim().startsWith('[')) {
            try {
                const parsed = JSON.parse(valKeterangan);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    list = parsed.map((it, idx) => ({
                        id: Date.now() + idx + Math.random(),
                        nominal: Number(it.nominal) || 0,
                        rincian: it.rincian ?? it.label ?? (it.keterangan && !it.rincian ? it.keterangan : ''),
                        keterangan: it.keterangan && it.rincian ? it.keterangan : (it.keterangan_item || ''),
                    }));
                }
            } catch (e) {}
        }

        if (list.length === 0) {
            if (valBerangkat > 0 || valPulang > 0) {
                if (valBerangkat > 0) {
                    list.push({ id: 1, nominal: valBerangkat, rincian: "Berangkat", keterangan: "" });
                }
                if (valPulang > 0) {
                    list.push({ id: 2, nominal: valPulang, rincian: "Pulang", keterangan: "" });
                }
            } else if (valTotal > 0) {
                list.push({ id: 1, nominal: valTotal, rincian: valKeterangan || "", keterangan: "" });
            } else {
                list.push({ id: 1, nominal: 0, rincian: "", keterangan: "" });
            }
        }

        return {
            checked: valTotal != null || valBerangkat != null || valPulang != null,
            items: list,
        };
    };

    const parseItemFromDb = (item, lokasi) => {
        const autoRate = getLockedRate(lokasi);
        return {
            employee_id: item.employee_id,
            employee_name: item.employee_name,
            employee_nip: item.employee_nip,
            is_external: item.is_external,
            nomor_spd: item.nomor_spd ?? "",
            nama_hotel: item.nama_hotel ?? "",
            nomor_kamar: item.nomor_kamar ?? "",
            uang_transport_taxi: parseTransportMulti(item.uang_transport_taxi, item.uang_transport_taxi_berangkat, item.uang_transport_taxi_pulang, item.uang_transport_taxi_keterangan),
            uang_transport_bus: parseTransportMulti(item.uang_transport_bus, item.uang_transport_bus_berangkat, item.uang_transport_bus_pulang, item.uang_transport_bus_keterangan),
            uang_transport_pesawat: parseTransportMulti(item.uang_transport_pesawat, item.uang_transport_pesawat_berangkat, item.uang_transport_pesawat_pulang, item.uang_transport_pesawat_keterangan),
            uang_transport_umum: parseTransportMulti(item.uang_transport_umum, item.uang_transport_umum_berangkat, item.uang_transport_umum_pulang, item.uang_transport_umum_keterangan),
            uang_transport_bbm: parseTransportMulti(item.uang_transport_bbm, 0, 0, item.uang_transport_bbm_keterangan),
            uang_transport_lokal: parseTransportMulti(item.uang_transport_lokal, 0, 0, item.uang_transport_lokal_keterangan),
            uang_transport_sewa_mobil: {
                checked: item.uang_transport_sewa_mobil != null,
                per_hari: item.uang_transport_sewa_mobil_harian ?? 0,
                hari: item.uang_transport_sewa_mobil_hari ?? 0,
                keterangan: item.uang_transport_sewa_mobil_keterangan ?? "",
            },
            uang_harian: {
                checked: item.uang_harian != null,
                per_hari: item.uang_harian_per_hari ?? (autoRate > 0 ? autoRate : (item.uang_harian ?? 0)),
                hari: item.uang_harian_hari ?? (item.uang_harian && autoRate > 0 ? Math.round(item.uang_harian / autoRate) : 0),
                keterangan: item.uang_harian_keterangan ?? "",
            },
            uang_penginapan: {
                checked: item.uang_penginapan != null,
                per_hari: item.uang_penginapan_harian ?? 0,
                hari: item.uang_penginapan_hari ?? 0,
                keterangan: item.uang_penginapan_keterangan ?? "",
            },
            uang_fullboard: {
                checked: item.uang_fullboard != null,
                value: item.uang_fullboard ?? 0,
                keterangan: item.uang_fullboard_keterangan ?? "",
            },
            uang_harian_fullboard: {
                checked: item.uang_harian_fullboard != null,
                per_hari: item.uang_harian_fullboard_per_hari ?? 0,
                hari: item.uang_harian_fullboard_hari ?? 0,
                keterangan: item.uang_harian_fullboard_keterangan ?? "",
            },
        };
    };

    const fetchLpjDetail = useCallback(async (st, startEditing = false) => {
        setLpjLoading(true);
        setSelectedSt(st);
        setModalVisible(true);
        setIsEditingMode(startEditing);
        setItems({});
        setLpjData(null);
        setLpjStatus("draft");
        setKeterangan("");
        setMak(st.mak ?? "");
        setTanggalMulai(st.tanggal_mulai ? dayjs(st.tanggal_mulai).format("YYYY-MM-DD") : "");
        setTanggalSelesai(st.tanggal_selesai ? dayjs(st.tanggal_selesai).format("YYYY-MM-DD") : "");
        setLokasiTugas(st.lokasi_tugas ?? "");
        setSelectedEmployeeIds((st.employees ?? []).map(e => e.id));
        setBendaharaId(null);
        setFilterKey("all");
        try {
            const res = await apiFetch(`/lpj/${st.id}`);
            const json = await res.json();
            const currentSt = json.surat_tugas ?? st;
            setLpjData(json.lpj);
            setLpjStatus(json.lpj?.status ?? "draft");
            setKeterangan(json.lpj?.keterangan ?? "");
            setMak(currentSt.mak ?? st.mak ?? "");
            setTanggalMulai(currentSt.tanggal_mulai ? dayjs(currentSt.tanggal_mulai).format("YYYY-MM-DD") : (st.tanggal_mulai ? dayjs(st.tanggal_mulai).format("YYYY-MM-DD") : ""));
            setTanggalSelesai(currentSt.tanggal_selesai ? dayjs(currentSt.tanggal_selesai).format("YYYY-MM-DD") : (st.tanggal_selesai ? dayjs(st.tanggal_selesai).format("YYYY-MM-DD") : ""));
            setLokasiTugas(currentSt.lokasi_tugas ?? st.lokasi_tugas ?? "");
            setSelectedEmployeeIds((currentSt.employees ?? st.employees ?? []).map(e => e.id));
            setBendaharaId(json.lpj?.bendahara_id ?? null);
            const lokasi = currentSt.lokasi_tugas ?? "";
            if (json.lpj?.items?.length) {
                const map = {};
                json.lpj.items.forEach((item) => {
                    const key = item.employee_id ? `emp_${item.employee_id}` : `ext_${item.employee_name}`;
                    map[key] = parseItemFromDb(item, lokasi);
                });
                setItems(map);
                const firstKey = Object.keys(map)[0];
                setActiveEmployeeKey(firstKey || null);
            } else {
                initItemsFromSt(json.surat_tugas ?? st);
            }
        } catch (err) {
            console.error("LPJ Fetch Error:", err);
            message.error("Gagal memuat data LPJ: " + err.message);
        } finally {
            setLpjLoading(false);
        }
    }, [apiFetch]);

    const initItemsFromSt = (st) => {
        const lokasi = st?.lokasi_tugas ?? "";
        const autoRate = getLockedRate(lokasi);
        const map = {};
        let totalIndex = 0;
        
        (st.employees ?? []).forEach((emp) => {
            const letter = String.fromCharCode(65 + totalIndex);
            const entry = { 
                employee_id: emp.id, 
                employee_name: emp.name, 
                employee_nip: emp.nip, 
                is_external: false, 
                nomor_spd: st.nomor_st ? `${st.nomor_st}${letter}` : "" 
            };
            COMPONENTS.forEach(c => { entry[c.key] = emptyComp(c.type, c.key === "uang_harian" ? autoRate : 0); });
            map[`emp_${emp.id}`] = entry;
            totalIndex++;
        });

        (st.external_participants ?? []).forEach((ext, idx) => {
            const letter = String.fromCharCode(65 + totalIndex);
            const entry = { 
                employee_id: null, 
                employee_name: ext.name, 
                employee_nip: ext.nip ?? null, 
                is_external: true, 
                nomor_spd: st.nomor_st ? `${st.nomor_st}${letter}` : "" 
            };
            COMPONENTS.forEach(c => { entry[c.key] = emptyComp(c.type, c.key === "uang_harian" ? autoRate : 0); });
            map[`ext_${ext.name}_${idx}`] = entry;
            totalIndex++;
        });

        setItems(map);
        const firstKey = Object.keys(map)[0];
        setActiveEmployeeKey(firstKey || null);
    };

    const handlePromptEdit = () => {
        if (!isEditingMode) {
            message.info("Tekan tombol 'Edit LPJ' di atas untuk melakukan Edit / Input data.");
        }
    };

    const toggleComponent = (empKey, compKey, checked) => {
        if (!isEditingMode) {
            handlePromptEdit();
            return;
        }
        setItems((prev) => {
            const existing = prev[empKey][compKey];
            let updated;
            if (checked) {
                const rate = getLockedRate(selectedSt?.lokasi_tugas);
                if (compKey === "uang_harian" && rate > 0) {
                    updated = { ...existing, checked: true, per_hari: rate };
                } else {
                    updated = { ...existing, checked: true };
                }
            } else {
                updated = { ...existing, checked: false };
            }
            return { ...prev, [empKey]: { ...prev[empKey], [compKey]: updated } };
        });
    };

    const updateSubValue = (empKey, compKey, field, value) => {
        setItems((prev) => ({
            ...prev,
            [empKey]: {
                ...prev[empKey],
                [compKey]: { ...prev[empKey][compKey], [field]: value ?? 0 }
            }
        }));
    };

    const addTransportItem = (empKey, compKey) => {
        if (!isEditingMode) {
            handlePromptEdit();
            return;
        }
        setItems((prev) => {
            const existing = prev[empKey]?.[compKey];
            const currentItems = Array.isArray(existing?.items) ? [...existing.items] : [];
            currentItems.push({ id: Date.now() + Math.random(), nominal: 0, rincian: "", keterangan: "" });
            return {
                ...prev,
                [empKey]: {
                    ...prev[empKey],
                    [compKey]: { ...existing, items: currentItems }
                }
            };
        });
    };

    const updateTransportItem = (empKey, compKey, index, field, value) => {
        setItems((prev) => {
            const existing = prev[empKey]?.[compKey];
            const currentItems = Array.isArray(existing?.items) ? [...existing.items] : [];
            if (currentItems[index]) {
                currentItems[index] = { ...currentItems[index], [field]: value };
            }
            return {
                ...prev,
                [empKey]: {
                    ...prev[empKey],
                    [compKey]: { ...existing, items: currentItems }
                }
            };
        });
    };

    const removeTransportItem = (empKey, compKey, index) => {
        if (!isEditingMode) {
            handlePromptEdit();
            return;
        }
        setItems((prev) => {
            const existing = prev[empKey]?.[compKey];
            const currentItems = Array.isArray(existing?.items) ? [...existing.items] : [];
            if (currentItems.length > 1) {
                currentItems.splice(index, 1);
            }
            return {
                ...prev,
                [empKey]: {
                    ...prev[empKey],
                    [compKey]: { ...existing, items: currentItems }
                }
            };
        });
    };

    const updateItemProperty = (empKey, prop, value) => {
        setItems((prev) => ({
            ...prev,
            [empKey]: {
                ...prev[empKey],
                [prop]: value
            }
        }));
    };

    const handlePrintSingle = async (employee) => {
        if (!selectedSt || !lpjData) return;
        try {
            message.loading({ content: 'Menyiapkan dokumen...', key: 'lpj_print' });
            const params = new URLSearchParams();
            if (employee.employee_id) params.set("employee_id", employee.employee_id);
            else params.set("employee_name", employee.employee_name);

            const response = await apiFetch(`/lpj/${selectedSt.id}/export-pdf?${params}`, {
                method: "GET", headers: { Accept: "application/pdf" }
            });
            if (!response.ok) throw new Error("Gagal mengunduh dokumen");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Rincian_Biaya_LPJ_${employee.employee_name.replace(/\s+/g, '_')}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            message.success({ content: 'Dokumen berhasil diunduh.', key: 'lpj_print' });
        } catch (err) {
            message.error({ content: 'Gagal mencetak dokumen.', key: 'lpj_print' });
        }
    };

    const handlePrintAll = async () => {
        if (!selectedSt || !lpjData) return;
        try {
            message.loading({ content: 'Menyiapkan seluruh dokumen...', key: 'lpj_print_all' });
            const response = await apiFetch(`/lpj/${selectedSt.id}/export-pdf`, {
                method: "GET", headers: { Accept: "application/pdf" }
            });
            if (!response.ok) throw new Error("Gagal mengunduh dokumen");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const safeNomorSt = selectedSt.nomor_st ? selectedSt.nomor_st.replace(/[\/\\]/g, '_') : selectedSt.id;
            a.download = `Rincian_Biaya_LPJ_Semua_${safeNomorSt}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            message.success({ content: 'Seluruh dokumen berhasil diunduh.', key: 'lpj_print_all' });
        } catch (err) {
            message.error({ content: 'Gagal mencetak dokumen.', key: 'lpj_print_all' });
        }
    };

    const handlePrintRill = async (employee) => {
        if (!selectedSt || !lpjData) return;
        try {
            message.loading({ content: 'Menyiapkan dokumen...', key: 'lpj_print_rill' });
            const params = new URLSearchParams();
            if (employee.employee_id) params.set("employee_id", employee.employee_id);
            else params.set("employee_name", employee.employee_name);

            const response = await apiFetch(`/lpj/${selectedSt.id}/export-rill?${params}`, {
                method: "GET", headers: { Accept: "application/pdf" }
            });
            if (!response.ok) throw new Error("Gagal mengunduh dokumen");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Daftar_Pengeluaran_Riil_${employee.employee_name.replace(/\s+/g, '_')}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            message.success({ content: 'Dokumen Pengeluaran Riil berhasil diunduh.', key: 'lpj_print_rill' });
        } catch (err) {
            message.error({ content: 'Gagal mencetak dokumen.', key: 'lpj_print_rill' });
        }
    };

    const handlePrintAllRill = async () => {
        if (!selectedSt || !lpjData) return;
        try {
            message.loading({ content: 'Menyiapkan dokumen...', key: 'lpj_print_all_rill' });
            const response = await apiFetch(`/lpj/${selectedSt.id}/export-rill`, {
                method: "GET", headers: { Accept: "application/pdf" }
            });
            if (!response.ok) throw new Error("Gagal mengunduh dokumen");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const safeNomorSt = selectedSt.nomor_st ? selectedSt.nomor_st.replace(/[\/\\]/g, '_') : selectedSt.id;
            a.download = `Daftar_Pengeluaran_Riil_Semua_${safeNomorSt}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            message.success({ content: 'Seluruh dokumen Pengeluaran Riil berhasil diunduh.', key: 'lpj_print_all_rill' });
        } catch (err) {
            message.error({ content: 'Gagal mencetak dokumen.', key: 'lpj_print_all_rill' });
        }
    };

    const handlePrintRekap = async () => {
        if (!selectedSt || !lpjData) return;
        try {
            message.loading({ content: 'Menyiapkan dokumen rekapitulasi...', key: 'lpj_print_rekap' });
            const response = await apiFetch(`/lpj/${selectedSt.id}/export-rekap`, {
                method: "GET", headers: { Accept: "application/pdf" }
            });
            if (!response.ok) throw new Error("Gagal mengunduh dokumen");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const safeNomorSt = selectedSt.nomor_st ? selectedSt.nomor_st.replace(/[\/\\]/g, '_') : selectedSt.id;
            a.download = `Rekapitulasi_LPJ_${safeNomorSt}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            message.success({ content: 'Dokumen rekapitulasi berhasil diunduh.', key: 'lpj_print_rekap' });
        } catch (err) {
            message.error({ content: 'Gagal mencetak rekapitulasi.', key: 'lpj_print_rekap' });
        }
    };

    const handleSave = async () => {
        if (!selectedSt) return;
        const payload = {
            status: "final",
            keterangan: keterangan || null,
            mak: mak || null,
            tanggal_mulai: tanggalMulai || null,
            tanggal_selesai: tanggalSelesai || null,
            lokasi_tugas: lokasiTugas || null,
            employee_ids: selectedEmployeeIds,
            bendahara_id: bendaharaId || null,
            items: Object.values(items).map((item) => {
                const row = {
                    employee_id: item.employee_id, employee_name: item.employee_name,
                    employee_nip: item.employee_nip, is_external: item.is_external,
                    nomor_spd: item.nomor_spd || null,
                    nama_hotel: item.nama_hotel || null,
                    nomor_kamar: item.nomor_kamar || null,
                };
                COMPONENTS.forEach(c => {
                    const data = item[c.key];
                    if (!data?.checked) {
                        row[c.key] = null;
                        return;
                    }
                    if (c.type === "transport_multi") {
                        const validItems = (data.items || []).filter(it => (Number(it.nominal) || 0) > 0 || (it.rincian && it.rincian.trim() !== '') || (it.keterangan && it.keterangan.trim() !== ''));
                        const total = validItems.reduce((sum, it) => sum + (Number(it.nominal) || 0), 0);
                        row[c.key] = total || null;
                        row[c.key + "_items"] = validItems;
                        row[c.key + "_keterangan"] = validItems.length > 0 ? JSON.stringify(validItems) : null;
                        row[c.key + "_berangkat"] = validItems[0]?.nominal ?? null;
                        row[c.key + "_pulang"] = validItems[1]?.nominal ?? null;
                    } else if (c.type === "departure_return") {
                        row[c.key + "_keterangan"] = data.keterangan || null;
                        row[c.key + "_berangkat"] = data.berangkat || null;
                        row[c.key + "_pulang"]    = data.pulang || null;
                        row[c.key] = (fmt(data.berangkat) + fmt(data.pulang)) || null;
                    } else if (c.type === "rate_days" || c.type === "daily") {
                        row[c.key + "_keterangan"] = data.keterangan || null;
                        if (c.key === "uang_transport_sewa_mobil") {
                            row[c.key + "_harian"] = data.per_hari || null;
                            row[c.key + "_hari"]   = data.hari || null;
                        } else if (c.key === "uang_transport_lokal") {
                            row[c.key + "_harian"] = data.per_hari || null;
                            row[c.key + "_hari"]   = data.hari || null;
                        } else if (c.key === "uang_harian") {
                            row["uang_harian_per_hari"] = data.per_hari || null;
                            row["uang_harian_hari"]     = data.hari || null;
                        } else if (c.key === "uang_penginapan") {
                            row["uang_penginapan_harian"] = data.per_hari || null;
                            row["uang_penginapan_hari"]   = data.hari || null;
                        } else if (c.key === "uang_fullboard") {
                            row["uang_fullboard_harian"] = data.per_hari || null;
                            row["uang_fullboard_hari"]   = data.hari || null;
                        } else if (c.key === "uang_harian_fullboard") {
                            row["uang_harian_fullboard_per_hari"] = data.per_hari || null;
                            row["uang_harian_fullboard_hari"]     = data.hari || null;
                        }
                        row[c.key] = (fmt(data.per_hari) * fmt(data.hari)) || null;
                    } else {
                        row[c.key + "_keterangan"] = data.keterangan || null;
                        row[c.key] = data.value || null;
                    }
                });
                return row;
            }),
        };
        setSaving(true);
        try {
            const res = await apiFetch(`/lpj/${selectedSt.id}/items`, { method: "PUT", body: JSON.stringify(payload) });
            if (!res.ok) { const err = await res.json(); throw new Error(err.errors ? Object.values(err.errors).flat().join(", ") : "Gagal menyimpan."); }
            message.success("Data LPJ berhasil disimpan.");
            setModalVisible(false);
            fetchSt(stPagination.current);
        } catch (err) { message.error(err.message); } finally { setSaving(false); }
    };

    const handleDeleteLpj = () => {
        if (!selectedSt || !lpjData) return;
        Modal.confirm({
            title: "Hapus LPJ ini?", content: "Semua data biaya yang tersimpan akan hilang.",
            okText: "Hapus", okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    const res = await apiFetch(`/lpj/${selectedSt.id}`, { method: "DELETE" });
                    if (!res.ok) throw new Error("Gagal menghapus LPJ.");
                    message.success("LPJ berhasil dihapus.");
                    setModalVisible(false);
                    fetchSt(stPagination.current);
                } catch (err) { message.error(err.message); }
            },
        });
    };

    const handleExclude = (st) => {
        Modal.confirm({
            title: "Hapus dari Daftar LPJ?",
            content: `Surat Tugas "${st.nomor_st || 'Draft'}" akan disembunyikan dari daftar LPJ.`,
            okText: "Ya, Hapus dari Daftar", okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    const res = await apiFetch(`/lpj/${st.id}/exclude`, { method: "POST" });
                    if (!res.ok) throw new Error("Gagal menyembunyikan.");
                    message.success("Dihapus dari daftar LPJ.");
                    fetchSt(stPagination.current);
                } catch (err) { message.error(err.message); }
            },
        });
    };

    const handleMarkManual = (st) => {
        Modal.confirm({
            title: "Tandai sebagai LPJ Manual?",
            content: `ST "${st.nomor_st || 'Draft'}" akan ditandai selesai (LPJ sudah dibuat di luar sistem).`,
            okText: "Ya, Tandai Manual",
            onOk: async () => {
                try {
                    const res = await apiFetch(`/lpj/${st.id}/mark-manual`, { method: "POST" });
                    if (!res.ok) throw new Error("Gagal menandai manual.");
                    message.success("LPJ ditandai sebagai manual.");
                    fetchSt(stPagination.current);
                } catch (err) { message.error(err.message); }
            },
        });
    };

    const grandTotal = Object.values(items).reduce((sum, item) => sum + calcTotal(item), 0);

    const getMenuItems = (record) => {
        const isManual = record.lpj_status === 'manual';
        const hasLpj = record.lpj_status === 'final' || record.lpj_status === 'draft' || isManual;
        return [
            {
                key: "input",
                icon: hasLpj ? <InfoCircleOutlined style={{ color: "#0078d4" }} /> : <DollarOutlined style={{ color: "#059669" }} />,
                label: hasLpj ? "Lihat & Edit Rincian LPJ" : "Input Biaya Perjalanan Dinas",
                onClick: () => fetchLpjDetail(record, false),
            },
            { type: "divider" },
            { key: "manual", icon: <CheckCircleFilled style={{ color: "#059669" }} />, label: "Tandai LPJ Manual", disabled: isManual, onClick: () => handleMarkManual(record) },
            { key: "exclude", icon: <StopOutlined style={{ color: "#ef4444" }} />, label: <span style={{ color: "#ef4444" }}>Hapus dari Daftar LPJ</span>, onClick: () => handleExclude(record) },
        ];
    };

    const stColumns = [
        {
            title: "NOMOR SURAT TUGAS",
            key: "nomor_st",
            width: 220,
            render: (_, r) => {
                return (
                    <div className="klpj-st-info">
                        <span className="klpj-st-nomor">{r.nomor_st || "Draft Surat Tugas"}</span>
                        <span className="klpj-st-date">{dateLabel(r.tanggal_st)}</span>
                    </div>
                );
            },
        },
        {
            title: "KODE MAK",
            key: "mak",
            width: 160,
            render: (_, r) => (
                <span className="klpj-mak-tag">
                    {r.mak || "-"}
                </span>
            ),
        },
        {
            title: "PERIODE TUGAS",
            key: "periode",
            width: 210,
            render: (_, r) => (
                <div className="klpj-trip-info">
                    <span className="klpj-trip-dates">
                        {dateLabel(r.tanggal_mulai)} – {dateLabel(r.tanggal_selesai)}
                    </span>
                    <span className="klpj-trip-duration">{inclusiveDays(r.tanggal_mulai, r.tanggal_selesai)} Hari Kerja</span>
                </div>
            ),
        },
        {
            title: "LOKASI TUGAS",
            key: "lokasi_tugas",
            width: 170,
            render: (_, r) => (
                <span className="klpj-lokasi-text">{r.lokasi_tugas || "-"}</span>
            ),
        },
        {
            title: "AGENDA PENUGASAN",
            key: "deskripsi_tugas",
            render: (_, r) => (
                <span className="klpj-desc-text">{r.deskripsi_tugas || "-"}</span>
            ),
        },
        {
            title: "STATUS",
            key: "lpj_status",
            width: 130,
            render: (_, r) => {
                const s = LPJ_STATUS[r.lpj_status] || LPJ_STATUS[null];
                return (
                    <div className="status-indicator">
                        <span className={`status-dot ${s.dot}`} />
                        <span className="status-text">{s.label}</span>
                    </div>
                );
            },
        },
        {
            title: "AKSI",
            key: "aksi",
            width: 50,
            align: "center",
            render: (_, r) => (
                <Dropdown menu={{ items: getMenuItems(r) }} trigger={["click"]} placement="bottomRight">
                    <Button type="text" shape="circle" icon={<MoreOutlined style={{ color: "#64748b", fontSize: 16 }} />} />
                </Dropdown>
            ),
        },
    ];

    const renderSubInputs = (empKey, compDef, compVal) => {
        const lockedRegion = isLockedRegion(selectedSt?.lokasi_tugas);

        if (compDef.type === "transport_multi") {
            const currentItems = Array.isArray(compVal.items) && compVal.items.length > 0
                ? compVal.items
                : [{ id: 1, nominal: 0, rincian: "", keterangan: "" }];
            const total = currentItems.reduce((acc, curr) => acc + fmt(curr.nominal), 0);

            return (
                <div className="klpj-comp-sub-wrapper">
                    <div className="klpj-multi-transport-box">
                        <div className="klpj-multi-transport-list">
                            {currentItems.map((itemRow, idx) => (
                                <div key={itemRow.id || idx} className="klpj-multi-transport-row">
                                    <span className="klpj-multi-transport-num">#{idx + 1}</span>
                                    <div className="klpj-multi-transport-nominal">
                                        <span className="klpj-sub-label">Biaya Transport</span>
                                        <InputNumber
                                            value={itemRow.nominal}
                                            formatter={v => `Rp ${String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`}
                                            parser={v => Number(v.replace(/Rp\s?|[.]/g, ""))}
                                            onChange={val => updateTransportItem(empKey, compDef.key, idx, "nominal", val)}
                                            min={0}
                                            placeholder="0"
                                            disabled={!isEditingMode}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div className="klpj-multi-transport-rincian">
                                        <span className="klpj-sub-label">Rincian</span>
                                        <Input
                                            placeholder={`Contoh: ${compDef.label} Bandara ke Hotel / Lokasi...`}
                                            value={itemRow.rincian || ""}
                                            onChange={e => updateTransportItem(empKey, compDef.key, idx, "rincian", e.target.value)}
                                            disabled={!isEditingMode}
                                        />
                                    </div>
                                    <div className="klpj-multi-transport-ket">
                                        <span className="klpj-sub-label">Keterangan</span>
                                        <Input
                                            placeholder="Keterangan / catatan..."
                                            value={itemRow.keterangan || ""}
                                            onChange={e => updateTransportItem(empKey, compDef.key, idx, "keterangan", e.target.value)}
                                            disabled={!isEditingMode}
                                        />
                                    </div>
                                    {isEditingMode && currentItems.length > 1 && (
                                        <Button
                                            type="text"
                                            danger
                                            size="small"
                                            icon={<DeleteOutlined />}
                                            onClick={() => removeTransportItem(empKey, compDef.key, idx)}
                                            title="Hapus Rincian Ini"
                                            style={{ marginTop: 18 }}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="klpj-multi-transport-footer">
                            {isEditingMode ? (
                                <Button
                                    type="dashed"
                                    size="small"
                                    icon={<PlusOutlined />}
                                    onClick={() => addTransportItem(empKey, compDef.key)}
                                    style={{ fontSize: 11.5, borderColor: '#0F5B99', color: '#0F5B99' }}
                                >
                                    + Tambah Biaya {compDef.label}
                                </Button>
                            ) : <div />}
                            <div className="klpj-sub-result" style={{ paddingTop: 0 }}>
                                <span className="klpj-sub-operator" style={{ paddingTop: 0 }}>Total =</span>
                                <span className="klpj-sub-total">{fmtRupiah(total)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        let content = null;
        if (compDef.type === "departure_return") {
            const total = fmt(compVal.berangkat) + fmt(compVal.pulang);
            content = (
                <div className="klpj-sub-inputs">
                    <div className="klpj-sub-field">
                        <span className="klpj-sub-label">Berangkat</span>
                        <InputNumber
                            value={compVal.berangkat}
                            formatter={v => `Rp ${String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`}
                            parser={v => Number(v.replace(/Rp\s?|[.]/g, ""))}
                            onChange={val => updateSubValue(empKey, compDef.key, "berangkat", val)}
                            min={0} placeholder="0"
                            disabled={!isEditingMode}
                        />
                    </div>
                    <span className="klpj-sub-operator">+</span>
                    <div className="klpj-sub-field">
                        <span className="klpj-sub-label">Pulang</span>
                        <InputNumber
                            value={compVal.pulang}
                            formatter={v => `Rp ${String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`}
                            parser={v => Number(v.replace(/Rp\s?|[.]/g, ""))}
                            onChange={val => updateSubValue(empKey, compDef.key, "pulang", val)}
                            min={0} placeholder="0"
                            disabled={!isEditingMode}
                        />
                    </div>
                    <div className="klpj-sub-result">
                        <span className="klpj-sub-operator">=</span>
                        <span className="klpj-sub-total">{fmtRupiah(total)}</span>
                    </div>
                </div>
            );
        } else if (compDef.type === "daily" && (compDef.key === "uang_harian" || compDef.key === "uang_harian_fullboard")) {
            const total = fmt(compVal.per_hari) * fmt(compVal.hari);
            const isUangHarian = compDef.key === "uang_harian";
            content = (
                <div className="klpj-sub-inputs">
                    <div className="klpj-sub-field">
                        <span className="klpj-sub-label">
                            Tarif / Hari
                            {isUangHarian && lockedRegion && <span className="klpj-locked-badge">Terkunci</span>}
                        </span>
                        <InputNumber
                            value={compVal.per_hari}
                            formatter={v => `Rp ${String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`}
                            parser={v => Number(v.replace(/Rp\s?|[.]/g, ""))}
                            onChange={val => updateSubValue(empKey, compDef.key, "per_hari", val)}
                            min={0} placeholder="0"
                            disabled={!isEditingMode || (isUangHarian && lockedRegion)}
                        />
                    </div>
                    <span className="klpj-sub-operator">×</span>
                    <div className="klpj-sub-field">
                        <span className="klpj-sub-label">Hari</span>
                        <InputNumber
                            value={compVal.hari}
                            onChange={val => updateSubValue(empKey, compDef.key, "hari", val)}
                            min={0} placeholder="0"
                            disabled={!isEditingMode}
                        />
                    </div>
                    <div className="klpj-sub-result">
                        <span className="klpj-sub-operator">=</span>
                        <span className="klpj-sub-total">{fmtRupiah(total)}</span>
                    </div>
                </div>
            );
        } else if (compDef.type === "rate_days") {
            const rateLabel = compDef.key === "uang_penginapan" ? "Tarif / Malam" : "Tarif / Hari";
            const daysLabel = compDef.key === "uang_penginapan" ? "Malam" : "Hari";
            const total = fmt(compVal.per_hari) * fmt(compVal.hari);
            content = (
                <div className="klpj-sub-inputs">
                    <div className="klpj-sub-field">
                        <span className="klpj-sub-label">{rateLabel}</span>
                        <InputNumber
                            value={compVal.per_hari}
                            formatter={v => `Rp ${String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`}
                            parser={v => Number(v.replace(/Rp\s?|[.]/g, ""))}
                            onChange={val => updateSubValue(empKey, compDef.key, "per_hari", val)}
                            min={0} placeholder="0"
                            disabled={!isEditingMode}
                        />
                    </div>
                    <span className="klpj-sub-operator">×</span>
                    <div className="klpj-sub-field">
                        <span className="klpj-sub-label">{daysLabel}</span>
                        <InputNumber
                            value={compVal.hari}
                            onChange={val => updateSubValue(empKey, compDef.key, "hari", val)}
                            min={0} placeholder="0"
                            disabled={!isEditingMode}
                        />
                    </div>
                    <div className="klpj-sub-result">
                        <span className="klpj-sub-operator">=</span>
                        <span className="klpj-sub-total">{fmtRupiah(total)}</span>
                    </div>
                </div>
            );
        } else {
            content = (
                <div className="klpj-sub-inputs">
                    <div className="klpj-sub-field">
                        <span className="klpj-sub-label">Nominal</span>
                        <InputNumber
                            value={compVal.value}
                            formatter={v => `Rp ${String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`}
                            parser={v => Number(v.replace(/Rp\s?|[.]/g, ""))}
                            onChange={val => updateSubValue(empKey, compDef.key, "value", val)}
                            min={0} placeholder="0"
                            disabled={!isEditingMode}
                        />
                    </div>
                </div>
            );
        }

        return (
            <div className="klpj-comp-sub-wrapper">
                {compDef.key === "uang_penginapan" && (
                    <div className="klpj-hotel-row">
                        <Input
                            placeholder="Nama Hotel / Penginapan"
                            value={items[empKey]?.nama_hotel || ""}
                            onChange={e => updateItemProperty(empKey, "nama_hotel", e.target.value)}
                            disabled={!isEditingMode}
                            style={{ flex: 2 }}
                        />
                        <Input
                            placeholder="No. Kamar"
                            value={items[empKey]?.nomor_kamar || ""}
                            onChange={e => updateItemProperty(empKey, "nomor_kamar", e.target.value)}
                            disabled={!isEditingMode}
                            style={{ flex: 1 }}
                        />
                    </div>
                )}
                {content}
                <Input
                    size="small"
                    placeholder="Catatan / keterangan biaya..."
                    value={compVal.keterangan || ""}
                    onChange={e => updateSubValue(empKey, compDef.key, "keterangan", e.target.value)}
                    disabled={!isEditingMode}
                    style={{ marginTop: 4 }}
                />
            </div>
        );
    };

    return (
        <div className="klpj-module-container">
            {/* ── Toolbar & Filter Box (Surat Tugas Standard) ── */}
            <Card
                variant="borderless"
                style={{ borderRadius: 8 }}
                styles={{ body: { padding: "12px 16px" } }}
                className="klpj-toolbar-card"
            >
                <Row gutter={[10, 10]} align="middle">
                    {/* Search */}
                    <Col xs={24} sm={12} md={7} lg={6}>
                        <Input
                            placeholder="Cari nomor ST, lokasi, MAK, pegawai..."
                            prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            allowClear
                        />
                    </Col>

                    {/* Date Range Popover Filter */}
                    <Col xs={24} sm={12} md={6} lg={5}>
                        <Popover
                            trigger="click"
                            open={datePopoverOpen}
                            onOpenChange={setDatePopoverOpen}
                            placement="bottomLeft"
                            content={
                                <Space direction="vertical" size={10} style={{ padding: 4 }}>
                                    <Text strong style={{ fontSize: 12 }}>Range Tanggal Pelaksanaan Tugas</Text>
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

                    {/* Status Dropdown Filter */}
                    <Col xs={24} sm={12} md={5} lg={4}>
                        <Dropdown
                            menu={{
                                items: [
                                    { key: "ALL", label: "Semua Status", onClick: () => setFilterLpjStatus("ALL") },
                                    { key: "SUDAN", label: "Sudah Dibuat LPJ", onClick: () => setFilterLpjStatus("SUDAN") },
                                    { key: "BELUM", label: "Belum Dibuat LPJ", onClick: () => setFilterLpjStatus("BELUM") },
                                    { key: "DRAFT", label: "Draft LPJ", onClick: () => setFilterLpjStatus("DRAFT") },
                                    { key: "FINAL", label: "LPJ Selesai (Final)", onClick: () => setFilterLpjStatus("FINAL") },
                                ],
                                selectedKeys: [filterLpjStatus],
                            }}
                            trigger={["click"]}
                        >
                            <Button style={{ width: "100%" }}>
                                {filterLpjStatus === "FINAL"
                                    ? "Status: LPJ Selesai"
                                    : filterLpjStatus === "DRAFT"
                                    ? "Status: Draft"
                                    : filterLpjStatus === "BELUM"
                                    ? "Status: Belum Dibuat"
                                    : filterLpjStatus === "SUDAN"
                                    ? "Status: Sudah Dibuat"
                                    : "Status: Semua"}
                                <DownOutlined style={{ fontSize: 10, marginLeft: 4 }} />
                            </Button>
                        </Dropdown>
                    </Col>

                    {/* Right action tools */}
                    <Col xs={24} sm={12} md={6} lg={9} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                        <Button
                            icon={<FilterOutlined />}
                            onClick={handleResetFilter}
                        >
                            Reset
                        </Button>
                        <Tooltip title="Segarkan Data">
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={() => fetchSt(1)}
                            />
                        </Tooltip>
                        <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                            {displayedStList.length} data
                        </Text>
                    </Col>
                </Row>
            </Card>

            {/* ── Table Card ── */}
            <Card
                variant="borderless"
                style={{ borderRadius: 8 }}
                styles={{ body: { padding: "8px 8px 0 8px" } }}
                className="klpj-main-card"
            >
                <Table
                    className="klpj-table"
                    dataSource={displayedStList}
                    columns={stColumns}
                    rowKey="id"
                    size="middle"
                    loading={stLoading}
                    pagination={{
                        defaultPageSize: 10,
                        showSizeChanger: true,
                        pageSizeOptions: ['10', '25', '50', '100'],
                        showTotal: (total, range) => `${range[0]}-${range[1]} dari ${total} data`,
                    }}
                />
            </Card>

            {/* ── Clean Minimalist Modal: Input Biaya LPJ ── */}
            <Modal
                title={null}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={null}
                width={1140}
                centered
                destroyOnClose
                className="klpj-modal"
            >
                <button
                    className="klpj-modal-close"
                    onClick={() => setModalVisible(false)}
                    title="Tutup"
                >
                    <CloseOutlined />
                </button>

                <div className="klpj-modal-wrap">
                    {/* Header */}
                    <div className="klpj-modal-header">
                        <div>
                            <h3 className="klpj-modal-title">
                                {selectedSt?.nomor_st || "Input Komponen Biaya LPJ"}
                            </h3>
                            <span className="klpj-modal-sub">
                                Rincian biaya riil tiket, transport lokal, uang harian, dan hotel
                            </span>
                        </div>

                        <Space>
                            {!isEditingMode ? (
                                <Button
                                    type="primary"
                                    icon={<EditOutlined />}
                                    onClick={() => setIsEditingMode(true)}
                                >
                                    Edit LPJ
                                </Button>
                            ) : (
                                <Button onClick={() => setIsEditingMode(false)}>
                                    Batal Edit
                                </Button>
                            )}
                            {lpjData && isEditingMode && (
                                <Button
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={handleDeleteLpj}
                                >
                                    Hapus
                                </Button>
                            )}
                        </Space>
                    </div>

                    {/* Body */}
                    <div className="klpj-modal-body">
                        <Spin spinning={lpjLoading}>
                            {/* Read-only Hint Banner when !isEditingMode */}
                            {!isEditingMode && (
                                <div className="klpj-readonly-banner">
                                    <div className="klpj-readonly-left">
                                        <InfoCircleOutlined className="klpj-readonly-icon" />
                                        <div className="klpj-readonly-text">
                                            <strong>Mode Pratinjau (Hanya Lihat)</strong>
                                            <span>Tekan tombol <strong>Edit LPJ</strong> di atas untuk melakukan Edit / Input data rincian biaya.</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Meta Fieldset */}
                            <div className="klpj-meta-box">
                                <Row gutter={12}>
                                    <Col xs={24} md={7}>
                                        <div className="klpj-field-item">
                                            <label className="klpj-field-label">LOKASI / TUJUAN</label>
                                            <Input
                                                value={lokasiTugas}
                                                onChange={(e) => setLokasiTugas(e.target.value)}
                                                disabled={!isEditingMode}
                                            />
                                        </div>
                                    </Col>
                                    <Col xs={24} md={7}>
                                        <div className="klpj-field-item">
                                            <label className="klpj-field-label">PERIODE PENUGASAN</label>
                                            <DatePicker.RangePicker
                                                style={{ width: '100%' }}
                                                format="DD/MM/YYYY"
                                                disabled={!isEditingMode}
                                                value={[
                                                    tanggalMulai ? dayjs(tanggalMulai) : null,
                                                    tanggalSelesai ? dayjs(tanggalSelesai) : null,
                                                ]}
                                                onChange={(dates) => {
                                                    setTanggalMulai(dates && dates[0] ? dates[0].format("YYYY-MM-DD") : "");
                                                    setTanggalSelesai(dates && dates[1] ? dates[1].format("YYYY-MM-DD") : "");
                                                }}
                                            />
                                        </div>
                                    </Col>
                                    <Col xs={24} md={6}>
                                        <div className="klpj-field-item">
                                            <label className="klpj-field-label">KODE MAK</label>
                                            <Input
                                                value={mak}
                                                onChange={(e) => setMak(e.target.value)}
                                                disabled={!isEditingMode}
                                            />
                                        </div>
                                    </Col>
                                    <Col xs={24} md={4}>
                                        <div className="klpj-field-item">
                                            <label className="klpj-field-label">STATUS</label>
                                            <div className="status-indicator" style={{ marginTop: 6 }}>
                                                <span className={`status-dot ${LPJ_STATUS[lpjStatus]?.dot || 'belum'}`} />
                                                <span className="status-text">{LPJ_STATUS[lpjStatus]?.label || "Belum Dibuat"}</span>
                                            </div>
                                        </div>
                                    </Col>
                                </Row>

                                {/* Employee list with Add / Remove capability */}
                                <div className="klpj-emp-roster">
                                    <span className="klpj-roster-label">Pegawai Bertugas:</span>
                                    <div className="klpj-roster-tags">
                                        {Object.keys(items).map((key) => {
                                            const it = items[key];
                                            return (
                                                <span key={key} className="klpj-emp-badge">
                                                    <span className="klpj-badge-name">{it.employee_name}</span>
                                                    {isEditingMode && (
                                                        <CloseOutlined
                                                            className="klpj-emp-del-btn"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRemoveEmployee(key);
                                                            }}
                                                            title="Hapus Pegawai dari LPJ"
                                                        />
                                                    )}
                                                </span>
                                            );
                                        })}

                                        {isEditingMode && (
                                            <Select
                                                showSearch
                                                size="small"
                                                placeholder="+ Tambah Pegawai..."
                                                style={{ minWidth: 200 }}
                                                value={null}
                                                onChange={(empId) => handleAddEmployee(empId)}
                                                optionFilterProp="label"
                                                options={employees
                                                    .filter(e => !selectedEmployeeIds.includes(e.id))
                                                    .map(e => ({
                                                        value: e.id,
                                                        label: `${e.name}${e.nip ? ` (${e.nip})` : ''}`
                                                    }))
                                                }
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Split Pane: Employees List + Components Editor */}
                            <div className="klpj-split-layout">
                                {/* Left: Employee list */}
                                <div className="klpj-pane-sidebar">
                                    <div className="klpj-sidebar-search">
                                        <Input
                                            placeholder="Cari pegawai..."
                                            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                                            value={sidebarSearch}
                                            onChange={e => setSidebarSearch(e.target.value)}
                                            allowClear
                                            size="small"
                                        />
                                    </div>
                                    <div className="klpj-sidebar-list">
                                        {Object.keys(items)
                                            .filter(key => {
                                                const item = items[key];
                                                return item.employee_name.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
                                                       (item.employee_nip && item.employee_nip.includes(sidebarSearch));
                                            })
                                            .map(key => {
                                                const item = items[key];
                                                const total = calcTotal(item);
                                                const isActive = key === activeEmployeeKey;
                                                return (
                                                    <div
                                                        key={key}
                                                        className={`klpj-emp-row ${isActive ? 'active' : ''}`}
                                                        onClick={() => setActiveEmployeeKey(key)}
                                                    >
                                                        <div className="emp-row-info">
                                                            <span className="emp-row-name">{item.employee_name}</span>
                                                            <span className="emp-row-nip">{item.employee_nip || "NON-NIP"}</span>
                                                        </div>
                                                        <div className="emp-row-side-act">
                                                            <span className="emp-row-total">{fmtRupiah(total)}</span>
                                                            {isEditingMode && (
                                                                <Button
                                                                    type="text"
                                                                    size="small"
                                                                    danger
                                                                    className="emp-row-del-icon"
                                                                    icon={<DeleteOutlined style={{ fontSize: 12 }} />}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleRemoveEmployee(key);
                                                                    }}
                                                                    title="Hapus Pegawai"
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                    {isEditingMode && (
                                        <div className="klpj-sidebar-footer">
                                            <Select
                                                showSearch
                                                size="small"
                                                placeholder="+ Tambah Pegawai"
                                                style={{ width: '100%' }}
                                                value={null}
                                                onChange={(empId) => handleAddEmployee(empId)}
                                                optionFilterProp="label"
                                                options={employees
                                                    .filter(e => !selectedEmployeeIds.includes(e.id))
                                                    .map(e => ({
                                                        value: e.id,
                                                        label: `${e.name}${e.nip ? ` (${e.nip})` : ''}`
                                                    }))
                                                }
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Right: Components */}
                                <div className="klpj-pane-main">
                                    {activeEmployeeKey && items[activeEmployeeKey] ? (
                                        (() => {
                                            const activeEmployee = items[activeEmployeeKey];
                                            return (
                                                <div className="klpj-editor-wrap">
                                                    {/* Sub-Header */}
                                                    <div className="klpj-editor-sub">
                                                        <div>
                                                            <strong className="klpj-active-name">{activeEmployee.employee_name}</strong>
                                                            <span className="klpj-active-nip">{activeEmployee.employee_nip || "NON-NIP"}</span>
                                                        </div>
                                                        <Space>
                                                            {isEditingMode && (
                                                                <Button
                                                                    size="small"
                                                                    danger
                                                                    icon={<DeleteOutlined />}
                                                                    onClick={() => handleRemoveEmployee(activeEmployeeKey)}
                                                                >
                                                                    Hapus Pegawai
                                                                </Button>
                                                            )}
                                                            <Button
                                                                size="small"
                                                                icon={<PrinterOutlined />}
                                                                onClick={() => handlePrintSingle(activeEmployee)}
                                                                disabled={!lpjData}
                                                            >
                                                                Cetak Rincian
                                                            </Button>
                                                            {isPalopo(selectedSt?.lokasi_tugas) && (
                                                                <Button
                                                                    size="small"
                                                                    icon={<PrinterOutlined />}
                                                                    onClick={() => handlePrintRill(activeEmployee)}
                                                                    disabled={!lpjData}
                                                                >
                                                                    Pengeluaran Riil
                                                                </Button>
                                                            )}
                                                        </Space>
                                                    </div>

                                                    {/* SPD bar */}
                                                    <div className="klpj-spd-bar">
                                                        <span className="klpj-spd-lbl">Nomor SPD:</span>
                                                        <Input
                                                            size="small"
                                                            placeholder="Nomor SPD..."
                                                            value={activeEmployee.nomor_spd || ""}
                                                            onChange={e => updateItemProperty(activeEmployeeKey, "nomor_spd", e.target.value)}
                                                            disabled={!isEditingMode}
                                                            style={{ maxWidth: 300 }}
                                                        />
                                                    </div>

                                                    {/* Category Tabs: Unified Filter Tools Button Style */}
                                                    <div className="klpj-tabs-row">
                                                        <button
                                                            type="button"
                                                            className={`klpj-tab-filter-btn ${filterKey === 'all' ? 'active' : ''}`}
                                                            onClick={() => setFilterKey('all')}
                                                        >
                                                            Semua Komponen
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={`klpj-tab-filter-btn ${filterKey === 'transport' ? 'active' : ''}`}
                                                            onClick={() => setFilterKey('transport')}
                                                        >
                                                            Transport
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={`klpj-tab-filter-btn ${filterKey === 'harian' ? 'active' : ''}`}
                                                            onClick={() => setFilterKey('harian')}
                                                        >
                                                            Uang Harian
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={`klpj-tab-filter-btn ${filterKey === 'penginapan' ? 'active' : ''}`}
                                                            onClick={() => setFilterKey('penginapan')}
                                                        >
                                                            Penginapan
                                                        </button>
                                                    </div>

                                                    {/* Components list */}
                                                    <div className="klpj-components-scroll">
                                                        {COMPONENTS
                                                            .filter(c => {
                                                                if (filterKey === "all") return true;
                                                                if (filterKey === "transport") return c.key.startsWith("uang_transport");
                                                                if (filterKey === "harian") return c.key === "uang_harian" || c.key === "uang_harian_fullboard";
                                                                if (filterKey === "penginapan") return c.key === "uang_penginapan" || c.key === "uang_fullboard";
                                                                return true;
                                                            })
                                                            .map(c => {
                                                                const compVal = activeEmployee[c.key] || emptyComp(c.type, 0);
                                                                const compTotal = getComponentTotal(activeEmployee, c.key);
                                                                return (
                                                                    <div
                                                                        className={`klpj-comp-card ${compVal.checked ? 'active' : ''} ${!isEditingMode ? 'readonly-card' : ''}`}
                                                                        key={c.key}
                                                                        onClick={() => { if (!isEditingMode) handlePromptEdit(); }}
                                                                    >
                                                                        <div className="klpj-comp-header">
                                                                            <div className="klpj-comp-title-group">
                                                                                <span className="klpj-comp-icon">{getIconForComponent(c.key)}</span>
                                                                                <span className="klpj-comp-name">{c.label}</span>
                                                                            </div>
                                                                            <div className="klpj-comp-action" onClick={(e) => { if (!isEditingMode) { e.stopPropagation(); handlePromptEdit(); } }}>
                                                                                <span className="klpj-comp-val">
                                                                                    {compVal.checked ? fmtRupiah(compTotal) : "-"}
                                                                                </span>
                                                                                <Tooltip title={!isEditingMode ? "Tekan tombol Edit LPJ diatas untuk melakukan Edit / Input data" : ""}>
                                                                                    <Switch
                                                                                        size="small"
                                                                                        disabled={!isEditingMode}
                                                                                        checked={compVal.checked}
                                                                                        onChange={checked => toggleComponent(activeEmployeeKey, c.key, checked)}
                                                                                    />
                                                                                </Tooltip>
                                                                            </div>
                                                                        </div>

                                                                        {compVal.checked && (
                                                                            <div className="klpj-comp-body">
                                                                                {renderSubInputs(activeEmployeeKey, c, compVal)}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                    </div>

                                                    {/* Subtotal */}
                                                    <div className="klpj-subtotal-bar">
                                                        <span>Subtotal Pegawai:</span>
                                                        <strong>{fmtRupiah(calcTotal(activeEmployee))}</strong>
                                                    </div>
                                                </div>
                                            );
                                        })()
                                    ) : (
                                        <div className="klpj-empty-state">
                                            <p>Pilih pegawai untuk mengisi rincian biaya.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Total Bar */}
                            <div className="klpj-total-bar">
                                <div>
                                    <span className="klpj-total-lbl">TOTAL BIAYA DINAS:</span>
                                    <strong className="klpj-total-val">{fmtRupiah(grandTotal)}</strong>
                                </div>
                                <span className="klpj-total-meta">{Object.keys(items).length} Pegawai</span>
                            </div>

                            {/* Footer */}
                            <div className="klpj-modal-footer">
                                <Space>
                                    {lpjData && (
                                        <>
                                            <Button size="small" icon={<PrinterOutlined />} onClick={handlePrintAll}>
                                                Cetak Semua
                                            </Button>
                                            {isPalopo(selectedSt?.lokasi_tugas) && (
                                                <Button size="small" icon={<PrinterOutlined />} onClick={handlePrintAllRill}>
                                                    Riil Semua
                                                </Button>
                                            )}
                                            <Button size="small" icon={<PrinterOutlined />} onClick={handlePrintRekap}>
                                                Rekapitulasi
                                            </Button>
                                        </>
                                    )}
                                </Space>

                                <Space>
                                    {isEditingMode ? (
                                        <>
                                            <Button onClick={() => setIsEditingMode(false)}>Batal</Button>
                                            <Button
                                                type="primary"
                                                icon={<SaveOutlined />}
                                                loading={saving}
                                                onClick={handleSave}
                                            >
                                                Simpan LPJ Final
                                            </Button>
                                        </>
                                    ) : (
                                        <Button onClick={() => setModalVisible(false)}>Tutup</Button>
                                    )}
                                </Space>
                            </div>
                        </Spin>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
