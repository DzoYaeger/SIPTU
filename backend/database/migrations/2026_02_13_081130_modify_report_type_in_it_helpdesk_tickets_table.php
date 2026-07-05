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
            $table->string('report_type', 255)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('it_helpdesk_tickets', function (Blueprint $table) {
            // Revert back to enum if needed, though data loss might occur for non-enum values
            // Ideally we keep it string or handle conversion.
            // For now, let's keep it string to avoid data loss on rollback or defining previous state perfectly.
            // Or try to revert:
            // $table->enum('report_type', ['hardware', 'software', 'network', 'other'])->default('other')->change();
        });
    }
};
