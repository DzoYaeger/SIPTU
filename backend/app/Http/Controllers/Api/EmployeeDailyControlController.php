<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Models\EmployeeDailyControl;
use App\Models\Employee;
use Illuminate\Support\Carbon;
use Barryvdh\DomPDF\Facade\Pdf;

class EmployeeDailyControlController extends Controller
{
    /**
     * Get daily controls for a specific date.
     * Returns all employees with their control data (if exists) or empty structure.
     */
    public function index(Request $request)
    {
        $request->validate([
            'date' => 'required|date',
        ]);
        
        $date = $request->date;
        
        $employees = Employee::with(['dailyControls' => function($query) use ($date) {
            $query->where('date', $date);
        }])->orderBy('name')->get();
        
        $data = $employees->map(function ($employee) use ($date) {
            $control = $employee->dailyControls->first();
            
            return [
                'employee_id' => $employee->id,
                'name' => $employee->name,
                'nip' => $employee->nip,
                'unit' => $employee->unit, // Assuming unit/position field exists or related
                'control' => $control ? $control : [
                    'id' => null,
                    'date' => $date,
                    'violation_uniform' => false,
                    'violation_assembly' => false,
                    'violation_entry' => false,
                    'entry_late_minutes' => 0,
                    'violation_exit' => false,
                    'exit_early_minutes' => 0,
                    'violation_missed_checkin' => false,
                    'missed_checkin_minutes' => 0,
                    'violation_missed_checkout' => false,
                    'missed_checkout_minutes' => 0,
                    'total_points' => 0,
                ]
            ];
        });

        return response()->json($data);
    }

    /**
     * Store or Update a daily control record.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'date' => 'required|date',
            'violation_uniform' => 'boolean',
            'violation_assembly' => 'boolean',
            'violation_entry' => 'boolean',
            'entry_late_minutes' => 'numeric|min:0',
            'violation_exit' => 'boolean',
            'exit_early_minutes' => 'numeric|min:0',
            'violation_missed_checkin' => 'boolean',
            'missed_checkin_minutes' => 'numeric|min:0',
            'violation_missed_checkout' => 'boolean',
            'missed_checkout_minutes' => 'numeric|min:0',
        ]);
        
        // Calculate points
        $points = 0;
        if ($validated['violation_uniform'] ?? false) $points++;
        if ($validated['violation_assembly'] ?? false) $points++;
        if ($validated['violation_entry'] ?? false) $points++;
        if ($validated['violation_exit'] ?? false) $points++;
        if ($validated['violation_missed_checkin'] ?? false) $points++;
        if ($validated['violation_missed_checkout'] ?? false) $points++;
        
        $control = EmployeeDailyControl::updateOrCreate(
            [
                'employee_id' => $validated['employee_id'],
                'date' => $validated['date'],
            ],
            [
                'violation_uniform' => $validated['violation_uniform'] ?? false,
                'violation_assembly' => $validated['violation_assembly'] ?? false,
                'violation_entry' => $validated['violation_entry'] ?? false,
                'entry_late_minutes' => $validated['entry_late_minutes'] ?? 0,
                'violation_exit' => $validated['violation_exit'] ?? false,
                'exit_early_minutes' => $validated['exit_early_minutes'] ?? 0,
                'violation_missed_checkin' => $validated['violation_missed_checkin'] ?? false,
                'missed_checkin_minutes' => ($validated['violation_missed_checkin'] ?? false)
                    ? ($validated['missed_checkin_minutes'] ?? 0)
                    : 0,
                'violation_missed_checkout' => $validated['violation_missed_checkout'] ?? false,
                'missed_checkout_minutes' => ($validated['violation_missed_checkout'] ?? false)
                    ? ($validated['missed_checkout_minutes'] ?? 0)
                    : 0,
                'total_points' => $points,
            ]
        );

        return response()->json($control);
    }

    /**
     * Store or Update multiple daily control records.
     */
    public function bulkStore(Request $request)
    {
        $request->validate([
            'date' => 'required|date',
            'controls' => 'required|array',
            'controls.*.employee_id' => 'required|exists:employees,id',
            'controls.*.violation_uniform' => 'boolean',
            'controls.*.violation_assembly' => 'boolean',
            'controls.*.violation_entry' => 'boolean',
            'controls.*.entry_late_minutes' => 'numeric|min:0',
            'controls.*.violation_exit' => 'boolean',
            'controls.*.exit_early_minutes' => 'numeric|min:0',
            'controls.*.violation_missed_checkin' => 'boolean',
            'controls.*.missed_checkin_minutes' => 'numeric|min:0',
            'controls.*.violation_missed_checkout' => 'boolean',
            'controls.*.missed_checkout_minutes' => 'numeric|min:0',
        ]);

        $date = $request->date;
        $saved = [];

        foreach ($request->controls as $item) {
             // Calculate points
            $points = 0;
            if ($item['violation_uniform'] ?? false) $points++;
            if ($item['violation_assembly'] ?? false) $points++;
            if ($item['violation_entry'] ?? false) $points++;
            if ($item['violation_exit'] ?? false) $points++;
            if ($item['violation_missed_checkin'] ?? false) $points++;
            if ($item['violation_missed_checkout'] ?? false) $points++;

            $control = EmployeeDailyControl::updateOrCreate(
                [
                    'employee_id' => $item['employee_id'],
                    'date' => $date,
                ],
                [
                    'violation_uniform' => $item['violation_uniform'] ?? false,
                    'violation_assembly' => $item['violation_assembly'] ?? false,
                    'violation_entry' => $item['violation_entry'] ?? false,
                    'entry_late_minutes' => $item['entry_late_minutes'] ?? 0,
                    'violation_exit' => $item['violation_exit'] ?? false,
                    'exit_early_minutes' => $item['exit_early_minutes'] ?? 0,
                    'violation_missed_checkin' => $item['violation_missed_checkin'] ?? false,
                    'missed_checkin_minutes' => ($item['violation_missed_checkin'] ?? false)
                        ? ($item['missed_checkin_minutes'] ?? 0)
                        : 0,
                    'violation_missed_checkout' => $item['violation_missed_checkout'] ?? false,
                    'missed_checkout_minutes' => ($item['violation_missed_checkout'] ?? false)
                        ? ($item['missed_checkout_minutes'] ?? 0)
                        : 0,
                    'total_points' => $points,
                ]
            );
            $saved[] = $control;
        }

        return response()->json(['message' => 'Data berhasil disimpan', 'data' => $saved]);
    }

