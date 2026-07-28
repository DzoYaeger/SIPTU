<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'ticket_no',
        'invoice_no',
        'tahun_anggaran',
        'mak',
        'deskripsi',
        'nilai_kotor',
        'total_pajak',
        'nilai_bersih',
        'terbilang_bersih',
        'status',
        'created_by',
        'approved_by',
        'approved_at',
        'ppk_name',
        'ppk_nip',
        'bendahara_name',
        'bendahara_nip',
        'penerima_name',
    ];

    protected $casts = [
        'nilai_kotor' => 'float',
        'total_pajak' => 'float',
        'nilai_bersih' => 'float',
        'tahun_anggaran' => 'integer',
        'approved_at' => 'datetime',
    ];

    public function taxes()
    {
        return $this->hasMany(InvoiceTax::class, 'invoice_id')->orderBy('sort_order', 'asc');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
