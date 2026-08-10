<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RhpkItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'rhpk_report_id',
        'rhk_name',
        'indicator',
        'target_volume',
        'unit',
        'realization_volume',
        'progress_percentage',
        'status',
        'execution_date',
        'obstacle_notes',
        'evidence_url',
    ];

    protected $casts = [
        'target_volume' => 'integer',
        'realization_volume' => 'integer',
        'progress_percentage' => 'float',
        'execution_date' => 'date',
    ];

    public function report()
    {
        return $this->belongsTo(RhpkReport::class, 'rhpk_report_id');
    }
}
