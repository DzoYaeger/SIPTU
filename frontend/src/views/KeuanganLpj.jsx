import { useState, useEffect, useCallback } from "react";
import {
    Table, Card, Button, Tag, Space, Input, Modal, Radio,
    message, Typography, Row, Col, Checkbox, InputNumber,
    Spin, Dropdown, Select, Switch,
} from "antd";
import {
    SearchOutlined, ReloadOutlined, SaveOutlined,
    FileProtectOutlined, EnvironmentOutlined,
    CalendarOutlined, DollarOutlined,
    EditOutlined, DeleteOutlined, CloseOutlined,
    MoreOutlined, CheckCircleFilled, StopOutlined,
    CompassOutlined, CarOutlined, SendOutlined,
    HomeOutlined, UserOutlined, InfoCircleOutlined,
} from "@ant-design/icons";
import { useAuth } from "../hooks/useAuth.js";
import dayjs from "dayjs";
import "./KeuanganLpj.css";

const { Title, Text } = Typography;

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
    { key: "uang_transport_bus",       label: "Transport Bus",        color: "#4f46e5", type: "departure_return" },
    { key: "uang_transport_taxi",      label: "Transport Taxi",       color: "#6366f1", type: "departure_return" },
    { key: "uang_transport_pesawat",   label: "Transport Pesawat",    color: "#3b82f6", type: "departure_return" },
    { key: "uang_transport_bbm",       label: "Transport BBM",        color: "#0ea5e9", type: "simple" },
    { key: "uang_transport_sewa_mobil",label: "Transport Sewa Mobil", color: "#06b6d4", type: "rate_days" },
    { key: "uang_transport_lokal",     label: "Transport Lokal",      color: "#1e1b4b", type: "rate_days" },
    { key: "uang_harian",              label: "Uang Harian",          color: "#0d9488", type: "daily" },
    { key: "uang_penginapan",          label: "Penginapan",           color: "#8b5cf6", type: "rate_days" },
    { key: "uang_fullboard",           label: "Paket Fullboard",      color: "#ec4899", type: "simple" },
    { key: "uang_harian_fullboard",    label: "Uang Harian Fullboard", color: "#f59e0b", type: "daily" },
];

const LPJ_STATUS = {
    null:    { label: "Belum Ada", color: "default" },
    draft:   { label: "Draft",     color: "orange"  },
    final:   { label: "Final",     color: "green"   },
    manual:  { label: "Manual",    color: "cyan"    },
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
        case "uang_transport_bbm":        return <CarOutlined />;
        case "uang_transport_sewa_mobil": return <CarOutlined />;
        case "uang_harian":               return <DollarOutlined />;
        case "uang_penginapan":           return <HomeOutlined />;
        case "uang_fullboard":            return <HomeOutlined />;
        case "uang_harian_fullboard":     return <DollarOutlined />;
        default:                          return <DollarOutlined />;
    }
};

const getDescForComponent = (key) => {
    switch (key) {
        case "uang_transport_bus":        return "Biaya perjalanan menggunakan bus dinas/umum";
        case "uang_transport_taxi":       return "Biaya perjalanan taksi/online ride-sharing";
        case "uang_transport_pesawat":    return "Biaya tiket pesawat kelas ekonomi";
        case "uang_transport_bbm":        return "Biaya BBM/Pertalite/Pertamax dinas";
        case "uang_transport_sewa_mobil": return "Biaya rental/sewa mobil harian";
        case "uang_harian":               return "Uang saku harian perjalanan dinas";
        case "uang_penginapan":           return "Biaya hotel/penginapan per malam";
        case "uang_fullboard":            return "Biaya paket meeting / penginapan Paket Fullboard";
        case "uang_harian_fullboard":     return "Uang saku saku harian paket Fullboard per hari";
        default:                          return "Komponen biaya";
    }
};

/* ── Calculate component total from breakdown values ── */
const getComponentTotal = (item, key) => {
    const comp = COMPONENTS.find(c => c.key === key);
    const data = item[key];
    if (!data?.checked) return 0;

    if (comp?.type === "departure_return") {
        return fmt(data.berangkat) + fmt(data.pulang);
    }
    if (comp?.type === "rate_days" || comp?.type === "daily") {
        return fmt(data.per_hari) * fmt(data.hari);
    }
    // simple (BBM)
    return fmt(data.value);
};

const calcTotal = (item) => COMPONENTS.reduce((sum, c) => sum + getComponentTotal(item, c.key), 0);

