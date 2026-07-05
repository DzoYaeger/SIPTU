<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lpj_items', function (Blueprint $table) {
            $table->decimal('uang_transport_bus_berangkat', 15, 2)->nullable()->after('uang_transport_bus');
            $table->decimal('uang_transport_bus_pulang', 15, 2)->nullable()->after('uang_transport_bus_berangkat');
            
            $table->decimal('uang_transport_taxi_berangkat', 15, 2)->nullable()->after('uang_transport_taxi');
            $table->decimal('uang_transport_taxi_pulang', 15, 2)->nullable()->after('uang_transport_taxi_berangkat');
            
            $table->decimal('uang_transport_pesawat_berangkat', 15, 2)->nullable()->after('uang_transport_pesawat');
            $table->decimal('uang_transport_pesawat_pulang', 15, 2)->nullable()->after('uang_transport_pesawat_berangkat');
            
            $table->decimal('uang_transport_sewa_mobil_harian', 15, 2)->nullable()->after('uang_transport_sewa_mobil');
            $table->integer('uang_transport_sewa_mobil_hari')->nullable()->after('uang_transport_sewa_mobil_harian');
            
            $table->integer('uang_harian_hari')->nullable()->after('uang_harian');
            $table->decimal('uang_harian_per_hari', 15, 2)->nullable()->after('uang_harian_hari');
            
            $table->decimal('uang_penginapan_harian', 15, 2)->nullable()->after('uang_penginapan');
            $table->integer('uang_penginapan_hari')->nullable()->after('uang_penginapan_harian');
        });
    }

    public function down(): void
    {
        Schema::table('lpj_items', function (Blueprint $table) {
            $table->dropColumn([
                'uang_transport_bus_berangkat',
                'uang_transport_bus_pulang',
                'uang_transport_taxi_berangkat',
                'uang_transport_taxi_pulang',
                'uang_transport_pesawat_berangkat',
                'uang_transport_pesawat_pulang',
                'uang_transport_sewa_mobil_harian',
                'uang_transport_sewa_mobil_hari',
                'uang_harian_hari',
                'uang_harian_per_hari',
                'uang_penginapan_harian',
                'uang_penginapan_hari',
            ]);
        });
    }
};
