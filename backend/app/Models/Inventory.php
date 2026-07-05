<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Inventory extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'code',
        'name',
        'category',
        'quantity',
        'unit',
        'location',
        'price_per_unit',
        'last_updated',
        'description',
        'status',
        'updated_by',
    ];

    public function stockCards()
    {
        return $this->hasMany(InventoryStockCard::class, 'inventory_id');
    }

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'price_per_unit' => 'decimal:2',
            'last_updated' => 'date',
        ];
    }

    /**
     * Relationship with User (updater)
     */
    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
