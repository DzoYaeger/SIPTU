import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  App as AntdApp,
  Alert,
  Button,
  Card,
  DatePicker,
  Divider,
  Form,
  Input,
  Result,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd';
import { buildMessageAdapter } from '../utils/notify.js';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { useAuth } from '../hooks/useAuth.js';
import { generateSpaNumber } from '../utils/referenceNumbers.js';

dayjs.extend(isBetween);

// const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

const locationOptions = [
  'Kota Palopo',
  'Kab. Luwu',
  'Kab. Luwu Utara',
  'Kab. Luwu Timur',
  'Kab. Toraja Utara',
  'Kab. Tana Toraja',
  'Kab. Enrekang',
];

const rangeOverlaps = (startA, endA, startB, endB) => {
  if (!startA || !endA || !startB || !endB) return false;
  const aStart = dayjs(startA);
  const aEnd = dayjs(endA);
  const bStart = dayjs(startB);
  const bEnd = dayjs(endB);
  return aStart.isBetween(bStart, bEnd, null, '[]') ||
    aEnd.isBetween(bStart, bEnd, null, '[]') ||
    bStart.isBetween(aStart, aEnd, null, '[]') ||
    bEnd.isBetween(aStart, aEnd, null, '[]');
};

const normalizeEmployee = (item) => ({
  id: item.id,
  nip: item.nip,
  nama: item.name ?? item.nama,
  fungsiBidang: item.function_area ?? item.fungsi_bidang,
});

const normalizeAsset = (item) => ({
  id: item.id,
  kodeBmn: item.asset_code ?? item.kode_bmn,
  nup: item.model ?? item.nup,
  namaBarang: item.name ?? item.nama_barang,
  merekBarang: item.brand ?? item.merek_barang,
  status: item.status,
});

const normalizeLoan = (item) => ({
  id: item.id,
  nomor: item.spa_number ?? item.nomor,
  tanggalMulai: item.loan_date ?? item.tanggal_mulai,
  tanggalSelesai: item.return_date ?? item.tanggal_selesai,
  status: item.status,
  items: (item.assets ?? item.items ?? []).map((detail) => ({
    assetId: detail.asset_id ?? detail.asset?.id,
    assetName: detail.nama_barang ?? detail.asset?.nama_barang,
  })),
});

