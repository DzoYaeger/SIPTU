<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bmn_loans', function (Blueprint $table) {
            $table->string('loan_type')->default('aset')->after('status'); // 'aset' or 'ruangan'
            $table->time('start_time')->nullable()->after('loan_date');
            $table->time('end_time')->nullable()->after('start_time');
            $table->string('activity_name')->nullable()->after('notes');
        });
    }

    public function down(): void
    {
        Schema::table('bmn_loans', function (Blueprint $table) {
            $table->dropColumn(['loan_type', 'start_time', 'end_time', 'activity_name']);
        });
    }
};
