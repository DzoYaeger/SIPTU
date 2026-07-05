<?php

namespace Database\Seeders;

// use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            UserSeeder::class,
            EmployeeSeeder::class,
            AssetSeeder::class,
            InventorySeeder::class,
            EmployeeUserSeeder::class, // Add this to ensure all employees have user accounts
            EmployeeDoddySeeder::class, // Add the new employee
        ]);
    }
}
