import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Animated, { 
  FadeIn, 
  FadeInUp, 
  Layout, 
  ZoomIn,
} from 'react-native-reanimated';
import { 
  Button, 
  Input, 
  Card, 
  ConfirmModal, 
  SuccessModal, 
  SignatureModal 
} from '../../components';
import { cn } from '../../utils/cn';
import { helpdeskService } from '../../services/helpdeskService';

const { width } = Dimensions.get('window');

// Styled Animated Card
const AnimatedCard = Animated.createAnimatedComponent(Card);

interface IssueType {
  id: string;
  name: string;
  value: string;
  icon: any;
  color: string;
}

const issueTypes: IssueType[] = [
  { id: '1', name: 'Printer', value: 'Pengecekan dan Perbaikan Printer', icon: 'print-outline', color: '#ec4899' },
  { id: '2', name: 'Komputer', value: 'Pengecekan dan Perbaikan Komputer', icon: 'desktop-outline', color: '#3b82f6' },
  { id: '3', name: 'Laptop', value: 'Pengecekan dan perbaikan Laptop', icon: 'laptop-outline', color: '#8b5cf6' },
  { id: '4', name: 'Jaringan', value: 'Kendala Jaringan', icon: 'wifi-outline', color: '#10b981' },
  { id: '5', name: 'Aplikasi', value: 'Instalasi Aplikasi', icon: 'apps-outline', color: '#f59e0b' },
  { id: '6', name: 'Bantuan IT', value: 'Permohonan Bantuan IT', icon: 'construct-outline', color: '#ef4444' },
  { id: '7', name: 'Lainnya', value: 'other', icon: 'help-circle-outline', color: '#64748b' },
];

