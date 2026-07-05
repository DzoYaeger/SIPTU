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
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('procurement_request_items');
        Schema::create('procurement_request_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('procurement_request_id');
            $table->foreign('procurement_request_id')->references('id')->on('procurement_requests')->onDelete('cascade');
            
            $table->unsignedBigInteger('pdtt_item_id');
            $table->foreign('pdtt_item_id')->references('id')->on('pdtt_items')->onDelete('cascade');
            $table->integer('jumlah')->nullable();
            $table->decimal('harga_saat_ini', 15, 2)->nullable();
            $table->timestamps();
        });
        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('procurement_request_items');
        Schema::enableForeignKeyConstraints();
    }
};
