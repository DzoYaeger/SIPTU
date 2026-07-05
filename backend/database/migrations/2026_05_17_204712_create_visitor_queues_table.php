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
        Schema::create('visitor_queues', function (Blueprint $table) {
            $table->id();
            $table->string('visitor_name');
            $table->string('institution_name')->nullable();
            $table->string('phone')->nullable();
            $table->string('counter_code', 2);
            $table->integer('queue_number');
            $table->enum('status', ['waiting', 'called', 'served', 'skipped'])->default('waiting');
            $table->date('date');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('visitor_queues');
    }
};
