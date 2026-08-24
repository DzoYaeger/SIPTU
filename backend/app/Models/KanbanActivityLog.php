<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KanbanActivityLog extends Model
{
    use HasFactory;

    protected $table = 'kanban_activity_logs';

    protected $fillable = [
        'group_id',
        'task_id',
        'user_id',
        'employee_id',
        'action',
        'description',
        'properties',
    ];

    protected $casts = [
        'properties' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Ruang kerja terkait aktivitas ini.
     */
    public function group(): BelongsTo
    {
        return $this->belongsTo(KanbanGroup::class, 'group_id');
    }

    /**
     * Tugas terkait aktivitas ini.
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(KanbanTask::class, 'task_id');
    }

    /**
     * Pengguna yang melakukan aktivitas.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Data pegawai yang melakukan aktivitas.
     */
    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }
}
