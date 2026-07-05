import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
// import { SafeAreaView } from 'react-native-safe-area-context';
import { View as RNView } from 'react-native';
import Animated, { 
  FadeIn, 
  FadeInUp, 
  FadeOut, 
  Layout, 
  ZoomIn,
} from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ConfirmModal } from '../../components/ConfirmModal';
import { SuccessModal } from '../../components/SuccessModal';
import { EmployeeMultiSelect } from '../../components/EmployeeMultiSelect';
import { SaranaSelect } from '../../components/SaranaSelect';
import { 
  suratTugasService, 
  Employee, 
  Sarana, 
  SuratTugasPayload 
} from '../../services/suratTugasService';
import { cn } from '../../utils/cn';

const formatDate = (date: Date) => {
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

const formatDateISO = (date: Date) => {
  return date.toISOString().split('T')[0];
};

const formatMonthDay = (date: Date) => {
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short'
  });
};

const STEPS = [
  { title: 'Pegawai', icon: 'people' },
  { title: 'Jadwal', icon: 'calendar' },
  { title: 'Sarana', icon: 'business' },
  { title: 'Review', icon: 'checkmark-circle' },
];

const LOKASI_OPTIONS = [
  "Kota Palopo",
  "Kabupaten Luwu",
  "Kabupaten Luwu Utara",
  "Kabupaten Luwu Timur",
  "Kabupaten Tana Toraja",
  "Kabupaten Toraja Utara",
  "Kabupaten Enrekang",
  "Lainnya"
];

