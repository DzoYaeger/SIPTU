<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PanjarRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'ticket_no',
        'panjar_no',
        'tahun_anggaran',
        'tanggal_pengajuan',
        'tanggal_mulai_kegiatan',
        'tanggal_akhir_kegiatan',
        'tanggal_paling_lambat',
        'mak',
        'kegiatan',
        'uraian',
        'penerima_name',
        'surat_tugas_no',
        'nominal_panjar',
        'terbilang_panjar',
        'status',
        'ppk_name',
        'ppk_nip',
        'bendahara_name',
        'bendahara_nip',
        'created_by',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'tahun_anggaran' => 'integer',
        'tanggal_pengajuan' => 'date',
        'tanggal_mulai_kegiatan' => 'date',
        'tanggal_akhir_kegiatan' => 'date',
        'tanggal_paling_lambat' => 'date',
        'nominal_panjar' => 'float',
        'approved_at' => 'datetime',
    ];

    public function items()
    {
        return $this->hasMany(PanjarRequestItem::class, 'panjar_request_id')->orderBy('sort_order', 'asc');
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