import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Linking,
  AppState,
  Platform,
  ActivityIndicator
} from 'react-native';
import Constants from 'expo-constants';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

const VERSION_CHECK_URL = 'https://siptu.bpompalopo.com/version.json';

interface VersionInfo {
  version: string;
  downloadUrl: string;
  forceUpdate: boolean;
  message?: string;
}

// Fungsi sederhana membandingkan dua versi (contoh: 1.1.0 > 1.0.0)
const isNewerVersion = (oldVer: string, newVer: string): boolean => {
  const oldParts = oldVer.split('.').map(Number);
  const newParts = newVer.split('.').map(Number);
  
  for (let i = 0; i < Math.max(oldParts.length, newParts.length); i++) {
    const oldVal = oldParts[i] || 0;
    const newVal = newParts[i] || 0;
    if (newVal > oldVal) return true;
    if (newVal < oldVal) return false;
  }
  return false;
};

export const UpdateChecker: React.FC = () => {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const appState = useRef(AppState.currentState);

  const checkVersion = async () => {
    try {
      // Tambahkan timestamp untuk mencegah cache
      const uniqueUrl = `${VERSION_CHECK_URL}?t=${new Date().getTime()}`;
      const response = await axios.get<VersionInfo>(uniqueUrl, {
        timeout: 5000 // Timeout 5 detik agar tidak menggantung tanpa koneksi
      });
      
      const serverData = response.data;
      const currentVersion = Constants.expoConfig?.version || '1.0.0';
      
      if (serverData && serverData.version) {
        if (isNewerVersion(currentVersion, serverData.version)) {
          setVersionInfo(serverData);
          setHasUpdate(true);
        }
      }
    } catch (error) {
      console.warn('Gagal mengecek versi aplikasi:', error);
      // Diam saja jika gagal (mungkin masalah koneksi, jangan ganggu user)
    }
  };

  useEffect(() => {
    // Cek versi saat komponen dimount pertama kali
    checkVersion();

    // Cek kembali setiap kali aplikasi dipanggil dari background
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        checkVersion();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleUpdate = async () => {
    if (!versionInfo?.downloadUrl) return;
    
    setIsDownloading(true);
    try {
      const supported = await Linking.canOpenURL(versionInfo.downloadUrl);
      if (supported) {
        await Linking.openURL(versionInfo.downloadUrl);
        // Biarkan loading state tetap true karena layar pindah ke browser
      } else {
        alert("Tidak dapat membuka link download.");
        setIsDownloading(false);
      }
    } catch {
      alert("Terjadi kesalahan saat membuka browser.");
      setIsDownloading(false);
    }
  };

  const handleClose = () => {
    if (versionInfo?.forceUpdate) {
      alert("Anda harus memperbarui aplikasi untuk melanjutkan penggunaan.");
    } else {
      setHasUpdate(false);
    }
  };

  if (!hasUpdate || !versionInfo) return null;

  return (
    <Modal visible={hasUpdate} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="cloud-download-outline" size={48} color="#2563eb" />
          </View>
          
          <Text style={styles.title}>Versi Baru Tersedia!</Text>
          
          <Text style={styles.message}>
            {versionInfo.message || `Silakan perbarui aplikasi Anda ke versi ${versionInfo.version} untuk menikmati fitur terbaru dan peningkatan performa.`}
          </Text>

          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>
              Versi Saat Ini: {Constants.expoConfig?.version || '1.0.0'}
            </Text>
            <Ionicons name="arrow-forward" size={14} color="#64748b" style={{ marginHorizontal: 8 }} />
            <Text style={styles.versionTextNew}>
              Versi Baru: {versionInfo.version}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.8}
            onPress={handleUpdate}
            disabled={isDownloading}
          >
            {isDownloading ? (
               <ActivityIndicator color="#fff" />
            ) : (
               <Text style={styles.buttonText}>Unduh Sekarang</Text>
            )}
          </TouchableOpacity>
          
          {!versionInfo.forceUpdate && !isDownloading && (
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelText}>Nanti Saja</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)', // slate-900 dengan transparansi
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eff6ff', // blue-50
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 4,
    borderColor: '#dbeafe', // blue-100
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a', // slate-900
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#475569', // slate-600
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  versionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc', // slate-50
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0', // slate-200
    marginBottom: 28,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b', // slate-500
  },
  versionTextNew: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669', // emerald-600
  },
  button: {
    width: '100%',
    height: 52,
    backgroundColor: '#2563eb', // blue-600
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 8,
  },
  cancelText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  }
});
