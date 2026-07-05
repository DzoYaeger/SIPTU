import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Table,
  Input,
  Select,
  Button,
  Form,
  App as AntdApp,
  Tooltip,
  Tag,
  Space,
  Dropdown,
  Modal,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  FileProtectOutlined,
  InboxOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  DatabaseOutlined,
  SafetyCertificateOutlined,
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  FilePdfOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { buildMessageAdapter } from "../utils/notify.js";
import dayjs from "dayjs";
import "./KearsipanArsipVital.css";

const { Option } = Select;

const MEDIA_OPTIONS = ["Hard File", "Soft File", "Hard File dan Soft File"];
const JANGKA_SIMPAN_OPTIONS = [
  "1 Tahun",
  "2 Tahun",
  "3 Tahun",
  "4 Tahun",
  "5 Tahun",
  "Permanent",
  "Sampai Dengan berakhirnya sewa",
];
const METODE_PERLINDUNGAN_OPTIONS = ["Duplikat", "Alih Media"];

/* ── Table Sub-Components (Defined outside to prevent focus loss) ── */
const InlineInput = ({ value, onChange, placeholder }) => (
  <Input
    size="small"
    className="av-inline-input"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
  />
);

const InlineSelect = ({ value, onChange, options }) => (
  <Select
    size="small"
    className="av-inline-input"
    value={value}
    onChange={onChange}
    style={{ width: "100%" }}
  >
    {options.map((opt) => (
      <Option key={opt} value={opt}>
        {opt}
      </Option>
    ))}
  </Select>
);

