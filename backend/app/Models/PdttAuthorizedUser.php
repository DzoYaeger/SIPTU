<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PdttAuthorizedUser extends Model
{
    protected $fillable = [
        'user_id',
        'jumlah_hari',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
