import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/widgets/custom_bottom_sheet.dart';
import '../../../core/widgets/fieldset_card.dart';

class ArchiveLoanCreateSheet {
  static void show(BuildContext context) {
    final titleController = TextEditingController();
    final purposeController = TextEditingController();

    CustomBottomSheet.show(
      context: context,
      title: 'Peminjaman Arsip',
      subtitle: 'Ajukan peminjaman arsip fisik / digital',
      icon: Icons.folder_shared_rounded,
      primaryActionText: 'Ajukan Peminjaman',
      onPrimaryAction: () {
        if (titleController.text.trim().isEmpty) return;
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Pengajuan Peminjaman Arsip berhasil!'),
            backgroundColor: AppColors.success,
          ),
        );
      },
      child: Column(
        children: [
          FieldsetCard(
            title: 'Detail Berkas Arsip',
            icon: Icons.folder_open_rounded,
            children: [
              Text('NAMA / NAMA BERKAS ARSIP', style: AppTypography.formLabel),
              const SizedBox(height: 6.0),
              TextFormField(
                controller: titleController,
                decoration: const InputDecoration(
                  hintText: 'Contoh: Berkas Laporan Keuangan 2025',
                ),
              ),
              const SizedBox(height: 14.0),
              Text('TUJUAN PEMINJAMAN', style: AppTypography.formLabel),
              const SizedBox(height: 6.0),
              TextFormField(
                controller: purposeController,
                maxLines: 2,
                decoration: const InputDecoration(
                  hintText: 'Contoh: Keperluan Audit BPK',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
