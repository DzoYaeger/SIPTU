import { useState, useEffect } from "react";
import {
  App as AntdApp,
  Card,
  Typography,
  TimePicker,
  Button,
  Space,
  Row,
  Col,
  Divider,
  Spin,
} from "antd";
import {
  SaveOutlined,
  HistoryOutlined,
  CoffeeOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "../hooks/useAuth.js";
import { buildMessageAdapter } from "../utils/notify.js";

const { Title, Text } = Typography;

const RispegPengaturanIzinKeluar = () => {
  const { apiFetch } = useAuth();
  const { message } = AntdApp.useApp();
  const msg = buildMessageAdapter(message);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    mon_thu: { start: "12:00", end: "13:00" },
    fri: { start: "12:00", end: "13:30" },
  });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const r = await apiFetch("/admin/exit-permit-settings");
      if (r.ok) {
        const data = await r.json();
        setSettings(data);
      }
    } catch (e) {
      msg.error({ message: "Gagal memuat pengaturan." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const r = await apiFetch("/admin/exit-permit-settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      
      const body = await r.json().catch(() => ({}));
      
      if (r.ok) {
        msg.success({ message: body?.message || "Pengaturan berhasil diperbarui." });
      } else {
        throw new Error(body?.message || "Gagal menyimpan pengaturan.");
      }
    } catch (e) {
      msg.error({ message: e.message || "Terjadi kesalahan saat menyimpan." });
    } finally {
      setSaving(false);
    }
  };

  const updateTime = (dayKey, type, timeStr) => {
    setSettings((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        [type]: timeStr,
      },
    }));
  };

  return (
    <div style={{ padding: "0 24px 24px" }}>
      <div style={{ marginBottom: 24, paddingTop: 24 }}>
        <Title level={4} style={{ marginBottom: 4 }}>
          Pengaturan Izin Keluar
        </Title>
        <Text type="secondary">
          Atur jam istirahat yang akan dikecualikan dari perhitungan total waktu izin keluar.
        </Text>
      </div>

      <Spin spinning={loading}>
        <Row gutter={[24, 24]}>
          <Col xs={24} md={12}>
            <Card
              title={
                <Space>
                  <CalendarOutlined style={{ color: "#4f46e5" }} />
                  <span>Senin - Kamis</span>
                </Space>
              }
              variant="borderless"
              style={{ boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
            >
              <div style={{ padding: "8px 0" }}>
                <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
                  Tentukan rentang waktu istirahat (contoh: 12:00 - 13:00)
                </Text>
                <Space size={16} align="center">
                  <div>
                    <Text strong style={{ display: "block", marginBottom: 4 }}>Mulai</Text>
                    <TimePicker
                      format="HH:mm"
                      value={dayjs(settings?.mon_thu?.start || "12:00", "HH:mm")}
                      onChange={(_, str) => updateTime("mon_thu", "start", str)}
                      allowClear={false}
                    />
                  </div>
                  <Divider type="vertical" style={{ height: 40, borderLeft: "2px solid #f1f5f9" }} />
                  <div>
                    <Text strong style={{ display: "block", marginBottom: 4 }}>Selesai</Text>
                    <TimePicker
                      format="HH:mm"
                      value={dayjs(settings?.mon_thu?.end || "13:00", "HH:mm")}
                      onChange={(_, str) => updateTime("mon_thu", "end", str)}
                      allowClear={false}
                    />
                  </div>
                </Space>
              </div>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card
              title={
                <Space>
                  <CalendarOutlined style={{ color: "#22c55e" }} />
                  <span>Jumat</span>
                </Space>
              }
              variant="borderless"
              style={{ boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
            >
              <div style={{ padding: "8px 0" }}>
                <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
                  Tentukan rentang waktu istirahat khusus hari Jumat
                </Text>
                <Space size={16} align="center">
                  <div>
                    <Text strong style={{ display: "block", marginBottom: 4 }}>Mulai</Text>
                    <TimePicker
                      format="HH:mm"
                      value={dayjs(settings?.fri?.start || "12:00", "HH:mm")}
                      onChange={(_, str) => updateTime("fri", "start", str)}
                      allowClear={false}
                    />
                  </div>
                  <Divider type="vertical" style={{ height: 40, borderLeft: "2px solid #f1f5f9" }} />
                  <div>
                    <Text strong style={{ display: "block", marginBottom: 4 }}>Selesai</Text>
                    <TimePicker
                      format="HH:mm"
                      value={dayjs(settings?.fri?.end || "13:30", "HH:mm")}
                      onChange={(_, str) => updateTime("fri", "end", str)}
                      allowClear={false}
                    />
                  </div>
                </Space>
              </div>
            </Card>
          </Col>
        </Row>

        <div style={{ marginTop: 32, display: "flex", justifyContent: "flex-end" }}>
          <Button
            type="primary"
            size="large"
            icon={<SaveOutlined />}
            loading={saving}
            onClick={handleSave}
            style={{ minWidth: 160, height: 48, borderRadius: 8 }}
          >
            Simpan Pengaturan
          </Button>
        </div>

        <Card 
          style={{ marginTop: 24, backgroundColor: "#fefce8", border: "1px solid #fef08a" }} 
          variant="borderless"
        >
          <Space align="start">
            <CoffeeOutlined style={{ color: "#854d0e", fontSize: 20, marginTop: 4 }} />
            <div>
              <Text strong style={{ color: "#854d0e" }}>Informasi Penghitungan:</Text>
              <br />
              <Text style={{ color: "#854d0e" }}>
                Waktu yang diatur di atas akan otomatis dikurangi dari durasi izin keluar pegawai jika waktu izin tersebut melewati jam istirahat. Hal ini berlaku untuk rekapitulasi data dan monitoring *live*.
              </Text>
            </div>
          </Space>
        </Card>
      </Spin>
    </div>
  );
};

export default RispegPengaturanIzinKeluar;
