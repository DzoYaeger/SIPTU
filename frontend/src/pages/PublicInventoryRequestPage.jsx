import { useRef, useState, useEffect, useMemo } from "react";
import {
  App as AntdApp,
  Button,
  Input,
  Select,
  Typography,
  Avatar,
  Badge,
  Result,
  Empty,
  Drawer,
  Modal,
  Form,
} from "antd";
import {
  ArrowLeftOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  EditOutlined,
  CheckCircleFilled,
  SendOutlined,
  PlusOutlined,
  MinusOutlined,
  ShoppingOutlined,
  CopyOutlined,
  InboxOutlined,
  ArrowRightOutlined,
  GiftOutlined,
  FileTextOutlined,
  PrinterOutlined,
  DesktopOutlined,
  ToolOutlined,
  EditTwoTone,
} from "@ant-design/icons";
import SignatureCanvas from "../components/SignatureCanvas.jsx";
import { bmnService } from "../services/bmnService.js";
import { generateSpbNumber } from "../utils/referenceNumbers.js";
import { useAuth } from "../hooks/useAuth.js"; // Add auth context
import "./PublicInventoryRequestPageModern.css"; // New CSS

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// Persediaan Module Colors (from Layanan Mandiri)
const PERSEDIAAN_COLORS = {
  primary: "#f59e0b",
  gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
  shadowColor: "rgba(245, 158, 11, 0.4)",
};

// Helper: Format string to Title Case
const toTitleCase = (str) =>
  str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(),
  );

