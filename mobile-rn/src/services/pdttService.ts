import api from './api';

export interface PdttItem {
  id: number;
  item_name: string;
  brand: string | null;
  satuan: string;
  price: number;
  jumlah: number | null;
}

export interface PdttRequestItem {
  item_id: number;
  jumlah: number;
}

export interface PdttRequestPayload {
  period: string;
  items: PdttRequestItem[];
}

export interface PdttRequestResponse {
  id: number;
  period: string;
  status: string;
  items: any[];
  updated_at: string;
  created_at: string;
}

export const pdttService = {
  getRequestableItems: async () => {
    const res = await api.get('/pdtt-items/requestable');
    return res.data; // { data: PdttItem[], meta: { period, saldo, jumlah_hari } }
  },

  getPreviousRequests: async () => {
    const res = await api.get('/procurement-requests');
    return res.data; // { data: PdttRequestResponse[] }
  },

  submitRequest: async (payload: PdttRequestPayload) => {
    const res = await api.post('/procurement-requests', payload);
    return res.data;
  },
};
