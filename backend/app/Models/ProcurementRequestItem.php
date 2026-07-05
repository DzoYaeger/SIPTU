<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProcurementRequestItem extends Model
{
    protected $fillable = [
        'procurement_request_id',
        'pdtt_item_id',
        'jumlah',
        'harga_saat_ini',
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
