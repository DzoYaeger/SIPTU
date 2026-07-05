<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ArchiveLoan;
use App\Models\Asset;
use App\Models\BmnLoan;
use App\Models\Employee;
use App\Models\ExitPermit;
use App\Models\Inventory;
use App\Models\ItHelpdeskTicket;
use App\Models\SuratTugas;
use App\Models\EmployeeDailyControl;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class AdminCommandCenterController extends Controller
{
    /**
     * AI-powered live data audit for the dashboard.
     */
    public function aiAudit(Request $request)
    {
        $user = $request->user();
        if (($user->base_role ?? null) !== 'admin') {
            return response()->json(['message' => 'Hanya admin yang dapat melakukan audit AI.'], 403);
        }

        try {
            $now = Carbon::now('Asia/Makassar');
            
            // Gather live status data for audit
            $archiveStatus = $this->countByStatus(ArchiveLoan::class);
            $bmnStatus = $this->countByStatus(BmnLoan::class);
            $helpdeskStatus = $this->countByStatus(ItHelpdeskTicket::class);
            $suratTugasStatus = $this->countByStatus(SuratTugas::class);

            $data = [
                'timestamp' => $now->toIso8601String(),
                'modules' => [
                    'archive' => [
                        'total' => array_sum($archiveStatus),
                        'pending' => ($archiveStatus['menunggu_paraf'] ?? 0) + ($archiveStatus['menunggu_paraf_kembali'] ?? 0),
                        'active' => $archiveStatus['dipinjam'] ?? 0,
                        'completed' => $archiveStatus['dikembalikan'] ?? 0,
                    ],
                    'bmn' => [
                        'total' => array_sum($bmnStatus),
                        'pending' => ($bmnStatus['pengajuan'] ?? 0) + ($bmnStatus['pengajuan-pengembalian'] ?? 0),
                        'active' => $bmnStatus['dipinjam'] ?? 0,
                        'completed' => $bmnStatus['dikembalikan'] ?? 0,
                    ],
                    'it_helpdesk' => [
                        'total' => array_sum($helpdeskStatus),
                        'pending' => $helpdeskStatus['open'] ?? 0,
                        'active' => $helpdeskStatus['in_progress'] ?? 0,
                        'completed' => $helpdeskStatus['completed'] ?? 0,
                    ],
                    'surat_tugas' => [
                        'total' => array_sum($suratTugasStatus),
                        'pending' => $suratTugasStatus['draft'] ?? 0,
                        'active' => ($suratTugasStatus['lengkap'] ?? 0),
                        'completed' => SuratTugas::whereNotNull('signed_at')->count(),
                    ],
                ],
                'users' => [
                    'total' => User::count(),
                    'employees' => Employee::count(),
                ],
                'rispeg' => [
                    'total_daily_controls' => EmployeeDailyControl::count(),
                    'violations_detected' => EmployeeDailyControl::where('total_points', '>', 0)->count(),
                ]
            ];

            $gemini = new \App\Services\GeminiService();
            $audit = $gemini->generateAuditAnalysis($data);

            return response()->json($audit);
        } catch (\Exception $e) {
            \Log::error('AI Audit Controller Error: ' . $e->getMessage());
            return response()->json(['error' => 'Gagal melakukan audit AI: ' . $e->getMessage()], 500);
        }
    }

    public function index(Request $request)
    {
        $user = $request->user();
        if (($user->base_role ?? null) !== 'admin') {
            return response()->json(['message' => 'Halaman command center hanya untuk admin.'], 403);
        }

        $now = Carbon::now('Asia/Makassar');
        $today = $now->toDateString();
        $monthStart = $now->copy()->startOfMonth()->toDateString();
        $sevenDaysAgo = $now->copy()->subDays(6)->toDateString();

        $overview = [
            'users_total' => User::count(),
            'employees_total' => Employee::count(),
            'assets_total' => Asset::count(),
            'inventories_total' => Inventory::count(),
            'services_total' => ArchiveLoan::count() + BmnLoan::count() + ItHelpdeskTicket::count() + ExitPermit::count() + SuratTugas::count(),
            'services_today' => ArchiveLoan::whereDate('created_at', $today)->count()
                + BmnLoan::whereDate('created_at', $today)->count()
                + ItHelpdeskTicket::whereDate('created_at', $today)->count()
                + ExitPermit::where('date', $today)->count()
                + SuratTugas::whereDate('created_at', $today)->count(),
        ];

        $roles = User::query()
            ->select('base_role', DB::raw('COUNT(*) as total'))
            ->groupBy('base_role')
            ->pluck('total', 'base_role');

        $archiveStatus = $this->countByStatus(ArchiveLoan::class);
        $bmnStatus = $this->countByStatus(BmnLoan::class);
        $helpdeskStatus = $this->countByStatus(ItHelpdeskTicket::class);
        $exitStatus = $this->countByStatus(ExitPermit::class);

        $archiveTotal = array_sum($archiveStatus);
        $bmnTotal = array_sum($bmnStatus);
        $helpdeskTotal = array_sum($helpdeskStatus);
        $exitMonthTotal = ExitPermit::whereBetween('date', [$monthStart, $today])->count();

        $services = [
            'archive' => [
                'total' => $archiveTotal,
                'pending' => ($archiveStatus['menunggu_paraf'] ?? 0) + ($archiveStatus['menunggu_paraf_kembali'] ?? 0),
                'active' => $archiveStatus['dipinjam'] ?? 0,
                'completed' => $archiveStatus['dikembalikan'] ?? 0,
            ],
            'bmn' => [
                'total' => $bmnTotal,
                'pending' => ($bmnStatus['pengajuan'] ?? 0) + ($bmnStatus['pengajuan-pengembalian'] ?? 0),
                'active' => $bmnStatus['dipinjam'] ?? 0,
                'completed' => $bmnStatus['dikembalikan'] ?? 0,
            ],
            'it_helpdesk' => [
                'total' => $helpdeskTotal,
                'pending' => $helpdeskStatus['open'] ?? 0,
                'active' => $helpdeskStatus['in_progress'] ?? 0,
                'completed' => $helpdeskStatus['completed'] ?? 0,
            ],
            'exit_permit' => [
                'total' => ExitPermit::count(),
                'pending' => ExitPermit::where('status', 'out')->where('date', '<', $today)->count(),
                'active' => ExitPermit::where('date', $today)->where('status', 'out')->count(),
                'completed' => ExitPermit::where('date', $today)->where('status', 'returned')->count(),
                'avg_duration_today' => round((float) ExitPermit::where('date', $today)->whereNotNull('duration_minutes')->avg('duration_minutes')),
            ],
            'surat_tugas' => [
                'total' => SuratTugas::count(),
                'pending' => SuratTugas::where('status', 'draft')->count(),
                'active' => SuratTugas::where('status', 'lengkap')->whereNull('signed_at')->count(),
                'completed' => SuratTugas::whereNotNull('signed_at')->count(),
            ],
            'rispeg' => [
                'total' => EmployeeDailyControl::sum('total_points'),
                'pending' => EmployeeDailyControl::where('total_points', '>', 0)->distinct('employee_id')->count('employee_id'),
                'active' => EmployeeDailyControl::count(),
                'completed' => EmployeeDailyControl::where('total_points', 0)->count(),
            ],
        ];

        $completion = [
            'archive' => $this->percent($services['archive']['completed'], max(1, $services['archive']['total'])),
            'bmn' => $this->percent($services['bmn']['completed'], max(1, $services['bmn']['total'])),
            'it_helpdesk' => $this->percent($services['it_helpdesk']['completed'], max(1, $services['it_helpdesk']['total'])),
            'exit_permit_today' => $this->percent($services['exit_permit']['completed'], max(1, $services['exit_permit']['active'] + $services['exit_permit']['completed'])),
            'surat_tugas' => $this->percent($services['surat_tugas']['completed'], max(1, $services['surat_tugas']['total'])),
            'rispeg' => $this->percent($services['rispeg']['completed'], max(1, $services['rispeg']['total'])),
        ];

        $trends = $this->buildTrends($sevenDaysAgo, $today);
        $recentActivities = $this->buildRecentActivities();
        $alerts = $this->buildAlerts($services);

        return response()->json([
            'generated_at' => $now->toIso8601String(),
            'overview' => $overview,
            'roles' => [
                'admin' => (int) ($roles['admin'] ?? 0),
                'operator' => (int) ($roles['operator'] ?? 0),
                'validator' => (int) ($roles['validator'] ?? 0),
            ],
            'services' => $services,
            'completion' => $completion,
            'trends' => $trends,
            'recent_activities' => $recentActivities,
            'alerts' => $alerts,
        ]);
    }

    private function countByStatus(string $modelClass): array
    {
        return $modelClass::query()
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status')
            ->map(fn ($v) => (int) $v)
            ->toArray();
    }

    private function buildTrends(string $fromDate, string $toDate): array
    {
        $labels = [];
        $cursor = Carbon::parse($fromDate);
        $end = Carbon::parse($toDate);
        while ($cursor->lte($end)) {
            $labels[] = $cursor->format('Y-m-d');
            $cursor->addDay();
        }

        $map = [
            'archive' => $this->dailyCounts(ArchiveLoan::class, 'created_at', $fromDate, $toDate),
            'bmn' => $this->dailyCounts(BmnLoan::class, 'created_at', $fromDate, $toDate),
            'it_helpdesk' => $this->dailyCounts(ItHelpdeskTicket::class, 'created_at', $fromDate, $toDate),
            'exit_permit' => $this->dailyCounts(ExitPermit::class, 'date', $fromDate, $toDate),
            'surat_tugas' => $this->dailyCounts(SuratTugas::class, 'created_at', $fromDate, $toDate),
            'rispeg' => $this->dailyCounts(EmployeeDailyControl::class, 'date', $fromDate, $toDate),
        ];

        $series = [];
        foreach ($map as $key => $dayMap) {
            $series[$key] = array_map(fn ($day) => (int) ($dayMap[$day] ?? 0), $labels);
        }

        return [
            'labels' => $labels,
            'series' => $series,
        ];
    }

    private function dailyCounts(string $modelClass, string $dateColumn, string $fromDate, string $toDate): array
    {
        return $modelClass::query()
            ->selectRaw("DATE({$dateColumn}) as day, COUNT(*) as total")
            ->whereBetween(DB::raw("DATE({$dateColumn})"), [$fromDate, $toDate])
            ->groupBy('day')
            ->orderBy('day')
            ->pluck('total', 'day')
            ->map(fn ($v) => (int) $v)
            ->toArray();
    }

    private function buildRecentActivities(): array
    {
        $archive = ArchiveLoan::query()
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (ArchiveLoan $row) => [
                'module' => 'archive',
                'ticket' => $row->request_number,
                'status' => $row->status,
                'description' => $row->archive_number ?: '-',
                'created_at' => optional($row->created_at)->toIso8601String(),
            ]);

        $bmn = BmnLoan::query()
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (BmnLoan $row) => [
                'module' => 'bmn',
                'ticket' => $row->spa_number,
                'status' => $row->status,
                'description' => $row->borrower_name ?: '-',
                'created_at' => optional($row->created_at)->toIso8601String(),
            ]);

        $helpdesk = ItHelpdeskTicket::query()
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (ItHelpdeskTicket $row) => [
                'module' => 'it_helpdesk',
                'ticket' => $row->ticket_number,
                'status' => $row->status,
                'description' => $row->report_type ?: '-',
                'created_at' => optional($row->created_at)->toIso8601String(),
            ]);

        $exit = ExitPermit::query()
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (ExitPermit $row) => [
                'module' => 'exit_permit',
                'ticket' => 'IK-' . str_pad((string) $row->id, 6, '0', STR_PAD_LEFT),
                'status' => $row->status,
                'description' => $row->employee_name ?: '-',
                'created_at' => optional($row->created_at)->toIso8601String(),
            ]);

        $suratTugas = SuratTugas::query()
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (SuratTugas $row) => [
                'module' => 'surat_tugas',
                'ticket' => $row->nomor_surat ?? ('ST-' . str_pad((string) $row->id, 5, '0', STR_PAD_LEFT)),
                'status' => $row->status,
                'description' => $row->nama_kegiatan ?? '-',
                'created_at' => optional($row->created_at)->toIso8601String(),
            ]);

        $rispeg = EmployeeDailyControl::query()
            ->with('employee')
            ->latest('date')
            ->limit(5)
            ->get()
            ->map(fn (EmployeeDailyControl $row) => [
                'module' => 'rispeg',
                'ticket' => 'RSP-' . optional($row->date)->format('Ymd') . '-' . $row->employee_id,
                'status' => $row->total_points > 0 ? 'violation' : 'clean',
                'description' => optional($row->employee)->name ?? '-',
                'created_at' => optional($row->created_at)->toIso8601String(),
            ]);

        return $archive
            ->concat($bmn)
            ->concat($helpdesk)
            ->concat($exit)
            ->concat($suratTugas)
            ->concat($rispeg)
            ->sortByDesc('created_at')
            ->values()
            ->take(12)
            ->all();
    }

    private function buildAlerts(array $services): array
    {
        $alerts = collect();

        if (($services['archive']['pending'] ?? 0) >= 10) {
            $alerts->push(['level' => 'warning', 'message' => 'Pengajuan arsip menunggu tindak lanjut cukup tinggi.']);
        }
        if (($services['bmn']['pending'] ?? 0) >= 10) {
            $alerts->push(['level' => 'warning', 'message' => 'Pengajuan BMN menumpuk, perlu percepatan validasi.']);
        }
        if (($services['it_helpdesk']['active'] ?? 0) >= 8) {
            $alerts->push(['level' => 'warning', 'message' => 'Tiket IT in-progress tinggi, cek beban tim teknis.']);
        }
        if (($services['exit_permit']['active'] ?? 0) >= 5) {
            $alerts->push(['level' => 'info', 'message' => 'Saat ini ada beberapa pegawai masih tercatat di luar kantor.']);
        }

        if ($alerts->isEmpty()) {
            $alerts->push(['level' => 'success', 'message' => 'Tidak ada anomali kritis terdeteksi. Operasional berjalan normal.']);
        }

        return $alerts->all();
    }

    private function percent(int|float $value, int|float $total): float
    {
        if ($total <= 0) return 0;
        return round(($value / $total) * 100, 1);
    }

    /**
     * Export comprehensive PDF report with AI-generated analysis based on dynamic periods.
     */
    public function exportReport(Request $request)
    {
        $user = $request->user();
        if (($user->base_role ?? null) !== 'admin') {
            return response()->json(['message' => 'Hanya admin yang dapat mencetak laporan.'], 403);
        }

        try {
            $type = $request->input('type', 'monthly'); // monthly, quarterly, yearly, custom
            $now = Carbon::now('Asia/Makassar');

            $monthStart = null;
            $monthEnd = null;
            $periodName = '';
            $safePeriodName = '';
            $reportTitle = 'Laporan Operasional';

            if ($type === 'quarterly') {
                $year = $request->input('year', date('Y'));
                $quarter = (int) $request->input('quarter', ceil(date('m') / 3));
                // Ensure quarter is between 1 and 4
                $quarter = max(1, min(4, $quarter));
                
                $startMonth = ($quarter - 1) * 3 + 1;
                $monthStart = Carbon::createFromDate($year, $startMonth, 1, 'Asia/Makassar')->startOfMonth();
                $monthEnd = $monthStart->copy()->addMonths(2)->endOfMonth();
                
                $periodName = "Triwulan " . (['I', 'II', 'III', 'IV'][$quarter - 1]) . " Tahun {$year}";
                $safePeriodName = "Triwulan_Q{$quarter}_{$year}";
                $reportTitle = 'Laporan Operasional Triwulan';
            } elseif ($type === 'yearly') {
                $year = $request->input('year', date('Y'));
                $monthStart = Carbon::createFromDate($year, 1, 1, 'Asia/Makassar')->startOfYear();
                $monthEnd = Carbon::createFromDate($year, 12, 31, 'Asia/Makassar')->endOfYear();
                $periodName = "Tahun {$year}";
                $safePeriodName = "Tahun_{$year}";
                $reportTitle = 'Laporan Operasional Tahunan';
            } elseif ($type === 'custom') {
                $request->validate([
                    'start_date' => 'required|date',
                    'end_date' => 'required|date|after_or_equal:start_date',
                ]);
                $monthStart = Carbon::parse($request->input('start_date'), 'Asia/Makassar')->startOfDay();
                $monthEnd = Carbon::parse($request->input('end_date'), 'Asia/Makassar')->endOfDay();
                $startFmt = $monthStart->translatedFormat('d M Y');
                $endFmt = $monthEnd->translatedFormat('d M Y');
                $periodName = "Periode {$startFmt} - {$endFmt}";
                $safePeriodName = "Periode_" . $monthStart->format('Ymd') . "_" . $monthEnd->format('Ymd');
                $reportTitle = 'Laporan Operasional';
            } else {
                // Default to monthly
                $month = $request->input('month', date('m'));
                $year = $request->input('year', date('Y'));
                $monthStart = Carbon::createFromDate($year, $month, 1, 'Asia/Makassar')->startOfMonth();
                $monthEnd = $monthStart->copy()->endOfMonth();
                $periodName = $monthStart->translatedFormat('F') . " {$year}";
                $safePeriodName = $monthStart->translatedFormat('F') . "_{$year}";
                $reportTitle = 'Laporan Operasional Bulanan';
            }

            // ── Gather overview data ─────────────────────────────────
            $overview = [
                'users_total' => User::count(),
                'employees_total' => Employee::count(),
                'assets_total' => Asset::count(),
                'inventories_total' => \App\Models\Inventory::count(),
                'services_month' => ArchiveLoan::whereBetween('created_at', [$monthStart, $monthEnd])->count()
                    + BmnLoan::whereBetween('created_at', [$monthStart, $monthEnd])->count()
                    + ItHelpdeskTicket::whereBetween('created_at', [$monthStart, $monthEnd])->count()
                    + ExitPermit::whereBetween('date', [$monthStart->toDateString(), $monthEnd->toDateString()])->count(),
            ];

            // ── Role distribution ────────────────────────────────────
            $roles = User::query()
                ->select('base_role', DB::raw('COUNT(*) as total'))
                ->groupBy('base_role')
                ->pluck('total', 'base_role')
                ->map(fn ($v) => (int) $v)
                ->toArray();

            // ── Service status per module (for the period) ────────────
            $archiveMonth = ArchiveLoan::whereBetween('created_at', [$monthStart, $monthEnd]);
            $bmnMonth = BmnLoan::whereBetween('created_at', [$monthStart, $monthEnd]);
            $helpdeskMonth = ItHelpdeskTicket::whereBetween('created_at', [$monthStart, $monthEnd]);
            $exitMonth = ExitPermit::whereBetween('date', [$monthStart->toDateString(), $monthEnd->toDateString()]);

            $modules = [
                [
                    'title' => 'Peminjaman Arsip',
                    'total' => (clone $archiveMonth)->count(),
                    'pending' => (clone $archiveMonth)->whereIn('status', ['menunggu_paraf', 'menunggu_paraf_kembali'])->count(),
                    'active' => (clone $archiveMonth)->where('status', 'dipinjam')->count(),
                    'completed' => (clone $archiveMonth)->where('status', 'dikembalikan')->count(),
                    'completion' => 0,
                ],
                [
                    'title' => 'Peminjaman BMN',
                    'total' => (clone $bmnMonth)->count(),
                    'pending' => (clone $bmnMonth)->whereIn('status', ['pengajuan', 'pengajuan-pengembalian'])->count(),
                    'active' => (clone $bmnMonth)->where('status', 'dipinjam')->count(),
                    'completed' => (clone $bmnMonth)->where('status', 'dikembalikan')->count(),
                    'completion' => 0,
                ],
                [
                    'title' => 'IT Helpdesk',
                    'total' => (clone $helpdeskMonth)->count(),
                    'pending' => (clone $helpdeskMonth)->where('status', 'open')->count(),
                    'active' => (clone $helpdeskMonth)->where('status', 'in_progress')->count(),
                    'completed' => (clone $helpdeskMonth)->where('status', 'completed')->count(),
                    'completion' => 0,
                ],
                [
                    'title' => 'Izin Keluar',
                    'total' => (clone $exitMonth)->count(),
                    'pending' => (clone $exitMonth)->where('status', 'out')->count(),
                    'active' => 0,
                    'completed' => (clone $exitMonth)->where('status', 'returned')->count(),
                    'completion' => 0,
                ],
            ];

            // Add Surat Tugas module
            $suratTugasMonth = SuratTugas::whereBetween('created_at', [$monthStart, $monthEnd]);
            $modules[] = [
                'title' => 'Surat Tugas',
                'total' => (clone $suratTugasMonth)->count(),
                'pending' => (clone $suratTugasMonth)->where('status', 'draft')->count(),
                'active' => (clone $suratTugasMonth)->where('status', 'lengkap')->whereNull('signed_at')->count(),
                'completed' => (clone $suratTugasMonth)->whereNotNull('signed_at')->count(),
                'completion' => 0,
            ];

            // Add Rispeg module
            $rispegMonth = EmployeeDailyControl::whereBetween('date', [$monthStart->toDateString(), $monthEnd->toDateString()]);
            $rispegMonthTotal = (clone $rispegMonth)->count();
            $rispegMonthViolations = (clone $rispegMonth)->where(function($q) {
                $q->where('violation_entry', true)
                  ->orWhere('violation_exit', true)
                  ->orWhere('violation_uniform', true);
            })->count();
            $rispegMonthClean = (clone $rispegMonth)->where('total_points', 0)->count();
            $modules[] = [
                'title' => 'Data Rispeg',
                'total' => $rispegMonthTotal,
                'pending' => $rispegMonthViolations,
                'active' => $rispegMonthTotal - $rispegMonthClean - $rispegMonthViolations,
                'completed' => $rispegMonthClean,
                'completion' => 0,
            ];

            // Calculate completion percentage
            foreach ($modules as &$mod) {
                $mod['completion'] = $mod['total'] > 0
                    ? round(($mod['completed'] / $mod['total']) * 100, 1)
                    : 0;
            }
            unset($mod);

            // ── Rispeg violations ────────────────────────────────────
            $rispegStats = [];
            if (class_exists(\App\Models\EmployeeDailyControl::class)) {
                $controls = \App\Models\EmployeeDailyControl::with('employee')
                    ->whereBetween('date', [$monthStart->toDateString(), $monthEnd->toDateString()])
                    ->get();

                $rispegStats = $controls->groupBy('employee_id')->map(function ($items) {
                    $employee = $items->first()->employee;
                    return [
                        'name' => $employee ? $employee->name : 'Unknown',
                        'nip' => $employee ? $employee->nip : '-',
                        'total_points' => $items->sum('total_points'),
                        'total_late_entries' => $items->where('violation_entry', true)->count(),
                        'total_late_minutes' => $items->sum('entry_late_minutes'),
                        'total_early_exits' => $items->where('violation_exit', true)->count(),
                        'total_early_minutes' => $items->sum('exit_early_minutes'),
                        'total_uniform_violations' => $items->where('violation_uniform', true)->count(),
                        'total_assembly_violations' => $items->where('violation_assembly', true)->count(),
                        'total_missed_checkins' => $items->where('violation_missed_checkin', true)->count(),
                        'total_missed_checkouts' => $items->where('violation_missed_checkout', true)->count(),
                    ];
                })->filter(fn ($s) => $s['total_points'] > 0)
                  ->sortByDesc('total_points')
                  ->values()
                  ->toArray();
            }

            // ── Trends ──────────────────────────────────────────────
            // Trend is always last 7 days of the period end date, or last 7 days from now if period is ongoing
            $trendEndDate = $monthEnd->isFuture() ? $now : $monthEnd;
            $sevenDaysAgo = $trendEndDate->copy()->subDays(6)->toDateString();
            $today = $trendEndDate->toDateString();
            $trends = $this->buildTrends($sevenDaysAgo, $today);

            $totalPending = array_sum(array_column($modules, 'pending'));

            // ── Performance Metrics ─────────────────────────────────
            $avgHelpdeskResolution = 0;
            $completedHelpdesk = (clone $helpdeskMonth)->where('status', 'completed')->get();
            if ($completedHelpdesk->count() > 0) {
                $totalDays = 0;
                foreach ($completedHelpdesk as $ticket) {
                    if ($ticket->created_at && $ticket->completion_date) {
                        $start = Carbon::parse($ticket->created_at)->startOfDay();
                        $end = Carbon::parse($ticket->completion_date)->startOfDay();
                        $totalDays += $start->diffInDays($end) ?: 1; // min 1 day
                    }
                }
                $avgHelpdeskResolution = round($totalDays / $completedHelpdesk->count(), 1);
            }

            $avgExitDuration = clone $exitMonth;
            $avgExitDurationMinutes = round($avgExitDuration->whereNotNull('duration_seconds')->avg('duration_seconds') / 60, 1) ?: 0;

            // ── AI Narrative ────────────────────────────────────────
            $geminiService = new \App\Services\GeminiService();
            $aiData = [
                'period' => $periodName,
                'total_services' => $overview['services_month'],
                'total_pending' => $totalPending,
                'modules' => $modules,
                'roles' => $roles,
                'rispeg_summary' => [
                    'total_violators' => count($rispegStats),
                    'top_violator' => $rispegStats[0] ?? null,
                ],
                'alerts' => [],
                'performance_metrics' => [
                    'avg_helpdesk_resolution_days' => $avgHelpdeskResolution,
                    'avg_exit_permit_duration_minutes' => $avgExitDurationMinutes,
                ],
            ];
            $aiAnalysis = $geminiService->generateMonthlyAnalysis($aiData);

            // ── KPIs for PDF ────────────────────────────────────────
            $kpis = [
                ['label' => 'Total Layanan (' . $periodName . ')', 'value' => $overview['services_month'], 'suffix' => 'tiket'],
                ['label' => 'Pengguna', 'value' => $overview['users_total'], 'suffix' => 'akun'],
                ['label' => 'Pegawai', 'value' => $overview['employees_total'], 'suffix' => 'orang'],
                ['label' => 'Aset BMN', 'value' => $overview['assets_total'], 'suffix' => 'item'],
                ['label' => 'Persediaan', 'value' => $overview['inventories_total'], 'suffix' => 'item'],
            ];

            // ── Render PDF ──────────────────────────────────────────
            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.admin_monthly_report', [
                'reportTitle' => $reportTitle,
                'periodName' => $periodName,
                'printedAt' => $now->format('d/m/Y H:i'),
                'printedBy' => $user->name ?? 'Administrator',
                'signatureDate' => $now->translatedFormat('d F Y'),
                'kpis' => $kpis,
                'aiAnalysis' => $aiAnalysis,
                'modules' => $modules,
                'roles' => $roles,
                'trends' => $trends,
                'rispegStats' => $rispegStats,
            ]);

            $pdf->setPaper('A4', 'landscape');

            $filename = "Laporan_Operasional_SIPTU_{$safePeriodName}.pdf";
            return $pdf->download($filename);

        } catch (\Exception $e) {
            \Log::error('Report export error: ' . $e->getMessage());
            \Log::error($e->getTraceAsString());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
