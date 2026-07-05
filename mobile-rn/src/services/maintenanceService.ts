import api from './api';

export interface BmnAsset {
  id: number;
  name: string;
  asset_code: string;
  brand?: string;
  model?: string;
  location?: string;
}

export interface MaintenanceReportPayload {
  report_type: 'pemeliharaan' | 'keluhan';
  asset_id: number | null;
  report_details: string;
}

export const maintenanceService = {
  listAssets: async (): Promise<BmnAsset[]> => {
    const res = await api.get('/public/bmn-assets');
    const data = res.data;
    return Array.isArray(data) ? data : data?.data ?? [];
  },

  createReport: async (payload: MaintenanceReportPayload) => {
    const res = await api.post('/bmn-maintenance-reports', payload);
    return res.data;
  }
};
