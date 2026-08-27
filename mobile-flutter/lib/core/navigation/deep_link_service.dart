class DeepLinkTarget {
  const DeepLinkTarget({required this.route, this.id});
  final String route;
  final String? id;
}

class DeepLinkService {
  DeepLinkTarget? parse(Uri uri) {
    if (uri.pathSegments.isEmpty) return null;
    final segments = uri.pathSegments;
    if (segments.first == 'simkeu')
      return DeepLinkTarget(
        route: '/simkeu',
        id: segments.length > 1 ? segments[1] : null,
      );
    if (segments.first == 'pengajuan')
      return DeepLinkTarget(
        route: '/history',
        id: segments.length > 1 ? segments[1] : null,
      );
    if (segments.first == 'layanan')
      return DeepLinkTarget(
        route: '/services',
        id: segments.length > 1 ? segments[1] : null,
      );
    return null;
  }
}
