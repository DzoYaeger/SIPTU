import { useEffect, useMemo, useState } from "react";
import {
  App as AntdApp,
  DatePicker,
  Form,
  Input,
  Modal,
  Badge,
  Typography,
  Button,
  Select,
  Tag,
  Space,
  Tooltip,
  Radio,
  Spin,
  Empty,
} from "antd";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  EnvironmentOutlined,
  InfoCircleOutlined,
  SearchOutlined,
  SendOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  PlusOutlined,
  CheckOutlined,
  CarOutlined,
  DesktopOutlined,
  ToolOutlined,
  AppstoreOutlined,
  LockOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { buildMessageAdapter } from "../utils/notify.js";
import { useAuth } from "../hooks/useAuth.js";
import "./PublicInventoryRequestPageModern.css";

dayjs.extend(isBetween);

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

/* ─── Service ─── */
const svc = {
  get: async (url) => {
    const r = await fetch(`${API}${url}`);
    if (!r.ok) throw new Error("Gagal memuat data.");
    return r.json();
  },
  post: async (url, body) => {
    const r = await fetch(`${API}${url}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.message || "Gagal mengirim.");
    return d;
  },
};

const LOCATIONS = [
  "Kota Palopo",
  "Kabupaten Luwu",
  "Kabupaten Luwu Utara",
  "Kabupaten Luwu Timur",
  "Kabupaten Tana Toraja",
  "Kabupaten Toraja Utara",
  "Kabupaten Enrekang",
];

const overlap = (s1, e1, s2, e2) => {
  if (!s1 || !e1 || !s2 || !e2) return false;
  return (
    dayjs(s1).isBetween(s2, e2, null, "[]") ||
    dayjs(e1).isBetween(s2, e2, null, "[]") ||
    dayjs(s2).isBetween(s1, e1, null, "[]") ||
    dayjs(e2).isBetween(s1, e1, null, "[]")
  );
};

const PublicAssetLoanPage = ({ isEmbedded = false }) => {
  const { user, markMfaSessionActive } = useAuth();
  const { message } = AntdApp.useApp();
  const msg = buildMessageAdapter(message);
  const [form] = Form.useForm();
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");

  const [assets, setAssets] = useState([]);
  const [loans, setLoans] = useState([]);
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);

  // Active Date Filter (Defaults to today -> tomorrow)
  const [dateRange, setDateRange] = useState([dayjs(), dayjs().add(1, "day")]);

  // Selected Assets (IDs array)
  const [picked, setPicked] = useState([]);

  // Search & Category Filter
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("all");

  // Modal State for Final Checkout
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  // Watch form fields at top level (Rules of Hooks)
  const lokasi = Form.useWatch("lokasi", form);

  /* ── Fetch Data ── */
  useEffect(() => {
    (async () => {
      try {
        const [a, l] = await Promise.all([
          svc.get("/public/bmn-assets"),
          svc.get("/public/bmn-loans/schedule"),
        ]);
        setAssets(
          a.map((x) => ({
            id: x.id,
            nama_barang: x.name || "",
            merek_barang: x.brand || "",
            nup: x.model || "",
            kode_bmn: x.asset_code || "",
            status: x.status || "tersedia",
          })),
        );
        setLoans(l);
      } catch (err) {
        msg.error({ message: err.message });
      } finally {
        setReady(true);
      }
    })();
  }, []);

  /* ── Auto Fill User ── */
  useEffect(() => {
    if (user && form) {
      const activeUser = {
        nip: user.nip || user.username || user.email,
        name: user.name,
        position: user?.employee?.position || user.role || "Staf",
        work_unit: user?.employee?.work_unit || "Balai POM di Palopo",
      };
      form.setFieldsValue({
        nip: activeUser.nip,
        nama: activeUser.name,
        fungsiBidang: activeUser.work_unit,
      });
    }
  }, [user, form]);

  const assetMap = useMemo(
    () => new Map(assets.map((a) => [a.id, a])),
    [assets],
  );

  /* ── Real-Time Conflict Checking ── */
  const getAssetConflict = (id) => {
    if (!dateRange || dateRange.length !== 2) return null;
    return loans.find(
      (l) =>
        (l.assets ?? []).some((a) => Number(a.asset_id ?? a.id) === Number(id)) &&
        ["pengajuan", "dipinjam", "pengajuan-pengembalian"].includes(l.status) &&
        overlap(dateRange[0], dateRange[1], l.loan_date, l.return_date),
    );
  };

  const isAssetAvailable = (id) => {
    const a = assetMap.get(id);
    if (!a) return false;
    const statusLower = (a.status || "").toLowerCase();
    const isPermanentlyUnavailable = [
      "rusak",
      "hilang",
      "maintenance",
      "perbaikan",
      "rusak berat",
    ].includes(statusLower);
    return !isPermanentlyUnavailable && !getAssetConflict(id);
  };

  // Remove invalid items when dates change
  useEffect(() => {
    if (dateRange?.length === 2) {
      setPicked((prev) => prev.filter((id) => isAssetAvailable(id)));
    }
  }, [dateRange, loans]);

  /* ── Categorization Helper ── */
  const getCategory = (asset) => {
    const name = (asset.nama_barang || "").toLowerCase();
    if (name.includes("mobil") || name.includes("motor") || name.includes("kendaraan") || name.includes("terios")) return "kendaraan";
    if (name.includes("laptop") || name.includes("komputer") || name.includes("printer") || name.includes("camera") || name.includes("proyektor") || name.includes("infocus") || name.includes("sound") || name.includes("mic") || name.includes("lcd")) return "it";
    return "kantor";
  };

  /* ── Filtering Assets ── */
  const filteredAssets = useMemo(() => {
    const t = search.toLowerCase();
    return assets.filter((a) => {
      const matchSearch =
        !t ||
        a.nama_barang.toLowerCase().includes(t) ||
        a.kode_bmn?.toLowerCase().includes(t) ||
        a.nup?.includes(t) ||
        a.merek_barang?.toLowerCase().includes(t);

      const matchCat =
        selectedCat === "all" || getCategory(a) === selectedCat;

      return matchSearch && matchCat;
    });
  }, [assets, search, selectedCat]);

  /* ── Toggle Asset Selection ── */
  const togglePick = (id) => {
    if (!isAssetAvailable(id)) return;
    if (picked.includes(id)) {
      setPicked((prev) => prev.filter((x) => x !== id));
    } else {
      setPicked((prev) => [...prev, id]);
    }
  };

  /* ── Form Submission ── */
  const submitLoan = async () => {
    try {
      setSubmitting(true);
      await form.validateFields();

      if (!password) {
        msg.error({ message: "Password SIPTU wajib diisi untuk verifikasi." });
        setSubmitting(false);
        return;
      }

      const values = form.getFieldsValue(true);
      const chosenLocation =
        values.lokasi === "lainnya" ? values.lokasiLainnya : values.lokasi;

      const payload = {
        nip: values.nip || user?.nip || user?.username,
        nama: values.nama || user?.name,
        fungsi_bidang: values.fungsiBidang || user?.employee?.work_unit || "Staf",
        loan_date: dateRange[0].format("YYYY-MM-DD"),
        return_date: dateRange[1].format("YYYY-MM-DD"),
        location: chosenLocation,
        notes: values.alasan,
        password: password,
        totp_code: totpCode,
        assets: picked.map((id) => {
          const a = assetMap.get(id);
          return {
            asset_id: a.id,
            nama_barang: a.nama_barang,
            merek_barang: a.merek_barang,
            nup: a.nup,
            kode_bmn: a.kode_bmn,
          };
        }),
      };

      const res = await svc.post("/public/bmn-loans", payload);
      if (totpCode) {
        markMfaSessionActive?.();
      }
      setDone(res);
      setConfirmModalOpen(false);
      msg.success({ message: "Pengajuan peminjaman BMN berhasil dibuat!" });
    } catch (err) {
      msg.error({ message: err.message || "Gagal membuat pengajuan." });
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Done View ── */
  if (done) {
    return (
      <div style={{ padding: 24, maxWidth: 600, margin: "40px auto", textAlign: "center" }}>
        <div
          style={{
            background: "#ffffff",
            padding: 32,
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
          }}
        >
          <CheckCircleFilled style={{ fontSize: 52, color: "#10b981", marginBottom: 16 }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px 0", color: "#1a1f2e" }}>
            Pengajuan Berhasil Dikirim!
          </h2>
          <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 20px 0" }}>
            Nomor SPA Anda: <strong>{done.spa_number}</strong>
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
            <Button
              type="primary"
              onClick={() => window.open(`/peminjaman-aset/track/${done.token}`, "_blank")}
              style={{ borderRadius: 6 }}
            >
              Lacak Status
            </Button>
            <Button
              onClick={() => {
                setDone(null);
                setPicked([]);
                form.resetFields();
              }}
              style={{ borderRadius: 6 }}
            >
              Buat Pengajuan Baru
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        <Spin size="large" tip="Memuat katalog Aset BMN..." />
      </div>
    );
  }

  return (
    <div className="simba-loan-container">
      {/* ── Top Control Toolbar ── */}
      <div className="simba-loan-toolbar">
        <div className="simba-loan-toolbar__left">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CalendarOutlined style={{ color: "var(--color-primary, #0F5B99)", fontSize: 15 }} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "#1a1f2e" }}>Periode Pinjam:</span>
            <DatePicker.RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates)}
              format="DD MMM YYYY"
              size="middle"
              allowClear={false}
              style={{ borderRadius: 6 }}
            />
          </div>
        </div>

        <div className="simba-loan-toolbar__right">
          <Input
            placeholder="Cari aset / merek / kode BMN..."
            prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 250, borderRadius: 6 }}
            size="middle"
            allowClear
          />
        </div>
      </div>

      {/* ── Category Filter Bar ── */}
      <div className="simba-category-bar">
        <button
          className={`simba-cat-btn ${selectedCat === "all" ? "simba-cat-btn--active" : ""}`}
          onClick={() => setSelectedCat("all")}
        >
          <AppstoreOutlined /> Semua Aset ({assets.length})
        </button>
        <button
          className={`simba-cat-btn ${selectedCat === "kendaraan" ? "simba-cat-btn--active" : ""}`}
          onClick={() => setSelectedCat("kendaraan")}
        >
          <CarOutlined /> Kendaraan Dinas
        </button>
        <button
          className={`simba-cat-btn ${selectedCat === "it" ? "simba-cat-btn--active" : ""}`}
          onClick={() => setSelectedCat("it")}
        >
          <DesktopOutlined /> IT & Multimedia
        </button>
        <button
          className={`simba-cat-btn ${selectedCat === "kantor" ? "simba-cat-btn--active" : ""}`}
          onClick={() => setSelectedCat("kantor")}
        >
          <ToolOutlined /> Peralatan Kantor
        </button>
      </div>

      {/* ── Asset Cards Grid ── */}
      {filteredAssets.length === 0 ? (
        <div style={{ background: "#fff", padding: 40, borderRadius: 10, border: "1px solid #e2e8f0", textAlign: "center" }}>
          <Empty description="Tidak ada aset BMN yang sesuai dengan kriteria pencarian." />
        </div>
      ) : (
        <div className="simba-asset-grid">
          {filteredAssets.map((asset) => {
            const conflict = getAssetConflict(asset.id);
            const isAvailable = isAssetAvailable(asset.id);
            const isSelected = picked.includes(asset.id);
            const cat = getCategory(asset);

            const iconMap = {
              kendaraan: <CarOutlined />,
              it: <DesktopOutlined />,
              kantor: <ToolOutlined />,
            };

            return (
              <div
                key={asset.id}
                className={`simba-asset-card ${isSelected ? "simba-asset-card--selected" : ""}`}
              >
                <div>
                  <div className="simba-asset-card__top">
                    <div className="simba-asset-card__icon">
                      {iconMap[cat] || <ToolOutlined />}
                    </div>
                    <div className="simba-asset-card__info">
                      <h4 className="simba-asset-card__name">{asset.nama_barang}</h4>
                      <div className="simba-asset-card__sub">
                        {asset.merek_barang || "BMN"} {asset.nup ? `• NUP ${asset.nup}` : ""}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="simba-asset-card__bottom">
                  <div>
                    {isAvailable ? (
                      <Tag color="success" style={{ borderRadius: 4, fontWeight: 600, fontSize: 10.5 }}>
                        🟢 Tersedia
                      </Tag>
                    ) : conflict ? (
                      <Tooltip title={`Dipinjam: ${dayjs(conflict.loan_date).format('DD MMM')} - ${dayjs(conflict.return_date).format('DD MMM YYYY')}`}>
                        <Tag color="error" style={{ borderRadius: 4, fontWeight: 600, fontSize: 10.5 }}>
                          🔴 Terisi
                        </Tag>
                      </Tooltip>
                    ) : (
                      <Tag color="default" style={{ borderRadius: 4, fontWeight: 600, fontSize: 10.5 }}>
                        ⚪ Tidak Aktif
                      </Tag>
                    )}
                  </div>

                  <Button
                    size="small"
                    type={isSelected ? "primary" : "default"}
                    disabled={!isAvailable}
                    icon={isSelected ? <CheckOutlined /> : <PlusOutlined />}
                    onClick={() => togglePick(asset.id)}
                    style={{ borderRadius: 6, fontSize: 11.5 }}
                  >
                    {isSelected ? "Terpilih" : "Pilih"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Sticky Bottom Action Bar ── */}
      {picked.length > 0 && (
        <div className="simba-sticky-bar">
          <div className="simba-sticky-bar__left">
            <span className="simba-sticky-bar__count">
              {picked.length} Barang Terpilih
            </span>
            <span className="simba-sticky-bar__info">
              Periode: <strong>{dateRange[0].format("DD MMM YYYY")}</strong> s/d <strong>{dateRange[1].format("DD MMM YYYY")}</strong>
            </span>
          </div>

          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={() => setConfirmModalOpen(true)}
            style={{ borderRadius: 6, fontWeight: 600, backgroundColor: "#0F5B99" }}
          >
            Lanjut Kirim Pengajuan
          </Button>
        </div>
      )}

      {/* ── Modal Konfirmasi Pengajuan (Simpel & Minimalis) ── */}
      <Modal
        title={null}
        open={confirmModalOpen}
        onCancel={() => setConfirmModalOpen(false)}
        footer={null}
        width={560}
        centered
        className="simba-detail-modal"
      >
        <div>
          <div className="simba-detail-header">
            <h3 className="simba-detail-title">
              <SendOutlined style={{ color: "var(--color-primary, #0F5B99)" }} />
              Konfirmasi Pengajuan Peminjaman BMN
            </h3>
            <div className="simba-detail-subtitle">
              Lengkapi lokasi & keperluan kegiatan untuk menyelesaikan pengajuan.
            </div>
          </div>

          <Form form={form} layout="vertical">
            <div className="simba-detail-section">
              <div className="simba-detail-section-title">Barang Terpilih ({picked.length})</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                {picked.map((id) => {
                  const a = assetMap.get(id);
                  return (
                    <Tag
                      key={id}
                      color="blue"
                      closable
                      onClose={() => setPicked((prev) => prev.filter((x) => x !== id))}
                      style={{ borderRadius: 4, padding: "3px 8px", fontSize: 11.5 }}
                    >
                      {a?.nama_barang}
                    </Tag>
                  );
                })}
              </div>

              <div className="simba-detail-grid" style={{ marginBottom: 16 }}>
                <div className="simba-detail-item">
                  <span className="simba-detail-label">Pemohon</span>
                  <span className="simba-detail-value">{user?.name || "-"}</span>
                </div>
                <div className="simba-detail-item">
                  <span className="simba-detail-label">NIP</span>
                  <span className="simba-detail-value">{user?.nip || user?.username || "-"}</span>
                </div>
                <div className="simba-detail-item" style={{ gridColumn: "span 2" }}>
                  <span className="simba-detail-label">Periode Pinjam</span>
                  <span className="simba-detail-value">
                    {dateRange[0].format("DD MMMM YYYY")} s/d {dateRange[1].format("DD MMMM YYYY")}
                  </span>
                </div>
              </div>

              <Form.Item
                name="lokasi"
                label="Lokasi Penempatan"
                rules={[{ required: true, message: "Pilih lokasi penempatan." }]}
                style={{ marginBottom: 12 }}
              >
                <Select
                  placeholder="Pilih Lokasi Penempatan"
                  options={LOCATIONS.map((loc) => ({ label: loc, value: loc })).concat([
                    { label: "Lainnya (Tulis Manual)", value: "lainnya" },
                  ])}
                  style={{ borderRadius: 6 }}
                />
              </Form.Item>

              {lokasi === "lainnya" && (
                <Form.Item
                  name="lokasiLainnya"
                  label="Nama Lokasi Lainnya"
                  rules={[{ required: true, message: "Tuliskan nama lokasi." }]}
                  style={{ marginBottom: 12 }}
                >
                  <Input placeholder="Contoh: Gedung Serbaguna Palopo" style={{ borderRadius: 6 }} />
                </Form.Item>
              )}

              <Form.Item
                name="alasan"
                label="Keperluan / Agenda Kegiatan"
                rules={[{ required: true, message: "Wajib diisi." }]}
                style={{ marginBottom: 16 }}
              >
                <TextArea
                  rows={3}
                  placeholder="Contoh: Kegiatan Operasional Pengawasan Obat & Makanan di Kab. Luwu..."
                  style={{ borderRadius: 6 }}
                />
              </Form.Item>

              <Form.Item
                label="Password SIPTU (Verifikasi TTE)"
                required
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: "#94a3b8" }} />}
                  placeholder="Masukkan password akun SIPTU Anda..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ borderRadius: 6 }}
                />
              </Form.Item>

              <Form.Item
                label={
                  <Space style={{ justifyContent: "space-between", width: "100%" }}>
                    <span>Kode Autentikasi MFA (6 Digit / Recovery Code)</span>
                    {user?.mfa_session_active && (
                      <Tag color="success" style={{ margin: 0, fontSize: 10, borderRadius: 12 }}>
                        ✓ Sesi 20m Aktif
                      </Tag>
                    )}
                  </Space>
                }
                required={!user?.mfa_session_active}
                style={{ marginBottom: 0 }}
              >
                <Input
                  prefix={<LockOutlined style={{ color: "#0b56a4" }} />}
                  placeholder={user?.mfa_session_active ? "Opsional (Sesi MFA Aktif)" : "Contoh: 123456 atau XXXX-XXXX"}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  style={{ borderRadius: 6, fontWeight: 700, letterSpacing: "1px" }}
                />
              </Form.Item>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20, paddingTop: 14, borderTop: "1px solid var(--color-border, #e2e8f0)" }}>
              <Button onClick={() => setConfirmModalOpen(false)} style={{ borderRadius: 6 }}>
                Batal
              </Button>
              <Button
                type="primary"
                loading={submitting}
                onClick={submitLoan}
                style={{ borderRadius: 6, backgroundColor: "#0F5B99" }}
              >
                Kirim Pengajuan
              </Button>
            </div>

            {/* Hidden fields for auth info */}
            <Form.Item name="nip" hidden><Input /></Form.Item>
            <Form.Item name="nama" hidden><Input /></Form.Item>
            <Form.Item name="fungsiBidang" hidden><Input /></Form.Item>
          </Form>
        </div>
      </Modal>
    </div>
  );
};

export default PublicAssetLoanPage;
