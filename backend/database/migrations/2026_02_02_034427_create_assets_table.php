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
        Schema::create('assets', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('category');
            $table->integer('quantity')->default(1);
            $table->string('location');
            $table->enum('status', ['tersedia', 'dipinjam', 'rusak', 'hilang'])->default('tersedia');
            $table->string('asset_code')->nullable(); // Unique asset identifier
            $table->string('brand')->nullable();
            $table->string('model')->nullable();
            $table->year('year_of_purchase')->nullable();
            $table->decimal('purchase_price', 15, 2)->nullable(); // Using decimal for price
            $table->text('description')->nullable();
            $table->json('specifications')->nullable(); // JSON for technical specs
            $table->enum('condition', ['baru', 'bekas', 'rusak'])->default('baru');
            $table->date('warranty_expiry')->nullable();
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assets');
    }
};
