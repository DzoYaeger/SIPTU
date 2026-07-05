<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ArchiveLoan;
use App\Models\ArchiveUnit;
use App\Models\Employee;
use App\Models\NotificationSetting;
use App\Services\FonnteService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Illuminate\Support\Facades\Response;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use App\Models\ArchiveUnitSetting;
use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;
use chillerlan\QRCode\Common\EccLevel;
use chillerlan\QRCode\Output\QRMarkupSVG;

class ArchiveLoanController extends Controller
{
    public function index()
    {
        $loans = ArchiveLoan::with(['unitPengolah', 'approvedBy.employee', 'returnApprovedBy.employee'])
            ->orderByDesc('created_at')
            ->get()
            ->map(function (ArchiveLoan $loan) {
                return $this->buildPublicPayload($loan)['loan'];
            });

        return response()->json($loans);
    }

    public function borrowers()
    {
        $names = ArchiveLoan::query()
            ->select('borrower_name')
            ->whereNotNull('borrower_name')
            ->distinct()
            ->orderBy('borrower_name')
            ->pluck('borrower_name')
            ->values();

        return response()->json($names);
    }

    public function report(Request $request)
    {
        $loans = $this->getReportQuery($request)->get();

        $summary = [
            'total' => $loans->count(),
            'by_status' => $loans->groupBy('status')->map->count(),
        ];

        $data = $loans->map(function (ArchiveLoan $loan) {
            return [
                'id' => $loan->id,
                'borrow_date' => $loan->borrow_date?->format('Y-m-d'),
                'archive_number' => $loan->archive_number,
                'archive_format' => $loan->archive_format,
                'document_type' => $loan->document_type,
                'purpose' => $loan->purpose,
                'status' => $loan->status,
                'unit_pengolah' => $loan->unitPengolah ? [
                    'id' => $loan->unitPengolah->id,
                    'nama' => $loan->unitPengolah->fungsi_bidang,
                    'fungsi_bidang' => $loan->unitPengolah->fungsi_bidang,
                ] : null,
            ];
        });

        $units = ArchiveUnit::query()
            ->orderBy('fungsi_bidang')
            ->get(['id', 'fungsi_bidang'])
            ->map(function (ArchiveUnit $unit) {
                return [
                    'id' => $unit->id,
                    'nama' => $unit->fungsi_bidang,
                    'fungsi_bidang' => $unit->fungsi_bidang,
                ];
            });

        return response()->json([
            'data' => $data,
            'summary' => $summary,
            'units' => $units,
        ]);
    }

    public function store(Request $request)
    {
        $payload = $request->validate([
            'borrow_date' => ['required', 'date'],
            'borrower_name' => ['required', 'string', 'max:255'],
            'borrower_nip' => ['nullable', 'string', 'max:50'],
            'borrower_work_unit' => ['nullable', 'string', 'max:255'],
            'archive_unit_id' => ['nullable', 'exists:archive_units,id'],
            'archive_number' => ['required', 'string', 'max:100'],
            'archive_format' => ['nullable', 'string', 'max:50'],
            'document_type' => ['nullable', 'string', 'max:100'],
            'purpose' => ['nullable', 'string'],
            'borrower_signature' => ['nullable', 'string'],
        ]);

        $loan = ArchiveLoan::create([
            'request_number' => $this->buildRequestNumber(),
            'borrow_date' => $payload['borrow_date'],
            'borrower_name' => $payload['borrower_name'],
            'borrower_nip' => $payload['borrower_nip'] ?? null,
            'borrower_work_unit' => $payload['borrower_work_unit'] ?? null,
            'archive_unit_id' => $payload['archive_unit_id'] ?? null,
            'archive_number' => $payload['archive_number'],
            'archive_format' => $payload['archive_format'] ?? null,
            'document_type' => $payload['document_type'] ?? null,
            'purpose' => $payload['purpose'] ?? null,
            'borrower_signature' => $payload['borrower_signature'] ?? null,
            'status' => 'menunggu_paraf',
            'public_token' => (string) Str::uuid(),
        ]);

        return response()->json($loan, 201);
    }

    public function approve(string $id, Request $request, FonnteService $fonnteService)
    {
        $loan = ArchiveLoan::with('unitPengolah')->findOrFail($id);
        $user = Auth::user();

        $request->validate([
            'password' => 'required|string',
        ]);

        if (!Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Password admin salah.'], 401);
        }

        $loan->update([
            'status' => 'dipinjam',
            'approved_at' => now(),
            'admin_signed_at' => now(),
            'approved_by' => $user->id,
        ]);

        $this->sendBorrowerNotification($loan, $fonnteService);

        return response()->json($loan);
    }

