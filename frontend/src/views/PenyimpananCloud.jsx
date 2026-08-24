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
  Image,
  Badge,
  Popover,
  List,
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
  FolderAddOutlined,
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
  EyeOutlined,
  PictureOutlined,
  BellOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  FilterOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import { useAuth } from "../hooks/useAuth.js";
import DocViewerModal from "../components/DocViewerModal.jsx";
import JSZip from "jszip";
import dayjs from "dayjs";
import "./PenyimpananCloud.css";

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
  if (!file) return <FileFilled className="drive-icon-default" />;
  if (file.is_dir) {
    return <FolderFilled className="drive-icon-folder" />;
  }
  const ext = file.name ? file.name.split(".").pop().toLowerCase() : "";
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
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("list"); // grid or list
  const [currentPath, setCurrentPath] = useState(""); // relative to NIP root
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sortField, setSortField] = useState("name"); // "name" | "size" | "last_modified"
  const [sortOrder, setSortOrder] = useState("asc"); // "asc" (A-Z) | "desc" (Z-A)
  const [filterType, setFilterType] = useState("all"); // "all" | "folder" | "document" | "pdf" | "image" | "archive"

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
  const folderInputRef = useRef(null);

  // Delete modal & progress states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetItems, setDeleteTargetItems] = useState([]);
  const [deletingItems, setDeletingItems] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(null); // { visible, total, current, currentItemName, status }

  // Rename modal states
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameTargetFile, setRenameTargetFile] = useState(null);
  const [newRenameName, setNewRenameName] = useState("");
  const [renamingFile, setRenamingFile] = useState(false);

  // Apps Doc View state
  const [docViewFile, setDocViewFile] = useState(null);

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
    const nip = user?.nip;
    if (!nip) {
      setFiles([]);
      return;
    }

    try {
      setLoadingFiles(true);
      const url = `/nextcloud/files?path=${encodeURIComponent(currentPath)}`;
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
  }, [user, apiFetch, currentPath]);

  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (user?.nip) {
      fetchFiles();
    }
  }, [user, fetchFiles]);

  // Recursive search within current folder
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const url = `/nextcloud/search?path=${encodeURIComponent(currentPath)}&query=${encodeURIComponent(searchQuery.trim())}`;
        const response = await apiFetch(url);
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.files || []);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, currentPath, apiFetch]);

  useEffect(() => {
    setSelectedRowKeys([]);
  }, [currentPath]);

  // Folder Navigation Helper
  const handleFolderOpen = (folder) => {
    const nip = user?.nip;
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

  // Recursive folder ZIP helper
  const addFolderToZip = useCallback(async (zip, folderPath, currentZipFolder) => {
    try {
      const response = await apiFetch(`/nextcloud/files?path=${encodeURIComponent(folderPath)}`);
      if (!response.ok) return;
      const data = await response.json();
      const items = data.files || [];

      const nip = user?.nip;
      const basePrefix = `/SIPTU Drive/${nip}`;

      for (const item of items) {
        if (item.is_dir) {
          const subFolderZip = currentZipFolder.folder(item.name);
          let relPath = item.path;
          if (relPath.startsWith(basePrefix)) {
            relPath = relPath.substring(basePrefix.length);
          }
          await addFolderToZip(zip, relPath, subFolderZip);
        } else {
          const fileRes = await apiFetch(`/nextcloud/download?path=${encodeURIComponent(item.path)}`);
          if (fileRes.ok) {
            const blob = await fileRes.blob();
            currentZipFolder.file(item.name, blob);
          }
        }
      }
    } catch (err) {
      console.error("Error adding folder to ZIP:", err);
    }
  }, [apiFetch, user]);

  // JSZip Download Handler for multiple items or folders
  const handleDownloadZip = useCallback(async (itemsToZip, zipFilename = `SIPTU_Drive_${Date.now()}.zip`) => {
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
      const nip = user?.nip;
      const basePrefix = `/SIPTU Drive/${nip}`;

      andMessage.loading({ content: `Menyiapkan berkas ZIP (${zipFilename})...`, key: downloadId });

      for (const item of itemsToZip) {
        if (item.is_dir) {
          let relPath = item.path;
          if (relPath.startsWith(basePrefix)) {
            relPath = relPath.substring(basePrefix.length);
          }
          const folderZip = zip.folder(item.name);
          await addFolderToZip(zip, relPath, folderZip);
        } else {
          const fileRes = await apiFetch(`/nextcloud/download?path=${encodeURIComponent(item.path)}`);
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
        const p = Math.round(85 + (metadata.percent * 0.15));
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
  }, [addFolderToZip, apiFetch, user]);

  // Secure download for single file or folder ZIP
  const handleDownload = useCallback((file) => {
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
  }, [handleDownloadZip]);

  const [previewImage, setPreviewImage] = useState(null);

  const handlePreviewImage = useCallback(async (file) => {
    const key = `preview-img-${file.name}`;
    try {
      andMessage.loading({ content: `Memuat foto ${file.name}...`, key });
      const response = await apiFetch(`/nextcloud/download?path=${encodeURIComponent(file.path)}&inline=1`);
      if (!response.ok) throw new Error("Gagal memuat foto dari SIPTU Drive.");

      const blob = await response.blob();
      const ext = file.name.split(".").pop().toLowerCase();
      const mimeMap = {
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        webp: "image/webp",
        gif: "image/gif",
        svg: "image/svg+xml",
        bmp: "image/bmp",
        ico: "image/x-icon",
      };
      const mimeType = mimeMap[ext] || blob.type || "image/png";
      const imageBlob = new Blob([blob], { type: mimeType });
      const imgUrl = window.URL.createObjectURL(imageBlob);
      setPreviewImage({ src: imgUrl, title: file.name });
      andMessage.success({ content: "Foto siap dipreview.", key });
    } catch (err) {
      andMessage.error({ content: err.message, key });
    }
  }, [apiFetch]);

  const handlePreviewPdf = useCallback(async (file) => {
    const key = `preview-${file.name}`;
    try {
      andMessage.loading({ content: `Menyiapkan pratinjau ${file.name}...`, key });
      const response = await apiFetch(`/nextcloud/download?path=${encodeURIComponent(file.path)}`);
      if (!response.ok) throw new Error("Gagal mengunduh berkas dari Nextcloud.");

      const blob = await response.blob();
      const pdfBlob = new Blob([blob], { type: "application/pdf" });
      const url = window.URL.createObjectURL(pdfBlob);
      window.open(url, "_blank");

      andMessage.success({ content: "Pratinjau PDF siap.", key });
    } catch (err) {
      andMessage.error({ content: err.message, key });
    }
  }, [apiFetch]);

  // Traverses HTML5 webkitGetAsEntry FileSystem items recursively (Folders & Files)
  const getAllDropEntries = async (dataTransferItems) => {
    const fileEntries = [];
    const folderPaths = new Set();

    const readEntry = async (entry, relativePath = "") => {
      if (entry.isFile) {
        return new Promise((resolve) => {
          entry.file(
            (file) => {
              file.folderPath = relativePath;
              file.fullRelativePath = relativePath ? `${relativePath}/${file.name}` : file.name;
              fileEntries.push(file);
              resolve();
            },
            (err) => {
              console.warn("File read error:", err);
              resolve();
            }
          );
        });
      } else if (entry.isDirectory) {
        const currentDirPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
        folderPaths.add(currentDirPath);
        const dirReader = entry.createReader();

        const readAllEntriesInDir = async () => {
          return new Promise((resolve) => {
            dirReader.readEntries(async (entries) => {
              if (entries.length === 0) {
                resolve();
              } else {
                for (const childEntry of entries) {
                  await readEntry(childEntry, currentDirPath);
                }
                await readAllEntriesInDir();
                resolve();
              }
            }, (err) => {
              console.warn("Directory read error:", err);
              resolve();
            });
          });
        };

        await readAllEntriesInDir();
      }
    };

    const initialEntries = [];
    for (let i = 0; i < dataTransferItems.length; i++) {
      const item = dataTransferItems[i];
      if (item.kind === "file") {
        const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : (item.getAsEntry ? item.getAsEntry() : null);
        if (entry) {
          initialEntries.push(entry);
        }
      }
    }

    for (const entry of initialEntries) {
      await readEntry(entry, "");
    }

    return { fileEntries, folderPaths: Array.from(folderPaths) };
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
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDraggingOverPage(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverPage(false);
    dragCounter.current = 0;

    const nip = user?.nip;
    if (!nip) {
      andMessage.warning("NIP pengguna tidak ditemukan.");
      return;
    }

    const items = e.dataTransfer?.items;
    if (items && items.length > 0) {
      try {
        const { fileEntries, folderPaths } = await getAllDropEntries(items);

        if (fileEntries.length === 0 && folderPaths.length === 0) {
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const filesList = Array.from(e.dataTransfer.files);
            filesList.forEach((rawFile) => {
              handleCustomUpload({ file: rawFile });
            });
          }
          return;
        }

        if (folderPaths.length > 0) {
          andMessage.loading({ content: `Memproses ${folderPaths.length} folder dan ${fileEntries.length} berkas...`, key: "folder-drop-process", duration: 3 });
        }

        // 1. Ensure/create folder structure on backend
        for (const folderRelPath of folderPaths) {
          try {
            const parts = folderRelPath.split("/");
            const folderName = parts.pop();
            const parentRelPath = parts.join("/");
            let parentFullPath = currentPath;
            if (parentRelPath) {
              parentFullPath = currentPath
                ? `${currentPath.replace(/\/+$/, "")}/${parentRelPath}`
                : `/${parentRelPath}`;
            }

            await apiFetch("/nextcloud/folder", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                nip,
                path: parentFullPath,
                folder_name: folderName,
              }),
            });
          } catch (err) {
            console.warn("Folder pre-create notice:", err);
          }
        }

        // 2. Upload all files maintaining their folder path
        for (const fileObj of fileEntries) {
          let uploadTargetPath = currentPath;
          if (fileObj.folderPath) {
            uploadTargetPath = currentPath
              ? `${currentPath.replace(/\/+$/, "")}/${fileObj.folderPath}`
              : `/${fileObj.folderPath}`;
          }
          handleCustomUpload({ file: fileObj, targetPath: uploadTargetPath });
        }

        if (folderPaths.length > 0) {
          andMessage.success({ content: `Struktur folder berhasil dibuat & pengunggahan berkas dimulai!`, key: "folder-drop-process", duration: 4 });
        }

      } catch (err) {
        console.error("Drop folder error:", err);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const filesList = Array.from(e.dataTransfer.files);
          filesList.forEach((rawFile) => {
            handleCustomUpload({ file: rawFile });
          });
        }
      }
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesList = Array.from(e.dataTransfer.files);
      filesList.forEach((rawFile) => {
        handleCustomUpload({ file: rawFile });
      });
    }
  };

  // Secure delete modal trigger
  const handleDelete = useCallback((file) => {
    setDeleteTargetItems([file]);
    setIsDeleteModalOpen(true);
  }, []);

  const handleBatchDelete = () => {
    const itemsToDelete = filteredFiles.filter((f) => selectedRowKeys.includes(f.path));
    if (itemsToDelete.length === 0) return;
    setDeleteTargetItems(itemsToDelete);
    setIsDeleteModalOpen(true);
  };

  // Execute deletion process with eye-catching progress widget
  const executeDeleteProcess = async () => {
    if (deleteTargetItems.length === 0) return;
    setDeletingItems(true);
    setIsDeleteModalOpen(false);

    const total = deleteTargetItems.length;
    setDeleteProgress({
      visible: true,
      total,
      current: 0,
      currentItemName: deleteTargetItems[0]?.name || "",
      status: "deleting",
    });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < total; i++) {
      const item = deleteTargetItems[i];
      setDeleteProgress({
        visible: true,
        total,
        current: i + 1,
        currentItemName: item.name,
        status: "deleting",
      });

      try {
        const response = await apiFetch(`/nextcloud/delete?path=${encodeURIComponent(item.path)}`, {
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
    }

    if (failCount === 0) {
      setDeleteProgress({
        visible: true,
        total,
        current: total,
        currentItemName: `✓ ${successCount} item berhasil dihapus!`,
        status: "success",
      });
      andMessage.success(`${successCount} item berhasil dihapus.`);
    } else {
      setDeleteProgress({
        visible: true,
        total,
        current: total,
        currentItemName: `Berhasil menghapus ${successCount} item. ${failCount} item gagal.`,
        status: "error",
      });
    }

    setDeletingItems(false);
    setDeleteTargetItems([]);
    setSelectedRowKeys([]);
    fetchFiles();

    setTimeout(() => {
      setDeleteProgress(null);
    }, 3500);
  };

  // Batch Download as ZIP for multiple files or folders
  const handleBatchDownload = () => {
    const itemsToDownload = filteredFiles.filter((f) => selectedRowKeys.includes(f.path));

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
  };

  // Share link settings modal triggers
  const openShareModal = useCallback(async (file) => {
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
  }, [apiFetch]);

  // Rename modal triggers
  const openRenameModal = useCallback((file) => {
    setRenameTargetFile(file);
    setNewRenameName(file.name);
    setIsRenameModalOpen(true);
  }, []);

  const handleExecuteRename = async () => {
    if (!renameTargetFile || !newRenameName.trim()) return;
    if (newRenameName.trim() === renameTargetFile.name) {
      setIsRenameModalOpen(false);
      return;
    }

    const nip = user?.nip;
    if (!nip) return;

    try {
      setRenamingFile(true);
      const key = `rename-${renameTargetFile.name}`;
      andMessage.loading({ content: "Mengganti nama...", key });

      const sourcePath = renameTargetFile.path;
      const pathParts = sourcePath.split("/");
      pathParts.pop(); // remove old filename
      const parentPath = pathParts.join("/");
      const destPath = `${parentPath}/${newRenameName.trim()}`;

      const response = await apiFetch("/nextcloud/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_path: sourcePath,
          dest_path: destPath,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Gagal mengganti nama.");
      }

      andMessage.success({ content: `Nama berhasil diubah menjadi "${newRenameName.trim()}".`, key, duration: 3 });
      setIsRenameModalOpen(false);
      setRenameTargetFile(null);
      setNewRenameName("");
      fetchFiles();
    } catch (err) {
      andMessage.error({ content: err.message, key: `rename-${renameTargetFile.name}` });
    } finally {
      setRenamingFile(false);
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

  // Direct same-directory copy handler with automatic " Copy" suffix
  const handleDirectCopy = async (file) => {
    if (!file) return;
    const nip = user?.nip;
    if (!nip) return;

    const key = `copy-${file.name}`;
    try {
      andMessage.loading({ content: `Menyalin "${file.name}"...`, key });

      const sourcePath = file.path;
      const pathParts = sourcePath.split("/");
      const oldName = pathParts.pop();
      const parentPath = pathParts.join("/");

      // Generate base copy name
      let baseName = oldName;
      let extension = "";
      if (!file.is_dir) {
        const lastDotIndex = oldName.lastIndexOf(".");
        if (lastDotIndex > 0) {
          baseName = oldName.substring(0, lastDotIndex);
          extension = oldName.substring(lastDotIndex);
        }
      }

      // Check current files in directory to avoid collisions
      const existingNames = new Set(files.map((f) => f.name.toLowerCase()));
      let finalName = `${baseName} Copy${extension}`;
      let counter = 2;
      while (existingNames.has(finalName.toLowerCase())) {
        finalName = `${baseName} Copy ${counter}${extension}`;
        counter++;
      }

      const destPath = `${parentPath}/${finalName}`;

      const response = await apiFetch("/nextcloud/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_path: sourcePath,
          dest_path: destPath,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Gagal menyalin berkas.");
      }

      andMessage.success({
        content: `"${file.name}" berhasil disalin menjadi "${finalName}".`,
        key,
        duration: 3,
      });
      fetchFiles();
    } catch (err) {
      andMessage.error({ content: err.message, key });
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
    const nip = user?.nip;
    if (!nip) return;
    try {
      setLoadingSelectorFolders(true);
      const url = `/nextcloud/files?nip=${nip}&path=${encodeURIComponent(selectorPath)}`;
      const response = await apiFetch(url);
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
  }, [user, apiFetch, selectorPath, selectorSourceFile]);

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
    const nip = user?.nip;
    if (!nip) return;
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
    if (!newFolderName.trim()) return;
    const nip = user?.nip;
    if (!nip) {
      andMessage.warning("NIP pengguna tidak ditemukan.");
      return;
    }

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

  // Upload handler with real-time XHR progress supporting multiple files & targetPath for folder uploads
  const handleCustomUpload = async ({ file, targetPath }) => {
    const nip = user?.nip;
    if (!nip) {
      andMessage.warning("NIP pengguna tidak ditemukan.");
      return;
    }

    const uploadPath = targetPath !== undefined ? targetPath : currentPath;
    const fileUid = file.uid || `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const displayName = file.fullRelativePath || file.name;

    setIsUploadWidgetVisible(true);
    setIsUploadWidgetMinimized(false);

    setUploadingFiles((prev) => ({
      ...prev,
      [fileUid]: {
        uid: fileUid,
        name: displayName,
        size: file.size,
        progress: 0,
        status: "uploading",
      },
    }));

    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", uploadPath);
    formData.append("nip", nip);

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

  // Upload whole folder via directory file picker
  const handleFolderSelectUpload = (e) => {
    const filesList = Array.from(e.target.files || []);
    if (filesList.length === 0) return;

    andMessage.loading({ content: `Memproses ${filesList.length} berkas folder...`, key: "folder-upload-process", duration: 3 });

    filesList.forEach((fileObj) => {
      const relativePath = fileObj.webkitRelativePath || "";
      let folderPath = "";
      if (relativePath) {
        const parts = relativePath.split("/");
        parts.pop();
        folderPath = parts.join("/");
      }

      let uploadTargetPath = currentPath;
      if (folderPath) {
        uploadTargetPath = currentPath
          ? `${currentPath.replace(/\/+$/, "")}/${folderPath}`
          : `/${folderPath}`;
      }

      fileObj.fullRelativePath = relativePath || fileObj.name;
      handleCustomUpload({ file: fileObj, targetPath: uploadTargetPath });
    });

    e.target.value = "";
  };

  // Filter & Sort files
  const filteredFiles = useMemo(() => {
    let list = searchQuery.trim() ? searchResults : files;

    // Filter by type
    if (filterType !== "all") {
      list = list.filter((f) => {
        if (filterType === "folder") return f.is_dir;
        if (f.is_dir) return false;
        const ext = f.name ? f.name.split(".").pop().toLowerCase() : "";
        if (filterType === "pdf") return ext === "pdf";
        if (filterType === "document") return ["docx", "doc", "xlsx", "xls", "pptx", "ppt", "csv", "txt"].includes(ext);
        if (filterType === "image") return ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext);
        if (filterType === "archive") return ["zip", "rar", "7z", "tar", "gz"].includes(ext);
        return true;
      });
    }

    // Sort: Folders grouped first, then items sorted by sortField and sortOrder
    return [...list].sort((a, b) => {
      if (a.is_dir && !b.is_dir) return -1;
      if (!a.is_dir && b.is_dir) return 1;

      let comparison = 0;
      if (sortField === "name") {
        comparison = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
      } else if (sortField === "size") {
        const sizeA = a.size || 0;
        const sizeB = b.size || 0;
        comparison = sizeA - sizeB;
      } else if (sortField === "last_modified") {
        const dateA = a.last_modified ? new Date(a.last_modified).getTime() : 0;
        const dateB = b.last_modified ? new Date(b.last_modified).getTime() : 0;
        comparison = dateA - dateB;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [files, searchQuery, searchResults, filterType, sortField, sortOrder]);

  // Separate Folders and Files
  const folderItems = useMemo(() => filteredFiles.filter((f) => f.is_dir), [filteredFiles]);
  const fileItems = useMemo(() => filteredFiles.filter((f) => !f.is_dir), [filteredFiles]);

  // Stats calculation
  const folderCount = useMemo(() => files.filter((f) => f.is_dir).length, [files]);
  const fileCount = useMemo(() => files.filter((f) => !f.is_dir).length, [files]);
  const totalSize = useMemo(() => {
    return files.reduce((acc, curr) => acc + (curr.size || 0), 0);
  }, [files]);

  // Quota
  const quotaBytes = 10 * 1024 * 1024 * 1024;
  const usedPercent = useMemo(() => {
    return Math.min(Math.round((totalSize / quotaBytes) * 100), 100);
  }, [totalSize, quotaBytes]);

  // Action Menu items for "+ Baru" button
  const newButtonItems = useMemo(() => {
    return [
      {
        key: "upload-file",
        label: "Upload Berkas",
        icon: <UploadOutlined />,
        onClick: () => setIsUploadModalOpen(true),
      },
      {
        key: "upload-folder",
        label: "Upload Folder",
        icon: <FolderAddOutlined style={{ color: "#fa8c16" }} />,
        onClick: () => {
          if (folderInputRef.current) {
            folderInputRef.current.click();
          }
        },
      },
      {
        key: "create_folder",
        label: "Folder Baru",
        icon: <PlusOutlined style={{ color: "#2563eb" }} />,
        onClick: () => setIsFolderModalOpen(true),
      },
    ];
  }, []);

  // Centralized helper function for Right-Click Context Menu items
  const getFileMenuItems = useCallback(
    (file) => {
      if (!file) return [];

      const isImage = isImageFile(file.name);
      const isDoc = isDocViewable(file.name);
      const isPdf = file.name ? file.name.toLowerCase().endsWith(".pdf") : false;

      return [
        {
          key: "share",
          label: "Pengaturan Bagikan",
          icon: <LinkOutlined style={{ color: "#1a73e8" }} />,
          onClick: () => openShareModal(file),
        },
        {
          key: "rename",
          label: "Ganti Nama",
          icon: <EditOutlined style={{ color: "#fa8c16" }} />,
          onClick: () => openRenameModal(file),
        },
        {
          key: "copy",
          label: file.is_dir ? "Salin Folder" : "Salin Berkas",
          icon: <CopyOutlined style={{ color: "#0F5B99" }} />,
          onClick: () => handleDirectCopy(file),
        },
        {
          key: "move",
          label: "Pindahkan",
          icon: <FolderOpenOutlined style={{ color: "#722ed1" }} />,
          onClick: () => openSelectorModal(file, "move"),
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
        { type: "divider" },
        {
          key: "delete",
          label: "Hapus",
          danger: true,
          icon: <DeleteOutlined />,
          onClick: () => handleDelete(file),
        },
      ];
    },
    [handleDelete, handleDownload, handlePreviewImage, handlePreviewPdf, openRenameModal, openSelectorModal, openShareModal, handleDirectCopy]
  );

  // Handle Table Column Sort Click
  const handleSortClick = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const renderSortableTitle = (label, field) => {
    const isActive = sortField === field;
    return (
      <div
        className={`drive-table-sort-col ${isActive ? "drive-table-sort-col--active" : ""}`}
        onClick={() => handleSortClick(field)}
        title={`Klik untuk mengurutkan berdasarkan ${label} (${isActive && sortOrder === "asc" ? "Z ke A / Terbesar ke Terkecil" : "A ke Z / Terkecil ke Terbesar"})`}
      >
        <span className="drive-table-sort-col__text">{label}</span>
        <span className="drive-table-sort-col__icons">
          {isActive ? (
            sortOrder === "asc" ? (
              <ArrowUpOutlined className="drive-table-sort-icon is-active" />
            ) : (
              <ArrowDownOutlined className="drive-table-sort-icon is-active" />
            )
          ) : (
            <span className="drive-table-sort-duo">
              <ArrowUpOutlined className="drive-table-sort-icon is-dimmed" />
              <ArrowDownOutlined className="drive-table-sort-icon is-dimmed" />
            </span>
          )}
        </span>
      </div>
    );
  };

  // List View columns
  const columns = useMemo(() => [
    {
      title: renderSortableTitle("Nama", "name"),
      dataIndex: "name",
      key: "name",
      render: (text, record) => (
        <Dropdown menu={{ items: getFileMenuItems(record) }} trigger={["contextMenu"]}>
          <Space size="middle" style={{ width: "100%" }}>
            <div style={{ position: "relative", display: "inline-block", height: "24px" }}>
              {getFileIcon(record)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              {record.is_dir ? (
                <Button
                  type="link"
                  onClick={() => handleFolderOpen(record)}
                  className="list-folder-link"
                  style={{ padding: 0, height: "auto", textAlign: "left" }}
                >
                  {text}
                </Button>
              ) : (
                <Text
                  strong
                  className="list-file-text"
                  style={{
                    cursor:
                      isImageFile(record.name) || isDocViewable(record.name) || (record.name && record.name.toLowerCase().endsWith(".pdf"))
                        ? "pointer"
                        : "default",
                  }}
                  onClick={() => {
                    if (isImageFile(record.name)) {
                      handlePreviewImage(record);
                    } else if (isDocViewable(record.name)) {
                      setDocViewFile(record);
                    } else if (record.name && record.name.toLowerCase().endsWith(".pdf")) {
                      handlePreviewPdf(record);
                    }
                  }}
                >
                  {text}
                </Text>
              )}
              {record.is_shared && (
                <Tag color="blue" icon={<LinkOutlined />} style={{ borderRadius: 6, fontSize: 10, lineHeight: "18px", padding: "0 6px", margin: 0 }}>
                  Publik
                </Tag>
              )}
              {searchQuery && record.display_path && (
                <Text type="secondary" style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                  📂 {record.display_path}
                </Text>
              )}
            </div>
          </Space>
        </Dropdown>
      ),
    },
    {
      title: renderSortableTitle("Ukuran", "size"),
      dataIndex: "size",
      key: "size",
      width: 140,
      render: (size, record) => (
        <Text style={{ fontWeight: record.is_dir ? 600 : 400, color: record.is_dir ? "#0f5b99" : "inherit" }}>
          {formatBytes(size)}
        </Text>
      ),
    },
    {
      title: renderSortableTitle("Terakhir Diubah", "last_modified"),
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
          <Tooltip title="Pengaturan Bagikan">
            <Button
              type="text"
              shape="circle"
              icon={<LinkOutlined style={{ color: file.is_shared ? "#1a73e8" : "#5f6368" }} />}
              onClick={() => openShareModal(file)}
            />
          </Tooltip>
          {isImageFile(file.name) && (
            <Tooltip title="Pratinjau Foto">
              <Button
                type="text"
                shape="circle"
                icon={<PictureOutlined style={{ color: "#52c41a" }} />}
                onClick={() => handlePreviewImage(file)}
              />
            </Tooltip>
          )}
          {isDocViewable(file.name) && (
            <Tooltip title="Pratinjau Dokumen">
              <Button
                type="text"
                shape="circle"
                icon={<EyeOutlined style={{ color: "#1890ff" }} />}
                onClick={() => setDocViewFile(file)}
              />
            </Tooltip>
          )}
          {file.name && file.name.toLowerCase().endsWith(".pdf") && (
            <Tooltip title="Pratinjau PDF">
              <Button
                type="text"
                shape="circle"
                icon={<SearchOutlined style={{ color: "#fa8c16" }} />}
                onClick={() => handlePreviewPdf(file)}
              />
            </Tooltip>
          )}
          <Tooltip title={file.is_dir ? "Unduh Folder (ZIP)" : "Unduh Berkas"}>
            <Button
              type="text"
              shape="circle"
              icon={<DownloadOutlined style={{ color: "var(--color-primary)" }} />}
              onClick={() => handleDownload(file)}
            />
          </Tooltip>
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
  ], [sortField, sortOrder, getFileMenuItems, searchQuery]);

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
        {true && (
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
              disabled={loadingFiles}
              className="drive-search-input"
            />
          </div>
          <div className="drive-header-right">
            <Popover
              content={
                <div style={{ width: 320, maxHeight: 380, overflowY: "auto" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid #f0f0f0" }}>
                    <Text strong>Rekapan Aktivitas Upload</Text>
                    {Object.keys(uploadingFiles).length > 0 && (
                      <Button
                        type="link"
                        size="small"
                        onClick={() => setUploadingFiles({})}
                        style={{ padding: 0 }}
                      >
                        Bersihkan
                      </Button>
                    )}
                  </div>
                  {Object.keys(uploadingFiles).length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Belum ada rekapan upload" />
                  ) : (
                    <List
                      size="small"
                      dataSource={Object.values(uploadingFiles)}
                      renderItem={(item) => (
                        <List.Item key={item.uid} style={{ padding: "8px 0" }}>
                          <List.Item.Meta
                            avatar={getFileIcon(item)}
                            title={
                              <Text style={{ fontSize: 13 }} ellipsis title={item.name}>
                                {item.name}
                              </Text>
                            }
                            description={
                              <div style={{ fontSize: 11 }}>
                                {item.status === "uploading" && (
                                  <Progress percent={item.progress} size="small" status="active" />
                                )}
                                {item.status === "success" && (
                                  <Text type="success">✓ Berhasil diunggah ({formatBytes(item.size)})</Text>
                                )}
                                {item.status === "error" && (
                                  <Text type="danger">✕ Gagal: {item.errorMessage}</Text>
                                )}
                              </div>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  )}
                </div>
              }
              title={null}
              trigger="click"
              placement="bottomRight"
            >
              <Tooltip title="Rekapan Notifikasi Upload">
                <Badge count={Object.keys(uploadingFiles).length} overflowCount={99} offset={[-4, 4]}>
                  <Button
                    type="text"
                    shape="circle"
                    icon={<BellOutlined style={{ fontSize: 18, color: Object.keys(uploadingFiles).length > 0 ? "#1a73e8" : "#5f6368" }} />}
                    className="drive-header-icon-btn"
                  />
                </Badge>
              </Tooltip>
            </Popover>
            <Button
              type="text"
              shape="circle"
              icon={<ReloadOutlined />}
              onClick={fetchFiles}
              disabled={loadingFiles}
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
                >
                  Unduh Terpilih {selectedRowKeys.length > 1 ? "(ZIP)" : ""}
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
          
          {/* Breadcrumbs, Filter, Sorting & Layout Switcher toolbar */}
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

            <div className="drive-toolbar-controls">
              {/* Filter Tipe Berkas */}
              <Select
                value={filterType}
                onChange={setFilterType}
                className="drive-filter-select"
                size="middle"
                style={{ width: 160 }}
                options={[
                  { value: "all", label: "Semua Tipe" },
                  { value: "folder", label: "Hanya Folder" },
                  { value: "document", label: "Dokumen Office" },
                  { value: "pdf", label: "Dokumen PDF" },
                  { value: "image", label: "Gambar / Foto" },
                  { value: "archive", label: "Arsip (ZIP/RAR)" },
                ]}
              />

              {/* Toggle Sort Panah Atas (A-Z) / Panah Bawah (Z-A) */}
              <Tooltip title={sortOrder === "asc" ? "Urutan: A ke Z (Klik untuk ubah Z ke A)" : "Urutan: Z ke A (Klik untuk ubah A ke Z)"}>
                <Button
                  className={`drive-sort-toggle-btn ${sortOrder === "desc" ? "is-desc" : ""}`}
                  icon={sortOrder === "asc" ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                  onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                >
                  {sortOrder === "asc" ? "A - Z" : "Z - A"}
                </Button>
              </Tooltip>

              {/* View Mode Switcher */}
              <Radio.Group
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
                className="view-toggle"
              >
                <Radio.Button value="grid" title="Tampilan Kisi (Grid)"><AppstoreOutlined /></Radio.Button>
                <Radio.Button value="list" title="Tampilan Daftar (List)"><UnorderedListOutlined /></Radio.Button>
              </Radio.Group>
            </div>
          </div>

          {/* Clean Status & Path Bar without heavy background fills or icons */}
          <div className="drive-clean-status-bar">
            <div className="drive-status-path">
              <span className="drive-status-path__label">Path:</span>
              <span className="drive-status-path__value">SIPTU Drive/{user?.nip}{currentPath || "/"}</span>
            </div>

            <div className="drive-status-metrics">
              <span className="drive-metric-item">{folderCount} folder</span>
              <span className="drive-metric-separator">•</span>
              <span className="drive-metric-item">{fileCount} berkas</span>
              <span className="drive-metric-separator">•</span>
              <span className="drive-metric-item drive-metric-item--size">Total Ukuran: {formatBytes(totalSize)}</span>
            </div>
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
              description="Folder ini masih kosong."
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
                        <Dropdown key={idx} menu={{ items: getFileMenuItems(folder) }} trigger={["contextMenu"]}>
                          <div
                            className={`drive-folder-chip ${isFolderSelected ? "selected" : ""}`}
                            onClick={() => handleFolderOpen(folder)}
                            onDoubleClick={() => handleFolderOpen(folder)}
                            style={{ cursor: "pointer" }}
                          >
                            <div className="grid-item-checkbox" onClick={(e) => e.stopPropagation()}>
                              <Checkbox 
                                checked={isFolderSelected} 
                                onChange={handleToggleSelect}
                              />
                            </div>
                            <FolderFilled className="drive-folder-chip-icon" />
                            <span className="drive-folder-chip-name" title={folder.name}>
                              {folder.name}
                            </span>
                            {folder.is_shared && (
                              <Tooltip title="Folder ini dibagikan secara publik">
                                <Tag color="blue" icon={<LinkOutlined />} style={{ borderRadius: 6, fontSize: 10, padding: "0 6px", margin: 0, height: 20, lineHeight: "18px", whiteSpace: "nowrap", flexShrink: 0 }}>
                                  Publik
                                </Tag>
                              </Tooltip>
                            )}
                            <div className="drive-folder-chip-actions" onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
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

                      const handleOpenFileOrPreview = () => {
                        if (isImageFile(file.name)) {
                          handlePreviewImage(file);
                        } else if (file.name && file.name.toLowerCase().endsWith(".pdf")) {
                          handlePreviewPdf(file);
                        } else if (isDocViewable(file.name)) {
                          setDocViewFile(file);
                        } else {
                          handleDownload(file);
                        }
                      };

                      return (
                        <Dropdown key={idx} menu={{ items: getFileMenuItems(file) }} trigger={["contextMenu"]}>
                          <div 
                            className={`drive-file-card ${isFileSelected ? "selected" : ""}`}
                            onClick={handleOpenFileOrPreview}
                            onDoubleClick={handleOpenFileOrPreview}
                            style={{ cursor: "pointer", position: "relative" }}
                          >
                            {/* Sleek Top-Right Share Badge */}
                            {file.is_shared && (
                              <Tooltip title="Berkas ini dibagikan secara publik">
                                <div className="shared-badge-grid-file">
                                  <LinkOutlined style={{ fontSize: "10px", color: "#1a73e8" }} />
                                  <span>Publik</span>
                                </div>
                              </Tooltip>
                            )}

                            <div className="grid-item-checkbox" onClick={(e) => e.stopPropagation()}>
                              <Checkbox 
                                checked={isFileSelected} 
                                onChange={handleToggleSelect}
                              />
                            </div>
                            <div className="drive-file-card-preview">
                              <div className="preview-icon-wrapper" style={{ position: "relative" }}>
                                {getFileIcon(file)}
                              </div>
                              <div className="preview-extension-tag">
                                {file.name ? file.name.split(".").pop().toUpperCase() : ""}
                              </div>
                            </div>
                            <div className="drive-file-card-info">
                              <div className="drive-file-card-meta">
                                <span 
                                  className="drive-file-title" 
                                  title={file.name}
                                  style={{ cursor: "pointer" }}
                                >
                                  {file.name}
                                </span>
                                {searchQuery && file.display_path && (
                                  <span style={{ fontSize: "11px", color: "#64748b", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={`Jalur: ${file.display_path}`}>
                                    📂 {file.display_path}
                                  </span>
                                )}
                                <span className="drive-file-size">
                                  {formatBytes(file.size)}
                                </span>
                              </div>
                              <div className="drive-file-card-actions" onClick={(e) => e.stopPropagation()}>
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
                        </Dropdown>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Konfirmasi Hapus Modern */}
      <Modal
        open={isDeleteModalOpen}
        onCancel={() => {
          if (!deletingItems) {
            setIsDeleteModalOpen(false);
            setDeleteTargetItems([]);
          }
        }}
        footer={null}
        centered
        width={460}
        destroyOnClose
      >
        <div style={{ textAlign: "center", padding: "16px 8px 8px 8px" }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "#fee2e2",
            color: "#ef4444",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            marginBottom: 16,
            boxShadow: "0 4px 14px rgba(239, 68, 68, 0.2)"
          }}>
            <DeleteOutlined />
          </div>

          <Title level={4} style={{ margin: "0 0 6px 0", color: "#0f172a", fontWeight: 700 }}>
            {deleteTargetItems.length === 1
              ? `Hapus ${deleteTargetItems[0]?.is_dir ? "Folder" : "Berkas"}?`
              : `Hapus ${deleteTargetItems.length} Item Terpilih?`}
          </Title>

          {deleteTargetItems.length === 1 ? (
            <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: 12, border: "1px solid #e2e8f0", margin: "12px 0 16px 0", display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}>
              <div style={{ fontSize: 24 }}>{getFileIcon(deleteTargetItems[0])}</div>
              <div style={{ overflow: "hidden", flex: 1 }}>
                <Text strong style={{ fontSize: 13, display: "block", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", color: "#0f172a" }}>
                  {deleteTargetItems[0]?.name}
                </Text>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {deleteTargetItems[0]?.is_dir ? "Folder (Semua isi di dalamnya akan terhapus)" : formatBytes(deleteTargetItems[0]?.size)}
                </Text>
              </div>
            </div>
          ) : (
            <Text type="secondary" style={{ display: "block", marginBottom: 16, fontSize: 13, color: "#475569" }}>
              Apakah Anda yakin ingin menghapus <strong style={{ color: "#ef4444" }}>{deleteTargetItems.length} item</strong> terpilih dari SIPTU Drive?
            </Text>
          )}

          <div style={{ background: "#fffbe6", border: "1px solid #ffe58f", borderRadius: 10, padding: "10px 14px", marginBottom: 20, textAlign: "left", fontSize: 12, color: "#873800", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <span>Tindakan ini permanen dan berkas yang dihapus tidak dapat dipulihkan.</span>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <Button
              size="large"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeleteTargetItems([]);
              }}
              disabled={deletingItems}
              style={{ flex: 1, borderRadius: 10, fontWeight: 600, height: 42 }}
            >
              Batal
            </Button>
            <Button
              type="primary"
              danger
              size="large"
              loading={deletingItems}
              onClick={executeDeleteProcess}
              style={{ flex: 1, borderRadius: 10, fontWeight: 600, height: 42, background: "#dc2626" }}
              icon={<DeleteOutlined />}
            >
              Ya, Hapus
            </Button>
          </div>
        </div>
      </Modal>

      {/* Floating Delete Progress Widget */}
      {deleteProgress && deleteProgress.visible && (
        <div className="drive-delete-widget">
          <div className="delete-widget-header">
            <span className="delete-widget-title">
              {deleteProgress.status === "deleting" && (
                <>
                  <LoadingOutlined style={{ color: "#ef4444" }} />
                  <span>Menghapus {deleteProgress.current}/{deleteProgress.total} item...</span>
                </>
              )}
              {deleteProgress.status === "success" && (
                <>
                  <CheckCircleFilled style={{ color: "#22c55e" }} />
                  <span style={{ color: "#15803d" }}>Penghapusan Selesai</span>
                </>
              )}
              {deleteProgress.status === "error" && (
                <>
                  <CloseCircleFilled style={{ color: "#ef4444" }} />
                  <span style={{ color: "#991b1b" }}>Status Penghapusan</span>
                </>
              )}
            </span>
          </div>
          <div className="delete-widget-body">
            <span className="delete-item-name">
              {deleteProgress.currentItemName}
            </span>
            <Progress
              percent={Math.round((deleteProgress.current / deleteProgress.total) * 100)}
              size="small"
              status={deleteProgress.status === "deleting" ? "active" : deleteProgress.status === "success" ? "success" : "exception"}
              strokeColor={deleteProgress.status === "deleting" ? "#ef4444" : undefined}
              showInfo={false}
            />
          </div>
        </div>
      )}

      {/* Modal: Ganti Nama (Rename) */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: "#fef3c7", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
              <EditOutlined />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>Ganti Nama Item</div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 400 }}>Ubah nama berkas atau folder ini</div>
            </div>
          </div>
        }
        open={isRenameModalOpen}
        onOk={handleExecuteRename}
        onCancel={() => {
          setIsRenameModalOpen(false);
          setRenameTargetFile(null);
          setNewRenameName("");
        }}
        confirmLoading={renamingFile}
        okText="Simpan Nama"
        cancelText="Batal"
        centered
        destroyOnClose
      >
        <div style={{ padding: "14px 0" }}>
          {renameTargetFile && (
            <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 20 }}>{getFileIcon(renameTargetFile)}</div>
              <Text strong style={{ fontSize: 13, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                {renameTargetFile.name}
              </Text>
            </div>
          )}
          <Text strong style={{ display: "block", marginBottom: "6px", fontSize: 13, color: "#334155" }}>
            Nama Baru:
          </Text>
          <Input
            placeholder="Masukkan nama baru"
            value={newRenameName}
            onChange={(e) => setNewRenameName(e.target.value)}
            onPressEnter={handleExecuteRename}
            style={{ borderRadius: 8, height: 38 }}
            autoFocus
          />
        </div>
      </Modal>

      {/* Modal: Pengaturan Berbagi */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#e8f0fe", color: "#1a73e8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
              <LinkOutlined />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>Pengaturan Berbagi Link</div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 400 }}>Kelola hak akses dan publikasi berkas</div>
            </div>
          </div>
        }
        open={isShareModalOpen}
        footer={null}
        onCancel={() => {
          setIsShareModalOpen(false);
          setShareFile(null);
          setShareSettings({ is_shared: false, token: "", can_edit: false });
        }}
        width={500}
        centered
        destroyOnClose
      >
        <Spin spinning={loadingShareSettings}>
          <div style={{ padding: "12px 0" }}>
            {/* Target File Info */}
            {shareFile && (
              <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 24 }}>{getFileIcon(shareFile)}</div>
                <div style={{ overflow: "hidden", flex: 1 }}>
                  <Text strong style={{ fontSize: 13.5, display: "block", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", color: "#0f172a" }}>
                    {shareFile.name}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {shareFile.is_dir ? "Folder" : formatBytes(shareFile.size)}
                  </Text>
                </div>
              </div>
            )}

            {shareSettings.is_shared ? (
              <>
                {/* Active Link Box */}
                <div style={{ marginBottom: 20 }}>
                  <Text strong style={{ display: "block", marginBottom: 6, fontSize: 13, color: "#334155" }}>
                    Link Berbagi Publik:
                  </Text>
                  <Space.Compact style={{ width: "100%" }}>
                    <Input 
                      value={`${window.location.origin}/share/${encodeURIComponent(shareSettings.token)}`} 
                      readOnly 
                      style={{ borderRadius: "8px 0 0 8px", height: 40, fontSize: 12.5 }}
                    />
                    <Button 
                      type="primary" 
                      style={{ height: 40, borderRadius: "0 8px 8px 0", background: "#1a73e8", fontWeight: 600 }}
                      icon={<LinkOutlined />}
                      onClick={async () => {
                        await navigator.clipboard.writeText(
                          `${window.location.origin}/share/${encodeURIComponent(shareSettings.token)}`
                        );
                        andMessage.success("Link berhasil disalin ke clipboard!");
                      }}
                    >
                      Salin Link
                    </Button>
                  </Space.Compact>
                </div>

                {/* Permission Radio Selector */}
                <div style={{ marginBottom: 24, background: "#f8fafc", padding: 14, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                  <div style={{ marginBottom: 10 }}>
                    <Text strong style={{ fontSize: 13, display: "block", color: "#0f172a" }}>Hak Akses Tamu Publik:</Text>
                    <Text type="secondary" style={{ fontSize: 12, color: "#64748b" }}>
                      Tentukan wewenang pengeditan bagi siapapun yang membuka link ini.
                    </Text>
                  </div>
                  <Radio.Group
                    style={{ width: "100%", display: "flex", gap: 10 }}
                    value={shareSettings.can_edit}
                    onChange={(e) => handleCreateOrUpdateShare(e.target.value)}
                  >
                    <Radio.Button 
                      value={false} 
                      style={{ flex: 1, textAlign: "center", height: 40, lineHeight: "38px", borderRadius: 8, fontWeight: 600 }}
                    >
                      👁️ Lihat Saja (Viewer)
                    </Radio.Button>
                    <Radio.Button 
                      value={true} 
                      style={{ flex: 1, textAlign: "center", height: 40, lineHeight: "38px", borderRadius: 8, fontWeight: 600 }}
                    >
                      ✏️ Bisa Edit (Editor)
                    </Radio.Button>
                  </Radio.Group>
                </div>

                <Button 
                  danger 
                  type="default"
                  onClick={handleStopSharing}
                  block
                  style={{ height: 40, borderRadius: 8, fontWeight: 600, borderColor: "#ff4d4f", color: "#ff4d4f" }}
                  icon={<DeleteOutlined />}
                >
                  Hentikan Berbagi Link
                </Button>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <Empty description="Link berbagi belum aktif untuk berkas ini." style={{ marginBottom: 16 }} />
                <Button 
                  type="primary" 
                  size="large"
                  style={{ borderRadius: 10, background: "#1a73e8", fontWeight: 600, padding: "0 24px" }}
                  icon={<LinkOutlined />}
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
                        {isDownloading && `${item.progress}% ${item.size ? `dari ${formatBytes(item.size)}` : ""}`}
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

      {/* Hidden Folder Directory Input */}
      <input
        type="file"
        ref={folderInputRef}
        webkitdirectory=""
        directory=""
        multiple
        style={{ display: "none" }}
        onChange={handleFolderSelectUpload}
      />

      {/* Full screen Drag & Drop Overlay */}
      <div
        className={`drive-drag-overlay ${isDraggingOverPage ? "active" : ""}`}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="drive-drag-overlay-content" style={{ pointerEvents: "none" }}>
          <CloudUploadOutlined className="drive-drag-overlay-icon" style={{ pointerEvents: "none" }} />
          <h3 style={{ pointerEvents: "none" }}>Lepaskan Berkas atau Folder untuk Mengunggah</h3>
          <p style={{ pointerEvents: "none" }}>SIPTU Drive otomatis membuat struktur folder & mengunggah seluruh isinya</p>
        </div>
      </div>

      {/* Apps Doc View Modal */}
      <DocViewerModal
        open={!!docViewFile}
        file={docViewFile}
        onClose={() => setDocViewFile(null)}
        apiFetch={apiFetch}
        onOpenEditor={(f) => navigate(`/app/drive/editor?path=${encodeURIComponent(f.path)}&type=${getEditableType(f.name)}`)}
        onDownload={handleDownload}
      />

      {/* Photo Previewer */}
      {previewImage && (
        <Image
          style={{ display: "none" }}
          src={previewImage.src}
          preview={{
            visible: !!previewImage,
            onVisibleChange: (visible) => !visible && setPreviewImage(null),
            src: previewImage.src,
          }}
        />
      )}
    </div>
  );
}
