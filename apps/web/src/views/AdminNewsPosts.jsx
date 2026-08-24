import { useCallback, useEffect, useMemo, useState } from "react";
import {
  App as AntdApp,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  PushpinOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import "dayjs/locale/id";
import { useAuth } from "../hooks/useAuth.js";
import "./AdminNewsPosts.css";

dayjs.locale("id");

const { TextArea } = Input;
const { Title, Paragraph } = Typography;

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Terbit" },
];

const AdminNewsPosts = () => {
  const { apiFetch } = useAuth();
  const { message, modal } = AntdApp.useApp();
  const [form] = Form.useForm();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [filters, setFilters] = useState({ search: "", status: "" });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  const fetchPosts = useCallback(
    async (page = pagination.current, pageSize = pagination.pageSize) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          per_page: String(pageSize),
        });
        if (filters.search.trim()) params.set("search", filters.search.trim());
        if (filters.status) params.set("status", filters.status);

        const res = await apiFetch(`/admin/news-posts?${params.toString()}`);
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload?.message || "Gagal memuat berita.");

        setPosts(Array.isArray(payload?.data) ? payload.data : []);
        setPagination({
          current: payload?.current_page || page,
          pageSize: payload?.per_page || pageSize,
          total: payload?.total || 0,
        });
      } catch (err) {
        message.error(err.message || "Gagal memuat berita.");
      } finally {
        setLoading(false);
      }
    },
    [apiFetch, filters.search, filters.status, message, pagination.current, pagination.pageSize],
  );

  useEffect(() => {
    fetchPosts(1, pagination.pageSize);
  }, [filters.search, filters.status]);

  const openCreate = () => {
    setEditingPost(null);
    form.resetFields();
    form.setFieldsValue({
      status: "draft",
      pinned: false,
      published_at: null,
    });
    setOpen(true);
  };

  const openEdit = (post) => {
    setEditingPost(post);
    form.setFieldsValue({
      title: post.title,
      excerpt: post.excerpt,
      body: post.body,
      status: post.status,
      pinned: Boolean(post.pinned),
      published_at: post.published_at ? dayjs(post.published_at) : null,
    });
    setOpen(true);
  };

  const savePost = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const payload = {
        ...values,
        published_at: values.published_at ? values.published_at.toISOString() : null,
      };
      const res = await apiFetch(
        editingPost ? `/admin/news-posts/${editingPost.id}` : "/admin/news-posts",
        {
          method: editingPost ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const firstError = data?.errors
          ? Object.values(data.errors).flat()[0]
          : data?.message;
        throw new Error(firstError || "Gagal menyimpan berita.");
      }
      message.success(data?.message || "Berita berhasil disimpan.");
      setOpen(false);
      fetchPosts(pagination.current, pagination.pageSize);
    } catch (err) {
      message.error(err.message || "Gagal menyimpan berita.");
    } finally {
      setSaving(false);
    }
  };

  const deletePost = (post) => {
    modal.confirm({
      title: "Hapus berita?",
      content: `Berita "${post.title}" akan dihapus permanen.`,
      okText: "Hapus",
      okButtonProps: { danger: true },
      cancelText: "Batal",
      onOk: async () => {
        const res = await apiFetch(`/admin/news-posts/${post.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Gagal menghapus berita.");
        message.success("Berita berhasil dihapus.");
        fetchPosts(pagination.current, pagination.pageSize);
      },
    });
  };

  const columns = useMemo(
    () => [
      {
        title: "Judul",
        dataIndex: "title",
        key: "title",
        render: (value, record) => (
          <div className="admin-news-title">
            <strong>{value}</strong>
            <span>{record.excerpt}</span>
          </div>
        ),
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 120,
        render: (value) => (
          <Tag color={value === "published" ? "green" : "default"}>
            {value === "published" ? "Terbit" : "Draft"}
          </Tag>
        ),
      },
      {
        title: "Prioritas",
        dataIndex: "pinned",
        key: "pinned",
        width: 120,
        render: (value) =>
          value ? (
            <Tag color="blue" icon={<PushpinOutlined />}>
              Pinned
            </Tag>
          ) : (
            "-"
          ),
      },
      {
        title: "Publikasi",
        dataIndex: "published_at",
        key: "published_at",
        width: 180,
        render: (value) => (value ? dayjs(value).format("DD MMM YYYY HH:mm") : "-"),
      },
      {
        title: "Aksi",
        key: "actions",
        width: 132,
        render: (_, record) => (
          <Space>
            <Button icon={<EditOutlined />} onClick={() => openEdit(record)} />
            <Button danger icon={<DeleteOutlined />} onClick={() => deletePost(record)} />
          </Space>
        ),
      },
    ],
    [deletePost],
  );

  return (
    <div className="admin-news-page">
      <Card className="admin-news-card">
        <div className="admin-news-header">
          <div>
            <Title level={3}>Kelola Berita</Title>
            <Paragraph>
              Tulis berita untuk ditampilkan pada Informasi Terkini di Layanan Mandiri.
            </Paragraph>
          </div>
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={() => fetchPosts()}>
              Muat Ulang
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Tulis Berita
            </Button>
          </Space>
        </div>

        <div className="admin-news-filters">
          <Input.Search
            allowClear
            placeholder="Cari judul atau isi berita"
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
            onSearch={(value) => setFilters((prev) => ({ ...prev, search: value }))}
          />
          <Select
            allowClear
            placeholder="Semua status"
            value={filters.status || undefined}
            options={STATUS_OPTIONS}
            onChange={(value) => setFilters((prev) => ({ ...prev, status: value || "" }))}
          />
        </div>

        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={posts}
          pagination={pagination}
          onChange={(nextPagination) => {
            fetchPosts(nextPagination.current, nextPagination.pageSize);
          }}
          scroll={{ x: 820 }}
        />
      </Card>

      <Modal
        title={editingPost ? "Edit Berita" : "Tulis Berita"}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={savePost}
        okText={editingPost ? "Simpan Perubahan" : "Simpan Berita"}
        confirmLoading={saving}
        width={820}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="admin-news-form">
          <Form.Item
            name="title"
            label="Judul Berita"
            rules={[{ required: true, message: "Judul wajib diisi." }]}
          >
            <Input maxLength={180} showCount placeholder="Contoh: Jadwal layanan terbaru" />
          </Form.Item>

          <Form.Item name="excerpt" label="Potongan Berita">
            <TextArea
              rows={3}
              maxLength={500}
              showCount
              placeholder="Ringkasan singkat yang tampil di halaman Layanan Mandiri."
            />
          </Form.Item>

          <Form.Item
            name="body"
            label="Isi Berita"
            rules={[{ required: true, message: "Isi berita wajib diisi." }]}
          >
            <TextArea rows={10} placeholder="Tulis isi berita lengkap di sini." />
          </Form.Item>

          <div className="admin-news-form-grid">
            <Form.Item name="status" label="Status" rules={[{ required: true }]}>
              <Select options={STATUS_OPTIONS} />
            </Form.Item>
            <Form.Item name="published_at" label="Tanggal Publikasi">
              <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="pinned" label="Berita Prioritas" valuePropName="checked">
              <Switch checkedChildren="Ya" unCheckedChildren="Tidak" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminNewsPosts;
