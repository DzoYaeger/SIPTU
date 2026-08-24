import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';
import 'initials_avatar.dart';

/// DigitalIdCard renders an ultra-modern Digital Employee ID Card (Kartu Digital Pegawai).
class DigitalIdCard extends StatelessWidget {
  final String? userName;
  final String? userNip;
  final String? userRole;

  const DigitalIdCard({
    super.key,
    this.userName,
    this.userNip,
    this.userRole,
  });

  String get _safeUserName => userName ?? 'Budi Santoso';
  String get _safeUserNip => userNip ?? '198501012010011001';
  String get _safeUserRole => userRole ?? 'Pegawai Balai POM di Palopo';

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: 180.0,
      margin: const EdgeInsets.symmetric(horizontal: 16.0),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20.0),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF0F5B99),
            Color(0xFF1E293B),
            Color(0xFF6366F1),
          ],
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x3D0F5B99),
            blurRadius: 20.0,
            offset: Offset(0, 10.0),
          ),
          BoxShadow(
            color: Color(0x1F6366F1),
            blurRadius: 10.0,
            offset: Offset(0, 4.0),
          ),
        ],
      ),
      child: Stack(
        children: [
          // Background Ambient Circles
          Positioned(
            right: -20,
            top: -20,
            child: Container(
              width: 140.0,
              height: 140.0,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.06),
              ),
            ),
          ),
          Positioned(
            right: 40,
            bottom: -30,
            child: Container(
              width: 120.0,
              height: 120.0,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.accentTeal.withValues(alpha: 0.15),
              ),
            ),
          ),

          // Card Content
          Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Top Header Row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.shield_rounded, color: Colors.white, size: 20.0),
                        const SizedBox(width: 6.0),
                        Text(
                          'SIPTU ULTRA DIGITAL ID',
                          style: AppTypography.overline.copyWith(
                            color: Colors.white.withValues(alpha: 0.9),
                            letterSpacing: 1.0,
                          ),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 4.0),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(100.0),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 6.0,
                            height: 6.0,
                            decoration: const BoxDecoration(
                              color: Color(0xFF10B981),
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 6.0),
                          Text(
                            'TTE VERIFIED',
                            style: AppTypography.overline.copyWith(
                              color: Colors.white,
                              fontSize: 9.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                // Middle User Info Row
                Row(
                  children: [
                    InitialsAvatar(
                      name: _safeUserName,
                      size: 48.0,
                      fontSize: 16.0,
                    ),
                    const SizedBox(width: 14.0),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _safeUserName,
                            style: AppTypography.cardTitle.copyWith(
                              color: Colors.white,
                              fontSize: 16.0,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2.0),
                          Text(
                            _safeUserRole,
                            style: AppTypography.caption.copyWith(
                              color: Colors.white.withValues(alpha: 0.8),
                              fontSize: 11.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                // Bottom NIP Bar Code Row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'NOMOR INDUK PEGAWAI (NIP)',
                          style: AppTypography.overline.copyWith(
                            color: Colors.white.withValues(alpha: 0.6),
                            fontSize: 9.0,
                          ),
                        ),
                        const SizedBox(height: 2.0),
                        Text(
                          _safeUserNip,
                          style: AppTypography.codeText.copyWith(
                            color: Colors.white,
                            fontSize: 13.0,
                            letterSpacing: 1.2,
                          ),
                        ),
                      ],
                    ),
                    const Icon(
                      Icons.qr_code_2_rounded,
                      color: Colors.white,
                      size: 32.0,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
