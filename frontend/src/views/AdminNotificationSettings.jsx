import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

import {
  App as AntdApp,
  Button,
  Card,
  Checkbox,
  Collapse,
  Divider,
  Input,
  InputNumber,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  TimePicker,
  Typography,
  Switch,
  Upload,
} from 'antd';
import { buildMessageAdapter } from '../utils/notify.js';
import {
  SaveOutlined,
  SendOutlined,
  PictureOutlined,
  UploadOutlined,
  PlusOutlined,
  DeleteOutlined,
  VerticalAlignTopOutlined,
  VerticalAlignBottomOutlined,
} from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth.js';
import './AdminNotificationSettings.css';

const DEFAULT_FONNTE_ENDPOINT = 'https://api.fonnte.com/send';
const MODULE_FALLBACK = [
  { key: 'kepegawaian', label: 'Modul Kepegawaian' },
  { key: 'kepegawaian-surat-tugas', label: 'Surat Tugas (Draft Baru)' },
  { key: 'kepegawaian-surat-tugas-lengkap', label: 'Surat Tugas (Status Lengkap)' },
  { key: 'kgb', label: 'KGB' },
  { key: 'rispeg-izin-keluar', label: 'Rangkuman Izin Keluar Harian' },
  { key: 'bmn-peminjaman-aset', label: 'Peminjaman Aset' },
  { key: 'bmn-permintaan-persediaan', label: 'Permintaan Persediaan' },
  { key: 'bmn-pemeliharaan-keluhan', label: 'Pemeliharaan & Keluhan BMN' },
  { key: 'it-helpdesk', label: 'IT Helpdesk' },
  { key: 'kearsipan-peminjaman', label: 'Peminjaman Arsip' },
];

const DEFAULT_HERO_SLIDES = [
  {
    title: 'Pelayanan Lebih Cepat',
    description: 'Pantau status layanan dan akses dokumen kapan saja.',
    image: '/hero/slide-1.svg',
    tone: 'blue',
    active: true,
  },
  {
    title: 'Kolaborasi Lebih Rapi',
    description: 'Data pegawai dan tugas tersusun jelas dalam satu layar.',
    image: '/hero/slide-2.svg',
    tone: 'teal',
    active: true,
  },
  {
    title: 'Dokumen Selalu Terbaru',
    description: 'Unduh ulang protokol kerja dengan data yang sudah diperbarui.',
    image: '/hero/slide-3.svg',
    tone: 'orange',
    active: true,
  },
];

const normalizePhone = (number) => {
  if (!number) return '';
  let clean = number.replace(/[^0-9+]/g, '');
  if (clean.startsWith('0')) {
    clean = '+62' + clean.substring(1);
  } else if (clean.startsWith('62')) {
    clean = '+' + clean;
  } else if (!clean.startsWith('+')) {
    clean = '+' + clean;
  }
  return clean;
};

