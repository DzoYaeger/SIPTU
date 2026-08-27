import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeftOutlined, CalculatorOutlined, ClockCircleOutlined, DollarOutlined, FileProtectOutlined, SafetyCertificateOutlined, TeamOutlined } from "@ant-design/icons";
import { useAuth } from "../hooks/useAuth.js";
import simkeuIcon from "../assets/icons/simkeu-icon.png";
import InvoiceBelanja from "./InvoiceBelanja.jsx";
import KeuanganLpj from "./KeuanganLpj.jsx";
import KeuanganPejabat from "./KeuanganPejabat.jsx";
import PermintaanPanjar from "./PermintaanPanjar.jsx";
import "./SimkeuUnifiedModule.css";

const TABS = [
  { key: "lpj", label: "Pertanggungjawaban (LPJ)", icon: <FileProtectOutlined />, desc: "Kelola pertanggungjawaban perjalanan dinas secara rapi dan terpantau." },
  { key: "panjar", label: "Permintaan Panjar", icon: <DollarOutlined />, desc: "Ajukan dan pantau kebutuhan uang muka kegiatan operasional." },
  { key: "invoice", label: "Invoice & Bukti Belanja", icon: <CalculatorOutlined />, desc: "Rekam invoice, bukti transaksi, dan pemotongan pajak dalam satu alur." },
  { key: "pejabat", label: "Pejabat Perbendaharaan", icon: <TeamOutlined />, desc: "Kelola data PPK dan Bendahara Pengeluaran yang aktif." },
];

const formatWitaTime = () => new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Makassar", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
}).format(new Date()).replaceAll(".", ":");

export default function SimkeuUnifiedModule() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const requestedTab = searchParams.get("tab");
  const activeTab = TABS.some((tab) => tab.key === requestedTab) ? requestedTab : "lpj";
  const activeTabMeta = TABS.find((tab) => tab.key === activeTab) || TABS[0];
  const [currentTime, setCurrentTime] = useState(formatWitaTime);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(formatWitaTime()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const handleTabChange = (key) => {
    if (key === activeTab) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", key);
    setSearchParams(nextParams);
  };

  const renderModuleView = () => {
    if (activeTab === "panjar") return <PermintaanPanjar />;
    if (activeTab === "invoice") return <InvoiceBelanja />;
    if (activeTab === "pejabat") return <KeuanganPejabat />;
    return <KeuanganLpj />;
  };

  return (
    <div className="simkeu-unified-root">
      <div className="simkeu-ambient-glow" aria-hidden="true" />
      <header className="simkeu-top-navbar">
        <div className="simkeu-navbar-container">
          <div className="simkeu-brand-block">
            <button type="button" className="simkeu-back-btn" onClick={() => navigate("/app/layanan-mandiri")} aria-label="Kembali ke Layanan Mandiri" title="Kembali ke Layanan Mandiri"><ArrowLeftOutlined /></button>
            <div className="simkeu-brand-mark" aria-hidden="true"><img src={simkeuIcon} alt="" /></div>
            <div className="simkeu-brand-titles"><div className="simkeu-brand-row"><span className="simkeu-brand-name">SIMKEU</span><span className="simkeu-brand-edition">ULTRA</span></div><span className="simkeu-brand-sub">Sistem Informasi Keuangan</span></div>
          </div>
          <nav className="simkeu-nav-tabs" aria-label="Navigasi utama SIMKEU">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return <button type="button" key={tab.key} onClick={() => handleTabChange(tab.key)} className={`simkeu-tab-pill ${isActive ? "active" : ""}`} aria-current={isActive ? "page" : undefined} title={tab.desc}><span className="simkeu-tab-icon">{tab.icon}</span><span className="simkeu-tab-label">{tab.label}</span></button>;
            })}
          </nav>
          <div className="simkeu-navbar-right">
            <div className="simkeu-clock-badge" aria-label={`${currentTime} WITA`}><ClockCircleOutlined /><span>{currentTime}</span><span className="simkeu-clock-zone">WITA</span></div>
            <div className="simkeu-user-chip" title={user?.name || "Pegawai"}><div className="simkeu-user-avatar">{(user?.name?.[0] || "U").toUpperCase()}</div><span className="simkeu-user-name">{user?.name || "Pegawai"}</span></div>
          </div>
        </div>
      </header>
      <main className="simkeu-full-canvas">
        <div className="simkeu-canvas-container">
          <section className="simkeu-workspace-context" aria-labelledby="simkeu-workspace-title">
            <div className="simkeu-context-main">
              <div className="simkeu-context-icon" aria-hidden="true">{activeTabMeta.icon}</div>
              <div className="simkeu-context-copy"><span className="simkeu-context-eyebrow">Finance operations / {activeTab.toUpperCase()}</span><div className="simkeu-context-title-row"><h1 id="simkeu-workspace-title">{activeTabMeta.label}</h1></div><p>{activeTabMeta.desc}</p></div>
            </div>
            <div className="simkeu-context-aside"><span className="simkeu-system-state"><i /> Sistem aktif</span><span className="simkeu-secure-label"><SafetyCertificateOutlined /> Data keuangan internal</span></div>
          </section>
          <div key={activeTab} className="simkeu-view-transition">{renderModuleView()}</div>
        </div>
      </main>
    </div>
  );
}
