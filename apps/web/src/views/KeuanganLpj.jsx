import { useState, useEffect, useCallback, useMemo } from "react";
import {
    Table, Button, Space, Input, Modal,
    message, Row, Col, InputNumber,
    Spin, Dropdown, Switch, DatePicker, Tooltip,
    Popover, Typography, Card, Select, Empty,
} from "antd";
import {
    SearchOutlined, ReloadOutlined, SaveOutlined,
    CalendarOutlined, DollarOutlined,
    EditOutlined, DeleteOutlined, CloseOutlined,
    MoreOutlined, CheckCircleFilled, StopOutlined,
    CompassOutlined, CarOutlined, SendOutlined,
    HomeOutlined, InfoCircleOutlined, PlusOutlined,
    PrinterOutlined, FilterOutlined, DownOutlined, UpOutlined,
    FileTextOutlined, CopyOutlined, CheckOutlined,
    ThunderboltOutlined, TeamOutlined, ClockCircleOutlined,
    EnvironmentOutlined, ArrowUpOutlined, ArrowDownOutlined,
    ArrowLeftOutlined, ArrowRightOutlined,
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
    { key: "uang_transport_taxi",       label: "Transport Taxi / Bandara", type: "transport_multi" },
    { key: "uang_transport_bus",        label: "Transport Bus",            type: "transport_multi" },
    { key: "uang_transport_pesawat",    label: "Transport Pesawat",        type: "transport_multi" },
    { key: "uang_transport_umum",       label: "Transport (Umum)",         type: "transport_multi" },
    { key: "uang_transport_bbm",        label: "Transport BBM",            type: "transport_multi" },
    { key: "uang_transport_lokal",      label: "Transport Lokal",          type: "transport_multi" },
    { key: "uang_transport_sewa_mobil", label: "Transport Sewa Mobil",     type: "rate_days" },
    { key: "uang_harian",               label: "Uang Harian",              type: "daily" },
    { key: "uang_penginapan",           label: "Penginapan / Hotel",       type: "rate_days" },
    { key: "uang_fullboard",            label: "Paket Fullboard",          type: "simple" },
    { key: "uang_harian_fullboard",     label: "Uang Harian Fullboard",    type: "daily" },
];

const LPJ_STATUS = {
    null:    { label: "Belum Dibuat", dot: "belum" },
    draft:   { label: "Draft LPJ",    dot: "draft" },
    final:   { label: "LPJ Selesai",  dot: "final" },
    manual:  { label: "LPJ Manual",   dot: "manual" },
};

