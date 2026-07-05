import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StatCard, MenuCard } from '../../components';
import { useAuthStore } from '../../store/authStore';
import { dashboardService } from '../../services/dashboardService';
import { getHighestRole } from '../../utils/auth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Stats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  totalAssets: number;
}

interface ValidatorStat {
  title: string;
  description: string;
  pending: number;
  slug: string;
  color: string;
}

const menuItems: { id: string; title: string; description: string; icon: any; color: string; route: string }[] = [
  {
    id: '1',
    title: 'Peminjaman Aset',
    description: 'Pinjam aset dan ruangan',
    icon: 'briefcase-outline' as const,
    color: '#2563eb',
    route: 'AssetLoan',
  },
  {
    id: '2',
    title: 'IT Helpdesk',
    description: 'Laporkan masalah IT',
    icon: 'desktop-outline' as const,
    color: '#7c3aed',
    route: 'ItHelpdesk',
  },
  {
    id: '3',
    title: 'Permintaan Persediaan',
    description: 'Ajukan permintaan barang',
    icon: 'cart-outline' as const,
    color: '#059669',
    route: 'InventoryRequest',
  },
  {
    id: '4',
    title: 'Izin Keluar',
    description: 'Ajukan izin keluar kantor',
    icon: 'walk-outline' as const,
    color: '#dc2626',
    route: 'ExitPermit',
  },
  {
    id: '5',
    title: 'Peminjaman Arsip',
    description: 'Pinjam dokumen arsip',
    icon: 'folder-open-outline' as const,
    color: '#d97706',
    route: 'ArchiveLoan',
  },
  {
    id: '6',
    title: 'Pengajuan PDTT',
    description: 'Pengadaan barang/jasa',
    icon: 'file-tray-full-outline' as const,
    color: '#0891b2',
    route: 'PdttRequest',
  },
  {
    id: '7',
    title: 'Surat Tugas',
    description: 'Buat surat penugasan',
    icon: 'document-attach-outline' as const,
    color: '#4f46e5',
    route: 'SuratTugas',
  },
  {
    id: '8',
    title: 'Laporan BMN',
    description: 'Pemeliharaan & keluhan',
    icon: 'construct-outline' as const,
    color: '#0f766e',
    route: 'MaintenanceReport',
  },
];

