<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\AssetController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\LoanController;
use App\Http\Controllers\Api\RequestController;
use App\Http\Controllers\Api\ItHelpdeskTicketController;
use App\Http\Controllers\Api\KgbController;
use App\Http\Controllers\Api\AdminArchiveUnitController;
use App\Http\Controllers\Api\ArchiveUnitController;
use App\Http\Controllers\Api\AdminNotificationSettingsController;
use App\Http\Controllers\Api\ArchiveLoanController;
use App\Http\Controllers\Api\GeminiChatController;
use App\Http\Controllers\Api\PushNotificationController;
use App\Http\Controllers\Api\BmnLoanController;
use App\Http\Controllers\Api\ExitPermitController;
use App\Http\Controllers\Api\ServiceHistoryController;
use App\Http\Controllers\Api\AdminCommandCenterController;
use App\Http\Controllers\Api\ValidatorUsageReportController;
use App\Http\Controllers\Api\InventoryRequestController;
use App\Http\Controllers\Api\InventoryStockCardController;
use App\Http\Controllers\Api\LetterController;
use App\Http\Controllers\Api\VitalArchiveController;
use App\Http\Controllers\Api\BmnMaintenanceReportController;
use App\Http\Controllers\Api\PdttItemController;
use App\Http\Controllers\Api\ProcurementProposalController;
use App\Http\Controllers\Api\AgendaController;
use App\Http\Controllers\Api\EmployeeCalendarController;
use App\Http\Controllers\Api\SuratTugasController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\LpjController;
use App\Http\Controllers\Api\PanjarRequestController;
use App\Http\Controllers\Api\PejabatPerbendaharaanController;
use App\Http\Controllers\Api\ZoomController;
use App\Http\Controllers\Api\QueueDisplayController;
use App\Http\Controllers\Api\VisitorQueueController;
use App\Http\Controllers\Api\NewsPostController;
use App\Http\Controllers\Api\BudgetController;
use App\Http\Controllers\Api\RevisionTicketController;
use App\Http\Controllers\Api\MfaController;
use App\Http\Controllers\Api\EInvitationController;
use App\Http\Controllers\Api\RhpkController;
use App\Http\Controllers\Api\RhpkOutputController;
use App\Http\Controllers\Api\RhpkExplanationController;
/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| SECURITY NOTES:
| - APP_DEBUG must be set to false in production .env
| - Set CORS_ORIGINS in .env for production domains
| - Rate limiters: "login" = 5/min, "public-api" = 30/min
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user()->load('employee');
});

Route::get('/clear-cache-siptu', function() {
    try {
        \Illuminate\Support\Facades\Artisan::call('config:clear');
        \Illuminate\Support\Facades\Artisan::call('cache:clear');
        \Illuminate\Support\Facades\Artisan::call('view:clear');
        \Illuminate\Support\Facades\Artisan::call('route:clear');
        
        // Reset OPcache to flush cached PHP bytecode
        if (function_exists('opcache_reset')) {
            opcache_reset();
        }
        // Also invalidate the specific controller file
        $controllerPath = app_path('Http/Controllers/Api/NextcloudStorageController.php');
        if (function_exists('opcache_invalidate') && file_exists($controllerPath)) {
            opcache_invalidate($controllerPath, true);
        }
        
        return "Cache cleared successfully! OPcache reset: " . (function_exists('opcache_reset') ? 'YES' : 'NO');
    } catch (\Exception $e) {
        return "Error clearing cache: " . $e->getMessage();
    }
});

Route::get('/view-log-siptu', function() {
    try {
        $logPath = storage_path('logs/laravel.log');
        if (!file_exists($logPath)) {
            return "Log file does not exist.";
        }
        $lines = file($logPath);
        $lastLines = array_slice($lines, -100);
        return response(implode("", $lastLines), 200, ['Content-Type' => 'text/plain']);
    } catch (\Exception $e) {
        return "Error reading log: " . $e->getMessage();
    }
});


// ─── Authentication (rate-limited) ──────────────────────────────────
Route::middleware('throttle:login')->group(function () {
    Route::post('/login', [UserController::class, 'login'])->name('login');
    Route::post('/mfa/verify', [MfaController::class, 'verify']);
});

Route::post('/forgot-password', [UserController::class, 'requestPasswordReset']);
Route::post('/reset-password', [UserController::class, 'resetPassword']);

