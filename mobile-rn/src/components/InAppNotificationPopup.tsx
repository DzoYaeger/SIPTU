import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { navigationRef } from '../navigation/navigationUtils';

const { width } = Dimensions.get('window');

interface Props {
  notification: {
    id: string;
    title: string;
    message: string;
    type: string;
  } | null;
  onClose: () => void;
}

export const InAppNotificationPopup: React.FC<Props> = ({ notification, onClose }) => {
  const insets = useSafeAreaInsets();
  const autoCloseTimer = useRef<NodeJS.Timeout | null>(null);
  const translateY = useRef(new Animated.Value(-200)).current;

  useEffect(() => {
    if (notification) {
      // Slide in
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
      
      // Auto close after 6 seconds
      if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
      autoCloseTimer.current = setTimeout(() => {
        handleDismiss();
      }, 6000);
    } else {
      translateY.setValue(-200);
    }
    
    return () => {
      if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
    };
  }, [notification]);

  const handleDismiss = () => {
    Animated.timing(translateY, {
      toValue: -200,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const handlePress = () => {
    if (notification) {
      handleDismiss();
      // Navigasi hanya jika navigationRef sudah ready
      if (navigationRef.isReady()) {
        navigationRef.navigate('Notifications' as never);
      }
    }
  };

  if (!notification) return null;

  return (
    <Animated.View
      style={{ 
        position: 'absolute', 
        top: insets.top + 10, 
        left: 16, 
        right: 16, 
        zIndex: 9999,
        transform: [{ translateY }],
      }}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        className="bg-white rounded-[24px] border border-primary-100 shadow-2xl shadow-primary-500/30 flex-row items-center p-4 overflow-hidden"
      >
        <View className="w-12 h-12 bg-primary-500 rounded-2xl items-center justify-center mr-4">
          <Ionicons name="checkmark-circle" size={28} color="#fff" />
        </View>
        
        <View className="flex-1 mr-2">
          <Text className="text-secondary-900 font-extrabold text-sm mb-0.5" numberOfLines={1}>
            {notification.title}
          </Text>
          <Text className="text-secondary-500 text-[11px] leading-4" numberOfLines={2}>
            {notification.message}
          </Text>
        </View>

        <TouchableOpacity 
          onPress={handleDismiss}
          className="w-8 h-8 bg-secondary-50 rounded-full items-center justify-center"
        >
          <Ionicons name="close" size={18} color="#94a3b8" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};