    public function approveReturn(string $id, Request $request)
    {
        $loan = ArchiveLoan::findOrFail($id);
        $user = Auth::user();

        $request->validate([
            'password' => 'required|string',
        ]);

        if (!Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Password admin salah.'], 401);
        }

        $loan->update([
            'status' => 'dikembalikan',
            'return_date' => now()->toDateString(),
            'return_admin_signed_at' => now(),
            'return_approved_by' => $user->id,
        ]);

        return response()->json($loan);
    }

    public function showPublic(string $token)
    {
        $loan = ArchiveLoan::with('unitPengolah')
            ->where('public_token', $token)
            ->firstOrFail();

        return response()->json($this->buildPublicPayload($loan));
    }

    public function requestReturnPublic(string $token, Request $request)
    {
        $loan = ArchiveLoan::with('unitPengolah')
            ->where('public_token', $token)
            ->firstOrFail();

        if ($loan->status === 'dikembalikan') {
            return response()->json(['message' => 'Peminjaman sudah selesai.'], 422);
        }

        $request->validate([
            'password' => 'required|string',
        ]);

        // Verify password against borrower's NIP
        if (!$loan->borrower_nip) {
            return response()->json(['message' => 'NIP peminjam tidak ditemukan.'], 400);
        }

        $user = User::where('nip', $loan->borrower_nip)->first();
        if (!$user) {
            return response()->json(['message' => 'Akun SIPTU peminjam tidak ditemukan.'], 404);
        }

        if (!Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Password SIPTU salah.'], 401);
        }

        $loan->update([
            'status' => 'menunggu_paraf_kembali',
            'return_borrower_signed_at' => now(),
            'return_requested_at' => now(),
            'return_token' => $loan->return_token ?? (string) Str::uuid(),
        ]);

        $this->sendReturnRequestNotification($loan);

        return response()->json($this->buildPublicPayload($loan));
    }

    public function destroy(string $id)
    {
        $loan = ArchiveLoan::findOrFail($id);
        $loan->delete();

        return response()->json(['message' => 'Archive loan deleted']);
    }

    public function storePublic(Request $request, FonnteService $fonnteService)
    {
        $payload = $request->validate([
            'borrow_date' => ['required', 'date'],
            'borrower_name' => ['required', 'string', 'max:255'],
            'borrower_nip' => ['required', 'string', 'max:50'], // Wajib untuk TTE
            'borrower_work_unit' => ['nullable', 'string', 'max:255'],
            'archive_unit_id' => ['nullable', 'exists:archive_units,id'],
            'archive_number' => ['required', 'string', 'max:100'],
            'archive_format' => ['nullable', 'string', 'max:50'],
            'document_type' => ['nullable', 'string', 'max:100'],
            'purpose' => ['nullable', 'string'],
            'password' => ['required', 'string'],
        ]);

        // Verify password
        $user = User::where('nip', $payload['borrower_nip'])->first();
        if (!$user) {
            return response()->json(['message' => 'Akun SIPTU peminjam tidak ditemukan.'], 404);
        }

        if (!Hash::check($payload['password'], $user->password)) {
            return response()->json(['message' => 'Password SIPTU salah.'], 401);
        }

        $loan = ArchiveLoan::create([
            'request_number' => $this->buildRequestNumber(),
            'borrow_date' => $payload['borrow_date'],
            'borrower_name' => $payload['borrower_name'],
            'borrower_nip' => $payload['borrower_nip'],
            'borrower_work_unit' => $payload['borrower_work_unit'] ?? null,
            'archive_unit_id' => $payload['archive_unit_id'] ?? null,
            'archive_number' => $payload['archive_number'],
            'archive_format' => $payload['archive_format'] ?? null,
            'document_type' => $payload['document_type'] ?? null,
            'purpose' => $payload['purpose'] ?? null,
            'borrower_signed_at' => now(),
            'status' => 'menunggu_paraf',
            'public_token' => (string) Str::uuid(),
            'signature_token' => (string) Str::uuid(),
        ]);

        $loan->load('unitPengolah');

        $this->sendNotification($loan, $fonnteService);

        return response()->json($this->buildPublicPayload($loan), 201);
    }

    private function buildRequestNumber(): string
    {
        $datePart = now()->format('Ymd');
        $randomPart = Str::upper(Str::random(6));
        return "ARS-{$datePart}-{$randomPart}";
    }

