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
    DatePicker,
    Checkbox,
    InputNumber,
    Progress,
    Divider,
    Select,
    Spin,
    Input,
} from "antd";
import {
    ReloadOutlined,
    EyeOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    DeleteOutlined,
    FileExcelOutlined,
    MoreOutlined,
    CalendarOutlined,
    EditOutlined,
    CheckSquareOutlined,
    ShoppingCartOutlined,
    ShoppingOutlined,
    ClockCircleOutlined,
    InboxOutlined,
    CheckOutlined,
    PlusOutlined,
    HistoryOutlined,
    PrinterOutlined,
    FilePdfOutlined,
} from "@ant-design/icons";
import { useAuth } from "../hooks/useAuth.js";
import dayjs from "dayjs";
import "dayjs/locale/id";
import * as XLSX from "xlsx";

dayjs.locale("id");

const { Title, Text } = Typography;

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
    const [bulkUpdating, setBulkUpdating] = useState(false);

    // BAST Print states
    const [bastModalVisible, setBastModalVisible] = useState(false);
    const [bastTargetRequests, setBastTargetRequests] = useState([]);
    const [ppkName, setPpkName] = useState("DODDY PRAYUDI, A.Md");
    const [ppkNip, setPpkNip] = useState("19960805 201903 1 002");
    const [cityName, setCityName] = useState("Palopo");
    const [bastDate, setBastDate] = useState(dayjs().format("DD MMMM YYYY"));

    const generateBastHtml = (targetRequests, config) => {
        const { ppkName, ppkNip, cityName, bastDate } = config;

        const pagesHtml = targetRequests.map((req, idx) => {
            const creatorName = req.creator?.name || "Pegawai";
            const creatorNip = req.creator?.nip || "-";
            const periodStr = req.period ? dayjs(req.period).format("MMMM YYYY") : "-";
            const jmlHari = req.jumlah_hari || 0;
            const totalUangStr = formatCurrency(req.total_uang || (jmlHari * 19000));

            const items = req.items || [];
            let totalItemQty = 0;
            let grandTotalPrice = 0;

            const tableRowsHtml = items.map((it, itemIdx) => {
                const pdttItem = it.pdtt_item || {};
                const itemName = getItemDisplayName(pdttItem);
                const qty = Number(it.jumlah_terbeli || it.jumlah || 0);
                const unitPrice = it.harga_terbeli !== null && it.harga_terbeli !== undefined ? Number(it.harga_terbeli) : Number(it.harga_saat_ini || pdttItem.price || 0);
                const subtotal = qty * unitPrice;

                totalItemQty += qty;
                grandTotalPrice += subtotal;

                return `
                    <tr>
                        <td style="border: 1pt solid #000; padding: 6px 8px; text-align: center; font-size: 11pt;">${itemIdx + 1}</td>
                        <td style="border: 1pt solid #000; padding: 6px 8px; font-size: 11pt;">${itemName}</td>
                        <td style="border: 1pt solid #000; padding: 6px 8px; text-align: center; font-size: 11pt;">${qty}</td>
                        <td style="border: 1pt solid #000; padding: 6px 8px; text-align: right; font-size: 11pt;">${formatCurrency(unitPrice)}</td>
                        <td style="border: 1pt solid #000; padding: 6px 8px; text-align: right; font-weight: bold; font-size: 11pt;">${formatCurrency(subtotal)}</td>
                    </tr>
                `;
            }).join("");

            const pageBreakStyle = idx < targetRequests.length - 1 ? 'page-break-after: always; break-after: page;' : '';

            return `
                <div class="bast-container" style="padding: 24px; max-width: 800px; margin: 0 auto 30px auto; border: 1.5pt solid #000; font-family: 'Times New Roman', Times, serif; color: #000; background: #fff; box-sizing: border-box; ${pageBreakStyle}">
                    <h2 style="text-align: center; font-size: 16pt; font-weight: bold; margin-top: 0; margin-bottom: 24px; text-transform: uppercase; letter-spacing: 0.5px;">
                        TANDA TERIMA PDTT
                    </h2>

                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11pt; line-height: 1.6;">
                        <tr>
                            <td style="width: 140px; font-weight: bold;">Nama</td>
                            <td style="width: 15px;">:</td>
                            <td>${creatorName}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: bold;">NIP</td>
                            <td>:</td>
                            <td>${creatorNip}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: bold;">Periode</td>
                            <td>:</td>
                            <td>${periodStr}</td>
                        </tr>
                    </table>

                    <div style="margin-bottom: 18px; font-size: 11pt; line-height: 1.6;">
                        Jumlah hari kerja berhak mendapatkan PDTT : <strong>${jmlHari}</strong><br/>
                        ${jmlHari} x Rp19,000 = <strong>${totalUangStr}</strong>
                    </div>

                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11pt;" border="1">
                        <thead>
                            <tr style="background-color: #f2f2f2;">
                                <th style="border: 1pt solid #000; padding: 6px 8px; width: 40px; text-align: center;">No</th>
                                <th style="border: 1pt solid #000; padding: 6px 8px; text-align: left;">Uraian</th>
                                <th style="border: 1pt solid #000; padding: 6px 8px; width: 80px; text-align: center;">Jumlah</th>
                                <th style="border: 1pt solid #000; padding: 6px 8px; width: 130px; text-align: right;">Harga Satuan</th>
                                <th style="border: 1pt solid #000; padding: 6px 8px; width: 140px; text-align: right;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRowsHtml}
                        </tbody>
                        <tfoot>
                            <tr style="font-weight: bold; background-color: #fafafa;">
                                <td colspan="2" style="border: 1pt solid #000; padding: 8px; text-align: right;">Total</td>
                                <td style="border: 1pt solid #000; padding: 8px; text-align: center;">${totalItemQty}</td>
                                <td style="border: 1pt solid #000; padding: 8px;"></td>
                                <td style="border: 1pt solid #000; padding: 8px; text-align: right;">${formatCurrency(grandTotalPrice)}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <div style="margin-bottom: 25px; font-size: 11pt;">
                        Telah menerima PDTT sesuai rincian diatas,
                    </div>

                    <div style="text-align: right; font-size: 11pt; margin-bottom: 8px; padding-right: 35px;">
                        ${cityName}, ${bastDate}
                    </div>

                    <table style="width: 100%; border-collapse: collapse; font-size: 11pt; text-align: center;">
                        <tr>
                            <td style="width: 50%; vertical-align: top;">
                                Pejabat Pembuat Komitmen,
                                <br/><br/><br/><br/><br/>
                                <strong style="text-decoration: underline;">${ppkName}</strong><br/>
                                <span>NIP. ${ppkNip}</span>
                            </td>
                            <td style="width: 50%; vertical-align: top;">
                                Penerima PDTT,
                                <br/><br/><br/><br/><br/>
                                <strong style="text-decoration: underline;">${creatorName}</strong><br/>
                                <span>NIP. ${creatorNip}</span>
                            </td>
                        </tr>
                    </table>
                </div>
            `;
        }).join("");

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>TANDA TERIMA PDTT</title>
                <style>
                    @media print {
                        @page { size: A4 portrait; margin: 15mm; }
                        body { margin: 0; padding: 0; background: #fff; }
                        .no-print { display: none !important; }
                    }
                    body {
                        font-family: 'Times New Roman', Times, serif;
                        background: #f8fafc;
                        margin: 0;
                        padding: 20px;
                    }
                </style>
            </head>
            <body>
                ${pagesHtml}
            </body>
            </html>
        `;
    };

    const handlePrintBastWindow = () => {
        if (!bastTargetRequests.length) return;
        const htmlContent = generateBastHtml(bastTargetRequests, { ppkName, ppkNip, cityName, bastDate });
        const printWin = window.open("", "_blank", "width=900,height=800");
        if (printWin) {
            printWin.document.open();
            printWin.document.write(htmlContent);
            printWin.document.close();
            printWin.focus();
            setTimeout(() => {
                printWin.print();
            }, 500);
        }
    };

    const handleDownloadBastPdf = async () => {
        if (!bastTargetRequests.length) return;
        try {
            const [{ jsPDF }, { default: autoTable }] = await Promise.all([
                import('jspdf'),
                import('jspdf-autotable'),
            ]);

            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });

            bastTargetRequests.forEach((req, idx) => {
                if (idx > 0) doc.addPage();

                const creatorName = req.creator?.name || "Pegawai";
                const creatorNip = req.creator?.nip || "-";
                const periodStr = req.period ? dayjs(req.period).format("MMMM YYYY") : "-";
                const jmlHari = req.jumlah_hari || 0;
                const totalUangStr = formatCurrency(req.total_uang || (jmlHari * 19000));

                const margin = 15;
                const pageWidth = doc.internal.pageSize.getWidth();
                const contentWidth = pageWidth - margin * 2;

                doc.setDrawColor(0);
                doc.setLineWidth(0.5);
                doc.rect(margin, margin, contentWidth, 260);

                let y = margin + 12;

                doc.setFont('times', 'bold');
                doc.setFontSize(16);
                doc.text("TANDA TERIMA PDTT", pageWidth / 2, y, { align: 'center' });

                y += 12;

                doc.setFontSize(11);
                doc.setFont('times', 'bold');
                doc.text("Nama", margin + 6, y);
                doc.text(":", margin + 35, y);
                doc.setFont('times', 'normal');
                doc.text(creatorName, margin + 40, y);

                y += 6;
                doc.setFont('times', 'bold');
                doc.text("NIP", margin + 6, y);
                doc.text(":", margin + 35, y);
                doc.setFont('times', 'normal');
                doc.text(creatorNip, margin + 40, y);

                y += 6;
                doc.setFont('times', 'bold');
                doc.text("Periode", margin + 6, y);
                doc.text(":", margin + 35, y);
                doc.setFont('times', 'normal');
                doc.text(periodStr, margin + 40, y);

                y += 10;
                doc.setFont('times', 'normal');
                doc.text(`Jumlah hari kerja berhak mendapatkan PDTT : `, margin + 6, y);
                doc.setFont('times', 'bold');
                doc.text(`${jmlHari}`, margin + 80, y);

                y += 6;
                doc.setFont('times', 'normal');
                doc.text(`${jmlHari} x Rp19,000 = `, margin + 6, y);
                doc.setFont('times', 'bold');
                doc.text(`${totalUangStr}`, margin + 45, y);

                y += 8;

                const items = req.items || [];
                let totalQty = 0;
                let totalAmount = 0;

                const tableBody = items.map((it, itemIdx) => {
                    const pdttItem = it.pdtt_item || {};
                    const itemName = getItemDisplayName(pdttItem);
                    const qty = Number(it.jumlah_terbeli || it.jumlah || 0);
                    const unitPrice = it.harga_terbeli !== null && it.harga_terbeli !== undefined ? Number(it.harga_terbeli) : Number(it.harga_saat_ini || pdttItem.price || 0);
                    const subtotal = qty * unitPrice;

                    totalQty += qty;
                    totalAmount += subtotal;

                    return [
                        itemIdx + 1,
                        itemName,
                        `${qty}`,
                        formatCurrency(unitPrice),
                        formatCurrency(subtotal)
                    ];
                });

                autoTable(doc, {
                    startY: y,
                    margin: { left: margin + 6, right: margin + 6 },
                    head: [['No', 'Uraian', 'Jumlah', 'Harga Satuan', 'Total']],
                    body: tableBody,
                    foot: [['Total', '', `${totalQty}`, '', formatCurrency(totalAmount)]],
                    styles: { font: 'times', fontSize: 10, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.3 },
                    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
                    footStyles: { fillColor: [250, 250, 250], textColor: [0, 0, 0], fontStyle: 'bold' },
                    columnStyles: {
                        0: { halign: 'center', cellWidth: 12 },
                        1: { halign: 'left' },
                        2: { halign: 'center', cellWidth: 20 },
                        3: { halign: 'right', cellWidth: 35 },
                        4: { halign: 'right', cellWidth: 40 },
                    }
                });

                y = doc.lastAutoTable.finalY + 12;

                doc.setFont('times', 'normal');
                doc.text("Telah menerima PDTT sesuai rincian diatas,", margin + 6, y);

                y += 10;

                const col1X = margin + 45;
                const col2X = pageWidth - margin - 45;

                doc.text(`${cityName}, ${bastDate}`, col2X, y, { align: 'center' });

                y += 8;

                doc.text("Pejabat Pembuat Komitmen,", col1X, y, { align: 'center' });
                doc.text("Penerima PDTT,", col2X, y, { align: 'center' });

                y += 28;

                doc.setFont('times', 'bold');
                doc.text(ppkName, col1X, y, { align: 'center' });
                doc.text(creatorName, col2X, y, { align: 'center' });

                y += 5;
                doc.setFont('times', 'normal');
                doc.setFontSize(10);
                doc.text(`NIP. ${ppkNip}`, col1X, y, { align: 'center' });
                doc.text(`NIP. ${creatorNip}`, col2X, y, { align: 'center' });
            });

            const filename = `BAST_PDTT_${dayjs().format("YYYYMMDD_HHmm")}.pdf`;
            doc.save(filename);
            message.success(`File ${filename} berhasil diunduh!`);
        } catch (err) {
            message.error("Gagal membuat PDF: " + err.message);
        }
    };

    const handleBulkMarkFulfilled = () => {
        if (!selectedRowKeys.length) return;
        Modal.confirm({
            title: "Tandai Terbeli Semua",
            icon: <CheckCircleOutlined style={{ color: "#059669" }} />,
            content: `Apakah Anda yakin ingin menandai seluruh ${selectedRowKeys.length} pengajuan yang dicentang sebagai TERBELI SEMUA (Terbeli Lengkap)? Seluruh item pada pengajuan tersebut akan otomatis disesuaikan menjadi terbeli 100%.`,
            okText: "Ya, Terbeli Semua",
            okType: "primary",
            okButtonProps: { style: { background: "#059669", borderColor: "#059669" } },
            cancelText: "Batal",
            onOk: async () => {
                setBulkUpdating(true);
                try {
                    const res = await apiFetch("/admin/procurement-requests/bulk-fulfillment", {
                        method: "PUT",
                        body: JSON.stringify({
                            ids: selectedRowKeys,
                            action: "fulfilled",
                        }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data?.message ?? "Gagal memperbarui status realisasi.");
                    message.success(data?.message ?? "Pengajuan berhasil ditandai Terbeli Semua!");
                    setSelectedRowKeys([]);
                    fetchRequests();
                } catch (err) {
                    message.error(err.message);
                } finally {
                    setBulkUpdating(false);
                }
            },
        });
    };

    // Period management state
    const [filterPeriod, setFilterPeriod] = useState(dayjs());
    const [allPeriodsFilter, setAllPeriodsFilter] = useState(false);
    const [changePeriodModalVisible, setChangePeriodModalVisible] = useState(false);
    const [targetRequestForPeriod, setTargetRequestForPeriod] = useState(null);
    const [newPeriodValue, setNewPeriodValue] = useState(dayjs());
    const [savingPeriod, setSavingPeriod] = useState(false);

    // Purchase Fulfillment state
    const [fulfillmentModalVisible, setFulfillmentModalVisible] = useState(false);
    const [fulfillmentTarget, setFulfillmentTarget] = useState(null);
    const [fulfillmentItems, setFulfillmentItems] = useState([]);
    const [savingFulfillment, setSavingFulfillment] = useState(false);

    // Edit Request state
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editRequestTarget, setEditRequestTarget] = useState(null);
    const [editPeriod, setEditPeriod] = useState(dayjs());
    const [editItems, setEditItems] = useState([]);
    const [editCatalogItems, setEditCatalogItems] = useState([]);
    const [editUserSaldo, setEditUserSaldo] = useState(0);
    const [editUserDays, setEditUserDays] = useState(0);
    const [editLoadingItems, setEditLoadingItems] = useState(false);
    const [savingEditRequest, setSavingEditRequest] = useState(false);
    const [selectedCatalogItemId, setSelectedCatalogItemId] = useState(null);

    const fetchEditModalCatalogAndBudget = useCallback(async (userId, periodDayjs) => {
        if (!userId || !periodDayjs) return;
        setEditLoadingItems(true);
        try {
            const periodStr = periodDayjs.format("YYYY-MM");
            const res = await apiFetch(`/pdtt-items/requestable?period=${periodStr}&user_id=${userId}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message ?? "Gagal memuat data katalog & saldo.");

            const catalog = data?.data || [];
            setEditCatalogItems(catalog);
            setEditUserSaldo(data?.meta?.saldo || 0);
            setEditUserDays(data?.meta?.jumlah_hari || 0);

            setEditItems((prevItems) =>
                prevItems.map((item) => {
                    const catalogItem = catalog.find((c) => c.id === item.pdtt_item_id);
                    if (catalogItem) {
                        return {
                            ...item,
                            harga_saat_ini: Number(catalogItem.price) || 0,
                            item_name: catalogItem.item_name || item.item_name,
                            brand: catalogItem.brand || item.brand,
                            satuan: catalogItem.satuan || item.satuan,
                        };
                    }
                    return item;
                })
            );
        } catch (err) {
            message.error(err.message);
        } finally {
            setEditLoadingItems(false);
        }
    }, [apiFetch, message]);

    const handleOpenEditRequest = (record) => {
        setEditRequestTarget(record);
        const initialPeriod = dayjs(record.period);
        setEditPeriod(initialPeriod);

        const mapped = (record.items || []).map((it) => {
            const pdttItem = it.pdtt_item || {};
            return {
                pdtt_item_id: pdttItem.id || it.pdtt_item_id,
                item_name: pdttItem.item_name || "Item",
                brand: pdttItem.brand || "-",
                satuan: pdttItem.satuan || "",
                jumlah: Number(it.jumlah) || 1,
                harga_saat_ini: Number(it.harga_saat_ini) || 0,
            };
        });
        setEditItems(mapped);
        setSelectedCatalogItemId(null);
        setEditModalVisible(true);

        fetchEditModalCatalogAndBudget(record.creator?.id, initialPeriod);
    };

    const handleEditPeriodChange = (val) => {
        if (!val) return;
        setEditPeriod(val);
        if (editRequestTarget?.creator?.id) {
            fetchEditModalCatalogAndBudget(editRequestTarget.creator.id, val);
        }
    };

    const handleEditItemQtyChange = (pdtt_item_id, qty) => {
        const num = Math.max(1, Number(qty) || 1);
        setEditItems((prev) =>
            prev.map((it) => (it.pdtt_item_id === pdtt_item_id ? { ...it, jumlah: num } : it))
        );
    };

    const handleRemoveEditItem = (pdtt_item_id) => {
        if (editItems.length <= 1) {
            message.warning("Pengajuan harus memiliki minimal 1 item barang.");
            return;
        }
        setEditItems((prev) => prev.filter((it) => it.pdtt_item_id !== pdtt_item_id));
    };

    const handleAddCatalogItemToEdit = (itemId) => {
        if (!itemId) return;
        const exists = editItems.some((it) => it.pdtt_item_id === itemId);
        if (exists) {
            message.info("Item barang ini sudah ada dalam daftar permintaan.");
            setSelectedCatalogItemId(null);
            return;
        }
        const catalogItem = editCatalogItems.find((c) => c.id === itemId);
        if (!catalogItem) return;

        setEditItems((prev) => [
            ...prev,
            {
                pdtt_item_id: catalogItem.id,
                item_name: catalogItem.item_name || "Item",
                brand: catalogItem.brand || "-",
                satuan: catalogItem.satuan || "",
                jumlah: 1,
                harga_saat_ini: Number(catalogItem.price) || 0,
            },
        ]);
        setSelectedCatalogItemId(null);
    };

    const handleSaveEditRequest = async () => {
        if (!editRequestTarget || !editPeriod) return;
        if (editItems.length === 0) {
            message.error("Minimal harus ada 1 item barang yang diminta.");
            return;
        }
        setSavingEditRequest(true);
        try {
            const payload = {
                period: editPeriod.format("YYYY-MM"),
                items: editItems.map((it) => ({
                    item_id: it.pdtt_item_id,
                    jumlah: it.jumlah,
                })),
            };
            const res = await apiFetch(`/admin/procurement-requests/${editRequestTarget.id}`, {
                method: "PUT",
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message ?? "Gagal memperbarui permintaan pengadaan.");

            message.success("Permintaan pengadaan berhasil disesuaikan! Status pengajuan kini Diubah (Updated).");
            setEditModalVisible(false);
            setEditRequestTarget(null);
            fetchRequests();

            if (selectedRequest && selectedRequest.id === editRequestTarget.id) {
                setSelectedRequest(data.data);
            }
        } catch (err) {
            message.error(err.message);
        } finally {
            setSavingEditRequest(false);
        }
    };

    const getItemVolumeSpec = (pdttItem) => {
        if (!pdttItem) return "";
        const jml = pdttItem.jumlah ?? "";
        const sat = pdttItem.satuan ?? "";
        if (jml && sat) return `${jml} ${sat}`;
        if (jml) return `${jml}`;
        if (sat) return `${sat}`;
        return "";
    };

    const getItemDisplayName = (pdttItem) => {
        if (!pdttItem) return "-";
        const name = pdttItem.item_name || "-";
        const spec = getItemVolumeSpec(pdttItem);
        return spec ? `${name} (${spec})` : name;
    };

    const handleOpenFulfillment = (record) => {
        setFulfillmentTarget(record);
        const mappedItems = (record.items || []).map((it) => {
            const reqQty = Number(it.jumlah) || 0;
            const purchasedQty = Number(it.jumlah_terbeli) || 0;
            const pdttItem = it.pdtt_item || {};
            const spec = getItemVolumeSpec(pdttItem);
            const initialPrice = Number(it.harga_saat_ini) || 0;
            const actualPrice = it.harga_terbeli !== null && it.harga_terbeli !== undefined ? Number(it.harga_terbeli) : initialPrice;
            return {
                id: it.id,
                item_name: getItemDisplayName(pdttItem),
                raw_name: pdttItem.item_name || "Barang",
                brand: pdttItem.brand || "-",
                ukuran: spec,
                jumlah: reqQty,
                jumlah_terbeli: purchasedQty,
                harga_saat_ini: initialPrice,
                harga_terbeli: actualPrice,
                is_full: reqQty > 0 && purchasedQty >= reqQty,
            };
        });
        setFulfillmentItems(mappedItems);
        setFulfillmentModalVisible(true);
    };

    const handleItemPriceChange = (id, val) => {
        const numVal = Math.max(0, Number(val) || 0);
        setFulfillmentItems((prev) =>
            prev.map((it) => (it.id === id ? { ...it, harga_terbeli: numVal } : it))
        );
    };

    const handleToggleItemFull = (id, checked) => {
        setFulfillmentItems((prev) =>
            prev.map((it) => {
                if (it.id === id) {
                    const newQty = checked ? it.jumlah : 0;
                    return {
                        ...it,
                        is_full: checked,
                        jumlah_terbeli: newQty,
                    };
                }
                return it;
            })
        );
    };

    const handleItemQtyChange = (id, val) => {
        const numVal = Math.max(0, Number(val) || 0);
        setFulfillmentItems((prev) =>
            prev.map((it) => {
                if (it.id === id) {
                    const isFull = it.jumlah > 0 && numVal >= it.jumlah;
                    return {
                        ...it,
                        jumlah_terbeli: numVal,
                        is_full: isFull,
                    };
                }
                return it;
            })
        );
    };

    const handleToggleAllFull = (checked) => {
        setFulfillmentItems((prev) =>
            prev.map((it) => ({
                ...it,
                is_full: checked,
                jumlah_terbeli: checked ? it.jumlah : 0,
            }))
        );
    };

    const handleSaveFulfillment = async () => {
        if (!fulfillmentTarget) return;
        setSavingFulfillment(true);
        try {
            const payloadItems = fulfillmentItems.map((it) => ({
                id: it.id,
                jumlah_terbeli: it.jumlah_terbeli,
                harga_terbeli: it.harga_terbeli,
            }));
            const res = await apiFetch(`/admin/procurement-requests/${fulfillmentTarget.id}/fulfillment`, {
                method: "PUT",
                body: JSON.stringify({ items: payloadItems }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message ?? "Gagal menyimpan data realisasi pembelian");

            message.success("Realisasi pembelian barang berhasil disimpan! Status pengajuan kini Disetujui (Approved).");
            setRequests((prev) =>
                prev.map((r) => (r.id === fulfillmentTarget.id ? data.data : r))
            );

            if (selectedRequest && selectedRequest.id === fulfillmentTarget.id) {
                setSelectedRequest(data.data);
            }
            setFulfillmentModalVisible(false);
            setFulfillmentTarget(null);
        } catch (error) {
            message.error(error.message);
        } finally {
            setSavingFulfillment(false);
        }
    };

    const fetchRequests = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const periodStr = (!allPeriodsFilter && filterPeriod) ? filterPeriod.format("YYYY-MM") : "";
            const url = periodStr ? `/admin/procurement-requests?period=${periodStr}` : "/admin/procurement-requests";
            const res = await apiFetch(url);
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message ?? "Gagal memuat data pengajuan");
            setRequests(data?.data || []);
            if (data?.ppk_info?.name) {
                setPpkName(data.ppk_info.name);
            }
            if (data?.ppk_info?.nip) {
                setPpkNip(data.ppk_info.nip);
            }
            setSelectedRowKeys([]); // Reset selection when period changes
        } catch (error) {
            message.error(error.message);
        } finally {
            setLoading(false);
        }
    }, [apiFetch, message, token, filterPeriod, allPeriodsFilter]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handleChangePeriod = async () => {
        if (!targetRequestForPeriod || !newPeriodValue) return;
        setSavingPeriod(true);
        try {
            const periodStr = newPeriodValue.format("YYYY-MM");
            const res = await apiFetch(`/admin/procurement-requests/${targetRequestForPeriod.id}`, {
                method: "PUT",
                body: JSON.stringify({ period: periodStr }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message ?? "Gagal mengubah periode pengajuan");

            message.success(`Periode pengajuan berhasil diubah menjadi ${newPeriodValue.format("MMMM YYYY")}`);
            fetchRequests();

            if (selectedRequest && selectedRequest.id === targetRequestForPeriod.id) {
                setSelectedRequest((prev) => ({ ...prev, period: periodStr }));
            }
            setChangePeriodModalVisible(false);
            setTargetRequestForPeriod(null);
        } catch (error) {
            message.error(error.message);
        } finally {
            setSavingPeriod(false);
        }
    };

    const handleSelectAllFiltered = () => {
        const keys = requests.map(r => r.id);
        setSelectedRowKeys(keys);
        message.info(`${keys.length} pengajuan berhasil dipilih.`);
    };

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
            const periodText = allPeriodsFilter ? "Semua_Periode" : filterPeriod.format("YYYY-MM");
            const filename = `Rekapan_PDTT_${periodText}_${dayjs().format("YYYYMMDD_HHmm")}.xlsx`;
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
            case "updated":
                return <Tag color="purple">Diubah (Perlu Realisasi)</Tag>;
            case "reorder":
                return <Tag color="cyan">Pengajuan Ulang (Reorder)</Tag>;
            default:
                return <Tag>{status}</Tag>;
        }
    };

    const getFulfillmentTag = (status) => {
        if (status === "fulfilled") {
            return (
                <Tag color="success" style={{ fontWeight: 600, borderRadius: 6 }}>
                    <CheckCircleOutlined style={{ marginRight: 4 }} />
                    Terbeli Lengkap
                </Tag>
            );
        }
        if (status === "partial") {
            return (
                <Tag color="warning" style={{ fontWeight: 600, borderRadius: 6 }}>
                    <ClockCircleOutlined style={{ marginRight: 4 }} />
                    Terbeli Sebagian
                </Tag>
            );
        }
        return (
            <Tag style={{ color: "#64748b", background: "#f1f5f9", borderColor: "#cbd5e1", borderRadius: 6 }}>
                <InboxOutlined style={{ marginRight: 4 }} />
                Belum Terbeli
            </Tag>
        );
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
            render: (v) => <Tag color="blue">{dayjs(v).format("MMMM YYYY")}</Tag>,
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
            render: (_, r) => <Badge count={r.items?.length || 0} showZero color="#0F5B99" />,
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
            title: "Status Pembelian",
            key: "fulfillment_status",
            render: (_, r) => getFulfillmentTag(r.fulfillment_status),
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
                        icon: <EyeOutlined style={{ color: '#0F5B99' }} />,
                        onClick: () => handleOpenDetail(r)
                    },
                    {
                        key: 'edit-request',
                        label: 'Update Permintaan',
                        icon: <EditOutlined style={{ color: '#2563eb' }} />,
                        onClick: () => handleOpenEditRequest(r)
                    },
                    {
                        key: 'fulfillment',
                        label: 'Input Realisasi Pembelian',
                        icon: <ShoppingCartOutlined style={{ color: '#10b981' }} />,
                        onClick: () => handleOpenFulfillment(r)
                    },
                    {
                        key: 'print-bast',
                        label: 'Cetak BAST',
                        icon: <PrinterOutlined style={{ color: '#7e22ce' }} />,
                        onClick: () => {
                            setBastTargetRequests([r]);
                            setBastModalVisible(true);
                        }
                    },
                    {
                        key: 'change-period',
                        label: 'Ubah Periode',
                        icon: <CalendarOutlined style={{ color: '#fa8c16' }} />,
                        onClick: () => {
                            setTargetRequestForPeriod(r);
                            setNewPeriodValue(dayjs(r.period));
                            setChangePeriodModalVisible(true);
                        }
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
            title: "Nama Barang & Ukuran",
            key: "item_name",
            render: (_, r) => <Text strong>{getItemDisplayName(r.pdtt_item)}</Text>,
        },
        {
            title: "Merek",
            dataIndex: ["pdtt_item", "brand"],
            key: "brand",
            render: (v) => v || "-",
        },
        {
            title: "Qty Diajukan",
            key: "jumlah",
            render: (_, r) => {
                const qty = Number(r.jumlah) || 0;
                const diff = selectedRequest?.change_log?.diffs?.find((d) => d.pdtt_item_id === r.pdtt_item_id);
                return (
                    <div>
                        <Text strong style={{ display: "block" }}>{qty} buah</Text>
                        {diff && diff.type === "added" && (
                            <Tag color="success" style={{ fontSize: 10, padding: "0 6px", margin: "2px 0 0 0" }}>➕ Baru (+{diff.new_qty})</Tag>
                        )}
                        {diff && diff.type === "increased" && (
                            <Tag color="green" style={{ fontSize: 10, padding: "0 6px", margin: "2px 0 0 0" }}>📈 +{diff.diff} (Awal: {diff.old_qty})</Tag>
                        )}
                        {diff && diff.type === "decreased" && (
                            <Tag color="volcano" style={{ fontSize: 10, padding: "0 6px", margin: "2px 0 0 0" }}>📉 {diff.diff} (Awal: {diff.old_qty})</Tag>
                        )}
                    </div>
                );
            },
        },
        {
            title: "Qty Terbeli",
            key: "jumlah_terbeli",
            render: (_, r) => {
                const req = Number(r.jumlah) || 0;
                const bought = Number(r.jumlah_terbeli) || 0;
                if (req > 0 && bought >= req) {
                    return <Tag color="success" style={{ fontWeight: 600 }}>{bought} / {req} buah (Lengkap)</Tag>;
                }
                if (bought > 0) {
                    return <Tag color="warning" style={{ fontWeight: 600 }}>{bought} / {req} buah</Tag>;
                }
                return <Tag style={{ color: "#94a3b8" }}>0 / {req} buah</Tag>;
            },
        },
        {
            title: "Harga Estimasi",
            dataIndex: "harga_saat_ini",
            key: "harga_saat_ini",
            render: (v) => formatCurrency(v),
        },
        {
            title: "Harga Terbeli",
            key: "harga_terbeli",
            render: (_, r) => {
                const price = r.harga_terbeli !== null && r.harga_terbeli !== undefined ? r.harga_terbeli : r.harga_saat_ini;
                const isDiff = r.harga_terbeli !== null && r.harga_terbeli !== undefined && Number(r.harga_terbeli) !== Number(r.harga_saat_ini);
                return (
                    <span>
                        {formatCurrency(price)}
                        {isDiff && <Tag color="orange" style={{ fontSize: 10, marginLeft: 4 }}>Beda</Tag>}
                    </span>
                );
            },
        },
        {
            title: "Subtotal Realisasi",
            key: "subtotal_realisasi",
            render: (_, r) => {
                const bought = Number(r.jumlah_terbeli) || 0;
                const price = r.harga_terbeli !== null && r.harga_terbeli !== undefined ? Number(r.harga_terbeli) : Number(r.harga_saat_ini);
                return <Text strong style={{ color: "#0F5B99" }}>{formatCurrency(bought * price)}</Text>;
            },
        },
    ];

    return (
        <div className="module-section">
            <div className="module-toolbar" style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
                <div>
                    <Title level={3} className="module-title" style={{ margin: 0 }}>
                        Rekapan Pengajuan PDTT
                    </Title>
                    <Text className="module-subtitle">
                        Daftar usulan PDTT yang diajukan oleh masing-masing pegawai dari Layanan Mandiri.
                    </Text>
                </div>
                <Space wrap>
                    {/* Period Filter Control */}
                    <Space style={{ background: "#ffffff", padding: "4px 12px", borderRadius: 8, border: "1px solid #d9d9d9" }}>
                        <CalendarOutlined style={{ color: "#0F5B99" }} />
                        <Text strong style={{ fontSize: 13 }}>Periode:</Text>
                        <DatePicker
                            picker="month"
                            value={allPeriodsFilter ? null : filterPeriod}
                            onChange={(val) => {
                                if (val) {
                                    setFilterPeriod(val);
                                    setAllPeriodsFilter(false);
                                }
                            }}
                            format="MMMM YYYY"
                            allowClear={false}
                            disabled={allPeriodsFilter}
                            style={{ width: 150 }}
                        />
                        <Button
                            type={allPeriodsFilter ? "primary" : "default"}
                            size="small"
                            onClick={() => setAllPeriodsFilter(!allPeriodsFilter)}
                            style={allPeriodsFilter ? { background: "#0F5B99" } : {}}
                        >
                            {allPeriodsFilter ? "Tampilkan Per Bulan" : "Semua Periode"}
                        </Button>
                    </Space>

                    <Button
                        type="primary"
                        icon={<CheckCircleOutlined />}
                        onClick={handleBulkMarkFulfilled}
                        loading={bulkUpdating}
                        disabled={selectedRowKeys.length === 0}
                        style={{ background: "#059669", borderColor: "#059669" }}
                    >
                        Tandai Terbeli Semua ({selectedRowKeys.length})
                    </Button>
                    <Button
                        type="primary"
                        icon={<FileExcelOutlined />}
                        onClick={generateCrossTabXLSX}
                        loading={generatingPdf}
                        disabled={selectedRowKeys.length === 0}
                        style={{ background: "#0F5B99" }}
                    >
                        Tarik Rekapan Excel ({selectedRowKeys.length})
                    </Button>
                    <Button
                        type="primary"
                        icon={<PrinterOutlined />}
                        onClick={() => {
                            const selectedRecords = requests.filter((r) => selectedRowKeys.includes(r.id));
                            if (selectedRecords.length === 0) {
                                message.warning("Pilih minimal 1 pengajuan pegawai untuk mencetak BAST.");
                                return;
                            }
                            setBastTargetRequests(selectedRecords);
                            setBastModalVisible(true);
                        }}
                        disabled={selectedRowKeys.length === 0}
                        style={{ background: "#7e22ce", borderColor: "#7e22ce" }}
                    >
                        Cetak BAST Terpilih ({selectedRowKeys.length})
                    </Button>
                    <Button icon={<ReloadOutlined />} onClick={fetchRequests} loading={loading}>
                        Segarkan
                    </Button>
                </Space>
            </div>

            <Card className="content-card" styles={{ body: { padding: "12px 16px" } }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <Space wrap>
                        <Tag color="blue" style={{ fontSize: 13, padding: "4px 10px" }}>
                            Periode Aktif: {allPeriodsFilter ? "Semua Periode" : filterPeriod.format("MMMM YYYY")}
                        </Tag>
                        <Tag color="geekblue" style={{ fontSize: 13, padding: "4px 10px" }}>
                            Total Pengajuan: {requests.length}
                        </Tag>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                            Pilih baris pegawai untuk menarik rekapan Excel, atau ubah periode pengajuan jika diperlukan.
                        </Text>
                    </Space>
                    {requests.length > 0 && (
                        <Button
                            size="small"
                            icon={<CheckSquareOutlined />}
                            onClick={handleSelectAllFiltered}
                        >
                            Pilih Semua ({requests.length})
                        </Button>
                    )}
                </div>
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

            {/* Modal Detail Pengajuan */}
            <Modal
                title={
                    <Space>
                        <EyeOutlined style={{ color: "#0F5B99" }} />
                        <span>Detail Pengajuan PDTT</span>
                    </Space>
                }
                open={detailModalVisible}
                onCancel={() => setDetailModalVisible(false)}
                footer={null}
                width={850}
            >
                {selectedRequest && (
                    <Space direction="vertical" size="large" style={{ width: "100%", marginTop: 16 }}>
                        <Card size="small" style={{ background: "#f8fafc" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
                                <div>
                                    <Text type="secondary" style={{ display: "block" }}>Pegawai Pengusul</Text>
                                    <Text strong style={{ fontSize: 16 }}>{selectedRequest.creator?.name}</Text>
                                </div>
                                <div>
                                    <Text type="secondary" style={{ display: "block" }}>Periode</Text>
                                    <Space size="small">
                                        <Tag color="blue" style={{ margin: 0, fontSize: 13 }}>
                                            {dayjs(selectedRequest.period).format("MMMM YYYY")}
                                        </Tag>
                                        <Button
                                            type="link"
                                            size="small"
                                            icon={<EditOutlined />}
                                            onClick={() => {
                                                setTargetRequestForPeriod(selectedRequest);
                                                setNewPeriodValue(dayjs(selectedRequest.period));
                                                setChangePeriodModalVisible(true);
                                            }}
                                        >
                                            Ubah
                                        </Button>
                                    </Space>
                                </div>
                                <div>
                                    <Text type="secondary" style={{ display: "block" }}>Waktu Submit</Text>
                                    <Text strong>{dayjs(selectedRequest.created_at).format("DD MMMM YYYY, HH:mm")}</Text>
                                </div>
                                <div>
                                    <Text type="secondary" style={{ display: "block" }}>Status Terkini</Text>
                                    {getStatusTag(selectedRequest.status)}
                                </div>
                                <div>
                                    <Text type="secondary" style={{ display: "block" }}>Status Pembelian</Text>
                                    {getFulfillmentTag(selectedRequest.fulfillment_status)}
                                </div>
                            </div>
                        </Card>

                        {/* Mini Change Log Widget - Daftar Kecil Perubahan */}
                        {selectedRequest.change_log && selectedRequest.change_log.diffs?.length > 0 && (
                            <Card
                                size="small"
                                style={{
                                    background: selectedRequest.change_log.updated_by_role === "admin" ? "#faf5ff" : "#f0f9ff",
                                    borderColor: selectedRequest.change_log.updated_by_role === "admin" ? "#e9d5ff" : "#bae6fd",
                                    borderRadius: 8,
                                }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
                                    <Space size={6}>
                                        <HistoryOutlined style={{ color: selectedRequest.change_log.updated_by_role === "admin" ? "#7e22ce" : "#0369a1" }} />
                                        <Text strong style={{ fontSize: 13, color: selectedRequest.change_log.updated_by_role === "admin" ? "#6b21a8" : "#075985" }}>
                                            Daftar Perubahan Terakhir
                                        </Text>
                                        <Tag color={selectedRequest.change_log.updated_by_role === "admin" ? "purple" : "cyan"} style={{ fontWeight: 600, fontSize: 11 }}>
                                            {selectedRequest.change_log.updated_by_role === "admin" ? "Di-update Admin" : "Pengajuan Ulang User"}
                                        </Tag>
                                    </Space>
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                        {selectedRequest.change_log.updated_by_name} • {selectedRequest.change_log.updated_at}
                                    </Text>
                                </div>

                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                    {selectedRequest.change_log.diffs.map((df, idx) => {
                                        let badgeColor = "default";
                                        let prefix = "";
                                        let labelText = "";

                                        if (df.type === "added") {
                                            badgeColor = "success";
                                            prefix = "➕ Baru: ";
                                            labelText = `${df.item_name} (+${df.new_qty} buah)`;
                                        } else if (df.type === "increased") {
                                            badgeColor = "green";
                                            prefix = "📈 Bertambah: ";
                                            labelText = `${df.item_name} (${df.old_qty} ➔ ${df.new_qty} buah, +${df.diff})`;
                                        } else if (df.type === "decreased") {
                                            badgeColor = "volcano";
                                            prefix = "📉 Berkurang: ";
                                            labelText = `${df.item_name} (${df.old_qty} ➔ ${df.new_qty} buah, ${df.diff})`;
                                        } else if (df.type === "removed") {
                                            badgeColor = "error";
                                            prefix = "❌ Dihapus: ";
                                            labelText = `${df.item_name} (Dihapus, sebelumnya ${df.old_qty} buah)`;
                                        }

                                        return (
                                            <Tag key={idx} color={badgeColor} style={{ fontSize: 12, padding: "2px 8px", borderRadius: 4 }}>
                                                <strong>{prefix}</strong> {labelText}
                                            </Tag>
                                        );
                                    })}
                                </div>
                            </Card>
                        )}

                        <Table
                            rowKey="id"
                            dataSource={selectedRequest.items || []}
                            columns={detailColumns}
                            pagination={false}
                            size="middle"
                            summary={(pageData) => {
                                let totalEstimasi = 0;
                                let totalRealisasi = 0;
                                pageData.forEach(({ harga_saat_ini, harga_terbeli, jumlah, jumlah_terbeli }) => {
                                    const req = Number(jumlah) || 0;
                                    const bought = Number(jumlah_terbeli) || 0;
                                    const estPrice = Number(harga_saat_ini) || 0;
                                    const actualPrice = harga_terbeli !== null && harga_terbeli !== undefined ? Number(harga_terbeli) : estPrice;
                                    totalEstimasi += req * estPrice;
                                    totalRealisasi += bought * actualPrice;
                                });
                                const sisaUang = totalEstimasi - totalRealisasi;

                                return (
                                    <>
                                        <Table.Summary.Row>
                                            <Table.Summary.Cell index={0} colSpan={6} align="right">
                                                <Text type="secondary">Total Estimasi Awal:</Text>
                                            </Table.Summary.Cell>
                                            <Table.Summary.Cell index={1}>
                                                <Text strong style={{ fontSize: 13 }}>{formatCurrency(totalEstimasi)}</Text>
                                            </Table.Summary.Cell>
                                        </Table.Summary.Row>
                                        <Table.Summary.Row>
                                            <Table.Summary.Cell index={0} colSpan={6} align="right">
                                                <Text strong style={{ color: "#0F5B99" }}>Total Realisasi Pembelian:</Text>
                                            </Table.Summary.Cell>
                                            <Table.Summary.Cell index={1}>
                                                <Text strong style={{ color: "#0F5B99", fontSize: 15 }}>{formatCurrency(totalRealisasi)}</Text>
                                            </Table.Summary.Cell>
                                        </Table.Summary.Row>
                                        <Table.Summary.Row>
                                            <Table.Summary.Cell index={0} colSpan={6} align="right">
                                                <Text strong style={{ color: sisaUang >= 0 ? "#059669" : "#dc2626" }}>
                                                    {sisaUang >= 0 ? "Sisa Anggaran / Hemat (Sisa Uang):" : "Defisit (Melebihi Estimasi):"}
                                                </Text>
                                            </Table.Summary.Cell>
                                            <Table.Summary.Cell index={1}>
                                                <Tag color={sisaUang >= 0 ? "success" : "error"} style={{ fontSize: 13, fontWeight: 700, padding: "2px 8px" }}>
                                                    {formatCurrency(Math.abs(sisaUang))}
                                                </Tag>
                                            </Table.Summary.Cell>
                                        </Table.Summary.Row>
                                    </>
                                );
                            }}
                        />

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16, borderTop: "1px solid #f0f0f0", paddingTop: 16 }}>
                            <Button
                                icon={<EditOutlined />}
                                onClick={() => {
                                    setDetailModalVisible(false);
                                    handleOpenEditRequest(selectedRequest);
                                }}
                                style={{ background: "#2563eb", color: "#ffffff" }}
                            >
                                Update Permintaan
                            </Button>
                            <Button
                                icon={<ShoppingCartOutlined />}
                                onClick={() => {
                                    setDetailModalVisible(false);
                                    handleOpenFulfillment(selectedRequest);
                                }}
                                style={{ background: "#059669", color: "#ffffff" }}
                            >
                                Input Realisasi Pembelian
                            </Button>
                            <Button
                                icon={<PrinterOutlined />}
                                onClick={() => {
                                    setBastTargetRequests([selectedRequest]);
                                    setBastModalVisible(true);
                                }}
                                style={{ background: "#7e22ce", color: "#ffffff", borderColor: "#7e22ce" }}
                            >
                                Cetak BAST
                            </Button>

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
                                        style={{ background: "#059669" }}
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

            {/* Modal Input Realisasi Pembelian (Corporate Minimalist Design) */}
            <Modal
                title={
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            background: "#e0f2fe",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}>
                            <ShoppingOutlined style={{ color: "#0284c7", fontSize: 20 }} />
                        </div>
                        <div>
                            <span style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", display: "block", lineHeight: 1.2 }}>
                                Input Realisasi Pembelian Barang
                            </span>
                            <span style={{ fontSize: 12, color: "#64748b", fontWeight: 400 }}>
                                Catat status dan jumlah kuantitas barang yang telah dipenuhi/dibelikan.
                            </span>
                        </div>
                    </div>
                }
                open={fulfillmentModalVisible}
                onCancel={() => {
                    setFulfillmentModalVisible(false);
                    setFulfillmentTarget(null);
                }}
                onOk={handleSaveFulfillment}
                confirmLoading={savingFulfillment}
                okText="Simpan Realisasi Pembelian"
                cancelText="Batal"
                okButtonProps={{ style: { background: "#0F5B99" }, icon: <CheckOutlined /> }}
                width={960}
                centered
                destroyOnClose
            >
                {fulfillmentTarget && (() => {
                    const totalReq = fulfillmentItems.reduce((a, b) => a + b.jumlah, 0);
                    const totalPurchased = fulfillmentItems.reduce((a, b) => a + b.jumlah_terbeli, 0);
                    const percent = totalReq > 0 ? Math.min(100, Math.round((totalPurchased / totalReq) * 100)) : 0;
                    const isAllFull = fulfillmentItems.length > 0 && fulfillmentItems.every((it) => it.is_full);

                    const totalEstCost = fulfillmentItems.reduce((a, b) => a + (b.jumlah * b.harga_saat_ini), 0);
                    const totalActualCost = fulfillmentItems.reduce((a, b) => a + (b.jumlah_terbeli * (b.harga_terbeli !== null && b.harga_terbeli !== undefined ? b.harga_terbeli : b.harga_saat_ini)), 0);
                    const remainingBudget = totalEstCost - totalActualCost;

                    const fulfillmentColumns = [
                        {
                            title: "Nama Barang & Spesifikasi",
                            key: "item_name",
                            width: 220,
                            render: (_, r) => (
                                <div>
                                    <Text strong style={{ fontSize: 13, display: "block" }}>{r.raw_name || r.item_name}</Text>
                                    <Space size={4} style={{ marginTop: 2, flexWrap: "wrap" }}>
                                        {r.ukuran && <Tag color="cyan" style={{ fontSize: 10 }}>Ukuran: {r.ukuran}</Tag>}
                                        <Tag color="blue" style={{ fontSize: 10 }}>Merek: {r.brand}</Tag>
                                    </Space>
                                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                                        Est. Awal: <Text type="secondary" style={{ fontSize: 11 }}>{formatCurrency(r.harga_saat_ini)} / buah</Text>
                                    </div>
                                </div>
                            ),
                        },
                        {
                            title: "Diminta",
                            key: "jumlah",
                            width: 95,
                            render: (_, r) => (
                                <Tag color="geekblue" style={{ fontWeight: 600 }}>
                                    {r.jumlah} buah
                                </Tag>
                            ),
                        },
                        {
                            title: "Harga Realisasi / Pcs",
                            key: "harga_terbeli",
                            width: 155,
                            render: (_, r) => (
                                <InputNumber
                                    min={0}
                                    value={r.harga_terbeli}
                                    onChange={(val) => handleItemPriceChange(r.id, val)}
                                    formatter={(val) => val ? `Rp ${String(val).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}` : ""}
                                    parser={(val) => val ? Number(val.replace(/[^0-9]/g, "")) : 0}
                                    style={{ width: "100%" }}
                                />
                            ),
                        },
                        {
                            title: "Status Terbeli",
                            key: "is_full",
                            width: 130,
                            align: "center",
                            render: (_, r) => (
                                <Checkbox
                                    checked={r.is_full}
                                    onChange={(e) => handleToggleItemFull(r.id, e.target.checked)}
                                >
                                    <span style={{ fontSize: 12, fontWeight: r.is_full ? 600 : 400, color: r.is_full ? "#059669" : "#475569" }}>
                                        Terbeli Semua
                                    </span>
                                </Checkbox>
                            ),
                        },
                        {
                            title: "Jumlah Terbeli",
                            key: "jumlah_terbeli",
                            width: 135,
                            render: (_, r) => (
                                <InputNumber
                                    min={0}
                                    value={r.jumlah_terbeli}
                                    onChange={(val) => handleItemQtyChange(r.id, val)}
                                    addonAfter="buah"
                                    style={{ width: "100%" }}
                                />
                            ),
                        },
                        {
                            title: "Subtotal Realisasi",
                            key: "subtotal_realisasi",
                            width: 145,
                            align: "right",
                            render: (_, r) => (
                                <Text strong style={{ color: "#0F5B99" }}>
                                    {formatCurrency(r.jumlah_terbeli * (r.harga_terbeli !== null && r.harga_terbeli !== undefined ? r.harga_terbeli : r.harga_saat_ini))}
                                </Text>
                            ),
                        },
                    ];

                    return (
                        <div style={{ marginTop: 12 }}>
                            {/* Corporate Header Info Box */}
                            <Card size="small" style={{ background: "#f8fafc", borderColor: "#e2e8f0", borderRadius: 8, marginBottom: 16 }}>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, alignItems: "center" }}>
                                    <div>
                                        <Text type="secondary" style={{ fontSize: 11, display: "block" }}>Pegawai Pengusul</Text>
                                        <Text strong style={{ fontSize: 14, color: "#0f172a" }}>{fulfillmentTarget.creator?.name}</Text>
                                    </div>
                                    <div>
                                        <Text type="secondary" style={{ fontSize: 11, display: "block" }}>Periode Pengajuan</Text>
                                        <Tag color="blue" style={{ fontWeight: 600, margin: 0 }}>{dayjs(fulfillmentTarget.period).format("MMMM YYYY")}</Tag>
                                    </div>
                                    <div>
                                        <Text type="secondary" style={{ fontSize: 11, display: "block" }}>Total Estimasi Awal</Text>
                                        <Text strong style={{ fontSize: 13, color: "#475569" }}>{formatCurrency(totalEstCost)}</Text>
                                    </div>
                                    <div>
                                        <Text type="secondary" style={{ fontSize: 11, display: "block" }}>Total Realisasi</Text>
                                        <Text strong style={{ fontSize: 14, color: "#0F5B99" }}>{formatCurrency(totalActualCost)}</Text>
                                    </div>
                                    <div>
                                        <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                                            {remainingBudget >= 0 ? "Sisa Uang (Hemat)" : "Defisit (Lebih Mahal)"}
                                        </Text>
                                        <Tag color={remainingBudget >= 0 ? "success" : "error"} style={{ fontWeight: 700, fontSize: 12, padding: "2px 8px", margin: 0 }}>
                                            {formatCurrency(Math.abs(remainingBudget))}
                                        </Tag>
                                    </div>
                                </div>
                                <Divider style={{ margin: "10px 0 8px 0" }} />
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                                    <Text type="secondary">Progres Kuantitas Terbeli:</Text>
                                    <Text strong>{percent}% ({totalPurchased}/{totalReq} buah)</Text>
                                </div>
                                <Progress
                                    percent={percent}
                                    showInfo={false}
                                    strokeColor={percent === 100 ? "#10b981" : "#0F5B99"}
                                    size="small"
                                />
                            </Card>

                            {/* Mini Change Log Widget in Realisasi Pembelian Modal */}
                            {fulfillmentTarget.change_log && fulfillmentTarget.change_log.diffs?.length > 0 && (
                                <Card
                                    size="small"
                                    style={{
                                        background: fulfillmentTarget.change_log.updated_by_role === "admin" ? "#faf5ff" : "#f0f9ff",
                                        borderColor: fulfillmentTarget.change_log.updated_by_role === "admin" ? "#e9d5ff" : "#bae6fd",
                                        borderRadius: 8,
                                        marginBottom: 12,
                                    }}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
                                        <Space size={6}>
                                            <HistoryOutlined style={{ color: fulfillmentTarget.change_log.updated_by_role === "admin" ? "#7e22ce" : "#0369a1" }} />
                                            <Text strong style={{ fontSize: 12, color: fulfillmentTarget.change_log.updated_by_role === "admin" ? "#6b21a8" : "#075985" }}>
                                                Catatan Perubahan Item Terakhir (Sebelum Input Realisasi):
                                            </Text>
                                            <Tag color={fulfillmentTarget.change_log.updated_by_role === "admin" ? "purple" : "cyan"} style={{ fontWeight: 600, fontSize: 10 }}>
                                                {fulfillmentTarget.change_log.updated_by_role === "admin" ? "Di-update Admin" : "Reorder Pegawai"}
                                            </Tag>
                                        </Space>
                                        <Text type="secondary" style={{ fontSize: 11 }}>
                                            {fulfillmentTarget.change_log.updated_by_name} • {fulfillmentTarget.change_log.updated_at}
                                        </Text>
                                    </div>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                        {fulfillmentTarget.change_log.diffs.map((df, idx) => {
                                            let badgeColor = "default";
                                            let prefix = "";
                                            let labelText = "";
                                            if (df.type === "added") {
                                                badgeColor = "success";
                                                prefix = "➕ Baru: ";
                                                labelText = `${df.item_name} (+${df.new_qty} buah)`;
                                            } else if (df.type === "increased") {
                                                badgeColor = "green";
                                                prefix = "📈 Bertambah: ";
                                                labelText = `${df.item_name} (${df.old_qty} ➔ ${df.new_qty} buah, +${df.diff})`;
                                            } else if (df.type === "decreased") {
                                                badgeColor = "volcano";
                                                prefix = "📉 Berkurang: ";
                                                labelText = `${df.item_name} (${df.old_qty} ➔ ${df.new_qty} buah, ${df.diff})`;
                                            } else if (df.type === "removed") {
                                                badgeColor = "error";
                                                prefix = "❌ Dihapus: ";
                                                labelText = `${df.item_name} (Dihapus, sebelumnya ${df.old_qty} buah)`;
                                            }
                                            return (
                                                <Tag key={idx} color={badgeColor} style={{ fontSize: 11, padding: "1px 6px", borderRadius: 4 }}>
                                                    <strong>{prefix}</strong> {labelText}
                                                </Tag>
                                            );
                                        })}
                                    </div>
                                </Card>
                            )}

                            {/* Toolbar Centang Massal */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "8px 12px", background: "#ffffff", border: "1px solid #f1f5f9", borderRadius: 6 }}>
                                <Text strong style={{ fontSize: 13, color: "#334155" }}>
                                    Item Barang yang Diajukan ({fulfillmentItems.length} jenis)
                                </Text>
                                <Checkbox
                                    checked={isAllFull}
                                    onChange={(e) => handleToggleAllFull(e.target.checked)}
                                    style={{ fontWeight: 600, color: "#0F5B99" }}
                                >
                                    Centang Semua Terbeli Lengkap
                                </Checkbox>
                            </div>

                            {/* Table List Items */}
                            <Table
                                rowKey="id"
                                dataSource={fulfillmentItems}
                                columns={fulfillmentColumns}
                                pagination={false}
                                size="small"
                                bordered
                            />
                        </div>
                    );
                })()}
            </Modal>

            {/* Modal Ubah Periode */}
            <Modal
                title={
                    <Space>
                        <CalendarOutlined style={{ color: "#0F5B99" }} />
                        <span>Ubah Periode Pengajuan</span>
                    </Space>
                }
                open={changePeriodModalVisible}
                onCancel={() => {
                    setChangePeriodModalVisible(false);
                    setTargetRequestForPeriod(null);
                }}
                onOk={handleChangePeriod}
                confirmLoading={savingPeriod}
                okText="Simpan Periode"
                cancelText="Batal"
                width={420}
                centered
            >
                {targetRequestForPeriod && (
                    <div style={{ padding: "12px 0" }}>
                        <Text style={{ display: "block", marginBottom: 12 }}>
                            Ubah periode pengajuan untuk <strong>{targetRequestForPeriod.creator?.name}</strong>:
                        </Text>
                        <div style={{ marginBottom: 16 }}>
                            <Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 4 }}>
                                Periode Saat Ini:
                            </Text>
                            <Tag color="blue" style={{ fontSize: 13, padding: "2px 8px" }}>
                                {dayjs(targetRequestForPeriod.period).format("MMMM YYYY")}
                            </Tag>
                        </div>
                        <div>
                            <Text strong style={{ display: "block", marginBottom: 6 }}>
                                Pilih Periode Baru:
                            </Text>
                            <DatePicker
                                picker="month"
                                value={newPeriodValue}
                                onChange={(val) => setNewPeriodValue(val || dayjs())}
                                format="MMMM YYYY"
                                allowClear={false}
                                style={{ width: "100%" }}
                            />
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal Update Permintaan */}
            <Modal
                title={
                    <Space>
                        <EditOutlined style={{ color: "#2563eb" }} />
                        <span style={{ fontWeight: 600 }}>Update Permintaan Pengadaan</span>
                    </Space>
                }
                open={editModalVisible}
                onCancel={() => {
                    setEditModalVisible(false);
                    setEditRequestTarget(null);
                }}
                onOk={handleSaveEditRequest}
                confirmLoading={savingEditRequest}
                okText="Simpan Perubahan"
                cancelText="Batal"
                width={780}
                centered
                destroyOnClose
            >
                {editRequestTarget && (
                    <div style={{ padding: "4px 0" }}>
                        {/* Header Box: Pegawai & Periode Selector */}
                        <Card size="small" style={{ background: "#f8fafc", borderColor: "#e2e8f0", borderRadius: 8, marginBottom: 16 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                                <div>
                                    <Text type="secondary" style={{ fontSize: 11, display: "block" }}>Pegawai Pengusul</Text>
                                    <Text strong style={{ fontSize: 15, color: "#0f172a" }}>{editRequestTarget.creator?.name || "Unknown"}</Text>
                                </div>
                                <div>
                                    <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 2 }}>Periode Pengajuan</Text>
                                    <DatePicker
                                        picker="month"
                                        value={editPeriod}
                                        onChange={handleEditPeriodChange}
                                        format="MMMM YYYY"
                                        allowClear={false}
                                        size="middle"
                                        style={{ borderRadius: 6, fontWeight: 500 }}
                                    />
                                </div>
                            </div>
                        </Card>

                        {/* Live Budget & Remaining Allowance Banner */}
                        {(() => {
                            const totalCost = editItems.reduce((acc, it) => acc + (Number(it.jumlah) || 0) * (Number(it.harga_saat_ini) || 0), 0);
                            const sisa = editUserSaldo - totalCost;
                            const isOver = sisa < 0;

                            return (
                                <Card
                                    size="small"
                                    style={{
                                        background: isOver ? "#fff1f2" : "#f0fdf4",
                                        borderColor: isOver ? "#fecdd3" : "#bbf7d0",
                                        borderRadius: 8,
                                        marginBottom: 16,
                                    }}
                                >
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, alignItems: "center" }}>
                                        <div>
                                            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                                                Saldo Anggaran ({editUserDays} Hari)
                                            </Text>
                                            <Text strong style={{ fontSize: 14, color: "#1e293b" }}>
                                                {formatCurrency(editUserSaldo)}
                                            </Text>
                                        </div>
                                        <div>
                                            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                                                Total Estimasi Disesuaikan
                                            </Text>
                                            <Text strong style={{ fontSize: 14, color: "#2563eb" }}>
                                                {formatCurrency(totalCost)}
                                            </Text>
                                        </div>
                                        <div>
                                            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                                                Sisa Anggaran Permintaan
                                            </Text>
                                            <Tag
                                                color={isOver ? "error" : "success"}
                                                style={{ fontWeight: 700, fontSize: 13, padding: "2px 10px", margin: 0, borderRadius: 6 }}
                                            >
                                                {formatCurrency(sisa)}
                                            </Tag>
                                        </div>
                                    </div>
                                    {isOver && (
                                        <Text type="danger" style={{ fontSize: 11, display: "block", marginTop: 8, fontWeight: 500 }}>
                                            ⚠️ Perhatian: Total harga permintaan barang melebihi saldo anggaran pegawai untuk periode ini!
                                        </Text>
                                    )}
                                </Card>
                            );
                        })()}

                        {/* Catalog Item Picker Dropdown */}
                        <div style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}>
                            <Select
                                showSearch
                                placeholder="Pilih & tambah barang dari katalog PDTT..."
                                optionFilterProp="children"
                                style={{ flex: 1 }}
                                value={selectedCatalogItemId}
                                onChange={(val) => {
                                    setSelectedCatalogItemId(val);
                                    handleAddCatalogItemToEdit(val);
                                }}
                                loading={editLoadingItems}
                                notFoundContent={editLoadingItems ? <Spin size="small" /> : "Tidak ada barang tersedia"}
                            >
                                {editCatalogItems.map((c) => {
                                    const spec = getItemVolumeSpec(c);
                                    const label = spec ? `${c.item_name} (${spec}) - ${c.brand || "-"}` : `${c.item_name} - ${c.brand || "-"}`;
                                    return (
                                        <Select.Option key={c.id} value={c.id}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                <span>{label}</span>
                                                <span style={{ color: "#2563eb", fontWeight: 600, marginLeft: 12 }}>
                                                    {formatCurrency(c.price)}
                                                </span>
                                            </div>
                                        </Select.Option>
                                    );
                                })}
                            </Select>
                        </div>

                        {/* Table of Requested Items */}
                        <Spin spinning={editLoadingItems}>
                            <Table
                                rowKey="pdtt_item_id"
                                dataSource={editItems}
                                pagination={false}
                                size="small"
                                bordered
                                columns={[
                                    {
                                        title: "Nama Barang",
                                        key: "item_name",
                                        render: (_, r) => (
                                            <div>
                                                <Text strong style={{ fontSize: 13, display: "block" }}>{r.item_name}</Text>
                                                <Text type="secondary" style={{ fontSize: 11 }}>
                                                    Merek: {r.brand || "-"} {r.satuan ? `| ${r.satuan}` : ""}
                                                </Text>
                                            </div>
                                        ),
                                    },
                                    {
                                        title: "Harga Satuan",
                                        dataIndex: "harga_saat_ini",
                                        key: "harga_saat_ini",
                                        width: 130,
                                        align: "right",
                                        render: (v) => <Text style={{ fontSize: 12 }}>{formatCurrency(v)}</Text>,
                                    },
                                    {
                                        title: "Kuantitas (Qty)",
                                        key: "jumlah",
                                        width: 145,
                                        align: "center",
                                        render: (_, r) => (
                                            <InputNumber
                                                min={1}
                                                value={r.jumlah}
                                                onChange={(val) => handleEditItemQtyChange(r.pdtt_item_id, val)}
                                                addonAfter="buah"
                                                style={{ width: "100%" }}
                                            />
                                        ),
                                    },
                                    {
                                        title: "Subtotal",
                                        key: "subtotal",
                                        width: 135,
                                        align: "right",
                                        render: (_, r) => (
                                            <Text strong style={{ color: "#0F5B99" }}>
                                                {formatCurrency((Number(r.jumlah) || 0) * (Number(r.harga_saat_ini) || 0))}
                                            </Text>
                                        ),
                                    },
                                    {
                                        title: "",
                                        key: "action",
                                        width: 45,
                                        align: "center",
                                        render: (_, r) => (
                                            <Tooltip title="Hapus item dari pengajuan">
                                                <Button
                                                    type="text"
                                                    danger
                                                    icon={<DeleteOutlined />}
                                                    onClick={() => handleRemoveEditItem(r.pdtt_item_id)}
                                                />
                                            </Tooltip>
                                        ),
                                    },
                                ]}
                            />
                        </Spin>
                    </div>
                )}
            </Modal>

            {/* Modal Cetak BAST - Tanda Terima PDTT */}
            <Modal
                title={
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            background: "#f3e8ff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}>
                            <PrinterOutlined style={{ color: "#7e22ce", fontSize: 20 }} />
                        </div>
                        <div>
                            <span style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", display: "block", lineHeight: 1.2 }}>
                                Cetak BAST - Tanda Terima PDTT ({bastTargetRequests.length} Pegawai)
                            </span>
                            <span style={{ fontSize: 12, color: "#64748b", fontWeight: 400 }}>
                                Pratinjau dan cetak/unduh Berita Acara Serah Terima per orang atau batch terpilih.
                            </span>
                        </div>
                    </div>
                }
                open={bastModalVisible}
                onCancel={() => {
                    setBastModalVisible(false);
                    setBastTargetRequests([]);
                }}
                footer={[
                    <Button key="close" onClick={() => setBastModalVisible(false)}>
                        Tutup
                    </Button>,
                    <Button
                        key="pdf"
                        icon={<FilePdfOutlined />}
                        onClick={handleDownloadBastPdf}
                        style={{ background: "#dc2626", color: "#fff", borderColor: "#dc2626" }}
                    >
                        Unduh File PDF
                    </Button>,
                    <Button
                        key="print"
                        type="primary"
                        icon={<PrinterOutlined />}
                        onClick={handlePrintBastWindow}
                        style={{ background: "#7e22ce", borderColor: "#7e22ce" }}
                    >
                        Cetak / Print Window
                    </Button>,
                ]}
                width={920}
                centered
                destroyOnClose
            >
                <div style={{ background: "#faf5ff", border: "1px solid #e9d5ff", padding: 14, borderRadius: 8, marginBottom: 16 }}>
                    <Text strong style={{ display: "block", marginBottom: 8, color: "#6b21a8", fontSize: 13 }}>
                        Pengaturan Tanda Tangan & Keterangan BAST:
                    </Text>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                        <div>
                            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>Nama PPK</Text>
                            <Input value={ppkName} onChange={(e) => setPpkName(e.target.value)} size="small" />
                        </div>
                        <div>
                            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>NIP PPK</Text>
                            <Input value={ppkNip} onChange={(e) => setPpkNip(e.target.value)} size="small" />
                        </div>
                        <div>
                            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>Kota Ttd</Text>
                            <Input value={cityName} onChange={(e) => setCityName(e.target.value)} size="small" />
                        </div>
                        <div>
                            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>Tanggal Ttd</Text>
                            <Input value={bastDate} onChange={(e) => setBastDate(e.target.value)} size="small" />
                        </div>
                    </div>
                </div>

                {/* Live Preview List Container */}
                <div style={{ maxHeight: "55vh", overflowY: "auto", background: "#f8fafc", padding: 16, borderRadius: 8, border: "1px solid #cbd5e1" }}>
                    {bastTargetRequests.map((req, idx) => {
                        const creatorName = req.creator?.name || "Pegawai";
                        const creatorNip = req.creator?.nip || "-";
                        const periodStr = req.period ? dayjs(req.period).format("MMMM YYYY") : "-";
                        const jmlHari = req.jumlah_hari || 0;
                        const totalUangStr = formatCurrency(req.total_uang || (jmlHari * 19000));
                        const items = req.items || [];

                        let totalQty = 0;
                        let totalSumPrice = 0;

                        return (
                            <Card
                                key={idx}
                                style={{
                                    marginBottom: idx < bastTargetRequests.length - 1 ? 24 : 0,
                                    border: "1.5pt solid #000",
                                    fontFamily: "'Times New Roman', Times, serif",
                                    color: "#000",
                                    background: "#ffffff"
                                }}
                                styles={{ body: { padding: 24 } }}
                            >
                                <h3 style={{ textAlign: "center", fontSize: "16pt", fontWeight: "bold", textTransform: "uppercase", letterSpacing: 1, marginTop: 0, marginBottom: 20 }}>
                                    TANDA TERIMA PDTT
                                </h3>

                                <table style={{ width: "100%", marginBottom: 16, fontSize: "11pt", lineHeight: 1.6 }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ width: 140, fontWeight: "bold" }}>Nama</td>
                                            <td style={{ width: 15 }}>:</td>
                                            <td>{creatorName}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontWeight: "bold" }}>NIP</td>
                                            <td>:</td>
                                            <td>{creatorNip}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontWeight: "bold" }}>Periode</td>
                                            <td>:</td>
                                            <td>{periodStr}</td>
                                        </tr>
                                    </tbody>
                                </table>

                                <div style={{ marginBottom: 16, fontSize: "11pt", lineHeight: 1.6 }}>
                                    Jumlah hari kerja berhak mendapatkan PDTT : <strong>{jmlHari}</strong><br />
                                    {jmlHari} x Rp19,000 = <strong>{totalUangStr}</strong>
                                </div>

                                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20, fontSize: "11pt" }}>
                                    <thead>
                                        <tr style={{ background: "#f2f2f2", textAlign: "center" }}>
                                            <th style={{ border: "1pt solid #000", padding: "6px 8px", width: 40 }}>No</th>
                                            <th style={{ border: "1pt solid #000", padding: "6px 8px", textAlign: "left" }}>Uraian</th>
                                            <th style={{ border: "1pt solid #000", padding: "6px 8px", width: 80 }}>Jumlah</th>
                                            <th style={{ border: "1pt solid #000", padding: "6px 8px", width: 130, textAlign: "right" }}>Harga Satuan</th>
                                            <th style={{ border: "1pt solid #000", padding: "6px 8px", width: 140, textAlign: "right" }}>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((it, itemIdx) => {
                                            const pdttItem = it.pdtt_item || {};
                                            const itemName = getItemDisplayName(pdttItem);
                                            const qty = Number(it.jumlah_terbeli || it.jumlah || 0);
                                            const unitPrice = it.harga_terbeli !== null && it.harga_terbeli !== undefined ? Number(it.harga_terbeli) : Number(it.harga_saat_ini || pdttItem.price || 0);
                                            const subtotal = qty * unitPrice;

                                            totalQty += qty;
                                            totalSumPrice += subtotal;

                                            return (
                                                <tr key={itemIdx}>
                                                    <td style={{ border: "1pt solid #000", padding: "6px 8px", textAlign: "center" }}>{itemIdx + 1}</td>
                                                    <td style={{ border: "1pt solid #000", padding: "6px 8px" }}>{itemName}</td>
                                                    <td style={{ border: "1pt solid #000", padding: "6px 8px", textAlign: "center" }}>{qty}</td>
                                                    <td style={{ border: "1pt solid #000", padding: "6px 8px", textAlign: "right" }}>{formatCurrency(unitPrice)}</td>
                                                    <td style={{ border: "1pt solid #000", padding: "6px 8px", textAlign: "right", fontWeight: "bold" }}>{formatCurrency(subtotal)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ fontWeight: "bold", background: "#fafafa" }}>
                                            <td colSpan={2} style={{ border: "1pt solid #000", padding: "8px", textAlign: "right" }}>Total</td>
                                            <td style={{ border: "1pt solid #000", padding: "8px", textAlign: "center" }}>{totalQty}</td>
                                            <td style={{ border: "1pt solid #000", padding: "8px" }}></td>
                                            <td style={{ border: "1pt solid #000", padding: "8px", textAlign: "right" }}>{formatCurrency(totalSumPrice)}</td>
                                        </tr>
                                    </tfoot>
                                </table>

                                <div style={{ marginBottom: 25, fontSize: "11pt" }}>
                                    Telah menerima PDTT sesuai rincian diatas,
                                </div>

                                <div style={{ textAlign: "right", fontSize: "11pt", marginBottom: 8, paddingRight: 35 }}>
                                    {cityName}, {bastDate}
                                </div>

                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11pt", textAlign: "center" }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ width: "50%", verticalAlign: "top" }}>
                                                Pejabat Pembuat Komitmen,
                                                <br /><br /><br /><br /><br />
                                                <strong style={{ textDecoration: "underline" }}>{ppkName}</strong><br />
                                                <span>NIP. {ppkNip}</span>
                                            </td>
                                            <td style={{ width: "50%", verticalAlign: "top" }}>
                                                Penerima PDTT,
                                                <br /><br /><br /><br /><br />
                                                <strong style={{ textDecoration: "underline" }}>{creatorName}</strong><br />
                                                <span>NIP. {creatorNip}</span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </Card>
                        );
                    })}
                </div>
            </Modal>
        </div>
    );
}
