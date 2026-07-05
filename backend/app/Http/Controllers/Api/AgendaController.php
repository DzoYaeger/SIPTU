<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agenda;
use App\Models\SuratTugas;
use App\Models\Employee;
use Illuminate\Http\Request;

class AgendaController extends Controller
{
    /**
     * Display a listing of agendas.
     * Optionally filter by month and year.
     */
    public function index(Request $request)
    {
        $query = Agenda::with('creator:id,name');

        if ($request->has('year') && $request->has('month')) {
            $year = $request->year;
            $month = str_pad($request->month, 2, '0', STR_PAD_LEFT);
            $query->whereYear('start_time', $year)
                  ->whereMonth('start_time', $month);
        }

        $agendas = $query->orderBy('start_time', 'asc')->get();

        return response()->json([
            'data' => $agendas
        ]);
    }

    /**
     * Store a newly created agenda in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after_or_equal:start_time',
            'description' => 'nullable|string',
            'location_url' => 'nullable|string',
            'link_surat' => 'nullable|string',
            'penyelenggara' => 'nullable|string|max:255',
            'type' => 'nullable|string|max:100',
        ]);

        $validated['created_by'] = $request->user()->id;

        $agenda = Agenda::create($validated);

        return response()->json([
            'message' => 'Agenda berhasil ditambahkan',
            'data' => $agenda
        ], 201);
    }

    /**
     * Display the specified agenda.
     */
    public function show($id)
    {
        $agenda = Agenda::with('creator:id,name')->findOrFail($id);
        return response()->json([
            'data' => $agenda
        ]);
    }

