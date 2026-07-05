<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create admin user
        User::create([
            'nip' => '199003052010121003',
            'name' => 'Admin SIPAUS',
            'email' => 'admin@sipaus.test',
            'password' => Hash::make('password'), // Default password
            'phone_number' => '+6281234567890',
            'base_role' => 'admin',
            'available_roles' => ['admin'],
            'role_modules' => [
                'admin' => ['dashboard', 'assets', 'inventory', 'requests', 'loans'],
                'operator' => [],
                'validator' => []
            ],
            'modules' => [
                ['slug' => 'dashboard', 'name' => 'Dashboard', 'roles' => ['admin']],
                ['slug' => 'assets', 'name' => 'Manajemen Aset', 'roles' => ['admin']],
                ['slug' => 'inventory', 'name' => 'Manajemen Persediaan', 'roles' => ['admin']],
                ['slug' => 'requests', 'name' => 'Permintaan', 'roles' => ['admin']],
                ['slug' => 'loans', 'name' => 'Peminjaman', 'roles' => ['admin']]
            ],
            'module_permissions' => [
                ['module_slug' => 'assets', 'is_admin' => true, 'is_operator' => false, 'is_validator' => false],
                ['module_slug' => 'inventory', 'is_admin' => true, 'is_operator' => false, 'is_validator' => false],
                ['module_slug' => 'requests', 'is_admin' => true, 'is_operator' => false, 'is_validator' => false],
                ['module_slug' => 'loans', 'is_admin' => true, 'is_operator' => false, 'is_validator' => false]
            ]
        ]);

        // Create admin user (requested)
        User::create([
            'nip' => '199608052019031002',
            'name' => 'Admin SIPAUS 2',
            'email' => 'admin2@sipaus.test',
            'password' => Hash::make('password'), // Default password
            'phone_number' => '+6281234567892',
            'base_role' => 'admin',
            'available_roles' => ['admin'],
            'role_modules' => [
                'admin' => ['dashboard', 'assets', 'inventory', 'requests', 'loans'],
                'operator' => [],
                'validator' => []
            ],
            'modules' => [
                ['slug' => 'dashboard', 'name' => 'Dashboard', 'roles' => ['admin']],
                ['slug' => 'assets', 'name' => 'Manajemen Aset', 'roles' => ['admin']],
                ['slug' => 'inventory', 'name' => 'Manajemen Persediaan', 'roles' => ['admin']],
                ['slug' => 'requests', 'name' => 'Permintaan', 'roles' => ['admin']],
                ['slug' => 'loans', 'name' => 'Peminjaman', 'roles' => ['admin']]
            ],
            'module_permissions' => [
                ['module_slug' => 'assets', 'is_admin' => true, 'is_operator' => false, 'is_validator' => false],
                ['module_slug' => 'inventory', 'is_admin' => true, 'is_operator' => false, 'is_validator' => false],
                ['module_slug' => 'requests', 'is_admin' => true, 'is_operator' => false, 'is_validator' => false],
                ['module_slug' => 'loans', 'is_admin' => true, 'is_operator' => false, 'is_validator' => false]
            ]
        ]);

        // Create operator user
        User::create([
            'nip' => '198506122009081001',
            'name' => 'Operator SIPAUS',
            'email' => 'operator@sipaus.test',
            'password' => Hash::make('password'), // Default password
            'phone_number' => '+6281234567891',
            'base_role' => 'operator',
            'available_roles' => ['operator'],
            'role_modules' => [
                'admin' => [],
                'operator' => ['dashboard', 'assets', 'inventory'],
                'validator' => []
            ],
            'modules' => [
                ['slug' => 'dashboard', 'name' => 'Dashboard', 'roles' => ['operator']],
                ['slug' => 'assets', 'name' => 'Manajemen Aset', 'roles' => ['operator']],
                ['slug' => 'inventory', 'name' => 'Manajemen Persediaan', 'roles' => ['operator']]
            ],
            'module_permissions' => [
                ['module_slug' => 'assets', 'is_admin' => false, 'is_operator' => true, 'is_validator' => false],
                ['module_slug' => 'inventory', 'is_admin' => false, 'is_operator' => true, 'is_validator' => false]
            ]
        ]);
    }
}
