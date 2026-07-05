<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushMessage;
use NotificationChannels\WebPush\WebPushChannel;
use App\Models\SuratTugas;

class SuratTugasPushNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public $suratTugas;

    /**
     * Create a new notification instance.
     */
    public function __construct(SuratTugas $suratTugas)
    {
        $this->suratTugas = $suratTugas;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        // Deliver via WebPushChannel for PWA
        return [WebPushChannel::class];
    }

    /**
     * Get the web push representation of the notification.
     */
    public function toWebPush($notifiable, $notification)
    {
        $st = $this->suratTugas;
        
        $lokasi = $st->lokasi_tugas ?? ($st->sarana_nama ?: 'lokasi penugasan');
        
        // Coba parsing tanggal mulai
        $tanggalMulai = '-';
        if ($st->tanggal_mulai) {
            try {
                $tanggalMulai = \Carbon\Carbon::parse($st->tanggal_mulai)->locale('id')->translatedFormat('d M Y');
            } catch (\Exception $e) {
                $tanggalMulai = $st->tanggal_mulai;
            }
        }

        return (new WebPushMessage)
            ->title('Penugasan Baru: ' . ($st->nomor_st ?? 'ST Baru'))
            ->icon('/logo192.png')
            ->body("Anda ditugaskan ke {$lokasi} mulai {$tanggalMulai}. Ketuk untuk melihat detail.")
            ->action('Lihat Surat Tugas', 'view_st')
            ->data(['url' => "/app/kepegawaian-surat-tugas?id={$st->id}"])
            ->options(['TTL' => 86400]); // 1 day TTL
    }
}
