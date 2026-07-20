import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Typography,
  message,
  Spin,
  Tag,
  Empty,
  Modal,
  AutoComplete,
} from "antd";
import {
  FileProtectOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  SendOutlined,
  CheckCircleOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  CalendarOutlined,
  DollarOutlined,
  CompassOutlined,
  RocketOutlined,
  UserOutlined,
  CloseOutlined,
  IdcardOutlined,
  BankOutlined,
  CrownOutlined,
  SafetyCertificateOutlined,
  LockOutlined,
  CheckOutlined,
  InfoCircleOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "../hooks/useAuth.js";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;
// const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

/* ── Lokasi Tujuan Options (same as BMN) ── */
const LOKASI_OPTIONS = [
  "Kota Palopo",
  "Kabupaten Luwu",
  "Kabupaten Luwu Utara",
  "Kabupaten Luwu Timur",
  "Kabupaten Tana Toraja",
  "Kabupaten Toraja Utara",
  "Kabupaten Enrekang",
];

/* ════════════ Step Definitions ════════════ */
const STEPS = [
  { key: "pegawai", title: "Nama Pegawai", subtitle: "Pilih pegawai yang akan ditugaskan", icon: <TeamOutlined />, color: "#0F5B99" },
  { key: "tanggal", title: "Jadwal & Lokasi", subtitle: "Tentukan periode dan tujuan penugasan", icon: <CalendarOutlined />, color: "#0F5B99" },
  { key: "anggaran", title: "MAK & Sarana", subtitle: "Lengkapi data anggaran dan sarana", icon: <DollarOutlined />, color: "#0F5B99" },
  { key: "review", title: "Konfirmasi", subtitle: "Periksa kembali sebelum mengirim", icon: <CheckCircleOutlined />, color: "#10B981" },
];

/* ════════════ Injected Styles ════════════ */
const injectStyles = () => {
  if (document.getElementById("stw-styles")) return;
  const s = document.createElement("style");
  s.id = "stw-styles";
  s.textContent = `
    .stw-page { min-height:100vh; background:#f8fafc; position:relative; overflow-x:hidden; font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif; }
    .stw-container { position:relative; z-index:1; max-width:720px; margin:0 auto; padding:32px 20px 60px; }

    /* Top Action Bar with Precision Back Button */
    .stw-top-bar { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; }
    .stw-back-btn { display:inline-flex; align-items:center; gap:8px; padding:8px 16px; background:#ffffff; border:1px solid #cbd5e1; border-radius:10px; color:#334155; font-weight:600; font-size:13px; cursor:pointer; transition:all .2s ease; }
    .stw-back-btn:hover { color:#0f5b99; border-color:#0f5b99; background:#e6f2fc; transform:translateX(-2px); }
    .stw-top-pill { display:inline-flex; align-items:center; gap:6px; font-size:11px; font-weight:700; letter-spacing:0.5px; color:#64748b; text-transform:uppercase; background:#f1f5f9; padding:4px 12px; border-radius:6px; border:1px solid #e2e8f0; }
    .stw-top-dot { width:6px; height:6px; border-radius:50%; background:#0f5b99; }

    /* Header */
    .stw-header { text-align:center; margin-bottom:28px; animation:stw-fadeD .4s ease-out; }
    @keyframes stw-fadeD { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:translateY(0)} }
    .stw-logo { width:48px; height:48px; border-radius:12px; background:#0f5b99; display:inline-flex; align-items:center; justify-content:center; color:#fff; font-size:22px; margin-bottom:12px; }
    .stw-header h2 { margin:0 0 4px!important; font-size:20px!important; font-weight:700!important; color:#1e293b!important; }
    .stw-header-sub { color:#64748b; font-size:13px; font-weight:400; }

    /* Progress Stepper */
    .stw-progress { display:flex; align-items:center; justify-content:space-between; margin-bottom:28px; padding:0 4px; }
    .stw-dot { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:14px; transition:all .2s ease; position:relative; z-index:2; flex-shrink:0; }
    .stw-dot.active { background:#0f5b99; color:#fff; font-weight:700; }
    .stw-dot.done { background:#10b981; color:#fff; }
    .stw-dot.pending { background:#fff; color:#94a3b8; border:1px solid #cbd5e1; }
    .stw-line { flex:1; height:2px; margin:0 8px; border-radius:1px; transition:all .2s ease; }
    .stw-line.done { background:#10b981; }
    .stw-line.pending { background:#e2e8f0; }

    /* Main Card */
    .stw-card { background:#fff; border-radius:16px; border:1px solid #e2e8f0; box-shadow:0 2px 12px rgba(0,0,0,.03); padding:28px 24px; position:relative; overflow:hidden; }

    /* Fade Animations */
    .stw-fe { opacity:0; transform:translateY(12px); }
    .stw-fa { opacity:1; transform:translateY(0); transition:opacity .3s ease,transform .3s ease; }
    .stw-fo { opacity:0; transform:translateY(-8px); transition:opacity .2s ease,transform .2s ease; }

    /* Step header inside card */
    .stw-sh { display:flex; align-items:center; gap:12px; margin-bottom:20px; padding-bottom:16px; border-bottom:1px solid #f1f5f9; }
    .stw-si { width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; color:#fff; font-size:18px; flex-shrink:0; background:#0f5b99; }
    .stw-st { font-size:16px!important; font-weight:700!important; color:#1e293b!important; margin:0!important; }
    .stw-ss { color:#64748b; font-size:12.5px; margin-top:2px; }

    /* Form Overrides */
    .stw-card .ant-form-item-label>label { font-weight:600; color:#334155; font-size:13px; }
    .stw-card .ant-select-selector, .stw-card .ant-input, .stw-card .ant-input-affix-wrapper, .stw-card .ant-picker { border-radius:10px!important; border-color:#cbd5e1!important; transition:all .2s ease!important; min-height:42px!important; font-size:13px!important; }
    .stw-card .ant-select-selector:hover, .stw-card .ant-input:hover, .stw-card .ant-input-affix-wrapper:hover, .stw-card .ant-picker:hover { border-color:#0f5b99!important; }
    .stw-card .ant-select-focused .ant-select-selector, .stw-card .ant-input:focus, .stw-card .ant-input-affix-wrapper-focused, .stw-card .ant-picker-focused { border-color:#0f5b99!important; box-shadow:0 0 0 2px rgba(15,91,153,.15)!important; }
    .mak-autocomplete { height: 42px!important; display: block!important; }
    .mak-autocomplete .ant-select-selector { height: 42px!important; min-height: 42px!important; border: none!important; padding: 0!important; background: transparent!important; }
    .mak-autocomplete .ant-input-affix-wrapper { height: 42px!important; min-height: 42px!important; }

    /* Nav Buttons */
    .stw-nav { display:flex; justify-content:space-between; gap:12px; margin-top:28px; }
    .stw-bn { height:44px!important; border-radius:10px!important; font-weight:600!important; font-size:14px!important; border:none!important; padding:0 24px!important; background:#0f5b99!important; color:#fff!important; transition:all .2s ease!important; }
    .stw-bn:hover { background:#0b4a7d!important; }
    .stw-bp { height:44px!important; border-radius:10px!important; font-weight:600!important; font-size:14px!important; color:#475569!important; border:1px solid #cbd5e1!important; padding:0 20px!important; background:#fff!important; transition:all .2s ease!important; }
    .stw-bp:hover { color:#0f5b99!important; border-color:#0f5b99!important; background:#e6f2fc!important; }
    .stw-bs { height:44px!important; border-radius:10px!important; font-weight:700!important; font-size:14px!important; border:none!important; background:#10b981!important; color:#fff!important; transition:all .2s ease!important; }
    .stw-bs:hover { background:#059669!important; }

    /* Employee & Sarana Cards */
    .stw-emp-card { display:flex; align-items:center; gap:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:10px 14px; margin-bottom:8px; transition:all .2s ease; }
    .stw-emp-card:hover { border-color:#0f5b99; background:#e6f2fc; }
    .stw-emp-avatar { width:34px; height:34px; border-radius:8px; background:#0f5b99; display:flex; align-items:center; justify-content:center; color:#fff; font-size:15px; flex-shrink:0; }
    .stw-emp-info { flex:1; min-width:0; }
    .stw-emp-name { font-weight:600; color:#1e293b; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .stw-emp-nip { font-size:11px; color:#64748b; font-family:monospace; }
    .stw-emp-rm { width:26px; height:26px; border-radius:6px; border:none; background:#fee2e2; color:#dc2626; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .2s; flex-shrink:0; }
    .stw-emp-rm:hover { background:#fca5a5; color:#991b1b; }

    /* Sarana Card */
    .stw-sar-card { display:flex; align-items:center; gap:12px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:10px 14px; margin-bottom:8px; }
    .stw-sar-icon { width:34px; height:34px; border-radius:8px; background:#10b981; display:flex; align-items:center; justify-content:center; color:#fff; font-size:15px; flex-shrink:0; }
    .stw-sar-name { font-weight:600; color:#065f46; font-size:13px; }
    .stw-sar-loc { font-size:11px; color:#059669; display:flex; align-items:center; gap:4px; }

    /* Lokasi Pills */
    .stw-loc-pills { display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; }
    .stw-loc-pill { padding:6px 14px; border-radius:20px; font-size:12.5px; cursor:pointer; border:1px solid; transition:all .2s ease; font-weight:600; user-select:none; }
    .stw-loc-pill.sel { border-color:#0f5b99; background:#0f5b99; color:#fff; }
    .stw-loc-pill.idle { border-color:#cbd5e1; background:#fff; color:#475569; }
    .stw-loc-pill.idle:hover { border-color:#0f5b99; color:#0f5b99; }

    /* Review / Executive Summary Sheet */
    .stw-summary-sheet { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 20px; }
    .stw-summary-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
    .stw-summary-title { display: flex; align-items: center; gap: 8px; font-size: 11.5px; font-weight: 700; letter-spacing: 0.6px; color: #0f5b99; text-transform: uppercase; }
    .stw-summary-icon { font-size: 14px; }
    .stw-summary-badge { font-size: 10px; font-weight: 700; color: #0f5b99; background: #e6f2fc; padding: 2px 8px; border-radius: 4px; border: 1px solid #b9ddf8; letter-spacing: 0.5px; }

    .stw-summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1px; background: #e2e8f0; }
    .stw-summary-cell { background: #ffffff; padding: 14px 18px; display: flex; flex-direction: column; gap: 4px; }
    .stw-col-full { grid-column: span 2; }
    .stw-summary-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; }
    .stw-summary-value { font-size: 13px; font-weight: 600; color: #1e293b; }
    .stw-val-flex { display: flex; align-items: center; gap: 6px; }
    .stw-empty-val { color: #94a3b8; font-weight: 400; }

    .stw-katim-pill { display: inline-flex; align-items: center; gap: 6px; background: #fffbeb; border: 1px solid #fde68a; padding: 6px 12px; border-radius: 8px; }
    .stw-katim-name { font-size: 13px; font-weight: 700; color: #92400e; }
    .stw-katim-nip { font-size: 11px; color: #b45309; font-family: monospace; }

    .stw-members-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 2px; }
    .stw-member-tag { display: inline-flex; align-items: center; gap: 6px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 5px 10px; border-radius: 6px; font-size: 12.5px; font-weight: 600; color: #334155; }
    .stw-member-icon { color: #0f5b99; font-size: 12px; }
    .stw-ext-tag { background: #f1f5f9; color: #64748b; }

    .stw-mak-code { font-family: monospace; font-size: 12.5px; font-weight: 700; color: #0f5b99; background: #e6f2fc; padding: 4px 10px; border-radius: 6px; border: 1px solid #b9ddf8; display: inline-block; }
    .stw-summary-desc-box { background: #f8fafc; border-left: 3px solid #0f5b99; padding: 10px 14px; border-radius: 0 6px 6px 0; font-size: 13px; line-height: 1.5; color: #334155; font-weight: 500; }

    .stw-sarana-summary-grid { display: flex; flex-direction: column; gap: 8px; margin-top: 2px; }
    .stw-sar-sum-item { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 12px; }
    .stw-sar-sum-head { display: flex; align-items: center; gap: 6px; }
    .stw-sar-sum-title { font-size: 13px; font-weight: 700; color: #065f46; }
    .stw-sar-sum-loc { font-size: 11.5px; color: #059669; margin-top: 2px; display: flex; align-items: center; gap: 4px; }
    .stw-sar-sum-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
    .stw-sar-tag { font-size: 10.5px; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 1px 6px; border-radius: 4px; font-weight: 600; }

    .stw-tte-box { background: #e6f2fc; border: 1px solid #b9ddf8; border-radius: 10px; padding: 16px; margin-top: 16px; }
    .stw-tte-head { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 12px; }
    .stw-tte-icon { font-size: 20px; color: #0f5b99; margin-top: 2px; }
    .stw-tte-title { font-size: 13px; font-weight: 700; color: #0f5b99; }
    .stw-tte-sub { font-size: 12px; color: #1e3a5f; line-height: 1.4; margin-top: 2px; }

    @media (max-width: 640px) {
      .stw-summary-grid { grid-template-columns: 1fr; }
      .stw-col-full { grid-column: span 1; }
    }

    /* Success Screen */
    .stw-success { text-align:center; }
    .stw-scheck { width:64px; height:64px; border-radius:50%; background:#10b981; display:inline-flex; align-items:center; justify-content:center; margin-bottom:16px; }
    .stw-success h2 { color:#1e293b!important; font-size:20px!important; font-weight:700!important; }
    .stw-success-sub { color:#64748b; font-size:13px; line-height:1.6; }
  `;
  document.head.appendChild(s);
};

/* ════════════ Component ════════════ */
const SuratTugasForm = () => {
  const navigate = useNavigate();
  const { token, apiFetch, user } = useAuth();
  const [form] = Form.useForm();
  const [step, setStep] = useState(0);
  const [fadeClass, setFadeClass] = useState("stw-fa");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [reviewData, setReviewData] = useState({});

  // TTE Modal State
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [signPassword, setSignPassword] = useState("");
  const [signLoading, setSignLoading] = useState(false);
  const [signWaitWa, setSignWaitWa] = useState(false);

  // Data
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [saranaOptions, setSaranaOptions] = useState([]);
  const [saranaLoading, setSaranaLoading] = useState(false);
  const [saranaMap, setSaranaMap] = useState({});
  const [selectedSarana, setSelectedSarana] = useState([]);
  const saranaAbortRef = useRef(null);
  const saranaDebounceRef = useRef(null);
  const [lokasi, setLokasi] = useState("");
  const [ketuaTimId, setKetuaTimId] = useState(null);
  const [ttePassword, setTtePassword] = useState("");

  const isKatim = user?.employee?.id === ketuaTimId || user?.employee_id === ketuaTimId;

  // External Participants
  const [selectedExternal, setSelectedExternal] = useState([]);
  const [isExtModalOpen, setIsExtModalOpen] = useState(false);
  const [extForm] = Form.useForm();

  // Drag and Drop State
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);

  const handleDragStart = (e, index, type) => {
    setDraggedItemIndex({ index, type });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnter = (e, index, type) => {
    if (!draggedItemIndex || draggedItemIndex.type !== type) return;
    const draggedIndex = draggedItemIndex.index;
    if (draggedIndex === index) return;

    if (type === 'internal') {
        const newItems = [...selectedEmployees];
        const item = newItems[draggedIndex];
        newItems.splice(draggedIndex, 1);
        newItems.splice(index, 0, item);
        setSelectedEmployees(newItems);
        form.setFieldsValue({ employee_ids: newItems.map((e) => e.id) });
        setDraggedItemIndex({ index, type });
    } else if (type === 'external') {
        const newItems = [...selectedExternal];
        const item = newItems[draggedIndex];
        newItems.splice(draggedIndex, 1);
        newItems.splice(index, 0, item);
        setSelectedExternal(newItems);
        setDraggedItemIndex({ index, type });
    }
  };

  const handleDragEnd = () => {
    setDraggedItemIndex(null);
  };

  // MAK Suggestions
  const [makSuggestions, setMakSuggestions] = useState([]);
  const [makLoading, setMakLoading] = useState(false);
  const makDebounceRef = useRef(null);

  const fetchMakSuggestions = useCallback(async (search = "") => {
    setMakLoading(true);
    try {
      const endpoint = token ? "/surat-tugas/mak-suggestions" : "/public/surat-tugas/mak-suggestions";
      const res = await apiFetch(`${endpoint}?q=${encodeURIComponent(search)}`);
      if (!res.ok) return;
      const data = await res.json();
      setMakSuggestions((data || []).map(item => ({ value: item.mak, label: item.mak })));
    } catch (e) {
      console.error("Failed to fetch MAK suggestions", e);
    } finally {
      setMakLoading(false);
    }
  }, [apiFetch, token]);

  const handleMakSearch = (value) => {
    if (makDebounceRef.current) clearTimeout(makDebounceRef.current);
    makDebounceRef.current = setTimeout(() => {
      fetchMakSuggestions(value);
    }, 300);
  };

  useEffect(() => { injectStyles(); }, []);

  // Fetch employees
  useEffect(() => {
    setEmployeesLoading(true);
    apiFetch("/public/bmn-employees")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.data ?? [];
        setEmployees(list.map((e) => ({
          id: e.id,
          name: e.name,
          nip: e.nip || "",
          position: e.position || "",
          department: e.department || "",
          pangkat: e.pangkat || "",
        })));
      })
      .catch(() => message.error("Gagal memuat data pegawai"))
      .finally(() => setEmployeesLoading(false));
  }, []);

  // Fetch sarana
  const fetchSarana = useCallback((search = "") => {
    if (saranaAbortRef.current) {
      saranaAbortRef.current.abort();
    }
    const controller = new AbortController();
    saranaAbortRef.current = controller;

    setSaranaLoading(true);
    const params = new URLSearchParams({ per_page: "50", page: "1" });
    if (search) params.set("q", search.trim());
    apiFetch(`/public/siamparan/sarana?${params}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error("Gagal memuat data sarana");
        return r.json();
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.data ?? [];
        const opts = list.map((s) => {
          const lokasi = [s.kelurahan, s.kecamatan, s.kabupaten].filter(Boolean).join(", ");
          return { id: s.id, nama: s.nama_sarana, lokasi, jenis: Array.isArray(s.jenis) ? s.jenis : [] };
        });
        setSaranaOptions(opts);
        const map = {};
        opts.forEach((o) => { map[o.id] = o; });
        setSaranaMap((prev) => ({ ...prev, ...map }));
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
      })
      .finally(() => {
        if (saranaAbortRef.current === controller) {
          setSaranaLoading(false);
        }
      });
  }, []);
  const fetchSaranaDebounced = useCallback((search = "") => {
    if (saranaDebounceRef.current) {
      clearTimeout(saranaDebounceRef.current);
    }
    saranaDebounceRef.current = setTimeout(() => {
      fetchSarana(search);
    }, 350);
  }, [fetchSarana]);
  useEffect(() => { fetchSarana(); }, [fetchSarana]);
  useEffect(() => () => {
    if (saranaDebounceRef.current) clearTimeout(saranaDebounceRef.current);
    if (saranaAbortRef.current) saranaAbortRef.current.abort();
  }, []);

  /* ── Grouping logic ── */
  const getGroupedEmployees = useCallback((list) => {
    const groups = {};
    list.forEach((e) => {
      const p = e.pangkat || "Pegawai Lainnya";
      if (!groups[p]) groups[p] = [];
      groups[p].push({
        value: e.id,
        label: `${e.name}${e.nip ? ` (${e.nip})` : ""}`,
      });
    });
    
    // Custom weight for ranking (Higher rank = Lower weight)
    const getRankWeight = (p) => {
      const s = p.toUpperCase();
      if (s.includes("IV/E") || s.includes("IV E")) return 1;
      if (s.includes("IV/D") || s.includes("IV D")) return 2;
      if (s.includes("IV/C") || s.includes("IV C")) return 3;
      if (s.includes("IV/B") || s.includes("IV B")) return 4;
      if (s.includes("IV/A") || s.includes("IV A")) return 5;
      if (s.includes("III/D") || s.includes("III D")) return 6;
      if (s.includes("III/C") || s.includes("III C")) return 7;
      if (s.includes("III/B") || s.includes("III B")) return 8;
      if (s.includes("III/A") || s.includes("III A")) return 9;
      if (s.includes("II/D") || s.includes("II D")) return 10;
      if (s.includes("II/C") || s.includes("II C")) return 11;
      if (s.includes("II/B") || s.includes("II B")) return 12;
      if (s.includes("II/A") || s.includes("II A")) return 13;
      if (s.includes("IX")) return 14;
      if (s === "PEGAWAI LAINNYA") return 999;
      return 100;
    };

    // Sort group names by rank weight
    return Object.keys(groups)
      .sort((a, b) => getRankWeight(a) - getRankWeight(b))
      .map((p) => ({
        label: p,
        options: groups[p].sort((a, b) => a.label.localeCompare(b.label)),
      }));
  }, []);

  /* ── Employee selection ── */
  const addEmployee = (empId) => {
    const emp = employees.find((e) => e.id === empId);
    if (emp && !selectedEmployees.find((e) => e.id === empId)) {
      const updated = [...selectedEmployees, emp];
      setSelectedEmployees(updated);
      form.setFieldsValue({ employee_ids: updated.map((e) => e.id) });
    }
  };
  const removeEmployee = (empId) => {
    const updated = selectedEmployees.filter((e) => e.id !== empId);
    setSelectedEmployees(updated);
    form.setFieldsValue({ employee_ids: updated.map((e) => e.id) });
  };

  /* ── External selection ── */
  const addExternal = (values) => {
    const newItem = { ...values, id: `ext-${Date.now()}` };
    setSelectedExternal([...selectedExternal, newItem]);
    setIsExtModalOpen(false);
    extForm.resetFields();
  };
  const removeExternal = (extId) => {
    setSelectedExternal(selectedExternal.filter((e) => e.id !== extId));
  };

  /* ── Sarana selection ── */
  const addSarana = (sarId) => {
    const sar = saranaMap[sarId] || saranaOptions.find((s) => s.id === sarId);
    if (sar && !selectedSarana.find((s) => s.id === sarId)) {
      setSelectedSarana((prev) => [...prev, sar]);
    }
  };
  const removeSarana = (sarId) => {
    setSelectedSarana((prev) => prev.filter((s) => s.id !== sarId));
  };

  /* ── Step fade ── */
  const animateToStep = (next) => {
    setFadeClass("stw-fo");
    setTimeout(() => {
      setStep(next);
      setFadeClass("stw-fe");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setFadeClass("stw-fa"));
      });
    }, 300);
  };

  const validateAndNext = async () => {
    if (step === 0) {
      if (selectedEmployees.length === 0 && selectedExternal.length === 0) { message.warning("Pilih minimal 1 pegawai atau tambahkan petugas luar"); return; }
      if (!ketuaTimId) { message.warning("Pilih Ketua Tim terlebih dahulu"); return; }
    }
    if (step === 1) {
      try { await form.validateFields(["tanggal_tugas", "deskripsi_tugas"]); } catch { return; }
      const lokasiVal = lokasi === "lainnya" ? form.getFieldValue("lokasi_lainnya") : lokasi;
      if (!lokasiVal) { message.warning("Pilih atau isi lokasi tugas"); return; }
    }
    if (step === 2) {
      try { await form.validateFields(["mak"]); } catch { return; }
      // Build review
      const vals = form.getFieldsValue(true);
      const lokasiVal = lokasi === "lainnya" ? vals.lokasi_lainnya : lokasi;
      // Resolve ketua tim - could be internal employee or external participant
      const isExtKatim = String(ketuaTimId).startsWith('ext-');
      const ketuaEmp = isExtKatim
        ? selectedExternal.find((e) => e.id === ketuaTimId)
        : employees.find((e) => e.id === ketuaTimId);
      setReviewData({ ...vals, empList: selectedEmployees, extList: selectedExternal, sarList: selectedSarana, lokasiStr: lokasiVal, ketuaTim: ketuaEmp, isExtKatim });
    }
    animateToStep(step + 1);
  };

  const goBack = () => animateToStep(step - 1);

  /* ── Submit ── */
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const values = form.getFieldsValue(true);
      const [mulai, selesai] = values.tanggal_tugas;
      const lokasiVal = lokasi === "lainnya" ? values.lokasi_lainnya : lokasi;
      const saranaArr = selectedSarana.map((s) => ({ id: s.id, nama: s.nama, lokasi: s.lokasi }));

      // Determine if ketua tim is internal or external
      const isExtKatim = String(ketuaTimId).startsWith('ext-');

      const payload = {
        employee_ids: selectedEmployees.map((e) => e.id),
        ketua_tim_id: isExtKatim ? null : ketuaTimId,
        tanggal_mulai: mulai.format("YYYY-MM-DD"),
        tanggal_selesai: selesai.format("YYYY-MM-DD"),
        mak: values.mak || null,
        lokasi_tugas: lokasiVal || null,
        deskripsi_tugas: values.deskripsi_tugas || null,
        sarana: saranaArr.length > 0 ? saranaArr : null,
        password: isKatim ? ttePassword : null,
        external_participants: selectedExternal.map((e, idx) => ({
          nip: e.nip || null,
          name: e.name,
          pangkat: e.pangkat || null,
          jabatan: e.jabatan || null,
          is_ketua_tim: e.id === ketuaTimId,
        })),
      };

      const endpoint = token ? "/surat-tugas" : "/public/surat-tugas";
      const res = await apiFetch(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) {
        const errorMsg = result.errors ? Object.values(result.errors).flat().join(", ") : result.message || "Gagal mengirim";
        throw new Error(errorMsg);
      }
      setResultData({ ...result.data, _sarana: saranaArr, _lokasi: lokasiVal });
      setSubmitted(true);
    } catch (err) { message.error(err.message); }
    finally { setLoading(false); }
  };

  /* ══════════════ TTE LOGIC ══════════════ */
  const handleDownloadClick = () => {
    if (isKatim) {
      if (resultData?.signed_at) {
        // Katim sudah TTE, langsung download PDF dengan QR
        const baseUrl = import.meta.env.VITE_API_URL || "https://siptu.bpompalopo.com/core_api/api";
        const url = `${baseUrl.replace(/\/+$/, "")}/public/surat-tugas/${resultData.id}/protokol-kerja?with_qr=1&token=${resultData.signature_token}`;
        window.open(url, "_blank");
      } else {
        // Jaga-jaga jika belum TTE (walau diwajibkan), buka modal TTE
        setSignModalOpen(true);
        setSignPassword("");
      }
    } else {
      // Bukan Katim, berikan informasi bahwa sudah diajukan ke Katim
      Modal.info({
        title: "Informasi Protokol Kerja",
        content: (
          <div style={{ padding: "8px 0" }}>
            <p style={{ fontSize: 15, color: "#1e293b", lineHeight: 1.6 }}>
              Protokol Kerja telah diajukan kepada Ketua Tim (<strong>{resultData?.ketua_tim?.name || "Katim"}</strong>) untuk ditandatangani secara elektronik (TTE).
            </p>
            <p style={{ fontSize: 14, color: "#64748b", marginTop: 12 }}>
              Anda dapat mengunduh dokumen yang sudah lengkap (ber-QR Code) melalui sistem ini setelah Ketua Tim membubuhkan tanda tangannya.
            </p>
          </div>
        ),
        icon: <InfoCircleOutlined style={{ color: "#3b82f6" }} />,
        okText: "Mengerti",
        centered: true,
        maskClosable: true,
      });
    }
  };

  const handleDownloadWithoutQR = () => {
    const baseUrl = import.meta.env.VITE_API_URL || "https://siptu.bpompalopo.com/core_api/api";
    const url = `${baseUrl.replace(/\/+$/, "")}/public/surat-tugas/${resultData.id}/protokol-kerja`;
    window.open(url, "_blank");
    setSignModalOpen(false);
  };

  const handleSignProtokol = async () => {
    if (!signPassword) {
      message.warning("Masukkan password Anda terlebih dahulu.");
      return;
    }
    setSignLoading(true);
    try {
      const res = await apiFetch(`/surat-tugas/${resultData.id}/sign-protokol`, {
        method: "POST",
        body: JSON.stringify({ password: signPassword }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Gagal menandatangani dokumen.");
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Protokol_Kerja_${resultData.nomor_st || resultData.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      message.success("Dokumen berhasil ditandatangani dan diunduh.");
      setSignModalOpen(false);
    } catch (e) {
      message.error(e.message);
    } finally {
      setSignLoading(false);
    }
  };

  const handleRequestSignature = async () => {
    setSignWaitWa(true);
    try {
      const res = await apiFetch(`/surat-tugas/${resultData.id}/request-signature`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Gagal mengirim permintaan tanda tangan.");
      }
      message.success(data.message || "Link berhasil dikirim via WhatsApp.");
      setSignModalOpen(false);
    } catch (e) {
      message.error(e.message);
    } finally {
      setSignWaitWa(false);
    }
  };

  /* ══════════════ RENDER ══════════════ */
  if (submitted) {
    // Resolve ketua tim name (internal or external)
    const ketuaTimName = resultData?.ketua_tim?.name || (resultData?.external_participants || []).find(e => e.is_ketua_tim)?.name || "Katim";
    const isKetuaTim = user?.employee?.id === resultData?.ketua_tim?.id || user?.nip === resultData?.ketua_tim?.nip;
    return (
      <div className="stw-page">
        <div className="stw-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
          <div className="stw-card stw-success" style={{ maxWidth: 520, width: "100%", padding: "48px 36px" }}>
            <div className="stw-scheck"><CheckOutlined style={{ fontSize: 40, color: "#fff" }} /></div>
            <h2>{isKatim ? "Surat Tugas & TTE Berhasil!" : "Surat Tugas Terkirim!"}</h2>
            <div className="stw-success-sub" style={{ marginBottom: 32 }}>
              {isKatim 
                ? "Data telah disimpan dan Protokol Kerja Anda telah ditandatangani secara elektronik (TTE). Notifikasi akan segera diteruskan ke Kepala Balai."
                : `Data berhasil dikirim.${resultData?.ketua_tim ? ` Sistem telah mengirimkan notifikasi WhatsApp ke Ketua Tim (${ketuaTimName}) untuk melakukan tanda tangan Protokol Kerja.` : ` Ketua Tim (${ketuaTimName}) adalah petugas luar, notifikasi admin telah dikirim.`}`
              }
              <br />
              Nomor Referensi: <strong>{resultData?.nomor_st || "Draft"}</strong>
            </div>
            {resultData && (
              <div style={{ textAlign: "left", marginTop: 20 }}>
                <div className="stw-rg">
                  <div className="stw-rl">Ketua Tim</div>
                  <div className="stw-rv">{ketuaTimName}</div>
                </div>
                <div className="stw-rg">
                  <div className="stw-rl">Anggota Tim Ditugaskan</div>
                  <div className="stw-rv">
                    <ol style={{ paddingLeft: 16, margin: 0 }}>
                      {resultData.employees?.map((e, idx) => (
                        <li key={idx}>{e.name}</li>
                      ))}
                      {(resultData.external_participants || []).map((e, idx) => (
                        <li key={`ext-${idx}`} style={{ color: "#64748b" }}>{e.name} <em>(Luar)</em></li>
                      ))}
                    </ol>
                  </div>
                </div>
                <div className="stw-rg">
                  <div className="stw-rl">Periode</div>
                  <div className="stw-rv">{dayjs(resultData.tanggal_mulai).format("DD MMMM YYYY")} — {dayjs(resultData.tanggal_selesai).format("DD MMMM YYYY")}</div>
                </div>
                {resultData.deskripsi_tugas && <div className="stw-rg"><div className="stw-rl">Agenda / Deskripsi</div><div className="stw-rv">{resultData.deskripsi_tugas}</div></div>}
                {resultData._lokasi && <div className="stw-rg"><div className="stw-rl">Lokasi Tugas</div><div className="stw-rv">{resultData._lokasi}</div></div>}
              </div>
            )}
            <Button type="primary" size="large" block icon={<RocketOutlined />} onClick={() => navigate("/app/layanan-mandiri")}
              style={{ height: 44, borderRadius: 10, background: "#0F5B99", border: "none", fontWeight: 600, marginTop: 24 }}>
              Kembali ke Layanan Mandiri
            </Button>
            <Button size="large" block icon={<FileProtectOutlined />}
              onClick={handleDownloadClick}
              style={{ height: 44, borderRadius: 10, fontWeight: 600, marginTop: 12, border: "1px solid #10b981", color: "#10b981", background: "#ffffff" }}>
              Unduh Protokol Kerja (PDF)
            </Button>

            {/* Modal TTE */}
            <Modal
              title="Tanda Tangan Elektronik Protokol Kerja"
              open={signModalOpen}
              onCancel={() => setSignModalOpen(false)}
              footer={null}
              destroyOnClose
            >
              {isKetuaTim ? (
                <div>
                  <p>Anda ditetapkan sebagai <strong>Ketua Tim</strong> pada surat tugas ini. Silakan masukkan password login Anda untuk membubuhkan QR Code TTE pada PDF Protokol Kerja.</p>
                  <Input.Password
                    placeholder="Masukkan password login SIPTU"
                    value={signPassword}
                    onChange={(e) => setSignPassword(e.target.value)}
                    style={{ marginBottom: 16 }}
                  />
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <Button onClick={handleDownloadWithoutQR}>Unduh Tanpa TTE</Button>
                    <Button type="primary" onClick={handleSignProtokol} loading={signLoading}>
                      Tandatangani & Unduh
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <p>Hanya Ketua Tim (<strong>{resultData?.ketua_tim?.name || "-"}</strong>) yang dapat membubuhkan Tanda Tangan Elektronik.</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24 }}>
                    <Button type="primary" onClick={handleRequestSignature} loading={signWaitWa} block>
                      Kirim Link Penandatanganan via WhatsApp ke Ketua Tim
                    </Button>
                    <Button onClick={handleDownloadWithoutQR} block>
                      Unduh Tanpa QR Code (Draft)
                    </Button>
                  </div>
                </div>
              )}
            </Modal>
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════ FORM ══════════════ */
  const cur = STEPS[step];

  return (
    <div className="stw-page">
      <div className="stw-container">
        {/* Top Navigation Bar with Precision Back Button */}
        <div className="stw-top-bar">
          <button className="stw-back-btn" onClick={() => navigate(-1)}>
            <ArrowLeftOutlined /> <span>Kembali</span>
          </button>
          <div className="stw-top-pill">
            <span className="stw-top-dot" />
            SIPTU LAYANAN MANDIRI
          </div>
        </div>

        {/* Header */}
        <div className="stw-header">
          <div className="stw-logo"><FileProtectOutlined /></div>
          <h2>Input Surat Tugas</h2>
          <div className="stw-header-sub">Sistem Informasi Pelayanan Tata Usaha — BPOM Palopo</div>
        </div>

        {/* Progress Stepper */}
        <div className="stw-progress">
          {STEPS.map((s, i) => (
            <div key={s.key} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "initial" }}>
              <div className={`stw-dot ${i === step ? "active" : i < step ? "done" : "pending"}`}>
                {i < step ? <CheckCircleOutlined /> : s.icon}
              </div>
              {i < STEPS.length - 1 && <div className={`stw-line ${i < step ? "done" : "pending"}`} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="stw-card">
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, borderRadius: "16px 16px 0 0", background: cur.color || "#0F5B99", transition: "background .3s ease" }} />
          <div className={fadeClass}>
            {/* Step Header */}
            <div className="stw-sh">
              <div className="stw-si" style={{ background: cur.color || "#0F5B99" }}>{cur.icon}</div>
              <div><div className="stw-st">{cur.title}</div><div className="stw-ss">{cur.subtitle}</div></div>
            </div>

            <Form form={form} layout="vertical" requiredMark={false} size="large">
              {/* Hidden field for validation */}
              <Form.Item name="employee_ids" hidden><Input /></Form.Item>

              {/* ══ Step 0: Pegawai ══ */}
              {step === 0 && (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <Select
                      placeholder="Ketik nama untuk mencari pegawai..."
                      showSearch
                      optionFilterProp="label"
                      loading={employeesLoading}
                      value={null}
                      onChange={(val) => { addEmployee(val); }}
                      style={{ width: "100%" }}
                      options={getGroupedEmployees(employees.filter((e) => !selectedEmployees.find((s) => s.id === e.id)))}
                      notFoundContent={employeesLoading ? <Spin size="small" /> : "Tidak ditemukan"}
                    />
                    <Text type="secondary" style={{ fontSize: 12, marginTop: 6, display: "block" }}>
                      Pilih pegawai satu per satu dari dropdown di atas
                    </Text>
                  </div>

                  {/* Selected employees list */}
                  {selectedEmployees.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "32px 0", color: "#cbd5e1" }}>
                      <TeamOutlined style={{ fontSize: 40, marginBottom: 12, display: "block" }} />
                      <div style={{ fontSize: 13 }}>Belum ada pegawai dipilih</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
                        {selectedEmployees.length} Pegawai dipilih
                      </div>
                      {selectedEmployees.map((emp, idx) => (
                        <div 
                          className="stw-emp-card" 
                          key={emp.id} 
                          style={{ 
                            animationDelay: `${idx * 0.05}s`, 
                            cursor: "grab", 
                            opacity: draggedItemIndex?.index === idx && draggedItemIndex?.type === 'internal' ? 0.5 : 1 
                          }}
                          draggable
                          onDragStart={(e) => handleDragStart(e, idx, 'internal')}
                          onDragEnter={(e) => handleDragEnter(e, idx, 'internal')}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => e.preventDefault()}
                        >
                          <div style={{ color: "#cbd5e1", marginRight: 4, cursor: "grab", display: "flex", alignItems: "center" }}><MenuOutlined /></div>
                          <div className="stw-emp-avatar" style={{ cursor: "grab" }}><UserOutlined /></div>
                          <div className="stw-emp-info">
                            <div className="stw-emp-name">{emp.name}</div>
                            <div className="stw-emp-nip">
                              {emp.nip && <><IdcardOutlined style={{ marginRight: 4 }} />{emp.nip}</>}
                              {emp.position && <span style={{ marginLeft: 8, color: "#6D94C5", fontFamily: "inherit" }}>{emp.position}</span>}
                            </div>
                          </div>
                          <button className="stw-emp-rm" onClick={() => removeEmployee(emp.id)}><CloseOutlined style={{ fontSize: 11 }} /></button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* External employees list */}
                  <div style={{ marginTop: 24, padding: "20px", background: "#fdfefe", border: "1.5px dashed #e2e8f0", borderRadius: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", display: "flex", alignItems: "center", gap: 8 }}>
                        <UserOutlined style={{ color: "#0F5B99" }} /> Petugas Luar Database
                      </div>
                      <Button type="dashed" size="small" icon={<RocketOutlined />} onClick={() => setIsExtModalOpen(true)} style={{ borderRadius: 8, fontSize: 12 }}>
                        Tambah Petugas Luar
                      </Button>
                    </div>

                    {selectedExternal.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "12px 0", color: "#94a3b8", fontSize: 12 }}>
                        Belum ada petugas luar ditambahkan
                      </div>
                    ) : (
                      selectedExternal.map((ext, idx) => (
                        <div 
                          className="stw-emp-card" 
                          key={ext.id} 
                          style={{ 
                            borderStyle: "dashed", 
                            borderColor: "#cbd5e1", 
                            cursor: "grab",
                            opacity: draggedItemIndex?.index === idx && draggedItemIndex?.type === 'external' ? 0.5 : 1
                          }}
                          draggable
                          onDragStart={(e) => handleDragStart(e, idx, 'external')}
                          onDragEnter={(e) => handleDragEnter(e, idx, 'external')}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => e.preventDefault()}
                        >
                          <div style={{ color: "#cbd5e1", marginRight: 4, cursor: "grab", display: "flex", alignItems: "center" }}><MenuOutlined /></div>
                          <div className="stw-emp-avatar" style={{ background: "linear-gradient(135deg, #94a3b8, #64748b)", cursor: "grab" }}><UserOutlined /></div>
                          <div className="stw-emp-info">
                            <div className="stw-emp-name" style={{ color: "#475569" }}>{ext.name} <Tag color="default" style={{ marginLeft: 4, fontSize: 10 }}>LUAR</Tag></div>
                            <div className="stw-emp-nip">
                              {ext.nip ? ext.nip : "Tanpa NIP"} • {ext.jabatan || "Tanpa Jabatan"}
                            </div>
                          </div>
                          <button className="stw-emp-rm" onClick={() => removeExternal(ext.id)}><CloseOutlined style={{ fontSize: 11 }} /></button>
                        </div>
                      ))
                    )}
                  </div>

                  <Modal
                    title="Tambah Petugas Luar Database"
                    open={isExtModalOpen}
                    onCancel={() => setIsExtModalOpen(false)}
                    onOk={() => extForm.submit()}
                    okText="Tambahkan"
                    cancelText="Batal"
                    centered
                    styles={{ body: { paddingTop: 12 } }}
                  >
                    <Form form={extForm} layout="vertical" onFinish={addExternal}>
                      <Form.Item name="name" label="Nama Lengkap" rules={[{ required: true, message: "Nama wajib diisi" }]}>
                        <Input placeholder="Contoh: Budi Santoso" />
                      </Form.Item>
                      <Form.Item name="nip" label="NIP / Identitas (Opsional)">
                        <Input placeholder="Contoh: 1980... atau -" />
                      </Form.Item>
                      <Form.Item name="pangkat" label="Pangkat / Golongan (Opsional)">
                        <Input placeholder="Contoh: Pembina - IV/a" />
                      </Form.Item>
                      <Form.Item name="jabatan" label="Jabatan (Opsional)">
                        <Input placeholder="Contoh: Inspektur" />
                      </Form.Item>
                    </Form>
                  </Modal>

                  {/* Ketua Tim selector */}
                  <div style={{ marginTop: 20, padding: "20px 24px", background: "linear-gradient(135deg, #fffbeb, #fef3c7)", borderRadius: 16, border: "1px solid #fde68a" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                      <CrownOutlined style={{ color: "#d97706", fontSize: 16 }} />
                      Pilih Ketua Tim
                    </div>
                    <Select
                      placeholder="Ketik nama untuk mencari Ketua Tim..."
                      showSearch
                      optionFilterProp="label"
                      loading={employeesLoading}
                      value={ketuaTimId}
                      onChange={(val) => setKetuaTimId(val)}
                      style={{ width: "100%" }}
                      options={[
                        ...getGroupedEmployees(employees),
                        ...(selectedExternal.length > 0 ? [{
                          label: "Petugas Luar",
                          options: selectedExternal.map((e) => ({
                            value: e.id,
                            label: `${e.name}${e.nip ? ` (${e.nip})` : ""} [LUAR]`,
                          })),
                        }] : []),
                      ]}
                      notFoundContent={employeesLoading ? <Spin size="small" /> : "Tidak ditemukan"}
                    />
                    <Text type="secondary" style={{ fontSize: 11, marginTop: 6, display: "block", color: "#b45309" }}>
                      Ketua Tim akan tercetak pada Protokol Kerja dan Surat Tugas
                    </Text>
                  </div>
                </>
              )}

              {/* ══ Step 1: Tanggal & Lokasi ══ */}
              {step === 1 && (
                <>
                  <Form.Item name="tanggal_tugas" label="Tanggal Tugas (Mulai – Selesai)" rules={[{ required: true, message: "Pilih rentang tanggal" }]}>
                    <RangePicker style={{ width: "100%" }} format="DD/MM/YYYY" placeholder={["Tanggal Mulai", "Tanggal Selesai"]} />
                  </Form.Item>

                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      <CompassOutlined style={{ color: "#4A90E2" }} /> Lokasi Tujuan Tugas
                    </div>
                    <Form.Item name="lokasi_hidden" hidden><Input /></Form.Item>
                    <div className="stw-loc-pills">
                      {LOKASI_OPTIONS.map((loc) => (
                        <div key={loc}
                          className={`stw-loc-pill ${lokasi === loc ? "sel" : "idle"}`}
                          onClick={() => { setLokasi(loc); form.setFieldsValue({ lokasi_hidden: loc }); }}
                        >{loc}</div>
                      ))}
                      <div
                        className={`stw-loc-pill ${lokasi === "lainnya" ? "sel" : "idle"}`}
                        onClick={() => { setLokasi("lainnya"); form.setFieldsValue({ lokasi_hidden: "lainnya" }); }}
                      >Lainnya</div>
                    </div>
                    {lokasi === "lainnya" && (
                      <Form.Item name="lokasi_lainnya" style={{ marginTop: 12, marginBottom: 0 }} rules={[{ required: true, message: "Isi detail lokasi" }]}>
                        <Input prefix={<CompassOutlined style={{ color: "#94a3b8" }} />} placeholder="Isi detail lokasi tujuan tugas..." />
                      </Form.Item>
                    )}
                  </div>

                  <Form.Item name="deskripsi_tugas" label="Agenda / Deskripsi Tugas" rules={[{ required: true, message: "Isi agenda/deskripsi tugas" }]} style={{ marginTop: 20 }}>
                    <TextArea rows={3} placeholder="Instruksi / Agenda kegiatan (Contoh: Melakukan pengawasan dan pembinaan)..." />
                  </Form.Item>
                </>
              )}

              {/* ══ Step 2: MAK & Sarana ══ */}
              {step === 2 && (
                <>
                  <Form.Item
                    name="mak"
                    label="MAK (Mata Anggaran Keluaran)"
                    rules={[
                      { required: true, message: "MAK wajib diisi, atau tulis '-' jika tidak ada." },
                      {
                        validator: (_, value) => {
                          if (!value) return Promise.resolve();
                          const val = value.trim();
                          if (val === "-") return Promise.resolve();
                          if (val.length < 20) {
                            return Promise.reject(new Error("MAK minimal 20 karakter (atau tulis '-' jika tidak ada)"));
                          }
                          return Promise.resolve();
                        }
                      }
                    ]}
                    extra={<span style={{ fontSize: "12px", color: "#64748b", display: "block", marginTop: "6px" }}>Format pengisian: <strong>3165.BDC.001.051.D.521211</strong> (atau tulis <strong>-</strong> jika tidak ada MAK)</span>}
                  >
                    <AutoComplete
                      className="mak-autocomplete"
                      options={makSuggestions}
                      onSearch={handleMakSearch}
                      onFocus={() => { if (makSuggestions.length === 0) fetchMakSuggestions(); }}
                      placeholder="Contoh: 3165.BDC.001.051.D.521211"
                    >
                      <Input prefix={<DollarOutlined style={{ color: "#94a3b8" }} />} />
                    </AutoComplete>
                  </Form.Item>

                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      <EnvironmentOutlined style={{ color: "#10b981" }} /> Data Sarana (Sinkronisasi SIAMPARAN)
                    </div>
                    <Select
                      placeholder="Ketik untuk mencari sarana..."
                      showSearch
                      filterOption={false}
                      onSearch={(v) => fetchSaranaDebounced(v)}
                      loading={saranaLoading}
                      value={null}
                      onChange={(val) => { addSarana(val); }}
                      style={{ width: "100%", marginBottom: 12 }}
                      notFoundContent={
                        saranaLoading
                          ? <div style={{ textAlign: "center", padding: 16 }}><Spin size="small" /><div style={{ marginTop: 8, color: "#94a3b8", fontSize: 12 }}>Memuat...</div></div>
                          : <div style={{ textAlign: "center", padding: 16, color: "#94a3b8" }}>Tidak ditemukan</div>
                      }
                      options={saranaOptions.filter((s) => !selectedSarana.find((ss) => ss.id === s.id)).map((s) => ({
                        value: s.id,
                        label: s.nama,
                      }))}
                      optionRender={(option) => {
                        const sar = saranaMap[option.value] || saranaOptions.find((s) => s.id === option.value);
                        return (
                          <div style={{ padding: "4px 0" }}>
                            <div style={{ fontWeight: 500, color: "#1e293b" }}>{option.label}</div>
                            {sar?.lokasi && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}><EnvironmentOutlined /> {sar.lokasi}</div>}
                            {sar?.jenis?.length > 0 && (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                                {sar.jenis.map((j, i) => (
                                  <Tag key={i} style={{ fontSize: 11, margin: 0, borderRadius: 6, background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", padding: "0 6px", lineHeight: "20px" }}>{j}</Tag>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }}
                    />
                    <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 12 }}>Bisa memilih lebih dari satu sarana</Text>

                    {/* Selected sarana list */}
                    {selectedSarana.map((sar, idx) => (
                      <div className="stw-sar-card" key={sar.id} style={{ animationDelay: `${idx * 0.05}s` }}>
                        <div className="stw-sar-icon"><BankOutlined /></div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="stw-sar-name">{sar.nama}</div>
                          {sar.lokasi && <div className="stw-sar-loc"><EnvironmentOutlined /> {sar.lokasi}</div>}
                          {sar.jenis?.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                              {sar.jenis.map((j, i) => (
                                <Tag key={i} style={{ fontSize: 11, margin: 0, borderRadius: 8, background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", padding: "1px 8px", lineHeight: "20px" }}>{j}</Tag>
                              ))}
                            </div>
                          )}
                        </div>
                        <button className="stw-emp-rm" onClick={() => removeSarana(sar.id)}><CloseOutlined style={{ fontSize: 11 }} /></button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ══ Step 3: Review ══ */}
              {step === 3 && (
                <div>
                  <div className="stw-summary-sheet">
                    {/* Sheet Header */}
                    <div className="stw-summary-header">
                      <div className="stw-summary-title">
                        <FileProtectOutlined className="stw-summary-icon" />
                        <span>Ringkasan Penugasan</span>
                      </div>
                      <div className="stw-summary-badge">DRAF SURAT TUGAS</div>
                    </div>

                    {/* Summary 2-Column Grid */}
                    <div className="stw-summary-grid">
                      {/* Ketua Tim */}
                      <div className="stw-summary-cell stw-col-full">
                        <span className="stw-summary-label">Ketua Tim</span>
                        <div className="stw-summary-value">
                          {reviewData.ketuaTim ? (
                            <div className="stw-katim-pill">
                              <CrownOutlined style={{ color: "#d97706" }} />
                              <span className="stw-katim-name">{reviewData.ketuaTim.name}</span>
                              {reviewData.ketuaTim.nip && <span className="stw-katim-nip">NIP. {reviewData.ketuaTim.nip}</span>}
                            </div>
                          ) : <span className="stw-empty-val">-</span>}
                        </div>
                      </div>

                      {/* Periode Tugas */}
                      <div className="stw-summary-cell">
                        <span className="stw-summary-label">Periode Tugas</span>
                        <div className="stw-summary-value stw-val-flex">
                          <CalendarOutlined style={{ color: "#0f5b99" }} />
                          <span>{reviewData.tanggal_tugas ? `${reviewData.tanggal_tugas[0]?.format("DD MMMM YYYY")} — ${reviewData.tanggal_tugas[1]?.format("DD MMMM YYYY")}` : "-"}</span>
                        </div>
                      </div>

                      {/* Lokasi Tujuan */}
                      <div className="stw-summary-cell">
                        <span className="stw-summary-label">Lokasi Tujuan</span>
                        <div className="stw-summary-value stw-val-flex">
                          <EnvironmentOutlined style={{ color: "#0f5b99" }} />
                          <span>{reviewData.lokasiStr || "-"}</span>
                        </div>
                      </div>

                      {/* MAK */}
                      <div className="stw-summary-cell">
                        <span className="stw-summary-label">MAK (Mata Anggaran Keluaran)</span>
                        <div className="stw-summary-value">
                          {reviewData.mak ? <span className="stw-mak-code">{reviewData.mak}</span> : <span className="stw-empty-val">-</span>}
                        </div>
                      </div>

                      {/* Total Anggota */}
                      <div className="stw-summary-cell">
                        <span className="stw-summary-label">Jumlah Petugas</span>
                        <div className="stw-summary-value">
                          {(reviewData.empList?.length || 0) + (reviewData.extList?.length || 0)} Orang
                        </div>
                      </div>

                      {/* Anggota Tim */}
                      <div className="stw-summary-cell stw-col-full">
                        <span className="stw-summary-label">Anggota Tim Ditugaskan</span>
                        <div className="stw-summary-value">
                          <div className="stw-members-tags">
                            {(reviewData.empList || []).map((e) => (
                              <div className="stw-member-tag" key={e.id}>
                                <UserOutlined className="stw-member-icon" />
                                <span>{e.name}</span>
                              </div>
                            ))}
                            {(reviewData.extList || []).map((e) => (
                              <div className="stw-member-tag stw-ext-tag" key={e.id}>
                                <UserOutlined className="stw-member-icon" />
                                <span>{e.name} <em style={{ fontStyle: "normal", fontSize: 10, opacity: 0.8 }}>(Luar)</em></span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Agenda / Deskripsi */}
                      {reviewData.deskripsi_tugas && (
                        <div className="stw-summary-cell stw-col-full">
                          <span className="stw-summary-label">Agenda / Deskripsi Kegiatan</span>
                          <div className="stw-summary-desc-box">
                            {reviewData.deskripsi_tugas}
                          </div>
                        </div>
                      )}

                      {/* Data Sarana */}
                      {reviewData.sarList?.length > 0 && (
                        <div className="stw-summary-cell stw-col-full">
                          <span className="stw-summary-label">Data Sarana (Sinkronisasi SIAMPARAN)</span>
                          <div className="stw-sarana-summary-grid">
                            {reviewData.sarList.map((s) => (
                              <div key={s.id} className="stw-sar-sum-item">
                                <div className="stw-sar-sum-head">
                                  <BankOutlined style={{ color: "#059669" }} />
                                  <span className="stw-sar-sum-title">{s.nama}</span>
                                </div>
                                {s.lokasi && (
                                  <div className="stw-sar-sum-loc">
                                    <EnvironmentOutlined /> {s.lokasi}
                                  </div>
                                )}
                                {s.jenis?.length > 0 && (
                                  <div className="stw-sar-sum-tags">
                                    {s.jenis.map((j, i) => (
                                      <span key={i} className="stw-sar-tag">{j}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* TTE Mandatory for Katim */}
                  {isKatim && (
                    <div className="stw-tte-box">
                      <div className="stw-tte-head">
                        <SafetyCertificateOutlined className="stw-tte-icon" />
                        <div>
                          <div className="stw-tte-title">Konfirmasi TTE Protokol Kerja</div>
                          <div className="stw-tte-sub">Anda terdeteksi sebagai <strong>Ketua Tim</strong>. Silakan masukkan password SIPTU Anda untuk menandatangani Protokol Kerja secara otomatis saat pengiriman.</div>
                        </div>
                      </div>
                      <Input.Password
                        placeholder="Masukkan password SIPTU Anda..."
                        size="large"
                        value={ttePassword}
                        onChange={(e) => setTtePassword(e.target.value)}
                        prefix={<LockOutlined style={{ color: "#0f5b99" }} />}
                        style={{ borderRadius: 10 }}
                      />
                    </div>
                  )}
                </div>
              )}
            </Form>

            {/* Nav */}
            <div className="stw-nav">
              {step > 0 ? <Button className="stw-bp" onClick={goBack} icon={<ArrowLeftOutlined />}>Kembali</Button> : <div />}
              {step < 3 ? (
                <Button type="primary" className="stw-bn" onClick={validateAndNext} icon={<ArrowRightOutlined />} iconPosition="end">Lanjut</Button>
              ) : (
                <Button 
                  type="primary" 
                  className="stw-bs" 
                  onClick={handleSubmit} 
                  loading={loading} 
                  disabled={isKatim && !ttePassword}
                  icon={isKatim ? <SafetyCertificateOutlined /> : <SendOutlined />} 
                  block
                >
                  {isKatim ? "Kirim & TTE Protokol" : "Kirim Surat Tugas"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuratTugasForm;
