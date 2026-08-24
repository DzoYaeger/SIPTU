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
        Schema::table('notification_settings', function (Blueprint $table) {
            if (!Schema::hasColumn('notification_settings', 'layanan_filter_config')) {
                $table->json('layanan_filter_config')->nullable()->after('kepala_balai_settings');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('notification_settings', function (Blueprint $table) {
            if (Schema::hasColumn('notification_settings', 'layanan_filter_config')) {
                $table->dropColumn('layanan_filter_config');
            }
        });
    }
};
