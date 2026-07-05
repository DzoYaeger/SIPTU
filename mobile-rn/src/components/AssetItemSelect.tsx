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
import { cn } from '../utils/cn';
import { BmnAsset } from '../services/maintenanceService';

interface AssetItemSelectProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (item: BmnAsset) => void;
  assets: BmnAsset[];
  loading?: boolean;
}

export const AssetItemSelect: React.FC<AssetItemSelectProps> = ({
  visible,
  onClose,
  onSelect,
  assets,
  loading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    return assets.filter(
      (item) =>
        (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.asset_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.brand || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [assets, searchQuery]);

  const renderItem = ({ item, index }: { item: BmnAsset; index: number }) => {
    return (
      <Animated.View entering={FadeInUp.delay(index * 30).springify()}>
        <TouchableOpacity
          onPress={() => {
            onSelect(item);
            onClose();
          }}
          className="mb-3 p-4 rounded-xl border border-secondary-200 bg-white"
        >
          <View className="flex-row">
            <View className="w-12 h-12 rounded-xl bg-primary-50 items-center justify-center mr-4">
              <Ionicons name="cube" size={24} color="#2563eb" />
            </View>
            <View className="flex-1">
              <Text className="text-secondary-900 font-bold text-base">
                {item.name}
              </Text>
              <Text className="text-secondary-500 text-xs mt-0.5">
                Kode: {item.asset_code}
              </Text>
              {(item.brand || item.model) && (
                <Text className="text-secondary-400 text-[10px] mt-1">
                  {[item.brand, item.model].filter(Boolean).join(' / ')}
                </Text>
              )}
              {item.location && (
                <View className="flex-row items-center mt-2">
                  <Ionicons name="location-outline" size={10} color="#94a3b8" />
                  <Text className="text-secondary-400 text-[10px] ml-1">
                    {item.location}
                  </Text>
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" style={{ alignSelf: 'center' }} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/50">
        <View className="flex-1 mt-20">
          <Animated.View 
            entering={SlideInUp.duration(300)}
            className="flex-1 bg-secondary-50 rounded-t-[32px] overflow-hidden"
          >
            <View className="items-center py-3">
              <View className="w-12 h-1.5 bg-secondary-200 rounded-full" />
            </View>

            <View className="px-6 pb-4 flex-row justify-between items-center">
              <Text className="text-xl font-bold text-secondary-900">Pilih Aset BMN</Text>
              <TouchableOpacity onPress={onClose} className="p-2">
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View className="px-6 mb-4">
              <View className="flex-row items-center bg-white border border-secondary-200 rounded-xl px-4 py-2">
                <Ionicons name="search" size={20} color="#94a3b8" />
                <TextInput
                  placeholder="Cari nama, kode, atau merek..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  className="flex-1 ml-2 text-secondary-900 h-10"
                />
              </View>
            </View>

            {loading ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#2563eb" />
                <Text className="mt-4 text-secondary-500">Memuat data aset...</Text>
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
                      Aset tidak ditemukan.
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
