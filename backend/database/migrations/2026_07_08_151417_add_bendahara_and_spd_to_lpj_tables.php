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
        Schema::table('lpj_headers', function (Blueprint $table) {
            $table->unsignedBigInteger('bendahara_id')->nullable()->after('created_by');
            $table->foreign('bendahara_id')->references('id')->on('employees')->nullOnDelete();
        });

        Schema::table('lpj_items', function (Blueprint $table) {
            $table->string('nomor_spd')->nullable()->after('is_external');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lpj_headers', function (Blueprint $table) {
            $table->dropForeign(['bendahara_id']);
            $table->dropColumn('bendahara_id');
        });

        Schema::table('lpj_items', function (Blueprint $table) {
            $table->dropColumn('nomor_spd');
        });
    }
};
