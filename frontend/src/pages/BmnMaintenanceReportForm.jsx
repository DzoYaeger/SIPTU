import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  App as AntdApp,
  Button,
  Card,
  Form,
  Input,
  Radio,
  Select,
  Tag,
  Typography,
  Result,
  Modal,
  Space,
} from "antd";
import {
  CheckCircleFilled,
  BuildOutlined,
  SendOutlined,
  ToolOutlined,
  UserOutlined,
  AlertOutlined,
  CopyOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useAuth } from "../hooks/useAuth.js";

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

  // Set default report_type to "pemeliharaan"
  useEffect(() => {
    form.setFieldsValue({ report_type: "pemeliharaan" });
  }, [form]);

  // Fetch BMN Assets
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
        label: `${a.name || "-"} — Kode BMN: ${a.asset_code || "-"}`,
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
      message.success("Laporan pemeliharaan BMN berhasil dikirim!");
    } catch (error) {
      message.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div style={{ padding: "80px 20px", textAlign: "center" }}>
        <Result
          status="warning"
          title="Silakan login terlebih dahulu"
          subTitle="Halaman pengajuan pemeliharaan BMN ini khusus pengguna terautentikasi."
          extra={
            <Button type="primary" size="large" onClick={() => navigate("/login")}>
              Menuju Halaman Login
            </Button>
          }
        />
      </div>
    );
  }

  const displayName = user?.employee?.name || user?.name || "Pengguna";
  const displayNip = user?.employee?.nip || user?.nip || "-";
  const displayUnit = user?.employee?.function_area || user?.unit_kerja || "-";

  return (
    <div style={{ padding: "20px 24px 60px", maxWidth: "100%", width: "100%", margin: "0 auto" }}>
      {/* ── Compact Profile / Pelapor Header Bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              background: "#0F5B99",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
            }}
          >
            <UserOutlined />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1f2e" }}>
              {displayName}
            </div>
            <div style={{ fontSize: 11, color: "#64748b" }}>
              NIP. {displayNip} • Unit: {displayUnit}
            </div>
          </div>
        </div>

        <Tag color="blue" style={{ borderRadius: 4, fontWeight: 600, fontSize: 11 }}>
          Status Pelapor: Aktif
        </Tag>
      </div>

      <Form form={form} layout="vertical" onFinish={onSubmit} initialValues={{ report_type: "pemeliharaan" }}>
        {/* ════════════ SEKSI 1: Form Pengajuan Pemeliharaan BMN ════════════ */}
        <Card
          size="small"
          title={
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0F5B99", display: "flex", alignItems: "center", gap: 6 }}>
              <ToolOutlined /> Form Pengajuan Pemeliharaan / Perbaikan BMN
            </div>
          }
          style={{ borderRadius: 10, border: "1px solid #e2e8f0", marginBottom: 16 }}
        >
          <Form.Item
            name="report_type"
            label="Kategori Pengajuan"
            rules={[{ required: true, message: "Pilih kategori pengajuan." }]}
            style={{ marginBottom: 16 }}
          >
            <Radio.Group style={{ width: "100%" }}>
              <Radio.Button value="pemeliharaan" style={{ borderRadius: "6px 0 0 6px", padding: "0 16px" }}>
                <BuildOutlined style={{ marginRight: 6 }} /> Pemeliharaan / Servis Aset BMN
              </Radio.Button>
              <Radio.Button value="keluhan" style={{ borderRadius: "0 6px 6px 0", padding: "0 16px" }}>
                <AlertOutlined style={{ marginRight: 6 }} /> Keluhan Fasilitas Umum Gedung
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          {reportType === "pemeliharaan" && (
            <Form.Item
              name="asset_id"
              label="Pilih Aset BMN Berkendala"
              rules={[{ required: true, message: "Silakan pilih aset BMN yang akan dipelihara." }]}
              style={{ marginBottom: 12 }}
            >
              <Select
                showSearch
                loading={loadingAssets}
                options={assetOptions}
                placeholder="Cari berdasarkan nama aset, kode BMN, merek, atau model..."
                optionFilterProp="searchLabel"
                style={{ borderRadius: 6 }}
                optionRender={(option) => {
                  const data = option.data?.asset ?? {};
                  return (
                    <div style={{ padding: "4px 0" }}>
                      <div style={{ fontWeight: 600, color: "#1a1f2e", fontSize: 12.5 }}>{data.name || "-"}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>
                        Kode BMN: {data.asset_code || "-"} | Merek: {data.brand || "-"} | Model: {data.model || "-"}
                      </div>
                    </div>
                  );
                }}
              />
            </Form.Item>
          )}

          {/* Asset Info Card */}
          {reportType === "pemeliharaan" && selectedAsset && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 6,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#0F5B99" }}>
                  Aset Dipilih: {selectedAsset.name}
                </span>
                <Tag color="blue" style={{ borderRadius: 4, fontSize: 10.5, fontWeight: 600 }}>
                  {selectedAsset.status || "Aktif"}
                </Tag>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 11.5, color: "#475569" }}>
                <div><strong>Kode BMN:</strong> {selectedAsset.asset_code || "-"}</div>
                <div><strong>Merek/Model:</strong> {selectedAsset.brand || "-"} / {selectedAsset.model || "-"}</div>
                <div><strong>Lokasi:</strong> {selectedAsset.location || "-"}</div>
              </div>
            </div>
          )}

          <Form.Item
            name="report_details"
            label={reportType === "keluhan" ? "Rincian Keluhan Gedung / Fasilitas" : "Deskripsi Kerusakan / Gejala Kendala Aset"}
            rules={[{ required: true, message: "Deskripsi kendala wajib diisi." }]}
            style={{ marginBottom: 12 }}
          >
            <Input.TextArea
              rows={4}
              placeholder={
                reportType === "keluhan"
                  ? "Jelaskan kendala fasilitas gedung secara rinci (misal: AC ruang rapat 2 tidak dingin, keran air bocor)..."
                  : "Uraikan kronologi kerusakan, gejala kendala barang BMN, atau jenis perbaikan/servis yang dibutuhkan..."
              }
              style={{ borderRadius: 6, fontSize: 13 }}
            />
          </Form.Item>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <Button
              type="primary"
              size="large"
              icon={<SendOutlined />}
              loading={submitting}
              htmlType="submit"
              style={{
                borderRadius: 6,
                fontWeight: 600,
                backgroundColor: "#0F5B99",
                padding: "0 28px",
              }}
            >
              Kirim Pengajuan Pemeliharaan
            </Button>
          </div>
        </Card>
      </Form>

      {/* ── Modal Popup Result (Done Ticket) ── */}
      <Modal
        title={null}
        open={!!doneTicket}
        onCancel={() => setDoneTicket(null)}
        footer={null}
        width={460}
        centered
      >
        {doneTicket && (
          <div style={{ textAlign: "center", padding: "12px 0 6px 0" }}>
            <CheckCircleFilled style={{ fontSize: 52, color: "#10b981", marginBottom: 14 }} />
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px 0", color: "#1a1f2e" }}>
              Laporan Berhasil Terkirim!
            </h3>
            <p style={{ fontSize: 12.5, color: "#64748b", margin: "0 0 16px 0" }}>
              Pengajuan pemeliharaan BMN Anda telah berhasil direkam dalam sistem.
            </p>

            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "12px 16px",
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
                NOMOR TIKET LAPORAN
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#0F5B99", fontFamily: "monospace", margin: "4px 0" }}>
                {doneTicket.report_number || doneTicket.ticket_number || `MNT-${doneTicket.id}`}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Button
                icon={<CopyOutlined />}
                onClick={() => {
                  navigator.clipboard.writeText(doneTicket.report_number || doneTicket.ticket_number || `MNT-${doneTicket.id}`);
                  message.success("Nomor tiket berhasil disalin!");
                }}
                style={{ borderRadius: 6 }}
              >
                Salin Nomor Tiket
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setDoneTicket(null);
                  form.resetFields();
                  form.setFieldsValue({ report_type: "pemeliharaan" });
                }}
                style={{ borderRadius: 6, backgroundColor: "#0F5B99", borderColor: "#0F5B99" }}
              >
                Buat Pengajuan Baru
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
