<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lpj_items', function (Blueprint $table) {
            $table->decimal('uang_transport_sewa_mobil', 15, 2)->nullable()->after('uang_transport_bbm');
        });
    }

    public function down(): void
    {
        Schema::table('lpj_items', function (Blueprint $table) {
            $table->dropColumn('uang_transport_sewa_mobil');
        });
    }
};
