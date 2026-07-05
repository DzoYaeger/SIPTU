import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Typography, Table, Button, Space, Tooltip, App as AntdApp, Modal, Spin, Input, DatePicker, Dropdown } from 'antd';
import { buildMessageAdapter } from '../utils/notify.js';
import { EyeOutlined, SearchOutlined, MoreOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth.js';
import dayjs from 'dayjs';

// const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

const getColumnSearchProps = (dataIndex, searchInput) => ({
  filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters, close, filterDropdownProps }) => (
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

const normalizeRealisasi = (item) => ({
  id: item.mak, // Using MAK as ID for simplicity
  mak: item.mak,
  description: item.deskripsi,
  totalRealisasi: item.total_realisasi,
});

const RealisasiByMak = () => {
  const { apiFetch } = useAuth();
  const { message } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDetailData, setSelectedDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false); // New state for detail modal loading
  const searchInput = useRef(null);

  const fetchRealisasiByMak = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const response = await apiFetch(`/realisasi-mak?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Gagal memuat data realisasi MAK.');
      }
      const payload = await response.json();
      setData((payload ?? []).map(normalizeRealisasi));

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

  const handleDetailClick = useCallback(async (record) => { // Make it async
    setSelectedDetailData(record);
    setDetailModalOpen(true);
    setDetailLoading(true); // Start loading for detail data
    try {
      // Assume an API endpoint for detailed transactions for a given MAK
      const response = await apiFetch(`/realisasi-mak/${record.mak}/transactions`);
      if (!response.ok) {
        throw new Error('Gagal memuat detail realisasi MAK.');
      }
      const payload = await response.json();
      // Assuming payload contains an array of transactions for this MAK
      setSelectedDetailData(prev => ({ ...prev, transactions: payload })); // Add transactions to selectedDetailData
    } catch (error) {
      console.error(error);
      notification.error({
        message: 'Gagal memuat detail realisasi',
        description: error.message,
      });
      setSelectedDetailData(prev => ({ ...prev, transactions: [] })); // Set empty array on error
    } finally {
      setDetailLoading(false);
    }
  }, [apiFetch, notification]);

  const handleCloseDetailModal = useCallback(() => {
    setDetailModalOpen(false);
    setSelectedDetailData(null);
  }, []);

  const columns = useMemo(() => [
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
      title: 'Total Realisasi',
      dataIndex: 'totalRealisasi',
      key: 'totalRealisasi',
      align: 'right',
      sorter: (a, b) => a.totalRealisasi - b.totalRealisasi,
      render: (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value),
    },
    {
      title: 'Aksi',
      key: 'aksi',
      width: 80,
      align: 'center',
      render: (_, record) => {
        const items = [
          {
            key: 'detail',
            label: 'Lihat Detail',
            icon: <EyeOutlined style={{ color: '#1890ff' }} />,
            onClick: () => handleDetailClick(record)
          }
        ];
        return (
          <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
    },
  ], [handleDetailClick]);

  return (
    <div>
      <Typography.Title level={5}>Realisasi Anggaran Berdasarkan MAK</Typography.Title>
      <Typography.Paragraph>Ringkasan realisasi anggaran per Mata Anggaran Kegiatan (MAK).</Typography.Paragraph>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ pageSize: 10, size: 'small' }}
        scroll={{ x: true }}
        size="small"
      />

      <Modal
        open={detailModalOpen}
        title="Detail Realisasi Anggaran"
        onCancel={handleCloseDetailModal}
        footer={null}
        centered
        destroyOnHidden
        width={600} // Adjust width as needed
      >
        {selectedDetailData && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Typography.Text><b>MAK:</b> {selectedDetailData.mak}</Typography.Text>
            <Typography.Text><b>Deskripsi:</b> {selectedDetailData.description}</Typography.Text>
            <Typography.Text><b>Total Realisasi:</b> {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(selectedDetailData.totalRealisasi)}</Typography.Text>

            <Typography.Title level={5} style={{ marginTop: 16 }}>Detail Transaksi</Typography.Title>
            {detailLoading ? (
              <Spin />
            ) : (
              <Table
                dataSource={selectedDetailData.transactions}
                columns={[
                  {
                    title: 'Tanggal', dataIndex: 'tanggal', key: 'tanggal', sorter: (a, b) => dayjs(a.tanggal).unix() - dayjs(b.tanggal).unix(), render: (text) => dayjs(text).format('DD MMM YYYY'),
                    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
                      <div style={{ padding: 8 }}>
                        <DatePicker.RangePicker
                          value={selectedKeys[0] ? [dayjs(selectedKeys[0][0]), dayjs(selectedKeys[0][1])] : null}
                          onChange={(dates) => setSelectedKeys(dates ? [dates.map(d => d.format('YYYY-MM-DD'))] : [])}
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
                            Filter
                          </Button>
                          <Button
                            onClick={() => clearFilters && clearFilters()}
                            size="small"
                            style={{ width: 90 }}
                          >
                            Reset
                          </Button>
                        </Space>
                      </div>
                    ),
                    filterIcon: (filtered) => (
                      <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />
                    ),
                    onFilter: (value, record) => {
                      const recordDate = dayjs(record.tanggal);
                      const [startDate, endDate] = value;
                      return recordDate.isAfter(dayjs(startDate).subtract(1, 'day')) && recordDate.isBefore(dayjs(endDate).add(1, 'day'));
                    },
                  },
                  { title: 'Deskripsi Transaksi', dataIndex: 'deskripsi', key: 'deskripsi', sorter: (a, b) => a.deskripsi.localeCompare(b.deskripsi), ...getColumnSearchProps('deskripsi', searchInput) },
                  { title: 'Nilai', dataIndex: 'nilai', key: 'nilai', align: 'right', sorter: (a, b) => a.nilai - b.nilai, render: (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value) },
                ]}
                pagination={false}
                size="small"
                rowKey="id"
                scroll={{ x: true }}
              />
            )}
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default RealisasiByMak;


