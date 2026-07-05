import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp, SlideInUp } from 'react-native-reanimated';
import { cn } from '../utils/cn';
import { suratTugasService, Sarana } from '../services/suratTugasService';

interface SaranaSelectProps {
  visible: boolean;
  onClose: () => void;
  selectedSarana: Sarana[];
  onToggleSarana: (sarana: Sarana) => void;
}

export const SaranaSelect: React.FC<SaranaSelectProps> = ({
  visible,
  onClose,
  selectedSarana,
  onToggleSarana,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Sarana[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<any>(null);

  const fetchResults = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const data = await suratTugasService.searchSarana(q);
      setResults(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      fetchResults('');
    }
  }, [visible, fetchResults]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(searchQuery);
    }, 500);
  }, [searchQuery, fetchResults]);

  const renderItem = ({ item, index }: { item: Sarana; index: number }) => {
    const isSelected = selectedSarana.find(s => s.id === item.id);

    return (
      <Animated.View entering={FadeInUp.delay(index * 30).springify()}>
        <TouchableOpacity
          onPress={() => onToggleSarana(item)}
          className={cn(
            "mb-3 p-4 rounded-xl border border-secondary-200 bg-white shadow-sm",
            isSelected && "border-primary-500 bg-primary-50"
          )}
          style={isSelected ? { elevation: 2 } : {}}
        >
          <View className="flex-row justify-between items-start">
            <View className="flex-1">
              <Text className={cn(
                "font-bold text-base",
                isSelected ? "text-primary-900" : "text-secondary-900"
              )}>
                {item.nama}
              </Text>
              
              <View className="flex-row items-center mt-1">
                <Ionicons name="location-outline" size={12} color="#94a3b8" />
                <Text className="text-secondary-500 text-xs ml-1 flex-1">
                  {item.lokasi || '-'}
                </Text>
              </View>

              {item.jenis && item.jenis.length > 0 && (
                <View className="flex-row flex-wrap mt-2 gap-1">
                  {item.jenis.map((j, i) => (
                    <View key={i} className="bg-secondary-100 px-2 py-0.5 rounded-md">
                      <Text className="text-secondary-600 text-[10px] font-medium">{j}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
            
            <View className={cn(
              "w-6 h-6 rounded-full items-center justify-center border",
              isSelected ? "bg-primary-500 border-primary-500" : "border-secondary-300"
            )}>
              {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
              {!isSelected && <Ionicons name="add" size={16} color="#94a3b8" />}
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
                <Text className="text-xl font-bold text-secondary-900">Pilih Sarana</Text>
                <Text className="text-xs text-secondary-500">Data sarana sinkronisasi SIAMPARAN</Text>
              </View>
              <TouchableOpacity onPress={onClose} className="p-2">
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View className="px-6 mb-4">
              <View className="flex-row items-center bg-white border border-secondary-200 rounded-xl px-4 py-2 shadow-sm">
                <Ionicons name="search" size={20} color="#94a3b8" />
                <TextInput
                  placeholder="Ketik nama sarana..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  className="flex-1 ml-2 text-secondary-900 h-10"
                />
                {loading && <ActivityIndicator size="small" color="#2563eb" />}
              </View>
            </View>

            <FlatList
              data={results}
              renderItem={renderItem}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
              ListEmptyComponent={
                !loading ? (
                  <View className="items-center justify-center mt-10">
                    <Ionicons name="business-outline" size={64} color="#cbd5e1" />
                    <Text className="text-secondary-500 mt-4 text-center">
                      Sarana tidak ditemukan.
                    </Text>
                  </View>
                ) : null
              }
            />
            
            {selectedSarana.length > 0 && (
              <View className="p-6 bg-white border-t border-secondary-100 shadow-2xl">
                <TouchableOpacity 
                  onPress={onClose}
                  className="bg-primary-600 py-4 rounded-xl items-center shadow-lg shadow-primary-300"
                >
                  <Text className="text-white font-bold text-base">
                    Selesai ({selectedSarana.length} dipilih)
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
