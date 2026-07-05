import api from './api';

export interface ValidationItem {
  id: string;
  type: 'archive_loan' | 'bmn_loan' | 'inventory_request' | 'it_helpdesk' | 'surat_tugas' | 'bmn_maintenance';
  title: string;
  description: string;
  requester_name: string;
  requester_nip?: string;
  requester_unit?: string;
  status: string;
  created_at: string;
  formatted_date?: string;
  service_type?: string;
  validator_notes?: string;
  approved_by?: string;
  approved_at?: string;
  // Detail tambahan
  details?: Record<string, any>;
  // Data lengkap dari API
  raw_data?: any;
}

export interface ValidationStats {
  total: number;
  total_pending: number;
  total_approved: number;
  total_rejected: number;
  by_service: {
    archive_loans: number;
    bmn_loans: number;
    inventory_requests: number;
    it_helpdesk: number;
    surat_tugas: number;
    bmn_maintenance: number;
  };
}

export interface ValidationResponse {
  success: boolean;
  data: ValidationItem[];
  stats?: ValidationStats;
  message?: string;
}

export const validationService = {
  // Get ALL validations (not just pending)
  getAllValidations: async (): Promise<ValidationResponse> => {
    // Ambil data dari berbagai endpoint dan gabungkan
    try {
      const [
        archiveLoansRes,
        bmnLoansRes,
        inventoryReqRes,
        itHelpdeskRes,
        suratTugasRes,
        bmnMaintenanceRes,
      ] = await Promise.allSettled([
        api.get('/archive-loans'),
        api.get('/bmn-loans'),
        api.get('/inventory-requests'),
        api.get('/it-helpdesk-tickets'),
        api.get('/surat-tugas'),
        api.get('/bmn-maintenance-reports'),
      ]);

      const allItems: ValidationItem[] = [];

      // Archive Loans (Peminjaman Arsip)
      if (archiveLoansRes.status === 'fulfilled' && archiveLoansRes.value.data) {
        const items = Array.isArray(archiveLoansRes.value.data) 
          ? archiveLoansRes.value.data 
          : archiveLoansRes.value.data.data || [];
        allItems.push(...items.map((item: any) => ({
          id: item.id.toString(),
          type: 'archive_loan' as const,
          title: item.archive_description || `Peminjaman Arsip #${item.id}`,
          description: item.purpose || `Arsip: ${item.archive_number}`,
          requester_name: item.borrower_name || item.user?.name || '-',
          requester_nip: item.borrower_nip || item.user?.nip,
          requester_unit: item.borrower_work_unit || item.user?.employee?.unit,
          status: item.status || 'pending',
          created_at: item.created_at,
          formatted_date: item.formatted_date || item.created_at,
          validator_notes: item.validator_notes,
          approved_by: item.approver?.name || item.approved_by_name || item.approved_by,
          approved_at: item.approved_at,
          raw_data: item,
        })));
      }

      // BMN Loans (Peminjaman BMN)
      if (bmnLoansRes.status === 'fulfilled' && bmnLoansRes.value.data) {
        const items = Array.isArray(bmnLoansRes.value.data) 
          ? bmnLoansRes.value.data 
          : bmnLoansRes.value.data.data || [];
        allItems.push(...items.map((item: any) => ({
          id: item.id.toString(),
          type: 'bmn_loan' as const,
          title: item.spa_number || `Peminjaman BMN #${item.id}`,
          description: item.notes || item.purpose || '-',
          requester_name: item.borrower_name || item.user?.name || item.employee?.name || '-',
          requester_nip: item.borrower_nip || item.user?.nip || item.employee?.nip,
          requester_unit: item.borrower_function || item.user?.employee?.unit || item.employee?.unit,
          status: item.status || 'pending',
          created_at: item.created_at,
          formatted_date: item.formatted_date || item.created_at,
          validator_notes: item.validator_notes,
          approved_by: item.approver?.name || item.approved_by_name || item.approved_by,
          approved_at: item.approved_at,
          raw_data: item,
        })));
      }

      // Inventory Requests (Permintaan Persediaan)
      if (inventoryReqRes.status === 'fulfilled' && inventoryReqRes.value.data) {
        const items = Array.isArray(inventoryReqRes.value.data) 
          ? inventoryReqRes.value.data 
          : inventoryReqRes.value.data.data || [];
        allItems.push(...items.map((item: any) => ({
          id: item.id.toString(),
          type: 'inventory_request' as const,
          title: item.spb_number || `Permintaan Persediaan #${item.id}`,
          description: item.purpose || '-',
          requester_name: item.requester_name || item.user?.name || item.requester?.name || '-',
          requester_nip: item.requester_nip || item.user?.nip || item.requester?.nip,
          requester_unit: item.requester_function || item.user?.employee?.unit || item.requester?.unit,
          status: item.status || 'pending',
          created_at: item.created_at,
          formatted_date: item.formatted_date || item.created_at,
          validator_notes: item.approval_notes,
          approved_by: item.approver?.name || item.approved_by_name || item.approved_by,
          approved_at: item.approved_at,
          raw_data: item,
        })));
      }

      // IT Helpdesk
      if (itHelpdeskRes.status === 'fulfilled' && itHelpdeskRes.value.data) {
        const items = Array.isArray(itHelpdeskRes.value.data) 
          ? itHelpdeskRes.value.data 
          : itHelpdeskRes.value.data.data || [];
        allItems.push(...items.map((item: any) => ({
          id: item.id.toString(),
          type: 'it_helpdesk' as const,
          title: item.ticket_number || `IT Ticket #${item.id}`,
          description: item.problem_details || item.description || '-',
          requester_name: item.employee_name || item.user?.name || item.employee?.name || '-',
          requester_nip: item.employee_nip || item.user?.nip || item.employee?.nip,
          requester_unit: item.function_area || item.user?.employee?.unit || item.employee?.unit,
          status: item.status || 'open',
          created_at: item.created_at,
          formatted_date: item.formatted_date || item.created_at,
          validator_notes: item.followup_details,
          approved_by: item.itStaff?.name || item.it_staff_name || item.it_staff_id,
          approved_at: item.completion_date,
          raw_data: item,
        })));
      }

      // Surat Tugas
      if (suratTugasRes.status === 'fulfilled' && suratTugasRes.value.data) {
        const items = Array.isArray(suratTugasRes.value.data) 
          ? suratTugasRes.value.data 
          : suratTugasRes.value.data.data || [];
        allItems.push(...items.map((item: any) => ({
          id: item.id.toString(),
          type: 'surat_tugas' as const,
          title: item.nomor_st || `Surat Tugas #${item.id}`,
          description: item.deskripsi_tugas || item.perihal || '-',
          requester_name: item.creator?.name || item.created_by_name || '-',
          requester_nip: item.creator?.nip,
          requester_unit: item.creator?.employee?.unit,
          status: item.status || 'draft',
          created_at: item.created_at,
          formatted_date: item.formatted_date || item.created_at,
          validator_notes: item.validator_notes,
          approved_by: item.approver?.name || item.approved_by_name || item.approved_by,
          approved_at: item.approved_at,
          raw_data: item,
        })));
      }

      // BMN Maintenance Reports (Laporan BMN)
      if (bmnMaintenanceRes.status === 'fulfilled' && bmnMaintenanceRes.value.data) {
        const items = Array.isArray(bmnMaintenanceRes.value.data) 
          ? bmnMaintenanceRes.value.data 
          : bmnMaintenanceRes.value.data.data || [];
        allItems.push(...items.map((item: any) => ({
          id: item.id.toString(),
          type: 'bmn_maintenance' as const,
          title: item.report_number || `Laporan BMN #${item.id}`,
          description: item.report_details || `Jenis: ${item.report_type}`,
          requester_name: item.reporter_name || item.reporter?.name || item.user?.name || '-',
          requester_nip: item.reporter_nip || item.reporter?.nip || item.user?.nip,
          requester_unit: item.reporter_function || item.reporter?.unit || item.user?.employee?.unit,
          status: item.status || 'pending',
          created_at: item.created_at,
          formatted_date: item.formatted_date || item.created_at,
          validator_notes: item.admin_notes,
          approved_by: item.handler?.name || item.handled_by_name || item.handled_by,
          approved_at: item.handled_at,
          raw_data: item,
        })));
      }

      // Sort by created_at desc
      allItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Calculate stats
      const stats: ValidationStats = {
        total: allItems.length,
        total_pending: allItems.filter(i => ['pending', 'open', 'draft', 'waiting_approval'].includes(i.status)).length,
        total_approved: allItems.filter(i => ['approved', 'completed', 'in_progress', 'active', 'returned'].includes(i.status)).length,
        total_rejected: allItems.filter(i => ['rejected', 'cancelled', 'closed'].includes(i.status)).length,
        by_service: {
          archive_loans: allItems.filter(i => i.type === 'archive_loan').length,
          bmn_loans: allItems.filter(i => i.type === 'bmn_loan').length,
          inventory_requests: allItems.filter(i => i.type === 'inventory_request').length,
          it_helpdesk: allItems.filter(i => i.type === 'it_helpdesk').length,
          surat_tugas: allItems.filter(i => i.type === 'surat_tugas').length,
          bmn_maintenance: allItems.filter(i => i.type === 'bmn_maintenance').length,
        }
      };

      return {
        success: true,
        data: allItems,
        stats,
      };
    } catch (error: any) {
      console.error('Error fetching all validations:', error);
      return {
        success: false,
        data: [],
        message: error.message || 'Gagal memuat data',
      };
    }
  },

  // Get validation stats
  getStats: async (): Promise<ValidationStats> => {
    const response = await validationService.getAllValidations();
    return response.stats || {
      total: 0,
      total_pending: 0,
      total_approved: 0,
      total_rejected: 0,
      by_service: {
        archive_loans: 0,
        bmn_loans: 0,
        inventory_requests: 0,
        it_helpdesk: 0,
        surat_tugas: 0,
        bmn_maintenance: 0,
      }
    };
  },

  // Approve request/loan
  approve: async (type: string, id: string, notes?: string, data?: any): Promise<any> => {
    let endpoint = '';
    let payload: any = { notes };
    
    switch (type) {
      case 'archive_loan':
        endpoint = `/archive-loans/${id}/approve`;
        break;
      case 'bmn_loan':
        endpoint = `/bmn-loans/${id}/approve`;
        // BMN loan butuh data kondisi kendaraan/barang
        if (data) {
          payload = {
            validator_signature: data.validator_signature || 'signed',
            is_vehicle: data.is_vehicle,
            kondisi_barang_pinjam: data.kondisi_barang_pinjam,
            kondisi_kendaraan_pinjam: data.is_vehicle ? data.kondisi_kendaraan_pinjam : null,
            bbm_awal: data.is_vehicle ? data.bbm_awal : null,
          };
        }
        break;
      case 'inventory_request':
        endpoint = `/inventory-requests/${id}/approve`;
        // Inventory request butuh items dan qty_approved
        if (data?.items) {
          payload = {
            items: data.items,
            approval_notes: notes,
          };
        }
        break;
      case 'it_helpdesk':
        endpoint = `/it-helpdesk-tickets/${id}/approve`;
        break;
      case 'surat_tugas':
        endpoint = `/surat-tugas/${id}/approve`;
        break;
      case 'bmn_maintenance':
        endpoint = `/bmn-maintenance-reports/${id}/approve`;
        break;
      default:
        throw new Error('Tipe validasi tidak dikenal');
    }
    
    const response = await api.put(endpoint, payload);
    return response.data;
  },

  // Return BMN loan
  returnBmnLoan: async (id: string, data: any): Promise<any> => {
    const endpoint = `/bmn-loans/${id}/return`;
    const payload = {
      kondisi_barang_kembali: data.kondisi_barang_kembali,
      kondisi_kendaraan_kembali: data.kondisi_kendaraan_kembali,
      bbm_akhir: data.bbm_akhir,
    };
    
    const response = await api.put(endpoint, payload);
    return response.data;
  },

  // Reject request/loan
  reject: async (type: string, id: string, reason: string): Promise<any> => {
    let endpoint = '';
    let payload: any = { reason };
    
    switch (type) {
      case 'archive_loan':
        endpoint = `/archive-loans/${id}/reject`;
        break;
      case 'bmn_loan':
        endpoint = `/bmn-loans/${id}/reject`;
        break;
      case 'inventory_request':
        endpoint = `/inventory-requests/${id}/reject`;
        payload = { approval_notes: reason };
        break;
      case 'it_helpdesk':
        endpoint = `/it-helpdesk-tickets/${id}/reject`;
        break;
      case 'surat_tugas':
        endpoint = `/surat-tugas/${id}/reject`;
        break;
      case 'bmn_maintenance':
        endpoint = `/bmn-maintenance-reports/${id}/reject`;
        break;
      default:
        throw new Error('Tipe validasi tidak dikenal');
    }
    
    const response = await api.put(endpoint, payload);
    return response.data;
  },

  // Get detail by type and id
  getDetail: async (type: string, id: string): Promise<any> => {
    let endpoint = '';
    
    console.log('Fetching detail for type:', type, 'id:', id);
    
    switch (type) {
      case 'archive_loan':
        endpoint = `/archive-loans/${id}`;
        break;
      case 'bmn_loan':
        endpoint = `/bmn-loans/${id}`;
        break;
      case 'inventory_request':
        endpoint = `/inventory-requests/${id}`;
        break;
      case 'it_helpdesk':
        endpoint = `/it-helpdesk-tickets/${id}`;
        break;
      case 'surat_tugas':
        endpoint = `/surat-tugas/${id}`;
        break;
      case 'bmn_maintenance':
        endpoint = `/bmn-maintenance-reports/${id}`;
        break;
      default:
        throw new Error(`Tipe tidak dikenal: ${type}`);
    }
    
    try {
      const response = await api.get(endpoint);
      console.log('Detail response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error in getDetail:', error);
      throw error;
    }
  },

  // Get icon by type
  getIconByType: (type: string): string => {
    const icons: Record<string, string> = {
      archive_loan: 'folder-open-outline',
      bmn_loan: 'car-outline',
      inventory_request: 'cart-outline',
      it_helpdesk: 'desktop-outline',
      surat_tugas: 'document-attach-outline',
      bmn_maintenance: 'construct-outline',
    };
    return icons[type] || 'help-circle-outline';
  },

  // Get color by type
  getColorByType: (type: string): string => {
    const colors: Record<string, string> = {
      archive_loan: '#d97706',
      bmn_loan: '#7c3aed',
      inventory_request: '#059669',
      it_helpdesk: '#dc2626',
      surat_tugas: '#4f46e5',
      bmn_maintenance: '#0f766e',
    };
    return colors[type] || '#64748b';
  },

  // Get label by type
  getLabelByType: (type: string): string => {
    const labels: Record<string, string> = {
      archive_loan: 'Peminjaman Arsip',
      bmn_loan: 'Peminjaman BMN',
      inventory_request: 'Permintaan Persediaan',
      it_helpdesk: 'IT Helpdesk',
      surat_tugas: 'Surat Tugas',
      bmn_maintenance: 'Laporan BMN',
    };
    return labels[type] || type;
  },

  // Get status color
  getStatusColor: (status: string): { bg: string; text: string; label: string } => {
    const statusMap: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Menunggu' },
      waiting_approval: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Menunggu' },
      waiting_user_approval: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Menunggu Konfirmasi' },
      open: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Terbuka' },
      draft: { bg: 'bg-secondary-100', text: 'text-secondary-700', label: 'Draft' },
      approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Disetujui' },
      completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Selesai' },
      in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Diproses' },
      active: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Aktif' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Ditolak' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Dibatalkan' },
      closed: { bg: 'bg-secondary-100', text: 'text-secondary-700', label: 'Ditutup' },
      returned: { bg: 'bg-green-100', text: 'text-green-700', label: 'Dikembalikan' },
      out: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Keluar' },
      available: { bg: 'bg-green-100', text: 'text-green-700', label: 'Tersedia' },
      unavailable: { bg: 'bg-secondary-100', text: 'text-secondary-700', label: 'Tidak Tersedia' },
      pengajuan: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pengajuan' },
      dipinjam: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Dipinjam' },
      pengajuan_pengembalian: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Pengajuan Kembali' },
      selesai: { bg: 'bg-green-100', text: 'text-green-700', label: 'Selesai' },
    };
    return statusMap[status] || { bg: 'bg-secondary-100', text: 'text-secondary-700', label: status };
  },
};
