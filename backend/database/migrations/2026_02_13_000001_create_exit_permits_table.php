<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exit_permits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->string('nip');
            $table->string('employee_name');
            $table->date('date');
            $table->time('exit_time');
            $table->time('return_time')->nullable();
            $table->integer('duration_minutes')->nullable();
            $table->text('reason')->nullable();
            $table->enum('status', ['out', 'returned'])->default('out');
            $table->timestamps();

            $table->index(['date', 'employee_id']);
            $table->index('nip');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exit_permits');
    }
};
