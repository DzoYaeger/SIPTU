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
        // 1. Main Kanban Tasks Table
        Schema::create('kanban_tasks', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('status', ['todo', 'in_progress', 'review', 'done'])->default('todo');
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium');
            $table->string('category')->nullable()->default('Umum'); // e.g. Tata Usaha, Keuangan, BMN, Substansi, etc.
            $table->date('due_date')->nullable();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by_employee_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->integer('position')->default(0);
            $table->timestamps();
        });

        // 2. Task Assignees (Employees tagged to task)
        Schema::create('kanban_task_assignees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained('kanban_tasks')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->string('role')->default('assignee'); // e.g. pj, assignee, contributor
            $table->timestamps();

            $table->unique(['task_id', 'employee_id']);
        });

        // 3. Subtasks / Breakdown Tahapan Pengerjaan with Nextcloud Evidence Upload
        Schema::create('kanban_task_subtasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained('kanban_tasks')->cascadeOnDelete();
            $table->string('title');
            $table->text('notes')->nullable(); // Catatan / keterangan hasil pengerjaan
            $table->enum('status', ['pending', 'in_progress', 'completed'])->default('pending');
            $table->foreignId('assigned_employee_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->foreignId('completed_by_employee_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->string('completed_by_name')->nullable();
            $table->timestamp('completed_at')->nullable();
            
            // Nextcloud storage integration for stage process evidence
            $table->string('attachment_path', 1000)->nullable(); // Nextcloud relative file path
            $table->string('attachment_name')->nullable(); // Original file name
            $table->bigInteger('attachment_size')->nullable();
            $table->string('attachment_mime')->nullable();

            $table->integer('position')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kanban_task_subtasks');
        Schema::dropIfExists('kanban_task_assignees');
        Schema::dropIfExists('kanban_tasks');
    }
};
