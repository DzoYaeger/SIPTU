<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MedicalCheckupRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'request_number',
        'tahun_anggaran',
        'employee_id',
        'user_id',
        'nip',
        'employee_name',
        'department',
        'phone_number',
        'planned_date',
        'faskes_name',
        'total_amount',
        'balance_before',
        'balance_after',
        'status',
        'notes',
        'admin_notes',
        'approved_by',
        'approved_at',
        'completed_at',
        'result_file',
    ];

    protected $casts = [
        'tahun_anggaran' => 'integer',
        'planned_date' => 'date',
        'total_amount' => 'decimal:2',
        'balance_before' => 'decimal:2',
        'balance_after' => 'decimal:2',
        'approved_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function items()
    {
        return $this->hasMany(MedicalCheckupRequestItem::class, 'medical_checkup_request_id');
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
