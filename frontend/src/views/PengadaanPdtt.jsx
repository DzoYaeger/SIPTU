import { useCallback, useEffect, useMemo, useState } from "react";
import {
  App as AntdApp,
  Button,
  Card,
  DatePicker,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  Drawer,
  Badge,
} from "antd";
import {
  DollarOutlined,
  EditOutlined,
  FileSearchOutlined,
  PlusOutlined,
  DeleteOutlined,
  InboxOutlined,
  CheckOutlined,
  UnlockOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "../hooks/useAuth.js";
import useDebounce from "../hooks/useDebounce.js";
import "./PengadaanPdtt.css";

const { Title, Text } = Typography;
// const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";
const VOLUME_OPTIONS = ["Ml", "Liter", "Buah", "Papan", "Botol", "Gram", "Kapsul"].map((v) => ({
  label: v,
  value: v,
}));

const formatCurrency = (value) => {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value));
};

const getItemVolumeSpec = (item) => {
  if (!item) return "";
  const jml = item.jumlah ?? "";
  const sat = item.satuan ?? "";
  if (jml && sat) return `${jml} ${sat}`;
  if (jml) return `${jml}`;
  if (sat) return `${sat}`;
  return "";
};

const getItemDisplayName = (item) => {
  if (!item) return "-";
  const parts = [];
  if (item.item_name) parts.push(item.item_name.trim());
  if (item.brand) parts.push(item.brand.trim());
  if (item.jumlah !== undefined && item.jumlah !== null && item.jumlah !== "") {
    parts.push(String(item.jumlah).trim());
  }
  if (item.satuan) parts.push(item.satuan.trim());
  return parts.length > 0 ? parts.join(" ") : "-";
};

