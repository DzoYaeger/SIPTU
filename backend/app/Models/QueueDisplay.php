<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QueueDisplay extends Model
{
    protected $fillable = [
        'counter_code',
        'current_number',
        'employee_id',
        'employee_name',
        'employee_photo',
        'counter_name',
        'status',
        'ticker_text',
        'slideshow',
    ];

    protected function casts(): array
    {
        return [
            'ticker_text' => 'array',
            'slideshow' => 'array',
        ];
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}
