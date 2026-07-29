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
        Schema::table('procurement_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('procurement_requests', 'fulfillment_status')) {
                $table->string('fulfillment_status')->default('unfulfilled')->after('status')->comment('unfulfilled, partial, fulfilled');
            }
        });

        Schema::table('procurement_request_items', function (Blueprint $table) {
            if (!Schema::hasColumn('procurement_request_items', 'jumlah_terbeli')) {
                $table->integer('jumlah_terbeli')->default(0)->after('jumlah');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('procurement_requests', function (Blueprint $table) {
            if (Schema::hasColumn('procurement_requests', 'fulfillment_status')) {
                $table->dropColumn('fulfillment_status');
            }
        });

        Schema::table('procurement_request_items', function (Blueprint $table) {
            if (Schema::hasColumn('procurement_request_items', 'jumlah_terbeli')) {
                $table->dropColumn('jumlah_terbeli');
            }
        });
    }
};
