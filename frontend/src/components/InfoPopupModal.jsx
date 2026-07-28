import { useEffect, useRef } from "react";
import { CloseOutlined } from "@ant-design/icons";

/**
 * Reusable InfoPopupModal component.
 * Used in Admin, Validator, and Operator dashboards.
 * Props come from useInfoPopup() hook.
 */
const InfoPopupModal = ({ popupData, showPopup, popupTimeLeft, dismissPopup, ensureAbsoluteUrl }) => {
  const canvasRef = useRef(null);
  const audioRef = useRef(null);

  const soundUrl = popupData?.sound_url;
  const useSound = popupData?.use_sound;

  const resolveAudioUrl = (url) => {
    if (!url) return "";
    if (typeof ensureAbsoluteUrl === "function") {
      const res = ensureAbsoluteUrl(url);
      if (res) return res;
    }
    const trimmed = String(url).trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
    if (trimmed.startsWith("/")) return `${window.location.origin}${trimmed}`;
    if (trimmed.startsWith("storage/")) return `${window.location.origin}/${trimmed}`;
    return `${window.location.origin}/${trimmed.replace(/^\/+/, '')}`;
  };

  // Audio Playback Effect — Automatic play on page enter with seamless un-mute fallback
  useEffect(() => {
    if (!showPopup || !useSound || !soundUrl) return;

    let audio;
    try {
      const audioUrl = resolveAudioUrl(soundUrl);
      audio = new Audio(audioUrl);
      audio.loop = true;
      audioRef.current = audio;

      const playAudio = async () => {
        try {
          // 1. Try playing unmuted directly
          await audio.play();
        } catch (err) {
          console.warn("Direct unmuted autoplay blocked by browser policy, starting muted & unmuting on movement:", err);
          // 2. Play muted first (allowed by all browsers), then un-mute on first user movement/interaction
          try {
            audio.muted = true;
            await audio.play();
          } catch (mutedErr) {
            console.warn("Muted autoplay also blocked:", mutedErr);
          }

          const unMute = () => {
            if (audioRef.current) {
              audioRef.current.muted = false;
              if (audioRef.current.paused) {
                audioRef.current.play().catch(() => {});
              }
            }
            removeListeners();
          };

          const removeListeners = () => {
            window.removeEventListener("pointermove", unMute);
            window.removeEventListener("mousemove", unMute);
            window.removeEventListener("touchstart", unMute);
            window.removeEventListener("click", unMute);
            window.removeEventListener("scroll", unMute);
            window.removeEventListener("keydown", unMute);
          };

          window.addEventListener("pointermove", unMute, { passive: true });
          window.addEventListener("mousemove", unMute, { passive: true });
          window.addEventListener("touchstart", unMute, { passive: true });
          window.addEventListener("click", unMute, { passive: true });
          window.addEventListener("scroll", unMute, { passive: true });
          window.addEventListener("keydown", unMute, { passive: true });
        }
      };

      playAudio();

      return () => {
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
      };
    } catch (e) {
      console.warn("Failed to load popup sound:", e);
    }
  }, [showPopup, useSound, soundUrl, ensureAbsoluteUrl]);

  // Fireworks Celebration Canvas Effect
  useEffect(() => {
    if (!showPopup || !popupData || !popupData.use_fireworks) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animationFrameId;
    let particles = [];
    let fireworks = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const colors = [
      "#ff4d4f", "#ff7a45", "#ffa940", "#ffec3d",
      "#73d13d", "#36cfc9", "#4096ff", "#9254de", "#f759ab"
    ];

    class Firework {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = canvas.height;
        this.targetY = Math.random() * (canvas.height * 0.45) + (canvas.height * 0.1);
        this.speed = Math.random() * 5 + 12;
        this.angle = (Math.random() * 0.2 - 0.1) - Math.PI / 2;
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.15; // gravity

        if (this.vy >= 0 || this.y <= this.targetY) {
          this.explode();
          return false;
        }
        return true;
      }

      draw() {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.restore();
      }

      explode() {
        const particleCount = Math.floor(Math.random() * 40) + 50;
        for (let i = 0; i < particleCount; i++) {
          particles.push(new Particle(this.x, this.y, this.color));
        }
      }
    }

    class Particle {
      constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 1;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.alpha = 1;
        this.decay = Math.random() * 0.015 + 0.01;
        this.gravity = 0.08;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.vx *= 0.98;
        this.vy *= 0.98;
        this.alpha -= this.decay;
        return this.alpha > 0;
      }

      draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.restore();
      }
    }

    let lastLaunch = 0;
    const loop = (timestamp) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (timestamp - lastLaunch > 450 && fireworks.length < 5) {
        fireworks.push(new Firework());
        lastLaunch = timestamp;
      }

      fireworks = fireworks.filter((fw) => {
        fw.draw();
        return fw.update();
      });

      particles = particles.filter((pt) => {
        pt.draw();
        return pt.update();
      });

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resizeCanvas);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [showPopup, popupData]);

  if (!showPopup || !popupData) return null;

  const hasImage1 = Boolean(popupData.image);
  const hasImage2 = Boolean(popupData.image_2);
  const isDualImage = hasImage1 && hasImage2;
  const hasAnyImage = hasImage1 || hasImage2;
  const isImageOnly = !popupData.title && !popupData.content && hasAnyImage;

  const link1 = popupData.link ? ensureAbsoluteUrl(popupData.link) : null;
  const link2 = popupData.link_2 ? ensureAbsoluteUrl(popupData.link_2) : link1;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        backdropFilter: "blur(5px)",
        animation: "fadeIn 0.25s ease",
      }}
      onClick={dismissPopup}
    >
      {/* Fireworks Canvas */}
      {popupData.use_fireworks && (
        <canvas
          ref={canvasRef}
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            zIndex: 10000,
          }}
        />
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        
        .siptu-popup-container {
          background: #fff;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.4);
          overflow: hidden;
          position: relative;
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          max-height: 96vh;
          display: flex;
          flex-direction: column;
          z-index: 10001;
        }

        .siptu-popup-img-container {
          width: 100%;
          position: relative;
          background: #0f172a;
          overflow: hidden;
        }

        .siptu-popup-img-wrapper {
          width: 100%;
          position: relative;
          background: #0f172a;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .siptu-popup-dual-grid {
          display: flex;
          flex-direction: row;
          gap: 8px;
          width: 100%;
          background: #0f172a;
          padding: 8px;
          box-sizing: border-box;
        }

        .siptu-popup-dual-item {
          flex: 1;
          min-width: 0;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #020617;
          border-radius: 10px;
          overflow: hidden;
        }

        .siptu-popup-img {
          width: 100%;
          height: auto;
          max-height: ${isImageOnly ? '90vh' : '65vh'};
          object-fit: contain;
          display: block;
        }

        .siptu-popup-dual-img {
          width: 100%;
          height: auto;
          max-height: ${isImageOnly ? '90vh' : '65vh'};
          object-fit: contain;
          display: block;
        }

        @media (max-width: 768px) {
          .siptu-popup-container {
            border-radius: 16px;
            width: 98vw !important;
            max-height: 94vh !important;
          }
          .siptu-popup-dual-grid {
            flex-direction: column;
            gap: 8px;
            max-height: ${isImageOnly ? '82vh' : '60vh'};
            overflow-y: auto;
          }
          .siptu-popup-img {
            max-height: ${isImageOnly ? '80vh' : '50vh'};
          }
          .siptu-popup-dual-img {
            max-height: ${isImageOnly ? '45vh' : '35vh'};
          }
          .siptu-popup-body {
            padding: 16px 20px 8px !important;
          }
          .siptu-popup-title {
            font-size: 17px !important;
          }
          .siptu-popup-content {
            font-size: 13px !important;
          }
          .siptu-popup-footer {
            padding: 12px 20px 16px !important;
          }
        }
      `}</style>
      <div
        className="siptu-popup-container"
        style={{
          width: isDualImage
            ? (isImageOnly ? "min(98vw, 1750px)" : "min(96vw, 1400px)")
            : (isImageOnly ? "min(96vw, 950px)" : "min(92vw, 760px)"),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        {(!popupData.use_duration || popupTimeLeft === 0) && (
          <button
            onClick={dismissPopup}
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "rgba(0,0,0,0.45)",
              border: "1px solid rgba(255,255,255,0.2)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 15,
              zIndex: 20,
              boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "rgba(0,0,0,0.7)";
              e.currentTarget.style.transform = "scale(1.08)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "rgba(0,0,0,0.45)";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <CloseOutlined />
          </button>
        )}

        {/* Dual / Single Image Section */}
        {isDualImage ? (
          <div className="siptu-popup-dual-grid">
            <div
              className="siptu-popup-dual-item"
              style={{ cursor: link1 ? "pointer" : "default" }}
              onClick={() => {
                if (link1) window.open(link1, "_blank", "noopener,noreferrer");
              }}
            >
              <img
                src={popupData.image}
                alt={popupData.title || "Gambar 1 Popup"}
                className="siptu-popup-dual-img"
              />
              {link1 && (
                <div style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
                  color: "#fff",
                  textAlign: "center",
                  padding: "12px 6px 8px",
                  fontSize: 11,
                  fontWeight: 600,
                }}>
                  🔗 Klik Gambar 1
                </div>
              )}
            </div>
            <div
              className="siptu-popup-dual-item"
              style={{ cursor: link2 ? "pointer" : "default" }}
              onClick={() => {
                if (link2) window.open(link2, "_blank", "noopener,noreferrer");
              }}
            >
              <img
                src={popupData.image_2}
                alt={popupData.title || "Gambar 2 Popup"}
                className="siptu-popup-dual-img"
              />
              {link2 && (
                <div style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
                  color: "#fff",
                  textAlign: "center",
                  padding: "12px 6px 8px",
                  fontSize: 11,
                  fontWeight: 600,
                }}>
                  🔗 Klik Gambar 2
                </div>
              )}
            </div>
          </div>
        ) : hasAnyImage ? (
          <div
            className="siptu-popup-img-wrapper"
            style={{
              cursor: (link1 || link2) ? "pointer" : "default",
            }}
            onClick={() => {
              const targetLink = link1 || link2;
              if (targetLink) window.open(targetLink, "_blank", "noopener,noreferrer");
            }}
          >
            <img
              src={popupData.image || popupData.image_2}
              alt={popupData.title || "Informasi Popup"}
              className="siptu-popup-img"
            />
            {(link1 || link2) && (
              <div style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                background: "linear-gradient(transparent, rgba(0,0,0,0.75))",
                color: "#fff",
                textAlign: "center",
                padding: "16px 12px 10px",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.2px",
              }}>
                🔗 Klik untuk membuka tautan
              </div>
            )}
          </div>
        ) : null}

        {/* Body Section */}
        {(popupData.title || popupData.content) && (
          <div className="siptu-popup-body" style={{ padding: "20px 24px 8px", overflowY: "auto" }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "linear-gradient(135deg, #3b82f6, #6366f1)",
              color: "#fff",
              borderRadius: 20,
              padding: "3px 12px",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.5px",
              marginBottom: 10,
              textTransform: "uppercase",
            }}>
              📢 Informasi
            </div>
            {popupData.title && (
              <h2 className="siptu-popup-title" style={{ margin: "0 0 8px", fontSize: 19, fontWeight: 800, color: "#0f172a", lineHeight: 1.35 }}>
                {popupData.title}
              </h2>
            )}
            {popupData.content && (
              <p className="siptu-popup-content" style={{ margin: 0, fontSize: 14, color: "#475569", lineHeight: 1.6, whitespace: "pre-wrap" }}>
                {popupData.content}
              </p>
            )}
          </div>
        )}

        {/* Countdown progress bar */}
        {popupData.use_duration && popupTimeLeft > 0 && (
          <div style={{ height: 4, background: "#f1f5f9", width: "100%", overflow: "hidden", margin: "12px 0 0" }}>
            <div
              style={{
                height: "100%",
                background: "linear-gradient(90deg, #3b82f6, #6366f1)",
                width: `${(popupTimeLeft / popupData.duration) * 100}%`,
                transition: "width 1s linear",
              }}
            />
          </div>
        )}

        {/* Footer Section */}
        {(popupData.title || popupData.content) && (
          <div className="siptu-popup-footer" style={{ padding: "16px 24px 20px" }}>
            <button
              onClick={dismissPopup}
              disabled={popupData.use_duration && popupTimeLeft > 0}
              style={{
                width: "100%",
                padding: "11px 0",
                borderRadius: 10,
                border: "none",
                background: popupData.use_duration && popupTimeLeft > 0
                  ? "#e2e8f0"
                  : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                color: popupData.use_duration && popupTimeLeft > 0 ? "#94a3b8" : "#fff",
                fontSize: 14,
                fontWeight: 700,
                cursor: popupData.use_duration && popupTimeLeft > 0 ? "not-allowed" : "pointer",
                boxShadow: popupData.use_duration && popupTimeLeft > 0 ? "none" : "0 4px 14px rgba(37, 99, 235, 0.35)",
                transition: "all 0.2s",
              }}
            >
              {popupData.use_duration && popupTimeLeft > 0
                ? `Harap tunggu (${popupTimeLeft}s)`
                : "Mengerti"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InfoPopupModal;
