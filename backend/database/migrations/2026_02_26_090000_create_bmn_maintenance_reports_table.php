<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bmn_maintenance_reports', function (Blueprint $table) {
            $table->id();
            $table->string('report_number')->unique();
            $table->string('report_type'); // pemeliharaan | keluhan
            $table->foreignId('asset_id')->nullable()->constrained('assets')->nullOnDelete();
            $table->string('asset_name')->nullable();
            $table->text('report_details');
            $table->string('status')->default('new'); // new | in_progress | completed | rejected
            $table->text('admin_notes')->nullable();

            $table->foreignId('reporter_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->string('reporter_nip', 50)->nullable();
            $table->string('reporter_name')->nullable();
            $table->string('reporter_function')->nullable();
            $table->string('reporter_phone')->nullable();

            $table->foreignId('handled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('handled_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bmn_maintenance_reports');
    }
};

