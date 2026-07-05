<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\VisitorQueue;
use App\Models\QueueDisplay;
use Carbon\Carbon;

class VisitorQueueController extends Controller
{
    /**
     * Public endpoint to register a new visitor queue.
     */
    public function storePublic(Request $request)
    {
        $request->validate([
            'visitor_name' => 'required|string|max:255',
            'institution_name' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'purpose_of_visit' => 'required|string|max:255',
            'counter_code' => 'required|string|in:A,B',
        ]);

        $today = Carbon::now('Asia/Makassar')->toDateString();

        // Find the last queue number for today and this counter
        $lastQueue = VisitorQueue::where('date', $today)
            ->where('counter_code', $request->counter_code)
            ->orderBy('queue_number', 'desc')
            ->first();

        $nextNumber = $lastQueue ? $lastQueue->queue_number + 1 : 1;

        $visitor = VisitorQueue::create([
            'visitor_name' => $request->visitor_name,
            'institution_name' => $request->institution_name,
            'phone' => $request->phone,
            'purpose_of_visit' => $request->purpose_of_visit,
            'counter_code' => $request->counter_code,
            'queue_number' => $nextNumber,
            'status' => 'waiting',
            'date' => $today,
        ]);

        return response()->json([
            'message' => 'Pendaftaran berhasil',
            'queue' => $visitor
        ]);
    }

    /**
     * Admin endpoint to get today's registered visitors.
     */
    public function indexAdmin(Request $request)
    {
        $query = VisitorQueue::orderBy('id', 'desc');

        if ($request->has('counter_code') && $request->counter_code && $request->counter_code !== 'all') {
            $query->where('counter_code', $request->counter_code);
        }

        if ($request->has('history') && $request->history) {
            // Paginated history
            $perPage = $request->get('per_page', 10);
            $visitors = $query->paginate($perPage);

            return response()->json([
                'visitors' => $visitors->items(),
                'total' => $visitors->total(),
                'current_page' => $visitors->currentPage(),
                'last_page' => $visitors->lastPage(),
            ]);
        }

        // Default: only today's data for real-time queue
        $today = Carbon::now('Asia/Makassar')->toDateString();
        $query->where('date', $today)->orderBy('id', 'asc');
        
        $visitors = $query->get();

        return response()->json([
            'visitors' => $visitors
        ]);
    }

    /**
     * Admin endpoint to call a specific visitor.
     */
    public function callVisitor(Request $request, $id)
    {
        $visitor = VisitorQueue::findOrFail($id);
        $today = Carbon::now('Asia/Makassar')->toDateString();

        // Auto-mark any previously 'called' visitors on the same counter as 'served'
        VisitorQueue::where('date', $today)
            ->where('counter_code', $visitor->counter_code)
            ->where('status', 'called')
            ->where('id', '!=', $visitor->id)
            ->update(['status' => 'served']);

        $visitor->update(['status' => 'called']);

        // Update the TV Queue Display
        $queue = QueueDisplay::where('counter_code', $visitor->counter_code)->first();
        if ($queue) {
            $queue->update([
                'current_number' => $visitor->queue_number,
                'last_called_at' => now('Asia/Makassar')
            ]);
        } else {
            QueueDisplay::create([
                'counter_code' => $visitor->counter_code,
                'current_number' => $visitor->queue_number,
                'counter_name' => 'UPP',
                'status' => 'active',
                'last_called_at' => now('Asia/Makassar')
            ]);
        }

        return response()->json([
            'message' => "Antrian {$visitor->counter_code}-{$visitor->queue_number} atas nama {$visitor->visitor_name} dipanggil.",
            'visitor' => $visitor
        ]);
    }

    /**
     * Admin endpoint to mark a specific visitor as served.
     */
    public function serveVisitor(Request $request, $id)
    {
        $visitor = VisitorQueue::findOrFail($id);
        $visitor->update(['status' => 'served']);

        return response()->json([
            'message' => "Antrian {$visitor->counter_code}-{$visitor->queue_number} diselesaikan.",
            'visitor' => $visitor
        ]);
    }
}
