import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/widgets/custom_bottom_sheet.dart';
import '../../../core/widgets/fieldset_card.dart';

class ExitPermitCreateSheet {
  static void show(BuildContext context) {
    final reasonController = TextEditingController();
    final durationController = TextEditingController(text: '60');

    CustomBottomSheet.show(
      context: context,
      title: 'Izin Keluar Kantor (RISPEG)',
      subtitle: 'Pengajuan izin keluar kantor dengan pencatatan otomatis',
      icon: Icons.directions_walk_rounded,
      primaryActionText: 'Ajukan Izin',
      onPrimaryAction: () {
        if (reasonController.text.trim().isEmpty) return;
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Pengajuan Izin Keluar berhasil dikirim!'),
            backgroundColor: AppColors.success,
          ),
        );
      },
      child: Column(
        children: [
          FieldsetCard(
            title: 'Detail Pengajuan Izin',
            icon: Icons.access_time_rounded,
            children: [
              Text('ALASAN IZIN KELUAR', style: AppTypography.formLabel),
              const SizedBox(height: 6.0),
              TextFormField(
                controller: reasonController,
                maxLines: 2,
                decoration: const InputDecoration(
                  hintText: 'Contoh: Ke Bank Mandiri untuk Pengurusan Gaji',
                ),
              ),
              const SizedBox(height: 14.0),
              Text('ESTIMASI DURASI (MENIT)', style: AppTypography.formLabel),
              const SizedBox(height: 6.0),
              TextFormField(
                controller: durationController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  hintText: 'Contoh: 60',
                  suffixText: 'Menit',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
