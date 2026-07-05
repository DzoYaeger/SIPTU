import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  Alert,
  TextInput,
  Modal,
  FlatList,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { EmployeeMultiSelect } from '../../components/EmployeeMultiSelect';
import SignatureModal from '../../components/SignatureModal';
import { SuccessModal } from '../../components/SuccessModal';
import { archiveService, ArchiveUnit } from '../../services/archiveService';
import { cn } from '../../utils/cn';
import dayjs from 'dayjs';
import DateTimePicker from '@react-native-community/datetimepicker';

export const ArchiveLoanScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [units, setUnits] = useState<ArchiveUnit[]>([]);
  const [empLoading, setEmpLoading] = useState(false);
  
  // Form Data
  const [borrowDate, setBorrowDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedBorrower, setSelectedBorrower] = useState<any>(null);
  const [selectedUnit, setSelectedUnit] = useState<ArchiveUnit | null>(null);
  const [archiveNumber, setArchiveNumber] = useState('');
  const [signature, setSignature] = useState('');
  
  // Modals
  const [empModalVisible, setEmpModalVisible] = useState(false);
  const [unitModalVisible, setUnitModalVisible] = useState(false);
  const [sigModalVisible, setSigModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setEmpLoading(true);
      try {
        const [empData, unitData] = await Promise.all([
          archiveService.listEmployees(),
          archiveService.listArchiveUnits(),
        ]);
        setEmployees(empData.map((e: any) => ({
          ...e,
          name: e.nama || e.name,
        })));
        setUnits(unitData);
      } catch (error) {
        console.error(error);
        Alert.alert('Error', 'Gagal memuat data pendukung.');
      } finally {
        setEmpLoading(false);
      }
    };
    loadData();
  }, []);

  const handleSubmit = async () => {
    if (!selectedBorrower) return Alert.alert('Peringatan', 'Pilih peminjam terlebih dahulu.');
    if (!selectedUnit) return Alert.alert('Peringatan', 'Pilih unit pengolah arsip.');
    if (!archiveNumber) return Alert.alert('Peringatan', 'Masukkan nomor arsip.');
    if (!signature) return Alert.alert('Peringatan', 'Tanda tangan wajib diisi.');

    setLoading(true);
    try {
      await archiveService.submitLoan({
        borrow_date: dayjs(borrowDate).format('YYYY-MM-DD'),
        borrower_name: selectedBorrower.name,
        borrower_nip: selectedBorrower.nip,
        borrower_work_unit: selectedBorrower.fungsi_bidang || null,
        archive_unit_id: selectedUnit!.id,
        archive_number: archiveNumber,
        borrower_signature: signature,
      });
      setSuccessModalVisible(true);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Gagal mengirim pengajuan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-secondary-50" style={{ paddingTop: Platform.OS === 'ios' ? 50 : 0 }}>
      {/* Header */}
      <View className="bg-primary-600 px-6 pt-4 pb-12 rounded-b-[40px] shadow-lg shadow-primary-300">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2 rounded-full active:bg-primary-700">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold ml-4">
            Peminjaman Arsip
          </Text>
        </View>
        <Text className="text-primary-100 text-sm px-2">Isi formulir di bawah ini untuk mengajukan peminjaman dokumen arsip.</Text>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 -mt-6"
      >
        <ScrollView 
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Section 1: Peminjam */}
          <View className="mt-4 mb-2">
            <Text className="text-secondary-900 font-bold text-lg px-2">Data Peminjam</Text>
          </View>
          <Card className="mb-6">
            <Text className="text-secondary-600 text-sm mb-2 font-medium">Tanggal Peminjaman</Text>
            <TouchableOpacity 
              onPress={() => setShowDatePicker(true)}
              className="flex-row items-center justify-between bg-secondary-50 p-4 rounded-xl border border-secondary-200 mb-6"
            >
              <Text className="text-secondary-900 font-medium">
                {dayjs(borrowDate).format('DD MMMM YYYY')}
              </Text>
              <Ionicons name="calendar" size={20} color="#6366f1" />
            </TouchableOpacity>

            <Text className="text-secondary-600 text-sm mb-2 font-medium">Pegawai Peminjam</Text>
            <TouchableOpacity 
              onPress={() => setEmpModalVisible(true)}
              className="flex-row items-center justify-between bg-white p-4 rounded-xl border border-secondary-200"
            >
              <View className="flex-1">
                {selectedBorrower ? (
                  <View>
                    <Text className="text-secondary-900 font-bold">{selectedBorrower.name}</Text>
                    <Text className="text-secondary-500 text-xs">{selectedBorrower.nip || '-'}</Text>
                  </View>
                ) : (
                  <Text className="text-secondary-400 font-medium">Pilih Pegawai...</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </Card>

          {/* Section 2: Data Arsip */}
          <View className="mb-2">
            <Text className="text-secondary-900 font-bold text-lg px-2">Informasi Arsip</Text>
          </View>
          <Card className="mb-6">
            <Text className="text-secondary-600 text-sm mb-2 font-medium">Unit Pengolah Arsip</Text>
            <TouchableOpacity 
              onPress={() => setUnitModalVisible(true)}
              className="flex-row items-center justify-between bg-white p-4 rounded-xl border border-secondary-200 mb-6"
            >
              <View className="flex-1">
                {selectedUnit ? (
                  <Text className="text-secondary-900 font-medium">{selectedUnit.nama || selectedUnit.fungsi_bidang}</Text>
                ) : (
                  <Text className="text-secondary-400 font-medium">Pilih Unit Pengolah...</Text>
                )}
              </View>
              <Ionicons name="business" size={18} color="#6366f1" />
            </TouchableOpacity>

            <Text className="text-secondary-600 text-sm mb-2 font-medium">Nomor Arsip</Text>
            <View className="bg-white p-4 rounded-xl border border-secondary-200 flex-row items-center">
              <Ionicons name="barcode" size={18} color="#94a3b8" />
              <TextInput
                value={archiveNumber}
                onChangeText={setArchiveNumber}
                placeholder="Masukkan nomor arsip..."
                className="flex-1 ml-3 text-secondary-900"
              />
            </View>
          </Card>

          {/* Section 3: Tanda Tangan */}
          <View className="mb-2">
            <Text className="text-secondary-900 font-bold text-lg px-2">Validasi</Text>
          </View>
          <Card className="mb-6">
            <View className="items-center">
              <Text className="text-secondary-600 text-sm mb-4 font-bold uppercase tracking-wider">Tanda Tangan Peminjam</Text>
              {signature ? (
                <View className="relative">
                  <View className="bg-secondary-50 border border-primary-100 w-64 h-40 rounded-2xl items-center justify-center overflow-hidden">
                    <Ionicons name="document-text" size={32} color="#6366f1" />
                    <Text className="text-[10px] text-secondary-400 mt-2 font-bold">Tanda Tangan Tersimpan</Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => setSignature('')}
                    className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 rounded-full items-center justify-center shadow-lg"
                  >
                    <Ionicons name="close" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  onPress={() => setSigModalVisible(true)}
                  className="w-full h-32 border-2 border-dashed border-secondary-300 rounded-3xl items-center justify-center bg-secondary-50 active:bg-secondary-100"
                >
                  <Ionicons name="pencil" size={32} color="#94a3b8" />
                  <Text className="text-secondary-400 mt-2 font-medium">Ketuk untuk tanda tangan</Text>
                </TouchableOpacity>
              )}
            </View>
          </Card>

          <Button 
            title="Kirim Pengajuan"
            onPress={handleSubmit}
            loading={loading}
            className="shadow-lg shadow-primary-300 mt-4"
            size="lg"
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Helper Modals */}
      {showDatePicker && (
        <DateTimePicker
          value={borrowDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) setBorrowDate(date);
          }}
        />
      )}

      <EmployeeMultiSelect
        visible={empModalVisible}
        onClose={() => setEmpModalVisible(false)}
        selectedIds={selectedBorrower ? [selectedBorrower.id] : []}
        onSelect={(emp) => {
          setSelectedBorrower(emp);
          setEmpModalVisible(false);
        }}
        employees={employees}
        loading={empLoading}
        mode="single"
        title="Pilih Peminjam"
      />

      <Modal visible={unitModalVisible} transparent animationType="slide" onRequestClose={() => setUnitModalVisible(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[40px] p-6 max-h-[80%]">
            <View className="flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-xl font-bold text-secondary-900">Unit Pengolah Arsip</Text>
                <Text className="text-xs text-secondary-500">Pilih unit yang mengelola dokumen ini</Text>
              </View>
              <TouchableOpacity onPress={() => setUnitModalVisible(false)} className="p-2 bg-secondary-100 rounded-full">
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={units}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  onPress={() => {
                    setSelectedUnit(item);
                    setUnitModalVisible(false);
                  }}
                  className={cn(
                    "p-4 rounded-2xl mb-3 border",
                    selectedUnit?.id === item.id ? "bg-primary-50 border-primary-500" : "bg-secondary-50 border-secondary-100"
                  )}
                >
                  <Text className={cn(
                    "font-bold",
                    selectedUnit?.id === item.id ? "text-primary-700" : "text-secondary-700"
                  )}>{item.nama || item.fungsi_bidang}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      <SignatureModal
        visible={sigModalVisible}
        onClose={() => setSigModalVisible(false)}
        onOK={(sig) => {
          setSignature(sig);
          setSigModalVisible(false);
        }}
      />

      <SuccessModal
        visible={successModalVisible}
        title="Berhasil!"
        message="Peminjaman arsip Anda telah berhasil diajukan."
        onClose={() => {
          setSuccessModalVisible(false);
          navigation.goBack();
        }}
      />
    </View>
  );
};