const BmnPeminjamanAsetForm = () => {
  const { apiFetch } = useAuth();
  const { message } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);
  const [form] = Form.useForm();

  const [employees, setEmployees] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loans, setLoans] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [resultData, setResultData] = useState(null);

  const employeeMap = useMemo(() => new Map(employees.map((item) => [item.nip, item])), [employees]);
  const assetMap = useMemo(() => new Map(assets.map((item) => [item.id, item])), [assets]);

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await apiFetch('/employees?pageSize=1000');
      if (!response.ok) {
        throw new Error('Gagal memuat data pegawai.');
      }
      const payload = await response.json();
      const list = payload.data ?? payload ?? [];
      setEmployees(list.map(normalizeEmployee));
    } catch (error) {
      notification.error({
        message: 'Tidak dapat memuat data pegawai',
        description: error.message,
      });
    }
  }, [apiFetch, notification]);

  const fetchAssets = useCallback(async () => {
    try {
      const response = await apiFetch('/assets?pageSize=1000');
      if (!response.ok) {
        throw new Error('Gagal memuat data aset.');
      }
      const payload = await response.json();
      const list = payload.data ?? payload ?? [];
      setAssets(list.map(normalizeAsset));
    } catch (error) {
      notification.error({
        message: 'Tidak dapat memuat data aset',
        description: error.message,
      });
    }
  }, [apiFetch, notification]);

  const fetchLoans = useCallback(async () => {
    try {
      const response = await apiFetch('/bmn-loans');
      if (!response.ok) {
        throw new Error('Gagal memuat data peminjaman.');
      }
      const payload = await response.json();
      setLoans((payload ?? []).map(normalizeLoan));
    } catch (error) {
      notification.error({
        message: 'Tidak dapat memuat data peminjaman',
        description: error.message,
      });
    }
  }, [apiFetch, notification]);

  useEffect(() => {
    fetchEmployees();
    fetchAssets();
    fetchLoans();
  }, [fetchEmployees, fetchAssets, fetchLoans]);

  const selectedRange = Form.useWatch('periode', form);
  const lokasiWatch = Form.useWatch('lokasi', form);
  const kotaTujuanWatch = Form.useWatch('kotaTujuan', form);

  const handleNipChange = (nip) => {
    const employee = employeeMap.get(nip);
    if (!employee) {
      form.setFieldsValue({ nama: undefined, fungsiBidang: undefined });
      return;
    }
    form.setFieldsValue({ nama: employee.nama, fungsiBidang: employee.fungsiBidang });
  };

  const isAssetOccupied = (assetId) => {
    if (!selectedRange || selectedRange.length !== 2) return false;
    const [start, end] = selectedRange;
    return loans.some((loan) => (
      loan.items.some((item) => item.assetId === assetId) &&
      rangeOverlaps(start, end, loan.tanggalMulai, loan.tanggalSelesai)
    ));
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const { nip, nama, fungsiBidang, periode, assets: assetIds, lokasi, lokasiLainnya, kotaTujuan, kotaTujuanLainnya, alasan, password } = values;
      if (!assetIds || assetIds.length === 0) {
        notification.warning({ message: 'Pilih minimal satu aset.' });
        return;
      }

      const [tanggalMulai, tanggalSelesai] = periode;
      const conflicts = assetIds.filter((assetId) => isAssetOccupied(assetId));
      if (conflicts.length > 0) {
        notification.error({
          message: 'Sebagian aset tidak tersedia pada periode yang dipilih',
          description: 'Silakan pilih aset atau periode lain.',
        });
        return;
      }

      setSubmitting(true);
      const spaNumber = generateSpaNumber();
      const payload = {
        nip,
        nama,
        fungsi_bidang: fungsiBidang,
        tanggal_mulai: dayjs(tanggalMulai).format('YYYY-MM-DD'),
        tanggal_selesai: dayjs(tanggalSelesai).format('YYYY-MM-DD'),
        lokasi: lokasi === 'lainnya' ? lokasiLainnya : lokasi,
        kota_tujuan: kotaTujuan === 'Lainnya' ? kotaTujuanLainnya : kotaTujuan,
        alasan,
        password,
        items: assetIds.map((assetId) => {
          const asset = assetMap.get(assetId);
          return {
            asset_id: assetId,
            kode_bmn: asset?.kodeBmn,
            nama_barang: asset?.namaBarang,
            merek_barang: asset?.merekBarang,
            nup: asset?.nup,
          };
        }),
      };

      try {
        const response = await apiFetch('/bmn-loans', {
          method: 'POST',
          body: JSON.stringify({
            nip,
            nama,
            fungsi_bidang: fungsiBidang,
            loan_date: payload.tanggal_mulai,
            return_date: payload.tanggal_selesai,
            location: payload.lokasi,
            notes: payload.alasan,
            password: payload.password,
            assets: payload.items,
          }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data?.message ?? 'Gagal menyimpan peminjaman.');
        }
        const data = await response.json();
        setResultData({
          ...data,
          fallbackNumber: data?.spa_number ?? spaNumber,
        });
        form.resetFields();
        fetchLoans();
      } catch (error) {
        notification.error({
          message: 'Gagal menyimpan peminjaman aset',
          description: error.message,
        });
        setResultData({
          spa_number: spaNumber,
          nip,
          nama,
          fungsi_bidang: fungsiBidang,
          tanggal_mulai: payload.tanggal_mulai,
          tanggal_selesai: payload.tanggal_selesai,
          lokasi: payload.lokasi,
          alasan,
          items: payload.items,
        });
      }
    } catch (error) {
      if (!error.errorFields) {
        notification.error({
          message: 'Form peminjaman tidak valid',
          description: error.message,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetResult = () => setResultData(null);

  const assetOptions = assets.map((asset) => ({
    value: asset.id,
    label: `${asset.namaBarang} - ${asset.kodeBmn} / NUP ${asset.nup}`,
    disabled: isAssetOccupied(asset.id),
  }));

  if (resultData) {
    const spaNumber = resultData.spa_number ?? resultData.fallbackNumber;
    return (
      <Result
        status="success"
        title="Pengajuan peminjaman aset berhasil"
        subTitle={`Nomor SPA Anda: ${spaNumber}`}
        extra={[
          <Button type="primary" key="new" onClick={resetResult}>
            Ajukan Peminjaman Baru
          </Button>,
        ]}
      >
        <Card size="small" title="Ringkasan Peminjaman" variant="borderless">
          <Typography.Paragraph>
            <strong>NIP</strong>: {resultData.nip}<br />
            <strong>Nama</strong>: {resultData.nama}<br />
            <strong>Periode</strong>: {dayjs(resultData.tanggal_mulai).format('DD MMM YYYY')} - {dayjs(resultData.tanggal_selesai).format('DD MMM YYYY')}<br />
            <strong>Lokasi</strong>: {resultData.lokasi}
          </Typography.Paragraph>
          <Divider style={{ margin: '12px 0' }} />
          <Typography.Title level={5} style={{ marginBottom: 8 }}>
            Aset yang Dipinjam
          </Typography.Title>
          {resultData.items?.map((item, index) => (
            <Typography.Paragraph key={index} style={{ marginBottom: 4 }}>
              {index + 1}. {item.nama_barang} - {item.kode_bmn} (NUP {item.nup})
            </Typography.Paragraph>
          ))}
          {resultData.alasan && (
            <Typography.Paragraph style={{ marginTop: 12 }}>
              <strong>Alasan</strong>: {resultData.alasan}
            </Typography.Paragraph>
          )}
        </Card>
      </Result>
    );
  }

  return (
    <div className="form-page">
      <Typography.Title level={4} className="module-title">
        Peminjaman Aset BMN
      </Typography.Title>
      <Typography.Paragraph className="module-subtitle">
        Pilih aset, tentukan periode, dan ajukan peminjaman.
      </Typography.Paragraph>
      <Card className="form-card">
        <Form form={form} layout="vertical" requiredMark={false} onFinish={handleSubmit}>
          <Typography.Title level={5}>Informasi Peminjam</Typography.Title>
          <Form.Item name="nip" label="NIP" rules={[{ required: true, message: 'NIP wajib dipilih.' }]}
          >
            <Select
              showSearch
              placeholder="Cari NIP atau nama"
              optionFilterProp="label"
              onChange={handleNipChange}
              options={employees.map((item) => ({ value: item.nip, label: `${item.nip} - ${item.nama}` }))}
              filterOption={(input, option) => option?.label?.toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
          <Form.Item name="nama" label="Nama" rules={[{ required: true, message: 'Nama wajib terisi.' }]}
          >
            <Input readOnly placeholder="Nama otomatis dari data pegawai" />
          </Form.Item>
          <Form.Item name="fungsiBidang" label="Fungsi/Bidang">
            <Input readOnly placeholder="Fungsi/Bidang otomatis" />
          </Form.Item>

          <Divider />
          <Typography.Title level={5}>Periode dan Aset</Typography.Title>
          <Form.Item
            name="periode"
            label="Periode Peminjaman"
            rules={[{ required: true, message: 'Periode peminjaman wajib dipilih.' }]}
          >
            <DatePicker.RangePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="assets"
            label="Aset yang Dipinjam"
            rules={[{ required: true, message: 'Pilih minimal satu aset.' }]}
          >
            <Select
              mode="multiple"
              placeholder="Pilih aset"
              options={assetOptions}
              optionRender={(option) => {
                const asset = assetMap.get(option.value);
                const occupied = isAssetOccupied(option.value);
                return (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <span>{option.label}</span>
                    {occupied && (
                      <Tag color="red">Tidak tersedia pada periode ini</Tag>
                    )}
                    {asset?.status === 'maintenance' && (
                      <Tag color="orange">Sedang perbaikan</Tag>
                    )}
                  </Space>
                );
              }}
            />
          </Form.Item>

          {selectedRange && selectedRange.length === 2 && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="Ketersediaan aset"
              description="Aset yang tidak tersedia pada periode terpilih akan muncul dengan label merah dan tidak dapat dipilih."
            />
          )}

          <Divider />
          <Typography.Title level={5}>Detail Tambahan</Typography.Title>
          <Form.Item
            name="lokasi"
            label="Lokasi Peminjaman"
            rules={[{ required: true, message: 'Lokasi wajib dipilih.' }]}
          >
            <Select
              placeholder="Pilih lokasi"
              options={[
                ...locationOptions.map((item) => ({ value: item, label: item })),
                { value: 'lainnya', label: 'Lainnya' },
              ]}
            />
          </Form.Item>
          {lokasiWatch === 'lainnya' && (
            <Form.Item
              name="lokasiLainnya"
              label="Lokasi Lainnya"
              rules={[{ required: true, message: 'Isi lokasi peminjaman.' }]}
            >
              <Input placeholder="Masukkan nama lokasi" />
            </Form.Item>
          )}
          <Form.Item
            name="kotaTujuan"
            label="Kota Tujuan"
            rules={[{ required: true, message: 'Kota tujuan wajib dipilih.' }]}
          >
            <Select
              placeholder="Pilih kota tujuan"
              options={[
                'Kota Palopo',
                'Kab. Luwu',
                'Kab. Luwu Utara',
                'Kab. Luwu Timur',
                'Kab. Toraja Utara',
                'Kab. Tana Toraja',
                'Kab. Enrekang',
                'Lainnya',
              ].map((item) => ({ value: item, label: item }))}
            />
          </Form.Item>
          {kotaTujuanWatch === 'Lainnya' && (
            <Form.Item
              name="kotaTujuanLainnya"
              label="Kota Tujuan Lainnya"
              rules={[{ required: true, message: 'Isi kota tujuan.' }]}
            >
              <Input placeholder="Masukkan nama kota tujuan" />
            </Form.Item>
          )}
          <Form.Item name="alasan" label="Alasan Peminjaman" rules={[{ required: true, message: 'Alasan peminjaman wajib diisi.' }]}
          >
            <Input.TextArea rows={4} placeholder="Jelaskan kebutuhan peminjaman aset" />
          </Form.Item>
          <Form.Item name="password" label="Password SIPTU Pemohon" rules={[{ required: true, message: 'Password SIPTU wajib diisi untuk verifikasi TTE.' }]}
          >
            <Input.Password placeholder="Masukkan password login SIPTU pemohon" />
          </Form.Item>
          <Form.Item name="totp_code" label="Kode Autentikasi MFA (6 Digit / Recovery Code)" rules={[{ required: true, message: 'Kode MFA wajib diisi untuk verifikasi TTE.' }]}
          >
            <Input placeholder="Contoh: 123456 atau XXXX-XXXX" style={{ fontWeight: 700, letterSpacing: '1px' }} />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Button htmlType="reset" onClick={() => form.resetFields()}>Reset</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Ajukan Peminjaman
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default BmnPeminjamanAsetForm;


