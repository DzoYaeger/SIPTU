<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KkpHeader extends Model
{
    protected $table = 'kkp_headers';

    protected $fillable = [
        'surat_tugas_id',
        'status',
        'keterangan',
        'created_by',
        'bendahara_id',
    ];

    public function bendahara()
    {
        return $this->belongsTo(Employee::class, 'bendahara_id');
    }

    public function suratTugas()
    {
        return $this->belongsTo(SuratTugas::class, 'surat_tugas_id');
    }

    public function items()
    {
        return $this->hasMany(KkpItem::class, 'kkp_header_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
