import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  App as AntdApp,
  Button,
  Input,
  InputNumber,
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
  Avatar,
  Drawer,
  Empty,
  Badge,
  Dropdown,
} from 'antd';
import { buildMessageAdapter } from '../utils/notify.js';
import {
  EyeOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  CalendarOutlined,
  UserOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  DropboxOutlined,
  CloseCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth.js';
import StatisticCard from '../components/StatisticCard.jsx';
import dayjs from 'dayjs';
import 'dayjs/locale/id';

dayjs.locale('id');

// const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

const statusMap = {
  pengajuan: { color: 'blue', text: 'Menunggu Persetujuan', icon: <ClockCircleOutlined /> },
  disetujui: { color: 'green', text: 'Disetujui', icon: <CheckCircleOutlined /> },
  ditolak: { color: 'red', text: 'Ditolak', icon: <CloseCircleOutlined /> },
};

const BmnPermintaanPersediaan = () => {
  const { headers, currentRole, user, apiFetch } = useAuth();
  const { modal, message } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Detail Drawer
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Approval state
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvedQtys, setApprovedQtys] = useState({});
  const [approverName, setApproverName] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reject state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');

  /* ── Fetch ── */
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/inventory-requests');
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : (data?.data ?? []));
    } catch (error) {
      notification.error({ message: 'Tidak dapat memuat data permintaan', description: error.message });
    } finally {
      setLoading(false);
    }
  }, [headers, notification]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  /* ── Stats ── */
  const stats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter(r => r.status === 'pengajuan').length,
    approved: requests.filter(r => r.status === 'disetujui').length,
    rejected: requests.filter(r => r.status === 'ditolak').length,
  }), [requests]);

  /* ── Filter ── */
  const filteredData = useMemo(() => {
    let data = [...requests];
    if (statusFilter !== 'all') data = data.filter(r => r.status === statusFilter);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(r =>
        r.spb_number?.toLowerCase().includes(term) ||
        r.requester_name?.toLowerCase().includes(term) ||
        r.sbbk_number?.toLowerCase().includes(term)
      );
    }
    return data.sort((a, b) => dayjs(b.created_at).diff(dayjs(a.created_at)));
  }, [requests, searchTerm, statusFilter]);

  /* ── Detail ── */
  const handleViewDetail = (record) => { setSelectedRequest(record); setDetailDrawerOpen(true); };
  const handleCloseDetail = () => { setDetailDrawerOpen(false); setSelectedRequest(null); };

  /* ── Open Approval ── */
  const handleOpenApproval = () => {
    const qtyMap = {};
    (selectedRequest?.items || []).forEach(item => {
      qtyMap[item.id] = item.qty_requested;
    });
    setApprovedQtys(qtyMap);
    setApproverName(user?.name || '');
    setApprovalNotes('');
    setDetailDrawerOpen(false);
    setApprovalModalOpen(true);
  };

  /* ── Approve ── */
  const handleApprove = async () => {
    if (!approverName.trim()) {
      notification.error({ message: 'Nama verifikator wajib diisi.' });
      return;
    }

    try {
      setSubmitting(true);
      const itemsPayload = (selectedRequest.items || []).map(item => ({
        id: item.id,
        qty_approved: approvedQtys[item.id] ?? item.qty_requested,
      }));

      const res = await apiFetch(`/inventory-requests/${selectedRequest.id}/approve`, {
        method: 'PUT',
        body: JSON.stringify({
          items: itemsPayload,
          approval_notes: approvalNotes || null,
          approver_name: approverName,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Gagal menyetujui');
      }

      message.success('Permintaan berhasil disetujui! Notifikasi WA telah dikirim.');
      setApprovalModalOpen(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      notification.error({ message: 'Gagal menyetujui permintaan', description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Reject ── */
  const handleOpenReject = () => {
    setRejectNotes('');
    setDetailDrawerOpen(false);
    setRejectModalOpen(true);
  };

  const handleReject = async () => {
    try {
      setSubmitting(true);
      const res = await apiFetch(`/inventory-requests/${selectedRequest.id}/reject`, {
        method: 'PUT',
        body: JSON.stringify({ approval_notes: rejectNotes || 'Ditolak oleh admin' }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Gagal menolak');
      }

      message.info('Permintaan ditolak. Notifikasi WA telah dikirim.');
      setRejectModalOpen(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      notification.error({ message: 'Gagal menolak permintaan', description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const canApprove = (currentRole === 'admin' || currentRole === 'validator') && selectedRequest?.status === 'pengajuan';

  /* ── Table Columns ── */
  const columns = [
    {
      title: 'Informasi Pengajuan',
      key: 'info',
      width: 250,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Typography.Text strong copyable={{ text: record.spb_number }}>{record.spb_number}</Typography.Text>
          {record.sbbk_number && (
            <Typography.Text type="success" style={{ fontSize: 12 }}>SBBK: {record.sbbk_number}</Typography.Text>
          )}
          <Space size={4}>
            <CalendarOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {dayjs(record.created_at).format('D MMM YYYY, HH:mm')}
            </Typography.Text>
          </Space>
        </Space>
      )
    },
    {
      title: 'Pemohon',
      key: 'requester',
      render: (_, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#fde3cf', color: '#f56a00' }} />
          <div>
            <Typography.Text strong>{record.requester_name}</Typography.Text>
            <br />
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>{record.requester_nip}</Typography.Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Item',
      key: 'items',
      render: (_, record) => {
        const items = record.items || [];
        const count = items.length;
        const firstName = items[0]?.item_name || 'Item';
        return (
          <Tooltip title={items.map(i => `${i.item_name} (${i.qty_requested})`).join(', ')}>
            <Badge count={count} style={{ backgroundColor: '#108ee9' }}>
              <Card size="small" style={{ fontSize: 12, width: 200, background: '#fafafa' }} variant="borderless">
                {firstName} {count > 1 ? `+${count - 1} lainnya` : ''}
              </Card>
            </Badge>
          </Tooltip>
        );
      }
    },
    {
      title: 'Status',
      key: 'status',
      width: 180,
      render: (_, record) => {
        const s = statusMap[record.status] || { color: 'default', text: record.status };
        return <Tag icon={s.icon} color={s.color} style={{ borderRadius: 12, padding: '2px 10px' }}>{s.text}</Tag>;
      }
    },
    {
      title: 'Aksi',
      key: 'actions',
      width: 70,
      align: 'center',
      render: (_, record) => {
        const items = [
          {
            key: 'detail',
            label: 'Lihat Rincian Permintaan',
            icon: <EyeOutlined style={{ color: '#1e293b' }} />,
            onClick: () => handleViewDetail(record),
          },
        ];

        return (
          <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
            <Button type="text" shape="circle" icon={<MoreOutlined style={{ color: '#1e293b', fontSize: 16 }} />} />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <div className="module-section">
      {/* Header */}
      <div className="module-toolbar">
        <div>
          <Typography.Title level={3} className="module-title">Permintaan Persediaan</Typography.Title>
          <Typography.Text className="module-subtitle">Kelola pengajuan barang persediaan ATK dan lainnya.</Typography.Text>
        </div>
      </div>

      {/* Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <StatisticCard title="Total Pengajuan" value={stats.total} icon={<FileTextOutlined />} color="#1890ff" loading={loading} />
        </Col>
        <Col xs={24} sm={6}>
          <StatisticCard title="Menunggu Persetujuan" value={stats.pending} icon={<ClockCircleOutlined />} color="#faad14" loading={loading} />
        </Col>
        <Col xs={24} sm={6}>
          <StatisticCard title="Disetujui" value={stats.approved} icon={<CheckCircleOutlined />} color="#52c41a" loading={loading} />
        </Col>
        <Col xs={24} sm={6}>
          <StatisticCard title="Ditolak" value={stats.rejected} icon={<CloseCircleOutlined />} color="#ff4d4f" loading={loading} />
        </Col>
      </Row>

      {/* Table */}
      <Card variant="borderless" style={{ borderRadius: 12, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.03)' }} styles={{ body: { padding: '24px' } }}>
        <div className="data-filter-row">
          <Input.Search
            placeholder="Cari No. SPB, Nama Pemohon..."
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
            { label: 'Disetujui', key: 'disetujui' },
            { label: 'Ditolak', key: 'ditolak' },
          ]}
          tabBarStyle={{ marginBottom: 16 }}
        />

        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} pengajuan` }}
          locale={{ emptyText: <Empty description="Tidak ada data permintaan ditemukan" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      </Card>

      {/* ── Detail Drawer ── */}
      <Drawer
        title={
          <Space>
            <FileTextOutlined />
            <span>Detail Pengajuan</span>
            {selectedRequest && <Tag color={statusMap[selectedRequest.status]?.color}>{statusMap[selectedRequest.status]?.text}</Tag>}
          </Space>
        }
        width={600}
        onClose={handleCloseDetail}
        open={detailDrawerOpen}
        extra={
          <Space>
            {canApprove && (
              <>
                <Button danger icon={<CloseOutlined />} onClick={handleOpenReject}>Tolak</Button>
                <Button type="primary" icon={<CheckOutlined />} onClick={handleOpenApproval}>Setujui</Button>
              </>
            )}
          </Space>
        }
      >
        {selectedRequest && (
          <div className="detail-content">
            <Descriptions title="Informasi Pengajuan" column={1} bordered size="small" labelStyle={{ width: 180 }}>
              <Descriptions.Item label="Nomor SPB">
                <Typography.Text strong style={{ color: '#4f46e5' }}>{selectedRequest.spb_number}</Typography.Text>
              </Descriptions.Item>
              {selectedRequest.sbbk_number && (
                <Descriptions.Item label="Nomor SBBK">
                  <Typography.Text strong style={{ color: '#059669' }}>{selectedRequest.sbbk_number}</Typography.Text>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Nama Pemohon">{selectedRequest.requester_name}</Descriptions.Item>
              <Descriptions.Item label="NIP">{selectedRequest.requester_nip}</Descriptions.Item>
              {selectedRequest.requester_function && (
                <Descriptions.Item label="Fungsi / Bidang">{selectedRequest.requester_function}</Descriptions.Item>
              )}
              <Descriptions.Item label="Tanggal Pengajuan">{dayjs(selectedRequest.created_at).format('dddd, DD MMMM YYYY HH:mm')}</Descriptions.Item>
              {selectedRequest.purpose && (
                <Descriptions.Item label="Keperluan">{selectedRequest.purpose}</Descriptions.Item>
              )}
              {selectedRequest.approval_notes && (
                <Descriptions.Item label="Catatan Admin">{selectedRequest.approval_notes}</Descriptions.Item>
              )}
            </Descriptions>

            <Divider style={{ margin: '24px 0' }} />

            <Typography.Title level={5} style={{ marginBottom: 16 }}>
              <DropboxOutlined style={{ marginRight: 8, color: '#2563eb' }} />
              Barang yang Diminta ({(selectedRequest.items || []).length} item)
            </Typography.Title>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(selectedRequest.items || []).map((item, idx) => (
                <Card key={item.id || idx} size="small" type="inner" variant="outlined">
                  <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Space align="start">
                      <Avatar shape="square" size={48} icon={<DropboxOutlined />} style={{ backgroundColor: '#e6f7ff', color: '#1890ff' }} />
                      <div>
                        <Typography.Text strong>{item.item_name}</Typography.Text>
                        <br />
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>{item.unit}</Typography.Text>
                      </div>
                    </Space>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, color: '#6366f1' }}>
                        Diminta: <strong>{item.qty_requested}</strong> {item.unit}
                      </div>
                      {selectedRequest.status === 'disetujui' && (
                        <div style={{
                          fontSize: 13, fontWeight: 700,
                          color: item.qty_approved === item.qty_requested ? '#059669'
                            : item.qty_approved > 0 ? '#d97706' : '#dc2626',
                        }}>
                          Disetujui: {item.qty_approved ?? '-'} {item.unit}
                        </div>
                      )}
                    </div>
                  </Space>
                </Card>
              ))}
            </div>

            {/* Signature */}
            {selectedRequest.requester_signature && (
              <>
                <Divider style={{ margin: '24px 0' }} />
                <Descriptions title="Tanda Tangan Pemohon" column={1} bordered size="small" layout="vertical">
                  <Descriptions.Item>
                    <div style={{ textAlign: 'center', padding: 10, background: '#f5f5f5', borderRadius: 4 }}>
                      <img src={selectedRequest.requester_signature} alt="TTD Pemohon" style={{ maxHeight: 80, maxWidth: '100%' }} />
                      <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{selectedRequest.requester_name}</div>
                    </div>
                  </Descriptions.Item>
                </Descriptions>
              </>
            )}
          </div>
        )}
      </Drawer>

      {/* ── Approval Modal ── */}
      <Modal
        title={<><CheckCircleOutlined style={{ color: '#059669', marginRight: 8 }} />Persetujuan Permintaan</>}
        open={approvalModalOpen}
        onCancel={() => { setApprovalModalOpen(false); if (!detailDrawerOpen) setSelectedRequest(null); }}
        footer={[
          <Button key="cancel" disabled={submitting} onClick={() => { setApprovalModalOpen(false); if (!detailDrawerOpen) setSelectedRequest(null); }}>
            Batal
          </Button>,
          <Button key="approve" type="primary" loading={submitting} disabled={submitting} onClick={handleApprove}
            style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
            Setujui Permintaan
          </Button>,
        ]}
        width={560}
        destroyOnHidden
        closable={!submitting}
        maskClosable={!submitting}
      >
        {selectedRequest && (
          <div style={{ marginTop: 8 }}>
            {/* Quantity adjustment table */}
            <Typography.Text strong style={{ display: 'block', marginBottom: 12, fontSize: 14 }}>
              <EditOutlined style={{ marginRight: 6 }} />
              Sesuaikan Jumlah Disetujui
            </Typography.Text>
            <Table
              size="small"
              pagination={false}
              dataSource={selectedRequest.items || []}
              rowKey="id"
              columns={[
                {
                  title: 'Nama Barang', dataIndex: 'item_name', key: 'item_name',
                  render: (text, record) => (
                    <div>
                      <Typography.Text strong>{text}</Typography.Text>
                      <br />
                      <Typography.Text type="secondary" style={{ fontSize: 11 }}>{record.unit}</Typography.Text>
                    </div>
                  ),
                },
                {
                  title: 'Diminta', key: 'qty_requested', width: 90, align: 'center',
                  render: (_, record) => (
                    <Tag color="purple" style={{ borderRadius: 6, fontWeight: 600 }}>{record.qty_requested}</Tag>
                  ),
                },
                {
                  title: 'Disetujui', key: 'qty_approved', width: 100, align: 'center',
                  render: (_, record) => (
                    <InputNumber
                      min={0}
                      max={record.qty_requested}
                      value={record.id in approvedQtys ? approvedQtys[record.id] : record.qty_requested}
                      onChange={(val) => setApprovedQtys(prev => ({ ...prev, [record.id]: val }))}
                      size="small"
                      style={{ width: 80 }}
                    />
                  ),
                },
              ]}
              style={{ marginBottom: 20 }}
            />

            {/* Approver name */}
            <div style={{ marginBottom: 14 }}>
              <Typography.Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>
                Pengelola Persediaan <span style={{ color: '#ef4444' }}>*</span>
              </Typography.Text>
              <Input
                placeholder="Masukkan nama Anda"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div>
              <Typography.Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>
                Catatan (opsional)
              </Typography.Text>
              <Input.TextArea
                placeholder="Catatan untuk pemohon…"
                rows={2}
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
              />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title="Tolak Permintaan"
        open={rejectModalOpen}
        onCancel={() => { setRejectModalOpen(false); if (!detailDrawerOpen) setSelectedRequest(null); }}
        okText="Ya, Tolak"
        cancelText="Batal"
        okButtonProps={{ danger: true, loading: submitting, disabled: submitting }}
        cancelButtonProps={{ disabled: submitting }}
        onOk={handleReject}
        destroyOnHidden
        closable={!submitting}
        maskClosable={!submitting}
      >
        <Typography.Text style={{ display: 'block', marginBottom: 8, color: '#475569' }}>
          Berikan alasan penolakan (opsional):
        </Typography.Text>
        <Input.TextArea
          rows={3}
          placeholder="Alasan penolakan…"
          value={rejectNotes}
          onChange={(e) => setRejectNotes(e.target.value)}
        />
      </Modal>
    </div>
  );
};

export default BmnPermintaanPersediaan;
