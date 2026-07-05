<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LpjHeader;
use App\Models\LpjItem;
use App\Models\SuratTugas;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class LpjController extends Controller
{
    /**
     * List semua Surat Tugas berstatus 'lengkap' beserta status LPJ-nya.
     * Excluded items are hidden from the list.
     */
    public function index(Request $request)
    {
        $query = SuratTugas::with(['employees', 'penandatangan', 'ketuaTim'])
            ->where('status', 'lengkap');

        // Exclude STs that have been marked as 'excluded'
        $excludedIds = LpjHeader::where('status', 'excluded')->pluck('surat_tugas_id')->toArray();
        if (!empty($excludedIds)) {
            $query->whereNotIn('id', $excludedIds);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('nomor_st', 'like', "%$s%")
                  ->orWhere('lokasi_tugas', 'like', "%$s%")
                  ->orWhere('deskripsi_tugas', 'like', "%$s%")
                  ->orWhere('mak', 'like', "%$s%")
                  ->orWhereHas('employees', fn($eq) => $eq->where('name', 'like', "%$s%"));
            });
        }

        $data = $query->orderBy('tanggal_mulai', 'desc')->paginate(20);

        // Inject status LPJ ke setiap record
        $suratTugasIds = collect($data->items())->pluck('id')->toArray();
        $lpjMap = LpjHeader::whereIn('surat_tugas_id', $suratTugasIds)
            ->pluck('status', 'surat_tugas_id');

        $items = collect($data->items())->map(function ($st) use ($lpjMap) {
            $arr = $st->toArray();
            $arr['lpj_status'] = $lpjMap->get($st->id, null); // null = belum ada LPJ
            return $arr;
        });

        return response()->json([
            'data'         => $items,
            'current_page' => $data->currentPage(),
            'per_page'     => $data->perPage(),
            'total'        => $data->total(),
            'last_page'    => $data->lastPage(),
        ]);
    }

    /**
     * Detail LPJ untuk satu Surat Tugas.
     */
    public function show($suratTugasId)
    {
        $st = SuratTugas::with(['employees', 'penandatangan', 'ketuaTim', 'creator'])
            ->where('status', 'lengkap')
            ->findOrFail($suratTugasId);

        $lpj = LpjHeader::with('items')
            ->where('surat_tugas_id', $st->id)
            ->first();

        return response()->json([
            'surat_tugas' => $st,
            'lpj'         => $lpj,
        ]);
    }

    /**
     * Buat header LPJ untuk satu Surat Tugas (jika belum ada).
     */
    public function store(Request $request, $suratTugasId)
    {
        $st = SuratTugas::where('status', 'lengkap')->findOrFail($suratTugasId);

        $existing = LpjHeader::where('surat_tugas_id', $st->id)->first();
        if ($existing) {
            return response()->json([
                'message' => 'LPJ untuk surat tugas ini sudah ada.',
                'lpj'     => $existing->load('items'),
            ], 200);
        }

        $lpj = LpjHeader::create([
            'surat_tugas_id' => $st->id,
            'status'         => 'draft',
            'keterangan'     => $request->keterangan,
            'created_by'     => $request->user()?->id,
        ]);

        return response()->json([
            'message' => 'LPJ berhasil dibuat.',
            'lpj'     => $lpj->load('items'),
        ], 201);
    }

    /**
     * Simpan/update items LPJ (biaya per pegawai) — bulk upsert.
     * 
     * Body: { keterangan?: string, status?: 'draft'|'final', items: [...] }
     * Item: { employee_id?, employee_name, employee_nip?, is_external?,
     *          uang_harian?, uang_penginapan?, uang_transport_taxi?, uang_transport_bus? }
     */
    public function updateItems(Request $request, $suratTugasId)
    {
        $st = SuratTugas::where('status', 'lengkap')->findOrFail($suratTugasId);

        $validator = Validator::make($request->all(), [
            'status'                          => 'nullable|in:draft,final',
            'keterangan'                      => 'nullable|string|max:1000',
            'items'                           => 'required|array',
            'items.*.employee_name'           => 'required|string|max:255',
            'items.*.employee_nip'            => 'nullable|string|max:50',
            'items.*.employee_id'             => 'nullable|integer|exists:employees,id',
            'items.*.is_external'             => 'nullable|boolean',
            'items.*.uang_harian'             => 'nullable|numeric|min:0',
            'items.*.uang_harian_hari'        => 'nullable|integer|min:0',
            'items.*.uang_harian_per_hari'    => 'nullable|numeric|min:0',
            'items.*.uang_penginapan'         => 'nullable|numeric|min:0',
            'items.*.uang_penginapan_harian'  => 'nullable|numeric|min:0',
            'items.*.uang_penginapan_hari'    => 'nullable|integer|min:0',
            'items.*.uang_transport_taxi'     => 'nullable|numeric|min:0',
            'items.*.uang_transport_taxi_berangkat'  => 'nullable|numeric|min:0',
            'items.*.uang_transport_taxi_pulang'     => 'nullable|numeric|min:0',
            'items.*.uang_transport_bus'      => 'nullable|numeric|min:0',
            'items.*.uang_transport_bus_berangkat'   => 'nullable|numeric|min:0',
            'items.*.uang_transport_bus_pulang'      => 'nullable|numeric|min:0',
            'items.*.uang_transport_bbm'      => 'nullable|numeric|min:0',
            'items.*.uang_transport_sewa_mobil' => 'nullable|numeric|min:0',
            'items.*.uang_transport_sewa_mobil_harian' => 'nullable|numeric|min:0',
            'items.*.uang_transport_sewa_mobil_hari'   => 'nullable|integer|min:0',
            'items.*.uang_transport_pesawat'  => 'nullable|numeric|min:0',
            'items.*.uang_transport_pesawat_berangkat' => 'nullable|numeric|min:0',
            'items.*.uang_transport_pesawat_pulang'    => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        DB::transaction(function () use ($request, $st) {
            // Pastikan header ada
            $lpj = LpjHeader::firstOrCreate(
                ['surat_tugas_id' => $st->id],
                [
                    'status'     => $request->status ?? 'draft',
                    'keterangan' => $request->keterangan,
                    'created_by' => $request->user()?->id,
                ]
            );

            // Update header jika sudah ada
            $lpj->update([
                'status'     => $request->status ?? $lpj->status,
                'keterangan' => $request->keterangan ?? $lpj->keterangan,
            ]);

            // Hapus items lama dan insert ulang
            $lpj->items()->delete();

            $now = now();
            $toInsert = collect($request->items)->map(function ($item) use ($lpj, $now) {
                $val = fn($k) => isset($item[$k]) && $item[$k] !== '' ? $item[$k] : null;
                $num = fn($k) => isset($item[$k]) && $item[$k] !== '' ? (float) $item[$k] : 0;
                $int = fn($k) => isset($item[$k]) && $item[$k] !== '' ? (int) $item[$k] : 0;

                // Calculate totals from breakdowns
                $busTotal   = $num('uang_transport_bus_berangkat') + $num('uang_transport_bus_pulang');
                $taxiTotal  = $num('uang_transport_taxi_berangkat') + $num('uang_transport_taxi_pulang');
                $pesawatTotal = $num('uang_transport_pesawat_berangkat') + $num('uang_transport_pesawat_pulang');
                $sewaMobilTotal = $num('uang_transport_sewa_mobil_harian') * $int('uang_transport_sewa_mobil_hari');
                $harianTotal = $num('uang_harian_per_hari') * $int('uang_harian_hari');
                $penginapanTotal = $num('uang_penginapan_harian') * $int('uang_penginapan_hari');

                return [
                    'lpj_header_id'       => $lpj->id,
                    'employee_id'         => $item['employee_id'] ?? null,
                    'employee_name'       => $item['employee_name'],
                    'employee_nip'        => $item['employee_nip'] ?? null,
                    'is_external'         => (bool) ($item['is_external'] ?? false),
                    // Transport Bus
                    'uang_transport_bus'            => $busTotal ?: $val('uang_transport_bus'),
                    'uang_transport_bus_berangkat'  => $val('uang_transport_bus_berangkat'),
                    'uang_transport_bus_pulang'     => $val('uang_transport_bus_pulang'),
                    // Transport Taxi
                    'uang_transport_taxi'           => $taxiTotal ?: $val('uang_transport_taxi'),
                    'uang_transport_taxi_berangkat' => $val('uang_transport_taxi_berangkat'),
                    'uang_transport_taxi_pulang'    => $val('uang_transport_taxi_pulang'),
                    // Transport Pesawat
                    'uang_transport_pesawat'           => $pesawatTotal ?: $val('uang_transport_pesawat'),
                    'uang_transport_pesawat_berangkat' => $val('uang_transport_pesawat_berangkat'),
                    'uang_transport_pesawat_pulang'    => $val('uang_transport_pesawat_pulang'),
                    // Transport BBM
                    'uang_transport_bbm'  => $val('uang_transport_bbm'),
                    // Transport Sewa Mobil
                    'uang_transport_sewa_mobil'        => $sewaMobilTotal ?: $val('uang_transport_sewa_mobil'),
                    'uang_transport_sewa_mobil_harian'  => $val('uang_transport_sewa_mobil_harian'),
                    'uang_transport_sewa_mobil_hari'    => $val('uang_transport_sewa_mobil_hari'),
                    // Uang Harian
                    'uang_harian'          => $harianTotal ?: $val('uang_harian'),
                    'uang_harian_per_hari' => $val('uang_harian_per_hari'),
                    'uang_harian_hari'     => $val('uang_harian_hari'),
                    // Penginapan
                    'uang_penginapan'        => $penginapanTotal ?: $val('uang_penginapan'),
                    'uang_penginapan_harian' => $val('uang_penginapan_harian'),
                    'uang_penginapan_hari'   => $val('uang_penginapan_hari'),
                    'created_at'          => $now,
                    'updated_at'          => $now,
                ];
            })->toArray();

            if (!empty($toInsert)) {
                LpjItem::insert($toInsert);
            }

            $this->_lpj = $lpj;
        });

        $lpjResult = LpjHeader::with('items')
            ->where('surat_tugas_id', $st->id)
            ->first();

        return response()->json([
            'message' => 'Data LPJ berhasil disimpan.',
            'lpj'     => $lpjResult,
        ]);
    }

    /**
     * Tandai LPJ sebagai "Manual" — LPJ sudah dibuat di luar sistem.
     */
    public function markManual(Request $request, $suratTugasId)
    {
        $st = SuratTugas::where('status', 'lengkap')->findOrFail($suratTugasId);

        $lpj = LpjHeader::updateOrCreate(
            ['surat_tugas_id' => $st->id],
            [
                'status'     => 'manual',
                'keterangan' => 'LPJ dibuat di luar sistem (manual)',
                'created_by' => $request->user()?->id,
            ]
        );

        return response()->json([
            'message' => 'LPJ ditandai sebagai manual.',
            'lpj'     => $lpj,
        ]);
    }

    /**
     * Sembunyikan ST dari daftar LPJ (tidak menghapus Surat Tugas).
     */
    public function exclude(Request $request, $suratTugasId)
    {
        $st = SuratTugas::where('status', 'lengkap')->findOrFail($suratTugasId);

        // Remove any existing LPJ data first
        $existing = LpjHeader::where('surat_tugas_id', $st->id)->first();
        if ($existing) {
            $existing->items()->delete();
            $existing->update(['status' => 'excluded']);
        } else {
            LpjHeader::create([
                'surat_tugas_id' => $st->id,
                'status'         => 'excluded',
                'keterangan'     => 'Dihapus dari daftar LPJ',
                'created_by'     => $request->user()?->id,
            ]);
        }

        return response()->json([
            'message' => 'Surat Tugas berhasil dihapus dari daftar LPJ.',
        ]);
    }

    /**
     * Hapus seluruh LPJ (header + items via cascade).
     */
    public function destroy($suratTugasId)
    {
        $lpj = LpjHeader::where('surat_tugas_id', $suratTugasId)->firstOrFail();
        $lpj->delete();

        return response()->json(['message' => 'LPJ berhasil dihapus.']);
    }
}

