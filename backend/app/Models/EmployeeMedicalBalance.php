<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeMedicalBalance extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'nip',
        'employee_name',
        'tahun_anggaran',
        'initial_balance',
        'used_balance',
        'current_balance',
        'notes',
    ];

    protected $casts = [
        'tahun_anggaran' => 'integer',
        'initial_balance' => 'decimal:2',
        'used_balance' => 'decimal:2',
        'current_balance' => 'decimal:2',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }
}
