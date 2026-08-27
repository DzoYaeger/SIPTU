<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\NotificationSetting;
use App\Models\PanjarRequest;
use App\Models\PanjarRequestItem;
use App\Models\PejabatPerbendaharaan;
use App\Models\User;
use App\Services\FonnteService;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class PanjarRequestController extends Controller
{
    const MODULE_KEY = 'simkeu';

    public function index(Request $request)
    {
        $query = PanjarRequest::with(['items', 'creator', 'approver', 'ppkUser', 'bendaharaUser']);
        $user = $request->user();
        if ($user) {
            $headerRole = strtolower($request->header('X-Current-Role') ?? '');
            $inputRole = strtolower($request->input('current_role') ?? '');
            $baseRole = strtolower($user->base_role ?? 'operator');
            $currentRole = strtolower($user->current_role ?? $baseRole);

            $isPowerUser = in_array($baseRole, ['admin', 'validator']) ||
                           in_array($currentRole, ['admin', 'validator']) ||
                           in_array($headerRole, ['admin', 'validator']) ||
                           in_array($inputRole, ['admin', 'validator']);

            if (!$isPowerUser) {
                $query->where('created_by', $user->id);
            }
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('ticket_no', 'like', "%{$search}%")
                    ->orWhere('panjar_no', 'like', "%{$search}%")
                    ->orWhere('surat_tugas_no', 'like', "%{$search}%")
                    ->orWhere('mak', 'like', "%{$search}%")
                    ->orWhere('kegiatan', 'like', "%{$search}%")
                    ->orWhere('uraian', 'like', "%{$search}%")
                    ->orWhere('penerima_name', 'like', "%{$search}%")
                    ->orWhereHas('creator', fn ($cq) => $cq->where('name', 'like', "%{$search}%"));
            });
        }

        if ($request->filled('status') && $request->status !== 'ALL') {
            $status = $request->status;
            if ($status === 'approved') {
                $query->whereIn('status', ['approved', 'paid']);
            } elseif ($status === 'rejected') {
                $query->where('status', 'rejected');
            } else {
                $query->where('status', $status);
            }
        }

        if ($request->filled('tahun_anggaran') && $request->tahun_anggaran !== 'ALL') {
            $query->where('tahun_anggaran', $request->tahun_anggaran);
        }

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('tanggal_pengajuan', [$request->start_date, $request->end_date]);
        }

        return response()->json([
            'status' => 'success',
            'data' => $query->orderBy('created_at', 'desc')->paginate($request->input('per_page', 15)),
        ]);
    }

    public function store(Request $request)
    {
        $validator = $this->validator($request);
        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'message' => 'Validasi gagal', 'errors' => $validator->errors()], 422);
        }

        try {
            DB::beginTransaction();
            $panjar = $this->persistPanjar(new PanjarRequest(), $request);
            DB::commit();

            // Send notification to PPK if request is submitted immediately
            if (in_array($panjar->status, ['submitted', 'menunggu_ppk'])) {
                $this->notifyPpk($panjar);
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Permintaan panjar berhasil dibuat',
                'data' => $panjar->load(['items', 'creator', 'approver', 'ppkUser', 'bendaharaUser']),
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['status' => 'error', 'message' => 'Gagal membuat panjar: ' . $e->getMessage()], 500);
        }
    }

    public function show($id)
    {
        $panjar = PanjarRequest::with(['items', 'creator', 'approver', 'ppkUser', 'bendaharaUser'])->find($id);
        if (!$panjar) {
            return response()->json(['status' => 'error', 'message' => 'Permintaan panjar tidak ditemukan'], 404);
        }

        return response()->json(['status' => 'success', 'data' => $panjar]);
    }

    public function update(Request $request, $id)
    {
        $panjar = PanjarRequest::find($id);
        if (!$panjar) {
            return response()->json(['status' => 'error', 'message' => 'Permintaan panjar tidak ditemukan'], 404);
        }

        $validator = $this->validator($request);
        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'message' => 'Validasi gagal', 'errors' => $validator->errors()], 422);
        }

        $oldStatus = $panjar->status;

        try {
            DB::beginTransaction();
            $panjar = $this->persistPanjar($panjar, $request);
            DB::commit();

            // If status changed to submitted, send notification to PPK
            if ($oldStatus !== 'submitted' && in_array($panjar->status, ['submitted', 'menunggu_ppk'])) {
                $this->notifyPpk($panjar);
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Permintaan panjar berhasil diperbarui',
                'data' => $panjar->load(['items', 'creator', 'approver', 'ppkUser', 'bendaharaUser']),
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['status' => 'error', 'message' => 'Gagal memperbarui panjar: ' . $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        $panjar = PanjarRequest::find($id);
        if (!$panjar) {
            return response()->json(['status' => 'error', 'message' => 'Permintaan panjar tidak ditemukan'], 404);
        }

        $panjar->items()->delete();
        $panjar->delete();
        return response()->json(['status' => 'success', 'message' => 'Permintaan panjar berhasil dihapus']);
    }

    /* ── Submit request to PPK ── */
    public function submit(Request $request, $id)
    {
        $panjar = PanjarRequest::with('items')->find($id);
        if (!$panjar) {
            return response()->json(['status' => 'error', 'message' => 'Permintaan panjar tidak ditemukan'], 404);
        }

        if (empty($panjar->token)) {
            $panjar->token = Str::random(40);
        }

        $panjar->update([
            'status' => 'submitted',
            'ppk_status' => 'pending',
            'ppk_notes' => null,
            'ppk_action_at' => null,
            'bendahara_status' => 'pending',
            'bendahara_notes' => null,
            'bendahara_action_at' => null,
            'rejection_stage' => null,
        ]);

        $panjar->refresh();
        $this->notifyPpk($panjar);

        return response()->json([
            'status' => 'success',
            'message' => 'Pengajuan panjar berhasil diajukan ke PPK. Notifikasi WhatsApp telah dikirimkan.',
            'data' => $panjar->load(['items', 'creator', 'approver', 'ppkUser', 'bendaharaUser']),
        ]);
    }

    /* ── PPK Validation (Authenticated) ── */
    public function validatePpk(Request $request, $id)
    {
        $panjar = PanjarRequest::with('items')->find($id);
        if (!$panjar) {
            return response()->json(['status' => 'error', 'message' => 'Permintaan panjar tidak ditemukan'], 404);
        }

        $payload = $request->validate([
            'action' => 'required|in:approve,reject',
            'notes' => 'nullable|string',
            'verifier_name' => 'nullable|string|max:255',
        ]);

        return $this->processPpkValidation($panjar, $payload, $request->user());
    }

    /* ── Bendahara Validation (Authenticated) ── */
    public function validateBendahara(Request $request, $id)
    {
        $panjar = PanjarRequest::with('items')->find($id);
        if (!$panjar) {
            return response()->json(['status' => 'error', 'message' => 'Permintaan panjar tidak ditemukan'], 404);
        }

        $payload = $request->validate([
            'action' => 'required|in:approve,reject',
            'notes' => 'nullable|string',
            'verifier_name' => 'nullable|string|max:255',
        ]);

        return $this->processBendaharaValidation($panjar, $payload, $request->user());
    }

    /* ── PUBLIC: Get detail by token for validation page ── */
    public function showPublic(string $token)
    {
        $panjar = PanjarRequest::with(['items', 'creator', 'approver', 'ppkUser', 'bendaharaUser'])
            ->where('token', $token)
            ->first();

        if (!$panjar) {
            return response()->json(['status' => 'error', 'message' => 'Tautan validasi panjar tidak valid atau telah kedaluwarsa.'], 404);
        }

        $pejabat = PejabatPerbendaharaan::with(['bendahara', 'ppk'])->first();

        return response()->json([
            'status' => 'success',
            'data' => $panjar,
            'pejabat_config' => [
                'ppk_name' => $pejabat?->ppk?->name ?? $panjar->ppk_name,
                'ppk_nip' => $pejabat?->ppk?->nip ?? $panjar->ppk_nip,
                'bendahara_name' => $pejabat?->bendahara?->name ?? $panjar->bendahara_name,
                'bendahara_nip' => $pejabat?->bendahara?->nip ?? $panjar->bendahara_nip,
            ],
        ]);
    }

    /* ── PUBLIC: PPK Validation via direct link ── */
    public function validatePpkPublic(Request $request, string $token)
    {
        $panjar = PanjarRequest::with('items')->where('token', $token)->first();
        if (!$panjar) {
            return response()->json(['status' => 'error', 'message' => 'Tautan validasi panjar tidak valid.'], 404);
        }

        $payload = $request->validate([
            'action' => 'required|in:approve,reject',
            'notes' => 'nullable|string',
            'verifier_name' => 'nullable|string|max:255',
        ]);

        return $this->processPpkValidation($panjar, $payload, null);
    }

    /* ── PUBLIC: Bendahara Validation via direct link ── */
    public function validateBendaharaPublic(Request $request, string $token)
    {
        $panjar = PanjarRequest::with('items')->where('token', $token)->first();
        if (!$panjar) {
            return response()->json(['status' => 'error', 'message' => 'Tautan validasi panjar tidak valid.'], 404);
        }

        $payload = $request->validate([
            'action' => 'required|in:approve,reject',
            'notes' => 'nullable|string',
            'verifier_name' => 'nullable|string|max:255',
        ]);

        return $this->processBendaharaValidation($panjar, $payload, null);
    }

    /* ── Helper: Process PPK Validation ── */
    private function processPpkValidation(PanjarRequest $panjar, array $payload, ?User $user)
    {
        $isApprove = $payload['action'] === 'approve';
        $notes = trim((string)($payload['notes'] ?? ''));
        $verifierName = trim((string)($payload['verifier_name'] ?? ''));

        if (empty($verifierName)) {
            $verifierName = $user?->name ?: ($panjar->ppk_name ?: 'PPK');
        }

        if ($isApprove) {
            $panjar->update([
                'status' => 'approved_ppk',
                'ppk_status' => 'approved',
                'ppk_notes' => $notes ?: null,
                'ppk_action_at' => now(),
                'ppk_user_id' => $user?->id,
                'ppk_name' => $verifierName,
                'rejection_stage' => null,
            ]);

            $panjar->refresh();
            $panjar->load('items');

            // Send WhatsApp notification to Bendahara
            $this->notifyBendahara($panjar);

            return response()->json([
                'status' => 'success',
                'message' => 'Pengajuan panjar berhasil disetujui oleh PPK. Notifikasi telah diteruskan ke Bendahara Pengeluaran.',
                'data' => $panjar->load(['items', 'creator', 'approver', 'ppkUser', 'bendaharaUser']),
            ]);
        } else {
            $panjar->update([
                'status' => 'rejected',
                'ppk_status' => 'rejected',
                'ppk_notes' => $notes ?: 'Ditolak oleh PPK',
                'ppk_action_at' => now(),
                'ppk_user_id' => $user?->id,
                'ppk_name' => $verifierName,
                'rejection_stage' => 'ppk',
            ]);

            $panjar->refresh();

            // Send WhatsApp notification to requester
            $this->notifyRequesterRejected($panjar, 'PPK', $notes ?: 'Ditolak oleh PPK', $verifierName);

            return response()->json([
                'status' => 'success',
                'message' => 'Pengajuan panjar telah ditolak oleh PPK. Notifikasi alasan penolakan telah dikirimkan ke pemohon.',
                'data' => $panjar->load(['items', 'creator', 'approver', 'ppkUser', 'bendaharaUser']),
            ]);
        }
    }

    /* ── Helper: Process Bendahara Validation ── */
    private function processBendaharaValidation(PanjarRequest $panjar, array $payload, ?User $user)
    {
        $isApprove = $payload['action'] === 'approve';
        $notes = trim((string)($payload['notes'] ?? ''));
        $verifierName = trim((string)($payload['verifier_name'] ?? ''));

        if (empty($verifierName)) {
            $verifierName = $user?->name ?: ($panjar->bendahara_name ?: 'Bendahara Pengeluaran');
        }

        if ($isApprove) {
            $panjar->update([
                'status' => 'approved',
                'bendahara_status' => 'approved',
                'bendahara_notes' => $notes ?: null,
                'bendahara_action_at' => now(),
                'bendahara_user_id' => $user?->id,
                'bendahara_name' => $verifierName,
                'approved_at' => now(),
                'approved_by' => $user?->id,
                'rejection_stage' => null,
            ]);

            $panjar->refresh();
            $panjar->load('items');

            // Send WhatsApp notification to requester
            $this->notifyRequesterApproved($panjar, $notes, $verifierName);

            return response()->json([
                'status' => 'success',
                'message' => 'Pengajuan panjar berhasil disetujui penuh oleh Bendahara. Notifikasi WhatsApp telah dikirimkan ke pemohon.',
                'data' => $panjar->load(['items', 'creator', 'approver', 'ppkUser', 'bendaharaUser']),
            ]);
        } else {
            $panjar->update([
                'status' => 'rejected',
                'bendahara_status' => 'rejected',
                'bendahara_notes' => $notes ?: 'Ditolak oleh Bendahara',
                'bendahara_action_at' => now(),
                'bendahara_user_id' => $user?->id,
                'bendahara_name' => $verifierName,
                'rejection_stage' => 'bendahara',
            ]);

            $panjar->refresh();

            // Send WhatsApp notification to requester
            $this->notifyRequesterRejected($panjar, 'Bendahara Pengeluaran', $notes ?: 'Ditolak oleh Bendahara', $verifierName);

            return response()->json([
                'status' => 'success',
                'message' => 'Pengajuan panjar telah ditolak oleh Bendahara. Notifikasi alasan penolakan telah dikirimkan ke pemohon.',
                'data' => $panjar->load(['items', 'creator', 'approver', 'ppkUser', 'bendaharaUser']),
            ]);
        }
    }

    public function exportPdf($id)
    {
        $panjar = PanjarRequest::with(['items', 'creator'])->find($id);
        if (!$panjar) {
            return response()->json(['status' => 'error', 'message' => 'Permintaan panjar tidak ditemukan'], 404);
        }

        $pejabat = PejabatPerbendaharaan::with(['bendahara', 'ppk'])->first();
        if (empty($panjar->ppk_name) && $pejabat?->ppk) {
            $panjar->ppk_name = $pejabat->ppk->name;
            $panjar->ppk_nip = $pejabat->ppk->nip;
        }
        if (empty($panjar->bendahara_name) && $pejabat?->bendahara) {
            $panjar->bendahara_name = $pejabat->bendahara->name;
            $panjar->bendahara_nip = $pejabat->bendahara->nip;
        }

        $empData = null;
        if ($panjar->penerima_name) {
            $emp = Employee::where('name', $panjar->penerima_name)->first();
            if ($emp) {
                $empData = [
                    'nama' => $emp->name,
                    'nip' => $emp->nip ?: '-',
                    'pangkat' => $emp->pangkat ?: '-',
                    'jabatan' => $emp->position ?: '-',
                ];
            }
        }

        if (!$empData) {
            $empData = [
                'nama' => $panjar->penerima_name ?: '-',
                'nip' => '-',
                'pangkat' => '-',
                'jabatan' => '-',
            ];
        }

        $base = $panjar->tanggal_pengajuan ?? $panjar->created_at;
        $tglPengajuan = Carbon::parse($base)->translatedFormat('d F Y');
        $tglMulai = $panjar->tanggal_mulai_kegiatan
            ? Carbon::parse($panjar->tanggal_mulai_kegiatan)->translatedFormat('d F Y')
            : '-';
        $tglAkhir = $panjar->tanggal_akhir_kegiatan
            ? Carbon::parse($panjar->tanggal_akhir_kegiatan)->translatedFormat('d F Y')
            : '-';
        $tglPalingLambat = $panjar->tanggal_paling_lambat
            ? Carbon::parse($panjar->tanggal_paling_lambat)->translatedFormat('d F Y')
            : '-';
        $tglCetak = Carbon::now()->translatedFormat('d F Y');

        $pdf = Pdf::loadView('pdf.panjar_request', [
            'panjar' => $panjar,
            'pegawai' => $empData,
            'tgl_pengajuan' => $tglPengajuan,
            'tgl_mulai' => $tglMulai,
            'tgl_akhir' => $tglAkhir,
            'tgl_paling_lambat' => $tglPalingLambat,
            'tgl_cetak' => $tglCetak,
        ])->setPaper('A4', 'portrait');

        $fileName = 'FORM_PERSETUJUAN_PANJAR_' . str_replace('/', '_', $panjar->panjar_no ?? $panjar->ticket_no) . '.pdf';
        return $pdf->stream($fileName);
    }

    private function validator(Request $request)
    {
        return Validator::make($request->all(), [
            'tahun_anggaran' => 'nullable|integer',
            'tanggal_pengajuan' => 'nullable|date',
            'tanggal_mulai_kegiatan' => 'nullable|date',
            'tanggal_akhir_kegiatan' => 'nullable|date',
            'panjar_no' => 'nullable|string|max:255',
            'surat_tugas_no' => 'nullable|string|max:255',
            'mak' => 'nullable|string|max:255',
            'kegiatan' => 'required|string|max:255',
            'uraian' => 'nullable|string',
            'penerima_name' => 'nullable|string|max:255',
            'requester_phone' => 'nullable|string|max:50',
            'nominal_panjar' => 'nullable|numeric|min:0',
            'status' => 'nullable|string|in:draft,submitted,menunggu_ppk,approved_ppk,menunggu_bendahara,approved,rejected,paid',
            'ppk_name' => 'nullable|string|max:255',
            'ppk_nip' => 'nullable|string|max:255',
            'bendahara_name' => 'nullable|string|max:255',
            'bendahara_nip' => 'nullable|string|max:255',
            'items' => 'nullable|array',
            'items.*.uraian' => 'required_with:items|string|max:255',
            'items.*.volume' => 'nullable|numeric|min:0',
            'items.*.satuan' => 'nullable|string|max:50',
            'items.*.harga_satuan' => 'nullable|numeric|min:0',
            'items.*.jumlah' => 'nullable|numeric|min:0',
            'items.*.keterangan' => 'nullable|string',
        ]);
    }

    private function persistPanjar(PanjarRequest $panjar, Request $request): PanjarRequest
    {
        $itemsData = collect($request->input('items', []))
            ->filter(fn ($item) => trim((string)($item['uraian'] ?? '')) !== '')
            ->values();

        $itemTotal = $itemsData->sum(function ($item) {
            $volume = (float)($item['volume'] ?? 0);
            $hargaSatuan = (float)($item['harga_satuan'] ?? 0);
            return (float)($item['jumlah'] ?? ($volume * $hargaSatuan));
        });

        $nominal = $itemTotal;
        $terbilang = InvoiceController::terbilang($nominal);

        // Tanggal paling lambat = H+7 dari tanggal akhir kegiatan
        $tglPalingLambat = null;
        if ($request->tanggal_akhir_kegiatan) {
            $tglPalingLambat = Carbon::parse($request->tanggal_akhir_kegiatan)->addDays(7)->toDateString();
        }

        $pejabat = PejabatPerbendaharaan::with(['bendahara', 'ppk'])->first();
        $ticketNo = $panjar->ticket_no ?: 'PNJ-' . date('Ymd') . '-' . str_pad((string)mt_rand(1, 9999), 4, '0', STR_PAD_LEFT);
        $token = $panjar->token ?: Str::random(40);

        // Resolve requester phone if not explicitly provided
        $requesterPhone = $request->requester_phone;
        if (empty($requesterPhone) && $request->user()) {
            $requesterPhone = $request->user()->phone_number ?: ($request->user()->employee?->phone_number ?? null);
        }
        if (empty($requesterPhone) && $request->penerima_name) {
            $requesterPhone = Employee::where('name', $request->penerima_name)->value('phone_number');
        }

        $panjar->fill([
            'ticket_no' => $ticketNo,
            'token' => $token,
            'panjar_no' => $request->panjar_no ?: $ticketNo,
            'tahun_anggaran' => $request->tahun_anggaran ?: date('Y'),
            'tanggal_pengajuan' => $request->tanggal_pengajuan ?: now()->toDateString(),
            'tanggal_mulai_kegiatan' => $request->tanggal_mulai_kegiatan,
            'tanggal_akhir_kegiatan' => $request->tanggal_akhir_kegiatan,
            'tanggal_paling_lambat' => $tglPalingLambat,
            'mak' => $request->mak,
            'kegiatan' => $request->kegiatan,
            'uraian' => $request->uraian,
            'penerima_name' => $request->penerima_name,
            'requester_phone' => $requesterPhone ?: ($panjar->requester_phone ?? null),
            'surat_tugas_no' => $request->surat_tugas_no,
            'nominal_panjar' => $nominal,
            'terbilang_panjar' => $terbilang,
            'status' => $request->status ?: ($panjar->status ?: 'draft'),
            'ppk_name' => $request->ppk_name ?: ($pejabat?->ppk?->name ?? null),
            'ppk_nip' => $request->ppk_nip ?: ($pejabat?->ppk?->nip ?? null),
            'bendahara_name' => $request->bendahara_name ?: ($pejabat?->bendahara?->name ?? null),
            'bendahara_nip' => $request->bendahara_nip ?: ($pejabat?->bendahara?->nip ?? null),
            'created_by' => $panjar->created_by ?: $request->user()?->id,
        ]);
        $panjar->save();

        $panjar->items()->delete();
        foreach ($itemsData as $index => $item) {
            $volume = (float)($item['volume'] ?? 0);
            $hargaSatuan = (float)($item['harga_satuan'] ?? 0);
            PanjarRequestItem::create([
                'panjar_request_id' => $panjar->id,
                'uraian' => $item['uraian'],
                'volume' => $volume,
                'satuan' => $item['satuan'] ?? null,
                'harga_satuan' => $hargaSatuan,
                'jumlah' => (float)($item['jumlah'] ?? ($volume * $hargaSatuan)),
                'keterangan' => $item['keterangan'] ?? null,
                'sort_order' => $index + 1,
            ]);
        }

        return $panjar;
    }

    /* ═══════════════════════════════════════════════════════════════════════
       WHATSAPP NOTIFICATIONS ENGINE
       ═══════════════════════════════════════════════════════════════════════ */

    /* ── 1. Notify PPK of new panjar submission ── */
    private function notifyPpk(PanjarRequest $panjar): void
    {
        $panjar->loadMissing('items');
        $targets = $this->resolvePpkPhone($panjar);
        if (empty($targets)) {
            Log::warning('[PanjarController] No target phone number found for PPK notification.', ['panjar_id' => $panjar->id]);
            return;
        }

        $frontendUrl = rtrim(config('app.frontend_url') ?: 'https://siptu.bpompalopo.com', '/');
        $approvalLink = "{$frontendUrl}/panjar/validasi/{$panjar->token}?role=ppk";

        $itemLines = $panjar->items->map(function ($item, $idx) {
            return sprintf('  %d. %s — Rp %s', $idx + 1, $item->uraian, number_format((float)$item->jumlah, 0, ',', '.'));
        })->toArray();

        $periode = '-';
        if ($panjar->tanggal_mulai_kegiatan && $panjar->tanggal_akhir_kegiatan) {
            $mulai = Carbon::parse($panjar->tanggal_mulai_kegiatan)->translatedFormat('d M Y');
            $akhir = Carbon::parse($panjar->tanggal_akhir_kegiatan)->translatedFormat('d M Y');
            $periode = "{$mulai} s.d. {$akhir}";
        } elseif ($panjar->tanggal_mulai_kegiatan) {
            $periode = Carbon::parse($panjar->tanggal_mulai_kegiatan)->translatedFormat('d F Y');
        }

        $message = implode("\n", array_filter([
            '📋 *PENGAJUAN PANJAR KEGIATAN BARU*',
            '━━━━━━━━━━━━━━━━━━━',
            '',
            "📌 *No. Panjar:* {$panjar->panjar_no}",
            "👤 *Penerima Dana:* {$panjar->penerima_name}",
            $panjar->mak ? "🏛 *Kode Akun:* {$panjar->mak}" : null,
            $panjar->surat_tugas_no ? "📜 *No. Surat Tugas:* {$panjar->surat_tugas_no}" : null,
            "🎯 *Kegiatan:* {$panjar->kegiatan}",
            "📅 *Periode:* {$periode}",
            "💰 *Total Panjar:* Rp " . number_format((float)$panjar->nominal_panjar, 0, ',', '.'),
            $panjar->terbilang_panjar ? "   _({$panjar->terbilang_panjar})_" : null,
            '',
            '📦 *Rincian Kebutuhan Anggaran:*',
            ...$itemLines,
            '',
            '━━━━━━━━━━━━━━━━━━━',
            '🔗 *Link Validasi PPK (Setujui / Tolak):*',
            $approvalLink,
            '',
            '⏰ Dikirim: ' . now()->translatedFormat('d F Y, H:i') . ' WITA',
        ]));

        $this->sendWhatsapp($targets, $message);
    }

    /* ── 2. Notify Bendahara that PPK approved panjar ── */
    private function notifyBendahara(PanjarRequest $panjar): void
    {
        $panjar->loadMissing('items');
        $targets = $this->resolveBendaharaPhone($panjar);
        if (empty($targets)) {
            Log::warning('[PanjarController] No target phone number found for Bendahara notification.', ['panjar_id' => $panjar->id]);
            return;
        }

        $frontendUrl = rtrim(config('app.frontend_url') ?: 'https://siptu.bpompalopo.com', '/');
        $approvalLink = "{$frontendUrl}/panjar/validasi/{$panjar->token}?role=bendahara";

        $itemLines = $panjar->items->map(function ($item, $idx) {
            return sprintf('  %d. %s — Rp %s', $idx + 1, $item->uraian, number_format((float)$item->jumlah, 0, ',', '.'));
        })->toArray();

        $message = implode("\n", array_filter([
            '📋 *PENGAJUAN PANJAR DISETUJUI PPK*',
            '*(Memerlukan Validasi Bendahara Pengeluaran)*',
            '━━━━━━━━━━━━━━━━━━━',
            '',
            "📌 *No. Panjar:* {$panjar->panjar_no}",
            "👤 *Penerima Dana:* {$panjar->penerima_name}",
            $panjar->mak ? "🏛 *Kode Akun:* {$panjar->mak}" : null,
            "🎯 *Kegiatan:* {$panjar->kegiatan}",
            "💰 *Total Panjar:* Rp " . number_format((float)$panjar->nominal_panjar, 0, ',', '.'),
            '',
            "✅ *Disetujui oleh PPK:* {$panjar->ppk_name}",
            $panjar->ppk_notes ? "📝 *Catatan PPK:* {$panjar->ppk_notes}" : null,
            '',
            '📦 *Rincian Anggaran:*',
            ...$itemLines,
            '',
            '━━━━━━━━━━━━━━━━━━━',
            '🔗 *Link Validasi Bendahara (Setujui / Tolak):*',
            $approvalLink,
            '',
            '⏰ Dikirim: ' . now()->translatedFormat('d F Y, H:i') . ' WITA',
        ]));

        $this->sendWhatsapp($targets, $message);
    }

    /* ── 3. Notify Requester of Rejection (by PPK or Bendahara) ── */
    private function notifyRequesterRejected(PanjarRequest $panjar, string $stageLabel, ?string $reason, ?string $verifierName): void
    {
        $phone = $this->resolveRequesterPhone($panjar);
        if (!$phone) {
            Log::warning('[PanjarController] No requester phone found for rejection notification.', ['panjar_id' => $panjar->id]);
            return;
        }

        $message = implode("\n", array_filter([
            "❌ *PENGAJUAN PANJAR DITOLAK ({$stageLabel})*",
            '━━━━━━━━━━━━━━━━━━━',
            '',
            "📌 *No. Panjar:* {$panjar->panjar_no}",
            "👤 *Penerima Dana:* {$panjar->penerima_name}",
            "🎯 *Kegiatan:* {$panjar->kegiatan}",
            "💰 *Total Pengajuan:* Rp " . number_format((float)$panjar->nominal_panjar, 0, ',', '.'),
            '',
            "🚫 *Ditolak oleh:* " . ($verifierName ?: $stageLabel),
            "📝 *Alasan / Keterangan:* " . ($reason ?: 'Pengajuan belum disetujui.'),
            '',
            '━━━━━━━━━━━━━━━━━━━',
            'ℹ️ *Keterangan:* Silakan periksa kembali rincian anggaran atau lakukan penyesuaian pengajuan panjar pada aplikasi SIPTU.',
            '',
            '⏰ ' . now()->translatedFormat('d F Y, H:i') . ' WITA',
        ]));

        $this->sendWhatsapp([$phone], $message);
    }

    /* ── 4. Notify Requester of Final Approval ── */
    private function notifyRequesterApproved(PanjarRequest $panjar, ?string $notes, ?string $verifierName): void
    {
        $phone = $this->resolveRequesterPhone($panjar);
        if (!$phone) {
            Log::warning('[PanjarController] No requester phone found for approval notification.', ['panjar_id' => $panjar->id]);
            return;
        }

        $message = implode("\n", array_filter([
            '✅ *PENGAJUAN PANJAR TELAH DISETUJUI*',
            '━━━━━━━━━━━━━━━━━━━',
            '',
            "📌 *No. Panjar:* {$panjar->panjar_no}",
            "👤 *Penerima Dana:* {$panjar->penerima_name}",
            "🎯 *Kegiatan:* {$panjar->kegiatan}",
            "💰 *Total Panjar:* Rp " . number_format((float)$panjar->nominal_panjar, 0, ',', '.'),
            $panjar->terbilang_panjar ? "   _({$panjar->terbilang_panjar})_" : null,
            '',
            '✅ *Status:* Disetujui PPK & Bendahara Pengeluaran',
            $verifierName ? "👤 *Bendahara:* {$verifierName}" : null,
            $notes ? "📝 *Catatan Bendahara:* {$notes}" : null,
            '',
            '━━━━━━━━━━━━━━━━━━━',
            '💵 *Langkah Selanjutnya:* Dana uang muka (panjar) siap diproses / dicairkan. Harap segera melengkapi LPJ maksimal 7 hari setelah kegiatan selesai.',
            '',
            '⏰ ' . now()->translatedFormat('d F Y, H:i') . ' WITA',
        ]));

        $this->sendWhatsapp([$phone], $message);
    }

    /* ── Phone Resolvers ── */
    private function resolveRequesterPhone(PanjarRequest $panjar): ?string
    {
        if (!empty($panjar->requester_phone)) {
            return $this->cleanPhoneNumber($panjar->requester_phone);
        }

        if ($panjar->created_by) {
            $user = User::with('employee')->find($panjar->created_by);
            if ($user?->phone_number) {
                return $this->cleanPhoneNumber($user->phone_number);
            }
            if ($user?->employee?->phone_number) {
                return $this->cleanPhoneNumber($user->employee->phone_number);
            }
        }

        if (!empty($panjar->penerima_name)) {
            $empPhone = Employee::where('name', $panjar->penerima_name)->value('phone_number');
            if ($empPhone) {
                return $this->cleanPhoneNumber($empPhone);
            }
        }

        return null;
    }

    private function resolvePpkPhone(PanjarRequest $panjar): array
    {
        $targets = [];

        // Check PejabatPerbendaharaan PPK
        $pejabat = PejabatPerbendaharaan::with('ppk')->first();
        if ($pejabat?->ppk?->phone_number) {
            $targets[] = $this->cleanPhoneNumber($pejabat->ppk->phone_number);
        }

        // Check if employee with panjar ppk_nip has phone
        if (empty($targets) && !empty($panjar->ppk_nip)) {
            $phone = Employee::where('nip', $panjar->ppk_nip)->value('phone_number');
            if ($phone) {
                $targets[] = $this->cleanPhoneNumber($phone);
            }
        }

        // Fallback to NotificationSetting recipients
        if (empty($targets)) {
            $setting = NotificationSetting::first();
            if ($setting) {
                $recipients = is_array($setting->recipients) ? $setting->recipients : [];
                $simkeuTargets = $recipients[self::MODULE_KEY] ?? ($recipients['panjar'] ?? []);
                if (!empty($simkeuTargets)) {
                    $targets = array_map([$this, 'cleanPhoneNumber'], $simkeuTargets);
                } elseif (!empty($setting->default_admin_numbers)) {
                    $targets = array_map([$this, 'cleanPhoneNumber'], $setting->default_admin_numbers);
                }
            }
        }

        return array_values(array_filter(array_unique($targets)));
    }

    private function resolveBendaharaPhone(PanjarRequest $panjar): array
    {
        $targets = [];

        // Check PejabatPerbendaharaan Bendahara
        $pejabat = PejabatPerbendaharaan::with('bendahara')->first();
        if ($pejabat?->bendahara?->phone_number) {
            $targets[] = $this->cleanPhoneNumber($pejabat->bendahara->phone_number);
        }

        // Check if employee with panjar bendahara_nip has phone
        if (empty($targets) && !empty($panjar->bendahara_nip)) {
            $phone = Employee::where('nip', $panjar->bendahara_nip)->value('phone_number');
            if ($phone) {
                $targets[] = $this->cleanPhoneNumber($phone);
            }
        }

        // Fallback to NotificationSetting recipients
        if (empty($targets)) {
            $setting = NotificationSetting::first();
            if ($setting) {
                $recipients = is_array($setting->recipients) ? $setting->recipients : [];
                $simkeuTargets = $recipients[self::MODULE_KEY] ?? ($recipients['panjar'] ?? []);
                if (!empty($simkeuTargets)) {
                    $targets = array_map([$this, 'cleanPhoneNumber'], $simkeuTargets);
                } elseif (!empty($setting->default_admin_numbers)) {
                    $targets = array_map([$this, 'cleanPhoneNumber'], $setting->default_admin_numbers);
                }
            }
        }

        return array_values(array_filter(array_unique($targets)));
    }

    private function cleanPhoneNumber(string $value): string
    {
        $clean = preg_replace('/\D/', '', $value);
        if (str_starts_with($clean, '0')) {
            $clean = '62' . substr($clean, 1);
        }
        return $clean;
    }

    private function sendWhatsapp(array $targets, string $message): void
    {
        $targets = array_values(array_filter(array_unique($targets)));
        if (empty($targets)) return;

        $setting = NotificationSetting::first();
        if (!$setting || empty($setting->fonnte_token)) {
            Log::info('[PanjarController] Fonnte token is not configured in NotificationSetting.');
            return;
        }

        try {
            app(FonnteService::class)->send(
                $setting->fonnte_endpoint ?? 'https://api.fonnte.com/send',
                $setting->fonnte_token,
                $targets,
                $message
            );
        } catch (\Throwable $e) {
            Log::error('[PanjarController] Failed to send WhatsApp notification: ' . $e->getMessage());
        }
    }
}