<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PanjarRequestItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'panjar_request_id',
        'uraian',
        'volume',
        'satuan',
        'harga_satuan',
        'jumlah',
        'keterangan',
        'sort_order',
    ];

    protected $casts = [
        'volume' => 'float',
        'harga_satuan' => 'float',
        'jumlah' => 'float',
        'sort_order' => 'integer',
    ];

    public function panjarRequest()
    {
        return $this->belongsTo(PanjarRequest::class, 'panjar_request_id');
    }
}