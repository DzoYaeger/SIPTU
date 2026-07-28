<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Budget extends Model
{
    use HasFactory;

    protected $fillable = [
        'mak',
        'deskripsi',
        'anggaran',
    ];

    protected $casts = [
        'anggaran' => 'float',
    ];

    public function history()
    {
        return $this->hasMany(BudgetHistory::class, 'budget_id')->orderBy('tanggal', 'desc');
    }
}
