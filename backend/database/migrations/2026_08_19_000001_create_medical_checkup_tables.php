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
        // 1. Master Jenis / Paket Pemeriksaan Kesehatan
        Schema::create('medical_checkup_packages', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->nullable();
            $table->string('category')->default('Laboratorium Darah');
            $table->decimal('price', 15, 2)->default(0);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // 2. Saldo / Plafon Pemeriksaan Kesehatan Pegawai
        Schema::create('employee_medical_balances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->string('nip');
            $table->string('employee_name')->nullable();
            $table->integer('tahun_anggaran')->default(2026);
            $table->decimal('initial_balance', 15, 2)->default(0);
            $table->decimal('used_balance', 15, 2)->default(0);
            $table->decimal('current_balance', 15, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['nip', 'tahun_anggaran'], 'emp_med_balance_nip_ta_unique');
        });

        // 3. Pengajuan Pemeriksaan Kesehatan Pegawai
        Schema::create('medical_checkup_requests', function (Blueprint $table) {
            $table->id();
            $table->string('request_number')->unique();
            $table->integer('tahun_anggaran')->default(2026);
            $table->foreignId('employee_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('nip');
            $table->string('employee_name');
            $table->string('department')->nullable();
            $table->string('phone_number')->nullable();
            $table->date('planned_date')->nullable();
            $table->string('faskes_name')->nullable();
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->decimal('balance_before', 15, 2)->default(0);
            $table->decimal('balance_after', 15, 2)->default(0);
            $table->string('status')->default('pending'); // pending, approved, completed, rejected, cancelled
            $table->text('notes')->nullable();
            $table->text('admin_notes')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->string('result_file')->nullable();
            $table->timestamps();
        });

        // 4. Detail Item Pemeriksaan pada Setiap Pengajuan
        Schema::create('medical_checkup_request_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('medical_checkup_request_id')->constrained('medical_checkup_requests')->cascadeOnDelete();
            $table->foreignId('medical_checkup_package_id')->nullable()->constrained('medical_checkup_packages')->nullOnDelete();
            $table->string('package_name');
            $table->string('package_category')->nullable();
            $table->decimal('price', 15, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('medical_checkup_request_items');
        Schema::dropIfExists('medical_checkup_requests');
        Schema::dropIfExists('employee_medical_balances');
        Schema::dropIfExists('medical_checkup_packages');
    }
};
