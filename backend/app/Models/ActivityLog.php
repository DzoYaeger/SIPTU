<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    protected $fillable = [
        'user_id',
        'user_name',
        'user_nip',
        'module',
        'action',
        'description',
        'ticket_number',
        'model_type',
        'model_id',
    ];
}
