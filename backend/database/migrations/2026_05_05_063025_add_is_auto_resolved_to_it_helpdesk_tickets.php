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
            $table->boolean('is_auto_resolved')->default(false)->after('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('it_helpdesk_tickets', function (Blueprint $table) {
            $table->dropColumn('is_auto_resolved');
        });
    }
};
