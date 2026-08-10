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
        totp_code: values.totp_code,
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
            maxWidth: 540,
            height: "auto",
            maxHeight: "none",
            padding: "48px 32px",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            textAlign: "center"
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <CheckCircleFilled style={{ fontSize: 32, color: "#10b981" }} />
          </div>
          <Typography.Title
            level={3}
            style={{ marginBottom: 8, color: "#0f172a", fontWeight: 800 }}
          >
            Laporan Berhasil Terkirim
          </Typography.Title>
          <Typography.Text
            type="secondary"
            style={{ display: "block", marginBottom: 24, fontSize: 14 }}
          >
            Tiket bantuan Anda telah terdaftar dalam antrean sistem support.
          </Typography.Text>
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              padding: "20px 32px",
              borderRadius: 14,
              marginBottom: 28,
              width: "100%",
              maxWidth: 320,
              boxSizing: "border-box",
            }}
          >
            <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6, fontWeight: 700 }}>
              Nomor Tiket
            </div>
            <Typography.Text
              strong
              style={{ fontSize: 24, fontFamily: "monospace", color: "#0f172a" }}
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
              background: "#0f172a",
              borderColor: "#0f172a",
              height: 48,
              borderRadius: 12,
              fontWeight: 600,
              padding: "0 32px",
            }}
          >
            Buat Laporan Baru
          </Button>
          <Typography.Text type="secondary" style={{ marginTop: 24, fontSize: 12 }}>
            Pemberitahuan otomatis telah dikirim ke Tim IT BPOM Palopo.
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
              style={{ color: "#0f172a", marginBottom: 8, fontWeight: 800 }}
            >
              Halo, {displayName.split(" ")[0]}! 👋
            </Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: 13, lineHeight: 1.5, display: "block" }}>
              Silakan lengkapi formulir laporan kendala IT Anda di sebelah kanan.
            </Typography.Text>
          </div>

          <div className="passport-card animate-slide-up delay-100">
            <div
              className="passport-avatar"
              style={{
                border: "1px solid #e2e8f0",
              }}
            >
              <UserOutlined style={{ color: "#475569" }} />
            </div>
            <Typography.Title level={5} style={{ margin: 0, fontWeight: 700, color: "#0f172a" }}>
              {displayName}
            </Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
              {displayRole}
            </Typography.Text>

            <Divider style={{ margin: "16px 0" }} />

            <div className="passport-info-row">
              <Space>
                <IdcardOutlined style={{ color: "#64748b" }} /> <span>NIP</span>
              </Space>
              <span style={{ fontWeight: 600, color: "#334155" }}>{displayNip}</span>
            </div>
            <div className="passport-info-row">
              <Space>
                <ApartmentOutlined style={{ color: "#64748b" }} /> <span>Unit</span>
              </Space>
              <span style={{ fontWeight: 600, color: "#334155" }}>{displayUnit}</span>
            </div>
            <div className="passport-info-row">
              <Space>
                <SafetyCertificateOutlined style={{ color: "#64748b" }} /> <span>Status</span>
              </Space>
              <span style={{ color: "#10b981", fontWeight: 600 }}>Online</span>
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <Typography.Text type="secondary" style={{ fontSize: 11, color: "#94a3b8" }}>
              SIPTU Enterprise &bull; IT Support System
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
              style={{ marginBottom: 16, fontWeight: 700, color: "#334155" }}
            >
              Pilih Jenis Kendala
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
                    role="button"
                    tabIndex={0}
                    aria-selected={selectedType === option.value}
                  >
                    <div className="option-icon-bg">
                      <span className="option-icon">{option.icon}</span>
                    </div>
                    <div className="option-label">{option.label}</div>
                  </div>
                ))}
              </div>
            </Form.Item>

            {/* Details Input */}
            <div className="animate-slide-up delay-300">
              <Form.Item
                name="problem_details"
                label={<span style={{ fontWeight: 600, color: "#334155" }}>Detail Deskripsi Laporan</span>}
                rules={[
                  { required: true, message: "Mohon jelaskan masalahnya" },
                ]}
              >
                <Input.TextArea
                  className="custom-input"
                  rows={4}
                  placeholder="Ceritakan detail masalah yang dialami (misal: Komputer tidak mau menyala, printer paper jam, dll.)"
                  style={{ resize: "none" }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label={<span style={{ fontWeight: 600, color: "#334155" }}>Konfirmasi Password SIPTU</span>}
                rules={[{ required: true, message: "Password SIPTU diperlukan sebagai TTE" }]}
              >
                <Input.Password
                  className="custom-input"
                  placeholder="Masukkan password login SIPTU Anda"
                  prefix={<SafetyCertificateOutlined style={{ color: "#94a3b8" }} />}
                />
              </Form.Item>

              <Form.Item
                name="totp_code"
                label={<span style={{ fontWeight: 600, color: "#334155" }}>Kode Autentikasi MFA (6 Digit / Recovery Code)</span>}
                rules={[{ required: true, message: "Kode MFA diperlukan" }]}
                extra={
                  <Typography.Text type="secondary" style={{ fontSize: 11, color: "#94a3b8" }}>
                    *Gunakan password akun SIPTU & kode MFA Anda untuk menandatangani dan memvalidasi laporan ini secara elektronik (TTE).
                  </Typography.Text>
                }
              >
                <Input
                  className="custom-input"
                  placeholder="Contoh: 123456 atau XXXX-XXXX"
                  prefix={<SafetyCertificateOutlined style={{ color: "#0b56a4" }} />}
                  style={{ fontWeight: 700, letterSpacing: '1px' }}
                />
              </Form.Item>

              <div className="mobile-sticky-bottom-action" style={{ marginTop: 24 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={submitting}
                  block
                  icon={<SendOutlined />}
                  style={{
                    background: "#0f172a",
                    borderColor: "#0f172a",
                    height: 48,
                    fontWeight: 600,
                    borderRadius: 12,
                  }}
                >
                  Kirim Laporan Resmi
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
