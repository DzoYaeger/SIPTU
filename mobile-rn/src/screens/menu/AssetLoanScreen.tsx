import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import SignatureCanvas from 'react-native-signature-canvas';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  FadeIn,
  FadeInUp,
  SlideInRight,
  createAnimatedComponent,
} from 'react-native-reanimated';
import { Button, Input, Card, ConfirmModal, SuccessModal, SignatureModal } from '../../components';
import { cn } from '../../utils/cn';
import { assetService } from '../../services/assetService';
import { useAuthStore } from '../../store/authStore';
// Redundant imports and local cn removed to use central utilities

// Constants
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const LOCATIONS = [
  'Kota Palopo',
  'Kabupaten Luwu',
  'Kabupaten Luwu Utara',
  'Kabupaten Luwu Timur',
  'Kabupaten Tana Toraja',
  'Kabupaten Toraja Utara',
  'Kabupaten Enrekang',
];

// Types
interface Asset {
  id: number;
  name: string;
  code?: string;
  category?: string;
  model?: string; // NUP
}

interface FormData {
  nip: string;
  nama: string;
  fungsi_bidang: string;
  location: string;
  notes: string;
  loan_date: string;
  return_date: string;
  requester_signature: string;
  assets: number[];
}

// Animated Components
const AnimatedTouchable = createAnimatedComponent(TouchableOpacity);
const AnimatedCard = createAnimatedComponent(Card);
const AnimatedView = createAnimatedComponent(View);

// Multi-Select Asset Picker Component
interface AssetPickerProps {
  assets: Asset[];
  selectedAssets: number[];
  onSelect: (assetIds: number[]) => void;
  visible: boolean;
  onClose: () => void;
  loading?: boolean;
  loanSchedule: any[];
  loanDate: string;
  returnDate: string;
}

