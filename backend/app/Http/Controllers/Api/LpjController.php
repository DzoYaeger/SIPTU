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

        // Filter for non-admin/non-validator users (operators): only show Surat Tugas where user/employee is tagged
        $user = $request->user();
        if ($user) {
            $headerRole = strtolower($request->header('X-Current-Role') ?? '');
            $inputRole = strtolower($request->input('current_role') ?? '');
            $baseRole = strtolower($user->base_role ?? 'operator');
            $currentRole = strtolower($user->current_role ?? $baseRole);

            $isPowerUser = in_array($baseRole, ['admin', 'validator']) ||
                           in_array($currentRole, ['admin', 'validator']) ||
                           in_array($headerRole, ['admin', 'validator']) ||
                           in_array($inputRole, ['admin', 'validator']);

            if (!$isPowerUser) {
                $employeeId = $user->employee?->id ?? DB::table('employees')->where('nip', $user->nip)->value('id');
                $userNip = $user->nip;
                $userId = $user->id;

                $query->where(function ($q) use ($employeeId, $userNip, $userId) {
                    $q->where('created_by', $userId);
                    if ($employeeId) {
                        $q->orWhere('ketua_tim_id', $employeeId)
                          ->orWhere('penandatangan_id', $employeeId)
                          ->orWhereHas('employees', function ($eq) use ($employeeId, $userNip) {
                              $eq->where('employees.id', $employeeId);
                              if ($userNip) {
                                  $eq->orWhere('employees.nip', $userNip);
                              }
                          });
                    } elseif ($userNip) {
                        $q->orWhereHas('employees', function ($eq) use ($userNip) {
                            $eq->where('employees.nip', $userNip);
                        });
                    }
                });
            }
        }

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

        if ($request->filled('status') && $request->status !== 'ALL') {
            $status = strtolower($request->status);
            if ($status === 'sudan' || $status === 'sudah') {
                $query->whereHas('lpjHeader', fn($l) => $l->whereIn('status', ['draft', 'final', 'manual']));
            } elseif ($status === 'belum') {
                $query->whereDoesntHave('lpjHeader', fn($l) => $l->whereIn('status', ['draft', 'final', 'manual']));
            } elseif ($status === 'draft') {
                $query->whereHas('lpjHeader', fn($l) => $l->where('status', 'draft'));
            } elseif ($status === 'final') {
                $query->whereHas('lpjHeader', fn($l) => $l->where('status', 'final'));
            } elseif ($status === 'manual') {
                $query->whereHas('lpjHeader', fn($l) => $l->where('status', 'manual'));
            }
        }

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereDate('tanggal_mulai', '>=', $request->start_date)
                  ->whereDate('tanggal_mulai', '<=', $request->end_date);
        }

        $perPage = min((int)$request->input('per_page', 1000), 2000);
        $data = $query->orderBy('tanggal_mulai', 'desc')->paginate($perPage);

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
        $st = SuratTugas::findOrFail($suratTugasId);

        $validator = Validator::make($request->all(), [
            'status'                          => 'nullable|in:draft,final',
            'keterangan'                      => 'nullable|string|max:1000',
            'bendahara_id'                    => 'nullable|integer|exists:employees,id',
            'tanggal_mulai'                   => 'nullable|date',
            'tanggal_selesai'                 => 'nullable|date',
            'lokasi_tugas'                    => 'nullable|string|max:500',
            'mak'                             => 'nullable|string|max:255',
            'employee_ids'                    => 'nullable|array',
            'employee_ids.*'                  => 'integer|exists:employees,id',
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

            // Update Surat Tugas utama jika dikirimkan dari modul LPJ SIMKEU
            $stUpdates = [];
            if ($request->filled('tanggal_mulai')) {
                $stUpdates['tanggal_mulai'] = $request->tanggal_mulai;
            }
            if ($request->filled('tanggal_selesai')) {
                $stUpdates['tanggal_selesai'] = $request->tanggal_selesai;
            }
            if ($request->has('mak')) {
                $stUpdates['mak'] = $request->mak;
            }
            if ($request->has('lokasi_tugas')) {
                $stUpdates['lokasi_tugas'] = $request->lokasi_tugas;
            }
            if (!empty($stUpdates)) {
                $st->update($stUpdates);
            }

            // Sync data pegawai bertugas di Surat Tugas jika dikirimkan
            if ($request->has('employee_ids') && is_array($request->employee_ids)) {
                $st->employees()->sync($request->employee_ids);
            }

            // Update header jika sudah ada
            $lpj->update([
                'status'       => $request->status ?? $lpj->status,
                'keterangan'   => $request->keterangan ?? $lpj->keterangan,
                'bendahara_id' => $request->has('bendahara_id') ? $request->bendahara_id : $lpj->bendahara_id,
            ]);

            // Hapus items lama dan insert ulang
            $lpj->items()->delete();

            $now = now();
            $toInsert = collect($request->items)->map(function ($item) use ($lpj, $now) {
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
                    'lpj_header_id'       => $lpj->id,
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

                    // Transport BBM
                    'uang_transport_bbm'            => $bbmData['total'],
                    'uang_transport_bbm_keterangan' => $bbmData['keterangan'],

                    // Transport Sewa Mobil
                    'uang_transport_sewa_mobil'            => $sewaMobilTotal ?: $val('uang_transport_sewa_mobil'),
                    'uang_transport_sewa_mobil_harian'      => $val('uang_transport_sewa_mobil_harian'),
                    'uang_transport_sewa_mobil_hari'        => $val('uang_transport_sewa_mobil_hari'),
                    'uang_transport_sewa_mobil_keterangan'  => $val('uang_transport_sewa_mobil_keterangan'),

                    // Transport Lokal
                    'uang_transport_lokal'           => $lokalData['total'] ?: ($num('uang_transport_lokal_harian') * $int('uang_transport_lokal_hari')),
                    'uang_transport_lokal_harian'    => $val('uang_transport_lokal_harian'),
                    'uang_transport_lokal_hari'      => $val('uang_transport_lokal_hari'),
                    'uang_transport_lokal_keterangan' => $lokalData['keterangan'],

                    // Transport Umum
                    'uang_transport_umum'           => $umumData['total'],
                    'uang_transport_umum_berangkat'  => $umumData['berangkat'],
                    'uang_transport_umum_pulang'     => $umumData['pulang'],
                    'uang_transport_umum_keterangan' => $umumData['keterangan'],

                    // Uang Harian
                    'uang_harian'            => $harianTotal ?: $val('uang_harian'),
                    'uang_harian_per_hari'   => $val('uang_harian_per_hari'),
                    'uang_harian_hari'       => $val('uang_harian_hari'),
                    'uang_harian_keterangan' => $val('uang_harian_keterangan'),

                    // Penginapan
                    'uang_penginapan'            => $penginapanTotal ?: $val('uang_penginapan'),
                    'uang_penginapan_harian'     => $val('uang_penginapan_harian'),
                    'uang_penginapan_hari'       => $val('uang_penginapan_hari'),
                    'uang_penginapan_keterangan' => $val('uang_penginapan_keterangan'),

                    // Fullboard
                    'uang_fullboard'            => $fullboardTotal ?: $val('uang_fullboard'),
                    'uang_fullboard_harian'     => $val('uang_fullboard_harian'),
                    'uang_fullboard_hari'       => $val('uang_fullboard_hari'),
                    'uang_fullboard_keterangan' => $val('uang_fullboard_keterangan'),

                    // Uang Harian Fullboard
                    'uang_harian_fullboard'            => $harianFullboardTotal ?: $val('uang_harian_fullboard'),
                    'uang_harian_fullboard_per_hari'   => $val('uang_harian_fullboard_per_hari'),
                    'uang_harian_fullboard_hari'       => $val('uang_harian_fullboard_hari'),
                    'uang_harian_fullboard_keterangan' => $val('uang_harian_fullboard_keterangan'),

                    'created_at'          => $now,
                    'updated_at'          => $now,
                ];
            })->toArray();

            if (!empty($toInsert)) {
                LpjItem::insert($toInsert);
            }
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
                'status' => 'manual',
                'created_by' => $request->user()?->id,
            ]
        );

        return response()->json([
            'message' => 'LPJ berhasil ditandai sebagai manual.',
            'lpj'     => $lpj,
        ]);
    }

    /**
     * Sembunyikan ST dari daftar LPJ (status = 'excluded').
     */
    public function exclude(Request $request, $suratTugasId)
    {
        $st = SuratTugas::where('status', 'lengkap')->findOrFail($suratTugasId);

        $lpj = LpjHeader::updateOrCreate(
            ['surat_tugas_id' => $st->id],
            [
                'status' => 'excluded',
                'created_by' => $request->user()?->id,
            ]
        );

        return response()->json([
            'message' => 'Surat tugas berhasil disembunyikan dari daftar LPJ.',
            'lpj'     => $lpj,
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
     * Export Rincian Biaya LPJ ke PDF (menggunakan Dompdf).
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

            // Helper function to build transport rows supporting multi-item breakdowns
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
            // Transport Lokal
            if ($item->uang_transport_lokal !== null && $item->uang_transport_lokal > 0) {
                $totalAmount += $item->uang_transport_lokal;
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
                + ($item->uang_transport_sewa_mobil ?? 0)
                + ($item->uang_transport_lokal ?? 0);
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

