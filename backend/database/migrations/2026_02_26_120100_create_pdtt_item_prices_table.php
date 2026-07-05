<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('pdtt_item_prices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pdtt_item_id')->constrained('pdtt_items')->cascadeOnDelete();
            $table->date('period_start');
            $table->decimal('price', 18, 2);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['pdtt_item_id', 'period_start']);
            $table->index('period_start');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pdtt_item_prices');
    }
};

