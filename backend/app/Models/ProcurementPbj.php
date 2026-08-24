<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProcurementPbj extends Model
{
    use HasFactory;

    protected $table = 'procurement_pbjs';

    protected $fillable = [
        'nama_pengadaan',
        'jenis_pengadaan',
        'nama_penyedia',
        'tanggal_pengadaan',
        'no_kontrak',
        'nominal',
        'tanggal_kirim',
        'tanggal_sampai',
        'no_bast',
        'tanggal_bast',
        'status_barang',
        'items',
        'file_surat_pesanan',
        'file_bast',
        'file_invoice',
    ];

    protected $casts = [
        'tanggal_pengadaan' => 'date',
        'tanggal_kirim' => 'date',
        'tanggal_sampai' => 'date',
        'tanggal_bast' => 'date',
        'nominal' => 'decimal:2',
        'items' => 'array',
    ];

    protected $appends = [
        'file_surat_pesanan_url',
        'file_bast_url',
        'file_invoice_url',
    ];

    public function getFileSuratPesananUrlAttribute(): ?string
    {
        if (!$this->file_surat_pesanan) return null;
        if (str_starts_with($this->file_surat_pesanan, 'http')) return $this->file_surat_pesanan;
        if (str_starts_with($this->file_surat_pesanan, 'procurement-pbj/')) {
            return asset('storage/' . $this->file_surat_pesanan);
        }
        return url("/api/procurement-pbjs/{$this->id}/file/sp");
    }

    public function getFileBastUrlAttribute(): ?string
    {
        if (!$this->file_bast) return null;
        if (str_starts_with($this->file_bast, 'http')) return $this->file_bast;
        if (str_starts_with($this->file_bast, 'procurement-pbj/')) {
            return asset('storage/' . $this->file_bast);
        }
        return url("/api/procurement-pbjs/{$this->id}/file/bast");
    }

    public function getFileInvoiceUrlAttribute(): ?string
    {
        if (!$this->file_invoice) return null;
        if (str_starts_with($this->file_invoice, 'http')) return $this->file_invoice;
        if (str_starts_with($this->file_invoice, 'procurement-pbj/')) {
            return asset('storage/' . $this->file_invoice);
        }
        return url("/api/procurement-pbjs/{$this->id}/file/invoice");
    }
}
