import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';

/// SecurityService manages biometric authentication, secure storage, and sensitive data masking.
class SecurityService {
  SecurityService._();
  static final SecurityService instance = SecurityService._();

  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  final LocalAuthentication _auth = LocalAuthentication();

  static const String _keyToken = 'siptu_jwt_token';
  static const String _keyUser = 'siptu_user_data';

  // ── Secure Storage Operations ──

  Future<void> saveToken(String token) async {
    await _storage.write(key: _keyToken, value: token);
  }

  Future<String?> getToken() async {
    return await _storage.read(key: _keyToken);
  }

  Future<void> clearSession() async {
    await _storage.delete(key: _keyToken);
    await _storage.delete(key: _keyUser);
  }

  // ── Biometric Authentication ──

  Future<bool> isBiometricAvailable() async {
    try {
      final bool canAuthenticateWithBiometrics = await _auth.canCheckBiometrics;
      final bool canAuthenticate = canAuthenticateWithBiometrics || await _auth.isDeviceSupported();
      return canAuthenticate;
    } catch (_) {
      return false;
    }
  }

  Future<bool> authenticateWithBiometrics({required String reason}) async {
    try {
      final bool available = await isBiometricAvailable();
      if (!available) return false;

      return await _auth.authenticate(
        localizedReason: reason,
      );
    } catch (_) {
      return false;
    }
  }

  // ── Sensitive Data Masking ──

  static String maskNip(String? nip) {
    if (nip == null || nip.length < 8) return nip ?? '-';
    final String start = nip.substring(0, 4);
    final String end = nip.substring(nip.length - 4);
    return '$start****$end';
  }

  static String maskPhone(String? phone) {
    if (phone == null || phone.length < 8) return phone ?? '-';
    final String start = phone.substring(0, 4);
    final String end = phone.substring(phone.length - 3);
    return '$start****$end';
  }
}
