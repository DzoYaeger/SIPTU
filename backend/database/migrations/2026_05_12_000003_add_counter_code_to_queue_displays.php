<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('queue_displays', function (Blueprint $table) {
            $table->string('counter_code', 1)->default('A')->after('id');
            $table->unique('counter_code');
        });

        // Create counter B if only A exists
        $existing = \DB::table('queue_displays')->first();
        if ($existing) {
            \DB::table('queue_displays')->where('id', $existing->id)->update(['counter_code' => 'A']);
            // Create counter B
            \DB::table('queue_displays')->insert([
                'counter_code' => 'B',
                'current_number' => 0,
                'counter_name' => 'ULPK',
                'status' => 'closed',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('queue_displays', function (Blueprint $table) {
            $table->dropUnique(['counter_code']);
            $table->dropColumn('counter_code');
        });
    }
};
