import api from './api';

export const assetService = {
  getAssets: (params?: any) => {
    return api.get('/assets', { params });
  },

  getEmployees: () => {
    return api.get('/employees');
  },

  createLoan: (data: any) => {
    return api.post('/bmn-loans', data);
  },

  getLoanHistory: () => {
    return api.get('/bmn-loans');
  },

  getLoanSchedule: () => {
    // Gunakan endpoint public yang selalu tersedia (tidak butuh auth)
    return api.get('/public/bmn-loans/schedule');
  },
};
