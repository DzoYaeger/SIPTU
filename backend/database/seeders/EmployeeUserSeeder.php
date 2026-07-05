<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\Employee;
use App\Models\User;

class EmployeeUserSeeder extends Seeder
{
    private const DEFAULT_PASSWORD = '1@Palopo@1';
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Loop through all employees and ensure they have user accounts
        $employees = Employee::all();

        foreach ($employees as $employee) {
            // Check if a user account already exists for this employee's NIP
            $user = User::where('nip', $employee->nip)->first();

            if (!$user) {
                // Create a user account for the employee with NIP as username and default password
                $user = User::create([
                    'nip' => $employee->nip,
                    'name' => $employee->name,
                    'email' => null, // Initially no email
                    'password' => Hash::make(self::DEFAULT_PASSWORD), // Default password
                    'phone_number' => $employee->phone_number,
                    'base_role' => 'operator', // Default role
                    'available_roles' => ['operator'],
                    'role_modules' => [],
                    'modules' => [],
                    'module_permissions' => [],
                ]);

                // Link the employee to the user
                $employee->update(['user_id' => $user->id]);
            } else {
                // If user exists but employee isn't linked, link them
                if (!$employee->user_id) {
                    $employee->update(['user_id' => $user->id]);
                }

                // Update the user's password to the default if needed
                $user->update([
                    'password' => Hash::make(self::DEFAULT_PASSWORD),
                    'name' => $employee->name,
                    'phone_number' => $employee->phone_number,
                ]);
            }
        }
    }
}
