import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  App as AntdApp,
  Avatar,
  Button,
  Card,
  Divider,
  Form,
  Input,
  Radio,
  Result,
  Select,
  Tag,
  Typography,
} from "antd";
import {
  AlertOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  BuildOutlined,
  SendOutlined,
  ToolOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useAuth } from "../hooks/useAuth.js";
import "./BmnMaintenanceReportForm.css";

const { Text } = Typography;
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

export default function BmnMaintenanceReportForm() {
  const { apiFetch, token, user } = useAuth();
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const [assets, setAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [doneTicket, setDoneTicket] = useState(null);

  const reportType = Form.useWatch("report_type", form);
  const selectedAssetId = Form.useWatch("asset_id", form);

  useEffect(() => {
    const run = async () => {
      setLoadingAssets(true);
      try {
        const res = await apiFetch(`${API_URL}/public/bmn-assets`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message ?? "Gagal memuat data BMN");
        setAssets(Array.isArray(data) ? data : []);
      } catch (error) {
        message.error(error.message);
      } finally {
        setLoadingAssets(false);
      }
    };
    run();
  }, [apiFetch, message]);

  const assetOptions = useMemo(
    () =>
      assets.map((a) => ({
        value: a.id,
        label: a.name,
        searchLabel: `${a.name ?? ""} ${a.asset_code ?? ""} ${a.brand ?? ""} ${a.model ?? ""}`,
        asset: a,
      })),
    [assets],
  );
  
  const selectedAsset = useMemo(
    () => assets.find((a) => Number(a.id) === Number(selectedAssetId)),
    [assets, selectedAssetId],
  );

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        report_type: values.report_type,
        asset_id: values.report_type === "pemeliharaan" ? values.asset_id : null,
        report_details: values.report_details,
      };
      const res = await apiFetch(`${API_URL}/bmn-maintenance-reports`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "Gagal mengirim laporan");
      setDoneTicket(data);
      form.resetFields();
    } catch (error) {
      message.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div style={{ padding: "100px 20px", textAlign: "center" }}>
        <Result
          status="warning"
          title="Silakan login terlebih dahulu"
          subTitle="Halaman pelaporan BMN ini hanya untuk pengguna yang sudah login."
          extra={
            <Button type="primary" size="large" onClick={() => navigate("/login")}>
              Menuju Halaman Login
            </Button>
          }
        />
      </div>
    );
  }

  if (doneTicket) {
    return (
      <div 
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          padding: 20
        }}
      >
        <div 
          style={{
            maxWidth: 550,
            width: "100%",
            background: "#ffffff",
            padding: 40,
            borderRadius: 24,
            boxShadow: "0 10px 30px -10px rgba(15, 23, 42, 0.08)",
            border: "1px solid #e2e8f0",
            textAlign: "center"
          }}
        >
          <div 
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              boxShadow: "0 8px 24px rgba(13, 148, 136, 0.3)",
              color: "#fff",
              fontSize: 36
            }}
          >
            <CheckCircleOutlined />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 8, letterSpacing: "-0.5px" }}>
            Laporan Berhasil Terkirim
          </h2>
          <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 28px 0" }}>
            Aduan pemeliharaan BMN Anda telah berhasil direkam dalam sistem. Catat nomor tiket laporan Anda di bawah ini untuk pelacakan.
          </p>

          <div 
            style={{
              background: "#f0fdfa",
              border: "1px solid #ccfbf1",
              borderRadius: 16,
              padding: "20px 24px",
              marginBottom: 32,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: "#0d9488", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: 6 }}>
              NOMOR TIKET LAPORAN
            </span>
            <strong style={{ fontSize: 24, fontWeight: 850, color: "#0f766e", fontFamily: "monospace" }}>
              {doneTicket.report_number}
            </strong>
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Button 
              size="large" 
              onClick={() => navigate("/app/layanan-mandiri")}
            >
              Kembali ke Layanan Mandiri
            </Button>
            <Button 
              type="primary" 
              size="large" 
              onClick={() => setDoneTicket(null)}
              style={{
                background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
                borderColor: "#0d9488",
                borderRadius: 8,
                fontWeight: 650,
                boxShadow: "0 4px 10px rgba(13, 148, 136, 0.2)"
              }}
            >
              Buat Laporan Baru
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const displayName = user?.employee?.name || user?.name || "Pengguna";
  const displayNip = user?.employee?.nip || user?.nip || "-";
  const displayUnit = user?.employee?.function_area || user?.unit_kerja || "-";

  return (
    <div className="fluid-ws">
      {/* ── Top Header Bar ── */}
      <header className="fluid-ws__header">
        <div className="fluid-ws__brand">
          <a href="/app/layanan-mandiri" className="fluid-ws__back-btn">
            <ArrowLeftOutlined /> <span>Kembali</span>
          </a>
          <div
            className="fluid-ws__brand-icon"
            style={{
              background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
              boxShadow: "0 4px 12px rgba(13, 148, 136, 0.4)",
              color: "#fff"
            }}
          >
            <ToolOutlined />
          </div>
          <span style={{ fontWeight: 700 }}>Pemeliharaan BMN</span>
        </div>
      </header>

      {/* ── Split Workspace ── */}
      <main className="fluid-ws__layout" style={{ display: "flex", flex: 1, height: "calc(100vh - 70px)", overflow: "hidden" }}>
        {/* Left Panel: Profile & Guide */}
        <div className="fluid-ws__panel-left" style={{ width: 380, borderRight: "1px solid #e2e8f0", background: "#fff", display: "flex", flexDirection: "column", height: "100%", boxShadow: "4px 0 24px rgba(0, 0, 0, 0.02)" }}>
          <div style={{ padding: 32, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0f172a", marginBottom: 6, letterSpacing: "-0.5px" }}>Profil Pelapor</h2>
              <p style={{ fontSize: "12.5px", color: "#64748b", lineHeight: 1.5, margin: 0 }}>
                Data identitas Anda akan direkam secara otomatis sebagai pelapor pemeliharaan/keluhan BMN ini.
              </p>
            </div>

            {/* Profile ID Card Style */}
            <div 
              style={{
                background: "linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)",
                border: "1px solid #99f6e4",
                borderRadius: 16,
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 16,
                boxShadow: "0 4px 12px rgba(13, 148, 136, 0.05)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <Avatar 
                  size={54} 
                  icon={<UserOutlined />} 
                  style={{ background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)", boxShadow: "0 4px 10px rgba(13, 148, 136, 0.3)" }} 
                />
                <div>
                  <span style={{ display: "block", fontSize: 15, fontWeight: 750, color: "#0f766e" }}>{displayName}</span>
                  <span style={{ fontSize: 12, color: "#0d9488", fontFamily: "monospace", fontWeight: 600 }}>NIP. {displayNip}</span>
                </div>
              </div>
              <div style={{ borderTop: "1px dashed #99f6e4", paddingTop: 12, display: "flex", justifyContent: "space-between", fontSize: 12, flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: "#0f766e", fontWeight: 500 }}>Unit Kerja:</span>
                  <strong style={{ color: "#115e59", textAlign: "right" }}>{displayUnit}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: "#0f766e", fontWeight: 500 }}>Status Akun:</span>
                  <strong style={{ color: "#115e59" }}><Tag color="teal" style={{ marginRight: 0, borderRadius: 6, fontWeight: 700 }}>AKTIF</Tag></strong>
                </div>
              </div>
            </div>

            {/* Steps Guide */}
            <div 
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 16,
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 14
              }}
            >
              <span style={{ fontWeight: 750, fontSize: 13, color: "#334155", display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircleOutlined style={{ color: "#0d9488" }} /> PANDUAN PELAPORAN
              </span>
              <ul style={{ paddingLeft: 16, margin: 0, display: "flex", flexDirection: "column", gap: 10, fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                <li>Pilih <strong>Pemeliharaan</strong> jika kendala terjadi pada aset BMN spesifik (alat kerja, laptop, printer, kendaraan dinas, dll.).</li>
                <li>Pilih <strong>Keluhan</strong> jika kendala bersifat umum atau terkait fasilitas gedung (air mati, AC ruangan panas, lampu padam, dll.).</li>
                <li>Tuliskan detail kronologi kerusakan secara jelas agar mempermudah tim logistik/sarana melakukan verifikasi.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right Panel: Form Content */}
        <div className="fluid-ws__panel-right" style={{ flex: 1, background: "#f8fafc", overflowY: "auto", display: "flex", justifyContent: "center", padding: "40px 20px" }}>
          <div style={{ maxWidth: 640, width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
            <Card 
              style={{
                borderRadius: 20,
                border: "1px solid #e2e8f0",
                boxShadow: "0 10px 30px -10px rgba(15, 23, 42, 0.04)"
              }}
              headStyle={{ borderBottom: "1px solid #f1f5f9", padding: "16px 24px" }}
              bodyStyle={{ padding: 24 }}
              title={
                <span style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                  <ToolOutlined style={{ color: "#0d9488" }} /> Buat Laporan Baru
                </span>
              }
            >
              <Form form={form} layout="vertical" onFinish={onSubmit} requiredMark="optional">
                {/* Type Selection */}
                <Form.Item
                  name="report_type"
                  label={<span style={{ fontWeight: 700, color: "#475569" }}>Jenis Laporan</span>}
                  rules={[{ required: true, message: "Silakan pilih jenis laporan" }]}
                >
                  <Radio.Group className="bmn-type-group">
                    <Radio.Button value="pemeliharaan" className="bmn-type-btn">
                      <BuildOutlined /> Pemeliharaan Aset
                    </Radio.Button>
                    <Radio.Button value="keluhan" className="bmn-type-btn">
                      <AlertOutlined /> Keluhan Umum
                    </Radio.Button>
                  </Radio.Group>
                </Form.Item>

                {reportType === "pemeliharaan" && (
                  <Form.Item
                    name="asset_id"
                    label={<span style={{ fontWeight: 700, color: "#475569" }}>Pilih Aset BMN</span>}
                    rules={[{ required: true, message: "Silakan pilih aset BMN yang berkendala" }]}
                  >
                    <Select
                      showSearch
                      loading={loadingAssets}
                      options={assetOptions}
                      placeholder="Ketik nama aset, kode BMN, atau merek..."
                      optionFilterProp="searchLabel"
                      size="large"
                      optionRender={(option) => {
                        const data = option.data?.asset ?? {};
                        return (
                          <div className="bmn-asset-option" style={{ padding: "6px 0" }}>
                            <div className="bmn-asset-option-title" style={{ fontWeight: 700, color: "#0f172a" }}>{data.name || "-"}</div>
                            <div className="bmn-asset-option-meta" style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                              Kode BMN: {data.asset_code || "-"} | Merek: {data.brand || "-"} | Model: {data.model || "-"}
                            </div>
                          </div>
                        );
                      }}
                    />
                  </Form.Item>
                )}

                {/* Selected Asset Information Card */}
                {reportType === "pemeliharaan" && selectedAsset && (
                  <Card 
                    size="small" 
                    style={{
                      background: "#f0fdfa",
                      border: "1px solid #ccfbf1",
                      borderRadius: 12,
                      marginBottom: 20
                    }}
                    bodyStyle={{ padding: 16 }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <Text strong style={{ color: "#0f766e", fontSize: 13 }}>Informasi Aset Dipilih</Text>
                      <Tag color="teal" style={{ borderRadius: 6, fontWeight: 700 }}>{selectedAsset.status || "aktif"}</Tag>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px", fontSize: 12 }}>
                      <div>
                        <span style={{ display: "block", color: "#0d9488", fontSize: 11 }}>Nama Aset</span>
                        <strong style={{ color: "#115e59" }}>{selectedAsset.name || "-"}</strong>
                      </div>
                      <div>
                        <span style={{ display: "block", color: "#0d9488", fontSize: 11 }}>Kode BMN</span>
                        <strong style={{ color: "#115e59", fontFamily: "monospace" }}>{selectedAsset.asset_code || "-"}</strong>
                      </div>
                      <div>
                        <span style={{ display: "block", color: "#0d9488", fontSize: 11 }}>Merek / Model</span>
                        <strong style={{ color: "#115e59" }}>{selectedAsset.brand || "-"} / {selectedAsset.model || "-"}</strong>
                      </div>
                      <div>
                        <span style={{ display: "block", color: "#0d9488", fontSize: 11 }}>Lokasi</span>
                        <strong style={{ color: "#115e59" }}>{selectedAsset.location || "-"}</strong>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Description details */}
                {reportType && (
                  <Form.Item
                    name="report_details"
                    label={
                      <span style={{ fontWeight: 700, color: "#475569" }}>
                        {reportType === "keluhan" ? "Jelaskan Keluhan" : "Deskripsi Kerusakan / Kendala"}
                      </span>
                    }
                    rules={[{ required: true, message: "Detail laporan wajib diisi" }]}
                  >
                    <Input.TextArea
                      rows={5}
                      placeholder={
                        reportType === "keluhan"
                          ? "Ketik kendala fasilitas gedung secara rinci (misal: AC ruang pelayanan bocor, keran air toilet belakang patah)..."
                          : "Tuliskan kronologi kerusakan barang BMN, gejala kendala, atau kebutuhan servis pemeliharaan..."
                      }
                      style={{ borderRadius: 10 }}
                    />
                  </Form.Item>
                )}

                {reportType && (
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SendOutlined />}
                    loading={submitting}
                    size="large"
                    style={{
                      background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
                      borderColor: "#0d9488",
                      borderRadius: 10,
                      fontWeight: 700,
                      width: "100%",
                      height: 46,
                      boxShadow: "0 4px 12px rgba(13, 148, 136, 0.2)",
                      marginTop: 8
                    }}
                  >
                    Kirim Laporan
                  </Button>
                )}
              </Form>
            </Card>

            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#64748b", fontSize: 12.5, padding: "0 8px" }}>
              <ToolOutlined style={{ color: "#0d9488" }} /> <span>Laporan yang dikirim akan langsung diteruskan ke tim Pengelola BMN Balai POM Palopo.</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
