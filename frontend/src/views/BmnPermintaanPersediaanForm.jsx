import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  App as AntdApp,
  Button,
  Card,
  Divider,
  Form,
  Input,
  InputNumber,
  Result,
  Select,
  Space,
  Typography,
} from 'antd';
import { buildMessageAdapter } from '../utils/notify.js';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../hooks/useAuth.js';
import { bmnService } from '../services/bmnService.js';
import { generateSpbNumber } from '../utils/referenceNumbers.js';

// const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

const BmnPermintaanPersediaanForm = () => {
  const { apiFetch } = useAuth();
  const { message } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);
  const service = useMemo(() => bmnService(apiFetch), [apiFetch]);
  const [form] = Form.useForm();

  const [employees, setEmployees] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [resultData, setResultData] = useState(null);

  const employeeMap = useMemo(() => (
    new Map(employees.map((item) => [item.nip, item]))
  ), [employees]);

  const inventoryMap = useMemo(() => (
    new Map(inventory.map((item) => [item.id, item]))
  ), [inventory]);

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await apiFetch('/employees');
      if (!response.ok) {
        throw new Error('Gagal memuat data pegawai.');
      }
      const payload = await response.json();
      setEmployees((payload ?? []).map((item) => ({
        id: item.id,
        nip: item.nip,
        nama: item.nama,
        fungsiBidang: item.fungsi_bidang,
      })));
    } catch (error) {
      console.error(error);
      notification.error({
        message: 'Tidak dapat memuat data pegawai',
        description: error.message,
      });
    }
  }, [apiFetch, notification]);

  const fetchInventory = useCallback(async () => {
    try {
      const payload = await service.listInventory();
      setInventory((payload ?? []).map((item) => ({
        id: item.id,
        kodeBarang: item.kode_barang,
        namaBarang: item.nama_barang,
        satuan: item.satuan,
        stok: Number(item.stok ?? 0),
      })));
    } catch (error) {
      console.error(error);
      notification.error({
        message: 'Tidak dapat memuat data persediaan',
        description: error.message,
      });
    }
  }, [service, notification]);

  useEffect(() => {
    fetchEmployees();
    fetchInventory();
  }, [fetchEmployees, fetchInventory]);

  const handleNipChange = (nip) => {
    const employee = employeeMap.get(nip);
    if (!employee) {
      form.setFieldsValue({ nama: undefined, fungsiBidang: undefined });
      return;
    }
    form.setFieldsValue({ nama: employee.nama, fungsiBidang: employee.fungsiBidang });
  };

  const resolveInventoryOption = (id) => {
    const item = inventoryMap.get(id);
    if (!item) return '';
    return `${item.namaBarang} (${item.kodeBarang})`;
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const { nip, nama, fungsiBidang, items, catatan } = values;
      if (!items || items.length === 0) {
        notification.warning({ message: 'Tambahkan minimal satu barang yang diminta.' });
        return;
      }

      setSubmitting(true);
      const referenceNumber = generateSpbNumber();
      const payload = {
        spb_number: referenceNumber,
        tanggal_pengajuan: dayjs().format('YYYY-MM-DD'),
        nip,
        nama,
        fungsi_bidang: fungsiBidang,
        catatan,
        items: items.map((item) => {
          const inventoryItem = inventoryMap.get(item.barangId);
          return {
            inventory_id: item.barangId,
            kode_barang: inventoryItem?.kodeBarang,
            nama_barang: inventoryItem?.namaBarang,
            satuan: inventoryItem?.satuan,
            jumlah: item.jumlah,
          };
        }),
      };

      try {
        const response = await service.createRequest(payload);
        setResultData({
          ...response,
          fallbackNumber: referenceNumber,
        });
        form.resetFields();
      } catch (error) {
        notification.error({
          message: 'Gagal menyimpan permintaan persediaan',
          description: error.message,
        });
        setResultData({
          spb_number: referenceNumber,
          nip,
          nama,
          fungsi_bidang: fungsiBidang,
          items: payload.items,
          catatan,
        });
      } finally {
        fetchInventory();
      }
    } catch (error) {
      if (!error.errorFields) {
        notification.error({
          message: 'Form permintaan tidak valid',
          description: error.message,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetResult = () => setResultData(null);

  if (resultData) {
    const spbNumber = resultData.spb_number ?? resultData.fallbackNumber;
    return (
      <Result
        status="success"
        title="Permintaan persediaan berhasil diajukan"
        subTitle={`Nomor SPB Anda: ${spbNumber}`}
        extra={[
          <Button type="primary" key="new" onClick={resetResult}>
            Buat Permintaan Baru
          </Button>,
        ]}
      >
        <Card size="small" title="Ringkasan Permintaan" variant="borderless">
          <Typography.Paragraph>
            <strong>NIP</strong>: {resultData.nip}<br />
            <strong>Nama</strong>: {resultData.nama}<br />
            <strong>Fungsi/Bidang</strong>: {resultData.fungsi_bidang}
          </Typography.Paragraph>
          <Divider style={{ margin: '12px 0' }} />
          <Typography.Title level={5} style={{ marginBottom: 8 }}>
            Barang yang Diminta
          </Typography.Title>
          {resultData.items?.map((item, index) => (
            <Typography.Paragraph key={index} style={{ marginBottom: 4 }}>
              {index + 1}. {item.nama_barang} ({item.kode_barang}) - {item.jumlah} {item.satuan}
            </Typography.Paragraph>
          ))}
          {resultData.catatan && (
            <Typography.Paragraph style={{ marginTop: 12 }}>
              <strong>Catatan</strong>: {resultData.catatan}
            </Typography.Paragraph>
          )}
        </Card>
      </Result>
    );
  }

  return (
    <div className="form-page">
      <Typography.Title level={4} className="module-title">
        Form Permintaan Persediaan
      </Typography.Title>
      <Typography.Paragraph className="module-subtitle">
        Ajukan permintaan barang — nomor SPB otomatis.
      </Typography.Paragraph>
      <Card className="form-card">
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={handleSubmit}
        >
          <Typography.Title level={5}>Informasi Pemohon</Typography.Title>
          <Form.Item
            name="nip"
            label="NIP"
            rules={[{ required: true, message: 'NIP wajib dipilih.' }]}
          >
            <Select
              showSearch
              placeholder="Cari berdasarkan NIP atau nama"
              optionFilterProp="label"
              onChange={handleNipChange}
              options={employees.map((emp) => ({
                value: emp.nip,
                label: `${emp.nip} - ${emp.nama}`,
              }))}
              filterOption={(input, option) => option?.label?.toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
          <Form.Item
            name="nama"
            label="Nama"
            rules={[{ required: true, message: 'Nama wajib terisi.' }]}
          >
            <Input placeholder="Nama otomatis terisi dari data pegawai" readOnly />
          </Form.Item>
          <Form.Item name="fungsiBidang" label="Fungsi/Bidang">
            <Input placeholder="Fungsi/Bidang otomatis dari data pegawai" readOnly />
          </Form.Item>

          <Divider />
          <Typography.Title level={5}>Detail Barang</Typography.Title>
          <Form.List
            name="items"
            rules={[{
              validator: async (_, value) => {
                if (!value || value.length === 0) {
                  throw new Error('Tambahkan minimal satu barang.');
                }
              },
            }]}
          >
            {(fields, { add, remove }, { errors }) => (
              <>
                {fields.map((field) => (
                  <Card key={field.key} size="small" style={{ marginBottom: 12 }}>
                    <Space direction="vertical" style={{ width: '100%', gap: 12 }}>
                      <Form.Item
                        {...field}
                        name={[field.name, 'barangId']}
                        label="Nama Barang"
                        fieldKey={[field.fieldKey, 'barangId']}
                        rules={[{ required: true, message: 'Pilih barang.' }]}
                      >
                        <Select
                          placeholder="Pilih barang persediaan"
                          showSearch
                          optionFilterProp="label"
                          options={inventory.map((item) => ({
                            value: item.id,
                            label: `${item.namaBarang} - Stok ${item.stok}`,
                          }))}
                        />
                      </Form.Item>
                      <Form.Item
                        {...field}
                        name={[field.name, 'jumlah']}
                        label="Jumlah"
                        fieldKey={[field.fieldKey, 'jumlah']}
                        rules={[{ required: true, message: 'Jumlah wajib diisi.' }, ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (value === undefined || value === null) {
                              return Promise.resolve();
                            }
                            if (value <= 0) {
                              return Promise.reject(new Error('Jumlah harus lebih dari 0.'));
                            }
                            const barangId = getFieldValue(['items', field.name, 'barangId']);
                            const inventoryItem = inventoryMap.get(barangId);
                            if (inventoryItem && value > inventoryItem.stok) {
                              return Promise.reject(new Error(`Stok tidak mencukupi (tersedia ${inventoryItem.stok}).`));
                            }
                            return Promise.resolve();
                          },
                        })]}
                      >
                        <InputNumber min={1} style={{ width: 160 }} />
                      </Form.Item>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography.Text type="secondary">
                          {resolveInventoryOption(form.getFieldValue(['items', field.name, 'barangId']))}
                        </Typography.Text>
                        <Button
                          danger
                          icon={<MinusCircleOutlined />}
                          onClick={() => remove(field.name)}
                        >
                          Hapus
                        </Button>
                      </div>
                    </Space>
                  </Card>
                ))}
                <Form.ErrorList errors={errors} />
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  Tambah Barang
                </Button>
              </>
            )}
          </Form.List>

          <Form.Item name="catatan" label="Catatan Tambahan">
            <Input.TextArea rows={4} placeholder="Catatan mengenai kebutuhan barang (opsional)" />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Button htmlType="reset" onClick={() => form.resetFields()}>Reset</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Ajukan Permintaan
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default BmnPermintaanPersediaanForm;


