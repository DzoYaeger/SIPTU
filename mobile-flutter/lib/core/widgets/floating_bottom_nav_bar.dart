import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// FloatingBottomNavBar renders a floating navigation bar with center FAB.
class FloatingBottomNavBar extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;
  final VoidCallback onFabTap;

  const FloatingBottomNavBar({
    super.key,
    required this.currentIndex,
    required this.onTap,
    required this.onFabTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16.0, 0, 16.0, 16.0),
      height: 64.0,
      decoration: BoxDecoration(
        color: AppColors.surfaceCard,
        borderRadius: BorderRadius.circular(24.0),
        border: Border.all(color: AppColors.borderHairline, width: 1.0),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1A0F172A),
            blurRadius: 20.0,
            offset: Offset(0, 8.0),
          ),
        ],
      ),
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.center,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildNavItem(0, Icons.grid_view_rounded, 'Layanan'),
              _buildNavItem(1, Icons.history_rounded, 'Riwayat'),
              const SizedBox(width: 48.0), // Gap for center FAB
              _buildNavItem(2, Icons.notifications_rounded, 'Notif'),
              _buildNavItem(3, Icons.person_rounded, 'Profil'),
            ],
          ),
          Positioned(
            top: -16.0,
            child: GestureDetector(
              onTap: onFabTap,
              child: Container(
                width: 54.0,
                height: 54.0,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: const LinearGradient(
                    colors: [AppColors.primary, AppColors.primaryDark],
                  ),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x3D0F5B99),
                      blurRadius: 12.0,
                      offset: Offset(0, 6.0),
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.add_rounded,
                  color: Colors.white,
                  size: 28.0,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNavItem(int index, IconData icon, String label) {
    final bool isActive = currentIndex == index;
    final Color color = isActive ? AppColors.primary : AppColors.textMuted;

    return InkWell(
      onTap: () => onTap(index),
      borderRadius: BorderRadius.circular(16.0),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 8.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 22.0),
            const SizedBox(height: 2.0),
            if (isActive)
              Container(
                width: 4.0,
                height: 4.0,
                decoration: const BoxDecoration(
                  color: AppColors.primary,
                  shape: BoxShape.circle,
                ),
              ),
          ],
        ),
      ),
    );
  }
}
