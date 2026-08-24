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
  Table,
  Timeline,
  Row,
  Col,
  Tabs,
  Badge,
  Alert,
  Dropdown,
} from 'antd';
import {
  CheckCircleFilled,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  HistoryOutlined,
  HourglassOutlined,
  TeamOutlined,
  ExclamationCircleOutlined,
  CalendarOutlined,
  SafetyCertificateOutlined,
  MoreOutlined,
  SyncOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { buildMessageAdapter } from '../utils/notify.js';
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

/* ── Avatar Pegawai — inisial + warna HSL deterministik ─────────── */
const getInitials = (name) =>
  name
    ? name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    : '?';

const getHue = (name) =>
  name ? [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360 : 210;

const EmployeeAvatar = ({ name, size = 36, fontSize = 12 }) => {
  const hue = getHue(name);
  return (
    <span
      className="kgb-avatar"
      style={{
        width: size,
        height: size,
        fontSize,
        background: `linear-gradient(135deg, hsl(${hue}, 68%, 54%) 0%, hsl(${hue}, 72%, 40%) 100%)`,
      }}
    >
      {getInitials(name)}
    </span>
  );
};

/* ── KPI Card — icon tile pastel + angka ExtraBold ──────────────── */
const KpiCard = ({ title, value, icon, tone, hint }) => (
  <div className={`kgb-kpi kgb-kpi--${tone}`}>
    <div className="kgb-kpi-icon">{icon}</div>
    <div className="kgb-kpi-body">
      <div className="kgb-kpi-title">{title}</div>
      <div className="kgb-kpi-value">{value}</div>
      {hint && <div className="kgb-kpi-hint">{hint}</div>}
    </div>
  </div>
);

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
        <div className="kgb-employee-cell">
          <EmployeeAvatar name={r.nama} />
          <div className="kgb-employee-meta">
            <strong>{r.nama}</strong>
            <small>{r.nip}</small>
          </div>
        </div>
      )
    },
    {
      title: 'Pangkat / Gol',
      dataIndex: 'pangkat',
      key: 'pangkat',
      render: (text) => text ? <span className="kgb-pangkat-tag">{text}</span> : <span className="kgb-muted">—</span>
    },
    {
      title: 'Status KGB',
      key: 'status',
      render: (_, r) => (
        <span className={`kgb-status kgb-status--${r.status.type}`}>
          {r.status.icon}
          {r.status.label}
        </span>
      )
    },
    {
      title: 'KGB Terakhir',
      key: 'last',
      render: (_, r) => r.latestKgb ? (
        <div className="kgb-last-meta">
          <span className="kgb-last-tmt">TMT {dayjs(r.latestKgb.tmtSk).format('DD MMM YYYY')}</span>
          <span className="kgb-last-mk">MK: {r.latestKgb.lamaKerja} Tahun</span>
        </div>
      ) : <span className="kgb-muted">—</span>
    },
    {
      title: 'Jadwal Berikutnya',
      key: 'next',
      render: (_, r) => {
        const next = computeNextKgbDate(r.latestKgb);
        return next ? (
          <span className="kgb-next-date">
            <CalendarOutlined />
            {next.format('DD MMM YYYY')}
          </span>
        ) : <span className="kgb-muted">—</span>
      }
    },
    {
      title: 'Aksi',
      key: 'action',
      align: 'center',
      width: 70,
      render: (_, r) => {
        const items = [
          {
            key: 'process',
            label: 'Proses KGB',
            icon: <SafetyCertificateOutlined style={{ color: '#16a34a' }} />,
            onClick: () => handleProcessKgb(r)
          },
          {
            key: 'history',
            label: 'Riwayat',
            icon: <HistoryOutlined style={{ color: '#2563eb' }} />,
            onClick: () => { setSelectedEmployee(r); setHistoryModalOpen(true); }
          }
        ];
        return (
          <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
            <Button type="text" className="kgb-more-btn" icon={<MoreOutlined />} />
          </Dropdown>
        );
      }
    }
  ];

  return (
    <div className="module-section">
      {/* ── Header Card ── */}
      <div className="kgb-header-card">
        <div className="kgb-header-left">
          <div className="kgb-header-icon">
            <SafetyCertificateOutlined />
          </div>
          <div>
            <div className="kgb-title">Kenaikan Gaji Berkala</div>
            <div className="kgb-subtitle">
              Pantau masa kerja golongan dan proses kenaikan gaji berkala pegawai secara otomatis.
            </div>
          </div>
        </div>
        <div className="kgb-header-right">
          <span className="kgb-date-badge">
            <CalendarOutlined />
            {today.format('dddd, DD MMM YYYY')}
          </span>
          <Button
            className="kgb-refresh-btn"
            icon={<SyncOutlined spin={loading} />}
            onClick={fetchEmployees}
            disabled={loading}
          >
            Muat Ulang
          </Button>
        </div>
      </div>

      {/* ── KPI Summary ── */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            title="Total Pegawai"
            value={stats.total}
            icon={<TeamOutlined />}
            tone="blue"
            hint="Seluruh pegawai aktif"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            title="Perlu Diproses"
            value={stats.overdue}
            icon={<ExclamationCircleOutlined />}
            tone="red"
            hint="Jadwal sudah terlewat"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            title="Siap Diajukan"
            value={stats.ready}
            icon={<CheckCircleFilled />}
            tone="amber"
            hint="H-60 atau kurang"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            title="Akan Datang"
            value={stats.upcoming}
            icon={<HourglassOutlined />}
            tone="cyan"
            hint="H-61 ke atas"
          />
        </Col>
      </Row>

      {/* ── Main Table Card ── */}
      <div className="kgb-card">
        <div className="kgb-toolbar">
          <Input
            allowClear
            className="kgb-search"
            placeholder="Cari nama atau NIP pegawai..."
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            className="kgb-tabs"
            items={[
              {
                key: 'eligible',
                label: <Badge count={stats.overdue + stats.ready} offset={[8, 0]}><span>Siap Proses</span></Badge>,
              },
              { key: 'all', label: 'Semua Pegawai' },
            ]}
          />
        </div>

        {activeTab === 'eligible' && (stats.overdue + stats.ready === 0) ? (
          <div className="kgb-empty-state">
            <div className="kgb-empty-icon"><CheckCircleFilled /></div>
            <div className="kgb-empty-title">Semua Beres!</div>
            <div className="kgb-empty-desc">Tidak ada pegawai yang perlu diproses KGB saat ini.</div>
          </div>
        ) : (
          <Table
            columns={commonColumns}
            dataSource={filteredData}
            rowKey="id"
            loading={loading}
            className="kgb-table"
            scroll={{ x: 920 }}
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
      </div>

      {/* ── Modal Input KGB ── */}
      <Modal
        className="kgb-modal"
        title={editingRecord ? 'Edit Data KGB' : 'Proses Kenaikan Gaji Berkala'}
        open={inputModalOpen}
        onCancel={() => setInputModalOpen(false)}
        onOk={() => form.submit()}
        okText="Simpan & Proses"
        cancelText="Batal"
        width={520}
        confirmLoading={submitting}
      >
        <Alert
          className="kgb-modal-alert"
          message={editingRecord ? 'Mode Edit — perbarui data SK dengan benar.' : 'Pastikan data SK sudah benar sebelum menyimpan.'}
          type="info"
          showIcon
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

      {/* ── Modal Riwayat ── */}
      <Modal
        className="kgb-modal"
        title={`Riwayat KGB — ${selectedEmployee?.nama ?? ''}`}
        open={historyModalOpen}
        onCancel={() => setHistoryModalOpen(false)}
        footer={null}
      >
        {selectedEmployee?.kgbHistory?.length > 0 ? (
          <Timeline
            mode="left"
            items={selectedEmployee.kgbHistory.map(h => ({
              key: h.id,
              dot: <CheckCircleFilled style={{ color: '#10B981' }} />,
              children: (
                <div className="kgb-history-item">
                  <div className="kgb-history-head">
                    <span className="kgb-history-tmt">TMT {dayjs(h.tmtSk).format('DD MMM YYYY')}</span>
                    <span className="kgb-history-actions">
                      <EditOutlined onClick={() => handleProcessKgb(selectedEmployee, h)} title="Edit" />
                      <DeleteOutlined onClick={() => handleDeleteRecord(h)} title="Hapus" />
                    </span>
                  </div>
                  <div className="kgb-history-meta">
                    <span>SK No: {h.nomorSk}</span>
                    <span className="kgb-history-mk">MK: {h.lamaKerja} Tahun</span>
                  </div>
                </div>
              ),
            }))}
          />
        ) : (
          <div className="kgb-history-empty">Belum ada riwayat KGB untuk pegawai ini.</div>
        )}
      </Modal>
    </div>
  );
};

export default Kgb;
