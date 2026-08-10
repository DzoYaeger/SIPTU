import {
  App as AntdApp,
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
} from "antd";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  WarningOutlined,
  SaveOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import { useEffect, useState, useCallback, memo } from "react";
import dayjs from "dayjs";
import { useAuth } from "../hooks/useAuth.js";
import { buildMessageAdapter } from "../utils/notify.js";

const toMinutesAndSeconds = (minutes) => {
  const safeMinutes = Math.max(0, Number(minutes) || 0);
  const totalSeconds = Math.round(safeMinutes * 60);
  return {
    m: Math.floor(totalSeconds / 60),
    s: totalSeconds % 60
  };
};

const formatMinutesLabel = (minutes) => {
  const { m, s } = toMinutesAndSeconds(minutes);
  if (m === 0 && s === 0) return "0m";
  
  let parts = [];
  if (m > 0) parts.push(`${m}m`);
  if (s > 0) parts.push(`${s}d`);
  
  return parts.join(" ");
};

// Extracted Component to separate state management
const TimeInputContent = ({ record, type, onUpdate, onClose }) => {
  const fieldMinutes =
    type === "entry" ? "entry_late_minutes" : "exit_early_minutes";
  
  const initial = toMinutesAndSeconds(record.control[fieldMinutes]);
  const [mins, setMins] = useState(initial.m);
  const [secs, setSecs] = useState(initial.s);

  const onSave = () => {
    const total = mins + (secs / 60);
    onUpdate(record.employee_id, fieldMinutes, Number(total.toFixed(2)));
    onClose();
  };

  return (
    <div style={{ padding: 12, width: 260 }}>
      <Typography.Text strong style={{ display: "block", marginBottom: 12 }}>
        Input Waktu (Menit & Detik)
      </Typography.Text>
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>Menit</Typography.Text>
            <InputNumber
              min={0}
              value={mins}
              onChange={(v) => setMins(v ?? 0)}
              style={{ width: "100%" }}
              placeholder="0"
            />
          </div>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>Detik</Typography.Text>
            <InputNumber
              min={0}
              max={59}
              value={secs}
              onChange={(v) => setSecs(v ?? 0)}
              style={{ width: "100%" }}
              placeholder="0"
            />
          </div>
        </div>
        <Button type="primary" block onClick={onSave} style={{ marginTop: 4 }}>
          Simpan
        </Button>
      </Space>
    </div>
  );
};

// Extracted Cell Component to handle Popover state correctly
const ViolationCell = memo(({ record, type, onUpdate }) => {
  const [open, setOpen] = useState(false);
  const fieldCheck = type === "entry" ? "violation_entry" : "violation_exit";
  const fieldMinutes =
    type === "entry" ? "entry_late_minutes" : "exit_early_minutes";

  const isChecked = record.control[fieldCheck];
  const minutes = record.control[fieldMinutes] || 0;
  const tagColor = type === "entry" ? "warning" : "error";
  const popoverTitle =
    type === "entry" ? "Input Keterlambatan" : "Input Waktu Keluar";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
    >
      <Checkbox
        checked={isChecked}
        onChange={(e) =>
          onUpdate(record.employee_id, fieldCheck, e.target.checked)
        }
      />
      {!!isChecked && (
        <Popover
          content={
            <TimeInputContent
              record={record}
              type={type}
              onUpdate={onUpdate}
              onClose={() => setOpen(false)}
            />
          }
          title={popoverTitle}
          trigger="click"
          open={open}
          onOpenChange={setOpen}
        >
          <Tag
            color={tagColor}
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <ClockCircleOutlined />
            {formatMinutesLabel(minutes)}
          </Tag>
        </Popover>
      )}
    </div>
  );
});



const MissedAttendanceCell = memo(({ record, onUpdate }) => {
  const isCheckinChecked = Boolean(record.control.violation_missed_checkin);
  const isCheckoutChecked = Boolean(record.control.violation_missed_checkout);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        padding: "4px 8px",
        gap: 4,
      }}
    >
      <Checkbox
        checked={isCheckinChecked}
        onChange={(e) =>
          onUpdate(record.employee_id, "violation_missed_checkin", e.target.checked)
        }
        style={{ fontSize: "12px" }}
      >
        Masuk
      </Checkbox>
      <Checkbox
        checked={isCheckoutChecked}
        onChange={(e) =>
          onUpdate(record.employee_id, "violation_missed_checkout", e.target.checked)
        }
        style={{ fontSize: "12px", marginLeft: 0 }}
      >
        Pulang
      </Checkbox>
    </div>
  );
});

