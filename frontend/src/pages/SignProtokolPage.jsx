import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Input, Button, Typography, message, Spin, Result, Divider, Space } from "antd";
import { FileProtectOutlined, LockOutlined, CheckCircleOutlined, EyeOutlined, DownloadOutlined } from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;

const SignProtokolPage = ({ type = "ketua" }) => {
  const { id, token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const baseUrl = (import.meta.env.VITE_API_URL || "https://siptu.bpompalopo.com/core_api/api").replace(/\/+$/, "");
  const pdfUrl = `${baseUrl}/public/surat-tugas/${id}/protokol-kerja?token=${token}`;

  useEffect(() => {
    // We just check if the endpoint is reachable/valid
    const checkStatus = async () => {
      try {
        const res = await fetch(`${baseUrl}/public/surat-tugas/${id}/protokol-kerja?token=${token}`, { method: 'HEAD' });
        if (!res.ok) {
          if (res.status === 403) throw new Error("Akses ditolak. Token tidak valid atau sudah kadaluarsa.");
          throw new Error("Dokumen tidak ditemukan.");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    checkStatus();
  }, [id, token, baseUrl]);

  const isKepala = type === "kepala";
  const endpoint = isKepala ? "sign-protokol-kepala" : "sign-protokol";
  const downloadFileName = isKepala ? `Protokol_Kerja_Kepala_Signed_${id}.pdf` : `Protokol_Kerja_Signed_${id}.pdf`;
  const successMsg = isKepala ? "Dokumen berhasil ditandatangani oleh Kepala Balai." : "Dokumen berhasil ditandatangani.";
  const successSubTitle = isKepala 
    ? "Dokumen Protokol Kerja telah ditandatangani oleh Kepala Balai secara elektronik dan diunduh secara otomatis." 
    : "Dokumen Protokol Kerja telah ditandatangani secara elektronik (QR Code ditambahkan) dan diunduh secara otomatis.";
  const themeColor = isKepala ? "#52c41a" : "#1890ff"; // green vs blue
  const pageTitle = isKepala ? "TTE Kepala Balai / Plh" : "Tanda Tangan Elektronik";
  const pageSubtitle = isKepala 
    ? "Silakan tinjau dokumen yang sudah ditandatangani Ketua Tim berikut sebelum Anda menandatanganinya." 
    : "Silakan tinjau dokumen Protokol Kerja berikut sebelum melakukan penandatanganan.";
  const previewDocUrl = isKepala ? `${pdfUrl}&with_qr=1` : pdfUrl;
  const previewLabel = isKepala ? "Pratinjau Dokumen" : "Pratinjau Dokumen (Tanpa QR Code)";
  const confirmationTitle = isKepala ? "Konfirmasi TTE Kepala Balai" : "Konfirmasi Penandatanganan";
  const confirmationDesc = isKepala 
    ? "Masukkan password dan kode autentikasi 6 digit dari aplikasi Authenticator Anda." 
    : "Masukkan password dan kode autentikasi 6 digit dari aplikasi Authenticator Anda untuk membubuhkan QR Code.";
  const btnText = isKepala ? "Tandatangani Dokumen" : "Setujui & Tandatangani";
  const footerText = isKepala 
    ? "Dokumen ini akan dilengkapi dengan QR Code kedua sebagai bukti pengesahan Kepala Balai." 
    : "Dengan menekan tombol di atas, Anda menyatakan bahwa data dalam dokumen tersebut sudah benar.";

  const handleSign = async () => {
    if (!password) {
      message.warning("Masukkan password login SIPTU Anda.");
      return;
    }
    if (!totpCode) {
      message.warning("Masukkan kode autentikasi 6 digit.");
      return;
    }

    setSigning(true);
    try {
      const res = await fetch(`${baseUrl}/public/surat-tugas/${id}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, totp_code: totpCode, token }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Gagal memverifikasi password/kode MFA atau menandatangani dokumen.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setSuccess(true);
      message.success(successMsg);
    } catch (err) {
      message.error(err.message);
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#f0f2f5" }}>
        <Space direction="vertical" align="center">
          <Spin size="large" />
          <Text type="secondary">Menyiapkan pratinjau dokumen...</Text>
        </Space>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#f0f2f5", padding: 24 }}>
        <Card style={{ maxWidth: 500, width: "100%", textAlign: "center", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}>
          <Result status="error" title="Gagal Memuat Dokumen" subTitle={error} />
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#f0f2f5", padding: 24 }}>
        <Card style={{ maxWidth: 550, width: "100%", textAlign: "center", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}>
          <Result
            status="success"
            title={successMsg}
            subTitle={successSubTitle}
            extra={[
              <Button type="primary" key="close" onClick={() => window.close()} style={{ background: themeColor, borderColor: themeColor }}>
                Tutup Halaman Ini
              </Button>
            ]}
          />
        </Card>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "32px 16px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <FileProtectOutlined style={{ fontSize: 40, color: themeColor, marginBottom: 12 }} />
          <Title level={2} style={{ margin: 0 }}>{pageTitle}</Title>
          <Text type="secondary" style={{ fontSize: 15 }}>{pageSubtitle}</Text>
        </div>

        <Card 
          bodyStyle={{ padding: 0 }} 
          style={{ borderRadius: 12, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.08)", marginBottom: 32 }}
        >
          <div style={{ background: "#fafafa", padding: "12px 24px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Space>
              <EyeOutlined style={{ color: "#8c8c8c" }} />
              <Text strong>{previewLabel}</Text>
            </Space>
            <Button size="small" type="link" onClick={() => window.open(previewDocUrl, '_blank')}>Buka di Tab Baru</Button>
          </div>
          <div style={{ height: 650, width: "100%", background: "#525659" }}>
            <iframe
              src={`${previewDocUrl}#toolbar=0&navpanes=0`}
              width="100%"
              height="100%"
              style={{ border: "none" }}
              title="Pratinjau PDF"
            />
          </div>
        </Card>

        <Card 
          style={{ borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.08)", maxWidth: 500, margin: "0 auto" }}
        >
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <Title level={4} style={{ margin: 0 }}>{confirmationTitle}</Title>
            <Paragraph type="secondary" style={{ marginTop: 8 }}>
              {confirmationDesc}
            </Paragraph>
          </div>

          <Divider />

          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <div>
              <Text style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Password SIPTU:</Text>
              <Input.Password
                size="large"
                prefix={<LockOutlined style={{ color: "#bfbfbf" }} />}
                placeholder="Password SIPTU"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ borderRadius: 8 }}
              />
            </div>

            <div>
              <Text style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Kode Autentikasi MFA (6 Digit / Recovery Code):</Text>
              <Input
                size="large"
                prefix={<LockOutlined style={{ color: "#0b56a4" }} />}
                placeholder="Contoh: 123456 atau XXXX-XXXX"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                onPressEnter={handleSign}
                style={{ borderRadius: 8, textAlign: "center", letterSpacing: "2px", fontWeight: 700 }}
              />
            </div>

            <Button
              type="primary"
              size="large"
              block
              loading={signing}
              onClick={handleSign}
              style={{ borderRadius: 8, height: 44, background: themeColor, borderColor: themeColor }}
            >
              {btnText}
            </Button>
            
            <Text type="secondary" style={{ fontSize: 12, textAlign: "center", display: "block" }}>
              {footerText}
            </Text>
          </Space>
        </Card>
      </div>
    </div>
  );
};

export default SignProtokolPage;
