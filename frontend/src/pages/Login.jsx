import { LockOutlined, IdcardOutlined, AndroidOutlined } from '@ant-design/icons';
import { Alert, Button, Checkbox, Form, Input, Modal, message } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import ReCaptcha from '../components/ReCaptcha.jsx';
import './Login.css';

const REMEMBER_CREDENTIAL_KEY = 'sipaus_remember_credentials';

const readRememberedCredentials = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(REMEMBER_CREDENTIAL_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    if (!payload || typeof payload !== 'object') return null;
    const { nip, password } = payload;
    if (typeof nip !== 'string' || typeof password !== 'string') return null;
    return { nip, password };
  } catch (_) {
    return null;
  }
};

// Captcha slider removed in favor of Google reCAPTCHA v2

const Login = () => {
  const { login, authLoading, requestPasswordReset, resetPassword } = useAuth();
  const [form] = Form.useForm();
  const [forgotForm] = Form.useForm();
  const [resetForm] = Form.useForm();
  const [error, setError] = useState(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [forgotStep, setForgotStep] = useState('request');
  const [forgotMessage, setForgotMessage] = useState(null);
  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const recaptchaRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();
  const remembered = useMemo(() => readRememberedCredentials(), []);
  
  const postLoginTarget = useMemo(() => {
    const redirect = new URLSearchParams(location.search).get('redirect');
    if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
      return redirect;
    }
    return '/app';
  }, [location.search]);

  useEffect(() => {
    if (remembered) {
      form.setFieldsValue({
        nip: remembered.nip,
        password: remembered.password,
        remember: true,
      });
    }
  }, [form, remembered]);

  const handleSubmit = async (values) => {
    if (!recaptchaToken) {
      message.warning('Silakan selesaikan verifikasi reCAPTCHA terlebih dahulu.');
      return;
    }

    try {
      setError(null);
      if (values.remember) {
        window.localStorage.setItem(
          REMEMBER_CREDENTIAL_KEY,
          JSON.stringify({ nip: values.nip, password: values.password })
        );
      } else {
        window.localStorage.removeItem(REMEMBER_CREDENTIAL_KEY);
      }
      await login(values.nip, values.password, recaptchaToken);
      navigate(postLoginTarget);
    } catch (err) {
      let msg = err.message || 'Gagal masuk. Periksa kembali kredensial Anda.';
      if (err.errors) {
        const firstKey = Object.keys(err.errors)[0];
        if (firstKey && err.errors[firstKey][0]) {
          msg = err.errors[firstKey][0];
        }
      }
      setError(msg);
      message.error(msg);
      // Reset reCAPTCHA on login failure
      recaptchaRef.current?.reset();
    }
  };

  const openForgotModal = () => {
    setForgotOpen(true);
    setForgotStep('request');
    setForgotMessage(null);
    forgotForm.resetFields();
    resetForm.resetFields();
  };

  const handleRequestReset = async (values) => {
    try {
      setForgotLoading(true);
      setForgotMessage(null);
      const data = await requestPasswordReset(values.identifier);
      setForgotStep('reset');
      resetForm.setFieldsValue({
        identifier: data.identifier || values.identifier,
        token: data.reset_token || '',
      });
      setForgotMessage('Token reset berhasil dibuat. Masukkan token dan kata sandi baru.');
    } catch (err) {
      setForgotMessage(err.message || 'Gagal membuat token reset.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (values) => {
    try {
      setResetLoading(true);
      setForgotMessage(null);
      await resetPassword(values);
      setForgotMessage('Kata sandi berhasil diperbarui. Silakan login kembali.');
      setTimeout(() => {
        setForgotOpen(false);
      }, 1500);
    } catch (err) {
      setForgotMessage(err.message || 'Gagal memperbarui kata sandi.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-form-header">
          <img src="/logo/logo.png" alt="SIPTU Logo" className="login-logo" />
          <h2>Login SIPTU</h2>
          <p>Akses Sistem Layanan Mandiri</p>
        </div>

        <Form layout="vertical" form={form} onFinish={handleSubmit} autoComplete="off">
          <Form.Item
            name="nip"
            rules={[
              { required: true, message: 'NIP wajib diisi.' },
              { pattern: /^\d{18}$/, message: 'Gunakan 18 digit angka NIP.' },
            ]}
          >
            <Input
              size="large"
              prefix={<IdcardOutlined />}
              placeholder="Masukkan NIP Anda"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Kata sandi wajib diisi.' }]}
          >
            <Input.Password
              size="large"
              prefix={<LockOutlined />}
              placeholder="Masukkan kata sandi"
            />
          </Form.Item>

          <div className="login-extra-options">
            <Form.Item
              name="remember"
              valuePropName="checked"
              initialValue={Boolean(remembered)}
              noStyle
            >
              <Checkbox>Ingat saya</Checkbox>
            </Form.Item>
            <span onClick={openForgotModal} className="forgot-link">
              Lupa Password?
            </span>
          </div>

          <ReCaptcha 
            ref={recaptchaRef}
            onChange={setRecaptchaToken}
            sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'}
          />

          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              style={{ marginBottom: '20px', borderRadius: '12px' }}
            />
          )}

          <Button 
            type="primary" 
            htmlType="submit" 
            size="large" 
            className="login-submit-btn" 
            loading={authLoading}
            disabled={!recaptchaToken}
          >
            Masuk Sekarang
          </Button>

          <button 
            type="button" 
            className="apk-download-btn" 
            onClick={() => window.open('https://www.dropbox.com/scl/fi/jwli2flrz0lv59f3qsddp/update.apk?rlkey=qd9pbowzjr67cp1wdoc9wlqb5&st=kq1wwagm&dl=1', '_blank')}
          >
            <AndroidOutlined /> Unduh Mobile App
          </button>
        </Form>
      </div>

      <Modal
        title="Reset Kata Sandi"
        open={forgotOpen}
        onCancel={() => setForgotOpen(false)}
        footer={null}
        centered
        styles={{ mask: { backdropFilter: 'blur(10px)' } }}
        destroyOnClose
      >
        {forgotMessage && (
          <Alert
            type={forgotMessage.includes('berhasil') ? 'success' : 'error'}
            message={forgotMessage}
            showIcon
            style={{ marginBottom: '16px', borderRadius: '8px' }}
          />
        )}
        {forgotStep === 'request' ? (
          <Form layout="vertical" form={forgotForm} onFinish={handleRequestReset}>
            <Form.Item
              name="identifier"
              label="NIP atau Email"
              rules={[{ required: true, message: 'Wajib diisi.' }]}
            >
              <Input size="large" placeholder="Masukkan NIP atau email" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={forgotLoading} style={{ borderRadius: '12px' }}>
              Kirim Token
            </Button>
          </Form>
        ) : (
          <Form layout="vertical" form={resetForm} onFinish={handleResetPassword}>
            <Form.Item name="identifier" label="NIP atau Email">
              <Input disabled size="large" />
            </Form.Item>
            <Form.Item
              name="token"
              label="Token Verifikasi"
              rules={[{ required: true, message: 'Token wajib diisi.' }]}
            >
              <Input size="large" placeholder="Masukkan token" />
            </Form.Item>
            <Form.Item
              name="password"
              label="Sandi Baru"
              rules={[{ required: true, message: 'Sandi baru wajib diisi.' }]}
            >
              <Input.Password size="large" />
            </Form.Item>
            <Form.Item
              name="password_confirmation"
              label="Konfirmasi Sandi"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Konfirmasi wajib.' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) return Promise.resolve();
                    return Promise.reject(new Error('Sandi tidak cocok.'));
                  },
                }),
              ]}
            >
              <Input.Password size="large" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={resetLoading} style={{ borderRadius: '12px' }}>
              Update Sandi
            </Button>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default Login;
