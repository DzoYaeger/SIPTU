<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\BmnLoan;
use App\Models\Employee;
use App\Models\NotificationSetting;
use App\Services\FonnteService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class CheckOverdueBmnLoans extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'bmn:check-overdue';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check for overdue asset loans and send notifications';

    /**
     * Execute the console command.
     */
    public function handle(FonnteService $fonnteService)
    {
        // Criteria: Status 'dipinjam' AND return_date < yesterday (overdue by at least 1 day)
        // Adjust logic: "lewat 1 hari" implies return_date was yesterday.
        // So return_date < now()->startOfDay().
        $overdueLoans = BmnLoan::where('status', 'dipinjam')
            ->whereDate('return_date', '<', Carbon::now()->subDay())
            ->get();

        if ($overdueLoans->isEmpty()) {
            $this->info('No overdue loans found.');
            return;
        }

        $this->info("Found {$overdueLoans->count()} overdue loans.");
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:3000');
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

        foreach ($overdueLoans as $loan) {
            $this->info("Processing SPA: {$loan->spa_number}");

            // Notify Borrower
            $borrowerPhone = $this->resolveBorrowerPhone($loan);
            
            if ($borrowerPhone) {
                $loanLink = "{$frontendUrl}/peminjaman-aset/track/{$loan->token}";
                $msg = implode("\n", [
                    "⚠️ *PERINGATAN KETERLAMBATAN*",
                    "Halo *{$loan->borrower_name}*,",
                    "Peminjaman aset BMN Anda dengan No. SPA *{$loan->spa_number}* telah melewati batas waktu pengembalian ({$loan->return_date->format('d M Y')}).",
                    "Mohon segera melakukan pengembalian.",
                    "",
                    "🔗 *Ajukan Pengembalian:*",
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

            // Notify Admin
            if (!empty($adminTargets)) {
                $daysOverdue = (int) $loan->return_date->diffInDays(Carbon::now());
                $adminLink = "{$frontendUrl}/app/bmn-peminjaman-aset";
                $msgAdmin = implode("\n", [
                    "⚠️ *ALERT: PEMINJAMAN TERLAMBAT*",
                    "No. SPA: *{$loan->spa_number}*",
                    "Peminjam: {$loan->borrower_name}",
                    "Jatuh Tempo: {$loan->return_date->format('d M Y')}",
                    "Telat: {$daysOverdue} hari",
                    "",
                    "🔗 *Cek Dashboard:*",
                    $adminLink
                ]);
                
                try {
                    $fonnteService->send($setting->fonnte_endpoint, $setting->fonnte_token, $adminTargets, $msgAdmin);
                    $this->info("Sent to admins.");
                    sleep(60); // Anti-spam delay
                } catch (\Exception $e) {
                    $this->error("Failed to send to admins: {$e->getMessage()}");
                }
            }
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
