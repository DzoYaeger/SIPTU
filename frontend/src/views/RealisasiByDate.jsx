import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Typography, Table, Tag, App as AntdApp, Input, Button, Space, Card, Dropdown, Row, Col, Statistic } from 'antd';
import { buildMessageAdapter } from '../utils/notify.js';
import {
  SearchOutlined,
  MoreOutlined,
  EyeOutlined,
  DollarOutlined,
  ShoppingOutlined,
  GlobalOutlined,
  FileDoneOutlined,
} from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth.js';
import RealisasiDetailModal from './RealisasiDetailModal.jsx';

const { Text } = Typography;

const formatCurrency = (value) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value ?? 0);

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
        style={{ marginBottom: 8, display: 'block', fontSize: 12 }}
      />
      <Space>
        <Button
          type="primary"
          onClick={() => confirm()}
          icon={<SearchOutlined />}
          size="small"
          style={{ width: 80, fontSize: 12 }}
        >
          Cari
        </Button>
        <Button onClick={() => clearFilters && clearFilters()} size="small" style={{ width: 80, fontSize: 12 }}>
          Reset
        </Button>
        <Button type="link" size="small" onClick={() => close()} style={{ fontSize: 12 }}>
          Tutup
        </Button>
      </Space>
    </div>
  ),
  filterIcon: (filtered) => (
    <SearchOutlined style={{ color: filtered ? '#0F5B99' : undefined, fontSize: 12 }} />
  ),
  onFilter: (value, record) =>
    record[dataIndex] ? record[dataIndex].toString().toLowerCase().includes(value.toLowerCase()) : false,
});

