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
        Schema::table('procurement_pbjs', function (Blueprint $table) {
            $table->string('file_surat_pesanan')->nullable()->after('tanggal_bast');
            $table->string('file_bast')->nullable()->after('file_surat_pesanan');
            $table->string('file_invoice')->nullable()->after('file_bast');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('procurement_pbjs', function (Blueprint $table) {
            $table->dropColumn(['file_surat_pesanan', 'file_bast', 'file_invoice']);
        });
    }
};