const KKP_STATUS = {
    null:    { label: "Belum Dibuat", dot: "belum" },
    draft:   { label: "Draft KKP",    dot: "draft" },
    final:   { label: "KKP Selesai",  dot: "final" },
    manual:  { label: "KKP Manual",   dot: "manual" },
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
    const [searchInput, setSearchInput] = useState("");
    const [appliedSearch, setAppliedSearch] = useState("");
    const [filterLpjStatus, setFilterLpjStatus] = useState("ALL");
    const [dateRange, setDateRange] = useState(null);
    const [datePopoverOpen, setDatePopoverOpen] = useState(false);

    const [selectedSt, setSelectedSt] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState("lpj"); // 'lpj' | 'kkp'
    const [lpjData, setLpjData] = useState(null);
    const [kkpData, setKkpData] = useState(null);
    const [referenceLpjData, setReferenceLpjData] = useState(null);
    const [lpjLoading, setLpjLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [items, setItems] = useState({});
    const [currentStatus, setCurrentStatus] = useState("draft");
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

    // Fetch employees for autocomplete / selection
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

    // Search debounce
    useEffect(() => {
        const t = setTimeout(() => setAppliedSearch(searchInput.trim()), 300);
        return () => clearTimeout(t);
    }, [searchInput]);

    // Fetch ST & LPJ list
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

    // Quick filter metrics
    const metrics = useMemo(() => {
        return {
            total: stList.length,
            lpjFinal: stList.filter(s => s.lpj_status === "final").length,
            lpjDraft: stList.filter(s => s.lpj_status === "draft").length,
            lpjBelum: stList.filter(s => !s.lpj_status).length,
            kkpFinal: stList.filter(s => s.kkp_status === "final").length,
            kkpDraft: stList.filter(s => s.kkp_status === "draft").length,
            kkpBelum: stList.filter(s => !s.kkp_status).length,
        };
    }, [stList]);

    // Filtered data list
    const displayedStList = useMemo(() => {
        let list = stList;
        if (filterLpjStatus !== "ALL") {
            list = list.filter((st) => {
                const statusLpj = st.lpj_status;
                const statusKkp = st.kkp_status;
                if (filterLpjStatus === "LPJ_FINAL") return statusLpj === "final";
                if (filterLpjStatus === "LPJ_DRAFT") return statusLpj === "draft";
                if (filterLpjStatus === "LPJ_BELUM") return !statusLpj;
                if (filterLpjStatus === "KKP_FINAL") return statusKkp === "final";
                if (filterLpjStatus === "KKP_DRAFT") return statusKkp === "draft";
                if (filterLpjStatus === "KKP_BELUM") return !statusKkp;
                return true;
            });
        }
        if (appliedSearch) {
            const s = appliedSearch.toLowerCase();
            list = list.filter((st) => {
                return (
                    (st.nomor_st && st.nomor_st.toLowerCase().includes(s)) ||
                    (st.lokasi_tugas && st.lokasi_tugas.toLowerCase().includes(s)) ||
                    (st.deskripsi_tugas && st.deskripsi_tugas.toLowerCase().includes(s)) ||
                    (st.mak && st.mak.toLowerCase().includes(s)) ||
                    (st.employees && st.employees.some(e => e.name && e.name.toLowerCase().includes(s)))
                );
            });
        }
        if (dateRange && dateRange[0] && dateRange[1]) {
            const start = dateRange[0].startOf("day");
            const end = dateRange[1].endOf("day");
            list = list.filter((st) => {
                if (!st.tanggal_mulai) return false;
                const d = dayjs(st.tanggal_mulai);
                return (d.isAfter(start) || d.isSame(start)) && (d.isBefore(end) || d.isSame(end));
            });
        }
        return list;
    }, [stList, filterLpjStatus, appliedSearch, dateRange]);

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
            message.success(`${empObj.name} ditambahkan.`);
        }
    };

    const handleMoveEmployee = (empKey, direction) => {
        const keys = Object.keys(items);
        const currentIndex = keys.indexOf(empKey);
        if (currentIndex === -1) return;
        
        const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= keys.length) return;

        const newKeys = [...keys];
        const temp = newKeys[currentIndex];
        newKeys[currentIndex] = newKeys[targetIndex];
        newKeys[targetIndex] = temp;

        const newItems = {};
        const newEmpIds = [];
        newKeys.forEach((k, idx) => {
            const it = items[k];
            const letter = String.fromCharCode(65 + idx);
            newItems[k] = {
                ...it,
                nomor_spd: selectedSt?.nomor_st ? `${selectedSt.nomor_st}${letter}` : it.nomor_spd,
            };
            if (it.employee_id) {
                newEmpIds.push(it.employee_id);
            }
        });

        setItems(newItems);
        setSelectedEmployeeIds(newEmpIds);
        message.success(`Urutan pegawai '${items[empKey]?.employee_name || 'pegawai'}' berhasil dipindahkan.`);
    };

    const handleRemoveEmployee = (empKey) => {
        const itemToRemove = items[empKey];
        if (!itemToRemove) return;

        Modal.confirm({
            title: `Hapus Pegawai dari ${modalType === 'kkp' ? 'KKP' : 'LPJ'}?`,
            content: `Apakah Anda yakin ingin menghapus ${itemToRemove.employee_name} beserta seluruh rincian biayanya?`,
            okText: "Hapus",
            okButtonProps: { danger: true },
            cancelText: "Batal",
            onOk: () => {
                setItems(prev => {
                    const remainingKeys = Object.keys(prev).filter(k => k !== empKey);
                    const next = {};
                    const newEmpIds = [];
                    remainingKeys.forEach((k, idx) => {
                        const it = prev[k];
                        const letter = String.fromCharCode(65 + idx);
                        next[k] = {
                            ...it,
                            nomor_spd: selectedSt?.nomor_st ? `${selectedSt.nomor_st}${letter}` : it.nomor_spd,
                        };
                        if (it.employee_id) newEmpIds.push(it.employee_id);
                    });
                    if (activeEmployeeKey === empKey) {
                        setActiveEmployeeKey(remainingKeys.length ? remainingKeys[0] : null);
                    }
                    setSelectedEmployeeIds(newEmpIds);
                    return next;
                });
                message.success(`${itemToRemove.employee_name} dihapus.`);
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

    const initItemsFromSt = (st) => {
        const lokasi = st?.lokasi_tugas ?? "";
        const autoRate = getLockedRate(lokasi);
        const days = inclusiveDays(st.tanggal_mulai, st.tanggal_selesai);
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
            COMPONENTS.forEach(c => { 
                const comp = emptyComp(c.type, c.key === "uang_harian" ? autoRate : 0);
                if (c.key === "uang_harian" && autoRate > 0 && days > 0) {
                    comp.checked = true;
                    comp.hari = days;
                    comp.per_hari = autoRate;
                }
                entry[c.key] = comp; 
            });
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
            COMPONENTS.forEach(c => { 
                const comp = emptyComp(c.type, c.key === "uang_harian" ? autoRate : 0);
                if (c.key === "uang_harian" && autoRate > 0 && days > 0) {
                    comp.checked = true;
                    comp.hari = days;
                    comp.per_hari = autoRate;
                }
                entry[c.key] = comp; 
            });
            map[`ext_${ext.name}_${idx}`] = entry;
            totalIndex++;
        });

        setItems(map);
        const firstKey = Object.keys(map)[0];
        setActiveEmployeeKey(firstKey || null);
    };

    // ── Fetch LPJ Detail ──
    const fetchLpjDetail = useCallback(async (st) => {
        setLpjLoading(true);
        setSelectedSt(st);
        setModalType("lpj");
        setModalVisible(true);
        setItems({});
        setLpjData(null);
        setCurrentStatus("draft");
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
            setCurrentStatus(json.lpj?.status ?? "draft");
            setKeterangan(json.lpj?.keterangan ?? "");
            setMak(currentSt.mak ?? st.mak ?? "");
            setTanggalMulai(currentSt.tanggal_mulai ? dayjs(currentSt.tanggal_mulai).format("YYYY-MM-DD") : (st.tanggal_mulai ? dayjs(st.tanggal_mulai).format("YYYY-MM-DD") : ""));
            setTanggalSelesai(currentSt.tanggal_selesai ? dayjs(currentSt.tanggal_selesai).format("YYYY-MM-DD") : (st.tanggal_selesai ? dayjs(st.tanggal_selesai).format("YYYY-MM-DD") : ""));
            setLokasiTugas(currentSt.lokasi_tugas ?? st.lokasi_tugas ?? "");
            const stEmployees = currentSt.employees ?? st.employees ?? [];
            const stEmpIds = stEmployees.map(e => Number(e.id));
            setSelectedEmployeeIds(stEmpIds);
            setBendaharaId(json.lpj?.bendahara_id ?? null);
            const lokasi = currentSt.lokasi_tugas ?? "";
            
            if (json.lpj?.items?.length) {
                const map = {};
                // Urutkan item database: prioritas urutan pegawai persis sesuai Surat Tugas
                const sortedItems = [...json.lpj.items].sort((a, b) => {
                    const idxA = a.employee_id ? stEmpIds.indexOf(Number(a.employee_id)) : 9999;
                    const idxB = b.employee_id ? stEmpIds.indexOf(Number(b.employee_id)) : 9999;
                    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                    if (idxA !== -1) return -1;
                    if (idxB !== -1) return 1;
                    return 0;
                });

                sortedItems.forEach((item, idx) => {
                    const key = item.employee_id ? `emp_${item.employee_id}` : `ext_${item.employee_name}_${idx}`;
                    const parsed = parseItemFromDb(item, lokasi);
                    const letter = String.fromCharCode(65 + idx);
                    if ((!parsed.nomor_spd || parsed.nomor_spd.startsWith(currentSt.nomor_st)) && currentSt.nomor_st) {
                        parsed.nomor_spd = `${currentSt.nomor_st}${letter}`;
                    }
                    map[key] = parsed;
                });
                setItems(map);
                const firstKey = Object.keys(map)[0];
                setActiveEmployeeKey(firstKey || null);
            } else {
                initItemsFromSt(currentSt);
            }
        } catch (err) {
            console.error("LPJ Fetch Error:", err);
            message.error("Gagal memuat data LPJ: " + err.message);
        } finally {
            setLpjLoading(false);
        }
    }, [apiFetch]);

    // ── Fetch KKP Detail ──
    const fetchKkpDetail = useCallback(async (st) => {
        setLpjLoading(true);
        setSelectedSt(st);
        setModalType("kkp");
        setModalVisible(true);
        setItems({});
        setKkpData(null);
        setReferenceLpjData(null);
        setSelectedEmployeeIds((st.employees ?? []).map(e => e.id));
        setBendaharaId(null);
        setFilterKey("all");
        try {
            const res = await apiFetch(`/kkp/${st.id}`);
            const json = await res.json();
            const currentSt = json.surat_tugas ?? st;
            setKkpData(json.kkp);
            setReferenceLpjData(json.lpj);
            setCurrentStatus(json.kkp?.status ?? "draft");
            setKeterangan(json.kkp?.keterangan ?? "");
            setMak(currentSt.mak ?? st.mak ?? "");
            setTanggalMulai(currentSt.tanggal_mulai ? dayjs(currentSt.tanggal_mulai).format("YYYY-MM-DD") : (st.tanggal_mulai ? dayjs(st.tanggal_mulai).format("YYYY-MM-DD") : ""));
            setTanggalSelesai(currentSt.tanggal_selesai ? dayjs(currentSt.tanggal_selesai).format("YYYY-MM-DD") : (st.tanggal_selesai ? dayjs(st.tanggal_selesai).format("YYYY-MM-DD") : ""));
            setLokasiTugas(currentSt.lokasi_tugas ?? st.lokasi_tugas ?? "");
            const stEmployees = currentSt.employees ?? st.employees ?? [];
            const stEmpIds = stEmployees.map(e => Number(e.id));
            setSelectedEmployeeIds(stEmpIds);
            setBendaharaId(json.kkp?.bendahara_id ?? null);
            const lokasi = currentSt.lokasi_tugas ?? "";
            
            if (json.kkp?.items?.length) {
                const map = {};
                // Urutkan item database: prioritas urutan pegawai persis sesuai Surat Tugas
                const sortedItems = [...json.kkp.items].sort((a, b) => {
                    const idxA = a.employee_id ? stEmpIds.indexOf(Number(a.employee_id)) : 9999;
                    const idxB = b.employee_id ? stEmpIds.indexOf(Number(b.employee_id)) : 9999;
                    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                    if (idxA !== -1) return -1;
                    if (idxB !== -1) return 1;
                    return 0;
                });

                sortedItems.forEach((item, idx) => {
                    const key = item.employee_id ? `emp_${item.employee_id}` : `ext_${item.employee_name}_${idx}`;
                    const parsed = parseItemFromDb(item, lokasi);
                    const letter = String.fromCharCode(65 + idx);
                    if ((!parsed.nomor_spd || parsed.nomor_spd.startsWith(currentSt.nomor_st)) && currentSt.nomor_st) {
                        parsed.nomor_spd = `${currentSt.nomor_st}${letter}`;
                    }
                    map[key] = parsed;
                });
                setItems(map);
                const firstKey = Object.keys(map)[0];
                setActiveEmployeeKey(firstKey || null);
            } else {
                initItemsFromSt(currentSt);
            }
        } catch (err) {
            console.error("KKP Fetch Error:", err);
            message.error("Gagal memuat data KKP: " + err.message);
        } finally {
            setLpjLoading(false);
        }
    }, [apiFetch]);

    // ── Helper: Salin Baseline dari LPJ ke KKP ──
    const handleCopyFromLpj = async () => {
        if (!selectedSt) return;
        try {
            let lpjItems = referenceLpjData?.items;
            if (!lpjItems || lpjItems.length === 0) {
                const res = await apiFetch(`/lpj/${selectedSt.id}`);
                const json = await res.json();
                lpjItems = json.lpj?.items;
            }

            if (!lpjItems || lpjItems.length === 0) {
                message.warning("Belum ada data LPJ yang tersimpan untuk disalin.");
                return;
            }

            const lokasi = selectedSt?.lokasi_tugas ?? "";
            const map = {};
            lpjItems.forEach((item) => {
                const key = item.employee_id ? `emp_${item.employee_id}` : `ext_${item.employee_name}`;
                map[key] = parseItemFromDb(item, lokasi);
            });
            setItems(map);
            const firstKey = Object.keys(map)[0];
            setActiveEmployeeKey(firstKey || null);
            message.success("Rincian biaya berhasil disalin dari LPJ ke KKP.");
        } catch (err) {
            message.error("Gagal menyalin data LPJ: " + err.message);
        }
    };

    const toggleComponent = (empKey, compKey, checked) => {
        setItems((prev) => {
            const existing = prev[empKey][compKey];
            let updated;
            if (checked) {
                const rate = getLockedRate(lokasiTugas || selectedSt?.lokasi_tugas);
                const days = inclusiveDays(tanggalMulai, tanggalSelesai);
                if (compKey === "uang_harian") {
                    updated = {
                        ...existing,
                        checked: true,
                        per_hari: rate > 0 ? rate : (existing.per_hari || 0),
                        hari: existing.hari > 0 ? existing.hari : (days > 0 ? days : 1),
                    };
                } else if (compKey === "uang_penginapan") {
                    updated = {
                        ...existing,
                        checked: true,
                        hari: existing.hari > 0 ? existing.hari : (days > 1 ? days - 1 : 1),
                    };
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

    const addTransportItem = (empKey, compKey, defaultRincian = "") => {
        setItems((prev) => {
            const existing = prev[empKey]?.[compKey];
            const currentItems = Array.isArray(existing?.items) ? [...existing.items] : [];
            currentItems.push({
                id: Date.now() + Math.random(),
                nominal: 0,
                rincian: defaultRincian,
                keterangan: "",
            });
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

    // Quick calculate helper for Uang Harian
    const handleQuickCalculateHarian = (empKey) => {
        const rate = getLockedRate(lokasiTugas || selectedSt?.lokasi_tugas) || 430000;
        const days = inclusiveDays(tanggalMulai, tanggalSelesai) || 1;
        setItems((prev) => {
            const current = prev[empKey]?.uang_harian || {};
            return {
                ...prev,
                [empKey]: {
                    ...prev[empKey],
                    uang_harian: {
                        ...current,
                        checked: true,
                        per_hari: rate,
                        hari: days,
                    }
                }
            };
        });
        message.success(`Uang harian dihitung: ${days} Hari × ${fmtRupiah(rate)}`);
    };

    // Quick calculate helper for Hotel
    const handleQuickCalculateHotel = (empKey) => {
        const days = inclusiveDays(tanggalMulai, tanggalSelesai);
        const nights = Math.max(days - 1, 1);
        setItems((prev) => {
            const current = prev[empKey]?.uang_penginapan || {};
            return {
                ...prev,
                [empKey]: {
                    ...prev[empKey],
                    uang_penginapan: {
                        ...current,
                        checked: true,
                        hari: nights,
                    }
                }
            };
        });
        message.success(`Jumlah malam diatur: ${nights} Malam`);
    };

    // Print handlers
    const handlePrintSingle = async (employee) => {
        if (!selectedSt || !lpjData) return;
        try {
            message.loading({ content: "Menyiapkan dokumen PDF...", key: "lpj_print" });
            const params = new URLSearchParams();
            if (employee.employee_id) params.set("employee_id", employee.employee_id);
            else params.set("employee_name", employee.employee_name);

            const response = await apiFetch(`/lpj/${selectedSt.id}/export-pdf?${params}`, {
                method: "GET", headers: { Accept: "application/pdf" }
            });
            if (!response.ok) throw new Error("Gagal mengunduh dokumen");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Rincian_Biaya_LPJ_${employee.employee_name.replace(/\s+/g, "_")}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            message.success({ content: "Dokumen berhasil diunduh.", key: "lpj_print" });
        } catch {
            message.error({ content: "Gagal mencetak dokumen.", key: "lpj_print" });
        }
    };

    const handlePrintAll = async () => {
        if (!selectedSt || !lpjData) return;
        try {
            message.loading({ content: "Menyiapkan seluruh dokumen PDF...", key: "lpj_print_all" });
            const response = await apiFetch(`/lpj/${selectedSt.id}/export-pdf`, {
                method: "GET", headers: { Accept: "application/pdf" }
            });
            if (!response.ok) throw new Error("Gagal mengunduh dokumen");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const safeNomorSt = selectedSt.nomor_st ? selectedSt.nomor_st.replace(/[\/\\]/g, "_") : selectedSt.id;
            a.download = `Rincian_Biaya_LPJ_Semua_${safeNomorSt}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            message.success({ content: "Seluruh dokumen berhasil diunduh.", key: "lpj_print_all" });
        } catch {
            message.error({ content: "Gagal mencetak dokumen.", key: "lpj_print_all" });
        }
    };

    const handlePrintRill = async (employee) => {
        if (!selectedSt || !lpjData) return;
        try {
            message.loading({ content: "Menyiapkan dokumen...", key: "lpj_print_rill" });
            const params = new URLSearchParams();
            if (employee.employee_id) params.set("employee_id", employee.employee_id);
            else params.set("employee_name", employee.employee_name);

            const response = await apiFetch(`/lpj/${selectedSt.id}/export-rill?${params}`, {
                method: "GET", headers: { Accept: "application/pdf" }
            });
            if (!response.ok) throw new Error("Gagal mengunduh dokumen");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Daftar_Pengeluaran_Riil_${employee.employee_name.replace(/\s+/g, "_")}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            message.success({ content: "Dokumen Pengeluaran Riil berhasil diunduh.", key: "lpj_print_rill" });
        } catch {
            message.error({ content: "Gagal mencetak dokumen.", key: "lpj_print_rill" });
        }
    };

    const handlePrintAllRill = async () => {
        if (!selectedSt || !lpjData) return;
        try {
            message.loading({ content: "Menyiapkan dokumen...", key: "lpj_print_all_rill" });
            const response = await apiFetch(`/lpj/${selectedSt.id}/export-rill`, {
                method: "GET", headers: { Accept: "application/pdf" }
            });
            if (!response.ok) throw new Error("Gagal mengunduh dokumen");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const safeNomorSt = selectedSt.nomor_st ? selectedSt.nomor_st.replace(/[\/\\]/g, "_") : selectedSt.id;
            a.download = `Daftar_Pengeluaran_Riil_Semua_${safeNomorSt}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            message.success({ content: "Seluruh dokumen Pengeluaran Riil berhasil diunduh.", key: "lpj_print_all_rill" });
        } catch {
            message.error({ content: "Gagal mencetak dokumen.", key: "lpj_print_all_rill" });
        }
    };

    const handlePrintRekap = async () => {
        if (!selectedSt || !lpjData) return;
        try {
            message.loading({ content: "Menyiapkan rekapitulasi...", key: "lpj_print_rekap" });
            const response = await apiFetch(`/lpj/${selectedSt.id}/export-rekap`, {
                method: "GET", headers: { Accept: "application/pdf" }
            });
            if (!response.ok) throw new Error("Gagal mengunduh dokumen");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const safeNomorSt = selectedSt.nomor_st ? selectedSt.nomor_st.replace(/[\/\\]/g, "_") : selectedSt.id;
            a.download = `Rekapitulasi_LPJ_${safeNomorSt}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            message.success({ content: "Dokumen rekapitulasi berhasil diunduh.", key: "lpj_print_rekap" });
        } catch {
            message.error({ content: "Gagal mencetak rekapitulasi.", key: "lpj_print_rekap" });
        }
    };

    // ── Save LPJ or KKP ──
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
                    employee_id: item.employee_id,
                    employee_name: item.employee_name,
                    employee_nip: item.employee_nip,
                    is_external: item.is_external,
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
                        const validItems = (data.items || []).filter(it => (Number(it.nominal) || 0) > 0 || (it.rincian && it.rincian.trim() !== "") || (it.keterangan && it.keterangan.trim() !== ""));
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
            const endpoint = modalType === "kkp" ? `/kkp/${selectedSt.id}/items` : `/lpj/${selectedSt.id}/items`;
            const res = await apiFetch(endpoint, { method: "PUT", body: JSON.stringify(payload) });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.errors ? Object.values(err.errors).flat().join(", ") : "Gagal menyimpan data.");
            }
            
            message.success(modalType === "kkp" ? "Data KKP berhasil disimpan." : "Data LPJ berhasil disimpan.");
            setModalVisible(false);
            fetchSt();
        } catch (err) {
            message.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    // ── Delete LPJ or KKP ──
    const handleDeleteLpj = () => {
        if (!selectedSt || !lpjData) return;
        Modal.confirm({
            title: "Hapus LPJ ini?",
            content: "Semua data biaya LPJ yang tersimpan akan dihapus.",
            okText: "Hapus",
            okButtonProps: { danger: true },
            cancelText: "Batal",
            onOk: async () => {
                try {
                    const res = await apiFetch(`/lpj/${selectedSt.id}`, { method: "DELETE" });
                    if (!res.ok) throw new Error("Gagal menghapus LPJ.");
                    message.success("LPJ berhasil dihapus.");
                    setModalVisible(false);
                    fetchSt();
                } catch (err) { message.error(err.message); }
            },
        });
    };

    const handleDeleteKkp = () => {
        if (!selectedSt || !kkpData) return;
        Modal.confirm({
            title: "Hapus KKP ini?",
            content: "Semua data perhitungan KKP yang tersimpan akan dihapus.",
            okText: "Hapus",
            okButtonProps: { danger: true },
            cancelText: "Batal",
            onOk: async () => {
                try {
                    const res = await apiFetch(`/kkp/${selectedSt.id}`, { method: "DELETE" });
                    if (!res.ok) throw new Error("Gagal menghapus KKP.");
                    message.success("KKP berhasil dihapus.");
                    setModalVisible(false);
                    fetchSt();
                } catch (err) { message.error(err.message); }
            },
        });
    };

    const handleExclude = (st) => {
        Modal.confirm({
            title: "Hapus dari Daftar?",
            content: `Surat Tugas "${st.nomor_st || 'Draft'}" akan disembunyikan dari modul keuangan.`,
            okText: "Ya, Hapus dari Daftar",
            okButtonProps: { danger: true },
            cancelText: "Batal",
            onOk: async () => {
                try {
                    const res = await apiFetch(`/lpj/${st.id}/exclude`, { method: "POST" });
                    if (!res.ok) throw new Error("Gagal menyembunyikan.");
                    message.success("Surat tugas dihapus dari daftar keuangan.");
                    fetchSt();
                } catch (err) { message.error(err.message); }
            },
        });
    };

    const handleMarkManual = (st, type = "lpj") => {
        const isKkp = type === "kkp";
        Modal.confirm({
            title: `Tandai sebagai ${isKkp ? "KKP" : "LPJ"} Manual?`,
            content: `ST "${st.nomor_st || 'Draft'}" akan ditandai selesai (${isKkp ? "KKP" : "LPJ"} sudah dibuat di luar sistem).`,
            okText: "Ya, Tandai Manual",
            cancelText: "Batal",
            onOk: async () => {
                try {
                    const endpoint = isKkp ? `/kkp/${st.id}/mark-manual` : `/lpj/${st.id}/mark-manual`;
                    const res = await apiFetch(endpoint, { method: "POST" });
                    if (!res.ok) throw new Error(`Gagal menandai ${isKkp ? 'KKP' : 'LPJ'} manual.`);
                    message.success(`${isKkp ? 'KKP' : 'LPJ'} ditandai sebagai manual.`);
                    fetchSt();
                } catch (err) { message.error(err.message); }
            },
        });
    };

    const grandTotal = Object.values(items).reduce((sum, item) => sum + calcTotal(item), 0);

    const handleCopyText = (text, label) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        message.success({ content: `${label} berhasil disalin ke clipboard.`, key: "klpj_copy" });
    };

    const handleDirectPrintRekap = async (st) => {
        try {
            message.loading({ content: "Menyiapkan dokumen rekapitulasi...", key: "lpj_print_rekap" });
            const response = await apiFetch(`/lpj/${st.id}/export-rekap`, {
                method: "GET", headers: { Accept: "application/pdf" }
            });
            if (!response.ok) throw new Error("Gagal mengunduh dokumen");
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const safeNomorSt = st.nomor_st ? st.nomor_st.replace(/[\/\\]/g, "_") : st.id;
            a.download = `Rekapitulasi_LPJ_${safeNomorSt}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            message.success({ content: "Dokumen rekapitulasi berhasil diunduh.", key: "lpj_print_rekap" });
        } catch {
            message.error({ content: "Gagal mencetak dokumen rekapitulasi.", key: "lpj_print_rekap" });
        }
    };

    const getMenuItems = (record) => {
        const isLpjManual = record.lpj_status === "manual";
        const hasLpj = record.lpj_status === "final" || record.lpj_status === "draft" || isLpjManual;
        const isLpjFinal = record.lpj_status === "final";
        const isKkpManual = record.kkp_status === "manual";
        const hasKkp = record.kkp_status === "final" || record.kkp_status === "draft" || isKkpManual;

        return [
            {
                key: "input-lpj",
                icon: hasLpj ? <EditOutlined style={{ color: "#0F5B99" }} /> : <DollarOutlined style={{ color: "#0F5B99" }} />,
                label: hasLpj ? "Rincian Biaya LPJ" : "Input Biaya LPJ",
                onClick: () => fetchLpjDetail(record),
            },
            {
                key: "input-kkp",
                icon: hasKkp ? <FileTextOutlined style={{ color: "#0d9488" }} /> : <PlusOutlined style={{ color: "#0d9488" }} />,
                label: hasKkp ? "Rincian KKP" : "Input KKP",
                onClick: () => fetchKkpDetail(record),
            },
            ...(isLpjFinal ? [
                {
                    key: "print-rekap",
                    icon: <PrinterOutlined style={{ color: "#475569" }} />,
                    label: "Cetak Rekapitulasi LPJ (PDF)",
                    onClick: () => handleDirectPrintRekap(record),
                }
            ] : []),
            { type: "divider" },
            { 
                key: "manual-lpj", 
                icon: <CheckCircleFilled style={{ color: "#0F5B99" }} />, 
                label: "Tandai LPJ Selesai Manual", 
                disabled: isLpjManual, 
                onClick: () => handleMarkManual(record, "lpj") 
            },
            { 
                key: "manual-kkp", 
                icon: <CheckCircleFilled style={{ color: "#0d9488" }} />, 
                label: "Tandai KKP Selesai Manual", 
                disabled: isKkpManual, 
                onClick: () => handleMarkManual(record, "kkp") 
            },
            { type: "divider" },
            { 
                key: "exclude", 
                icon: <StopOutlined style={{ color: "#ef4444" }} />, 
                label: <span style={{ color: "#ef4444" }}>Hapus dari Daftar Keuangan</span>, 
                onClick: () => handleExclude(record) 
            },
        ];
    };

    const stColumns = [
        {
            title: "SURAT TUGAS",
            key: "nomor_st",
            width: 250,
            fixed: "left",
            render: (_, r) => {
                const isFinal = r.lpj_status === "final";
                return (
                    <div className="klpj-st-identity-cell">
                        <div className={`klpj-st-icon-wrap ${isFinal ? 'is-complete' : ''}`}>
                            <FileTextOutlined />
                        </div>
                        <div className="klpj-st-meta-wrap">
                            <div className="klpj-st-number-row">
                                <span 
                                    className="klpj-st-number-txt" 
                                    onClick={(e) => { e.stopPropagation(); handleCopyText(r.nomor_st, "Nomor ST"); }}
                                    title="Klik untuk menyalin nomor ST"
                                >
                                    {r.nomor_st || "Draft Surat Tugas"}
                                </span>
                                {r.nomor_st && (
                                    <Tooltip title="Salin Nomor ST">
                                        <button 
                                            type="button" 
                                            className="klpj-quick-copy-btn"
                                            onClick={(e) => { e.stopPropagation(); handleCopyText(r.nomor_st, "Nomor ST"); }}
                                        >
                                            <CopyOutlined />
                                        </button>
                                    </Tooltip>
                                )}
                            </div>
                            <div className="klpj-st-date-sub">
                                <CalendarOutlined style={{ fontSize: 10.5, color: "#94a3b8" }} />
                                <span>{r.tanggal_st ? dayjs(r.tanggal_st).format("DD MMM YYYY") : (r.created_at ? dayjs(r.created_at).format("DD MMM YYYY") : "-")}</span>
                            </div>
                        </div>
                    </div>
                );
            },
        },
        {
            title: "KODE AKUN",
            key: "mak",
            width: 240,
            render: (_, r) => (
                <div className="klpj-mak-cell">
                    {r.mak ? (
                        <div 
                            className="klpj-mak-chip"
                            onClick={() => handleCopyText(r.mak, "Kode Akun")}
                            title="Klik untuk menyalin Kode Akun"
                        >
                            <span className="klpj-mak-code">{r.mak}</span>
                            <Tooltip title="Salin Kode Akun">
                                <CopyOutlined className="klpj-mak-copy-icon" />
                            </Tooltip>
                        </div>
                    ) : (
                        <span className="klpj-empty-dash">-</span>
                    )}
                </div>
            ),
        },
        {
            title: "PERIODE TUGAS",
            key: "periode",
            width: 230,
            render: (_, r) => (
                <div className="klpj-periode-cell">
                    <div className="klpj-dates-row">
                        <span className="klpj-date-item">{dateLabel(r.tanggal_mulai)}</span>
                        <span className="klpj-date-separator">→</span>
                        <span className="klpj-date-item">{dateLabel(r.tanggal_selesai)}</span>
                    </div>
                    <div className="klpj-duration-badge">
                        <ClockCircleOutlined style={{ fontSize: 10, color: "#0F5B99" }} />
                        <span>{inclusiveDays(r.tanggal_mulai, r.tanggal_selesai)} Hari Kerja</span>
                    </div>
                </div>
            ),
        },
        {
            title: "LOKASI TUGAS",
            key: "lokasi_tugas",
            width: 190,
            render: (_, r) => (
                <div className="klpj-location-cell">
                    <div className="klpj-location-main">
                        <EnvironmentOutlined className="klpj-loc-pin-icon" />
                        <span className="klpj-loc-name" title={r.lokasi_tugas || "-"}>{r.lokasi_tugas || "-"}</span>
                    </div>
                    {r.sarana_nama && (
                        <span className="klpj-loc-target" title={r.sarana_nama}>
                            {r.sarana_nama}
                        </span>
                    )}
                </div>
            ),
        },
        {
            title: "AGENDA PENUGASAN",
            key: "deskripsi_tugas",
            render: (_, r) => (
                <div className="klpj-agenda-cell">
                    <Tooltip title={r.deskripsi_tugas || "-"} placement="topLeft" mouseEnterDelay={0.5}>
                        <p className="klpj-agenda-text">{r.deskripsi_tugas || "-"}</p>
                    </Tooltip>
                    <div className="klpj-team-badge-row">
                        {r.employees && r.employees.length > 0 && (
                            <Tooltip 
                                title={
                                    <div>
                                        <div style={{ fontWeight: 600, marginBottom: 4 }}>Petugas Ditugaskan ({r.employees.length}):</div>
                                        {r.employees.map((e, i) => (
                                            <div key={i} style={{ fontSize: 11 }}>• {e.name || e.nama} {e.nip ? `(${e.nip})` : ''}</div>
                                        ))}
                                    </div>
                                }
                            >
                                <span className="klpj-team-badge">
                                    <TeamOutlined style={{ fontSize: 11, color: "#0F5B99" }} />
                                    <span>{r.employees.length} Pegawai</span>
                                </span>
                            </Tooltip>
                        )}
                        {r.external_participants && r.external_participants.length > 0 && (
                            <span className="klpj-team-badge ext">
                                <span>+{r.external_participants.length} Eksternal</span>
                            </span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            title: "STATUS LPJ",
            key: "lpj_status",
            width: 140,
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
            title: "STATUS KKP",
            key: "kkp_status",
            width: 140,
            render: (_, r) => {
                const s = KKP_STATUS[r.kkp_status] || KKP_STATUS[null];
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
            width: 105,
            align: "center",
            fixed: "right",
            render: (_, r) => (
                <Dropdown menu={{ items: getMenuItems(r), className: "klpj-dropdown-menu" }} trigger={["click"]} placement="bottomRight">
                    <Button className="simkeu-row-action-btn">
                        <span>Kelola</span>
                        <DownOutlined style={{ fontSize: 9, marginLeft: 2 }} />
                    </Button>
                </Dropdown>
            ),
        },
    ];

    const renderSubInputs = (empKey, compDef, compVal) => {
        const lockedRegion = isLockedRegion(lokasiTugas || selectedSt?.lokasi_tugas);
        const days = inclusiveDays(tanggalMulai, tanggalSelesai);

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
                                        <span className="klpj-sub-label">Biaya (Rp)</span>
                                        <InputNumber
                                            value={itemRow.nominal}
                                            formatter={v => `Rp ${String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`}
                                            parser={v => Number(v.replace(/Rp\s?|[.]/g, ""))}
                                            onChange={val => updateTransportItem(empKey, compDef.key, idx, "nominal", val)}
                                            min={0}
                                            placeholder="0"
                                            style={{ width: "100%" }}
                                        />
                                    </div>
                                    <div className="klpj-multi-transport-rincian">
                                        <span className="klpj-sub-label">Rincian / Rute</span>
                                        <Input
                                            placeholder={`Contoh: ${compDef.label} Bandara ke Hotel / Lokasi...`}
                                            value={itemRow.rincian || ""}
                                            onChange={e => updateTransportItem(empKey, compDef.key, idx, "rincian", e.target.value)}
                                        />
                                    </div>
                                    <div className="klpj-multi-transport-ket">
                                        <span className="klpj-sub-label">Keterangan (Opsional)</span>
                                        <Input
                                            placeholder="No. Tiket / Catatan..."
                                            value={itemRow.keterangan || ""}
                                            onChange={e => updateTransportItem(empKey, compDef.key, idx, "keterangan", e.target.value)}
                                        />
                                    </div>
                                    {currentItems.length > 1 && (
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
                            <Space size={6} wrap>
                                <Button
                                    type="dashed"
                                    size="small"
                                    icon={<PlusOutlined />}
                                    onClick={() => addTransportItem(empKey, compDef.key)}
                                    style={{ fontSize: 11.5, borderColor: "#0F5B99", color: "#0F5B99" }}
                                >
                                    + Tambah Rincian {compDef.label}
                                </Button>
                            </Space>
                            <div className="klpj-sub-result">
                                <span className="klpj-sub-operator">Total =</span>
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
                            {isUangHarian && lockedRegion && <span className="klpj-locked-badge">Tarif Terkunci Daerah</span>}
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
                    <span className="klpj-sub-operator">×</span>
                    <div className="klpj-sub-field">
                        <span className="klpj-sub-label">Jumlah Hari</span>
                        <InputNumber
                            value={compVal.hari}
                            onChange={val => updateSubValue(empKey, compDef.key, "hari", val)}
                            min={0} placeholder="0"
                        />
                    </div>
                    <div className="klpj-sub-result">
                        <span className="klpj-sub-operator">=</span>
                        <span className="klpj-sub-total">{fmtRupiah(total)}</span>
                    </div>
                    {isUangHarian && days > 0 && compVal.hari !== days && (
                        <Button
                            type="link"
                            size="small"
                            icon={<ThunderboltOutlined />}
                            onClick={() => handleQuickCalculateHarian(empKey)}
                            style={{ fontSize: 11, padding: 0, marginLeft: 8 }}
                        >
                            Set Durasi ST ({days} Hari)
                        </Button>
                    )}
                </div>
            );
        } else if (compDef.type === "rate_days") {
            const rateLabel = compDef.key === "uang_penginapan" ? "Tarif / Malam" : "Tarif / Hari";
            const daysLabel = compDef.key === "uang_penginapan" ? "Jumlah Malam" : "Jumlah Hari";
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
                        />
                    </div>
                    <span className="klpj-sub-operator">×</span>
                    <div className="klpj-sub-field">
                        <span className="klpj-sub-label">{daysLabel}</span>
                        <InputNumber
                            value={compVal.hari}
                            onChange={val => updateSubValue(empKey, compDef.key, "hari", val)}
                            min={0} placeholder="0"
                        />
                    </div>
                    <div className="klpj-sub-result">
                        <span className="klpj-sub-operator">=</span>
                        <span className="klpj-sub-total">{fmtRupiah(total)}</span>
                    </div>
                    {compDef.key === "uang_penginapan" && days > 1 && (
                        <Button
                            type="link"
                            size="small"
                            icon={<ThunderboltOutlined />}
                            onClick={() => handleQuickCalculateHotel(empKey)}
                            style={{ fontSize: 11, padding: 0, marginLeft: 8 }}
                        >
                            Set {Math.max(days - 1, 1)} Malam
                        </Button>
                    )}
                </div>
            );
        } else {
            content = (
                <div className="klpj-sub-inputs">
                    <div className="klpj-sub-field">
                        <span className="klpj-sub-label">Nominal (Rp)</span>
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
        }

        return (
            <div className="klpj-comp-sub-wrapper">
                {compDef.key === "uang_penginapan" && (
                    <div className="klpj-hotel-row">
                        <Input
                            placeholder="Nama Hotel / Penginapan"
                            value={items[empKey]?.nama_hotel || ""}
                            onChange={e => updateItemProperty(empKey, "nama_hotel", e.target.value)}
                            style={{ flex: 2 }}
                        />
                        <Input
                            placeholder="No. Kamar"
                            value={items[empKey]?.nomor_kamar || ""}
                            onChange={e => updateItemProperty(empKey, "nomor_kamar", e.target.value)}
                            style={{ flex: 1 }}
                        />
                    </div>
                )}
                {content}
                <Input
                    size="small"
                    placeholder="Catatan / keterangan biaya (opsional)..."
                    value={compVal.keterangan || ""}
                    onChange={e => updateSubValue(empKey, compDef.key, "keterangan", e.target.value)}
                    style={{ marginTop: 6 }}
                />
            </div>
        );
    };

    const isKkpModal = modalType === "kkp";

    return (
        <div className="klpj-module-container">
            {/* ── Status Quick Filter Ribbon ── */}
            <div className="klpj-status-ribbon">
                <div className="klpj-ribbon-group">
                    <button
                        type="button"
                        className={`klpj-ribbon-item ${filterLpjStatus === "ALL" ? "active" : ""}`}
                        onClick={() => setFilterLpjStatus("ALL")}
                    >
                        <span>Semua Penugasan</span>
                        <span className="klpj-ribbon-count">{metrics.total}</span>
                    </button>
                </div>

                <div className="klpj-ribbon-divider" />

                <div className="klpj-ribbon-group">
                    <span className="klpj-ribbon-cat-tag">LPJ</span>
                    <button
                        type="button"
                        className={`klpj-ribbon-item ${filterLpjStatus === "LPJ_FINAL" ? "active" : ""}`}
                        onClick={() => setFilterLpjStatus("LPJ_FINAL")}
                    >
                        <span className="status-indicator"><span className="status-dot final" /><span>Selesai</span></span>
                        <span className="klpj-ribbon-count">{metrics.lpjFinal}</span>
                    </button>
                    <button
                        type="button"
                        className={`klpj-ribbon-item ${filterLpjStatus === "LPJ_DRAFT" ? "active" : ""}`}
                        onClick={() => setFilterLpjStatus("LPJ_DRAFT")}
                    >
                        <span className="status-indicator"><span className="status-dot draft" /><span>Draft</span></span>
                        <span className="klpj-ribbon-count">{metrics.lpjDraft}</span>
                    </button>
                    <button
                        type="button"
                        className={`klpj-ribbon-item ${filterLpjStatus === "LPJ_BELUM" ? "active" : ""}`}
                        onClick={() => setFilterLpjStatus("LPJ_BELUM")}
                    >
                        <span className="status-indicator"><span className="status-dot belum" /><span>Belum LPJ</span></span>
                        <span className="klpj-ribbon-count">{metrics.lpjBelum}</span>
                    </button>
                </div>

                <div className="klpj-ribbon-divider" />

                <div className="klpj-ribbon-group">
                    <span className="klpj-ribbon-cat-tag kkp">KKP</span>
                    <button
                        type="button"
                        className={`klpj-ribbon-item ${filterLpjStatus === "KKP_FINAL" ? "active" : ""}`}
                        onClick={() => setFilterLpjStatus("KKP_FINAL")}
                    >
                        <span className="status-indicator"><span className="status-dot final" /><span>Selesai</span></span>
                        <span className="klpj-ribbon-count">{metrics.kkpFinal}</span>
                    </button>
                    <button
                        type="button"
                        className={`klpj-ribbon-item ${filterLpjStatus === "KKP_DRAFT" ? "active" : ""}`}
                        onClick={() => setFilterLpjStatus("KKP_DRAFT")}
                    >
                        <span className="status-indicator"><span className="status-dot draft" /><span>Draft</span></span>
                        <span className="klpj-ribbon-count">{metrics.kkpDraft}</span>
                    </button>
                    <button
                        type="button"
                        className={`klpj-ribbon-item ${filterLpjStatus === "KKP_BELUM" ? "active" : ""}`}
                        onClick={() => setFilterLpjStatus("KKP_BELUM")}
                    >
                        <span className="status-indicator"><span className="status-dot belum" /><span>Belum KKP</span></span>
                        <span className="klpj-ribbon-count">{metrics.kkpBelum}</span>
                    </button>
                </div>
            </div>

            {/* ── Toolbar & Filter Standard Surat Tugas ── */}
            <Card
                variant="borderless"
                style={{ borderRadius: 8 }}
                styles={{ body: { padding: "12px 16px" } }}
                className="klpj-toolbar-card"
            >
                <Row gutter={[10, 10]} align="middle">
                    {/* Search */}
                    <Col xs={24} sm={12} md={7} lg={7}>
                        <Input
                            placeholder="Cari nomor ST, lokasi, kode akun, pegawai..."
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
                                    <Text strong style={{ fontSize: 12 }}>Periode Tanggal Penugasan</Text>
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
                    <Col xs={24} sm={12} md={5} lg={5}>
                        <Dropdown
                            menu={{
                                items: [
                                    { key: "ALL", label: "Semua Status", onClick: () => setFilterLpjStatus("ALL") },
                                    { type: "divider" },
                                    { key: "LPJ_FINAL", label: "LPJ Selesai", onClick: () => setFilterLpjStatus("LPJ_FINAL") },
                                    { key: "LPJ_DRAFT", label: "Draft LPJ", onClick: () => setFilterLpjStatus("LPJ_DRAFT") },
                                    { key: "LPJ_BELUM", label: "Belum Dibuat LPJ", onClick: () => setFilterLpjStatus("LPJ_BELUM") },
                                    { type: "divider" },
                                    { key: "KKP_FINAL", label: "KKP Selesai", onClick: () => setFilterLpjStatus("KKP_FINAL") },
                                    { key: "KKP_DRAFT", label: "Draft KKP", onClick: () => setFilterLpjStatus("KKP_DRAFT") },
                                    { key: "KKP_BELUM", label: "Belum Dibuat KKP", onClick: () => setFilterLpjStatus("KKP_BELUM") },
                                ],
                                selectedKeys: [filterLpjStatus],
                            }}
                            trigger={["click"]}
                        >
                            <Button style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span>
                                    {filterLpjStatus === "LPJ_FINAL"
                                        ? "Status: LPJ Selesai"
                                        : filterLpjStatus === "LPJ_DRAFT"
                                        ? "Status: Draft LPJ"
                                        : filterLpjStatus === "LPJ_BELUM"
                                        ? "Status: Belum LPJ"
                                        : filterLpjStatus === "KKP_FINAL"
                                        ? "Status: KKP Selesai"
                                        : filterLpjStatus === "KKP_DRAFT"
                                        ? "Status: Draft KKP"
                                        : filterLpjStatus === "KKP_BELUM"
                                        ? "Status: Belum KKP"
                                        : "Status: Semua Status"}
                                </span>
                                <DownOutlined style={{ fontSize: 10, marginLeft: 4 }} />
                            </Button>
                        </Dropdown>
                    </Col>

                    {/* Right action tools */}
                    <Col xs={24} sm={12} md={6} lg={7} style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                        <Button
                            icon={<FilterOutlined />}
                            onClick={handleResetFilter}
                        >
                            Reset
                        </Button>
                        <Tooltip title="Segarkan Data">
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={() => fetchSt()}
                            />
                        </Tooltip>
                        <Text type="secondary" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                            {displayedStList.length} data
                        </Text>
                    </Col>
                </Row>
            </Card>

            {/* ── Table Card ── */}
            <Card
                variant="borderless"
                style={{ borderRadius: 8 }}
                styles={{ body: { padding: 0 } }}
                className="klpj-main-card"
            >
                <Table
                    className="klpj-table"
                    dataSource={displayedStList}
                    columns={stColumns}
                    rowKey="id"
                    size="middle"
                    loading={stLoading}
                    scroll={{ x: 1460 }}
                    pagination={{
                        defaultPageSize: 15,
                        showSizeChanger: true,
                        showLessItems: true,
                        responsive: true,
                        pageSizeOptions: ["15", "30", "50", "100"],
                        showTotal: (total, range) => `${range[0]}-${range[1]} dari ${total} data`,
                    }}
                    locale={{
                        emptyText: (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description={
                                    <span className="klpj-empty-copy">
                                        <strong>Tidak ada data penugasan</strong>
                                        <small>Sesuaikan kata kunci pencarian atau filter status Anda.</small>
                                    </span>
                                }
                            />
                        ),
                    }}
                />
            </Card>

            {/* ── Minimalist Modal: Input Biaya LPJ & KKP ── */}
            <Modal
                title={null}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={null}
                width={1280}
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
                        <div className="klpj-header-left">
                            <div className="klpj-header-title-row">
                                <h3 className="klpj-modal-title">
                                    {selectedSt?.nomor_st || (isKkpModal ? "KKP" : "Rincian Biaya LPJ")}
                                </h3>
                                <span className={`klpj-type-badge ${isKkpModal ? 'kkp' : 'lpj'}`}>
                                    {isKkpModal ? "MODUL KKP" : "MODUL LPJ"}
                                </span>
                            </div>
                            <span className="klpj-modal-sub">
                                {isKkpModal
                                    ? "KKP mandiri — nilai tersimpan terpisah dan tidak memengaruhi data LPJ"
                                    : "Rincian biaya riil tiket, transport lokal, uang harian, dan hotel"
                                }
                            </span>
                        </div>

                        <Space>
                            {isKkpModal && (
                                <Button
                                    icon={<CopyOutlined />}
                                    onClick={handleCopyFromLpj}
                                    title="Salin rincian dari LPJ sebagai draf awal KKP"
                                    style={{ borderColor: "#0d9488", color: "#0d9488" }}
                                >
                                    Salin dari LPJ
                                </Button>
                            )}

                            {(isKkpModal && kkpData) ? (
                                <Button
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={handleDeleteKkp}
                                >
                                    Hapus KKP
                                </Button>
                            ) : (!isKkpModal && lpjData) ? (
                                <Button
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={handleDeleteLpj}
                                >
                                    Hapus LPJ
                                </Button>
                            ) : null}
                        </Space>
                    </div>

                    {/* Body */}
                    <div className="klpj-modal-body">
                        <Spin spinning={lpjLoading}>
                            {/* Meta Fieldset */}
                            <div className="klpj-meta-box">
                                <Row gutter={[12, 12]}>
                                    <Col xs={24} md={7}>
                                        <div className="klpj-field-item">
                                            <label className="klpj-field-label">LOKASI / TUJUAN</label>
                                            <Input
                                                value={lokasiTugas}
                                                onChange={(e) => setLokasiTugas(e.target.value)}
                                                placeholder="Contoh: Palopo / Luwu Utara"
                                            />
                                        </div>
                                    </Col>
                                    <Col xs={24} md={7}>
                                        <div className="klpj-field-item">
                                            <label className="klpj-field-label">PERIODE PENUGASAN</label>
                                            <DatePicker.RangePicker
                                                style={{ width: "100%" }}
                                                format="DD/MM/YYYY"
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
                                            <label className="klpj-field-label">KODE AKUN</label>
                                            <Input
                                                value={mak}
                                                onChange={(e) => setMak(e.target.value)}
                                                placeholder="Kode Akun..."
                                            />
                                        </div>
                                    </Col>
                                    <Col xs={24} md={4}>
                                        <div className="klpj-field-item">
                                            <label className="klpj-field-label">STATUS {isKkpModal ? "KKP" : "LPJ"}</label>
                                            <div className="status-indicator" style={{ marginTop: 6 }}>
                                                <span className={`status-dot ${isKkpModal ? (KKP_STATUS[currentStatus]?.dot || 'belum') : (LPJ_STATUS[currentStatus]?.dot || 'belum')}`} />
                                                <span className="status-text">
                                                    {isKkpModal ? (KKP_STATUS[currentStatus]?.label || "Belum Dibuat") : (LPJ_STATUS[currentStatus]?.label || "Belum Dibuat")}
                                                </span>
                                            </div>
                                        </div>
                                    </Col>
                                </Row>

                                {/* Employee list with Add / Remove and Reorder capability */}
                                <div className="klpj-emp-roster">
                                    <span className="klpj-roster-label">Pegawai Bertugas:</span>
                                    <div className="klpj-roster-tags">
                                        {Object.keys(items).map((key, idx, arr) => {
                                            const it = items[key];
                                            const letter = String.fromCharCode(65 + idx);
                                            return (
                                                <span key={key} className="klpj-emp-badge">
                                                    <span className="klpj-badge-seq">{letter}.</span>
                                                    <span className="klpj-badge-name">{it.employee_name}</span>
                                                    <div className="klpj-badge-reorder-btns">
                                                        <button
                                                            type="button"
                                                            className="klpj-reorder-btn"
                                                            disabled={idx === 0}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleMoveEmployee(key, 'up');
                                                            }}
                                                            title="Geser ke urutan sebelumnya"
                                                        >
                                                            <ArrowLeftOutlined />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="klpj-reorder-btn"
                                                            disabled={idx === arr.length - 1}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleMoveEmployee(key, 'down');
                                                            }}
                                                            title="Geser ke urutan berikutnya"
                                                        >
                                                            <ArrowRightOutlined />
                                                        </button>
                                                    </div>
                                                    <CloseOutlined
                                                        className="klpj-emp-del-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveEmployee(key);
                                                        }}
                                                        title={`Hapus Pegawai dari ${isKkpModal ? 'KKP' : 'LPJ'}`}
                                                    />
                                                </span>
                                            );
                                        })}

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
                                            .map((key) => {
                                                const item = items[key];
                                                const total = calcTotal(item);
                                                const isActive = key === activeEmployeeKey;
                                                const allKeys = Object.keys(items);
                                                const currentIdx = allKeys.indexOf(key);
                                                const letter = String.fromCharCode(65 + currentIdx);
                                                return (
                                                    <div
                                                        key={key}
                                                        className={`klpj-emp-row ${isActive ? 'active' : ''}`}
                                                        onClick={() => setActiveEmployeeKey(key)}
                                                    >
                                                        <div className="emp-row-left-section">
                                                            <div className="emp-row-seq-badge">{letter}</div>
                                                            <div className="emp-row-info">
                                                                <span className="emp-row-name">{item.employee_name}</span>
                                                                <span className="emp-row-nip">{item.employee_nip || "NON-NIP"}</span>
                                                            </div>
                                                        </div>
                                                        <div className="emp-row-side-act">
                                                            <div className="emp-row-reorder-group">
                                                                <Tooltip title="Geser ke Atas">
                                                                    <button
                                                                        type="button"
                                                                        className="emp-reorder-arrow-btn"
                                                                        disabled={currentIdx === 0}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleMoveEmployee(key, 'up');
                                                                        }}
                                                                    >
                                                                        <ArrowUpOutlined />
                                                                    </button>
                                                                </Tooltip>
                                                                <Tooltip title="Geser ke Bawah">
                                                                    <button
                                                                        type="button"
                                                                        className="emp-reorder-arrow-btn"
                                                                        disabled={currentIdx === allKeys.length - 1}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleMoveEmployee(key, 'down');
                                                                        }}
                                                                    >
                                                                        <ArrowDownOutlined />
                                                                    </button>
                                                                </Tooltip>
                                                            </div>
                                                            <span className="emp-row-total">{fmtRupiah(total)}</span>
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
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
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
                                                        <div className="klpj-active-emp-box">
                                                            <div className="klpj-active-avatar">
                                                                {(activeEmployee.employee_name?.[0] || "P").toUpperCase()}
                                                            </div>
                                                            <div className="klpj-active-meta">
                                                                <strong className="klpj-active-name">{activeEmployee.employee_name}</strong>
                                                                <span className="klpj-active-nip">{activeEmployee.employee_nip || "NON-NIP"}</span>
                                                            </div>
                                                        </div>
                                                        <Space>
                                                            {!isKkpModal && (
                                                                <>
                                                                    <Button
                                                                        size="small"
                                                                        icon={<PrinterOutlined />}
                                                                        onClick={() => handlePrintSingle(activeEmployee)}
                                                                        disabled={!lpjData}
                                                                    >
                                                                        Cetak Rincian
                                                                    </Button>
                                                                    {isPalopo(lokasiTugas || selectedSt?.lokasi_tugas) && (
                                                                        <Button
                                                                            size="small"
                                                                            icon={<PrinterOutlined />}
                                                                            onClick={() => handlePrintRill(activeEmployee)}
                                                                            disabled={!lpjData}
                                                                        >
                                                                            Pengeluaran Riil
                                                                        </Button>
                                                                    )}
                                                                </>
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
                                                            style={{ maxWidth: 280 }}
                                                        />
                                                    </div>

                                                    {/* Category Tabs */}
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
                                                                        className={`klpj-comp-card ${compVal.checked ? 'active' : ''}`}
                                                                        key={c.key}
                                                                    >
                                                                        <div className="klpj-comp-header">
                                                                            <div className="klpj-comp-title-group">
                                                                                <span className="klpj-comp-icon">{getIconForComponent(c.key)}</span>
                                                                                <span className="klpj-comp-name">{c.label}</span>
                                                                            </div>
                                                                            <div className="klpj-comp-action">
                                                                                <span className="klpj-comp-val">
                                                                                    {compVal.checked ? fmtRupiah(compTotal) : "-"}
                                                                                </span>
                                                                                <Switch
                                                                                    size="small"
                                                                                    checked={compVal.checked}
                                                                                    onChange={checked => toggleComponent(activeEmployeeKey, c.key, checked)}
                                                                                />
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
                                                        <span>Subtotal Pegawai Ini:</span>
                                                        <strong>{fmtRupiah(calcTotal(activeEmployee))}</strong>
                                                    </div>
                                                </div>
                                            );
                                        })()
                                    ) : (
                                        <div className="klpj-empty-state">
                                            <p>Pilih pegawai dari panel kiri untuk mengisi rincian biaya {isKkpModal ? "KKP" : "LPJ"}.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Total Bar */}
                            <div className="klpj-total-bar" style={isKkpModal ? { background: "#0d9488" } : {}}>
                                <div>
                                    <span className="klpj-total-lbl">TOTAL {isKkpModal ? "KKP" : "BIAYA DINAS"}:</span>
                                    <strong className="klpj-total-val">{fmtRupiah(grandTotal)}</strong>
                                </div>
                                <span className="klpj-total-meta">{Object.keys(items).length} Pegawai Terdaftar</span>
                            </div>

                            {/* Footer */}
                            <div className="klpj-modal-footer">
                                <Space>
                                    {!isKkpModal && lpjData && (
                                        <>
                                            <Button size="small" icon={<PrinterOutlined />} onClick={handlePrintAll}>
                                                Cetak Semua
                                            </Button>
                                            {isPalopo(lokasiTugas || selectedSt?.lokasi_tugas) && (
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
                                    <Button onClick={() => setModalVisible(false)}>Tutup</Button>
                                    <Button
                                        type="primary"
                                        icon={<SaveOutlined />}
                                        loading={saving}
                                        onClick={handleSave}
                                        style={isKkpModal ? { background: "#0d9488", borderColor: "#0d9488" } : {}}
                                    >
                                        Simpan {isKkpModal ? "KKP" : "LPJ"}
                                    </Button>
                                </Space>
                            </div>
                        </Spin>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

