import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { getHighestRole } from '../../utils/auth';

interface MenuItem {
  icon: any;
  title: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
  iconBg?: string;
  iconColor?: string;
}

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuthStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Konfirmasi',
      'Apakah Anda yakin ingin keluar?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            await logout();
            setIsLoggingOut(false);
          },
        },
      ]
    );
  };

  const menuItems: MenuItem[] = [
    {
      icon: 'lock-closed',
      title: 'Ganti Password',
      subtitle: 'Perbarui kata sandi Anda',
      onPress: () => navigation.navigate('ChangePassword'),
      iconBg: '#eff6ff',
      iconColor: '#2563eb',
    },
    {
      icon: 'notifications',
      title: 'Notifikasi',
      subtitle: 'Atur preferensi notifikasi',
      onPress: () => navigation.navigate('Notifications'),
      iconBg: '#fef3c7',
      iconColor: '#d97706',
    },
    {
      icon: 'information-circle',
      title: 'Informasi Aplikasi',
      subtitle: 'Versi 1.1.0.0',
      onPress: () => navigation.navigate('AboutApp'),
      iconBg: '#f3f4f6',
      iconColor: '#4b5563',
    },
  ];

  return (
    <View style={styles.container}>
      {/* Absolute Curved Header Background */}
      <View style={styles.headerBackground} />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        {/* Header Title */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Profil Saya</Text>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Main Card */}
          <View style={styles.mainCard}>
            {/* Avatar Section */}
            <View style={styles.avatarWrapper}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={54} color="#2563eb" />
                </View>
              )}
              {/* Badge Overlay */}
              <View style={styles.roleBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#ffffff" style={{ marginRight: 4 }} />
                <Text style={styles.roleBadgeText}>
                  {getHighestRole(user)?.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* User Info Section */}
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name || 'Pengguna'}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>

            {/* Department & Position */}
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <View style={[styles.statIconBox, { backgroundColor: '#f0fdf4' }]}>
                  <Ionicons name="business" size={20} color="#16a34a" />
                </View>
                <Text style={styles.statLabel}>Unit / Area</Text>
                <Text style={styles.statValue} numberOfLines={1}>
                  {user?.employee?.department || user?.employee?.function_area || user?.unit || user?.function_area || '-'}
                </Text>
              </View>
              
              <View style={styles.statDivider} />
              
              <View style={styles.statBox}>
                <View style={[styles.statIconBox, { backgroundColor: '#eff6ff' }]}>
                  <Ionicons name="briefcase" size={20} color="#2563eb" />
                </View>
                <Text style={styles.statLabel}>Jabatan</Text>
                <Text style={styles.statValue} numberOfLines={1}>
                  {user?.employee?.position || user?.jabatan || '-'}
                </Text>
              </View>
            </View>
          </View>

          {/* Settings Section */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Pengaturan Akun</Text>
            
            <View style={styles.menuCard}>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={item.title}
                  activeOpacity={0.7}
                  onPress={item.onPress}
                >
                  <View style={[styles.menuItem, index !== menuItems.length - 1 && styles.menuItemBorder]}>
                    <View style={[styles.menuIconBox, { backgroundColor: item.danger ? '#fef2f2' : item.iconBg }]}>
                      <Ionicons
                        name={item.icon}
                        size={22}
                        color={item.danger ? '#ef4444' : item.iconColor}
                      />
                    </View>
                    <View style={styles.menuTextContainer}>
                      <Text style={[styles.menuTitle, item.danger && { color: '#ef4444' }]}>
                        {item.title}
                      </Text>
                      {item.subtitle && (
                        <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Logout Button */}
          <View style={styles.logoutContainer}>
            <TouchableOpacity
              style={styles.logoutButton}
              activeOpacity={0.8}
              onPress={handleLogout}
              disabled={isLoggingOut}
            >
              <Ionicons name="log-out-outline" size={22} color="#ef4444" style={{ marginRight: 8 }} />
              <Text style={styles.logoutText}>Keluar dari Aplikasi</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 220 : 200,
    backgroundColor: '#2563eb', // primary-600
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerContainer: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  mainCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    marginHorizontal: 20,
    marginTop: 40,
    paddingTop: 56, // give space for avatar overlap
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
    alignItems: 'center',
    position: 'relative',
  },
  avatarWrapper: {
    position: 'absolute',
    top: -50,
    alignItems: 'center',
    zIndex: 10,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#ffffff',
    backgroundColor: '#ffffff',
  },
  avatarPlaceholder: {
    backgroundColor: '#eff6ff', // primary-50
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleBadge: {
    position: 'absolute',
    bottom: -6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981', // emerald-500
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  roleBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    marginHorizontal: 20,
    paddingVertical: 16,
    width: '90%',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 4,
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '400',
  },
  logoutContainer: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2', // red-50
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fee2e2', // red-100
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ef4444',
  },
});
