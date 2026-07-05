import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dashboardService } from '../services/dashboardService';
import { useAuthStore } from '../store/authStore';

export interface InAppNotification {
  id: string; // Updated to string for UUID
  title: string;
  message: string;
  type: string;
}

export const useNotificationPolling = () => {
  const { isAuthenticated } = useAuthStore();
  const [activeNotification, setActiveNotification] = useState<InAppNotification | null>(null);
  const lastIdRef = useRef<string>('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkNotifications = async () => {
    if (!isAuthenticated) return;

    try {
      // 1. Get last seen ID from storage if not in ref
      if (lastIdRef.current === '') {
        const storedId = await AsyncStorage.getItem('last_seen_notification_id');
        lastIdRef.current = storedId || '';
      }

      // 2. Fetch latest
      const response = await dashboardService.getNotifications();
      const data = response.data;
      
      // Robust extraction based on observed API response structure
      const notifications = Array.isArray(data) 
        ? data 
        : (data?.data?.data || data?.data || data?.notifications || []);

      if (Array.isArray(notifications) && notifications.length > 0) {
        const latest = notifications[0];

        // 3. Logic: If unread, different from last seen, and is an approval
        const isNew = latest.id !== lastIdRef.current;
        const msg = (latest.message || '').toLowerCase();
        const ttl = (latest.title || '').toLowerCase();
        
        const isApproved = msg.includes('disetujui') || 
                          ttl.includes('disetujui') ||
                          latest.type === 'approval';

        if (isNew && !latest.is_read && isApproved) {
          setActiveNotification({
            id: latest.id,
            title: latest.title,
            message: latest.message,
            type: latest.type
          });

          // Update last seen to prevent duplicates
          lastIdRef.current = latest.id;
          await AsyncStorage.setItem('last_seen_notification_id', latest.id);
        } else if (isNew) {
            // Even if not approved, update lastId to avoid popping up old ones later
            lastIdRef.current = latest.id;
            await AsyncStorage.setItem('last_seen_notification_id', latest.id);
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      // Initial check with small delay to avoid race with screen loads
      const timeout = setTimeout(checkNotifications, 2000);

      // Poll every 60 seconds
      intervalRef.current = setInterval(checkNotifications, 60000);
      
      return () => {
        clearTimeout(timeout);
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [isAuthenticated]);

  return { activeNotification, clearNotification: () => setActiveNotification(null) };
};
