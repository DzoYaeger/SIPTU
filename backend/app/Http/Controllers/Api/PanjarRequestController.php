<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\PanjarRequest;
use App\Models\PanjarRequestItem;
use App\Models\PejabatPerbendaharaan;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class PanjarRequestController extends Controller
{
    public function index(Request $request)
    {
        $query = PanjarRequest::with(['items', 'creator', 'approver']);
        $user = $request->user();

        if ($user && ($user->base_role ?? 'operator') !== 'admin') {
            $query->where('created_by', $user->id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('ticket_no', 'like', "%{$search}%")
                    ->orWhere('panjar_no', 'like', "%{$search}%")
                    ->orWhere('surat_tugas_no', 'like', "%{$search}%")
                    ->orWhere('mak', 'like', "%{$search}%")
                    ->orWhere('kegiatan', 'like', "%{$search}%")
                    ->orWhere('uraian', 'like', "%{$search}%")
                    ->orWhere('penerima_name', 'like', "%{$search}%")
                    ->orWhereHas('creator', fn ($cq) => $cq->where('name', 'like', "%{$search}%"));
            });
        }

        if ($request->filled('status') && $request->status !== 'ALL') {
            $query->where('status', $request->status);
        }

        if ($request->filled('tahun_anggaran') && $request->tahun_anggaran !== 'ALL') {
            $query->where('tahun_anggaran', $request->tahun_anggaran);
        }

        return response()->json([
            'status' => 'success',
            'data' => $query->orderBy('created_at', 'desc')->paginate($request->input('per_page', 15)),
        ]);
    }

    public function store(Request $request)
    {
        $validator = $this->validator($request);
        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'message' => 'Validasi gagal', 'errors' => $validator->errors()], 422);
        }

        try {
            DB::beginTransaction();
            $panjar = $this->persistPanjar(new PanjarRequest(), $request);
            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Permintaan panjar berhasil dibuat',
                'data' => $panjar->load(['items', 'creator', 'approver']),
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['status' => 'error', 'message' => 'Gagal membuat panjar: ' . $e->getMessage()], 500);
        }
    }

    public function show($id)
    {
        $panjar = PanjarRequest::with(['items', 'creator', 'approver'])->find($id);
        if (!$panjar) {
            return response()->json(['status' => 'error', 'message' => 'Permintaan panjar tidak ditemukan'], 404);
        }

        return response()->json(['status' => 'success', 'data' => $panjar]);
    }

    public function update(Request $request, $id)
    {
        $panjar = PanjarRequest::find($id);
        if (!$panjar) {
            return response()->json(['status' => 'error', 'message' => 'Permintaan panjar tidak ditemukan'], 404);
        }

        $validator = $this->validator($request);
        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'message' => 'Validasi gagal', 'errors' => $validator->errors()], 422);
        }

        try {
            DB::beginTransaction();
            $panjar = $this->persistPanjar($panjar, $request);
            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Permintaan panjar berhasil diperbarui',
                'data' => $panjar->load(['items', 'creator', 'approver']),
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['status' => 'error', 'message' => 'Gagal memperbarui panjar: ' . $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        $panjar = PanjarRequest::find($id);
        if (!$panjar) {
            return response()->json(['status' => 'error', 'message' => 'Permintaan panjar tidak ditemukan'], 404);
        }

        $panjar->delete();
        return response()->json(['status' => 'success', 'message' => 'Permintaan panjar berhasil dihapus']);
    }

    public function approve(Request $request, $id)
    {
        $panjar = PanjarRequest::find($id);
        if (!$panjar) {
            return response()->json(['status' => 'error', 'message' => 'Permintaan panjar tidak ditemukan'], 404);
        }

        $panjar->update([
            'status' => 'approved',
            'approved_by' => $request->user()?->id,
            'approved_at' => now(),
        ]);

        return response()->json(['status' => 'success', 'message' => 'Permintaan panjar disetujui', 'data' => $panjar->load(['items', 'creator', 'approver'])]);
    }

    public function reject($id)
    {
        $panjar = PanjarRequest::find($id);
        if (!$panjar) {
            return response()->json(['status' => 'error', 'message' => 'Permintaan panjar tidak ditemukan'], 404);
        }

        $panjar->update(['status' => 'rejected']);
        return response()->json(['status' => 'success', 'message' => 'Permintaan panjar ditolak', 'data' => $panjar->load(['items', 'creator', 'approver'])]);
    }

    public function exportPdf($id)
    {
        $panjar = PanjarRequest::with(['items', 'creator'])->find($id);
        if (!$panjar) {
            return response()->json(['status' => 'error', 'message' => 'Permintaan panjar tidak ditemukan'], 404);
        }

        $pejabat = PejabatPerbendaharaan::with(['bendahara', 'ppk'])->first();
        if (empty($panjar->ppk_name) && $pejabat?->ppk) {
            $panjar->ppk_name = $pejabat->ppk->name;
            $panjar->ppk_nip = $pejabat->ppk->nip;
        }
        if (empty($panjar->bendahara_name) && $pejabat?->bendahara) {
            $panjar->bendahara_name = $pejabat->bendahara->name;
            $panjar->bendahara_nip = $pejabat->bendahara->nip;
        }

        $empData = null;
        if ($panjar->penerima_name) {
            $emp = Employee::where('name', $panjar->penerima_name)->first();
            if ($emp) {
                $empData = [
                    'nama' => $emp->name,
                    'nip' => $emp->nip ?: '-',
                    'pangkat' => $emp->pangkat ?: '-',
                    'jabatan' => $emp->position ?: '-',
                ];
            }
        }

        if (!$empData) {
            $empData = [
                'nama' => $panjar->penerima_name ?: '-',
                'nip' => '-',
                'pangkat' => '-',
                'jabatan' => '-',
            ];
        }

        $base = $panjar->tanggal_pengajuan ?? $panjar->created_at;
        $tglPengajuan = \Carbon\Carbon::parse($base)->translatedFormat('d F Y');
        $tglMulai = $panjar->tanggal_mulai_kegiatan
            ? \Carbon\Carbon::parse($panjar->tanggal_mulai_kegiatan)->translatedFormat('d F Y')
            : '-';
        $tglAkhir = $panjar->tanggal_akhir_kegiatan
            ? \Carbon\Carbon::parse($panjar->tanggal_akhir_kegiatan)->translatedFormat('d F Y')
            : '-';
        $tglPalingLambat = $panjar->tanggal_paling_lambat
            ? \Carbon\Carbon::parse($panjar->tanggal_paling_lambat)->translatedFormat('d F Y')
            : '-';
        $tglCetak = \Carbon\Carbon::now()->translatedFormat('d F Y');

        $pdf = Pdf::loadView('pdf.panjar_request', [
            'panjar' => $panjar,
            'pegawai' => $empData,
            'tgl_pengajuan' => $tglPengajuan,
            'tgl_mulai' => $tglMulai,
            'tgl_akhir' => $tglAkhir,
            'tgl_paling_lambat' => $tglPalingLambat,
            'tgl_cetak' => $tglCetak,
        ])->setPaper('A4', 'portrait');

        $fileName = 'FORM_PERSETUJUAN_PANJAR_' . str_replace('/', '_', $panjar->panjar_no ?? $panjar->ticket_no) . '.pdf';
        return $pdf->stream($fileName);
    }

    private function validator(Request $request)
    {
        return Validator::make($request->all(), [
            'tahun_anggaran' => 'nullable|integer',
            'tanggal_pengajuan' => 'nullable|date',
            'tanggal_mulai_kegiatan' => 'nullable|date',
            'tanggal_akhir_kegiatan' => 'nullable|date',
            'panjar_no' => 'nullable|string|max:255',
            'surat_tugas_no' => 'nullable|string|max:255',
            'mak' => 'nullable|string|max:255',
            'kegiatan' => 'required|string|max:255',
            'uraian' => 'nullable|string',
            'penerima_name' => 'nullable|string|max:255',
            'nominal_panjar' => 'nullable|numeric|min:0',
            'status' => 'nullable|string|in:draft,submitted,approved,rejected,paid',
            'ppk_name' => 'nullable|string|max:255',
            'ppk_nip' => 'nullable|string|max:255',
            'bendahara_name' => 'nullable|string|max:255',
            'bendahara_nip' => 'nullable|string|max:255',
            'items' => 'nullable|array',
            'items.*.uraian' => 'required_with:items|string|max:255',
            'items.*.volume' => 'nullable|numeric|min:0',
            'items.*.satuan' => 'nullable|string|max:50',
            'items.*.harga_satuan' => 'nullable|numeric|min:0',
            'items.*.jumlah' => 'nullable|numeric|min:0',
            'items.*.keterangan' => 'nullable|string',
        ]);
    }

    private function persistPanjar(PanjarRequest $panjar, Request $request): PanjarRequest
    {
        $itemsData = collect($request->input('items', []))
            ->filter(fn ($item) => trim((string)($item['uraian'] ?? '')) !== '')
            ->values();

        $itemTotal = $itemsData->sum(function ($item) {
            $volume = (float)($item['volume'] ?? 0);
            $hargaSatuan = (float)($item['harga_satuan'] ?? 0);
            return (float)($item['jumlah'] ?? ($volume * $hargaSatuan));
        });

        $nominal = $itemTotal; // Nominal selalu dihitung dari total rincian biaya
        $terbilang = InvoiceController::terbilang($nominal);

        // Tanggal paling lambat = H+7 dari tanggal akhir kegiatan
        $tglPalingLambat = null;
        if ($request->tanggal_akhir_kegiatan) {
            $tglPalingLambat = \Carbon\Carbon::parse($request->tanggal_akhir_kegiatan)->addDays(7)->toDateString();
        }

        $pejabat = PejabatPerbendaharaan::with(['bendahara', 'ppk'])->first();
        $ticketNo = $panjar->ticket_no ?: 'PNJ-' . date('Ymd') . '-' . str_pad((string)mt_rand(1, 9999), 4, '0', STR_PAD_LEFT);

        $panjar->fill([
            'ticket_no' => $ticketNo,
            'panjar_no' => $request->panjar_no ?: $ticketNo,
            'tahun_anggaran' => $request->tahun_anggaran ?: date('Y'),
            'tanggal_pengajuan' => $request->tanggal_pengajuan ?: now()->toDateString(),
            'tanggal_mulai_kegiatan' => $request->tanggal_mulai_kegiatan,
            'tanggal_akhir_kegiatan' => $request->tanggal_akhir_kegiatan,
            'tanggal_paling_lambat' => $tglPalingLambat,
            'mak' => $request->mak,
            'kegiatan' => $request->kegiatan,
            'uraian' => $request->uraian,
            'penerima_name' => $request->penerima_name,
            'surat_tugas_no' => $request->surat_tugas_no,
            'nominal_panjar' => $nominal,
            'terbilang_panjar' => $terbilang,
            'status' => $request->status ?: ($panjar->status ?: 'draft'),
            'ppk_name' => $request->ppk_name ?: ($pejabat?->ppk?->name ?? null),
            'ppk_nip' => $request->ppk_nip ?: ($pejabat?->ppk?->nip ?? null),
            'bendahara_name' => $request->bendahara_name ?: ($pejabat?->bendahara?->name ?? null),
            'bendahara_nip' => $request->bendahara_nip ?: ($pejabat?->bendahara?->nip ?? null),
            'created_by' => $panjar->created_by ?: $request->user()?->id,
        ]);
        $panjar->save();

        $panjar->items()->delete();
        foreach ($itemsData as $index => $item) {
            $volume = (float)($item['volume'] ?? 0);
            $hargaSatuan = (float)($item['harga_satuan'] ?? 0);
            PanjarRequestItem::create([
                'panjar_request_id' => $panjar->id,
                'uraian' => $item['uraian'],
                'volume' => $volume,
                'satuan' => $item['satuan'] ?? null,
                'harga_satuan' => $hargaSatuan,
                'jumlah' => (float)($item['jumlah'] ?? ($volume * $hargaSatuan)),
                'keterangan' => $item['keterangan'] ?? null,
                'sort_order' => $index + 1,
            ]);
        }

        return $panjar;
    }
}