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
        Schema::create('archive_units', function (Blueprint $table) {
            $table->id();
            $table->string('fungsi_bidang')->unique();
            $table->foreignId('unit_pengolah_employee_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('archive_unit_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('unit_keasipan_employee_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('archive_unit_settings');
        Schema::dropIfExists('archive_units');
    }
};
