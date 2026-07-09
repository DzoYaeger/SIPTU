<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LpjHeader;
use App\Models\LpjItem;
use App\Models\SuratTugas;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Barryvdh\DomPDF\Facade\Pdf;

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

        $lpj = LpjHeader::with(['items', 'bendahara'])
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
            'bendahara_id'                    => 'nullable|integer|exists:employees,id',
            'items'                           => 'required|array',
            'items.*.employee_name'           => 'required|string|max:255',
            'items.*.employee_nip'            => 'nullable|string|max:50',
            'items.*.employee_id'             => 'nullable|integer|exists:employees,id',
            'items.*.is_external'             => 'nullable|boolean',
            'items.*.nomor_spd'               => 'nullable|string|max:255',
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
                    'bendahara_id' => $request->bendahara_id,
                    'created_by' => $request->user()?->id,
                ]
            );

            // Update header jika sudah ada
            $lpj->update([
                'status'     => $request->status ?? $lpj->status,
                'keterangan' => $request->keterangan ?? $lpj->keterangan,
                'bendahara_id' => $request->has('bendahara_id') ? $request->bendahara_id : $lpj->bendahara_id,
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
                $fullboardTotal = $num('uang_fullboard_harian') * $int('uang_fullboard_hari');
                $harianFullboardTotal = $num('uang_harian_fullboard_per_hari') * $int('uang_harian_fullboard_hari');

                return [
                    'lpj_header_id'       => $lpj->id,
                    'employee_id'         => $item['employee_id'] ?? null,
                    'employee_name'       => $item['employee_name'],
                    'employee_nip'        => $item['employee_nip'] ?? null,
                    'is_external'         => (bool) ($item['is_external'] ?? false),
                    'nomor_spd'           => $val('nomor_spd'),
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
                    // Fullboard
                    'uang_fullboard'        => $fullboardTotal ?: $val('uang_fullboard'),
                    'uang_fullboard_harian' => $val('uang_fullboard_harian'),
                    'uang_fullboard_hari'   => $val('uang_fullboard_hari'),
                    // Uang Harian Fullboard
                    'uang_harian_fullboard'          => $harianFullboardTotal ?: $val('uang_harian_fullboard'),
                    'uang_harian_fullboard_per_hari' => $val('uang_harian_fullboard_per_hari'),
                    'uang_harian_fullboard_hari'     => $val('uang_harian_fullboard_hari'),
                    'created_at'          => $now,
                    'updated_at'          => $now,
                ];
            })->toArray();

            if (!empty($toInsert)) {
                LpjItem::insert($toInsert);
            }

            $this->_lpj = $lpj;
        });

        $lpjResult = LpjHeader::with(['items', 'bendahara'])
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

    /**
     * Export LPJ details to PDF.
     */
    public function exportPdf(Request $request, $suratTugasId)
    {
        \Carbon\Carbon::setLocale('id');

        $st = SuratTugas::with(['employees', 'penandatangan', 'ketuaTim'])->findOrFail($suratTugasId);
        $lpj = LpjHeader::with('bendahara')->where('surat_tugas_id', $st->id)->firstOrFail();

        $pejabat = \App\Models\PejabatPerbendaharaan::with(['bendahara', 'ppk'])->first();
        
        $bendahara = null;
        if ($pejabat && $pejabat->bendahara) {
            $bendahara = $pejabat->bendahara;
        } else {
            $bendahara = $lpj->bendahara;
        }

        $bendaharaName = $bendahara ? $bendahara->name : '-';
        $bendaharaNip = $bendahara ? $bendahara->nip : '-';

        $ppkName = ($pejabat && $pejabat->ppk) ? $pejabat->ppk->name : '-';
        $ppkNip = ($pejabat && $pejabat->ppk) ? $pejabat->ppk->nip : '-';

        $itemsQuery = LpjItem::where('lpj_header_id', $lpj->id);

        if ($request->filled('employee_id')) {
            $itemsQuery->where('employee_id', $request->employee_id);
        } elseif ($request->filled('employee_name')) {
            $itemsQuery->where('employee_name', $request->employee_name);
        }

        $items = $itemsQuery->get();

        if ($items->isEmpty()) {
            abort(404, 'Data rincian biaya tidak ditemukan.');
        }

        $processedItems = [];
        foreach ($items as $item) {
            $rows = [];
            $no = 1;
            $totalAmount = 0;

            // Transport Bus
            if ($item->uang_transport_bus !== null && $item->uang_transport_bus > 0) {
                $breakdown = [];
                if ($item->uang_transport_bus_berangkat > 0) {
                    $breakdown[] = ['label' => 'Berangkat', 'qty' => 1, 'rate' => $item->uang_transport_bus_berangkat, 'total' => $item->uang_transport_bus_berangkat];
                }
                if ($item->uang_transport_bus_pulang > 0) {
                    $breakdown[] = ['label' => 'Kembali', 'qty' => 1, 'rate' => $item->uang_transport_bus_pulang, 'total' => $item->uang_transport_bus_pulang];
                }
                $rows[] = [
                    'no' => $no++,
                    'title' => 'Transport (Bus)',
                    'breakdown' => $breakdown,
                    'total' => $item->uang_transport_bus,
                    'keterangan' => ''
                ];
                $totalAmount += $item->uang_transport_bus;
            }

            // Transport Taxi
            if ($item->uang_transport_taxi !== null && $item->uang_transport_taxi > 0) {
                $breakdown = [];
                if ($item->uang_transport_taxi_berangkat > 0) {
                    $breakdown[] = ['label' => 'Berangkat', 'qty' => 1, 'rate' => $item->uang_transport_taxi_berangkat, 'total' => $item->uang_transport_taxi_berangkat];
                }
                if ($item->uang_transport_taxi_pulang > 0) {
                    $breakdown[] = ['label' => 'Kembali', 'qty' => 1, 'rate' => $item->uang_transport_taxi_pulang, 'total' => $item->uang_transport_taxi_pulang];
                }
                $rows[] = [
                    'no' => $no++,
                    'title' => 'Transport (Taksi)',
                    'breakdown' => $breakdown,
                    'total' => $item->uang_transport_taxi,
                    'keterangan' => ''
                ];
                $totalAmount += $item->uang_transport_taxi;
            }

            // Transport Pesawat
            if ($item->uang_transport_pesawat !== null && $item->uang_transport_pesawat > 0) {
                $breakdown = [];
                if ($item->uang_transport_pesawat_berangkat > 0) {
                    $breakdown[] = ['label' => 'Berangkat', 'qty' => 1, 'rate' => $item->uang_transport_pesawat_berangkat, 'total' => $item->uang_transport_pesawat_berangkat];
                }
                if ($item->uang_transport_pesawat_pulang > 0) {
                    $breakdown[] = ['label' => 'Kembali', 'qty' => 1, 'rate' => $item->uang_transport_pesawat_pulang, 'total' => $item->uang_transport_pesawat_pulang];
                }
                $rows[] = [
                    'no' => $no++,
                    'title' => 'Transport (Pesawat)',
                    'breakdown' => $breakdown,
                    'total' => $item->uang_transport_pesawat,
                    'keterangan' => ''
                ];
                $totalAmount += $item->uang_transport_pesawat;
            }

            // Transport BBM
            if ($item->uang_transport_bbm !== null && $item->uang_transport_bbm > 0) {
                $rows[] = [
                    'no' => $no++,
                    'title' => 'Transport (BBM)',
                    'breakdown' => [],
                    'total' => $item->uang_transport_bbm,
                    'keterangan' => ''
                ];
                $totalAmount += $item->uang_transport_bbm;
            }

            // Transport Sewa Mobil
            if ($item->uang_transport_sewa_mobil !== null && $item->uang_transport_sewa_mobil > 0) {
                $rows[] = [
                    'no' => $no++,
                    'title' => 'Transport Sewa Mobil',
                    'breakdown' => [
                        ['label' => '', 'qty' => $item->uang_transport_sewa_mobil_hari, 'rate' => $item->uang_transport_sewa_mobil_harian, 'total' => $item->uang_transport_sewa_mobil]
                    ],
                    'total' => $item->uang_transport_sewa_mobil,
                    'keterangan' => ''
                ];
                $totalAmount += $item->uang_transport_sewa_mobil;
            }

            // Uang Harian
            if ($item->uang_harian !== null && $item->uang_harian > 0) {
                $rows[] = [
                    'no' => $no++,
                    'title' => 'Uang Harian',
                    'breakdown' => [
                        ['label' => '', 'qty' => $item->uang_harian_hari, 'rate' => $item->uang_harian_per_hari, 'total' => $item->uang_harian]
                    ],
                    'total' => $item->uang_harian,
                    'keterangan' => ''
                ];
                $totalAmount += $item->uang_harian;
            }

            // Penginapan
            if ($item->uang_penginapan !== null && $item->uang_penginapan > 0) {
                $rows[] = [
                    'no' => $no++,
                    'title' => 'Penginapan',
                    'breakdown' => [
                        ['label' => '', 'qty' => $item->uang_penginapan_hari, 'rate' => $item->uang_penginapan_harian, 'total' => $item->uang_penginapan]
                    ],
                    'total' => $item->uang_penginapan,
                    'keterangan' => ''
                ];
                $totalAmount += $item->uang_penginapan;
            }

            // Fullboard
            if ($item->uang_fullboard !== null && $item->uang_fullboard > 0) {
                $rows[] = [
                    'no' => $no++,
                    'title' => 'Paket Fullboard',
                    'breakdown' => [],
                    'total' => $item->uang_fullboard,
                    'keterangan' => ''
                ];
                $totalAmount += $item->uang_fullboard;
            }

            // Uang Harian Fullboard
            if ($item->uang_harian_fullboard !== null && $item->uang_harian_fullboard > 0) {
                $rows[] = [
                    'no' => $no++,
                    'title' => 'Uang Harian Fullboard',
                    'breakdown' => [
                        ['label' => '', 'qty' => $item->uang_harian_fullboard_hari, 'rate' => $item->uang_harian_fullboard_per_hari, 'total' => $item->uang_harian_fullboard]
                    ],
                    'total' => $item->uang_harian_fullboard,
                    'keterangan' => ''
                ];
                $totalAmount += $item->uang_harian_fullboard;
            }

            $pangkat = '';
            if (!$item->is_external && $item->employee_id) {
                $emp = \App\Models\Employee::find($item->employee_id);
                $pangkat = $emp ? $emp->pangkat : '';
            }

            $processedItems[] = [
                'item' => $item,
                'rows' => $rows,
                'total' => $totalAmount,
                'terbilang' => $totalAmount > 0 ? (preg_replace('/\s+/', ' ', trim($this->terbilang($totalAmount))) . ' Rupiah') : 'Nol Rupiah',
                'pangkat' => $pangkat
            ];
        }

        $grandTransport = 0;
        $grandPenginapan = 0;
        $grandUangHarian = 0;
        $grandTotal = 0;

        foreach ($processedItems as $itemData) {
            $item = $itemData['item'];
            $transport = ($item->uang_transport_bus ?? 0)
                + ($item->uang_transport_taxi ?? 0)
                + ($item->uang_transport_pesawat ?? 0)
                + ($item->uang_transport_bbm ?? 0)
                + ($item->uang_transport_sewa_mobil ?? 0);
            $penginapan = $item->uang_penginapan ?? 0;
            $uangHarian = ($item->uang_harian ?? 0) + ($item->uang_harian_fullboard ?? 0);

            $grandTransport += $transport;
            $grandPenginapan += $penginapan;
            $grandUangHarian += $uangHarian;
            $grandTotal += $itemData['total'];
        }

        $grandTerbilang = $grandTotal > 0 ? (preg_replace('/\s+/', ' ', trim($this->terbilang($grandTotal))) . ' Rupiah') : 'Nol Rupiah';

        $spdDate = null;
        if ($st->tanggal_st) {
            $spdDate = \Carbon\Carbon::parse($st->tanggal_st)->timezone('Asia/Makassar')->translatedFormat('j F Y');
        } elseif ($st->tanggal_mulai) {
            $spdDate = \Carbon\Carbon::parse($st->tanggal_mulai)->timezone('Asia/Makassar')->translatedFormat('j F Y');
        } else {
            $spdDate = \Carbon\Carbon::now()->timezone('Asia/Makassar')->translatedFormat('j F Y');
        }

        $printDate = \Carbon\Carbon::now()->timezone('Asia/Makassar')->translatedFormat('j F Y');

        $pdf = Pdf::loadView('pdf.lpj_report', [
            'st' => $st,
            'lpj' => $lpj,
            'processedItems' => $processedItems,
            'spdDate' => $spdDate,
            'printDate' => $printDate,
            'bendaharaName' => $bendaharaName,
            'bendaharaNip' => $bendaharaNip,
            'ppkName' => $ppkName,
            'ppkNip' => $ppkNip,
            'grandTransport' => $grandTransport,
            'grandPenginapan' => $grandPenginapan,
            'grandUangHarian' => $grandUangHarian,
            'grandTotal' => $grandTotal,
            'grandTerbilang' => $grandTerbilang,
        ]);

        $pdf->setPaper([0, 0, 612, 936]); // F4 Portrait

        $safeNomorSt = str_replace(['/', '\\'], '_', $st->nomor_st);
        return $pdf->download('Rincian_Biaya_LPJ_' . ($safeNomorSt ?: $st->id) . '.pdf');
    }

    public function exportRekap(Request $request, $suratTugasId)
    {
        \Carbon\Carbon::setLocale('id');

        $st = SuratTugas::with(['employees', 'penandatangan', 'ketuaTim'])->findOrFail($suratTugasId);
        $lpj = LpjHeader::with('bendahara')->where('surat_tugas_id', $st->id)->firstOrFail();

        $pejabat = \App\Models\PejabatPerbendaharaan::with(['bendahara', 'ppk'])->first();
        
        $bendahara = null;
        if ($pejabat && $pejabat->bendahara) {
            $bendahara = $pejabat->bendahara;
        } else {
            $bendahara = $lpj->bendahara;
        }

        $bendaharaName = $bendahara ? $bendahara->name : '-';
        $bendaharaNip = $bendahara ? $bendahara->nip : '-';

        $ppkName = ($pejabat && $pejabat->ppk) ? $pejabat->ppk->name : '-';
        $ppkNip = ($pejabat && $pejabat->ppk) ? $pejabat->ppk->nip : '-';

        $items = LpjItem::where('lpj_header_id', $lpj->id)->get();

        if ($items->isEmpty()) {
            abort(404, 'Data rincian biaya tidak ditemukan.');
        }

        $processedItems = [];
        foreach ($items as $item) {
            $totalAmount = 0;

            // Transport Bus
            if ($item->uang_transport_bus !== null && $item->uang_transport_bus > 0) {
                $totalAmount += $item->uang_transport_bus;
            }
            // Transport Taxi
            if ($item->uang_transport_taxi !== null && $item->uang_transport_taxi > 0) {
                $totalAmount += $item->uang_transport_taxi;
            }
            // Transport Pesawat
            if ($item->uang_transport_pesawat !== null && $item->uang_transport_pesawat > 0) {
                $totalAmount += $item->uang_transport_pesawat;
            }
            // Transport BBM
            if ($item->uang_transport_bbm !== null && $item->uang_transport_bbm > 0) {
                $totalAmount += $item->uang_transport_bbm;
            }
            // Transport Sewa Mobil
            if ($item->uang_transport_sewa_mobil !== null && $item->uang_transport_sewa_mobil > 0) {
                $totalAmount += $item->uang_transport_sewa_mobil;
            }
            // Uang Harian
            if ($item->uang_harian !== null && $item->uang_harian > 0) {
                $totalAmount += $item->uang_harian;
            }
            // Penginapan
            if ($item->uang_penginapan !== null && $item->uang_penginapan > 0) {
                $totalAmount += $item->uang_penginapan;
            }
            // Fullboard
            if ($item->uang_fullboard !== null && $item->uang_fullboard > 0) {
                $totalAmount += $item->uang_fullboard;
            }
            // Uang Harian Fullboard
            if ($item->uang_harian_fullboard !== null && $item->uang_harian_fullboard > 0) {
                $totalAmount += $item->uang_harian_fullboard;
            }

            // Skip if the total LPJ amount is 0 (tidak usah tampilkan jika nilainya 0)
            if ($totalAmount <= 0) {
                continue;
            }

            $pangkat = '';
            if (!$item->is_external && $item->employee_id) {
                $emp = \App\Models\Employee::find($item->employee_id);
                $pangkat = $emp ? $emp->pangkat : '';
            }

            $processedItems[] = [
                'item' => $item,
                'total' => $totalAmount,
                'pangkat' => $pangkat
            ];
        }

        $grandTransport = 0;
        $grandFullboard = 0;
        $grandPenginapan = 0;
        $grandUangHarian = 0;
        $grandTotal = 0;

        foreach ($processedItems as $itemData) {
            $item = $itemData['item'];
            $transport = ($item->uang_transport_bus ?? 0)
                + ($item->uang_transport_taxi ?? 0)
                + ($item->uang_transport_pesawat ?? 0)
                + ($item->uang_transport_bbm ?? 0)
                + ($item->uang_transport_sewa_mobil ?? 0);
            $fullboard = $item->uang_fullboard ?? 0;
            $penginapan = $item->uang_penginapan ?? 0;
            $uangHarian = ($item->uang_harian ?? 0) + ($item->uang_harian_fullboard ?? 0);

            $grandTransport += $transport;
            $grandFullboard += $fullboard;
            $grandPenginapan += $penginapan;
            $grandUangHarian += $uangHarian;
            $grandTotal += $itemData['total'];
        }

        $grandTerbilang = $grandTotal > 0 ? (preg_replace('/\s+/', ' ', trim($this->terbilang($grandTotal))) . ' Rupiah') : 'Nol Rupiah';

        $printDate = \Carbon\Carbon::now()->timezone('Asia/Makassar')->translatedFormat('j F Y');

        $pdf = Pdf::loadView('pdf.lpj_rekap', [
            'st' => $st,
            'lpj' => $lpj,
            'processedItems' => $processedItems,
            'printDate' => $printDate,
            'bendaharaName' => $bendaharaName,
            'bendaharaNip' => $bendaharaNip,
            'ppkName' => $ppkName,
            'ppkNip' => $ppkNip,
            'grandTransport' => $grandTransport,
            'grandFullboard' => $grandFullboard,
            'grandPenginapan' => $grandPenginapan,
            'grandUangHarian' => $grandUangHarian,
            'grandTotal' => $grandTotal,
            'grandTerbilang' => $grandTerbilang,
        ]);

        $pdf->setPaper([0, 0, 936, 612]); // F4 Landscape

        $safeNomorSt = str_replace(['/', '\\'], '_', $st->nomor_st);
        return $pdf->download('Rekapitulasi_LPJ_' . ($safeNomorSt ?: $st->id) . '.pdf');
    }

    public function exportRill(Request $request, $suratTugasId)
    {
        \Carbon\Carbon::setLocale('id');

        $st = SuratTugas::with(['employees', 'penandatangan', 'ketuaTim'])->findOrFail($suratTugasId);
        $lpj = LpjHeader::with('bendahara')->where('surat_tugas_id', $st->id)->firstOrFail();

        $pejabat = \App\Models\PejabatPerbendaharaan::with(['bendahara', 'ppk'])->first();
        $ppkName = ($pejabat && $pejabat->ppk) ? $pejabat->ppk->name : '-';
        $ppkNip = ($pejabat && $pejabat->ppk) ? $pejabat->ppk->nip : '-';

        $itemsQuery = LpjItem::where('lpj_header_id', $lpj->id);

        if ($request->has('employee_id')) {
            $itemsQuery->where('employee_id', $request->employee_id);
        } elseif ($request->has('employee_name')) {
            $itemsQuery->where('employee_name', $request->employee_name);
        }

        $items = $itemsQuery->get();

        if ($items->isEmpty()) {
            abort(404, 'Data rincian biaya tidak ditemukan.');
        }

        $processedItems = [];
        foreach ($items as $item) {
            $rows = [];
            $no = 1;

            // 1. BBM
            $bbmVal = $item->uang_transport_bbm ?? 0;
            if ($bbmVal > 0 || (empty($item->uang_transport_taxi) && empty($item->uang_transport_bus) && empty($item->uang_transport_pesawat) && empty($item->uang_transport_sewa_mobil))) {
                $rows[] = [
                    'no' => $no++,
                    'title' => 'Transport (BBM)',
                    'desc' => 'Klaim BBM Kendaraan Dinas',
                    'value' => $bbmVal
                ];
            }

            // 2. Taksi
            if ($item->uang_transport_taxi !== null && $item->uang_transport_taxi > 0) {
                $rows[] = [
                    'no' => $no++,
                    'title' => 'Transport (Taksi)',
                    'desc' => 'Klaim Taksi Kendaraan Dinas / Umum',
                    'value' => $item->uang_transport_taxi
                ];
            }

            // 3. Bus
            if ($item->uang_transport_bus !== null && $item->uang_transport_bus > 0) {
                $rows[] = [
                    'no' => $no++,
                    'title' => 'Transport (Bus)',
                    'desc' => 'Klaim Bus Kendaraan Dinas / Umum',
                    'value' => $item->uang_transport_bus
                ];
            }

            // 4. Pesawat
            if ($item->uang_transport_pesawat !== null && $item->uang_transport_pesawat > 0) {
                $rows[] = [
                    'no' => $no++,
                    'title' => 'Transport (Pesawat)',
                    'desc' => 'Klaim Tiket Pesawat',
                    'value' => $item->uang_transport_pesawat
                ];
            }

            // 5. Sewa Mobil
            if ($item->uang_transport_sewa_mobil !== null && $item->uang_transport_sewa_mobil > 0) {
                $rows[] = [
                    'no' => $no++,
                    'title' => 'Transport Sewa Mobil',
                    'desc' => 'Klaim Rental / Sewa Mobil',
                    'value' => $item->uang_transport_sewa_mobil
                ];
            }

            $position = '-';
            if (!$item->is_external && $item->employee_id) {
                $emp = \App\Models\Employee::find($item->employee_id);
                $position = $emp ? ($emp->position ?: '-') : '-';
            }

            $totalAmount = array_sum(collect($rows)->pluck('value')->toArray());

            $processedItems[] = [
                'item' => $item,
                'rows' => $rows,
                'total' => $totalAmount,
                'position' => $position
            ];
        }

        $sppdDate = null;
        if ($st->tanggal_st) {
            $sppdDate = \Carbon\Carbon::parse($st->tanggal_st)->timezone('Asia/Makassar')->translatedFormat('j F Y');
        } elseif ($st->tanggal_mulai) {
            $sppdDate = \Carbon\Carbon::parse($st->tanggal_mulai)->timezone('Asia/Makassar')->translatedFormat('j F Y');
        } else {
            $sppdDate = \Carbon\Carbon::now()->timezone('Asia/Makassar')->translatedFormat('j F Y');
        }

        $printDate = \Carbon\Carbon::now()->timezone('Asia/Makassar')->translatedFormat('j F Y');

        $pdf = Pdf::loadView('pdf.lpj_rill', [
            'st' => $st,
            'lpj' => $lpj,
            'processedItems' => $processedItems,
            'sppdDate' => $sppdDate,
            'printDate' => $printDate,
            'ppkName' => $ppkName,
            'ppkNip' => $ppkNip,
        ]);

        $pdf->setPaper([0, 0, 612, 936]); // F4 Portrait

        $safeNomorSt = str_replace(['/', '\\'], '_', $st->nomor_st);
        if ($request->has('employee_id') || $request->has('employee_name')) {
            return $pdf->download('Daftar_Pengeluaran_Riil_' . str_replace(' ', '_', $items[0]->employee_name) . '.pdf');
        }
        return $pdf->download('Daftar_Pengeluaran_Riil_Semua_' . ($safeNomorSt ?: $st->id) . '.pdf');
    }

    /**
     * Spell out number in Indonesian words.
     */
    private function terbilang($angka)
    {
        $angka = (float)$angka;
        $bilangan = array(
            '',
            'Satu',
            'Dua',
            'Tiga',
            'Empat',
            'Lima',
            'Enam',
            'Tujuh',
            'Delapan',
            'Sembilan',
            'Sepuluh',
            'Sebelas'
        );

        if ($angka < 12) {
            return $bilangan[$angka];
        } else if ($angka < 20) {
            return $this->terbilang($angka - 10) . ' Belas';
        } else if ($angka < 100) {
            return $this->terbilang(floor($angka / 10)) . ' Puluh ' . $this->terbilang($angka % 10);
        } else if ($angka < 200) {
            return 'Seratus ' . $this->terbilang($angka - 100);
        } else if ($angka < 1000) {
            return $this->terbilang(floor($angka / 100)) . ' Ratus ' . $this->terbilang($angka % 100);
        } else if ($angka < 2000) {
            return 'Seribu ' . $this->terbilang($angka - 1000);
        } else if ($angka < 1000000) {
            return $this->terbilang(floor($angka / 1000)) . ' Ribu ' . $this->terbilang($angka % 1000);
        } else if ($angka < 1000000000) {
            return $this->terbilang(floor($angka / 1000000)) . ' Juta ' . $this->terbilang($angka % 1000000);
        } else if ($angka < 1000000000000) {
            return $this->terbilang(floor($angka / 1000000000)) . ' Miliar ' . $this->terbilang($angka % 1000000000);
        } else if ($angka < 1000000000000000) {
            return $this->terbilang(floor($angka / 1000000000000)) . ' Triliun ' . $this->terbilang($angka % 1000000000000);
        }
        return '';
    }
}

