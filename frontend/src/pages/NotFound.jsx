import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import "./NotFound.css";

const NotFound = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, currentRole } = useAuth();
  const [countdown, setCountdown] = useState(5);

  const homePath = useMemo(() => {
    if (location.pathname.startsWith("/app")) {
      // Jika user adalah operator, arahkan ke operator-dashboard
      if (currentRole === "operator" || user?.base_role === "operator") {
        return "/app/operator-dashboard";
      }
      // Jika user adalah admin, arahkan ke dashboard
      if (currentRole === "admin" || user?.base_role === "admin") {
        return "/app/dashboard";
      }
      // Default untuk user lain
      return "/app/layanan-mandiri";
    }
    return "/";
  }, [location.pathname, currentRole, user]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);

    const timeoutId = setTimeout(() => {
      navigate(homePath, { replace: true });
    }, 5000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [homePath, navigate]);

  return (
    <div className="not-found-page">
      {/* Floating particles */}
      <div className="nf-particles">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="nf-particle" />
        ))}
      </div>

      {/* CRT scan lines */}
      <div className="nf-scanlines" />

      <div className="nf-content">
        {/* Floating astronaut */}
        <div className="nf-astronaut">
          <svg
            viewBox="0 0 120 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Helmet */}
            <ellipse
              cx="60"
              cy="42"
              rx="28"
              ry="30"
              fill="#334155"
              stroke="#667eea"
              strokeWidth="2"
            />
            <ellipse cx="60" cy="40" rx="20" ry="22" fill="#1e293b" />
            {/* Visor reflection */}
            <ellipse
              cx="54"
              cy="36"
              rx="8"
              ry="10"
              fill="rgba(102,126,234,0.2)"
            />
            {/* Body */}
            <rect
              x="38"
              y="68"
              width="44"
              height="32"
              rx="10"
              fill="#334155"
              stroke="#667eea"
              strokeWidth="1.5"
            />
            {/* Backpack */}
            <rect x="30" y="72" width="10" height="24" rx="4" fill="#475569" />
            {/* Left arm */}
            <rect
              x="24"
              y="74"
              width="16"
              height="8"
              rx="4"
              fill="#334155"
              stroke="#667eea"
              strokeWidth="1"
            />
            {/* Right arm */}
            <rect
              x="80"
              y="78"
              width="16"
              height="8"
              rx="4"
              fill="#334155"
              stroke="#667eea"
              strokeWidth="1"
              transform="rotate(-15 88 82)"
            />
            {/* Left leg */}
            <rect
              x="42"
              y="96"
              width="10"
              height="18"
              rx="5"
              fill="#334155"
              stroke="#667eea"
              strokeWidth="1"
            />
            {/* Right leg */}
            <rect
              x="68"
              y="96"
              width="10"
              height="18"
              rx="5"
              fill="#334155"
              stroke="#667eea"
              strokeWidth="1"
              transform="rotate(10 73 96)"
            />
            {/* Antenna */}
            <line
              x1="60"
              y1="12"
              x2="60"
              y2="4"
              stroke="#667eea"
              strokeWidth="2"
            />
            <circle cx="60" cy="3" r="3" fill="#f093fb" />
            {/* Stars around */}
            <circle cx="10" cy="20" r="1.5" fill="#f093fb" opacity="0.6" />
            <circle cx="105" cy="15" r="1" fill="#667eea" opacity="0.5" />
            <circle cx="15" cy="100" r="1.2" fill="#764ba2" opacity="0.4" />
            <circle cx="100" cy="95" r="1.8" fill="#667eea" opacity="0.6" />
          </svg>
        </div>

        {/* Error code */}
        <h1 className="nf-code">404</h1>

        <div className="nf-divider" />

        <h2 className="nf-title">Halaman Tidak Ditemukan</h2>
        <p className="nf-description">
          Sepertinya Anda tersesat di luar angkasa. Halaman yang Anda cari tidak
          ada atau sudah dipindahkan ke galaksi lain.
        </p>
        <p className="nf-redirect-note">
          Anda akan dialihkan otomatis ke halaman awal dalam{" "}
          <strong>{countdown}</strong> detik.
        </p>

        <div className="nf-actions">
          <button
            className="nf-btn nf-btn-primary"
            onClick={() => navigate(homePath, { replace: true })}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6.5 14.5v-3.5c0-.55.45-1 1-1h1c.55 0 1 .45 1 1v3.5c0 .55.45 1 1 1h2.5c.55 0 1-.45 1-1v-5.5h1.2c.45 0 .65-.55.33-.85l-6.33-5.7c-.4-.35-.97-.35-1.37 0l-6.33 5.7c-.33.3-.13.85.33.85h1.2v5.5c0 .55.45 1 1 1h2.5c.55 0 1-.45 1-1z" />
            </svg>
            Kembali ke Beranda
          </button>
          <button className="nf-btn nf-btn-ghost" onClick={() => navigate(-1)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.3 1.3a1 1 0 0 1 0 1.4L5.7 8l5.6 5.3a1 1 0 1 1-1.4 1.4l-6.3-6a1 1 0 0 1 0-1.4l6.3-6a1 1 0 0 1 1.4 0z" />
            </svg>
            Halaman Sebelumnya
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
