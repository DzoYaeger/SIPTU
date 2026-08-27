import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Typography, Table, Button, Space, App as AntdApp, Modal, Input, Progress, Dropdown, Card } from 'antd';
import { buildMessageAdapter } from '../utils/notify.js';
import { EyeOutlined, SearchOutlined, MoreOutlined, ShoppingOutlined, GlobalOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth.js';

const { Text, Title, Paragraph } = Typography;

const formatCurrency = (val) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val ?? 0);

// Resizable Header Title Component (Excel-like drag resizing)
const ResizableTitle = (props) => {
  const { onResize, width, children, ...restProps } = props;

  if (!width || !onResize) {
    return <th {...restProps}>{children}</th>;
  }

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = width;

    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      onResize(Math.max(65, startWidth + deltaX));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <th
      {...restProps}
      style={{
        ...restProps.style,
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {children}
      <div
        onMouseDown={handleMouseDown}
        onClick={(e) => e.stopPropagation()}
        title="Geser untuk mengatur lebar kolom"
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '8px',
          cursor: 'col-resize',
          zIndex: 10,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div style={{ width: '2px', height: '55%', background: '#cbd5e1', borderRadius: '1px' }} />
      </div>
    </th>
  );
};

const getColumnSearchProps = (dataIndex, searchInput) => ({
  filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters, close }) => (
    <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
      <Input
        ref={searchInput}
        placeholder={`Cari ${dataIndex}`}
        value={selectedKeys[0]}
        onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
        onPressEnter={() => confirm()}
        style={{ marginBottom: 8, display: 'block', fontSize: '12px' }}
      />
      <Space>
        <Button
          type="primary"
          onClick={() => confirm()}
          icon={<SearchOutlined />}
          size="small"
          style={{ width: 80, fontSize: '12px' }}
        >
          Cari
        </Button>
        <Button onClick={() => clearFilters && clearFilters()} size="small" style={{ width: 80, fontSize: '12px' }}>
          Reset
        </Button>
        <Button type="link" size="small" onClick={() => close()} style={{ fontSize: '12px' }}>
          Tutup
        </Button>
      </Space>
    </div>
  ),
  filterIcon: (filtered) => (
    <SearchOutlined style={{ color: filtered ? '#0F5B99' : undefined, fontSize: '12px' }} />
  ),
  onFilter: (value, record) =>
    record[dataIndex] ? record[dataIndex].toString().toLowerCase().includes(value.toLowerCase()) : false,
});

