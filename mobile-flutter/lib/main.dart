import 'package:flutter/material.dart';
import 'core/security/security_service.dart';
import 'core/offline/draft_store.dart';
import 'features/auth/presentation/auth_screen.dart';
import 'features/services/data/service_repository.dart';

void main() => runApp(const SiptuUltraApp());

class SiptuUltraApp extends StatelessWidget {
  const SiptuUltraApp({super.key});
  static const navy = Color(0xFF0B1F3A);
  static const blue = Color(0xFF2563EB);
  static const canvas = Color(0xFFF6F8FC);

  @override
  Widget build(BuildContext context) {
    final scheme = ColorScheme.fromSeed(
      seedColor: blue,
      brightness: Brightness.light,
    );
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'SIPTU ULTRA',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: scheme,
        scaffoldBackgroundColor: canvas,
        fontFamily: 'Segoe UI',
        appBarTheme: const AppBarTheme(
          backgroundColor: canvas,
          surfaceTintColor: Colors.transparent,
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: BorderSide.none,
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: Color(0xFFE5EAF2)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: blue, width: 1.5),
          ),
        ),
      ),
      home: const AuthGate(),
    );
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});
  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  bool? _authenticated;
  @override
  void initState() {
    super.initState();
    _checkSession();
  }

  Future<void> _checkSession() async {
    final value = await SecurityService.instance.hasSession();
    if (mounted) setState(() => _authenticated = value);
  }

  void _logout() async {
    await SecurityService.instance.clearSession();
    if (mounted) setState(() => _authenticated = false);
  }

  @override
  Widget build(BuildContext context) {
    if (_authenticated == null)
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (_authenticated!) return HomeShell(onLogout: _logout);
    return AuthScreen(
      onAuthenticated: () => setState(() => _authenticated = true),
    );
  }
}

class HomeShell extends StatefulWidget {
  const HomeShell({super.key, required this.onLogout});
  final VoidCallback onLogout;
  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int index = 0;
  @override
  Widget build(BuildContext context) {
    final pages = [
      const DashboardPage(),
      const ServicesPage(),
      const HistoryPage(),
      const NotificationsPage(),
      ProfilePage(onLogout: widget.onLogout),
    ];
    return Scaffold(
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 260),
        transitionBuilder: (child, animation) =>
            FadeTransition(opacity: animation, child: child),
        child: KeyedSubtree(key: ValueKey(index), child: pages[index]),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (value) => setState(() => index = value),
        height: 72,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.grid_view_outlined),
            selectedIcon: Icon(Icons.grid_view_rounded),
            label: 'Beranda',
          ),
          NavigationDestination(
            icon: Icon(Icons.apps_outlined),
            selectedIcon: Icon(Icons.apps_rounded),
            label: 'Layanan',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long_rounded),
            label: 'Riwayat',
          ),
          NavigationDestination(
            icon: Badge(
              label: Text('3'),
              child: Icon(Icons.notifications_none_rounded),
            ),
            selectedIcon: Badge(
              label: Text('3'),
              child: Icon(Icons.notifications_rounded),
            ),
            label: 'Notifikasi',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline_rounded),
            selectedIcon: Icon(Icons.person_rounded),
            label: 'Profil',
          ),
        ],
      ),
    );
  }
}

class DashboardPage extends StatelessWidget {
  const DashboardPage({super.key});
  @override
  Widget build(BuildContext context) => SafeArea(
    child: CustomScrollView(
      slivers: [
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 8),
          sliver: SliverToBoxAdapter(child: _Header()),
        ),
        SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          sliver: SliverToBoxAdapter(child: _HeroCard()),
        ),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 10, 20, 8),
          sliver: SliverToBoxAdapter(
            child: _SectionTitle(title: 'Akses cepat', action: 'Lihat semua'),
          ),
        ),
        SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          sliver: SliverToBoxAdapter(child: _QuickActions()),
        ),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 8),
          sliver: SliverToBoxAdapter(
            child: _SectionTitle(
              title: 'Pengajuan terbaru',
              action: 'Buka riwayat',
            ),
          ),
        ),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
          sliver: SliverToBoxAdapter(child: _RecentRequests()),
        ),
      ],
    ),
  );
}

