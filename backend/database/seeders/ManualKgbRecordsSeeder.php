<?php

namespace Database\Seeders;

use App\Models\KgbRecord;
use App\Models\Employee;
use Illuminate\Database\Seeder;

class ManualKgbRecordsSeeder extends Seeder
{
    public function run(): void
    {
        // Get all employees
        $employees = Employee::all();
        
        foreach ($employees as $employee) {
            // Create 1-2 KGB records for each employee
            $kgbCount = rand(1, 2);
            
            for ($i = 0; $i < $kgbCount; $i++) {
                // Calculate dates based on hire date and random years of service
                $yearsOfService = rand(2, 20); // 2 to 20 years of service
                $tmtSk = date('Y-m-d', strtotime($employee->hire_date . ' + ' . ($yearsOfService * 12) . ' months'));
                
                KgbRecord::create([
                    'employee_id' => $employee->id,
                    'nomor_sk' => '820/' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT) . '/SK-KGB/' . date('Y'),
                    'tanggal_sk' => date('Y-m-d', strtotime($tmtSk . ' - 7 days')), // 7 days before TMT
                    'tmt_sk' => $tmtSk,
                    'lama_kerja_tahun' => $yearsOfService,
                ]);
            }
        }
    }
}