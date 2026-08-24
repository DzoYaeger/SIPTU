<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MedicalCheckupPackage extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'category',
        'price',
        'description',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];
}
