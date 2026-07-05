<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ArchiveLoan;
use App\Models\BmnLoan;
use App\Models\ExitPermit;
use App\Models\ItHelpdeskTicket;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use App\Models\ActivityLog;

class ValidatorUsageReportController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$this->canAccess($user)) {
            return response()->json(['message' => 'Laporan penggunaan hanya untuk validator atau admin.'], 403);
        }

        $now = Carbon::now('Asia/Makassar');
        $from = $request->query('date_from')
            ? Carbon::parse($request->query('date_from'))->startOfDay()
            : $now->copy()->subDays(29)->startOfDay();
        $to = $request->query('date_to')
            ? Carbon::parse($request->query('date_to'))->endOfDay()
            : $now->copy()->endOfDay();

        $module = (string) $request->query('module', 'all');
        $search = trim((string) $request->query('search', ''));
        $page = max(1, (int) $request->query('page', 1));
        $pageSize = min(200, max(10, (int) $request->query('page_size', 50)));

        $activities = $this->collectActivities($from, $to, $module, $search);
        $total = $activities->count();
        $items = $activities->forPage($page, $pageSize)->values();

        $summary = [
            'total_activities' => $total,
            'today_activities' => $activities->filter(fn ($a) => Carbon::parse($a['activity_at'])->isToday())->count(),
            'active_users' => $activities->map(fn ($a) => $a['user_nip'] ?? $a['user_name'])->filter()->unique()->count(),
            'avg_daily' => round($total / max(1, $from->diffInDays($to) + 1), 1),
        ];

        $byModule = $activities
            ->groupBy('module')
            ->map(fn ($group) => $group->count())
            ->toArray();

        $topUsers = $activities
            ->groupBy(fn ($a) => ($a['user_nip'] ?? '-') . '|' . ($a['user_name'] ?? '-'))
            ->map(function (Collection $group) {
                $first = $group->first();
                return [
                    'user_name' => $first['user_name'] ?? '-',
                    'user_nip' => $first['user_nip'] ?? '-',
                    'total_activities' => $group->count(),
                    'last_activity_at' => $group->max('activity_at'),
                ];
            })
            ->sortByDesc('total_activities')
            ->values()
            ->take(10);

        $dailyTrend = $this->buildDailyTrend($activities, $from, $to);

        return response()->json([
            'generated_at' => $now->toIso8601String(),
            'filters' => [
                'date_from' => $from->toDateString(),
                'date_to' => $to->toDateString(),
                'module' => $module,
                'search' => $search,
                'page' => $page,
                'page_size' => $pageSize,
            ],
            'summary' => $summary,
            'by_module' => $byModule,
            'top_users' => $topUsers,
            'daily_trend' => $dailyTrend,
            'activities' => [
                'data' => $items,
                'total' => $total,
            ],
        ]);
    }

    private function canAccess($user): bool
    {
        if (($user->base_role ?? null) === 'admin') return true;
        if (($user->base_role ?? null) === 'validator') return true;

        $available = is_array($user->available_roles ?? null) ? $user->available_roles : [];
        if (in_array('validator', $available, true)) return true;

        $roleModules = is_array($user->role_modules ?? null) ? $user->role_modules : [];
        if (!empty($roleModules['validator']) && is_array($roleModules['validator'])) return true;

        $permissions = is_array($user->module_permissions ?? null) ? $user->module_permissions : [];
        foreach ($permissions as $permission) {
            if (($permission['is_validator'] ?? false) === true) {
                return true;
            }
        }

        return false;
    }

    private function collectActivities(Carbon $from, Carbon $to, string $module, string $search): Collection
    {
        $items = collect();

        if ($module === 'all' || $module === 'archive') {
            $query = ArchiveLoan::query()->whereBetween('created_at', [$from, $to]);
            if ($search !== '') {
                $query->where(function ($q) use ($search) {
                    $q->where('request_number', 'like', "%{$search}%")
                        ->orWhere('borrower_name', 'like', "%{$search}%")
                        ->orWhere('borrower_nip', 'like', "%{$search}%");
                });
            }
            $items = $items->concat($query->get()->map(fn ($row) => [
                'id' => $row->id,
                'module' => 'archive',
                'ticket_number' => $row->request_number,
                'user_name' => $row->borrower_name,
                'user_nip' => $row->borrower_nip,
                'status' => $row->status,
                'description' => $row->archive_number,
                'activity_at' => optional($row->created_at)->toIso8601String(),
            ]));
        }

        if ($module === 'all' || $module === 'bmn') {
            $query = BmnLoan::query()->whereBetween('created_at', [$from, $to]);
            if ($search !== '') {
                $query->where(function ($q) use ($search) {
                    $q->where('spa_number', 'like', "%{$search}%")
                        ->orWhere('borrower_name', 'like', "%{$search}%")
                        ->orWhere('borrower_nip', 'like', "%{$search}%");
                });
            }
            $items = $items->concat($query->get()->map(fn ($row) => [
                'id' => $row->id,
                'module' => 'bmn',
                'ticket_number' => $row->spa_number,
                'user_name' => $row->borrower_name,
                'user_nip' => $row->borrower_nip,
                'status' => $row->status,
                'description' => $row->notes ?: '-',
                'activity_at' => optional($row->created_at)->toIso8601String(),
            ]));
        }

        if ($module === 'all' || $module === 'it_helpdesk') {
            $query = ItHelpdeskTicket::query()->whereBetween('created_at', [$from, $to]);
            if ($search !== '') {
                $query->where(function ($q) use ($search) {
                    $q->where('ticket_number', 'like', "%{$search}%")
                        ->orWhere('employee_name', 'like', "%{$search}%")
                        ->orWhere('employee_nip', 'like', "%{$search}%");
                });
            }
            $items = $items->concat($query->get()->map(fn ($row) => [
                'id' => $row->id,
                'module' => 'it_helpdesk',
                'ticket_number' => $row->ticket_number,
                'user_name' => $row->employee_name,
                'user_nip' => $row->employee_nip,
                'status' => $row->status,
                'description' => $row->report_type ?: '-',
                'activity_at' => optional($row->created_at)->toIso8601String(),
            ]));
        }

        if ($module === 'all' || $module === 'exit_permit') {
            $query = ExitPermit::query()->whereBetween('created_at', [$from, $to]);
            if ($search !== '') {
                $query->where(function ($q) use ($search) {
                    $q->where('employee_name', 'like', "%{$search}%")
                        ->orWhere('nip', 'like', "%{$search}%")
                        ->orWhere('reason', 'like', "%{$search}%");
                });
            }
            $items = $items->concat($query->get()->map(fn ($row) => [
                'id' => $row->id,
                'module' => 'exit_permit',
                'ticket_number' => 'IK-' . str_pad((string) $row->id, 6, '0', STR_PAD_LEFT),
                'user_name' => $row->employee_name,
                'user_nip' => $row->nip,
                'status' => $row->status,
                'description' => $row->reason ?: '-',
                'activity_at' => optional($row->created_at)->toIso8601String(),
            ]));
        }

        // Fetch universal activity logs
        $activityLogQuery = ActivityLog::query()->whereBetween('created_at', [$from, $to]);
        
        if ($module !== 'all') {
            $activityLogQuery->where('module', $module);
        }

        if ($search !== '') {
            $activityLogQuery->where(function ($q) use ($search) {
                $q->where('user_name', 'like', "%{$search}%")
                  ->orWhere('user_nip', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('ticket_number', 'like', "%{$search}%");
            });
        }

        $items = $items->concat($activityLogQuery->get()->map(fn ($row) => [
            'id' => 'log_' . $row->id,
            'module' => $row->module,
            'ticket_number' => $row->ticket_number,
            'user_name' => $row->user_name,
            'user_nip' => $row->user_nip,
            'status' => $row->action, // Render action as status tag
            'description' => $row->description ?: '-',
            'activity_at' => optional($row->created_at)->toIso8601String(),
        ]));

        return $items
            ->sortByDesc('activity_at')
            ->values();
    }

    private function buildDailyTrend(Collection $activities, Carbon $from, Carbon $to): array
    {
        $labels = [];
        $cursor = $from->copy()->startOfDay();
        $end = $to->copy()->startOfDay();
        while ($cursor->lte($end)) {
            $labels[] = $cursor->format('Y-m-d');
            $cursor->addDay();
        }

        $series = [];
        foreach ($labels as $day) {
            $series[] = $activities->filter(
                fn ($item) => Carbon::parse($item['activity_at'])->format('Y-m-d') === $day
            )->count();
        }

        return [
            'labels' => $labels,
            'series' => $series,
        ];
    }
}
