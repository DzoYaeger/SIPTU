import React, { useState, useEffect } from "react";
import { Card, Select, Button, Typography, Space, Spin, Alert, Form } from "antd";
import { SaveOutlined, TeamOutlined, UserOutlined } from "@ant-design/icons";
import { useAuth } from "../hooks/useAuth.js";
import { App as AntdApp } from "antd";
import "./KeuanganPejabat.css";

const { Title, Paragraph } = Typography;

export default function KeuanganPejabat() {
    const { apiFetch } = useAuth();
    const { message } = AntdApp.useApp();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    
    const [employees, setEmployees] = useState([]);
    const [bendaharaId, setBendaharaId] = useState(null);
    const [ppkId, setPpkId] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // Fetch employees
                const resEmp = await apiFetch("/employees?pageSize=1000");
                const jsonEmp = await resEmp.json();
                setEmployees(jsonEmp.data ?? []);

                // Fetch active settings
                const resSet = await apiFetch("/pejabat-perbendaharaan");
                const jsonSet = await resSet.json();
                if (jsonSet.setting) {
                    setBendaharaId(jsonSet.setting.bendahara_id);
                    setPpkId(jsonSet.setting.ppk_id);
                }
            } catch (err) {
                console.error(err);
                message.error("Gagal memuat data pengaturan.");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [apiFetch, message]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await apiFetch("/pejabat-perbendaharaan", {
                method: "POST",
                body: JSON.stringify({
                    bendahara_id: bendaharaId,
                    ppk_id: ppkId
                })
            });

            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.errors ? Object.values(json.errors).flat().join(", ") : "Gagal menyimpan.");
            }

            message.success("Pengaturan pejabat perbendaharaan berhasil disimpan.");
        } catch (err) {
            console.error(err);
            message.error(err.message || "Gagal menyimpan pengaturan.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="kp-container">
            <Card className="kp-card" bordered={false}>
                <div className="kp-header">
                    <div className="kp-header-icon">
                        <TeamOutlined />
                    </div>
                    <div>
                        <Title level={3} className="kp-title">Pengaturan Pejabat Perbendaharaan</Title>
                        <Paragraph className="kp-subtitle">
                            Atur pejabat bendahara dan PPK secara global. Nama dan NIP pejabat yang dipilih akan muncul secara otomatis di lembar tanda tangan seluruh laporan rincian biaya LPJ.
                        </Paragraph>
                    </div>
                </div>

                <Alert 
                    message="Penting"
                    description="Perubahan pengaturan di sini akan langsung berlaku untuk semua berkas LPJ yang dicetak dari sistem."
                    type="info"
                    showIcon
                    className="kp-alert"
                />

                <Spin spinning={loading}>
                    <Form layout="vertical" onFinish={handleSave} className="kp-form">
                        <Form.Item 
                            label={<span className="kp-form-label"><UserOutlined style={{ marginRight: 6 }} />Bendahara Pengeluaran</span>}
                            tooltip="Pejabat yang bertindak sebagai Bendahara Pengeluaran pada dokumen rincian biaya."
                        >
                            <Select
                                showSearch
                                placeholder="Pilih Bendahara Pengeluaran..."
                                optionFilterProp="label"
                                value={bendaharaId}
                                onChange={(val) => setBendaharaId(val)}
                                options={employees.map(emp => ({
                                    value: emp.id,
                                    label: `${emp.name} (NIP. ${emp.nip ?? '-'})`
                                }))}
                                allowClear
                                className="kp-select"
                                size="large"
                            />
                        </Form.Item>

                        <Form.Item 
                            label={<span className="kp-form-label"><UserOutlined style={{ marginRight: 6 }} />Pejabat Pembuat Komitmen (PPK)</span>}
                            tooltip="Pejabat yang menyetujui pembayaran perjalanan dinas."
                        >
                            <Select
                                showSearch
                                placeholder="Pilih Pejabat Pembuat Komitmen (PPK)..."
                                optionFilterProp="label"
                                value={ppkId}
                                onChange={(val) => setPpkId(val)}
                                options={employees.map(emp => ({
                                    value: emp.id,
                                    label: `${emp.name} (NIP. ${emp.nip ?? '-'})`
                                }))}
                                allowClear
                                className="kp-select"
                                size="large"
                            />
                        </Form.Item>

                        <div className="kp-form-actions">
                            <Button 
                                type="primary" 
                                icon={<SaveOutlined />} 
                                loading={saving} 
                                htmlType="submit"
                                size="large"
                                className="kp-save-btn"
                            >
                                Simpan Pengaturan
                            </Button>
                        </div>
                    </Form>
                </Spin>
            </Card>
        </div>
    );
}
