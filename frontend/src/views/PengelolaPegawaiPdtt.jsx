import { useEffect, useState, useCallback } from "react";
import {
    App as AntdApp,
    Button,
    Card,
    Dropdown,
    Form,
    Modal,
    Select,
    Space,
    Table,
    Typography,
    Tag,
    Tooltip,
    InputNumber,
    Switch,
    DatePicker,
} from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, MoreOutlined, MinusCircleOutlined } from "@ant-design/icons";
import { useAuth } from "../hooks/useAuth.js";
import dayjs from "dayjs";

const { Title, Text } = Typography;
// const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

export default function PengelolaPegawaiPdtt() {
    const { apiFetch } = useAuth();
    const { message } = AntdApp.useApp();
    const [form] = Form.useForm();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [allUsers, setAllUsers] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [editForm] = Form.useForm();
    const [serviceEnabled, setServiceEnabled] = useState(true);
    const [serviceLoading, setServiceLoading] = useState(false);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/pdtt-authorized-users');
            if (!res.ok) throw new Error("Gagal memuat daftar pegawai berhak");
            const data = await res.json();
            setUsers(data?.data || []);
            if (typeof data?.service_config?.pdtt_service_enabled === "boolean") {
                setServiceEnabled(data.service_config.pdtt_service_enabled);
            }
        } catch (error) {
            message.error(error.message);
        } finally {
            setLoading(false);
        }
    }, [apiFetch, message]);

    const fetchAllUsers = useCallback(async () => {
        try {
            const res = await apiFetch('/admin/users');
            if (res.ok) {
                const data = await res.json();
                setAllUsers(data?.data || []);
            }
        } catch (e) {
            console.error(e);
        }
    }, [apiFetch]);

    useEffect(() => {
        fetchUsers();
        fetchAllUsers();
    }, [fetchUsers, fetchAllUsers]);

    const toggleService = async (checked) => {
        setServiceLoading(true);
        try {
            const res = await apiFetch('/pdtt-service-config', {
                method: "PUT",
                body: JSON.stringify({ pdtt_service_enabled: checked }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || "Gagal memperbarui status layanan");
            setServiceEnabled(Boolean(data?.pdtt_service_enabled));
            message.success(`Layanan Pengusulan PDTT ${checked ? "diaktifkan" : "dinonaktifkan"}`);
        } catch (error) {
            message.error(error.message);
        } finally {
            setServiceLoading(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            const res = await apiFetch(`/pdtt-authorized-users/${id}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Gagal menghapus pegawai");
            message.success("Pegawai berhasil ditarik hak aksesnya");
            fetchUsers();
        } catch (error) {
            message.error(error.message);
        }
    };

    const submitForm = async (values) => {
        setSubmitting(true);
        try {
            const periods = {};
            (values.period_allocations || []).forEach((item) => {
                if (item && item.period && item.jumlah_hari !== undefined) {
                    const formattedPeriod = item.period.format("YYYY-MM");
                    periods[formattedPeriod] = item.jumlah_hari;
                }
            });
            const payload = {
                user_id: values.user_id,
                jumlah_hari: values.jumlah_hari,
                periods: periods,
            };
            const res = await apiFetch('/pdtt-authorized-users', {
                method: "POST",
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || "Gagal menambahkan pegawai");
            message.success("Pegawai berhasil ditambahkan ke daftar berhak");
            setModalOpen(false);
            form.resetFields();
            fetchUsers();
        } catch (error) {
            message.error(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const openEdit = (record) => {
        setEditingUser(record);
        const periodsObj = record.periods || {};
        const periodAllocations = Object.keys(periodsObj).map((key) => ({
            period: dayjs(key, "YYYY-MM"),
            jumlah_hari: periodsObj[key],
        }));
        editForm.setFieldsValue({
            jumlah_hari: record.jumlah_hari,
            period_allocations: periodAllocations,
        });
        setEditModalOpen(true);
    };

    const submitEdit = async (values) => {
        setSubmitting(true);
        try {
            const periods = {};
            (values.period_allocations || []).forEach((item) => {
                if (item && item.period && item.jumlah_hari !== undefined) {
                    const formattedPeriod = item.period.format("YYYY-MM");
                    periods[formattedPeriod] = item.jumlah_hari;
                }
            });
            const payload = {
                jumlah_hari: values.jumlah_hari,
                periods: periods,
            };
            const res = await apiFetch(`/pdtt-authorized-users/${editingUser.id}`, {
                method: "PUT",
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || "Gagal memperbarui pegawai");
            message.success("Pengaturan pegawai berhasil diperbarui");
            setEditModalOpen(false);
            fetchUsers();
        } catch (error) {
            message.error(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const formatCurrency = (value) => {
        if (value === null || value === undefined) return "-";
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0,
        }).format(Number(value));
    };

    const columns = [
        {
            title: "Nama Pegawai",
            dataIndex: "name",
            key: "name",
        },
        {
            title: "Email",
            dataIndex: "email",
            key: "email",
        },
        {
            title: "Hak Akses Base",
            dataIndex: "role",
            key: "role",
            render: (role) => <Tag color={role === "admin" ? "blue" : "default"}>{role || "user"}</Tag>,
        },
        {
            title: "Hari Bawaan",
            dataIndex: "jumlah_hari",
            key: "jumlah_hari",
            width: 120,
        },
        {
            title: "Alokasi Periode",
            key: "periods",
            render: (_, record) => {
                const periods = record.periods || {};
                const keys = Object.keys(periods).sort();
                if (keys.length === 0) {
                    return <Text type="secondary">-</Text>;
                }
                return (
                    <Space size={[0, 4]} wrap>
                        {keys.map((p) => (
                            <Tag color="blue" key={p}>
                                {dayjs(p, "YYYY-MM").format("MMMM YYYY")}: <strong>{periods[p]} Hari</strong>
                            </Tag>
                        ))}
                    </Space>
                );
            }
        },
        {
            title: "Saldo Bawaan (Rp)",
            key: "saldo",
            width: 150,
            render: (_, record) => <Text strong>{formatCurrency(record.saldo)}</Text>,
        },
        {
            title: "Aksi",
            key: "action",
            width: 80,
            align: "center",
            render: (_, record) => {
                const items = [
                    {
                        key: "edit",
                        label: "Edit Hari",
                        icon: <EditOutlined />,
                        onClick: () => openEdit(record),
                    },
                    {
                        key: "delete",
                        label: <span style={{ color: "#ff4d4f" }}>Cabut Hak Akses</span>,
                        icon: <DeleteOutlined style={{ color: "#ff4d4f" }} />,
                        onClick: () => {
                            Modal.confirm({
                                title: "Cabut Hak Akses",
                                content: "Yakin mencabut hak pengajuan PDTT pegawai ini?",
                                okText: "Ya",
                                cancelText: "Batal",
                                okButtonProps: { danger: true },
                                onOk: () => handleDelete(record.id),
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

    const eligibleUsers = allUsers.filter(
        (u) => !users.some((auth) => auth.user_id === u.id)
    );

    return (
        <div className="module-section">
            <div className="module-toolbar">
                <div>
                    <Title level={3} className="module-title">
                        Pengelola Pengajuan PDTT
                    </Title>
                    <Text className="module-subtitle">
                        Atur daftar pegawai yang diizinkan untuk membuat Pengajuan PDTT melalui Layanan Mandiri.
                    </Text>
                </div>
                <Space>
                    <Space align="center">
                        <Text type="secondary">Pengusulan Layanan Pengadaan PDTT</Text>
                        <Switch
                            checked={serviceEnabled}
                            loading={serviceLoading}
                            onChange={toggleService}
                            checkedChildren="ON"
                            unCheckedChildren="OFF"
                        />
                    </Space>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setModalOpen(true)}
                    >
                        Tambah Pegawai
                    </Button>
                </Space>
            </div>

            <Card className="table-card" style={{ padding: 0 }}>
                <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={users}
                    loading={loading}
                    pagination={{ pageSize: 15 }}
                />
            </Card>

            <Modal
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                title="Tambahkan Pegawai Berhak"
                footer={null}
                destroyOnClose
            >
                <Form form={form} layout="vertical" requiredMark={false} onFinish={submitForm} className="module-form">
                    <Form.Item
                        name="user_id"
                        label="Pilih Pegawai"
                        rules={[{ required: true, message: "Pilih pegawai terlebih dahulu" }]}
                    >
                        <Select
                            showSearch
                            placeholder="Cari nama pegawai"
                            optionFilterProp="children"
                            filterOption={(input, option) =>
                                (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                            }
                            options={eligibleUsers.map((u) => ({
                                value: u.id,
                                label: `${u.name} (${u.email})`,
                            }))}
                        />
                    </Form.Item>
                    <Form.Item
                        name="jumlah_hari"
                        label="Alokasi Jumlah Hari Bawaan"
                        rules={[{ required: true, message: "Masukkan jumlah hari bawaan" }]}
                        initialValue={0}
                        extra="Nilai bawaan jika tidak ada alokasi khusus bulanan. Satu hari akan dikalikan dengan 19.000 untuk menjadi saldo PDTT"
                    >
                        <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item label="Alokasi Khusus Bulanan / Periode (Opsional)">
                        <Form.List name="period_allocations">
                            {(fields, { add, remove }) => (
                                <>
                                    {fields.map(({ key, name, ...restField }) => (
                                        <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                            <Form.Item
                                                {...restField}
                                                name={[name, 'period']}
                                                rules={[{ required: true, message: 'Pilih bulan' }]}
                                            >
                                                <DatePicker picker="month" format="MMMM YYYY" placeholder="Pilih Bulan" style={{ width: 180 }} />
                                            </Form.Item>
                                            <Form.Item
                                                {...restField}
                                                name={[name, 'jumlah_hari']}
                                                rules={[{ required: true, message: 'Masukkan hari' }]}
                                            >
                                                <InputNumber min={0} placeholder="Hari" style={{ width: 120 }} />
                                            </Form.Item>
                                            <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f', fontSize: 16, cursor: 'pointer' }} />
                                        </Space>
                                    ))}
                                    <Form.Item>
                                        <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                            Tambah Alokasi Periode
                                        </Button>
                                    </Form.Item>
                                </>
                            )}
                        </Form.List>
                    </Form.Item>
                    <Button type="primary" htmlType="submit" loading={submitting} block>
                        Tambahkan
                    </Button>
                </Form>
            </Modal>

            <Modal
                open={editModalOpen}
                onCancel={() => setEditModalOpen(false)}
                title="Edit Alokasi Hari"
                footer={null}
                destroyOnClose
            >
                <Form form={editForm} layout="vertical" requiredMark={false} onFinish={submitEdit}>
                    <Form.Item
                        name="jumlah_hari"
                        label="Alokasi Jumlah Hari Bawaan"
                        rules={[{ required: true, message: "Masukkan jumlah hari bawaan" }]}
                        extra="Nilai bawaan jika tidak ada alokasi khusus bulanan. Satu hari akan dikalikan dengan 19.000 untuk menjadi saldo PDTT"
                    >
                        <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item label="Alokasi Khusus Bulanan / Periode (Opsional)">
                        <Form.List name="period_allocations">
                            {(fields, { add, remove }) => (
                                <>
                                    {fields.map(({ key, name, ...restField }) => (
                                        <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                            <Form.Item
                                                {...restField}
                                                name={[name, 'period']}
                                                rules={[{ required: true, message: 'Pilih bulan' }]}
                                            >
                                                <DatePicker picker="month" format="MMMM YYYY" placeholder="Pilih Bulan" style={{ width: 180 }} />
                                            </Form.Item>
                                            <Form.Item
                                                {...restField}
                                                name={[name, 'jumlah_hari']}
                                                rules={[{ required: true, message: 'Masukkan hari' }]}
                                            >
                                                <InputNumber min={0} placeholder="Hari" style={{ width: 120 }} />
                                            </Form.Item>
                                            <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f', fontSize: 16, cursor: 'pointer' }} />
                                        </Space>
                                    ))}
                                    <Form.Item>
                                        <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                            Tambah Alokasi Periode
                                        </Button>
                                    </Form.Item>
                                </>
                            )}
                        </Form.List>
                    </Form.Item>
                    <Button type="primary" htmlType="submit" loading={submitting} block>
                        Simpan Perubahan
                    </Button>
                </Form>
            </Modal>
        </div>
    );
}
