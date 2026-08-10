import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Typography,
  message,
  Spin,
  Tag,
  Modal,
  AutoComplete,
  Space,
  Card,
  Divider,
} from "antd";
import {
  FileProtectOutlined,
  SendOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  CalendarOutlined,
  DollarOutlined,
  UserOutlined,
  CloseOutlined,
  CrownOutlined,
  LockOutlined,
  CheckCircleFilled,
  PlusOutlined,
  CarOutlined,
  UserAddOutlined,
  FilePdfOutlined,
  BankOutlined,
  ShopOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "../hooks/useAuth.js";

const { RangePicker } = DatePicker;
const { TextArea } = Input;

const LOKASI_OPTIONS = [
  "Kota Palopo",
  "Kabupaten Luwu",
  "Kabupaten Luwu Utara",
  "Kabupaten Luwu Timur",
  "Kabupaten Tana Toraja",
  "Kabupaten Toraja Utara",
  "Kabupaten Enrekang",
];

const TRANSPORT_OPTIONS = [
  "Kendaraan Dinas Roda 4 (Mobil)",
  "Kendaraan Dinas Roda 2 (Motor)",
  "Pesawat Udara",
  "Kendaraan Umum / Travel",
  "Lainnya",
];

const SuratTugasForm = ({ isEmbedded = false, editData = null, onEditSuccess = null, onCancel = null }) => {
  const navigate = useNavigate();
  const { token, apiFetch, user } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resultData, setResultData] = useState(null);

  // Data States
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [ketuaTimId, setKetuaTimId] = useState(null);

  // External Employees
  const [selectedExternal, setSelectedExternal] = useState([]);
  const [isExtModalOpen, setIsExtModalOpen] = useState(false);
  const [extForm] = Form.useForm();

  // Sarana (SIAMPARAN & Manual)
  const [saranaList, setSaranaList] = useState([]);
  const [siamparanSuggestions, setSiamparanSuggestions] = useState([]);
  const [siamparanLoading, setSiamparanLoading] = useState(false);
  const siamparanDebounceRef = useRef(null);
  const [isSaranaModalOpen, setIsSaranaModalOpen] = useState(false);
  const [saranaForm] = Form.useForm();

  // MAK Suggestions
  const [makSuggestions, setMakSuggestions] = useState([]);
  const [makLoading, setMakLoading] = useState(false);
  const makDebounceRef = useRef(null);

  // Password & MFA for TTE
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");

  /* ── Fetch Employees & Default Data ── */
  useEffect(() => {
    (async () => {
      setEmployeesLoading(true);
      try {
        const endpoint = token ? "/public/bmn-employees" : "/public/bmn-employees";
        const res = await apiFetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          setEmployees(data || []);
        }
      } catch (e) {
        console.error("Failed to load employees", e);
      } finally {
        setEmployeesLoading(false);
      }
    })();
  }, [token, apiFetch]);

  /* ── Pre-fill when editData is provided ── */
  useEffect(() => {
    if (editData) {
      const isCustomLoc = editData.lokasi_tugas && !LOKASI_OPTIONS.includes(editData.lokasi_tugas);
      form.setFieldsValue({
        periode: [
          editData.tanggal_mulai ? dayjs(editData.tanggal_mulai) : null,
          editData.tanggal_selesai ? dayjs(editData.tanggal_selesai) : null,
        ],
        lokasi: isCustomLoc ? "lainnya" : editData.lokasi_tugas,
        lokasiLainnya: isCustomLoc ? editData.lokasi_tugas : "",
        maksud_tugas: editData.deskripsi_tugas || editData.maksud_tugas || "",
        mak: editData.mak || "",
      });

      if (Array.isArray(editData.employees)) {
        setSelectedEmployees(editData.employees);
      }
      if (editData.ketua_tim_id) {
        setKetuaTimId(editData.ketua_tim_id);
      }
      if (Array.isArray(editData.external_participants)) {
        setSelectedExternal(editData.external_participants);
      }

      // Pre-fill Sarana data
      if (Array.isArray(editData.sarana) && editData.sarana.length > 0) {
        setSaranaList(
          editData.sarana.map((s) => ({
            id: s.id || null,
            nama: s.nama || s.nama_sarana || "",
            lokasi: s.lokasi || s.alamat || "",
            source: s.id ? "siamparan" : "manual",
          }))
        );
      } else if (editData.sarana_nama) {
        const namas = String(editData.sarana_nama).split(";");
        const lokasis = String(editData.sarana_lokasi || "").split(";");
        const parsed = namas
          .map((n, i) => ({
            id: editData.sarana_id && i === 0 ? editData.sarana_id : null,
            nama: n.trim(),
            lokasi: lokasis[i] ? lokasis[i].trim() : "",
            source: editData.sarana_id && i === 0 ? "siamparan" : "manual",
          }))
          .filter((s) => s.nama);
        setSaranaList(parsed);
      }
    }
  }, [editData, form]);

  /* ── SIAMPARAN Sarana Suggestions Fetcher ── */
  const fetchSiamparanSarana = useCallback(
    async (search = "") => {
      setSiamparanLoading(true);
      try {
        const res = await apiFetch(`/public/siamparan/sarana?q=${encodeURIComponent(search)}&per_page=30`);
        if (!res.ok) return;
        const data = await res.json();
        const items = Array.isArray(data) ? data : data?.data || data?.sarana || [];

        setSiamparanSuggestions(
          items.map((item) => {
            const nama = item.nama_sarana || item.nama || item.nama_perusahaan || item.nama_toko || item.nama_fasilitas || "";
            
            // Extract detailed location components from SIAMPARAN
            const alamat = item.alamat || item.alamat_sarana || item.jalan || "";
            const kel = item.kelurahan || item.desa || item.nama_kelurahan || item.nama_desa || "";
            const kec = item.kecamatan || item.nama_kecamatan || "";
            const kab = item.kabupaten || item.kota || item.kabupaten_kota || item.nama_kabupaten || item.nama_kota || "";

            const locParts = [];
            if (alamat) locParts.push(alamat);
            if (kel) locParts.push(kel.toLowerCase().startsWith("kel") || kel.toLowerCase().startsWith("desa") ? kel : `Kel. ${kel}`);
            if (kec) locParts.push(kec.toLowerCase().startsWith("kec") ? kec : `Kec. ${kec}`);
            if (kab) locParts.push(kab);

            const lokasiFormatted = locParts.length > 0 ? locParts.join(", ") : (item.lokasi || "");
            const id = item.id || item.sarana_id || null;

            const subtext = [
              kel ? (kel.toLowerCase().startsWith("kel") || kel.toLowerCase().startsWith("desa") ? kel : `Kel. ${kel}`) : "",
              kec ? (kec.toLowerCase().startsWith("kec") ? kec : `Kec. ${kec}`) : "",
              kab,
            ]
              .filter(Boolean)
              .join(" • ");

            return {
              key: id ? `siamparan-${id}` : `siamparan-${nama}-${lokasiFormatted}`,
              value: nama,
              label: (
                <div style={{ padding: "2px 0" }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#1a1f2e" }}>{nama}</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>
                    {subtext || lokasiFormatted || "Lokasi tidak terdaftar"}
                  </div>
                </div>
              ),
              raw: { id, nama, lokasi: lokasiFormatted, source: "siamparan" },
            };
          })
        );
      } catch (e) {
        console.error("Failed to fetch SIAMPARAN sarana", e);
      } finally {
        setSiamparanLoading(false);
      }
    },
    [apiFetch]
  );

  useEffect(() => {
    fetchSiamparanSarana();
  }, [fetchSiamparanSarana]);

  const handleSiamparanSearch = (val) => {
    if (siamparanDebounceRef.current) clearTimeout(siamparanDebounceRef.current);
    siamparanDebounceRef.current = setTimeout(() => {
      fetchSiamparanSarana(val);
    }, 350);
  };

  const handleSelectSiamparanSarana = (value, option) => {
    if (!option || !option.raw) return;
    const newSarana = option.raw;
    if (saranaList.some((s) => s.nama.toLowerCase() === newSarana.nama.toLowerCase())) {
      message.info("Sarana ini sudah ada dalam daftar.");
      return;
    }
    setSaranaList((prev) => [...prev, newSarana]);
  };

  const handleAddManualSarana = async () => {
    try {
      const vals = await saranaForm.validateFields();
      const locParts = [];
      if (vals.alamat) locParts.push(vals.alamat.trim());
      if (vals.kelurahan) {
        const kel = vals.kelurahan.trim();
        locParts.push(kel.toLowerCase().startsWith("kel") || kel.toLowerCase().startsWith("desa") ? kel : `Kel. ${kel}`);
      }
      if (vals.kecamatan) {
        const kec = vals.kecamatan.trim();
        locParts.push(kec.toLowerCase().startsWith("kec") ? kec : `Kec. ${kec}`);
      }
      if (vals.kabupaten) locParts.push(vals.kabupaten.trim());

      const fullLocation = locParts.length > 0 ? locParts.join(", ") : "";

      const newSarana = {
        id: null,
        nama: vals.nama.trim(),
        lokasi: fullLocation,
        source: "manual",
      };

      if (saranaList.some((s) => s.nama.toLowerCase() === newSarana.nama.toLowerCase())) {
        message.info("Sarana dengan nama ini sudah dimasukkan.");
        return;
      }
      setSaranaList((prev) => [...prev, newSarana]);
      saranaForm.resetFields();
      setIsSaranaModalOpen(false);
    } catch (e) {
      // Validation error
    }
  };

  const handleRemoveSarana = (idx) => {
    setSaranaList((prev) => prev.filter((_, i) => i !== idx));
  };

  /* ── MAK Suggestions Fetcher ── */
  const fetchMakSuggestions = useCallback(
    async (search = "") => {
      setMakLoading(true);
      try {
        const endpoint = token
          ? "/surat-tugas/mak-suggestions"
          : "/public/surat-tugas/mak-suggestions";
        const res = await apiFetch(`${endpoint}?q=${encodeURIComponent(search)}`);
        if (!res.ok) return;
        const data = await res.json();
        setMakSuggestions(
          (data || []).map((item) => ({ value: item.mak, label: item.mak })),
        );
      } catch (e) {
        console.error("Failed to fetch MAK suggestions", e);
      } finally {
        setMakLoading(false);
      }
    },
    [token, apiFetch],
  );

  useEffect(() => {
    fetchMakSuggestions();
  }, [fetchMakSuggestions]);

  const handleMakSearch = (val) => {
    if (makDebounceRef.current) clearTimeout(makDebounceRef.current);
    makDebounceRef.current = setTimeout(() => {
      fetchMakSuggestions(val);
    }, 300);
  };

  /* ── Employee Handlers ── */
  const handleSelectEmployee = (empId) => {
    const emp = employees.find((e) => e.id === empId);
    if (!emp) return;
    if (selectedEmployees.some((e) => e.id === emp.id)) return;
    const updated = [...selectedEmployees, emp];
    setSelectedEmployees(updated);
    form.setFieldsValue({ employee_ids: updated.map((e) => e.id) });
  };

  const handleRemoveEmployee = (empId) => {
    const updated = selectedEmployees.filter((e) => e.id !== empId);
    setSelectedEmployees(updated);
    form.setFieldsValue({ employee_ids: updated.map((e) => e.id) });
  };

  /* ── External Employee Handlers ── */
  const handleAddExternal = async () => {
    try {
      const vals = await extForm.validateFields();
      setSelectedExternal((prev) => [...prev, vals]);
      extForm.resetFields();
      setIsExtModalOpen(false);
    } catch (e) {
      // Form error
    }
  };

  const handleRemoveExternal = (idx) => {
    setSelectedExternal((prev) => prev.filter((_, i) => i !== idx));
  };

  /* ── Form Submission ── */
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (selectedEmployees.length === 0 && selectedExternal.length === 0) {
        message.warning("Pilih minimal 1 pegawai yang ditugaskan.");
        return;
      }

      if (!password && !editData) {
        message.warning("Password SIPTU wajib diisi untuk verifikasi TTE.");
        return;
      }

      setLoading(true);

      const dates = values.periode;
      const startDate = dates ? dates[0].format("YYYY-MM-DD") : null;
      const endDate = dates ? dates[1].format("YYYY-MM-DD") : null;

      const chosenLocation =
        values.lokasi === "lainnya" ? values.lokasiLainnya : values.lokasi;

      const payload = {
        employee_ids: selectedEmployees.map((e) => e.id),
        ketua_tim_id: ketuaTimId,
        external_participants: selectedExternal.map((ext) => ({
          name: ext.nama || ext.name || "Petugas Eksternal",
          nip: ext.nip || "",
          jabatan: ext.instansi || ext.jabatan || "",
        })),
        sarana: saranaList.map((s) => ({
          id: s.id || null,
          nama: s.nama,
          lokasi: s.lokasi || "",
        })),
        tanggal_mulai: startDate,
        tanggal_st: startDate,
        tanggal_selesai: endDate,
        lokasi_tugas: chosenLocation,
        deskripsi_tugas: values.maksud_tugas,
        mak: values.mak,
        penandatangan_id: values.penandatangan_id || null,
        password: password,
        totp_code: totpCode,
      };

      const isEditMode = !!editData;
      const endpoint = isEditMode
        ? `/surat-tugas/${editData.id}/user-update`
        : token ? "/surat-tugas" : "/public/surat-tugas";
      const method = isEditMode ? "PUT" : "POST";

      const res = await apiFetch(endpoint, {
        method,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.errors) {
          const firstErr = Object.values(data.errors).flat()[0];
          throw new Error(firstErr || data.message || "Gagal menyimpan surat tugas.");
        }
        throw new Error(data.message || "Gagal menyimpan surat tugas.");
      }

      const updatedST = data.data || data;
      message.success(isEditMode ? "Data Surat Tugas berhasil diperbarui!" : "Pengajuan Surat Tugas berhasil dikirim!");

      if (isEditMode) {
        onEditSuccess?.(updatedST);
      } else {
        setResultData(updatedST);
        setSubmitted(true);
      }
    } catch (err) {
      message.error(err.message || "Pastikan seluruh data wajib telah diisi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px 24px 60px", maxWidth: 1150, width: "100%", margin: "0 auto" }}>
      <Form form={form} layout="vertical">
        {/* ════════════ SEKSI 1: Detail Penugasan & Tim Pegawai ════════════ */}
        <Card
          size="small"
          title={
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0F5B99", display: "flex", alignItems: "center", gap: 6 }}>
              <CalendarOutlined /> 1. Detail Agenda & Lokasi Penugasan
            </div>
          }
          style={{ borderRadius: 10, border: "1px solid #e2e8f0", marginBottom: 16 }}
        >
          <Form.Item
            name="maksud_tugas"
            label="Maksud / Agenda Penugasan"
            rules={[{ required: true, message: "Maksud penugasan wajib diisi." }]}
            style={{ marginBottom: 12 }}
          >
            <TextArea
              rows={3}
              placeholder="Contoh: Operasional Pengawasan Obat dan Makanan di Wilayah Kab. Luwu..."
              style={{ borderRadius: 6, fontSize: 13 }}
            />
          </Form.Item>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Form.Item
              name="periode"
              label="Periode Penugasan (Tanggal)"
              rules={[{ required: true, message: "Periode penugasan wajib dipilih." }]}
              style={{ marginBottom: 12 }}
            >
              <RangePicker
                format="DD MMM YYYY"
                placeholder={["Tanggal Berangkat", "Tanggal Kembali"]}
                style={{ width: "100%", borderRadius: 6 }}
              />
            </Form.Item>

            <Form.Item
              name="lokasi"
              label="Lokasi Penempatan / Tujuan"
              rules={[{ required: true, message: "Lokasi wajib dipilih." }]}
              style={{ marginBottom: 12 }}
            >
              <Select
                placeholder="Pilih Lokasi Tujuan"
                options={LOKASI_OPTIONS.map((loc) => ({ label: loc, value: loc })).concat([
                  { label: "Lainnya (Tulis Manual)", value: "lainnya" },
                ])}
                style={{ borderRadius: 6 }}
              />
            </Form.Item>
          </div>

          {Form.useWatch("lokasi", form) === "lainnya" && (
            <Form.Item
              name="lokasiLainnya"
              label="Nama Lokasi Tujuan Lainnya"
              rules={[{ required: true, message: "Tuliskan lokasi tujuan." }]}
              style={{ marginBottom: 12 }}
            >
              <Input placeholder="Contoh: Makassar / Jakarta" style={{ borderRadius: 6, fontSize: 13 }} />
            </Form.Item>
          )}
        </Card>

        {/* ════════════ SEKSI 2: Sasaran & Pemilihan Sarana ════════════ */}
        <Card
          size="small"
          title={
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0F5B99", display: "flex", alignItems: "center", gap: 6 }}>
              <BankOutlined /> 2. Sasaran & Pemilihan Sarana Pengawasan
            </div>
          }
          style={{ borderRadius: 10, border: "1px solid #e2e8f0", marginBottom: 16 }}
        >
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
            Cari sarana pengawasan atau tambahkan sarana manual. Data sarana ini akan otomatis tercetak di lembar <strong>Protokol Kerja</strong>.
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <AutoComplete
              options={siamparanSuggestions}
              onSearch={handleSiamparanSearch}
              onSelect={handleSelectSiamparanSarana}
              placeholder="Cari sarana / toko / apotek / sarana pengawasan..."
              style={{ flex: 1, borderRadius: 6 }}
              notFoundContent={siamparanLoading ? <Spin size="small" /> : "Sarana tidak ditemukan"}
            />
            <Button
              icon={<PlusOutlined />}
              onClick={() => setIsSaranaModalOpen(true)}
              style={{ borderRadius: 6, fontSize: 12 }}
            >
              + Sarana Manual
            </Button>
          </div>

          {saranaList.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {saranaList.map((sar, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: 6,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        background: "#e0f2fe",
                        color: "#0284c7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        flexShrink: 0,
                      }}
                    >
                      <BankOutlined />
                    </div>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: "#1a1f2e" }}>
                        {index + 1}. {sar.nama}
                      </div>
                      {sar.lokasi && (
                        <div style={{ fontSize: 11, color: "#64748b" }}>
                          <EnvironmentOutlined style={{ marginRight: 4 }} />
                          {sar.lokasi}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    size="small"
                    type="text"
                    danger
                    icon={<CloseOutlined />}
                    onClick={() => handleRemoveSarana(index)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, fontStyle: "italic", color: "#94a3b8", padding: "4px 0" }}>
              Belum ada sarana terpilih (opsional).
            </div>
          )}
        </Card>

        {/* ════════════ SEKSI 3: Tim Pegawai Ditugaskan & Ketua Tim ════════════ */}
        <Card
          size="small"
          title={
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0F5B99", display: "flex", alignItems: "center", gap: 6 }}>
              <TeamOutlined /> 3. Tim Pegawai Ditugaskan & Ketua Tim
            </div>
          }
          style={{ borderRadius: 10, border: "1px solid #e2e8f0", marginBottom: 16 }}
        >
          {/* Field 1: Ketua Tim / Penanggung Jawab */}
          <Form.Item
            label="Ketua Tim / Penanggung Jawab Kegiatan (Opsional)"
            style={{ marginBottom: 16 }}
          >
            <Select
              showSearch
              placeholder="Pilih Ketua Tim / Penanggung Jawab (bisa tidak ikut bertugas di lapangan)..."
              optionFilterProp="children"
              value={ketuaTimId}
              onChange={(val) => setKetuaTimId(val)}
              allowClear
              loading={employeesLoading}
              filterOption={(input, option) =>
                (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
              options={employees.map((emp) => ({
                value: emp.id,
                label: `${emp.name || emp.nama} — NIP. ${emp.nip || "-"}`,
              }))}
              style={{ borderRadius: 6 }}
            />
          </Form.Item>

          <Divider style={{ margin: "12px 0 16px 0" }} />

          {/* Field 2: Pegawai Bertugas (Database) */}
          <Form.Item
            label="Pilih Pegawai Bertugas (Internal Database)"
            style={{ marginBottom: 12 }}
          >
            <Select
              showSearch
              placeholder="Cari & tambah pegawai yang bertugas di lapangan..."
              optionFilterProp="children"
              onSelect={handleSelectEmployee}
              value={null}
              loading={employeesLoading}
              filterOption={(input, option) =>
                (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
              options={employees.map((emp) => ({
                value: emp.id,
                label: `${emp.name || emp.nama} — NIP. ${emp.nip || "-"}`,
              }))}
              style={{ borderRadius: 6 }}
            />
          </Form.Item>

          {/* Selected Employees Chips / Cards List */}
          {selectedEmployees.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "#64748b", marginBottom: 8 }}>
                Daftar Pegawai Bertugas ({selectedEmployees.length}):
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {selectedEmployees.map((emp) => {
                  const isKatim = ketuaTimId === emp.id;
                  return (
                    <div
                      key={emp.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        borderRadius: 6,
                        background: isKatim ? "#eef2ff" : "#f8fafc",
                        border: "1px solid",
                        borderColor: isKatim ? "#c7d2fe" : "#e2e8f0",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            background: isKatim ? "#4f46e5" : "#0F5B99",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                          }}
                        >
                          <UserOutlined />
                        </div>
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: "#1a1f2e" }}>
                            {emp.name || emp.nama}
                            {isKatim && (
                              <Tag color="indigo" style={{ marginLeft: 8, borderRadius: 4, fontWeight: 600, fontSize: 10 }}>
                                <CrownOutlined /> Ketua Tim
                              </Tag>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>
                            NIP. {emp.nip || "-"}
                          </div>
                        </div>
                      </div>

                      <Button
                        size="small"
                        type="text"
                        danger
                        icon={<CloseOutlined />}
                        onClick={() => handleRemoveEmployee(emp.id)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* External Officers Section */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>
                Petugas Luar Database (Opsional)
              </span>
              <Button
                size="small"
                icon={<UserAddOutlined />}
                onClick={() => setIsExtModalOpen(true)}
                style={{ borderRadius: 6, fontSize: 11.5 }}
              >
                + Tambah Petugas Luar
              </Button>
            </div>

            {selectedExternal.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {selectedExternal.map((ext, idx) => (
                  <Tag
                    key={idx}
                    color="default"
                    closable
                    onClose={() => handleRemoveExternal(idx)}
                    style={{ borderRadius: 4, padding: "3px 8px", fontSize: 11.5 }}
                  >
                    👤 {ext.nama} ({ext.instansi || "Eksternal"})
                  </Tag>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* ════════════ SEKSI 4: Anggaran & Verifikasi TTE ════════════ */}
        <Card
          size="small"
          title={
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0F5B99", display: "flex", alignItems: "center", gap: 6 }}>
              <DollarOutlined /> 4. Sumber Anggaran & Verifikasi TTE
            </div>
          }
          style={{ borderRadius: 10, border: "1px solid #e2e8f0", marginBottom: 20 }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Form.Item
              name="mak"
              label="Kode DIPA / MAK Anggaran"
              rules={[{ required: true, message: "Kode MAK wajib diisi." }]}
              style={{ marginBottom: 12 }}
            >
              <AutoComplete
                options={makSuggestions}
                onSearch={handleMakSearch}
                placeholder="Cari atau ketik kode MAK..."
                style={{ borderRadius: 6 }}
              />
            </Form.Item>

            <Form.Item
              name="penandatangan_id"
              label="Penandatangan Surat Tugas"
              style={{ marginBottom: 12 }}
            >
              <Select
                placeholder="Pilih Pejabat Penandatangan (Opsional)"
                options={employees.map((e) => ({
                  value: e.id,
                  label: `${e.name || e.nama} — ${e.position || "Pejabat"}`,
                }))}
                style={{ borderRadius: 6 }}
                allowClear
              />
            </Form.Item>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Form.Item
              label="Password SIPTU (Verifikasi TTE)"
              required
              style={{ marginBottom: 0 }}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: "#94a3b8" }} />}
                placeholder="Masukkan password akun SIPTU Anda..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ borderRadius: 6, fontSize: 13 }}
              />
            </Form.Item>

            <Form.Item
              label="Kode Autentikasi MFA (6 Digit / Recovery Code)"
              required
              style={{ marginBottom: 0 }}
            >
              <Input
                prefix={<LockOutlined style={{ color: "#0b56a4" }} />}
                placeholder="Contoh: 123456 atau XXXX-XXXX"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                style={{ borderRadius: 6, fontSize: 13, fontWeight: 700, letterSpacing: "1px" }}
              />
            </Form.Item>
          </div>
        </Card>

        {/* ── Submit Action Button ── */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            type="primary"
            size="large"
            icon={<SendOutlined />}
            loading={loading}
            onClick={handleSubmit}
            style={{
              borderRadius: 6,
              fontWeight: 600,
              backgroundColor: "#0F5B99",
              padding: "0 28px",
            }}
          >
            Kirim Pengajuan Surat Tugas
          </Button>
        </div>
      </Form>

      {/* ── Modal Tambah Sarana Manual ── */}
      <Modal
        title="Tambah Sarana Pengawasan (Manual)"
        open={isSaranaModalOpen}
        onCancel={() => setIsSaranaModalOpen(false)}
        onOk={handleAddManualSarana}
        okText="Tambah Sarana"
        cancelText="Batal"
        width={480}
        centered
      >
        <Form form={saranaForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item
            name="nama"
            label="Nama Sarana / Perusahaan / Fasilitas"
            rules={[{ required: true, message: "Nama sarana wajib diisi." }]}
            style={{ marginBottom: 12 }}
          >
            <Input placeholder="Contoh: Apotek K-24 Palopo" style={{ borderRadius: 6 }} />
          </Form.Item>

          <Form.Item name="alamat" label="Alamat Jalan / No (Opsional)" style={{ marginBottom: 12 }}>
            <Input placeholder="Contoh: Jl. Merdeka No. 12" style={{ borderRadius: 6 }} />
          </Form.Item>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Form.Item name="kelurahan" label="Kelurahan / Desa (Opsional)" style={{ marginBottom: 12 }}>
              <Input placeholder="Contoh: Dangerakko" style={{ borderRadius: 6 }} />
            </Form.Item>

            <Form.Item name="kecamatan" label="Kecamatan (Opsional)" style={{ marginBottom: 12 }}>
              <Input placeholder="Contoh: Wara" style={{ borderRadius: 6 }} />
            </Form.Item>
          </div>

          <Form.Item name="kabupaten" label="Kabupaten / Kota (Opsional)" style={{ marginBottom: 0 }}>
            <AutoComplete
              options={LOKASI_OPTIONS.map((loc) => ({ label: loc, value: loc }))}
              placeholder="Pilih atau ketik Kabupaten / Kota..."
              style={{ borderRadius: 6, width: "100%" }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal Tambah Petugas Luar ── */}
      <Modal
        title="Tambah Petugas Luar Database"
        open={isExtModalOpen}
        onCancel={() => setIsExtModalOpen(false)}
        onOk={handleAddExternal}
        okText="Tambah"
        cancelText="Batal"
        width={440}
        centered
      >
        <Form form={extForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item
            name="nama"
            label="Nama Lengkap"
            rules={[{ required: true, message: "Nama wajib diisi." }]}
            style={{ marginBottom: 12 }}
          >
            <Input placeholder="Contoh: Dr. Ahmad Dahlan" style={{ borderRadius: 6 }} />
          </Form.Item>
          <Form.Item name="nip" label="NIP / Identitas (Opsional)" style={{ marginBottom: 12 }}>
            <Input placeholder="Contoh: 19850101..." style={{ borderRadius: 6 }} />
          </Form.Item>
          <Form.Item name="instansi" label="Instansi / Jabatan (Opsional)" style={{ marginBottom: 0 }}>
            <Input placeholder="Contoh: Dinas Kesehatan Kab. Luwu" style={{ borderRadius: 6 }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal Popup Success Pengajuan ── */}
      <Modal
        title={null}
        open={submitted && !!resultData}
        onCancel={() => setSubmitted(false)}
        footer={null}
        width={480}
        centered
        className="simba-detail-modal"
      >
        {resultData && (
          <div style={{ textAlign: "center", padding: "12px 0 6px 0" }}>
            <CheckCircleFilled style={{ fontSize: 52, color: "#10b981", marginBottom: 14 }} />
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px 0", color: "#1a1f2e" }}>
              Pengajuan Surat Tugas Berhasil!
            </h3>
            <p style={{ fontSize: 12.5, color: "#64748b", margin: "0 0 20px 0" }}>
              Surat Tugas Anda telah tersimpan. Silakan cetak Surat Tugas atau Protokol Kerja di bawah ini.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Button
                type="primary"
                icon={<FileProtectOutlined style={{ color: "#ffffff" }} />}
                onClick={() => {
                  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
                  const tokenStr = resultData.signature_token || resultData.token || "";
                  const protokolUrl = `${baseUrl.replace(/\/+$/, "")}/public/surat-tugas/${resultData.id}/protokol-kerja?with_qr=1&token=${tokenStr}`;
                  window.open(protokolUrl, "_blank");
                }}
                style={{ borderRadius: 6, height: 40, fontWeight: 600, backgroundColor: "#0F5B99", borderColor: "#0F5B99" }}
              >
                Cetak / Lihat Protokol Kerja
              </Button>

              <Button
                onClick={() => {
                  setSubmitted(false);
                  setResultData(null);
                  setSelectedEmployees([]);
                  setSelectedExternal([]);
                  setSaranaList([]);
                  form.resetFields();
                }}
                style={{ borderRadius: 6, height: 38, marginTop: 4 }}
              >
                Buat Pengajuan Baru
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SuratTugasForm;