    private function sendNotification(ArchiveLoan $loan, FonnteService $fonnteService): void
    {
        $setting = NotificationSetting::first();
        if (!$setting) {
            return;
        }

        $recipients = $setting->recipients ?? [];
        $targets = array_merge(
            $setting->default_admin_numbers ?? [],
            $recipients['kearsipan-peminjaman'] ?? []
        );

        $targets = array_values(array_unique(array_filter($targets)));
        if (empty($targets)) {
            return;
        }

        $unitPengolah = $loan->unitPengolah?->fungsi_bidang ?? '-';
        $baseUrl = rtrim(config('app.frontend_url'), '/');
        $detailLink = $baseUrl . '/kearsipan-peminjaman/' . $loan->public_token;

        $messageLines = [
            "[SIPTU] Pengajuan Peminjaman Arsip", 
            "No. Pengajuan: {$loan->request_number}",
            "Tanggal Pinjam: {$loan->borrow_date->translatedFormat('d F Y')}",
            "Nama Peminjam: {$loan->borrower_name}",
            "NIP: " . ($loan->borrower_nip ?: '-'),
            "Unit Kerja: " . ($loan->borrower_work_unit ?: '-'),
            "No Arsip: {$loan->archive_number}",
            "Format: " . ($loan->archive_format ?: '-'),
            "Jenis: " . ($loan->document_type ?: '-'),
            "Tujuan: " . ($loan->purpose ?: '-'),
            "Unit Pengolah: {$unitPengolah}",
            "Status: Menunggu tanda tangan", 
            "Waktu: " . now()->translatedFormat('d F Y H:i') . ' WITA',
            "Tautan Riwayat:",
            "{$detailLink}",
        ];

        $message = implode("\n", $messageLines);

        $fonnteService->send(
            $setting->fonnte_endpoint ?? 'https://api.fonnte.com/send',
            $setting->fonnte_token ?? '',
            $targets,
            $message
        );
    }

    private function sendBorrowerNotification(ArchiveLoan $loan, FonnteService $fonnteService): void
    {
        $setting = NotificationSetting::first();
        if (!$setting) {
            return;
        }

        $phone = null;
        if ($loan->borrower_nip) {
            $employee = Employee::where('nip', $loan->borrower_nip)->first();
            $phone = $employee?->phone_number;
        }
        $phone = $this->normalizePhone($phone);
        if (!$phone) {
            return;
        }

        $unitPengolah = $loan->unitPengolah?->fungsi_bidang ?? '-';
        $baseUrl = rtrim(config('app.frontend_url'), '/');
        $detailLink = $baseUrl . '/kearsipan-peminjaman/' . $loan->public_token;

        $messageLines = [
            "[SIPTU] Peminjaman Arsip Disetujui",
            "No. Pengajuan: {$loan->request_number}",
            "Tanggal Pinjam: {$loan->borrow_date->translatedFormat('d F Y')}",
            "Nama Peminjam: {$loan->borrower_name}",
            "No Arsip: {$loan->archive_number}",
            "Format: " . ($loan->archive_format ?: '-'),
            "Jenis: " . ($loan->document_type ?: '-'),
            "Status: Disetujui",
            "Waktu: " . now()->translatedFormat('d F Y H:i') . ' WITA',
            "Tautan Riwayat:",
            "{$detailLink}",
            "Pengembalian: lakukan tanda tangan pengembalian pada tautan di atas.",
        ];

        $message = implode("\n", $messageLines);

        $fonnteService->send(
            $setting->fonnte_endpoint ?? 'https://api.fonnte.com/send',
            $setting->fonnte_token ?? '',
            [$phone],
            $message
        );
    }

    private function sendReturnRequestNotification(ArchiveLoan $loan): void
    {
        $setting = NotificationSetting::first();
        if (!$setting) {
            return;
        }

        $recipients = $setting->recipients ?? [];
        $targets = array_merge(
            $setting->default_admin_numbers ?? [],
            $recipients['kearsipan-peminjaman'] ?? []
        );

        $targets = array_values(array_unique(array_filter($targets)));
        if (empty($targets)) {
            return;
        }

        $unitPengolah = $loan->unitPengolah?->fungsi_bidang ?? '-';
        $baseUrl = rtrim(config('app.frontend_url'), '/');
        $detailLink = $baseUrl . '/kearsipan-peminjaman/' . $loan->public_token;

        $messageLines = [
            "[SIPTU] Pengajuan Pengembalian Arsip",
            "No. Pengajuan: {$loan->request_number}",
            "Nama Peminjam: {$loan->borrower_name}",
            "NIP: " . ($loan->borrower_nip ?: '-'),
            "No Arsip: {$loan->archive_number}",
            "Unit Pengolah: {$unitPengolah}",
            "Status: Menunggu persetujuan pengembalian",
            "Waktu: " . now()->translatedFormat('d F Y H:i') . ' WITA',
            "Tautan Riwayat:",
            "{$detailLink}",
        ];

        $message = implode("\n", $messageLines);

        app(FonnteService::class)->send(
            $setting->fonnte_endpoint ?? 'https://api.fonnte.com/send',
            $setting->fonnte_token ?? '',
            $targets,
            $message
        );
    }

