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
        Schema::create('rhpk_reports', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->integer('year');
            $table->string('period')->default('Triwulan I'); // Triwulan I, II, III, IV / Januari-Desember
            $table->string('team_unit')->nullable(); // Pokja Infokom, Pemeriksaan, TU, dll.
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->foreignId('reviewer_id')->nullable()->constrained('users')->onDelete('set null');
            $table->enum('status', ['draft', 'submitted', 'approved', 'revision', 'rejected'])->default('draft');
            $table->text('reviewer_notes')->nullable();
            $table->decimal('total_target_percentage', 5, 2)->default(0.00);
            $table->timestamps();
        });

        Schema::create('rhpk_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rhpk_report_id')->constrained('rhpk_reports')->onDelete('cascade');
            $table->string('rhk_name'); // Nama Rencana Hasil Kerja / Sub-kegiatan
            $table->string('indicator'); // Indikator Kinerja Output
            $table->integer('target_volume')->default(1);
            $table->string('unit')->default('Laporan'); // Laporan, Dokumen, Berita Acara, Sample, dll.
            $table->integer('realization_volume')->default(0);
            $table->decimal('progress_percentage', 5, 2)->default(0.00);
            $table->enum('status', ['pending', 'in_progress', 'completed', 'delayed'])->default('pending');
            $table->date('execution_date')->nullable();
            $table->text('obstacle_notes')->nullable();
            $table->string('evidence_url')->nullable(); // Link Google Drive / PDF Bukti Dukung
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rhpk_items');
        Schema::dropIfExists('rhpk_reports');
    }
};
