import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  App as AntdApp,
  Button,
  Input,
  Space,
  Table,
  Tag,
  Tooltip,
  Modal,
  Descriptions,
  Divider,
  Card,
  Typography,
  Tabs,
  Row,
  Col,
  Checkbox,
  Statistic,
  Avatar,
  Empty,
  Badge,
  Spin,
  Dropdown,
} from 'antd';
import { buildMessageAdapter } from '../utils/notify.js';
import {
  EyeOutlined,
  PlusOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  RollbackOutlined,
  SearchOutlined,
  CalendarOutlined,
  UserOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  DropboxOutlined,
  DownloadOutlined,
  MoreOutlined
} from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth.js';
import StatisticCard from '../components/StatisticCard.jsx';
import dayjs from 'dayjs';
import 'dayjs/locale/id';

dayjs.locale('id');

const normalizeLoan = (item) => ({
  id: item.id,
  key: item.id,
  token: item.token,
  spaNumber: item.spa_number,
  borrowerName: item.borrower_name,
  borrowerNip: item.borrower_nip,
  borrowerFunction: item.borrower_function,
  borrowerPhone: item.borrower_phone,
  loan_date: item.loan_date,
  return_date: item.return_date,
  status: item.status,
  assets: item.assets || [],
  notes: item.notes,
  requesterSignature: item.requester_signature,
  validatorSignature: item.validator_signature,
  requester_signature_token: item.requester_signature_token,
  validator_signature_token: item.validator_signature_token,
  location: item.location,
  validatorName: item.validator?.name,
  created_at: item.created_at,
  isVehicle: item.is_vehicle,
  kondisiBarangPinjam: item.kondisi_barang_pinjam,
  kondisiKendaraanPinjam: item.kondisi_kendaraan_pinjam,
  kondisiBarangKembali: item.kondisi_barang_kembali,
  kondisiKendaraanKembali: item.kondisi_kendaraan_kembali,
});

const statusMap = {
  pengajuan: { color: 'blue', text: 'Menunggu Persetujuan', icon: <ClockCircleOutlined /> },
  dipinjam: { color: 'orange', text: 'Sedang Dipinjam', icon: <DropboxOutlined /> },
  'pengajuan-pengembalian': { color: 'purple', text: 'Pengajuan Kembali', icon: <RollbackOutlined /> },
  dikembalikan: { color: 'green', text: 'Selesai / Dikembalikan', icon: <CheckCircleOutlined /> },
  ditolak: { color: 'red', text: 'Ditolak', icon: <CheckCircleOutlined /> },
};

const vehicleChecklistDefaults = {
  bbm: '',
  oli: true,
  minyak_rem: true,
  ban: true,
  air_radiator: true,
  air_aki: true,
};

const buildVehiclePayload = (state) => ({
  bbm: state.bbm ?? '',
  oli: state.oli ? 'Baik' : 'Tidak Baik',
  minyak_rem: state.minyak_rem ? 'Baik' : 'Tidak Baik',
  ban: state.ban ? 'Baik' : 'Tidak Baik',
  air_radiator: state.air_radiator ? 'Baik' : 'Tidak Baik',
  air_aki: state.air_aki ? 'Baik' : 'Tidak Baik',
});

