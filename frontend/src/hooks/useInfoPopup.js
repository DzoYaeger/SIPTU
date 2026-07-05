import { useState, useEffect } from "react";
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
    if (!user) return;

    const fetchPopup = async () => {
      try {
        const res = await apiFetch("/hero-slider");
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));

        if (data?.popup && data.popup.active) {
          const popupKey = `siptu_popup_dismissed_${btoa(data.popup.title || "default").substring(0, 16)}`;
          if (data.popup.show_once && localStorage.getItem(popupKey)) {
            return; // Already dismissed
          }
          setPopupData(data.popup);
          setShowPopup(true);
          if (data.popup.use_duration && data.popup.duration > 0) {
            setPopupTimeLeft(data.popup.duration);
          }
        }
      } catch (e) {
        console.error("Failed to fetch popup data", e);
      }
    };

    fetchPopup();
  }, [apiFetch, user]);

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

  const dismissPopup = (force = false) => {
    if (force !== true && popupData?.use_duration && popupTimeLeft > 0) return;
    setShowPopup(false);
    if (popupData?.show_once) {
      const popupKey = `siptu_popup_dismissed_${btoa(popupData.title || "default").substring(0, 16)}`;
      localStorage.setItem(popupKey, "1");
    }
  };

  const ensureAbsoluteUrl = (url) => {
    if (!url) return "";
    const trimmed = url.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("mailto:")) return trimmed;
    return `https://${trimmed}`;
  };

  return {
    popupData,
    showPopup,
    popupTimeLeft,
    dismissPopup,
    ensureAbsoluteUrl,
  };
}