// ─── Public endpoints (rate-limited) ────────────────────────────────
Route::middleware('throttle:public-api')->group(function () {
    // Archive Loans (public)
    Route::post('/public/archive-loans', [ArchiveLoanController::class, 'storePublic']);
    Route::get('/public/archive-loans/{token}', [ArchiveLoanController::class, 'showPublic']);
    Route::get('/public/archive-loans/{token}/pdf', [ArchiveLoanController::class, 'downloadPdfPublic']);
    Route::post('/public/archive-loans/{token}/return-request', [ArchiveLoanController::class, 'requestReturnPublic']);

    // BMN Loans (public)
    Route::get('/public/bmn-assets', [BmnLoanController::class, 'listAssetsPublic']);
    Route::get('/public/bmn-employees', [BmnLoanController::class, 'listEmployeesPublic']);
    Route::get('/public/bmn-loans/schedule', [BmnLoanController::class, 'schedulePublic']);
    Route::get('/public/bmn-loans/my-loans', [BmnLoanController::class, 'myLoans']);
    Route::post('/public/bmn-loans', [BmnLoanController::class, 'storePublic']);
    Route::get('/public/bmn-loans/{token}', [BmnLoanController::class, 'showPublic']);
    Route::get('/public/bmn-loans/{token}/pdf', [BmnLoanController::class, 'downloadLoanPdf']);
    Route::post('/public/bmn-loans/{token}/return', [BmnLoanController::class, 'returnRequestPublic']);

    // Room Booking (Peminjaman Ruangan) — public
    Route::get('/public/room-loans/rooms', [BmnLoanController::class, 'listRoomsPublic']);
    Route::get('/public/room-loans/schedule', [BmnLoanController::class, 'roomSchedulePublic']);
    Route::post('/public/room-loans', [BmnLoanController::class, 'storeRoomLoanPublic']);

    // Public Calendar Agendas
    Route::get('/public/agendas', [AgendaController::class, 'publicCalendar']);

    // Public E-Invitations
    Route::get('/public/e-invitations/{slug}', [EInvitationController::class, 'getPublicInvitation']);
    Route::post('/public/e-invitations/{slug}/rsvp', [EInvitationController::class, 'submitPublicRsvp']);

    // IT Helpdesk (public)
    Route::post('/public/it-helpdesk-tickets/{id}/confirm', [ItHelpdeskTicketController::class, 'confirm']);
    Route::get('/public/it-helpdesk-tickets/{id}/details', [ItHelpdeskTicketController::class, 'showPublic']);
    Route::post('/public/it-helpdesk-tickets', [ItHelpdeskTicketController::class, 'storePublic']);
    Route::get('/public/it-helpdesk-tickets/{id}/pdf', [ItHelpdeskTicketController::class, 'downloadTicketPdf']);

    // Inventory Requests — SPB (public)
    Route::post('/public/inventory-requests', [InventoryRequestController::class, 'storePublic']);

    // Public Procurement PBJ listing
    Route::get('/procurement-pbjs', [\App\Http\Controllers\Api\ProcurementPbjController::class, 'index']);
    Route::get('/procurement-pbjs/{id}/file/{fileType}', [\App\Http\Controllers\Api\ProcurementPbjController::class, 'viewFile']);
    Route::get('/public/procurement-pbjs/{id}/file/{fileType}', [\App\Http\Controllers\Api\ProcurementPbjController::class, 'viewFile']);
    Route::get('/public/kanban-tasks/subtasks/{subtaskId}/file', [\App\Http\Controllers\Api\KanbanTaskController::class, 'streamSubtaskFile']);
    Route::get('/public/kanban-tasks/reports/{reportId}/file', [\App\Http\Controllers\Api\KanbanTaskController::class, 'streamReportFile']);
    Route::get('/public/inventory-requests/{token}', [InventoryRequestController::class, 'showPublic']);
    Route::put('/public/inventory-requests/{token}/approve', [InventoryRequestController::class, 'approvePublic']);
    Route::put('/public/inventory-requests/{token}/reject', [InventoryRequestController::class, 'rejectPublic']);

    // Panjar Requests Validation (public via token from WhatsApp)
    Route::get('/public/panjar/{token}', [PanjarRequestController::class, 'showPublic']);
    Route::post('/public/panjar/{token}/validate-ppk', [PanjarRequestController::class, 'validatePpkPublic']);
    Route::post('/public/panjar/{token}/validate-bendahara', [PanjarRequestController::class, 'validateBendaharaPublic']);

    // Letters file proxy (works even if /public/storage symlink is unavailable)
    Route::get('/public/letters/files/{id}/{kind}', [LetterController::class, 'serveFile'])
        ->whereNumber('id')
        ->whereIn('kind', ['surat', 'bukti']);

    // Public inventory listing — limited fields only (id, name, unit, quantity)
    Route::get('/public/inventories', [InventoryController::class, 'publicIndex']);

    // Public Invoice PDF download
    Route::get('/public/invoices/{id}/export-pdf', [\App\Http\Controllers\Api\InvoiceController::class, 'exportPdf'])->whereNumber('id');
    Route::get('/public/invoices/{id}/export-pdf-f4', [\App\Http\Controllers\Api\InvoiceController::class, 'exportPdf'])->whereNumber('id');

    // Surat Tugas (public)
    Route::post('/public/surat-tugas', [SuratTugasController::class, 'storePublic']);
    Route::get('/public/siamparan/sarana', [SuratTugasController::class, 'siamparanSarana']);
    Route::get('/public/surat-tugas/{id}/protokol-kerja', [SuratTugasController::class, 'downloadProtokolKerja'])->whereNumber('id');
    Route::post('/public/surat-tugas/{id}/sign-protokol', [SuratTugasController::class, 'publicSignProtokolKerja'])->whereNumber('id');
    Route::post('/public/surat-tugas/{id}/sign-protokol-kepala', [SuratTugasController::class, 'publicSignProtokolKepala'])->whereNumber('id');
    Route::get('/public/verify-document/{token}', [SuratTugasController::class, 'verifyDocument']);
    Route::get('/public/surat-tugas/mak-suggestions', [SuratTugasController::class, 'getMakSuggestions']);

    // Public Visitor Queue Registration
    Route::post('/public/visitor-queues', [VisitorQueueController::class, 'storePublic']);

    // Exit Permit (public via NIP, no auth)
    Route::post('/public/exit-permits/lookup', [ExitPermitController::class, 'publicLookupByNip']);
    Route::post('/public/exit-permits/exit', [ExitPermitController::class, 'publicRecordExitByNip']);
    Route::post('/public/exit-permits/geofence-ping', [ExitPermitController::class, 'publicGeofencePing']);
    Route::get('/public/exit-permits/{id}/details', [ExitPermitController::class, 'showPublic'])->whereNumber('id');
    Route::put('/public/exit-permits/{id}/return', [ExitPermitController::class, 'publicRecordReturnByNip'])->whereNumber('id');
    Route::post('/public/exit-permits/{id}/resolve-unfinished', [ExitPermitController::class, 'publicResolveUnfinished'])->whereNumber('id');
    Route::get('/public/exit-permits/group/{group_id}', [ExitPermitController::class, 'publicGroupMembers']);

    // Public Employee Search
    Route::get('/public/employees/search', [\App\Http\Controllers\Api\EmployeeController::class, 'publicSearch']);

    // Employee template download (public, no auth needed)
    Route::get('/employees/template', [EmployeeController::class, 'template']);

    // BMN asset template download (public, no auth needed)
    Route::get('/bmn/assets/template', [AssetController::class, 'template']);

    // Public Hero slider / Popup config
    Route::get('/hero-slider', [AdminNotificationSettingsController::class, 'heroSlider']);

    // Public Share Links (Nextcloud)
    Route::get('/share/info/{token}', [\App\Http\Controllers\Api\NextcloudStorageController::class, 'shareInfo']);
    Route::get('/share/download/{token}/{filename?}', [\App\Http\Controllers\Api\NextcloudStorageController::class, 'shareDownload']);
    Route::post('/share/folder/{token}', [\App\Http\Controllers\Api\NextcloudStorageController::class, 'shareCreateFolder']);
    Route::post('/share/upload/{token}', [\App\Http\Controllers\Api\NextcloudStorageController::class, 'shareUpload']);
    Route::delete('/share/delete/{token}', [\App\Http\Controllers\Api\NextcloudStorageController::class, 'shareDelete']);
    Route::post('/share/move/{token}', [\App\Http\Controllers\Api\NextcloudStorageController::class, 'shareMove']);
    Route::post('/share/copy/{token}', [\App\Http\Controllers\Api\NextcloudStorageController::class, 'shareCopy']);

    // Office Online preview: cache file as static for Microsoft Office Online viewer
    Route::post('/share/office-preview', [\App\Http\Controllers\Api\NextcloudStorageController::class, 'officePreview']);

});

// ─── Queue Display polling (generous rate limit for TV) ─────────────
Route::middleware('throttle:queue-polling')->group(function () {
    Route::get('/public/queue-display', [QueueDisplayController::class, 'publicShow']);
});

