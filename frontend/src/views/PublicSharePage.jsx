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
  Image,
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
  EyeOutlined,
  PictureOutlined,
  EditOutlined,
} from "@ant-design/icons";
import JSZip from "jszip";
import DocViewerModal from "../components/DocViewerModal.jsx";
import dayjs from "dayjs";
import "./PublicSharePage.css";

const { Title, Text } = Typography;
const { Dragger } = Upload;

const isDocViewable = (fileName) => {
  if (!fileName) return false;
  const ext = fileName.split(".").pop().toLowerCase();
  return ["xlsx", "xls", "docx", "doc", "pptx", "ppt"].includes(ext);
};

const isImageFile = (fileName) => {
  if (!fileName) return false;
  const ext = fileName.split(".").pop().toLowerCase();
  return ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"].includes(ext);
};

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
    case "pptx":
    case "ppt":
      return <FilePptFilled className="share-large-icon drive-icon-ppt" />;
    case "zip":
    case "rar":
    case "7z":
    case "tar":
    case "gz":
      return <FileZipFilled className="share-large-icon drive-icon-zip" />;
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "webp":
    case "svg":
    case "bmp":
      return <FileImageFilled className="share-large-icon drive-icon-image" />;
    case "mp4":
    case "mkv":
    case "avi":
    case "mov":
      return <PlayCircleFilled className="share-large-icon drive-icon-video" />;
    case "mp3":
    case "wav":
    case "ogg":
    case "flac":
      return <CustomerServiceFilled className="share-large-icon drive-icon-audio" />;
    default:
      return <FileFilled className="share-large-icon drive-icon-default" />;
  }
};

const getListFileIcon = (fileName, isDir) => {
  if (isDir) {
    return <FolderFilled style={{ color: "#ffb703", fontSize: "20px" }} />;
  }
  if (!fileName) return <FileFilled style={{ color: "#94a3b8", fontSize: "20px" }} />;
  const ext = fileName.split(".").pop().toLowerCase();
  switch (ext) {
    case "pdf":
      return <FilePdfFilled style={{ color: "#ea4335", fontSize: "20px" }} />;
    case "xlsx":
    case "xls":
    case "csv":
      return <FileExcelFilled style={{ color: "#34a853", fontSize: "20px" }} />;
    case "docx":
    case "doc":
      return <FileWordFilled style={{ color: "#4285f4", fontSize: "20px" }} />;
    case "pptx":
    case "ppt":
      return <FilePptFilled style={{ color: "#ff6d01", fontSize: "20px" }} />;
    case "zip":
    case "rar":
    case "7z":
      return <FileZipFilled style={{ color: "#ab47bc", fontSize: "20px" }} />;
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "webp":
      return <FileImageFilled style={{ color: "#ea4335", fontSize: "20px" }} />;
    default:
      return <FileFilled style={{ color: "#94a3b8", fontSize: "20px" }} />;
  }
};

