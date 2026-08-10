<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RhpkItem;
use App\Models\RhpkReport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RhpkController extends Controller
{
    /**
     * Display a listing of RHPK reports.
     */
    public function index(Request $request)
    {
        $query = RhpkReport::with(['creator:id,name,nip,email', 'reviewer:id,name,nip', 'items']);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('team_unit', 'like', "%{$search}%")
                  ->orWhereHas('creator', function ($qc) use ($search) {
                      $qc->where('name', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->filled('year')) {
            $query->where('year', $request->input('year'));
        }

        if ($request->filled('period')) {
            $query->where('period', $request->input('period'));
        }

        if ($request->filled('team_unit')) {
            $query->where('team_unit', $request->input('team_unit'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $reports = $query->orderBy('created_at', 'desc')->paginate($request->input('per_page', 15));

        return response()->json($reports);
    }

    /**
     * Store a newly created RHPK report.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'year' => 'required|integer|min:2020|max:2100',
            'period' => 'required|string|max:50',
            'team_unit' => 'nullable|string|max:100',
            'items' => 'required|array|min:1',
            'items.*.rhk_name' => 'required|string|max:255',
            'items.*.indicator' => 'required|string|max:255',
            'items.*.target_volume' => 'required|integer|min:1',
            'items.*.unit' => 'nullable|string|max:50',
            'items.*.realization_volume' => 'nullable|integer|min:0',
            'items.*.status' => 'nullable|string|in:pending,in_progress,completed,delayed',
            'items.*.execution_date' => 'nullable|date',
            'items.*.obstacle_notes' => 'nullable|string',
            'items.*.evidence_url' => 'nullable|string|max:500',
        ]);

        DB::beginTransaction();
        try {
            $report = RhpkReport::create([
                'title' => $validated['title'],
                'year' => $validated['year'],
                'period' => $validated['period'],
                'team_unit' => $validated['team_unit'] ?? 'Pokja BPOM',
                'created_by' => $request->user()->id,
                'status' => 'draft',
            ]);

            foreach ($validated['items'] as $itemData) {
                $target = (int) $itemData['target_volume'];
                $realization = (int) ($itemData['realization_volume'] ?? 0);
                $progress = $target > 0 ? round(($realization / $target) * 100, 2) : 0;
                $itemStatus = $itemData['status'] ?? ($progress >= 100 ? 'completed' : ($progress > 0 ? 'in_progress' : 'pending'));

                RhpkItem::create([
                    'rhpk_report_id' => $report->id,
                    'rhk_name' => $itemData['rhk_name'],
                    'indicator' => $itemData['indicator'],
                    'target_volume' => $target,
                    'unit' => $itemData['unit'] ?? 'Laporan',
                    'realization_volume' => $realization,
                    'progress_percentage' => $progress,
                    'status' => $itemStatus,
                    'execution_date' => $itemData['execution_date'] ?? null,
                    'obstacle_notes' => $itemData['obstacle_notes'] ?? null,
                    'evidence_url' => $itemData['evidence_url'] ?? null,
                ]);
            }

            $report->recalculateProgress();
            DB::commit();

            return response()->json([
                'message' => 'RHPK berhasil dibuat',
                'data' => $report->load(['creator', 'items']),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Gagal membuat RHPK: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Display the specified RHPK report.
     */
    public function show($id)
    {
        $report = RhpkReport::with(['creator:id,name,nip,email', 'reviewer:id,name,nip', 'items'])->findOrFail($id);
        return response()->json($report);
    }

    /**
     * Update the specified RHPK report.
     */
    public function update(Request $request, $id)
    {
        $report = RhpkReport::findOrFail($id);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'year' => 'required|integer|min:2020|max:2100',
            'period' => 'required|string|max:50',
            'team_unit' => 'nullable|string|max:100',
            'status' => 'nullable|string|in:draft,submitted,approved,revision,rejected',
            'items' => 'required|array|min:1',
            'items.*.rhk_name' => 'required|string|max:255',
            'items.*.indicator' => 'required|string|max:255',
            'items.*.target_volume' => 'required|integer|min:1',
            'items.*.unit' => 'nullable|string|max:50',
            'items.*.realization_volume' => 'nullable|integer|min:0',
            'items.*.status' => 'nullable|string|in:pending,in_progress,completed,delayed',
            'items.*.execution_date' => 'nullable|date',
            'items.*.obstacle_notes' => 'nullable|string',
            'items.*.evidence_url' => 'nullable|string|max:500',
        ]);

        DB::beginTransaction();
        try {
            $report->update([
                'title' => $validated['title'],
                'year' => $validated['year'],
                'period' => $validated['period'],
                'team_unit' => $validated['team_unit'] ?? $report->team_unit,
                'status' => $validated['status'] ?? $report->status,
            ]);

            // Re-sync items
            $report->items()->delete();
            foreach ($validated['items'] as $itemData) {
                $target = (int) $itemData['target_volume'];
                $realization = (int) ($itemData['realization_volume'] ?? 0);
                $progress = $target > 0 ? round(($realization / $target) * 100, 2) : 0;
                $itemStatus = $itemData['status'] ?? ($progress >= 100 ? 'completed' : ($progress > 0 ? 'in_progress' : 'pending'));

                RhpkItem::create([
                    'rhpk_report_id' => $report->id,
                    'rhk_name' => $itemData['rhk_name'],
                    'indicator' => $itemData['indicator'],
                    'target_volume' => $target,
                    'unit' => $itemData['unit'] ?? 'Laporan',
                    'realization_volume' => $realization,
                    'progress_percentage' => $progress,
                    'status' => $itemStatus,
                    'execution_date' => $itemData['execution_date'] ?? null,
                    'obstacle_notes' => $itemData['obstacle_notes'] ?? null,
                    'evidence_url' => $itemData['evidence_url'] ?? null,
                ]);
            }

            $report->recalculateProgress();
            DB::commit();

            return response()->json([
                'message' => 'RHPK berhasil diperbarui',
                'data' => $report->load(['creator', 'items']),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Gagal memperbarui RHPK: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Remove the specified RHPK report.
     */
    public function destroy($id)
    {
        $report = RhpkReport::findOrFail($id);
        $report->delete();
        return response()->json(['message' => 'RHPK berhasil dihapus']);
    }

    /**
     * Update review status (Approve / Reject / Revision).
     */
    public function updateStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:draft,submitted,approved,revision,rejected',
            'reviewer_notes' => 'nullable|string',
        ]);

        $report = RhpkReport::findOrFail($id);
        $report->update([
            'status' => $validated['status'],
            'reviewer_notes' => $validated['reviewer_notes'] ?? null,
            'reviewer_id' => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Status RHPK berhasil diperbarui',
            'data' => $report->load(['creator', 'reviewer', 'items']),
        ]);
    }

    /**
     * Get summary metrics for RHPK dashboard.
     */
    public function summary(Request $request)
    {
        $year = $request->input('year', date('Y'));
        $totalReports = RhpkReport::where('year', $year)->count();
        $approvedReports = RhpkReport::where('year', $year)->where('status', 'approved')->count();
        $submittedReports = RhpkReport::where('year', $year)->where('status', 'submitted')->count();
        $avgProgress = RhpkReport::where('year', $year)->avg('total_target_percentage') ?: 0;
        $totalDelayedItems = RhpkItem::whereHas('report', function ($q) use ($year) {
            $q->where('year', $year);
        })->where('status', 'delayed')->count();

        return response()->json([
            'year' => (int) $year,
            'total_reports' => $totalReports,
            'approved_reports' => $approvedReports,
            'submitted_reports' => $submittedReports,
            'avg_progress' => round($avgProgress, 2),
            'total_delayed_items' => $totalDelayedItems,
        ]);
    }
}
