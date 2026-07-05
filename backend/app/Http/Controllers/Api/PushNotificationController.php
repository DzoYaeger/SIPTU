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
        $user->updatePushSubscription(
            $request->endpoint,
            $request->keys['p256dh'],
            $request->keys['auth']
        );

        Log::info('User subscribed to push notifications.', ['user_id' => $user->id, 'endpoint' => $request->endpoint]);

        return response()->json(['success' => true, 'message' => 'Successfully subscribed to push notifications.']);
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

        $user->notify(new \App\Notifications\TestPushNotification());

        return response()->json(['success' => true, 'message' => 'Test notification sent.']);
    }
}