class _Header extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Row(
    children: [
      Container(
        width: 42,
        height: 42,
        decoration: BoxDecoration(
          color: SiptuUltraApp.navy,
          borderRadius: BorderRadius.circular(14),
        ),
        child: const Icon(Icons.account_balance_rounded, color: Colors.white),
      ),
      const SizedBox(width: 12),
      const Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Selamat pagi,',
              style: TextStyle(color: Color(0xFF718096), fontSize: 13),
            ),
            Text(
              'Andi Pratama',
              style: TextStyle(
                fontSize: 19,
                fontWeight: FontWeight.w700,
                color: SiptuUltraApp.navy,
              ),
            ),
          ],
        ),
      ),
      IconButton(onPressed: () {}, icon: const Icon(Icons.search_rounded)),
      IconButton(onPressed: () {}, icon: const Icon(Icons.more_horiz_rounded)),
    ],
  );
}

class _HeroCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(
      gradient: const LinearGradient(
        colors: [SiptuUltraApp.navy, Color(0xFF173B69)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      borderRadius: BorderRadius.circular(24),
      boxShadow: const [
        BoxShadow(
          color: Color(0x240B1F3A),
          blurRadius: 22,
          offset: Offset(0, 10),
        ),
      ],
    ),
    child: Row(
      children: [
        const Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Semua urusan kerja,',
                style: TextStyle(color: Color(0xB8FFFFFF), fontSize: 14),
              ),
              SizedBox(height: 5),
              Text(
                'lebih sederhana.',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                ),
              ),
              SizedBox(height: 14),
              Text(
                'Kelola pengajuan dan pantau progresnya dalam satu tempat.',
                style: TextStyle(
                  color: Color(0xD9FFFFFF),
                  height: 1.35,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        Image.asset(
          'assets/illustrations/onboarding-workflow.png',
          width: 104,
          height: 104,
        ),
      ],
    ),
  );
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title, required this.action});
  final String title;
  final String action;
  @override
  Widget build(BuildContext context) => Row(
    children: [
      Text(
        title,
        style: const TextStyle(
          fontSize: 17,
          fontWeight: FontWeight.w700,
          color: SiptuUltraApp.navy,
        ),
      ),
      const Spacer(),
      Text(
        action,
        style: const TextStyle(
          fontSize: 12,
          color: SiptuUltraApp.blue,
          fontWeight: FontWeight.w600,
        ),
      ),
    ],
  );
}

class _QuickActions extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Row(
    children: const [
      Expanded(
        child: _Action(
          icon: Icons.support_agent_rounded,
          title: 'IT Helpdesk',
          color: Color(0xFFE8F0FF),
        ),
      ),
      SizedBox(width: 10),
      Expanded(
        child: _Action(
          icon: Icons.exit_to_app_rounded,
          title: 'Izin Keluar',
          color: Color(0xFFE8F7F2),
        ),
      ),
      SizedBox(width: 10),
      Expanded(
        child: _Action(
          icon: Icons.inventory_2_rounded,
          title: 'Peminjaman',
          color: Color(0xFFFFF3DD),
        ),
      ),
    ],
  );
}

class _Action extends StatelessWidget {
  const _Action({required this.icon, required this.title, required this.color});
  final IconData icon;
  final String title;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(vertical: 15, horizontal: 8),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      border: Border.all(color: const Color(0xFFE8ECF3)),
    ),
    child: Column(
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(13),
          ),
          child: Icon(icon, color: SiptuUltraApp.navy, size: 22),
        ),
        const SizedBox(height: 9),
        Text(
          title,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 11,
            color: SiptuUltraApp.navy,
          ),
        ),
      ],
    ),
  );
}

class _RecentRequests extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Column(
    children: const [
      _RequestTile(
        icon: Icons.computer_rounded,
        title: 'Perbaikan perangkat kerja',
        meta: 'IT Helpdesk • 24 Agu 2026',
        status: 'Diproses',
        color: Color(0xFFFFF3DD),
      ),
      SizedBox(height: 10),
      _RequestTile(
        icon: Icons.description_rounded,
        title: 'Peminjaman arsip kepegawaian',
        meta: 'Layanan Arsip • 21 Agu 2026',
        status: 'Disetujui',
        color: Color(0xFFE8F7F2),
      ),
    ],
  );
}

