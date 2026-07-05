<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('procurement_pbjs', function (Blueprint $table) {
            $table->id();
            $table->string('nama_pengadaan')->nullable();
            $table->enum('jenis_pengadaan', ['Langsung', 'E-Purchasing'])->nullable();
            $table->string('nama_penyedia')->nullable();
            $table->date('tanggal_pengadaan')->nullable();
            $table->string('no_kontrak')->nullable();
            $table->decimal('nominal', 15, 2)->nullable();
            $table->date('tanggal_kirim')->nullable();
            $table->date('tanggal_sampai')->nullable();
            $table->string('no_bast')->nullable();
            $table->date('tanggal_bast')->nullable();
            $table->enum('status_barang', [
                'Proses Negosiasi',
                'Proses PPK',
                'Proses pengiriman',
                'Proses Pembayaran',
                'Selesai'
            ])->default('Proses Negosiasi');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('procurement_pbjs');
    }
};
