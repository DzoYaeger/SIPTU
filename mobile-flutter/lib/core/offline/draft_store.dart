class DraftStore {
  DraftStore._();
  static final DraftStore instance = DraftStore._();
  final Map<String, Map<String, dynamic>> _drafts = {};

  Future<void> save(String key, Map<String, dynamic> payload) async =>
      _drafts[key] = Map<String, dynamic>.from(payload);
  Future<Map<String, dynamic>?> read(String key) async =>
      _drafts[key] == null ? null : Map<String, dynamic>.from(_drafts[key]!);
  Future<List<Map<String, dynamic>>> all() async => _drafts.entries
      .map((entry) => {'key': entry.key, ...entry.value})
      .toList();
  Future<void> remove(String key) async => _drafts.remove(key);
}
