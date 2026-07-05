import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components';

export const AboutScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Informasi Aplikasi</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.brandingContainer}>
          <View style={styles.logoAndShadow}>
             <View style={styles.logoCircle}>
                <Ionicons name="shield-checkmark" size={60} color="#2563eb" />
             </View>
          </View>
          <Text style={styles.appName}>SIPTU ULTRA</Text>
          <Text style={styles.appVersion}>Versi 1.0.0.0</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Stable Release</Text>
          </View>
        </View>

        <Card padding="lg" style={styles.infoCard}>
          <Text style={styles.description}>
            Sistem Informasi Pelayanan Tata Usaha (SIPTU) ULTRA adalah platform terpadu untuk efisiensi administrasi di lingkungan BPOM. Dirancang untuk memberikan kemudahan akses layanan mandiri bagi seluruh pegawai.
          </Text>
          
          <View style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={20} color="#64748b" />
            <Text style={styles.infoValue}>Balai Besar POM di Palopo</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="globe-outline" size={20} color="#64748b" />
            <Text style={styles.infoValue}>https://siptu.bpompalopo.com</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={20} color="#64748b" />
            <Text style={styles.infoValue}>it.bpompalopo@gmail.com</Text>
          </View>
        </Card>

        <View style={styles.footer}>
          <Text style={styles.copyright}>© 2026 BPOM Palopo</Text>
          <Text style={styles.copyrightSub}>Dibuat dengan dedikasi untuk pelayanan prima</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
  },
  brandingContainer: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  logoAndShadow: {
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 20,
    marginBottom: 24,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  appName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -1,
  },
  appVersion: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 4,
  },
  badge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 12,
  },
  badgeText: {
    fontSize: 11,
    color: '#15803d',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  infoCard: {
    width: '100%',
    borderRadius: 32,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: '#334155',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    width: '100%',
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eff6ff',
  },
  infoValue: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
    paddingBottom: 40,
  },
  copyright: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '700',
  },
  copyrightSub: {
    fontSize: 11,
    color: '#cbd5e1',
    marginTop: 4,
    fontWeight: '600',
  },
});
