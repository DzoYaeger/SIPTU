<?php

namespace App\Console\Commands;

use App\Models\ExitPermit;
use App\Models\NotificationSetting;
use App\Services\FonnteService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SendDailyExitPermitSummary extends Command
{
    private const MODULE_KEY = 'rispeg-izin-keluar';
    private const MODULE_KEY_ALT = 'rispeg_izin_keluar';
    private const REPORT_TIMEZONE = 'Asia/Makassar';

    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'rispeg:send-daily-exit-permit-summary';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send daily 16:00 summary of exit permits to configured admin WhatsApp numbers';

    /**
     * Execute the console command.
     */
    public function handle(FonnteService $fonnteService): int
    {
        $now = Carbon::now(self::REPORT_TIMEZONE);
        $today = $now->toDateString();

        $permits = ExitPermit::query()
            ->whereDate('date', $today)
            ->orderBy('exit_time')
            ->orderBy('employee_name')
            ->get([
                'id',
                'employee_name',
                'nip',
                'exit_time',
                'return_time',
                'reason',
            ]);

        if ($permits->isEmpty()) {
            $this->info("No exit permit data found for {$today}.");
            return self::SUCCESS;
        }

        $setting = NotificationSetting::query()->first();
        if (!$setting) {
            $this->warn('NotificationSetting not found.');
            return self::SUCCESS;
        }

        $targets = $this->resolveTargets($setting);
        if (empty($targets)) {
            $this->warn('No notification targets configured for daily exit permit summary.');
            return self::SUCCESS;
        }

        $message = $this->buildMessage($permits->all(), $now);

        $result = $fonnteService->send(
            $setting->fonnte_endpoint ?? 'https://api.fonnte.com/send',
            $setting->fonnte_token ?? '',
            $targets,
            $message
        );

        if (!($result['ok'] ?? false)) {
            Log::warning('Daily exit permit summary failed to send.', [
                'date' => $today,
                'targets' => $targets,
                'result' => $result,
            ]);

            $this->error('Failed to send daily exit permit summary.');
            return self::FAILURE;
        }

        $this->info('Daily exit permit summary sent successfully.');

        return self::SUCCESS;
    }

    private function resolveTargets(NotificationSetting $setting): array
    {
        $recipients = is_array($setting->recipients) ? $setting->recipients : [];
        $targets = $recipients[self::MODULE_KEY]
            ?? $recipients[self::MODULE_KEY_ALT]
            ?? $setting->default_admin_numbers
            ?? [];

        $normalized = [];
        foreach ((array) $targets as $target) {
            if (!is_string($target)) {
                continue;
            }

            $clean = preg_replace('/[^0-9+]/', '', $target);
            if ($clean === '' || $clean === null) {
                continue;
            }

            if (str_starts_with($clean, '0')) {
                $clean = '+62' . substr($clean, 1);
            } elseif (str_starts_with($clean, '62')) {
                $clean = '+' . $clean;
            }

            if (!str_starts_with($clean, '+')) {
                $clean = '+' . $clean;
            }

            $normalized[] = $clean;
        }

        return array_values(array_unique($normalized));
    }

    private function buildMessage(array $permits, Carbon $now): string
    {
        $lines = [
            '[SIPTU] Rangkuman Izin Keluar Harian',
            'Tanggal: ' . $now->translatedFormat('d F Y'),
            'Total Data: ' . count($permits),
            '',
        ];

        foreach ($permits as $index => $permit) {
            $number = $index + 1;
            $reason = trim((string) ($permit->reason ?? ''));

            $lines[] = $number . '. Nama: ' . ($permit->employee_name ?: '-');
            $lines[] = '   NIP: ' . ($permit->nip ?: '-');
            $lines[] = '   Jam Keluar: ' . $this->formatTime($permit->exit_time);
            $lines[] = '   Jam Kembali: ' . $this->formatTime($permit->return_time);
            $lines[] = '   Keterangan: ' . ($reason !== '' ? $reason : '-');
            $lines[] = '';
        }

        $lines[] = 'Dikirim: ' . $now->translatedFormat('d F Y H:i') . ' WITA';

        return implode("\n", $lines);
    }

    private function formatTime(?string $time): string
    {
        if (!$time) {
            return '-';
        }

        $parts = explode(':', $time);
        if (count($parts) < 2) {
            return $time;
        }

        return $parts[0] . ':' . $parts[1];
    }
}
