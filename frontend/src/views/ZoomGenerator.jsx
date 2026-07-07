import { useState, useEffect } from "react";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Select,
  Space,
  Typography,
  App as AntdApp,
  Row,
  Col,
  Empty,
  Tag,
  Divider,
} from "antd";
import {
  VideoCameraOutlined,
  PlusOutlined,
  CopyOutlined,
  DeleteOutlined,
  LinkOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "../hooks/useAuth.js";
import { buildMessageAdapter } from "../utils/notify.js";
import "./ZoomGenerator.css";

const { Title, Text, Paragraph } = Typography;

export default function ZoomGenerator() {
  const { apiFetch } = useAuth();
  const { message } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);

  const [form] = Form.useForm();

  // Zoom users list from backend Zoom credentials
  const [zoomUsers, setZoomUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userError, setUserError] = useState(null);
  const [userWarning, setUserWarning] = useState(null);

  // Form submit state
  const [submitting, setSubmitting] = useState(false);
  const [meetingResult, setMeetingResult] = useState(null);

  // Local storage history
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("minitools_zoom_history") ?? "[]");
    } catch {
      return [];
    }
  });

  // Fetch Zoom users under the account credentials
  useEffect(() => {
    const fetchZoomUsers = async () => {
      setLoadingUsers(true);
      setUserError(null);
      setUserWarning(null);
      try {
        const res = await apiFetch("/zoom/users");
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.message ?? "Gagal mengambil daftar user Zoom.");
        }
        
        const usersList = data.users ?? [];
        setZoomUsers(usersList);
        
        if (data.is_fallback) {
          setUserWarning("Scope 'user:read:admin' tidak diizinkan pada aplikasi Zoom Anda. Rapat akan otomatis dibuat menggunakan host utama ('me').");
        }
        
        if (usersList.length > 0) {
          form.setFieldsValue({ user_id: usersList[0].id });
        }
      } catch (err) {
        console.error(err);
        setUserError(err.message + ". Menggunakan opsi default host (me).");
        // Fallback option in case API fails completely
        const fallbackList = [{ id: "me", first_name: "Default", last_name: "Host (me)", email: "Pemilik Akun Zoom" }];
        setZoomUsers(fallbackList);
        form.setFieldsValue({ user_id: "me" });
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchZoomUsers();
  }, [apiFetch, form]);

  const saveHistory = (newHistory) => {
    setHistory(newHistory);
    localStorage.setItem("minitools_zoom_history", JSON.stringify(newHistory));
  };

  const handleCreateMeeting = async (values) => {
    setSubmitting(true);
    setMeetingResult(null);
    try {
      const res = await apiFetch("/zoom/meetings", {
        method: "POST",
        body: JSON.stringify(values),
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData?.message ?? "Gagal membuat meeting Zoom.");
      }

      const raw = resData.data;
      const meetingItem = {
        meetingId: raw.id,
        joinUrl: raw.join_url,
        startUrl: raw.start_url || "",
        password: raw.password || "",
        startTime: raw.start_time,
        duration: raw.duration || values.duration,
        topic: values.topic,
        hostEmail: zoomUsers.find((u) => u.id === values.user_id)?.email ?? values.user_id,
      };

      // Add to local history list (limit 30 items)
      const updatedHistory = [meetingItem, ...history.filter((h) => h.meetingId !== meetingItem.meetingId)].slice(0, 30);
      saveHistory(updatedHistory);

      setMeetingResult(meetingItem);
      message.success("Meeting Zoom berhasil dibuat!");
    } catch (err) {
      console.error(err);
      notification.error({
        message: "Gagal Membuat Meeting",
        description: err.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success("Teks berhasil disalin!");
    } catch {
      // Fallback
      const t = document.createElement("textarea");
      t.value = text;
      document.body.appendChild(t);
      t.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(t);
      if (ok) {
        message.success("Teks berhasil disalin!");
      } else {
        message.error("Gagal menyalin teks.");
      }
    }
  };

  const handleDeleteHistory = (idx) => {
    const updated = [...history];
    updated.splice(idx, 1);
    saveHistory(updated);
    message.info("Riwayat dihapus.");
  };

  const handleClearHistory = () => {
    if (window.confirm("Hapus seluruh riwayat meeting?")) {
      saveHistory([]);
      message.success("Seluruh riwayat dibersihkan.");
    }
  };

  return (
    <div className="zoom-generator-container">
      <div className="zoom-header-section">
        <Title level={3}>
          <VideoCameraOutlined style={{ marginRight: 8 }} /> Zoom Meeting Generator
        </Title>
        <p>
          Digital Toolkit untuk membuat dan memperbarui tautan rapat Zoom instan menggunakan akun host resmi Balai POM di Palopo.
        </p>
      </div>

      {userError && (
        <Alert
          type="error"
          message="Koneksi Zoom API Gagal"
          description={
            <div>
              <p>Sistem tidak dapat terhubung ke Zoom API menggunakan kredensial yang tersedia. Harap periksa kredensial di file .env Anda.</p>
              <Text type="secondary" style={{ fontSize: 12 }}>Detail Error: {userError}</Text>
            </div>
          }
          showIcon
          className="zoom-credential-alert"
        />
      )}

      {userWarning && !userError && (
        <Alert
          type="info"
          message="Mode Host Tunggal Aktif"
          description={userWarning}
          showIcon
          style={{ marginBottom: 20 }}
        />
      )}

      <Row gutter={[24, 24]}>
        {/* Form Panel */}
        <Col xs={24} lg={10}>
          <Card className="zoom-panel-card" title="Detail Room Baru" variant="borderless">
            <Form
              layout="vertical"
              form={form}
              onFinish={handleCreateMeeting}
              initialValues={{
                topic: "Rapat Koordinasi Balai POM",
                duration: 60,
              }}
              requiredMark={false}
            >
              <Form.Item
                name="user_id"
                label="Host / Akun Zoom"
                rules={[{ required: true, message: "Pilih host Zoom" }]}
              >
                <Select
                  placeholder="Pilih host..."
                  loading={loadingUsers}
                  disabled={zoomUsers.length === 0}
                  options={zoomUsers.map((u) => ({
                    value: u.id,
                    label: `${u.first_name} ${u.last_name || ""} (${u.email})`,
                  }))}
                />
              </Form.Item>

              <Form.Item
                name="topic"
                label="Topik Rapat"
                rules={[{ required: true, message: "Masukkan topik meeting" }]}
              >
                <Input placeholder="Contoh: Rapat Evaluasi Kinerja Mingguan" />
              </Form.Item>

              <Form.Item name="agenda" label="Agenda Rapat (Opsional)">
                <Input.TextArea placeholder="Tulis rincian singkat pembahasan rapat..." rows={2} />
              </Form.Item>

              <Form.Item
                name="duration"
                label="Durasi Rapat"
                rules={[{ required: true, message: "Pilih durasi rapat" }]}
              >
                <Select
                  options={[
                    { label: "30 Menit", value: 30 },
                    { label: "60 Menit (1 Jam)", value: 60 },
                    { label: "90 Menit (1.5 Jam)", value: 90 },
                    { label: "120 Menit (2 Jam)", value: 120 },
                    { label: "180 Menit (3 Jam)", value: 180 },
                  ]}
                />
              </Form.Item>

              <Button
                type="primary"
                className="btn-zoom-primary"
                htmlType="submit"
                block
                loading={submitting}
                icon={<PlusOutlined />}
              >
                Buat Room Rapat
              </Button>
            </Form>

            {/* Smart Caching Info */}
            <div style={{ marginTop: 16, display: "flex", gap: 8, background: "#f0f9ff", border: "1px solid #e0f2fe", borderRadius: 8, padding: 12 }}>
              <InfoCircleOutlined style={{ color: "#0b56a4", marginTop: 2 }} />
              <div style={{ fontSize: 11, color: "#0369a1", lineHeight: 1.4 }}>
                <strong>Smart Caching:</strong> Meeting ID yang dibuat untuk satu akun host akan digunakan kembali selama hari yang sama. Topik dan agenda akan diperbarui otomatis untuk mencegah penumpukan tautan rapat.
              </div>
            </div>
          </Card>

          {/* Creation Result */}
          {meetingResult && (
            <div className="zoom-result-box">
              <Space direction="vertical" style={{ width: "100%" }} size="small">
                <Space>
                  <CheckCircleOutlined style={{ color: "#16a34a", fontSize: 18 }} />
                  <strong style={{ color: "#14532d", fontSize: 14 }}>Room Rapat Siap Digunakan!</strong>
                </Space>
                <Divider style={{ margin: "8px 0" }} />
                <div style={{ fontSize: 12, color: "#14532d" }}>
                  <Row style={{ marginBottom: 4 }}>
                    <Col span={8}>ID Rapat</Col>
                    <Col span={16}>: <strong style={{ fontFamily: "monospace" }}>{meetingResult.meetingId}</strong></Col>
                  </Row>
                  <Row style={{ marginBottom: 4 }}>
                    <Col span={8}>Sandi (Pass)</Col>
                    <Col span={16}>: <strong>{meetingResult.password || "—"}</strong></Col>
                  </Row>
                  <Row style={{ marginBottom: 8 }}>
                    <Col span={8}>Host Akun</Col>
                    <Col span={16} className="truncate">: {meetingResult.hostEmail}</Col>
                  </Row>
                </div>

                {/* Host Link Section */}
                <div style={{ background: "#f8fafc", padding: 10, borderRadius: 6, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                    🔑 Link Host (Mulai Rapat / Admin):
                  </div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <div style={{ flex: 1, wordBreak: "break-all", fontSize: 10, background: "white", padding: "4px 8px", border: "1px solid #cbd5e1", borderRadius: 4, maxHeight: 38, overflowY: "auto" }}>
                      {meetingResult.startUrl || meetingResult.joinUrl}
                    </div>
                    <Button
                      size="small"
                      type="primary"
                      className="btn-zoom-primary"
                      onClick={() => window.open(meetingResult.startUrl || meetingResult.joinUrl, "_blank")}
                      icon={<LinkOutlined />}
                    />
                    <Button
                      size="small"
                      onClick={() => handleCopy(meetingResult.startUrl || meetingResult.joinUrl)}
                      icon={<CopyOutlined />}
                    />
                  </div>
                </div>

                {/* Participant Link Section */}
                <div style={{ background: "#f0fdf4", padding: 10, borderRadius: 6, border: "1px solid #bbf7d0", marginTop: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#14532d", marginBottom: 4 }}>
                    👥 Link Peserta (Gabung / Staf):
                  </div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <div style={{ flex: 1, wordBreak: "break-all", fontSize: 10, background: "white", padding: "4px 8px", border: "1px solid #bbf7d0", borderRadius: 4, maxHeight: 38, overflowY: "auto" }}>
                      {meetingResult.joinUrl}
                    </div>
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => window.open(meetingResult.joinUrl, "_blank")}
                      icon={<LinkOutlined />}
                    />
                    <Button
                      size="small"
                      onClick={() => handleCopy(meetingResult.joinUrl)}
                      icon={<CopyOutlined />}
                    />
                  </div>
                </div>
              </Space>
            </div>
          )}
        </Col>

        {/* History Panel */}
        <Col xs={24} lg={14}>
          <Card
            title="Riwayat Pembuatan Room"
            variant="borderless"
            className="zoom-panel-card"
            extra={
              history.length > 0 && (
                <Button
                  danger
                  type="text"
                  size="small"
                  onClick={handleClearHistory}
                  icon={<DeleteOutlined />}
                >
                  Hapus Semua
                </Button>
              )
            }
          >
            <div className="zoom-history-scroll">
              {history.length === 0 ? (
                <Empty description="Belum ada riwayat pembuatan room rapat Zoom." style={{ padding: "40px 0" }} />
              ) : (
                history.map((m, idx) => (
                  <div key={idx} className="zoom-history-item">
                    <Row justify="space-between" align="middle" style={{ marginBottom: 4 }}>
                      <Col span={18}>
                        <Text strong style={{ fontSize: 14, color: "#1e293b" }}>{m.topic}</Text>
                      </Col>
                      <Col span={6} style={{ textAlign: "right" }}>
                        <Tag color="geekblue" style={{ marginRight: 0 }}>{m.duration} Menit</Tag>
                      </Col>
                    </Row>
                    <Paragraph type="secondary" style={{ fontSize: 11, margin: "0 0 12px 0" }}>
                      Dibuat pada: {dayjs(m.startTime).format("dddd, D MMM YYYY, HH:mm")} WITA | Host: {m.hostEmail}
                    </Paragraph>

                    <Row gutter={8} style={{ background: "white", padding: 8, borderRadius: 6, border: "1px solid #f1f5f9" }}>
                      <Col span={24} md={8} style={{ fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "center", borderRight: "1px solid #f1f5f9", paddingRight: 12 }}>
                        <Text type="secondary">ID: <strong style={{ color: "#334155", fontFamily: "monospace" }}>{m.meetingId}</strong></Text>
                        <Button
                          type="link"
                          size="small"
                          onClick={() => handleCopy(m.meetingId)}
                          icon={<CopyOutlined />}
                        />
                      </Col>
                      <Col span={24} md={8} style={{ fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "center", borderRight: "1px solid #f1f5f9", paddingRight: 12, paddingLeft: 12 }}>
                        <Text type="secondary">Sandi: <strong style={{ color: "#334155" }}>{m.password || "—"}</strong></Text>
                        {m.password && (
                          <Button
                            type="link"
                            size="small"
                            onClick={() => handleCopy(m.password)}
                            icon={<CopyOutlined />}
                          />
                        )}
                      </Col>
                      <Col span={24} md={8} style={{ fontSize: 12, display: "flex", gap: 4, justifyContent: "flex-end", alignItems: "center", paddingLeft: 12 }}>
                        <Button
                          type="text"
                          size="small"
                          onClick={() => handleCopy(m.startUrl || m.joinUrl)}
                          title="Salin Link Host"
                          icon={<CopyOutlined />}
                        >
                          Host
                        </Button>
                        <Button
                          type="text"
                          size="small"
                          onClick={() => handleCopy(m.joinUrl)}
                          title="Salin Link Peserta"
                          icon={<CopyOutlined />}
                        >
                          User
                        </Button>
                      </Col>
                    </Row>

                    <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <Button
                        size="small"
                        type="link"
                        danger
                        onClick={() => handleDeleteHistory(idx)}
                        icon={<DeleteOutlined />}
                      />
                      {m.startUrl && (
                        <Button
                          size="small"
                          type="default"
                          onClick={() => window.open(m.startUrl, "_blank")}
                        >
                          Mulai (Host)
                        </Button>
                      )}
                      <Button
                        size="small"
                        type="primary"
                        className="btn-zoom-primary"
                        onClick={() => window.open(m.joinUrl, "_blank")}
                      >
                        Gabung (Peserta)
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
