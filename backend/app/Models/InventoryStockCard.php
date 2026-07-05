<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryStockCard extends Model
{
    //
    protected $fillable = [
        'inventory_id',
        'type',
        'source',
        'quantity',
        'stock_before',
        'stock_after',
        'transaction_date',
        'reference_number',
        'notes',
        'created_by',
        'created_by_name',
    ];

    protected $casts = [
        'transaction_date' => 'date',
    ];

    public function inventory()
    {
        return $this->belongsTo(Inventory::class, 'inventory_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
