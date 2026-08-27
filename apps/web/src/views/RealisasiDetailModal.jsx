import { Modal, Typography, Tag, Descriptions, Table, Card, Space, Divider, Button } from 'antd';
import {
  ShoppingOutlined,
  GlobalOutlined,
  UserOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  DollarOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

const formatCurrency = (val) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val ?? 0);

const RealisasiDetailModal = ({ open, onClose, record }) => {
  if (!record) return null;

  const isPembelian = record.transaction_type === 'Pembelian';
  const details = record.details || {};

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" type="primary" size="small" onClick={onClose} icon={<CheckCircleOutlined />} style={{ fontSize: '12px' }}>
          Tutup
        </Button>,
      ]}
      width={720}
      style={{ top: 20 }}
      title={
        <Space align="center" size="middle">
          {isPembelian ? (
            <ShoppingOutlined style={{ fontSize: 18, color: '#0F5B99' }} />
          ) : (
            <GlobalOutlined style={{ fontSize: 18, color: '#6366f1' }} />
          )}
          <div>
            <Title level={5} style={{ margin: 0, fontSize: '14px' }}>
              Detail Realisasi: {record.transaction_number}
            </Title>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {isPembelian ? 'Rincian Belanja / Invoice Pembelian' : 'Rincian Realisasi Perjalanan Dinas'}
            </Text>
          </div>
        </Space>
      }
    >
      <Divider style={{ margin: '10px 0 14px 0' }} />

      {/* Basic Transaction Info — column={1} layout so label & content never squeeze vertically */}
      <Descriptions
        bordered
        size="small"
        column={1}
        contentStyle={{ fontSize: '12px', wordBreak: 'normal', color: '#1e293b' }}
        labelStyle={{ fontSize: '12px', fontWeight: 600, width: '160px', minWidth: '160px', background: '#f8fafc', whiteSpace: 'nowrap' }}
      >
        <Descriptions.Item label="Jenis Transaksi">
          <Tag color={isPembelian ? 'blue' : 'purple'} style={{ fontWeight: 600, fontSize: '11px' }}>
            {isPembelian ? 'Pembelian (Invoice)' : 'Perjadin (LPJ/ST)'}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Status">
          <Tag color="green" style={{ textTransform: 'capitalize', fontSize: '11px' }}>
            {record.status || 'Disetujui'}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="No ST / INV">
          <Text code style={{ fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {record.transaction_number}
          </Text>
        </Descriptions.Item>
        <Descriptions.Item label="Tanggal">
          <Space size="xs">
            <CalendarOutlined style={{ color: '#64748b', fontSize: '12px' }} />
            <span style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>{record.date || '-'}</span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="Kode Akun">
          <Text code style={{ color: '#0f172a', fontSize: '12px', whiteSpace: 'nowrap' }}>{record.mak}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="Pembuat / Pengaju">
          <Space size="xs">
            <UserOutlined style={{ color: '#64748b', fontSize: '12px' }} />
            <Text strong style={{ fontSize: '12px' }}>{record.employee_name || '-'}</Text>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="Uraian / Deskripsi">
          <Paragraph style={{ margin: 0, fontSize: '12px', lineHeight: 1.5 }}>
            {record.description || '-'}
          </Paragraph>
        </Descriptions.Item>
      </Descriptions>

      {/* Section khusus Pembelian (Invoice Belanja) */}
      {isPembelian && (
        <div style={{ marginTop: 16 }}>
          <Title level={5} style={{ fontSize: '13px', marginBottom: 8, color: '#0F5B99' }}>
            <DollarOutlined /> Rincian Nilai Pembelian & Pajak
          </Title>

          <Card size="small" style={{ background: '#f8fafc', borderRadius: 6, borderColor: '#e2e8f0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, textAlign: 'center' }}>
              <div style={{ background: '#fff', padding: '8px', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>Nilai Bruto (Kotor)</Text>
                <Text strong style={{ fontSize: '12px', color: '#334155' }}>
                  {formatCurrency(details.nilai_kotor || record.value)}
                </Text>
              </div>

              <div style={{ background: '#fff', padding: '8px', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>Total Pajak</Text>
                <Text strong style={{ fontSize: '12px', color: '#ef4444' }}>
                  - {formatCurrency(details.total_pajak || 0)}
                </Text>
              </div>

              <div style={{ background: '#eff6ff', padding: '8px', borderRadius: 4, border: '1px solid #bfdbfe' }}>
                <Text type="secondary" style={{ fontSize: '11px', display: 'block', color: '#1e40af' }}>
                  Nilai Bersih (Bruto - Pajak)
                </Text>
                <Text strong style={{ fontSize: '13px', color: '#0F5B99' }}>
                  {formatCurrency(details.nilai_bersih || record.value)}
                </Text>
              </div>
            </div>
          </Card>

          {/* Tabel Rincian Pajak jika ada */}
          {details.taxes && details.taxes.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <Text strong style={{ fontSize: '12px', display: 'block', marginBottom: 4 }}>
                Potongan Pajak Berlaku:
              </Text>
              <Table
                dataSource={details.taxes}
                rowKey={(r, idx) => idx}
                pagination={false}
                size="small"
                bordered
                columns={[
                  {
                    title: 'Jenis Pajak',
                    dataIndex: 'tax_type',
                    key: 'tax_type',
                    render: (t) => <Tag color="orange" style={{ fontSize: '11px' }}>{t}</Tag>,
                  },
                  {
                    title: 'Tarif (%)',
                    dataIndex: 'tax_rate',
                    key: 'tax_rate',
                    align: 'center',
                    render: (r) => <span style={{ fontSize: '12px' }}>{r}%</span>,
                  },
                  {
                    title: 'Nominal Pajak',
                    dataIndex: 'tax_amount',
                    key: 'tax_amount',
                    align: 'right',
                    render: (v) => <span style={{ fontSize: '12px' }}>{formatCurrency(v)}</span>,
                  },
                ]}
              />
            </div>
          )}
        </div>
      )}

      {/* Section khusus Perjadin (Surat Tugas / LPJ) */}
      {!isPembelian && (
        <div style={{ marginTop: 16 }}>
          <Title level={5} style={{ fontSize: '13px', marginBottom: 8, color: '#6366f1' }}>
            <EnvironmentOutlined /> Detail Perjalanan Dinas
          </Title>

          <Descriptions
            bordered
            size="small"
            column={1}
            contentStyle={{ fontSize: '12px', color: '#1e293b' }}
            labelStyle={{ fontSize: '12px', fontWeight: 600, width: '160px', minWidth: '160px', background: '#f8fafc', whiteSpace: 'nowrap' }}
            style={{ marginBottom: 14 }}
          >
            <Descriptions.Item label="Tempat Bertugas">
              <Space size="xs">
                <EnvironmentOutlined style={{ color: '#ef4444', fontSize: '12px' }} />
                <Text strong style={{ color: '#0f172a', fontSize: '12px' }}>
                  {details.lokasi_tugas || '-'}
                </Text>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Lama Bertugas">
              <Text strong style={{ color: '#2563eb', fontSize: '12px' }}>
                {details.lama_hari || '-'}
              </Text>
            </Descriptions.Item>
          </Descriptions>

          {/* Tabel Daftar Semua Petugas */}
          <div style={{ marginBottom: 14 }}>
            <Text strong style={{ fontSize: '12px', display: 'block', marginBottom: 6 }}>
              Daftar Nama Semua Petugas Bertugas:
            </Text>
            <Table
              dataSource={details.petugas_list || []}
              rowKey={(r, idx) => idx}
              pagination={false}
              size="small"
              bordered
              columns={[
                {
                  title: 'No',
                  key: 'no',
                  width: 45,
                  align: 'center',
                  render: (_, __, idx) => <span style={{ fontSize: '12px' }}>{idx + 1}</span>,
                },
                {
                  title: 'Nama Petugas',
                  key: 'nama',
                  render: (record) => (
                    <Text strong style={{ fontSize: '12px' }}>
                      {record.nama || record.employee_name || '-'}
                    </Text>
                  ),
                },
                {
                  title: 'NIP',
                  key: 'nip',
                  render: (record) => (
                    <Text code style={{ fontSize: '11px' }}>
                      {record.nip || record.employee_nip || '-'}
                    </Text>
                  ),
                },
                {
                  title: 'Jabatan',
                  key: 'jabatan',
                  render: (record) => (
                    <span style={{ fontSize: '12px' }}>
                      {record.jabatan || record.position || '-'}
                    </span>
                  ),
                },
              ]}
            />
          </div>

          {/* Rincian Realisasi Biaya Perjadin */}
          {details.lpj_items && details.lpj_items.length > 0 && (
            <div>
              <Text strong style={{ fontSize: '12px', display: 'block', marginBottom: 6 }}>
                Rincian Biaya LPJ Perjadin Per Petugas:
              </Text>
              <Table
                dataSource={details.lpj_items}
                rowKey={(r, idx) => idx}
                pagination={false}
                size="small"
                bordered
                columns={[
                  {
                    title: 'Nama Petugas',
                    dataIndex: 'employee_name',
                    key: 'employee_name',
                    render: (t) => <span style={{ fontSize: '12px' }}>{t}</span>,
                  },
                  {
                    title: 'Uang Harian',
                    dataIndex: 'uang_harian',
                    key: 'uang_harian',
                    align: 'right',
                    render: (v) => <span style={{ fontSize: '12px' }}>{formatCurrency(v)}</span>,
                  },
                  {
                    title: 'Penginapan',
                    dataIndex: 'uang_penginapan',
                    key: 'uang_penginapan',
                    align: 'right',
                    render: (v) => <span style={{ fontSize: '12px' }}>{formatCurrency(v)}</span>,
                  },
                  {
                    title: 'Transport',
                    dataIndex: 'uang_transport',
                    key: 'uang_transport',
                    align: 'right',
                    render: (v) => <span style={{ fontSize: '12px' }}>{formatCurrency(v)}</span>,
                  },
                  {
                    title: 'Total Biaya',
                    dataIndex: 'total',
                    key: 'total',
                    align: 'right',
                    render: (v) => <Text strong style={{ color: '#0F5B99', fontSize: '12px' }}>{formatCurrency(v)}</Text>,
                  },
                ]}
              />
            </div>
          )}

          <Card
            size="small"
            style={{
              marginTop: 12,
              background: '#f8fafc',
              borderColor: '#cbd5e1',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItem: 'center', width: '100%' }}>
              <Text style={{ fontSize: '12px', fontWeight: 600 }}>Total Realisasi Perjadin:</Text>
              <Text strong style={{ fontSize: '14px', color: '#0F5B99' }}>
                {formatCurrency(record.value)}
              </Text>
            </div>
          </Card>
        </div>
      )}
    </Modal>
  );
};

export default RealisasiDetailModal;
