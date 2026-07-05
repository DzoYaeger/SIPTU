import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Animated, { 
  FadeIn, 
  FadeInUp, 
  FadeOut,
  Layout, 
  ZoomIn,
} from 'react-native-reanimated';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Card } from '../../components/Card';
import { ConfirmModal } from '../../components/ConfirmModal';
import { SuccessModal } from '../../components/SuccessModal';
import SignatureModal from '../../components/SignatureModal';
import { InventoryItemSelect } from '../../components/InventoryItemSelect';
import { cn } from '../../utils/cn';
import { inventoryService } from '../../services/inventoryService';
import { useAuthStore } from '../../store/authStore';

const AnimatedCard = Animated.createAnimatedComponent(Card);

interface SelectedItem {
  id: number;
  inventory_id: number;
  item_name: string;
  qty_requested: number;
  unit: string;
  stok_available: number;
}

export const InventoryRequestScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [catatan, setCatatan] = useState('');
  
  // Modal States
  const [itemSelectVisible, setItemSelectVisible] = useState(false);
  const [signatureVisible, setSignatureVisible] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [spbNumber, setSpbNumber] = useState('');

  const fetchInventory = useCallback(async () => {
    setItemsLoading(true);
    try {
      const data = await inventoryService.listPublicInventory();
      setAvailableItems(data);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      Alert.alert('Error', 'Gagal memuat data persediaan.');
    } finally {
      setItemsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleAddItem = (item: any) => {
    const exists = selectedItems.find(i => i.inventory_id === item.id);
    if (exists) {
      Alert.alert('Informasi', 'Barang sudah ada di daftar.');
      return;
    }

    setSelectedItems([
      ...selectedItems,
      {
        id: Date.now(), // Local UI ID
        inventory_id: item.id,
        item_name: item.nama_barang,
        qty_requested: 1,
        unit: item.satuan || 'Pcs',
        stok_available: item.stok,
      }
    ]);
    setItemSelectVisible(false);
  };

  const handleUpdateQty = (id: number, increment: boolean) => {
    setSelectedItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = increment ? item.qty_requested + 1 : Math.max(1, item.qty_requested - 1);
        if (increment && newQty > item.stok_available) {
          Alert.alert('Peringatan', `Stok tidak mencukupi (tersedia ${item.stok_available}).`);
          return item;
        }
        return { ...item, qty_requested: newQty };
      }
      return item;
    }));
  };

  const handleRemoveItem = (id: number) => {
    setSelectedItems(prev => prev.filter(item => item.id !== id));
  };

  const handlePreSubmit = () => {
    if (selectedItems.length === 0) {
      Alert.alert('Peringatan', 'Tambahkan minimal satu barang.');
      return;
    }
    setSignatureVisible(true);
  };

  const onSignatureCapture = (signature: string) => {
    setSignatureVisible(false);
    setConfirmModalVisible(true);
  };

  const handleSubmit = async (signature: string) => {
    setConfirmModalVisible(false);
    setLoading(true);

    try {
      const payload = {
        nip: user?.nip || '',
        nama: user?.name || '',
        fungsi_bidang: (user as any)?.fungsi_bidang || '',
        catatan: catatan.trim() || undefined,
        requester_signature: signature,
        items: selectedItems.map(item => ({
          inventory_id: item.inventory_id,
          item_name: item.item_name,
          qty_requested: item.qty_requested,
          unit: item.unit,
        })),
      };

      const response = await inventoryService.createRequest(payload);
      setSpbNumber(response.data.spb_number);
      setSuccessModalVisible(true);
      setSelectedItems([]);
      setCatatan('');
    } catch (error: any) {
      console.error('Submission error:', error);
      Alert.alert('Gagal', error.response?.data?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-secondary-50">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        {/* Header */}
        <Animated.View 
          entering={FadeIn.duration(400)}
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
              Permintaan Barang
            </Text>
          </View>
        </Animated.View>

        <ScrollView className="flex-1 px-4 -mt-6">
          {/* User Info */}
          <AnimatedCard 
            entering={FadeInUp.delay(100).springify()}
            className="mb-4"
          >
            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-primary-100 rounded-full items-center justify-center">
                <Ionicons name="person" size={24} color="#2563eb" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-lg font-bold text-secondary-900">{user?.name}</Text>
                <Text className="text-sm text-secondary-500">NIP: {user?.nip}</Text>
              </View>
              <View className="bg-blue-100 px-3 py-1 rounded-full">
                <Text className="text-blue-700 text-[10px] font-bold">PEMOHON</Text>
              </View>
            </View>
          </AnimatedCard>

          {/* Items Section */}
          <View className="mb-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-base font-bold text-secondary-900">Barang yang Diminta</Text>
              <TouchableOpacity 
                onPress={() => setItemSelectVisible(true)}
                className="flex-row items-center bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-100"
              >
                <Ionicons name="add-circle" size={20} color="#2563eb" />
                <Text className="ml-1.5 text-primary-600 font-bold text-xs">Tambah</Text>
              </TouchableOpacity>
            </View>

            {selectedItems.length === 0 ? (
              <Animated.View 
                entering={FadeIn.delay(200)}
                className="items-center justify-center py-10 bg-white rounded-3xl border border-dashed border-secondary-300"
              >
                <Ionicons name="cart-outline" size={48} color="#94a3b8" />
                <Text className="text-secondary-400 mt-2 font-medium">Belum ada barang yang dipilih</Text>
              </Animated.View>
            ) : (
              <View>
                {selectedItems.map((item, index) => (
                  <Animated.View 
                    key={item.id}
                    entering={FadeInUp.delay(index * 100).springify()}
                    exiting={FadeOut.duration(200)}
                    layout={Layout.springify()}
                  >
                    <Card className="mb-3 p-4" variant="outlined">
                      <View className="flex-row justify-between">
                        <View className="flex-1 mr-4">
                          <Text className="text-secondary-900 font-bold mb-1">{item.item_name}</Text>
                          <Text className="text-secondary-500 text-xs">Tersedia: {item.stok_available} {item.unit}</Text>
                        </View>
                        
                        <View className="flex-row items-center bg-secondary-50 rounded-xl px-2">
                          <TouchableOpacity 
                            onPress={() => handleUpdateQty(item.id, false)}
                            className="p-2"
                          >
                            <Ionicons name="remove-circle-outline" size={24} color="#64748b" />
                          </TouchableOpacity>
                          
                          <View className="min-w-[40px] items-center">
                            <Text className="text-secondary-900 font-bold text-lg">{item.qty_requested}</Text>
                          </View>
                          
                          <TouchableOpacity 
                            onPress={() => handleUpdateQty(item.id, true)}
                            className="p-2"
                          >
                            <Ionicons name="add-circle-outline" size={24} color="#2563eb" />
                          </TouchableOpacity>
                        </View>

                        <TouchableOpacity 
                          onPress={() => handleRemoveItem(item.id)}
                          className="ml-3 p-2 bg-red-50 rounded-full"
                        >
                          <Ionicons name="trash-outline" size={18} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </Card>
                  </Animated.View>
                ))}
              </View>
            )}
          </View>

          {/* Notes Section */}
          <AnimatedCard 
            entering={FadeInUp.delay(300).springify()}
            className="mb-8"
          >
            <Input
              label="Catatan Tambahan (Opsional)"
              placeholder="Contoh: Untuk operasional tim, dll"
              value={catatan}
              onChangeText={setCatatan}
              multiline
              numberOfLines={3}
              className="h-24"
              icon={<Ionicons name="document-text-outline" size={20} color="#64748b" />}
            />
          </AnimatedCard>

          <Button
            title={loading ? "Mengirim..." : "Ajukan Permintaan"}
            onPress={handlePreSubmit}
            disabled={loading || selectedItems.length === 0}
            variant="primary"
            className="h-14 mb-10"
            icon={!loading && <Ionicons name="paper-plane" size={20} color="white" />}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modals */}
      <InventoryItemSelect
        visible={itemSelectVisible}
        onClose={() => setItemSelectVisible(false)}
        onSelect={handleAddItem}
        items={availableItems}
        loading={itemsLoading}
      />

      <SignatureModal
        visible={signatureVisible}
        onClose={() => setSignatureVisible(false)}
        onOK={(sig) => {
          setSignatureVisible(false);
          // Set temporary store for the signature to use in confirm
          (window as any).__tempSig = sig;
          setConfirmModalVisible(true);
        }}
        title="Tanda Tangan Pemohon"
      />

      <ConfirmModal
        visible={confirmModalVisible}
        title="Konfirmasi Permintaan"
        message={`Apakah Anda yakin ingin mengajukan permintaan untuk ${selectedItems.length} jenis barang?`}
        onConfirm={() => handleSubmit((window as any).__tempSig)}
        onCancel={() => setConfirmModalVisible(false)}
        confirmText="Ya, Ajukan"
        cancelText="Batal"
      />

      <SuccessModal
        visible={successModalVisible}
        title="Berhasil Diajukan!"
        message={`Permintaan persediaan Anda telah tercatat dengan No. SPB: ${spbNumber}`}
        onClose={() => {
          setSuccessModalVisible(false);
          navigation.goBack();
        }}
        buttonText="Ke Dashboard"
      />
    </SafeAreaView>
  );
};
