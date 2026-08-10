import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  App as AntdApp,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Timeline,
  Tooltip,
  Typography,
  Card,
  Row,
  Col,
  Tabs,
  Badge,
  Alert,
  Dropdown,
} from 'antd';
import { buildMessageAdapter } from '../utils/notify.js';
import {
  CheckCircleFilled,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  FileAddOutlined,
  HistoryOutlined,
  HourglassOutlined,
  TeamOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
  FilterOutlined,
  ArrowRightOutlined,
  CalendarOutlined,
  SafetyCertificateOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import StatisticCard from '../components/StatisticCard.jsx';
import { useAuth } from '../hooks/useAuth.js';
import './Kgb.css';

const dateFormat = 'YYYY-MM-DD';

const mapKgbRecord = (record) => ({
  id: record.id,
  nomorSk: record.nomor_sk,
  tanggalSk: record.tanggal_sk,
  tmtSk: record.tmt_sk,
  lamaKerja: record.lama_kerja_tahun ?? record.lama_kerja,
});

const mapEmployee = (employee) => ({
  id: employee.id,
  key: employee.id,
  nip: employee.nip,
  nama: employee.name,
  pangkat: employee.pangkat,
  jabatan: employee.position,
  kgbHistory: (employee.kgbRecords ?? employee.kgb_records ?? []).map(mapKgbRecord),
});

const Kgb = () => {
  const today = dayjs().startOf('day');
  const { apiFetch } = useAuth();
  const { modal, message } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);
  const [form] = Form.useForm();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  const [activeTab, setActiveTab] = useState('eligible');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset to page 1 on search or tab change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  const [inputModalOpen, setInputModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const computeNextKgbDate = useCallback((record) => {
    if (!record || !record.tmtSk) return null;
    return dayjs(record.tmtSk).add(2, 'year').startOf('day');
  }, []);

  const computeLatestKgb = useCallback((history = []) => {
    if (!history.length) return null;
    return [...history].sort((a, b) => dayjs(b.tmtSk).diff(dayjs(a.tmtSk)))[0];
  }, []);

  const deriveKgbStatus = useCallback((record) => {
    const nextKgb = computeNextKgbDate(record);
    if (!nextKgb) return { type: 'empty', label: 'Belum Ada Riwayat', color: 'default', icon: <ClockCircleOutlined /> };

    const diff = nextKgb.diff(today, 'day');
    if (diff < 0) return { type: 'overdue', label: `Terlewat ${Math.abs(diff)} Hari`, color: 'red', icon: <ExclamationCircleOutlined /> };
    if (diff <= 60) return { type: 'ready', label: `Siap (H-${diff})`, color: 'orange', icon: <CheckCircleFilled /> };
    return { type: 'upcoming', label: `H-${diff}`, color: 'blue', icon: <HourglassOutlined /> };
  }, [computeNextKgbDate, today]);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const pageSize = 200;
      let page = 1;
      let lastPage = 1;
      const allRows = [];
      do {
        const response = await apiFetch(`/employees?page=${page}&pageSize=${pageSize}`);
        if (!response.ok) throw new Error('Gagal memuat data.');
        const payload = await response.json();
        allRows.push(...(payload.data ?? []));
        lastPage = payload?.meta?.last_page ?? 1;
        page += 1;
      } while (page <= lastPage);

      const mapped = allRows.map(mapEmployee);
      setEmployees(mapped);
      return mapped;
    } catch (error) {
      notification.error({ message: 'Gagal memuat data', description: error.message });
      return [];
    } finally {
      setLoading(false);
    }
  }, [apiFetch, notification]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const updateEmployeeHistory = useCallback((employeeId, historyUpdater) => {
    setEmployees(prev => prev.map(emp => {
      if (emp.id !== employeeId) return emp;
      const nextHistory = historyUpdater(emp.kgbHistory);
      const sortedHistory = [...nextHistory].sort((a, b) => dayjs(b.tmtSk).diff(dayjs(a.tmtSk)));
      return { ...emp, kgbHistory: sortedHistory };
    }));
  }, []);

  const handleProcessKgb = (employee, recordToEdit = null) => {
    setSelectedEmployee(employee);
    setEditingRecord(recordToEdit);
    if (recordToEdit) {
      form.setFieldsValue({
        nomorSk: recordToEdit.nomorSk,
        tanggalSk: dayjs(recordToEdit.tanggalSk),
        tmtSk: dayjs(recordToEdit.tmtSk),
        lamaKerja: recordToEdit.lamaKerja,
      });
    } else {
      const latest = computeLatestKgb(employee.kgbHistory);
      const nextDate = computeNextKgbDate(latest);
      form.setFieldsValue({
        nomorSk: '',
        tanggalSk: dayjs(),
        tmtSk: nextDate || dayjs(),
        lamaKerja: latest ? parseInt(latest.lamaKerja) + 2 : 2,
      });
    }
    setInputModalOpen(true);
  };

  const handleSaveKgb = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        nomor_sk: values.nomorSk,
        tanggal_sk: values.tanggalSk.format(dateFormat),
        tmt_sk: values.tmtSk.format(dateFormat),
        lama_kerja_tahun: values.lamaKerja,
      };
      const url = editingRecord
        ? `/employees/${selectedEmployee.id}/kgb/${editingRecord.id}`
        : `/employees/${selectedEmployee.id}/kgb`;
      const response = editingRecord
        ? await apiFetch(url, { method: 'PUT', body: JSON.stringify(payload) })
        : await apiFetch(url, { method: 'POST', body: JSON.stringify(payload) });

      if (!response.ok) throw new Error('Gagal menyimpan data.');
      await fetchEmployees();
      setInputModalOpen(false);
      notification.success({ message: 'Berhasil', description: 'Data KGB tersimpan.' });
    } catch (error) {
      notification.error({ message: 'Gagal', description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRecord = (record) => {
    modal.confirm({
      title: 'Hapus Riwayat?',
      content: 'Tindakan ini tidak dapat dibatalkan.',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const response = await apiFetch(`/employees/${selectedEmployee.id}/kgb/${record.id}`, { method: 'DELETE' });
          if (!response.ok) throw new Error('Gagal menghapus data KGB.');
          updateEmployeeHistory(selectedEmployee.id, (h) => h.filter(i => i.id !== record.id));
          notification.success({ message: 'Terhapus' });
        } catch (e) {
          notification.error({ message: 'Gagal', description: e.message });
        }
      }
    });
  };

  const processedEmployees = useMemo(() => {
    return employees.map(e => {
      const latest = computeLatestKgb(e.kgbHistory);
      const status = deriveKgbStatus(latest);
      return { ...e, latestKgb: latest, status };
    });
  }, [employees, computeLatestKgb, deriveKgbStatus]);

  const stats = useMemo(() => ({
    total: processedEmployees.length,
    overdue: processedEmployees.filter(e => e.status.type === 'overdue').length,
    ready: processedEmployees.filter(e => e.status.type === 'ready').length,
    upcoming: processedEmployees.filter(e => e.status.type === 'upcoming').length,
  }), [processedEmployees]);

  const filteredData = useMemo(() => {
    let data = processedEmployees;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(e => e.nama.toLowerCase().includes(term) || e.nip.includes(term));
    }
    if (activeTab === 'eligible') {
      return data.filter(e => ['overdue', 'ready'].includes(e.status.type)).sort((a, b) => {
        if (a.status.type === b.status.type) return 0;
        return a.status.type === 'overdue' ? -1 : 1;
      });
    }
    return data.sort((a, b) => a.nama.localeCompare(b.nama));
  }, [processedEmployees, searchTerm, activeTab]);

  const commonColumns = [
    {
      title: 'Pegawai',
      key: 'nama',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{r.nama}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{r.nip}</Typography.Text>
        </Space>
      )
    },
    {
      title: 'Pangkat/Gol',
      dataIndex: 'pangkat',
      key: 'pangkat',
      render: (text) => <Tag color="blue">{text}</Tag>
    },
    {
      title: 'Status KGB',
      key: 'status',
      render: (_, r) => (
        <Tag icon={r.status.icon} color={r.status.color}>{r.status.label}</Tag>
      )
    },
    {
      title: 'KGB Terakhir',
      key: 'last',
      render: (_, r) => r.latestKgb ? (
        <Space direction="vertical" size={0} style={{ fontSize: 12 }}>
          <Typography.Text>TMT: {dayjs(r.latestKgb.tmtSk).format('DD MMM YYYY')}</Typography.Text>
          <Typography.Text type="secondary">MK: {r.latestKgb.lamaKerja} Tahun</Typography.Text>
        </Space>
      ) : <Typography.Text type="secondary">-</Typography.Text>
    },
    {
      title: 'Jadwal Berikutnya',
      key: 'next',
      render: (_, r) => {
        const next = computeNextKgbDate(r.latestKgb);
        return next ? (
          <Space>
            <CalendarOutlined />
            {next.format('DD MMM YYYY')}
          </Space>
        ) : '-'
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
            key: 'process',
            label: 'Proses KGB',
            icon: <SafetyCertificateOutlined style={{ color: '#52c41a' }} />,
            onClick: () => handleProcessKgb(r)
          },
          {
            key: 'history',
            label: 'Riwayat',
            icon: <HistoryOutlined style={{ color: '#1890ff' }} />,
            onClick: () => { setSelectedEmployee(r); setHistoryModalOpen(true); }
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
      <div className="module-toolbar">
        <div>
          <Typography.Title level={4} className="module-title">Kenaikan Gaji Berkala</Typography.Title>
          <Typography.Text className="module-subtitle">Monitor dan proses kenaikan gaji berkala pegawai secara otomatis.</Typography.Text>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={6}>
          <StatisticCard title="Total Pegawai" value={stats.total} icon={<TeamOutlined />} color="#1890ff" />
        </Col>
        <Col xs={24} sm={6}>
          <StatisticCard title="Perlu Diproses (Telat)" value={stats.overdue} icon={<ExclamationCircleOutlined />} color="#f5222d" />
        </Col>
        <Col xs={24} sm={6}>
          <StatisticCard title="Siap Diajukan" value={stats.ready} icon={<CheckCircleFilled />} color="#faad14" />
        </Col>
        <Col xs={24} sm={6}>
          <StatisticCard title="Akan Datang" value={stats.upcoming} icon={<HourglassOutlined />} color="#13c2c2" />
        </Col>
      </Row>

      <Card variant="borderless" style={{ borderRadius: 12, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.03)' }} styles={{ body: { padding: '24px' } }}>
        <div className="data-filter-row">
          <Input.Search
            placeholder="Cari Pegawai..."
            allowClear
            size="large"
            onSearch={setSearchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ maxWidth: 400, width: '100%', borderRadius: 8 }}
          />
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          tabBarStyle={{ marginBottom: 16 }}
          items={[
            {
              key: 'eligible',
              label: <Badge count={stats.overdue + stats.ready} offset={[10, 0]}><span>Siap Proses / Eligible</span></Badge>,
            },
            { key: 'all', label: 'Semua Data Pegawai' },
          ]}
        />

        {activeTab === 'eligible' && (stats.overdue + stats.ready === 0) ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <CheckCircleFilled style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
            <Typography.Title level={4}>Semua Beres!</Typography.Title>
            <Typography.Text type="secondary">Tidak ada pegawai yang perlu diproses KGB saat ini.</Typography.Text>
          </div>
        ) : (
          <Table
            columns={commonColumns}
            dataSource={filteredData}
            rowKey="id"
            loading={loading}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: filteredData.length,
              onChange: (page, pSize) => {
                setCurrentPage(page);
                setPageSize(pSize);
              },
              showSizeChanger: true,
              pageSizeOptions: ['10', '15', '25', '50', '100'],
              showTotal: (total, range) => `Menampilkan ${range[0]}-${range[1]} dari ${total} data KGB`,
            }}
          />
        )}
      </Card>

      <Modal
        title={editingRecord ? "Edit Data KGB" : "Proses Kenaikan Gaji Berkala"}
        open={inputModalOpen}
        onCancel={() => setInputModalOpen(false)}
        onOk={() => form.submit()}
        okText="Simpan & Proses"
        cancelText="Batal"
        width={500}
        confirmLoading={submitting}
      >
        <Alert
          message={editingRecord ? "Mode Edit" : "Pastikan data SK sudah benar sebelum menyimpan."}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={form} layout="vertical" requiredMark={false} onFinish={handleSaveKgb}>
          <Form.Item label="Nomor SK" name="nomorSk" rules={[{ required: true }]}>
            <Input placeholder="Contoh: 822.3/001/2026" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Tanggal SK" name="tanggalSk" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format={dateFormat} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="TMT Berlaku" name="tmtSk" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format={dateFormat} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Masa Kerja Golongan (Tahun)" name="lamaKerja" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Riwayat KGB - ${selectedEmployee?.nama}`}
        open={historyModalOpen}
        onCancel={() => setHistoryModalOpen(false)}
        footer={null}
      >
        <Timeline mode="left">
          {selectedEmployee?.kgbHistory?.length > 0 ? selectedEmployee.kgbHistory.map(h => (
            <Timeline.Item key={h.id} color="green">
              <Space direction="vertical" size={0} style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography.Text strong>TMT {dayjs(h.tmtSk).format('DD MMM YYYY')}</Typography.Text>
                  <Space>
                    <EditOutlined onClick={() => handleProcessKgb(selectedEmployee, h)} style={{ cursor: 'pointer', color: '#faad14' }} />
                    <DeleteOutlined onClick={() => handleDeleteRecord(h)} style={{ cursor: 'pointer', color: '#ff4d4f' }} />
                  </Space>
                </div>
                <Typography.Text type="secondary">SK No: {h.nomorSk}</Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>Masa Kerja: {h.lamaKerja} Tahun</Typography.Text>
              </Space>
            </Timeline.Item>
          )) : <Typography.Text>Belum ada riwayat.</Typography.Text>}
        </Timeline>
      </Modal>
    </div>
  );
};

export default Kgb;
