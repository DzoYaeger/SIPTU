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
        Schema::create('bmn_loans', function (Blueprint $table) {
            $table->id();
            $table->string('token')->unique();
            $table->string('spa_number')->unique();
            $table->foreignId('borrower_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->string('borrower_nip')->nullable();
            $table->string('borrower_name');
            $table->string('borrower_function')->nullable();
            $table->string('borrower_phone')->nullable();
            $table->date('loan_date');
            $table->date('return_date');
            $table->string('location')->nullable();
            $table->text('notes')->nullable();
            $table->enum('status', ['pengajuan', 'dipinjam', 'dikembalikan'])->default('pengajuan');
            $table->longText('requester_signature')->nullable();
            $table->longText('validator_signature')->nullable();
            $table->json('assets')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bmn_loans');
    }
};

