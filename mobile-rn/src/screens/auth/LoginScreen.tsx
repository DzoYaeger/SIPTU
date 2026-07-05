import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, AlertModal } from '../../components';
import { useAuthStore } from '../../store/authStore';
import { LoginCredentials } from '../../types';

type AlertState = {
  visible: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
};

export const LoginScreen: React.FC = () => {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    nip: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<LoginCredentials>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [alert, setAlert] = useState<AlertState>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });
  
  const { login, isLoading } = useAuthStore();

  const showAlert = (type: AlertState['type'], title: string, message: string) => {
    setAlert({ visible: true, type, title, message });
  };

  const validate = (): boolean => {
    const newErrors: Partial<LoginCredentials> = {};
    
    if (!credentials.nip) {
      newErrors.nip = 'NIP wajib diisi';
    } else if (!/^\d+$/.test(credentials.nip)) {
      newErrors.nip = 'NIP hanya boleh berisi angka';
    }
    
    if (!credentials.password) {
      newErrors.password = 'Password wajib diisi';
    } else if (credentials.password.length < 6) {
      newErrors.password = 'Password minimal 6 karakter';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    
    try {
      await login(credentials);
    } catch (error: any) {
      console.warn('Login error:', error);
      
      const responseErrors = error.response?.data?.errors;
      const responseMessage = error.response?.data?.message;
      
      // Laravel ValidationException returns field-specific errors
      if (responseErrors) {
        if (responseErrors.nip) {
          showAlert('error', 'NIP Tidak Terdaftar', responseErrors.nip[0] || 'NIP tidak ditemukan dalam sistem.');
        } else if (responseErrors.password) {
          showAlert('error', 'Password Salah', responseErrors.password[0] || 'Kata sandi yang Anda masukkan salah.');
        } else {
          const firstError = Object.values(responseErrors).flat()[0] as string;
          showAlert('error', 'Login Gagal', firstError || 'Terjadi kesalahan validasi.');
        }
      } else if (error.message?.includes('Network Error')) {
        showAlert('warning', 'Koneksi Bermasalah', 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
      } else {
        const message = responseMessage || error.message || 'Terjadi kesalahan. Silakan coba lagi.';
        showAlert('error', 'Login Gagal', message);
      }
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          className="px-6"
        >
          {/* Logo Section */}
          <View className="items-center mt-12 mb-8">
            <View className="w-24 h-24 bg-primary-100 rounded-2xl items-center justify-center mb-4">
              <Ionicons name="cube-outline" size={48} color="#2563eb" />
            </View>
            <Text className="text-2xl font-bold text-secondary-900">
              SIPTU Mobile
            </Text>
            <Text className="text-secondary-500 text-center mt-2">
              Sistem Informasi Pelayanan{'\n'}Tata Usaha
            </Text>
          </View>

          {/* Form Section */}
          <View className="space-y-4">
            <Text className="text-xl font-bold text-secondary-900 mb-4">
              Masuk
            </Text>
            
            <Input
              label="NIP"
              placeholder="Masukkan NIP Anda"
              value={credentials.nip}
              onChangeText={(text) => {
                setCredentials({ ...credentials, nip: text });
                if (errors.nip) setErrors({ ...errors, nip: undefined });
              }}
              error={errors.nip}
              icon={<Ionicons name="card-outline" size={20} color="#64748b" />}
              keyboardType="numeric"
              autoCapitalize="none"
            />

            <Input
              label="Password"
              placeholder="Masukkan password Anda"
              value={credentials.password}
              onChangeText={(text) => {
                setCredentials({ ...credentials, password: text });
                if (errors.password) setErrors({ ...errors, password: undefined });
              }}
              error={errors.password}
              icon={<Ionicons name="lock-closed-outline" size={20} color="#64748b" />}
              rightIcon={
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#64748b" />
                </TouchableOpacity>
              }
              secureTextEntry={!showPassword}
            />

            <Button
              title="Masuk"
              onPress={handleLogin}
              loading={isLoading}
              className="mt-4"
            />
          </View>

          {/* Footer */}
          <View className="mt-auto py-6">
            <Text className="text-center text-secondary-400 text-sm">
              © 2025 BPOM Palopo. All rights reserved.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Alert Modal untuk error/warning */}
      <AlertModal
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onClose={() => setAlert(prev => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
};
