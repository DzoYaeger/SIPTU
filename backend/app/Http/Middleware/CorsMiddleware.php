<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CorsMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $origin = $request->header('Origin');

        // Allowed origins — extend via CORS_ORIGINS env (comma-separated)
        $allowedOrigins = array_filter(array_merge(
            [
                'http://localhost:3000',
                'http://localhost:5173',
                'http://127.0.0.1:3000',
                'http://127.0.0.1:5173',
            ],
            array_map('trim', explode(',', env('CORS_ORIGINS', '')))
        ));

        // Only set header if origin is explicitly allowed — no wildcard fallback
        $allowOrigin = null;
        if ($origin && in_array($origin, $allowedOrigins)) {
            $allowOrigin = $origin;
        }

        $headers = [
            'Access-Control-Allow-Methods' => 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
            'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Requested-With, X-CSRF-TOKEN, Accept, Origin',
            'Access-Control-Expose-Headers' => 'Content-Disposition, Content-Type',
            'Access-Control-Max-Age' => '86400',
        ];

        if ($allowOrigin) {
            $headers['Access-Control-Allow-Origin'] = $allowOrigin;
            $headers['Vary'] = 'Origin';
        }

        // Handle preflight OPTIONS request
        if ($request->isMethod('OPTIONS')) {
            return response()->json('OK', 200, $headers);
        }

        $response = $next($request);

        foreach ($headers as $key => $value) {
            $response->headers->set($key, $value);
        }

        return $response;
    }
}
