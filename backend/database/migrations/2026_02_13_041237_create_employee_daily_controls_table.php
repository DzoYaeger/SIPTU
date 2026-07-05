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
        Schema::create('employee_daily_controls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->date('date');
            $table->unique(['employee_id', 'date']);
            
            $table->boolean('violation_uniform')->default(false);
            $table->boolean('violation_assembly')->default(false);
            
            $table->boolean('violation_entry')->default(false);
            $table->integer('entry_late_minutes')->default(0); // Minutes late
            
            $table->boolean('violation_exit')->default(false);
            $table->integer('exit_early_minutes')->default(0); // Minutes early/unauthorized
            
            $table->integer('total_points')->default(0);
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_daily_controls');
    }
};
