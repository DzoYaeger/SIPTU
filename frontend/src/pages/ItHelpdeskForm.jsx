import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  App as AntdApp,
  Button,
  Form,
  Input,
  Result,
  Typography,
  Avatar,
  Space,
  Divider,
} from "antd";
import { buildMessageAdapter } from "../utils/notify.js";
import dayjs from "dayjs";
import { useAuth } from "../hooks/useAuth.js";
import {
  ArrowLeftOutlined,
  CheckCircleFilled,
  UserOutlined,
  PrinterOutlined,
  DesktopOutlined,
  LaptopOutlined,
  AppstoreAddOutlined,
  ToolOutlined,
  QuestionCircleOutlined,
  SendOutlined,
  IdcardOutlined,
  ApartmentOutlined,
  SafetyCertificateOutlined,
  WifiOutlined,
} from "@ant-design/icons";
import "./ItHelpdeskForm.css";

// IT Helpdesk Module Colors (from Layanan Mandiri)
const ITHELPDESK_COLORS = {
  primary: "#ec4899",
  gradient: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
  shadowColor: "rgba(236, 72, 153, 0.4)",
};

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

const reportOptions = [
  {
    label: "Printer",
    value: "Pengecekan dan Perbaikan Printer",
    icon: <PrinterOutlined />,
  },
  {
    label: "Komputer",
    value: "Pengecekan dan Perbaikan Komputer",
    icon: <DesktopOutlined />,
  },
  {
    label: "Laptop",
    value: "Pengecekan dan perbaikan Laptop",
    icon: <LaptopOutlined />,
  },
  { label: "Jaringan", value: "Kendala Jaringan", icon: <WifiOutlined /> },
  {
    label: "Aplikasi",
    value: "Instalasi Aplikasi",
    icon: <AppstoreAddOutlined />,
  },
  {
    label: "Bantuan IT",
    value: "Permohonan Bantuan IT",
    icon: <ToolOutlined />,
  },
  { label: "Lainnya", value: "other", icon: <QuestionCircleOutlined /> },
];

