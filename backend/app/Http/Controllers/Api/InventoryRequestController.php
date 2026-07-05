<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\InventoryRequest;
use App\Models\InventoryRequestItem;
use App\Models\NotificationSetting;
use App\Services\FonnteService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class InventoryRequestController extends Controller
{
    private const MODULE_KEY = 'permintaan_persediaan';

    /* ─────────────────────────────────────────────────
       PUBLIC — Submit new SPB (no auth)
       ───────────────────────────────────────────────── */
    public function storePublic(Request $request)
    {
        $payload = $request->validate([
            'nip'                  => ['required', 'string'],
            'nama'                 => ['required', 'string'],
            'fungsi_bidang'        => ['nullable', 'string'],
            'purpose'              => ['nullable', 'string'],
            'requester_signature'  => ['required', 'string'],
            'items'                => ['required', 'array', 'min:1'],
            'items.*.inventory_id' => ['required', 'integer'],
            'items.*.item_name'    => ['required', 'string'],
            'items.*.qty_requested'=> ['required', 'integer', 'min:1'],
            'items.*.unit'         => ['nullable', 'string'],
        ]);

        $employee = Employee::where('nip', $payload['nip'])->first();
        $spbNumber = $this->generateSpbNumber();
        $token = Str::uuid()->toString();

        $inventoryRequest = InventoryRequest::create([
            'spb_number'         => $spbNumber,
            'token'              => $token,
            'requester_id'       => $employee?->id,
            'requester_nip'      => $payload['nip'],
            'requester_name'     => $payload['nama'],
            'requester_function' => $payload['fungsi_bidang'] ?? $employee?->function_area,
            'requester_phone'    => $this->normalizePhone($employee?->phone_number),
            'purpose'            => $payload['purpose'] ?? null,
            'requester_signature'=> $payload['requester_signature'],
            'status'             => 'pengajuan',
        ]);

        foreach ($payload['items'] as $item) {
            InventoryRequestItem::create([
                'inventory_request_id' => $inventoryRequest->id,
                'inventory_id'         => $item['inventory_id'],
                'item_name'            => $item['item_name'],
                'unit'                 => $item['unit'] ?? 'Pcs',
                'qty_requested'        => $item['qty_requested'],
            ]);
        }

        $inventoryRequest->load('items');

        // Send WhatsApp notification to admins
        $this->notifyAdmins($inventoryRequest);

        return response()->json($inventoryRequest, 201);
    }

    /* ─────────────────────────────────────────────────
       PUBLIC — Get request detail by token (for admin approval page)
       ───────────────────────────────────────────────── */
    public function showPublic(string $token)
    {
        $req = InventoryRequest::with('items')->where('token', $token)->firstOrFail();
        return response()->json($req);
    }

    /* ─────────────────────────────────────────────────
       PUBLIC — Approve request (admin via link, no auth required)
       ───────────────────────────────────────────────── */
    public function approvePublic(Request $request, string $token)
    {
        $inventoryRequest = InventoryRequest::with('items')
            ->where('token', $token)
            ->firstOrFail();

        if ($inventoryRequest->status !== 'pengajuan') {
            return response()->json(['message' => 'Permintaan ini sudah diproses.'], 422);
        }

        $payload = $request->validate([
            'items'               => ['required', 'array', 'min:1'],
            'items.*.id'          => ['required', 'integer'],
            'items.*.qty_approved'=> ['required', 'integer', 'min:0'],
            'approval_notes'      => ['nullable', 'string'],
            'approver_name'       => ['nullable', 'string'],
        ]);

        $sbbkNumber = $this->generateSbbkNumber();

        $inventoryRequest->update([
            'status'         => 'disetujui',
            'sbbk_number'    => $sbbkNumber,
            'approved_at'    => now(),
            'approval_notes' => $payload['approval_notes'] ?? null,
        ]);

        foreach ($payload['items'] as $itemData) {
            InventoryRequestItem::where('id', $itemData['id'])
                ->where('inventory_request_id', $inventoryRequest->id)
                ->update(['qty_approved' => $itemData['qty_approved']]);
        }

        $inventoryRequest->refresh();
        $inventoryRequest->load('items');

        // Notify user via WhatsApp
        $this->notifyRequester($inventoryRequest, $payload['approver_name'] ?? 'Admin');

        return response()->json($inventoryRequest);
    }

    /* ─────────────────────────────────────────────────
       PUBLIC — Reject request (admin via link)
       ───────────────────────────────────────────────── */
    public function rejectPublic(Request $request, string $token)
    {
        $inventoryRequest = InventoryRequest::with('items')
            ->where('token', $token)
            ->firstOrFail();

        if ($inventoryRequest->status !== 'pengajuan') {
            return response()->json(['message' => 'Permintaan ini sudah diproses.'], 422);
        }

        $payload = $request->validate([
            'approval_notes' => ['nullable', 'string'],
        ]);

        $inventoryRequest->update([
            'status'         => 'ditolak',
            'approved_at'    => now(),
            'approval_notes' => $payload['approval_notes'] ?? null,
        ]);

        // Notify user about rejection
        $this->notifyRequesterRejected($inventoryRequest);

        return response()->json($inventoryRequest);
    }

    /* ─────────────────────────────────────────────────
       AUTHENTICATED — List all requests (admin dashboard)
       ───────────────────────────────────────────────── */
    public function index()
    {
        $requests = InventoryRequest::with('items')
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json($requests);
    }

    /* ─────────────────────────────────────────────────
       AUTHENTICATED — Approve request (admin with auth)
       ───────────────────────────────────────────────── */
    public function approve(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $inventoryRequest = InventoryRequest::with('items')->findOrFail($id);

        if ($inventoryRequest->status !== 'pengajuan') {
            return response()->json(['message' => 'Permintaan ini sudah diproses.'], 422);
        }

        $payload = $request->validate([
            'items'               => ['required', 'array', 'min:1'],
            'items.*.id'          => ['required', 'integer'],
            'items.*.qty_approved'=> ['required', 'integer', 'min:0'],
            'approval_notes'      => ['nullable', 'string'],
        ]);

        $sbbkNumber = $this->generateSbbkNumber();

        $inventoryRequest->update([
            'status'         => 'disetujui',
            'sbbk_number'    => $sbbkNumber,
            'approved_at'    => now(),
            'approved_by'    => $user->id,
            'approval_notes' => $payload['approval_notes'] ?? null,
        ]);

        foreach ($payload['items'] as $itemData) {
            InventoryRequestItem::where('id', $itemData['id'])
                ->where('inventory_request_id', $inventoryRequest->id)
                ->update(['qty_approved' => $itemData['qty_approved']]);
        }

        $inventoryRequest->refresh();
        $inventoryRequest->load('items');

        // Notify user via WhatsApp
        $this->notifyRequester($inventoryRequest, $user->name ?? 'Admin');

        return response()->json($inventoryRequest);
    }

    /* ─────────────────────────────────────────────────
       AUTHENTICATED — Reject request (admin with auth)
       ───────────────────────────────────────────────── */
    public function reject(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $inventoryRequest = InventoryRequest::with('items')->findOrFail($id);

        if ($inventoryRequest->status !== 'pengajuan') {
            return response()->json(['message' => 'Permintaan ini sudah diproses.'], 422);
        }

        $payload = $request->validate([
            'approval_notes' => ['nullable', 'string'],
        ]);

        $inventoryRequest->update([
            'status'         => 'ditolak',
            'approved_at'    => now(),
            'approved_by'    => $user->id,
            'approval_notes' => $payload['approval_notes'] ?? null,
        ]);

        // Notify user about rejection
        $this->notifyRequesterRejected($inventoryRequest);

        return response()->json($inventoryRequest);
    }

    /* ═══════════════════════════════════════════════════
       PRIVATE HELPERS
       ═══════════════════════════════════════════════════ */

    private function generateSpbNumber(): string
    {
        $year = date('Y');
        $last = InventoryRequest::whereYear('created_at', $year)->count();
        return sprintf('SPB-%s-%04d', $year, $last + 1);
    }

    private function generateSbbkNumber(): string
    {
        $year = date('Y');
        $last = InventoryRequest::whereYear('approved_at', $year)
            ->whereNotNull('sbbk_number')
            ->count();
        return sprintf('SBBK-%s-%04d', $year, $last + 1);
    }

    private function normalizePhone(?string $value): ?string
    {
        if (!$value) return null;
        $phone = preg_replace('/\D/', '', $value);
        if (str_starts_with($phone, '0')) {
            $phone = '62' . substr($phone, 1);
        }
        return $phone;
    }

    /* ── WhatsApp: Notify admins of new SPB ── */
    private function notifyAdmins(InventoryRequest $req): void
    {
        $setting = NotificationSetting::first();
        if (!$setting) return;

        $recipients = is_array($setting->recipients) ? $setting->recipients : [];
        $targets = $recipients[self::MODULE_KEY] ?? [];
        if (empty($targets)) {
            $targets = $setting->default_admin_numbers ?? [];
        }
        if (empty($targets)) return;

        $frontendUrl = config('app.frontend_url');
        $approvalLink = "{$frontendUrl}/permintaan-persediaan/approve/{$req->token}";

        $itemLines = $req->items->map(function ($item, $idx) {
            return sprintf('  %d. %s — %d %s', $idx + 1, $item->item_name, $item->qty_requested, $item->unit);
        })->toArray();

        $message = implode("\n", array_filter([
            '📋 *PERMINTAAN PERSEDIAAN BARU (SPB)*',
            '━━━━━━━━━━━━━━━━━━━',
            '',
            "📌 *No. SPB:* {$req->spb_number}",
            "👤 *Pemohon:* {$req->requester_name}",
            "🔢 *NIP:* {$req->requester_nip}",
            $req->requester_function ? "🏛 *Fungsi/Bidang:* {$req->requester_function}" : null,
            $req->purpose ? "📝 *Keperluan:* {$req->purpose}" : null,
            '',
            "📦 *Barang Diminta:*",
            ...$itemLines,
            '',
            '━━━━━━━━━━━━━━━━━━━',
            '🔗 *Setujui / Tolak Permintaan:*',
            $approvalLink,
            '',
            '⏰ Dikirim: ' . now()->translatedFormat('d F Y, H:i') . ' WITA',
        ]));

        app(FonnteService::class)->send(
            $setting->fonnte_endpoint ?? '',
            $setting->fonnte_token ?? '',
            $targets,
            $message
        );
    }

    /* ── WhatsApp: Notify requester of approval ── */
    private function notifyRequester(InventoryRequest $req, string $approverName): void
    {
        $phone = $req->requester_phone;
        if (!$phone) return;

        $setting = NotificationSetting::first();
        if (!$setting) return;

        $itemLines = $req->items->map(function ($item, $idx) {
            $status = $item->qty_approved == $item->qty_requested
                ? '✅' : ($item->qty_approved > 0 ? '⚠️' : '❌');
            return sprintf('  %d. %s %s — Diminta: %d, Disetujui: %d %s',
                $idx + 1, $status, $item->item_name,
                $item->qty_requested, $item->qty_approved, $item->unit);
        })->toArray();

        $message = implode("\n", array_filter([
            '✅ *PERMINTAAN PERSEDIAAN DISETUJUI*',
            '━━━━━━━━━━━━━━━━━━━',
            '',
            "📌 *No. SPB:* {$req->spb_number}",
            "📌 *No. SBBK:* {$req->sbbk_number}",
            "👤 *Disetujui oleh:* {$approverName}",
            '',
            '📦 *Detail Persetujuan:*',
            ...$itemLines,
            '',
            $req->approval_notes ? "📝 *Catatan:* {$req->approval_notes}" : null,
            '',
            '━━━━━━━━━━━━━━━━━━━',
            '⏰ ' . now()->translatedFormat('d F Y, H:i') . ' WITA',
        ]));

        app(FonnteService::class)->send(
            $setting->fonnte_endpoint ?? '',
            $setting->fonnte_token ?? '',
            [$phone],
            $message
        );
    }

    /* ── WhatsApp: Notify requester of rejection ── */
    private function notifyRequesterRejected(InventoryRequest $req): void
    {
        $phone = $req->requester_phone;
        if (!$phone) return;

        $setting = NotificationSetting::first();
        if (!$setting) return;

        $message = implode("\n", array_filter([
            '❌ *PERMINTAAN PERSEDIAAN DITOLAK*',
            '━━━━━━━━━━━━━━━━━━━',
            '',
            "📌 *No. SPB:* {$req->spb_number}",
            "👤 *Pemohon:* {$req->requester_name}",
            '',
            $req->approval_notes ? "📝 *Alasan:* {$req->approval_notes}" : null,
            '',
            '━━━━━━━━━━━━━━━━━━━',
            '⏰ ' . now()->translatedFormat('d F Y, H:i') . ' WITA',
        ]));

        app(FonnteService::class)->send(
            $setting->fonnte_endpoint ?? '',
            $setting->fonnte_token ?? '',
            [$phone],
            $message
        );
    }
}
