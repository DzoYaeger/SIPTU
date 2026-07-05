export const bmnService = (apiFetch) => {
  const syncInventoryShape = (item) => ({
    ...item,
    kode_barang: item.code || item.kode_barang || '-',
    nama_barang: item.name || item.nama_barang || '-',
    kategori: item.category || item.kategori || '-',
    satuan: item.unit || item.satuan || '-',
    lokasi: item.location || item.lokasi || '-',
    stok: Number(item.quantity || item.stok || 0),
    code: item.code || item.kode_barang || '-',
    name: item.name || item.nama_barang || '-',
    category: item.category || item.kategori || '-',
    unit: item.unit || item.satuan || '-',
    location: item.location || item.lokasi || '-',
    quantity: Number(item.quantity || item.stok || 0),
  });

  return {
    async listInventory(params = {}) {
      const query = new URLSearchParams();
      if (params.search) query.append('search', params.search);
      if (params.page) query.append('page', params.page);
      if (params.pageSize) query.append('pageSize', params.pageSize);

      const response = await apiFetch(`/inventories?${query.toString()}`);
      if (!response.ok) throw new Error('Gagal mengambil data persediaan');

      const json = await response.json();
      return {
        data: (json.data || []).map(syncInventoryShape),
        meta: json.meta || { total: json.data?.length || 0, page: 1, last_page: 1 }
      };
    },

    async createInventory(payload) {
      const body = {
        code: payload.kode_barang ?? payload.kodeBarang,
        name: payload.nama_barang ?? payload.namaBarang,
        unit: payload.satuan,
        quantity: Number(payload.stok ?? payload.quantity ?? 0),
        description: payload.keterangan,
        category: payload.kategori || 'ATK',
        location: payload.lokasi || '-',
      };
      const response = await apiFetch('/inventories', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || 'Gagal menambah persediaan');
      return syncInventoryShape(json);
    },

    async updateInventory(id, payload) {
      const body = {
        code: payload.kode_barang ?? payload.kodeBarang,
        name: payload.nama_barang ?? payload.namaBarang,
        unit: payload.satuan,
        quantity: Number(payload.stok ?? payload.quantity ?? 0),
        description: payload.keterangan,
        category: payload.kategori || 'ATK',
        location: payload.lokasi || '-',
      };
      const response = await apiFetch(`/inventories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || 'Gagal mengubah persediaan');
      return syncInventoryShape(json);
    },

    async deleteInventory(id) {
      const response = await apiFetch(`/inventories/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Gagal menghapus persediaan');
      return true;
    },

    async listStockCards(params = {}) {
      const query = new URLSearchParams();
      if (params.inventory_id) query.append('inventory_id', params.inventory_id);
      if (params.type) query.append('type', params.type);
      if (params.source) query.append('source', params.source);
      if (params.search) query.append('search', params.search);
      if (params.page) query.append('page', params.page);
      if (params.pageSize) query.append('pageSize', params.pageSize);

      const response = await apiFetch(`/inventory-stock-cards?${query.toString()}`);
      if (!response.ok) throw new Error('Gagal mengambil kartu stok');

      const json = await response.json();
      return {
        data: (json.data || []).map(row => ({
          id: row.id,
          inventoryId: Number(row.inventory_id),
          kodeBarang: row.inventory_code ?? '-',
          namaBarang: row.inventory_name ?? '-',
          type: row.type,
          source: row.source,
          quantity: Number(row.quantity),
          stockBefore: Number(row.stock_before),
          stockAfter: Number(row.stock_after),
          transactionDate: row.transaction_date,
          referenceNumber: row.reference_number ?? '-',
          notes: row.notes ?? '',
          createdByName: row.created_by_name ?? '-',
        })),
        meta: json.meta || { total: json.data?.length || 0, page: 1, last_page: 1 }
      };
    },

    async createStockCard(payload) {
      const body = {
        inventory_id: payload.inventory_id,
        type: payload.type,
        source: payload.source,
        quantity: payload.quantity,
        transaction_date: payload.transaction_date,
        reference_number: payload.reference_number,
        notes: payload.notes,
      };

      const response = await apiFetch('/inventory-stock-cards', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || 'Gagal menambah kartu stok');
      return json;
    },

    // --- Inventory Requests ---

    async listRequests(params = {}) {
      const response = await apiFetch('/inventory-requests');
      if (!response.ok) throw new Error('Gagal mengambil data permintaan');
      const json = await response.json();
      return { data: Array.isArray(json) ? json : (json?.data ?? []) };
    },

    async createRequest(payload) {
      const response = await apiFetch("/public/inventory-requests", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.message || 'Gagal mengirim permintaan');
      return json;
    },

    async getRequestByNumber(token) {
      const response = await apiFetch(`/public/inventory-requests/${token}`, {
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) throw new Error('Data tidak ditemukan');
      return await response.json();
    },

    async approveRequest(token, payload) {
      const response = await apiFetch(`/public/inventory-requests/${token}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.message || 'Gagal menyetujui permintaan');
      return json;
    },

    async rejectRequest(token, payload) {
      const response = await apiFetch(`/public/inventory-requests/${token}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.message || 'Gagal menolak permintaan');
      return json;
    },

    async listPublicInventory() {
      const response = await apiFetch("/public/inventories", {
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) return [];
      const json = await response.json();
      return Array.isArray(json) ? json : (json?.data ?? []);
    }
  };
};
