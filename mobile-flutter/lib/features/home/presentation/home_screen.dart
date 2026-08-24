import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/widgets/curved_wave_header.dart';
import '../../../core/widgets/digital_id_card.dart';
import '../../../core/widgets/floating_bottom_nav_bar.dart';
import '../../../core/widgets/metric_summary_cards.dart';
import '../../archive_loan/presentation/archive_loan_create_sheet.dart';
import '../../exit_permit/presentation/exit_permit_create_sheet.dart';
import '../../history/presentation/history_screen.dart';
import '../../it_helpdesk/presentation/it_helpdesk_create_sheet.dart';

class HomeScreen extends StatefulWidget {
  final String? userName;
  final String? userNip;

  const HomeScreen({
    super.key,
    this.userName = 'Budi Santoso',
    this.userNip = '198501012010011001',
  });

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentNavIndex = 0;
  String _searchTerm = '';
  String _selectedCategory = 'semua';

  final List<Map<String, dynamic>> _services = [
    {
      'id': 'it_helpdesk',
      'title': 'IT Helpdesk',
      'desc': 'Laporkan kendala printer, komputer, jaringan',
      'category': 'it',
      'icon': Icons.build_rounded,
      'color': const Color(0xFFF43F5E),
      'action': (BuildContext ctx) => ItHelpdeskCreateSheet.show(ctx),
    },
    {
      'id': 'exit_permit',
      'title': 'Izin Keluar',
      'desc': 'Ajukan izin keluar kantor RISPEG',
      'category': 'kepegawaian',
      'icon': Icons.directions_walk_rounded,
      'color': const Color(0xFF8B5CF6),
      'action': (BuildContext ctx) => ExitPermitCreateSheet.show(ctx),
    },
    {
      'id': 'archive_loan',
      'title': 'Peminjaman Arsip',
      'desc': 'Ajukan peminjaman berkas fisik/digital',
      'category': 'kepegawaian',
      'icon': Icons.folder_shared_rounded,
      'color': const Color(0xFF3B82F6),
      'action': (BuildContext ctx) => ArchiveLoanCreateSheet.show(ctx),
    },
    {
      'id': 'bmn_loan',
      'title': 'Peminjaman BMN',
      'desc': 'SIMBA: Peminjaman aset & barang BMN',
      'category': 'logistik',
      'icon': Icons.inventory_2_rounded,
      'color': const Color(0xFF2563EB),
      'action': (BuildContext ctx) => ArchiveLoanCreateSheet.show(ctx),
    },
    {
      'id': 'room_loan',
      'title': 'Peminjaman Ruangan',
      'desc': 'Jadwal & peminjaman ruangan rapat/aula',
      'category': 'logistik',
      'icon': Icons.meeting_room_rounded,
      'color': const Color(0xFF6366F1),
      'action': (BuildContext ctx) => ArchiveLoanCreateSheet.show(ctx),
    },
    {
      'id': 'surat_tugas',
      'title': 'Surat Tugas',
      'desc': 'Pengajuan surat tugas & SIAMPARAN',
      'category': 'kepegawaian',
      'icon': Icons.assignment_rounded,
      'color': const Color(0xFF0D9488),
      'action': (BuildContext ctx) => ArchiveLoanCreateSheet.show(ctx),
    },
  ];

