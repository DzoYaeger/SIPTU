<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KanbanTaskReport extends Model
{
    use HasFactory;

    protected $table = 'kanban_task_reports';

    protected $fillable = [
        'task_id',
        'employee_id',
        'user_id',
        'content',
        'status_update',
        'progress_percentage',
        'attachment_path',
        'attachment_name',
        'attachment_size',
        'attachment_mime',
    ];

    protected $casts = [
        'progress_percentage' => 'integer',
        'attachment_size' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Parent Kanban Task
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(KanbanTask::class, 'task_id');
    }

    /**
     * Reporting Employee
     */
    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }

    /**
     * Reporting User
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
