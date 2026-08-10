<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RhpkExplanation extends Model
{
    use HasFactory;

    protected $fillable = [
        'rhpk_explanation_indicator_id',
        'user_id',
        'year',
        'month',
        'target_volume',
        'realization_volume',
        'achievement_percent',
        'explanation_notes',
        'supporting_factors',
        'inhibiting_factors',
        'success_analysis',
        'recommendations',
        'follow_up_action',
        'analysis_timeline',
        'is_risk_identified',
        'risk_code',
        'risk_event',
        'prev_inhibiting_factors',
        'prev_recommendations',
        'prev_follow_up_action',
        'prev_status',
        'prev_progress_tl',
        'prev_timeline',
        'evidence_url',
        'status',
        'reviewer_notes',
        'reviewer_id',
    ];

    protected $casts = [
        'year' => 'integer',
        'month' => 'integer',
    ];

    public function indicator()
    {
        return $this->belongsTo(RhpkExplanationIndicator::class, 'rhpk_explanation_indicator_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }
}
