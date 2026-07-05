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
        Schema::table('archive_loans', function (Blueprint $col) {
            $col->timestamp('borrower_signed_at')->nullable();
            $col->timestamp('admin_signed_at')->nullable();
            $col->timestamp('return_borrower_signed_at')->nullable();
            $col->timestamp('return_admin_signed_at')->nullable();
            $col->string('signature_token')->nullable()->unique();
            $col->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $col->foreignId('return_approved_by')->nullable()->constrained('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('archive_loans', function (Blueprint $col) {
            $col->dropColumn([
                'borrower_signed_at',
                'admin_signed_at',
                'return_borrower_signed_at',
                'return_admin_signed_at',
                'signature_token'
            ]);
        });
    }
};
