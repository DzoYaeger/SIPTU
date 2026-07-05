import api from './api';

export interface Employee {
  id: number;
  nama: string;
  nip: string;
  fungsi_bidang: string | null;
}

export interface ArchiveUnit {
  id: number;
  nama: string | null;
  fungsi_bidang: string | null;
}

export interface ArchiveLoanPayload {
  borrow_date: string;
  borrower_name: string;
  borrower_nip: string | null;
  borrower_work_unit: string | null;
  archive_unit_id: number;
  archive_number: string;
  borrower_signature: string; // base64
}

export const archiveService = {
  listEmployees: async () => {
    const res = await api.get('/employees');
    const data = res.data;
    return Array.isArray(data) ? data : data.data ?? [];
  },

  listArchiveUnits: async () => {
    const res = await api.get('/archive-units');
    const data = res.data;
    return Array.isArray(data) ? data : data.units ?? [];
  },

  submitLoan: async (payload: ArchiveLoanPayload) => {
    const res = await api.post('/public/archive-loans', payload);
    return res.data;
  }
};
