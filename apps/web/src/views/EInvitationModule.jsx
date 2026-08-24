import React, { useState, useEffect, useMemo } from "react";
import {
  Typography,
  Space,
  Button,
  Table,
  Card,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  TimePicker,
  Switch,
  Tabs,
  Popconfirm,
  message,
  Tooltip,
  Row,
  Col,
  Statistic,
  Empty,
  Badge,
  Upload,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  EyeOutlined,
  UsergroupAddOutlined,
  QrcodeOutlined,
  ShareAltOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  SendOutlined,
  PictureOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  VideoCameraOutlined,
  UploadOutlined,
  FileOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "../hooks/useAuth.js";
import "./EInvitationModule.css";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const API_URL = import.meta.env.VITE_API_URL || "https://siptu.bpompalopo.com/core_api/api";

const getMediaUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("data:")) return url;
  let cleanUrl = url;
  if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
    return cleanUrl.replace(/\/storage\//i, "/api/media/");
  }
  cleanUrl = cleanUrl.startsWith("/") ? cleanUrl : "/" + cleanUrl;
  if (cleanUrl.startsWith("/storage/")) {
    cleanUrl = cleanUrl.replace("/storage/", "/api/media/");
  }
  const apiBase = API_URL.replace(/\/api\/?$/, "");
  return `${apiBase}${cleanUrl}`;
};

const BPOM_EVENT_PRESETS = [
  {
    key: "KIE BPOM",
    title: "Kegiatan KIE BPOM",
    icon: "📢",
    description: "Komunikasi, Informasi, & Edukasi Obat dan Makanan kepada masyarakat.",
    defaultCover: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80",
    theme: "bpom-navy",
  },
  {
    key: "Rapat Internal BPOM",
    title: "Rapat Internal BPOM",
    icon: "🏢",
    description: "Rapat Koordinasi, Evaluasi, & Briefing Internal Pegawai.",
    defaultCover: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200&auto=format&fit=crop&q=80",
    theme: "royal-emerald",
  },
  {
    key: "Sosialisasi",
    title: "Sosialisasi & Bimtek",
    icon: "🎓",
    description: "Sosialisasi Regulasi, Standardisasi, & Bimbingan Teknis Pelaku Usaha.",
    defaultCover: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1200&auto=format&fit=crop&q=80",
    theme: "bpom-navy",
  },
  {
    key: "Workshop",
    title: "Workshop & Pelatihan",
    icon: "💡",
    description: "Pelatihan Kompetensi Pegawai & Workshop Pengembangan Kapasitas.",
    defaultCover: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1200&auto=format&fit=crop&q=80",
    theme: "modern-slate",
  },
  {
    key: "Acara Formal",
    title: "Acara Formal / Serah Terima",
    icon: "🎗️",
    description: "Pelantikan, Serah Terima Jabatan, & Acara Kedinasan Resmi.",
    defaultCover: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200&auto=format&fit=crop&q=80",
    theme: "classic-gold",
  },
  {
    key: "Custom Event",
    title: "Undangan Custom",
    icon: "✨",
    description: "Undangan digital dengan kustomisasi bebas sesuai kebutuhan acara.",
    defaultCover: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=1200&auto=format&fit=crop&q=80",
    theme: "sunset-rose",
  },
];

const THEME_OPTIONS = [
  { key: "bpom-navy", label: "BPOM Navy & Gold", primary: "#0F5B99", secondary: "#D4AF37", bg: "#F0F4F8" },
  { key: "royal-emerald", label: "Royal Emerald", primary: "#059669", secondary: "#10B981", bg: "#ECFDF5" },
  { key: "classic-gold", label: "Classic Gold & Charcoal", primary: "#B45309", secondary: "#F59E0B", bg: "#FFFBEB" },
  { key: "modern-slate", label: "Modern Dark Slate", primary: "#334155", secondary: "#38BDF8", bg: "#F8FAFC" },
  { key: "sunset-rose", label: "Sunset Rose", primary: "#E11D48", secondary: "#FB7185", bg: "#FFF1F2" },
];

