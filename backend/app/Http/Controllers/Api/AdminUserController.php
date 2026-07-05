<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AdminUserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $users = User::all();

        $formattedUsers = $users->map(function ($user) {
            // Get the associated employee if it exists
            $employee = $user->employee;

            return [
                'id' => $user->id,
                'nip' => $user->nip,
                'name' => $user->name,
                'email' => $user->email,
                'phone_number' => $user->phone_number,
                'base_role' => $user->base_role,
                'available_roles' => $user->available_roles,
                'role_modules' => $user->role_modules,
                'modules' => $user->modules,
                'module_permissions' => $user->module_permissions,
                'employee' => $employee ? [
                    'id' => $employee->id,
                    'name' => $employee->name,
                    'nip' => $employee->nip,
                ] : null,
                'created_at' => $user->created_at,
                'updated_at' => $user->updated_at,
            ];
        });

        return response()->json([
            'data' => $formattedUsers,
            'meta' => [
                'total' => $formattedUsers->count(),
            ]
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nip' => 'required|string|max:255',
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'password' => 'nullable|string|min:8',
            'phone_number' => 'nullable|string|max:255',
            'base_role' => 'required|string|in:admin,operator,validator',
            'available_roles' => 'nullable|array',
            'available_roles.*' => 'string|in:admin,operator,validator',
            'role_modules' => 'nullable|array',
            'modules' => 'nullable|array',
            'module_permissions' => 'nullable|array',
            'employee_id' => 'nullable|integer|exists:employees,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $validated = $validator->validated();
        $validated['module_permissions'] = $this->normalizeModulePermissions($validated['module_permissions'] ?? null);

        // Hash the password if provided
        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            // Use default password if none provided
            $validated['password'] = Hash::make('1@Palopo@1');
        }

        $user = User::create($validated);

        if (!empty($validated['employee_id'])) {
            $employee = \App\Models\Employee::find($validated['employee_id']);
            if ($employee) {
                // Remove previous user link if it existed
                if ($employee->user_id) {
                    \App\Models\Employee::where('user_id', $employee->user_id)->update(['user_id' => null]);
                }
                $employee->update(['user_id' => $user->id]);
            }
        }

        return response()->json([
            'data' => $user,
            'message' => 'User created successfully'
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $user = User::findOrFail($id);
        $employee = $user->employee;

        return response()->json([
            'data' => [
                'id' => $user->id,
                'nip' => $user->nip,
                'name' => $user->name,
                'email' => $user->email,
                'phone_number' => $user->phone_number,
                'base_role' => $user->base_role,
                'available_roles' => $user->available_roles,
                'role_modules' => $user->role_modules,
                'modules' => $user->modules,
                'module_permissions' => $user->module_permissions,
                'employee' => $employee ? [
                    'id' => $employee->id,
                    'name' => $employee->name,
                    'nip' => $employee->nip,
                ] : null,
                'created_at' => $user->created_at,
                'updated_at' => $user->updated_at,
            ]
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $user = User::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'nip' => 'nullable|string|max:255',
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'password' => 'nullable|string|min:8',
            'phone_number' => 'nullable|string|max:255',
            'base_role' => 'required|string|in:admin,operator,validator',
            'available_roles' => 'nullable|array',
            'available_roles.*' => 'string|in:admin,operator,validator',
            'role_modules' => 'nullable|array',
            'modules' => 'nullable|array',
            'module_permissions' => 'nullable|array',
            'employee_id' => 'nullable|integer|exists:employees,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $validated = $validator->validated();
        if (array_key_exists('module_permissions', $validated)) {
            $validated['module_permissions'] = $this->normalizeModulePermissions($validated['module_permissions']);
        }

        // Hash the password if provided
        if (isset($validated['password']) && !empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            // Don't update password if not provided
            unset($validated['password']);
        }

        $user->update($validated);

        // Update employee linkage if explicitly requested
        if (array_key_exists('employee_id', $validated)) {
            // First unlink any employee currently linked to this user
            \App\Models\Employee::where('user_id', $user->id)->update(['user_id' => null]);
            
            if (!empty($validated['employee_id'])) {
                $employee = \App\Models\Employee::find($validated['employee_id']);
                if ($employee) {
                    $employee->update(['user_id' => $user->id]);
                }
            }
        }

        return response()->json([
            'data' => $user,
            'message' => 'User updated successfully'
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $user = User::findOrFail($id);
        $user->delete();

        return response()->json([
            'message' => 'User deleted successfully'
        ]);
    }

    private function normalizeModulePermissions($permissions): ?array
    {
        if ($permissions === null) {
            return null;
        }

        if (!is_array($permissions)) {
            return [];
        }

        $normalized = [];

        foreach ($permissions as $permission) {
            if (!is_array($permission)) {
                continue;
            }

            $slug = $permission['module_slug'] ?? $permission['module_id'] ?? $permission['slug'] ?? null;
            if (!$slug) {
                continue;
            }

            $normalized[] = [
                'module_id' => $slug,
                'module_slug' => $slug,
                'is_admin' => (bool)($permission['is_admin'] ?? false),
                'is_operator' => (bool)($permission['is_operator'] ?? false),
                'is_validator' => (bool)($permission['is_validator'] ?? false),
            ];
        }

        return $normalized;
    }
}
