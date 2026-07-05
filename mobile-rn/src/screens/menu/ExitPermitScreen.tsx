import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { 
  Button, 
  Input, 
  Card, 
  ConfirmModal, 
  SuccessModal 
} from '../../components';
import { cn } from '../../utils/cn';
import { exitPermitService } from '../../services/exitPermitService';
import { useAuthStore } from '../../store/authStore';

const { width } = Dimensions.get('window');

interface ExitPermitScreenProps {
  navigation: any;
}

export const ExitPermitScreen: React.FC<ExitPermitScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [phase, setPhase] = useState<'loading' | 'confirm' | 'out'>('loading');
  const [loading, setLoading] = useState(false);
  const [activePermit, setActivePermit] = useState<any>(null);
  const [reason, setReason] = useState('');
  
  // Menggunakan ref untuk permitType agar tidak trigger re-render
  const permitTypeRef = useRef<'Pribadi' | 'Kantor'>('Pribadi');
  const [selectedPermitType, setSelectedPermitType] = useState<'Pribadi' | 'Kantor'>('Pribadi');
  
  // Modal States
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'exit' | 'return'>('exit');

  // Location State
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setPhase('loading');
    try {
      const response = await exitPermitService.getMyActive();
      if (response.data.active_permit) {
        setActivePermit(response.data.active_permit);
        setPhase('out');
      } else {
        setPhase('confirm');
      }
    } catch (error: any) {
      console.error('Error fetching exit permit status:', error);
      setPhase('confirm');
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Izin lokasi diperlukan untuk fitur ini');
        return;
      }

      try {
        let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation(loc);
      } catch (e) {
        console.warn('Initial location fetch failed', e);
      }
    })();
  }, []);

  // Handler untuk pilihan permit type - update ref dan state lokal
  const handleSelectPermitType = (type: 'Pribadi' | 'Kantor') => {
    permitTypeRef.current = type;
    setSelectedPermitType(type);
  };

  const handleExitClick = () => {
    setModalMode('exit');
    setConfirmModalVisible(true);
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      .then(loc => setLocation(loc))
      .catch(e => console.warn('Background location refresh failed', e));
  };

  const handleReturnClick = () => {
    setModalMode('return');
    setConfirmModalVisible(true);
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      .then(loc => setLocation(loc))
      .catch(e => console.warn('Background location refresh failed', e));
  };

  const processAction = async () => {
    setConfirmModalVisible(false);
    setLoading(true);

    try {
      let currentLoc = location;
      const isLocationFresh = location && (Date.now() - location.timestamp < 60000);

      if (!isLocationFresh) {
        currentLoc = await Location.getCurrentPositionAsync({ 
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation(currentLoc);
      }
      
      if (!currentLoc) {
        throw new Error('Gagal mendapatkan lokasi GPS. Pastikan GPS aktif.');
      }

      if (modalMode === 'exit') {
        const payload = {
          reason: reason.trim() || undefined,
          permit_type: permitTypeRef.current, // Menggunakan nilai dari ref
          latitude: currentLoc.coords.latitude,
          longitude: currentLoc.coords.longitude,
        };
        const response = await exitPermitService.recordExit(payload);
        setActivePermit(response.data.permit);
        setPhase('out');
        setSuccessModalVisible(true);
      } else {
        const payload = {
          latitude: currentLoc.coords.latitude,
          longitude: currentLoc.coords.longitude,
        };
        await exitPermitService.recordReturn(activePermit.id, payload);
        setActivePermit(null);
        setPhase('confirm');
        setReason('');
        permitTypeRef.current = 'Pribadi';
        setSelectedPermitType('Pribadi');
        setSuccessModalVisible(true);
      }
    } catch (error: any) {
      console.error('Action error:', error);
      Alert.alert('Gagal', error.response?.data?.message || error.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '-';
    if (timeStr.includes('-')) return timeStr;
    const parts = timeStr.split(':');
    return `${parts[0]}:${parts[1]}`;
  };

  if (phase === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-secondary-50">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="mt-4 text-secondary-500 font-medium">Memuat data...</Text>
      </View>
    );
  }

  return (
    <View 
      className="flex-1 bg-secondary-50" 
      style={{ paddingTop: insets.top }}
    >
      {/* Header */}
      <View 
        className="bg-primary-600 px-6 pt-4 pb-12"
      >
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            className="p-2 -ml-2 rounded-full active:bg-primary-700"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold ml-4">
            Izin Keluar
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 -mt-6" showsVerticalScrollIndicator={false}>
        {/* Profile Info */}
        <View>
          <Card className="mb-4 shadow-sm">
            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-primary-100 rounded-full items-center justify-center">
                <Ionicons name="person" size={24} color="#2563eb" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-lg font-bold text-secondary-900">{user?.name}</Text>
                <Text className="text-sm text-secondary-500">NIP: {user?.nip}</Text>
              </View>
              <View className={cn(
                "px-3 py-1 rounded-full",
                phase === 'out' ? "bg-red-100" : "bg-green-100"
              )}>
                <Text className={cn(
                  "text-xs font-bold",
                  phase === 'out' ? "text-red-700" : "text-green-700"
                )}>
                  {phase === 'out' ? "DI LUAR" : "SIAP"}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {phase === 'confirm' ? (
          <View>
            <Card className="mb-4" variant="outlined">
              <Text className="text-base font-bold text-secondary-900 mb-4">
                Form Izin Keluar
              </Text>

              {/* Jenis Urusan Selection - Style Radio Button */}
              <Text className="text-sm font-semibold text-secondary-700 mb-2">
                Jenis Urusan <Text className="text-red-500">*</Text>
              </Text>
              <View className="flex-row mb-4 bg-secondary-100 rounded-xl p-1">
                <TouchableOpacity
                  onPress={() => handleSelectPermitType('Pribadi')}
                  activeOpacity={0.7}
                  className={cn(
                    "flex-1 py-3 rounded-lg items-center",
                    selectedPermitType === 'Pribadi' ? "bg-amber-500" : "bg-transparent"
                  )}
                >
                  <View className="flex-row items-center">
                    <Ionicons
                      name="person-outline"
                      size={16}
                      color={selectedPermitType === 'Pribadi' ? '#fff' : '#64748b'}
                    />
                    <Text className={cn(
                      "ml-2 font-bold text-sm",
                      selectedPermitType === 'Pribadi' ? "text-white" : "text-secondary-500"
                    )}>
                      Urusan Pribadi
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleSelectPermitType('Kantor')}
                  activeOpacity={0.7}
                  className={cn(
                    "flex-1 py-3 rounded-lg items-center",
                    selectedPermitType === 'Kantor' ? "bg-blue-600" : "bg-transparent"
                  )}
                >
                  <View className="flex-row items-center">
                    <Ionicons
                      name="briefcase-outline"
                      size={16}
                      color={selectedPermitType === 'Kantor' ? '#fff' : '#64748b'}
                    />
                    <Text className={cn(
                      "ml-2 font-bold text-sm",
                      selectedPermitType === 'Kantor' ? "text-white" : "text-secondary-500"
                    )}>
                      Urusan Kantor
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
              
              <Input
                label="Keperluan / Alasan (Opsional)"
                placeholder="Contoh: Keperluan ke Bank, dll"
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={3}
                style={{ height: 80, textAlignVertical: 'top' }}
                icon={<Ionicons name="chatbubble-outline" size={20} color="#64748b" />}
              />
              
              <View className="flex-row items-center mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
                <Ionicons name="location-outline" size={20} color="#2563eb" />
                <Text className="ml-2 text-xs text-blue-800 flex-1">
                  Izin keluar hanya dapat dicatat saat Anda berada di radius 100 meter dari kantor.
                </Text>
              </View>
            </Card>

            <Button
              title={loading ? "Memproses..." : "Izin Keluar Sekarang"}
              onPress={handleExitClick}
              disabled={loading}
              variant="primary"
              className="h-14 mb-8 shadow-lg shadow-primary-500/30"
              icon={!loading && <Ionicons name="exit-outline" size={22} color="white" />}
            />
          </View>
        ) : (
          <View>
            <Card className="mb-4 bg-red-50 border-red-100" variant="outlined">
              <View className="items-center py-4">
                <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4">
                  <Ionicons name="time-outline" size={32} color="#ef4444" />
                </View>
                <Text className="text-red-900 font-bold text-lg">Sedang Di Luar</Text>
                <Text className="text-red-600 mt-1">Tercatat Keluar Sejak</Text>
                <Text className="text-3xl font-black text-red-900 mt-2">
                  {formatTime(activePermit?.exit_time)}
                </Text>
              </View>

              <View className="border-t border-red-100 pt-4 mt-2">
                <Text className="text-xs text-red-700 font-medium mb-1 uppercase tracking-wider">Keperluan:</Text>
                <Text className="text-secondary-800 italic">
                  "{activePermit?.reason || 'Tidak ada alasan spesifik'}"
                </Text>
                <View className="mt-4 flex-row items-center">
                  <Text className="text-xs text-red-700 font-medium mr-2 uppercase tracking-wider">Jenis Urusan:</Text>
                  <View className={cn(
                    "px-3 py-1 rounded-full",
                    activePermit?.permit_type === 'Kantor' ? "bg-blue-100" : "bg-amber-100"
                  )}>
                    <Text className={cn(
                      "text-[10px] font-black uppercase",
                      activePermit?.permit_type === 'Kantor' ? "text-blue-700" : "text-amber-700"
                    )}>
                      {activePermit?.permit_type === 'Kantor' ? 'Urusan Kantor' : 'Urusan Pribadi'}
                    </Text>
                  </View>
                </View>
              </View>
            </Card>

            <Button
              title={loading ? "Memproses..." : "Tandai Sudah Kembali"}
              onPress={handleReturnClick}
              disabled={loading}
              variant="primary"
              className="h-14 mb-8 shadow-lg shadow-primary-500/30"
              icon={!loading && <Ionicons name="enter-outline" size={22} color="white" />}
            />
          </View>
        )}
        
        {/* Info Card */}
        <View>
          <Card className="bg-secondary-100 border-secondary-200 mb-20">
            <View className="flex-row">
              <View className="w-10 h-10 bg-secondary-200 rounded-full items-center justify-center">
                <Ionicons name="information-circle" size={24} color="#64748b" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-secondary-900 font-bold mb-1">Cara Penggunaan</Text>
                <Text className="text-secondary-600 text-sm leading-5">
                  1. Pilih Jenis Urusan (Pribadi/Kantor).{'\n'}
                  2. Klik tombol "Izin Keluar" saat akan meninggalkan kantor.{'\n'}
                  3. Klik tombol "Tandai Kembali" segera setelah sampai kembali di kantor.{'\n'}
                  4. Pastikan GPS aktif untuk validasi posisi.
                </Text>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* Modals */}
      <ConfirmModal
        visible={confirmModalVisible}
        title={modalMode === 'exit' ? "Konfirmasi Keluar" : "Konfirmasi Kembali"}
        message={modalMode === 'exit' 
          ? "Apakah Anda yakin ingin mencatat waktu keluar sekarang?" 
          : "Apakah Anda yakin ingin mencatat waktu kembali sekarang?"
        }
        onConfirm={processAction}
        onCancel={() => setConfirmModalVisible(false)}
        confirmText={modalMode === 'exit' ? "Ya, Keluar" : "Ya, Kembali"}
        cancelText="Batal"
      />

      <SuccessModal
        visible={successModalVisible}
        title="Berhasil!"
        message={modalMode === 'exit' 
          ? "Waktu keluar Anda telah berhasil dicatat." 
          : "Waktu kembali Anda telah berhasil dicatat. Selesai!"
        }
        onClose={() => setSuccessModalVisible(false)}
        buttonText="Tutup"
      />
    </View>
  );
};
