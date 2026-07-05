<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VisitorQueue extends Model
{
    use HasFactory;

    protected $fillable = [
        'visitor_name',
        'institution_name',
        'phone',
        'purpose_of_visit',
        'counter_code',
        'queue_number',
        'status',
        'date'
    ];
}