export const ItHelpdeskScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
  });

  // Modal & Loading States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [signatureVisible, setSignatureVisible] = useState(false);
  const [reporterSignature, setReporterSignature] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSignatureOK = (signature: string) => {
    setReporterSignature(signature);
    setSignatureVisible(false);
  };

  const handleSubmit = () => {
    if (!selectedIssue) {
      alert('Pilih kategori masalah terlebih dahulu');
      return;
    }
    if (!formData.title || !formData.description || !formData.location) {
      alert('Lengkapi semua data yang bertanda bintang (*)');
      return;
    }
    if (!reporterSignature) {
      alert('Tanda tangan digital wajib diisi');
      return;
    }
    
    setConfirmModalVisible(true);
  };

  const processSubmit = async () => {
    setConfirmModalVisible(false);
    setIsSubmitting(true);
    try {
      const issue = issueTypes.find(i => i.id === selectedIssue);
      const payload = {
        report_type: issue?.value || 'other',
        problem_details: `[${formData.title}] - ${formData.description} (Lokasi: ${formData.location})`,
        reporter_signature: reporterSignature,
      };

      const response = await helpdeskService.createTicket(payload);
      setTicketNumber(response.data.ticket_number);
      setSuccessModalVisible(true);
    } catch (error: any) {
      console.error('Helpdesk submit error:', error);
      alert(error.response?.data?.message || 'Gagal mengirim laporan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedIssue(null);
    setFormData({ title: '', description: '', location: '' });
    setReporterSignature('');
    setSuccessModalVisible(false);
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
          IT Helpdesk
        </Text>
      </Animated.View>

      <ScrollView 
        className="flex-1 px-4 pt-4" 
        showsVerticalScrollIndicator={false}
      >
        {/* Issue Type Selection */}
        <AnimatedCard 
          entering={FadeInUp.delay(100).springify()}
          className="mb-4"
          variant="outlined"
        >
          <Text className="text-lg font-bold text-secondary-900 mb-4">
            Kategori Masalah *
          </Text>
          <View className="flex-row flex-wrap -mx-2">
            {issueTypes.map((issue, index) => (
              <Animated.View 
                key={issue.id}
                entering={ZoomIn.delay(200 + index * 50).springify()}
                className="w-1/3 px-2 mb-4"
              >
                <TouchableOpacity
                  onPress={() => setSelectedIssue(issue.id)}
                  className={cn(
                    "items-center p-3 rounded-2xl border-2 transition-all",
                    selectedIssue === issue.id
                      ? "border-primary-500 bg-primary-50"
                      : "border-secondary-100 bg-white"
                  )}
                  style={selectedIssue === issue.id ? {
                    shadowColor: issue.color,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 4
                  } : {}}
                >
                  <View className={cn(
                    "w-12 h-12 rounded-full items-center justify-center mb-2",
                    selectedIssue === issue.id ? "bg-white" : "bg-secondary-50"
                  )}>
                    <Ionicons
                      name={issue.icon}
                      size={24}
                      color={selectedIssue === issue.id ? issue.color : '#64748b'}
                    />
                  </View>
                  <Text
                    className={cn(
                      "text-[10px] text-center font-bold px-1",
                      selectedIssue === issue.id
                        ? "text-primary-700"
                        : "text-secondary-600"
                    )}
                    numberOfLines={1}
                  >
                    {issue.name.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </AnimatedCard>

        {/* Form Details */}
        <AnimatedCard 
          entering={FadeInUp.delay(300).springify()}
          className="mb-4"
          variant="outlined"
        >
          <Text className="text-lg font-bold text-secondary-900 mb-4">
            Detail Kendala
          </Text>
          
          <Input
            label="Subjek / Judul *"
            placeholder="Contoh: Printer tidak merespon"
            value={formData.title}
            onChangeText={(text) => updateField('title', text)}
            icon={<Ionicons name="chatbox-ellipses-outline" size={20} color="#64748b" />}
            containerClassName="mb-4"
          />

          <Input
            label="Lokasi Masalah *"
            placeholder="Contoh: Ruang Rapat Lt. 2"
            value={formData.location}
            onChangeText={(text) => updateField('location', text)}
            icon={<Ionicons name="location-outline" size={20} color="#64748b" />}
            containerClassName="mb-4"
          />

          <Input
            label="Deskripsi Lengkap *"
            placeholder="Jelaskan detail kendala Anda..."
            value={formData.description}
            onChangeText={(text) => updateField('description', text)}
            icon={<Ionicons name="document-text-outline" size={20} color="#64748b" />}
            multiline
            numberOfLines={4}
            className="h-24"
            containerClassName="mb-4"
          />

          <View className="mt-2">
            <Text className="text-sm font-semibold text-secondary-700 mb-2">
              Tanda Tangan Digital *
            </Text>
            <TouchableOpacity
              onPress={() => setSignatureVisible(true)}
              className={cn(
                "h-40 rounded-2xl border-2 border-dashed items-center justify-center overflow-hidden bg-secondary-50",
                reporterSignature ? "border-primary-300" : "border-secondary-300"
              )}
            >
              {reporterSignature ? (
                <View className="items-center">
                  <Ionicons name="checkmark-circle" size={48} color="#10b981" />
                  <Text className="text-green-600 font-bold mt-2">Tanda Tangan Tersimpan</Text>
                  <Text className="text-secondary-400 text-xs mt-1">Klik untuk ubah</Text>
                </View>
              ) : (
                <View className="items-center">
                  <Ionicons name="pencil" size={32} color="#94a3b8" />
                  <Text className="text-secondary-400 mt-2">Ketuk untuk tanda tangan</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </AnimatedCard>

        <Animated.View entering={FadeInUp.delay(400).springify()}>
          <Button
            title={isSubmitting ? "Mengirim..." : "Kirim Laporan"}
            onPress={handleSubmit}
            disabled={isSubmitting}
            className="mb-8 h-14"
            variant="primary"
            icon={isSubmitting ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Ionicons name="send" size={20} color="white" />
            )}
          />
        </Animated.View>
      </ScrollView>

      {/* Modals */}
      <ConfirmModal
        visible={confirmModalVisible}
        title="Kirim Laporan?"
        message="Pastikan data yang Anda isi sudah benar. Laporan akan segera diproses oleh tim IT."
        onConfirm={processSubmit}
        onCancel={() => setConfirmModalVisible(false)}
        confirmText="Ya, Kirim"
        cancelText="Batal"
      />

      <SuccessModal
        visible={successModalVisible}
        title="Laporan Terkirim!"
        message={`Laporan Anda telah berhasil kami terima.\nNo Tiket: ${ticketNumber}`}
        onClose={() => navigation.goBack()}
        buttonText="Ke Dashboard"
        secondaryButtonText="Buat Lagi"
        onSecondaryAction={resetForm}
      />

      <SignatureModal
        visible={signatureVisible}
        onClose={() => setSignatureVisible(false)}
        onOK={handleSignatureOK}
        title="Tanda Tangan Pelapor"
      />
    </SafeAreaView>
  );
};

