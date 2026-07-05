<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('letters', function (Blueprint $table) {
            $table->unsignedBigInteger('archive_unit_id')
                  ->nullable()
                  ->after('id')
                  ->index()
                  ->comment('FK ke tabel archive_units — menentukan UP/UK pemilik surat');
        });
    }

    public function down(): void
    {
        Schema::table('letters', function (Blueprint $table) {
            $table->dropColumn('archive_unit_id');
        });
    }
};
