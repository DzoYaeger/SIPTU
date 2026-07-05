import React, { useState, useEffect } from 'react';
import { Calendar, Badge, List, Spin, Typography, Space, Empty } from 'antd';
import { 
  CalendarOutlined, 
  ClockCircleOutlined, 
  EnvironmentOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { useNavigate } from 'react-router-dom';

dayjs.locale('id');

const { Title, Text } = Typography;
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

// Map backend type to beautiful labels
const getEventBadgeType = (item) => {
  const typeLow = (item.type || '').toLowerCase();
  const titleLow = (item.title || '').toLowerCase();
  
  if (typeLow === 'rapat' || titleLow.includes('rapat')) return 'blue';
  if (typeLow === 'zoom' || titleLow.includes('zoom')) return 'cyan';
  if (typeLow === 'dinas luar' || titleLow.includes('dinas')) return 'volcano';
  if (typeLow === 'tamu' || titleLow.includes('kunjungan')) return 'purple';
  
  return 'geekblue'; // default
};

export default function PublicKepegawaianKalender() {
  const [agendas, setAgendas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState(dayjs());
  
  const navigate = useNavigate();

  const fetchAgendas = async (date) => {
    setLoading(true);
    try {
      const year = date.year();
      const month = date.month() + 1;
      const res = await fetch(`${API_URL}/public/agendas?year=${year}&month=${month}`);
      if (!res.ok) throw new Error("Gagal mengambil data kalender");
      const data = await res.json();
      setAgendas(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgendas(currentMonth);
  }, [currentMonth]);

  const onPanelChange = (date) => {
    setCurrentMonth(date);
  };

  const onDateSelect = (date) => {
    setSelectedDate(date);
  };

  const getDayEvents = (date) => {
    return agendas.filter(agenda => {
      const start = dayjs(agenda.start_time);
      const end = dayjs(agenda.end_time);
      return date.isSame(start, 'day') || date.isSame(end, 'day') || (date.isAfter(start, 'day') && date.isBefore(end, 'day'));
    });
  };

  const dateCellRender = (value) => {
    const events = getDayEvents(value);
    if (events.length === 0) return null;
    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {events.slice(0, 3).map((item) => (
          <li key={item.id} style={{ marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <Badge color={getEventBadgeType(item)} text={item.title} style={{ fontSize: '11px', fontWeight: 500 }} />
          </li>
        ))}
        {events.length > 3 && (
          <li style={{ fontSize: '11px', color: '#8c8c8c', paddingLeft: '12px', marginTop: '2px' }}>
            +{events.length - 3} agenda lain
          </li>
        )}
      </ul>
    );
  };

  const cellRender = (current, info) => {
    if (info.type === 'date') {
      return dateCellRender(current);
    }
    return info.originNode;
  };

  const selectedDayEvents = getDayEvents(selectedDate);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      
      {/* Premium Elegant Header */}
      <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          padding: '48px 0',
          position: 'relative',
          overflow: 'hidden',
          borderBottom: '4px solid #3b82f6'
      }}>
        {/* Subtle Background Pattern */}
        <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(circle at 10% 150%, rgba(56,189,248,0.15) 0%, transparent 60%), radial-gradient(circle at 90% -50%, rgba(59,130,246,0.15) 0%, transparent 60%)'
        }}></div>
        
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 10 }}>
          <button 
            onClick={() => navigate('/app/layanan-mandiri')}
            style={{ 
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', 
              padding: '10px 20px', borderRadius: '8px', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '32px',
              fontWeight: 600, fontSize: '14px', transition: 'all 0.2s',
              backdropFilter: 'blur(4px)'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            <ArrowLeftOutlined /> Kembali ke Layanan Mandiri
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ 
                width: '72px', height: '72px', background: 'white', borderRadius: '20px', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)' 
            }}>
              <CalendarOutlined style={{ fontSize: '36px', color: '#3b82f6' }} />
            </div>
            <div>
              <h1 style={{ margin: 0, color: 'white', fontSize: '36px', fontWeight: 800, fontFamily: '"Plus Jakarta Sans", sans-serif', letterSpacing: '-0.5px' }}>
                Agenda Balai POM di Palopo
              </h1>
              <p style={{ margin: '8px 0 0 0', color: 'rgba(241,245,249,0.85)', fontSize: '18px', fontWeight: 400 }}>
                Jadwal Kegiatan & Rapat Internal Terpadu
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: '40px 24px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
          
          {/* Left: Main Calendar */}
          <div style={{ 
              flex: '1 1 700px', background: 'white', borderRadius: '24px', padding: '32px', 
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)',
              border: '1px solid #e2e8f0'
          }}>
            <Spin spinning={loading} size="large">
               <Calendar 
                 cellRender={cellRender} 
                 onPanelChange={onPanelChange} 
                 onSelect={onDateSelect}
                 value={selectedDate}
                 style={{ borderRadius: '12px' }}
               />
            </Spin>
          </div>

          {/* Right: Agenda List Side Panel */}
          <div style={{ flex: '0 0 420px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Selected Date Summary Card */}
            <div style={{ 
                background: 'white', borderRadius: '24px', padding: '32px', 
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', 
                border: '1px solid #e2e8f0',
                borderTop: '5px solid #3b82f6' 
            }}>
              <div style={{ marginBottom: '28px', paddingBottom: '20px', borderBottom: '1px dashed #cbd5e1' }}>
                <Text type="secondary" style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700, color: '#64748b' }}>
                  Jadwal Kegiatan
                </Text>
                <Title level={2} style={{ margin: '8px 0 0 0', fontFamily: '"Plus Jakarta Sans", sans-serif', color: '#0f172a', fontWeight: 800 }}>
                  {selectedDate.format('DD MMMM YYYY')}
                </Title>
              </div>

              {selectedDayEvents.length === 0 ? (
                <Empty 
                  image={Empty.PRESENTED_IMAGE_SIMPLE} 
                  description={<span style={{ color: '#94a3b8', fontSize: '15px' }}>Belum ada agenda terjadwal.</span>} 
                />
              ) : (
                <List
                  itemLayout="vertical"
                  dataSource={selectedDayEvents}
                  renderItem={item => (
                    <div style={{ 
                      background: '#f8fafc', 
                      borderLeft: `5px solid ${getEventBadgeType(item) === 'volcano' ? '#ef4444' : getEventBadgeType(item) === 'cyan' ? '#06b6d4' : '#3b82f6'}`, 
                      marginBottom: '16px', borderRadius: '0 12px 12px 0', padding: '20px',
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                      transition: 'transform 0.2s',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateX(4px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateX(0)'}
                    >
                      <Space align="center" style={{ marginBottom: '12px' }}>
                         <Badge color={getEventBadgeType(item)} />
                         <Text strong style={{ color: '#1e293b', fontSize: '16px' }}>{item.title}</Text>
                      </Space>
                      
                      <div style={{ display: 'grid', gap: '10px', marginTop: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#475569', fontSize: '14px', fontWeight: 500 }}>
                          <ClockCircleOutlined style={{ color: '#64748b', fontSize: '16px' }} />
                          <span>{dayjs(item.start_time).format('HH:mm')} - {dayjs(item.end_time).format('HH:mm')}</span>
                        </div>
                        
                        {(item.location_url || item.penyelenggara) && (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', color: '#475569', fontSize: '14px' }}>
                            <EnvironmentOutlined style={{ marginTop: '2px', color: '#64748b', fontSize: '16px' }} />
                            <span style={{ lineHeight: 1.4 }}>
                                {item.location_url} 
                                {item.penyelenggara && <><br/><span style={{ color: '#94a3b8', fontSize: '13px' }}>Penyelenggara: {item.penyelenggara}</span></>}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                />
              )}
            </div>
            
            {/* Quick Info Card */}
            <div style={{ 
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', 
                borderRadius: '24px', padding: '28px', border: '1px solid #bfdbfe' 
            }}>
               <h4 style={{ margin: '0 0 12px 0', color: '#1e40af', fontSize: '16px', fontWeight: 700, letterSpacing: '0.5px' }}>Pusat Informasi</h4>
               <p style={{ margin: 0, color: '#2563eb', fontSize: '15px', lineHeight: 1.6 }}>
                 Kalender ini menampilkan seluruh <strong>Agenda Balai POM di Palopo</strong>. Data di dalamnya diperbarui secara *real-time* oleh Bagian Tata Usaha.
               </p>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
