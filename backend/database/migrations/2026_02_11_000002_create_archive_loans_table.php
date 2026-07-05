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
        Schema::create('archive_loans', function (Blueprint $table) {
            $table->id();
            $table->string('request_number')->unique();
            $table->date('borrow_date');
            $table->string('borrower_name');
            $table->string('borrower_nip')->nullable();
            $table->string('borrower_work_unit')->nullable();
            $table->foreignId('archive_unit_id')->nullable()->constrained('archive_units')->nullOnDelete();
            $table->string('archive_number');
            $table->string('status')->default('menunggu_paraf');
            $table->string('public_token')->unique();
            $table->string('return_token')->nullable()->unique();
            $table->date('return_date')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('archive_loans');
    }
};
