<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('panjar_requests', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_no')->unique()->nullable();
            $table->string('panjar_no')->nullable();
            $table->integer('tahun_anggaran')->default(2026);
            $table->date('tanggal_pengajuan')->nullable();
            $table->string('mak')->nullable();
            $table->string('kegiatan')->nullable();
            $table->text('uraian')->nullable();
            $table->string('penerima_name')->nullable();
            $table->decimal('nominal_panjar', 15, 2)->default(0);
            $table->string('terbilang_panjar')->nullable();
            $table->string('status')->default('draft');
            $table->string('ppk_name')->nullable();
            $table->string('ppk_nip')->nullable();
            $table->string('bendahara_name')->nullable();
            $table->string('bendahara_nip')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
        });

        Schema::create('panjar_request_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('panjar_request_id')->constrained('panjar_requests')->onDelete('cascade');
            $table->string('uraian');
            $table->decimal('volume', 12, 2)->default(1);
            $table->string('satuan')->nullable();
            $table->decimal('harga_satuan', 15, 2)->default(0);
            $table->decimal('jumlah', 15, 2)->default(0);
            $table->text('keterangan')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('panjar_request_items');
        Schema::dropIfExists('panjar_requests');
    }
};