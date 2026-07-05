import api from './api';

export interface ActivityAgenda {
  id: string;
  title: string;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  location_url: string | null;
  status?: string;
  color?: string;
  type?: 'agenda' | 'surat_tugas';
  link_surat?: string | null;
  penyelenggara?: string | null;
  created_by?: string | null;
  // Surat Tugas specific fields
  nomor_st?: string | null;
  employees?: Array<{id: number; name: string; nip?: string}>;
  ketua_tim?: {id: number; name: string} | null;
}

export interface ServiceHistory {
  id: number;
  service_type: string;
  title: string;
  status: string;
  request_date: string;
  description?: string;
  data?: any;
}

export const activityService = {
  // Legacy agendas endpoint
  getAgendas: () => {
    return api.get('/agendas');
  },

  // New employee calendar endpoint (combines agendas + surat tugas)
  getEmployeeCalendar: (year?: number, month?: number) => {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (month) params.append('month', month.toString());
    const query = params.toString();
    return api.get(`/employee-calendar${query ? '?' + query : ''}`);
  },

  // Get calendar for date range
  getEmployeeCalendarRange: (startDate: string, endDate: string) => {
    return api.get(`/employee-calendar/range?start_date=${startDate}&end_date=${endDate}`);
  },

  getHistory: () => {
    return api.get('/my-service-history');
  },

  getHistoryDetail: (serviceType: string, id: string | number) => {
    return api.get(`/my-service-history/${serviceType}/${id}`);
  },
};
