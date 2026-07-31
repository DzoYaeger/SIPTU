<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Http\Controllers\Api\EmployeeTrainingController;
use Illuminate\Http\Request;

class SyncEmployeeTrainings extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sync:employee-trainings';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sinkronkan data pelatihan pegawai dari Google Spreadsheet publik';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Memulai sinkronisasi data pelatihan pegawai dari Google Spreadsheet...');
        
        $controller = new EmployeeTrainingController();
        $response = $controller->sync(new Request());
        $data = $response->getData(true);

        if ($response->status() === 200) {
            $this->info("✓ " . ($data['message'] ?? 'Sinkronisasi berhasil.'));
        } else {
            $this->error("✕ " . ($data['message'] ?? 'Gagal melakukan sinkronisasi.'));
        }

        return 0;
    }
}
