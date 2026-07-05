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
            $table->decimal('entry_late_minutes', 8, 2)->default(0)->change();
            $table->decimal('exit_early_minutes', 8, 2)->default(0)->change();
        });

        // Defensive check: Add violation_missed_checkin if it doesn't exist
        if (!Schema::hasColumn('employee_daily_controls', 'violation_missed_checkin')) {
            Schema::table('employee_daily_controls', function (Blueprint $table) {
                $table->boolean('violation_missed_checkin')->default(false)->after('exit_early_minutes');
            });
        }
        
        // Defensive check: Add or change missed_checkin_minutes
        if (!Schema::hasColumn('employee_daily_controls', 'missed_checkin_minutes')) {
            Schema::table('employee_daily_controls', function (Blueprint $table) {
                $table->decimal('missed_checkin_minutes', 8, 2)->default(0)->after('violation_missed_checkin');
            });
        } else {
            Schema::table('employee_daily_controls', function (Blueprint $table) {
                $table->decimal('missed_checkin_minutes', 8, 2)->default(0)->change();
            });
        }

        // Defensive check: Add violation_missed_checkout if it doesn't exist
        if (!Schema::hasColumn('employee_daily_controls', 'violation_missed_checkout')) {
            Schema::table('employee_daily_controls', function (Blueprint $table) {
                $table->boolean('violation_missed_checkout')->default(false)->after('missed_checkin_minutes');
            });
        }

        // Defensive check: Add or change missed_checkout_minutes
        if (!Schema::hasColumn('employee_daily_controls', 'missed_checkout_minutes')) {
            Schema::table('employee_daily_controls', function (Blueprint $table) {
                $table->decimal('missed_checkout_minutes', 8, 2)->default(0)->after('violation_missed_checkout');
            });
        } else {
            Schema::table('employee_daily_controls', function (Blueprint $table) {
                $table->decimal('missed_checkout_minutes', 8, 2)->default(0)->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employee_daily_controls', function (Blueprint $table) {
            $table->integer('entry_late_minutes')->default(0)->change();
            $table->integer('exit_early_minutes')->default(0)->change();
            $table->integer('missed_checkin_minutes')->default(0)->change();
            $table->integer('missed_checkout_minutes')->default(0)->change();
        });
    }
};
