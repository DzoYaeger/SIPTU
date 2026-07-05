import { CloseOutlined } from "@ant-design/icons";

/**
 * Reusable InfoPopupModal component.
 * Used in Admin, Validator, and Operator dashboards.
 * Props come from useInfoPopup() hook.
 */
const InfoPopupModal = ({ popupData, showPopup, popupTimeLeft, dismissPopup, ensureAbsoluteUrl }) => {
  if (!showPopup || !popupData) return null;

  const isImageOnly = !popupData.title && !popupData.content && popupData.image;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        backdropFilter: "blur(4px)",
        animation: "fadeIn 0.25s ease",
      }}
      onClick={dismissPopup}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          maxWidth: isImageOnly ? 480 : 520,
          width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          overflow: "hidden",
          position: "relative",
          animation: "slideUp 0.3s ease",
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
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "rgba(0,0,0,0.12)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#555",
              fontSize: 14,
              zIndex: 10,
              transition: "background 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.22)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0.12)"}
          >
            <CloseOutlined />
          </button>
        )}

        {/* Image */}
        {popupData.image && (
          <div
            style={{
              cursor: popupData.link ? "pointer" : "default",
              position: "relative",
            }}
            onClick={() => {
              if (popupData.link) window.open(ensureAbsoluteUrl(popupData.link), "_blank", "noopener,noreferrer");
            }}
          >
            <img
              src={popupData.image}
              alt={popupData.title || "Informasi"}
              style={{ width: "100%", display: "block", maxHeight: 320, objectFit: "cover" }}
            />
            {popupData.link && (
              <div style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                background: "linear-gradient(transparent, rgba(0,0,0,0.5))",
                color: "#fff",
                textAlign: "center",
                padding: "12px 0 8px",
                fontSize: 13,
                fontWeight: 600,
              }}>
                🔗 Klik untuk buka link
              </div>
            )}
          </div>
        )}

        {/* Body */}
        {(popupData.title || popupData.content) && (
          <div style={{ padding: "24px 28px 8px" }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "linear-gradient(135deg, #4263eb, #7048e8)",
              color: "#fff",
              borderRadius: 20,
              padding: "3px 12px",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.5px",
              marginBottom: 12,
              textTransform: "uppercase",
            }}>
              📢 Informasi
            </div>
            {popupData.title && (
              <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800, color: "#1a1a2e", lineHeight: 1.3 }}>
                {popupData.title}
              </h2>
            )}
            {popupData.content && (
              <p style={{ margin: 0, fontSize: 14, color: "#555", lineHeight: 1.6 }}>
                {popupData.content}
              </p>
            )}
          </div>
        )}

        {/* Countdown progress bar */}
        {popupData.use_duration && popupTimeLeft > 0 && (
          <div style={{ height: 4, background: "#f1f5f9", width: "100%", overflow: "hidden", margin: "16px 0 0" }}>
            <div
              style={{
                height: "100%",
                background: "linear-gradient(90deg, #4263eb, #7048e8)",
                width: `${(popupTimeLeft / popupData.duration) * 100}%`,
                transition: "width 1s linear",
              }}
            />
          </div>
        )}

        {/* Footer */}
        {(popupData.title || popupData.content) && (
          <div style={{ padding: "16px 28px 24px" }}>
            <button
              onClick={dismissPopup}
              disabled={popupData.use_duration && popupTimeLeft > 0}
              style={{
                width: "100%",
                padding: "12px 0",
                borderRadius: 10,
                border: "none",
                background: popupData.use_duration && popupTimeLeft > 0
                  ? "#e2e8f0"
                  : "linear-gradient(135deg, #4263eb, #364fc7)",
                color: popupData.use_duration && popupTimeLeft > 0 ? "#94a3b8" : "#fff",
                fontSize: 14,
                fontWeight: 700,
                cursor: popupData.use_duration && popupTimeLeft > 0 ? "not-allowed" : "pointer",
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
