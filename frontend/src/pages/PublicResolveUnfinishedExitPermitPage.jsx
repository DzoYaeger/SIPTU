import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  App as AntdApp,
  Card,
  Form,
  TimePicker,
  Button,
  Typography,
  Result,
  Spin,
  Alert,
} from "antd";
import {
  ClockCircleOutlined,
  UserOutlined,
  CalendarOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "../hooks/useAuth.js";

const { Title, Text } = Typography;

const PublicResolveUnfinishedExitPermitPage = () => {
  const { apiFetch } = useAuth();
  const { message } = AntdApp.useApp();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm();

  const id = searchParams.get("id");
  const nip = searchParams.get("nip");
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [permit, setPermit] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!id || !nip || !token) {
      setErrorMsg("Parameter tautan tidak lengkap atau tidak valid.");
      setLoading(false);
      return;
    }

    const fetchPermitDetails = async () => {
      try {
        const response = await apiFetch(`/public/exit-permits/${id}/details`);
        if (!response.ok) {
          throw new Error("Gagal mengambil rincian data izin keluar.");
        }
        const data = await response.json();

        if (String(data.nip) !== String(nip)) {
          throw new Error("NIP pada tautan tidak sesuai dengan data izin.");
        }

        if (data.status === "returned") {
          setIsSuccess(true);
          setPermit(data);
        } else {
          setPermit(data);
        }
      } catch (err) {
        setErrorMsg(err.message || "Gagal memuat rincian data izin.");
      } finally {
        setLoading(false);
      }
    };

    fetchPermitDetails();
  }, [id, nip, token, apiFetch]);

  const handleSubmit = async (values) => {
    setSubmitLoading(true);
    try {
      const returnTimeFormatted = values.return_time.format("HH:mm");

      const response = await apiFetch(`/public/exit-permits/${id}/resolve-unfinished`, {
        method: "POST",
        body: JSON.stringify({
          nip,
          token,
          return_time: returnTimeFormatted,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal menyimpan jam kembali.");
      }

      message.success("Jam kembali berhasil dicatat.");
      setIsSuccess(true);
    } catch (err) {
      message.error(err.message || "Gagal mengirim data.");
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#f8fafc" }}>
        <Spin size="large" tip="Memuat Rincian Izin..." />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#f8fafc", padding: 20 }}>
        <Card style={{ maxWidth: 450, width: "100%", borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
          <Result
            status="error"
            title="Tautan Tidak Valid"
            subTitle={errorMsg}
          />
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#f8fafc", padding: 20 }}>
        <Card style={{ maxWidth: 450, width: "100%", borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
          <Result
            status="success"
            title="Konfirmasi Selesai"
            subTitle={
              permit?.status === "returned"
                ? `Izin keluar Anda telah diselesaikan pada pukul ${permit.return_time.substring(0, 5)} WITA.`
                : "Terima kasih, jam kembali Anda telah berhasil dicatat ke dalam sistem."
            }
          />
        </Card>
      </div>
    );
  }

  // Format exit time to HH:mm
  const formattedExitTime = permit?.exit_time ? permit.exit_time.substring(0, 5) : "-";

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#f8fafc", padding: 20 }}>
      <Card
        style={{
          maxWidth: 480,
          width: "100%",
          borderRadius: 16,
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
        }}
        styles={{ body: { padding: "28px 24px" } }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img src="/logo/logo.png" alt="SIPTU Logo" style={{ width: 48, height: 48, marginBottom: 12 }} />
          <Title level={4} style={{ margin: 0, fontWeight: 700 }}>Resolusi Izin Keluar</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>Lengkapi jam kembali Anda untuk kehadiran hari ini</Text>
        </div>

        <div style={{ background: "#f1f5f9", borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <UserOutlined style={{ color: "#475569" }} />
            <Text strong style={{ fontSize: 13, color: "#1e293b" }}>{permit?.employee_name}</Text>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <CalendarOutlined style={{ color: "#475569" }} />
            <Text style={{ fontSize: 13, color: "#334155" }}>
              {permit?.date ? dayjs(permit.date).format("dddd, DD MMMM YYYY") : "-"}
            </Text>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: permit?.reason ? 10 : 0 }}>
            <ClockCircleOutlined style={{ color: "#475569" }} />
            <Text style={{ fontSize: 13, color: "#334155" }}>
              Jam Keluar: <strong style={{ color: "#0f172a" }}>{formattedExitTime} WITA</strong>
            </Text>
          </div>
          {permit?.reason && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <FileTextOutlined style={{ color: "#475569", marginTop: 3 }} />
              <Text style={{ fontSize: 13, color: "#334155" }}>Keperluan: <em>{permit.reason}</em></Text>
            </div>
          )}
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            return_time: dayjs(),
          }}
        >
          <Form.Item
            name="return_time"
            label={<Text strong style={{ fontSize: 13 }}>Jam Kembali yang Seharusnya</Text>}
            rules={[
              { required: true, message: "Jam kembali wajib diisi." },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value) return Promise.resolve();
                  
                  const exitTimeStr = permit?.exit_time ? permit.exit_time.substring(0, 5) : null;
                  if (!exitTimeStr) return Promise.resolve();

                  const exitMoment = dayjs(`2000-01-01 ${exitTimeStr}`);
                  const returnMoment = dayjs(`2000-01-01 ${value.format("HH:mm")}`);

                  if (returnMoment.isBefore(exitMoment)) {
                    return Promise.reject(new Error("Jam kembali tidak boleh kurang dari jam keluar."));
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <TimePicker
              format="HH:mm"
              size="large"
              style={{ width: "100%", borderRadius: 8 }}
              showNow={false}
              allowClear={false}
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={submitLoading}
            style={{
              height: 44,
              borderRadius: 8,
              fontWeight: 600,
              background: "#4263eb",
              borderColor: "#4263eb",
              marginTop: 8,
            }}
          >
            Simpan Jam Kembali
          </Button>
        </Form>
      </Card>
    </div>
  );
};

export default PublicResolveUnfinishedExitPermitPage;
