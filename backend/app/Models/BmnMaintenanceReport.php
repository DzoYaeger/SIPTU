<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BmnMaintenanceReport extends Model
{
    protected $fillable = [
        'report_number',
        'report_type',
        'asset_id',
        'asset_name',
        'asset_ids',
        'assets_data',
        'report_details',
        'status',
        'admin_notes',
        'reporter_id',
        'reporter_nip',
        'reporter_name',
        'reporter_function',
        'reporter_phone',
        'handled_by',
        'handled_at',
        'created_by',
    ];

    protected $casts = [
        'asset_ids' => 'array',
        'assets_data' => 'array',
        'handled_at' => 'datetime',
    ];

    public function asset()
    {
        return $this->belongsTo(Asset::class, 'asset_id');
    }

    public function reporter()
    {
        return $this->belongsTo(Employee::class, 'reporter_id');
    }

    public function handler()
    {
        return $this->belongsTo(User::class, 'handled_by');
    }
}

