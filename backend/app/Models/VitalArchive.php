<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class VitalArchive extends Model
{
    use HasFactory;

    protected $fillable = [
        'jenis_arsip',
        'archive_unit_id',
        'kurun_waktu',
        'media',
        'jumlah',
        'jangka_simpan',
        'metode_perlindungan',
        'lokasi_simpan',
    ];

    public function archiveUnit()
    {
        return $this->belongsTo(ArchiveUnit::class);
    }
}
