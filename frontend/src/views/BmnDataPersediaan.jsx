import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  App as AntdApp,
  Avatar,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Segmented,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from 'antd';
import { buildMessageAdapter } from '../utils/notify.js';
import {
  AppstoreOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  InboxOutlined,
  ShoppingOutlined,
  PlusOutlined,
  UploadOutlined,
  SearchOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  HistoryOutlined,
  PlusCircleOutlined,
  PrinterOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth.js';
import { bmnService } from '../services/bmnService.js';
import StatisticCard from '../components/StatisticCard.jsx';
import dayjs from 'dayjs';

// const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

const satuanOptions = ['Unit', 'Kotak', 'Paket', 'Pcs', 'Rim', 'Set'];

const inventoryFormLayout = [
  {
    name: 'kodeBarang',
    label: 'Kode Barang',
    rules: [
      { required: true, message: 'Kode barang wajib diisi.' },
      { max: 50, message: 'Maksimum 50 karakter.' },
    ],
    render: () => <Input placeholder="Contoh: INV-001" />,
  },
  {
    name: 'namaBarang',
    label: 'Nama Barang',
    rules: [{ required: true, message: 'Nama barang wajib diisi.' }],
    render: () => <Input placeholder="Contoh: Kertas A4" />,
  },
  {
    name: 'satuan',
    label: 'Satuan',
    rules: [{ required: true, message: 'Satuan wajib diisi.' }],
    render: () => <Input placeholder="Contoh: Rim" list="inventory-satuan-options" />,
  },
  {
    name: 'stok',
    label: 'Stok',
    rules: [{ required: true, message: 'Jumlah stok wajib diisi.' }],
    render: () => (
      <InputNumber min={0} style={{ width: '100%' }} placeholder="Masukkan jumlah stok" />
    ),
  },
  {
    name: 'keterangan',
    label: 'Keterangan',
    render: () => <Input.TextArea rows={3} placeholder="Catatan tambahan (opsional)" />,
  },
];

const normalizeInventory = (item) => ({
  id: item.id,
  key: item.id,
  kodeBarang: item.kode_barang ?? item.kodeBarang ?? item.code ?? '-',
  namaBarang: item.nama_barang ?? item.namaBarang ?? item.name ?? '-',
  satuan: item.satuan ?? item.unit ?? '-',
  stok: Number(item.stok ?? item.quantity ?? 0),
  keterangan: item.keterangan ?? item.description ?? '',
  kategori: item.kategori ?? item.category ?? '-',
  lokasi: item.lokasi ?? item.location ?? '-',
});

const resolveInventoryRows = (payload) => {
  const rawRows = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
  const seen = new Set();

  return rawRows
    .map(normalizeInventory)
    .filter((row) => {
      const uniqueKey = `${row.id ?? 'no-id'}-${row.kodeBarang ?? row.namaBarang ?? 'unknown'}`;
      if (seen.has(uniqueKey)) return false;
      seen.add(uniqueKey);
      return true;
    });
};

const statusFilterTabs = [
  { key: 'all', label: 'Semua Data' },
  { key: 'available', label: 'Tersedia' },
  { key: 'low', label: 'Stok Rendah' },
  { key: 'empty', label: 'Habis' },
];

const stockInSources = [
  { label: 'Pembelian', value: 'pembelian' },
  { label: 'Transfer', value: 'transfer' },
  { label: 'Lainnya', value: 'lainnya' },
];

const stockOutSources = [
  { label: 'Permintaan', value: 'permintaan' },
  { label: 'Lainnya', value: 'lainnya' },
];

const resolveStockCardRows = (payload) => {
  const rawRows = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
  return rawRows.map((row, index) => ({
    id: row.id ?? `${row.inventory_id ?? 'inv'}-${index}`,
    inventoryId: Number(row.inventory_id),
    kodeBarang: row.inventory_code ?? row.kode_barang ?? '-',
    namaBarang: row.inventory_name ?? row.nama_barang ?? '-',
    type: row.type ?? 'masuk',
    source: row.source ?? 'lainnya',
    quantity: Number(row.quantity ?? 0),
    stockBefore: Number(row.stock_before ?? 0),
    stockAfter: Number(row.stock_after ?? 0),
    transactionDate: row.transaction_date ?? row.created_at ?? null,
    referenceNumber: row.reference_number ?? '-',
    notes: row.notes ?? '',
    createdByName: row.created_by_name ?? '-',
  }));
};

const modalStyles = {
  header: {
    borderBottom: '1px solid #f0f0f0',
    background: '#ffffff',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: '14px 16px',
  },
  body: {
    background: '#ffffff',
    padding: '16px',
  },
  footer: {
    borderTop: '1px solid #f0f0f0',
    background: '#ffffff',
    padding: '12px 16px',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  content: {
    border: '1px solid #f0f0f0',
    borderRadius: 12,
    boxShadow: '0 10px 24px rgba(0, 0, 0, 0.08)',
    overflow: 'hidden',
  },
};

const shellStyle = {
  background: '#f8fafc',
  borderRadius: 12,
  padding: 16,
};

const softCardStyle = {
  borderRadius: 12,
  border: '1px solid #f0f0f0',
  background: '#ffffff',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
};

const BmnDataPersediaan = () => {
  const { token, apiFetch } = useAuth();
  const { modal, message } = AntdApp.useApp();
  const notification = buildMessageAdapter(message);
  const [form] = Form.useForm();
  const [stockForm] = Form.useForm();
  const service = useMemo(() => bmnService(apiFetch), [apiFetch]);

  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [mode, setMode] = useState('create');
  const [activeItem, setActiveItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [tableSize, setTableSize] = useState('middle');
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [screenTab, setScreenTab] = useState('inventory');
  const [stockCardRows, setStockCardRows] = useState([]);
  const [stockCardLoading, setStockCardLoading] = useState(false);
  const [stockCardSearch, setStockCardSearch] = useState('');
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockType, setStockType] = useState('masuk');
  const [stockTargetItem, setStockTargetItem] = useState(null);
  const [stockCardPreviewOpen, setStockCardPreviewOpen] = useState(false);
  const [stockCardPreviewItem, setStockCardPreviewItem] = useState(null);
  const watchedType = Form.useWatch('type', stockForm);
  const watchedQuantity = Form.useWatch('quantity', stockForm);
  const watchedCurrentStock = Form.useWatch('currentStock', stockForm);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await service.listInventory({ pageSize: 1000 });
      setInventory(resolveInventoryRows(payload));
    } catch (error) {
      notification.error({
        message: 'Tidak dapat memuat data persediaan',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [service, notification]);

  const fetchStockCards = useCallback(async () => {
    setStockCardLoading(true);
    try {
      const payload = await service.listStockCards({ pageSize: 1000, search: stockCardSearch || undefined });
      setStockCardRows(resolveStockCardRows(payload));
    } catch (error) {
      notification.error({
        message: 'Tidak dapat memuat kartu stok',
        description: error.message,
      });
    } finally {
      setStockCardLoading(false);
    }
  }, [service, notification, stockCardSearch]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  useEffect(() => {
    fetchStockCards();
  }, [fetchStockCards]);

  const handleCreate = () => {
    setMode('create');
    setActiveItem(null);
    form.resetFields();
    setOpen(true);
  };

  const handleEdit = (record) => {
    setMode('edit');
    setActiveItem(record);
    form.setFieldsValue(record);
    setOpen(true);
  };

  const handleViewDetail = (record) => {
    setActiveItem(record);
    setDetailDrawerOpen(true);
  };

  const handleOpenStockModal = (record, forcedType = 'masuk') => {
    if (!record?.id) {
      notification.warning({ message: 'Pilih barang dari daftar persediaan untuk update stok.' });
      return;
    }
    setStockType(forcedType);
    setStockTargetItem(record);
    stockForm.resetFields();
    stockForm.setFieldsValue({
      inventoryId: record?.id,
      inventoryCode: record?.kodeBarang,
      inventoryName: record?.namaBarang,
      currentStock: Number(record?.stok ?? 0),
      type: forcedType,
      source: forcedType === 'masuk' ? 'pembelian' : 'permintaan',
      quantity: undefined,
      transactionDate: dayjs(),
      referenceNumber: undefined,
      notes: undefined,
    });
    setStockModalOpen(true);
  };

  const handleStockSubmit = async () => {
    try {
      const values = await stockForm.validateFields();
      if (projectedStock < 0) {
        notification.error({ message: 'Stok akhir tidak boleh negatif.' });
        return;
      }
      const payload = {
        inventory_id: Number(stockTargetItem?.id ?? values.inventoryId),
        type: values.type,
        source: values.source,
        quantity: Number(values.quantity),
        transaction_date: values.transactionDate?.format('YYYY-MM-DD'),
        reference_number: values.referenceNumber,
        notes: values.notes,
      };
      setSaving(true);
      await service.createStockCard(payload);
      notification.success({ message: 'Transaksi stok berhasil dicatat.' });
      setStockModalOpen(false);
      setStockTargetItem(null);
      await Promise.all([fetchInventory(), fetchStockCards()]);
    } catch (error) {
      if (!error.errorFields) {
        notification.error({
          message: 'Gagal mencatat transaksi stok',
          description: error.message,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleOpenStockCardPreview = (record) => {
    setStockCardPreviewItem(record);
    setStockCardPreviewOpen(true);
  };

  const stockCardPreviewRows = useMemo(
    () => stockCardRows.filter((row) => row.inventoryId === Number(stockCardPreviewItem?.id)),
    [stockCardRows, stockCardPreviewItem],
  );

  const projectedStock = useMemo(() => {
    const current = Number(watchedCurrentStock ?? 0);
    const qty = Number(watchedQuantity ?? 0);
    const type = watchedType ?? stockType;
    if (!qty) return current;
    return type === 'keluar' ? current - qty : current + qty;
  }, [watchedCurrentStock, watchedQuantity, watchedType, stockType]);

  const hasInventoryFilter = useMemo(
    () => Boolean(searchTerm) || stockFilter !== 'all',
    [searchTerm, stockFilter],
  );

  const hasStockCardFilter = useMemo(
    () => Boolean(stockCardSearch),
    [stockCardSearch],
  );

  const printStockCards = useCallback(async (rows, title, context = {}) => {
    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);

      const totalIn = rows.filter((row) => row.type === 'masuk').reduce((acc, row) => acc + Number(row.quantity ?? 0), 0);
      const totalOut = rows.filter((row) => row.type === 'keluar').reduce((acc, row) => acc + Number(row.quantity ?? 0), 0);
      const saldoMutasi = totalIn - totalOut;
      const timestamps = rows
        .map((row) => (row.transactionDate ? dayjs(row.transactionDate).valueOf() : null))
        .filter((value) => Number.isFinite(value));
      const periodLabel = context.periodLabel
        ?? (timestamps.length
          ? `${dayjs(Math.min(...timestamps)).format('DD MMM YYYY')} - ${dayjs(Math.max(...timestamps)).format('DD MMM YYYY')}`
          : 'Seluruh periode');

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;
      const contentWidth = pageWidth - margin * 2;
      const lineRight = pageWidth - margin;

      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.6);
      doc.line(margin, 22, lineRight, 22);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(title, margin, 12);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text('Laporan transaksi kartu stok persediaan BMN', margin, 17);

      doc.setTextColor(51, 65, 85);
      doc.text(`Tanggal Cetak: ${dayjs().format('DD MMMM YYYY HH:mm')}`, lineRight, 12, { align: 'right' });
      doc.text(`Total Baris: ${rows.length.toLocaleString('id-ID')}`, lineRight, 16, { align: 'right' });
      doc.text(`Filter: ${context.filterLabel ?? 'Semua data'}`, lineRight, 20, { align: 'right' });

      const summaryY = 27;
      const summaryGap = 4;
      const boxWidth = (contentWidth - summaryGap * 3) / 4;
      const boxHeight = 14;
      const summaryItems = [
        ['Stok Masuk', totalIn.toLocaleString('id-ID')],
        ['Stok Keluar', totalOut.toLocaleString('id-ID')],
        ['Saldo Mutasi', saldoMutasi.toLocaleString('id-ID')],
        ['Periode Data', periodLabel],
      ];

      summaryItems.forEach(([label, value], index) => {
        const x = margin + index * (boxWidth + summaryGap);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(x, summaryY, boxWidth, boxHeight, 1.2, 1.2, 'FD');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text(String(label), x + 2, summaryY + 4.5);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(String(value), x + 2, summaryY + 10);
      });

      const bodyRows = rows.map((row, index) => ([
        index + 1,
        row.transactionDate ? dayjs(row.transactionDate).format('DD/MM/YYYY') : '-',
        row.kodeBarang ?? '-',
        row.namaBarang ?? '-',
        row.type === 'masuk' ? 'Masuk' : 'Keluar',
        String(row.source ?? '-').toUpperCase(),
        Number(row.quantity ?? 0).toLocaleString('id-ID'),
        Number(row.stockAfter ?? 0).toLocaleString('id-ID'),
        row.referenceNumber || '-',
        row.notes || '-',
      ]));

      autoTable(doc, {
        startY: summaryY + boxHeight + 6,
        head: [['No', 'Tanggal', 'Kode', 'Barang', 'Jenis', 'Sumber', 'Jumlah', 'Stok Akhir', 'Referensi', 'Keterangan']],
        body: bodyRows.length
          ? bodyRows
          : [['-', '-', '-', '-', '-', '-', '-', '-', '-', 'Tidak ada data']],
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 8,
          cellPadding: 2,
          lineColor: [203, 213, 225],
          lineWidth: 0.1,
          textColor: [15, 23, 42],
        },
        headStyles: {
          fillColor: [226, 232, 240],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 9 },
          1: { halign: 'center', cellWidth: 20 },
          2: { cellWidth: 19 },
          3: { cellWidth: 42 },
          4: { halign: 'center', cellWidth: 16 },
          5: { halign: 'center', cellWidth: 20 },
          6: { halign: 'right', cellWidth: 19 },
          7: { halign: 'right', cellWidth: 22 },
          8: { cellWidth: 25 },
          9: { cellWidth: 'auto' },
        },
        margin: { left: margin, right: margin },
        didDrawPage: () => {
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text('Dokumen ini dihasilkan otomatis oleh sistem.', margin, pageHeight - 6);
          doc.text(
            `Halaman ${doc.getCurrentPageInfo().pageNumber}`,
            lineRight,
            pageHeight - 6,
            { align: 'right' },
          );
        },
      });

      const filenameSafe = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      doc.save(`${filenameSafe || 'kartu-stok'}-${dayjs().format('YYYYMMDD-HHmmss')}.pdf`);
    } catch (error) {
      notification.error({
        message: 'Gagal membuat file PDF',
        description: error?.message ?? 'Terjadi kesalahan saat membuat PDF kartu stok.',
      });
    }
  }, [notification]);

  const handleDelete = (record) => {
    modal.confirm({
      title: 'Hapus data persediaan?',
      content: `Anda akan menghapus persediaan ${record.namaBarang} (${record.kodeBarang}).`,
      okText: 'Hapus',
      okButtonProps: { danger: true },
      cancelText: 'Batal',
      centered: true,
      onOk: async () => {
        try {
          await service.deleteInventory(record.id);
          notification.success({ message: 'Data persediaan dihapus.' });
          if (activeItem?.id === record.id) {
            setDetailDrawerOpen(false);
            setActiveItem(null);
          }
          Promise.all([fetchInventory(), fetchStockCards()]);
        } catch (error) {
          notification.error({
            message: 'Gagal menghapus data persediaan',
            description: error.message,
          });
        }
      },
    });
  };

  const handleClose = () => setOpen(false);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        kode_barang: values.kodeBarang,
        nama_barang: values.namaBarang,
        satuan: values.satuan,
        stok: Number(values.stok ?? 0),
        keterangan: values.keterangan,
      };
      setSaving(true);

      if (mode === 'create') {
        const created = await service.createInventory(payload);
        if (Number(payload.stok) > 0) {
          await service.createStockCard({
            inventory_id: Number(created.id),
            type: 'masuk',
            source: 'pembelian',
            quantity: Number(payload.stok),
            transaction_date: dayjs().format('YYYY-MM-DD'),
            reference_number: 'INIT-STOCK',
            notes: 'Stok awal saat item persediaan dibuat.',
          });
        }
        notification.success({ message: 'Persediaan baru ditambahkan.' });
      } else if (activeItem) {
        await service.updateInventory(activeItem.id, payload);
        notification.success({ message: 'Data persediaan diperbarui.' });
      }

      handleClose();
      Promise.all([fetchInventory(), fetchStockCards()]);
    } catch (error) {
      if (!error.errorFields) {
        notification.error({
          message: 'Gagal menyimpan data persediaan',
          description: error.message,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const filteredData = useMemo(() => {
    let data = inventory;

    if (stockFilter === 'available') {
      data = data.filter((item) => item.stok > 5);
    } else if (stockFilter === 'low') {
      data = data.filter((item) => item.stok > 0 && item.stok <= 5);
    } else if (stockFilter === 'empty') {
      data = data.filter((item) => item.stok === 0);
    }

    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();
    return data.filter(
      (item) =>
        item.kodeBarang?.toLowerCase().includes(term) ||
        item.namaBarang?.toLowerCase().includes(term) ||
        item.kategori?.toLowerCase().includes(term),
    );
  }, [inventory, searchTerm, stockFilter]);

  const summary = useMemo(() => {
    const totalItems = inventory.length;
    const totalStock = inventory.reduce((acc, item) => acc + (Number(item.stok) || 0), 0);
    const emptyItems = inventory.filter((item) => item.stok === 0).length;
    const lowItems = inventory.filter((item) => item.stok > 0 && item.stok <= 5).length;
    return { totalItems, totalStock, emptyItems, lowItems };
  }, [inventory]);

  const stockCardSummary = useMemo(() => {
    const totalIn = stockCardRows
      .filter((row) => row.type === 'masuk')
      .reduce((acc, row) => acc + row.quantity, 0);
    const totalOut = stockCardRows
      .filter((row) => row.type === 'keluar')
      .reduce((acc, row) => acc + row.quantity, 0);
    const saldo = totalIn - totalOut;
    return { totalIn, totalOut, saldo };
  }, [stockCardRows]);

  const stockCardColumns = useMemo(
    () => [
      {
        title: 'Tanggal',
        dataIndex: 'transactionDate',
        key: 'transactionDate',
        width: 130,
        render: (value) => (value ? dayjs(value).format('DD MMM YYYY') : '-'),
      },
      {
        title: 'Barang',
        key: 'barang',
        width: 280,
        render: (_, record) => (
          <Space direction="vertical" size={1}>
            <Typography.Text strong>{record.namaBarang}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {record.kodeBarang}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: 'Jenis',
        key: 'type',
        width: 160,
        render: (_, record) => (
          <Tag icon={record.type === 'masuk' ? <ArrowDownOutlined /> : <ArrowUpOutlined />} color={record.type === 'masuk' ? 'green' : 'volcano'}>
            {record.type === 'masuk' ? 'Stok Masuk' : 'Stok Keluar'}
          </Tag>
        ),
      },
      {
        title: 'Sumber',
        dataIndex: 'source',
        key: 'source',
        width: 130,
        render: (value) => <Tag>{String(value ?? '-').toUpperCase()}</Tag>,
      },
      {
        title: 'Jumlah',
        dataIndex: 'quantity',
        key: 'quantity',
        width: 110,
        align: 'right',
        render: (value, record) => (
          <Typography.Text strong type={record.type === 'masuk' ? 'success' : 'danger'}>
            {record.type === 'masuk' ? '+' : '-'}
            {Number(value).toLocaleString('id-ID')}
          </Typography.Text>
        ),
      },
      {
        title: 'Stok Akhir',
        dataIndex: 'stockAfter',
        key: 'stockAfter',
        width: 110,
        align: 'right',
        render: (value) => Number(value).toLocaleString('id-ID'),
      },
      {
        title: 'Referensi',
        dataIndex: 'referenceNumber',
        key: 'referenceNumber',
        width: 130,
        render: (value) => value || '-',
      },
      {
        title: 'Keterangan',
        dataIndex: 'notes',
        key: 'notes',
        ellipsis: true,
        render: (value) => value || <Typography.Text type="secondary">-</Typography.Text>,
      },
    ],
    [],
  );

  const columns = useMemo(
    () => [
      {
        title: 'Informasi Barang',
        key: 'info',
        width: 280,
        render: (_, record) => (
          <Space>
            <Avatar icon={<InboxOutlined />} style={{ background: '#e6f4ff', color: '#1677ff' }} />
            <Space direction="vertical" size={1}>
              <Typography.Text strong>{record.namaBarang}</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {record.kodeBarang}
              </Typography.Text>
            </Space>
          </Space>
        ),
      },
      {
        title: 'Kategori & Satuan',
        key: 'meta',
        width: 180,
        render: (_, record) => (
          <Space direction="vertical" size={4}>
            <Tag color="geekblue">{record.kategori}</Tag>
            <Tag>{record.satuan}</Tag>
          </Space>
        ),
      },
      {
        title: 'Stok',
        dataIndex: 'stok',
        key: 'stok',
        width: 130,
        sorter: (a, b) => a.stok - b.stok,
        render: (value) => (
          <Tag
            icon={value === 0 ? <WarningOutlined /> : <CheckCircleOutlined />}
            color={value === 0 ? 'red' : value <= 5 ? 'orange' : 'green'}
          >
            {value.toLocaleString('id-ID')}
          </Tag>
        ),
      },
      {
        title: 'Keterangan',
        dataIndex: 'keterangan',
        key: 'keterangan',
        ellipsis: true,
        render: (value) => (value ? value : <Typography.Text type="secondary">-</Typography.Text>),
      },
      {
        title: '',
        key: 'actions',
        width: 220,
        render: (_, record) => (
          <Space size={4}>
            <Tooltip title="Detail">
              <Button type="text" icon={<EyeOutlined style={{ color: '#1890ff' }} />} onClick={() => handleViewDetail(record)} />
            </Tooltip>
            <Tooltip title="Update Stok">
              <Button type="text" icon={<PlusCircleOutlined style={{ color: '#52c41a' }} />} onClick={() => handleOpenStockModal(record)} />
            </Tooltip>
            <Tooltip title="Lihat Kartu Stok">
              <Button type="text" icon={<FileSearchOutlined style={{ color: '#1890ff' }} />} onClick={() => handleOpenStockCardPreview(record)} />
            </Tooltip>
            <Tooltip title="Cetak Kartu Stok">
              <Button
                type="text"
                icon={<PrinterOutlined />}
                onClick={() =>
                  printStockCards(
                    stockCardRows.filter((row) => row.inventoryId === Number(record.id)),
                    `Kartu Stok ${record.namaBarang}`,
                    {
                      filterLabel: `Barang: ${record.namaBarang} (${record.kodeBarang})`,
                    },
                  )
                }
              />
            </Tooltip>
            <Tooltip title="Ubah">
              <Button type="text" icon={<EditOutlined style={{ color: '#faad14' }} />} onClick={() => handleEdit(record)} />
            </Tooltip>
            <Tooltip title="Hapus">
              <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
            </Tooltip>
          </Space>
        ),
      },
    ],
    [handleEdit, handleDelete, handleViewDetail, handleOpenStockModal, handleOpenStockCardPreview, stockCardRows, printStockCards],
  );

  const handleImportModalOpen = () => setIsImportModalOpen(true);
  const handleImportModalClose = () => setIsImportModalOpen(false);

  const handleDownloadTemplate = () => {
    window.open('/api/bmn/inventory/template', '_blank');
  };

  const resetInventoryFilters = () => {
    setSearchTerm('');
    setStockFilter('all');
  };

  const resetStockCardFilters = () => {
    setStockCardSearch('');
  };

  const uploadProps = {
    name: 'file',
    action: '/api/bmn/inventory/import',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    onChange(info) {
      if (info.file.status === 'done') {
        notification.success({ message: `${info.file.name} berhasil diimpor.` });
        fetchInventory();
        setIsImportModalOpen(false);
      } else if (info.file.status === 'error') {
        notification.error({
          message: `${info.file.name} gagal diimpor.`,
          description: info.file.response?.message,
        });
      }
    },
  };

  return (
    <div className="module-section" style={shellStyle}>
      <datalist id="inventory-satuan-options">
        {satuanOptions.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>

      <Card variant="borderless" style={{ ...softCardStyle, marginBottom: 18 }}>
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} md={15}>
            <Space direction="vertical" size={4}>
              <Typography.Title level={3} className="module-title" style={{ margin: 0 }}>
                Data Persediaan
              </Typography.Title>
              <Typography.Text className="module-subtitle">
                Kelola data barang, update stok, dan pantau riwayat transaksi dengan cepat.
              </Typography.Text>
            </Space>
          </Col>

        </Row>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <StatisticCard title="Total Item" value={summary.totalItems} icon={<AppstoreOutlined />} color="#1890ff" loading={loading} />
        </Col>
        <Col xs={24} sm={6}>
          <StatisticCard title="Total Stok" value={summary.totalStock.toLocaleString('id-ID')} icon={<ShoppingOutlined />} color="#52c41a" loading={loading} />
        </Col>
        <Col xs={24} sm={6}>
          <StatisticCard title="Stok Rendah" value={summary.lowItems} icon={<WarningOutlined />} color="#faad14" loading={loading} />
        </Col>
        <Col xs={24} sm={6}>
          <StatisticCard title="Habis" value={summary.emptyItems} icon={<InboxOutlined />} color="#f5222d" loading={loading} />
        </Col>
      </Row>

      <Card variant="borderless" style={softCardStyle} styles={{ body: { padding: '24px' } }}>
        <div className="data-filter-row">
          <Space wrap size={12}>
            <Input.Search
              placeholder="Cari nama, kode, kategori..."
              allowClear
              size="large"
              onSearch={setSearchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ maxWidth: 350, width: '100%', borderRadius: 8 }}
            />
            <Space>
               <Tooltip title="Buka Kartu Stok">
                 <Button icon={<HistoryOutlined />} onClick={() => setScreenTab('stock-card')} />
               </Tooltip>
               <Tooltip title="Import Data">
                 <Button icon={<UploadOutlined />} onClick={handleImportModalOpen} />
               </Tooltip>
               <Tooltip title="Tambah Barang">
                 <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} />
               </Tooltip>
               <Segmented
                 size="middle"
                 value={tableSize}
                 onChange={setTableSize}
                 options={[
                   { label: 'Rapat', value: 'small' },
                   { label: 'Nyaman', value: 'middle' },
                 ]}
               />
               {screenTab === 'inventory' && hasInventoryFilter ? (
                 <Button onClick={resetInventoryFilters}>Reset</Button>
               ) : null}
            </Space>
          </Space>
        </div>

        <Tabs
          activeKey={screenTab}
          onChange={setScreenTab}
          items={[
            { key: 'inventory', label: `Data Persediaan (${summary.totalItems})` },
            { key: 'stock-card', label: `Kartu Stok (${stockCardRows.length})` },
          ]}
          tabBarStyle={{ marginBottom: 18 }}
        />


        {screenTab === 'inventory' ? (
          <>
            <Tabs
              activeKey={stockFilter}
              onChange={setStockFilter}
              items={statusFilterTabs}
              tabBarStyle={{ marginBottom: 16 }}
            />
            <Table
              rowKey={(record, index) => `${record.id ?? 'row'}-${record.kodeBarang ?? record.namaBarang ?? index}`}
              columns={columns}
              dataSource={filteredData}
              loading={loading}
              pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} item` }}
              scroll={{ x: 1120 }}
              size={tableSize}
              locale={{
                emptyText: (
                  <Empty
                    description={hasInventoryFilter ? 'Data tidak ditemukan, coba ubah kata kunci atau reset filter.' : 'Belum ada data persediaan.'}
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  >
                    <Space>
                      {hasInventoryFilter ? (
                        <Button onClick={resetInventoryFilters}>Reset Filter</Button>
                      ) : (
                        <Tooltip title="Import">
                          <Button icon={<UploadOutlined />} onClick={handleImportModalOpen} />
                        </Tooltip>
                      )}
                      <Tooltip title="Tambah Persediaan">
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} />
                      </Tooltip>
                    </Space>
                  </Empty>
                ),
              }}
            />
          </>
        ) : (
          <>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={8}>
                <StatisticCard title="Total Stok Masuk" value={stockCardSummary.totalIn.toLocaleString('id-ID')} icon={<ArrowDownOutlined />} color="#52c41a" loading={stockCardLoading} />
              </Col>
              <Col xs={24} sm={8}>
                <StatisticCard title="Total Stok Keluar" value={stockCardSummary.totalOut.toLocaleString('id-ID')} icon={<ArrowUpOutlined />} color="#fa541c" loading={stockCardLoading} />
              </Col>
              <Col xs={24} sm={8}>
                <StatisticCard title="Saldo Mutasi" value={stockCardSummary.saldo.toLocaleString('id-ID')} icon={<HistoryOutlined />} color="#1677ff" loading={stockCardLoading} />
              </Col>
            </Row>
            <Table
              rowKey={(record, index) => `${record.id ?? 'card'}-${record.inventoryId ?? 'inv'}-${index}`}
              columns={stockCardColumns}
              dataSource={stockCardRows}
              loading={stockCardLoading}
              pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} transaksi` }}
              scroll={{ x: 1180 }}
              size={tableSize}
              locale={{
                emptyText: (
                  <Empty
                    description={hasStockCardFilter ? 'Transaksi tidak ditemukan untuk kata kunci ini.' : 'Belum ada transaksi stok.'}
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  >
                    {hasStockCardFilter ? (
                      <Button onClick={resetStockCardFilters}>Reset Filter</Button>
                    ) : (
                      'Lakukan update stok dari aksi pada daftar data persediaan.'
                    )}
                  </Empty>
                ),
              }}
            />
          </>
        )}
      </Card>

      <Drawer
        title={
          <Space>
            <InboxOutlined style={{ color: '#0ea5e9' }} />
            <span>Detail Persediaan</span>
          </Space>
        }
        width={520}
        onClose={() => setDetailDrawerOpen(false)}
        open={detailDrawerOpen}
        extra={
          activeItem ? (
            <Space>
              <Tooltip title="Update Stok">
                <Button size="small" icon={<PlusCircleOutlined />} onClick={() => { setDetailDrawerOpen(false); handleOpenStockModal(activeItem); }} />
              </Tooltip>
              <Tooltip title="Kartu Stok">
                <Button size="small" icon={<FileSearchOutlined />} onClick={() => { setDetailDrawerOpen(false); handleOpenStockCardPreview(activeItem); }} />
              </Tooltip>
              <Tooltip title="Ubah">
                <Button size="small" icon={<EditOutlined />} onClick={() => { setDetailDrawerOpen(false); handleEdit(activeItem); }} />
              </Tooltip>
              <Tooltip title="Hapus">
                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(activeItem)} />
              </Tooltip>
            </Space>
          ) : null
        }
      >
        {activeItem && (
          <Descriptions column={1} bordered size="small" labelStyle={{ width: 160 }}>
            <Descriptions.Item label="Kode Barang">{activeItem.kodeBarang}</Descriptions.Item>
            <Descriptions.Item label="Nama Barang">{activeItem.namaBarang}</Descriptions.Item>
            <Descriptions.Item label="Kategori">{activeItem.kategori}</Descriptions.Item>
            <Descriptions.Item label="Satuan">{activeItem.satuan}</Descriptions.Item>
            <Descriptions.Item label="Lokasi">{activeItem.lokasi}</Descriptions.Item>
            <Descriptions.Item label="Stok Saat Ini">
              <Tag color={activeItem.stok === 0 ? 'red' : activeItem.stok <= 5 ? 'orange' : 'green'}>
                {activeItem.stok.toLocaleString('id-ID')}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Keterangan">{activeItem.keterangan || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>

      <Modal
        centered
        destroyOnHidden
        open={open}
        title={mode === 'create' ? 'Tambah Persediaan' : 'Ubah Persediaan'}
        onCancel={handleClose}
        onOk={handleSubmit}
        confirmLoading={saving}
        okText="Simpan"
        cancelText="Batal"
        width={520}
        styles={modalStyles}
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          {inventoryFormLayout.map(({ render, ...item }) => (
            <Form.Item key={item.name} {...item}>
              {render()}
            </Form.Item>
          ))}
        </Form>
      </Modal>

      <Modal
        centered
        destroyOnHidden
        open={stockModalOpen}
        title={stockTargetItem ? `Update Stok - ${stockTargetItem.namaBarang}` : 'Update Stok'}
        onCancel={() => {
          setStockModalOpen(false);
          setStockTargetItem(null);
        }}
        onOk={handleStockSubmit}
        confirmLoading={saving}
        okText="Simpan Transaksi"
        cancelText="Batal"
        width={560}
        styles={modalStyles}
        okButtonProps={{ disabled: projectedStock < 0 || !stockTargetItem }}
      >
        <Form form={stockForm} layout="vertical" requiredMark={false}>
          <Form.Item name="inventoryId" hidden>
            <Input />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="inventoryCode" label="Kode Barang">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="currentStock" label="Stok Saat Ini">
                <Input disabled />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="inventoryName" label="Nama Barang">
            <Input disabled />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="type" label="Jenis Transaksi" rules={[{ required: true, message: 'Pilih jenis transaksi.' }]}>
                <Select
                  onChange={(value) => {
                    setStockType(value);
                    stockForm.setFieldValue('source', value === 'masuk' ? 'pembelian' : 'permintaan');
                  }}
                  options={[
                    { label: 'Stok Masuk', value: 'masuk' },
                    { label: 'Stok Keluar', value: 'keluar' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="source" label="Sumber" rules={[{ required: true, message: 'Pilih sumber transaksi.' }]}>
                <Select options={stockType === 'masuk' ? stockInSources : stockOutSources} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="quantity"
                label="Jumlah"
                rules={[
                  { required: true, message: 'Jumlah wajib diisi.' },
                  {
                    validator: (_, value) => {
                      const qty = Number(value ?? 0);
                      if (qty <= 0) return Promise.reject(new Error('Jumlah minimal 1.'));
                      const type = stockForm.getFieldValue('type');
                      const current = Number(stockForm.getFieldValue('currentStock') ?? 0);
                      if (type === 'keluar' && qty > current) {
                        return Promise.reject(new Error(`Stok tidak cukup. Maksimal ${current}.`));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <InputNumber min={1} style={{ width: '100%' }} placeholder="Masukkan jumlah" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="transactionDate" label="Tanggal Transaksi" rules={[{ required: true, message: 'Tanggal wajib dipilih.' }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="referenceNumber" label="Nomor Referensi">
            <Input placeholder="Contoh: PO-2026-0005 / SPB-2026-0012" />
          </Form.Item>
          <Form.Item name="notes" label="Keterangan">
            <Input.TextArea rows={3} placeholder="Catatan transaksi (opsional)" />
          </Form.Item>
          <Typography.Text type={projectedStock < 0 ? 'danger' : 'secondary'}>
            Prediksi stok setelah transaksi: {Number(projectedStock).toLocaleString('id-ID')}
          </Typography.Text>
        </Form>
      </Modal>

      <Modal
        title="Import Data Persediaan"
        open={isImportModalOpen}
        onCancel={handleImportModalClose}
        footer={[<Button key="back" onClick={handleImportModalClose}>Tutup</Button>]}
        centered
        styles={modalStyles}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Typography.Text>
            Unduh template file XLSX, isi data sesuai format, lalu unggah kembali ke sistem.
          </Typography.Text>
          <Space>
            <Tooltip title="Unduh Template">
              <Button onClick={handleDownloadTemplate} icon={<UploadOutlined />} />
            </Tooltip>
            <Upload {...uploadProps}>
              <Tooltip title="Pilih File dan Unggah">
                <Button icon={<UploadOutlined />} />
              </Tooltip>
            </Upload>
          </Space>
        </Space>
      </Modal>

      <Modal
        centered
        destroyOnHidden
        open={stockCardPreviewOpen}
        title={stockCardPreviewItem ? `Kartu Stok - ${stockCardPreviewItem.namaBarang}` : 'Kartu Stok'}
        onCancel={() => {
          setStockCardPreviewOpen(false);
          setStockCardPreviewItem(null);
        }}
        width={980}
        styles={modalStyles}
        footer={[
          <Button key="close" onClick={() => {
            setStockCardPreviewOpen(false);
            setStockCardPreviewItem(null);
          }}>
            Tutup
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            onClick={() =>
              printStockCards(stockCardPreviewRows, `Kartu Stok ${stockCardPreviewItem?.namaBarang ?? ''}`, {
                filterLabel: stockCardPreviewItem
                  ? `Barang: ${stockCardPreviewItem.namaBarang} (${stockCardPreviewItem.kodeBarang})`
                  : 'Semua data',
              })
            }
          />,
        ]}
      >
        <Table
          rowKey={(record, index) => `${record.id}-${index}`}
          columns={stockCardColumns}
          dataSource={stockCardPreviewRows}
          size="small"
          pagination={{ pageSize: 8, showSizeChanger: false }}
          scroll={{ x: 980 }}
          locale={{
            emptyText: (
              <Empty description="Belum ada transaksi untuk barang ini." image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ),
          }}
        />
      </Modal>
    </div >
  );
};

export default BmnDataPersediaan;
