<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE visitor_queues MODIFY COLUMN status ENUM('waiting', 'called', 'served', 'skipped') DEFAULT 'waiting'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE visitor_queues MODIFY COLUMN status ENUM('waiting', 'called', 'skipped') DEFAULT 'waiting'");
    }
};