    /**
     * Update the specified agenda in storage.
     */
    public function update(Request $request, $id)
    {
        $agenda = Agenda::findOrFail($id);
        
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after_or_equal:start_time',
            'description' => 'nullable|string',
            'location_url' => 'nullable|string',
            'link_surat' => 'nullable|string',
            'penyelenggara' => 'nullable|string|max:255',
            'type' => 'nullable|string|max:100',
        ]);

        $agenda->update($validated);

        return response()->json([
            'message' => 'Agenda berhasil diperbarui',
            'data' => $agenda
        ]);
    }

    /**
     * Remove the specified agenda from storage.
     */
    public function destroy($id)
    {
        $agenda = Agenda::findOrFail($id);
        $agenda->delete();

        return response()->json([
            'message' => 'Agenda berhasil dihapus'
        ]);
    }

    /**
     * Get combined calendar data for employee
     * Includes: Agendas and Surat Tugas
     */
    public function employeeCalendar(Request $request)
    {
        try {
            $user = $request->user();
            
            $year = $request->input('year', now()->year);
            $month = $request->input('month', now()->month);
            $monthPadded = str_pad($month, 2, '0', STR_PAD_LEFT);
            
            // Get employee by user_id or nip
            $employee = null;
            try {
                $employee = Employee::where('user_id', $user->id)->first();
                if (!$employee && $user->nip) {
                    $employee = Employee::where('nip', $user->nip)->first();
                }
            } catch (\Throwable $e) {
                \Log::warning("Could not fetch employee record for calendar: " . $e->getMessage());
            }
            
            // Get Agendas
            $agendas = collect();
            try {
                $agendas = Agenda::with('creator:id,name')
                    ->whereYear('start_time', $year)
                    ->whereMonth('start_time', $month)
                    ->orderBy('start_time', 'asc')
                    ->get()
                    ->map(function ($agenda) {
                        return [
                            'id' => 'agenda_' . $agenda->id,
                            'type' => 'agenda',
                            'title' => $agenda->title,
                            'description' => $agenda->description,
                            'start_time' => $agenda->start_time,
                            'end_time' => $agenda->end_time,
                            'location_url' => $agenda->location_url,
                            'link_surat' => $agenda->link_surat,
                            'penyelenggara' => $agenda->penyelenggara,
                            'created_by' => $agenda->creator?->name,
                        ];
                    });
            } catch (\Throwable $e) {
                \Log::error("Error fetching agendas for calendar: " . $e->getMessage());
            }
            
            // Get Surat Tugas
            $suratTugas = collect();
            try {
                $startOfMonth = "{$year}-{$monthPadded}-01";
                $endOfMonth = date('Y-m-t', strtotime($startOfMonth));
                
                $suratTugasQuery = SuratTugas::with(['employees:id,name,nip', 'ketuaTim:id,name,nip'])
                    ->whereDate('tanggal_mulai', '<=', $endOfMonth)
                    ->whereDate('tanggal_selesai', '>=', $startOfMonth);
                
                // Filter by employee if found
                if ($employee) {
                    $suratTugasQuery->whereHas('employees', function ($q) use ($employee) {
                        $q->where('employees.id', $employee->id);
                    });
                }
                
                $suratTugas = $suratTugasQuery
                    ->orderBy('tanggal_mulai', 'asc')
                    ->get()
                    ->map(function ($st) {
                        return [
                            'id' => 'st_' . $st->id,
                            'type' => 'surat_tugas',
                            'title' => 'Surat Tugas: ' . ($st->deskripsi_tugas ?? 'Tugas'),
                            'description' => $st->nomor_st ? "Nomor: {$st->nomor_st}" : null,
                            'start_time' => $st->tanggal_mulai ? $st->tanggal_mulai->format('Y-m-d') . ' 08:00:00' : null,
                            'end_time' => $st->tanggal_selesai ? $st->tanggal_selesai->format('Y-m-d') . ' 17:00:00' : null,
                            'location_url' => $st->lokasi_tugas,
                            'penyelenggara' => $st->sarana_nama,
                            'nomor_st' => $st->nomor_st,
                            'status' => $st->status,
                            'employees' => $st->employees->map(fn($e) => ['id' => $e->id, 'name' => $e->name]),
                            'ketua_tim' => $st->ketuaTim ? ['id' => $st->ketuaTim->id, 'name' => $st->ketuaTim->name] : null,
                        ];
                    });
            } catch (\Throwable $e) {
                \Log::error("Error fetching surat tugas for calendar: " . $e->getMessage());
            }
            
            $combined = $agendas->concat($suratTugas)->sortBy('start_time')->values();
            
            return response()->json([
                'data' => $combined,
                'meta' => [
                    'year' => (int) $year,
                    'month' => (int) $month,
                    'employee_id' => $employee?->id,
                    'employee_name' => $employee?->name,
                    'total_events' => $combined->count(),
                    'agenda_count' => $agendas->count(),
                    'surat_tugas_count' => $suratTugas->count(),
                ]
            ]);
        } catch (\Throwable $e) {
            \Log::critical("Critical error in employeeCalendar API: " . $e->getMessage());
            return response()->json([
                'message' => 'Terjadi kesalahan saat mengambil data kalender.',
                'error' => config('app.debug') ? $e->getMessage() : null,
                'data' => []
            ], 500);
        }
    }

    /**
     * Get combined calendar data for PUBLIC (only Agendas now)
     */
    public function publicCalendar(Request $request)
    {
        try {
            $year = $request->input('year', now()->year);
            $month = $request->input('month', now()->month);
            
            // Get Agendas ONLY
            $agendas = collect();
            try {
                $agendas = Agenda::with('creator:id,name')
                    ->whereYear('start_time', $year)
                    ->whereMonth('start_time', $month)
                    ->orderBy('start_time', 'asc')
                    ->get()
                    ->map(function ($agenda) {
                        return [
                            'id' => 'agenda_' . $agenda->id,
                            'type' => $agenda->type ?? 'agenda',
                            'title' => $agenda->title,
                            'description' => $agenda->description,
                            'start_time' => $agenda->start_time,
                            'end_time' => $agenda->end_time,
                            'location_url' => $agenda->location_url,
                            'link_surat' => $agenda->link_surat,
                            'penyelenggara' => $agenda->penyelenggara,
                            'created_by' => $agenda->creator?->name,
                        ];
                    });
            } catch (\Throwable $e) {
                \Log::error("Error fetching agendas for public calendar: " . $e->getMessage());
            }
            
            return response()->json([
                'data' => $agendas,
                'meta' => [
                    'year' => (int) $year,
                    'month' => (int) $month,
                    'total_events' => $agendas->count(),
                ]
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Terjadi kesalahan saat mengambil data kalender publik.',
                'error' => config('app.debug') ? $e->getMessage() : null,
                'data' => []
            ], 500);
        }
    }
}
