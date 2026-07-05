<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ItHelpdeskTicket extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'ticket_number',
        'employee_id',
        'employee_nip',
        'employee_name',
        'function_area',
        'report_type',
        'problem_details',
        'report_date',
        'reporter_signature',
        'reporter_signature_token',
        'reporter_signed_at',
        'status',
        'followup_details',
        'completion_date',
        'it_staff_signature',
        'it_staff_signature_token',
        'it_staff_signed_at',
        'it_staff_id',
        'created_by',
        'is_auto_resolved',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'report_date' => 'date',
            'completion_date' => 'date',
            'reporter_signed_at' => 'datetime',
            'it_staff_signed_at' => 'datetime',
            'it_staff_signature' => 'array',
            'is_auto_resolved' => 'boolean',
        ];
    }

    /**
     * Relationship with Employee
     */
    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    /**
     * Relationship with User (IT staff)
     */
    public function itStaff()
    {
        return $this->belongsTo(User::class, 'it_staff_id');
    }

    /**
     * Relationship with User (creator)
     */
    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
