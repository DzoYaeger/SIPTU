<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_requests', function (Blueprint $table) {
            $table->id();
            $table->string('spb_number')->unique();
            $table->string('sbbk_number')->nullable()->unique();
            $table->uuid('token')->unique();

            // Requester info
            $table->foreignId('requester_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->string('requester_nip');
            $table->string('requester_name');
            $table->string('requester_function')->nullable();
            $table->string('requester_phone')->nullable();

            $table->text('purpose')->nullable();
            $table->longText('requester_signature');

            // Status & approval
            $table->enum('status', ['pengajuan', 'disetujui', 'ditolak'])->default('pengajuan');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->text('approval_notes')->nullable();

            $table->timestamps();
        });

        Schema::create('inventory_request_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_request_id')->constrained('inventory_requests')->cascadeOnDelete();
            $table->foreignId('inventory_id')->nullable()->constrained('inventories')->nullOnDelete();
            $table->string('item_name');
            $table->string('unit')->default('Pcs');
            $table->unsignedInteger('qty_requested');
            $table->unsignedInteger('qty_approved')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_request_items');
        Schema::dropIfExists('inventory_requests');
    }
};
