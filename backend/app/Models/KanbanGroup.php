<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class KanbanGroup extends Model
{
    use HasFactory;

    protected $table = 'kanban_groups';

    protected $fillable = [
        'name',
        'slug',
        'description',
        'icon',
        'color',
        'type',
        'is_public',
        'created_by_user_id',
        'created_by_employee_id',
        'position',
    ];

    protected $casts = [
        'is_public' => 'boolean',
        'position'  => 'integer',
    ];

    /**
     * Tasks in this group
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(KanbanTask::class, 'group_id');
    }

    /**
     * Member employees assigned to this group
     */
    public function members(): BelongsToMany
    {
        return $this->belongsToMany(Employee::class, 'kanban_group_members', 'group_id', 'employee_id')
            ->withPivot('role')
            ->withTimestamps();
    }

    /**
     * Creator employee
     */
    public function creatorEmployee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'created_by_employee_id');
    }

    /**
     * Creator user
     */
    public function creatorUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    /**
     * Activity logs in this workspace group
     */
    public function activities(): HasMany
    {
        return $this->hasMany(KanbanActivityLog::class, 'group_id')->orderBy('created_at', 'desc');
    }
}
