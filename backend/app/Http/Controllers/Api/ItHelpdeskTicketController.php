<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\ItHelpdeskTicket;
use App\Models\Employee;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

use App\Models\NotificationSetting;
use App\Services\FonnteService;
use Illuminate\Support\Facades\Auth;
use Barryvdh\DomPDF\Facade\Pdf;
use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;
use chillerlan\QRCode\Common\EccLevel;
use chillerlan\QRCode\Output\QRMarkupSVG;

class ItHelpdeskTicketController extends Controller
{
    /**
     * Download ticket as PDF with TTE QR codes
     */
    public function downloadTicketPdf(string $id)
    {
        $ticket = ItHelpdeskTicket::with(['itStaff'])->findOrFail($id);

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

        $qrReporter = null;
        if ($ticket->reporter_signature_token) {
            $qrReporter = (new QRCode($options))->render(config('app.frontend_url') . '/verifikasi/' . $ticket->reporter_signature_token);
        }

        $qrStaff = null;
        if ($ticket->it_staff_signature_token) {
            $qrStaff = (new QRCode($options))->render(config('app.frontend_url') . '/verifikasi/' . $ticket->it_staff_signature_token);
        }

        $html = '<!DOCTYPE html>
        <html>
        <head>
        <style>
            body { font-family: sans-serif; font-size: 11pt; color: #333; line-height: 1.4; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .header h2 { margin: 0; text-transform: uppercase; font-size: 14pt; }
            .header p { margin: 5px 0 0; font-size: 10pt; }
            .title { text-align: center; margin-bottom: 25px; }
            .title h3 { margin: 0; text-decoration: underline; font-size: 12pt; }
            .title p { margin: 5px 0; font-size: 11pt; font-weight: bold; }
            .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .info-table td { padding: 5px 0; vertical-align: top; }
            .section-title { font-weight: bold; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
            .detail-box { padding: 10px; border: 1px solid #eee; background: #fafafa; min-height: 60px; margin-bottom: 20px; }
            .signature-container { width: 100%; margin-top: 40px; border: none; }
            .signature-box { width: 50%; text-align: center; vertical-align: top; border: none; }
            .qr-code { width: 70px; height: 70px; margin: 5px auto; display: block; }
            .signature-img { height: 60px; max-width: 140px; margin: 5px auto; display: block; }
            .sig-text { font-size: 8pt; margin: 2px 0; line-height: 1.1; }
            .sig-time { font-size: 7pt; color: #666; margin: 0; font-style: italic; }
            .footer { position: fixed; bottom: 0; width: 100%; text-align: center; font-size: 8pt; color: #999; }
            
            /* QR Code Logo Overlay */
            .qr-wrapper { 
                position: relative; 
                width: 100px; 
                height: 100px; 
                margin: 5px auto; 
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
                <p>JL. Dr. Ratulangi (Depan Taman Makam Pahlawan), Salobulo, Kota Palopo, Sulawesi Selatan</p>
            </div>
            <div class="title">
                <h3>TIKET LAYANAN IT (IT HELPDESK)</h3>
                <p>Nomor: ' . $ticket->ticket_number . '</p>
            </div>

            <div class="section-title">INFORMASI PELAPOR</div>
            <table class="info-table">
                <tr><td width="30%">Nama Pegawai</td><td width="2%">:</td><td>' . $ticket->employee_name . '</td></tr>
                <tr><td>NIP</td><td>:</td><td>' . ($ticket->employee_nip ?: '-') . '</td></tr>
                <tr><td>Fungsi/Bidang</td><td>:</td><td>' . ($ticket->function_area ?: '-') . '</td></tr>
                <tr><td>Tanggal Laporan</td><td>:</td><td>' . \Carbon\Carbon::parse($ticket->report_date)->translatedFormat('d F Y') . '</td></tr>
            </table>

            <div class="section-title">RINCIAN KELUHAN</div>
            <table class="info-table">
                <tr><td width="30%">Jenis Keluhan</td><td width="2%">:</td><td>' . $ticket->report_type . '</td></tr>
            </table>
            <div class="detail-box">
                ' . nl2br(e($ticket->problem_details)) . '
            </div>

            <div class="section-title">TINDAK LANJUT IT</div>
            <table class="info-table">
                <tr><td width="30%">Tanggal Selesai</td><td width="2%">:</td><td>' . ($ticket->completion_date ? \Carbon\Carbon::parse($ticket->completion_date)->translatedFormat('d F Y') : '-') . '</td></tr>
                <tr><td>Petugas IT</td><td>:</td><td>' . ($ticket->itStaff ? $ticket->itStaff->name : '-') . '</td></tr>
            </table>
            <div class="detail-box">
                ' . ($ticket->followup_details ? nl2br(e($ticket->followup_details)) : '<i>Belum ada rincian tindak lanjut.</i>') . '
            </div>

            <table class="signature-container">
                <tr>
                    <td class="signature-box">
                        <p>Pelapor,</p>
                        ';
            
            if ($qrReporter) {
                $html .= '<div class="qr-wrapper">
                            <img src="' . $qrReporter . '" class="qr-code">';
                if ($logoBase64) {
                    $html .= '<img src="' . $logoBase64 . '" class="qr-logo">';
                }
                $html .= '</div>';
                $html .= '<p class="sig-text">(Ditandatangani secara elektronik)</p>';
                if ($ticket->reporter_signed_at) {
                    $html .= '<p class="sig-time">' . \Carbon\Carbon::parse($ticket->reporter_signed_at)->timezone('Asia/Makassar')->format('d/m/Y H:i') . ' WITA</p>';
                }
            } elseif ($ticket->reporter_signature) {
                $html .= '<img src="' . $ticket->reporter_signature . '" class="signature-img">';
            } else {
                $html .= '<div style="height: 80px;"></div>';
            }
            
            $html .= '<p><strong>' . $ticket->employee_name . '</strong></p>
                        <p>NIP. ' . ($ticket->employee_nip ?: '-') . '</p>
                    </td>
                    <td class="signature-box">
                        <p>Petugas IT / Staff,</p>
                        ';
            
            if ($qrStaff) {
                $html .= '<div class="qr-wrapper">
                            <img src="' . $qrStaff . '" class="qr-code">';
                if ($logoBase64) {
                    $html .= '<img src="' . $logoBase64 . '" class="qr-logo">';
                }
                $html .= '</div>';
                $html .= '<p class="sig-text">(Ditandatangani secara elektronik)</p>';
                if ($ticket->it_staff_signed_at) {
                    $html .= '<p class="sig-time">' . \Carbon\Carbon::parse($ticket->it_staff_signed_at)->timezone('Asia/Makassar')->format('d/m/Y H:i') . ' WITA</p>';
                }
            } elseif ($ticket->it_staff_signature) {
                $html .= '<img src="' . $ticket->it_staff_signature . '" class="signature-img">';
            } else {
                $html .= '<div style="height: 80px;"></div>';
            }
            
            $html .= '<p><strong>' . ($ticket->itStaff ? $ticket->itStaff->name : '-') . '</strong></p>
                        <p>NIP. ' . ($ticket->itStaff ? ($ticket->itStaff->nip ?: '-') : '-') . '</p>
                    </td>
                </tr>
            </table>
            <div class="footer">
                Dicetak otomatis oleh SIPTU Ultra pada ' . now()->timezone('Asia/Makassar')->format('d/m/Y H:i:s') . ' WITA
            </div>
        </body>
        </html>';

        $pdf = Pdf::loadHTML($html)->setPaper('a4', 'portrait');
        return $pdf->download('Tiket-IT-' . $ticket->ticket_number . '.pdf');
    }
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = ItHelpdeskTicket::with(['employee', 'itStaff'])
            ->orderByDesc('created_at');

        // Search functionality
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('employee_name', 'LIKE', "%{$search}%")
                  ->orWhere('problem_details', 'LIKE', "%{$search}%")
                  ->orWhere('ticket_number', 'LIKE', "%{$search}%");
            });
        }

        // Filtering by status
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        // Filtering by report type
        if ($request->has('report_type') && $request->report_type) {
            $query->where('report_type', $request->report_type);
        }

        // Filtering by date range
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('report_date', [$request->start_date, $request->end_date]);
        }

        // Pagination
        $page = $request->get('page', 1);
        $pageSize = $request->get('pageSize', 10);

        $tickets = $query->paginate($pageSize, ['*'], 'page', $page);

        return response()->json([
            'data' => $tickets->items(),
            'meta' => [
                'total' => $tickets->total(),
                'page' => $tickets->currentPage(),
                'last_page' => $tickets->lastPage(),
            ]
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request, FonnteService $fonnteService)
    {
        $validator = Validator::make($request->all(), [
            'report_type' => 'required|string',
            'problem_details' => 'required|string',
            'password' => 'nullable|string',
            'totp_code' => 'nullable|string',
            'reporter_signature' => 'nullable|string',
            'employee_nip' => 'nullable|string',
            'employee_name' => 'nullable|string',
            'function_area' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = auth()->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // TTE Verification
        $signatureToken = null;
        $signedAt = null;

        if ($request->password) {
            if (!\Illuminate\Support\Facades\Hash::check($request->password, $user->password)) {
                \Illuminate\Support\Facades\Log::warning("IT Helpdesk TTE: Password mismatch for user {$user->nip}");
                return response()->json(['message' => 'Password SIPTU salah.'], 422);
            }
            if ($user->has_mfa && !app(\App\Services\TotpService::class)->verifyCodeOrRecovery($user, (string)$request->totp_code)) {
                return response()->json(['message' => 'Kode autentikasi MFA salah atau kadaluarsa. Pastikan Anda memasukkan 6 digit kode terbaru dari aplikasi Authenticator.'], 422);
            }
            $signatureToken = (string) Str::uuid();
            $signedAt = now();
        }

        $employee = $user->employee; 
        $employeeId = $employee?->id;
        $employeeName = $request->employee_name ?? $employee?->name ?? $employee?->nama ?? $user->name;
        $employeeNip = $request->employee_nip ?? $employee?->nip ?? $user->nip;
        $functionArea = $request->function_area ?? $employee?->function_area ?? $employee?->fungsi_bidang ?? 'Staff';

        $ticketNumber = 'TKT-' . date('Ymd') . '-' . strtoupper(Str::random(6));
        $validated = $validator->validated();
        $normalizedReportType = $this->normalizeReportType($validated['report_type'] ?? 'other');

        $ticket = ItHelpdeskTicket::create([
            'report_type' => $normalizedReportType,
            'problem_details' => $validated['problem_details'],
            'reporter_signature' => $validated['reporter_signature'] ?? null,
            'reporter_signature_token' => $signatureToken,
            'reporter_signed_at' => $signedAt,
            'ticket_number' => $ticketNumber,
            'employee_id' => $employeeId,
            'employee_name' => $employeeName,
            'employee_nip' => $employeeNip,
            'function_area' => $functionArea,
            'report_date' => now(),
            'status' => 'new',
            'created_by' => $user->id
        ]);

        try {
            $this->sendNotification($ticket, $fonnteService, 'new');
            $admins = \App\Models\User::whereIn('role', ['admin', 'superadmin'])->get();
            foreach ($admins as $admin) {
                $admin->notify(new \App\Notifications\GeneralNotification(
                    'Laporan IT Baru',
                    "Ada laporan IT baru dari {$ticket->employee_name} (No. {$ticket->ticket_number}).",
                    $ticket->id,
                    'it_helpdesk'
                ));
            }
        } catch (\Throwable $e) {}

        try {
            \App\Services\ActivityLogger::log('submit', 'it_helpdesk', "Membuat tiket IT Helpdesk ({$ticket->ticket_number})", $ticket->ticket_number, $ticket);
        } catch (\Throwable $e) {}

        return response()->json($ticket, 201);
    }

    public function storePublic(Request $request, FonnteService $fonnteService)
    {
        $payload = $request->validate([
            'employee_id' => 'nullable|exists:employees,id',
            'employee_name' => 'required|string|max:255',
            'employee_nip' => 'nullable|string|max:50',
            'function_area' => 'nullable|string|max:100',
            'report_type' => 'required|string',
            'problem_details' => 'required|string',
            'password' => 'nullable|string',
            'reporter_signature' => 'nullable|string',
        ]);

        $signatureToken = null;
        $signedAt = null;

        // If NIP provided, try to verify password
        if ($request->password && $request->employee_nip) {
            $user = \App\Models\User::where('nip', $request->employee_nip)->first();
            if ($user && \Illuminate\Support\Facades\Hash::check($request->password, $user->password)) {
                if ($user->has_mfa && !app(\App\Services\TotpService::class)->verifyCodeOrRecovery($user, (string)$request->totp_code)) {
                    return response()->json(['message' => 'Kode autentikasi MFA salah atau kadaluarsa. Pastikan Anda memasukkan 6 digit kode terbaru dari aplikasi Authenticator.'], 422);
                }
                $signatureToken = (string) Str::uuid();
                $signedAt = now();
            } else {
                return response()->json(['message' => 'NIP atau Password SIPTU salah.'], 422);
            }
        }

        $ticketNumber = 'TKT-' . date('Ymd') . '-' . strtoupper(Str::random(6));
        $normalizedReportType = $this->normalizeReportType($payload['report_type'] ?? 'other');

        $ticket = ItHelpdeskTicket::create([
            'ticket_number' => $ticketNumber,
            'employee_id' => $payload['employee_id'] ?? null,
            'employee_nip' => $payload['employee_nip'] ?? null,
            'employee_name' => $payload['employee_name'],
            'function_area' => $payload['function_area'] ?? null,
            'report_type' => $normalizedReportType,
            'problem_details' => $payload['problem_details'],
            'reporter_signature' => $payload['reporter_signature'] ?? null,
            'reporter_signature_token' => $signatureToken,
            'reporter_signed_at' => $signedAt,
            'report_date' => now(),
            'status' => 'new',
            'created_by' => null,
        ]);

        try {
            $this->sendNotification($ticket, $fonnteService, 'new');
            $admins = \App\Models\User::whereIn('role', ['admin', 'superadmin'])->get();
            foreach ($admins as $admin) {
                $admin->notify(new \App\Notifications\GeneralNotification(
                    'Laporan IT Baru',
                    "Ada laporan IT baru dari {$ticket->employee_name} (No. {$ticket->ticket_number}).",
                    $ticket->id,
                    'it_helpdesk'
                ));
            }
        } catch (\Throwable $e) {}

        return response()->json(['message' => 'Laporan berhasil dikirim.', 'ticket' => $ticket], 201);
    }

    private function sendNotification(ItHelpdeskTicket $ticket, FonnteService $fonnteService, string $status = 'new'): void
    {
        $setting = NotificationSetting::first();
        if (!$setting) {
            return;
        }

        $recipients = $setting->recipients ?? [];
        $targets = [];
        $baseUrl = rtrim(config('app.frontend_url'), '/');
        $messageLines = [];

        if ($status === 'new') {
            // Admin Notification
            $targets = array_merge(
                $setting->default_admin_numbers ?? [],
                $recipients['it-helpdesk'] ?? []
            );
            $detailLink = $baseUrl . '/app/it-helpdesk-pelaporan'; // Corrected admin link
            
            $messageLines = [
                "[SIPTU] Laporan Keluhan IT Baru",
                "No. Tiket: {$ticket->ticket_number}",
                "Pelapor: {$ticket->employee_name}",
                "NIP: " . ($ticket->employee_nip ?: '-'),
                "Unit: " . ($ticket->function_area ?: '-'),
                "Jenis: {$ticket->report_type}",
                "Masalah: {$ticket->problem_details}",
                "Waktu: " . now()->translatedFormat('d F Y H:i') . ' WITA',
                "Link Admin:",
                "{$detailLink}",
            ];
        } elseif ($status === 'in_progress') {
            // User Notification (Processing)
            if ($ticket->employee && $ticket->employee->phone_number) {
                 $targets[] = $ticket->employee->phone_number;
            } elseif ($ticket->employee_nip) {
                $emp = Employee::where('nip', $ticket->employee_nip)->first();
                if ($emp && $emp->phone_number) $targets[] = $emp->phone_number;
            }
            
            $messageLines = [
                "[SIPTU] Laporan IT Sedang Diproses",
                "Halo {$ticket->employee_name},",
                "Laporan Anda dengan No. Tiket {$ticket->ticket_number} sedang diproses oleh Tim IT.",
                "Mohon menunggu update selanjutnya.",
            ];
        } elseif (in_array($status, ['waiting_user_approval', 'completed'], true)) {
            // User Notification (ready for user confirmation)
             if ($ticket->employee && $ticket->employee->phone_number) {
                  $targets[] = $ticket->employee->phone_number;
             } elseif ($ticket->employee_nip) {
                 $emp = Employee::where('nip', $ticket->employee_nip)->first();
                 if ($emp && $emp->phone_number) $targets[] = $emp->phone_number;
             }

            $confirmLink = $baseUrl . "/it-helpdesk/tickets/{$ticket->id}/sign"; // User confirmation link

            $messageLines = [
                "[SIPTU] Laporan IT Selesai",
                "Halo {$ticket->employee_name},",
                "Laporan Anda (No. {$ticket->ticket_number}) telah ditangani.",
                "Tindak Lanjut: {$ticket->followup_details}",
                "Mohon konfirmasi penyelesaian dengan klik link berikut:",
                "{$confirmLink}",
                "",
                "Terima kasih."
            ];
        }

        $targets = array_values(array_unique(array_filter($targets)));
        if (empty($targets)) {
            return;
        }

        $message = implode("\n", $messageLines);

        $fonnteService->send(
            $setting->fonnte_endpoint ?? 'https://api.fonnte.com/send',
            $setting->fonnte_token ?? '',
            $targets,
            $message
        );
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $ticket = ItHelpdeskTicket::with(['employee', 'itStaff'])->findOrFail($id);
        return response()->json($ticket);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $ticket = ItHelpdeskTicket::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'employee_id' => 'sometimes|required|exists:employees,id',
            'report_type' => 'sometimes|required|string',
            'problem_details' => 'sometimes|required|string',
            'function_area' => 'nullable|string|max:100',
            'reporter_signature' => 'nullable|string',
            'status' => 'nullable|in:new,open,in_progress,waiting_user_approval,completed',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $payload = $validator->validated();
        if (($payload['status'] ?? null) === 'open') {
            $payload['status'] = 'new';
        }
        $ticket->update($payload);

        if ($request->has('status') && $request->status === 'in_progress') {
             $this->sendNotification($ticket, app(FonnteService::class), 'in_progress');
        }

        \App\Services\ActivityLogger::log('update', 'it_helpdesk', "Mengubah tiket IT Helpdesk ({$ticket->ticket_number})", $ticket->ticket_number, $ticket);

        return response()->json($ticket);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $ticket = ItHelpdeskTicket::findOrFail($id);
        $ticketName = $ticket->ticket_number;
        $ticket->delete();

        \App\Services\ActivityLogger::log('delete', 'it_helpdesk', "Menghapus tiket IT Helpdesk ({$ticketName})", $ticketName);
        return response()->json(['message' => 'Ticket deleted successfully']);
    }

    /**
     * Approve/Start processing a ticket (by Admin) - Changes status to in_progress
     */
    public function approve(Request $request, string $id)
    {
        $ticket = ItHelpdeskTicket::findOrFail($id);
        
        if (!in_array($ticket->status, ['new', 'open'])) {
            return response()->json(['message' => 'Tiket sudah diproses atau tidak dapat disetujui.'], 422);
        }

        $ticket->update([
            'status' => 'in_progress',
            'it_staff_id' => auth()->id(),
        ]);

        $this->sendNotification($ticket, app(FonnteService::class), 'in_progress');

        \App\Services\ActivityLogger::log('approve', 'it_helpdesk', "Menerima dan memproses tiket IT Helpdesk ({$ticket->ticket_number})", $ticket->ticket_number, $ticket);

        return response()->json(['message' => 'Tiket berhasil diterima dan sedang diproses.', 'ticket' => $ticket]);
    }

    /**
     * Reject a ticket (by Admin)
     */
    public function reject(Request $request, string $id)
    {
        $validator = Validator::make($request->all(), [
            'reason' => ['required', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $ticket = ItHelpdeskTicket::findOrFail($id);
        
        if (!in_array($ticket->status, ['new', 'open', 'in_progress'])) {
            return response()->json(['message' => 'Tiket sudah selesai atau tidak dapat ditolak.'], 422);
        }

        $ticket->update([
            'status' => 'rejected',
            'followup_details' => $request->reason,
        ]);

        \App\Services\ActivityLogger::log('reject', 'it_helpdesk', "Menolak tiket IT Helpdesk ({$ticket->ticket_number})", $ticket->ticket_number, $ticket);

        return response()->json(['message' => 'Tiket berhasil ditolak.', 'ticket' => $ticket]);
    }

    /**
     * Complete a ticket (by Admin) - Changes status to waiting_user_approval
     */
    public function complete(Request $request, string $id)
    {
        $validator = Validator::make($request->all(), [
            'followup_details' => 'required|string',
            'password' => 'nullable|string',
            'it_staff_signature' => 'nullable|string',
            'completion_date' => 'required|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = auth()->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $ticket = ItHelpdeskTicket::findOrFail($id);

        $signatureToken = null;
        $signedAt = null;

        if ($request->password) {
            if (!\Illuminate\Support\Facades\Hash::check($request->password, $user->password)) {
                \Illuminate\Support\Facades\Log::warning("IT Helpdesk Complete: Password mismatch for staff {$user->nip}");
                return response()->json(['message' => 'Password SIPTU salah.'], 422);
            }
            if ($user->has_mfa && !app(\App\Services\TotpService::class)->verifyCodeOrRecovery($user, (string)$request->totp_code)) {
                return response()->json(['message' => 'Kode autentikasi MFA salah atau kadaluarsa. Pastikan Anda memasukkan 6 digit kode terbaru dari aplikasi Authenticator.'], 422);
            }
            $signatureToken = (string) Str::uuid();
            $signedAt = now();
        }

        $ticket->update([
            'status' => 'waiting_user_approval',
            'followup_details' => $request->followup_details,
            'it_staff_signature' => $request->it_staff_signature,
            'it_staff_signature_token' => $signatureToken,
            'it_staff_signed_at' => $signedAt,
            'completion_date' => $request->completion_date,
            'it_staff_id' => $user->id,
        ]);

        $this->sendNotification($ticket, app(FonnteService::class), 'waiting_user_approval');
        
        if ($ticket->employee_nip) {
            $empUser = \App\Models\User::where('nip', $ticket->employee_nip)->first();
            if ($empUser) {
                $empUser->notify(new \App\Notifications\GeneralNotification(
                    'Tiket IT Menunggu Konfirmasi Anda',
                    "Tiket {$ticket->ticket_number} telah diselesaikan oleh admin. Silakan cek aplikasi untuk mengonfirmasi dan memberikan tanda tangan elektronik Anda.",
                    $ticket->id,
                    'it_helpdesk'
                ));
            }
        }

        \App\Services\ActivityLogger::log('complete', 'it_helpdesk', "Menyelesaikan tiket IT Helpdesk ({$ticket->ticket_number}, Menunggu TTD User)", $ticket->ticket_number, $ticket);

        return response()->json($ticket);
    }

    /**
     * Confirm ticket completion by reporter
     */
    public function confirm(Request $request, string $id)
    {
        $validator = Validator::make($request->all(), [
            'password' => 'nullable|string',
            'reporter_signature' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $ticket = ItHelpdeskTicket::findOrFail($id);

        if (!in_array($ticket->status, ['waiting_user_approval', 'completed'], true)) {
            return response()->json(['message' => 'Tiket belum diselesaikan oleh IT Staff.'], 400);
        }

        $signatureToken = $ticket->reporter_signature_token;
        $signedAt = $ticket->reporter_signed_at;

        if ($request->password) {
            // If public, we need to find user by NIP
            $user = auth()->user();
            if (!$user && $ticket->employee_nip) {
                $user = \App\Models\User::where('nip', $ticket->employee_nip)->first();
            }

            if ($user && \Illuminate\Support\Facades\Hash::check($request->password, $user->password)) {
                if ($user->has_mfa && !app(\App\Services\TotpService::class)->verifyCodeOrRecovery($user, (string)$request->totp_code)) {
                    return response()->json(['message' => 'Kode autentikasi MFA salah atau kadaluarsa. Pastikan Anda memasukkan 6 digit kode terbaru dari aplikasi Authenticator.'], 422);
                }
                $signatureToken = (string) Str::uuid();
                $signedAt = now();
            } else {
                \Illuminate\Support\Facades\Log::warning("IT Helpdesk Confirm: Password mismatch or user not found for ticket #{$ticket->id}");
                return response()->json(['message' => 'Konfirmasi gagal: Password SIPTU salah atau User tidak ditemukan.'], 422);
            }
        }

        $ticket->update([
            'reporter_signature' => $request->reporter_signature ?? $ticket->reporter_signature,
            'reporter_signature_token' => $signatureToken,
            'reporter_signed_at' => $signedAt,
            'status' => 'completed',
            'updated_at' => now(),
        ]);

        \App\Services\ActivityLogger::log('confirm', 'it_helpdesk', "Mengkonfirmasi penyelesaian tiket IT Helpdesk ({$ticket->ticket_number})", $ticket->ticket_number, $ticket);

        return response()->json(['message' => 'Konfirmasi berhasil.', 'ticket' => $ticket]);
    }
    /**
     * Show public ticket details for confirmation
     */
    public function showPublic(string $id)
    {
        $ticket = ItHelpdeskTicket::findOrFail($id);
        // Return only necessary fields for security if needed, but for now full object is fine for this context
        return response()->json($ticket);
    }

    /**
     * Normalize incoming report type labels to DB-safe enum values.
     */
    private function normalizeReportType(string $reportType): string
    {
        $value = strtolower(trim($reportType));

        if ($value === 'hardware') {
            return 'hardware';
        }
        if ($value === 'software') {
            return 'software';
        }
        if ($value === 'network') {
            return 'network';
        }
        if ($value === 'other') {
            return 'other';
        }

        if (str_contains($value, 'printer') || str_contains($value, 'komputer') || str_contains($value, 'laptop')) {
            return 'hardware';
        }
        if (str_contains($value, 'jaringan')) {
            return 'network';
        }
        if (str_contains($value, 'aplikasi') || str_contains($value, 'bantuan it')) {
            return 'software';
        }

        return 'other';
    }
}
