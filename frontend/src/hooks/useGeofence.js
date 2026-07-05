import { useState, useEffect, useRef } from "react";

/**
 * Hook to manage geofencing logic for Izin Keluar.
 * @param {boolean|object} isActive - whether the hook should actively monitor location. Can pass an object `{ nip }` to pass state.
 * @param {function} onAutoReturn - callback when auto-return succeeds
 * @param {function} pingFn - function that receives { latitude, longitude, nip } and returns a Promise resolving to the data.
 */
export function useGeofence(isActive, onAutoReturn, pingFn) {
  const [locationStatus, setLocationStatus] = useState("Menunggu lokasi...");
  const [distance, setDistance] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isInside, setIsInside] = useState(false);
  const watchIdRef = useRef(null);
  const intervalRef = useRef(null);
  const lastLocationRef = useRef(null);

  // Send ping to server
  const pingServer = async (lat, lng) => {
    if (!pingFn) return;
    try {
      const data = await pingFn({ 
        latitude: lat, 
        longitude: lng,
        ...(isActive?.nip ? { nip: isActive.nip } : {})
      });
      
      if (data) {
        setLocationStatus(data.message);
        if (data.distance_meters !== undefined) {
          setDistance(data.distance_meters);
          setIsInside(data.distance_meters <= 100); // UI reflects standard radius
        }
        if (data.time_remaining_seconds !== undefined) {
          setTimeRemaining(data.time_remaining_seconds);
        } else {
          setTimeRemaining(null);
        }

        if (data.auto_returned) {
          if (onAutoReturn) onAutoReturn(data);
        }
      }
    } catch (err) {
      console.error("Geofence ping error", err);
    }
  };

  useEffect(() => {
    if (!isActive) {
      // Cleanup
      if (watchIdRef.current !== null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setLocationStatus("");
      setDistance(null);
      setTimeRemaining(null);
      return;
    }

    if (!("geolocation" in navigator)) {
      setLocationStatus("Browser Anda tidak mendukung deteksi lokasi.");
      return;
    }

    setLocationStatus("Meminta izin lokasi...");

    // Watch position
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        lastLocationRef.current = { latitude, longitude };
        // Instantly ping when location changes significantly
        pingServer(latitude, longitude);
      },
      (error) => {
        let msg = "Gagal mendapatkan lokasi.";
        if (error.code === 1) msg = "Akses lokasi ditolak. PWA tidak dapat mendeteksi kepulangan otomatis.";
        else if (error.code === 2) msg = "Sinyal GPS tidak tersedia.";
        else if (error.code === 3) msg = "Waktu tunggu GPS habis.";
        setLocationStatus(msg);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000, // 10 seconds
        timeout: 10000,
      }
    );

    // Also set a fallback interval to ping every 30 seconds
    intervalRef.current = setInterval(() => {
      if (lastLocationRef.current) {
        pingServer(lastLocationRef.current.latitude, lastLocationRef.current.longitude);
      }
    }, 30000);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive]);

  return { locationStatus, distance, timeRemaining, isInside };
}
