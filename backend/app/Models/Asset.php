<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Asset extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'category',
        'quantity',
        'location',
        'status',
        'asset_code',
        'brand',
        'model',
        'year_of_purchase',
        'purchase_price',
        'description',
        'specifications',
        'condition',
        'warranty_expiry',
        'created_by',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'purchase_price' => 'decimal:2',
            'warranty_expiry' => 'date',
            'year_of_purchase' => 'integer',
            'specifications' => 'array',
        ];
    }

    /**
     * Relationship with User (creator)
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Relationship with Loans
     */
    public function loans()
    {
        return $this->hasMany(Loan::class, 'asset_id');
    }
}
