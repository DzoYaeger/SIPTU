<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryRequest extends Model
{
    protected $fillable = [
        'spb_number',
        'sbbk_number',
        'token',
        'requester_id',
        'requester_nip',
        'requester_name',
        'requester_function',
        'requester_phone',
        'purpose',
        'requester_signature',
        'status',
        'approved_by',
        'approved_at',
        'approval_notes',
    ];

    protected function casts(): array
    {
        return [
            'approved_at' => 'datetime',
        ];
    }

    public function items()
    {
        return $this->hasMany(InventoryRequestItem::class);
    }

    public function requester()
    {
        return $this->belongsTo(Employee::class, 'requester_id');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
