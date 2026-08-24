import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';

/// FieldsetCard encapsulates form inputs into grouped section cards.
class FieldsetCard extends StatelessWidget {
  final String title;
  final IconData? icon;
  final List<Widget> children;

  const FieldsetCard({
    super.key,
    required this.title,
    this.icon,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16.0),
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: AppColors.bgCanvas,
        borderRadius: BorderRadius.circular(12.0),
        border: Border.all(color: AppColors.borderHairline, width: 1.0),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (icon != null) ...[
                Container(
                  padding: const EdgeInsets.all(6.0),
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    borderRadius: BorderRadius.circular(8.0),
                  ),
                  child: Icon(icon, size: 14.0, color: AppColors.primary),
                ),
                const SizedBox(width: 8.0),
              ],
              Text(
                title.toUpperCase(),
                style: AppTypography.overline.copyWith(
                  color: AppColors.textPrimary,
                  letterSpacing: 0.6,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12.0),
          ...children,
        ],
      ),
    );
  }
}
