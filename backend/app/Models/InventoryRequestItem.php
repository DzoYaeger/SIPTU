<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryRequestItem extends Model
{
    protected $fillable = [
        'inventory_request_id',
        'inventory_id',
        'item_name',
        'unit',
        'qty_requested',
        'qty_approved',
    ];

    public function request()
    {
        return $this->belongsTo(InventoryRequest::class, 'inventory_request_id');
    }

    public function inventory()
    {
        return $this->belongsTo(Inventory::class, 'inventory_id');
    }
}