class _RequestTile extends StatelessWidget {
  const _RequestTile({
    required this.icon,
    required this.title,
    required this.meta,
    required this.status,
    required this.color,
  });
  final IconData icon;
  final String title;
  final String meta;
  final String status;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      border: Border.all(color: const Color(0xFFE8ECF3)),
    ),
    child: Row(
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: SiptuUltraApp.navy, size: 21),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  color: SiptuUltraApp.navy,
                ),
              ),
              const SizedBox(height: 5),
              Text(
                meta,
                style: const TextStyle(fontSize: 11, color: Color(0xFF718096)),
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            status,
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: SiptuUltraApp.navy,
            ),
          ),
        ),
      ],
    ),
  );
}

class ServicesPage extends StatelessWidget {
  const ServicesPage({super.key});
  @override
  Widget build(BuildContext context) => SafeArea(
    child: ListView(
      padding: const EdgeInsets.fromLTRB(20, 22, 20, 28),
      children: [
        const Text(
          'Layanan',
          style: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.w800,
            color: SiptuUltraApp.navy,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Selesaikan kebutuhan administrasi dari satu tempat.',
          style: TextStyle(color: Color(0xFF718096)),
        ),
        const SizedBox(height: 22),
        _ServiceCard(
          icon: Icons.support_agent_rounded,
          title: 'IT Helpdesk',
          description: 'Laporkan kendala perangkat dan aplikasi.',
          color: const Color(0xFFE8F0FF),
          onTap: () => _showHelpdeskForm(context),
        ),
        _ServiceCard(
          icon: Icons.exit_to_app_rounded,
          title: 'Izin Keluar',
          description: 'Ajukan izin keluar kantor dengan cepat.',
          color: const Color(0xFFE8F7F2),
          onTap: () => _showRequestForm(context, 'Izin Keluar'),
        ),
        _ServiceCard(
          icon: Icons.inventory_2_rounded,
          title: 'Peminjaman Arsip',
          description: 'Ajukan peminjaman dokumen dan arsip.',
          color: const Color(0xFFFFF3DD),
          onTap: () => _showRequestForm(context, 'Peminjaman Arsip'),
        ),
        _ServiceCard(
          icon: Icons.account_balance_wallet_rounded,
          title: 'SIMKEU',
          description: 'Pantau transaksi dan status keuangan.',
          color: const Color(0xFFF0EAFE),
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const SimkeuPage()),
          ),
        ),
      ],
    ),
  );

  static void _showRequestForm(BuildContext context, String service) =>
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        showDragHandle: true,
        builder: (_) => _RequestForm(service: service),
      );

  static void _showHelpdeskForm(BuildContext context) => showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    backgroundColor: const Color(0xFFF8FAFF),
    builder: (_) => const _HelpdeskForm(),
  );
}

class _HelpdeskForm extends StatefulWidget {
  const _HelpdeskForm();
  @override
  State<_HelpdeskForm> createState() => _HelpdeskFormState();
}

