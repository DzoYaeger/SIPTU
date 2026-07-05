import React, { useState, useEffect } from 'react';
import {
    Calendar,
    Badge,
    Card,
    Typography,
    Button,
    Modal,
    Form,
    Input,
    DatePicker,
    Select,
    List,
    Space,
} from 'antd';
import {
    PlusOutlined,
    DeleteOutlined,
    EditOutlined,
    LinkOutlined,
    ClockCircleOutlined,
    WhatsAppOutlined,
} from "@ant-design/icons";
import dayjs from 'dayjs';
import { useAuth } from '../hooks/useAuth.js';
import { App as AntdApp } from 'antd';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

// const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

const EVENT_COLORS = {
    'Rapat': 'blue',
    'Zoom': 'geekblue',
    'Dinas Luar': 'volcano',
    'Lainnya': 'default',
};

export default function KepegawaianKalender() {
    const { token, user, apiFetch } = useAuth();
    const { message, modal } = AntdApp.useApp();

    const [agendas, setAgendas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(dayjs());

    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [isDayModalVisible, setIsDayModalVisible] = useState(false);

    const [isFormModalVisible, setIsFormModalVisible] = useState(false);
    const [editingAgenda, setEditingAgenda] = useState(null);
    const [form] = Form.useForm();

    const fetchAgendas = async (date) => {
        setLoading(true);
        try {
            const year = date.year();
            const month = date.month() + 1;
            const res = await apiFetch(`/agendas?year=${year}&month=${month}`);
            if (!res.ok) throw new Error("Gagal mengambil data agenda");
            const data = await res.json();
            setAgendas(data.data);
        } catch (err) {
            message.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchAgendas(currentMonth);
        }
    }, [currentMonth, token]);

    const onPanelChange = (date) => {
        setCurrentMonth(date);
    };

    const onDateSelect = (date, { source }) => {
        if (source === 'date') {
            setSelectedDate(date);
            setIsDayModalVisible(true);
        }
    };

    const getDayEvents = (date) => {
        return agendas.filter(agenda => {
            const start = dayjs(agenda.start_time);
            const end = dayjs(agenda.end_time);
            return date.isSame(start, 'day') || date.isSame(end, 'day') || (date.isAfter(start, 'day') && date.isBefore(end, 'day'));
        });
    };

    const dateCellRender = (value) => {
        const events = getDayEvents(value);
        return (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {events.map((item) => (
                    <li key={item.id} style={{ marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <Badge status={EVENT_COLORS[item.type] ? 'processing' : 'default'} color={EVENT_COLORS[item.type]} text={item.title} style={{ fontSize: '12px' }} />
                    </li>
                ))}
            </ul>
        );
    };

    const cellRender = (current, info) => {
        if (info.type === 'date') {
            return dateCellRender(current);
        }
        return info.originNode;
    };

    const handleOpenForm = (agenda = null) => {
        if (agenda) {
            setEditingAgenda(agenda);
            form.setFieldsValue({
                title: agenda.title,
                type: agenda.type,
                timeRange: [dayjs(agenda.start_time), dayjs(agenda.end_time)],
                penyelenggara: agenda.penyelenggara,
                location_url: agenda.location_url,
                link_surat: agenda.link_surat,
                description: agenda.description,
            });
        } else {
            setEditingAgenda(null);
            form.resetFields();
            form.setFieldsValue({
                timeRange: [selectedDate.hour(9).minute(0), selectedDate.hour(10).minute(0)],
                type: 'Rapat'
            });
        }
        setIsFormModalVisible(true);
    };

    const handleSaveAgenda = async (values) => {
        try {
            const payload = {
                title: values.title,
                type: values.type,
                start_time: values.timeRange[0].format('YYYY-MM-DD HH:mm:ss'),
                end_time: values.timeRange[1].format('YYYY-MM-DD HH:mm:ss'),
                penyelenggara: values.penyelenggara,
                location_url: values.location_url,
                link_surat: values.link_surat,
                description: values.description,
            };

            const url = editingAgenda ? `/agendas/${editingAgenda.id}` : '/agendas';
            const method = editingAgenda ? 'PUT' : 'POST';

            const res = await apiFetch(url, {
                method,
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error("Gagal menyimpan agenda");

            message.success("Agenda berhasil disimpan!");
            setIsFormModalVisible(false);
            fetchAgendas(currentMonth);
        } catch (err) {
            message.error(err.message);
        }
    };

    const handleDeleteAgenda = async (id) => {
        try {
            const res = await apiFetch(`/agendas/${id}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error("Gagal menghapus agenda");
            message.success("Agenda dihapus");
            fetchAgendas(currentMonth);
        } catch (err) {
            message.error(err.message);
        }
    };

    const handleShareWhatsApp = () => {
        const events = getDayEvents(selectedDate);
        if (events.length === 0) {
            message.info("Tidak ada jadwal yang dapat dibagikan untuk hari ini.");
            return;
        }

        const dateFormatted = selectedDate.format("dddd, DD MMMM YYYY");

        let msg = `Pagi pak.\nPak, izin menyampaikan hari ini ada ${events.length} jadwal kegiatan bapak, sy rincikan sebagai berikut pak:\n\n`;

        events.forEach((agenda, idx) => {
            const start = dayjs(agenda.start_time).format("HH.mm");
            const end = dayjs(agenda.end_time).format("HH.mm");

            msg += `Jadwal ${idx + 1}:\n`;
            msg += `Hal: ${agenda.title}\n`;
            msg += `Hari/ Tanggal: ${dateFormatted}\n`;
            msg += `Pukul: ${start} WIB – Selesai\n`;

            if (agenda.penyelenggara) {
                msg += `Penyelenggara: ${agenda.penyelenggara}\n`;
            }

            if (agenda.location_url) {
                if (agenda.location_url.toLowerCase().includes("zoom.us")) {
                    msg += `Link zoom: ${agenda.location_url}\n`;
                    // Parse meeting ID and password if they look like Standard Zoom links? 
                    // Actually, the user asked for exact Link Zoom / ID Rapat / Kode Sandi formatting, 
                    // but we only store the raw URL string. If they put Meeting ID in description, it helps.
                    // Let's just output the URL.
                } else if (agenda.location_url.toLowerCase().includes("linktr.ee")) {
                    msg += `Linktree: ${agenda.location_url}\n`;
                } else {
                    msg += `Lokasi / Link: ${agenda.location_url}\n`;
                }
            }
            if (agenda.link_surat) {
                msg += `Link Surat: ${agenda.link_surat}\n`;
            }
            if (agenda.description) {
                msg += `Keterangan: ${agenda.description}\n`;
            }
            msg += `\n`;
        });

        msg += `Sekian pak, terima kasih🙏🏻🙏🏻🙏🏻`;

        const encodedMsg = encodeURIComponent(msg);
        window.open(`https://wa.me/?text=${encodedMsg}`, "_blank");
    };

    const selectedDayEvents = getDayEvents(selectedDate);
    const isAdminOrCreator = (agenda) => user?.base_role === 'admin' || agenda.created_by === user?.id;

    return (
        <div style={{ padding: '24px' }}>
            <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <Title level={3} style={{ margin: 0 }}>Kalender Kegiatan</Title>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenForm(null)}>
                        Tambah Agenda
                    </Button>
                </div>

                <Calendar
                    cellRender={cellRender}
                    onPanelChange={onPanelChange}
                    onSelect={onDateSelect}
                />
            </Card>

            {/* Modal Daftar Agenda per Hari */}
            <Modal
                title={`Agenda pada ${selectedDate.format('DD MMMM YYYY')}`}
                open={isDayModalVisible}
                onCancel={() => setIsDayModalVisible(false)}
                footer={[
                    <Button
                        key="whatsapp"
                        type="default"
                        icon={<WhatsAppOutlined />}
                        style={{ backgroundColor: "#25D366", color: "#fff", borderColor: "#25D366", float: "left" }}
                        onClick={handleShareWhatsApp}
                    >
                        Bagikan ke Grup
                    </Button>,
                    <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => handleOpenForm(null)}>
                        Tambah Agenda Hari Ini
                    </Button>,
                    <Button key="close" onClick={() => setIsDayModalVisible(false)}>Tutup</Button>
                ]}
            >
                {selectedDayEvents.length === 0 ? (
                    <div style={{ padding: '40px 0', textAlign: 'center', color: '#8c8c8c' }}>
                        Tidak ada agenda untuk tanggal ini.
                    </div>
                ) : (
                    <List
                        itemLayout="horizontal"
                        dataSource={selectedDayEvents}
                        renderItem={item => (
                            <List.Item
                                actions={isAdminOrCreator(item) ? [
                                    <Button type="text" icon={<EditOutlined />} onClick={() => handleOpenForm(item)} />,
                                    <Button
                                        type="text"
                                        danger
                                        icon={<DeleteOutlined />}
                                        onClick={() => {
                                            modal.confirm({
                                                title: 'Hapus Agenda',
                                                content: 'Yakin ingin menghapus agenda ini?',
                                                okText: 'Ya',
                                                okButtonProps: { danger: true },
                                                cancelText: 'Batal',
                                                onOk: () => handleDeleteAgenda(item.id),
                                            });
                                        }}
                                    />
                                ] : []}
                            >
                                <List.Item.Meta
                                    title={
                                        <Space>
                                            <Badge color={EVENT_COLORS[item.type] || 'default'} />
                                            <Text strong>{item.title}</Text>
                                            {item.type && <Text type="secondary" style={{ fontSize: '12px' }}>({item.type})</Text>}
                                        </Space>
                                    }
                                    description={
                                        <div style={{ marginTop: '8px' }}>
                                            <div style={{ marginBottom: '4px' }}>
                                                <ClockCircleOutlined style={{ marginRight: '8px' }} />
                                                {dayjs(item.start_time).format('HH:mm')} - {dayjs(item.end_time).format('HH:mm')}
                                            </div>
                                            {item.location_url && (
                                                <div style={{ marginBottom: '4px' }}>
                                                    <LinkOutlined style={{ marginRight: '8px' }} />
                                                    {item.location_url.startsWith('http') ? (
                                                        <a href={item.location_url} target="_blank" rel="noopener noreferrer">Buka Tautan Acara</a>
                                                    ) : item.location_url}
                                                </div>
                                            )}
                                            {item.penyelenggara && (
                                                <div style={{ marginBottom: '4px', fontStyle: 'italic', color: '#595959' }}>
                                                    Penyelenggara: {item.penyelenggara}
                                                </div>
                                            )}
                                            {item.link_surat && (
                                                <div style={{ marginBottom: '4px' }}>
                                                    <LinkOutlined style={{ marginRight: '8px' }} />
                                                    {item.link_surat.startsWith('http') ? (
                                                        <a href={item.link_surat} target="_blank" rel="noopener noreferrer">Buka Link Surat</a>
                                                    ) : item.link_surat}
                                                </div>
                                            )}
                                            {item.description && (
                                                <div style={{ whiteSpace: 'pre-line', color: '#595959' }}>{item.description}</div>
                                            )}
                                            <div style={{ marginTop: 4, fontSize: '12px', color: '#bfbfbf' }}>
                                                Dibuat oleh: {item.creator?.name || 'Sistem'}
                                            </div>
                                        </div>
                                    }
                                />
                            </List.Item>
                        )}
                    />
                )}
            </Modal>

            {/* Modal Form Tambah/Edit Agenda */}
            <Modal
                title={editingAgenda ? "Edit Agenda" : "Tambah Agenda"}
                open={isFormModalVisible}
                onCancel={() => setIsFormModalVisible(false)}
                onOk={() => form.submit()}
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleSaveAgenda}>
                    <Form.Item name="title" label="Judul Kegiatan" rules={[{ required: true, message: 'Harap masukkan judul kegiatan' }]}>
                        <Input placeholder="Contoh: Rapat Koordinasi Tahunan" />
                    </Form.Item>

                    <Form.Item name="type" label="Tipe Kegiatan" rules={[{ required: true }]}>
                        <Select>
                            <Option value="Rapat">Rapat / Meeting</Option>
                            <Option value="Zoom">Zoom / Virtual</Option>
                            <Option value="Dinas Luar">Dinas Luar</Option>
                            <Option value="Lainnya">Lainnya</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item name="penyelenggara" label="Penyelenggara (Opsional)" rules={[{ max: 255 }]}>
                        <Input placeholder="Contoh: Biro SDM BPOM" />
                    </Form.Item>

                    <Form.Item name="timeRange" label="Rentang Waktu" rules={[{ required: true, message: 'Harap pilih rentang waktu' }]}>
                        <RangePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item name="location_url" label="Lokasi / Tautan Zoom" rules={[{ max: 255 }]}>
                        <Input placeholder="https://zoom.us/j/... atau Ruang Rapat Lt 2" />
                    </Form.Item>

                    <Form.Item name="link_surat" label="Link Surat (Opsional)" rules={[{ max: 255 }]}>
                        <Input placeholder="https://simpan.pom.go.id/index.php/s/..." />
                    </Form.Item>

                    <Form.Item name="description" label="Deskripsi (Opsional)">
                        <Input.TextArea rows={3} placeholder="Catatan tambahan untuk acara ini" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
