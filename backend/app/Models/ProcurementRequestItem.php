<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProcurementRequestItem extends Model
{
    protected $fillable = [
        'procurement_request_id',
        'pdtt_item_id',
        'jumlah',
        'jumlah_terbeli',
        'harga_saat_ini',
        'harga_terbeli',
    ];

    public function procurementRequest()
    {
        return $this->belongsTo(ProcurementRequest::class);
    }

    public function pdttItem()
    {
        return $this->belongsTo(PdttItem::class);
    }
}
