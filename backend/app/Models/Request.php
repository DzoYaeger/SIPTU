<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Request extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'requests';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'request_number',
        'item_name',
        'quantity',
        'unit',
        'requester_id',
        'requester_name',
        'purpose',
        'status',
        'approval_notes',
        'requested_date',
        'approved_date',
        'fulfilled_date',
        'approved_by',
        'fulfilled_by',
        'created_by',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'requested_date' => 'date',
            'approved_date' => 'date',
            'fulfilled_date' => 'date',
        ];
    }

    /**
     * Relationship with Employee (requester)
     */
    public function requester()
    {
        return $this->belongsTo(Employee::class, 'requester_id');
    }

    /**
     * Relationship with User (creator)
     */
    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Relationship with User (approver)
     */
    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Relationship with User (fulfiller)
     */
    public function fulfilledBy()
    {
        return $this->belongsTo(User::class, 'fulfilled_by');
    }
}
