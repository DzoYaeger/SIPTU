<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BudgetHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'budget_id',
        'tanggal',
        'keterangan',
        'perubahan',
        'status',
        'revision_ticket_id',
    ];

    protected $casts = [
        'perubahan' => 'float',
        'tanggal' => 'datetime',
    ];

    public function budget()
    {
        return $this->belongsTo(Budget::class, 'budget_id');
    }

    public function revisionTicket()
    {
        return $this->belongsTo(RevisionTicket::class, 'revision_ticket_id');
    }
}
