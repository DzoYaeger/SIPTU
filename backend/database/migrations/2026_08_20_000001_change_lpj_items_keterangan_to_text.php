<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lpj_items', function (Blueprint $table) {
            $table->text('uang_transport_bus_keterangan')->nullable()->change();
            $table->text('uang_transport_taxi_keterangan')->nullable()->change();
            $table->text('uang_transport_pesawat_keterangan')->nullable()->change();
            $table->text('uang_transport_bbm_keterangan')->nullable()->change();
            $table->text('uang_transport_sewa_mobil_keterangan')->nullable()->change();
            $table->text('uang_transport_lokal_keterangan')->nullable()->change();
            $table->text('uang_transport_umum_keterangan')->nullable()->change();
            $table->text('uang_harian_keterangan')->nullable()->change();
            $table->text('uang_penginapan_keterangan')->nullable()->change();
            $table->text('uang_fullboard_keterangan')->nullable()->change();
            $table->text('uang_harian_fullboard_keterangan')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('lpj_items', function (Blueprint $table) {
            $table->string('uang_transport_bus_keterangan', 255)->nullable()->change();
            $table->string('uang_transport_taxi_keterangan', 255)->nullable()->change();
            $table->string('uang_transport_pesawat_keterangan', 255)->nullable()->change();
            $table->string('uang_transport_bbm_keterangan', 255)->nullable()->change();
            $table->string('uang_transport_sewa_mobil_keterangan', 255)->nullable()->change();
            $table->string('uang_transport_lokal_keterangan', 255)->nullable()->change();
            $table->string('uang_transport_umum_keterangan', 255)->nullable()->change();
            $table->string('uang_harian_keterangan', 255)->nullable()->change();
            $table->string('uang_penginapan_keterangan', 255)->nullable()->change();
            $table->string('uang_fullboard_keterangan', 255)->nullable()->change();
            $table->string('uang_harian_fullboard_keterangan', 255)->nullable()->change();
        });
    }
};
