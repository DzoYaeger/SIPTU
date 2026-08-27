<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\KkpHeader;
use App\Models\KkpItem;
use App\Models\LpjHeader;
use App\Models\PejabatPerbendaharaan;
use App\Models\SuratTugas;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class KkpController extends Controller
{
    /**
     * Detail KKP untuk satu Surat Tugas.
     * Mengembalikan data KKP, data Surat Tugas, serta referensi LPJ (jika ada).
     */
    public function show($suratTugasId)
    {
        $st = SuratTugas::with(['employees', 'penandatangan', 'ketuaTim', 'creator'])
            ->where('status', 'lengkap')
            ->findOrFail($suratTugasId);

        $kkp = KkpHeader::with(['items', 'bendahara'])
            ->where('surat_tugas_id', $st->id)
            ->first();

        // Include LPJ data as reference only
        $lpj = LpjHeader::with(['items', 'bendahara'])
            ->where('surat_tugas_id', $st->id)
            ->first();

        return response()->json([
            'surat_tugas' => $st,
            'kkp'         => $kkp,
            'lpj'         => $lpj,
        ]);
    }

    /**
     * Buat header KKP untuk satu Surat Tugas (jika belum ada).
     */
    public function store(Request $request, $suratTugasId)
    {
        $st = SuratTugas::where('status', 'lengkap')->findOrFail($suratTugasId);

        $existing = KkpHeader::where('surat_tugas_id', $st->id)->first();
        if ($existing) {
            return response()->json([
                'message' => 'KKP untuk surat tugas ini sudah ada.',
                'kkp'     => $existing->load('items'),
            ], 200);
        }

        $kkp = KkpHeader::create([
            'surat_tugas_id' => $st->id,
            'status'         => 'draft',
            'keterangan'     => $request->keterangan,
            'created_by'     => $request->user()?->id,
        ]);

        return response()->json([
            'message' => 'KKP berhasil dibuat.',
            'kkp'     => $kkp->load('items'),
        ], 201);
    }

    /**
     * Simpan/update items KKP (biaya per pegawai) — bulk upsert.
     * Nilai KKP disimpan secara mandiri dan TIDAK berdampak pada data LPJ.
     */
    public function updateItems(Request $request, $suratTugasId)
    {
        $st = SuratTugas::findOrFail($suratTugasId);

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
            'items.*.uang_transport_lokal'    => 'nullable|numeric|min:0',
            'items.*.uang_transport_lokal_harian' => 'nullable|numeric|min:0',
            'items.*.uang_transport_lokal_hari'   => 'nullable|integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        DB::transaction(function () use ($request, $st) {
            // Pastikan KKP header ada
            $kkp = KkpHeader::firstOrCreate(
                ['surat_tugas_id' => $st->id],
                [
                    'status'       => $request->status ?? 'draft',
                    'keterangan'   => $request->keterangan,
                    'bendahara_id' => $request->bendahara_id,
                    'created_by'   => $request->user()?->id,
                ]
            );

            // Update KKP header
            $kkp->update([
                'status'       => $request->status ?? $kkp->status,
                'keterangan'   => $request->keterangan ?? $kkp->keterangan,
                'bendahara_id' => $request->has('bendahara_id') ? $request->bendahara_id : $kkp->bendahara_id,
            ]);

            // Hapus items lama KKP dan insert ulang
            $kkp->items()->delete();

            $now = now();
            $toInsert = collect($request->items)->map(function ($item) use ($kkp, $now) {
                $val = fn($k) => isset($item[$k]) && $item[$k] !== '' ? $item[$k] : null;
                $num = fn($k) => isset($item[$k]) && $item[$k] !== '' ? (float) $item[$k] : 0;
                $int = fn($k) => isset($item[$k]) && $item[$k] !== '' ? (int) $item[$k] : 0;

                // Helper for multi-item transport
                $resolveTransport = function ($key) use ($item, $val, $num) {
                    $itemsKey = $key . '_items';
                    $entries = $item[$itemsKey] ?? null;

                    if (is_array($entries) && !empty($entries)) {
                        $valid = array_values(array_filter($entries, fn($x) => (isset($x['nominal']) && (float)$x['nominal'] > 0) || !empty($x['keterangan']) || !empty($x['rincian'])));
                        if (!empty($valid)) {
                            $total = array_sum(array_map(fn($x) => (float)($x['nominal'] ?? 0), $valid));
                            return [
                                'total' => $total,
                                'berangkat' => (float)($valid[0]['nominal'] ?? 0),
                                'pulang' => (float)($valid[1]['nominal'] ?? 0),
                                'keterangan' => json_encode($valid),
                            ];
                        }
                    }

                    // Fallback to legacy single / departure-return fields
                    $berangkat = $num($key . '_berangkat');
                    $pulang = $num($key . '_pulang');
                    $direct = $num($key);
                    $total = $direct ?: ($berangkat + $pulang);

                    return [
                        'total' => $total ?: $val($key),
                        'berangkat' => $val($key . '_berangkat'),
                        'pulang' => $val($key . '_pulang'),
                        'keterangan' => $val($key . '_keterangan'),
                    ];
                };

                $busData = $resolveTransport('uang_transport_bus');
                $taxiData = $resolveTransport('uang_transport_taxi');
                $pesawatData = $resolveTransport('uang_transport_pesawat');
                $umumData = $resolveTransport('uang_transport_umum');
                $bbmData = $resolveTransport('uang_transport_bbm');
                $lokalData = $resolveTransport('uang_transport_lokal');

                // Sewa Mobil
                $sewaMobilTotal = $num('uang_transport_sewa_mobil_harian') * $int('uang_transport_sewa_mobil_hari');

                // Harian, Penginapan, Fullboard
                $harianTotal = $num('uang_harian_per_hari') * $int('uang_harian_hari');
                $penginapanTotal = $num('uang_penginapan_harian') * $int('uang_penginapan_hari');
                $fullboardTotal = $num('uang_fullboard_harian') * $int('uang_fullboard_hari');
                $harianFullboardTotal = $num('uang_harian_fullboard_per_hari') * $int('uang_harian_fullboard_hari');

                return [
                    'kkp_header_id'       => $kkp->id,
                    'employee_id'         => $item['employee_id'] ?? null,
                    'employee_name'       => $item['employee_name'],
                    'employee_nip'        => $item['employee_nip'] ?? null,
                    'is_external'         => (bool) ($item['is_external'] ?? false),
                    'nomor_spd'           => $val('nomor_spd'),
                    'nama_hotel'          => $val('nama_hotel'),
                    'nomor_kamar'         => $val('nomor_kamar'),

                    // Transport Bus
                    'uang_transport_bus'            => $busData['total'],
                    'uang_transport_bus_berangkat'  => $busData['berangkat'],
                    'uang_transport_bus_pulang'     => $busData['pulang'],
                    'uang_transport_bus_keterangan' => $busData['keterangan'],

                    // Transport Taxi
                    'uang_transport_taxi'           => $taxiData['total'],
                    'uang_transport_taxi_berangkat' => $taxiData['berangkat'],
                    'uang_transport_taxi_pulang'    => $taxiData['pulang'],
                    'uang_transport_taxi_keterangan' => $taxiData['keterangan'],

                    // Transport Pesawat
                    'uang_transport_pesawat'           => $pesawatData['total'],
                    'uang_transport_pesawat_berangkat' => $pesawatData['berangkat'],
                    'uang_transport_pesawat_pulang'    => $pesawatData['pulang'],
                    'uang_transport_pesawat_keterangan' => $pesawatData['keterangan'],

                    // Transport Umum
                    'uang_transport_umum'           => $umumData['total'],
                    'uang_transport_umum_berangkat' => $umumData['berangkat'],
                    'uang_transport_umum_pulang'    => $umumData['pulang'],
                    'uang_transport_umum_keterangan' => $umumData['keterangan'],

                    // Transport BBM & Lokal
                    'uang_transport_bbm'            => $bbmData['total'],
                    'uang_transport_bbm_keterangan' => $bbmData['keterangan'],
                    'uang_transport_lokal'          => $lokalData['total'],
                    'uang_transport_lokal_harian'   => $val('uang_transport_lokal_harian'),
                    'uang_transport_lokal_hari'     => $val('uang_transport_lokal_hari'),
                    'uang_transport_lokal_keterangan' => $lokalData['keterangan'],

                    // Transport Sewa Mobil
                    'uang_transport_sewa_mobil'        => $sewaMobilTotal ?: $val('uang_transport_sewa_mobil'),
                    'uang_transport_sewa_mobil_harian' => $val('uang_transport_sewa_mobil_harian'),
                    'uang_transport_sewa_mobil_hari'   => $val('uang_transport_sewa_mobil_hari'),
                    'uang_transport_sewa_mobil_keterangan' => $val('uang_transport_sewa_mobil_keterangan'),

                    // Uang Harian
                    'uang_harian'          => $harianTotal ?: $val('uang_harian'),
                    'uang_harian_hari'     => $val('uang_harian_hari'),
                    'uang_harian_per_hari' => $val('uang_harian_per_hari'),
                    'uang_harian_keterangan' => $val('uang_harian_keterangan'),

                    // Uang Penginapan
                    'uang_penginapan'        => $penginapanTotal ?: $val('uang_penginapan'),
                    'uang_penginapan_harian' => $val('uang_penginapan_harian'),
                    'uang_penginapan_hari'   => $val('uang_penginapan_hari'),
                    'uang_penginapan_keterangan' => $val('uang_penginapan_keterangan'),

                    // Fullboard
                    'uang_fullboard'        => $fullboardTotal ?: $val('uang_fullboard'),
                    'uang_fullboard_hari'   => $val('uang_fullboard_hari'),
                    'uang_fullboard_harian' => $val('uang_fullboard_harian'),
                    'uang_fullboard_keterangan' => $val('uang_fullboard_keterangan'),

                    // Uang Harian Fullboard
                    'uang_harian_fullboard'          => $harianFullboardTotal ?: $val('uang_harian_fullboard'),
                    'uang_harian_fullboard_hari'     => $val('uang_harian_fullboard_hari'),
                    'uang_harian_fullboard_per_hari' => $val('uang_harian_fullboard_per_hari'),
                    'uang_harian_fullboard_keterangan' => $val('uang_harian_fullboard_keterangan'),

                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            })->all();

            KkpItem::insert($toInsert);
        });

        $kkp = KkpHeader::with(['items', 'bendahara'])
            ->where('surat_tugas_id', $st->id)
            ->first();

        return response()->json([
            'message' => 'Data KKP berhasil disimpan.',
            'kkp'     => $kkp,
        ]);
    }

    /**
     * Tandai KKP sebagai manual (selesai dibuat di luar sistem).
     */
    public function markManual(Request $request, $suratTugasId)
    {
        $st = SuratTugas::findOrFail($suratTugasId);

        $kkp = KkpHeader::firstOrCreate(
            ['surat_tugas_id' => $st->id],
            [
                'status'     => 'manual',
                'keterangan' => 'Ditandai manual dari sistem',
                'created_by' => $request->user()?->id,
            ]
        );

        $kkp->update(['status' => 'manual']);

        return response()->json([
            'message' => 'KKP berhasil ditandai sebagai manual.',
            'kkp'     => $kkp,
        ]);
    }

    /**
     * Hapus KKP untuk satu Surat Tugas.
     */
    public function destroy($suratTugasId)
    {
        $kkp = KkpHeader::where('surat_tugas_id', $suratTugasId)->first();
        if ($kkp) {
            $kkp->delete();
        }

        return response()->json([
            'message' => 'KKP berhasil dihapus.',
        ]);
    }

    /**
     * Export Rincian Biaya KKP ke PDF.
     */
    public function exportPdf(Request $request, $suratTugasId)
    {
        Carbon::setLocale('id');

        $st = SuratTugas::with(['employees', 'penandatangan', 'ketuaTim'])->findOrFail($suratTugasId);
        $kkp = KkpHeader::with('bendahara')->where('surat_tugas_id', $st->id)->firstOrFail();

        $pejabat = PejabatPerbendaharaan::with(['bendahara', 'ppk'])->first();
        
        $bendahara = null;
        if ($pejabat && $pejabat->bendahara) {
            $bendahara = $pejabat->bendahara;
        } else {
            $bendahara = $kkp->bendahara;
        }

        $bendaharaName = $bendahara ? $bendahara->name : '-';
        $bendaharaNip = $bendahara ? $bendahara->nip : '-';

        $ppkName = ($pejabat && $pejabat->ppk) ? $pejabat->ppk->name : '-';
        $ppkNip = ($pejabat && $pejabat->ppk) ? $pejabat->ppk->nip : '-';

        $itemsQuery = KkpItem::where('kkp_header_id', $kkp->id);

        if ($request->filled('employee_id')) {
            $itemsQuery->where('employee_id', $request->employee_id);
        } elseif ($request->filled('employee_name')) {
            $itemsQuery->where('employee_name', $request->employee_name);
        }

        $items = $itemsQuery->get();

        if ($items->isEmpty()) {
            abort(404, 'Data rincian biaya KKP tidak ditemukan.');
        }

        $processedItems = [];
        foreach ($items as $item) {
            $rows = [];
            $no = 1;
            $totalAmount = 0;

            $formatTransportRow = function ($type, $title) use ($item, &$no, &$totalAmount) {
                $field = 'uang_transport_' . $type;
                $val = $item->$field;
                if ($val === null || (float)$val <= 0) {
                    return null;
                }

                $ketField = $field . '_keterangan';
                $rawKet = $item->$ketField;
                $breakdown = [];
                $rowKeterangan = '';

                if (!empty($rawKet) && str_starts_with(trim($rawKet), '[')) {
                    $parsed = json_decode($rawKet, true);
                    if (is_array($parsed) && !empty($parsed)) {
                        foreach ($parsed as $idx => $entry) {
                            $nom = (float)($entry['nominal'] ?? 0);
                            $rincian = !empty($entry['rincian']) ? trim($entry['rincian']) : (!empty($entry['label']) ? trim($entry['label']) : '');
                            $ket = !empty($entry['keterangan']) ? trim($entry['keterangan']) : '';
                            if (empty($rincian) && !empty($ket)) {
                                $rincian = $ket;
                                $ket = '';
                            }
                            if ($nom > 0 || !empty($rincian) || !empty($ket)) {
                                $breakdown[] = [
                                    'label' => !empty($rincian) ? $rincian : ($title . ' #' . ($idx + 1)),
                                    'qty' => 1,
                                    'rate' => $nom,
                                    'total' => $nom,
                                    'keterangan' => $ket,
                                ];
                            }
                        }
                    }
                }

                if (empty($breakdown)) {
                    $berangkatField = $field . '_berangkat';
                    $pulangField = $field . '_pulang';
                    $berangkat = (float)($item->$berangkatField ?? 0);
                    $pulang = (float)($item->$pulangField ?? 0);

                    if ($berangkat > 0) {
                        $breakdown[] = ['label' => 'Berangkat', 'qty' => 1, 'rate' => $berangkat, 'total' => $berangkat];
                    }
                    if ($pulang > 0) {
                        $breakdown[] = ['label' => 'Kembali', 'qty' => 1, 'rate' => $pulang, 'total' => $pulang];
                    }
                    $rowKeterangan = $rawKet ?? '';
                }

                $totalAmount += (float)$val;

                return [
                    'no' => $no++,
                    'title' => $title,
                    'breakdown' => $breakdown,
                    'total' => (float)$val,
                    'keterangan' => $rowKeterangan,
                ];
            };

            // Transport Bus
            if ($r = $formatTransportRow('bus', 'Transport (Bus)')) $rows[] = $r;

            // Transport Taxi
            if ($r = $formatTransportRow('taxi', 'Transport (Taksi)')) $rows[] = $r;

            // Transport Pesawat
            if ($r = $formatTransportRow('pesawat', 'Transport (Pesawat)')) $rows[] = $r;

            // Transport BBM
            if ($r = $formatTransportRow('bbm', 'Transport (BBM)')) $rows[] = $r;

            // Transport Sewa Mobil
            if ($item->uang_transport_sewa_mobil !== null && $item->uang_transport_sewa_mobil > 0) {
                $rows[] = [
                    'no' => $no++,
                    'title' => 'Transport Sewa Mobil',
                    'breakdown' => [
                        ['label' => '', 'qty' => $item->uang_transport_sewa_mobil_hari, 'rate' => $item->uang_transport_sewa_mobil_harian, 'total' => $item->uang_transport_sewa_mobil, 'keterangan' => $item->uang_transport_sewa_mobil_keterangan ?? '']
                    ],
                    'total' => $item->uang_transport_sewa_mobil,
                    'keterangan' => $item->uang_transport_sewa_mobil_keterangan ?? ''
                ];
                $totalAmount += $item->uang_transport_sewa_mobil;
            }

            // Transport Lokal
            if ($r = $formatTransportRow('lokal', 'Transport Lokal')) $rows[] = $r;

            // Transport Umum
            if ($r = $formatTransportRow('umum', 'Transport (Umum)')) $rows[] = $r;

            // Uang Harian
            if ($item->uang_harian !== null && $item->uang_harian > 0) {
                $rows[] = [
                    'no' => $no++,
                    'title' => 'Uang Harian',
                    'breakdown' => [
                        ['label' => '', 'qty' => $item->uang_harian_hari, 'rate' => $item->uang_harian_per_hari, 'total' => $item->uang_harian, 'keterangan' => $item->uang_harian_keterangan ?? '']
                    ],
                    'total' => $item->uang_harian,
                    'keterangan' => $item->uang_harian_keterangan ?? ''
                ];
                $totalAmount += $item->uang_harian;
            }

            // Penginapan
            if ($item->uang_penginapan !== null && $item->uang_penginapan > 0) {
                $hotelParts = [];
                if (!empty($item->nama_hotel)) $hotelParts[] = 'Hotel: ' . $item->nama_hotel;
                if (!empty($item->nomor_kamar)) $hotelParts[] = 'Kmr: ' . $item->nomor_kamar;
                if (!empty($item->uang_penginapan_keterangan)) $hotelParts[] = $item->uang_penginapan_keterangan;
                $penginapanKet = implode(', ', $hotelParts);

                $rows[] = [
                    'no' => $no++,
                    'title' => 'Penginapan',
                    'breakdown' => [
                        ['label' => '', 'qty' => $item->uang_penginapan_hari, 'rate' => $item->uang_penginapan_harian, 'total' => $item->uang_penginapan, 'keterangan' => $penginapanKet]
                    ],
                    'total' => $item->uang_penginapan,
                    'keterangan' => $penginapanKet
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
                    'keterangan' => $item->uang_fullboard_keterangan ?? ''
                ];
                $totalAmount += $item->uang_fullboard;
            }

            // Uang Harian Fullboard
            if ($item->uang_harian_fullboard !== null && $item->uang_harian_fullboard > 0) {
                $rows[] = [
                    'no' => $no++,
                    'title' => 'Uang Harian Fullboard',
                    'breakdown' => [
                        ['label' => '', 'qty' => $item->uang_harian_fullboard_hari, 'rate' => $item->uang_harian_fullboard_per_hari, 'total' => $item->uang_harian_fullboard, 'keterangan' => $item->uang_harian_fullboard_keterangan ?? '']
                    ],
                    'total' => $item->uang_harian_fullboard,
                    'keterangan' => $item->uang_harian_fullboard_keterangan ?? ''
                ];
                $totalAmount += $item->uang_harian_fullboard;
            }

            $pangkat = '';
            if (!$item->is_external && $item->employee_id) {
                $emp = Employee::find($item->employee_id);
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
                + ($item->uang_transport_sewa_mobil ?? 0)
                + ($item->uang_transport_lokal ?? 0)
                + ($item->uang_transport_umum ?? 0);
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
            $spdDate = Carbon::parse($st->tanggal_st)->timezone('Asia/Makassar')->translatedFormat('j F Y');
        } elseif ($st->tanggal_mulai) {
            $spdDate = Carbon::parse($st->tanggal_mulai)->timezone('Asia/Makassar')->translatedFormat('j F Y');
        } else {
            $spdDate = Carbon::now()->timezone('Asia/Makassar')->translatedFormat('j F Y');
        }

        $printDate = Carbon::now()->timezone('Asia/Makassar')->translatedFormat('j F Y');

        $pdf = Pdf::loadView('pdf.lpj_report', [
            'st' => $st,
            'lpj' => $kkp,
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
        if ($request->filled('employee_id') || $request->filled('employee_name')) {
            return $pdf->download('Rincian_Biaya_KKP_' . str_replace(' ', '_', $items[0]->employee_name) . '.pdf');
        }
        return $pdf->download('Rincian_Biaya_KKP_Semua_' . ($safeNomorSt ?: $st->id) . '.pdf');
    }

    /**
     * Export Rekapitulasi KKP ke PDF.
     */
    public function exportRekap(Request $request, $suratTugasId)
    {
        Carbon::setLocale('id');

        $st = SuratTugas::with(['employees', 'penandatangan', 'ketuaTim'])->findOrFail($suratTugasId);
        $kkp = KkpHeader::with('bendahara')->where('surat_tugas_id', $st->id)->firstOrFail();

        $pejabat = PejabatPerbendaharaan::with(['bendahara', 'ppk'])->first();
        
        $bendahara = null;
        if ($pejabat && $pejabat->bendahara) {
            $bendahara = $pejabat->bendahara;
        } else {
            $bendahara = $kkp->bendahara;
        }

        $bendaharaName = $bendahara ? $bendahara->name : '-';
        $bendaharaNip = $bendahara ? $bendahara->nip : '-';

        $ppkName = ($pejabat && $pejabat->ppk) ? $pejabat->ppk->name : '-';
        $ppkNip = ($pejabat && $pejabat->ppk) ? $pejabat->ppk->nip : '-';

        $items = KkpItem::where('kkp_header_id', $kkp->id)->get();

        if ($items->isEmpty()) {
            abort(404, 'Data rincian biaya KKP tidak ditemukan.');
        }

        $processedItems = [];
        $grandTransport = 0;
        $grandFullboard = 0;
        $grandPenginapan = 0;
        $grandUangHarian = 0;
        $grandTotal = 0;

        foreach ($items as $item) {
            $transport = (float)($item->uang_transport_bus ?? 0)
                + (float)($item->uang_transport_taxi ?? 0)
                + (float)($item->uang_transport_pesawat ?? 0)
                + (float)($item->uang_transport_bbm ?? 0)
                + (float)($item->uang_transport_sewa_mobil ?? 0)
                + (float)($item->uang_transport_lokal ?? 0)
                + (float)($item->uang_transport_umum ?? 0);

            $fullboard = (float)($item->uang_fullboard ?? 0);
            $penginapan = (float)($item->uang_penginapan ?? 0);
            $uangHarian = (float)($item->uang_harian ?? 0) + (float)($item->uang_harian_fullboard ?? 0);

            $totalAmount = $transport + $fullboard + $penginapan + $uangHarian;

            if ($totalAmount <= 0) {
                continue;
            }

            $pangkat = '';
            if (!$item->is_external && $item->employee_id) {
                $emp = Employee::find($item->employee_id);
                $pangkat = $emp ? $emp->pangkat : '';
            }

            $processedItems[] = [
                'item' => $item,
                'transport' => $transport,
                'fullboard' => $fullboard,
                'penginapan' => $penginapan,
                'uang_harian' => $uangHarian,
                'total' => $totalAmount,
                'pangkat' => $pangkat
            ];

            $grandTransport += $transport;
            $grandFullboard += $fullboard;
            $grandPenginapan += $penginapan;
            $grandUangHarian += $uangHarian;
            $grandTotal += $totalAmount;
        }

        $grandTerbilang = $grandTotal > 0 ? (preg_replace('/\s+/', ' ', trim($this->terbilang($grandTotal))) . ' Rupiah') : 'Nol Rupiah';
        $printDate = Carbon::now()->timezone('Asia/Makassar')->translatedFormat('j F Y');

        $pdf = Pdf::loadView('pdf.lpj_rekap', [
            'st' => $st,
            'lpj' => $kkp,
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
        return $pdf->download('Rekapitulasi_KKP_' . ($safeNomorSt ?: $st->id) . '.pdf');
    }

    /**
     * Export Pengeluaran Riil KKP ke PDF.
     */
    public function exportRill(Request $request, $suratTugasId)
    {
        Carbon::setLocale('id');

        $st = SuratTugas::with(['employees', 'penandatangan', 'ketuaTim'])->findOrFail($suratTugasId);
        $kkp = KkpHeader::with('bendahara')->where('surat_tugas_id', $st->id)->firstOrFail();

        $pejabat = PejabatPerbendaharaan::with(['bendahara', 'ppk'])->first();
        $ppkName = ($pejabat && $pejabat->ppk) ? $pejabat->ppk->name : '-';
        $ppkNip = ($pejabat && $pejabat->ppk) ? $pejabat->ppk->nip : '-';

        $itemsQuery = KkpItem::where('kkp_header_id', $kkp->id);

        if ($request->has('employee_id')) {
            $itemsQuery->where('employee_id', $request->employee_id);
        } elseif ($request->has('employee_name')) {
            $itemsQuery->where('employee_name', $request->employee_name);
        }

        $items = $itemsQuery->get();

        if ($items->isEmpty()) {
            abort(404, 'Data rincian biaya KKP tidak ditemukan.');
        }

        $processedItems = [];
        foreach ($items as $item) {
            $rows = [];
            $no = 1;

            // 1. BBM
            $bbmVal = $item->uang_transport_bbm ?? 0;
            if ($bbmVal > 0 || (empty($item->uang_transport_taxi) && empty($item->uang_transport_bus) && empty($item->uang_transport_pesawat) && empty($item->uang_transport_sewa_mobil) && empty($item->uang_transport_lokal))) {
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

            // 6. Transport Lokal
            if ($item->uang_transport_lokal !== null && $item->uang_transport_lokal > 0) {
                $rows[] = [
                    'no' => $no++,
                    'title' => 'Transport Lokal',
                    'desc' => 'Klaim Transport Lokal',
                    'value' => $item->uang_transport_lokal
                ];
            }

            // 7. Transport (Umum)
            if ($item->uang_transport_umum !== null && $item->uang_transport_umum > 0) {
                $rows[] = [
                    'no' => $no++,
                    'title' => 'Transport (Umum)',
                    'desc' => 'Klaim Transport Umum',
                    'value' => $item->uang_transport_umum
                ];
            }

            $position = '-';
            if (!$item->is_external && $item->employee_id) {
                $emp = Employee::find($item->employee_id);
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
            $sppdDate = Carbon::parse($st->tanggal_st)->timezone('Asia/Makassar')->translatedFormat('j F Y');
        } elseif ($st->tanggal_mulai) {
            $sppdDate = Carbon::parse($st->tanggal_mulai)->timezone('Asia/Makassar')->translatedFormat('j F Y');
        } else {
            $sppdDate = Carbon::now()->timezone('Asia/Makassar')->translatedFormat('j F Y');
        }

        $printDate = Carbon::now()->timezone('Asia/Makassar')->translatedFormat('j F Y');

        $pdf = Pdf::loadView('pdf.lpj_rill', [
            'st' => $st,
            'lpj' => $kkp,
            'processedItems' => $processedItems,
            'sppdDate' => $sppdDate,
            'printDate' => $printDate,
            'ppkName' => $ppkName,
            'ppkNip' => $ppkNip,
        ]);

        $pdf->setPaper([0, 0, 612, 936]); // F4 Portrait

        $safeNomorSt = str_replace(['/', '\\'], '_', $st->nomor_st);
        if ($request->has('employee_id') || $request->has('employee_name')) {
            return $pdf->download('Daftar_Pengeluaran_Riil_KKP_' . str_replace(' ', '_', $items[0]->employee_name) . '.pdf');
        }
        return $pdf->download('Daftar_Pengeluaran_Riil_KKP_Semua_' . ($safeNomorSt ?: $st->id) . '.pdf');
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
