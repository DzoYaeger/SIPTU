import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
  Platform,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  FadeIn,
  FadeInDown, 
  FadeOut,
  Layout, 
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { activityService, ServiceHistory } from '../../services/activityService';
import { cn } from '../../utils/cn';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
dayjs.locale('id');

const STATUS_COLORS: Record<string, { bg: string, text: string, dot: string, icon: string }> = {
  pending: { bg: 'bg-amber-100/50', text: 'text-amber-700', dot: 'bg-amber-500', icon: 'time-outline' },
  menunggu: { bg: 'bg-amber-100/50', text: 'text-amber-700', dot: 'bg-amber-500', icon: 'time-outline' },
  approved: { bg: 'bg-emerald-100/50', text: 'text-emerald-700', dot: 'bg-emerald-500', icon: 'checkmark-circle-outline' },
  disetujui: { bg: 'bg-emerald-100/50', text: 'text-emerald-700', dot: 'bg-emerald-500', icon: 'checkmark-circle-outline' },
  rejected: { bg: 'bg-rose-100/50', text: 'text-rose-700', dot: 'bg-rose-500', icon: 'close-circle-outline' },
  ditolak: { bg: 'bg-rose-100/50', text: 'text-rose-700', dot: 'bg-rose-500', icon: 'close-circle-outline' },
  completed: { bg: 'bg-blue-100/50', text: 'text-blue-700', dot: 'bg-blue-500', icon: 'flag-outline' },
  selesai: { bg: 'bg-blue-100/50', text: 'text-blue-700', dot: 'bg-blue-500', icon: 'flag-outline' },
};

const SERVICE_CONFIG: Record<string, { title: string, icon: any, color: string, bgColor: string }> = {
  'bmn_loan': { title: 'Peminjaman Aset', icon: 'briefcase', color: '#2563eb', bgColor: 'bg-blue-50/80' },
  'it_helpdesk': { title: 'IT Helpdesk', icon: 'desktop', color: '#7c3aed', bgColor: 'bg-purple-50/80' },
  'inventory_request': { title: 'Permintaan Persediaan', icon: 'cart', color: '#059669', bgColor: 'bg-emerald-50/80' },
  'exit_permit': { title: 'Izin Keluar', icon: 'walk', color: '#dc2626', bgColor: 'bg-red-50/80' },
  'archive_loan': { title: 'Peminjaman Arsip', icon: 'folder-open', color: '#d97706', bgColor: 'bg-amber-50/80' },
  'pdtt_request': { title: 'Pengajuan PDTT', icon: 'file-tray-full', color: '#0891b2', bgColor: 'bg-cyan-50/80' },
  'surat_tugas': { title: 'Surat Tugas', icon: 'document-attach', color: '#4f46e5', bgColor: 'bg-indigo-50/80' },
  'bmn_maintenance': { title: 'Laporan BMN', icon: 'construct', color: '#0f766e', bgColor: 'bg-teal-50/80' },
};

const getServiceConfig = (type: string) => {
  return SERVICE_CONFIG[type] || { title: type.replace(/_/g, ' '), icon: 'document-text', color: '#64748b', bgColor: 'bg-slate-50/80' };
};

const getStatusStyle = (status: string | undefined) => {
  const s = (status || 'pending').toLowerCase();
  return STATUS_COLORS[s] || { bg: 'bg-secondary-50', text: 'text-secondary-600', dot: 'bg-secondary-400', icon: 'help-circle' };
};

