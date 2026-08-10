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
        Schema::table('rhpk_output_targets', function (Blueprint $table) {
            $table->decimal('initial_target', 14, 4)->default(1.0000)->change();
            $table->decimal('revised_target', 14, 4)->default(1.0000)->change();
            $table->decimal('target_jan', 14, 4)->default(0.0000)->change();
            $table->decimal('target_feb', 14, 4)->default(0.0000)->change();
            $table->decimal('target_mar', 14, 4)->default(0.0000)->change();
            $table->decimal('target_apr', 14, 4)->default(0.0000)->change();
            $table->decimal('target_may', 14, 4)->default(0.0000)->change();
            $table->decimal('target_jun', 14, 4)->default(0.0000)->change();
            $table->decimal('target_jul', 14, 4)->default(0.0000)->change();
            $table->decimal('target_aug', 14, 4)->default(0.0000)->change();
            $table->decimal('target_sep', 14, 4)->default(0.0000)->change();
            $table->decimal('target_oct', 14, 4)->default(0.0000)->change();
            $table->decimal('target_nov', 14, 4)->default(0.0000)->change();
            $table->decimal('target_dec', 14, 4)->default(0.0000)->change();
        });

        Schema::table('rhpk_output_realizations', function (Blueprint $table) {
            $table->decimal('realization_value', 14, 4)->default(0.0000)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rhpk_output_targets', function (Blueprint $table) {
            $table->integer('initial_target')->default(1)->change();
            $table->integer('revised_target')->default(1)->change();
            $table->integer('target_jan')->default(0)->change();
            $table->integer('target_feb')->default(0)->change();
            $table->integer('target_mar')->default(0)->change();
            $table->integer('target_apr')->default(0)->change();
            $table->integer('target_may')->default(0)->change();
            $table->integer('target_jun')->default(0)->change();
            $table->integer('target_jul')->default(0)->change();
            $table->integer('target_aug')->default(0)->change();
            $table->integer('target_sep')->default(0)->change();
            $table->integer('target_oct')->default(0)->change();
            $table->integer('target_nov')->default(0)->change();
            $table->integer('target_dec')->default(0)->change();
        });

        Schema::table('rhpk_output_realizations', function (Blueprint $table) {
            $table->integer('realization_value')->default(0)->change();
        });
    }
};