const RealisasiByMak = () => {
  const { apiFetch } = useAuth();
  const { message } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [colWidths, setColWidths] = useState({
    mak: 225,
    deskripsi: 260,
    anggaran: 140,
    realisasi_pembelian: 130,
    realisasi_perjadin: 130,
    total_realisasi: 140,
    percentage: 120,
    action: 60,
  });

  const searchInput = useRef(null);

  const fetchRealisasiByMak = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/realisasi-mak');
      if (!response.ok) {
        throw new Error('Gagal memuat data realisasi per Kode Akun.');
      }
      const payload = await response.json();
      setData(payload ?? []);
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
    fetchRealisasiByMak();
  }, [fetchRealisasiByMak]);

  const handleOpenDetail = (record) => {
    setSelectedRecord(record);
    setModalOpen(true);
  };

  const rawColumns = useMemo(
    () => [
      {
        title: 'Kode Akun',
        dataIndex: 'mak',
        key: 'mak',
        width: colWidths.mak,
        sorter: (a, b) => a.mak.localeCompare(b.mak),
        render: (text) => <Text code style={{ fontWeight: 600, fontSize: '11.5px', whiteSpace: 'nowrap', display: 'inline-block' }}>{text}</Text>,
        ...getColumnSearchProps('mak', searchInput),
      },
      {
        title: 'Deskripsi Uraian Akun',
        dataIndex: 'deskripsi',
        key: 'deskripsi',
        width: colWidths.deskripsi,
        ellipsis: true,
        render: (text) => <span style={{ fontSize: '12px', color: '#334155' }}>{text}</span>,
        ...getColumnSearchProps('deskripsi', searchInput),
      },
      {
        title: 'Pagu Anggaran',
        dataIndex: 'anggaran',
        key: 'anggaran',
        align: 'right',
        width: colWidths.anggaran,
        sorter: (a, b) => a.anggaran - b.anggaran,
        render: (v) => <Text style={{ fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>{formatCurrency(v)}</Text>,
      },
      {
        title: 'Realisasi Pembelian',
        dataIndex: 'realisasi_pembelian',
        key: 'realisasi_pembelian',
        align: 'right',
        width: colWidths.realisasi_pembelian,
        render: (v) => <Text style={{ color: '#2563eb', fontSize: '12px', whiteSpace: 'nowrap' }}>{formatCurrency(v)}</Text>,
      },
      {
        title: 'Realisasi Perjadin',
        dataIndex: 'realisasi_perjadin',
        key: 'realisasi_perjadin',
        align: 'right',
        width: colWidths.realisasi_perjadin,
        render: (v) => <Text style={{ color: '#7c3aed', fontSize: '12px', whiteSpace: 'nowrap' }}>{formatCurrency(v)}</Text>,
      },
      {
        title: 'Total Realisasi',
        dataIndex: 'total_realisasi',
        key: 'total_realisasi',
        align: 'right',
        width: colWidths.total_realisasi,
        sorter: (a, b) => a.total_realisasi - b.total_realisasi,
        render: (v) => (
          <Text strong style={{ color: '#0F5B99', fontSize: '12px', whiteSpace: 'nowrap' }}>
            {formatCurrency(v)}
          </Text>
        ),
      },
      {
        title: 'Persentase',
        key: 'percentage',
        width: colWidths.percentage,
        render: (_, r) => {
          const percent = r.anggaran > 0 ? Math.min(100, Math.round((r.total_realisasi / r.anggaran) * 100)) : 0;
          return <Progress percent={percent} size="small" status={percent > 90 ? 'exception' : 'active'} style={{ fontSize: '11px' }} />;
        },
      },
      {
        title: 'Aksi',
        key: 'action',
        align: 'center',
        width: colWidths.action,
        render: (_, record) => {
          const items = [
            {
              key: 'detail',
              label: <span style={{ fontSize: '12px' }}>Ringkasan Akun</span>,
              icon: <EyeOutlined style={{ color: '#0F5B99', fontSize: '13px' }} />,
              onClick: () => handleOpenDetail(record),
            },
          ];
          return (
            <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
              <Button type="text" size="small" icon={<MoreOutlined style={{ fontSize: '16px' }} />} />
            </Dropdown>
          );
        },
      },
    ],
    [colWidths]
  );

  const columns = useMemo(() => {
    return rawColumns.map((col) => ({
      ...col,
      onHeaderCell: (column) => ({
        width: colWidths[column.key] || column.width,
        onResize: (newWidth) => {
          setColWidths((prev) => ({
            ...prev,
            [column.key]: newWidth,
          }));
        },
      }),
    }));
  }, [rawColumns, colWidths]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Table
        rowKey="mak"
        components={{
          header: {
            cell: ResizableTitle,
          },
        }}
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ pageSize: 10, size: 'small' }}
        scroll={{ x: '100%' }}
        size="small"
        bordered
      />

      {/* Modal Detail Ringkasan MAK */}
      <Modal
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setSelectedRecord(null);
        }}
        footer={[
          <Button key="close" type="primary" size="small" onClick={() => setModalOpen(false)} style={{ fontSize: '12px' }}>
            Tutup
          </Button>,
        ]}
        title={<span style={{ fontSize: '14px', fontWeight: 600 }}>Ringkasan Realisasi Akun: {selectedRecord?.mak || ''}</span>}
        width={520}
      >
        {selectedRecord && (
          <Space direction="vertical" style={{ width: '100%', marginTop: 8 }} size="small">
            <Card size="small" style={{ background: '#f8fafc', borderRadius: 6 }}>
              <Text type="secondary" style={{ fontSize: '11px' }}>Deskripsi Uraian:</Text>
              <Paragraph style={{ margin: 0, fontWeight: 600, fontSize: '12px' }}>{selectedRecord.deskripsi || '-'}</Paragraph>
            </Card>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ padding: 10, border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff' }}>
                <Text type="secondary" style={{ fontSize: '11px' }}>Pagu Anggaran</Text>
                <Title level={5} style={{ margin: 0, color: '#0f172a', fontSize: '13px' }}>
                  {formatCurrency(selectedRecord.anggaran)}
                </Title>
              </div>

              <div style={{ padding: 10, border: '1px solid #e2e8f0', borderRadius: 6, background: '#eff6ff' }}>
                <Text type="secondary" style={{ fontSize: '11px', color: '#1e40af' }}>Total Realisasi</Text>
                <Title level={5} style={{ margin: 0, color: '#0F5B99', fontSize: '13px' }}>
                  {formatCurrency(selectedRecord.total_realisasi)}
                </Title>
              </div>

              <div style={{ padding: 10, border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff' }}>
                <Space size="xs">
                  <ShoppingOutlined style={{ color: '#2563eb', fontSize: '12px' }} />
                  <Text type="secondary" style={{ fontSize: '11px' }}>Pembelian (Invoice)</Text>
                </Space>
                <Title level={5} style={{ margin: 0, color: '#2563eb', fontSize: '13px', marginTop: 2 }}>
                  {formatCurrency(selectedRecord.realisasi_pembelian || 0)}
                </Title>
              </div>

              <div style={{ padding: 10, border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff' }}>
                <Space size="xs">
                  <GlobalOutlined style={{ color: '#7c3aed', fontSize: '12px' }} />
                  <Text type="secondary" style={{ fontSize: '11px' }}>Perjadin (LPJ/ST)</Text>
                </Space>
                <Title level={5} style={{ margin: 0, color: '#7c3aed', fontSize: '13px', marginTop: 2 }}>
                  {formatCurrency(selectedRecord.realisasi_perjadin || 0)}
                </Title>
              </div>
            </div>

            <div style={{ padding: 10, border: '1px solid #e2e8f0', borderRadius: 6, background: '#f8fafc' }}>
              <Text type="secondary" style={{ fontSize: '11px' }}>Sisa Anggaran Tersedia:</Text>
              <Title level={5} style={{ margin: 0, fontSize: '14px', color: (selectedRecord.anggaran - selectedRecord.total_realisasi) < 0 ? '#ef4444' : '#10b981' }}>
                {formatCurrency(selectedRecord.anggaran - selectedRecord.total_realisasi)}
              </Title>
            </div>
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default RealisasiByMak;
