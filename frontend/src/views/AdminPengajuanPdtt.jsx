import { useCallback, useEffect, useState } from "react";
import {
    App as AntdApp,
    Button,
    Table,
    Tag,
    Typography,
    Card,
    Space,
    Modal,
    Badge,
    Tooltip,
    Dropdown,
} from "antd";
import {
    ReloadOutlined,
    EyeOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    DeleteOutlined,
    FileExcelOutlined,
    MoreOutlined,
} from "@ant-design/icons";
import { useAuth } from "../hooks/useAuth.js";
import dayjs from "dayjs";
import "dayjs/locale/id";
import * as XLSX from "xlsx";

dayjs.locale("id");

const { Title, Text } = Typography;
// const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

export default function AdminPengajuanPdtt() {
    const { apiFetch, token } = useAuth();
    const { message, modal } = AntdApp.useApp();

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [generatingPdf, setGeneratingPdf] = useState(false);

    const fetchRequests = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await apiFetch("/admin/procurement-requests");
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message ?? "Gagal memuat data pengajuan");
            setRequests(data?.data || []);
        } catch (error) {
            message.error(error.message);
        } finally {
            setLoading(false);
        }
    }, [apiFetch, message, token]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const updateStatus = async (id, status) => {
        setStatusUpdating(true);
        try {
            const res = await apiFetch(`/admin/procurement-requests/${id}/status`, {
                method: "PUT",
                body: JSON.stringify({ status }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message ?? "Gagal memperbarui status");

            message.success(`Status berhasil diubah menjadi ${status}`);
            setRequests((prev) =>
                prev.map((r) => (r.id === id ? { ...r, status: data.data.status } : r))
            );

            if (selectedRequest && selectedRequest.id === id) {
                setSelectedRequest(data.data);
            }
        } catch (error) {
            message.error(error.message);
        } finally {
            setStatusUpdating(false);
        }
    };

    const handleDelete = async (id) => {
        setDeleting(true);
        try {
            const res = await apiFetch(`/admin/procurement-requests/${id}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message ?? "Gagal menghapus pengajuan");

            message.success("Pengajuan berhasil dihapus");
            setRequests((prev) => prev.filter((r) => r.id !== id));
            if (selectedRequest?.id === id) {
                setDetailModalVisible(false);
                setSelectedRequest(null);
            }
        } catch (error) {
            message.error(error.message);
        } finally {
            setDeleting(false);
        }
    };

    const handleOpenDetail = (record) => {
        setSelectedRequest(record);
        setDetailModalVisible(true);
    };

    const formatCurrency = (value) => {
        if (value === null || value === undefined) return "-";
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0,
        }).format(Number(value));
    };

    const generateCrossTabXLSX = async () => {
        if (selectedRowKeys.length === 0) {
            message.warning("Pilih minimal satu pengajuan pegawai terlebih dahulu.");
            return;
        }
        setGeneratingPdf(true);
        try {
            const res = await apiFetch("/admin/procurement-requests/cross-tab-report", {
                method: "POST",
                body: JSON.stringify({ ids: selectedRowKeys }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message ?? "Gagal menarik data rekapan");

            const { employees, items, matrix, totals } = data.data;

            // Build worksheet data
            const wsData = [];

            // Header row
            wsData.push(["Nama Pegawai", ...items]);

            // Data rows per employee
            employees.forEach((emp) => {
                const row = [emp.name];
                items.forEach((itemName) => {
                    row.push(matrix[emp.id]?.[itemName] || 0);
                });
                wsData.push(row);
            });

            // Total row
            const totalRow = ["TOTAL"];
            items.forEach((itemName) => {
                totalRow.push(totals[itemName] || 0);
            });
            wsData.push(totalRow);

            // Create workbook and worksheet
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(wsData);

            // Auto-fit column widths
            const colWidths = wsData[0].map((_, colIdx) => {
                let maxLen = 10;
                wsData.forEach((row) => {
                    const val = String(row[colIdx] ?? "");
                    if (val.length > maxLen) maxLen = val.length;
                });
                return { wch: Math.min(maxLen + 2, 40) };
            });
            ws["!cols"] = colWidths;

            XLSX.utils.book_append_sheet(wb, ws, "Rekapan PDTT");

            // Download
            const filename = `Rekapan_PDTT_${dayjs().format("YYYYMMDD_HHmm")}.xlsx`;
            XLSX.writeFile(wb, filename);
            message.success(`File ${filename} berhasil diunduh.`);
        } catch (error) {
            message.error(error.message);
        } finally {
            setGeneratingPdf(false);
        }
    };

    const rowSelection = {
        selectedRowKeys,
        onChange: (keys) => setSelectedRowKeys(keys),
    };

    const getStatusTag = (status) => {
        switch (status) {
            case "pending":
                return <Tag color="orange">Menunggu</Tag>;
            case "approved":
                return <Tag color="green">Disetujui</Tag>;
            case "rejected":
                return <Tag color="red">Ditolak</Tag>;
            case "processed":
                return <Tag color="blue">Diproses</Tag>;
            default:
                return <Tag>{status}</Tag>;
        }
    };

    const columns = [
        {
            title: "No",
            width: 60,
            render: (_, __, i) => i + 1,
        },
        {
            title: "Nama Pegawai",
            dataIndex: ["creator", "name"],
            key: "creator_name",
            render: (v) => <Text strong>{v || "Unknown"}</Text>,
        },
        {
            title: "Periode",
            dataIndex: "period",
            key: "period",
            render: (v) => dayjs(v).format("MMMM YYYY"),
        },
        {
            title: "Waktu Pengajuan",
            dataIndex: "created_at",
            key: "created_at",
            render: (v) => dayjs(v).format("DD MMM YYYY, HH:mm"),
        },
        {
            title: "Total Item",
            key: "total_items",
            render: (_, r) => <Badge count={r.items?.length || 0} showZero color="#1890ff" />,
        },
        {
            title: "Estimasi Total",
            key: "total_price",
            render: (_, r) => {
                const total = r.items?.reduce((acc, it) => acc + it.jumlah * it.harga_saat_ini, 0) || 0;
                return <Text strong>{formatCurrency(total)}</Text>;
            },
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            render: (v) => getStatusTag(v),
        },
        {
            title: "Aksi",
            key: "aksi",
            width: 80,
            align: 'center',
            render: (_, r) => {
                const items = [
                    {
                        key: 'detail',
                        label: 'Detail',
                        icon: <EyeOutlined style={{ color: '#1890ff' }} />,
                        onClick: () => handleOpenDetail(r)
                    },
                    {
                        key: 'delete',
                        label: 'Hapus',
                        danger: true,
                        icon: <DeleteOutlined />,
                        onClick: () => {
                            Modal.confirm({
                                title: 'Hapus Pengajuan',
                                content: 'Yakin ingin menghapus pengajuan ini?',
                                okText: 'Ya',
                                okButtonProps: { danger: true },
                                onOk: () => handleDelete(r.id)
                            });
                        }
                    }
                ];
                return (
                    <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
                        <Button type="text" icon={<MoreOutlined />} loading={deleting} />
                    </Dropdown>
                );
            },
        },
    ];

    const detailColumns = [
        {
            title: "Nama Barang",
            dataIndex: ["pdtt_item", "item_name"],
            key: "item_name",
        },
        {
            title: "Merek",
            dataIndex: ["pdtt_item", "brand"],
            key: "brand",
            render: (v) => v || "-",
        },
        {
            title: "Qty Diajukan",
            dataIndex: "jumlah",
            key: "jumlah",
            render: (v, r) => `${v} ${r.pdtt_item?.satuan || ""}`,
        },
        {
            title: "Harga Satuan",
            dataIndex: "harga_saat_ini",
            key: "harga_saat_ini",
            render: (v) => formatCurrency(v),
        },
        {
            title: "Subtotal",
            key: "subtotal",
            render: (_, r) => <Text strong>{formatCurrency(r.jumlah * r.harga_saat_ini)}</Text>,
        },
    ];

    return (
        <div className="module-section">
            <div className="module-toolbar">
                <div>
                    <Title level={3} className="module-title">
                        Rekapan Pengajuan PDTT
                    </Title>
                    <Text className="module-subtitle">
                        Daftar usulan PDTT yang diajukan oleh masing-masing pegawai dari Layanan Mandiri.
                    </Text>
                </div>
                <Space>
                    <Button
                        type="primary"
                        icon={<FileExcelOutlined />}
                        onClick={generateCrossTabXLSX}
                        loading={generatingPdf}
                        disabled={selectedRowKeys.length === 0}
                    >
                        Tarik Rekapan Excel ({selectedRowKeys.length})
                    </Button>
                    <Button icon={<ReloadOutlined />} onClick={fetchRequests} loading={loading}>
                        Segarkan
                    </Button>
                </Space>
            </div>

            <Card className="content-card" styles={{ body: { padding: 16 } }}>
                <Space>
                    <Tag color="blue">Total Pengajuan: {requests.length}</Tag>
                    <Text type="secondary">Kelola status pengajuan dan hapus data jika diperlukan.</Text>
                </Space>
            </Card>

            <Card className="table-card" style={{ padding: 0 }}>
                <Table
                    rowKey="id"
                    rowSelection={rowSelection}
                    columns={columns}
                    dataSource={requests}
                    loading={loading}
                    pagination={{ pageSize: 15 }}
                    scroll={{ x: 1000 }}
                />
            </Card>

            <Modal
                title={
                    <Space>
                        <EyeOutlined />
                        <span>Detail Pengajuan PDTT</span>
                    </Space>
                }
                open={detailModalVisible}
                onCancel={() => setDetailModalVisible(false)}
                footer={null}
                width={800}
            >
                {selectedRequest && (
                    <Space direction="vertical" size="large" style={{ width: "100%", marginTop: 16 }}>
                        <Card size="small" style={{ background: "#f8fafc" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                                <div>
                                    <Text type="secondary" style={{ display: "block" }}>Pegawai Pengusul</Text>
                                    <Text strong style={{ fontSize: 16 }}>{selectedRequest.creator?.name}</Text>
                                </div>
                                <div>
                                    <Text type="secondary" style={{ display: "block" }}>Periode</Text>
                                    <Text strong>{dayjs(selectedRequest.period).format("MMMM YYYY")}</Text>
                                </div>
                                <div>
                                    <Text type="secondary" style={{ display: "block" }}>Waktu Submit</Text>
                                    <Text strong>{dayjs(selectedRequest.created_at).format("DD MMMM YYYY, HH:mm")}</Text>
                                </div>
                                <div>
                                    <Text type="secondary" style={{ display: "block" }}>Status Terkini</Text>
                                    {getStatusTag(selectedRequest.status)}
                                </div>
                            </div>
                        </Card>

                        <Table
                            rowKey="id"
                            dataSource={selectedRequest.items || []}
                            columns={detailColumns}
                            pagination={false}
                            size="middle"
                            summary={(pageData) => {
                                let total = 0;
                                pageData.forEach(({ harga_saat_ini, jumlah }) => {
                                    total += harga_saat_ini * jumlah;
                                });
                                return (
                                    <Table.Summary.Row>
                                        <Table.Summary.Cell index={0} colSpan={4} align="right">
                                            <Text strong>Total Akhir Estimasi:</Text>
                                        </Table.Summary.Cell>
                                        <Table.Summary.Cell index={1}>
                                            <Text strong style={{ color: "#0ea5e9", fontSize: 16 }}>{formatCurrency(total)}</Text>
                                        </Table.Summary.Cell>
                                    </Table.Summary.Row>
                                );
                            }}
                        />

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16, borderTop: "1px solid #f0f0f0", paddingTop: 16 }}>
                            <Button
                                danger
                                icon={<DeleteOutlined />}
                                loading={deleting}
                                onClick={() => {
                                    modal.confirm({
                                        title: "Hapus Pengajuan",
                                        content: "Yakin ingin menghapus pengajuan ini?",
                                        okText: "Ya",
                                        okButtonProps: { danger: true },
                                        cancelText: "Batal",
                                        onOk: () => handleDelete(selectedRequest.id),
                                    });
                                }}
                            >
                                Hapus Pengajuan
                            </Button>
                            {selectedRequest.status === "pending" && (
                                <>
                                    <Button
                                        danger
                                        icon={<CloseCircleOutlined />}
                                        loading={statusUpdating}
                                        onClick={() => updateStatus(selectedRequest.id, "rejected")}
                                    >
                                        Tolak
                                    </Button>
                                    <Button
                                        type="primary"
                                        icon={<CheckCircleOutlined />}
                                        loading={statusUpdating}
                                        onClick={() => updateStatus(selectedRequest.id, "approved")}
                                    >
                                        Setujui
                                    </Button>
                                </>
                            )}
                            {selectedRequest.status === "approved" && (
                                <Button
                                    type="primary"
                                    ghost
                                    loading={statusUpdating}
                                    onClick={() => updateStatus(selectedRequest.id, "processed")}
                                >
                                    Tandai Sedang Diproses
                                </Button>
                            )}
                        </div>
                    </Space>
                )}
            </Modal>
        </div>
    );
}
