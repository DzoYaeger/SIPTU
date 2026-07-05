<?php

namespace App\Services;

use PhpOffice\PhpWord\TemplateProcessor;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;

class TemplateService
{
    /**
     * Process Word Document Template (.docx)
     */
    public function processWordTemplate(string $templatePath, string $outputPath, array $simpleData, array $employeeData, array $saranaData)
    {
        $preparedTemplatePath = $this->prepareWordTemplateForProcessing($templatePath);

        try {
            $templateProcessor = new TemplateProcessor($preparedTemplatePath);
            $templateProcessor->setMacroChars('{', '}');

            foreach ($simpleData as $key => $value) {
                $templateProcessor->setValue(trim($key, '{}'), $value);
            }

            $employeeMapped = $this->mapArrayVariables($employeeData, [
                'NAMA_PEGAWAI' => 'name',
                'NIP_PEGAWAI' => 'nip',
                'PANGKAT_PEGAWAI' => 'pangkat',
                'JABATAN_PEGAWAI' => 'position',
                'FUNGSI_PEGAWAI' => 'function_area',
                'UNIT_KERJA_PEGAWAI' => 'department',
            ]);
            $this->applyWordRepeatingData($templateProcessor, 'NAMA_PEGAWAI', $employeeMapped, [
                'NAMA_PEGAWAI',
                'NIP_PEGAWAI',
                'PANGKAT_PEGAWAI',
                'JABATAN_PEGAWAI',
                'FUNGSI_PEGAWAI',
                'UNIT_KERJA_PEGAWAI',
            ]);

            $saranaMapped = $this->mapArrayVariables($saranaData, [
                'NAMA_SARANA' => 'nama',
                'LOKASI_SARANA' => 'lokasi',
            ]);
            $this->applyWordRepeatingData($templateProcessor, 'NAMA_SARANA', $saranaMapped, [
                'NAMA_SARANA',
                'LOKASI_SARANA',
            ]);

            $firstEmployee = $employeeData[0] ?? [];
            $templateProcessor->setValue('NAMA_PEGAWAI_1', $this->readField($firstEmployee, 'name'));
            $templateProcessor->setValue('NIP_PEGAWAI_1', $this->readField($firstEmployee, 'nip'));

            $templateProcessor->saveAs($outputPath);
        } finally {
            if ($preparedTemplatePath !== $templatePath && file_exists($preparedTemplatePath)) {
                @unlink($preparedTemplatePath);
            }
        }
    }

    /**
     * Process Excel Workbook Template (.xlsx, .xls)
     * Loads the template, does simple variable replacement, then merges
     * employee / sarana data into single cells.
     */
    public function processExcelTemplate(string $templatePath, string $outputPath, array $simpleData, array $employeeData, array $saranaData)
    {
        $spreadsheet = IOFactory::load($templatePath);
        $worksheet = $spreadsheet->getActiveSheet();

        // 1. Process Employees — merge into one cell block
        $this->mergeDataIntoCell($worksheet, '{NAMA_PEGAWAI}',
            $this->formatEmployeeBlock($employeeData),
            ['{NIP_PEGAWAI}', '{PANGKAT_PEGAWAI}', '{JABATAN_PEGAWAI}', '{FUNGSI_PEGAWAI}', '{UNIT_KERJA_PEGAWAI}']
        );

        // 2. Process Sarana — merge into one cell block
        $this->mergeDataIntoCell($worksheet, '{NAMA_SARANA}',
            $this->formatSaranaBlock($saranaData),
            ['{LOKASI_SARANA}']
        );

        // 3. Replace Simple Data
        $highestRow = $worksheet->getHighestRow();
        $highestColIndex = Coordinate::columnIndexFromString($worksheet->getHighestColumn());
        for ($row = 1; $row <= $highestRow; $row++) {
            for ($colIdx = 1; $colIdx <= $highestColIndex; $colIdx++) {
                $colLetter = Coordinate::stringFromColumnIndex($colIdx);
                $cell = $worksheet->getCell($colLetter . $row);
                $value = $cell->getValue();
                if (is_string($value)) {
                    $newValue = $value;
                    foreach ($simpleData as $search => $replace) {
                        $newValue = str_replace($search, $replace ?? '', $newValue);
                    }
                    if ($newValue !== $value) {
                        $cell->setValue($newValue);
                    }
                }
            }
        }

        $writer = IOFactory::createWriter($spreadsheet, 'Xlsx');
        $writer->save($outputPath);
    }

