import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp, SlideInUp } from 'react-native-reanimated';
import { Card } from './Card';
import { cn } from '../utils/cn';

interface InventoryItem {
  id: number;
  kode_barang: string;
  nama_barang: string;
  satuan: string;
  stok: number;
}

interface InventoryItemSelectProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (item: InventoryItem) => void;
  items: InventoryItem[];
  loading?: boolean;
}

export const InventoryItemSelect: React.FC<InventoryItemSelectProps> = ({
  visible,
  onClose,
  onSelect,
  items,
  loading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    return items.filter(
      (item) =>
        (item.nama_barang || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
        (item.kode_barang || '').toLowerCase().includes((searchQuery || '').toLowerCase())
    );
  }, [items, searchQuery]);

  const renderItem = ({ item, index }: { item: InventoryItem; index: number }) => {
    const isOutOfStock = item.stok <= 0;

    return (
      <Animated.View entering={FadeInUp.delay(index * 50).springify()}>
        <TouchableOpacity
          onPress={() => !isOutOfStock && onSelect(item)}
          disabled={isOutOfStock}
          className={cn(
            "mb-3 p-4 rounded-xl border border-secondary-200 bg-white",
            isOutOfStock && "bg-secondary-50 opacity-60"
          )}
        >
          <View className="flex-row justify-between items-center">
            <View className="flex-1">
              <Text className="text-secondary-900 font-bold text-base">
                {item.nama_barang}
              </Text>
              <Text className="text-secondary-500 text-xs mt-1">
                Kode: {item.kode_barang}
              </Text>
            </View>
            <View className="items-end">
              <View className={cn(
                "px-2 py-1 rounded-md mb-1",
                isOutOfStock ? "bg-red-100" : "bg-green-100"
              )}>
                <Text className={cn(
                  "text-[10px] font-bold",
                  isOutOfStock ? "text-red-700" : "text-green-700"
                )}>
                  STOK: {item.stok} {item.satuan}
                </Text>
              </View>
              {isOutOfStock && (
                <Text className="text-[10px] text-red-600 font-medium">
                  Tidak Tersedia
                </Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50">
        <View className="flex-1 mt-20">
          <Animated.View 
            entering={SlideInUp.duration(300)}
            className="flex-1 bg-secondary-50 rounded-t-[32px] overflow-hidden"
          >
            {/* Handle Bar */}
            <View className="items-center py-3">
              <View className="w-12 h-1.5 bg-secondary-200 rounded-full" />
            </View>

            {/* Header */}
            <View className="px-6 pb-4 flex-row justify-between items-center">
              <Text className="text-xl font-bold text-secondary-900">Pilih Barang</Text>
              <TouchableOpacity onPress={onClose} className="p-2">
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View className="px-6 mb-4">
              <View className="flex-row items-center bg-white border border-secondary-200 rounded-xl px-4 py-2">
                <Ionicons name="search" size={20} color="#94a3b8" />
                <TextInput
                  placeholder="Cari nama atau kode barang..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  className="flex-1 ml-2 text-secondary-900 h-10"
                />
              </View>
            </View>

            {/* List */}
            {loading ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#2563eb" />
                <Text className="mt-4 text-secondary-500">Memuat stok barang...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredItems}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
                ListEmptyComponent={
                  <View className="items-center justify-center mt-10">
                    <Ionicons name="cube-outline" size={64} color="#cbd5e1" />
                    <Text className="text-secondary-500 mt-4 text-center">
                      Barang tidak ditemukan atau stok habis.
                    </Text>
                  </View>
                }
              />
            )}
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
};