class _HelpdeskFormState extends State<_HelpdeskForm> {
  final detail = TextEditingController();
  final password = TextEditingController();
  final totp = TextEditingController();
  String? type;
  bool obscure = true;
  bool submitting = false;
  final options = const <Map<String, dynamic>>[
    {
      'label': 'Printer',
      'value': 'Pengecekan dan Perbaikan Printer',
      'icon': Icons.print_rounded,
    },
    {
      'label': 'Komputer',
      'value': 'Pengecekan dan Perbaikan Komputer',
      'icon': Icons.desktop_windows_rounded,
    },
    {
      'label': 'Laptop',
      'value': 'Pengecekan dan perbaikan Laptop',
      'icon': Icons.laptop_mac_rounded,
    },
    {
      'label': 'Jaringan',
      'value': 'Kendala Jaringan',
      'icon': Icons.wifi_rounded,
    },
    {
      'label': 'Aplikasi',
      'value': 'Instalasi Aplikasi',
      'icon': Icons.apps_rounded,
    },
    {
      'label': 'Bantuan IT',
      'value': 'Permohonan Bantuan IT',
      'icon': Icons.build_rounded,
    },
  ];
  @override
  void dispose() {
    detail.dispose();
    password.dispose();
    totp.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (type == null ||
        detail.text.trim().isEmpty ||
        password.text.isEmpty ||
        totp.text.trim().isEmpty) {
      setState(() {});
      return;
    }
    setState(() => submitting = true);
    try {
      await ServiceRepository().createHelpdesk(
        reportType: type!,
        problemDetails: detail.text.trim(),
        password: password.text,
        totpCode: totp.text.trim(),
      );
      if (!mounted) return;
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Laporan IT berhasil dikirim.')),
      );
    } catch (error) {
      if (mounted) {
        setState(() => submitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Laporan gagal dikirim: $error')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.only(
      left: 20,
      right: 20,
      bottom: MediaQuery.viewInsetsOf(context).bottom + 20,
    ),
    child: SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFE8EC),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.support_agent_rounded,
                  color: Color(0xFFBE123C),
                ),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Laporan IT Helpdesk',
                      style: TextStyle(
                        fontSize: 21,
                        fontWeight: FontWeight.w800,
                        color: SiptuUltraApp.navy,
                      ),
                    ),
                    SizedBox(height: 3),
                    Text(
                      'Laporkan kendala perangkat, jaringan, atau aplikasi.',
                      style: TextStyle(fontSize: 12, color: Color(0xFF718096)),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 22),
          const Text(
            'PILIH JENIS KENDALA',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: .5,
              color: Color(0xFF4A5568),
            ),
          ),
          const SizedBox(height: 10),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              crossAxisSpacing: 8,
              mainAxisSpacing: 8,
              childAspectRatio: 1.18,
            ),
            itemCount: options.length,
            itemBuilder: (_, i) {
              final item = options[i];
              final selected = type == item['value'];
              return InkWell(
                onTap: () => setState(() => type = item['value'] as String),
                borderRadius: BorderRadius.circular(14),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: selected ? const Color(0xFFE8F0FF) : Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: selected
                          ? SiptuUltraApp.blue
                          : const Color(0xFFE5EAF2),
                      width: selected ? 1.5 : 1,
                    ),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        item['icon'] as IconData,
                        size: 22,
                        color: selected
                            ? SiptuUltraApp.blue
                            : SiptuUltraApp.navy,
                      ),
                      const SizedBox(height: 5),
                      Text(
                        item['label'] as String,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: selected
                              ? FontWeight.w700
                              : FontWeight.w500,
                          color: SiptuUltraApp.navy,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
          if (type == null)
            const Padding(
              padding: EdgeInsets.only(top: 8),
              child: Text(
                'Pilih satu jenis kendala untuk melanjutkan.',
                style: TextStyle(fontSize: 11, color: Color(0xFFB42318)),
              ),
            ),
          const SizedBox(height: 18),
          const Text(
            'DETAIL DESKRIPSI LAPORAN',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: .5,
              color: Color(0xFF4A5568),
            ),
          ),
          const SizedBox(height: 7),
          TextField(
            controller: detail,
            maxLines: 4,
            decoration: const InputDecoration(
              hintText:
                  'Ceritakan masalah secara detail, misalnya printer paper jam...',
            ),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text(
                  'Pemilihan lampiran akan tersedia setelah file picker diaktifkan.',
                ),
              ),
            ),
            icon: const Icon(Icons.attach_file_rounded),
            label: const Text('Lampirkan bukti (opsional)'),
          ),
          const SizedBox(height: 14),
          const Text(
            'VALIDASI TANDA TANGAN ELEKTRONIK',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: .5,
              color: Color(0xFF4A5568),
            ),
          ),
          const SizedBox(height: 7),
          TextField(
            controller: password,
            obscureText: obscure,
            decoration: InputDecoration(
              hintText: 'Password SIPTU',
              prefixIcon: const Icon(Icons.lock_outline_rounded),
              suffixIcon: IconButton(
                onPressed: () => setState(() => obscure = !obscure),
                icon: Icon(
                  obscure
                      ? Icons.visibility_outlined
                      : Icons.visibility_off_outlined,
                ),
              ),
            ),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: totp,
            keyboardType: TextInputType.number,
            maxLength: 6,
            decoration: const InputDecoration(
              hintText: 'Kode MFA / recovery code',
              prefixIcon: Icon(Icons.shield_outlined),
              counterText: '',
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            height: 52,
            child: FilledButton(
              onPressed: submitting ? null : submit,
              child: submitting
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Text('Kirim laporan'),
            ),
          ),
        ],
      ),
    ),
  );
}

