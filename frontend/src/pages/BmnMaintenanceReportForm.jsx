import { useEffect, useMemo, useState } from "react";
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
  Space,
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

const { Title, Text } = Typography;
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

export default function BmnMaintenanceReportForm() {
  const { apiFetch, token, user } = useAuth();
  const { message } = AntdApp.useApp();
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
      <Result
        status="warning"
        title="Silakan login terlebih dahulu"
        subTitle="Halaman pelaporan BMN ini hanya untuk pengguna yang sudah login."
      />
    );
  }

  if (doneTicket) {
    return (
      <div className="bmn-report-wrapper">
        <div className="bmn-report-container bmn-report-result">
          <Result
            status="success"
            title="Laporan berhasil dikirim"
            subTitle="Nomor laporan Anda:"
            extra={[
              <Card key="ticket" className="content-card" style={{ minWidth: 300 }}>
                <Title level={4} style={{ margin: 0 }}>
                  {doneTicket.report_number}
                </Title>
              </Card>,
              <Button key="new" type="primary" onClick={() => setDoneTicket(null)}>
                Buat Laporan Baru
              </Button>,
            ]}
          />
        </div>
      </div>
    );
  }

  const displayName = user?.employee?.name || user?.name || "Pengguna";
  const displayNip = user?.employee?.nip || user?.nip || "-";
  const displayUnit = user?.employee?.function_area || user?.unit_kerja || "-";

  return (
    <div className="bmn-report-wrapper">
      <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%', padding: '16px 20px 0' }}>
        <a href="/app/layanan-mandiri" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
          <ArrowLeftOutlined /> Kembali
        </a>
      </div>
      <div className="bmn-report-container">
        <div className="bmn-report-left">
          <div>
            <Title level={3} style={{ marginBottom: 8, color: "#0f766e" }}>
              Form Pemeliharaan/Keluhan BMN
            </Title>
            <Text type="secondary">
              Pilih jenis laporan dan kirim detail permasalahan agar tim dapat
              menindaklanjuti lebih cepat.
            </Text>
          </div>

          <Card className="bmn-passport-card" bordered={false}>
            <div className="bmn-passport-head">
              <Avatar size={68} icon={<UserOutlined />} className="bmn-avatar" />
              <div>
                <Text strong style={{ display: "block", fontSize: 16 }}>
                  {displayName}
                </Text>
                <Text type="secondary">{displayNip}</Text>
              </div>
            </div>

            <Divider style={{ margin: "16px 0" }} />

            <div className="bmn-info-row">
              <span>Unit Kerja</span>
              <strong>{displayUnit}</strong>
            </div>
            <div className="bmn-info-row">
              <span>Status Akun</span>
              <strong>Aktif</strong>
            </div>
          </Card>

          <Card className="bmn-guide-card" bordered={false}>
            <Space direction="vertical" size={10}>
              <Text strong>
                <CheckCircleOutlined style={{ color: "#14b8a6" }} /> Panduan
              </Text>
              <Text type="secondary">
                Pilih <b>Pemeliharaan</b> jika terkait BMN tertentu.
              </Text>
              <Text type="secondary">
                Pilih <b>Keluhan</b> jika kendala bersifat umum.
              </Text>
              <Text type="secondary">
                Jelaskan detail masalah agar proses tindak lanjut lebih akurat.
              </Text>
            </Space>
          </Card>
        </div>

        <div className="bmn-report-right">
          <Card className="form-card" title="Pengajuan Laporan" bordered={false}>
            <Form form={form} layout="vertical" onFinish={onSubmit} className="module-form">
              <Form.Item
                name="report_type"
                label="Jenis Laporan"
                rules={[{ required: true, message: "Pilih jenis laporan" }]}
              >
                <Radio.Group className="bmn-type-group">
                  <Radio.Button value="pemeliharaan" className="bmn-type-btn">
                    <BuildOutlined /> Pemeliharaan
                  </Radio.Button>
                  <Radio.Button value="keluhan" className="bmn-type-btn">
                    <AlertOutlined /> Keluhan
                  </Radio.Button>
                </Radio.Group>
              </Form.Item>

              {reportType === "pemeliharaan" ? (
                <Form.Item
                  name="asset_id"
                  label="Pilih Aset BMN"
                  rules={[{ required: true, message: "Pilih aset BMN" }]}
                >
                  <Select
                    showSearch
                    loading={loadingAssets}
                    options={assetOptions}
                    placeholder="Cari dan pilih aset BMN"
                    optionFilterProp="searchLabel"
                    optionRender={(option) => {
                      const data = option.data?.asset ?? {};
                      return (
                        <div className="bmn-asset-option">
                          <div className="bmn-asset-option-title">{data.name || "-"}</div>
                          <div className="bmn-asset-option-meta">
                            Kode: {data.asset_code || "-"} | Merek: {data.brand || "-"} | Model: {data.model || "-"}
                          </div>
                        </div>
                      );
                    }}
                  />
                </Form.Item>
              ) : null}

              {reportType === "pemeliharaan" && selectedAsset ? (
                <Card size="small" className="bmn-selected-asset-card">
                  <div className="bmn-selected-asset-head">
                    <Text strong>Informasi Aset Dipilih</Text>
                    <Tag color="geekblue">{selectedAsset.status || "aktif"}</Tag>
                  </div>
                  <div className="bmn-selected-asset-grid">
                    <div>
                      <span>Nama Aset</span>
                      <strong>{selectedAsset.name || "-"}</strong>
                    </div>
                    <div>
                      <span>Kode BMN</span>
                      <strong>{selectedAsset.asset_code || "-"}</strong>
                    </div>
                    <div>
                      <span>Merek/Model</span>
                      <strong>
                        {selectedAsset.brand || "-"} / {selectedAsset.model || "-"}
                      </strong>
                    </div>
                    <div>
                      <span>Lokasi</span>
                      <strong>{selectedAsset.location || "-"}</strong>
                    </div>
                  </div>
                </Card>
              ) : null}

              <Form.Item
                name="report_details"
                label={
                  reportType === "keluhan"
                    ? "Jelaskan Keluhan"
                    : "Jelaskan Kebutuhan Pemeliharaan"
                }
                rules={[{ required: true, message: "Detail laporan wajib diisi" }]}
              >
                <Input.TextArea
                  rows={5}
                  placeholder="Tuliskan detail masalah agar tim lebih mudah melakukan tindak lanjut..."
                />
              </Form.Item>

              <Button
                type="primary"
                htmlType="submit"
                icon={<SendOutlined />}
                loading={submitting}
                className="bmn-submit-btn"
              >
                Kirim Laporan
              </Button>
            </Form>
          </Card>
          <div className="bmn-note-line">
            <ToolOutlined /> Laporan akan otomatis masuk ke dashboard validator/admin BMN.
          </div>
        </div>
      </div>
    </div>
  );
}
