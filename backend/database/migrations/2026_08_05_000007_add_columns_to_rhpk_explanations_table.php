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
        Schema::table('rhpk_explanations', function (Blueprint $table) {
            $table->string('realization_volume')->nullable()->after('month'); // Realisasi Capaian Bulan Ini
            $table->string('achievement_percent')->nullable()->after('realization_volume'); // Persentase Capaian (%)
            $table->text('explanation_notes')->nullable()->after('achievement_percent'); // Keterangan Capaian / Analisis Kinerja
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rhpk_explanations', function (Blueprint $table) {
            $table->dropColumn(['realization_volume', 'achievement_percent', 'explanation_notes']);
        });
    }
};
