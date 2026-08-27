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
        return ['database', WebPushChannel::class];
    }

    public function toArray($notifiable)
    {
        return [
            'title' => 'Halo dari SIPTU!',
            'message' => 'Ini adalah notifikasi uji coba dari SIPTU Mobile.',
            'url' => '/app/layanan-mandiri',
            'tipe_layanan' => 'test',
        ];
    }

    public function toWebPush($notifiable, $notification)
    {
        return (new WebPushMessage)
            ->title('Halo dari SIPTU!')
            ->icon('/logo192.png')
            ->badge('/logo/favicon.png')
            ->body('Ini adalah notifikasi uji coba dari SIPTU Mobile. Notifikasi Push PWA Anda aktif!')
            ->action('Buka Aplikasi', 'open_app')
            ->data(['url' => '/app/layanan-mandiri'])
            ->options(['TTL' => 86400]);
    }
}
