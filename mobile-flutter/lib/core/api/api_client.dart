import 'package:dio/dio.dart';
import '../security/security_service.dart';

/// ApiClient configures Dio with base URL, headers, and token interceptors.
class ApiClient {
  static const String baseUrl = 'https://siptu.bpompalopo.com/core_api/api';

  late final Dio dio;

  ApiClient() {
    dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await SecurityService.instance.getToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          if (error.response?.statusCode == 401) {
            // Handle unauthenticated session expired
            await SecurityService.instance.clearSession();
          }
          return handler.next(error);
        },
      ),
    );
  }
}
