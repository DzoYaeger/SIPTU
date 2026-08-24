<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\OpenCodeService;
use App\Services\GeminiService;
use App\Models\BmnLoan;
use App\Models\ItHelpdeskTicket;
use App\Models\ExitPermit;
use Illuminate\Support\Facades\Auth;

class AIAssistantController extends Controller
{
    protected $openCodeService;
    protected $geminiService;

    public function __construct(OpenCodeService $openCodeService, GeminiService $geminiService)
    {
        $this->openCodeService = $openCodeService;
        $this->geminiService = $geminiService;
    }

    public function chat(Request $request)
    {
        $request->validate([
            'message' => 'required|string|max:2000',
            'history' => 'nullable|array',
        ]);

        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Gather context about the user's current status
        $context = [
            'user_name' => $user->name,
            'user_role' => $user->base_role,
            'user_nip' => $user->nip,
            'recent_bmn_loans' => BmnLoan::where('borrower_id', $user->id)
                ->latest()
                ->take(3)
                ->get(['id', 'spa_number', 'status', 'loan_date', 'return_date']),
            'recent_it_tickets' => ItHelpdeskTicket::where('employee_id', $user->id)
                ->latest()
                ->take(3)
                ->get(['id', 'ticket_number', 'status', 'report_type', 'created_at']),
            'recent_exit_permits' => ExitPermit::where('employee_id', $user->id)
                ->latest()
                ->take(3)
                ->get(['id', 'date', 'status', 'permit_type']),
        ];

        $history = $request->input('history', []);

        // Use OpenCode (DeepSeek) as primary if configured, otherwise fallback to Gemini
        $opencodeKey = config('services.opencode.api_key', env('OPENCODE_API_KEY', ''));
        $response = null;

        if (!empty($opencodeKey)) {
            $response = $this->openCodeService->chatAssistant($request->message, $context, $history);
            // If OpenCode encountered a provider error, fallback to Gemini
            if (empty($response) || str_starts_with($response, 'Maaf, terjadi kendala') || str_starts_with($response, 'Maaf, tidak ada respon')) {
                \Illuminate\Support\Facades\Log::warning('OpenCode failed, falling back to Gemini', ['opencode_response' => $response]);
                $response = $this->geminiService->chatAssistant($request->message, $context, $history);
            }
        } else {
            $response = $this->geminiService->chatAssistant($request->message, $context, $history);
        }

        return response()->json([
            'status' => 'success',
            'reply' => $response
        ]);
    }
}
