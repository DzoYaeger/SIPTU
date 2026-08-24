import { useCallback, useState } from 'react';
import { App as AntdApp } from 'antd';
import { buildMessageAdapter } from '../utils/notify.js';
import { useAuth } from './useAuth.js';

export function useArchiveLoans() {
  const { message } = AntdApp.useApp();
  const { apiFetch } = useAuth();
  const notification = buildMessageAdapter(message);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLoans = useCallback(async (status) => {
    setLoading(true);
    try {
      const response = await apiFetch('/archive-loans');
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message ?? 'Gagal memuat data peminjaman.');
      }
      const data = await response.json();
      let items = Array.isArray(data) ? data : (data.data ?? []);
      if (status) {
        items = items.filter((loan) => loan.status === status);
      }
      setLoans(items);
    } catch (error) {
      notification.error({
        message: 'Error',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [notification, apiFetch]);

  const addLoan = useCallback(async (data) => {
    try {
      const response = await apiFetch('/archive-loans', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message ?? 'Gagal menambah peminjaman.');
      }
      await response.json().catch(() => null);
      await fetchLoans();

      notification.success({
        message: 'Sukses',
        description: 'Data peminjaman arsip berhasil ditambahkan.',
      });
      return true;
    } catch (error) {
      notification.error({
        message: 'Error',
        description: error.message,
      });
      return false;
    }
  }, [notification, apiFetch, fetchLoans]);

  const deleteLoan = useCallback(async (loanId) => {
    try {
      const response = await apiFetch(`/archive-loans/${loanId}`, { method: 'DELETE' });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message ?? 'Data peminjaman tidak ditemukan.');
      }
      await fetchLoans();
      notification.success({
        message: 'Sukses',
        description: 'Data peminjaman arsip berhasil dihapus.',
      });
      return true;
    } catch (error) {
      notification.error({
        message: 'Error',
        description: error.message,
      });
      return false;
    }
  }, [notification, apiFetch, fetchLoans]);

  const saveSignature = useCallback(async (loanId, data) => {
    try {
      const payload = { password: data.password, totp_code: data.totp_code };
      
      if (data?.type === 'borrowing' && data?.role === 'admin') {
        const response = await apiFetch(`/archive-loans/${loanId}/approve`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const resPayload = await response.json().catch(() => ({}));
          throw new Error(resPayload?.message ?? 'Gagal menyetujui peminjaman.');
        }
      } else if (data?.type === 'returning' && data?.role === 'admin') {
        const response = await apiFetch(`/archive-loans/${loanId}/return`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const resPayload = await response.json().catch(() => ({}));
          throw new Error(resPayload?.message ?? 'Gagal menyelesaikan pengembalian.');
        }
      }

      await fetchLoans();

      notification.success({
        message: 'Sukses',
        description: 'Persetujuan berhasil disimpan.',
      });
      return true;
    } catch (error) {
      let description = error?.message ?? 'Terjadi kesalahan tak terduga.';

      notification.error({
        message: 'Gagal menyimpan tanda tangan',
        description,
      });
      return false;
    }
  }, [notification, apiFetch, fetchLoans]);

  return { loans, loading, fetchLoans, addLoan, deleteLoan, saveSignature };
}



