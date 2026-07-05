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
        Schema::table('surat_tugas', function (Blueprint $table) {
            $table->string('signature_token')->nullable()->unique()->after('status');
            $table->timestamp('signed_at')->nullable()->after('signature_token');
            $table->unsignedBigInteger('signed_by')->nullable()->after('signed_at');
            
            $table->foreign('signed_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('surat_tugas', function (Blueprint $table) {
            $table->dropForeign(['signed_by']);
            $table->dropColumn(['signature_token', 'signed_at', 'signed_by']);
        });
    }
};
