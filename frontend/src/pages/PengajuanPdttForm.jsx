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
    DatePicker,
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
    const [allMyRequests, setAllMyRequests] = useState([]);

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

    const fetchPdttItems = useCallback(async (periodArg = null) => {
        if (!token) return;
        setPdttLoading(true);
        setCanAccessPdtt(true);
        try {
            const query = periodArg ? `?period=${periodArg}` : "";
            const res = await apiFetch(`${API_URL}/pdtt-items/requestable${query}`);
            const data = await res.json();
            if (!res.ok) {
                if (res.status === 403) setCanAccessPdtt(false);
                throw new Error(data?.message ?? "Gagal memuat daftar barang.");
            }
            const availableItems = data?.data || [];
            const activePeriod = periodArg || data?.meta?.period || dayjs().format("YYYY-MM");

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
            setAllMyRequests(myRequests);
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
    }, [apiFetch, applyExistingRequest, message, token]);

    const existingItemsMap = useMemo(() => {
        const map = {};
        if (existingRequest && Array.isArray(existingRequest.items)) {
            existingRequest.items.forEach((it) => {
                const itemId = it?.pdtt_item_id ?? it?.pdtt_item?.id;
                if (itemId) {
                    const diajukan = Number(it.jumlah || 0);
                    const terbeli = Number(it.jumlah_terbeli || 0);
                    const sisa = Math.max(0, diajukan - terbeli);
                    map[itemId] = {
                        diajukan,
                        terbeli,
                        sisa,
                    };
                }
            });
        }
        return map;
    }, [existingRequest]);

    const purchasedQtyMap = useMemo(() => {
        const map = {};
        Object.keys(existingItemsMap).forEach((id) => {
            map[id] = existingItemsMap[id].terbeli;
        });
        return map;
    }, [existingItemsMap]);

    const unfulfilledItemsFromPeriod = useMemo(() => {
        if (!existingRequest || !Array.isArray(existingRequest.items)) return [];
        const availableIds = new Set(pdttItems.map((it) => it.id));
        const result = [];

        existingRequest.items.forEach((it) => {
            const itemId = it?.pdtt_item_id ?? it?.pdtt_item?.id;
            if (!itemId || !availableIds.has(itemId)) return;

            const reqQty = Number(it.jumlah) || 0;
            const boughtQty = Number(it.jumlah_terbeli) || 0;
            const sisa = reqQty - boughtQty;

            if (sisa > 0) {
                result.push({
                    itemId,
                    pdtt_item: it.pdtt_item,
                    sisa,
                    boughtQty,
                    reqQty,
                    period: existingRequest.period,
                });
            }
        });

        return result;
    }, [existingRequest, pdttItems]);

    const handleImportUnfulfilledItems = () => {
        if (!unfulfilledItemsFromPeriod.length) {
            message.info("Tidak ada sisa item yang belum terbeli pada periode ini.");
            return;
        }

        const nextKeys = Array.from(new Set([...selectedPdttKeys, ...unfulfilledItemsFromPeriod.map((i) => i.itemId)]));
        const nextQty = { ...quantities };
        const nextConfirmed = { ...confirmedQuantities };

        unfulfilledItemsFromPeriod.forEach((i) => {
            nextQty[i.itemId] = Number(i.sisa || 1);
            nextConfirmed[i.itemId] = true;
        });

        setSelectedPdttKeys(nextKeys);
        setQuantities(nextQty);
        setConfirmedQuantities(nextConfirmed);

        message.success(`Berhasil memuat ${unfulfilledItemsFromPeriod.length} sisa item periode ${dayjs(periodStr, "YYYY-MM").format("MMMM YYYY")}!`);
    };

    useEffect(() => {
        fetchPdttItems(periodStr || dayjs().format("YYYY-MM"));
    }, [fetchPdttItems]);

    const handlePeriodChange = (date) => {
        if (date) {
            const pStr = date.format("YYYY-MM");
            setPeriodStr(pStr);
            fetchPdttItems(pStr);
        }
    };

    const handleQuantityChange = (id, val) => {
        const minVal = purchasedQtyMap[id] || 1;
        const numVal = Math.max(minVal, Number(val) || minVal);
        setQuantities((prev) => ({ ...prev, [id]: numVal }));
    };

    const handleConfirmQuantity = (id) => {
        const minVal = purchasedQtyMap[id] || 1;
        const qty = Number(quantities[id] || minVal);
        if (qty < minVal) {
            message.warning(`Kuantitas tidak boleh kurang dari ${minVal} buah (jumlah yang sudah terbeli).`);
            return;
        }
        setConfirmedQuantities((prev) => ({ ...prev, [id]: true }));
    };

    const handleEditQuantity = (id) => {
        setConfirmedQuantities((prev) => ({ ...prev, [id]: false }));
    };

    const handleResetItem = (id) => {
        const bought = purchasedQtyMap[id] || 0;
        if (bought > 0) {
            message.warning(`Item ini sudah terbeli sebanyak ${bought} buah sehingga tidak dapat dihapus.`);
            return;
        }
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
        // Items with purchasedQtyMap[id] > 0 cannot be unchecked
        const requiredKeys = Object.keys(purchasedQtyMap).filter((id) => purchasedQtyMap[id] > 0).map(Number);
        const finalKeys = Array.from(new Set([...keys, ...requiredKeys]));

        setSelectedPdttKeys(finalKeys);
        setQuantities((prev) => {
            const next = {};
            finalKeys.forEach((id) => {
                const minVal = purchasedQtyMap[id] || 1;
                next[id] = Math.max(minVal, Number(prev[id] || minVal));
            });
            return next;
        });
        setConfirmedQuantities((prev) => {
            const next = {};
            finalKeys.forEach((id) => {
                if (prev[id] || (purchasedQtyMap[id] || 0) > 0) next[id] = true;
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
            title: "Nama Barang & Ukuran",
            key: "item_name",
            render: (_, r) => {
                const spec = (r.jumlah || r.satuan) ? ` (${r.jumlah ? `${r.jumlah} ` : ""}${r.satuan || ""})` : "";
                return <span><Text strong>{r.item_name}</Text>{spec}</span>;
            },
        },
        {
            title: "Merek",
            dataIndex: "brand",
            key: "brand",
            render: (v) => v || "-",
        },
        {
            title: "Ukuran / Isi Kemasan",
            key: "satuan",
            render: (_, r) => <span>{(r.jumlah || r.satuan) ? `${r.jumlah ? `${r.jumlah} ` : ""}${r.satuan || ""}` : "-"}</span>,
        },
        {
            title: "Harga Satuan Estimasi",
            key: "price",
            render: (_, r) => <Text strong>{formatCurrency(r.price)}</Text>,
        },
        {
            title: "Kuantitas Diajukan & Status Realisasi",
            key: "qty_request",
            render: (_, r) => {
                const isSelected = selectedPdttKeys.includes(r.id);
                if (!isSelected) return <Text type="secondary" style={{ fontSize: 12 }}>Centang baris terlebih dahulu</Text>;
                const isConfirmed = Boolean(confirmedQuantities[r.id]);

                const info = existingItemsMap[r.id];
                const boughtQty = info ? info.terbeli : 0;
                const minVal = Math.max(1, boughtQty);
                const currentFormQty = Math.max(minVal, quantities[r.id] || minVal);
                const diajukanCount = info ? info.diajukan : currentFormQty;
                const sisaCount = info ? Math.max(0, diajukanCount - boughtQty) : currentFormQty;

                if (isConfirmed) {
                    return (
                        <Space wrap style={{ alignItems: 'center' }}>
                            <Tag color={boughtQty > 0 ? "warning" : "success"} style={{ marginInlineEnd: 0, padding: '4px 10px', fontSize: 13, borderRadius: 6 }}>
                                <CheckOutlined style={{ marginRight: 4 }} />
                                <span>
                                    Diajukan: <strong>{diajukanCount} buah</strong>
                                    {boughtQty > 0 && (
                                        <span>
                                            {" | Terbeli: "}
                                            <strong style={{ color: '#047857' }}>{boughtQty} buah</strong>
                                            {" (Sisa: "}
                                            <strong style={{ color: '#c2410c' }}>{sisaCount} buah</strong>
                                            {")"}
                                        </span>
                                    )}
                                </span>
                            </Tag>
                            <Button
                                type="link"
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => handleEditQuantity(r.id)}
                            >
                                Edit
                            </Button>
                            {boughtQty === 0 && (
                                <Button
                                    type="link"
                                    size="small"
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={() => handleResetItem(r.id)}
                                >
                                    Hapus
                                </Button>
                            )}
                        </Space>
                    );
                }

                return (
                    <Space direction="vertical" size={2}>
                        <Space>
                            <InputNumber
                                min={minVal}
                                value={currentFormQty}
                                onChange={(val) => handleQuantityChange(r.id, val)}
                                addonAfter="buah"
                                style={{ width: 130 }}
                            />
                            <Button
                                type="primary"
                                size="small"
                                icon={<CheckOutlined />}
                                onClick={() => handleConfirmQuantity(r.id)}
                            />
                            {boughtQty === 0 && (
                                <Button
                                    type="text"
                                    size="small"
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={() => handleResetItem(r.id)}
                                />
                            )}
                        </Space>
                        {boughtQty > 0 ? (
                            <Text type="secondary" style={{ fontSize: 11, color: "#ea580c" }}>
                                {`*Diajukan: ${diajukanCount} buah | Terbeli: ${boughtQty} buah | Sisa: ${sisaCount} buah (Min. ${minVal} buah)`}
                            </Text>
                        ) : (
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                *Masukkan kuantitas yang diajukan
                            </Text>
                        )}
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
                const boughtQty = purchasedQtyMap[r.id] || 0;
                const minVal = Math.max(1, boughtQty);
                const qty = Math.max(minVal, quantities[r.id] || minVal);
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
                    {unfulfilledItemsFromPeriod.length > 0 && (
                        <Alert
                            type="warning"
                            showIcon
                            style={{ border: "1px solid #fed7aa", background: "#fff7ed", borderRadius: 8 }}
                            message={
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                                    <div>
                                        <Text strong style={{ color: "#c2410c", fontSize: 14, display: "block" }}>
                                            Sisa Item Belum Terbeli Periode {periodStr ? dayjs(periodStr, "YYYY-MM").format("MMMM YYYY") : ""}
                                        </Text>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            Terdapat {unfulfilledItemsFromPeriod.length} jenis item dari pengajuan periode bulan {periodStr ? dayjs(periodStr, "YYYY-MM").format("MMMM YYYY") : ""} yang belum/sebagian terbeli ({unfulfilledItemsFromPeriod.map(i => `${i.pdtt_item?.item_name || 'Barang'} [Sisa: ${i.sisa} buah]`).join(', ')}).
                                        </Text>
                                    </div>
                                    <Button
                                        type="primary"
                                        size="middle"
                                        onClick={handleImportUnfulfilledItems}
                                        style={{ background: "#0F5B99", borderColor: "#0F5B99", fontWeight: 600 }}
                                    >
                                        Muat Sisa Item Bulan {periodStr ? dayjs(periodStr, "YYYY-MM").format("MMM YYYY") : ""}
                                    </Button>
                                </div>
                            }
                        />
                    )}

                    <Alert
                        message="Pembuatan Pengajuan PDTT"
                        description="Pilih barang-barang di bawah ini yang akan Anda ajukan ke PPK/Admin. Harga dan Kuantitas di bawah ini merupakan referensi Master yang sudah ditetapkan untuk periode ini."
                        type="info"
                        showIcon
                    />

                    <Card className="public-card shadow-sm" styles={{ body: { padding: 0 } }}>
                        <div style={{ padding: 16, borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center' }}>
                            <Text type="secondary" style={{ marginRight: 12 }}>Periode Pengadaan Aktif: </Text>
                            <DatePicker.MonthPicker 
                                value={periodStr ? dayjs(periodStr, "YYYY-MM") : null}
                                format="MMMM YYYY"
                                onChange={handlePeriodChange}
                                allowClear={false}
                                style={{ width: 180 }}
                            />
                            {existingRequest && (
                                <Tag color="gold" style={{ marginLeft: 16 }}>
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
