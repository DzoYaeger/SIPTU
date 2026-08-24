import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/widgets/status_pill.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  final List<Map<String, dynamic>> _sampleActivities = [
    {
      'title': 'Peminjaman Laptop BMN',
      'service': 'BMN SIMBA',
      'date': '12 Ags 2026',
      'status': 'disetujui',
      'step': 3, // Selesai
      'icon': Icons.inventory_2_rounded,
    },
    {
      'title': 'Laporan Printer Rusak Ruang TU',
      'service': 'IT Helpdesk',
      'date': '11 Ags 2026',
      'status': 'pengajuan',
      'step': 1, // Diajukan
      'icon': Icons.build_rounded,
    },
    {
      'title': 'Izin Keluar Bank Mandiri',
      'service': 'RISPEG',
      'date': '10 Ags 2026',
      'status': 'disetujui',
      'step': 3,
      'icon': Icons.directions_walk_rounded,
    },
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgCanvas,
      appBar: AppBar(
        title: const Text('Riwayat Layanan'),
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textMuted,
          indicatorColor: AppColors.primary,
          indicatorWeight: 3.0,
          labelStyle: AppTypography.formLabel.copyWith(fontSize: 12.0),
          tabs: const [
            Tab(text: 'Semua'),
            Tab(text: 'Diproses'),
            Tab(text: 'Disetujui'),
            Tab(text: 'Ditolak'),
          ],
        ),
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16.0),
        itemCount: _sampleActivities.length,
        itemBuilder: (ctx, index) {
          final item = _sampleActivities[index];
          final String titleText = (item['title'] ?? '').toString();
          final String serviceText = (item['service'] ?? '').toString();
          final String dateText = (item['date'] ?? '').toString();
          final String statusText = (item['status'] ?? '').toString();
          final int currentStep = (item['step'] as int?) ?? 0;
          final IconData iconData = (item['icon'] as IconData?) ?? Icons.history_rounded;

          return Container(
            margin: const EdgeInsets.only(bottom: 12.0),
            padding: const EdgeInsets.all(16.0),
            decoration: BoxDecoration(
              color: AppColors.surfaceCard,
              borderRadius: BorderRadius.circular(16.0),
              border: Border.all(color: AppColors.borderHairline),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x0A0F172A),
                  blurRadius: 10.0,
                  offset: Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8.0),
                      decoration: BoxDecoration(
                        color: AppColors.primaryLight,
                        borderRadius: BorderRadius.circular(10.0),
                      ),
                      child: Icon(iconData, size: 20.0, color: AppColors.primary),
                    ),
                    const SizedBox(width: 12.0),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(titleText, style: AppTypography.cardTitle),
                          const SizedBox(height: 2.0),
                          Text('$serviceText • $dateText', style: AppTypography.caption),
                        ],
                      ),
                    ),
                    StatusPill(status: statusText),
                  ],
                ),
                const Divider(color: AppColors.borderHairline, height: 24.0),

                // Horizontal Status Stepper
                Row(
                  children: [
                    _buildStepCircle(0, 'Draft', currentStep),
                    _buildStepLine(0, currentStep),
                    _buildStepCircle(1, 'Diajukan', currentStep),
                    _buildStepLine(1, currentStep),
                    _buildStepCircle(2, 'Disetujui', currentStep),
                    _buildStepLine(2, currentStep),
                    _buildStepCircle(3, 'Selesai', currentStep),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildStepCircle(int stepIndex, String label, int currentStep) {
    final bool isCompleted = stepIndex <= currentStep;

    return Column(
      children: [
        Container(
          width: 24.0,
          height: 24.0,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: isCompleted ? AppColors.primary : AppColors.surfaceCard,
            border: Border.all(
              color: isCompleted ? AppColors.primary : AppColors.borderHairline,
              width: 2.0,
            ),
          ),
          child: isCompleted
              ? const Icon(Icons.check_rounded, size: 14.0, color: Colors.white)
              : null,
        ),
        const SizedBox(height: 4.0),
        Text(
          label,
          style: AppTypography.caption.copyWith(
            fontSize: 10.0,
            fontWeight: isCompleted ? FontWeight.w700 : FontWeight.w500,
            color: isCompleted ? AppColors.textBody : AppColors.textMuted,
          ),
        ),
      ],
    );
  }

  Widget _buildStepLine(int stepIndex, int currentStep) {
    final bool isCompleted = stepIndex < currentStep;
    return Expanded(
      child: Container(
        height: 2.0,
        margin: const EdgeInsets.symmetric(horizontal: 4.0),
        color: isCompleted ? AppColors.primary : AppColors.borderHairline,
      ),
    );
  }
}
