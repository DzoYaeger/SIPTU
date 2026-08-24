import 'package:flutter/material.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/presentation/login_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const SiptuMobileApp());
}

class SiptuMobileApp extends StatelessWidget {
  const SiptuMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SIPTU Mobile',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: const LoginScreen(),
    );
  }
}
