<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ArchiveLoan extends Model
{
    protected $fillable = [
        'request_number',
        'borrow_date',
        'borrower_name',
        'borrower_nip',
        'borrower_work_unit',
        'archive_unit_id',
        'archive_number',
        'archive_format',
        'document_type',
        'purpose',
        'borrower_signature',
        'return_signature',
        'borrower_signed_at',
        'admin_signed_at',
        'return_borrower_signed_at',
        'return_admin_signed_at',
        'signature_token',
        'return_requested_at',
        'approved_at',
        'approved_by',
        'return_approved_by',
        'status',
        'public_token',
        'return_token',
        'return_date',
    ];

    protected $casts = [
        'borrow_date' => 'date',
        'return_date' => 'date',
        'return_requested_at' => 'datetime',
        'approved_at' => 'datetime',
        'borrower_signed_at' => 'datetime',
        'admin_signed_at' => 'datetime',
        'return_borrower_signed_at' => 'datetime',
        'return_admin_signed_at' => 'datetime',
    ];

    public function unitPengolah()
    {
        return $this->belongsTo(ArchiveUnit::class, 'archive_unit_id');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function returnApprovedBy()
    {
        return $this->belongsTo(User::class, 'return_approved_by');
    }
}
