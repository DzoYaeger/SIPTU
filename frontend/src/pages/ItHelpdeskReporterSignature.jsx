import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { App as AntdApp, Button, Card, Spin, Typography, Result, Divider, Descriptions, Input } from 'antd';
import { buildMessageAdapter } from '../utils/notify.js';
import dayjs from 'dayjs';
import { useAuth } from '../hooks/useAuth.js';



const ItHelpdeskReporterSignature = () => {
    const { ticketId } = useParams();
    const navigate = useNavigate();
    const { message } = AntdApp.useApp();
    const notification = buildMessageAdapter(message);
    const { apiFetch } = useAuth();

    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [confirmed, setConfirmed] = useState(false);

    const signatureRef = useRef();

    useEffect(() => {
        const fetchTicket = async () => {
            try {
                const response = await apiFetch(`/public/it-helpdesk-tickets/${ticketId}/details`);

                if (!response.ok) {
                    throw new Error('Gagal memuat data tiket.');
                }
                const data = await response.json();
                setTicket(data);

                // Only show "Already Confirmed/Selesai" if the status is completed
                if (data.status === 'completed') {
                    setConfirmed(true);
                }
            } catch (error) {
                notification.error({ message: 'Error', description: error.message });
            } finally {
                setLoading(false);
            }
        };
        fetchTicket();
    }, [ticketId, notification]);

    const [password, setPassword] = useState("");

    const handleSubmit = async () => {
        if (!password) {
            notification.error({ message: 'Harap masukkan password SIPTU Anda.' });
            return;
        }

        setSubmitting(true);
        try {
            const response = await apiFetch(`/public/it-helpdesk-tickets/${ticketId}/confirm`, {
                method: 'POST',
                body: JSON.stringify({ password: password }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Gagal mengirim konfirmasi.');
            }

            setConfirmed(true);
            notification.success({ message: 'Konfirmasi berhasil dikirim.' });
        } catch (error) {
            notification.error({ message: 'Gagal', description: error.message });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}><Spin size="large" /></div>;
    }

    if (!ticket) {
        return <Result status="404" title="Tiket tidak ditemukan" />;
    }

    if (confirmed) {
        return (
            <div style={{ maxWidth: 600, margin: '40px auto', padding: 20 }}>
                <Result
                    status="success"
                    title="Laporan Selesai"
                    subTitle="Terima kasih, Anda telah mengonfirmasi bahwa masalah ini telah teratasi."
                    extra={[
                        <Button type="primary" key="home" onClick={() => navigate('/app/it-helpdesk-pelaporan')}>
                            Kembali ke Daftar Laporan
                        </Button>,
                    ]}
                />
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 800, margin: '40px auto', padding: 20 }}>
            <Card title="Konfirmasi Penyelesaian Laporan IT" bordered={false} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <Descriptions bordered column={1} size="small">
                    <Descriptions.Item label="No. Tiket">{ticket.ticket_number}</Descriptions.Item>
                    <Descriptions.Item label="Pelapor">{ticket.employee_name}</Descriptions.Item>
                    <Descriptions.Item label="Masalah">{ticket.problem_details}</Descriptions.Item>
                    <Descriptions.Item label="Tindak Lanjut IT">{ticket.followup_details}</Descriptions.Item>
                    <Descriptions.Item label="Tanggal Selesai">{ticket.completion_date ? dayjs(ticket.completion_date).format('DD MMM YYYY') : '-'}</Descriptions.Item>
                </Descriptions>

                <Divider />

                {!confirmed && (
                    <>
                        <Typography.Title level={5}>Konfirmasi Password SIPTU</Typography.Title>
                        <Typography.Paragraph type="secondary">
                            Dengan memasukkan password ini, saya menyatakan bahwa masalah TI yang saya laporkan telah diselesaikan dengan baik.
                        </Typography.Paragraph>

                        <div style={{ marginBottom: 16 }}>
                            <Input.Password 
                                placeholder="Masukkan password login SIPTU Anda" 
                                size="large"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <Button type="primary" block size="large" onClick={handleSubmit} loading={submitting}>
                            Konfirmasi Selesai
                        </Button>
                    </>
                )}
            </Card>
        </div>
    );
};

export default ItHelpdeskReporterSignature;
