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
        Schema::table('bmn_loans', function (Blueprint $table) {
            $table->decimal('bbm_awal', 8, 2)->nullable()->after('kondisi_kendaraan_pinjam');
            $table->decimal('bbm_akhir', 8, 2)->nullable()->after('bbm_awal');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bmn_loans', function (Blueprint $table) {
            $table->dropColumn(['bbm_awal', 'bbm_akhir']);
        });
    }
};
