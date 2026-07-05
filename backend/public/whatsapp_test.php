<?php
/**
 * WhatsApp Fonnte Notification Diagnostic Script
 * Save as: backend/public/whatsapp_test.php
 * Usage: https://siptu.bpompalopo.com/core_api/whatsapp_test.php?secret=siptudebug123
 */

use App\Models\NotificationSetting;
use Illuminate\Support\Facades\Http;

header('Content-Type: application/json');

// Security key check
if (empty($_GET['secret']) || $_GET['secret'] !== 'siptudebug123') {
    http_response_code(403);
    echo json_encode([
        'status' => 'error',
        'message' => 'Unauthorized access. Please provide the correct secret query parameter (?secret=siptudebug123).'
    ], JSON_PRETTY_PRINT);
    exit;
}

try {
    // Bootstrap Laravel
    require __DIR__ . '/../vendor/autoload.php';
    $app = require_once __DIR__ . '/../bootstrap/app.php';
    $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
    $kernel->bootstrap();

    // 1. Fetch Notification Settings
    $setting = NotificationSetting::first();
    if (!$setting) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Notification settings not found in hosting database.'
        ], JSON_PRETTY_PRINT);
        exit;
    }

    $token = $setting->fonnte_token;
    $endpoint = $setting->fonnte_endpoint ?: 'https://api.fonnte.com/send';
    $deviceUrl = 'https://api.fonnte.com/device';

    if (empty($token)) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Fonnte token is empty in database notification settings on the hosting server.'
        ], JSON_PRETTY_PRINT);
        exit;
    }

    // 2. Check device connection status from Fonnte API
    $response = Http::withoutVerifying()->withHeaders([
        'Authorization' => $token,
    ])->post($deviceUrl);

    $deviceInfo = $response->json();
    $httpStatus = $response->status();

    // 3. Obfuscate token for security in output
    $obfuscatedToken = strlen($token) > 8 
        ? substr($token, 0, 4) . '...' . substr($token, -4)
        : '***';
    
    // 4. Handle optional test message sending
    $testSendResult = null;
    $sendTo = $_GET['send_to'] ?? null;
    if ($sendTo) {
        // Clean target number format
        $cleanNumber = preg_replace('/[^0-9]/', '', $sendTo);
        if (str_starts_with($cleanNumber, '0')) {
            $cleanNumber = '62' . substr($cleanNumber, 1);
        }
        
        $sendResponse = Http::asForm()->withoutVerifying()->withHeaders([
            'Authorization' => $token,
        ])->post($endpoint, [
            'target' => $cleanNumber,
            'message' => 'SIPTU WhatsApp Notification Test. Fonnte API connection is working.',
        ]);
        
        $testSendResult = [
            'target' => $cleanNumber,
            'http_status' => $sendResponse->status(),
            'response' => $sendResponse->json(),
        ];
    }

    echo json_encode([
        'status' => 'success',
        'database_connection' => 'OK',
        'fonnte_configuration' => [
            'endpoint' => $endpoint,
            'token_obfuscated' => $obfuscatedToken,
            'default_admin_numbers' => $setting->default_admin_numbers,
        ],
        'fonnte_api_device_check' => [
            'http_status' => $httpStatus,
            'response' => $deviceInfo,
        ],
        'test_send' => $testSendResult,
        'info' => 'To test sending a message, add: &send_to=628xxxxxxxxx'
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

} catch (\Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => 'An exception occurred during diagnostics on the hosting server.',
        'error_detail' => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
