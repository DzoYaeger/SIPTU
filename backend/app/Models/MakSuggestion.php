<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MakSuggestion extends Model
{
    protected $table = 'mak_suggestions';

    protected $fillable = [
        'mak',
    ];
}
