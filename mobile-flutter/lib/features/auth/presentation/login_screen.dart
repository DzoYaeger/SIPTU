import 'package:flutter/material.dart';
import '../../../core/security/security_service.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../home/presentation/home_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nipController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _isLoading = false;

  @override
  void dispose() {
    _nipController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    await Future.delayed(const Duration(milliseconds: 800));

    // Save dummy token for session
    await SecurityService.instance.saveToken('dummy_jwt_token_sample');

    if (!mounted) return;
    setState(() => _isLoading = false);

    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => HomeScreen(
          userName: _nipController.text.trim().isNotEmpty
              ? 'Budi Santoso'
              : 'Pegawai SIPTU',
          userNip: _nipController.text.trim().isNotEmpty
              ? _nipController.text.trim()
              : '198501012010011001',
        ),
      ),
    );
  }

  void _handleBiometricLogin() async {
    final authenticated = await SecurityService.instance.authenticateWithBiometrics(
      reason: 'Login ke SIPTU Mobile dengan Fingerprint / FaceID',
    );

    if (authenticated && mounted) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => const HomeScreen(
            userName: 'Budi Santoso',
            userNip: '198501012010011001',
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgCanvas,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 32.0),
              // Brand Logo Header
              Center(
                child: Container(
                  width: 80.0,
                  height: 80.0,
                  padding: const EdgeInsets.all(12.0),
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    shape: BoxShape.circle,
                  ),
                  child: Image.asset(
                    'assets/images/logo.png',
                    errorBuilder: (context, error, stackTrace) => const Icon(
                      Icons.shield_outlined,
                      size: 40.0,
                      color: AppColors.primary,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16.0),
              Center(
                child: Text(
                  'SIPTU ULTRA',
                  style: AppTypography.heroHeaderName.copyWith(
                    color: AppColors.primary,
                    fontSize: 24.0,
                  ),
                ),
              ),
              Center(
                child: Text(
                  'Balai POM di Palopo',
                  style: AppTypography.caption,
                ),
              ),
              const SizedBox(height: 40.0),

              // Form Container Card
              Container(
                padding: const EdgeInsets.all(20.0),
                decoration: BoxDecoration(
                  color: AppColors.surfaceCard,
                  borderRadius: BorderRadius.circular(20.0),
                  border: Border.all(color: AppColors.borderHairline),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x0A0F172A),
                      blurRadius: 16.0,
                      offset: Offset(0, 4.0),
                    ),
                  ],
                ),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('MASUK LAYANAN MANDIRI', style: AppTypography.sectionHeader),
                      const SizedBox(height: 4.0),
                      Text('Gunakan NIP dan password akun SIPTU Anda', style: AppTypography.caption),
                      const SizedBox(height: 20.0),

                      // NIP Field
                      Text('NIP PEGAWAI', style: AppTypography.formLabel),
                      const SizedBox(height: 6.0),
                      TextFormField(
                        controller: _nipController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          hintText: 'Masukkan 18 digit NIP',
                          prefixIcon: Icon(Icons.badge_outlined, size: 20.0),
                        ),
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) return 'NIP wajib diisi';
                          return null;
                        },
                      ),
                      const SizedBox(height: 16.0),

                      // Password Field
                      Text('PASSWORD', style: AppTypography.formLabel),
                      const SizedBox(height: 6.0),
                      TextFormField(
                        controller: _passwordController,
                        obscureText: _obscurePassword,
                        decoration: InputDecoration(
                          hintText: 'Masukkan password Anda',
                          prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20.0),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                              size: 20.0,
                            ),
                            onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                          ),
                        ),
                        validator: (val) {
                          if (val == null || val.isEmpty) return 'Password wajib diisi';
                          return null;
                        },
                      ),
                      const SizedBox(height: 24.0),

                      // Submit Button
                      ElevatedButton(
                        onPressed: _isLoading ? null : _handleLogin,
                        child: _isLoading
                            ? const SizedBox(
                                width: 20.0,
                                height: 20.0,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.0),
                              )
                            : const Text('Masuk Aplikasi'),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 24.0),

              // Biometric Auth Option
              Center(
                child: OutlinedButton.icon(
                  onPressed: _handleBiometricLogin,
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
                    side: const BorderSide(color: AppColors.borderHairline),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100.0)),
                  ),
                  icon: const Icon(Icons.fingerprint_rounded, color: AppColors.primary),
                  label: Text('Masuk dengan Biometrik', style: AppTypography.formLabel.copyWith(color: AppColors.primary)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
