import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

/// AppTypography defines the typography hierarchy and styles for SIPTU Mobile.
class AppTypography {
  AppTypography._();

  // Page / App Bar Title
  static TextStyle get appBarTitle => GoogleFonts.plusJakartaSans(
        fontSize: 18.0,
        fontWeight: FontWeight.w700,
        height: 1.2,
        letterSpacing: -0.2,
        color: AppColors.textPrimary,
      );

  // Hero Header Name
  static TextStyle get heroHeaderName => GoogleFonts.plusJakartaSans(
        fontSize: 20.0,
        fontWeight: FontWeight.w800,
        height: 1.25,
        letterSpacing: -0.4,
        color: Colors.white,
      );

  // Section Heading (H2)
  static TextStyle get sectionHeader => GoogleFonts.plusJakartaSans(
        fontSize: 16.0,
        fontWeight: FontWeight.w700,
        height: 1.3,
        letterSpacing: -0.2,
        color: AppColors.textPrimary,
      );

  // Card Title / Item Name (H3)
  static TextStyle get cardTitle => GoogleFonts.plusJakartaSans(
        fontSize: 14.0,
        fontWeight: FontWeight.w700,
        height: 1.35,
        color: AppColors.textPrimary,
      );

  // Body Text Standard
  static TextStyle get bodyText => GoogleFonts.inter(
        fontSize: 13.0,
        fontWeight: FontWeight.w400,
        height: 1.45,
        color: AppColors.textBody,
      );

  // Body Text Bold / Form Label
  static TextStyle get formLabel => GoogleFonts.inter(
        fontSize: 12.5,
        fontWeight: FontWeight.w600,
        height: 1.35,
        color: AppColors.textBody,
      );

  // Caption / Subtitle Muted
  static TextStyle get caption => GoogleFonts.inter(
        fontSize: 11.5,
        fontWeight: FontWeight.w400,
        height: 1.4,
        color: AppColors.textMuted,
      );

  // Overline / Upper Badge Text
  static TextStyle get overline => GoogleFonts.inter(
        fontSize: 10.5,
        fontWeight: FontWeight.w700,
        height: 1.2,
        letterSpacing: 0.5,
        color: AppColors.textMuted,
      );

  // Code / NIP / Token Monospace
  static TextStyle get codeText => GoogleFonts.robotoMono(
        fontSize: 12.0,
        fontWeight: FontWeight.w600,
        letterSpacing: 0.2,
        color: AppColors.primary,
      );
}
