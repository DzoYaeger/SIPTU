import '../../../core/api/api_client.dart';

class ServiceRepository {
  ServiceRepository({ApiClient? apiClient}) : _api = apiClient ?? ApiClient();
  final ApiClient _api;

  Future<Map<String, dynamic>> createHelpdesk({
    required String reportType,
    required String problemDetails,
    String? password,
    String? totpCode,
  }) async {
    final response = await _api.dio.post(
      '/it-helpdesk-tickets',
      data: {
        'report_type': reportType,
        'problem_details': problemDetails,
        if (password != null && password.isNotEmpty) 'password': password,
        if (totpCode != null && totpCode.isNotEmpty) 'totp_code': totpCode,
      },
    );
    return _map(response.data);
  }

  Future<Map<String, dynamic>> createArchiveLoan({
    required String archiveNumber,
    required String purpose,
  }) async {
    final response = await _api.dio.post(
      '/archive-loans',
      data: {
        'borrow_date': DateTime.now().toIso8601String().substring(0, 10),
        'borrower_name': 'Pengguna SIPTU',
        'archive_number': archiveNumber,
        'purpose': purpose,
      },
    );
    return _map(response.data);
  }

  Future<List<Map<String, dynamic>>> getHistory() async {
    final response = await _api.dio.get('/my-service-history');
    return _list(response.data);
  }

  Future<List<Map<String, dynamic>>> getNotifications() async {
    final response = await _api.dio.get('/notifications');
    final data = response.data is Map
        ? (response.data['data'] ?? response.data['notifications'])
        : response.data;
    return _list(data);
  }

  Future<void> markAllNotificationsRead() =>
      _api.dio.put('/notifications/read-all');
  Map<String, dynamic> _map(dynamic value) =>
      value is Map ? Map<String, dynamic>.from(value) : <String, dynamic>{};
  List<Map<String, dynamic>> _list(dynamic value) => value is List
      ? value
            .whereType<Map>()
            .map((item) => Map<String, dynamic>.from(item))
            .toList()
      : <Map<String, dynamic>>[];
}
