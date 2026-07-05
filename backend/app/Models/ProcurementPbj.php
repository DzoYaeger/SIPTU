<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProcurementPbj extends Model
{
    use HasFactory;

    protected $table = 'procurement_pbjs';

    protected $fillable = [
        'nama_pengadaan',
        'jenis_pengadaan',
        'nama_penyedia',
        'tanggal_pengadaan',
        'no_kontrak',
        'nominal',
        'tanggal_kirim',
        'tanggal_sampai',
        'no_bast',
        'tanggal_bast',
        'status_barang',
    ];

    protected $casts = [
        'tanggal_pengadaan' => 'date',
        'tanggal_kirim' => 'date',
        'tanggal_sampai' => 'date',
        'tanggal_bast' => 'date',
        'nominal' => 'decimal:2',
    ];
}
