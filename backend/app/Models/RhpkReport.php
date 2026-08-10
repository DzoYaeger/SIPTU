<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RhpkReport extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'year',
        'period',
        'team_unit',
        'created_by',
        'reviewer_id',
        'status',
        'reviewer_notes',
        'total_target_percentage',
    ];

    protected $casts = [
        'year' => 'integer',
        'total_target_percentage' => 'float',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }

    public function items()
    {
        return $this->hasMany(RhpkItem::class, 'rhpk_report_id');
    }

    public function recalculateProgress()
    {
        $totalItems = $this->items()->count();
        if ($totalItems === 0) {
            $this->total_target_percentage = 0.00;
        } else {
            $sumPercentage = $this->items()->sum('progress_percentage');
            $this->total_target_percentage = round($sumPercentage / $totalItems, 2);
        }
        $this->save();
    }
}
