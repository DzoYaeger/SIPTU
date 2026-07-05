<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE it_helpdesk_tickets MODIFY COLUMN status ENUM('new', 'in_progress', 'waiting_user_approval', 'completed') NOT NULL DEFAULT 'new'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert back without waiting_user_approval
        DB::statement("ALTER TABLE it_helpdesk_tickets MODIFY COLUMN status ENUM('new', 'in_progress', 'completed') NOT NULL DEFAULT 'new'");
    }
};
