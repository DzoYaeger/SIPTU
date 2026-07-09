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
  Input,
  Radio,
  Tooltip,
  Empty,
  Breadcrumb,
  Row,
  Col,
  Statistic,
  Progress,
  message as andMessage,
} from "antd";
import {
  CloudServerOutlined,
  InboxOutlined,
  DeleteOutlined,
  DownloadOutlined,
  SearchOutlined,
  ReloadOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  LoadingOutlined,
  HomeOutlined,
  PlusOutlined,
  FolderFilled,
  FilePdfFilled,
  FileExcelFilled,
  FileWordFilled,
  FileImageFilled,
  FileZipFilled,
  FilePptFilled,
  PlayCircleFilled,
  CustomerServiceFilled,
  FileFilled,
  FolderOpenOutlined,
  UploadOutlined,
  ArrowUpOutlined,
} from "@ant-design/icons";
import { useAuth } from "../hooks/useAuth.js";
import dayjs from "dayjs";
import "./PenyimpananCloud.css";

const { Title, Text } = Typography;
const { Dragger } = Upload;

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === null || bytes === undefined) return "-";
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const getFileIcon = (file) => {
  if (file.is_dir) {
    return <FolderFilled className="drive-icon-folder" />;
  }
  const ext = file.name.split(".").pop().toLowerCase();
  switch (ext) {
    case "pdf":
      return <FilePdfFilled className="drive-icon-pdf" />;
    case "xlsx":
    case "xls":
    case "csv":
      return <FileExcelFilled className="drive-icon-excel" />;
    case "docx":
    case "doc":
      return <FileWordFilled className="drive-icon-word" />;
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
    case "svg":
      return <FileImageFilled className="drive-icon-image" />;
    case "zip":
    case "rar":
    case "7z":
    case "tar":
    case "gz":
      return <FileZipFilled className="drive-icon-zip" />;
    case "pptx":
    case "ppt":
      return <FilePptFilled className="drive-icon-ppt" />;
    case "mp4":
    case "avi":
    case "mkv":
    case "mov":
      return <PlayCircleFilled className="drive-icon-video" />;
    case "mp3":
    case "wav":
    case "m4a":
      return <CustomerServiceFilled className="drive-icon-audio" />;
    default:
      return <FileFilled className="drive-icon-default" />;
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
  const [currentPath, setCurrentPath] = useState(""); // relative to NIP root

  // Modals state
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState({}); // { [uid]: { uid, name, size, progress, status, errorMessage } }

  const hasActiveUploads = useMemo(() => {
    return Object.values(uploadingFiles).some((f) => f.status === "uploading");
  }, [uploadingFiles]);

  const isAdmin = user?.base_role === "admin";

  // Reset path when changing employee NIP
  useEffect(() => {
    setCurrentPath("");
  }, [selectedNip]);

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

  // Fetch files in the current folder
  const fetchFiles = useCallback(async () => {
    const nip = isAdmin ? selectedNip : user?.nip;
    if (!nip) {
      setFiles([]);
      return;
    }

    try {
      setLoadingFiles(true);
      const url = `/nextcloud/files?nip=${nip}&path=${encodeURIComponent(currentPath)}`;
      const response = await apiFetch(url);
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
  }, [isAdmin, selectedNip, user, apiFetch, currentPath]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    if (!isAdmin && user?.nip) {
      fetchFiles();
    } else if (isAdmin && selectedNip) {
      fetchFiles();
    }
  }, [isAdmin, user, selectedNip, fetchFiles]);

  // Folder Navigation Helper
  const handleFolderOpen = (folder) => {
    const nip = isAdmin ? selectedNip : user?.nip;
    const basePrefix = `/SIPTU Drive/${nip}`;
    let relative = folder.path;
    if (relative.startsWith(basePrefix)) {
      relative = relative.substring(basePrefix.length);
    }
    setCurrentPath(relative);
  };

  // Breadcrumbs parsed array
  const pathSegments = useMemo(() => {
    return currentPath.split("/").filter(Boolean);
  }, [currentPath]);

  const navigateToSegment = (index) => {
    if (index === -1) {
      setCurrentPath("");
    } else {
      const targetSegments = pathSegments.slice(0, index + 1);
      setCurrentPath("/" + targetSegments.join("/"));
    }
  };

  // Secure download
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
      title: "Hapus Item",
      content: `Apakah Anda yakin ingin menghapus "${file.name}" dari Nextcloud? ${
        file.is_dir ? "Semua subfolder dan berkas di dalamnya juga akan terhapus." : ""
      } Tindakan ini tidak dapat dibatalkan.`,
      okText: "Hapus",
      okType: "danger",
      cancelText: "Batal",
      centered: true,
      onOk: async () => {
        const key = `delete-${file.name}`;
        try {
          andMessage.loading({ content: "Menghapus...", key });
          const response = await apiFetch(`/nextcloud/delete?path=${encodeURIComponent(file.path)}`, {
            method: "DELETE",
          });
          if (!response.ok) throw new Error("Gagal menghapus.");
          andMessage.success({ content: "Berhasil dihapus.", key });
          fetchFiles();
        } catch (err) {
          andMessage.error({ content: err.message, key });
        }
      },
    });
  };

  // Create Folder handler
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      andMessage.warning("Nama folder tidak boleh kosong.");
      return;
    }
    const nip = isAdmin ? selectedNip : user?.nip;
    if (!nip) return;

    try {
      setCreatingFolder(true);
      const response = await apiFetch("/nextcloud/folder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nip,
          path: currentPath,
          folder_name: newFolderName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal membuat folder.");
      }

      andMessage.success(`Folder "${newFolderName}" berhasil dibuat.`);
      setNewFolderName("");
      setIsFolderModalOpen(false);
      fetchFiles();
    } catch (err) {
      andMessage.error(err.message);
    } finally {
      setCreatingFolder(false);
    }
  };

  // Upload handler with real-time XHR progress supporting multiple files
  const handleCustomUpload = async ({ file }) => {
    const nip = isAdmin ? selectedNip : user?.nip;
    if (!nip) {
      andMessage.warning("Pilih pegawai terlebih dahulu.");
      return;
    }

    const fileUid = file.uid;

    // Add file to uploading list
    setUploadingFiles((prev) => ({
      ...prev,
      [fileUid]: {
        uid: fileUid,
        name: file.name,
        size: file.size,
        progress: 0,
        status: "uploading",
      },
    }));

    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", currentPath);
    if (isAdmin) {
      formData.append("nip", nip);
    }

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        setUploadingFiles((prev) => {
          if (!prev[fileUid] || prev[fileUid].progress === percent) return prev;
          return {
            ...prev,
            [fileUid]: {
              ...prev[fileUid],
              progress: percent,
            },
          };
        });
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setUploadingFiles((prev) => ({
          ...prev,
          [fileUid]: {
            ...prev[fileUid],
            progress: 100,
            status: "success",
          },
        }));
        andMessage.success(`Berkas "${file.name}" berhasil diunggah.`);
        fetchFiles();
      } else {
        let errorMsg = "Gagal mengunggah berkas.";
        try {
          const res = JSON.parse(xhr.responseText);
          errorMsg = res.message || errorMsg;
        } catch (_) {}

        setUploadingFiles((prev) => ({
          ...prev,
          [fileUid]: {
            ...prev[fileUid],
            status: "error",
            errorMessage: errorMsg,
          },
        }));
        andMessage.error(`Gagal mengunggah "${file.name}": ${errorMsg}`);
      }
    });

    xhr.addEventListener("error", () => {
      setUploadingFiles((prev) => ({
        ...prev,
        [fileUid]: {
          ...prev[fileUid],
          status: "error",
          errorMessage: "Koneksi terputus saat mengunggah.",
        },
      }));
      andMessage.error(`Koneksi terputus saat mengunggah "${file.name}".`);
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

  // Filter files
  const filteredFiles = useMemo(() => {
    if (!searchQuery) return files;
    const query = searchQuery.toLowerCase();
    return files.filter((f) => f.name.toLowerCase().includes(query));
  }, [files, searchQuery]);

  // Stats calculation
  const folderCount = useMemo(() => files.filter((f) => f.is_dir).length, [files]);
  const fileCount = useMemo(() => files.filter((f) => !f.is_dir).length, [files]);
  const totalSize = useMemo(() => {
    return files.reduce((acc, curr) => acc + (curr.size || 0), 0);
  }, [files]);

  // List View columns
  const columns = [
    {
      title: "Nama",
      dataIndex: "name",
      key: "name",
      render: (text, record) => (
        <Space size="middle">
          {getFileIcon(record)}
          {record.is_dir ? (
            <Button
              type="link"
              onClick={() => handleFolderOpen(record)}
              className="list-folder-link"
            >
              {text}
            </Button>
          ) : (
            <Text strong className="list-file-text">
              {text}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: "Ukuran",
      dataIndex: "size",
      key: "size",
      width: 130,
      render: (size, record) => (record.is_dir ? <Text type="secondary">-</Text> : <Text>{formatBytes(size)}</Text>),
    },
    {
      title: "Terakhir Diubah",
      dataIndex: "last_modified",
      key: "last_modified",
      width: 220,
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
          {!file.is_dir && (
            <Tooltip title="Unduh">
              <Button
                type="text"
                shape="circle"
                icon={<DownloadOutlined style={{ color: "var(--color-primary)" }} />}
                onClick={() => handleDownload(file)}
              />
            </Tooltip>
          )}
          <Tooltip title="Hapus">
            <Button
              type="text"
              shape="circle"
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
      {/* Header section */}
      <div className="cloud-header-section">
        <div className="cloud-title-wrap">
          <CloudServerOutlined className="cloud-main-icon" />
          <div>
            <Title level={2} style={{ margin: 0 }}>SIPTU Drive</Title>
            <Text type="secondary">Unggah & backup berkas otomatis terintegrasi Nextcloud</Text>
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

      {/* Stats Cards */}
      {(!isAdmin || selectedNip) && files.length > 0 && (
        <Row gap={16} className="drive-stats-row">
          <Col xs={24} sm={8}>
            <Card variant="borderless" className="stat-card">
              <Statistic title="Jumlah Folder" value={folderCount} prefix={<FolderOpenOutlined className="stat-icon-yellow" />} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card variant="borderless" className="stat-card">
              <Statistic title="Jumlah Berkas" value={fileCount} prefix={<FileFilled className="stat-icon-blue" />} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card variant="borderless" className="stat-card">
              <Statistic title="Ukuran Penyimpanan" value={formatBytes(totalSize)} prefix={<ArrowUpOutlined className="stat-icon-green" />} />
            </Card>
          </Col>
        </Row>
      )}

      {/* Full-width Explorer Panel */}
      <Card variant="borderless" className="explorer-card">
        {/* Breadcrumbs & Actions Toolbar */}
        <div className="drive-toolbar-wrap">
          <div className="drive-navigation">
            <Breadcrumb separator=">">
              <Breadcrumb.Item onClick={() => navigateToSegment(-1)} className="breadcrumb-nav-link">
                <HomeOutlined /> <span style={{ marginLeft: "4px" }}>SIPTU Drive</span>
              </Breadcrumb.Item>
              {pathSegments.map((segment, idx) => (
                <Breadcrumb.Item
                  key={idx}
                  onClick={() => navigateToSegment(idx)}
                  className="breadcrumb-nav-link"
                >
                  {segment}
                </Breadcrumb.Item>
              ))}
            </Breadcrumb>
          </div>

          <div className="drive-actions">
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={() => setIsUploadModalOpen(true)}
              disabled={loadingFiles || (isAdmin && !selectedNip)}
            >
              Upload Berkas
            </Button>
            <Button
              icon={<PlusOutlined />}
              onClick={() => setIsFolderModalOpen(true)}
              disabled={loadingFiles || (isAdmin && !selectedNip)}
            >
              Folder Baru
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchFiles}
              disabled={loadingFiles || (isAdmin && !selectedNip)}
            />
            <Radio.Group
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              className="view-toggle"
            >
              <Radio.Button value="grid"><AppstoreOutlined /></Radio.Button>
              <Radio.Button value="list"><UnorderedListOutlined /></Radio.Button>
            </Radio.Group>
          </div>
        </div>

        {/* Search Toolbar */}
        <div className="explorer-toolbar" style={{ borderBottom: "none", paddingBottom: 0 }}>
          <Input
            placeholder="Cari berkas atau folder..."
            prefix={<SearchOutlined style={{ color: "var(--color-text-muted)" }} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={loadingFiles || (isAdmin && !selectedNip)}
            className="search-input"
            style={{ width: "100%", maxWidth: "360px" }}
          />
          {(isAdmin && !selectedNip) ? (
            <Tag color="warning" className="status-tag">Silakan pilih pegawai terlebih dahulu</Tag>
          ) : (
            <Tag color="processing" className="status-tag">
              Path: {isAdmin ? `SIPTU Drive/${selectedNip}${currentPath}` : `SIPTU Drive/${user?.nip}${currentPath}`}
            </Tag>
          )}
        </div>

        {/* Content Panel */}
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
                : "Folder ini masih kosong."
            }
          />
        ) : viewMode === "list" ? (
          <Table
            dataSource={filteredFiles.map((f, i) => ({ ...f, key: i }))}
            columns={columns}
            pagination={{ pageSize: 12, showSizeChanger: false }}
            size="middle"
            className="explorer-table"
            onRow={(record) => ({
              onDoubleClick: () => {
                if (record.is_dir) {
                  handleFolderOpen(record);
                }
              },
            })}
          />
        ) : (
          <div className="cloud-file-grid">
            {filteredFiles.map((file, idx) => (
              <Card
                key={idx}
                hoverable
                className={`file-grid-card ${file.is_dir ? "folder-card" : "file-card"}`}
                bodyStyle={{ padding: "16px" }}
                onDoubleClick={() => {
                  if (file.is_dir) handleFolderOpen(file);
                }}
              >
                <div className="file-card-top">
                  {getFileIcon(file)}
                  <div className="file-card-actions">
                    {!file.is_dir && (
                      <Button
                        type="text"
                        size="small"
                        shape="circle"
                        icon={<DownloadOutlined style={{ color: "var(--color-primary)" }} />}
                        onClick={() => handleDownload(file)}
                      />
                    )}
                    <Button
                      type="text"
                      size="small"
                      danger
                      shape="circle"
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
                    <span className="file-size">
                      {file.is_dir ? "Folder" : formatBytes(file.size)}
                    </span>
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

      {/* Modal: New Folder */}
      <Modal
        title="Buat Folder Baru"
        open={isFolderModalOpen}
        onOk={handleCreateFolder}
        onCancel={() => {
          setIsFolderModalOpen(false);
          setNewFolderName("");
        }}
        confirmLoading={creatingFolder}
        okText="Buat Folder"
        cancelText="Batal"
        centered
      >
        <div style={{ padding: "12px 0" }}>
          <Text type="secondary" style={{ display: "block", marginBottom: "8px" }}>Nama Folder:</Text>
          <Input
            placeholder="Ketik nama folder baru..."
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onPressEnter={handleCreateFolder}
            autoFocus
          />
        </div>
      </Modal>

      {/* Modal: Upload Zone */}
      <Modal
        title="Upload Berkas ke Folder Ini"
        open={isUploadModalOpen}
        footer={null}
        onCancel={() => {
          if (!hasActiveUploads) {
            setIsUploadModalOpen(false);
            setUploadingFiles({});
          } else {
            andMessage.warning("Harap tunggu hingga semua berkas selesai diunggah.");
          }
        }}
        centered
        destroyOnClose
      >
        <div style={{ padding: "20px 0" }}>
          <Dragger
            customRequest={handleCustomUpload}
            showUploadList={false}
            multiple={true}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ color: "var(--color-primary)", fontSize: "48px" }} />
            </p>
            <p className="ant-upload-text">Klik atau seret satu atau beberapa berkas ke area ini</p>
            <p className="ant-upload-hint">
              Mendukung upload beberapa berkas sekaligus. Ukuran per berkas maks 250 MB.
            </p>
          </Dragger>

          {Object.keys(uploadingFiles).length > 0 && (
            <div className="upload-queue-container" style={{ marginTop: "24px" }}>
              <div className="upload-queue-header">
                <Text strong>Antrean Upload ({Object.values(uploadingFiles).filter(f => f.status === 'uploading').length} aktif)</Text>
              </div>
              <div className="upload-queue-list">
                {Object.values(uploadingFiles).map((item) => {
                  const isUploading = item.status === 'uploading';
                  const isSuccess = item.status === 'success';
                  const isError = item.status === 'error';
                  
                  return (
                    <div key={item.uid} className={`upload-queue-item ${item.status}`}>
                      <div className="upload-item-main">
                        <div className="upload-item-icon">
                          {getFileIcon({ name: item.name, is_dir: false })}
                        </div>
                        <div className="upload-item-info">
                          <Tooltip title={item.name}>
                            <Text ellipsis className="upload-item-name" style={{ maxWidth: "230px" }}>
                              {item.name}
                            </Text>
                          </Tooltip>
                          <Text type="secondary" className="upload-item-size">
                            {formatBytes(item.size)}
                          </Text>
                        </div>
                        <div className="upload-item-status">
                          {isUploading && <LoadingOutlined style={{ color: "var(--color-primary)" }} />}
                          {isSuccess && <span style={{ color: "#52c41a", fontWeight: "600" }}>✓ Berhasil</span>}
                          {isError && (
                            <Tooltip title={item.errorMessage}>
                              <span style={{ color: "#ff4d4f", cursor: "pointer", fontWeight: "600" }}>⚠ Gagal</span>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                      {isUploading && (
                        <div className="upload-item-progress">
                          <Progress 
                            percent={item.progress} 
                            size="small" 
                            status="active" 
                            strokeColor="var(--color-primary)" 
                            showInfo={true}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
