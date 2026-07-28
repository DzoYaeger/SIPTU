<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RevisionTicketAdjustment extends Model
{
    use HasFactory;

    protected $fillable = [
        'revision_ticket_id',
        'mak',
        'tipe',
        'nilai',
    ];

    protected $casts = [
        'nilai' => 'float',
    ];

    public function revisionTicket()
    {
        return $this->belongsTo(RevisionTicket::class, 'revision_ticket_id');
    }
}
