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
        Schema::table('procurement_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('procurement_requests', 'change_log')) {
                $table->json('change_log')->nullable()->after('fulfillment_status')->comment('Stores item diffs and who updated');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('procurement_requests', function (Blueprint $table) {
            if (Schema::hasColumn('procurement_requests', 'change_log')) {
                $table->dropColumn('change_log');
            }
        });
    }
};
