<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\BmnLoan;
use App\Models\Employee;
use App\Models\NotificationSetting;
use App\Services\FonnteService;
use App\Services\PushNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;
use chillerlan\QRCode\Common\EccLevel;
use chillerlan\QRCode\Output\QRMarkupSVG;
use Barryvdh\DomPDF\Facade\Pdf;

class BmnLoanController extends Controller
{
    private const MODULE_KEY = 'bmn-peminjaman-aset';

    public function listAssetsPublic()
    {
        $assets = Asset::query()
            ->select(['id', 'name', 'brand', 'model', 'asset_code', 'status'])
            ->orderBy('name')
            ->get();

        return response()->json($assets);
    }

    public function listEmployeesPublic()
    {
        $employees = Employee::query()
            ->select(['id', 'nip', 'name', 'function_area', 'phone_number', 'pangkat'])
            ->orderBy('name')
            ->get();

        return response()->json($employees);
    }

    public function schedulePublic()
    {
        $loans = BmnLoan::query()
            ->whereIn('status', ['pengajuan', 'dipinjam'])
            ->get(['id', 'loan_date', 'return_date', 'status', 'assets']);

        return response()->json($loans);
    }

    public function myLoans(Request $request)
    {
        $user = $request->user();
        $nipParam = $request->query('nip');
        
        $nip = $user ? ($user->nip ?? $user->username) : $nipParam;
        $userName = $user ? $user->name : null;

        if (!$nip && !$userName) {
            return response()->json([]);
        }

        $employee = null;
        if ($user) {
            $employee = Employee::where('user_id', $user->id)
                ->orWhere('nip', $nip)
                ->first();
        } else if ($nip) {
            $employee = Employee::where('nip', $nip)->first();
        }

        $query = BmnLoan::query();
        $query->where(function($q) use ($nip, $userName, $employee) {
            if ($nip) {
                $q->where('borrower_nip', $nip);
            }
            if ($userName) {
                $q->orWhere('borrower_name', $userName);
            }
            if ($employee) {
                $q->orWhere('borrower_id', $employee->id);
            }
        });

        $loans = $query->orderBy('created_at', 'desc')->get();
        return response()->json($loans);
    }

    public function showPublic($token)
    {
        $loan = BmnLoan::where('token', $token)->firstOrFail();
        return response()->json($loan);
    }

    public function returnRequestPublic($token)
    {
        $loan = BmnLoan::where('token', $token)->firstOrFail();

        if ($loan->status !== 'dipinjam') {
            return response()->json(['message' => 'Status peminjaman tidak valid untuk pengembalian.'], 400);
        }

        $loan->update(['status' => 'pengajuan-pengembalian']);

        $this->notifyAdminsReturnRequest($loan);

        return response()->json(['message' => 'Pengajuan pengembalian berhasil dikirim.']);
    }

    public function storePublic(Request $request)
    {
        $payload = $request->validate([
            'nip' => ['required', 'string'],
            'nama' => ['required', 'string'],
            'fungsi_bidang' => ['nullable', 'string'],
            'loan_date' => ['required', 'date'],
            'return_date' => ['required', 'date', 'after_or_equal:loan_date'],
            'location' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'password' => ['required', 'string'],
            'assets' => ['required', 'array', 'min:1'],
            'assets.*.asset_id' => ['required', 'integer', 'exists:assets,id'],
            'assets.*.nama_barang' => ['nullable', 'string'],
            'assets.*.merek_barang' => ['nullable', 'string'],
            'assets.*.nup' => ['nullable', 'string'],
            'assets.*.kode_bmn' => ['nullable', 'string'],
        ]);

        // Verify SIPTU Password & MFA
        $user = $request->user() ?? User::where('nip', $payload['nip'])->orWhere('email', $payload['nip'])->first();
        if (!$user) {
            return response()->json(['message' => 'Akun SIPTU dengan NIP/Email tersebut tidak ditemukan.'], 404);
        }
        if (!Hash::check($payload['password'], $user->password)) {
            return response()->json(['message' => 'Password SIPTU salah.'], 401);
        }
        if ($user->has_mfa && !app(\App\Services\TotpService::class)->verifyCodeOrRecovery($user, (string)$request->input('totp_code', ''))) {
            return response()->json(['message' => 'Kode autentikasi MFA salah atau kadaluarsa.'], 422);
        }

        $requestedAssetIds = collect($payload['assets'])->pluck('asset_id')->all();
        $this->validateConflicts($requestedAssetIds, $payload['loan_date'], $payload['return_date']);

        $employee = Employee::where('nip', $payload['nip'])->first();
        $borrowerPhone = $this->normalizePhone($employee?->phone_number ?? $user->phone_number);
        $spaNumber = $this->generateSpaNumber();
        $token = Str::uuid()->toString();

        $loan = BmnLoan::create([
            'token' => $token,
            'spa_number' => $spaNumber,
            'borrower_id' => $employee?->id,
            'borrower_nip' => $payload['nip'],
            'borrower_name' => $payload['nama'],
            'borrower_function' => $payload['fungsi_bidang'] ?? $employee?->function_area,
            'borrower_phone' => $borrowerPhone,
            'loan_date' => $payload['loan_date'],
            'return_date' => $payload['return_date'],
            'location' => $payload['location'] ?? null,
            'notes' => $payload['notes'] ?? null,
            'status' => 'pengajuan',
            'requester_signature' => null,
            'requester_signature_token' => (string) Str::uuid(),
            'requester_signed_at' => now(),
            'assets' => $payload['assets'],
        ]);

        $this->notifyAdmins($loan);
        $this->notifyBorrowerSubmitted($loan);

        return response()->json($loan, 201);
    }

    public function index()
    {
        $query = BmnLoan::with(['approver:id,name']);

        if (request()->filled('status')) {
            $query->where('status', request()->get('status'));
        }

        if (request()->filled('from') && request()->filled('to')) {
            $query->where('loan_date', '>=', request()->get('from'))
                ->where('loan_date', '<=', request()->get('to'));
        }

        if (request()->filled('search')) {
            $term = request()->get('search');
            $query->where(function ($q) use ($term) {
                $q->where('spa_number', 'like', "%{$term}%")
                    ->orWhere('borrower_name', 'like', "%{$term}%")
                    ->orWhere('borrower_nip', 'like', "%{$term}%");
            });
        }

        $loans = $query->orderByDesc('created_at')->get();

        return response()->json($loans);
    }

    public function show($id)
    {
        $loan = BmnLoan::with(['approver:id,name'])->findOrFail($id);
        return response()->json($loan);
    }

    public function resendNotifications(string $id)
    {
        $loan = BmnLoan::findOrFail($id);

        $this->notifyAdmins($loan);
        $this->notifyBorrowerSubmitted($loan);

        return response()->json(['message' => 'Notifikasi peminjaman BMN dikirim ulang.']);
    }

    public function getLoansByAsset($assetId)
    {
        // JSON column 'assets' stores array of asset objects with asset_id
        $loans = BmnLoan::whereJsonContains('assets', [['asset_id' => (int)$assetId]])
            ->orderByDesc('loan_date')
            ->get();

        return response()->json($loans);
    }

    public function getLoansByEmployee($employeeId)
    {
        $loans = BmnLoan::where('borrower_id', $employeeId)
            ->orderByDesc('loan_date')
            ->get();

        return response()->json($loans);
    }

