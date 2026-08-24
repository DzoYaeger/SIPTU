import { useEffect, useState, useCallback, useMemo } from "react";
import {
  App as AntdApp,
  Card,
  Typography,
  Table,
  Tag,
  DatePicker,
  Input,
  InputNumber,
  Statistic,
  Row,
  Col,
  Button,
  Spin,
  Select,
  Badge,
  Space,
  Avatar,
  Modal,
  Tooltip,
  TimePicker,
  Dropdown,
} from "antd";
import {
  ClockCircleOutlined,
  LogoutOutlined,
  LoginOutlined,
  DeleteOutlined,
  SearchOutlined,
  UserOutlined,
  FieldTimeOutlined,
  ReloadOutlined,
  DownOutlined,
  RightOutlined,
  CalendarOutlined,
  PlusOutlined,
  FileWordOutlined,
  EditOutlined,
  CheckCircleOutlined,
  HomeOutlined,
  TeamOutlined,
  MoreOutlined,
  ClearOutlined,
  BarChartOutlined,
  AlertOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "../hooks/useAuth.js";
import { buildMessageAdapter } from "../utils/notify.js";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import "./RispegMonitoringIzinKeluar.css";

const { Title, Text } = Typography;

function RispegMonitoringIzinKeluar() {
  const { apiFetch, token } = useAuth();
  const { message } = AntdApp.useApp();
  const msg = buildMessageAdapter(message);

  const [data, setData] = useState([]);
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filterDate, setFilterDate] = useState(dayjs());
  const [filterMode, setFilterMode] = useState("date"); // date | month
  const [search, setSearch] = useState("");
  const [expandedRows, setExpandedRows] = useState([]);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [nomorSuratModalOpen, setNomorSuratModalOpen] = useState(false);
  const [selectedPermit, setSelectedPermit] = useState(null);
  const [nomorSuratInput, setNomorSuratInput] = useState("");
  const [savingNomorSurat, setSavingNomorSurat] = useState(false);
  const [generatingPermitId, setGeneratingPermitId] = useState(null);
  const [manualReturnModalOpen, setManualReturnModalOpen] = useState(false);
  const [manualReturnPermit, setManualReturnPermit] = useState(null);
  const [manualReturnTime, setManualReturnTime] = useState(null);
  const [manualReturnDate, setManualReturnDate] = useState(null);
  const [manualReturnNote, setManualReturnNote] = useState(
    "Lupa absen kembali di aplikasi",
  );
  const [savingManualReturn, setSavingManualReturn] = useState(false);
  const [urusanModalOpen, setUrusanModalOpen] = useState(false);
  const [selectedPermitForUrusan, setSelectedPermitForUrusan] = useState(null);
  const [newUrusanValue, setNewUrusanValue] = useState("Pribadi");
  const [savingUrusan, setSavingUrusan] = useState(false);
  const [editTimeModalOpen, setEditTimeModalOpen] = useState(false);
  const [editTimePermit, setEditTimePermit] = useState(null);
  const [editTimeDate, setEditTimeDate] = useState(null);
  const [editExit, setEditExit] = useState({ h: 0, m: 0, s: 0 });
  const [editReturn, setEditReturn] = useState({ h: 0, m: 0, s: 0 });
  const [editReturnEnabled, setEditReturnEnabled] = useState(false);
  const [savingEditTime, setSavingEditTime] = useState(false);
  const [filterPermitType, setFilterPermitType] = useState("all");
  const [filterDuration, setFilterDuration] = useState("all"); // all | hide_zero | only_zero
  const [breakSettings, setBreakSettings] = useState({
    mon_thu: { start: "12:00", end: "13:00" },
    fri: { start: "12:00", end: "13:30" },
  });
  const [liveNow, setLiveNow] = useState(Date.now());

  // const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterMode === "date") {
        params.set("date", filterDate.format("YYYY-MM-DD"));
      } else {
        params.set("month", filterDate.format("M"));
        params.set("year", filterDate.format("YYYY"));
      }
      if (search.trim()) params.set("search", search.trim());
      if (filterPermitType !== "all") params.set("permit_type", filterPermitType);

      const [listRes, statsRes] = await Promise.all([
        apiFetch(`/exit-permits?${params}`),
        apiFetch(
          `/exit-permits/stats?date=${filterDate.format("YYYY-MM-DD")}&month=${filterDate.format("M")}&year=${filterDate.format("YYYY")}`,
        ),
      ]);

      if (!listRes.ok || !statsRes.ok) throw new Error("Gagal memuat data.");

      setData(await listRes.json());
      setStats(await statsRes.json());
    } catch (e) {
      msg.error({ message: e.message });
    } finally {
      setLoading(false);
    }
  }, [filterDate, filterMode, search, filterPermitType, token]);

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const r = await apiFetch(
        `/exit-permits/analytics?month=${filterDate.format("M")}&year=${filterDate.format("YYYY")}`,
      );
      if (!r.ok) throw new Error("Gagal memuat data analitik.");
      setAnalytics(await r.json());
    } catch (e) {
      console.error("Failed to fetch analytics", e);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [apiFetch, filterDate]);
  
  const fetchBreakSettings = useCallback(async () => {
    try {
      const r = await apiFetch("/admin/exit-permit-settings");
      if (r.ok) {
        const json = await r.json();
        console.log("Fetched break settings:", json);
        setBreakSettings(json);
      } else {
        console.error("Failed to fetch break settings, status:", r.status);
      }
    } catch (e) {
      console.error("Failed to fetch break settings", e);
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchData();
    fetchAnalytics();
    fetchBreakSettings();
  }, [fetchData, fetchAnalytics, fetchBreakSettings]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterDate, filterMode, search, filterPermitType, filterDuration]);

  useEffect(() => {
    const intervalId = setInterval(() => setLiveNow(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  const handleDelete = async (id) => {
    try {
      const r = await apiFetch(`/exit-permits/${id}`, {
        method: "DELETE",
      });
      if (!r.ok) throw new Error("Gagal menghapus.");
      msg.success({ message: "Data berhasil dihapus." });
      fetchData();
    } catch (e) {
      msg.error({ message: e.message });
    }
  };

  const openNomorSuratModal = (permit) => {
    setSelectedPermit(permit);
    setNomorSuratInput(permit?.nomor_surat || "");
    setNomorSuratModalOpen(true);
  };

  const handleSaveNomorSurat = async () => {
    if (!selectedPermit?.id) return;

    if (!nomorSuratInput.trim()) {
      msg.error({ message: "Nomor surat wajib diisi." });
      return;
    }

    setSavingNomorSurat(true);
    try {
      const r = await apiFetch(
        `/exit-permits/${selectedPermit.id}/nomor-surat`,
        {
          method: "PUT",
          body: JSON.stringify({
            nomor_surat: nomorSuratInput.trim(),
          }),
        },
      );

      if (!r.ok) throw new Error("Gagal menyimpan nomor surat.");
      msg.success({ message: "Nomor surat berhasil disimpan." });
      setNomorSuratModalOpen(false);
      setSelectedPermit(null);
      setNomorSuratInput("");
      fetchData();
    } catch (e) {
      msg.error({ message: e.message });
    } finally {
      setSavingNomorSurat(false);
    }
  };

  const handleGenerateWord = async (permit) => {
    if (!permit?.id || !permit?.nomor_surat) return;

    setGeneratingPermitId(permit.id);
    try {
      const r = await apiFetch(`/exit-permits/${permit.id}/generate-word`, {
        method: "GET",
      });

      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.message || "Gagal generate Word.");
      }

      const blob = await r.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      const employee = (permit.employee_name || "pegawai")
        .toString()
        .replace(/\s+/g, "_");
      a.href = url;
      a.download = `Surat_Izin_Keluar_${employee}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      msg.success({ message: "File Word berhasil digenerate." });
    } catch (e) {
      msg.error({ message: e.message });
    } finally {
      setGeneratingPermitId(null);
    }
  };

  const openManualReturnModal = (permit) => {
    setManualReturnPermit(permit);
    setManualReturnTime(dayjs());
    setManualReturnDate(dayjs(permit.date));
    setManualReturnNote("Lupa absen kembali di aplikasi");
    setManualReturnModalOpen(true);
  };

  const parseTimeToHMS = (timeStr) => {
    if (!timeStr) return { h: 0, m: 0, s: 0 };
    const parts = timeStr.split(":");
    return {
      h: parseInt(parts[0] || "0", 10),
      m: parseInt(parts[1] || "0", 10),
      s: parseInt(parts[2] || "0", 10),
    };
  };

  const hmsToString = (hms) =>
    `${String(hms.h).padStart(2, "0")}:${String(hms.m).padStart(2, "0")}:${String(hms.s).padStart(2, "0")}`;

  const openEditTimeModal = (permit) => {
    setEditTimePermit(permit);
    setEditTimeDate(dayjs(permit.date));
    setEditExit(parseTimeToHMS(permit.exit_time));
    setEditReturn(parseTimeToHMS(permit.return_time));
    setEditReturnEnabled(!!permit.return_time);
    setEditTimeModalOpen(true);
  };

  const handleSaveEditTime = async () => {
    if (!editTimePermit?.id) return;

    setSavingEditTime(true);
    try {
      const payload = {
        date: editTimeDate.format("YYYY-MM-DD"),
        exit_time: hmsToString(editExit),
      };
      if (editReturnEnabled) {
        payload.return_time = hmsToString(editReturn);
      }

      const r = await apiFetch(
        `/exit-permits/${editTimePermit.id}/update-times`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        },
      );

      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(body?.message || "Gagal memperbarui waktu.");
      }

      msg.success({ message: body?.message || "Waktu berhasil diperbarui." });
      setEditTimeModalOpen(false);
      setEditTimePermit(null);
      fetchData();
    } catch (e) {
      msg.error({ message: e.message });
    } finally {
      setSavingEditTime(false);
    }
  };

  const handleSubmitManualReturn = async () => {
    if (!manualReturnPermit?.id) return;
    if (!manualReturnTime) {
      msg.error({ message: "Jam kembali wajib diisi." });
      return;
    }

    setSavingManualReturn(true);
    try {
      const r = await apiFetch(
        `/admin/exit-permits/${manualReturnPermit.id}/manual-return`,
        {
          method: "PUT",
          body: JSON.stringify({
            date: manualReturnDate.format("YYYY-MM-DD"),
            return_time: manualReturnTime.format("HH:mm"),
            note: manualReturnNote?.trim() || "Lupa absen kembali di aplikasi",
          }),
        },
      );

      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(body?.message || "Gagal menginput jam kembali manual.");
      }

      msg.success({
        message: body?.message || "Jam kembali berhasil diinput manual.",
      });
      setManualReturnModalOpen(false);
      setManualReturnPermit(null);
      setManualReturnTime(null);
      setManualReturnNote("Lupa absen kembali di aplikasi");
      fetchData();
    } catch (e) {
      msg.error({ message: e.message });
    } finally {
      setSavingManualReturn(false);
    }
  };

  const openUrusanModal = (permit) => {
    setSelectedPermitForUrusan(permit);
    setNewUrusanValue(permit?.permit_type || "Pribadi");
    setUrusanModalOpen(true);
  };

  const handleUpdateUrusan = async () => {
    if (!selectedPermitForUrusan?.id) return;
    setSavingUrusan(true);
    try {
      const r = await apiFetch(`/exit-permits/${selectedPermitForUrusan.id}/permit-type`, {
        method: "PUT",
        body: JSON.stringify({
          permit_type: newUrusanValue,
        }),
      });

      if (!r.ok) throw new Error("Gagal memperbarui jenis urusan.");
      msg.success({ message: "Jenis urusan berhasil diperbarui." });
      setUrusanModalOpen(false);
      setSelectedPermitForUrusan(null);
      fetchData();
    } catch (e) {
      msg.error({ message: e.message });
    } finally {
      setSavingUrusan(false);
    }
  };

  const formatTime = (t) => {
    if (!t) return "-";
    const parts = t.split(":");
    if (parts.length >= 3) return `${parts[0]}:${parts[1]}:${parts[2]}`;
    return `${parts[0]}:${parts[1]}:00`;
  };

  const formatDurationSeconds = (totalSeconds) => {
    const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    const s = safe % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const formatDuration = (min) => {
    if (min == null) return "-";
    return formatDurationSeconds(Number(min) * 60);
  };

  const getLiveDurationSeconds = (permit) => {
    if (!permit) return 0;

    const calculateEffective = (startMoment, endMoment, dateStr) => {
      if (!startMoment || !endMoment) return { effective: 0, overlap: 0 };
      
      const total = endMoment.diff(startMoment, "second");
      if (!breakSettings) return { effective: Math.max(0, total), overlap: 0 };

      const day = startMoment.day(); // 0 is Sunday, 5 is Friday
      let config = null;
      if (day === 5) config = breakSettings?.fri;
      else if (day >= 1 && day <= 4) config = breakSettings?.mon_thu;

      if (!config || !config.start || !config.end) return { effective: Math.max(0, total), overlap: 0 };

      const dStr = dayjs(dateStr).format("YYYY-MM-DD");
      const bStart = dayjs(`${dStr} ${config.start}:00`);
      const bEnd = dayjs(`${dStr} ${config.end}:00`);

      // Overlap calculation
      const oStart = startMoment.isAfter(bStart) ? startMoment : bStart;
      const oEnd = endMoment.isBefore(bEnd) ? endMoment : bEnd;

      let overlap = 0;
      if (oStart.isBefore(oEnd)) {
        overlap = oEnd.diff(oStart, "second");
      }
      
      return { 
        effective: Math.max(0, total - overlap), 
        overlap: overlap 
      };
    };

    const parseToDayjs = (timeValue, isoValue) => {
      let d;
      if (isoValue) {
        d = dayjs(isoValue);
      } else {
        const dateStr = permit.date?.toString().split("T")[0] || dayjs().format("YYYY-MM-DD");
        const timeStr = (timeValue || "00:00:00").toString().trim().split(".")[0];
        d = dayjs(`${dateStr} ${timeStr}`);
      }
      
      // CRITICAL: Normalize to local time string and back to strip any TZ offsets 
      // ensuring it is directly comparable to the concatenated break strings.
      if (d.isValid()) {
        const localStr = d.format("YYYY-MM-DD HH:mm:ss");
        return dayjs(localStr);
      }
      
      return dayjs().startOf('day');
    };

    const exitMoment = parseToDayjs(permit.exit_time, permit.exit_at_iso);
    let result;

    if (permit.status !== "out") {
      const returnMoment = parseToDayjs(permit.return_time, permit.return_at_iso);
      result = calculateEffective(exitMoment, returnMoment, permit.date);
    } else {
      const currentMoment = dayjs(liveNow);
      result = calculateEffective(exitMoment, currentMoment, permit.date);
    }

    return result; 
  };

  // Filter raw permits by duration option (e.g. hide 00:00:00 duration)
  const processedData = useMemo(() => {
    if (filterDuration === "all") return data;
    return data.filter((item) => {
      const { effective } = getLiveDurationSeconds(item);
      const isZero = (effective || 0) <= 0;
      if (filterDuration === "hide_zero") return !isZero;
      if (filterDuration === "only_zero") return isZero;
      return true;
    });
  }, [data, filterDuration, liveNow, breakSettings]);

  // Group data by employee
  const groupedData = useMemo(() => {
    const groups = {};
    processedData.forEach((item) => {
      const key = item.employee_id || item.nip;
      if (!groups[key]) {
        groups[key] = {
          employee_id: item.employee_id,
          employee_name: item.employee_name,
          nip: item.nip,
          permits: [],
          totalPermits: 0,
          totalDuration: 0,
          currentlyOut: 0,
          pribadiCount: 0,
          kantorCount: 0,
        };
      }
      groups[key].permits.push(item);
      groups[key].totalPermits += 1;
      groups[key].totalDuration += (getLiveDurationSeconds(item).effective || 0) / 60;
      
      if (item.permit_type === "Kantor") {
        groups[key].kantorCount += 1;
      } else {
        groups[key].pribadiCount += 1;
      }

      if (item.status === "out") {
        groups[key].currentlyOut += 1;
      }
    });
    return Object.values(groups);
  }, [processedData, liveNow, breakSettings]);

  // Filter grouped data by search
  const filteredGroupedData = useMemo(() => {
    if (!search.trim()) return groupedData;
    const lowerSearch = search.toLowerCase();
    return groupedData.filter(
      (group) =>
        group.employee_name?.toLowerCase().includes(lowerSearch) ||
        group.nip?.toLowerCase().includes(lowerSearch),
    );
  }, [groupedData, search]);

  const toggleExpand = (employeeId) => {
    setExpandedRows((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId],
    );
  };

  const columns = [
    {
      title: "",
      key: "expand",
      width: 40,
      render: (_, record) => (
        <Button
          type="text"
          icon={
            expandedRows.includes(record.employee_id) ? (
              <DownOutlined />
            ) : (
              <RightOutlined />
            )
          }
          onClick={() => toggleExpand(record.employee_id)}
          size="small"
        />
      ),
    },
    {
      title: "Nama Pegawai",
      dataIndex: "employee_name",
      key: "employee_name",
      render: (name, record) => (
        <div>
          <div style={{ fontWeight: 600, color: "#1f2937" }}>{name}</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>{record.nip}</div>
        </div>
      ),
    },
    {
      title: "Total Izin",
      dataIndex: "totalPermits",
      key: "totalPermits",
      width: 100,
      align: "center",
      render: (count) => (
        <Badge count={count} style={{ backgroundColor: "#4f46e5" }} />
      ),
    },
    {
      title: "Total Durasi",
      dataIndex: "totalDuration",
      key: "totalDuration",
      width: 120,
      align: "center",
      render: (min) => <Tag color="blue">{formatDuration(min)}</Tag>,
    },
    {
      title: "Detail Urusan",
      key: "urusanDetail",
      width: 180,
      render: (_, record) => (
        <Space size={4}>
          {record.kantorCount > 0 && (
            <Tooltip title="Urusan Kantor">
              <Tag color="blue" icon={<TeamOutlined />} style={{ margin: 0 }}>
                {record.kantorCount}
              </Tag>
            </Tooltip>
          )}
          {record.pribadiCount > 0 && (
            <Tooltip title="Urusan Pribadi">
              <Tag color="orange" icon={<HomeOutlined />} style={{ margin: 0 }}>
                {record.pribadiCount}
              </Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: "Sedang di Luar",
      dataIndex: "currentlyOut",
      key: "currentlyOut",
      width: 150,
      align: "center",
      render: (count, record) => {
        if (count === 0) return <Tag icon={<LoginOutlined />} color="success">-</Tag>;
        
        // Find how many of 'out' are Kantor vs Pribadi
        const outKantor = record.permits.filter(p => p.status === 'out' && p.permit_type === 'Kantor').length;
        const outPribadi = record.permits.filter(p => p.status === 'out' && p.permit_type === 'Pribadi').length;

        return (
          <Space direction="vertical" size={2}>
            <Tag icon={<LogoutOutlined />} color="error" style={{ margin: 0 }}>
              {count} izin
            </Tag>
            <div style={{ fontSize: 10, color: "#6b7280" }}>
              {outKantor > 0 && `K:${outKantor} `}{outPribadi > 0 && `P:${outPribadi}`}
            </div>
          </Space>
        );
      },
    },
  ];

  const expandedRowRender = (record) => {
    const permitColumns = [
      {
        title: "No",
        key: "no",
        width: 50,
        render: (_, __, i) => i + 1,
      },
      {
        title: "Tanggal",
        dataIndex: "date",
        key: "date",
        width: 130,
        render: (d) => dayjs(d).format("DD MMM YYYY"),
      },
      {
        title: "Jam Keluar",
        dataIndex: "exit_time",
        key: "exit_time",
        width: 100,
        align: "center",
        render: (t) => (
          <span
            style={{
              fontVariantNumeric: "tabular-nums",
              fontWeight: 600,
              color: "#ef4444",
            }}
          >
            {formatTime(t)}
          </span>
        ),
      },
      {
        title: "Jam Kembali",
        dataIndex: "return_time",
        key: "return_time",
        width: 110,
        align: "center",
        render: (t) =>
          t ? (
            <span
              style={{
                fontVariantNumeric: "tabular-nums",
                fontWeight: 600,
                color: "#10b981",
              }}
            >
              {formatTime(t)}
            </span>
          ) : (
            <span style={{ color: "#9ca3af" }}>—</span>
          ),
      },
      {
        title: "Durasi",
        dataIndex: "duration_minutes",
        key: "duration_minutes",
        width: 90,
        align: "center",
        render: (min, permit) => {
          const { effective, overlap } = getLiveDurationSeconds(permit);
          return effective != null || permit.status === "out" ? (
            <Space direction="vertical" size={0} align="center">
              <Tag
                color={
                  effective / 60 > 60
                    ? "red"
                    : effective / 60 > 30
                      ? "orange"
                      : "green"
                }
                style={{ margin: 0 }}
              >
                {formatDurationSeconds(effective)}
              </Tag>
              {overlap > 0 && (
                <Text type="secondary" style={{ fontSize: 10 }}>
                  (Pot. Istirahat {Math.round(overlap / 60)}m)
                </Text>
              )}
            </Space>
          ) : (
            <span style={{ color: "#9ca3af" }}>—</span>
          );
        },
      },
      {
        title: "Keperluan",
        dataIndex: "reason",
        key: "reason",
        width: 240,
        render: (r) =>
          r ? (
            <div style={{ whiteSpace: "normal", lineHeight: 1.4 }}>{r}</div>
          ) : (
            <span style={{ color: "#d1d5db" }}>-</span>
          ),
      },
      {
        title: "Urusan",
        dataIndex: "permit_type",
        key: "permit_type",
        width: 140,
        align: "center",
        render: (t, permit) => (
          <Space size={4}>
            {t === "Kantor" ? (
              <Tag icon={<TeamOutlined />} color="blue">
                Kantor
              </Tag>
            ) : (
              <Tag icon={<HomeOutlined />} color="orange">
                Pribadi
              </Tag>
            )}
            <Tooltip title="Ubah jenis urusan">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined style={{ fontSize: 12, color: "#9ca3af" }} />}
                onClick={() => openUrusanModal(permit)}
              />
            </Tooltip>
          </Space>
        ),
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 160,
        align: "center",
        render: (s, permit) =>
          s === "out" ? (
            <Tag icon={<LogoutOutlined />} color="error">
              Di Luar
            </Tag>
          ) : permit?.return_recorded_by_admin ? (
            <Tag icon={<EditOutlined />} color="warning">
              Kembali (Manual)
            </Tag>
          ) : (
            <Tag icon={<LoginOutlined />} color="success">
              Kembali
            </Tag>
          ),
      },
      {
        title: "Penanda",
        key: "return_note",
        width: 220,
        render: (_, permit) =>
          permit?.return_recorded_by_admin ? (
            <Tag color="gold">
              {permit?.return_recorded_note || "Lupa absen kembali di aplikasi"}
            </Tag>
          ) : (
            <span style={{ color: "#9ca3af" }}>-</span>
          ),
      },
      {
        title: "Aksi",
        key: "action",
        width: 80,
        align: "center",
        render: (_, permit) => {
          const items = [
            {
              key: "edit_time",
              label: "Edit Waktu Keluar/Kembali",
              icon: <ClockCircleOutlined />,
              onClick: () => openEditTimeModal(permit),
            },
          ];

          if (permit.status === "out") {
            items.push({
              key: "manual_return",
              label: "Input Jam Kembali (Manual)",
              icon: <EditOutlined style={{ color: "#f59e0b" }} />,
              onClick: () => openManualReturnModal(permit),
            });
          }

          items.push({
            key: "nomor_surat",
            label: permit.nomor_surat ? "Edit Nomor Surat" : "Tambah Nomor Surat",
            icon: permit.nomor_surat ? (
              <CheckCircleOutlined style={{ color: "#22c55e" }} />
            ) : (
              <PlusOutlined style={{ color: "#4f46e5" }} />
            ),
            onClick: () => openNomorSuratModal(permit),
          });

          items.push({
            key: "generate_word",
            label: "Generate Dokumen Word",
            icon: generatingPermitId === permit.id ? <Spin size="small" /> : <FileWordOutlined style={{ color: "#2563eb" }} />,
            disabled: !permit.nomor_surat,
            onClick: () => handleGenerateWord(permit),
          });

          items.push({
            type: "divider",
          });

          items.push({
            key: "delete",
            label: <span style={{ color: "#ff4d4f" }}>Hapus Data</span>,
            icon: <DeleteOutlined style={{ color: "#ff4d4f" }} />,
            onClick: () => {
              Modal.confirm({
                title: "Hapus Data Izin",
                content: "Apakah Anda yakin ingin menghapus data izin keluar ini?",
                okText: "Ya",
                cancelText: "Batal",
                okButtonProps: { danger: true },
                onOk: () => handleDelete(permit.id),
              });
            },
          });

          return (
            <Dropdown
              menu={{ items }}
              trigger={["click"]}
              placement="bottomRight"
            >
              <Button type="text" icon={<MoreOutlined />} />
            </Dropdown>
          );
        },
      },
    ];

    return (
      <Card
        size="small"
        style={{ margin: "12px 24px", backgroundColor: "#f8fafc" }}
      >
        <div
          style={{
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <CalendarOutlined style={{ color: "#4f46e5" }} />
          <Text strong>Riwayat Izin Keluar</Text>
          <Text type="secondary">({record.permits.length} data)</Text>
        </div>
        <Table
          columns={permitColumns}
          dataSource={record.permits}
          rowKey="id"
          pagination={false}
          size="small"
          scroll={{ x: 1050 }}
        />
      </Card>
    );
  };

  return (
    <div className="mik-page">
      {/* Title */}
      <div className="module-section">
        <Title level={4} className="module-title" style={{ marginBottom: 4 }}>
          Monitoring Izin Keluar
        </Title>
        <Text type="secondary" className="module-subtitle">
          Pantau rekapitulasi izin keluar pegawai.
        </Text>
      </div>

      {/* Stats Cards */}
      <Spin spinning={loading && !data.length}>
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col xs={12} sm={6}>
            <Card variant="borderless" className="mik-stat-card">
              <Statistic
                title={
                  <span className="mik-stat-label">
                    <ClockCircleOutlined /> Hari Ini
                  </span>
                }
                value={stats?.today?.total ?? 0}
                suffix="izin"
                valueStyle={{ color: "#4f46e5", fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card
              variant="borderless"
              className="mik-stat-card mik-stat-card--warning"
            >
              <Statistic
                title={
                  <span className="mik-stat-label">
                    <LogoutOutlined /> Masih di Luar
                  </span>
                }
                value={stats?.today?.currently_out ?? 0}
                suffix="orang"
                valueStyle={{ color: "#ef4444", fontWeight: 700 }}
                description={
                  <div style={{ fontSize: 12, marginTop: 4, color: "#9ca3af" }}>
                    <span style={{ color: "#2563eb" }}>Kantor: {stats?.today?.out_kantor_count ?? 0}</span>
                    <span style={{ padding: "0 4px" }}>|</span>
                    <span style={{ color: "#f59e0b" }}>Pribadi: {stats?.today?.out_pribadi_count ?? 0}</span>
                  </div>
                }
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card variant="borderless" className="mik-stat-card">
              <Statistic
                title={
                  <span className="mik-stat-label">
                    <FieldTimeOutlined /> Rata-rata Durasi
                  </span>
                }
                value={stats?.today?.avg_duration ?? 0}
                suffix="menit"
                valueStyle={{ color: "#f59e0b", fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card variant="borderless" className="mik-stat-card">
              <Statistic
                title={
                  <span className="mik-stat-label">
                    <UserOutlined /> Bulan Ini
                  </span>
                }
                value={stats?.monthly?.total ?? 0}
                suffix="izin"
                valueStyle={{ color: "#10b981", fontWeight: 700 }}
              />
            </Card>
          </Col>
        </Row>
      </Spin>

      {/* Urusan Stats Row */}
      <Spin spinning={loading && !data.length}>
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col xs={12} sm={6}>
            <Card variant="borderless" className="mik-stat-card">
              <Statistic
                title={
                  <span className="mik-stat-label">
                    <HomeOutlined /> Urusan Pribadi (Hari Ini)
                  </span>
                }
                value={stats?.today?.pribadi_count ?? 0}
                suffix="izin"
                valueStyle={{ color: "#f59e0b", fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card variant="borderless" className="mik-stat-card">
              <Statistic
                title={
                  <span className="mik-stat-label">
                    <TeamOutlined /> Urusan Kantor (Hari Ini)
                  </span>
                }
                value={stats?.today?.kantor_count ?? 0}
                suffix="izin"
                valueStyle={{ color: "#2563eb", fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card variant="borderless" className="mik-stat-card">
              <Statistic
                title={
                  <span className="mik-stat-label">
                    <HomeOutlined /> Urusan Pribadi (Bulan Ini)
                  </span>
                }
                value={stats?.monthly?.pribadi_count ?? 0}
                suffix="izin"
                valueStyle={{ color: "#f59e0b", fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card variant="borderless" className="mik-stat-card">
              <Statistic
                title={
                  <span className="mik-stat-label">
                    <TeamOutlined /> Urusan Kantor (Bulan Ini)
                  </span>
                }
                value={stats?.monthly?.kantor_count ?? 0}
                suffix="izin"
                valueStyle={{ color: "#2563eb", fontWeight: 700 }}
              />
            </Card>
          </Col>
        </Row>
      </Spin>

      {/* Analytics Section */}
      <Spin spinning={analyticsLoading}>
        {analytics && (
          <div className="mik-analytics">
            {/* Weekly chart */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={24} lg={14}>
                <Card
                  variant="borderless"
                  className="mik-chart-card"
                  title={
                    <span className="mik-chart-title">
                      <BarChartOutlined style={{ color: "#4f46e5" }} /> Tren Mingguan (7 Hari Terakhir)
                    </span>
                  }
                  extra={<Text type="secondary" style={{ fontSize: 11 }}>Total: {analytics.weekly.reduce((s, d) => s + (d.total || 0), 0)} izin</Text>}
                >
                  <ResponsiveContainer width="100%" height={230} minWidth={0}>
                    <BarChart data={analytics.weekly} barSize={26} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <RechartsTooltip
                        cursor={{ fill: "rgba(99, 102, 241, 0.06)" }}
                        contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 8px 24px rgba(15,23,42,0.08)", fontSize: 12 }}
                      />
                      <Bar dataKey="kantor" name="Urusan Kantor" stackId="a" fill="#2563eb" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="pribadi" name="Urusan Pribadi" stackId="a" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </Col>

              {/* Hourly chart */}
              <Col xs={24} lg={10}>
                <Card
                  variant="borderless"
                  className="mik-chart-card"
                  title={
                    <span className="mik-chart-title">
                      <FieldTimeOutlined style={{ color: "#f59e0b" }} /> Distribusi Jam Keluar (Bulan Ini)
                    </span>
                  }
                  extra={
                    <Tag color="gold" style={{ fontSize: 10.5 }}>
                      Puncak: {analytics.hourly.find((h) => h.is_peak)?.label || "-"}
                    </Tag>
                  }
                >
                  <ResponsiveContainer width="100%" height={230} minWidth={0}>
                    <BarChart data={analytics.hourly.filter((h) => h.hour >= 7 && h.hour <= 18)} barSize={14} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} interval={0} angle={-45} textAnchor="end" height={52} />
                      <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <RechartsTooltip
                        cursor={{ fill: "rgba(245, 158, 11, 0.07)" }}
                        contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 8px 24px rgba(15,23,42,0.08)", fontSize: 12 }}
                        formatter={(value, name) => [`${value} izin`, "Jam Keluar"]}
                        labelFormatter={(label) => `Jam ${label}`}
                      />
                      <Bar dataKey="total" name="Izin" radius={[5, 5, 0, 0]}>
                        {analytics.hourly.filter((h) => h.hour >= 7 && h.hour <= 18).map((h, i) => (
                          <Cell key={i} fill={h.is_peak ? "#ef4444" : h.total >= 5 ? "#f59e0b" : "#93c5fd"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
            </Row>

            {/* Pattern detection cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
              <Col xs={24} lg={12}>
                <Card
                  variant="borderless"
                  className="mik-pattern-card"
                  title={
                    <span className="mik-chart-title">
                      <AlertOutlined style={{ color: "#ef4444" }} /> Pola Keluar Berulang (Jam Sama)
                    </span>
                  }
                  extra={<Tag color="red" style={{ fontSize: 10.5 }}>{analytics.patterns.length} pola</Tag>}
                >
                  {analytics.patterns.length === 0 ? (
                    <div className="mik-pattern-empty">Belum ada pola keluar berulang yang mencurigakan. 🎉</div>
                  ) : (
                    <div className="mik-pattern-list">
                      {analytics.patterns.map((p, i) => (
                        <div className="mik-pattern-item" key={i}>
                          <Avatar icon={<UserOutlined />} style={{ backgroundColor: "#fef2f2", color: "#ef4444" }} size={34} />
                          <div className="mik-pattern-info">
                            <div className="mik-pattern-name">{p.employee_name}</div>
                            <div className="mik-pattern-meta">
                              {p.nip || "-"} · Keluar <strong>{p.count}x</strong> pada jam{" "}
                              <Tag color="volcano" style={{ margin: 0, fontSize: 10 }}>{p.hour_label}</Tag>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </Col>

              <Col xs={24} lg={12}>
                <Card
                  variant="borderless"
                  className="mik-pattern-card"
                  title={
                    <span className="mik-chart-title">
                      <UserOutlined style={{ color: "#2563eb" }} /> Pegawai Paling Sering Keluar Bulan Ini
                    </span>
                  }
                  extra={<Tag color="blue" style={{ fontSize: 10.5 }}>Top {analytics.top_by_hour.length}</Tag>}
                >
                  {analytics.top_by_hour.length === 0 ? (
                    <div className="mik-pattern-empty">Belum ada data izin keluar bulan ini.</div>
                  ) : (
                    <div className="mik-pattern-list">
                      {analytics.top_by_hour.map((p, i) => (
                        <div className="mik-pattern-item" key={i}>
                          <div className="mik-rank-badge">{i + 1}</div>
                          <div className="mik-pattern-info">
                            <div className="mik-pattern-name">{p.employee_name}</div>
                            <div className="mik-pattern-meta">
                              {p.nip || "-"} · <strong>{p.count}x</strong> keluar · sering jam{" "}
                              <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>{p.hour_label}</Tag>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </Col>
            </Row>
          </div>
        )}
      </Spin>

      {/* Toolbar */}
      <div className="module-toolbar" style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Select
            value={filterMode}
            onChange={setFilterMode}
            style={{ width: 120 }}
            options={[
              { value: "date", label: "Per Tanggal" },
              { value: "month", label: "Per Bulan" },
            ]}
          />
          {filterMode === "date" ? (
            <DatePicker
              value={filterDate}
              onChange={(d) => d && setFilterDate(d)}
              format="DD MMM YYYY"
              allowClear={false}
            />
          ) : (
            <DatePicker.MonthPicker
              value={filterDate}
              onChange={(d) => d && setFilterDate(d)}
              format="MMM YYYY"
              allowClear={false}
            />
          )}
          <Input
            placeholder="Cari NIP atau nama..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 220 }}
            allowClear
          />
          <Select
            value={filterPermitType}
            onChange={setFilterPermitType}
            style={{ width: 140 }}
            options={[
              { value: "all", label: "Semua Urusan" },
              { value: "Pribadi", label: "Urusan Pribadi" },
              { value: "Kantor", label: "Urusan Kantor" },
            ]}
          />
          <Select
            value={filterDuration}
            onChange={setFilterDuration}
            style={{ width: 220 }}
            options={[
              { value: "all", label: "Semua Durasi" },
              { value: "hide_zero", label: "Sembunyikan Durasi 00:00:00" },
              { value: "only_zero", label: "Hanya Durasi 00:00:00" },
            ]}
          />
          {(search || filterPermitType !== "all" || filterDuration !== "all") && (
            <Button
              icon={<ClearOutlined />}
              type="text"
              danger
              onClick={() => {
                setSearch("");
                setFilterPermitType("all");
                setFilterDuration("all");
              }}
            >
              Reset Filter
            </Button>
          )}
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchData}
            loading={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Top employee badge */}
      {stats?.monthly?.top_employee && (
        <Card
          variant="borderless"
          size="small"
          className="mik-top-card"
          style={{ marginBottom: 16 }}
        >
          <div className="mik-top-employee">
            <UserOutlined className="mik-top-employee__icon" />
            <div>
              <Text strong>{stats.monthly.top_employee.employee_name}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Izin keluar terbanyak bulan ini:{" "}
                <strong>{stats.monthly.top_employee.count} kali</strong>
                {stats.monthly.top_employee.pribadi_count > 0 || stats.monthly.top_employee.kantor_count > 0 ? (
                  <span>
                    {" "}(
                    {stats.monthly.top_employee.kantor_count > 0 && `Kantor: ${stats.monthly.top_employee.kantor_count}`}
                    {stats.monthly.top_employee.kantor_count > 0 && stats.monthly.top_employee.pribadi_count > 0 && ", "}
                    {stats.monthly.top_employee.pribadi_count > 0 && `Pribadi: ${stats.monthly.top_employee.pribadi_count}`}
                    )
                  </span>
                ) : null}
                {stats.monthly.top_employee.total_minutes != null && (
                  <>
                    {" "}
                    — Total{" "}
                    {formatDuration(stats.monthly.top_employee.total_minutes)}
                  </>
                )}
              </Text>
            </div>
          </div>
        </Card>
      )}

      {/* Grouped Table */}
      <Card variant="borderless">
        <Table
          columns={columns}
          dataSource={filteredGroupedData}
          rowKey="employee_id"
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total) => `${total} pegawai`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
          }}
          size="small"
          scroll={{ x: 700 }}
          expandable={{
            expandedRowRender,
            expandedRowKeys: expandedRows,
            onExpandedRowsChange: setExpandedRows,
            expandIcon: () => null, // Hide default expand icon, we use custom one
          }}
        />
      </Card>

      <Modal
        title="Input Nomor Surat"
        open={nomorSuratModalOpen}
        onCancel={() => {
          setNomorSuratModalOpen(false);
          setSelectedPermit(null);
          setNomorSuratInput("");
        }}
        onOk={handleSaveNomorSurat}
        confirmLoading={savingNomorSurat}
        okText="Simpan"
        cancelText="Batal"
      >
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          <Text type="secondary">
            {selectedPermit
              ? `${selectedPermit.employee_name} - ${dayjs(selectedPermit.date).format("DD MMM YYYY")}`
              : ""}
          </Text>
          <Input
            placeholder="Masukkan nomor surat"
            value={nomorSuratInput}
            onChange={(e) => setNomorSuratInput(e.target.value)}
            maxLength={100}
            allowClear
          />
        </Space>
      </Modal>

      <Modal
        title="Input Jam Kembali Manual"
        open={manualReturnModalOpen}
        onCancel={() => {
          setManualReturnModalOpen(false);
          setManualReturnPermit(null);
          setManualReturnTime(null);
          setManualReturnDate(null);
          setManualReturnNote("Lupa absen kembali di aplikasi");
        }}
        onOk={handleSubmitManualReturn}
        confirmLoading={savingManualReturn}
        okText="Simpan"
        cancelText="Batal"
      >
        <Space direction="vertical" size={10} style={{ width: "100%" }}>
          <Text type="secondary">
            {manualReturnPermit
              ? `${manualReturnPermit.employee_name} - ${dayjs(manualReturnPermit.date).format("DD MMM YYYY")}`
              : ""}
          </Text>
          <div>
            <Text style={{ display: "block", marginBottom: 6 }}>
              Tanggal Izin
            </Text>
            <DatePicker
              style={{ width: "100%" }}
              value={manualReturnDate}
              onChange={(val) => setManualReturnDate(val)}
              format="DD MMM YYYY"
              allowClear={false}
            />
          </div>
          <div>
            <Text style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
              Jam Kembali (Jam : Menit : Detik)
            </Text>
            <Row gutter={8} align="middle">
              <Col span={7}>
                <InputNumber
                  min={0}
                  max={23}
                  value={manualReturnTime ? manualReturnTime.hour() : 0}
                  onChange={(val) => {
                    const current = manualReturnTime || dayjs();
                    setManualReturnTime(current.hour(val ?? 0));
                  }}
                  style={{ width: "100%", borderRadius: 6 }}
                  addonAfter="Jam"
                />
              </Col>
              <Col span={1} style={{ textAlign: "center", fontWeight: 700, fontSize: 16 }}>:</Col>
              <Col span={7}>
                <InputNumber
                  min={0}
                  max={59}
                  value={manualReturnTime ? manualReturnTime.minute() : 0}
                  onChange={(val) => {
                    const current = manualReturnTime || dayjs();
                    setManualReturnTime(current.minute(val ?? 0));
                  }}
                  style={{ width: "100%", borderRadius: 6 }}
                  addonAfter="Min"
                />
              </Col>
              <Col span={1} style={{ textAlign: "center", fontWeight: 700, fontSize: 16 }}>:</Col>
              <Col span={7}>
                <InputNumber
                  min={0}
                  max={59}
                  value={manualReturnTime ? manualReturnTime.second() : 0}
                  onChange={(val) => {
                    const current = manualReturnTime || dayjs();
                    setManualReturnTime(current.second(val ?? 0));
                  }}
                  style={{ width: "100%", borderRadius: 6 }}
                  addonAfter="Det"
                />
              </Col>
            </Row>

            <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
              <Button
                size="small"
                type="primary"
                onClick={() => setManualReturnTime(dayjs())}
                style={{ fontSize: 11, borderRadius: 4, backgroundColor: "#0F5B99" }}
              >
                🕒 Set Waktu Sekarang ({dayjs().format("HH:mm:ss")})
              </Button>
              {["12:00:00", "13:00:00", "14:00:00", "15:00:00", "16:00:00", "17:00:00"].map((t) => (
                <Button
                  key={t}
                  size="small"
                  onClick={() => {
                    const [h, m, s] = t.split(":");
                    setManualReturnTime(
                      (manualReturnTime || dayjs())
                        .hour(parseInt(h, 10))
                        .minute(parseInt(m, 10))
                        .second(parseInt(s || "0", 10))
                    );
                  }}
                  style={{ fontSize: 11, borderRadius: 4 }}
                >
                  {t.substring(0, 5)}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Text style={{ display: "block", marginBottom: 6 }}>Penanda</Text>
            <Input
              value={manualReturnNote}
              maxLength={255}
              onChange={(e) => setManualReturnNote(e.target.value)}
              placeholder="Contoh: Lupa absen kembali di aplikasi"
            />
          </div>
        </Space>
      </Modal>

      <Modal
        title="Edit Jenis Urusan"
        open={urusanModalOpen}
        onCancel={() => {
          setUrusanModalOpen(false);
          setSelectedPermitForUrusan(null);
        }}
        onOk={handleUpdateUrusan}
        confirmLoading={savingUrusan}
        okText="Simpan"
        cancelText="Batal"
        width={400}
      >
        <Space direction="vertical" size={12} style={{ width: "100%", padding: "10px 0" }}>
          <div>
            <Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
              Pegawai / Tanggal
            </Text>
            <Text strong>
              {selectedPermitForUrusan
                ? `${selectedPermitForUrusan.employee_name} / ${dayjs(selectedPermitForUrusan.date).format("DD MMM YYYY")}`
                : ""}
            </Text>
          </div>
          <div>
            <Text style={{ display: "block", marginBottom: 8 }}>Pilih Jenis Urusan:</Text>
            <Select
              style={{ width: "100%" }}
              value={newUrusanValue}
              onChange={(val) => setNewUrusanValue(val)}
              options={[
                { value: "Pribadi", label: "Urusan Pribadi" },
                { value: "Kantor", label: "Urusan Kantor" },
              ]}
            />
          </div>
        </Space>
      </Modal>

      <Modal
        title="Edit Waktu Izin Keluar"
        open={editTimeModalOpen}
        onCancel={() => {
          setEditTimeModalOpen(false);
          setEditTimePermit(null);
        }}
        onOk={handleSaveEditTime}
        confirmLoading={savingEditTime}
        okText="Simpan"
        cancelText="Batal"
        width={480}
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Text type="secondary">
            {editTimePermit
              ? `${editTimePermit.employee_name}`
              : ""}
          </Text>

          {/* Tanggal */}
          <div>
            <Text style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Tanggal Izin</Text>
            <DatePicker
              style={{ width: "100%" }}
              value={editTimeDate}
              onChange={(val) => setEditTimeDate(val)}
              format="DD MMM YYYY"
              allowClear={false}
            />
          </div>

          {/* Jam Keluar */}
          <div>
            <Text style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Jam Keluar</Text>
            <Row gutter={8} align="middle">
              <Col span={7}>
                <InputNumber
                  min={0} max={23}
                  value={editExit.h}
                  onChange={(v) => setEditExit((p) => ({ ...p, h: v ?? 0 }))}
                  style={{ width: "100%" }}
                  addonAfter="Jam"
                />
              </Col>
              <Col span={1} style={{ textAlign: "center", fontWeight: 700, fontSize: 18 }}>:</Col>
              <Col span={7}>
                <InputNumber
                  min={0} max={59}
                  value={editExit.m}
                  onChange={(v) => setEditExit((p) => ({ ...p, m: v ?? 0 }))}
                  style={{ width: "100%" }}
                  addonAfter="Min"
                />
              </Col>
              <Col span={1} style={{ textAlign: "center", fontWeight: 700, fontSize: 18 }}>:</Col>
              <Col span={7}>
                <InputNumber
                  min={0} max={59}
                  value={editExit.s}
                  onChange={(v) => setEditExit((p) => ({ ...p, s: v ?? 0 }))}
                  style={{ width: "100%" }}
                  addonAfter="Det"
                />
              </Col>
            </Row>
          </div>

          {/* Jam Kembali */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={{ fontWeight: 600 }}>Jam Kembali</Text>
              <Button
                size="small"
                type={editReturnEnabled ? "default" : "dashed"}
                onClick={() => setEditReturnEnabled((p) => !p)}
              >
                {editReturnEnabled ? "Kosongkan" : "Isi Jam Kembali"}
              </Button>
            </div>
            {editReturnEnabled ? (
              <Row gutter={8} align="middle">
                <Col span={7}>
                  <InputNumber
                    min={0} max={23}
                    value={editReturn.h}
                    onChange={(v) => setEditReturn((p) => ({ ...p, h: v ?? 0 }))}
                    style={{ width: "100%" }}
                    addonAfter="Jam"
                  />
                </Col>
                <Col span={1} style={{ textAlign: "center", fontWeight: 700, fontSize: 18 }}>:</Col>
                <Col span={7}>
                  <InputNumber
                    min={0} max={59}
                    value={editReturn.m}
                    onChange={(v) => setEditReturn((p) => ({ ...p, m: v ?? 0 }))}
                    style={{ width: "100%" }}
                    addonAfter="Min"
                  />
                </Col>
                <Col span={1} style={{ textAlign: "center", fontWeight: 700, fontSize: 18 }}>:</Col>
                <Col span={7}>
                  <InputNumber
                    min={0} max={59}
                    value={editReturn.s}
                    onChange={(v) => setEditReturn((p) => ({ ...p, s: v ?? 0 }))}
                    style={{ width: "100%" }}
                    addonAfter="Det"
                  />
                </Col>
              </Row>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>Jam kembali dikosongkan (pegawai masih di luar).</Text>
            )}
          </div>
        </Space>
      </Modal>
    </div>
  );
}

export default RispegMonitoringIzinKeluar;
