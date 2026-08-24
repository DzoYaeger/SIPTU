import React, { useState, useEffect } from "react";
import { Select, Button, Spin, Form, Row, Col } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { useAuth } from "../hooks/useAuth.js";
import { App as AntdApp } from "antd";
import "./KeuanganPejabat.css";

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
                const resEmp = await apiFetch("/employees?pageSize=1000");
                const jsonEmp = await resEmp.json();
                setEmployees(jsonEmp.data ?? []);

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

    const selectedPPK = employees.find(e => e.id === ppkId);
    const selectedBendahara = employees.find(e => e.id === bendaharaId);

    return (
        <div className="kp-module-container">
            <div className="kp-main-card">
                <div className="kp-card-header">
                    <h2 className="kp-card-title">Penetapan Pejabat Perbendaharaan Global</h2>
                    <span className="kp-card-subtitle">
                        Nama dan NIP pejabat PPK & Bendahara aktif yang tercetak otomatis di seluruh dokumen cetak LPJ & Invoice
                    </span>
                </div>

                <Spin spinning={loading}>
                    <Form layout="vertical" onFinish={handleSave}>
                        <Row gutter={[16, 16]}>
                            {/* PPK Selector */}
                            <Col xs={24} md={12}>
                                <div className="kp-field-box">
                                    <div className="kp-field-header">
                                        <span className="kp-field-tag">PEJABAT STRUKTURAL</span>
                                        <h3 className="kp-field-name">Pejabat Pembuat Komitmen (PPK)</h3>
                                    </div>

                                    <Form.Item 
                                        label="Pilih Pegawai PPK"
                                        style={{ marginBottom: 8 }}
                                    >
                                        <Select
                                            showSearch
                                            placeholder="Cari nama / NIP PPK..."
                                            optionFilterProp="label"
                                            value={ppkId}
                                            onChange={(val) => setPpkId(val)}
                                            options={employees.map(emp => ({
                                                value: emp.id,
                                                label: `${emp.name} (NIP. ${emp.nip ?? '-'})`
                                            }))}
                                            allowClear
                                        />
                                    </Form.Item>

                                    {selectedPPK && (
                                        <div className="kp-selected-preview">
                                            <strong>{selectedPPK.name}</strong>
                                            <span>NIP. {selectedPPK.nip || '-'}</span>
                                        </div>
                                    )}
                                </div>
                            </Col>

                            {/* Bendahara Selector */}
                            <Col xs={24} md={12}>
                                <div className="kp-field-box">
                                    <div className="kp-field-header">
                                        <span className="kp-field-tag">PENGELOLA KEUANGAN</span>
                                        <h3 className="kp-field-name">Bendahara Pengeluaran</h3>
                                    </div>

                                    <Form.Item 
                                        label="Pilih Pegawai Bendahara"
                                        style={{ marginBottom: 8 }}
                                    >
                                        <Select
                                            showSearch
                                            placeholder="Cari nama / NIP Bendahara..."
                                            optionFilterProp="label"
                                            value={bendaharaId}
                                            onChange={(val) => setBendaharaId(val)}
                                            options={employees.map(emp => ({
                                                value: emp.id,
                                                label: `${emp.name} (NIP. ${emp.nip ?? '-'})`
                                            }))}
                                            allowClear
                                        />
                                    </Form.Item>

                                    {selectedBendahara && (
                                        <div className="kp-selected-preview">
                                            <strong>{selectedBendahara.name}</strong>
                                            <span>NIP. {selectedBendahara.nip || '-'}</span>
                                        </div>
                                    )}
                                </div>
                            </Col>
                        </Row>

                        <div className="kp-footer-actions">
                            <div></div>
                            <Button 
                                type="primary" 
                                icon={<SaveOutlined />} 
                                loading={saving} 
                                htmlType="submit"
                            >
                                Simpan Pengaturan Pejabat
                            </Button>
                        </div>
                    </Form>
                </Spin>
            </div>
        </div>
    );
}
