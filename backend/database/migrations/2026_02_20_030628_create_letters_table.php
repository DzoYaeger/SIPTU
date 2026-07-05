<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('letters', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['masuk', 'keluar'])->index();
            $table->string('nomor_surat')->nullable();
            $table->string('hal')->nullable();
            $table->date('tanggal_surat')->nullable();
            // Surat Masuk fields
            $table->string('instansi_pengirim')->nullable();
            $table->string('penerima')->nullable();
            $table->date('tanggal_terima')->nullable();
            // Surat Keluar fields
            $table->string('tujuan')->nullable();
            $table->string('pengirim')->nullable();
            $table->date('tanggal_kirim')->nullable();
            $table->string('bukti_kirim')->nullable(); // file path
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('letters');
    }
};
