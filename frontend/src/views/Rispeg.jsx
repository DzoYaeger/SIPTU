import { useEffect, useState, useCallback, useMemo } from "react";
import {
  App as AntdApp,
  AutoComplete,
  Avatar,
  Card,
  Checkbox,
  DatePicker,
  InputNumber,
  Popover,
  Select,
  Table,
  Tag,
  Typography,
  Button,
  Space,
  Badge,
  Input,
  Modal,
  Popconfirm,
  Tooltip,
  Divider,
} from "antd";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  WarningOutlined,
  SaveOutlined,
  UndoOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  CheckCircleFilled,
  UserAddOutlined,
  ExclamationCircleOutlined,
  FilterOutlined,
  FullscreenOutlined,
  CloseOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "../hooks/useAuth.js";
import { buildMessageAdapter } from "../utils/notify.js";
import "./Rispeg.css";

const { Title, Text } = Typography;

const MINUTE_PRESETS = [5, 10, 15, 30, 60];

const toMinutesAndSeconds = (totalMinutes) => {
  const safeMinutes = Math.max(0, Number(totalMinutes) || 0);
  const totalSeconds = Math.round(safeMinutes * 60);
  return {
    m: Math.floor(totalSeconds / 60),
    s: totalSeconds % 60,
  };
};

const formatMinutesLabel = (totalMinutes) => {
  const { m, s } = toMinutesAndSeconds(totalMinutes);
  if (m === 0 && s === 0) return "0m";

  let parts = [];
  if (m > 0) parts.push(`${m}m`);
  if (s > 0) parts.push(`${s}d`);

  return parts.join(" ");
};

