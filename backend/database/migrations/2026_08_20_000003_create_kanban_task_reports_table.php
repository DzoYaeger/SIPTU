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
        Schema::create('kanban_task_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained('kanban_tasks')->onDelete('cascade');
            $table->foreignId('employee_id')->nullable()->constrained('employees')->onDelete('set null');
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->text('content');
            $table->string('status_update', 50)->nullable();
            $table->unsignedTinyInteger('progress_percentage')->nullable();
            $table->string('attachment_path', 500)->nullable();
            $table->string('attachment_name', 255)->nullable();
            $table->unsignedBigInteger('attachment_size')->nullable();
            $table->string('attachment_mime', 100)->nullable();
            $table->timestamps();

            $table->index(['task_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kanban_task_reports');
    }
};
