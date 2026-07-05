<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SuratTugasDocument extends Model
{
    protected $fillable = [
        'surat_tugas_id',
        'filename',
        'file_path',
        'template_used',
        'generated_by',
        'file_size',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'file_size'  => 'integer',
        ];
    }

    public function suratTugas()
    {
        return $this->belongsTo(SuratTugas::class);
    }

    public function generator()
    {
        return $this->belongsTo(User::class, 'generated_by');
    }

    /**
     * Scope: only documents that haven't expired yet.
     */
    public function scopeActive($query)
    {
        return $query->where('expires_at', '>', now());
    }
}