export default function PublicSharePage() {
  const { token } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentSubPath = searchParams.get("path") || "";

  const [fileInfo, setFileInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
  const [searchQuery, setSearchQuery] = useState("");

  // Checkbox Selection State
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  // Modals & Drawers State
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState({});
  const [isDraggingOverPage, setIsDraggingOverPage] = useState(false);

  // Rename Modal State
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameTargetFile, setRenameTargetFile] = useState(null);
  const [newFileName, setNewFileName] = useState("");
  const [renaming, setRenaming] = useState(false);

  // File & Folder Selector Modal (Move/Copy)
  const [isSelectorModalOpen, setIsSelectorModalOpen] = useState(false);
  const [selectorAction, setSelectorAction] = useState("move"); // "move" | "copy"
  const [selectorSourceFile, setSelectorSourceFile] = useState(null);
  const [selectorPath, setSelectorPath] = useState("");
  const [selectorFolders, setSelectorFolders] = useState([]);
  const [loadingSelectorFolders, setLoadingSelectorFolders] = useState(false);
  const [executingSelector, setExecutingSelector] = useState(false);

  // Online Doc / PDF Viewer State
  const [docViewFile, setDocViewFile] = useState(null);
  const [previewPdfFile, setPreviewPdfFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // Download Progress Widget State
  const [downloads, setDownloads] = useState({});
  const [isDownloadWidgetVisible, setIsDownloadWidgetVisible] = useState(false);
  const [isDownloadWidgetMinimized, setIsDownloadWidgetMinimized] = useState(false);
  const [isUploadWidgetVisible, setIsUploadWidgetVisible] = useState(false);
  const [isUploadWidgetMinimized, setIsUploadWidgetMinimized] = useState(false);

  const dragCounter = useRef(0);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes("Files")) {
      setIsDraggingOverPage(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDraggingOverPage(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
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

  // Recursive public folder zipping helper
  const addFolderToZipPublic = useCallback(
    async (zip, relativeFolderPath, currentZipFolder) => {
      try {
        const url = `${baseUrl}/share/info/${token}?path=${encodeURIComponent(relativeFolderPath)}`;
        const response = await fetch(url);
        if (!response.ok) return;
        const data = await response.json();
        const items = data.files || [];

        for (const item of items) {
          const itemRelative = getRelativePath(item.path);
          if (item.is_dir) {
            const subFolderZip = currentZipFolder.folder(item.name);
            await addFolderToZipPublic(zip, itemRelative, subFolderZip);
          } else {
            const fileDownloadUrl = getDownloadUrl(item);
            const fileRes = await fetch(fileDownloadUrl);
            if (fileRes.ok) {
              const blob = await fileRes.blob();
              currentZipFolder.file(item.name, blob);
            }
          }
        }
      } catch (err) {
        console.error("Error adding public folder to ZIP:", err);
      }
    },
    [baseUrl, token, getRelativePath, getDownloadUrl]
  );

  // JSZip Download Handler for multiple selected items or recursive folders
  const handleDownloadZip = useCallback(
    async (itemsToZip, zipFilename = `SIPTU_Drive_${Date.now()}.zip`) => {
      const downloadId = `download-zip-${Date.now()}`;

      setDownloads((prev) => ({
        ...prev,
        [downloadId]: {
          id: downloadId,
          name: zipFilename,
          size: 0,
          progress: 10,
          status: "downloading",
        },
      }));
      setIsDownloadWidgetVisible(true);
      setIsDownloadWidgetMinimized(false);

      try {
        const zip = new JSZip();
        let processedCount = 0;
        const totalItems = itemsToZip.length;

        andMessage.loading({ content: `Menyiapkan berkas ZIP (${zipFilename})...`, key: downloadId });

        for (const item of itemsToZip) {
          const relative = getRelativePath(item.path);
          if (item.is_dir) {
            const folderZip = zip.folder(item.name);
            await addFolderToZipPublic(zip, relative, folderZip);
          } else {
            const fileDownloadUrl = getDownloadUrl(item);
            const fileRes = await fetch(fileDownloadUrl);
            if (fileRes.ok) {
              const blob = await fileRes.blob();
              zip.file(item.name, blob);
            }
          }

          processedCount++;
          const percent = Math.round(10 + (processedCount / totalItems) * 70);
          setDownloads((prev) => ({
            ...prev,
            [downloadId]: {
              ...prev[downloadId],
              progress: percent,
            },
          }));
        }

        setDownloads((prev) => ({
          ...prev,
          [downloadId]: {
            ...prev[downloadId],
            progress: 85,
          },
        }));

        const zipContent = await zip.generateAsync({ type: "blob" }, (metadata) => {
          const p = Math.round(85 + metadata.percent * 0.15);
          setDownloads((prev) => ({
            ...prev,
            [downloadId]: {
              ...prev[downloadId],
              progress: p,
            },
          }));
        });

        const url = window.URL.createObjectURL(zipContent);
        const a = document.createElement("a");
        a.href = url;
        a.download = zipFilename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();

        setDownloads((prev) => ({
          ...prev,
          [downloadId]: {
            ...prev[downloadId],
            size: zipContent.size,
            progress: 100,
            status: "success",
          },
        }));

        andMessage.success({ content: `Berkas ZIP "${zipFilename}" berhasil diunduh!`, key: downloadId, duration: 3 });
      } catch (err) {
        console.error("ZIP Download Error:", err);
        setDownloads((prev) => ({
          ...prev,
          [downloadId]: {
            ...prev[downloadId],
            status: "error",
            errorMessage: "Gagal mengunduh berkas ZIP.",
          },
        }));
        andMessage.error({ content: "Gagal mengompresi dan mengunduh berkas ZIP.", key: downloadId });
      }
    },
    [addFolderToZipPublic, getDownloadUrl, getRelativePath]
  );

  const handleDownload = useCallback(
    (file) => {
      if (file.is_dir) {
        handleDownloadZip([file], `${file.name}.zip`);
        return;
      }

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
    },
    [getDownloadUrl, handleDownloadZip]
  );

  // Batch Download handler for selection (ZIP when > 1 item or includes folder)
  const handleBatchDownload = useCallback(() => {
    const files = fileInfo?.files || [];
    const itemsToDownload = files.filter((f) => selectedRowKeys.includes(f.path));

    if (itemsToDownload.length === 0) {
      andMessage.warning("Tidak ada item yang dipilih untuk diunduh.");
      return;
    }

    if (itemsToDownload.length === 1 && !itemsToDownload[0].is_dir) {
      handleDownload(itemsToDownload[0]);
    } else {
      const zipName = `SIPTU_Drive_${dayjs().format("YYYYMMDD_HHmmss")}.zip`;
      handleDownloadZip(itemsToDownload, zipName);
    }

    setSelectedRowKeys([]);
  }, [fileInfo, selectedRowKeys, handleDownload, handleDownloadZip]);

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
  const handleDelete = useCallback((file) => {
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
  }, [baseUrl, token, getRelativePath]);

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

  // Rename Handlers
  const openRenameModal = useCallback((file) => {
    setRenameTargetFile(file);
    setNewFileName(file.name);
    setIsRenameModalOpen(true);
  }, []);

  const handleRename = async () => {
    if (!newFileName.trim()) {
      andMessage.warning("Nama tidak boleh kosong.");
      return;
    }
    if (newFileName === renameTargetFile?.name) {
      setIsRenameModalOpen(false);
      return;
    }
    try {
      setRenaming(true);
      const sourceRelative = getRelativePath(renameTargetFile.path);
      const parentDir = sourceRelative.includes("/")
        ? sourceRelative.substring(0, sourceRelative.lastIndexOf("/"))
        : "";
      const destRelative = parentDir ? `${parentDir}/${newFileName}` : newFileName;

      const response = await fetch(`${baseUrl}/share/move/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_path: sourceRelative,
          dest_path: destRelative,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal mengganti nama.");
      }

      andMessage.success(`Berhasil mengganti nama menjadi "${newFileName}".`);
      setIsRenameModalOpen(false);
      fetchInfo();
    } catch (err) {
      andMessage.error(err.message);
    } finally {
      setRenaming(false);
    }
  };

  // Selector modal triggers (Move/Copy)
  const openSelectorModal = useCallback((file, action) => {
    setSelectorSourceFile(file);
    setSelectorAction(action);
    setSelectorPath("");
    setIsSelectorModalOpen(true);
  }, []);

  const fetchSelectorFolders = useCallback(async () => {
    try {
      setLoadingSelectorFolders(true);
      const url = `${baseUrl}/share/info/${token}?path=${encodeURIComponent(selectorPath)}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
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
  const handleCopySubLink = useCallback((file) => {
    const relative = getRelativePath(file.path);
    const fullUrl = `${window.location.origin}/s/${token}?path=${encodeURIComponent(relative)}`;
    navigator.clipboard.writeText(fullUrl);
    andMessage.success(`Tautan "${file.name}" berhasil disalin!`);
  }, [getRelativePath, token]);

  const handlePreviewPdf = useCallback((file) => {
    window.open(getDownloadUrl(file, true), "_blank");
  }, [getDownloadUrl]);

  const handlePreviewImage = useCallback((file) => {
    setPreviewImage({ src: getDownloadUrl(file, true), title: file.name });
  }, [getDownloadUrl]);

  // Right-click Context Menu Items Generator
  const getFileMenuItems = useCallback(
    (file) => {
      if (!file) return [];

      const isImage = isImageFile(file.name);
      const isDoc = isDocViewable(file.name);
      const isPdf = file.name ? file.name.toLowerCase().endsWith(".pdf") : false;
      const canEdit = !!fileInfo?.can_edit;

      return [
        {
          key: "copy_link",
          label: "Salin Link Direct",
          icon: <LinkOutlined style={{ color: "#1a73e8" }} />,
          onClick: () => handleCopySubLink(file),
        },
        ...(!file.is_dir && isImage
          ? [
              {
                key: "preview-image",
                label: "Pratinjau Foto",
                icon: <PictureOutlined style={{ color: "#52c41a" }} />,
                onClick: () => handlePreviewImage(file),
              },
            ]
          : []),
        ...(!file.is_dir && isDoc
          ? [
              {
                key: "preview-doc",
                label: "Pratinjau Dokumen",
                icon: <EyeOutlined style={{ color: "#1890ff" }} />,
                onClick: () => setDocViewFile(file),
              },
            ]
          : []),
        ...(!file.is_dir && isPdf
          ? [
              {
                key: "preview-pdf",
                label: "Pratinjau PDF",
                icon: <SearchOutlined style={{ color: "#fa8c16" }} />,
                onClick: () => handlePreviewPdf(file),
              },
            ]
          : []),
        ...(!file.is_dir
          ? [
              {
                key: "download",
                label: "Unduh Berkas",
                icon: <DownloadOutlined style={{ color: "#1a73e8" }} />,
                onClick: () => handleDownload(file),
              },
            ]
          : [
              {
                key: "download-folder",
                label: "Unduh Folder (ZIP)",
                icon: <DownloadOutlined style={{ color: "#1a73e8" }} />,
                onClick: () => handleDownload(file),
              },
            ]),
        ...(canEdit
          ? [
              { type: "divider" },
              {
                key: "rename",
                label: "Ganti Nama",
                icon: <EditOutlined style={{ color: "#fa8c16" }} />,
                onClick: () => openRenameModal(file),
              },
              {
                key: "move",
                label: "Pindahkan",
                icon: <FolderOpenOutlined style={{ color: "#722ed1" }} />,
                onClick: () => openSelectorModal(file, "move"),
              },
              {
                key: "copy",
                label: file.is_dir ? "Salin Folder" : "Salin Berkas",
                icon: <PlusOutlined style={{ color: "#13c2c2" }} />,
                onClick: () => openSelectorModal(file, "copy"),
              },
              { type: "divider" },
              {
                key: "delete",
                label: "Hapus",
                danger: true,
                icon: <DeleteOutlined />,
                onClick: () => handleDelete(file),
              },
            ]
          : []),
      ];
    },
    [
      fileInfo,
      handleCopySubLink,
      handleDownload,
      handlePreviewImage,
      handlePreviewPdf,
      openRenameModal,
      openSelectorModal,
      handleDelete,
    ]
  );

  // Antd table columns definition
  const columns = [
    {
      title: "Nama",
      dataIndex: "name",
      key: "name",
      render: (text, record) => (
        <Dropdown menu={{ items: getFileMenuItems(record) }} trigger={["contextMenu"]}>
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
                style={{ color: "#202124", cursor: (isDocViewable(record.name) || record.name.toLowerCase().endsWith(".pdf")) ? "pointer" : "default" }}
                onClick={() => {
                  if (isDocViewable(record.name)) {
                    setDocViewFile(record);
                  } else if (record.name.toLowerCase().endsWith(".pdf")) {
                    window.open(getDownloadUrl(record, true), "_blank");
                  } else {
                    handleDownload(record);
                  }
                }}
              >
                {text}
              </Text>
            )}
          </Space>
        </Dropdown>
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
      width: 180,
      align: "center",
      render: (_, file) => (
        <Space size="small">
          {isDocViewable(file.name) && (
            <Tooltip title="Pratinjau Dokumen (apps doc view)">
              <Button
                type="text"
                shape="circle"
                icon={<EyeOutlined style={{ color: "#1890ff", fontSize: "16px" }} />}
                onClick={() => setDocViewFile(file)}
              />
            </Tooltip>
          )}
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
          <Dropdown
            menu={{ items: getFileMenuItems(file) }}
            trigger={["click"]}
            placement="bottomRight"
          >
            <Button type="text" shape="circle" icon={<EllipsisOutlined />} />
          </Dropdown>
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
        <div className="share-loader-card">
          <div className="share-loader-icon-ring">
            <CloudServerOutlined className="share-loader-cloud-icon" />
            <div className="share-loader-spinner-ring"></div>
          </div>
          <h3 className="share-loader-title">Menyiapkan Berkas...</h3>
          <p className="mf-loader-sub">Membaca & memverifikasi dokumen dari SIPTU Drive Balai POM di Palopo</p>
        </div>
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

  // RENDER CASE 1: Single File Share (MediaFire Style)
  if (!fileInfo.is_dir) {
    const isImg = isImageFile(fileInfo.name);
    const isDoc = isDocViewable(fileInfo.name);
    const isPdf = fileInfo.name ? fileInfo.name.toLowerCase().endsWith(".pdf") : false;
    const uploadedDate = fileInfo.last_modified ? dayjs(fileInfo.last_modified).format("DD MMMM YYYY, HH:mm") : "-";
    const fileExt = fileInfo.name ? fileInfo.name.split(".").pop().toUpperCase() : "FILE";

    const getFormatFullTitle = (ext) => {
      const e = ext.toLowerCase();
      if (["xlsx", "xls", "csv"].includes(e)) return "Microsoft Excel Spreadsheet (." + ext + ")";
      if (["docx", "doc"].includes(e)) return "Microsoft Word Document (." + ext + ")";
      if (["pptx", "ppt"].includes(e)) return "Microsoft PowerPoint Presentation (." + ext + ")";
      if (e === "pdf") return "Portable Document Format (." + ext + ")";
      if (["zip", "rar", "7z"].includes(e)) return "Compressed Archive (." + ext + ")";
      if (["png", "jpg", "jpeg", "webp"].includes(e)) return "Image File (." + ext + ")";
      return "Document File (." + ext + ")";
    };

    return (
      <div className="mf-share-page">
        {/* MediaFire Top Header */}
        <header className="mf-top-header">
          <div className="mf-header-container">
            <div className="mf-brand-logo">
              <CloudServerOutlined className="mf-logo-icon" />
              <div className="mf-logo-text">
                <span className="mf-logo-title">SIPTU Drive</span>
                <span className="mf-logo-sub">Balai POM di Palopo</span>
              </div>
            </div>
            <div className="mf-header-actions">
              <Button 
                type="default" 
                icon={<LinkOutlined />}
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  andMessage.success("Tautan berkas berhasil disalin!");
                }}
              >
                Salin Link
              </Button>
            </div>
          </div>
        </header>

        {/* MediaFire Main Container */}
        <main className="mf-main-container">

          {/* 1. Iconic Dark MediaFire Download Hero Box */}
          <div className="mf-download-box">
            <div className="mf-download-box-inner">
              {/* File Info Left */}
              <div className="mf-file-info-left">
                <div className="mf-file-icon-wrap">
                  {getFileIcon(fileInfo?.name, false)}
                </div>
                <div className="mf-file-text-meta">
                  <h2 className="mf-file-title" title={fileInfo?.name}>
                    {fileInfo?.name}
                  </h2>
                  <div className="mf-quick-actions">
                    <Tooltip title="Salin Tautan">
                      <Button
                        type="text"
                        size="small"
                        icon={<LinkOutlined style={{ color: "#94a3b8" }} />}
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.href);
                          andMessage.success("Tautan berkas berhasil disalin!");
                        }}
                      />
                    </Tooltip>
                    {isImg && (
                      <Tooltip title="Pratinjau Foto">
                        <Button
                          type="text"
                          size="small"
                          icon={<PictureOutlined style={{ color: "#52c41a" }} />}
                          onClick={() => setPreviewImage({ src: getDownloadUrl(fileInfo, true), title: fileInfo.name })}
                        />
                      </Tooltip>
                    )}
                    {isDoc && (
                      <Tooltip title="Pratinjau Dokumen">
                        <Button
                          type="text"
                          size="small"
                          icon={<EyeOutlined style={{ color: "#38bdf8" }} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDocViewFile({ name: fileInfo.name, path: fileInfo.path || fileInfo.base_path, is_dir: false });
                          }}
                        />
                      </Tooltip>
                    )}
                    {isPdf && (
                      <Tooltip title="Pratinjau PDF">
                        <Button
                          type="text"
                          size="small"
                          icon={<EyeOutlined style={{ color: "#f87171" }} />}
                          onClick={() => window.open(getDownloadUrl({ name: fileInfo.name, path: fileInfo.path }, true), "_blank")}
                        />
                      </Tooltip>
                    )}
                  </div>
                </div>
              </div>

              {/* Big Download Button Right */}
              <div className="mf-download-btn-wrap">
                <Button
                  type="primary"
                  size="large"
                  icon={<DownloadOutlined />}
                  onClick={() => handleDownload({ name: fileInfo.name, path: fileInfo.path, size: fileInfo.size })}
                  className="mf-big-download-btn"
                >
                  UNDUH BERKAS ({formatBytes(fileInfo?.size)})
                </Button>
              </div>
            </div>

            {/* Sub Banner inside Dark Box */}
            <div className="mf-download-box-sub">
              <span>🟢 Berkas resmi terverifikasi aman & bebas virus • Balai POM di Palopo</span>
            </div>
          </div>

          <div className="mf-sub-disclaimer">
            <span>Tombol unduh di atas akan langsung memulai pengunduhan berkas Anda secara aman.</span>
          </div>

          {/* 2. Content Details Section (2 Columns) */}
          <div className="mf-details-grid">
            
            {/* Left Column - Detailed Spec */}
            <div className="mf-details-left">
              <div className="mf-file-card-summary">
                <div className="mf-summary-icon">
                  {getFileIcon(fileInfo?.name, false)}
                </div>
                <div className="mf-summary-text">
                  <h3 className="mf-summary-name">{fileInfo?.name}</h3>
                  <p className="mf-summary-format">{getFormatFullTitle(fileExt)}</p>
                </div>
              </div>

              <div className="mf-meta-list">
                <div className="mf-meta-row">
                  <span className="mf-meta-label">Ukuran Berkas:</span>
                  <span className="mf-meta-value">{formatBytes(fileInfo?.size)}</span>
                </div>
                <div className="mf-meta-row">
                  <span className="mf-meta-label">Diunggah:</span>
                  <span className="mf-meta-value">{uploadedDate}</span>
                </div>
                <div className="mf-meta-row">
                  <span className="mf-meta-label">Keamanan:</span>
                  <span className="mf-meta-value text-success">🟢 Bebas Virus & Terenkripsi</span>
                </div>
              </div>

              <div className="mf-info-box">
                <h4>Tentang Berkas & Format Dokumen</h4>
                <p>
                  Berkas ini di-host secara langsung di server aman SIPTU Drive Balai POM di Palopo.
                  Anda dapat membuka pratinjau berkas secara langsung di peramban web atau mengunduhnya ke perangkat Anda.
                </p>
              </div>
            </div>

            {/* Right Column - Preview & System Compatibility */}
            <div className="mf-details-right">
              {/* Card 1: Pratinjau Dokumen Online */}
              {(isDoc || isPdf || isImg) && (
                <div className="mf-side-card">
                  <h4 className="mf-side-card-title">Pratinjau Berkas Online</h4>
                  <p className="mf-side-card-sub">
                    Buka dan lihat isi berkas secara langsung tanpa perlu mengunduh.
                  </p>
                  {isImg && (
                    <Button
                      type="primary"
                      icon={<PictureOutlined />}
                      onClick={() => setPreviewImage({ src: getDownloadUrl(fileInfo, true), title: fileInfo.name })}
                      style={{ background: "#52c41a", borderColor: "#52c41a", fontWeight: 700 }}
                      block
                    >
                      Pratinjau Foto Halaman Penuh
                    </Button>
                  )}
                  {isDoc && (
                    <Button
                      type="primary"
                      icon={<EyeOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDocViewFile({ name: fileInfo.name, path: fileInfo.path || fileInfo.base_path, is_dir: false });
                      }}
                      className="mf-side-btn-office"
                      block
                    >
                      Buka Microsoft Office View
                    </Button>
                  )}
                  {isPdf && (
                    <Button
                      type="primary"
                      icon={<EyeOutlined />}
                      onClick={() => window.open(getDownloadUrl({ name: fileInfo.name, path: fileInfo.path }, true), "_blank")}
                      className="mf-side-btn-pdf"
                      block
                    >
                      Pratinjau PDF Halaman Penuh
                    </Button>
                  )}
                </div>
              )}

              {/* Card 2: Kompatibilitas Sistem */}
              <div className="mf-side-card">
                <h4 className="mf-side-card-title">Kompatibilitas Perangkat</h4>
                <div className="mf-compat-select">
                  <span className="mf-compat-label">Sistem Operasi:</span>
                  <span className="mf-compat-val">Windows / Android / iOS / Mac</span>
                </div>
                <div className="mf-compat-status">
                  <span className="mf-compat-dot">🟢</span>
                  <span>Berkas 100% kompatibel dengan sistem peramban Anda.</span>
                </div>
              </div>
            </div>

          </div>

        </main>

        {/* MediaFire Footer */}
        <footer className="mf-footer">
          <p>© {new Date().getFullYear()} SIPTU Drive • Balai POM di Palopo. Terintegrasi Nextcloud Storage.</p>
        </footer>

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

        {/* Image Preview Modal */}
        <Modal
          open={!!previewImage}
          footer={null}
          onCancel={() => setPreviewImage(null)}
          centered
          width={800}
          bodyStyle={{ padding: 0, textAlign: "center", background: "#000000" }}
        >
          {previewImage && (
            <img 
              src={previewImage.src} 
              alt={previewImage.title} 
              style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain" }} 
            />
          )}
        </Modal>

        {/* Apps Doc View Modal */}
        <DocViewerModal
          open={!!docViewFile}
          file={docViewFile}
          onClose={() => setDocViewFile(null)}
          publicToken={token}
          onDownload={handleDownload}
        />
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
                >
                  Unduh Terpilih ({selectedRowKeys.length})
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
                    } else if (isImageFile(record.name)) {
                      handlePreviewImage(record);
                    } else if (record.name && record.name.toLowerCase().endsWith(".pdf")) {
                      handlePreviewPdf(record);
                    } else if (isDocViewable(record.name)) {
                      setDocViewFile(record);
                    } else {
                      handleDownload(record);
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
                        <Dropdown key={idx} menu={{ items: getFileMenuItems(folder) }} trigger={["contextMenu"]}>
                          <div
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
                            <div className="share-folder-chip-actions" onClick={(e) => e.stopPropagation()}>
                              <Dropdown
                                menu={{ items: getFileMenuItems(folder) }}
                                trigger={["click"]}
                                placement="bottomRight"
                              >
                                <Button type="text" size="small" shape="circle" icon={<EllipsisOutlined />} />
                              </Dropdown>
                            </div>
                          </div>
                        </Dropdown>
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
                      
                      return (
                        <Dropdown key={idx} menu={{ items: getFileMenuItems(file) }} trigger={["contextMenu"]}>
                          <div 
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
                              onDoubleClick={() => {
                                if (isImageFile(file.name)) {
                                  handlePreviewImage(file);
                                } else if (file.name && file.name.toLowerCase().endsWith(".pdf")) {
                                  handlePreviewPdf(file);
                                } else if (isDocViewable(file.name)) {
                                  setDocViewFile(file);
                                } else {
                                  handleDownload(file);
                                }
                              }}
                              style={{ cursor: "pointer" }}
                            >
                              <div className="share-preview-icon-wrapper">
                                {getFileIcon(file.name, false)}
                              </div>
                            </div>
                            <div className="share-file-card-meta">
                              <div className="share-file-card-title" title={file.name}>
                                {file.name}
                              </div>
                              <div className="share-file-card-sub">
                                <span>{formatBytes(file.size)}</span>
                                <div onClick={(e) => e.stopPropagation()}>
                                  <Dropdown
                                    menu={{ items: getFileMenuItems(file) }}
                                    trigger={["click"]}
                                    placement="bottomRight"
                                  >
                                    <Button type="text" size="small" shape="circle" icon={<EllipsisOutlined />} />
                                  </Dropdown>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Dropdown>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* New Folder Modal */}
      <Modal
        title="Buat Folder Baru"
        open={isFolderModalOpen}
        onOk={handleCreateFolder}
        onCancel={() => setIsFolderModalOpen(false)}
        confirmLoading={creatingFolder}
        okText="Buat"
        cancelText="Batal"
        centered
      >
        <Input
          placeholder="Nama folder"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          onPressEnter={handleCreateFolder}
          autoFocus
        />
      </Modal>

      {/* Upload File Modal */}
      <Modal
        title="Upload Berkas ke Shared Folder"
        open={isUploadModalOpen}
        footer={null}
        onCancel={() => setIsUploadModalOpen(false)}
        centered
        width={500}
      >
        <Dragger
          customRequest={handleCustomUpload}
          showUploadList={false}
          multiple
          style={{ padding: "24px", background: "#f8fafc" }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ color: "#1a73e8" }} />
          </p>
          <p className="ant-upload-text">Klik atau tarik berkas ke area ini untuk mengunggah</p>
          <p className="ant-upload-hint">Dukungan unggah berkas langsung ke Nextcloud Storage</p>
        </Dragger>
      </Modal>

      {/* Rename Item Modal */}
      <Modal
        title="Ganti Nama Item"
        open={isRenameModalOpen}
        onOk={handleRename}
        onCancel={() => setIsRenameModalOpen(false)}
        confirmLoading={renaming}
        okText="Simpan"
        cancelText="Batal"
        centered
      >
        <Input
          placeholder="Nama baru"
          value={newFileName}
          onChange={(e) => setNewFileName(e.target.value)}
          onPressEnter={handleRename}
          autoFocus
        />
      </Modal>

      {/* Move / Copy Selector Modal */}
      <Modal
        title={selectorAction === "move" ? "Pindahkan Item ke Folder" : "Salin Item ke Folder"}
        open={isSelectorModalOpen}
        onOk={handleExecuteSelectorAction}
        onCancel={() => setIsSelectorModalOpen(false)}
        confirmLoading={executingSelector}
        okText={selectorAction === "move" ? "Pindahkan Ke Sini" : "Salin Ke Sini"}
        cancelText="Batal"
        centered
        width={520}
      >
        <div style={{ marginBottom: "12px" }}>
          <Text type="secondary" style={{ fontSize: "12px" }}>Lokasi Tujuan:</Text>
          <div style={{ background: "#f1f3f4", padding: "8px 12px", borderRadius: "6px", marginTop: "4px", fontSize: "13px" }}>
            <Breadcrumb separator=">">
              <Breadcrumb.Item onClick={() => navigateSelectorToSegment(-1)} style={{ cursor: "pointer", color: "#1a73e8" }}>
                Shared Root
              </Breadcrumb.Item>
              {selectorPathSegments.map((seg, idx) => (
                <Breadcrumb.Item key={idx} onClick={() => navigateSelectorToSegment(idx)} style={{ cursor: "pointer", color: "#1a73e8" }}>
                  {seg}
                </Breadcrumb.Item>
              ))}
            </Breadcrumb>
          </div>
        </div>

        <div style={{ border: "1px solid #dadce0", borderRadius: "8px", maxHeight: "250px", overflowY: "auto", padding: "8px" }}>
          {loadingSelectorFolders ? (
            <div style={{ textAlign: "center", padding: "20px" }}>
              <Spin size="small" />
            </div>
          ) : selectorFolders.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Tidak ada subfolder di lokasi ini." />
          ) : (
            selectorFolders.map((sub, idx) => (
              <div
                key={idx}
                onClick={() => {
                  const relativeSub = getRelativePath(sub.path);
                  setSelectorPath(relativeSub);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
                className="selector-folder-item"
              >
                <FolderFilled style={{ color: "#ffb703", fontSize: "18px", marginRight: "10px" }} />
                <span style={{ fontSize: "13px", color: "#202124", fontWeight: 500 }}>{sub.name}</span>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Google Drive-like Download Progress Widget */}
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
                        {isDownloading && `${item.progress}% ${item.size ? `dari ${formatBytes(item.size)}` : ""}`}
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

      {/* Floating Upload Progress Widget */}
      {isUploadWidgetVisible && (
        <div className={`drive-download-widget ${isUploadWidgetMinimized ? "minimized" : ""}`} style={{ position: "fixed", bottom: "24px", right: "400px", width: "360px", background: "#ffffff", borderRadius: "8px", boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)", zIndex: 1000, display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid #dadce0" }}>
          <div className="download-widget-header" style={{ height: "48px", background: "#1a73e8", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px" }}>
            <span className="download-widget-title" style={{ fontSize: "14px", fontWeight: 500 }}>
              {hasActiveUploads
                ? `Mengunggah ${Object.values(uploadingFiles).filter((f) => f.status === "uploading").length} berkas`
                : `${Object.values(uploadingFiles).filter((f) => f.status === "success").length} unggahan selesai`}
            </span>
            <div className="download-widget-controls">
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
            <div className="download-widget-body" style={{ maxHeight: "250px", overflowY: "auto", padding: "8px 0" }}>
              {Object.values(uploadingFiles).map((item) => {
                const isUploading = item.status === "uploading";
                const isSuccess = item.status === "success";
                const isError = item.status === "error";

                return (
                  <div key={item.uid} className="download-item-row" style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #f1f3f4" }}>
                    <div className="download-item-icon" style={{ marginRight: "12px", display: "flex", alignItems: "center" }}>
                      {getFileIcon(item.name, false)}
                    </div>
                    <div className="download-item-details" style={{ flexGrow: 1, display: "flex", flexDirection: "column", overflow: "hidden", marginRight: "8px" }}>
                      <span className="download-item-name" style={{ fontSize: "13px", color: "#202124", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.name}
                      </span>
                      <span className="download-item-meta" style={{ fontSize: "11px", color: "#5f6368", marginTop: "2px" }}>
                        {isUploading && `${item.progress}% dari ${formatBytes(item.size)}`}
                        {isSuccess && `Selesai • ${formatBytes(item.size)}`}
                        {isError && `Gagal • ${item.errorMessage}`}
                      </span>
                    </div>
                    <div className="download-item-status" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px" }}>
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

      {/* Image Preview Modal */}
      <Modal
        open={!!previewImage}
        footer={null}
        onCancel={() => setPreviewImage(null)}
        centered
        width={800}
        bodyStyle={{ padding: 0, textAlign: "center", background: "#000000" }}
      >
        {previewImage && (
          <img 
            src={previewImage.src} 
            alt={previewImage.title} 
            style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain" }} 
          />
        )}
      </Modal>

      {/* Apps Doc View Modal */}
      <DocViewerModal
        open={!!docViewFile}
        file={docViewFile}
        onClose={() => setDocViewFile(null)}
        publicToken={token}
        onDownload={handleDownload}
      />
    </div>
  );
}
