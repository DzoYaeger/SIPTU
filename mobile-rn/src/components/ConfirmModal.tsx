import React from 'react';
import { View, Text, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'primary' | 'warning' | 'danger';
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  type = 'primary',
  loading = false,
}) => {
  const getIcon = () => {
    switch (type) {
      case 'danger': return 'alert-circle';
      case 'warning': return 'warning';
      default: return 'help-circle';
    }
  };

  const getColorClass = () => {
    switch (type) {
      case 'danger': return 'bg-red-100 text-red-600';
      case 'warning': return 'bg-amber-100 text-amber-600';
      default: return 'bg-primary-100 text-primary-600';
    }
  };

  const getButtonVariant = () => {
    switch (type) {
      case 'danger': return 'danger';
      default: return 'primary';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/60 justify-center items-center p-6">
        <TouchableOpacity 
          className="absolute inset-0 bg-black/20"
          activeOpacity={1}
          onPress={onCancel}
        />
        
        <View className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
          <View className="p-6 items-center">
            <View className={cn("w-16 h-16 rounded-full items-center justify-center mb-4", getColorClass().split(' ')[0])}>
              <Ionicons 
                name={getIcon()} 
                size={32} 
                color={type === 'danger' ? '#dc2626' : type === 'warning' ? '#d97706' : '#2563eb'}
              />
            </View>
            
            <Text className="text-xl font-bold text-secondary-900 text-center mb-2">
              {title}
            </Text>
            
            <Text className="text-secondary-600 text-center leading-5 mb-6">
              {message}
            </Text>
            
            <View className="flex-row w-full gap-3">
              <Button
                title={cancelText}
                variant="outline"
                onPress={onCancel}
                className="flex-1"
                disabled={loading}
              />
              <Button
                title={confirmText}
                variant={getButtonVariant() as any}
                onPress={onConfirm}
                className="flex-1"
                loading={loading}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};
