<?php

namespace Database\Factories;

use App\Models\KgbRecord;
use App\Models\Employee;
use Illuminate\Database\Eloquent\Factories\Factory;

class KgbRecordFactory extends Factory
{
    protected $model = KgbRecord::class;

    public function definition(): array
    {
        $startDate = $this->faker->dateTimeBetween('-10 years', 'now');
        $tmtSk = $this->faker->dateTimeBetween($startDate, 'now');

        // Get an existing employee or create one if none exists
        $employee = Employee::inRandomOrder()->first();
        if (!$employee) {
            $employee = Employee::factory()->create();
        }

        return [
            'employee_id' => $employee->id,
            'nomor_sk' => $this->faker->bothify('???/#####/SK-KGB/?####'),
            'tanggal_sk' => $this->faker->dateTimeBetween($tmtSk, 'now'),
            'tmt_sk' => $tmtSk,
            'lama_kerja_tahun' => $this->faker->numberBetween(0, 40),
        ];
    }
}