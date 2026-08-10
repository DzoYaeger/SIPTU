<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SuratTugas;
use App\Models\SuratTugasDocument;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Hash;
use App\Services\TemplateService;
use App\Models\NotificationSetting;
use App\Models\User;
use App\Models\MakSuggestion;
use App\Services\FonnteService;
use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;
use chillerlan\QRCode\Common\EccLevel;
use chillerlan\QRCode\Output\QRMarkupSVG;

class SuratTugasController extends Controller
{
    /**
     * List semua surat tugas (protected).
     */
    public function index(Request $request)
    {
        $query = SuratTugas::with(['employees', 'penandatangan', 'creator']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('nomor_st', 'like', "%$s%")
                  ->orWhere('mak', 'like', "%$s%")
                  ->orWhere('sarana_nama', 'like', "%$s%")
                  ->orWhere('lokasi_tugas', 'like', "%$s%")
                  ->orWhere('deskripsi_tugas', 'like', "%$s%")
                  ->orWhereHas('employees', function ($eq) use ($s) {
                      $eq->where('name', 'like', "%$s%");
                  });
            });
        }

        $data = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json($data);
    }

    /**
     * List surat tugas milik user (baik sebagai pengaju maupun yang ditagging/ditugaskan).
     */
    public function myAssignments(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $userId = $user->id;
        $nip = $user->nip ?? $user->username;
        $employeeId = $user->employee_id ?? optional($user->employee)->id;

        if (!$employeeId) {
            $emp = \App\Models\Employee::where('user_id', $userId)
                ->orWhere('nip', $nip)
                ->first();
            if ($emp) {
                $employeeId = $emp->id;
            }
        }

        $query = SuratTugas::with(['employees', 'penandatangan', 'ketuaTim', 'creator']);

        $query->where(function ($q) use ($employeeId, $userId, $nip) {
            if ($userId) {
                $q->orWhere('created_by', $userId);
                if (\Illuminate\Support\Facades\Schema::hasColumn('surat_tugas', 'user_id')) {
                    $q->orWhere('user_id', $userId);
                }
            }
            if ($nip) {
                if (\Illuminate\Support\Facades\Schema::hasColumn('surat_tugas', 'nip_pemohon')) {
                    $q->orWhere('nip_pemohon', $nip);
                }
                $q->orWhereHas('employees', function ($eq) use ($nip) {
                    $eq->where('employees.nip', $nip);
                });
            }
            if ($employeeId) {
                $q->orWhere('ketua_tim_id', $employeeId)
                  ->orWhere('penandatangan_id', $employeeId)
                  ->orWhereHas('employees', function ($eq) use ($employeeId) {
                      $eq->where('employees.id', $employeeId);
                  });
            }
        });

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('nomor_st', 'like', "%$s%")
                  ->orWhere('mak', 'like', "%$s%")
                  ->orWhere('sarana_nama', 'like', "%$s%")
                  ->orWhere('lokasi_tugas', 'like', "%$s%")
                  ->orWhere('deskripsi_tugas', 'like', "%$s%")
                  ->orWhereHas('employees', function ($eq) use ($s) {
                      $eq->where('employees.name', 'like', "%$s%");
                  });
            });
        }

        $perPage = (int) $request->input('per_page', 100);
        $data = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json($data);
    }

    /**
     * Detail surat tugas.
     */
    public function show($id)
    {
        $st = SuratTugas::with(['employees', 'penandatangan', 'creator'])->findOrFail($id);
        return response()->json($st);
    }

    /**
     * Simpan surat tugas dari Layanan Mandiri (public, no auth).
     * Supports multiple sarana (stored as semicolon-separated).
     */
    public function storePublic(Request $request, FonnteService $fonnteService)
    {
        return $this->storeInternal($request, $fonnteService);
    }

    /**
     * Simpan surat tugas dari aplikasi (protected, auth).
     */
    public function store(Request $request, FonnteService $fonnteService)
    {
        $user = $request->user();
        return $this->storeInternal($request, $fonnteService, $user?->id);
    }

    private function storeInternal(Request $request, FonnteService $fonnteService, ?int $createdBy = null)
    {
        $validator = Validator::make($request->all(), [
            'employee_ids'    => 'nullable|array',
            'employee_ids.*'  => 'exists:employees,id',
            'ketua_tim_id'    => 'nullable|exists:employees,id',
            'tanggal_mulai'   => 'required|date',
            'tanggal_selesai' => 'required|date|after_or_equal:tanggal_mulai',
            'mak'             => 'nullable|string|max:255',
            'lokasi_tugas'    => 'nullable|string|max:500',
            'deskripsi_tugas' => 'nullable|string',
            'sarana'          => 'nullable|array',
            'sarana.*.id'     => 'nullable|integer',
            'sarana.*.nama'   => 'nullable|string|max:255',
            'sarana.*.lokasi' => 'nullable|string|max:500',
            'external_participants' => 'nullable|array',
            'external_participants.*.nip' => 'nullable|string|max:255',
            'external_participants.*.name' => 'required|string|max:255',
            'external_participants.*.pangkat' => 'nullable|string|max:255',
            'external_participants.*.jabatan' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Custom validation: at least 1 participant (internal or external)
        $employeeIds = $request->input('employee_ids', []);
        $externalParticipants = $request->input('external_participants', []);
        if (empty($employeeIds) && empty($externalParticipants)) {
            return response()->json(['errors' => ['employee_ids' => ['Minimal 1 pegawai (internal atau luar) harus dipilih.']]], 422);
        }

        // ── Verify Password & MFA BEFORE creating Surat Tugas ──
        if ($request->password) {
            $user = $createdBy ? User::find($createdBy) : null;
            if (!$user) {
                return response()->json(['message' => 'Akun pengguna tidak ditemukan.'], 404);
            }
            if (!\Illuminate\Support\Facades\Hash::check($request->password, $user->password)) {
                return response()->json(['message' => 'Password SIPTU salah. Gagal membuat pengajuan Surat Tugas.'], 422);
            }
            if ($user->has_mfa && !app(\App\Services\TotpService::class)->verifyCodeOrRecovery($user, (string)$request->input('totp_code', ''))) {
                return response()->json(['message' => 'Kode autentikasi MFA salah atau kadaluarsa. Pastikan Anda memasukkan 6 digit kode terbaru dari aplikasi Authenticator.'], 422);
            }
        }

        // Process sarana data — store as semicolon-separated
        $saranaData  = $request->sarana ?? [];
        $saranaIds   = collect($saranaData)->pluck('id')->filter()->values()->toArray();
        $saranaNames = collect($saranaData)->pluck('nama')->filter()->values()->toArray();
        $saranaLocs  = collect($saranaData)->pluck('lokasi')->filter()->values()->toArray();

        $st = SuratTugas::create([
            'tanggal_mulai'   => $request->tanggal_mulai,
            'tanggal_selesai' => $request->tanggal_selesai,
            'mak'             => $request->mak,
            'lokasi_tugas'    => $request->lokasi_tugas,
            'deskripsi_tugas' => $request->deskripsi_tugas,
            'sarana_id'       => !empty($saranaIds) ? (int) $saranaIds[0] : null,
            'sarana_nama'     => !empty($saranaNames) ? implode('; ', $saranaNames) : null,
            'sarana_lokasi'   => !empty($saranaLocs) ? implode('; ', $saranaLocs) : null,
            'ketua_tim_id'    => $request->ketua_tim_id ?: null,
            'external_participants' => $externalParticipants,
            'status'          => 'draft',
            'created_by'      => $createdBy,
        ]);

        if (!empty($employeeIds)) {
            $syncData = [];
            foreach ($employeeIds as $index => $id) {
                $syncData[$id] = ['sort_order' => $index + 1];
            }
            $st->employees()->attach($syncData);
        }
        $st->load('employees', 'ketuaTim');

        // Atomic signing if password provided by Katim (password+MFA already validated above)
        $isKatim = false;
        if ($request->password && $createdBy) {
            $user = $user ?? User::find($createdBy);
            if ($user && $st->ketuaTim && ($st->ketuaTim->user_id === $user->id || $st->ketuaTim->nip === $user->nip)) {
                $st->signature_token = (string) \Illuminate\Support\Str::uuid();
                $st->signed_at = now();
                $st->signed_by = $user->id;
                $st->save();
                $isKatim = true;

                // Notify Kepala Balai for the next step
                try {
                    $this->notifyKepalaBalaiForSign($st, $fonnteService);
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::warning('Notification to Kepala Balai failed after atomic sign: ' . $e->getMessage());
                }
            }
        }

        try {
            if (!$isKatim) {
                // Notify Katim to sign if not signed yet
                $this->notifyKetuaTimForSign($st, $fonnteService);
            }
            // Also notify Admin as usual
            $this->sendNotification($st, $fonnteService);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Surat tugas notification failed after create', [
                'surat_tugas_id' => $st->id,
                'error' => $e->getMessage(),
            ]);
        }

        // Save MAK suggestion
        if ($st->mak) {
            MakSuggestion::firstOrCreate(['mak' => trim($st->mak)]);
        }

        return response()->json([
            'message' => 'Surat Tugas berhasil dibuat',
            'data'    => $st,
        ], 201);
    }

    /**
     * Lengkapi data surat tugas (Nomor ST, Tanggal ST, Penandatangan, PLH, Template).
     */
    public function completeData(Request $request, $id, FonnteService $fonnteService)
    {
        $st = SuratTugas::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'nomor_st'          => 'required|string|max:255',
            'tanggal_st'        => 'required|date',
            'penandatangan_id'  => 'required|exists:employees,id',
            'status_jabatan'    => 'required|in:tetap,plh',
            'template_file'     => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $st->update([
            'nomor_st'          => $request->nomor_st,
            'tanggal_st'        => $request->tanggal_st,
            'penandatangan_id'  => $request->penandatangan_id,
            'status_jabatan'    => $request->status_jabatan,
            'template_file'     => $request->template_file,
            'status'            => 'lengkap',
            'signature_token'   => $st->signature_token ?: (string) \Illuminate\Support\Str::uuid(),
        ]);

        $st->load(['employees', 'penandatangan']);

        try {
            $this->notifySuratTugasLengkap($st, $fonnteService);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Surat tugas notification (lengkap) failed', [
                'surat_tugas_id' => $st->id,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json([
            'message' => 'Data Surat Tugas berhasil dilengkapi',
            'data'    => $st,
        ]);
    }

    public function resendLengkapNotification(Request $request, $id, FonnteService $fonnteService)
    {
        $st = SuratTugas::with(['employees', 'penandatangan'])->findOrFail($id);

        if ($st->status !== 'lengkap') {
            return response()->json(['message' => 'Hanya surat tugas berstatus LENGKAP yang dapat dikirim notifikasinya.'], 400);
        }

        try {
            $this->notifySuratTugasLengkap($st, $fonnteService);
            return response()->json(['message' => 'Notifikasi berhasil dikirim ulang.']);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Gagal mengirim notifikasi.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function resetToDraft(Request $request, $id)
    {
        $st = SuratTugas::findOrFail($id);
        
        if ($st->status !== 'invalid_tte') {
            return response()->json(['message' => 'Hanya surat tugas dengan status Invalid TTE yang dapat dikembalikan ke Draft.'], 400);
        }

        $st->update(['status' => 'draft']);

        return response()->json(['message' => 'Status berhasil diubah kembali ke Draft.']);
    }

    /**
     * Update data surat tugas oleh pengguna (riwayat layanan).
     */
    public function updateUserData(Request $request, $id)
    {
        $user = $request->user();
        $employee = Employee::query()->where('nip', $user->nip)->first();

        $st = SuratTugas::with('employees')->findOrFail($id);

        $isAllowed = $st->created_by === $user->id;
        if (!$isAllowed && $employee) {
            $isAllowed = $st->employees->contains('id', $employee->id);
        }
        if (!$isAllowed && $user->nip) {
            $isAllowed = $st->employees->contains('nip', $user->nip);
        }

        if (!$isAllowed) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }

        if (in_array(($st->status ?? 'draft'), ['selesai'])) {
            return response()->json([
                'message' => 'Surat tugas yang sudah selesai sepenuhnya tidak dapat diedit lagi.',
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'employee_ids'    => 'nullable|array',
            'employee_ids.*'  => 'exists:employees,id',
            'ketua_tim_id'    => 'nullable|exists:employees,id',
            'tanggal_mulai'   => 'required|date',
            'tanggal_selesai' => 'required|date|after_or_equal:tanggal_mulai',
            'mak'             => 'nullable|string|max:255',
            'lokasi_tugas'    => 'nullable|string|max:500',
            'deskripsi_tugas' => 'nullable|string',
            'password'        => 'nullable|string',
            'sarana'          => 'nullable|array',
            'sarana.*.id'     => 'nullable|integer',
            'sarana.*.nama'   => 'nullable|string|max:255',
            'sarana.*.lokasi' => 'nullable|string|max:500',
            'external_participants' => 'nullable|array',
            'external_participants.*.nip' => 'nullable|string|max:255',
            'external_participants.*.name' => 'required|string|max:255',
            'external_participants.*.pangkat' => 'nullable|string|max:255',
            'external_participants.*.jabatan' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $employeeIds = $request->input('employee_ids', []);
        $externalParticipants = $request->input('external_participants', []);
        if (empty($employeeIds) && empty($externalParticipants)) {
            return response()->json(['errors' => ['employee_ids' => ['Minimal 1 pegawai (internal atau luar) harus dipilih.']]], 422);
        }

        $ketuaTimId = $request->input('ketua_tim_id') ? (int) $request->input('ketua_tim_id') : null;
        // Process sarana data — store as semicolon-separated
        $saranaData  = $request->sarana ?? [];
        $saranaIds   = collect($saranaData)->pluck('id')->filter()->values()->toArray();
        $saranaNames = collect($saranaData)->pluck('nama')->filter()->values()->toArray();
        $saranaLocs  = collect($saranaData)->pluck('lokasi')->filter()->values()->toArray();

        $oldMak = $st->mak;
        $updateData = [
            'tanggal_mulai'   => $request->tanggal_mulai,
            'tanggal_selesai' => $request->tanggal_selesai,
            'mak'             => $request->mak,
            'lokasi_tugas'    => $request->lokasi_tugas,
            'deskripsi_tugas' => $request->deskripsi_tugas,
            'sarana_id'       => !empty($saranaIds) ? (int) $saranaIds[0] : null,
            'sarana_nama'     => !empty($saranaNames) ? implode('; ', $saranaNames) : null,
            'sarana_lokasi'   => !empty($saranaLocs) ? implode('; ', $saranaLocs) : null,
            'ketua_tim_id'    => $ketuaTimId,
            'external_participants' => $externalParticipants,
        ];

        // Handle re-signing TTE with password if provided
        if ($request->filled('password')) {
            if (Hash::check($request->password, $user->password)) {
                $updateData['signature_token'] = (string) Str::uuid();
                $updateData['signed_at'] = now();
                $updateData['signed_by'] = $user->id;
            } else {
                return response()->json(['message' => 'Password SIPTU salah. Gagal memperbarui TTE.'], 422);
            }
        }

        $st->update($updateData);

        $syncData = [];
        foreach ($employeeIds as $index => $id) {
            $syncData[$id] = ['sort_order' => $index + 1];
        }
        $st->employees()->sync($syncData);
        $st->load(['employees', 'ketuaTim']);

        // Save MAK suggestion
        if ($st->mak) {
            MakSuggestion::firstOrCreate(['mak' => trim($st->mak)]);
        }

        // Cleanup old MAK if changed and no longer used
        if ($oldMak && trim($oldMak) !== trim($st->mak)) {
            $this->cleanupUnusedMak($oldMak);
        }

        return response()->json([
            'message' => 'Data surat tugas berhasil diperbarui.',
            'data' => $st,
        ]);
    }

    /**
     * Tanda tangan ulang (Re-sign) TTE oleh Pembuat/Petugas ST.
     */
    public function reSign(Request $request, $id, FonnteService $fonnteService)
    {
        $validator = Validator::make($request->all(), [
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = $request->user();
        $st = SuratTugas::with(['employees', 'ketuaTim', 'creator'])->findOrFail($id);

        $employee = Employee::query()->where('nip', $user->nip)->first();
        $isAllowed = ($st->created_by === $user->id) ||
                     ($st->user_id === $user->id) ||
                     ($st->ketua_tim_id && $employee && $st->ketua_tim_id === $employee->id) ||
                     ($st->ketuaTim && ($st->ketuaTim->nip === $user->nip || $st->ketuaTim->user_id === $user->id));

        if (!$isAllowed) {
            return response()->json(['message' => 'Anda tidak memiliki hak akses untuk menandatangani surat tugas ini.'], 403);
        }

        if (!Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Password SIPTU yang Anda masukkan salah.'], 422);
        }

        $st->signature_token = (string) Str::uuid();
        $st->signed_at = now();
        $st->signed_by = $user->id;
        $st->save();

        try {
            $this->notifyKetuaTimForSign($st, $fonnteService);
        } catch (\Throwable $e) {
            Log::warning('Re-sign notification error: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Tanda tangan TTE berhasil diperbarui secara sah!',
            'data' => $st,
        ]);
    }

    /**
     * Delete Surat Tugas.
     */
    public function destroy($id)
    {
        $st = SuratTugas::findOrFail($id);
        $mak = $st->mak;
        $st->delete();

        if ($mak) {
            $this->cleanupUnusedMak($mak);
        }

        return response()->json(['message' => 'Surat Tugas berhasil dihapus']);
    }

    /**
     * Helper to cleanup MAK suggestion if no longer used by any Surat Tugas.
     */
    private function cleanupUnusedMak($mak)
    {
        if (!$mak) return;
        $mak = trim($mak);
        $count = SuratTugas::where('mak', $mak)->count();
        if ($count === 0) {
            MakSuggestion::where('mak', $mak)->delete();
        }
    }

    /**
     * Export template Surat Tugas
     */
    public function generateTemplate(TemplateService $templateService, $id)
    {
        $st = SuratTugas::with(['employees', 'penandatangan'])->findOrFail($id);

        if (!$st->template_file) {
            return response()->json(['error' => 'Template belum diatur'], 400);
        }

        $templateFile = ltrim((string) $st->template_file, '/\\');
        if (str_contains($templateFile, '..')) {
            return response()->json(['error' => 'Path template tidak valid'], 400);
        }

        $candidatePaths = array_values(array_unique([
            storage_path('app/' . $templateFile),
            storage_path('app/templates/' . $templateFile),
            storage_path('app/public/' . $templateFile),
        ]));

        $templatePath = null;
        foreach ($candidatePaths as $candidatePath) {
            if (file_exists($candidatePath)) {
                $templatePath = $candidatePath;
                break;
            }
        }

        if (!$templatePath) {
            return response()->json(['error' => 'File template tidak ditemukan'], 404);
        }

        $extension = strtolower((string) pathinfo($templatePath, PATHINFO_EXTENSION));
        if (!in_array($extension, ['docx', 'xlsx', 'xls'])) {
             return response()->json(['error' => 'Format template tidak didukung'], 400);
        }

        if (in_array($extension, ['docx', 'xlsx']) && !class_exists(\ZipArchive::class)) {
            return response()->json([
                'error' => 'Ekstensi PHP ZipArchive (php-zip) belum aktif di server. Hubungi admin server untuk mengaktifkannya.',
            ], 500);
        }

        $filename = 'Surat_Tugas_' . Str::slug($st->nomor_st ?? 'Draft') . '_' . time() . '.' . $extension;

        // Save generated documents in a persistent cache directory (not temp)
        $cacheDir = 'generated_documents';
        $storagePath = storage_path('app/' . $cacheDir);
        if (!file_exists($storagePath)) {
            mkdir($storagePath, 0755, true);
        }
        $filePath = $storagePath . '/' . $filename;

        // Prepare simple data
        \Carbon\Carbon::setLocale('id');
        $simpleData = [
            '{NOMOR_ST}'              => $st->nomor_st,
            '{TANGGAL_ST}'            => $st->tanggal_st ? \Carbon\Carbon::parse($st->tanggal_st)->translatedFormat('d F Y') : '',
            '{TANGGAL_MULAI}'         => $st->tanggal_mulai ? \Carbon\Carbon::parse($st->tanggal_mulai)->translatedFormat('d F Y') : '',
            '{TANGGAL_SELESAI}'       => $st->tanggal_selesai ? \Carbon\Carbon::parse($st->tanggal_selesai)->translatedFormat('d F Y') : '',
            '{MAK}'                   => $st->mak,
            '{LOKASI_TUGAS}'          => $st->lokasi_tugas,
            '{DESKRIPSI_TUGAS}'       => $st->deskripsi_tugas,
            
            // Penandatangan
            '{PENANDATANGAN}'         => $st->penandatangan ? $st->penandatangan->name : '',
            '{NIP_PENANDATANGAN}'     => $st->penandatangan ? $st->penandatangan->nip : '',
            '{JABATAN_PENANDATANGAN}' => $st->status_jabatan === 'plh' ? 'Plh. Kepala Balai POM di Palopo' : 'Kepala Balai POM di Palopo',
            '{STATUS_JABATAN}'        => $st->status_jabatan === 'plh' ? 'PLH ' : '',
        ];

        // Resolve Ketua Tim and add to simple data
        $ketuaTim = $st->ketuaTim;
        if ($ketuaTim) {
            $simpleData['{NAMA_PEGAWAI_1}'] = $ketuaTim->name ?? '';
            $simpleData['{NIP_PEGAWAI_1}']  = $ketuaTim->nip ?? '';
        } else {
            // Check external participants for ketua tim
            $extParts = is_array($st->external_participants) ? $st->external_participants : [];
            foreach ($extParts as $ext) {
                if (!empty($ext['is_ketua_tim'])) {
                    $simpleData['{NAMA_PEGAWAI_1}'] = $ext['name'] ?? '';
                    $simpleData['{NIP_PEGAWAI_1}']  = $ext['nip'] ?? '';
                    break;
                }
            }
        }

        // Format employee list
        $employees = $st->employees->toArray();

        // Merge external participants if exists
        if (!empty($st->external_participants)) {
            foreach ($st->external_participants as $ext) {
                $employees[] = [
                    'name' => $ext['name'] ?? '',
                    'nip' => $ext['nip'] ?? '',
                    'position' => $ext['jabatan'] ?? '', // Position usually maps to jabatan in templates
                    'pangkat' => $ext['pangkat'] ?? '',
                    'is_external' => true,
                ];
            }
        }

        // Format sarana list
        $saranaData = [];
        if ($st->sarana_nama) {
            $namas = explode(';', $st->sarana_nama);
            $lokasis = explode(';', $st->sarana_lokasi);
            foreach ($namas as $index => $nama) {
                $saranaData[] = [
                    'nama' => trim($nama),
                    'lokasi' => isset($lokasis[$index]) ? trim($lokasis[$index]) : '',
                ];
            }
        }

        try {
            if ($extension === 'docx') {
                $templateService->processWordTemplate($templatePath, $filePath, $simpleData, $employees, $saranaData);
            } else {
                $templateService->processExcelTemplate($templatePath, $filePath, $simpleData, $employees, $saranaData);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'Gagal memproses template: ' . $e->getMessage()], 500);
        }

        // Save document record to DB (cached for 3 days)
        $user = request()->user();
        $doc = SuratTugasDocument::create([
            'surat_tugas_id' => $st->id,
            'filename'       => $filename,
            'file_path'      => $cacheDir . '/' . $filename,
            'template_used'  => $st->template_file,
            'generated_by'   => $user?->id,
            'file_size'      => file_exists($filePath) ? filesize($filePath) : 0,
            'expires_at'     => now()->addDays(3),
        ]);

        // Cleanup expired documents in the background
        $this->cleanupExpiredDocuments();

        return response()->download($filePath, $filename);
    }

    /**
     * List cached generated documents for a surat tugas.
     */
    public function listDocuments($id)
    {
        $st = SuratTugas::findOrFail($id);

        // Cleanup expired documents first
        $this->cleanupExpiredDocuments();

        $documents = SuratTugasDocument::where('surat_tugas_id', $st->id)
            ->active()
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($doc) {
                return [
                    'id'            => $doc->id,
                    'filename'      => $doc->filename,
                    'template_used' => $doc->template_used ? basename($doc->template_used) : null,
                    'file_size'     => $doc->file_size,
                    'generated_at'  => $doc->created_at?->toIso8601String(),
                    'expires_at'    => $doc->expires_at?->toIso8601String(),
                ];
            });

        return response()->json($documents);
    }

    /**
     * Download a previously cached/generated document.
     */
    public function downloadCachedDocument($id, $docId)
    {
        $doc = SuratTugasDocument::where('surat_tugas_id', $id)
            ->where('id', $docId)
            ->active()
            ->firstOrFail();

        $fullPath = storage_path('app/' . $doc->file_path);

        if (!file_exists($fullPath)) {
            // File was deleted from disk but record still exists — clean it up
            $doc->delete();
            return response()->json(['error' => 'File dokumen tidak ditemukan. Silakan generate ulang.'], 404);
        }

        return response()->download($fullPath, $doc->filename);
    }

    /**
     * Delete a cached document.
     */
    public function deleteCachedDocument($id, $docId)
    {
        $doc = SuratTugasDocument::where('surat_tugas_id', $id)
            ->where('id', $docId)
            ->firstOrFail();

        $fullPath = storage_path('app/' . $doc->file_path);
        if (file_exists($fullPath)) {
            @unlink($fullPath);
        }
        $doc->delete();

        return response()->json(['message' => 'Dokumen berhasil dihapus.']);
    }

    /**
     * Cleanup expired cached documents (files + DB records).
     */
    private function cleanupExpiredDocuments(): void
    {
        try {
            $expired = SuratTugasDocument::where('expires_at', '<=', now())->get();
            foreach ($expired as $doc) {
                $fullPath = storage_path('app/' . $doc->file_path);
                if (file_exists($fullPath)) {
                    @unlink($fullPath);
                }
                $doc->delete();
            }
        } catch (\Throwable $e) {
            Log::warning('Failed to cleanup expired surat tugas documents', [
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Proxy endpoint untuk fetch data sarana dari SIAMPARAN API.
     */
    public function siamparanSarana(Request $request)
    {
        $apiUrl = env('SIAMPARAN_API_URL', 'http://localhost/SIAMPARANV2/api/sarana.php');

        $q = trim((string) $request->input('q', ''));
        $page = max(1, (int) $request->input('page', 1));
        $perPage = (int) $request->input('per_page', 50);
        if ($perPage < 1) {
            $perPage = 50;
        }
        if ($perPage > 100) {
            $perPage = 100;
        }

        $params = [
            'page' => $page,
            'per_page' => $perPage,
        ];
        if ($q !== '') {
            $params['q'] = $q;
        }

        $cacheKey = 'siamparan_sarana:' . md5(json_encode($params));

        try {
            $response = Http::timeout(10)
                ->retry(2, 200)
                ->acceptJson()
                ->get($apiUrl, $params);

            if ($response->successful()) {
                $payload = $response->json();
                Cache::put($cacheKey, $payload, now()->addMinutes(5));
                return response()->json($payload);
            }

            Log::warning('SIAMPARAN response not successful', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            $cached = Cache::get($cacheKey);
            if (!empty($cached)) {
                return response()->json($cached);
            }

            return response()->json([
                'error' => 'Gagal mengambil data sarana dari SIAMPARAN',
            ], 502);
        } catch (\Exception $e) {
            Log::warning('Koneksi ke SIAMPARAN gagal', [
                'error' => $e->getMessage(),
            ]);

            $cached = Cache::get($cacheKey);
            if (!empty($cached)) {
                return response()->json($cached);
            }

            return response()->json([
                'error'  => 'Koneksi ke SIAMPARAN gagal',
            ], 502);
        }
    }

    public function resendSiamparan($id)
    {
        $st = SuratTugas::with('employees')->findOrFail($id);
        $result = $this->sendSiamparanWebhook($st);

        if ($result['ok']) {
            return response()->json([
                'message' => $result['message'] ?? 'Data surat tugas berhasil dikirim ke SIAMPARAN.',
                'already_exists' => $result['already_exists'] ?? false,
            ]);
        }

        $status = $result['status'] ?? 502;
        if ($status < 400 || $status > 599) {
            $status = 502;
        }

        return response()->json([
            'message' => 'Gagal mengirim data surat tugas ke SIAMPARAN.',
            'detail' => $result['message'] ?? null,
        ], $status);
    }

    private function sendSiamparanWebhook(SuratTugas $st): array
    {
        if (empty($st->nomor_st) || empty($st->tanggal_mulai) || empty($st->tanggal_selesai)) {
            return [
                'ok' => false,
                'status' => 422,
                'message' => 'Data surat tugas belum lengkap.',
            ];
        }

        $siamparanWebhookUrl = env('SIAMPARAN_WEBHOOK_URL', 'http://localhost:8000/api/webhook/siptu/surat-tugas');
        $siamparanSecret = env('SIAMPARAN_WEBHOOK_SECRET', 'secret_siptu_123');

        if (empty($siamparanWebhookUrl) || empty($siamparanSecret)) {
            return [
                'ok' => false,
                'status' => 500,
                'message' => 'Konfigurasi webhook SIAMPARAN belum lengkap.',
            ];
        }

        $petugasNames = collect($st->employees)->pluck('name')->filter()->values()->toArray();
        $payload = [
            'nomor_surat_tugas' => $st->nomor_st,
            'tanggal_mulai' => $st->tanggal_mulai,
            'tanggal_akhir' => $st->tanggal_selesai,
            'petugas' => $petugasNames,
        ];

        try {
            $response = Http::withToken($siamparanSecret)
                ->timeout(5)
                ->retry(2, 200)
                ->acceptJson()
                ->post($siamparanWebhookUrl, $payload);

            if ($response->successful()) {
                $body = $response->json();
                return [
                    'ok' => true,
                    'status' => $response->status(),
                    'message' => is_array($body) ? ($body['message'] ?? 'OK') : 'OK',
                    'already_exists' => is_array($body) ? (bool) ($body['already_exists'] ?? false) : false,
                ];
            }

            $body = $response->json();
            Log::warning('SIAMPARAN webhook gagal', [
                'status' => $response->status(),
                'body' => $body ?? $response->body(),
                'payload' => $payload,
            ]);
            $message = null;
            if (is_array($body)) {
                $message = $body['message'] ?? $body['error'] ?? null;
            }

            return [
                'ok' => false,
                'status' => $response->status(),
                'message' => $message ?? $response->body(),
            ];
        } catch (\Throwable $e) {
            Log::warning('Gagal mengirim Webhook Surat Tugas ke SIAMPARAN: ' . $e->getMessage(), [
                'payload' => $payload,
            ]);
            return [
                'ok' => false,
                'status' => 502,
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Return available Excel/Word template placeholders.
     */
    public function wordTemplateParameters()
    {
        return response()->json([
            'parameters' => [
                // Data Surat Tugas
                '{NOMOR_ST}'              => 'Nomor Surat Tugas',
                '{TANGGAL_ST}'            => 'Tanggal Surat Tugas',
                '{TANGGAL_MULAI}'         => 'Tanggal Mulai Tugas',
                '{TANGGAL_SELESAI}'       => 'Tanggal Selesai Tugas',
                '{LOKASI_TUGAS}'          => 'Lokasi Tujuan Tugas',
                '{DESKRIPSI_TUGAS}'       => 'Deskripsi Tugas / Agenda',
                '{MAK}'                   => 'Mata Anggaran Keluaran',
                
                // Data Pegawai (Bisa diganti angkanya untuk pegawai ke-2, ke-3 dst: {NAMA_PEGAWAI_2})
                // Atau cukup {NAMA_PEGAWAI} jika ingin otomatis dicopy ke bawah
                '{NAMA_PEGAWAI}'          => 'Nama Lengkap Pegawai (Otomatis Tambah Baris)',
                '{NIP_PEGAWAI}'           => 'NIP Pegawai (Otomatis Tambah Baris)',
                '{PANGKAT_PEGAWAI}'       => 'Pangkat/Golongan Pegawai (Otomatis Tambah Baris)',
                '{JABATAN_PEGAWAI}'       => 'Jabatan Pegawai (Otomatis Tambah Baris)',
                '{FUNGSI_PEGAWAI}'        => 'Fungsi/Bidang Pegawai (Otomatis Tambah Baris)',
                '{UNIT_KERJA_PEGAWAI}'    => 'Unit Kerja Pegawai (Otomatis Tambah Baris)',

                '{NAMA_PEGAWAI_1}'        => 'Nama Lengkap Pegawai ke-1 (Statis)',
                '{NIP_PEGAWAI_1}'         => 'NIP Pegawai ke-1 (Statis)',

                // Data Sarana (Jika ada)
                '{NAMA_SARANA}'           => 'Nama Sarana/Objek (Otomatis Tambah Baris)',
                '{LOKASI_SARANA}'         => 'Lokasi Sarana (Otomatis Tambah Baris)',

                // Data Penandatangan
                '{PENANDATANGAN}'         => 'Nama Pejabat Penandatangan',
                '{NIP_PENANDATANGAN}'     => 'NIP Penandatangan',
                '{JABATAN_PENANDATANGAN}' => 'Jabatan Penandatangan',
                '{STATUS_JABATAN}'        => 'Status (PLH atau jabatan tetap)',
            ],
        ]);
    }

    /**
     * List available templates in storage/app/templates
     */
    public function listTemplates(Request $request)
    {
        $dir = storage_path('app/templates');
        if (!file_exists($dir)) {
            mkdir($dir, 0755, true);
        }

        $files = scandir($dir);
        $templates = [];
        foreach ($files as $file) {
            if ($file !== '.' && $file !== '..') {
                $ext = pathinfo($file, PATHINFO_EXTENSION);
                if (in_array(strtolower($ext), ['docx', 'xlsx', 'xls'])) {
                    // Provide format like 'templates/filename.ext' so it can be saved in DB
                    $templates[] = [
                        'value' => 'templates/' . $file,
                        'label' => $file,
                    ];
                }
            }
        }

        usort($templates, fn ($a, $b) => strcmp((string) $a['label'], (string) $b['label']));

        if (!$request->boolean('all')) {
            $allowed = NotificationSetting::query()->first()?->surat_tugas_templates ?? [];
            $allowedLookup = array_fill_keys(
                array_values(array_filter($allowed, fn ($value) => is_string($value) && trim($value) !== '')),
                true
            );

            if (!empty($allowedLookup)) {
                $templates = array_values(array_filter($templates, function ($item) use ($allowedLookup) {
                    return isset($allowedLookup[$item['value']]);
                }));
            }
        }

        return response()->json($templates);
    }

    /**
     * Download Protokol Kerja sebagai PDF (Public)
     */
    public function downloadProtokolKerja(Request $request, $id)
    {
        try {
            $st = SuratTugas::with(['employees', 'penandatangan', 'ketuaTim'])->findOrFail($id);

            // Access Control: Jika di DB sudah ada signature_token, maka token di URL harus cocok.
            // Jika belum ada (misal Katim belum tanda tangan), maka siapapun bisa melihat via ID.
            if ($st->signature_token && $request->token !== $st->signature_token) {
                return response()->json(['message' => 'Akses ditolak. Token tidak valid.'], 403);
            }

            \Carbon\Carbon::setLocale('id');

            // Build sarana list
            $saranaData = [];
            if ($st->sarana_nama) {
                $namas = explode(';', $st->sarana_nama);
                $lokasis = explode(';', $st->sarana_lokasi ?? '');
                foreach ($namas as $index => $nama) {
                    $saranaData[] = [
                        'nama' => trim($nama),
                        'lokasi' => isset($lokasis[$index]) ? trim($lokasis[$index]) : '',
                    ];
                }
            }

            // Resolve Ketua Tim (internal or external)
            $ketuaTim = $st->ketuaTim;
            $ketuaTimData = null;
            if ($ketuaTim) {
                $ketuaTimData = $ketuaTim->toArray();
            } else {
                // Fallback: find external participant marked as ketua tim
                $extParticipantsRaw = is_array($st->external_participants) ? $st->external_participants : [];
                foreach ($extParticipantsRaw as $ext) {
                    if (!empty($ext['is_ketua_tim'])) {
                        $ketuaTimData = [
                            'name' => $ext['name'] ?? '',
                            'nip' => $ext['nip'] ?? '',
                            'is_external' => true,
                        ];
                        break;
                    }
                }
            }

            // Resolve Penandatangan from Settings
            $setting = NotificationSetting::first();
            $kb = $setting ? ($setting->kepala_balai_settings ?? []) : [];
            $kbId = $kb['id'] ?? null;
            
            $penandatanganName = '';
            $penandatanganNip = '';
            $statusJabatanPrefix = '';
            
            if ($kbId) {
                $kbEmployee = Employee::find($kbId);
                if ($kbEmployee) {
                    $penandatanganName = $kbEmployee->name;
                    $penandatanganNip = $kbEmployee->nip;
                    $statusJabatanPrefix = ($kb['status'] ?? 'tetap') === 'plh' ? 'Plh. ' : '';
                }
            } else {
                // Fallback to existing logic if setting is empty
                $penandatanganName = $st->penandatangan ? $st->penandatangan->name : '';
                $penandatanganNip = $st->penandatangan ? $st->penandatangan->nip : '';
                $statusJabatanPrefix = $st->status_jabatan === 'plh' ? 'PLH ' : '';
            }

            $extParticipants = is_array($st->external_participants) ? $st->external_participants : [];

            $data = [
                'nomor_st'           => $st->nomor_st ?? 'Belum ada',
                'tanggal_st'         => $st->tanggal_st ? \Carbon\Carbon::parse($st->tanggal_st)->translatedFormat('d F Y') : '',
                'tanggal_penginputan'=> $st->created_at ? \Carbon\Carbon::parse($st->created_at)->translatedFormat('d F Y') : \Carbon\Carbon::now()->translatedFormat('d F Y'),
                'tanggal_mulai'      => $st->tanggal_mulai ? \Carbon\Carbon::parse($st->tanggal_mulai)->translatedFormat('d F Y') : '',
                'tanggal_selesai'    => $st->tanggal_selesai ? \Carbon\Carbon::parse($st->tanggal_selesai)->translatedFormat('d F Y') : '',
                'mak'                => $st->mak,
                'lokasi_tugas'       => $st->lokasi_tugas,
                'deskripsi_tugas'    => $st->deskripsi_tugas,
                'employees'          => array_merge($st->employees->toArray(), array_map(function($ext) {
                    return [
                        'name' => $ext['name'] ?? '',
                        'nip' => $ext['nip'] ?? '',
                        'position' => $ext['jabatan'] ?? '',
                        'pangkat' => $ext['pangkat'] ?? '',
                        'is_external' => true,
                    ];
                }, $extParticipants)),
                'sarana'             => $saranaData,
                'ketua_tim'          => $ketuaTimData,
                'penandatangan_name' => $penandatanganName,
                'penandatangan_nip'  => $penandatanganNip,
                'status_jabatan'     => $statusJabatanPrefix,
                'is_signed_kepala'   => (bool)$st->signed_kepala_at,
            ];
            
            $options = new QROptions([
                'version'         => -1, // Use -1 for auto version
                'outputInterface' => QRMarkupSVG::class,
                'eccLevel'        => EccLevel::H,
                'scale'           => 5,
                'addQuietzone'    => false,
                'outputBase64'    => true,
                'svgAddXmlHeader' => false,
            ]);
            $qrcode = new QRCode($options);

            // QR Code TTE logic - Katim
            if ($request->boolean('with_qr') && $st->signed_at) {
                $verifyUrl = config('app.frontend_url', 'https://siptu.bpompalopo.com') . '/verifikasi/' . $st->signature_token;
                $data['qr_image'] = $qrcode->render($verifyUrl);
                $data['signed_at'] = \Carbon\Carbon::parse($st->signed_at)->timezone('Asia/Makassar')->translatedFormat('d F Y H:i') . ' WITA';
            }

            // QR Code TTE logic - Kepala Balai
            if ($request->boolean('with_qr') && $st->signed_kepala_at) {
                $verifyUrlKepala = config('app.frontend_url', 'https://siptu.bpompalopo.com') . '/verifikasi/' . $st->signature_token;
                $data['qr_image_kepala'] = $qrcode->render($verifyUrlKepala);
                $data['signed_kepala_at'] = \Carbon\Carbon::parse($st->signed_kepala_at)->timezone('Asia/Makassar')->translatedFormat('d F Y H:i') . ' WITA';
            }

            $logoBase64 = '';
            $logoPath = public_path('favicon.png');
            if (file_exists($logoPath)) {
                $logoBase64 = 'data:image/png;base64,' . base64_encode(file_get_contents($logoPath));
            }
            $data['logo_base64'] = $logoBase64;
            
            // Render Blade view to HTML
            $html = view('pdf.protokol-kerja', $data)->render();

            // Use dompdf core
            $dompdf = new \Dompdf\Dompdf([
                'isRemoteEnabled' => true,
                'defaultFont' => 'serif',
                'isHtml5ParserEnabled' => true,
            ]);
            $dompdf->loadHtml($html, 'UTF-8');

            // F4 paper (215.9mm x 330mm) portrait
            $dompdf->setPaper([0, 0, 612, 935.4], 'portrait');
            $dompdf->render();

            $disposition = $request->boolean('download') ? 'attachment' : 'inline';
            return response($dompdf->output(), 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => $disposition . '; filename="Protokol_Kerja_' . ($st->nomor_st ?? 'Draft') . '.pdf"',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ], 500);
        }
    }

    /**
     * Sign Protokol Kerja (Protected)
     */
    public function signProtokolKerja(Request $request, $id, FonnteService $fonnteService)
    {
        $user = $request->user();
        $st = SuratTugas::with(['ketuaTim', 'creator'])->findOrFail($id);

        if (!$st->ketuaTim) {
            return response()->json(['message' => 'Surat tugas ini tidak memiliki Ketua Tim.'], 400);
        }

        // Validate user is ketua tim
        if ($st->ketuaTim->user_id !== $user->id && $st->ketuaTim->nip !== $user->nip) {
            return response()->json(['message' => 'Hanya Ketua Tim yang dapat menandatangani dokumen ini.'], 403);
        }

        $request->validate([
            'password' => 'required|string',
            'totp_code' => $user->has_mfa ? 'required|string' : 'nullable|string',
        ]);

        if (!Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Password salah.'], 401);
        }

        if ($user->has_mfa && !app(\App\Services\TotpService::class)->verifyCodeOrRecovery($user, (string)$request->totp_code)) {
            return response()->json(['message' => 'Kode autentikasi MFA salah atau kadaluarsa. Pastikan Anda memasukkan 6 digit kode terbaru dari aplikasi Authenticator.'], 422);
        }

        if (!$st->signature_token) {
            $st->signature_token = (string) Str::uuid();
        }
        $st->signed_at = now();
        $st->signed_by = $user->id;
        $st->save();

        // TRIGGER: Notifikasi ke Kepala Balai setelah Katim tanda tangan
        try {
            $this->notifyKepalaBalaiForSign($st, $fonnteService);
        } catch (\Exception $e) {
            Log::warning('Gagal kirim notifikasi ke Kepala Balai: ' . $e->getMessage());
        }

        // Redirect/forward to download with QR
        $request->merge(['with_qr' => 1, 'token' => $st->signature_token]);
        return $this->downloadProtokolKerja($request, $id);
    }

    /**
     * Sign Protokol Kerja (Public via Link)
     */
    public function publicSignProtokolKerja(Request $request, $id, FonnteService $fonnteService)
    {
        $st = SuratTugas::with(['ketuaTim', 'creator'])->findOrFail($id);

        if ($st->signature_token && $request->token !== $st->signature_token) {
             return response()->json(['message' => 'Akses ditolak. Token tidak valid.'], 403);
        }

        if (!$st->ketuaTim || !$st->ketuaTim->nip) {
            return response()->json(['message' => 'Ketua Tim tidak ditemukan atau tidak memiliki NIP valid.'], 400);
        }

        $request->validate([
            'password' => 'required|string',
        ]);

        $user = User::where('nip', $st->ketuaTim->nip)->first();
        if (!$user) {
            return response()->json(['message' => 'Akun pengguna Ketua Tim tidak ditemukan.'], 404);
        }

        if (!Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Password salah.'], 401);
        }

        if ($user->has_mfa && !app(\App\Services\TotpService::class)->verifyCodeOrRecovery($user, (string)$request->totp_code)) {
            return response()->json(['message' => 'Kode autentikasi MFA salah atau kadaluarsa. Pastikan Anda memasukkan 6 digit kode terbaru dari aplikasi Authenticator.'], 422);
        }

        if (!$st->signature_token) {
            $st->signature_token = (string) Str::uuid();
        }
        $st->signed_at = now();
        $st->signed_by = $user->id;
        $st->save();

        try {
            $this->notifyKepalaBalaiForSign($st, $fonnteService);
        } catch (\Exception $e) {
            Log::warning('Gagal kirim notifikasi ke Kepala Balai: ' . $e->getMessage());
        }

        $request->merge(['with_qr' => 1, 'token' => $st->signature_token]);
        return $this->downloadProtokolKerja($request, $id);
    }

    /**
     * Sign Protokol Kerja — Tahap Kepala Balai (Public via Link)
     */
    public function publicSignProtokolKepala(Request $request, $id)
    {
        $st = SuratTugas::with(['penandatangan', 'ketuaTim'])->findOrFail($id);

        if ($st->signature_token && $request->token !== $st->signature_token) {
             return response()->json(['message' => 'Akses ditolak. Token tidak valid.'], 403);
        }

        if (!$st->signed_at) {
            return response()->json(['message' => 'Dokumen ini harus ditandatangani oleh Ketua Tim terlebih dahulu.'], 422);
        }

        $request->validate([
            'password' => 'required|string',
        ]);

        // Resolve who should sign (from Settings)
        $setting = NotificationSetting::first();
        $kb = $setting ? ($setting->kepala_balai_settings ?? []) : [];
        $kbId = $kb['id'] ?? null;

        if (!$kbId) {
             // Fallback to ST's assigned penandatangan if setting is empty
             $kbId = $st->penandatangan_id;
        }

        if (!$kbId) {
            return response()->json(['message' => 'Pejabat Penandatangan Kepala Balai belum diatur di sistem.'], 400);
        }

        $employee = Employee::find($kbId);
        if (!$employee || !$employee->nip) {
            return response()->json(['message' => 'Data Pejabat Penandatangan tidak valid.'], 404);
        }

        $user = User::where('nip', $employee->nip)->first();
        if (!$user) {
            return response()->json(['message' => 'Akun pengguna Pejabat Penandatangan tidak ditemukan.'], 404);
        }

        if (!Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Password salah.'], 401);
        }

        if ($user->has_mfa && !app(\App\Services\TotpService::class)->verifyCodeOrRecovery($user, (string)$request->totp_code)) {
            return response()->json(['message' => 'Kode autentikasi MFA salah atau kadaluarsa. Pastikan Anda memasukkan 6 digit kode terbaru dari aplikasi Authenticator.'], 422);
        }

        $st->signed_kepala_at = now();
        $st->signed_kepala_by = $user->id;
        $st->save();

        $request->merge(['with_qr' => 1, 'token' => $st->signature_token]);
        return $this->downloadProtokolKerja($request, $id);
    }

    /**
     * Internal helper to notify Kepala Balai after Katim signs
     */
    private function notifyKepalaBalaiForSign(SuratTugas $st, FonnteService $fonnteService): void
    {
        $setting = NotificationSetting::first();
        if (!$setting || empty($setting->kepala_balai_settings)) return;

        $kb = $setting->kepala_balai_settings;
        $employee = Employee::find($kb['id'] ?? null);
        if (!$employee || !$employee->phone_number) return;

        $phone = preg_replace('/\D/', '', $employee->phone_number);
        if (str_starts_with($phone, '0')) $phone = '62' . substr($phone, 1);

        $baseUrl = rtrim((string) config('app.frontend_url'), '/');
        $signLink = $baseUrl . '/sign-protokol-kepala/' . $st->id . '/' . $st->signature_token;

        \Carbon\Carbon::setLocale('id');
        $tanggalMulai = $st->tanggal_mulai ? \Carbon\Carbon::parse($st->tanggal_mulai)->translatedFormat('d F Y') : '-';
        $tanggalSelesai = $st->tanggal_selesai ? \Carbon\Carbon::parse($st->tanggal_selesai)->translatedFormat('d F Y') : '-';
        $katim = $st->ketuaTim ? $st->ketuaTim->name : '-';
        if ($katim === '-' && is_array($st->external_participants)) {
            foreach ($st->external_participants as $ext) {
                if (!empty($ext['is_ketua_tim'])) { $katim = $ext['name'] ?? '-'; break; }
            }
        }


        $message = "Halo *" . $employee->name . "*,\n\nDokumen *Protokol Kerja* (Surat Tugas) telah ditandatangani oleh Ketua Tim (*" . $katim . "*).\n\n" .
                   "Kini giliran Anda selaku *" . ($kb['status'] === 'plh' ? 'Plh. ' : '') . "Kepala Balai* untuk membubuhkan TTE.\n\n" .
                   "Agenda: " . ($st->deskripsi_tugas ?: '-') . "\n" .
                   "Tanggal: " . $tanggalMulai . " - " . $tanggalSelesai . "\n" .
                   "Lokasi: " . ($st->lokasi_tugas ?: '-') . "\n\n" .
                   "Silakan klik tautan berikut untuk memverifikasi dan menandatangani dokumen:\n" . $signLink . "\n\n" .
                   "SIPTU - BPOM Palopo";

        $fonnteService->send(
            $setting->fonnte_endpoint ?? 'https://api.fonnte.com/send',
            $setting->fonnte_token ?? '',
            [$phone],
            $message
        );
    }

    /**
     * Request signature via WhatsApp
     */
    public function requestSignature(Request $request, $id, FonnteService $fonnteService)
    {
        $st = SuratTugas::with(['ketuaTim', 'creator'])->findOrFail($id);
        
        if (!$st->ketuaTim) {
            return response()->json(['message' => 'Surat tugas ini tidak memiliki Ketua Tim.'], 400);
        }

        $phone = $st->ketuaTim->phone_number;
        if (!$phone) {
            return response()->json(['message' => 'Nomor WhatsApp Ketua Tim tidak ditemukan.'], 400);
        }

        // Generate token for URL access
        if (!$st->signature_token) {
            $st->signature_token = (string) Str::uuid();
            $st->save();
        }

        $baseUrl = rtrim((string) config('app.frontend_url'), '/');
        $signLink = $baseUrl . '/sign-protokol/' . $st->id . '/' . $st->signature_token;

        $phone = preg_replace('/\D/', '', $phone);
        if (str_starts_with($phone, '0')) {
            $phone = '62' . substr($phone, 1);
        }

        \Carbon\Carbon::setLocale('id');
        $tanggalMulai = $st->tanggal_mulai ? \Carbon\Carbon::parse($st->tanggal_mulai)->translatedFormat('d F Y') : '-';
        $tanggalSelesai = $st->tanggal_selesai ? \Carbon\Carbon::parse($st->tanggal_selesai)->translatedFormat('d F Y') : '-';
        $pembuat = $st->creator ? $st->creator->name : 'Layanan Mandiri';

        $setting = NotificationSetting::first();
        $message = "Halo *" . $st->ketuaTim->name . "*,\n\nAnda diminta untuk membubuhkan Tanda Tangan Elektronik pada dokumen *Protokol Kerja* (Surat Tugas).\n\n" .
                   "Agenda: " . ($st->deskripsi_tugas ?: '-') . "\n" .
                   "Tanggal Tugas: " . $tanggalMulai . " - " . $tanggalSelesai . "\n" .
                   "Lokasi Tugas: " . ($st->lokasi_tugas ?: '-') . "\n" .
                   "Pembuat Surat Tugas: " . $pembuat . "\n\n" .
                   "Silakan klik tautan berikut dan masukkan password login SIPTU Anda untuk menandatangani dokumen:\n" . $signLink . "\n\n" .
                   "SIPTU - BPOM Palopo";

        $res = $fonnteService->send(
            $setting->fonnte_endpoint ?? 'https://api.fonnte.com/send',
            $setting->fonnte_token ?? '',
            [$phone],
            $message
        );

        if ($res['ok']) {
            return response()->json(['message' => 'Link berhasil dikirim ke WhatsApp Ketua Tim.']);
        }

        return response()->json(['message' => 'Gagal mengirim link ke WhatsApp.'], 500);
    }

    /**
     * Verify Document
     */
    public function verifyDocument($token)
    {
        // 1. Try Surat Tugas
        $st = SuratTugas::with(['signedBy', 'ketuaTim', 'penandatangan', 'signedKepalaBy'])->where('signature_token', $token)->first();

        \Carbon\Carbon::setLocale('id');

        if ($st) {
            $signatories = [
                [
                    'name' => $st->ketuaTim ? $st->ketuaTim->name : 'Ketua Tim',
                    'role' => 'Ketua Tim',
                    'signed' => (bool)$st->signed_at,
                    'signed_at' => $st->signed_at ? \Carbon\Carbon::parse($st->signed_at)->timezone('Asia/Makassar')->translatedFormat('l, d F Y H:i:s') . ' WITA' : null,
                ],
                [
                    'name' => $st->penandatangan ? $st->penandatangan->name : 'Kepala Balai',
                    'role' => 'Kepala Balai',
                    'signed' => (bool)$st->signed_kepala_at,
                    'signed_at' => $st->signed_kepala_at ? \Carbon\Carbon::parse($st->signed_kepala_at)->timezone('Asia/Makassar')->translatedFormat('l, d F Y H:i:s') . ' WITA' : null,
                ]
            ];

            return response()->json([
                'valid' => true,
                'document_type' => 'Protokol Kerja Surat Tugas',
                'signatories' => $signatories,
                'signed_by' => $signatories[0]['name'] ?? '-', // Compatibility
                'signed_at' => $signatories[0]['signed_at'] ?? '-', // Compatibility
                'description' => $st->deskripsi_tugas,
                'date_range' => \Carbon\Carbon::parse($st->tanggal_mulai)->translatedFormat('d F Y') . ' s/d ' . \Carbon\Carbon::parse($st->tanggal_selesai)->translatedFormat('d F Y'),
                'download_url' => url("/api/public/surat-tugas/{$st->id}/protokol-kerja?with_qr=1&token={$st->signature_token}"),
            ]);
        }

        // 2. Try BMN Loan
        $bmn = \App\Models\BmnLoan::with(['approver'])
            ->where('requester_signature_token', $token)
            ->orWhere('validator_signature_token', $token)
            ->first();

        if ($bmn) {
            $isRequester = ($bmn->requester_signature_token === $token);
            $signedAt = $isRequester ? $bmn->requester_signed_at : $bmn->validator_signed_at;

            if ($signedAt) {
                return response()->json([
                    'valid' => true,
                    'document_type' => 'Surat Peminjaman Aset (BMN)',
                    'signed_by' => $isRequester ? $bmn->borrower_name : ($bmn->approver ? $bmn->approver->name : 'Petugas BMN'),
                    'signed_at' => \Carbon\Carbon::parse($signedAt)->timezone('Asia/Makassar')->translatedFormat('l, d F Y H:i:s') . ' WITA',
                    'description' => $bmn->notes ?: 'Peminjaman Aset BMN',
                    'date_range' => \Carbon\Carbon::parse($bmn->loan_date)->translatedFormat('d F Y') . ' s/d ' . \Carbon\Carbon::parse($bmn->return_date)->translatedFormat('d F Y'),
                    'download_url' => url("/api/public/bmn-loans/{$bmn->token}/pdf"),
                    'signatories' => [
                        [
                            'name' => $bmn->borrower_name,
                            'role' => 'Peminjam',
                            'signed' => (bool)$bmn->requester_signature_token,
                            'signed_at' => $bmn->requester_signed_at ? \Carbon\Carbon::parse($bmn->requester_signed_at)->timezone('Asia/Makassar')->translatedFormat('d M Y H:i') : null,
                        ],
                        [
                            'name' => $bmn->approver ? $bmn->approver->name : 'Petugas BMN',
                            'role' => 'Petugas BMN / Validator',
                            'signed' => (bool)$bmn->validator_signature_token,
                            'signed_at' => $bmn->validator_signed_at ? \Carbon\Carbon::parse($bmn->validator_signed_at)->timezone('Asia/Makassar')->translatedFormat('d M Y H:i') : null,
                        ]
                    ]
                ]);
            }
        }

        // 3. Try IT Helpdesk
        $it = \App\Models\ItHelpdeskTicket::with(['itStaff'])
            ->where('reporter_signature_token', $token)
            ->orWhere('it_staff_signature_token', $token)
            ->first();

        if ($it) {
            $isReporter = ($it->reporter_signature_token === $token);
            $signedAt = $isReporter ? $it->reporter_signed_at : $it->it_staff_signed_at;

            if ($signedAt) {
                return response()->json([
                    'valid' => true,
                    'document_type' => 'Laporan Layanan IT (Helpdesk)',
                    'signed_by' => $isReporter ? $it->employee_name : ($it->itStaff ? $it->itStaff->name : 'Tim IT'),
                    'signed_at' => \Carbon\Carbon::parse($signedAt)->timezone('Asia/Makassar')->translatedFormat('l, d F Y H:i:s') . ' WITA',
                    'description' => $it->problem_details ?: 'Laporan IT',
                    'date_range' => \Carbon\Carbon::parse($it->report_date)->translatedFormat('d F Y'),
                    'signatories' => [
                        [
                            'name' => $it->employee_name,
                            'role' => 'Pelapor',
                            'signed' => (bool)$it->reporter_signature_token,
                            'signed_at' => $it->reporter_signed_at ? \Carbon\Carbon::parse($it->reporter_signed_at)->timezone('Asia/Makassar')->translatedFormat('d M Y H:i') : null,
                        ],
                        [
                            'name' => $it->itStaff ? $it->itStaff->name : 'Tim IT',
                            'role' => 'Petugas IT / Staff',
                            'signed' => (bool)$it->it_staff_signature_token,
                            'signed_at' => $it->it_staff_signed_at ? \Carbon\Carbon::parse($it->it_staff_signed_at)->timezone('Asia/Makassar')->translatedFormat('d M Y H:i') : null,
                        ]
                    ]
                ]);
            }
        }

        // 4. Try Archive Loan
        $loan = \App\Models\ArchiveLoan::with(['approvedBy', 'returnApprovedBy'])->where('signature_token', $token)->first();
        if ($loan) {
            $signatories = [];
            
            // Borrower (Borrowing stage)
            if ($loan->borrower_signed_at) {
                $signatories[] = [
                    'name' => $loan->borrower_name,
                    'role' => 'Peminjam (Tahap Peminjaman)',
                    'signed' => true,
                    'signed_at' => \Carbon\Carbon::parse($loan->borrower_signed_at)->timezone('Asia/Makassar')->translatedFormat('l, d F Y H:i:s') . ' WITA',
                ];
            }

            // Admin (Borrowing stage)
            if ($loan->admin_signed_at) {
                $signatories[] = [
                    'name' => $loan->approvedBy ? $loan->approvedBy->name : 'Admin Kearsipan',
                    'role' => 'Validator (Tahap Peminjaman)',
                    'signed' => true,
                    'signed_at' => \Carbon\Carbon::parse($loan->admin_signed_at)->timezone('Asia/Makassar')->translatedFormat('l, d F Y H:i:s') . ' WITA',
                ];
            }

            // Borrower (Return stage)
            if ($loan->return_borrower_signed_at) {
                $signatories[] = [
                    'name' => $loan->borrower_name,
                    'role' => 'Peminjam (Tahap Pengembalian)',
                    'signed' => true,
                    'signed_at' => \Carbon\Carbon::parse($loan->return_borrower_signed_at)->timezone('Asia/Makassar')->translatedFormat('l, d F Y H:i:s') . ' WITA',
                ];
            }

            // Admin (Return stage)
            if ($loan->return_admin_signed_at) {
                $signatories[] = [
                    'name' => $loan->returnApprovedBy ? $loan->returnApprovedBy->name : 'Admin Kearsipan',
                    'role' => 'Validator (Tahap Pengembalian)',
                    'signed' => true,
                    'signed_at' => \Carbon\Carbon::parse($loan->return_admin_signed_at)->timezone('Asia/Makassar')->translatedFormat('l, d F Y H:i:s') . ' WITA',
                ];
            }

            return response()->json([
                'valid' => true,
                'document_type' => 'Peminjaman Arsip (SIPTU)',
                'description' => "Peminjaman Arsip No: {$loan->archive_number} untuk keperluan: {$loan->purpose}",
                'date_range' => \Carbon\Carbon::parse($loan->borrow_date)->translatedFormat('d F Y') . ($loan->return_date ? ' s/d ' . \Carbon\Carbon::parse($loan->return_date)->translatedFormat('d F Y') : ' (Sedang Dipinjam)'),
                'signatories' => $signatories,
                'signed_by' => $loan->borrower_name,
                'signed_at' => \Carbon\Carbon::parse($loan->borrower_signed_at ?? $loan->created_at)->timezone('Asia/Makassar')->translatedFormat('l, d F Y H:i:s') . ' WITA',
                'download_url' => null,
            ]);
        }

        return response()->json(['message' => 'Dokumen tidak ditemukan atau belum ditandatangani.'], 404);
    }

    private function notifySuratTugasLengkap(SuratTugas $st, FonnteService $fonnteService): void
    {
        $setting = NotificationSetting::first();
        if (!$setting) return;

        $recipients = is_array($setting->recipients) ? $setting->recipients : [];
        $targets = $recipients['kepegawaian-surat-tugas-lengkap'] ?? [];

        if (empty($targets)) return;

        $baseUrl = rtrim((string) config('app.frontend_url'), '/');
        // Use verification link for preview
        $detailLink = $baseUrl . '/verifikasi/' . ($st->signature_token ?: 'not-found');

        $employeeNames = collect($st->employees)->pluck('name')->implode(', ');
        $penandatangan = $st->penandatangan ? $st->penandatangan->name : '-';
        
        \Carbon\Carbon::setLocale('id');
        $tglMulai = $st->tanggal_mulai ? \Carbon\Carbon::parse($st->tanggal_mulai)->translatedFormat('d F Y') : '-';
        $tglSelesai = $st->tanggal_selesai ? \Carbon\Carbon::parse($st->tanggal_selesai)->translatedFormat('d F Y') : '-';

        $messageLines = [
            '✅ *[SIPTU] Status Surat Tugas: LENGKAP*',
            '',
            '📋 *Nomor ST:* ' . ($st->nomor_st ?: '-'),
            '👥 *Pegawai:* ' . ($employeeNames ?: '-'),
            '📅 *Tanggal Mulai:* ' . $tglMulai,
            '🏁 *Tanggal Selesai:* ' . $tglSelesai,
            '📍 *Lokasi:* ' . ($st->lokasi_tugas ?: '-'),
            '✍️ *Penandatangan:* ' . $penandatangan,
            '',
            '📝 *Agenda:*',
            ($st->deskripsi_tugas ?: '-'),
            '',
            'Data surat tugas telah dilengkapi dan siap untuk proses selanjutnya.',
            '',
            '🔗 *Link Pratinjau Protokol Kerja:*',
            $detailLink,
            '',
            '⏰ Dikirim: ' . now()->timezone('Asia/Makassar')->translatedFormat('d F Y, H:i') . ' WITA',
        ];

        $normalizedTargets = [];
        foreach ($targets as $v) {
            if (!$v) continue;
            $phone = preg_replace('/\D/', '', $v);
            if (!$phone) continue;
            if (str_starts_with($phone, '0')) {
                $phone = '62' . substr($phone, 1);
            }
            $normalizedTargets[] = $phone;
        }
        $normalizedTargets = array_values(array_unique($normalizedTargets));

        if (empty($normalizedTargets)) return;

        $message = implode("\n", array_filter($messageLines));

        $fonnteService->send(
            $setting->fonnte_endpoint ?? 'https://api.fonnte.com/send',
            $setting->fonnte_token ?? '',
            $normalizedTargets,
            $message
        );

        // Send WebPush Notification to involved employees
        foreach ($st->employees as $employee) {
            $user = \App\Models\User::where('nip', $employee->nip)->first();
            if ($user) {
                try {
                    $user->notify(new \App\Notifications\SuratTugasPushNotification($st));
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::warning('Failed sending Push Notification to User ID ' . $user->id, ['error' => $e->getMessage()]);
                }
            }
        }
    }

    private function sendNotification(SuratTugas $st, FonnteService $fonnteService): void
    {
        $setting = NotificationSetting::first();
        if (!$setting) return;

        $recipients = is_array($setting->recipients) ? $setting->recipients : [];
        $targets = $recipients['kepegawaian-surat-tugas'] ?? [];
        if (empty($targets) && isset($recipients['kepegawaian_surat_tugas'])) {
            $targets = $recipients['kepegawaian_surat_tugas'];
        }

        if (empty($targets)) return;

        $baseUrl = rtrim((string) config('app.frontend_url'), '/');
        $detailLink = $baseUrl . '/app/kepegawaian-surat-tugas';

        $employeeNames = collect($st->employees)->pluck('name')->implode(', ');
        
        \Carbon\Carbon::setLocale('id');

        $messageLines = [
            '[SIPTU] Pengajuan Surat Tugas Baru',
            'Pegawai: ' . ($employeeNames ?: '-'),
            'Tanggal: ' . ($st->tanggal_mulai ? \Carbon\Carbon::parse($st->tanggal_mulai)->translatedFormat('d F') : '-') . ' s/d ' . ($st->tanggal_selesai ? \Carbon\Carbon::parse($st->tanggal_selesai)->translatedFormat('d F Y') : '-'),
            'Lokasi: ' . ($st->lokasi_tugas ?: '-'),
            'Agenda: ' . $st->deskripsi_tugas,
            'Sarana: ' . ($st->sarana_nama ?: '-'),
            'Link Admin:',
            $detailLink,
        ];

        $normalizedTargets = [];
        foreach ($targets as $v) {
            if (!$v) continue;
            $phone = preg_replace('/\D/', '', $v);
            if (!$phone) continue;
            if (str_starts_with($phone, '0')) {
                $phone = '62' . substr($phone, 1);
            }
            $normalizedTargets[] = $phone;
        }
        $normalizedTargets = array_values(array_unique($normalizedTargets));

        if (empty($normalizedTargets)) return;

        $message = implode("\n", array_filter($messageLines));

        $fonnteService->send(
            $setting->fonnte_endpoint ?? 'https://api.fonnte.com/send',
            $setting->fonnte_token ?? '',
            $normalizedTargets,
            $message
        );
    }

    /**
     * Approve Surat Tugas - Change status from draft to approved
     */
    public function approve(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $st = SuratTugas::with(['employees', 'penandatangan'])->findOrFail($id);

        if ($st->status !== 'draft') {
            return response()->json(['message' => 'Surat tugas sudah diproses atau tidak dapat disetujui.'], 422);
        }

        $st->update([
            'status' => 'approved',
            'approved_by' => $user->id,
            'approved_at' => now(),
        ]);

        $st->load(['employees', 'penandatangan', 'creator']);

        return response()->json([
            'message' => 'Surat tugas berhasil disetujui.',
            'data' => $st,
        ]);
    }

    /**
     * Reject Surat Tugas
     */
    public function reject(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $validator = Validator::make($request->all(), [
            'reason' => ['required', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $st = SuratTugas::with(['employees', 'penandatangan'])->findOrFail($id);

        if (!in_array($st->status, ['draft', 'approved'])) {
            return response()->json(['message' => 'Surat tugas sudah selesai atau tidak dapat ditolak.'], 422);
        }

        $st->update([
            'status' => 'rejected',
            'approval_notes' => $request->reason,
            'approved_by' => $user->id,
            'approved_at' => now(),
        ]);

        $st->load(['employees', 'penandatangan', 'creator']);

        return response()->json([
            'message' => 'Surat tugas berhasil ditolak.',
            'data' => $st,
        ]);
    }
    /**
     * Get unique MAK suggestions.
     */
    public function getMakSuggestions(Request $request)
    {
        $q = $request->query('q', '');

        // Auto-cleanup orphaned MAKs from history when initial suggestions are requested
        if ($q === '') {
            $usedMaks = SuratTugas::whereNotNull('mak')->distinct()->pluck('mak')->toArray();
            MakSuggestion::whereNotIn('mak', $usedMaks)->delete();
        }

        $query = MakSuggestion::query();

        if ($q !== '') {
            $query->where('mak', 'like', "%$q%");
        }

        $data = $query->orderBy('mak', 'asc')->limit(50)->get();

        return response()->json($data);
    }
    private function notifyKetuaTimForSign(SuratTugas $st, FonnteService $fonnteService): void
    {
        if (!$st->ketuaTim || !$st->ketuaTim->phone_number) return;

        $setting = NotificationSetting::first();
        if (!$setting) return;

        $baseUrl = rtrim((string) config('app.frontend_url'), '/');
        // If not signed, Katim needs a link to sign
        if (!$st->signature_token) {
            $st->signature_token = (string) \Illuminate\Support\Str::uuid();
            $st->save();
        }
        
        $signLink = $baseUrl . '/sign-protokol/' . $st->id . '/' . $st->signature_token;

        $employeeNames = collect($st->employees)->pluck('name')->implode(', ');
        
        \Carbon\Carbon::setLocale('id');
        $tglMulai = $st->tanggal_mulai ? \Carbon\Carbon::parse($st->tanggal_mulai)->translatedFormat('d F') : '-';
        $tglSelesai = $st->tanggal_selesai ? \Carbon\Carbon::parse($st->tanggal_selesai)->translatedFormat('d F Y') : '-';

        $message = "✍️ *[SIPTU] Permintaan Tanda Tangan Protokol Kerja*\n\n"
                 . "Halo Bapak/Ibu *" . $st->ketuaTim->name . "*,\n\n"
                 . "Terdapat pengajuan Surat Tugas baru di mana Anda ditunjuk sebagai *Ketua Tim*.\n\n"
                 . "📋 *Agenda:* " . ($st->deskripsi_tugas ?: '-') . "\n"
                 . "📍 *Lokasi:* " . ($st->lokasi_tugas ?: '-') . "\n"
                 . "📅 *Waktu:* " . $tglMulai . " s/d " . $tglSelesai . "\n"
                 . "👥 *Anggota:* " . ($employeeNames ?: '-') . "\n\n"
                 . "Mohon segera meninjau dan menandatangani *Protokol Kerja* melalui tautan di bawah ini agar proses dapat dilanjutkan:\n\n"
                 . "🔗 *Link TTE:* " . $signLink . "\n\n"
                 . "Terima kasih.";

        $phone = preg_replace('/\D/', '', $st->ketuaTim->phone_number);
        if (str_starts_with($phone, '0')) {
            $phone = '62' . substr($phone, 1);
        }

        $fonnteService->send(
            $setting->fonnte_endpoint ?? 'https://api.fonnte.com/send',
            $setting->fonnte_token ?? '',
            [$phone],
            $message
        );
    }
}
