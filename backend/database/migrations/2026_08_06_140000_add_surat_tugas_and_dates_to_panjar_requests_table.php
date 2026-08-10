<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('panjar_requests', function (Blueprint $table) {
            $table->string('surat_tugas_no')->nullable()->after('penerima_name');
            $table->date('tanggal_mulai_kegiatan')->nullable()->after('tanggal_pengajuan');
            $table->date('tanggal_akhir_kegiatan')->nullable()->after('tanggal_mulai_kegiatan');
            $table->date('tanggal_paling_lambat')->nullable()->after('tanggal_akhir_kegiatan');
        });
    }

    public function down(): void
    {
        Schema::table('panjar_requests', function (Blueprint $table) {
            $table->dropColumn(['surat_tugas_no', 'tanggal_mulai_kegiatan', 'tanggal_akhir_kegiatan', 'tanggal_paling_lambat']);
        });
    }
};