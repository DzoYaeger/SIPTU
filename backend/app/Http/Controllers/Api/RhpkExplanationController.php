<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RhpkExplanation;
use App\Models\RhpkExplanationIndicator;
use Illuminate\Http\Request;

class RhpkExplanationController extends Controller
{
    /**
     * Get list of Indicators along with User Explanations for a specific year and month.
     */
    public function index(Request $request)
    {
        $year = $request->input('year', date('Y'));
        $month = $request->input('month');
        $search = $request->input('search');

        $query = RhpkExplanationIndicator::with(['explanations' => function ($q) use ($month) {
            if ($month) {
                $q->where('month', $month);
            }
            $q->with(['user:id,name,nip', 'reviewer:id,name,nip']);
        }])->where('year', $year);

        if ($search) {
            $query->where('indicator_name', 'like', "%{$search}%");
        }

        $indicators = $query->orderBy('created_at', 'asc')->get();

        return response()->json([
            'year' => (int) $year,
            'month' => $month ? (int) $month : null,
            'data' => $indicators,
        ]);
    }

    /**
     * Store master Indicator (Admin Only).
     */
    public function storeIndicator(Request $request)
    {
        $validated = $request->validate([
            'year' => 'required|integer|min:2020|max:2100',
            'code_indicator' => 'nullable|string|max:100',
            'indicator_name' => 'required|string',
            'target_indicator' => 'nullable|string|max:100',
        ]);

        $indicator = RhpkExplanationIndicator::create(array_merge($validated, [
            'created_by' => $request->user()->id,
        ]));

        return response()->json([
            'message' => 'Master Indikator berhasil disimpan',
            'data' => $indicator,
        ], 201);
    }

    /**
     * Update master Indicator (Admin Only).
     */
    public function updateIndicator(Request $request, $id)
    {
        $indicator = RhpkExplanationIndicator::findOrFail($id);

        $validated = $request->validate([
            'year' => 'required|integer|min:2020|max:2100',
            'code_indicator' => 'nullable|string|max:100',
            'indicator_name' => 'required|string',
            'target_indicator' => 'nullable|string|max:100',
        ]);

        $indicator->update($validated);

        return response()->json([
            'message' => 'Master Indikator berhasil diperbarui',
            'data' => $indicator,
        ]);
    }

    /**
     * Delete master Indicator (Admin Only).
     */
    public function destroyIndicator($id)
    {
        $indicator = RhpkExplanationIndicator::findOrFail($id);
        $indicator->delete();

        return response()->json(['message' => 'Master Indikator berhasil dihapus']);
    }

    /**
     * Save / Submit Explanation Narration (User / Pegawai).
     */
    public function saveExplanation(Request $request)
    {
        $validated = $request->validate([
            'rhpk_explanation_indicator_id' => 'required|exists:rhpk_explanation_indicators,id',
            'year' => 'required|integer|min:2020|max:2100',
            'month' => 'required|integer|min:1|max:12',
            'target_volume' => 'nullable|string|max:100',
            'realization_volume' => 'nullable|string|max:100',
            'achievement_percent' => 'nullable|string|max:100',
            'explanation_notes' => 'nullable|string',
            'supporting_factors' => 'nullable|string',
            'inhibiting_factors' => 'nullable|string',
            'success_analysis' => 'nullable|string',
            'recommendations' => 'nullable|string',
            'follow_up_action' => 'nullable|string',
            'analysis_timeline' => 'nullable|string',
            'is_risk_identified' => 'nullable|string|max:10',
            'risk_code' => 'nullable|string|max:100',
            'risk_event' => 'nullable|string',
            'prev_inhibiting_factors' => 'nullable|string',
            'prev_recommendations' => 'nullable|string',
            'prev_follow_up_action' => 'nullable|string',
            'prev_status' => 'nullable|string|max:100',
            'prev_progress_tl' => 'nullable|string',
            'prev_timeline' => 'nullable|string',
            'evidence_url' => 'nullable|string|max:500',
            'status' => 'nullable|string|in:draft,submitted',
        ]);

        $explanation = RhpkExplanation::updateOrCreate(
            [
                'rhpk_explanation_indicator_id' => $validated['rhpk_explanation_indicator_id'],
                'user_id' => $request->user()->id,
                'year' => $validated['year'],
                'month' => $validated['month'],
            ],
            [
                'target_volume' => $validated['target_volume'] ?? null,
                'realization_volume' => $validated['realization_volume'] ?? null,
                'achievement_percent' => $validated['achievement_percent'] ?? null,
                'explanation_notes' => $validated['explanation_notes'] ?? null,
                'supporting_factors' => $validated['supporting_factors'] ?? null,
                'inhibiting_factors' => $validated['inhibiting_factors'] ?? null,
                'success_analysis' => $validated['success_analysis'] ?? null,
                'recommendations' => $validated['recommendations'] ?? null,
                'follow_up_action' => $validated['follow_up_action'] ?? null,
                'analysis_timeline' => $validated['analysis_timeline'] ?? null,
                'is_risk_identified' => $validated['is_risk_identified'] ?? 'T',
                'risk_code' => $validated['risk_code'] ?? null,
                'risk_event' => $validated['risk_event'] ?? null,
                'prev_inhibiting_factors' => $validated['prev_inhibiting_factors'] ?? null,
                'prev_recommendations' => $validated['prev_recommendations'] ?? null,
                'prev_follow_up_action' => $validated['prev_follow_up_action'] ?? null,
                'prev_status' => $validated['prev_status'] ?? null,
                'prev_progress_tl' => $validated['prev_progress_tl'] ?? null,
                'prev_timeline' => $validated['prev_timeline'] ?? null,
                'evidence_url' => $validated['evidence_url'] ?? null,
                'status' => $validated['status'] ?? 'submitted',
            ]
        );

        return response()->json([
            'message' => 'Penjelasan capaian berhasil disimpan',
            'data' => $explanation,
        ]);
    }

    /**
     * Review Explanation Status (Admin / Validator).
     */
    public function reviewExplanation(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:draft,submitted,approved,revision,rejected',
            'reviewer_notes' => 'nullable|string',
        ]);

        $explanation = RhpkExplanation::findOrFail($id);
        $explanation->update([
            'status' => $validated['status'],
            'reviewer_notes' => $validated['reviewer_notes'] ?? null,
            'reviewer_id' => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Verifikasi Penjelasan Capaian berhasil diperbarui',
            'data' => $explanation,
        ]);
    }
}
