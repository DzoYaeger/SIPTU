<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('archive_loans', function (Blueprint $table) {
            $table->text('borrower_signature')->nullable()->after('archive_number');
            $table->text('return_signature')->nullable()->after('borrower_signature');
            $table->timestamp('return_requested_at')->nullable()->after('return_signature');
            $table->timestamp('approved_at')->nullable()->after('return_requested_at');
        });
    }

    public function down(): void
    {
        Schema::table('archive_loans', function (Blueprint $table) {
            $table->dropColumn(['borrower_signature', 'return_signature', 'return_requested_at', 'approved_at']);
        });
    }
};
