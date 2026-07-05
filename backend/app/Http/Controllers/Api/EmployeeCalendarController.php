<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agenda;
use App\Models\SuratTugas;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class EmployeeCalendarController extends Controller
{
    /**
     * Get combined calendar data for employee
     * Includes: Agendas and Surat Tugas
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        // Get filter parameters
        $year = $request->input('year', now()->year);
        $month = $request->input('month', now()->month);
        
        // Format month with leading zero
        $monthPadded = str_pad($month, 2, '0', STR_PAD_LEFT);
        
        // Get employee data for current user - check both user_id and nip
        $employee = Employee::where('user_id', $user->id)->first();
        
        // If not found by user_id, try finding by NIP
        if (!$employee && $user->nip) {
            $employee = Employee::where('nip', $user->nip)->first();
        }
        
        // 1. Get Agendas (general calendar events)
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
        
        // 2. Get Surat Tugas (employee assignments)
        // Query all surat tugas that overlap with the given month
        $startOfMonth = "{$year}-{$monthPadded}-01";
        $endOfMonth = date('Y-m-t', strtotime($startOfMonth)); // Last day of month
        
        // Build base query for surat tugas in this month
        $baseQuery = SuratTugas::with(['employees:id,name,nip', 'ketuaTim:id,name,nip'])
            ->where(function ($q) use ($startOfMonth, $endOfMonth) {
                $q->whereDate('tanggal_mulai', '<=', $endOfMonth)
                  ->whereDate('tanggal_selesai', '>=', $startOfMonth);
            });
        
        // If user has employee record, filter to show only their surat tugas
        // Otherwise, show ALL surat tugas (for testing/debugging)
        if ($employee) {
            $baseQuery->whereHas('employees', function ($q) use ($employee) {
                $q->where('employees.id', $employee->id);
            });
        }
        
        $suratTugas = $baseQuery
            ->orderBy('tanggal_mulai', 'asc')
            ->get()
            ->map(function ($st) {
                return [
                    'id' => 'st_' . $st->id,
                    'type' => 'surat_tugas',
                    'title' => 'Surat Tugas: ' . ($st->deskripsi_tugas ?? 'Tugas'),
                    'description' => $this->buildSuratTugasDescription($st),
                    'start_time' => $st->tanggal_mulai ? $st->tanggal_mulai->format('Y-m-d') . ' 08:00:00' : null,
                    'end_time' => $st->tanggal_selesai ? $st->tanggal_selesai->format('Y-m-d') . ' 17:00:00' : null,
                    'location_url' => $st->lokasi_tugas,
                    'link_surat' => null,
                    'penyelenggara' => $st->sarana_nama,
                    'nomor_st' => $st->nomor_st,
                    'status' => $st->status,
                    'employees' => $st->employees->map(fn($e) => ['id' => $e->id, 'name' => $e->name, 'nip' => $e->nip]),
                    'ketua_tim' => $st->ketuaTim ? ['id' => $st->ketuaTim->id, 'name' => $st->ketuaTim->name] : null,
                ];
            });
        
        // Combine and sort by start_time
        $combined = $agendas->concat($suratTugas)
            ->sortBy('start_time')
            ->values();
        
        return response()->json([
            'data' => $combined,
            'meta' => [
                'year' => (int) $year,
                'month' => (int) $month,
                'employee_id' => $employee?->id,
                'employee_name' => $employee?->name,
                'user_nip' => $user->nip,
                'total_events' => $combined->count(),
                'agenda_count' => $agendas->count(),
                'surat_tugas_count' => $suratTugas->count(),
                'debug' => [
                    'start_of_month' => $startOfMonth,
                    'end_of_month' => $endOfMonth,
                ]
            ]
        ]);
    }
    
    /**
     * Build description for Surat Tugas
     */
    /**
     * Debug endpoint - get all surat tugas for month without employee filter
     */
    public function debug(Request $request)
    {
        $year = $request->input('year', now()->year);
        $month = $request->input('month', now()->month);
        $monthPadded = str_pad($month, 2, '0', STR_PAD_LEFT);
        
        $startOfMonth = "{$year}-{$monthPadded}-01";
        $endOfMonth = date('Y-m-t', strtotime($startOfMonth));
        
        // Get ALL surat tugas for this month
        $allSuratTugas = SuratTugas::with(['employees:id,name,nip'])
            ->whereBetween('tanggal_mulai', [$startOfMonth, $endOfMonth])
            ->orWhereBetween('tanggal_selesai', [$startOfMonth, $endOfMonth])
            ->get();
        
        return response()->json([
            'debug' => true,
            'year' => $year,
            'month' => $month,
            'date_range' => [$startOfMonth, $endOfMonth],
            'total_surat_tugas' => $allSuratTugas->count(),
            'surat_tugas' => $allSuratTugas->map(function ($st) {
                return [
                    'id' => $st->id,
                    'deskripsi_tugas' => $st->deskripsi_tugas,
                    'tanggal_mulai' => $st->tanggal_mulai,
                    'tanggal_selesai' => $st->tanggal_selesai,
                    'employees' => $st->employees->map(fn($e) => ['id' => $e->id, 'name' => $e->name]),
                ];
            })
        ]);
    }
    
    private function buildSuratTugasDescription(SuratTugas $st): string
    {
        $parts = [];
        
        if ($st->nomor_st) {
            $parts[] = "Nomor: {$st->nomor_st}";
        }
        
        if ($st->mak) {
            $parts[] = "MAK: {$st->mak}";
        }
        
        if ($st->lokasi_tugas) {
            $parts[] = "Lokasi: {$st->lokasi_tugas}";
        }
        
        // Add employee names
        $employeeNames = $st->employees->pluck('name')->implode(', ');
        if ($employeeNames) {
            $parts[] = "Tim: {$employeeNames}";
        }
        
        return implode(" | ", $parts);
    }
    
    /**
     * Get calendar events for a specific date range
     */
    public function range(Request $request)
    {
        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
        ]);
        
        $user = $request->user();
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        
        // Get employee data for current user
        $employee = Employee::where('user_id', $user->id)->first();
        
        // Get Agendas within date range
        $agendas = Agenda::with('creator:id,name')
            ->whereDate('start_time', '>=', $startDate)
            ->whereDate('start_time', '<=', $endDate)
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
        
        // Get Surat Tugas within date range
        $suratTugasQuery = SuratTugas::with(['employees:id,name,nip', 'ketuaTim:id,name,nip'])
            ->whereDate('tanggal_mulai', '>=', $startDate)
            ->whereDate('tanggal_mulai', '<=', $endDate);
        
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
                    'description' => $this->buildSuratTugasDescription($st),
                    'start_time' => $st->tanggal_mulai ? $st->tanggal_mulai->format('Y-m-d') . ' 08:00:00' : null,
                    'end_time' => $st->tanggal_selesai ? $st->tanggal_selesai->format('Y-m-d') . ' 17:00:00' : null,
                    'location_url' => $st->lokasi_tugas,
                    'link_surat' => null,
                    'penyelenggara' => $st->sarana_nama,
                    'nomor_st' => $st->nomor_st,
                    'status' => $st->status,
                    'employees' => $st->employees->map(fn($e) => ['id' => $e->id, 'name' => $e->name, 'nip' => $e->nip]),
                    'ketua_tim' => $st->ketuaTim ? ['id' => $st->ketuaTim->id, 'name' => $st->ketuaTim->name] : null,
                ];
            });
        
        // Combine and sort
        $combined = $agendas->concat($suratTugas)
            ->sortBy('start_time')
            ->values();
        
        return response()->json([
            'data' => $combined,
            'meta' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'total_events' => $combined->count(),
            ]
        ]);
    }
}
