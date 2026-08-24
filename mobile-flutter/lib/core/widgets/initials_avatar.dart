import 'package:flutter/material.dart';

/// InitialsAvatar renders a deterministic HSL colored circle avatar with user initials.
class InitialsAvatar extends StatelessWidget {
  final String? name;
  final double size;
  final double fontSize;

  const InitialsAvatar({
    super.key,
    this.name,
    this.size = 44.0,
    this.fontSize = 15.0,
  });

  String _getInitials(String? input) {
    if (input == null || input.trim().isEmpty) return 'P';
    final parts = input.trim().split(RegExp(r'\s+'));
    if (parts.length == 1) {
      return parts[0].substring(0, parts[0].length >= 2 ? 2 : 1).toUpperCase();
    }
    return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
  }

  Color _generateHslColor(String? input) {
    final String str = input ?? 'Pegawai';
    int hash = 0;
    for (int i = 0; i < str.length; i++) {
      hash = str.codeUnitAt(i) + ((hash << 5) - hash);
    }
    final double hue = (hash % 360).abs().toDouble();
    return HSLColor.fromAHSL(1.0, hue, 0.55, 0.52).toColor();
  }

  @override
  Widget build(BuildContext context) {
    final String safeName = name ?? 'Pegawai';
    final String initials = _getInitials(safeName);
    final Color avatarBg = _generateHslColor(safeName);

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: avatarBg,
        shape: BoxShape.circle,
        boxShadow: const [
          BoxShadow(
            color: Color(0x1A0F172A),
            blurRadius: 6.0,
            offset: Offset(0, 2),
          ),
        ],
      ),
      alignment: Alignment.center,
      child: Text(
        initials,
        style: TextStyle(
          color: Colors.white,
          fontSize: fontSize,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}