const KearsipanArsipVital = () => {
  const navigate = useNavigate();
  const { apiFetch } = useAuth();
  const { message } = AntdApp.useApp();
  const notify = buildMessageAdapter(message);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [units, setUnits] = useState([]);
  const [userRole, setUserRole] = useState("none");
  const [userUnitId, setUserUnitId] = useState(null);
  
  const [selectedUnitId, setSelectedUnitId] = useState("all");
  const [search, setSearch] = useState("");

  // Inline editing state
  const [editingKey, setEditingKey] = useState(null);
  const [draft, setDraft] = useState({});
  const [savingKey, setSavingKey] = useState(null);
  const [exporting, setExporting] = useState(false);

  const fetchUnits = async () => {
    try {
      const res = await apiFetch("/letters/units");
      const json = await res.json();
      setUnits(json.data || []);
      setUserRole(json.user_role);
      setUserUnitId(json.user_unit_id);
      
      if (json.user_role === "up") {
        setSelectedUnitId(json.user_unit_id);
      } else if (json.user_role === "uk") {
        setSelectedUnitId("uk");
      }
    } catch (e) {
      notify.error({ message: "Gagal memuat data unit" });
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedUnitId !== "all") params.set("archive_unit_id", selectedUnitId);
      if (search) params.set("search", search);

      const res = await apiFetch(`/vital-archives?${params}`);
      const json = await res.json();
      const rows = (json.data || []).map(r => ({ ...r, key: String(r.id) }));
      setData(rows);
    } catch (e) {
      notify.error({ message: "Gagal memuat data arsip" });
    } finally {
      setLoading(false);
    }
  }, [selectedUnitId, search, apiFetch, notify]);

  useEffect(() => {
    fetchUnits();
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Inline Editing Logic ── */
  const startEdit = (record) => {
    setEditingKey(record.key);
    setDraft({ ...record });
  };

  const startNew = () => {
    const unitToSave = selectedUnitId === "all" ? null : selectedUnitId;
    setEditingKey("__new__");
    setDraft({
      key: "__new__",
      jenis_arsip: "",
      archive_unit_id: unitToSave === "uk" ? null : unitToSave,
      kurun_waktu: "",
      media: MEDIA_OPTIONS[0],
      jumlah: "",
      jangka_simpan: JANGKA_SIMPAN_OPTIONS[0],
      metode_perlindungan: METODE_PERLINDUNGAN_OPTIONS[0],
      lokasi_simpan: "",
    });
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setDraft({});
  };

  const setField = (field) => (val) => setDraft(prev => ({ ...prev, [field]: val }));

  const saveRow = async () => {
    if (!draft.jenis_arsip?.trim()) {
      notify.warning({ message: "Jenis arsip wajib diisi" });
      return;
    }
    setSavingKey(editingKey);
    try {
      const isNew = editingKey === "__new__";
      const url = isNew ? "/vital-archives" : `/vital-archives/${editingKey}`;
      const method = isNew ? "POST" : "PUT";
      
      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      if (res.ok) {
        notify.success({ message: isNew ? "Data ditambahkan" : "Data diperbarui" });
        cancelEdit();
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Gagal menyimpan data");
      }
    } catch (e) {
      notify.error({ message: e.message });
    } finally {
      setSavingKey(null);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await apiFetch(`/vital-archives/${id}`, { method: "DELETE" });
      if (res.ok) {
        notify.success({ message: "Data berhasil dihapus" });
        fetchData();
      } else {
        throw new Error("Gagal menghapus");
      }
    } catch (e) {
      notify.error({ message: e.message });
    }
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (selectedUnitId !== "all") params.set("archive_unit_id", selectedUnitId);
      if (search) params.set("search", search);

      const res = await apiFetch(`/vital-archives/export-pdf?${params}`);
      if (!res.ok) throw new Error("Gagal mengunduh PDF");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const filename = `Laporan_Arsip_Vital_${dayjs().format("YYYYMMDD_HHmmss")}.pdf`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      notify.success({ message: "Laporan PDF berhasil diunduh" });
    } catch (e) {
      notify.error({ message: "Gagal ekspor PDF", description: e.message });
    } finally {
      setExporting(false);
    }
  };

  const isEditing = (key) => key === editingKey;

  const tableData = editingKey === "__new__" ? [draft, ...data] : data;

  const columns = [
    {
      title: "Jenis Arsip",
      dataIndex: "jenis_arsip",
      key: "jenis_arsip",
      render: (text, record) => isEditing(record.key) ? (
        <InlineInput value={draft.jenis_arsip} onChange={setField("jenis_arsip")} placeholder="Jenis arsip..." />
      ) : (
        <div style={{ fontWeight: 600, color: "var(--av-primary)" }}>
          <FileProtectOutlined style={{ marginRight: 8, opacity: 0.5 }} />
          {text}
        </div>
      ),
    },
    {
      title: "Unit Pengolah",
      dataIndex: "archive_unit_nama",
      key: "archive_unit_nama",
      width: 180,
      render: (text, record) => isEditing(record.key) ? (
        <Select
          size="small"
          className="av-inline-input"
          value={draft.archive_unit_id === null ? "uk" : draft.archive_unit_id}
          onChange={(val) => setField("archive_unit_id")(val === "uk" ? null : val)}
          disabled={userRole === "up"}
          style={{ width: "100%" }}
        >
          <Option value="uk">Unit Kearsipan</Option>
          {units.map(u => <Option key={u.id} value={u.id}>{u.nama}</Option>)}
        </Select>
      ) : (
        <Tag className="av-badge av-badge--blue">{text}</Tag>
      ),
    },
    {
      title: "Kurun Waktu",
      dataIndex: "kurun_waktu",
      key: "kurun_waktu",
      width: 120,
      render: (text, record) => isEditing(record.key) ? (
        <InlineInput value={draft.kurun_waktu} onChange={setField("kurun_waktu")} placeholder="2020-2025" />
      ) : (
        <span>
          <CalendarOutlined style={{ marginRight: 6, color: "var(--av-muted)" }} />
          {text}
        </span>
      ),
    },
    {
      title: "Media",
      dataIndex: "media",
      key: "media",
      width: 150,
      render: (text, record) => isEditing(record.key) ? (
        <InlineSelect value={draft.media} onChange={setField("media")} options={MEDIA_OPTIONS} />
      ) : (
        <span className="av-badge av-badge--slate">
          <DatabaseOutlined style={{ marginRight: 6 }} />
          {text}
        </span>
      ),
    },
    {
        title: "Jumlah",
        dataIndex: "jumlah",
        key: "jumlah",
        width: 100,
        render: (text, record) => isEditing(record.key) ? (
          <InlineInput value={draft.jumlah} onChange={setField("jumlah")} placeholder="1 Berkas" />
        ) : text,
    },
    {
      title: "Jangka Simpan",
      dataIndex: "jangka_simpan",
      key: "jangka_simpan",
      width: 180,
      render: (text, record) => isEditing(record.key) ? (
        <InlineSelect value={draft.jangka_simpan} onChange={setField("jangka_simpan")} options={JANGKA_SIMPAN_OPTIONS} />
      ) : (
        <span style={{ color: "var(--av-accent)", fontWeight: 500 }}>{text}</span>
      ),
    },
    {
      title: "Metode Perlindungan",
      dataIndex: "metode_perlindungan",
      key: "metode_perlindungan",
      width: 150,
      render: (text, record) => isEditing(record.key) ? (
        <InlineSelect value={draft.metode_perlindungan} onChange={setField("metode_perlindungan")} options={METODE_PERLINDUNGAN_OPTIONS} />
      ) : (
        <span className="av-badge av-badge--amber">
          <SafetyCertificateOutlined style={{ marginRight: 6 }} />
          {text}
        </span>
      ),
    },
    {
      title: "Lokasi Simpan",
      dataIndex: "lokasi_simpan",
      key: "lokasi_simpan",
      render: (text, record) => isEditing(record.key) ? (
        <InlineInput value={draft.lokasi_simpan} onChange={setField("lokasi_simpan")} placeholder="Lokasi..." />
      ) : (
        <span style={{ fontSize: "13px" }}>
          <EnvironmentOutlined style={{ marginRight: 6, color: "#ef4444" }} />
          {text}
        </span>
      ),
    },
    {
      title: "Aksi",
      key: "actions",
      width: 80,
      fixed: "right",
      align: "center",
      render: (_, record) => {
          if (isEditing(record.key)) {
            return (
              <Space size={4}>
                <Tooltip title="Simpan">
                  <button className="av-btn-save" onClick={saveRow} disabled={savingKey === record.key}>
                    {savingKey === record.key ? "…" : <CheckOutlined />}
                  </button>
                </Tooltip>
                <Tooltip title="Batal">
                  <button className="av-btn-cancel" onClick={cancelEdit}>
                    <CloseOutlined />
                  </button>
                </Tooltip>
              </Space>
            );
          }

          const canManage = userRole === 'uk' || (userRole === 'up' && record.archive_unit_id === userUnitId);
          if (!canManage) return <Tag>Read Only</Tag>;
          
          const items = [
            {
              key: "edit",
              label: "Edit",
              icon: <EditOutlined />,
              onClick: () => startEdit(record),
              disabled: !!editingKey,
            },
            {
              key: "delete",
              label: <span style={{ color: "#ff4d4f" }}>Hapus</span>,
              icon: <DeleteOutlined style={{ color: "#ff4d4f" }} />,
              onClick: () => {
                Modal.confirm({
                  title: "Hapus data ini?",
                  content: "Apakah Anda yakin ingin menghapus data arsip vital ini?",
                  okText: "Ya",
                  cancelText: "Batal",
                  okButtonProps: { danger: true },
                  onOk: () => handleDelete(record.id),
                });
              },
              disabled: !!editingKey,
            },
          ];

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
    <div className="av-page">
      <div className="av-header">
        <div className="av-header__title">
          <button className="av-back-btn" onClick={() => navigate("/app/dashboard")} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--av-muted)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <ArrowLeftOutlined /> Kembali ke Dashboard
          </button>
          <h1>Pencatatan Arsip Vital</h1>
          <p>Kelola dan amankan dokumen vital organisasi secara terstruktur.</p>
        </div>
      </div>

      <div className="av-toolbar">
        <div className="av-toolbar__filters">
            <Input
            className="av-search"
            placeholder="Cari jenis arsip, kurun waktu, atau lokasi..."
            prefix={<SearchOutlined style={{ color: "var(--av-muted)" }} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            disabled={!!editingKey}
            />
            
            {userRole === "uk" && (
            <Select
                className="av-unit-select"
                value={selectedUnitId}
                onChange={(val) => { cancelEdit(); setSelectedUnitId(val); }}
                placeholder="Filter Unit Kerja"
                disabled={!!editingKey}
            >
                <Option value="all">Semua Unit (Mode Lihat)</Option>
                <Option value="uk">Unit Kearsipan</Option>
                {units.map((u) => (
                <Option key={u.id} value={u.id}>
                    {u.nama}
                </Option>
                ))}
            </Select>
            )}
        </div>

        <div className="av-toolbar__actions">
            <button
                className="av-export-btn"
                onClick={handleExportPdf}
                disabled={exporting || loading || !!editingKey}
            >
                <FilePdfOutlined style={{ color: '#ef4444' }} />
                {exporting ? 'Mengekspor...' : 'Cetak Laporan PDF'}
            </button>

            { (userRole === "uk" || userRole === "up") && (
                <button className="av-add-btn" onClick={startNew} disabled={!!editingKey || selectedUnitId === "all"}>
                    <PlusOutlined /> Tambah Data Arsip
                </button>
            )}
        </div>
      </div>

      <div className="av-card">
        <Table
          className="av-table"
          dataSource={tableData}
          columns={columns}
          loading={loading}
          rowKey="key"
          scroll={{ x: 1500 }}
          pagination={editingKey === "__new__" ? false : { pageSize: 15, showSizeChanger: false }}
          locale={{
            emptyText: (
              <div className="av-empty">
                <InboxOutlined className="av-empty-icon" />
                <p>Belum ada data arsip vital yang tercatat.</p>
              </div>
            ),
          }}
        />
      </div>
    </div>
  );
};

export default KearsipanArsipVital;
