<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ItHelpdeskTicket;
use App\Models\Employee;
use App\Models\NotificationSetting;
use App\Services\FonnteService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class AutoResolveItHelpdeskTickets extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'it-helpdesk:auto-resolve';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Auto-resolve IT Helpdesk tickets waiting for user approval > 24 hours';

    /**
     * Execute the console command.
     */
    public function handle(FonnteService $fonnteService)
    {
        // Criteria: Status 'waiting_user_approval' AND updated_at < 24 hours ago
        $overdueTickets = ItHelpdeskTicket::where('status', 'waiting_user_approval')
            ->where('updated_at', '<=', Carbon::now('Asia/Makassar')->subHours(24))
            ->get();

        if ($overdueTickets->isEmpty()) {
            $this->info('No overdue tickets found for auto-resolve.');
            return;
        }

        $this->info("Found {$overdueTickets->count()} tickets to auto-resolve.");
        $setting = NotificationSetting::first();

        if (!$setting) {
             $this->error('No NotificationSetting found.');
             return;
        }

        foreach ($overdueTickets as $ticket) {
            $this->info("Auto-resolving Ticket: {$ticket->ticket_number}");

            // Update status to completed
            $ticket->update([
                'status' => 'completed',
                'is_auto_resolved' => true,
            ]);

            \App\Services\ActivityLogger::log(
                'auto_complete', 
                'it_helpdesk', 
                "Menyelesaikan otomatis tiket IT Helpdesk ({$ticket->ticket_number})", 
                $ticket->ticket_number, 
                $ticket
            );

            // Notify User
            $borrowerPhone = $this->resolveBorrowerPhone($ticket);
            
            if ($borrowerPhone) {
                $msg = implode("\n", [
                    "🔔 *INFO TIKET IT HELPDESK SIPTU*",
                    "Halo *{$ticket->employee_name}*,",
                    "Laporan IT Anda dengan No. Tiket *{$ticket->ticket_number}* telah dilakukan perubahan status secara otomatis menjadi *SELESAI*.",
                    "Hal ini dikarenakan konfirmasi pelaporan belum dilakukan dalam waktu 1x24 jam sejak pekerjaan dinyatakan selesai oleh petugas.",
                    "",
                    "Terima kasih telah menggunakan layanan IT Helpdesk."
                ]);
                
                try {
                    $response = $fonnteService->send($setting->fonnte_endpoint, $setting->fonnte_token, [$borrowerPhone], $msg);
                    $this->info("Sent to reporter: {$borrowerPhone}. Response: " . json_encode($response));
                    sleep(60); // Anti-spam delay
                } catch (\Exception $e) {
                    $this->error("Failed to send to reporter: {$e->getMessage()}");
                }
            } else {
                $this->warn("No phone number for reporter of Ticket {$ticket->ticket_number}");
            }
        }
    }

    private function resolveBorrowerPhone(ItHelpdeskTicket $ticket): ?string
    {
        $candidates = [];

        if ($ticket->employee_id) {
            $employeeById = Employee::find($ticket->employee_id);
            if ($employeeById?->phone_number) {
                $candidates[] = $employeeById->phone_number;
            }
        }

        if ($ticket->employee_nip) {
            $employeeByNip = Employee::where('nip', $ticket->employee_nip)->first();
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
