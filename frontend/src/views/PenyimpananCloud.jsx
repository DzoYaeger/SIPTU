import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  Progress,
  Dropdown,
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
  ArrowLeftOutlined,
  MenuOutlined,
  EllipsisOutlined,
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
  const navigate = useNavigate();
  
  const [employees, setEmployees] = useState([]);
  const [selectedNip, setSelectedNip] = useState("");
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // grid or list
  const [currentPath, setCurrentPath] = useState(""); // relative to NIP root
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Modals state
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState({});

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

  // Separate Folders and Files
  const folderItems = useMemo(() => filteredFiles.filter((f) => f.is_dir), [filteredFiles]);
  const fileItems = useMemo(() => filteredFiles.filter((f) => !f.is_dir), [filteredFiles]);

  // Stats calculation
  const folderCount = useMemo(() => files.filter((f) => f.is_dir).length, [files]);
  const fileCount = useMemo(() => files.filter((f) => !f.is_dir).length, [files]);
  const totalSize = useMemo(() => {
    return files.reduce((acc, curr) => acc + (curr.size || 0), 0);
  }, [files]);

  // Mocking 10 GB limit for custom Drive indicator
  const quotaBytes = 10 * 1024 * 1024 * 1024;
  const usedPercent = useMemo(() => {
    return Math.min(Math.round((totalSize / quotaBytes) * 100), 100);
  }, [totalSize, quotaBytes]);

  // Action Menu items for "+ Baru" button
  const newButtonItems = useMemo(() => {
    return [
      {
        key: "new-folder",
        label: "Folder Baru",
        icon: <PlusOutlined />,
        onClick: () => setIsFolderModalOpen(true),
        disabled: isAdmin && !selectedNip,
      },
      {
        key: "upload-file",
        label: "Upload Berkas",
        icon: <UploadOutlined />,
        onClick: () => setIsUploadModalOpen(true),
        disabled: isAdmin && !selectedNip,
      },
    ];
  }, [isAdmin, selectedNip]);

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
    <div className={`drive-standalone-layout ${isSidebarOpen ? "sidebar-open" : ""}`}>
      {/* 1. Left Sidebar Section */}
      <div className={`drive-sidebar ${isSidebarOpen ? "open" : ""}`}>
        {/* Logo and Brand */}
        <div className="drive-logo-section">
          <CloudServerOutlined className="drive-logo-icon" />
          <span className="drive-logo-title">SIPTU Drive</span>
        </div>

        {/* Dynamic "+ Baru" Action Button */}
        <div className="drive-new-action-wrap">
          <Dropdown
            menu={{ items: newButtonItems }}
            trigger={["click"]}
            disabled={isAdmin && !selectedNip}
          >
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              className="drive-new-btn"
            >
              Baru
            </Button>
          </Dropdown>
        </div>

        {/* Employee Switcher (Visible to Admin only) */}
        {isAdmin && (
          <div className="drive-admin-picker-wrap">
            <span className="drive-sidebar-label">Kelola Folder Pegawai</span>
            <Select
              showSearch
              placeholder="Pilih pegawai..."
              optionFilterProp="children"
              style={{ width: "100%" }}
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
              className="drive-admin-select"
            />
          </div>
        )}

        {/* Main Drive Sidebar Menu */}
        <div className="drive-sidebar-menu">
          <div className="drive-menu-item active">
            <HomeOutlined />
            <span>Drive Saya</span>
          </div>
          <div className="drive-menu-item return-btn" onClick={() => navigate("/app/dashboard")}>
            <ArrowLeftOutlined />
            <span>Kembali ke SIPTU</span>
          </div>
        </div>

        {/* Dynamic storage indicator at the bottom */}
        {(!isAdmin || selectedNip) && (
          <div className="drive-storage-widget">
            <div className="storage-widget-header">
              <CloudServerOutlined />
              <span>Penyimpanan</span>
            </div>
            <Progress
              percent={usedPercent}
              size="small"
              strokeColor="var(--color-primary)"
              showInfo={false}
              className="storage-widget-progress"
            />
            <span className="storage-widget-info">
              {formatBytes(totalSize)} dari 10 GB digunakan
            </span>
          </div>
        )}
      </div>

      {/* Sidebar Backdrop Overlay on Mobile */}
      {isSidebarOpen && <div className="drive-sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} />}

      {/* 2. Main Workspace Panel */}
      <div className="drive-workspace">
        {/* Drive Header Bar */}
        <div className="drive-main-header">
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setIsSidebarOpen(true)}
            className="drive-menu-toggle-btn"
          />
          <div className="drive-search-container">
            <Input
              placeholder="Cari di SIPTU Drive..."
              prefix={<SearchOutlined style={{ color: "#5f6368" }} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={loadingFiles || (isAdmin && !selectedNip)}
              className="drive-search-input"
            />
          </div>
          <div className="drive-header-right">
            <Button
              type="text"
              shape="circle"
              icon={<ReloadOutlined />}
              onClick={fetchFiles}
              disabled={loadingFiles || (isAdmin && !selectedNip)}
              className="drive-header-icon-btn"
            />
            <div className="drive-user-profile">
              <div className="drive-avatar-circle">
                {user?.name?.[0]?.toUpperCase() ?? user?.username?.[0]?.toUpperCase() ?? "U"}
              </div>
              <div className="drive-profile-info">
                <span className="drive-profile-name">{user?.name ?? user?.username}</span>
                <span className="drive-profile-role">{isAdmin ? "Admin" : "Pegawai"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Folder explorer workspace container */}
        <div className="drive-content-area">
          
          {/* Breadcrumbs & Layout Switcher toolbar */}
          <div className="drive-toolbar-wrap">
            <div className="drive-navigation">
              <Breadcrumb separator=">">
                <Breadcrumb.Item onClick={() => navigateToSegment(-1)} className="breadcrumb-nav-link">
                  <HomeOutlined /> <span style={{ marginLeft: "4px" }}>Drive Saya</span>
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

          {/* Quick status display */}
          <div className="drive-path-status-bar">
            {(isAdmin && !selectedNip) ? (
              <Tag color="warning" className="status-tag">Silakan pilih pegawai terlebih dahulu di sidebar</Tag>
            ) : (
              <Tag color="processing" className="status-tag">
                Path: {isAdmin ? `SIPTU Drive/${selectedNip}${currentPath}` : `SIPTU Drive/${user?.nip}${currentPath}`}
              </Tag>
            )}
          </div>

          {/* Explorer Content */}
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
                  ? "Pilih pegawai di dropdown sidebar kiri untuk melihat berkas."
                  : "Folder ini masih kosong."
              }
              className="drive-empty-view"
            />
          ) : viewMode === "list" ? (
            <div className="drive-table-container">
              <Table
                dataSource={filteredFiles.map((f, i) => ({ ...f, key: i }))}
                columns={columns}
                pagination={{ pageSize: 15, showSizeChanger: false }}
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
            </div>
          ) : (
            <div className="drive-grid-workspace">
              {/* Render Folders Grid if folders exist */}
              {folderItems.length > 0 && (
                <div className="drive-folders-section">
                  <div className="drive-section-title">Folder</div>
                  <div className="drive-folders-grid">
                    {folderItems.map((folder, idx) => (
                      <div
                        key={idx}
                        className="drive-folder-chip"
                        onDoubleClick={() => handleFolderOpen(folder)}
                      >
                        <FolderFilled className="drive-folder-chip-icon" />
                        <span className="drive-folder-chip-name" title={folder.name}>
                          {folder.name}
                        </span>
                        <div className="drive-folder-chip-actions" onDoubleClick={(e) => e.stopPropagation()}>
                          <Dropdown
                            menu={{
                              items: [
                                {
                                  key: "delete",
                                  label: "Hapus",
                                  danger: true,
                                  icon: <DeleteOutlined />,
                                  onClick: () => handleDelete(folder),
                                }
                              ]
                            }}
                            trigger={["click"]}
                            placement="bottomRight"
                          >
                            <Button type="text" size="small" shape="circle" icon={<EllipsisOutlined />} />
                          </Dropdown>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Render Files Grid if files exist */}
              {fileItems.length > 0 && (
                <div className="drive-files-section">
                  <div className="drive-section-title">File</div>
                  <div className="drive-files-grid">
                    {fileItems.map((file, idx) => (
                      <div key={idx} className="drive-file-card">
                        <div className="drive-file-card-preview" onDoubleClick={() => handleDownload(file)}>
                          <div className="preview-icon-wrapper">
                            {getFileIcon(file)}
                          </div>
                          <div className="preview-extension-tag">
                            {file.name.split(".").pop().toUpperCase()}
                          </div>
                        </div>
                        <div className="drive-file-card-info">
                          <div className="drive-file-card-meta">
                            <span className="drive-file-title" title={file.name}>
                              {file.name}
                            </span>
                            <span className="drive-file-size">
                              {formatBytes(file.size)}
                            </span>
                          </div>
                          <div className="drive-file-card-actions">
                            <Tooltip title="Unduh">
                              <Button
                                type="text"
                                size="small"
                                shape="circle"
                                icon={<DownloadOutlined style={{ color: "var(--color-primary)" }} />}
                                onClick={() => handleDownload(file)}
                              />
                            </Tooltip>
                            <Tooltip title="Hapus">
                              <Button
                                type="text"
                                size="small"
                                shape="circle"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => handleDelete(file)}
                              />
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Folder Baru */}
      <Modal
        title="Buat Folder Baru"
        open={isFolderModalOpen}
        onOk={handleCreateFolder}
        onCancel={() => {
          setIsFolderModalOpen(false);
          setNewFolderName("");
        }}
        confirmLoading={creatingFolder}
        okText="Buat"
        cancelText="Batal"
        centered
      >
        <div style={{ padding: "12px 0" }}>
          <Text type="secondary" style={{ display: "block", marginBottom: "8px" }}>Nama Folder:</Text>
          <Input
            placeholder="Folder tanpa nama"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onPressEnter={handleCreateFolder}
            autoFocus
          />
        </div>
      </Modal>

      {/* Modal: Upload Zone (Queue) */}
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
