<?php

namespace App\Services;

use App\Models\User;
use App\Models\Employee;
use App\Notifications\SiptuPushNotification;
use Illuminate\Support\Facades\Log;

class PushNotificationService
{
    /**
     * Send WebPush + Database notification directly to a User instance.
     */
    public static function notifyUser(?User $user, string $title, string $body, string $url = '/app/layanan-mandiri', string $icon = '/logo192.png', ?string $tipeLayanan = null): void
    {
        if (!$user) return;

        try {
            $user->notify(new SiptuPushNotification($title, $body, $url, $icon, $tipeLayanan));
            Log::info("WebPush notification dispatched to user #{$user->id} ({$user->name})", ['title' => $title]);
        } catch (\Throwable $e) {
            Log::error("Failed to dispatch WebPush to user #{$user->id}: " . $e->getMessage());
        }
    }

    /**
     * Send notification to a specific employee (resolves User by employee_id, nip, or username).
     */
    public static function notifyEmployee($employeeOrId, string $title, string $body, string $url = '/app/layanan-mandiri', string $icon = '/logo192.png', ?string $tipeLayanan = null): void
    {
        try {
            $employee = is_object($employeeOrId) ? $employeeOrId : Employee::find($employeeOrId);
            if (!$employee) return;

            $user = null;
            if (!empty($employee->user_id)) {
                $user = User::find($employee->user_id);
            }
            if (!$user && !empty($employee->nip)) {
                $user = User::where('nip', $employee->nip)->orWhere('username', $employee->nip)->first();
            }
            if (!$user && !empty($employee->email)) {
                $user = User::where('email', $employee->email)->first();
            }

            if ($user) {
                self::notifyUser($user, $title, $body, $url, $icon, $tipeLayanan);
            }
        } catch (\Throwable $e) {
            Log::error("Failed to notify employee: " . $e->getMessage());
        }
    }

    /**
     * Send notification to multiple employees by their IDs.
     */
    public static function notifyEmployees(array $employeeIds, string $title, string $body, string $url = '/app/layanan-mandiri', string $icon = '/logo192.png', ?string $tipeLayanan = null): void
    {
        foreach ($employeeIds as $empId) {
            self::notifyEmployee($empId, $title, $body, $url, $icon, $tipeLayanan);
        }
    }

    /**
     * Send notification to all users having any of the given roles.
     */
    public static function notifyRoles(array $roles, string $title, string $body, string $url = '/app/layanan-mandiri', string $icon = '/logo192.png', ?string $tipeLayanan = null): void
    {
        try {
            $users = User::whereIn('role', $roles)->get();
            foreach ($users as $user) {
                self::notifyUser($user, $title, $body, $url, $icon, $tipeLayanan);
            }
        } catch (\Throwable $e) {
            Log::error("Failed to notify roles [" . implode(',', $roles) . "]: " . $e->getMessage());
        }
    }

    /**
     * Send notification to Kepala Balai / Katim.
     */
    public static function notifyKepalaBalai(string $title, string $body, string $url = '/app/kepegawaian-surat-tugas'): void
    {
        try {
            $kepala = User::whereIn('role', ['kepala_balai', 'kepala', 'superadmin'])->get();
            foreach ($kepala as $user) {
                self::notifyUser($user, $title, $body, $url, '/logo192.png', 'surat_tugas');
            }
        } catch (\Throwable $e) {
            Log::error("Failed to notify Kepala Balai: " . $e->getMessage());
        }
    }
}
