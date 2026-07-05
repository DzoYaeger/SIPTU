<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('surat_tugas', function (Blueprint $table) {
            $table->timestamp('signed_kepala_at')->nullable()->after('signed_at');
            $table->foreignId('signed_kepala_by')->nullable()->constrained('users')->nullOnDelete()->after('signed_by');
        });

        Schema::table('notification_settings', function (Blueprint $table) {
            $table->json('kepala_balai_settings')->nullable()->after('slider_duration');
        });
    }

    public function down(): void
    {
        Schema::table('surat_tugas', function (Blueprint $table) {
            $table->dropForeign(['signed_kepala_by']);
            $table->dropColumn(['signed_kepala_at', 'signed_kepala_by']);
        });

        Schema::table('notification_settings', function (Blueprint $table) {
            $table->dropColumn('kepala_balai_settings');
        });
    }
};