export default function PengadaanPdtt() {
  const { apiFetch } = useAuth();
  const { message } = AntdApp.useApp();
  const [itemForm] = Form.useForm();
  const [priceForm] = Form.useForm();

  const [period, setPeriod] = useState(dayjs());
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState([]);
  const [reportRows, setReportRows] = useState([]);

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [priceTargetItem, setPriceTargetItem] = useState(null);

  const [proposals, setProposals] = useState([]);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [surveyPrices, setSurveyPrices] = useState({});

  const [proposalModalOpen, setProposalModalOpen] = useState(false);
  const [proposalTarget, setProposalTarget] = useState(null);

  const periodLabel = useMemo(() => period.format("YYYY-MM"), [period]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("period", periodLabel);
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      const res = await apiFetch(`/pdtt-items?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "Gagal memuat data PDTT");
      setItems(Array.isArray(data?.data) ? data.data : []);
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, message, periodLabel, debouncedSearch]);

  const fetchProposals = useCallback(async () => {
    setLoadingProposals(true);
    try {
      const res = await apiFetch('/procurement-proposals');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "Gagal memuat usulan");
      const pending = (data?.data ?? []).filter(p => p.status === 'pending');
      setProposals(pending);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingProposals(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchItems();
    fetchProposals();
  }, [fetchItems, fetchProposals]);

  const openAddModal = () => {
    setEditingItem(null);
    itemForm.resetFields();
    itemForm.setFieldsValue({
      period: period,
    });
    setItemModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    itemForm.setFieldsValue({
      item_name: item.item_name,
      brand: item.brand,
      satuan: item.satuan,
      jumlah: item.jumlah,
    });
    setItemModalOpen(true);
  };

  const openPriceModal = (item) => {
    setPriceTargetItem(item);
    priceForm.setFieldsValue({
      period: period,
      price: item.price ?? undefined,
    });
    setPriceModalOpen(true);
  };

  const openProposalModal = (proposal) => {
    setProposalTarget(proposal);
    priceForm.setFieldsValue({
      period: period,
      price: undefined,
    });
    setProposalModalOpen(true);
  };

  const submitItem = async (values) => {
    setSubmitting(true);
    try {
      if (editingItem) {
        const res = await apiFetch(`/pdtt-items/${editingItem.id}`, {
          method: "PUT",
          body: JSON.stringify({
            item_name: values.item_name,
            brand: values.brand,
            satuan: values.satuan,
            jumlah: values.jumlah,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message ?? "Gagal memperbarui data");
        message.success("Data barang berhasil diperbarui");
      } else {
        const res = await apiFetch('/pdtt-items', {
          method: "POST",
          body: JSON.stringify({
            item_name: values.item_name,
            brand: values.brand,
            satuan: values.satuan,
            jumlah: values.jumlah,
            price: values.price,
            period: values.period.format("YYYY-MM"),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message ?? "Gagal menambah data");
        message.success("Barang PDTT berhasil ditambahkan");
      }
      setItemModalOpen(false);
      setEditingItem(null);
      fetchItems();
    } catch (error) {
      message.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitPrice = async (values) => {
    if (!priceTargetItem) return;
    setSubmitting(true);
    try {
      const res = await apiFetch(`/pdtt-items/${priceTargetItem.id}/price`, {
        method: "POST",
        body: JSON.stringify({
          price: values.price,
          period: values.period.format("YYYY-MM"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "Gagal update harga");
      message.success("Harga periode berhasil disimpan");
      setPriceModalOpen(false);
      setPriceTargetItem(null);
      fetchItems();
    } catch (error) {
      message.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitProposalPrice = async (values) => {
    if (!proposalTarget) return;
    setSubmitting(true);
    try {
      const res = await apiFetch(`/procurement-proposals/${proposalTarget.id}/submit-price`, {
        method: "POST",
        body: JSON.stringify({
          price: values.price,
          period: values.period.format("YYYY-MM"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "Gagal memproses usulan");
      message.success("Usulan berhasil diproses ke Master Data");
      setProposalModalOpen(false);
      setProposalTarget(null);
      fetchProposals();
      fetchItems();
    } catch (error) {
      message.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const setSurveyPrice = (proposalId, value) => {
    setSurveyPrices((prev) => ({
      ...prev,
      [proposalId]: value == null ? null : Number(value),
    }));
  };

  const printSurveySheet = () => {
    if (!proposals.length) {
      message.warning("Belum ada usulan pegawai untuk dicetak.");
      return;
    }

    const rowsHtml = proposals
      .map((p, idx) => {
        const qtyText = `${p.jumlah ? `${p.jumlah} ` : ""}${p.satuan || "-"}`;
        const priceText = surveyPrices[p.id] != null ? formatCurrency(surveyPrices[p.id]) : "-";
        return `
          <tr>
            <td>${idx + 1}</td>
            <td>${p.item_name || "-"}</td>
            <td>${p.brand || "-"}</td>
            <td>${qtyText}</td>
            <td>${p.created_by_name || "Pegawai"}</td>
            <td style="text-align:right;">${priceText}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Survey Usulan Pengadaan PDTT</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
            h1 { margin: 0 0 8px; font-size: 18px; }
            .meta { margin-bottom: 16px; color: #4b5563; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; vertical-align: top; }
            th { background: #f3f4f6; text-align: left; }
          </style>
        </head>
        <body>
          <h1>Survey Usulan Pengadaan PDTT</h1>
          <div class="meta">Periode: ${periodLabel} | Dicetak: ${dayjs().format("DD MMMM YYYY HH:mm")}</div>
          <table>
            <thead>
              <tr>
                <th style="width:32px;">No</th>
                <th>Nama Barang</th>
                <th style="width:160px;">Merek</th>
                <th style="width:120px;">Jumlah & Satuan</th>
                <th style="width:140px;">Pengusul</th>
                <th style="width:150px; text-align:right;">Harga Survey Manual</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      message.error("Popup diblokir. Izinkan popup untuk mencetak.");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const deleteItem = async (id) => {
    try {
      const res = await apiFetch(`/pdtt-items/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "Gagal menghapus barang");
      message.success("Barang PDTT berhasil dihapus");
      fetchItems();
    } catch (error) {
      message.error(error.message);
    }
  };

  const pullReport = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/pdtt-items/report?period=${periodLabel}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "Gagal menarik laporan");
      setReportRows(Array.isArray(data?.data) ? data.data : []);
      setReportModalOpen(true);
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleRequestable = async (id, currentStatus) => {
    try {
      const res = await apiFetch(`/pdtt-items/${id}/toggle-requestable`, {
        method: "POST",
        body: JSON.stringify({
          is_requestable: !currentStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "Gagal mengubah status pengajuan");
      message.success("Status barang berhasil diubah");
      fetchItems();
    } catch (error) {
      message.error(error.message);
    }
  };

  const columns = [
    {
      title: "Nama Barang & Ukuran",
      key: "item_name_spec",
      render: (_, r) => <Text strong>{getItemDisplayName(r)}</Text>,
    },
    {
      title: "Merek",
      dataIndex: "brand",
      key: "brand",
      width: 180,
      render: (v) => v || "-",
    },
    {
      title: "Ukuran / Isi Kemasan",
      key: "item_spec",
      width: 180,
      render: (_, r) => <Tag color="cyan" style={{ fontWeight: 600 }}>{getItemVolumeSpec(r) || "-"}</Tag>,
    },
    {
      title: `Harga (${periodLabel})`,
      dataIndex: "price",
      key: "price",
      width: 200,
      render: (v, r) => (
        <Space direction="vertical" size={2}>
          <Text strong>{formatCurrency(v)}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Berlaku: {r.price_period || "-"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Izin Pengajuan",
      key: "is_requestable",
      width: 140,
      align: "center",
      render: (_, record) => (
        <Tooltip title={record.is_requestable ? "Nonaktifkan dari layanan mandiri" : "Izinkan pegawai mengajukan barang ini"}>
          <Button
            type={record.is_requestable ? "primary" : "default"}
            icon={record.is_requestable ? <CheckOutlined /> : <UnlockOutlined />}
            onClick={() => toggleRequestable(record.id, record.is_requestable)}
            style={{ borderRadius: 4 }}
          >
            {record.is_requestable ? "Aktif" : "Buka"}
          </Button>
        </Tooltip>
      ),
    },
    {
      title: "Aksi",
      key: "action",
      width: 80,
      fixed: "right",
      align: "center",
      render: (_, record) => {
        const items = [
          {
            key: "edit",
            label: "Edit Barang",
            icon: <EditOutlined />,
            onClick: () => openEditModal(record),
          },
          {
            key: "price",
            label: "Update Harga Periode",
            icon: <DollarOutlined />,
            onClick: () => openPriceModal(record),
          },
          {
            key: "delete",
            label: <span style={{ color: "#ff4d4f" }}>Hapus Barang</span>,
            icon: <DeleteOutlined style={{ color: "#ff4d4f" }} />,
            onClick: () => {
              Modal.confirm({
                title: "Hapus Barang",
                content: "Yakin ingin menghapus barang ini?",
                okText: "Ya",
                cancelText: "Batal",
                okButtonProps: { danger: true },
                onOk: () => deleteItem(record.id),
              });
            },
          },
        ];

        return (
          <Dropdown
            menu={{ items }}
            trigger={["click"]}
            placement="bottomRight"
          >
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
    },
  ];

  const proposalColumns = [
    { title: "Nama Barang & Ukuran", key: "item_name", render: (_, r) => `${r.item_name || "-"}${r.satuan ? ` (${r.satuan})` : ""}` },
    { title: "Merek", dataIndex: "brand", key: "brand", render: v => v || "-" },
    { title: "Jumlah Permintaan", key: "jml", render: (_, r) => `${r.jumlah ? `${r.jumlah} buah` : "-"}` },
    { title: "Pengusul", dataIndex: "created_by_name", key: "created_by", render: v => v || "Pegawai" },
    {
      title: "Harga Survey Manual",
      key: "survey_price",
      width: 200,
      render: (_, r) => (
        <InputNumber
          min={0}
          value={surveyPrices[r.id] ?? null}
          onChange={(value) => setSurveyPrice(r.id, value)}
          placeholder="Input harga"
          style={{ width: "100%" }}
          formatter={(val) =>
            val ? `Rp ${String(val).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}` : ""
          }
          parser={(val) => (val ? Number(val.replace(/[^0-9]/g, "")) : null)}
        />
      ),
    },
    {
      title: "Aksi",
      key: "action",
      width: 80,
      align: "center",
      render: (_, r) => {
        const items = [
          {
            key: "process",
            label: "Proses Harga",
            icon: <CheckOutlined />,
            onClick: () => openProposalModal(r),
          },
        ];

        return (
          <Dropdown
            menu={{ items }}
            trigger={["click"]}
            placement="bottomRight"
          >
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
    }
  ];

  return (
    <div className="module-section">
      <div className="module-toolbar">
        <div>
          <Title level={4} className="module-title">
            Pengadaan PDTT
          </Title>
          <Text className="module-subtitle">
            Kelola master barang PDTT dan riwayat harga per periode agar laporan
            tetap konsisten secara historis.
          </Text>
        </div>
      </div>

      <Card className="content-card">
        <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
          <Space wrap>
            <DatePicker
              picker="month"
              value={period}
              onChange={(val) => setPeriod(val || dayjs())}
              allowClear={false}
            />
            <Input.Search
              placeholder="Cari nama barang / merek / volume"
              allowClear
              style={{ width: 280 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onSearch={fetchItems}
            />
            <Button onClick={fetchItems}>Refresh</Button>
            <Button icon={<FileSearchOutlined />} onClick={pullReport}>
              Tarik Laporan Periode
            </Button>
          </Space>
          <Space>
            <Badge count={proposals.length}>
              <Button
                icon={<InboxOutlined />}
                onClick={() => setDrawerOpen(true)}
              >
                Usulan Pegawai
              </Button>
            </Badge>
            <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
              Tambah Barang
            </Button>
          </Space>
        </Space>
        <div className="pdtt-helper-line">
          <Tag color="blue">Periode aktif: {periodLabel}</Tag>
          <Text type="secondary">
            Harga pada tabel mengikuti snapshot periode yang dipilih.
          </Text>
        </div>
      </Card>

      <div className="table-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="table-helper" style={{ margin: 0 }}>Master data pengadaan PDTT per periode harga</div>
        </div>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={items}
          scroll={{ x: 980 }}
          pagination={{ pageSize: 10 }}
        />
      </div>

      <Modal
        open={itemModalOpen}
        onCancel={() => setItemModalOpen(false)}
        title={editingItem ? "Edit Barang PDTT" : "Tambah Barang PDTT"}
        footer={null}
        destroyOnClose
      >
        <Form form={itemForm} layout="vertical" requiredMark={false} onFinish={submitItem} className="module-form">
          <Form.Item
            name="item_name"
            label="Nama Barang"
            rules={[{ required: true, message: "Nama barang wajib diisi" }]}
          >
            <Input placeholder="Contoh: Kertas A4 80gr" />
          </Form.Item>
          <Form.Item name="brand" label="Merek">
            <Input placeholder="Contoh: Sidu / Double A" />
          </Form.Item>
          <Space align="start" size="middle" style={{ display: 'flex', width: '100%' }}>
            <Form.Item name="jumlah" label="Jumlah" style={{ flex: 1 }}>
              <InputNumber min={1} placeholder="Contoh: 1" style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="satuan" label="Satuan" style={{ flex: 1 }}>
              <Select
                placeholder="Pilih satuan"
                options={VOLUME_OPTIONS}
                allowClear
              />
            </Form.Item>
          </Space>
          {!editingItem ? (
            <>
              <Form.Item
                name="period"
                label="Periode Harga Awal"
                rules={[{ required: true, message: "Periode wajib diisi" }]}
              >
                <DatePicker picker="month" style={{ width: "100%" }} allowClear={false} />
              </Form.Item>
              <Form.Item
                name="price"
                label="Harga"
                rules={[{ required: true, message: "Harga wajib diisi" }]}
              >
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  placeholder="Masukkan harga"
                  formatter={(val) =>
                    val ? `Rp ${String(val).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}` : ""
                  }
                  parser={(val) => (val ? Number(val.replace(/[^0-9]/g, "")) : 0)}
                />
              </Form.Item>
            </>
          ) : null}
          <Button htmlType="submit" type="primary" loading={submitting}>
            {editingItem ? "Simpan Perubahan" : "Simpan Barang"}
          </Button>
        </Form>
      </Modal>

      <Modal
        open={priceModalOpen}
        onCancel={() => setPriceModalOpen(false)}
        title={`Update Harga - ${priceTargetItem?.item_name || ""}`}
        footer={null}
        destroyOnClose
      >
        <Form
          form={priceForm}
          layout="vertical"
          requiredMark={false}
          onFinish={submitPrice}
          className="module-form"
        >
          <Form.Item
            name="period"
            label="Periode"
            rules={[{ required: true, message: "Periode wajib dipilih" }]}
          >
            <DatePicker picker="month" style={{ width: "100%" }} allowClear={false} />
          </Form.Item>
          <Form.Item
            name="price"
            label="Harga Periode"
            rules={[{ required: true, message: "Harga wajib diisi" }]}
          >
            <InputNumber
              min={0}
              style={{ width: "100%" }}
              placeholder="Masukkan harga periode"
              formatter={(val) =>
                val ? `Rp ${String(val).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}` : ""
              }
              parser={(val) => (val ? Number(val.replace(/[^0-9]/g, "")) : 0)}
            />
          </Form.Item>
          <Button htmlType="submit" type="primary" loading={submitting}>
            Simpan Harga
          </Button>
        </Form>
      </Modal>

      <Modal
        open={reportModalOpen}
        onCancel={() => setReportModalOpen(false)}
        title={`Laporan Pengadaan PDTT Periode ${periodLabel}`}
        footer={null}
        width={920}
      >
        <div className="table-card" style={{ margin: 0 }}>
          <Table
            rowKey="id"
            columns={[
              { title: "Nama Barang & Ukuran", key: "item_name", render: (_, r) => `${r.item_name || "-"}${r.satuan ? ` (${r.satuan})` : ""}` },
              { title: "Merek", dataIndex: "brand", key: "brand", render: (v) => v || "-" },
              { title: "Jumlah Permintaan", key: "jumlah_satuan", render: (_, r) => `${r.jumlah ? `${r.jumlah} buah` : "-"}` },
              {
                title: "Harga Periode",
                dataIndex: "price",
                key: "price",
                render: (v) => formatCurrency(v),
              },
              {
                title: "Sumber Harga",
                dataIndex: "price_period",
                key: "price_period",
                render: (v) => <Tag color="geekblue">{v || "-"}</Tag>,
              },
            ]}
            dataSource={reportRows}
            pagination={false}
            scroll={{ x: 760 }}
            size="small"
          />
        </div>
      </Modal>

      <Drawer
        title="Daftar Usulan Pegawai (Pending)"
        placement="right"
        width={700}
        extra={
          <Button icon={<FileSearchOutlined />} onClick={printSurveySheet}>
            Cetak Survey
          </Button>
        }
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
      >
        <Table
          rowKey="id"
          loading={loadingProposals}
          columns={proposalColumns}
          dataSource={proposals}
          pagination={{ pageSize: 15 }}
          size="small"
        />
      </Drawer>

      <Modal
        open={proposalModalOpen}
        onCancel={() => setProposalModalOpen(false)}
        title={`Proses Usulan - ${proposalTarget?.item_name || ""}`}
        footer={null}
        destroyOnClose
      >
        <Form
          form={priceForm}
          layout="vertical"
          requiredMark={false}
          onFinish={submitProposalPrice}
          className="module-form"
        >
          <Form.Item
            name="period"
            label="Periode"
            rules={[{ required: true, message: "Periode wajib dipilih" }]}
          >
            <DatePicker picker="month" style={{ width: "100%" }} allowClear={false} />
          </Form.Item>
          <Form.Item
            name="price"
            label="Harga Periode"
            rules={[{ required: true, message: "Harga wajib diisi" }]}
          >
            <InputNumber
              min={0}
              style={{ width: "100%" }}
              placeholder="Masukkan harga periode untuk master data"
              formatter={(val) =>
                val ? `Rp ${String(val).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}` : ""
              }
              parser={(val) => (val ? Number(val.replace(/[^0-9]/g, "")) : 0)}
            />
          </Form.Item>
          <Button htmlType="submit" type="primary" loading={submitting}>
            Proses ke Master Data
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
