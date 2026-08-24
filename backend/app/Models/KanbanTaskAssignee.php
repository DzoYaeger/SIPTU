<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KanbanTaskAssignee extends Model
{
    protected $table = 'kanban_task_assignees';

    protected $fillable = [
        'task_id',
        'employee_id',
        'role',
    ];

    public function task(): BelongsTo
    {
        return $this->belongsTo(KanbanTask::class, 'task_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }
}
