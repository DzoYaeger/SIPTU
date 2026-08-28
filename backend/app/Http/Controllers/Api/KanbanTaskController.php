<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\KanbanActivityLog;
use App\Models\KanbanGroup;
use App\Models\KanbanTask;
use App\Models\KanbanTaskReport;
use App\Models\KanbanTaskSubtask;
use App\Services\NextcloudService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class KanbanTaskController extends Controller
{
    private NextcloudService $nextcloudService;

    public function __construct(NextcloudService $nextcloudService)
    {
        $this->nextcloudService = $nextcloudService;
    }

    /**
     * Record an audit activity log entry.
     */
    private function recordActivity(
        ?int $groupId,
        ?int $taskId,
        $user,
        string $action,
        string $description,
        array $properties = []
    ): void {
        try {
            KanbanActivityLog::create([
                'group_id'    => $groupId,
                'task_id'     => $taskId,
                'user_id'     => $user ? $user->id : null,
                'employee_id' => $user ? ($user->employee_id ?? null) : null,
                'action'      => $action,
                'description' => $description,
                'properties'  => $properties,
            ]);
        } catch (\Throwable $e) {
            Log::warning("Failed to record kanban activity: " . $e->getMessage());
        }
    }

    /**
     * Ensure default groups exist in database and migrate orphaned tasks.
     */
    private function ensureDefaultGroups(): void
    {
        try {
            if (KanbanGroup::count() === 0) {
                KanbanGroup::create([
                    'name' => 'Umum',
                    'slug' => 'umum',
                    'description' => 'Ruang kerja publik untuk seluruh pegawai',
                    'icon' => 'global',
                    'color' => '#0F5B99',
                    'type' => 'public',
                    'is_public' => true,
                    'position' => 1,
                ]);

                KanbanGroup::create([
                    'name' => 'Tata Usaha',
                    'slug' => 'tata-usaha',
                    'description' => 'Ruang koordinasi operasional & administrasi Tata Usaha',
                    'icon' => 'team',
                    'color' => '#10b981',
                    'type' => 'team',
                    'is_public' => false,
                    'position' => 2,
                ]);

                KanbanGroup::create([
                    'name' => 'Infokom',
                    'slug' => 'infokom',
                    'description' => 'Ruang kerja tim Informasi, Komunikasi & IT',
                    'icon' => 'thunderbolt',
                    'color' => '#8b5cf6',
                    'type' => 'team',
                    'is_public' => false,
                    'position' => 3,
                ]);
            }

            // Auto-migrate any tasks where group_id is null
            $defaultGroup = KanbanGroup::where('slug', 'umum')->orWhere('name', 'Umum')->first();
            if ($defaultGroup) {
                $allGroups = KanbanGroup::all();
                foreach ($allGroups as $g) {
                    KanbanTask::whereNull('group_id')
                        ->where('category', $g->name)
                        ->update(['group_id' => $g->id]);
                }
                KanbanTask::whereNull('group_id')->update(['group_id' => $defaultGroup->id]);
            }

            // Auto-check and add due_date column in kanban_task_subtasks if not yet present
            if (Schema::hasTable('kanban_task_subtasks') && !Schema::hasColumn('kanban_task_subtasks', 'due_date')) {
                Schema::table('kanban_task_subtasks', function (\Illuminate\Database\Schema\Blueprint $table) {
                    $table->date('due_date')->nullable()->after('status');
                });
            }
        } catch (\Throwable $e) {
            // Ignore if table not yet migrated
        }
    }

    /**
     * List all kanban workspaces / groups accessible to the current user.
     */
    public function listGroups(Request $request): JsonResponse
    {
        $this->ensureDefaultGroups();

        $user = $request->user();
        $empId = $user ? $user->employee_id : null;
        $userId = $user ? $user->id : null;

        $isAdmin = false;
        if ($user) {
            $baseRole = strtolower($user->base_role ?? '');
            $currentRole = strtolower($user->current_role ?? $baseRole);
            $isAdmin = in_array($baseRole, ['admin', 'validator']) || in_array($currentRole, ['admin', 'validator']);
        }

        $query = KanbanGroup::with([
            'members:id,name,nip,position,department,photo',
            'creatorEmployee:id,name,nip,photo',
        ])->withCount([
            'tasks',
            'tasks as done_tasks_count' => function ($q) {
                $q->where('status', 'done');
            }
        ]);

        if (!$isAdmin) {
            $query->where(function ($q) use ($empId, $userId) {
                $q->where('is_public', true)
                    ->orWhere('created_by_user_id', $userId)
                    ->orWhere(function ($sq) use ($empId) {
                        if ($empId) {
                            $sq->where('created_by_employee_id', $empId)
                               ->orWhereHas('members', fn($mq) => $mq->where('employees.id', $empId));
                        }
                    });
            });
        }

        $groups = $query->orderBy('position', 'asc')->orderBy('created_at', 'asc')->get();

        $data = $groups->map(function ($g) use ($userId, $empId, $isAdmin) {
            $isCreator = ($userId && $g->created_by_user_id == $userId) ||
                         ($empId && $g->created_by_employee_id == $empId) ||
                         $isAdmin;
            $isMember = $g->is_public || $isCreator || ($empId && $g->members->contains('id', $empId));

            return [
                'id' => $g->id,
                'name' => $g->name,
                'slug' => $g->slug,
                'description' => $g->description,
                'icon' => $g->icon,
                'color' => $g->color,
                'type' => $g->type,
                'is_public' => (bool)$g->is_public,
                'is_creator' => (bool)$isCreator,
                'is_member' => (bool)$isMember,
                'tasks_count' => $g->tasks_count,
                'done_tasks_count' => $g->done_tasks_count,
                'members' => $g->members,
                'created_at' => $g->created_at,
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    /**
     * Store a newly created kanban group / workspace.
     */
    public function storeGroup(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'nullable|string|max:500',
            'type' => 'nullable|in:public,private,team',
            'icon' => 'nullable|string|max:50',
            'color' => 'nullable|string|max:30',
            'member_ids' => 'nullable|array',
            'member_ids.*' => 'exists:employees,id',
        ]);

        $user = $request->user();
        $type = $validated['type'] ?? 'team';
        $isPublic = ($type === 'public');

        return DB::transaction(function () use ($validated, $user, $type, $isPublic) {
            $maxPos = KanbanGroup::max('position') ?? 0;

            $group = KanbanGroup::create([
                'name' => $validated['name'],
                'slug' => \Illuminate\Support\Str::slug($validated['name']),
                'description' => $validated['description'] ?? null,
                'icon' => $validated['icon'] ?? 'team',
                'color' => $validated['color'] ?? '#0F5B99',
                'type' => $type,
                'is_public' => $isPublic,
                'created_by_user_id' => $user ? $user->id : null,
                'created_by_employee_id' => $user ? $user->employee_id : null,
                'position' => $maxPos + 1,
            ]);

            $memberIds = $validated['member_ids'] ?? [];
            if ($user && $user->employee_id && !in_array($user->employee_id, $memberIds)) {
                $memberIds[] = $user->employee_id;
            }

            if (!empty($memberIds) && !$isPublic) {
                $group->members()->sync($memberIds);
            }

            $userName = $user ? ($user->employee?->name ?? $user->name) : 'Pengguna';
            $this->recordActivity($group->id, null, $user, 'group_created', "{$userName} membuat ruang kerja baru \"{$group->name}\"", [
                'group_name' => $group->name,
                'type'       => $group->type,
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Grouping ruang kerja berhasil dibuat.',
                'data' => $group->load(['members:id,name,nip,position,department,photo']),
            ], 201);
        });
    }

    /**
     * Update the specified kanban group / workspace.
     */
    public function updateGroup(Request $request, int $id): JsonResponse
    {
        $group = KanbanGroup::findOrFail($id);
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'nullable|string|max:500',
            'type' => 'nullable|in:public,private,team',
            'icon' => 'nullable|string|max:50',
            'color' => 'nullable|string|max:30',
            'member_ids' => 'nullable|array',
            'member_ids.*' => 'exists:employees,id',
        ]);

        $type = $validated['type'] ?? $group->type;
        $isPublic = ($type === 'public');

        return DB::transaction(function () use ($group, $validated, $type, $isPublic, $user) {
            $group->update([
                'name' => $validated['name'],
                'slug' => \Illuminate\Support\Str::slug($validated['name']),
                'description' => $validated['description'] ?? null,
                'icon' => $validated['icon'] ?? $group->icon,
                'color' => $validated['color'] ?? $group->color,
                'type' => $type,
                'is_public' => $isPublic,
            ]);

            if (isset($validated['member_ids'])) {
                $memberIds = $validated['member_ids'];
                if ($user && $user->employee_id && !in_array($user->employee_id, $memberIds)) {
                    $memberIds[] = $user->employee_id;
                }
                $group->members()->sync($memberIds);
            }

            $userName = $user ? ($user->employee?->name ?? $user->name) : 'Pengguna';
            $this->recordActivity($group->id, null, $user, 'group_updated', "{$userName} memperbarui ruang kerja & anggota \"{$group->name}\"", [
                'group_name' => $group->name,
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Grouping berhasil diperbarui.',
                'data' => $group->fresh(['members:id,name,nip,position,department,photo']),
            ]);
        });
    }

    /**
     * Delete the specified kanban group.
     */
    public function destroyGroup(Request $request, int $id): JsonResponse
    {
        $group = KanbanGroup::findOrFail($id);

        if ($group->is_public && strtolower($group->name) === 'umum') {
            return response()->json([
                'status' => 'error',
                'message' => 'Grouping Umum adalah channel default dan tidak dapat dihapus.',
            ], 422);
        }

        $group->delete();

        $user = $request->user();
        $userName = $user ? ($user->employee?->name ?? $user->name) : 'Pengguna';
        $this->recordActivity(null, null, $user, 'group_deleted', "{$userName} menghapus ruang kerja \"{$group->name}\"", [
            'group_name' => $group->name,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Grouping berhasil dihapus.',
        ]);
    }

    /**
     * Display a listing of kanban tasks with flexible filters.
     */
    public function index(Request $request): JsonResponse
    {
        $this->ensureDefaultGroups();

        $query = KanbanTask::with([
            'group:id,name,color,icon,type',
            'assignees:id,name,nip,position,photo,department',
            'subtasks.assignedEmployee:id,name,nip,photo',
            'subtasks.completedByEmployee:id,name,nip,photo',
            'creatorEmployee:id,name,nip,photo',
            'creatorUser:id,name,email',
            'reports.employee:id,name,nip,photo,department',
            'reports.user:id,name,email',
        ]);

        // Filter: Group / Workspace
        if ($request->filled('group_id') && $request->query('group_id') !== 'all') {
            $query->where('group_id', $request->query('group_id'));
        }

        // Filter: Search by title, description, or category
        if ($request->filled('q')) {
            $search = trim($request->query('q'));
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%")
                    ->orWhereHas('assignees', function ($aq) use ($search) {
                        $aq->where('name', 'like', "%{$search}%")
                            ->orWhere('nip', 'like', "%{$search}%");
                    })
                    ->orWhereHas('subtasks', function ($sq) use ($search) {
                        $sq->where('title', 'like', "%{$search}%");
                    });
            });
        }

        // Filter: Status Column
        if ($request->filled('status') && $request->query('status') !== 'all') {
            $query->where('status', $request->query('status'));
        }

        // Filter: Priority
        if ($request->filled('priority') && $request->query('priority') !== 'all') {
            $query->where('priority', $request->query('priority'));
        }

        // Filter: Category
        if ($request->filled('category') && $request->query('category') !== 'all') {
            $query->where('category', $request->query('category'));
        }

        // Filter: Assignee Employee ID
        if ($request->filled('employee_id')) {
            $empId = $request->query('employee_id');
            $query->whereHas('assignees', function ($q) use ($empId) {
                $q->where('employees.id', $empId);
            });
        }

        // Filter: Assigned to Current Auth User / Employee
        if ($request->boolean('my_tasks')) {
            $user = $request->user();
            if ($user && $user->employee_id) {
                $empId = $user->employee_id;
                $query->where(function ($q) use ($empId, $user) {
                    $q->whereHas('assignees', function ($aq) use ($empId) {
                        $aq->where('employees.id', $empId);
                    })
                    ->orWhere('created_by_user_id', $user->id)
                    ->orWhere('created_by_employee_id', $empId);
                });
            }
        }

        $tasks = $query->orderBy('position', 'asc')->orderBy('updated_at', 'desc')->get();

        // Distinct categories for filter options
        $categories = KanbanTask::distinct()->whereNotNull('category')->pluck('category')->filter()->values();

        return response()->json([
            'status' => 'success',
            'data' => $tasks,
            'categories' => $categories,
        ]);
    }

    /**
     * Store a newly created kanban task.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'group_id' => 'nullable|exists:kanban_groups,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|in:todo,in_progress,review,done',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'category' => 'nullable|string|max:100',
            'due_date' => 'nullable|date',
            'assignee_ids' => 'nullable|array',
            'assignee_ids.*' => 'exists:employees,id',
            'subtasks' => 'nullable|array',
            'subtasks.*.title' => 'required|string|max:255',
            'subtasks.*.notes' => 'nullable|string',
            'subtasks.*.due_date' => 'nullable|date',
            'subtasks.*.assigned_employee_id' => 'nullable|exists:employees,id',
        ]);

        $user = $request->user();

        return DB::transaction(function () use ($validated, $user) {
            $maxPos = KanbanTask::where('status', $validated['status'] ?? 'todo')->max('position') ?? 0;

            $groupId = $validated['group_id'] ?? null;
            if (!$groupId) {
                $defaultGroup = KanbanGroup::where('slug', 'umum')->orWhere('name', 'Umum')->first();
                $groupId = $defaultGroup ? $defaultGroup->id : null;
            }
            $group = $groupId ? KanbanGroup::find($groupId) : null;
            $categoryName = $group ? $group->name : ($validated['category'] ?? 'Umum');

            $task = KanbanTask::create([
                'group_id' => $groupId,
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'status' => $validated['status'] ?? 'todo',
                'priority' => $validated['priority'] ?? 'medium',
                'category' => $categoryName,
                'due_date' => $validated['due_date'] ?? null,
                'created_by_user_id' => $user ? $user->id : null,
                'created_by_employee_id' => $user ? $user->employee_id : null,
                'position' => $maxPos + 1,
            ]);

            // Attach Assignees
            if (!empty($validated['assignee_ids'])) {
                $task->assignees()->sync($validated['assignee_ids']);
            }

            // Create initial subtasks if provided
            if (!empty($validated['subtasks'])) {
                foreach ($validated['subtasks'] as $idx => $st) {
                    KanbanTaskSubtask::create([
                        'task_id' => $task->id,
                        'title' => $st['title'],
                        'notes' => $st['notes'] ?? null,
                        'status' => 'pending',
                        'due_date' => $st['due_date'] ?? null,
                        'assigned_employee_id' => $st['assigned_employee_id'] ?? null,
                        'position' => $idx + 1,
                    ]);
                }
            }

            $userName = $user ? ($user->employee?->name ?? $user->name) : 'Pengguna';
            $this->recordActivity($task->group_id, $task->id, $user, 'task_created', "{$userName} menambahkan tugas baru: \"{$task->title}\"", [
                'task_title' => $task->title,
                'group_name' => $categoryName,
                'priority'   => $task->priority,
                'status'     => $task->status,
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Tugas berhasil dibuat.',
                'data' => $task->load([
                    'group:id,name,color,icon,type',
                    'assignees:id,name,nip,position,photo,department',
                    'subtasks.assignedEmployee:id,name,nip,photo',
                    'subtasks.completedByEmployee:id,name,nip,photo',
                ]),
            ], 201);
        });
    }

    /**
     * Display the specified kanban task.
     */
    public function show(int $id): JsonResponse
    {
        $task = KanbanTask::with([
            'group:id,name,color,icon,type',
            'assignees:id,name,nip,position,photo,department',
            'subtasks.assignedEmployee:id,name,nip,photo',
            'subtasks.completedByEmployee:id,name,nip,photo',
            'creatorEmployee:id,name,nip,photo',
            'creatorUser:id,name,email',
            'reports.employee:id,name,nip,photo,department',
            'reports.user:id,name,email',
        ])->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $task,
        ]);
    }

    /**
     * Check if user is the creator of the task or an administrator.
     */
    protected function isTaskCreatorOrAdmin($user, ?KanbanTask $task): bool
    {
        if (!$user || !$task) {
            return false;
        }

        if ($user->role === 'admin' || $user->role === 'superadmin' || !empty($user->is_admin)) {
            return true;
        }

        if ($task->created_by_user_id && (int)$task->created_by_user_id === (int)$user->id) {
            return true;
        }

        if ($task->created_by_employee_id && $user->employee_id && (int)$task->created_by_employee_id === (int)$user->employee_id) {
            return true;
        }

        return false;
    }

    /**
     * Update the specified kanban task.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $task = KanbanTask::findOrFail($id);
        $user = $request->user();
        $isCreator = $this->isTaskCreatorOrAdmin($user, $task);

        $validated = $request->validate([
            'group_id' => 'nullable|exists:kanban_groups,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|in:todo,in_progress,review,done',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'category' => 'nullable|string|max:100',
            'due_date' => 'nullable|date',
            'assignee_ids' => 'nullable|array',
            'assignee_ids.*' => 'exists:employees,id',
        ]);

        return DB::transaction(function () use ($task, $validated, $isCreator, $user) {
            $groupId = array_key_exists('group_id', $validated) ? $validated['group_id'] : $task->group_id;
            if (!$groupId) {
                $defaultGroup = KanbanGroup::where('slug', 'umum')->orWhere('name', 'Umum')->first();
                $groupId = $defaultGroup ? $defaultGroup->id : null;
            }
            $group = $groupId ? KanbanGroup::find($groupId) : null;
            $categoryName = $group ? $group->name : ($validated['category'] ?? $task->category ?? 'Umum');

            $updateData = [
                'group_id' => $groupId,
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'status' => $validated['status'] ?? $task->status,
                'priority' => $validated['priority'] ?? $task->priority,
                'category' => $categoryName,
            ];

            // Only task creator/admin can update main task deadline
            if ($isCreator && array_key_exists('due_date', $validated)) {
                $updateData['due_date'] = $validated['due_date'];
            }

            $task->update($updateData);

            // Only task creator/admin can update main task assignees
            if ($isCreator && isset($validated['assignee_ids'])) {
                $task->assignees()->sync($validated['assignee_ids']);
            }

            $userName = $user ? ($user->employee?->name ?? $user->name) : 'Pengguna';
            $this->recordActivity($task->group_id, $task->id, $user, 'task_updated', "{$userName} memperbarui rincian tugas: \"{$task->title}\"", [
                'task_title' => $task->title,
                'group_name' => $categoryName,
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Tugas berhasil diperbarui.',
                'data' => $task->fresh([
                    'group:id,name,color,icon,type',
                    'assignees:id,name,nip,position,photo,department',
                    'subtasks.assignedEmployee:id,name,nip,photo',
                    'subtasks.completedByEmployee:id,name,nip,photo',
                ]),
            ]);
        });
    }

    /**
     * Quick update column status or reorder position.
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $task = KanbanTask::findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|in:todo,in_progress,review,done',
            'position' => 'nullable|integer',
        ]);

        $task->status = $validated['status'];
        if (isset($validated['position'])) {
            $task->position = $validated['position'];
        }
        $task->save();

        $user = $request->user();
        $userName = $user ? ($user->employee?->name ?? $user->name) : 'Pengguna';
        $statusLabels = [
            'todo' => 'Belum Dimulai',
            'in_progress' => 'Dalam Proses',
            'review' => 'Review / Verifikasi',
            'done' => 'Selesai',
        ];
        $statusTitle = $statusLabels[$task->status] ?? $task->status;
        $this->recordActivity($task->group_id, $task->id, $user, 'status_changed', "{$userName} memindahkan status tugas \"{$task->title}\" ke {$statusTitle}", [
            'task_title' => $task->title,
            'status'     => $task->status,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Status tugas berhasil dipindahkan.',
            'data' => $task->fresh(['assignees:id,name,nip,position,photo,department', 'subtasks']),
        ]);
    }

    /**
     * Remove the specified task and delete all attached files in Nextcloud.
     */
    public function destroy(int $id): JsonResponse
    {
        $task = KanbanTask::with('subtasks')->findOrFail($id);

        // Delete Nextcloud attachments for all subtasks
        foreach ($task->subtasks as $subtask) {
            if ($subtask->attachment_path) {
                try {
                    $this->nextcloudService->deleteFile($subtask->attachment_path);
                } catch (\Exception $e) {
                    Log::warning("Failed to delete subtask Nextcloud file: {$subtask->attachment_path}. Error: " . $e->getMessage());
                }
            }
        }

        $task->delete();

        $user = request()->user();
        $userName = $user ? ($user->employee?->name ?? $user->name) : 'Pengguna';
        $this->recordActivity($task->group_id, null, $user, 'task_deleted', "{$userName} menghapus tugas \"{$task->title}\"", [
            'task_title' => $task->title,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Tugas dan berkas lampiran berhasil dihapus.',
        ]);
    }

    /**
     * Add a new subtask to a task.
     */
    public function storeSubtask(Request $request, int $taskId): JsonResponse
    {
        $task = KanbanTask::findOrFail($taskId);
        $user = $request->user();
        $isCreator = $this->isTaskCreatorOrAdmin($user, $task);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'notes' => 'nullable|string',
            'due_date' => 'nullable|date',
            'assigned_employee_id' => 'nullable|exists:employees,id',
        ]);

        $maxPos = $task->subtasks()->max('position') ?? 0;

        $subtask = KanbanTaskSubtask::create([
            'task_id' => $task->id,
            'title' => $validated['title'],
            'notes' => $validated['notes'] ?? null,
            'status' => 'pending',
            'due_date' => $isCreator ? ($validated['due_date'] ?? null) : null,
            'assigned_employee_id' => $isCreator ? ($validated['assigned_employee_id'] ?? null) : null,
            'position' => $maxPos + 1,
        ]);

        $userName = $user ? ($user->employee?->name ?? $user->name) : 'Pengguna';
        $this->recordActivity($task->group_id, $task->id, $user, 'subtask_added', "{$userName} menambahkan tahapan \"{$subtask->title}\" pada tugas \"{$task->title}\"", [
            'task_title'    => $task->title,
            'subtask_title' => $subtask->title,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Rincian tahap pekerjaan berhasil ditambahkan.',
            'data' => $subtask->load(['assignedEmployee:id,name,nip,photo', 'completedByEmployee:id,name,nip,photo']),
        ], 201);
    }

    /**
     * Update a subtask (title, notes, status, due_date, assigned_employee_id).
     */
    public function updateSubtask(Request $request, int $subtaskId): JsonResponse
    {
        $subtask = KanbanTaskSubtask::with('task')->findOrFail($subtaskId);
        $user = $request->user();
        $isCreator = $this->isTaskCreatorOrAdmin($user, $subtask->task);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'notes' => 'nullable|string',
            'status' => 'sometimes|required|in:pending,in_progress,completed',
            'due_date' => 'nullable|date',
            'assigned_employee_id' => 'nullable|exists:employees,id',
        ]);

        if ((array_key_exists('assigned_employee_id', $validated) || array_key_exists('due_date', $validated)) && !$isCreator) {
            return response()->json([
                'status' => 'error',
                'message' => 'Hanya pembuat tugas yang berhak mengubah penunjukan PIC dan batas waktu (deadline) tahapan.',
            ], 403);
        }

        if (isset($validated['title'])) $subtask->title = $validated['title'];
        if (array_key_exists('notes', $validated)) $subtask->notes = $validated['notes'];
        if ($isCreator && array_key_exists('due_date', $validated)) $subtask->due_date = $validated['due_date'];
        if ($isCreator && array_key_exists('assigned_employee_id', $validated)) $subtask->assigned_employee_id = $validated['assigned_employee_id'];

        if (isset($validated['status'])) {
            $subtask->status = $validated['status'];
            if ($validated['status'] === 'completed') {
                $subtask->completed_at = now();
                if ($user) {
                    $subtask->completed_by_employee_id = $user->employee_id ?? null;
                    $subtask->completed_by_name = $user->name;
                }
            } else {
                $subtask->completed_at = null;
                $subtask->completed_by_employee_id = null;
                $subtask->completed_by_name = null;
            }
        }

        $subtask->save();

        if (isset($validated['status']) && $validated['status'] === 'completed') {
            $userName = $user ? ($user->employee?->name ?? $user->name) : 'Pengguna';
            $task = $subtask->task;
            $this->recordActivity($task?->group_id, $subtask->task_id, $user, 'subtask_completed', "{$userName} menyelesaikan tahapan \"{$subtask->title}\" pada tugas \"{$task?->title}\"", [
                'task_title'    => $task?->title,
                'subtask_title' => $subtask->title,
            ]);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Rincian pekerjaan berhasil diperbarui.',
            'data' => $subtask->fresh(['assignedEmployee:id,name,nip,photo', 'completedByEmployee:id,name,nip,photo']),
        ]);
    }

    /**
     * Upload evidence file for a subtask directly to Nextcloud storage.
     */
    public function uploadSubtaskEvidence(Request $request, int $subtaskId): JsonResponse
    {
        $subtask = KanbanTaskSubtask::with('task')->findOrFail($subtaskId);
        $user = $request->user();

        $request->validate([
            'evidence_file' => 'required|file|mimes:pdf,png,jpg,jpeg|max:51200', // max 50MB (hanya PDF, PNG, JPG, JPEG)
            'notes' => 'nullable|string',
            'mark_completed' => 'nullable|boolean',
        ]);

        $file = $request->file('evidence_file');
        $targetFolder = "Kanban_Work/Task_{$subtask->task_id}";

        try {
            // Delete old file from Nextcloud if replacing
            if ($subtask->attachment_path) {
                try {
                    $this->nextcloudService->deleteFile($subtask->attachment_path);
                } catch (\Exception $e) {
                    Log::warning("Failed to delete previous subtask file: " . $e->getMessage());
                }
            }

            // Upload directly to Nextcloud
            $prefix = "Subtask_{$subtask->id}";
            $relativePath = $this->nextcloudService->uploadFile($file, $targetFolder, $prefix);

            $subtask->attachment_path = $relativePath;
            $subtask->attachment_name = $file->getClientOriginalName();
            $subtask->attachment_size = $file->getSize();
            $subtask->attachment_mime = $file->getClientMimeType();

            if ($request->filled('notes')) {
                $subtask->notes = $request->input('notes');
            }

            if ($request->boolean('mark_completed', true)) {
                $subtask->status = 'completed';
                $subtask->completed_at = now();
                if ($user) {
                    $subtask->completed_by_employee_id = $user->employee_id ?? null;
                    $subtask->completed_by_name = $user->name;
                }
            }

            $subtask->save();

            $userName = $user ? ($user->employee?->name ?? $user->name) : 'Pengguna';
            $taskTitle = $subtask->task?->title ?? 'Tugas';
            $this->recordActivity($subtask->task?->group_id, $subtask->task_id, $user, 'evidence_uploaded', "{$userName} mengunggah bukti pengerjaan ({$subtask->attachment_name}) pada tahapan \"{$subtask->title}\" di tugas \"{$taskTitle}\"", [
                'task_title'      => $taskTitle,
                'subtask_title'   => $subtask->title,
                'attachment_name' => $subtask->attachment_name,
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Bukti proses berhasil diunggah ke Nextcloud.',
                'data' => $subtask->fresh(['assignedEmployee:id,name,nip,photo', 'completedByEmployee:id,name,nip,photo']),
            ]);
        } catch (\Exception $e) {
            Log::error("Kanban subtask Nextcloud upload error: " . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal mengunggah berkas ke Nextcloud: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete evidence attachment from subtask and Nextcloud.
     */
    public function deleteSubtaskEvidence(int $subtaskId): JsonResponse
    {
        $subtask = KanbanTaskSubtask::findOrFail($subtaskId);

        if ($subtask->attachment_path) {
            try {
                $this->nextcloudService->deleteFile($subtask->attachment_path);
            } catch (\Exception $e) {
                Log::warning("Failed to delete Nextcloud file: " . $e->getMessage());
            }
        }

        $subtask->attachment_path = null;
        $subtask->attachment_name = null;
        $subtask->attachment_size = null;
        $subtask->attachment_mime = null;
        $subtask->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Berkas bukti proses berhasil dihapus.',
            'data' => $subtask->fresh(['assignedEmployee:id,name,nip,photo', 'completedByEmployee:id,name,nip,photo']),
        ]);
    }

    /**
     * Delete a subtask.
     */
    public function deleteSubtask(int $subtaskId): JsonResponse
    {
        $subtask = KanbanTaskSubtask::findOrFail($subtaskId);

        if ($subtask->attachment_path) {
            try {
                $this->nextcloudService->deleteFile($subtask->attachment_path);
            } catch (\Exception $e) {
                Log::warning("Failed to delete subtask Nextcloud file: " . $e->getMessage());
            }
        }

        $subtask->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Rincian pekerjaan berhasil dihapus.',
        ]);
    }

    /**
     * Stream or download process evidence file from Nextcloud.
     */
    public function streamSubtaskFile(Request $request, int $subtaskId)
    {
        $subtask = KanbanTaskSubtask::findOrFail($subtaskId);

        if (!$subtask->attachment_path) {
            return response()->json(['message' => 'Berkas lampiran tidak ditemukan.'], 404);
        }

        $inline = !$request->boolean('download');
        return $this->nextcloudService->streamFile($subtask->attachment_path, $inline);
    }

    /**
     * Get list of employees for tagging in tasks.
     */
    public function listEmployees(): JsonResponse
    {
        $employees = Employee::select('id', 'name', 'nip', 'position', 'department', 'photo')
            ->orderBy('name', 'asc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $employees,
        ]);
    }

    /**
     * Get list of progress reports and history for a specific task.
     */
    public function listReports(int $taskId): JsonResponse
    {
        $task = KanbanTask::findOrFail($taskId);
        $reports = KanbanTaskReport::with([
            'employee:id,name,nip,position,department,photo',
            'user:id,name,email',
        ])->where('task_id', $taskId)
          ->orderBy('created_at', 'desc')
          ->get();

        return response()->json([
            'status' => 'success',
            'data' => $reports,
        ]);
    }

    /**
     * Submit a new progress report / work update for a task.
     */
    public function storeReport(Request $request, int $taskId): JsonResponse
    {
        $task = KanbanTask::findOrFail($taskId);
        $user = $request->user();

        $validated = $request->validate([
            'content' => 'required|string',
            'status_update' => 'nullable|in:todo,in_progress,review,done',
            'progress_percentage' => 'nullable|integer|min:0|max:100',
            'attachment_file' => 'nullable|file|mimes:pdf,png,jpg,jpeg|max:51200', // max 50MB (hanya PDF, PNG, JPG, JPEG)
        ]);

        $attachmentPath = null;
        $attachmentName = null;
        $attachmentSize = null;
        $attachmentMime = null;

        if ($request->hasFile('attachment_file')) {
            $file = $request->file('attachment_file');
            $targetFolder = "Kanban_Work/Task_{$taskId}/Reports";
            try {
                $relativePath = $this->nextcloudService->uploadFile($file, $targetFolder, "Report");
                $attachmentPath = $relativePath;
                $attachmentName = $file->getClientOriginalName();
                $attachmentSize = $file->getSize();
                $attachmentMime = $file->getClientMimeType();
            } catch (\Exception $e) {
                Log::error("Failed to upload report file to Nextcloud: " . $e->getMessage());
            }
        }

        $report = KanbanTaskReport::create([
            'task_id' => $taskId,
            'employee_id' => $user ? $user->employee_id : null,
            'user_id' => $user ? $user->id : null,
            'content' => $validated['content'],
            'status_update' => $validated['status_update'] ?? null,
            'progress_percentage' => $validated['progress_percentage'] ?? null,
            'attachment_path' => $attachmentPath,
            'attachment_name' => $attachmentName,
            'attachment_size' => $attachmentSize,
            'attachment_mime' => $attachmentMime,
        ]);

        // If status_update is provided, also update the task status
        if (!empty($validated['status_update']) && $validated['status_update'] !== $task->status) {
            $task->update(['status' => $validated['status_update']]);
        }

        $userName = $user ? ($user->employee?->name ?? $user->name) : 'Pengguna';
        $this->recordActivity(
            $task->group_id,
            $task->id,
            $user,
            'report_added',
            "{$userName} menambahkan riwayat perkembangan pada tugas \"{$task->title}\"",
            [
                'task_title' => $task->title,
                'status_update' => $report->status_update,
                'has_attachment' => !empty($report->attachment_path),
            ]
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Laporan perkembangan pekerjaan berhasil disimpan.',
            'data' => $report->load([
                'employee:id,name,nip,position,department,photo',
                'user:id,name,email',
            ]),
        ], 201);
    }

    /**
     * Delete a progress report from history.
     */
    public function destroyReport(int $reportId): JsonResponse
    {
        $report = KanbanTaskReport::with('task')->findOrFail($reportId);
        $task = $report->task;

        if ($report->attachment_path) {
            try {
                $this->nextcloudService->deleteFile($report->attachment_path);
            } catch (\Exception $e) {
                Log::warning("Failed to delete report file from Nextcloud: " . $e->getMessage());
            }
        }

        $user = request()->user();
        $userName = $user ? ($user->employee?->name ?? $user->name) : 'Pengguna';
        $this->recordActivity(
            $task?->group_id,
            $task?->id,
            $user,
            'report_deleted',
            "{$userName} menghapus riwayat perkembangan dari tugas \"{$task?->title}\""
        );

        $report->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Laporan perkembangan berhasil dihapus.',
        ]);
    }

    /**
     * Stream or download report attachment from Nextcloud.
     */
    public function streamReportFile(Request $request, int $reportId)
    {
        $report = KanbanTaskReport::findOrFail($reportId);

        if (!$report->attachment_path) {
            return response()->json(['message' => 'Berkas lampiran laporan tidak ditemukan.'], 404);
        }

        $inline = !$request->boolean('download');
        return $this->nextcloudService->streamFile($report->attachment_path, $inline);
    }

    /**
     * Get list of activity logs for a group or all workspaces.
     */
    public function listActivities(Request $request): JsonResponse
    {
        $query = KanbanActivityLog::with([
            'employee:id,name,nip,position,department,photo',
            'user:id,name,email',
            'task:id,title,status,priority,category,group_id',
            'group:id,name,color,icon,type',
        ])->orderBy('created_at', 'desc');

        if ($request->filled('group_id') && $request->input('group_id') !== 'all') {
            $groupId = $request->input('group_id');
            $query->where('group_id', $groupId);
        }

        if ($request->filled('task_id')) {
            $query->where('task_id', $request->input('task_id'));
        }

        if ($request->filled('action')) {
            $query->where('action', $request->input('action'));
        }

        $limit = min($request->integer('limit', 50), 100);
        $activities = $query->limit($limit)->get();

        return response()->json([
            'status' => 'success',
            'data'   => $activities,
        ]);
    }
}
