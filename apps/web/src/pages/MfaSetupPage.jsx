import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  Card,
  Button,
  Input,
  Typography,
  Alert,
  Steps,
  Divider,
  Tag,
  App as AntdApp,
  Space,
} from "antd";
import {
  SafetyCertificateOutlined,
  QrcodeOutlined,
  KeyOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  DownloadOutlined,
  LockOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { useAuth } from "../hooks/useAuth.js";
import { buildMessageAdapter } from "../utils/notify.js";
import "./MfaSetupPage.css";

const { Title, Text, Paragraph } = Typography;

export default function MfaSetupPage() {
  const { apiFetch, user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [setupData, setSetupData] = useState(null); // { secret, qr_code_uri }
  const [totpCode, setTotpCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [error, setError] = useState(null);

  // Fetch MFA setup QR Code & Secret
  useEffect(() => {
    const fetchSetup = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch("/mfa/setup");
        const data = await res.json();
        if (!res.ok) {
          if (data.mfa_enabled) {
            // Already set up -> go to dashboard
            navigate("/app");
            return;
          }
          throw new Error(data.message || "Gagal memuat QR Code setup MFA.");
        }
        setSetupData(data);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSetup();
  }, [apiFetch, navigate]);

  // Submit TOTP Code to confirm setup
  const handleConfirmSetup = async () => {
    if (!totpCode || totpCode.trim().length !== 6) {
      message.warning("Masukkan 6 digit kode dari aplikasi authenticator.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch("/mfa/confirm", {
        method: "POST",
        body: JSON.stringify({ totp_code: totpCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Kode verifikasi tidak valid.");
      }

      setRecoveryCodes(data.recovery_codes || []);
      setCurrentStep(1); // Move to Recovery Codes step
      message.success("MFA berhasil diaktifkan!");
      if (refreshProfile) refreshProfile();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(setupData?.secret || "");
      message.success("Secret key berhasil disalin!");
    } catch {
      message.error("Gagal menyalin text.");
    }
  };

  const handleDownloadRecoveryCodes = () => {
    const content = `SIPTU ULTRA - MFA RECOVERY CODES\nUser: ${user?.name} (${user?.nip})\nTanggal: ${new Date().toLocaleString()}\n\nSIMPAN KODE INI DI TEMPAT AMAN!\nJika Anda kehilangan akses ke aplikasi authenticator, gunakan salah satu kode di bawah ini untuk login:\n\n` +
      recoveryCodes.map((c, i) => `${i + 1}. ${c}`).join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SIPTU_MFA_Recovery_Codes_${user?.nip || "User"}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    message.success("Recovery codes berhasil diunduh.");
  };

  const handleFinish = () => {
    navigate("/app");
  };

  return (
    <div className="mfa-setup-page">
      <div className="mfa-setup-card-wrapper">
        <Card className="mfa-setup-card" variant="borderless">
          <div className="mfa-setup-header">
            <div className="mfa-icon-badge">
              <SafetyCertificateOutlined />
            </div>
            <Title level={3} style={{ margin: "12px 0 4px" }}>
              Aktivasi Autentikasi Dua Langkah (MFA)
            </Title>
            <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 20 }}>
              Tingkatkan keamanan akun SIPTU Anda menggunakan Google Authenticator atau Microsoft Authenticator.
            </Paragraph>
          </div>

          <Steps
            current={currentStep}
            size="small"
            items={[
              { title: "Pindai QR Code", icon: <QrcodeOutlined /> },
              { title: "Simpan Recovery Code", icon: <KeyOutlined /> },
            ]}
            style={{ marginBottom: 24 }}
          />

          {error && (
            <Alert
              type="error"
              message="Kendala Setup MFA"
              description={error}
              showIcon
              style={{ marginBottom: 20 }}
            />
          )}

          {currentStep === 0 && (
            <div className="mfa-step-content">
              <Alert
                type="info"
                showIcon
                message="Petunjuk Aktivasi"
                description={
                  <ol style={{ paddingLeft: 16, margin: "4px 0 0" }}>
                    <li>Buka aplikasi <strong>Google Authenticator</strong> atau <strong>Microsoft Authenticator</strong> di ponsel Anda.</li>
                    <li>Pindai QR Code di bawah ini atau masukkan <em>Secret Key</em> secara manual.</li>
                    <li>Masukkan 6 digit kode yang muncul di aplikasi ke dalam kolom verifikasi di bawah.</li>
                  </ol>
                }
                style={{ marginBottom: 20 }}
              />

              <div className="qr-code-box">
                {loading ? (
                  <div className="qr-skeleton">Memuat QR Code...</div>
                ) : setupData?.qr_code_uri ? (
                  <QRCodeSVG
                    value={setupData.qr_code_uri}
                    size={200}
                    level="H"
                    includeMargin
                  />
                ) : (
                  <Text type="danger">Gagal memuat QR Code.</Text>
                )}

                <div className="secret-key-display">
                  <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                    Secret Key (Manual Entry):
                  </Text>
                  <Space>
                    <Text code copyable={{ text: setupData?.secret }} style={{ fontSize: 14, fontWeight: 700 }}>
                      {setupData?.secret || "—"}
                    </Text>
                  </Space>
                </div>
              </div>

              <Divider style={{ margin: "20px 0" }}>Verifikasi Kode 6 Digit</Divider>

              <div className="totp-input-section">
                <Input
                  prefix={<LockOutlined style={{ color: "#94a3b8" }} />}
                  placeholder="Contoh: 123456"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                  size="large"
                  className="totp-code-input"
                  onPressEnter={handleConfirmSetup}
                />
                <Button
                  type="primary"
                  size="large"
                  icon={<CheckCircleOutlined />}
                  loading={submitting}
                  onClick={handleConfirmSetup}
                  className="btn-confirm-mfa"
                  style={{ marginTop: 16, width: "100%" }}
                >
                  Verifikasi & Aktifkan MFA
                </Button>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="mfa-step-content">
              <Alert
                type="success"
                showIcon
                message="MFA Berhasil Diaktifkan!"
                description="Akun Anda kini dilindungi oleh Autentikasi Dua Langkah."
                style={{ marginBottom: 20 }}
              />

              <Paragraph style={{ fontSize: 13 }}>
                <strong>PENTING: Simpan Kode Pemulihan (Recovery Codes) Ini!</strong>
                <br />
                Kode pemulihan ini dapat digunakan untuk login jika Anda kehilangan akses ke ponsel atau aplikasi authenticator. Setiap kode hanya bisa digunakan satu kali.
              </Paragraph>

              <div className="recovery-codes-grid">
                {recoveryCodes.map((code, idx) => (
                  <div key={idx} className="recovery-code-pill">
                    <Text code style={{ fontSize: 13, fontWeight: 700 }}>
                      {code}
                    </Text>
                  </div>
                ))}
              </div>

              <Space style={{ width: "100%", justifyContent: "center", margin: "20px 0 10px" }}>
                <Button icon={<DownloadOutlined />} onClick={handleDownloadRecoveryCodes}>
                  Unduh Kode Pemulihan (.txt)
                </Button>
              </Space>

              <Divider style={{ margin: "16px 0" }} />

              <Button
                type="primary"
                size="large"
                block
                icon={<RightOutlined />}
                onClick={handleFinish}
                style={{ background: "#0b56a4", height: 46, borderRadius: 10 }}
              >
                Lanjutkan ke Dashboard SIPTU
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
