import 'package:dio/dio.dart';
import '../api/api_client.dart';

class FileUploadService {
  FileUploadService({ApiClient? apiClient}) : _api = apiClient ?? ApiClient();
  final ApiClient _api;

  Future<Response<dynamic>> upload({
    required String endpoint,
    required String filePath,
    Map<String, dynamic>? fields,
  }) async {
    final form = FormData.fromMap({
      ...?fields,
      'file': await MultipartFile.fromFile(filePath),
    });
    return _api.dio.post(
      endpoint,
      data: form,
      options: Options(contentType: 'multipart/form-data'),
    );
  }
}
