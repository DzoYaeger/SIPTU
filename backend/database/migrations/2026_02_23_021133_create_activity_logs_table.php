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
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->string('user_name')->nullable();
            $table->string('user_nip')->nullable();
            
            $table->string('module')->index(); // e.g. 'kepegawaian', 'bmn', 'system'
            $table->string('action'); // e.g. 'login', 'create', 'update', 'submit', 'approve'
            $table->text('description')->nullable();
            $table->string('ticket_number')->nullable()->index(); // optional correlation
            
            // Polymorphic relation to the specific record if needed
            $table->string('model_type')->nullable();
            $table->unsignedBigInteger('model_id')->nullable();
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
