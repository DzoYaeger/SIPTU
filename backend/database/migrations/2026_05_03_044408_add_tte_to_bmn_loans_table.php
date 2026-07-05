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
        Schema::table('bmn_loans', function (Blueprint $table) {
            $table->uuid('requester_signature_token')->nullable()->after('requester_signature');
            $table->timestamp('requester_signed_at')->nullable()->after('requester_signature_token');
            $table->uuid('validator_signature_token')->nullable()->after('validator_signature');
            $table->timestamp('validator_signed_at')->nullable()->after('validator_signature_token');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bmn_loans', function (Blueprint $table) {
            $table->dropColumn([
                'requester_signature_token',
                'requester_signed_at',
                'validator_signature_token',
                'validator_signed_at'
            ]);
        });
    }
};
