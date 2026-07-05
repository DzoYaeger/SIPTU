import api from './api';

export const inventoryService = {
  listPublicInventory: async () => {
    const response = await api.get('/public/inventories');
    // Align with web: Array.isArray(json) ? json : (json?.data ?? [])
    const data = response.data;
    return Array.isArray(data) ? data : (data?.data ?? []);
  },

  createRequest: async (payload: {
    nip: string;
    nama: string;
    fungsi_bidang?: string;
    purpose?: string;
    requester_signature: string;
    items: Array<{
      inventory_id: number;
      item_name: string;
      qty_requested: number;
      unit?: string;
    }>;
  }) => {
    return api.post('/public/inventory-requests', payload);
  },
};
