<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE bmn_loans MODIFY COLUMN status ENUM('pengajuan', 'dipinjam', 'dikembalikan', 'pengajuan-pengembalian', 'ditolak') DEFAULT 'pengajuan'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Warning: This will fail if there are records with the new status values
        DB::statement("ALTER TABLE bmn_loans MODIFY COLUMN status ENUM('pengajuan', 'dipinjam', 'dikembalikan') DEFAULT 'pengajuan'");
    }
};
