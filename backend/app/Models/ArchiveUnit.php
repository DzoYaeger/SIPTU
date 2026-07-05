<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ArchiveUnit extends Model
{
    protected $fillable = [
        'fungsi_bidang',
        'unit_pengolah_employee_id',
        'unit_pengolah_employee_ids',
    ];

    public function unitPengolah()
    {
        return $this->belongsTo(Employee::class, 'unit_pengolah_employee_id');
    }

    protected function casts(): array
    {
        return [
            'unit_pengolah_employee_ids' => 'array',
        ];
    }
}
