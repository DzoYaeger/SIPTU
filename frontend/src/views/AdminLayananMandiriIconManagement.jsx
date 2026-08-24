import React, { useState, useEffect, useMemo } from "react";
import {
  Table,
  Card,
  Input,
  Button,
  Select,
  Tag,
  Space,
  Typography,
  message,
  Modal,
  Tooltip,
  Upload,
  Row,
  Col,
  Divider,
} from "antd";
import {
  AppstoreOutlined,
  SearchOutlined,
  ReloadOutlined,
  PictureOutlined,
  UploadOutlined,
  DeleteOutlined,
  SaveOutlined,
  CheckCircleOutlined,
  FolderOutlined,
} from "@ant-design/icons";

// Asset Icon Library stored in icons folder
import simbaIcon from "../assets/icons/simba-icon.png";
import simkeuIcon from "../assets/icons/simkeu-icon.png";
import siptuDriveIcon from "../assets/icons/siptu-drive-icon.png";
import rispegPengumumanIcon from "../assets/icons/rispeg-pengumuman-icon.png";
import sesiKompakIcon from "../assets/icons/sesi-kompak-icon.png";
import zoomIcon from "../assets/icons/zoom-icon.png";
import suratTugasIcon from "../assets/icons/surat-tugas-icon.png";
import sakipIcon from "../assets/icons/sakip-icon.png";
import ruanganIcon from "../assets/icons/ruangan-icon.png";
import itHelpdeskIcon from "../assets/icons/it-helpdesk-icon.png";
import kearsipanIcon from "../assets/icons/kearsipan-icon.png";
import izinKeluarIcon from "../assets/icons/izin-keluar-icon.png";
import kepegawaianIcon from "../assets/icons/kepegawaian-icon.png";
import pdttIcon from "../assets/icons/pdtt-icon.png";
import homeIcon from "../assets/icons/home-icon.png";
import cartIcon from "../assets/icons/cart-icon.png";
import headsetIcon from "../assets/icons/headset-icon.png";
import cloudIcon from "../assets/icons/cloud-icon.png";
import folderIcon from "../assets/icons/folder-icon.png";
import historyIcon from "../assets/icons/history-icon.png";
import idcardIcon from "../assets/icons/idcard-icon.png";
import archiveIcon from "../assets/icons/archive-icon.png";
import walletIcon from "../assets/icons/wallet-icon.png";
import buildingIcon from "../assets/icons/building-icon.png";

const { Title, Text } = Typography;

// Preset Icon Options from assets/icons
const PRESET_ICONS = [
  { id: "simkeu-icon", name: "SIMKEU (Dompet Hijau)", src: simkeuIcon },
  { id: "simba-icon", name: "SIMBA (Aset / BMN)", src: simbaIcon },
  { id: "siptu-drive-icon", name: "SIPTU Drive (Awan)", src: siptuDriveIcon },
  { id: "rispeg-pengumuman-icon", name: "RISPEG (Pengumuman)", src: rispegPengumumanIcon },
  { id: "sesi-kompak-icon", name: "Sesi Kompak (Buku)", src: sesiKompakIcon },
  { id: "zoom-icon", name: "Zoom (Kamera)", src: zoomIcon },
  { id: "surat-tugas-icon", name: "Surat Tugas (Dokumen)", src: suratTugasIcon },
  { id: "sakip-icon", name: "DATA SAKIP (Grafik)", src: sakipIcon },
  { id: "ruangan-icon", name: "Ruangan (Gedung)", src: ruanganIcon },
  { id: "it-helpdesk-icon", name: "IT Helpdesk (Kunci)", src: itHelpdeskIcon },
  { id: "kearsipan-icon", name: "Kearsipan (Map)", src: kearsipanIcon },
  { id: "izin-keluar-icon", name: "Izin Keluar (Orang Berjalan)", src: izinKeluarIcon },
  { id: "kepegawaian-icon", name: "Kepegawaian (Squircle User)", src: kepegawaianIcon },
  { id: "pdtt-icon", name: "PDTT / PBJ (Keranjang)", src: pdttIcon },
  { id: "wallet-icon", name: "Wallet Squircle", src: walletIcon },
  { id: "archive-icon", name: "Archive Squircle", src: archiveIcon },
  { id: "building-icon", name: "Building Squircle", src: buildingIcon },
  { id: "cart-icon", name: "Cart Squircle", src: cartIcon },
  { id: "headset-icon", name: "Headset Squircle", src: headsetIcon },
  { id: "cloud-icon", name: "Cloud Squircle", src: cloudIcon },
  { id: "history-icon", name: "History Squircle", src: historyIcon },
  { id: "idcard-icon", name: "ID Card Squircle", src: idcardIcon },
  { id: "home-icon", name: "Home Squircle", src: homeIcon },
  { id: "folder-icon", name: "Folder Squircle", src: folderIcon },
];

