import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Tag,
  Typography,
  Tooltip,
  Row,
  Col,
  message as andMessage,
} from "antd";
import {
  ArrowLeftOutlined,
  SyncOutlined,
  SearchOutlined,
  BookOutlined,
  CheckCircleFilled,
  ClockCircleFilled,
  TrophyFilled,
  SafetyCertificateFilled,
  UserOutlined,
  CalendarOutlined,
  ReloadOutlined,
  LinkOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  RiseOutlined,
  StarFilled,
  TeamOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import { useAuth } from "../hooks/useAuth.js";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/id";
import "./PelatihanPegawai.css";

dayjs.extend(relativeTime);
dayjs.locale("id");

const { Title, Text, Paragraph } = Typography;

const FUNGSI_OPTIONS = [
  { label: "Semua Fungsi", value: "all" },
  { label: "Pemeriksaan", value: "Pemeriksaan" },
  { label: "Infokom", value: "Infokom" },
  { label: "Pengujian", value: "Pengujian" },
  { label: "Tata Usaha", value: "Tata Usaha" },
  { label: "Penindakan", value: "Penindakan" },
  { label: "Penyuluhan", value: "Penyuluhan" },
];

const PROGRESS_OPTIONS = [
  { label: "Semua Status", value: "all" },
  { label: "Selesai Pelatihan", value: "Selesai Pelatihan" },
  { label: "Selesai Diseminasi", value: "Selesai Diseminasi" },
  { label: "Proses", value: "Proses" },
];

export default function PelatihanPegawai() {
  const navigate = useNavigate();
  const { apiFetch } = useAuth();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedFungsi, setSelectedFungsi] = useState("all");
  const [selectedProgress, setSelectedProgress] = useState("all");
  const [diseminasiOnly, setDiseminasiOnly] = useState("all");
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 15,
    total: 0,
  });
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  // Fetch Stats Summary
  const fetchStats = useCallback(async () => {
    try {
      const response = await apiFetch("/employee-trainings/stats");
      if (response.ok) {
        const payload = await response.json();
        setStats(payload);
        if (payload.last_synced_at) {
          setLastSyncedAt(payload.last_synced_at);
        }
      }
    } catch (err) {
      console.error("Gagal mengambil statistik pelatihan:", err);
    }
  }, [apiFetch]);

  // Fetch Data Table
  const fetchData = useCallback(
    async (page = 1, pageSize = 15) => {
      try {
        setLoading(true);
        let url = `/employee-trainings?page=${page}&pageSize=${pageSize}`;
        if (search.trim()) {
          url += `&search=${encodeURIComponent(search.trim())}`;
        }
        if (selectedFungsi !== "all") {
          url += `&fungsi=${encodeURIComponent(selectedFungsi)}`;
        }
        if (selectedProgress !== "all") {
          url += `&progress=${encodeURIComponent(selectedProgress)}`;
        }
        if (diseminasiOnly !== "all") {
          url += `&diseminasi=${encodeURIComponent(diseminasiOnly)}`;
        }

        const response = await apiFetch(url);
        if (!response.ok) {
          throw new Error("Gagal mengambil data pelatihan pegawai.");
        }

        const resData = await response.json();
        setData(resData.data || []);
        setPagination({
          current: resData.currentPage || page,
          pageSize: resData.perPage || pageSize,
          total: resData.total || 0,
        });

        if (resData.last_synced_at) {
          setLastSyncedAt(resData.last_synced_at);
        }
      } catch (err) {
        andMessage.error(err.message);
      } finally {
        setLoading(false);
      }
    },
    [apiFetch, search, selectedFungsi, selectedProgress, diseminasiOnly]
  );

  useEffect(() => {
    fetchStats();
    fetchData(1, pagination.pageSize);
  }, [fetchStats, fetchData]);

  // Trigger Google Sheet Sync
  const handleSync = async () => {
    try {
      setSyncing(true);
      andMessage.loading({ content: "Menghubungkan ke Google Spreadsheet...", key: "sheet-sync" });

      const response = await apiFetch("/employee-trainings/sync", {
        method: "POST",
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message || "Gagal melakukan sinkronisasi.");
      }

      const resData = await response.json();
      andMessage.success({
        content: resData.message || "Sinkronisasi berhasil!",
        key: "sheet-sync",
        duration: 4,
      });

      setLastSyncedAt(resData.synced_at);
      fetchStats();
      fetchData(1, pagination.pageSize);
    } catch (err) {
      andMessage.error({ content: err.message, key: "sheet-sync" });
    } finally {
      setSyncing(false);
    }
  };

  const handleTableChange = (paginationParam) => {
    fetchData(paginationParam.current, paginationParam.pageSize);
  };

  /* ─── Tag helper for Progress ─── */
  const renderProgressTag = (prog) => {
    if (!prog) return <Tag className="status-pill status-default">-</Tag>;
    const pLower = prog.toLowerCase();
    if (pLower.includes("selesai diseminasi")) {
      return (
        <span className="status-pill status-diseminasi">
          <TrophyFilled style={{ fontSize: 11 }} />
          Selesai Diseminasi
        </span>
      );
    }
    if (pLower.includes("selesai pelatihan")) {
      return (
        <span className="status-pill status-pelatihan">
          <CheckCircleFilled style={{ fontSize: 11 }} />
          Selesai Pelatihan
        </span>
      );
    }
    if (pLower.includes("proses")) {
      return (
        <span className="status-pill status-proses">
          <ClockCircleFilled style={{ fontSize: 11 }} />
          Dalam Proses
        </span>
      );
    }
    return <span className="status-pill status-default">{prog}</span>;
  };

  /* ─── Columns Definition ─── */
  const columns = [
    {
      title: "NO",
      key: "index",
      width: 55,
      align: "center",
      render: (_, __, index) => (
        <span className="row-number">
          {(pagination.current - 1) * pagination.pageSize + index + 1}
        </span>
      ),
    },
    {
      title: "TOPIK BANGKOM / DISEMINASI & PESERTA",
      key: "training_info",
      render: (_, record) => (
        <div className="topic-container">
          <div className="topic-header-badges">
            {record.no_undangan && (
              <span className="badge-undangan">
                No. Undangan: {record.no_undangan}
              </span>
            )}
            {record.jenis_pelatihan && (
              <span className="badge-jenis">
                {record.jenis_pelatihan}
              </span>
            )}
            {record.fungsi && (
              <span className="badge-fungsi">
                {record.fungsi}
              </span>
            )}
          </div>

          <div className="topic-title">
            {record.judul_pelatihan || "-"}
          </div>

          <div className="topic-meta-row">
            {record.nama && (
              <span className="meta-item">
                <UserOutlined className="meta-icon blue" />
                <strong>{record.nama}</strong>
                {record.nip ? <span className="nip-text">({record.nip})</span> : ""}
              </span>
            )}
            {record.narasumber && (
              <span className="meta-item">
                <UserOutlined className="meta-icon purple" />
                Narasumber: <strong>{record.narasumber}</strong>
              </span>
            )}
            {record.tanggal_pelatihan && (
              <span className="meta-item">
                <CalendarOutlined className="meta-icon navy" />
                {record.tanggal_pelatihan}
              </span>
            )}
            {record.tempat_pelatihan && (
              <span className="meta-item">
                <EnvironmentOutlined className="meta-icon red" />
                {record.tempat_pelatihan}
              </span>
            )}
          </div>

          {record.keterangan && (
            <div className="topic-keterangan">
              ℹ️ {record.keterangan}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "PESERTA & EVALUASI",
      key: "scores",
      width: 210,
      align: "center",
      render: (_, record) => {
        const hasScores = record.pre_test || record.post_test || record.peningkatan_nilai || record.kepuasan_peserta || record.jumlah_peserta;
        if (!hasScores) return <span className="text-muted-dash">-</span>;

        return (
          <div className="scores-wrapper">
            {record.jumlah_peserta && (
              <span className="score-badge badge-peserta">
                <TeamOutlined style={{ marginRight: 4 }} />
                {record.jumlah_peserta} Peserta
              </span>
            )}

            {(record.pre_test || record.post_test) && (
              <div className="score-pre-post">
                <span>Pre: <strong>{record.pre_test || "-"}</strong></span>
                <span className="score-divider">|</span>
                <span>Post: <strong>{record.post_test || "-"}</strong></span>
              </div>
            )}

            {record.peningkatan_nilai && record.peningkatan_nilai !== "-" && (
              <span className="score-badge badge-peningkatan">
                <RiseOutlined style={{ marginRight: 4 }} />
                Peningkatan: {record.peningkatan_nilai}
              </span>
            )}

            {record.kepuasan_peserta && record.kepuasan_peserta !== "-" && (
              <span className="score-badge badge-kepuasan">
                <StarFilled style={{ marginRight: 4, color: "#F59E0B" }} />
                Kepuasan: {record.kepuasan_peserta}
              </span>
            )}
          </div>
        );
      },
    },
    {
      title: "STATUS & DOKUMENTASI",
      key: "status_col",
      width: 220,
      align: "center",
      render: (_, record) => {
        const isUrl = record.dokumentasi && (record.dokumentasi.startsWith("http://") || record.dokumentasi.startsWith("https://"));
        const sheetUrl = "https://docs.google.com/spreadsheets/d/17TOQEsxGao969wySc21IfFIeH3TrBy2EqY9Eixr1cGE/edit?gid=940931713#gid=940931713";
        const docHref = isUrl ? record.dokumentasi : sheetUrl;

        return (
          <div className="status-doc-wrapper">
            {renderProgressTag(record.progress)}

            {record.dokumentasi && (
              <Tooltip title={isUrl ? "Buka Materi & Berkas Dokumentasi di Google Drive" : "Buka Berkas Dokumentasi di Google Sheet"}>
                <a
                  href={docHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-doc-materi"
                >
                  <FileTextOutlined style={{ fontSize: 13 }} />
                  <span>Dokumentasi & Materi</span>
                </a>
              </Tooltip>
            )}

            {record.ceklis_diseminasi && !record.progress?.includes("Selesai") && (
              <span className="badge-disarankan">
                <SafetyCertificateFilled style={{ marginRight: 4 }} />
                Disarankan Diseminasi
              </span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="pelatihan-page-wrapper">
      {/* ─── Header Card ─── */}
      <div className="header-card">
        <div className="header-left">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/app/layanan-mandiri')}
            style={{
              borderRadius: 8,
              fontWeight: 600,
              marginRight: 6,
              height: 38,
            }}
          >
            Kembali
          </Button>

          <div className="header-icon-box">
            <BookOutlined />
          </div>
          <div>
            <div className="header-title">Sesi Kompak (Pelatihan & Diseminasi)</div>
            <div className="header-subtitle">
              Sistem Informasi Pelayanan Tata Usaha — BPOM di Palopo
            </div>
          </div>
        </div>

        <div className="header-right">
          {lastSyncedAt && (
            <div className="sync-time-badge">
              <ClockCircleFilled style={{ color: "#0F5B99" }} />
              <span>Disinkron {dayjs(lastSyncedAt).fromNow()}</span>
            </div>
          )}
          <Button
            type="primary"
            icon={<SyncOutlined spin={syncing} />}
            loading={syncing}
            onClick={handleSync}
            className="btn-sync-action"
          >
            Sinkronkan Google Sheets
          </Button>
        </div>
      </div>

      {/* ─── Metric Cards Strip ─── */}
      <Row gutter={[16, 16]} className="metrics-row">
        <Col xs={24} sm={12} md={6}>
          <div className="metric-card card-total">
            <div className="metric-icon-wrap blue">
              <BookOutlined />
            </div>
            <div className="metric-content">
              <span className="metric-title">TOTAL PELATIHAN</span>
              <div className="metric-number">{stats?.total_pelatihan ?? 0}</div>
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <div className="metric-card card-selesai">
            <div className="metric-icon-wrap green">
              <CheckCircleFilled />
            </div>
            <div className="metric-content">
              <span className="metric-title">SELESAI PELATIHAN</span>
              <div className="metric-number">{stats?.selesai_pelatihan ?? 0}</div>
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <div className="metric-card card-diseminasi">
            <div className="metric-icon-wrap cyan">
              <TrophyFilled />
            </div>
            <div className="metric-content">
              <span className="metric-title">SELESAI DISEMINASI</span>
              <div className="metric-number">{stats?.selesai_diseminasi ?? 0}</div>
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <div className="metric-card card-proses">
            <div className="metric-icon-wrap amber">
              <ClockCircleFilled />
            </div>
            <div className="metric-content">
              <span className="metric-title">DALAM PROSES / TU</span>
              <div className="metric-number">{stats?.proses ?? 0}</div>
            </div>
          </div>
        </Col>
      </Row>

      {/* ─── Main Content Card ─── */}
      <div className="content-card">
        {/* Toolbar & Filters */}
        <div className="table-toolbar">
          <Input
            placeholder="Cari Nama, NIP, Narasumber, atau Judul Pelatihan..."
            prefix={<SearchOutlined style={{ color: "#94A3B8" }} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            className="search-input"
          />

          <Select
            value={selectedFungsi}
            onChange={(val) => setSelectedFungsi(val)}
            className="filter-select"
            options={FUNGSI_OPTIONS}
          />

          <Select
            value={selectedProgress}
            onChange={(val) => setSelectedProgress(val)}
            className="filter-select"
            options={PROGRESS_OPTIONS}
          />

          <Select
            value={diseminasiOnly}
            onChange={(val) => setDiseminasiOnly(val)}
            className="filter-select"
            options={[
              { label: "Semua Diseminasi", value: "all" },
              { label: "Perlu Diseminasi", value: "ya" },
            ]}
          />

          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              setSearch("");
              setSelectedFungsi("all");
              setSelectedProgress("all");
              setDiseminasiOnly("all");
            }}
            className="btn-reset"
          >
            Reset Filter
          </Button>
        </div>

        {/* Table */}
        <Table
          columns={columns}
          dataSource={data}
          rowKey={(r) => r.id || `${r.nip}-${r.judul_pelatihan}`}
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            pageSizeOptions: ["10", "15", "30", "50"],
            showTotal: (tot) => `Menampilkan total ${tot} data pelatihan`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 850 }}
          className="corporate-table"
        />
      </div>
    </div>
  );
}
