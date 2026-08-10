<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Budget extends Model
{
    use HasFactory;

    protected $fillable = [
        'mak',
        'deskripsi',
        'anggaran',
    ];

    protected $casts = [
        'anggaran' => 'float',
    ];

    protected $appends = [
        'segments',
        'program',
        'kro',
        'ro',
        'komponen',
        'subkomponen',
        'akun',
    ];

    public function history()
    {
        return $this->hasMany(BudgetHistory::class, 'budget_id')->orderBy('tanggal', 'desc');
    }

    /**
     * Memecah kode MAK (3165.BKB.053.001.A.524111) menjadi 6 segmen APBN.
     */
    public function getSegmentsAttribute(): array
    {
        $parts = explode('.', $this->mak ?? '');
        return [
            'program'     => trim($parts[0] ?? ''),
            'kro'         => trim($parts[1] ?? ''),
            'ro'          => trim($parts[2] ?? ''),
            'komponen'    => trim($parts[3] ?? ''),
            'subkomponen' => trim($parts[4] ?? ''),
            'akun'        => trim($parts[5] ?? ''),
        ];
    }

    public function getProgramAttribute(): string
    {
        return $this->segments['program'];
    }

    public function getKroAttribute(): string
    {
        return $this->segments['kro'];
    }

    public function getRoAttribute(): string
    {
        return $this->segments['ro'];
    }

    public function getKomponenAttribute(): string
    {
        return $this->segments['komponen'];
    }

    public function getSubkomponenAttribute(): string
    {
        return $this->segments['subkomponen'];
    }

    public function getAkunAttribute(): string
    {
        return $this->segments['akun'];
    }
}
