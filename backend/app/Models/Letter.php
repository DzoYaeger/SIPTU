<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Letter extends Model
{
    use HasFactory;

    protected $fillable = [
        'type',
        'archive_unit_id',
        'nomor_surat',
        'hal',
        'tanggal_surat',
        'instansi_pengirim',
        'penerima',
        'tanggal_terima',
        'file_surat',
        'tujuan',
        'pengirim',
        'tanggal_kirim',
        'bukti_kirim',
    ];

    protected $casts = [
        'tanggal_surat'  => 'date',
        'tanggal_terima' => 'date',
        'tanggal_kirim'  => 'date',
    ];
}
