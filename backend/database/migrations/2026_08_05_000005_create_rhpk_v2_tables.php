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
        // 1. Tabel Master Target Capaian Output (Diinput Admin)
        Schema::create('rhpk_output_targets', function (Blueprint $table) {
            $table->id();
            $table->integer('year')->default(2026);
            $table->string('code_output')->nullable(); // Kode Output
            $table->text('output_name'); // Rincian Output
            $table->decimal('budget_pagu', 15, 2)->default(0.00); // Pagu Rp
            $table->integer('initial_target')->default(1); // Target Semula
            $table->integer('revised_target')->default(1); // Target Menjadi
            $table->string('unit')->default('Laporan'); // Satuan

            // Target per Bulan (Admin)
            $table->integer('target_jan')->default(0);
            $table->integer('target_feb')->default(0);
            $table->integer('target_mar')->default(0);
            $table->integer('target_apr')->default(0);
            $table->integer('target_may')->default(0);
            $table->integer('target_jun')->default(0);
            $table->integer('target_jul')->default(0);
            $table->integer('target_aug')->default(0);
            $table->integer('target_sep')->default(0);
            $table->integer('target_oct')->default(0);
            $table->integer('target_nov')->default(0);
            $table->integer('target_dec')->default(0);

            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('cascade');
            $table->timestamps();
        });

        // 2. Tabel Realisasi Bulanan Capaian Output (Diinput User)
        Schema::create('rhpk_output_realizations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rhpk_output_target_id')->constrained('rhpk_output_targets')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->integer('month'); // 1 s/d 12
            $table->integer('realization_value')->default(0); // Realisasi Bulan ini
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['rhpk_output_target_id', 'user_id', 'month'], 'rhpk_realization_unique');
        });

        // 3. Tabel Master Indikator Penjelasan Capaian Output (Diinput Admin)
        Schema::create('rhpk_explanation_indicators', function (Blueprint $table) {
            $table->id();
            $table->integer('year')->default(2026);
            $table->string('code_indicator')->nullable();
            $table->text('indicator_name'); // Nama Indikator Kinerja Output
            $table->string('target_indicator')->nullable(); // Target Indikator (misal 100%)
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('cascade');
            $table->timestamps();
        });

        // 4. Tabel Input Penjelasan Capaian Output Narasi & Eviden (Diinput User)
        Schema::create('rhpk_explanations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rhpk_explanation_indicator_id')->constrained('rhpk_explanation_indicators')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->integer('year')->default(2026);
            $table->integer('month')->default(1); // 1 s/d 12
            $table->text('supporting_factors')->nullable(); // Faktor Pendukung
            $table->text('inhibiting_factors')->nullable(); // Faktor Penghambat
            $table->text('follow_up_action')->nullable(); // Tindak Lanjut / Solusi
            $table->string('evidence_url')->nullable(); // Link Bukti Dukung (Drive/PDF)
            $table->enum('status', ['draft', 'submitted', 'approved', 'revision', 'rejected'])->default('draft');
            $table->text('reviewer_notes')->nullable();
            $table->foreignId('reviewer_id')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rhpk_explanations');
        Schema::dropIfExists('rhpk_explanation_indicators');
        Schema::dropIfExists('rhpk_output_realizations');
        Schema::dropIfExists('rhpk_output_targets');
    }
};
