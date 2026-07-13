import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Checkbox,
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
  Spin,
  message as andMessage,
} from "antd";
import {
  CloudServerOutlined,
  CloudUploadOutlined,
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
  LinkOutlined,
  EditOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  MinusOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { useAuth } from "../hooks/useAuth.js";
import dayjs from "dayjs";
import "./PenyimpananCloud.css";

const { Title, Text } = Typography;
const { Dragger } = Upload;

const getEditableType = (fileName) => {
  if (!fileName) return null;
  const ext = fileName.split(".").pop().toLowerCase();
  if (["xlsx", "xls"].includes(ext)) return "xlsx";
  if (["docx", "doc"].includes(ext)) return "docx";
  return null;
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
  const [viewMode, setViewMode] = useState("list"); // grid or list
  const [currentPath, setCurrentPath] = useState(""); // relative to NIP root
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Modals state
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

  // Sharing settings states
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareFile, setShareFile] = useState(null);
  const [shareSettings, setShareSettings] = useState({ is_shared: false, token: "", can_edit: false });
  const [loadingShareSettings, setLoadingShareSettings] = useState(false);

  // Selector modal states (Move/Copy)
  const [isSelectorModalOpen, setIsSelectorModalOpen] = useState(false);
  const [selectorAction, setSelectorAction] = useState("move"); // "move" or "copy"
  const [selectorSourceFile, setSelectorSourceFile] = useState(null);
  const [selectorPath, setSelectorPath] = useState("");
  const [selectorFolders, setSelectorFolders] = useState([]);
  const [loadingSelectorFolders, setLoadingSelectorFolders] = useState(false);
  const [executingSelector, setExecutingSelector] = useState(false);

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

  useEffect(() => {
    setSelectedRowKeys([]);
  }, [currentPath, selectedNip]);

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
    const token = localStorage.getItem("sipaus_token");
    const baseUrlRaw = import.meta.env.VITE_API_URL || "https://siptu.bpompalopo.com/core_api/api";
    const baseUrl = baseUrlRaw.replace(/\/+$/, "");
    const url = `${baseUrl}/nextcloud/download?path=${encodeURIComponent(file.path)}`;

    xhr.open("GET", url, true);
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }
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

  const handlePreviewPdf = async (file) => {
    const key = `preview-${file.name}`;
    try {
      andMessage.loading({ content: `Menyiapkan pratinjau ${file.name}...`, key });
      const response = await apiFetch(`/nextcloud/download?path=${encodeURIComponent(file.path)}`);
      if (!response.ok) throw new Error("Gagal mengunduh berkas dari Nextcloud.");
      
      const blob = await response.blob();
      const pdfBlob = new Blob([blob], { type: "application/pdf" });
      const url = window.URL.createObjectURL(pdfBlob);
      window.open(url, "_blank");
      
      andMessage.success({ content: "Pratinjau siap.", key });
    } catch (err) {
      andMessage.error({ content: err.message, key });
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOverPage(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
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
    setIsDraggingOverPage(false);

    const nip = isAdmin ? selectedNip : user?.nip;
    if (!nip) {
      andMessage.warning("Pilih pegawai terlebih dahulu.");
      return;
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesList = Array.from(e.dataTransfer.files);
      filesList.forEach((rawFile) => {
        handleCustomUpload({ file: rawFile });
      });
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

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) return;
    
    Modal.confirm({
      title: "Hapus Beberapa Item",
      content: `Apakah Anda yakin ingin menghapus ${selectedRowKeys.length} item terpilih dari Nextcloud? Semua subfolder dan berkas di dalamnya juga akan terhapus. Tindakan ini tidak dapat dibatalkan.`,
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
            const response = await apiFetch(`/nextcloud/delete?path=${encodeURIComponent(path)}`, {
              method: "DELETE",
            });
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
        fetchFiles();
      }
    });
  };

  const handleBatchDownload = () => {
    const filesToDownload = filteredFiles.filter(
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

  // Share link settings modal triggers
  const openShareModal = async (file) => {
    setShareFile(file);
    setIsShareModalOpen(true);
    setLoadingShareSettings(true);
    try {
      const response = await apiFetch(`/nextcloud/share-settings?path=${encodeURIComponent(file.path)}`);
      if (response.ok) {
        const data = await response.json();
        setShareSettings(data);
      }
    } catch (err) {
      andMessage.error("Gagal memuat pengaturan berbagi.");
    } finally {
      setLoadingShareSettings(false);
    }
  };

  const handleCreateOrUpdateShare = async (canEdit) => {
    if (!shareFile) return;
    try {
      setLoadingShareSettings(true);
      const response = await apiFetch("/nextcloud/share-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: shareFile.path,
          can_edit: canEdit,
        }),
      });
      if (!response.ok) throw new Error("Gagal menyimpan pengaturan berbagi.");
      const data = await response.json();
      setShareSettings(data);
      andMessage.success("Pengaturan berbagi berhasil diperbarui.");
      fetchFiles();
    } catch (err) {
      andMessage.error(err.message);
    } finally {
      setLoadingShareSettings(false);
    }
  };

  const handleStopSharing = async () => {
    if (!shareFile) return;
    try {
      setLoadingShareSettings(true);
      const response = await apiFetch(`/nextcloud/share-settings?path=${encodeURIComponent(shareFile.path)}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Gagal menghentikan berbagi.");
      setShareSettings({ is_shared: false, token: "", can_edit: false });
      andMessage.success("Berbagi berkas telah dihentikan.");
      fetchFiles();
    } catch (err) {
      andMessage.error(err.message);
    } finally {
      setLoadingShareSettings(false);
    }
  };

  // Selector modal triggers (Move/Copy)
  const openSelectorModal = (file, action) => {
    setSelectorSourceFile(file);
    setSelectorAction(action);
    setSelectorPath("");
    setIsSelectorModalOpen(true);
  };

  const fetchSelectorFolders = useCallback(async () => {
    const nip = isAdmin ? selectedNip : user?.nip;
    if (!nip) return;
    try {
      setLoadingSelectorFolders(true);
      const url = `/nextcloud/files?nip=${nip}&path=${encodeURIComponent(selectorPath)}`;
      const response = await apiFetch(url);
      if (response.ok) {
        const data = await response.json();
        // Skip source folder itself if we are moving it
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
  }, [isAdmin, selectedNip, user, apiFetch, selectorPath, selectorSourceFile]);

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

  const handleExecuteSelectorAction = async () => {
    if (!selectorSourceFile) return;
    const nip = isAdmin ? selectedNip : user?.nip;
    const basePrefix = `/SIPTU Drive/${nip}`;
    const destFolder = selectorPath ? `${basePrefix}/${selectorPath.replace(/^\/+/, "")}` : basePrefix;
    const destPath = `${destFolder}/${selectorSourceFile.name}`;

    try {
      setExecutingSelector(true);
      const url = selectorAction === "move" ? "/nextcloud/move" : "/nextcloud/copy";
      const response = await apiFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_path: selectorSourceFile.path,
          dest_path: destPath,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal melakukan aksi.");
      }

      andMessage.success(`Berhasil ${selectorAction === "move" ? "memindahkan" : "menyalin"} item.`);
      setIsSelectorModalOpen(false);
      fetchFiles();
    } catch (err) {
      andMessage.error(err.message);
    } finally {
      setExecutingSelector(false);
    }
  };

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

    const fileUid = file.uid || `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    setIsUploadWidgetVisible(true);
    setIsUploadWidgetMinimized(false);

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
          <div style={{ position: "relative", display: "inline-block", height: "24px" }}>
            {getFileIcon(record)}
            {record.is_shared && (
              <div className="shared-badge-list">
                <LinkOutlined style={{ fontSize: "8px", color: "#1a73e8" }} />
              </div>
            )}
          </div>
          {record.is_dir ? (
            <Button
              type="link"
              onClick={() => handleFolderOpen(record)}
              className="list-folder-link"
            >
              {text}
            </Button>
          ) : (
            <Text 
              strong 
              className="list-file-text"
              style={{ cursor: record.name.toLowerCase().endsWith(".pdf") ? "pointer" : "default" }}
              onClick={() => record.name.toLowerCase().endsWith(".pdf") && handlePreviewPdf(record)}
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
          <Tooltip title="Pengaturan Bagikan">
            <Button
              type="text"
              shape="circle"
              icon={<LinkOutlined style={{ color: file.is_shared ? "#1a73e8" : "#5f6368" }} />}
              onClick={() => openShareModal(file)}
            />
          </Tooltip>
          {getEditableType(file.name) && (
            <Tooltip title="Edit Berkas">
              <Button
                type="text"
                shape="circle"
                icon={<EditOutlined style={{ color: "#fa8c16" }} />}
                onClick={() => navigate(`/app/drive/editor?path=${encodeURIComponent(file.path)}&type=${getEditableType(file.name)}`)}
              />
            </Tooltip>
          )}
          {file.name.toLowerCase().endsWith(".pdf") && (
            <Tooltip title="Pratinjau PDF">
              <Button
                type="text"
                shape="circle"
                icon={<SearchOutlined style={{ color: "#fa8c16" }} />}
                onClick={() => handlePreviewPdf(file)}
              />
            </Tooltip>
          )}
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
          <Dropdown
            menu={{
              items: [
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
        </Space>
      ),
    },
  ];

  return (
    <div
      className={`drive-standalone-layout ${isSidebarOpen ? "sidebar-open" : ""}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
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
          <div className="drive-menu-item return-btn" onClick={() => navigate("/app/layanan-mandiri")}>
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
                <Button 
                  type="primary" 
                  danger 
                  icon={<DeleteOutlined />} 
                  onClick={handleBatchDelete}
                >
                  Hapus Terpilih
                </Button>
                <Button 
                  type="text" 
                  onClick={() => setSelectedRowKeys([])}
                >
                  Batal
                </Button>
              </Space>
            </div>
          )}
          
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
                dataSource={filteredFiles.map((f) => ({ ...f, key: f.path }))}
                rowSelection={{
                  selectedRowKeys,
                  onChange: setSelectedRowKeys,
                }}
                columns={columns}
                pagination={{ pageSize: 15, showSizeChanger: false }}
                size="middle"
                className="explorer-table"
                onRow={(record) => ({
                  onDoubleClick: () => {
                    if (record.is_dir) {
                      handleFolderOpen(record);
                    } else {
                      const editableType = getEditableType(record.name);
                      if (editableType) {
                        navigate(`/app/drive/editor?path=${encodeURIComponent(record.path)}&type=${editableType}`);
                      } else if (record.name.toLowerCase().endsWith(".pdf")) {
                        handlePreviewPdf(record);
                      } else {
                        handleDownload(record);
                      }
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
                  <div className={`drive-folders-grid ${selectedRowKeys.length > 0 ? "has-selection" : ""}`}>
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
                          className={`drive-folder-chip ${isFolderSelected ? "selected" : ""}`}
                          onDoubleClick={() => handleFolderOpen(folder)}
                          onClick={handleToggleSelect}
                        >
                          <div className="grid-item-checkbox" onClick={(e) => e.stopPropagation()}>
                            <Checkbox 
                              checked={isFolderSelected} 
                              onChange={handleToggleSelect}
                            />
                          </div>
                          <div style={{ position: "relative", display: "inline-block", height: "24px" }}>
                          <FolderFilled className="drive-folder-chip-icon" />
                          {folder.is_shared && (
                            <div className="shared-badge-grid-folder">
                              <LinkOutlined style={{ fontSize: "8px", color: "#ffffff" }} />
                            </div>
                          )}
                        </div>
                        <span className="drive-folder-chip-name" title={folder.name}>
                          {folder.name}
                        </span>
                        <div className="drive-folder-chip-actions" onDoubleClick={(e) => e.stopPropagation()}>
                          <Dropdown
                            menu={{
                              items: [
                                {
                                  key: "share",
                                  label: "Pengaturan Bagikan",
                                  icon: <LinkOutlined />,
                                  onClick: () => openShareModal(folder),
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
                      </div>
                    );
                  })}
                  </div>
                </div>
              )}

              {/* Render Files Grid if files exist */}
              {fileItems.length > 0 && (
                <div className="drive-files-section">
                  <div className="drive-section-title">File</div>
                  <div className={`drive-files-grid ${selectedRowKeys.length > 0 ? "has-selection" : ""}`}>
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
                        <div 
                          key={idx} 
                          className={`drive-file-card ${isFileSelected ? "selected" : ""}`}
                          onClick={handleToggleSelect}
                        >
                          <div className="grid-item-checkbox" onClick={(e) => e.stopPropagation()}>
                            <Checkbox 
                              checked={isFileSelected} 
                              onChange={handleToggleSelect}
                            />
                          </div>
                          <div
                            className="drive-file-card-preview"
                            onDoubleClick={() => {
                              const editableType = getEditableType(file.name);
                              if (editableType) {
                              navigate(`/app/drive/editor?path=${encodeURIComponent(file.path)}&type=${editableType}`);
                            } else if (file.name.toLowerCase().endsWith(".pdf")) {
                              handlePreviewPdf(file);
                            } else {
                              handleDownload(file);
                            }
                          }}
                        >
                          <div className="preview-icon-wrapper" style={{ position: "relative" }}>
                            {getFileIcon(file)}
                            {file.is_shared && (
                              <div className="shared-badge-grid-file">
                                <LinkOutlined style={{ fontSize: "12px", color: "#1a73e8" }} />
                              </div>
                            )}
                          </div>
                          <div className="preview-extension-tag">
                            {file.name.split(".").pop().toUpperCase()}
                          </div>
                        </div>
                        <div className="drive-file-card-info">
                          <div className="drive-file-card-meta">
                            <span 
                              className="drive-file-title" 
                              title={file.name}
                              onClick={() => file.name.toLowerCase().endsWith(".pdf") && handlePreviewPdf(file)}
                              style={{ cursor: file.name.toLowerCase().endsWith(".pdf") ? "pointer" : "default" }}
                            >
                              {file.name}
                            </span>
                            <span className="drive-file-size">
                              {formatBytes(file.size)}
                            </span>
                          </div>
                          <div className="drive-file-card-actions" onClick={(e) => e.stopPropagation()}>
                            {file.name.toLowerCase().endsWith(".pdf") && (
                              <Tooltip title="Pratinjau PDF">
                                <Button
                                  type="text"
                                  size="small"
                                  shape="circle"
                                  icon={<SearchOutlined style={{ color: "#fa8c16" }} />}
                                  onClick={() => handlePreviewPdf(file)}
                                />
                              </Tooltip>
                            )}
                            {!file.is_dir && (
                              <Tooltip title="Unduh">
                                <Button
                                  type="text"
                                  size="small"
                                  shape="circle"
                                  icon={<DownloadOutlined style={{ color: "var(--color-primary)" }} />}
                                  onClick={() => handleDownload(file)}
                                />
                              </Tooltip>
                            )}
                            <Dropdown
                              menu={{
                                items: [
                                  {
                                    key: "share",
                                    label: "Pengaturan Bagikan",
                                    icon: <LinkOutlined />,
                                    onClick: () => openShareModal(file),
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
      </div>

      {/* Modal: Pengaturan Berbagi */}
      <Modal
        title="Pengaturan Berbagi Link"
        open={isShareModalOpen}
        footer={null}
        onCancel={() => {
          setIsShareModalOpen(false);
          setShareFile(null);
          setShareSettings({ is_shared: false, token: "", can_edit: false });
        }}
        centered
      >
        <Spin spinning={loadingShareSettings}>
          <div style={{ padding: "12px 0" }}>
            <div style={{ marginBottom: "16px" }}>
              <Text strong style={{ display: "block", marginBottom: "4px" }}>Item:</Text>
              <Text type="secondary">{shareFile?.name}</Text>
            </div>

            {shareSettings.is_shared ? (
              <>
                <div style={{ marginBottom: "16px" }}>
                  <Text strong style={{ display: "block", marginBottom: "6px" }}>Link Berbagi:</Text>
                  <Space.Compact style={{ width: "100%" }}>
                    <Input 
                      value={`${window.location.origin}/share/${encodeURIComponent(shareSettings.token)}`} 
                      readOnly 
                    />
                    <Button 
                      type="primary" 
                      onClick={async () => {
                        await navigator.clipboard.writeText(
                          `${window.location.origin}/share/${encodeURIComponent(shareSettings.token)}`
                        );
                        andMessage.success("Link berhasil disalin!");
                      }}
                    >
                      Salin
                    </Button>
                  </Space.Compact>
                </div>

                <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <Text strong style={{ display: "block" }}>Izinkan Pengeditan:</Text>
                    <Text type="secondary" style={{ fontSize: "12px" }}>
                      Tamu publik dapat menambah, menghapus, memindahkan, atau menyalin berkas.
                    </Text>
                  </div>
                  <Radio.Group
                    options={[
                      { label: "Bisa Edit", value: true },
                      { label: "Lihat Saja", value: false }
                    ]}
                    onChange={(e) => handleCreateOrUpdateShare(e.target.value)}
                    value={shareSettings.can_edit}
                    optionType="button"
                    buttonStyle="solid"
                  />
                </div>

                <Button 
                  danger 
                  type="primary" 
                  onClick={handleStopSharing}
                  block
                  icon={<DeleteOutlined />}
                >
                  Hentikan Berbagi Link
                </Button>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <Empty description="Link berbagi belum aktif untuk berkas ini." style={{ marginBottom: "16px" }} />
                <Button 
                  type="primary" 
                  onClick={() => handleCreateOrUpdateShare(false)}
                >
                  Aktifkan Link Berbagi
                </Button>
              </div>
            )}
          </div>
        </Spin>
      </Modal>

      {/* Modal: Folder Selector (Move/Copy) */}
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
                <HomeOutlined /> <span>Drive Saya</span>
              </Breadcrumb.Item>
              {selectorPathSegments.map((segment, idx) => (
                <Breadcrumb.Item
                  key={idx}
                  onClick={() => navigateSelectorToSegment(idx)}
                  style={{ cursor: "pointer" }}
                >
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

      {/* Google Drive-like Download Status Widget */}
      {isDownloadWidgetVisible && (
        <div 
          className={`drive-download-widget ${isDownloadWidgetMinimized ? "minimized" : ""}`}
          style={{ right: isUploadWidgetVisible ? "400px" : "24px" }}
        >
          <div className="download-widget-header">
            <span className="download-widget-title">
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
            <div className="download-widget-body">
              {Object.values(downloads).map((item) => {
                const isDownloading = item.status === "downloading";
                const isSuccess = item.status === "success";
                const isError = item.status === "error";
                
                return (
                  <div key={item.id} className="download-item-row">
                    <div className="download-item-icon">
                      {getFileIcon({ name: item.name, is_dir: false })}
                    </div>
                    <div className="download-item-details">
                      <span className="download-item-name" title={item.name}>
                        {item.name}
                      </span>
                      <span className="download-item-meta">
                        {isDownloading && `${item.progress}% dari ${formatBytes(item.size)}`}
                        {isSuccess && `Selesai • ${formatBytes(item.size)}`}
                        {isError && `Gagal • ${item.errorMessage}`}
                      </span>
                    </div>
                    <div className="download-item-status">
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
        <div className={`drive-upload-widget ${isUploadWidgetMinimized ? "minimized" : ""}`}>
          <div className="upload-widget-header">
            <span className="upload-widget-title">
              {Object.values(uploadingFiles).some((f) => f.status === "uploading")
                ? `Mengunggah ${Object.values(uploadingFiles).filter((f) => f.status === "uploading").length} item`
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
            <div className="upload-widget-body">
              {Object.values(uploadingFiles).map((item) => {
                const isUploading = item.status === "uploading";
                const isSuccess = item.status === "success";
                const isError = item.status === "error";
                
                return (
                  <div key={item.uid} className="upload-item-row">
                    <div className="upload-item-icon">
                      {getFileIcon({ name: item.name, is_dir: false })}
                    </div>
                    <div className="upload-item-details">
                      <span className="upload-item-name" title={item.name}>
                        {item.name}
                      </span>
                      <span className="upload-item-meta">
                        {isUploading && `${item.progress}% dari ${formatBytes(item.size)}`}
                        {isSuccess && `Selesai • ${formatBytes(item.size)}`}
                        {isError && `Gagal • ${item.errorMessage}`}
                      </span>
                    </div>
                    <div className="upload-item-status">
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
        className={`drive-drag-overlay ${isDraggingOverPage && (!isAdmin || selectedNip) ? "active" : ""}`}
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
