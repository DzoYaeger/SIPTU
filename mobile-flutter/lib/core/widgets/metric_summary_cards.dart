import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';

/// MetricSummaryCards renders metric tiles & donut progress ring inspired by template benchmarks.
class MetricSummaryCards extends StatelessWidget {
  const MetricSummaryCards({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0),
      child: Row(
        children: [
          // Donut Progress Card (Left)
          Expanded(
            flex: 5,
            child: Container(
              padding: const EdgeInsets.all(14.0),
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
              child: Row(
                children: [
                  SizedBox(
                    width: 44.0,
                    height: 44.0,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        const CircularProgressIndicator(
                          value: 0.85,
                          strokeWidth: 4.5,
                          backgroundColor: AppColors.primaryLight,
                          color: AppColors.primary,
                        ),
                        Text(
                          '85%',
                          style: AppTypography.cardTitle.copyWith(
                            fontSize: 11.0,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10.0),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'STATUS SELESAI',
                          style: AppTypography.overline.copyWith(fontSize: 9.0),
                        ),
                        const SizedBox(height: 2.0),
                        Text(
                          '12 Layanan',
                          style: AppTypography.cardTitle.copyWith(fontSize: 13.0),
                        ),
                        Text(
                          'Bulan Agustus',
                          style: AppTypography.caption.copyWith(fontSize: 10.0),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 12.0),

          // Active Counter Tile (Right)
          Expanded(
            flex: 4,
            child: Container(
              padding: const EdgeInsets.all(14.0),
              decoration: BoxDecoration(
                color: AppColors.warningBg,
                borderRadius: BorderRadius.circular(16.0),
                border: Border.all(color: AppColors.warning.withValues(alpha: 0.25)),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x0A0F172A),
                    blurRadius: 10.0,
                    offset: Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8.0),
                    decoration: BoxDecoration(
                      color: AppColors.warning.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10.0),
                    ),
                    child: const Icon(
                      Icons.hourglass_top_rounded,
                      color: AppColors.warning,
                      size: 20.0,
                    ),
                  ),
                  const SizedBox(width: 10.0),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'PROSES',
                        style: AppTypography.overline.copyWith(
                          color: AppColors.warning,
                          fontSize: 9.0,
                        ),
                      ),
                      Text(
                        '3 Berkas',
                        style: AppTypography.cardTitle.copyWith(
                          color: AppColors.warning,
                          fontSize: 13.0,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
