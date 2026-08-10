import {
    App as AntdApp,
    Button,
    Card,
    Form,
    Input,
    Tabs,
    Typography,
    Row,
    Col,
    Upload,
    Spin,
    Avatar,
    Modal,
    Tag,
    Alert,
} from 'antd';
import {
    LockOutlined,
    SaveOutlined,
    UserOutlined,
    SafetyCertificateOutlined,
    BellOutlined,
    CameraOutlined,
    MailOutlined,
    PhoneOutlined,
    ContactsOutlined,
    IdcardOutlined,
} from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { buildMessageAdapter } from '../utils/notify.js';
import { useWebPush } from '../hooks/useWebPush.js';

const AccountSettings = () => {
    const navigate = useNavigate();
    const { user, updateProfile, changePassword, token, refreshProfile } = useAuth();
    const { message } = AntdApp.useApp();
    const notification = buildMessageAdapter(message);

    const [profileForm] = Form.useForm();
    const [passwordForm] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [badgeVisible, setBadgeVisible] = useState(false);
    const [resettingMfa, setResettingMfa] = useState(false);
    const push = useWebPush();

    useEffect(() => {
        if (user) {
            profileForm.setFieldsValue({
                name: user.name,
                email: user.email,
                phone_number: user.employee?.phone_number || user.phone_number || '',
                nip: user.employee?.nip || user.nip || '',
                role: user.base_role,
            });
        }
    }, [user, profileForm]);

    const handleUpdateProfile = async (values) => {
        setLoading(true);
        try {
            await updateProfile({
                name: values.name,
                email: values.email,
                phone_number: values.phone_number,
            });
            notification.success({
                message: 'Profil Diperbarui',
                description: 'Informasi profil Anda berhasil disimpan.',
            });
            refreshProfile();
        } catch (error) {
            notification.error({
                message: 'Gagal Memperbarui Profil',
                description: error.message,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (values) => {
        setLoading(true);
        try {
            await changePassword({
                current_password: values.current_password,
                password: values.password,
                password_confirmation: values.password_confirmation,
            });
            notification.success({
                message: 'Kata Sandi Diperbarui',
                description: 'Kata sandi Anda berhasil diubah.',
            });
            passwordForm.resetFields();
        } catch (error) {
            notification.error({
                message: 'Gagal Mengubah Kata Sandi',
                description: error.message,
            });
        } finally {
            setLoading(false);
        }
    };

    const avatarUrl = user?.employee?.avatar_url || user?.employee?.photo || null;

    const uploadProps = {
        name: 'photo',
        action: `${import.meta.env.VITE_API_URL || 'https://siptu.bpompalopo.com/core_api/api'}/user/profile/photo`,
        headers: {
            Authorization: `Bearer ${token}`,
        },
        showUploadList: false,
        beforeUpload(file) {
            const isAllowedType = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type);
            if (!isAllowedType) {
                message.error('Format file tidak didukung. Gunakan JPG, PNG, GIF atau WEBP.');
            }
            const isLt2M = file.size / 1024 / 1024 < 2;
            if (!isLt2M) {
                message.error('Ukuran foto tidak boleh melebihi 2MB.');
            }
            return isAllowedType && isLt2M;
        },
        onChange(info) {
            if (info.file.status === 'uploading') {
                setUploading(true);
                return;
            }
            if (info.file.status === 'done') {
                setUploading(false);
                notification.success({
                    message: 'Foto Diperbarui',
                    description: 'Foto profil Anda berhasil diubah.',
                });
                refreshProfile();
            } else if (info.file.status === 'error') {
                setUploading(false);
                const errMsg = info.file.response?.message || 'Gagal mengupload foto profil.';
                notification.error({
                    message: 'Upload Gagal',
                    description: errMsg,
                });
            }
        },
    };

    const handleResetMfa = () => {
        Modal.confirm({
            title: "Reset & Pindai Ulang MFA",
            content: "Tindakan ini akan mengosongkan rahasia MFA lama Anda. Anda harus memindai QR Code baru di Google Authenticator. Lanjutkan?",
            okText: "Ya, Pindai Ulang",
            cancelText: "Batal",
            okButtonProps: { danger: true },
            onOk: async () => {
                setResettingMfa(true);
                try {
                    const baseUrl = import.meta.env.VITE_API_URL || "https://siptu.bpompalopo.com/core_api/api";
                    const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/mfa/disable/${user.id}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/json',
                        }
                    });
                    if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        throw new Error(err.message || "Gagal mereset MFA.");
                    }
                    if (refreshProfile) await refreshProfile();
                    notification.success({ message: "MFA berhasil direset. Silakan pindai QR Code baru." });
                    navigate('/app/mfa-setup');
                } catch (e) {
                    notification.error({ message: e.message });
                } finally {
                    setResettingMfa(false);
                }
            }
        });
    };

    const items = [
        {
            key: 'profile',
            label: (
                <span>
                    <UserOutlined />
                    Profil Saya
                </span>
            ),
            children: (
                <Form
                    form={profileForm}
                    layout="vertical"
                    onFinish={handleUpdateProfile}
                    requiredMark={false}
                    style={{ maxWidth: 600, marginTop: 12 }}
                >
                    <Form.Item label="NIP" name="nip">
                        <Input disabled prefix={<SafetyCertificateOutlined />} />
                    </Form.Item>
                    <Form.Item label="Peran" name="role">
                        <Input disabled style={{ textTransform: 'capitalize' }} prefix={<ContactsOutlined />} />
                    </Form.Item>
                    <Form.Item
                        label="Nama Lengkap"
                        name="name"
                        rules={[{ required: true, message: 'Nama wajib diisi' }]}
                    >
                        <Input prefix={<UserOutlined />} placeholder="Nama Lengkap" />
                    </Form.Item>
                    <Form.Item
                        label="Email"
                        name="email"
                        rules={[
                            { required: true, message: 'Email wajib diisi' },
                            { type: 'email', message: 'Email tidak valid' },
                        ]}
                    >
                        <Input prefix={<MailOutlined />} placeholder="Email" />
                    </Form.Item>
                    <Form.Item label="Nomor Telepon" name="phone_number">
                        <Input prefix={<PhoneOutlined />} placeholder="Nomor Telepon" />
                    </Form.Item>

                    <Form.Item style={{ marginTop: 24 }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            icon={<SaveOutlined />}
                            loading={loading}
                        >
                            Simpan Perubahan
                        </Button>
                    </Form.Item>
                </Form>
            ),
        },
        {
            key: 'password',
            label: (
                <span>
                    <LockOutlined />
                    Ganti Kata Sandi
                </span>
            ),
            children: (
                <Form
                    form={passwordForm}
                    layout="vertical"
                    onFinish={handleChangePassword}
                    requiredMark={false}
                    style={{ maxWidth: 600, marginTop: 12 }}
                >
                    <Form.Item
                        label="Kata Sandi Saat Ini"
                        name="current_password"
                        rules={[
                            { required: true, message: 'Kata sandi saat ini wajib diisi' },
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Masukkan kata sandi saat ini" />
                    </Form.Item>
                    <Form.Item
                        label="Kata Sandi Baru"
                        name="password"
                        rules={[
                            { required: true, message: 'Kata sandi baru wajib diisi' },
                            { min: 8, message: 'Minimal 8 karakter' },
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Masukkan kata sandi baru" />
                    </Form.Item>
                    <Form.Item
                        label="Konfirmasi Kata Sandi Baru"
                        name="password_confirmation"
                        dependencies={['password']}
                        rules={[
                            { required: true, message: 'Konfirmasi kata sandi wajib diisi' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('password') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(
                                        new Error('Konfirmasi kata sandi tidak cocok')
                                    );
                                },
                            }),
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder=" Ulangi kata sandi baru" />
                    </Form.Item>

                    <Form.Item style={{ marginTop: 24 }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            icon={<SaveOutlined />}
                            loading={loading}
                        >
                            Perbarui Kata Sandi
                        </Button>
                    </Form.Item>
                </Form>
            ),
        },
        {
            key: 'notifications',
            label: (
                <span>
                    <BellOutlined />
                    Notifikasi
                </span>
            ),
            children: (
                <div style={{ maxWidth: 600, marginTop: 12 }}>
                    <Typography.Title level={5}>Notifikasi Push (Aplikasi Mobile)</Typography.Title>
                    <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
                        Aktifkan notifikasi untuk menerima pemberitahuan secara langsung di perangkat Anda meskipun aplikasi sedang tidak dibuka. (Note: Di iOS, fitur ini hanya berfungsi jika Anda telah menambahkan PWA SIPTU ke layar utama / Add to Home Screen).
                    </Typography.Paragraph>

                    {push.isSupported ? (
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                            {push.isSubscribed ? (
                                <>
                                    <Button 
                                        danger 
                                        loading={push.isLoading} 
                                        onClick={push.unsubscribe}
                                    >
                                        Matikan Notifikasi
                                    </Button>
                                    <Button 
                                        type="default" 
                                        onClick={push.sendTestNotification}
                                    >
                                        Kirim Notifikasi Tes
                                    </Button>
                                </>
                            ) : (
                                <Button 
                                    type="primary" 
                                    loading={push.isLoading} 
                                    onClick={push.subscribe}
                                    icon={<BellOutlined />}
                                >
                                    Aktifkan Notifikasi
                                </Button>
                            )}
                        </div>
                    ) : (
                        <Typography.Text type="danger">
                            Browser atau perangkat Anda tidak mendukung fitur Notifikasi Push.
                        </Typography.Text>
                    )}
                </div>
            )
        },
        {
            key: 'mfa',
            label: (
                <span>
                    <SafetyCertificateOutlined />
                    Keamanan MFA
                </span>
            ),
            children: (
                <div style={{ maxWidth: 600, marginTop: 12 }}>
                    <Typography.Title level={5}>Autentikasi Dua Langkah (MFA TOTP)</Typography.Title>
                    <Typography.Paragraph type="secondary" style={{ marginBottom: 20 }}>
                        Autentikasi Dua Langkah menambahkan lapisan keamanan ekstra pada akun dan tanda tangan elektronik (TTE) Anda menggunakan aplikasi Google Authenticator atau Microsoft Authenticator.
                    </Typography.Paragraph>

                    <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: 20 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                            <Typography.Text strong>Status Keamanan MFA:</Typography.Text>
                            {user?.has_mfa ? (
                                <Tag color="success" style={{ padding: "4px 12px", fontSize: 13, borderRadius: 6 }}>
                                    ✓ AKTIF & TERDOKUMENTASI
                                </Tag>
                            ) : (
                                <Tag color="warning" style={{ padding: "4px 12px", fontSize: 13, borderRadius: 6 }}>
                                    ! BELUM AKTIF
                                </Tag>
                            )}
                        </div>

                        {user?.has_mfa ? (
                            <Alert
                                type="success"
                                showIcon
                                message="Akun Anda Dilindungi MFA"
                                description="Setiap kali Anda login atau melakukan Tanda Tangan Elektronik (TTE), sistem akan meminta kode 6 digit dari aplikasi authenticator Anda."
                            />
                        ) : (
                            <Alert
                                type="warning"
                                showIcon
                                message="MFA Diperlukan"
                                description="Silakan lakukan setup QR Code sekarang agar akun dan TTE Anda terlindungi sepenuhnya."
                            />
                        )}
                    </div>

                    <Button
                        type="primary"
                        icon={<SafetyCertificateOutlined />}
                        size="large"
                        loading={resettingMfa}
                        onClick={() => {
                            if (user?.has_mfa) {
                                handleResetMfa();
                            } else {
                                navigate('/app/mfa-setup');
                            }
                        }}
                        style={{ background: "#0b56a4", borderRadius: 8 }}
                    >
                        {user?.has_mfa ? "Atur Ulang / Pindai Ulang QR Code MFA" : "Setup MFA Sekarang"}
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="module-section">
            <div className="module-toolbar">
                <div>
                    <Typography.Title level={4} className="module-title">
                        Pengaturan Akun
                    </Typography.Title>
                    <Typography.Text className="module-subtitle">
                        Kelola informasi profil dan keamanan akun Anda.
                    </Typography.Text>
                </div>
            </div>

            <Row gutter={[24, 24]}>
                {/* Left Side: Photo & Information Overview (Smaller Width) */}
                <Col xs={24} md={8} lg={7}>
                    <Card className="profile-sidebar-card" variant="borderless">
                        <div style={{ padding: '20px 12px 12px' }}>
                            {/* Profile Image Uploader */}
                            <div className="profile-avatar-wrapper">
                                <Upload {...uploadProps}>
                                    <div className="profile-avatar-container">
                                        {uploading && (
                                            <div className="profile-avatar-loading">
                                                <Spin />
                                            </div>
                                        )}
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt={user?.name} className="profile-avatar-img" />
                                        ) : (
                                            <div className="profile-avatar-fallback">
                                                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                            </div>
                                        )}
                                        <div className="profile-avatar-overlay">
                                            <CameraOutlined style={{ fontSize: 20, marginBottom: 4 }} />
                                            <span>Ganti Foto</span>
                                        </div>
                                    </div>
                                </Upload>
                            </div>

                            {/* User Metadata */}
                            <div className="profile-meta-info">
                                <Typography.Title level={4} className="profile-meta-name">
                                    {user?.name || 'User SIPTU'}
                                </Typography.Title>
                                <div className="profile-meta-nip">
                                    NIP: {user?.employee?.nip || user?.nip || '-'}
                                </div>
                                <div className="profile-meta-badges">
                                    <span className="profile-badge-role">
                                        {user?.base_role}
                                    </span>
                                    {user?.employee?.position && (
                                        <span className="profile-badge-jabatan">
                                            {user.employee.position}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Detailed List */}
                            <div className="profile-details-list">
                                <div className="profile-detail-item">
                                    <MailOutlined className="profile-detail-icon" />
                                    <div className="profile-detail-content">
                                        <span className="profile-detail-label">Email</span>
                                        <span className="profile-detail-value">{user?.email || '-'}</span>
                                    </div>
                                </div>
                                <div className="profile-detail-item">
                                    <PhoneOutlined className="profile-detail-icon" />
                                    <div className="profile-detail-content">
                                        <span className="profile-detail-label">Telepon</span>
                                        <span className="profile-detail-value">
                                            {user?.employee?.phone_number || user?.phone_number || '-'}
                                        </span>
                                    </div>
                                </div>
                                <div className="profile-detail-item">
                                    <SafetyCertificateOutlined className="profile-detail-icon" />
                                    <div className="profile-detail-content">
                                        <span className="profile-detail-label">Unit Kerja</span>
                                        <span className="profile-detail-value" style={{ fontSize: '12px', lineHeight: '1.4' }}>
                                            {user?.employee?.department || user?.employee?.function_area || 'Balai Besar POM di Palopo'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Action Button: My Profile */}
                            <Button 
                                type="primary" 
                                icon={<IdcardOutlined />} 
                                className="profile-card-action-btn"
                                block
                                onClick={() => setBadgeVisible(true)}
                            >
                                My Profile
                            </Button>
                        </div>
                    </Card>
                </Col>

                {/* Right Side: Tab Forms (Takes Remaining space) */}
                <Col xs={24} md={16} lg={17}>
                    <Card
                        variant="borderless"
                        style={{
                            borderRadius: 24,
                            boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
                            minHeight: 500,
                            padding: '12px 16px',
                            border: '1px solid rgba(226, 232, 240, 0.8)'
                        }}
                    >
                        <Tabs defaultActiveKey="profile" items={items} />
                    </Card>
                </Col>
            </Row>

            {/* Digital ID Card Modal */}
            <Modal
                open={badgeVisible}
                onCancel={() => setBadgeVisible(false)}
                footer={null}
                width={360}
                centered
                styles={{ body: { padding: 0 } }}
            >
                <div className="digital-badge-container">
                    <div className="digital-badge">
                        <div className="digital-badge-clip"></div>
                        <div className="digital-badge-header">
                            <Typography.Title level={5} className="digital-badge-title">BADGE PEGAWAI</Typography.Title>
                            <div className="digital-badge-subtitle">SIPTU BALAI POM</div>
                        </div>
                        <div className="digital-badge-body">
                            <div className="digital-badge-avatar">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt={user?.name} />
                                ) : (
                                    <div className="profile-avatar-fallback">
                                        {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                    </div>
                                )}
                            </div>
                            <Typography.Text className="digital-badge-name">{user?.name || 'User SIPTU'}</Typography.Text>
                            <div className="digital-badge-nip">NIP: {user?.employee?.nip || user?.nip || '-'}</div>
                            
                            <div className="digital-badge-info-box">
                                <div className="digital-badge-info-label">Jabatan & Golongan</div>
                                <div className="digital-badge-info-val">
                                    {user?.employee?.position || 'Pegawai'}
                                    {user?.employee?.pangkat ? ` (${user.employee.pangkat})` : ''}
                                </div>
                                <div className="digital-badge-info-label" style={{ marginTop: 8 }}>Unit Kerja</div>
                                <div className="digital-badge-info-val" style={{ fontSize: 11 }}>
                                    {user?.employee?.department || user?.employee?.function_area || 'Balai Besar POM di Palopo'}
                                </div>
                            </div>
                            
                            <div className="digital-badge-qr">
                                <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${user?.employee?.nip || user?.nip || 'SIPTU'}`} 
                                    alt="QR Code NIP" 
                                    style={{ width: '100%', height: '100%' }}
                                />
                            </div>
                        </div>
                        <div className="digital-badge-footer">
                            SISTEM INFORMASI PELAYANAN TATA USAHA
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default AccountSettings;
