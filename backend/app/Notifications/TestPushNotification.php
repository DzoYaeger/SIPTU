<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushMessage;
use NotificationChannels\WebPush\WebPushChannel;

class TestPushNotification extends Notification
{
    use Queueable;

    public function __construct()
    {
        //
    }

    public function via($notifiable)
    {
        return [WebPushChannel::class];
    }

    public function toWebPush($notifiable, $notification)
    {
        return (new WebPushMessage)
            ->title('Halo dari SIPTU!')
            ->icon('/logo/favicon.png')
            ->body('Ini adalah notifikasi uji coba dari SIPTU Mobile.')
            ->action('Buka Aplikasi', '/app/layanan-mandiri');
    }
}
