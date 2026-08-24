import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/widgets/custom_bottom_sheet.dart';
import '../../../core/widgets/fieldset_card.dart';

class ItHelpdeskCreateSheet {
  static void show(BuildContext context) {
    final titleController = TextEditingController();
    final descriptionController = TextEditingController();
    String category = 'komputer';

    CustomBottomSheet.show(
      context: context,
      title: 'Laporan IT Helpdesk',
      subtitle: 'Laporkan kendala komputer, printer, atau jaringan',
      icon: Icons.build_rounded,
      primaryActionText: 'Kirim Laporan',
      onPrimaryAction: () {
        if (titleController.text.trim().isEmpty) return;
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Laporan IT Helpdesk berhasil dikirim!'),
            backgroundColor: AppColors.success,
          ),
        );
      },
      child: StatefulBuilder(
        builder: (ctx, setState) {
          return Column(
            children: [
              FieldsetCard(
                title: 'Informasi Kendala IT',
                icon: Icons.computer_rounded,
                children: [
                  Text('KATEGORI KENDALA', style: AppTypography.formLabel),
                  const SizedBox(height: 6.0),
                  DropdownButtonFormField<String>(
                    initialValue: category,
                    decoration: const InputDecoration(),
                    items: const [
                      DropdownMenuItem(value: 'komputer', child: Text('Komputer / Laptop')),
                      DropdownMenuItem(value: 'printer', child: Text('Printer / Scanner')),
                      DropdownMenuItem(value: 'jaringan', child: Text('Jaringan / Wi-Fi')),
                      DropdownMenuItem(value: 'aplikasi', child: Text('Aplikasi SIPTU')),
                    ],
                    onChanged: (val) => setState(() => category = val!),
                  ),
                  const SizedBox(height: 14.0),
                  Text('JUDUL LAPORAN', style: AppTypography.formLabel),
                  const SizedBox(height: 6.0),
                  TextFormField(
                    controller: titleController,
                    decoration: const InputDecoration(
                      hintText: 'Contoh: Printer Rusak / Mati Total',
                    ),
                  ),
                  const SizedBox(height: 14.0),
                  Text('DESKRIPSI RINCI', style: AppTypography.formLabel),
                  const SizedBox(height: 6.0),
                  TextFormField(
                    controller: descriptionController,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      hintText: 'Jelaskan rincian kendala secara detail...',
                    ),
                  ),
                ],
              ),
            ],
          );
        },
      ),
    );
  }
}
