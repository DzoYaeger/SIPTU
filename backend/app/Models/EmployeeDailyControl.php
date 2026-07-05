<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeDailyControl extends Model
{
    use HasFactory;
    
    protected $guarded = ['id'];

    protected $casts = [
        'violation_uniform' => 'boolean',
        'violation_assembly' => 'boolean',
        'violation_entry' => 'boolean',
        'violation_exit' => 'boolean',
        'violation_missed_checkin' => 'boolean',
        'violation_missed_checkout' => 'boolean',
        'date' => 'date',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}