const BmnPeminjamanAset = () => {
  const { apiFetch, currentRole } = useAuth();
  const { modal, message } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);
  const [password, setPassword] = useState('');

  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [returning, setReturning] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);

  const [approvalStep, setApprovalStep] = useState(1);
  const [isVehicle, setIsVehicle] = useState(null);
  const [kondisiPinjam, setKondisiPinjam] = useState('Baik');
  const [kendaraanPinjam, setKendaraanPinjam] = useState(vehicleChecklistDefaults);

  const [kondisiKembali, setKondisiKembali] = useState('Baik');
  const [kendaraanKembali, setKendaraanKembali] = useState(vehicleChecklistDefaults);

  const requestJson = useCallback(async (url, options = {}) => {
    const response = await apiFetch(url, {
      headers: { Accept: 'application/json', ...(options.headers ?? {}) },
      ...options,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 404) return [];
      throw new Error(data?.message ?? 'Terjadi kesalahan pada server.');
    }
    return data;
  }, [apiFetch]);

  const fetchLoans = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await requestJson('/bmn-loans');
      const sorted = (payload ?? []).map(normalizeLoan).sort((a, b) => new Date(b.created_at || b.loan_date) - new Date(a.created_at || a.loan_date));
      setLoans(sorted);
    } catch (error) {
      notification.error({ message: 'Gagal memuat data', description: error.message });
    } finally {
      setLoading(false);
    }
  }, [requestJson, notification]);

  useEffect(() => { fetchLoans(); }, [fetchLoans]);

  const stats = useMemo(() => {
    return {
      total: loans.length,
      pending: loans.filter(l => l.status === 'pengajuan').length,
      active: loans.filter(l => l.status === 'dipinjam').length,
      completed: loans.filter(l => l.status === 'dikembalikan').length,
    };
  }, [loans]);

  const handleViewDetail = (record) => { setSelectedLoan(record); setDetailDrawerOpen(true); };
  const handleCloseDetail = () => { setDetailDrawerOpen(false); setSelectedLoan(null); };

  const handleOpenApproval = () => {
    setDetailDrawerOpen(false);
    setApprovalStep(1);
    setIsVehicle(null);
    setKondisiPinjam('Baik');
    setKendaraanPinjam(vehicleChecklistDefaults);
    setPassword('');
    setApprovalModalOpen(true);
  };

  const handleCloseApproval = () => {
    setApprovalModalOpen(false);
    if (!detailDrawerOpen) setSelectedLoan(null);
  };

  const handleApprove = async () => {
    if (approvalStep === 1) {
      if (isVehicle === null) { notification.warning({ message: 'Pilih tipe aset terlebih dahulu.' }); return; }
      setApprovalStep(2);
      return;
    }
    try {
      if (!password) {
        notification.error({ message: 'Password SIPTU wajib diisi untuk verifikasi TTE.' });
        return;
      }
      setApproving(true);
      await requestJson(`/bmn-loans/${selectedLoan.id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: password,
          is_vehicle: isVehicle,
          kondisi_barang_pinjam: kondisiPinjam,
          kondisi_kendaraan_pinjam: isVehicle ? buildVehiclePayload(kendaraanPinjam) : null,
        }),
      });
      notification.success({ message: 'Peminjaman disetujui', description: `SPA ${selectedLoan.spaNumber} telah disetujui.` });
      handleCloseApproval();
      fetchLoans();
    } catch (error) {
      notification.error({ message: 'Gagal menyetujui', description: error.message });
    } finally {
      setApproving(false);
    }
  };

  const handleOpenReturn = () => {
    setDetailDrawerOpen(false);
    setKondisiKembali('Baik');
    setKendaraanKembali(vehicleChecklistDefaults);
    setReturnModalOpen(true);
  };

  const handleReturn = async () => {
    try {
      setReturning(true);
      await requestJson(`/bmn-loans/${selectedLoan.id}/return`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kondisi_barang_kembali: kondisiKembali,
          kondisi_kendaraan_kembali: selectedLoan.isVehicle ? buildVehiclePayload(kendaraanKembali) : null,
        }),
      });
      notification.success({ message: 'Peminjaman selesai.' });
      setReturnModalOpen(false);
      setSelectedLoan(null);
      fetchLoans();
    } catch (error) {
      notification.error({ message: 'Gagal memproses', description: error.message });
    } finally {
      setReturning(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      notification.warning({ message: 'Alasan penolakan harus diisi.'});
      return;
    }
    try {
      setRejecting(true);
      await requestJson(`/bmn-loans/${selectedLoan.id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      notification.success({ message: 'Permohonan ditolak.' });
      setRejectModalOpen(false);
      setDetailDrawerOpen(false);
      fetchLoans();
    } catch (error) {
      notification.error({ message: 'Gagal menolak', description: error.message });
    } finally {
      setRejecting(false);
    }
  };

  const handleDelete = (record) => {
    modal.confirm({
      title: 'Hapus Data Peminjaman?',
      content: `Yakin ingin menghapus peminjaman ${record.spaNumber}? Semua aset terkait akan kembali berstatus tersedia.`,
      okText: 'Ya, Hapus',
      cancelText: 'Batal',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await requestJson(`/bmn-loans/${record.id}`, { method: 'DELETE' });
          notification.success({ message: 'Data dihapus' });
          fetchLoans();
        } catch (error) {
          notification.error({ message: 'Gagal menghapus', description: error.message });
        }
      }
    });
  };

  const filteredData = useMemo(() => {
    let data = loans;
    if (statusFilter !== 'all') {
      data = data.filter(l => l.status === statusFilter);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(l =>
        l.spaNumber?.toLowerCase().includes(term) ||
        l.borrowerName?.toLowerCase().includes(term) ||
        l.borrowerNip?.includes(term)
      );
    }
    return data;
  }, [loans, searchTerm, statusFilter]);

  const columns = [
    {
      title: 'Informasi Peminjaman',
      key: 'info',
      width: 250,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Typography.Text strong copyable={{ text: record.spaNumber }}>{record.spaNumber}</Typography.Text>
          <Space size={4}>
            <CalendarOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {dayjs(record.loan_date).format('D MMM YYYY')}
            </Typography.Text>
          </Space>
        </Space>
      )
    },
    {
      title: 'Peminjam',
      key: 'borrower',
      width: 220,
      render: (_, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#fde3cf', color: '#f56a00' }} />
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{record.borrowerName}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{record.borrowerNip || '-'}</Typography.Text>
          </Space>
        </Space>
      )
    },
    {
      title: 'Aset',
      key: 'assets',
      width: 220,
      render: (_, record) => {
        const count = record.assets?.length || 0;
        const firstAsset = record.assets?.[0]?.nama_barang || 'Tidak ada item';
        return (
          <Tooltip title={record.assets?.map(a => a.nama_barang).join(', ')}>
            <Badge count={count} style={{ backgroundColor: '#108ee9' }}>
              <Card size="small" style={{ fontSize: 12, width: 200, background: '#fafafa' }} variant="borderless">
                {firstAsset} {count > 1 ? `+${count - 1} lainnya` : ''}
              </Card>
            </Badge>
          </Tooltip>
        );
      }
    },
    {
      title: 'Status',
      key: 'status',
      width: 150,
      render: (_, record) => {
        const s = statusMap[record.status] || { color: 'default', text: record.status };
        return <Tag icon={s.icon} color={s.color} style={{ borderRadius: 12, padding: '2px 10px' }}>{s.text}</Tag>;
      }
    },
    {
      title: 'Aksi',
      key: 'actions',
      width: 80,
      align: 'center',
      render: (_, record) => {
        const items = [
          {
            key: 'detail',
            label: 'Detail',
            icon: <EyeOutlined style={{ color: '#1890ff' }} />,
            onClick: () => handleViewDetail(record)
          }
        ];
        if (currentRole === 'admin' || currentRole === 'validator') {
          items.push({
            key: 'delete',
            label: 'Hapus',
            danger: true,
            icon: <DeleteOutlined />,
            onClick: () => handleDelete(record)
          });
        }
        return (
          <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        );
      }
    },
  ];

  const currentStatus = selectedLoan?.status?.toLowerCase()?.trim() || '';
  const canApprove = (currentRole === 'admin' || currentRole === 'validator') && 
    ['pengajuan', 'menunggu_persetujuan', 'diajukan'].includes(currentStatus);
  const canReturn = (currentRole === 'admin' || currentRole === 'validator') && 
    (currentStatus === 'dipinjam' || currentStatus === 'pengajuan-pengembalian');

  return (
    <div className="module-section">
      <div className="module-toolbar">
        <div>
          <Typography.Title level={3} className="module-title">Peminjaman Aset</Typography.Title>
          <Typography.Text className="module-subtitle">Kelola peminjaman dan pengembalian BMN dengan mudah.</Typography.Text>
        </div>
        <Link to="/app/bmn-peminjaman-aset/new">
          <Button type="primary" icon={<PlusOutlined />}>Tambah Peminjaman</Button>
        </Link>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <StatisticCard title="Total Permohonan" value={stats.total} icon={<FileTextOutlined />} color="#1890ff" loading={loading} />
        </Col>
        <Col xs={24} sm={6}>
          <StatisticCard title="Menunggu Persetujuan" value={stats.pending} icon={<ClockCircleOutlined />} color="#faad14" loading={loading} />
        </Col>
        <Col xs={24} sm={6}>
          <StatisticCard title="Sedang Dipinjam" value={stats.active} icon={<DropboxOutlined />} color="#722ed1" loading={loading} />
        </Col>
        <Col xs={24} sm={6}>
          <StatisticCard title="Selesai Dikembalikan" value={stats.completed} icon={<CheckCircleOutlined />} color="#52c41a" loading={loading} />
        </Col>
      </Row>

      <Card
        variant="borderless"
        style={{ borderRadius: 12, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.03)' }}
        styles={{ body: { padding: '24px' } }}
      >
        <div className="data-filter-row">
          <Input.Search
            placeholder="Cari No. SPA, Nama, NIP..."
            allowClear
            size="large"
            onSearch={setSearchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ maxWidth: 400, width: '100%', borderRadius: 8 }}
          />
        </div>

        <Tabs
          defaultActiveKey="all"
          onChange={setStatusFilter}
          items={[
            { label: 'Semua Data', key: 'all' },
            { label: 'Menunggu Persetujuan', key: 'pengajuan' },
            { label: 'Sedang Dipinjam', key: 'dipinjam' },
            { label: 'Pengajuan Kembali', key: 'pengajuan-pengembalian' },
            { label: 'Riwayat Selesai', key: 'dikembalikan' },
          ]}
          tabBarStyle={{ marginBottom: 16 }}
        />

        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={loading}
          scroll={{ x: 900 }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} data` }}
          locale={{ emptyText: <Empty description="Tidak ada data peminjaman ditemukan" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      </Card>

      <Modal
        title={
          <Space>
            <FileTextOutlined />
            <span>Detail Peminjaman</span>
            {selectedLoan && <Tag color={statusMap[selectedLoan.status]?.color}>{statusMap[selectedLoan.status]?.text}</Tag>}
          </Space>
        }
        width={700}
        onCancel={handleCloseDetail}
        open={detailDrawerOpen}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={handleCloseDetail}>Tutup</Button>
            {canApprove && (
              <>
                <Button danger onClick={() => setRejectModalOpen(true)}>Tolak Permohonan</Button>
                <Button type="primary" onClick={handleOpenApproval}>Setujui Permohonan</Button>
              </>
            )}
            {selectedLoan && (selectedLoan.status === 'dipinjam' || selectedLoan.status === 'dikembalikan') && (
              <Button 
                icon={<DownloadOutlined />} 
                onClick={() => window.open(`${import.meta.env.VITE_API_URL}/public/bmn-loans/${selectedLoan.token || selectedLoan.id}/pdf`, '_blank')}
              >
                Unduh SPA (PDF)
              </Button>
            )}
            {canReturn && (
              <Button type="primary" danger onClick={handleOpenReturn}>
                {selectedLoan?.status === 'pengajuan-pengembalian' ? 'Setujui Pengembalian' : 'Proses Pengembalian'}
              </Button>
            )}
          </div>
        }
        centered
        destroyOnClose
      >
        {selectedLoan && (
          <div className="detail-content" style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 8 }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Descriptions title="Informasi Pemohon" column={1} bordered size="small" labelStyle={{ width: 110 }}>
                  <Descriptions.Item label="Nomor SPA">{selectedLoan.spaNumber}</Descriptions.Item>
                  <Descriptions.Item label="Nama Peminjam">{selectedLoan.borrowerName} ({selectedLoan.borrowerNip})</Descriptions.Item>
                  <Descriptions.Item label="Unit/Fungsi">{selectedLoan.borrowerFunction || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Kontak">{selectedLoan.borrowerPhone || '-'}</Descriptions.Item>
                </Descriptions>
              </Col>
              <Col xs={24} md={12}>
                <Descriptions title="Detail Peminjaman" column={1} bordered size="small" labelStyle={{ width: 110 }}>
                  <Descriptions.Item label="Tgl Pinjam">{dayjs(selectedLoan.loan_date).format('DD MMM YYYY')}</Descriptions.Item>
                  <Descriptions.Item label="Rencana Kembali">{dayjs(selectedLoan.return_date).format('DD MMM YYYY')}</Descriptions.Item>
                  <Descriptions.Item label="Lokasi">{selectedLoan.location}</Descriptions.Item>
                  <Descriptions.Item label="Keperluan">{selectedLoan.notes}</Descriptions.Item>
                </Descriptions>
              </Col>
            </Row>

            <Divider style={{ margin: '16px 0' }} />

            <Typography.Title level={5} style={{ marginBottom: 16 }}>Aset yang Dipinjam</Typography.Title>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {selectedLoan.assets?.map((asset, idx) => (
                <Card key={idx} size="small" type="inner" variant="outlined">
                  <Space align="start">
                    <Avatar shape="square" size={48} icon={<DropboxOutlined />} style={{ backgroundColor: '#e6f7ff', color: '#1890ff' }} />
                    <div>
                      <Typography.Text strong>{asset.nama_barang}</Typography.Text>
                      <br />
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>NUP: {asset.nup} • Merk/Tipe: {asset.merek_barang}</Typography.Text>
                    </div>
                  </Space>
                </Card>
              ))}
            </div>

            <Divider style={{ margin: '24px 0' }} />

            <Descriptions title="Otorisasi" column={1} bordered size="small" layout="vertical">
              <Descriptions.Item label="Tanda Tangan Peminjam">
                <div style={{ textAlign: 'center', padding: 10, background: '#f5f5f5', borderRadius: 4 }}>
                  {selectedLoan.requester_signature_token ? (
                    <div style={{ padding: '10px 0' }}>
                      <Tag color="green">Terverifikasi TTE (Digital Signature)</Tag>
                      <div style={{ fontSize: 10, color: '#999', marginTop: 4 }}>Token: {selectedLoan.requester_signature_token}</div>
                    </div>
                  ) : (
                    <img src={selectedLoan.requesterSignature} alt="TTD Peminjam" style={{ maxHeight: 80, maxWidth: '100%' }} />
                  )}
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{selectedLoan.borrowerName}</div>
                </div>
              </Descriptions.Item>
              {(selectedLoan.validator_signature_token || selectedLoan.validatorSignature) && (
                <Descriptions.Item label={`Disetujui Oleh: ${selectedLoan.validatorName || 'Validator'}`}>
                  <div style={{ textAlign: 'center', padding: 10, background: '#f5f5f5', borderRadius: 4 }}>
                    {selectedLoan.validator_signature_token ? (
                      <div style={{ padding: '10px 0' }}>
                        <Tag color="green">Terverifikasi TTE (Digital Signature)</Tag>
                        <div style={{ fontSize: 10, color: '#999', marginTop: 4 }}>Token: {selectedLoan.validator_signature_token}</div>
                      </div>
                    ) : (
                      <img src={selectedLoan.validatorSignature} alt="TTD Validator" style={{ maxHeight: 80, maxWidth: '100%' }} />
                    )}
                    <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{dayjs(selectedLoan.updated_at).format('DD MMM YYYY HH:mm')}</div>
                  </div>
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>
        )}
      </Modal>

      <Modal
        title={approvalStep === 1 ? '🚗 Tipe Aset' : '📋 Kondisi & Persetujuan'}
        open={approvalModalOpen}
        onOk={handleApprove}
        onCancel={approvalStep === 2 ? () => setApprovalStep(1) : handleCloseApproval}
        okText={approvalStep === 1 ? 'Lanjut →' : 'Tanda Tangan & Setujui'}
        cancelText={approvalStep === 1 ? 'Batal' : '← Kembali'}
        width={520}
        confirmLoading={approving}
        cancelButtonProps={{ disabled: approving }}
        closable={!approving}
        maskClosable={!approving}
        destroyOnHidden
      >
        {approvalStep === 1 && (
          <div style={{ padding: '16px 0' }}>
            <Typography.Paragraph strong>Apakah aset yang dipinjam merupakan kendaraan?</Typography.Paragraph>
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <Card
                hoverable size="small" variant="outlined"
                style={{ cursor: 'pointer', borderColor: isVehicle === true ? '#1890ff' : undefined, background: isVehicle === true ? '#e6f4ff' : undefined }}
                onClick={() => setIsVehicle(true)}
              >
                <Space><span style={{ fontSize: 24 }}>🚗</span><div><strong>Aset Kendaraan</strong><br /><Typography.Text type="secondary" style={{ fontSize: 12 }}>Mobil, motor, dan kendaraan bermotor lainnya</Typography.Text></div></Space>
              </Card>
              <Card
                hoverable size="small" variant="outlined"
                style={{ cursor: 'pointer', borderColor: isVehicle === false ? '#1890ff' : undefined, background: isVehicle === false ? '#e6f4ff' : undefined }}
                onClick={() => setIsVehicle(false)}
              >
                <Space><span style={{ fontSize: 24 }}>📦</span><div><strong>Bukan Kendaraan</strong><br /><Typography.Text type="secondary" style={{ fontSize: 12 }}>Elektronik, furniture, peralatan kantor, dll.</Typography.Text></div></Space>
              </Card>
            </Space>
          </div>
        )}

        {approvalStep === 2 && (
          <div>
            <Typography.Paragraph>Sebagai <b>{currentRole}</b>, isi kondisi aset saat dipinjam lalu bubuhkan tanda tangan.</Typography.Paragraph>

            <div style={{ marginBottom: 16 }}>
              <Typography.Text strong>Kondisi Barang:</Typography.Text>
              <Space style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['Baik', 'Baik Dengan Keterangan'].map(opt => (
                  <Tag.CheckableTag key={opt} checked={kondisiPinjam === opt} onChange={() => setKondisiPinjam(opt)}
                    style={{ fontSize: 13, padding: '4px 12px', borderRadius: 8 }}>{opt}</Tag.CheckableTag>
                ))}
              </Space>
            </div>

            {isVehicle && (
              <div style={{ marginBottom: 16 }}>
                <Typography.Text strong>Kondisi Kendaraan:</Typography.Text>
                <Row gutter={[8, 8]} style={{ marginTop: 8 }}>
                  {[['bbm', 'BBM'], ['oli', 'Oli'], ['minyak_rem', 'Minyak Rem'], ['ban', 'Ban'], ['air_radiator', 'Air Radiator'], ['air_aki', 'Air Aki']].map(([key, label]) => (
                    <Col span={12} key={key}>
                      <Typography.Text style={{ fontSize: 12 }}>{label}:</Typography.Text>
                      {key === 'bbm' ? (
                        <Input
                          size="small"
                          value={kendaraanPinjam[key]}
                          onChange={e => setKendaraanPinjam(p => ({ ...p, [key]: e.target.value }))}
                          placeholder="Contoh: Full / 1/2"
                          style={{ marginTop: 2 }}
                        />
                      ) : (
                        <Checkbox
                          checked={!!kendaraanPinjam[key]}
                          onChange={e => setKendaraanPinjam(p => ({ ...p, [key]: e.target.checked }))}
                          style={{ marginTop: 6 }}
                        >
                          Baik
                        </Checkbox>
                      )}
                    </Col>
                  ))}
                </Row>
              </div>
            )}

            <Typography.Text strong>Password Otorisasi SIPTU:</Typography.Text>
            <div style={{ marginTop: 8 }}>
              <Input.Password 
                size="large"
                placeholder="Masukkan password SIPTU Anda untuk menyetujui" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                onPressEnter={handleApprove}
              />
            </div>
            <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 8 }}>
              * Dengan memasukkan password, Anda menyetujui peminjaman ini secara elektronik menggunakan TTE QR Code.
            </Typography.Text>
          </div>
        )}
      </Modal>

      <Modal
        title="✅ Konfirmasi Pengembalian Aset"
        open={returnModalOpen}
        onOk={handleReturn}
        onCancel={() => { setReturnModalOpen(false); setSelectedLoan(null); }}
        okText="Konfirmasi Selesai"
        cancelText="Batal"
        width={480}
        confirmLoading={returning}
        destroyOnHidden
      >
        <Typography.Paragraph>
          Isi kondisi aset <b>{selectedLoan?.spaNumber}</b> saat dikembalikan.
        </Typography.Paragraph>

        <div style={{ marginBottom: 16 }}>
          <Typography.Text strong>Kondisi Barang:</Typography.Text>
          <Space style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['Baik', 'Baik Dengan Keterangan'].map(opt => (
              <Tag.CheckableTag key={opt} checked={kondisiKembali === opt} onChange={() => setKondisiKembali(opt)}
                style={{ fontSize: 13, padding: '4px 12px', borderRadius: 8 }}>{opt}</Tag.CheckableTag>
            ))}
          </Space>
        </div>

        {selectedLoan?.isVehicle && (
          <div>
            <Typography.Text strong>Kondisi Kendaraan saat Kembali:</Typography.Text>
            <Row gutter={[8, 8]} style={{ marginTop: 8 }}>
              {[['bbm', 'BBM'], ['oli', 'Oli'], ['minyak_rem', 'Minyak Rem'], ['ban', 'Ban'], ['air_radiator', 'Air Radiator'], ['air_aki', 'Air Aki']].map(([key, label]) => (
                <Col span={12} key={key}>
                  <Typography.Text style={{ fontSize: 12 }}>{label}:</Typography.Text>
                  {key === 'bbm' ? (
                    <Input
                      size="small"
                      value={kendaraanKembali[key]}
                      onChange={e => setKendaraanKembali(p => ({ ...p, [key]: e.target.value }))}
                      placeholder="Contoh: Full / 1/2"
                      style={{ marginTop: 2 }}
                    />
                  ) : (
                    <Checkbox
                      checked={!!kendaraanKembali[key]}
                      onChange={e => setKendaraanKembali(p => ({ ...p, [key]: e.target.checked }))}
                      style={{ marginTop: 6 }}
                    >
                      Baik
                    </Checkbox>
                  )}
                </Col>
              ))}
            </Row>
          </div>
        )}
      </Modal>

      <Modal
        title="Tolak Permohonan"
        open={rejectModalOpen}
        onCancel={() => { setRejectModalOpen(false); setRejectReason(''); }}
        onOk={handleReject}
        okText="Tolak Permohonan"
        cancelText="Batal"
        okButtonProps={{ danger: true }}
        confirmLoading={rejecting}
      >
        <Typography.Paragraph>Yakin ingin menolak permohonan peminjaman ini? Silakan masukkan alasan penolakan:</Typography.Paragraph>
        <Input.TextArea
          rows={4}
          placeholder="Alasan penolakan..."
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>
    </div>
  );
};

export default BmnPeminjamanAset;
