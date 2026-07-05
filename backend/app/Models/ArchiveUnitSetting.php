<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ArchiveUnitSetting extends Model
{
    protected $fillable = [
        'unit_keasipan_employee_id',
        'unit_keasipan_employee_ids',
    ];

    public function unitKearsipan()
    {
        return $this->belongsTo(Employee::class, 'unit_keasipan_employee_id');
    }

    protected function casts(): array
    {
        return [
            'unit_keasipan_employee_ids' => 'array',
        ];
    }
}
