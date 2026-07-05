import { useEffect, useMemo, useRef, useState } from "react";
import {
  App as AntdApp,
  DatePicker,
  Form,
  Input,
  Modal,
  Drawer,
  Result,
  Empty,
  Badge,
  Typography,
  Button,
  Select,
  Pagination,
} from "antd";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  CheckOutlined,
  EnvironmentOutlined,
  ExclamationCircleOutlined,
  FundOutlined,
  InfoCircleOutlined,
  SearchOutlined,
  SendOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  BankOutlined,
} from "@ant-design/icons";
import { buildMessageAdapter } from "../utils/notify.js";
import { useAuth } from "../hooks/useAuth.js";
import "./PublicInventoryRequestPageModern.css"; // Reusing the identical CSS wrapper!

dayjs.extend(isBetween);

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// BMN Module Colors (from Layanan Mandiri)
const BMN_COLORS = {
  primary: "#10b981",
  gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  shadowColor: "rgba(16, 185, 129, 0.4)",
};

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

// Helper: Format string to Title Case
const toTitleCase = (str) => {
  if (!str) return "";
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(),
  );
};

/* ═══════════════════════════════════════════════ */
const PublicAssetLoanPage = () => {
  const { user } = useAuth();
  const { message, modal } = AntdApp.useApp();
  const msg = buildMessageAdapter(message);
  const [form] = Form.useForm();
  const [password, setPassword] = useState("");

  const [employees, setEmployees] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loans, setLoans] = useState([]);
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);
  const [picked, setPicked] = useState([]);
  const [search, setSearch] = useState("");

  // UI States (Fluid Drawer + Modals)
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [sigOpen, setSigOpen] = useState(false);
  const [pageSize, setPageSize] = useState(12); // Default to showing only 12 assets as requested
  const [currentPage, setCurrentPage] = useState(1);

  const range = Form.useWatch("periode", form);
  const lokasi = Form.useWatch("lokasi", form);

  const assetMap = useMemo(
    () => new Map(assets.map((a) => [a.id, a])),
    [assets],
  );

  /* ── fetch ── */
  useEffect(() => {
    (async () => {
      try {
        const [e, a, l] = await Promise.all([
          svc.get("/public/bmn-employees"),
          svc.get("/public/bmn-assets"),
          svc.get("/public/bmn-loans/schedule"),
        ]);
        setEmployees(e);
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

  /* ── auto fill user ── */
  // We mirror the exact same robust activeUser logic from the inventory rewrite
  useEffect(() => {
    if (user && form) {
      const activeUser = {
        nip: user.nip || user.username || user.email,
        name: user.name,
        position: user?.employee?.position || user.role || "Staf",
        work_unit: user?.employee?.work_unit || "Default Unit",
      };
      form.setFieldsValue({
        nip: activeUser.nip,
        nama: activeUser.name,
        fungsiBidang: activeUser.work_unit,
      });
    }
  }, [user, form]);

  /* ── filter unavailables out if date changes ── */
  useEffect(() => {
    if (range?.length === 2) {
      setPicked((p) => p.filter((id) => canPick(id)));
    }
  }, [range, loans]); // loans added just in case

  /* ── helpers ── */
  const conflict = (id) => {
    if (!range || range.length !== 2) return null;
    return loans.find(
      (l) =>
        (l.assets ?? []).some((a) => a.asset_id === id) &&
        ["pengajuan", "dipinjam"].includes(l.status) &&
        overlap(range[0], range[1], l.loan_date, l.return_date),
    );
  };
  const canPick = (id) => {
    const a = assetMap.get(id);
    if (!a) return false;
    const isMaintenance = ["rusak", "hilang", "maintenance", "perbaikan"].includes(a.status);
    return !isMaintenance && !conflict(id);
  };

  const assetBorrowCounts = useMemo(() => {
    const counts = {};
    try {
      const oneMonthAgo = dayjs().subtract(1, "month");

      (loans || []).forEach((loan) => {
        // Ensure loan_date exists and is valid before comparing
        if (loan && loan.loan_date && dayjs(loan.loan_date).isAfter(oneMonthAgo)) {
          (loan.assets ?? []).forEach((item) => {
            const id = item.asset_id;
            if (id) counts[id] = (counts[id] || 0) + 1;
          });
        }
      });
    } catch (e) {
      console.error("Error calculating borrow counts:", e);
    }
    return counts;
  }, [loans]);

  const filtered = useMemo(() => {
    const t = search.toLowerCase();
    const list = assets.filter(
      (a) =>
        !t ||
        a.nama_barang.toLowerCase().includes(t) ||
        a.kode_bmn?.toLowerCase().includes(t) ||
        a.nup?.includes(t),
    );

    // Sort by borrow frequency (popularity) descending
    return list.sort((a, b) => {
      const countA = assetBorrowCounts[a.id] || 0;
      const countB = assetBorrowCounts[b.id] || 0;
      if (countB !== countA) return countB - countA;
      // Fallback to alphabet if counts are same, with safety check
      const nameA = a.nama_barang || "";
      const nameB = b.nama_barang || "";
      return nameA.localeCompare(nameB);
    });
  }, [assets, search, assetBorrowCounts]);

  // Reset page when search or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, pageSize]);

  /* ── handlers ── */
  const handleCheckoutClick = async () => {
    try {
      await form.validateFields();
      if (picked.length === 0) {
        message.warning("Troli peminjaman masih kosong.");
        return;
      }
      setCartDrawerOpen(false);
      setSigOpen(true);
    } catch (error) {
      message.error(
        "Pastikan form Jadwal & Lokasi telah terisi lengkap sebelum lanjut bayar.",
      );
      setCartDrawerOpen(false); // Let them fix Left Panel errors
    }
  };

  const submitLoan = async () => {
    try {
      setSubmitting(true);
      const v = form.getFieldsValue(true);
      
      if (!password) {
        msg.error({
          message: "Password SIPTU wajib diisi untuk verifikasi TTE.",
        });
        setSubmitting(false);
        return;
      }

      const payload = {
        nip: v.nip,
        nama: v.nama,
        fungsi_bidang: v.fungsiBidang ?? "",
        loan_date: v.periode[0].format("YYYY-MM-DD"),
        return_date: v.periode[1].format("YYYY-MM-DD"),
        location: v.lokasi === "lainnya" ? v.lokasiLainnya : v.lokasi,
        notes: v.alasan,
        password: password,
        assets: picked.map((id) => {
          const a = assetMap.get(id);
          return {
            asset_id: id,
            nama_barang: a.nama_barang,
            merek_barang: a.merek_barang,
            nup: a.nup,
            kode_bmn: a.kode_bmn,
          };
        }),
      };

      const res = await svc.post("/public/bmn-loans", payload);
      setDone({ ...payload, resultInfo: res });

      // Reset Workspace
      setSigOpen(false);
      setCartDrawerOpen(false);
      setPicked([]);
      form.resetFields();
    } catch (e) {
      msg.error({ message: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  /* ── guards ── */
  if (!user) {
    return (
      <div style={{ padding: "100px 20px", textAlign: "center" }}>
        <Result
          status="403"
          title="Akses Ditolak"
          subTitle="Halaman peminjaman aset ini hanya dapat diakses oleh pegawai yang sudah masuk (Login) ke sistem."
          extra={
            <Button type="primary" size="large" href="/login">
              Menuju Halaman Login
            </Button>
          }
        />
      </div>
    );
  }

  if (done) {
    return (
      <div
        style={{
          padding: "60px 20px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            maxWidth: 600,
            width: "100%",
            background: "#fff",
            padding: 40,
            borderRadius: 16,
            border: "1px solid #e2e8f0",
            boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: BMN_COLORS.gradient,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              boxShadow: `0 8px 20px ${BMN_COLORS.shadowColor}`,
            }}
          >
            <FundOutlined style={{ fontSize: 40, color: "#fff" }} />
          </div>
          <Title level={2} style={{ marginBottom: 8, color: "#0f172a" }}>
            Peminjaman Aset Diajukan
          </Title>
          <Text
            style={{
              fontSize: 16,
              color: "#64748b",
              display: "block",
              marginBottom: 32,
            }}
          >
            Surat Peminjaman Aset (SPA) Anda dengan referensi{" "}
            <strong>{done?.resultInfo?.spa_number ?? "-"}</strong> telah kami
            terima.
          </Text>
          <div
            style={{
              background: "#f8fafc",
              padding: "16px 24px",
              borderRadius: 12,
              textAlign: "left",
              marginBottom: 32,
            }}
          >
            <div style={{ marginBottom: 8 }}>
              <Text strong>Nama Pemohon:</Text> {done.nama}
            </div>
            <div style={{ marginBottom: 8 }}>
              <Text strong>Jadwal:</Text> {done.loan_date} s/d{" "}
              {done.return_date}
            </div>
            <div style={{ marginBottom: 8 }}>
              <Text strong>Lokasi Penggunaan:</Text> {done.location}
            </div>
            <div>
              <Text strong>Troli:</Text> {done.assets?.length} aset diajukan.
            </div>
          </div>
          <Button
            type="primary"
            size="large"
            onClick={() => window.location.reload()}
            style={{
              background: BMN_COLORS.gradient,
              borderColor: BMN_COLORS.primary,
            }}
          >
            Ajukan Peminjaman Lainnya
          </Button>
        </div>
      </div>
    );
  }

  /* ═══════════════  RENDER  ═══════════════ */
  return (
    <div className="fluid-ws">
      {/* ── Top Header Bar ── */}
      <header className="fluid-ws__header">
        <div className="fluid-ws__brand">
          <a href="/app/layanan-mandiri" className="fluid-ws__back-btn">
            <ArrowLeftOutlined /> <span>Kembali</span>
          </a>
          <div
            className="fluid-ws__brand-icon"
            style={{
              background: BMN_COLORS.gradient,
              boxShadow: `0 4px 12px ${BMN_COLORS.shadowColor}`,
            }}
          >
            <FundOutlined style={{ color: "#fff" }} />
          </div>
          <span style={{ fontWeight: 700 }}>Peminjaman BMN</span>
        </div>

        <div className="fluid-ws__header-actions">
          <button
            className="fluid-ws__cart-trigger"
            onClick={() => setCartDrawerOpen(true)}
          >
            <ShoppingCartOutlined style={{ fontSize: "1.4rem" }} />
            <span className="fluid-ws__cart-text">Troli</span>
            {picked.length > 0 && (
              <span className="fluid-ws__cart-badge">{picked.length}</span>
            )}
          </button>
        </div>
      </header>

      {/* ── Split Workspace ── */}
      <main className="fluid-ws__layout">
        {/* Left Panel: Form */}
        <div className="fluid-ws__panel-left">
          <div className="fluid-ws__panel-left-content">
            <h2 className="fluid-ws__panel-title">Data Pengajuan</h2>
            <p className="fluid-ws__panel-desc">
              Atur kerangka waktu dan tujuan peminjaman aset BMN. Pilih aset
              dari panel sisi kanan jika periode sudah valid.
            </p>

            {user && (
              <div className="fluid-ws__active-user">
                <div className="fluid-ws__active-user-avatar">
                  <UserOutlined />
                </div>
                <div>
                  <div className="fluid-ws__active-user-name">{user.name}</div>
                  <div className="fluid-ws__active-user-pos">
                    {user.nip || "-"}
                  </div>
                </div>
              </div>
            )}

            {/* Note: In fluid workspace, required validation triggers naturally when checking out */}
            <Form form={form} layout="vertical" requiredMark="optional">
              <div
                style={{
                  background: "#f8fafc",
                  padding: 16,
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#0f172a",
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <CalendarOutlined style={{ color: "#f59e0b" }} /> Periode Sewa
                  / Pinjam
                </div>
                <Form.Item
                  name="periode"
                  rules={[
                    { required: true, message: "Periode wajib dipilih." },
                  ]}
                  style={{ marginBottom: 16 }}
                >
                  <DatePicker.RangePicker
                    format="DD MMM YYYY"
                    size="large"
                    style={{ width: "100%" }}
                    placeholder={["Mulai", "Selesai"]}
                    placement="bottomLeft"
                    allowClear
                  />
                </Form.Item>
                <Form.Item
                  name="alasan"
                  rules={[{ required: true, message: "Wajib diisi." }]}
                  style={{ marginBottom: 0 }}
                >
                  <TextArea
                    rows={3}
                    placeholder="Instruksi / Agenda kegiatan (Contoh: Rapat Dengar Pendapat)..."
                  />
                </Form.Item>
              </div>

              <div
                style={{
                  background: "#f8fafc",
                  padding: 16,
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#0f172a",
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <EnvironmentOutlined style={{ color: "#10b981" }} /> Lokasi
                  Penempatan
                </div>
                <Form.Item
                  name="lokasi"
                  rules={[{ required: true, message: "Lokasi wajib dipilih." }]}
                  style={{ marginBottom: 0 }}
                  hidden
                >
                  <Input />
                </Form.Item>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {LOCATIONS.map((loc) => (
                    <div
                      key={loc}
                      onClick={() => form.setFieldsValue({ lokasi: loc })}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 20,
                        fontSize: 12,
                        cursor: "pointer",
                        border: "1px solid",
                        transition: "all 0.2s",
                        fontWeight: 500,
                        borderColor: lokasi === loc ? "#3b82f6" : "#cbd5e1",
                        background: lokasi === loc ? "#eff6ff" : "#fff",
                        color: lokasi === loc ? "#2563eb" : "#64748b",
                      }}
                    >
                      {loc}
                    </div>
                  ))}
                  <div
                    onClick={() => form.setFieldsValue({ lokasi: "lainnya" })}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 20,
                      fontSize: 12,
                      cursor: "pointer",
                      border: "1px solid",
                      transition: "all 0.2s",
                      fontWeight: 500,
                      borderColor: lokasi === "lainnya" ? "#3b82f6" : "#cbd5e1",
                      background: lokasi === "lainnya" ? "#eff6ff" : "#fff",
                      color: lokasi === "lainnya" ? "#2563eb" : "#64748b",
                    }}
                  >
                    Lainnya
                  </div>
                </div>

                {lokasi === "lainnya" && (
                  <Form.Item
                    name="lokasiLainnya"
                    style={{ marginTop: 12, marginBottom: 0 }}
                    rules={[{ required: true, message: "Wajib diisi." }]}
                  >
                    <Input
                      placeholder="Isi detail nama lokasi penempatan..."
                      size="large"
                    />
                  </Form.Item>
                )}
              </div>

              {/* Hidden Fields for payload */}
              <Form.Item name="nip" hidden>
                <Input />
              </Form.Item>
              <Form.Item name="nama" hidden>
                <Input />
              </Form.Item>
              <Form.Item name="fungsiBidang" hidden>
                <Input />
              </Form.Item>
            </Form>
          </div>
        </div>

        {/* Right Panel: Catalog */}
        <div className="fluid-ws__panel-right">
          <div className="fluid-ws__catalog-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
            <div
              className="fluid-ws__search-wrapper"
              style={{ display: "flex", gap: 8, alignItems: "center", maxWidth: '100%', flexWrap: 'wrap' }}
            >
              <Input
                prefix={
                  <SearchOutlined
                    style={{
                      color: "#94a3b8",
                      fontSize: "1.2rem",
                      marginRight: 8,
                    }}
                  />
                }
                placeholder="Cari aset..."
                size="large"
                onChange={(e) => setSearch(e.target.value)}
                allowClear
                style={{ flex: 1, minWidth: 250 }}
              />
              <Select
                value={pageSize}
                onChange={setPageSize}
                size="large"
                style={{ width: 130, flexShrink: 0 }}
                options={[
                  { value: 12, label: "Tampil 12" },
                  { value: 24, label: "Tampil 24" },
                  { value: 48, label: "Tampil 48" },
                  { value: 9999, label: "Semua" },
                ]}
              />
            </div>

            {!range || range.length !== 2 ? (
              <div
                style={{
                  padding: "10px 16px",
                  background: "#fffbeb",
                  color: "#b45309",
                  borderRadius: 8,
                  fontSize: 13,
                  border: "1px solid #fde68a",
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <InfoCircleOutlined /> Harap atur periode sewa/pinjam di bilah
                kiri terlebih dahulu untuk melihat ketersediaan aset yang valid.
              </div>
            ) : null}
          </div>

          <div className="fluid-ws__catalog-scroll">
            {!ready ? (
              <div className="fluid-ws__skeleton-grid">
                {[...Array(pageSize === 9999 ? 12 : pageSize)].map((_, i) => (
                  <div key={i} className="fluid-ws__skeleton-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div className="fluid-ws__shimmer fluid-ws__skeleton-icon"></div>
                      <div className="fluid-ws__shimmer" style={{ width: 60, height: 20, borderRadius: 10 }}></div>
                    </div>
                    <div className="fluid-ws__shimmer fluid-ws__skeleton-title"></div>
                    <div className="fluid-ws__shimmer fluid-ws__skeleton-text"></div>
                    <div className="fluid-ws__shimmer fluid-ws__skeleton-btn"></div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Empty
                  description={
                    <span style={{ color: "#64748b" }}>
                      Aset tidak ditemukan
                    </span>
                  }
                />
              </div>
            ) : (
              <>
                <div className="fluid-ws__grid fluid-ws__grid--compact">
                  {filtered
                    .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                    .map((asset) => {
                      const sel = picked.includes(asset.id);
                      const ok = canPick(asset.id);

                      return (
                        <div
                          key={asset.id}
                          className={`fluid-ws__card ${sel ? "fluid-ws__card--active" : ""} ${!ok ? "fluid-ws__card--disabled" : ""}`}
                        >
                          <div className="fluid-ws__card-top">
                            <div
                              className="fluid-ws__card-icon"
                              style={{
                                background: sel
                                  ? BMN_COLORS.gradient
                                  : "#f1f5f9",
                                color: sel ? "#fff" : "#94a3b8",
                                boxShadow: sel
                                  ? `0 4px 12px ${BMN_COLORS.shadowColor}`
                                  : "none",
                              }}
                            >
                              <FundOutlined
                                style={{ color: sel ? "#fff" : "#94a3b8" }}
                              />
                            </div>
                            <div className="fluid-ws__card-stock">
                              {!ok ? (
                                conflict(asset.id) ? (
                                  <Badge status="error" text="Bentrok" />
                                ) : (
                                  <Badge status="warning" text={toTitleCase(asset.status)} />
                                )
                              ) : (
                                <Badge status="success" text="Tersedia" />
                              )}
                            </div>
                          </div>

                          <div
                            className="fluid-ws__card-title"
                            title={asset.nama_barang}
                          >
                            {toTitleCase(asset.nama_barang)}
                          </div>

                          <div
                            style={{
                              fontSize: 12,
                              color: "#64748b",
                              marginTop: 8,
                            }}
                          >
                            <span
                              style={{
                                fontFamily: "monospace",
                                fontWeight: 600,
                              }}
                            >
                              {asset.kode_bmn || "-"}
                            </span>{" "}
                            <br />
                            NUP: {asset.nup || "-"} <br />
                            Merk: {toTitleCase(asset.merek_barang || "-")}
                          </div>

                          <div
                            className="fluid-ws__card-actions"
                            style={{ marginTop: 16 }}
                          >
                            <button
                              className={`fluid-ws__add-btn ${sel ? "fluid-ws__add-btn--active" : ""}`}
                              onClick={() => {
                                if (!ok) return;
                                setPicked((p) =>
                                  p.includes(asset.id)
                                    ? p.filter((x) => x !== asset.id)
                                    : [...p, asset.id],
                                );
                              }}
                              disabled={!ok}
                              style={{
                                background: sel
                                  ? "#eff6ff"
                                  : ok
                                    ? "#1e293b"
                                    : "#e2e8f0",
                                color: sel
                                  ? "#2563eb"
                                  : ok
                                    ? "#fff"
                                    : "#94a3b8",
                                width: "100%",
                                cursor: ok ? "pointer" : "not-allowed",
                              }}
                            >
                              {sel ? (
                                <CheckOutlined />
                              ) : ok ? (
                                "Pilih Aset"
                              ) : conflict(asset.id) ? (
                                "Bentrok"
                              ) : (
                                "Tidak Tersedia"
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Pagination Controls */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    marginTop: 32,
                    paddingBottom: 16,
                  }}
                >
                  <Pagination
                    current={currentPage}
                    pageSize={pageSize}
                    total={filtered.length}
                    onChange={(page) => setCurrentPage(page)}
                    showSizeChanger={false} // Size is managed by our custom selector in the header
                    showTotal={(total, range) =>
                      `${range[0]}-${range[1]} dari ${total} aset`
                    }
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* ── Slide-Out Cart Drawer ── */}
      <Drawer
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <BankOutlined style={{ color: "#3b82f6" }} />
            Troli Peminjaman
          </div>
        }
        placement="right"
        width={450}
        onClose={() => setCartDrawerOpen(false)}
        open={cartDrawerOpen}
        className="fluid-ws__drawer"
        footer={
          <button
            className="fluid-ws__checkout-btn"
            onClick={handleCheckoutClick}
            disabled={picked.length === 0}
          >
            Lanjut Tanda Tangan & Kirim{" "}
            <ArrowRightOutlined style={{ marginLeft: 8 }} />
          </button>
        }
      >
        {picked.length === 0 ? (
          <div className="fluid-cart__empty">
            <BankOutlined className="fluid-cart__empty-icon" />
            <h3>Troli Masih Kosong</h3>
            <p>
              Silakan pilih aset BMN dari katalog di sebelah kanan yang
              berstatus tersedia.
            </p>
          </div>
        ) : (
          <div className="fluid-cart__items">
            {picked.map((id) => {
              const item = assetMap.get(id);
              if (!item) return null;
              return (
                <div
                  key={item.id}
                  className="fluid-cart__item"
                  style={{ display: "flex", flexDirection: "column" }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      width: "100%",
                    }}
                  >
                    <div className="fluid-cart__item-title">
                      {toTitleCase(item.nama_barang)}
                    </div>
                    <div className="fluid-cart__item-price">
                      <button
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "#ef4444",
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                        onClick={() =>
                          setPicked((p) => p.filter((x) => x !== item.id))
                        }
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#64748b",
                      marginTop: 4,
                      fontFamily: "monospace",
                    }}
                  >
                    {item.kode_bmn} — {item.nup}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {picked.length > 0 && (
          <div className="fluid-cart__summary" style={{ marginTop: 24 }}>
            <div className="fluid-cart__summary-row">
              <span className="fluid-cart__summary-label">
                Total Aset Diajukan
              </span>
              <span className="fluid-cart__summary-value">
                {picked.length} Aset BMN
              </span>
            </div>
            {range && range.length === 2 && (
              <div className="fluid-cart__summary-row">
                <span className="fluid-cart__summary-label">
                  Durasi Peminjaman
                </span>
                <span
                  className="fluid-cart__summary-value"
                  style={{ color: "#f59e0b" }}
                >
                  {range[1].diff(range[0], "day") + 1} Hari
                </span>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* ── Signature Modal ── */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FundOutlined style={{ color: "#10b981" }} />
            Otorisasi Permintaan
          </div>
        }
        open={sigOpen}
        onCancel={() => setSigOpen(false)}
        footer={null}
        destroyOnClose
        centered
        className="fluid-ws__sig-modal"
      >
        <p style={{ color: "#475569", marginBottom: 20 }}>
          Sistem menggunakan Tanda Tangan Elektronik (TTE) berbasis QR Code. 
          Silakan masukkan <strong>Password SIPTU</strong> Anda (<strong>{user?.name || "-"}</strong>) 
          sebagai bentuk otorisasi penandatanganan pengajuan ini.
        </p>

        <div style={{ marginBottom: 20 }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>Password SIPTU</Text>
          <Input.Password 
            size="large" 
            placeholder="Masukkan password login SIPTU Anda..." 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onPressEnter={submitLoan}
            prefix={<BankOutlined style={{ color: '#94a3b8' }} />}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            marginTop: 24,
          }}
        >
          <Button size="large" onClick={() => setSigOpen(false)}>
            Batal
          </Button>
          <Button
            size="large"
            type="primary"
            icon={<SendOutlined />}
            loading={submitting}
            onClick={submitLoan}
            style={{ borderRadius: 8, padding: "0 24px" }}
          >
            Kirim Pengajuan
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default PublicAssetLoanPage;
