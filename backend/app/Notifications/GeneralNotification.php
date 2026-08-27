<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

use NotificationChannels\WebPush\WebPushMessage;
use NotificationChannels\WebPush\WebPushChannel;

class GeneralNotification extends Notification
{
    use Queueable;

    public $title;
    public $message;
    public $idLayanan;
    public $tipeLayanan;
    public $url;

    /**
     * Create a new notification instance.
     */
    public function __construct($title, $message, $idLayanan = null, $tipeLayanan = null, $url = '/app/layanan-mandiri')
    {
        $this->title = $title;
        $this->message = $message;
        $this->idLayanan = $idLayanan;
        $this->tipeLayanan = $tipeLayanan;
        $this->url = $url;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database', WebPushChannel::class];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => $this->title,
            'message' => $this->message,
            'id_layanan' => $this->idLayanan,
            'tipe_layanan' => $this->tipeLayanan,
            'url' => $this->url,
        ];
    }

    /**
     * Get the web push representation of the notification.
     */
    public function toWebPush(object $notifiable, $notification): WebPushMessage
    {
        return (new WebPushMessage)
            ->title($this->title)
            ->icon('/logo192.png')
            ->badge('/logo/favicon.png')
            ->body($this->message)
            ->action('Buka Aplikasi', 'open_app')
            ->data(['url' => $this->url ?? '/app/layanan-mandiri'])
            ->options(['TTL' => 86400]);
    }
}
