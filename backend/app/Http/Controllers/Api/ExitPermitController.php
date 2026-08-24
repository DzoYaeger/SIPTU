<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExitPermit;
use App\Models\Employee;
use App\Models\NotificationSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use ZipArchive;

class ExitPermitController extends Controller
{
    private const EXIT_LAT = -2.986295064368917;
    private const EXIT_LNG = 120.18370256280669;
    private const EXIT_RADIUS_METERS = 100;

    private const WORD_TEMPLATE_PARAMETERS = [
        'nomor_surat',
        'nama_pegawai',
        'nip',
        'tanggal_izin',
        'tanggal_izin_iso',
        'jam_keluar',
        'jam_kembali',
        'durasi_menit',
        'durasi_format',
        'keperluan',
        'jenis_urusan',
        'status_izin',
        'tanggal_cetak',
        'waktu_cetak',
        'tahun',
        'bulan',
        'hari',
        'jabatan',
        'fungsi_area',
    ];

    /**
     * Get the authenticated user's employee data + any active exit permit today.
     */
    public function myActive(Request $request)
    {
        $user = $request->user();
        $employee = Employee::where('nip', $user->nip)->first();

        if (!$employee) {
            return response()->json(['message' => 'Data pegawai tidak ditemukan untuk akun Anda.'], 404);
        }

        // Check if there's an active (status=out) exit permit today
        $activePermit = ExitPermit::where('employee_id', $employee->id)
            ->where('date', Carbon::now('Asia/Makassar')->toDateString())
            ->where('status', 'out')
            ->first();

        return response()->json([
            'employee' => [
                'id' => $employee->id,
                'nip' => $employee->nip,
                'name' => $employee->name,
                'function_area' => $employee->function_area,
                'position' => $employee->position,
            ],
            'active_permit' => $activePermit,
        ]);
    }

    /**
     * PUBLIC: Lookup employee and active permit by NIP (no login required).
     */
    public function publicLookupByNip(Request $request)
    {
        $validated = $request->validate([
            'nip' => 'required|string|max:30',
        ]);

        $nip = trim((string) $validated['nip']);
        $employee = Employee::where('nip', $nip)->first();

        if (!$employee) {
            return response()->json(['message' => 'Data pegawai dengan NIP tersebut tidak ditemukan.'], 404);
        }

        $activePermit = ExitPermit::where('employee_id', $employee->id)
            ->where('date', Carbon::now('Asia/Makassar')->toDateString())
            ->where('status', 'out')
            ->first();

        return response()->json([
            'employee' => [
                'id' => $employee->id,
                'nip' => $employee->nip,
                'name' => $employee->name,
                'function_area' => $employee->function_area,
                'position' => $employee->position,
            ],
            'active_permit' => $activePermit,
        ]);
    }

