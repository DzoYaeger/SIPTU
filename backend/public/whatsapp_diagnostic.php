<?php

/**
 * WhatsApp notification diagnostic.
 *
 * Production URL:
 * https://siptu.bpompalopo.com/core_api/whatsapp_diagnostic.php?secret=siptudebug123
 *
 * Optional:
 * - &loan_id=123 checks a specific BMN loan and borrower phone resolution.
 * - &send_to=628xxxxxxxxxx sends a direct Fonnte test message.
 */

use App\Models\BmnLoan;
use App\Models\Employee;
use App\Models\NotificationSetting;
use App\Models\User;
use Illuminate\Support\Facades\Http;

header('Content-Type: application/json');

$secret = getenv('WHATSAPP_DIAGNOSTIC_SECRET') ?: 'siptudebug123';
if (empty($_GET['secret']) || !hash_equals($secret, (string) $_GET['secret'])) {
    http_response_code(403);
    echo json_encode([
        'status' => 'error',
        'message' => 'Unauthorized.',
    ], JSON_PRETTY_PRINT);
    exit;
}

function mask_value(?string $value, int $visibleStart = 4, int $visibleEnd = 4): ?string
{
    if ($value === null || $value === '') {
        return $value;
    }

    $length = strlen($value);
    if ($length <= $visibleStart + $visibleEnd) {
        return str_repeat('*', $length);
    }

    return substr($value, 0, $visibleStart) . '...' . substr($value, -$visibleEnd);
}

function normalize_phone(?string $value): ?string
{
    if ($value === null) {
        return null;
    }

    $clean = preg_replace('/\D/', '', $value);
    if ($clean === '' || $clean === null) {
        return null;
    }

    if (str_starts_with($clean, '0')) {
        return '62' . substr($clean, 1);
    }

    if (str_starts_with($clean, '62')) {
        return $clean;
    }

    return $clean;
}

