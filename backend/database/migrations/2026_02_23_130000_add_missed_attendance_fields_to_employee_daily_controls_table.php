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
        Schema::table('employee_daily_controls', function (Blueprint $table) {
            $table->boolean('violation_missed_checkin')
                ->default(false)
                ->after('exit_early_minutes');
            $table->integer('missed_checkin_minutes')
                ->default(0)
                ->after('violation_missed_checkin');
            $table->boolean('violation_missed_checkout')
                ->default(false)
                ->after('missed_checkin_minutes');
            $table->integer('missed_checkout_minutes')
                ->default(0)
                ->after('violation_missed_checkout');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employee_daily_controls', function (Blueprint $table) {
            $table->dropColumn([
                'violation_missed_checkin',
                'missed_checkin_minutes',
                'violation_missed_checkout',
                'missed_checkout_minutes',
            ]);
        });
    }
};
