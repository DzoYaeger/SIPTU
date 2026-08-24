import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  FileProtectOutlined,
  DollarOutlined,
  CalculatorOutlined,
  TeamOutlined,
  ArrowLeftOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { useAuth } from "../hooks/useAuth.js";
import dayjs from "dayjs";
import "dayjs/locale/id";

// Sub-modules
import KeuanganLpj from "./KeuanganLpj.jsx";
import PermintaanPanjar from "./PermintaanPanjar.jsx";
import InvoiceBelanja from "./InvoiceBelanja.jsx";
import KeuanganPejabat from "./KeuanganPejabat.jsx";

import "./SimkeuUnifiedModule.css";

dayjs.locale("id");

const TABS = [
  {
    key: "lpj",
    label: "Pertanggungjawaban (LPJ)",
    icon: <FileProtectOutlined />,
    desc: "Rincian biaya riil tiket, transport, harian & penginapan",
  },
  {
    key: "panjar",
    label: "Permintaan Panjar",
    icon: <DollarOutlined />,
    desc: "Uang muka kegiatan operasional & form persetujuan",
  },
  {
    key: "invoice",
    label: "Invoice & Bukti Belanja",
    icon: <CalculatorOutlined />,
    desc: "Perekaman bukti nota pembelian & pemotongan pajak",
  },
  {
    key: "pejabat",
    label: "Pejabat Perbendaharaan",
    icon: <TeamOutlined />,
    desc: "Pengaturan PPK & Bendahara Pengeluaran",
  },
];

export default function SimkeuUnifiedModule() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const currentTab = searchParams.get("tab") || "lpj";
  const [activeTab, setActiveTab] = useState(currentTab);
  const [currentTime, setCurrentTime] = useState(dayjs().format("HH:mm:ss"));

  useEffect(() => {
    setActiveTab(currentTab);
  }, [currentTab]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs().format("HH:mm:ss"));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleTabChange = (key) => {
    setActiveTab(key);
    setSearchParams({ tab: key });
  };

  const renderModuleView = () => {
    switch (activeTab) {
      case "lpj":
        return <KeuanganLpj />;
      case "panjar":
        return <PermintaanPanjar />;
      case "invoice":
        return <InvoiceBelanja />;
      case "pejabat":
        return <KeuanganPejabat />;
      default:
        return <KeuanganLpj />;
    }
  };

  const activeTabMeta = TABS.find((t) => t.key === activeTab) || TABS[0];

  return (
    <div className="simkeu-unified-root">
      {/* ── Top Frosted Navigation Bar with Embedded Horizontal Tabs ── */}
      <header className="simkeu-top-navbar">
        <div className="simkeu-navbar-container">
          {/* Left: Quick Back + Brand Header */}
          <div className="simkeu-brand-block">
            <button
              className="simkeu-back-btn"
              onClick={() => navigate("/app/layanan-mandiri")}
              title="Kembali ke Layanan Mandiri"
            >
              <ArrowLeftOutlined />
            </button>
            <div className="simkeu-brand-titles">
              <div className="simkeu-brand-row">
                <span className="simkeu-brand-name">SIMKEU</span>
                <span className="simkeu-badge-pill">ULTRA</span>
              </div>
              <span className="simkeu-brand-sub">Sistem Informasi Keuangan</span>
            </div>
          </div>

          {/* Center: Horizontal Navigation Tabs (Azure & Facebook Style) */}
          <nav className="simkeu-nav-tabs">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={`simkeu-tab-pill ${isActive ? "active" : ""}`}
                >
                  <span className="tab-icon">{tab.icon}</span>
                  <span className="tab-label">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: Live Clock & Profile */}
          <div className="simkeu-navbar-right">
            <div className="simkeu-clock-badge">
              <ClockCircleOutlined style={{ color: "#64748b" }} />
              <span>{currentTime} WITA</span>
            </div>

            <div className="simkeu-user-chip">
              <div className="user-avatar-circle">
                {(user?.name?.[0] || "U").toUpperCase()}
              </div>
              <span className="user-display-name">{user?.name || "Pegawai"}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main 100% Full-Width Content Canvas ── */}
      <main className="simkeu-full-canvas">
        <div className="simkeu-canvas-container">
          {renderModuleView()}
        </div>
      </main>
    </div>
  );
}
