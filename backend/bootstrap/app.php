<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        apiPrefix: 'api',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->booting(function () {
        // ── Rate Limiters (tiered) ──────────────────────────────────
        // Login: ketat (5 req/menit) — anti brute-force
        RateLimiter::for('login', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });

        // Public API: moderate (30 req/menit) — cegah spam form
        RateLimiter::for('public-api', function (Request $request) {
            return Limit::perMinute(30)->by($request->ip());
        });

        // Queue display polling: longgar (120 req/menit = 1 per 0.5 detik)
        // TV display polls setiap 2 detik, jadi 120/menit sangat cukup
        RateLimiter::for('queue-polling', function (Request $request) {
            return Limit::perMinute(120)->by($request->ip());
        });

        // Authenticated API: standard (60 req/menit per user)
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });
    })
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '*');

        $middleware->use([
            \Illuminate\Http\Middleware\TrustHosts::class,
            \Illuminate\Http\Middleware\TrustProxies::class,
            \App\Http\Middleware\CorsMiddleware::class,
            \Illuminate\Foundation\Http\Middleware\PreventRequestsDuringMaintenance::class,
            \Illuminate\Http\Middleware\ValidatePostSize::class,
            \Illuminate\Foundation\Http\Middleware\TrimStrings::class,
            \Illuminate\Foundation\Http\Middleware\ConvertEmptyStringsToNull::class,
        ]);

        $middleware->alias([
            'admin' => \App\Http\Middleware\EnsureAdminRole::class,
            'password.reset' => \App\Http\Middleware\CheckPasswordResetRequired::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(function (Request $request, Throwable $e) {
            if ($request->is('api/*')) {
                return true;
            }

            return $request->expectsJson();
        });
    })->create();

