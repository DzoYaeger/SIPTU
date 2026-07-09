<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PejabatPerbendaharaan extends Model
{
    protected $table = 'pejabat_perbendaharaan';

    protected $fillable = [
        'bendahara_id',
        'ppk_id',
    ];

    public function bendahara()
    {
        return $this->belongsTo(Employee::class, 'bendahara_id');
    }

    public function ppk()
    {
        return $this->belongsTo(Employee::class, 'ppk_id');
    }
}
