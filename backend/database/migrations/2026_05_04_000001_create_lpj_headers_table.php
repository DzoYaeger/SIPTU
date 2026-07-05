<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lpj_headers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('surat_tugas_id')
                  ->unique()
                  ->constrained('surat_tugas')
                  ->onDelete('cascade');
            $table->enum('status', ['draft', 'final'])->default('draft');
            $table->text('keterangan')->nullable();
            $table->foreignId('created_by')
                  ->nullable()
                  ->constrained('users')
                  ->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lpj_headers');
    }
};
