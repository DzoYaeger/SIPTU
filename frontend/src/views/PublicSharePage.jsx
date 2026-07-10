import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button, Card, Typography, Spin, Empty, Space } from "antd";
import {
  DownloadOutlined,
  CloudServerOutlined,
  FilePdfFilled,
  FileExcelFilled,
  FileWordFilled,
  FileImageFilled,
  FileZipFilled,
  FilePptFilled,
  PlayCircleFilled,
  CustomerServiceFilled,
  FileFilled,
} from "@ant-design/icons";
import "./PublicSharePage.css";

const { Title, Text } = Typography;

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === null || bytes === undefined) return "-";
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const getFileIcon = (fileName) => {
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

export default function PublicSharePage() {
  const { token } = useParams();
  const [fileInfo, setFileInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const baseUrlRaw = import.meta.env.VITE_API_URL || "https://siptu.bpompalopo.com/core_api/api";
  const baseUrl = baseUrlRaw.replace(/\/+$/, "");

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const response = await fetch(`${baseUrl}/share/info/${token}`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || "Tautan tidak valid atau berkas tidak ditemukan.");
        }
        const data = await response.json();
        setFileInfo(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
  }, [token, baseUrl]);

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
          {getFileIcon(fileInfo?.name)}
        </div>
        <div className="share-file-details">
          <Title level={4} className="share-file-name" title={fileInfo?.name}>
            {fileInfo?.name}
          </Title>
          <Text type="secondary" className="share-file-size">
            Ukuran Berkas: {formatBytes(fileInfo?.size)}
          </Text>
        </div>
        
        <Button
          type="primary"
          size="large"
          icon={<DownloadOutlined />}
          href={`${baseUrl}/share/download/${token}`}
          className="share-download-btn"
          block
        >
          Unduh Berkas
        </Button>
      </Card>
      <div className="share-landing-footer">
        <Text type="secondary" style={{ fontSize: "12px" }}>
          Di-host dengan aman melalui SIPTU Drive terintegrasi Nextcloud Loka POM di Kota Palopo.
        </Text>
      </div>
    </div>
  );
}
