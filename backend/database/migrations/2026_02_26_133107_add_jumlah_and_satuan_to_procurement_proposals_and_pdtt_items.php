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
        Schema::table('procurement_proposals', function (Blueprint $table) {
            $table->renameColumn('volume', 'satuan');
            $table->integer('jumlah')->after('brand')->nullable();
        });

        Schema::table('pdtt_items', function (Blueprint $table) {
            $table->renameColumn('volume', 'satuan');
            $table->integer('jumlah')->after('brand')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pdtt_items', function (Blueprint $table) {
            $table->renameColumn('satuan', 'volume');
            $table->dropColumn('jumlah');
        });

        Schema::table('procurement_proposals', function (Blueprint $table) {
            $table->renameColumn('satuan', 'volume');
            $table->dropColumn('jumlah');
        });
    }
};
