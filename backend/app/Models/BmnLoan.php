<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BmnLoan extends Model
{
    protected $fillable = [
        'token',
        'spa_number',
        'borrower_id',
        'borrower_nip',
        'borrower_name',
        'borrower_function',
        'borrower_phone',
        'loan_date',
        'return_date',
        'location',
        'notes',
        'status',
        'requester_signature',
        'requester_signature_token',
        'requester_signed_at',
        'validator_signature',
        'validator_signature_token',
        'validator_signed_at',
        'assets',
        'created_by',
        'approved_by',
        'approved_at',
        'is_vehicle',
        'kondisi_barang_pinjam',
        'kondisi_kendaraan_pinjam',
        'kondisi_barang_kembali',
        'kondisi_kendaraan_kembali',
        'bbm_awal',
        'bbm_akhir',
        'loan_type',
        'start_time',
        'end_time',
        'activity_name',
    ];

    protected $casts = [
        'assets'                    => 'array',
        'loan_date'                 => 'date',
        'return_date'               => 'date',
        'start_time'                => 'string',
        'end_time'                  => 'string',
        'approved_at'               => 'datetime',
        'requester_signed_at'       => 'datetime',
        'validator_signed_at'       => 'datetime',
        'is_vehicle'                => 'boolean',
        'kondisi_kendaraan_pinjam'  => 'array',
        'kondisi_kendaraan_kembali' => 'array',
        'bbm_awal'                  => 'decimal:2',
        'bbm_akhir'                 => 'decimal:2',
    ];

    public function borrower()
    {
        return $this->belongsTo(Employee::class, 'borrower_id');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}

