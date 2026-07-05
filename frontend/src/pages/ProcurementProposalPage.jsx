import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  App as AntdApp,
  Button,
  Input,
  Progress,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tabs,
  Tooltip,
  Typography,
  Alert,
  Card,
} from "antd";
import {
  ClockCircleOutlined,
  CheckOutlined,
  EditFilled,
  CloseOutlined,
  EditOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  TeamOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useAuth } from "../hooks/useAuth.js";
import dayjs from "dayjs";
import "dayjs/locale/id";
import "./ProcurementProposalPage.css";

dayjs.locale("id");

const { Title, Text } = Typography;
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";
const VOLUME_OPTIONS = ["Ml", "Liter", "Buah", "Papan", "Botol", "Gram", "Kapsul"].map((v) => ({
  value: v,
  label: v,
}));

export default function ProcurementProposalPage() {
  const { apiFetch, token, user } = useAuth();
  const { message, modal } = AntdApp.useApp();
  const heartbeatRef = useRef(null);

  // ---------- TAB 1: USULAN PENGADAAN (COLLAB) STATE ----------
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const currentUserId = user?.id;

  // ---------- TAB 1: USULAN PENGADAAN (COLLAB) LOGIC ----------
  const fetchRows = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiFetch(`${API_URL}/procurement-proposals`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "Gagal memuat usulan");
      const mapped = (data?.data ?? []).map((r) => ({ ...r, key: String(r.id) }));
      setRows(mapped);
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, message, token]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    if (!token) return;
    const timer = window.setInterval(fetchRows, 5000);
    return () => window.clearInterval(timer);
  }, [fetchRows, token]);

  const clearHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      window.clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const lockRow = useCallback(
    async (id) => {
      const res = await apiFetch(`${API_URL}/procurement-proposals/${id}/lock`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "Baris sedang dikunci user lain");
      return data?.data;
    },
    [apiFetch],
  );

  const unlockRow = useCallback(
    async (id) => {
      await apiFetch(`${API_URL}/procurement-proposals/${id}/unlock`, { method: "POST" });
    },
    [apiFetch],
  );

  const startHeartbeat = useCallback(
    (id) => {
      clearHeartbeat();
      heartbeatRef.current = window.setInterval(async () => {
        try {
          await lockRow(id);
        } catch {
          // no-op; polling will sync
        }
      }, 15000);
    },
    [clearHeartbeat, lockRow],
  );

  const startEdit = async (record) => {
    try {
      await lockRow(record.id);
      setEditingKey(record.key);
      setDraft({
        id: record.id,
        item_name: record.item_name ?? "",
        brand: record.brand ?? "",
        satuan: record.satuan ?? undefined,
        jumlah: record.jumlah ?? undefined,
      });
      startHeartbeat(record.id);
      fetchRows();
    } catch (error) {
      message.warning(error.message);
    }
  };

  const startAdd = () => {
    setEditingKey("__new__");
    setDraft({
      item_name: "",
      brand: "",
      satuan: undefined,
      jumlah: undefined,
    });
  };

  const cancelEdit = async () => {
    if (draft?.id) {
      try {
        await unlockRow(draft.id);
      } catch {
        // ignore
      }
    }
    clearHeartbeat();
    setEditingKey(null);
    setDraft({});
    fetchRows();
  };

  const saveEdit = async () => {
    if (!draft.item_name?.trim()) {
      message.warning("Nama barang wajib diisi");
      return;
    }
    setSaving(true);
    try {
      if (editingKey === "__new__") {
        const res = await apiFetch(`${API_URL}/procurement-proposals`, {
          method: "POST",
          body: JSON.stringify({
            item_name: draft.item_name,
            brand: draft.brand || null,
            satuan: draft.satuan || null,
            jumlah: draft.jumlah || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message ?? "Gagal menambah usulan");
      } else {
        const res = await apiFetch(`${API_URL}/procurement-proposals/${draft.id}`, {
          method: "PUT",
          body: JSON.stringify({
            item_name: draft.item_name,
            brand: draft.brand || null,
            satuan: draft.satuan || null,
            jumlah: draft.jumlah || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message ?? "Gagal memperbarui usulan");
      }
      message.success("Usulan berhasil disimpan");
      clearHeartbeat();
      setEditingKey(null);
      setDraft({});
      fetchRows();
    } catch (error) {
      message.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteProposal = async (id) => {
    try {
      const res = await apiFetch(`${API_URL}/procurement-proposals/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "Gagal menghapus usulan");
      message.success("Usulan berhasil dihapus");
      fetchRows();
    } catch (error) {
      message.error(error.message);
    }
  };

  useEffect(() => {
    return () => {
      clearHeartbeat();
    };
  }, [clearHeartbeat]);

  const dataSource = useMemo(() => {
    if (editingKey === "__new__") return [...rows, { key: "__new__", id: null }];
    return rows;
  }, [editingKey, rows]);

  // ---------- TAB 1: USULAN PENGADAAN (COLLAB) COLUMNS ----------
  const isEditing = (key) => key === editingKey;

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return dataSource;
    return dataSource.filter((r) =>
      [r.item_name, r.brand, r.satuan, r.jumlah]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [dataSource, search]);

  const stats = useMemo(() => {
    const total = rows.length;
    const locked = rows.filter((r) => r.editing_by).length;
    const mine = rows.filter((r) => Number(r.editing_by) === Number(currentUserId)).length;
    const editable = total - locked + mine;
    return { total, locked, mine, editable };
  }, [rows, currentUserId]);

  const columns = [
    {
      title: "#",
      width: 60,
      render: (_, __, index) => <span className="pp-row-no">{index + 1}</span>,
    },
    {
      title: "Nama Barang",
      dataIndex: "item_name",
      key: "item_name",
      render: (v, r) =>
        isEditing(r.key) ? (
          <Input
            value={draft.item_name}
            onChange={(e) => setDraft((p) => ({ ...p, item_name: e.target.value }))}
            placeholder="Nama barang"
          />
        ) : (
          <Text strong style={{ fontSize: 13 }}>{v || "-"}</Text>
        ),
    },
    {
      title: "Merek",
      dataIndex: "brand",
      key: "brand",
      width: 220,
      render: (v, r) =>
        isEditing(r.key) ? (
          <Input
            value={draft.brand}
            onChange={(e) => setDraft((p) => ({ ...p, brand: e.target.value }))}
            placeholder="Merek"
          />
        ) : (
          <span>{v || "-"}</span>
        ),
    },
    {
      title: "Jumlah & Satuan",
      key: "volume",
      width: 220,
      render: (_, r) =>
        isEditing(r.key) ? (
          <Space>
            <Input
              type="number"
              min={1}
              value={draft.jumlah}
              onChange={(e) => setDraft((p) => ({ ...p, jumlah: e.target.value }))}
              placeholder="Jml"
              style={{ width: 80 }}
            />
            <Select
              value={draft.satuan}
              options={VOLUME_OPTIONS}
              allowClear
              placeholder="Satuan"
              onChange={(value) => setDraft((p) => ({ ...p, satuan: value }))}
              style={{ width: 120 }}
            />
          </Space>
        ) : (
          <span>{r.jumlah ? `${r.jumlah} ` : ""}{r.satuan || "-"}</span>
        ),
    },
    {
      title: "Status Realtime",
      key: "lock",
      width: 220,
      render: (_, r) => {
        if (!r.editing_by) return <Tag color="green">Siap diedit</Tag>;
        const mine = Number(r.editing_by) === Number(currentUserId);
        return mine ? (
          <Tag color="blue" icon={<EditFilled />}>Sedang Anda edit</Tag>
        ) : (
          <Tag color="orange" icon={<ClockCircleOutlined />}>
            Diedit: {r.editing_by_name || "User lain"}
          </Tag>
        );
      },
    },
    {
      title: "Aksi",
      key: "action",
      width: 120,
      fixed: "right",
      render: (_, r) =>
        isEditing(r.key) ? (
          <Space size={6}>
            <Tooltip title="Simpan">
              <Button
                size="small"
                type="text"
                className="pp-btn-save"
                icon={<CheckOutlined />}
                onClick={saveEdit}
                loading={saving}
              />
            </Tooltip>
            <Tooltip title="Batal">
              <Button
                size="small"
                type="text"
                danger
                className="pp-btn-cancel"
                icon={<CloseOutlined />}
                onClick={cancelEdit}
              />
            </Tooltip>
          </Space>
        ) : (
          <Space size={6}>
            <Tooltip title="Edit baris">
              <Button
                size="small"
                type="text"
                className="pp-btn-edit"
                icon={<EditOutlined />}
                disabled={!!editingKey || (!!r.editing_by && Number(r.editing_by) !== Number(currentUserId))}
                onClick={() => startEdit(r)}
              />
            </Tooltip>
            <Tooltip title="Hapus baris">
              <Button
                size="small"
                type="text"
                danger
                icon={<DeleteOutlined />}
                disabled={!!editingKey || (!!r.editing_by && Number(r.editing_by) !== Number(currentUserId))}
                onClick={() => {
                  modal.confirm({
                    title: "Hapus Usulan",
                    content: "Yakin ingin menghapus usulan ini?",
                    okText: "Ya",
                    okButtonProps: { danger: true },
                    cancelText: "Batal",
                    onOk: () => deleteProposal(r.id),
                  });
                }}
              />
            </Tooltip>
          </Space>
        ),
    },
  ];
  const tabItems = [
    {
      key: "1",
      label: "Usulan Pengadaan (Bebas)",
      children: (
        <>
          <div className="pp-stats" style={{ marginTop: 16 }}>
            <div className="pp-stat-card">
              <Statistic title="Total Usulan" value={stats.total} />
            </div>
            <div className="pp-stat-card">
              <Statistic title="Sedang Diedit" value={stats.locked} prefix={<TeamOutlined />} />
            </div>
            <div className="pp-stat-card">
              <Statistic title="Edit Anda" value={stats.mine} prefix={<EditFilled />} />
            </div>
            <div className="pp-stat-card">
              <Text type="secondary">Ketersediaan Baris Edit</Text>
              <Progress
                percent={stats.total ? Math.round((Math.max(stats.editable, 0) / stats.total) * 100) : 100}
                strokeColor="#0ea5e9"
                size="small"
              />
            </div>
          </div>

          <div className="pp-toolbar">
            <Space wrap>
              <Input
                prefix={<SearchOutlined />}
                placeholder="Cari nama barang, merek, volume"
                className="pp-search"
                allowClear
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button icon={<ReloadOutlined />} onClick={fetchRows}>
                Refresh
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={startAdd} disabled={!!editingKey}>
                Tambah Usulan
              </Button>
            </Space>
            <Tag icon={<InfoCircleOutlined />} color="processing">
              Realtime aktif (sync tiap 5 detik)
            </Tag>
          </div>

          <div className="pp-table-wrap">
            <Table
              rowKey="key"
              loading={loading}
              columns={columns}
              dataSource={filteredRows}
              pagination={{ pageSize: 15 }}
              scroll={{ x: 980 }}
              rowClassName={(r) => (isEditing(r.key) ? "pp-row-editing" : "")}
              locale={{
                emptyText: (
                  <div className="pp-empty">
                    <InfoCircleOutlined style={{ fontSize: 28, color: "#94a3b8" }} />
                    <div>Belum ada data usulan. Klik tombol Tambah Usulan.</div>
                  </div>
                ),
              }}
            />
          </div>
        </>
      ),
    },
  ];

  return (
    <div className="pp-page">
      <div className="pp-hero">
        <div className="pp-hero-badge">
          <ThunderboltOutlined /> Realtime Collaborative Sheet
        </div>
        <Title level={3} className="pp-title">
          Pengusulan Layanan Pengadaan PDTT
        </Title>
        <Text className="pp-sub">
          Daftarkan usulan pengadaan barang baru secara kolaboratif atau pilih langsung dari katalog yang telah dibuka oleh Admin.
        </Text>
      </div>

      <div style={{ background: '#fff', borderRadius: 8, padding: '0 24px 24px' }}>
        <Tabs items={tabItems} defaultActiveKey="1" size="large" />
      </div>
    </div>
  );
}
