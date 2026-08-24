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
        // 1. Kanban Groups Table (Channels / Workspaces)
        Schema::create('kanban_groups', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->nullable();
            $table->text('description')->nullable();
            $table->string('icon')->default('team'); // e.g. team, user, lock, folder, thunderbolt, compass
            $table->string('color')->default('#0F5B99'); // HEX Color
            $table->enum('type', ['public', 'private', 'team'])->default('team');
            $table->boolean('is_public')->default(false);
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by_employee_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->integer('position')->default(0);
            $table->timestamps();
        });

        // 2. Kanban Group Members (Employees tagged into group)
        Schema::create('kanban_group_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('group_id')->constrained('kanban_groups')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->string('role')->default('member'); // admin, member
            $table->timestamps();

            $table->unique(['group_id', 'employee_id']);
        });

        // 3. Add group_id to kanban_tasks if not exists
        Schema::table('kanban_tasks', function (Blueprint $table) {
            if (!Schema::hasColumn('kanban_tasks', 'group_id')) {
                $table->foreignId('group_id')->nullable()->after('id')->constrained('kanban_groups')->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('kanban_tasks', function (Blueprint $table) {
            if (Schema::hasColumn('kanban_tasks', 'group_id')) {
                $table->dropForeign(['group_id']);
                $table->dropColumn('group_id');
            }
        });

        Schema::dropIfExists('kanban_group_members');
        Schema::dropIfExists('kanban_groups');
    }
};
