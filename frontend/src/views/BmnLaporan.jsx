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
          apiFetch(
            "/assets?pageSize=1000",
          ),
          apiFetch(
            "/employees",
          ), // Assuming /employees endpoint based on typical structure, will verify if fails
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
      const response = await apiFetch(
        `/bmn/assets/${assetId}/loans`,
      );
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

  const handleDateFilter = async () => {
    if (!dateRange || dateRange.length !== 2) return;
    setDateLoansLoading(true);
    try {
      const params = new URLSearchParams({
        from: dateRange[0].format("YYYY-MM-DD"),
        to: dateRange[1].format("YYYY-MM-DD"),
      });
      const response = await apiFetch(
        `/bmn/loans?${params.toString()}`,
      );
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
      const response = await apiFetch(
        `/employees/${employeeId}/bmn-loans`,
      );
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
    // const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
    try {
      if (type === "spb") {
        const response = await apiFetch(
          `/bmn/requests/search?number=${number}`,
        );
        if (!response.ok) throw new Error("Nomor SPB tidak ditemukan");
        const data = await response.json();
        setRequestResult(data);
      } else {
        const response = await apiFetch(
          `/bmn/loans/search?number=${number}`,
        );
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
    // const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

    try {
      let url, fileName;
      const endpoint = format === "pdf" ? "pdf" : "excel";

      // Construct URL based on context
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
      <Card
        variant="borderless"
        style={{ background: "#f5f7fa", marginBottom: 16 }}
      >
        <Space
          align="center"
          style={{ width: "100%", justifyContent: "space-between" }}
        >
          <Space>
            <CodeSandboxOutlined style={{ fontSize: 24, color: "#1890ff" }} />
            <div>
              <Typography.Text strong style={{ fontSize: 16 }}>
                Pilih Barang
              </Typography.Text>
              <div style={{ fontSize: 12, color: "#666" }}>
                Lihat riwayat peminjaman per item
              </div>
            </div>
          </Space>
          <Select
            showSearch
            placeholder="Pilih aset"
            onChange={handleAssetSelect}
            loading={loadingInitial}
            options={assets.map((a) => ({
              value: a.id,
              label: `${a.nama_barang || "Tanpa Nama"} ${a.nup ? `(NUP: ${a.nup})` : ""}`,
            }))}
            style={{ width: 400 }}
            allowClear
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
          />
        </Space>
      </Card>

      {selectedAsset && (
        <Row gutter={[24, 24]}>
          <Col xs={24} md={8}>
            <Card variant="borderless" style={{ height: "100%" }}>
              <Typography.Title level={5}>Informasi Barang</Typography.Title>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Nama Barang">
                  {selectedAsset.nama_barang}
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
                <Descriptions.Item label="Status Saat Ini">
                  <Tag
                    color={
                      selectedAsset.status === "tersedia" ? "green" : "orange"
                    }
                  >
                    {selectedAsset.status?.toUpperCase()}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
          <Col xs={24} md={16}>
            <Card
              title="Riwayat Peminjaman"
              variant="borderless"
              extra={
                <Space>
                  <Button
                    size="small"
                    icon={<PrinterOutlined />}
                    onClick={() => handleDownload("pdf", "asset")}
                  >
                    PDF
                  </Button>
                  <Button
                    size="small"
                    icon={<FileExcelOutlined />}
                    onClick={() => handleDownload("excel", "asset")}
                  >
                    Excel
                  </Button>
                </Space>
              }
            >
              <Table
                dataSource={assetLoans}
                rowKey="id"
                size="small"
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
      <Space>
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
        >
          Tampilkan Laporan
        </Button>
      </Space>

      {dateLoans.length > 0 ? (
        <>
          <Row gutter={[16, 16]}>
            <Col span={6}>
              <StatisticCard
                title="Total Transaksi"
                value={dateLoans.length}
                icon={<BarChartOutlined />}
                color="#1890ff"
              />
            </Col>
            <Col span={6}>
              <StatisticCard
                title="Dipinjam"
                value={
                  dateLoans.filter(
                    (l) => l.status === "active" || l.status === "dipinjam",
                  ).length
                }
                icon={<CodeSandboxOutlined />}
                color="#faad14"
              />
            </Col>
            <Col span={6}>
              <StatisticCard
                title="Dikembalikan"
                value={
                  dateLoans.filter(
                    (l) =>
                      l.status === "completed" || l.status === "dikembalikan",
                  ).length
                }
                icon={<UserOutlined />}
                color="#52c41a"
              />
            </Col>
          </Row>

          <Card
            title={`Laporan Periode: ${dateRange[0]?.format("DD MMM")} - ${dateRange[1]?.format("DD MMM YYYY")}`}
            variant="borderless"
            extra={
              <Space>
                <Button
                  icon={<PrinterOutlined />}
                  onClick={() => handleDownload("pdf", "date")}
                >
                  Cetak PDF
                </Button>
                <Button
                  icon={<FileExcelOutlined />}
                  onClick={() => handleDownload("excel", "date")}
                >
                  Unduh Excel
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
                    <ul style={{ paddingLeft: 20, margin: 0 }}>
                      {(Array.isArray(assets) ? assets : []).map((a, idx) => (
                        <li key={idx}>
                          {a.nama_barang || a.name || "-"}{" "}
                          {a.nup ? `(NUP: ${a.nup})` : ""}
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
        <Empty description="Pilih rentang tanggal dan klik Tampilkan" />
      )}
    </Space>
  );

  const renderByEmployee = () => (
    <Space direction="vertical" style={{ width: "100%" }} size="large">
      <Card variant="borderless" style={{ background: "#f5f7fa" }}>
        <Space
          align="center"
          style={{ justifyContent: "space-between", width: "100%" }}
        >
          <Space>
            <UserOutlined style={{ fontSize: 24, color: "#722ed1" }} />
            <div>
              <Typography.Text strong style={{ fontSize: 16 }}>
                Pilih Pegawai
              </Typography.Text>
              <div style={{ fontSize: 12, color: "#666" }}>
                Lihat aset yang sedang atau pernah dipinjam
              </div>
            </div>
          </Space>
          <Select
            showSearch
            style={{ width: 300 }}
            placeholder="Nama pegawai atau NIP..."
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
        </Space>
      </Card>

      {selectedEmployee && (
        <Row gutter={[24, 24]}>
          <Col xs={24} md={8}>
            <Card title="Profil Pegawai" variant="borderless">
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: "#f0f0f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 10,
                  }}
                >
                  <UserOutlined style={{ fontSize: 32, color: "#999" }} />
                </div>
                <Typography.Title level={5} style={{ margin: 0 }}>
                  {selectedEmployee.nama || selectedEmployee.name}
                </Typography.Title>
                <Typography.Text type="secondary">
                  {selectedEmployee.nip}
                </Typography.Text>
              </div>
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="Jabatan">
                  {selectedEmployee.position || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Unit">
                  {selectedEmployee.department || "-"}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
          <Col xs={24} md={16}>
            <Card
              title="Aset Dipinjam"
              variant="borderless"
              extra={
                <Space>
                  <Button
                    size="small"
                    icon={<PrinterOutlined />}
                    onClick={() => handleDownload("pdf", "employee")}
                  >
                    PDF
                  </Button>
                  <Button
                    size="small"
                    icon={<FileExcelOutlined />}
                    onClick={() => handleDownload("excel", "employee")}
                  >
                    Excel
                  </Button>
                </Space>
              }
            >
              <Table
                dataSource={employeeLoans}
                rowKey="id"
                size="small"
                loading={employeeLoansLoading}
                columns={[
                  { title: "Barang", dataIndex: "asset_name" },
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

  const renderTrace = () => (
    <Space direction="vertical" style={{ width: "100%" }} size="large">
      <Row gutter={24}>
        <Col span={12}>
          <Card variant="borderless" title="Lacak Dokumen">
            <Tabs
              defaultActiveKey="spb"
              items={[
                {
                  key: "spb",
                  label: "Status SPB",
                  children: (
                    <Form
                      layout="vertical"
                      onFinish={(v) => handleTrace("spb", v.val)}
                    >
                      <Form.Item
                        name="val"
                        rules={[
                          { required: true, message: "Masukkan No. SPB" },
                        ]}
                      >
                        <Input
                          prefix={<FileSearchOutlined />}
                          placeholder="Contoh: SPB/2024/..."
                        />
                      </Form.Item>
                      <Button
                        type="primary"
                        htmlType="submit"
                        block
                        loading={traceLoading}
                      >
                        Cari SPB
                      </Button>
                    </Form>
                  ),
                },
                {
                  key: "spa",
                  label: "Status SPA",
                  children: (
                    <Form
                      layout="vertical"
                      onFinish={(v) => handleTrace("spa", v.val)}
                    >
                      <Form.Item
                        name="val"
                        rules={[
                          { required: true, message: "Masukkan No. SPA" },
                        ]}
                      >
                        <Input
                          prefix={<SearchOutlined />}
                          placeholder="Contoh: SPA/2024/..."
                        />
                      </Form.Item>
                      <Button
                        type="primary"
                        htmlType="submit"
                        block
                        loading={traceLoading}
                      >
                        Cari SPA
                      </Button>
                    </Form>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card
            variant="borderless"
            title="Hasil Penelusuran"
            style={{ minHeight: 300 }}
          >
            {traceError && <Alert type="error" message={traceError} showIcon />}
            {requestResult && (
              <Descriptions
                title={`SPB: ${requestResult.spb_number || requestResult.nomor}`}
                column={1}
                bordered
                size="small"
              >
                <Descriptions.Item label="Status">
                  <TagStatus status={requestResult.status} />
                </Descriptions.Item>
                <Descriptions.Item label="Pemohon">
                  {requestResult.nama}
                </Descriptions.Item>
                <Descriptions.Item label="Tanggal">
                  {formatDate(requestResult.tanggal_pengajuan)}
                </Descriptions.Item>
                <Descriptions.Item label="Detail">
                  {requestResult.items
                    ?.map((i) => `${i.nama_barang} (${i.jumlah})`)
                    .join(", ")}
                </Descriptions.Item>
              </Descriptions>
            )}
            {loanResult && (
              <Descriptions
                title={`SPA: ${loanResult.spa_number || loanResult.nomor}`}
                column={1}
                bordered
                size="small"
              >
                <Descriptions.Item label="Status">
                  <TagStatus status={loanResult.status} />
                </Descriptions.Item>
                <Descriptions.Item label="Peminjam">
                  {loanResult.borrower_name}
                </Descriptions.Item>
                <Descriptions.Item label="Periode">
                  {formatDate(loanResult.loan_date)} -{" "}
                  {formatDate(loanResult.return_date)}
                </Descriptions.Item>
                <Descriptions.Item label="Aset">
                  {loanResult.asset_name}
                </Descriptions.Item>
              </Descriptions>
            )}
            {!requestResult && !loanResult && !traceError && (
              <Empty
                description="Hasil pencarian akan muncul di sini"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>
        </Col>
      </Row>
    </Space>
  );

  return (
    <div className="module-section">
      <Space direction="vertical" style={{ width: "100%", marginBottom: 24 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Laporan & Analitik
        </Typography.Title>
        <Typography.Text type="secondary">
          Pusat data pelaporan aset, peminjaman, dan penelusuran dokumen.
        </Typography.Text>
      </Space>

      <Card
        variant="borderless"
        styles={{ body: { padding: "16px 24px" } }}
        loading={loadingInitial}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="card"
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
      </Card>
    </div>
  );
};

export default BmnLaporan;