// ─── Protected routes (auth:sanctum) ────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {
    // Dashboard stats (requires login)
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    Route::get('/dashboard/activities', [DashboardController::class, 'recentActivities']);
    Route::get('/dashboard/my-active-requests', [DashboardController::class, 'myActiveRequests']);
    Route::get('/sidebar/badge-counts', [DashboardController::class, 'badgeCounts']);
    Route::get('/news', [NewsPostController::class, 'publicIndex']);
    Route::get('/news/{slug}', [NewsPostController::class, 'publicShow']);

    // User routes
    Route::post('/logout', [UserController::class, 'logout']);
    Route::put('/user/profile', [UserController::class, 'updateProfile']);
    Route::put('/user/password', [UserController::class, 'changePassword']);
    Route::post('/user/profile/photo', [UserController::class, 'uploadPhoto']);

    // MFA routes
    Route::get('/mfa/setup', [MfaController::class, 'setup']);
    Route::post('/mfa/confirm', [MfaController::class, 'confirm']);
    Route::get('/mfa/session-status', [MfaController::class, 'sessionStatus']);
    Route::delete('/mfa/disable/{userId}', [MfaController::class, 'adminDisable']);

    // Nextcloud Storage routes
    Route::get('/nextcloud/files', [\App\Http\Controllers\Api\NextcloudStorageController::class, 'index']);
    Route::post('/nextcloud/upload', [\App\Http\Controllers\Api\NextcloudStorageController::class, 'upload']);
    Route::post('/nextcloud/folder', [\App\Http\Controllers\Api\NextcloudStorageController::class, 'createFolder']);
    Route::get('/nextcloud/download', [\App\Http\Controllers\Api\NextcloudStorageController::class, 'download']);
    Route::delete('/nextcloud/delete', [\App\Http\Controllers\Api\NextcloudStorageController::class, 'destroy']);
    Route::get('/nextcloud/share-token', [\App\Http\Controllers\Api\NextcloudStorageController::class, 'getShareToken']);
    Route::post('/nextcloud/save', [\App\Http\Controllers\Api\NextcloudStorageController::class, 'saveFile']);
    Route::get('/nextcloud/share-settings', [\App\Http\Controllers\Api\NextcloudStorageController::class, 'getShareSettings']);
    Route::post('/nextcloud/share-settings', [\App\Http\Controllers\Api\NextcloudStorageController::class, 'updateShareSettings']);
    Route::delete('/nextcloud/share-settings', [\App\Http\Controllers\Api\NextcloudStorageController::class, 'deleteShareSettings']);
    Route::post('/nextcloud/move', [\App\Http\Controllers\Api\NextcloudStorageController::class, 'move']);
    Route::post('/nextcloud/copy', [\App\Http\Controllers\Api\NextcloudStorageController::class, 'copy']);
    Route::get('/nextcloud/search', [\App\Http\Controllers\Api\NextcloudStorageController::class, 'search']);

    // Employee Training / Diseminasi routes
    Route::get('/employee-trainings', [\App\Http\Controllers\Api\EmployeeTrainingController::class, 'index']);
    Route::get('/employee-trainings/stats', [\App\Http\Controllers\Api\EmployeeTrainingController::class, 'stats']);
    Route::post('/employee-trainings/sync', [\App\Http\Controllers\Api\EmployeeTrainingController::class, 'sync']);

    // Push Notifications
    Route::post('/push-subscribe', [PushNotificationController::class, 'subscribe']);
    Route::post('/push-unsubscribe', [PushNotificationController::class, 'unsubscribe']);
    Route::post('/push-test', [PushNotificationController::class, 'testNotification']);

    // AI Assistant (Moved inside auth for session access)
    Route::post('/ai/chat', [\App\Http\Controllers\Api\AIAssistantController::class, 'chat']);

    // ─── Admin-only routes ──────────────────────────────────────────
    Route::middleware('admin')->group(function () {
        Route::apiResource('users', UserController::class);
        Route::apiResource('admin/users', \App\Http\Controllers\Api\AdminUserController::class)
            ->names([
                'index' => 'admin.users.index',
                'store' => 'admin.users.store',
                'show' => 'admin.users.show',
                'update' => 'admin.users.update',
                'destroy' => 'admin.users.destroy',
            ]);
        Route::get('/admin/modules', [\App\Http\Controllers\Api\AdminModuleController::class, 'index']);
        Route::get('/admin/command-center', [AdminCommandCenterController::class, 'index']);
        Route::get('/admin/ai-audit', [AdminCommandCenterController::class, 'aiAudit']);
        Route::get('/admin/export-report', [AdminCommandCenterController::class, 'exportReport']);
        Route::get('/admin/notification-settings', [AdminNotificationSettingsController::class, 'index']);
        Route::put('/admin/notification-settings', [AdminNotificationSettingsController::class, 'update']);
        Route::get('/admin/news-posts', [NewsPostController::class, 'index']);
        Route::post('/admin/news-posts', [NewsPostController::class, 'store']);
        Route::put('/admin/news-posts/{id}', [NewsPostController::class, 'update'])->whereNumber('id');
        Route::delete('/admin/news-posts/{id}', [NewsPostController::class, 'destroy'])->whereNumber('id');
        Route::put('/admin/exit-permits/{id}/manual-return', [ExitPermitController::class, 'adminRecordReturn'])->whereNumber('id');
        Route::get('/admin/archive-units', [AdminArchiveUnitController::class, 'index']);
        Route::put('/admin/archive-units/keasipan', [AdminArchiveUnitController::class, 'updateKearsipan']);
        Route::put('/admin/archive-units/kearsipan', [AdminArchiveUnitController::class, 'updateKearsipan']);
        Route::put('/admin/archive-units/{id}', [AdminArchiveUnitController::class, 'update']);
    });

    // Validator usage report and dashboard
    Route::get('/validator/usage-report', [ValidatorUsageReportController::class, 'index']);
    Route::get('/validator/dashboard', [\App\Http\Controllers\Api\ValidatorDashboardController::class, 'getDashboardData']);

    // Hero slider settings (for Layanan Mandiri)
    Route::get('/hero-slider', [AdminNotificationSettingsController::class, 'heroSlider']);
    Route::get('/hero-slider/config', [AdminNotificationSettingsController::class, 'heroSliderConfig']);
    Route::put('/hero-slider', [AdminNotificationSettingsController::class, 'updateHeroSlider']);
    Route::post('/hero-slider/upload', [AdminNotificationSettingsController::class, 'uploadHeroSliderImage']);

    // Layanan Mandiri Category & Filter Management
    Route::get('/layanan-filter-config', [AdminNotificationSettingsController::class, 'getLayananFilterConfig']);
    Route::put('/layanan-filter-config', [AdminNotificationSettingsController::class, 'updateLayananFilterConfig']);

    // Archive Units (for loans)
    Route::get('/archive-units', [ArchiveUnitController::class, 'index']);

    // Archive Loans
    Route::get('/archive-loans', [ArchiveLoanController::class, 'index']);
    Route::get('/archive-loans/borrowers', [ArchiveLoanController::class, 'borrowers']);
    Route::get('/archive-loans/report', [ArchiveLoanController::class, 'report']);
    Route::get('/archive-loans/report/pdf', [ArchiveLoanController::class, 'reportPdf']);
    Route::get('/archive-loans/report/excel', [ArchiveLoanController::class, 'reportExcel']);
    Route::post('/archive-loans', [ArchiveLoanController::class, 'store']);
    Route::put('/archive-loans/{id}/approve', [ArchiveLoanController::class, 'approve']);
    Route::put('/archive-loans/{id}/return', [ArchiveLoanController::class, 'approveReturn']);
    Route::delete('/archive-loans/{id}', [ArchiveLoanController::class, 'destroy']);

    // Employee routes
    Route::post('/employees/import', [EmployeeController::class, 'import']);
    
    // Calendar Agendas
    Route::apiResource('agendas', AgendaController::class);
    
    // Employee Calendar (combines agendas + surat tugas)
    Route::get('/employee-calendar', [AgendaController::class, 'employeeCalendar']);
    Route::get('/kepegawaian-kalender', [AgendaController::class, 'employeeCalendar']); // Alias for web compatibility

    Route::apiResource('employees', EmployeeController::class);
    Route::put('/employees/{id}/phone', [EmployeeController::class, 'updatePhone']);
    Route::post('/employees/{id}/photo', [EmployeeController::class, 'uploadPhoto']);

    // KGB routes
    Route::apiResource('employees.kgb', KgbController::class);

    // RISPEG routes
    Route::get('/rispeg/daily', [App\Http\Controllers\Api\EmployeeDailyControlController::class, 'index']);
    Route::post('/rispeg/daily', [App\Http\Controllers\Api\EmployeeDailyControlController::class, 'store']);
    Route::post('/rispeg/daily/bulk', [App\Http\Controllers\Api\EmployeeDailyControlController::class, 'bulkStore']);
    Route::get('/rispeg/dashboard-stats', [App\Http\Controllers\Api\EmployeeDailyControlController::class, 'dashboard']);
    Route::get('/rispeg/export-pdf', [App\Http\Controllers\Api\EmployeeDailyControlController::class, 'exportPdf']);
    Route::get('/rispeg/default-month', [App\Http\Controllers\Api\EmployeeDailyControlController::class, 'getDefaultMonth']);
    Route::post('/rispeg/default-month', [App\Http\Controllers\Api\EmployeeDailyControlController::class, 'setDefaultMonth']);

    // Exit Permit routes (Monitoring Izin Keluar)
    Route::get('/exit-permits/my-active', [ExitPermitController::class, 'myActive']);
    Route::post('/exit-permits/exit', [ExitPermitController::class, 'recordExit']);
    Route::put('/exit-permits/{id}/return', [ExitPermitController::class, 'recordReturn']);
    Route::get('/exit-permits', [ExitPermitController::class, 'index']);
    Route::post('/exit-permits/geofence-ping', [ExitPermitController::class, 'geofencePing']);
    Route::get('/exit-permits/{id}', [ExitPermitController::class, 'show'])->whereNumber('id');
    Route::get('/exit-permits/stats', [ExitPermitController::class, 'stats']);
    Route::get('/exit-permits/analytics', [ExitPermitController::class, 'analytics']);
    Route::get('/exit-permits/word-parameters', [ExitPermitController::class, 'wordTemplateParameters']);
    Route::get('/exit-permits/{id}/generate-word', [ExitPermitController::class, 'generateWord'])->whereNumber('id');
    Route::get('/my-service-history', [ServiceHistoryController::class, 'index']);
    Route::get('/my-service-history/{serviceType}/{historyId}', [ServiceHistoryController::class, 'show'])
        ->where('historyId', '.*');
    Route::put('/exit-permits/{id}/nomor-surat', [ExitPermitController::class, 'updateNomorSurat'])->whereNumber('id');
    Route::put('/exit-permits/{id}/permit-type', [ExitPermitController::class, 'updatePermitType'])->whereNumber('id');
    Route::put('/exit-permits/{id}/update-times', [ExitPermitController::class, 'updateTimes'])->whereNumber('id');
    Route::get('/admin/exit-permit-settings', [ExitPermitController::class, 'getSettings']);
    Route::put('/admin/exit-permit-settings', [ExitPermitController::class, 'updateSettings']);
    Route::delete('/exit-permits/{id}', [ExitPermitController::class, 'destroy']);

    // Asset routes
    Route::apiResource('assets', AssetController::class);
    Route::post('/bmn/assets/import', [AssetController::class, 'import']);

    // BMN Loans - Route spesifik harus sebelum route dengan parameter {id}
    Route::get('/bmn-loans', [BmnLoanController::class, 'index']);
    Route::get('/bmn-loans/schedule', [BmnLoanController::class, 'schedulePublic']);
    Route::get('/bmn-loans/my-loans', [BmnLoanController::class, 'myLoans']);
    Route::post('/bmn-loans', [BmnLoanController::class, 'store']);
    Route::get('/bmn-loans/{id}', [BmnLoanController::class, 'show']);
    Route::post('/bmn-loans/{id}/resend-notifications', [BmnLoanController::class, 'resendNotifications']);
    Route::put('/bmn-loans/{id}/approve', [BmnLoanController::class, 'approve']);
    Route::put('/bmn-loans/{id}/return', [BmnLoanController::class, 'return']);
    Route::delete('/bmn-loans/{id}', [BmnLoanController::class, 'destroy']);
    
    // BMN Aliases & Export Routes
    Route::get('/bmn/loans', [BmnLoanController::class, 'index']); // Alias for report
    Route::get('/bmn/assets/{id}/loans', [BmnLoanController::class, 'getLoansByAsset']);
    Route::get('/employees/{id}/bmn-loans', [BmnLoanController::class, 'getLoansByEmployee']);
    Route::get('/bmn/assets/{id}/loans/pdf', [BmnLoanController::class, 'exportLoansByAssetPdf']);
    Route::get('/bmn/assets/{id}/loans/excel', [BmnLoanController::class, 'exportLoansByAssetExcel']);
    Route::get('/bmn/loans/pdf', [BmnLoanController::class, 'exportLoansByDatePdf']);
    Route::get('/bmn/loans/excel', [BmnLoanController::class, 'exportLoansByDateExcel']);
    Route::get('/employees/{id}/bmn-loans/pdf', [BmnLoanController::class, 'exportLoansByEmployeePdf']);
    Route::get('/employees/{id}/bmn-loans/excel', [BmnLoanController::class, 'exportLoansByEmployeeExcel']);

    // BMN Maintenance / Complaint
    Route::get('/bmn-maintenance-reports/export-pdf', [BmnMaintenanceReportController::class, 'exportPdf']);
    Route::get('/bmn-maintenance-reports', [BmnMaintenanceReportController::class, 'index']);
    Route::post('/bmn-maintenance-reports', [BmnMaintenanceReportController::class, 'store']);
    Route::put('/bmn-maintenance-reports/{id}', [BmnMaintenanceReportController::class, 'update']);
    Route::put('/bmn-maintenance-reports/{id}/approve', [BmnMaintenanceReportController::class, 'approve']);
    Route::put('/bmn-maintenance-reports/{id}/reject', [BmnMaintenanceReportController::class, 'reject']);
    Route::put('/bmn-maintenance-reports/{id}/complete', [BmnMaintenanceReportController::class, 'complete']);
    Route::delete('/bmn-maintenance-reports/{id}', [BmnMaintenanceReportController::class, 'destroy']);

    // ─── Pemeriksaan Kesehatan (Medical Check-Up / MCU) ──────────────
    Route::get('/medical-checkup/packages', [\App\Http\Controllers\Api\MedicalCheckupController::class, 'packages']);
    Route::get('/medical-checkup/my-balance', [\App\Http\Controllers\Api\MedicalCheckupController::class, 'myBalance']);
    Route::get('/medical-checkup/my-requests', [\App\Http\Controllers\Api\MedicalCheckupController::class, 'myRequests']);
    Route::post('/medical-checkup/requests', [\App\Http\Controllers\Api\MedicalCheckupController::class, 'store']);
    Route::put('/medical-checkup/requests/{id}', [\App\Http\Controllers\Api\MedicalCheckupController::class, 'updateMyRequest']);
    Route::delete('/medical-checkup/requests/{id}/cancel', [\App\Http\Controllers\Api\MedicalCheckupController::class, 'cancelMyRequest']);

    // Admin Medical Check-Up routes
    Route::get('/medical-checkup/admin/requests', [\App\Http\Controllers\Api\MedicalCheckupController::class, 'adminRequests']);
    Route::put('/medical-checkup/admin/requests/{id}/status', [\App\Http\Controllers\Api\MedicalCheckupController::class, 'updateStatus']);
    Route::delete('/medical-checkup/admin/requests/{id}', [\App\Http\Controllers\Api\MedicalCheckupController::class, 'destroy']);
    Route::get('/medical-checkup/admin/balances', [\App\Http\Controllers\Api\MedicalCheckupController::class, 'adminBalances']);
    Route::get('/medical-checkup/admin/employees-options', [\App\Http\Controllers\Api\MedicalCheckupController::class, 'getEmployeeOptions']);
    Route::post('/medical-checkup/admin/balances', [\App\Http\Controllers\Api\MedicalCheckupController::class, 'setBalance']);
    Route::delete('/medical-checkup/admin/balances/clear-all', [\App\Http\Controllers\Api\MedicalCheckupController::class, 'adminClearBalances']);
    Route::delete('/medical-checkup/admin/balances/{id}', [\App\Http\Controllers\Api\MedicalCheckupController::class, 'adminDeleteBalance']);
    Route::post('/medical-checkup/admin/balances/bulk-init', [\App\Http\Controllers\Api\MedicalCheckupController::class, 'bulkInitBalances']);
    Route::post('/medical-checkup/admin/packages', [\App\Http\Controllers\Api\MedicalCheckupController::class, 'adminStorePackage']);
    Route::post('/medical-checkup/admin/packages/seed-defaults', [\App\Http\Controllers\Api\MedicalCheckupController::class, 'adminSeedDefaultPackages']);
    Route::delete('/medical-checkup/admin/packages/clear-all', [\App\Http\Controllers\Api\MedicalCheckupController::class, 'adminClearAllPackages']);
    Route::put('/medical-checkup/admin/packages/{id}', [\App\Http\Controllers\Api\MedicalCheckupController::class, 'adminUpdatePackage']);
    Route::delete('/medical-checkup/admin/packages/{id}', [\App\Http\Controllers\Api\MedicalCheckupController::class, 'adminDeletePackage']);

    // Pengadaan PDTT
    Route::get('/pdtt-items', [PdttItemController::class, 'index']);
    Route::get('/pdtt-items/report', [PdttItemController::class, 'report']);
    Route::post('/pdtt-items', [PdttItemController::class, 'store']);
    Route::put('/pdtt-items/{id}', [PdttItemController::class, 'update']);
    Route::delete('/pdtt-items/{id}', [PdttItemController::class, 'destroy']);
    Route::post('/pdtt-items/{id}/price', [PdttItemController::class, 'updatePrice']);
    Route::post('/pdtt-items/{id}/toggle-requestable', [PdttItemController::class, 'toggleRequestable']);
    Route::get('/pdtt-items/requestable', [PdttItemController::class, 'requestableItems']);
    Route::apiResource('pdtt-authorized-users', \App\Http\Controllers\Api\PdttAuthorizedUserController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::get('/pdtt-service-config', [\App\Http\Controllers\Api\PdttAuthorizedUserController::class, 'serviceConfig']);
    Route::put('/pdtt-service-config', [\App\Http\Controllers\Api\PdttAuthorizedUserController::class, 'updateServiceConfig']);

    // Pengusulan Pengadaan Barang (Realtime awal)
    Route::get('/procurement-proposals', [ProcurementProposalController::class, 'index']);
    Route::post('/procurement-proposals', [ProcurementProposalController::class, 'store']);
    Route::put('/procurement-proposals/{id}', [ProcurementProposalController::class, 'update']);
    Route::delete('/procurement-proposals/{id}', [ProcurementProposalController::class, 'destroy']);
    Route::post('/procurement-proposals/{id}/lock', [ProcurementProposalController::class, 'lock']);
    Route::post('/procurement-proposals/{id}/unlock', [ProcurementProposalController::class, 'unlock']);
    Route::post('/procurement-proposals/{id}/submit-price', [ProcurementProposalController::class, 'submitPrice']);

    // Permintaan Pengadaan dari Master PDTT
    Route::get('/procurement-requests', [\App\Http\Controllers\Api\ProcurementRequestController::class, 'index']);
    Route::post('/procurement-requests', [\App\Http\Controllers\Api\ProcurementRequestController::class, 'store']);
    Route::get('/admin/procurement-requests', [\App\Http\Controllers\Api\ProcurementRequestController::class, 'indexAdmin']);
    Route::put('/admin/procurement-requests/bulk-fulfillment', [\App\Http\Controllers\Api\ProcurementRequestController::class, 'bulkFulfillment']);
    Route::put('/admin/procurement-requests/{id}', [\App\Http\Controllers\Api\ProcurementRequestController::class, 'updateAdmin']);
    Route::put('/admin/procurement-requests/{id}/status', [\App\Http\Controllers\Api\ProcurementRequestController::class, 'updateStatus']);
    Route::put('/admin/procurement-requests/{id}/fulfillment', [\App\Http\Controllers\Api\ProcurementRequestController::class, 'updateFulfillment']);
    Route::delete('/admin/procurement-requests/{id}', [\App\Http\Controllers\Api\ProcurementRequestController::class, 'destroyAdmin']);
    Route::post('/admin/procurement-requests/cross-tab-report', [\App\Http\Controllers\Api\ProcurementRequestController::class, 'crossTabReport']);

    // Proses Pengadaan PBJ (Protected mutation routes)
    Route::post('/procurement-pbjs', [\App\Http\Controllers\Api\ProcurementPbjController::class, 'store']);
    Route::put('/procurement-pbjs/{id}', [\App\Http\Controllers\Api\ProcurementPbjController::class, 'update']);
    Route::post('/procurement-pbjs/{id}', [\App\Http\Controllers\Api\ProcurementPbjController::class, 'update']);
    Route::delete('/procurement-pbjs/{id}', [\App\Http\Controllers\Api\ProcurementPbjController::class, 'destroy']);

    // ─── Kanban Work Workspaces / Groups Management ─────────────────
    Route::get('/kanban-groups', [\App\Http\Controllers\Api\KanbanTaskController::class, 'listGroups']);
    Route::post('/kanban-groups', [\App\Http\Controllers\Api\KanbanTaskController::class, 'storeGroup']);
    Route::put('/kanban-groups/{id}', [\App\Http\Controllers\Api\KanbanTaskController::class, 'updateGroup']);
    Route::delete('/kanban-groups/{id}', [\App\Http\Controllers\Api\KanbanTaskController::class, 'destroyGroup']);

    // ─── Kanban Work Tasks Management & Nextcloud Storage ───────────
    Route::get('/kanban-tasks', [\App\Http\Controllers\Api\KanbanTaskController::class, 'index']);
    Route::get('/kanban-tasks/employees', [\App\Http\Controllers\Api\KanbanTaskController::class, 'listEmployees']);
    Route::post('/kanban-tasks', [\App\Http\Controllers\Api\KanbanTaskController::class, 'store']);
    Route::get('/kanban-tasks/{id}', [\App\Http\Controllers\Api\KanbanTaskController::class, 'show']);
    Route::put('/kanban-tasks/{id}', [\App\Http\Controllers\Api\KanbanTaskController::class, 'update']);
    Route::put('/kanban-tasks/{id}/status', [\App\Http\Controllers\Api\KanbanTaskController::class, 'updateStatus']);
    Route::delete('/kanban-tasks/{id}', [\App\Http\Controllers\Api\KanbanTaskController::class, 'destroy']);
    Route::post('/kanban-tasks/{taskId}/subtasks', [\App\Http\Controllers\Api\KanbanTaskController::class, 'storeSubtask']);
    Route::put('/kanban-tasks/subtasks/{subtaskId}', [\App\Http\Controllers\Api\KanbanTaskController::class, 'updateSubtask']);
    Route::post('/kanban-tasks/subtasks/{subtaskId}/evidence', [\App\Http\Controllers\Api\KanbanTaskController::class, 'uploadSubtaskEvidence']);
    Route::delete('/kanban-tasks/subtasks/{subtaskId}/evidence', [\App\Http\Controllers\Api\KanbanTaskController::class, 'deleteSubtaskEvidence']);
    Route::delete('/kanban-tasks/subtasks/{subtaskId}', [\App\Http\Controllers\Api\KanbanTaskController::class, 'deleteSubtask']);
    Route::get('/kanban-tasks/subtasks/{subtaskId}/file', [\App\Http\Controllers\Api\KanbanTaskController::class, 'streamSubtaskFile']);

    // ─── Kanban Work Progress Reports & History ─────────────────────
    Route::get('/kanban-tasks/{taskId}/reports', [\App\Http\Controllers\Api\KanbanTaskController::class, 'listReports']);
    Route::post('/kanban-tasks/{taskId}/reports', [\App\Http\Controllers\Api\KanbanTaskController::class, 'storeReport']);
    Route::delete('/kanban-tasks/reports/{reportId}', [\App\Http\Controllers\Api\KanbanTaskController::class, 'destroyReport']);
    Route::get('/kanban-tasks/reports/{reportId}/file', [\App\Http\Controllers\Api\KanbanTaskController::class, 'streamReportFile']);

    // ─── Kanban Workspace Activity Logs (Audit Trail) ──────────────
    Route::get('/kanban-activities', [\App\Http\Controllers\Api\KanbanTaskController::class, 'listActivities']);
    Route::get('/kanban-groups/{groupId}/activities', [\App\Http\Controllers\Api\KanbanTaskController::class, 'listActivities']);

    // Inventory routes
    Route::apiResource('inventories', InventoryController::class);
    Route::get('/inventory-stock-cards', [InventoryStockCardController::class, 'index']);
    Route::post('/inventory-stock-cards', [InventoryStockCardController::class, 'store']);

    // Inventory Requests (admin)
    Route::get('/inventory-requests', [InventoryRequestController::class, 'index']);
    Route::put('/inventory-requests/{id}/approve', [InventoryRequestController::class, 'approve']);
    Route::put('/inventory-requests/{id}/reject', [InventoryRequestController::class, 'reject']);

    // Loan routes
    Route::apiResource('loans', LoanController::class);
    Route::put('/loans/{id}/approve', [LoanController::class, 'approve']);
    Route::put('/loans/{id}/return', [LoanController::class, 'return']);

    // Request routes
    Route::apiResource('requests', RequestController::class);
    Route::put('/requests/{id}/approve', [RequestController::class, 'approve']);
    Route::put('/requests/{id}/reject', [RequestController::class, 'reject']);

    // IT Helpdesk Ticket routes - Spesifik routes harus sebelum apiResource
    Route::get('/it-helpdesk-tickets', [ItHelpdeskTicketController::class, 'index']);
    Route::post('/it-helpdesk-tickets', [ItHelpdeskTicketController::class, 'store']);
    Route::get('/it-helpdesk-tickets/{id}', [ItHelpdeskTicketController::class, 'show']);
    Route::put('/it-helpdesk-tickets/{id}/approve', [ItHelpdeskTicketController::class, 'approve']);
    Route::put('/it-helpdesk-tickets/{id}/reject', [ItHelpdeskTicketController::class, 'reject']);
    Route::put('/it-helpdesk-tickets/{id}/complete', [ItHelpdeskTicketController::class, 'complete']);
    Route::put('/it-helpdesk-tickets/{id}/confirm', [ItHelpdeskTicketController::class, 'confirm']);
    Route::delete('/it-helpdesk-tickets/{id}', [ItHelpdeskTicketController::class, 'destroy']);

    // ─── Letter routes (Pencatatan Surat Masuk & Keluar) ─────────────
    Route::get('/letters/units', [LetterController::class, 'units']);
    Route::get('/letters', [LetterController::class, 'index']);
    Route::post('/letters', [LetterController::class, 'store']);
    Route::put('/letters/{id}', [LetterController::class, 'update']);
    Route::delete('/letters/{id}', [LetterController::class, 'destroy']);
    Route::get('/letters/export-pdf', [LetterController::class, 'exportPdf']);
    Route::post('/letters/{id}/bukti', [LetterController::class, 'uploadBukti']);
    Route::post('/letters/{id}/file-surat', [LetterController::class, 'uploadFileSurat']);
    // ─── Vital Archive routes ─────────────
    Route::get('/vital-archives/export-pdf', [VitalArchiveController::class, 'exportPdf']);
    Route::get('/vital-archives', [VitalArchiveController::class, 'index']);
    Route::post('/vital-archives', [VitalArchiveController::class, 'store']);
    Route::put('/vital-archives/{id}', [VitalArchiveController::class, 'update']);
    Route::delete('/vital-archives/{id}', [VitalArchiveController::class, 'destroy']);
    // ─── Surat Tugas ─────────────
    Route::get('/surat-tugas/my-assignments', [SuratTugasController::class, 'myAssignments']);
    Route::post('/surat-tugas', [SuratTugasController::class, 'store']);
    Route::get('/surat-tugas/word-parameters', [SuratTugasController::class, 'wordTemplateParameters']);
    Route::get('/surat-tugas/templates', [SuratTugasController::class, 'listTemplates']);
    Route::get('/surat-tugas', [SuratTugasController::class, 'index']);
    Route::get('/surat-tugas/{id}', [SuratTugasController::class, 'show'])->whereNumber('id');
    Route::put('/surat-tugas/{id}/approve', [SuratTugasController::class, 'approve']);
    Route::put('/surat-tugas/{id}/reject', [SuratTugasController::class, 'reject']);
    Route::put('/surat-tugas/{id}/complete', [SuratTugasController::class, 'completeData']);
    Route::put('/surat-tugas/{id}/user-update', [SuratTugasController::class, 'updateUserData']);
    Route::post('/surat-tugas/{id}/re-sign', [SuratTugasController::class, 'reSign']);
    Route::post('/surat-tugas/{id}/send-siamparan', [SuratTugasController::class, 'resendSiamparan']);
    Route::post('/surat-tugas/{id}/resend-lengkap', [SuratTugasController::class, 'resendLengkapNotification']);
    Route::post('/surat-tugas/{id}/reset-to-draft', [SuratTugasController::class, 'resetToDraft']);
    Route::get('/surat-tugas/{id}/documents', [SuratTugasController::class, 'listDocuments'])->whereNumber('id');
    Route::get('/surat-tugas/{id}/documents/{docId}/download', [SuratTugasController::class, 'downloadCachedDocument'])->whereNumber(['id', 'docId']);
    Route::delete('/surat-tugas/{id}/documents/{docId}', [SuratTugasController::class, 'deleteCachedDocument'])->whereNumber(['id', 'docId']);
    Route::get('/surat-tugas/{id}/download', [SuratTugasController::class, 'generateTemplate'])->whereNumber('id');
    Route::post('/surat-tugas/{id}/sign-protokol', [SuratTugasController::class, 'signProtokolKerja'])->whereNumber('id');
    Route::post('/surat-tugas/{id}/request-signature', [SuratTugasController::class, 'requestSignature'])->whereNumber('id');
    Route::delete('/surat-tugas/{id}', [SuratTugasController::class, 'destroy']);
    Route::get('/surat-tugas/mak-suggestions', [SuratTugasController::class, 'getMakSuggestions']);

    // ─── LPJ (Laporan Pertanggungjawaban) ─────────────
    Route::get('/lpj', [LpjController::class, 'index']);
    Route::get('/lpj/{suratTugasId}', [LpjController::class, 'show'])->whereNumber('suratTugasId');
    Route::get('/lpj/{suratTugasId}/export-pdf', [LpjController::class, 'exportPdf'])->whereNumber('suratTugasId');
    Route::get('/lpj/{suratTugasId}/export-rekap', [LpjController::class, 'exportRekap'])->whereNumber('suratTugasId');
    Route::get('/lpj/{suratTugasId}/export-rill', [LpjController::class, 'exportRill'])->whereNumber('suratTugasId');
    Route::post('/lpj/{suratTugasId}', [LpjController::class, 'store'])->whereNumber('suratTugasId');
    Route::put('/lpj/{suratTugasId}/items', [LpjController::class, 'updateItems'])->whereNumber('suratTugasId');
    Route::post('/lpj/{suratTugasId}/mark-manual', [LpjController::class, 'markManual'])->whereNumber('suratTugasId');
    Route::post('/lpj/{suratTugasId}/exclude', [LpjController::class, 'exclude'])->whereNumber('suratTugasId');
    Route::delete('/lpj/{suratTugasId}', [LpjController::class, 'destroy'])->whereNumber('suratTugasId');

    // ─── KKP (Kertas Kerja Perhitungan) ─────────────
    Route::get('/kkp/{suratTugasId}', [\App\Http\Controllers\Api\KkpController::class, 'show'])->whereNumber('suratTugasId');
    Route::get('/kkp/{suratTugasId}/export-pdf', [\App\Http\Controllers\Api\KkpController::class, 'exportPdf'])->whereNumber('suratTugasId');
    Route::get('/kkp/{suratTugasId}/export-rekap', [\App\Http\Controllers\Api\KkpController::class, 'exportRekap'])->whereNumber('suratTugasId');
    Route::get('/kkp/{suratTugasId}/export-rill', [\App\Http\Controllers\Api\KkpController::class, 'exportRill'])->whereNumber('suratTugasId');
    Route::post('/kkp/{suratTugasId}', [\App\Http\Controllers\Api\KkpController::class, 'store'])->whereNumber('suratTugasId');
    Route::put('/kkp/{suratTugasId}/items', [\App\Http\Controllers\Api\KkpController::class, 'updateItems'])->whereNumber('suratTugasId');
    Route::post('/kkp/{suratTugasId}/mark-manual', [\App\Http\Controllers\Api\KkpController::class, 'markManual'])->whereNumber('suratTugasId');
    Route::delete('/kkp/{suratTugasId}', [\App\Http\Controllers\Api\KkpController::class, 'destroy'])->whereNumber('suratTugasId');

    // ─── Permintaan Panjar ─────────────
    Route::get('/panjar-requests', [PanjarRequestController::class, 'index']);
    Route::post('/panjar-requests', [PanjarRequestController::class, 'store']);
    Route::get('/panjar-requests/{id}', [PanjarRequestController::class, 'show'])->whereNumber('id');
    Route::get('/panjar-requests/{id}/export-pdf', [PanjarRequestController::class, 'exportPdf'])->whereNumber('id');
    Route::put('/panjar-requests/{id}', [PanjarRequestController::class, 'update'])->whereNumber('id');
    Route::delete('/panjar-requests/{id}', [PanjarRequestController::class, 'destroy'])->whereNumber('id');
    Route::post('/panjar-requests/{id}/submit', [PanjarRequestController::class, 'submit'])->whereNumber('id');
    Route::post('/panjar-requests/{id}/validate-ppk', [PanjarRequestController::class, 'validatePpk'])->whereNumber('id');
    Route::post('/panjar-requests/{id}/validate-bendahara', [PanjarRequestController::class, 'validateBendahara'])->whereNumber('id');

    // ─── Pejabat Perbendaharaan ─────────────
    Route::get('/pejabat-perbendaharaan', [PejabatPerbendaharaanController::class, 'show']);
    Route::post('/pejabat-perbendaharaan', [PejabatPerbendaharaanController::class, 'update']);

    // ─── Pembuatan Invoice ─────────────
    Route::get('/invoices', [\App\Http\Controllers\Api\InvoiceController::class, 'index']);
    Route::post('/invoices', [\App\Http\Controllers\Api\InvoiceController::class, 'store']);
    Route::post('/invoices/ai-terbilang', [\App\Http\Controllers\Api\InvoiceController::class, 'aiTerbilang']);
    Route::get('/invoices/{id}', [\App\Http\Controllers\Api\InvoiceController::class, 'show'])->whereNumber('id');
    Route::put('/invoices/{id}', [\App\Http\Controllers\Api\InvoiceController::class, 'update'])->whereNumber('id');
    Route::delete('/invoices/{id}', [\App\Http\Controllers\Api\InvoiceController::class, 'destroy'])->whereNumber('id');
    Route::put('/invoices/{id}/approve', [\App\Http\Controllers\Api\InvoiceController::class, 'approve'])->whereNumber('id');
    Route::get('/invoices/{id}/export-pdf', [\App\Http\Controllers\Api\InvoiceController::class, 'exportPdf'])->whereNumber('id');
    Route::get('/invoices/{id}/export-pdf-f4', [\App\Http\Controllers\Api\InvoiceController::class, 'exportPdf'])->whereNumber('id');

    // ─── Anggaran & Revisi Anggaran ─────────────
    Route::apiResource('budgets', BudgetController::class);
    Route::get('/realisasi-mak', [BudgetController::class, 'realisasiMak']);
    Route::get('/realisasi-date', [BudgetController::class, 'realisasiDate']);
    Route::apiResource('revision-tickets', RevisionTicketController::class);
    Route::post('/revision-tickets/{id}/approve', [RevisionTicketController::class, 'approve'])->whereNumber('id');

    // ─── Notifications & FCM ─────────────
    Route::get('/notifications', [\App\Http\Controllers\Api\NotificationController::class, 'index']);
    Route::put('/notifications/read-all', [\App\Http\Controllers\Api\NotificationController::class, 'markAllAsRead']);
    Route::put('/notifications/{id}/read', [\App\Http\Controllers\Api\NotificationController::class, 'markAsRead']);
    Route::put('/fcm-token', [\App\Http\Controllers\Api\NotificationController::class, 'updateFcmToken']);

    // ─── Queue Display (Admin) ─────────────
    Route::get('/queue-display/admin', [QueueDisplayController::class, 'adminShow']);
    Route::put('/queue-display/call-next', [QueueDisplayController::class, 'callNext']);
    Route::put('/queue-display/recall', [QueueDisplayController::class, 'recall']);
    Route::put('/queue-display/recall-all', [QueueDisplayController::class, 'recallAll']);
    Route::put('/queue-display/set-number', [QueueDisplayController::class, 'setNumber']);
    Route::put('/queue-display/set-officer', [QueueDisplayController::class, 'setOfficer']);
    Route::put('/queue-display/update-ticker', [QueueDisplayController::class, 'updateTicker']);
    Route::put('/queue-display/toggle-status', [QueueDisplayController::class, 'toggleStatus']);
    Route::put('/queue-display/reset', [QueueDisplayController::class, 'resetQueue']);
    Route::post('/queue-display/upload-photo', [QueueDisplayController::class, 'uploadPhoto']);
    Route::post('/queue-display/upload-slide', [QueueDisplayController::class, 'uploadSlide']);
    Route::put('/queue-display/update-slideshow', [QueueDisplayController::class, 'updateSlideshow']);

    Route::get('/visitor-queues', [VisitorQueueController::class, 'indexAdmin']);
    Route::put('/visitor-queues/{id}/call', [VisitorQueueController::class, 'callVisitor']);
    Route::put('/visitor-queues/{id}/serve', [VisitorQueueController::class, 'serveVisitor']);

    // ─── Zoom Generator ─────────────
    Route::get('/zoom/users', [ZoomController::class, 'listUsers']);
    Route::post('/zoom/meetings', [ZoomController::class, 'createMeeting']);

    // ─── E-Invitations ─────────────
    Route::get('/e-invitations', [EInvitationController::class, 'index']);
    Route::post('/e-invitations', [EInvitationController::class, 'store']);
    Route::get('/e-invitations/{id}', [EInvitationController::class, 'show'])->whereNumber('id');
    Route::put('/e-invitations/{id}', [EInvitationController::class, 'update'])->whereNumber('id');
    Route::post('/e-invitations/{id}', [EInvitationController::class, 'update'])->whereNumber('id');
    Route::delete('/e-invitations/{id}', [EInvitationController::class, 'destroy'])->whereNumber('id');
    Route::get('/e-invitations/{id}/guests', [EInvitationController::class, 'getGuests'])->whereNumber('id');
    Route::post('/e-invitations/{id}/guests', [EInvitationController::class, 'addGuest'])->whereNumber('id');
    Route::post('/e-invitations/{id}/guests/bulk', [EInvitationController::class, 'bulkAddGuests'])->whereNumber('id');
    Route::delete('/e-invitations/{id}/guests/{guestId}', [EInvitationController::class, 'deleteGuest'])->whereNumber('id');
    Route::post('/e-invitations/{id}/check-in', [EInvitationController::class, 'checkInGuest'])->whereNumber('id');

    // ─── RHPK (Rencana Hasil Pelaksanaan Kegiatan V2) ─────────────
    Route::get('/rhpk/summary', [RhpkController::class, 'summary']);
    Route::get('/rhpk', [RhpkController::class, 'index']);
    Route::post('/rhpk', [RhpkController::class, 'store']);
    Route::get('/rhpk/{id}', [RhpkController::class, 'show'])->whereNumber('id');
    Route::put('/rhpk/{id}', [RhpkController::class, 'update'])->whereNumber('id');
    Route::delete('/rhpk/{id}', [RhpkController::class, 'destroy'])->whereNumber('id');
    Route::put('/rhpk/{id}/status', [RhpkController::class, 'updateStatus'])->whereNumber('id');

    // Sub-Menu 1: Capaian Output
    Route::get('/rhpk-outputs', [RhpkOutputController::class, 'index']);
    Route::post('/rhpk-outputs/target', [RhpkOutputController::class, 'storeTarget']);
    Route::put('/rhpk-outputs/target/{id}', [RhpkOutputController::class, 'updateTarget'])->whereNumber('id');
    Route::delete('/rhpk-outputs/target/{id}', [RhpkOutputController::class, 'destroyTarget'])->whereNumber('id');
    Route::post('/rhpk-outputs/realization', [RhpkOutputController::class, 'saveRealization']);

    // Sub-Menu 2: Penjelasan Capaian Output
    Route::get('/rhpk-explanations', [RhpkExplanationController::class, 'index']);
    Route::post('/rhpk-explanations/indicator', [RhpkExplanationController::class, 'storeIndicator']);
    Route::put('/rhpk-explanations/indicator/{id}', [RhpkExplanationController::class, 'updateIndicator'])->whereNumber('id');
    Route::delete('/rhpk-explanations/indicator/{id}', [RhpkExplanationController::class, 'destroyIndicator'])->whereNumber('id');
    Route::post('/rhpk-explanations/save', [RhpkExplanationController::class, 'saveExplanation']);
    Route::put('/rhpk-explanations/{id}/review', [RhpkExplanationController::class, 'reviewExplanation'])->whereNumber('id');
});

