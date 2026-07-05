import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Card, Button } from '../../components';
import { cn } from '../../utils/cn';
import { validationService, ValidationItem, ValidationStats } from '../../services/validationService';
import { useAuthStore } from '../../store/authStore';

interface ValidationListScreenProps {
  navigation: any;
}

// Mapping module slug ke tipe validasi
const MODULE_TYPE_MAP: Record<string, string> = {
  // BMN modules
  'bmn-peminjaman-aset': 'bmn_loan',
  'bmn-permintaan-persediaan': 'inventory_request',
  'bmn-pemeliharaan-keluhan': 'bmn_maintenance',
  'bmn': 'bmn_loan', // fallback untuk modul BMN umum
  
  // Kepegawaian
  'kepegawaian-surat-tugas': 'surat_tugas',
  'kepegawaian': 'surat_tugas', // fallback
  
  // Kearsipan
  'arsip-peminjaman': 'archive_loan',
  'kearsipan': 'archive_loan', // fallback
  
  // IT
  'it-helpdesk': 'it_helpdesk',
  'it': 'it_helpdesk', // fallback
  
  // Legacy module slugs (untuk kompatibilitas)
  'loans': 'bmn_loan',
  'inventory': 'inventory_request',
  'requests': 'bmn_maintenance',
};

// Semua service types yang tersedia
const ALL_SERVICE_TYPES = [
  { key: 'all', label: 'Semua', icon: 'apps-outline', modules: [] },
  { key: 'bmn_loan', label: 'Peminjaman BMN', icon: 'car-outline', modules: ['bmn-peminjaman-aset', 'bmn', 'loans'] },
  { key: 'inventory_request', label: 'Permintaan Persediaan', icon: 'cart-outline', modules: ['bmn-permintaan-persediaan', 'inventory'] },
  { key: 'bmn_maintenance', label: 'Laporan BMN', icon: 'construct-outline', modules: ['bmn-pemeliharaan-keluhan', 'requests'] },
  { key: 'surat_tugas', label: 'Surat Tugas', icon: 'document-attach-outline', modules: ['kepegawaian-surat-tugas', 'kepegawaian'] },
  { key: 'archive_loan', label: 'Peminjaman Arsip', icon: 'folder-open-outline', modules: ['arsip-peminjaman', 'kearsipan'] },
  { key: 'it_helpdesk', label: 'IT Helpdesk', icon: 'desktop-outline', modules: ['it-helpdesk', 'it'] },
];

const statusFilters = [
  { key: 'all', label: 'Semua', color: '#64748b' },
  { key: 'pending', label: 'Menunggu', color: '#d97706' },
  { key: 'approved', label: 'Disetujui', color: '#059669' },
  { key: 'rejected', label: 'Ditolak', color: '#dc2626' },
];

