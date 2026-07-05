<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('archive_units', function (Blueprint $table) {
            $table->json('unit_pengolah_employee_ids')->nullable()->after('unit_pengolah_employee_id');
        });

        Schema::table('archive_unit_settings', function (Blueprint $table) {
            $table->json('unit_keasipan_employee_ids')->nullable()->after('unit_keasipan_employee_id');
        });
    }

    public function down(): void
    {
        Schema::table('archive_units', function (Blueprint $table) {
            $table->dropColumn('unit_pengolah_employee_ids');
        });

        Schema::table('archive_unit_settings', function (Blueprint $table) {
            $table->dropColumn('unit_keasipan_employee_ids');
        });
    }
};
