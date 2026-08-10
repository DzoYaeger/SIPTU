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
        // Ubah tipe kolom asset_name menjadi TEXT agar dapat menampung daftar banyak nama aset BMN
        try {
            DB::statement('ALTER TABLE bmn_maintenance_reports MODIFY asset_name TEXT NULL');
        } catch (\Throwable $e) {
            // Fallback for non-MySQL / SQLite testing
            Schema::table('bmn_maintenance_reports', function (Blueprint $table) {
                $table->text('asset_name')->nullable()->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        try {
            DB::statement('ALTER TABLE bmn_maintenance_reports MODIFY asset_name VARCHAR(255) NULL');
        } catch (\Throwable $e) {
            Schema::table('bmn_maintenance_reports', function (Blueprint $table) {
                $table->string('asset_name', 255)->nullable()->change();
            });
        }
    }
};
