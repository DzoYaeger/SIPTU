<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\SuratTugas;
use App\Models\ExitPermit;
use App\Models\Asset;
use App\Models\BmnLoan;
use App\Models\ArchiveLoan;
use App\Models\ItHelpdeskTicket;
use App\Models\InventoryRequest;

class DashboardController extends Controller
{
    /**
     * Get dashboard statistics.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function stats()
    {
        // Surat Tugas counts
        // Status: 'draft' (pending), 'lengkap' (approved)
        $suratTugasPending = SuratTugas::where('status', 'draft')->count();
        $suratTugasApproved = SuratTugas::where('status', 'lengkap')->count();

        // Exit Permit counts
        // Status: 'out' (pending), 'returned' (approved/completed)
        $exitPermitPending = ExitPermit::where('status', 'out')->count();
        $exitPermitApproved = ExitPermit::where('status', 'returned')->count();

        // BMN Loan counts
        // Status: 'pengajuan' (pending), 'dipinjam' and 'dikembalikan' (approved)
        $bmnLoanPending = BmnLoan::where('status', 'pengajuan')->count();
        $bmnLoanApproved = BmnLoan::whereIn('status', ['dipinjam', 'dikembalikan'])->count();

        // Archive Loan counts
        // Status: 'menunggu_paraf' (pending), 'dipinjam' and 'dikembalikan' (approved)
        $archiveLoanPending = ArchiveLoan::where('status', 'menunggu_paraf')->count();
        $archiveLoanApproved = ArchiveLoan::whereIn('status', ['dipinjam', 'dikembalikan'])->count();

        // IT Helpdesk Ticket counts
        // Status: 'open', 'in_progress' (pending), 'completed' (approved)
        $itTicketPending = ItHelpdeskTicket::whereIn('status', ['open', 'in_progress'])->count();
        $itTicketApproved = ItHelpdeskTicket::where('status', 'completed')->count();

        // Inventory Request counts
        // Status: 'pengajuan' (pending), 'disetujui' (approved)
        $inventoryRequestPending = InventoryRequest::where('status', 'pengajuan')->count();
        $inventoryRequestApproved = InventoryRequest::where('status', 'disetujui')->count();

        // Calculate totals
        $totalRequests =
            SuratTugas::count() +
            ExitPermit::count() +
            BmnLoan::count() +
            ArchiveLoan::count() +
            ItHelpdeskTicket::count() +
            InventoryRequest::count();

        $pendingRequests =
            $suratTugasPending +
            $exitPermitPending +
            $bmnLoanPending +
            $archiveLoanPending +
            $itTicketPending +
            $inventoryRequestPending;

        $approvedRequests =
            $suratTugasApproved +
            $exitPermitApproved +
            $bmnLoanApproved +
            $archiveLoanApproved +
            $itTicketApproved +
            $inventoryRequestApproved;

        // Total Assets
        $totalAssets = Asset::count();

        return response()->json([
            'totalRequests' => $totalRequests,
            'pendingRequests' => $pendingRequests,
            'approvedRequests' => $approvedRequests,
            'totalAssets' => $totalAssets,
        ]);
    }

    /**
     * Get pending badge counts for sidebar navigation.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function badgeCounts()
    {
        $counts = [
            'kearsipan-peminjaman' => ArchiveLoan::whereIn('status', ['menunggu_paraf', 'pengajuan', 'pending', 'SUBMITTED'])->count(),
            'bmn-peminjaman-aset' => BmnLoan::whereIn('status', ['pengajuan', 'pending', 'menunggu', 'DIMAJUKAN'])->count(),
            'bmn-permintaan-persediaan' => InventoryRequest::whereIn('status', ['pengajuan', 'pending'])->count(),
            'bmn-pemeliharaan-keluhan' => \App\Models\BmnMaintenanceReport::whereIn('status', ['pending', 'lapor', 'pengajuan'])->count(),
            'kepegawaian-surat-tugas' => SuratTugas::whereIn('status', ['draft', 'pending', 'menunggu_paraf'])->count(),
            'rispeg-izin-keluar' => ExitPermit::whereIn('status', ['out', 'pending', 'pengajuan'])->count(),
            'it-helpdesk-pelaporan' => ItHelpdeskTicket::whereIn('status', ['new', 'open', 'pending'])->count(),
            'pengadaan-pbj' => \App\Models\ProcurementProposal::whereIn('status', ['submitted', 'pending', 'pengajuan'])->count(),
        ];

        return response()->json([
            'success' => true,
            'counts' => $counts,
        ]);
    }

    /**
     * Get recent activities across modules.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function recentActivities()
    {
        $limitEach = 15;
        $totalLimit = 48;

        $selarasFiles = [];
        try {
            $response = \Illuminate\Support\Facades\Http::timeout(3)->get('https://selaras.bpompalopo.com/api/public/recent-files');
            if ($response->successful()) {
                $selarasFiles = collect($response->json())->map(function($file) {
                    return [
                        'id' => 'selaras_' . $file['id'],
                        'type' => 'selaras',
                        'title' => \Illuminate\Support\Str::limit($file['name'], 80),
                        'description' => 'Dokumen baru diunggah ke SELARAS',
                        'date' => $file['created_at'],
                        'url' => "https://selaras.bpompalopo.com/file/view/{$file['id']}",
                    ];
                })->toArray();
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning("Failed to fetch SELARAS API: " . $e->getMessage());
        }

        $bmnLoans = \App\Models\BmnLoan::with('borrower')
            ->where('loan_type', '!=', 'ruangan')
            ->orderBy('created_at', 'desc')->take($limitEach)->get()
            ->map(function($loan) {
                return [
                    'id' => 'bmn_' . $loan->id,
                    'type' => 'bmn',
                    'title' => 'Peminjaman BMN',
                    'description' => "{$loan->borrower_name} meminjam aset BMN (#{$loan->spa_number})",
                    'date' => $loan->created_at,
                    'url' => $loan->token ? "/peminjaman-aset/track/{$loan->token}" : null,
                ];
            })->toArray();

        $roomBookings = \App\Models\BmnLoan::where('loan_type', 'ruangan')
            ->orderBy('created_at', 'desc')->take($limitEach)->get()
            ->map(function($loan) {
                return [
                    'id' => 'room_' . $loan->id,
                    'type' => 'ruangan',
                    'title' => 'Peminjaman Ruangan',
                    'description' => "{$loan->borrower_name} meminjam ruangan untuk: {$loan->activity_name}",
                    'date' => $loan->created_at,
                    'url' => "/peminjaman-ruangan",
                ];
            })->toArray();

        $exitPermits = \App\Models\ExitPermit::orderBy('created_at', 'desc')->take($limitEach)->get()
            ->map(function($permit) {
                return [
                    'id' => 'exit_' . $permit->id,
                    'type' => 'izin_keluar',
                    'title' => 'Izin Keluar Kantor',
                    'description' => "{$permit->employee_name} Telah mengajukan izin keluar",
                    'date' => $permit->created_at,
                    'url' => "/izin-keluar",
                ];
            })->toArray();

        $itTickets = \App\Models\ItHelpdeskTicket::orderBy('created_at', 'desc')->take($limitEach)->get()
            ->map(function($ticket) {
                return [
                    'id' => 'it_' . $ticket->id,
                    'type' => 'it_helpdesk',
                    'title' => 'Laporan IT Helpdesk',
                    'description' => "{$ticket->employee_name} melakukan pelaporan IThelpdesk",
                    'date' => $ticket->created_at,
                    'is_auto_resolved' => (bool)$ticket->is_auto_resolved,
                    'url' => "/it-helpdesk/new",
                ];
            })->toArray();

        $allActivities = collect(array_merge($selarasFiles, $bmnLoans, $roomBookings, $exitPermits, $itTickets))
            ->sortByDesc('date')
            ->values()
            ->take($totalLimit);

        return response()->json($allActivities);
    }

    /**
     * Get active requests submitted by the logged in user.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function myActiveRequests(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json([]);
            }

            $nip = $user->nip ?? ($user->employee->nip ?? null);
            $name = $user->name ?? null;

            $activeBmn = collect([]);
            try {
                $activeBmn = \App\Models\BmnLoan::where('loan_type', '!=', 'ruangan')
                    ->where(function($q) use ($nip, $name) {
                        if ($nip) $q->where('borrower_nip', $nip);
                        if ($name) $q->orWhere('borrower_name', 'like', "%{$name}%");
                    })
                    ->whereIn('status', ['pengajuan', 'disetujui', 'dipinjam', 'proses', 'pending'])
                    ->orderBy('created_at', 'desc')->take(5)->get()
                    ->map(function($loan) {
                        return [
                            'id' => 'bmn_' . $loan->id,
                            'type' => 'bmn',
                            'title' => 'Peminjaman BMN',
                            'item_name' => $loan->spa_number ? "Aset BMN (#{$loan->spa_number})" : "Peminjaman Aset",
                            'status' => $loan->status,
                            'status_label' => ucfirst($loan->status),
                            'step' => $loan->status === 'pengajuan' ? 2 : ($loan->status === 'disetujui' ? 3 : 3),
                            'date' => $loan->created_at,
                            'url' => $loan->token ? "/peminjaman-aset/track/{$loan->token}" : "/app/simba",
                        ];
                    });
            } catch (\Throwable $e) {}

            $activeRooms = collect([]);
            try {
                $activeRooms = \App\Models\BmnLoan::where('loan_type', 'ruangan')
                    ->where(function($q) use ($nip, $name) {
                        if ($nip) $q->where('borrower_nip', $nip);
                        if ($name) $q->orWhere('borrower_name', 'like', "%{$name}%");
                    })
                    ->whereIn('status', ['pengajuan', 'disetujui', 'dipinjam', 'proses', 'pending'])
                    ->orderBy('created_at', 'desc')->take(5)->get()
                    ->map(function($loan) {
                        return [
                            'id' => 'room_' . $loan->id,
                            'type' => 'ruangan',
                            'title' => 'Peminjaman Ruangan',
                            'item_name' => $loan->activity_name ? "Ruang Rapat: " . \Illuminate\Support\Str::limit($loan->activity_name, 35) : "Peminjaman Ruangan",
                            'status' => $loan->status,
                            'status_label' => ucfirst($loan->status),
                            'step' => $loan->status === 'pengajuan' ? 2 : 3,
                            'date' => $loan->created_at,
                            'url' => "/peminjaman-ruangan",
                        ];
                    });
            } catch (\Throwable $e) {}

            $activeExits = collect([]);
            try {
                $activeExits = \App\Models\ExitPermit::where(function($q) use ($nip, $name) {
                        if ($nip) $q->where('nip', $nip);
                        if ($name) $q->orWhere('employee_name', 'like', "%{$name}%");
                    })
                    ->whereIn('status', ['pending', 'approved', 'out', 'diajukan', 'proses'])
                    ->orderBy('created_at', 'desc')->take(5)->get()
                    ->map(function($permit) {
                        return [
                            'id' => 'exit_' . $permit->id,
                            'type' => 'izin_keluar',
                            'title' => 'Izin Keluar Kantor',
                            'item_name' => $permit->reason ? "Alasan: " . \Illuminate\Support\Str::limit($permit->reason, 35) : "Izin Keluar Kantor",
                            'status' => $permit->status,
                            'status_label' => $permit->status === 'approved' ? 'Disetujui' : ($permit->status === 'out' ? 'Di Luar' : 'Diajukan'),
                            'step' => $permit->status === 'approved' ? 3 : ($permit->status === 'out' ? 3 : 2),
                            'date' => $permit->created_at,
                            'url' => "/izin-keluar",
                        ];
                    });
            } catch (\Throwable $e) {}

            $activeIt = collect([]);
            try {
                $itQuery = \App\Models\ItHelpdeskTicket::where(function($q) use ($nip, $name) {
                        if ($nip) $q->where('nip', $nip);
                        if ($name) $q->orWhere('employee_name', 'like', "%{$name}%");
                    })
                    ->whereIn('status', ['open', 'in_progress', 'pending', 'proses']);
                
                // Safe check if column exists
                if (\Illuminate\Support\Facades\Schema::hasColumn('it_helpdesk_tickets', 'is_auto_resolved')) {
                    $itQuery->where('is_auto_resolved', false);
                }

                $activeIt = $itQuery->orderBy('created_at', 'desc')->take(5)->get()
                    ->map(function($ticket) {
                        return [
                            'id' => 'it_' . $ticket->id,
                            'type' => 'it_helpdesk',
                            'title' => 'Laporan IT Helpdesk',
                            'item_name' => $ticket->problem_details ? "Kendala: " . \Illuminate\Support\Str::limit($ticket->problem_details, 35) : "Laporan IT",
                            'status' => $ticket->status,
                            'status_label' => $ticket->status === 'in_progress' ? 'Dalam Proses' : 'Diajukan',
                            'step' => $ticket->status === 'in_progress' ? 3 : 2,
                            'date' => $ticket->created_at,
                            'url' => "/it-helpdesk/new",
                        ];
                    });
            } catch (\Throwable $e) {}

            $allActive = collect(array_merge(
                $activeBmn->toArray(),
                $activeRooms->toArray(),
                $activeExits->toArray(),
                $activeIt->toArray()
            ))->sortByDesc('date')->values();

            return response()->json($allActive);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('myActiveRequests error: ' . $e->getMessage());
            return response()->json([]);
        }
    }
}
