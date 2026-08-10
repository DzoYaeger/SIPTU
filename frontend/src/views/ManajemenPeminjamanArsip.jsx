import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  App as AntdApp,
  Button,
  Card,
  Col,
  DatePicker,
  Drawer,
  Empty,
  Form,
  Input,
  Row,
  Select,
  Space,
  Statistic,
  Steps,
  Table,
  Tag,
  Tooltip,
  Typography,
  Divider,
  Timeline,
  Alert,
  Modal,
  QRCode,
  Descriptions,
  Dropdown,
} from 'antd';
import { buildMessageAdapter } from '../utils/notify.js';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  LinkOutlined,
  PlusOutlined,
  RollbackOutlined,
  SearchOutlined,
  SignatureOutlined,
  UserOutlined,
  HistoryOutlined,
  CalendarOutlined,
  InboxOutlined,
  SafetyCertificateOutlined,
  LockOutlined,
  InfoCircleOutlined,
  PrinterOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { useArchiveLoans } from '../hooks/useArchiveLoans';
import { useAuth } from '../hooks/useAuth';
import SignatureModal from '../components/SignatureModal';
import StatisticCard from '../components/StatisticCard';
import dayjs from 'dayjs';

// const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

const ManajemenPeminjamanArsip = () => {
  const { modal, message } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);
  const [form] = Form.useForm();
  const { user, apiFetch } = useAuth();
  const isAdmin = user?.base_role === 'admin';
  const canSignAsAdmin = user?.base_role === 'admin' || user?.base_role === 'validator';
  const { loans, loading, fetchLoans, addLoan, deleteLoan, saveSignature } = useArchiveLoans();

  // State
  const [passwordModal, setPasswordModal] = useState({ open: false, loanId: null, type: '', role: '' });
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [isSignatureSaving, setIsSignatureSaving] = useState(false);

  // Data State
  const [employees, setEmployees] = useState([]);
  const [archiveUnits, setArchiveUnits] = useState([]);
  const [kearsipanUnitIds, setKearsipanUnitIds] = useState([]);

  // Drawer/Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false); // for create mode
  const [drawerMode, setDrawerMode] = useState('create'); // 'create'
  const [activeLoan, setActiveLoan] = useState(null);
  const [saving, setSaving] = useState(false);

  // --- API ---

  const refreshLoans = useCallback(() => fetchLoans(), [fetchLoans]);

  const fetchData = useCallback(async () => {
    try {
      const [empRes, unitRes] = await Promise.all([
        apiFetch('/employees'),
        apiFetch('/archive-units')
      ]);

      if (empRes.ok) {
        const empData = await empRes.json().catch(() => null);
        setEmployees(Array.isArray(empData) ? empData : (empData?.data ?? []));
      }
      if (unitRes.ok) {
        const data = await unitRes.json().catch(() => null);
        if (Array.isArray(data)) {
          setArchiveUnits(data);
          setKearsipanUnitIds([]);
        } else {
          setArchiveUnits(data?.units ?? data?.data ?? []);
          setKearsipanUnitIds(data?.unit_kearsipan_employee_ids ?? []);
        }
      }
    } catch (e) {
      notification.error({ message: 'Gagal memuat data referensi' });
    }
  }, [apiFetch, notification]);

  useEffect(() => {
    refreshLoans();
    fetchData();
  }, [refreshLoans, fetchData]);

  // --- Stats ---

  const stats = useMemo(() => ({
    total: loans.length,
    active: loans.filter(l => l.status === 'dipinjam').length,
    pending: loans.filter(l => l.status === 'menunggu_paraf').length,
    returning: loans.filter(l => l.status === 'menunggu_paraf_kembali').length,
  }), [loans]);

  // --- Actions ---

  const handleOpenCreate = () => {
    setDrawerMode('create');
    setActiveLoan(null);
    form.resetFields();

    // Auto-fill active user if possible
    if (user?.employee?.id) {
      form.setFieldsValue({ borrower_employee_id: user.employee.id });
      handleBorrowerChange(user.employee.id);
    }

    setDrawerOpen(true);
  };

  const handleOpenDetail = (loan) => {
    setActiveLoan(loan);
    setDetailModalOpen(true);
  };

  const handleDelete = (loanId) => {
    modal.confirm({
      title: 'Hapus Peminjaman?',
      content: 'Data yang dihapus tidak dapat dikembalikan.',
      okButtonProps: { danger: true },
      onOk: async () => {
        if (await deleteLoan(loanId)) {
          refreshLoans();
          if (activeLoan?.id === loanId) setDrawerOpen(false);
        }
      }
    });
  };

  const handleSaveLoan = async () => {
    try {
      const values = await form.validateFields();
      const selectedEmp = employees.find(e => e.id === values.borrower_employee_id);
      const selectedUnit = archiveUnits.find(u => u.id === values.archive_unit_id);

      const payload = {
        borrow_date: values.borrow_date?.format('YYYY-MM-DD'),
        borrower_employee_id: values.borrower_employee_id,
        borrower_name: selectedEmp?.nama,
        borrower_nip: selectedEmp?.nip,
        borrower_work_unit: selectedEmp?.fungsi_bidang,
        archive_unit_id: values.archive_unit_id,
        archive_number: values.archive_number,
        archive_format: values.archive_format,
        document_type: values.document_type,
        purpose: values.purpose,
        unit_pengolah: selectedUnit
      };

      setSaving(true);
      if (await addLoan(payload)) {
        refreshLoans();
        setDrawerOpen(false);
        notification.success({ message: 'Permintaan peminjaman dibuat' });
      }
    } catch (error) {
      // Validation failed
    } finally {
      setSaving(false);
    }
  };

  const handleSignature = (loan, type, role) => {
    setPasswordModal({ open: true, loanId: loan.id, type, role });
  };

  const handleSignatureSave = async () => {
    if (!password) {
      notification.error({ message: 'Masukkan password untuk verifikasi.' });
      return;
    }
    setIsSignatureSaving(true);
    const { loanId, type, role } = passwordModal;
    if (await saveSignature(loanId, { password, totp_code: totpCode, type, role })) {
      refreshLoans();
      setPasswordModal({ open: false, loanId: null, type: '', role: '' });
      setPassword('');
      setTotpCode('');
    }
    setIsSignatureSaving(false);
  };

  // --- Helpers ---

  const handleBorrowerChange = (id) => {
    const emp = employees.find(e => e.id === id);
    form.setFieldsValue({ borrower_work_unit: emp?.fungsi_bidang || '-' });
  };

  // --- Renderers ---

  const columns = [
    {
      title: 'Arsip',
      key: 'archive',
      render: (_, r) => (
        <Space align="start">
          <div style={{ width: 40, height: 40, background: '#e6f7ff', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1890ff' }}>
            <FileTextOutlined style={{ fontSize: 18 }} />
          </div>
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{r.archive_number}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{r.unit_pengolah?.nama || 'Unit Tidak Diketahui'}</Typography.Text>
          </Space>
        </Space>
      )
    },
    {
      title: 'Peminjam',
      key: 'borrower',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>{r.borrower_name}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{r.borrower_work_unit}</Typography.Text>
        </Space>
      )
    },
    {
      title: 'Tanggal',
      key: 'dates',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Space size={4}><CalendarOutlined /> Pinjam: {dayjs(r.borrow_date).format('DD MMM YYYY')}</Space>
          {r.return_date && <Space size={4}><ClockCircleOutlined /> Kembali: {dayjs(r.return_date).format('DD MMM YYYY')}</Space>}
        </Space>
      )
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, r) => {
        let color = 'default';
        let icon = <ClockCircleOutlined />;
        let text = r.status;

        if (r.status === 'menunggu_paraf') { color = 'orange'; text = 'Validasi Peminjaman'; }
        if (r.status === 'dipinjam') { color = 'blue'; text = 'Sedang Dipinjam'; icon = <FileDoneOutlined />; }
        if (r.status === 'menunggu_paraf_kembali') { color = 'gold'; text = 'Validasi Pengembalian'; icon = <RollbackOutlined />; }
        if (r.status === 'dikembalikan') { color = 'green'; text = 'Selesai'; icon = <CheckCircleOutlined />; }

        return <Tag color={color} icon={icon}>{text}</Tag>;
      }
    },
    {
      title: 'Aksi',
      key: 'action',
      align: 'center',
      width: 80,
      render: (_, r) => {
        const items = [
          {
            key: 'detail',
            label: 'Detail',
            icon: <EyeOutlined style={{ color: '#1890ff' }} />,
            onClick: () => handleOpenDetail(r)
          }
        ];
        if (isAdmin || canSignAsAdmin) {
          items.push({
            key: 'delete',
            label: 'Hapus',
            danger: true,
            icon: <DeleteOutlined />,
            onClick: () => handleDelete(r.id)
          });
        }
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
      {/* Header */}
      <div className="module-toolbar">
        <div>
          <Typography.Title level={4} className="module-title">Peminjaman Arsip</Typography.Title>
          <Typography.Text className="module-subtitle">Kelola sirkulasi arsip fisik dan digital.</Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>Buat Peminjaman</Button>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={6}>
          <StatisticCard title="Total Peminjaman" value={stats.total} icon={<InboxOutlined />} color="#1890ff" />
        </Col>
        <Col xs={24} sm={6}>
          <StatisticCard title="Sedang Dipinjam" value={stats.active} icon={<FileDoneOutlined />} color="#722ed1" />
        </Col>
        <Col xs={24} sm={6}>
          <StatisticCard title="Menunggu Validasi" value={stats.pending} icon={<SignatureOutlined />} color="#faad14" />
        </Col>
        <Col xs={24} sm={6}>
          <StatisticCard title="Proses Pengembalian" value={stats.returning} icon={<RollbackOutlined />} color="#13c2c2" />
        </Col>
      </Row>

      <Card variant="borderless">
        <Table
          columns={columns}
          dataSource={loans}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 800 }}
        />
      </Card>

      <Modal
        title={activeLoan ? `Detail Peminjaman: ${activeLoan.request_number}` : 'Detail Peminjaman'}
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        width={720}
        footer={[
          <Button key="close" onClick={() => setDetailModalOpen(false)}>Tutup</Button>,
          activeLoan?.public_token ? (
            <Button 
              key="print" 
              type="primary" 
              icon={<PrinterOutlined />}
              onClick={() => window.open(`${import.meta.env.VITE_API_URL}/public/archive-loans/${activeLoan.public_token}/pdf`, '_blank')}
            >
              Cetak Bukti (PDF)
            </Button>
          ) : null
        ].filter(Boolean)}
      >
        {activeLoan && (
          <Space direction="vertical" size="large" style={{ width: '100%', paddingTop: 16 }}>
            {/* Status Tag */}
            <div style={{ textAlign: 'center' }}>
              <Tag color={
                activeLoan.status === 'menunggu_paraf' ? 'orange' :
                activeLoan.status === 'dipinjam' ? 'blue' :
                activeLoan.status === 'menunggu_paraf_kembali' ? 'gold' : 'green'
              } style={{ fontSize: 14, padding: '4px 12px' }}>
                {activeLoan.status === 'menunggu_paraf' ? 'Validasi Peminjaman' :
                 activeLoan.status === 'dipinjam' ? 'Sedang Dipinjam' :
                 activeLoan.status === 'menunggu_paraf_kembali' ? 'Validasi Pengembalian' : 'Selesai'}
              </Tag>
            </div>

            {/* Status Steps */}
            <Steps
              size="small"
              current={
                activeLoan.status === 'menunggu_paraf' ? 0 :
                activeLoan.status === 'dipinjam' ? 1 :
                activeLoan.status === 'menunggu_paraf_kembali' ? 2 : 3
              }
            >
              <Steps.Step title="Validasi" description="Peminjaman" />
              <Steps.Step title="Dipinjam" description={dayjs(activeLoan.borrow_date).format('DD MMM')} />
              <Steps.Step title="Kembali" description="Pengembalian" />
              <Steps.Step title="Selesai" description={activeLoan.return_date ? dayjs(activeLoan.return_date).format('DD MMM') : '-'} />
            </Steps>

            <Divider orientation="left">Tindakan Diperlukan</Divider>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {activeLoan.status === 'menunggu_paraf' && canSignAsAdmin && (
                <Button type="primary" icon={<SafetyCertificateOutlined />} onClick={() => handleSignature(activeLoan, 'borrowing', 'admin')}>
                  Setujui & Tanda Tangan (Admin)
                </Button>
              )}
              {activeLoan.status === 'dipinjam' && canSignAsAdmin && (
                <Button type="primary" icon={<RollbackOutlined />} onClick={() => handleSignature(activeLoan, 'returning', 'admin')}>
                  Proses Pengembalian
                </Button>
              )}
              {activeLoan.status === 'menunggu_paraf_kembali' && canSignAsAdmin && (
                <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => handleSignature(activeLoan, 'returning', 'admin')}>
                  Validasi Pengembalian (Admin)
                </Button>
              )}
              <Button danger icon={<DeleteOutlined />} onClick={() => handleDelete(activeLoan.id)}>Hapus</Button>
            </div>

            <Divider orientation="left">Detail Arsip</Divider>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Nomor Arsip" span={2}><strong>{activeLoan.archive_number}</strong></Descriptions.Item>
              <Descriptions.Item label="Format">{activeLoan.archive_format}</Descriptions.Item>
              <Descriptions.Item label="Jenis">{activeLoan.document_type}</Descriptions.Item>
              <Descriptions.Item label="Unit Pengolah" span={2}>{activeLoan.unit_pengolah?.nama}</Descriptions.Item>
              <Descriptions.Item label="Tujuan" span={2}>{activeLoan.purpose}</Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">Detail Peminjam</Divider>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Nama">{activeLoan.borrower_name}</Descriptions.Item>
              <Descriptions.Item label="NIP">{activeLoan.borrower_nip ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="Unit Kerja">{activeLoan.borrower_work_unit ?? '-'}</Descriptions.Item>
            </Descriptions>

            {activeLoan.signature_token && (
              <div style={{ 
                marginTop: 24, 
                padding: 16, 
                background: '#f8fafc', 
                borderRadius: 12, 
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: 20
              }}>
                <QRCode value={`${window.location.origin}/verify/${activeLoan.signature_token}`} size={100} bordered={false} color="#1e293b" />
                <div>
                  <Typography.Text strong style={{ display: 'block', fontSize: 14 }}>Dokumen Terverifikasi TTE</Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Tanda tangan elektronik telah divalidasi oleh sistem SIPTU Digital Signature.
                  </Typography.Text>
                </div>
              </div>
            )}
          </Space>
        )}
      </Modal>

      {/* Drawer for Create Only */}
      <Drawer
        title="Buat Peminjaman Baru"
        width={500}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        extra={
          <Button type="primary" onClick={handleSaveLoan} loading={saving}>Simpan Permohonan</Button>
        }
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item name="borrower_employee_id" label="Peminjam" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Cari Pegawai..."
              options={(employees || []).map(e => ({ label: `${e.nama} (${e.nip})`, value: e.id }))}
              onChange={handleBorrowerChange}
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
          <Form.Item name="borrower_work_unit" label="Unit Kerja">
            <Input disabled />
          </Form.Item>
          <Divider />
          <Form.Item name="archive_unit_id" label="Unit Pengolah Arsip" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Pilih Unit Arsip..."
              options={(archiveUnits || []).map(u => ({ label: u.nama, value: u.id }))}
            />
          </Form.Item>
          <Form.Item name="archive_number" label="Nomor Arsip / Berkas" rules={[{ required: true }]}>
            <Input placeholder="Contoh: 005/KP.01/2024" />
          </Form.Item>
          <Form.Item name="archive_format" label="Format Arsip" rules={[{ required: true }]}>
            <Select placeholder="Pilih format arsip">
              <Select.Option value="Konvensional">Konvensional</Select.Option>
              <Select.Option value="Elektronik">Elektronik</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="document_type" label="Jenis Naskah Dinas" rules={[{ required: true }]}>
            <Select placeholder="Pilih jenis naskah">
              <Select.Option value="Surat Dinas">Surat Dinas</Select.Option>
              <Select.Option value="Nota Dinas">Nota Dinas</Select.Option>
              <Select.Option value="Surat Perintah">Surat Perintah</Select.Option>
              <Select.Option value="Berita Acara">Berita Acara</Select.Option>
              <Select.Option value="Laporan">Laporan</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="purpose" label="Tujuan Peminjaman" rules={[{ required: true }]}>
            <Input.TextArea placeholder="Masukkan tujuan peminjaman" autoSize={{ minRows: 2 }} />
          </Form.Item>
          <Form.Item name="borrow_date" label="Tanggal Peminjaman" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Drawer>

      <Modal
        title={<><SafetyCertificateOutlined /> Verifikasi TTE (Digital Signature)</>}
        open={passwordModal.open}
        onCancel={() => {
          setPasswordModal({ open: false, loanId: null, type: '', role: '' });
          setPassword('');
          setTotpCode('');
        }}
        onOk={handleSignatureSave}
        confirmLoading={isSignatureSaving}
        okText="Verifikasi & Setujui"
        centered
        destroyOnClose
      >
        <div style={{ marginBottom: 16 }}>
          <Typography.Paragraph>
            Masukkan password SIPTU dan 6 digit kode MFA (jika akun mengaktifkan MFA) untuk melakukan validasi peminjaman/pengembalian secara digital.
          </Typography.Paragraph>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ minHeight: 32, display: 'flex', alignItems: 'flex-end', marginBottom: 6 }}>
                <Typography.Text strong style={{ fontSize: 12, color: '#334155' }}>Password SIPTU:</Typography.Text>
              </div>
              <Input.Password
                prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                size="large"
                style={{ borderRadius: 6 }}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ minHeight: 32, display: 'flex', alignItems: 'flex-end', marginBottom: 6 }}>
                <Typography.Text strong style={{ fontSize: 12, color: '#334155' }}>Kode MFA Authenticator / Recovery:</Typography.Text>
              </div>
              <Input
                prefix={<LockOutlined style={{ color: '#0b56a4' }} />}
                placeholder="Contoh: 123456"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                size="large"
                onPressEnter={handleSignatureSave}
                style={{ borderRadius: 6, fontWeight: 700, letterSpacing: '1px' }}
              />
            </div>
          </div>
        </div>
        <Alert
          message="Pernyataan"
          description="Dengan memasukkan password dan verifikasi MFA, saya menyatakan telah memverifikasi data ini dan memberikan persetujuan resmi melalui sistem SIPTU."
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
        />
      </Modal>
    </div>
  );
};

export default ManajemenPeminjamanArsip;
