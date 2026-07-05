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
        Schema::create('inventories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('category');
            $table->integer('quantity');
            $table->string('unit'); // satuan (buah, rim, pack, dll)
            $table->string('location');
            $table->decimal('price_per_unit', 15, 2)->nullable();
            $table->date('last_updated')->nullable();
            $table->text('description')->nullable();
            $table->enum('status', ['tersedia', 'habis'])->default('tersedia');
            $table->foreignId('updated_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventories');
    }
};
