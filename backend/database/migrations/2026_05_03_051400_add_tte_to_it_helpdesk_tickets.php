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
            $table->string('reporter_signature_token')->nullable()->after('reporter_signature');
            $table->timestamp('reporter_signed_at')->nullable()->after('reporter_signature_token');
            $table->string('it_staff_signature_token')->nullable()->after('it_staff_signature');
            $table->timestamp('it_staff_signed_at')->nullable()->after('it_staff_signature_token');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('it_helpdesk_tickets', function (Blueprint $table) {
            $table->dropColumn([
                'reporter_signature_token',
                'reporter_signed_at',
                'it_staff_signature_token',
                'it_staff_signed_at'
            ]);
        });
    }
};
