import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';

/// CustomBottomSheet provides the standard bottom sheet container modal architecture.
class CustomBottomSheet extends StatelessWidget {
  final String title;
  final String? subtitle;
  final IconData? icon;
  final Widget child;
  final String primaryActionText;
  final VoidCallback? onPrimaryAction;
  final String cancelActionText;
  final VoidCallback? onCancelAction;
  final bool isLoading;

  const CustomBottomSheet({
    super.key,
    required this.title,
    this.subtitle,
    this.icon,
    required this.child,
    this.primaryActionText = 'Simpan',
    this.onPrimaryAction,
    this.cancelActionText = 'Batal',
    this.onCancelAction,
    this.isLoading = false,
  });

  static Future<T?> show<T>({
    required BuildContext context,
    required String title,
    String? subtitle,
    IconData? icon,
    required Widget child,
    String primaryActionText = 'Simpan',
    VoidCallback? onPrimaryAction,
    String cancelActionText = 'Batal',
    VoidCallback? onCancelAction,
  }) {
    return showModalBottomSheet<T>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom,
        ),
        child: CustomBottomSheet(
          title: title,
          subtitle: subtitle,
          icon: icon,
          primaryActionText: primaryActionText,
          onPrimaryAction: onPrimaryAction,
          cancelActionText: cancelActionText,
          onCancelAction: onCancelAction ?? () => Navigator.pop(ctx),
          child: child,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.85,
      ),
      decoration: const BoxDecoration(
        color: AppColors.surfaceCard,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20.0)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag Handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 10.0, bottom: 12.0),
              width: 36.0,
              height: 4.0,
              decoration: BoxDecoration(
                color: const Color(0xFFCBD5E1),
                borderRadius: BorderRadius.circular(100.0),
              ),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20.0),
            child: Row(
              children: [
                if (icon != null) ...[
                  Container(
                    width: 40.0,
                    height: 40.0,
                    decoration: BoxDecoration(
                      color: AppColors.primaryLight,
                      borderRadius: BorderRadius.circular(10.0),
                    ),
                    child: Icon(icon, color: AppColors.primary, size: 20.0),
                  ),
                  const SizedBox(width: 12.0),
                ],
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: AppTypography.cardTitle.copyWith(fontSize: 15.0)),
                      if (subtitle != null) ...[
                        const SizedBox(height: 2.0),
                        Text(subtitle!, style: AppTypography.caption),
                      ],
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded, size: 20.0, color: AppColors.textMuted),
                ),
              ],
            ),
          ),
          const Divider(color: AppColors.borderHairline, height: 20.0),

          // Body Scrollable
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 8.0),
              child: child,
            ),
          ),

          // Sticky Footer Actions
          Padding(
            padding: const EdgeInsets.fromLTRB(20.0, 12.0, 20.0, 20.0),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: onCancelAction ?? () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size.fromHeight(48.0),
                      side: const BorderSide(color: AppColors.borderHairline),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12.0)),
                    ),
                    child: Text(cancelActionText, style: AppTypography.formLabel.copyWith(color: AppColors.textMuted)),
                  ),
                ),
                const SizedBox(width: 12.0),
                Expanded(
                  child: ElevatedButton(
                    onPressed: isLoading ? null : onPrimaryAction,
                    style: ElevatedButton.styleFrom(
                      minimumSize: const Size.fromHeight(48.0),
                      backgroundColor: AppColors.primary,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12.0)),
                    ),
                    child: isLoading
                        ? const SizedBox(
                            width: 20.0,
                            height: 20.0,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.0),
                          )
                        : Text(primaryActionText, style: AppTypography.formLabel.copyWith(color: Colors.white)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
