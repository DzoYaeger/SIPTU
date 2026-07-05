<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lpj_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lpj_header_id')
                  ->constrained('lpj_headers')
                  ->onDelete('cascade');
            $table->foreignId('employee_id')
                  ->nullable()
                  ->constrained('employees')
                  ->onDelete('set null');
            $table->string('employee_name');
            $table->string('employee_nip')->nullable();
            $table->boolean('is_external')->default(false);

            // Komponen biaya (null = tidak diaktifkan / tidak dicentang)
            $table->decimal('uang_harian', 15, 2)->nullable();
            $table->decimal('uang_penginapan', 15, 2)->nullable();
            $table->decimal('uang_transport_taxi', 15, 2)->nullable();
            $table->decimal('uang_transport_bus', 15, 2)->nullable();

            $table->timestamps();

            // Satu pegawai hanya satu baris per LPJ header
            $table->unique(['lpj_header_id', 'employee_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lpj_items');
    }
};
