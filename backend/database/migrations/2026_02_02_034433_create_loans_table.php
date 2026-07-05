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
        Schema::create('loans', function (Blueprint $table) {
            $table->id();
            $table->string('loan_number')->unique(); // Unique loan identifier
            $table->foreignId('asset_id')->constrained('assets')->onDelete('cascade');
            $table->string('asset_name'); // Store asset name separately for historical reference
            $table->foreignId('borrower_id')->constrained('employees')->onDelete('cascade');
            $table->string('borrower_name'); // Store borrower name separately for historical reference
            $table->date('loan_date');
            $table->date('due_date');
            $table->date('return_date')->nullable();
            $table->enum('status', ['diajukan', 'disetujui', 'aktif', 'dikembalikan', 'terlambat'])->default('diajukan');
            $table->text('purpose')->nullable(); // Purpose of the loan
            $table->text('notes')->nullable();
            $table->string('loan_officer')->nullable(); // Name of the officer who processed the loan
            $table->string('approver')->nullable(); // Name of the person who approved the loan
            $table->json('signatures')->nullable(); // JSON for storing signature data
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('loans');
    }
};