  void _showCreateOptions() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20.0)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('BUAT PENGAJUAN BARU', style: AppTypography.sectionHeader),
            const SizedBox(height: 4.0),
            Text('Pilih jenis layanan mandiri yang ingin diajukan', style: AppTypography.caption),
            const SizedBox(height: 16.0),
            ListTile(
              leading: const Icon(Icons.build_rounded, color: AppColors.danger),
              title: const Text('Laporan IT Helpdesk'),
              onTap: () {
                Navigator.pop(ctx);
                ItHelpdeskCreateSheet.show(context);
              },
            ),
            ListTile(
              leading: const Icon(Icons.directions_walk_rounded, color: AppColors.accentViolet),
              title: const Text('Izin Keluar Kantor (RISPEG)'),
              onTap: () {
                Navigator.pop(ctx);
                ExitPermitCreateSheet.show(context);
              },
            ),
            ListTile(
              leading: const Icon(Icons.folder_shared_rounded, color: AppColors.primary),
              title: const Text('Peminjaman Arsip'),
              onTap: () {
                Navigator.pop(ctx);
                ArchiveLoanCreateSheet.show(context);
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_currentNavIndex == 1) {
      return Scaffold(
        body: const HistoryScreen(),
        bottomNavigationBar: FloatingBottomNavBar(
          currentIndex: _currentNavIndex,
          onTap: (idx) => setState(() => _currentNavIndex = idx),
          onFabTap: _showCreateOptions,
        ),
      );
    }

    final filteredServices = _services.where((s) {
      final String title = (s['title'] ?? '').toString().toLowerCase();
      final String desc = (s['desc'] ?? '').toString().toLowerCase();
      final String category = (s['category'] ?? '').toString().toLowerCase();

      final bool matchesCategory = _selectedCategory == 'semua' || category == _selectedCategory;
      final bool matchesSearch = title.contains(_searchTerm.toLowerCase()) || desc.contains(_searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.bgCanvas,
      body: SafeArea(
        top: false,
        child: Stack(
          children: [
            SingleChildScrollView(
              padding: const EdgeInsets.only(bottom: 100.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Top Wave Header
                  CurvedWaveHeader(
                    userName: widget.userName ?? 'Budi Santoso',
                    userNip: widget.userNip ?? '198501012010011001',
                  ),

                  // Digital Employee ID Card Overlay
                  Transform.translate(
                    offset: const Offset(0, -32.0),
                    child: DigitalIdCard(
                      userName: widget.userName ?? 'Budi Santoso',
                      userNip: widget.userNip ?? '198501012010011001',
                    ),
                  ),

                  // Metric Summary & Donut Progress Ring
                  const MetricSummaryCards(),

                  const SizedBox(height: 20.0),

                  // Search Bar
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0),
                    child: TextField(
                      onChanged: (val) => setState(() => _searchTerm = val),
                      decoration: const InputDecoration(
                        hintText: 'Cari layanan mandiri...',
                        prefixIcon: Icon(Icons.search_rounded, size: 20.0),
                      ),
                    ),
                  ),

                  const SizedBox(height: 16.0),

                  // Category Filter Chips
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 16.0),
                    child: Row(
                      children: [
                        _buildCategoryChip('semua', 'Semua Layanan'),
                        _buildCategoryChip('kepegawaian', 'Kepegawaian'),
                        _buildCategoryChip('logistik', 'Logistik & BMN'),
                        _buildCategoryChip('it', 'IT Helpdesk'),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20.0),

                  // Section Title
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('DAFTAR LAYANAN MANDIRI', style: AppTypography.sectionHeader),
                        Text('${filteredServices.length} Layanan', style: AppTypography.caption),
                      ],
                    ),
                  ),

                  const SizedBox(height: 12.0),

                  // Service Grid (Soft Neumorphic Card Tiles)
                  GridView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0),
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 12.0,
                      mainAxisSpacing: 12.0,
                      childAspectRatio: 1.05,
                    ),
                    itemCount: filteredServices.length,
                    itemBuilder: (ctx, index) {
                      final service = filteredServices[index];
                      final Color accentColor = (service['color'] as Color?) ?? AppColors.primary;
                      final String titleText = (service['title'] ?? '').toString();
                      final String descText = (service['desc'] ?? '').toString();
                      final IconData iconData = (service['icon'] as IconData?) ?? Icons.design_services_rounded;

                      return InkWell(
                        onTap: () {
                          final dynamic rawAction = service['action'];
                          if (rawAction is Function(BuildContext)) {
                            rawAction(context);
                          }
                        },
                        borderRadius: BorderRadius.circular(16.0),
                        child: Container(
                          padding: const EdgeInsets.all(16.0),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceCard,
                            borderRadius: BorderRadius.circular(16.0),
                            border: Border.all(color: AppColors.borderHairline),
                            boxShadow: const [
                              BoxShadow(
                                color: Color(0x0A0F172A),
                                blurRadius: 12.0,
                                offset: Offset(0, 4),
                              ),
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(10.0),
                                    decoration: BoxDecoration(
                                      color: accentColor.withValues(alpha: 0.12),
                                      borderRadius: BorderRadius.circular(12.0),
                                    ),
                                    child: Icon(
                                      iconData,
                                      color: accentColor,
                                      size: 22.0,
                                    ),
                                  ),
                                  Icon(
                                    Icons.arrow_forward_ios_rounded,
                                    size: 12.0,
                                    color: AppColors.textMuted.withValues(alpha: 0.5),
                                  ),
                                ],
                              ),
                              const Spacer(),
                              Text(
                                titleText,
                                style: AppTypography.cardTitle,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 2.0),
                              Text(
                                descText,
                                style: AppTypography.caption,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),

            // Floating Bottom Nav Bar
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: FloatingBottomNavBar(
                currentIndex: _currentNavIndex,
                onTap: (idx) => setState(() => _currentNavIndex = idx),
                onFabTap: _showCreateOptions,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryChip(String id, String label) {
    final bool isSelected = _selectedCategory == id;
    return Padding(
      padding: const EdgeInsets.only(right: 8.0),
      child: ChoiceChip(
        label: Text(label),
        selected: isSelected,
        selectedColor: AppColors.primary,
        backgroundColor: AppColors.surfaceCard,
        side: BorderSide(
          color: isSelected ? AppColors.primary : AppColors.borderHairline,
        ),
        labelStyle: AppTypography.caption.copyWith(
          color: isSelected ? Colors.white : AppColors.textBody,
          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
        ),
        onSelected: (_) => setState(() => _selectedCategory = id),
      ),
    );
  }
}
