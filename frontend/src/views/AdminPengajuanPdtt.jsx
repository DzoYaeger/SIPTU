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
import "./PengadaanPdtt.css";

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
        const parts = [];
        if (pdttItem.item_name) parts.push(pdttItem.item_name.trim());
        if (pdttItem.brand) parts.push(pdttItem.brand.trim());
        if (pdttItem.jumlah !== undefined && pdttItem.jumlah !== null && pdttItem.jumlah !== "") {
            parts.push(String(pdttItem.jumlah).trim());
        }
        if (pdttItem.satuan) parts.push(pdttItem.satuan.trim());
        return parts.length > 0 ? parts.join(" ") : "-";
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

    const getStatusLabel = (status) => {
        switch (status) {
            case "pending": return "Menunggu";
            case "approved": return "Disetujui";
            case "rejected": return "Ditolak";
            case "processed": return "Diproses";
            case "updated": return "Diubah";
            case "reorder": return "Reorder";
            default: return status || "-";
        }
    };

    const handleDownloadRekapanPdf = async (selectedOnly = false) => {
        const targetRequests = (selectedOnly && selectedRowKeys.length > 0)
            ? requests.filter(r => selectedRowKeys.includes(r.id))
            : (selectedRowKeys.length > 0 ? requests.filter(r => selectedRowKeys.includes(r.id)) : requests);

        if (!targetRequests || targetRequests.length === 0) {
            message.warning("Tidak ada data pengajuan untuk diunduh.");
            return;
        }

        setGeneratingPdf(true);
        try {
            const [{ jsPDF }, { default: autoTable }] = await Promise.all([
                import('jspdf'),
                import('jspdf-autotable'),
            ]);

            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4',
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 14;
            const periodStr = allPeriodsFilter ? "Semua Periode" : filterPeriod.format("MMMM YYYY");

            // ── Kop & Header ──
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13);
            doc.setTextColor(15, 23, 42);
            doc.text("BADAN PENGAWAS OBAT DAN MAKANAN", pageWidth / 2, 14, { align: 'center' });
            
            doc.setFontSize(11.5);
            doc.text("BALAI PENGAWAS OBAT DAN MAKANAN DI PALOPO", pageWidth / 2, 20, { align: 'center' });
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(71, 85, 105);
            doc.text(`LAPORAN REKAPITULASI PENGAJUAN PENGADAAN LANGSUNG (PDTT) — ${periodStr.toUpperCase()}`, pageWidth / 2, 26, { align: 'center' });

            doc.setDrawColor(203, 213, 225);
            doc.setLineWidth(0.5);
            doc.line(margin, 29, pageWidth - margin, 29);

            // ── Metadata Bar ──
            doc.setFontSize(8.5);
            doc.setTextColor(100, 116, 139);
            doc.text(`Waktu Tarik Laporan: ${dayjs().format('DD MMMM YYYY, HH:mm')} WITA`, margin, 34);
            doc.text(`Jumlah Pengajuan: ${targetRequests.length} Pegawai  |  Cakupan: ${selectedRowKeys.length > 0 && selectedOnly ? 'Data Terpilih' : (allPeriodsFilter ? 'Semua Periode' : 'Periode Aktif')}`, pageWidth - margin, 34, { align: 'right' });

            // ── Build Data Rows ──
            let totalAllNominal = 0;
            let totalAllQty = 0;
            let totalAllBought = 0;
            const tableRows = [];
            let rowNo = 1;

            targetRequests.forEach((req) => {
                const creatorName = req.creator?.name || "Pegawai";
                const creatorNip = req.creator?.nip ? `\nNIP. ${req.creator.nip}` : "";
                const items = req.items || [];
                const reqPeriod = req.period ? dayjs(req.period).format("MMM YYYY") : "-";

                if (items.length === 0) {
                    tableRows.push([
                        rowNo++,
                        `${creatorName}${creatorNip}`,
                        reqPeriod,
                        "Tidak ada rincian barang",
                        "-",
                        "-",
                        "-",
                        "-",
                        getStatusLabel(req.status),
                    ]);
                } else {
                    items.forEach((it, itemIdx) => {
                        const pdttItem = it.pdtt_item || {};
                        const itemName = getItemDisplayName(pdttItem);
                        const qty = Number(it.jumlah || 0);
                        const bought = Number(it.jumlah_terbeli || 0);
                        const unitPrice = it.harga_terbeli !== null && it.harga_terbeli !== undefined
                            ? Number(it.harga_terbeli)
                            : Number(it.harga_saat_ini || pdttItem.price || 0);
                        const subtotal = (bought > 0 ? bought : qty) * unitPrice;

                        totalAllQty += qty;
                        totalAllBought += bought;
                        totalAllNominal += subtotal;

                        tableRows.push([
                            itemIdx === 0 ? rowNo++ : "",
                            itemIdx === 0 ? `${creatorName}${creatorNip}` : "",
                            itemIdx === 0 ? reqPeriod : "",
                            itemName,
                            `${qty}`,
                            `${bought}`,
                            formatCurrency(unitPrice),
                            formatCurrency(subtotal),
                            bought >= qty && qty > 0 ? "Lengkap" : (bought > 0 ? "Sebagian" : "Menunggu"),
                        ]);
                    });
                }
            });

            // ── Render Table ──
            autoTable(doc, {
                startY: 37,
                margin: { left: margin, right: margin },
                head: [[
                    'No',
                    'Pegawai Pengusul',
                    'Periode',
                    'Rincian Barang & Spesifikasi',
                    'Diajukan',
                    'Terbeli',
                    'Harga Satuan',
                    'Subtotal Realisasi',
                    'Status'
                ]],
                body: tableRows,
                styles: {
                    font: 'helvetica',
                    fontSize: 8.5,
                    cellPadding: 2.2,
                    lineColor: [226, 232, 240],
                    lineWidth: 0.2,
                    textColor: [30, 41, 59],
                    valign: 'middle',
                },
                headStyles: {
                    fillColor: [15, 91, 153],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    halign: 'center',
                    fontSize: 8.5,
                },
                alternateRowStyles: {
                    fillColor: [248, 250, 252],
                },
                columnStyles: {
                    0: { halign: 'center', cellWidth: 10 },
                    1: { halign: 'left', cellWidth: 52 },
                    2: { halign: 'center', cellWidth: 22 },
                    3: { halign: 'left' },
                    4: { halign: 'center', cellWidth: 18 },
                    5: { halign: 'center', cellWidth: 18 },
                    6: { halign: 'right', cellWidth: 28 },
                    7: { halign: 'right', cellWidth: 34, fontStyle: 'bold' },
                    8: { halign: 'center', cellWidth: 22 },
                },
            });

            // ── Bottom Summary & Signature ──
            let currentY = doc.lastAutoTable.finalY + 6;
            if (currentY > pageHeight - 45) {
                doc.addPage();
                currentY = 16;
            }

            // Summary Info Box
            doc.setFillColor(241, 245, 249);
            doc.setDrawColor(203, 213, 225);
            doc.roundedRect(margin, currentY, 120, 16, 2, 2, 'FD');

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(71, 85, 105);
            doc.text(`Total Qty Diajukan: ${totalAllQty} buah  |  Total Terbeli: ${totalAllBought} buah`, margin + 4, currentY + 6);
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9.5);
            doc.setTextColor(15, 91, 153);
            doc.text(`Akumulasi Total Anggaran: ${formatCurrency(totalAllNominal)}`, margin + 4, currentY + 12);

            // Signature
            const sigX = pageWidth - margin - 65;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(30, 41, 59);
            doc.text(`Palopo, ${dayjs().format('DD MMMM YYYY')}`, sigX, currentY + 4);
            doc.text("Pejabat Pembuat Komitmen (PPK),", sigX, currentY + 9);
            
            doc.setFont('helvetica', 'bold');
            doc.text(ppkName, sigX, currentY + 28);
            doc.setFont('helvetica', 'normal');
            doc.text(`NIP. ${ppkNip}`, sigX, currentY + 33);

            const cleanPeriod = allPeriodsFilter ? "Semua_Periode" : filterPeriod.format("YYYY-MM");
            const fileName = `Laporan_Rekapan_PDTT_${cleanPeriod}_${dayjs().format('YYYYMMDD_HHmm')}.pdf`;
            doc.save(fileName);
            message.success(`Laporan PDF ${fileName} berhasil diunduh.`);
        } catch (err) {
            console.error("PDF Export error:", err);
            message.error(`Gagal mengunduh file PDF: ${err.message || 'Terjadi kesalahan'}`);
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
                    <Title level={4} className="module-title" style={{ margin: 0 }}>
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
                    <Dropdown
                        menu={{
                            items: [
                                {
                                    key: 'pdf-selected',
                                    icon: <FilePdfOutlined style={{ color: '#dc2626' }} />,
                                    label: `Unduh PDF Terpilih (${selectedRowKeys.length || '0'})`,
                                    disabled: selectedRowKeys.length === 0,
                                    onClick: () => handleDownloadRekapanPdf(true),
                                },
                                {
                                    key: 'pdf-all',
                                    icon: <FilePdfOutlined style={{ color: '#0F5B99' }} />,
                                    label: `Unduh PDF Semua Data (${requests.length})`,
                                    onClick: () => handleDownloadRekapanPdf(false),
                                },
                            ]
                        }}
                        placement="bottomRight"
                    >
                        <Button
                            type="primary"
                            icon={<FilePdfOutlined />}
                            onClick={() => handleDownloadRekapanPdf(selectedRowKeys.length > 0)}
                            loading={generatingPdf}
                            style={{ background: "#dc2626", borderColor: "#dc2626" }}
                        >
                            {selectedRowKeys.length > 0 ? `Tarik PDF (${selectedRowKeys.length})` : "Tarik Laporan PDF"}
                        </Button>
                    </Dropdown>

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

            {/* Modal Detail Pengajuan (Unified Design System) */}
            <Modal
                className="pdtt-modal"
                title={
                    <div className="pdtt-modal-header">
                        <div className="pdtt-modal-header__icon pdtt-modal-header__icon--blue">
                            <EyeOutlined />
                        </div>
                        <div>
                            <div className="pdtt-modal-header__title">Detail Pengajuan PDTT</div>
                            <div className="pdtt-modal-header__sub">Rincian data pengajuan barang harian, estimasi, dan realisasi.</div>
                        </div>
                    </div>
                }
                open={detailModalVisible}
                onCancel={() => setDetailModalVisible(false)}
                footer={null}
                width={880}
                centered
                destroyOnClose
            >
                {selectedRequest && (
                    <div style={{ marginTop: 14 }}>
                        {/* Summary Grid Fieldset Card */}
                        <div className="pdtt-fieldset-card">
                            <div className="pdtt-summary-grid">
                                <div className="pdtt-summary-item">
                                    <span className="pdtt-summary-item__label">Pegawai Pengusul</span>
                                    <span className="pdtt-summary-item__val">{selectedRequest.creator?.name || "—"}</span>
                                </div>
                                <div className="pdtt-summary-item">
                                    <span className="pdtt-summary-item__label">Periode Pengajuan</span>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                                        <Tag color="blue" style={{ margin: 0, fontWeight: 700, borderRadius: 100 }}>
                                            {dayjs(selectedRequest.period).format("MMMM YYYY")}
                                        </Tag>
                                        <Button
                                            type="text"
                                            size="small"
                                            icon={<EditOutlined />}
                                            onClick={() => {
                                                setTargetRequestForPeriod(selectedRequest);
                                                setNewPeriodValue(dayjs(selectedRequest.period));
                                                setChangePeriodModalVisible(true);
                                            }}
                                            style={{ color: "#2563eb", fontSize: 11, padding: "0 4px" }}
                                        >
                                            Ubah
                                        </Button>
                                    </div>
                                </div>
                                <div className="pdtt-summary-item">
                                    <span className="pdtt-summary-item__label">Waktu Submit</span>
                                    <span className="pdtt-summary-item__val" style={{ fontSize: 12 }}>
                                        {dayjs(selectedRequest.created_at).format("DD MMM YYYY, HH:mm")}
                                    </span>
                                </div>
                                <div className="pdtt-summary-item">
                                    <span className="pdtt-summary-item__label">Status Terkini</span>
                                    <div>{getStatusTag(selectedRequest.status)}</div>
                                </div>
                                <div className="pdtt-summary-item">
                                    <span className="pdtt-summary-item__label">Status Pembelian</span>
                                    <div>{getFulfillmentTag(selectedRequest.fulfillment_status)}</div>
                                </div>
                            </div>
                        </div>

                        {/* Mini Change Log Widget */}
                        {selectedRequest.change_log && selectedRequest.change_log.diffs?.length > 0 && (
                            <div
                                className="pdtt-fieldset-card"
                                style={{
                                    background: selectedRequest.change_log.updated_by_role === "admin" ? "#faf5ff" : "#f0f9ff",
                                    borderColor: selectedRequest.change_log.updated_by_role === "admin" ? "#e9d5ff" : "#bae6fd",
                                }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
                                    <Space size={6}>
                                        <HistoryOutlined style={{ color: selectedRequest.change_log.updated_by_role === "admin" ? "#7e22ce" : "#0369a1" }} />
                                        <span style={{ fontSize: 12, fontWeight: 700, color: selectedRequest.change_log.updated_by_role === "admin" ? "#6b21a8" : "#075985" }}>
                                            Daftar Perubahan Terakhir
                                        </span>
                                        <Tag color={selectedRequest.change_log.updated_by_role === "admin" ? "purple" : "cyan"} style={{ fontWeight: 600, fontSize: 10, borderRadius: 100 }}>
                                            {selectedRequest.change_log.updated_by_role === "admin" ? "Di-update Admin" : "Pengajuan Ulang User"}
                                        </Tag>
                                    </Space>
                                    <span style={{ fontSize: 11, color: "#64748b" }}>
                                        {selectedRequest.change_log.updated_by_name} • {selectedRequest.change_log.updated_at}
                                    </span>
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
                                            <Tag key={idx} color={badgeColor} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6 }}>
                                                <strong>{prefix}</strong> {labelText}
                                            </Tag>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <Table
                            className="pdtt-modal-table"
                            rowKey="id"
                            dataSource={selectedRequest.items || []}
                            columns={detailColumns}
                            pagination={false}
                            size="small"
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
                                                <Text type="secondary" style={{ fontSize: 12 }}>Total Estimasi Awal:</Text>
                                            </Table.Summary.Cell>
                                            <Table.Summary.Cell index={1}>
                                                <Text strong style={{ fontSize: 12.5 }}>{formatCurrency(totalEstimasi)}</Text>
                                            </Table.Summary.Cell>
                                        </Table.Summary.Row>
                                        <Table.Summary.Row>
                                            <Table.Summary.Cell index={0} colSpan={6} align="right">
                                                <Text strong style={{ color: "#0F5B99", fontSize: 12 }}>Total Realisasi Pembelian:</Text>
                                            </Table.Summary.Cell>
                                            <Table.Summary.Cell index={1}>
                                                <Text strong style={{ color: "#0F5B99", fontSize: 13 }}>{formatCurrency(totalRealisasi)}</Text>
                                            </Table.Summary.Cell>
                                        </Table.Summary.Row>
                                        <Table.Summary.Row>
                                            <Table.Summary.Cell index={0} colSpan={6} align="right">
                                                <Text strong style={{ color: sisaUang >= 0 ? "#059669" : "#dc2626", fontSize: 12 }}>
                                                    {sisaUang >= 0 ? "Sisa Anggaran / Hemat (Sisa Uang):" : "Defisit (Melebihi Estimasi):"}
                                                </Text>
                                            </Table.Summary.Cell>
                                            <Table.Summary.Cell index={1}>
                                                <Tag color={sisaUang >= 0 ? "success" : "error"} style={{ fontSize: 12, fontWeight: 700, borderRadius: 6 }}>
                                                    {formatCurrency(Math.abs(sisaUang))}
                                                </Tag>
                                            </Table.Summary.Cell>
                                        </Table.Summary.Row>
                                    </>
                                );
                            }}
                        />

                        {/* Standardized Action Footer Bar */}
                        <div className="pdtt-modal-footer">
                            <div className="pdtt-modal-footer__left">
                                <Button className="pdtt-btn-modal-action pdtt-btn-cancel-gray" onClick={() => setDetailModalVisible(false)}>
                                    Tutup
                                </Button>
                            </div>

                            <div className="pdtt-modal-footer__right">
                                <Button
                                    icon={<EditOutlined />}
                                    className="pdtt-btn-modal-action"
                                    onClick={() => {
                                        setDetailModalVisible(false);
                                        handleOpenEditRequest(selectedRequest);
                                    }}
                                    style={{ background: "#eff6ff", color: "#2563eb", borderColor: "#bfdbfe" }}
                                >
                                    Update Permintaan
                                </Button>
                                <Button
                                    icon={<ShoppingCartOutlined />}
                                    className="pdtt-btn-modal-action pdtt-btn-primary-green"
                                    onClick={() => {
                                        setDetailModalVisible(false);
                                        handleOpenFulfillment(selectedRequest);
                                    }}
                                >
                                    Input Realisasi Pembelian
                                </Button>
                                <Button
                                    icon={<PrinterOutlined />}
                                    className="pdtt-btn-modal-action pdtt-btn-primary-purple"
                                    onClick={() => {
                                        setBastTargetRequests([selectedRequest]);
                                        setBastModalVisible(true);
                                    }}
                                >
                                    Cetak BAST
                                </Button>

                                <Button
                                    danger
                                    icon={<DeleteOutlined />}
                                    loading={deleting}
                                    className="pdtt-btn-modal-action"
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
                                    Hapus
                                </Button>

                                {selectedRequest.status === "pending" && (
                                    <>
                                        <Button
                                            danger
                                            icon={<CloseCircleOutlined />}
                                            loading={statusUpdating}
                                            className="pdtt-btn-modal-action pdtt-btn-danger-red"
                                            onClick={() => updateStatus(selectedRequest.id, "rejected")}
                                        >
                                            Tolak
                                        </Button>
                                        <Button
                                            icon={<CheckCircleOutlined />}
                                            loading={statusUpdating}
                                            className="pdtt-btn-modal-action pdtt-btn-primary-green"
                                            onClick={() => updateStatus(selectedRequest.id, "approved")}
                                        >
                                            Setujui
                                        </Button>
                                    </>
                                )}
                                {selectedRequest.status === "approved" && (
                                    <Button
                                        loading={statusUpdating}
                                        className="pdtt-btn-modal-action pdtt-btn-primary-blue"
                                        onClick={() => updateStatus(selectedRequest.id, "processed")}
                                    >
                                        Tandai Sedang Diproses
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal Input Realisasi Pembelian (Unified Design System) */}
            <Modal
                className="pdtt-modal"
                title={
                    <div className="pdtt-modal-header">
                        <div className="pdtt-modal-header__icon pdtt-modal-header__icon--green">
                            <ShoppingOutlined />
                        </div>
                        <div>
                            <div className="pdtt-modal-header__title">Input Realisasi Pembelian Barang</div>
                            <div className="pdtt-modal-header__sub">Catat status dan kuantitas barang yang telah dipenuhi/dibelikan.</div>
                        </div>
                    </div>
                }
                open={fulfillmentModalVisible}
                onCancel={() => {
                    setFulfillmentModalVisible(false);
                    setFulfillmentTarget(null);
                }}
                footer={
                    <div className="pdtt-modal-footer">
                        <div className="pdtt-modal-footer__left">
                            <span style={{ fontSize: 12, color: "#64748b" }}>
                                {fulfillmentItems.filter((i) => i.is_full || i.jumlah_terbeli > 0).length} dari {fulfillmentItems.length} item dipenuhi
                            </span>
                        </div>
                        <div className="pdtt-modal-footer__right">
                            <Button
                                className="pdtt-btn-modal-action pdtt-btn-cancel-gray"
                                onClick={() => {
                                    setFulfillmentModalVisible(false);
                                    setFulfillmentTarget(null);
                                }}
                            >
                                Batal
                            </Button>
                            <Button
                                className="pdtt-btn-modal-action pdtt-btn-primary-blue"
                                icon={<CheckOutlined />}
                                loading={savingFulfillment}
                                onClick={handleSaveFulfillment}
                            >
                                Simpan Realisasi Pembelian
                            </Button>
                        </div>
                    </div>
                }
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
                            title: "NAMA BARANG & SPESIFIKASI",
                            key: "item_name",
                            width: 220,
                            render: (_, r) => (
                                <div>
                                    <Text strong style={{ fontSize: 12.5, display: "block" }}>{r.raw_name || r.item_name}</Text>
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
                            title: "DIMINTA",
                            key: "jumlah",
                            width: 95,
                            render: (_, r) => (
                                <Tag color="geekblue" style={{ fontWeight: 600, borderRadius: 100 }}>
                                    {r.jumlah} buah
                                </Tag>
                            ),
                        },
                        {
                            title: "HARGA REALISASI / PCS",
                            key: "harga_terbeli",
                            width: 155,
                            render: (_, r) => (
                                <InputNumber
                                    min={0}
                                    value={r.harga_terbeli}
                                    onChange={(val) => handleItemPriceChange(r.id, val)}
                                    formatter={(val) => val ? `Rp ${String(val).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}` : ""}
                                    parser={(val) => val ? Number(val.replace(/[^0-9]/g, "")) : 0}
                                    style={{ width: "100%", borderRadius: 8 }}
                                    size="small"
                                />
                            ),
                        },
                        {
                            title: "STATUS TERBELI",
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
                            title: "JUMLAH TERBELI",
                            key: "jumlah_terbeli",
                            width: 135,
                            render: (_, r) => (
                                <InputNumber
                                    min={0}
                                    value={r.jumlah_terbeli}
                                    onChange={(val) => handleItemQtyChange(r.id, val)}
                                    addonAfter="buah"
                                    style={{ width: "100%", borderRadius: 8 }}
                                    size="small"
                                />
                            ),
                        },
                    ];

                    return (
                        <div style={{ marginTop: 14 }}>
                            {/* Summary Fieldset Card */}
                            <div className="pdtt-fieldset-card">
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, alignItems: "center" }}>
                                    <div>
                                        <span className="pdtt-summary-item__label">Pegawai</span>
                                        <span className="pdtt-summary-item__val" style={{ display: "block" }}>{fulfillmentTarget.creator?.name}</span>
                                    </div>
                                    <div>
                                        <span className="pdtt-summary-item__label">Progress Pemenuhan</span>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                                            <Progress percent={percent} size="small" style={{ width: 100 }} />
                                            <span style={{ fontSize: 12, fontWeight: 700, color: percent === 100 ? "#059669" : "#2563eb" }}>
                                                {totalPurchased}/{totalReq} pcs
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="pdtt-summary-item__label">Sisa Anggaran (Hemat)</span>
                                        <div style={{ marginTop: 2 }}>
                                            <Tag color={remainingBudget >= 0 ? "success" : "error"} style={{ fontWeight: 700, fontSize: 12, borderRadius: 6 }}>
                                                {formatCurrency(remainingBudget)}
                                            </Tag>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Toolbar Centang Massal */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "8px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                                <span style={{ fontSize: 12.5, fontWeight: 700, color: "#334155" }}>
                                    Item Barang yang Diajukan ({fulfillmentItems.length} jenis)
                                </span>
                                <Checkbox
                                    checked={isAllFull}
                                    onChange={(e) => handleToggleAllFull(e.target.checked)}
                                    style={{ fontWeight: 600, color: "#0F5B99", fontSize: 12 }}
                                >
                                    Centang Semua Terbeli Lengkap
                                </Checkbox>
                            </div>

                            {/* Table List Items */}
                            <Table
                                className="pdtt-modal-table"
                                rowKey="id"
                                dataSource={fulfillmentItems}
                                columns={fulfillmentColumns}
                                pagination={false}
                                size="small"
                            />
                        </div>
                    );
                })()}
            </Modal>
            <Modal
                className="pdtt-modal"
                title={
                    <div className="pdtt-modal-header">
                        <div className="pdtt-modal-header__icon pdtt-modal-header__icon--blue">
                            <CalendarOutlined />
                        </div>
                        <div>
                            <div className="pdtt-modal-header__title">Ubah Periode Pengajuan</div>
                            <div className="pdtt-modal-header__sub">Pilih bulan dan tahun periode baru untuk pengajuan ini.</div>
                        </div>
                    </div>
                }
                open={changePeriodModalVisible}
                onCancel={() => {
                    setChangePeriodModalVisible(false);
                    setTargetRequestForPeriod(null);
                }}
                footer={
                    <div className="pdtt-modal-footer">
                        <div className="pdtt-modal-footer__left" />
                        <div className="pdtt-modal-footer__right">
                            <Button
                                className="pdtt-btn-modal-action pdtt-btn-cancel-gray"
                                onClick={() => {
                                    setChangePeriodModalVisible(false);
                                    setTargetRequestForPeriod(null);
                                }}
                            >
                                Batal
                            </Button>
                            <Button
                                className="pdtt-btn-modal-action pdtt-btn-primary-blue"
                                loading={savingPeriod}
                                onClick={handleChangePeriod}
                            >
                                Simpan Periode
                            </Button>
                        </div>
                    </div>
                }
                width={420}
                centered
                destroyOnClose
            >
                {targetRequestForPeriod && (
                    <div style={{ marginTop: 14 }}>
                        <div className="pdtt-fieldset-card">
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                <div>
                                    <span className="pdtt-summary-item__label">Pegawai</span>
                                    <span className="pdtt-summary-item__val" style={{ display: "block" }}>
                                        {targetRequestForPeriod.creator?.name}
                                    </span>
                                </div>
                                <div>
                                    <span className="pdtt-summary-item__label">Periode Saat Ini</span>
                                    <div style={{ marginTop: 2 }}>
                                        <Tag color="blue" style={{ fontSize: 12, fontWeight: 700, borderRadius: 100 }}>
                                            {dayjs(targetRequestForPeriod.period).format("MMMM YYYY")}
                                        </Tag>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pdtt-fieldset-card">
                            <span className="pdtt-fieldset-card__title">
                                <CalendarOutlined /> Pilih Periode Baru
                            </span>
                            <DatePicker
                                picker="month"
                                value={newPeriodValue}
                                onChange={(val) => setNewPeriodValue(val || dayjs())}
                                format="MMMM YYYY"
                                allowClear={false}
                                style={{ width: "100%", borderRadius: 8 }}
                                size="large"
                            />
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal Update Permintaan (Unified Design System) */}
            <Modal
                className="pdtt-modal"
                title={
                    <div className="pdtt-modal-header">
                        <div className="pdtt-modal-header__icon pdtt-modal-header__icon--blue">
                            <EditOutlined />
                        </div>
                        <div>
                            <div className="pdtt-modal-header__title">Update Permintaan Pengadaan</div>
                            <div className="pdtt-modal-header__sub">Tambah, ubah kuantitas, atau hapus item permintaan pengadaan.</div>
                        </div>
                    </div>
                }
                open={editModalVisible}
                onCancel={() => {
                    setEditModalVisible(false);
                    setEditRequestTarget(null);
                }}
                footer={
                    <div className="pdtt-modal-footer">
                        <div className="pdtt-modal-footer__left" />
                        <div className="pdtt-modal-footer__right">
                            <Button
                                className="pdtt-btn-modal-action pdtt-btn-cancel-gray"
                                onClick={() => {
                                    setEditModalVisible(false);
                                    setEditRequestTarget(null);
                                }}
                            >
                                Batal
                            </Button>
                            <Button
                                className="pdtt-btn-modal-action pdtt-btn-primary-blue"
                                loading={savingEditRequest}
                                onClick={handleSaveEditRequest}
                            >
                                Simpan Perubahan
                            </Button>
                        </div>
                    </div>
                }
                width={800}
                centered
                destroyOnClose
            >
                {editRequestTarget && (
                    <div style={{ marginTop: 14 }}>
                        {/* Header Box: Pegawai & Periode Selector */}
                        <div className="pdtt-fieldset-card">
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                                <div>
                                    <span className="pdtt-summary-item__label">Pegawai Pengusul</span>
                                    <span className="pdtt-summary-item__val" style={{ display: "block" }}>
                                        {editRequestTarget.creator?.name || "Unknown"}
                                    </span>
                                </div>
                                <div>
                                    <span className="pdtt-summary-item__label">Periode Pengajuan</span>
                                    <div style={{ marginTop: 2 }}>
                                        <DatePicker
                                            picker="month"
                                            value={editPeriod}
                                            onChange={handleEditPeriodChange}
                                            format="MMMM YYYY"
                                            allowClear={false}
                                            size="small"
                                            style={{ borderRadius: 6, fontWeight: 600 }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Live Budget & Remaining Allowance Banner */}
                        {(() => {
                            const totalCost = editItems.reduce((acc, it) => acc + (Number(it.jumlah) || 0) * (Number(it.harga_saat_ini) || 0), 0);
                            const sisa = editUserSaldo - totalCost;
                            const isOver = sisa < 0;

                            return (
                                <div
                                    className="pdtt-fieldset-card"
                                    style={{
                                        background: isOver ? "#fff1f2" : "#f0fdf4",
                                        borderColor: isOver ? "#fecdd3" : "#bbf7d0",
                                    }}
                                >
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, alignItems: "center" }}>
                                        <div>
                                            <span className="pdtt-summary-item__label">Saldo Anggaran ({editUserDays} Hari)</span>
                                            <span className="pdtt-summary-item__val" style={{ display: "block" }}>
                                                {formatCurrency(editUserSaldo)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="pdtt-summary-item__label">Total Estimasi</span>
                                            <span className="pdtt-summary-item__val" style={{ display: "block", color: "#2563eb" }}>
                                                {formatCurrency(totalCost)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="pdtt-summary-item__label">Sisa Anggaran Permintaan</span>
                                            <div style={{ marginTop: 2 }}>
                                                <Tag
                                                    color={isOver ? "error" : "success"}
                                                    style={{ fontWeight: 700, fontSize: 12, borderRadius: 6 }}
                                                >
                                                    {formatCurrency(sisa)}
                                                </Tag>
                                            </div>
                                        </div>
                                    </div>
                                    {isOver && (
                                        <Text type="danger" style={{ fontSize: 11, display: "block", marginTop: 8, fontWeight: 500 }}>
                                            ⚠️ Perhatian: Total harga permintaan barang melebihi saldo anggaran pegawai untuk periode ini!
                                        </Text>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Catalog Item Picker Dropdown */}
                        <div style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}>
                            <Select
                                showSearch
                                placeholder="Pilih & tambah barang dari katalog PDTT..."
                                optionFilterProp="children"
                                style={{ flex: 1, borderRadius: 8 }}
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
                                className="pdtt-modal-table"
                                rowKey="pdtt_item_id"
                                dataSource={editItems}
                                pagination={false}
                                size="small"
                                columns={[
                                    {
                                        title: "NAMA BARANG",
                                        key: "item_name",
                                        render: (_, r) => (
                                            <div>
                                                <Text strong style={{ fontSize: 12.5, display: "block" }}>{r.item_name}</Text>
                                                <Text type="secondary" style={{ fontSize: 11 }}>
                                                    Merek: {r.brand || "-"} {r.satuan ? `| ${r.satuan}` : ""}
                                                </Text>
                                            </div>
                                        ),
                                    },
                                    {
                                        title: "HARGA SATUAN",
                                        dataIndex: "harga_saat_ini",
                                        key: "harga_saat_ini",
                                        width: 130,
                                        align: "right",
                                        render: (v) => <Text style={{ fontSize: 12 }}>{formatCurrency(v)}</Text>,
                                    },
                                    {
                                        title: "KUANTITAS (QTY)",
                                        key: "jumlah",
                                        width: 145,
                                        align: "center",
                                        render: (_, r) => (
                                            <InputNumber
                                                min={1}
                                                value={r.jumlah}
                                                onChange={(val) => handleEditItemQtyChange(r.pdtt_item_id, val)}
                                                addonAfter="buah"
                                                style={{ width: "100%", borderRadius: 6 }}
                                                size="small"
                                            />
                                        ),
                                    },
                                    {
                                        title: "SUBTOTAL",
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

            {/* Modal Cetak BAST - Tanda Terima PDTT (Unified Design System) */}
            <Modal
                className="pdtt-modal"
                title={
                    <div className="pdtt-modal-header">
                        <div className="pdtt-modal-header__icon pdtt-modal-header__icon--purple">
                            <PrinterOutlined />
                        </div>
                        <div>
                            <div className="pdtt-modal-header__title">
                                Cetak BAST - Tanda Terima PDTT ({bastTargetRequests.length} Pegawai)
                            </div>
                            <div className="pdtt-modal-header__sub">Pratinjau dan cetak Berita Acara Serah Terima per orang atau batch.</div>
                        </div>
                    </div>
                }
                open={bastModalVisible}
                onCancel={() => {
                    setBastModalVisible(false);
                    setBastTargetRequests([]);
                }}
                footer={
                    <div className="pdtt-modal-footer">
                        <div className="pdtt-modal-footer__left">
                            <Button className="pdtt-btn-modal-action pdtt-btn-cancel-gray" onClick={() => setBastModalVisible(false)}>
                                Tutup
                            </Button>
                        </div>
                        <div className="pdtt-modal-footer__right">
                            <Button
                                icon={<FilePdfOutlined />}
                                onClick={handleDownloadBastPdf}
                                className="pdtt-btn-modal-action pdtt-btn-danger-red"
                            >
                                Unduh File PDF
                            </Button>
                            <Button
                                icon={<PrinterOutlined />}
                                onClick={handlePrintBastWindow}
                                className="pdtt-btn-modal-action pdtt-btn-primary-purple"
                            >
                                Cetak / Print Window
                            </Button>
                        </div>
                    </div>
                }
                width={940}
                centered
                destroyOnClose
            >
                <div style={{ marginTop: 14 }}>
                    <div className="pdtt-fieldset-card" style={{ background: "#faf5ff", borderColor: "#e9d5ff" }}>
                        <span className="pdtt-fieldset-card__title" style={{ color: "#6b21a8" }}>
                            <PrinterOutlined /> Pengaturan Tanda Tangan & Keterangan BAST
                        </span>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                            <div>
                                <span className="pdtt-summary-item__label">Nama PPK</span>
                                <Input value={ppkName} onChange={(e) => setPpkName(e.target.value)} size="small" style={{ borderRadius: 6 }} />
                            </div>
                            <div>
                                <span className="pdtt-summary-item__label">NIP PPK</span>
                                <Input value={ppkNip} onChange={(e) => setPpkNip(e.target.value)} size="small" style={{ borderRadius: 6 }} />
                            </div>
                            <div>
                                <span className="pdtt-summary-item__label">Kota Penandatanganan</span>
                                <Input value={cityName} onChange={(e) => setCityName(e.target.value)} size="small" style={{ borderRadius: 6 }} />
                            </div>
                            <div>
                                <span className="pdtt-summary-item__label">Tanggal BAST</span>
                                <Input value={bastDate} onChange={(e) => setBastDate(e.target.value)} size="small" style={{ borderRadius: 6 }} />
                            </div>
                        </div>
                    </div>

                    <div style={{ margin: "14px 0 8px 0" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>
                            Pratinjau Dokumen BAST ({bastTargetRequests.length} Halaman):
                        </span>
                    </div>

                    <div
                        style={{
                            border: "1px solid #cbd5e1",
                            borderRadius: 10,
                            overflow: "hidden",
                            maxHeight: 520,
                            background: "#525659",
                        }}
                    >
                        <iframe
                            title="BAST Preview"
                            srcDoc={generateBastHtml(bastTargetRequests, { ppkName, ppkNip, cityName, bastDate })}
                            style={{ width: "100%", height: 500, border: "none" }}
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
}