    /**
     * PUBLIC: Record exit by NIP (no login required).
     */
    public function publicRecordExitByNip(Request $request)
    {
        $validated = $request->validate([
            'nip' => 'required|string|max:30',
            'reason' => 'nullable|string|max:500',
            'permit_type' => 'required|in:Pribadi,Kantor',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'tagged_nips' => 'nullable|array',
            'tagged_nips.*' => 'string|max:30',
        ]);

        $nip = trim((string) $validated['nip']);
        $employee = Employee::where('nip', $nip)->first();

        if (!$employee) {
            return response()->json(['message' => 'Data pegawai tidak ditemukan.'], 404);
        }

        $today = Carbon::now('Asia/Makassar')->toDateString();
        $now = Carbon::now('Asia/Makassar');

        $existing = ExitPermit::where('employee_id', $employee->id)
            ->where('date', $today)
            ->where('status', 'out')
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'Anda masih memiliki izin keluar aktif. Silakan tekan "Kembali" terlebih dahulu.',
                'permit' => $existing,
            ], 422);
        }

        $distance = $this->distanceMeters(
            (float) $validated['latitude'],
            (float) $validated['longitude'],
            self::EXIT_LAT,
            self::EXIT_LNG
        );
        if ($distance > self::EXIT_RADIUS_METERS) {
            return response()->json([
                'message' => 'Anda berada di luar area izin (maksimal 100 meter dari titik kantor).',
                'distance_meters' => (int) round($distance),
                'allowed_radius_meters' => self::EXIT_RADIUS_METERS,
            ], 422);
        }

        $groupId = null;
        if (!empty($validated['tagged_nips'])) {
            $groupId = (string) \Illuminate\Support\Str::uuid();
        }

        $permit = ExitPermit::create([
            'employee_id' => $employee->id,
            'nip' => $employee->nip,
            'employee_name' => $employee->name,
            'date' => $today,
            'exit_time' => $now->format('H:i:s'),
            'reason' => $validated['reason'] ?? null,
            'permit_type' => $validated['permit_type'],
            'status' => 'out',
            'group_id' => $groupId,
        ]);

        $taggedPermits = [];
        if (!empty($validated['tagged_nips'])) {
            foreach ($validated['tagged_nips'] as $taggedNip) {
                $taggedEmp = Employee::where('nip', trim($taggedNip))->first();
                if ($taggedEmp && $taggedEmp->id !== $employee->id) {
                    // Check if tagged employee already has active permit
                    $taggedExisting = ExitPermit::where('employee_id', $taggedEmp->id)
                        ->where('date', $today)
                        ->where('status', 'out')
                        ->first();
                    
                    if (!$taggedExisting) {
                        $taggedPermits[] = ExitPermit::create([
                            'employee_id' => $taggedEmp->id,
                            'nip' => $taggedEmp->nip,
                            'employee_name' => $taggedEmp->name,
                            'date' => $today,
                            'exit_time' => $now->format('H:i:s'),
                            'reason' => $validated['reason'] ?? null,
                            'permit_type' => $validated['permit_type'],
                            'status' => 'out',
                            'group_id' => $groupId,
                        ]);
                    }
                }
            }
        }

        return response()->json([
            'message' => 'Izin keluar berhasil dicatat.',
            'permit' => $permit,
            'tagged_permits' => $taggedPermits,
        ], 201);
    }

    /**
     * PUBLIC: Get active group members for a given group_id.
     */
    public function publicGroupMembers($groupId)
    {
        if (!$groupId) {
            return response()->json([]);
        }

        $members = ExitPermit::where('group_id', $groupId)
            ->where('date', Carbon::now('Asia/Makassar')->toDateString())
            ->where('status', 'out')
            ->get();

        return response()->json($members);
    }

    /**
     * PUBLIC: Geofence Ping (Called periodically from PWA when an exit permit is active)
     */
    public function publicGeofencePing(Request $request)
    {
        $request->validate([
            'nip' => 'required|string|max:30',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

        $employee = Employee::where('nip', $request->nip)->first();

        if (!$employee) {
            return response()->json(['message' => 'Data pegawai tidak ditemukan.'], 404);
        }

        $today = Carbon::now('Asia/Makassar')->toDateString();
        $now = Carbon::now('Asia/Makassar');

        // Check for active permit today
        $permit = ExitPermit::where('employee_id', $employee->id)
            ->where('date', $today)
            ->where('status', 'out')
            ->first();

        if (!$permit) {
            return response()->json([
                'message' => 'Tidak ada izin keluar aktif.',
                'auto_returned' => false,
            ]);
        }

        $distance = $this->distanceMeters(
            (float) $request->latitude,
            (float) $request->longitude,
            self::EXIT_LAT,
            self::EXIT_LNG
        );

        $isInside = $distance <= self::EXIT_RADIUS_METERS;

        if (!$isInside) {
            if (!$permit->is_outside_radius || $permit->returned_radius_at !== null) {
                $permit->update([
                    'is_outside_radius' => true,
                    'returned_radius_at' => null,
                ]);
            }
            return response()->json([
                'message' => 'Anda berada di luar area kantor.',
                'distance_meters' => (int) round($distance),
                'auto_returned' => false,
            ]);
        }

        if ($permit->is_outside_radius && $permit->returned_radius_at === null) {
            $permit->update([
                'returned_radius_at' => $now,
            ]);
            return response()->json([
                'message' => 'Anda telah memasuki area kantor. Sistem sedang menunggu untuk konfirmasi.',
                'distance_meters' => (int) round($distance),
                'auto_returned' => false,
            ]);
        }

        if ($permit->is_outside_radius && $permit->returned_radius_at !== null) {
            $returnedAt = Carbon::parse($permit->returned_radius_at, 'Asia/Makassar');
            $diffSeconds = $returnedAt->diffInSeconds($now);

            if ($diffSeconds >= 180) {
                $exitTime = Carbon::parse($permit->date->format('Y-m-d') . ' ' . $permit->exit_time, 'Asia/Makassar');
                $durationSeconds = $this->calculateEffectiveSeconds($permit->date, $exitTime, $now);
                $durationMinutes = (int) floor($durationSeconds / 60);

                $permit->update([
                    'return_time' => $now->format('H:i:s'),
                    'duration_seconds' => $durationSeconds,
                    'duration_minutes' => $durationMinutes,
                    'status' => 'returned',
                    'return_recorded_by_admin' => false,
                    'return_recorded_by_user_id' => null,
                    'return_recorded_note' => 'Dikembalikan otomatis oleh sistem Geofencing',
                ]);

                // Send notification
                $user = \App\Models\User::where('nip', $employee->nip)->first();
                if ($user) {
                    try {
                        $user->notify(new \App\Notifications\ExitPermitAutoReturnNotification());
                    } catch (\Throwable $e) {
                        \Illuminate\Support\Facades\Log::warning('Failed sending Auto-Return Push Notification to User ID ' . $user->id, ['error' => $e->getMessage()]);
                    }
                }

                return response()->json([
                    'message' => 'Izin keluar otomatis diselesaikan.',
                    'distance_meters' => (int) round($distance),
                    'auto_returned' => true,
                    'permit' => $permit->fresh(),
                ]);
            }
            
            return response()->json([
                'message' => 'Menunggu waktu konfirmasi otomatis (3 menit).',
                'distance_meters' => (int) round($distance),
                'auto_returned' => false,
                'time_remaining_seconds' => 180 - $diffSeconds,
            ]);
        }

        return response()->json([
            'message' => 'Anda masih berada di area kantor sejak izin dibuat.',
            'distance_meters' => (int) round($distance),
            'auto_returned' => false,
        ]);
    }

    /**
     * PUBLIC: Record return by permit id + NIP (no login required).
     */
    public function publicRecordReturnByNip(Request $request, $id)
    {
        $validated = $request->validate([
            'nip' => 'required|string|max:30',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'returning_ids' => 'nullable|array',
            'returning_ids.*' => 'integer',
        ]);

        $permit = retry(3, function () use ($id) {
            try {
                return ExitPermit::findOrFail($id);
            } catch (\Throwable $e) {
                DB::reconnect();
                throw $e;
            }
        }, 100);

        $nip = trim((string) $validated['nip']);

        if ((string) $permit->nip !== $nip) {
            return response()->json(['message' => 'NIP tidak sesuai dengan data izin keluar ini.'], 403);
        }

        $now = Carbon::now('Asia/Makassar');

        if ($permit->status === 'returned') {
            return response()->json(['message' => 'Izin keluar ini sudah ditandai kembali.'], 422);
        }

        $distance = $this->distanceMeters(
            (float) $validated['latitude'],
            (float) $validated['longitude'],
            self::EXIT_LAT,
            self::EXIT_LNG
        );
        if ($distance > self::EXIT_RADIUS_METERS) {
            return response()->json([
                'message' => 'Anda berada di luar area izin (maksimal 100 meter dari titik kantor).',
                'distance_meters' => (int) round($distance),
                'allowed_radius_meters' => self::EXIT_RADIUS_METERS,
            ], 422);
        }

        $exitTime = Carbon::parse($permit->date->format('Y-m-d') . ' ' . $permit->exit_time, 'Asia/Makassar');
        $durationSeconds = $this->calculateEffectiveSeconds($permit->date, $exitTime, $now);
        $durationMinutes = (int) floor($durationSeconds / 60);

        retry(3, function () use ($permit, $now, $durationSeconds, $durationMinutes) {
            try {
                $permit->update([
                    'return_time' => $now->format('H:i:s'),
                    'duration_seconds' => $durationSeconds,
                    'duration_minutes' => $durationMinutes,
                    'status' => 'returned',
                    'return_recorded_by_admin' => false,
                    'return_recorded_by_user_id' => null,
                    'return_recorded_note' => null,
                ]);
            } catch (\Throwable $e) {
                DB::reconnect();
                throw $e;
            }
        }, 100);

        $returnedPermits = [$permit->fresh()];

        // Handle group returns
        if (!empty($validated['returning_ids']) && $permit->group_id) {
            $groupPermits = ExitPermit::whereIn('id', $validated['returning_ids'])
                ->where('group_id', $permit->group_id)
                ->where('status', 'out')
                ->where('id', '!=', $id) // Skip primary since already updated
                ->get();
            
            foreach ($groupPermits as $groupPermit) {
                $gExitTime = Carbon::parse($groupPermit->date->format('Y-m-d') . ' ' . $groupPermit->exit_time, 'Asia/Makassar');
                $gDurationSeconds = $this->calculateEffectiveSeconds($groupPermit->date, $gExitTime, $now);
                $gDurationMinutes = (int) floor($gDurationSeconds / 60);

                $groupPermit->update([
                    'return_time' => $now->format('H:i:s'),
                    'duration_seconds' => $gDurationSeconds,
                    'duration_minutes' => $gDurationMinutes,
                    'status' => 'returned',
                    'return_recorded_by_admin' => false,
                    'return_recorded_by_user_id' => null,
                    'return_recorded_note' => null,
                ]);
                $returnedPermits[] = $groupPermit->fresh();
            }
        }

        return response()->json([
            'message' => 'Waktu kembali berhasil dicatat.',
            'permit' => $permit->fresh(),
            'returned_permits' => $returnedPermits,
        ]);
    }

    /**
     * PUBLIC: Resolve unfinished exit permit via hash link (no geofence).
     */
    public function publicResolveUnfinished(Request $request, $id)
    {
        $validated = $request->validate([
            'nip' => 'required|string|max:30',
            'token' => 'required|string',
            'return_time' => 'required|string|regex:/^\d{2}:\d{2}$/',
        ]);

        $permit = ExitPermit::findOrFail($id);
        $nip = trim((string) $validated['nip']);
        $token = trim((string) $validated['token']);

        // Verify token
        $expectedToken = sha1($permit->id . $permit->nip . $permit->created_at . 'siptusecret123');
        if ($token !== $expectedToken || (string)$permit->nip !== $nip) {
            return response()->json(['message' => 'Token verifikasi tidak valid atau tidak cocok.'], 403);
        }

        if ($permit->status === 'returned') {
            return response()->json(['message' => 'Izin keluar ini sudah diselesaikan sebelumnya.'], 422);
        }

        $returnTime = $validated['return_time'] . ':00';
        $exitTime = Carbon::parse($permit->date->format('Y-m-d') . ' ' . $permit->exit_time, 'Asia/Makassar');
        $returnDateTime = Carbon::parse($permit->date->format('Y-m-d') . ' ' . $returnTime, 'Asia/Makassar');

        if ($returnDateTime->lt($exitTime)) {
            return response()->json(['message' => 'Jam kembali tidak boleh kurang dari jam keluar.'], 422);
        }

        $durationSeconds = $this->calculateEffectiveSeconds($permit->date, $exitTime, $returnDateTime);
        $durationMinutes = (int) floor($durationSeconds / 60);

        $permit->update([
            'return_time' => $returnTime,
            'duration_seconds' => $durationSeconds,
            'duration_minutes' => $durationMinutes,
            'status' => 'returned',
            'return_recorded_by_admin' => false,
            'return_recorded_by_user_id' => null,
            'return_recorded_note' => 'Diselesaikan secara mandiri melalui link WhatsApp',
        ]);

        return response()->json([
            'message' => 'Jam kembali berhasil disimpan.',
            'permit' => $permit->fresh(),
        ]);
    }

    /**
     * PROTECTED: Geofence Ping (Called periodically from PWA when an exit permit is active)
     */
    public function geofencePing(Request $request)
    {
        $request->validate([
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

        $user = $request->user();
        $employee = Employee::where('nip', $user->nip)->first();

        if (!$employee) {
            return response()->json(['message' => 'Data pegawai tidak ditemukan.'], 404);
        }

        $today = Carbon::now('Asia/Makassar')->toDateString();
        $now = Carbon::now('Asia/Makassar');

        // Check for active permit today
        $permit = ExitPermit::where('employee_id', $employee->id)
            ->where('date', $today)
            ->where('status', 'out')
            ->first();

        if (!$permit) {
            return response()->json([
                'message' => 'Tidak ada izin keluar aktif.',
                'auto_returned' => false,
            ]);
        }

        $distance = $this->distanceMeters(
            (float) $request->latitude,
            (float) $request->longitude,
            self::EXIT_LAT,
            self::EXIT_LNG
        );

        $isInside = $distance <= self::EXIT_RADIUS_METERS;

        if (!$isInside) {
            // User is currently outside. Record it and clear returned_radius_at.
            if (!$permit->is_outside_radius || $permit->returned_radius_at !== null) {
                $permit->update([
                    'is_outside_radius' => true,
                    'returned_radius_at' => null,
                ]);
            }
            return response()->json([
                'message' => 'Anda berada di luar area kantor.',
                'distance_meters' => (int) round($distance),
                'auto_returned' => false,
            ]);
        }

        // User is inside the radius
        if ($permit->is_outside_radius && $permit->returned_radius_at === null) {
            // Just entered the radius
            $permit->update([
                'returned_radius_at' => $now,
            ]);
            return response()->json([
                'message' => 'Anda telah memasuki area kantor. Sistem sedang menunggu untuk konfirmasi.',
                'distance_meters' => (int) round($distance),
                'auto_returned' => false,
            ]);
        }

        if ($permit->is_outside_radius && $permit->returned_radius_at !== null) {
            $returnedAt = Carbon::parse($permit->returned_radius_at, 'Asia/Makassar');
            $diffSeconds = $returnedAt->diffInSeconds($now);

            // 180 seconds = 3 minutes
            if ($diffSeconds >= 180) {
                // Auto return!
                $exitTime = Carbon::parse($permit->date->format('Y-m-d') . ' ' . $permit->exit_time, 'Asia/Makassar');
                $durationSeconds = $this->calculateEffectiveSeconds($permit->date, $exitTime, $now);
                $durationMinutes = (int) floor($durationSeconds / 60);

                $permit->update([
                    'return_time' => $now->format('H:i:s'),
                    'duration_seconds' => $durationSeconds,
                    'duration_minutes' => $durationMinutes,
                    'status' => 'returned',
                    'return_recorded_by_admin' => false,
                    'return_recorded_by_user_id' => null,
                    'return_recorded_note' => 'Dikembalikan otomatis oleh sistem Geofencing',
                ]);

                // Send notification
                try {
                    $user->notify(new \App\Notifications\ExitPermitAutoReturnNotification());
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::warning('Failed sending Auto-Return Push Notification to User ID ' . $user->id, ['error' => $e->getMessage()]);
                }

                return response()->json([
                    'message' => 'Izin keluar otomatis diselesaikan.',
                    'distance_meters' => (int) round($distance),
                    'auto_returned' => true,
                    'permit' => $permit->fresh(),
                ]);
            }
            
            return response()->json([
                'message' => 'Menunggu waktu konfirmasi otomatis (3 menit).',
                'distance_meters' => (int) round($distance),
                'auto_returned' => false,
                'time_remaining_seconds' => 180 - $diffSeconds,
            ]);
        }

        // is_outside_radius is false -> User hasn't even left the office yet!
        return response()->json([
            'message' => 'Anda masih berada di area kantor sejak izin dibuat.',
            'distance_meters' => (int) round($distance),
            'auto_returned' => false,
        ]);
    }

    /**
     * Record exit (press "Izin Keluar") — uses authenticated user.
     */
    public function recordExit(Request $request)
    {
        $request->validate([
            'reason' => 'nullable|string|max:500',
            'permit_type' => 'required|in:Pribadi,Kantor',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

        $user = $request->user();
        $employee = Employee::where('nip', $user->nip)->first();

        if (!$employee) {
            return response()->json(['message' => 'Data pegawai tidak ditemukan.'], 404);
        }

        $today = Carbon::now('Asia/Makassar')->toDateString();
        $now = Carbon::now('Asia/Makassar');

        // Check for existing active permit today
        $existing = ExitPermit::where('employee_id', $employee->id)
            ->where('date', $today)
            ->where('status', 'out')
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'Anda masih memiliki izin keluar aktif. Silakan tekan "Kembali" terlebih dahulu.',
                'permit' => $existing,
            ], 422);
        }

        $distance = $this->distanceMeters(
            (float) $request->latitude,
            (float) $request->longitude,
            self::EXIT_LAT,
            self::EXIT_LNG
        );
        if ($distance > self::EXIT_RADIUS_METERS) {
            return response()->json([
                'message' => 'Anda berada di luar area izin (maksimal 100 meter dari titik kantor).',
                'distance_meters' => (int) round($distance),
                'allowed_radius_meters' => self::EXIT_RADIUS_METERS,
            ], 422);
        }

        $permit = ExitPermit::create([
            'employee_id' => $employee->id,
            'nip' => $employee->nip,
            'employee_name' => $employee->name,
            'date' => $today,
            'exit_time' => $now->format('H:i:s'),
            'reason' => $request->reason,
            'permit_type' => $request->permit_type,
            'status' => 'out',
        ]);

        return response()->json([
            'message' => 'Izin keluar berhasil dicatat.',
            'permit' => $permit,
        ], 201);
    }

    /**
     * PUBLIC: Record return (press "Kembali").
     */
    public function recordReturn(Request $request, $id)
    {
        $request->validate([
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

        $permit = ExitPermit::findOrFail($id);

        $now = Carbon::now('Asia/Makassar');

        if ($permit->status === 'returned') {
            return response()->json(['message' => 'Izin keluar ini sudah ditandai kembali.'], 422);
        }

        $distance = $this->distanceMeters(
            (float) $request->latitude,
            (float) $request->longitude,
            self::EXIT_LAT,
            self::EXIT_LNG
        );
        if ($distance > self::EXIT_RADIUS_METERS) {
            return response()->json([
                'message' => 'Anda berada di luar area izin (maksimal 100 meter dari titik kantor).',
                'distance_meters' => (int) round($distance),
                'allowed_radius_meters' => self::EXIT_RADIUS_METERS,
            ], 422);
        }

        $exitTime = Carbon::parse($permit->date->format('Y-m-d') . ' ' . $permit->exit_time, 'Asia/Makassar');
        $durationSeconds = $this->calculateEffectiveSeconds($permit->date, $exitTime, $now);
        $durationMinutes = (int) floor($durationSeconds / 60);

        $permit->update([
            'return_time' => $now->format('H:i:s'),
            'duration_seconds' => $durationSeconds,
            'duration_minutes' => $durationMinutes,
            'status' => 'returned',
            'return_recorded_by_admin' => false,
            'return_recorded_by_user_id' => null,
            'return_recorded_note' => null,
        ]);

        return response()->json([
            'message' => 'Waktu kembali berhasil dicatat.',
            'permit' => $permit->fresh(),
        ]);
    }

    /**
     * ADMIN: Input return time manually for employees who forgot to tap "Kembali".
     */
    public function adminRecordReturn(Request $request, $id)
    {
        $validated = $request->validate([
            'return_time' => ['required', 'date_format:H:i'],
            'note' => ['nullable', 'string', 'max:255'],
            'date' => ['nullable', 'date'],
        ]);

        $permit = ExitPermit::findOrFail($id);
        if ($permit->status === 'returned') {
            return response()->json(['message' => 'Izin keluar ini sudah berstatus kembali.'], 422);
        }

        $dateStr = $validated['date'] ?? $permit->date->format('Y-m-d');

        $returnMoment = Carbon::parse(
            $dateStr . ' ' . $validated['return_time'] . ':00',
            'Asia/Makassar'
        );
        $exitMoment = Carbon::parse(
            $dateStr . ' ' . $permit->exit_time,
            'Asia/Makassar'
        );

        if ($returnMoment->lt($exitMoment)) {
            return response()->json([
                'message' => 'Jam kembali tidak boleh lebih kecil dari jam keluar.',
            ], 422);
        }

        $durationSeconds = $this->calculateEffectiveSeconds($permit->date, $exitMoment, $returnMoment);
        $durationMinutes = (int) floor($durationSeconds / 60);
        $manualNote = trim((string) ($validated['note'] ?? ''));
        if ($manualNote === '') {
            $manualNote = 'Lupa absen kembali di aplikasi';
        }

        $permit->update([
            'date' => $dateStr,
            'return_time' => $returnMoment->format('H:i:s'),
            'duration_seconds' => $durationSeconds,
            'duration_minutes' => $durationMinutes,
            'status' => 'returned',
            'return_recorded_by_admin' => true,
            'return_recorded_by_user_id' => $request->user()?->id,
            'return_recorded_note' => $manualNote,
        ]);

        return response()->json([
            'message' => 'Jam kembali berhasil diinput manual oleh admin.',
            'permit' => $permit->fresh(),
        ]);
    }

    /**
     * PROTECTED: List all exit permits with filters.
     */
    public function index(Request $request)
    {
        $query = ExitPermit::with('employee')->orderByDesc('date')->orderByDesc('exit_time');

        // Filter by specific date
        if ($request->has('date')) {
            $query->where('date', $request->date);
        }

        // Filter by month & year
        if ($request->has('month') && $request->has('year')) {
            $query->whereYear('date', $request->year)
                  ->whereMonth('date', $request->month);
        } elseif ($request->has('year')) {
            $query->whereYear('date', $request->year);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by permit_type (Pribadi / Kantor)
        if ($request->has('permit_type') && in_array($request->permit_type, ['Pribadi', 'Kantor'])) {
            $query->where('permit_type', $request->permit_type);
        }

        // Search by NIP or name
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('nip', 'like', "%{$search}%")
                  ->orWhere('employee_name', 'like', "%{$search}%");
            });
        }

        $permits = $query->get();

        return response()->json($permits);
    }

    /**
     * PROTECTED: Show detail of one exit permit.
     * User can only access own permit unless base_role is admin.
     */
    public function show(Request $request, $id)
    {
        $permit = ExitPermit::with('employee')->findOrFail($id);
        $user = $request->user();

        if (($user->base_role ?? null) !== 'admin') {
            $employee = Employee::where('nip', $user->nip)->first();
            $isOwnerByEmployee = $employee && (int) $permit->employee_id === (int) $employee->id;
            $isOwnerByNip = $permit->nip && $user->nip && $permit->nip === $user->nip;

            if (!$isOwnerByEmployee && !$isOwnerByNip) {
                return response()->json(['message' => 'Anda tidak memiliki akses ke data izin keluar ini.'], 403);
            }
        }

        return response()->json($permit);
    }

    /**
     * PUBLIC: Show detail of one exit permit (no auth).
     */
    public function showPublic($id)
    {
        $permit = ExitPermit::with('employee')->findOrFail($id);
        return response()->json($permit);
    }

    /**
     * PROTECTED: Get stats for monitoring dashboard.
     */
    public function stats(Request $request)
    {
        $date = $request->input('date', Carbon::now('Asia/Makassar')->toDateString());
        $month = $request->input('month', date('m'));
        $year = $request->input('year', date('Y'));

        // Today's stats
        $todayPermits = ExitPermit::where('date', $date)->get();
        $todayTotal = $todayPermits->count();
        $todayOut = $todayPermits->where('status', 'out')->count();
        $todayReturnedCollection = $todayPermits->where('status', 'returned')->values();
        $todayReturned = $todayReturnedCollection->count();
        $todayAvgDurationSeconds = (int) round(
            $todayReturnedCollection
                ->map(fn ($permit) => $permit->duration_seconds_effective)
                ->filter(fn ($seconds) => $seconds !== null)
                ->avg() ?? 0
        );
        $todayPribadi = $todayPermits->where('permit_type', 'Pribadi')->count();
        $todayKantor = $todayPermits->where('permit_type', 'Kantor')->count();

        // Monthly stats
        $monthlyPermits = ExitPermit::whereYear('date', $year)
            ->whereMonth('date', $month)
            ->get();
        
        $monthlyTotal = $monthlyPermits->count();
        $monthlyReturnedCollection = $monthlyPermits->where('status', 'returned')->values();
        $monthlyAvgDurationSeconds = (int) round(
            $monthlyReturnedCollection
                ->map(fn ($permit) => $permit->duration_seconds_effective)
                ->filter(fn ($seconds) => $seconds !== null)
                ->avg() ?? 0
        );
        $monthlyPribadi = $monthlyPermits->where('permit_type', 'Pribadi')->count();
        $monthlyKantor = $monthlyPermits->where('permit_type', 'Kantor')->count();

        // Employee with most exits this month
        $topEmployee = $monthlyPermits->groupBy('employee_id')
            ->map(function ($items) {
                $totalSeconds = (int) $items
                    ->map(fn ($permit) => $permit->duration_seconds_effective ?? 0)
                    ->sum();
                return [
                    'employee_name' => $items->first()->employee_name,
                    'nip' => $items->first()->nip,
                    'count' => $items->count(),
                    'total_seconds' => $totalSeconds,
                    'total_minutes' => (int) floor($totalSeconds / 60),
                ];
            })
            ->sortByDesc('count')
            ->first();

        return response()->json([
            'today' => [
                'total' => $todayTotal,
                'currently_out' => $todayOut,
                'returned' => $todayReturned,
                'avg_duration' => (int) round($todayAvgDurationSeconds / 60),
                'avg_duration_seconds' => $todayAvgDurationSeconds,
                'pribadi_count' => $todayPribadi,
                'kantor_count' => $todayKantor,
            ],
            'monthly' => [
                'total' => $monthlyTotal,
                'avg_duration' => (int) round($monthlyAvgDurationSeconds / 60),
                'avg_duration_seconds' => $monthlyAvgDurationSeconds,
                'top_employee' => $topEmployee,
                'pribadi_count' => $monthlyPribadi,
                'kantor_count' => $monthlyKantor,
            ],
        ]);
    }

    /**
     * PROTECTED: Analytics data for Monitoring Izin Keluar.
     * Provides weekly trends, hourly exit distribution, top-by-hour and
     * employee pattern detection (frequent exits at the same hour).
     */
    public function analytics(Request $request)
    {
        $month = (int) ($request->input('month', Carbon::now('Asia/Makassar')->format('m')));
        $year = (int) ($request->input('year', Carbon::now('Asia/Makassar')->format('Y')));

        // ---------- Weekly (last 7 days, relative to today) ----------
        $today = Carbon::now('Asia/Makassar')->startOfDay();
        $weekly = [];
        for ($i = 6; $i >= 0; $i--) {
            $day = $today->copy()->subDays($i);
            $dayStr = $day->format('Y-m-d');
            $dayPermits = ExitPermit::where('date', $dayStr)->get();
            $weekly[] = [
                'date' => $dayStr,
                'label' => $day->format('d MMM'),
                'total' => $dayPermits->count(),
                'kantor' => $dayPermits->where('permit_type', 'Kantor')->count(),
                'pribadi' => $dayPermits->where('permit_type', 'Pribadi')->count(),
            ];
        }

        // ---------- Hourly distribution (exit_time hour) ----------
        $monthPermits = ExitPermit::whereYear('date', $year)
            ->whereMonth('date', $month)
            ->get();

        $hourly = [];
        for ($h = 0; $h < 24; $h++) {
            $hourly[] = [
                'hour' => $h,
                'label' => sprintf('%02d:00', $h),
                'total' => 0,
            ];
        }

        foreach ($monthPermits as $permit) {
            if (!$permit->exit_time) continue;
            $hour = (int) explode(':', $permit->exit_time)[0];
            if ($hour >= 0 && $hour < 24 && isset($hourly[$hour])) {
                $hourly[$hour]['total']++;
            }
        }

        $maxHourTotal = max(array_column($hourly, 'total'));
        foreach ($hourly as &$hItem) {
            $hItem['is_peak'] = $maxHourTotal > 0 && $hItem['total'] === $maxHourTotal;
        }
        unset($hItem);

        // ---------- Top employee by hour (pattern detection) ----------
        $comboCounts = [];
        foreach ($monthPermits as $permit) {
            if (!$permit->exit_time) continue;
            $hour = (int) explode(':', $permit->exit_time)[0];
            $key = ($permit->employee_id ?: $permit->nip) . '|' . $hour;
            if (!isset($comboCounts[$key])) {
                $comboCounts[$key] = [
                    'employee_id' => $permit->employee_id,
                    'employee_name' => $permit->employee_name ?: 'Pegawai',
                    'nip' => $permit->nip,
                    'hour' => $hour,
                    'hour_label' => sprintf('%02d:00 - %02d:59', $hour, $hour),
                    'count' => 0,
                ];
            }
            $comboCounts[$key]['count']++;
        }

        $topByHour = collect($comboCounts)
            ->sortByDesc('count')
            ->take(5)
            ->values()
            ->all();

        // Pattern: employee exited >= 3 times at the exact same hour this month
        $patterns = collect($comboCounts)
            ->filter(fn ($combo) => $combo['count'] >= 3)
            ->sortByDesc('count')
            ->values()
            ->take(8)
            ->all();

        // Monthly summary reuse
        $monthlyTotal = $monthPermits->count();
        $monthlyReturnedCollection = $monthPermits->where('status', 'returned')->values();
        $monthlyAvgDurationSeconds = (int) round(
            $monthlyReturnedCollection
                ->map(fn ($permit) => $permit->duration_seconds_effective)
                ->filter(fn ($seconds) => $seconds !== null)
                ->avg() ?? 0
        );

        $topEmployee = $monthPermits->groupBy('employee_id')
            ->map(function ($items) {
                $totalSeconds = (int) $items
                    ->map(fn ($permit) => $permit->duration_seconds_effective ?? 0)
                    ->sum();
                return [
                    'employee_name' => $items->first()->employee_name,
                    'nip' => $items->first()->nip,
                    'count' => $items->count(),
                    'total_seconds' => $totalSeconds,
                    'total_minutes' => (int) floor($totalSeconds / 60),
                ];
            })
            ->sortByDesc('count')
            ->first();

        return response()->json([
            'weekly' => $weekly,
            'hourly' => $hourly,
            'top_by_hour' => $topByHour,
            'patterns' => $patterns,
            'monthly' => [
                'total' => $monthlyTotal,
                'avg_duration' => (int) round($monthlyAvgDurationSeconds / 60),
                'avg_duration_seconds' => $monthlyAvgDurationSeconds,
                'top_employee' => $topEmployee,
            ],
        ]);
    }

    /**
     * PROTECTED: Delete an exit permit.
     */
    public function destroy($id)
    {
        $permit = ExitPermit::findOrFail($id);
        $permit->delete();

        return response()->json(['message' => 'Data izin keluar berhasil dihapus.']);
    }

    /**
     * PROTECTED: Add or update nomor surat for an exit permit row.
     */
    public function updateNomorSurat(Request $request, $id)
    {
        $validated = $request->validate([
            'nomor_surat' => 'nullable|string|max:100',
        ]);

        $permit = ExitPermit::findOrFail($id);
        $nomorSurat = isset($validated['nomor_surat'])
            ? trim((string) $validated['nomor_surat'])
            : null;

        $permit->update([
            'nomor_surat' => $nomorSurat !== '' ? $nomorSurat : null,
        ]);

        return response()->json([
            'message' => 'Nomor surat berhasil disimpan.',
            'permit' => $permit->fresh(),
        ]);
    }

    /**
     * ADMIN: Get exit permit settings.
     */
    public function getSettings()
    {
        $settings = NotificationSetting::first();
        $raw = $settings?->exit_permit_settings;

        $defaults = [
            'mon_thu' => ['start' => '12:00', 'end' => '13:00'],
            'fri' => ['start' => '12:00', 'end' => '13:30'],
        ];

        // If raw is null, empty array [], or not an array, start from defaults
        if (empty($raw) || !is_array($raw)) {
            $raw = $defaults;
        }

        // Ensure both mon_thu and fri exist with complete start/end defaults
        foreach (array_keys($defaults) as $key) {
            if (empty($raw[$key]) || !is_array($raw[$key])) {
                $raw[$key] = $defaults[$key];
            } else {
                $raw[$key] = array_merge($defaults[$key], $raw[$key]);
            }
        }

        \Log::info('Exit Permit Settings Retrieved:', ['id' => $settings?->id, 'data' => $raw]);

        return response()->json($raw);
    }

    /**
     * ADMIN: Update exit permit settings.
     */
    public function updateSettings(Request $request)
    {
        \Log::info('Exit Permit Settings Update Payload:', $request->all());
        
        $validated = $request->validate([
            'mon_thu' => 'required|array',
            'mon_thu.start' => 'required|string',
            'mon_thu.end' => 'required|string',
            'fri' => 'required|array',
            'fri.start' => 'required|string',
            'fri.end' => 'required|string',
        ]);

        NotificationSetting::updateOrCreate(
            ['id' => 1], // Explicit singleton ID
            [
                'exit_permit_settings' => $validated,
                'fonnte_endpoint' => 'https://api.fonnte.com/send',
                'default_admin_numbers' => [],
                'recipients' => [],
                'kgb_window' => [],
                'surat_tugas_templates' => [],
                'hero_slider' => [],
            ]
        );
        
        \Log::info('Exit Permit Settings Saved to ID 1.');

        return response()->json(['message' => 'Pengaturan berhasil diperbarui.']);
    }

    /**
     * Private Helper: Calculate effective seconds minus break times.
     */
    private function calculateEffectiveSeconds($date, $startMoment, $endMoment)
    {
        $totalSeconds = $startMoment->diffInSeconds($endMoment);
        
        $settingsRow = NotificationSetting::first();
        $raw = $settingsRow?->exit_permit_settings;

        // Default values consistent with frontend
        $defaults = [
            'mon_thu' => ['start' => '12:00', 'end' => '13:00'],
            'fri' => ['start' => '12:00', 'end' => '13:30'],
        ];

        // Merge raw data with defaults
        $settings = $defaults;
        if (!empty($raw) && is_array($raw)) {
            foreach (array_keys($defaults) as $key) {
                if (!empty($raw[$key]) && is_array($raw[$key])) {
                    $settings[$key] = array_merge($defaults[$key], $raw[$key]);
                }
            }
        }

        $dayOfWeek = $startMoment->dayOfWeek; // 0 (Sun) - 6 (Sat)
        $isFriday = ($dayOfWeek === 5);
        $isMonToThu = ($dayOfWeek >= 1 && $dayOfWeek <= 4);

        $breakConfig = null;
        if ($isFriday) {
            $breakConfig = $settings['fri'] ?? null;
        } elseif ($isMonToThu) {
            $breakConfig = $settings['mon_thu'] ?? null;
        }

        if (!$breakConfig || empty($breakConfig['start']) || empty($breakConfig['end'])) {
            return max(0, $totalSeconds);
        }

        $dateStr = $date instanceof Carbon ? $date->format('Y-m-d') : Carbon::parse($date)->format('Y-m-d');
        
        $breakStart = Carbon::parse($dateStr . ' ' . $breakConfig['start'] . ':00', 'Asia/Makassar');
        $breakEnd = Carbon::parse($dateStr . ' ' . $breakConfig['end'] . ':00', 'Asia/Makassar');

        // Overlap calculation
        $overlapStart = $startMoment->gt($breakStart) ? $startMoment : $breakStart;
        $overlapEnd = $endMoment->lt($breakEnd) ? $endMoment : $breakEnd;

        if ($overlapStart->lt($overlapEnd)) {
            $overlapSeconds = $overlapStart->diffInSeconds($overlapEnd);
            return max(0, (int)($totalSeconds - $overlapSeconds));
        }

        return max(0, $totalSeconds);
    }

    /**
     * ADMIN: Update exit_time and/or return_time for an exit permit (with seconds precision).
     */
    public function updateTimes(Request $request, $id)
    {
        $validated = $request->validate([
            'date'        => ['nullable', 'date'],
            'exit_time'   => ['nullable', 'date_format:H:i:s'],
            'return_time' => ['nullable', 'date_format:H:i:s'],
        ]);

        $permit = ExitPermit::findOrFail($id);

        $newExitTime   = $validated['exit_time']   ?? null;
        $newReturnTime = $validated['return_time']  ?? null;

        // At least one field must be provided
        if (!$newExitTime && !$newReturnTime) {
            return response()->json(['message' => 'Minimal satu waktu (keluar / kembali) harus diisi.'], 422);
        }

        $exitTimeStr   = $newExitTime   ?: $permit->exit_time;
        $returnTimeStr = $newReturnTime ?: $permit->return_time;

        $dateStr = $validated['date'] ?? (
            $permit->date instanceof Carbon
                ? $permit->date->format('Y-m-d')
                : Carbon::parse($permit->date)->format('Y-m-d')
        );

        $exitMoment = Carbon::parse($dateStr . ' ' . $exitTimeStr, 'Asia/Makassar');

        $updateData = [
            'date'      => $dateStr,
            'exit_time' => $exitTimeStr,
        ];

        if ($returnTimeStr) {
            $returnMoment = Carbon::parse($dateStr . ' ' . $returnTimeStr, 'Asia/Makassar');

            if ($returnMoment->lt($exitMoment)) {
                return response()->json([
                    'message' => 'Jam kembali tidak boleh lebih kecil dari jam keluar.',
                ], 422);
            }

            $durationSeconds = $this->calculateEffectiveSeconds($permit->date, $exitMoment, $returnMoment);
            $durationMinutes = (int) floor($durationSeconds / 60);

            $updateData['return_time']      = $returnTimeStr;
            $updateData['duration_seconds']  = $durationSeconds;
            $updateData['duration_minutes']  = $durationMinutes;
        } else {
            // Return time not set yet — only update exit_time, recalc not possible
            $updateData['return_time']      = null;
            $updateData['duration_seconds'] = null;
            $updateData['duration_minutes'] = null;
        }

        $permit->update($updateData);

        return response()->json([
            'message' => 'Waktu berhasil diperbarui.',
            'permit'  => $permit->fresh(),
        ]);
    }

    /**
     * PROTECTED: Update permit_type (Jenis Urusan) for an exit permit.
     */
    public function updatePermitType(Request $request, $id)
    {
        $validated = $request->validate([
            'permit_type' => 'required|in:Pribadi,Kantor',
        ]);

        $permit = ExitPermit::findOrFail($id);
        $permit->update([
            'permit_type' => $validated['permit_type'],
        ]);

        return response()->json([
            'message' => 'Jenis urusan berhasil diperbarui.',
            'permit' => $permit->fresh(),
        ]);
    }

    /**
     * PROTECTED: return available placeholder parameters for DOCX template.
     */
    public function wordTemplateParameters()
    {
        $wrapped = array_map(
            static fn ($k) => '${' . $k . '}',
            self::WORD_TEMPLATE_PARAMETERS
        );

        return response()->json([
            'parameters' => self::WORD_TEMPLATE_PARAMETERS,
            'placeholders' => $wrapped,
        ]);
    }

    /**
     * PROTECTED: generate DOCX file from template for one exit permit.
     */
    public function generateWord(Request $request, $id)
    {
        $permit = ExitPermit::with('employee')->findOrFail($id);

        if (!$permit->nomor_surat) {
            return response()->json([
                'message' => 'Nomor surat harus diisi sebelum generate dokumen.',
            ], 422);
        }

        $templatePath = env('RISPEG_WORD_TEMPLATE_PATH');
        if (!$templatePath) {
            $templatePath = storage_path('app/templates/rispeg_exit_permit_template.docx');
        } elseif (!$this->isAbsolutePath($templatePath)) {
            $templatePath = base_path($templatePath);
        }

        if (!file_exists($templatePath)) {
            return response()->json([
                'message' => 'Template Word tidak ditemukan. Letakkan file template di: ' . $templatePath,
            ], 404);
        }

        $now = Carbon::now('Asia/Makassar');
        $tanggalIzin = $permit->date ? Carbon::parse($permit->date) : null;

        $replacements = [
            'nomor_surat' => (string) ($permit->nomor_surat ?? ''),
            'nama_pegawai' => (string) ($permit->employee_name ?? ''),
            'nip' => (string) ($permit->nip ?? ''),
            'tanggal_izin' => $tanggalIzin ? $tanggalIzin->locale('id')->translatedFormat('d F Y') : '-',
            'tanggal_izin_iso' => $tanggalIzin ? $tanggalIzin->format('Y-m-d') : '-',
            'jam_keluar' => $this->formatTime($permit->exit_time),
            'jam_kembali' => $permit->return_time ? $this->formatTime($permit->return_time) : '-',
            'durasi_menit' => $permit->duration_seconds_effective !== null
                ? (string) ((int) floor($permit->duration_seconds_effective / 60))
                : '0',
            'durasi_format' => $this->formatDurationHumanSeconds($permit->duration_seconds_effective),
            'keperluan' => (string) ($permit->reason ?? '-'),
            'jenis_urusan' => (string) ($permit->permit_type ?? 'Pribadi'),
            'status_izin' => $permit->status === 'out' ? 'Di Luar' : 'Kembali',
            'tanggal_cetak' => $now->copy()->locale('id')->translatedFormat('d F Y'),
            'waktu_cetak' => $now->format('H:i'),
            'tahun' => $now->format('Y'),
            'bulan' => $now->locale('id')->translatedFormat('F'),
            'hari' => $now->locale('id')->translatedFormat('l'),
            'jabatan' => (string) ($permit->employee->position ?? '-'),
            'fungsi_area' => (string) ($permit->employee->function_area ?? '-'),
        ];

        $outputPath = storage_path('app/tmp/exit_permit_' . $permit->id . '_' . time() . '.docx');
        if (!is_dir(dirname($outputPath))) {
            mkdir(dirname($outputPath), 0755, true);
        }

        $ok = $this->fillDocxTemplate($templatePath, $outputPath, $replacements);
        if (!$ok) {
            return response()->json([
                'message' => 'Gagal memproses template Word.',
            ], 500);
        }

        $safeName = preg_replace('/[^A-Za-z0-9_\-]/', '_', (string) ($permit->employee_name ?? 'pegawai'));
        $filename = 'Surat_Izin_Keluar_' . $safeName . '_' . $now->format('Ymd_His') . '.docx';

        return response()->download($outputPath, $filename)->deleteFileAfterSend(true);
    }

    private function fillDocxTemplate(string $templatePath, string $outputPath, array $replacements): bool
    {
        if (!copy($templatePath, $outputPath)) {
            return false;
        }

        $zip = new ZipArchive();
        if ($zip->open($outputPath) !== true) {
            return false;
        }

        $search = [];
        $replace = [];
        foreach ($replacements as $key => $value) {
            $search[] = '${' . $key . '}';
            $replace[] = htmlspecialchars((string) $value, ENT_XML1 | ENT_COMPAT, 'UTF-8');
        }

        for ($i = 0; $i < $zip->numFiles; $i++) {
            $name = $zip->getNameIndex($i);
            if (!$name) {
                continue;
            }

            if (!str_starts_with($name, 'word/') || !str_ends_with($name, '.xml')) {
                continue;
            }

            $content = $zip->getFromName($name);
            if ($content === false) {
                continue;
            }

            $updated = str_replace($search, $replace, $content);
            if ($updated !== $content) {
                $zip->addFromString($name, $updated);
            }
        }

        $zip->close();

        return true;
    }

    private function formatDurationHumanSeconds($seconds): string
    {
        $safe = max(0, (int) ($seconds ?? 0));
        $hours = intdiv($safe, 3600);
        $mins = intdiv($safe % 3600, 60);
        $secs = $safe % 60;

        if ($hours > 0 && $mins > 0) {
            return $hours . ' jam ' . $mins . ' menit ' . $secs . ' detik';
        }
        if ($hours > 0) {
            return $hours . ' jam ' . $secs . ' detik';
        }
        if ($mins > 0) {
            return $mins . ' menit ' . $secs . ' detik';
        }
        return $secs . ' detik';
    }

    private function formatTime($time): string
    {
        if (!$time) {
            return '-';
        }

        $parts = explode(':', (string) $time);
        return count($parts) >= 2 ? ($parts[0] . ':' . $parts[1]) : (string) $time;
    }

    private function isAbsolutePath(string $path): bool
    {
        return str_starts_with($path, '/')
            || preg_match('/^[A-Za-z]:[\\\\\\/]/', $path) === 1;
    }

    private function distanceMeters(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371000.0;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        return $earthRadius * $c;
    }
}
