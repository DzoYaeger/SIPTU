<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Employee;

class EmployeeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create sample employees
        Employee::create([
            'nip' => '199003052010121003',
            'name' => 'Ahmad Kurnia',
            'position' => 'Staff IT',
            'department' => 'Teknologi Informasi',
            'function_area' => 'Infokom',
            'phone_number' => '+6281234567890',
            'hire_date' => '2010-12-05',
            'status' => 'active',
            'notes' => 'System administrator',
        ]);

        Employee::create([
            'nip' => '198506122009081001',
            'name' => 'Siti Rahma',
            'position' => 'Manager Keuangan',
            'department' => 'Keuangan',
            'function_area' => 'Pemeriksaan dan Sertifikasi',
            'phone_number' => '+6281234567891',
            'hire_date' => '2009-08-12',
            'status' => 'active',
            'notes' => 'Finance manager',
        ]);

        Employee::create([
            'nip' => '198004152008071002',
            'name' => 'Budi Santoso',
            'position' => 'Staff Administrasi',
            'department' => 'Administrasi Umum',
            'function_area' => 'Tata Usaha',
            'phone_number' => '+6281234567892',
            'hire_date' => '2008-07-15',
            'status' => 'active',
            'notes' => 'Administrative staff',
        ]);
    }
}
