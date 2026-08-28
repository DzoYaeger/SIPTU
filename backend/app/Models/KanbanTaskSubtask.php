<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KanbanTaskSubtask extends Model
{
    protected $table = 'kanban_task_subtasks';

    protected $fillable = [
        'task_id',
        'title',
        'notes',
        'status',
        'due_date',
        'assigned_employee_id',
        'completed_by_employee_id',
        'completed_by_name',
        'completed_at',
        'attachment_path',
        'attachment_name',
        'attachment_size',
        'attachment_mime',
        'position',
    ];

    protected $casts = [
        'due_date' => 'date:Y-m-d',
        'completed_at' => 'datetime',
        'attachment_size' => 'integer',
        'position' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected $appends = [
        'attachment_url',
    ];

    public function task(): BelongsTo
    {
        return $this->belongsTo(KanbanTask::class, 'task_id');
    }

    public function assignedEmployee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'assigned_employee_id');
    }

    public function completedByEmployee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'completed_by_employee_id');
    }

    /**
     * Get the stream/download URL for the Nextcloud process evidence attachment.
     */
    public function getAttachmentUrlAttribute(): ?string
    {
        if (!$this->attachment_path) {
            return null;
        }

        return url("/api/kanban-tasks/subtasks/{$this->id}/file");
    }
}
