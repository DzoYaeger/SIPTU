<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('surat_tugas_documents', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('surat_tugas_id');
            $table->string('filename');
            $table->string('file_path');
            $table->string('template_used')->nullable();
            $table->unsignedBigInteger('generated_by')->nullable();
            $table->bigInteger('file_size')->default(0);
            $table->timestamp('expires_at');
            $table->timestamps();

            $table->foreign('surat_tugas_id')->references('id')->on('surat_tugas')->onDelete('cascade');
            $table->foreign('generated_by')->references('id')->on('users')->onDelete('set null');

            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('surat_tugas_documents');
    }
};
