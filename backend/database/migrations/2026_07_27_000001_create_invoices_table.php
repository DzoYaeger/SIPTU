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
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_no')->unique()->nullable();
            $table->string('invoice_no')->nullable();
            $table->integer('tahun_anggaran')->default(2026);
            $table->string('mak')->nullable();
            $table->text('deskripsi')->nullable();
            $table->decimal('nilai_kotor', 15, 2)->default(0); // Gross total / Total nota
            $table->decimal('total_pajak', 15, 2)->default(0); // Sum of all tax deductions
            $table->decimal('nilai_bersih', 15, 2)->default(0); // Net paid (Gross - Total Tax)
            $table->string('terbilang_bersih')->nullable();
            $table->string('status')->default('pending'); // pending, approved, paid
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('approved_at')->nullable();
            $table->string('ppk_name')->nullable();
            $table->string('ppk_nip')->nullable();
            $table->string('bendahara_name')->nullable();
            $table->string('bendahara_nip')->nullable();
            $table->string('penerima_name')->nullable();
            $table->timestamps();
        });

        Schema::create('invoice_taxes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained('invoices')->onDelete('cascade');
            $table->string('jenis_pajak'); // e.g. PPh 21, PPh 22, PPh 23, PPN 11%, PPh Final 0.5%, etc.
            $table->string('tax_type')->default('percentage'); // percentage or fixed
            $table->decimal('tax_rate', 8, 2)->default(0); // e.g. 11.00 for 11%
            $table->decimal('nilai_pajak', 15, 2)->default(0);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoice_taxes');
        Schema::dropIfExists('invoices');
    }
};
