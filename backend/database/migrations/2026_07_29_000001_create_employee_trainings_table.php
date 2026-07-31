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
        Schema::create('employee_trainings', function (Blueprint $table) {
            $table->id();
            $table->string('no_undangan')->nullable()->index();
            $table->string('nama')->nullable();
            $table->string('nip')->nullable()->index();
            $table->string('fungsi')->nullable()->index();
            $table->string('jenis_pelatihan')->nullable();
            $table->text('judul_pelatihan')->nullable();
            $table->string('tanggal_pelatihan')->nullable();
            $table->string('tempat_pelatihan')->nullable();
            $table->string('narasumber')->nullable();
            $table->string('jumlah_peserta')->nullable();
            $table->string('pre_test')->nullable();
            $table->string('post_test')->nullable();
            $table->string('peningkatan_nilai')->nullable();
            $table->string('kepuasan_peserta')->nullable();
            $table->string('dokumentasi')->nullable();
            $table->text('hasil_evaluasi')->nullable();
            $table->text('keterangan')->nullable();
            $table->string('progress')->nullable()->index();
            $table->boolean('ceklis_diseminasi')->default(false);
            $table->boolean('akan_diseminasi')->default(false);
            $table->string('raw_hash')->nullable();
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_trainings');
    }
};
