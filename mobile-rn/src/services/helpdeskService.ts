import api from './api';

export const helpdeskService = {
  getTickets: (params?: any) => {
    return api.get('/it-helpdesk-tickets', { params });
  },

  createTicket: (data: any) => {
    return api.post('/it-helpdesk-tickets', data);
  },

  getTicketDetails: (id: string) => {
    return api.get(`/it-helpdesk-tickets/${id}`);
  },
};
