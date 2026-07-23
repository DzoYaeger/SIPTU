import { useState, useEffect, useMemo, useCallback } from "react";
import {
  App as AntdApp,
  Layout,
  Typography,
  Card,
  Button,
  Input,
  InputNumber,
  Select,
  Switch,
  Upload,
  Space,
  Empty,
  Spin,
  Tooltip,
  Divider,
  Row,
  Col,
  Segmented,
} from "antd";
import {
  PictureOutlined,
  PlusOutlined,
  SaveOutlined,
  DeleteOutlined,
  UploadOutlined,
  ArrowLeftOutlined,
  EyeOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  VerticalAlignTopOutlined,
  VerticalAlignBottomOutlined,
  SearchOutlined,
  NotificationOutlined,
  PlaySquareOutlined,
  ClockCircleOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { buildMessageAdapter } from "../utils/notify.js";
import "./LayananMandiriSliderEditor.css";
import "./LayananMandiri.css"; // Reuse 3D styles

const { Header, Content, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const DEFAULT_SLIDES = [
  {
    title: "Pelayanan Lebih Cepat",
    description: "Pantau status layanan dan akses dokumen kapan saja.",
    image: "/hero/slide-1.svg",
    tone: "blue",
    active: true,
  },
];

const DEFAULT_POPUP = {
  title: "",
  content: "",
  image: "",
  link: "",
  active: false,
  show_once: true,
};

const normalizeImage = (value) => {
  if (!value) return value;
  let v = String(value).trim();
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  v = v.replace(/\/api\/hero-slider\//i, "/storage/hero-slider/");
  v = v.replace(/^api\/hero-slider\//i, "/storage/hero-slider/");
  v = v.replace(/^\/?hero-slider\//i, "/storage/hero-slider/");
  if (!v.startsWith("/")) v = "/" + v;
  if (v === "/storage/hero-slider" || v === "/storage/hero-slider/") return "";
  return v;
};

const LayananMandiriSliderEditor = () => {
  const navigate = useNavigate();
  const { apiFetch, token, user } = useAuth();
  const { message } = AntdApp.useApp();
  const notify = buildMessageAdapter(message);

  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("slider");
  const [sliderDuration, setSliderDuration] = useState(6);
  const [popup, setPopup] = useState({ ...DEFAULT_POPUP });

  const availableTones = [
    { label: "Biru Theme", value: "blue" },
    { label: "Toska Theme", value: "teal" },
    { label: "Oranye Theme", value: "orange" },
    { label: "Ungu Theme", value: "purple" },
    { label: "Hijau Theme", value: "green" },
    { label: "Slate Theme", value: "slate" },
  ];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/hero-slider/config");
      if (res.ok) {
        const data = await res.json();
        const rawSlides = Array.isArray(data?.hero_slider) ? data.hero_slider : [];
        if (rawSlides.length > 0) {
          setSlides(rawSlides);
        } else {
          setSlides(DEFAULT_SLIDES);
        }
        // Load popup config
        if (data?.popup && typeof data.popup === "object") {
          setPopup({ ...DEFAULT_POPUP, ...data.popup });
        }
        // Load slider duration
        if (data?.slider_duration) {
          setSliderDuration(Number(data.slider_duration) || 6);
        }
      }
    } catch (e) {
      notify.error({ message: "Gagal memuat konfigurasi." });
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const normalizedSlides = slides.map((s) => ({ ...s, image: normalizeImage(s?.image) }));
      const res = await apiFetch("/hero-slider", {
        method: "PUT",
        body: JSON.stringify({
          hero_slider: normalizedSlides,
          popup: {
            ...popup,
            image: normalizeImage(popup.image),
            link: (popup.link || "").trim(),
          },
          slider_duration: sliderDuration,
        }),
      });
      if (res.ok) {
        notify.success({ message: "Konfigurasi berhasil disimpan!" });
      } else {
        throw new Error("Gagal menyimpan.");
      }
    } catch (e) {
      notify.error({ message: e.message });
    } finally {
      setSaving(false);
    }
  };

  const addSlide = () => {
    const newSlide = {
      title: "Judul Slide Baru",
      description: "Deskripsi singkat mengenai layanan atau informasi ini.",
      image: "",
      tone: "blue",
      active: true,
    };
    setSlides([...slides, newSlide]);
    setPreviewIndex(slides.length);
  };

  const updateSlide = (index, fields) => {
    setSlides(slides.map((s, i) => (i === index ? { ...s, ...fields } : s)));
  };

  const removeSlide = (index) => {
    const newSlides = slides.filter((_, i) => i !== index);
    setSlides(newSlides);
    if (previewIndex >= newSlides.length) {
      setPreviewIndex(Math.max(0, newSlides.length - 1));
    }
  };

  const moveSlide = (index, direction) => {
    const newSlides = [...slides];
    const target = index + direction;
    if (target < 0 || target >= slides.length) return;
    [newSlides[index], newSlides[target]] = [newSlides[target], newSlides[index]];
    setSlides(newSlides);
    setPreviewIndex(target);
  };

  const currentPreviewSlide = slides[previewIndex] || slides[0] || {};

  const handleUpload = async (file, index, onSuccess, onError) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const baseUrl = import.meta.env.VITE_API_URL || "https://siptu.bpompalopo.com/core_api/api";
      const url = `${baseUrl.replace(/\/+$/, "")}/hero-slider/upload`;

      const res = await fetch(url, {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });

      const body = await res.json().catch(() => ({}));
      if (res.ok && body.url) {
        if (index === "popup") {
          setPopup((prev) => ({ ...prev, image: normalizeImage(body.url) }));
        } else {
          updateSlide(index, { image: normalizeImage(body.url) });
        }
        notify.success({ message: "Gambar berhasil diunggah." });
        onSuccess?.(body, file);
      } else {
        notify.error({ message: body.message || "Upload gagal." });
        onError?.(new Error(body.message || "Upload gagal."));
      }
    } catch (e) {
      notify.error({ message: "Terjadi kesalahan saat upload." });
      onError?.(e);
    }
  };

  if (loading) {
    return (
      <div className="vse-loading">
        <Spin size="large" tip="Mempersiapkan Content Studio..." />
      </div>
    );
  }

  // === RENDER SIDEBAR ===
  const renderSidebar = () => (
    <div className="vse-sider-inner">
      <Segmented
        block
        value={activeTab}
        onChange={setActiveTab}
        options={[
          { label: <span><PlaySquareOutlined /> Slider</span>, value: "slider" },
          { label: <span><NotificationOutlined /> Popup</span>, value: "popup" },
        ]}
        className="vse-tab-segmented"
      />

      {activeTab === "slider" && (
        <>
          {/* Slider Duration Setting */}
          <div className="vse-duration-box">
            <div className="vse-duration-header">
              <ClockCircleOutlined />
              <Text strong>Durasi Pergantian Slide</Text>
            </div>
            <div className="vse-duration-control">
              <InputNumber
                min={2}
                max={60}
                value={sliderDuration}
                onChange={(v) => setSliderDuration(v || 6)}
                addonAfter="detik"
                style={{ width: "100%" }}
              />
              <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: "block" }}>
                Slide otomatis berganti setiap {sliderDuration} detik
              </Text>
            </div>
          </div>

          <Divider style={{ margin: "16px 0" }} />

          <div className="vse-slide-list-header">
            <Text strong>DAFTAR SLIDE ({slides.length})</Text>
            <Tooltip title="Slideshow akan tampil bergantian di halaman utama.">
              <InfoCircleOutlined style={{ color: "#94a3b8" }} />
            </Tooltip>
          </div>

          <div className="vse-slide-items">
            {slides.map((slide, index) => (
              <Card 
                key={`slide-${index}`} 
                className={`vse-slide-card ${previewIndex === index ? "is-selected" : ""}`}
                onClick={() => setPreviewIndex(index)}
                variant="borderless"
              >
                <div className="vse-card-num">{index + 1}</div>
                <div className="vse-card-body">
                  <div className="vse-card-main">
                    <div className="vse-card-thumb">
                      {slide.image ? <img src={slide.image} alt="Thumb" /> : <PictureOutlined />}
                    </div>
                    <div className="vse-card-info">
                      <Text strong className="vse-card-title">{slide.title || "(Tanpa Judul)"}</Text>
                      <Tag color={slide.active ? "blue" : "default"} style={{ marginTop: 4 }}>
                        {slide.active ? "Aktif" : "Draft"}
                      </Tag>
                    </div>
                  </div>
                  <div className="vse-card-actions">
                    <Tooltip title="Hapus Slide">
                      <Button 
                        type="text" 
                        danger 
                        icon={<DeleteOutlined />} 
                        onClick={(e) => { e.stopPropagation(); removeSlide(index); }} 
                      />
                    </Tooltip>
                  </div>
                </div>
              </Card>
            ))}
            {slides.length === 0 && <Empty description="Belum ada slide. Klik 'Tambah Slide' untuk memulai." />}
          </div>
        </>
      )}

      {activeTab === "popup" && (
        <div className="vse-popup-sidebar">
          <div className="vse-popup-status-box">
            <div className="vse-popup-status-row">
              <div>
                <Text strong>Status Popup</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {popup.active ? "Popup aktif dan akan tampil di Layanan Mandiri" : "Popup sedang nonaktif"}
                </Text>
              </div>
              <Switch
                checked={popup.active}
                onChange={(v) => setPopup((p) => ({ ...p, active: v }))}
                checkedChildren="ON"
                unCheckedChildren="OFF"
              />
            </div>
          </div>

          <div className="vse-popup-status-box" style={{ marginTop: 12 }}>
            <div className="vse-popup-status-row">
              <div>
                <Text strong>Tampilkan Sekali</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Popup hanya muncul 1x per pengguna, lalu otomatis tidak tampil lagi setelah ditutup.
                </Text>
              </div>
              <Switch
                checked={popup.show_once}
                onChange={(v) => setPopup((p) => ({ ...p, show_once: v }))}
                checkedChildren="YA"
                unCheckedChildren="TIDAK"
              />
            </div>
          </div>

          <div className="vse-popup-status-box" style={{ marginTop: 12 }}>
            <div className="vse-popup-status-row">
              <div>
                <Text strong>Gunakan Durasi Tunggu</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Tombol tutup tidak dapat diklik sebelum durasi habis.
                </Text>
              </div>
              <Switch
                checked={popup.use_duration}
                onChange={(v) => setPopup((p) => ({ ...p, use_duration: v }))}
                checkedChildren="YA"
                unCheckedChildren="TIDAK"
              />
            </div>
            {popup.use_duration && (
              <div style={{ marginTop: 16 }}>
                <Text strong style={{ fontSize: 12, display: "block", marginBottom: 8 }}>Durasi (detik)</Text>
                <InputNumber
                  min={1}
                  max={300}
                  value={popup.duration}
                  onChange={(v) => setPopup((p) => ({ ...p, duration: v || 5 }))}
                  style={{ width: "100%" }}
                  addonAfter="detik"
                />
              </div>
            )}
          </div>

          <Divider style={{ margin: "16px 0" }} />

          <div className="vse-popup-preview-mini">
            <Text strong style={{ fontSize: 12, color: "#64748b", letterSpacing: 1 }}>PREVIEW</Text>
            <div className="vse-popup-preview-card">
              {popup.image && (
                <div className="vse-popup-preview-img">
                  <img src={popup.image} alt="Popup preview" />
                </div>
              )}
              <div className="vse-popup-preview-body">
                <Text strong>{popup.title || "Judul Popup"}</Text>
                <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: "block" }}>
                  {popup.content ? (popup.content.length > 80 ? popup.content.substring(0, 80) + "..." : popup.content) : "Isi konten popup..."}
                </Text>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // === RENDER SLIDER EDITOR ===
  const renderSliderEditor = () => {
    if (!slides[previewIndex]) {
      return (
        <div className="vse-no-selection">
          <Empty description="Pilih slide di sisi kiri atau tambahkan slide baru untuk mulai mengedit." />
        </div>
      );
    }

    return (
      <div className="vse-stage">
        {/* 3D Preview Section */}
        <div className="vse-preview-section">
          <div className="vse-preview-label">
            <Space><EyeOutlined /> LIVE PREVIEW (3D RENDERING)</Space>
          </div>
          <div className="vse-preview-container">
            <div className="lm-hero-inner vse-preview-frame">
              <div className="lm-slide is-active">
                <div className="lm-slide-left">
                  <div className="lm-hero-greeting">
                    <span className="lm-greeting-wave">👋</span>
                    <span className="lm-greeting-text">Selamat Pagi, {user?.name?.split(" ")[0]}</span>
                  </div>
                  <h1 className="lm-hero-title">{slides[previewIndex].title || "Judul Slide"}</h1>
                  <p className="lm-hero-desc">{slides[previewIndex].description || "Isi keterangan slide di sini..."}</p>
                  <div className="lm-search-wrap">
                    <div className="lm-search">
                      <SearchOutlined className="lm-search-ico" />
                      <div className="lm-search-input">Cari layanan...</div>
                    </div>
                  </div>
                </div>
                <div className="lm-slide-right">
                  <div className="lm-3d-scene">
                    <div className="lm-3d-card">
                      {slides[previewIndex].image ? (
                        <img className="lm-3d-image" src={slides[previewIndex].image} alt="Preview" />
                      ) : (
                        <div className="vse-empty-image">
                          <PictureOutlined />
                          <Text type="secondary">Belum ada gambar</Text>
                        </div>
                      )}
                      <div className="lm-3d-overlay" />
                    </div>
                    <div className={`lm-3d-badge lm-badge-${slides[previewIndex].tone}`}>SIPTU Update</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="vse-form-section">
          <Title level={5}><SettingOutlined /> PENGATURAN KONTEN</Title>
          <Divider style={{ margin: "12px 0 24px" }} />
          
          <Row gutter={24}>
            <Col span={16}>
              <Space direction="vertical" style={{ width: "100%" }} size="large">
                <div>
                  <Text strong>Judul Utama Slide</Text>
                  <Input 
                    size="large" 
                    style={{ marginTop: 8 }}
                    placeholder="Contoh: Pelayanan Lebih Cepat"
                    value={slides[previewIndex].title}
                    onChange={(e) => updateSlide(previewIndex, { title: e.target.value })}
                  />
                </div>
                <div>
                  <Text strong>Isi / Keterangan Slide</Text>
                  <TextArea 
                    rows={4}
                    style={{ marginTop: 8 }}
                    placeholder="Jelaskan detail informasi atau layanan ini..."
                    value={slides[previewIndex].description}
                    onChange={(e) => updateSlide(previewIndex, { description: e.target.value })}
                  />
                </div>
              </Space>
            </Col>
            <Col span={8}>
              <Space direction="vertical" style={{ width: "100%" }} size="large">
                <div>
                  <Text strong>Tema Warna</Text>
                  <Select 
                    style={{ width: "100%", marginTop: 8 }}
                    options={availableTones}
                    value={slides[previewIndex].tone}
                    onChange={(v) => updateSlide(previewIndex, { tone: v })}
                  />
                </div>
                <div>
                  <Text strong>Status Publikasi</Text>
                  <div style={{ marginTop: 8 }}>
                    <Switch 
                      checked={slides[previewIndex].active}
                      onChange={(v) => updateSlide(previewIndex, { active: v })}
                    />
                    <Text style={{ marginLeft: 12 }}>{slides[previewIndex].active ? "Tampilkan di Dashboard" : "Sembunyikan (Draft)"}</Text>
                  </div>
                </div>
                <div>
                  <Text strong>Order / Urutan</Text>
                  <div style={{ marginTop: 8 }}>
                    <Space>
                      <Button 
                        icon={<VerticalAlignTopOutlined />} 
                        disabled={previewIndex === 0}
                        onClick={() => moveSlide(previewIndex, -1)}
                      >
                        Naik
                      </Button>
                      <Button 
                        icon={<VerticalAlignBottomOutlined />} 
                        disabled={previewIndex === slides.length - 1}
                        onClick={() => moveSlide(previewIndex, 1)}
                      >
                        Turun
                      </Button>
                    </Space>
                  </div>
                </div>
              </Space>
            </Col>
          </Row>

          <div style={{ marginTop: 32 }}>
            <Text strong>Asset Gambar (Panduan & Ukuran Rekomendasi)</Text>
            <div className="vse-asset-guide" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
              <div className="vse-guide-item">
                <Text strong>🖼️ Tipe 1: Full-Bleed Banner (Rekomendasi Baru)</Text>
                <Text type="secondary" style={{ marginTop: 4 }}>
                  Jika slide diisi <strong>hanya gambar penuh tanpa teks</strong> (kosongkan judul dan deskripsi slide):
                  <br />
                  • Gunakan ukuran pixel pas <strong>1300 x 250 px</strong> (Rasio 5.2:1).
                  <br />
                  • Gunakan format JPG/PNG berkualitas tinggi (lebar disarankan minimal 1300px).
                </Text>
              </div>
              <div className="vse-guide-item">
                <Text strong>📐 Tipe 2: 3D Card View (Layout Teks + Gambar Melayang)</Text>
                <Text type="secondary" style={{ marginTop: 4 }}>
                  Jika slide diisi <strong>teks judul dan deskripsi</strong>:
                  <br />
                  • Gunakan gambar rasio <strong>4:3</strong> atau <strong>1:1 (Kotak)</strong> (lebar disarankan minimal 800px).
                  <br />
                  • Gunakan format <strong>PNG Transparan</strong> agar efek objek melayang maksimal.
                </Text>
              </div>
            </div>

            <Card style={{ marginTop: 16, background: "#f8fafc" }} variant="borderless">
              <div className="vse-upload-area">
                <div className="vse-upload-input">
                  <Text type="bold">Masukkan URL Gambar / Patch:</Text>
                  <Input 
                    placeholder="https://example.com/image.png"
                    value={slides[previewIndex].image}
                    onChange={(e) => updateSlide(previewIndex, { image: e.target.value })}
                    className="vse-url-input"
                  />
                </div>
                <Divider type="vertical" style={{ height: 40 }} />
                <Upload
                  showUploadList={false}
                  customRequest={({ file, onSuccess, onError }) => handleUpload(file, previewIndex, onSuccess, onError)}
                >
                  <Button 
                    type="primary" 
                    icon={<UploadOutlined />} 
                    size="large"
                  >
                    Upload Foto Sekarang
                  </Button>
                </Upload>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  // === RENDER POPUP EDITOR ===
  const renderPopupEditor = () => (
    <div className="vse-stage">
      {/* Popup Live Preview */}
      <div className="vse-preview-section">
        <div className="vse-preview-label">
          <Space><EyeOutlined /> LIVE PREVIEW POPUP</Space>
        </div>
        <div className="vse-popup-live-preview">
          <div className="vse-popup-backdrop">
            {/* Mini page background for context */}
            <div className="vse-popup-page-bg">
              <div className="vse-popup-page-nav" />
              <div className="vse-popup-page-hero" />
              <div className="vse-popup-page-grid">
                <div /><div /><div /><div />
              </div>
            </div>

            {/* The popup overlay */}
            <div className="vse-popup-overlay-preview">
              <div className={`vse-popup-modal-preview ${!popup.title && !popup.content && popup.image ? 'is-image-only' : ''}`}>
                <button className="vse-popup-close-preview">
                  <CloseOutlined />
                </button>
                {popup.image && (
                  <div className={`vse-popup-modal-img ${popup.link ? 'has-link' : ''}`}>
                    <img src={popup.image} alt="popup" />
                    {popup.link && <div className="vse-popup-link-badge">🔗 Klik untuk buka link</div>}
                  </div>
                )}
                {(popup.title || popup.content) && (
                  <div className="vse-popup-modal-content">
                    {popup.title && <h3>{popup.title}</h3>}
                    {popup.content && <p>{popup.content}</p>}
                  </div>
                )}
                {(popup.title || popup.content) && (
                  <div className="vse-popup-modal-footer">
                    <div className="vse-popup-btn-preview">Mengerti</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Popup Form Section */}
      <div className="vse-form-section">
        <Title level={5}><SettingOutlined /> PENGATURAN POPUP INFORMASI</Title>
        <Divider style={{ margin: "12px 0 24px" }} />

        {/* Status Toggle Card */}
        <Card style={{ marginBottom: 24, background: popup.active ? "#f0fdf4" : "#fef2f2", borderColor: popup.active ? "#bbf7d0" : "#fecaca" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <Text strong style={{ fontSize: 16, color: popup.active ? "#15803d" : "#991b1b" }}>
                Status Popup: {popup.active ? "AKTIF" : "NONAKTIF (DISABLED)"}
              </Text>
              <Text type="secondary" style={{ display: "block", fontSize: 13, marginTop: 2 }}>
                {popup.active
                  ? "Popup akan tampil otomatis saat pengguna baru pertama kali masuk ke aplikasi (per session tab baru)."
                  : "Popup dinonaktifkan dan tidak akan tampil diseluruh menu pengguna."}
              </Text>
            </div>
            <Switch
              checked={popup.active}
              onChange={(v) => setPopup((p) => ({ ...p, active: v }))}
              checkedChildren="Aktif"
              unCheckedChildren="Nonaktif"
              style={{ transform: "scale(1.2)" }}
            />
          </div>
        </Card>

        <Row gutter={24}>
          <Col span={24}>
            <Space direction="vertical" style={{ width: "100%" }} size="large">
              <div>
                <Text strong>Judul Popup</Text>
                <Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Opsional — kosongkan jika ingin tampilkan gambar saja.</Text>
                <Input
                  size="large"
                  placeholder="Contoh: Informasi Penting"
                  value={popup.title}
                  onChange={(e) => setPopup((p) => ({ ...p, title: e.target.value }))}
                  maxLength={120}
                  showCount
                />
              </div>
              <div>
                <Text strong>Isi / Konten Popup</Text>
                <Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Opsional — kosongkan jika ingin tampilkan gambar saja.</Text>
                <TextArea
                  rows={6}
                  placeholder="Tuliskan informasi yang ingin ditampilkan kepada pengunjung..."
                  value={popup.content}
                  onChange={(e) => setPopup((p) => ({ ...p, content: e.target.value }))}
                  maxLength={2000}
                  showCount
                />
              </div>
            </Space>
          </Col>
        </Row>

        <div style={{ marginTop: 32 }}>
          <Text strong>Gambar Popup</Text>
          <Text type="secondary" style={{ display: "block", marginTop: 4, marginBottom: 12 }}>
            Gambar akan ditampilkan di bagian atas popup. Bisa digunakan sebagai banner atau konten utama. Ukuran gambar akan menyesuaikan device secara dinamis.
          </Text>
          <Card style={{ background: "#f8fafc" }} variant="borderless">
            <div className="vse-upload-area">
              <div className="vse-upload-input">
                <Text>URL Gambar:</Text>
                <Input
                  placeholder="https://example.com/banner.png"
                  value={popup.image}
                  onChange={(e) => setPopup((p) => ({ ...p, image: e.target.value }))}
                  className="vse-url-input"
                />
              </div>
              <Divider type="vertical" style={{ height: 40 }} />
              <Upload
                showUploadList={false}
                customRequest={({ file, onSuccess, onError }) => handleUpload(file, "popup", onSuccess, onError)}
              >
                <Button type="primary" icon={<UploadOutlined />} size="large">
                  Upload Gambar
                </Button>
              </Upload>
            </div>
          </Card>
        </div>

        <div style={{ marginTop: 24 }}>
          <Text strong>Link Gambar (Opsional)</Text>
          <Text type="secondary" style={{ display: "block", marginTop: 4, marginBottom: 8 }}>
            Jika diisi, pengguna dapat mengklik gambar popup untuk membuka link ini di tab baru.
          </Text>
          <Input
            size="large"
            placeholder="https://contoh.com/halaman-informasi"
            value={popup.link}
            onChange={(e) => setPopup((p) => ({ ...p, link: e.target.value }))}
            maxLength={500}
          />
        </div>

        <Row gutter={24} style={{ marginTop: 24 }}>
          <Col span={12}>
            <Card size="small" title="Pengaturan Tampilan Permanen">
              <Space direction="vertical" style={{ width: "100%" }}>
                <div>
                  <Switch
                    checked={popup.show_once}
                    onChange={(v) => setPopup((p) => ({ ...p, show_once: v }))}
                  />
                  <Text style={{ marginLeft: 10 }}>Ingat penutupan selamanya (Tutup 1x per perangkat)</Text>
                </div>
              </Space>
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" title="Hitung Mundur Penutupan (Kunci Tombol Close)">
              <Space style={{ width: "100%" }}>
                <Switch
                  checked={popup.use_duration}
                  onChange={(v) => setPopup((p) => ({ ...p, use_duration: v }))}
                />
                <Text>Waktu Tunggu:</Text>
                <InputNumber
                  min={1}
                  max={300}
                  disabled={!popup.use_duration}
                  value={popup.duration || 5}
                  onChange={(v) => setPopup((p) => ({ ...p, duration: v }))}
                  addonAfter="Detik"
                />
              </Space>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );

  return (
    <Layout className="vse-layout">
      <Header className="vse-header">
        <div className="vse-header-left">
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate("/app/validator-dashboard")} 
            className="vse-back-btn"
          />
          <Divider type="vertical" />
          <div className="vse-brand">
            <Title level={4} style={{ margin: 0 }}>Content Studio</Title>
            <Text type="secondary">Kelola Slider & Popup Layanan Mandiri</Text>
          </div>
        </div>
        <div className="vse-header-actions">
          {activeTab === "slider" && (
            <Button icon={<PlusOutlined />} onClick={addSlide} disabled={saving}>Tambah Slide</Button>
          )}
          <Button 
            type="primary" 
            icon={<SaveOutlined />} 
            onClick={handleSave} 
            loading={saving}
          >
            Simpan Perubahan
          </Button>
        </div>
      </Header>

      <Layout style={{ background: "transparent" }}>
        <Sider width={450} className="vse-sider" theme="light">
          {renderSidebar()}
        </Sider>

        <Content className="vse-content">
          <div className="vse-editor-pane">
            {activeTab === "slider" ? renderSliderEditor() : renderPopupEditor()}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

// Internal Tag replacement for Badge/Tag from Antd if needed
const Tag = ({ children, color, style }) => (
  <span style={{ 
    display: "inline-block", 
    padding: "2px 8px", 
    borderRadius: "6px", 
    fontSize: "11px", 
    fontWeight: 600, 
    background: color === "blue" ? "#dbeafe" : "#f1f5f9",
    color: color === "blue" ? "#1d4ed8" : "#475569",
    ...style
  }}>
    {children}
  </span>
);

export default LayananMandiriSliderEditor;