class HistoryPage extends StatelessWidget {
  const HistoryPage({super.key});
  @override
  Widget build(BuildContext context) => SafeArea(
    child: ListView(
      padding: const EdgeInsets.fromLTRB(20, 22, 20, 28),
      children: [
        const Text(
          'Riwayat pengajuan',
          style: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.w800,
            color: SiptuUltraApp.navy,
          ),
        ),
        const SizedBox(height: 18),
        const TextField(
          decoration: InputDecoration(
            prefixIcon: Icon(Icons.search_rounded),
            hintText: 'Cari pengajuan...',
          ),
        ),
        const SizedBox(height: 16),
        _RequestTile(
          icon: Icons.computer_rounded,
          title: 'Perbaikan perangkat kerja',
          meta: 'IT Helpdesk • 24 Agu 2026',
          status: 'Diproses',
          color: const Color(0xFFFFF3DD),
        ),
        const SizedBox(height: 10),
        _RequestTile(
          icon: Icons.description_rounded,
          title: 'Peminjaman arsip kepegawaian',
          meta: 'Layanan Arsip • 21 Agu 2026',
          status: 'Disetujui',
          color: const Color(0xFFE8F7F2),
        ),
        const SizedBox(height: 10),
        _RequestTile(
          icon: Icons.exit_to_app_rounded,
          title: 'Izin keluar kantor',
          meta: 'Izin Keluar • 18 Agu 2026',
          status: 'Selesai',
          color: const Color(0xFFE8F0FF),
        ),
      ],
    ),
  );
}

class NotificationsPage extends StatelessWidget {
  const NotificationsPage({super.key});
  @override
  Widget build(BuildContext context) => SafeArea(
    child: ListView(
      padding: const EdgeInsets.fromLTRB(20, 22, 20, 28),
      children: [
        Row(
          children: [
            const Expanded(
              child: Text(
                'Notifikasi',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                  color: SiptuUltraApp.navy,
                ),
              ),
            ),
            TextButton(onPressed: () {}, child: const Text('Tandai dibaca')),
          ],
        ),
        const SizedBox(height: 16),
        _NotificationTile(
          icon: Icons.check_circle_rounded,
          title: 'Pengajuan disetujui',
          body: 'Peminjaman arsip kepegawaian telah disetujui.',
          time: '2 jam lalu',
          color: const Color(0xFFE8F7F2),
        ),
        _NotificationTile(
          icon: Icons.update_rounded,
          title: 'Status berubah',
          body: 'Perbaikan perangkat kerja sedang diproses.',
          time: 'Kemarin',
          color: const Color(0xFFFFF3DD),
        ),
        _NotificationTile(
          icon: Icons.info_rounded,
          title: 'Pemeliharaan sistem',
          body: 'SIPTU akan dipelihara malam ini pukul 22.00.',
          time: '2 hari lalu',
          color: const Color(0xFFE8F0FF),
        ),
      ],
    ),
  );
}

class _ServiceCard extends StatelessWidget {
  const _ServiceCard({
    required this.icon,
    required this.title,
    required this.description,
    required this.color,
    required this.onTap,
  });
  final IconData icon;
  final String title;
  final String description;
  final Color color;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Card(
    margin: const EdgeInsets.only(bottom: 12),
    elevation: 0,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(18),
      side: const BorderSide(color: Color(0xFFE8ECF3)),
    ),
    child: InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(icon, color: SiptuUltraApp.navy),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      color: SiptuUltraApp.navy,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    description,
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF718096),
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: Color(0xFF94A3B8)),
          ],
        ),
      ),
    ),
  );
}