// Layanan Mandiri Standard List
const LAYANAN_MANDIRI_SERVICES = [
  { id: "simkeu", title: "SIMKEU", defaultIcon: simkeuIcon, category: "Keuangan" },
  { id: "siptu-drive", title: "SIPTU Drive", defaultIcon: siptuDriveIcon, category: "Penyimpanan Cloud" },
  { id: "pelatihan-pegawai", title: "Sesi Kompak", defaultIcon: sesiKompakIcon, category: "Kepegawaian" },
  { id: "kearsipan", title: "Peminjaman Arsip", defaultIcon: kearsipanIcon, category: "Kearsipan" },
  { id: "simba", title: "SIMBA", defaultIcon: simbaIcon, category: "BMN / Logistik" },
  { id: "ruangan", title: "Peminjaman Ruangan", defaultIcon: ruanganIcon, category: "Logistik" },
  { id: "rispeg", title: "Izin Keluar (RISPEG)", defaultIcon: izinKeluarIcon, category: "Kepegawaian" },
  { id: "pengumuman-rispeg", title: "RISPEG Leaderboard", defaultIcon: rispegPengumumanIcon, category: "Kepegawaian" },
  { id: "it-helpdesk", title: "IT Helpdesk", defaultIcon: itHelpdeskIcon, category: "IT" },
  { id: "surat-tugas", title: "Pengajuan Surat Tugas", defaultIcon: suratTugasIcon, category: "Kepegawaian" },
  { id: "zoom-generator", title: "Pengajuan Zoom", defaultIcon: zoomIcon, category: "Kepegawaian" },
  { id: "rhpk", title: "Layanan RHPK", defaultIcon: buildingIcon, category: "Kepegawaian" },
  { id: "sakip-2026", title: "DATA SAKIP 2026", defaultIcon: sakipIcon, category: "Akuntabilitas" },
  { id: "pengusulan-pengadaan", title: "Pengusulan PBJ", defaultIcon: cartIcon, category: "Logistik" },
  { id: "pengajuan-pdtt", title: "Pengadaan PDTT", defaultIcon: pdttIcon, category: "Logistik" },
];

const LOCAL_STORAGE_KEY = "siptu_custom_layanan_icons";

export default function AdminLayananMandiriIconManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [customIcons, setCustomIcons] = useState({});
  const [selectedItemForEdit, setSelectedItemForEdit] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPresetSrc, setSelectedPresetSrc] = useState("");
  const [customUrlInput, setCustomUrlInput] = useState("");

  // Load custom icon mapping on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        setCustomIcons(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Gagal memuat kustomisasi ikon Layanan Mandiri:", e);
    }
  }, []);

  // Save changes to localStorage & trigger event for LayananMandiri
  const saveCustomIcons = (newMapping) => {
    setCustomIcons(newMapping);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newMapping));
      window.dispatchEvent(new Event("siptu_layanan_icons_updated"));
      message.success("Ikon Layanan Mandiri berhasil diperbarui!");
    } catch (e) {
      message.error("Gagal menyimpan pengaturan ikon.");
    }
  };

  // Filtered services
  const filteredServices = useMemo(() => {
    if (!searchTerm) return LAYANAN_MANDIRI_SERVICES;
    const s = searchTerm.toLowerCase();
    return LAYANAN_MANDIRI_SERVICES.filter(
      (item) =>
        item.title.toLowerCase().includes(s) ||
        item.id.toLowerCase().includes(s) ||
        item.category.toLowerCase().includes(s)
    );
  }, [searchTerm]);

  const handleOpenEditModal = (record) => {
    setSelectedItemForEdit(record);
    const currentSrc = customIcons[record.id] || record.defaultIcon || "";
    setSelectedPresetSrc(currentSrc);
    setCustomUrlInput(currentSrc.startsWith("data:") || currentSrc.startsWith("http") ? currentSrc : "");
    setModalOpen(true);
  };

  const handleApplyIcon = (iconSrc) => {
    if (!selectedItemForEdit) return;
    const updated = { ...customIcons };
    if (iconSrc) {
      updated[selectedItemForEdit.id] = iconSrc;
    } else {
      delete updated[selectedItemForEdit.id];
    }
    saveCustomIcons(updated);
    setModalOpen(false);
  };

  const handleResetItem = (id) => {
    const updated = { ...customIcons };
    delete updated[id];
    saveCustomIcons(updated);
  };

  const handleResetAll = () => {
    saveCustomIcons({});
    message.info("Semua ikon Layanan Mandiri telah dikembalikan ke standar bawaan.");
  };

  const handleFileUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Src = e.target.result;
      setSelectedPresetSrc(base64Src);
      handleApplyIcon(base64Src);
    };
    reader.readAsDataURL(file);
    return false;
  };

  const renderCurrentIconPreview = (record) => {
    const customSrc = customIcons[record.id];
    const displaySrc = customSrc || record.defaultIcon;

    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {displaySrc && (
          <img
            src={displaySrc}
            alt={record.title}
            style={{ width: 28, height: 28, objectFit: "contain", borderRadius: 6, padding: 2, background: "#f8fafc", border: "1px solid #cbd5e1" }}
          />
        )}
        {customSrc ? (
          <Tag color="green" style={{ fontSize: 10, margin: 0 }}>Kustom</Tag>
        ) : (
          <Tag color="default" style={{ fontSize: 10, margin: 0 }}>Bawaan</Tag>
        )}
      </div>
    );
  };

  const columns = [
    {
      title: "Layanan Mandiri",
      dataIndex: "title",
      key: "title",
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "13px" }}>{text}</div>
          <div style={{ fontSize: "11px", color: "#64748b" }}>Kategori: {record.category}</div>
        </div>
      ),
    },
    {
      title: "ID Layanan",
      dataIndex: "id",
      key: "id",
      render: (id) => <Text code style={{ fontSize: "11.5px" }}>{id}</Text>,
    },
    {
      title: "Ikon Aktif",
      key: "current_icon",
      render: (_, record) => renderCurrentIconPreview(record),
    },
    {
      title: "Aksi Pengaturan",
      key: "actions",
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<PictureOutlined />}
            onClick={() => handleOpenEditModal(record)}
            style={{ background: "#0f5b99", borderColor: "#0f5b99", fontWeight: 600, fontSize: "11.5px" }}
          >
            Ubah Ikon
          </Button>
          {customIcons[record.id] && (
            <Tooltip title="Kembalikan ke Ikon Bawaan">
              <Button
                icon={<DeleteOutlined />}
                danger
                size="small"
                onClick={() => handleResetItem(record.id)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="module-section">
      <div className="module-toolbar" style={{ background: "#ffffff", padding: "14px 18px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
        <div>
          <Title level={4} className="module-title">Manajemen Ikon Layanan Mandiri</Title>
          <Text className="module-subtitle">
            Atur dan kustomisasi ikon kartu layanan mandiri yang tersimpan dalam folder aset icons secara praktis dan ringan.
          </Text>
        </div>

        <Space wrap>
          <Input
            placeholder="Cari layanan..."
            prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: 240 }}
            allowClear
          />

          {Object.keys(customIcons).length > 0 && (
            <Button danger icon={<DeleteOutlined />} onClick={handleResetAll}>
              Reset Semua Ikon
            </Button>
          )}
        </Space>
      </div>

      <Row gutter={12} style={{ marginTop: 12 }}>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 8, borderColor: "#e2e8f0" }}>
            <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Total Kartu Layanan</div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#0f5b99" }}>{LAYANAN_MANDIRI_SERVICES.length} Kartu</div>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 8, borderColor: "#e2e8f0" }}>
            <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Ikon Dikustomisasi</div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#059669" }}>{Object.keys(customIcons).length} Kartu</div>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 8, borderColor: "#e2e8f0" }}>
            <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Ikon Bawaan</div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#64748b" }}>{LAYANAN_MANDIRI_SERVICES.length - Object.keys(customIcons).length} Kartu</div>
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 12, borderRadius: 10, borderColor: "#e2e8f0" }} bodyStyle={{ padding: 0 }}>
        <Table
          dataSource={filteredServices}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10, showSizeChanger: true }}
          size="middle"
        />
      </Card>

      {selectedItemForEdit && (
        <Modal
          title={<span style={{ fontWeight: 700, color: "#0f5b99" }}>Pilih Ikon Layanan — {selectedItemForEdit.title}</span>}
          open={modalOpen}
          onCancel={() => setModalOpen(false)}
          footer={null}
          width={650}
          destroyOnClose
        >
          <div style={{ background: "#f8fafc", padding: 10, borderRadius: 8, marginBottom: 14, border: "1px solid #e2e8f0" }}>
            <Text style={{ fontSize: "12px", color: "#64748b" }}>
              Pilih dari koleksi pustaka ikon di folder assets/icons, atau unggah ikon kustom PNG/SVG baru.
            </Text>
          </div>

          <Divider orientation="left" style={{ borderColor: "#e2e8f0", fontSize: "12px", fontWeight: 600, color: "#0f5b99" }}>
            Pustaka Ikon Asset Icons
          </Divider>

          <div style={{ maxHeight: 260, overflowY: "auto", paddingRight: 4 }}>
            <Row gutter={[10, 10]}>
              {PRESET_ICONS.map((icon) => {
                const isSelected = selectedPresetSrc === icon.src;
                return (
                  <Col span={12} key={icon.id}>
                    <div
                      onClick={() => {
                        setSelectedPresetSrc(icon.src);
                        handleApplyIcon(icon.src);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: isSelected ? "2px solid #0f5b99" : "1px solid #e2e8f0",
                        background: isSelected ? "#eef6ff" : "#ffffff",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      <img src={icon.src} alt={icon.name} style={{ width: 26, height: 26, objectFit: "contain", borderRadius: 4 }} />
                      <span style={{ fontSize: "12px", fontWeight: isSelected ? 700 : 500, color: "#0f172a" }}>{icon.name}</span>
                    </div>
                  </Col>
                );
              })}
            </Row>
          </div>

          <Divider orientation="left" style={{ borderColor: "#e2e8f0", fontSize: "12px", fontWeight: 600, color: "#0f5b99", marginTop: 20 }}>
            Unggah / Input URL Ikon Kustom
          </Divider>

          <Row gutter={12} align="middle">
            <Col span={16}>
              <Input
                placeholder="https://... / URL Gambar atau Base64"
                value={customUrlInput}
                onChange={(e) => setCustomUrlInput(e.target.value)}
                size="middle"
              />
            </Col>
            <Col span={8}>
              <Upload beforeUpload={handleFileUpload} showUploadList={false} accept="image/*,.svg">
                <Button icon={<UploadOutlined />} style={{ width: "100%" }}>Upload PNG/SVG</Button>
              </Upload>
            </Col>
          </Row>

          {customUrlInput && (
            <div style={{ marginTop: 12, textAlign: "right" }}>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={() => handleApplyIcon(customUrlInput)}
                style={{ background: "#0f5b99", borderColor: "#0f5b99" }}
              >
                Gunakan URL Ini
              </Button>
            </div>
          )}

          <div style={{ textAlign: "right", marginTop: 20, paddingTop: 12, borderTop: "1px solid #e2e8f0" }}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>Batal</Button>
              {customIcons[selectedItemForEdit.id] && (
                <Button danger icon={<DeleteOutlined />} onClick={() => handleApplyIcon("")}>
                  Kembalikan ke Bawaan
                </Button>
              )}
            </Space>
          </div>
        </Modal>
      )}
    </div>
  );
}
