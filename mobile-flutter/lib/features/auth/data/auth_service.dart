import 'package:dio/dio.dart';
import '../../../core/api/api_client.dart';
import '../../../core/security/security_service.dart';

class AuthResult {
  const AuthResult({this.user, this.mfaToken});
  final Map<String, dynamic>? user;
  final String? mfaToken;
  bool get requiresMfa => mfaToken != null && mfaToken!.isNotEmpty;
}

class AuthService {
  AuthService({ApiClient? apiClient, SecurityService? security})
    : _api = apiClient ?? ApiClient(),
      _security = security ?? SecurityService.instance;

  final ApiClient _api;
  final SecurityService _security;

  Future<AuthResult> login({
    required String nip,
    required String password,
  }) async {
    try {
      final response = await _api.dio.post(
        '/login',
        data: {'nip': nip, 'password': password},
      );
      final data = Map<String, dynamic>.from(response.data as Map);
      if (data['requires_mfa'] == true)
        return AuthResult(mfaToken: data['mfa_token']?.toString());
      await _saveSession(data);
      return AuthResult(user: _map(data['user']));
    } on DioException catch (error) {
      throw AuthException(
        _message(error, fallback: 'NIP atau password tidak valid.'),
      );
    }
  }

  Future<Map<String, dynamic>> verifyMfa({
    required String mfaToken,
    required String code,
  }) async {
    try {
      final response = await _api.dio.post(
        '/mfa/verify',
        data: {'mfa_token': mfaToken, 'totp_code': code},
      );
      final data = Map<String, dynamic>.from(response.data as Map);
      await _saveSession(data);
      return _map(data['user']) ?? <String, dynamic>{};
    } on DioException catch (error) {
      throw AuthException(
        _message(
          error,
          fallback: 'Kode OTP tidak valid atau sudah kedaluwarsa.',
        ),
      );
    }
  }

  Future<void> logout() async {
    try {
      await _api.dio.post('/logout');
    } on DioException {
      // Session tetap dihapus lokal meskipun jaringan sedang tidak tersedia.
    } finally {
      await _security.clearSession();
    }
  }

  Future<void> _saveSession(Map<String, dynamic> data) async {
    final token = data['token']?.toString();
    if (token == null || token.isEmpty)
      throw const AuthException('Token login tidak diterima server.');
    await _security.saveToken(token);
    await _security.saveUser(_map(data['user']) ?? <String, dynamic>{});
  }

  Map<String, dynamic>? _map(dynamic value) =>
      value is Map ? Map<String, dynamic>.from(value) : null;

  String _message(DioException error, {required String fallback}) {
    final data = error.response?.data;
    if (data is Map && data['message'] is String)
      return data['message'] as String;
    return fallback;
  }
}

class AuthException implements Exception {
  const AuthException(this.message);
  final String message;
  @override
  String toString() => message;
}
