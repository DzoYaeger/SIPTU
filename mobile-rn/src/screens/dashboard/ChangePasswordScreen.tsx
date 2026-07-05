import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, AlertModal } from '../../components';
import api from '../../services/api';

type AlertState = {
  visible: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
};

export const ChangePasswordScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [alert, setAlert] = useState<AlertState>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });
  const [shouldGoBack, setShouldGoBack] = useState(false);
  
  const [form, setForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });

  const showAlert = (type: AlertState['type'], title: string, message: string, goBack = false) => {
    setShouldGoBack(goBack);
    setAlert({ visible: true, type, title, message });
  };

  const handleAlertClose = () => {
    setAlert(prev => ({ ...prev, visible: false }));
    if (shouldGoBack) {
      navigation.goBack();
    }
  };

  const handleUpdate = async () => {
    if (!form.old_password || !form.new_password || !form.confirm_password) {
      showAlert('warning', 'Kolom Belum Lengkap', 'Harap isi semua kolom sebelum melanjutkan.');
      return;
    }

    if (form.new_password.length < 8) {
      showAlert('warning', 'Password Terlalu Pendek', 'Password baru harus minimal 8 karakter.');
      return;
    }

    if (form.new_password !== form.confirm_password) {
      showAlert('error', 'Tidak Cocok', 'Konfirmasi kata sandi baru tidak cocok. Silakan periksa kembali.');
      return;
    }

    setLoading(true);
    try {
      await api.put('/user/password', {
        current_password: form.old_password,
        password: form.new_password,
        password_confirmation: form.confirm_password,
      });
      showAlert('success', 'Password Diperbarui', 'Kata sandi Anda berhasil diperbarui. Gunakan password baru saat login berikutnya.', true);
    } catch (error: any) {
      const responseErrors = error.response?.data?.errors;
      const responseMessage = error.response?.data?.message;
      
      if (responseErrors?.current_password) {
        showAlert('error', 'Password Lama Salah', responseErrors.current_password[0] || 'Kata sandi saat ini yang Anda masukkan tidak benar.');
      } else if (responseErrors?.password) {
        showAlert('error', 'Password Tidak Valid', responseErrors.password[0] || 'Password baru tidak memenuhi syarat.');
      } else {
        showAlert('error', 'Gagal Mengubah', responseMessage || 'Terjadi kesalahan saat mengubah kata sandi. Silakan coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ganti Password</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.introSection}>
            <View style={styles.iconCircle}>
              <Ionicons name="lock-open-outline" size={32} color="#2563eb" />
            </View>
            <Text style={styles.introTitle}>Keamanan Akun</Text>
            <Text style={styles.introSub}>Gunakan kombinasi kata sandi yang kuat untuk menjaga keamanan akun Anda.</Text>
          </View>

          <Card padding="lg" style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Kata Sandi Lama</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="key-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Masukkan kata sandi saat ini"
                  secureTextEntry={!showOld}
                  value={form.old_password}
                  onChangeText={(val) => setForm(f => ({ ...f, old_password: val }))}
                />
                <TouchableOpacity onPress={() => setShowOld(!showOld)}>
                  <Ionicons name={showOld ? "eye-off-outline" : "eye-outline"} size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Kata Sandi Baru</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Masukkan kata sandi baru"
                  secureTextEntry={!showNew}
                  value={form.new_password}
                  onChangeText={(val) => setForm(f => ({ ...f, new_password: val }))}
                />
                <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                  <Ionicons name={showNew ? "eye-off-outline" : "eye-outline"} size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Konfirmasi Kata Sandi Baru</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Ulangi kata sandi baru"
                  secureTextEntry={!showConfirm}
                  value={form.confirm_password}
                  onChangeText={(val) => setForm(f => ({ ...f, confirm_password: val }))}
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                  <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <Button
                title="Perbarui Password"
                onPress={handleUpdate}
                loading={loading}
                variant="primary"
                className="h-16 rounded-2xl"
              />
            </View>
          </Card>

          <View style={styles.infoAlert}>
            <Ionicons name="information-circle" size={20} color="#2563eb" />
            <Text style={styles.infoText}>Password minimal terdiri dari 8 karakter.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Premium Alert Modal */}
      <AlertModal
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onClose={handleAlertClose}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  scrollContent: {
    padding: 24,
  },
  introSection: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 8,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  introTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  introSub: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
    fontWeight: '500',
  },
  formCard: {
    borderRadius: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.05,
    shadowRadius: 40,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    height: 60,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  buttonContainer: {
    marginTop: 12,
  },
  submitButton: {
    height: 60,
    borderRadius: 20,
  },
  infoAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 20,
    marginTop: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  infoText: {
    fontSize: 13,
    color: '#1d4ed8',
    fontWeight: '600',
  },
});
