import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Typography, Table, Tag, App as AntdApp, Input, Button, Space, Select } from 'antd';
import { buildMessageAdapter } from '../utils/notify.js';
import { SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../hooks/useAuth.js';

// const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

const formatCurrency = (value) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
}).format(value ?? 0);

const getColumnSearchProps = (dataIndex, searchInput) => ({
  filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters, close }) => (
    <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
      <Input
        ref={searchInput}
        placeholder={`Cari ${dataIndex}`}
        value={selectedKeys[0]}
        onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
        onPressEnter={() => confirm()}
        style={{ marginBottom: 8, display: 'block' }}
      />
      <Space>
        <Button
          type="primary"
          onClick={() => confirm()}
          icon={<SearchOutlined />}
          size="small"
          style={{ width: 90 }}
        >
          Cari
        </Button>
        <Button
          onClick={() => clearFilters && clearFilters()}
          size="small"
          style={{ width: 90 }}
        >
          Reset
        </Button>
        <Button
          type="link"
          size="small"
          onClick={() => {
            confirm({ closeDropdown: false });
          }}
        >
          Filter
        </Button>
        <Button
          type="link"
          size="small"
          onClick={() => {
            close();
          }}
        >
          Tutup
        </Button>
      </Space>
    </div>
  ),
  filterIcon: (filtered) => (
    <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />
  ),
  onFilter: (value, record) =>
    record[dataIndex].toString().toLowerCase().includes(value.toLowerCase()),
  filterDropdownProps: {
    onOpenChange: (visible) => {
      if (visible) {
        setTimeout(() => searchInput.current?.select(), 100);
      }
    },
  },
});

const normalizeRealisasiByDate = (item) => ({
  id: item.id,
  date: item.tanggal,
  mak: item.mak,
  description: item.deskripsi,
  value: item.nilai,
  status: item.status,
  transactionNumber: item.invoice_no || item.ticket_no,
  transactionType: 'Invoice Belanja',
  employeeName: item.approver?.name || '-',
});

const RealisasiByDate = () => {
  const { apiFetch } = useAuth();
  const { message } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const searchInput = useRef(null);

  const fetchRealisasiByDate = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const response = await apiFetch(`/realisasi-date?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Gagal memuat data realisasi berdasarkan tanggal.');
      }
      const payload = await response.json();
      setData((payload ?? []).map(normalizeRealisasiByDate));

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

  const columns = useMemo(() => [
    {
      title: 'Tanggal',
      dataIndex: 'date',
      key: 'date',
      sorter: (a, b) => new Date(a.date) - new Date(b.date),
      render: (text) => new Date(text).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
    },
    {
      title: 'No ST / NO Inv',
      dataIndex: 'transactionNumber',
      key: 'transactionNumber',
      render: (text) => <Typography.Text code>{text}</Typography.Text>,
      ...getColumnSearchProps('transactionNumber', searchInput),
    },
    {
      title: 'Jenis Transaksi',
      dataIndex: 'transactionType',
      key: 'transactionType',
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: 'MAK',
      dataIndex: 'mak',
      key: 'mak',
      sorter: (a, b) => a.mak.localeCompare(b.mak),
      render: (text) => <Typography.Text code>{text}</Typography.Text>,
      ...getColumnSearchProps('mak', searchInput),
    },
    {
      title: 'Deskripsi',
      dataIndex: 'description',
      key: 'description',
      sorter: (a, b) => a.description.localeCompare(b.description),
      ...getColumnSearchProps('description', searchInput),
    },
    {
      title: 'Nama Pegawai',
      dataIndex: 'employeeName',
      key: 'employeeName',
      sorter: (a, b) => (a.employeeName ?? '').localeCompare(b.employeeName ?? ''),
      ...getColumnSearchProps('employeeName', searchInput),
    },
    {
      title: 'Nilai',
      dataIndex: 'value',
      key: 'value',
      align: 'right',
      sorter: (a, b) => a.value - b.value,
      render: (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      sorter: (a, b) => a.status.localeCompare(b.status),
      render: (text) => {
        let color = 'default';
        if (text === 'approved') {
          color = 'green';
          text = 'Disetujui';
        } else if (text === 'pending') {
          color = 'gold';
        }
        return <Tag color={color}>{text}</Tag>;
      },
    },
  ], []);

  return (
    <div>
      <Typography.Title level={5}>Realisasi Anggaran Berdasarkan Tanggal</Typography.Title>
      <Typography.Paragraph>Detail realisasi anggaran berdasarkan tanggal transaksi.</Typography.Paragraph>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ pageSize: 10, size: 'small' }}
        scroll={{ x: true }}
        size="small"
      />
    </div>
  );
};

export default RealisasiByDate;



