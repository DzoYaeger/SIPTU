<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PushNotificationController extends Controller
{
    /**
     * Subscribe user to web push notifications.
     */
    public function subscribe(Request $request)
    {
        $request->validate([
            'endpoint' => 'required|string',
            'keys.auth' => 'required|string',
            'keys.p256dh' => 'required|string',
        ]);

        $user = $request->user();

        // Update or create the push subscription for the user
        $contentEncoding = $request->input('contentEncoding') ?? 'aes128gcm';
        $user->updatePushSubscription(
            $request->endpoint,
            $request->keys['p256dh'],
            $request->keys['auth'],
            $contentEncoding
        );

        $subsCount = $user->pushSubscriptions()->count();
        Log::info('User subscribed to push notifications.', [
            'user_id' => $user->id,
            'endpoint' => $request->endpoint,
            'total_active_devices' => $subsCount
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Successfully subscribed to push notifications.',
            'devices_count' => $subsCount
        ]);
    }

    /**
     * Unsubscribe user from web push notifications.
     */
    public function unsubscribe(Request $request)
    {
        $request->validate([
            'endpoint' => 'required|string',
        ]);

        $user = $request->user();

        // Find and delete the push subscription
        $user->deletePushSubscription($request->endpoint);

        Log::info('User unsubscribed from push notifications.', ['user_id' => $user->id, 'endpoint' => $request->endpoint]);

        return response()->json(['success' => true, 'message' => 'Successfully unsubscribed from push notifications.']);
    }

    /**
     * Send a test push notification.
     */
    public function testNotification(Request $request)
    {
        $user = $request->user();
        $subsCount = $user->pushSubscriptions()->count();

        Log::info("Dispatching test push notification to user #{$user->id} with {$subsCount} active device subscriptions.");

        try {
            $user->notify(new \App\Notifications\TestPushNotification());
        } catch (\Throwable $e) {
            Log::error("Failed to send test push notification: " . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Gagal mengirim notifikasi: ' . $e->getMessage()], 500);
        }

        return response()->json([
            'success' => true,
            'message' => "Notifikasi tes berhasil dikirim ke {$subsCount} perangkat terdaftar.",
            'subscriptions_count' => $subsCount,
        ]);
    }
}
