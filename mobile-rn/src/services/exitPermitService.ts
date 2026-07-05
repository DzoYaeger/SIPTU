import api from './api';

export const exitPermitService = {
  getMyActive: () => {
    return api.get('/exit-permits/my-active');
  },

  recordExit: (data: { reason?: string; permit_type: string; latitude: number; longitude: number }) => {
    return api.post('/exit-permits/exit', data);
  },

  recordReturn: (id: number, data: { latitude: number; longitude: number }) => {
    return api.put(`/exit-permits/${id}/return`, data);
  },
};
