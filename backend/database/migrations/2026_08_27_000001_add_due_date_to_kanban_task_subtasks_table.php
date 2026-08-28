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
        Schema::table('kanban_task_subtasks', function (Blueprint $table) {
            if (!Schema::hasColumn('kanban_task_subtasks', 'due_date')) {
                $table->date('due_date')->nullable()->after('status');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('kanban_task_subtasks', function (Blueprint $table) {
            if (Schema::hasColumn('kanban_task_subtasks', 'due_date')) {
                $table->dropColumn('due_date');
            }
        });
    }
};