// Fallback Route Public Storage & Media (Bypass Hostinger Broken Symlink 404)
Route::get('/media/{path}', function ($path) {
    $filename = basename($path);
    $candidates = [
        storage_path('app/public/' . $path),
        storage_path('app/' . $path),
        base_path('storage/app/public/' . $path),
        public_path('storage/' . $path),
        base_path('public/storage/' . $path),
        dirname(base_path()) . '/storage/app/public/' . $path,
    ];

    foreach ($candidates as $filePath) {
        if (file_exists($filePath) && !is_dir($filePath)) {
            $mimeType = @mime_content_type($filePath) ?: 'application/octet-stream';
            return response()->file($filePath, [
                'Content-Type' => $mimeType,
                'Cache-Control' => 'public, max-age=31536000',
            ]);
        }
    }

    try {
        $searchDir = storage_path();
        if (is_dir($searchDir)) {
            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($searchDir, RecursiveDirectoryIterator::SKIP_DOTS)
            );
            foreach ($iterator as $file) {
                if ($file->isFile() && $file->getFilename() === $filename) {
                    $foundPath = $file->getRealPath();
                    $mimeType = @mime_content_type($foundPath) ?: 'application/octet-stream';
                    return response()->file($foundPath, [
                        'Content-Type' => $mimeType,
                        'Cache-Control' => 'public, max-age=31536000',
                    ]);
                }
            }
        }
    } catch (\Throwable $e) {
    }

    abort(404, 'File media tidak ditemukan di server.');
})->where('path', '.*');

