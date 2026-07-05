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
        Schema::create('requests', function (Blueprint $table) {
            $table->id();
            $table->string('request_number')->unique(); // Unique request identifier
            $table->string('item_name');
            $table->integer('quantity');
            $table->string('unit')->nullable(); // Unit of measurement
            $table->foreignId('requester_id')->constrained('employees')->onDelete('cascade');
            $table->string('requester_name'); // Store requester name separately for historical reference
            $table->text('purpose')->nullable(); // Purpose of the request
            $table->enum('status', ['diajukan', 'disetujui', 'ditolak', 'selesai'])->default('diajukan');
            $table->text('approval_notes')->nullable(); // Notes from approver
            $table->date('requested_date');
            $table->date('approved_date')->nullable();
            $table->date('fulfilled_date')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('fulfilled_by')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('requests');
    }
};