const RealisasiByDate = () => {
  const { apiFetch } = useAuth();
  const { message } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Column widths state for Excel-like resizing & balanced initial widths
  const [colWidths, setColWidths] = useState({
    date: 105,
    transaction_number: 165,
    mak: 225, // Wide enough so 6384.EBA.994.002.F.523121 stays 100% on 1 line
    description: 320,
    value: 130,
    action: 60,
  });

  const searchInput = useRef(null);

  const fetchRealisasiByDate = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/realisasi-date');
      if (!response.ok) {
        throw new Error('Gagal memuat data realisasi anggaran.');
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
    fetchRealisasiByDate();
  }, [fetchRealisasiByDate]);

  // Calculations for summary stats
  const stats = useMemo(() => {
    let totalRealisasi = 0;
    let totalPembelian = 0;
    let totalPerjadin = 0;

    data.forEach((item) => {
      const val = item.value || 0;
      totalRealisasi += val;
      if (item.transaction_type === 'Pembelian') {
        totalPembelian += val;
      } else {
        totalPerjadin += val;
      }
    });

    return {
      totalRealisasi,
      totalPembelian,
      totalPerjadin,
      count: data.length,
    };
  }, [data]);

  const handleOpenDetail = (record) => {
    setSelectedRecord(record);
    setModalOpen(true);
  };

  const rawColumns = useMemo(
    () => [
      {
        title: 'Tanggal',
        dataIndex: 'date',
        key: 'date',
        width: colWidths.date,
        sorter: (a, b) => new Date(a.date) - new Date(b.date),
        render: (text) => (
          <span style={{ fontSize: '12px', color: '#334155', whiteSpace: 'nowrap' }}>
            {text ? new Date(text).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
          </span>
        ),
      },
      {
        title: 'No ST / No INV',
        dataIndex: 'transaction_number',
        key: 'transaction_number',
        width: colWidths.transaction_number,
        render: (text, record) => {
          const isPembelian = record.transaction_type === 'Pembelian';
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
              <Text code style={{ fontSize: '11.5px', fontWeight: 600, margin: 0, whiteSpace: 'nowrap' }}>
                {text}
              </Text>
              <Tag
                color={isPembelian ? 'blue' : 'purple'}
                style={{ fontSize: '10px', fontWeight: 600, padding: '0px 6px', margin: 0, borderRadius: '4px', lineHeight: '16px' }}
              >
                {isPembelian ? 'Invoice' : 'Perjadin'}
              </Tag>
            </div>
          );
        },
        ...getColumnSearchProps('transaction_number', searchInput),
      },
      {
        title: 'Kode Akun',
        dataIndex: 'mak',
        key: 'mak',
        width: colWidths.mak,
        sorter: (a, b) => a.mak.localeCompare(b.mak),
        render: (text) => (
          <Text code style={{ fontSize: '11.5px', whiteSpace: 'nowrap', display: 'inline-block' }}>
            {text}
          </Text>
        ),
        ...getColumnSearchProps('mak', searchInput),
      },
      {
        title: 'Uraian',
        dataIndex: 'description',
        key: 'description',
        width: colWidths.description,
        ellipsis: true,
        render: (text) => <span style={{ fontSize: '12px', color: '#1e293b' }}>{text || '-'}</span>,
        ...getColumnSearchProps('description', searchInput),
      },
      {
        title: 'Nilai Total',
        dataIndex: 'value',
        key: 'value',
        align: 'right',
        width: colWidths.value,
        sorter: (a, b) => a.value - b.value,
        render: (value) => (
          <Text strong style={{ color: '#0F5B99', fontSize: '12px', whiteSpace: 'nowrap' }}>
            {formatCurrency(value)}
          </Text>
        ),
      },
      {
        title: 'Aksi',
        key: 'action',
        align: 'center',
        width: colWidths.action,
        render: (_, record) => {
          const actionItems = [
            {
              key: 'detail',
              label: <span style={{ fontSize: '12px' }}>Detail Realisasi</span>,
              icon: <EyeOutlined style={{ color: '#0F5B99', fontSize: 13 }} />,
              onClick: () => handleOpenDetail(record),
            },
          ];

          return (
            <Dropdown menu={{ items: actionItems }} trigger={['click']} placement="bottomRight">
              <Button type="text" size="small" icon={<MoreOutlined style={{ fontSize: 16 }} />} />
            </Dropdown>
          );
        },
      },
    ],
    [colWidths]
  );

  // Attach resizable header props
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
      {/* Top Stat Header */}
      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 6, borderColor: '#e2e8f0' }}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: '12px' }}>Total Realisasi</Text>}
              value={stats.totalRealisasi}
              formatter={(v) => formatCurrency(v)}
              valueStyle={{ fontSize: '15px', fontWeight: 700, color: '#0F5B99' }}
              prefix={<DollarOutlined style={{ fontSize: '14px', color: '#0F5B99' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 6, borderColor: '#e2e8f0' }}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: '12px' }}>Total Pembelian</Text>}
              value={stats.totalPembelian}
              formatter={(v) => formatCurrency(v)}
              valueStyle={{ fontSize: '15px', fontWeight: 700, color: '#2563eb' }}
              prefix={<ShoppingOutlined style={{ fontSize: '14px', color: '#2563eb' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 6, borderColor: '#e2e8f0' }}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: '12px' }}>Total Perjadin</Text>}
              value={stats.totalPerjadin}
              formatter={(v) => formatCurrency(v)}
              valueStyle={{ fontSize: '15px', fontWeight: 700, color: '#7c3aed' }}
              prefix={<GlobalOutlined style={{ fontSize: '14px', color: '#7c3aed' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ borderRadius: 6, borderColor: '#e2e8f0' }}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: '12px' }}>Total Transaksi</Text>}
              value={stats.count}
              valueStyle={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}
              prefix={<FileDoneOutlined style={{ fontSize: '14px', color: '#0f172a' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Table with Resizable Columns */}
      <Table
        rowKey="id"
        components={{
          header: {
            cell: ResizableTitle,
          },
        }}
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ pageSize: 10, size: 'small', showTotal: (total) => `Total ${total} transaksi` }}
        scroll={{ x: '100%' }}
        size="small"
        bordered
      />

      {/* Ant Design Detail Modal */}
      <RealisasiDetailModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedRecord(null);
        }}
        record={selectedRecord}
      />
    </div>
  );
};

export default RealisasiByDate;