const normalizeImage = (value) => {
  if (!value) return value;
  let v = String(value).trim();
  if (v.startsWith('http://') || v.startsWith('https://')) return v;
  v = v.replace(/\/api\/hero-slider\//i, '/storage/hero-slider/');
  v = v.replace(/^api\/hero-slider\//i, '/storage/hero-slider/');
  v = v.replace(/^\/?hero-slider\//i, '/storage/hero-slider/');
  if (!v.startsWith('/')) v = '/' + v;
  if (v === '/storage/hero-slider' || v === '/storage/hero-slider/') return '';
  return v;
};

const AdminNotificationSettings = () => {
  const { apiFetch, token } = useAuth();
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);

  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState([]);
  const [recipients, setRecipients] = useState({});
  const [saving, setSaving] = useState(false);
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [phoneDrafts, setPhoneDrafts] = useState({});
  const [savingPhoneId, setSavingPhoneId] = useState(null);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [fonnteConfig, setFonnteConfig] = useState({
    token: '',
    has_token: false,
    endpoint: DEFAULT_FONNTE_ENDPOINT,
    default_admin_numbers: [],
  });
  const [fonnteTokenTouched, setFonnteTokenTouched] = useState(false);
  const [availableSuratTugasTemplates, setAvailableSuratTugasTemplates] = useState([]);
  const [selectedSuratTugasTemplates, setSelectedSuratTugasTemplates] = useState([]);
  const [heroSlides, setHeroSlides] = useState([]);
  const [popup, setPopup] = useState({
    title: '',
    content: '',
    image: '',
    link: '',
    active: false,
    show_once: true,
    use_duration: false,
    duration: 5,
  });

  const [kgbWindow, setKgbWindow] = useState({
    start: '',
    end: '',
  });

  const [kepalaBalai, setKepalaBalai] = useState({
    id: null,
    status: 'tetap', // tetap or plh
  });

  const timeFormat = 'HH:mm';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/admin/notification-settings');
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message ?? 'Tidak dapat memuat pengaturan notifikasi.');
      }
      const stored = await response.json();
      setModules(MODULE_FALLBACK);
      setFonnteConfig({
        token: '',
        has_token: Boolean(stored?.fonnte?.has_token),
        endpoint: stored?.fonnte?.endpoint ?? DEFAULT_FONNTE_ENDPOINT,
        default_admin_numbers: stored?.fonnte?.default_admin_numbers ?? [],
      });
      setFonnteTokenTouched(false);
      setRecipients(stored?.recipients ?? {});
      setKgbWindow({
        start: stored?.kgb_window?.start ?? '',
        end: stored?.kgb_window?.end ?? '',
      });
      setKepalaBalai({
        id: stored?.kepala_balai_settings?.id ? Number(stored.kepala_balai_settings.id) : null,
        status: stored?.kepala_balai_settings?.status ?? 'tetap',
      });
      setSelectedSuratTugasTemplates(stored?.surat_tugas_templates ?? []);
      const storedSlides = Array.isArray(stored?.hero_slider) ? stored.hero_slider : [];
      const useDefaults = stored?.hero_slider_initialized === false;
      setHeroSlides(useDefaults ? DEFAULT_HERO_SLIDES : storedSlides);

      if (stored?.popup && typeof stored.popup === 'object') {
        setPopup({
          title: stored.popup.title ?? '',
          content: stored.popup.content ?? '',
          image: stored.popup.image ?? '',
          link: stored.popup.link ?? '',
          active: Boolean(stored.popup.active),
          show_once: Boolean(stored.popup.show_once ?? true),
          use_duration: Boolean(stored.popup.use_duration ?? false),
          duration: Number(stored.popup.duration) || 5,
        });
      }

      const employeeResponse = await apiFetch('/employees?pageSize=1000');
      if (employeeResponse.ok) {
        const employeePayload = await employeeResponse.json();
        const list = employeePayload.data ?? [];
        setEmployees(list);
        const draftMap = {};
        list.forEach((employee) => {
          draftMap[employee.id] = employee.phone_number ?? '';
        });
        setPhoneDrafts(draftMap);
      }

      const templateResponse = await apiFetch('/surat-tugas/templates?all=1');
      if (templateResponse.ok) {
        const templatePayload = await templateResponse.json();
        setAvailableSuratTugasTemplates(Array.isArray(templatePayload) ? templatePayload : []);
      }
    } catch (error) {
      console.error(error);
      notification.error({
        message: 'Gagal memuat data',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [apiFetch, notification]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRecipientChange = (moduleKey, userIds) => {
    setRecipients((prev) => ({
      ...prev,
      [moduleKey]: userIds,
    }));
  };

  const handlePhoneDraftChange = (employeeId, value) => {
    setPhoneDrafts((prev) => ({
      ...prev,
      [employeeId]: value,
    }));
  };

  const handleSavePhone = async (employeeId) => {
    setSavingPhoneId(employeeId);
    try {
      const response = await apiFetch(`/employees/${employeeId}/phone`, {
        method: 'PUT',
        body: JSON.stringify({ phone_number: phoneDrafts[employeeId] ?? null }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message ?? 'Gagal memperbarui nomor WhatsApp.');
      }
      notification.success({
        message: 'Nomor disimpan',
        description: 'Nomor WhatsApp pegawai berhasil diperbarui.',
      });
      await fetchData();
    } catch (error) {
      console.error(error);
      notification.error({
        message: 'Gagal menyimpan nomor',
        description: error.message,
      });
    } finally {
      setSavingPhoneId(null);
    }
  };

  const handleFonnteChange = (field, value) => {
    if (field === 'token') {
      setFonnteTokenTouched(true);
    }
    setFonnteConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleKgbWindowChange = (field, value) => {
    setKgbWindow((prev) => ({
      ...prev,
      [field]: value ? value.format(timeFormat) : '',
    }));
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const payload = {
        recipients,
        fonnte: {
          endpoint: fonnteConfig.endpoint ?? '',
          default_admin_numbers: fonnteConfig.default_admin_numbers ?? [],
        },
        kgb_window: {
          start: kgbWindow.start || null,
          end: kgbWindow.end || null,
        },
        kepala_balai_settings: kepalaBalai,
        surat_tugas_templates: selectedSuratTugasTemplates ?? [],
        hero_slider: (heroSlides ?? []).map((s) => ({ ...s, image: normalizeImage(s?.image) })),
        popup: {
          ...popup,
          image: normalizeImage(popup.image),
          link: (popup.link || '').trim(),
        },
      };
      if (fonnteTokenTouched) {
        payload.fonnte.token = fonnteConfig.token ?? '';
      }
      const response = await apiFetch('/admin/notification-settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message ?? 'Gagal menyimpan pengaturan notifikasi.');
      }
      notification.success({
        message: 'Pengaturan disimpan',
        description: 'Konfigurasi notifikasi berhasil diperbarui.',
      });
      setFonnteTokenTouched(false);
    } catch (error) {
      console.error(error);
      notification.error({
        message: 'Gagal menyimpan',
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const updateHeroSlide = (index, fields) => {
    setHeroSlides((prev) => prev.map((s, i) => (i === index ? { ...s, ...fields } : s)));
  };

  const addHeroSlide = () => {
    setHeroSlides((prev) => [
      ...prev,
      {
        title: 'Judul Slide Baru',
        description: 'Deskripsi singkat mengenai layanan atau informasi ini.',
        image: '',
        tone: 'blue',
        active: true,
      },
    ]);
  };

  const removeHeroSlide = (index) => {
    setHeroSlides((prev) => prev.filter((_, i) => i !== index));
  };

  const moveHeroSlide = (index, direction) => {
    setHeroSlides((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleHeroUpload = async (file, index, onSuccess, onError) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const baseUrl = import.meta.env.VITE_API_URL || 'https://siptu.bpompalopo.com/core_api/api';
      const url = `${baseUrl.replace(/\/+$/, '')}/hero-slider/upload`;

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.message || 'Upload gagal');

      const imageUrl = normalizeImage(body?.url || '');
      if (index === 'popup') {
        setPopup((p) => ({ ...p, image: imageUrl }));
        notification.success({ message: 'Gambar popup berhasil diupload' });
      } else if (index === 'popup_sound') {
        setPopup((p) => ({ ...p, sound_url: imageUrl }));
        notification.success({ message: 'Audio berhasil diupload' });
      } else {
        updateHeroSlide(index, { image: imageUrl });
        notification.success({ message: 'Gambar slide berhasil diupload' });
      }
      onSuccess?.(body, file);
    } catch (err) {
      onError?.(err);
      notification.error({ message: err.message });
    }
  };

  const handleSendBmnReminders = async () => {
    setIsSendingReminders(true);
    try {
      const data = { message: 'Pengiriman manual belum dihubungkan ke backend.' };
      notification.success({
        message: 'Pengingat Terkirim',
        description: data.message || 'Perintah pengingat BMN berhasil dijalankan.',
      });
    } catch (error) {
      notification.error({
        message: 'Gagal Mengirim Pengingat',
        description: error.message,
      });
    } finally {
      setIsSendingReminders(false);
    }
  };

  const fonnteDefaults = fonnteConfig.default_admin_numbers ?? [];
  const selectedTemplateCount = selectedSuratTugasTemplates.length;
  const availableTones = [
    { label: 'Biru', value: 'blue' },
    { label: 'Toska', value: 'teal' },
    { label: 'Oranye', value: 'orange' },
    { label: 'Ungu', value: 'purple' },
    { label: 'Hijau', value: 'green' },
    { label: 'Slate', value: 'slate' },
  ];

  const employeeTableData = useMemo(() => {
    return employees.map((employee) => ({
      id: employee.id,
      name: employee.name ?? employee.nama ?? '',
      nip: employee.nip ?? '',
      function_area: employee.function_area ?? employee.fungsi_bidang ?? '',
      phone_number: phoneDrafts[employee.id] ?? '',
    }));
  }, [employees, phoneDrafts]);

  const recipientOptions = useMemo(() => {
    return employeeTableData
      .filter((employee) => employee.phone_number)
      .map((employee) => {
        const normPhone = normalizePhone(employee.phone_number);
        return {
          value: normPhone,
          label: `${employee.name} (${employee.nip || '-'}) - ${normPhone}`,
          displayLabel: employee.name,
        };
      });
  }, [employeeTableData]);

  const filteredEmployees = useMemo(() => {
    const term = employeeSearch.trim().toLowerCase();
    if (!term) return employeeTableData;
    return employeeTableData.filter((item) => {
      return (
        item.name.toLowerCase().includes(term)
        || item.nip.toLowerCase().includes(term)
        || item.function_area.toLowerCase().includes(term)
        || (item.phone_number ?? '').toLowerCase().includes(term)
      );
    });
  }, [employeeTableData, employeeSearch]);

  const employeeGroups = useMemo(() => {
    const map = new Map();
    filteredEmployees.forEach((item) => {
      const key = item.function_area || 'Tanpa Fungsi/Bidang';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return Array.from(map.entries()).map(([group, items]) => ({ group, items }));
  }, [filteredEmployees]);

  const columns = [
    { title: 'Nama', dataIndex: 'name', key: 'name' },
    { title: 'NIP', dataIndex: 'nip', key: 'nip' },
    { title: 'Fungsi/Bidang', dataIndex: 'function_area', key: 'function_area' },
    {
      title: 'Nomor WhatsApp',
      dataIndex: 'phone_number',
      key: 'phone_number',
      render: (_, record) => (
        <Space.Compact style={{ width: '100%' }}>
          <Input
            value={phoneDrafts[record.id] ?? ''}
            onChange={(event) => handlePhoneDraftChange(record.id, event.target.value)}
            placeholder="Contoh: 0812xxxx"
          />
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={savingPhoneId === record.id}
            onClick={() => handleSavePhone(record.id)}
          >
            Simpan
          </Button>
        </Space.Compact>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="module-section">
        <Spin />
      </div>
    );
  }

  return (
    <div className="module-section">
      <div className="notification-settings">
        <Card className="notification-settings__summary" variant="filled">
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Typography.Text strong>Nomor Default Admin</Typography.Text>
            {fonnteDefaults.length ? (
              <div className="notification-settings__chips">
                {fonnteDefaults.map((item) => (
                  <Tag key={item} color="blue">{item}</Tag>
                ))}
              </div>
            ) : (
              <Typography.Text type="secondary">Belum ada nomor default.</Typography.Text>
            )}
            <Typography.Text type="secondary">
              Template Surat Tugas aktif: {selectedTemplateCount}
            </Typography.Text>
          </Space>
        </Card>

        <Card className="notification-settings__panel" variant="filled">
          <Tabs
            defaultActiveKey="config"
            items={[
              {
                key: 'config',
                label: 'Fonnte (WhatsApp)',
                children: (
                  <div className="notification-settings__tab">
                    <div className="notification-settings__top-actions">
                      <Button
                        type="primary"
                        icon={<SendOutlined />}
                        loading={isSendingReminders}
                        onClick={handleSendBmnReminders}
                      >
                        Kirim Manual Pengingat BMN
                      </Button>
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={saving}
                        onClick={handleSaveSettings}
                      >
                        Simpan Pengaturan Fonnte
                      </Button>
                    </div>

                    <Divider />

                    <div className="notification-settings__grid">
                      <div>
                        <Typography.Text strong>Token API Fonnte</Typography.Text>
                        <Input.Password
                          placeholder={fonnteConfig.has_token ? 'Token tersimpan (isi jika ingin mengganti)' : 'Masukkan Token API Fonnte'}
                          value={fonnteConfig.token}
                          onChange={(event) => handleFonnteChange('token', event.target.value)}
                        />
                      </div>
                      <div>
                        <Typography.Text strong>Endpoint Fonnte</Typography.Text>
                        <Input
                          placeholder="https://api.fonnte.com/send"
                          value={fonnteConfig.endpoint}
                          onChange={(event) => handleFonnteChange('endpoint', event.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: 16 }}>
                      <Typography.Text strong>Nomor Default Admin (Satu nomor per baris atau pisahkan dengan koma)</Typography.Text>
                      <Input.TextArea
                        rows={3}
                        placeholder="Contoh: 08123456789, 08987654321"
                        value={(fonnteConfig.default_admin_numbers ?? []).join('\n')}
                        onChange={(event) => {
                          const raw = event.target.value;
                          const list = raw.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
                          handleFonnteChange('default_admin_numbers', list);
                        }}
                      />
                    </div>
                  </div>
                ),
              },
              {
                key: 'kgb',
                label: 'Jadwal Otomatis KGB',
                children: (
                  <div className="notification-settings__tab">
                    <Card size="small" variant="outlined">
                      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <div>
                          <Typography.Text strong>Rentang Waktu Notifikasi KGB Harian</Typography.Text>
                          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                            Tentukan jam dimulainya dan berakhirnya rentang waktu sistem akan mengirimkan pesan WhatsApp otomatis secara bertahap kepada Admin/Pegawai terkait KGB.
                          </Typography.Paragraph>
                        </div>
                        <div>
                          <Space wrap>
                            <TimePicker
                              allowClear
                              format={timeFormat}
                              minuteStep={5}
                              value={kgbWindow.start ? dayjs(kgbWindow.start, timeFormat) : null}
                              onChange={(value) => handleKgbWindowChange('start', value)}
                              placeholder="Jam mulai"
                            />
                            <TimePicker
                              allowClear
                              format={timeFormat}
                              minuteStep={5}
                              value={kgbWindow.end ? dayjs(kgbWindow.end, timeFormat) : null}
                              onChange={(value) => handleKgbWindowChange('end', value)}
                              placeholder="Jam selesai"
                            />
                          </Space>
                        </div>
                        <Divider style={{ margin: '12px 0' }} />
                        <Button type="primary" onClick={handleSaveSettings} loading={saving}>
                          Simpan Pengaturan KGB
                        </Button>
                      </Space>
                    </Card>
                  </div>
                ),
              },
              {
                key: 'modules',
                label: 'Penerima Modul',
                children: (
                  <div className="notification-settings__tab">
                    <div className="notification-settings__module-grid">
                      {modules.map((module) => (
                        <Card key={module.key} size="small" variant="outlined">
                          <Space direction="vertical" style={{ width: '100%' }}>
                            <div>
                              <Typography.Text strong>{module.label}</Typography.Text>
                              <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
                                Tentukan nomor WhatsApp penerima notifikasi modul ini.
                              </Typography.Paragraph>
                            </div>
                            <Select
                              mode="multiple"
                              allowClear
                              placeholder="Pilih pegawai penerima"
                              style={{ width: '100%' }}
                              value={recipients[module.key] ?? []}
                              onChange={(values) => handleRecipientChange(module.key, values)}
                              options={recipientOptions}
                              optionFilterProp="label"
                              optionLabelProp="displayLabel"
                            />
                          </Space>
                        </Card>
                      ))}
                    </div>
                  </div>
                ),
              },
              {
                key: 'surat-tugas-template',
                label: 'Template Surat Tugas',
                children: (
                  <div className="notification-settings__tab">
                    <Card size="small" variant="outlined">
                      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <div className="notification-settings__toolbar">
                          <div>
                            <Typography.Text strong>Template yang Ditampilkan</Typography.Text>
                            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                              Centang template yang boleh muncul pada pilihan template di halaman Surat Tugas.
                            </Typography.Paragraph>
                          </div>
                          <Space wrap>
                            <Button
                              onClick={() => setSelectedSuratTugasTemplates(
                                availableSuratTugasTemplates.map((item) => item.value),
                              )}
                            >
                              Pilih Semua
                            </Button>
                            <Button onClick={() => setSelectedSuratTugasTemplates([])}>
                              Kosongkan
                            </Button>
                            <Button type="primary" onClick={handleSaveSettings} loading={saving}>
                              Simpan
                            </Button>
                          </Space>
                        </div>

                        {availableSuratTugasTemplates.length ? (
                          <Checkbox.Group
                            style={{ width: '100%' }}
                            value={selectedSuratTugasTemplates}
                            onChange={(values) => setSelectedSuratTugasTemplates(values)}
                          >
                            <div className="notification-settings__template-grid">
                              {availableSuratTugasTemplates.map((template) => (
                                <label
                                  key={template.value}
                                  className="notification-settings__template-item"
                                >
                                  <Checkbox value={template.value}>
                                    {template.label}
                                  </Checkbox>
                                </label>
                              ))}
                            </div>
                          </Checkbox.Group>
                        ) : (
                          <Typography.Text type="secondary">
                            Belum ada template di folder `backend/storage/app/templates`.
                          </Typography.Text>
                        )}
                      </Space>
                    </Card>
                  </div>
                ),
              },
              {
                key: 'kepegawaian',
                label: 'Kepegawaian',
                children: (
                  <div className="notification-settings__tab">
                    <Card size="small" variant="outlined">
                      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <div>
                          <Typography.Text strong>Pejabat Penandatangan Utama (Kepala Balai)</Typography.Text>
                          <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
                            Tentukan siapa yang akan menjadi penandatangan tingkat kedua (setelah Ketua Tim) pada Protokol Kerja.
                          </Typography.Paragraph>
                        </div>

                        <div className="notification-settings__grid">
                          <div>
                            <Typography.Text>Pilih Pegawai</Typography.Text>
                            <Select
                              showSearch
                              allowClear
                              placeholder="Cari nama pegawai"
                              style={{ width: '100%' }}
                              value={kepalaBalai.id}
                              onChange={(val) => setKepalaBalai(prev => ({ ...prev, id: val ? Number(val) : null }))}
                              options={employees.map(e => ({
                                value: e.id,
                                label: `${e.name} (${e.nip || '-'})`
                              }))}
                              optionFilterProp="label"
                            />
                          </div>
                          <div>
                            <Typography.Text>Status Jabatan</Typography.Text>
                            <Select
                              style={{ width: '100%' }}
                              value={kepalaBalai.status}
                              onChange={(val) => setKepalaBalai(prev => ({ ...prev, status: val }))}
                              options={[
                                { value: 'tetap', label: 'Kepala Balai (Tetap)' },
                                { value: 'plh', label: 'Plh. Kepala Balai' },
                              ]}
                            />
                          </div>
                        </div>

                        <Divider style={{ margin: '12px 0' }} />
                        <Button type="primary" onClick={handleSaveSettings} loading={saving}>
                          Simpan Pengaturan Kepegawaian
                        </Button>
                      </Space>
                    </Card>
                  </div>
                ),
              },
              {
                key: 'hero-slider',
                label: 'Slider & Popup Image',
                children: (
                  <div className="notification-settings__tab">
                    <Card
                      size="small"
                      variant="outlined"
                      style={{
                        marginBottom: 16,
                        borderColor: popup.active ? '#bbf7d0' : '#fecaca',
                        background: popup.active ? '#f0fdf4' : '#fff',
                      }}
                      title={
                        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                          <Typography.Text strong style={{ fontSize: 15, color: popup.active ? '#15803d' : '#991b1b' }}>
                            📢 Pengaturan Popup Image (SIPTU) - Status: {popup.active ? 'AKTIF' : 'NONAKTIF (DISABLED)'}
                          </Typography.Text>
                          <Switch
                            checked={popup.active}
                            onChange={(v) => setPopup((p) => ({ ...p, active: v }))}
                            checkedChildren="Aktif"
                            unCheckedChildren="Nonaktif"
                          />
                        </Space>
                      }
                    >
                      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                          Popup akan tampil secara dinamis menyesuaikan device (mobile/desktop) ketika pengguna baru pertama kali membuka aplikasi.
                        </Typography.Paragraph>

                        <div className="notification-settings__grid">
                          <div>
                            <Typography.Text strong>Judul Popup</Typography.Text>
                            <Input
                              placeholder="Contoh: Informasi Penting SIPTU"
                              value={popup.title}
                              onChange={(e) => setPopup((p) => ({ ...p, title: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Typography.Text strong>Link Gambar (Opsional)</Typography.Text>
                            <Input
                              placeholder="https://contoh.com/informasi"
                              value={popup.link}
                              onChange={(e) => setPopup((p) => ({ ...p, link: e.target.value }))}
                            />
                          </div>
                        </div>

                        <div>
                          <Typography.Text strong>Isi / Konten Popup</Typography.Text>
                          <Input.TextArea
                            rows={3}
                            placeholder="Deskripsi singkat informasi popup..."
                            value={popup.content}
                            onChange={(e) => setPopup((p) => ({ ...p, content: e.target.value }))}
                          />
                        </div>

                        <div>
                          <Typography.Text strong>Gambar Banner Popup</Typography.Text>
                          <Space.Compact style={{ width: '100%', marginTop: 4 }}>
                            <Input
                              placeholder="URL Gambar Banner (contoh: https://domain.com/banner.png)"
                              value={popup.image}
                              onChange={(e) => setPopup((p) => ({ ...p, image: e.target.value }))}
                            />
                            <Upload
                              showUploadList={false}
                              customRequest={({ file, onSuccess, onError }) =>
                                handleHeroUpload(file, 'popup', onSuccess, onError)
                              }
                            >
                              <Button icon={<UploadOutlined />}>Upload Gambar</Button>
                            </Upload>
                          </Space.Compact>
                          {popup.image && (
                            <div style={{ marginTop: 8 }}>
                              <img
                                src={popup.image}
                                alt="preview-popup"
                                style={{ maxHeight: 140, maxWidth: '100%', borderRadius: 8, objectFit: 'contain', background: '#0f172a' }}
                              />
                            </div>
                          )}
                        </div>

                        <Divider style={{ margin: '8px 0' }} />
                        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                          <Space>
                            <Switch
                              checked={popup.show_once}
                              onChange={(v) => setPopup((p) => ({ ...p, show_once: v }))}
                            />
                            <Typography.Text>Tutup Permanen (1x per browser device)</Typography.Text>
                          </Space>
                          <Space>
                            <Switch
                              checked={popup.use_duration}
                              onChange={(v) => setPopup((p) => ({ ...p, use_duration: v }))}
                            />
                            <Typography.Text>Hitung Mundur Tombol Close:</Typography.Text>
                            <InputNumber
                              min={1}
                              max={300}
                              disabled={!popup.use_duration}
                              value={popup.duration || 5}
                              onChange={(v) => setPopup((p) => ({ ...p, duration: v }))}
                              addonAfter="Detik"
                              size="small"
                            />
                          </Space>
                          <Space>
                            <Switch
                              checked={popup.use_fireworks || false}
                              onChange={(v) => setPopup((p) => ({ ...p, use_fireworks: v }))}
                            />
                            <Typography.Text>🎆 Efek Perayaan (Kembang Api)</Typography.Text>
                          </Space>
                          <Space>
                            <Switch
                              checked={popup.use_sound || false}
                              onChange={(v) => setPopup((p) => ({ ...p, use_sound: v }))}
                            />
                            <Typography.Text>🎵 Efek Suara (Sound Effect)</Typography.Text>
                          </Space>
                        </div>

                        {popup.use_sound && (
                          <div style={{ marginTop: 8 }}>
                            <Typography.Text strong>URL Audio / Sound Effect (.mp3, .wav, .ogg)</Typography.Text>
                            <Space.Compact style={{ width: '100%', marginTop: 4 }}>
                              <Input
                                placeholder="URL File Audio (contoh: https://domain.com/sound.mp3)"
                                value={popup.sound_url || ''}
                                onChange={(e) => setPopup((p) => ({ ...p, sound_url: e.target.value }))}
                              />
                              <Upload
                                showUploadList={false}
                                accept="audio/*"
                                customRequest={({ file, onSuccess, onError }) =>
                                  handleHeroUpload(file, 'popup_sound', onSuccess, onError)
                                }
                              >
                                <Button icon={<UploadOutlined />}>Upload Audio</Button>
                              </Upload>
                            </Space.Compact>
                            {popup.sound_url && (
                              <div style={{ marginTop: 6 }}>
                                <audio controls src={popup.sound_url} style={{ height: 32, maxWidth: '100%' }} />
                              </div>
                            )}
                          </div>
                        )}
                      </Space>
                    </Card>

                    <Card size="small" variant="outlined">
                      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <div className="notification-settings__toolbar">
                          <div>
                            <Typography.Text strong>Slide Beranda</Typography.Text>
                            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                              Atur konten slide yang tampil di halaman Layanan Mandiri.
                            </Typography.Paragraph>
                          </div>
                          <Space wrap>
                            <Button icon={<PlusOutlined />} onClick={addHeroSlide}>
                              Tambah Slide
                            </Button>
                            <Button
                              type="primary"
                              icon={<PictureOutlined />}
                              onClick={() => navigate('/app/pengaturan-slider')}
                            >
                              Buka Studio Editor
                            </Button>
                            <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveSettings} loading={saving}>
                              Simpan
                            </Button>
                          </Space>
                        </div>

                        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                          {heroSlides.map((slide, index) => (
                            <Card
                              key={`slide-${index}`}
                              size="small"
                              variant="outlined"
                              title={
                                <Space>
                                  <Typography.Text strong>{index + 1}.</Typography.Text>
                                  <Typography.Text>{slide.title || '(Tanpa Judul)'}</Typography.Text>
                                  {slide.active ? <Tag color="blue">Aktif</Tag> : <Tag>Draft</Tag>}
                                </Space>
                              }
                              extra={
                                <Space>
                                  <Button
                                    icon={<VerticalAlignTopOutlined />}
                                    size="small"
                                    disabled={index === 0}
                                    onClick={() => moveHeroSlide(index, -1)}
                                  />
                                  <Button
                                    icon={<VerticalAlignBottomOutlined />}
                                    size="small"
                                    disabled={index === heroSlides.length - 1}
                                    onClick={() => moveHeroSlide(index, 1)}
                                  />
                                  <Button
                                    danger
                                    icon={<DeleteOutlined />}
                                    size="small"
                                    onClick={() => removeHeroSlide(index)}
                                  />
                                </Space>
                              }
                            >
                              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                <Input
                                  placeholder="Judul slide"
                                  value={slide.title}
                                  onChange={(e) => updateHeroSlide(index, { title: e.target.value })}
                                />
                                <Input.TextArea
                                  rows={2}
                                  placeholder="Deskripsi slide"
                                  value={slide.description}
                                  onChange={(e) => updateHeroSlide(index, { description: e.target.value })}
                                />
                                <Space wrap style={{ width: '100%' }}>
                                  <Select
                                    placeholder="Tema"
                                    style={{ minWidth: 140 }}
                                    options={availableTones}
                                    value={slide.tone}
                                    onChange={(v) => updateHeroSlide(index, { tone: v })}
                                  />
                                  <span>
                                    <Switch
                                      checked={slide.active}
                                      onChange={(v) => updateHeroSlide(index, { active: v })}
                                    />
                                    <Typography.Text style={{ marginLeft: 8 }}>
                                      {slide.active ? 'Tampilkan' : 'Sembunyikan'}
                                    </Typography.Text>
                                  </span>
                                </Space>
                                <Space.Compact style={{ width: '100%' }}>
                                  <Input
                                    placeholder="URL gambar atau hasil upload"
                                    value={slide.image}
                                    onChange={(e) => updateHeroSlide(index, { image: e.target.value })}
                                  />
                                  <Upload
                                    showUploadList={false}
                                    customRequest={({ file, onSuccess, onError }) =>
                                      handleHeroUpload(file, index, onSuccess, onError)
                                    }
                                  >
                                    <Button icon={<UploadOutlined />}>Upload</Button>
                                  </Upload>
                                </Space.Compact>
                                {slide.image && (
                                  <img
                                    src={slide.image}
                                    alt="preview"
                                    style={{ maxHeight: 120, borderRadius: 8, objectFit: 'cover' }}
                                  />
                                )}
                              </Space>
                            </Card>
                          ))}
                          {heroSlides.length === 0 && (
                            <Typography.Text type="secondary">
                              Belum ada slide. Klik "Tambah Slide" untuk memulai.
                            </Typography.Text>
                          )}
                        </Space>
                      </Space>
                    </Card>
                  </div>
                ),
              },
              {
                key: 'employees',
                label: 'Data Pegawai',
                children: (
                  <div className="notification-settings__tab">
                    <div className="notification-settings__toolbar">
                      <div>
                        <Typography.Text strong>Nomor WhatsApp Pegawai</Typography.Text>
                        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                          Isi nomor WhatsApp per pegawai. Gunakan pencarian untuk mempercepat.
                        </Typography.Paragraph>
                      </div>
                      <Input
                        placeholder="Cari nama, NIP, fungsi, nomor"
                        value={employeeSearch}
                        onChange={(event) => setEmployeeSearch(event.target.value)}
                      />
                    </div>

                    <Collapse
                      items={employeeGroups.map((group) => ({
                        key: group.group,
                        label: group.group,
                        children: (
                          <div className="notification-settings__employee-list">
                            {group.items.map((employee) => (
                              <div key={employee.id} className="notification-settings__employee-row">
                                <div>
                                  <Typography.Text strong>{employee.name}</Typography.Text>
                                  <Typography.Text type="secondary" className="notification-settings__employee-meta">
                                    {employee.nip || 'NIP belum diisi'}
                                  </Typography.Text>
                                </div>
                                <Space.Compact className="notification-settings__employee-input">
                                  <Input
                                    value={phoneDrafts[employee.id] ?? ''}
                                    onChange={(event) => handlePhoneDraftChange(employee.id, event.target.value)}
                                    placeholder="0812xxxx"
                                  />
                                  <Button
                                    type="primary"
                                    icon={<SaveOutlined />}
                                    loading={savingPhoneId === employee.id}
                                    onClick={() => handleSavePhone(employee.id)}
                                  >
                                    Simpan
                                  </Button>
                                </Space.Compact>
                              </div>
                            ))}
                          </div>
                        ),
                      }))}
                    />

                    <Divider />

                    <Table
                      dataSource={filteredEmployees}
                      columns={columns}
                      pagination={{ pageSize: 8 }}
                      size="small"
                      rowKey="id"
                    />
                  </div>
                ),
              },
            ]}
          />
        </Card>
      </div>
    </div>
  );
};

export default AdminNotificationSettings;
