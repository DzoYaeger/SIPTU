import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';

/// StatusPill renders a rounded pastel pill badge for status display.
class StatusPill extends StatelessWidget {
  final String? status;
  final String? label;

  const StatusPill({
    super.key,
    this.status,
    this.label,
  });

  @override
  Widget build(BuildContext context) {
    final String normalized = (status ?? 'pending').toLowerCase().trim();
    Color bg = AppColors.primaryLight;
    Color fg = AppColors.primary;

    if (normalized.contains('disetujui') || normalized.contains('selesai') || normalized == 'approved') {
      bg = AppColors.successBg;
      fg = AppColors.success;
    } else if (normalized.contains('pengajuan') || normalized.contains('dipinjam') || normalized.contains('pending')) {
      bg = AppColors.warningBg;
      fg = AppColors.warning;
    } else if (normalized.contains('ditolak') || normalized.contains('rejected')) {
      bg = AppColors.dangerBg;
      fg = AppColors.danger;
    }

    final String displayText = label ?? (status ?? 'PROSES').toUpperCase();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 4.0),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(100.0),
        border: Border.all(color: fg.withValues(alpha: 0.25), width: 1.0),
      ),
      child: Text(
        displayText,
        style: AppTypography.overline.copyWith(
          color: fg,
          fontSize: 10.0,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
