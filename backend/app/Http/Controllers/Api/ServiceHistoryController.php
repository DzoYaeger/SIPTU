<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ArchiveLoan;
use App\Models\BmnLoan;
use App\Models\BmnMaintenanceReport;
use App\Models\Employee;
use App\Models\ExitPermit;
use App\Models\InventoryRequest;
use App\Models\ItHelpdeskTicket;
use App\Models\SuratTugas;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class ServiceHistoryController extends Controller
{
    /**
     * Get list of all service history for the authenticated user.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $employee = Employee::query()->where('nip', $user->nip)->first();

        $type = (string) $request->query('type', 'all');
        $statusFilter = (string) $request->query('status', 'all');
        $date = $request->query('date');
        $search = trim((string) $request->query('search', ''));

        $items = collect();

        if ($type === 'all' || $type === 'archive_loan') {
            try {
                $items = $items->concat($this->archiveLoanHistory($user->nip, $statusFilter, $date, $search));
            } catch (\Throwable $e) {
                \Log::error("Error fetching archive loan history: " . $e->getMessage());
            }
        }

        if ($type === 'all' || $type === 'bmn_loan') {
            try {
                $items = $items->concat($this->bmnLoanHistory($user->id, $user->nip, $statusFilter, $date, $search));
            } catch (\Throwable $e) {
                \Log::error("Error fetching bmn loan history: " . $e->getMessage());
            }
        }

        if ($type === 'all' || $type === 'exit_permit') {
            try {
                $items = $items->concat($this->exitPermitHistory($employee?->id, $user->nip, $statusFilter, $date, $search));
            } catch (\Throwable $e) {
                \Log::error("Error fetching exit permit history: " . $e->getMessage());
            }
        }

        if ($type === 'all' || $type === 'it_helpdesk') {
            try {
                $items = $items->concat($this->itHelpdeskHistory($user->id, $user->nip, $statusFilter, $date, $search));
            } catch (\Throwable $e) {
                \Log::error("Error fetching it helpdesk history: " . $e->getMessage());
            }
        }

        if ($type === 'all' || $type === 'surat_tugas') {
            try {
                $items = $items->concat($this->suratTugasHistory($employee?->id, $user->id, $user->nip, $statusFilter, $date, $search));
            } catch (\Throwable $e) {
                \Log::error("Error fetching surat tugas history: " . $e->getMessage());
            }
        }

        if ($type === 'all' || $type === 'bmn_maintenance') {
            try {
                $items = $items->concat($this->bmnMaintenanceHistory($employee?->id, $user->id, $user->nip, $statusFilter, $date, $search));
            } catch (\Throwable $e) {
                \Log::error("Error fetching bmn maintenance history: " . $e->getMessage());
            }
        }

        $data = $items
            ->sortByDesc('created_at')
            ->values();

        return response()->json([
            'data' => $data,
        ]);
    }

    private function archiveLoanHistory(?string $nip, string $statusFilter, $date, string $search): Collection
    {
        if (!$nip) {
            return collect();
        }

        $query = ArchiveLoan::query()
            ->where('borrower_nip', $nip)
            ->orderByDesc('created_at');

        if ($date) {
            $query->whereDate('created_at', $date);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('request_number', 'like', "%{$search}%")
                    ->orWhere('archive_number', 'like', "%{$search}%")
                    ->orWhere('borrower_name', 'like', "%{$search}%");
            });
        }

        $allowed = $this->rawStatusesForFilter($statusFilter, 'archive_loan');
        if (!empty($allowed)) {
            $query->whereIn('status', $allowed);
        }

        return $query->get()->map(function (ArchiveLoan $loan) {
            return [
                'id' => $loan->id,
                'service_type' => 'archive_loan',
                'ticket_number' => $loan->request_number,
                'created_at' => $loan->created_at,
                'description' => $loan->archive_number ? "No Arsip: {$loan->archive_number}" : '-',
                'status' => $this->normalizeStatus($loan->status, 'archive_loan'),
                'token' => $loan->public_token,
            ];
        });
    }

    private function bmnLoanHistory(int $userId, ?string $nip, string $statusFilter, $date, string $search): Collection
    {
        $query = BmnLoan::query()
            ->where(function ($q) use ($userId, $nip) {
                $q->where('created_by', $userId);

                if ($nip) {
                    $q->orWhere('borrower_nip', $nip);
                }
            })
            ->orderByDesc('created_at');

        if ($date) {
            $query->whereDate('created_at', $date);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('spa_number', 'like', "%{$search}%")
                    ->orWhere('borrower_name', 'like', "%{$search}%")
                    ->orWhere('notes', 'like', "%{$search}%");
            });
        }

        $allowed = $this->rawStatusesForFilter($statusFilter, 'bmn_loan');
        if (!empty($allowed)) {
            $query->whereIn('status', $allowed);
        }

        return $query->get()->map(function (BmnLoan $loan) {
            return [
                'id' => $loan->id,
                'service_type' => 'bmn_loan',
                'ticket_number' => $loan->spa_number,
                'created_at' => $loan->created_at,
                'description' => $loan->notes ?: '-',
                'status' => $this->normalizeStatus($loan->status, 'bmn_loan'),
                'token' => $loan->token,
            ];
        });
    }

    private function exitPermitHistory(?int $employeeId, ?string $nip, string $statusFilter, $date, string $search): Collection
    {
        if (!$employeeId && !$nip) {
            return collect();
        }

        $query = ExitPermit::query()
            ->where(function ($q) use ($employeeId, $nip) {
                if ($employeeId) {
                    $q->where('employee_id', $employeeId);
                }

                if ($nip) {
                    $q->orWhere('nip', $nip);
                }
            })
            ->orderByDesc('created_at');

        if ($date) {
            $query->whereDate('date', $date);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('reason', 'like', "%{$search}%")
                    ->orWhere('nip', 'like', "%{$search}%")
                    ->orWhere('employee_name', 'like', "%{$search}%");
            });
        }

        $allowed = $this->rawStatusesForFilter($statusFilter, 'exit_permit');
        if (!empty($allowed)) {
            $query->whereIn('status', $allowed);
        }

        return $query->get()->map(function (ExitPermit $permit) {
            return [
                'id' => $permit->id,
                'service_type' => 'exit_permit',
                'ticket_number' => 'IK-' . str_pad((string) $permit->id, 6, '0', STR_PAD_LEFT),
                'created_at' => $permit->created_at,
                'description' => $permit->reason ?: '-',
                'status' => $this->normalizeStatus($permit->status, 'exit_permit'),
            ];
        });
    }

    private function itHelpdeskHistory(int $userId, ?string $nip, string $statusFilter, $date, string $search): Collection
    {
        $query = ItHelpdeskTicket::query()
            ->where(function ($q) use ($userId, $nip) {
                $q->where('created_by', $userId);

                if ($nip) {
                    $q->orWhere('employee_nip', $nip);
                }
            })
            ->orderByDesc('created_at');

        if ($date) {
            $query->whereDate('created_at', $date);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('ticket_number', 'like', "%{$search}%")
                    ->orWhere('problem_details', 'like', "%{$search}%")
                    ->orWhere('report_type', 'like', "%{$search}%");
            });
        }

        $allowed = $this->rawStatusesForFilter($statusFilter, 'it_helpdesk');
        if (!empty($allowed)) {
            $query->whereIn('status', $allowed);
        }

        return $query->get()->map(function (ItHelpdeskTicket $ticket) {
            return [
                'id' => $ticket->id,
                'service_type' => 'it_helpdesk',
                'ticket_number' => $ticket->ticket_number,
                'created_at' => $ticket->created_at,
                'description' => $ticket->problem_details ?: '-',
                'status' => $this->normalizeStatus($ticket->status, 'it_helpdesk'),
            ];
        });
    }

    private function suratTugasHistory(?int $employeeId, int $userId, ?string $nip, string $statusFilter, $date, string $search): Collection
    {
        $query = SuratTugas::query()
            ->where(function ($q) use ($employeeId, $userId, $nip) {
                $q->where('created_by', $userId);

                if ($employeeId) {
                    $q->orWhereHas('employees', fn ($eq) => $eq->where('employees.id', $employeeId));
                }

                if ($nip) {
                    $q->orWhereHas('employees', fn ($eq) => $eq->where('employees.nip', $nip));
                }
            })
            ->orderByDesc('created_at');

        if ($date) {
            $query->whereDate('created_at', $date);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('nomor_st', 'like', "%{$search}%")
                    ->orWhere('mak', 'like', "%{$search}%")
                    ->orWhere('deskripsi_tugas', 'like', "%{$search}%")
                    ->orWhere('lokasi_tugas', 'like', "%{$search}%");
            });
        }

        $allowed = $this->rawStatusesForFilter($statusFilter, 'surat_tugas');
        if (!empty($allowed)) {
            $query->whereIn('status', $allowed);
        }

        return $query->get()->map(function (SuratTugas $suratTugas) {
            return [
                'id' => $suratTugas->id,
                'service_type' => 'surat_tugas',
                'ticket_number' => $suratTugas->nomor_st ?: 'ST-' . str_pad((string) $suratTugas->id, 6, '0', STR_PAD_LEFT),
                'created_at' => $suratTugas->created_at,
                'description' => $suratTugas->deskripsi_tugas ?: ($suratTugas->lokasi_tugas ?: '-'),
                'status' => $this->normalizeStatus($suratTugas->status ?: 'draft', 'surat_tugas'),
                'token' => $suratTugas->signature_token,
            ];
        });
    }

    private function bmnMaintenanceHistory(?int $employeeId, int $userId, ?string $nip, string $statusFilter, $date, string $search): Collection
    {
        $query = BmnMaintenanceReport::query()
            ->where(function ($q) use ($employeeId, $userId, $nip) {
                $q->where('created_by', $userId);

                if ($employeeId) {
                    $q->orWhere('reporter_id', $employeeId);
                }

                if ($nip) {
                    $q->orWhere('reporter_nip', $nip);
                }
            })
            ->orderByDesc('created_at');

        if ($date) {
            $query->whereDate('created_at', $date);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('report_number', 'like', "%{$search}%")
                    ->orWhere('report_details', 'like', "%{$search}%")
                    ->orWhere('asset_name', 'like', "%{$search}%");
            });
        }

        $allowed = $this->rawStatusesForFilter($statusFilter, 'bmn_maintenance');
        if (!empty($allowed)) {
            $query->whereIn('status', $allowed);
        }

        return $query->get()->map(function (BmnMaintenanceReport $report) {
            return [
                'id' => $report->id,
                'service_type' => 'bmn_maintenance',
                'ticket_number' => $report->report_number ?: 'BMR-' . str_pad((string) $report->id, 6, '0', STR_PAD_LEFT),
                'created_at' => $report->created_at,
                'description' => $report->report_details ?: '-',
                'status' => $this->normalizeStatus($report->status ?: 'new', 'bmn_maintenance'),
            ];
        });
    }

    /**
     * @return array<int, string>
     */
    private function rawStatusesForFilter(string $statusFilter, string $serviceType): array
    {
        if ($statusFilter === '' || $statusFilter === 'all') {
            return [];
        }

        $map = [
            'archive_loan' => [
                'pending' => ['menunggu_paraf'],
                'approved' => ['dipinjam'],
                'in_progress' => ['menunggu_paraf_kembali'],
                'completed' => ['dikembalikan'],
            ],
            'bmn_loan' => [
                'pending' => ['pengajuan'],
                'approved' => ['dipinjam'],
                'in_progress' => ['pengajuan-pengembalian'],
                'completed' => ['dikembalikan'],
            ],
            'exit_permit' => [
                'out' => ['out'],
                'returned' => ['returned'],
            ],
            'it_helpdesk' => [
                'open' => ['new', 'open'],
                'in_progress' => ['in_progress'],
                'waiting_user_approval' => ['waiting_user_approval'],
                'completed' => ['completed'],
                'closed' => ['completed'],
            ],
            'surat_tugas' => [
                'draft' => ['draft'],
                'completed' => ['lengkap'],
            ],
            'bmn_maintenance' => [
                'open' => ['new'],
                'in_progress' => ['in_progress'],
                'completed' => ['completed'],
                'rejected' => ['rejected'],
            ],
        ];

        return $map[$serviceType][$statusFilter] ?? [];
    }

    private function normalizeStatus(string $status, string $serviceType): string
    {
        $map = [
            'archive_loan' => [
                'menunggu_paraf' => 'pending',
                'dipinjam' => 'approved',
                'menunggu_paraf_kembali' => 'in_progress',
                'dikembalikan' => 'completed',
            ],
            'bmn_loan' => [
                'pengajuan' => 'pending',
                'dipinjam' => 'approved',
                'pengajuan-pengembalian' => 'in_progress',
                'dikembalikan' => 'completed',
            ],
            'exit_permit' => [
                'out' => 'out',
                'returned' => 'returned',
            ],
            'it_helpdesk' => [
                'new' => 'open',
                'open' => 'open',
                'in_progress' => 'in_progress',
                'waiting_user_approval' => 'waiting_user_approval',
                'completed' => 'completed',
            ],
            'surat_tugas' => [
                'draft' => 'draft',
                'lengkap' => 'completed',
            ],
            'bmn_maintenance' => [
                'new' => 'open',
                'in_progress' => 'in_progress',
                'completed' => 'completed',
                'rejected' => 'rejected',
            ],
        ];

        return $map[$serviceType][$status] ?? $status;
    }

    /**
     * Get detailed information for a specific service history item.
     */
    public function show(Request $request, string $serviceType, string $historyId)
    {
        $user = $request->user();

        return match ($serviceType) {
            'archive_loan' => $this->showArchiveLoan($historyId, $user),
            'bmn_loan' => $this->showBmnLoan($historyId, $user),
            'exit_permit' => $this->showExitPermit($historyId, $user),
            'it_helpdesk' => $this->showItHelpdesk($historyId, $user),
            'inventory_request' => $this->showInventoryRequest($historyId, $user),
            'surat_tugas' => $this->showSuratTugas($historyId, $user),
            'bmn_maintenance' => $this->showBmnMaintenance($historyId, $user),
            default => response()->json(['message' => 'Jenis layanan tidak valid.'], 400),
        };
    }

    /**
     * Get detailed archive loan information.
     */
    private function showArchiveLoan(string $id, $user)
    {
        $loan = ArchiveLoan::with('unitPengolah')
            ->where('borrower_nip', $user->nip)
            ->where(function ($q) use ($id) {
                $q->where('id', $id)
                    ->orWhere('public_token', $id);
            })
            ->first();

        if (!$loan) {
            return response()->json(['message' => 'Data peminjaman arsip tidak ditemukan.'], 404);
        }

        $signatures = [];
        if ($loan->borrower_signature) {
            $signatures[] = [
                'type' => 'borrowing',
                'role' => 'borrower',
                'created_at' => $loan->created_at?->toDateTimeString(),
            ];
        }
        if ($loan->approved_at) {
            $signatures[] = [
                'type' => 'borrowing',
                'role' => 'admin',
                'created_at' => $loan->approved_at?->toDateTimeString(),
            ];
        }
        if ($loan->return_signature) {
            $signatures[] = [
                'type' => 'returning',
                'role' => 'borrower',
                'created_at' => $loan->return_requested_at?->toDateTimeString(),
            ];
        }
        if ($loan->return_date) {
            $signatures[] = [
                'type' => 'returning',
                'role' => 'admin',
                'created_at' => $loan->return_date?->toDateTimeString(),
            ];
        }

        return response()->json([
            'id' => $loan->id,
            'service_type' => 'archive_loan',
            'request_number' => $loan->request_number,
            'borrow_date' => $loan->borrow_date?->format('Y-m-d'),
            'borrower_name' => $loan->borrower_name,
            'borrower_work_unit' => $loan->borrower_work_unit,
            'borrower_nip' => $loan->borrower_nip,
            'archive_number' => $loan->archive_number,
            'status' => $this->normalizeStatus($loan->status, 'archive_loan'),
            'status_raw' => $loan->status,
            'public_token' => $loan->public_token,
            'return_token' => $loan->return_token,
            'return_date' => $loan->return_date?->format('Y-m-d'),
            'approved_at' => $loan->approved_at?->toDateTimeString(),
            'return_requested_at' => $loan->return_requested_at?->toDateTimeString(),
            'created_at' => $loan->created_at?->toDateTimeString(),
            'unit_pengolah' => $loan->unitPengolah ? [
                'id' => $loan->unitPengolah->id,
                'fungsi_bidang' => $loan->unitPengolah->fungsi_bidang,
            ] : null,
            'signatures' => $signatures,
        ]);
    }

    /**
     * Get detailed BMN loan information.
     */
    private function showBmnLoan(string $id, $user)
    {
        $loan = BmnLoan::where(function ($q) use ($id) {
            $q->where('id', $id)
                ->orWhere('token', $id);
        })
            ->where(function ($q) use ($user) {
                $q->where('created_by', $user->id)
                    ->orWhere('borrower_nip', $user->nip);
            })
            ->first();

        if (!$loan) {
            return response()->json(['message' => 'Data peminjaman BMN tidak ditemukan.'], 404);
        }

        // Process assets to include additional info
        $assets = collect($loan->assets ?? [])->map(function ($asset) {
            return [
                'asset_id' => $asset['asset_id'] ?? null,
                'nama_barang' => $asset['nama_barang'] ?? $asset['name'] ?? null,
                'merek_barang' => $asset['merek_barang'] ?? $asset['brand'] ?? null,
                'nup' => $asset['nup'] ?? $asset['model'] ?? null,
                'kode_bmn' => $asset['kode_bmn'] ?? $asset['asset_code'] ?? null,
            ];
        });

        return response()->json([
            'id' => $loan->id,
            'service_type' => 'bmn_loan',
            'spa_number' => $loan->spa_number,
            'token' => $loan->token,
            'borrower_name' => $loan->borrower_name,
            'borrower_nip' => $loan->borrower_nip,
            'borrower_function' => $loan->borrower_function,
            'borrower_phone' => $loan->borrower_phone,
            'loan_date' => $loan->loan_date?->format('Y-m-d'),
            'return_date' => $loan->return_date?->format('Y-m-d'),
            'location' => $loan->location,
            'notes' => $loan->notes,
            'status' => $this->normalizeStatus($loan->status, 'bmn_loan'),
            'status_raw' => $loan->status,
            'assets' => $assets,
            'requester_signature' => $loan->requester_signature,
            'created_at' => $loan->created_at?->toDateTimeString(),
        ]);
    }

    /**
     * Get detailed exit permit information.
     */
    private function showExitPermit(string $id, $user)
    {
        $employee = Employee::query()->where('nip', $user->nip)->first();

        $permit = ExitPermit::with('employee')
            ->where('id', $id)
            ->where(function ($q) use ($employee, $user) {
                // Allow access if user owns the permit
                if ($employee) {
                    $q->where('employee_id', $employee->id);
                }
                if ($user->nip) {
                    $q->orWhere('nip', $user->nip);
                }
            })
            ->first();

        if (!$permit) {
            return response()->json(['message' => 'Data izin keluar tidak ditemukan.'], 404);
        }

        return response()->json([
            'id' => $permit->id,
            'service_type' => 'exit_permit',
            'ticket_number' => 'IK-' . str_pad((string) $permit->id, 6, '0', STR_PAD_LEFT),
            'employee_name' => $permit->employee_name,
            'nip' => $permit->nip,
            'date' => $permit->date?->format('Y-m-d'),
            'exit_time' => $permit->exit_time,
            'return_time' => $permit->return_time,
            'reason' => $permit->reason,
            'status' => $this->normalizeStatus($permit->status, 'exit_permit'),
            'status_raw' => $permit->status,
            'nomor_surat' => $permit->nomor_surat,
            'duration_seconds' => $permit->duration_seconds,
            'duration_minutes' => $permit->duration_minutes,
            'created_at' => $permit->created_at?->toDateTimeString(),
            'employee' => $permit->employee ? [
                'id' => $permit->employee->id,
                'name' => $permit->employee->name,
                'nip' => $permit->employee->nip,
                'position' => $permit->employee->position,
                'function_area' => $permit->employee->function_area,
            ] : null,
        ]);
    }

    /**
     * Get detailed IT helpdesk ticket information.
     */
    private function showItHelpdesk(string $id, $user)
    {
        $ticket = ItHelpdeskTicket::with(['employee', 'itStaff'])
            ->where(function ($q) use ($id, $user) {
                $q->where('id', $id)
                    ->orWhere('ticket_number', $id);

                // Allow access if user owns the ticket
                $q->where(function ($subQ) use ($user) {
                    $subQ->where('created_by', $user->id)
                        ->orWhere('employee_nip', $user->nip);
                });
            })
            ->first();

        if (!$ticket) {
            return response()->json(['message' => 'Data tiket IT Helpdesk tidak ditemukan.'], 404);
        }

        return response()->json([
            'id' => $ticket->id,
            'service_type' => 'it_helpdesk',
            'ticket_number' => $ticket->ticket_number,
            'employee_name' => $ticket->employee_name,
            'employee_nip' => $ticket->employee_nip,
            'function_area' => $ticket->function_area,
            'report_type' => $ticket->report_type,
            'problem_details' => $ticket->problem_details,
            'status' => $this->normalizeStatus($ticket->status, 'it_helpdesk'),
            'status_raw' => $ticket->status,
            'report_date' => $ticket->report_date?->format('Y-m-d'),
            'followup_details' => $ticket->followup_details,
            'completion_date' => $ticket->completion_date?->format('Y-m-d'),
            'reporter_signature' => $ticket->reporter_signature,
            'it_staff_signature' => $ticket->it_staff_signature,
            'created_at' => $ticket->created_at?->toDateTimeString(),
            'employee' => $ticket->employee ? [
                'id' => $ticket->employee->id,
                'name' => $ticket->employee->name,
                'nip' => $ticket->employee->nip,
                'position' => $ticket->employee->position,
                'function_area' => $ticket->employee->function_area,
                'phone_number' => $ticket->employee->phone_number,
            ] : null,
            'it_staff' => $ticket->itStaff ? [
                'id' => $ticket->itStaff->id,
                'name' => $ticket->itStaff->name,
            ] : null,
        ]);
    }

    /**
     * Get detailed inventory request information.
     */
    private function showInventoryRequest(string $id, $user)
    {
        $request = InventoryRequest::with('items')
            ->where(function ($q) use ($id, $user) {
                $q->where('id', $id)
                    ->orWhere('token', $id);
            })
            ->where(function ($q) use ($user) {
                $q->where('requester_nip', $user->nip)
                    ->orWhere('requester_id', $user->id);
            })
            ->first();

        if (!$request) {
            return response()->json(['message' => 'Data permintaan persediaan tidak ditemukan.'], 404);
        }

        $items = collect($request->items ?? [])->map(function ($item) {
            return [
                'id' => $item->id,
                'item_name' => $item->item_name,
                'unit' => $item->unit,
                'qty_requested' => $item->qty_requested,
                'qty_approved' => $item->qty_approved,
            ];
        });

        return response()->json([
            'id' => $request->id,
            'service_type' => 'inventory_request',
            'ticket_number' => $request->spb_number,
            'spb_number' => $request->spb_number,
            'sbbk_number' => $request->sbbk_number,
            'token' => $request->token,
            'requester_name' => $request->requester_name,
            'requester_nip' => $request->requester_nip,
            'requester_function' => $request->requester_function,
            'purpose' => $request->purpose,
            'status' => $request->status,
            'status_raw' => $request->status,
            'approval_notes' => $request->approval_notes,
            'created_at' => $request->created_at?->toDateTimeString(),
            'approved_at' => $request->approved_at?->toDateTimeString(),
            'items' => $items,
        ]);
    }

    /**
     * Get detailed surat tugas information for current user.
     */
    private function showSuratTugas(string $id, $user)
    {
        $employee = Employee::query()->where('nip', $user->nip)->first();

        $st = SuratTugas::with(['employees', 'ketuaTim'])
            ->where('id', $id)
            ->where(function ($q) use ($user, $employee) {
                $q->where('created_by', $user->id);

                if ($employee) {
                    $q->orWhereHas('employees', fn ($eq) => $eq->where('employees.id', $employee->id));
                }

                if ($user->nip) {
                    $q->orWhereHas('employees', fn ($eq) => $eq->where('employees.nip', $user->nip));
                }
            })
            ->first();

        if (!$st) {
            return response()->json(['message' => 'Data surat tugas tidak ditemukan.'], 404);
        }

        $sarana = [];
        if ($st->sarana_nama) {
            $namas = explode(';', (string) $st->sarana_nama);
            $lokasis = explode(';', (string) ($st->sarana_lokasi ?? ''));
            foreach ($namas as $index => $nama) {
                $sarana[] = [
                    'id' => null,
                    'nama' => trim($nama),
                    'lokasi' => isset($lokasis[$index]) ? trim($lokasis[$index]) : '',
                ];
            }
        }

        return response()->json([
            'id' => $st->id,
            'service_type' => 'surat_tugas',
            'status' => $this->normalizeStatus($st->status ?: 'draft', 'surat_tugas'),
            'status_raw' => $st->status,
            'tanggal_mulai' => $st->tanggal_mulai?->format('Y-m-d'),
            'tanggal_selesai' => $st->tanggal_selesai?->format('Y-m-d'),
            'mak' => $st->mak,
            'lokasi_tugas' => $st->lokasi_tugas,
            'deskripsi_tugas' => $st->deskripsi_tugas,
            'ketua_tim_id' => $st->ketua_tim_id,
            'employees' => $st->employees->map(function ($employee) {
                return [
                    'id' => $employee->id,
                    'name' => $employee->name,
                    'nip' => $employee->nip,
                    'position' => $employee->position,
                ];
            })->values(),
            'sarana' => $sarana,
            'signature_token' => $st->signature_token,
        ]);
    }

    /**
     * Get detailed BMN maintenance report information.
     */
    private function showBmnMaintenance(string $id, $user)
    {
        $report = BmnMaintenanceReport::with(['asset', 'handler'])
            ->where(function ($q) use ($id, $user) {
                $q->where('id', $id)
                    ->orWhere('report_number', $id);
            })
            ->where(function ($q) use ($user) {
                // Allow access if user owns the report
                $q->where('created_by', $user->id);
                if ($user->nip) {
                    $q->orWhere('reporter_nip', $user->nip);
                }
            })
            ->first();

        if (!$report) {
            return response()->json(['message' => 'Data laporan pemeliharaan / keluhan tidak ditemukan.'], 404);
        }

        return response()->json([
            'id' => $report->id,
            'service_type' => 'bmn_maintenance',
            'ticket_number' => $report->report_number ?: 'BMR-' . str_pad((string) $report->id, 6, '0', STR_PAD_LEFT),
            'report_type' => $report->report_type,
            'report_details' => $report->report_details,
            'asset_name' => $report->asset_name,
            'reporter_name' => $report->reporter_name,
            'reporter_nip' => $report->reporter_nip,
            'status' => $this->normalizeStatus($report->status ?: 'new', 'bmn_maintenance'),
            'status_raw' => $report->status,
            'admin_notes' => $report->admin_notes,
            'handled_at' => $report->handled_at?->toDateTimeString(),
            'created_at' => $report->created_at?->toDateTimeString(),
            'asset' => $report->asset ? [
                'id' => $report->asset->id,
                'name' => $report->asset->name,
                'asset_code' => $report->asset->asset_code,
            ] : null,
            'handler' => $report->handler ? [
                'id' => $report->handler->id,
                'name' => $report->handler->name,
            ] : null,
        ]);
    }
}
