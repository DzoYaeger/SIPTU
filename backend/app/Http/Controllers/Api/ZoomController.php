<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class ZoomController extends Controller
{
    private function getZoomAccessToken()
    {
        $clientId = config('services.zoom.client_id');
        $clientSecret = config('services.zoom.client_secret');
        $accountId = config('services.zoom.account_id');

        if (!$clientId || !$clientSecret || !$accountId) {
            throw new \Exception("Konfigurasi API Zoom tidak lengkap.");
        }

        $url = "https://zoom.us/oauth/token?grant_type=account_credentials&account_id=" . urlencode($accountId);

        $response = Http::withBasicAuth($clientId, $clientSecret)
            ->asForm()
            ->post($url);

        if ($response->failed()) {
            throw new \Exception("Zoom Authentication Gagal: " . ($response->json('error_description') ?? $response->body()));
        }

        return $response->json('access_token');
    }

    public function listUsers()
    {
        try {
            $token = $this->getZoomAccessToken();
            
            $response = Http::withToken($token)
                ->get("https://api.zoom.us/v2/users", [
                    'status' => 'active',
                    'page_size' => 30
                ]);

            if ($response->failed()) {
                Log::warning("Zoom list users API failed, using fallback: " . $response->body());
                return response()->json([
                    'is_fallback' => true,
                    'users' => [
                        [
                            'id' => 'me',
                            'first_name' => 'Default',
                            'last_name' => 'Host (me)',
                            'email' => 'Pemilik Akun Zoom'
                        ]
                    ]
                ]);
            }

            return response()->json([
                'is_fallback' => false,
                'users' => $response->json('users') ?? []
            ]);
        } catch (\Throwable $e) {
            Log::warning("Zoom list users exception: " . $e->getMessage());
            return response()->json([
                'is_fallback' => true,
                'users' => [
                    [
                        'id' => 'me',
                        'first_name' => 'Default',
                        'last_name' => 'Host (me)',
                        'email' => 'Pemilik Akun Zoom'
                    ]
                ],
                'warning' => $e->getMessage()
            ]);
        }
    }

    /**
     * Create or update a Zoom meeting room.
     */
    public function createMeeting(Request $request)
    {
        $payload = $request->validate([
            'user_id' => ['required', 'string'], // Zoom user ID or email
            'topic' => ['required', 'string', 'max:250'],
            'agenda' => ['nullable', 'string', 'max:1000'],
            'duration' => ['required', 'integer', 'min:5', 'max:1440'],
        ]);

        $userId = $payload['user_id'];
        $topic = $payload['topic'];
        $agenda = $payload['agenda'] ?? '';
        $duration = (int) $payload['duration'];

        try {
            $token = $this->getZoomAccessToken();
            $today = today()->toDateString();
            // Cache per Zoom User so each host user has their own cached meeting ID for the day
            $cacheKey = "zoom_meeting_cache_" . md5($userId) . "_" . $today;
            
            $cachedMeeting = Cache::get($cacheKey);

            if ($cachedMeeting) {
                // Update the existing meeting details
                $url = "https://api.zoom.us/v2/meetings/" . $cachedMeeting['id'];
                
                $updateResponse = Http::withToken($token)
                    ->withBody(json_encode([
                        'topic' => $topic,
                        'agenda' => $agenda,
                        'duration' => $duration
                    ]), 'application/json')
                    ->patch($url);

                if ($updateResponse->successful()) {
                    $cachedMeeting['topic'] = $topic;
                    $cachedMeeting['agenda'] = $agenda;
                    $cachedMeeting['duration'] = $duration;
                    
                    // Re-cache until the end of today
                    Cache::put($cacheKey, $cachedMeeting, now()->endOfDay());
                    
                    return response()->json([
                        'success' => true,
                        'data' => $cachedMeeting
                    ]);
                }
                
                // If update fails (e.g. meeting deleted on Zoom dashboard), we fall back to creating a new one
            }

            // Create a new Zoom meeting
            $url = "https://api.zoom.us/v2/users/" . urlencode($userId) . "/meetings";
            $startTime = now()->addMinutes(5)->format('Y-m-d\TH:i:s'); // start in 5 minutes
            
            $createResponse = Http::withToken($token)
                ->withBody(json_encode([
                    'topic' => $topic,
                    'type' => 2, // Scheduled meeting
                    'start_time' => $startTime,
                    'timezone' => 'Asia/Makassar',
                    'duration' => $duration,
                    'agenda' => $agenda,
                    'settings' => [
                        'join_before_host' => true,
                        'waiting_room' => false,
                        'approval_type' => 0, // no registration required
                        'audio' => 'both',
                        'auto_recording' => 'none',
                        'mute_upon_entry' => true,
                        'host_video' => true,
                        'participant_video' => true,
                    ]
                ]), 'application/json')
                ->post($url);

            if ($createResponse->failed()) {
                return response()->json([
                    'message' => 'Gagal membuat room Zoom: ' . $createResponse->body()
                ], $createResponse->status());
            }

            $raw = $createResponse->json();
            $meetingData = [
                'id' => $raw['id'],
                'topic' => $raw['topic'],
                'type' => $raw['type'],
                'status' => $raw['status'] ?? 'waiting',
                'start_time' => $raw['start_time'],
                'duration' => $raw['duration'] ?? $duration,
                'start_url' => $raw['start_url'] ?? '',
                'join_url' => $raw['join_url'],
                'password' => $raw['password'] ?? ''
            ];

            // Cache until the end of the day
            Cache::put($cacheKey, $meetingData, now()->endOfDay());

            return response()->json([
                'success' => true,
                'data' => $meetingData
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