class _RequestForm extends StatefulWidget {
  const _RequestForm({required this.service});
  final String service;
  @override
  State<_RequestForm> createState() => _RequestFormState();
}

class _RequestFormState extends State<_RequestForm> {
  final controller = TextEditingController();
  bool saving = false;
  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  Future<void> _saveRequest() async {
    if (controller.text.trim().isEmpty) return;
    setState(() => saving = true);
    try {
      if (widget.service == 'IT Helpdesk') {
        await ServiceRepository().createHelpdesk(
          reportType: 'other',
          problemDetails: controller.text.trim(),
        );
      } else if (widget.service == 'Peminjaman Arsip') {
        await ServiceRepository().createArchiveLoan(
          archiveNumber: controller.text.trim(),
          purpose: 'Pengajuan melalui aplikasi mobile',
        );
      } else {
        await DraftStore.instance.save(
          'exit-permit-${DateTime.now().millisecondsSinceEpoch}',
          {'service': widget.service, 'description': controller.text.trim()},
        );
      }
      if (!mounted) return;
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            widget.service == 'Izin Keluar'
                ? 'Draft izin tersimpan. GPS diperlukan untuk mengirim.'
                : 'Pengajuan ${widget.service} berhasil dikirim.',
          ),
        ),
      );
    } catch (error) {
      if (mounted) {
        setState(() => saving = false);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Pengajuan gagal: $error')));
      }
    }
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.only(
      left: 20,
      right: 20,
      bottom: MediaQuery.viewInsetsOf(context).bottom + 20,
    ),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Ajukan ${widget.service}',
          style: const TextStyle(
            fontSize: 21,
            fontWeight: FontWeight.w800,
            color: SiptuUltraApp.navy,
          ),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: controller,
          maxLines: 4,
          decoration: const InputDecoration(
            hintText: 'Jelaskan kebutuhanmu...',
            alignLabelWithHint: true,
          ),
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: () {},
          icon: const Icon(Icons.attach_file_rounded),
          label: const Text('Lampirkan dokumen (opsional)'),
        ),
        const SizedBox(height: 14),
        SizedBox(
          width: double.infinity,
          height: 50,
          child: FilledButton(
            onPressed: saving ? null : _saveRequest,
            child: saving
                ? const CircularProgressIndicator(color: Colors.white)
                : const Text('Kirim pengajuan'),
          ),
        ),
      ],
    ),
  );
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({
    required this.icon,
    required this.title,
    required this.body,
    required this.time,
    required this.color,
  });
  final IconData icon;
  final String title;
  final String body;
  final String time;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 10),
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: const Color(0xFFE8ECF3)),
    ),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(9),
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: SiptuUltraApp.navy, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  color: SiptuUltraApp.navy,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                body,
                style: const TextStyle(fontSize: 12, color: Color(0xFF718096)),
              ),
              const SizedBox(height: 6),
              Text(
                time,
                style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8)),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

