<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lpj_items', function (Blueprint $table) {
            $table->string('nama_hotel')->nullable();
            $table->string('nomor_kamar')->nullable();

            $table->double('uang_transport_umum')->nullable();
            $table->double('uang_transport_umum_berangkat')->nullable();
            $table->double('uang_transport_umum_pulang')->nullable();

            $table->string('uang_transport_bus_keterangan')->nullable();
            $table->string('uang_transport_taxi_keterangan')->nullable();
            $table->string('uang_transport_pesawat_keterangan')->nullable();
            $table->string('uang_transport_bbm_keterangan')->nullable();
            $table->string('uang_transport_sewa_mobil_keterangan')->nullable();
            $table->string('uang_transport_lokal_keterangan')->nullable();
            $table->string('uang_transport_umum_keterangan')->nullable();
            $table->string('uang_harian_keterangan')->nullable();
            $table->string('uang_penginapan_keterangan')->nullable();
            $table->string('uang_fullboard_keterangan')->nullable();
            $table->string('uang_harian_fullboard_keterangan')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('lpj_items', function (Blueprint $table) {
            $table->dropColumn([
                'nama_hotel',
                'nomor_kamar',
                'uang_transport_umum',
                'uang_transport_umum_berangkat',
                'uang_transport_umum_pulang',
                'uang_transport_bus_keterangan',
                'uang_transport_taxi_keterangan',
                'uang_transport_pesawat_keterangan',
                'uang_transport_bbm_keterangan',
                'uang_transport_sewa_mobil_keterangan',
                'uang_transport_lokal_keterangan',
                'uang_transport_umum_keterangan',
                'uang_harian_keterangan',
                'uang_penginapan_keterangan',
                'uang_fullboard_keterangan',
                'uang_harian_fullboard_keterangan',
            ]);
        });
    }
};
