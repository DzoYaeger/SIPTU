class NotificationService {
  NotificationService._();
  static final NotificationService instance = NotificationService._();
  bool _initialized = false;
  String? _deviceToken;

  Future<void> initialize() async {
    // Push provider wiring (FCM/APNs) is intentionally isolated here.
    _initialized = true;
  }

  Future<void> registerDevice(String token) async {
    if (!_initialized) await initialize();
    _deviceToken = token;
  }

  String? get deviceToken => _deviceToken;
}
