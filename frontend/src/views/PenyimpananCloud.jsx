import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  Select,
  Button,
  Table,
  Upload,
  Typography,
  Space,
  Tag,
  Modal,
  Alert,
  Progress,
  Input,
  Radio,
  Tooltip,
  Empty,
  message as andMessage,
} from "antd";
import {
  CloudServerOutlined,
  InboxOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  FileImageOutlined,
  SearchOutlined,
  ReloadOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  LoadingOutlined,
  FolderOpenOutlined,
} from "@ant-design/icons";
import { useAuth } from "../hooks/useAuth.js";
import dayjs from "dayjs";
import "./PenyimpananCloud.css";

const { Title, Text } = Typography;
const { Dragger } = Upload;

const formatBytes = (bytes, decimals = 2) => {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const getFileIcon = (name) => {
  const ext = name.split(".").pop().toLowerCase();
  switch (ext) {
    case "pdf":
      return <FilePdfOutlined style={{ color: "#ef4444", fontSize: "28px" }} />;
    case "xlsx":
    case "xls":
    case "csv":
      return <FileExcelOutlined style={{ color: "#10b981", fontSize: "28px" }} />;
    case "docx":
    case "doc":
      return <FileWordOutlined style={{ color: "#3b82f6", fontSize: "28px" }} />;
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
      return <FileImageOutlined style={{ color: "#ec4899", fontSize: "28px" }} />;
    default:
      return <FileOutlined style={{ color: "#64748b", fontSize: "28px" }} />;
  }
};

export default function PenyimpananCloud() {
  const { user, apiFetch } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [selectedNip, setSelectedNip] = useState("");
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // grid or list
  const [uploadProgress, setUploadProgress] = useState(null); // null or 0-100
  const [uploadFileName, setUploadFileName] = useState("");

  const isAdmin = user?.base_role === "admin";

  // Fetch employees list if Admin
  const fetchEmployees = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setLoadingEmployees(true);
      const response = await apiFetch("/employees?pageSize=1000");
      if (!response.ok) throw new Error("Gagal mengambil data pegawai.");
      const payload = await response.json();
      const list = payload.data ?? payload ?? [];
      setEmployees(
        list.map((emp) => ({
          nip: emp.nip,
          name: emp.name ?? emp.nama,
        }))
      );
    } catch (err) {
      andMessage.error(err.message);
    } finally {
      setLoadingEmployees(false);
    }
  }, [isAdmin, apiFetch]);

  // Fetch files in the folder
  const fetchFiles = useCallback(async () => {
    const nip = isAdmin ? selectedNip : user?.nip;
    if (!nip) {
      setFiles([]);
      return;
    }

    try {
      setLoadingFiles(true);
      const response = await apiFetch(`/nextcloud/files?nip=${nip}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal memuat berkas dari Nextcloud.");
      }
      const data = await response.json();
      setFiles(data.files || []);
    } catch (err) {
      andMessage.error(err.message);
    } finally {
      setLoadingFiles(false);
    }
  }, [isAdmin, selectedNip, user, apiFetch]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    // If not admin, load immediately. If admin, load when NIP is selected
    if (!isAdmin && user?.nip) {
      fetchFiles();
    } else if (isAdmin && selectedNip) {
      fetchFiles();
    }
  }, [isAdmin, user, selectedNip, fetchFiles]);

  // Secure download using apiFetch (streams file securely with JWT auth)
  const handleDownload = async (file) => {
    const key = `download-${file.name}`;
    try {
      andMessage.loading({ content: `Mengunduh ${file.name}...`, key });
      const response = await apiFetch(`/nextcloud/download?path=${encodeURIComponent(file.path)}`);
      if (!response.ok) throw new Error("Gagal mengunduh berkas dari Nextcloud.");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      andMessage.success({ content: "Berkas berhasil diunduh.", key });
    } catch (err) {
      andMessage.error({ content: err.message, key });
    }
  };

  // Secure delete request
  const handleDelete = (file) => {
    Modal.confirm({
      title: "Hapus Berkas",
      content: `Apakah Anda yakin ingin menghapus berkas "${file.name}" dari Nextcloud? Tindakan ini tidak dapat dibatalkan.`,
      okText: "Hapus",
      okType: "danger",
      cancelText: "Batal",
      centered: true,
      onOk: async () => {
        const key = `delete-${file.name}`;
        try {
          andMessage.loading({ content: "Menghapus berkas...", key });
          const response = await apiFetch(`/nextcloud/delete?path=${encodeURIComponent(file.path)}`, {
            method: "DELETE",
          });
          if (!response.ok) throw new Error("Gagal menghapus berkas.");
          andMessage.success({ content: "Berkas berhasil dihapus.", key });
          fetchFiles();
        } catch (err) {
          andMessage.error({ content: err.message, key });
        }
      },
    });
  };

  // Custom File Upload with real-time XHR upload progress
  const handleCustomUpload = async ({ file }) => {
    const nip = isAdmin ? selectedNip : user?.nip;
    if (!nip) {
      andMessage.warning("Pilih pegawai terlebih dahulu sebelum mengunggah.");
      return;
    }

    setUploadFileName(file.name);
    setUploadProgress(0);

    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);
    if (isAdmin) {
      formData.append("nip", nip);
    }

    // Progress Listener
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        setUploadProgress(percent);
      }
    });

    // Success / Fail Listener
    xhr.addEventListener("load", () => {
      setUploadProgress(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        andMessage.success(`Berkas "${file.name}" berhasil diunggah.`);
        fetchFiles();
      } else {
        try {
          const res = JSON.parse(xhr.responseText);
          andMessage.error(res.message || "Gagal mengunggah berkas.");
        } catch (_) {
          andMessage.error("Gagal mengunggah berkas.");
        }
      }
    });

    xhr.addEventListener("error", () => {
      setUploadProgress(null);
      andMessage.error("Koneksi terputus saat mengunggah berkas.");
    });

    const token = localStorage.getItem("sipaus_token");
    const baseUrlRaw = import.meta.env.VITE_API_URL || "https://siptu.bpompalopo.com/core_api/api";
    const baseUrl = baseUrlRaw.replace(/\/+$/, "");

    xhr.open("POST", `${baseUrl}/nextcloud/upload`);
    xhr.setRequestHeader("Accept", "application/json");
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.send(formData);
  };

  // Filter files locally by search query
  const filteredFiles = useMemo(() => {
    if (!searchQuery) return files;
    const query = searchQuery.toLowerCase();
    return files.filter((f) => f.name.toLowerCase().includes(query));
  }, [files, searchQuery]);

  // Columns for List View Table
  const columns = [
    {
      title: "Nama Berkas",
      dataIndex: "name",
      key: "name",
      render: (text) => (
        <Space size="middle">
          {getFileIcon(text)}
          <Text strong style={{ fontSize: "13px" }}>{text}</Text>
        </Space>
      ),
    },
    {
      title: "Ukuran",
      dataIndex: "size",
      key: "size",
      width: 120,
      render: (size) => <Text>{formatBytes(size)}</Text>,
    },
    {
      title: "Terakhir Diubah",
      dataIndex: "last_modified",
      key: "last_modified",
      width: 200,
      render: (date) => (
        <Text type="secondary">
          {date ? dayjs(date).format("DD MMM YYYY, HH:mm") : "-"}
        </Text>
      ),
    },
    {
      title: "Aksi",
      key: "actions",
      width: 120,
      align: "center",
      render: (_, file) => (
        <Space>
          <Tooltip title="Unduh">
            <Button
              type="text"
              icon={<DownloadOutlined style={{ color: "var(--color-primary)" }} />}
              onClick={() => handleDownload(file)}
            />
          </Tooltip>
          <Tooltip title="Hapus">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(file)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="penyimpanan-cloud-page">
      <div className="cloud-header-section">
        <div className="cloud-title-wrap">
          <CloudServerOutlined className="cloud-main-icon" />
          <div>
            <Title level={2} style={{ margin: 0 }}>Penyimpanan Cloud Terintegrasi</Title>
            <Text type="secondary">Unggah & backup berkas otomatis ke simpan.pom.go.id</Text>
          </div>
        </div>

        {isAdmin && (
          <div className="cloud-employee-picker">
            <Text strong className="picker-label">Kelola Folder Pegawai:</Text>
            <Select
              showSearch
              placeholder="Pilih pegawai..."
              optionFilterProp="children"
              style={{ width: 280 }}
              loading={loadingEmployees}
              value={selectedNip}
              onChange={setSelectedNip}
              filterOption={(input, option) =>
                (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
              options={employees.map((emp) => ({
                value: emp.nip,
                label: `${emp.name} (${emp.nip})`,
              }))}
            />
          </div>
        )}
      </div>

      <div className="cloud-grid-layout">
        {/* Left Side: Upload Zone */}
        <div className="cloud-upload-column">
          <Card title="Unggah Berkas Baru" variant="borderless" className="upload-card">
            <Dragger
              customRequest={handleCustomUpload}
              showUploadList={false}
              disabled={loadingFiles || (isAdmin && !selectedNip)}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ color: "var(--color-primary)" }} />
              </p>
              <p className="ant-upload-text">Klik atau seret file ke area ini</p>
              <p className="ant-upload-hint">
                Mendukung unggahan file tunggal hingga 250 MB. File akan langsung tersimpan di cloud Nextcloud.
              </p>
            </Dragger>

            {uploadProgress !== null && (
              <div className="upload-progress-box">
                <Text ellipsis style={{ width: "100%", display: "block" }}>
                  Mengunggah: <strong>{uploadFileName}</strong>
                </Text>
                <Progress percent={uploadProgress} status="active" strokeColor="var(--color-primary)" />
              </div>
            )}
          </Card>
        </div>

        {/* Right Side: File Explorer */}
        <div className="cloud-explorer-column">
          <Card
            variant="borderless"
            className="explorer-card"
            title={
              <div className="explorer-card-header">
                <span>Daftar Berkas</span>
                <div className="explorer-controls">
                  <Radio.Group
                    value={viewMode}
                    onChange={(e) => setViewMode(e.target.value)}
                    size="small"
                    className="view-toggle"
                  >
                    <Radio.Button value="grid">
                      <AppstoreOutlined />
                    </Radio.Button>
                    <Radio.Button value="list">
                      <UnorderedListOutlined />
                    </Radio.Button>
                  </Radio.Group>
                  <Button
                    type="text"
                    icon={<ReloadOutlined />}
                    onClick={fetchFiles}
                    disabled={loadingFiles || (isAdmin && !selectedNip)}
                  />
                </div>
              </div>
            }
          >
            {/* Toolbar search */}
            <div className="explorer-toolbar">
              <Input
                placeholder="Cari berkas..."
                prefix={<SearchOutlined style={{ color: "var(--color-text-muted)" }} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={loadingFiles || (isAdmin && !selectedNip)}
                className="search-input"
              />
              {(isAdmin && !selectedNip) ? (
                <Tag color="warning" className="status-tag">Silakan pilih pegawai terlebih dahulu</Tag>
              ) : (
                <Tag color="processing" icon={<FolderOpenOutlined />} className="status-tag">
                  {isAdmin ? `Folder: SIPTU Drive/${selectedNip}` : `Folder Pribadi: SIPTU Drive/${user?.nip}`}
                </Tag>
              )}
            </div>

            {loadingFiles ? (
              <div className="explorer-loader-box">
                <LoadingOutlined className="spinner-icon" />
                <Text type="secondary">Membaca berkas dari Nextcloud...</Text>
              </div>
            ) : filteredFiles.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  isAdmin && !selectedNip
                    ? "Pilih pegawai di dropdown atas untuk melihat berkas."
                    : "Belum ada berkas terunggah di folder ini."
                }
              />
            ) : viewMode === "list" ? (
              <Table
                dataSource={filteredFiles.map((f, i) => ({ ...f, key: i }))}
                columns={columns}
                pagination={{ pageSize: 8, showSizeChanger: false }}
                size="small"
                className="explorer-table"
              />
            ) : (
              <div className="cloud-file-grid">
                {filteredFiles.map((file, idx) => (
                  <Card key={idx} hoverable className="file-grid-card" bodyStyle={{ padding: "16px" }}>
                    <div className="file-card-top">
                      {getFileIcon(file.name)}
                      <div className="file-card-actions">
                        <Button
                          type="text"
                          size="small"
                          icon={<DownloadOutlined style={{ color: "var(--color-primary)" }} />}
                          onClick={() => handleDownload(file)}
                        />
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleDelete(file)}
                        />
                      </div>
                    </div>
                    <div className="file-card-details">
                      <Tooltip title={file.name}>
                        <Text strong className="file-name-text" ellipsis>
                          {file.name}
                        </Text>
                      </Tooltip>
                      <div className="file-meta">
                        <span className="file-size">{formatBytes(file.size)}</span>
                        <span className="file-date">
                          {file.last_modified ? dayjs(file.last_modified).format("DD MMM YYYY") : "-"}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
