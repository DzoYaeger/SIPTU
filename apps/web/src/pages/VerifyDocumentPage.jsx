import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Typography, Spin, Result, Button, Divider, Space } from "antd";
import { CheckCircleFilled, SafetyCertificateFilled, CloseCircleFilled, DownloadOutlined, FileTextOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

const VerifyDocumentPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVerification = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || "https://siptu.bpompalopo.com/core_api/api";
        const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/public/verify-document/${token}`);
        const result = await res.json();
        
        if (!res.ok) {
          throw new Error(result.message || "Dokumen tidak valid atau tidak ditemukan.");
        }
        
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchVerification();
  }, [token]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#f8f9fa" }}>
        <Spin size="large" tip="Memverifikasi dokumen..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#f8f9fa", padding: 20 }}>
        <Card style={{ maxWidth: 500, width: "100%", borderRadius: 16, boxShadow: "0 10px 25px rgba(0,0,0,0.05)" }}>
          <Result
            status="error"
            icon={<CloseCircleFilled style={{ color: "#ef4444" }} />}
            title="Verifikasi Gagal"
            subTitle={error}
            extra={
              <Button type="primary" onClick={() => navigate("/")}>
                Kembali ke Beranda
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  const allSigned = !data.signatories || data.signatories.every(s => s.signed);
  const statusGradient = allSigned ? "linear-gradient(135deg, #10b981, #059669)" : "linear-gradient(135deg, #f59e0b, #d97706)";

  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#f8f9fa", padding: 20 }}>
      <Card style={{ maxWidth: 500, width: "100%", borderRadius: 16, boxShadow: "0 10px 25px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        <div style={{ background: statusGradient, margin: "-24px -24px 24px -24px", padding: "32px 24px", textAlign: "center", color: "white" }}>
          <SafetyCertificateFilled style={{ fontSize: 64, marginBottom: 16, color: "white" }} />
          <Title level={3} style={{ color: "white", margin: 0 }}>{allSigned ? "DOKUMEN VALID" : "VERIFIKASI TTE"}</Title>
          <Text style={{ color: "rgba(255,255,255,0.8)" }}>{allSigned ? "Tanda Tangan Elektronik Terverifikasi" : "Dokumen dalam Proses Penandatanganan"}</Text>
        </div>

        <div style={{ padding: "0 8px" }}>
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <div>
              <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>Jenis Dokumen</Text>
              <div style={{ fontSize: 16, fontWeight: 500, color: "#1e293b" }}>{data.document_type}</div>
            </div>
            
            <div>
              <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>Status Penandatanganan</Text>
              <div style={{ marginTop: 8 }}>
                {data.signatories ? (
                  <Space direction="vertical" style={{ width: "100%" }} size={12}>
                    {data.signatories.map((sig, idx) => (
                      <div key={idx} style={{ 
                        background: "#fff", 
                        padding: "10px 14px", 
                        borderRadius: 12, 
                        border: "1px solid #f1f5f9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          {sig.signed ? (
                            <CheckCircleFilled style={{ color: "#10b981", fontSize: 20 }} />
                          ) : (
                            <CloseCircleFilled style={{ color: "#ef4444", fontSize: 20 }} />
                          )}
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: sig.signed ? "#1e293b" : "#64748b" }}>{sig.name}</div>
                            <div style={{ fontSize: 11, color: "#94a3b8" }}>{sig.role}</div>
                          </div>
                        </div>
                        {sig.signed && sig.signed_at && (
                          <div style={{ fontSize: 10, color: "#64748b", textAlign: "right" }}>
                            {sig.signed_at}
                          </div>
                        )}
                      </div>
                    ))}
                  </Space>
                ) : (
                  <div style={{ fontSize: 16, fontWeight: 500, color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
                    {data.signed_by} <CheckCircleFilled style={{ color: "#10b981", fontSize: 14 }} />
                  </div>
                )}
              </div>
            </div>

            {!data.signatories && (
              <div>
                <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>Waktu Penandatanganan</Text>
                <div style={{ fontSize: 16, fontWeight: 500, color: "#1e293b" }}>{data.signed_at}</div>
              </div>
            )}

            <Divider style={{ margin: "8px 0" }} />

            <div>
              <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>Informasi Tambahan</Text>
              <div style={{ fontSize: 14, color: "#475569", marginTop: 4 }}>
                <strong>Agenda/Keperluan:</strong> {data.description || "-"}<br/>
                <strong>Periode:</strong> {data.date_range}
              </div>
            </div>

            <Divider style={{ margin: "8px 0" }} />

            {data.download_url && (
              <div style={{ marginTop: 16 }}>
                {data.document_type?.toLowerCase().includes("protokol kerja") && (
                  <div style={{ 
                    marginBottom: 20, 
                    borderRadius: 12, 
                    overflow: "hidden", 
                    border: "1px solid #e2e8f0",
                    background: "#f1f5f9"
                  }}>
                    <div style={{ padding: "8px 12px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: 12, fontWeight: 600, color: "#64748b", display: "flex", alignItems: "center", gap: 8 }}>
                      <FileTextOutlined /> PRATINJAU DOKUMEN
                    </div>
                    <iframe 
                      src={`${data.download_url}&download=0#toolbar=0`} 
                      style={{ width: "100%", height: "450px", border: "none" }}
                      title="Protokol Kerja Preview"
                    />
                  </div>
                )}
                
                <Button 
                  type="primary" 
                  icon={<DownloadOutlined />} 
                  block 
                  size="large"
                  onClick={() => window.open(data.download_url, "_blank")}
                  style={{ 
                    background: statusGradient, 
                    color: "white", 
                    border: "none",
                    fontWeight: 700,
                    height: 52,
                    borderRadius: 14,
                    fontSize: 16,
                    letterSpacing: "0.5px",
                    boxShadow: allSigned 
                      ? "0 10px 15px -3px rgba(16, 185, 129, 0.2), 0 4px 6px -2px rgba(16, 185, 129, 0.1)"
                      : "0 10px 15px -3px rgba(245, 158, 11, 0.2), 0 4px 6px -2px rgba(245, 158, 11, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10
                  }}
                >
                  Download Dokumen Asli
                </Button>
                <Text type="secondary" style={{ fontSize: 11, display: "block", textAlign: "center", marginTop: 10, color: "#94a3b8" }}>
                  Gunakan tombol ini untuk mengunduh dokumen yang asli saat ditandatangani.
                </Text>
              </div>
            )}
          </Space>
        </div>

        <div style={{ marginTop: 32, textAlign: "center" }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Sistem Elektronik Terpadu<br/>
            <strong>Balai POM di Palopo</strong>
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default VerifyDocumentPage;
