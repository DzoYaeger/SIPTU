import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  App as AntdApp,
  Button,
  Input,
  InputNumber,
  Modal,
  Result,
  Spin,
  Typography,
} from "antd";
import {
  CheckCircleFilled,
  CloseCircleFilled,
  CheckOutlined,
  CloseOutlined,
  FileTextOutlined,
  UserOutlined,
  InboxOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { buildMessageAdapter } from "../utils/notify.js";
import { bmnService } from "../services/bmnService.js";
import { useAuth } from "../hooks/useAuth.js";
import dayjs from "dayjs";
import "./InventoryRequestApprovalPage.css";

const InventoryRequestApprovalPage = () => {
  const { token } = useParams();
  const { message } = AntdApp.useApp();
  const notification = useMemo(() => buildMessageAdapter(message), [message]);
  const { apiFetch } = useAuth();
  const service = useMemo(() => bmnService(apiFetch), [apiFetch]);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [approvedQtys, setApprovedQtys] = useState({});
  const [approverName, setApproverName] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");

  /* ── Fetch request by token ── */
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const result = await service.getInventoryRequestByToken(token);
        setData(result);
        // Initialize approved quantities with requested quantities
        const qtyMap = {};
        (result.items || []).forEach((item) => {
          qtyMap[item.id] = item.qty_requested;
        });
        setApprovedQtys(qtyMap);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token, service]);

  /* ── Approve ── */
  const handleApprove = useCallback(async () => {
    if (!approverName.trim()) {
      notification.error({ message: "Nama verifikator wajib diisi" });
      return;
    }

    try {
      setSubmitting(true);
      const itemsPayload = (data.items || []).map((item) => ({
        id: item.id,
        qty_approved: approvedQtys[item.id] ?? item.qty_requested,
      }));

      const result = await service.approveInventoryRequest(token, {
        items: itemsPayload,
        approval_notes: notes || null,
        approver_name: approverName,
      });

      setData(result);
      message.success("Permintaan berhasil disetujui! Notifikasi WhatsApp telah dikirim ke pemohon.");
    } catch (err) {
      notification.error({
        message: "Gagal menyetujui",
        description: err.message,
      });
    } finally {
      setSubmitting(false);
    }
  }, [data, approvedQtys, approverName, notes, token, service, message, notification]);

  /* ── Reject ── */
  const handleReject = useCallback(async () => {
    try {
      setSubmitting(true);
      const result = await service.rejectInventoryRequest(token, {
        approval_notes: rejectNotes || "Ditolak oleh admin",
      });
      setData(result);
      setRejectModalOpen(false);
      message.info("Permintaan ditolak. Notifikasi WhatsApp telah dikirim ke pemohon.");
    } catch (err) {
      notification.error({
        message: "Gagal menolak",
        description: err.message,
      });
    } finally {
      setSubmitting(false);
    }
  }, [token, rejectNotes, service, message, notification]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div
        className="irap"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Spin size="large" tip="Memuat data permintaan..." />
      </div>
    );
  }

  /* ── Error ── */
  if (error || !data) {
    return (
      <div className="irap">
        <div className="irap__body" style={{ marginTop: 60 }}>
          <Result
            status="error"
            title="Data Tidak Ditemukan"
            subTitle={error || "Link tidak valid atau sudah kadaluarsa."}
          />
        </div>
      </div>
    );
  }

  const isProcessed = data.status !== "pengajuan";
  const isApproved = data.status === "disetujui";
  const isRejected = data.status === "ditolak";

  return (
    <div className="irap">
      {/* ── Hero ── */}
      <div
        className="irap__hero"
        style={
          isApproved
            ? {
                background:
                  "linear-gradient(135deg, #059669, #10b981, #34d399)",
              }
            : isRejected
              ? {
                  background:
                    "linear-gradient(135deg, #dc2626, #ef4444, #f87171)",
                }
              : undefined
        }
      >
        <div className="irap__hero-inner">
          <h1>
            {isProcessed
              ? isApproved
                ? "✅ Permintaan Disetujui"
                : "❌ Permintaan Ditolak"
              : "📋 Persetujuan Permintaan Persediaan"}
          </h1>
          <p>
            {isProcessed
              ? `Diproses pada ${dayjs(data.approved_at).format("DD MMM YYYY, HH:mm")}`
              : "Periksa dan setujui permintaan barang persediaan berikut."}
          </p>
          <div
            className={`irap__status-badge irap__status-badge--${data.status}`}
          >
            {data.status === "pengajuan" && "⏳ Menunggu Persetujuan"}
            {data.status === "disetujui" && "✅ Disetujui"}
            {data.status === "ditolak" && "❌ Ditolak"}
          </div>
        </div>
      </div>

      <div className="irap__body">
        {/* ── SPB Info ── */}
        <div className="irap__card">
          <div className="irap__card-title">
            <FileTextOutlined style={{ color: "#6366f1" }} /> Informasi SPB
          </div>
          <div className="irap__info-row">
            <span className="irap__info-label">No. SPB</span>
            <span
              className="irap__info-value"
              style={{ color: "#4f46e5", fontWeight: 700 }}
            >
              {data.spb_number}
            </span>
          </div>
          {data.sbbk_number && (
            <div className="irap__info-row">
              <span className="irap__info-label">No. SBBK</span>
              <span
                className="irap__info-value"
                style={{ color: "#059669", fontWeight: 700 }}
              >
                {data.sbbk_number}
              </span>
            </div>
          )}
          <div className="irap__info-row">
            <span className="irap__info-label">Tanggal Pengajuan</span>
            <span className="irap__info-value">
              {dayjs(data.created_at).format("DD MMMM YYYY, HH:mm")}
            </span>
          </div>
          <div className="irap__info-row">
            <span className="irap__info-label">Status</span>
            <span className="irap__info-value">
              {data.status.charAt(0).toUpperCase() + data.status.slice(1)}
            </span>
          </div>
        </div>

        {/* ── Requester Info ── */}
        <div className="irap__card">
          <div className="irap__card-title">
            <UserOutlined style={{ color: "#7c3aed" }} /> Data Pemohon
          </div>
          <div className="irap__info-row">
            <span className="irap__info-label">Nama</span>
            <span className="irap__info-value">{data.requester_name}</span>
          </div>
          <div className="irap__info-row">
            <span className="irap__info-label">NIP</span>
            <span className="irap__info-value">{data.requester_nip}</span>
          </div>
          {data.requester_function && (
            <div className="irap__info-row">
              <span className="irap__info-label">Fungsi / Bidang</span>
              <span className="irap__info-value">
                {data.requester_function}
              </span>
            </div>
          )}
          {data.purpose && (
            <div className="irap__info-row">
              <span className="irap__info-label">Keperluan</span>
              <span className="irap__info-value">{data.purpose}</span>
            </div>
          )}
        </div>

        {/* ── Signature ── */}
        {data.requester_signature && (
          <div className="irap__card">
            <div className="irap__card-title">
              <EditOutlined style={{ color: "#059669" }} /> Tanda Tangan Pemohon
            </div>
            <div className="irap__sig-preview">
              <img src={data.requester_signature} alt="Tanda Tangan" />
            </div>
          </div>
        )}

        {/* ── Items Table ── */}
        <div className="irap__card">
          <div className="irap__card-title">
            <InboxOutlined style={{ color: "#2563eb" }} /> Daftar Barang (
            {(data.items || []).length} item)
          </div>
          <table className="irap__item-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Nama Barang</th>
                <th>Diminta (SPB)</th>
                <th>{isProcessed ? "Disetujui (SBBK)" : "Disetujui"}</th>
              </tr>
            </thead>
            <tbody>
              {(data.items || []).map((item, idx) => (
                <tr key={item.id}>
                  <td style={{ color: "#94a3b8", fontWeight: 600 }}>
                    {idx + 1}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{item.item_name}</div>
                    <div style={{ fontSize: 11.5, color: "#94a3b8" }}>
                      {item.unit}
                    </div>
                  </td>
                  <td>
                    <span className="irap__qty-requested">
                      {item.qty_requested} {item.unit}
                    </span>
                  </td>
                  <td>
                    {isProcessed ? (
                      <span
                        style={{
                          fontWeight: 700,
                          color:
                            item.qty_approved === item.qty_requested
                              ? "#059669"
                              : item.qty_approved > 0
                                ? "#d97706"
                                : "#dc2626",
                        }}
                      >
                        {item.qty_approved ?? "-"} {item.unit}
                      </span>
                    ) : (
                      <InputNumber
                        className="irap__qty-input"
                        min={0}
                        max={item.qty_requested}
                        value={approvedQtys[item.id] ?? item.qty_requested}
                        onChange={(val) =>
                          setApprovedQtys((prev) => ({
                            ...prev,
                            [item.id]: val,
                          }))
                        }
                        size="small"
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Approval Notes (already processed) ── */}
        {isProcessed && data.approval_notes && (
          <div className="irap__card">
            <div className="irap__card-title">📝 Catatan Verifikator</div>
            <Typography.Paragraph style={{ margin: 0, color: "#475569" }}>
              {data.approval_notes}
            </Typography.Paragraph>
          </div>
        )}

        {/* ── Approval Form (pending) ── */}
        {!isProcessed && (
          <div className="irap__card">
            <div className="irap__card-title">
              <CheckOutlined style={{ color: "#059669" }} /> Verifikasi
            </div>

            <div style={{ marginBottom: 16 }}>
              <Typography.Text
                strong
                style={{ display: "block", marginBottom: 6, fontSize: 13 }}
              >
                Nama Verifikator / Admin{" "}
                <span style={{ color: "#ef4444" }}>*</span>
              </Typography.Text>
              <Input
                placeholder="Masukkan nama Anda"
                size="large"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <Typography.Text
                strong
                style={{ display: "block", marginBottom: 6, fontSize: 13 }}
              >
                Catatan (opsional)
              </Typography.Text>
              <Input.TextArea
                placeholder="Catatan untuk pemohon…"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="irap__actions">
              <Button
                type="primary"
                className="irap__approve-btn"
                icon={<CheckOutlined />}
                loading={submitting}
                onClick={handleApprove}
              >
                Setujui Permintaan
              </Button>
              <Button
                danger
                className="irap__reject-btn"
                icon={<CloseOutlined />}
                onClick={() => setRejectModalOpen(true)}
              >
                Tolak
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Reject Modal ── */}
      <Modal
        open={rejectModalOpen}
        onCancel={() => setRejectModalOpen(false)}
        title="Tolak Permintaan"
        okText="Ya, Tolak"
        cancelText="Batal"
        okButtonProps={{ danger: true, loading: submitting }}
        onOk={handleReject}
      >
        <Typography.Text
          style={{ display: "block", marginBottom: 8, color: "#475569" }}
        >
          Berikan alasan penolakan (opsional):
        </Typography.Text>
        <Input.TextArea
          rows={3}
          placeholder="Alasan penolakan…"
          value={rejectNotes}
          onChange={(e) => setRejectNotes(e.target.value)}
        />
      </Modal>
    </div>
  );
};

export default InventoryRequestApprovalPage;