    public function exportLoansByAssetPdf($assetId)
    {
        $asset = Asset::findOrFail($assetId);
        $loans = BmnLoan::whereJsonContains('assets', [['asset_id' => (int)$assetId]])
            ->orderByDesc('loan_date')
            ->get();

        $currentDate = now()->translatedFormat('d F Y');

        $html = '
        <!DOCTYPE html>
        <html>
        <head>
            <title>Laporan Peminjaman Aset</title>
            <style>
                @page { size: A4; margin: 2cm; }
                body { font-family: "Times New Roman", serif; font-size: 12pt; line-height: 1.3; }
                .header { text-align: center; margin-bottom: 20px; border-bottom: 3px double #000; padding-bottom: 10px; }
                .header h3 { margin: 0; font-size: 14pt; text-transform: uppercase; }
                .header h2 { margin: 5px 0; font-size: 16pt; text-transform: uppercase; font-weight: bold; }
                .header p { margin: 0; font-size: 11pt; font-style: italic; }
                
                .content-title { text-align: center; margin: 20px 0; text-decoration: underline; font-weight: bold; text-transform: uppercase; }
                
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #000; padding: 6px 8px; text-align: left; vertical-align: top; font-size: 11pt; }
                th { background-color: #e0e0e0; text-align: center; font-weight: bold; }
                
                .signature-section { margin-top: 50px; width: 100%; display: table; }
                .signature-box { display: table-cell; width: 50%; text-align: center; vertical-align: top; }
                .signature-space { height: 70px; }
                
                .asset-info { margin-bottom: 20px; padding: 10px; background: #f5f5f5; border: 1px solid #ddd; }
            </style>
        </head>
        <body>
            <div class="header">
                <h3>BALAI POM DI PALOPO</h3>
                <p>Alamat: Jl. Dr Ratulangi, Depan Taman Makam Kota Palopo, Salobulo, Palopo, Sulawesi Selatan</p>
            </div>

            <div class="content-title">
                Laporan Riwayat Peminjaman Aset
            </div>

            <div class="asset-info">
                <strong>Nama Barang:</strong> ' . ($asset->name ?? '-') . '<br>
                <strong>Merek:</strong> ' . ($asset->brand ?? '-') . '<br>
                <strong>NUP:</strong> ' . ($asset->model ?? '-') . '<br>
                <strong>Kode BMN:</strong> ' . ($asset->asset_code ?? '-') . '<br>
                <strong>Total Peminjaman:</strong> ' . $loans->count() . ' kali
            </div>

            <table>
                <thead>
                    <tr>
                        <th width="5%">No</th>
                        <th width="15%">Tgl Pinjam</th>
                        <th width="15%">Tgl Kembali</th>
                        <th width="30%">Peminjam</th>
                        <th width="15%">Status</th>
                    </tr>
                </thead>
                <tbody>';

        if ($loans->isEmpty()) {
            $html .= '<tr><td colspan="5" style="text-align:center;">Tidak ada data peminjaman untuk aset ini.</td></tr>';
        } else {
            foreach ($loans as $index => $loan) {
                $statusLabel = match ($loan->status) {
                    'dipinjam' => 'Dipinjam',
                    'dikembalikan' => 'Dikembalikan',
                    'pengajuan' => 'Pengajuan',
                    'pengajuan-pengembalian' => 'Pengajuan Pengembalian',
                    default => $loan->status
                };

                $html .= '<tr>
                    <td style="text-align:center;">' . ($index + 1) . '</td>
                    <td>' . ($loan->loan_date ? date('d/m/Y', strtotime($loan->loan_date)) : '-') . '</td>
                    <td>' . ($loan->return_date ? date('d/m/Y', strtotime($loan->return_date)) : '-') . '</td>
                    <td>
                        <strong>' . ($loan->borrower_name ?? '-') . '</strong><br>
                        <span style="font-size: 10pt;">NIP: ' . ($loan->borrower_nip ?? '-') . '</span>
                    </td>
                    <td style="text-align:center;">' . $statusLabel . '</td>
                </tr>';
            }
        }

        $html .= '</tbody></table>

            <div class="signature-section">
                <div class="signature-box">
                    <br>Mengetahui,<br>Penanggung Jawab BMN<br>
                    <div class="signature-space"></div>
                    <strong><u>( .................................... )</u></strong><br>
                    NIP. ..............................
                </div>
                <div class="signature-box">
                    Palopo, ' . $currentDate . '<br>Petugas BMN<br>
                    <div class="signature-space"></div>
                    <strong><u>( .................................... )</u></strong><br>
                    NIP. ..............................
                </div>
            </div>
        </body>
        </html>';

        $pdf = Pdf::loadHTML($html)->setPaper('a4', 'portrait');
        return $pdf->download('laporan-aset-' . ($asset->asset_code ?? $assetId) . '-' . now()->format('YmdHis') . '.pdf');
    }

    public function exportLoansByAssetExcel($assetId)
    {
        $asset = Asset::findOrFail($assetId);
        $loans = BmnLoan::whereJsonContains('assets', [['asset_id' => (int)$assetId]])
            ->orderByDesc('loan_date')
            ->get();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Header
        $sheet->setCellValue('A1', 'LAPORAN RIWAYAT PEMINJAMAN ASET');
        $sheet->mergeCells('A1:E1');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
        $sheet->getStyle('A1')->getAlignment()->setHorizontal('center');

        // Asset Info
        $sheet->setCellValue('A3', 'Nama Barang:');
        $sheet->setCellValue('B3', $asset->name ?? '-');
        $sheet->setCellValue('A4', 'Merek:');
        $sheet->setCellValue('B4', $asset->brand ?? '-');
        $sheet->setCellValue('A5', 'NUP:');
        $sheet->setCellValue('B5', $asset->model ?? '-');
        $sheet->setCellValue('A6', 'Kode BMN:');
        $sheet->setCellValue('B6', $asset->asset_code ?? '-');

        // Table Header
        $sheet->setCellValue('A8', 'No');
        $sheet->setCellValue('B8', 'Tgl Pinjam');
        $sheet->setCellValue('C8', 'Tgl Kembali');
        $sheet->setCellValue('D8', 'Peminjam');
        $sheet->setCellValue('E8', 'NIP');
        $sheet->setCellValue('F8', 'Status');

        $sheet->getStyle('A8:F8')->getFont()->setBold(true);
        $sheet->getStyle('A8:F8')->getFill()->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)->getStartColor()->setRGB('E0E0E0');

        $row = 9;
        foreach ($loans as $index => $loan) {
            $statusLabel = match ($loan->status) {
                'dipinjam' => 'Dipinjam',
                'dikembalikan' => 'Dikembalikan',
                'pengajuan' => 'Pengajuan',
                'pengajuan-pengembalian' => 'Pengajuan Pengembalian',
                default => $loan->status
            };

            $sheet->setCellValue('A' . $row, $index + 1);
            $sheet->setCellValue('B' . $row, $loan->loan_date ? date('Y-m-d', strtotime($loan->loan_date)) : '-');
            $sheet->setCellValue('C' . $row, $loan->return_date ? date('Y-m-d', strtotime($loan->return_date)) : '-');
            $sheet->setCellValue('D' . $row, $loan->borrower_name ?? '-');
            $sheet->setCellValue('E' . $row, $loan->borrower_nip ?? '-');
            $sheet->setCellValue('F' . $row, $statusLabel);
            $row++;
        }

        foreach (range('A', 'F') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $writer = new Xlsx($spreadsheet);
        $fileName = 'laporan-aset-' . ($asset->asset_code ?? $assetId) . '-' . now()->format('YmdHis') . '.xlsx';

        if (ob_get_contents()) ob_end_clean();

        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment; filename="' . urlencode($fileName) . '"');
        $writer->save('php://output');
        exit;
    }

    public function exportLoansByDatePdf(Request $request)
    {
        $from = $request->input('from');
        $to = $request->input('to');

        $query = BmnLoan::query();
        if ($from && $to) {
            $query->whereBetween('loan_date', [$from, $to]);
        }
        $loans = $query->orderByDesc('loan_date')->get();

        $currentDate = now()->translatedFormat('d F Y');

        $html = '
        <!DOCTYPE html>
        <html>
        <head>
            <title>Laporan Peminjaman Aset</title>
            <style>
                @page { size: A4; margin: 2cm; }
                body { font-family: "Times New Roman", serif; font-size: 12pt; line-height: 1.3; }
                .header { text-align: center; margin-bottom: 20px; border-bottom: 3px double #000; padding-bottom: 10px; }
                .header h3 { margin: 0; font-size: 14pt; text-transform: uppercase; }
                .header h2 { margin: 5px 0; font-size: 16pt; text-transform: uppercase; font-weight: bold; }
                .header p { margin: 0; font-size: 11pt; font-style: italic; }
                
                .content-title { text-align: center; margin: 20px 0; text-decoration: underline; font-weight: bold; text-transform: uppercase; }
                
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #000; padding: 6px 8px; text-align: left; vertical-align: top; font-size: 11pt; }
                th { background-color: #e0e0e0; text-align: center; font-weight: bold; }
                
                .signature-section { margin-top: 50px; width: 100%; display: table; }
                .signature-box { display: table-cell; width: 50%; text-align: center; vertical-align: top; }
                .signature-space { height: 70px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h3>BALAI POM DI PALOPO</h3>
                <p>Alamat: Jl. Dr Ratulangi, Depan Taman Makam Kota Palopo, Salobulo, Palopo, Sulawesi Selatan</p>
            </div>

            <div class="content-title">
                Laporan Peminjaman Aset per Tanggal
            </div>

            <div style="margin-bottom: 10px;">
                <strong>Periode:</strong> ' . ($from ? date('d/m/Y', strtotime($from)) : 'Awal') . ' s/d ' . ($to ? date('d/m/Y', strtotime($to)) : 'Sekarang') . '<br>
                <strong>Total Data:</strong> ' . $loans->count() . ' peminjaman
            </div>

            <table>
                <thead>
                    <tr>
                        <th width="5%">No</th>
                        <th width="12%">Tgl Pinjam</th>
                        <th width="12%">Tgl Kembali</th>
                        <th width="25%">Peminjam</th>
                        <th width="25%">Aset</th>
                        <th width="10%">Status</th>
                    </tr>
                </thead>
                <tbody>';

        if ($loans->isEmpty()) {
            $html .= '<tr><td colspan="6" style="text-align:center;">Tidak ada data peminjaman untuk periode ini.</td></tr>';
        } else {
            foreach ($loans as $index => $loan) {
                $statusLabel = match ($loan->status) {
                    'dipinjam' => 'Dipinjam',
                    'dikembalikan' => 'Dikembalikan',
                    'pengajuan' => 'Pengajuan',
                    'pengajuan-pengembalian' => 'Pengajuan Pengembalian',
                    default => $loan->status
                };

                $assetsList = collect($loan->assets ?? [])
                    ->map(fn($a) => ($a['nama_barang'] ?? $a['name'] ?? '-'))
                    ->implode(', ');

                $html .= '<tr>
                    <td style="text-align:center;">' . ($index + 1) . '</td>
                    <td>' . ($loan->loan_date ? date('d/m/Y', strtotime($loan->loan_date)) : '-') . '</td>
                    <td>' . ($loan->return_date ? date('d/m/Y', strtotime($loan->return_date)) : '-') . '</td>
                    <td>
                        <strong>' . ($loan->borrower_name ?? '-') . '</strong><br>
                        <span style="font-size: 10pt;">NIP: ' . ($loan->borrower_nip ?? '-') . '</span>
                    </td>
                    <td>' . $assetsList . '</td>
                    <td style="text-align:center;">' . $statusLabel . '</td>
                </tr>';
            }
        }

        $html .= '</tbody></table>

            <div class="signature-section">
                <div class="signature-box">
                    <br>Mengetahui,<br>Penanggung Jawab BMN<br>
                    <div class="signature-space"></div>
                    <strong><u>( .................................... )</u></strong><br>
                    NIP. ..............................
                </div>
                <div class="signature-box">
                    Palopo, ' . $currentDate . '<br>Petugas BMN<br>
                    <div class="signature-space"></div>
                    <strong><u>( .................................... )</u></strong><br>
                    NIP. ..............................
                </div>
            </div>
        </body>
        </html>';

        $pdf = Pdf::loadHTML($html)->setPaper('a4', 'portrait');
        return $pdf->download('laporan-periode-' . ($from ?? 'all') . '-' . ($to ?? 'all') . '-' . now()->format('YmdHis') . '.pdf');
    }

    public function exportLoansByDateExcel(Request $request)
    {
        $from = $request->input('from');
        $to = $request->input('to');

        $query = BmnLoan::query();
        if ($from && $to) {
            $query->whereBetween('loan_date', [$from, $to]);
        }
        $loans = $query->orderByDesc('loan_date')->get();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Header
        $sheet->setCellValue('A1', 'LAPORAN PEMINJAMAN ASET PER TANGGAL');
        $sheet->mergeCells('A1:G1');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
        $sheet->getStyle('A1')->getAlignment()->setHorizontal('center');

        // Period Info
        $sheet->setCellValue('A3', 'Periode:');
        $sheet->setCellValue('B3', ($from ? date('d/m/Y', strtotime($from)) : 'Awal') . ' s/d ' . ($to ? date('d/m/Y', strtotime($to)) : 'Sekarang'));
        $sheet->setCellValue('A4', 'Total Data:');
        $sheet->setCellValue('B4', $loans->count() . ' peminjaman');

        // Table Header
        $sheet->setCellValue('A6', 'No');
        $sheet->setCellValue('B6', 'No SPA');
        $sheet->setCellValue('C6', 'Tgl Pinjam');
        $sheet->setCellValue('D6', 'Tgl Kembali');
        $sheet->setCellValue('E6', 'Peminjam');
        $sheet->setCellValue('F6', 'NIP');
        $sheet->setCellValue('G6', 'Status');

        $sheet->getStyle('A6:G6')->getFont()->setBold(true);
        $sheet->getStyle('A6:G6')->getFill()->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)->getStartColor()->setRGB('E0E0E0');

        $row = 7;
        foreach ($loans as $index => $loan) {
            $statusLabel = match ($loan->status) {
                'dipinjam' => 'Dipinjam',
                'dikembalikan' => 'Dikembalikan',
                'pengajuan' => 'Pengajuan',
                'pengajuan-pengembalian' => 'Pengajuan Pengembalian',
                default => $loan->status
            };

            $sheet->setCellValue('A' . $row, $index + 1);
            $sheet->setCellValue('B' . $row, $loan->spa_number ?? '-');
            $sheet->setCellValue('C' . $row, $loan->loan_date ? date('Y-m-d', strtotime($loan->loan_date)) : '-');
            $sheet->setCellValue('D' . $row, $loan->return_date ? date('Y-m-d', strtotime($loan->return_date)) : '-');
            $sheet->setCellValue('E' . $row, $loan->borrower_name ?? '-');
            $sheet->setCellValue('F' . $row, $loan->borrower_nip ?? '-');
            $sheet->setCellValue('G' . $row, $statusLabel);
            $row++;
        }

        foreach (range('A', 'G') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $writer = new Xlsx($spreadsheet);
        $fileName = 'laporan-periode-' . ($from ?? 'all') . '-' . ($to ?? 'all') . '-' . now()->format('YmdHis') . '.xlsx';

        if (ob_get_contents()) ob_end_clean();

        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment; filename="' . urlencode($fileName) . '"');
        $writer->save('php://output');
        exit;
    }

    public function exportLoansByEmployeePdf($employeeId)
    {
        $employee = Employee::findOrFail($employeeId);
        $loans = BmnLoan::where('borrower_id', $employeeId)
            ->orderByDesc('loan_date')
            ->get();

        $currentDate = now()->translatedFormat('d F Y');

        $html = '
        <!DOCTYPE html>
        <html>
        <head>
            <title>Laporan Peminjaman Aset</title>
            <style>
                @page { size: A4; margin: 2cm; }
                body { font-family: "Times New Roman", serif; font-size: 12pt; line-height: 1.3; }
                .header { text-align: center; margin-bottom: 20px; border-bottom: 3px double #000; padding-bottom: 10px; }
                .header h3 { margin: 0; font-size: 14pt; text-transform: uppercase; }
                .header h2 { margin: 5px 0; font-size: 16pt; text-transform: uppercase; font-weight: bold; }
                .header p { margin: 0; font-size: 11pt; font-style: italic; }
                
                .content-title { text-align: center; margin: 20px 0; text-decoration: underline; font-weight: bold; text-transform: uppercase; }
                
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #000; padding: 6px 8px; text-align: left; vertical-align: top; font-size: 11pt; }
                th { background-color: #e0e0e0; text-align: center; font-weight: bold; }
                
                .signature-section { margin-top: 50px; width: 100%; display: table; }
                .signature-box { display: table-cell; width: 50%; text-align: center; vertical-align: top; }
                .signature-space { height: 70px; }
                
                .employee-info { margin-bottom: 20px; padding: 10px; background: #f5f5f5; border: 1px solid #ddd; }
            </style>
        </head>
        <body>
            <div class="header">
                <h3>BALAI POM DI PALOPO</h3>
                <p>Alamat: Jl. Dr Ratulangi, Depan Taman Makam Kota Palopo, Salobulo, Palopo, Sulawesi Selatan</p>
            </div>

            <div class="content-title">
                Laporan Peminjaman Aset per Pegawai
            </div>

            <div class="employee-info">
                <strong>Nama:</strong> ' . ($employee->name ?? '-') . '<br>
                <strong>NIP:</strong> ' . ($employee->nip ?? '-') . '<br>
                <strong>Jabatan:</strong> ' . ($employee->position ?? '-') . '<br>
                <strong>Unit:</strong> ' . ($employee->department ?? '-') . '<br>
                <strong>Total Peminjaman:</strong> ' . $loans->count() . ' kali
            </div>

            <table>
                <thead>
                    <tr>
                        <th width="5%">No</th>
                        <th width="12%">No SPA</th>
                        <th width="12%">Tgl Pinjam</th>
                        <th width="12%">Tgl Kembali</th>
                        <th width="30%">Aset</th>
                        <th width="10%">Status</th>
                    </tr>
                </thead>
                <tbody>';

        if ($loans->isEmpty()) {
            $html .= '<tr><td colspan="6" style="text-align:center;">Tidak ada data peminjaman untuk pegawai ini.</td></tr>';
        } else {
            foreach ($loans as $index => $loan) {
                $statusLabel = match ($loan->status) {
                    'dipinjam' => 'Dipinjam',
                    'dikembalikan' => 'Dikembalikan',
                    'pengajuan' => 'Pengajuan',
                    'pengajuan-pengembalian' => 'Pengajuan Pengembalian',
                    default => $loan->status
                };

                $assetsList = collect($loan->assets ?? [])
                    ->map(fn($a) => ($a['nama_barang'] ?? $a['name'] ?? '-'))
                    ->implode(', ');

                $html .= '<tr>
                    <td style="text-align:center;">' . ($index + 1) . '</td>
                    <td>' . ($loan->spa_number ?? '-') . '</td>
                    <td>' . ($loan->loan_date ? date('d/m/Y', strtotime($loan->loan_date)) : '-') . '</td>
                    <td>' . ($loan->return_date ? date('d/m/Y', strtotime($loan->return_date)) : '-') . '</td>
                    <td>' . $assetsList . '</td>
                    <td style="text-align:center;">' . $statusLabel . '</td>
                </tr>';
            }
        }

        $html .= '</tbody></table>

            <div class="signature-section">
                <div class="signature-box">
                    <br>Mengetahui,<br>Penanggung Jawab BMN<br>
                    <div class="signature-space"></div>
                    <strong><u>( .................................... )</u></strong><br>
                    NIP. ..............................
                </div>
                <div class="signature-box">
                    Palopo, ' . $currentDate . '<br>Petugas BMN<br>
                    <div class="signature-space"></div>
                    <strong><u>( .................................... )</u></strong><br>
                    NIP. ..............................
                </div>
            </div>
        </body>
        </html>';

        $pdf = Pdf::loadHTML($html)->setPaper('a4', 'portrait');
        return $pdf->download('laporan-pegawai-' . ($employee->nip ?? $employeeId) . '-' . now()->format('YmdHis') . '.pdf');
    }

    public function exportLoansByEmployeeExcel($employeeId)
    {
        $employee = Employee::findOrFail($employeeId);
        $loans = BmnLoan::where('borrower_id', $employeeId)
            ->orderByDesc('loan_date')
            ->get();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Header
        $sheet->setCellValue('A1', 'LAPORAN PEMINJAMAN ASET PER PEGAWAI');
        $sheet->mergeCells('A1:F1');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
        $sheet->getStyle('A1')->getAlignment()->setHorizontal('center');

        // Employee Info
        $sheet->setCellValue('A3', 'Nama:');
        $sheet->setCellValue('B3', $employee->name ?? '-');
        $sheet->setCellValue('A4', 'NIP:');
        $sheet->setCellValue('B4', $employee->nip ?? '-');
        $sheet->setCellValue('A5', 'Jabatan:');
        $sheet->setCellValue('B5', $employee->position ?? '-');
        $sheet->setCellValue('A6', 'Unit:');
        $sheet->setCellValue('B6', $employee->department ?? '-');

        // Table Header
        $sheet->setCellValue('A8', 'No');
        $sheet->setCellValue('B8', 'No SPA');
        $sheet->setCellValue('C8', 'Tgl Pinjam');
        $sheet->setCellValue('D8', 'Tgl Kembali');
        $sheet->setCellValue('E8', 'Aset');
        $sheet->setCellValue('F8', 'Status');

        $sheet->getStyle('A8:F8')->getFont()->setBold(true);
        $sheet->getStyle('A8:F8')->getFill()->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)->getStartColor()->setRGB('E0E0E0');

        $row = 9;
        foreach ($loans as $index => $loan) {
            $statusLabel = match ($loan->status) {
                'dipinjam' => 'Dipinjam',
                'dikembalikan' => 'Dikembalikan',
                'pengajuan' => 'Pengajuan',
                'pengajuan-pengembalian' => 'Pengajuan Pengembalian',
                default => $loan->status
            };

            $assetsList = collect($loan->assets ?? [])
                ->map(fn($a) => ($a['nama_barang'] ?? $a['name'] ?? '-'))
                ->implode(', ');

            $sheet->setCellValue('A' . $row, $index + 1);
            $sheet->setCellValue('B' . $row, $loan->spa_number ?? '-');
            $sheet->setCellValue('C' . $row, $loan->loan_date ? date('Y-m-d', strtotime($loan->loan_date)) : '-');
            $sheet->setCellValue('D' . $row, $loan->return_date ? date('Y-m-d', strtotime($loan->return_date)) : '-');
            $sheet->setCellValue('E' . $row, $assetsList);
            $sheet->setCellValue('F' . $row, $statusLabel);
            $row++;
        }

        foreach (range('A', 'F') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $writer = new Xlsx($spreadsheet);
        $fileName = 'laporan-pegawai-' . ($employee->nip ?? $employeeId) . '-' . now()->format('YmdHis') . '.xlsx';

        if (ob_get_contents()) ob_end_clean();

        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment; filename="' . urlencode($fileName) . '"');
        $writer->save('php://output');
        exit;
    }

    public function store(Request $request)
    {
        $payload = $request->validate([
            'nip' => ['required', 'string'],
            'nama' => ['required', 'string'],
            'fungsi_bidang' => ['nullable', 'string'],
            'loan_date' => ['required', 'date'],
            'return_date' => ['required', 'date', 'after_or_equal:loan_date'],
            'location' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'password' => ['required', 'string'],
            'assets' => ['required', 'array', 'min:1'],
            'assets.*.asset_id' => ['required', 'integer', 'exists:assets,id'],
            'assets.*.nama_barang' => ['nullable', 'string'],
            'assets.*.merek_barang' => ['nullable', 'string'],
            'assets.*.nup' => ['nullable', 'string'],
            'assets.*.kode_bmn' => ['nullable', 'string'],
        ]);

        // Verify SIPTU Password
        $user = User::where('nip', $payload['nip'])->first();
        if (!$user) {
            return response()->json(['message' => 'Akun SIPTU dengan NIP tersebut tidak ditemukan.'], 404);
        }
        if (!Hash::check($payload['password'], $user->password)) {
            return response()->json(['message' => 'Password SIPTU salah.'], 401);
        }
        if ($user->has_mfa && !app(\App\Services\TotpService::class)->verifyCodeOrRecovery($user, (string)$request->input('totp_code', ''))) {
            return response()->json(['message' => 'Kode autentikasi MFA salah atau kadaluarsa. Pastikan Anda memasukkan 6 digit kode terbaru dari aplikasi Authenticator.'], 422);
        }

        $requestedAssetIds = collect($payload['assets'])->pluck('asset_id')->all();
        $this->validateConflicts($requestedAssetIds, $payload['loan_date'], $payload['return_date']);

        $employee = Employee::where('nip', $payload['nip'])->first();
        $borrowerPhone = $this->normalizePhone($employee?->phone_number ?? $user->phone_number);
        $spaNumber = $this->generateSpaNumber();
        $token = Str::uuid()->toString();

        $loan = BmnLoan::create([
            'token' => $token,
            'spa_number' => $spaNumber,
            'borrower_id' => $employee?->id,
            'borrower_nip' => $payload['nip'],
            'borrower_name' => $payload['nama'],
            'borrower_function' => $payload['fungsi_bidang'] ?? $employee?->function_area,
            'borrower_phone' => $borrowerPhone,
            'loan_date' => $payload['loan_date'],
            'return_date' => $payload['return_date'],
            'location' => $payload['location'] ?? null,
            'notes' => $payload['notes'] ?? null,
            'status' => 'pengajuan',
            'requester_signature' => null,
            'requester_signature_token' => (string) Str::uuid(),
            'requester_signed_at' => now(),
            'assets' => $payload['assets'],
            'created_by' => $request->user()?->id,
        ]);

        $this->notifyAdmins($loan);
        $this->notifyBorrowerSubmitted($loan);

        return response()->json($loan, 201);
    }

    public function approve(Request $request, string $id)
    {
        $loan = BmnLoan::findOrFail($id);

        $payload = $request->validate([
            'password'                 => ['required', 'string'],
            'is_vehicle'               => ['required', 'boolean'],
            'kondisi_barang_pinjam'    => ['required', 'string', 'max:255'],
            'kondisi_kendaraan_pinjam' => ['nullable', 'array'],
            'bbm_awal'                 => ['nullable', 'numeric', 'min:0'],
        ]);

        $user = $request->user();
        if (!Hash::check($payload['password'], $user->password)) {
            return response()->json(['message' => 'Password SIPTU salah.'], 401);
        }
        if ($user->has_mfa && !app(\App\Services\TotpService::class)->verifyCodeOrRecovery($user, (string)$request->input('totp_code', ''))) {
            return response()->json(['message' => 'Kode autentikasi MFA salah atau kadaluarsa. Pastikan Anda memasukkan 6 digit kode terbaru dari aplikasi Authenticator.'], 422);
        }

        $loan->update([
            'validator_signature'      => null,
            'validator_signature_token' => (string) Str::uuid(),
            'validator_signed_at'      => now(),
            'status'                   => 'dipinjam',
            'approved_by'              => $user->id,
            'approved_at'              => now(),
            'is_vehicle'               => $payload['is_vehicle'],
            'kondisi_barang_pinjam'    => $payload['kondisi_barang_pinjam'],
            'kondisi_kendaraan_pinjam' => $payload['is_vehicle']
                ? ($payload['kondisi_kendaraan_pinjam'] ?? null)
                : null,
            'bbm_awal'                 => $payload['is_vehicle']
                ? ($payload['bbm_awal'] ?? null)
                : null,
        ]);

        $this->updateAssetStatus($loan, 'dipinjam');
        $this->notifyBorrowerApproved($loan);

        return response()->json($loan);
    }

    private function validateConflicts(array $assetIds, string $loanDate, string $returnDate, ?int $ignoreId = null): void
    {
        $overlaps = BmnLoan::whereIn('status', ['pengajuan', 'dipinjam', 'pengajuan-pengembalian'])
            ->when($ignoreId, fn($q) => $q->where('id', '!=', $ignoreId))
            ->where(function ($q) use ($loanDate, $returnDate) {
                // PHP does standard date comparison for strings if formatted as YYYY-MM-DD
                $q->where(function ($sq) use ($loanDate, $returnDate) {
                    $sq->where('loan_date', '<=', $returnDate)
                        ->where('return_date', '>=', $loanDate);
                });
            })
            ->get();

        foreach ($overlaps as $loan) {
            $loanAssetsIds = collect($loan->assets ?? [])->pluck('asset_id')->map(fn ($id) => (int)$id)->all();
            $conflicts = array_intersect($assetIds, $loanAssetsIds);

            if (!empty($conflicts)) {
                $names = collect($loan->assets)
                    ->whereIn('asset_id', $conflicts)
                    ->map(fn ($a) => ($a['nama_barang'] ?? $a['name'] ?? 'Aset'))
                    ->implode(', ');

                throw ValidationException::withMessages([
                    'assets' => ["Aset berikut sudah dipesan/dipinjam pada periode tersebut: {$names} (No. SPA: {$loan->spa_number})"]
                ]);
            }
        }
    }

    public function return(Request $request, string $id)
    {
        $loan = BmnLoan::findOrFail($id);

        $payload = $request->validate([
            'kondisi_barang_kembali'    => ['required', 'string', 'max:255'],
            'kondisi_kendaraan_kembali' => ['nullable', 'array'],
            'bbm_akhir'                 => ['nullable', 'numeric', 'min:0'],
        ]);

        $loan->update([
            'status'                    => 'dikembalikan',
            'return_date'               => now()->format('Y-m-d'),
            'kondisi_barang_kembali'    => $payload['kondisi_barang_kembali'],
            'kondisi_kendaraan_kembali' => $loan->is_vehicle
                ? ($payload['kondisi_kendaraan_kembali'] ?? null)
                : null,
            'bbm_akhir'                 => $loan->is_vehicle
                ? ($payload['bbm_akhir'] ?? null)
                : null,
        ]);

        $this->updateAssetStatus($loan, 'tersedia');

        $this->notifyBorrowerReturned($loan);

        return response()->json($loan);
    }

    private function generateSpaNumber(): string
    {
        return 'SPA/' . now()->format('Ymd') . '/' . strtoupper(Str::random(4));
    }

    private function notifyAdmins(BmnLoan $loan): void
    {
        $setting = NotificationSetting::first();
        if (!$setting) {
            \Illuminate\Support\Facades\Log::warning('[BmnLoan] notifyAdmins: No NotificationSetting found.');
            return;
        }

        $targets = $this->notificationTargets($setting, self::MODULE_KEY);
        if (empty($targets)) {
            \Illuminate\Support\Facades\Log::warning('[BmnLoan] notifyAdmins: No admin targets configured.', [
                'module_key' => self::MODULE_KEY,
                'loan_id' => $loan->id,
            ]);
            return;
        }

        $frontendUrl = config('app.frontend_url');
        $adminLink = "{$frontendUrl}/app/bmn-peminjaman-aset";

        $assetCount = count($loan->assets ?? []);

        $message = implode("\n", array_filter([
            '📋 *PENGAJUAN PEMINJAMAN ASET BARU*',
            '━━━━━━━━━━━━━━━━━━━',
            '',
            "📌 *No. SPA:* {$loan->spa_number}",
            "👤 *Peminjam:* {$loan->borrower_name}",
            "🔢 *NIP:* {$loan->borrower_nip}",
            $loan->borrower_function ? "🏛 *Fungsi/Bidang:* {$loan->borrower_function}" : null,
            $loan->borrower_phone ? "📱 *No. HP:* {$loan->borrower_phone}" : null,
            '',
            "📅 *Periode:* {$loan->loan_date->translatedFormat('d F Y')} s/d {$loan->return_date->translatedFormat('d F Y')}",
            $loan->location ? "📍 *Lokasi:* {$loan->location}" : null,
            $loan->notes ? "📝 *Keperluan:* {$loan->notes}" : null,
            '',
            "📦 *Jumlah Aset:* {$assetCount} item",
            ...$this->buildAssetLines($loan),
            '',
            '━━━━━━━━━━━━━━━━━━━',
            "🔗 *Kelola Pengajuan:*",
            $adminLink,
            '',
            '⏰ Dikirim: ' . now()->translatedFormat('d F Y, H:i') . ' WITA',
        ]));

        $result = app(FonnteService::class)->send(
            $setting->fonnte_endpoint ?? '',
            $setting->fonnte_token ?? '',
            $targets,
            $message
        );

        // Dispatch WebPush to Admin/Pengelola BMN
        PushNotificationService::notifyRoles(
            ['admin', 'superadmin', 'validator'],
            'Pengajuan Peminjaman BMN Baru',
            "{$loan->borrower_name} mengajukan peminjaman aset BMN (No. SPA: {$loan->spa_number}).",
            '/app/bmn-peminjaman-aset',
            '/logo192.png',
            'bmn'
        );

        \Illuminate\Support\Facades\Log::info('[BmnLoan] notifyAdmins result.', [
            'loan_id' => $loan->id,
            'spa_number' => $loan->spa_number,
            'targets' => $targets,
            'result' => $result,
        ]);
    }

    private function notifyAdminsReturnRequest(BmnLoan $loan): void
    {
        $setting = NotificationSetting::first();
        if (!$setting) return;

        $targets = $this->notificationTargets($setting, self::MODULE_KEY);
        if (empty($targets)) return;

        $frontendUrl = config('app.frontend_url');
        $adminLink = "{$frontendUrl}/app/bmn-peminjaman-aset";

        $message = implode("\n", array_filter([
            '🔄 *PENGAJUAN PENGEMBALIAN ASET*',
            '━━━━━━━━━━━━━━━━━━━',
            '',
            "📌 *No. SPA:* {$loan->spa_number}",
            "👤 *Peminjam:* {$loan->borrower_name}",
            '',
            "Peminjam telah mengajukan pengembalian aset. Mohon verifikasi fisik aset dan setujui pengembalian.",
            '',
            "🔗 *Proses Pengembalian:*",
            $adminLink,
            '',
            '⏰ Diajukan: ' . now()->translatedFormat('d F Y, H:i') . ' WITA',
        ]));

        $result = app(FonnteService::class)->send(
            $setting->fonnte_endpoint ?? '',
            $setting->fonnte_token ?? '',
            $targets,
            $message
        );

        // Dispatch WebPush for return request
        PushNotificationService::notifyRoles(
            ['admin', 'superadmin', 'validator'],
            'Pengajuan Pengembalian Aset BMN',
            "{$loan->borrower_name} mengajukan pengembalian aset BMN (No. SPA: {$loan->spa_number}).",
            '/app/bmn-peminjaman-aset',
            '/logo192.png',
            'bmn'
        );

        \Illuminate\Support\Facades\Log::info('[BmnLoan] notifyAdminsReturnRequest result.', [
            'loan_id' => $loan->id,
            'spa_number' => $loan->spa_number,
            'targets' => $targets,
            'result' => $result,
        ]);
    }

    private function notifyBorrowerSubmitted(BmnLoan $loan): void
    {
        $setting = NotificationSetting::first();
        if (!$setting) {
            \Illuminate\Support\Facades\Log::warning('[BmnLoan] notifyBorrowerSubmitted: No NotificationSetting found.');
            return;
        }

        $target = $this->resolveBorrowerPhone($loan);
        if (!$target) {
            \Illuminate\Support\Facades\Log::warning('[BmnLoan] notifyBorrowerSubmitted: No borrower phone found.', [
                'loan_id' => $loan->id,
                'spa_number' => $loan->spa_number,
                'borrower_nip' => $loan->borrower_nip,
                'borrower_phone' => $loan->borrower_phone,
            ]);
            return;
        }

        $frontendUrl = rtrim((string) config('app.frontend_url'), '/');
        $loanLink = "{$frontendUrl}/peminjaman-aset/track/{$loan->token}";

        $message = implode("\n", array_filter([
            '[SIPTU] Pengajuan Peminjaman Aset BMN Diterima',
            '',
            "Halo {$loan->borrower_name},",
            'Pengajuan peminjaman aset BMN Anda sudah masuk dan menunggu verifikasi petugas.',
            '',
            "No. SPA: {$loan->spa_number}",
            'Periode: ' . $loan->loan_date->translatedFormat('d F Y') . ' s/d ' . $loan->return_date->translatedFormat('d F Y'),
            $loan->location ? "Lokasi: {$loan->location}" : null,
            $loan->notes ? "Keperluan: {$loan->notes}" : null,
            '',
            ...$this->buildAssetLines($loan),
            '',
            'Pantau pengajuan:',
            $loanLink,
            '',
            'Dikirim: ' . now()->translatedFormat('d F Y, H:i') . ' WITA',
        ]));

        $result = app(FonnteService::class)->send(
            $setting->fonnte_endpoint ?? '',
            $setting->fonnte_token ?? '',
            [$target],
            $message
        );

        // Dispatch WebPush to Borrower
        PushNotificationService::notifyEmployee(
            $loan->borrower_id ?? $loan->borrower_nip,
            'Pengajuan BMN Terkirim',
            "Pengajuan peminjaman aset (No. SPA: {$loan->spa_number}) telah berhasil dikirim.",
            "/peminjaman-aset/track/{$loan->token}",
            '/logo192.png',
            'bmn'
        );

        \Illuminate\Support\Facades\Log::info('[BmnLoan] notifyBorrowerSubmitted result.', [
            'loan_id' => $loan->id,
            'spa_number' => $loan->spa_number,
            'target' => $target,
            'result' => $result,
        ]);
    }

    private function notifyBorrowerApproved(BmnLoan $loan): void
    {
        $setting = NotificationSetting::first();
        if (!$setting) {
            \Illuminate\Support\Facades\Log::warning('[BmnLoan] notifyBorrowerApproved: No NotificationSetting found.');
            return;
        }
        $target = $this->resolveBorrowerPhone($loan);
        if (!$target) {
            \Illuminate\Support\Facades\Log::warning("[BmnLoan] notifyBorrowerApproved: No phone found for loan #{$loan->id} (borrower: {$loan->borrower_name}, nip: {$loan->borrower_nip}, borrower_phone: {$loan->borrower_phone}, borrower_id: {$loan->borrower_id})");
            return;
        }

        $frontendUrl = config('app.frontend_url');
        $loanLink = "{$frontendUrl}/peminjaman-aset/track/{$loan->token}";

        $message = implode("\n", array_filter([
            '✅ *PEMINJAMAN ASET BMN DISETUJUI*',
            '━━━━━━━━━━━━━━━━━━━',
            '',
            "Halo *{$loan->borrower_name}*,",
            'Pengajuan peminjaman aset Anda telah *disetujui*.',
            '',
            "📌 *No. SPA:* {$loan->spa_number}",
            "📅 *Periode:* {$loan->loan_date->translatedFormat('d F Y')} s/d {$loan->return_date->translatedFormat('d F Y')}",
            $loan->location ? "📍 *Lokasi:* {$loan->location}" : null,
            $loan->notes ? "📝 *Keperluan:* {$loan->notes}" : null,
            '',
            ...$this->buildAssetLines($loan),
            '',
            '━━━━━━━━━━━━━━━━━━━',
            'Silakan ambil aset sesuai jadwal yang telah ditentukan.',
            '',
            "🔗 *Pantau Peminjaman:*",
            $loanLink,
            '',
            '⏰ Disetujui: ' . now()->translatedFormat('d F Y, H:i') . ' WITA',
        ]));

        \Illuminate\Support\Facades\Log::info("[BmnLoan] Sending approval notification to {$target} for SPA {$loan->spa_number}");

        $result = app(FonnteService::class)->send(
            $setting->fonnte_endpoint ?? '',
            $setting->fonnte_token ?? '',
            [$target],
            $message
        );

        // Dispatch WebPush to Borrower
        PushNotificationService::notifyEmployee(
            $loan->borrower_id ?? $loan->borrower_nip,
            'Peminjaman BMN Disetujui',
            "Peminjaman aset (No. SPA: {$loan->spa_number}) telah disetujui petugas.",
            "/peminjaman-aset/track/{$loan->token}",
            '/logo192.png',
            'bmn'
        );

        \Illuminate\Support\Facades\Log::info("[BmnLoan] Fonnte result: " . json_encode($result));
    }

    private function notifyBorrowerReturned(BmnLoan $loan): void
    {
        $setting = NotificationSetting::first();
        if (!$setting) {
            \Illuminate\Support\Facades\Log::warning('[BmnLoan] notifyBorrowerReturned: No NotificationSetting found.');
            return;
        }
        $target = $this->resolveBorrowerPhone($loan);
        if (!$target) {
            \Illuminate\Support\Facades\Log::warning("[BmnLoan] notifyBorrowerReturned: No phone found for loan #{$loan->id} (borrower: {$loan->borrower_name}, nip: {$loan->borrower_nip})");
            return;
        }

        $frontendUrl = config('app.frontend_url');
        $loanLink = "{$frontendUrl}/peminjaman-aset/track/{$loan->token}";

        $message = implode("\n", array_filter([
            '🔄 *PENGEMBALIAN ASET BMN SELESAI*',
            '━━━━━━━━━━━━━━━━━━━',
            '',
            "Halo *{$loan->borrower_name}*,",
            'Pengembalian aset BMN yang Anda pinjam telah *selesai dikonfirmasi* oleh petugas.',
            '',
            "📌 *No. SPA:* {$loan->spa_number}",
            "📅 *Tanggal Pengembalian:* " . now()->translatedFormat('d F Y'),
            "📝 *Kondisi Barang Kembali:* " . ($loan->kondisi_barang_kembali ?? '-'),
            '',
            ...$this->buildAssetLines($loan),
            '',
            '━━━━━━━━━━━━━━━━━━━',
            'Terima kasih telah mengembalikan aset tepat waktu dan menjaga kondisi barang dengan baik.',
            '',
            "🔗 *Detail Peminjaman:*",
            $loanLink,
            '',
            '⏰ Dikonfirmasi: ' . now()->translatedFormat('d F Y, H:i') . ' WITA',
        ]));

        \Illuminate\Support\Facades\Log::info("[BmnLoan] Sending return confirmation notification to {$target} for SPA {$loan->spa_number}");

        $result = app(FonnteService::class)->send(
            $setting->fonnte_endpoint ?? '',
            $setting->fonnte_token ?? '',
            [$target],
            $message
        );

        // Dispatch WebPush to Borrower
        PushNotificationService::notifyEmployee(
            $loan->borrower_id ?? $loan->borrower_nip,
            'Pengembalian BMN Selesai',
            "Pengembalian aset (No. SPA: {$loan->spa_number}) telah selesai dikonfirmasi.",
            "/peminjaman-aset/track/{$loan->token}",
            '/logo192.png',
            'bmn'
        );

        \Illuminate\Support\Facades\Log::info("[BmnLoan] Fonnte result: " . json_encode($result));
    }

    private function resolveBorrowerPhone(BmnLoan $loan): ?string
    {
        $candidates = [];

        if ($loan->borrower_phone) {
            $candidates[] = $loan->borrower_phone;
        }

        if ($loan->borrower_id) {
            $employeeById = Employee::query()->find($loan->borrower_id);
            if ($employeeById?->phone_number) {
                $candidates[] = $employeeById->phone_number;
            }
        }

        if ($loan->borrower_nip) {
            $employeeByNip = Employee::query()->where('nip', $loan->borrower_nip)->first();
            if ($employeeByNip?->phone_number) {
                $candidates[] = $employeeByNip->phone_number;
            }

            $userByNip = User::query()->where('nip', $loan->borrower_nip)->first();
            if ($userByNip?->phone_number) {
                $candidates[] = $userByNip->phone_number;
            }
        }

        \Illuminate\Support\Facades\Log::info("[BmnLoan] resolveBorrowerPhone candidates: " . json_encode($candidates));

        foreach ($candidates as $phone) {
            $normalized = $this->normalizePhone($phone);
            if ($normalized) {
                return $normalized;
            }
        }

        return null;
    }

    /**
     * @return array<int, string>
     */
    private function notificationTargets(NotificationSetting $setting, string $moduleKey): array
    {
        $recipients = is_array($setting->recipients) ? $setting->recipients : [];
        $targets = $recipients[$moduleKey] ?? [];

        if (empty($targets)) {
            $targets = $setting->default_admin_numbers ?? [];
        }

        return array_values(array_unique(array_filter(is_array($targets) ? $targets : [])));
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

    /**
     * @return array<int, string>
     */
    private function buildAssetLines(BmnLoan $loan): array
    {
        $assets = collect($loan->assets ?? [])
            ->filter(fn($item) => is_array($item))
            ->values();

        if ($assets->isEmpty()) {
            return [];
        }

        $lines = ['Daftar Aset:'];

        foreach ($assets as $index => $asset) {
            $number = $index + 1;
            $lines[] = "{$number}. Nama Aset: " . ($asset['nama_barang'] ?? '-');
            $lines[] = "   Kode BMN: " . ($asset['kode_bmn'] ?? '-');
            $lines[] = "   NUP: " . ($asset['nup'] ?? '-');
            $lines[] = "   Merek: " . ($asset['merek_barang'] ?? '-');
        }

        return $lines;
    }

    public function downloadLoanPdf(string $token)
    {
        $loan = BmnLoan::where('token', $token)->firstOrFail();

        $qrRequester = '';
        $logoBase64 = '';
        $logoPath = public_path('favicon.png');
        if (file_exists($logoPath)) {
            $logoBase64 = 'data:image/png;base64,' . base64_encode(file_get_contents($logoPath));
        }

        $qrRequester = null;
        if ($loan->requester_signature_token) {
            $qrRequester = $this->generateQrBase64($loan->requester_signature_token);
        }

        $qrValidator = '';
        if ($loan->validator_signature_token) {
            $qrValidator = $this->generateQrBase64($loan->validator_signature_token);
        }

        // Force Indonesian locale for dates
        \Carbon\Carbon::setLocale('id');

        // Ensure borrower function is not "Default Unit"
        $borrowerFunction = $loan->borrower_function;
        if (empty($borrowerFunction) || strtolower($borrowerFunction) === 'default unit') {
            $employee = Employee::where('nip', $loan->borrower_nip)->first();
            $borrowerFunction = $employee?->function_area ?: '-';
        }

        $html = '
        <style>
            body { font-family: sans-serif; font-size: 11pt; color: #333; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .header h2 { margin: 0; text-transform: uppercase; }
            .header p { margin: 5px 0 0; font-size: 10pt; }
            .title { text-align: center; margin-bottom: 20px; }
            .title h3 { margin: 0; text-decoration: underline; }
            .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .info-table td { padding: 4px 0; vertical-align: top; }
            .asset-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .asset-table th, .asset-table td { border: 1px solid #000; padding: 8px; text-align: left; }
            .asset-table th { background-color: #f2f2f2; }
            .signature-container { width: 100%; margin-top: 50px; }
            .signature-box { width: 48%; display: inline-block; text-align: center; vertical-align: top; }
            .qr-code { width: 65px; height: 65px; margin: 5px auto; display: block; }
            .signature-img { height: 50px; max-width: 120px; margin: 5px auto; display: block; }
            .sig-text { font-size: 8pt; margin: 2px 0; line-height: 1.2; }
            .sig-time { font-size: 7pt; color: #666; margin: 0; font-style: italic; }

            /* QR Code Logo Overlay */
            .qr-wrapper { 
                position: relative; 
                width: 100px; 
                height: 100px; 
                margin: 5px auto;
                display: block;
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
        <div class="header">
            <h2>BALAI POM DI PALOPO</h2>
            <p>JL. Dr. Ratulangi (Depan Taman Makam Pahlawan), Salobulo, Kota Palopo, Sulawesi Selatan</p>
        </div>
        <div class="title">
            <h3>SURAT PEMINJAMAN ASET (SPA)</h3>
            <p>Nomor: ' . ($loan->spa_number ?? '-') . '</p>
        </div>
        <table class="info-table">
            <tr><td width="30%">Nama Peminjam</td><td width="2%">:</td><td>' . $loan->borrower_name . '</td></tr>
            <tr><td>NIP</td><td>:</td><td>' . $loan->borrower_nip . '</td></tr>
            <tr><td>Fungsi/Bidang</td><td>:</td><td>' . ($borrowerFunction ?: '-') . '</td></tr>
            <tr><td>Tanggal Pinjam</td><td>:</td><td>' . \Carbon\Carbon::parse($loan->loan_date)->translatedFormat('d F Y') . '</td></tr>
            <tr><td>Tanggal Kembali</td><td>:</td><td>' . \Carbon\Carbon::parse($loan->return_date)->translatedFormat('d F Y') . '</td></tr>
            <tr><td>Tujuan/Keperluan</td><td>:</td><td>' . ($loan->notes ?: '-') . '</td></tr>
        </table>
        <table class="asset-table">
            <thead>
                <tr>
                    <th width="5%">No</th>
                    <th>Nama Barang</th>
                    <th>Merek/NUP</th>
                    <th>Kode BMN</th>
                </tr>
            </thead>
            <tbody>';
        
        $assets = is_array($loan->assets) ? $loan->assets : [];
        foreach ($assets as $index => $asset) {
            $html .= '<tr>
                <td>' . ($index + 1) . '</td>
                <td>' . ($asset['nama_barang'] ?? ($asset['name'] ?? '-')) . '</td>
                <td>' . ($asset['merek_barang'] ?? ($asset['brand'] ?? '-')) . ' / ' . ($asset['nup'] ?? ($asset['model'] ?? '-')) . '</td>
                <td>' . ($asset['kode_bmn'] ?? ($asset['asset_code'] ?? '-')) . '</td>
            </tr>';
        }

        $html .= '</tbody>
        </table>
        <div class="signature-container">
            <div class="signature-box" style="float: left;">
                <p>Peminjam,</p>';
        
        if ($qrRequester) {
            $html .= '<div class="qr-wrapper">
                        <img src="' . $qrRequester . '" class="qr-code">';
            if ($logoBase64) {
                $html .= '<img src="' . $logoBase64 . '" class="qr-logo">';
            }
            $html .= '</div>';
            $html .= '<p class="sig-text">(Ditandatangani secara elektronik)</p>';
            if ($loan->requester_signed_at) {
                $html .= '<p class="sig-time">' . \Carbon\Carbon::parse($loan->requester_signed_at)->timezone('Asia/Makassar')->format('d/m/Y H:i') . ' WITA</p>';
            }
        } elseif ($loan->requester_signature) {
            $html .= '<img src="' . $loan->requester_signature . '" class="signature-img">';
        } else {
            $html .= '<div style="height: 80px;"></div>';
        }
        
        $html .= '<p><strong>' . $loan->borrower_name . '</strong></p>
                <p>NIP. ' . $loan->borrower_nip . '</p>
            </div>
            <div class="signature-box" style="float: right;">
                <p>Petugas BMN,</p>';
        
        if ($qrValidator) {
            $html .= '<div class="qr-wrapper">
                        <img src="' . $qrValidator . '" class="qr-code">';
            if ($logoBase64) {
                $html .= '<img src="' . $logoBase64 . '" class="qr-logo">';
            }
            $html .= '</div>';
            $html .= '<p class="sig-text">(Ditandatangani secara elektronik)</p>';
            if ($loan->validator_signed_at) {
                $html .= '<p class="sig-time">' . \Carbon\Carbon::parse($loan->validator_signed_at)->timezone('Asia/Makassar')->format('d/m/Y H:i') . ' WITA</p>';
            }
        } elseif ($loan->validator_signature) {
            $html .= '<img src="' . $loan->validator_signature . '" class="signature-img">';
        } else {
            $html .= '<div style="height: 80px;"></div>';
        }
        
        $html .= '<p><strong>' . ($loan->approver->name ?? '____________________') . '</strong></p>
                <p>' . ($loan->approver->nip ? 'NIP. ' . $loan->approver->nip : '') . '</p>
            </div>
        </div>';

        $pdf = Pdf::loadHTML($html)->setPaper('a4', 'portrait');
        $fileName = 'SPA-' . str_replace(['/', '\\'], '-', ($loan->spa_number ?: $loan->token)) . '.pdf';
        return $pdf->download($fileName);
    }

    private function generateQrBase64(string $token): string
    {
        $verifyUrl = config('app.frontend_url', 'https://siptu.bpompalopo.com') . '/verifikasi/' . $token;
        $options = new QROptions([
            'version'         => -1,
            'outputInterface' => QRMarkupSVG::class,
            'eccLevel'        => EccLevel::H,
            'scale'           => 5,
            'outputBase64'    => true,
            'svgAddXmlHeader' => false,
        ]);
        $qrcode = new QRCode($options);
        return $qrcode->render($verifyUrl);
    }

    private function updateAssetStatus(BmnLoan $loan, string $status): void
    {
        $assets = $loan->assets ?? [];
        $assetIds = collect($assets)
            ->pluck('asset_id')
            ->filter()
            ->values()
            ->all();

        if (!empty($assetIds)) {
            Asset::whereIn('id', $assetIds)->update(['status' => $status]);
        }
    }

    public function destroy(string $id)
    {
        $loan = BmnLoan::findOrFail($id);

        // Revert all associated assets to 'tersedia'
        $this->updateAssetStatus($loan, 'tersedia');

        $loan->delete();

        return response()->json(['message' => 'Data peminjaman berhasil dihapus.']);
    }

    // ─── Room Booking (Peminjaman Ruangan) ────────────────────────────

    /**
     * List assets with category 'Ruangan' for the public room schedule page.
     */
    public function listRoomsPublic()
    {
        $rooms = Asset::where('category', 'Ruangan')
            ->select(['id', 'name', 'brand', 'model', 'asset_code', 'status', 'description', 'location'])
            ->orderBy('name')
            ->get();

        return response()->json($rooms);
    }

    /**
     * Get all room loans (active + history) for the public display page.
     */
    public function roomSchedulePublic(Request $request)
    {
        // Get all asset IDs that are categorized as 'Ruangan'
        $roomAssetIds = Asset::where('category', 'Ruangan')->pluck('id')->toArray();

        $query = BmnLoan::where(function($q) use ($roomAssetIds) {
            $q->where('loan_type', 'ruangan');
            
            // Also include loans that have at least one room asset in their JSON 'assets' array
            foreach ($roomAssetIds as $id) {
                $q->orWhereJsonContains('assets', [['asset_id' => (int)$id]]);
                $q->orWhereJsonContains('assets', [['asset_id' => (string)$id]]);
            }
        });

        // Filter by status group
        $filter = $request->input('filter', 'active'); // 'active', 'history', 'all'
        if ($filter === 'active') {
            $query->whereIn('status', ['pengajuan', 'dipinjam']);
        } elseif ($filter === 'history') {
            $query->whereIn('status', ['dikembalikan', 'ditolak']);
        }

        // Filter by room (asset_id)
        if ($request->filled('room_id')) {
            $roomId = (int) $request->input('room_id');
            $query->whereJsonContains('assets', [['asset_id' => $roomId]]);
        }

        // Search by activity name or borrower name
        if ($request->filled('search')) {
            $term = $request->input('search');
            $query->where(function ($q) use ($term) {
                $q->where('activity_name', 'like', "%{$term}%")
                  ->orWhere('borrower_name', 'like', "%{$term}%")
                  ->orWhere('notes', 'like', "%{$term}%");
            });
        }

        $loans = $query->orderByDesc('loan_date')
            ->orderByDesc('start_time')
            ->get([
                'id', 'spa_number', 'borrower_name', 'borrower_nip', 'borrower_function',
                'loan_date', 'return_date', 'start_time', 'end_time',
                'activity_name', 'notes', 'status', 'assets', 'location',
                'created_at', 'loan_type',
            ]);

        return response()->json($loans);
    }

    /**
     * Store a new room booking (simplified flow).
     */
    public function storeRoomLoanPublic(Request $request)
    {
        $payload = $request->validate([
            'nip'            => ['required', 'string'],
            'nama'           => ['required', 'string'],
            'fungsi_bidang'  => ['nullable', 'string'],
            'room_id'        => ['required', 'integer', 'exists:assets,id'],
            'loan_date'      => ['required', 'date'],
            'return_date'    => ['required', 'date', 'after_or_equal:loan_date'],
            'start_time'     => ['required', 'date_format:H:i'],
            'end_time'       => ['required', 'date_format:H:i', 'after:start_time'],
            'activity_name'  => ['required', 'string', 'max:255'],
            'password'       => ['required', 'string'],
        ]);

        // Verify SIPTU Password
        $user = User::where('nip', $payload['nip'])->first();
        if (!$user) {
            return response()->json(['message' => 'Akun SIPTU dengan NIP tersebut tidak ditemukan.'], 404);
        }
        if (!Hash::check($payload['password'], $user->password)) {
            return response()->json(['message' => 'Password SIPTU salah.'], 401);
        }
        if ($user->has_mfa && !app(\App\Services\TotpService::class)->verifyCodeOrRecovery($user, (string)$request->input('totp_code', ''))) {
            return response()->json(['message' => 'Kode autentikasi MFA salah atau kadaluarsa. Pastikan Anda memasukkan 6 digit kode terbaru dari aplikasi Authenticator.'], 422);
        }

        // Get room asset details
        $room = Asset::findOrFail($payload['room_id']);

        // Check for conflicts on this room
        $this->validateConflicts(
            [$payload['room_id']],
            $payload['loan_date'],
            $payload['return_date']
        );

        $employee = Employee::where('nip', $payload['nip'])->first();
        $borrowerPhone = $this->normalizePhone($employee?->phone_number ?? $user->phone_number);
        $spaNumber = $this->generateSpaNumber();
        $token = Str::uuid()->toString();

        $loan = BmnLoan::create([
            'token'                     => $token,
            'spa_number'                => $spaNumber,
            'borrower_id'               => $employee?->id,
            'borrower_nip'              => $payload['nip'],
            'borrower_name'             => $payload['nama'],
            'borrower_function'         => $payload['fungsi_bidang'] ?? $employee?->function_area,
            'borrower_phone'            => $borrowerPhone,
            'loan_date'                 => $payload['loan_date'],
            'return_date'               => $payload['return_date'],
            'start_time'                => $payload['start_time'],
            'end_time'                  => $payload['end_time'],
            'activity_name'             => $payload['activity_name'],
            'notes'                     => $payload['activity_name'],
            'location'                  => $room->name, // Room name as location
            'status'                    => 'pengajuan',
            'loan_type'                 => 'ruangan',
            'requester_signature'       => null,
            'requester_signature_token' => (string) Str::uuid(),
            'requester_signed_at'       => now(),
            'assets'                    => [[
                'asset_id'     => $room->id,
                'nama_barang'  => $room->name,
                'merek_barang' => $room->brand ?? '',
                'nup'          => $room->model ?? '',
                'kode_bmn'     => $room->asset_code ?? '',
            ]],
        ]);

        $this->notifyAdminsRoomBooking($loan, $room);
        $this->notifyBorrowerSubmitted($loan);

        return response()->json($loan, 201);
    }

    /**
     * Notify admins about a new room booking request.
     */
    private function notifyAdminsRoomBooking(BmnLoan $loan, Asset $room): void
    {
        $setting = NotificationSetting::first();
        if (!$setting) return;

        $targets = $this->notificationTargets($setting, self::MODULE_KEY);
        if (empty($targets)) return;

        $frontendUrl = config('app.frontend_url');
        $adminLink = "{$frontendUrl}/app/bmn-peminjaman-aset";

        $message = implode("\n", array_filter([
            '🏢 *PENGAJUAN PEMINJAMAN RUANGAN BARU*',
            '━━━━━━━━━━━━━━━━━━━',
            '',
            "📌 *No. SPA:* {$loan->spa_number}",
            "👤 *Peminjam:* {$loan->borrower_name}",
            "🔢 *NIP:* {$loan->borrower_nip}",
            "🏛 *Fungsi/Bidang:* {$loan->borrower_function}",
            '',
            "📅 *Tanggal:* {$loan->loan_date->translatedFormat('d F Y')} s/d {$loan->return_date->translatedFormat('d F Y')}",
            "📍 *Ruangan:* {$room->name}",
            "📝 *Kegiatan:* {$loan->activity_name}",
            "🕐 *Jam:* {$loan->start_time} - {$loan->end_time}",
            '',
            '━━━━━━━━━━━━━━━━━━━',
            "🔗 *Kelola Pengajuan:*",
            $adminLink,
            '',
            '⏰ Dikirim: ' . now()->timezone('Asia/Makassar')->translatedFormat('d F Y, H:i') . ' WITA',
        ]));

        $result = app(FonnteService::class)->send(
            $setting->fonnte_endpoint ?? '',
            $setting->fonnte_token ?? '',
            $targets,
            $message
        );

        \Illuminate\Support\Facades\Log::info('[BmnLoan] notifyAdminsRoomBooking result.', [
            'loan_id' => $loan->id,
            'spa_number' => $loan->spa_number,
            'targets' => $targets,
            'result' => $result,
        ]);
    }
}