    public function downloadPdfPublic(string $token)
    {
        $loan = ArchiveLoan::with(['unitPengolah', 'approvedBy.employee', 'returnApprovedBy.employee'])
            ->where('public_token', $token)
            ->firstOrFail();

        $payload = $this->buildPublicPayload($loan);
        $loanData = $payload['loan'];
        $signatures = $loanData['signatures'];

        $logoBase64 = '';
        $logoPath = public_path('favicon.png');
        if (file_exists($logoPath)) {
            $logoBase64 = 'data:image/png;base64,' . base64_encode(file_get_contents($logoPath));
        }

        $options = new QROptions([
            'version'         => -1,
            'outputInterface' => QRMarkupSVG::class,
            'eccLevel'        => EccLevel::H,
            'addQuietzone'    => false,
            'outputBase64'    => true,
            'scale'           => 5,
            'svgAddXmlHeader' => false,
        ]);

        // Generate QR Codes for each signature
        foreach ($signatures as &$sig) {
            $sig['qr_code'] = null;
            if ($sig['is_tte']) {
                $verifyUrl = config('app.frontend_url') . '/verifikasi/' . $loan->signature_token;
                $sig['qr_code'] = (new QRCode($options))->render($verifyUrl);
            }
        }

        $html = '<!DOCTYPE html>
        <html>
        <head>
            <title>Bukti Peminjaman Arsip - ' . $loan->request_number . '</title>
            <style>
                @page { size: A4; margin: 1.5cm; }
                body { font-family: "Helvetica", "Arial", sans-serif; font-size: 11pt; line-height: 1.5; color: #333; }
                .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
                .header h2 { margin: 0; font-size: 16pt; text-transform: uppercase; }
                .header p { margin: 5px 0 0; font-size: 10pt; font-style: italic; }
                
                .title { text-align: center; margin-bottom: 30px; }
                .title h3 { margin: 0; text-decoration: underline; font-size: 14pt; }
                .title p { margin: 5px 0; font-weight: bold; }

                .info-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                .info-table td { padding: 6px 4px; vertical-align: top; border: 1px solid #eee; }
                .label { width: 35%; background-color: #f9f9f9; font-weight: bold; }
                
                .section-title { font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #333; margin-bottom: 10px; padding-bottom: 4px; font-size: 12pt; }
                
                .signature-section { width: 100%; margin-top: 50px; }
                .signature-box { width: 50%; text-align: center; vertical-align: top; }
                .qr-code { width: 80px; height: 80px; margin: 10px auto; }
                .sig-name { font-weight: bold; text-decoration: underline; display: block; margin-top: 5px; }
                .sig-title { font-size: 10pt; display: block; }
                .sig-meta { font-size: 8pt; color: #666; font-style: italic; }
                
                .footer { position: fixed; bottom: 0; width: 100%; text-align: center; font-size: 8pt; color: #aaa; border-top: 1px solid #eee; padding-top: 5px; }
                
                /* QR Code Logo Overlay */
                .qr-wrapper { 
                    position: relative; 
                    width: 100px; 
                    height: 100px; 
                    margin: 10px auto; 
                }
                .qr-code { width: 100px; height: 100px; display: block; }
                .qr-logo { 
                    position: absolute; 
                    top: 40px; 
                    left: 40px; 
                    width: 20px; 
                    height: 20px; 
                    background: white; 
                    padding: 1px;
                    border-radius: 2px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>BALAI POM DI PALOPO</h2>
                <p>Jl. Dr. Ratulangi (Depan TMP), Salobulo, Kota Palopo, Sulawesi Selatan</p>
            </div>

            <div class="title">
                <h3>BUKTI PEMINJAMAN ARSIP</h3>
                <p>Nomor: ' . $loan->request_number . '</p>
            </div>

            <div class="section-title">Informasi Peminjam</div>
            <table class="info-table">
                <tr><td class="label">Nama Peminjam</td><td>' . $loan->borrower_name . '</td></tr>
                <tr><td class="label">NIP</td><td>' . ($loan->borrower_nip ?: '-') . '</td></tr>
                <tr><td class="label">Unit Kerja / Fungsi</td><td>' . ($loan->borrower_work_unit ?: '-') . '</td></tr>
            </table>

            <div class="section-title">Detail Arsip</div>
            <table class="info-table">
                <tr><td class="label">Nomor Arsip / Berkas</td><td><strong>' . $loan->archive_number . '</strong></td></tr>
                <tr><td class="label">Unit Pengolah</td><td>' . ($loan->unitPengolah?->fungsi_bidang ?: '-') . '</td></tr>
                <tr><td class="label">Jenis Dokumen</td><td>' . ($loan->document_type ?: '-') . '</td></tr>
                <tr><td class="label">Format</td><td>' . ($loan->archive_format ?: '-') . '</td></tr>
                <tr><td class="label">Tujuan Peminjaman</td><td>' . ($loan->purpose ?: '-') . '</td></tr>
                <tr><td class="label">Tanggal Pinjam</td><td>' . $loan->borrow_date->format('d F Y') . '</td></tr>
                <tr><td class="label">Status Saat Ini</td><td>' . strtoupper(str_replace('_', ' ', $loan->status)) . '</td></tr>
            </table>

            <table class="signature-section">
                <tr>';

        // Filter signatures for borrowing stage
        $borrowSigs = array_filter($signatures, fn($s) => $s['type'] === 'borrowing');
        
        foreach ($borrowSigs as $sig) {
            $html .= '<td class="signature-box">
                        <p>' . ($sig['role'] === 'borrower' ? 'Peminjam,' : 'Validator / Petugas,') . '</p>';
            
            if ($sig['qr_code']) {
                $html .= '<div class="qr-wrapper">
                            <img src="' . $sig['qr_code'] . '" class="qr-code">';
                if ($logoBase64) {
                    $html .= '<img src="' . $logoBase64 . '" class="qr-logo">';
                }
                $html .= '</div>
                          <p class="sig-meta">Ditandatangani secara elektronik</p>
                          <p class="sig-meta">' . \Carbon\Carbon::parse($sig['created_at'])->format('d/m/Y H:i') . ' WITA</p>';
            } else {
                $html .= '<div style="height: 100px;"></div>';
            }

            $html .= '<span class="sig-name">' . $sig['signer_name'] . '</span>
                      <span class="sig-title">' . $sig['signer_title'] . '</span>
                    </td>';
        }

        $html .= '</tr>
            </table>';

        // Add return signatures if present
        $returnSigs = array_filter($signatures, fn($s) => $s['type'] === 'returning');
        if (!empty($returnSigs)) {
            $html .= '<div style="margin-top: 40px;" class="section-title">Validasi Pengembalian</div>
                <table class="signature-section">
                    <tr>';
            foreach ($returnSigs as $sig) {
                $html .= '<td class="signature-box">
                            <p>' . ($sig['role'] === 'borrower' ? 'Yang Mengembalikan,' : 'Penerima Kembali,') . '</p>';
                
                if ($sig['qr_code']) {
                    $html .= '<div class="qr-wrapper">
                                <img src="' . $sig['qr_code'] . '" class="qr-code">';
                    if ($logoBase64) {
                        $html .= '<img src="' . $logoBase64 . '" class="qr-logo">';
                    }
                    $html .= '</div>
                              <p class="sig-meta">Ditandatangani secara elektronik</p>
                              <p class="sig-meta">' . \Carbon\Carbon::parse($sig['created_at'])->format('d/m/Y H:i') . ' WITA</p>';
                } else {
                    $html .= '<div style="height: 100px;"></div>';
                }

                $html .= '<span class="sig-name">' . $sig['signer_name'] . '</span>
                          <span class="sig-title">' . $sig['signer_title'] . '</span>
                        </td>';
            }
            $html .= '</tr></table>';
        }

        $html .= '
            <div class="footer">
                Dicetak otomatis melalui SIPTU Ultra Kearsipan pada ' . now()->format('d/m/Y H:i:s') . ' WITA
            </div>
        </body>
        </html>';

        $pdf = Pdf::loadHTML($html)->setPaper('a4', 'portrait');
        return $pdf->download('Bukti-Pinjam-Arsip-' . $loan->request_number . '.pdf');
    }

    private function buildPublicPayload(ArchiveLoan $loan): array
    {
        $signatures = [];
        $ukSetting = ArchiveUnitSetting::first();
        $ukIds = $ukSetting?->unit_keasipan_employee_ids ?? [];
        
        // Helper to get title and name
        $getSignerInfo = function($userId, $role) use ($loan, $ukIds) {
            // Case 1: Borrower (might not have User record linked yet, but has name in loan)
            if ($role === 'borrower') {
                return [
                    'name' => $loan->borrower_name,
                    'title' => $loan->borrower_work_unit ?? 'Peminjam'
                ];
            }

            // Case 2: Admin/Validator
            if (!$userId) return ['name' => '-', 'title' => 'Validator'];
            
            $user = User::with('employee')->find($userId);
            $name = $user?->employee?->nama ?? $user?->name ?? '-';
            $empId = $user?->employee?->id;
            
            // Check Unit Kearsipan (UK)
            if ($empId && in_array($empId, $ukIds)) {
                return ['name' => $name, 'title' => 'Unit Kearsipan'];
            }
            
            // Check Unit Pengolah (UP)
            if ($empId && $loan->archive_unit_id) {
                $unit = ArchiveUnit::find($loan->archive_unit_id);
                $upIds = $unit?->unit_pengolah_employee_ids ?? [];
                if (in_array($empId, $upIds)) {
                    $unitName = str_ireplace('keasipan', 'kearsipan', $unit->fungsi_bidang);
                    return ['name' => $name, 'title' => "Unit Pengolah " . $unitName];
                }
            }
            
            return ['name' => $name, 'title' => 'Petugas Kearsipan'];
        };
        
        // Peminjaman - Peminjam
        if ($loan->borrower_signed_at || $loan->borrower_signature) {
            $info = $getSignerInfo(null, 'borrower');
            $signatures[] = [
                'type' => 'borrowing',
                'role' => 'borrower',
                'created_at' => ($loan->borrower_signed_at ?? $loan->created_at)?->toDateTimeString(),
                'is_tte' => (bool)$loan->borrower_signed_at,
                'signer_name' => $info['name'],
                'signer_title' => $info['title'],
            ];
        }
        
        // Peminjaman - Admin
        if ($loan->admin_signed_at || $loan->approved_at) {
            $info = $getSignerInfo($loan->approved_by, 'admin');
            $signatures[] = [
                'type' => 'borrowing',
                'role' => 'admin',
                'created_at' => ($loan->admin_signed_at ?? $loan->approved_at)?->toDateTimeString(),
                'is_tte' => (bool)$loan->admin_signed_at,
                'signer_name' => $info['name'],
                'signer_title' => $info['title'],
            ];
        }
        
        // Pengembalian - Peminjam
        if ($loan->return_borrower_signed_at || $loan->return_signature) {
            $info = $getSignerInfo(null, 'borrower');
            $signatures[] = [
                'type' => 'returning',
                'role' => 'borrower',
                'created_at' => ($loan->return_borrower_signed_at ?? $loan->return_requested_at)?->toDateTimeString(),
                'is_tte' => (bool)$loan->return_borrower_signed_at,
                'signer_name' => $info['name'],
                'signer_title' => $info['title'],
            ];
        }
        
        // Pengembalian - Admin
        if ($loan->return_admin_signed_at || $loan->return_date) {
            $info = $getSignerInfo($loan->return_approved_by, 'admin');
            $signatures[] = [
                'type' => 'returning',
                'role' => 'admin',
                'created_at' => ($loan->return_admin_signed_at ?? $loan->return_date)?->toDateTimeString(),
                'is_tte' => (bool)$loan->return_admin_signed_at,
                'signer_name' => $info['name'],
                'signer_title' => $info['title'],
            ];
        }

        return [
            'loan' => [
                'id' => $loan->id,
                'request_number' => $loan->request_number,
                'borrow_date' => $loan->borrow_date?->format('Y-m-d'),
                'borrower_name' => $loan->borrower_name,
                'borrower_nip' => $loan->borrower_nip,
                'borrower_work_unit' => $loan->borrower_work_unit,
                'archive_number' => $loan->archive_number,
                'archive_format' => $loan->archive_format,
                'document_type' => $loan->document_type,
                'purpose' => $loan->purpose,
                'status' => $loan->status,
                'public_token' => $loan->public_token,
                'signature_token' => $loan->signature_token,
                'return_token' => $loan->return_token,
                'return_date' => $loan->return_date?->format('Y-m-d'),
                'approved_at' => $loan->approved_at?->toDateTimeString(),
                'return_requested_at' => $loan->return_requested_at?->toDateTimeString(),
                'unit_pengolah' => $loan->unitPengolah ? [
                    'id' => $loan->unitPengolah->id,
                    'fungsi_bidang' => $loan->unitPengolah->fungsi_bidang,
                ] : null,
                'signatures' => $signatures,
            ],
            'actions' => [
                'can_request_return' => $loan->status === 'dipinjam' || $loan->status === 'menunggu_paraf_kembali',
                'has_return_signature' => (bool)($loan->return_borrower_signed_at || $loan->return_signature),
            ],
        ];
    }

    private function normalizePhone(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $clean = preg_replace('/[^0-9+]/', '', $value);
        if ($clean === '' || $clean === null) {
            return null;
        }
        if (str_starts_with($clean, '0')) {
            $clean = '+62' . substr($clean, 1);
        } elseif (str_starts_with($clean, '62')) {
            $clean = '+' . $clean;
        }
        if (!str_starts_with($clean, '+')) {
            $clean = '+' . $clean;
        }
        return $clean;
    }

    public function reportExcel(Request $request)
    {
        $loans = $this->getReportQuery($request)->get();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        
        // Header
        $sheet->setCellValue('A1', 'No');
        $sheet->setCellValue('B1', 'Tanggal Pinjam');
        $sheet->setCellValue('C1', 'No Arsip');
        $sheet->setCellValue('D1', 'Peminjam');
        $sheet->setCellValue('E1', 'Unit Kerja');
        $sheet->setCellValue('F1', 'Unit Pengolah');
        $sheet->setCellValue('G1', 'Status');
        $sheet->setCellValue('H1', 'Tanggal Kembali');

        $row = 2;
        foreach ($loans as $index => $loan) {
            $sheet->setCellValue('A' . $row, $index + 1);
            $sheet->setCellValue('B' . $row, $loan->borrow_date?->format('Y-m-d'));
            $sheet->setCellValue('C' . $row, $loan->archive_number);
            $sheet->setCellValue('D' . $row, $loan->borrower_name);
            $sheet->setCellValue('E' . $row, $loan->borrower_work_unit);
            $sheet->setCellValue('F' . $row, $loan->unitPengolah?->fungsi_bidang);
            $sheet->setCellValue('G' . $row, $loan->status);
            $sheet->setCellValue('H' . $row, $loan->return_date?->format('Y-m-d'));
            $row++;
        }

        foreach(range('A','H') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $writer = new Xlsx($spreadsheet);
        $fileName = 'laporan-peminjaman-' . now()->format('YmdHis') . '.xlsx';
        
        if (ob_get_contents()) ob_end_clean(); // Clear any previous output
        
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment; filename="'. urlencode($fileName) .'"');
        $writer->save('php://output');
        exit;
    }

    public function reportPdf(Request $request)
    {
        $loans = $this->getReportQuery($request)->get();
        $currentDate = now()->translatedFormat('d F Y');
        
        $user = Auth::user();
        $userName = $user?->employee?->nama ?? $user?->name ?? '............................................';
        $userTitle = 'Petugas Kearsipan';

        // Determine title based on UP/UK settings
        $ukSetting = ArchiveUnitSetting::first();
        $ukIds = $ukSetting?->unit_keasipan_employee_ids ?? [];
        $empId = $user?->employee?->id;

        if ($empId && in_array($empId, $ukIds)) {
            $userTitle = 'Unit Kearsipan';
        } else {
            // Check if user belongs to any UP (using the first loan's unit as reference if applicable, 
            // but better check all units or just generic UP title)
            $userTitle = 'Unit Pengolah';
            if ($empId) {
                $myUnit = \App\Models\ArchiveUnit::whereJsonContains('unit_pengolah_employee_ids', (int)$empId)->first();
                if ($myUnit) {
                    $unitName = str_ireplace('keasipan', 'kearsipan', $myUnit->fungsi_bidang);
                    $userTitle = 'Unit Pengolah ' . $unitName;
                }
            }
        }
        
        $from = $request->input('from');
        $to = $request->input('to');
        $periode = ($from ? \Carbon\Carbon::parse($from)->format('d/m/Y') : 'Awal') . ' s/d ' . ($to ? \Carbon\Carbon::parse($to)->format('d/m/Y') : 'Sekarang');

        $html = '
        <!DOCTYPE html>
        <html>
        <head>
            <title>Laporan Peminjaman Arsip</title>
            <style>
                @page { size: A4 landscape; margin: 1.2cm; }
                body { font-family: "Helvetica", "Arial", sans-serif; font-size: 9pt; line-height: 1.4; color: #333; }
                .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 15px; }
                .header h2 { margin: 0; font-size: 15pt; text-transform: uppercase; }
                .header p { margin: 4px 0 0; font-size: 8pt; font-style: italic; }
                
                .content-title { text-align: center; margin: 15px 0; font-weight: bold; text-transform: uppercase; font-size: 11pt; text-decoration: underline; }
                
                .meta-info { margin-bottom: 10px; font-size: 9pt; }
                
                table { width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: fixed; }
                th, td { border: 1px solid #333; padding: 5px 3px; text-align: left; vertical-align: top; word-wrap: break-word; }
                th { background-color: #f2f2f2; text-align: center; font-weight: bold; text-transform: uppercase; font-size: 8pt; }
                
                .text-center { text-align: center; }
                .footer { position: fixed; bottom: 0; width: 100%; text-align: center; font-size: 7pt; color: #999; border-top: 1px solid #eee; padding-top: 4px; }
                
                .signature-section { margin-top: 25px; width: 100%; }
                .sig-box { width: 35%; text-align: center; float: right; }
                .sig-name { font-weight: bold; text-decoration: underline; display: block; margin-top: 45px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>BALAI POM DI PALOPO</h2>
                <p>Jl. Dr. Ratulangi (Depan TMP), Salobulo, Kota Palopo, Sulawesi Selatan</p>
            </div>

            <div class="content-title">
                LAPORAN REKAPITULASI PEMINJAMAN ARSIP
            </div>

            <div class="meta-info">
                <strong>Periode:</strong> ' . $periode . '<br>
                <strong>Total Data:</strong> ' . $loans->count() . ' Berkas
            </div>

            <table>
                <thead>
                    <tr>
                        <th width="25px">No</th>
                        <th width="70px">Tanggal</th>
                        <th width="100px">No. Arsip</th>
                        <th width="120px">Peminjam</th>
                        <th width="110px">Unit Pengolah</th>
                        <th width="70px">Format</th>
                        <th>Tujuan / Keperluan</th>
                        <th width="80px">Status</th>
                    </tr>
                </thead>
                <tbody>';
        
        if ($loans->isEmpty()) {
            $html .= '<tr><td colspan="8" class="text-center">Tidak ada data peminjaman untuk periode ini.</td></tr>';
        } else {
            foreach ($loans as $index => $loan) {
                $statusLabel = match($loan->status) {
                    'dipinjam' => 'Dipinjam',
                    'dikembalikan' => 'Selesai',
                    'menunggu_paraf' => 'Menunggu TTD',
                    'menunggu_paraf_kembali' => 'Validasi Kembali',
                    default => strtoupper(str_replace('_', ' ', $loan->status))
                };

                $html .= '<tr>
                    <td class="text-center">' . ($index + 1) . '</td>
                    <td class="text-center">' . ($loan->borrow_date ? $loan->borrow_date->format('d/m/Y') : '-') . '</td>
                    <td>' . $loan->archive_number . '</td>
                    <td>
                        <strong>' . $loan->borrower_name . '</strong><br>
                        <small>' . ($loan->borrower_nip ?: '') . '</small>
                    </td>
                    <td>' . ($loan->unitPengolah?->fungsi_bidang ?: '-') . '</td>
                    <td class="text-center">' . ($loan->archive_format ?: '-') . '</td>
                    <td>' . ($loan->purpose ?: '-') . '</td>
                    <td class="text-center">' . $statusLabel . '</td>
                </tr>';
            }
        }

        $html .= '</tbody></table>

            <div class="signature-section">
                <div class="sig-box">
                    <p>Palopo, ' . $currentDate . '<br>' . $userTitle . ',</p>
                    <span class="sig-name">' . $userName . '</span>
                    <span>' . ($user?->employee?->nip ? 'NIP. ' . $user->employee->nip : '') . '</span>
                </div>
                <div style="clear: both;"></div>
            </div>

            <div class="footer">
                Dicetak otomatis melalui SIPTU Ultra Kearsipan pada ' . now()->format('d/m/Y H:i:s') . ' WITA
            </div>
        </body>
        </html>';

        $pdf = Pdf::loadHTML($html)->setPaper('a4', 'landscape');
        return $pdf->download('Laporan-Peminjaman-Arsip-' . now()->format('Ymd') . '.pdf');
    }

    private function getReportQuery(Request $request) {
        $query = ArchiveLoan::with('unitPengolah')->orderByDesc('borrow_date');

        if ($request->filled('from') && $request->filled('to')) {
            $query->whereBetween('borrow_date', [$request->input('from'), $request->input('to')]);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($request->filled('unit_id')) {
            $query->where('archive_unit_id', $request->input('unit_id'));
        }
        if ($request->filled('borrower_name')) {
            $query->where('borrower_name', $request->input('borrower_name'));
        }
        return $query;
    }
}