export const SuratTugasScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resultData, setResultData] = useState<any>(null);

  // Form State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [ketuaId, setKetuaId] = useState<number | null>(null);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showKetuaModal, setShowKetuaModal] = useState(false);
  const [showSaranaModal, setShowSaranaModal] = useState(false);

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [lokasi, setLokasi] = useState("");
  const [lokasiLainnya, setLokasiLainnya] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [mak, setMak] = useState("");

  const [selectedSarana, setSelectedSarana] = useState<Sarana[]>([]);
  const [loadingSarana, setLoadingSarana] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const data = await suratTugasService.listEmployees();
      setEmployees(data);
    } catch (error) {
      Alert.alert('Error', 'Gagal memuat data pegawai');
    } finally {
      setLoadingEmployees(false);
    }
  };



  const toggleEmployee = (emp: Employee) => {
    setSelectedEmployees(prev => {
      const exists = prev.find(e => e.id === emp.id);
      if (exists) return prev.filter(e => e.id !== emp.id);
      return [...prev, emp];
    });
  };

  const handleSetKetua = (emp: Employee) => {
    setKetuaId(emp.id);
    setShowKetuaModal(false);
  };

  const toggleSarana = (sar: Sarana) => {
    setSelectedSarana(prev => {
      const exists = prev.find(s => s.id === sar.id);
      if (exists) return prev.filter(s => s.id !== sar.id);
      return [...prev, sar];
    });
  };

  const nextStep = () => {
    if (currentStep === 0) {
      if (selectedEmployees.length === 0) return Alert.alert('Peringatan', 'Pilih minimal 1 pegawai');
      if (!ketuaId) return Alert.alert('Peringatan', 'Pilih ketua tim');
    }
    if (currentStep === 1) {
      if (!lokasi) return Alert.alert('Peringatan', 'Pilih lokasi tugas');
      if (lokasi === 'Lainnya' && !lokasiLainnya) return Alert.alert('Peringatan', 'Isi detail lokasi');
      if (!deskripsi) return Alert.alert('Peringatan', 'Isi agenda tugas');
    }
    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => setCurrentStep(prev => prev - 1);

  const handleSubmit = async () => {
    setLoading(true);
    const payload: SuratTugasPayload = {
      employee_ids: selectedEmployees.map(e => e.id),
      ketua_tim_id: ketuaId!,
      tanggal_mulai: formatDateISO(startDate),
      tanggal_selesai: formatDateISO(endDate),
      mak: mak || undefined,
      lokasi_tugas: lokasi === 'Lainnya' ? lokasiLainnya : lokasi,
      deskripsi_tugas: deskripsi,
      sarana: selectedSarana.map(s => ({ id: s.id, nama: s.nama, lokasi: s.lokasi })),
    };

    try {
      const res = await suratTugasService.create(payload);
      if (res.data) {
        setResultData(res.data);
        setSubmitted(true);
      } else {
        Alert.alert('Error', res.message || 'Gagal mengirim data');
      }
    } catch (error) {
      Alert.alert('Error', 'Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  const handleDownloadProtokol = () => {
    if (resultData?.id) {
      const url = suratTugasService.getProtokolKerjaUrl(resultData.id);
      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'Gagal membuka tautan pemindaian');
      });
    }
  };

  const renderStepIndicator = () => (
    <View className="flex-row justify-between px-6 mb-6">
      {STEPS.map((step, idx) => {
        const isActive = currentStep === idx;
        const isDone = currentStep > idx;
        return (
          <View key={idx} className="items-center flex-1">
            <View 
              className="w-10 h-10 rounded-full items-center justify-center mb-1"
              style={{
                backgroundColor: isActive ? "#2563eb" : isDone ? "#22c55e" : "#e2e8f0",
                ...(isActive ? Platform.select({
                  ios: { shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 },
                  android: { elevation: 6 }
                }) : {})
              }}
            >
              <Ionicons 
                name={isDone ? "checkmark" : (step.icon as any)} 
                size={20} 
                color="white" 
              />
            </View>
            <Text 
              className="text-[10px] font-bold"
              style={{
                color: isActive ? "#2563eb" : isDone ? "#16a34a" : "#94a3b8"
              }}
            >
              {step.title.toUpperCase()}
            </Text>
            {idx < STEPS.length - 1 && (
              <View className={cn(
                "absolute top-5 -right-1/2 w-full h-[2px]",
                isDone ? "bg-green-500" : "bg-secondary-200"
              )} />
            )}
          </View>
        );
      })}
    </View>
  );

  return (
    <View className="flex-1 bg-secondary-50" style={{ paddingTop: Platform.OS === 'ios' ? 50 : 0 }}>
      <View className="px-6 py-4 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-secondary-900">Surat Tugas</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {renderStepIndicator()}

        <View className="px-6 pb-20">
          <Animated.View>
            {/* STEP 0: Pegawai */}
            {currentStep === 0 && (
              <Animated.View entering={FadeInUp}>
                <Card className="mb-4">
                  <View className="flex-row items-center mb-4">
                    <View className="w-10 h-10 rounded-xl bg-indigo-50 items-center justify-center mr-3">
                      <Ionicons name="people" size={20} color="#4f46e5" />
                    </View>
                    <View>
                      <Text className="text-secondary-900 font-bold text-lg">Personel Tugas</Text>
                      <Text className="text-secondary-500 text-xs">Pilih anggota petugas yang berangkat</Text>
                    </View>
                  </View>

                  <TouchableOpacity 
                    onPress={() => setShowEmployeeModal(true)}
                    className="bg-secondary-50 border border-secondary-200 border-dashed p-4 rounded-xl items-center"
                  >
                    <Ionicons name="add-circle-outline" size={24} color="#6366f1" />
                    <Text className="text-indigo-600 font-bold mt-1">Tambah Petugas</Text>
                  </TouchableOpacity>

                  {selectedEmployees.length > 0 && (
                    <View className="mt-4">
                      {selectedEmployees.map((emp) => (
                        <View key={emp.id} className="flex-row items-center bg-white border border-secondary-100 p-3 rounded-xl mb-2">
                          <View className="w-8 h-8 rounded-full bg-secondary-100 items-center justify-center mr-3">
                            <Ionicons name="person" size={16} color="#64748b" />
                          </View>
                          <View className="flex-1">
                            <Text className="text-secondary-900 font-bold text-sm">{emp.name}</Text>
                            <Text className="text-secondary-500 text-[10px]">{emp.nip}</Text>
                          </View>
                          <TouchableOpacity onPress={() => toggleEmployee(emp)}>
                            <Ionicons name="close-circle" size={20} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </Card>

                <Card className="mb-4" style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
                  <View className="flex-row items-center mb-4">
                    <View className="w-10 h-10 rounded-xl bg-amber-50 items-center justify-center mr-3">
                      <Ionicons name="medal" size={20} color="#d97706" />
                    </View>
                    <View>
                      <Text className="text-amber-900 font-bold text-lg">Penandatangan / Ketua</Text>
                      <Text className="text-amber-700 text-xs">Pejabat penandatangan protokol kerja</Text>
                    </View>
                  </View>

                  <TouchableOpacity 
                    onPress={() => setShowKetuaModal(true)}
                    className="bg-white border border-amber-200 border-dashed p-4 rounded-xl items-center"
                  >
                    <Ionicons name="star-outline" size={24} color="#d97706" />
                    <Text className="text-amber-600 font-bold mt-1">
                      {ketuaId ? "Ganti Penandatangan" : "Pilih Penandatangan"}
                    </Text>
                  </TouchableOpacity>

                  {ketuaId && (
                    <View className="mt-4 bg-white border border-amber-100 p-3 rounded-xl flex-row items-center">
                      <View className="w-8 h-8 rounded-full bg-amber-100 items-center justify-center mr-3">
                        <Ionicons name="star" size={16} color="#d97706" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-amber-900 font-bold text-sm">
                          {employees.find(e => e.id === ketuaId)?.name}
                        </Text>
                        <Text className="text-amber-700 text-[10px]">
                          {employees.find(e => e.id === ketuaId)?.nip}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => setKetuaId(null)}>
                        <Ionicons name="close-circle" size={20} color="#f59e0b" />
                      </TouchableOpacity>
                    </View>
                  )}
                </Card>
              </Animated.View>
            )}

            {/* STEP 1: Jadwal & Lokasi */}
            {currentStep === 1 && (
              <Animated.View entering={FadeInUp}>
                <Card className="mb-4">
                  <Text className="text-secondary-900 font-bold text-lg mb-4">Jadwal Penugasan</Text>
                  
                  <View className="flex-row gap-4 mb-4">
                    <TouchableOpacity 
                      onPress={() => setShowStartPicker(true)}
                      className="flex-1 bg-secondary-50 p-4 rounded-xl border border-secondary-200"
                    >
                      <Text className="text-secondary-500 text-xs mb-1">Mulai</Text>
                      <Text className="text-secondary-900 font-bold">{formatDate(startDate)}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => setShowEndPicker(true)}
                      className="flex-1 bg-secondary-50 p-4 rounded-xl border border-secondary-200"
                    >
                      <Text className="text-secondary-500 text-xs mb-1">Selesai</Text>
                      <Text className="text-secondary-900 font-bold">{formatDate(endDate)}</Text>
                    </TouchableOpacity>
                  </View>

                  {showStartPicker && (
                    <DateTimePicker
                      value={startDate}
                      mode="date"
                      onChange={(e, d) => {
                        setShowStartPicker(false);
                        if (d) {
                          setStartDate(d);
                          if (d > endDate) setEndDate(d);
                        }
                      }}
                    />
                  )}
                  {showEndPicker && (
                    <DateTimePicker
                      value={endDate}
                      mode="date"
                      minimumDate={startDate}
                      onChange={(e, d) => {
                        setShowEndPicker(false);
                        if (d) setEndDate(d);
                      }}
                    />
                  )}

                  <Text className="text-secondary-900 font-bold text-lg mb-4 mt-2">Lokasi Tujuan</Text>
                  <View className="flex-row flex-wrap gap-2 mb-4">
                    {LOKASI_OPTIONS.map(opt => (
                      <TouchableOpacity 
                        key={opt}
                        onPress={() => setLokasi(opt)}
                        className="px-4 py-2 rounded-full border"
                        style={{
                          backgroundColor: lokasi === opt ? "#2563eb" : "white",
                          borderColor: lokasi === opt ? "#2563eb" : "#e2e8f0"
                        }}
                      >
                        <Text 
                          className="text-xs font-bold"
                          style={{
                            color: lokasi === opt ? "white" : "#475569"
                          }}
                        >{opt}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {lokasi === 'Lainnya' && (
                    <View className="mb-4">
                      <TextInput 
                        placeholder="Masukkan detail lokasi..."
                        className="bg-secondary-50 p-4 rounded-xl border border-secondary-200 text-secondary-900"
                        value={lokasiLainnya}
                        onChangeText={setLokasiLainnya}
                      />
                    </View>
                  )}

                  <Text className="text-secondary-900 font-bold text-lg mb-4 mt-2">Agenda Tugas</Text>
                  <TextInput 
                    multiline
                    numberOfLines={4}
                    placeholder="Deskripsikan instruksi atau agenda kegiatan..."
                    className="bg-secondary-50 p-4 rounded-xl border border-secondary-200 text-secondary-900 h-32"
                    textAlignVertical="top"
                    value={deskripsi}
                    onChangeText={setDeskripsi}
                  />
                </Card>
              </Animated.View>
            )}

            {/* STEP 2: Sarana */}
            {currentStep === 2 && (
              <Animated.View entering={FadeInUp}>
                <Card className="mb-4">
                  <Text className="text-secondary-900 font-bold text-lg mb-2">MAK & Sarana</Text>
                  <Text className="text-secondary-500 text-xs mb-4">Mata anggaran dan objek sarana yang diperiksa (Opsional)</Text>
                  
                  <View className="mb-6">
                    <Text className="text-secondary-700 font-bold mb-2">MAK</Text>
                    <TextInput 
                      placeholder="Contoh: 524111"
                      className="bg-secondary-50 p-4 rounded-xl border border-secondary-200 text-secondary-900"
                      value={mak}
                      onChangeText={setMak}
                    />
                  </View>

                  <Text className="text-secondary-700 font-bold mb-2">Data Sarana (SIAMPARAN)</Text>
                  <TouchableOpacity 
                    onPress={() => setShowSaranaModal(true)}
                    className="flex-row items-center bg-secondary-50 border border-secondary-200 border-dashed p-4 rounded-xl mb-6"
                  >
                    <Ionicons name="search" size={24} color="#2563eb" />
                    <Text className="text-primary-600 font-bold ml-2">Cari & Tambah Sarana</Text>
                  </TouchableOpacity>

                  {selectedSarana.length > 0 && (
                    <View>
                      <Text className="text-secondary-500 text-[10px] font-bold mb-2 uppercase">Sarana terpilih ({selectedSarana.length})</Text>
                      {selectedSarana.map(s => (
                        <View key={s.id} className="bg-white p-3 rounded-xl mb-2 border border-secondary-100">
                          <View className="flex-row items-center">
                            <View className="w-8 h-8 rounded-lg bg-green-50 items-center justify-center mr-3">
                              <Ionicons name="business" size={16} color="#10b981" />
                            </View>
                            <View className="flex-1">
                              <Text className="text-secondary-900 font-bold text-sm">{s.nama}</Text>
                              <Text className="text-secondary-400 text-[10px]">{s.lokasi}</Text>
                              {s.jenis && s.jenis.length > 0 && (
                                <View className="flex-row flex-wrap mt-1 gap-1">
                                  {s.jenis.map((j, i) => (
                                    <View key={i} className="bg-green-50 px-1.5 py-0.5 rounded">
                                      <Text className="text-green-700 text-[9px] font-bold uppercase">{j}</Text>
                                    </View>
                                  ))}
                                </View>
                              )}
                            </View>
                            <TouchableOpacity onPress={() => toggleSarana(s)}>
                              <Ionicons name="close-circle" size={20} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </Card>
              </Animated.View>
            )}

            {/* STEP 3: Review */}
            {currentStep === 3 && (
              <Animated.View entering={FadeInUp}>
                <Card className="mb-4">
                  <Text className="text-secondary-900 font-bold text-lg mb-4">Konfirmasi Data</Text>
                  
                  <View className="bg-secondary-50 p-4 rounded-2xl mb-4 border border-secondary-100">
                    <Text className="text-secondary-500 text-[10px] font-bold uppercase mb-2">Tim Petugas</Text>
                    {selectedEmployees.map(e => (
                      <View key={e.id} className="flex-row items-center mb-1">
                        <Ionicons name={ketuaId === e.id ? "star" : "person"} size={12} color={ketuaId === e.id ? "#d97706" : "#64748b"} />
                        <Text className="text-secondary-900 text-sm ml-2 font-medium">{e.name}</Text>
                        {ketuaId === e.id && <Text className="text-amber-700 text-[10px] font-bold ml-1">(Ketua)</Text>}
                      </View>
                    ))}
                  </View>

                  <View className="bg-secondary-50 p-4 rounded-2xl mb-4 border border-secondary-100">
                    <Text className="text-secondary-500 text-[10px] font-bold uppercase mb-2">Waktu & Lokasi</Text>
                    <View className="flex-row items-center mb-1">
                      <Ionicons name="calendar-outline" size={12} color="#64748b" />
                      <Text className="text-secondary-900 text-sm ml-2">{formatMonthDay(startDate)} - {formatDate(endDate)}</Text>
                    </View>
                    <View className="flex-row items-center">
                      <Ionicons name="location-outline" size={12} color="#64748b" />
                      <Text className="text-secondary-900 text-sm ml-2">{lokasi === 'Lainnya' ? lokasiLainnya : lokasi}</Text>
                    </View>
                  </View>

                  <View className="bg-secondary-50 p-4 rounded-2xl mb-4 border border-secondary-100">
                    <Text className="text-secondary-500 text-[10px] font-bold uppercase mb-2">Agenda/Instruksi</Text>
                    <Text className="text-secondary-900 text-sm italic">"{deskripsi}"</Text>
                  </View>

                  {selectedSarana.length > 0 && (
                    <View className="bg-secondary-50 p-4 rounded-2xl mb-4 border border-secondary-100">
                      <Text className="text-secondary-500 text-[10px] font-bold uppercase mb-2">Objek Sarana ({selectedSarana.length})</Text>
                      {selectedSarana.slice(0, 3).map(s => (
                        <Text key={s.id} className="text-secondary-900 text-xs mb-0.5">• {s.nama}</Text>
                      ))}
                      {selectedSarana.length > 3 && <Text className="text-secondary-400 text-[10px] italic">...dan {selectedSarana.length - 3} lainnya</Text>}
                    </View>
                  )}
                </Card>
              </Animated.View>
            )}
          </Animated.View>
        </View>
      </ScrollView>

      {/* FOOTER NAV */}
      <View className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-secondary-100 flex-row gap-4">
        {currentStep > 0 && (
          <TouchableOpacity 
            onPress={prevStep}
            className="flex-1 bg-secondary-100 py-4 rounded-2xl items-center"
          >
            <Text className="text-secondary-600 font-bold">Kembali</Text>
          </TouchableOpacity>
        )}
        
        {currentStep < 3 ? (
          <TouchableOpacity 
            onPress={nextStep}
            className="flex-[2] bg-primary-600 py-4 rounded-2xl items-center shadow-lg shadow-primary-300"
          >
            <Text className="text-white font-bold">Lanjutkan</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            onPress={() => setShowConfirm(true)}
            className="flex-[2] bg-green-600 py-4 rounded-2xl items-center shadow-lg shadow-green-300"
          >
            <Text className="text-white font-bold">Kirim Pengajuan</Text>
          </TouchableOpacity>
        )}
      </View>

      <EmployeeMultiSelect 
        visible={showEmployeeModal}
        onClose={() => setShowEmployeeModal(false)}
        employees={employees}
        loading={loadingEmployees}
        selectedIds={selectedEmployees.map(e => e.id)}
        onSelect={toggleEmployee}
        title="Pilih Petugas"
        subtitle="Pilih personel yang ditugaskan berangkat"
      />

      <EmployeeMultiSelect 
        visible={showKetuaModal}
        onClose={() => setShowKetuaModal(false)}
        employees={employees}
        loading={loadingEmployees}
        selectedIds={ketuaId ? [ketuaId] : []}
        onSelect={handleSetKetua}
        title="Pilih Penandatangan"
        subtitle="Pejabat penandatangan protokol kerja"
        mode="single"
      />

      <SaranaSelect 
        visible={showSaranaModal}
        onClose={() => setShowSaranaModal(false)}
        selectedSarana={selectedSarana}
        onToggleSarana={toggleSarana}
      />

      <ConfirmModal 
        visible={showConfirm}
        onCancel={() => setShowConfirm(false)}
        onConfirm={handleSubmit}
        title="Kirim Surat Tugas?"
        message="Pastikan data personel dan jadwal sudah sesuai."
        loading={loading}
      />

      <SuccessModal 
        visible={submitted}
        onClose={() => {
          setSubmitted(false);
          navigation.navigate('MainTabs');
        }}
        title="Pengajuan Berhasil!"
        message="Surat tugas Anda telah terdaftar dan akan segera diproses."
        secondaryButtonText="Unduh Protokol Kerja (PDF)"
        onSecondaryAction={handleDownloadProtokol}
      />
    </View>
  );
};
