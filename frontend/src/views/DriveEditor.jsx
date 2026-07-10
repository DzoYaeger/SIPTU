import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button, Space, Spin, Typography, message } from "antd";
import { SaveOutlined, ArrowLeftOutlined, LoadingOutlined } from "@ant-design/icons";
import { useAuth } from "../hooks/useAuth.js";
import ExcelJS from "exceljs";
import mammoth from "mammoth";
import Editor from "@hufe921/canvas-editor";
import "./DriveEditor.css";

const { Title, Text } = Typography;

export default function DriveEditor() {
  const { apiFetch } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const filePath = searchParams.get("path");
  const fileType = searchParams.get("type"); // xlsx or docx
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fileName, setFileName] = useState("");
  
  const editorRef = useRef(null); // Reference to Canvas-Editor instance
  const containerRef = useRef(null); // Reference to Canvas-Editor container div

  useEffect(() => {
    if (!filePath || !fileType) {
      message.error("Parameter berkas tidak valid.");
      navigate("/app/penyimpanan-cloud");
      return;
    }

    setFileName(filePath.split("/").pop());
    
    // Fetch file from Nextcloud
    const fetchFile = async () => {
      try {
        setLoading(true);
        const response = await apiFetch(`/nextcloud/download?path=${encodeURIComponent(filePath)}`);
        if (!response.ok) throw new Error("Gagal mengunduh berkas dari Nextcloud.");
        
        const blob = await response.blob();
        
        if (fileType === "xlsx") {
          // Allow small delay for luckysheet script to mount
          setTimeout(() => {
            initLuckysheet(blob);
          }, 100);
        } else if (fileType === "docx") {
          await initCanvasEditor(blob);
        }
      } catch (err) {
        message.error(err.message);
        navigate("/app/penyimpanan-cloud");
      } finally {
        setLoading(false);
      }
    };

    fetchFile();
    
    // Cleanup Luckysheet on unmount
    return () => {
      if (window.luckysheet) {
        try {
          window.luckysheet.destroy();
        } catch (_) {}
      }
    };
  }, [filePath, fileType]);

  // Initialize Luckysheet
  const initLuckysheet = (blob) => {
    if (!window.LuckyExcel) {
      message.error("Library LuckyExcel tidak terload. Periksa koneksi internet.");
      return;
    }

    window.LuckyExcel.transformExcelToLucky(blob, (exportJson) => {
      if (exportJson.sheets === null || exportJson.sheets.length === 0) {
        message.error("Gagal mengonversi berkas Excel.");
        return;
      }
      
      // Destroy existing if any
      if (window.luckysheet) {
        try {
          window.luckysheet.destroy();
        } catch (_) {}
      }

      window.luckysheet.create({
        container: "luckysheet-editor-container",
        data: exportJson.sheets,
        title: exportJson.info.name || fileName,
        lang: "zh",
        showinfobar: false,
        allowUpdate: false,
      });
    });
  };

  // Initialize Canvas-Editor (Word)
  const initCanvasEditor = async (blob) => {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const html = result.value || "<p></p>";

      // Clean container first
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }

      const editor = new Editor(containerRef.current, {
        header: [],
        main: [],
        footer: []
      });

      editor.command.executeHtml({
        header: "",
        main: html,
        footer: ""
      });

      editorRef.current = editor;
    } catch (err) {
      console.error(err);
      message.error("Gagal membaca dokumen Word.");
    }
  };

  // Save changes handler
  const handleSave = async () => {
    try {
      setSaving(true);
      let outputBlob = null;
      let mimeType = "";

      if (fileType === "xlsx") {
        if (!window.luckysheet) {
          throw new Error("Luckysheet belum terinisialisasi.");
        }
        const data = window.luckysheet.getluckysheetfile();
        
        // Export Luckysheet data to Xlsx Blob using exceljs
        const workbook = new ExcelJS.Workbook();
        data.forEach((sheet) => {
          const worksheet = workbook.addWorksheet(sheet.name);
          const celldata = sheet.celldata || [];
          
          celldata.forEach((cell) => {
            const r = cell.r + 1;
            const c = cell.c + 1;
            const val = cell.v;
            
            const targetCell = worksheet.getCell(r, c);
            if (val && typeof val === 'object') {
              if (val.f) {
                targetCell.value = { formula: val.f, result: val.v };
              } else {
                targetCell.value = val.v;
              }
            } else {
              targetCell.value = val;
            }
          });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        outputBlob = new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });
        mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

      } else if (fileType === "docx") {
        if (!editorRef.current) {
          throw new Error("Canvas-Editor belum terinisialisasi.");
        }
        
        const htmlContent = editorRef.current.command.getHtml();
        
        // Construct basic Word-compatible XML document envelope
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
        mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      }

      if (!outputBlob) throw new Error("Gagal memproses ekspor file.");

      // Upload/Save back to Nextcloud
      const formData = new FormData();
      formData.append("file", outputBlob, fileName);
      formData.append("path", filePath);

      const response = await apiFetch("/nextcloud/save", {
        method: "POST",
        body: formData
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
            disabled={loading}
            onClick={handleSave}
            className="drive-editor-save-btn"
          >
            Simpan ke Drive
          </Button>
        </Space>
      </div>

      {/* Editor Canvas Area */}
      <div className="drive-editor-body">
        {loading ? (
          <div className="drive-editor-loading-screen">
            <Spin size="large" tip="Mengunduh berkas dari Nextcloud..." />
          </div>
        ) : (
          <>
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
                  top: "64px"
                }}
              />
            )}
            {fileType === "docx" && (
              <div className="drive-word-workspace">
                <div 
                  ref={containerRef} 
                  id="word-editor-container"
                  className="drive-word-canvas-wrapper"
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
