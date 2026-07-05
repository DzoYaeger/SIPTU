<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Loan extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'loan_number',
        'asset_id',
        'asset_name',
        'borrower_id',
        'borrower_name',
        'loan_date',
        'due_date',
        'return_date',
        'status',
        'purpose',
        'notes',
        'loan_officer',
        'approver',
        'signatures',
        'created_by',
        'approved_by',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'loan_date' => 'date',
            'due_date' => 'date',
            'return_date' => 'date',
            'signatures' => 'array',
        ];
    }

    /**
     * Relationship with Asset
     */
    public function asset()
    {
        return $this->belongsTo(Asset::class);
    }

    /**
     * Relationship with Employee (borrower)
     */
    public function borrower()
    {
        return $this->belongsTo(Employee::class, 'borrower_id');
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
}
