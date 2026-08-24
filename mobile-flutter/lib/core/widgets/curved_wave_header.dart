import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';
import 'initials_avatar.dart';

/// CurvedWaveHeader renders a custom Bezier wave header with profile avatar & digital clock.
class CurvedWaveHeader extends StatefulWidget {
  final String? userName;
  final String? userNip;
  final String? userRole;

  const CurvedWaveHeader({
    super.key,
    this.userName,
    this.userNip,
    this.userRole,
  });

  @override
  State<CurvedWaveHeader> createState() => _CurvedWaveHeaderState();
}

class _CurvedWaveHeaderState extends State<CurvedWaveHeader> {
  late Timer _timer;
  late String _currentTime;

  @override
  void initState() {
    super.initState();
    _updateTime();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => _updateTime());
  }

  void _updateTime() {
    final now = DateTime.now();
    setState(() {
      _currentTime = DateFormat('HH:mm:ss').format(now);
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  String get _safeUserName => widget.userName ?? 'Budi Santoso';
  String get _safeUserNip => widget.userNip ?? '198501012010011001';

  String get _firstName {
    final name = _safeUserName.trim();
    if (name.isEmpty) return 'Pegawai';
    return name.split(' ')[0];
  }

  @override
  Widget build(BuildContext context) {
    return ClipPath(
      clipper: WaveClipper(),
      child: Container(
        height: 195.0,
        width: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              AppColors.primary,
              AppColors.primaryDark,
            ],
          ),
        ),
        padding: const EdgeInsets.fromLTRB(20.0, 48.0, 20.0, 24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                InitialsAvatar(
                  name: _safeUserName,
                  size: 52.0,
                  fontSize: 18.0,
                ),
                const SizedBox(width: 14.0),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Selamat Datang, $_firstName',
                        style: AppTypography.heroHeaderName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4.0),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 2.0),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(100.0),
                            ),
                            child: Text(
                              'NIP: $_safeUserNip',
                              style: AppTypography.caption.copyWith(
                                color: Colors.white,
                                fontSize: 10.5,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          const Spacer(),
                          Text(
                            _currentTime,
                            style: AppTypography.codeText.copyWith(
                              color: Colors.white.withValues(alpha: 0.9),
                              fontSize: 12.0,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class WaveClipper extends CustomClipper<Path> {
  @override
  Path getClip(Size size) {
    final path = Path();
    path.lineTo(0, size.height - 24);

    final firstControlPoint = Offset(size.width / 4, size.height);
    final firstEndPoint = Offset(size.width / 2, size.height - 20);
    path.quadraticBezierTo(
      firstControlPoint.dx,
      firstControlPoint.dy,
      firstEndPoint.dx,
      firstEndPoint.dy,
    );

    final secondControlPoint = Offset(size.width * 3 / 4, size.height - 44);
    final secondEndPoint = Offset(size.width, size.height - 24);
    path.quadraticBezierTo(
      secondControlPoint.dx,
      secondControlPoint.dy,
      secondEndPoint.dx,
      secondEndPoint.dy,
    );

    path.lineTo(size.width, 0);
    path.close();
    return path;
  }

  @override
  bool shouldReclip(CustomClipper<Path> oldClipper) => false;
}
