import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator, 
  Alert,
  TextInput,
  Platform,
} from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
import { View as RNView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeIn, FadeInUp, Layout } from 'react-native-reanimated';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { SuccessModal } from '../../components/SuccessModal';
import { pdttService, PdttItem } from '../../services/pdttService';
import { cn } from '../../utils/cn';
import dayjs from 'dayjs';
import 'dayjs/locale/id';

dayjs.locale('id');

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val);
};

export const PdttRequestScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<PdttItem[]>([]);
  const [period, setPeriod] = useState('');
  const [saldo, setSaldo] = useState(0);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [selectedKeys, setSelectedKeys] = useState<number[]>([]);
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data, meta } = await pdttService.getRequestableItems();
      setItems(data);
      setPeriod(meta.period);
      setSaldo(meta.saldo);

      // Check for existing request
      const prevReqs = await pdttService.getPreviousRequests();
      const currentReq = prevReqs.data?.find((r: any) => r.period === meta.period);
      
      if (currentReq) {
        const nextKeys: number[] = [];
        const nextQty: Record<number, number> = {};
        (currentReq.items || []).forEach((it: any) => {
          const id = it.pdtt_item_id || it.pdtt_item?.id;
          if (id) {
            nextKeys.push(id);
            nextQty[id] = it.jumlah || 1;
          }
        });
        setSelectedKeys(nextKeys);
        setQuantities(nextQty);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Gagal memuat data pengadaan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const toggleItem = (id: number) => {
    setSelectedKeys(prev => {
      if (prev.includes(id)) {
        const next = prev.filter(k => k !== id);
        setQuantities(q => {
          const nextQ = { ...q };
          delete nextQ[id];
          return nextQ;
        });
        return next;
      } else {
        setQuantities(q => ({ ...q, [id]: 1 }));
        return [...prev, id];
      }
    });
  };

  const updateQty = (id: number, val: number) => {
    if (val < 1) return;
    setQuantities(prev => ({ ...prev, [id]: val }));
  };

  const totalPrice = useMemo(() => {
    return selectedKeys.reduce((acc, id) => {
      const item = items.find(i => i.id === id);
      return acc + ((item?.price || 0) * (quantities[id] || 0));
    }, 0);
  }, [selectedKeys, quantities, items]);

  const remainingSaldo = saldo - totalPrice;

  const handleSubmit = async () => {
    if (selectedKeys.length === 0) {
      Alert.alert('Peringatan', 'Pilih minimal satu barang.');
      return;
    }

    if (remainingSaldo < 0) {
      Alert.alert('Peringatan', 'Total pengajuan melebihi sisa saldo.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        period,
        items: selectedKeys.map(id => ({
          item_id: id,
          jumlah: quantities[id] || 1,
        })),
      };
      await pdttService.submitRequest(payload);
      setSuccessModalVisible(true);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Gagal mengirim pengajuan.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderItem = ({ item, index }: { item: PdttItem; index: number }) => {
    const isSelected = selectedKeys.includes(item.id);
    const qty = quantities[item.id] || 0;

    return (
      <Animated.View 
        entering={FadeInUp.delay(index * 100).duration(400)}
        className="mb-4 mx-6"
      >
        <TouchableOpacity 
          activeOpacity={0.7}
          onPress={() => toggleItem(item.id)}
          className={cn(
            "bg-white rounded-3xl p-4 border shadow-sm",
            isSelected ? "border-primary-500 bg-primary-50" : "border-secondary-100"
          )}
        >
          <View className="flex-row items-center mb-2">
            <View className={cn(
              "w-6 h-6 rounded-full border items-center justify-center mr-3",
              isSelected ? "bg-primary-500 border-primary-500" : "border-secondary-300"
            )}>
              {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
            </View>
            <View className="flex-1">
              <Text className="text-secondary-900 font-bold text-lg">
                {item.item_name}
              </Text>
              {item.brand && (
                <Text className="text-secondary-500 text-sm">
                  {item.brand}
                </Text>
              )}
            </View>
          </View>

          <View className="flex-row justify-between items-center mt-2 border-t border-secondary-100 pt-3">
            <View>
              <Text className="text-secondary-400 text-xs mb-1">Harga Estimasi</Text>
              <Text className="text-primary-600 font-bold">
                {formatCurrency(item.price)}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-secondary-400 text-xs mb-1">Satuan: {item.satuan}</Text>
              {item.jumlah !== null && (
                <Text className="text-secondary-500 text-xs">Master: {item.jumlah}</Text>
              )}
            </View>
          </View>

          {isSelected && (
            <Animated.View entering={FadeIn} className="mt-4 flex-row items-center justify-between bg-white p-3 rounded-2xl border border-primary-100">
              <Text className="text-secondary-700 font-medium ml-1">Kuantitas:</Text>
              <View className="flex-row items-center">
                <TouchableOpacity 
                  onPress={() => updateQty(item.id, qty - 1)}
                  className="w-10 h-10 bg-secondary-50 rounded-xl items-center justify-center active:bg-secondary-100"
                >
                  <Ionicons name="remove" size={20} color="#64748b" />
                </TouchableOpacity>
                <TextInput
                  value={qty.toString()}
                  onChangeText={(val) => updateQty(item.id, parseInt(val) || 0)}
                  keyboardType="numeric"
                  className="w-12 text-center text-lg font-bold text-secondary-900"
                />
                <TouchableOpacity 
                  onPress={() => updateQty(item.id, qty + 1)}
                  className="w-10 h-10 bg-primary-100 rounded-xl items-center justify-center active:bg-primary-200"
                >
                  <Ionicons name="add" size={20} color="#2563eb" />
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View className="flex-1 bg-secondary-50" style={{ paddingTop: Platform.OS === 'ios' ? 50 : 0 }}>
      <Animated.View 
        entering={FadeIn.duration(400)}
        className="bg-primary-600 px-6 pt-4 pb-6"
      >
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center">
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              className="p-2 -ml-2 rounded-full active:bg-primary-700"
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <View className="ml-2">
              <Text className="text-white text-xl font-bold">
                Pengajuan PDTT
              </Text>
              <Text className="text-primary-100 text-sm">
                Periode: {period ? dayjs(period).format('MMMM YYYY') : '-'}
              </Text>
            </View>
          </View>
        </View>

        <Card className="bg-white/10 border-white/20 p-4">
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-primary-100 text-xs mb-1">Estimasi Total Harga</Text>
              <Text className="text-white text-xl font-bold">
                {formatCurrency(totalPrice)}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-primary-100 text-xs mb-1">Sisa Saldo</Text>
              <Text className={cn(
                "text-lg font-bold",
                remainingSaldo < 0 ? "text-error-300" : "text-success-300"
              )}>
                {formatCurrency(remainingSaldo)}
              </Text>
            </View>
          </View>
          {remainingSaldo < 0 && (
            <Text className="text-error-200 text-[10px] mt-2 italic text-center">
              ⚠️ Total pengajuan melebihi batas saldo!
            </Text>
          )}
        </Card>
      </Animated.View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="text-secondary-500 mt-4 font-medium">Memuat katalog...</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingTop: 24, paddingBottom: 120 }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center mt-20 px-10">
              <Ionicons name="cube-outline" size={60} color="#cbd5e1" />
              <Text className="text-secondary-400 text-center mt-4">
                Katalog PDTT belum tersedia untuk periode ini.
              </Text>
            </View>
          }
        />
      )}

      {!loading && items.length > 0 && (
        <View className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-secondary-100 shadow-lg shadow-black/10">
          <Button
            title={selectedKeys.length > 0 ? "Kirim Pengajuan" : "Pilih Barang"}
            onPress={handleSubmit}
            loading={submitting}
            disabled={selectedKeys.length === 0 || remainingSaldo < 0}
            size="lg"
            className="rounded-2xl"
          />
        </View>
      )}

      <SuccessModal
        visible={successModalVisible}
        title="Berhasil!"
        message="Pengajuan PDTT Anda telah berhasil dikirim."
        onClose={() => {
          setSuccessModalVisible(false);
          navigation.goBack();
        }}
        buttonText="Ke Dashboard"
      />
    </View>
  );
};

