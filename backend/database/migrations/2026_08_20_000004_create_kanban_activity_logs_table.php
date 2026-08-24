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
        Schema::create('kanban_activity_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('group_id')->nullable()->index();
            $table->unsignedBigInteger('task_id')->nullable()->index();
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->unsignedBigInteger('employee_id')->nullable()->index();
            $table->string('action', 50)->index(); // task_created, task_updated, status_changed, etc.
            $table->text('description');
            $table->json('properties')->nullable();
            $table->timestamps();

            // Foreign keys
            $table->foreign('group_id')->references('id')->on('kanban_groups')->onDelete('cascade');
            $table->foreign('task_id')->references('id')->on('kanban_tasks')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kanban_activity_logs');
    }
};
