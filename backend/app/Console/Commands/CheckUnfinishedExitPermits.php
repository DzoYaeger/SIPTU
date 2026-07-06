<?php

namespace App\Console\Commands;

use App\Models\ExitPermit;
use App\Models\NotificationSetting;
use App\Services\FonnteService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CheckUnfinishedExitPermits extends Command
{
    private const REPORT_TIMEZONE = 'Asia/Makassar';

    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'rispeg:check-unfinished-exit-permits';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send daily WhatsApp notifications at 16:00 to employees who forgot to complete their exit permits';

    /**
     * Execute the console command.
     */
    public function handle(FonnteService $fonnteService): int
    {
        $now = Carbon::now(self::REPORT_TIMEZONE);
        $today = $now->toDateString();

        // Get exit permits that are still out (status = out) today
        $permits = ExitPermit::whereDate('date', $today)
            ->where('status', 'out')
            ->get();

        if ($permits->isEmpty()) {
            $this->info("No unfinished exit permits found for {$today}.");
            return self::SUCCESS;
        }

        $setting = NotificationSetting::first();
        $token = $setting->fonnte_token ?? '';
        $endpoint = $setting->fonnte_endpoint ?? 'https://api.fonnte.com/send';

        if (empty($token)) {
            $this->error('Fonnte token is not configured in NotificationSettings.');
            Log::warning('[CheckUnfinishedExitPermits] Fonnte token is not configured.');
            return self::FAILURE;
        }

        $frontendUrl = config('app.frontend_url');
        $successCount = 0;

        foreach ($permits as $permit) {
            // Resolve phone number
            $phone = $permit->employee?->phone_number;
            if (!$phone) {
                $user = \App\Models\User::where('nip', $permit->nip)->first();
                $phone = $user?->phone_number;
            }

            if (!$phone) {
                $this->warn("Phone number not found for NIP {$permit->nip} ({$permit->employee_name}).");
                Log::info("[CheckUnfinishedExitPermits] Phone number not found for {$permit->employee_name}");
                continue;
            }

            // Generate verified hash token
            $expectedToken = sha1($permit->id . $permit->nip . $permit->created_at . 'siptusecret123');
            $resolutionLink = "{$frontendUrl}/public/exit-permit/resolve-unfinished?id={$permit->id}&nip={$permit->nip}&token={$expectedToken}";

            $reason = trim((string) ($permit->reason ?? ''));
            $exitTime = $permit->exit_time ? Carbon::parse($permit->exit_time)->format('H:i') : '-';

            $message = implode("\n", array_filter([
                '🔔 *PEMBERITAHUAN SIPTU: IZIN KELUAR BELUM SELESAI*',
                '━━━━━━━━━━━━━━━━━━━',
                '',
                "Halo *{$permit->employee_name}*,",
                '',
                'Sistem mendeteksi bahwa Anda belum menyelesaikan izin keluar Anda hari ini:',
                "📅 *Tanggal:* " . Carbon::parse($permit->date)->translatedFormat('d F Y'),
                "⏰ *Jam Keluar:* {$exitTime} WITA",
                $reason !== '' ? "📝 *Keperluan:* {$reason}" : null,
                '',
                'Silakan klik tautan di bawah ini untuk memasukkan jam kembali Anda secara mandiri:',
                "🔗 {$resolutionLink}",
                '',
                '_Catatan: Jika Anda tidak mengonfirmasinya, data kehadiran Anda dapat terpengaruh._',
                'Terima kasih.',
            ]));

            $result = $fonnteService->send($endpoint, $token, [$phone], $message);

            if ($result['ok'] ?? false) {
                $successCount++;
            } else {
                Log::error("[CheckUnfinishedExitPermits] Failed sending to {$permit->employee_name} ({$phone})", ['result' => $result]);
            }
        }

        $this->info("Successfully sent {$successCount} WhatsApp notification(s) out of " . count($permits) . " unfinished permit(s).");
        return self::SUCCESS;
    }
}