const Rispeg = () => {
  const { apiFetch } = useAuth();
  const { message, modal } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);

  const [date, setDate] = useState(dayjs());
  const [data, setData] = useState([]);
  const [originalData, setOriginalData] = useState([]); // To track changes
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const fetchData = useCallback(
    async (selectedDate) => {
      setLoading(true);
      try {
        const formattedDate = selectedDate.format("YYYY-MM-DD");
        const response = await apiFetch(`/rispeg/daily?date=${formattedDate}`);
        if (!response.ok) throw new Error("Gagal mengambil data");
        const result = await response.json();
        setData(result);
        setOriginalData(JSON.parse(JSON.stringify(result))); // Deep copy
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
    // Prompt if unsaved changes when changing date
    if (hasChanges) {
      modal.confirm({
        title: "Data belum disimpan",
        content:
          "Anda memiliki perubahan yang belum disimpan. Yakin ingin ganti tanggal?",
        okText: "Ya, Ganti",
        cancelText: "Batal",
        onOk: () => {
          fetchData(date);
        },
        onCancel: () => {
          // Revert date change if possible?
        },
      });
    } else {
      fetchData(date);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  // Intercept date change
  const onDateChange = (newDate) => {
    if (hasChanges) {
      modal.confirm({
        title: "Perubahan Belum Disimpan",
        content:
          "Data yang Anda ubah akan hilang jika Anda mengganti tanggal tanpa menyimpannya.",
        okText: "Abaikan Perubahan",
        cancelText: "Batal",
        onOk: () => {
          setDate(newDate);
          setHasChanges(false); // Reset flag so useEffect fetches freely
        },
      });
    } else {
      setDate(newDate);
    }
  };

  const handleUpdate = useCallback((employeeId, fieldOrPatch, value) => {
    setData((prev) => {
      const newData = prev.map((item) => {
        if (item.employee_id === employeeId) {
          const patch =
            typeof fieldOrPatch === "string"
              ? { [fieldOrPatch]: value }
              : (fieldOrPatch ?? {});

          const newControl = { ...item.control, ...patch };

          if (!newControl.violation_entry) {
            newControl.entry_late_minutes = 0;
          }
          if (!newControl.violation_exit) {
            newControl.exit_early_minutes = 0;
          }

          if (!newControl.violation_missed_checkin) {
            newControl.missed_checkin_minutes = 0;
          }
          if (!newControl.violation_missed_checkout) {
            newControl.missed_checkout_minutes = 0;
          }

          // Recalculate points
          let points = 0;
          if (newControl.violation_uniform) points++;
          if (newControl.violation_assembly) points++;
          if (newControl.violation_entry) points++;
          if (newControl.violation_exit) points++;
          if (newControl.violation_missed_checkin) points++;
          if (newControl.violation_missed_checkout) points++;
          newControl.total_points = points;

          return { ...item, control: newControl };
        }
        return item;
      });
      return newData;
    });
    setHasChanges(true);
  }, []);

  const executeSave = async () => {
    setSaving(true);
    try {
      const changedItems = data.filter((item, index) => {
        const original = originalData[index];
        return (
          JSON.stringify(item.control) !== JSON.stringify(original?.control)
        );
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
        throw new Error("Gagal menyimpan data");
      }

      const result = await response.json();
      notification.success({
        message: "Berhasil",
        description: `${result.data.length} data pegawai berhasil disimpan.`,
      });

      // Refetch to sync state
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
        changedItems.push({
          current: item,
          original: original,
        });
      }
    });

    if (changedItems.length === 0) {
      message.info("Tidak ada perubahan untuk disimpan.");
      return;
    }

    const changesList = (
      <div style={{ maxHeight: "400px", overflowY: "auto" }}>
        <Typography.Text>
          Berikut adalah ringkasan perubahan yang akan disimpan:
        </Typography.Text>
        <ul style={{ marginTop: 8, paddingLeft: 20 }}>
          {changedItems.map(({ current, original }) => {
            const changelog = [];
            if (
              current.control.violation_uniform !==
              original.control.violation_uniform
            ) {
              changelog.push(
                `Seragam: ${original.control.violation_uniform ? "Ya" : "Tidak"} ➝ ${current.control.violation_uniform ? "Ya" : "Tidak"}`,
              );
            }
            if (
              current.control.violation_assembly !==
              original.control.violation_assembly
            ) {
              changelog.push(
                `Apel: ${original.control.violation_assembly ? "Ya" : "Tidak"} ➝ ${current.control.violation_assembly ? "Ya" : "Tidak"}`,
              );
            }
            if (
              current.control.violation_entry !==
                original.control.violation_entry ||
              current.control.entry_late_minutes !==
                original.control.entry_late_minutes
            ) {
              let desc = `Terlambat: ${original.control.violation_entry ? "Ya" : "Tidak"}`;
              if (original.control.violation_entry)
                desc += ` (${formatMinutesLabel(original.control.entry_late_minutes)})`;
              desc += ` ➝ ${current.control.violation_entry ? "Ya" : "Tidak"}`;
              if (current.control.violation_entry)
                desc += ` (${formatMinutesLabel(current.control.entry_late_minutes)})`;
              changelog.push(desc);
            }
            if (
              current.control.violation_exit !==
                original.control.violation_exit ||
              current.control.exit_early_minutes !==
                original.control.exit_early_minutes
            ) {
              let desc = `Pulang Cepat: ${original.control.violation_exit ? "Ya" : "Tidak"}`;
              if (original.control.violation_exit)
                desc += ` (${formatMinutesLabel(original.control.exit_early_minutes)})`;
              desc += ` -> ${current.control.violation_exit ? "Ya" : "Tidak"}`;
              if (current.control.violation_exit)
                desc += ` (${formatMinutesLabel(current.control.exit_early_minutes)})`;
              changelog.push(desc);
            }
            if (
              current.control.violation_missed_checkin !==
                original.control.violation_missed_checkin
            ) {
              changelog.push(
                `Lupa Absen Masuk: ${original.control.violation_missed_checkin ? "Ya" : "Tidak"} ➝ ${current.control.violation_missed_checkin ? "Ya" : "Tidak"}`,
              );
            }
            if (
              current.control.violation_missed_checkout !==
                original.control.violation_missed_checkout
            ) {
              changelog.push(
                `Lupa Absen Pulang: ${original.control.violation_missed_checkout ? "Ya" : "Tidak"} ➝ ${current.control.violation_missed_checkout ? "Ya" : "Tidak"}`,
              );
            }

            return (
              <li key={current.employee_id} style={{ marginBottom: 4 }}>
                <Typography.Text strong>{current.name}</Typography.Text>
                <ul
                  style={{ fontSize: "12px", color: "#666", paddingLeft: 16 }}
                >
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
      title: "Konfirmasi Simpan Perubahan",
      content: changesList,
      width: 500,
      okText: "Ya, Simpan",
      cancelText: "Batal",
      onOk: executeSave,
    });
  };

  const handleCancel = () => {
    if (hasChanges) {
      modal.confirm({
        title: "Batalkan Perubahan",
        content:
          "Semua perubahan yang belum disimpan akan dikembalikan ke kondisi awal.",
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
      width: 250,
      render: (text, record) => (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar
            icon={<UserOutlined />}
            style={{ backgroundColor: "#1890ff" }}
          />
          <div>
            <Typography.Text strong style={{ display: "block" }}>
              {text}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {record.nip || "-"}
            </Typography.Text>
          </div>
        </div>
      ),
    },
    {
      title: "Seragam",
      key: "violation_uniform",
      align: "center",
      width: 100,
      render: (_, record) => (
        <Checkbox
          checked={record.control.violation_uniform}
          onChange={(e) =>
            handleUpdate(
              record.employee_id,
              "violation_uniform",
              e.target.checked,
            )
          }
        />
      ),
    },
    {
      title: "Apel Pagi",
      key: "violation_assembly",
      align: "center",
      width: 100,
      render: (_, record) => (
        <Checkbox
          checked={record.control.violation_assembly}
          onChange={(e) =>
            handleUpdate(
              record.employee_id,
              "violation_assembly",
              e.target.checked,
            )
          }
        />
      ),
    },
    {
      title: "Terlambat Masuk",
      key: "violation_entry",
      align: "center",
      width: 180,
      render: (_, record) => (
        <ViolationCell record={record} type="entry" onUpdate={handleUpdate} />
      ),
    },
    {
      title: "Lupa Absen Masuk/Pulang",
      key: "missed_attendance",
      align: "center",
      width: 260,
      render: (_, record) => (
        <MissedAttendanceCell record={record} onUpdate={handleUpdate} />
      ),
    },
    {
      title: "Total Ticket Pelanggaran",
      key: "total_points",
      align: "center",
      width: 100,
      render: (_, record) => (
        <Tag color={record.control.total_points > 0 ? "red" : "green"}>
          {record.control.total_points} Ticket Pelanggaran
        </Tag>
      ),
    },
  ];

  return (
    <div className="module-section">
      <div className="module-toolbar">
        <div>
          <Typography.Title level={4} className="module-title">
            RISPEG (Kontrol Harian)
          </Typography.Title>
          <Typography.Text className="module-subtitle">
            Monitoring pelanggaran harian pegawai (Seragam, Apel, Terlambat, Lupa Absen).
          </Typography.Text>
        </div>
        <Space>
          <DatePicker
            value={date}
            onChange={onDateChange}
            allowClear={false}
            format="DD MMMM YYYY"
            style={{ width: 220 }}
            suffixIcon={<CalendarOutlined />}
          />
          {hasChanges && (
            <Button
              icon={<UndoOutlined />}
              onClick={handleCancel}
              disabled={loading || saving}
            >
              Batal
            </Button>
          )}
          <Badge dot={hasChanges}>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
              disabled={loading || !hasChanges}
              style={{ backgroundColor: "#52c41a", borderColor: "#52c41a" }}
            >
              Simpan Perubahan
            </Button>
          </Badge>
        </Space>
      </div>

      <Card
        variant="borderless"
        style={{
          borderRadius: 12,
          boxShadow: "0 1px 2px 0 rgba(0,0,0,0.03)",
        }}
      >
        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey="employee_id"
          pagination={false}
          scroll={{ y: 600 }}
        />
      </Card>
    </div>
  );
};

export default Rispeg;
