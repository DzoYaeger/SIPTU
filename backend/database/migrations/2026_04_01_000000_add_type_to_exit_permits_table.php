<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('exit_permits', function (Blueprint $table) {
            $table->string('permit_type', 20)->default('Pribadi')->after('reason');
        });
    }

    public function down(): void
    {
        Schema::table('exit_permits', function (Blueprint $table) {
            $table->dropColumn('permit_type');
        });
    }
};
