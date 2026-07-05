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
        Schema::table('procurement_proposals', function (Blueprint $table) {
            $table->string('status')->default('pending')->after('jumlah');
            $table->foreignId('converted_pdtt_item_id')->nullable()->after('status')->constrained('pdtt_items')->nullOnDelete();
            $table->timestamp('converted_at')->nullable()->after('converted_pdtt_item_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('procurement_proposals', function (Blueprint $table) {
            $table->dropForeign(['converted_pdtt_item_id']);
            $table->dropColumn(['status', 'converted_pdtt_item_id', 'converted_at']);
        });
    }
};