class SimkeuPage extends StatelessWidget {
  const SimkeuPage({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: SiptuUltraApp.canvas,
    appBar: AppBar(
      title: const Text(
        'SIMKEU',
        style: TextStyle(fontWeight: FontWeight.w700),
      ),
      actions: [
        IconButton(
          onPressed: () {},
          icon: const Icon(Icons.filter_list_rounded),
        ),
      ],
    ),
    body: ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: SiptuUltraApp.navy,
            borderRadius: BorderRadius.circular(22),
          ),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Saldo berjalan',
                style: TextStyle(color: Color(0xB8FFFFFF)),
              ),
              SizedBox(height: 8),
              Text(
                'Rp 128.450.000',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                ),
              ),
              SizedBox(height: 16),
              Text(
                'Diperbarui hari ini • 09.42 WIB',
                style: TextStyle(color: Color(0xD9FFFFFF), fontSize: 12),
              ),
            ],
          ),
        ),
        const SizedBox(height: 22),
        const Row(
          children: [
            Expanded(
              child: _Metric(
                title: 'Pemasukan',
                value: 'Rp 86,2 jt',
                icon: Icons.trending_up_rounded,
                color: Color(0xFFE8F7F2),
              ),
            ),
            SizedBox(width: 10),
            Expanded(
              child: _Metric(
                title: 'Pengeluaran',
                value: 'Rp 42,7 jt',
                icon: Icons.trending_down_rounded,
                color: Color(0xFFFFEAEA),
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),
        const Text(
          'Transaksi terbaru',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w700,
            color: SiptuUltraApp.navy,
          ),
        ),
        const SizedBox(height: 10),
        _Transaction(
          title: 'Belanja operasional kantor',
          meta: '24 Agu 2026 • Disetujui',
          value: '- Rp 4.250.000',
          negative: true,
        ),
        _Transaction(
          title: 'Realisasi perjalanan dinas',
          meta: '22 Agu 2026 • Diproses',
          value: '- Rp 2.800.000',
          negative: true,
        ),
        _Transaction(
          title: 'Pagu kegiatan triwulan III',
          meta: '20 Agu 2026 • Diterima',
          value: '+ Rp 18.500.000',
          negative: false,
        ),
      ],
    ),
  );
}

class _Metric extends StatelessWidget {
  const _Metric({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });
  final String title, value;
  final IconData icon;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: const Color(0xFFE8ECF3)),
    ),
    child: Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 18, color: SiptuUltraApp.navy),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(fontSize: 11, color: Color(0xFF718096)),
                overflow: TextOverflow.ellipsis,
              ),
              Text(
                value,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  color: SiptuUltraApp.navy,
                ),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

class _Transaction extends StatelessWidget {
  const _Transaction({
    required this.title,
    required this.meta,
    required this.value,
    required this.negative,
  });
  final String title, meta, value;
  final bool negative;
  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 9),
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: const Color(0xFFE8ECF3)),
    ),
    child: Row(
      children: [
        const Icon(Icons.receipt_long_rounded, color: SiptuUltraApp.blue),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  color: SiptuUltraApp.navy,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                meta,
                style: const TextStyle(fontSize: 11, color: Color(0xFF718096)),
              ),
            ],
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: negative ? const Color(0xFFB42318) : const Color(0xFF147D56),
          ),
        ),
      ],
    ),
  );
}

class ProfilePage extends StatelessWidget {
  const ProfilePage({super.key, required this.onLogout});
  final VoidCallback onLogout;
  @override
  Widget build(BuildContext context) => SafeArea(
    child: Padding(
      padding: const EdgeInsets.fromLTRB(20, 22, 20, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Profil',
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w800,
              color: SiptuUltraApp.navy,
            ),
          ),
          const SizedBox(height: 24),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFFE8ECF3)),
            ),
            child: const Row(
              children: [
                CircleAvatar(
                  radius: 26,
                  backgroundColor: Color(0xFFE8F0FF),
                  child: Icon(Icons.person_rounded, color: SiptuUltraApp.blue),
                ),
                SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Andi Pratama',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: SiptuUltraApp.navy,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Pegawai SIPTU',
                      style: TextStyle(fontSize: 12, color: Color(0xFF718096)),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const Spacer(),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: OutlinedButton.icon(
              onPressed: onLogout,
              icon: const Icon(Icons.logout_rounded),
              label: const Text('Keluar dari aplikasi'),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFFB42318),
                side: const BorderSide(color: Color(0xFFF0B7B2)),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            ),
          ),
        ],
      ),
    ),
  );
}

class _PlaceholderPage extends StatelessWidget {
  const _PlaceholderPage({
    required this.title,
    required this.icon,
    required this.message,
  });
  final String title;
  final IconData icon;
  final String message;
  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 22, 20, 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w800,
                color: SiptuUltraApp.navy,
              ),
            ),
            const SizedBox(height: 28),
            Expanded(
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(26),
                      ),
                      child: Icon(icon, color: SiptuUltraApp.blue, size: 42),
                    ),
                    const SizedBox(height: 18),
                    Text(
                      message,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Color(0xFF718096),
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
