import api from './api';

export const dashboardService = {
  getStats: () => {
    return api.get('/dashboard/stats');
  },

  getRecentActivities: () => {
    return api.get('/dashboard/activities');
  },

  getNotifications: () => {
    return api.get('/notifications');
  },

  getValidatorStats: () => {
    return api.get('/validator/dashboard');
  },

  getMyServiceHistory: () => {
    return api.get('/my-service-history');
  },

  markNotificationAsRead: (id: number) => {
    return api.post(`/notifications/${id}/read`);
  },
};
