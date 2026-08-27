<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class PanjarRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'ticket_no',
        'token',
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
        'requester_phone',
        'surat_tugas_no',
        'nominal_panjar',
        'terbilang_panjar',
        'status',
        'ppk_status',
        'ppk_notes',
        'ppk_action_at',
        'ppk_user_id',
        'bendahara_status',
        'bendahara_notes',
        'bendahara_action_at',
        'bendahara_user_id',
        'rejection_stage',
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
        'ppk_action_at' => 'datetime',
        'bendahara_action_at' => 'datetime',
    ];

    protected static function booted()
    {
        static::creating(function ($panjar) {
            if (empty($panjar->token)) {
                $panjar->token = Str::random(40);
            }
        });
    }

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

    public function ppkUser()
    {
        return $this->belongsTo(User::class, 'ppk_user_id');
    }

    public function bendaharaUser()
    {
        return $this->belongsTo(User::class, 'bendahara_user_id');
    }
}