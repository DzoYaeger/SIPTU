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
        Schema::table('lpj_items', function (Blueprint $table) {
            $table->integer('uang_fullboard')->nullable()->after('uang_penginapan');
            $table->integer('uang_fullboard_hari')->nullable()->after('uang_fullboard');
            $table->integer('uang_fullboard_harian')->nullable()->after('uang_fullboard_hari');
            $table->integer('uang_harian_fullboard')->nullable()->after('uang_fullboard_harian');
            $table->integer('uang_harian_fullboard_hari')->nullable()->after('uang_harian_fullboard');
            $table->integer('uang_harian_fullboard_per_hari')->nullable()->after('uang_harian_fullboard_hari');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lpj_items', function (Blueprint $table) {
            $table->dropColumn([
                'uang_fullboard',
                'uang_fullboard_hari',
                'uang_fullboard_harian',
                'uang_harian_fullboard',
                'uang_harian_fullboard_hari',
                'uang_harian_fullboard_per_hari'
            ]);
        });
    }
};
