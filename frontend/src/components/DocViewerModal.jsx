import { useState, useEffect } from "react";
import { Button, Spin, Tooltip, message } from "antd";
import {
  ArrowLeftOutlined,
  CloseOutlined,
  DownloadOutlined,
  ExportOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  FilePptOutlined,
  FileOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import "./DocViewerModal.css";

export default function DocViewerModal({
  open,
  file,
  onClose,
  apiFetch,
  onOpenEditor,
  onDownload,
  publicToken,
}) {
  const [loadingToken, setLoadingToken] = useState(false);
  const [loadingContent, setLoadingContent] = useState(true);
  const [shareToken, setShareToken] = useState("");

  // Office Online static URL (like SELARAS approach)
  const [officeStaticUrl, setOfficeStaticUrl] = useState("");
  const [loadingOfficePreview, setLoadingOfficePreview] = useState(false);

  // Reset all state when file changes so each document gets its own preview
  useEffect(() => {
    setOfficeStaticUrl("");
    setShareToken("");
    setLoadingContent(true);
    setLoadingToken(false);
    setLoadingOfficePreview(false);
  }, [file?.path, file?.name]);

  const ext = file?.name ? file.name.split(".").pop().toLowerCase() : "";

  // Get file badge class & icon
  const getBadgeInfo = () => {
    if (["xlsx", "xls", "csv"].includes(ext)) {
      return { className: "xlsx", label: "EXCEL", icon: <FileExcelOutlined /> };
    }
    if (["docx", "doc"].includes(ext)) {
      return { className: "docx", label: "WORD", icon: <FileWordOutlined /> };
    }
    if (["pptx", "ppt"].includes(ext)) {
      return { className: "ppt", label: "POWERPOINT", icon: <FilePptOutlined /> };
    }
    return { className: "default", label: ext.toUpperCase() || "DOC", icon: <FileOutlined /> };
  };

  // 1. Fetch share token for external viewers
  useEffect(() => {
    if (!open || !file) return;

    if (publicToken) {
      setShareToken(publicToken);
      setLoadingToken(false);
      return;
    }

    if (file.share_token) {
      setShareToken(file.share_token);
      setLoadingToken(false);
      return;
    }

    if (apiFetch && file.path) {
      const getOrGenerateToken = async () => {
        try {
          setLoadingToken(true);
          const response = await apiFetch("/nextcloud/share-settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              path: file.path,
              can_edit: false,
            }),
          });
          if (response.ok) {
            const data = await response.json();
            setShareToken(data.token);
          }
        } catch (err) {
          console.error("[DocViewerModal] Error getting token:", err);
        } finally {
          setLoadingToken(false);
        }
      };
      getOrGenerateToken();
    } else {
      setLoadingToken(false);
    }
  }, [open, file, publicToken, apiFetch]);

  // 2b. Fetch static URL for Office Online (like SELARAS approach)
  useEffect(() => {
    if (!open || !file) return;
    if (officeStaticUrl) return; // already fetched

    const token = publicToken || shareToken || file?.share_token;
    if (!token) return;

    const fetchOfficePreview = async () => {
      try {
        setLoadingOfficePreview(true);
        const baseUrlRaw = import.meta.env.VITE_API_URL || "https://siptu.bpompalopo.com/core_api/api";
        const baseUrl = baseUrlRaw.replace(/\/+$/, "");
        const body = { token };
        if (file?.path) {
          body.path = file.path.replace(/^\/+/, "");
        }
        const res = await fetch(`${baseUrl}/share/office-preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const data = await res.json();
          setOfficeStaticUrl(data.url);
        } else {
          console.error("[DocViewerModal] Office preview failed:", res.status);
          message.error("Gagal mempersiapkan file untuk Office Online.");
        }
      } catch (err) {
        console.error("[DocViewerModal] Office preview error:", err);
        message.error("Gagal mempersiapkan file untuk Office Online.");
      } finally {
        setLoadingOfficePreview(false);
      }
    };
    fetchOfficePreview();
  }, [open, file, publicToken, shareToken, officeStaticUrl]);

  // Reset loading when file changes
  useEffect(() => {
    if (!open || !file) return;
    setLoadingContent(true);
  }, [open, file]);

  if (!open || !file) return null;

  const baseUrlRaw = import.meta.env.VITE_API_URL || "https://siptu.bpompalopo.com/core_api/api";
  const baseUrl = baseUrlRaw.replace(/\/+$/, "");

  let publicFileUrl = "";
  const safeFilename = file.name ? encodeURIComponent(file.name) : "document";
  if (publicToken && file.path) {
    publicFileUrl = `${baseUrl}/share/download/${publicToken}/${safeFilename}?path=${encodeURIComponent(file.path.replace(/^\/+/, ""))}&inline=1`;
  } else if (shareToken) {
    publicFileUrl = `${baseUrl}/share/download/${shareToken}/${safeFilename}?inline=1`;
  }

  // Use static URL for Office Online if available (SELARAS approach), fallback to API URL
  const officeFileUrl = officeStaticUrl || publicFileUrl;

  // URLs for Office Viewer
  const officeEmbedUrl = officeFileUrl
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(officeFileUrl)}`
    : "";
  const officeViewUrl = officeFileUrl
    ? `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(officeFileUrl)}`
    : "";

  const badge = getBadgeInfo();

  return (
    <div className="docview-overlay">
      {/* Top Header Bar */}
      <div className="docview-header">
        <div className="docview-header-left">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={onClose}
            className="docview-back-btn"
            title="Kembali"
          />
          <div className={`docview-file-badge ${badge.className}`}>
            {badge.label}
          </div>
          <span className="docview-title" title={file.name}>
            {file.name}
          </span>
          <span className="docview-app-tag">apps doc view</span>
        </div>

        {/* Header Center - Microsoft Office View label */}
        <div className="docview-header-center">
          <span style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, letterSpacing: 0.5 }}>
            📄 Microsoft Office View
          </span>
        </div>

        {/* Right Actions — only Buka Office Online + Unduh */}
        <div className="docview-header-right">
          {(publicFileUrl || officeStaticUrl) && (
            <Tooltip title="Buka berkas di halaman penuh Microsoft Office Web App">
              <Button
                type="primary"
                style={{ background: "#107c41", borderColor: "#107c41", fontWeight: 700 }}
                icon={<ExportOutlined />}
                loading={loadingOfficePreview}
                onClick={async () => {
                  if (officeStaticUrl) {
                    window.open(officeViewUrl, "_blank");
                    return;
                  }
                  try {
                    const token = publicToken || shareToken || file?.share_token;
                    const body = { token };
                    if (file?.path) {
                      body.path = file.path.replace(/^\/+/, "");
                    }
                    const res = await fetch(`${baseUrl}/share/office-preview`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(body),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      setOfficeStaticUrl(data.url);
                      const viewUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(data.url)}`;
                      window.open(viewUrl, "_blank");
                    } else {
                      message.error("Gagal mempersiapkan file untuk Office Online.");
                    }
                  } catch (err) {
                    console.error(err);
                    message.error("Gagal mempersiapkan file untuk Office Online.");
                  }
                }}
              >
                Buka Office Online
              </Button>
            </Tooltip>
          )}

          {onDownload && (
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={() => onDownload(file)}
            >
              Unduh
            </Button>
          )}

          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={onClose}
            className="docview-close-btn"
            title="Tutup"
          />
        </div>
      </div>

      {/* Main Body — Office Online embed only */}
      <div className="docview-body">
        {(loadingToken || loadingContent || loadingOfficePreview) && (
          <div className="docview-loading-overlay">
            <Spin indicator={<LoadingOutlined style={{ fontSize: 36, color: "#3b82f6" }} spin />} />
            <span className="docview-loading-text">
              {loadingToken
                ? "Menyiapkan tautan dokumen..."
                : loadingOfficePreview
                ? "Mempersiapkan file untuk Office Online..."
                : `Memuat ${file.name} menggunakan Microsoft Office View...`}
            </span>
          </div>
        )}

        {officeEmbedUrl && (
          <iframe
            key={officeEmbedUrl}
            src={officeEmbedUrl}
            title={`Apps Doc View - ${file.name}`}
            className="docview-iframe"
            onLoad={() => setLoadingContent(false)}
          />
        )}

        {/* Footer Info Banner */}
        <div className="docview-footer-info" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
          <span>
            💡 <strong>Apps Doc View:</strong> Menggunakan <strong>Microsoft Office Web Apps</strong> untuk menampilkan berkas.
          </span>
        </div>
      </div>
    </div>
  );
}
