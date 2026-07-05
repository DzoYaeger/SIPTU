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
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->string('nip')->unique(); // NIP (Nomor Induk Pegawai)
            $table->string('name');
            $table->string('position')->nullable();
            $table->string('department')->nullable();
            $table->string('function_area')->nullable(); // Fungsi/Bidang (Tata Usaha, Pemeriksaan dan Sertifikasi, Infokom, Penindakan, Pengujian)
            $table->string('phone_number')->nullable();
            $table->date('hire_date')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->text('notes')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};
