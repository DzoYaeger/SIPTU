<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InvoiceTax extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_id',
        'jenis_pajak',
        'tax_type',
        'tax_rate',
        'nilai_pajak',
        'sort_order',
    ];

    protected $casts = [
        'tax_rate' => 'float',
        'nilai_pajak' => 'float',
        'sort_order' => 'integer',
    ];

    public function invoice()
    {
        return $this->belongsTo(Invoice::class, 'invoice_id');
    }
}
