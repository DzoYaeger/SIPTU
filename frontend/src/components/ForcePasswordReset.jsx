import { useState } from "react";
import { Card, Form, Input, Button, Typography, App as AntdApp, Alert } from "antd";
import { KeyOutlined, LogoutOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

const { Title, Paragraph } = Typography;

/**
 * ForcePasswordReset
 * ──────────────────
 * Fullscreen overlay shown when user must reset their password.
 * After a successful reset, user is redirected to `returnUrl`.
 */
const ForcePasswordReset = ({ returnUrl = "/" }) => {
  const { changePassword, refreshProfile, logout } = useAuth();
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (values) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await changePassword({
        current_password: values.current_password,
        password: values.password,
        password_confirmation: values.password_confirmation,
      });
      message.success("Kata sandi berhasil diperbarui!");
      await refreshProfile();
      // Redirect back to the page user originally intended to visit
      navigate(returnUrl, { replace: true });
    } catch (err) {
      const msg = err.message || "Gagal memperbarui kata sandi.";
      setErrorMsg(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="password-lock-overlay">
      <div className="password-lock-bg-glows">
        <div className="password-lock-glow-circle-1"></div>
        <div className="password-lock-glow-circle-2"></div>
      </div>
      <Card className="password-lock-card" variant="borderless">
        <div className="password-lock-header">
          <div className="password-lock-icon-wrap">
            <KeyOutlined />
          </div>
          <Title level={3} className="password-lock-title">
            Reset Sandi Wajib
          </Title>
          <Paragraph className="password-lock-subtitle">
            Untuk alasan keamanan, Anda diwajibkan untuk memperbarui kata sandi
            Anda sebelum melanjutkan. Kata sandi baru tidak boleh sama dengan
            kata sandi saat ini atau yang pernah digunakan.
          </Paragraph>
        </div>

        {errorMsg && (
          <Alert
            type="error"
            showIcon
            message="Gagal Memperbarui Kata Sandi"
            description={errorMsg}
            closable
            onClose={() => setErrorMsg(null)}
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
        )}

        <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false}>
          <Form.Item
            label="Kata Sandi Saat Ini"
            name="current_password"
            rules={[{ required: true, message: "Masukkan kata sandi saat ini!" }]}
          >
            <Input.Password
              prefix={<KeyOutlined />}
              placeholder="Kata sandi saat ini"
            />
          </Form.Item>

          <Form.Item
            label="Kata Sandi Baru"
            name="password"
            rules={[
              { required: true, message: "Masukkan kata sandi baru!" },
              { min: 8, message: "Kata sandi minimal 8 karakter!" },
            ]}
          >
            <Input.Password
              prefix={<KeyOutlined />}
              placeholder="Kata sandi baru (min 8 karakter)"
            />
          </Form.Item>

          <Form.Item
            label="Konfirmasi Kata Sandi Baru"
            name="password_confirmation"
            dependencies={["password"]}
            rules={[
              { required: true, message: "Konfirmasi kata sandi baru Anda!" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error("Konfirmasi kata sandi tidak cocok!")
                  );
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<KeyOutlined />}
              placeholder="Ulangi kata sandi baru"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 12 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              className="password-lock-btn-submit"
              block
            >
              Perbarui Kata Sandi
            </Button>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="text"
              danger
              onClick={logout}
              className="password-lock-btn-logout"
              icon={<LogoutOutlined />}
              block
            >
              Keluar dari Sistem
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default ForcePasswordReset;
