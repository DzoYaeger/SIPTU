import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  App as AntdApp,
  Button,
  Card,
  DatePicker,
  Divider,
  Descriptions,
  Form,
  Input,
  Result,
  Select,
  Space,
  Tag,
  Typography,
  Avatar,
  Badge,
  Tooltip,
  Alert
} from "antd";
import { ArrowLeftOutlined, SafetyCertificateOutlined, FileTextOutlined, UserOutlined, InfoCircleOutlined, FormOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import PublicFormLayout from "../layouts/PublicFormLayout.jsx";
// import SignatureCanvas from "../components/SignatureCanvas.jsx";
import { buildMessageAdapter } from "../utils/notify.js";
import { useAuth } from "../hooks/useAuth.js";

// Kearsipan Module Colors (from Layanan Mandiri)
const KEARSIPAN_COLORS = {
  primary: "#3b82f6",
  gradient: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
  shadowColor: "rgba(59, 130, 246, 0.4)",
};

const MANUAL_FLAG_KEY = "siptu.archiveLoan.manualMode";

const PublicArchiveLoanRequestPage = () => {
  const { message } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);
  const { user, apiFetch } = useAuth();
  const [form] = Form.useForm();

  const [employees, setEmployees] = useState([]);
  const [archiveUnits, setArchiveUnits] = useState([]);
  const [loading, setLoading] = useState({ employees: true, units: true });
  const [loadError, setLoadError] = useState({
    employees: false,
    units: false,
  });
  const [manualMode, setManualMode] = useState(() => {
    if (import.meta.env.VITE_PUBLIC_ARCHIVE_FORCE_MANUAL === "true")
      return true;
    try {
      return window.localStorage?.getItem(MANUAL_FLAG_KEY) === "true";
    } catch (error) {
      return false;
    }
  });
  const didInitRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [resultLoan, setResultLoan] = useState(null);

  const employeeMap = useMemo(
    () => new Map((employees || []).map((item) => [item.nip, item])),
    [employees],
  );
  const normalizeUnitLabel = useCallback((value) => {
    if (!value) return value;
    return value.replace(/keasipan/gi, "Kearsipan");
  }, []);
  const defaultNip = useMemo(
    () => user?.nip ?? user?.employee?.nip ?? "",
    [user],
  );
  const defaultName = useMemo(
    () => user?.name ?? user?.employee?.nama ?? user?.employee?.name ?? "",
    [user],
  );
  const defaultUnit = useMemo(
    () => user?.employee?.fungsi_bidang ?? user?.employee?.function_area ?? "",
    [user],
  );

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await apiFetch("/employees");
      if (!response.ok) {
        throw new Error("Gagal memuat data pegawai.");
      }
      const data = await response.json().catch(() => null);
      const items = Array.isArray(data) ? data : (data?.data ?? []);
      setEmployees(items);
      setLoadError((prev) => ({ ...prev, employees: false }));
    } catch (error) {
      notification.error({ message: error.message });
      setLoadError((prev) => ({ ...prev, employees: true }));
    } finally {
      setLoading((prev) => ({ ...prev, employees: false }));
    }
  }, [notification, apiFetch, normalizeUnitLabel]);

  const fetchArchiveUnits = useCallback(async () => {
    try {
      const response = await apiFetch("/archive-units");
      if (!response.ok) {
        throw new Error("Gagal memuat data unit pengolah.");
      }
      const data = await response.json().catch(() => null);
      const units = Array.isArray(data) ? data : (data?.units ?? data?.data ?? []);
      const normalizedUnits = (units || []).map((unit) => ({
        ...unit,
        nama: normalizeUnitLabel(unit.nama),
        fungsi_bidang: normalizeUnitLabel(unit.fungsi_bidang),
      }));
      setArchiveUnits(normalizedUnits);
      setLoadError((prev) => ({ ...prev, units: false }));
    } catch (error) {
      notification.error({ message: error.message });
      setLoadError((prev) => ({ ...prev, units: true }));
      setManualMode(true);
      try {
        window.localStorage?.setItem(MANUAL_FLAG_KEY, "true");
      } catch (err) {
        // ignore storage errors
      }
    } finally {
      setLoading((prev) => ({ ...prev, units: false }));
    }
  }, [notification, apiFetch]);

  const retryLoadData = useCallback(() => {
    try {
      window.localStorage?.removeItem(MANUAL_FLAG_KEY);
    } catch (error) {
      // ignore storage errors
    }
    setManualMode(false);
    setLoadError({ employees: false, units: false });
    setLoading({ employees: true, units: true });
    fetchEmployees();
    fetchArchiveUnits();
  }, [fetchEmployees, fetchArchiveUnits]);

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    if (manualMode) {
      setLoadError((prev) => ({ ...prev, employees: true }));
      setLoading((prev) => ({ ...prev, employees: false }));
    } else {
      fetchEmployees();
    }
    fetchArchiveUnits();
  }, [fetchEmployees, fetchArchiveUnits, manualMode]);

  function handleNipChange(nip) {
    const employee = employeeMap.get(nip);
    form.setFieldsValue({
      nama: employee?.name ?? employee?.nama ?? "",
    });
  }

  // Pre-fill form when user or employees data changes
  useEffect(() => {
    if (!user) return;
    
    const nip = user?.nip ?? user?.employee?.nip;
    const name = user?.name ?? user?.employee?.name ?? user?.employee?.nama;
    
    if (nip) {
      form.setFieldsValue({
        nip: nip,
        nama: name,
      });
    }
  }, [user, form]);

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      const employee = employeeMap.get(values.nip);
      
      const payload = {
        ...values,
        borrow_date: values.borrow_date
          ? dayjs(values.borrow_date).format("YYYY-MM-DD")
          : null,
        borrower_name: employee?.name ?? employee?.nama ?? values.nama ?? "-",
        borrower_nip: values.nip ?? null,
        borrower_work_unit:
          employee?.fungsi_bidang ??
          employee?.function_area ??
          defaultUnit ??
          null,
      };

      setSubmitting(true);
      const response = await apiFetch("/public/archive-loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message ?? "Gagal mengirim pengajuan.");
      }
      const loan = data?.loan;
      if (!loan) {
        throw new Error("Data pengajuan tidak ditemukan.");
      }
      setResultLoan(loan);
      form.resetFields();
    } catch (error) {
      if (error?.errorFields) {
        return;
      }
      notification.error({
        message: "Gagal mengirim pengajuan",
        description: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  }, [employeeMap, form, notification, apiFetch, defaultUnit]);

  if (resultLoan) {
    return (
      <PublicFormLayout>
        <div
          style={{
            padding: "60px 20px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              maxWidth: 600,
              width: "100%",
              background: "#fff",
              padding: 40,
              borderRadius: 16,
              border: "1px solid #e2e8f0",
              boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: KEARSIPAN_COLORS.gradient,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 24px",
                boxShadow: `0 8px 20px ${KEARSIPAN_COLORS.shadowColor}`,
              }}
            >
              <SafetyCertificateOutlined
                style={{ fontSize: 40, color: "#fff" }}
              />
            </div>
            <Typography.Title
              level={2}
              style={{ marginBottom: 8, color: "#0f172a" }}
            >
              Pengajuan Berhasil!
            </Typography.Title>
            <Typography.Text
              style={{
                fontSize: 16,
                color: "#64748b",
                display: "block",
                marginBottom: 32,
              }}
            >
              Status pengajuan Anda saat ini: menunggu tanda tangan validator.
            </Typography.Text>
            <Card
              size="small"
              title={
                <span style={{ color: KEARSIPAN_COLORS.primary }}>
                  <FileTextOutlined /> Ringkasan Pengajuan
                </span>
              }
              variant="borderless"
              style={{ marginBottom: 24, textAlign: "left" }}
            >
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="Nomor Pengajuan">
                  {resultLoan.request_number}
                </Descriptions.Item>
                <Descriptions.Item label="Tanggal Pinjam">
                  {dayjs(resultLoan.borrow_date).format("DD MMM YYYY")}
                </Descriptions.Item>
                <Descriptions.Item label="Nama">
                  {resultLoan.borrower_name}
                </Descriptions.Item>
                <Descriptions.Item label="NIP">
                  {resultLoan.borrower_nip ?? "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Fungsi/Bidang">
                  {resultLoan.borrower_work_unit ?? "-"}
                </Descriptions.Item>
                <Descriptions.Item label="No Arsip">
                  {resultLoan.archive_number}
                </Descriptions.Item>
                <Descriptions.Item label="Format Arsip">
                  {resultLoan.archive_format}
                </Descriptions.Item>
                <Descriptions.Item label="Jenis Naskah">
                  {resultLoan.document_type}
                </Descriptions.Item>
                <Descriptions.Item label="Tujuan">
                  {resultLoan.purpose}
                </Descriptions.Item>
                <Descriptions.Item label="Unit Pengolah">
                  {resultLoan.unit_pengolah?.fungsi_bidang ?? "-"}
                </Descriptions.Item>
              </Descriptions>
            </Card>
            <Space>
              <Button
                type="primary"
                style={{
                  background: KEARSIPAN_COLORS.gradient,
                  borderColor: KEARSIPAN_COLORS.primary,
                }}
                onClick={() =>
                  window.open(
                    `/kearsipan-peminjaman/${resultLoan.public_token}`,
                    "_blank",
                    "noopener",
                  )
                }
              >
                Lihat Riwayat
              </Button>
              <Button onClick={() => setResultLoan(null)}>
                Ajukan Peminjaman Baru
              </Button>
            </Space>
            <Typography.Paragraph
              style={{ marginTop: 24, color: "#94a3b8", fontSize: 13 }}
            >
              Tautan tanda tangan pengembalian akan dikirimkan setelah admin
              memproses pengembalian.
            </Typography.Paragraph>
          </div>
        </div>
      </PublicFormLayout>
    );
  }

  return (
    <PublicFormLayout>
      <div style={{ padding: "40px 20px", maxWidth: 800, margin: "0 auto" }}>
        <div style={{ marginBottom: 16 }}>
          <Button type="text" icon={<ArrowLeftOutlined />} href="/app/layanan-mandiri" style={{ padding: '4px 0', color: '#64748b', fontWeight: 500 }}>Kembali</Button>
        </div>
        {/* Header with Icon */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: KEARSIPAN_COLORS.gradient,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: `0 8px 20px ${KEARSIPAN_COLORS.shadowColor}`,
            }}
          >
            <SafetyCertificateOutlined
              style={{ fontSize: 32, color: "#fff" }}
            />
          </div>
          <Typography.Title level={3} style={{ margin: 0, color: "#0f172a" }}>
            Formulir Peminjaman Arsip
          </Typography.Title>
          <Typography.Text type="secondary">
            Lengkapi data berikut untuk mengajukan peminjaman arsip
          </Typography.Text>
        </div>

        <div style={{ display: "grid", gap: 24 }}>
          {/* Section 1: Data Peminjam */}
          <Card 
            title={<><UserOutlined /> Data Peminjam</>}
            variant="borderless"
            style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
          >
            {user ? (
              <div style={{ 
                background: '#f8fafc', 
                padding: '16px', 
                borderRadius: '12px', 
                marginBottom: '16px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                <Avatar size={64} icon={<UserOutlined />} style={{ background: KEARSIPAN_COLORS.gradient }} />
                <div style={{ flex: 1 }}>
                  <Typography.Title level={5} style={{ margin: 0 }}>{user.name ?? user.employee?.name}</Typography.Title>
                  <Typography.Text type="secondary">{user.nip ?? user.employee?.nip}</Typography.Text>
                  <div style={{ marginTop: 4 }}>
                    <Tag color="blue">{user.employee?.fungsi_bidang ?? 'Pegawai'}</Tag>
                    <Badge status="processing" text="Terverifikasi" />
                  </div>
                </div>
                <Tooltip title="Data ini diambil otomatis dari profil login Anda.">
                  <InfoCircleOutlined style={{ color: '#94a3b8', fontSize: 18 }} />
                </Tooltip>
              </div>
            ) : null}

            <Form form={form} layout="vertical">
              <div style={{ display: user ? 'none' : 'block' }}>
                <Form.Item
                  name="nip"
                  label="NIP Pegawai"
                  rules={[{ required: true, message: "NIP wajib dipilih." }]}
                >
                  {loadError.employees ? (
                    <Input placeholder="Masukkan NIP pegawai" />
                  ) : (
                    <Select
                      showSearch
                      placeholder="Cari NIP atau nama"
                      onChange={handleNipChange}
                      loading={loading.employees}
                      options={(employees || []).map((employee) => ({
                        value: employee.nip,
                        label: `${employee.nip} - ${employee.name ?? employee.nama ?? 'Tanpa Nama'}`,
                      }))}
                      optionFilterProp="label"
                    />
                  )}
                </Form.Item>
                <Form.Item name="nama" label="Nama Peminjam">
                  <Input readOnly={!loadError.employees} />
                </Form.Item>
              </div>

              <Form.Item
                name="borrow_date"
                label="Tanggal Pinjam"
                rules={[
                  { required: true, message: "Tanggal pinjam wajib diisi." },
                ]}
                initialValue={dayjs()}
              >
                <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
              </Form.Item>
            </Form>
          </Card>

          {/* Section 2: Detail Arsip */}
          <Card 
            title={<><FileTextOutlined /> Detail Arsip</>}
            variant="borderless"
            style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
          >
            <Form form={form} layout="vertical">
              <Form.Item
                name="archive_unit_id"
                label="Unit Pengolah Arsip"
                rules={[
                  { required: true, message: "Unit pengolah wajib dipilih." },
                ]}
              >
                <Select
                  showSearch
                  placeholder="Pilih unit pengolah arsip"
                  loading={loading.units}
                  disabled={loadError.units && archiveUnits.length === 0}
                  options={(archiveUnits || []).map((unit) => ({
                    value: unit.id,
                    label: normalizeUnitLabel(
                      unit.nama ??
                        unit.fungsi_bidang ??
                        unit.function_area ??
                        "-",
                    ),
                  }))}
                  optionFilterProp="label"
                />
              </Form.Item>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Form.Item
                  name="archive_format"
                  label="Format Arsip"
                  rules={[{ required: true, message: "Pilih format." }]}
                >
                  <Select placeholder="Pilih format">
                    <Select.Option value="Konvensional">Konvensional</Select.Option>
                    <Select.Option value="Elektronik">Elektronik</Select.Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  name="document_type"
                  label="Jenis Naskah"
                  rules={[{ required: true, message: "Pilih jenis." }]}
                >
                  <Select placeholder="Pilih jenis">
                    <Select.Option value="Surat Dinas">Surat Dinas</Select.Option>
                    <Select.Option value="Nota Dinas">Nota Dinas</Select.Option>
                    <Select.Option value="Surat Perintah">Surat Perintah</Select.Option>
                    <Select.Option value="Berita Acara">Berita Acara</Select.Option>
                    <Select.Option value="Laporan">Laporan</Select.Option>
                  </Select>
                </Form.Item>
              </div>

              <Form.Item
                name="archive_number"
                label="Nomor Arsip / Berkas"
                rules={[{ required: true, message: "Nomor arsip wajib diisi." }]}
              >
                <Input placeholder="Contoh: 005/KP.01/2024" />
              </Form.Item>

              <Form.Item
                name="purpose"
                label="Tujuan Peminjaman"
                rules={[{ required: true, message: "Tujuan wajib diisi." }]}
              >
                <Input.TextArea
                  placeholder="Masukkan alasan atau tujuan peminjaman"
                  autoSize={{ minRows: 2, maxRows: 4 }}
                />
              </Form.Item>
            </Form>
          </Card>

          {/* Section 3: Tanda Tangan Elektronik */}
          <Card 
            title={<><SafetyCertificateOutlined /> Tanda Tangan Elektronik (TTE)</>}
            variant="borderless"
            style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
          >
            <Typography.Paragraph type="secondary">
              Gunakan kata sandi akun SIPTU Anda untuk menandatangani permohonan ini secara digital.
            </Typography.Paragraph>
            
            <Form form={form} layout="vertical">
              <Form.Item
                name="password"
                label="Kata Sandi SIPTU"
                rules={[{ required: true, message: "Kata sandi wajib diisi untuk tanda tangan." }]}
              >
                <Input.Password 
                  prefix={<SafetyCertificateOutlined style={{ color: '#94a3b8' }} />}
                  placeholder="Masukkan kata sandi Anda" 
                  size="large"
                />
              </Form.Item>
            </Form>

            <Alert
              message="Informasi Keamanan"
              description="Dengan memasukkan kata sandi, Anda setuju bahwa data yang diberikan adalah benar dan bersedia mematuhi aturan peminjaman arsip."
              type="info"
              showIcon
              style={{ borderRadius: '8px' }}
            />
          </Card>

          <div style={{ marginTop: 8 }}>
            <Button
              type="primary"
              size="large"
              loading={submitting}
              onClick={handleSubmit}
              block
              style={{
                height: '56px',
                fontSize: '18px',
                fontWeight: 600,
                background: KEARSIPAN_COLORS.gradient,
                borderColor: KEARSIPAN_COLORS.primary,
                boxShadow: `0 8px 20px ${KEARSIPAN_COLORS.shadowColor}`,
                borderRadius: '12px'
              }}
            >
              Kirim Pengajuan Peminjaman
            </Button>
          </div>
        </div>
      </div>
    </PublicFormLayout>
  );
};

export default PublicArchiveLoanRequestPage;
