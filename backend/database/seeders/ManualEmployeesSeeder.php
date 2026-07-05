<?php

namespace Database\Seeders;

use App\Models\Employee;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ManualEmployeesSeeder extends Seeder
{
    public function run(): void
    {
        // Create 10 sample employees manually
        $employees = [
            [
                'nip' => '198001012005011001',
                'name' => 'Ahmad Budiman',
                'position' => 'Kepala Bagian',
                'department' => 'Keuangan',
                'function_area' => 'Tata Usaha',
                'pangkat' => 'IV/a - Pembina Utama Muda',
                'phone_number' => '081234567890',
                'hire_date' => '2005-01-01',
                'status' => 'active',
                'notes' => 'pegawai tetap'
            ],
            [
                'nip' => '198505152010051002',
                'name' => 'Siti Rahayu',
                'position' => 'Staff',
                'department' => 'SDM',
                'function_area' => 'Tata Usaha',
                'pangkat' => 'III/c - Penata Tk. I',
                'phone_number' => '081234567891',
                'hire_date' => '2010-05-15',
                'status' => 'active',
                'notes' => 'pegawai tetap'
            ],
            [
                'nip' => '197803201999031003',
                'name' => 'Budi Santoso',
                'position' => 'Kepala Subbagian',
                'department' => 'Umum',
                'function_area' => 'Tata Usaha',
                'pangkat' => 'III/d - Pembina',
                'phone_number' => '081234567892',
                'hire_date' => '1999-03-20',
                'status' => 'active',
                'notes' => 'pegawai tetap'
            ],
            [
                'nip' => '198211122008111004',
                'name' => 'Dewi Lestari',
                'position' => 'Staff',
                'department' => 'Kepegawaian',
                'function_area' => 'Tata Usaha',
                'pangkat' => 'III/b - Penata',
                'phone_number' => '081234567893',
                'hire_date' => '2008-11-12',
                'status' => 'active',
                'notes' => 'pegawai tetap'
            ],
            [
                'nip' => '197507081995071005',
                'name' => 'Agus Salim',
                'position' => 'Kepala Bidang',
                'department' => 'Perencanaan',
                'function_area' => 'Pemeriksaan dan Sertifikasi',
                'pangkat' => 'IV/b - Pembina Utama Madya',
                'phone_number' => '081234567894',
                'hire_date' => '1995-07-08',
                'status' => 'active',
                'notes' => 'pegawai tetap'
            ],
            [
                'nip' => '198809222012091006',
                'name' => 'Rina Kurnia',
                'position' => 'Staff',
                'department' => 'IT',
                'function_area' => 'Infokom',
                'pangkat' => 'III/c - Penata Tk. I',
                'phone_number' => '081234567895',
                'hire_date' => '2012-09-22',
                'status' => 'active',
                'notes' => 'pegawai tetap'
            ],
            [
                'nip' => '198304102007041007',
                'name' => 'Hendra Wijaya',
                'position' => 'Kepala Seksi',
                'department' => 'Operasional',
                'function_area' => 'Penindakan',
                'pangkat' => 'III/d - Pembina',
                'phone_number' => '081234567896',
                'hire_date' => '2007-04-10',
                'status' => 'active',
                'notes' => 'pegawai tetap'
            ],
            [
                'nip' => '198612052011121008',
                'name' => 'Maya Sari',
                'position' => 'Staff',
                'department' => 'Laboratorium',
                'function_area' => 'Pengujian',
                'pangkat' => 'III/b - Penata',
                'phone_number' => '081234567897',
                'hire_date' => '2011-12-05',
                'status' => 'active',
                'notes' => 'pegawai tetap'
            ],
            [
                'nip' => '197902142003021009',
                'name' => 'Fajar Nugraha',
                'position' => 'Kepala Unit',
                'department' => 'Pelayanan',
                'function_area' => 'Pemeriksaan dan Sertifikasi',
                'pangkat' => 'III/d - Pembina',
                'phone_number' => '081234567898',
                'hire_date' => '2003-02-14',
                'status' => 'active',
                'notes' => 'pegawai tetap'
            ],
            [
                'nip' => '198408182009081010',
                'name' => 'Lina Marlina',
                'position' => 'Staff',
                'department' => 'Administrasi',
                'function_area' => 'Tata Usaha',
                'pangkat' => 'III/a - Penata Muda Tk. I',
                'phone_number' => '081234567899',
                'hire_date' => '2009-08-18',
                'status' => 'active',
                'notes' => 'pegawai tetap'
            ]
        ];

        foreach ($employees as $employee) {
            Employee::create($employee);
        }
    }
}