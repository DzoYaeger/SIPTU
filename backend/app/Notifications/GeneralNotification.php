<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class GeneralNotification extends Notification
{
    use Queueable;

    protected $title;
    protected $message;
    protected $idLayanan;
    protected $tipeLayanan;

    /**
     * Create a new notification instance.
     */
    public function __construct($title, $message, $idLayanan, $tipeLayanan)
    {
        $this->title = $title;
        $this->message = $message;
        $this->idLayanan = $idLayanan;
        $this->tipeLayanan = $tipeLayanan;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        // Currently sending to database. In Phase 3, we'll add 'fcm' or call it externally.
        return ['database'];
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
        ];
    }
}
