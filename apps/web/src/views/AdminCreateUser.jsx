import { useState } from 'react';
import { App as AntdApp, Button, Card, Form, Input, Radio, Space, Typography } from 'antd';
import { buildMessageAdapter } from '../utils/notify.js';
import { useAuth } from '../hooks/useAuth.js';

// const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

const roleOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'operator', label: 'Operator' },
  { value: 'validator', label: 'Validator' },
];

const AdminCreateUser = () => {
  const { apiFetch } = useAuth();
  const { message } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const response = await apiFetch('/admin/users', {
        method: 'POST',
        body: JSON.stringify(values),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message ?? 'Gagal membuat pengguna baru.');
      }

      notification.success({
        message: 'Pengguna dibuat',
        description: `${data.name} berhasil ditambahkan.`,
      });
      form.resetFields();
    } catch (error) {
      notification.error({
        message: 'Gagal membuat pengguna',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="module-section">
      <Card className="content-card" variant="borderless">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Typography.Title level={4} className="module-title">
              Tambah Pengguna
            </Typography.Title>
            <Typography.Paragraph className="module-subtitle">
              Buat akun pengguna secara manual.
            </Typography.Paragraph>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            requiredMark={false}
            className="module-form"
          >
            <Form.Item
              name="name"
              label="Nama Lengkap"
              rules={[{ required: true, message: 'Nama wajib diisi.' }]}
            >
              <Input placeholder="Contoh: Rani Hartati" />
            </Form.Item>

            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Email wajib diisi.' },
                { type: 'email', message: 'Masukkan alamat email yang valid.' },
              ]}
            >
              <Input placeholder="Contoh: rani.hartati@instansi.go.id" />
            </Form.Item>

            <Form.Item
              name="password"
              label="Kata Sandi"
              rules={[{ required: true, message: 'Kata sandi minimal 8 karakter.', min: 8 }]}
            >
              <Input.Password placeholder="Minimal 8 karakter" autoComplete="new-password" />
            </Form.Item>

            <Form.Item
              name="base_role"
              label="Peran Dasar"
              initialValue="operator"
              rules={[{ required: true, message: 'Pilih peran dasar pengguna.' }]}
            >
              <Radio.Group options={roleOptions} optionType="button" />
            </Form.Item>

            <div>
              <Button type="primary" htmlType="submit" loading={loading}>
                Simpan Pengguna
              </Button>
            </div>
          </Form>
        </Space>
      </Card>
    </div>
  );
};

export default AdminCreateUser;


