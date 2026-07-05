<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProcurementProposal extends Model
{
    protected $fillable = [
        'item_name',
        'brand',
        'satuan',
        'jumlah',
        'status',
        'converted_pdtt_item_id',
        'converted_at',
        'created_by',
        'updated_by',
        'editing_by',
        'editing_heartbeat_at',
    ];

    protected function casts(): array
    {
        return [
            'editing_heartbeat_at' => 'datetime',
            'converted_at' => 'datetime',
        ];
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function editor()
    {
        return $this->belongsTo(User::class, 'editing_by');
    }

    public function convertedPdttItem()
    {
        return $this->belongsTo(PdttItem::class, 'converted_pdtt_item_id');
    }
}
