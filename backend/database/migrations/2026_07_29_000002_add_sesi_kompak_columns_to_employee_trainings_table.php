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
        Schema::table('employee_trainings', function (Blueprint $table) {
            if (!Schema::hasColumn('employee_trainings', 'no_undangan')) {
                $table->string('no_undangan')->nullable()->index()->after('id');
            }
            if (!Schema::hasColumn('employee_trainings', 'narasumber')) {
                $table->string('narasumber')->nullable()->after('tempat_pelatihan');
            }
            if (!Schema::hasColumn('employee_trainings', 'jumlah_peserta')) {
                $table->string('jumlah_peserta')->nullable()->after('narasumber');
            }
            if (!Schema::hasColumn('employee_trainings', 'pre_test')) {
                $table->string('pre_test')->nullable()->after('jumlah_peserta');
            }
            if (!Schema::hasColumn('employee_trainings', 'post_test')) {
                $table->string('post_test')->nullable()->after('pre_test');
            }
            if (!Schema::hasColumn('employee_trainings', 'peningkatan_nilai')) {
                $table->string('peningkatan_nilai')->nullable()->after('post_test');
            }
            if (!Schema::hasColumn('employee_trainings', 'kepuasan_peserta')) {
                $table->string('kepuasan_peserta')->nullable()->after('peningkatan_nilai');
            }
            if (!Schema::hasColumn('employee_trainings', 'dokumentasi')) {
                $table->string('dokumentasi')->nullable()->after('kepuasan_peserta');
            }
            if (!Schema::hasColumn('employee_trainings', 'hasil_evaluasi')) {
                $table->text('hasil_evaluasi')->nullable()->after('dokumentasi');
            }
            if (!Schema::hasColumn('employee_trainings', 'keterangan')) {
                $table->text('keterangan')->nullable()->after('hasil_evaluasi');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employee_trainings', function (Blueprint $table) {
            $table->dropColumn([
                'no_undangan',
                'narasumber',
                'jumlah_peserta',
                'pre_test',
                'post_test',
                'peningkatan_nilai',
                'kepuasan_peserta',
                'dokumentasi',
                'hasil_evaluasi',
                'keterangan',
            ]);
        });
    }
};
