import { useState, useEffect } from 'react';
import { useAuth } from './useAuth.js';
import { App } from 'antd';

// Use the public VAPID key from your .env
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BFrbpJpn1aY1RDiOuVGGRCB1McBMdni3V94M7nE6TAYkYSArLvedwPJjM_mrtynk6JwAnm9cCvY1peB1areS-6w';

// Utility to convert Base64 URL to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function useWebPush() {
  const { apiFetch } = useAuth();
  const { message } = App.useApp();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (e) {
      console.error('Error checking push subscription:', e);
    }
  };

  const subscribe = async () => {
    if (!isSupported) {
      message.error("Perangkat atau browser Anda tidak mendukung fitur Notifikasi Push.");
      return;
    }

    setIsLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Izin notifikasi ditolak oleh pengguna.');
      }

      const registration = await navigator.serviceWorker.ready;
      
      // Clean up any stale subscription first
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        try {
          await existing.unsubscribe();
        } catch (e) {
          console.warn('Old subscription cleanup error:', e);
        }
      }

      // Subscribe to PushManager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      // Send to Backend
      const response = await apiFetch('/push-subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (!response.ok) {
        throw new Error('Gagal menyimpan pendaftaran ke server.');
      }

      setIsSubscribed(true);
      message.success("Notifikasi Push berhasil diaktifkan!");
      
    } catch (error) {
      console.error('Subscription error:', error);
      message.error(error.message || "Gagal mengaktifkan notifikasi.");
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from backend first
        await apiFetch('/push-unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

        // Unsubscribe in browser
        await subscription.unsubscribe();
        setIsSubscribed(false);
        message.info("Notifikasi Push dinonaktifkan.");
      }
    } catch (error) {
      console.error('Unsubscribe error:', error);
      message.error("Terjadi kesalahan saat mematikan notifikasi.");
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestNotification = async () => {
    try {
      await apiFetch('/push-test', {
        method: 'POST'
      });
      message.success("Sinyal notifikasi tes telah dikirim.");
    } catch (e) {
      message.error("Gagal mengirim notifikasi tes.");
    }
  };

  return {
    isSupported,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    sendTestNotification
  };
}
