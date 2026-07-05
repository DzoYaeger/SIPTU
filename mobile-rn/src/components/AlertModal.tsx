import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertModalProps {
  visible: boolean;
  type: AlertType;
  title: string;
  message: string;
  onClose: () => void;
  buttonText?: string;
  autoClose?: number;
}

const THEME: Record<AlertType, {
  iconBg: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: string;
  buttonBg: string;
}> = {
  success: {
    iconBg: '#22c55e',
    icon: 'checkmark-sharp',
    accentColor: '#16a34a',
    buttonBg: '#22c55e',
  },
  error: {
    iconBg: '#ef4444',
    icon: 'close-sharp',
    accentColor: '#dc2626',
    buttonBg: '#ef4444',
  },
  warning: {
    iconBg: '#f59e0b',
    icon: 'warning-sharp',
    accentColor: '#d97706',
    buttonBg: '#f59e0b',
  },
  info: {
    iconBg: '#3b82f6',
    icon: 'information-sharp',
    accentColor: '#2563eb',
    buttonBg: '#3b82f6',
  },
};

export const AlertModal: React.FC<AlertModalProps> = ({
  visible,
  type,
  title,
  message,
  onClose,
  buttonText = 'OK',
  autoClose = 0,
}) => {
  const theme = THEME[type];

  React.useEffect(() => {
    if (visible && autoClose > 0) {
      const timer = setTimeout(() => onClose(), autoClose);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.overlay}>
        <Animated.View entering={FadeIn.duration(250)} style={styles.container}>
          {/* Accent Bar */}
          <View style={[styles.accentBar, { backgroundColor: theme.accentColor }]} />

          {/* Icon */}
          <View style={[styles.iconCircle, { backgroundColor: theme.iconBg }]}>
            <Ionicons name={theme.icon} size={28} color="#fff" />
          </View>

          {/* Text */}
          <Text style={[styles.title, { color: theme.accentColor }]}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {/* Button */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.buttonBg }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonLabel}>{buttonText}</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  container: {
    width: width - 64,
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  button: {
    width: '100%',
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
});
