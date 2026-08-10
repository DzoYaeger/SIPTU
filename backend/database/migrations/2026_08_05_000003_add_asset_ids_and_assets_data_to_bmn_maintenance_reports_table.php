<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bmn_maintenance_reports', function (Blueprint $table) {
            $table->json('asset_ids')->nullable()->after('asset_name');
            $table->json('assets_data')->nullable()->after('asset_ids');
        });
    }

    public function down(): void
    {
        Schema::table('bmn_maintenance_reports', function (Blueprint $table) {
            $table->dropColumn(['asset_ids', 'assets_data']);
        });
    }
};