    /**
     * Get dashboard statistics.
     */
    public function dashboard(Request $request)
    {
        $month = $request->input('month', date('m'));
        $year = $request->input('year', date('Y'));

        // Helper to query base stats
        $query = EmployeeDailyControl::with('employee')
            ->whereYear('date', $year)
            ->whereMonth('date', $month);

        // Aggregate per employee
        // We use a raw query or collection aggregation. For simplicity and DB compatibility, let's fetch and collection-process 
        // if dataset is small, or use DB raw if large. 
        // Given typically < 200 employees, collection processing is fine and easier to read.
        
        $controls = $query->get();
        
        $employeeStats = $controls->groupBy('employee_id')->map(function ($items, $id) {
            $employee = $items->first()->employee;
            return [
                'employee_id' => $id,
                'name' => $employee ? $employee->name : 'Unknown',
                'nip' => $employee ? $employee->nip : '-',
                'total_points' => $items->sum('total_points'),
                'total_late_entries' => $items->where('violation_entry', true)->count(),
                'total_late_minutes' => $items->sum('entry_late_minutes'),
                'total_early_exits' => $items->where('violation_exit', true)->count(),
                'total_early_minutes' => $items->sum('exit_early_minutes'),
                'total_missed_checkins' => $items->where('violation_missed_checkin', true)->count(),
                'total_missed_checkin_minutes' => $items->sum('missed_checkin_minutes'),
                'total_missed_checkouts' => $items->where('violation_missed_checkout', true)->count(),
                'total_missed_checkout_minutes' => $items->sum('missed_checkout_minutes'),
                'total_uniform_violations' => $items->where('violation_uniform', true)->count(),
                'total_assembly_violations' => $items->where('violation_assembly', true)->count(),
            ];
        })->values();

        // 1. Pegawai dengan total point terbanyak
        $topPoints = $employeeStats->sortByDesc('total_points')->first();

        // 2. Pegawai dengan pelanggaran jam masuk terbanyak (Count)
        $mostLateEntries = $employeeStats->sortByDesc('total_late_entries')->first();
        $mostLateMinutes = $employeeStats->sortByDesc('total_late_minutes')->first();

        // 3. Pegawai dengan keluar cepat terbanyak (Count)
        $mostEarlyExits = $employeeStats->sortByDesc('total_early_exits')->first();
        $mostEarlyMinutes = $employeeStats->sortByDesc('total_early_minutes')->first();

        // 4. Rekapan Pelanggaran Harian (Hanya pegawai yang memiliki pelanggaran)
        $dailyViolations = $controls->filter(function ($c) {
            return $c->total_points > 0;
        })->sortBy('date')->map(function ($c) {
            $violations = [];
            if ($c->violation_entry) $violations[] = "Terlambat Masuk ({$c->entry_late_minutes} menit)";
            if ($c->violation_exit) $violations[] = "Pulang Cepat ({$c->exit_early_minutes} menit)";
            if ($c->violation_uniform) $violations[] = "Tidak Berseragam";
            if ($c->violation_assembly) $violations[] = "terlambat Absen Apel pagi";
            if ($c->violation_missed_checkin) $violations[] = "Lupa Absen Masuk";
            if ($c->violation_missed_checkout) $violations[] = "Lupa Absen Pulang";

            return [
                'employee_id' => $c->employee_id,
                'employee_name' => $c->employee ? $c->employee->name : 'Unknown',
                'date' => $c->date,
                'violation_details' => implode(', ', $violations)
            ];
        })->values();

        return response()->json([
            'month' => (int)$month,
            'year' => (int)$year,
            'summary' => [
                'top_points' => $topPoints,
                'most_late_entries' => $mostLateEntries,
                'most_late_minutes' => $mostLateMinutes,
                'most_early_exits' => $mostEarlyExits,
                'most_early_minutes' => $mostEarlyMinutes,
            ],
            'all_stats' => $employeeStats->sortByDesc('total_points')->values(),
            'daily_violations' => $dailyViolations
        ]);
    }

