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
        Schema::table('exit_permits', function (Blueprint $table) {
            $table->boolean('is_outside_radius')->default(false)->after('status');
            $table->timestamp('returned_radius_at')->nullable()->after('is_outside_radius');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('exit_permits', function (Blueprint $table) {
            $table->dropColumn(['is_outside_radius', 'returned_radius_at']);
        });
    }
};