    /**
     * Generate Protokol Kerja Excel dari data (tanpa template file).
     * Ukuran kertas F4, landscape.
     */
    public function generateProtokolKerja(string $outputPath, array $data)
    {
        $spreadsheet = new Spreadsheet();
        $ws = $spreadsheet->getActiveSheet();
        $ws->setTitle('Protokol Kerja');

        // Page setup — F4 (215.9mm x 330mm), landscape
        $ws->getPageSetup()->setPaperSize(PageSetup::PAPERSIZE_FOLIO);
        $ws->getPageSetup()->setOrientation(PageSetup::ORIENTATION_LANDSCAPE);
        $ws->getPageSetup()->setFitToWidth(1);
        $ws->getPageSetup()->setFitToHeight(0);
        $ws->getPageMargins()->setTop(0.5);
        $ws->getPageMargins()->setBottom(0.5);
        $ws->getPageMargins()->setLeft(0.5);
        $ws->getPageMargins()->setRight(0.5);

        // Column widths
        $ws->getColumnDimension('A')->setWidth(18);  // Label (Sasaran/Petugas/Anggaran)
        $ws->getColumnDimension('B')->setWidth(5);   // No.
        $ws->getColumnDimension('C')->setWidth(35);  // Sarana/Label/Media / Nama Pegawai
        $ws->getColumnDimension('D')->setWidth(40);  // Justifikasi

        // ────── STYLES ──────
        $borderAll = [
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['argb' => 'FF000000'],
                ],
            ],
        ];
        $headerStyle = [
            'font' => ['bold' => true, 'size' => 11],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FFD9E1F2']],
        ];
        $labelStyle = [
            'font' => ['bold' => true, 'size' => 10],
            'alignment' => ['vertical' => Alignment::VERTICAL_TOP],
        ];
        $valueStyle = [
            'font' => ['size' => 10],
            'alignment' => ['vertical' => Alignment::VERTICAL_TOP, 'wrapText' => true],
        ];

        $row = 1;

        // ────── TITLE ──────
        $ws->setCellValue("A{$row}", 'PROTOKOL KERJA PENGAWASAN');
        $ws->mergeCells("A{$row}:D{$row}");
        $ws->getStyle("A{$row}")->applyFromArray([
            'font' => ['bold' => true, 'size' => 14],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        $row++;

        // Subtitle
        $ws->setCellValue("A{$row}", $data['lokasi_tugas'] ?? '');
        $ws->mergeCells("A{$row}:D{$row}");
        $ws->getStyle("A{$row}")->applyFromArray([
            'font' => ['bold' => true, 'size' => 12],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        $row++;

        // Deskripsi
        if (!empty($data['deskripsi_tugas'])) {
            $ws->setCellValue("A{$row}", $data['deskripsi_tugas']);
            $ws->mergeCells("A{$row}:D{$row}");
            $ws->getStyle("A{$row}")->applyFromArray([
                'font' => ['italic' => true, 'size' => 10],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ]);
            $row++;
        }

        $row++; // spacer

        // ────── TABLE HEADER ──────
        $headerRow = $row;
        $ws->setCellValue("A{$row}", 'Uraian');
        $ws->setCellValue("B{$row}", 'No.');
        $ws->setCellValue("C{$row}", 'Sarana/Label/Media');
        $ws->setCellValue("D{$row}", 'Justifikasi');
        $ws->getStyle("A{$row}:D{$row}")->applyFromArray(array_merge($headerStyle, $borderAll));
        $ws->getRowDimension($row)->setRowHeight(24);
        $row++;

        // ────── SASARAN (Sarana) ──────
        $saranaList = $data['sarana'] ?? [];
        $saranaStartRow = $row;

        if (!empty($saranaList)) {
            foreach ($saranaList as $i => $sar) {
                $nama = is_array($sar) ? ($sar['nama'] ?? '') : ($sar->nama ?? '');
                $lokasi = is_array($sar) ? ($sar['lokasi'] ?? '') : ($sar->lokasi ?? '');

                $ws->setCellValue("B{$row}", $i + 1);
                $ws->setCellValue("C{$row}", $nama);
                $ws->getStyle("A{$row}:D{$row}")->applyFromArray(array_merge($valueStyle, $borderAll));
                $row++;
            }
        } else {
            $ws->getStyle("A{$row}:D{$row}")->applyFromArray(array_merge($valueStyle, $borderAll));
            $row++;
        }

        // Label "Sasaran" merged for all sarana rows
        $saranaEndRow = $row - 1;
        $ws->setCellValue("A{$saranaStartRow}", 'Sasaran');
        if ($saranaEndRow > $saranaStartRow) {
            $ws->mergeCells("A{$saranaStartRow}:A{$saranaEndRow}");
        }
        $ws->getStyle("A{$saranaStartRow}")->applyFromArray($labelStyle);

        // ────── PETUGAS (Employees) ──────
        $employees = $data['employees'] ?? [];
        $petugasStartRow = $row;

        if (!empty($employees)) {
            foreach ($employees as $i => $emp) {
                $name     = is_array($emp) ? ($emp['name'] ?? '') : ($emp->name ?? '');
                $nip      = is_array($emp) ? ($emp['nip'] ?? '') : ($emp->nip ?? '');
                $pangkat  = is_array($emp) ? ($emp['pangkat'] ?? '') : ($emp->pangkat ?? '');
                $position = is_array($emp) ? ($emp['position'] ?? '') : ($emp->position ?? '');
                $department = is_array($emp) ? ($emp['department'] ?? '') : ($emp->department ?? '');

                // Build multi-line value for one employee
                $lines = [$name];
                if ($nip) $lines[] = "NIP. {$nip}";
                if ($pangkat) $lines[] = "Pangkat: {$pangkat}";
                if ($position) $lines[] = "Jabatan: {$position}";

                $ws->setCellValue("B{$row}", $i + 1);
                $ws->setCellValue("C{$row}", implode("\n", $lines));
                $ws->getStyle("C{$row}")->getAlignment()->setWrapText(true);

                $ws->getStyle("A{$row}:D{$row}")->applyFromArray(array_merge($valueStyle, $borderAll));
                $ws->getRowDimension($row)->setRowHeight(-1); // auto height
                $row++;
            }
        } else {
            $ws->getStyle("A{$row}:D{$row}")->applyFromArray(array_merge($valueStyle, $borderAll));
            $row++;
        }

        // Label "Petugas" merged for all employee rows
        $petugasEndRow = $row - 1;
        $ws->setCellValue("A{$petugasStartRow}", 'Petugas');
        if ($petugasEndRow > $petugasStartRow) {
            $ws->mergeCells("A{$petugasStartRow}:A{$petugasEndRow}");
        }
        $ws->getStyle("A{$petugasStartRow}")->applyFromArray($labelStyle);

        // ────── ANGGARAN (MAK) ──────
        $ws->setCellValue("A{$row}", 'Anggaran');
        $ws->setCellValue("C{$row}", $data['mak'] ?? '');
        $ws->getStyle("A{$row}:D{$row}")->applyFromArray(array_merge($valueStyle, $borderAll));
        $ws->getStyle("A{$row}")->applyFromArray($labelStyle);
        $row++;

        $row++; // spacer

        // ────── NOTES ──────
        $row++; // spacer

        // ────── SIGNATURES ──────
        $tanggalST = $data['tanggal_st'] ?? '';
        $ws->setCellValue("C{$row}", "Palopo, " . $tanggalST);
        $ws->getStyle("C{$row}")->applyFromArray([
            'font' => ['size' => 10],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_RIGHT],
        ]);
        $row++;

        // Signature titles row
        $ws->setCellValue("A{$row}", 'Disetujui');
        $ws->setCellValue("C{$row}", 'Ketua Tim');
        $ws->getStyle("A{$row}")->applyFromArray(['font' => ['bold' => true, 'italic' => true, 'size' => 10]]);
        $ws->getStyle("C{$row}")->applyFromArray([
            'font' => ['bold' => true, 'size' => 10],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_RIGHT],
        ]);
        $row++;

        $ws->setCellValue("A{$row}", 'Kepala');
        $ws->getStyle("A{$row}")->applyFromArray(['font' => ['bold' => true, 'italic' => true, 'size' => 10]]);
        $row++;
        $row++; // space for signature
        $row++;
        $row++;

        // Penandatangan name
        $penandatanganName = $data['penandatangan_name'] ?? '';
        $penandatanganNip = $data['penandatangan_nip'] ?? '';
        $statusJabatan = $data['status_jabatan'] ?? '';

        if ($penandatanganName) {
            $ws->setCellValue("A{$row}", $statusJabatan . $penandatanganName);
            $ws->getStyle("A{$row}")->applyFromArray([
                'font' => ['bold' => true, 'underline' => true, 'size' => 10],
            ]);
            $row++;
            if ($penandatanganNip) {
                $ws->setCellValue("A{$row}", "NIP. {$penandatanganNip}");
                $ws->getStyle("A{$row}")->applyFromArray(['font' => ['size' => 9]]);
            }
        }

        // Ketua Tim — first employee
        if (!empty($employees)) {
            $firstEmp = $employees[0];
            $empName = is_array($firstEmp) ? ($firstEmp['name'] ?? '') : ($firstEmp->name ?? '');
            $empNip = is_array($firstEmp) ? ($firstEmp['nip'] ?? '') : ($firstEmp->nip ?? '');

            $signRow = $row - 1; // Same row as penandatangan name
            $ws->setCellValue("C{$signRow}", $empName);
            $ws->getStyle("C{$signRow}")->applyFromArray([
                'font' => ['bold' => true, 'underline' => true, 'size' => 10],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_RIGHT],
            ]);
            if ($empNip) {
                $ws->setCellValue("C{$row}", "NIP. {$empNip}");
                $ws->getStyle("C{$row}")->applyFromArray([
                    'font' => ['size' => 9],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_RIGHT],
                ]);
            }
        }

        // Save
        $writer = IOFactory::createWriter($spreadsheet, 'Xlsx');
        $writer->save($outputPath);
    }

    // ─── Helper methods ───────────────────────

    private function formatEmployeeBlock(array $employees): string
    {
        $lines = [];
        foreach ($employees as $i => $emp) {
            $name = is_array($emp) ? ($emp['name'] ?? '') : ($emp->name ?? '');
            $nip = is_array($emp) ? ($emp['nip'] ?? '') : ($emp->nip ?? '');
            $pangkat = is_array($emp) ? ($emp['pangkat'] ?? '') : ($emp->pangkat ?? '');
            $position = is_array($emp) ? ($emp['position'] ?? '') : ($emp->position ?? '');

            $num = $i + 1;
            $lines[] = "{$num}. {$name}";
            if ($nip) $lines[] = "    NIP: {$nip}";
            if ($pangkat) $lines[] = "    Pangkat: {$pangkat}";
            if ($position) $lines[] = "    Jabatan: {$position}";
        }
        return implode("\n", $lines);
    }

    private function formatSaranaBlock(array $saranaData): string
    {
        $lines = [];
        foreach ($saranaData as $i => $sar) {
            $nama = is_array($sar) ? ($sar['nama'] ?? '') : ($sar->nama ?? '');
            $lokasi = is_array($sar) ? ($sar['lokasi'] ?? '') : ($sar->lokasi ?? '');
            $num = $i + 1;
            $entry = "{$num}. {$nama}";
            if ($lokasi) $entry .= " ({$lokasi})";
            $lines[] = $entry;
        }
        return implode("\n", $lines);
    }

    private function mergeDataIntoCell(Worksheet $worksheet, string $searchPlaceholder, string $mergedText, array $extraPlaceholdersToRemove)
    {
        $nameCell = $this->findCellWithText($worksheet, $searchPlaceholder);
        if (!$nameCell) return;

        $worksheet->getCell($nameCell)->setValue($mergedText);
        $worksheet->getStyle($nameCell)->getAlignment()->setWrapText(true);

        // Remove rows containing leftover placeholders
        $rowsToRemove = [];
        $highestRow = $worksheet->getHighestRow();
        $highestColIndex = Coordinate::columnIndexFromString($worksheet->getHighestColumn());

        for ($row = 1; $row <= $highestRow; $row++) {
            for ($colIdx = 1; $colIdx <= $highestColIndex; $colIdx++) {
                $colLetter = Coordinate::stringFromColumnIndex($colIdx);
                $value = $worksheet->getCell($colLetter . $row)->getValue();
                if (is_string($value)) {
                    foreach ($extraPlaceholdersToRemove as $ph) {
                        if (strpos($value, $ph) !== false) {
                            $rowsToRemove[$row] = true;
                        }
                    }
                }
            }
        }

        $rowsToRemove = array_keys($rowsToRemove);
        rsort($rowsToRemove);
        foreach ($rowsToRemove as $row) {
            $worksheet->removeRow($row);
        }
    }

    private function findCellWithText(Worksheet $worksheet, string $searchText): ?string
    {
        $highestRow = $worksheet->getHighestRow();
        $highestColIndex = Coordinate::columnIndexFromString($worksheet->getHighestColumn());

        for ($row = 1; $row <= $highestRow; $row++) {
            for ($colIdx = 1; $colIdx <= $highestColIndex; $colIdx++) {
                $colLetter = Coordinate::stringFromColumnIndex($colIdx);
                $value = $worksheet->getCell($colLetter . $row)->getValue();
                if (is_string($value) && strpos($value, $searchText) !== false) {
                    return $colLetter . $row;
                }
            }
        }
        return null;
    }

    private function mapArrayVariables(array $data, array $mapping)
    {
        $mapped = [];
        foreach ($data as $index => $item) {
            $row = [];
            foreach ($mapping as $templateVar => $itemKey) {
                if (is_array($item)) {
                    $val = $item[$itemKey] ?? '';
                } else {
                    $val = $item->{$itemKey} ?? '';
                }
                $row[$templateVar] = $val;
            }
            $row['NO'] = $index + 1;
            $mapped[] = $row;
        }
        return $mapped;
    }

    private function applyWordRepeatingData(
        TemplateProcessor $templateProcessor,
        string $anchorVariable,
        array $rows,
        array $fieldVariables
    ): void {
        if (empty($rows)) {
            foreach ($fieldVariables as $field) {
                $templateProcessor->setValue($field, '');
            }
            return;
        }

        try {
            $templateProcessor->cloneRowAndSetValues($anchorVariable, $rows);
            return;
        } catch (\Throwable $e) {
            // Fallback jika placeholder tidak dalam baris tabel yang bisa di-clone.
        }

        foreach ($fieldVariables as $field) {
            $lines = [];
            foreach ($rows as $i => $row) {
                $value = trim((string) ($row[$field] ?? ''));
                if ($value === '') {
                    continue;
                }
                $lines[] = ($i + 1) . '. ' . $value;
            }
            $templateProcessor->setValue($field, implode("\n", $lines));
        }
    }

    private function readField($item, string $key): string
    {
        if (is_array($item)) {
            return (string) ($item[$key] ?? '');
        }

        if (is_object($item)) {
            return (string) ($item->{$key} ?? '');
        }

        return '';
    }

    private function prepareWordTemplateForProcessing(string $templatePath): string
    {
        if (!class_exists(\ZipArchive::class)) {
            return $templatePath;
        }

        $tempFile = tempnam(sys_get_temp_dir(), 'st_tpl_');
        if (!$tempFile) {
            return $templatePath;
        }

        $preparedPath = $tempFile . '.docx';
        @unlink($tempFile);

        if (!@copy($templatePath, $preparedPath)) {
            return $templatePath;
        }

        $zip = new \ZipArchive();
        if ($zip->open($preparedPath) !== true) {
            @unlink($preparedPath);
            return $templatePath;
        }

        $documentXml = $zip->getFromName('word/document.xml');
        if (!is_string($documentXml)) {
            $zip->close();
            return $preparedPath;
        }

        $normalizedXml = $this->normalizeWordPlaceholderMarkup($documentXml);
        if ($normalizedXml !== $documentXml) {
            $zip->addFromString('word/document.xml', $normalizedXml);
        }
        $zip->close();

        return $preparedPath;
    }

    private function normalizeWordPlaceholderMarkup(string $xml): string
    {
        $normalized = $xml;

        $tokens = [
            'NOMOR_ST',
            'TANGGAL_ST',
            'TANGGAL_MULAI',
            'TANGGAL_SELESAI',
            'LOKASI_TUGAS',
            'DESKRIPSI_TUGAS',
            'MAK',
            'NAMA_PEGAWAI',
            'NIP_PEGAWAI',
            'PANGKAT_PEGAWAI',
            'JABATAN_PEGAWAI',
            'FUNGSI_PEGAWAI',
            'UNIT_KERJA_PEGAWAI',
            'NAMA_PEGAWAI_1',
            'NIP_PEGAWAI_1',
            'NAMA_SARANA',
            'LOKASI_SARANA',
            'PENANDATANGAN',
            'NIP_PENANDATANGAN',
            'JABATAN_PENANDATANGAN',
            'STATUS_JABATAN',
        ];

        $runBreak = '<\/w:t>\s*<\/w:r>\s*(?:<w:proofErr[^>]*\/>\s*)*<w:r[^>]*>\s*(?:<w:rPr>.*?<\/w:rPr>)?\s*<w:t[^>]*>';
        $optionalBreak = '(?:' . $runBreak . ')?';

        foreach ($tokens as $token) {
            $chars = preg_split('//u', $token, -1, PREG_SPLIT_NO_EMPTY);
            if (!$chars) {
                continue;
            }

            $joinedChars = implode($optionalBreak, array_map(static function ($char) {
                return preg_quote($char, '/');
            }, $chars));

            $pattern = '/\{' . $optionalBreak . $joinedChars . $optionalBreak . '\}/s';
            $normalized = preg_replace($pattern, '{' . $token . '}', $normalized);
        }

        return (string) $normalized;
    }
}