    public function exportPdf(Request $request)
    {
        try {
            $month = $request->input('month', date('m'));
            $year = $request->input('year', date('Y'));

            $query = EmployeeDailyControl::with('employee')
                ->whereYear('date', $year)
                ->whereMonth('date', $month);
            
            $controls = $query->get();
            
            $employeeStats = $controls->groupBy('employee_id')->map(function ($items, $id) {
                $employee = $items->first()->employee;
                return [
                    'employee_id' => $id,
                    'name' => $employee ? $employee->name : 'Unknown',
                    'nip' => $employee ? $employee->nip : '-',
                    'total_points' => $items->sum('total_points'),
                    'total_late_entries' => $items->where('violation_entry', true)->count(),
                    'total_late_minutes' => $items->sum('entry_late_minutes'),
                    'total_early_exits' => $items->where('violation_exit', true)->count(),
                    'total_early_minutes' => $items->sum('exit_early_minutes'),
                    'total_missed_checkins' => $items->where('violation_missed_checkin', true)->count(),
                    'total_missed_checkin_minutes' => $items->sum('missed_checkin_minutes'),
                    'total_missed_checkouts' => $items->where('violation_missed_checkout', true)->count(),
                    'total_missed_checkout_minutes' => $items->sum('missed_checkout_minutes'),
                    'total_uniform_violations' => $items->where('violation_uniform', true)->count(),
                    'total_assembly_violations' => $items->where('violation_assembly', true)->count(),
                ];
            })->values();

            // 1. Pegawai dengan total point terbanyak
            $topPoints = $employeeStats->sortByDesc('total_points')->first();

            // 2. Pegawai dengan pelanggaran jam masuk terbanyak (Count)
            $mostLateEntries = $employeeStats->sortByDesc('total_late_entries')->first();

            // 3. Pegawai dengan keluar cepat terbanyak (Count)
            $mostEarlyExits = $employeeStats->sortByDesc('total_early_exits')->first();

            $monthName = Carbon::createFromDate($year, $month, 1)->translatedFormat('F');

            $pdf = Pdf::loadView('pdf.rispeg_report', [
                'month' => $month,
                'year' => $year,
                'monthName' => $monthName,
                'summary' => [
                    'top_points' => $topPoints,
                    'most_late_entries' => $mostLateEntries,
                    'most_early_exits' => $mostEarlyExits,
                ],
                'allStats' => $employeeStats->sortByDesc('total_points')->values()
            ]);

            return $pdf->download('Laporan_Monitoring_Rispeg_'.$monthName.'_'.$year.'.pdf');
        } catch (\Exception $e) {
            \Log::error('PDF Export Error: ' . $e->getMessage());
            \Log::error($e->getTraceAsString());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get the admin-configured default month for the RISPEG announcement page.
     */
    public function getDefaultMonth()
    {
        $path = storage_path('app/rispeg_default_month.json');

        if (!file_exists($path)) {
            return response()->json(['month' => null, 'year' => null]);
        }

        $data = json_decode(file_get_contents($path), true);

        return response()->json([
            'month' => $data['month'] ?? null,
            'year'  => $data['year'] ?? null,
        ]);
    }

    /**
     * Set the default month for the RISPEG announcement page (admin only).
     */
    public function setDefaultMonth(Request $request)
    {
        $user = $request->user();
        if (!$user || ($user->base_role ?? null) !== 'admin') {
            return response()->json(['message' => 'Hanya admin yang dapat mengatur bulan default.'], 403);
        }

        $validated = $request->validate([
            'month' => 'required|integer|min:1|max:12',
            'year'  => 'required|integer|min:2020|max:2099',
        ]);

        $path = storage_path('app/rispeg_default_month.json');
        file_put_contents($path, json_encode([
            'month' => $validated['month'],
            'year'  => $validated['year'],
        ]));

        return response()->json([
            'message' => 'Bulan default berhasil diatur.',
            'month'   => $validated['month'],
            'year'    => $validated['year'],
        ]);
    }
}
