import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { 
  Button, 
  Card, 
  Checkbox,
  Typography, 
  Spin, 
  Empty, 
  Space, 
  Table, 
  Input, 
  Radio, 
  Tooltip, 
  Breadcrumb, 
  Dropdown, 
  Modal, 
  Upload, 
  Progress,
  message as andMessage 
} from "antd";
import {
  DownloadOutlined,
  CloudServerOutlined,
  CloudUploadOutlined,
  FilePdfFilled,
  FileExcelFilled,
  FileWordFilled,
  FileImageFilled,
  FileZipFilled,
  FilePptFilled,
  PlayCircleFilled,
  CustomerServiceFilled,
  FileFilled,
  FolderFilled,
  HomeOutlined,
  SearchOutlined,
  ReloadOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  PlusOutlined,
  FolderOpenOutlined,
  DeleteOutlined,
  EllipsisOutlined,
  InboxOutlined,
  LoadingOutlined,
  LinkOutlined,
  ArrowLeftOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  MinusOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import "./PublicSharePage.css";

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

const getFileIcon = (fileName, isDir) => {
  if (isDir) {
    return <FolderFilled className="share-large-icon share-icon-folder" />;
  }
  if (!fileName) return <FileFilled className="share-large-icon drive-icon-default" />;
  const ext = fileName.split(".").pop().toLowerCase();
  switch (ext) {
    case "pdf":
      return <FilePdfFilled className="share-large-icon drive-icon-pdf" />;
    case "xlsx":
    case "xls":
    case "csv":
      return <FileExcelFilled className="share-large-icon drive-icon-excel" />;
    case "docx":
    case "doc":
      return <FileWordFilled className="share-large-icon drive-icon-word" />;
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
    case "svg":
      return <FileImageFilled className="share-large-icon drive-icon-image" />;
    case "zip":
    case "rar":
    case "7z":
    case "tar":
    case "gz":
      return <FileZipFilled className="share-large-icon drive-icon-zip" />;
    case "pptx":
    case "ppt":
      return <FilePptFilled className="share-large-icon drive-icon-ppt" />;
    case "mp4":
    case "avi":
    case "mkv":
    case "mov":
      return <PlayCircleFilled className="share-large-icon drive-icon-video" />;
    case "mp3":
    case "wav":
    case "m4a":
      return <CustomerServiceFilled className="share-large-icon drive-icon-audio" />;
    default:
      return <FileFilled className="share-large-icon drive-icon-default" />;
  }
};

const getListFileIcon = (fileName, isDir) => {
  if (isDir) {
    return <FolderFilled style={{ color: "#ffc107", fontSize: "18px" }} />;
  }
  if (!fileName) return <FileFilled style={{ color: "#757575", fontSize: "18px" }} />;
  const ext = fileName.split(".").pop().toLowerCase();
  switch (ext) {
    case "pdf":
      return <FilePdfFilled style={{ color: "#ea4335", fontSize: "18px" }} />;
    case "xlsx":
    case "xls":
    case "csv":
      return <FileExcelFilled style={{ color: "#0f9d58", fontSize: "18px" }} />;
    case "docx":
    case "doc":
      return <FileWordFilled style={{ color: "#4285f4", fontSize: "18px" }} />;
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
    case "svg":
      return <FileImageFilled style={{ color: "#ff69b4", fontSize: "18px" }} />;
    case "zip":
    case "rar":
    case "7z":
    case "tar":
    case "gz":
      return <FileZipFilled style={{ color: "#9c27b0", fontSize: "18px" }} />;
    case "pptx":
    case "ppt":
      return <FilePptFilled style={{ color: "#ff5722", fontSize: "18px" }} />;
    case "mp4":
    case "avi":
    case "mkv":
    case "mov":
      return <PlayCircleFilled style={{ color: "#3f51b5", fontSize: "18px" }} />;
    case "mp3":
    case "wav":
    case "m4a":
      return <CustomerServiceFilled style={{ color: "#ff9800", fontSize: "18px" }} />;
    default:
      return <FileFilled style={{ color: "#757575", fontSize: "18px" }} />;
  }
};

export default function PublicSharePage() {
  const { token } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentSubPath = searchParams.get("path") || "";

  const [fileInfo, setFileInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("list"); // grid or list

  // Modals state for public write operations
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState({});
  const [downloads, setDownloads] = useState({});
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [isDownloadWidgetVisible, setIsDownloadWidgetVisible] = useState(false);
  const [isDownloadWidgetMinimized, setIsDownloadWidgetMinimized] = useState(false);
  const [isUploadWidgetVisible, setIsUploadWidgetVisible] = useState(false);
  const [isUploadWidgetMinimized, setIsUploadWidgetMinimized] = useState(false);
  const [isDraggingOverPage, setIsDraggingOverPage] = useState(false);
  const dragCounter = useRef(0);

  // Selector modal states (Move/Copy)
  const [isSelectorModalOpen, setIsSelectorModalOpen] = useState(false);
  const [selectorAction, setSelectorAction] = useState("move"); // "move" or "copy"
  const [selectorSourceFile, setSelectorSourceFile] = useState(null);
  const [selectorPath, setSelectorPath] = useState("");
  const [selectorFolders, setSelectorFolders] = useState([]);
  const [loadingSelectorFolders, setLoadingSelectorFolders] = useState(false);
  const [executingSelector, setExecutingSelector] = useState(false);

  // PDF Preview state
  const [previewPdfFile, setPreviewPdfFile] = useState(null);

  const handleDragEnter = (e) => {
    if (!fileInfo?.can_edit) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOverPage(true);
    }
  };

  const handleDragLeave = (e) => {
    if (!fileInfo?.can_edit) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDraggingOverPage(false);
    }
  };

  const handleDragOver = (e) => {
    if (!fileInfo?.can_edit) return;
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    if (!fileInfo?.can_edit) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverPage(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesList = Array.from(e.dataTransfer.files);
      filesList.forEach((rawFile) => {
        handleCustomUpload({ file: rawFile });
      });
    }
  };

  const baseUrlRaw = import.meta.env.VITE_API_URL || "https://siptu.bpompalopo.com/core_api/api";
  const baseUrl = baseUrlRaw.replace(/\/+$/, "");

  const hasActiveUploads = useMemo(() => {
    return Object.values(uploadingFiles).some((f) => f.status === "uploading");
  }, [uploadingFiles]);

  const fetchInfo = async () => {
    try {
      setLoading(true);
      const url = `${baseUrl}/share/info/${token}?path=${encodeURIComponent(currentSubPath)}`;
      const response = await fetch(url);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Tautan tidak valid atau berkas tidak ditemukan.");
      }
      const data = await response.json();
      setFileInfo(data);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInfo();
  }, [token, baseUrl, currentSubPath]);

  useEffect(() => {
    setSelectedRowKeys([]);
  }, [currentSubPath]);

  // Resolve relative path from file path
  const getRelativePath = useCallback((absolutePath) => {
    const basePath = fileInfo?.base_path || "";
    let relative = absolutePath;
    if (relative.startsWith(basePath)) {
      relative = relative.substring(basePath.length);
    }
    return relative.replace(/^\/+/, "");
  }, [fileInfo]);

  // Navigate to child folder
  const handleFolderOpen = (folder) => {
    const relative = getRelativePath(folder.path);
    setSearchParams({ path: relative });
  };

  // Breadcrumbs data helper
  const breadcrumbs = useMemo(() => {
    if (!fileInfo) return [];
    const segments = currentSubPath.split("/").filter(Boolean);
    const items = [{ name: fileInfo.is_dir && currentSubPath === "" ? fileInfo.name : "Shared Root", path: "" }];

    let runningPath = "";
    segments.forEach((seg) => {
      runningPath = runningPath ? `${runningPath}/${seg}` : seg;
      items.push({ name: seg, path: runningPath });
    });
    return items;
  }, [fileInfo, currentSubPath]);

  const handleBreadcrumbClick = (path) => {
    if (path === "") {
      setSearchParams({});
    } else {
      setSearchParams({ path });
    }
  };

  // Filter children files
  const filteredFiles = useMemo(() => {
    if (!fileInfo || !fileInfo.files) return [];
    if (!searchQuery) return fileInfo.files;
    const query = searchQuery.toLowerCase();
    return fileInfo.files.filter((f) => f.name.toLowerCase().includes(query));
  }, [fileInfo, searchQuery]);

  const folderItems = useMemo(() => filteredFiles.filter((f) => f.is_dir), [filteredFiles]);
  const fileItems = useMemo(() => filteredFiles.filter((f) => !f.is_dir), [filteredFiles]);

  const getDownloadUrl = useCallback((file, inline = false) => {
    const relative = getRelativePath(file.path);
    let url = `${baseUrl}/share/download/${token}?path=${encodeURIComponent(relative)}`;
    if (inline) {
      url += "&inline=1";
    }
    return url;
  }, [baseUrl, token, getRelativePath]);

  const handleDownload = (file) => {
    const fileId = `download-${Date.now()}-${file.name}`;
    
    setDownloads((prev) => ({
      ...prev,
      [fileId]: {
        id: fileId,
        name: file.name,
        size: file.size,
        progress: 0,
        status: "downloading",
      },
    }));
    setIsDownloadWidgetVisible(true);
    setIsDownloadWidgetMinimized(false);

    const xhr = new XMLHttpRequest();
    const url = getDownloadUrl(file);

    xhr.open("GET", url, true);
    xhr.responseType = "blob";

    xhr.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        setDownloads((prev) => {
          if (!prev[fileId] || prev[fileId].progress === percent) return prev;
          return {
            ...prev,
            [fileId]: {
              ...prev[fileId],
              progress: percent,
            },
          };
        });
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const blob = xhr.response;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();

        setDownloads((prev) => ({
          ...prev,
          [fileId]: {
            ...prev[fileId],
            progress: 100,
            status: "success",
          },
        }));
      } else {
        setDownloads((prev) => ({
          ...prev,
          [fileId]: {
            ...prev[fileId],
            status: "error",
            errorMessage: "Gagal mengunduh berkas.",
          },
        }));
      }
    });

    xhr.addEventListener("error", () => {
      setDownloads((prev) => ({
        ...prev,
        [fileId]: {
          ...prev[fileId],
          status: "error",
          errorMessage: "Koneksi terputus.",
        },
      }));
    });

    xhr.send();
  };

  // Public folder creation
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      andMessage.warning("Nama folder tidak boleh kosong.");
      return;
    }
    try {
      setCreatingFolder(true);
      const response = await fetch(`${baseUrl}/share/folder/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: currentSubPath,
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
      fetchInfo();
    } catch (err) {
      andMessage.error(err.message);
    } finally {
      setCreatingFolder(false);
    }
  };

  // Public upload with progress support
  const handleCustomUpload = async ({ file }) => {
    const fileUid = file.uid || `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setIsUploadWidgetVisible(true);
    setIsUploadWidgetMinimized(false);
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
    formData.append("path", currentSubPath);

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
          [fileUid]: { ...prev[fileUid], progress: 100, status: "success" },
        }));
        andMessage.success(`Berkas "${file.name}" berhasil diunggah.`);
        fetchInfo();
      } else {
        let errorMsg = "Gagal mengunggah berkas.";
        try {
          const res = JSON.parse(xhr.responseText);
          errorMsg = res.message || errorMsg;
        } catch (_) {}
        setUploadingFiles((prev) => ({
          ...prev,
          [fileUid]: { ...prev[fileUid], status: "error", errorMessage: errorMsg },
        }));
        andMessage.error(`Gagal mengunggah "${file.name}": ${errorMsg}`);
      }
    });

    xhr.addEventListener("error", () => {
      setUploadingFiles((prev) => ({
        ...prev,
        [fileUid]: { ...prev[fileUid], status: "error", errorMessage: "Koneksi terputus." },
      }));
      andMessage.error(`Koneksi terputus saat mengunggah "${file.name}".`);
    });

    xhr.open("POST", `${baseUrl}/share/upload/${token}`);
    xhr.setRequestHeader("Accept", "application/json");
    xhr.send(formData);
  };

  // Public deletion
  const handleDelete = (file) => {
    Modal.confirm({
      title: "Hapus Item",
      content: `Apakah Anda yakin ingin menghapus "${file.name}"? Tindakan ini tidak dapat dibatalkan.`,
      okText: "Hapus",
      okType: "danger",
      cancelText: "Batal",
      centered: true,
      onOk: async () => {
        const key = `delete-${file.name}`;
        try {
          andMessage.loading({ content: "Menghapus...", key });
          const relative = getRelativePath(file.path);
          const response = await fetch(
            `${baseUrl}/share/delete/${token}?path=${encodeURIComponent(relative)}`,
            { method: "DELETE" }
          );
          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.message || "Gagal menghapus.");
          }
          andMessage.success({ content: "Berhasil dihapus.", key });
          fetchInfo();
        } catch (err) {
          andMessage.error({ content: err.message, key });
        }
      },
    });
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) return;
    
    Modal.confirm({
      title: "Hapus Beberapa Item",
      content: `Apakah Anda yakin ingin menghapus ${selectedRowKeys.length} item terpilih? Tindakan ini tidak dapat dibatalkan.`,
      okText: "Hapus",
      okType: "danger",
      cancelText: "Batal",
      centered: true,
      onOk: async () => {
        const key = "batch-delete";
        andMessage.loading({ content: `Menghapus 0/${selectedRowKeys.length} item...`, key });
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < selectedRowKeys.length; i++) {
          const path = selectedRowKeys[i];
          try {
            const relative = getRelativePath(path);
            const response = await fetch(
              `${baseUrl}/share/delete/${token}?path=${encodeURIComponent(relative)}`,
              { method: "DELETE" }
            );
            if (response.ok) {
              successCount++;
            } else {
              failCount++;
            }
          } catch (err) {
            failCount++;
          }
          andMessage.loading({ 
            content: `Menghapus ${successCount + failCount}/${selectedRowKeys.length} item...`, 
            key 
          });
        }

        if (failCount > 0) {
          andMessage.warning({ 
            content: `Berhasil menghapus ${successCount} item. ${failCount} item gagal dihapus.`, 
            key, 
            duration: 3 
          });
        } else {
          andMessage.success({ content: `Berhasil menghapus ${successCount} item.`, key, duration: 3 });
        }
        
        setSelectedRowKeys([]);
        fetchInfo();
      }
    });
  };

  const handleBatchDownload = () => {
    const files = fileInfo?.files || [];
    const filesToDownload = files.filter(
      (f) => selectedRowKeys.includes(f.path) && !f.is_dir
    );

    if (filesToDownload.length === 0) {
      andMessage.warning("Tidak ada berkas yang dapat diunduh (folder tidak didukung untuk unduhan massal langsung).");
      return;
    }

    andMessage.success(`Memulai unduhan untuk ${filesToDownload.length} berkas.`);
    
    filesToDownload.forEach((file, index) => {
      setTimeout(() => {
        handleDownload(file);
      }, index * 150);
    });

    setSelectedRowKeys([]);
  };

  // Selector modal triggers (Move/Copy)
  const openSelectorModal = (file, action) => {
    setSelectorSourceFile(file);
    setSelectorAction(action);
    setSelectorPath("");
    setIsSelectorModalOpen(true);
  };

  const fetchSelectorFolders = useCallback(async () => {
    try {
      setLoadingSelectorFolders(true);
      const url = `${baseUrl}/share/info/${token}?path=${encodeURIComponent(selectorPath)}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        // Skip source folder itself
        const filtered = (data.files || []).filter(
          (f) => f.is_dir && f.path !== selectorSourceFile?.path
        );
        setSelectorFolders(filtered);
      }
    } catch (err) {
      andMessage.error("Gagal memuat daftar folder.");
    } finally {
      setLoadingSelectorFolders(false);
    }
  }, [baseUrl, token, selectorPath, selectorSourceFile]);

  useEffect(() => {
    if (isSelectorModalOpen) {
      fetchSelectorFolders();
    }
  }, [isSelectorModalOpen, fetchSelectorFolders]);

  useEffect(() => {
    const preventDefault = (e) => {
      e.preventDefault();
    };
    
    const handleWindowDragEnter = (e) => {
      if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes("Files")) {
        setIsDraggingOverPage(true);
      }
    };

    window.addEventListener("dragenter", handleWindowDragEnter, false);
    window.addEventListener("dragover", preventDefault, false);
    window.addEventListener("drop", preventDefault, false);

    return () => {
      window.removeEventListener("dragenter", handleWindowDragEnter, false);
      window.removeEventListener("dragover", preventDefault, false);
      window.removeEventListener("drop", preventDefault, false);
    };
  }, []);

  const selectorPathSegments = useMemo(() => {
    return selectorPath.split("/").filter(Boolean);
  }, [selectorPath]);

  const navigateSelectorToSegment = (idx) => {
    if (idx === -1) {
      setSelectorPath("");
    } else {
      const targetSegments = selectorPathSegments.slice(0, idx + 1);
      setSelectorPath("/" + targetSegments.join("/"));
    }
  };

  const handleExecuteSelectorAction = async () => {
    if (!selectorSourceFile) return;
    const sourceRelative = getRelativePath(selectorSourceFile.path);
    const destFolder = selectorPath ? selectorPath.replace(/^\/+/, "") : "";
    const destRelative = destFolder ? `${destFolder}/${selectorSourceFile.name}` : selectorSourceFile.name;

    try {
      setExecutingSelector(true);
      const url = selectorAction === "move" ? `${baseUrl}/share/move/${token}` : `${baseUrl}/share/copy/${token}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_path: sourceRelative,
          dest_path: destRelative,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal melakukan aksi.");
      }

      andMessage.success(`Berhasil ${selectorAction === "move" ? "memindahkan" : "menyalin"} item.`);
      setIsSelectorModalOpen(false);
      fetchInfo();
    } catch (err) {
      andMessage.error(err.message);
    } finally {
      setExecutingSelector(false);
    }
  };

  // Helper copy link to sub-item
  const handleCopySubLink = async (file) => {
    try {
      const relative = getRelativePath(file.path);
      // Wait, in order to share a sub-item, we can generate a share link specifically for it!
      // But since we are guests inside a shared folder, we can generate a URL pointing to the guest folder explorer with path query!
      const subShareUrl = `${window.location.origin}/share/${encodeURIComponent(token)}?path=${encodeURIComponent(relative)}`;
      await navigator.clipboard.writeText(subShareUrl);
      andMessage.success("Link berhasil disalin ke clipboard!");
    } catch (err) {
      andMessage.error("Gagal menyalin link.");
    }
  };

  // Antd table columns definition
  const columns = [
    {
      title: "Nama",
      dataIndex: "name",
      key: "name",
      render: (text, record) => (
        <Space size="middle">
          {getListFileIcon(record.name, record.is_dir)}
          {record.is_dir ? (
            <Button
              type="link"
              onClick={() => handleFolderOpen(record)}
              className="share-list-folder-link"
              style={{ padding: 0, height: "auto", fontWeight: 500 }}
            >
              {text}
            </Button>
          ) : (
            <Text 
              strong 
              style={{ color: "#202124", cursor: record.name.toLowerCase().endsWith(".pdf") ? "pointer" : "default" }}
              onClick={() => record.name.toLowerCase().endsWith(".pdf") && window.open(getDownloadUrl(record, true), "_blank")}
            >
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
      width: 160,
      align: "center",
      render: (_, file) => (
        <Space>
          {file.name.toLowerCase().endsWith(".pdf") && (
            <Tooltip title="Pratinjau PDF">
              <Button
                type="text"
                shape="circle"
                icon={<SearchOutlined style={{ color: "#fa8c16", fontSize: "16px" }} />}
                onClick={() => window.open(getDownloadUrl(file, true), "_blank")}
              />
            </Tooltip>
          )}
          {!file.is_dir && (
            <Tooltip title="Unduh Berkas">
              <Button
                type="text"
                shape="circle"
                icon={<DownloadOutlined style={{ color: "#1a73e8", fontSize: "16px" }} />}
                onClick={() => handleDownload(file)}
              />
            </Tooltip>
          )}
          {fileInfo?.can_edit && (
            <Dropdown
              menu={{
                items: [
                  {
                    key: "copy_link",
                    label: "Salin Link",
                    icon: <LinkOutlined />,
                    onClick: () => handleCopySubLink(file),
                  },
                  {
                    key: "move",
                    label: "Pindahkan",
                    icon: <FolderOpenOutlined />,
                    onClick: () => openSelectorModal(file, "move"),
                  },
                  {
                    key: "copy",
                    label: "Salin",
                    icon: <PlusOutlined />,
                    onClick: () => openSelectorModal(file, "copy"),
                  },
                  { type: "divider" },
                  {
                    key: "delete",
                    label: "Hapus",
                    danger: true,
                    icon: <DeleteOutlined />,
                    onClick: () => handleDelete(file),
                  }
                ]
              }}
              trigger={["click"]}
              placement="bottomRight"
            >
              <Button type="text" shape="circle" icon={<EllipsisOutlined />} />
            </Dropdown>
          )}
        </Space>
      ),
    },
  ];

  const newButtonItems = useMemo(() => {
    return [
      {
        key: "new-folder",
        label: "Folder Baru",
        icon: <PlusOutlined />,
        onClick: () => setIsFolderModalOpen(true),
      },
      {
        key: "upload-file",
        label: "Upload Berkas",
        icon: <InboxOutlined />,
        onClick: () => setIsUploadModalOpen(true),
      },
    ];
  }, []);

  if (loading) {
    return (
      <div className="share-landing-loader">
        <Space direction="vertical" size="middle" align="center">
          <Spin size="large" />
          <Text type="secondary" style={{ fontSize: "16px" }}>Membaca informasi berkas...</Text>
        </Space>
      </div>
    );
  }

  if (error) {
    return (
      <div className="share-landing-error">
        <Card className="share-error-card" variant="borderless">
          <Empty description={error} />
        </Card>
      </div>
    );
  }

  // RENDER CASE 1: Single File Share
  if (!fileInfo?.is_dir) {
    const isPdf = fileInfo?.name?.toLowerCase().endsWith(".pdf");
    return (
      <div className="share-landing-layout">
        {/* Brand Header */}
        <div className="share-brand-header">
          <CloudServerOutlined className="share-logo-icon" />
          <span className="share-logo-title">SIPTU Drive</span>
        </div>

        {/* Share Container Card */}
        <Card className="share-landing-card" hoverable>
          <div className="share-file-visual">
            {getFileIcon(fileInfo?.name, false)}
          </div>
          <div className="share-file-details">
            <Title level={4} className="share-file-name" title={fileInfo?.name}>
              {fileInfo?.name}
            </Title>
            <Text type="secondary" className="share-file-size">
              Ukuran Berkas: {formatBytes(fileInfo?.size)}
            </Text>
          </div>

          <Space direction="vertical" style={{ width: "100%" }} size="middle">
             <Button
              type="primary"
              size="large"
              icon={<DownloadOutlined />}
              onClick={() => handleDownload({ name: fileInfo.name, path: fileInfo.path, size: fileInfo.size })}
              className="share-download-btn"
              block
            >
              Unduh Berkas
            </Button>
            {isPdf && (
              <Button
                size="large"
                icon={<SearchOutlined />}
                onClick={() => window.open(getDownloadUrl({ name: fileInfo.name, path: fileInfo.path }, true), "_blank")}
                block
              >
                Pratinjau PDF
              </Button>
            )}
          </Space>
        </Card>

        {/* Full-screen PDF preview overlay */}
        {previewPdfFile && (
          <div className="share-pdf-preview-overlay">
            <div className="share-pdf-preview-header">
              <span className="share-pdf-title">{previewPdfFile.name}</span>
              <div className="share-pdf-actions">
                <Button 
                  type="primary" 
                  ghost 
                  style={{ color: "#ffffff", borderColor: "#ffffff" }}
                  href={getDownloadUrl(previewPdfFile, true)} 
                  target="_blank"
                >
                  Buka Penuh (1 Tab Baru)
                </Button>
                <Button 
                  icon={<DownloadOutlined />} 
                  href={getDownloadUrl(previewPdfFile)}
                >
                  Unduh
                </Button>
                <Button 
                  type="text" 
                  style={{ color: "#ffffff", fontSize: "20px" }}
                  onClick={() => setPreviewPdfFile(null)}
                >
                  ✕
                </Button>
              </div>
            </div>
            <div className="share-pdf-preview-body">
              <iframe
                src={getDownloadUrl(previewPdfFile, true)}
                title="PDF Preview"
                className="share-pdf-iframe"
              />
            </div>
          </div>
        )}

        <div className="share-landing-footer">
          <Text type="secondary" style={{ fontSize: "12px" }}>
            Di-host dengan aman melalui SIPTU Drive terintegrasi Nextcloud Loka POM di Kota Palopo.
          </Text>
        </div>

        {/* Google Drive-like Download Status Widget */}
        {isDownloadWidgetVisible && (
          <div className={`drive-download-widget ${isDownloadWidgetMinimized ? "minimized" : ""}`} style={{ position: "fixed", bottom: "24px", right: "24px", width: "360px", background: "#ffffff", borderRadius: "8px", boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)", zIndex: 1000, display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid #dadce0" }}>
            <div className="download-widget-header" style={{ height: "48px", background: "#323232", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px" }}>
              <span className="download-widget-title" style={{ fontSize: "14px", fontWeight: 500 }}>
                {Object.values(downloads).some((d) => d.status === "downloading")
                  ? `Mengunduh ${Object.values(downloads).filter((d) => d.status === "downloading").length} item`
                  : `${Object.values(downloads).filter((d) => d.status === "success").length} download selesai`}
              </span>
              <div className="download-widget-controls">
                <Button
                  type="text"
                  size="small"
                  icon={isDownloadWidgetMinimized ? <PlusOutlined /> : <MinusOutlined />}
                  onClick={() => setIsDownloadWidgetMinimized(!isDownloadWidgetMinimized)}
                  style={{ color: "#ffffff" }}
                />
                <Button
                  type="text"
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={() => {
                    setIsDownloadWidgetVisible(false);
                    setDownloads({});
                  }}
                  style={{ color: "#ffffff", marginLeft: "4px" }}
                />
              </div>
            </div>
            
            {!isDownloadWidgetMinimized && (
              <div className="download-widget-body" style={{ maxHeight: "250px", overflowY: "auto", padding: "8px 0" }}>
                {Object.values(downloads).map((item) => {
                  const isDownloading = item.status === "downloading";
                  const isSuccess = item.status === "success";
                  const isError = item.status === "error";
                  
                  return (
                    <div key={item.id} className="download-item-row" style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #f1f3f4" }}>
                      <div className="download-item-icon" style={{ marginRight: "12px", display: "flex", alignItems: "center" }}>
                        {getFileIcon(item.name, false)}
                      </div>
                      <div className="download-item-details" style={{ flexGrow: 1, display: "flex", flexDirection: "column", overflow: "hidden", marginRight: "8px" }}>
                        <span className="download-item-name" style={{ fontSize: "13px", color: "#202124", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {item.name}
                        </span>
                        <span className="download-item-meta" style={{ fontSize: "11px", color: "#5f6368", marginTop: "2px" }}>
                          {isDownloading && `${item.progress}% dari ${formatBytes(item.size)}`}
                          {isSuccess && `Selesai • ${formatBytes(item.size)}`}
                          {isError && `Gagal • ${item.errorMessage}`}
                        </span>
                      </div>
                      <div className="download-item-status" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px" }}>
                        {isDownloading && (
                          <Progress
                            type="circle"
                            percent={item.progress}
                            width={22}
                            strokeWidth={12}
                            showInfo={false}
                            strokeColor="#1a73e8"
                          />
                        )}
                        {isSuccess && <CheckCircleFilled style={{ color: "#52c41a", fontSize: "18px" }} />}
                        {isError && (
                          <Tooltip title={item.errorMessage}>
                            <CloseCircleFilled style={{ color: "#ff4d4f", fontSize: "18px" }} />
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // RENDER CASE 2: Folder Share Explorer
  return (
    <div 
      className="share-explorer-layout"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Top Navigation Brand Header */}
      <header className="share-explorer-header">
        <div className="share-explorer-brand">
          <CloudServerOutlined className="share-explorer-logo-icon" />
          <span className="share-explorer-logo-title">SIPTU Drive</span>
          <span className="share-explorer-badge">Shared Folder</span>
        </div>
        <div className="share-explorer-search">
          <Input
            placeholder="Cari berkas di folder ini..."
            prefix={<SearchOutlined style={{ color: "#5f6368" }} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="share-search-input"
            allowClear
          />
        </div>
        <div className="share-explorer-actions">
          {fileInfo.can_edit && (
            <Dropdown menu={{ items: newButtonItems }} trigger={["click"]} style={{ marginRight: "12px" }}>
              <Button type="primary" icon={<PlusOutlined />} className="share-new-btn">
                Baru
              </Button>
            </Dropdown>
          )}
          <Button
            type="text"
            shape="circle"
            icon={<ReloadOutlined />}
            onClick={fetchInfo}
            title="Muat Ulang"
          />
        </div>
      </header>

      {/* Main Folder Explorer Workspace */}
      <main className="share-explorer-workspace">
        {/* Navigation Toolbar */}
        <div className="share-explorer-toolbar">
          <div className="share-explorer-navigation">
            <Breadcrumb separator=">">
              {breadcrumbs.map((item, idx) => (
                <Breadcrumb.Item
                  key={idx}
                  onClick={() => handleBreadcrumbClick(item.path)}
                  className="share-breadcrumb-item"
                >
                  {idx === 0 ? <HomeOutlined style={{ marginRight: "4px" }} /> : null}
                  {item.name}
                </Breadcrumb.Item>
              ))}
            </Breadcrumb>
          </div>

          <div className="share-explorer-view-toggle">
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
          </div>
        </div>

        {/* Content Explorer Area */}
        <div className="share-explorer-content">
          
          {/* Floating Bulk Action Bar */}
          {selectedRowKeys.length > 0 && (
            <div className="drive-batch-bar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", background: "#e8f0fe", border: "1px solid #1a73e8", borderRadius: "8px", marginBottom: "16px", animation: "slideDown 0.2s ease-out" }}>
              <Space>
                <Checkbox 
                  checked={selectedRowKeys.length === filteredFiles.length}
                  indeterminate={selectedRowKeys.length > 0 && selectedRowKeys.length < filteredFiles.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRowKeys(filteredFiles.map(f => f.path));
                    } else {
                      setSelectedRowKeys([]);
                    }
                  }}
                />
                <Text strong style={{ color: "#1a73e8" }}>{selectedRowKeys.length} terpilih</Text>
              </Space>
              <Space>
                <Button 
                  type="primary" 
                  icon={<DownloadOutlined />} 
                  onClick={handleBatchDownload}
                  disabled={!filteredFiles.some(f => selectedRowKeys.includes(f.path) && !f.is_dir)}
                >
                  Unduh Terpilih
                </Button>
                {fileInfo.can_edit && (
                  <Button 
                    type="primary" 
                    danger 
                    icon={<DeleteOutlined />} 
                    onClick={handleBatchDelete}
                  >
                    Hapus Terpilih
                  </Button>
                )}
                <Button 
                  type="text" 
                  onClick={() => setSelectedRowKeys([])}
                >
                  Batal
                </Button>
              </Space>
            </div>
          )}
          {filteredFiles.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={searchQuery ? "Berkas tidak ditemukan." : "Folder ini kosong."}
              className="share-empty-view"
            />
          ) : viewMode === "list" ? (
            <div className="share-table-container">
              <Table
                dataSource={filteredFiles.map((f) => ({ ...f, key: f.path }))}
                rowSelection={{
                  selectedRowKeys,
                  onChange: setSelectedRowKeys,
                }}
                columns={columns}
                pagination={{ pageSize: 15, showSizeChanger: false }}
                size="middle"
                className="share-antd-table"
                onRow={(record) => ({
                  onDoubleClick: () => {
                    if (record.is_dir) {
                      handleFolderOpen(record);
                    } else {
                      const isPdf = record.name.toLowerCase().endsWith(".pdf");
                      if (isPdf) {
                        window.open(getDownloadUrl(record, true), "_blank");
                      } else {
                        handleDownload(record);
                      }
                    }
                  },
                })}
              />
            </div>
          ) : (
            <div className="share-grid-workspace">
              {/* Folders Grid */}
              {folderItems.length > 0 && (
                <div className="share-section-wrap">
                  <div className="share-section-title">Folder</div>
                  <div className={`share-folders-grid ${selectedRowKeys.length > 0 ? "has-selection" : ""}`}>
                    {folderItems.map((folder, idx) => {
                      const isFolderSelected = selectedRowKeys.includes(folder.path);
                      const handleToggleSelect = (e) => {
                        e.stopPropagation();
                        if (isFolderSelected) {
                          setSelectedRowKeys(prev => prev.filter(k => k !== folder.path));
                        } else {
                          setSelectedRowKeys(prev => [...prev, folder.path]);
                        }
                      };

                      return (
                        <div
                          key={idx}
                          className={`share-folder-chip ${isFolderSelected ? "selected" : ""}`}
                          onDoubleClick={() => handleFolderOpen(folder)}
                          onClick={handleToggleSelect}
                        >
                          <div className="grid-item-checkbox" onClick={(e) => e.stopPropagation()}>
                            <Checkbox 
                              checked={isFolderSelected} 
                              onChange={handleToggleSelect}
                            />
                          </div>
                          <FolderFilled className="share-folder-chip-icon" />
                        <span className="share-folder-chip-name" title={folder.name}>
                          {folder.name}
                        </span>
                        {fileInfo.can_edit && (
                          <div className="share-folder-chip-actions" onClick={(e) => e.stopPropagation()}>
                            <Dropdown
                              menu={{
                                items: [
                                  {
                                    key: "copy_link",
                                    label: "Salin Link",
                                    icon: <LinkOutlined />,
                                    onClick: () => handleCopySubLink(folder),
                                  },
                                  {
                                    key: "move",
                                    label: "Pindahkan",
                                    icon: <FolderOpenOutlined />,
                                    onClick: () => openSelectorModal(folder, "move"),
                                  },
                                  {
                                    key: "copy",
                                    label: "Salin Folder",
                                    icon: <PlusOutlined />,
                                    onClick: () => openSelectorModal(folder, "copy"),
                                  },
                                  { type: "divider" },
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
                        )}
                      </div>
                    );
                  })}
                  </div>
                </div>
              )}

              {/* Files Grid */}
              {fileItems.length > 0 && (
                <div className="share-section-wrap">
                  <div className="share-section-title">File</div>
                  <div className={`share-files-grid ${selectedRowKeys.length > 0 ? "has-selection" : ""}`}>
                    {fileItems.map((file, idx) => {
                      const isFileSelected = selectedRowKeys.includes(file.path);
                      const handleToggleSelect = (e) => {
                        e.stopPropagation();
                        if (isFileSelected) {
                          setSelectedRowKeys(prev => prev.filter(k => k !== file.path));
                        } else {
                          setSelectedRowKeys(prev => [...prev, file.path]);
                        }
                      };
                      const isPdf = file.name.toLowerCase().endsWith(".pdf");
                      
                      return (
                        <div 
                          key={idx} 
                          className={`share-file-card ${isFileSelected ? "selected" : ""}`}
                          onClick={handleToggleSelect}
                        >
                          <div className="grid-item-checkbox" onClick={(e) => e.stopPropagation()}>
                            <Checkbox 
                              checked={isFileSelected} 
                              onChange={handleToggleSelect}
                            />
                          </div>
                          <div 
                            className="share-file-card-preview" 
                            onDoubleClick={() => isPdf ? window.open(getDownloadUrl(file, true), "_blank") : handleDownload(file)}
                            style={{ cursor: "pointer" }}
                          >
                            <div className="share-preview-icon-wrapper">
                              {getFileIcon(file.name, false)}
                            </div>
                            <div className="share-preview-extension-tag">
                              {file.name.split(".").pop().toUpperCase()}
                            </div>
                          </div>
                          <div className="share-file-card-info">
                            <div className="share-file-card-meta">
                              <span 
                                className="share-file-title" 
                                title={file.name}
                                onClick={() => isPdf && window.open(getDownloadUrl(file, true), "_blank")}
                                style={{ cursor: isPdf ? "pointer" : "default" }}
                              >
                                {file.name}
                              </span>
                              <span className="share-file-size">
                                {formatBytes(file.size)}
                              </span>
                            </div>
                            <div className="share-file-card-actions" onClick={(e) => e.stopPropagation()}>
                              {isPdf && (
                                <Tooltip title="Pratinjau PDF">
                                  <Button
                                    type="text"
                                    size="small"
                                    shape="circle"
                                    icon={<SearchOutlined style={{ color: "#fa8c16" }} />}
                                    onClick={() => window.open(getDownloadUrl(file, true), "_blank")}
                                  />
                                </Tooltip>
                              )}
                              <Tooltip title="Unduh Berkas">
                                <Button
                                  type="text"
                                  size="small"
                                  shape="circle"
                                  icon={<DownloadOutlined style={{ color: "#1a73e8" }} />}
                                  onClick={() => handleDownload(file)}
                                />
                              </Tooltip>
                              {fileInfo.can_edit && (
                                <Dropdown
                                  menu={{
                                    items: [
                                      {
                                        key: "copy_link",
                                        label: "Salin Link",
                                        icon: <LinkOutlined />,
                                        onClick: () => handleCopySubLink(file),
                                      },
                                      {
                                        key: "move",
                                        label: "Pindahkan",
                                        icon: <FolderOpenOutlined />,
                                        onClick: () => openSelectorModal(file, "move"),
                                      },
                                      {
                                        key: "copy",
                                        label: "Salin Berkas",
                                        icon: <PlusOutlined />,
                                        onClick: () => openSelectorModal(file, "copy"),
                                      },
                                      { type: "divider" },
                                      {
                                        key: "delete",
                                        label: "Hapus",
                                        danger: true,
                                        icon: <DeleteOutlined />,
                                        onClick: () => handleDelete(file),
                                      }
                                    ]
                                  }}
                                  trigger={["click"]}
                                  placement="bottomRight"
                                >
                                  <Button type="text" size="small" shape="circle" icon={<EllipsisOutlined />} />
                                </Dropdown>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* PDF Preview Overlay inside Explorer */}
      {previewPdfFile && (
        <div className="share-pdf-preview-overlay">
          <div className="share-pdf-preview-header">
            <span className="share-pdf-title">{previewPdfFile.name}</span>
            <div className="share-pdf-actions">
              <Button 
                type="primary" 
                ghost 
                style={{ color: "#ffffff", borderColor: "#ffffff", marginRight: "8px" }}
                href={getDownloadUrl(previewPdfFile, true)} 
                target="_blank"
              >
                Buka Penuh (1 Tab Baru)
              </Button>
              <Button 
                icon={<DownloadOutlined />} 
                href={getDownloadUrl(previewPdfFile)}
                style={{ marginRight: "8px" }}
              >
                Unduh
              </Button>
              <Button 
                type="text" 
                style={{ color: "#ffffff", fontSize: "20px" }}
                onClick={() => setPreviewPdfFile(null)}
              >
                ✕
              </Button>
            </div>
          </div>
          <div className="share-pdf-preview-body">
            <iframe
              src={getDownloadUrl(previewPdfFile, true)}
              title="PDF Preview"
              className="share-pdf-iframe"
            />
          </div>
        </div>
      )}

      {/* Modal: Folder Baru Publik */}
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
          <Text type="secondary" style={{ display: "block", marginBottom: "8px" }}>Nama Folder Baru:</Text>
          <Input
            placeholder="Folder tanpa nama"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onPressEnter={handleCreateFolder}
            autoFocus
          />
        </div>
      </Modal>

      {/* Modal: Upload Berkas Publik */}
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
          <Dragger customRequest={handleCustomUpload} showUploadList={false} multiple={true}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ color: "#1a73e8", fontSize: "48px" }} />
            </p>
            <p className="ant-upload-text">Klik atau seret satu atau beberapa berkas ke area ini</p>
            <p className="ant-upload-hint">Maksimal 250 MB per berkas.</p>
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
                          {getListFileIcon(item.name, false)}
                        </div>
                        <div className="upload-item-info">
                          <Text ellipsis className="upload-item-name" style={{ maxWidth: "230px" }}>
                            {item.name}
                          </Text>
                          <Text type="secondary" className="upload-item-size">
                            {formatBytes(item.size)}
                          </Text>
                        </div>
                        <div className="upload-item-status">
                          {isUploading && <LoadingOutlined style={{ color: "#1a73e8" }} />}
                          {isSuccess && <span style={{ color: "#52c41a", fontWeight: "600" }}>✓ Berhasil</span>}
                          {isError && <span style={{ color: "#ff4d4f", fontWeight: "600" }}>⚠ Gagal</span>}
                        </div>
                      </div>
                      {isUploading && (
                        <div className="upload-item-progress">
                          <Progress percent={item.progress} size="small" status="active" strokeColor="#1a73e8" />
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

      {/* Modal: Folder Selector Publik (Move/Copy) */}
      <Modal
        title={`${selectorAction === "move" ? "Pindahkan" : "Salin"} "${selectorSourceFile?.name}"`}
        open={isSelectorModalOpen}
        onOk={handleExecuteSelectorAction}
        onCancel={() => setIsSelectorModalOpen(false)}
        confirmLoading={executingSelector}
        okText={selectorAction === "move" ? "Pindahkan ke Sini" : "Salin ke Sini"}
        cancelText="Batal"
        centered
        width={500}
      >
        <div style={{ padding: "8px 0" }}>
          {/* Breadcrumbs for Selector */}
          <div style={{ marginBottom: "12px", padding: "8px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
            <Breadcrumb separator=">">
              <Breadcrumb.Item onClick={() => navigateSelectorToSegment(-1)} style={{ cursor: "pointer" }}>
                <HomeOutlined /> <span>Shared Root</span>
              </Breadcrumb.Item>
              {selectorPathSegments.map((segment, idx) => (
                <Breadcrumb.Item key={idx} onClick={() => navigateSelectorToSegment(idx)} style={{ cursor: "pointer" }}>
                  {segment}
                </Breadcrumb.Item>
              ))}
            </Breadcrumb>
          </div>

          <Text strong>Pilih Folder Tujuan:</Text>
          <div className="selector-folder-list">
            <Spin spinning={loadingSelectorFolders}>
              {selectorFolders.length === 0 ? (
                <div style={{ padding: "30px", textAlign: "center" }}>
                  <Text type="secondary">Tidak ada subfolder di folder ini.</Text>
                </div>
              ) : (
                selectorFolders.map((folder, idx) => (
                  <div
                    key={idx}
                    className="selector-folder-item"
                    onDoubleClick={() => {
                      const basePath = selectorPath ? `${selectorPath}/${folder.name}` : folder.name;
                      setSelectorPath(basePath);
                    }}
                  >
                    <FolderFilled className="selector-folder-icon" />
                    <span className="selector-folder-name">{folder.name}</span>
                  </div>
                ))
              )}
            </Spin>
          </div>
          <Text type="secondary" style={{ fontSize: "12px", display: "block", marginTop: "8px" }}>
            *Double-click folder untuk masuk. Lokasi saat ini: <Text code>{selectorPath ? `/${selectorPath}` : "/"}</Text>
          </Text>
        </div>
      </Modal>

      {/* Footer copyright section */}
      <footer className="share-explorer-footer">
        <Text type="secondary" style={{ fontSize: "12px" }}>
          Di-host dengan aman melalui SIPTU Drive terintegrasi Nextcloud Loka POM di Kota Palopo.
        </Text>
      </footer>

      {/* Google Drive-like Download Status Widget */}
      {isDownloadWidgetVisible && (
        <div 
          className={`drive-download-widget ${isDownloadWidgetMinimized ? "minimized" : ""}`} 
          style={{ position: "fixed", bottom: "24px", right: isUploadWidgetVisible ? "400px" : "24px", width: "360px", background: "#ffffff", borderRadius: "8px", boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)", zIndex: 1000, display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid #dadce0" }}
        >
          <div className="download-widget-header" style={{ height: "48px", background: "#323232", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px" }}>
            <span className="download-widget-title" style={{ fontSize: "14px", fontWeight: 500 }}>
              {Object.values(downloads).some((d) => d.status === "downloading")
                ? `Mengunduh ${Object.values(downloads).filter((d) => d.status === "downloading").length} item`
                : `${Object.values(downloads).filter((d) => d.status === "success").length} download selesai`}
            </span>
            <div className="download-widget-controls">
              <Button
                type="text"
                size="small"
                icon={isDownloadWidgetMinimized ? <PlusOutlined /> : <MinusOutlined />}
                onClick={() => setIsDownloadWidgetMinimized(!isDownloadWidgetMinimized)}
                style={{ color: "#ffffff" }}
              />
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                onClick={() => {
                  setIsDownloadWidgetVisible(false);
                  setDownloads({});
                }}
                style={{ color: "#ffffff", marginLeft: "4px" }}
              />
            </div>
          </div>
          
          {!isDownloadWidgetMinimized && (
            <div className="download-widget-body" style={{ maxHeight: "250px", overflowY: "auto", padding: "8px 0" }}>
              {Object.values(downloads).map((item) => {
                const isDownloading = item.status === "downloading";
                const isSuccess = item.status === "success";
                const isError = item.status === "error";
                
                return (
                  <div key={item.id} className="download-item-row" style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #f1f3f4" }}>
                    <div className="download-item-icon" style={{ marginRight: "12px", display: "flex", alignItems: "center" }}>
                      {getFileIcon(item.name, false)}
                    </div>
                    <div className="download-item-details" style={{ flexGrow: 1, display: "flex", flexDirection: "column", overflow: "hidden", marginRight: "8px" }}>
                      <span className="download-item-name" style={{ fontSize: "13px", color: "#202124", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.name}
                      </span>
                      <span className="download-item-meta" style={{ fontSize: "11px", color: "#5f6368", marginTop: "2px" }}>
                        {isDownloading && `${item.progress}% dari ${formatBytes(item.size)}`}
                        {isSuccess && `Selesai • ${formatBytes(item.size)}`}
                        {isError && `Gagal • ${item.errorMessage}`}
                      </span>
                    </div>
                    <div className="download-item-status" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px" }}>
                      {isDownloading && (
                        <Progress
                          type="circle"
                          percent={item.progress}
                          width={22}
                          strokeWidth={12}
                          showInfo={false}
                          strokeColor="#1a73e8"
                        />
                      )}
                      {isSuccess && <CheckCircleFilled style={{ color: "#52c41a", fontSize: "18px" }} />}
                      {isError && (
                        <Tooltip title={item.errorMessage}>
                          <CloseCircleFilled style={{ color: "#ff4d4f", fontSize: "18px" }} />
                        </Tooltip>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Google Drive-like Upload Status Widget */}
      {isUploadWidgetVisible && (
        <div className={`drive-upload-widget ${isUploadWidgetMinimized ? "minimized" : ""}`} style={{ position: "fixed", bottom: "24px", right: "24px", width: "360px", background: "#ffffff", borderRadius: "8px", boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)", zIndex: 1000, display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid #dadce0" }}>
          <div className="upload-widget-header" style={{ height: "48px", background: "#323232", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px" }}>
            <span className="upload-widget-title" style={{ fontSize: "14px", fontWeight: 500 }}>
              {Object.values(uploadingFiles).some((f) => f.status === "uploading")
                ? `Mengunduh ${Object.values(uploadingFiles).filter((f) => f.status === "uploading").length} item`
                : `${Object.values(uploadingFiles).filter((f) => f.status === "success").length} upload selesai`}
            </span>
            <div className="upload-widget-controls">
              <Button
                type="text"
                size="small"
                icon={isUploadWidgetMinimized ? <PlusOutlined /> : <MinusOutlined />}
                onClick={() => setIsUploadWidgetMinimized(!isUploadWidgetMinimized)}
                style={{ color: "#ffffff" }}
              />
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                onClick={() => {
                  setIsUploadWidgetVisible(false);
                  setUploadingFiles({});
                }}
                style={{ color: "#ffffff", marginLeft: "4px" }}
              />
            </div>
          </div>
          
          {!isUploadWidgetMinimized && (
            <div className="upload-widget-body" style={{ maxHeight: "250px", overflowY: "auto", padding: "8px 0" }}>
              {Object.values(uploadingFiles).map((item) => {
                const isUploading = item.status === "uploading";
                const isSuccess = item.status === "success";
                const isError = item.status === "error";
                
                return (
                  <div key={item.uid} className="upload-item-row" style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #f1f3f4" }}>
                    <div className="upload-item-icon" style={{ marginRight: "12px", display: "flex", alignItems: "center" }}>
                      {getFileIcon(item.name, false)}
                    </div>
                    <div className="upload-item-details" style={{ flexGrow: 1, display: "flex", flexDirection: "column", overflow: "hidden", marginRight: "8px" }}>
                      <span className="upload-item-name" style={{ fontSize: "13px", color: "#202124", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.name}
                      </span>
                      <span className="upload-item-meta" style={{ fontSize: "11px", color: "#5f6368", marginTop: "2px" }}>
                        {isUploading && `${item.progress}% dari ${formatBytes(item.size)}`}
                        {isSuccess && `Selesai • ${formatBytes(item.size)}`}
                        {isError && `Gagal • ${item.errorMessage}`}
                      </span>
                    </div>
                    <div className="upload-item-status" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px" }}>
                      {isUploading && (
                        <Progress
                          type="circle"
                          percent={item.progress}
                          width={22}
                          strokeWidth={12}
                          showInfo={false}
                          strokeColor="#1a73e8"
                        />
                      )}
                      {isSuccess && <CheckCircleFilled style={{ color: "#52c41a", fontSize: "18px" }} />}
                      {isError && (
                        <Tooltip title={item.errorMessage}>
                          <CloseCircleFilled style={{ color: "#ff4d4f", fontSize: "18px" }} />
                        </Tooltip>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Full screen Drag & Drop Overlay */}
      <div 
        className={`drive-drag-overlay ${isDraggingOverPage && fileInfo?.can_edit ? "active" : ""}`}
        onDragLeave={() => setIsDraggingOverPage(false)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <div className="drive-drag-overlay-content" style={{ pointerEvents: "none" }}>
          <CloudUploadOutlined className="drive-drag-overlay-icon" style={{ pointerEvents: "none" }} />
          <h3 style={{ pointerEvents: "none" }}>Lepaskan berkas untuk mengunggah ke folder ini</h3>
          <p style={{ pointerEvents: "none" }}>SIPTU Drive terintegrasi Nextcloud</p>
        </div>
      </div>
    </div>
  );
}
