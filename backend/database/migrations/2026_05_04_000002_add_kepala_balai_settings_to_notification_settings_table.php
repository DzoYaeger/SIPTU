<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('notification_settings', 'kepala_balai_settings')) {
            Schema::table('notification_settings', function (Blueprint $table) {
                $table->json('kepala_balai_settings')->nullable()->after('surat_tugas_templates');
            });
        }
    }

    public function down(): void
    {
        Schema::table('notification_settings', function (Blueprint $table) {
            $table->dropColumn('kepala_balai_settings');
        });
    }
};
