import 'package:flutter/material.dart';
import 'app_colors.dart';
import 'app_typography.dart';

/// AppTheme builds the global ThemeData for SIPTU Mobile.
class AppTheme {
  AppTheme._();

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: AppColors.bgCanvas,
      primaryColor: AppColors.primary,
      colorScheme: const ColorScheme.light(
        primary: AppColors.primary,
        onPrimary: Colors.white,
        secondary: AppColors.accentTeal,
        onSecondary: Colors.white,
        surface: AppColors.surfaceCard,
        onSurface: AppColors.textPrimary,
        error: AppColors.danger,
        onError: Colors.white,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.surfaceCard,
        elevation: 0,
        scrolledUnderElevation: 0.5,
        centerTitle: false,
        titleTextStyle: AppTypography.appBarTitle,
        iconTheme: const IconThemeData(color: AppColors.textPrimary),
      ),
      cardTheme: CardThemeData(
        color: AppColors.surfaceCard,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16.0),
          side: const BorderSide(color: AppColors.borderHairline, width: 1.0),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surfaceCard,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
        hintStyle: AppTypography.caption,
        labelStyle: AppTypography.formLabel,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12.0),
          borderSide: const BorderSide(color: AppColors.borderHairline, width: 1.0),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12.0),
          borderSide: const BorderSide(color: AppColors.borderHairline, width: 1.0),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12.0),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12.0),
          borderSide: const BorderSide(color: AppColors.danger, width: 1.0),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(50.0),
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12.0),
          ),
          textStyle: AppTypography.formLabel.copyWith(
            color: Colors.white,
            fontSize: 14.0,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}
