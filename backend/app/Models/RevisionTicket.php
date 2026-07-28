<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RevisionTicket extends Model
{
    use HasFactory;

    protected $fillable = [
        'ticket_no',
        'tanggal_ticket',
        'status',
        'catatan',
        'created_by',
        'tanggal_diproses',
        'tanggal_selesai',
    ];

    protected $casts = [
        'tanggal_ticket' => 'datetime',
        'tanggal_diproses' => 'datetime',
        'tanggal_selesai' => 'datetime',
    ];

    public function adjustments()
    {
        return $this->hasMany(RevisionTicketAdjustment::class, 'revision_ticket_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
