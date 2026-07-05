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
        Schema::table('it_helpdesk_tickets', function (Blueprint $table) {
            $table->foreignId('employee_id')->nullable()->change();
            $table->foreignId('created_by')->nullable()->change();
            $table->string('employee_nip', 50)->nullable()->after('employee_name');
            $table->longText('reporter_signature')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('it_helpdesk_tickets', function (Blueprint $table) {
            // Cannot easily revert nullable constraint without potential data issues,
            // but we can attempt to strict them back if needed.
            // For now, we will just drop the new column.
            $table->dropColumn('employee_nip');
            // Revert signature to json if possible, but longText is compatible
        });
    }
};
