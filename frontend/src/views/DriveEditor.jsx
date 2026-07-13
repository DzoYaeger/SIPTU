import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button, Space, Spin, Typography, message } from "antd";
import { SaveOutlined, ArrowLeftOutlined, LoadingOutlined } from "@ant-design/icons";
import { useAuth } from "../hooks/useAuth.js";
import ExcelJS from "exceljs";
import mammoth from "mammoth";
import "./DriveEditor.css";

const { Title } = Typography;

export default function DriveEditor() {
  const { apiFetch } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const filePath = searchParams.get("path");
  const fileType = searchParams.get("type"); // xlsx or docx

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fileName, setFileName] = useState("");
  const [editorReady, setEditorReady] = useState(false);

  const editorRef = useRef(null);       // Canvas-Editor instance
  const containerRef = useRef(null);    // Canvas-Editor DOM container
  const blobRef = useRef(null);         // Stores fetched blob for deferred init
  const initCalledRef = useRef(false);  // Prevent double init

  // ──────────────────────────────────────
  // 1. Fetch the file blob from Nextcloud
  // ──────────────────────────────────────
  useEffect(() => {
    if (!filePath || !fileType) {
      message.error("Parameter berkas tidak valid.");
      navigate("/app/penyimpanan-cloud");
      return;
    }

    setFileName(filePath.split("/").pop());

    const fetchFile = async () => {
      try {
        setLoading(true);
        const response = await apiFetch(`/nextcloud/download?path=${encodeURIComponent(filePath)}`);
        if (!response.ok) throw new Error("Gagal mengunduh berkas dari Nextcloud.");

        const blob = await response.blob();
        blobRef.current = blob;
      } catch (err) {
        message.error(err.message);
        navigate("/app/penyimpanan-cloud");
      } finally {
        setLoading(false);
      }
    };

    fetchFile();

    return () => {
      // Cleanup Luckysheet on unmount
      if (window.luckysheet) {
        try { window.luckysheet.destroy(); } catch (_) {}
      }
    };
  }, [filePath, fileType]);

  // ──────────────────────────────────────
  // 2. Init editor AFTER loading=false && DOM exists && blob ready
  // ──────────────────────────────────────
  useEffect(() => {
    if (loading || !blobRef.current || initCalledRef.current) return;

    // Use requestAnimationFrame to guarantee the DOM container is painted
    const raf = requestAnimationFrame(() => {
      initCalledRef.current = true;

      if (fileType === "xlsx") {
        initLuckysheet(blobRef.current);
      } else if (fileType === "docx") {
        initCanvasEditor(blobRef.current);
      }
    });

    return () => cancelAnimationFrame(raf);
  }, [loading, fileType]);


  // ──────────────────────────────────────
  // 3A. Initialize Luckysheet (Excel)
  // ──────────────────────────────────────
  const initLuckysheet = (blob) => {
    if (!window.LuckyExcel) {
      console.error("[DriveEditor] window.LuckyExcel is undefined. CDN may have failed to load.");
      message.error("Library LuckyExcel tidak terload. Periksa koneksi internet lalu muat ulang halaman.");
      return;
    }
    if (!window.luckysheet) {
      console.error("[DriveEditor] window.luckysheet is undefined. CDN may have failed to load.");
      message.error("Library Luckysheet tidak terload. Periksa koneksi internet lalu muat ulang halaman.");
      return;
    }

    // LuckyExcel needs a File object, not raw Blob
    const file = new File([blob], fileName, {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    try {
      window.LuckyExcel.transformExcelToLucky(file, (exportJson) => {
        if (!exportJson || !exportJson.sheets || exportJson.sheets.length === 0) {
          console.error("[DriveEditor] LuckyExcel export result is empty:", exportJson);
          message.error("Gagal mengonversi berkas Excel. Berkas mungkin rusak atau kosong.");
          return;
        }

        const container = document.getElementById("luckysheet-editor-container");
        if (!container) {
          console.error("[DriveEditor] DOM container #luckysheet-editor-container not found.");
          message.error("Kontainer editor tidak ditemukan.");
          return;
        }

        // Destroy existing instance if any
        try { window.luckysheet.destroy(); } catch (_) {}

        window.luckysheet.create({
          container: "luckysheet-editor-container",
          data: exportJson.sheets,
          title: exportJson.info?.name || fileName,
          lang: "en",
          showinfobar: false,
          allowUpdate: false,
        });

        setTimeout(() => {
          if (window.luckysheet) {
            window.luckysheet.resize();
          }
        }, 150);

        console.log("[DriveEditor] Luckysheet created successfully with", exportJson.sheets.length, "sheet(s).");
        setEditorReady(true);
      });
    } catch (err) {
      console.error("[DriveEditor] Luckysheet init error:", err);
      message.error("Terjadi kesalahan saat memuat spreadsheet: " + err.message);
    }
  };


  // ──────────────────────────────────────
  // 3B. Initialize Canvas-Editor (Word)
  // ──────────────────────────────────────
  const initCanvasEditor = async (blob) => {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const html = result.value || "<p></p>";

      if (!containerRef.current) {
        console.error("[DriveEditor] Canvas-Editor container ref is null.");
        message.error("Kontainer editor tidak ditemukan.");
        return;
      }

      // Dynamically import Canvas-Editor so it doesn't block initial bundle
      const { default: CanvasEditor } = await import("@hufe921/canvas-editor");

      containerRef.current.innerHTML = "";

      const editor = new CanvasEditor(containerRef.current, {
        header: [],
        main: [{ value: "" }],
        footer: []
      }, {});

      // Load the converted HTML
      editor.command.executeSetHTML({
        header: "",
        main: html,
        footer: ""
      });

      editorRef.current = editor;
      setEditorReady(true);
      console.log("[DriveEditor] Canvas-Editor initialized successfully.");
    } catch (err) {
      console.error("[DriveEditor] Canvas-Editor init error:", err);
      message.error("Gagal membaca dokumen Word: " + err.message);
    }
  };


  // ──────────────────────────────────────
  // 4. Save changes handler
  // ──────────────────────────────────────
  const handleSave = async () => {
    try {
      setSaving(true);
      let outputBlob = null;

      if (fileType === "xlsx") {
        if (!window.luckysheet) {
          throw new Error("Luckysheet belum terinisialisasi.");
        }
        const data = window.luckysheet.getluckysheetfile();

        const workbook = new ExcelJS.Workbook();
        data.forEach((sheet) => {
          const worksheet = workbook.addWorksheet(sheet.name);
          
          // Use sheet.data (contains current edits) or fallback to sheet.celldata
          if (sheet.data && sheet.data.length > 0) {
            sheet.data.forEach((row, r) => {
              row.forEach((cell, c) => {
                if (cell && (cell.v !== undefined || cell.f !== undefined)) {
                  const targetCell = worksheet.getCell(r + 1, c + 1);
                  if (cell.f) {
                    const formulaStr = cell.f.startsWith("=") ? cell.f.substring(1) : cell.f;
                    targetCell.value = { formula: formulaStr, result: cell.v };
                  } else {
                    targetCell.value = cell.v;
                  }
                }
              });
            });
          } else if (sheet.celldata && sheet.celldata.length > 0) {
            sheet.celldata.forEach((cellItem) => {
              const r = cellItem.r + 1;
              const c = cellItem.c + 1;
              const cell = cellItem.v;
              if (cell) {
                const targetCell = worksheet.getCell(r, c);
                if (cell.f) {
                  const formulaStr = cell.f.startsWith("=") ? cell.f.substring(1) : cell.f;
                  targetCell.value = { formula: formulaStr, result: cell.v };
                } else {
                  targetCell.value = cell.v;
                }
              }
            });
          }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        outputBlob = new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

      } else if (fileType === "docx") {
        if (!editorRef.current) {
          throw new Error("Canvas-Editor belum terinisialisasi.");
        }

        const htmlContent = editorRef.current.command.getHTML();

        const docxContent = `
          <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
          <head>
            <meta charset="utf-8">
            <title>${fileName}</title>
            <!--[if gte mso 9]>
            <xml>
              <w:WordDocument>
                <w:View>Print</w:View>
                <w:Zoom>100</w:Zoom>
              </w:WordDocument>
            </xml>
            <![endif]-->
          </head>
          <body>
            ${htmlContent}
          </body>
          </html>
        `;

        outputBlob = new Blob([docxContent], { type: "application/msword" });
      }

      if (!outputBlob) throw new Error("Gagal memproses ekspor file.");

      const formData = new FormData();
      formData.append("file", outputBlob, fileName);
      formData.append("path", filePath);

      const response = await apiFetch("/nextcloud/save", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Gagal menyimpan berkas.");
      }

      message.success("Perubahan berkas berhasil disimpan ke Nextcloud!");
    } catch (err) {
      message.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="drive-editor-layout">
      {/* Top Header Toolbar */}
      <div className="drive-editor-header">
        <Space size="middle">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/app/penyimpanan-cloud")}
            className="drive-editor-back-btn"
          />
          <Title level={4} style={{ margin: 0, color: "#3c4043" }} ellipsis>
            {fileName || "Penyunting Berkas"}
          </Title>
          {loading && <Spin indicator={<LoadingOutlined style={{ fontSize: 18 }} spin />} />}
        </Space>

        <Space>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            disabled={loading || !editorReady}
            onClick={handleSave}
            className="drive-editor-save-btn"
          >
            Simpan ke Drive
          </Button>
        </Space>
      </div>

      {/* Editor Canvas Area — containers ALWAYS rendered so DOM is ready */}
      <div className="drive-editor-body">
        {/* Loading overlay */}
        {loading && (
          <div className="drive-editor-loading-screen">
            <Spin size="large" />
            <p style={{ marginTop: 16, color: "#5f6368" }}>Mengunduh berkas dari Nextcloud...</p>
          </div>
        )}

        {/* Luckysheet container — always in DOM, shown when type is xlsx */}
        {fileType === "xlsx" && (
          <div
            id="luckysheet-editor-container"
            style={{
              margin: 0,
              padding: 0,
              position: "absolute",
              width: "100%",
              height: "calc(100vh - 64px)",
              left: 0,
              top: 0,
              visibility: loading ? "hidden" : "visible",
            }}
          />
        )}

        {/* Canvas-Editor container — always in DOM, shown when type is docx */}
        {fileType === "docx" && (
          <div className="drive-word-workspace" style={{ visibility: loading ? "hidden" : "visible" }}>
            <div
              ref={containerRef}
              id="word-editor-container"
              className="drive-word-canvas-wrapper"
            />
          </div>
        )}
      </div>
    </div>
  );
}
