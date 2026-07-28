<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Budget;
use App\Models\BudgetHistory;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BudgetController extends Controller
{
    /**
     * Display a listing of the budgets.
     */
    public function index(Request $request)
    {
        $query = Budget::with('history');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('mak', 'like', "%{$search}%")
                  ->orWhere('deskripsi', 'like', "%{$search}%");
            });
        }

        $budgets = $query->orderBy('mak', 'asc')->get();

        return response()->json($budgets);
    }

    /**
     * Store a newly created budget.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'mak' => 'required|string|max:100|unique:budgets,mak',
            'deskripsi' => 'nullable|string',
            'anggaran' => 'required|numeric|min:0',
        ]);

        $budget = DB::transaction(function () use ($validated) {
            $budget = Budget::create([
                'mak' => trim($validated['mak']),
                'deskripsi' => $validated['deskripsi'] ?? null,
                'anggaran' => $validated['anggaran'],
            ]);

            BudgetHistory::create([
                'budget_id' => $budget->id,
                'tanggal' => now(),
                'keterangan' => 'Alokasi Awal Anggaran',
                'perubahan' => $validated['anggaran'],
                'status' => 'Disetujui',
            ]);

            return $budget;
        });

        return response()->json($budget->load('history'), 201);
    }

    /**
     * Display the specified budget.
     */
    public function show($id)
    {
        $budget = Budget::with('history')->findOrFail($id);
        return response()->json($budget);
    }

    /**
     * Update the specified budget.
     */
    public function update(Request $request, $id)
    {
        $budget = Budget::findOrFail($id);

        $validated = $request->validate([
            'mak' => 'required|string|max:100|unique:budgets,mak,' . $id,
            'deskripsi' => 'nullable|string',
            'anggaran' => 'required|numeric|min:0',
            'catatan' => 'nullable|string',
        ]);

        $oldAnggaran = (float) $budget->anggaran;
        $newAnggaran = (float) $validated['anggaran'];
        $diff = $newAnggaran - $oldAnggaran;

        DB::transaction(function () use ($budget, $validated, $diff) {
            $budget->update([
                'mak' => trim($validated['mak']),
                'deskripsi' => $validated['deskripsi'] ?? null,
                'anggaran' => $validated['anggaran'],
            ]);

            if (abs($diff) > 0.0001) {
                BudgetHistory::create([
                    'budget_id' => $budget->id,
                    'tanggal' => now(),
                    'keterangan' => $validated['catatan'] ?? 'Penyesuaian Manual Anggaran',
                    'perubahan' => $diff,
                    'status' => 'Disetujui',
                ]);
            }
        });

        return response()->json($budget->load('history'));
    }

    /**
     * Remove the specified budget.
     */
    public function destroy($id)
    {
        $budget = Budget::findOrFail($id);
        $budget->delete();

        return response()->json(['message' => 'Anggaran berhasil dihapus.']);
    }

    /**
     * Realisasi Anggaran per MAK.
     */
    public function realisasiMak(Request $request)
    {
        // Get total realisasi from approved invoices grouped by MAK
        $realisasiInvoices = DB::table('invoices')
            ->select('mak', DB::raw('SUM(nilai_bersih) as total_realisasi'))
            ->whereNotNull('mak')
            ->whereIn('status', ['approved', 'paid', 'Selesai', 'Disetujui'])
            ->groupBy('mak')
            ->pluck('total_realisasi', 'mak');

        // Fetch all budgets
        $budgets = Budget::all();

        $result = $budgets->map(function ($budget) use ($realisasiInvoices) {
            $realisasi = (float) ($realisasiInvoices->get($budget->mak) ?? 0);
            return [
                'mak' => $budget->mak,
                'deskripsi' => $budget->deskripsi ?? '',
                'total_realisasi' => $realisasi,
                'anggaran' => (float) $budget->anggaran,
            ];
        });

        return response()->json($result);
    }

    /**
     * Realisasi Anggaran per Tanggal.
     */
    public function realisasiDate(Request $request)
    {
        $invoices = Invoice::with('approver')
            ->orderBy('created_at', 'desc')
            ->get();

        $result = $invoices->map(function ($inv) {
            return [
                'id' => $inv->id,
                'tanggal' => $inv->approved_at ? $inv->approved_at->toIso8601String() : $inv->created_at->toIso8601String(),
                'mak' => $inv->mak ?? '-',
                'deskripsi' => $inv->deskripsi ?? '-',
                'nilai' => (float) $inv->nilai_bersih,
                'status' => $inv->status,
                'invoice_no' => $inv->invoice_no,
                'ticket_no' => $inv->ticket_no,
                'approver' => $inv->approver ? ['name' => $inv->approver->name] : null,
            ];
        });

        return response()->json($result);
    }
}
