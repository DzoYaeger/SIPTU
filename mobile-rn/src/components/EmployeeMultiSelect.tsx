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
import { Employee } from '../services/suratTugasService';

interface EmployeeMultiSelectProps {
  visible: boolean;
  onClose: () => void;
  selectedIds: number[];
  onSelect: (emp: Employee) => void;
  employees: Employee[];
  loading?: boolean;
  title?: string;
  subtitle?: string;
  mode?: 'multi' | 'single';
}

export const EmployeeMultiSelect: React.FC<EmployeeMultiSelectProps> = ({
  visible,
  onClose,
  selectedIds,
  onSelect,
  employees,
  loading,
  title = "Pilih Pegawai",
  subtitle = "Pilih pegawai yang ditugaskan",
  mode = 'multi',
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    return employees.filter(
      (item) =>
        (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.nip || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [employees, searchQuery]);

  const renderItem = ({ item, index }: { item: Employee; index: number }) => {
    const isSelected = selectedIds.includes(item.id);

    return (
      <Animated.View entering={FadeInUp.delay(index * 30).springify()}>
        <TouchableOpacity
          onPress={() => onSelect(item)}
          className={cn(
            "mb-3 p-4 rounded-xl border border-secondary-200 bg-white",
            isSelected && "border-primary-500 bg-primary-50"
          )}
        >
          <View className="flex-row justify-between items-center">
            <View className="flex-1">
              <Text className={cn(
                "font-bold text-base",
                isSelected ? "text-primary-900" : "text-secondary-900"
              )}>
                {item.name}
              </Text>
              <Text className="text-secondary-500 text-xs mt-1">
                NIP: {item.nip || '-'}
              </Text>
              {item.position && (
                <Text className="text-secondary-400 text-[10px] mt-1 italic">
                  {item.position}
                </Text>
              )}
            </View>
            
            <View className="flex-row items-center">
              <View className={cn(
                "w-6 h-6 rounded-full items-center justify-center border",
                isSelected ? "bg-primary-500 border-primary-500" : "border-secondary-300"
              )}>
                {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
                {!isSelected && mode === 'single' && <Ionicons name="add" size={16} color="#94a3b8" />}
              </View>
            </View>
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
              <View className="flex-1">
                <Text className="text-xl font-bold text-secondary-900">{title}</Text>
                <Text className="text-xs text-secondary-500">{subtitle}</Text>
              </View>
              <TouchableOpacity onPress={onClose} className="p-2">
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View className="px-6 mb-4">
              <View className="flex-row items-center bg-white border border-secondary-200 rounded-xl px-4 py-2">
                <Ionicons name="search" size={20} color="#94a3b8" />
                <TextInput
                  placeholder="Cari nama atau NIP..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  className="flex-1 ml-2 text-secondary-900 h-10"
                />
              </View>
            </View>

            {loading ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#2563eb" />
                <Text className="mt-4 text-secondary-500">Memuat data pegawai...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredItems}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
                ListEmptyComponent={
                  <View className="items-center justify-center mt-10">
                    <Ionicons name="people-outline" size={64} color="#cbd5e1" />
                    <Text className="text-secondary-500 mt-4 text-center">
                      Pegawai tidak ditemukan.
                    </Text>
                  </View>
                }
              />
            )}
            
            {mode === 'multi' && selectedIds.length > 0 && (
              <View className="p-6 bg-white border-t border-secondary-100">
                <TouchableOpacity 
                  onPress={onClose}
                  className="bg-primary-600 py-4 rounded-xl items-center shadow-lg shadow-primary-300"
                >
                  <Text className="text-white font-bold text-base">
                    Selesai ({selectedIds.length} dipilih)
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
};

