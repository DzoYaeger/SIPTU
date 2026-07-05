<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use NotificationChannels\WebPush\HasPushSubscriptions;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasPushSubscriptions;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'nip',
        'name',
        'email',
        'password',
        'phone_number',
        'base_role',
        'available_roles',
        'role_modules',
        'modules',
        'module_permissions',
        'must_reset_password',
        'password_changed_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'available_roles' => 'array',
            'role_modules' => 'array',
            'modules' => 'array',
            'module_permissions' => 'array',
            'must_reset_password' => 'boolean',
            'password_changed_at' => 'datetime',
        ];
    }

    /**
     * Relationship with Assets (created)
     */
    public function assets()
    {
        return $this->hasMany(Asset::class, 'created_by');
    }

    /**
     * Relationship with Loans (created)
     */
    public function loans()
    {
        return $this->hasMany(Loan::class, 'created_by');
    }

    /**
     * Relationship with Loans (approved)
     */
    public function approvedLoans()
    {
        return $this->hasMany(Loan::class, 'approved_by');
    }

    /**
     * Relationship with Requests (created)
     */
    public function requests()
    {
        return $this->hasMany(\App\Models\Request::class, 'created_by');
    }

    /**
     * Relationship with Requests (approved)
     */
    public function approvedRequests()
    {
        return $this->hasMany(\App\Models\Request::class, 'approved_by');
    }

    /**
     * Relationship with Requests (fulfilled)
     */
    public function fulfilledRequests()
    {
        return $this->hasMany(\App\Models\Request::class, 'fulfilled_by');
    }

    /**
     * Relationship with IT Helpdesk Tickets (created)
     */
    public function tickets()
    {
        return $this->hasMany(ItHelpdeskTicket::class, 'created_by');
    }

    /**
     * Relationship with IT Helpdesk Tickets (handled by IT staff)
     */
    public function handledTickets()
    {
        return $this->hasMany(ItHelpdeskTicket::class, 'it_staff_id');
    }

    /**
     * Relationship with Inventories (updated)
     */
    public function inventories()
    {
        return $this->hasMany(Inventory::class, 'updated_by');
    }

    /**
     * Relationship with Employee
     */
    public function employee()
    {
        return $this->hasOne(Employee::class, 'user_id');
    }
}
