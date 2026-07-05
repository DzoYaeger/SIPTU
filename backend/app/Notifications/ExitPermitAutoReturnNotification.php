<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushMessage;
use NotificationChannels\WebPush\WebPushChannel;

class ExitPermitAutoReturnNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct()
    {
        //
    }

    public function via(object $notifiable): array
    {
        return [WebPushChannel::class];
    }

    public function toWebPush($notifiable, $notification)
    {
        return (new WebPushMessage)
            ->title('Izin Keluar Selesai Otomatis')
            ->icon('/logo192.png')
            ->body("Izin keluar Anda telah diselesaikan otomatis karena Anda telah berada di kantor.")
            ->action('Lihat Riwayat', 'view_history')
            ->data(['url' => "/app/rispeg-monitoring-izin-keluar"])
            ->options(['TTL' => 86400]);
    }
}
