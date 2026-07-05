import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown, FadeOutRight, Layout } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { dashboardService } from '../../services/dashboardService';
import { cn } from '../../utils/cn';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/id';

dayjs.extend(relativeTime);
dayjs.locale('id');

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  data?: any;
}

export const NotificationScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const navigation = useNavigation<any>();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    try {
      console.log('Fetching notifications...');
      const response = await dashboardService.getNotifications();
      const data = response.data;
      console.log('Notifications API Response:', JSON.stringify(data).slice(0, 200));
      
      let finalData = [];
      if (Array.isArray(data)) {
        finalData = data;
      } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
        finalData = data.data;
      } else if (data && typeof data === 'object' && data.notifications && Array.isArray(data.notifications)) {
        finalData = data.notifications;
      }
      
      setNotifications(finalData);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await dashboardService.markNotificationAsRead(id);
      setNotifications(prev => 
        prev.map(notif => notif.id === id ? { ...notif, is_read: true } : notif)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationPress = async (item: Notification) => {
    if (!item.is_read) {
      handleMarkAsRead(item.id);
    }
    
    // Handle specific notification types / navigation if needed
    if (item.data?.route) {
        navigation.navigate(item.data.route, item.data.params);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const renderItem = ({ item, index }: { item: Notification; index: number }) => {
    const isToday = dayjs().isSame(dayjs(item.created_at), 'day');
    
    return (
      <Animated.View
        entering={FadeInDown.delay(index * 100).springify()}
        exiting={FadeOutRight.duration(300)}
        layout={Layout.springify()}
      >
        <TouchableOpacity
          onPress={() => handleNotificationPress(item)}
          className={cn(
            "mx-4 mb-3 p-4 rounded-[24px] border border-secondary-100 flex-row items-start shadow-sm",
            item.is_read ? "bg-white" : "bg-primary-50 border-primary-100 shadow-md shadow-primary-200/50"
          )}
        >
          {/* Notification Icon Badge */}
          <View className={cn(
            "w-12 h-12 rounded-2xl items-center justify-center mr-4",
            item.is_read ? "bg-secondary-50" : "bg-primary-100 border border-primary-200"
          )}>
            <Ionicons 
              name={item.type === 'alert' ? 'alert-circle' : 'notifications'} 
              size={24} 
              color={item.is_read ? "#64748b" : "#2563eb"} 
            />
          </View>

          <View className="flex-1">
            <View className="flex-row justify-between items-center mb-1">
              <Text className={cn(
                "text-sm font-bold",
                item.is_read ? "text-secondary-700" : "text-primary-900"
              )}>
                {item.title}
              </Text>
              {!item.is_read && (
                <View className="w-2 h-2 bg-primary-500 rounded-full" />
              )}
            </View>
            <Text 
              className={cn(
                "text-xs leading-5",
                item.is_read ? "text-secondary-500" : "text-primary-700 font-medium"
              )}
              numberOfLines={2}
            >
              {item.message}
            </Text>
            <View className="flex-row items-center mt-3">
              <Ionicons 
                name="time-outline" 
                size={12} 
                color={item.is_read ? "#94a3b8" : "#3b82f6"} 
              />
              <Text className={cn(
                "text-[10px] ml-1 font-semibold",
                item.is_read ? "text-secondary-400" : "text-primary-500"
              )}>
                {dayjs(item.created_at).fromNow()}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const EmptyState = () => (
    <View className="flex-1 items-center justify-center px-10">
      <View className="w-32 h-32 bg-secondary-50 rounded-full items-center justify-center mb-6">
        <Ionicons name="notifications-off-outline" size={64} color="#cbd5e1" />
      </View>
      <Text className="text-xl font-extrabold text-secondary-900 text-center mb-2">
        Belum ada notifikasi
      </Text>
      <Text className="text-sm text-secondary-400 text-center leading-6">
        Kami akan memberi tahu Anda jika ada pembaruan terkait pengajuan atau informasi penting lainnya.
      </Text>
    </View>
  );

  return (
    <View className="flex-1 bg-secondary-50">
      {/* Header with Safe Area Handling */}
      <View 
        className="bg-white border-b border-secondary-100" 
        style={{ paddingTop: Math.max(insets.top, 20), paddingBottom: 16 }}
      >
        <View className="px-6 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              className="w-10 h-10 bg-secondary-50 rounded-full items-center justify-center mr-4 active:bg-secondary-100"
            >
              <Ionicons name="arrow-back" size={24} color="#475569" />
            </TouchableOpacity>
            <Text className="text-xl font-extrabold text-secondary-900 tracking-tight">
              Notifikasi
            </Text>
          </View>
          
          {Array.isArray(notifications) && notifications.some(n => !n.is_read) && (
            <TouchableOpacity 
              onPress={() => setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))}
              className="py-2 px-3 bg-primary-50 rounded-xl"
            >
              <Text className="text-primary-600 text-xs font-bold">Tandai baca</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Role Info Banner */}
      <View className="mx-4 mt-4 p-4 bg-primary-50 rounded-[20px] border border-primary-100 flex-row items-center">
        <View className="w-10 h-10 bg-primary-100 rounded-full items-center justify-center mr-3">
          <Ionicons name="information-circle" size={24} color="#2563eb" />
        </View>
        <View className="flex-1">
          <Text className="text-primary-900 text-xs font-bold mb-0.5">Informasi Layanan</Text>
          <Text className="text-primary-700 text-[11px] leading-4">
            {(user?.role === 'admin' || user?.role === 'validator' || user?.role === 'approver') 
              ? "Anda akan menerima notifikasi jika ada pengajuan baru yang memerlukan validasi Anda."
              : "Anda akan menerima notifikasi jika pengajuan yang Anda kirim telah diterima atau ditolak."}
          </Text>
        </View>
      </View>

      {loading && !refreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="mt-4 text-secondary-400 font-semibold animate-pulse">Memuat notifikasi...</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ 
            paddingTop: 20, 
            paddingBottom: 40,
            flexGrow: 1
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
          }
          ListEmptyComponent={<EmptyState />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};
