<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FonnteService
{
    public function send(string $endpoint, string $token, array $targets, string $message): array
    {
        $endpoint = trim($endpoint) !== '' ? trim($endpoint) : 'https://api.fonnte.com/send';
        $token = trim($token);

        if (!$endpoint || !$token || empty($targets)) {
            return ['ok' => false, 'message' => 'Missing endpoint/token/targets'];
        }

        $normalizedTargets = [];
        foreach ($targets as $target) {
            if (!$target) {
                continue;
            }

            $targetParts = preg_split('/[\s,;]+/', (string) $target, -1, PREG_SPLIT_NO_EMPTY);
            foreach ($targetParts ?: [] as $targetPart) {
                $targetPart = trim($targetPart);
                if ($targetPart === '') {
                    continue;
                }

                // Fonnte group IDs contain non-phone characters, e.g. @g.us.
                if (preg_match('/[a-zA-Z@]/', $targetPart)) {
                    $normalizedTargets[] = $targetPart;
                    continue;
                }

                $clean = preg_replace('/\D/', '', $targetPart);
                if (!empty($clean)) {
                    if (str_starts_with($clean, '0')) {
                        $clean = '62' . substr($clean, 1);
                    }
                    $normalizedTargets[] = $clean;
                }
            }
        }

        $normalizedTargets = array_values(array_unique($normalizedTargets));
        if (empty($normalizedTargets)) {
            return ['ok' => false, 'message' => 'No valid targets after normalization'];
        }

        $targetString = implode(',', $normalizedTargets);

        try {
            $response = Http::asForm()
                ->withoutVerifying() // Bypass SSL verification (cURL error 60 workaround)
                ->withHeaders([
                    'Authorization' => $token,
                ])
                ->post($endpoint, [
                    'target' => $targetString,
                    'message' => $message,
                ]);

            if (!$response->successful()) {
                Log::warning('[FonnteService] WhatsApp notification was not accepted by Fonnte.', [
                    'endpoint' => $endpoint,
                    'status' => $response->status(),
                    'targets' => $normalizedTargets,
                    'body' => $response->json() ?? $response->body(),
                ]);
            }

            return [
                'ok' => $response->successful(),
                'status' => $response->status(),
                'body' => $response->json(),
            ];
        } catch (\Throwable $e) {
            Log::error('[FonnteService] Error sending WhatsApp notification: ' . $e->getMessage(), [
                'exception' => $e,
                'endpoint' => $endpoint,
                'targets' => $targetString,
            ]);

            return [
                'ok' => false,
                'message' => 'HTTP request exception: ' . $e->getMessage(),
            ];
        }
    }
}
