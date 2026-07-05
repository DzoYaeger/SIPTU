<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('exit_permits', function (Blueprint $table) {
            $table->boolean('return_recorded_by_admin')->default(false)->after('status');
            $table->unsignedBigInteger('return_recorded_by_user_id')->nullable()->after('return_recorded_by_admin');
            $table->string('return_recorded_note', 255)->nullable()->after('return_recorded_by_user_id');

            $table->index('return_recorded_by_admin');
            $table->index('return_recorded_by_user_id');
        });
    }

    public function down(): void
    {
        Schema::table('exit_permits', function (Blueprint $table) {
            $table->dropIndex(['return_recorded_by_admin']);
            $table->dropIndex(['return_recorded_by_user_id']);
            $table->dropColumn([
                'return_recorded_by_admin',
                'return_recorded_by_user_id',
                'return_recorded_note',
            ]);
        });
    }
};