/* ── Default empty component state ── */
const emptyComp = (type, autoRate) => {
    if (type === "departure_return") return { checked: false, berangkat: 0, pulang: 0 };
    if (type === "rate_days")        return { checked: false, per_hari: 0, hari: 0 };
    if (type === "daily")            return { checked: false, per_hari: autoRate || 0, hari: 0 };
    return { checked: false, value: 0 }; // simple
};

export default function KeuanganLpj() {
    const { apiFetch } = useAuth();

    const [stList, setStList] = useState([]);
    const [stLoading, setStLoading] = useState(false);
    const [stPagination, setStPagination] = useState({ current: 1, pageSize: 20, total: 0 });
    const [searchInput, setSearchInput] = useState("");
    const [appliedSearch, setAppliedSearch] = useState("");

    const [selectedSt, setSelectedSt] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [lpjData, setLpjData] = useState(null);
    const [lpjLoading, setLpjLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [items, setItems] = useState({});
    const [lpjStatus, setLpjStatus] = useState("draft");
    const [keterangan, setKeterangan] = useState("");
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

    const fetchSt = useCallback(async (page = 1) => {
        setStLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page) });
            if (appliedSearch) params.set("search", appliedSearch);
            const res = await apiFetch(`/lpj?${params}`);
            const json = await res.json();
            setStList(json.data ?? []);
            setStPagination({ current: json.current_page ?? page, pageSize: json.per_page ?? 20, total: json.total ?? 0 });
        } catch {
            message.error("Gagal memuat daftar surat tugas.");
        } finally {
            setStLoading(false);
        }
    }, [appliedSearch, apiFetch]);

    useEffect(() => { fetchSt(1); }, [fetchSt]);

    /* ── Parse saved LPJ item from DB into our state shape ── */
    const parseItemFromDb = (item, lokasi) => {
        const autoRate = getLockedRate(lokasi);
        return {
            employee_id: item.employee_id,
            employee_name: item.employee_name,
            employee_nip: item.employee_nip,
            is_external: item.is_external,
            nomor_spd: item.nomor_spd ?? "",
            uang_transport_bus: {
                checked: item.uang_transport_bus != null,
                berangkat: item.uang_transport_bus_berangkat ?? 0,
                pulang: item.uang_transport_bus_pulang ?? 0,
            },
            uang_transport_taxi: {
                checked: item.uang_transport_taxi != null,
                berangkat: item.uang_transport_taxi_berangkat ?? 0,
                pulang: item.uang_transport_taxi_pulang ?? 0,
            },
            uang_transport_pesawat: {
                checked: item.uang_transport_pesawat != null,
                berangkat: item.uang_transport_pesawat_berangkat ?? 0,
                pulang: item.uang_transport_pesawat_pulang ?? 0,
            },
            uang_transport_bbm: {
                checked: item.uang_transport_bbm != null,
                value: item.uang_transport_bbm ?? 0,
            },
            uang_transport_sewa_mobil: {
                checked: item.uang_transport_sewa_mobil != null,
                per_hari: item.uang_transport_sewa_mobil_harian ?? 0,
                hari: item.uang_transport_sewa_mobil_hari ?? 0,
            },
            uang_transport_lokal: {
                checked: item.uang_transport_lokal != null,
                per_hari: item.uang_transport_lokal_harian ?? 0,
                hari: item.uang_transport_lokal_hari ?? 0,
            },
            uang_harian: {
                checked: item.uang_harian != null,
                per_hari: item.uang_harian_per_hari ?? (autoRate > 0 ? autoRate : (item.uang_harian ?? 0)),
                hari: item.uang_harian_hari ?? (item.uang_harian && autoRate > 0 ? Math.round(item.uang_harian / autoRate) : 0),
            },
            uang_penginapan: {
                checked: item.uang_penginapan != null,
                per_hari: item.uang_penginapan_harian ?? 0,
                hari: item.uang_penginapan_hari ?? 0,
            },
            uang_fullboard: {
                checked: item.uang_fullboard != null,
                value: item.uang_fullboard ?? 0,
            },
            uang_harian_fullboard: {
                checked: item.uang_harian_fullboard != null,
                per_hari: item.uang_harian_fullboard_per_hari ?? 0,
                hari: item.uang_harian_fullboard_hari ?? 0,
            },
        };
    };

    const fetchLpjDetail = useCallback(async (st) => {
        setLpjLoading(true);
        setSelectedSt(st);
        setModalVisible(true);
        setItems({});
        setLpjData(null);
        setLpjStatus("draft");
        setKeterangan("");
        setBendaharaId(null);
        setFilterKey("all");
        try {
            const res = await apiFetch(`/lpj/${st.id}`);
            const json = await res.json();
            setLpjData(json.lpj);
            setLpjStatus(json.lpj?.status ?? "draft");
            setKeterangan(json.lpj?.keterangan ?? "");
            setBendaharaId(json.lpj?.bendahara_id ?? null);
            const lokasi = (json.surat_tugas ?? st)?.lokasi_tugas ?? "";
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

    const toggleComponent = (empKey, compKey, checked) => {
        setItems((prev) => {
            const comp = COMPONENTS.find(c => c.key === compKey);
            const existing = prev[empKey][compKey];
            let updated;
            if (checked) {
                // When turning on, keep existing values or set defaults
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
            if (employee.employee_id) {
                params.set("employee_id", employee.employee_id);
            } else {
                params.set("employee_name", employee.employee_name);
            }

            const response = await apiFetch(
                `/lpj/${selectedSt.id}/export-pdf?${params}`,
                { method: "GET", headers: { Accept: "application/pdf" } }
            );

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
            console.error(err);
            message.error({ content: 'Gagal mencetak dokumen.', key: 'lpj_print' });
        }
    };

    const handlePrintAll = async () => {
        if (!selectedSt || !lpjData) return;
        try {
            message.loading({ content: 'Menyiapkan seluruh dokumen...', key: 'lpj_print_all' });
            
            const response = await apiFetch(
                `/lpj/${selectedSt.id}/export-pdf`,
                { method: "GET", headers: { Accept: "application/pdf" } }
            );

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
            console.error(err);
            message.error({ content: 'Gagal mencetak dokumen.', key: 'lpj_print_all' });
        }
    };

    const handlePrintRill = async (employee) => {
        if (!selectedSt || !lpjData) return;
        try {
            message.loading({ content: 'Menyiapkan dokumen...', key: 'lpj_print_rill' });
            
            const params = new URLSearchParams();
            if (employee.employee_id) {
                params.set("employee_id", employee.employee_id);
            } else {
                params.set("employee_name", employee.employee_name);
            }

            const response = await apiFetch(
                `/lpj/${selectedSt.id}/export-rill?${params}`,
                { method: "GET", headers: { Accept: "application/pdf" } }
            );

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
            console.error(err);
            message.error({ content: 'Gagal mencetak dokumen.', key: 'lpj_print_rill' });
        }
    };

    const handlePrintAllRill = async () => {
        if (!selectedSt || !lpjData) return;
        try {
            message.loading({ content: 'Menyiapkan seluruh dokumen...', key: 'lpj_print_all_rill' });
            
            const response = await apiFetch(
                `/lpj/${selectedSt.id}/export-rill`,
                { method: "GET", headers: { Accept: "application/pdf" } }
            );

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
            console.error(err);
            message.error({ content: 'Gagal mencetak dokumen.', key: 'lpj_print_all_rill' });
        }
    };

    const handlePrintRekap = async () => {
        if (!selectedSt || !lpjData) return;
        try {
            message.loading({ content: 'Menyiapkan dokumen rekapitulasi...', key: 'lpj_print_rekap' });
            
            const response = await apiFetch(
                `/lpj/${selectedSt.id}/export-rekap`,
                { method: "GET", headers: { Accept: "application/pdf" } }
            );

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
            console.error(err);
            message.error({ content: 'Gagal mencetak rekapitulasi.', key: 'lpj_print_rekap' });
        }
    };

    const handleSave = async () => {
        if (!selectedSt) return;
        const payload = {
            status: "final", keterangan: keterangan || null,
            bendahara_id: bendaharaId || null,
            items: Object.values(items).map((item) => {
                const row = {
                    employee_id: item.employee_id, employee_name: item.employee_name,
                    employee_nip: item.employee_nip, is_external: item.is_external,
                    nomor_spd: item.nomor_spd || null,
                };
                COMPONENTS.forEach(c => {
                    const data = item[c.key];
                    if (!data?.checked) {
                        row[c.key] = null;
                        return;
                    }
                    if (c.type === "departure_return") {
                        row[c.key + "_berangkat"] = data.berangkat || null;
                        row[c.key + "_pulang"]    = data.pulang || null;
                        row[c.key] = (fmt(data.berangkat) + fmt(data.pulang)) || null;
                    } else if (c.type === "rate_days" || c.type === "daily") {
                        const suffix = c.key === "uang_harian" ? "" : (c.key === "uang_penginapan" ? "" : "");
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
                        // simple (BBM)
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
            content: `Surat Tugas "${st.nomor_st || 'Draft'}" akan disembunyikan dari daftar LPJ. Surat Tugas itu sendiri TIDAK akan dihapus.`,
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
            content: `ST "${st.nomor_st || 'Draft'}" akan ditandai selesai — LPJ sudah dibuat di luar sistem.`,
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
        return [
            { key: "input", icon: <DollarOutlined />, label: "Input Biaya", onClick: () => fetchLpjDetail(record) },
            { key: "edit", icon: <EditOutlined />, label: "Edit Data LPJ", disabled: !record.lpj_status || isManual, onClick: () => fetchLpjDetail(record) },
            { type: "divider" },
            { key: "manual", icon: <CheckCircleFilled />, label: "LPJ Manual", disabled: isManual, onClick: () => handleMarkManual(record) },
            { key: "exclude", icon: <StopOutlined />, label: "Hapus dari Daftar", danger: true, onClick: () => handleExclude(record) },
        ];
    };

    const stColumns = [
        {
            title: "No ST", key: "nomor_st", width: 220,
            render: (_, r) => {
                const hasLpj = r.lpj_status === 'final' || r.lpj_status === 'manual';
                return (
                    <div className="klpj-st-cell">
                        <div className={`klpj-st-icon ${hasLpj ? 'has-lpj' : ''}`}>
                            {hasLpj ? <CheckCircleFilled /> : <FileProtectOutlined />}
                        </div>
                        <div className="klpj-st-info">
                            <div className="klpj-st-nomor">{r.nomor_st || "Draft ST"}</div>
                            <div className="klpj-st-date">{dateLabel(r.tanggal_st)}</div>
                        </div>
                    </div>
                );
            },
        },
        {
            title: "Info Perjalanan", key: "periode", width: 240,
            render: (_, r) => (
                <div className="klpj-trip-info">
                    <span className="klpj-trip-dates">
                        <CalendarOutlined /> {dateLabel(r.tanggal_mulai)} – {dateLabel(r.tanggal_selesai)}
                    </span>
                    <span className="klpj-trip-duration">{inclusiveDays(r.tanggal_mulai, r.tanggal_selesai)} Hari</span>
                </div>
            ),
        },
        {
            title: "Tujuan / Lokasi", key: "lokasi_tugas", width: 200,
            render: (_, r) => (
                <div className="klpj-lokasi-cell">
                    <EnvironmentOutlined />
                    <span>{r.lokasi_tugas || "-"}</span>
                </div>
            ),
        },
        {
            title: "Deskripsi Tugas", key: "deskripsi_tugas",
            render: (_, r) => (
                <div className="klpj-desc-cell" style={{ color: '#64748b', fontSize: '12.5px', lineHeight: '1.4', whiteSpace: 'pre-wrap', maxHeight: '4.2em', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.deskripsi_tugas || "-"}
                </div>
            ),
        },
        {
            title: "Aksi", key: "aksi", width: 70, align: "center",
            render: (_, r) => (
                <Dropdown menu={{ items: getMenuItems(r), className: "klpj-dropdown-menu" }} trigger={["click"]} placement="bottomRight">
                    <Button className="klpj-action-btn" icon={<MoreOutlined style={{ fontSize: 18 }} />} />
                </Dropdown>
            ),
        },
    ];

    const renderSubInputs = (empKey, compDef, compVal) => {
        const lockedRegion = isLockedRegion(selectedSt?.lokasi_tugas);

        if (compDef.type === "departure_return") {
            const total = fmt(compVal.berangkat) + fmt(compVal.pulang);
            return (
                <div className="klpj-sub-inputs">
                    <div className="klpj-sub-field">
                        <span className="klpj-sub-field-label">Berangkat</span>
                        <InputNumber
                            value={compVal.berangkat}
                            formatter={v => `Rp ${String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`}
                            parser={v => Number(v.replace(/Rp\s?|[.]/g, ""))}
                            onChange={val => updateSubValue(empKey, compDef.key, "berangkat", val)}
                            min={0} placeholder="0"
                        />
                    </div>
                    <span className="klpj-sub-plus">+</span>
                    <div className="klpj-sub-field">
                        <span className="klpj-sub-field-label">Pulang</span>
                        <InputNumber
                            value={compVal.pulang}
                            formatter={v => `Rp ${String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`}
                            parser={v => Number(v.replace(/Rp\s?|[.]/g, ""))}
                            onChange={val => updateSubValue(empKey, compDef.key, "pulang", val)}
                            min={0} placeholder="0"
                        />
                    </div>
                    <div className="klpj-sub-result">
                        <span className="klpj-sub-result-eq">=</span>
                        <span className="klpj-sub-result-value">{fmtRupiah(total)}</span>
                    </div>
                </div>
            );
        }

        if (compDef.type === "daily" && (compDef.key === "uang_harian" || compDef.key === "uang_harian_fullboard")) {
            const total = fmt(compVal.per_hari) * fmt(compVal.hari);
            const isUangHarian = compDef.key === "uang_harian";
            return (
                <div className="klpj-sub-inputs">
                    <div className="klpj-sub-field">
                        <span className="klpj-sub-field-label">
                            Tarif / Hari
                            {isUangHarian && lockedRegion && <span className="klpj-auto-rate-badge">Auto</span>}
                        </span>
                        <InputNumber
                            value={compVal.per_hari}
                            formatter={v => `Rp ${String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`}
                            parser={v => Number(v.replace(/Rp\s?|[.]/g, ""))}
                            onChange={val => updateSubValue(empKey, compDef.key, "per_hari", val)}
                            min={0} placeholder="0"
                            disabled={isUangHarian && lockedRegion}
                        />
                    </div>
                    <span className="klpj-sub-multiply">×</span>
                    <div className="klpj-sub-field">
                        <span className="klpj-sub-field-label">Jumlah Hari</span>
                        <InputNumber
                            value={compVal.hari}
                            onChange={val => updateSubValue(empKey, compDef.key, "hari", val)}
                            min={0} placeholder="0"
                        />
                    </div>
                    <div className="klpj-sub-result">
                        <span className="klpj-sub-result-eq">=</span>
                        <span className="klpj-sub-result-value">{fmtRupiah(total)}</span>
                    </div>
                </div>
            );
        }

        if (compDef.type === "rate_days") {
            const rateLabel = compDef.key === "uang_penginapan" ? "Tarif / Malam" : "Tarif Harian";
            const daysLabel = compDef.key === "uang_penginapan" ? "Jumlah Malam" : "Jumlah Hari";
            const total = fmt(compVal.per_hari) * fmt(compVal.hari);
            return (
                <div className="klpj-sub-inputs">
                    <div className="klpj-sub-field">
                        <span className="klpj-sub-field-label">{rateLabel}</span>
                        <InputNumber
                            value={compVal.per_hari}
                            formatter={v => `Rp ${String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`}
                            parser={v => Number(v.replace(/Rp\s?|[.]/g, ""))}
                            onChange={val => updateSubValue(empKey, compDef.key, "per_hari", val)}
                            min={0} placeholder="0"
                        />
                    </div>
                    <span className="klpj-sub-multiply">×</span>
                    <div className="klpj-sub-field">
                        <span className="klpj-sub-field-label">{daysLabel}</span>
                        <InputNumber
                            value={compVal.hari}
                            onChange={val => updateSubValue(empKey, compDef.key, "hari", val)}
                            min={0} placeholder="0"
                        />
                    </div>
                    <div className="klpj-sub-result">
                        <span className="klpj-sub-result-eq">=</span>
                        <span className="klpj-sub-result-value">{fmtRupiah(total)}</span>
                    </div>
                </div>
            );
        }

        // simple (BBM)
        return (
            <div className="klpj-sub-inputs">
                <div className="klpj-sub-field">
                    <span className="klpj-sub-field-label">Nominal</span>
                    <InputNumber
                        value={compVal.value}
                        formatter={v => `Rp ${String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`}
                        parser={v => Number(v.replace(/Rp\s?|[.]/g, ""))}
                        onChange={val => updateSubValue(empKey, compDef.key, "value", val)}
                        min={0} placeholder="0"
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="module-section">
            {/* ── Header ── */}
            <div className="module-toolbar">
                <div>
                    <Title level={3} className="module-title">Keuangan — LPJ</Title>
                    <span className="module-subtitle">Kelola pertanggungjawaban biaya perjalanan dinas secara terpadu.</span>
                </div>
                <Button icon={<ReloadOutlined />} onClick={() => fetchSt(1)}>Segarkan</Button>
            </div>

            {/* ── Table Card ── */}
            <Card className="klpj-table-card" variant="borderless">
                <div className="klpj-table-toolbar">
                    <div className="klpj-table-title">
                        <Title level={4}>Surat Tugas Siap LPJ</Title>
                        <Tag className="klpj-count-tag">{stPagination.total} Item</Tag>
                    </div>
                    <Input
                        className="klpj-search-input"
                        placeholder="Cari nomor, lokasi, atau pegawai..."
                        prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        allowClear
                    />
                </div>
                <Table
                    className="klpj-table"
                    dataSource={stList}
                    columns={stColumns}
                    rowKey="id"
                    size="middle"
                    loading={stLoading}
                    pagination={{
                        current: stPagination.current, pageSize: stPagination.pageSize,
                        total: stPagination.total, onChange: (page) => fetchSt(page), position: ['bottomCenter'],
                    }}
                />
            </Card>

            {/* ── Modal Input Biaya ── */}
            <Modal
                title={null} open={modalVisible} onCancel={() => setModalVisible(false)}
                footer={null} width={1100} centered destroyOnClose zIndex={2000}
                className="klpj-modal"
            >
                {/* Modal Header */}
                <div className="klpj-modal-header">
                    <div className="klpj-modal-header-left">
                        <div className="klpj-modal-icon-badge"><DollarOutlined /></div>
                        <div>
                            <Title level={4} className="klpj-modal-title">Input Komponen Biaya LPJ</Title>
                            <span className="klpj-modal-st-number">{selectedSt?.nomor_st || "ST Baru"}</span>
                        </div>
                    </div>
                    <div className="klpj-modal-header-actions">
                        {lpjData && <Button className="klpj-modal-delete-btn" icon={<DeleteOutlined />} onClick={handleDeleteLpj}>Hapus LPJ</Button>}
                        <Button type="text" className="klpj-modal-close-btn" icon={<CloseOutlined />} onClick={() => setModalVisible(false)} />
                    </div>
                </div>

                {/* Modal Body */}
                <div className="klpj-modal-body">
                    <Spin spinning={lpjLoading}>


                        {/* Info Card */}
                        <div className="klpj-info-card">
                            <div className="klpj-info-item">
                                <span className="klpj-info-label">Tujuan / Lokasi</span>
                                <div className="klpj-info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <EnvironmentOutlined style={{ color: 'var(--color-danger)' }} />
                                    <span>{selectedSt?.lokasi_tugas || "-"}</span>
                                </div>
                            </div>
                            <div className="klpj-info-item">
                                <span className="klpj-info-label">Periode Perjalanan</span>
                                <div className="klpj-info-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <CalendarOutlined style={{ color: 'var(--color-primary)' }} />
                                    <span>{dateLabel(selectedSt?.tanggal_mulai)} – {dateLabel(selectedSt?.tanggal_selesai)}</span>
                                    <span className="klpj-trip-duration" style={{ marginLeft: 6 }}>
                                        {inclusiveDays(selectedSt?.tanggal_mulai, selectedSt?.tanggal_selesai)} Hari
                                    </span>
                                </div>
                            </div>
                            <div className="klpj-info-item">
                                <span className="klpj-info-label">Status LPJ</span>
                                <div className="klpj-info-value">
                                    <Tag color={LPJ_STATUS[lpjStatus]?.color || "default"}>
                                        {LPJ_STATUS[lpjStatus]?.label || "Belum Ada"}
                                    </Tag>
                                </div>
                            </div>
                            <div className="klpj-info-item">
                                <span className="klpj-info-label">Bendahara Pengeluaran</span>
                                <div className="klpj-info-value" style={{ marginTop: 2 }}>
                                    <Select
                                        showSearch
                                        style={{ width: '100%', minWidth: 200 }}
                                        placeholder="Pilih Bendahara..."
                                        optionFilterProp="label"
                                        value={bendaharaId}
                                        onChange={(val) => setBendaharaId(val)}
                                        options={employees.map(emp => ({
                                            value: emp.id,
                                            label: `${emp.name} (NIP. ${emp.nip ?? '-'})`
                                        }))}
                                        allowClear
                                        size="small"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Split Pane Layout */}
                        <div className="klpj-modal-split-container">
                            {/* Left Sidebar: Employee List */}
                            <div className="klpj-modal-sidebar">
                                <div className="klpj-sidebar-header">
                                    <Input
                                        className="klpj-sidebar-search"
                                        placeholder="Cari pegawai..."
                                        prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                                        value={sidebarSearch}
                                        onChange={e => setSidebarSearch(e.target.value)}
                                        allowClear
                                    />
                                </div>
                                <div className="klpj-employee-list">
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
                                                    className={`klpj-employee-card${isActive ? ' active' : ''}`}
                                                    onClick={() => setActiveEmployeeKey(key)}
                                                >
                                                    <div className="klpj-employee-card-avatar">
                                                        <UserOutlined />
                                                    </div>
                                                    <div className="klpj-employee-card-info">
                                                        <div className="klpj-employee-card-name">{item.employee_name}</div>
                                                        <div className="klpj-employee-card-sub">
                                                            {item.employee_nip || "NON-NIP"}
                                                            {item.is_external && <Tag color="gold" className="klpj-emp-ext-tag">EKSTERNAL</Tag>}
                                                        </div>
                                                        <div className="klpj-employee-card-badges">
                                                            {COMPONENTS.map(c => {
                                                                if (item[c.key]?.checked) {
                                                                    return (
                                                                        <span
                                                                            key={c.key}
                                                                            className="klpj-mini-badge"
                                                                            style={{ backgroundColor: c.color }}
                                                                            title={c.label}
                                                                        />
                                                                    );
                                                                }
                                                                return null;
                                                            })}
                                                        </div>
                                                    </div>
                                                    <div className="klpj-employee-card-price">
                                                        {fmtRupiah(total)}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>

                            {/* Right Content Area: Cost Components */}
                            <div className="klpj-modal-detail-pane">
                                {activeEmployeeKey && items[activeEmployeeKey] ? (
                                    (() => {
                                        const activeEmployee = items[activeEmployeeKey];
                                        return (
                                            <div className="klpj-detail-container">
                                                <div className="klpj-detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div>
                                                        <Title level={4} className="klpj-detail-title" style={{ margin: 0 }}>
                                                            Rincian Biaya: {activeEmployee.employee_name}
                                                        </Title>
                                                        <span className="klpj-detail-subtitle">
                                                            {activeEmployee.employee_nip || "NON-NIP"} {activeEmployee.is_external && <Tag color="gold" style={{ marginLeft: 6 }}>EKSTERNAL</Tag>}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <Button 
                                                            type="primary" 
                                                            style={{ backgroundColor: '#0F5B99', borderColor: '#0F5B99' }}
                                                            icon={<FileProtectOutlined />} 
                                                            onClick={() => handlePrintSingle(activeEmployee)}
                                                            disabled={!lpjData}
                                                            title={!lpjData ? "Simpan data LPJ terlebih dahulu" : "Cetak rincian biaya pegawai ini"}
                                                            size="middle"
                                                        >
                                                            Cetak Rincian
                                                        </Button>
                                                        {isPalopo(selectedSt?.lokasi_tugas) && (
                                                            <Button 
                                                                type="primary" 
                                                                style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                                                                icon={<FileProtectOutlined />} 
                                                                onClick={() => handlePrintRill(activeEmployee)}
                                                                disabled={!lpjData}
                                                                title={!lpjData ? "Simpan data LPJ terlebih dahulu" : "Cetak pengeluaran riil pegawai ini"}
                                                                size="middle"
                                                            >
                                                                Cetak Pengeluaran Riil
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Nomor SPD</span>
                                                    <Input 
                                                        style={{ flex: 1, borderRadius: '6px' }}
                                                        placeholder="Masukkan nomor lampiran SPD (contoh: PW.01.10.51B.06.26.238B)" 
                                                        value={activeEmployee.nomor_spd || ""}
                                                        onChange={e => updateItemProperty(activeEmployeeKey, "nomor_spd", e.target.value)}
                                                    />
                                                </div>

                                                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center', background: '#f8fafc', padding: '6px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                    <Radio.Group 
                                                        value={filterKey} 
                                                        onChange={e => setFilterKey(e.target.value)} 
                                                        buttonStyle="solid" 
                                                        size="middle"
                                                        style={{ width: '100%', display: 'flex' }}
                                                    >
                                                        <Radio.Button value="all" style={{ flex: 1, textAlign: 'center', borderRadius: '6px 0 0 6px' }}>Semua</Radio.Button>
                                                        <Radio.Button value="transport" style={{ flex: 1, textAlign: 'center' }}>Transport</Radio.Button>
                                                        <Radio.Button value="harian" style={{ flex: 1, textAlign: 'center' }}>Uang Harian</Radio.Button>
                                                        <Radio.Button value="penginapan" style={{ flex: 1, textAlign: 'center', borderRadius: '0 6px 6px 0' }}>Penginapan</Radio.Button>
                                                    </Radio.Group>
                                                </div>

                                                <div className="klpj-detail-items-list">
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
                                                            <div className={`klpj-detail-item-card${compVal.checked ? ' active' : ''}`} key={c.key}>
                                                                {/* Top row: icon + label + toggle */}
                                                                <div className="klpj-detail-item-top">
                                                                    <div className="klpj-detail-item-left">
                                                                        <div className="klpj-detail-item-icon" style={{ backgroundColor: c.color + "15", color: c.color }}>
                                                                            {getIconForComponent(c.key)}
                                                                        </div>
                                                                        <div className="klpj-detail-item-text">
                                                                            <span className="klpj-detail-item-label">{c.label}</span>
                                                                            <span className="klpj-detail-item-desc">{getDescForComponent(c.key)}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="klpj-detail-item-right">
                                                                        <div className="klpj-detail-item-toggle-wrap">
                                                                            <span className="klpj-detail-item-status-text">
                                                                                {compVal.checked ? fmtRupiah(compTotal) : "Non-aktif"}
                                                                            </span>
                                                                            <Switch
                                                                                size="medium"
                                                                                checked={compVal.checked}
                                                                                onChange={checked => toggleComponent(activeEmployeeKey, c.key, checked)}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {/* Sub-inputs area — full width below top row */}
                                                                {compVal.checked && (
                                                                    <div className="klpj-detail-item-sub-area">
                                                                        {renderSubInputs(activeEmployeeKey, c, compVal)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                <div className="klpj-detail-summary-card">
                                                    <span className="klpj-detail-summary-label">Subtotal Pegawai:</span>
                                                    <span className="klpj-detail-summary-value">{fmtRupiah(calcTotal(activeEmployee))}</span>
                                                </div>
                                            </div>
                                        );
                                    })()
                                ) : (
                                    <div className="klpj-detail-empty">
                                        <InfoCircleOutlined style={{ fontSize: 36, color: '#94a3b8', marginBottom: 12 }} />
                                        <div>Pilih pegawai di sebelah kiri untuk menginput rincian biaya LPJ.</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Grand Total Summary Banner */}
                        <div className="klpj-grand-total-banner">
                            <div className="klpj-grand-total-banner-left">
                                <span className="klpj-grand-total-banner-label">Total Seluruh LPJ:</span>
                                <span className="klpj-grand-total-banner-value">{fmtRupiah(grandTotal)}</span>
                            </div>
                            <div className="klpj-grand-total-banner-right">
                                <Tag className="klpj-grand-total-badge">{Object.keys(items).length} Pegawai Terdaftar</Tag>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="klpj-modal-footer">
                            <div>
                                {lpjData && (
                                    <Space size="middle">
                                        <Button 
                                            icon={<FileProtectOutlined />} 
                                            onClick={handlePrintAll}
                                            style={{ borderRadius: '6px' }}
                                        >
                                            Cetak Semua Rincian
                                        </Button>
                                        {isPalopo(selectedSt?.lokasi_tugas) && (
                                            <Button 
                                                icon={<FileProtectOutlined />} 
                                                style={{ color: '#059669', borderColor: '#059669', borderRadius: '6px' }}
                                                onClick={handlePrintAllRill}
                                            >
                                                Cetak Pengeluaran Riil
                                            </Button>
                                        )}
                                        <Button 
                                            icon={<FileProtectOutlined />} 
                                            onClick={handlePrintRekap}
                                            style={{ borderRadius: '6px' }}
                                        >
                                            Cetak Rekapitulasi
                                        </Button>
                                    </Space>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <Button onClick={() => setModalVisible(false)} style={{ borderRadius: '6px' }}>Batal</Button>
                                <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave} style={{ backgroundColor: '#0F5B99', borderColor: '#0F5B99', borderRadius: '6px' }}>
                                    Simpan Laporan Biaya
                                </Button>
                            </div>
                        </div>
                    </Spin>
                </div>
            </Modal>
        </div>
    );
}
