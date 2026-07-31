<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmployeeTraining extends Model
{
    protected $fillable = [
        'no_undangan',
        'nama',
        'nip',
        'fungsi',
        'jenis_pelatihan',
        'judul_pelatihan',
        'tanggal_pelatihan',
        'tempat_pelatihan',
        'narasumber',
        'jumlah_peserta',
        'pre_test',
        'post_test',
        'peningkatan_nilai',
        'kepuasan_peserta',
        'dokumentasi',
        'hasil_evaluasi',
        'keterangan',
        'progress',
        'ceklis_diseminasi',
        'akan_diseminasi',
        'raw_hash',
        'synced_at',
    ];

    protected $casts = [
        'ceklis_diseminasi' => 'boolean',
        'akan_diseminasi' => 'boolean',
        'synced_at' => 'datetime',
    ];

    /**
     * Optional relationship to Employee model via NIP
     */
    public function employee()
    {
        return $this->belongsTo(Employee::class, 'nip', 'nip');
    }
}
