<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('kkp_headers')) {
            Schema::create('kkp_headers', function (Blueprint $table) {
                $table->id();
                $table->foreignId('surat_tugas_id')
                      ->unique()
                      ->constrained('surat_tugas')
                      ->onDelete('cascade');
                $table->enum('status', ['draft', 'final', 'manual'])->default('draft');
                $table->text('keterangan')->nullable();
                $table->foreignId('bendahara_id')
                      ->nullable()
                      ->constrained('employees')
                      ->onDelete('set null');
                $table->foreignId('created_by')
                      ->nullable()
                      ->constrained('users')
                      ->onDelete('set null');
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('kkp_items')) {
            Schema::create('kkp_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('kkp_header_id')
                      ->constrained('kkp_headers')
                      ->onDelete('cascade');
                $table->foreignId('employee_id')
                      ->nullable()
                      ->constrained('employees')
                      ->onDelete('set null');
                $table->string('employee_name');
                $table->string('employee_nip')->nullable();
                $table->boolean('is_external')->default(false);
                $table->string('nomor_spd')->nullable();
                $table->string('nama_hotel')->nullable();
                $table->string('nomor_kamar')->nullable();

                // Komponen Biaya KKP
                $table->decimal('uang_harian', 15, 2)->nullable();
                $table->integer('uang_harian_hari')->nullable();
                $table->decimal('uang_harian_per_hari', 15, 2)->nullable();
                $table->text('uang_harian_keterangan')->nullable();

                $table->decimal('uang_penginapan', 15, 2)->nullable();
                $table->decimal('uang_penginapan_harian', 15, 2)->nullable();
                $table->integer('uang_penginapan_hari')->nullable();
                $table->text('uang_penginapan_keterangan')->nullable();

                $table->decimal('uang_transport_taxi', 15, 2)->nullable();
                $table->decimal('uang_transport_taxi_berangkat', 15, 2)->nullable();
                $table->decimal('uang_transport_taxi_pulang', 15, 2)->nullable();
                $table->text('uang_transport_taxi_keterangan')->nullable();

                $table->decimal('uang_transport_bus', 15, 2)->nullable();
                $table->decimal('uang_transport_bus_berangkat', 15, 2)->nullable();
                $table->decimal('uang_transport_bus_pulang', 15, 2)->nullable();
                $table->text('uang_transport_bus_keterangan')->nullable();

                $table->decimal('uang_transport_bbm', 15, 2)->nullable();
                $table->text('uang_transport_bbm_keterangan')->nullable();

                $table->decimal('uang_transport_sewa_mobil', 15, 2)->nullable();
                $table->decimal('uang_transport_sewa_mobil_harian', 15, 2)->nullable();
                $table->integer('uang_transport_sewa_mobil_hari')->nullable();
                $table->text('uang_transport_sewa_mobil_keterangan')->nullable();

                $table->decimal('uang_transport_pesawat', 15, 2)->nullable();
                $table->decimal('uang_transport_pesawat_berangkat', 15, 2)->nullable();
                $table->decimal('uang_transport_pesawat_pulang', 15, 2)->nullable();
                $table->text('uang_transport_pesawat_keterangan')->nullable();

                $table->decimal('uang_fullboard', 15, 2)->nullable();
                $table->integer('uang_fullboard_hari')->nullable();
                $table->decimal('uang_fullboard_harian', 15, 2)->nullable();
                $table->text('uang_fullboard_keterangan')->nullable();

                $table->decimal('uang_harian_fullboard', 15, 2)->nullable();
                $table->integer('uang_harian_fullboard_hari')->nullable();
                $table->decimal('uang_harian_fullboard_per_hari', 15, 2)->nullable();
                $table->text('uang_harian_fullboard_keterangan')->nullable();

                $table->decimal('uang_transport_lokal', 15, 2)->nullable();
                $table->decimal('uang_transport_lokal_harian', 15, 2)->nullable();
                $table->integer('uang_transport_lokal_hari')->nullable();
                $table->text('uang_transport_lokal_keterangan')->nullable();

                $table->decimal('uang_transport_umum', 15, 2)->nullable();
                $table->decimal('uang_transport_umum_berangkat', 15, 2)->nullable();
                $table->decimal('uang_transport_umum_pulang', 15, 2)->nullable();
                $table->text('uang_transport_umum_keterangan')->nullable();

                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('kkp_items');
        Schema::dropIfExists('kkp_headers');
    }
};
