<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Budget;
use App\Models\BudgetHistory;
use App\Models\Invoice;
use App\Models\SuratTugas;
use App\Models\LpjHeader;
use App\Models\LpjItem;
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
     * Realisasi Anggaran per MAK (Disinkronkan dengan Invoice & Perjadin).
     */
    public function realisasiMak(Request $request)
    {
        // 1. Total realisasi dari Invoice Pembelian
        $realisasiInvoices = DB::table('invoices')
            ->select('mak', DB::raw('SUM(nilai_bersih) as total_realisasi'))
            ->whereNotNull('mak')
            ->whereIn('status', ['approved', 'paid', 'Selesai', 'Disetujui', 'final', 'completed'])
            ->groupBy('mak')
            ->pluck('total_realisasi', 'mak');

        // 2. Total realisasi dari Perjadin (LPJ Items per Surat Tugas MAK)
        $realisasiPerjadin = DB::table('lpj_items')
            ->join('lpj_headers', 'lpj_items.lpj_header_id', '=', 'lpj_headers.id')
            ->join('surat_tugas', 'lpj_headers.surat_tugas_id', '=', 'surat_tugas.id')
            ->select('surat_tugas.mak', DB::raw('SUM(
                COALESCE(uang_harian,0) + COALESCE(uang_penginapan,0) + COALESCE(uang_transport_taxi,0) + 
                COALESCE(uang_transport_bus,0) + COALESCE(uang_transport_bbm,0) + COALESCE(uang_transport_sewa_mobil,0) + 
                COALESCE(uang_transport_pesawat,0) + COALESCE(uang_fullboard,0) + COALESCE(uang_harian_fullboard,0) + 
                COALESCE(uang_transport_lokal,0) + COALESCE(uang_transport_umum,0)
            ) as total_realisasi'))
            ->whereNotNull('surat_tugas.mak')
            ->groupBy('surat_tugas.mak')
            ->pluck('total_realisasi', 'surat_tugas.mak');

        // Fetch all budgets
        $budgets = Budget::all();

        $result = $budgets->map(function ($budget) use ($realisasiInvoices, $realisasiPerjadin) {
            $totalInv = (float) ($realisasiInvoices->get($budget->mak) ?? 0);
            $totalSt = (float) ($realisasiPerjadin->get($budget->mak) ?? 0);
            $totalRealisasi = $totalInv + $totalSt;

            return [
                'mak' => $budget->mak,
                'deskripsi' => $budget->deskripsi ?? '',
                'total_realisasi' => $totalRealisasi,
                'realisasi_pembelian' => $totalInv,
                'realisasi_perjadin' => $totalSt,
                'anggaran' => (float) $budget->anggaran,
            ];
        });

        return response()->json($result);
    }

    /**
     * Realisasi Anggaran per Tanggal (Sinkron gabungan Invoice & Perjadin).
     */
    public function realisasiDate(Request $request)
    {
        // A. Data Realisasi Pembelian (Invoice)
        $invoices = Invoice::with(['taxes', 'creator', 'approver'])
            ->orderBy('created_at', 'desc')
            ->get();

        $pembelianList = $invoices->map(function ($inv) {
            return [
                'id' => 'inv_' . $inv->id,
                'raw_id' => $inv->id,
                'transaction_type' => 'Pembelian',
                'transaction_number' => $inv->invoice_no ?: ($inv->ticket_no ?: 'INV-' . $inv->id),
                'date' => $inv->approved_at ? $inv->approved_at->format('Y-m-d') : ($inv->created_at ? $inv->created_at->format('Y-m-d') : date('Y-m-d')),
                'mak' => $inv->mak ?: '-',
                'description' => $inv->deskripsi ?: 'Pembelian Barang / Jasa',
                'employee_name' => $inv->penerima_name ?: ($inv->creator ? $inv->creator->name : '-'),
                'value' => (float) $inv->nilai_bersih,
                'status' => $inv->status ?: 'approved',
                'details' => [
                    'nilai_kotor' => (float) $inv->nilai_kotor,
                    'total_pajak' => (float) $inv->total_pajak,
                    'nilai_bersih' => (float) $inv->nilai_bersih,
                    'terbilang' => $inv->terbilang_bersih,
                    'ppk_name' => $inv->ppk_name,
                    'bendahara_name' => $inv->bendahara_name,
                    'taxes' => $inv->taxes ? $inv->taxes->map(function ($tax) {
                        return [
                            'tax_type' => $tax->tax_type,
                            'tax_rate' => (float) $tax->tax_rate,
                            'tax_amount' => (float) $tax->tax_amount,
                        ];
                    }) : [],
                ],
            ];
        });

        // B. Data Realisasi Perjadin (HANYA Surat Tugas yang sudah diinput biaya LPJ-nya)
        $suratTugas = SuratTugas::with(['employees', 'ketuaTim', 'creator'])
            ->orderBy('created_at', 'desc')
            ->get();

        $lpjMap = LpjHeader::with('items')->get()->keyBy('surat_tugas_id');

        $perjadinList = $suratTugas->map(function ($st) use ($lpjMap) {
            $lpj = $lpjMap->get($st->id);
            $lpjItems = $lpj ? $lpj->items : collect([]);

            $totalBiaya = $lpjItems->sum(function ($item) {
                return (float) (
                    ($item->uang_harian ?? 0) +
                    ($item->uang_penginapan ?? 0) +
                    ($item->uang_transport_taxi ?? 0) +
                    ($item->uang_transport_bus ?? 0) +
                    ($item->uang_transport_bbm ?? 0) +
                    ($item->uang_transport_sewa_mobil ?? 0) +
                    ($item->uang_transport_pesawat ?? 0) +
                    ($item->uang_fullboard ?? 0) +
                    ($item->uang_harian_fullboard ?? 0) +
                    ($item->uang_transport_lokal ?? 0) +
                    ($item->uang_transport_umum ?? 0)
                );
            });

            // HANYA diproses jika LPJ sudah diinput (totalBiaya > 0 & lpjItems > 0)
            if ($lpjItems->count() === 0 || $totalBiaya <= 0) {
                return null;
            }

            $lamaHari = '-';
            if ($st->tanggal_mulai && $st->tanggal_selesai) {
                $days = $st->tanggal_mulai->diffInDays($st->tanggal_selesai) + 1;
                $lamaHari = $days . ' Hari (' . $st->tanggal_mulai->format('d M Y') . ' - ' . $st->tanggal_selesai->format('d M Y') . ')';
            }

            $employeeName = '-';
            if ($st->creator && $st->creator->name) {
                $employeeName = $st->creator->name;
            } elseif ($st->ketuaTim && ($st->ketuaTim->name || $st->ketuaTim->nama)) {
                $employeeName = $st->ketuaTim->name ?: $st->ketuaTim->nama;
            } elseif ($st->employees->isNotEmpty()) {
                $firstEmp = $st->employees->first();
                $employeeName = $firstEmp->name ?: ($firstEmp->nama ?: '-');
            }

            $petugasList = $st->employees->map(function ($e) {
                return [
                    'nama' => $e->name ?: ($e->nama ?: '-'),
                    'nip' => $e->nip ?: '-',
                    'jabatan' => $e->position ?: ($e->jabatan ?: ($e->pangkat ?: '-')),
                ];
            });

            if ($petugasList->isEmpty() && $lpjItems->isNotEmpty()) {
                $petugasList = $lpjItems->map(function ($item) {
                    return [
                        'nama' => $item->employee_name ?: '-',
                        'nip' => $item->employee_nip ?: '-',
                        'jabatan' => $item->employee_position ?: ($item->jabatan ?: '-'),
                    ];
                });
            }

            return [
                'id' => 'st_' . $st->id,
                'raw_id' => $st->id,
                'transaction_type' => 'Perjadin',
                'transaction_number' => $st->nomor_st ?: ('ST/' . $st->id),
                'date' => $st->tanggal_st ? $st->tanggal_st->format('Y-m-d') : ($st->created_at ? $st->created_at->format('Y-m-d') : date('Y-m-d')),
                'mak' => $st->mak ?: '-',
                'description' => $st->deskripsi_tugas ?: 'Perjalanan Dinas',
                'employee_name' => $employeeName,
                'value' => (float) $totalBiaya,
                'status' => $lpj ? $lpj->status : ($st->status ?: 'Disetujui'),
                'details' => [
                    'lokasi_tugas' => $st->lokasi_tugas ?: ($st->sarana_nama ?: '-'),
                    'tanggal_mulai' => $st->tanggal_mulai ? $st->tanggal_mulai->format('d M Y') : '-',
                    'tanggal_selesai' => $st->tanggal_selesai ? $st->tanggal_selesai->format('d M Y') : '-',
                    'lama_hari' => $lamaHari,
                    'petugas_list' => $petugasList,
                    'lpj_items' => $lpjItems->map(function ($item) {
                        $totalItem = (float) (
                            ($item->uang_harian ?? 0) +
                            ($item->uang_penginapan ?? 0) +
                            ($item->uang_transport_taxi ?? 0) +
                            ($item->uang_transport_bus ?? 0) +
                            ($item->uang_transport_bbm ?? 0) +
                            ($item->uang_transport_sewa_mobil ?? 0) +
                            ($item->uang_transport_pesawat ?? 0) +
                            ($item->uang_fullboard ?? 0) +
                            ($item->uang_harian_fullboard ?? 0) +
                            ($item->uang_transport_lokal ?? 0) +
                            ($item->uang_transport_umum ?? 0)
                        );
                        return [
                            'employee_name' => $item->employee_name,
                            'employee_nip' => $item->employee_nip,
                            'uang_harian' => (float) ($item->uang_harian ?? 0),
                            'uang_penginapan' => (float) ($item->uang_penginapan ?? 0),
                            'uang_transport' => (float) (
                                ($item->uang_transport_taxi ?? 0) +
                                ($item->uang_transport_bus ?? 0) +
                                ($item->uang_transport_bbm ?? 0) +
                                ($item->uang_transport_sewa_mobil ?? 0) +
                                ($item->uang_transport_pesawat ?? 0) +
                                ($item->uang_transport_lokal ?? 0) +
                                ($item->uang_transport_umum ?? 0)
                            ),
                            'total' => $totalItem,
                        ];
                    }),
                ],
            ];
        })->filter()->values();

        // C. Gabungkan dan Urutkan Berdasarkan Tanggal Terbaru
        $merged = $pembelianList->concat($perjadinList)->sortByDesc('date')->values();

        return response()->json($merged);
    }
}