function recent_log_matches(string $basePath): array
{
    $logPath = $basePath . '/storage/logs/laravel.log';
    if (!is_file($logPath) || !is_readable($logPath)) {
        return [
            'path' => $logPath,
            'readable' => false,
            'matches' => [],
        ];
    }

    $lines = file($logPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (!is_array($lines)) {
        return [
            'path' => $logPath,
            'readable' => false,
            'matches' => [],
        ];
    }

    $patterns = [
        '[FonnteService]',
        '[BmnLoan]',
        'Fonnte',
        'WhatsApp',
        'notification',
    ];

    $matches = [];
    foreach (array_reverse($lines) as $line) {
        foreach ($patterns as $pattern) {
            if (stripos($line, $pattern) !== false) {
                $matches[] = mb_substr($line, 0, 1000);
                break;
            }
        }

        if (count($matches) >= 30) {
            break;
        }
    }

    return [
        'path' => $logPath,
        'readable' => true,
        'matches' => array_reverse($matches),
    ];
}

try {
    require __DIR__ . '/../vendor/autoload.php';
    $app = require_once __DIR__ . '/../bootstrap/app.php';
    $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
    $kernel->bootstrap();

    $basePath = base_path();
    $frontendPath = dirname($basePath) . '/public_html';

    $settings = NotificationSetting::query()->orderBy('id')->get();
    $activeSetting = $settings->first();

    $settingRows = $settings->map(function (NotificationSetting $setting) {
        $recipients = is_array($setting->recipients) ? $setting->recipients : [];
        return [
            'id' => $setting->id,
            'has_token' => filled($setting->fonnte_token),
            'token_masked' => mask_value($setting->fonnte_token),
            'endpoint' => $setting->fonnte_endpoint ?: 'https://api.fonnte.com/send',
            'default_admin_numbers_count' => is_array($setting->default_admin_numbers) ? count($setting->default_admin_numbers) : 0,
            'default_admin_numbers_masked' => collect($setting->default_admin_numbers ?? [])->map(fn ($number) => mask_value((string) $number, 3, 3))->values()->all(),
            'recipient_keys' => array_keys($recipients),
            'bmn_peminjaman_targets_count' => is_array($recipients['bmn-peminjaman-aset'] ?? null) ? count($recipients['bmn-peminjaman-aset']) : 0,
            'bmn_peminjaman_targets_masked' => collect($recipients['bmn-peminjaman-aset'] ?? [])->map(fn ($number) => mask_value((string) $number, 3, 3))->values()->all(),
            'created_at' => optional($setting->created_at)->toDateTimeString(),
            'updated_at' => optional($setting->updated_at)->toDateTimeString(),
        ];
    })->values()->all();

    $fonnteDevice = null;
    if ($activeSetting && filled($activeSetting->fonnte_token)) {
        try {
            $deviceResponse = Http::withoutVerifying()
                ->timeout(20)
                ->withHeaders(['Authorization' => $activeSetting->fonnte_token])
                ->post('https://api.fonnte.com/device');

            $fonnteDevice = [
                'http_status' => $deviceResponse->status(),
                'ok' => $deviceResponse->successful(),
                'response' => $deviceResponse->json() ?? $deviceResponse->body(),
            ];
        } catch (Throwable $e) {
            $fonnteDevice = [
                'ok' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    $loanDiagnostic = null;
    $loanId = $_GET['loan_id'] ?? null;
    if ($loanId !== null && $loanId !== '') {
        $loan = BmnLoan::query()->find($loanId);
        if ($loan) {
            $employeeById = $loan->borrower_id ? Employee::query()->find($loan->borrower_id) : null;
            $employeeByNip = $loan->borrower_nip ? Employee::query()->where('nip', $loan->borrower_nip)->first() : null;
            $userByNip = $loan->borrower_nip ? User::query()->where('nip', $loan->borrower_nip)->first() : null;

            $candidates = [
                'bmn_loans.borrower_phone' => $loan->borrower_phone,
                'employees.id.phone_number' => $employeeById?->phone_number,
                'employees.nip.phone_number' => $employeeByNip?->phone_number,
                'users.nip.phone_number' => $userByNip?->phone_number,
            ];

            $loanDiagnostic = [
                'found' => true,
                'id' => $loan->id,
                'spa_number' => $loan->spa_number,
                'status' => $loan->status,
                'borrower_name' => $loan->borrower_name,
                'borrower_nip' => $loan->borrower_nip,
                'phone_candidates_masked' => collect($candidates)->map(fn ($number) => mask_value($number, 3, 3))->all(),
                'first_valid_normalized_phone_masked' => mask_value(collect($candidates)->map(fn ($number) => normalize_phone($number))->filter()->first(), 3, 3),
            ];
        } else {
            $loanDiagnostic = [
                'found' => false,
                'id' => $loanId,
            ];
        }
    }

    $testSend = null;
    $sendTo = $_GET['send_to'] ?? null;
    if ($sendTo && $activeSetting && filled($activeSetting->fonnte_token)) {
        $target = normalize_phone((string) $sendTo);
        if ($target) {
            try {
                $sendResponse = Http::asForm()
                    ->withoutVerifying()
                    ->timeout(20)
                    ->withHeaders(['Authorization' => $activeSetting->fonnte_token])
                    ->post($activeSetting->fonnte_endpoint ?: 'https://api.fonnte.com/send', [
                        'target' => $target,
                        'message' => '[SIPTU] Tes diagnostik WhatsApp Fonnte dari core_api. Waktu: ' . now()->format('Y-m-d H:i:s'),
                    ]);

                $testSend = [
                    'target_masked' => mask_value($target, 3, 3),
                    'http_status' => $sendResponse->status(),
                    'ok' => $sendResponse->successful(),
                    'response' => $sendResponse->json() ?? $sendResponse->body(),
                ];
            } catch (Throwable $e) {
                $testSend = [
                    'target_masked' => mask_value($target, 3, 3),
                    'ok' => false,
                    'error' => $e->getMessage(),
                ];
            }
        }
    }

    echo json_encode([
        'status' => 'success',
        'structure' => [
            'core_api_base_path' => $basePath,
            'expected_public_html_path' => $frontendPath,
            'public_html_exists' => is_dir($frontendPath),
            'app_url' => config('app.url'),
            'frontend_url' => config('app.frontend_url'),
            'config_cached' => is_file($basePath . '/bootstrap/cache/config.php'),
            'routes_cached' => is_file($basePath . '/bootstrap/cache/routes-v7.php') || is_file($basePath . '/bootstrap/cache/routes.php'),
        ],
        'notification_settings' => [
            'row_count' => $settings->count(),
            'first_row_is_used_by_app' => $activeSetting?->id,
            'warning' => $settings->count() > 1 ? 'Aplikasi memakai NotificationSetting::first(); jika baris pertama token/recipient kosong, notifikasi tidak terkirim.' : null,
            'rows' => $settingRows,
        ],
        'fonnte_device_check' => $fonnteDevice,
        'bmn_loan_check' => $loanDiagnostic,
        'test_send' => $testSend,
        'recent_notification_logs' => recent_log_matches($basePath),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}
