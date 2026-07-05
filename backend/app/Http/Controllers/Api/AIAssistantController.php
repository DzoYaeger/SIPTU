<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\GeminiService;
use App\Models\BmnLoan;
use App\Models\ItHelpdeskTicket;
use App\Models\ExitPermit;
use Illuminate\Support\Facades\Auth;

class AIAssistantController extends Controller
{
    protected $geminiService;

    public function __construct(GeminiService $geminiService)
    {
        $this->geminiService = $geminiService;
    }

    public function chat(Request $request)
    {
        $request->validate([
            'message' => 'required|string|max:1000',
        ]);

        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Gather context about the user's current status
        $context = [
            'user_name' => $user->name,
            'user_role' => $user->base_role,
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

        $response = $this->geminiService->chatAssistant($request->message, $context);

        return response()->json([
            'status' => 'success',
            'reply' => $response
        ]);
    }
}
