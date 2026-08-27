import 'package:flutter/material.dart';
import '../data/auth_service.dart';
import '../../../core/security/security_service.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key, required this.onAuthenticated});
  final VoidCallback onAuthenticated;
  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nip = TextEditingController();
  final _password = TextEditingController();
  final _otp = TextEditingController();
  final _auth = AuthService();
  bool _loading = false;
  bool _obscure = true;
  String? _mfaToken;
  String? _error;

  @override
  void dispose() {
    _nip.dispose();
    _password.dispose();
    _otp.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_mfaToken != null) return _verifyOtp();
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result = await _auth.login(
        nip: _nip.text.trim(),
        password: _password.text,
      );
      if (!mounted) return;
      if (result.requiresMfa) {
        setState(() {
          _mfaToken = result.mfaToken;
          _loading = false;
        });
      } else {
        widget.onAuthenticated();
      }
    } catch (error) {
      if (mounted)
        setState(() {
          _loading = false;
          _error = error.toString();
        });
    }
  }

  Future<void> _verifyOtp() async {
    if (_otp.text.trim().length != 6) {
      setState(() => _error = 'Masukkan 6 digit kode OTP.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await _auth.verifyMfa(mfaToken: _mfaToken!, code: _otp.text.trim());
      if (mounted) widget.onAuthenticated();
    } catch (error) {
      if (mounted)
        setState(() {
          _loading = false;
          _error = error.toString();
        });
    }
  }

  Future<void> _biometric() async {
    final success = await SecurityService.instance.authenticateWithBiometrics(
      reason: 'Buka SIPTU ULTRA',
    );
    final hasSession = await SecurityService.instance.hasSession();
    if (success && hasSession && mounted) {
      widget.onAuthenticated();
    } else if (mounted && !hasSession) {
      setState(
        () => _error =
            'Belum ada sesi tersimpan. Silakan login dengan NIP terlebih dahulu.',
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isMfa = _mfaToken != null;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 460),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: const Color(0xFF0B1F3A),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Icon(
                      Icons.account_balance_rounded,
                      color: Colors.white,
                      size: 28,
                    ),
                  ),
                  const SizedBox(height: 28),
                  Text(
                    isMfa ? 'Verifikasi keamanan' : 'Selamat datang kembali',
                    style: const TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF0B1F3A),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    isMfa
                        ? 'Masukkan kode dari aplikasi authenticator untuk melanjutkan.'
                        : 'Masuk untuk mengelola layanan dan pengajuan kerja.',
                    style: const TextStyle(
                      color: Color(0xFF718096),
                      height: 1.45,
                    ),
                  ),
                  const SizedBox(height: 28),
                  if (_error != null)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(13),
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFEAEA),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.error_outline_rounded,
                            color: Color(0xFFB42318),
                            size: 20,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _error!,
                              style: const TextStyle(
                                color: Color(0xFFB42318),
                                fontSize: 13,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  Form(key: _formKey, child: isMfa ? _otpForm() : _loginForm()),
                  const SizedBox(height: 16),
                  if (!isMfa)
                    Center(
                      child: TextButton.icon(
                        onPressed: _biometric,
                        icon: const Icon(Icons.fingerprint_rounded),
                        label: const Text('Masuk dengan biometrik'),
                      ),
                    ),
                  if (isMfa)
                    Center(
                      child: TextButton(
                        onPressed: _loading
                            ? null
                            : () => setState(() {
                                _mfaToken = null;
                                _error = null;
                              }),
                        child: const Text('Kembali ke login'),
                      ),
                    ),
                  const SizedBox(height: 26),
                  Center(
                    child: Text(
                      'SIPTU ULTRA • Balai POM di Palopo',
                      style: TextStyle(
                        color: Colors.blueGrey.shade400,
                        fontSize: 11,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _loginForm() => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const Text(
        'NIP PEGAWAI',
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: .5,
          color: Color(0xFF4A5568),
        ),
      ),
      const SizedBox(height: 7),
      TextFormField(
        controller: _nip,
        keyboardType: TextInputType.number,
        textInputAction: TextInputAction.next,
        decoration: const InputDecoration(
          hintText: 'Masukkan NIP',
          prefixIcon: Icon(Icons.badge_outlined),
        ),
        validator: (value) =>
            value == null || value.trim().isEmpty ? 'NIP wajib diisi' : null,
      ),
      const SizedBox(height: 16),
      const Text(
        'PASSWORD',
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: .5,
          color: Color(0xFF4A5568),
        ),
      ),
      const SizedBox(height: 7),
      TextFormField(
        controller: _password,
        obscureText: _obscure,
        onFieldSubmitted: (_) => _submit(),
        decoration: InputDecoration(
          hintText: 'Masukkan password',
          prefixIcon: const Icon(Icons.lock_outline_rounded),
          suffixIcon: IconButton(
            onPressed: () => setState(() => _obscure = !_obscure),
            icon: Icon(
              _obscure
                  ? Icons.visibility_outlined
                  : Icons.visibility_off_outlined,
            ),
          ),
        ),
        validator: (value) =>
            value == null || value.isEmpty ? 'Password wajib diisi' : null,
      ),
      const SizedBox(height: 22),
      _submitButton('Masuk ke aplikasi'),
    ],
  );

  Widget _otpForm() => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const Text(
        'KODE OTP',
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: .5,
          color: Color(0xFF4A5568),
        ),
      ),
      const SizedBox(height: 7),
      TextFormField(
        controller: _otp,
        autofocus: true,
        keyboardType: TextInputType.number,
        maxLength: 6,
        textAlign: TextAlign.center,
        style: const TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.w700,
          letterSpacing: 8,
        ),
        decoration: const InputDecoration(counterText: '', hintText: '000000'),
        onFieldSubmitted: (_) => _verifyOtp(),
      ),
      const SizedBox(height: 22),
      _submitButton('Verifikasi dan lanjutkan'),
    ],
  );

  Widget _submitButton(String label) => SizedBox(
    width: double.infinity,
    height: 52,
    child: FilledButton(
      onPressed: _loading ? null : _submit,
      style: FilledButton.styleFrom(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
      child: _loading
          ? const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Colors.white,
              ),
            )
          : Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
    ),
  );
}
