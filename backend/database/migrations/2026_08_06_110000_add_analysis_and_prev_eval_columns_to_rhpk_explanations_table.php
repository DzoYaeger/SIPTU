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
            // Induk 1: Analisa Capaian
            $table->text('success_analysis')->nullable()->after('inhibiting_factors'); // Analisa Keberhasilan (Jika IKU Tercapai)
            $table->text('recommendations')->nullable()->after('success_analysis'); // Rekomendasi
            $table->string('analysis_timeline')->nullable()->after('follow_up_action'); // Timeline
            $table->string('is_risk_identified', 10)->default('T')->after('analysis_timeline'); // Apakah sudah diidentifikasi risiko Y/T
            $table->string('risk_code')->nullable()->after('is_risk_identified'); // Kode Risiko
            $table->text('risk_event')->nullable()->after('risk_code'); // Peristiwa Risiko

            // Induk 2: Tindak Lanjut Rekomendasi Hasil Evaluasi Sebelumnya
            $table->text('prev_inhibiting_factors')->nullable()->after('risk_event'); // Kendala/Permasalahan TW/Bulan sebelumnya
            $table->text('prev_recommendations')->nullable()->after('prev_inhibiting_factors'); // Rekomendasi TW/Bulan Sebelumnya
            $table->text('prev_follow_up_action')->nullable()->after('prev_recommendations'); // RTL TW/Bulan sebelumya
            $table->string('prev_status')->nullable()->after('prev_follow_up_action'); // Status
            $table->text('prev_progress_tl')->nullable()->after('prev_status'); // Progres TL Rekomendasi
            $table->string('prev_timeline')->nullable()->after('prev_progress_tl'); // Timeline
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rhpk_explanations', function (Blueprint $table) {
            $table->dropColumn([
                'success_analysis',
                'recommendations',
                'analysis_timeline',
                'is_risk_identified',
                'risk_code',
                'risk_event',
                'prev_inhibiting_factors',
                'prev_recommendations',
                'prev_follow_up_action',
                'prev_status',
                'prev_progress_tl',
                'prev_timeline',
            ]);
        });
    }
};
