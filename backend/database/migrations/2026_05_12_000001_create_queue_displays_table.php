<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('queue_displays', function (Blueprint $table) {
            $table->id();
            $table->integer('current_number')->default(0);
            $table->unsignedBigInteger('employee_id')->nullable();
            $table->string('employee_name')->nullable();
            $table->string('employee_photo')->nullable();
            $table->string('counter_name')->default('ULPK');
            $table->enum('status', ['active', 'closed'])->default('closed');
            $table->text('ticker_text')->nullable();
            $table->json('slideshow')->nullable();
            $table->timestamps();

            $table->foreign('employee_id')->references('id')->on('employees')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('queue_displays');
    }
};
