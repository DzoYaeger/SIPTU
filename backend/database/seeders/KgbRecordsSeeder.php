<?php

namespace Database\Seeders;

use App\Models\KgbRecord;
use Illuminate\Database\Seeder;

class KgbRecordsSeeder extends Seeder
{
    public function run(): void
    {
        // Create 20 sample KGB records
        KgbRecord::factory(20)->create();
    }
}