export const RequestHistoryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [history, setHistory] = useState<ServiceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('Semua');
  const [activeModule, setActiveModule] = useState('Semua');
  const [moduleModalVisible, setModuleModalVisible] = useState(false);
  
  // Detail Modal
  const [selectedItem, setSelectedItem] = useState<ServiceHistory | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      console.log('Fetching history...');
      const response = await activityService.getHistory();
      const data = response.data;
      console.log('History API Response length:', data?.length || data?.data?.length || 0);
      
      let finalData = [];
      if (Array.isArray(data)) {
        finalData = data;
      } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
        finalData = data.data;
      } else if (data && typeof data === 'object' && data.history && Array.isArray(data.history)) {
        finalData = data.history;
      }
      
      setHistory(finalData);
    } catch (error) {
      console.error('Error fetching history:', error);
      setHistory([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // fetchHistory removed from Mount useEffect to avoid double-fetching 
  // with the focus listener below.

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  // Refresh when screen focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchHistory();
    });
    return unsubscribe;
  }, [navigation]);

  const handleOpenDetail = async (item: ServiceHistory) => {
    setSelectedItem(item);
    setDetailModalVisible(true);
    setIsDetailLoading(true);
    setDetailError(null);

    try {
      const response = await activityService.getHistoryDetail(item.service_type, item.id);
      const fullData = response.data;
      if (fullData) {
        // Merge full data into selected item
        setSelectedItem(prev => prev ? ({
          ...prev,
          ...fullData,
          // If the backend returns extra fields in the root or in a 'data' object
          data: fullData.data || fullData 
        }) : null);
      }
    } catch (err) {
      console.error('Error fetching detail:', err);
      setDetailError('Gagal memuat detail pengajuan.');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      const title = item.title || '';
      const serviceType = item.service_type || '';
      const status = (item.status || '').toLowerCase();
      const search = (searchQuery || '').toLowerCase();

      // Search Filter
      const matchesSearch = title.toLowerCase().includes(search) || 
                          serviceType.toLowerCase().includes(search);
      
      if (!matchesSearch) return false;

      // Status Filter
      let matchesStatus = true;
      if (activeFilter === 'Pending') matchesStatus = (status === 'pending' || status === 'menunggu');
      if (activeFilter === 'Selesai') matchesStatus = (status === 'approved' || status === 'disetujui' || status === 'selesai');
      
      if (!matchesStatus) return false;

      // Module Filter
      if (activeModule !== 'Semua' && serviceType !== activeModule) return false;

      return true;
    });
  }, [history, searchQuery, activeFilter, activeModule]);

  const renderItem = React.useCallback(({ item, index }: { item: ServiceHistory; index: number }) => {
    const style = getStatusStyle(item.status);
    const service = getServiceConfig(item.service_type);

    return (
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
      >
        <TouchableOpacity
          onPress={() => handleOpenDetail(item)}
          activeOpacity={0.8}
          className="mx-4 mb-3 bg-white p-4 rounded-3xl border border-secondary-100 shadow-sm flex-row items-center"
        >
          {/* Aligned Module Icon */}
          <View className={cn(
            "w-12 h-12 rounded-2xl items-center justify-center mr-4",
            service.bgColor
          )}>
             <Ionicons 
               name={service.icon} 
               size={24} 
               color={service.color} 
             />
          </View>

          <View className="flex-1">
            <View className="flex-row justify-between items-center mb-1">
              <Text className="text-secondary-400 text-[10px] font-bold uppercase tracking-wider">{service.title}</Text>
              <View className={cn("px-2 py-0.5 rounded-full flex-row items-center", style.bg)}>
                <View className={cn("w-1 h-1 rounded-full mr-1.5", style.dot)} />
                <Text className={cn("text-[9px] font-bold uppercase", style.text)}>{item.status}</Text>
              </View>
            </View>
            <Text className="text-secondary-900 font-bold text-sm mb-2" numberOfLines={1}>{item.title}</Text>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center opacity-60">
                <Ionicons name="calendar-outline" size={10} color="#64748b" />
                <Text className="text-secondary-500 text-[10px] ml-1 font-medium">
                  {dayjs(item.request_date).format('DD MMM YYYY')}
                </Text>
              </View>
              <Text className="text-secondary-300 text-[9px] font-medium mr-1">
                {dayjs(item.request_date).fromNow()}
              </Text>
            </View>
          </View>
          
          <View className="ml-2 opacity-20">
            <Ionicons name="chevron-forward" size={14} color="#64748b" />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [handleOpenDetail]);

  return (
    <View className="flex-1 bg-secondary-50">
      {/* Header with Safe Area Handling */}
      <View 
        className="bg-white px-6 border-b border-secondary-100 mb-6"
        style={{ paddingTop: Math.max(insets.top, 20), paddingBottom: 24 }}
      >
        <Text className="text-secondary-400 text-xs font-bold uppercase tracking-widest mb-1">Pusat Layanan</Text>
        <Text className="text-2xl font-extrabold text-secondary-900 tracking-tight">Riwayat Pengajuan</Text>
      </View>

      {/* Search & Filter */}
      <View className="px-6 mb-6">
        <View className="bg-white rounded-2xl px-5 h-14 flex-row items-center border border-secondary-200">
          <Ionicons name="search-outline" size={20} color="#94a3b8" />
          <TextInput
            placeholder="Cari pengajuan..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-3 text-secondary-800 font-semibold"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#cbd5e1" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.filterRow} className="px-6 mb-4">
        {['Semua', 'Pending', 'Selesai'].map((filter) => (
          <TouchableOpacity 
            key={filter}
            onPress={() => setActiveFilter(filter)}
            style={[
              styles.filterButton,
              activeFilter === filter ? styles.filterButtonActive : styles.filterButtonInactive
            ]}
          >
            <Text className={cn(
              "text-sm font-bold",
              activeFilter === filter ? "text-white" : "text-secondary-600"
            )}>{filter}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Module Filter Trigger Button */}
      <View className="px-6 mb-6">
        <TouchableOpacity 
          onPress={() => setModuleModalVisible(true)}
          activeOpacity={0.8}
          className="bg-white rounded-3xl p-5 border border-secondary-200 shadow-sm flex-row items-center justify-between"
        >
          <View className="flex-row items-center">
            {activeModule === 'Semua' ? (
              <View className="w-10 h-10 bg-indigo-50 rounded-xl items-center justify-center mr-4">
                <Ionicons name="grid-outline" size={20} color="#6366f1" />
              </View>
            ) : (
              <View className={cn("w-10 h-10 rounded-xl items-center justify-center mr-4", getServiceConfig(activeModule).bgColor)}>
                <Ionicons name={getServiceConfig(activeModule).icon} size={20} color={getServiceConfig(activeModule).color} />
              </View>
            )}
            <View>
              <Text className="text-secondary-400 text-[10px] font-bold uppercase tracking-widest mb-0.5">Filter Layanan</Text>
              <Text className="text-secondary-900 font-extrabold text-sm">
                {activeModule === 'Semua' ? 'Semua Layanan' : getServiceConfig(activeModule).title}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-down-outline" size={18} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6366f1" />
          <Text className="mt-4 text-secondary-400 font-semibold">Memuat riwayat...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredHistory}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
          }
          ListEmptyComponent={
            <View className="items-center justify-center flex-1 py-20 px-10">
              <View className="w-24 h-24 bg-secondary-100 rounded-full items-center justify-center mb-6">
                <Ionicons name="documents-outline" size={40} color="#cbd5e1" />
              </View>
              <Text className="text-secondary-900 font-extrabold text-lg text-center mb-2">Tidak ada data</Text>
              <Text className="text-secondary-400 text-center text-sm leading-6">Anda belum memiliki riwayat pengajuan atau tidak ada data yang sesuai dengan pencarian.</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Detail Modal */}
      <Modal visible={detailModalVisible} transparent animationType="fade" onRequestClose={() => setDetailModalVisible(false)}>
        <View className="flex-1 bg-black/70 justify-center">
          <Animated.View 
            entering={FadeIn.duration(200)}
            className="bg-white rounded-[40px] mx-6 max-h-[85%] shadow-2xl overflow-hidden last:mb-0"
          >
            {selectedItem && (() => {
              const item = selectedItem;
              const service = getServiceConfig(item.service_type);
              const statusStyle = getStatusStyle(item.status);

              return (
                <View>
                  <View className="px-8 pt-8">
                    <View className="flex-row justify-between items-center mb-6">
                      <View className="flex-row items-center">
                        <View className={cn(
                          "w-12 h-12 rounded-2xl items-center justify-center mr-4 shadow-sm",
                          service.bgColor
                        )}>
                          <Ionicons name={service.icon} size={24} color={service.color} />
                        </View>
                        <View>
                          <Text className="text-2xl font-black text-secondary-900 tracking-tight">Detail Pengajuan</Text>
                          <Text className="text-secondary-400 text-xs font-bold uppercase tracking-widest">#{item.id.toString().padStart(6, '0')}</Text>
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => setDetailModalVisible(false)} className="w-10 h-10 bg-secondary-50 rounded-full items-center justify-center">
                        <Ionicons name="close" size={24} color="#64748b" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <ScrollView 
                    showsVerticalScrollIndicator={false} 
                    contentContainerStyle={{ paddingHorizontal: 32, paddingBottom: 60 }}
                  >
                    {isDetailLoading ? (
                      <View className="py-20 items-center justify-center">
                        <ActivityIndicator size="large" color={service.color} />
                        <Text className="mt-4 text-secondary-400 font-bold uppercase tracking-widest text-[10px]">Memuat Detail...</Text>
                      </View>
                    ) : detailError ? (
                      <View className="py-20 items-center justify-center px-10">
                        <View className="w-16 h-16 bg-rose-50 rounded-full items-center justify-center mb-4">
                          <Ionicons name="alert-circle-outline" size={32} color="#e11d48" />
                        </View>
                        <Text className="text-secondary-900 font-bold text-center mb-2">{detailError}</Text>
                        <TouchableOpacity onPress={() => selectedItem && handleOpenDetail(selectedItem)} className="bg-secondary-100 px-6 py-2 rounded-xl">
                          <Text className="text-secondary-600 font-bold text-xs uppercase">Coba Lagi</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View>
                        <View className="mb-6">
                          <View className="bg-secondary-50/70 p-6 rounded-[32px] border border-secondary-100 items-center">
                            <View className={cn("px-5 py-2 rounded-2xl flex-row items-center mb-4", statusStyle.bg)}>
                              <View className={cn("w-2 h-2 rounded-full mr-2", statusStyle.dot)} />
                              <Text className={cn("text-[10px] font-bold uppercase tracking-wider", statusStyle.text)}>{item.status}</Text>
                            </View>
                            <Text className="text-xl font-bold text-secondary-900 text-center mb-2 leading-7">{item.title}</Text>
                            <Text className="text-secondary-400 font-bold uppercase text-[10px] tracking-widest">{service.title}</Text>
                          </View>
                        </View>

                        <View className="flex-row mb-6 space-x-3">
                          <View className="flex-1 bg-white p-5 rounded-[28px] border border-secondary-100 shadow-sm items-center">
                            <Text className="text-secondary-400 text-[9px] font-bold uppercase mb-2 tracking-widest">Tanggal Input</Text>
                            <View className="flex-row items-center">
                              <Ionicons name="calendar-outline" size={14} color={service.color} />
                              <Text className="text-secondary-900 font-extrabold text-xs ml-2">{dayjs(item.request_date).format('DD MMM YYYY')}</Text>
                            </View>
                          </View>
                          <View className="flex-1 bg-white p-5 rounded-[28px] border border-secondary-100 shadow-sm items-center">
                            <Text className="text-secondary-400 text-[9px] font-bold uppercase mb-2 tracking-widest">Pukul</Text>
                            <View className="flex-row items-center">
                              <Ionicons name="time-outline" size={14} color={service.color} />
                              <Text className="text-secondary-900 font-extrabold text-xs ml-2">{dayjs(item.request_date).format('HH:mm')}</Text>
                            </View>
                          </View>
                        </View>

                        <View className="mb-6">
                          <Text className="text-secondary-400 text-[10px] font-bold uppercase tracking-widest mb-4 ml-4">Deskripsi Layanan</Text>
                          <View className="bg-white p-6 rounded-[32px] border border-secondary-100 shadow-sm">
                            <Text className="text-secondary-700 text-sm leading-6 font-medium">
                              {item.description || (item.data && (item.data.reason || item.data.description || item.data.problem_details)) || 'Tidak ada deskripsi detail yang tersedia.'}
                            </Text>
                          </View>
                        </View>

                        {item.data && Object.keys(item.data).length > 0 && (
                          <View className="mb-8">
                            <Text className="text-secondary-400 text-[10px] font-bold uppercase tracking-widest mb-4 ml-4">Informasi Teknis</Text>
                            <View className="bg-white rounded-[32px] overflow-hidden border border-secondary-100 shadow-sm">
                              {(() => {
                                const data = item.data;
                                const type = item.service_type;

                                const InfoRow = ({ label, value, isLast = false }: { label: string; value: string | React.ReactNode; isLast?: boolean }) => (
                                  <View className={cn("p-6 flex-col", !isLast ? "border-b border-secondary-50" : "")}>
                                    <Text className="text-secondary-400 text-[10px] font-bold uppercase tracking-widest">{label}</Text>
                                    {typeof value === 'string' ? (
                                      <Text className="text-secondary-900 font-bold text-xs mt-1.5 leading-5">{value}</Text>
                                    ) : (
                                      <View className="mt-2">{value}</View>
                                    )}
                                  </View>
                                );

                                const SectionTitle = ({ title }: { title: string }) => (
                                  <View className="bg-secondary-50/50 py-3 px-6 border-b border-secondary-100">
                                    <Text className="text-secondary-500 text-[9px] font-black uppercase tracking-[2px]">{title}</Text>
                                  </View>
                                );

                                switch (type) {
                                  case 'bmn_loan':
                                    return (
                                      <View>
                                        <InfoRow label="Nomor SPA" value={data.spa_number} />
                                        <InfoRow label="Peminjam" value={data.borrower_name} />
                                        <InfoRow label="Waktu Pinjam" value={`${dayjs(data.loan_date).format('DD MMM YYYY')} – ${dayjs(data.return_date).format('DD MMM YYYY')}`} />
                                        <InfoRow label="Alasan / Catatan" value={data.notes || '-'} />
                                        {data.assets && Array.isArray(data.assets) && (
                                          <View>
                                            <SectionTitle title="Aset yang Dipinjam" />
                                            {data.assets.map((asset: any, idx: number) => (
                                              <View key={idx} className={cn("p-6 bg-white", idx !== data.assets.length - 1 ? "border-b border-secondary-50" : "")}>
                                                <Text className="text-secondary-900 font-bold text-sm mb-1">{asset.nama_barang || asset.name}</Text>
                                                <View className="flex-row items-center">
                                                  <View className="bg-secondary-100 px-2 py-0.5 rounded-md mr-2">
                                                    <Text className="text-secondary-500 text-[9px] font-bold uppercase">NUP: {asset.nup || '-'}</Text>
                                                  </View>
                                                  <Text className="text-secondary-400 text-[10px] font-medium">{asset.merek_barang || asset.brand || 'Tanpa Merek'}</Text>
                                                </View>
                                              </View>
                                            ))}
                                          </View>
                                        )}
                                      </View>
                                    );
                                  
                                  case 'it_helpdesk':
                                    return (
                                      <View>
                                        <InfoRow label="Prangkat / Sistem" value={data.device_name || data.category} />
                                        <InfoRow label="Kategori Kendala" value={data.problem_type || data.category} />
                                        <InfoRow label="Prioritas" value={data.priority?.toUpperCase()} />
                                        <InfoRow label="Detail Masalah" value={data.description || data.problem_details || '-'} isLast />
                                      </View>
                                    );

                                  case 'exit_permit':
                                    const formatDuration = (sec: number) => {
                                      if (!sec) return '-';
                                      const m = Math.floor(sec / 60);
                                      const s = sec % 60;
                                      return `${String(m).padStart(2, '0')} : ${String(s).padStart(2, '0')}`;
                                    };
                                    return (
                                      <View>
                                        <InfoRow label="Jam Keluar" value={data.exit_time ? data.exit_time.substring(0, 5) : dayjs(item.request_date).format('HH:mm')} />
                                        <InfoRow label="Jam Kembali" value={data.return_time ? data.return_time.substring(0, 5) : '-'} />
                                        <InfoRow label="Total Izin Keluar" value={formatDuration(data.duration_seconds || (data.duration_minutes * 60))} />
                                        <InfoRow label="Keperluan" value={data.reason || '-'} isLast />
                                      </View>
                                    );

                                  case 'inventory_request':
                                    return (
                                      <View>
                                        <InfoRow label="Nomor SPB" value={data.spb_number} />
                                        <InfoRow label="Unit Pemohon" value={data.unit_name || '-'} />
                                        {data.items && Array.isArray(data.items) && (
                                          <View>
                                            <SectionTitle title="Daftar Barang" />
                                            {data.items.map((inv: any, idx: number) => (
                                              <View key={idx} className={cn("px-6 py-4 bg-white flex-row justify-between items-center", idx !== data.items.length - 1 ? "border-b border-secondary-50" : "")}>
                                                <View className="flex-1 mr-4">
                                                  <Text className="text-secondary-900 font-bold text-xs">{inv.inventory?.nama_barang || inv.item_name}</Text>
                                                </View>
                                                <View className="bg-primary-50 px-3 py-1 rounded-full">
                                                  <Text className="text-primary-600 font-black text-[10px]">{inv.quantity} Unit</Text>
                                                </View>
                                              </View>
                                            ))}
                                          </View>
                                        )}
                                      </View>
                                    );

                                  case 'surat_tugas':
                                    return (
                                      <View>
                                        <InfoRow label="Lokasi Tugas" value={data.lokasi_tugas} />
                                        <InfoRow label="MAK" value={data.mak || '-'} />
                                        <InfoRow label="Deskripsi Tugas" value={data.deskripsi_tugas || '-'} />
                                        {data.employees && Array.isArray(data.employees) && (
                                          <View>
                                            <SectionTitle title="Tim Pelaksana" />
                                            {data.employees.map((emp: any, idx: number) => (
                                              <View key={idx} className={cn("p-6 bg-white", idx !== data.employees.length - 1 ? "border-b border-secondary-50" : "")}>
                                                <Text className="text-secondary-900 font-bold text-xs">{emp.name}</Text>
                                                <Text className="text-secondary-400 text-[10px] uppercase font-bold mt-1 tracking-widest">{emp.nip || '-'}</Text>
                                              </View>
                                            ))}
                                          </View>
                                        )}
                                      </View>
                                    );

                                  default:
                                    // Fallback for unknown types (Generic List)
                                    return Object.entries(data).map(([key, value], idx, arr) => {
                                      if (['_id', 'id', 'created_at', 'updated_at', 'deleted_at', 'status', 'title', 'service_type', 'ticket_number', 'description'].includes(key)) return null;
                                      
                                      let valueStr = '';
                                      if (value && typeof value === 'object') {
                                        if (Array.isArray(value)) {
                                          if (value.length === 0) return null;
                                          valueStr = value.map(v => (v && (v.name || v.title || v.asset_name)) || JSON.stringify(v)).join(', ');
                                        } else {
                                          valueStr = (value as any).name || (value as any).title || JSON.stringify(value);
                                        }
                                      } else {
                                        valueStr = String(value ?? '');
                                      }

                                      if (!valueStr || valueStr === 'null' || valueStr === 'undefined' || valueStr === '-') return null;

                                      return <InfoRow key={key} label={key.replace(/_/g, ' ')} value={valueStr} isLast={idx === arr.length - 1} />;
                                    });
                                }
                              })()}
                            </View>
                          </View>
                        )}

                        <TouchableOpacity 
                          onPress={() => setDetailModalVisible(false)}
                          activeOpacity={0.8}
                          style={{ backgroundColor: service.color }}
                          className="h-16 rounded-3xl items-center justify-center mb-4 shadow-lg"
                        >
                          <Text className="text-white font-bold text-base uppercase tracking-widest">Tutup Detail</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </ScrollView>
                </View>
              );
            })()}
          </Animated.View>
        </View>
      </Modal>

      {/* Module Selection Modal (Bottom Sheet Style) */}
      <Modal visible={moduleModalVisible} transparent animationType="fade" onRequestClose={() => setModuleModalVisible(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <Animated.View 
            entering={FadeIn.duration(200)}
            className="bg-white rounded-t-[48px] p-8 max-h-[80%] shadow-2xl"
          >
            {/* Modal Handle */}
            <View className="w-12 h-1.5 bg-secondary-200 rounded-full self-center -mt-2 mb-8" />
            
            <View className="flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-2xl font-black text-secondary-900 tracking-tight">Pilih Layanan</Text>
                <Text className="text-secondary-400 text-xs font-bold uppercase tracking-widest mt-1">Filter riwayat pengajuan</Text>
              </View>
              <TouchableOpacity onPress={() => setModuleModalVisible(false)} className="w-10 h-10 bg-secondary-50 rounded-full items-center justify-center">
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="mb-6">
              {/* Option: Semua */}
              <TouchableOpacity 
                onPress={() => {
                  setActiveModule('Semua');
                  setModuleModalVisible(false);
                }}
                className={cn(
                  "p-5 rounded-3xl mb-3 flex-row items-center border",
                  activeModule === 'Semua' ? "bg-indigo-50 border-indigo-200" : "bg-secondary-50/50 border-secondary-100"
                )}
              >
                <View className={cn(
                  "w-12 h-12 rounded-2xl items-center justify-center mr-4",
                  activeModule === 'Semua' ? "bg-indigo-500" : "bg-secondary-200"
                )}>
                  <Ionicons name="grid-outline" size={24} color="white" />
                </View>
                <View className="flex-1">
                  <Text className={cn("text-base font-bold", activeModule === 'Semua' ? "text-indigo-900" : "text-secondary-900")}>Semua Layanan</Text>
                  <Text className="text-secondary-400 text-xs font-medium">Tampilkan semua jenis pengajuan</Text>
                </View>
                {activeModule === 'Semua' && <Ionicons name="checkmark-circle" size={24} color="#6366f1" />}
              </TouchableOpacity>

              {/* Module Options */}
              {Object.entries(SERVICE_CONFIG).map(([key, config]) => (
                <TouchableOpacity 
                  key={key}
                  onPress={() => {
                    setActiveModule(key);
                    setModuleModalVisible(false);
                  }}
                  className={cn(
                    "p-5 rounded-3xl mb-3 flex-row items-center border",
                    activeModule === key ? "bg-white border-2 shadow-sm" : "bg-secondary-50/50 border-secondary-100"
                  )}
                  style={activeModule === key ? { borderColor: config.color } : null}
                >
                  <View className={cn("w-12 h-12 rounded-2xl items-center justify-center mr-4", config.bgColor)}>
                    <Ionicons name={config.icon} size={24} color={config.color} />
                  </View>
                  <View className="flex-1">
                    <Text className={cn("text-base font-bold", activeModule === key ? "text-secondary-900" : "text-secondary-700")}>{config.title}</Text>
                    <Text className="text-secondary-400 text-xs font-medium">Layanan {config.title.toLowerCase()}</Text>
                  </View>
                  {activeModule === key && <Ionicons name="checkmark-circle" size={24} color={config.color} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 24,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  filterButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  filterButtonInactive: {
    backgroundColor: '#ffffff',
    borderColor: '#f1f5f9',
  },
  modalContent: {
    flex: 1,
  },
  moduleFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    marginRight: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  moduleFilterActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  moduleFilterInactive: {
    backgroundColor: '#ffffff',
    borderColor: '#f1f5f9',
  },
});
