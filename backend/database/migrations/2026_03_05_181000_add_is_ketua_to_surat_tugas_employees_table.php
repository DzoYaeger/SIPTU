<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('surat_tugas', function (Blueprint $table) {
            $table->unsignedBigInteger('ketua_tim_id')->nullable()->after('created_by');
            $table->foreign('ketua_tim_id')->references('id')->on('employees')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('surat_tugas', function (Blueprint $table) {
            $table->dropForeign(['ketua_tim_id']);
            $table->dropColumn('ketua_tim_id');
        });
    }
};
