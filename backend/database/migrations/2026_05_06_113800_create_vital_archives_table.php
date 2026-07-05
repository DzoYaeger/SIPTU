<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('vital_archives', function (Blueprint $table) {
            $table->id();
            $table->string('jenis_arsip');
            $table->foreignId('archive_unit_id')->nullable()->constrained('archive_units')->onDelete('set null');
            $table->string('kurun_waktu');
            $table->string('media'); // Hard File, Soft File, Hard File dan Soft File
            $table->string('jumlah');
            $table->string('jangka_simpan'); // 1-5 Tahun, Permanent, etc.
            $table->string('metode_perlindungan'); // Duplikat, Alih Media
            $table->string('lokasi_simpan');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('vital_archives');
    }
};
