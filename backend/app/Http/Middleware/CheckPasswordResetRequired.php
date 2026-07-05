<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPasswordResetRequired
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user) {
            // Bypass checking for routes that are required for updating the password or logging out
            if ($request->is('api/user') && $request->isMethod('get')) {
                return $next($request);
            }
            if ($request->is('api/user/password') && $request->isMethod('put')) {
                return $next($request);
            }
            if ($request->is('api/logout')) {
                return $next($request);
            }

            // Check if password change is forced or older than 90 days
            $needsReset = false;
            if ($user->must_reset_password) {
                $needsReset = true;
            } elseif (!$user->password_changed_at) {
                $needsReset = true;
            } elseif ($user->password_changed_at->diffInDays(now()) >= 90) {
                $needsReset = true;
            }

            if ($needsReset) {
                return response()->json([
                    'message' => 'Silakan ubah password Anda terlebih dahulu untuk alasan keamanan (wajib diganti setiap 3 bulan).',
                    'code' => 'PASSWORD_RESET_REQUIRED'
                ], 423); // 423 Locked
            }
        }

        return $next($request);
    }
}
