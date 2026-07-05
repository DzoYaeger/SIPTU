<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PdttItem extends Model
{
    protected $fillable = [
        'item_name',
        'brand',
        'satuan',
        'jumlah',
        'created_by',
        'is_requestable',
    ];

    protected $casts = [
        'is_requestable' => 'boolean',
    ];

    public function prices()
    {
        return $this->hasMany(PdttItemPrice::class, 'pdtt_item_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

