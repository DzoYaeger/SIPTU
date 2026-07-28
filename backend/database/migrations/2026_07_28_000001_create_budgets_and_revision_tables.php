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
        Schema::create('budgets', function (Blueprint $table) {
            $table->id();
            $table->string('mak')->unique();
            $table->text('deskripsi')->nullable();
            $table->decimal('anggaran', 18, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('revision_tickets', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_no')->unique();
            $table->timestamp('tanggal_ticket')->useCurrent();
            $table->string('status')->default('Menunggu'); // Menunggu, Selesai, Ditolak
            $table->text('catatan')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('tanggal_diproses')->nullable();
            $table->timestamp('tanggal_selesai')->nullable();
            $table->timestamps();
        });

        Schema::create('revision_ticket_adjustments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('revision_ticket_id')->constrained('revision_tickets')->onDelete('cascade');
            $table->string('mak');
            $table->string('tipe'); // Tambah Anggaran, Kurang Anggaran
            $table->decimal('nilai', 18, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('budget_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('budget_id')->constrained('budgets')->onDelete('cascade');
            $table->timestamp('tanggal')->useCurrent();
            $table->string('keterangan')->nullable();
            $table->decimal('perubahan', 18, 2)->default(0); // positive for addition, negative for reduction
            $table->string('status')->default('Disetujui');
            $table->foreignId('revision_ticket_id')->nullable()->constrained('revision_tickets')->onDelete('set null');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('budget_histories');
        Schema::dropIfExists('revision_ticket_adjustments');
        Schema::dropIfExists('revision_tickets');
        Schema::dropIfExists('budgets');
    }
};