const Rispeg = () => {
  const { apiFetch } = useAuth();
  const { message, modal } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);

  const [date, setDate] = useState(dayjs());
  const [data, setData] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Batch Fullscreen Modal State
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchRows, setBatchRows] = useState([]);

  const fetchData = useCallback(
    async (selectedDate) => {
      setLoading(true);
      try {
        const formattedDate = selectedDate.format("YYYY-MM-DD");
        const response = await apiFetch(`/rispeg/daily?date=${formattedDate}`);
        if (!response.ok) throw new Error("Gagal mengambil data RISPEG");
        const result = await response.json();
        setData(result);
        setOriginalData(JSON.parse(JSON.stringify(result)));
        setHasChanges(false);
      } catch (error) {
        notification.error({
          message: "Error",
          description: error.message,
        });
      } finally {
        setLoading(false);
      }
    },
    [apiFetch],
  );

  useEffect(() => {
    if (hasChanges) {
      modal.confirm({
        title: "Perubahan Belum Disimpan",
        content: "Anda memiliki perubahan yang belum disimpan. Yakin ingin ganti tanggal?",
        okText: "Ya, Ganti Tanggal",
        cancelText: "Batal",
        onOk: () => {
          fetchData(date);
        },
      });
    } else {
      fetchData(date);
    }
  }, [date]);

  const onDateChange = (newDate) => {
    if (hasChanges) {
      modal.confirm({
        title: "Perubahan Belum Disimpan",
        content: "Data yang Anda ubah akan hilang jika Anda mengganti tanggal tanpa menyimpannya.",
        okText: "Abaikan Perubahan",
        cancelText: "Batal",
        onOk: () => {
          setDate(newDate);
          setHasChanges(false);
        },
      });
    } else {
      setDate(newDate);
    }
  };

  // Helper to calculate total points
  const calculatePoints = (ctrl) => {
    let points = 0;
    if (ctrl.violation_uniform) points++;
    if (ctrl.violation_assembly) points++;
    if (ctrl.violation_entry) points++;
    if (ctrl.violation_exit) points++;
    if (ctrl.violation_missed_checkin) points++;
    if (ctrl.violation_missed_checkout) points++;
    return points;
  };

  // Check if an item has modified control vs originalData
  const isItemChanged = useCallback(
    (item) => {
      const original = originalData.find((orig) => orig.employee_id === item.employee_id);
      if (!original) return false;
      return JSON.stringify(item.control) !== JSON.stringify(original.control);
    },
    [originalData],
  );

  // Exception-based filtered list: Employees with active violations OR modified controls
  const violatingList = useMemo(() => {
    return data.filter((item) => {
      const hasActiveViolations = (item.control?.total_points || 0) > 0;
      const modified = isItemChanged(item);
      const matchesSearch =
        !searchTerm ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.nip || "").includes(searchTerm);

      return (hasActiveViolations || modified) && matchesSearch;
    });
  }, [data, isItemChanged, searchTerm]);

  // Memoized employee options for Select with search
  const employeeOptions = useMemo(() => {
    return data.map((emp) => ({
      value: emp.employee_id,
      name: emp.name,
      nip: emp.nip || "",
      label: `${emp.name} (${emp.nip || "Tanpa NIP"})`,
      filterLabel: `${emp.name} ${emp.nip || ""}`,
    }));
  }, [data]);

  // Open Fullscreen Batch Entry Modal
  const handleOpenBatchModal = () => {
    if (violatingList.length > 0) {
      const initialBatch = violatingList.map((item) => {
        const entryTime = toMinutesAndSeconds(item.control.entry_late_minutes || 0);
        const exitTime = toMinutesAndSeconds(item.control.exit_early_minutes || 0);
        return {
          rowId: `row-${item.employee_id}`,
          employee_id: item.employee_id,
          employee_name: item.name,
          employee_nip: item.nip,
          violation_uniform: Boolean(item.control.violation_uniform),
          violation_assembly: Boolean(item.control.violation_assembly),
          violation_entry: Boolean(item.control.violation_entry),
          entry_late_mins: entryTime.m,
          entry_late_secs: entryTime.s,
          violation_exit: Boolean(item.control.violation_exit),
          exit_early_mins: exitTime.m,
          exit_early_secs: exitTime.s,
          violation_missed_checkin: Boolean(item.control.violation_missed_checkin),
          violation_missed_checkout: Boolean(item.control.violation_missed_checkout),
        };
      });
      setBatchRows(initialBatch);
    } else {
      setBatchRows([
        {
          rowId: `row-new-1`,
          employee_id: null,
          employee_name: "",
          employee_nip: "",
          violation_uniform: false,
          violation_assembly: false,
          violation_entry: false,
          entry_late_mins: 0,
          entry_late_secs: 0,
          violation_exit: false,
          exit_early_mins: 0,
          exit_early_secs: 0,
          violation_missed_checkin: false,
          violation_missed_checkout: false,
        },
      ]);
    }
    setBatchModalOpen(true);
  };

  // Add new empty row to batch modal
  const handleAddBatchRow = () => {
    setBatchRows((prev) => [
      ...prev,
      {
        rowId: `row-new-${Date.now()}`,
        employee_id: null,
        employee_name: "",
        employee_nip: "",
        violation_uniform: false,
        violation_assembly: false,
        violation_entry: false,
        entry_late_mins: 0,
        entry_late_secs: 0,
        violation_exit: false,
        exit_early_mins: 0,
        exit_early_secs: 0,
        violation_missed_checkin: false,
        violation_missed_checkout: false,
      },
    ]);
  };

  // Delete row from batch modal
  const handleDeleteBatchRow = (rowId) => {
    setBatchRows((prev) => prev.filter((r) => r.rowId !== rowId));
  };

  // Update specific field in a batch row
  const handleUpdateBatchRow = (rowId, patch) => {
    setBatchRows((prev) =>
      prev.map((r) => {
        if (r.rowId === rowId) {
          return { ...r, ...patch };
        }
        return r;
      }),
    );
  };

  // Apply Fullscreen Batch Entry to Main Data
  const handleApplyBatchModal = () => {
    const validRows = batchRows.filter((r) => r.employee_id != null);
    if (validRows.length === 0) {
      message.warning("Silakan pilih minimal 1 pegawai di dalam tabel penginputan.");
      return;
    }

    setData((prev) => {
      const nextData = prev.map((item) => {
        const batchMatch = validRows.find((b) => b.employee_id === item.employee_id);
        if (batchMatch) {
          const totalEntryLateMinutes = Number((batchMatch.entry_late_mins + batchMatch.entry_late_secs / 60).toFixed(2));
          const totalExitEarlyMinutes = Number((batchMatch.exit_early_mins + batchMatch.exit_early_secs / 60).toFixed(2));

          const updatedControl = {
            violation_uniform: batchMatch.violation_uniform,
            violation_assembly: batchMatch.violation_assembly,
            violation_entry: batchMatch.violation_entry,
            entry_late_minutes: batchMatch.violation_entry ? totalEntryLateMinutes : 0,
            violation_exit: batchMatch.violation_exit,
            exit_early_minutes: batchMatch.violation_exit ? totalExitEarlyMinutes : 0,
            violation_missed_checkin: batchMatch.violation_missed_checkin,
            violation_missed_checkout: batchMatch.violation_missed_checkout,
            total_points: calculatePoints(batchMatch),
          };

          return { ...item, control: updatedControl };
        }
        return item;
      });

      return nextData;
    });

    setHasChanges(true);
    setBatchModalOpen(false);
    message.success(`Berhasil menerapkan ${validRows.length} entri pencatatan massal.`);
  };

  // Reset / Delete All Violations for an Employee
  const handleDeleteViolationRecord = (employeeId) => {
    const cleanControl = {
      violation_uniform: false,
      violation_assembly: false,
      violation_entry: false,
      entry_late_minutes: 0,
      violation_exit: false,
      exit_early_minutes: 0,
      violation_missed_checkin: false,
      violation_missed_checkout: false,
      total_points: 0,
    };

    setData((prev) =>
      prev.map((item) => {
        if (item.employee_id === employeeId) {
          return { ...item, control: cleanControl };
        }
        return item;
      }),
    );

    setHasChanges(true);
    message.info("Catatan pelanggaran pegawai dihapus dari daftar.");
  };

  // Bulk Save Payload to Backend
  const executeSave = async () => {
    setSaving(true);
    try {
      const changedItems = data.filter((item, index) => {
        const original = originalData[index];
        return JSON.stringify(item.control) !== JSON.stringify(original?.control);
      });

      if (changedItems.length === 0) return;

      const payload = changedItems.map((item) => ({
        employee_id: item.employee_id,
        ...item.control,
      }));

      const response = await apiFetch("/rispeg/daily/bulk", {
        method: "POST",
        body: JSON.stringify({
          date: date.format("YYYY-MM-DD"),
          controls: payload,
        }),
      });

      if (!response.ok) {
        throw new Error("Gagal menyimpan data ke server");
      }

      const result = await response.json();
      notification.success({
        message: "Berhasil Disimpan",
        description: `${result.data.length} catatan kedisiplinan pegawai berhasil diperbarui.`,
      });

      await fetchData(date);
    } catch (error) {
      notification.error({
        message: "Gagal Menyimpan",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    const changedItems = [];
    data.forEach((item, index) => {
      const original = originalData[index];
      if (JSON.stringify(item.control) !== JSON.stringify(original?.control)) {
        changedItems.push({ current: item, original: original });
      }
    });

    if (changedItems.length === 0) {
      message.info("Tidak ada perubahan untuk disimpan.");
      return;
    }

    const changesList = (
      <div style={{ maxHeight: "360px", overflowY: "auto" }}>
        <Text>Berikut adalah ringkasan perubahan kedisiplinan yang akan disimpan:</Text>
        <ul style={{ marginTop: 8, paddingLeft: 20 }}>
          {changedItems.map(({ current, original }) => {
            const changelog = [];
            if (current.control.violation_uniform !== original.control.violation_uniform) {
              changelog.push(`Seragam: ${original.control.violation_uniform ? "Melanggar" : "Patuh"} ➔ ${current.control.violation_uniform ? "Melanggar" : "Patuh"}`);
            }
            if (current.control.violation_assembly !== original.control.violation_assembly) {
              changelog.push(`Apel Pagi: ${original.control.violation_assembly ? "Absen" : "Hadir"} ➔ ${current.control.violation_assembly ? "Absen" : "Hadir"}`);
            }
            if (current.control.violation_entry !== original.control.violation_entry || current.control.entry_late_minutes !== original.control.entry_late_minutes) {
              let desc = `Terlambat: ${original.control.violation_entry ? "Ya" : "Tidak"}`;
              if (original.control.violation_entry) desc += ` (${formatMinutesLabel(original.control.entry_late_minutes)})`;
              desc += ` ➔ ${current.control.violation_entry ? "Ya" : "Tidak"}`;
              if (current.control.violation_entry) desc += ` (${formatMinutesLabel(current.control.entry_late_minutes)})`;
              changelog.push(desc);
            }
            if (current.control.violation_exit !== original.control.violation_exit || current.control.exit_early_minutes !== original.control.exit_early_minutes) {
              let desc = `Pulang Cepat: ${original.control.violation_exit ? "Ya" : "Tidak"}`;
              if (original.control.violation_exit) desc += ` (${formatMinutesLabel(original.control.exit_early_minutes)})`;
              desc += ` ➔ ${current.control.violation_exit ? "Ya" : "Tidak"}`;
              if (current.control.violation_exit) desc += ` (${formatMinutesLabel(current.control.exit_early_minutes)})`;
              changelog.push(desc);
            }
            if (current.control.violation_missed_checkin !== original.control.violation_missed_checkin) {
              changelog.push(`Lupa Absen Masuk: ${original.control.violation_missed_checkin ? "Ya" : "Tidak"} ➔ ${current.control.violation_missed_checkin ? "Ya" : "Tidak"}`);
            }
            if (current.control.violation_missed_checkout !== original.control.violation_missed_checkout) {
              changelog.push(`Lupa Absen Pulang: ${original.control.violation_missed_checkout ? "Ya" : "Tidak"} ➔ ${current.control.violation_missed_checkout ? "Ya" : "Tidak"}`);
            }

            return (
              <li key={current.employee_id} style={{ marginBottom: 6 }}>
                <Text strong>{current.name}</Text>
                <ul style={{ fontSize: "12px", color: "#64748b", paddingLeft: 16 }}>
                  {changelog.map((log, i) => (
                    <li key={i}>{log}</li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </div>
    );

    modal.confirm({
      title: "Konfirmasi Simpan Perubahan RISPEG",
      content: changesList,
      width: 480,
      okText: "Ya, Simpan",
      cancelText: "Batal",
      onOk: executeSave,
    });
  };

  const handleCancelAll = () => {
    if (hasChanges) {
      modal.confirm({
        title: "Batalkan Perubahan",
        content: "Semua perubahan draf yang belum disimpan akan dikembalikan ke kondisi semula.",
        okText: "Ya, Batalkan Draf",
        cancelText: "Kembali",
        onOk: () => {
          setData(JSON.parse(JSON.stringify(originalData)));
          setHasChanges(false);
        },
      });
    }
  };

  const columns = [
    {
      title: "Pegawai",
      dataIndex: "name",
      key: "name",
      width: 240,
      render: (text, record) => (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: "#4f46e5", flexShrink: 0 }} />
          <div>
            <Text strong style={{ display: "block", color: "#172033" }}>
              {text}
            </Text>
            <Text type="secondary" style={{ fontSize: 11, fontFamily: "ui-monospace, monospace", color: "#64748b" }}>
              {record.nip || "-"}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Seragam",
      key: "violation_uniform",
      align: "center",
      width: 110,
      render: (_, record) => (
        record.control.violation_uniform ? (
          <Tag color="error" style={{ borderRadius: 6, fontWeight: 600 }}>Melanggar</Tag>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>-</Text>
        )
      ),
    },
    {
      title: "Apel Pagi",
      key: "violation_assembly",
      align: "center",
      width: 110,
      render: (_, record) => (
        record.control.violation_assembly ? (
          <Tag color="warning" style={{ borderRadius: 6, fontWeight: 600 }}>Tidak Apel</Tag>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>-</Text>
        )
      ),
    },
    {
      title: "Terlambat / Pulang Cepat",
      key: "time_violations",
      align: "center",
      width: 220,
      render: (_, record) => (
        <Space direction="vertical" size={2} style={{ width: "100%" }}>
          {record.control.violation_entry && (
            <Tag color="warning" style={{ borderRadius: 6, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
              <ClockCircleOutlined /> Terlambat: {formatMinutesLabel(record.control.entry_late_minutes)}
            </Tag>
          )}
          {record.control.violation_exit && (
            <Tag color="error" style={{ borderRadius: 6, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
              <ClockCircleOutlined /> Pulang Cepat: {formatMinutesLabel(record.control.exit_early_minutes)}
            </Tag>
          )}
          {!record.control.violation_entry && !record.control.violation_exit && (
            <Text type="secondary" style={{ fontSize: 12 }}>-</Text>
          )}
        </Space>
      ),
    },
    {
      title: "Lupa Absen",
      key: "missed_attendance",
      align: "center",
      width: 180,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          {record.control.violation_missed_checkin && (
            <Tag color="purple" style={{ borderRadius: 6 }}>Absen Masuk</Tag>
          )}
          {record.control.violation_missed_checkout && (
            <Tag color="purple" style={{ borderRadius: 6 }}>Absen Pulang</Tag>
          )}
          {!record.control.violation_missed_checkin && !record.control.violation_missed_checkout && (
            <Text type="secondary" style={{ fontSize: 12 }}>-</Text>
          )}
        </Space>
      ),
    },
    {
      title: "Total Tiket",
      key: "total_points",
      align: "center",
      width: 130,
      render: (_, record) => (
        <Tag color={record.control.total_points > 0 ? "red" : "green"} style={{ borderRadius: 8, fontWeight: 700, padding: "2px 8px" }}>
          {record.control.total_points} Pelanggaran
        </Tag>
      ),
    },
    {
      title: "Aksi",
      key: "action",
      align: "center",
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Popconfirm
            title="Hapus Catatan Pelanggaran?"
            description="Pegawai akan dikembalikan ke status patuh 100% pada tanggal ini."
            onConfirm={() => handleDeleteViolationRecord(record.employee_id)}
            okText="Ya, Hapus"
            cancelText="Batal"
          >
            <Tooltip title="Hapus dari Daftar">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="rispeg-ruh-module">
      {/* ── Toolbar Header ── */}
      <div className="rispeg-toolbar">
        <div>
          <Title level={4} className="rispeg-toolbar__title">
            RISPEG RUH (Pencatatan Pengecualian Kedisiplinan)
          </Title>
          <Text className="rispeg-toolbar__subtitle">
            Pencatatan harian pelanggaran kedisiplinan pegawai (Seragam, Apel, Terlambat, Pulang Cepat, Lupa Absen).
          </Text>
        </div>

        <Space wrap>
          <DatePicker
            value={date}
            onChange={onDateChange}
            allowClear={false}
            format="DD MMMM YYYY"
            style={{ width: 200, borderRadius: 8 }}
            suffixIcon={<CalendarOutlined style={{ color: "#64748b" }} />}
          />
          <Input
            placeholder="Cari nama / NIP..."
            prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: 180, borderRadius: 8 }}
            allowClear
          />
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={handleOpenBatchModal}
            style={{ background: "#4f46e5", borderColor: "#4f46e5", borderRadius: 8, fontWeight: 600 }}
          >
            + Input Pelanggaran (Layar Penuh)
          </Button>

          {hasChanges && (
            <Button
              icon={<UndoOutlined />}
              onClick={handleCancelAll}
              disabled={loading || saving}
              style={{ borderRadius: 8 }}
            >
              Batal Draf
            </Button>
          )}

          <Badge dot={hasChanges}>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
              disabled={loading || !hasChanges}
              style={{ background: "#10b981", borderColor: "#10b981", borderRadius: 8, fontWeight: 600 }}
            >
              Simpan Perubahan
            </Button>
          </Badge>
        </Space>
      </div>

      {/* ── Main Exception Table Card ── */}
      <Card className="rispeg-card" variant="borderless">
        <div className="rispeg-card-head">
          <div>
            <h3 className="rispeg-card-title">
              Daftar Pegawai Melanggar — Tanggal {date.format("DD MMMM YYYY")}
            </h3>
            <Text type="secondary" style={{ fontSize: 11.5 }}>
              Menampilkan {violatingList.length} dari {data.length} pegawai yang memiliki catatan pelanggaran pada tanggal ini.
            </Text>
          </div>
        </div>

        {violatingList.length > 0 ? (
          <Table
            className="rispeg-table"
            columns={columns}
            dataSource={violatingList}
            loading={loading}
            rowKey="employee_id"
            pagination={false}
          />
        ) : (
          <div className="rispeg-empty">
            <CheckCircleFilled className="rispeg-empty-icon" />
            <div className="rispeg-empty-title">100% Kedisiplinan Terjaga</div>
            <div className="rispeg-empty-desc">
              Tidak ada catatan pelanggaran kedisiplinan pegawai pada tanggal {date.format("DD MMMM YYYY")}. Seluruh pegawai hadir tepat waktu dan berseragam lengkap.
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenBatchModal}
              style={{ background: "#4f46e5", borderColor: "#4f46e5", borderRadius: 8, fontWeight: 600 }}
            >
              Input Pelanggaran (Layar Penuh)
            </Button>
          </div>
        )}
      </Card>

      {/* ── FULLSCREEN BATCH ENTRY MODAL (HORIZONTAL TABLE GRID WITH POPOVER TIME ENTRY) ── */}
      <Modal
        open={batchModalOpen}
        onCancel={() => setBatchModalOpen(false)}
        title={
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: 24 }}>
            <Space>
              <FullscreenOutlined style={{ color: "#4f46e5", fontSize: 18 }} />
              <span style={{ fontSize: 16, fontWeight: 700, color: "#172033" }}>
                Workspace Pencatatan Massal Pelanggaran — Tanggal {date.format("DD MMMM YYYY")}
              </span>
            </Space>
            <Tag color="purple" style={{ borderRadius: 6, fontWeight: 600 }}>Mode Horizontal Compact Grid</Tag>
          </div>
        }
        width="100vw"
        style={{ top: 0, padding: 0, margin: 0, maxWidth: "100vw" }}
        styles={{ body: { height: "calc(100vh - 120px)", overflowY: "auto", padding: "16px 24px", background: "#f8fafc" } }}
        footer={
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", background: "#ffffff", borderTop: "1px solid #e2e8f0" }}>
            <Button icon={<PlusOutlined />} onClick={handleAddBatchRow} style={{ borderRadius: 8, fontWeight: 600 }}>
              + Tambah Baris Pegawai
            </Button>
            <Space>
              <Button onClick={() => setBatchModalOpen(false)} style={{ borderRadius: 8 }}>
                Batal
              </Button>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={handleApplyBatchModal}
                style={{ background: "#4f46e5", borderColor: "#4f46e5", borderRadius: 8, fontWeight: 600 }}
              >
                Terapkan Semua ({batchRows.filter((r) => r.employee_id != null).length} Entri Pegawai)
              </Button>
            </Space>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Top Quick Guide Banner */}
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 12.5, color: "#475569" }}>
              💡 Centang opsi pelanggaran. Saat <strong>Terlambat</strong> atau <strong>Pulang Cepat</strong> dicentang, klik tag waktu untuk mengatur <strong>Menit & Detik</strong> via Popup ringkas.
            </Text>
            <Button size="small" icon={<PlusOutlined />} onClick={handleAddBatchRow} style={{ borderRadius: 6, fontSize: 12 }}>
              Tambah Baris
            </Button>
          </div>

          {/* Horizontal Grid Table */}
          <div className="batch-grid-table-container">
            <table className="batch-grid-table">
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: "center" }}>#</th>
                  <th style={{ minWidth: 260 }}>Pegawai (Ketik Nama / NIP)</th>
                  <th style={{ width: 90, textAlign: "center" }}>Seragam</th>
                  <th style={{ width: 90, textAlign: "center" }}>Apel Pagi</th>
                  <th style={{ width: 160, textAlign: "center" }}>Terlambat Masuk</th>
                  <th style={{ width: 160, textAlign: "center" }}>Pulang Cepat</th>
                  <th style={{ minWidth: 160 }}>Lupa Absen</th>
                  <th style={{ width: 90, textAlign: "center" }}>Total</th>
                  <th style={{ width: 60, textAlign: "center" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {batchRows.map((row, index) => {
                  const points = calculatePoints(row);

                  return (
                    <tr key={row.rowId}>
                      <td style={{ textAlign: "center", fontWeight: 600, color: "#64748b" }}>{index + 1}</td>
                      
                      {/* Pegawai Select Search */}
                      <td>
                        <Select
                          showSearch
                          style={{ width: "100%" }}
                          placeholder="Ketik nama atau NIP pegawai..."
                          value={row.employee_id || undefined}
                          allowClear
                          optionFilterProp="filterLabel"
                          filterOption={(input, option) => {
                            if (!input) return true;
                            const term = input.toLowerCase().trim();
                            return (
                              (option?.name || "").toLowerCase().includes(term) ||
                              (option?.nip || "").toLowerCase().includes(term) ||
                              (option?.filterLabel || "").toLowerCase().includes(term) ||
                              (option?.label || "").toLowerCase().includes(term)
                            );
                          }}
                          onChange={(val) => {
                            if (!val) {
                              handleUpdateBatchRow(row.rowId, {
                                employee_id: null,
                                employee_name: "",
                                employee_nip: "",
                              });
                              return;
                            }
                            const emp = data.find((d) => d.employee_id === val);
                            if (emp) {
                              handleUpdateBatchRow(row.rowId, {
                                employee_id: emp.employee_id,
                                employee_name: emp.name,
                                employee_nip: emp.nip,
                              });
                            }
                          }}
                          options={employeeOptions}
                          dropdownStyle={{ maxHeight: 320 }}
                        />
                      </td>

                      {/* Seragam */}
                      <td style={{ textAlign: "center" }}>
                        <Checkbox
                          checked={row.violation_uniform}
                          onChange={(e) => handleUpdateBatchRow(row.rowId, { violation_uniform: e.target.checked })}
                        />
                      </td>

                      {/* Apel Pagi */}
                      <td style={{ textAlign: "center" }}>
                        <Checkbox
                          checked={row.violation_assembly}
                          onChange={(e) => handleUpdateBatchRow(row.rowId, { violation_assembly: e.target.checked })}
                        />
                      </td>

                      {/* Terlambat Masuk (Compact Checkbox + Popover Tag) */}
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                          <Checkbox
                            checked={row.violation_entry}
                            onChange={(e) => handleUpdateBatchRow(row.rowId, { violation_entry: e.target.checked })}
                          />
                          {row.violation_entry && (
                            <Popover
                              title={<Text strong style={{ fontSize: 12 }}>Atur Waktu Terlambat (Menit & Detik)</Text>}
                              trigger="click"
                              placement="bottom"
                              content={
                                <div style={{ padding: "6px 2px", width: 230 }}>
                                  <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 6 }}>
                                    Pilih Preset Instan:
                                  </Text>
                                  <div className="preset-chip-group" style={{ marginBottom: 10 }}>
                                    {MINUTE_PRESETS.map((p) => (
                                      <button
                                        type="button"
                                        key={p}
                                        className={`preset-chip ${row.entry_late_mins === p && row.entry_late_secs === 0 ? "active" : ""}`}
                                        onClick={() => handleUpdateBatchRow(row.rowId, { entry_late_mins: p, entry_late_secs: 0 })}
                                      >
                                        +{p}m
                                      </button>
                                    ))}
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                                    <div>
                                      <Text type="secondary" style={{ fontSize: 11, display: "block" }}>Menit</Text>
                                      <InputNumber
                                        min={0}
                                        max={480}
                                        size="small"
                                        value={row.entry_late_mins}
                                        onChange={(v) => handleUpdateBatchRow(row.rowId, { entry_late_mins: v || 0 })}
                                        style={{ width: 85, borderRadius: 6 }}
                                      />
                                    </div>
                                    <div>
                                      <Text type="secondary" style={{ fontSize: 11, display: "block" }}>Detik</Text>
                                      <InputNumber
                                        min={0}
                                        max={59}
                                        size="small"
                                        value={row.entry_late_secs}
                                        onChange={(v) => handleUpdateBatchRow(row.rowId, { entry_late_secs: v || 0 })}
                                        style={{ width: 85, borderRadius: 6 }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              }
                            >
                              <Tag color="warning" style={{ cursor: "pointer", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4, borderRadius: 6, margin: 0 }}>
                                <ClockCircleOutlined />
                                {row.entry_late_mins || row.entry_late_secs ? `${row.entry_late_mins}m ${row.entry_late_secs}d` : "Set Waktu"}
                              </Tag>
                            </Popover>
                          )}
                        </div>
                      </td>

                      {/* Pulang Cepat (Compact Checkbox + Popover Tag) */}
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                          <Checkbox
                            checked={row.violation_exit}
                            onChange={(e) => handleUpdateBatchRow(row.rowId, { violation_exit: e.target.checked })}
                          />
                          {row.violation_exit && (
                            <Popover
                              title={<Text strong style={{ fontSize: 12 }}>Atur Waktu Pulang Cepat (Menit & Detik)</Text>}
                              trigger="click"
                              placement="bottom"
                              content={
                                <div style={{ padding: "6px 2px", width: 230 }}>
                                  <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 6 }}>
                                    Pilih Preset Instan:
                                  </Text>
                                  <div className="preset-chip-group" style={{ marginBottom: 10 }}>
                                    {MINUTE_PRESETS.map((p) => (
                                      <button
                                        type="button"
                                        key={p}
                                        className={`preset-chip ${row.exit_early_mins === p && row.exit_early_secs === 0 ? "active" : ""}`}
                                        onClick={() => handleUpdateBatchRow(row.rowId, { exit_early_mins: p, exit_early_secs: 0 })}
                                      >
                                        +{p}m
                                      </button>
                                    ))}
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                                    <div>
                                      <Text type="secondary" style={{ fontSize: 11, display: "block" }}>Menit</Text>
                                      <InputNumber
                                        min={0}
                                        max={480}
                                        size="small"
                                        value={row.exit_early_mins}
                                        onChange={(v) => handleUpdateBatchRow(row.rowId, { exit_early_mins: v || 0 })}
                                        style={{ width: 85, borderRadius: 6 }}
                                      />
                                    </div>
                                    <div>
                                      <Text type="secondary" style={{ fontSize: 11, display: "block" }}>Detik</Text>
                                      <InputNumber
                                        min={0}
                                        max={59}
                                        size="small"
                                        value={row.exit_early_secs}
                                        onChange={(v) => handleUpdateBatchRow(row.rowId, { exit_early_secs: v || 0 })}
                                        style={{ width: 85, borderRadius: 6 }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              }
                            >
                              <Tag color="error" style={{ cursor: "pointer", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4, borderRadius: 6, margin: 0 }}>
                                <ClockCircleOutlined />
                                {row.exit_early_mins || row.exit_early_secs ? `${row.exit_early_mins}m ${row.exit_early_secs}d` : "Set Waktu"}
                              </Tag>
                            </Popover>
                          )}
                        </div>
                      </td>

                      {/* Lupa Absen */}
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <Checkbox
                            checked={row.violation_missed_checkin}
                            onChange={(e) => handleUpdateBatchRow(row.rowId, { violation_missed_checkin: e.target.checked })}
                          >
                            <span style={{ fontSize: 11 }}>Absen Masuk</span>
                          </Checkbox>
                          <Checkbox
                            checked={row.violation_missed_checkout}
                            onChange={(e) => handleUpdateBatchRow(row.rowId, { violation_missed_checkout: e.target.checked })}
                          >
                            <span style={{ fontSize: 11 }}>Absen Pulang</span>
                          </Checkbox>
                        </div>
                      </td>

                      {/* Total Points */}
                      <td style={{ textAlign: "center" }}>
                        <Tag color={points > 0 ? "red" : "default"} style={{ borderRadius: 6, fontWeight: 700 }}>
                          {points} Tiket
                        </Tag>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: "center" }}>
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleDeleteBatchRow(row.rowId)}
                          disabled={batchRows.length <= 1}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Rispeg;