const PublicInventoryRequestPage = ({ isEmbedded = false }) => {
  const { message, modal } = AntdApp.useApp();
  const [form] = Form.useForm();
  const signatureRef = useRef();

  // Use global user auth context to try auto-filling
  const { user, apiFetch } = useAuth(); // Assume 'user' holds nip, name, unit etc.

  // ─── State ───
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [inventoryList, setInventoryList] = useState([]);

  // App State
  const [selectedRequester, setSelectedRequester] = useState(null);
  const [cartItems, setCartItems] = useState([]); // Array of { id, qty, note, ...item }
  const [searchQuery, setSearchQuery] = useState("");

  // UI State
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [ticketData, setTicketData] = useState(null);

  // ─── Fetch Data ───
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const invRes = await bmnService(apiFetch).listPublicInventory();
        setInventoryList(Array.isArray(invRes) ? invRes : invRes?.data || []);
      } catch (err) {
        message.error("Gagal memuat katalog: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [apiFetch, message]);

  // ─── Auto-Fill Logged-In User ───
  useEffect(() => {
    // Determine if the `user` context has sufficient data to prepopulate
    if (user && !selectedRequester) {
      // Directly use the authenticated user object, completely ignoring the dummy employee array
      const activeUser = {
        nip: user.nip || user.username || user.email,
        name: user.name,
        position: user?.employee?.position || user.role || "Staf",
        work_unit: user?.employee?.work_unit || "Default Unit",
      };

      setSelectedRequester(activeUser);
      form.setFieldsValue({
        nip: activeUser.nip,
        nama: activeUser.name,
        jabatan: activeUser.position,
        unit_kerja: activeUser.work_unit,
      });
    }
  }, [user, form, selectedRequester]);

  // ─── Handlers ───
  const handleRequesterChange = (val) => {
    const emp = employees.find((e) => e.nip === val);
    setSelectedRequester(emp || null);
    form.setFieldsValue({
      nama: emp?.name,
      jabatan: emp?.position,
      unit_kerja: emp?.work_unit,
    });
  };

  const addToCart = (item) => {
    const existing = cartItems.find((c) => c.id === item.id);
    if (existing) {
      if (existing.qty >= item.stock) {
        message.warning(`Stok ${item.name} tidak mencukupi.`);
        return;
      }
      setCartItems((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, qty: c.qty + 1 } : c)),
      );
    } else {
      setCartItems((prev) => [...prev, { ...item, qty: 1, note: "" }]);
    }
    // Optional: Subtle feedback could be added here instead of a global message to feel more "app-like"
  };

  const removeFromCart = (id) => {
    setCartItems((prev) => prev.filter((c) => c.id !== id));
  };

  const updateCartItem = (id, field, val) => {
    setCartItems((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: val } : c)),
    );
  };

  const handleCheckoutClick = async () => {
    try {
      await form.validateFields();
      if (cartItems.length === 0) {
        message.error("Keranjang kosong. Pilih barang terlebih dahulu.");
        return;
      }
      setSignatureOpen(true);
    } catch (error) {
      message.error("Harap lengkapi Data Pemohon di panel kiri.");
      setCartDrawerOpen(false); // Close drawer to show form
    }
  };

  const handleSubmit = async () => {
    if (signatureRef.current.isEmpty()) {
      message.error("Tanda tangan wajib diisi!");
      return;
    }

    setSubmitting(true);
    try {
      const values = await form.validateFields();
      const spbNumber = await generateSpbNumber();
      const signatureData = signatureRef.current.getSignature();

      const payload = {
        spb_number: spbNumber,
        nip: values.nip,
        nama: values.nama,
        fungsi_bidang: values.unit_kerja,
        purpose: values.keperluan,
        requester_signature: signatureData,
        items: cartItems.map((c) => ({
          inventory_id: c.id,
          item_name: c.name,
          qty_requested: c.qty,
          unit: c.unit,
          description: c.note, // passed but might be ignored by backend, keeps user's note if we map it later
        })),
      };

      await bmnService(apiFetch).createRequest(payload);

      // Show ticket
      setTicketData({ ...payload, items: cartItems });

      // Reset Workspace
      setSignatureOpen(false);
      setCartDrawerOpen(false);
      setCartItems([]);
      form.resetFields();
      setSelectedRequester(null);
    } catch (error) {
      message.error("Gagal mengirim permintaan: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Renderers ───
  const renderCatalog = () => {
    if (loading) {
      return (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src="/packing.gif"
            alt="Memuat Data..."
            style={{ width: 120, marginBottom: 16 }}
          />
          <div style={{ color: "#64748b", fontSize: "1rem", fontWeight: 500 }}>
            Sedang memuat katalog persediaan...
          </div>
        </div>
      );
    }

    const filtered = inventoryList.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    if (filtered.length === 0) {
      return (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span style={{ color: "#64748b" }}>Barang tidak ditemukan</span>
            }
          />
        </div>
      );
    }

    return (
      <div className="fluid-ws__grid">
        {filtered.map((item) => {
          const inCart = cartItems.find((c) => c.id === item.id);
          const stock = item.quantity || item.stock || 0;
          const isOutOfStock = stock <= 0;

          return (
            <div
              key={item.id}
              className={`fluid-ws__card ${inCart ? "fluid-ws__card--active" : ""}`}
            >
              <div className="fluid-ws__card-top">
                <div
                  className="fluid-ws__card-icon"
                  style={{
                    background: PERSEDIAAN_COLORS.gradient,
                    boxShadow: `0 4px 12px ${PERSEDIAAN_COLORS.shadowColor}`,
                  }}
                >
                  <GiftOutlined style={{ color: "#fff" }} />
                </div>
                <div className="fluid-ws__card-stock">
                  {isOutOfStock ? (
                    <Badge status="error" text="Habis" />
                  ) : (
                    <Badge status="success" text={`${stock} ${item.unit}`} />
                  )}
                </div>
              </div>

              <div className="fluid-ws__card-title" title={item.name}>
                {toTitleCase(item.name)}
              </div>

              <div className="fluid-ws__card-actions">
                {inCart ? (
                  <div className="fluid-ws__qty-control">
                    <button
                      className="fluid-ws__qty-btn"
                      onClick={() => {
                        if (inCart.qty > 1)
                          updateCartItem(item.id, "qty", inCart.qty - 1);
                        else removeFromCart(item.id);
                      }}
                    >
                      <MinusOutlined />
                    </button>
                    <div className="fluid-ws__qty-val">{inCart.qty}</div>
                    <button
                      className="fluid-ws__qty-btn"
                      disabled={inCart.qty >= stock}
                      onClick={() =>
                        updateCartItem(item.id, "qty", inCart.qty + 1)
                      }
                    >
                      <PlusOutlined />
                    </button>
                  </div>
                ) : (
                  <button
                    className="fluid-ws__btn-add"
                    disabled={isOutOfStock}
                    onClick={() => addToCart(item)}
                  >
                    Tambah ke Troli
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const totalCartItems = cartItems.reduce((acc, c) => acc + c.qty, 0);

  return (
    <div className="fluid-ws">
      {/* ── Top Header Bar ── */}
      <header className="fluid-ws__header">
        <div className="fluid-ws__brand">
          {!isEmbedded && (
            <a href="/app/layanan-mandiri" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 14, fontWeight: 500, textDecoration: 'none', marginRight: 16 }}>
              <ArrowLeftOutlined /> Kembali
            </a>
          )}
          <div
            className="fluid-ws__brand-icon"
            style={{
              background: PERSEDIAAN_COLORS.gradient,
              boxShadow: `0 4px 12px ${PERSEDIAAN_COLORS.shadowColor}`,
            }}
          >
            <ShoppingOutlined style={{ color: "#fff" }} />
          </div>
          Permintaan Persediaan
        </div>

        <div className="fluid-ws__header-actions">
          <button
            className="fluid-ws__cart-trigger"
            onClick={() => setCartDrawerOpen(true)}
          >
            <ShoppingOutlined style={{ fontSize: "1.2rem" }} />
            <span>Troli Permintaan</span>
            {totalCartItems > 0 && (
              <span className="fluid-ws__cart-badge">{totalCartItems}</span>
            )}
          </button>
        </div>
      </header>

      {/* ── Split Workspace ── */}
      <main className="fluid-ws__layout">
        {/* Left Panel: Form */}
        <div className="fluid-ws__panel-left">
          <div className="fluid-ws__panel-left-content">
            <h2 className="fluid-ws__panel-title">Data Pemohon</h2>
            <p className="fluid-ws__panel-desc">
              Silakan lengkapi identitas pemohon. Pastikan data yang dimasukkan
              akurat untuk proses verifikasi SPB.
            </p>

            {selectedRequester && (
              <div className="fluid-ws__active-user">
                <div className="fluid-ws__active-user-avatar">
                  <UserOutlined />
                </div>
                <div>
                  <div className="fluid-ws__active-user-name">
                    {selectedRequester.name}
                  </div>
                  <div className="fluid-ws__active-user-pos">
                    {selectedRequester.position}
                  </div>
                </div>
              </div>
            )}

            <Form form={form} layout="vertical" requiredMark="optional">
              <Form.Item
                name="keperluan"
                label="Keperluan Permintaan"
                rules={[{ required: true, message: "Keperluan wajib diisi" }]}
              >
                <TextArea
                  rows={4}
                  placeholder="Deskripsikan dengan detail keperluan penggunaan barang (contoh: Kebutuhan ATK Rapat Triwulan III Tahun 2026)..."
                />
              </Form.Item>

              {/* Hidden Fields for payload completeness */}
              <Form.Item name="nip" hidden>
                <Input />
              </Form.Item>
              <Form.Item name="unit_kerja" hidden>
                <Input />
              </Form.Item>
              <Form.Item name="nama" hidden>
                <Input />
              </Form.Item>
              <Form.Item name="jabatan" hidden>
                <Input />
              </Form.Item>
            </Form>
          </div>
        </div>

        {/* Right Panel: Catalog */}
        <div className="fluid-ws__panel-right">
          <div className="fluid-ws__catalog-header">
            <div className="fluid-ws__search-wrapper">
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
                placeholder="Cari katalog barang..."
                size="large"
                onChange={(e) => setSearchQuery(e.target.value)}
                allowClear
              />
            </div>
          </div>

          <div className="fluid-ws__catalog-scroll">{renderCatalog()}</div>
        </div>
      </main>

      {/* ── Slide-Out Cart Drawer ── */}
      <Drawer
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ShoppingCartOutlined
              style={{ color: PERSEDIAAN_COLORS.primary }}
            />
            Troli Anda
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
            disabled={cartItems.length === 0}
          >
            Lanjut Tanda Tangan & Kirim{" "}
            <ArrowRightOutlined style={{ marginLeft: 8 }} />
          </button>
        }
      >
        {cartItems.length === 0 ? (
          <div className="fluid-cart__empty">
            <ShoppingCartOutlined className="fluid-cart__empty-icon" />
            <h3>Troli Masih Kosong</h3>
            <p>Silakan pilih barang dari katalog di sebelah kanan.</p>
          </div>
        ) : (
          <div>
            <div
              style={{
                marginBottom: 24,
                fontSize: "0.95rem",
                color: "#64748b",
              }}
            >
              Anda memiliki <strong>{cartItems.length}</strong> jenis barang (
              {totalCartItems} total unit) di dalam troli.
            </div>

            {cartItems.map((item) => (
              <div key={item.id} className="fluid-cart__item">
                <div className="fluid-cart__item-header">
                  <div className="fluid-cart__item-title">{item.name}</div>
                  <div className="fluid-cart__item-qty">
                    {item.qty} {item.unit}
                  </div>
                </div>

                <Input
                  prefix={<EditOutlined style={{ color: "#cbd5e1" }} />}
                  placeholder="Tambahkan catatan khusus item ini (opsional)"
                  value={item.note}
                  onChange={(e) =>
                    updateCartItem(item.id, "note", e.target.value)
                  }
                  bordered={false}
                  style={{
                    backgroundColor: "#f8fafc",
                    padding: "8px 12px",
                    borderRadius: 8,
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </Drawer>

      {/* ── Signature Modal ── */}
      <Modal
        open={signatureOpen}
        onCancel={() => setSignatureOpen(false)}
        footer={[
          <Button
            key="clear"
            onClick={() => signatureRef.current.clear()}
            size="large"
          >
            Ulangi Tanda Tangan
          </Button>,
          <Button
            key="submit"
            type="primary"
            size="large"
            loading={submitting}
            onClick={handleSubmit}
            icon={<SendOutlined />}
            style={{
              background: PERSEDIAAN_COLORS.gradient,
              borderColor: PERSEDIAAN_COLORS.primary,
            }}
          >
            Kirim Permintaan SPB
          </Button>,
        ]}
        title="Otorisasi Permintaan"
        centered
        width={450}
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            Sebagai pemohon, silakan bubuhkan tanda tangan digital Anda di bawah
            ini sebagai bukti persetujuan permintaan pembuatan SPB.
          </Text>
        </div>
        <div
          style={{
            border: "2px dashed #cbd5e1",
            borderRadius: 16,
            overflow: "hidden",
            backgroundColor: "#f8fafc",
          }}
        >
          <SignatureCanvas ref={signatureRef} hideClearButton />
        </div>
      </Modal>

      {/* ── Success Ticket Modal ── */}
      <Modal
        open={!!ticketData}
        onCancel={() => setTicketData(null)}
        footer={null}
        width={400}
        centered
        closable={false}
        className="fluid-ws__ticket-modal"
        styles={{
          content: { padding: 0, borderRadius: 24, overflow: "hidden" },
          body: { padding: 0 },
        }}
      >
        {ticketData && (
          <div className="fluid-ws__ticket">
            <div style={{ padding: "40px 32px 32px", textAlign: "center" }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: PERSEDIAAN_COLORS.gradient,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  boxShadow: `0 8px 20px ${PERSEDIAAN_COLORS.shadowColor}`,
                }}
              >
                <ShoppingOutlined style={{ fontSize: 32, color: "#fff" }} />
              </div>
              <h2
                style={{
                  margin: "0 0 8px",
                  fontSize: "1.5rem",
                  fontWeight: 700,
                }}
              >
                Permintaan Berhasil!
              </h2>
              <p style={{ color: "#64748b", margin: 0 }}>
                Sistem telah merekam permintaan Anda. Surat Permintaan Barang
                (SPB) sedang dalam antrean proses persetujuan.
              </p>

              <div className="fluid-ws__ticket-box">
                <div
                  style={{
                    fontSize: "0.85rem",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    color: "#64748b",
                    marginBottom: 8,
                  }}
                >
                  Nomor Referensi SPB
                </div>
                <div
                  style={{
                    fontSize: "1.8rem",
                    fontWeight: 800,
                    color: "#0f172a",
                    marginBottom: 16,
                    fontFamily: "monospace",
                  }}
                >
                  {ticketData.spb_number}
                </div>
                <Button
                  icon={<CopyOutlined />}
                  onClick={() => {
                    navigator.clipboard.writeText(ticketData.spb_number);
                    message.success("Nomor direkam ke clipboard");
                  }}
                  style={{ borderRadius: 100 }}
                >
                  Salin Nomor SPB
                </Button>
              </div>

              <Button
                type="primary"
                block
                size="large"
                style={{
                  borderRadius: 12,
                  height: 48,
                  fontWeight: 600,
                  background: PERSEDIAAN_COLORS.gradient,
                  borderColor: PERSEDIAAN_COLORS.primary,
                }}
                onClick={() => setTicketData(null)}
              >
                Tutup & Kembali ke Katalog
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PublicInventoryRequestPage;
