<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('panjar_requests', function (Blueprint $table) {
            $table->string('token', 64)->unique()->nullable()->after('ticket_no');
            $table->string('requester_phone', 50)->nullable()->after('penerima_name');
            
            // PPK approval fields
            $table->string('ppk_status', 20)->default('pending')->after('status');
            $table->text('ppk_notes')->nullable()->after('ppk_status');
            $table->timestamp('ppk_action_at')->nullable()->after('ppk_notes');
            $table->foreignId('ppk_user_id')->nullable()->constrained('users')->onDelete('set null')->after('ppk_action_at');

            // Bendahara approval fields
            $table->string('bendahara_status', 20)->default('pending')->after('ppk_user_id');
            $table->text('bendahara_notes')->nullable()->after('bendahara_status');
            $table->timestamp('bendahara_action_at')->nullable()->after('bendahara_notes');
            $table->foreignId('bendahara_user_id')->nullable()->constrained('users')->onDelete('set null')->after('bendahara_action_at');

            // Rejection details
            $table->string('rejection_stage', 30)->nullable()->after('bendahara_user_id');
        });
    }

    public function down(): void
    {
        Schema::table('panjar_requests', function (Blueprint $table) {
            $table->dropForeign(['ppk_user_id']);
            $table->dropForeign(['bendahara_user_id']);
            $table->dropColumn([
                'token',
                'requester_phone',
                'ppk_status',
                'ppk_notes',
                'ppk_action_at',
                'ppk_user_id',
                'bendahara_status',
                'bendahara_notes',
                'bendahara_action_at',
                'bendahara_user_id',
                'rejection_stage',
            ]);
        });
    }
};
