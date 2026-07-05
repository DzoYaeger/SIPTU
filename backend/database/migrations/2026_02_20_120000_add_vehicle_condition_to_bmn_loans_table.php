<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bmn_loans', function (Blueprint $table) {
            // Saat persetujuan: tipe aset & kondisi
            $table->boolean('is_vehicle')->nullable()->after('approved_at')
                  ->comment('true = Aset Kendaraan, false = Bukan Kendaraan');
            $table->string('kondisi_barang_pinjam')->nullable()->after('is_vehicle')
                  ->comment('Kondisi saat dipinjam: Baik / Baik Dengan Keterangan');
            $table->json('kondisi_kendaraan_pinjam')->nullable()->after('kondisi_barang_pinjam')
                  ->comment('JSON: {bbm, oli, minyak_rem, ban, air_radiator, air_aki} saat dipinjam');

            // Saat pengembalian
            $table->string('kondisi_barang_kembali')->nullable()->after('kondisi_kendaraan_pinjam')
                  ->comment('Kondisi saat dikembalikan');
            $table->json('kondisi_kendaraan_kembali')->nullable()->after('kondisi_barang_kembali')
                  ->comment('JSON: {bbm, oli, minyak_rem, ban, air_radiator, air_aki} saat dikembalikan');
        });
    }

    public function down(): void
    {
        Schema::table('bmn_loans', function (Blueprint $table) {
            $table->dropColumn([
                'is_vehicle',
                'kondisi_barang_pinjam',
                'kondisi_kendaraan_pinjam',
                'kondisi_barang_kembali',
                'kondisi_kendaraan_kembali',
            ]);
        });
    }
};
