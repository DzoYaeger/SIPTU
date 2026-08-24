import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth.js";

/**
 * Custom hook for the info popup from the hero-slider API.
 * Can be used in any dashboard page.
 */
export function useInfoPopup() {
  const { apiFetch, user } = useAuth();
  const [popupData, setPopupData] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [popupTimeLeft, setPopupTimeLeft] = useState(0);

  useEffect(() => {
    const fetchPopup = async () => {
      try {
        const res = await apiFetch("/hero-slider");
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));

        if (data?.popup && data.popup.active) {
          const rawId = data.popup.title || data.popup.image || data.popup.image_2 || "default_popup";
          const hashedId = btoa(encodeURIComponent(rawId)).substring(0, 16);
          const localKey = `siptu_popup_dismissed_${hashedId}`;

          // If show_once is OFF (false), ensure legacy localStorage restriction is cleared
          if (!data.popup.show_once) {
            try { localStorage.removeItem(localKey); } catch (err) {}
          } else {
            // If show_once is ON (true) and user already dismissed it permanently
            if (localStorage.getItem(localKey)) {
              return;
            }
          }

          // In-memory SPA session check (prevents popup from re-appearing when switching menus in SPA, but allows re-appear on page refresh if show_once is false)
          if (window.__siptu_popup_shown_in_spa) {
            return;
          }

          setPopupData(data.popup);
          setShowPopup(true);
          window.__siptu_popup_shown_in_spa = true;

          if (data.popup.use_duration && data.popup.duration > 0) {
            setPopupTimeLeft(data.popup.duration);
          }
        }
      } catch (e) {
        console.error("Failed to fetch popup data", e);
      }
    };

    fetchPopup();
  }, [apiFetch]);

  // Countdown timer
  useEffect(() => {
    if (showPopup && popupData?.use_duration && popupTimeLeft > 0) {
      const timer = setInterval(() => {
        setPopupTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [showPopup, popupData, popupTimeLeft]);

  // Auto-dismiss when countdown hits zero
  useEffect(() => {
    if (showPopup && popupData?.use_duration && popupTimeLeft === 0 && popupData.duration > 0) {
      const timer = setTimeout(() => {
        dismissPopup(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [popupTimeLeft, showPopup, popupData]);

  const dismissPopup = useCallback((force = false) => {
    if (force !== true && popupData?.use_duration && popupTimeLeft > 0) return;
    setShowPopup(false);
    
    if (popupData) {
      const rawId = popupData.title || popupData.image || popupData.image_2 || "default_popup";
      const hashedId = btoa(encodeURIComponent(rawId)).substring(0, 16);
      window.__siptu_popup_shown_in_spa = true;

      if (popupData.show_once) {
        const localKey = `siptu_popup_dismissed_${hashedId}`;
        try { localStorage.setItem(localKey, "1"); } catch (err) {}
      }
    }
  }, [popupData, popupTimeLeft]);

  const ensureAbsoluteUrl = useCallback((url) => {
    if (!url) return "";
    const trimmed = String(url).trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("mailto:")) return trimmed;
    if (trimmed.startsWith("/")) return `${window.location.origin}${trimmed}`;
    if (trimmed.startsWith("storage/")) return `${window.location.origin}/${trimmed}`;
    return `https://${trimmed}`;
  }, []);

  return {
    popupData,
    showPopup,
    popupTimeLeft,
    dismissPopup,
    ensureAbsoluteUrl,
  };
}
