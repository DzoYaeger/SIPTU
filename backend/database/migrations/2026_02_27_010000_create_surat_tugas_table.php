<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('surat_tugas', function (Blueprint $table) {
            $table->id();
            $table->date('tanggal_mulai');
            $table->date('tanggal_selesai');
            $table->string('mak')->nullable();
            // Data Sarana dari SIAMPARAN
            $table->unsignedInteger('sarana_id')->nullable();
            $table->string('sarana_nama')->nullable();
            $table->string('sarana_lokasi')->nullable();
            // Data pelengkap (diisi di tahap manajemen)
            $table->string('nomor_st')->nullable();
            $table->date('tanggal_st')->nullable();
            $table->unsignedBigInteger('penandatangan_id')->nullable();
            $table->enum('status_jabatan', ['tetap', 'plh'])->default('tetap');
            $table->string('template_file')->nullable();
            // Status tracking
            $table->enum('status', ['draft', 'lengkap'])->default('draft');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->foreign('penandatangan_id')->references('id')->on('employees')->nullOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('surat_tugas');
    }
};
