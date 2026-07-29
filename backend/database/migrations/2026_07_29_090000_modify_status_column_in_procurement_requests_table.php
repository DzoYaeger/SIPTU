<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('procurement_requests')) {
            DB::statement("ALTER TABLE procurement_requests MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'pending'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('procurement_requests')) {
            DB::statement("ALTER TABLE procurement_requests MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'pending'");
        }
    }
};
