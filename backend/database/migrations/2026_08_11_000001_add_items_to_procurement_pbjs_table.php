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
            if (!Schema::hasColumn('procurement_pbjs', 'items')) {
                $table->json('items')->nullable()->after('status_barang');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('procurement_pbjs', function (Blueprint $table) {
            if (Schema::hasColumn('procurement_pbjs', 'items')) {
                $table->dropColumn('items');
            }
        });
    }
};
