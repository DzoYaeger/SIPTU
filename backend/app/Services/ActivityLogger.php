<?php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Support\Facades\Auth;

class ActivityLogger
{
    /**
     * Log an activity for the currently authenticated user.
     *
     * @param string $action       e.g. 'login', 'create', 'update', 'delete', 'approve'
     * @param string $module       e.g. 'kepegawaian', 'bmn', 'kearsipan', 'it_helpdesk', 'system'
     * @param string|null $description
     * @param string|null $ticketNumber
     * @param mixed $model         The related eloquently model
     */
    public static function log(string $action, string $module, ?string $description = null, ?string $ticketNumber = null, $model = null): void
    {
        $user = Auth::guard('sanctum')->user() ?? Auth::user();

        if (!$user) {
            // Cannot log activity if there's no authenticated user
            return;
        }

        $logData = [
            'user_id' => $user->id,
            'user_name' => collect([$user->employee?->name, $user->name])->filter()->first(),
            'user_nip' => collect([$user->employee?->nip, $user->nip])->filter()->first(),
            'module' => $module,
            'action' => $action,
            'description' => $description,
            'ticket_number' => $ticketNumber,
        ];

        if ($model) {
            $logData['model_type'] = get_class($model);
            $logData['model_id'] = $model->getKey();
        }

        ActivityLog::create($logData);
    }
}
