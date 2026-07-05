<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('surat_tugas_employees', function (Blueprint $table) {
            $table->unsignedBigInteger('surat_tugas_id');
            $table->unsignedBigInteger('employee_id');
            $table->primary(['surat_tugas_id', 'employee_id']);

            $table->foreign('surat_tugas_id')->references('id')->on('surat_tugas')->cascadeOnDelete();
            $table->foreign('employee_id')->references('id')->on('employees')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('surat_tugas_employees');
    }
};
