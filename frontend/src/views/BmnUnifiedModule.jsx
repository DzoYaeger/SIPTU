import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import {
  ArrowLeftOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  FundOutlined,
  DropboxOutlined,
  ShoppingOutlined,
  ToolOutlined,
  HistoryOutlined,
  PlusCircleOutlined,
  FileTextOutlined,
  CalendarOutlined,
  TagOutlined,
  EyeOutlined,
  FilePdfOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { Card, Table, Tag, Button, Tooltip, Typography, Spin, Badge, Modal } from 'antd';
import dayjs from 'dayjs';

// Sub-component imports for form & features
import PublicAssetLoanPage from '../pages/PublicAssetLoanPage.jsx';
import PublicInventoryRequestPage from '../pages/PublicInventoryRequestPage.jsx';
import BmnPemeliharaanKeluhan from './BmnPemeliharaanKeluhan.jsx';
import BmnMaintenanceReportForm from '../pages/BmnMaintenanceReportForm.jsx';

import './BmnUnifiedModule.css';

const { Title, Text } = Typography;

const BmnUnifiedModule = () => {
  const { user, currentRole, apiFetch } = useAuth();
  const [activeTab, setActiveTab] = useState('peminjaman-new'); // default sub-tab
  const [complaintMode, setComplaintMode] = useState('auto'); // 'auto' | 'form' | 'manage'
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // State for user's BMN loan history
  const [myLoans, setMyLoans] = useState([]);
  const [loadingLoans, setLoadingLoans] = useState(false);

  // State for user's inventory request history
  const [myInventory, setMyInventory] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(false);

  // Detail Modal states
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [loanModalOpen, setLoanModalOpen] = useState(false);

  const [selectedInventory, setSelectedInventory] = useState(null);
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);

  // Fetch my loans (filtered for logged in user)
  useEffect(() => {
    if (activeTab === 'peminjaman-history') {
      (async () => {
        try {
          setLoadingLoans(true);
          const res = await apiFetch('/bmn-loans/my-loans');
          if (res && res.ok) {
            const data = await res.json();
            setMyLoans(Array.isArray(data) ? data : []);
          } else if (Array.isArray(res)) {
            setMyLoans(res);
          } else {
            setMyLoans([]);
          }
        } catch (e) {
          console.error('Error fetching BMN loans:', e);
          setMyLoans([]);
        } finally {
          setLoadingLoans(false);
        }
      })();
    }
  }, [activeTab, apiFetch]);

  // Fetch my inventory requests (filtered for logged in user)
  useEffect(() => {
    if (activeTab === 'persediaan-history') {
      (async () => {
        try {
          setLoadingInventory(true);
          const res = await apiFetch('/bmn/inventory-requests');
          if (res && res.ok) {
            const data = await res.json();
            setMyInventory(Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []);
          } else if (res && (res.data || Array.isArray(res))) {
            setMyInventory(Array.isArray(res.data) ? res.data : res);
          } else {
            setMyInventory([]);
          }
        } catch (e) {
          console.error('Error fetching inventory requests:', e);
          setMyInventory([]);
        } finally {
          setLoadingInventory(false);
        }
      })();
    }
  }, [activeTab, apiFetch]);

  const menuItems = [
    {
      group: 'PEMINJAMAN',
      items: [
        {
          key: 'peminjaman-new',
          label: 'Peminjaman BMN',
          icon: <PlusCircleOutlined />,
        },
        {
          key: 'peminjaman-history',
          label: 'Riwayat Peminjaman',
          icon: <HistoryOutlined />,
        },
      ],
    },
    {
      group: 'PERSEDIAAN',
      items: [
        {
          key: 'persediaan-new',
          label: 'Permintaan Persediaan',
          icon: <ShoppingOutlined />,
        },
        {
          key: 'persediaan-history',
          label: 'Riwayat Persediaan',
          icon: <FileTextOutlined />,
        },
      ],
    },
    {
      group: 'PEMELIHARAAN',
      items: [
        {
          key: 'pemeliharaan-new',
          label: 'Ajukan Pemeliharaan',
          icon: <ToolOutlined />,
        },
        {
          key: 'pemeliharaan-history',
          label: 'Riwayat Pemeliharaan',
          icon: <HistoryOutlined />,
        },
      ],
    },
  ];

  return (
    <div className="simba-module">
      {/* ── Sub-Sidebar Navigation SIMBA ── */}
      <aside className={`simba-sidebar ${sidebarCollapsed ? 'simba-sidebar--collapsed' : 'simba-sidebar--expanded'}`}>
        {/* Module Title Header — Light Corporate */}
        <div className={`simba-sidebar-header ${sidebarCollapsed ? 'simba-sidebar-header--collapsed' : ''}`}>
          <div className={`simba-sidebar-header__top ${sidebarCollapsed ? 'simba-sidebar-header__top--collapsed' : ''}`}>
            {!sidebarCollapsed ? (
              <div className="simba-sidebar-brand">
                <div className="simba-sidebar-brand__icon">
                  <DropboxOutlined />
                </div>
                <div>
                  <h2 className="simba-sidebar-brand__title">
                    SIMBA
                  </h2>
                  <span className="simba-sidebar-brand__subtitle">
                    Barang & Aset BMN
                  </span>
                </div>
              </div>
            ) : (
              <div className="simba-sidebar-brand__icon">
                <DropboxOutlined />
              </div>
            )}

            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? "Tampilkan Sidebar" : "Sembunyikan Sidebar"}
              className="simba-toggle-btn"
            >
              {sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
          </div>
        </div>

        {/* Sub-Sidebar Items List */}
        <div className={`simba-sidebar-menu ${sidebarCollapsed ? 'simba-sidebar-menu--collapsed' : ''}`}>
          {menuItems.map((group, idx) => (
            <div key={idx} className={`simba-menu-group ${sidebarCollapsed ? 'simba-menu-group--collapsed' : ''}`}>
              {!sidebarCollapsed && (
                <div className="simba-menu-group__label">
                  {group.group}
                </div>
              )}
              {group.items.map((item) => {
                const isActive = activeTab === item.key;
                const buttonContent = (
                  <button
                    key={item.key}
                    onClick={() => setActiveTab(item.key)}
                    className={`simba-menu-item ${isActive ? 'simba-menu-item--active' : ''} ${sidebarCollapsed ? 'simba-menu-item--collapsed' : ''}`}
                  >
                    <span className="simba-menu-item__icon">
                      {item.icon}
                    </span>
                    {!sidebarCollapsed && (
                      <span className="simba-menu-item__label">
                        {item.label}
                      </span>
                    )}
                  </button>
                );

                return sidebarCollapsed ? (
                  <Tooltip key={item.key} title={item.label} placement="right">
                    {buttonContent}
                  </Tooltip>
                ) : (
                  buttonContent
                );
              })}
            </div>
          ))}
        </div>

        {/* Sidebar Footer — Back Button */}
        <div className={`simba-sidebar-footer ${sidebarCollapsed ? 'simba-sidebar-footer--collapsed' : ''}`}>
          {sidebarCollapsed ? (
            <Tooltip title="Kembali ke Layanan Mandiri" placement="right">
              <a href="/app/layanan-mandiri" className="simba-back-btn simba-back-btn--collapsed">
                <ArrowLeftOutlined style={{ fontSize: 13 }} />
              </a>
            </Tooltip>
          ) : (
            <a href="/app/layanan-mandiri" className="simba-back-btn">
              <ArrowLeftOutlined style={{ fontSize: 11 }} /> Kembali ke Layanan Mandiri
            </a>
          )}
        </div>
      </aside>

      {/* ── Main Dynamic Workspace ── */}
      <main className="simba-main">
        {activeTab === 'peminjaman-new' && <PublicAssetLoanPage isEmbedded={true} />}

        {activeTab === 'peminjaman-history' && (
          <div className="simba-history-wrapper">
            <div className="simba-history-card">
              <div className="simba-history-header">
                <div>
                  <h3 className="simba-history-header__title">
                    Riwayat Peminjaman BMN Saya
                  </h3>
                  <p className="simba-history-header__desc">
                    Daftar pengajuan peminjaman aset BMN yang diajukan oleh akun Anda.
                  </p>
                </div>
                <Button
                  type="primary"
                  icon={<PlusCircleOutlined />}
                  onClick={() => setActiveTab('peminjaman-new')}
                  style={{ borderRadius: 8 }}
                >
                  Ajukan Peminjaman Baru
                </Button>
              </div>

              <Table
                dataSource={myLoans}
                loading={loadingLoans}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                columns={[
                  {
                    title: 'No. SPA / Tracking',
                    dataIndex: 'spa_number',
                    key: 'spa_number',
                    render: (text, record) => (
                      <a
                        href={`/peminjaman-aset/track/${record.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontWeight: 600 }}
                      >
                        {text || record.token?.substring(0, 8)}
                      </a>
                    ),
                  },
                  {
                    title: 'Periode Pinjam',
                    key: 'periode',
                    render: (_, record) => (
                      <span style={{ fontSize: 12, color: '#475569' }}>
                        <CalendarOutlined style={{ marginRight: 4, color: '#f59e0b' }} />
                        {dayjs(record.loan_date).format('DD MMM YYYY')} - {dayjs(record.return_date).format('DD MMM YYYY')}
                      </span>
                    ),
                  },
                  {
                    title: 'Daftar Aset / Barang',
                    key: 'assets',
                    render: (_, record) => {
                      const items = record.assets || [];
                      return (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {items.length === 0 ? (
                            <span style={{ color: '#94a3b8', fontSize: 12 }}>-</span>
                          ) : (
                            items.map((item, idx) => (
                              <Tag key={idx} color="blue" style={{ fontSize: 11, borderRadius: 4 }}>
                                {item.nama_barang || item.name}
                              </Tag>
                            ))
                          )}
                        </div>
                      );
                    },
                  },
                  {
                    title: 'Status',
                    dataIndex: 'status',
                    key: 'status',
                    render: (status) => {
                      const map = {
                        pengajuan: { color: 'processing', text: 'Menunggu Persetujuan' },
                        dipinjam: { color: 'warning', text: 'Sedang Dipinjam' },
                        dikembalikan: { color: 'success', text: 'Dikembalikan' },
                        ditolak: { color: 'error', text: 'Ditolak' },
                        'pengajuan-pengembalian': { color: 'purple', text: 'Proses Pengembalian' },
                      };
                      const conf = map[status] || { color: 'default', text: status };
                      return <Tag color={conf.color} style={{ borderRadius: 6, fontWeight: 600 }}>{conf.text}</Tag>;
                    },
                  },
                  {
                    title: 'Aksi',
                    key: 'actions',
                    render: (_, record) => (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Button
                          size="small"
                          icon={<InfoCircleOutlined />}
                          onClick={() => {
                            setSelectedLoan(record);
                            setLoanModalOpen(true);
                          }}
                          style={{ borderRadius: 6 }}
                        >
                          Detail
                        </Button>
                        <Tooltip title="Lacak Status">
                          <Button
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => window.open(`/peminjaman-aset/track/${record.token}`, '_blank')}
                            style={{ borderRadius: 6 }}
                          />
                        </Tooltip>
                        <Tooltip title="Cetak SPA (PDF)">
                          <Button
                            size="small"
                            type="primary"
                            icon={<FilePdfOutlined style={{ color: '#ffffff' }} />}
                            onClick={() => window.open(`/api/public/bmn-loans/${record.token}/pdf`, '_blank')}
                            style={{ borderRadius: 6, backgroundColor: 'var(--color-primary, #0F5B99)', borderColor: 'var(--color-primary, #0F5B99)', color: '#ffffff' }}
                          />
                        </Tooltip>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          </div>
        )}

        {activeTab === 'persediaan-new' && <PublicInventoryRequestPage isEmbedded={true} />}

        {activeTab === 'persediaan-history' && (
          <div className="simba-history-wrapper">
            <div className="simba-history-card">
              <div className="simba-history-header">
                <div>
                  <h3 className="simba-history-header__title">
                    Riwayat Permintaan Persediaan Saya
                  </h3>
                  <p className="simba-history-header__desc">
                    Daftar pengajuan barang persediaan yang diajukan oleh akun Anda.
                  </p>
                </div>
                <Button
                  type="primary"
                  icon={<PlusCircleOutlined />}
                  onClick={() => setActiveTab('persediaan-new')}
                  style={{ borderRadius: 8 }}
                >
                  Permintaan Persediaan Baru
                </Button>
              </div>

              <Table
                dataSource={myInventory}
                loading={loadingInventory}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                columns={[
                  {
                    title: 'No. Permintaan / Token',
                    dataIndex: 'request_number',
                    key: 'request_number',
                    render: (text, record) => (
                      <span style={{ fontWeight: 600, color: 'var(--color-primary, #0F5B99)' }}>
                        {text || record.token?.substring(0, 8)}
                      </span>
                    ),
                  },
                  {
                    title: 'Tanggal Pengajuan',
                    dataIndex: 'created_at',
                    key: 'created_at',
                    render: (date) => (
                      <span style={{ fontSize: 12, color: '#475569' }}>
                        {dayjs(date).format('DD MMM YYYY HH:mm')}
                      </span>
                    ),
                  },
                  {
                    title: 'Jumlah Items',
                    key: 'items',
                    render: (_, record) => {
                      const count = Array.isArray(record.items) ? record.items.length : 0;
                      return <Tag color="gold">{count} Barang</Tag>;
                    },
                  },
                  {
                    title: 'Status',
                    dataIndex: 'status',
                    key: 'status',
                    render: (status) => {
                      const map = {
                        pengajuan: { color: 'processing', text: 'Menunggu Persetujuan' },
                        disetujui: { color: 'success', text: 'Disetujui' },
                        ditolak: { color: 'error', text: 'Ditolak' },
                        selesai: { color: 'cyan', text: 'Selesai' },
                      };
                      const conf = map[status] || { color: 'default', text: status };
                      return <Tag color={conf.color} style={{ borderRadius: 6, fontWeight: 600 }}>{conf.text}</Tag>;
                    },
                  },
                  {
                    title: 'Aksi',
                    key: 'actions',
                    render: (_, record) => (
                      <Button
                        size="small"
                        icon={<InfoCircleOutlined />}
                        onClick={() => {
                          setSelectedInventory(record);
                          setInventoryModalOpen(true);
                        }}
                        style={{ borderRadius: 6 }}
                      >
                        Detail
                      </Button>
                    ),
                  },
                ]}
              />
            </div>
          </div>
        )}

        {activeTab === 'pemeliharaan-new' && (
          <div className="simba-keluhan-wrapper">
            <BmnMaintenanceReportForm />
          </div>
        )}

        {(activeTab === 'pemeliharaan-history' || activeTab === 'keluhan') && (
          <div className="simba-keluhan-wrapper">
            <BmnPemeliharaanKeluhan />
          </div>
        )}
      </main>

      {/* ── Modal Detail Peminjaman BMN (Simpel, Clean & User Friendly) ── */}
      <Modal
        title={null}
        open={loanModalOpen}
        onCancel={() => {
          setLoanModalOpen(false);
          setSelectedLoan(null);
        }}
        footer={null}
        width={620}
        centered
        className="simba-detail-modal"
      >
        {selectedLoan && (
          <div>
            <div className="simba-detail-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 className="simba-detail-title">
                    <DropboxOutlined style={{ color: 'var(--color-primary, #0F5B99)' }} />
                    Detail Peminjaman BMN
                  </h3>
                  <div className="simba-detail-subtitle">
                    No. SPA: <strong>{selectedLoan.spa_number || selectedLoan.token?.substring(0, 8)}</strong>
                  </div>
                </div>
                <div>
                  {(() => {
                    const map = {
                      pengajuan: { color: 'processing', text: 'Menunggu Persetujuan' },
                      dipinjam: { color: 'warning', text: 'Sedang Dipinjam' },
                      dikembalikan: { color: 'success', text: 'Dikembalikan' },
                      ditolak: { color: 'error', text: 'Ditolak' },
                      'pengajuan-pengembalian': { color: 'purple', text: 'Proses Pengembalian' },
                    };
                    const conf = map[selectedLoan.status] || { color: 'default', text: selectedLoan.status };
                    return <Tag color={conf.color} style={{ borderRadius: 6, fontWeight: 600, padding: '3px 10px', fontSize: 12 }}>{conf.text}</Tag>;
                  })()}
                </div>
              </div>
            </div>

            <div className="simba-detail-section">
              <div className="simba-detail-section-title">Informasi Peminjaman</div>
              <div className="simba-detail-grid">
                <div className="simba-detail-item">
                  <span className="simba-detail-label">Nama Peminjam</span>
                  <span className="simba-detail-value">{selectedLoan.borrower_name || user?.name || '-'}</span>
                </div>
                <div className="simba-detail-item">
                  <span className="simba-detail-label">NIP</span>
                  <span className="simba-detail-value">{selectedLoan.borrower_nip || user?.nip || '-'}</span>
                </div>
                <div className="simba-detail-item">
                  <span className="simba-detail-label">Fungsi / Bidang</span>
                  <span className="simba-detail-value">{selectedLoan.borrower_function || '-'}</span>
                </div>
                <div className="simba-detail-item">
                  <span className="simba-detail-label">No. Telepon / WA</span>
                  <span className="simba-detail-value">{selectedLoan.borrower_phone || '-'}</span>
                </div>
                <div className="simba-detail-item">
                  <span className="simba-detail-label">Tanggal Pinjam</span>
                  <span className="simba-detail-value">
                    {selectedLoan.loan_date ? dayjs(selectedLoan.loan_date).format('DD MMMM YYYY') : '-'}
                  </span>
                </div>
                <div className="simba-detail-item">
                  <span className="simba-detail-label">Rencana Pengembalian</span>
                  <span className="simba-detail-value">
                    {selectedLoan.return_date ? dayjs(selectedLoan.return_date).format('DD MMMM YYYY') : '-'}
                  </span>
                </div>
                <div className="simba-detail-item" style={{ gridColumn: 'span 2' }}>
                  <span className="simba-detail-label">Lokasi Penempatan</span>
                  <span className="simba-detail-value">{selectedLoan.location || '-'}</span>
                </div>
                <div className="simba-detail-item" style={{ gridColumn: 'span 2' }}>
                  <span className="simba-detail-label">Keperluan / Catatan</span>
                  <span className="simba-detail-value">{selectedLoan.notes || '-'}</span>
                </div>
                {selectedLoan.rejection_reason && (
                  <div className="simba-detail-item" style={{ gridColumn: 'span 2' }}>
                    <span className="simba-detail-label" style={{ color: '#ef4444' }}>Alasan Penolakan</span>
                    <span className="simba-detail-value" style={{ color: '#dc2626' }}>{selectedLoan.rejection_reason}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="simba-detail-section">
              <div className="simba-detail-section-title">Daftar Barang BMN</div>
              <Table
                dataSource={selectedLoan.assets || []}
                rowKey={(rec, idx) => rec.asset_id || idx}
                pagination={false}
                size="small"
                bordered={false}
                columns={[
                  {
                    title: 'No',
                    key: 'index',
                    width: 45,
                    render: (_, __, index) => index + 1,
                  },
                  {
                    title: 'Nama Barang',
                    dataIndex: 'nama_barang',
                    key: 'nama_barang',
                    render: (text, record) => <strong>{text || record.name || '-'}</strong>,
                  },
                  {
                    title: 'Merek',
                    dataIndex: 'merek_barang',
                    key: 'merek_barang',
                    render: (text, record) => text || record.brand || '-',
                  },
                  {
                    title: 'NUP / Kode BMN',
                    dataIndex: 'nup',
                    key: 'nup',
                    render: (text, record) => text || record.model || record.asset_code || '-',
                  },
                ]}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--color-border, #e2e8f0)' }}>
              <Button
                icon={<EyeOutlined />}
                onClick={() => window.open(`/peminjaman-aset/track/${selectedLoan.token}`, '_blank')}
                style={{ borderRadius: 6 }}
              >
                Lacak Status
              </Button>
              <Button
                type="primary"
                icon={<FilePdfOutlined style={{ color: '#ffffff' }} />}
                onClick={() => window.open(`/api/public/bmn-loans/${selectedLoan.token}/pdf`, '_blank')}
                style={{ borderRadius: 6, backgroundColor: 'var(--color-primary, #0F5B99)', borderColor: 'var(--color-primary, #0F5B99)', color: '#ffffff' }}
              >
                Cetak SPA (PDF)
              </Button>
              <Button
                onClick={() => setLoanModalOpen(false)}
                style={{ borderRadius: 6 }}
              >
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal Detail Permintaan Persediaan (Simpel & User Friendly) ── */}
      <Modal
        title={null}
        open={inventoryModalOpen}
        onCancel={() => {
          setInventoryModalOpen(false);
          setSelectedInventory(null);
        }}
        footer={null}
        width={600}
        centered
        className="simba-detail-modal"
      >
        {selectedInventory && (
          <div>
            <div className="simba-detail-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 className="simba-detail-title">
                    <ShoppingOutlined style={{ color: 'var(--color-primary, #0F5B99)' }} />
                    Detail Permintaan Persediaan
                  </h3>
                  <div className="simba-detail-subtitle">
                    No. Permintaan: <strong>{selectedInventory.request_number || selectedInventory.token?.substring(0, 8)}</strong>
                  </div>
                </div>
                <div>
                  {(() => {
                    const map = {
                      pengajuan: { color: 'processing', text: 'Menunggu Persetujuan' },
                      disetujui: { color: 'success', text: 'Disetujui' },
                      ditolak: { color: 'error', text: 'Ditolak' },
                      selesai: { color: 'cyan', text: 'Selesai' },
                    };
                    const conf = map[selectedInventory.status] || { color: 'default', text: selectedInventory.status };
                    return <Tag color={conf.color} style={{ borderRadius: 6, fontWeight: 600, padding: '3px 10px', fontSize: 12 }}>{conf.text}</Tag>;
                  })()}
                </div>
              </div>
            </div>

            <div className="simba-detail-section">
              <div className="simba-detail-section-title">Informasi Pengajuan</div>
              <div className="simba-detail-grid">
                <div className="simba-detail-item">
                  <span className="simba-detail-label">Pemohon</span>
                  <span className="simba-detail-value">{selectedInventory.requester_name || selectedInventory.employee?.name || user?.name || '-'}</span>
                </div>
                <div className="simba-detail-item">
                  <span className="simba-detail-label">NIP</span>
                  <span className="simba-detail-value">{selectedInventory.requester_nip || selectedInventory.employee?.nip || user?.nip || '-'}</span>
                </div>
                <div className="simba-detail-item" style={{ gridColumn: 'span 2' }}>
                  <span className="simba-detail-label">Tanggal Pengajuan</span>
                  <span className="simba-detail-value">
                    {selectedInventory.created_at ? dayjs(selectedInventory.created_at).format('DD MMMM YYYY HH:mm') : '-'}
                  </span>
                </div>
              </div>
            </div>

            <div className="simba-detail-section">
              <div className="simba-detail-section-title">Daftar Barang Diberikan</div>
              <Table
                dataSource={selectedInventory.items || []}
                rowKey={(rec, idx) => rec.id || idx}
                pagination={false}
                size="small"
                bordered={false}
                columns={[
                  {
                    title: 'No',
                    key: 'index',
                    width: 45,
                    render: (_, __, index) => index + 1,
                  },
                  {
                    title: 'Nama Barang',
                    dataIndex: 'item_name',
                    key: 'item_name',
                    render: (text, record) => <strong>{text || record.name || record.inventory_item?.name || '-'}</strong>,
                  },
                  {
                    title: 'Jumlah',
                    dataIndex: 'quantity',
                    key: 'quantity',
                    width: 90,
                    render: (qty, record) => <Tag color="blue">{qty || record.qty || 1} {record.unit || 'unit'}</Tag>,
                  },
                  {
                    title: 'Catatan',
                    dataIndex: 'notes',
                    key: 'notes',
                    render: (text) => text || '-',
                  },
                ]}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--color-border, #e2e8f0)' }}>
              <Button
                onClick={() => setInventoryModalOpen(false)}
                style={{ borderRadius: 6 }}
              >
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BmnUnifiedModule;
