<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\EmployeeMedicalBalance;
use App\Models\MedicalCheckupPackage;
use App\Models\MedicalCheckupRequest;
use App\Models\MedicalCheckupRequestItem;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MedicalCheckupController extends Controller
{
    /**
     * Default packages for initial seeding if table is empty.
     */
    private const DEFAULT_PACKAGES = [
        [
            'name' => 'Pemeriksaan Darah Lengkap (CBC)',
            'code' => 'LAB-CBC',
            'category' => 'Laboratorium Darah',
            'price' => 120000,
            'description' => 'Evaluasi sel darah: Hemoglobin (Hb), Leukosit, Trombosit, Hematokrit, Eritrosit, dan Laju Endap Darah (LED).',
            'sort_order' => 1,
        ],
        [
            'name' => 'Profil Lemak & Kolesterol Lengkap',
            'code' => 'LAB-LIPID',
            'category' => 'Laboratorium Darah',
            'price' => 175000,
            'description' => 'Pemeriksaan Kolesterol Total, HDL (Kolesterol Baik), LDL (Kolesterol Jahat), dan Trigliserida.',
            'sort_order' => 2,
        ],
        [
            'name' => 'Fungsi Ginjal & Asam Urat',
            'code' => 'LAB-GINJAL',
            'category' => 'Laboratorium Darah',
            'price' => 140000,
            'description' => 'Pemeriksaan Ureum, Kreatinin darah, eGFR, dan kadar Asam Urat (Uric Acid).',
            'sort_order' => 3,
        ],
        [
            'name' => 'Fungsi Hati (SGOT & SGPT)',
            'code' => 'LAB-HATI',
            'category' => 'Laboratorium Darah',
            'price' => 135000,
            'description' => 'Pemeriksaan enzim hati SGOT (AST) dan SGPT (ALT) untuk mendeteksi gangguan atau peradangan hati.',
            'sort_order' => 4,
        ],
        [
            'name' => 'Gula Darah Puasa & 2 Jam PP',
            'code' => 'LAB-GLUCOSE',
            'category' => 'Laboratorium Darah',
            'price' => 90000,
            'description' => 'Skrining diabetes melitus: Glukosa Darah Puasa dan Glukosa 2 Jam Post Prandial.',
            'sort_order' => 5,
        ],
        [
            'name' => 'HbA1c (Kontrol Gula Darah 3 Bulan)',
            'code' => 'LAB-HBA1C',
            'category' => 'Laboratorium Darah',
            'price' => 190000,
            'description' => 'Pemeriksaan rata-rata kadar gula darah dalam 3 bulan terakhir untuk pemantauan diabetes.',
            'sort_order' => 6,
        ],
        [
            'name' => 'Pemeriksaan Urine Lengkap (Urinanalisis)',
            'code' => 'LAB-URINE',
            'category' => 'Laboratorium Urine',
            'price' => 75000,
            'description' => 'Analisis kimia dan mikroskopik sedimen urine untuk deteksi infeksi saluran kemih dan fungsi ginjal.',
            'sort_order' => 7,
        ],
        [
            'name' => 'Elektrokardiografi (EKG / Rekam Jantung)',
            'code' => 'CARDIO-EKG',
            'category' => 'Kardiologi & Diagnostik',
            'price' => 160000,
            'description' => 'Pemeriksaan rekam aktivitas listrik jantung untuk mendeteksi aritmia, iskemia, atau beban jantung.',
            'sort_order' => 8,
        ],
        [
            'name' => 'Rontgen Thorax (Foto Dada PA)',
            'code' => 'RAD-THORAX',
            'category' => 'Radiologi',
            'price' => 220000,
            'description' => 'Pemeriksaan radiologi foto dada untuk evaluasi kondisi paru-paru, pembesaran jantung, dan tulang dada.',
            'sort_order' => 9,
        ],
        [
            'name' => 'USG Abdomen Lengkap',
            'code' => 'RAD-USG-ABD',
            'category' => 'Radiologi',
            'price' => 350000,
            'description' => 'Ultrasonografi perut untuk melihat struktur hati, kantung empedu, ginjal, limpa, dan pankreas.',
            'sort_order' => 10,
        ],
        [
            'name' => 'Pemeriksaan Fisik & Dokter Umum',
            'code' => 'CLINIC-GEN',
            'category' => 'Pemeriksaan Fisik Dokter',
            'price' => 100000,
            'description' => 'Konsultasi dokter, tekanan darah, indeks massa tubuh (BMI), visus mata, auskultasi dada & paru.',
            'sort_order' => 11,
        ],
        [
            'name' => 'Skrining Hepatitis B (HBsAg Kualitatif)',
            'code' => 'LAB-HBSAG',
            'category' => 'Imunoserologi',
            'price' => 110000,
            'description' => 'Deteksi dini antigen virus Hepatitis B dalam serum darah.',
            'sort_order' => 12,
        ],
    ];

    /**
     * 1. Get active medical checkup packages
     */
    public function packages(Request $request)
    {
        $query = MedicalCheckupPackage::orderBy('sort_order')->orderBy('id');

        if (!$request->boolean('include_inactive', false)) {
            $query->where('is_active', true);
        }

        if ($request->filled('category') && $request->string('category') !== 'all') {
            $query->where('category', $request->string('category'));
        }
        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('category', 'like', "%{$search}%");
            });
        }

        return response()->json([
            'data' => $query->get(),
            'categories' => MedicalCheckupPackage::where('is_active', true)->distinct()->pluck('category')->filter()->values(),
        ]);
    }

    /**
     * 2. Get current employee medical checkup balance
     */
    public function myBalance(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $employee = $this->resolveEmployee($user);
        $nip = $employee?->nip ?? $user->nip;
        $name = $employee?->name ?? $employee?->nama ?? $user->name;
        $year = (int) $request->query('tahun_anggaran', date('Y'));

        if (!$nip) {
            return response()->json([
                'employee' => [
                    'name' => $name,
                    'nip' => '-',
                    'department' => $user->unit_kerja ?? 'SIPTU',
                ],
                'balance' => [
                    'tahun_anggaran' => $year,
                    'initial_balance' => 0,
                    'used_balance' => 0,
                    'current_balance' => 0,
                ],
            ]);
        }

        $balance = EmployeeMedicalBalance::firstOrCreate(
            ['nip' => $nip, 'tahun_anggaran' => $year],
            [
                'employee_id' => $employee?->id,
                'employee_name' => $name,
                'initial_balance' => 2000000, // Default initial plafon Rp 2.000.000
                'used_balance' => 0,
                'current_balance' => 2000000,
                'notes' => 'Plafon awal otomatis TA ' . $year,
            ]
        );

        return response()->json([
            'employee' => [
                'id' => $employee?->id,
                'name' => $name,
                'nip' => $nip,
                'department' => $employee?->function_area ?? $employee?->department ?? 'SIPTU',
                'phone_number' => $employee?->phone_number ?? $user->phone_number,
            ],
            'balance' => $balance,
        ]);
    }

    /**
     * 3. Get my medical checkup request history
     */
    public function myRequests(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $employee = $this->resolveEmployee($user);
        $nip = $employee?->nip ?? $user->nip;

        $query = MedicalCheckupRequest::with(['items', 'approver:id,name'])
            ->where(function ($q) use ($user, $nip, $employee) {
                $q->where('user_id', $user->id);
                if ($nip) {
                    $q->orWhere('nip', $nip);
                }
                if ($employee) {
                    $q->orWhere('employee_id', $employee->id);
                }
            })
            ->orderByDesc('created_at');

        if ($request->filled('status') && $request->string('status') !== 'all') {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('tahun_anggaran') && $request->string('tahun_anggaran') !== 'all') {
            $query->where('tahun_anggaran', (int) $request->string('tahun_anggaran'));
        }

        return response()->json(['data' => $query->get()]);
    }

    /**
     * 4. Submit new medical checkup request
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $payload = $request->validate([
            'package_ids' => ['required', 'array', 'min:1'],
            'package_ids.*' => ['integer', 'exists:medical_checkup_packages,id'],
            'planned_date' => ['required', 'date'],
            'faskes_name' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'tahun_anggaran' => ['nullable', 'integer'],
        ]);

        $employee = $this->resolveEmployee($user);
        $nip = $employee?->nip ?? $user->nip;
        $name = $employee?->name ?? $employee?->nama ?? $user->name;
        $year = (int) ($payload['tahun_anggaran'] ?? date('Y'));

        if (!$nip) {
            return response()->json(['message' => 'NIP pegawai tidak teridentifikasi pada akun Anda.'], 422);
        }

        // Get selected packages
        $packages = MedicalCheckupPackage::whereIn('id', $payload['package_ids'])
            ->where('is_active', true)
            ->get();

        if ($packages->isEmpty()) {
            return response()->json(['message' => 'Pilih minimal satu jenis pemeriksaan yang valid.'], 422);
        }

        $totalAmount = (float) $packages->sum('price');

        // Fetch / lock employee balance for transaction
        return DB::transaction(function () use ($user, $employee, $nip, $name, $year, $packages, $totalAmount, $payload) {
            $balance = EmployeeMedicalBalance::where('nip', $nip)
                ->where('tahun_anggaran', $year)
                ->lockForUpdate()
                ->first();

            if (!$balance) {
                $balance = EmployeeMedicalBalance::create([
                    'employee_id' => $employee?->id,
                    'nip' => $nip,
                    'employee_name' => $name,
                    'tahun_anggaran' => $year,
                    'initial_balance' => 2000000,
                    'used_balance' => 0,
                    'current_balance' => 2000000,
                ]);
            }

            $currentBalance = (float) $balance->current_balance;

            if ($totalAmount > $currentBalance) {
                return response()->json([
                    'message' => "Saldo tidak mencukupi! Total biaya pemeriksaan (Rp " . number_format($totalAmount, 0, ',', '.') . ") melebihi sisa saldo Anda (Rp " . number_format($currentBalance, 0, ',', '.') . ").",
                ], 422);
            }

            $balanceBefore = $currentBalance;
            $balanceAfter = $currentBalance - $totalAmount;

            // Generate Request Number
            $prefix = 'MCU-' . now()->format('Ymd') . '-';
            $todayCount = MedicalCheckupRequest::whereDate('created_at', now()->toDateString())->count() + 1;
            $requestNumber = $prefix . str_pad((string) $todayCount, 4, '0', STR_PAD_LEFT);

            // Create Request
            $mcuRequest = MedicalCheckupRequest::create([
                'request_number' => $requestNumber,
                'tahun_anggaran' => $year,
                'employee_id' => $employee?->id,
                'user_id' => $user->id,
                'nip' => $nip,
                'employee_name' => $name,
                'department' => $employee?->function_area ?? $employee?->department ?? 'SIPTU',
                'phone_number' => $employee?->phone_number ?? $user->phone_number,
                'planned_date' => $payload['planned_date'],
                'faskes_name' => $payload['faskes_name'],
                'total_amount' => $totalAmount,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'status' => 'pending',
                'notes' => $payload['notes'] ?? null,
            ]);

            // Create Items
            foreach ($packages as $pkg) {
                MedicalCheckupRequestItem::create([
                    'medical_checkup_request_id' => $mcuRequest->id,
                    'medical_checkup_package_id' => $pkg->id,
                    'package_name' => $pkg->name,
                    'package_category' => $pkg->category,
                    'price' => $pkg->price,
                    'notes' => $pkg->code,
                ]);
            }

            // Deduct Employee Balance
            $balance->used_balance = (float) $balance->used_balance + $totalAmount;
            $balance->current_balance = $balanceAfter;
            $balance->save();

            if (class_exists(ActivityLogger::class)) {
                ActivityLogger::log('create', 'medical_checkup', "Mengajukan pemeriksaan kesehatan ({$requestNumber}) sebesar Rp " . number_format($totalAmount, 0, ',', '.'), $requestNumber);
            }

            return response()->json([
                'message' => 'Pengajuan pemeriksaan kesehatan berhasil dikirim dan saldo telah diperbarui.',
                'data' => $mcuRequest->load('items'),
                'balance' => $balance,
            ], 201);
        });
    }

    /**
     * 5. Cancel pending request by user (Refunds balance)
     */
    public function cancelMyRequest(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $employee = $this->resolveEmployee($user);
        $nip = $employee?->nip ?? $user->nip;

        $mcuRequest = MedicalCheckupRequest::where('id', $id)
            ->where(function ($q) use ($user, $nip, $employee) {
                $q->where('user_id', $user->id);
                if ($nip) {
                    $q->orWhere('nip', $nip);
                }
                if ($employee) {
                    $q->orWhere('employee_id', $employee->id);
                }
            })
            ->firstOrFail();

        if ($mcuRequest->status !== 'pending') {
            return response()->json(['message' => 'Hanya pengajuan dengan status Menunggu (Pending) yang dapat dibatalkan.'], 422);
        }

        return DB::transaction(function () use ($mcuRequest) {
            $totalAmount = (float) $mcuRequest->total_amount;

            // Refund balance
            $balance = EmployeeMedicalBalance::where('nip', $mcuRequest->nip)
                ->where('tahun_anggaran', $mcuRequest->tahun_anggaran)
                ->lockForUpdate()
                ->first();

            if ($balance) {
                $balance->used_balance = max(0, (float) $balance->used_balance - $totalAmount);
                $balance->current_balance = (float) $balance->initial_balance - (float) $balance->used_balance;
                $balance->save();
            }

            $mcuRequest->status = 'cancelled';
            $mcuRequest->save();

            if (class_exists(ActivityLogger::class)) {
                ActivityLogger::log('cancel', 'medical_checkup', "Membatalkan pengajuan MCU ({$mcuRequest->request_number})", $mcuRequest->request_number);
            }

            return response()->json([
                'message' => 'Pengajuan pemeriksaan kesehatan berhasil dibatalkan dan saldo telah dikembalikan.',
                'data' => $mcuRequest,
                'balance' => $balance,
            ]);
        });
    }

    /**
     * 6. Admin list all requests
     */
    public function adminRequests(Request $request)
    {
        $user = $request->user();
        if (!$this->isAdminOrValidator($user)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $query = MedicalCheckupRequest::with(['items', 'approver:id,name', 'employee:id,name,nip,position'])
            ->orderByDesc('created_at');

        if ($request->filled('status') && $request->string('status') !== 'all') {
            $query->where('status', $request->string('status'));
        }
        
        $ta = $request->query('tahun_anggaran');
        if (!empty($ta) && $ta !== 'all' && is_numeric($ta)) {
            $yearInt = (int) $ta;
            $currentYear = (int) date('Y');
            if ($yearInt === $currentYear) {
                $query->where(function ($q) use ($yearInt) {
                    $q->where('tahun_anggaran', $yearInt)
                      ->orWhereNull('tahun_anggaran');
                });
            } else {
                $query->where('tahun_anggaran', $yearInt);
            }
        }

        if ($request->filled('start_date')) {
            $query->whereDate('planned_date', '>=', $request->string('start_date'));
        }
        if ($request->filled('end_date')) {
            $query->whereDate('planned_date', '<=', $request->string('end_date'));
        }
        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($q) use ($search) {
                $q->where('request_number', 'like', "%{$search}%")
                  ->orWhere('employee_name', 'like', "%{$search}%")
                  ->orWhere('nip', 'like', "%{$search}%")
                  ->orWhere('faskes_name', 'like', "%{$search}%")
                  ->orWhere('department', 'like', "%{$search}%");
            });
        }

        return response()->json(['data' => $query->get()]);
    }

    /**
     * 7. Admin update request status (Approve, Complete, Reject)
     */
    public function updateStatus(Request $request, string $id)
    {
        $user = $request->user();
        if (!$this->isAdminOrValidator($user)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $payload = $request->validate([
            'status' => ['required', 'in:pending,approved,completed,rejected,cancelled'],
            'admin_notes' => ['nullable', 'string'],
        ]);

        $mcuRequest = MedicalCheckupRequest::findOrFail($id);
        $oldStatus = $mcuRequest->status;
        $newStatus = $payload['status'];

        return DB::transaction(function () use ($user, $mcuRequest, $oldStatus, $newStatus, $payload) {
            $totalAmount = (float) $mcuRequest->total_amount;
            $balance = EmployeeMedicalBalance::where('nip', $mcuRequest->nip)
                ->where('tahun_anggaran', $mcuRequest->tahun_anggaran)
                ->lockForUpdate()
                ->first();

            // If changing to rejected/cancelled and it was active, refund balance
            if (in_array($newStatus, ['rejected', 'cancelled'], true) && in_array($oldStatus, ['pending', 'approved', 'completed'], true)) {
                if ($balance) {
                    $balance->used_balance = max(0, (float) $balance->used_balance - $totalAmount);
                    $balance->current_balance = (float) $balance->initial_balance - (float) $balance->used_balance;
                    $balance->save();
                }
            }

            // If un-rejecting back to pending/approved/completed, deduct balance back
            if (in_array($oldStatus, ['rejected', 'cancelled'], true) && in_array($newStatus, ['pending', 'approved', 'completed'], true)) {
                if ($balance) {
                    $balance->used_balance = (float) $balance->used_balance + $totalAmount;
                    $balance->current_balance = (float) $balance->initial_balance - (float) $balance->used_balance;
                    $balance->save();
                }
            }

            $mcuRequest->status = $newStatus;
            $mcuRequest->admin_notes = $payload['admin_notes'] ?? $mcuRequest->admin_notes;
            $mcuRequest->approved_by = $user->id;

            if ($newStatus === 'approved') {
                $mcuRequest->approved_at = now();
            } elseif ($newStatus === 'completed') {
                $mcuRequest->completed_at = now();
            }

            $mcuRequest->save();

            if (class_exists(ActivityLogger::class)) {
                ActivityLogger::log('update', 'medical_checkup', "Memperbarui status pengajuan MCU ({$mcuRequest->request_number}) menjadi {$newStatus}", $mcuRequest->request_number);
            }

            return response()->json([
                'message' => "Status pengajuan MCU berhasil diperbarui menjadi {$newStatus}.",
                'data' => $mcuRequest->load(['items', 'approver:id,name']),
            ]);
        });
    }

    /**
     * 8. Admin delete request
     */
    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        if (!$this->isAdminOrValidator($user)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $mcuRequest = MedicalCheckupRequest::findOrFail($id);

        return DB::transaction(function () use ($mcuRequest) {
            // Refund balance if active
            if (in_array($mcuRequest->status, ['pending', 'approved'], true)) {
                $balance = EmployeeMedicalBalance::where('nip', $mcuRequest->nip)
                    ->where('tahun_anggaran', $mcuRequest->tahun_anggaran)
                    ->lockForUpdate()
                    ->first();

                if ($balance) {
                    $balance->used_balance = max(0, (float) $balance->used_balance - (float) $mcuRequest->total_amount);
                    $balance->current_balance = (float) $balance->initial_balance - (float) $balance->used_balance;
                    $balance->save();
                }
            }

            $reqNum = $mcuRequest->request_number;
            $mcuRequest->delete();

            if (class_exists(ActivityLogger::class)) {
                ActivityLogger::log('delete', 'medical_checkup', "Menghapus data pengajuan MCU ({$reqNum})", $reqNum);
            }

            return response()->json(['message' => 'Pengajuan pemeriksaan kesehatan berhasil dihapus.']);
        });
    }

    /**
     * 9. Admin list all employee balances
     */
    public function adminBalances(Request $request)
    {
        $user = $request->user();
        if (!$this->isAdminOrValidator($user)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $year = (int) $request->query('tahun_anggaran', date('Y'));
        $query = EmployeeMedicalBalance::with('employee:id,name,nip,position,department')
            ->where('tahun_anggaran', $year)
            ->orderBy('employee_name');

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($q) use ($search) {
                $q->where('employee_name', 'like', "%{$search}%")
                  ->orWhere('nip', 'like', "%{$search}%");
            });
        }

        $balances = $query->get();

        $stats = [
            'total_employees' => $balances->count(),
            'total_initial_budget' => (float) $balances->sum('initial_balance'),
            'total_used_budget' => (float) $balances->sum('used_balance'),
            'total_remaining_budget' => (float) $balances->sum('current_balance'),
        ];

        return response()->json([
            'data' => $balances,
            'stats' => $stats,
        ]);
    }

    /**
     * 10. Admin set/update individual employee balance
     */
    public function setBalance(Request $request)
    {
        $user = $request->user();
        if (!$this->isAdminOrValidator($user)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $payload = $request->validate([
            'nip' => ['required', 'string'],
            'tahun_anggaran' => ['required', 'integer'],
            'initial_balance' => ['required', 'numeric', 'min:0'],
            'employee_name' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ]);

        $employee = Employee::where('nip', $payload['nip'])->first();

        $balance = EmployeeMedicalBalance::firstOrNew([
            'nip' => $payload['nip'],
            'tahun_anggaran' => $payload['tahun_anggaran'],
        ]);

        $balance->employee_id = $employee?->id ?? $balance->employee_id;
        $balance->employee_name = $payload['employee_name'] ?? $employee?->name ?? $balance->employee_name ?? 'Pegawai';
        $balance->initial_balance = (float) $payload['initial_balance'];
        $balance->current_balance = (float) $payload['initial_balance'] - (float) ($balance->used_balance ?? 0);
        $balance->notes = $payload['notes'] ?? $balance->notes;
        $balance->save();

        return response()->json([
            'message' => 'Plafon saldo pegawai berhasil diperbarui.',
            'data' => $balance,
        ]);
    }

    /**
     * 10b. Admin delete individual employee balance
     */
    public function adminDeleteBalance(Request $request, string $id)
    {
        $user = $request->user();
        if (!$this->isAdminOrValidator($user)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $balance = EmployeeMedicalBalance::findOrFail($id);
        $empName = $balance->employee_name ?? $balance->nip;
        $ta = $balance->tahun_anggaran;
        $balance->delete();

        if (class_exists(ActivityLogger::class)) {
            ActivityLogger::log('delete', 'medical_checkup', "Menghapus plafon/saldo MCU pegawai {$empName} (NIP: {$balance->nip}) TA {$ta}", $balance->nip);
        }

        return response()->json([
            'message' => "Plafon/saldo MCU pegawai {$empName} berhasil dihapus.",
        ]);
    }

    /**
     * 10c. Admin clear all balances for a specific year or all years
     */
    public function adminClearBalances(Request $request)
    {
        $user = $request->user();
        if (!$this->isAdminOrValidator($user)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $year = $request->input('tahun_anggaran');
        if ($year && $year !== 'all') {
            EmployeeMedicalBalance::where('tahun_anggaran', (int) $year)->delete();
            $msg = "Semua plafon saldo MCU TA {$year} berhasil dikosongkan.";
        } else {
            EmployeeMedicalBalance::truncate();
            $msg = "Semua plafon saldo MCU seluruh tahun anggaran berhasil dikosongkan.";
        }

        if (class_exists(ActivityLogger::class)) {
            ActivityLogger::log('delete', 'medical_checkup', $msg, 'BULK_DELETE');
        }

        return response()->json(['message' => $msg]);
    }

    /**
     * 11. Admin bulk initialize balances for all active employees
     */
    public function bulkInitBalances(Request $request)
    {
        $user = $request->user();
        if (!$this->isAdminOrValidator($user)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $payload = $request->validate([
            'tahun_anggaran' => ['required', 'integer'],
            'default_balance' => ['required', 'numeric', 'min:0'],
            'overwrite_existing' => ['nullable', 'boolean'],
        ]);

        $year = (int) $payload['tahun_anggaran'];
        $defaultBal = (float) $payload['default_balance'];
        $overwrite = (bool) ($payload['overwrite_existing'] ?? false);

        $employees = Employee::where(function ($q) {
            $q->whereNull('status')->orWhere('status', '!=', 'inactive');
        })->get();

        $created = 0;
        $updated = 0;

        foreach ($employees as $emp) {
            if (!$emp->nip) continue;

            $balance = EmployeeMedicalBalance::where('nip', $emp->nip)
                ->where('tahun_anggaran', $year)
                ->first();

            if (!$balance) {
                EmployeeMedicalBalance::create([
                    'employee_id' => $emp->id,
                    'nip' => $emp->nip,
                    'employee_name' => $emp->name ?? $emp->nama,
                    'tahun_anggaran' => $year,
                    'initial_balance' => $defaultBal,
                    'used_balance' => 0,
                    'current_balance' => $defaultBal,
                    'notes' => 'Inisialisasi massal TA ' . $year,
                ]);
                $created++;
            } elseif ($overwrite) {
                $balance->initial_balance = $defaultBal;
                $balance->current_balance = $defaultBal - (float) $balance->used_balance;
                $balance->save();
                $updated++;
            }
        }

        return response()->json([
            'message' => "Berhasil menginisialisasi saldo untuk TA {$year}: {$created} pegawai baru ditambahkan, {$updated} diperbarui.",
        ]);
    }

    /**
     * 11b. Admin get active employees for search / selection
     */
    public function getEmployeeOptions(Request $request)
    {
        $user = $request->user();
        if (!$this->isAdminOrValidator($user)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $employees = Employee::select('id', 'name', 'nip', 'position', 'department')
            ->where(function ($q) {
                $q->whereNull('status')->orWhere('status', '!=', 'inactive');
            })
            ->whereNotNull('nip')
            ->where('nip', '!=', '')
            ->orderBy('name', 'asc')
            ->get();

        return response()->json([
            'data' => $employees,
        ]);
    }

    /**
     * 12. Admin CRUD packages
     */
    public function adminStorePackage(Request $request)
    {
        $user = $request->user();
        if (!$this->isAdminOrValidator($user)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $payload = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50'],
            'category' => ['nullable', 'string', 'max:100'],
            'price' => ['required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string'],
            'is_active' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer'],
        ]);

        $package = MedicalCheckupPackage::create($payload);

        return response()->json([
            'message' => 'Jenis pemeriksaan berhasil ditambahkan.',
            'data' => $package,
        ], 201);
    }

    public function adminUpdatePackage(Request $request, string $id)
    {
        $user = $request->user();
        if (!$this->isAdminOrValidator($user)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $package = MedicalCheckupPackage::findOrFail($id);

        $payload = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50'],
            'category' => ['nullable', 'string', 'max:100'],
            'price' => ['required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string'],
            'is_active' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer'],
        ]);

        $package->update($payload);

        return response()->json([
            'message' => 'Jenis pemeriksaan berhasil diperbarui.',
            'data' => $package,
        ]);
    }

    public function adminDeletePackage(Request $request, string $id)
    {
        $user = $request->user();
        if (!$this->isAdminOrValidator($user)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $package = MedicalCheckupPackage::findOrFail($id);
        $package->delete();

        return response()->json(['message' => 'Jenis pemeriksaan berhasil dihapus.']);
    }

    public function adminClearAllPackages(Request $request)
    {
        $user = $request->user();
        if (!$this->isAdminOrValidator($user)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        MedicalCheckupPackage::truncate();

        return response()->json(['message' => 'Semua jenis pemeriksaan berhasil dikosongkan.']);
    }

    public function adminSeedDefaultPackages(Request $request)
    {
        $user = $request->user();
        if (!$this->isAdminOrValidator($user)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $overwrite = $request->boolean('overwrite', false);
        if ($overwrite) {
            MedicalCheckupPackage::truncate();
        }

        $inserted = 0;
        foreach (self::DEFAULT_PACKAGES as $pkg) {
            $exists = MedicalCheckupPackage::where('name', $pkg['name'])->exists();
            if (!$exists) {
                MedicalCheckupPackage::create($pkg);
                $inserted++;
            }
        }

        return response()->json([
            'message' => "Berhasil memuat {$inserted} paket pemeriksaan standar template.",
        ]);
    }

    // Helper functions
    private function resolveEmployee($user): ?Employee
    {
        if (!$user) return null;
        if ($user->employee) return $user->employee;
        if (!empty($user->nip)) {
            $emp = Employee::where('nip', $user->nip)->first();
            if ($emp) return $emp;
        }
        if (!empty($user->name)) {
            $emp = Employee::where('name', $user->name)->orWhere('nama', $user->name)->first();
            if ($emp) return $emp;
        }
        if (!empty($user->email)) {
            $emp = Employee::where('email', $user->email)->first();
            if ($emp) return $emp;
        }
        return null;
    }

    private function isAdminOrValidator($user): bool
    {
        if (!$user) return false;
        $baseRole = strtolower((string) ($user->base_role ?? $user->role ?? ''));
        if (in_array($baseRole, ['admin', 'validator', 'superadmin', 'super_admin', 'verifikator'], true)) {
            return true;
        }
        $roles = is_array($user->available_roles ?? null) ? $user->available_roles : (is_string($user->available_roles ?? null) ? json_decode($user->available_roles, true) : []);
        if (is_array($roles)) {
            $lowerRoles = array_map('strtolower', array_filter($roles, 'is_string'));
            if (in_array('admin', $lowerRoles, true) || in_array('validator', $lowerRoles, true) || in_array('superadmin', $lowerRoles, true) || in_array('verifikator', $lowerRoles, true)) {
                return true;
            }
        }
        $modules = is_array($user->role_modules ?? null) ? $user->role_modules : (is_string($user->role_modules ?? null) ? json_decode($user->role_modules, true) : []);
        if (is_array($modules) && (isset($modules['medical_checkup']) || isset($modules['layanan_mandiri']) || isset($modules['admin']))) {
            return true;
        }
        return false;
    }
}
