import { useState } from 'react';
import {
  App as AntdApp,
  Button,
  Dropdown,
  Form,
  Input,
  Modal,
  Space,
  Tag,
} from 'antd';
import { buildMessageAdapter } from '../utils/notify.js';
import { DownOutlined, PlusOutlined } from '@ant-design/icons';

const actionItems = [
  { key: 'tambah', label: 'Tambah Data', description: 'Buat data baru untuk modul yang dipilih.' },
  { key: 'edit', label: 'Edit Data', description: 'Perbarui informasi yang sudah ada.' },
  { key: 'hapus', label: 'Hapus Data', description: 'Nonaktifkan data yang tidak diperlukan.' },
];

const actionLabels = {
  tambah: 'Tambah Data',
  edit: 'Edit Data',
  hapus: 'Hapus Data',
};

const ActionPanel = () => {
  const { modal, message } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [actionKey, setActionKey] = useState(null);

  const handleAction = ({ key }) => {
    setActionKey(key);
    form.resetFields();
    setOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      modal.confirm({
        title: 'Simpan perubahan?',
        content: 'Periksa kembali data sebelum disimpan.',
        okText: 'Simpan',
        cancelText: 'Batal',
        onOk: () => {
          setOpen(false);
          notification.success({
            message: 'Aksi selesai',
            description: `${actionLabels[actionKey]} berhasil diproses untuk ${values.namaData}.`,
            placement: 'bottomRight',
          });
        },
      });
    } catch (err) {
      if (err?.errorFields) {
        modal.warning({
          title: 'Data belum lengkap',
          content: 'Isi semua field yang wajib sebelum menyimpan.',
        });
      }
    }
  };

  return (
    <div className="action-panel">
      <Space direction="vertical" size="middle">
        <Dropdown
          menu={{ items: actionItems, onClick: handleAction }}
          trigger={['click']}
        >
          <Button type="primary" icon={<PlusOutlined />} size="small">
            Pilih Aksi <DownOutlined />
          </Button>
        </Dropdown>
        <div className="action-guidelines">
          <Tag color="#6D94C5">Tips</Tag>
          Gunakan dropdown untuk mengakses aksi umum seperti tambah, edit, atau hapus data.
        </div>
      </Space>
      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSubmit}
        okText="Lanjut Simpan"
        cancelText="Batal"
        title={actionKey ? actionLabels[actionKey] : 'Pilih Aksi'}
        className="action-modal"
        destroyOnHidden
      >
        <Form layout="vertical" form={form} requiredMark={false}>
          <Form.Item
            label="Nama Data"
            name="namaData"
            rules={[{ required: true, message: 'Nama data wajib diisi.' }]}
          >
            <Input size="small" placeholder="Contoh: Data Pegawai" />
          </Form.Item>
          <Form.Item
            label="Catatan"
            name="catatan"
          >
            <Input.TextArea
              size="small"
              placeholder="Berikan catatan singkat untuk membantu tim memahami perubahan."
              autoSize={{ minRows: 2, maxRows: 4 }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ActionPanel;



