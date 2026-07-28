<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Budget;
use App\Models\BudgetHistory;
use App\Models\RevisionTicket;
use App\Models\RevisionTicketAdjustment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RevisionTicketController extends Controller
{
    /**
     * Display a listing of revision tickets.
     */
    public function index()
    {
        $tickets = RevisionTicket::with(['adjustments', 'creator'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($tickets);
    }

    /**
     * Store a newly created revision ticket.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'catatan' => 'required|string',
            'adjustments' => 'required|array|min:2',
            'adjustments.*.mak' => 'required|string',
            'adjustments.*.tipe' => 'required|string|in:Tambah Anggaran,Kurang Anggaran',
            'adjustments.*.nilai' => 'required|numeric|gt:0',
        ]);

        $adjustments = $validated['adjustments'];

        // Calculate totals
        $totalAdd = 0;
        $totalReduce = 0;
        foreach ($adjustments as $adj) {
            if ($adj['tipe'] === 'Tambah Anggaran') {
                $totalAdd += (float) $adj['nilai'];
            } else {
                $totalReduce += (float) $adj['nilai'];
            }
        }

        if (abs($totalAdd - $totalReduce) > 0.01) {
            return response()->json([
                'message' => 'Total penambahan anggaran harus sama dengan total pengurangan anggaran.'
            ], 422);
        }

        $ticket = DB::transaction(function () use ($request, $validated, $adjustments) {
            $today = date('Ymd');
            $countToday = RevisionTicket::whereDate('created_at', date('Y-m-d'))->count() + 1;
            $ticketNo = 'REV-' . $today . '-' . str_pad($countToday, 4, '0', STR_PAD_LEFT);

            $ticket = RevisionTicket::create([
                'ticket_no' => $ticketNo,
                'tanggal_ticket' => now(),
                'status' => 'Menunggu',
                'catatan' => $validated['catatan'],
                'created_by' => $request->user()?->id,
            ]);

            foreach ($adjustments as $adj) {
                RevisionTicketAdjustment::create([
                    'revision_ticket_id' => $ticket->id,
                    'mak' => trim($adj['mak']),
                    'tipe' => $adj['tipe'],
                    'nilai' => $adj['nilai'],
                ]);
            }

            return $ticket;
        });

        return response()->json($ticket->load(['adjustments', 'creator']), 201);
    }

    /**
     * Display the specified revision ticket.
     */
    public function show($id)
    {
        $ticket = RevisionTicket::with(['adjustments', 'creator'])->findOrFail($id);
        return response()->json($ticket);
    }

    /**
     * Update the specified revision ticket.
     */
    public function update(Request $request, $id)
    {
        $ticket = RevisionTicket::findOrFail($id);

        if ($ticket->status !== 'Menunggu') {
            return response()->json([
                'message' => 'Tiket yang telah diproses tidak dapat diubah.'
            ], 422);
        }

        $validated = $request->validate([
            'catatan' => 'required|string',
            'adjustments' => 'required|array|min:2',
            'adjustments.*.mak' => 'required|string',
            'adjustments.*.tipe' => 'required|string|in:Tambah Anggaran,Kurang Anggaran',
            'adjustments.*.nilai' => 'required|numeric|gt:0',
        ]);

        $adjustments = $validated['adjustments'];

        // Calculate totals
        $totalAdd = 0;
        $totalReduce = 0;
        foreach ($adjustments as $adj) {
            if ($adj['tipe'] === 'Tambah Anggaran') {
                $totalAdd += (float) $adj['nilai'];
            } else {
                $totalReduce += (float) $adj['nilai'];
            }
        }

        if (abs($totalAdd - $totalReduce) > 0.01) {
            return response()->json([
                'message' => 'Total penambahan anggaran harus sama dengan total pengurangan anggaran.'
            ], 422);
        }

        DB::transaction(function () use ($ticket, $validated, $adjustments) {
            $ticket->update([
                'catatan' => $validated['catatan'],
            ]);

            // Replace adjustments
            $ticket->adjustments()->delete();
            foreach ($adjustments as $adj) {
                RevisionTicketAdjustment::create([
                    'revision_ticket_id' => $ticket->id,
                    'mak' => trim($adj['mak']),
                    'tipe' => $adj['tipe'],
                    'nilai' => $adj['nilai'],
                ]);
            }
        });

        return response()->json($ticket->load(['adjustments', 'creator']));
    }

    /**
     * Remove the specified revision ticket.
     */
    public function destroy($id)
    {
        $ticket = RevisionTicket::findOrFail($id);

        if ($ticket->status !== 'Menunggu') {
            return response()->json([
                'message' => 'Tiket yang telah diproses tidak dapat dihapus.'
            ], 422);
        }

        $ticket->delete();

        return response()->json(['message' => 'Permintaan revisi berhasil dihapus.']);
    }

    /**
     * Approve the revision ticket and update budget values.
     */
    public function approve(Request $request, $id)
    {
        $ticket = RevisionTicket::with('adjustments')->findOrFail($id);

        if ($ticket->status !== 'Menunggu') {
            return response()->json([
                'message' => 'Tiket ini sudah diproses.'
            ], 422);
        }

        DB::transaction(function () use ($ticket) {
            $now = now();
            $ticket->update([
                'status' => 'Selesai',
                'tanggal_diproses' => $now,
                'tanggal_selesai' => $now,
            ]);

            foreach ($ticket->adjustments as $adj) {
                $budget = Budget::firstOrCreate(
                    ['mak' => trim($adj->mak)],
                    ['deskripsi' => 'Budget MAK ' . $adj->mak, 'anggaran' => 0]
                );

                $change = ($adj->tipe === 'Tambah Anggaran') ? (float) $adj->nilai : -(float) $adj->nilai;
                $budget->anggaran = (float) $budget->anggaran + $change;
                $budget->save();

                BudgetHistory::create([
                    'budget_id' => $budget->id,
                    'tanggal' => $now,
                    'keterangan' => "Revisi Anggaran Tiket #{$ticket->ticket_no}: {$adj->tipe} " . number_format($adj->nilai, 0, ',', '.'),
                    'perubahan' => $change,
                    'status' => 'Selesai',
                    'revision_ticket_id' => $ticket->id,
                ]);
            }
        });

        return response()->json([
            'message' => 'Permintaan revisi berhasil disetujui.',
            'ticket' => $ticket->load(['adjustments', 'creator']),
        ]);
    }
}
