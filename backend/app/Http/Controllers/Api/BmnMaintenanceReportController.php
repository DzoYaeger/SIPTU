<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\BmnMaintenanceReport;
use App\Models\Employee;
use App\Models\NotificationSetting;
use App\Services\FonnteService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class BmnMaintenanceReportController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $query = BmnMaintenanceReport::with(['asset:id,name,asset_code', 'handler:id,name'])
            ->orderByDesc('created_at');

        if (!$this->isAdminOrValidator($user)) {
            $query->where('created_by', $user->id);
        }

        if ($request->filled('report_type')) {
            $query->where('report_type', $request->string('report_type'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($q) use ($search) {
                $q->where('report_number', 'like', "%{$search}%")
                    ->orWhere('reporter_name', 'like', "%{$search}%")
                    ->orWhere('report_details', 'like', "%{$search}%")
                    ->orWhere('asset_name', 'like', "%{$search}%");
            });
        }

        return response()->json($query->paginate(20));
    }

    public function store(Request $request, FonnteService $fonnteService)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $payload = $request->validate([
            'report_type' => ['required', 'in:pemeliharaan,keluhan'],
            'asset_id' => ['nullable', 'integer', 'exists:assets,id'],
            'report_details' => ['required', 'string'],
        ]);

        if ($payload['report_type'] === 'pemeliharaan' && empty($payload['asset_id'])) {
            return response()->json(['message' => 'Aset BMN wajib dipilih untuk laporan pemeliharaan.'], 422);
        }

        $employee = $user->employee;
        if (!$employee && $user->nip) {
            $employee = Employee::where('nip', $user->nip)->first();
        }

        $asset = null;
        if (!empty($payload['asset_id'])) {
            $asset = Asset::find($payload['asset_id']);
        }

        $report = BmnMaintenanceReport::create([
            'report_number' => $this->generateReportNumber(),
            'report_type' => $payload['report_type'],
            'asset_id' => $asset?->id,
            'asset_name' => $asset?->name,
            'report_details' => $payload['report_details'],
            'status' => 'new',
            'reporter_id' => $employee?->id,
            'reporter_nip' => $employee?->nip ?? $user->nip,
            'reporter_name' => $employee?->name ?? $employee?->nama ?? $user->name,
            'reporter_function' => $employee?->function_area ?? $employee?->fungsi_bidang,
            'reporter_phone' => $employee?->phone_number ?? $user->phone_number,
            'created_by' => $user->id,
        ]);

        try {
            $this->sendNotification($report, $fonnteService, 'new');
        } catch (\Throwable $e) {
            Log::warning('BMN maintenance report notification failed after create', [
                'report_id' => $report->id,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json($report->load('asset:id,name,asset_code'), 201);
    }

    public function update(Request $request, string $id, FonnteService $fonnteService)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }
        if (!$this->isAdminOrValidator($user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $payload = $request->validate([
            'status' => ['required', 'in:new,in_progress,completed,rejected'],
            'admin_notes' => ['nullable', 'string'],
        ]);

        $report = BmnMaintenanceReport::findOrFail($id);
        $report->update([
            'status' => $payload['status'],
            'admin_notes' => $payload['admin_notes'] ?? $report->admin_notes,
            'handled_by' => $user->id,
            'handled_at' => now(),
        ]);

        try {
            if (in_array($payload['status'], ['in_progress', 'completed'], true)) {
                $this->sendNotification($report, $fonnteService, $payload['status']);
            }
        } catch (\Throwable $e) {
            Log::warning('BMN maintenance report notification failed on status update', [
                'report_id' => $report->id,
                'status' => $payload['status'],
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json($report->load(['asset:id,name,asset_code', 'handler:id,name']));
    }

    /**
     * Approve/Start handling a maintenance report
     */
    public function approve(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }
        if (!$this->isAdminOrValidator($user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $report = BmnMaintenanceReport::findOrFail($id);

        if ($report->status !== 'new') {
            return response()->json(['message' => 'Laporan sudah diproses atau tidak dapat disetujui.'], 422);
        }

        $report->update([
            'status' => 'in_progress',
            'handled_by' => $user->id,
            'handled_at' => now(),
        ]);

        try {
            $this->sendNotification($report, app(FonnteService::class), 'in_progress');
        } catch (\Throwable $e) {
            Log::warning('BMN maintenance report notification failed on approve', [
                'report_id' => $report->id,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json(['message' => 'Laporan berhasil diterima dan sedang ditangani.', 'report' => $report->load(['asset:id,name,asset_code', 'handler:id,name'])]);
    }

    /**
     * Reject a maintenance report
     */
    public function reject(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }
        if (!$this->isAdminOrValidator($user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $payload = $request->validate([
            'reason' => ['required', 'string'],
        ]);

        $report = BmnMaintenanceReport::findOrFail($id);

        if (!in_array($report->status, ['new', 'in_progress'])) {
            return response()->json(['message' => 'Laporan sudah selesai atau tidak dapat ditolak.'], 422);
        }

        $report->update([
            'status' => 'rejected',
            'admin_notes' => $payload['reason'],
            'handled_by' => $user->id,
            'handled_at' => now(),
        ]);

        return response()->json(['message' => 'Laporan berhasil ditolak.', 'report' => $report->load(['asset:id,name,asset_code', 'handler:id,name'])]);
    }

    /**
     * Complete a maintenance report
     */
    public function complete(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }
        if (!$this->isAdminOrValidator($user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $payload = $request->validate([
            'admin_notes' => ['nullable', 'string'],
        ]);

        $report = BmnMaintenanceReport::findOrFail($id);

        if ($report->status === 'completed') {
            return response()->json(['message' => 'Laporan sudah selesai.'], 422);
        }

        $report->update([
            'status' => 'completed',
            'admin_notes' => $payload['admin_notes'] ?? $report->admin_notes,
            'handled_by' => $user->id,
            'handled_at' => now(),
        ]);

        try {
            $this->sendNotification($report, app(FonnteService::class), 'completed');
        } catch (\Throwable $e) {
            Log::warning('BMN maintenance report notification failed on complete', [
                'report_id' => $report->id,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json(['message' => 'Laporan berhasil diselesaikan.', 'report' => $report->load(['asset:id,name,asset_code', 'handler:id,name'])]);
    }

    private function generateReportNumber(): string
    {
        $prefix = 'BMR-' . now()->format('Ymd') . '-';
        $countToday = BmnMaintenanceReport::whereDate('created_at', now()->toDateString())->count() + 1;
        return $prefix . str_pad((string) $countToday, 4, '0', STR_PAD_LEFT);
    }

    private function isAdminOrValidator($user): bool
    {
        if (($user->base_role ?? null) === 'admin') {
            return true;
        }
        $roles = is_array($user->available_roles ?? null) ? $user->available_roles : [];
        return in_array('validator', $roles, true);
    }

    private function sendNotification(BmnMaintenanceReport $report, FonnteService $fonnteService, string $status): void
    {
        $setting = NotificationSetting::first();
        if (!$setting) {
            return;
        }

        $recipients = is_array($setting->recipients) ? $setting->recipients : [];
        $targets = [];
        $baseUrl = rtrim((string) config('app.frontend_url'), '/');

        if ($status === 'new') {
            $targets = array_merge(
                $recipients['bmn-pemeliharaan-keluhan'] ?? [],
                $recipients['bmn_pemeliharaan_keluhan'] ?? []
            );
            if (empty($targets)) {
                $targets = $setting->default_admin_numbers ?? [];
            }

            $detailLink = $baseUrl . '/app/bmn-pemeliharaan-keluhan';
            $messageLines = [
                '[SIPTU] Laporan BMN Baru',
                'No. Laporan: ' . $report->report_number,
                'Jenis: ' . ucfirst($report->report_type),
                'Pelapor: ' . ($report->reporter_name ?: '-'),
                'NIP: ' . ($report->reporter_nip ?: '-'),
                'Aset: ' . ($report->asset_name ?: '-'),
                'Detail: ' . $report->report_details,
                'Waktu: ' . now()->translatedFormat('d F Y H:i') . ' WITA',
                'Link Admin:',
                $detailLink,
            ];
        } else {
            $phone = $this->resolveReporterPhone($report);
            if ($phone) {
                $targets[] = $phone;
            }

            if ($status === 'in_progress') {
                $messageLines = [
                    '[SIPTU] Laporan BMN Sedang Dikerjakan',
                    'Halo ' . ($report->reporter_name ?: 'Pengguna') . ',',
                    'Laporan Anda (' . $report->report_number . ') sedang diproses petugas.',
                    'Jenis: ' . ucfirst($report->report_type),
                    'Aset: ' . ($report->asset_name ?: '-'),
                    'Mohon menunggu update selanjutnya.',
                ];
            } else {
                $messageLines = [
                    '[SIPTU] Laporan BMN Selesai Dikerjakan',
                    'Halo ' . ($report->reporter_name ?: 'Pengguna') . ',',
                    'Laporan Anda (' . $report->report_number . ') telah selesai ditangani.',
                    'Jenis: ' . ucfirst($report->report_type),
                    'Aset: ' . ($report->asset_name ?: '-'),
                    $report->admin_notes ? ('Catatan: ' . $report->admin_notes) : null,
                    'Terima kasih.',
                ];
            }
        }

        $targets = array_values(array_unique(array_filter(array_map(fn($v) => $this->normalizePhone($v), $targets))));
        if (empty($targets)) {
            return;
        }

        $message = implode("\n", array_filter($messageLines));

        $fonnteService->send(
            $setting->fonnte_endpoint ?? 'https://api.fonnte.com/send',
            $setting->fonnte_token ?? '',
            $targets,
            $message
        );
    }

    private function resolveReporterPhone(BmnMaintenanceReport $report): ?string
    {
        if (!empty($report->reporter_phone)) {
            return $report->reporter_phone;
        }

        if (!empty($report->reporter_nip)) {
            $employee = Employee::where('nip', $report->reporter_nip)->first();
            return $employee?->phone_number;
        }

        return null;
    }

    private function normalizePhone(?string $value): ?string
    {
        if (!$value) {
            return null;
        }

        $phone = preg_replace('/\D/', '', $value);
        if (!$phone) {
            return null;
        }

        if (str_starts_with($phone, '0')) {
            $phone = '62' . substr($phone, 1);
        }

        return $phone;
    }
}
