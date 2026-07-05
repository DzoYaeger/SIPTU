<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Employee extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'nip',
        'name',
        'position',
        'department',
        'function_area',
        'pangkat',
        'phone_number',
        'hire_date',
        'status',
        'notes',
        'photo',
        'user_id',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array
     */
    protected $appends = ['avatar_url'];

    /**
     * Get the public URL for the employee photo.
     *
     * @return string|null
     */
    public function getAvatarUrlAttribute()
    {
        if (!$this->photo) {
            return null;
        }

        if (str_starts_with($this->photo, 'storage/')) {
            return url($this->photo);
        }

        return url('storage/' . $this->photo);
    }

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'hire_date' => 'date',
        ];
    }

    /**
     * Relationship with User
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relationship with Loans (as borrower)
     */
    public function loans()
    {
        return $this->hasMany(Loan::class, 'borrower_id');
    }

    /**
     * Relationship with IT Helpdesk Tickets
     */
    public function tickets()
    {
        return $this->hasMany(ItHelpdeskTicket::class, 'employee_id');
    }

    /**
     * Relationship with KGB Records
     */
    public function kgbRecords()
    {
        return $this->hasMany(KgbRecord::class);
    }

    public function dailyControls()
    {
        return $this->hasMany(EmployeeDailyControl::class);
    }

    public function exitPermits()
    {
        return $this->hasMany(ExitPermit::class);
    }
}