export default function EInvitationModule() {
  const { apiFetch } = useAuth();

  const [activeTab, setActiveTab] = useState("list");
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [selectedInvitation, setSelectedInvitation] = useState(null);
  const [guests, setGuests] = useState([]);
  const [loadingGuests, setLoadingGuests] = useState(false);

  // Modals
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [isAddGuestOpen, setIsAddGuestOpen] = useState(false);
  const [isBulkGuestOpen, setIsBulkGuestOpen] = useState(false);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);

  // Form & File states
  const [form] = Form.useForm();
  const [guestForm] = Form.useForm();
  const [bulkText, setBulkText] = useState("");
  const [manualQrInput, setManualQrInput] = useState("");
  const [checkInResult, setCheckInResult] = useState(null);
  const [mediaFileList, setMediaFileList] = useState([]);

  // Agenda list state
  const [agendas, setAgendas] = useState([
    { time: "08.00 - 08.30", title: "Registrasi Peserta & Presensi QR Code", speaker: "Panitia" },
    { time: "08.30 - 09.00", title: "Pembukaan & Sambutan Kepala Balai", speaker: "Kepala Balai POM di Palopo" },
    { time: "09.00 - 11.30", title: "Penyampaian Materia Utama & Diskusi", speaker: "Narasumber" },
    { time: "11.30 - 12.00", title: "Penutupan & Foto Bersama", speaker: "Panitia" },
  ]);

  // Live preview tracking state
  const [previewData, setPreviewData] = useState({
    title: "Undangan Kegiatan KIE BPOM di Palopo",
    event_category: "KIE BPOM",
    organizer: "Balai Besar POM di Palopo",
    badge_text: "PENGANTAR",
    intro_title: "Menuju Birokrasi Cerdas",
    description: "Komunikasi, Informasi, & Edukasi Obat dan Makanan kepada masyarakat.",
    quote_text: "Penerapan teknologi modern dalam manajemen SDM bukan sekadar mengadopsi teknologi, melainkan mentransformasi budaya kerja menuju efisiensi tanpa batas.",
    quote_author: "Balai Besar POM di Palopo",
    event_date: dayjs().add(3, "day").format("YYYY-MM-DD"),
    event_time_start: "08.30 WITA",
    location_type: "offline",
    location_name: "Aula Utama BPOM Palopo",
    location_address: "Jl. Andi Kambo No. 12, Kota Palopo",
    theme_color: "bpom-navy",
    cover_image: BPOM_EVENT_PRESETS[0].defaultCover,
  });

  const fetchInvitations = async () => {
    setLoading(true);
    try {
      let endpoint = "/e-invitations?per_page=50";
      if (search) endpoint += `&search=${encodeURIComponent(search)}`;
      if (categoryFilter !== "all") endpoint += `&category=${encodeURIComponent(categoryFilter)}`;

      const res = await apiFetch(endpoint);
      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType || !contentType.includes("application/json")) {
        setInvitations([]);
        return;
      }

      const json = await res.json();
      if (json.success && json.data) {
        setInvitations(json.data.data || []);
      } else {
        message.error(json.message || "Gagal memuat daftar undangan");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, [search, categoryFilter]);

  const fetchGuests = async (invitationId) => {
    setLoadingGuests(true);
    try {
      const res = await apiFetch(`/e-invitations/${invitationId}/guests`);
      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType || !contentType.includes("application/json")) {
        setGuests([]);
        return;
      }
      const json = await res.json();
      if (json.success) {
        setGuests(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingGuests(false);
    }
  };

  // Open Create Modal with Preset
  const handleSelectPreset = (preset) => {
    setEditingId(null);
    form.resetFields();
    setMediaFileList([]);

    const initialValues = {
      title: `${preset.title} - Balai POM Palopo`,
      event_category: preset.key,
      organizer: "Balai Besar POM di Palopo",
      badge_text: "PENGANTAR",
      intro_title: "Menuju Birokrasi Cerdas",
      description: preset.description,
      quote_text: "Penerapan teknologi modern dalam manajemen SDM bukan sekadar mengadopsi teknologi, melainkan mentransformasi budaya kerja menuju efisiensi tanpa batas.",
      quote_author: "Balai Besar POM di Palopo",
      event_date: dayjs().add(3, "day"),
      event_time_start: "08.30",
      event_time_end: "12.00",
      timezone: "WITA",
      location_type: "offline",
      location_name: "Aula Utama BPOM Palopo",
      location_address: "Jl. Andi Kambo No. 12, Kota Palopo",
      location_map_url: "https://maps.google.com",
      theme_color: preset.theme,
      font_family: "Segoe UI",
      cover_image: preset.defaultCover,
      enable_rsvp: true,
      enable_guestbook: true,
      enable_countdown: true,
      enable_qr: true,
    };

    form.setFieldsValue(initialValues);
    setPreviewData({
      ...initialValues,
      event_date: initialValues.event_date.format("YYYY-MM-DD"),
    });
    setIsEditorOpen(true);
  };

  const handleEditInvitation = (inv) => {
    setEditingId(inv.id);
    setMediaFileList([]);
    const initialValues = {
      ...inv,
      badge_text: inv.badge_text || "PENGANTAR",
      intro_title: inv.intro_title || "Menuju Birokrasi Cerdas",
      quote_text: inv.quote_text || `"Penerapan teknologi modern..."`,
      quote_author: inv.quote_author || "Balai Besar POM di Palopo",
      event_date: dayjs(inv.event_date),
      enable_rsvp: inv.custom_config?.enable_rsvp ?? true,
      enable_guestbook: inv.custom_config?.enable_guestbook ?? true,
      enable_countdown: inv.custom_config?.enable_countdown ?? true,
      enable_qr: inv.custom_config?.enable_qr ?? true,
      dress_code: inv.custom_config?.dress_code ?? "",
    };

    if (inv.agenda_timeline && Array.isArray(inv.agenda_timeline)) {
      setAgendas(inv.agenda_timeline);
    }

    form.setFieldsValue(initialValues);
    setPreviewData({
      ...inv,
      event_date: inv.event_date,
    });
    setIsEditorOpen(true);
  };

  const handleDeleteInvitation = async (id) => {
    try {
      const res = await apiFetch(`/e-invitations/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        message.success("Undangan berhasil dihapus");
        fetchInvitations();
      } else {
        message.error(json.message);
      }
    } catch (err) {
      message.error("Gagal menghapus undangan");
    }
  };

  const handleSaveInvitation = async (values) => {
    try {
      const formData = new FormData();
      formData.append("title", values.title);
      formData.append("event_category", values.event_category);
      formData.append("organizer", values.organizer || "Balai Besar POM di Palopo");
      formData.append("badge_text", values.badge_text || "PENGANTAR");
      formData.append("intro_title", values.intro_title || "Menuju Birokrasi Cerdas");
      formData.append("description", values.description || "");
      formData.append("quote_text", values.quote_text || "");
      formData.append("quote_author", values.quote_author || "Balai Besar POM di Palopo");
      formData.append("event_date", values.event_date.format("YYYY-MM-DD"));
      formData.append("event_time_start", values.event_time_start);
      formData.append("event_time_end", values.event_time_end || "");
      formData.append("timezone", values.timezone || "WITA");
      formData.append("location_type", values.location_type);
      formData.append("location_name", values.location_name || "");
      formData.append("location_address", values.location_address || "");
      formData.append("location_map_url", values.location_map_url || "");
      formData.append("online_meeting_link", values.online_meeting_link || "");
      formData.append("online_meeting_id", values.online_meeting_id || "");
      formData.append("theme_color", values.theme_color || "bpom-navy");
      formData.append("cover_image", values.cover_image || "");
      formData.append("agenda_timeline", JSON.stringify(agendas));
      formData.append("custom_config", JSON.stringify({
        enable_rsvp: values.enable_rsvp ?? true,
        enable_guestbook: values.enable_guestbook ?? true,
        enable_countdown: values.enable_countdown ?? true,
        enable_qr: values.enable_qr ?? true,
        dress_code: values.dress_code || "",
      }));

      if (mediaFileList.length > 0) {
        const fileObj = mediaFileList[0].originFileObj || mediaFileList[0];
        if (fileObj && (fileObj instanceof File || fileObj instanceof Blob)) {
          formData.append("background_media_file", fileObj);
        }
      }

      if (editingId) {
        formData.append("_method", "PUT");
      }

      const endpoint = editingId ? `/e-invitations/${editingId}` : "/e-invitations";

      const res = await apiFetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (res.status === 413) {
        message.error("Ukuran berkas melebihi batas maksimum upload server.");
        return;
      }

      const contentType = res.headers.get("content-type");
      const json = contentType && contentType.includes("application/json") ? await res.json() : null;

      if (!res.ok) {
        if (res.status === 422 && json) {
          const errMsg = json.errors
            ? Object.values(json.errors).flat().join(", ")
            : (json.message || "Data formulir tidak valid.");
          message.error(`Validasi gagal: ${errMsg}`);
          return;
        }
        message.error(`Gagal menyimpan undangan (HTTP Status ${res.status}). Silakan periksa ukuran berkas.`);
        return;
      }

      if (json?.success) {
        message.success(editingId ? "Undangan berhasil diperbarui" : "Undangan digital berhasil dibuat!");
        setIsEditorOpen(false);
        fetchInvitations();
      } else {
        message.error(json?.message || "Gagal menyimpan undangan");
      }
    } catch (err) {
      console.error(err);
      message.error("Terjadi kesalahan sistem saat menyimpan undangan");
    }
  };

  // Guest Management Actions
  const handleOpenGuests = (inv) => {
    setSelectedInvitation(inv);
    fetchGuests(inv.id);
    setIsGuestModalOpen(true);
  };

  const handleAddSingleGuest = async (values) => {
    if (!selectedInvitation) return;
    try {
      const res = await apiFetch(`/e-invitations/${selectedInvitation.id}/guests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const json = await res.json();
      if (json.success) {
        message.success("Tamu berhasil ditambahkan!");
        guestForm.resetFields();
        setIsAddGuestOpen(false);
        fetchGuests(selectedInvitation.id);
        fetchInvitations();
      } else {
        message.error(json.message);
      }
    } catch (err) {
      message.error("Gagal menambahkan tamu");
    }
  };

  const handleBulkAddGuests = async () => {
    if (!selectedInvitation || !bulkText.trim()) return;
    const lines = bulkText.split("\n").filter((l) => l.trim().length > 0);
    const guestsList = lines.map((line) => {
      const parts = line.split(",").map((p) => p.trim());
      return {
        guest_name: parts[0] || line.trim(),
        guest_institution: parts[1] || "",
        guest_category: parts[2] || "Reguler",
      };
    });

    try {
      const res = await apiFetch(`/e-invitations/${selectedInvitation.id}/guests/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ guests: guestsList }),
      });

      const json = await res.json();
      if (json.success) {
        message.success(json.message);
        setBulkText("");
        setIsBulkGuestOpen(false);
        fetchGuests(selectedInvitation.id);
        fetchInvitations();
      } else {
        message.error(json.message);
      }
    } catch (err) {
      message.error("Gagal melakukan impor tamu");
    }
  };

  const handleDeleteGuest = async (guestId) => {
    try {
      const res = await apiFetch(`/e-invitations/${selectedInvitation.id}/guests/${guestId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        message.success("Tamu berhasil dihapus");
        fetchGuests(selectedInvitation.id);
        fetchInvitations();
      }
    } catch (err) {
      message.error("Gagal menghapus tamu");
    }
  };

  // QR Code Check-in
  const handleCheckInGuest = async (qrSecret) => {
    if (!selectedInvitation || !qrSecret.trim()) return;
    try {
      const res = await apiFetch(`/e-invitations/${selectedInvitation.id}/check-in`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ qr_code_secret: qrSecret }),
      });
      const json = await res.json();
      setCheckInResult(json);
      if (json.success) {
        message.success(json.message);
        fetchGuests(selectedInvitation.id);
        fetchInvitations();
      } else {
        message.error(json.message);
      }
    } catch (err) {
      message.error("Gagal memproses presensi QR");
    }
  };

  // Share Link Helpers
  const copyPublicLink = (slug, token = "") => {
    const publicUrl = `${window.location.origin}/undangan/${slug}${token ? `?to=${encodeURIComponent(token)}` : ""}`;
    navigator.clipboard.writeText(publicUrl);
    message.success("Tautan undangan berhasil disalin!");
  };

  const copyWhatsAppText = (inv, guest = null) => {
    const publicUrl = `${window.location.origin}/undangan/${inv.slug}${guest ? `?to=${encodeURIComponent(guest.token)}` : ""}`;
    const text = `Kepada Yth. ${guest ? guest.guest_name : "Bapak/Ibu Tamu Undangan"}
${guest?.guest_institution ? `(${guest.guest_institution})` : ""}

Dengan hormat, kami mengundang Bapak/Ibu untuk menghadiri kegiatan:
📌 *${inv.title}*
🏢 Penyelenggara: ${inv.organizer}
📅 Hari/Tanggal: ${dayjs(inv.event_date).format("dddd, D MMMM YYYY")}
⏰ Waktu: ${inv.event_time_start} ${inv.timezone || "WITA"}
📍 Tempat: ${inv.location_name || "Sesuai Informasi Undangan"}

Silakan buka tautan undangan digital di bawah ini untuk konfirmasi kehadiran (RSVP):
👉 ${publicUrl}

Terima kasih atas perhatian dan partisipasi Bapak/Ibu.
_Salam hangat, Balai Besar POM di Palopo_`;

    navigator.clipboard.writeText(text);
    message.success("Pesan WhatsApp siap kirim berhasil disalin!");
  };

  // Columns for Invitations Table
  const invitationColumns = [
    {
      title: "Judul Undangan / Acara",
      dataIndex: "title",
      key: "title",
      render: (text, record) => (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <Text strong style={{ fontSize: "13px", color: "#0F5B99" }}>
            {text}
          </Text>
          <Text type="secondary" className="text-xs">
            {record.organizer} • {record.event_category}
          </Text>
          <div style={{ marginTop: "4px" }}>
            <Tag color={record.location_type === "online" ? "cyan" : record.location_type === "hybrid" ? "purple" : "blue"}>
              {record.location_type?.toUpperCase()}
            </Tag>
            <Tag color={record.status === "published" ? "green" : "orange"}>{record.status?.toUpperCase()}</Tag>
          </div>
        </div>
      ),
    },
    {
      title: "Waktu & Lokasi",
      key: "event_date",
      render: (_, record) => (
        <div style={{ fontSize: "12px" }}>
          <div>
            <CalendarOutlined style={{ color: "#0F5B99", marginRight: 4 }} />
            {dayjs(record.event_date).format("DD MMM YYYY")} ({record.event_time_start})
          </div>
          <div style={{ color: "#64748b", fontSize: "11px", marginTop: 2 }}>
            <EnvironmentOutlined style={{ marginRight: 4 }} />
            {record.location_name || "Online / TBD"}
          </div>
        </div>
      ),
    },
    {
      title: "Statistik Tamu",
      key: "stats",
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Total Tamu Terdaftar">
            <Tag color="default" icon={<UsergroupAddOutlined />}>
              {record.guests_count || 0}
            </Tag>
          </Tooltip>
          <Tooltip title="Konfirmasi Hadir">
            <Tag color="success" icon={<CheckCircleOutlined />}>
              {record.attending_count || 0}
            </Tag>
          </Tooltip>
          <Tooltip title="Presensi/Checked In">
            <Tag color="processing" icon={<QrcodeOutlined />}>
              {record.checked_in_count || 0}
            </Tag>
          </Tooltip>
        </Space>
      ),
    },
    {
      title: "Aksi & Tautan",
      key: "actions",
      width: 220,
      render: (_, record) => (
        <Space size="small" wrap>
          <Button
            size="small"
            type="primary"
            icon={<UsergroupAddOutlined />}
            onClick={() => handleOpenGuests(record)}
          >
            Tamu
          </Button>

          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => window.open(`/undangan/${record.slug}`, "_blank")}
          >
            Lihat
          </Button>

          <Button
            size="small"
            icon={<CopyOutlined />}
            onClick={() => copyPublicLink(record.slug)}
            title="Salin Tautan Publik"
          />

          <Button
            size="small"
            icon={<ShareAltOutlined />}
            onClick={() => copyWhatsAppText(record)}
            title="Salin Pesan WA"
          />

          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditInvitation(record)}
          />

          <Popconfirm
            title="Hapus undangan digital ini?"
            onConfirm={() => handleDeleteInvitation(record.id)}
            okText="Hapus"
            cancelText="Batal"
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Guest Table Columns
  const guestColumns = [
    {
      title: "Nama Tamu / Instansi",
      dataIndex: "guest_name",
      key: "guest_name",
      render: (text, record) => (
        <div>
          <Text strong style={{ fontSize: "12px" }}>
            {text}
          </Text>
          {record.guest_institution && (
            <div className="text-xs" style={{ color: "#64748b" }}>
              {record.guest_institution}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Kategori",
      dataIndex: "guest_category",
      key: "guest_category",
      render: (cat) => <Tag color={cat === "VIP" ? "gold" : cat === "Internal" ? "blue" : "default"}>{cat}</Tag>,
    },
    {
      title: "Status RSVP",
      dataIndex: "rsvp_status",
      key: "rsvp_status",
      render: (status, record) => {
        let color = "default";
        let label = "Belum Konfirmasi";
        if (status === "attending") {
          color = "success";
          label = `Hadir (${record.pax_count} pax)`;
        } else if (status === "declined") {
          color = "error";
          label = "Tidak Hadir";
        } else if (status === "tentative") {
          color = "warning";
          label = "Ragu-ragu";
        }
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: "Presensi QR",
      dataIndex: "checked_in_at",
      key: "checked_in_at",
      render: (time) =>
        time ? (
          <Tag color="green" icon={<CheckCircleOutlined />}>
            {dayjs(time).format("HH:mm WITA")}
          </Tag>
        ) : (
          <Tag color="default">Belum Hadir</Tag>
        ),
    },
    {
      title: "Aksi",
      key: "guest_actions",
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            icon={<CopyOutlined />}
            onClick={() => copyPublicLink(selectedInvitation.slug, record.token)}
            title="Salin Link Personal Tamu"
          >
            Link Personal
          </Button>

          <Button
            size="small"
            icon={<ShareAltOutlined />}
            onClick={() => copyWhatsAppText(selectedInvitation, record)}
            title="Salin Pesan WA Tamu"
          />

          <Popconfirm
            title="Hapus tamu ini?"
            onConfirm={() => handleDeleteGuest(record.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="module-section e-invitation-container">
      {/* Module Header Toolbar following SIPTU Typography Standard */}
      <div className="module-toolbar">
        <div>
          <Title level={4} className="module-title">
            E-Invitation (Undangan Digital Custom)
          </Title>
          <Text className="module-subtitle">
            Buat, kustomisasi, & kelola undangan digital interaktif untuk Kegiatan KIE BPOM, Rapat Internal, & Event Kedinasan.
          </Text>
        </div>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={fetchInvitations}>
            Segarkan
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleSelectPreset(BPOM_EVENT_PRESETS[0])}
          >
            Buat Undangan Baru
          </Button>
        </Space>
      </div>

      {/* Preset Selector Banner */}
      <Card size="small" title="Pilih Template Undangan Kedinasan BPOM">
        <div className="preset-category-grid">
          {BPOM_EVENT_PRESETS.map((preset) => (
            <div
              key={preset.key}
              className="preset-category-card"
              onClick={() => handleSelectPreset(preset)}
            >
              <span className="preset-icon">{preset.icon}</span>
              <div className="preset-title">{preset.title}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Filter & List Undangan */}
      <Card size="small">
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={8}>
            <Input.Search
              placeholder="Cari judul, kategori, atau penyelenggara..."
              allowClear
              onSearch={(val) => setSearch(val)}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              style={{ width: "100%" }}
              value={categoryFilter}
              onChange={(val) => setCategoryFilter(val)}
            >
              <Option value="all">Semua Kategori</Option>
              {BPOM_EVENT_PRESETS.map((p) => (
                <Option key={p.key} value={p.key}>
                  {p.title}
                </Option>
              ))}
            </Select>
          </Col>
        </Row>

        <Table
          columns={invitationColumns}
          dataSource={invitations}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          className="e-invitation-table"
        />
      </Card>

      {/* Modal Editor / Builder Undangan Digital */}
      <Modal
        title={editingId ? "Edit Undangan Digital" : "Buat Undangan Digital Custom"}
        open={isEditorOpen}
        onCancel={() => setIsEditorOpen(false)}
        width={1100}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveInvitation}
          onValuesChange={(_, allValues) => {
            setPreviewData((prev) => ({
              ...prev,
              ...allValues,
              event_date: allValues.event_date ? allValues.event_date.format("YYYY-MM-DD") : prev.event_date,
            }));
          }}
        >
          <div className="editor-preview-wrapper">
            {/* Form Section Left */}
            <div>
              <Tabs defaultActiveKey="1">
                <Tabs.TabPane tab="1. Detail Acara" key="1">
                  <Form.Item
                    name="title"
                    label="Judul Undangan / Acara"
                    rules={[{ required: true, message: "Judul wajib diisi" }]}
                  >
                    <Input placeholder="Contoh: Sosialisasi Keamanan Pangan & KIE BPOM" />
                  </Form.Item>

                  <Row gutter={12}>
                    <Col span={12}>
                      <Form.Item name="event_category" label="Kategori Acara" rules={[{ required: true }]}>
                        <Select>
                          {BPOM_EVENT_PRESETS.map((p) => (
                            <Option key={p.key} value={p.key}>
                              {p.title}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="organizer" label="Penyelenggara / Unit Kerja">
                        <Input placeholder="Balai Besar POM di Palopo" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={12}>
                    <Col span={8}>
                      <Form.Item name="event_date" label="Tanggal Acara" rules={[{ required: true }]}>
                        <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name="event_time_start" label="Waktu Mulai" rules={[{ required: true }]}>
                        <Input placeholder="08.30" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name="timezone" label="Zona Waktu">
                        <Select defaultValue="WITA">
                          <Option value="WITA">WITA (UTC+8)</Option>
                          <Option value="WIB">WIB (UTC+7)</Option>
                          <Option value="WIT">WIT (UTC+9)</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item name="location_type" label="Tipe Lokasi" rules={[{ required: true }]}>
                    <Select>
                      <Option value="offline">Offline / Tatap Muka</Option>
                      <Option value="online">Online / Virtual Meeting (Zoom/GMeet)</Option>
                      <Option value="hybrid">Hybrid (Offline + Online)</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item name="location_name" label="Nama Tempat / Ruangan">
                    <Input placeholder="Aula Utama Balai Besar POM di Palopo" />
                  </Form.Item>

                  <Form.Item name="location_address" label="Alamat Lengkap">
                    <TextArea rows={2} placeholder="Jl. Andi Kambo No. 12, Kota Palopo, Sulawesi Selatan" />
                  </Form.Item>

                  <Form.Item name="location_map_url" label="Link Google Maps (Peta)">
                    <Input placeholder="https://maps.google.com/..." />
                  </Form.Item>

                  <Row gutter={12}>
                    <Col span={12}>
                      <Form.Item name="online_meeting_link" label="Link Meeting (Zoom / GMeet)">
                        <Input placeholder="https://zoom.us/j/..." />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="online_meeting_id" label="Meeting ID / Passcode">
                        <Input placeholder="ID: 123 456 789 | Pass: bpom2026" />
                      </Form.Item>
                    </Col>
                  </Row>
                </Tabs.TabPane>

                <Tabs.TabPane tab="2. Pengantar & Kutipan" key="2">
                  <Form.Item name="badge_text" label="Teks Badge Pengantar">
                    <Input placeholder="PENGANTAR" />
                  </Form.Item>

                  <Form.Item name="intro_title" label="Judul Pengantar">
                    <Input placeholder="Menuju Birokrasi Cerdas" />
                  </Form.Item>

                  <Form.Item name="description" label="Deskripsi / Narasi Pengantar">
                    <TextArea rows={3} placeholder="Komunikasi, Informasi, & Edukasi Obat dan Makanan kepada masyarakat." />
                  </Form.Item>

                  <Form.Item name="quote_text" label="Teks Kutipan (Quote)">
                    <TextArea rows={3} placeholder="Penerapan teknologi modern dalam manajemen SDM bukan sekadar..." />
                  </Form.Item>

                  <Form.Item name="quote_author" label="Penulis Kutipan / Instansi">
                    <Input placeholder="Balai Besar POM di Palopo" />
                  </Form.Item>
                </Tabs.TabPane>

                <Tabs.TabPane tab="3. Background & Desain" key="3">
                  <Form.Item label="Pilihan Tema Warna Visual">
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      {THEME_OPTIONS.map((t) => (
                        <div
                          key={t.key}
                          className={`theme-color-option ${previewData.theme_color === t.key ? "selected" : ""}`}
                          style={{ background: t.primary }}
                          onClick={() => {
                            form.setFieldsValue({ theme_color: t.key });
                            setPreviewData((prev) => ({ ...prev, theme_color: t.key }));
                          }}
                          title={t.label}
                        />
                      ))}
                    </div>
                  </Form.Item>

                  <Form.Item label="Upload Gambar / Video Latar Belakang (Maksimal 30 MB)">
                    <Upload
                      maxCount={1}
                      fileList={mediaFileList}
                      beforeUpload={(file) => {
                        const isLt30M = file.size / 1024 / 1024 < 30;
                        if (!isLt30M) {
                          message.error("Ukuran berkas tidak boleh melebihi 30 MB!");
                          return Upload.LIST_IGNORE;
                        }
                        setMediaFileList([file]);
                        return false;
                      }}
                      onRemove={() => setMediaFileList([])}
                    >
                      <Button icon={<UploadOutlined />}>Pilih Berkas Gambar/Video (Max 30 MB)</Button>
                    </Upload>
                    <Text type="secondary" className="text-xs" style={{ display: "block", marginTop: 4 }}>
                      Dukungan berkas MP4, WebM, JPG, PNG (durasi video singkat direkomendasikan).
                    </Text>
                  </Form.Item>

                  <Form.Item name="cover_image" label="Atau Masukkan URL Gambar Sampul / Banner">
                    <Input placeholder="https://..." />
                  </Form.Item>

                  <Row gutter={12}>
                    <Col span={12}>
                      <Form.Item name="enable_rsvp" label="Aktifkan Form RSVP Konfirmasi" valuePropName="checked">
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="enable_guestbook" label="Aktifkan Buku Tamu & Ucapan" valuePropName="checked">
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="enable_countdown" label="Tampilkan Hitung Mundur (Countdown)" valuePropName="checked">
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="enable_qr" label="Tampilkan Tiket Presensi QR Code" valuePropName="checked">
                        <Switch />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item name="dress_code" label="Pakaian / Dress Code">
                    <Input placeholder="Batik / Pakaian Dinas Harian (PDH)" />
                  </Form.Item>
                </Tabs.TabPane>

                <Tabs.TabPane tab="4. Susunan Agenda" key="4">
                  <div style={{ marginBottom: 12 }}>
                    <Text type="secondary" className="text-xs">
                      Atur susunan agenda kegiatan yang akan tampil di halaman undangan.
                    </Text>
                  </div>
                  {agendas.map((item, idx) => (
                    <Card size="small" key={idx} style={{ marginBottom: 8, background: "#f8fafc" }}>
                      <Row gutter={8} align="middle">
                        <Col span={6}>
                          <Input
                            placeholder="Waktu (08.00-09.00)"
                            value={item.time}
                            onChange={(e) => {
                              const updated = [...agendas];
                              updated[idx].time = e.target.value;
                              setAgendas(updated);
                            }}
                          />
                        </Col>
                        <Col span={10}>
                          <Input
                            placeholder="Nama Sesi / Acara"
                            value={item.title}
                            onChange={(e) => {
                              const updated = [...agendas];
                              updated[idx].title = e.target.value;
                              setAgendas(updated);
                            }}
                          />
                        </Col>
                        <Col span={6}>
                          <Input
                            placeholder="Pemateri/PJ"
                            value={item.speaker}
                            onChange={(e) => {
                              const updated = [...agendas];
                              updated[idx].speaker = e.target.value;
                              setAgendas(updated);
                            }}
                          />
                        </Col>
                        <Col span={2}>
                          <Button
                            danger
                            type="text"
                            icon={<DeleteOutlined />}
                            onClick={() => setAgendas(agendas.filter((_, i) => i !== idx))}
                          />
                        </Col>
                      </Row>
                    </Card>
                  ))}
                  <Button
                    type="dashed"
                    block
                    icon={<PlusOutlined />}
                    onClick={() => setAgendas([...agendas, { time: "", title: "", speaker: "" }])}
                  >
                    Tambah Agenda
                  </Button>
                </Tabs.TabPane>
              </Tabs>

              <div style={{ marginTop: 24, textAlign: "right" }}>
                <Space>
                  <Button onClick={() => setIsEditorOpen(false)}>Batal</Button>
                  <Button type="primary" htmlType="submit">
                    Simpan Undangan Digital
                  </Button>
                </Space>
              </div>
            </div>

            {/* Live Interactive Preview Right */}
            <div className="live-preview-container">
              <Text strong style={{ color: "#cbd5e1", fontSize: "11px", letterSpacing: "0.05em" }}>
                📱 LIVE RESPONSIVE PREVIEW
              </Text>
              <div className="live-preview-phone" style={{ marginTop: 8 }}>
                <div className="phone-header-bar">
                  <span>UNDANGAN DIGITAL BPOM</span>
                  <span>100%</span>
                </div>
                <div
                  className="phone-cover-preview"
                  style={{
                    backgroundImage: `url("${getMediaUrl(previewData.cover_image || previewData.background_video_url || BPOM_EVENT_PRESETS[0].defaultCover)}")`,
                  }}
                >
                  <div className="phone-cover-overlay" />
                  <div className="phone-cover-content">
                    <Tag color="gold" style={{ fontSize: "10px", marginBottom: 2 }}>
                      {previewData.event_category || "KIE BPOM"}
                    </Tag>
                    <div style={{ fontSize: "13px", fontWeight: "bold", lineHeight: 1.2 }}>
                      {previewData.title || "Judul Undangan Acara"}
                    </div>
                  </div>
                </div>

                <div className="phone-body-content">
                  <div style={{ background: "#f1f5f9", padding: "8px 10px", borderRadius: 6 }}>
                    <div style={{ fontWeight: 600, fontSize: "11px", color: "#0F5B99" }}>
                      📅 {dayjs(previewData.event_date).format("dddd, DD MMMM YYYY")}
                    </div>
                    <div style={{ fontSize: "10.5px", color: "#475569" }}>
                      ⏰ {previewData.event_time_start} {previewData.timezone || "WITA"}
                    </div>
                    <div style={{ fontSize: "10.5px", color: "#475569" }}>
                      📍 {previewData.location_name || "Aula Utama BPOM Palopo"}
                    </div>
                  </div>

                  <div style={{ fontSize: "10.5px", color: "#334155" }}>
                    <strong>{previewData.badge_text || "PENGANTAR"}: {previewData.intro_title}</strong>
                    <div>{previewData.description || "Pengantar undangan digital..."}</div>
                  </div>

                  <div style={{ background: "#0F5B99", color: "#fff", textAlign: "center", padding: 8, borderRadius: 6, fontWeight: 600 }}>
                    ✉️ Buka Undangan Digital
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Form>
      </Modal>

      {/* Modal Management Tamu & Presensi */}
      <Modal
        title={selectedInvitation ? `Daftar Tamu: ${selectedInvitation.title}` : "Daftar Tamu"}
        open={isGuestModalOpen}
        onCancel={() => setIsGuestModalOpen(false)}
        width={950}
        footer={null}
      >
        {selectedInvitation && (
          <Space style={{ marginBottom: 16 }} wrap>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsAddGuestOpen(true)}
            >
              Tambah Tamu
            </Button>

            <Button
              icon={<UsergroupAddOutlined />}
              onClick={() => setIsBulkGuestOpen(true)}
            >
              Impor Banyak Tamu
            </Button>

            <Button
              type="dashed"
              icon={<QrcodeOutlined />}
              onClick={() => {
                setCheckInResult(null);
                setManualQrInput("");
                setIsQrScannerOpen(true);
              }}
            >
              Scanner Presensi QR
            </Button>
          </Space>
        )}

        <Table
          columns={guestColumns}
          dataSource={guests}
          rowKey="id"
          loading={loadingGuests}
          pagination={{ pageSize: 8 }}
          className="e-invitation-table"
        />
      </Modal>

      {/* Modal Add Single Guest */}
      <Modal
        title="Tambah Tamu Undangan"
        open={isAddGuestOpen}
        onCancel={() => setIsAddGuestOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={guestForm} layout="vertical" onFinish={handleAddSingleGuest}>
          <Form.Item
            name="guest_name"
            label="Nama Lengkap Tamu / Jabatan"
            rules={[{ required: true, message: "Nama tamu wajib diisi" }]}
          >
            <Input placeholder="Dr. H. Ahmad Fauzi, M.Si" />
          </Form.Item>

          <Form.Item name="guest_institution" label="Instansi / Unit Kerja">
            <Input placeholder="Dinas Kesehatan Kota Palopo" />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="guest_category" label="Kategori Tamu" defaultValue="Reguler">
                <Select>
                  <Option value="VIP">VIP / Kehormatan</Option>
                  <Option value="Internal">Internal BPOM</Option>
                  <Option value="External">Eksternal / Instansi</Option>
                  <Option value="Reguler">Reguler</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="guest_phone" label="No WhatsApp / Telepon">
                <Input placeholder="081234567890" />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ textAlign: "right", marginTop: 16 }}>
            <Space>
              <Button onClick={() => setIsAddGuestOpen(false)}>Batal</Button>
              <Button type="primary" htmlType="submit">
                Simpan Tamu
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Modal Bulk Add Guests */}
      <Modal
        title="Impor Tamu Sekaligus (Bulk Import)"
        open={isBulkGuestOpen}
        onCancel={() => setIsBulkGuestOpen(false)}
        onOk={handleBulkAddGuests}
        okText="Impor Semua Tamu"
      >
        <div style={{ marginBottom: 8 }}>
          <Text type="secondary" className="text-xs">
            Masukkan daftar tamu per baris dengan format: <strong>Nama, Instansi, Kategori</strong>
          </Text>
        </div>
        <TextArea
          rows={8}
          placeholder={`Bapak Ahmad, Dinas Kesehatan Kota Palopo, VIP\nIbu Nur, Puskesmas Wara, External\nTim Sertifikasi, Internal BPOM, Internal`}
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
        />
      </Modal>

      {/* Modal QR Code Scanner Presensi */}
      <Modal
        title="Scanner Presensi Kehadiran QR Code"
        open={isQrScannerOpen}
        onCancel={() => setIsQrScannerOpen(false)}
        footer={null}
      >
        <div className="qr-scan-box">
          <QrcodeOutlined style={{ fontSize: 48, color: "#0F5B99", marginBottom: 12 }} />
          <Title level={5}>Input / Scan Kode QR Presensi Tamu</Title>
          <Paragraph type="secondary" className="text-xs">
            Masukkan QR Secret / Kode Token yang tertera pada tiket undangan digital tamu.
          </Paragraph>

          <Input.Search
            placeholder="INV-XXXX-XXXX atau Kode Token..."
            enterButton="Catat Presensi"
            size="large"
            value={manualQrInput}
            onChange={(e) => setManualQrInput(e.target.value)}
            onSearch={(val) => handleCheckInGuest(val)}
          />

          {checkInResult && (
            <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: checkInResult.success ? "#f0fdf4" : "#fef2f2" }}>
              <Text strong style={{ color: checkInResult.success ? "#166534" : "#991b1b" }}>
                {checkInResult.message}
              </Text>
              {checkInResult.data && (
                <div style={{ fontSize: "12px", marginTop: 4 }}>
                  <div>Nama: <strong>{checkInResult.data.guest_name}</strong></div>
                  <div>Instansi: {checkInResult.data.guest_institution || "-"}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
