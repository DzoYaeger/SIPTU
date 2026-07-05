import React from 'react';
import { View, Text, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';

interface SuccessModalProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  buttonText?: string;
  onSecondaryAction?: () => void;
  secondaryButtonText?: string;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  visible,
  title,
  message,
  onClose,
  buttonText = 'Selesai',
  onSecondaryAction,
  secondaryButtonText,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-white justify-center items-center p-6">
        <View className="items-center w-full">
          {/* Background Pulse */}
          <View className="w-32 h-32 bg-primary-50 rounded-full items-center justify-center mb-8">
            <View className="w-24 h-24 bg-primary-100 rounded-full items-center justify-center">
              <View className="w-16 h-16 bg-primary-600 rounded-full items-center justify-center shadow-lg shadow-primary-500/50">
                <Ionicons name="checkmark" size={40} color="white" />
              </View>
            </View>
          </View>

          <View className="items-center">
            <Text className="text-3xl font-extrabold text-secondary-900 text-center mb-3">
              {title}
            </Text>
            <Text className="text-lg text-secondary-500 text-center leading-6 mb-12 px-4">
              {message}
            </Text>
          </View>

          <View className="w-full max-w-xs gap-3">
            {onSecondaryAction && secondaryButtonText && (
              <Button
                title={secondaryButtonText}
                variant="outline"
                onPress={onSecondaryAction}
                size="lg"
                className="rounded-2xl"
              />
            )}
            <Button
              title={buttonText}
              onPress={onClose}
              size="lg"
              className="rounded-2xl"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};
