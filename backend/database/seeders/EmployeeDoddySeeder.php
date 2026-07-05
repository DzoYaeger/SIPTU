<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\Employee;
use App\Models\User;

class EmployeeDoddySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create the employee with the specified data
        $employee = Employee::create([
            'nip' => '199608052019031002',
            'name' => 'Doddy Prayudi',
            'position' => 'Pranata Komputer Terampil', // This maps to 'jabatan' in the frontend
            'department' => 'Tata Usaha',
            'function_area' => 'Tata Usaha',
            'pangkat' => 'Pengatur, II/c', // Adding pangkat field
            'phone_number' => '+6281234567893', // Sample phone number
            'hire_date' => now(),
            'status' => 'active',
            'notes' => 'Employee added as per request',
        ]);

        // Create a user account for the employee with NIP as username and default password
        $user = User::create([
            'nip' => $employee->nip,
            'name' => $employee->name,
            'email' => null, // Initially no email
            'password' => Hash::make('1@Palopo@1'), // Default password
            'phone_number' => $employee->phone_number,
            'base_role' => 'admin', // Set as admin
            'available_roles' => json_encode(['admin', 'operator']),
            'role_modules' => json_encode([
                'admin' => ['dashboard', 'assets', 'inventory', 'requests', 'loans', 'kepegawaian', 'kearsipan', 'bmn', 'it-helpdesk'],
                'operator' => ['dashboard', 'assets', 'inventory'],
                'validator' => []
            ]),
            'modules' => json_encode([
                ['slug' => 'dashboard', 'name' => 'Dashboard', 'roles' => ['admin']],
                ['slug' => 'assets', 'name' => 'Manajemen Aset', 'roles' => ['admin']],
                ['slug' => 'inventory', 'name' => 'Manajemen Persediaan', 'roles' => ['admin']],
                ['slug' => 'requests', 'name' => 'Permintaan', 'roles' => ['admin']],
                ['slug' => 'loans', 'name' => 'Peminjaman', 'roles' => ['admin']],
                ['slug' => 'kepegawaian', 'name' => 'Kepegawaian', 'roles' => ['admin']],
                ['slug' => 'kearsipan', 'name' => 'Kearsipan', 'roles' => ['admin']],
                ['slug' => 'bmn', 'name' => 'Barang Milik Negara', 'roles' => ['admin']],
                ['slug' => 'it-helpdesk', 'name' => 'IT Helpdesk', 'roles' => ['admin']],
            ]),
            'module_permissions' => json_encode([
                ['module_slug' => 'assets', 'is_admin' => true, 'is_operator' => false, 'is_validator' => false],
                ['module_slug' => 'inventory', 'is_admin' => true, 'is_operator' => false, 'is_validator' => false],
                ['module_slug' => 'requests', 'is_admin' => true, 'is_operator' => false, 'is_validator' => false],
                ['module_slug' => 'loans', 'is_admin' => true, 'is_operator' => false, 'is_validator' => false],
                ['module_slug' => 'kepegawaian', 'is_admin' => true, 'is_operator' => false, 'is_validator' => false],
                ['module_slug' => 'kearsipan', 'is_admin' => true, 'is_operator' => false, 'is_validator' => false],
                ['module_slug' => 'bmn', 'is_admin' => true, 'is_operator' => false, 'is_validator' => false],
                ['module_slug' => 'it-helpdesk', 'is_admin' => true, 'is_operator' => false, 'is_validator' => false],
            ])
        ]);

        // Link the employee to the user
        $employee->update(['user_id' => $user->id]);
    }
}
