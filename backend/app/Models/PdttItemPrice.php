<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PdttItemPrice extends Model
{
    protected $fillable = [
        'pdtt_item_id',
        'period_start',
        'price',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'period_start' => 'date',
            'price' => 'decimal:2',
        ];
    }

    public function item()
    {
        return $this->belongsTo(PdttItem::class, 'pdtt_item_id');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}

