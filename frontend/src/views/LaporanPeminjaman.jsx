import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  App as AntdApp,
  Button,
  Card,
  Col,
  DatePicker,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  Progress,
  Divider,
  List,
  Avatar
} from 'antd';
import { buildMessageAdapter } from '../utils/notify.js';
import {
  PrinterOutlined,
  FileExcelOutlined,
  ReloadOutlined,
  PieChartOutlined,
  BarChartOutlined,
  DownloadOutlined,
  FilterOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  UserOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../hooks/useAuth';

const { RangePicker } = DatePicker;
// const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

const statusMap = {
  menunggu_paraf: { color: 'orange', text: 'Menunggu TTD', icon: <ClockCircleOutlined /> },
  dipinjam: { color: 'blue', text: 'Sedang Dipinjam', icon: <ClockCircleOutlined /> },
  menunggu_paraf_kembali: { color: 'gold', text: 'Validasi Kembali', icon: <WarningOutlined /> },
  dikembalikan: { color: 'green', text: 'Selesai', icon: <CheckCircleOutlined /> },
};

const formatDate = (value) => (value ? dayjs(value).format('DD MMM YYYY') : '-');

const LaporanPeminjaman = () => {
  const { apiFetch } = useAuth();
  const { message } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);

  // Filters
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs()]);
  const [status, setStatus] = useState();
  const [unitId, setUnitId] = useState();
  const [borrowerName, setBorrowerName] = useState();

  // Data
  const [report, setReport] = useState([]);
  const [summary, setSummary] = useState({ total: 0, by_status: {} });
  const [units, setUnits] = useState([]);
  const [borrowers, setBorrowers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState({ pdf: false, excel: false });
  const [filterType, setFilterType] = useState('month'); // 'month', 'custom'

  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    if (dateRange?.[0]) params.append('from', dateRange[0].format('YYYY-MM-DD'));
    if (dateRange?.[1]) params.append('to', dateRange[1].format('YYYY-MM-DD'));
    if (status) params.append('status', status);
    if (unitId) params.append('unit_id', unitId);
    if (borrowerName) params.append('borrower_name', borrowerName);
    return params;
  }, [dateRange, status, unitId, borrowerName]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildQueryParams();

      const [reportRes, borrowersRes] = await Promise.all([
        apiFetch(`/archive-loans/report?${params.toString()}`),
        apiFetch('/archive-loans/borrowers')
      ]);

      if (reportRes.ok) {
        const payload = await reportRes.json();
        setReport(payload.data ?? []);
        setSummary(payload.summary ?? { total: 0, by_status: {} });
        setUnits(payload.units ?? []);
      }

      if (borrowersRes.ok) {
        setBorrowers(await borrowersRes.json());
      }
    } catch (error) {
      notification.error({ message: 'Gagal memuat laporan', description: error.message });
    } finally {
      setLoading(false);
    }
  }, [apiFetch, buildQueryParams, notification]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDownload = async (format) => {
    const key = format === 'pdf' ? 'pdf' : 'excel';
    setDownloadLoading(prev => ({ ...prev, [key]: true }));
    try {
      const params = buildQueryParams();
      const endpoint = format === 'pdf' ? 'pdf' : 'excel';
      const acceptHeader = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      const response = await apiFetch(`/archive-loans/report/${endpoint}?${params.toString()}`, {
        headers: { Accept: acceptHeader }
      });

      if (!response.ok) throw new Error('Gagal mengunduh file');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Laporan_Peminjaman_${dayjs().format('YYYYMMDD')}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      notification.error({ message: 'Gagal Download', description: e.message });
    } finally {
      setDownloadLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  // --- Visuals Logic ---

  const statusDistribution = useMemo(() => {
    const total = summary.total || 1;
    const stats = summary.by_status || {};
    return [
      { label: 'Selesai', count: stats.dikembalikan || 0, percent: ((stats.dikembalikan || 0) / total) * 100, color: '#52c41a' },
      { label: 'Dipinjam', count: stats.dipinjam || 0, percent: ((stats.dipinjam || 0) / total) * 100, color: '#1890ff' },
      { label: 'Proses', count: (stats.menunggu_paraf || 0) + (stats.menunggu_paraf_kembali || 0), percent: (((stats.menunggu_paraf || 0) + (stats.menunggu_paraf_kembali || 0)) / total) * 100, color: '#faad14' },
    ];
  }, [summary]);

  const columns = [
    {
      title: 'Tanggal',
      dataIndex: 'borrow_date',
      render: (val) => formatDate(val),
      sorter: (a, b) => dayjs(a.borrow_date).unix() - dayjs(b.borrow_date).unix(),
    },
    {
      title: 'Peminjam',
      key: 'borrower',
      render: (_, r) => (
        <Space>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#87d068' }} />
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{r.borrower_name}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{r.borrower_work_unit || '-'}</Typography.Text>
          </Space>
        </Space>
      )
    },
    {
      title: 'Arsip',
      key: 'archive',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>{r.archive_number}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{r.unit_pengolah?.nama || r.unit_pengolah?.fungsi_bidang}</Typography.Text>
        </Space>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (val) => {
        const s = statusMap[val] || { color: 'default', text: val };
        return <Tag color={s.color} icon={s.icon}>{s.text}</Tag>;
      }
    }
  ];

  return (
    <div className="report-page" style={{ paddingBottom: 40 }}>

      <div style={{ marginBottom: 24 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>Analytics & Laporan</Typography.Title>
        <Typography.Text type="secondary">Analisis tren peminjaman arsip dan sirkulasi dokumen.</Typography.Text>
      </div>

      <Row gutter={[24, 24]}>
        {/* Sidebar / Filters Column */}
        <Col xs={24} lg={6}>
          <Card title={<Space><FilterOutlined /> Filter Laporan</Space>} variant="borderless">
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <Typography.Text strong>Rentang Waktu</Typography.Text>
                <div style={{ marginTop: 8 }}>
                  <Select
                    style={{ width: '100%', marginBottom: 8 }}
                    value={filterType}
                    onChange={(val) => {
                      setFilterType(val);
                      if (val === 'month') setDateRange([dayjs().startOf('month'), dayjs()]);
                      if (val === 'quarter') setDateRange([dayjs().subtract(3, 'months'), dayjs()]);
                      if (val === 'year') setDateRange([dayjs().startOf('year'), dayjs()]);
                    }}
                    options={[
                      { label: 'Bulan Ini', value: 'month' },
                      { label: '3 Bulan Terakhir', value: 'quarter' },
                      { label: 'Tahun Ini', value: 'year' },
                      { label: 'Custom', value: 'custom' },
                    ]}
                  />
                  <RangePicker
                    style={{ width: '100%' }}
                    value={dateRange}
                    onChange={setDateRange}
                    disabled={filterType !== 'custom'}
                    format="DD MMM YYYY"
                  />
                </div>
              </div>

              <div>
                <Typography.Text strong>Filter Data</Typography.Text>
                <div style={{ marginTop: 8 }}>
                  <Select
                    placeholder="Status"
                    allowClear
                    style={{ width: '100%', marginBottom: 8 }}
                    options={[
                      { label: 'Semua Status', value: '' },
                      ...Object.keys(statusMap).map(k => ({ label: statusMap[k].text, value: k }))
                    ]}
                    value={status}
                    onChange={setStatus}
                  />
                  <Select
                    placeholder="Unit Pengolah"
                    allowClear
                    style={{ width: '100%', marginBottom: 8 }}
                    options={units.map(u => ({ label: u.nama || u.fungsi_bidang, value: u.id }))}
                    value={unitId}
                    onChange={setUnitId}
                  />
                  <Select
                    placeholder="Nama Peminjam"
                    allowClear
                    showSearch
                    style={{ width: '100%' }}
                    options={borrowers.map(b => ({ label: b, value: b }))}
                    value={borrowerName}
                    onChange={setBorrowerName}
                  />
                </div>
              </div>

              <Button type="primary" block icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
                Terapkan Filter
              </Button>

              <Divider />

              <Typography.Text strong>Ekspor</Typography.Text>
              <Space direction="vertical" style={{ width: '100%', marginTop: 8 }}>
                <Button block icon={<DownloadOutlined />} onClick={() => handleDownload('pdf')} loading={downloadLoading.pdf}>Unduh PDF</Button>
                <Button block icon={<FileExcelOutlined />} onClick={() => handleDownload('excel')} loading={downloadLoading.excel}>Unduh Excel</Button>
              </Space>
            </Space>
          </Card>
        </Col>

        {/* Main Content Column */}
        <Col xs={24} lg={18}>
          {/* Stats Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={8}>
              <Card variant="borderless" className="stat-card">
                <Statistic
                  title="Total Permohonan"
                  value={summary.total}
                  prefix={<PieChartOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card variant="borderless" className="stat-card">
                <Statistic
                  title="Tingkat Pengembalian"
                  value={statusDistribution[0].percent}
                  precision={1}
                  suffix="%"
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card variant="borderless" className="stat-card">
                <Statistic
                  title="Sedang Dipinjam"
                  value={summary.by_status?.dipinjam || 0}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Distribution Bar */}
          <Card title={<Space><BarChartOutlined /> Distribusi Status</Space>} variant="borderless" style={{ marginBottom: 24 }}>
            <Row gutter={24} align="middle">
              <Col span={24}>
                <div style={{ display: 'flex', marginBottom: 8 }}>
                  {statusDistribution.map((item, idx) => (
                    <div key={idx} style={{ flex: item.percent, height: 24, background: item.color, marginRight: 2, borderRadius: 2 }} />
                  ))}
                </div>
                <Space size="large" wrap>
                  {statusDistribution.map((item, idx) => (
                    <Space key={idx} size={4}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                      <Typography.Text type="secondary">{item.label}: {item.count} ({item.percent.toFixed(0)}%)</Typography.Text>
                    </Space>
                  ))}
                </Space>
              </Col>
            </Row>
          </Card>

          {/* Data Table */}
          <Card title="Detail Data Peminjaman" variant="borderless" extra={<Typography.Text type="secondary">{report.length} Baris Data</Typography.Text>}>
            <Table
              columns={columns}
              dataSource={report}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10, showSizeChanger: true }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default LaporanPeminjaman;
