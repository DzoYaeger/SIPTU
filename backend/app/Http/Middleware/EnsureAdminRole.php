<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminRole
{
    /**
     * Only allow users with base_role = 'admin' to proceed.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user || ($user->base_role ?? null) !== 'admin') {
            return response()->json([
                'message' => 'Akses ditolak. Halaman ini hanya untuk administrator.',
            ], 403);
        }

        return $next($request);
    }
}
