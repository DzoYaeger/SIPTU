import { useCallback, useEffect, useMemo, useState } from "react";
import {
    App as AntdApp,
    Button,
    Table,
    Tag,
    Typography,
    Alert,
    Card,
    InputNumber,
    Space,
} from "antd";
import {
    ArrowLeftOutlined,
    CheckOutlined,
    DeleteOutlined,
    EditOutlined,
    SendOutlined,
} from "@ant-design/icons";
import { useAuth } from "../hooks/useAuth.js";
import dayjs from "dayjs";
import "dayjs/locale/id";

dayjs.locale("id");

const { Title, Text } = Typography;
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

export default function PengajuanPdttForm() {
    const { apiFetch, token } = useAuth();
    const { message } = AntdApp.useApp();

    const [pdttItems, setPdttItems] = useState([]);
    const [pdttLoading, setPdttLoading] = useState(false);
    const [pdttSubmitting, setPdttSubmitting] = useState(false);
    const [periodStr, setPeriodStr] = useState("");
    const [selectedPdttKeys, setSelectedPdttKeys] = useState([]);
    const [quantities, setQuantities] = useState({});
    const [confirmedQuantities, setConfirmedQuantities] = useState({});
    const [canAccessPdtt, setCanAccessPdtt] = useState(true);
    const [saldo, setSaldo] = useState(0);
    const [jumlahHari, setJumlahHari] = useState(0);
    const [existingRequest, setExistingRequest] = useState(null);

    const applyExistingRequest = useCallback((requestData, availableItems = []) => {
        const availableIds = new Set(availableItems.map((it) => it.id));
        const nextKeys = [];
        const nextQty = {};
        const nextConfirmed = {};

        (requestData?.items || []).forEach((it) => {
            const itemId = it?.pdtt_item_id ?? it?.pdtt_item?.id;
            if (!itemId || !availableIds.has(itemId)) return;
            nextKeys.push(itemId);
            nextQty[itemId] = Number(it.jumlah || 1);
            nextConfirmed[itemId] = true;
        });

        setSelectedPdttKeys(nextKeys);
        setQuantities(nextQty);
        setConfirmedQuantities(nextConfirmed);
    }, []);

    const fetchPdttItems = useCallback(async () => {
        if (!token) return;
        setPdttLoading(true);
        setCanAccessPdtt(true);
        try {
            const res = await apiFetch(`${API_URL}/pdtt-items/requestable`);
            const data = await res.json();
            if (!res.ok) {
                if (res.status === 403) setCanAccessPdtt(false);
                throw new Error(data?.message ?? "Gagal memuat daftar barang.");
            }
            const availableItems = data?.data || [];
            const activePeriod = data?.meta?.period || dayjs().format("YYYY-MM");

            setPdttItems(availableItems);
            setPeriodStr(activePeriod);
            setSaldo(data?.meta?.saldo || 0);
            setJumlahHari(data?.meta?.jumlah_hari || 0);

            const reqRes = await apiFetch(`${API_URL}/procurement-requests`);
            const reqData = await reqRes.json();
            if (!reqRes.ok) {
                throw new Error(reqData?.message ?? "Gagal memuat pengajuan sebelumnya.");
            }

            const myRequests = reqData?.data || [];
            const currentPeriodRequest = myRequests.find((r) => r.period === activePeriod) || null;
            setExistingRequest(currentPeriodRequest);
            if (currentPeriodRequest) {
                applyExistingRequest(currentPeriodRequest, availableItems);
            } else {
                setSelectedPdttKeys([]);
                setQuantities({});
                setConfirmedQuantities({});
            }
        } catch (error) {
            if (error.message !== "Anda tidak memiliki hak akses untuk halaman ini." && error.message !== "Unauthorized. Access Denied.") {
                message.warning(error.message);
            }
        } finally {
            setPdttLoading(false);
        }
    }, [apiFetch, message, token]);

    useEffect(() => {
        fetchPdttItems();
    }, [fetchPdttItems]);

    const handleQuantityChange = (id, val) => {
        setQuantities((prev) => ({ ...prev, [id]: val }));
    };

    const handleConfirmQuantity = (id) => {
        const qty = Number(quantities[id] || 1);
        if (!qty || qty < 1) {
            message.warning("Jumlah minimal 1.");
            return;
        }
        setConfirmedQuantities((prev) => ({ ...prev, [id]: true }));
    };

    const handleEditQuantity = (id) => {
        setConfirmedQuantities((prev) => ({ ...prev, [id]: false }));
    };

    const handleResetItem = (id) => {
        setQuantities((prev) => ({ ...prev, [id]: 0 }));
        setSelectedPdttKeys((prev) => prev.filter((key) => key !== id));
        setConfirmedQuantities((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
        message.success("Item dihapus dari pengajuan.");
    };

    const handleSelectionChange = (keys) => {
        setSelectedPdttKeys(keys);
        setQuantities((prev) => {
            const next = {};
            keys.forEach((id) => {
                next[id] = Number(prev[id] || 1);
            });
            return next;
        });
        setConfirmedQuantities((prev) => {
            const next = {};
            keys.forEach((id) => {
                if (prev[id]) next[id] = true;
            });
            return next;
        });
    };

    const selectedItemsData = useMemo(() => {
        return pdttItems.filter((item) => selectedPdttKeys.includes(item.id) && confirmedQuantities[item.id]);
    }, [pdttItems, selectedPdttKeys, confirmedQuantities]);

    const selectedConfirmedKeys = useMemo(
        () => selectedPdttKeys.filter((id) => confirmedQuantities[id]),
        [selectedPdttKeys, confirmedQuantities]
    );

    const totalPrice = useMemo(() => {
        return selectedItemsData.reduce((acc, item) => {
            const qty = quantities[item.id] || 1;
            const price = item.price || 0;
            return acc + (qty * price);
        }, 0);
    }, [selectedItemsData, quantities]);
    const remainingSaldo = saldo - totalPrice;

    const handlePdttSubmit = async () => {
        if (selectedConfirmedKeys.length === 0) {
            message.warning("Pilih dan konfirmasi (centang) setidaknya satu barang untuk diajukan!");
            return;
        }
        if (selectedConfirmedKeys.length < selectedPdttKeys.length) {
            message.warning("Masih ada barang yang belum dikonfirmasi centang. Konfirmasi dulu sebelum kirim.");
            return;
        }

        setPdttSubmitting(true);
        try {
            const itemsPayload = selectedConfirmedKeys.map((id) => ({
                item_id: id,
                jumlah: quantities[id] || 1,
            }));

            const res = await apiFetch(`${API_URL}/procurement-requests`, {
                method: "POST",
                body: JSON.stringify({
                    period: periodStr,
                    items: itemsPayload,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message ?? "Gagal mengirim pengajuan");

            message.success(data?.message || "Pengajuan PDTT berhasil dikirim!");
            if (data?.data) {
                setExistingRequest(data.data);
                applyExistingRequest(data.data, pdttItems);
            }
        } catch (error) {
            message.error(error.message);
        } finally {
            setPdttSubmitting(false);
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

    const pdttColumns = [
        {
            title: "Nama Barang",
            dataIndex: "item_name",
            key: "item_name",
        },
        {
            title: "Merek",
            dataIndex: "brand",
            key: "brand",
            render: (v) => v || "-",
        },
        {
            title: "Kuantitas Master",
            key: "satuan",
            render: (_, r) => <span>{r.jumlah ? `${r.jumlah} ` : ""}{r.satuan || "-"}</span>,
        },
        {
            title: "Harga Satuan Estimasi",
            key: "price",
            render: (_, r) => <Text strong>{formatCurrency(r.price)}</Text>,
        },
        {
            title: "Kuantitas Diajukan",
            key: "qty_request",
            render: (_, r) => {
                const isSelected = selectedPdttKeys.includes(r.id);
                if (!isSelected) return <Text type="secondary" style={{ fontSize: 12 }}>Centang baris terlebih dahulu</Text>;
                const isConfirmed = Boolean(confirmedQuantities[r.id]);
                const qty = quantities[r.id] || 1;

                if (isConfirmed) {
                    return (
                        <Space>
                            <Tag color="success" style={{ marginInlineEnd: 0 }}>
                                <CheckOutlined /> {qty}
                            </Tag>
                            <Button
                                type="link"
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => handleEditQuantity(r.id)}
                            >
                                Edit
                            </Button>
                            <Button
                                type="link"
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => handleResetItem(r.id)}
                            >
                                Hapus
                            </Button>
                        </Space>
                    );
                }

                return (
                    <Space>
                        <InputNumber
                            min={1}
                            value={qty}
                            onChange={(val) => handleQuantityChange(r.id, val)}
                            style={{ width: 80 }}
                        />
                        <Button
                            type="text"
                            size="small"
                            icon={<CheckOutlined />}
                            onClick={() => handleConfirmQuantity(r.id)}
                        />
                        <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => handleResetItem(r.id)}
                        />
                    </Space>
                );
            },
        },
        {
            title: "Subtotal",
            key: "subtotal",
            render: (_, r) => {
                const isSelected = selectedPdttKeys.includes(r.id);
                if (!isSelected) return "-";
                if (!confirmedQuantities[r.id]) return <Text type="secondary" style={{ fontSize: 12 }}>Konfirmasi dulu</Text>;
                const qty = quantities[r.id] || 1;
                const subtotal = qty * (r.price || 0);
                return <Text strong>{formatCurrency(subtotal)}</Text>;
            },
        },
    ];

    if (!canAccessPdtt) {
        return (
            <div style={{ padding: 40, background: "#f8fafc", minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
                <Card style={{ maxWidth: 500, width: "100%", textAlign: "center", borderRadius: 12 }}>
                    <Alert
                        message="Akses Ditolak"
                        description="Anda tidak memiliki hak akses untuk mengajukan pengadaan PDTT. Hubungi Pengelola Pegawai PDTT jika Anda seharusnya memiliki akses."
                        type="error"
                        showIcon
                        style={{ marginBottom: 24, textAlign: "left" }}
                    />
                    <Button type="primary" onClick={() => window.history.back()}>Kembali</Button>
                </Card>
            </div>
        );
    }

    return (
        <div style={{ padding: '24px', background: "#f8fafc", minHeight: "100vh" }}>
            <div style={{ marginBottom: 16 }}>
                <Button type="text" icon={<ArrowLeftOutlined />} href="/app/layanan-mandiri" style={{ padding: '4px 0', color: '#64748b', fontWeight: 500 }}>Kembali</Button>
            </div>
            <div style={{ marginBottom: 24 }}>
                <Title level={3} style={{ margin: 0, color: "#1e293b", fontWeight: 600 }}>
                    Pengajuan Pengadaan PDTT
                </Title>
                <Text style={{ color: "#64748b" }}>
                    Pilih barang dari katalog harga yang telah dibuka oleh Admin, sesuaikan jumlahnya dengan saldo hari Anda.
                </Text>
            </div>

            <div style={{ background: '#fff', borderRadius: 8, padding: '24px' }}>
                <Space direction="vertical" size="large" style={{ width: "100%" }}>
                    <Alert
                        message="Pembuatan Pengajuan PDTT"
                        description="Pilih barang-barang di bawah ini yang akan Anda ajukan ke PPK/Admin. Harga dan Kuantitas di bawah ini merupakan referensi Master yang sudah ditetapkan untuk periode ini."
                        type="info"
                        showIcon
                    />

                    <Card className="public-card shadow-sm" styles={{ body: { padding: 0 } }}>
                        <div style={{ padding: 16, borderBottom: '1px solid #f0f0f0' }}>
                            <Text type="secondary">Periode Pengadaan Aktif: </Text>
                            <Tag color="blue" style={{ marginLeft: 8 }}>{periodStr ? dayjs(periodStr).format("MMMM YYYY") : "-"}</Tag>
                            {existingRequest && (
                                <Tag color="gold" style={{ marginLeft: 8 }}>
                                    Data pengajuan tersimpan: {dayjs(existingRequest.updated_at || existingRequest.created_at).format("DD MMM YYYY HH:mm")}
                                </Tag>
                            )}
                        </div>

                        <Table
                            rowKey="id"
                            rowSelection={{
                                selectedRowKeys: selectedPdttKeys,
                                onChange: handleSelectionChange,
                            }}
                            columns={pdttColumns}
                            dataSource={pdttItems}
                            loading={pdttLoading}
                            pagination={false}
                            scroll={{ x: 800 }}
                            size="middle"
                        />
                    </Card>

                    <Card className="public-card shadow-sm" styles={{ body: { padding: 16 } }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                            <Space direction="vertical" size={1}>
                                <Text>
                                    Total Barang Terkonfirmasi: <strong style={{ fontSize: 18, color: '#0ea5e9' }}>{selectedConfirmedKeys.length}</strong> item
                                    {selectedPdttKeys.length > selectedConfirmedKeys.length ? ` (dari ${selectedPdttKeys.length} dipilih)` : ""}
                                </Text>
                                <Text>
                                    Estimasi Total Harga: <strong style={{ fontSize: 16, color: totalPrice > saldo ? '#ef4444' : '#10b981' }}>{formatCurrency(totalPrice)}</strong>
                                </Text>
                                <Text>
                                    Sisa Saldo Setelah Pengajuan:{" "}
                                    <strong style={{ fontSize: 16, color: remainingSaldo < 0 ? '#ef4444' : '#16a34a' }}>
                                        {formatCurrency(remainingSaldo)}
                                    </strong>
                                </Text>
                                {totalPrice > saldo && (
                                    <Text type="danger" style={{ fontSize: 12 }}>Total melebihi batas saldo anggaran.</Text>
                                )}
                            </Space>
                            <div style={{ textAlign: 'right' }}>
                                <Text type="secondary">Sisa Saldo Anggaran ({jumlahHari} hari):</Text><br />
                                <Text strong style={{ fontSize: 16 }}>{formatCurrency(saldo)}</Text>
                            </div>
                            <Button
                                type="primary"
                                size="large"
                                icon={<SendOutlined />}
                                loading={pdttSubmitting}
                                onClick={handlePdttSubmit}
                                disabled={selectedConfirmedKeys.length === 0 || totalPrice > saldo}
                            >
                                {existingRequest ? "Perbarui Pengajuan" : "Kirim Pengajuan"}
                            </Button>
                        </div>
                    </Card>
                </Space>
            </div>
        </div>
    );
}
