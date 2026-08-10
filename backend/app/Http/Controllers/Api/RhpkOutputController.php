<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RhpkOutputRealization;
use App\Models\RhpkOutputTarget;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RhpkOutputController extends Controller
{
    /**
     * Get list of Rincian Output Targets along with realizations for a specific year.
     */
    public function index(Request $request)
    {
        $year = $request->input('year', date('Y'));
        $search = $request->input('search');

        $query = RhpkOutputTarget::with(['realizations.user:id,name,nip'])
            ->where('year', $year);

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('output_name', 'like', "%{$search}%")
                  ->orWhere('code_output', 'like', "%{$search}%");
            });
        }

        $targets = $query->orderBy('created_at', 'asc')->get();

        // Calculate summary for each target
        $data = $targets->map(function ($t) {
            $realizations = $t->realizations;
            $sumRealization = round((float) $realizations->sum('realization_value'), 4);
            $targetValue = (float) ($t->revised_target ?: $t->initial_target ?: 1);
            $achievementPercent = $targetValue > 0 ? round(($sumRealization / $targetValue) * 100, 2) : 0;

            // Group realizations by month
            $monthlyRealizations = [];
            for ($m = 1; $m <= 12; $m++) {
                $monthlyRealizations[$m] = round((float) $realizations->where('month', $m)->sum('realization_value'), 4);
            }

            return [
                'id' => $t->id,
                'year' => $t->year,
                'code_output' => $t->code_output,
                'output_name' => $t->output_name,
                'budget_pagu' => $t->budget_pagu,
                'initial_target' => round((float) $t->initial_target, 4),
                'revised_target' => round((float) $t->revised_target, 4),
                'unit' => $t->unit,
                'monthly_targets' => $t->monthly_targets,
                'monthly_realizations' => $monthlyRealizations,
                'sum_realization' => $sumRealization,
                'achievement_percent' => $achievementPercent,
                'realizations_detail' => $realizations,
            ];
        });

        return response()->json([
            'year' => (int) $year,
            'data' => $data,
        ]);
    }

    /**
     * Store master Rincian Output Target (Admin Only).
     */
    public function storeTarget(Request $request)
    {
        $validated = $request->validate([
            'year' => 'required|integer|min:2020|max:2100',
            'code_output' => 'nullable|string|max:100',
            'output_name' => 'required|string',
            'budget_pagu' => 'nullable|numeric|min:0',
            'initial_target' => 'required|numeric|min:0',
            'revised_target' => 'required|numeric|min:0',
            'unit' => 'nullable|string|max:50',
            'target_jan' => 'nullable|numeric|min:0',
            'target_feb' => 'nullable|numeric|min:0',
            'target_mar' => 'nullable|numeric|min:0',
            'target_apr' => 'nullable|numeric|min:0',
            'target_may' => 'nullable|numeric|min:0',
            'target_jun' => 'nullable|numeric|min:0',
            'target_jul' => 'nullable|numeric|min:0',
            'target_aug' => 'nullable|numeric|min:0',
            'target_sep' => 'nullable|numeric|min:0',
            'target_oct' => 'nullable|numeric|min:0',
            'target_nov' => 'nullable|numeric|min:0',
            'target_dec' => 'nullable|numeric|min:0',
        ]);

        $target = RhpkOutputTarget::create(array_merge($validated, [
            'created_by' => $request->user()->id,
            'unit' => $validated['unit'] ?? 'Laporan',
        ]));

        return response()->json([
            'message' => 'Master Target Rincian Output berhasil disimpan',
            'data' => $target,
        ], 201);
    }

    /**
     * Update master Rincian Output Target (Admin Only).
     */
    public function updateTarget(Request $request, $id)
    {
        $target = RhpkOutputTarget::findOrFail($id);

        $validated = $request->validate([
            'year' => 'required|integer|min:2020|max:2100',
            'code_output' => 'nullable|string|max:100',
            'output_name' => 'required|string',
            'budget_pagu' => 'nullable|numeric|min:0',
            'initial_target' => 'required|numeric|min:0',
            'revised_target' => 'required|numeric|min:0',
            'unit' => 'nullable|string|max:50',
            'target_jan' => 'nullable|numeric|min:0',
            'target_feb' => 'nullable|numeric|min:0',
            'target_mar' => 'nullable|numeric|min:0',
            'target_apr' => 'nullable|numeric|min:0',
            'target_may' => 'nullable|numeric|min:0',
            'target_jun' => 'nullable|numeric|min:0',
            'target_jul' => 'nullable|numeric|min:0',
            'target_aug' => 'nullable|numeric|min:0',
            'target_sep' => 'nullable|numeric|min:0',
            'target_oct' => 'nullable|numeric|min:0',
            'target_nov' => 'nullable|numeric|min:0',
            'target_dec' => 'nullable|numeric|min:0',
        ]);

        $target->update($validated);

        return response()->json([
            'message' => 'Master Target Rincian Output berhasil diperbarui',
            'data' => $target,
        ]);
    }

    /**
     * Delete master Rincian Output Target (Admin Only).
     */
    public function destroyTarget($id)
    {
        $target = RhpkOutputTarget::findOrFail($id);
        $target->delete();

        return response()->json(['message' => 'Master Target Rincian Output berhasil dihapus']);
    }

    /**
     * Submit / Update Monthly Realization (User / Pegawai).
     */
    public function saveRealization(Request $request)
    {
        $validated = $request->validate([
            'rhpk_output_target_id' => 'required|exists:rhpk_output_targets,id',
            'month' => 'required|integer|min:1|max:12',
            'realization_value' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $realization = RhpkOutputRealization::updateOrCreate(
            [
                'rhpk_output_target_id' => $validated['rhpk_output_target_id'],
                'user_id' => $request->user()->id,
                'month' => $validated['month'],
            ],
            [
                'realization_value' => $validated['realization_value'],
                'notes' => $validated['notes'] ?? null,
            ]
        );

        return response()->json([
            'message' => 'Realisasi bulanan berhasil disimpan',
            'data' => $realization,
        ]);
    }
}
