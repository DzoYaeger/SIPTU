<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushMessage;
use NotificationChannels\WebPush\WebPushChannel;

class SiptuPushNotification extends Notification
{
    use Queueable;

    public string $title;
    public string $body;
    public string $url;
    public string $icon;
    public ?string $badge;
    public ?string $tipeLayanan;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        string $title,
        string $body,
        string $url = '/app/layanan-mandiri',
        string $icon = '/logo192.png',
        ?string $tipeLayanan = null,
        ?string $badge = '/logo/favicon.png'
    ) {
        $this->title = $title;
        $this->body = $body;
        $this->url = $url;
        $this->icon = $icon;
        $this->tipeLayanan = $tipeLayanan;
        $this->badge = $badge;
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
     * Get the database representation of the notification.
     */
    public function toDatabase(object $notifiable): array
    {
        return [
            'title' => $this->title,
            'message' => $this->body,
            'url' => $this->url,
            'tipe_layanan' => $this->tipeLayanan,
            'icon' => $this->icon,
        ];
    }

    /**
     * Get the web push representation of the notification.
     */
    public function toWebPush(object $notifiable, $notification): WebPushMessage
    {
        return (new WebPushMessage)
            ->title($this->title)
            ->icon($this->icon)
            ->badge($this->badge ?? $this->icon)
            ->body($this->body)
            ->action('Buka Aplikasi', 'open_app')
            ->data(['url' => $this->url])
            ->options(['TTL' => 86400]);
    }
}