const AssetPicker: React.FC<AssetPickerProps> = ({
  assets,
  selectedAssets,
  onSelect,
  visible,
  onClose,
  loading,
  loanSchedule,
  loanDate,
  returnDate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [localSelected, setLocalSelected] = useState<number[]>(selectedAssets);

  useEffect(() => {
    if (visible) {
      setLocalSelected(selectedAssets);
      setSearchQuery('');
    }
  }, [visible, selectedAssets]);

  const filteredAssets = assets.filter(
    (asset) =>
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleAsset = (assetId: number) => {
    setLocalSelected((prev) =>
      prev.includes(assetId)
        ? prev.filter((id) => id !== assetId)
        : [...prev, assetId]
    );
  };

  const handleConfirm = () => {
    onSelect(localSelected);
    onClose();
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    // Extract only the YYYY-MM-DD part
    const cleanDate = dateStr.split('T')[0];
    const [year, month, day] = cleanDate.split('-');
    return `${day}-${month}-${year}`;
  };

  const getConflictInfo = (assetId: number) => {
    if (!loanDate || !returnDate) return null;

    const start = new Date(loanDate);
    const end = new Date(returnDate);

    const conflicts = loanSchedule.filter(loan => {
      const hasAsset = Array.isArray(loan.assets) 
        ? loan.assets.some((a: any) => a.asset_id === assetId)
        : false;

      if (!hasAsset) return false;

      const loanStart = new Date(loan.loan_date);
      const loanEnd = new Date(loan.return_date);

      return (start <= loanEnd) && (end >= loanStart);
    });

    if (conflicts.length === 0) return null;

    // Return the first conflict's dates formatted
    const first = conflicts[0];
    return `${formatDate(first.loan_date)} s/d ${formatDate(first.return_date)}`;
  };

  const renderAssetItem = ({ item, index }: { item: Asset; index: number }) => {
    const isSelected = localSelected.includes(item.id);
    const conflictDates = getConflictInfo(item.id);
    const isAvailable = !conflictDates;
    
    return (
      <AnimatedTouchable
        entering={FadeInUp.delay(index * 30).springify()}
        onPress={() => isAvailable && toggleAsset(item.id)}
        disabled={!isAvailable}
        className={cn(
          'flex-row items-center p-4 mb-2 rounded-xl border-2',
          isSelected
            ? 'border-primary-600 bg-primary-50'
            : isAvailable 
              ? 'border-secondary-200 bg-white'
              : 'border-secondary-100 bg-secondary-50 opacity-60'
        )}
      >
        <View
          className={cn(
            'w-6 h-6 rounded-md mr-3 items-center justify-center border-2',
            isSelected
              ? 'bg-primary-600 border-primary-600'
              : isAvailable
                ? 'border-secondary-300'
                : 'border-secondary-200 bg-secondary-100'
          )}
        >
          {isSelected && (
            <Ionicons name="checkmark" size={16} color="white" />
          )}
          {!isAvailable && (
            <Ionicons name="close" size={16} color="#94a3b8" />
          )}
        </View>
        <View className="flex-1">
          <View className="flex-row justify-between items-start">
            <Text className={cn(
              "font-semibold flex-1",
              isAvailable ? "text-secondary-900" : "text-secondary-400"
            )}>
              Nama Barang : {item.name}
            </Text>
            {!isAvailable && (
              <View className="bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                <Text className="text-[10px] font-bold text-red-500 uppercase">Tidak Tersedia</Text>
              </View>
            )}
          </View>
          <Text className={cn("text-xs mt-1", isAvailable ? "text-secondary-500" : "text-secondary-300")}>
            Kode Barang : {item.code || '-'}
          </Text>
          <Text className={cn("text-xs", isAvailable ? "text-secondary-500" : "text-secondary-300")}>
            NUP : {item.model || '-'}
          </Text>
          {!isAvailable && (
            <Text className="text-[10px] text-red-500 mt-1 italic font-bold">
              * Terbooking: {conflictDates}
            </Text>
          )}
        </View>
      </AnimatedTouchable>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <AnimatedView
          entering={FadeInUp.springify()}
          className="bg-white rounded-t-3xl max-h-[85%]"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between p-4 border-b border-secondary-200">
            <Text className="text-lg font-bold text-secondary-900">
              Pilih Aset
            </Text>
            <TouchableOpacity onPress={onClose} className="p-2">
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View className="p-4">
            <View className="flex-row items-center bg-secondary-100 rounded-xl px-4">
              <Ionicons name="search" size={20} color="#64748b" />
              <Input
                placeholder="Cari aset..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                containerClassName="flex-1 mb-0"
                className="bg-transparent border-0"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#64748b" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Selected Count */}
          <View className="px-4 pb-2">
            <Text className="text-sm text-secondary-600">
              {localSelected.length} aset dipilih
            </Text>
          </View>

          {/* Asset List */}
          {loading ? (
            <View className="py-12 items-center">
              <ActivityIndicator size="large" color="#2563eb" />
              <Text className="mt-4 text-secondary-600">Memuat aset...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredAssets}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderAssetItem}
              contentContainerStyle={{ padding: 16, paddingTop: 0 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View className="py-12 items-center px-6">
                  <Ionicons
                    name="alert-circle-outline"
                    size={48}
                    color="#cbd5e1"
                  />
                  <Text className="mt-4 text-secondary-500 text-center">
                    {searchQuery
                      ? 'Tidak ada aset yang cocok dengan pencarian'
                      : 'Data aset tidak ditemukan.'}
                  </Text>
                </View>
              }
            />
          )}

          {/* Footer Actions */}
          <View className="p-4 border-t border-secondary-200 flex-row gap-3">
            <Button
              title="Batal"
              variant="outline"
              onPress={onClose}
              className="flex-1"
            />
            <Button
              title="Konfirmasi"
              onPress={handleConfirm}
              className="flex-1"
            />
          </View>
        </AnimatedView>
      </View>
    </Modal>
  );
};


// Signature Pad Component
// Shared SignatureModal is imported and used instead of local SignaturePad

// Selected Asset Chip Component
const SelectedAssetChip: React.FC<{
  asset: Asset;
  onRemove: () => void;
  index: number;
}> = ({ asset, onRemove, index }) => {
  return (
    <AnimatedView
      entering={SlideInRight.delay(index * 50).springify()}
      className="flex-row items-center bg-primary-50 rounded-2xl px-4 py-3 mr-2 mb-2 border border-primary-100 w-full"
    >
      <View className="flex-1 mr-2">
        <Text className="text-primary-800 text-sm font-bold">
          Nama Barang : {asset.name}
        </Text>
        <View className="mt-1">
          <Text className="text-primary-600 text-[11px] leading-4">
            Kode Barang : {asset.code || '-'}
          </Text>
          <Text className="text-primary-600 text-[11px] leading-4">
            NUP : {asset.model || '-'}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={onRemove}
        className="w-8 h-8 bg-primary-200 rounded-full items-center justify-center"
      >
        <Ionicons name="close" size={18} color="#1e40af" />
      </TouchableOpacity>
    </AnimatedView>
  );
};

export const AssetLoanScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  
  // Form State
  const [formData, setFormData] = useState<FormData>({
    nip: '',
    nama: '',
    fungsi_bidang: '',
    location: '',
    notes: '',
    loan_date: '',
    return_date: '',
    requester_signature: '',
    assets: [],
  });

  // Assets & Schedule State
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loanSchedule, setLoanSchedule] = useState<any[]>([]);
  const [isLainnya, setIsLainnya] = useState(false);
  const [assetsLoading, setAssetsLoading] = useState(false);

  // Modal States
  const [assetPickerVisible, setAssetPickerVisible] = useState(false);
  const [signatureVisible, setSignatureVisible] = useState(false);
  const [loanDatePickerVisible, setLoanDatePickerVisible] = useState(false);
  const [returnDatePickerVisible, setReturnDatePickerVisible] = useState(false);

  // Submit & Modal State
  const [submitting, setSubmitting] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  // Animation Values
  const headerHeight = useSharedValue(0);
  const scrollY = useSharedValue(0);

  // Pre-populate Identity from Auth Store
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        nip: user.nip || user.employee?.nip || user.id?.toString() || '',
        nama: user.name || user.employee?.name || '',
        fungsi_bidang: user.employee?.function_area || user.function_area || user.unit || '',
      }));
    }
  }, [user]);

  // Fetch Assets and Schedule on Mount
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setAssetsLoading(true);
    try {
      // Fetch assets dan schedule secara terpisah agar jika schedule gagal, assets tetap tersedia
      let assetsData: any[] = [];
      let scheduleData: any[] = [];
      
      try {
        const assetsRes = await assetService.getAssets({ pageSize: 1000 });
        assetsData = assetsRes.data?.data || assetsRes.data || [];
      } catch (assetError) {
        console.error('Error fetching assets:', assetError);
      }
      
      try {
        const scheduleRes = await assetService.getLoanSchedule();
        scheduleData = scheduleRes.data || [];
      } catch (scheduleError) {
        console.log('Schedule fetch failed (non-critical):', scheduleError);
        // Schedule gagal tidak critical, user tetap bisa mengajukan peminjaman
      }
      
      const normalizedAssets = assetsData.map((asset: any) => ({
        id: asset.id,
        name: asset.name || asset.nama_barang || asset.asset_name || '',
        code: asset.asset_code || asset.code || asset.kode_barang || '',
        category: asset.category || asset.jenis_barang || '',
        model: asset.model || asset.nup || '',
      }));
      
      setAssets(normalizedAssets);
      setLoanSchedule(scheduleData);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      Alert.alert('Error', 'Gagal memuat data aset');
    } finally {
      setAssetsLoading(false);
    }
  };

  // Availability Check
  const getAvailableAssets = useCallback(() => {
    if (!formData.loan_date || !formData.return_date) return assets;

    const start = new Date(formData.loan_date);
    const end = new Date(formData.return_date);

    // Filter out assets that are booked in overlapping periods
    return assets.filter(asset => {
      const isBooked = loanSchedule.some(loan => {
        // Check if this specific asset is in the loan
        const hasAsset = Array.isArray(loan.assets) 
          ? loan.assets.some((a: any) => a.asset_id === asset.id)
          : false;

        if (!hasAsset) return false;

        const loanStart = new Date(loan.loan_date);
        const loanEnd = new Date(loan.return_date);

        // Overlap logic: (StartA <= EndB) and (EndA >= StartB)
        return (start <= loanEnd) && (end >= loanStart);
      });

      return !isBooked;
    });
  }, [assets, loanSchedule, formData.loan_date, formData.return_date]);

  // Form Handlers
  const updateField = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAssetSelect = (assetIds: number[]) => {
    updateField('assets', assetIds);
  };

  const removeAsset = (assetId: number) => {
    updateField(
      'assets',
      formData.assets.filter((id) => id !== assetId)
    );
  };

  const handleDateConfirm = (
    date: Date,
    field: 'loan_date' | 'return_date'
  ) => {
    const formattedDate = date.toISOString().split('T')[0];
    updateField(field, formattedDate);
    
    if (field === 'loan_date') {
      setLoanDatePickerVisible(false);
    } else {
      setReturnDatePickerVisible(false);
    }
  };

  const handleSignatureSave = (signature: string) => {
    updateField('requester_signature', signature);
    setSignatureVisible(false);
  };

  const validateForm = (): boolean => {
    const requiredFields = [
      { field: 'nip', label: 'NIP' },
      { field: 'nama', label: 'Nama' },
      { field: 'fungsi_bidang', label: 'Fungsi/Bidang' },
      { field: 'location', label: 'Lokasi' },
      { field: 'loan_date', label: 'Tanggal Peminjaman' },
      { field: 'return_date', label: 'Tanggal Pengembalian' },
    ];

    for (const { field, label } of requiredFields) {
      if (!formData[field as keyof FormData]) {
        Alert.alert('Error', `${label} wajib diisi`);
        return false;
      }
    }

    if (formData.assets.length === 0) {
      Alert.alert('Error', 'Pilih minimal satu aset');
      return false;
    }

    if (!formData.requester_signature) {
      Alert.alert('Error', 'Tanda tangan wajib diisi');
      return false;
    }

    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    setConfirmModalVisible(true);
  };

  const processSubmit = async () => {
    setConfirmModalVisible(false);
    setSubmitting(true);
    try {
      const payload = {
        nip: formData.nip,
        nama: formData.nama,
        fungsi_bidang: formData.fungsi_bidang,
        location: formData.location,
        notes: formData.notes,
        loan_date: formData.loan_date,
        return_date: formData.return_date,
        requester_signature: formData.requester_signature,
        assets: formData.assets.map((id) => {
          const asset = assets.find((a) => a.id === id);
          return {
            asset_id: id,
            nama_barang: asset?.name || '',
            kode_bmn: asset?.code || '',
            nup: asset?.model || '',
          };
        }),
      };

      await assetService.createLoan(payload);
      setSuccessModalVisible(true);
    } catch (error: any) {
      console.error('Submit error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Gagal mengajukan peminjaman'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData(prev => ({
      ...prev,
      location: '',
      notes: '',
      loan_date: '',
      return_date: '',
      requester_signature: '',
      assets: [],
    }));
    setIsLainnya(false);
    setSuccessModalVisible(false);
  };

  const getSelectedAssetsData = () => {
    // Search in the full assets list, not the filtered available one,
    // so that chips don't disappear when dates change.
    return assets.filter((asset) => formData.assets.includes(asset.id));
  };

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-secondary-50">
      {/* Header */}
      <Animated.View
        entering={FadeIn.duration(400)}
        className="bg-primary-600 px-6 pt-4 pb-6 flex-row items-center"
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="p-2 -ml-2 rounded-full active:bg-primary-700"
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold ml-4">
          Peminjaman Aset
        </Text>
      </Animated.View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
      >
        {/* User Identity Card */}
        <AnimatedCard
          entering={FadeInUp.delay(100).springify()}
          className="mb-4"
          variant="outlined"
        >
          <View className="flex-row items-center mb-4">
            <View className="w-12 h-12 bg-primary-100 rounded-full items-center justify-center mr-3">
              <Ionicons name="person" size={24} color="#2563eb" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-secondary-900">
                Identitas Peminjam
              </Text>
              <Text className="text-sm text-secondary-500">
                Data terisi otomatis (NIP/Nama/Fungsi)
              </Text>
            </View>
          </View>

          <Input
            label="NIP *"
            placeholder="Masukkan NIP"
            value={formData.nip}
            editable={false}
            icon={<Ionicons name="card-outline" size={20} color="#64748b" />}
            containerClassName="mb-3 opacity-70"
          />

          <Input
            label="Nama Lengkap *"
            placeholder="Masukkan nama lengkap"
            value={formData.nama}
            editable={false}
            icon={<Ionicons name="person-outline" size={20} color="#64748b" />}
            containerClassName="mb-3 opacity-70"
          />

          <Input
            label="Fungsi/Bidang *"
            placeholder="Masukkan fungsi/bidang"
            value={formData.fungsi_bidang}
            editable={false}
            icon={<Ionicons name="business-outline" size={20} color="#64748b" />}
            containerClassName="opacity-70"
          />
        </AnimatedCard>

        {/* Loan Details Card (Now moved up) */}
        <AnimatedCard
          entering={FadeInUp.delay(200).springify()}
          className="mb-4"
          variant="outlined"
        >
          <View className="flex-row items-center mb-4">
            <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-3">
              <Ionicons name="calendar" size={20} color="#22c55e" />
            </View>
            <Text className="text-lg font-bold text-secondary-900">
              Jadwal Peminjaman
            </Text>
          </View>

          {/* Loan Date */}
          <TouchableOpacity
            onPress={() => setLoanDatePickerVisible(true)}
            className="mb-4"
          >
            <Text className="text-sm font-medium text-secondary-700 mb-1.5">
              Tanggal Peminjaman *
            </Text>
            <View className="flex-row items-center border border-secondary-300 rounded-xl bg-white px-4 py-3">
              <Ionicons name="calendar-outline" size={20} color="#64748b" />
              <Text
                className={cn(
                  'flex-1 ml-3 text-base',
                  formData.loan_date ? 'text-secondary-900' : 'text-secondary-400'
                )}
              >
                {formData.loan_date
                  ? formatDateDisplay(formData.loan_date)
                  : 'Pilih tanggal peminjaman'}
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </View>
          </TouchableOpacity>

          {/* Return Date */}
          <TouchableOpacity
            onPress={() => setReturnDatePickerVisible(true)}
            className="mb-4"
          >
            <Text className="text-sm font-medium text-secondary-700 mb-1.5">
              Tanggal Pengembalian *
            </Text>
            <View className="flex-row items-center border border-secondary-300 rounded-xl bg-white px-4 py-3">
              <Ionicons name="calendar-outline" size={20} color="#64748b" />
              <Text
                className={cn(
                  'flex-1 ml-3 text-base',
                  formData.return_date
                    ? 'text-secondary-900'
                    : 'text-secondary-400'
                )}
              >
                {formData.return_date
                  ? formatDateDisplay(formData.return_date)
                  : 'Pilih tanggal pengembalian'}
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </View>
          </TouchableOpacity>
        </AnimatedCard>

        {/* Asset Selection Card (Now moved down) */}
        <AnimatedCard
          entering={FadeInUp.delay(300).springify()}
          className="mb-4"
          variant="outlined"
        >
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-orange-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="cube" size={20} color="#f97316" />
              </View>
              <Text className="text-lg font-bold text-secondary-900">
                Pilih Aset *
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                if (!formData.loan_date || !formData.return_date) {
                  Alert.alert('Info', 'Harap pilih tanggal peminjaman dan pengembalian terlebih dahulu');
                  return;
                }
                setAssetPickerVisible(true);
              }}
              className="bg-primary-600 px-4 py-2 rounded-full flex-row items-center"
            >
              <Ionicons name="add" size={18} color="white" />
              <Text className="text-white font-medium ml-1">Tambah</Text>
            </TouchableOpacity>
          </View>

          {/* Selected Assets Chips */}
          <View className="flex-row flex-wrap -mx-1">
            {getSelectedAssetsData().length > 0 ? (
              getSelectedAssetsData().map((asset, index) => (
                <SelectedAssetChip
                  key={asset.id}
                  asset={asset}
                  index={index}
                  onRemove={() => removeAsset(asset.id)}
                />
              ))
            ) : (
              <View className="w-full py-6 items-center bg-secondary-50 rounded-xl border-2 border-dashed border-secondary-200">
                <Ionicons
                  name="cube-outline"
                  size={32}
                  color="#cbd5e1"
                />
                <Text className="mt-2 text-secondary-400 text-sm">
                  {(!formData.loan_date || !formData.return_date) 
                    ? 'Pilih tanggal untuk melihat ketersediaan'
                    : 'Belum ada aset dipilih'}
                </Text>
              </View>
            )}
          </View>
        </AnimatedCard>

        {/* Location & Notes Card */}
        <AnimatedCard
          entering={FadeInUp.delay(400).springify()}
          className="mb-4"
          variant="outlined"
        >
          <View className="flex-row items-center mb-4">
            <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
              <Ionicons name="map" size={20} color="#2563eb" />
            </View>
            <Text className="text-lg font-bold text-secondary-900">
              Lokasi & Catatan
            </Text>
          </View>

          <View className="mb-4">
            <Text className="text-sm font-semibold text-secondary-700 mb-3">
              Lokasi Penempatan *
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {LOCATIONS.map((loc) => (
                <TouchableOpacity
                  key={loc}
                  onPress={() => {
                    updateField('location', loc);
                    setIsLainnya(false);
                  }}
                  className={cn(
                    'px-4 py-2 rounded-full border',
                    formData.location === loc && !isLainnya
                      ? 'bg-blue-50 border-blue-500'
                      : 'bg-white border-secondary-200'
                  )}
                >
                  <Text
                    className={cn(
                      'text-sm font-medium',
                      formData.location === loc && !isLainnya
                        ? 'text-blue-600'
                        : 'text-secondary-600'
                    )}
                  >
                    {loc}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => {
                  setIsLainnya(true);
                  if (LOCATIONS.includes(formData.location)) {
                    updateField('location', '');
                  }
                }}
                className={cn(
                  'px-4 py-2 rounded-full border',
                  isLainnya
                    ? 'bg-blue-50 border-blue-500'
                    : 'bg-white border-secondary-200'
                )}
              >
                <Text
                  className={cn(
                    'text-sm font-medium',
                    isLainnya
                      ? 'text-blue-600'
                      : 'text-secondary-600'
                  )}
                >
                  Lainnya
                </Text>
              </TouchableOpacity>
            </View>

            {isLainnya && (
              <Input
                placeholder="Isi detail nama lokasi penempatan..."
                value={LOCATIONS.includes(formData.location) ? '' : formData.location}
                onChangeText={(text) => updateField('location', text)}
                containerClassName="mt-4"
                autoFocus
              />
            )}
          </View>

          <Input
            label="Catatan Tambahan (Agenda Kegiatan)"
            placeholder="Contoh: Rapat Dengar Pendapat"
            value={formData.notes}
            onChangeText={(text) => updateField('notes', text)}
            icon={<Ionicons name="create-outline" size={20} color="#64748b" />}
            multiline
            numberOfLines={3}
            className="h-20 text-align-top"
          />
        </AnimatedCard>

        {/* Signature Card */}
        <AnimatedCard
          entering={FadeInUp.delay(500).springify()}
          className="mb-6"
          variant="outlined"
        >
          <View className="flex-row items-center mb-4">
            <View className="w-10 h-10 bg-purple-100 rounded-full items-center justify-center mr-3">
              <Ionicons name="create" size={20} color="#9333ea" />
            </View>
            <Text className="text-lg font-bold text-secondary-900">
              Tanda Tangan *
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setSignatureVisible(true)}
            className="border-2 border-dashed border-secondary-200 rounded-2xl h-40 bg-secondary-50 items-center justify-center overflow-hidden"
          >
            {formData.requester_signature ? (
              <View className="w-full h-full p-2">
                <Text className="text-xs text-secondary-400 absolute top-2 left-2 z-10">
                  Pratinjau Tanda Tangan (Ketuk untuk ubah)
                </Text>
                <Image
                  source={{ uri: formData.requester_signature }}
                  className="w-full h-full"
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View className="items-center">
                <Ionicons name="brush-outline" size={32} color="#94a3b8" />
                <Text className="mt-2 text-secondary-400 font-medium">
                  Ketuk untuk menggambar tanda tangan
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </AnimatedCard>

        {/* Submit Button */}
        <AnimatedView entering={FadeInUp.delay(600).springify()} className="mb-12">
          <Button
            title="Ajukan Peminjaman"
            onPress={handleSubmit}
            loading={submitting}
            size="lg"
            icon={<Ionicons name="send" size={20} color="white" />}
          />
        </AnimatedView>
      </ScrollView>

      {/* Asset Picker Modal */}
      <AssetPicker
        assets={assets}
        selectedAssets={formData.assets}
        onSelect={handleAssetSelect}
        loanSchedule={loanSchedule}
        loanDate={formData.loan_date}
        returnDate={formData.return_date}
        visible={assetPickerVisible}
        onClose={() => setAssetPickerVisible(false)}
        loading={assetsLoading}
      />

      {/* Signature Modal */}
      <SignatureModal
        visible={signatureVisible}
        onClose={() => setSignatureVisible(false)}
        onOK={handleSignatureSave}
      />

      {/* Date Pickers */}
      <DateTimePickerModal
        isVisible={loanDatePickerVisible}
        mode="date"
        onConfirm={(date) => {
          handleDateConfirm(date, 'loan_date');
          // Auto set return date if it's empty or earlier than loan date
          if (!formData.return_date || new Date(formData.return_date) < date) {
            updateField('return_date', date.toISOString().split('T')[0]);
          }
        }}
        onCancel={() => setLoanDatePickerVisible(false)}
        minimumDate={new Date()}
      />

      <DateTimePickerModal
        isVisible={returnDatePickerVisible}
        mode="date"
        onConfirm={(date) => handleDateConfirm(date, 'return_date')}
        onCancel={() => setReturnDatePickerVisible(false)}
        minimumDate={
          formData.loan_date
            ? new Date(formData.loan_date)
            : new Date()
        }
      />

      <ConfirmModal
        visible={confirmModalVisible}
        title="Konfirmasi Pengajuan"
        message="Apakah Anda yakin ingin mengajukan peminjaman aset-aset ini?"
        onConfirm={processSubmit}
        onCancel={() => setConfirmModalVisible(false)}
        confirmText="Ya, Ajukan"
        loading={submitting}
      />

      <SuccessModal
        visible={successModalVisible}
        title="Berhasil!"
        message="Pengajuan peminjaman aset Anda telah berhasil dikirim dan menunggu verifikasi."
        onClose={() => {
          setSuccessModalVisible(false);
          navigation.goBack();
        }}
        buttonText="Ke Dashboard"
        onSecondaryAction={resetForm}
        secondaryButtonText="Tambah Data Lagi"
      />
    </SafeAreaView>
  );
};

export default AssetLoanScreen;