const ItHelpdeskForm = () => {
  const { message } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);
  const { apiFetch, user } = useAuth();
  const [form] = Form.useForm();

  const [submitting, setSubmitting] = useState(false);
  const [resultTicket, setResultTicket] = useState(null);
  const [selectedType, setSelectedType] = useState(null);

  // Auto-fill form effect
  useEffect(() => {
    if (user) {
      const employee = user.employee || {};
      form.setFieldsValue({
        nip: employee.nip || user.nip || user.username,
        nama: employee.name || employee.nama || user.name,
        fungsi:
          employee.function_area ||
          employee.fungsi_bidang ||
          user.unit_kerja ||
          "Staff",
      });
    }
  }, [user, form]);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        report_type: values.report_type,
        problem_details: values.problem_details,
        password: values.password,
        employee_nip: values.nip,
        employee_name: values.nama,
        function_area: values.fungsi,
      };

      const response = await apiFetch('/it-helpdesk-tickets', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Gagal mengirim laporan.");
      }

      setResultTicket(data);
      form.resetFields();
      setSelectedType(null);
      notification.success({ message: "Laporan berhasil dikirim." });
    } catch (error) {
      notification.error({
        message: "Gagal mengirim laporan",
        description: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTypeSelect = (value) => {
    setSelectedType(value);
    form.setFieldsValue({ report_type: value });
  };

  if (resultTicket) {
    return (
      <div className="it-helpdesk-wrapper">
        <div
          className="it-helpdesk-container"
          style={{
            maxWidth: 600,
            padding: 40,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: ITHELPDESK_COLORS.gradient,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              boxShadow: `0 8px 20px ${ITHELPDESK_COLORS.shadowColor}`,
            }}
          >
            <ToolOutlined style={{ fontSize: 40, color: "#fff" }} />
          </div>
          <Typography.Title
            level={2}
            style={{ marginBottom: 8, color: "#0f172a" }}
          >
            Laporan Terkirim!
          </Typography.Title>
          <Typography.Text
            type="secondary"
            style={{ display: "block", marginBottom: 24 }}
          >
            Nomor Tiket Anda
          </Typography.Text>
          <div
            style={{
              background: "#fdf2f8",
              border: "1px dashed #f9a8d4",
              padding: "16px 32px",
              borderRadius: 12,
              marginBottom: 32,
            }}
          >
            <Typography.Text
              strong
              style={{ fontSize: 24, color: ITHELPDESK_COLORS.primary }}
              copyable
            >
              {resultTicket.ticket_number}
            </Typography.Text>
          </div>
          <Button
            type="primary"
            size="large"
            onClick={() => setResultTicket(null)}
            style={{
              background: ITHELPDESK_COLORS.gradient,
              borderColor: ITHELPDESK_COLORS.primary,
            }}
          >
            Buat Laporan Baru
          </Button>
          <Typography.Text type="secondary" style={{ marginTop: 24 }}>
            Notifikasi WhatsApp telah dikirim ke tim IT.
          </Typography.Text>
        </div>
      </div>
    );
  }

  // Get display values
  const displayName = user?.employee?.name || user?.name || "User";
  const displayNip = user?.employee?.nip || user?.nip || "-";
  const displayRole = user?.employee?.position || user?.base_role || "Staff";
  const displayUnit = user?.employee?.function_area || user?.unit_kerja || "-";

  return (
    <div className="it-helpdesk-wrapper">

      <div className="it-helpdesk-container">
        {/* LEFT SIDE: User Passport */}
        <div className="user-passport-section">
          <div>
            <a href="/app/layanan-mandiri" className="it-back-btn">
              <ArrowLeftOutlined /> Kembali
            </a>
            <Typography.Title
              level={3}
              style={{ color: ITHELPDESK_COLORS.primary, marginBottom: 8 }}
            >
              Halo, {displayName.split(" ")[0]}! 👋
            </Typography.Title>
            <Typography.Text type="secondary">
              Silakan lengkapi formulir di sebelah kanan untuk mengirimkan
              laporan kendala IT Anda.
            </Typography.Text>
          </div>

          <div className="passport-card animate-slide-up delay-100">
            <div
              className="passport-avatar"
              style={{
                background: ITHELPDESK_COLORS.gradient,
                boxShadow: `0 4px 12px ${ITHELPDESK_COLORS.shadowColor}`,
              }}
            >
              <UserOutlined style={{ color: "#fff" }} />
            </div>
            <Typography.Title level={5} style={{ margin: 0 }}>
              {displayName}
            </Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              {displayRole}
            </Typography.Text>

            <Divider style={{ margin: "16px 0" }} />

            <div className="passport-info-row">
              <Space>
                <IdcardOutlined /> <span>NIP</span>
              </Space>
              <span style={{ fontWeight: 500 }}>{displayNip}</span>
            </div>
            <div className="passport-info-row">
              <Space>
                <ApartmentOutlined /> <span>Unit</span>
              </Space>
              <span style={{ fontWeight: 500 }}>{displayUnit}</span>
            </div>
            <div className="passport-info-row">
              <Space>
                <SafetyCertificateOutlined /> <span>Status</span>
              </Space>
              <span style={{ color: "#52c41a", fontWeight: 500 }}>Online</span>
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              SIPTU Ultra &bull; IT Support System
            </Typography.Text>
          </div>
        </div>

        {/* RIGHT SIDE: Form */}
        <div className="form-section mobile-form-padding-bottom">
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item name="nip" hidden>
              <Input />
            </Form.Item>
            <Form.Item name="nama" hidden>
              <Input />
            </Form.Item>
            <Form.Item name="fungsi" hidden>
              <Input />
            </Form.Item>

            {/* Icon Grid Selection */}
            <Typography.Title
              level={5}
              className="animate-slide-up delay-200"
              style={{ marginBottom: 16 }}
            >
              Apa kendala yang Anda alami?
            </Typography.Title>

            <Form.Item
              name="report_type"
              rules={[{ required: true, message: "Pilih jenis kendala" }]}
              className="animate-slide-up delay-200"
            >
              <div className="report-type-grid">
                {reportOptions.map((option) => (
                  <div
                    key={option.value}
                    className={`option-card ${selectedType === option.value ? "selected" : ""}`}
                    onClick={() => handleTypeSelect(option.value)}
                  >
                    <div className="option-icon">{option.icon}</div>
                    <div className="option-label">{option.label}</div>
                  </div>
                ))}
              </div>
            </Form.Item>

            {/* Details Input */}
            <div className="animate-slide-up delay-300">
              <Form.Item
                name="problem_details"
                label="Ceritakan detail masalahnya"
                rules={[
                  { required: true, message: "Mohon jelaskan masalahnya" },
                ]}
              >
                <Input.TextArea
                  className="custom-input"
                  rows={4}
                  placeholder="Contoh: Printer di ruang rapat tidak bisa connect..."
                  style={{ resize: "none" }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label="Konfirmasi Password SIPTU"
                rules={[{ required: true, message: "Password SIPTU diperlukan sebagai TTE" }]}
                extra={
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    *Gunakan password login SIPTU Anda sebagai Tanda Tangan Elektronik (TTE)
                  </Typography.Text>
                }
              >
                <Input.Password
                  className="custom-input"
                  placeholder="Masukkan password login SIPTU Anda"
                  prefix={<SafetyCertificateOutlined style={{ color: "#bfbfbf" }} />}
                />
              </Form.Item>

              <div className="mobile-sticky-bottom-action">
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={submitting}
                  block
                  icon={<SendOutlined />}
                  style={{
                    background: ITHELPDESK_COLORS.gradient,
                    borderColor: ITHELPDESK_COLORS.primary,
                    height: 48,
                    fontWeight: 600,
                  }}
                >
                  Kirim Laporan
                </Button>
              </div>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default ItHelpdeskForm;