export const ValidationListScreen: React.FC<ValidationListScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [validations, setValidations] = useState<ValidationItem[]>([]);
  const [stats, setStats] = useState<ValidationStats | null>(null);
  const [selectedServiceFilter, setSelectedServiceFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Get user's validator modules from module_permissions
  const getUserValidatorModules = useCallback((): string[] => {
    if (!user) return [];
    
    // Admin dapat melihat semua
    const isAdmin = user.base_role === 'admin' || user.role === 'admin';
    if (isAdmin) {
      return Object.keys(MODULE_TYPE_MAP);
    }
    
    // Validator hanya melihat yang diizinkan
    const modulePermissions = (user as any).module_permissions || [];
    const allowedModules: string[] = [];
    
    for (const perm of modulePermissions) {
      if (perm.is_validator && perm.module_slug) {
        allowedModules.push(perm.module_slug);
      }
    }
    
    return allowedModules;
  }, [user]);

  // Filter service types based on user permissions
  const getAllowedServiceTypes = useCallback(() => {
    const allowedModules = getUserValidatorModules();
    
    // If no modules assigned, return empty array (or all for backward compatibility)
    if (allowedModules.length === 0) {
      return ALL_SERVICE_TYPES;
    }
    
    // Filter service types that have at least one allowed module
    return ALL_SERVICE_TYPES.filter(serviceType => {
      // Always show 'all'
      if (serviceType.key === 'all') return true;
      
      // Check if any of the service type's modules are in allowed modules
      return serviceType.modules.some(module => allowedModules.includes(module));
    });
  }, [getUserValidatorModules]);

  const fetchData = async () => {
    try {
      const response = await validationService.getAllValidations();
      if (response.success) {
        setValidations(response.data || []);
        if (response.stats) {
          setStats(response.stats);
        }
      }
    } catch (error: any) {
      console.error('Error fetching validations:', error);
      Alert.alert('Error', 'Gagal memuat data validasi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  const handleApprove = async (item: ValidationItem) => {
    Alert.alert(
      'Konfirmasi',
      `Setujui ${validationService.getLabelByType(item.type)} dari ${item.requester_name}?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Setujui',
          style: 'default',
          onPress: async () => {
            setActionLoading(item.id);
            try {
              await validationService.approve(item.type, item.id);
              Alert.alert('Sukses', 'Permintaan berhasil disetujui');
              fetchData();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Gagal menyetujui permintaan');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleReject = (item: ValidationItem) => {
    Alert.alert(
      'Konfirmasi',
      `Tolak ${validationService.getLabelByType(item.type)} dari ${item.requester_name}?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Tolak',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(item.id);
            try {
              await validationService.reject(item.type, item.id, 'Ditolak oleh validator');
              Alert.alert('Sukses', 'Permintaan berhasil ditolak');
              fetchData();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Gagal menolak permintaan');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleViewDetail = (item: ValidationItem) => {
    console.log('handleViewDetail called with item:', JSON.stringify(item, null, 2));
    
    if (!item || !item.id || !item.type) {
      Alert.alert('Error', 'Data item tidak valid');
      return;
    }
    
    const params = {
      id: item.id.toString(),
      type: item.type,
      title: validationService.getLabelByType(item.type),
      itemData: item  // Pass full item data to avoid fetching
    };
    
    console.log('Navigating to ValidationDetail with params:', params);
    
    try {
      navigation.navigate('ValidationDetail', params);
      console.log('Navigation called successfully');
    } catch (error: any) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Gagal membuka halaman detail: ' + error.message);
    }
  };

  // Filter validations by user permissions first
  const allowedModules = getUserValidatorModules();
  const isAdmin = user?.base_role === 'admin' || user?.role === 'admin';
  
  const validationsByPermission = isAdmin 
    ? validations 
    : validations.filter(v => {
        // Find module slug for this validation type
        const moduleSlug = Object.entries(MODULE_TYPE_MAP).find(
          ([_, type]) => type === v.type
        )?.[0];
        return moduleSlug && allowedModules.includes(moduleSlug);
      });

  // Filter by service type
  const filteredByService = selectedServiceFilter === 'all' 
    ? validationsByPermission 
    : validationsByPermission.filter(v => v.type === selectedServiceFilter);

  // Filter by status
  const filteredValidations = selectedStatusFilter === 'all'
    ? filteredByService
    : filteredByService.filter(v => {
        if (selectedStatusFilter === 'pending') {
          return ['pending', 'open', 'draft', 'waiting_approval'].includes(v.status);
        } else if (selectedStatusFilter === 'approved') {
          return ['approved', 'completed', 'in_progress', 'active', 'returned'].includes(v.status);
        } else if (selectedStatusFilter === 'rejected') {
          return ['rejected', 'cancelled', 'closed'].includes(v.status);
        }
        return true;
      });

  const getCountByService = (filterKey: string) => {
    // Calculate count from filtered data based on permissions
    if (filterKey === 'all') return validationsByPermission.length;
    return validationsByPermission.filter(v => v.type === filterKey).length;
  };

  const getCountByStatus = (statusKey: string) => {
    if (statusKey === 'all') return validationsByPermission.length;
    
    const statusMap: Record<string, string[]> = {
      pending: ['pending', 'open', 'draft', 'waiting_approval', 'pengajuan'],
      approved: ['approved', 'completed', 'in_progress', 'active', 'returned', 'dipinjam', 'disetujui'],
      rejected: ['rejected', 'cancelled', 'closed', 'ditolak'],
    };
    
    const statuses = statusMap[statusKey] || [statusKey];
    return validationsByPermission.filter(v => statuses.includes(v.status)).length;
  };

  const renderStatusBadge = (status: string) => {
    const statusStyle = validationService.getStatusColor(status);
    return (
      <View className={`px-2 py-1 rounded-full ${statusStyle.bg}`}>
        <Text className={`text-xs font-bold ${statusStyle.text}`}>
          {statusStyle.label}
        </Text>
      </View>
    );
  };

  // Check if item can be approved/rejected (only pending items)
  const canTakeAction = (status: string) => {
    return ['pending', 'open', 'draft', 'waiting_approval'].includes(status);
  };

  if (loading || !user) {
    return (
      <View className="flex-1 items-center justify-center bg-secondary-50">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="mt-4 text-secondary-500 font-medium">Memuat data...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-secondary-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-primary-600 px-6 pt-4 pb-6">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            className="p-2 -ml-2 rounded-full active:bg-primary-700"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View className="ml-4 flex-1">
            <Text className="text-white text-xl font-bold">Validasi Permintaan</Text>
            <Text className="text-primary-200 text-sm">
              {getCountByService('all')} total permintaan
            </Text>
          </View>
        </View>
      </View>

      {/* Stats Summary */}
      <View className="bg-white px-4 py-3 border-b border-secondary-200">
        <View className="flex-row">
          <View className="flex-1 items-center p-2 bg-amber-50 rounded-xl mr-2">
            <Text className="text-2xl font-bold text-amber-600">{getCountByStatus('pending')}</Text>
            <Text className="text-xs text-amber-700">Menunggu</Text>
          </View>
          <View className="flex-1 items-center p-2 bg-green-50 rounded-xl mx-1">
            <Text className="text-2xl font-bold text-green-600">{getCountByStatus('approved')}</Text>
            <Text className="text-xs text-green-700">Disetujui</Text>
          </View>
          <View className="flex-1 items-center p-2 bg-red-50 rounded-xl ml-2">
            <Text className="text-2xl font-bold text-red-600">{getCountByStatus('rejected')}</Text>
            <Text className="text-xs text-red-700">Ditolak</Text>
          </View>
        </View>
      </View>

      {/* Status Filter Tabs */}
      <View className="bg-white border-b border-secondary-200">
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          className="px-4 py-2"
        >
          {statusFilters.map((status) => {
            const count = getCountByStatus(status.key);
            const isActive = selectedStatusFilter === status.key;
            
            return (
              <TouchableOpacity
                key={status.key}
                onPress={() => setSelectedStatusFilter(status.key)}
                className={cn(
                  "flex-row items-center px-4 py-2 rounded-full mr-2",
                  isActive ? "bg-primary-600" : "bg-secondary-100"
                )}
              >
                <Text className={cn(
                  "text-sm font-medium",
                  isActive ? "text-white" : "text-secondary-600"
                )}>
                  {status.label}
                </Text>
                <View className={cn(
                  "ml-2 px-2 py-0.5 rounded-full",
                  isActive ? "bg-white/30" : "bg-secondary-300"
                )}>
                  <Text className={cn(
                    "text-xs font-bold",
                    isActive ? "text-white" : "text-secondary-700"
                  )}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Service Filter Tabs */}
      <View className="bg-white border-b border-secondary-200">
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          className="px-4 py-2"
        >
          {getAllowedServiceTypes().map((service) => {
            const count = getCountByService(service.key);
            const isActive = selectedServiceFilter === service.key;
            
            return (
              <TouchableOpacity
                key={service.key}
                onPress={() => setSelectedServiceFilter(service.key)}
                className={cn(
                  "flex-row items-center px-3 py-2 rounded-full mr-2",
                  isActive ? "bg-secondary-800" : "bg-secondary-100"
                )}
              >
                <Ionicons 
                  name={service.icon as any} 
                  size={14} 
                  color={isActive ? '#fff' : '#64748b'} 
                />
                <Text className={cn(
                  "ml-1.5 text-xs font-medium",
                  isActive ? "text-white" : "text-secondary-600"
                )}>
                  {service.label}
                </Text>
                {count > 0 && (
                  <Text className={cn(
                    "ml-1.5 text-xs",
                    isActive ? "text-white/70" : "text-secondary-400"
                  )}>
                    ({count})
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      <ScrollView 
        className="flex-1 px-4 pt-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Show message if user has no validator access */}
        {!isAdmin && getUserValidatorModules().length === 0 ? (
          <View className="items-center justify-center py-12 px-6">
            <View className="w-20 h-20 bg-secondary-100 rounded-full items-center justify-center mb-4">
              <Ionicons name="lock-closed-outline" size={40} color="#94a3b8" />
            </View>
            <Text className="text-secondary-600 text-lg font-medium text-center">Tidak Memiliki Akses</Text>
            <Text className="text-secondary-400 text-sm mt-1 text-center">
              Anda tidak memiliki hak akses validator untuk modul apapun. Hubungi admin untuk mendapatkan akses.
            </Text>
          </View>
        ) : filteredValidations.length === 0 ? (
          <View className="items-center justify-center py-12">
            <View className="w-20 h-20 bg-secondary-100 rounded-full items-center justify-center mb-4">
              <Ionicons name="document-text-outline" size={40} color="#94a3b8" />
            </View>
            <Text className="text-secondary-600 text-lg font-medium">Tidak ada data</Text>
            <Text className="text-secondary-400 text-sm mt-1 text-center">
              Tidak ada permintaan untuk filter yang dipilih
            </Text>
          </View>
        ) : (
          <>
            <Text className="text-secondary-600 text-sm mb-3">
              Menampilkan {filteredValidations.length} dari {validationsByPermission.length} permintaan
            </Text>
            
            {filteredValidations.map((item) => (
              <Card key={`${item.type}-${item.id}`} className="mb-3 p-4">
                {/* Header */}
                <View className="flex-row items-start">
                  <View 
                    className="w-10 h-10 rounded-xl items-center justify-center"
                    style={{ backgroundColor: `${validationService.getColorByType(item.type)}20` }}
                  >
                    <Ionicons 
                      name={validationService.getIconByType(item.type) as any} 
                      size={20} 
                      color={validationService.getColorByType(item.type)} 
                    />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-secondary-900 font-bold text-base">
                      {item.title}
                    </Text>
                    <Text className="text-secondary-500 text-xs mt-0.5">
                      {validationService.getLabelByType(item.type)}
                    </Text>
                  </View>
                  {renderStatusBadge(item.status)}
                </View>

                {/* Info Pemohon */}
                <View className="mt-3 pt-3 border-t border-secondary-100">
                  <View className="flex-row items-center">
                    <Ionicons name="person-outline" size={14} color="#64748b" />
                    <Text className="ml-2 text-secondary-700 text-sm flex-1">
                      {item.requester_name}
                    </Text>
                  </View>
                  {item.requester_unit && (
                    <View className="flex-row items-center mt-1">
                      <Ionicons name="business-outline" size={14} color="#64748b" />
                      <Text className="ml-2 text-secondary-500 text-xs flex-1">
                        {item.requester_unit}
                      </Text>
                    </View>
                  )}
                  <View className="flex-row items-center mt-1">
                    <Ionicons name="time-outline" size={14} color="#64748b" />
                    <Text className="ml-2 text-secondary-500 text-xs">
                      {item.formatted_date || item.created_at}
                    </Text>
                  </View>
                </View>

                {/* Description */}
                {item.description && (
                  <Text className="mt-2 text-secondary-600 text-sm leading-5" numberOfLines={2}>
                    {item.description}
                  </Text>
                )}

                {/* Validator Info (if processed) */}
                {!canTakeAction(item.status) && item.approved_by && (
                  <View className="mt-2 p-2 bg-secondary-50 rounded-lg">
                    <Text className="text-secondary-500 text-xs">
                      {['approved', 'completed', 'active'].includes(item.status) ? 'Disetujui' : 'Diproses'} oleh: {item.approved_by}
                    </Text>
                    {item.validator_notes && (
                      <Text className="text-secondary-400 text-xs mt-0.5">
                        Catatan: {item.validator_notes}
                      </Text>
                    )}
                  </View>
                )}

                {/* Actions */}
                <View className="flex-row mt-4 gap-2">
                  <Button
                    title="Detail"
                    variant="outline"
                    onPress={() => handleViewDetail(item)}
                    className="flex-1 h-10"
                    size="sm"
                  />
                  {canTakeAction(item.status) && (
                    <>
                      <Button
                        title="Tolak"
                        variant="danger"
                        onPress={() => handleReject(item)}
                        loading={actionLoading === item.id}
                        disabled={actionLoading !== null}
                        className="flex-1 h-10 bg-red-500"
                        size="sm"
                      />
                      <Button
                        title="Setujui"
                        onPress={() => handleApprove(item)}
                        loading={actionLoading === item.id}
                        disabled={actionLoading !== null}
                        className="flex-1 h-10"
                        size="sm"
                      />
                    </>
                  )}
                </View>
              </Card>
            ))}
            
            <View className="h-8" />
          </>
        )}
      </ScrollView>
    </View>
  );
};
