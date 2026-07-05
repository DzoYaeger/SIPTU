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
    ? "Masukkan password akun SIPTU Anda untuk membubuhkan tanda tangan elektronik." 
    : "Masukkan password akun SIPTU Anda untuk membubuhkan QR Code pada dokumen di atas.";
  const btnText = isKepala ? "Tandatangani Dokumen" : "Setujui & Tandatangani";
  const footerText = isKepala 
    ? "Dokumen ini akan dilengkapi dengan QR Code kedua sebagai bukti pengesahan Kepala Balai." 
    : "Dengan menekan tombol di atas, Anda menyatakan bahwa data dalam dokumen tersebut sudah benar.";

  const handleSign = async () => {
    if (!password) {
      message.warning("Masukkan password login SIPTU Anda.");
      return;
    }

    setSigning(true);
    try {
      const res = await fetch(`${baseUrl}/public/surat-tugas/${id}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, token }), // Pass token here too
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Gagal memverifikasi password atau menandatangani dokumen.");
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
      <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#f0f2f5" }}>
        <Result
          status="error"
          title="Gagal Memuat Dokumen"
          subTitle={error}
          extra={<Button type="primary" onClick={() => navigate("/")}>Kembali ke Beranda</Button>}
        />
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#f0f2f5" }}>
        <Result
          status="success"
          title="Berhasil Ditandatangani"
          subTitle={successSubTitle}
          extra={[
            <Button type="primary" key="home" onClick={() => navigate("/")}>Kembali ke Beranda</Button>,
            <Button key="download" icon={<DownloadOutlined />} onClick={() => window.open(`${pdfUrl}&with_qr=1`, '_blank')}>Buka PDF Lagi</Button>
          ]}
        />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", padding: "40px 20px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Title level={2} style={{ marginBottom: 8 }}>
            <FileProtectOutlined style={{ color: themeColor, marginRight: 12 }} />
            {pageTitle}
          </Title>
          <Text type="secondary" style={{ fontSize: 16 }}>
            {pageSubtitle}
          </Text>
        </div>

        <Card 
          bodyStyle={{ padding: 0 }} 
          style={{ borderRadius: 12, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.08)", marginBottom: 32 }}
        >
          <div style={{ background: "#fafafa", padding: "12px 24px", borderBottom: "1px solid #f0f0f0", display: "flex", justifycontent: "space-between", alignItems: "center" }}>
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
            <Input.Password
              size="large"
              prefix={<LockOutlined style={{ color: "#bfbfbf" }} />}
              placeholder="Password SIPTU"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onPressEnter={handleSign}
              style={{ borderRadius: 8 }}
            />

            <Button
              type="primary"
              size="large"
              block
              loading={signing}
              onClick={handleSign}
              icon={<CheckCircleOutlined />}
              style={{ borderRadius: 8, height: 50, fontSize: 16, fontWeight: 600, background: themeColor, borderColor: themeColor }}
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