export const DashboardScreen: React.FC<any> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  // Using navigation from props injected by the tab navigator
  // const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    totalAssets: 0,
  });
  const [validatorStats, setValidatorStats] = useState<ValidatorStat[]>([]);
  const [operatorStats, setOperatorStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    active: 0,
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const loadStats = async () => {
    const role = getHighestRole(user);
    try {
      if (role === 'Admin') {
        const response = await dashboardService.getStats();
        setStats(response.data);
      } else if (role === 'Validator') {
        const response = await dashboardService.getValidatorStats();
        if (response.data?.success) {
          setValidatorStats(response.data.data);
        }
      } else {
        // Operator or User: Get personal stats
        const response = await dashboardService.getMyServiceHistory();
        const data = response.data?.data || [];
        setOperatorStats({
          total: data.length,
          pending: data.filter((item: any) => ['pending', 'open', 'draft'].includes(item.status)).length,
          completed: data.filter((item: any) => ['completed', 'returned'].includes(item.status)).length,
          active: data.filter((item: any) => ['approved', 'in_progress', 'out'].includes(item.status)).length,
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  useEffect(() => {
    loadStats();
  }, []);

  const renderStats = () => {
    const role = getHighestRole(user);

    if (role === 'Admin') {
      return (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row -mx-1"
        >
          <View className="px-1">
            <StatCard
              title="Total Pengajuan"
              value={stats.totalRequests}
              icon="document-text-outline"
              color="#2563eb"
            />
          </View>
          <View className="px-1">
            <StatCard
              title="Menunggu"
              value={stats.pendingRequests}
              icon="time-outline"
              color="#d97706"
            />
          </View>
          <View className="px-1">
            <StatCard
              title="Disetujui"
              value={stats.approvedRequests}
              icon="checkmark-circle-outline"
              color="#059669"
            />
          </View>
          <View className="px-1">
            <StatCard
              title="Total Aset"
              value={stats.totalAssets}
              icon="cube-outline"
              color="#7c3aed"
            />
          </View>
        </ScrollView>
      );
    }

    if (role === 'Validator') {
      return (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row -mx-1"
        >
          {validatorStats.length > 0 ? (
            validatorStats.map((stat, idx) => (
              <View key={idx} className="px-1">
                <StatCard
                  title={stat.title}
                  value={stat.pending}
                  icon="shield-checkmark-outline"
                  color={stat.color === 'orange' ? '#d97706' : stat.color === 'blue' ? '#2563eb' : '#059669'}
                />
              </View>
            ))
          ) : (
            <View className="px-1">
              <StatCard
                title="Tidak Ada Antrean"
                value={0}
                icon="checkmark-done-circle"
                color="#059669"
              />
            </View>
          )}
        </ScrollView>
      );
    }

    // Default / Operator Layout
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="flex-row -mx-1"
      >
        <View className="px-1">
          <StatCard
            title="Total Saya"
            value={operatorStats.total}
            icon="folder-open-outline"
            color="#2563eb"
          />
        </View>
        <View className="px-1">
          <StatCard
            title="Menunggu"
            value={operatorStats.pending}
            icon="time-outline"
            color="#d97706"
          />
        </View>
        <View className="px-1">
          <StatCard
            title="Selesai"
            value={operatorStats.completed}
            icon="checkmark-circle-outline"
            color="#059669"
          />
        </View>
        <View className="px-1">
          <StatCard
            title="Sedang Aktif"
            value={operatorStats.active}
            icon="rocket-outline"
            color="#7c3aed"
          />
        </View>
      </ScrollView>
    );
  };

  return (
    <View className="flex-1 bg-secondary-50" style={{ paddingTop: Math.max(insets.top, 20) }}>
      {/* Premium Header */}
      <View 
        className="bg-primary-600 px-6 pt-4 pb-12 rounded-b-[48px] shadow-2xl shadow-primary-900/40"
      >
        <View className="flex-row items-center justify-between mt-2">
          <View className="flex-row items-center flex-1">
            {/* Avatar Component */}
            <View 
              className="w-14 h-14 bg-primary-400 rounded-2xl items-center justify-center border-2 border-primary-300 shadow-inner"
            >
              <Text className="text-white text-xl font-bold">
                {user?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
              </Text>
              <View className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-primary-600 rounded-full" />
            </View>
            
            <View 
              className="ml-4 flex-1"
            >
              <Text className="text-primary-100 text-xs font-medium uppercase tracking-wider">
                {getHighestRole(user)},
              </Text>
              <Text className="text-white text-xl font-extrabold tracking-tight" numberOfLines={1}>
                {user?.name || 'Pengguna'}
              </Text>
              <View className="flex-row items-center mt-0.5">
                <Ionicons name="location-sharp" size={10} color="#93c5fd" />
                <Text className="text-primary-200 text-[10px] font-semibold ml-1 uppercase flex-1" numberOfLines={1}>
                  {user?.employee?.position || user?.jabatan || user?.employee?.department || user?.employee?.function_area || user?.unit || user?.function_area || 'Staff'}
                </Text>
              </View>
            </View>
          </View>

          <View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Notifications')}
              className="w-12 h-12 bg-white/10 rounded-2xl items-center justify-center border border-white/20 active:bg-white/20"
            >
              <View className="relative">
                <Ionicons name="notifications" size={24} color="white" />
                <View className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 border-2 border-primary-600 rounded-full" />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Section */}
        <View className="px-4 -mt-4">
          {renderStats()}
        </View>

        {/* Menu Section */}
        <View className="px-4 mt-6">
          <Text className="text-lg font-bold text-secondary-900 mb-4">
            Layanan
          </Text>
          <View className="flex-row flex-wrap -mx-2">
            {menuItems.map((item) => (
              <View key={item.id} className="w-1/2 px-2 mb-4">
                <MenuCard
                  title={item.title}
                  description={item.description}
                  icon={item.icon}
                  color={item.color}
                  onPress={() => navigation.navigate(item.route)}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Validasi Section - Hanya untuk Admin/Validator */}
        {(getHighestRole(user) === 'Admin' || getHighestRole(user) === 'Validator') && (
          <View className="px-4 mt-6">
            <Text className="text-lg font-bold text-secondary-900 mb-4">
              Validasi
            </Text>
            <View className="bg-white rounded-2xl p-4 shadow-sm border border-secondary-100">
              <TouchableOpacity
                onPress={() => navigation.navigate('ValidationList')}
                className="flex-row items-center"
              >
                <View className="w-12 h-12 bg-amber-100 rounded-xl items-center justify-center">
                  <Ionicons name="shield-checkmark" size={24} color="#d97706" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-secondary-900 font-bold">Validasi Permintaan</Text>
                  <Text className="text-secondary-500 text-sm">
                    Kelola dan proses permintaan yang masuk
                  </Text>
                </View>
                <View className="bg-amber-500 px-3 py-1 rounded-full">
                  <Text className="text-white text-xs font-bold">Baru</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94a3b8" className="ml-2" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Quick Info */}
        <View className="px-4 mt-4 mb-6">
          <Text className="text-lg font-bold text-secondary-900 mb-4">
            Informasi
          </Text>
          <View className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
            <View className="flex-row items-start">
              <Ionicons name="information-circle" size={24} color="#2563eb" />
              <View className="flex-1 ml-3">
                <Text className="text-blue-900 font-semibold mb-1">
                  Tips Penggunaan
                </Text>
                <Text className="text-blue-700 text-sm">
                  {getHighestRole(user) === 'Admin' 
                    ? 'Dashboard ini menampilkan rekapan seluruh pengajuan masuk dari semua user aplikasi SIPTU Ultra.' 
                    : getHighestRole(user) === 'Validator'
                    ? 'Pantau antrean validasi Anda di atas. Klik layanan di bawah untuk memproses detail pengajuan.'
                    : 'Gunakan aplikasi ini untuk mengajukan berbagai layanan administrasi secara digital.'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};
