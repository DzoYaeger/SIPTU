<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SuratTugas extends Model
{
    protected $table = 'surat_tugas';

    protected $fillable = [
        'tanggal_mulai',
        'tanggal_selesai',
        'mak',
        'lokasi_tugas',
        'deskripsi_tugas',
        'sarana_id',
        'sarana_nama',
        'sarana_lokasi',
        'nomor_st',
        'tanggal_st',
        'penandatangan_id',
        'status_jabatan',
        'template_file',
        'status',
        'created_by',
        'ketua_tim_id',
        'external_participants',
        'signature_token',
        'signed_at',
        'signed_by',
        'signed_kepala_at',
        'signed_kepala_by',
    ];

    protected function casts(): array
    {
        return [
            'tanggal_mulai' => 'date',
            'tanggal_selesai' => 'date',
            'tanggal_st' => 'date',
            'external_participants' => 'array',
            'signed_at' => 'datetime',
            'signed_kepala_at' => 'datetime',
        ];
    }

    public function employees()
    {
        return $this->belongsToMany(Employee::class, 'surat_tugas_employees')
                    ->withPivot('sort_order')
                    ->orderBy('surat_tugas_employees.sort_order', 'asc');
    }

    public function ketuaTim()
    {
        return $this->belongsTo(Employee::class, 'ketua_tim_id');
    }

    public function penandatangan()
    {
        return $this->belongsTo(Employee::class, 'penandatangan_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function documents()
    {
        return $this->hasMany(SuratTugasDocument::class);
    }

    public function signedBy()
    {
        return $this->belongsTo(User::class, 'signed_by');
    }

    public function signedKepalaBy()
    {
        return $this->belongsTo(User::class, 'signed_kepala_by');
    }
}
