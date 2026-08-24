<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class KanbanTask extends Model
{
    protected $table = 'kanban_tasks';

    protected $fillable = [
        'group_id',
        'title',
        'description',
        'status',
        'priority',
        'category',
        'due_date',
        'created_by_user_id',
        'created_by_employee_id',
        'position',
    ];

    protected $casts = [
        'group_id' => 'integer',
        'due_date' => 'date:Y-m-d',
        'position' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected $appends = [
        'subtasks_count',
        'completed_subtasks_count',
        'progress_percentage',
        'attachments_count',
        'reports_count',
        'latest_report_at',
    ];

    /**
     * Kanban Group / Workspace to which this task belongs.
     */
    public function group(): BelongsTo
    {
        return $this->belongsTo(KanbanGroup::class, 'group_id');
    }

    /**
     * Activity logs for this task.
     */
    public function activities(): HasMany
    {
        return $this->hasMany(KanbanActivityLog::class, 'task_id')->orderBy('created_at', 'desc');
    }

    /**
     * Reports and progress updates history.
     */
    public function reports(): HasMany
    {
        return $this->hasMany(KanbanTaskReport::class, 'task_id')->orderBy('created_at', 'desc');
    }

    /**
     * User who created the task.
     */
    public function creatorUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    /**
     * Employee who created the task.
     */
    public function creatorEmployee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'created_by_employee_id');
    }

    /**
     * Assignees (Employee models through kanban_task_assignees table).
     */
    public function assignees(): BelongsToMany
    {
        return $this->belongsToMany(Employee::class, 'kanban_task_assignees', 'task_id', 'employee_id')
            ->withPivot('role')
            ->withTimestamps();
    }

    /**
     * Subtasks / Rincian Pekerjaan.
     */
    public function subtasks(): HasMany
    {
        return $this->hasMany(KanbanTaskSubtask::class, 'task_id')->orderBy('position', 'asc')->orderBy('id', 'asc');
    }

    /**
     * Accessor: Total Subtasks Count.
     */
    public function getSubtasksCountAttribute(): int
    {
        return $this->subtasks()->count();
    }

    /**
     * Accessor: Completed Subtasks Count.
     */
    public function getCompletedSubtasksCountAttribute(): int
    {
        return $this->subtasks()->where('status', 'completed')->count();
    }

    /**
     * Accessor: Progress Percentage.
     */
    public function getProgressPercentageAttribute(): int
    {
        $total = $this->subtasks()->count();
        if ($total === 0) {
            return $this->status === 'done' ? 100 : ($this->status === 'in_progress' ? 50 : 0);
        }
        $completed = $this->subtasks()->where('status', 'completed')->count();
        return (int) round(($completed / $total) * 100);
    }

    /**
     * Accessor: Count of subtasks with uploaded Nextcloud evidence attachments.
     */
    public function getAttachmentsCountAttribute(): int
    {
        return $this->subtasks()->whereNotNull('attachment_path')->count();
    }

    /**
     * Accessor: Total Reports Count.
     */
    public function getReportsCountAttribute(): int
    {
        try {
            return $this->reports()->count();
        } catch (\Throwable $e) {
            return 0;
        }
    }

    /**
     * Accessor: ISO string of latest report timestamp (for notification badge).
     */
    public function getLatestReportAtAttribute(): ?string
    {
        try {
            $latest = $this->reports()->latest('created_at')->first();
            return $latest ? $latest->created_at->toIso8601String() : null;
        } catch (\Throwable $e) {
            return null;
        }
    }
}