Route::get('/storage/{path}', function ($path) {
    $filename = basename($path);
    $candidates = [
        storage_path('app/public/' . $path),
        storage_path('app/' . $path),
        base_path('storage/app/public/' . $path),
        public_path('storage/' . $path),
        base_path('public/storage/' . $path),
        dirname(base_path()) . '/storage/app/public/' . $path,
    ];

    foreach ($candidates as $filePath) {
        if (file_exists($filePath) && !is_dir($filePath)) {
            $mimeType = @mime_content_type($filePath) ?: 'application/octet-stream';
            return response()->file($filePath, [
                'Content-Type' => $mimeType,
                'Cache-Control' => 'public, max-age=31536000',
            ]);
        }
    }

    try {
        $searchDir = storage_path();
        if (is_dir($searchDir)) {
            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($searchDir, RecursiveDirectoryIterator::SKIP_DOTS)
            );
            foreach ($iterator as $file) {
                if ($file->isFile() && $file->getFilename() === $filename) {
                    $foundPath = $file->getRealPath();
                    $mimeType = @mime_content_type($foundPath) ?: 'application/octet-stream';
                    return response()->file($foundPath, [
                        'Content-Type' => $mimeType,
                        'Cache-Control' => 'public, max-age=31536000',
                    ]);
                }
            }
        }
    } catch (\Throwable $e) {
    }

    abort(404, 'File storage tidak ditemukan di server.');
})->where('path', '.*');



