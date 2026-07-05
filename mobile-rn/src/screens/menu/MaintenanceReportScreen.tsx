import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// import { SafeAreaView } from 'react-native-safe-area-context';
import { View as RNView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';

import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ConfirmModal } from '../../components/ConfirmModal';
import { SuccessModal } from '../../components/SuccessModal';
import { AssetItemSelect } from '../../components/AssetItemSelect';
import { 
  maintenanceService, 
  BmnAsset, 
  MaintenanceReportPayload 
} from '../../services/maintenanceService';
import { cn } from '../../utils/cn';
import { useAuthStore } from '../../store/authStore';

export const MaintenanceReportScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [reportNumber, setReportNumber] = useState("");

  const [reportType, setReportType] = useState<'pemeliharaan' | 'keluhan'>('pemeliharaan');
  const [selectedAsset, setSelectedAsset] = useState<BmnAsset | null>(null);
  const [details, setDetails] = useState("");
  
  const [assets, setAssets] = useState<BmnAsset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    setLoadingAssets(true);
    try {
      const data = await maintenanceService.listAssets();
      setAssets(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingAssets(false);
    }
  };

  const handleSubmit = async () => {
    if (reportType === 'pemeliharaan' && !selectedAsset) {
      return Alert.alert('Peringatan', 'Mohon pilih aset yang bermasalah');
    }
    if (!details.trim()) {
      return Alert.alert('Peringatan', 'Mohon isi detail laporan');
    }

    setLoading(true);
    const payload: MaintenanceReportPayload = {
      report_type: reportType,
      asset_id: reportType === 'pemeliharaan' ? selectedAsset!.id : null,
      report_details: details,
    };

    try {
      const res = await maintenanceService.createReport(payload);
      if (res.report_number) {
        setReportNumber(res.report_number);
        setSubmitted(true);
      } else {
        Alert.alert('Error', res.message || 'Gagal mengirim laporan');
      }
    } catch (error) {
      Alert.alert('Error', 'Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  return (
    <View className="flex-1 bg-secondary-50" style={{ paddingTop: Platform.OS === 'ios' ? 50 : 0 }}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="px-6 py-4 flex-row items-center justify-between">
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-secondary-900">Laporan BMN</Text>
          <View className="w-10" />
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-6 py-4">
            <Card className="mb-6 p-0 overflow-hidden">
              <View className="bg-primary-600 p-6">
                <View className="flex-row items-center">
                  <View className="w-12 h-12 rounded-2xl bg-white/20 items-center justify-center mr-4">
                    <Ionicons name="construct" size={24} color="white" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-bold text-lg">Input Keluhan/Kebutuhan</Text>
                    <Text className="text-primary-100 text-xs">Layanan pemeliharaan & pelaporan aset</Text>
                  </View>
                </View>
              </View>

              <View className="p-6">
                <Text className="text-secondary-700 font-bold mb-3">Jenis Laporan</Text>
                <View className="flex-row bg-secondary-100 p-1 rounded-xl mb-6">
                  <TouchableOpacity 
                    onPress={() => {
                      setReportType('pemeliharaan');
                      setSelectedAsset(null);
                    }}
                    className="flex-1 py-3 rounded-lg items-center flex-row justify-center"
                    style={reportType === 'pemeliharaan' ? {
                      backgroundColor: 'white',
                      ...Platform.select({
                        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
                        android: { elevation: 2 }
                      })
                    } : {}}
                  >
                    <Ionicons 
                      name="build" 
                      size={18} 
                      color={reportType === 'pemeliharaan' ? "#2563eb" : "#94a3b8"} 
                    />
                    <Text 
                      className="ml-2 font-bold text-sm"
                      style={{ color: reportType === 'pemeliharaan' ? "#2563eb" : "#94a3b8" }}
                    >PEMELIHARAAN</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => {
                      setReportType('keluhan');
                      setSelectedAsset(null);
                    }}
                    className="flex-1 py-3 rounded-lg items-center flex-row justify-center"
                    style={reportType === 'keluhan' ? {
                      backgroundColor: 'white',
                      ...Platform.select({
                        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
                        android: { elevation: 2 }
                      })
                    } : {}}
                  >
                    <Ionicons 
                      name="alert-circle" 
                      size={18} 
                      color={reportType === 'keluhan' ? "#2563eb" : "#94a3b8"} 
                    />
                    <Text 
                      className="ml-2 font-bold text-sm"
                      style={{ color: reportType === 'keluhan' ? "#2563eb" : "#94a3b8" }}
                    >KELUHAN</Text>
                  </TouchableOpacity>
                </View>

                {reportType === 'pemeliharaan' ? (
                  <View>
                    <Text className="text-secondary-700 font-bold mb-3">Pilih Aset BMN</Text>
                    <TouchableOpacity 
                      onPress={() => setShowAssetModal(true)}
                      className="p-4 rounded-xl border mb-6 flex-row items-center"
                      style={{
                        backgroundColor: selectedAsset ? 'white' : '#f8fafc',
                        borderColor: selectedAsset ? '#bfdbfe' : '#e2e8f0',
                        borderStyle: selectedAsset ? 'solid' : 'dashed'
                      }}
                    >
                      <Ionicons 
                        name={selectedAsset ? "cube" : "search-outline"} 
                        size={24} 
                        color={selectedAsset ? "#2563eb" : "#94a3b8"} 
                        className="mr-3"
                      />
                      <View className="flex-1 ml-2">
                        <Text 
                          className="font-bold"
                          style={{ color: selectedAsset ? "#0f172a" : "#94a3b8" }}
                        >
                          {selectedAsset ? selectedAsset.name : "Klik untuk mencari aset..."}
                        </Text>
                        {selectedAsset && (
                          <Text className="text-secondary-500 text-[10px] mt-0.5">
                            Kode: {selectedAsset.asset_code}
                          </Text>
                        )}
                      </View>
                      {selectedAsset && (
                        <TouchableOpacity onPress={() => setSelectedAsset(null)}>
                          <Ionicons name="close-circle" size={20} color="#cbd5e1" />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : null}

                <Text className="text-secondary-700 font-bold mb-3">Detail Permasalahan</Text>
                <TextInput 
                  multiline
                  numberOfLines={6}
                  placeholder="Tuliskan detail kendala atau kebutuhan pemeliharaan secara lengkap..."
                  className="bg-secondary-50 p-4 rounded-xl border border-secondary-200 text-secondary-900 h-40"
                  textAlignVertical="top"
                  value={details}
                  onChangeText={setDetails}
                />
              </View>
            </Card>

            <View className="bg-secondary-100 p-4 rounded-2xl flex-row items-center mb-8">
              <Ionicons name="information-circle" size={20} color="#64748b" />
              <Text className="flex-1 ml-3 text-secondary-500 text-xs">
                Laporan Anda akan otomatis masuk ke dashboard admin BMN untuk segera ditindaklanjuti.
              </Text>
            </View>

            <Button 
              title="Kirim Laporan"
              onPress={() => setShowConfirm(true)}
              loading={loading}
              className="bg-primary-600 shadow-lg shadow-primary-300"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <AssetItemSelect 
        visible={showAssetModal}
        onClose={() => setShowAssetModal(false)}
        assets={assets}
        loading={loadingAssets}
        onSelect={(asset) => setSelectedAsset(asset)}
      />

      <ConfirmModal 
        visible={showConfirm}
        onCancel={() => setShowConfirm(false)}
        onConfirm={handleSubmit}
        title="Kirim Laporan?"
        message="Pastikan detail masalah sudah jelas agar mudah diproses."
        loading={loading}
      />

      <SuccessModal 
        visible={submitted}
        onClose={() => {
          setSubmitted(false);
          navigation.navigate('MainTabs');
        }}
        title="Laporan Terkirim!"
        message={`Nomor Laporan: ${reportNumber}\nTim kami akan segera memproses laporan Anda.`}
      />
    </View>
  );
};
