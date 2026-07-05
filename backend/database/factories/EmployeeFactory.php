<?php

namespace Database\Factories;

use App\Models\Employee;
use Illuminate\Database\Eloquent\Factories\Factory;

class EmployeeFactory extends Factory
{
    protected $model = Employee::class;

    public function definition(): array
    {
        return [
            'nip' => $this->faker->unique()->numerify('##########'),
            'name' => $this->faker->name(),
            'position' => $this->faker->jobTitle(),
            'department' => $this->faker->word(),
            'function_area' => $this->faker->randomElement(['Tata Usaha', 'Pemeriksaan dan Sertifikasi', 'Infokom', 'Penindakan', 'Pengujian']),
            'pangkat' => $this->faker->word(),
            'phone_number' => $this->faker->phoneNumber(),
            'hire_date' => $this->faker->date(),
            'status' => $this->faker->randomElement(['active', 'inactive']),
            'notes' => $this->faker->sentence(),
        ];
    }
}