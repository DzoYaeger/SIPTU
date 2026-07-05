<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Employee;
use App\Models\User;

class TestController extends Controller
{
    /**
     * Test the connection between employees and users
     */
    public function testConnection()
    {
        $employees = Employee::with('user')->get();
        $users = User::all();

        $result = [
            'total_employees' => $employees->count(),
            'total_users' => $users->count(),
            'employees_with_users' => $employees->filter(function($emp) {
                return $emp->user !== null;
            })->count(),
            'employees_without_users' => $employees->filter(function($emp) {
                return $emp->user === null;
            })->count(),
            'sample_data' => [
                'employees' => $employees->take(3)->map(function($emp) {
                    return [
                        'nip' => $emp->nip,
                        'name' => $emp->name,
                        'has_user_account' => $emp->user !== null,
                        'user_nip' => $emp->user ? $emp->user->nip : null
                    ];
                }),
                'users' => $users->take(3)->map(function($user) {
                    return [
                        'nip' => $user->nip,
                        'name' => $user->name,
                        'base_role' => $user->base_role
                    ];
                })
            ]
        ];

        return response()->json($result);
    }
}
