import { useMemo, useState, useCallback, useEffect } from "react";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  Input,
  Space,
  Tabs,
  Typography,
  App as AntdApp,
  Select,
  Table,
  DatePicker,
  Tag,
  Row,
  Col,
  Statistic,
  Divider,
  Steps,
} from "antd";
import { buildMessageAdapter } from "../utils/notify.js";
import {
  PrinterOutlined,
  FileExcelOutlined,
  SearchOutlined,
  BarChartOutlined,
  CalendarOutlined,
  UserOutlined,
  CodeSandboxOutlined,
  FileSearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "../hooks/useAuth.js";
import StatisticCard from "../components/StatisticCard.jsx";
import "./BmnLaporan.css";

const formatDate = (value) =>
  value ? dayjs(value).format("DD MMM YYYY") : "-";

// --- Sub-components for cleaner code ---

const TagStatus = ({ status }) => {
  if (!status) return null;
  const normalized = status.toLowerCase();
  let color = "blue";
  if (["approved", "completed", "selesai", "disetujui"].includes(normalized))
    color = "green";
  if (["pending", "menunggu", "diajukan"].includes(normalized)) color = "gold";
  if (["rejected", "dikembalikan", "ditolak"].includes(normalized))
    color = "red";
  return (
    <Tag color={color} style={{ borderRadius: 12, padding: "0 10px" }}>
      {status.toUpperCase()}
    </Tag>
  );
};

const getStepStatus = (status) => {
  if (!status) return { current: 0, status: "wait" };
  const normalized = status.toLowerCase();
  
  if (["rejected", "dikembalikan", "ditolak"].includes(normalized)) {
    return { current: 1, status: "error", label: "Ditolak / Dikembalikan" };
  }
  if (["completed", "selesai", "dikembalikan"].includes(normalized)) {
    return { current: 2, status: "finish", label: "Selesai" };
  }
  if (["approved", "disetujui", "in_progress", "active", "dipinjam"].includes(normalized)) {
    return { current: 1, status: "process", label: "Disetujui & Diproses" };
  }
  // Default / pending / diajukan
  return { current: 0, status: "process", label: "Diajukan / Menunggu" };
};

const BmnLaporan = () => {
  const { apiFetch } = useAuth();
  const { message } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);

  // State
  const [activeTab, setActiveTab] = useState("by-asset");

  // Data State
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(false);

  // Asset Report State
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [assetLoans, setAssetLoans] = useState([]);
  const [assetLoansLoading, setAssetLoansLoading] = useState(false);

  // Date Report State
  const [dateRange, setDateRange] = useState([
    dayjs().startOf("month"),
    dayjs(),
  ]);
  const [dateLoans, setDateLoans] = useState([]);
  const [dateLoansLoading, setDateLoansLoading] = useState(false);

  // Employee Report State
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeLoans, setEmployeeLoans] = useState([]);
  const [employeeLoansLoading, setEmployeeLoansLoading] = useState(false);

  // Trace State
  const [traceType, setTraceType] = useState("spb");
  const [traceSearchVal, setTraceSearchVal] = useState("");
  const [requestResult, setRequestResult] = useState(null);
  const [loanResult, setLoanResult] = useState(null);
  const [traceLoading, setTraceLoading] = useState(false);
  const [traceError, setTraceError] = useState(null);

  // Download State
  const [downloadLoading, setDownloadLoading] = useState({
    pdf: false,
    excel: false,
  });

  // --- Initial Data Fetching ---
  useEffect(() => {
    const initData = async () => {
      setLoadingInitial(true);
      try {
        const [assetsResponse, employeesResponse] = await Promise.all([
          apiFetch("/assets?pageSize=1000"),
          apiFetch("/employees"),
        ]);

        const assetsData = await assetsResponse.json();
        const employeesData = await employeesResponse.json();

        // Handle inconsistent API responses (array vs { data: [] })
        const assetsList = Array.isArray(assetsData)
          ? assetsData
          : assetsData.data || [];
        const employeesList = Array.isArray(employeesData)
          ? employeesData
          : employeesData.data || [];

        // Normalize asset data to handle DB field names
        const normalizedAssets = assetsList.map((a) => ({
          ...a,
          nama_barang: a.nama_barang || a.name,
          merek_barang: a.merek_barang || a.brand,
          nup: a.nup || a.model, // NUP is stored in 'model' column
          kode_bmn: a.kode_bmn || a.asset_code,
        }));

        setAssets(normalizedAssets);
        setEmployees(employeesList);
      } catch (error) {
        notification.error({
          message: "Gagal memuat data awal",
          description: error.message,
        });
      } finally {
        setLoadingInitial(false);
      }
    };
    initData();
  }, [apiFetch, notification]);

  // --- Handlers ---

  const handleAssetSelect = async (assetId) => {
    if (!assetId) {
      setSelectedAsset(null);
      setAssetLoans([]);
      return;
    }
    const asset = assets.find((a) => a.id === assetId);
    setSelectedAsset(asset);
    setAssetLoansLoading(true);
    try {
      const response = await apiFetch(`/bmn/assets/${assetId}/loans`);
      const data = await response.json();
      setAssetLoans(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      notification.error({
        message: "Gagal memuat history aset",
        description: error.message,
      });
    } finally {
      setAssetLoansLoading(false);
    }
  };

  const filterByRange = useCallback(async (range) => {
    if (!range || range.length !== 2) return;
    setDateRange(range);
    setDateLoansLoading(true);
    try {
      const params = new URLSearchParams({
        from: range[0].format("YYYY-MM-DD"),
        to: range[1].format("YYYY-MM-DD"),
      });
      const response = await apiFetch(`/bmn/loans?${params.toString()}`);
      const data = await response.json();
      setDateLoans(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      notification.error({
        message: "Gagal memuat laporan tanggal",
        description: error.message,
      });
    } finally {
      setDateLoansLoading(false);
    }
  }, [apiFetch, notification]);

  const handleDateFilter = () => {
    filterByRange(dateRange);
  };

  const handleEmployeeSelect = async (employeeId) => {
    if (!employeeId) {
      setSelectedEmployee(null);
      setEmployeeLoans([]);
      return;
    }
    const emp = employees.find((e) => e.id === employeeId);
    setSelectedEmployee(emp);
    setEmployeeLoansLoading(true);
    try {
      const response = await apiFetch(`/employees/${employeeId}/bmn-loans`);
      const data = await response.json();
      setEmployeeLoans(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      notification.error({
        message: "Gagal memuat history pegawai",
        description: error.message,
      });
    } finally {
      setEmployeeLoansLoading(false);
    }
  };

  const handleTrace = async (type, number) => {
    if (!number) return;
    setTraceLoading(true);
    setTraceError(null);
    setRequestResult(null);
    setLoanResult(null);
    try {
      if (type === "spb") {
        const response = await apiFetch(`/bmn/requests/search?number=${number}`);
        if (!response.ok) throw new Error("Nomor SPB tidak ditemukan");
        const data = await response.json();
        setRequestResult(data);
      } else {
        const response = await apiFetch(`/bmn/loans/search?number=${number}`);
        if (!response.ok) throw new Error("Nomor SPA tidak ditemukan");
        const data = await response.json();
        setLoanResult(data);
      }
    } catch (error) {
      setTraceError(error.message);
    } finally {
      setTraceLoading(false);
    }
  };

  const handleDownload = async (format, context) => {
    const key = format === "pdf" ? "pdf" : "excel";
    setDownloadLoading((prev) => ({ ...prev, [key]: true }));

    try {
      let url, fileName;
      const endpoint = format === "pdf" ? "pdf" : "excel";

      if (context === "asset" && selectedAsset) {
        url = `/bmn/assets/${selectedAsset.id}/loans/${endpoint}`;
        fileName = `Laporan_Aset_${selectedAsset.nama_barang || selectedAsset.name}`;
      } else if (context === "date") {
        const params = new URLSearchParams({
          from: dateRange[0].format("YYYY-MM-DD"),
          to: dateRange[1].format("YYYY-MM-DD"),
        });
        url = `/bmn/loans/${endpoint}?${params.toString()}`;
        fileName = `Laporan_Harian_${dayjs().format("YYYYMMDD")}`;
      } else if (context === "employee" && selectedEmployee) {
        url = `/employees/${selectedEmployee.id}/bmn-loans/${endpoint}`;
        fileName = `Laporan_Pegawai_${selectedEmployee.nama || selectedEmployee.name}`;
      } else {
        throw new Error("Konteks laporan tidak valid");
      }

      const response = await apiFetch(url, {
        headers: {
          Accept:
            format === "pdf"
              ? "application/pdf"
              : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      });

      if (!response.ok) throw new Error("Gagal mengunduh file.");

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${fileName}.${format === "pdf" ? "pdf" : "xlsx"}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      notification.error({
        message: "Gagal Download",
        description: error.message,
      });
    } finally {
      setDownloadLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  // --- Render Sections ---

  const renderByAsset = () => (
    <Space direction="vertical" style={{ width: "100%" }} size="large">
      <div className="selector-card">
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} md={12}>
            <Space size="middle">
              <CodeSandboxOutlined style={{ fontSize: 32, color: "#0F5B99" }} />
              <div>
                <Typography.Text strong style={{ fontSize: 16 }}>
                  Pilih Aset BMN
                </Typography.Text>
                <div style={{ fontSize: 13, color: "#64748b" }}>
                  Lihat informasi detail dan riwayat peminjaman per item aset
                </div>
              </div>
            </Space>
          </Col>
          <Col xs={24} md={12} style={{ textAlign: "right" }}>
            <Select
              showSearch
              placeholder="Cari nama barang atau NUP..."
              onChange={handleAssetSelect}
              loading={loadingInitial}
              options={assets.map((a) => ({
                value: a.id,
                label: `${a.nama_barang || "Tanpa Nama"} ${a.nup ? `(NUP: ${a.nup})` : ""}`,
              }))}
              style={{ width: "100%", maxWidth: 400 }}
              allowClear
              filterOption={(input, option) =>
                (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
            />
          </Col>
        </Row>
      </div>

      {selectedAsset && (
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={8}>
            <Space direction="vertical" style={{ width: "100%" }} size="middle">
              <Card className="info-card-premium" title="Detail Aset" variant="borderless">
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="Nama Barang">
                    <strong>{selectedAsset.nama_barang}</strong>
                  </Descriptions.Item>
                  <Descriptions.Item label="Merek">
                    {selectedAsset.merek_barang || "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="NUP">
                    {selectedAsset.nup || "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Kode BMN">
                    {selectedAsset.kode_bmn || "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Kategori">
                    {selectedAsset.category || "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Status">
                    <Tag
                      color={
                        selectedAsset.status === "tersedia" ? "green" : "orange"
                      }
                      style={{ borderRadius: 12 }}
                    >
                      {selectedAsset.status?.toUpperCase()}
                    </Tag>
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              <Row gutter={[12, 12]}>
                <Col span={12}>
                  <Card size="small" className="stats-card-premium" style={{ textAlign: "center" }}>
                    <Statistic title="Total Pinjam" value={assetLoans.length} />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card size="small" className="stats-card-premium" style={{ textAlign: "center" }}>
                    <Statistic
                      title="Status Aktif"
                      value={assetLoans.filter(l => l.status === 'active' || l.status === 'dipinjam').length}
                      valueStyle={{ color: '#faad14' }}
                    />
                  </Card>
                </Col>
              </Row>
            </Space>
          </Col>
          
          <Col xs={24} lg={16}>
            <Card
              className="info-card-premium"
              title="Riwayat Transaksi Peminjaman"
              variant="borderless"
              extra={
                <Space>
                  <Button
                    className="btn-download-pdf"
                    icon={<PrinterOutlined />}
                    onClick={() => handleDownload("pdf", "asset")}
                    loading={downloadLoading.pdf}
                  >
                    Tarik PDF
                  </Button>
                  <Button
                    className="btn-download-excel"
                    icon={<FileExcelOutlined />}
                    onClick={() => handleDownload("excel", "asset")}
                    loading={downloadLoading.excel}
                  >
                    Tarik Excel
                  </Button>
                </Space>
              }
            >
              <Table
                dataSource={assetLoans}
                rowKey="id"
                size="middle"
                loading={assetLoansLoading}
                pagination={{ pageSize: 5 }}
                columns={[
                  {
                    title: "Peminjam",
                    dataIndex: "borrower_name",
                    key: "borrower",
                  },
                  {
                    title: "Tgl Pinjam",
                    dataIndex: "loan_date",
                    render: formatDate,
                  },
                  {
                    title: "Tgl Kembali",
                    dataIndex: "return_date",
                    render: formatDate,
                  },
                  {
                    title: "Status",
                    dataIndex: "status",
                    render: (s) => <TagStatus status={s} />,
                  },
                ]}
              />
            </Card>
          </Col>
        </Row>
      )}
    </Space>
  );

  const renderByDate = () => (
    <Space direction="vertical" style={{ width: "100%" }} size="large">
      <div className="selector-card">
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} md={12}>
            <Space wrap size="middle" align="center">
              <DatePicker.RangePicker
                value={dateRange}
                onChange={setDateRange}
                format="DD MMM YYYY"
                style={{ width: 280 }}
              />
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleDateFilter}
                loading={dateLoansLoading}
                style={{ background: "#0F5B99" }}
              >
                Tampilkan Laporan
              </Button>
            </Space>
          </Col>
          <Col xs={24} md={12} style={{ textAlign: "right" }}>
            <Space wrap size="small">
              <Typography.Text type="secondary" style={{ fontSize: 13, marginRight: 8 }}>
                Filter Cepat:
              </Typography.Text>
              <Tag
                color="blue"
                className="quick-filter-tag"
                onClick={() => filterByRange([dayjs().startOf("day"), dayjs().endOf("day")])}
              >
                Hari Ini
              </Tag>
              <Tag
                color="cyan"
                className="quick-filter-tag"
                onClick={() => filterByRange([dayjs().startOf("week"), dayjs().endOf("week")])}
              >
                Minggu Ini
              </Tag>
              <Tag
                color="purple"
                className="quick-filter-tag"
                onClick={() => filterByRange([dayjs().startOf("month"), dayjs().endOf("month")])}
              >
                Bulan Ini
              </Tag>
              <Tag
                color="magenta"
                className="quick-filter-tag"
                onClick={() => filterByRange([dayjs().startOf("year"), dayjs().endOf("year")])}
              >
                Tahun Ini
              </Tag>
            </Space>
          </Col>
        </Row>
      </div>

      {dateLoans.length > 0 ? (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <StatisticCard
                title="Total Transaksi"
                value={dateLoans.length}
                icon={<BarChartOutlined />}
                color="#0F5B99"
              />
            </Col>
            <Col xs={24} sm={8}>
              <StatisticCard
                title="Sedang Dipinjam"
                value={
                  dateLoans.filter(
                    (l) => l.status === "active" || l.status === "dipinjam",
                  ).length
                }
                icon={<CodeSandboxOutlined />}
                color="#faad14"
              />
            </Col>
            <Col xs={24} sm={8}>
              <StatisticCard
                title="Telah Dikembalikan"
                value={
                  dateLoans.filter(
                    (l) =>
                      l.status === "completed" || l.status === "dikembalikan" || l.status === "selesai",
                  ).length
                }
                icon={<UserOutlined />}
                color="#52c41a"
              />
            </Col>
          </Row>

          <Card
            className="info-card-premium"
            title={`Laporan Periode: ${dateRange[0]?.format("DD MMM YYYY")} - ${dateRange[1]?.format("DD MMM YYYY")}`}
            variant="borderless"
            extra={
              <Space>
                <Button
                  className="btn-download-pdf"
                  icon={<PrinterOutlined />}
                  onClick={() => handleDownload("pdf", "date")}
                  loading={downloadLoading.pdf}
                >
                  Tarik PDF
                </Button>
                <Button
                  className="btn-download-excel"
                  icon={<FileExcelOutlined />}
                  onClick={() => handleDownload("excel", "date")}
                  loading={downloadLoading.excel}
                >
                  Tarik Excel
                </Button>
              </Space>
            }
          >
            <Table
              dataSource={dateLoans}
              rowKey="id"
              loading={dateLoansLoading}
              columns={[
                {
                  title: "Daftar Aset",
                  dataIndex: "assets",
                  render: (assets) => (
                    <ul style={{ paddingLeft: 16, margin: 0 }}>
                      {(Array.isArray(assets) ? assets : []).map((a, idx) => (
                        <li key={idx}>
                          <strong>{a.nama_barang || a.name || "-"}</strong>
                          {a.nup ? ` (NUP: ${a.nup})` : ""}
                        </li>
                      ))}
                    </ul>
                  ),
                },
                { title: "Peminjam", dataIndex: "borrower_name" },
                {
                  title: "Tgl Pinjam",
                  dataIndex: "loan_date",
                  render: formatDate,
                },
                {
                  title: "Tgl Kembali",
                  dataIndex: "return_date",
                  render: formatDate,
                },
                {
                  title: "Status",
                  dataIndex: "status",
                  render: (s) => <TagStatus status={s} />,
                },
              ]}
            />
          </Card>
        </>
      ) : (
        <Empty description="Pilih rentang tanggal atau gunakan filter cepat untuk menampilkan laporan" />
      )}
    </Space>
  );

  const renderByEmployee = () => (
    <Space direction="vertical" style={{ width: "100%" }} size="large">
      <div className="selector-card">
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} md={12}>
            <Space size="middle">
              <UserOutlined style={{ fontSize: 32, color: "#722ed1" }} />
              <div>
                <Typography.Text strong style={{ fontSize: 16 }}>
                  Pilih Pegawai
                </Typography.Text>
                <div style={{ fontSize: 13, color: "#64748b" }}>
                  Lihat riwayat aset yang dipinjam oleh pegawai tertentu
                </div>
              </div>
            </Space>
          </Col>
          <Col xs={24} md={12} style={{ textAlign: "right" }}>
            <Select
              showSearch
              style={{ width: "100%", maxWidth: 400 }}
              placeholder="Ketik nama pegawai atau NIP..."
              optionFilterProp="children"
              onChange={handleEmployeeSelect}
              filterOption={(input, option) =>
                (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
              options={employees.map((e) => ({
                value: e.id,
                label: `${e.nama || e.name} (${e.nip})`,
              }))}
            />
          </Col>
        </Row>
      </div>

      {selectedEmployee && (
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={8}>
            <Space direction="vertical" style={{ width: "100%" }} size="middle">
              <Card className="info-card-premium" title="Profil Pegawai" variant="borderless">
                <div className="avatar-badge-container">
                  <div className="avatar-circle">
                    <UserOutlined style={{ fontSize: 36, color: "#722ed1" }} />
                  </div>
                  <Typography.Title level={5} style={{ margin: 0, textAlign: "center" }}>
                    {selectedEmployee.nama || selectedEmployee.name}
                  </Typography.Title>
                  <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                    NIP. {selectedEmployee.nip}
                  </Typography.Text>
                </div>
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="Jabatan">
                    {selectedEmployee.position || "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Unit / Bidang">
                    {selectedEmployee.department || "-"}
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              <Row gutter={[12, 12]}>
                <Col span={12}>
                  <Card size="small" className="stats-card-premium" style={{ textAlign: "center" }}>
                    <Statistic title="Total Pinjam" value={employeeLoans.length} />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card size="small" className="stats-card-premium" style={{ textAlign: "center" }}>
                    <Statistic
                      title="Sedang Pinjam"
                      value={employeeLoans.filter(l => l.status === 'active' || l.status === 'dipinjam').length}
                      valueStyle={{ color: '#faad14' }}
                    />
                  </Card>
                </Col>
              </Row>
            </Space>
          </Col>
          <Col xs={24} lg={16}>
            <Card
              className="info-card-premium"
              title="Aset yang Dipinjam"
              variant="borderless"
              extra={
                <Space>
                  <Button
                    className="btn-download-pdf"
                    icon={<PrinterOutlined />}
                    onClick={() => handleDownload("pdf", "employee")}
                    loading={downloadLoading.pdf}
                  >
                    Tarik PDF
                  </Button>
                  <Button
                    className="btn-download-excel"
                    icon={<FileExcelOutlined />}
                    onClick={() => handleDownload("excel", "employee")}
                    loading={downloadLoading.excel}
                  >
                    Tarik Excel
                  </Button>
                </Space>
              }
            >
              <Table
                dataSource={employeeLoans}
                rowKey="id"
                size="middle"
                loading={employeeLoansLoading}
                columns={[
                  { title: "Barang BMN", dataIndex: "asset_name" },
                  {
                    title: "Tgl Pinjam",
                    dataIndex: "loan_date",
                    render: formatDate,
                  },
                  {
                    title: "Status",
                    dataIndex: "status",
                    render: (s) => <TagStatus status={s} />,
                  },
                ]}
              />
            </Card>
          </Col>
        </Row>
      )}
    </Space>
  );

  const renderTrace = () => {
    const spbSteps = requestResult ? getStepStatus(requestResult.status) : null;
    const spaSteps = loanResult ? getStepStatus(loanResult.status) : null;

    return (
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        <div className="trace-search-bar">
          <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
            Penelusuran Dokumen SPB / SPA BMN
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 20 }}>
            Masukkan Nomor Surat Permintaan Barang (SPB) atau Surat Peminjaman Aset (SPA) untuk melacak status dokumen saat ini.
          </Typography.Paragraph>
          <Space.Compact style={{ width: "100%", maxWidth: 650 }}>
            <Select
              value={traceType}
              style={{ width: 140 }}
              onChange={setTraceType}
              options={[
                { label: "Nomor SPB", value: "spb" },
                { label: "Nomor SPA", value: "spa" },
              ]}
            />
            <Input
              placeholder={traceType === "spb" ? "Contoh: SPB/2026/0001" : "Contoh: SPA/2026/0001"}
              value={traceSearchVal}
              onChange={(e) => setTraceSearchVal(e.target.value)}
              onPressEnter={() => handleTrace(traceType, traceSearchVal)}
            />
            <Button
              type="primary"
              style={{ background: "#0F5B99" }}
              onClick={() => handleTrace(traceType, traceSearchVal)}
              loading={traceLoading}
              icon={<SearchOutlined />}
            >
              Lacak
            </Button>
          </Space.Compact>
        </div>

        <Row gutter={[24, 24]}>
          <Col xs={24} md={24}>
            <div className="trace-result-card">
              <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 20 }}>
                <FileSearchOutlined style={{ marginRight: 8, color: "#0F5B99" }} />
                Hasil Pelacakan
              </Typography.Title>
              
              {traceError && (
                <Alert
                  type="error"
                  message="Dokumen Tidak Ditemukan"
                  description={traceError}
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}

              {requestResult && (
                <Row gutter={[24, 24]}>
                  <Col xs={24} md={12}>
                    <Descriptions
                      title={`Detail SPB: ${requestResult.spb_number || requestResult.nomor}`}
                      column={1}
                      bordered
                      size="middle"
                    >
                      <Descriptions.Item label="Status Akhir">
                        <TagStatus status={requestResult.status} />
                      </Descriptions.Item>
                      <Descriptions.Item label="Nama Pemohon">
                        {requestResult.nama || "-"}
                      </Descriptions.Item>
                      <Descriptions.Item label="Tanggal Pengajuan">
                        {formatDate(requestResult.tanggal_pengajuan)}
                      </Descriptions.Item>
                      <Descriptions.Item label="Daftar Kebutuhan Barang">
                        <ul style={{ paddingLeft: 16, margin: 0 }}>
                          {(requestResult.items || []).map((item, idx) => (
                            <li key={idx}>
                              {item.nama_barang} <strong>({item.jumlah} pcs)</strong>
                            </li>
                          ))}
                        </ul>
                      </Descriptions.Item>
                    </Descriptions>
                  </Col>
                  
                  <Col xs={24} md={12} style={{ borderLeft: "1px solid #f1f5f9", paddingLeft: 24 }}>
                    <Typography.Title level={5} style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>
                      Alur Proses Dokumen
                    </Typography.Title>
                    <Steps
                      direction="vertical"
                      size="small"
                      current={spbSteps.current}
                      status={spbSteps.status}
                      items={[
                        {
                          title: "Laporan Diajukan",
                          description: "Permintaan barang dikirim oleh staf pemohon.",
                        },
                        {
                          title: spbSteps.status === "error" ? "Permintaan Ditolak" : "Disetujui / Diproses",
                          description: spbSteps.status === "error" 
                            ? "Pengajuan ditolak oleh pengelola BMN." 
                            : "Pengajuan disetujui dan sedang disiapkan.",
                        },
                        {
                          title: "Selesai",
                          description: "Barang telah diserahterimakan.",
                        },
                      ]}
                    />
                  </Col>
                </Row>
              )}

              {loanResult && (
                <Row gutter={[24, 24]}>
                  <Col xs={24} md={12}>
                    <Descriptions
                      title={`Detail SPA: ${loanResult.spa_number || loanResult.nomor}`}
                      column={1}
                      bordered
                      size="middle"
                    >
                      <Descriptions.Item label="Status Akhir">
                        <TagStatus status={loanResult.status} />
                      </Descriptions.Item>
                      <Descriptions.Item label="Nama Peminjam">
                        {loanResult.borrower_name || "-"}
                      </Descriptions.Item>
                      <Descriptions.Item label="Periode Pinjam">
                        {formatDate(loanResult.loan_date)} s/d {formatDate(loanResult.return_date)}
                      </Descriptions.Item>
                      <Descriptions.Item label="Aset yang Dipinjam">
                        <strong>{loanResult.asset_name || "-"}</strong>
                      </Descriptions.Item>
                    </Descriptions>
                  </Col>
                  
                  <Col xs={24} md={12} style={{ borderLeft: "1px solid #f1f5f9", paddingLeft: 24 }}>
                    <Typography.Title level={5} style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>
                      Alur Proses Dokumen
                    </Typography.Title>
                    <Steps
                      direction="vertical"
                      size="small"
                      current={spaSteps.current}
                      status={spaSteps.status}
                      items={[
                        {
                          title: "Pengajuan Pinjaman",
                          description: "Surat peminjaman diajukan oleh peminjam.",
                        },
                        {
                          title: spaSteps.status === "error" ? "Peminjaman Ditolak" : "Disetujui & Aktif",
                          description: spaSteps.status === "error" 
                            ? "Peminjaman ditolak oleh pengelola BMN." 
                            : "Aset diserahkan dan status peminjaman sedang aktif.",
                        },
                        {
                          title: "Selesai Dikembalikan",
                          description: "Aset telah dikembalikan dalam kondisi baik.",
                        },
                      ]}
                    />
                  </Col>
                </Row>
              )}

              {!requestResult && !loanResult && !traceError && (
                <Empty
                  description="Silakan masukkan nomor dokumen untuk melihat hasil pelacakan alur"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </div>
          </Col>
        </Row>
      </Space>
    );
  };

  return (
    <div className="bmn-laporan-container">
      <div className="report-header-section">
        <Typography.Title level={3}>
          Laporan & Analitik BMN
        </Typography.Title>
        <p>
          Pusat pemantauan data laporan aset, riwayat peminjaman harian, statistik pegawai, serta pelacakan dokumen SPB/SPA.
        </p>
      </div>

      <div className="tabs-card-wrapper">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          className="laporan-tabs"
          size="large"
          items={[
            {
              key: "by-asset",
              label: (
                <span>
                  <CodeSandboxOutlined /> Laporan per Barang
                </span>
              ),
              children: renderByAsset(),
            },
            {
              key: "by-date",
              label: (
                <span>
                  <CalendarOutlined /> Laporan per Tanggal
                </span>
              ),
              children: renderByDate(),
            },
            {
              key: "by-employee",
              label: (
                <span>
                  <UserOutlined /> Laporan per Pegawai
                </span>
              ),
              children: renderByEmployee(),
            },
            {
              key: "trace",
              label: (
                <span>
                  <FileSearchOutlined /> Pelacakan Dokumen
                </span>
              ),
              children: renderTrace(),
            },
          ]}
        />
      </div>
    </div>
  );
};

export default BmnLaporan;
