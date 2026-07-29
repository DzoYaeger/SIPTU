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
        Schema::table('procurement_request_items', function (Blueprint $table) {
            if (!Schema::hasColumn('procurement_request_items', 'harga_terbeli')) {
                $table->decimal('harga_terbeli', 15, 2)->nullable()->after('harga_saat_ini');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('procurement_request_items', function (Blueprint $table) {
            if (Schema::hasColumn('procurement_request_items', 'harga_terbeli')) {
                $table->dropColumn('harga_terbeli');
            }
        });
    }
};
