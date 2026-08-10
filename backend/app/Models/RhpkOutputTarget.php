<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RhpkOutputTarget extends Model
{
    use HasFactory;

    protected $fillable = [
        'year',
        'code_output',
        'output_name',
        'budget_pagu',
        'initial_target',
        'revised_target',
        'unit',
        'target_jan',
        'target_feb',
        'target_mar',
        'target_apr',
        'target_may',
        'target_jun',
        'target_jul',
        'target_aug',
        'target_sep',
        'target_oct',
        'target_nov',
        'target_dec',
        'created_by',
    ];

    protected $casts = [
        'year' => 'integer',
        'budget_pagu' => 'float',
        'initial_target' => 'float',
        'revised_target' => 'float',
        'target_jan' => 'float',
        'target_feb' => 'float',
        'target_mar' => 'float',
        'target_apr' => 'float',
        'target_may' => 'float',
        'target_jun' => 'float',
        'target_jul' => 'float',
        'target_aug' => 'float',
        'target_sep' => 'float',
        'target_oct' => 'float',
        'target_nov' => 'float',
        'target_dec' => 'float',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function realizations()
    {
        return $this->hasMany(RhpkOutputRealization::class, 'rhpk_output_target_id');
    }

    public function getMonthlyTargetsAttribute()
    {
        return [
            1 => round((float) $this->target_jan, 4),
            2 => round((float) $this->target_feb, 4),
            3 => round((float) $this->target_mar, 4),
            4 => round((float) $this->target_apr, 4),
            5 => round((float) $this->target_may, 4),
            6 => round((float) $this->target_jun, 4),
            7 => round((float) $this->target_jul, 4),
            8 => round((float) $this->target_aug, 4),
            9 => round((float) $this->target_sep, 4),
            10 => round((float) $this->target_oct, 4),
            11 => round((float) $this->target_nov, 4),
            12 => round((float) $this->target_dec, 4),
        ];
    }
}
