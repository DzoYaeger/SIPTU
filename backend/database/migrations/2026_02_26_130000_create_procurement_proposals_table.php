<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('procurement_proposals', function (Blueprint $table) {
            $table->id();
            $table->string('item_name');
            $table->string('brand')->nullable();
            $table->string('volume')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('editing_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('editing_heartbeat_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('procurement_proposals');
    }
};

