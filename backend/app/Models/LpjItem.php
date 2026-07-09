<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LpjItem extends Model
{
    protected $table = 'lpj_items';

    protected $fillable = [
        'lpj_header_id',
        'employee_id',
        'employee_name',
        'employee_nip',
        'is_external',
        'nomor_spd',
        'uang_harian',
        'uang_harian_hari',
        'uang_harian_per_hari',
        'uang_penginapan',
        'uang_penginapan_harian',
        'uang_penginapan_hari',
        'uang_transport_taxi',
        'uang_transport_taxi_berangkat',
        'uang_transport_taxi_pulang',
        'uang_transport_bus',
        'uang_transport_bus_berangkat',
        'uang_transport_bus_pulang',
        'uang_transport_bbm',
        'uang_transport_sewa_mobil',
        'uang_transport_sewa_mobil_harian',
        'uang_transport_sewa_mobil_hari',
        'uang_transport_pesawat',
        'uang_transport_pesawat_berangkat',
        'uang_transport_pesawat_pulang',
        'uang_fullboard',
        'uang_fullboard_hari',
        'uang_fullboard_harian',
        'uang_harian_fullboard',
        'uang_harian_fullboard_hari',
        'uang_harian_fullboard_per_hari',
        'uang_transport_lokal',
        'uang_transport_lokal_harian',
        'uang_transport_lokal_hari',
    ];

    protected function casts(): array
    {
        return [
            'is_external'                     => 'boolean',
            'uang_harian'                     => 'float',
            'uang_harian_hari'                => 'integer',
            'uang_harian_per_hari'            => 'float',
            'uang_penginapan'                 => 'float',
            'uang_penginapan_harian'          => 'float',
            'uang_penginapan_hari'            => 'integer',
            'uang_transport_taxi'             => 'float',
            'uang_transport_taxi_berangkat'   => 'float',
            'uang_transport_taxi_pulang'      => 'float',
            'uang_transport_bus'              => 'float',
            'uang_transport_bus_berangkat'    => 'float',
            'uang_transport_bus_pulang'       => 'float',
            'uang_transport_bbm'              => 'float',
            'uang_transport_sewa_mobil'       => 'float',
            'uang_transport_sewa_mobil_harian' => 'float',
            'uang_transport_sewa_mobil_hari'  => 'integer',
            'uang_transport_pesawat'          => 'float',
            'uang_transport_pesawat_berangkat' => 'float',
            'uang_transport_pesawat_pulang'   => 'float',
            'uang_fullboard'                  => 'float',
            'uang_fullboard_hari'             => 'integer',
            'uang_fullboard_harian'           => 'float',
            'uang_harian_fullboard'           => 'float',
            'uang_harian_fullboard_hari'      => 'integer',
            'uang_harian_fullboard_per_hari'  => 'float',
            'uang_transport_lokal'            => 'float',
            'uang_transport_lokal_harian'     => 'float',
            'uang_transport_lokal_hari'       => 'integer',
        ];
    }

    public function lpjHeader()
    {
        return $this->belongsTo(LpjHeader::class, 'lpj_header_id');
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }
}
