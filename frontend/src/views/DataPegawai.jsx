import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  App as AntdApp,
  Button,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
  Card,
  Row,
  Col,
  Avatar,
  Radio,
  Tabs,
  List,
  Divider,
  Badge,
  Spin,
  Dropdown,
} from 'antd';
import { buildMessageAdapter } from '../utils/notify.js';
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  UploadOutlined,
  UserOutlined,
  TeamOutlined,
  IdcardOutlined,
  AppstoreOutlined,
  BarsOutlined,
  SearchOutlined,
  DownloadOutlined,
  PhoneOutlined,
  BankOutlined,
  SafetyCertificateOutlined,
  CameraOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth.js';
import StatisticCard from '../components/StatisticCard.jsx';

// const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

const normalizeEmployee = (employee) => ({
  id: employee.id,
  key: employee.id,
  nip: employee.nip,
  nama: employee.name,
  pangkat: employee.pangkat || employee.position || '',
  jabatan: employee.position || '',
  fungsiBidang: employee.function_area || '',
  phone: employee.phone_number || '',
  kgbHistory: employee.kgb_records ?? [],
  avatarUrl: employee.avatar_url || null,
});

const DataPegawai = () => {
  const { apiFetch, token } = useAuth();
  const { modal, message } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);
  const [form] = Form.useForm();

  // Data State
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // UI State
  const [viewMode, setViewMode] = useState('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFungsi, setFilterFungsi] = useState('all');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [activeEmployee, setActiveEmployee] = useState(null);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState('create');
  const pendingEditRef = useRef(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const employeeUploadProps = {
    name: 'photo',
    action: activeEmployee ? `${import.meta.env.VITE_API_URL || 'https://siptu.bpompalopo.com/core_api/api'}/employees/${activeEmployee.id}/photo` : '',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    showUploadList: false,
    beforeUpload(file) {
      const isAllowedType = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type);
      if (!isAllowedType) {
        message.error('Format file tidak didukung. Gunakan JPG, PNG, GIF atau WEBP.');
      }
      const isLt2M = file.size / 1024 / 1024 < 2;
      if (!isLt2M) {
        message.error('Ukuran foto tidak boleh melebihi 2MB.');
      }
      return isAllowedType && isLt2M;
    },
    onChange(info) {
      if (info.file.status === 'uploading') {
        setUploadingPhoto(true);
        return;
      }
      if (info.file.status === 'done') {
        setUploadingPhoto(false);
        notification.success({
          message: 'Foto Diperbarui',
          description: 'Foto pegawai berhasil diubah.',
        });
        const newAvatarUrl = info.file.response?.avatar_url;
        if (newAvatarUrl) {
          setActiveEmployee(prev => prev ? { ...prev, avatarUrl: newAvatarUrl } : null);
        }
        fetchEmployees();
      } else if (info.file.status === 'error') {
        setUploadingPhoto(false);
        const errMsg = info.file.response?.message || 'Gagal mengupload foto pegawai.';
        notification.error({
          message: 'Upload Gagal',
          description: errMsg,
        });
      }
    },
  };

  // --- API Handlers ---

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/employees?pageSize=1000');
      if (!response.ok) throw new Error('Gagal memuat data pegawai.');
      const payload = await response.json();
      setData((payload.data ?? []).map(normalizeEmployee));
    } catch (error) {
      notification.error({ message: 'Gagal memuat data', description: error.message });
    } finally {
      setLoading(false);
    }
  }, [apiFetch, notification]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  // --- Computed Stuff ---

  const uniqueFungsi = useMemo(() => {
    const functions = new Set(data.map(d => d.fungsiBidang).filter(Boolean));
    return Array.from(functions).sort();
  }, [data]);

  const filteredData = useMemo(() => {
    let result = data;

    if (filterFungsi !== 'all') {
      result = result.filter(d => d.fungsiBidang === filterFungsi);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(d =>
        d.nama.toLowerCase().includes(term) ||
        d.nip.includes(term) ||
        d.jabatan.toLowerCase().includes(term)
      );
    }

    return result;
  }, [data, searchTerm, filterFungsi]);

  const stats = useMemo(() => ({
    total: data.length,
    withFunction: data.filter(d => d.fungsiBidang).length,
  }), [data]);

  // --- Action Handlers ---

  const handleCreate = () => {
    setMode('create');
    setActiveEmployee(null);
    pendingEditRef.current = null;
    setModalOpen(true);
  };

  const handleEdit = (record) => {
    setMode('edit');
    setActiveEmployee(record);
    pendingEditRef.current = {
      nip: record.nip,
      nama: record.nama,
      pangkat: record.pangkat,
      jabatan: record.jabatan,
      fungsi_bidang: record.fungsiBidang || undefined,
      phone_number: record.phone,
    };
    setModalOpen(true);
  };

  const handleModalOpenChange = (open) => {
    if (open) {
      if (pendingEditRef.current) {
        form.setFieldsValue(pendingEditRef.current);
      } else {
        form.resetFields();
      }
    }
  };

  const handleCloseModal = () => {
    if (saving) return;
    setModalOpen(false);
    setActiveEmployee(null);
    form.resetFields();
  };

  const persistEmployee = async (values) => {
    setSaving(true);
    try {
      const endpoint = mode === 'create'
        ? '/employees'
        : `/employees/${activeEmployee?.id}`;

      const payload = {
        nip: values.nip,
        name: values.nama,
        pangkat: values.pangkat,
        position: values.jabatan,
        function_area: values.fungsi_bidang || null,
        phone_number: values.phone_number || null,
      };

      const response = mode === 'create'
        ? await apiFetch(endpoint, { method: 'POST', body: JSON.stringify(payload) })
        : await apiFetch(endpoint, { method: 'PUT', body: JSON.stringify(payload) });

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        const errMsg = errBody?.errors
          ? Object.values(errBody.errors).flat().join(', ')
          : errBody?.message || 'Gagal menyimpan data.';
        throw new Error(errMsg);
      }

      notification.success({ message: 'Berhasil disimpan', description: `${values.nama} telah ${mode === 'create' ? 'ditambahkan' : 'diperbarui'}.` });
      handleCloseModal();
      fetchEmployees();
    } catch (error) {
      notification.error({ message: 'Gagal menyimpan', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (record) => {
    modal.confirm({
      title: 'Hapus Pegawai?',
      content: `Apakah anda yakin ingin menghapus ${record.nama}?`,
      okText: 'Hapus',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const response = await apiFetch(`/employees/${record.id}`, { method: 'DELETE' });
          if (!response.ok) throw new Error('Gagal menghapus.');
          notification.success({ message: 'Terhapus', description: `${record.nama} telah dihapus.` });
          fetchEmployees();
        } catch (error) {
          notification.error({ message: 'Gagal menghapus', description: error.message });
        }
      }
    });
  };

  // --- Render Components ---

  const columns = [
    {
      title: 'Pegawai',
      key: 'name',
      width: 250,
      fixed: 'left',
      render: (_, record) => (
        <Space>
          <Avatar shape="square" size="large" icon={<UserOutlined />} src={record.avatarUrl} style={{ backgroundColor: '#1890ff' }} />
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{record.nama}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>{record.nip}</Typography.Text>
          </Space>
        </Space>
      )
    },
    {
      title: 'Jabatan & Pangkat',
      key: 'jabatan',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Tag color="geekblue">{record.jabatan}</Tag>
          <Typography.Text style={{ fontSize: 12 }}>{record.pangkat}</Typography.Text>
        </Space>
      )
    },
    {
      title: 'Unit Kerja',
      dataIndex: 'fungsiBidang',
      key: 'fungsiBidang',
      render: (text) => text ? <Badge status="processing" text={text} /> : <Typography.Text type="secondary">-</Typography.Text>
    },
    {
      title: 'Kontak',
      dataIndex: 'phone',
      key: 'phone',
      render: (text) => text ? <Space><PhoneOutlined /> {text}</Space> : '-'
    },
    {
      title: 'Aksi',
      key: 'aksi',
      align: 'center',
      fixed: 'right',
      width: 80,
      render: (_, record) => {
        const items = [
          {
            key: 'edit',
            label: 'Edit',
            icon: <EditOutlined style={{ color: '#faad14' }} />,
            onClick: () => handleEdit(record)
          },
          {
            key: 'delete',
            label: 'Hapus',
            danger: true,
            icon: <DeleteOutlined />,
            onClick: () => handleDelete(record)
          }
        ];
        return (
          <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        );
      }
    }
  ];

  return (
    <div className="module-section">
      {/* Header & Stats */}
      <div className="module-toolbar">
        <div>
          <Typography.Title level={3} className="module-title">Data Pegawai</Typography.Title>
          <Typography.Text className="module-subtitle">Kelola database pegawai, kepangkatan, dan unit kerja.</Typography.Text>
        </div>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={() => window.open('/api/employees/template', '_blank')}>Template</Button>
          <Button icon={<UploadOutlined />} onClick={() => setImportModalOpen(true)}>Impor</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>Tambah Pegawai</Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <StatisticCard title="Total Pegawai" value={stats.total} icon={<TeamOutlined />} color="#1890ff" />
        </Col>
        <Col xs={24} sm={8}>
          <StatisticCard title="Pegawai Aktif (Unit)" value={stats.withFunction} icon={<BankOutlined />} color="#52c41a" />
        </Col>
      </Row>

      {/* Toolbar & Filters */}
      <Card variant="borderless" style={{ borderRadius: 8 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', marginBottom: 16 }}>
          <Space wrap>
            <Input
              placeholder="Cari Nama, NIP, Jabatan..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              style={{ width: 250 }}
              allowClear
              onChange={e => setSearchTerm(e.target.value)}
            />
            <Select
              placeholder="Filter Unit Kerja"
              style={{ width: 200 }}
              allowClear
              onChange={setFilterFungsi}
              defaultValue="all"
              options={[
                { value: 'all', label: 'Semua Unit Kerja' },
                ...uniqueFungsi.map(f => ({ value: f, label: f }))
              ]}
            />
          </Space>

          <Radio.Group value={viewMode} onChange={e => setViewMode(e.target.value)} buttonStyle="solid">
            <Radio.Button value="table"><BarsOutlined /></Radio.Button>
            <Radio.Button value="grid"><AppstoreOutlined /></Radio.Button>
          </Radio.Group>
        </div>

        {viewMode === 'table' ? (
          <Table
            columns={columns}
            dataSource={filteredData}
            rowKey="id"
            loading={loading}
            scroll={{ x: 800 }}
            pagination={{ pageSize: 10, showSizeChanger: true }}
          />
        ) : (
          <List
            grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4, xl: 4 }}
            dataSource={filteredData}
            loading={loading}
            pagination={{ pageSize: 12 }}
            renderItem={item => (
              <List.Item>
                <Card
                  hoverable
                  actions={[
                    <Dropdown
                      key="actions"
                      menu={{
                        items: [
                          {
                            key: 'edit',
                            label: 'Edit',
                            icon: <EditOutlined style={{ color: '#faad14' }} />,
                            onClick: () => handleEdit(item)
                          },
                          {
                            key: 'delete',
                            label: 'Hapus',
                            danger: true,
                            icon: <DeleteOutlined />,
                            onClick: () => handleDelete(item)
                          }
                        ]
                      }}
                      trigger={['click']}
                      placement="bottomRight"
                    >
                      <Button type="text" icon={<MoreOutlined />} style={{ border: 'none', background: 'transparent' }} />
                    </Dropdown>
                  ]}
                >
                  <Card.Meta
                    avatar={<Avatar shape="square" size={54} icon={<UserOutlined />} src={item.avatarUrl} style={{ backgroundColor: '#1890ff' }} />}
                    title={<Typography.Text strong ellipsis={{ tooltip: item.nama }}>{item.nama}</Typography.Text>}
                    description={
                      <Space direction="vertical" size={1} style={{ width: '100%' }}>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>{item.nip}</Typography.Text>
                        <Tag color="geekblue" style={{ margin: '4px 0', width: 'fit-content' }}>{item.jabatan}</Tag>
                        <div style={{ fontSize: 12 }}><BankOutlined /> {item.fungsiBidang || '-'}</div>
                      </Space>
                    }
                  />
                </Card>
              </List.Item>
            )}
          />
        )}
      </Card>

      <Modal
        title={mode === 'create' ? 'Tambah Pegawai Baru' : 'Edit Data Pegawai'}
        open={modalOpen}
        onCancel={handleCloseModal}
        onOk={() => form.submit()}
        okText="Simpan"
        cancelText="Batal"
        confirmLoading={saving}
        width={600}
        afterOpenChange={handleModalOpenChange}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={persistEmployee}
          requiredMark={false}
          style={{ marginTop: 16 }}
        >
          <Tabs
            defaultActiveKey="1"
            items={[
              {
                key: '1',
                label: 'Data Diri',
                forceRender: true,
                children: (
                  <>
                    {mode === 'edit' ? (
                      <Row gutter={24} align="middle" style={{ marginBottom: 16 }}>
                        <Col xs={24} sm={8} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          <Typography.Text type="secondary" style={{ fontSize: 12, marginBottom: 8, fontWeight: 500 }}>
                            Foto Pegawai
                          </Typography.Text>
                          <div style={{ position: 'relative', width: 96, height: 96 }}>
                            <Avatar
                              size={96}
                              src={activeEmployee?.avatarUrl}
                              style={{
                                border: '2px solid #e2e8f0',
                                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
                                backgroundColor: '#8b5cf6',
                                color: '#fff',
                                fontSize: 40,
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              {(!activeEmployee?.avatarUrl && activeEmployee?.nama) ? activeEmployee.nama.charAt(0).toUpperCase() : ''}
                            </Avatar>
                            {uploadingPhoto && (
                              <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'rgba(255, 255, 255, 0.7)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 10
                              }}>
                                <Spin size="small" />
                              </div>
                            )}
                          </div>
                          <Upload {...employeeUploadProps} showUploadList={false}>
                            <Button
                              icon={<CameraOutlined />}
                              loading={uploadingPhoto}
                              style={{
                                marginTop: 12,
                                borderRadius: 8,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6
                              }}
                            >
                              Upload
                            </Button>
                          </Upload>
                        </Col>
                        <Col xs={24} sm={16}>
                          <Form.Item name="nip" label="NIP" rules={[{ required: true, message: 'NIP wajib diisi' }, { pattern: /^\d{18}$/, message: 'Harus 18 digit angka' }]}>
                            <Input maxLength={18} placeholder="19xxxxxxxxxxxxxxxx" />
                          </Form.Item>
                          <Form.Item name="nama" label="Nama Lengkap" rules={[{ required: true, message: 'Nama wajib diisi' }]}>
                            <Input placeholder="Nama beserta gelar" />
                          </Form.Item>
                          <Form.Item name="phone_number" label="Nomor Telepon/HP">
                            <Input placeholder="08..." />
                          </Form.Item>
                        </Col>
                      </Row>
                    ) : (
                      <>
                        <div style={{ background: '#f8fafc', padding: '8px 16px', borderRadius: 8, marginBottom: 16, border: '1px solid #f1f5f9' }}>
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            💡 Foto pegawai dapat diunggah setelah data pegawai baru disimpan.
                          </Typography.Text>
                        </div>
                        <Form.Item name="nip" label="NIP" rules={[{ required: true, message: 'NIP wajib diisi' }, { pattern: /^\d{18}$/, message: 'Harus 18 digit angka' }]}>
                          <Input maxLength={18} placeholder="19xxxxxxxxxxxxxxxx" />
                        </Form.Item>
                        <Form.Item name="nama" label="Nama Lengkap" rules={[{ required: true, message: 'Nama wajib diisi' }]}>
                          <Input placeholder="Nama beserta gelar" />
                        </Form.Item>
                        <Form.Item name="phone_number" label="Nomor Telepon/HP">
                          <Input placeholder="08..." />
                        </Form.Item>
                      </>
                    )}
                  </>
                )
              },
              {
                key: '2',
                label: 'Kepegawaian',
                forceRender: true,
                children: (
                  <>
                    <Form.Item name="pangkat" label="Pangkat / Golongan" rules={[{ required: true, message: 'Pangkat wajib diisi' }]}>
                      <Input placeholder="Contoh: Penata Muda (III/a)" />
                    </Form.Item>
                    <Form.Item name="jabatan" label="Jabatan" rules={[{ required: true, message: 'Jabatan wajib diisi' }]}>
                      <Input placeholder="Contoh: Pranata Komputer" />
                    </Form.Item>
                    <Form.Item name="fungsi_bidang" label="Unit Kerja / Fungsi">
                      <Select
                        allowClear
                        showSearch
                        placeholder="Pilih unit kerja"
                        options={[
                          { value: 'Tata Usaha', label: 'Tata Usaha' },
                          { value: 'Pemeriksaan dan Sertifikasi', label: 'Pemeriksaan dan Sertifikasi' },
                          { value: 'Infokom', label: 'Infokom' },
                          { value: 'Penindakan', label: 'Penindakan' },
                          { value: 'Pengujian', label: 'Pengujian' },
                        ]}
                      />
                    </Form.Item>
                  </>
                )
              },
              {
                key: '3',
                label: 'Riwayat KGB',
                disabled: mode === 'create',
                children: (
                  <List
                    size="small"
                    dataSource={activeEmployee?.kgbHistory || []}
                    renderItem={kgb => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={<SafetyCertificateOutlined style={{ color: '#52c41a', fontSize: 20 }} />}
                          title={`SK No: ${kgb.nomorSk}`}
                          description={`TMT: ${kgb.tmtSk} • Masa Kerja: ${kgb.lamaKerja} Tahun`}
                        />
                      </List.Item>
                    )}
                    locale={{ emptyText: 'Belum ada riwayat KGB tercatat' }}
                  />
                )
              }
            ]}
          />
        </Form>
      </Modal>

      {/* ═══ Import Modal ═══ */}
      <Modal
        title="Impor Data Pegawai"
        open={importModalOpen}
        onCancel={() => setImportModalOpen(false)}
        footer={null}
        width={440}
      >
        <Space direction="vertical" style={{ width: '100%', marginTop: 8 }}>
          <Typography.Paragraph>
            Unggah file Excel (.xlsx) sesuai template untuk menambahkan banyak data sekaligus.
          </Typography.Paragraph>
          <Upload
            name="file"
            action="/api/employees/import"
            headers={{ Authorization: `Bearer ${token}` }}
            onChange={(info) => {
              if (info.file.status === 'done') {
                notification.success({ message: 'Impor Berhasil' });
                setImportModalOpen(false);
                fetchEmployees();
              } else if (info.file.status === 'error') {
                notification.error({ message: 'Impor Gagal' });
              }
            }}
          >
            <Button block icon={<UploadOutlined />}>Pilih File Excel</Button>
          </Upload>
        </Space>
      </Modal>
    </div>
  );
};

export default DataPegawai;
