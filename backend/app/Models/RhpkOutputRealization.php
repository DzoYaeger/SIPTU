<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RhpkOutputRealization extends Model
{
    use HasFactory;

    protected $fillable = [
        'rhpk_output_target_id',
        'user_id',
        'month',
        'realization_value',
        'notes',
    ];

    protected $casts = [
        'month' => 'integer',
        'realization_value' => 'float',
    ];

    public function target()
    {
        return $this->belongsTo(RhpkOutputTarget::class, 'rhpk_output_target_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
