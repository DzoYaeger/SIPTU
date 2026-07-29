<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProcurementRequest extends Model
{
    protected $fillable = [
        'period',
        'status',
        'fulfillment_status',
        'change_log',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'change_log' => 'array',
    ];

    public function items()
    {
        return $this->hasMany(ProcurementRequestItem::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function editor()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
