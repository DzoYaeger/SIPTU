<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RhpkExplanationIndicator extends Model
{
    use HasFactory;

    protected $fillable = [
        'year',
        'code_indicator',
        'indicator_name',
        'target_indicator',
        'created_by',
    ];

    protected $casts = [
        'year' => 'integer',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function explanations()
    {
        return $this->hasMany(RhpkExplanation::class, 'rhpk_explanation_indicator_id');
    }
}
