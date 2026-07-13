<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NextcloudShare extends Model
{
    use HasFactory;

    protected $table = 'nextcloud_shares';

    protected $fillable = [
        'path',
        'token',
        'can_edit',
    ];

    protected $casts = [
        'can_edit' => 'boolean',
    ];
}
