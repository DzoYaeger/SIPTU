<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MedicalCheckupRequestItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'medical_checkup_request_id',
        'medical_checkup_package_id',
        'package_name',
        'package_category',
        'price',
        'notes',
    ];

    protected $casts = [
        'price' => 'decimal:2',
    ];

    public function request()
    {
        return $this->belongsTo(MedicalCheckupRequest::class, 'medical_checkup_request_id');
    }

    public function package()
    {
        return $this->belongsTo(MedicalCheckupPackage::class, 'medical_checkup_package_id');
    }
}
