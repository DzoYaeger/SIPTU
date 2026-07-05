import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Dimensions,
  StyleSheet,
  Modal,
  Linking,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { activityService, ActivityAgenda } from '../../services/activityService';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

dayjs.locale('id');

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 7;

// Color constants
const COLORS = {
  primary50: '#f0f9ff',
  primary100: '#e0f2fe',
  primary400: '#60a5fa',
  primary500: '#3b82f6',
  primary600: '#2563eb',
  secondary50: '#f8fafc',
  secondary100: '#f1f5f9',
  secondary200: '#e2e8f0',
  secondary300: '#cbd5e1',
  secondary400: '#94a3b8',
  secondary500: '#64748b',
  secondary700: '#334155',
  secondary800: '#1e293b',
  secondary900: '#0f172a',
  red400: '#f87171',
  white: '#ffffff',
  orange500: '#f97316',
  purple500: '#8b5cf6',
};

export const ActivityCalendarScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [agendas, setAgendas] = useState<ActivityAgenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<any>(null);
  
  // Detail Modal State
  const [selectedAgenda, setSelectedAgenda] = useState<ActivityAgenda | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleOpenLink = useCallback(async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Tidak dapat membuka tautan ini: ' + url);
      }
    } catch (error) {
      console.error('Error opening link:', error);
      Alert.alert('Error', 'Terjadi kesalahan saat mencoba membuka tautan.');
    }
  }, []);

  const renderTextWithLinks = useCallback((text: string) => {
    if (!text) return null;
    
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <Text 
            key={index} 
            style={{ color: COLORS.primary500, textDecorationLine: 'underline' }}
            onPress={() => handleOpenLink(part)}
          >
            {part}
          </Text>
        );
      }
      return <Text key={index}>{part}</Text>;
    });
  }, [handleOpenLink]);

  const fetchCalendarData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching employee calendar...');
      const response = await activityService.getEmployeeCalendar(
        currentMonth.year(),
        currentMonth.month() + 1 // dayjs month is 0-indexed
      );
      
      const data = response.data;
      console.log('Calendar API Response count:', data?.data?.length || 0);
      
      let finalData: ActivityAgenda[] = [];
      if (Array.isArray(data)) {
        finalData = data;
      } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
        finalData = data.data;
      } else if (data && typeof data === 'object' && data.agendas && Array.isArray(data.agendas)) {
        finalData = data.agendas;
      }
      
      setAgendas(finalData);
      setMeta(data?.meta || null);
    } catch (error) {
      console.error('Error fetching calendar:', error);
      setAgendas([]);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  // Fetch when month changes
  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  // Refresh when screen focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchCalendarData();
    });
    return unsubscribe;
  }, [navigation, fetchCalendarData]);

  const daysInMonth = useMemo(() => {
    const startOfMonth = currentMonth.startOf('month');
    const endOfMonth = currentMonth.endOf('month');
    const startDay = startOfMonth.day(); // 0 is Sunday
    const totalDays = endOfMonth.date();
    
    const days: (dayjs.Dayjs | null)[] = [];
    // Prefix empty slots
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    // Days of the month
    for (let i = 1; i <= totalDays; i++) {
      days.push(startOfMonth.date(i));
    }
    return days;
  }, [currentMonth]);

  const selectedAgendas = useMemo(() => {
    if (!Array.isArray(agendas)) return [];
    return agendas.filter(agenda => {
      if (!agenda.start_time) return false;
      try {
        const start = dayjs(agenda.start_time);
        if (!start.isValid()) return false;
        
        // Check if agenda has end_time
        if (agenda.end_time) {
          const end = dayjs(agenda.end_time);
          if (!end.isValid()) return false;
          return start.isSame(selectedDate, 'day') ||
            end.isSame(selectedDate, 'day') ||
            (start.isBefore(selectedDate, 'day') && end.isAfter(selectedDate, 'day'));
        }
        
        // Single day event
        return start.isSame(selectedDate, 'day');
      } catch (e) {
        return false;
      }
    });
  }, [selectedDate, agendas]);

  const getEventCount = (date: dayjs.Dayjs) => {
    if (!Array.isArray(agendas)) return 0;
    return agendas.filter(a => {
      if (!a.start_time) return false;
      try {
        const start = dayjs(a.start_time);
        if (!start.isValid()) return false;
        
        if (a.end_time) {
          const end = dayjs(a.end_time);
          if (!end.isValid()) return false;
          return start.isSame(date, 'day') ||
            end.isSame(date, 'day') ||
            (start.isBefore(date, 'day') && end.isAfter(date, 'day'));
        }
        
        return start.isSame(date, 'day');
      } catch (e) {
        return false;
      }
    }).length;
  };

  // Get color indicator based on agenda type
  const getAgendaColor = (type?: string) => {
    switch (type) {
      case 'surat_tugas':
        return COLORS.orange500;
      case 'agenda':
      default:
        return COLORS.primary500;
    }
  };

  const nextMonth = () => setCurrentMonth(prev => prev.add(1, 'month'));
  const prevMonth = () => setCurrentMonth(prev => prev.subtract(1, 'month'));
  const goToToday = () => {
    const today = dayjs();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  const today = dayjs();
  const weekdays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 20) }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerLabel}>Jadwal Kantor</Text>
          <Text style={styles.headerTitle}>Kalender Kegiatan</Text>
          {meta && (
            <Text style={styles.headerMeta}>
              {meta.surat_tugas_count > 0 && `${meta.surat_tugas_count} Tugas`}
              {meta.surat_tugas_count > 0 && meta.agenda_count > 0 && ' · '}
              {meta.agenda_count > 0 && `${meta.agenda_count} Agenda`}
            </Text>
          )}
          {/* Debug info - remove in production */}
          {meta?.employee_id === null && (
            <Text style={styles.debugWarning}>
              ⚠️ Data pegawai tidak ditemukan
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={goToToday} style={styles.todayButton}>
          <Text style={styles.todayButtonText}>Hari Ini</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Calendar Card */}
        <View style={styles.calendarCard}>
          {/* Month Selector */}
          <View style={styles.monthSelector}>
            <TouchableOpacity onPress={prevMonth} style={styles.navButton}>
              <Ionicons name="chevron-back" size={20} color={COLORS.secondary700} />
            </TouchableOpacity>
            <Text style={styles.monthText}>{currentMonth.format('MMMM YYYY')}</Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
              <Ionicons name="chevron-forward" size={20} color={COLORS.secondary700} />
            </TouchableOpacity>
          </View>

          {/* Weekday Labels */}
          <View style={styles.weekdayRow}>
            {weekdays.map((day, idx) => (
              <View key={day} style={[styles.weekdayCell, { width: COLUMN_WIDTH }]}>
                <Text style={[
                  styles.weekdayText,
                  (idx === 0 || idx === 6) && styles.weekendText
                ]}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.daysGrid}>
            {daysInMonth.map((date, index) => {
              if (!date) {
                return <View key={`empty-${index}`} style={{ width: COLUMN_WIDTH, height: 48 }} />;
              }
              
              const isSelected = date.isSame(selectedDate, 'day');
              const isToday = date.isSame(today, 'day');
              const eventCount = getEventCount(date);

              return (
                <TouchableOpacity
                  key={`day-${date.format('YYYY-MM-DD')}`}
                  onPress={() => setSelectedDate(date)}
                  style={[styles.dayCell, { width: COLUMN_WIDTH, height: 56 }]}
                >
                  <View style={[
                    styles.dayCircle,
                    isSelected && styles.selectedDayCircle,
                    isToday && !isSelected && styles.todayCircle
                  ]}>
                    <Text style={[
                      styles.dayText,
                      isSelected && styles.selectedDayText,
                      isToday && !isSelected && styles.todayText
                    ]}>
                      {date.date()}
                    </Text>
                    
                    {/* Event Dots */}
                    {eventCount > 0 && (
                      <View style={styles.dotsContainer}>
                        {Array.from({ length: Math.min(eventCount, 3) }).map((_, i) => (
                          <View 
                            key={i} 
                            style={[
                              styles.dot,
                              isSelected && styles.selectedDot
                            ]} 
                          />
                        ))}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selected Date Header */}
        <View style={styles.dateHeader}>
          <View>
            <Text style={styles.dateHeaderTitle}>
              {selectedDate.isSame(today, 'day') ? 'Hari Ini' : selectedDate.format('DD MMMM')}
            </Text>
            <Text style={styles.dateHeaderSubtitle}>{selectedAgendas.length} Kegiatan Terjadwal</Text>
          </View>
          <View style={styles.calendarIcon}>
            <Ionicons name="calendar-outline" size={20} color="#6366f1" />
          </View>
        </View>

        {/* Agenda List */}
        <View style={styles.agendaList}>
          {loading ? (
            <ActivityIndicator color="#6366f1" size="large" style={{ marginTop: 16 }} />
          ) : selectedAgendas.length > 0 ? (
            selectedAgendas.map((agenda, index) => (
              <TouchableOpacity 
                key={`agenda-${agenda.id || index}`}
                style={styles.agendaCard}
                onPress={() => {
                  setSelectedAgenda(agenda);
                  setModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.agendaIndicator,
                  { backgroundColor: getAgendaColor(agenda.type) }
                ]} />
                <View style={styles.agendaContent}>
                  {/* Type Badge */}
                  <View style={styles.typeBadgeContainer}>
                    <View style={[
                      styles.typeBadge,
                      { backgroundColor: agenda.type === 'surat_tugas' ? '#fff7ed' : '#f0f9ff' }
                    ]}>
                      <Ionicons 
                        name={agenda.type === 'surat_tugas' ? 'briefcase-outline' : 'calendar-outline'} 
                        size={12} 
                        color={agenda.type === 'surat_tugas' ? COLORS.orange500 : COLORS.primary500} 
                      />
                      <Text style={[
                        styles.typeBadgeText,
                        { color: agenda.type === 'surat_tugas' ? COLORS.orange500 : COLORS.primary500 }
                      ]}>
                        {agenda.type === 'surat_tugas' ? 'Surat Tugas' : 'Agenda'}
                      </Text>
                    </View>
                    {agenda.nomor_st && (
                      <Text style={styles.nomorStText}>{agenda.nomor_st}</Text>
                    )}
                  </View>
                  
                  <Text style={styles.agendaTitle}>{agenda.title || 'Tanpa Judul'}</Text>
                  
                  {/* Employees list for Surat Tugas */}
                  {agenda.type === 'surat_tugas' && agenda.employees && agenda.employees.length > 0 && (
                    <View style={styles.employeesContainer}>
                      <Ionicons name="people-outline" size={14} color={COLORS.secondary400} />
                      <Text style={styles.employeesText} numberOfLines={1}>
                        {agenda.employees.map(e => e.name).join(', ')}
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.agendaMeta}>
                    <Ionicons name="time-outline" size={14} color={COLORS.secondary400} />
                    <Text style={styles.agendaMetaText}>
                      {agenda.start_time && dayjs(agenda.start_time).isValid() 
                        ? dayjs(agenda.start_time).format('HH:mm') 
                        : '--:--'} - {agenda.end_time && dayjs(agenda.end_time).isValid() 
                          ? dayjs(agenda.end_time).format('HH:mm') 
                          : '--:--'}
                    </Text>
                    {(agenda.location_url || agenda.penyelenggara) && (
                      <>
                        <Ionicons name="location-outline" size={14} color={COLORS.secondary400} style={{ marginLeft: 12 }} />
                        <Text style={styles.agendaMetaText} numberOfLines={1}>
                          {agenda.location_url || agenda.penyelenggara || 'Lokasi tidak diset'}
                        </Text>
                      </>
                    )}
                  </View>
                  
                  {agenda.description && (
                    <Text style={styles.agendaDescription} numberOfLines={2}>
                      {agenda.description}
                    </Text>
                  )}
                </View>
                <View style={styles.agendaChevron}>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.secondary300} />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="cafe-outline" size={32} color={COLORS.secondary300} />
              </View>
              <Text style={styles.emptyText}>Tidak ada kegiatan di tanggal ini</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(200)}
            style={styles.modalContainer}
          >
            {selectedAgenda && (
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderTitleContainer}>
                  <View style={[
                    styles.modalIconContainer,
                    { backgroundColor: selectedAgenda?.type === 'surat_tugas' ? '#fff7ed' : '#f0f9ff' }
                  ]}>
                    <Ionicons 
                      name={selectedAgenda?.type === 'surat_tugas' ? 'briefcase' : 'calendar'} 
                      size={22} 
                      color={selectedAgenda?.type === 'surat_tugas' ? COLORS.orange500 : COLORS.primary500} 
                    />
                  </View>
                  <View>
                    <Text style={styles.modalTitle}>Detail {selectedAgenda?.type === 'surat_tugas' ? 'Tugas' : 'Kegiatan'}</Text>
                    <Text style={styles.modalSubtitle}>{selectedAgenda?.type === 'surat_tugas' ? 'Surat Tugas Transaksi' : 'Internal Agenda'}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={24} color={COLORS.secondary500} />
                </TouchableOpacity>
              </View>
            )}

            {selectedAgenda && (
              <ScrollView 
                showsVerticalScrollIndicator={false} 
                style={styles.modalContent}
                contentContainerStyle={{ paddingBottom: 60 }}
              >
                <View style={styles.modalTitleSection}>
                  <View style={[
                    styles.modalStatusBadge,
                    { backgroundColor: selectedAgenda.type === 'surat_tugas' ? '#fff7ed' : '#f0f9ff' }
                  ]}>
                    <Text style={[
                      styles.modalStatusText,
                      { color: selectedAgenda.type === 'surat_tugas' ? COLORS.orange500 : COLORS.primary500 }
                    ]}>
                      {selectedAgenda.type === 'surat_tugas' ? 'SURAT TUGAS' : 'AGENDA'}
                    </Text>
                  </View>
                  <Text style={styles.modalMainTitle}>{selectedAgenda.title || 'Tanpa Judul'}</Text>
                </View>

                <View style={styles.modalInfoGrid}>
                  <View style={styles.modalInfoItem}>
                    <View style={styles.modalInfoIcon}>
                      <Ionicons name="calendar-outline" size={18} color={COLORS.primary500} />
                    </View>
                    <View style={styles.modalInfoTextContainer}>
                      <Text style={styles.modalInfoLabel}>Waktu Pelaksanaan</Text>
                      <Text style={styles.modalInfoValue}>
                        {selectedAgenda.start_time ? dayjs(selectedAgenda.start_time).format('DD MMMM YYYY') : '-'}
                      </Text>
                      <Text style={styles.modalInfoValueSub}>
                        Pukul {selectedAgenda.start_time ? dayjs(selectedAgenda.start_time).format('HH:mm') : '-'} WITA
                      </Text>
                      {selectedAgenda.end_time && (
                        <Text style={styles.modalInfoValueSub}>
                          sampai {dayjs(selectedAgenda.end_time).format('DD MMM YYYY, HH:mm')}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.modalInfoItem}>
                    <View style={styles.modalInfoIcon}>
                      <Ionicons name="location-outline" size={18} color={COLORS.primary500} />
                    </View>
                    <View style={styles.modalInfoTextContainer}>
                      <Text style={styles.modalInfoLabel}>Lokasi/ Link Zoom</Text>
                      {selectedAgenda.location_url?.startsWith('http') ? (
                        <TouchableOpacity onPress={() => handleOpenLink(selectedAgenda.location_url!)}>
                          <Text style={[styles.modalInfoValue, { color: COLORS.primary500, textDecorationLine: 'underline' }]}>
                            {selectedAgenda.location_url}
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={styles.modalInfoValue}>
                          {selectedAgenda.location_url || selectedAgenda.penyelenggara || 'Lokasi tidak tersedia'}
                        </Text>
                      )}
                    </View>
                  </View>

                  {selectedAgenda.nomor_st && (
                    <View style={styles.modalInfoItem}>
                      <View style={styles.modalInfoIcon}>
                        <Ionicons name="document-text-outline" size={18} color={COLORS.primary500} />
                      </View>
                      <View style={styles.modalInfoTextContainer}>
                        <Text style={styles.modalInfoLabel}>Nomor Surat</Text>
                        <Text style={styles.modalInfoValue}>{selectedAgenda.nomor_st}</Text>
                      </View>
                    </View>
                  )}
                  
                  {selectedAgenda.type === 'surat_tugas' && selectedAgenda.employees && (
                    <View style={styles.modalInfoItem}>
                      <View style={styles.modalInfoIcon}>
                        <Ionicons name="people-outline" size={18} color={COLORS.primary500} />
                      </View>
                      <View style={styles.modalInfoTextContainer}>
                        <Text style={styles.modalInfoLabel}>Anggota Tim</Text>
                        <View style={styles.modalEmployeeList}>
                          {selectedAgenda.employees.map((emp: any, i: number) => (
                            <View key={i} style={styles.modalEmployeeTag}>
                              <Text style={styles.modalEmployeeText}>{emp.name}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    </View>
                  )}
                </View>

                {selectedAgenda.description && (
                  <View style={styles.modalDescriptionSection}>
                    <Text style={styles.modalInfoLabel}>Keterangan</Text>
                    <Text style={styles.modalDescriptionText}>
                      {renderTextWithLinks(selectedAgenda.description)}
                    </Text>
                  </View>
                )}

                <TouchableOpacity 
                  onPress={() => setModalVisible(false)}
                  style={styles.modalPrimaryButton}
                >
                  <Text style={styles.modalPrimaryButtonText}>Tutup</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondary50,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
  },
  headerLabel: {
    color: COLORS.secondary400,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.secondary900,
    letterSpacing: -0.5,
  },
  headerMeta: {
    color: COLORS.primary500,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  debugWarning: {
    color: COLORS.orange500,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  todayButton: {
    backgroundColor: COLORS.primary50,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.primary100,
  },
  todayButtonText: {
    color: COLORS.primary600,
    fontWeight: '700',
    fontSize: 11,
  },
  calendarCard: {
    marginHorizontal: 16,
    backgroundColor: COLORS.white,
    borderRadius: 40,
    padding: 24,
    shadowColor: COLORS.secondary200,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 5,
    borderWidth: 1,
    borderColor: COLORS.secondary100,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  navButton: {
    padding: 8,
    backgroundColor: COLORS.secondary50,
    borderRadius: 999,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.secondary800,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  weekdayCell: {
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: -0.5,
    color: COLORS.secondary300,
  },
  weekendText: {
    color: COLORS.red400,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  selectedDayCircle: {
    backgroundColor: COLORS.primary600,
    shadowColor: COLORS.primary400,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  todayCircle: {
    backgroundColor: COLORS.primary50,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.secondary700,
  },
  selectedDayText: {
    color: COLORS.white,
  },
  todayText: {
    color: COLORS.primary600,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: -4,
    flexDirection: 'row',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary400,
    marginHorizontal: 1,
  },
  selectedDot: {
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  dateHeader: {
    paddingHorizontal: 32,
    marginTop: 32,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateHeaderTitle: {
    color: COLORS.secondary900,
    fontWeight: '800',
    fontSize: 18,
  },
  dateHeaderSubtitle: {
    color: COLORS.secondary400,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  calendarIcon: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.secondary200,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  agendaList: {
    paddingHorizontal: 24,
  },
  agendaCard: {
    marginBottom: 16,
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.secondary100,
    shadowColor: COLORS.secondary200,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
  },
  agendaIndicator: {
    width: 6,
    height: '100%',
    borderRadius: 3,
    backgroundColor: COLORS.primary500,
    marginRight: 16,
  },
  agendaContent: {
    flex: 1,
  },
  typeBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  nomorStText: {
    fontSize: 11,
    color: COLORS.secondary400,
    fontWeight: '500',
  },
  agendaTitle: {
    color: COLORS.secondary900,
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 8,
  },
  employeesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  employeesText: {
    color: COLORS.secondary500,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
    flex: 1,
  },
  agendaMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  agendaMetaText: {
    color: COLORS.secondary400,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  agendaDescription: {
    color: COLORS.secondary500,
    fontSize: 12,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    backgroundColor: COLORS.secondary100,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    color: COLORS.secondary400,
    fontWeight: '500',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 32,
    maxHeight: '80%',
    width: '100%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.secondary100,
  },
  modalHeaderTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  modalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.secondary900,
  },
  modalSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.secondary400,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.secondary50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    padding: 24,
  },
  modalTitleSection: {
    marginBottom: 24,
  },
  modalStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  modalStatusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  modalMainTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.secondary900,
    lineHeight: 30,
  },
  modalInfoGrid: {
    gap: 20,
    marginBottom: 24,
  },
  modalInfoItem: {
    flexDirection: 'row',
    gap: 16,
  },
  modalInfoIcon: {
    width: 36,
    height: 36,
    backgroundColor: COLORS.primary50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalInfoTextContainer: {
    flex: 1,
  },
  modalInfoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.secondary400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  modalInfoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.secondary800,
  },
  modalInfoValueSub: {
    fontSize: 12,
    color: COLORS.secondary500,
    marginTop: 2,
  },
  modalEmployeeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  modalEmployeeTag: {
    backgroundColor: COLORS.secondary50,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.secondary100,
  },
  modalEmployeeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.secondary700,
  },
  modalDescriptionSection: {
    backgroundColor: COLORS.secondary50,
    padding: 20,
    borderRadius: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: COLORS.secondary100,
  },
  modalDescriptionText: {
    fontSize: 14,
    color: COLORS.secondary700,
    lineHeight: 22,
  },
  modalPrimaryButton: {
    backgroundColor: COLORS.primary600,
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: COLORS.primary400,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  modalPrimaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
  },
  agendaChevron: {
    justifyContent: 'center',
    paddingLeft: 4,
  },
});

export default ActivityCalendarScreen;
