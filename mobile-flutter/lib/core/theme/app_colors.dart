import 'package:flutter/material.dart';

/// AppColors defines the official design system color tokens for SIPTU Mobile.
class AppColors {
  AppColors._();

  // Brand Primary
  static const Color primary = Color(0xFF0F5B99);       // SIPTU Deep Blue
  static const Color primaryDark = Color(0xFF0A4373);   // Pressed State Blue
  static const Color primaryLight = Color(0xFFEEF2FF);  // Pastel Blue Surface

  // Accents
  static const Color accentTeal = Color(0xFF0D9488);    // Emerald Teal
  static const Color accentViolet = Color(0xFF6366F1);  // Electric Indigo
  static const Color accentAmber = Color(0xFFF59E0B);   // Warm Coral Amber

  // Canvas & Surfaces
  static const Color bgCanvas = Color(0xFFF8FAFC);      // Off-white Slate
  static const Color surfaceCard = Color(0xFFFFFFFF);   // Pure White Surface
  static const Color borderHairline = Color(0xFFE2E8F0);// Subdued Border

  // Text Neutral
  static const Color textPrimary = Color(0xFF172033);   // Dark Slate Header
  static const Color textBody = Color(0xFF334155);      // Main Body Color
  static const Color textMuted = Color(0xFF64748B);     // Subtitle / Label Muted

  // Semantic Status Tones
  static const Color success = Color(0xFF059669);       // Emerald Green (Selesai/Disetujui)
  static const Color successBg = Color(0xFFECFDF5);     // Pastel Green
  static const Color warning = Color(0xFFD97706);       // Amber (Menunggu/Dipinjam)
  static const Color warningBg = Color(0xFFFFFBEB);     // Pastel Amber
  static const Color danger = Color(0xFFDC2626);        // Red (Ditolak/Alert)
  static const Color dangerBg = Color(0xFFFEF2F2);      // Pastel Red
  static const Color infoBg = Color(0xFFF5F3FF);        // Pastel Purple
}
