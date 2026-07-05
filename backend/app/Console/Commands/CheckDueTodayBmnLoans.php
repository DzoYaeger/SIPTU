<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\BmnLoan;
use App\Models\Employee;
use App\Models\NotificationSetting;
use App\Services\FonnteService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class CheckDueTodayBmnLoans extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'bmn:check-due-today';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check for asset loans due today and send reminder notifications at 16:00';

    /**
     * Execute the console command.
     */
    public function handle(FonnteService $fonnteService)
    {
        // Criteria: Status 'dipinjam' AND return_date == today
        $dueTodayLoans = BmnLoan::where('status', 'dipinjam')
            ->whereDate('return_date', '=', Carbon::today('Asia/Makassar'))
            ->get();

        if ($dueTodayLoans->isEmpty()) {
            $this->info('No loans due today found.');
            return;
        }

        $this->info("Found {$dueTodayLoans->count()} loans due today.");
        $frontendUrl = config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000'));
        $setting = NotificationSetting::first();

        if (!$setting) {
             $this->error('No NotificationSetting found.');
             return;
        }
        
        $recipients = is_array($setting->recipients) ? $setting->recipients : [];
        $adminTargets = $recipients['bmn-peminjaman-aset'] ?? [];
        if (empty($adminTargets)) {
            $adminTargets = $setting->default_admin_numbers ?? [];
        }

        foreach ($dueTodayLoans as $loan) {
            $this->info("Processing SPA (Due Today): {$loan->spa_number}");

            // Notify Borrower
            $borrowerPhone = $this->resolveBorrowerPhone($loan);
            
            if ($borrowerPhone) {
                $loanLink = rtrim($frontendUrl, '/') . "/peminjaman-aset/track/{$loan->token}";
                $msg = implode("\n", [
                    "🔔 *PENGINGAT PENGEMBALIAN ASET BMN*",
                    "Halo *{$loan->borrower_name}*,",
                    "Mengingatkan bahwa peminjaman aset BMN Anda dengan No. SPA *{$loan->spa_number}* jatuh tempo *hari ini* ({$loan->return_date->format('d M Y')}).",
                    "Mohon segera melakukan pengembalian aset dan mengkonfirmasi melalui sistem, atau hubungi Bagian BMN jika ada kendala/perpanjangan.",
                    "",
                    "🔗 *Konfirmasi Pengembalian:*",
                    $loanLink
                ]);
                
                try {
                    $fonnteService->send($setting->fonnte_endpoint, $setting->fonnte_token, [$borrowerPhone], $msg);
                    $this->info("Sent to borrower: {$borrowerPhone}");
                    sleep(60); // Anti-spam delay
                } catch (\Exception $e) {
                    $this->error("Failed to send to borrower: {$e->getMessage()}");
                }
            } else {
                $this->warn("No phone number for borrower of SPA {$loan->spa_number}");
            }

            // Optional: Notify Admin (disabled by default for due today to avoid spam, but could be added here)
        }
    }

    private function resolveBorrowerPhone(BmnLoan $loan): ?string
    {
        $candidates = [];

        if ($loan->borrower_phone) {
            $candidates[] = $loan->borrower_phone;
        }

        if ($loan->borrower_id) {
            $employeeById = Employee::find($loan->borrower_id);
            if ($employeeById?->phone_number) {
                $candidates[] = $employeeById->phone_number;
            }
        }

        if ($loan->borrower_nip) {
            $employeeByNip = Employee::where('nip', $loan->borrower_nip)->first();
            if ($employeeByNip?->phone_number) {
                $candidates[] = $employeeByNip->phone_number;
            }
        }

        foreach ($candidates as $phone) {
            $normalized = $this->normalizePhone($phone);
            if ($normalized) {
                return $normalized;
            }
        }

        return null;
    }

    private function normalizePhone(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $clean = preg_replace('/[^0-9+]/', '', $value);
        if ($clean === '' || $clean === null) {
            return null;
        }

        if (str_starts_with($clean, '0')) {
            $clean = '+62' . substr($clean, 1);
        } elseif (str_starts_with($clean, '62')) {
            $clean = '+' . $clean;
        }

        if (!str_starts_with($clean, '+')) {
            $clean = '+' . $clean;
        }

        return $clean;
    }
}
