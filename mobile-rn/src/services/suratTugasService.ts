import api from './api';

export interface Employee {
  id: number;
  name: string;
  nip: string;
  position: string;
  department: string;
}

export interface Sarana {
  id: number;
  nama: string;
  lokasi: string;
  jenis: string[];
}

export interface SuratTugasPayload {
  employee_ids: number[];
  ketua_tim_id: number;
  tanggal_mulai: string; // YYYY-MM-DD
  tanggal_selesai: string; // YYYY-MM-DD
  mak?: string;
  lokasi_tugas?: string;
  deskripsi_tugas: string;
  sarana?: { id: number; nama: string; lokasi: string }[];
}

export const suratTugasService = {
  listEmployees: async (): Promise<Employee[]> => {
    const res = await api.get('/public/bmn-employees');
    const data = res.data;
    return Array.isArray(data) ? data : data?.data ?? [];
  },

  searchSarana: async (query: string): Promise<Sarana[]> => {
    const res = await api.get('/public/siamparan/sarana', {
      params: { 
        per_page: '50', 
        page: '1',
        q: query.trim()
      }
    });
    const data = res.data;
    const list = Array.isArray(data) ? data : data?.data ?? [];
    
    return list.map((s: any) => ({
      id: s.id,
      nama: s.nama_sarana,
      lokasi: [s.kelurahan, s.kecamatan, s.kabupaten].filter(Boolean).join(', '),
      jenis: Array.isArray(s.jenis) ? s.jenis : []
    }));
  },

  create: async (payload: SuratTugasPayload) => {
    const res = await api.post('/public/surat-tugas', payload);
    return res.data;
  },

  getProtokolKerjaUrl: (id: number) => {
    // We use the absolute URL for the public endpoint
    const baseUrl = 'https://siptu.bpompalopo.com/core_api/api';
    return `${baseUrl}/public/surat-tugas/${id}/protokol-kerja`;
  }
};
